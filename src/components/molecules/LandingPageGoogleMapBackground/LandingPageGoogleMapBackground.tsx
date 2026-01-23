'use client';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

type Props = {
	className?: string;
	onReady?: () => void;
};

// Marketing map should be focused on California and allow only limited panning.
const DEFAULT_CENTER = { lat: 36.7783, lng: -119.4179 }; // California (approx geographic center)
const DEFAULT_ZOOM = 6;
const CALIFORNIA_PAN_BOUNDS: google.maps.LatLngBoundsLiteral = {
	// A little breathing room around CA so it can be nudged, but not much.
	north: 42.4,
	south: 32.3,
	west: -125.2,
	east: -113.8,
};

export function LandingPageGoogleMapBackground({ className, onReady }: Props) {
	const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

	const { isLoaded, loadError } = useJsApiLoader({
		id: 'landing-page-google-map',
		googleMapsApiKey: apiKey,
	});

	if (!apiKey || loadError || !isLoaded) return null;

	return (
		<GoogleMap
			mapContainerClassName={className ?? 'w-full h-full'}
			center={DEFAULT_CENTER}
			zoom={DEFAULT_ZOOM}
			onLoad={() => onReady?.()}
			options={{
				disableDefaultUI: true,
				clickableIcons: false,
				// Allow click+drag pan, but keep the page scroll-friendly.
				gestureHandling: 'cooperative',
				keyboardShortcuts: false,
				draggable: true,
				scrollwheel: false,
				disableDoubleClickZoom: true,
				// Lock the zoom level so users can't zoom in/out.
				minZoom: DEFAULT_ZOOM,
				maxZoom: DEFAULT_ZOOM,
				// Limit how far the map can be panned.
				restriction: {
					latLngBounds: CALIFORNIA_PAN_BOUNDS,
					strictBounds: true,
				},
				zoomControl: false,
				fullscreenControl: false,
				streetViewControl: false,
				mapTypeControl: false,
			}}
		/>
	);
}

