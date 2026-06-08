'use client';

import {
	FC,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type CSSProperties,
	type MouseEvent as ReactMouseEvent,
} from 'react';
import mapboxgl from 'mapbox-gl';

export type CalendarPopupLocationFields = {
	address: string;
	// Stores Mapbox's `mapbox_id` for the saved feature (Google "place id" name preserved for
	// backwards compatibility with the parent's persisted draft shape).
	placeId: string | null;
	lat: number | null;
	lng: number | null;
	drivingDuration: string | null;
};

type Props = CalendarPopupLocationFields & {
	onUpdate: (partial: Partial<CalendarPopupLocationFields>) => void;
	// 'popup' (default) pins the card at the calendar-popup coordinates; 'inline' lets the
	// card fill a sized parent so the same control can be embedded in other forms.
	layout?: 'popup' | 'inline';
};

// Empty-state default. The map drifts to the user's location once geolocation resolves,
// and zooms in once a place is picked.
const DEFAULT_EMPTY_CENTER: [number, number] = [-98.5795, 39.8283]; // US center, [lng, lat]
const DEFAULT_EMPTY_ZOOM = 3;
const USER_LOCATION_ZOOM = 10;
const PLACE_DETAIL_ZOOM = 14;

const popupTextStyle: CSSProperties = {
	fontFamily:
		'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
	fontStyle: 'normal',
};

// Compact "3 hr" / "45 min" form for a Directions API duration in seconds.
const formatDrivingDuration = (seconds: number): string | null => {
	if (!Number.isFinite(seconds) || seconds <= 0) return null;
	const totalMinutes = Math.max(1, Math.round(seconds / 60));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours > 0 && minutes > 0) return `${hours} hr ${minutes} min`;
	if (hours > 0) return `${hours} hr${hours === 1 ? '' : 's'}`;
	return `${minutes} min`;
};

const decorativeMapBackground =
	'linear-gradient(135deg, rgba(63, 191, 214, 0.9) 0%, rgba(63, 191, 214, 0.9) 28%, transparent 28%), linear-gradient(35deg, rgba(178, 233, 207, 0.95) 0%, rgba(178, 233, 207, 0.95) 68%, rgba(134, 219, 185, 0.95) 68%), linear-gradient(110deg, transparent 0 47%, rgba(255, 255, 255, 0.55) 47% 50%, transparent 50%), #B1E6CE';

export const DashboardCalendarPopupLocation: FC<Props> = ({
	address,
	lat,
	lng,
	drivingDuration,
	onUpdate,
	layout = 'popup',
}) => {
	const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const markerRef = useRef<mapboxgl.Marker | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	// Monotonic counter so a slow geocode response doesn't overwrite a newer search.
	const geocodeGenRef = useRef(0);
	// Set true when the user activates the pill so the next paint focuses the input.
	// A ref (not state) so toggling it doesn't itself cause a re-render.
	const focusInputOnNextRenderRef = useRef(false);
	// Holds the latest reverse-geocode closure so the once-per-mount map-click handler and the
	// marker's dragend handler always call the current version (instead of a stale closure).
	const runReverseGeocodeRef = useRef<((lat: number, lng: number) => void) | null>(null);

	const [query, setQuery] = useState(address);
	// True while the input is rendered (editing mode); false while the pill is rendered.
	// We render one OR the other — never both stacked — so the click target is unambiguous
	// and we don't depend on focus-event timing to swap which control receives input.
	const [isEditing, setIsEditing] = useState(false);
	const [isMapReady, setIsMapReady] = useState(false);
	const [isGeocoding, setIsGeocoding] = useState(false);
	const [geocodeError, setGeocodeError] = useState<string | null>(null);
	const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
	const [isPillHovered, setIsPillHovered] = useState(false);

	// Keep the input value synced if the parent overwrites the saved address (e.g. when
	// switching between two days that both have drafts — the popup is keyed by day, but
	// being defensive here keeps the input from going stale).
	useEffect(() => {
		setQuery(address);
	}, [address]);

	// Request user's location once (best-effort; quietly skipped if permission denied).
	useEffect(() => {
		if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
		let cancelled = false;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				if (cancelled) return;
				setUserLocation({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				});
			},
			() => {
				/* permission denied or unavailable — silently degrade */
			},
			{ enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 8000 }
		);
		return () => {
			cancelled = true;
		};
	}, []);

	// Initialize the Mapbox map exactly once per mount.
	useEffect(() => {
		if (!mapContainerRef.current || mapRef.current) return;
		if (!mapboxToken) {
			console.warn(
				'[DashboardCalendarPopupLocation] Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN — map will not render.'
			);
			return;
		}
		mapboxgl.accessToken = mapboxToken;

		const hasSaved = lat != null && lng != null;
		const initialCenter: [number, number] = hasSaved
			? [lng as number, lat as number]
			: DEFAULT_EMPTY_CENTER;
		const initialZoom = hasSaved ? PLACE_DETAIL_ZOOM : DEFAULT_EMPTY_ZOOM;

		const map = new mapboxgl.Map({
			container: mapContainerRef.current,
			style: 'mapbox://styles/mapbox/streets-v12',
			center: initialCenter,
			zoom: initialZoom,
			attributionControl: false,
		});
		// Disable map rotation — for a tiny embedded preview, a tilted/rotated map looks broken
		// rather than helpful. Pan + zoom is what people actually want.
		map.dragRotate.disable();
		map.touchZoomRotate.disableRotation();
		map.keyboard.disable();
		mapRef.current = map;

		// Click anywhere on the map to drop a pin there; the click point is reverse-geocoded
		// into an address. (A pan is a drag, not a click, so this doesn't fire on pan.)
		map.on('click', (event) => {
			runReverseGeocodeRef.current?.(event.lngLat.lat, event.lngLat.lng);
		});

		map.once('load', () => {
			setIsMapReady(true);
			map.resize();
		});

		// The popup animates in with a scale transform, so mapbox-gl can latch onto an
		// intermediate canvas size at construction. Resize on rAF and once more after the
		// 160ms enter animation settles; the ResizeObserver handles any later changes.
		const rafId = window.requestAnimationFrame(() => {
			map.resize();
		});
		const settleTimer = window.setTimeout(() => mapRef.current?.resize(), 220);
		const resizeObserver =
			typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(() => map.resize())
				: null;
		if (resizeObserver && mapContainerRef.current) {
			resizeObserver.observe(mapContainerRef.current);
		}

		return () => {
			window.cancelAnimationFrame(rafId);
			window.clearTimeout(settleTimer);
			resizeObserver?.disconnect();
			markerRef.current?.remove();
			markerRef.current = null;
			map.remove();
			mapRef.current = null;
			setIsMapReady(false);
		};
		// Intentionally run only on mount — the initial lat/lng is a one-shot seed.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mapboxToken]);

	// Keep the marker + camera in sync with the saved location.
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !isMapReady) return;

		if (lat != null && lng != null) {
			if (!markerRef.current) {
				const el = document.createElement('div');
				Object.assign(el.style, {
					width: '14px',
					height: '14px',
					borderRadius: '999px',
					background: '#F56E75',
					border: '2px solid #000000',
					boxSizing: 'border-box',
					cursor: 'grab',
				} satisfies Partial<CSSStyleDeclaration>);
				markerRef.current = new mapboxgl.Marker({
					element: el,
					anchor: 'center',
					draggable: true,
				})
					.setLngLat([lng, lat])
					.addTo(map);
				// Drag the pin to fine-tune the location; the dropped point is reverse-geocoded.
				markerRef.current.on('dragend', () => {
					const pos = markerRef.current?.getLngLat();
					if (pos) runReverseGeocodeRef.current?.(pos.lat, pos.lng);
				});
			} else {
				markerRef.current.setLngLat([lng, lat]);
			}
			map.easeTo({ center: [lng, lat], zoom: PLACE_DETAIL_ZOOM, duration: 350 });
		} else {
			markerRef.current?.remove();
			markerRef.current = null;
			if (userLocation) {
				map.easeTo({
					center: [userLocation.lng, userLocation.lat],
					zoom: USER_LOCATION_ZOOM,
					duration: 350,
				});
			} else {
				map.easeTo({
					center: DEFAULT_EMPTY_CENTER,
					zoom: DEFAULT_EMPTY_ZOOM,
					duration: 0,
				});
			}
		}
	}, [lat, lng, userLocation, isMapReady]);

	// Mapbox Directions API: compute driving time from the user's location to the saved place.
	const computeDrivingTime = useCallback(
		async (destLat: number, destLng: number) => {
			if (!userLocation || !mapboxToken) return;
			const path = `${userLocation.lng},${userLocation.lat};${destLng},${destLat}`;
			const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${path}?access_token=${encodeURIComponent(
				mapboxToken
			)}&overview=false`;
			try {
				const res = await fetch(url);
				if (!res.ok) return;
				const data = (await res.json()) as { routes?: Array<{ duration?: number }> };
				const seconds = data.routes?.[0]?.duration;
				if (typeof seconds !== 'number') return;
				const formatted = formatDrivingDuration(seconds);
				if (formatted) onUpdate({ drivingDuration: formatted });
			} catch {
				/* network hiccup — leave driving duration empty */
			}
		},
		[userLocation, mapboxToken, onUpdate]
	);

	// If we have a saved place but no driving time yet (user location arrived later, or the
	// geocode result reset it), compute it once both halves are available.
	useEffect(() => {
		if (lat == null || lng == null) return;
		if (drivingDuration) return;
		if (!userLocation) return;
		void computeDrivingTime(lat, lng);
	}, [lat, lng, drivingDuration, userLocation, computeDrivingTime]);

	// Forward geocode the current input via Mapbox and commit the top result.
	const runGeocode = useCallback(async () => {
		const trimmed = query.trim();
		if (!trimmed || !mapboxToken) return;

		const myGen = ++geocodeGenRef.current;
		setIsGeocoding(true);
		setGeocodeError(null);
		try {
			const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
			url.searchParams.set('q', trimmed);
			url.searchParams.set('limit', '1');
			url.searchParams.set('country', 'us');
			url.searchParams.set('access_token', mapboxToken);
			if (userLocation) {
				url.searchParams.set('proximity', `${userLocation.lng},${userLocation.lat}`);
			}
			const res = await fetch(url.toString());
			if (myGen !== geocodeGenRef.current) return;
			if (!res.ok) {
				setGeocodeError('Lookup failed');
				return;
			}
			const data = (await res.json()) as {
				features?: Array<{
					id?: string;
					geometry?: { coordinates?: [number, number] };
					properties?: {
						mapbox_id?: string;
						full_address?: string;
						place_formatted?: string;
						name?: string;
					};
				}>;
			};
			if (myGen !== geocodeGenRef.current) return;

			const feature = data.features?.[0];
			const coords = feature?.geometry?.coordinates;
			if (!feature || !coords || coords.length < 2) {
				setGeocodeError('No match');
				return;
			}
			const [nextLng, nextLat] = coords;
			const formatted =
				feature.properties?.full_address ||
				feature.properties?.place_formatted ||
				feature.properties?.name ||
				trimmed;
			const nextPlaceId = feature.properties?.mapbox_id ?? feature.id ?? null;

			onUpdate({
				address: formatted,
				placeId: nextPlaceId,
				lat: nextLat,
				lng: nextLng,
				drivingDuration: null,
			});
			setQuery(formatted);
			// Hand off to the pill view; computeDrivingTime will then fill in the duration.
			// (Once we have a saved location, the input is unmounted in favor of the pill.)
			setIsEditing(false);
		} catch {
			if (myGen === geocodeGenRef.current) setGeocodeError('Lookup failed');
		} finally {
			if (myGen === geocodeGenRef.current) setIsGeocoding(false);
		}
	}, [query, mapboxToken, userLocation, onUpdate]);

	// Reverse geocode a point dropped/dragged on the map and commit it as the saved location.
	const runReverseGeocode = useCallback(
		async (nextLat: number, nextLng: number) => {
			if (!mapboxToken) return;

			const myGen = ++geocodeGenRef.current;
			setIsGeocoding(true);
			setGeocodeError(null);
			// Drop the pin immediately at the clicked point; the address fills in once the
			// reverse lookup returns.
			onUpdate({ lat: nextLat, lng: nextLng, drivingDuration: null });
			try {
				const url = new URL('https://api.mapbox.com/search/geocode/v6/reverse');
				url.searchParams.set('longitude', String(nextLng));
				url.searchParams.set('latitude', String(nextLat));
				url.searchParams.set('limit', '1');
				url.searchParams.set('access_token', mapboxToken);
				const res = await fetch(url.toString());
				if (myGen !== geocodeGenRef.current) return;
				if (!res.ok) {
					setGeocodeError('Lookup failed');
					return;
				}
				const data = (await res.json()) as {
					features?: Array<{
						id?: string;
						properties?: {
							mapbox_id?: string;
							full_address?: string;
							place_formatted?: string;
							name?: string;
						};
					}>;
				};
				if (myGen !== geocodeGenRef.current) return;

				const feature = data.features?.[0];
				const formatted =
					feature?.properties?.full_address ||
					feature?.properties?.place_formatted ||
					feature?.properties?.name ||
					`${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`;
				const nextPlaceId = feature?.properties?.mapbox_id ?? feature?.id ?? null;

				onUpdate({
					address: formatted,
					placeId: nextPlaceId,
					lat: nextLat,
					lng: nextLng,
					drivingDuration: null,
				});
				setQuery(formatted);
				setIsEditing(false);
			} catch {
				if (myGen === geocodeGenRef.current) setGeocodeError('Lookup failed');
			} finally {
				if (myGen === geocodeGenRef.current) setIsGeocoding(false);
			}
		},
		[mapboxToken, onUpdate]
	);

	// Keep the ref pointed at the latest closure for the map-click / marker-drag handlers.
	useEffect(() => {
		runReverseGeocodeRef.current = runReverseGeocode;
	}, [runReverseGeocode]);

	const hasSavedLocation = lat != null && lng != null;
	const showDrivingPill = !isEditing && hasSavedLocation && Boolean(drivingDuration);

	const startEditingLocation = () => {
		focusInputOnNextRenderRef.current = true;
		setIsPillHovered(false);
		setIsEditing(true);
	};

	const handleEditLocationMouseDown = (event: ReactMouseEvent<HTMLElement>) => {
		event.preventDefault();
		event.stopPropagation();
		event.nativeEvent.stopImmediatePropagation();
		startEditingLocation();
	};

	const handleEditLocationClick = (event: ReactMouseEvent<HTMLElement>) => {
		event.stopPropagation();
		startEditingLocation();
	};

	// When the user activates the pill, isEditing flips to true and the input mounts.
	// useLayoutEffect runs after the DOM update but before paint, so we can focus the
	// input before the user ever sees it un-focused. The ref-driven trigger keeps this
	// from firing on unrelated re-renders (e.g., when the parent re-renders the popup).
	useLayoutEffect(() => {
		if (!focusInputOnNextRenderRef.current) return;
		if (!isEditing) return;
		focusInputOnNextRenderRef.current = false;
		const input = inputRef.current;
		if (!input) return;
		input.focus({ preventScroll: true });
		input.select();
	}, [isEditing]);

	return (
		<div
			style={
				layout === 'inline'
					? {
							position: 'relative',
							width: '100%',
							height: '100%',
							borderRadius: '9.687px',
							border: '1.643px solid #000000',
							boxSizing: 'border-box',
							overflow: 'hidden',
							background: '#FFFFFF',
						}
					: {
							position: 'absolute',
							left: '5.5px',
							top: '164px',
							width: '284.144px',
							height: '149.606px',
							borderRadius: '9.687px',
							border: '1.643px solid #000000',
							boxSizing: 'border-box',
							overflow: 'hidden',
							background: '#FFFFFF',
						}
			}
		>
			<style jsx global>{`
				/* Mapbox's .mapboxgl-map gets no width/height from its default stylesheet, so we
				   must size it explicitly. Without this, the canvas chain inside cascades off a
				   collapsed parent and the rendered map only fills the upper-left of this box. */
				.dashboard-calendar-popup-location-map-root .mapboxgl-map,
				.dashboard-calendar-popup-location-map-root .mapboxgl-canvas-container,
				.dashboard-calendar-popup-location-map-root .mapboxgl-canvas {
					width: 100% !important;
					height: 100% !important;
				}
			`}</style>

			{/* Top bar: either the driving-time pill (saved + idle) or the editable input.
			    These render as siblings, not overlapping — clicking the pill is unambiguously
			    a click on the pill, with no input behind it racing focus events. */}
			<div
				style={{
					position: 'relative',
					height: '27px',
					background: '#FFFFFF',
					borderBottom: '1.643px solid #000000',
					boxSizing: 'border-box',
					padding: '0 10px',
					display: 'flex',
					alignItems: 'center',
				}}
			>
				{showDrivingPill ? (
					<div
						onMouseEnter={() => setIsPillHovered(true)}
						onMouseLeave={() => setIsPillHovered(false)}
						style={{
							position: 'relative',
							width: '100%',
							minWidth: 0,
							height: '100%',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						<button
							type="button"
							aria-label={`Edit location — ${drivingDuration} drive from you`}
							onMouseDown={handleEditLocationMouseDown}
							onClick={(event) => {
								// Fallback for keyboard activation (Enter/Space), which doesn't
								// fire mousedown. Idempotent if mousedown already ran.
								handleEditLocationClick(event);
							}}
							onFocus={() => setIsPillHovered(true)}
							onBlur={() => setIsPillHovered(false)}
							style={{
								width: '100%',
								minWidth: 0,
								padding: 0,
								margin: 0,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'flex-start',
								background: 'transparent',
								border: 0,
								cursor: 'text',
								...popupTextStyle,
								color: '#000000',
								fontSize: '14px',
								fontWeight: 700,
								lineHeight: '16px',
								textAlign: 'left',
							}}
						>
							{drivingDuration} from you
						</button>
						{isPillHovered && address && (
							<button
								type="button"
								tabIndex={-1}
								aria-label={`Edit location address, currently ${address}`}
								onMouseDown={handleEditLocationMouseDown}
								onClick={handleEditLocationClick}
								style={{
									position: 'absolute',
									left: '8px',
									right: '8px',
									top: 'calc(100% + 6px)',
									zIndex: 30,
									border: 0,
									margin: 0,
									appearance: 'none',
									WebkitAppearance: 'none',
									background: 'rgba(0, 0, 0, 0.86)',
									color: '#FFFFFF',
									borderRadius: '6px',
									padding: '6px 9px',
									...popupTextStyle,
									fontSize: '11.5px',
									fontWeight: 500,
									lineHeight: '14px',
									textAlign: 'left',
									boxShadow: '0 4px 14px rgba(0, 0, 0, 0.28)',
									whiteSpace: 'normal',
									overflowWrap: 'anywhere',
									cursor: 'text',
								}}
							>
								{address}
							</button>
						)}
					</div>
				) : (
					<input
						ref={inputRef}
						aria-label="Event location"
						placeholder="Add Location"
						value={query}
						onChange={(event) => {
							setQuery(event.target.value);
							if (geocodeError) setGeocodeError(null);
						}}
						onFocus={() => {
							if (hasSavedLocation) setIsEditing(true);
						}}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								void runGeocode();
							}
						}}
						style={{
							width: '100%',
							minWidth: 0,
							border: 0,
							outline: 'none',
							background: 'transparent',
							boxShadow: 'none',
							fontFamily:
								'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
							color: '#000000',
							fontSize: '13px',
							fontWeight: 700,
							lineHeight: '16px',
						}}
					/>
				)}
			</div>

			{/* Map area */}
			<div
				style={{
					position: 'relative',
					width: '100%',
					height: 'calc(100% - 27px)',
					background: mapboxToken ? '#E5E3DF' : decorativeMapBackground,
					overflow: 'hidden',
				}}
			>
				<div
					ref={mapContainerRef}
					className="dashboard-calendar-popup-location-map-root"
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: '100%',
						height: '100%',
					}}
				/>

				{/* Saved address caption along the bottom of the map. */}
				{hasSavedLocation && address && (
					<button
						type="button"
						aria-label={`Edit location address, currently ${address}`}
						onMouseDown={handleEditLocationMouseDown}
						onClick={handleEditLocationClick}
						style={{
							position: 'absolute',
							left: '8px',
							right: '8px',
							bottom: '8px',
							boxSizing: 'border-box',
							border: 0,
							margin: 0,
							textAlign: 'center',
							appearance: 'none',
							WebkitAppearance: 'none',
							...popupTextStyle,
							color: '#000000',
							fontSize: '12px',
							fontWeight: 600,
							lineHeight: '14px',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							background: 'rgba(255, 255, 255, 0.9)',
							borderRadius: '6px',
							padding: '2px 6px',
							cursor: 'text',
						}}
					>
						{address}
					</button>
				)}

				{/* Lightweight status badge while geocoding or after a miss. */}
				{(isGeocoding || geocodeError) && (
					<div
						style={{
							position: 'absolute',
							left: '50%',
							top: '8px',
							transform: 'translateX(-50%)',
							padding: '2px 8px',
							borderRadius: '999px',
							background: 'rgba(255, 255, 255, 0.92)',
							boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
							...popupTextStyle,
							color: '#000000',
							fontSize: '11px',
							fontWeight: 600,
							lineHeight: '14px',
							pointerEvents: 'none',
							whiteSpace: 'nowrap',
						}}
					>
						{isGeocoding ? 'Searching…' : geocodeError}
					</div>
				)}
			</div>
		</div>
	);
};

export default DashboardCalendarPopupLocation;
