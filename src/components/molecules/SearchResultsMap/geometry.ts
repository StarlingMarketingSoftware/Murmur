import type {
	BoundingBox,
	ClippingMultiPolygon,
	ClippingPolygon,
	ClippingRing,
	GeoJsonGeometry,
	MapSelectionBounds,
	OutlinePolygonFeatureCollection,
} from './types';

// Pure geometry / clipping helpers — no module-level state, no mapboxgl.

export const closeRing = (ring: ClippingRing): ClippingRing => {
	if (ring.length === 0) return ring;
	const first = ring[0];
	const last = ring[ring.length - 1];
	if (first[0] === last[0] && first[1] === last[1]) return ring;
	return [...ring, first];
};

export const absRingArea = (ring: ClippingRing): number => {
	if (ring.length < 3) return 0;
	let area2 = 0;
	for (let i = 0; i < ring.length; i++) {
		const [x1, y1] = ring[i];
		const [x2, y2] = ring[(i + 1) % ring.length];
		area2 += x1 * y2 - x2 * y1;
	}
	return Math.abs(area2 / 2);
};

export const createOutlineGeoJsonFromMultiPolygon = (
	multiPolygon: ClippingMultiPolygon
): OutlinePolygonFeatureCollection => {
	const features: OutlinePolygonFeatureCollection['features'] = [];
	for (const clippingPolygon of multiPolygon) {
		if (!clippingPolygon?.length) continue;

		const outerRing = clippingPolygon.reduce<ClippingRing | null>((best, ring) => {
			if (!ring?.length) return best;
			if (!best) return ring;
			return absRingArea(ring) > absRingArea(best) ? ring : best;
		}, null);

		if (!outerRing) continue;

		const coords = closeRing(
			outerRing.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
		);
		if (coords.length < 4) continue;

		features.push({
			type: 'Feature',
			properties: {},
			geometry: {
				type: 'Polygon',
				coordinates: [coords.map(([lng, lat]) => [lng, lat])],
			},
		});
	}
	return { type: 'FeatureCollection', features };
};

export const geoJsonRingToClippingRing = (ring: number[][]): ClippingRing => {
	const coords = ring
		.map((pair): [number, number] => [pair?.[0] as number, pair?.[1] as number])
		.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
	if (coords.length < 3) return [];
	return closeRing(coords);
};

export const geoJsonPolygonToClippingPolygon = (
	polygonCoords: number[][][]
): ClippingPolygon => {
	const rings = (polygonCoords ?? [])
		.map((ring) => geoJsonRingToClippingRing(ring))
		.filter((ring) => ring.length >= 4);
	return rings;
};

export const geoJsonGeometryToClippingMultiPolygon = (
	geometry: GeoJsonGeometry | null | undefined
): ClippingMultiPolygon | null => {
	if (!geometry) return null;
	if (geometry.type === 'Polygon') {
		const poly = geoJsonPolygonToClippingPolygon(geometry.coordinates);
		return poly.length ? [poly] : null;
	}
	if (geometry.type === 'MultiPolygon') {
		const polys = (geometry.coordinates ?? [])
			.map((polyCoords) => geoJsonPolygonToClippingPolygon(polyCoords))
			.filter((poly) => poly.length);
		return polys.length ? polys : null;
	}
	return null;
};

export const bboxFromMultiPolygon = (
	multiPolygon: ClippingMultiPolygon
): BoundingBox | null => {
	let minLat = Infinity;
	let maxLat = -Infinity;
	let minLng = Infinity;
	let maxLng = -Infinity;
	for (const poly of multiPolygon) {
		for (const ring of poly) {
			for (const [lng, lat] of ring) {
				if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
				minLat = Math.min(minLat, lat);
				maxLat = Math.max(maxLat, lat);
				minLng = Math.min(minLng, lng);
				maxLng = Math.max(maxLng, lng);
			}
		}
	}
	if (
		!Number.isFinite(minLat) ||
		!Number.isFinite(maxLat) ||
		!Number.isFinite(minLng) ||
		!Number.isFinite(maxLng)
	) {
		return null;
	}
	return { minLat, maxLat, minLng, maxLng };
};

export const isLatLngInBbox = (lat: number, lng: number, bbox: BoundingBox): boolean =>
	lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;

export const boundsToPolygonFeatureCollection = (
	bounds: MapSelectionBounds,
	properties: Record<string, unknown> = {}
): OutlinePolygonFeatureCollection => {
	const ring: number[][] = [
		[bounds.west, bounds.south],
		[bounds.east, bounds.south],
		[bounds.east, bounds.north],
		[bounds.west, bounds.north],
		[bounds.west, bounds.south],
	];
	return {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				properties,
				geometry: { type: 'Polygon', coordinates: [ring] },
			},
		],
	};
};
