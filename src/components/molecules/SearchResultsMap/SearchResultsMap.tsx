'use client';

import { FC, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, OverlayView } from '@react-google-maps/api';
import { ContactWithName } from '@/types/contact';
import {
	generateMapTooltipIconUrl,
	calculateTooltipWidth,
	MAP_TOOLTIP_HEIGHT,
	MAP_TOOLTIP_ANCHOR_X,
	MAP_TOOLTIP_ANCHOR_Y,
} from '@/components/atoms/_svg/MapTooltipIcon';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

type LatLngLiteral = { lat: number; lng: number };

const coerceFiniteNumber = (value: unknown): number | null => {
	if (value == null) return null;
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return null;
		// Handle common "decimal comma" formats (e.g. "39,1234")
		const normalized =
			trimmed.includes(',') && !trimmed.includes('.') ? trimmed.replace(',', '.') : trimmed;
		const n = Number(normalized);
		return Number.isFinite(n) ? n : null;
	}

	// Prisma can sometimes surface numeric-like objects; Number(...) is a safe coercion attempt.
	const n = Number((value as { valueOf?: () => unknown })?.valueOf?.() ?? value);
	return Number.isFinite(n) ? n : null;
};

const getLatLngFromContact = (contact: ContactWithName): LatLngLiteral | null => {
	const anyContact = contact as unknown as Record<string, unknown>;
	const lat = coerceFiniteNumber(
		anyContact.latitude ?? anyContact.lat ?? anyContact.Latitude ?? anyContact.LATITUDE
	);
	const lng = coerceFiniteNumber(
		anyContact.longitude ??
			anyContact.lng ??
			anyContact.lon ??
			anyContact.Longitude ??
			anyContact.LONGITUDE
	);

	if (lat == null || lng == null) return null;
	// Defensive sanity bounds: Google Maps won't render invalid ranges reliably.
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
	return { lat, lng };
};

const coordinateKey = (coords: LatLngLiteral) =>
	`${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;

// Deterministic "spiderfy" offset for exact/near-exact duplicate coordinates so markers don't fully overlap.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~2.399963...
const DUPLICATE_JITTER_BASE_DEG = 0.0015; // ~167m latitude; visible at mid zoom levels
const jitterDuplicateCoords = (base: LatLngLiteral, index: number): LatLngLiteral => {
	const angle = index * GOLDEN_ANGLE;
	const radius = DUPLICATE_JITTER_BASE_DEG * Math.sqrt(index);
	const dx = radius * Math.cos(angle);
	const dy = radius * Math.sin(angle);
	const latRad = (base.lat * Math.PI) / 180;
	const lngScale = Math.max(0.2, Math.cos(latRad));
	return {
		lat: base.lat + dy,
		lng: base.lng + dx / lngScale,
	};
};

// State badge colors matching dashboard
const stateBadgeColorMap: Record<string, string> = {
	AL: '#E57373',
	AK: '#64B5F6',
	AZ: '#FFD54F',
	AR: '#81C784',
	CA: '#BA68C8',
	CO: '#4DD0E1',
	CT: '#FF8A65',
	DE: '#A1887F',
	FL: '#4DB6AC',
	GA: '#7986CB',
	HI: '#F06292',
	ID: '#AED581',
	IL: '#FFB74D',
	IN: '#90A4AE',
	IA: '#DCE775',
	KS: '#FFF176',
	KY: '#4FC3F7',
	LA: '#CE93D8',
	ME: '#80CBC4',
	MD: '#FFCC80',
	MA: '#B39DDB',
	MI: '#80DEEA',
	MN: '#C5E1A5',
	MS: '#EF9A9A',
	MO: '#BCAAA4',
	MT: '#B0BEC5',
	NE: '#E6EE9C',
	NV: '#FFE082',
	NH: '#81D4FA',
	NJ: '#F48FB1',
	NM: '#FFAB91',
	NY: '#9FA8DA',
	NC: '#A5D6A7',
	ND: '#CFD8DC',
	OH: '#FFF59D',
	OK: '#FF8A80',
	OR: '#80CBC4',
	PA: '#EA80FC',
	RI: '#8C9EFF',
	SC: '#FFCDD2',
	SD: '#E1BEE7',
	TN: '#DCEDC8',
	TX: '#FFE0B2',
	UT: '#B2EBF2',
	VT: '#C8E6C9',
	VA: '#D1C4E9',
	WA: '#B2DFDB',
	WV: '#FFE57F',
	WI: '#F8BBD9',
	WY: '#FFCCBC',
	DC: '#E0E0E0',
};

// Helper to get state abbreviation
const getStateAbbreviation = (state: string): string | null => {
	if (!state) return null;
	const upper = state.toUpperCase().trim();
	if (upper.length === 2 && stateBadgeColorMap[upper]) return upper;
	const stateMap: Record<string, string> = {
		ALABAMA: 'AL',
		ALASKA: 'AK',
		ARIZONA: 'AZ',
		ARKANSAS: 'AR',
		CALIFORNIA: 'CA',
		COLORADO: 'CO',
		CONNECTICUT: 'CT',
		DELAWARE: 'DE',
		FLORIDA: 'FL',
		GEORGIA: 'GA',
		HAWAII: 'HI',
		IDAHO: 'ID',
		ILLINOIS: 'IL',
		INDIANA: 'IN',
		IOWA: 'IA',
		KANSAS: 'KS',
		KENTUCKY: 'KY',
		LOUISIANA: 'LA',
		MAINE: 'ME',
		MARYLAND: 'MD',
		MASSACHUSETTS: 'MA',
		MICHIGAN: 'MI',
		MINNESOTA: 'MN',
		MISSISSIPPI: 'MS',
		MISSOURI: 'MO',
		MONTANA: 'MT',
		NEBRASKA: 'NE',
		NEVADA: 'NV',
		'NEW HAMPSHIRE': 'NH',
		'NEW JERSEY': 'NJ',
		'NEW MEXICO': 'NM',
		'NEW YORK': 'NY',
		'NORTH CAROLINA': 'NC',
		'NORTH DAKOTA': 'ND',
		OHIO: 'OH',
		OKLAHOMA: 'OK',
		OREGON: 'OR',
		PENNSYLVANIA: 'PA',
		'RHODE ISLAND': 'RI',
		'SOUTH CAROLINA': 'SC',
		'SOUTH DAKOTA': 'SD',
		TENNESSEE: 'TN',
		TEXAS: 'TX',
		UTAH: 'UT',
		VERMONT: 'VT',
		VIRGINIA: 'VA',
		WASHINGTON: 'WA',
		'WEST VIRGINIA': 'WV',
		WISCONSIN: 'WI',
		WYOMING: 'WY',
		'DISTRICT OF COLUMBIA': 'DC',
	};
	return stateMap[upper] || null;
};

// Parse metadata sections [1], [2], etc.
// Returns sections if at least 1 valid section exists (more lenient than dashboard's 3)
const parseMetadataSections = (
	metadata: string | null | undefined
): Record<string, string> => {
	if (!metadata) return {};
	const allSections: Record<string, string> = {};
	const regex = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
	let match;
	while ((match = regex.exec(metadata)) !== null) {
		allSections[match[1]] = match[2].trim();
	}
	const sections: Record<string, string> = {};
	let expectedNum = 1;
	while (allSections[String(expectedNum)]) {
		const content = allSections[String(expectedNum)];
		const meaningfulContent = content.replace(/[.\s,;:!?'"()\-–—]/g, '').trim();
		if (meaningfulContent.length < 5) break;
		sections[String(expectedNum)] = content;
		expectedNum++;
	}
	// Return sections if we have at least 1 valid section
	return Object.keys(sections).length >= 1 ? sections : {};
};

interface SearchResultsMapProps {
	contacts: ContactWithName[];
	selectedContacts: number[];
	onMarkerClick?: (contact: ContactWithName) => void;
	onToggleSelection?: (contactId: number) => void;
	onStateSelect?: (stateName: string) => void;
	enableStateInteractions?: boolean;
	lockedStateName?: string | null;
}

const mapContainerStyle = {
	width: '100%',
	height: '100%',
};

const defaultCenter = {
	lat: 39.8283, // Center of US
	lng: -98.5795,
};

const mapOptions: google.maps.MapOptions = {
	disableDefaultUI: false,
	zoomControl: true,
	streetViewControl: false,
	mapTypeControl: false,
	fullscreenControl: false,
	gestureHandling: 'greedy',
	styles: [
		{
			featureType: 'poi',
			elementType: 'labels',
			stylers: [{ visibility: 'off' }],
		},
		{
			featureType: 'transit',
			elementType: 'labels',
			stylers: [{ visibility: 'off' }],
		},
	],
};

const STATE_GEOJSON_URL = 'https://storage.googleapis.com/mapsdevsite/json/states.js';
const STATE_HIGHLIGHT_COLOR = '#5DAB68';
const STATE_HIGHLIGHT_OPACITY = 0.68;
const STATE_BORDER_COLOR = '#CFD8DC';

const normalizeStateKey = (state?: string | null): string | null => {
	if (!state) return null;
	const abbr = getStateAbbreviation(state);
	if (abbr) return abbr;
	return state.trim().toUpperCase();
};

export const SearchResultsMap: FC<SearchResultsMapProps> = ({
	contacts,
	selectedContacts,
	onMarkerClick,
	onToggleSelection,
	onStateSelect,
	enableStateInteractions,
	lockedStateName,
}) => {
	const [selectedMarker, setSelectedMarker] = useState<ContactWithName | null>(null);
	const [hoveredMarkerId, setHoveredMarkerId] = useState<number | null>(null);
	const [map, setMap] = useState<google.maps.Map | null>(null);
	const [selectedStateKey, setSelectedStateKey] = useState<string | null>(null);
	// Timeout ref for auto-hiding research panel
	const researchPanelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const stateLayerRef = useRef<google.maps.Data | null>(null);
	const selectedStateKeyRef = useRef<string | null>(null);
	const onStateSelectRef = useRef<SearchResultsMapProps['onStateSelect'] | null>(null);
	const [isStateLayerReady, setIsStateLayerReady] = useState(false);

	useEffect(() => {
		selectedStateKeyRef.current = selectedStateKey;
	}, [selectedStateKey]);

	useEffect(() => {
		onStateSelectRef.current = onStateSelect ?? null;
	}, [onStateSelect]);

	useEffect(() => {
		if (lockedStateName === undefined) return;
		const nextKey = normalizeStateKey(lockedStateName);
		setSelectedStateKey(nextKey);
	}, [lockedStateName]);

	// Clear timeout when panel is closed or component unmounts
	useEffect(() => {
		return () => {
			if (researchPanelTimeoutRef.current) {
				clearTimeout(researchPanelTimeoutRef.current);
			}
		};
	}, []);

	// Load US state shapes and handle hover/click highlighting for this Search view
	useEffect(() => {
		if (!map || !enableStateInteractions) return;

		const dataLayer = new google.maps.Data({ map });
		stateLayerRef.current = dataLayer;
		setIsStateLayerReady(true);

		dataLayer.setStyle({
			fillOpacity: 0,
			strokeColor: STATE_BORDER_COLOR,
			strokeOpacity: 0.7,
			strokeWeight: 0.6,
			zIndex: 0,
		});

		dataLayer.loadGeoJson(STATE_GEOJSON_URL, { idPropertyName: 'NAME' });

		const mouseoverListener = dataLayer.addListener(
			'mouseover',
			(event: google.maps.Data.MouseEvent) => {
				const hoveredKey = normalizeStateKey(
					(event.feature.getProperty('NAME') as string) ||
						(event.feature.getId() as string)
				);
				if (hoveredKey && hoveredKey === selectedStateKeyRef.current) {
					return;
				}
				dataLayer.overrideStyle(event.feature, {
					fillColor: STATE_HIGHLIGHT_COLOR,
					fillOpacity: STATE_HIGHLIGHT_OPACITY,
					strokeColor: STATE_HIGHLIGHT_COLOR,
					strokeOpacity: 1,
					strokeWeight: 1.2,
				});
			}
		);

		const mouseoutListener = dataLayer.addListener(
			'mouseout',
			(event: google.maps.Data.MouseEvent) => {
				dataLayer.revertStyle(event.feature);
			}
		);

		const clickListener = dataLayer.addListener(
			'click',
			(event: google.maps.Data.MouseEvent) => {
				const stateName = (event.feature.getProperty('NAME') as string) || '';
				const normalizedKey =
					normalizeStateKey(stateName) ||
					normalizeStateKey((event.feature.getId() as string) || undefined);
				setSelectedStateKey(normalizedKey);
				if (stateName) {
					onStateSelectRef.current?.(stateName);
				}
			}
		);

		return () => {
			mouseoverListener.remove();
			mouseoutListener.remove();
			clickListener.remove();
			dataLayer.setMap(null);
			stateLayerRef.current = null;
			setIsStateLayerReady(false);
			setSelectedStateKey(null);
		};
	}, [map, enableStateInteractions]);

	// Update stroke styling when the selected state changes
	useEffect(() => {
		if (!enableStateInteractions || !isStateLayerReady) return;
		const dataLayer = stateLayerRef.current;
		if (!dataLayer) return;

		dataLayer.setStyle((feature) => {
			const featureKey = normalizeStateKey(
				(feature.getProperty('NAME') as string) || (feature.getId() as string)
			);
			const isSelected = featureKey && featureKey === selectedStateKey;
			return {
				fillOpacity: 0,
				strokeColor: isSelected ? '#000000' : STATE_BORDER_COLOR,
				strokeOpacity: isSelected ? 1 : 0.7,
				strokeWeight: isSelected ? 2 : 0.6,
				zIndex: 0,
			};
		});
	}, [selectedStateKey, enableStateInteractions, isStateLayerReady]);

	const handleResearchPanelMouseEnter = useCallback(() => {
		if (researchPanelTimeoutRef.current) {
			clearTimeout(researchPanelTimeoutRef.current);
			researchPanelTimeoutRef.current = null;
		}
	}, []);

	const handleResearchPanelMouseLeave = useCallback(() => {
		researchPanelTimeoutRef.current = setTimeout(() => {
			setSelectedMarker(null);
		}, 5000);
	}, []);

	const { isLoaded, loadError } = useJsApiLoader({
		googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
	});

	// Compute valid coords once and keep a per-contact lookup for stable rendering.
	// Also apply a small deterministic offset for duplicate coordinate groups so every result is visible.
	const { contactsWithCoords, coordsByContactId } = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		for (const contact of contacts) {
			const coords = getLatLngFromContact(contact);
			if (!coords) continue;
			coordsByContactId.set(contact.id, coords);
			contactsWithCoords.push(contact);
			const key = coordinateKey(coords);
			const existing = groups.get(key);
			if (existing) existing.push(contact.id);
			else groups.set(key, [contact.id]);
		}

		// Offset duplicates (keep the smallest id at the true coordinate for accuracy)
		for (const ids of groups.values()) {
			if (ids.length <= 1) continue;
			ids.sort((a, b) => a - b);
			for (let i = 1; i < ids.length; i++) {
				const id = ids[i];
				const base = coordsByContactId.get(id);
				if (!base) continue;
				coordsByContactId.set(id, jitterDuplicateCoords(base, i));
			}
		}

		return { contactsWithCoords, coordsByContactId };
	}, [contacts]);

	// Helper to get coordinates for a contact (stable + already-parsed)
	const getContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null => coordsByContactId.get(contact.id) ?? null,
		[coordsByContactId]
	);

	// Track if we've done the initial bounds fit
	const hasFitBoundsRef = useRef(false);
	// Track the last contacts count to detect when results change
	const lastContactsCountRef = useRef(0);
	// Track first contact ID to detect when search results have changed
	const lastFirstContactIdRef = useRef<number | null>(null);

	// Helper to fit map bounds with padding
	const fitMapToBounds = useCallback(
		(mapInstance: google.maps.Map, contactsList: ContactWithName[]) => {
			if (contactsList.length === 0) return;

			const bounds = new google.maps.LatLngBounds();
			let hasValidCoords = false;

			contactsList.forEach((contact) => {
				const coords = getContactCoords(contact);
				if (coords) {
					bounds.extend(coords);
					hasValidCoords = true;
				}
			});

			if (!hasValidCoords) return;

			// Fit bounds with padding
			mapInstance.fitBounds(bounds, {
				top: 50,
				right: 50,
				bottom: 50,
				left: 50,
			});

			// Prevent too much zoom on single marker or very close markers
			const listener = google.maps.event.addListener(mapInstance, 'idle', () => {
				const currentZoom = mapInstance.getZoom();
				if (currentZoom && currentZoom > 14) {
					mapInstance.setZoom(14);
				}
				google.maps.event.removeListener(listener);
			});
		},
		[getContactCoords]
	);

	const onLoad = useCallback(
		(mapInstance: google.maps.Map) => {
			setMap(mapInstance);

			// Fit bounds on initial load if we have contacts
			if (contactsWithCoords.length > 0) {
				fitMapToBounds(mapInstance, contactsWithCoords);
				hasFitBoundsRef.current = true;
				lastContactsCountRef.current = contactsWithCoords.length;
				lastFirstContactIdRef.current = contactsWithCoords[0]?.id ?? null;
			}
		},
		[contactsWithCoords, fitMapToBounds]
	);

	const onUnmount = useCallback(() => {
		setMap(null);
		hasFitBoundsRef.current = false;
		lastContactsCountRef.current = 0;
		lastFirstContactIdRef.current = null;
	}, []);

	// Fit bounds when contacts with coordinates change
	useEffect(() => {
		if (!map || contactsWithCoords.length === 0) return;

		// Check if this is a new set of search results by comparing the first contact ID
		const currentFirstId = contactsWithCoords[0]?.id ?? null;
		const isNewSearch = currentFirstId !== lastFirstContactIdRef.current;

		// Fit bounds if:
		// 1. We haven't fit bounds yet (initial load after geocoding)
		// 2. This is a completely new search (first contact ID changed)
		// 3. The number of contacts with coords has increased (more were geocoded)
		// 4. The contacts list changed significantly (new search)
		const shouldFitBounds =
			!hasFitBoundsRef.current ||
			isNewSearch ||
			contactsWithCoords.length > lastContactsCountRef.current ||
			Math.abs(contactsWithCoords.length - lastContactsCountRef.current) > 5;

		if (shouldFitBounds) {
			fitMapToBounds(map, contactsWithCoords);
			hasFitBoundsRef.current = true;
			lastContactsCountRef.current = contactsWithCoords.length;
			lastFirstContactIdRef.current = currentFirstId;
		}
	}, [map, contactsWithCoords, fitMapToBounds]);

	// Reset bounds tracking when contacts prop is empty (preparing for new search)
	useEffect(() => {
		if (contacts.length === 0) {
			hasFitBoundsRef.current = false;
			lastContactsCountRef.current = 0;
			lastFirstContactIdRef.current = null;
		}
	}, [contacts]);

	const handleMarkerClick = (contact: ContactWithName) => {
		setSelectedMarker(contact);
		onMarkerClick?.(contact);
		// Toggle selection when clicking on a marker
		onToggleSelection?.(contact.id);
	};

	// Default red dot marker
	const defaultMarkerIcon = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: '#D21E1F',
			fillOpacity: 1,
			strokeColor: '#FFFFFF',
			strokeWeight: 3,
			scale: 8,
		};
	}, [isLoaded]);

	// Selected green dot marker
	const selectedMarkerIcon = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: '#0E8530',
			fillOpacity: 1,
			strokeColor: '#FFFFFF',
			strokeWeight: 3,
			scale: 8,
		};
	}, [isLoaded]);

	// Invisible larger marker for hover hit area
	const invisibleHitAreaIcon = useMemo(() => {
		if (!isLoaded) return undefined;
		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor: 'transparent',
			fillOpacity: 0,
			strokeColor: 'transparent',
			strokeWeight: 0,
			scale: 16, // Larger than visible dot (8) for easier hover
		};
	}, [isLoaded]);

	// Generate hover tooltip icon with contact name and company
	const getHoverMarkerIcon = useCallback(
		(contact: ContactWithName) => {
			if (!isLoaded) return undefined;

			// Get name - use firstName/lastName, fall back to name field
			const name =
				`${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
				contact.name ||
				'';
			const company = contact.company || '';
			const width = calculateTooltipWidth(name, company);

			return {
				url: generateMapTooltipIconUrl(name, company),
				scaledSize: new google.maps.Size(width, MAP_TOOLTIP_HEIGHT),
				anchor: new google.maps.Point(MAP_TOOLTIP_ANCHOR_X, MAP_TOOLTIP_ANCHOR_Y),
			};
		},
		[isLoaded]
	);

	// Compute initial center based on contacts (if available)
	// Must be before early returns to satisfy React hooks rules
	const initialCenter = useMemo(() => {
		if (contactsWithCoords.length === 0) return defaultCenter;

		// Calculate centroid of all contact coordinates
		let sumLat = 0;
		let sumLng = 0;
		let count = 0;

		contactsWithCoords.forEach((contact) => {
			const coords = getContactCoords(contact);
			if (coords) {
				sumLat += coords.lat;
				sumLng += coords.lng;
				count++;
			}
		});

		if (count === 0) return defaultCenter;

		return {
			lat: sumLat / count,
			lng: sumLng / count,
		};
	}, [contactsWithCoords, getContactCoords]);

	if (loadError) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
				<p className="text-gray-500">Error loading map</p>
			</div>
		);
	}

	if (!isLoaded) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
			</div>
		);
	}

	// Get position for selected marker
	const selectedMarkerCoords = selectedMarker ? getContactCoords(selectedMarker) : null;

	return (
		<GoogleMap
			mapContainerStyle={mapContainerStyle}
			center={initialCenter}
			zoom={contactsWithCoords.length > 0 ? 10 : 4}
			onLoad={onLoad}
			onUnmount={onUnmount}
			options={mapOptions}
			onClick={() => setSelectedMarker(null)}
		>
			{contactsWithCoords.map((contact) => {
				const coords = getContactCoords(contact);
				if (!coords) return null;
				const isHovered = hoveredMarkerId === contact.id;
				const isSelected = selectedContacts.includes(contact.id);
				return (
					<Fragment key={contact.id}>
						{/* Invisible larger hit area for hover detection - this controls all hover state */}
						<MarkerF
							position={coords}
							icon={invisibleHitAreaIcon}
							onMouseOver={() => setHoveredMarkerId(contact.id)}
							onMouseOut={() => setHoveredMarkerId(null)}
							onClick={() => handleMarkerClick(contact)}
							clickable={true}
							zIndex={3}
						/>
						{/* Dot marker - only when NOT hovered, green if selected, red if not */}
						{!isHovered && (
							<MarkerF
								position={coords}
								onClick={() => handleMarkerClick(contact)}
								icon={isSelected ? selectedMarkerIcon : defaultMarkerIcon}
								clickable={false}
								zIndex={1}
							/>
						)}
						{/* Hover tooltip - only when hovered */}
						{isHovered && (
							<MarkerF
								position={coords}
								onClick={() => handleMarkerClick(contact)}
								icon={getHoverMarkerIcon(contact)}
								clickable={false}
								zIndex={2}
							/>
						)}
					</Fragment>
				);
			})}

			{selectedMarker && selectedMarkerCoords && (
				<OverlayView
					position={selectedMarkerCoords}
					mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
					getPixelPositionOffset={(width, height) => ({
						x: -(width / 2),
						y: -height - 20,
					})}
				>
					<div
						className="relative"
						style={{
							width: '320px',
							backgroundColor: 'rgba(216, 229, 251, 0.8)',
							border: '2px solid black',
							borderRadius: '7px',
							overflow: 'hidden',
							boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
						}}
						onMouseEnter={handleResearchPanelMouseEnter}
						onMouseLeave={handleResearchPanelMouseLeave}
					>
						{/* Close button */}
						<button
							onClick={() => setSelectedMarker(null)}
							className="absolute top-[10px] -translate-y-1/2 right-2 z-20 flex items-center justify-center text-black/60 hover:text-black transition-colors"
							style={{ fontSize: '14px', lineHeight: 1, fontWeight: 500 }}
						>
							×
						</button>
						{/* Header */}
						<div
							className="w-full"
							style={{ height: '20px', backgroundColor: 'rgba(232, 239, 255, 0.8)' }}
						/>
						<div className="absolute top-[10px] left-[12px] -translate-y-1/2 z-10">
							<span className="font-bold text-[12px] leading-none text-black">
								Research
							</span>
						</div>
						<div
							className="absolute left-0 w-full bg-black z-10"
							style={{ top: '20px', height: '2px' }}
						/>
						{/* Name/Company section */}
						<div className="w-full bg-white" style={{ height: '36px', marginTop: '2px' }}>
							<div className="w-full h-full px-3 flex items-center justify-between overflow-hidden">
								<div className="flex flex-col justify-center min-w-0 flex-1 pr-2">
									<div className="font-inter font-bold text-[13px] leading-none truncate text-black">
										{(() => {
											const fullName = `${selectedMarker.firstName || ''} ${
												selectedMarker.lastName || ''
											}`.trim();
											return (
												fullName ||
												selectedMarker.name ||
												selectedMarker.company ||
												'Unknown'
											);
										})()}
									</div>
									{(() => {
										const fullName = `${selectedMarker.firstName || ''} ${
											selectedMarker.lastName || ''
										}`.trim();
										const hasName =
											fullName.length > 0 ||
											(selectedMarker.name && selectedMarker.name.length > 0);
										if (!hasName) return null;
										return (
											<div className="text-[11px] leading-tight truncate text-black mt-[2px]">
												{selectedMarker.company || ''}
											</div>
										);
									})()}
								</div>
								<div className="flex items-center gap-2 flex-shrink-0">
									<div className="flex flex-col items-end gap-[2px] max-w-[120px]">
										<div className="flex items-center gap-1 w-full justify-end overflow-hidden">
											{(() => {
												const stateAbbr =
													getStateAbbreviation(selectedMarker.state || '') || '';
												if (stateAbbr && stateBadgeColorMap[stateAbbr]) {
													return (
														<span
															className="inline-flex items-center justify-center h-[14px] px-[5px] rounded-[3px] border border-black text-[10px] font-bold leading-none flex-shrink-0"
															style={{ backgroundColor: stateBadgeColorMap[stateAbbr] }}
														>
															{stateAbbr}
														</span>
													);
												}
												return null;
											})()}
											{selectedMarker.city && (
												<span className="text-[11px] leading-none text-black truncate">
													{selectedMarker.city}
												</span>
											)}
										</div>
										{(selectedMarker.title || selectedMarker.headline) && (
											<div className="px-1.5 py-[1px] rounded-[6px] bg-[#E8EFFF] border border-black max-w-full truncate">
												<span className="text-[9px] leading-none text-black block truncate">
													{selectedMarker.title || selectedMarker.headline}
												</span>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
						<div
							className="absolute left-0 w-full bg-black z-10"
							style={{ top: '58px', height: '1px' }}
						/>
						{/* Research boxes */}
						{(() => {
							// Debug: log the metadata to console
							console.log('Contact metadata:', {
								id: selectedMarker.id,
								metadata: selectedMarker.metadata,
								hasMetadata: !!selectedMarker.metadata,
							});

							const metadataSections = parseMetadataSections(selectedMarker.metadata);
							const boxConfigs = [
								{ key: '1', color: 'rgba(21, 139, 207, 0.8)' },
								{ key: '2', color: 'rgba(67, 174, 236, 0.8)' },
								{ key: '3', color: 'rgba(124, 201, 246, 0.8)' },
								{ key: '4', color: 'rgba(170, 218, 246, 0.8)' },
							];
							const visibleBoxes = boxConfigs.filter(
								(config) => metadataSections[config.key]
							);

							// If no parsed sections but raw metadata exists, show raw metadata
							if (visibleBoxes.length === 0) {
								if (
									selectedMarker.metadata &&
									selectedMarker.metadata.trim().length > 0
								) {
									// Show raw metadata in a single box if it doesn't match [1], [2] format
									return (
										<div className="p-2">
											<div
												id="map-research-scroll-container"
												className="relative"
												style={{
													width: '100%',
													minHeight: '60px',
													backgroundColor: 'rgba(21, 139, 207, 0.8)',
													border: '2px solid #000000',
													borderRadius: '6px',
												}}
											>
												<style>{`
													#map-research-scroll-container *::-webkit-scrollbar {
														display: none !important;
														width: 0 !important;
														height: 0 !important;
													}
													#map-research-scroll-container * {
														scrollbar-width: none !important;
														-ms-overflow-style: none !important;
													}
												`}</style>
												<div
													className="absolute"
													style={{
														top: '4px',
														bottom: '4px',
														left: '6px',
														right: '6px',
														backgroundColor: '#FFFFFF',
														border: '1px solid #000000',
														borderRadius: '4px',
														overflow: 'hidden',
													}}
												>
													<CustomScrollbar
														className="w-full h-full"
														thumbWidth={2}
														thumbColor="#000000"
														offsetRight={-14}
														contentClassName="scrollbar-hide"
													>
														<div className="px-2 py-1">
															<div className="w-full text-[10px] leading-[1.3] text-black font-inter">
																{selectedMarker.metadata}
															</div>
														</div>
													</CustomScrollbar>
												</div>
											</div>
										</div>
									);
								}
								return (
									<div className="px-3 py-4 text-center text-[11px] text-gray-500 italic">
										No research data available for this contact
									</div>
								);
							}

							return (
								<div className="p-2 flex flex-col gap-2">
									{visibleBoxes.map((config) => (
										<div
											key={config.key}
											className="relative"
											style={{
												width: '100%',
												minHeight: '44px',
												backgroundColor: config.color,
												border: '2px solid #000000',
												borderRadius: '6px',
											}}
										>
											<div
												className="absolute font-inter font-bold"
												style={{
													top: '4px',
													left: '6px',
													fontSize: '10px',
													color: '#000000',
												}}
											>
												[{config.key}]
											</div>
											<div
												className="absolute overflow-hidden"
												style={{
													top: '50%',
													transform: 'translateY(-50%)',
													right: '6px',
													width: 'calc(100% - 36px)',
													minHeight: '36px',
													maxHeight: '36px',
													backgroundColor: '#FFFFFF',
													border: '1px solid #000000',
													borderRadius: '4px',
												}}
											>
												<div className="w-full h-full px-2 flex items-center overflow-hidden">
													<div
														className="w-full text-[10px] leading-[1.3] text-black font-inter"
														style={{
															display: '-webkit-box',
															WebkitLineClamp: 2,
															WebkitBoxOrient: 'vertical',
															overflow: 'hidden',
														}}
													>
														{metadataSections[config.key]}
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							);
						})()}
						{/* Pointer triangle */}
						<div
							className="absolute left-1/2 -translate-x-1/2"
							style={{
								bottom: '-10px',
								width: 0,
								height: 0,
								borderLeft: '10px solid transparent',
								borderRight: '10px solid transparent',
								borderTop: '10px solid #D8E5FB',
							}}
						/>
						<div
							className="absolute left-1/2 -translate-x-1/2"
							style={{
								bottom: '-14px',
								width: 0,
								height: 0,
								borderLeft: '12px solid transparent',
								borderRight: '12px solid transparent',
								borderTop: '12px solid black',
								zIndex: -1,
							}}
						/>
					</div>
				</OverlayView>
			)}

		</GoogleMap>
	);
};

export default SearchResultsMap;
