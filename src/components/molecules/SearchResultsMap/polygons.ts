import { absRingArea } from './geometry';
import type {
	ClippingCoord,
	ClippingMultiPolygon,
	ClippingPolygon,
	ClippingRing,
	WorldSegment,
} from './types';
import {
	distancePointToSegmentSq,
	flattenRing,
	flattenWorldSegments,
	getWasmGeoModuleSync,
	latLngToWorldPixel,
	logWasmGeoRuntimeError,
} from './wasmGeo';

// Project a multi-polygon's outer ring to world-pixel segments at the given
// zoom's worldSize, with bounding boxes pre-computed for cheap culling. Used
// by the "near edge" tests below.
export const buildOuterRingWorldSegments = (
	multiPolygon: ClippingMultiPolygon,
	worldSize: number
): WorldSegment[] => {
	const segments: WorldSegment[] = [];
	for (const polygon of multiPolygon) {
		if (!polygon?.length) continue;
		const outerRing = polygon.reduce<ClippingRing | null>((best, ring) => {
			if (!ring?.length) return best;
			if (!best) return ring;
			return absRingArea(ring) > absRingArea(best) ? ring : best;
		}, null);
		if (!outerRing || outerRing.length < 2) continue;

		for (let i = 0; i < outerRing.length - 1; i++) {
			const a = outerRing[i];
			const b = outerRing[i + 1];
			if (!a || !b) continue;
			const [lngA, latA] = a;
			const [lngB, latB] = b;
			if (
				!Number.isFinite(lngA) ||
				!Number.isFinite(latA) ||
				!Number.isFinite(lngB) ||
				!Number.isFinite(latB)
			)
				continue;
			const wa = latLngToWorldPixel({ lat: latA, lng: lngA }, worldSize);
			const wb = latLngToWorldPixel({ lat: latB, lng: lngB }, worldSize);
			segments.push({
				ax: wa.x,
				ay: wa.y,
				bx: wb.x,
				by: wb.y,
				minX: Math.min(wa.x, wb.x),
				maxX: Math.max(wa.x, wb.x),
				minY: Math.min(wa.y, wb.y),
				maxY: Math.max(wa.y, wb.y),
			});
		}
	}
	return segments;
};

export const isWorldPointNearSegments = (
	x: number,
	y: number,
	segments: WorldSegment[],
	thresholdPx: number
): boolean => {
	const wasmGeo = getWasmGeoModuleSync();
	if (wasmGeo && segments.length > 0) {
		try {
			return wasmGeo.is_point_near_segments(
				x,
				y,
				flattenWorldSegments(segments),
				thresholdPx
			);
		} catch (error: unknown) {
			logWasmGeoRuntimeError(error);
		}
	}

	const t = Math.max(0, thresholdPx);
	const tSq = t * t;
	for (const s of segments) {
		// Cheap bbox reject (expanded by threshold).
		if (x < s.minX - t || x > s.maxX + t || y < s.minY - t || y > s.maxY + t) continue;
		const dSq = distancePointToSegmentSq(x, y, s.ax, s.ay, s.bx, s.by);
		if (dSq < tSq) return true;
	}
	return false;
};

const pointInRing = (point: ClippingCoord, ring: ClippingRing): boolean => {
	const [x, y] = point;
	const wasmGeo = getWasmGeoModuleSync();
	if (wasmGeo) {
		try {
			return wasmGeo.point_in_ring(x, y, flattenRing(ring));
		} catch (error: unknown) {
			logWasmGeoRuntimeError(error);
		}
	}

	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		const intersects =
			yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
		if (intersects) inside = !inside;
	}
	return inside;
};

export const pointInClippingPolygon = (
	point: ClippingCoord,
	polygon: ClippingPolygon
): boolean => {
	if (!polygon?.length) return false;
	const outerRing = polygon.reduce<ClippingRing | null>((best, ring) => {
		if (!ring?.length) return best;
		if (!best) return ring;
		return absRingArea(ring) > absRingArea(best) ? ring : best;
	}, null);
	if (!outerRing) return false;
	if (!pointInRing(point, outerRing)) return false;
	// Treat all other rings as holes.
	for (const ring of polygon) {
		if (ring === outerRing) continue;
		if (ring?.length && pointInRing(point, ring)) return false;
	}
	return true;
};

export const pointInMultiPolygon = (
	point: ClippingCoord,
	multiPolygon: ClippingMultiPolygon
): boolean => {
	for (const polygon of multiPolygon) {
		if (pointInClippingPolygon(point, polygon)) return true;
	}
	return false;
};
