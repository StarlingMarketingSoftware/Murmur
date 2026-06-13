import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Pause, Play, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import {
	useCreateMediaEmbed,
	useDeleteMedia,
	useGetMedia,
} from '@/hooks/queryHooks/useMediaAssets';
import { useMediaUpload, type UploadState } from '@/hooks/useMediaUpload';
import { MediaPreviewDialog } from '@/components/organisms/_dialogs/MediaPreviewDialog/MediaPreviewDialog';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import type { MediaAssetDto } from '@/app/api/media/route';

import {
	profileBioIconSvg,
	profileGenreOptionRows,
	profilePerformingNameIconSvg,
} from '@/components/molecules/HybridPromptInput/profileFieldIcons';
import {
	ProfileAreaMarkerIcon,
	profileAreaMarkerSvg,
} from '@/components/atoms/_svg/ProfileAreaMarkerIcon';

type ProfileSidePanelBoxProps = {
	profileName?: string | null;
	profileGenre?: string | null;
	profileArea?: string | null;
	profilePerformingName?: string | null;
	profileBio?: string | null;
	/**
	 * Optional: invoked when the user edits the profile name inline and commits
	 * (blur or Enter). Receives the trimmed name. Mirrors the inline name editing
	 * in HybridPromptInput's Profile tab. When omitted, the name is read-only.
	 */
	onProfileNameUpdate?: (name: string) => void;
	onProfileGenreUpdate?: (genre: string) => void | Promise<void>;
	onProfileAreaUpdate?: (area: string) => void | Promise<void>;
	onProfilePerformingNameUpdate?: (name: string | null) => void | Promise<void>;
	onProfileBioUpdate?: (bio: string | null) => void | Promise<void>;
};

const profileSwatchColors = ['#D5E5FC', '#EEF5FE', '#FFFFFF'] as const;
const profileFieldLabelClassName =
	'font-inter text-[10.292px] font-medium leading-[18.479px] text-[#9A9A9A]';
const completedProfileFieldLabelClassName =
	'font-inter text-[10.292px] font-black leading-[18.479px] text-[#76E59B]';

const DEFAULT_AREA_CENTER: [number, number] = [-98.5795, 39.8283];
const DEFAULT_AREA_ZOOM = 2.6;
const USER_AREA_ZOOM = 6;
const SELECTED_AREA_ZOOM = 7;
const PROFILE_AREA_MARKER_WIDTH = 26;
const PROFILE_AREA_MARKER_HEIGHT = 32;
const profileVideoAddIconSvg = `
	<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 17 17" fill="none">
		<line x1="8.87194" y1="3.23084e-08" x2="8.87194" y2="17" stroke="#7F7F7F" stroke-width="1.47826"/>
		<line y1="8.87024" x2="17" y2="8.87024" stroke="#7F7F7F" stroke-width="1.47826"/>
	</svg>
`;
const decorativeAreaMapBackground =
	'linear-gradient(135deg, rgba(63, 191, 214, 0.9) 0%, rgba(63, 191, 214, 0.9) 28%, transparent 28%), linear-gradient(35deg, rgba(178, 233, 207, 0.95) 0%, rgba(178, 233, 207, 0.95) 68%, rgba(134, 219, 185, 0.95) 68%), linear-gradient(110deg, transparent 0 47%, rgba(255, 255, 255, 0.55) 47% 50%, transparent 50%), #B1E6CE';

type ProfileFieldLabelProps = {
	children: string;
	completed: boolean;
	className?: string;
};

const ProfileFieldLabel = ({
	children,
	completed,
	className = '',
}: ProfileFieldLabelProps) => (
	<div
		className={`${completed ? completedProfileFieldLabelClassName : profileFieldLabelClassName} ${className}`}
	>
		<span className="relative inline-flex">
			{completed && (
				<span
					aria-hidden="true"
					className="absolute left-[-5px] right-[-5px] top-1/2 h-[7px] -translate-y-1/2 rounded-[3px] bg-[#D6FFED]"
				/>
			)}
			<span className="relative z-10">{children}</span>
		</span>
	</div>
);

export type AreaCoordinates = { lat: number; lng: number };

export type ProfileAreaMapFeature = {
	geometry?: { coordinates?: [number, number] };
	properties?: {
		name?: string;
		mapbox_id?: string;
		full_address?: string;
		place_formatted?: string;
		context?: Record<
			string,
			{ name?: string; region_code?: string; short_code?: string } | undefined
		>;
	};
};

export type ProfileAreaMapBoxProps = {
	area: string;
	onAreaUpdate?: (area: string) => void | Promise<void>;
	onAreaCommit?: () => void;
	className?: string;
	headerLabel?: string;
	inputPlaceholder?: string;
	initiallyEditing?: boolean;
	reverseGeocodeTypes?: string;
	forwardGeocodeTypes?: string;
	formatGeocodeFeature?: (feature: ProfileAreaMapFeature) => string;
	/** Seed the marker on mount — lets a parent restore the last picked spot. */
	initialCoordinates?: AreaCoordinates | null;
	/** Fires whenever the marker is placed (pin drop or search) so a parent can persist it. */
	onCoordinatesChange?: (coordinates: AreaCoordinates) => void;
	/** Fires with the resolved geocode feature so a parent can read structured parts (city/region). */
	onFeatureSelect?: (feature: ProfileAreaMapFeature) => void;
	/** Camera zoom once a location is picked — street-level pickers want closer than the regional default. */
	selectedZoom?: number;
};

const formatReverseGeocodeArea = (feature: ProfileAreaMapFeature) => {
	const context = feature.properties?.context;
	const city =
		context?.place?.name ||
		context?.locality?.name ||
		context?.district?.name ||
		feature.properties?.name;
	const region = context?.region?.name;
	const formatted = [city, region].filter(Boolean).join(', ');
	return (
		formatted ||
		feature.properties?.full_address ||
		feature.properties?.place_formatted ||
		feature.properties?.name ||
		''
	);
};

export const ProfileAreaMapBox = ({
	area,
	onAreaUpdate,
	className = 'mt-[5px]',
	headerLabel = 'Choose your Area',
	inputPlaceholder = headerLabel,
	initiallyEditing = false,
	reverseGeocodeTypes = 'place,locality,district,region',
	forwardGeocodeTypes,
	formatGeocodeFeature = formatReverseGeocodeArea,
	initialCoordinates = null,
	onCoordinatesChange,
	onAreaCommit,
	onFeatureSelect,
	selectedZoom = SELECTED_AREA_ZOOM,
}: ProfileAreaMapBoxProps) => {
	const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const markerRef = useRef<mapboxgl.Marker | null>(null);
	const geocodeGenRef = useRef(0);
	const forwardGeocodeGenRef = useRef(0);
	const [isMapReady, setIsMapReady] = useState(false);
	const [mapError, setMapError] = useState<string | null>(null);
	const [areaQuery, setAreaQuery] = useState(area);
	const [isEditingArea, setIsEditingArea] = useState(initiallyEditing);
	const [isGeocodingArea, setIsGeocodingArea] = useState(false);
	const [geocodeError, setGeocodeError] = useState<string | null>(null);
	const [userLocation, setUserLocation] = useState<AreaCoordinates | null>(null);
	const [areaCoordinates, setAreaCoordinates] = useState<AreaCoordinates | null>(
		initialCoordinates ?? null
	);
	const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
	const areaStatus = isGeocodingArea
		? 'Searching area...'
		: geocodeError || (isReverseGeocoding ? 'Saving area...' : mapError);

	useEffect(() => {
		if (!isEditingArea) setAreaQuery(area);
	}, [area, isEditingArea]);

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
				/* permission denied or unavailable - silently degrade */
			},
			{ enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 8000 }
		);
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!mapContainerRef.current || mapRef.current) return;
		if (!mapboxToken) {
			setMapError('Map token missing');
			console.warn(
				'[ProfileAreaMapBox] Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN - map will not render.'
			);
			return;
		}
		setMapError(null);

		mapboxgl.accessToken = mapboxToken;
		let map: mapboxgl.Map;
		try {
			map = new mapboxgl.Map({
				container: mapContainerRef.current,
				style: 'mapbox://styles/mapbox/streets-v12',
				center: DEFAULT_AREA_CENTER,
				zoom: DEFAULT_AREA_ZOOM,
				attributionControl: false,
			});
		} catch (error) {
			setMapError('Map unavailable');
			console.warn('[ProfileAreaMapBox] Mapbox failed to initialize.', error);
			return;
		}
		map.dragRotate.disable();
		map.touchZoomRotate.disableRotation();
		map.keyboard.disable();
		mapRef.current = map;
		setIsMapReady(true);

		map.once('load', () => {
			setMapError(null);
			map.resize();
		});
		map.on('error', (event) => {
			setMapError('Map failed to load');
			console.warn('[ProfileAreaMapBox] Mapbox failed to render.', event);
		});

		const rafId = window.requestAnimationFrame(() => map.resize());
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
	}, [mapboxToken]);

	const commitCoordinates = useCallback(
		async (next: AreaCoordinates) => {
			if (!mapboxToken) return;
			const myGen = ++geocodeGenRef.current;
			const fallback = `${next.lat.toFixed(3)}, ${next.lng.toFixed(3)}`;
			setAreaCoordinates(next);
			onCoordinatesChange?.(next);
			setIsReverseGeocoding(true);

			try {
				const url = new URL('https://api.mapbox.com/search/geocode/v6/reverse');
				url.searchParams.set('longitude', String(next.lng));
				url.searchParams.set('latitude', String(next.lat));
				url.searchParams.set('limit', '1');
				url.searchParams.set('types', reverseGeocodeTypes);
				url.searchParams.set('access_token', mapboxToken);

				const res = await fetch(url.toString());
				if (myGen !== geocodeGenRef.current) return;
				if (!res.ok) {
					onAreaUpdate?.(fallback);
					return;
				}

				const data = (await res.json()) as { features?: ProfileAreaMapFeature[] };
				const feature = data.features?.[0];
				const formatted = feature ? formatGeocodeFeature(feature) : '';
				if (feature) onFeatureSelect?.(feature);
				onAreaUpdate?.(formatted || fallback);
			} catch {
				if (myGen === geocodeGenRef.current) onAreaUpdate?.(fallback);
			} finally {
				if (myGen === geocodeGenRef.current) setIsReverseGeocoding(false);
			}
		},
		[
			formatGeocodeFeature,
			mapboxToken,
			onAreaUpdate,
			onCoordinatesChange,
			onFeatureSelect,
			reverseGeocodeTypes,
		]
	);

	const runAreaGeocode = useCallback(async () => {
		const trimmed = areaQuery.trim();
		if (!trimmed) return;
		if (!mapboxToken) {
			setGeocodeError('Map token missing');
			return;
		}

		const myGen = ++forwardGeocodeGenRef.current;
		setIsGeocodingArea(true);
		setGeocodeError(null);

		try {
			const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
			url.searchParams.set('q', trimmed);
			url.searchParams.set('limit', '1');
			url.searchParams.set('country', 'us');
			url.searchParams.set('access_token', mapboxToken);
			if (forwardGeocodeTypes) {
				url.searchParams.set('types', forwardGeocodeTypes);
			}
			if (userLocation) {
				url.searchParams.set('proximity', `${userLocation.lng},${userLocation.lat}`);
			}

			const res = await fetch(url.toString());
			if (myGen !== forwardGeocodeGenRef.current) return;
			if (!res.ok) {
				setGeocodeError('Lookup failed');
				return;
			}

			const data = (await res.json()) as { features?: ProfileAreaMapFeature[] };
			const feature = data.features?.[0];
			const coords = feature?.geometry?.coordinates;
			if (!feature || !coords || coords.length < 2) {
				setGeocodeError('No match');
				return;
			}

			const [nextLng, nextLat] = coords;
			const formatted = formatGeocodeFeature(feature) || trimmed;
			const nextCoordinates = { lat: nextLat, lng: nextLng };
			setAreaCoordinates(nextCoordinates);
			onCoordinatesChange?.(nextCoordinates);
			setAreaQuery(formatted);
			setIsEditingArea(false);
			onFeatureSelect?.(feature);
			onAreaUpdate?.(formatted);
			onAreaCommit?.();
		} catch {
			if (myGen === forwardGeocodeGenRef.current) setGeocodeError('Lookup failed');
		} finally {
			if (myGen === forwardGeocodeGenRef.current) setIsGeocodingArea(false);
		}
	}, [
		areaQuery,
		mapboxToken,
		onAreaUpdate,
		onAreaCommit,
		onCoordinatesChange,
		onFeatureSelect,
		userLocation,
		forwardGeocodeTypes,
		formatGeocodeFeature,
	]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map || !isMapReady) return;

		const markerPosition = areaCoordinates ??
			userLocation ?? {
				lat: DEFAULT_AREA_CENTER[1],
				lng: DEFAULT_AREA_CENTER[0],
			};
		const hasConcretePosition = Boolean(areaCoordinates || userLocation);

		if (!markerRef.current) {
			const el = document.createElement('div');
			el.dataset.profileAreaMarker = 'true';
			el.innerHTML = profileAreaMarkerSvg;
			Object.assign(el.style, {
				width: `${PROFILE_AREA_MARKER_WIDTH}px`,
				height: `${PROFILE_AREA_MARKER_HEIGHT}px`,
				display: 'block',
				boxSizing: 'border-box',
				cursor: 'grab',
			});

			const marker = new mapboxgl.Marker({
				element: el,
				anchor: 'bottom',
				draggable: true,
			})
				.setLngLat([markerPosition.lng, markerPosition.lat])
				.addTo(map);
			marker.on('dragstart', () => {
				el.style.cursor = 'grabbing';
			});
			marker.on('dragend', () => {
				el.style.cursor = 'grab';
				const lngLat = marker.getLngLat();
				void commitCoordinates({ lat: lngLat.lat, lng: lngLat.lng });
			});
			markerRef.current = marker;
		} else {
			markerRef.current.setLngLat([markerPosition.lng, markerPosition.lat]);
		}

		map.easeTo({
			center: [markerPosition.lng, markerPosition.lat],
			zoom: areaCoordinates
				? selectedZoom
				: hasConcretePosition
					? USER_AREA_ZOOM
					: DEFAULT_AREA_ZOOM,
			duration: hasConcretePosition ? 350 : 0,
		});
	}, [areaCoordinates, userLocation, isMapReady, commitCoordinates, selectedZoom]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map || !isMapReady) return;

		const handleClick = (event: mapboxgl.MapMouseEvent) => {
			void commitCoordinates({ lat: event.lngLat.lat, lng: event.lngLat.lng });
		};

		map.on('click', handleClick);
		return () => {
			map.off('click', handleClick);
		};
	}, [isMapReady, commitCoordinates]);

	return (
		<div
			className={`relative box-border h-[129px] w-[334px] shrink-0 overflow-hidden rounded-[9px] border-[1.526px] border-black bg-white opacity-80 ${className}`}
		>
			<style jsx global>{`
				.profile-side-panel-area-map-root,
				.profile-side-panel-area-map-root.mapboxgl-map,
				.profile-side-panel-area-map-root .mapboxgl-canvas-container,
				.profile-side-panel-area-map-root .mapboxgl-canvas {
					width: 100% !important;
					height: 100% !important;
				}

				.profile-side-panel-area-map-root.mapboxgl-map,
				.profile-side-panel-area-map-root .mapboxgl-canvas-container,
				.profile-side-panel-area-map-root .mapboxgl-canvas {
					position: absolute !important;
					inset: 0 !important;
				}

				.profile-side-panel-area-map-root .mapboxgl-marker {
					position: absolute;
					left: 0;
					top: 0;
				}

				.profile-side-panel-area-map-root .mapboxgl-ctrl-logo,
				.profile-side-panel-area-map-root .mapboxgl-ctrl-attrib {
					display: none !important;
				}
			`}</style>
			<div className="box-border flex h-[27px] items-center border-b-[1.526px] border-black px-[10px] font-inter text-[17.507px] font-medium leading-[23.342px] text-black">
				{isEditingArea ? (
					<input
						type="text"
						value={areaQuery}
						placeholder={inputPlaceholder}
						aria-label={inputPlaceholder}
						onChange={(event) => {
							setAreaQuery(event.target.value);
							if (geocodeError) setGeocodeError(null);
						}}
						onBlur={() => {
							if (isGeocodingArea) return;
							setAreaQuery(area);
							setIsEditingArea(false);
						}}
						onFocus={(event) => event.currentTarget.select()}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								void runAreaGeocode();
							} else if (event.key === 'Escape') {
								event.preventDefault();
								setAreaQuery(area);
								setIsEditingArea(false);
							}
						}}
						autoFocus
						className="h-full w-full border-0 bg-transparent p-0 font-inter text-[17.507px] font-medium leading-[23.342px] text-black outline-none placeholder:text-black"
					/>
				) : (
					<button
						type="button"
						onClick={() => {
							setAreaQuery(area);
							setIsEditingArea(true);
						}}
						className="h-full w-full appearance-none border-0 bg-transparent p-0 text-left font-inter text-[17.507px] font-medium leading-[23.342px] text-black"
					>
						{headerLabel}
					</button>
				)}
			</div>
			<div
				style={{ background: mapboxToken ? '#E5E3DF' : decorativeAreaMapBackground }}
				className="absolute inset-x-0 bottom-0 top-[27px] overflow-hidden"
			>
				<div
					ref={mapContainerRef}
					className="profile-side-panel-area-map-root"
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: '100%',
						height: '100%',
					}}
				/>
				{area && (
					<div className="pointer-events-none absolute bottom-[9px] left-[10px] right-[10px] truncate text-center font-inter text-[14px] font-medium leading-[18px] text-black">
						{area}
					</div>
				)}
				{areaStatus && (
					<div className="pointer-events-none absolute left-1/2 top-[7px] -translate-x-1/2 rounded-full bg-white/90 px-[8px] py-[1px] font-inter text-[10px] font-semibold leading-[14px] text-black shadow-sm">
						{areaStatus}
					</div>
				)}
			</div>
		</div>
	);
};

const profileMediaWaveformBars = [
	48, 60, 54, 66, 56, 70, 62, 64, 67, 65, 69, 61, 63, 68, 60, 71, 62, 66, 57, 65, 60, 69,
	62, 61, 66, 72, 64, 68, 56, 62, 73, 66, 60, 69, 67, 64, 57, 62, 66, 61, 65, 70, 59, 64,
	62, 67, 71, 69, 63, 66, 61, 64, 67, 70, 66, 63, 62, 65, 60, 50, 48, 44, 40, 35, 30,
] as const;

const getMediaDisplayTitle = (filename: string) =>
	filename.replace(/\.[^/.]+$/, '').trim() || filename;

export const ProfileMediaWaveform = () => {
	const bars = (
		<div className="flex h-full w-max items-center">
			{profileMediaWaveformBars.map((height, index) => (
				<span
					key={`waveform-${index}`}
					className="block w-[3px]"
					style={{ height: `${height}%`, backgroundColor: '#ABAABF' }}
				/>
			))}
		</div>
	);

	return (
		<div aria-hidden="true" className="relative h-[32px] w-full overflow-hidden">
			{bars}
		</div>
	);
};

/** A filled media slot: square media artwork, title, waveform, and hover playback. */
const ProfileMediaSlotCard = ({
	asset,
	onPlay,
	onDelete,
}: {
	asset: MediaAssetDto;
	onPlay: () => void;
	onDelete: () => void;
}) => {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const isAudio = asset.kind === 'audio';
	const displayTitle = getMediaDisplayTitle(asset.filename);

	const handleAudioToggle = async () => {
		const audio = audioRef.current;
		if (!audio || !asset.url) return;
		if (isPlaying) {
			audio.pause();
			return;
		}
		if (audio.ended) {
			audio.currentTime = 0;
		}
		try {
			await audio.play();
		} catch {
			setIsPlaying(false);
		}
	};

	const handleCardClick = () => {
		if (isAudio) {
			void handleAudioToggle();
			return;
		}
		onPlay();
	};

	const playOverlayClassName = isPlaying
		? 'opacity-100'
		: 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100';

	return (
		<div className="group relative h-[66px] w-[326px] shrink-0 overflow-hidden rounded-[9px] bg-[#F2F7FF]">
			<button
				type="button"
				onClick={handleCardClick}
				aria-label={`Play ${asset.filename}`}
				className="flex h-full w-full items-center gap-[13px] px-[12px] text-left transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
			>
				<span
					className="relative flex h-[50px] w-[50px] shrink-0 overflow-hidden rounded-[6px]"
					style={{
						background:
							'linear-gradient(145deg, #EF3030 0%, #F44458 36%, #F04CCB 72%, #FF64D8 100%)',
					}}
				>
					{asset.kind === 'video' && asset.posterUrl && (
						// eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL, not a static asset
						<img src={asset.posterUrl} alt="" className="h-full w-full object-cover" />
					)}
					<span
						className={`absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity ${playOverlayClassName}`}
					>
						<span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-black/70 text-white">
							{isPlaying ? (
								<Pause className="h-3.5 w-3.5" />
							) : (
								<Play className="h-3.5 w-3.5 fill-white" />
							)}
						</span>
					</span>
				</span>
				<span className="flex min-w-0 flex-1 flex-col justify-center gap-[1px]">
					<span className="truncate font-inter text-[16px] font-medium leading-[19px] text-black">
						{displayTitle}
					</span>
					<ProfileMediaWaveform />
				</span>
			</button>
			{isAudio && asset.url && (
				<audio
					ref={audioRef}
					src={asset.url}
					preload="metadata"
					className="hidden"
					onPlay={() => setIsPlaying(true)}
					onPause={() => setIsPlaying(false)}
					onEnded={() => setIsPlaying(false)}
				/>
			)}
			<button
				type="button"
				onClick={onDelete}
				aria-label={`Remove ${asset.filename}`}
				className="absolute right-[6px] top-[6px] hidden h-[20px] w-[20px] items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 group-hover:flex"
			>
				<X className="h-3 w-3" />
			</button>
		</div>
	);
};

export const ProfileSidePanelBox = ({
	profileName,
	profileGenre,
	profileArea,
	profilePerformingName,
	profileBio,
	onProfileNameUpdate,
	onProfileGenreUpdate,
	onProfileAreaUpdate,
	onProfilePerformingNameUpdate,
	onProfileBioUpdate,
}: ProfileSidePanelBoxProps) => {
	const [isEditingName, setIsEditingName] = useState(false);
	const [nameDraft, setNameDraft] = useState('');
	const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
	const [selectedGenreDraft, setSelectedGenreDraft] = useState(
		() => profileGenre?.trim() || ''
	);
	const [isGenreChooserOpen, setIsGenreChooserOpen] = useState(
		() => !profileGenre?.trim()
	);
	const [selectedAreaDraft, setSelectedAreaDraft] = useState(
		() => profileArea?.trim() || ''
	);
	const [isAreaChooserOpen, setIsAreaChooserOpen] = useState(() => !profileArea?.trim());
	const [performingNameDraft, setPerformingNameDraft] = useState(
		() => profilePerformingName?.trim() || ''
	);
	const [isPerformingNameEditorOpen, setIsPerformingNameEditorOpen] = useState(
		() => !profilePerformingName?.trim()
	);
	const [bioDraft, setBioDraft] = useState(() => profileBio?.trim() || '');
	const [isBioEditorOpen, setIsBioEditorOpen] = useState(() => !profileBio?.trim());

	// Keep the draft in sync with the incoming name when not actively editing.
	useEffect(() => {
		if (!isEditingName) setNameDraft(profileName?.trim() || '');
	}, [profileName, isEditingName]);

	useEffect(() => {
		const nextGenre = profileGenre?.trim() || '';
		setSelectedGenreDraft(nextGenre);
		setIsGenreChooserOpen(!nextGenre);
	}, [profileGenre]);

	useEffect(() => {
		const nextArea = profileArea?.trim() || '';
		setSelectedAreaDraft(nextArea);
		setIsAreaChooserOpen(!nextArea);
	}, [profileArea]);

	useEffect(() => {
		const nextPerformingName = profilePerformingName?.trim() || '';
		setPerformingNameDraft(nextPerformingName);
		setIsPerformingNameEditorOpen(!nextPerformingName);
	}, [profilePerformingName]);

	useEffect(() => {
		const nextBio = profileBio?.trim() || '';
		setBioDraft(nextBio);
		setIsBioEditorOpen(!nextBio);
	}, [profileBio]);

	const effectiveName = (isEditingName ? nameDraft : profileName)?.trim() || '';
	const displayName = effectiveName || 'Profile';
	const displayInitial = displayName.charAt(0).toUpperCase();
	const isEditable = Boolean(onProfileNameUpdate);
	const selectedGenre = selectedGenreDraft;
	const selectedArea = selectedAreaDraft;
	const selectedPerformingName = performingNameDraft.trim();
	const selectedBio = bioDraft.trim();
	// Stored genres are free user input (e.g. "rock"); match options case-insensitively
	// like getProfileGenreIcon does, so a saved genre maps to its canonical chip.
	const normalizedSelectedGenre = selectedGenre.trim().toLowerCase();
	const selectedGenreOption = profileGenreOptionRows
		.flat()
		.find((genre) => genre.label.toLowerCase() === normalizedSelectedGenre);
	const SelectedGenreIcon = selectedGenreOption?.Icon;
	const isGenreEditable = Boolean(onProfileGenreUpdate);
	const showAreaStep = Boolean(selectedGenre);
	const hasCompletedArea = Boolean(showAreaStep && selectedArea);
	const showCompletedArea = Boolean(hasCompletedArea && !isAreaChooserOpen);
	const showAreaEditor = Boolean(
		showAreaStep && !isGenreChooserOpen && (!selectedArea || isAreaChooserOpen)
	);
	const showPerformingNameField = hasCompletedArea;
	const showCompletedPerformingName = Boolean(
		showPerformingNameField && selectedPerformingName && !isPerformingNameEditorOpen
	);
	const showPerformingNameEditor = Boolean(
		showPerformingNameField &&
		!isGenreChooserOpen &&
		!isAreaChooserOpen &&
		(!selectedPerformingName || isPerformingNameEditorOpen)
	);
	const showBioStep = Boolean(showPerformingNameField && selectedPerformingName);
	const showCompletedBio = Boolean(showBioStep && selectedBio && !isBioEditorOpen);
	const showBioEditor = Boolean(
		showBioStep &&
		!isGenreChooserOpen &&
		!isAreaChooserOpen &&
		!isPerformingNameEditorOpen &&
		(!selectedBio || isBioEditorOpen)
	);
	const showVideoVerificationSection = Boolean(
		showCompletedBio &&
		!isGenreChooserOpen &&
		!isAreaChooserOpen &&
		!isPerformingNameEditorOpen
	);

	// Profile media (video/audio) lives on the account and is fetched independently
	// of the campaign-scoped profile fields above.
	const mediaInputRef = useRef<HTMLInputElement>(null);
	const addAnchorRef = useRef<HTMLDivElement | null>(null);
	const [previewAsset, setPreviewAsset] = useState<MediaAssetDto | null>(null);
	const [isYouTubeInputOpen, setIsYouTubeInputOpen] = useState(false);
	const [youTubeDraft, setYouTubeDraft] = useState('');
	const { data: profileMedia = [] } = useGetMedia('profile_media');
	const { upload: uploadMedia, activeUploads } = useMediaUpload('profile_media');
	const deleteMedia = useDeleteMedia();
	const createEmbed = useCreateMediaEmbed();

	const mediaSlots: Array<
		{ type: 'asset'; asset: MediaAssetDto } | { type: 'upload'; upload: UploadState }
	> = [
		...profileMedia.map((asset) => ({ type: 'asset' as const, asset })),
		...activeUploads.map((upload) => ({ type: 'upload' as const, upload })),
	];
	const canAddMedia = mediaSlots.length < 3;

	const handleSelectMediaFile = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (file) void uploadMedia(file);
	};
	const openYouTubeInput = () => {
		setYouTubeDraft('');
		setIsYouTubeInputOpen(true);
	};
	const commitYouTube = async () => {
		const url = youTubeDraft.trim();
		if (!url) return;
		try {
			await createEmbed.mutateAsync({ url, context: 'profile_media' });
			setYouTubeDraft('');
			setIsYouTubeInputOpen(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add video');
		}
	};

	// Close the YouTube input on an outside click.
	useEffect(() => {
		if (!isYouTubeInputOpen) return;
		const onDown = (e: MouseEvent) => {
			if (addAnchorRef.current && !addAnchorRef.current.contains(e.target as Node)) {
				setIsYouTubeInputOpen(false);
			}
		};
		document.addEventListener('mousedown', onDown);
		return () => document.removeEventListener('mousedown', onDown);
	}, [isYouTubeInputOpen]);

	// Profile photo (avatar) reuses the same media pipeline (context: "avatar", cap 1).
	const avatarInputRef = useRef<HTMLInputElement>(null);
	const { data: avatarMedia = [] } = useGetMedia('avatar');
	const { upload: uploadAvatar, activeUploads: avatarUploads } = useMediaUpload('avatar');
	const replaceAvatar = useDeleteMedia({ suppressToasts: true });
	const avatar = avatarMedia.find((item) => item.status === 'ready') ?? null;
	const isAvatarUploading = avatarUploads.length > 0;

	const handleSelectAvatarFile = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		// Avatar is capped at one — clear any existing avatar first so the new upload
		// isn't rejected by the per-context limit.
		await Promise.all(
			avatarMedia.map((item) => replaceAvatar.mutateAsync(item.id).catch(() => {}))
		);
		void uploadAvatar(file);
	};

	const startEditing = () => {
		if (!isEditable) return;
		setNameDraft(profileName?.trim() || '');
		setIsEditingName(true);
	};

	const commitName = () => {
		setIsEditingName(false);
		const next = nameDraft.trim();
		const prev = (profileName ?? '').trim();
		// Name is required on Identity; skip empty or unchanged values.
		if (!next || next === prev) {
			setNameDraft(prev);
			return;
		}
		onProfileNameUpdate?.(next);
	};

	const cancelEditing = () => {
		setNameDraft(profileName?.trim() || '');
		setIsEditingName(false);
	};

	const handleGenreClick = (genre: string) => {
		if (!isGenreEditable) return;
		const hasArea = Boolean(selectedArea);
		setSelectedGenreDraft(genre);
		setIsGenreChooserOpen(false);
		setIsAreaChooserOpen(!hasArea);
		setIsPerformingNameEditorOpen(hasArea && !selectedPerformingName);
		setIsBioEditorOpen(!selectedBio);
		if (genre.toLowerCase() !== normalizedSelectedGenre) onProfileGenreUpdate?.(genre);
	};

	const openGenreChooser = () => {
		setIsGenreChooserOpen(true);
		setIsAreaChooserOpen(!selectedArea);
		setIsPerformingNameEditorOpen(!selectedPerformingName);
		setIsBioEditorOpen(!selectedBio);
	};

	const openAreaChooser = () => {
		setIsGenreChooserOpen(false);
		setIsAreaChooserOpen(true);
		setIsPerformingNameEditorOpen(!selectedPerformingName);
		setIsBioEditorOpen(!selectedBio);
	};

	const openPerformingNameEditor = () => {
		setIsGenreChooserOpen(false);
		setIsAreaChooserOpen(false);
		setIsPerformingNameEditorOpen(true);
		setIsBioEditorOpen(!selectedBio);
	};

	const openBioEditor = () => {
		setIsGenreChooserOpen(false);
		setIsAreaChooserOpen(false);
		setIsPerformingNameEditorOpen(false);
		setIsBioEditorOpen(true);
	};

	const handleAreaUpdate = (area: string) => {
		const next = area.trim();
		if (!next) return;
		setSelectedAreaDraft(next);
		setIsAreaChooserOpen(false);
		onProfileAreaUpdate?.(next);
	};

	const commitPerformingName = () => {
		const next = performingNameDraft.trim();
		const prev = (profilePerformingName ?? '').trim();
		setPerformingNameDraft(next);
		setIsPerformingNameEditorOpen(!next);
		if (next === prev) return;
		onProfilePerformingNameUpdate?.(next || null);
	};

	const cancelPerformingNameEdit = () => {
		const prev = profilePerformingName?.trim() || '';
		setPerformingNameDraft(prev);
		setIsPerformingNameEditorOpen(!prev);
	};

	const commitBio = () => {
		const next = bioDraft.trim();
		const prev = (profileBio ?? '').trim();
		setBioDraft(next);
		setIsBioEditorOpen(!next);
		if (next === prev) return;
		onProfileBioUpdate?.(next || null);
	};

	const cancelBioEdit = () => {
		const prev = profileBio?.trim() || '';
		setBioDraft(prev);
		setIsBioEditorOpen(!prev);
	};

	const nameClassName =
		'box-border inline-flex h-[22px] max-w-[215px] items-center justify-center truncate whitespace-nowrap rounded-[3px] bg-[#D6FFED] px-[8px] font-inter text-[17.507px] font-medium leading-[22px] text-black';

	return (
		<div
			data-campaign-profile-side-panel
			aria-label="Profile panel"
			className="relative box-border flex h-[681px] w-[393px] items-end justify-center rounded-[12px] border-[3px] border-[#070707] bg-[#75BEF9] pb-[5px]"
		>
			<span className="absolute left-[22px] top-[0px] font-inter text-[17.507px] font-medium leading-[23.342px] text-black">
				Profile
			</span>
			<div className="box-border flex h-[651px] w-[374px] flex-col overflow-hidden rounded-[12px] border-2 border-black bg-[#ABCBF9]">
				<div className="flex h-[53px] shrink-0 items-center gap-[9px] border-b-2 border-black bg-[#ABCBF9] pl-[23px]">
					<button
						type="button"
						onClick={() => avatarInputRef.current?.click()}
						aria-label="Upload a profile photo"
						className="relative flex h-[33px] w-[33px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#7BDB7F] font-inter text-[25px] font-normal leading-none text-white transition hover:brightness-95"
					>
						{avatar?.url ? (
							// eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL, not a static asset
							<img src={avatar.url} alt="" className="h-full w-full object-cover" />
						) : (
							displayInitial
						)}
						{isAvatarUploading && (
							<span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[12px]">
								…
							</span>
						)}
					</button>
					<input
						ref={avatarInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleSelectAvatarFile}
					/>
					{isEditingName ? (
						<input
							type="text"
							value={nameDraft}
							onChange={(e) => setNameDraft(e.target.value)}
							onBlur={commitName}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									commitName();
								} else if (e.key === 'Escape') {
									e.preventDefault();
									cancelEditing();
								}
							}}
							autoFocus
							className={`${nameClassName} w-[180px] justify-start border-0 outline-none`}
						/>
					) : isEditable ? (
						<button
							type="button"
							onClick={startEditing}
							aria-label={
								effectiveName
									? `Edit profile name: ${effectiveName}`
									: 'Edit profile name'
							}
							className={`${nameClassName} cursor-text transition hover:brightness-95`}
						>
							{displayName}
						</button>
					) : (
						<div className={nameClassName}>{displayName}</div>
					)}
					{profileSwatchColors.map((color) => (
						<div
							key={color}
							aria-hidden="true"
							className="box-border h-[21px] w-[21px] shrink-0 rounded-[2.86px] border-[0.782px] border-black opacity-50"
							style={{ backgroundColor: color }}
						/>
					))}
				</div>
				<div className="flex flex-1 items-center justify-center bg-[#F2F7FF]">
					<CustomScrollbar
						className="h-[578px] w-[352px] rounded-[9px] bg-white"
						contentClassName="box-border flex flex-col rounded-[9px] px-[9px] pt-[8px] pb-[18px]"
						thumbWidth={2}
						thumbColor="#000000"
						trackColor="transparent"
						offsetRight={-5}
						lockHorizontalScroll
					>
						<ProfileFieldLabel completed={Boolean(selectedGenre)}>
							Genre
						</ProfileFieldLabel>
						{selectedGenreOption && !isGenreChooserOpen ? (
							<button
								type="button"
								disabled={!isGenreEditable}
								onClick={openGenreChooser}
								className="mt-[5px] flex h-[21.374px] shrink-0 appearance-none items-center justify-center gap-[3px] rounded-[7.491px] border-0 bg-[#F4F4F4] px-[4px] font-inter text-[14px] font-medium leading-[21.374px] text-black transition hover:brightness-95 disabled:cursor-default disabled:opacity-100"
								style={{ width: `${selectedGenreOption.width}px` }}
							>
								{SelectedGenreIcon && (
									<SelectedGenreIcon aria-hidden="true" className="shrink-0" />
								)}
								<span>{selectedGenreOption.label}</span>
							</button>
						) : (
							<div className="relative mt-[5px] box-border h-[129px] w-[334px] shrink-0 overflow-hidden rounded-[9px] border-[1.526px] border-black bg-white opacity-80">
								<div className="box-border flex h-[27px] items-center px-[10px] font-inter text-[17.507px] font-medium leading-[23.342px] text-black">
									Choose your Genre
								</div>
								<div className="absolute inset-x-0 bottom-0 top-[27px] bg-[#BAD4FA]" />
								<div className="absolute left-0 top-[27px] w-full border-t-[1.526px] border-black" />
								<div className="absolute left-[11px] right-[11px] top-[37px] flex flex-col gap-[9px]">
									{profileGenreOptionRows.map((row) => (
										<div
											key={row.map((genre) => genre.label).join('-')}
											className="flex justify-between"
										>
											{row.map((genre) => {
												const Icon = genre.Icon;
												const isSelected =
													genre.label.toLowerCase() === normalizedSelectedGenre;
												const isHovered = genre.label === hoveredGenre;

												return (
													<button
														type="button"
														key={genre.label}
														disabled={!isGenreEditable}
														onClick={() => handleGenreClick(genre.label)}
														onMouseEnter={() => setHoveredGenre(genre.label)}
														onMouseLeave={() => setHoveredGenre(null)}
														className={`flex h-[21.374px] appearance-none items-center justify-center gap-[3px] rounded-[7.491px] border-0 px-[4px] font-inter text-[14px] font-medium leading-[21.374px] text-black transition-colors disabled:opacity-100 ${
															isGenreEditable ? 'cursor-pointer' : 'cursor-default'
														} ${isSelected || isHovered ? 'bg-[#D6FFED]' : 'bg-white'}`}
														style={{ width: `${genre.width}px` }}
													>
														{Icon && <Icon aria-hidden="true" className="shrink-0" />}
														<span>{genre.label}</span>
													</button>
												);
											})}
										</div>
									))}
								</div>
							</div>
						)}
						<ProfileFieldLabel
							completed={Boolean(selectedArea)}
							className={showAreaStep ? 'mt-[14px]' : 'mt-[39px]'}
						>
							Area
						</ProfileFieldLabel>
						{showCompletedArea ? (
							<button
								type="button"
								onClick={openAreaChooser}
								className="mt-[5px] flex h-[21.374px] w-fit max-w-[334px] shrink-0 appearance-none items-center gap-[4px] overflow-hidden rounded-[7.491px] border-0 bg-[#F4F4F4] px-[6px] font-inter text-[14px] font-medium leading-[21.374px] text-black transition hover:brightness-95"
							>
								<span aria-hidden="true" className="block h-[16px] w-[13px] shrink-0">
									<ProfileAreaMarkerIcon className="h-full w-full" />
								</span>
								<span className="min-w-0 truncate">{selectedArea}</span>
							</button>
						) : showAreaEditor ? (
							<ProfileAreaMapBox area={selectedArea} onAreaUpdate={handleAreaUpdate} />
						) : null}
						<ProfileFieldLabel
							completed={Boolean(selectedPerformingName)}
							className={showAreaStep ? 'mt-[14px]' : 'mt-[35px]'}
						>
							Performing Name
						</ProfileFieldLabel>
						{showCompletedPerformingName ? (
							<button
								type="button"
								onClick={openPerformingNameEditor}
								className="mt-[5px] flex h-[21.374px] w-fit max-w-[334px] shrink-0 appearance-none items-center gap-[4px] overflow-hidden rounded-[7.491px] border-0 bg-[#F4F4F4] px-[6px] font-inter text-[14px] font-medium leading-[21.374px] text-black transition hover:brightness-95"
							>
								<span
									aria-hidden="true"
									className="block h-[16px] w-[16px] shrink-0"
									dangerouslySetInnerHTML={{ __html: profilePerformingNameIconSvg }}
								/>
								<span className="min-w-0 truncate">{selectedPerformingName}</span>
							</button>
						) : showPerformingNameEditor ? (
							<textarea
								value={performingNameDraft}
								onChange={(event) => setPerformingNameDraft(event.target.value)}
								onBlur={commitPerformingName}
								onKeyDown={(event) => {
									if (event.key === 'Escape') {
										event.preventDefault();
										cancelPerformingNameEdit();
									}
								}}
								rows={2}
								autoFocus
								aria-label="Performing name"
								className="mt-[9px] box-border h-[50px] w-[301px] shrink-0 resize-none rounded-[9px] border-[1.526px] border-black bg-white px-[14px] py-[4px] font-inter text-[18px] font-medium leading-[20px] text-black opacity-80 outline-none"
							/>
						) : null}
						<ProfileFieldLabel completed={Boolean(selectedBio)} className="mt-[16px]">
							Bio
						</ProfileFieldLabel>
						{showCompletedBio ? (
							<button
								type="button"
								onClick={openBioEditor}
								className="mt-[5px] flex h-[81px] w-[326px] shrink-0 appearance-none items-start gap-[9px] overflow-hidden rounded-[9px] border-0 bg-[#F4F4F4] px-[10px] py-[9px] text-left font-inter text-[13px] font-medium leading-[16px] text-black transition hover:brightness-95"
							>
								<span
									aria-hidden="true"
									className="mt-[1px] block h-[17px] w-[8px] shrink-0"
									dangerouslySetInnerHTML={{ __html: profileBioIconSvg }}
								/>
								<span className="line-clamp-3 min-w-0 whitespace-normal">
									{selectedBio}
								</span>
							</button>
						) : showBioEditor ? (
							<textarea
								value={bioDraft}
								onChange={(event) => setBioDraft(event.target.value)}
								onBlur={commitBio}
								onKeyDown={(event) => {
									if (event.key === 'Escape') {
										event.preventDefault();
										cancelBioEdit();
									}
								}}
								autoFocus={!selectedBio}
								aria-label="Bio"
								className="ml-[27px] mt-[24px] h-[132px] w-[301px] shrink-0 resize-none border-0 bg-transparent p-0 font-inter text-[18px] font-medium leading-[24px] text-black outline-none"
							/>
						) : null}
						{showVideoVerificationSection && (
							<>
								<div className="ml-[26px] mt-[20px] w-[236px] shrink-0 font-inter text-[10.5px] font-normal italic leading-[15px] text-black">
									Add a video or audio clip to verify your account and improve your
									profile
								</div>
								<input
									ref={mediaInputRef}
									type="file"
									accept="video/*,audio/*"
									className="hidden"
									onChange={handleSelectMediaFile}
								/>
								<div className="mt-[24px] flex shrink-0 flex-col items-center gap-[14px]">
									{[0, 1, 2].map((index) => {
										const slot = mediaSlots[index];

										if (slot?.type === 'asset' && slot.asset.status === 'ready') {
											const asset = slot.asset;
											return (
												<ProfileMediaSlotCard
													key={asset.id}
													asset={asset}
													onPlay={() => setPreviewAsset(asset)}
													onDelete={() => deleteMedia.mutate(asset.id)}
												/>
											);
										}

										if (slot?.type === 'asset') {
											const asset = slot.asset;
											return (
												<div
													key={asset.id}
													className="relative flex h-[66px] w-[326px] shrink-0 items-center justify-center rounded-[9px] bg-[#F2F7FF] font-inter text-[11px] text-black/50"
												>
													{asset.status === 'failed' ? 'Upload failed' : 'Processing…'}
													<button
														type="button"
														onClick={() => deleteMedia.mutate(asset.id)}
														aria-label="Remove"
														className="absolute right-[6px] top-[6px] flex h-[20px] w-[20px] items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
													>
														<X className="h-3 w-3" />
													</button>
												</div>
											);
										}

										if (slot?.type === 'upload') {
											return (
												<div
													key={`upload-${index}`}
													className="flex h-[66px] w-[326px] shrink-0 flex-col items-center justify-center gap-[8px] rounded-[9px] bg-[#F2F7FF] px-[16px]"
												>
													<span className="w-full truncate text-center font-inter text-[11px] text-black/70">
														{slot.upload.filename}
													</span>
													<div className="h-[4px] w-full overflow-hidden rounded-full bg-black/10">
														<div
															className="h-full rounded-full bg-[#7BDB7F] transition-[width] duration-200"
															style={{ width: `${slot.upload.progress}%` }}
														/>
													</div>
												</div>
											);
										}

										if (index === mediaSlots.length && canAddMedia) {
											return (
												<div
													key={`add-${index}`}
													ref={addAnchorRef}
													className="w-[326px] shrink-0"
												>
													{isYouTubeInputOpen ? (
														<input
															type="text"
															value={youTubeDraft}
															onChange={(e) => setYouTubeDraft(e.target.value)}
															onKeyDown={(e) => {
																if (e.key === 'Enter') {
																	e.preventDefault();
																	void commitYouTube();
																} else if (e.key === 'Escape') {
																	e.preventDefault();
																	setIsYouTubeInputOpen(false);
																}
															}}
															autoFocus
															placeholder="Paste a YouTube link, then press Enter"
															aria-label="YouTube link"
															className="h-[66px] w-[326px] rounded-[9px] bg-[#F2F7FF] px-[16px] font-inter text-[13px] font-medium text-black outline-none placeholder:text-black/40"
														/>
													) : (
														<div className="group relative h-[66px] w-[326px] overflow-hidden rounded-[9px] bg-[#F2F7FF]">
															{/* Default: the add icon, fades out on hover. */}
															<span
																className="pointer-events-none absolute left-1/2 top-1/2 block h-[17px] w-[17px] -translate-x-1/2 -translate-y-1/2 transition-opacity group-hover:opacity-0"
																dangerouslySetInnerHTML={{ __html: profileVideoAddIconSvg }}
															/>
															{/* On hover: two options overlaid inside the same fixed-height box. */}
															<div className="pointer-events-none absolute inset-0 flex flex-col font-inter text-[13px] font-medium text-black opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
																<button
																	type="button"
																	onClick={() => mediaInputRef.current?.click()}
																	className="flex flex-1 items-center gap-[8px] px-[16px] text-left transition hover:brightness-95"
																>
																	<Upload className="h-[14px] w-[14px]" />
																	Upload a clip
																</button>
																<button
																	type="button"
																	onClick={openYouTubeInput}
																	className="flex flex-1 items-center gap-[8px] border-t border-black/10 px-[16px] text-left transition hover:brightness-95"
																>
																	<Play className="h-[14px] w-[14px] fill-black" />
																	Paste YouTube link
																</button>
															</div>
														</div>
													)}
												</div>
											);
										}

										return (
											<div
												key={`empty-${index}`}
												aria-hidden="true"
												className="h-[66px] w-[326px] shrink-0 rounded-[9px] bg-[#F2F7FF]"
												style={{ opacity: [1, 0.8, 0.5][index] }}
											/>
										);
									})}
								</div>
								<MediaPreviewDialog
									asset={previewAsset}
									open={Boolean(previewAsset)}
									onOpenChange={(open) => {
										if (!open) setPreviewAsset(null);
									}}
								/>
							</>
						)}
					</CustomScrollbar>
				</div>
			</div>
		</div>
	);
};
