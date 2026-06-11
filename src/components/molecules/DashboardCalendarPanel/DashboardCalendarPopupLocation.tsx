'use client';

import { FC, useCallback, useEffect, useState, type CSSProperties } from 'react';

import { ProfileAreaMapBox } from '@/components/molecules/HybridPromptInput/ProfileSidePanelBox';
import {
	formatVenueLocationFeature,
	VENUE_LOCATION_GEOCODE_TYPES,
} from '@/app/venue-portal/venueLocationFormat';

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
	// Defaults to the dashboard popup's hardcoded slot; other hosts (the inbox
	// booking editor) pass their own box.
	containerStyle?: CSSProperties;
};

// The profile box settles on a regional zoom after a pick; an event address needs
// street-level framing so the pin can be fine-tuned by dragging.
const PLACE_DETAIL_ZOOM = 14;

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

export const DashboardCalendarPopupLocation: FC<Props> = ({
	address,
	lat,
	lng,
	drivingDuration,
	onUpdate,
	containerStyle,
}) => {
	const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
	const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
		null
	);

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

	// If we have a saved place but no driving time yet (user location arrived later, or a
	// new pick reset it), compute it once both halves are available.
	useEffect(() => {
		if (lat == null || lng == null) return;
		if (drivingDuration) return;
		if (!userLocation) return;
		void computeDrivingTime(lat, lng);
	}, [lat, lng, drivingDuration, userLocation, computeDrivingTime]);

	return (
		<div
			style={
				containerStyle ?? {
					position: 'absolute',
					left: '5.5px',
					top: '164px',
					width: '284.144px',
					height: '149.606px',
				}
			}
		>
			<ProfileAreaMapBox
				area={address}
				onAreaUpdate={(next) => onUpdate({ address: next })}
				initialCoordinates={lat != null && lng != null ? { lat, lng } : null}
				onCoordinatesChange={({ lat: nextLat, lng: nextLng }) =>
					onUpdate({ lat: nextLat, lng: nextLng, placeId: null, drivingDuration: null })
				}
				onFeatureSelect={(feature) =>
					onUpdate({ placeId: feature.properties?.mapbox_id ?? null })
				}
				headerLabel={drivingDuration ? `${drivingDuration} from you` : 'Add Location'}
				inputPlaceholder="Add Location"
				reverseGeocodeTypes={VENUE_LOCATION_GEOCODE_TYPES}
				forwardGeocodeTypes={VENUE_LOCATION_GEOCODE_TYPES}
				formatGeocodeFeature={formatVenueLocationFeature}
				selectedZoom={PLACE_DETAIL_ZOOM}
				className="mt-0 !h-full !w-full rounded-[9.687px] border-[1.643px] opacity-100"
			/>
		</div>
	);
};

export default DashboardCalendarPopupLocation;
