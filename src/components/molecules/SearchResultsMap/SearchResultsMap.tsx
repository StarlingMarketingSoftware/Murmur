'use client';

import { FC, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, OverlayView } from '@react-google-maps/api';
import { ContactWithName } from '@/types/contact';
import { useGeocodeContacts } from '@/hooks/queryHooks/useContacts';
import {
	generateMapTooltipIconUrl,
	calculateTooltipWidth,
	MAP_TOOLTIP_HEIGHT,
	MAP_TOOLTIP_ANCHOR_X,
	MAP_TOOLTIP_ANCHOR_Y,
} from '@/components/atoms/_svg/MapTooltipIcon';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

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

export const SearchResultsMap: FC<SearchResultsMapProps> = ({
	contacts,
	selectedContacts,
	onMarkerClick,
	onToggleSelection,
	onStateSelect,
	enableStateInteractions,
}) => {
	const [selectedMarker, setSelectedMarker] = useState<ContactWithName | null>(null);
	const [hoveredMarkerId, setHoveredMarkerId] = useState<number | null>(null);
	const [map, setMap] = useState<google.maps.Map | null>(null);
	const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
	// Local state for newly geocoded coordinates (updates before query refetch)
	const [geocodedCoords, setGeocodedCoords] = useState<
		Map<number, { lat: number; lng: number }>
	>(new Map());
	const geocodedIdsRef = useRef<Set<number>>(new Set());
	// Timeout ref for auto-hiding research panel
	const researchPanelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const stateLayerRef = useRef<google.maps.Data | null>(null);

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
				const featureId = (event.feature.getId() as string) || stateName || null;
				setSelectedStateId(featureId);
				if (stateName) {
					onStateSelect?.(stateName);
				}
			}
		);

		return () => {
			mouseoverListener.remove();
			mouseoutListener.remove();
			clickListener.remove();
			dataLayer.setMap(null);
			stateLayerRef.current = null;
			setSelectedStateId(null);
		};
	}, [map, enableStateInteractions, onStateSelect]);

	// Update stroke styling when the selected state changes
	useEffect(() => {
		if (!enableStateInteractions) return;
		const dataLayer = stateLayerRef.current;
		if (!dataLayer) return;

		dataLayer.setStyle((feature) => {
			const isSelected = feature.getId() === selectedStateId;
			return {
				fillOpacity: 0,
				strokeColor: isSelected ? '#000000' : STATE_BORDER_COLOR,
				strokeOpacity: isSelected ? 1 : 0.7,
				strokeWeight: isSelected ? 2 : 0.6,
				zIndex: 0,
			};
		});
	}, [selectedStateId, enableStateInteractions]);

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

	const { mutate: geocodeContacts, isPending: isGeocoding } = useGeocodeContacts({
		suppressToasts: true,
	});

	// Handle geocode results - wrapped in a callback so we can call mutate with onSuccess
	const handleGeocode = useCallback(
		(contactIds: number[]) => {
			geocodeContacts(contactIds, {
				onSuccess: (data) => {
					// Update local state immediately with geocoded coordinates
					if (data.geocoded && data.geocoded.length > 0) {
						setGeocodedCoords((prev) => {
							const newMap = new Map(prev);
							for (const item of data.geocoded) {
								newMap.set(item.id, { lat: item.latitude, lng: item.longitude });
								geocodedIdsRef.current.add(item.id);
							}
							return newMap;
						});
					}
					// Mark failed geocodes so we don't retry them
					if (data.errors && data.errors.length > 0) {
						for (const err of data.errors) {
							geocodedIdsRef.current.add(err.id);
						}
					}
				},
			});
		},
		[geocodeContacts]
	);

	// Find contacts that need geocoding (have address info but no coordinates)
	const contactsNeedingGeocode = useMemo(() => {
		return contacts.filter(
			(contact) =>
				(contact.latitude == null || contact.longitude == null) &&
				(contact.city || contact.state || contact.address) &&
				!geocodedIdsRef.current.has(contact.id)
		);
	}, [contacts]);

	// Trigger geocoding for contacts without coordinates
	useEffect(() => {
		if (contactsNeedingGeocode.length > 0 && !isGeocoding) {
			// Geocode up to 25 contacts at a time
			const idsToGeocode = contactsNeedingGeocode.slice(0, 25).map((c) => c.id);
			handleGeocode(idsToGeocode);
		}
	}, [contactsNeedingGeocode, isGeocoding, handleGeocode]);

	// Filter contacts that have valid coordinates (from DB or freshly geocoded)
	const contactsWithCoords = useMemo(() => {
		return contacts.filter((contact) => {
			// Check if contact has coordinates from DB
			const hasDbCoords =
				contact.latitude != null &&
				contact.longitude != null &&
				!isNaN(contact.latitude) &&
				!isNaN(contact.longitude);
			// Check if we have freshly geocoded coordinates
			const hasGeocodedCoords = geocodedCoords.has(contact.id);
			return hasDbCoords || hasGeocodedCoords;
		});
	}, [contacts, geocodedCoords]);

	// Helper to get coordinates for a contact (DB or geocoded)
	const getContactCoords = useCallback(
		(contact: ContactWithName): { lat: number; lng: number } | null => {
			// Prefer DB coordinates
			if (
				contact.latitude != null &&
				contact.longitude != null &&
				!isNaN(contact.latitude) &&
				!isNaN(contact.longitude)
			) {
				return { lat: contact.latitude, lng: contact.longitude };
			}
			// Fall back to geocoded coordinates
			return geocodedCoords.get(contact.id) || null;
		},
		[geocodedCoords]
	);

	// Track if we've done the initial bounds fit
	const hasFitBoundsRef = useRef(false);
	// Track the last contacts count to detect when results change
	const lastContactsCountRef = useRef(0);

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
			}
		},
		[contactsWithCoords, fitMapToBounds]
	);

	const onUnmount = useCallback(() => {
		setMap(null);
		hasFitBoundsRef.current = false;
		lastContactsCountRef.current = 0;
	}, []);

	// Fit bounds when contacts with coordinates change
	useEffect(() => {
		if (!map || contactsWithCoords.length === 0) return;

		// Fit bounds if:
		// 1. We haven't fit bounds yet (initial load after geocoding)
		// 2. The number of contacts with coords has increased (more were geocoded)
		// 3. The contacts list changed significantly (new search)
		const shouldFitBounds =
			!hasFitBoundsRef.current ||
			contactsWithCoords.length > lastContactsCountRef.current ||
			Math.abs(contactsWithCoords.length - lastContactsCountRef.current) > 5;

		if (shouldFitBounds) {
			fitMapToBounds(map, contactsWithCoords);
			hasFitBoundsRef.current = true;
			lastContactsCountRef.current = contactsWithCoords.length;
		}
	}, [map, contactsWithCoords, fitMapToBounds]);

	// Reset bounds tracking when contacts prop changes significantly (new search)
	useEffect(() => {
		const previousCount = lastContactsCountRef.current;

		// If the contact IDs are completely different, reset the tracking
		if (previousCount > 0 && contactsWithCoords.length === 0) {
			hasFitBoundsRef.current = false;
			lastContactsCountRef.current = 0;
		}
	}, [contacts, contactsWithCoords.length]);

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

			{/* Geocoding indicator */}
			{isGeocoding && contactsNeedingGeocode.length > 0 && (
				<div className="absolute bottom-2 left-2 bg-white/90 px-3 py-1.5 rounded-full shadow-md text-xs text-gray-600 flex items-center gap-2">
					<div className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full" />
					Locating contacts...
				</div>
			)}
		</GoogleMap>
	);
};

export default SearchResultsMap;
