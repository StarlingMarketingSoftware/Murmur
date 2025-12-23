import { US_STATES } from '@/constants/usStates';

const toRad = (deg: number): number => (deg * Math.PI) / 180;

// Haversine distance (km) between two lat/lng points.
const haversineKm = (
	a: { lat: number; lng: number },
	b: { lat: number; lng: number }
): number => {
	const R = 6371; // km
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);

	const sinDLat = Math.sin(dLat / 2);
	const sinDLng = Math.sin(dLng / 2);
	const h =
		sinDLat * sinDLat +
		Math.cos(lat1) * Math.cos(lat2) * (sinDLng * sinDLng);
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const normalizeUsStateName = (input: string | null | undefined): string | null => {
	const v = (input ?? '').trim();
	if (!v) return null;

	const lc = v.toLowerCase();
	const match = US_STATES.find(
		(s) => s.name.toLowerCase() === lc || s.abbr.toLowerCase() === lc
	);
	return match?.name ?? null;
};

export const getNearestUsStateNames = (
	stateNameOrAbbr: string,
	count: number = 4
): string[] => {
	const canonical = normalizeUsStateName(stateNameOrAbbr);
	if (!canonical) return [];

	const origin = US_STATES.find((s) => s.name === canonical);
	if (!origin) return [];

	return US_STATES.filter((s) => s.name !== origin.name)
		.map((s) => ({
			name: s.name,
			distanceKm: haversineKm(origin.centroid, s.centroid),
		}))
		.sort((a, b) => a.distanceKm - b.distanceKm)
		.slice(0, Math.max(0, count))
		.map((x) => x.name);
};


