import mapboxgl from 'mapbox-gl';
import { ContactWithName } from '@/types/contact';
import type { LatLngLiteral } from './types';
import { clamp, degreesToRadians, smoothstep } from './math';
import {
	CURATED_DOT_FADE_START_ZOOM,
	DUPLICATE_JITTER_BASE_DEG,
	EARTH_RADIUS_KM,
	GOLDEN_ANGLE,
} from './constants';

export const coerceFiniteNumber = (value: unknown): number | null => {
	if (value == null) return null;
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return null;
		// Handle common "decimal comma" formats (e.g. "39,1234")
		const normalized =
			trimmed.includes(',') && !trimmed.includes('.')
				? trimmed.replace(',', '.')
				: trimmed;
		const n = Number(normalized);
		return Number.isFinite(n) ? n : null;
	}

	// Prisma can sometimes surface numeric-like objects; Number(...) is a safe coercion attempt.
	const n = Number((value as { valueOf?: () => unknown })?.valueOf?.() ?? value);
	return Number.isFinite(n) ? n : null;
};

export const getLatLngFromContact = (
	contact: ContactWithName
): LatLngLiteral | null => {
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
	// Treat (0,0) as "unknown" coordinates (common placeholder) to avoid the map jumping to Africa.
	// This product is US-focused; a true (0,0) contact would be in the Gulf of Guinea.
	if (Math.abs(lat) < 1e-9 && Math.abs(lng) < 1e-9) return null;
	// Defensive sanity bounds: out-of-range coords render unpredictably.
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
	return { lat, lng };
};

export const coordinateKey = (coords: LatLngLiteral) =>
	`${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;

// Deterministic "spiderfy" offset for exact/near-exact duplicate coordinates so markers don't fully overlap.
export const jitterDuplicateCoords = (
	base: LatLngLiteral,
	index: number
): LatLngLiteral => {
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

export const latLngToGlobeUnitVector = (coords: LatLngLiteral) => {
	const latRad = degreesToRadians(coords.lat);
	const lngRad = degreesToRadians(coords.lng);
	const cosLat = Math.cos(latRad);
	return {
		x: cosLat * Math.cos(lngRad),
		y: cosLat * Math.sin(lngRad),
		z: Math.sin(latRad),
	};
};

export const computeGlobeFrontHemisphereOpacity = (
	mapInstance: mapboxgl.Map,
	coords: LatLngLiteral | null,
	radiusKm: number | null,
	zoom: number
) => {
	if (!coords || zoom > CURATED_DOT_FADE_START_ZOOM) return 1;
	if (
		!Number.isFinite(coords.lat) ||
		!Number.isFinite(coords.lng) ||
		Math.abs(coords.lat) > 90
	) {
		return 1;
	}

	let center: mapboxgl.LngLat;
	try {
		center = mapInstance.getCenter();
	} catch {
		return 1;
	}
	if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return 1;

	const target = latLngToGlobeUnitVector(coords);
	const cameraCenter = latLngToGlobeUnitVector({ lat: center.lat, lng: center.lng });
	const dot =
		target.x * cameraCenter.x + target.y * cameraCenter.y + target.z * cameraCenter.z;
	if (!Number.isFinite(dot)) return 1;

	const radiusRad =
		radiusKm != null && Number.isFinite(radiusKm) && radiusKm > 0
			? clamp(radiusKm / EARTH_RADIUS_KM, 0, degreesToRadians(12))
			: 0;
	// The bloom is a flat DOM SVG, not a Mapbox globe layer. Hide it before the
	// cluster reaches the limb so it never has to approximate horizon wrapping.
	const limbTouchDot = Math.sin(radiusRad);
	const hideAtDot = limbTouchDot + 0.075;
	const fullAtDot = limbTouchDot + 0.22;
	return smoothstep(hideAtDot, fullAtDot, dot);
};
