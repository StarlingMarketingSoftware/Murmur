'use client';

import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { ContactWithName } from '@/types/contact';
import { useGeocodeContacts } from '@/hooks/queryHooks/useContacts';

interface SearchResultsMapProps {
	contacts: ContactWithName[];
	selectedContacts: number[];
	onMarkerClick?: (contact: ContactWithName) => void;
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

export const SearchResultsMap: FC<SearchResultsMapProps> = ({
	contacts,
	selectedContacts,
	onMarkerClick,
}) => {
	const [selectedMarker, setSelectedMarker] = useState<ContactWithName | null>(null);
	const [map, setMap] = useState<google.maps.Map | null>(null);
	// Local state for newly geocoded coordinates (updates before query refetch)
	const [geocodedCoords, setGeocodedCoords] = useState<
		Map<number, { lat: number; lng: number }>
	>(new Map());
	const geocodedIdsRef = useRef<Set<number>>(new Set());

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

	const onLoad = useCallback(
		(map: google.maps.Map) => {
			setMap(map);

			// Calculate and fit bounds when map loads
			if (contactsWithCoords.length > 0) {
				const bounds = new google.maps.LatLngBounds();
				contactsWithCoords.forEach((contact) => {
					const coords = getContactCoords(contact);
					if (coords) {
						bounds.extend(coords);
					}
				});

				map.fitBounds(bounds);
				// Prevent too much zoom on single marker
				const listener = google.maps.event.addListener(map, 'idle', () => {
					const currentZoom = map.getZoom();
					if (currentZoom && currentZoom > 12) {
						map.setZoom(12);
					}
					google.maps.event.removeListener(listener);
				});
			}
		},
		[contactsWithCoords, getContactCoords]
	);

	const onUnmount = useCallback(() => {
		setMap(null);
	}, []);

	// Refit bounds when geocoded coordinates change
	useEffect(() => {
		if (map && geocodedCoords.size > 0 && contactsWithCoords.length > 0) {
			const bounds = new google.maps.LatLngBounds();
			contactsWithCoords.forEach((contact) => {
				const coords = getContactCoords(contact);
				if (coords) {
					bounds.extend(coords);
				}
			});
			map.fitBounds(bounds);
		}
	}, [map, geocodedCoords.size, contactsWithCoords, getContactCoords]);

	const handleMarkerClick = (contact: ContactWithName) => {
		setSelectedMarker(contact);
		onMarkerClick?.(contact);
	};

	const getMarkerIcon = (contact: ContactWithName, isSelected: boolean) => {
		const isContactSelected = selectedContacts.includes(contact.id);

		// Selected contacts get green, unselected get gray
		const fillColor = isContactSelected ? '#5DAB68' : '#9CA3AF';
		const strokeColor = isSelected
			? '#000000'
			: isContactSelected
			? '#3d8b4a'
			: '#6B7280';
		const scale = isSelected ? 1.3 : 1;

		return {
			path: google.maps.SymbolPath.CIRCLE,
			fillColor,
			fillOpacity: 1,
			strokeColor,
			strokeWeight: isSelected ? 3 : 2,
			scale: 8 * scale,
		};
	};

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
			center={defaultCenter}
			zoom={4}
			onLoad={onLoad}
			onUnmount={onUnmount}
			options={mapOptions}
			onClick={() => setSelectedMarker(null)}
		>
			{contactsWithCoords.map((contact) => {
				const coords = getContactCoords(contact);
				if (!coords) return null;
				return (
					<MarkerF
						key={contact.id}
						position={coords}
						onClick={() => handleMarkerClick(contact)}
						icon={getMarkerIcon(contact, selectedMarker?.id === contact.id)}
					/>
				);
			})}

			{selectedMarker && selectedMarkerCoords && (
				<InfoWindowF
					position={selectedMarkerCoords}
					onCloseClick={() => setSelectedMarker(null)}
				>
					<div className="p-2 max-w-[200px]">
						<div className="font-bold text-sm text-black">
							{`${selectedMarker.firstName || ''} ${
								selectedMarker.lastName || ''
							}`.trim() ||
								selectedMarker.name ||
								selectedMarker.company ||
								'Unknown'}
						</div>
						{selectedMarker.company && (
							<div className="text-xs text-gray-600 mt-1">{selectedMarker.company}</div>
						)}
						{(selectedMarker.city || selectedMarker.state) && (
							<div className="text-xs text-gray-500 mt-1">
								{[selectedMarker.city, selectedMarker.state].filter(Boolean).join(', ')}
							</div>
						)}
						{selectedMarker.title && (
							<div className="text-xs text-gray-500 mt-1 italic">
								{selectedMarker.title}
							</div>
						)}
					</div>
				</InfoWindowF>
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
