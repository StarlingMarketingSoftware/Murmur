import mapboxgl from 'mapbox-gl';
import {
	CURATED_BLOB_KMEANS_MAX_ITER,
	CURATED_BLOB_LOBE_MAX_COUNT,
	CURATED_BLOB_LOBE_MAX_RADIUS_KM,
	CURATED_BLOB_LOBE_MIN_COUNT,
	CURATED_BLOB_LOBE_MIN_RADIUS_KM,
	CURATED_BLOB_LOBE_OVERLAP_RADIUS_RATIO,
	CURATED_BLOB_LOBE_PADDING_KM,
	CURATED_BLOB_LOBE_RADIUS_JITTER,
	CURATED_BLOB_MAX_REGIONS,
	CURATED_BLOB_MAX_REGION_SPAN_KM,
	CURATED_BLOB_MIN_REGION_POINTS,
	CURATED_BLOB_ORGANIC_WOBBLE,
	CURATED_BLOB_SHAPE_STEPS,
	CURATED_BLOB_SINGLETON_LOBE_OFFSET_KM,
	CURATED_BLOB_SINGLETON_LOBE_RADIUS_KM,
	CURATED_ORB_MIN_RADIUS_KM,
	CURATED_ORB_RADIUS_PADDING_KM,
	CURATED_ORB_SMALL_SHAPE_MIN_RADIUS_KM,
	CURATED_ORB_SMALL_SHAPE_THRESHOLD_KM,
} from './constants';
import { absRingArea, closeRing } from './geometry';
import { clamp } from './math';
import type {
	ClippingMultiPolygon,
	ClippingPolygon,
	ClippingRing,
	CuratedBlobCluster,
	CuratedBlobMercatorPoint,
	CuratedBlobMorphSource,
	LatLngLiteral,
} from './types';

// ============================================================================
// Mercator-circle building blocks
// ============================================================================

const curatedBlobOrganicRadiusScale = (
	angleRad: number,
	seed: number,
	wobble: number
): number => {
	if (!Number.isFinite(seed) || !Number.isFinite(wobble) || wobble <= 0) return 1;
	const phaseA = seed * 0.017453292519943295;
	const phaseB = seed * 0.031415926535897934 + 1.7;
	const phaseC = seed * 0.0471238898038469 + 0.9;
	const wave =
		Math.sin(angleRad * 2 + phaseA) * 0.5 +
		Math.sin(angleRad * 3 - phaseB) * 0.32 +
		Math.sin(angleRad * 5 + phaseC) * 0.18;
	return clamp(1 + wave * wobble, 1 - wobble * 1.35, 1 + wobble * 1.35);
};

const curatedBlobDeterministicUnit = (seed: number): number => {
	const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
	return x - Math.floor(x);
};

export const buildMercatorCircleMultiPolygon = (
	coords: LatLngLiteral,
	radiusKm: number,
	steps: number,
	organicSeed = 0,
	organicWobble = 0
): ClippingMultiPolygon | null => {
	if (
		!Number.isFinite(coords.lng) ||
		!Number.isFinite(coords.lat) ||
		!Number.isFinite(radiusKm) ||
		radiusKm <= 0 ||
		steps < 8
	) {
		return null;
	}

	const center = mapboxgl.MercatorCoordinate.fromLngLat({
		lng: coords.lng,
		lat: coords.lat,
	});
	const radiusMercator = radiusKm * 1000 * center.meterInMercatorCoordinateUnits();
	if (!Number.isFinite(radiusMercator) || radiusMercator <= 0) return null;

	const ring: ClippingRing = [];
	for (let i = 0; i < steps; i++) {
		const angle = (i / steps) * Math.PI * 2;
		const organicScale = curatedBlobOrganicRadiusScale(
			angle,
			organicSeed,
			organicWobble
		);
		ring.push([
			center.x + Math.cos(angle) * radiusMercator * organicScale,
			center.y + Math.sin(angle) * radiusMercator * organicScale,
		]);
	}

	const closed = closeRing(ring);
	return closed.length >= 4 ? [[closed]] : null;
};

const curatedBlobMercatorPointDistanceSq = (
	a: { x: number; y: number },
	b: { x: number; y: number }
) => {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy;
};

const curatedBlobLatLngFromMercator = (
	point: { x: number; y: number }
): LatLngLiteral | null => {
	const lngLat = new mapboxgl.MercatorCoordinate(point.x, point.y, 0).toLngLat();
	if (!Number.isFinite(lngLat.lng) || !Number.isFinite(lngLat.lat)) return null;
	return { lng: lngLat.lng, lat: lngLat.lat };
};

const curatedBlobKmPerMercatorUnit = (center: LatLngLiteral): number | null => {
	const mercatorPerKm =
		1000 *
		mapboxgl.MercatorCoordinate.fromLngLat({
			lng: center.lng,
			lat: center.lat,
		}).meterInMercatorCoordinateUnits();
	if (!Number.isFinite(mercatorPerKm) || mercatorPerKm <= 0) return null;
	return 1 / mercatorPerKm;
};

export const projectCuratedBlobPoint = (
	id: number,
	coords: LatLngLiteral
): CuratedBlobMercatorPoint | null => {
	const mercator = mapboxgl.MercatorCoordinate.fromLngLat({
		lng: coords.lng,
		lat: coords.lat,
	});
	if (!Number.isFinite(mercator.x) || !Number.isFinite(mercator.y)) return null;
	return { id, coords, x: mercator.x, y: mercator.y };
};

// ============================================================================
// k-means clustering of mercator points
// ============================================================================

const averageCuratedBlobCentroid = (
	points: CuratedBlobMercatorPoint[]
): { x: number; y: number } => {
	let x = 0;
	let y = 0;
	for (const point of points) {
		x += point.x;
		y += point.y;
	}
	return { x: x / points.length, y: y / points.length };
};

const chooseCuratedBlobInitialCentroids = (
	points: CuratedBlobMercatorPoint[],
	k: number
): Array<{ x: number; y: number }> => {
	const sorted = points
		.slice()
		.sort((a, b) => a.id - b.id || a.x - b.x || a.y - b.y);
	const globalCentroid = averageCuratedBlobCentroid(sorted);
	let first = sorted[0];
	let firstDist = Infinity;
	for (const point of sorted) {
		const dist = curatedBlobMercatorPointDistanceSq(point, globalCentroid);
		if (dist < firstDist) {
			first = point;
			firstDist = dist;
		}
	}

	const centroids: Array<{ x: number; y: number }> = [{ x: first.x, y: first.y }];
	while (centroids.length < k) {
		let next: CuratedBlobMercatorPoint | null = null;
		let nextDist = -Infinity;
		for (const point of sorted) {
			let nearestDist = Infinity;
			for (const centroid of centroids) {
				nearestDist = Math.min(
					nearestDist,
					curatedBlobMercatorPointDistanceSq(point, centroid)
				);
			}
			if (nearestDist > nextDist) {
				next = point;
				nextDist = nearestDist;
			}
		}
		if (!next) break;
		centroids.push({ x: next.x, y: next.y });
	}
	return centroids;
};

const kMeansClusterMercator = (
	points: CuratedBlobMercatorPoint[],
	k: number,
	maxIter: number
): CuratedBlobCluster[] => {
	if (points.length === 0 || k <= 0) return [];
	const targetK = Math.min(Math.max(1, Math.trunc(k)), points.length);
	if (targetK === 1) {
		return [{ centroid: averageCuratedBlobCentroid(points), points: points.slice() }];
	}
	if (targetK === points.length) {
		return points.map((point) => ({
			centroid: { x: point.x, y: point.y },
			points: [point],
		}));
	}

	let centroids = chooseCuratedBlobInitialCentroids(points, targetK);
	const assignments = new Array<number>(points.length).fill(-1);
	for (let iter = 0; iter < maxIter; iter++) {
		let didChange = false;
		for (let i = 0; i < points.length; i++) {
			let bestIdx = 0;
			let bestDist = Infinity;
			for (let c = 0; c < centroids.length; c++) {
				const dist = curatedBlobMercatorPointDistanceSq(points[i], centroids[c]);
				if (dist < bestDist) {
					bestDist = dist;
					bestIdx = c;
				}
			}
			if (assignments[i] !== bestIdx) {
				assignments[i] = bestIdx;
				didChange = true;
			}
		}

		const nextClusters: CuratedBlobCluster[] = centroids.map((centroid) => ({
			centroid,
			points: [],
		}));
		for (let i = 0; i < points.length; i++) {
			const assignment = assignments[i];
			if (assignment >= 0 && assignment < nextClusters.length) {
				nextClusters[assignment].points.push(points[i]);
			}
		}

		centroids = nextClusters.map((cluster) =>
			cluster.points.length > 0
				? averageCuratedBlobCentroid(cluster.points)
				: cluster.centroid
		);
		if (!didChange) break;
	}

	const clusters: CuratedBlobCluster[] = centroids.map((centroid) => ({
		centroid,
		points: [],
	}));
	for (let i = 0; i < points.length; i++) {
		const assignment = assignments[i];
		if (assignment >= 0 && assignment < clusters.length) {
			clusters[assignment].points.push(points[i]);
		}
	}
	return clusters.filter((cluster) => cluster.points.length > 0);
};

const minCuratedBlobClusterPointId = (cluster: CuratedBlobCluster): number =>
	cluster.points.reduce((minId, point) => Math.min(minId, point.id), Infinity);

const sortCuratedBlobClusters = (
	clusters: CuratedBlobCluster[]
): CuratedBlobCluster[] =>
	clusters.slice().sort((a, b) => {
		const minA = minCuratedBlobClusterPointId(a);
		const minB = minCuratedBlobClusterPointId(b);
		return minA - minB || a.centroid.x - b.centroid.x || a.centroid.y - b.centroid.y;
	});

const curatedBlobMercatorDistanceKm = (
	a: { x: number; y: number },
	b: { x: number; y: number }
): number | null => {
	const center = curatedBlobLatLngFromMercator({
		x: (a.x + b.x) / 2,
		y: (a.y + b.y) / 2,
	});
	if (!center) return null;
	const kmPerMercator = curatedBlobKmPerMercatorUnit(center);
	if (!kmPerMercator) return null;
	const distanceMercator = Math.hypot(a.x - b.x, a.y - b.y);
	if (!Number.isFinite(distanceMercator)) return null;
	return distanceMercator * kmPerMercator;
};

const offsetCuratedBlobPointByKm = (
	point: CuratedBlobMercatorPoint,
	offsetKm: number,
	angleRad: number
): LatLngLiteral | null => {
	const center = mapboxgl.MercatorCoordinate.fromLngLat({
		lng: point.coords.lng,
		lat: point.coords.lat,
	});
	const offsetMercator = offsetKm * 1000 * center.meterInMercatorCoordinateUnits();
	if (!Number.isFinite(offsetMercator)) return null;
	return curatedBlobLatLngFromMercator({
		x: point.x + Math.cos(angleRad) * offsetMercator,
		y: point.y + Math.sin(angleRad) * offsetMercator,
	});
};

const curatedBlobClusterSpanKm = (cluster: CuratedBlobCluster): number => {
	if (cluster.points.length < 2) return 0;
	const center = curatedBlobLatLngFromMercator(cluster.centroid);
	if (!center) return 0;
	const kmPerMercator = curatedBlobKmPerMercatorUnit(center);
	if (!kmPerMercator) return 0;

	let maxDistance = 0;
	for (const point of cluster.points) {
		maxDistance = Math.max(
			maxDistance,
			Math.hypot(point.x - cluster.centroid.x, point.y - cluster.centroid.y)
		);
	}
	return maxDistance * 2 * kmPerMercator;
};

// ============================================================================
// Adaptive cluster picking + lobe building
// ============================================================================

export const pickAdaptiveCuratedBlobClusters = (
	points: CuratedBlobMercatorPoint[]
): CuratedBlobCluster[] => {
	if (points.length === 0) return [];
	if (points.length === 1) {
		return [
			{
				centroid: { x: points[0].x, y: points[0].y },
				points: points.slice(),
			},
		];
	}

	if (points.length === CURATED_BLOB_MIN_REGION_POINTS) {
		const distanceKm = curatedBlobMercatorDistanceKm(points[0], points[1]);
		if (distanceKm == null || distanceKm > CURATED_BLOB_MAX_REGION_SPAN_KM) {
			return points.map((point) => ({
				centroid: { x: point.x, y: point.y },
				points: [point],
			}));
		}
		return [
			{
				centroid: averageCuratedBlobCentroid(points),
				points: points.slice(),
			},
		];
	}

	const sortedPoints = points
		.slice()
		.sort((a, b) => a.id - b.id || a.x - b.x || a.y - b.y);
	let clusters: CuratedBlobCluster[] = [
		{
			centroid: averageCuratedBlobCentroid(sortedPoints),
			points: sortedPoints,
		},
	];

	while (clusters.length < CURATED_BLOB_MAX_REGIONS) {
		let splitIndex = -1;
		let splitSpanKm = -Infinity;
		for (let i = 0; i < clusters.length; i++) {
			const cluster = clusters[i];
			if (cluster.points.length < 2) continue;
			const spanKm = curatedBlobClusterSpanKm(cluster);
			if (spanKm > CURATED_BLOB_MAX_REGION_SPAN_KM && spanKm > splitSpanKm) {
				splitIndex = i;
				splitSpanKm = spanKm;
			}
		}

		if (splitIndex < 0) break;

		const target = clusters[splitIndex];
		const split = kMeansClusterMercator(
			target.points,
			2,
			CURATED_BLOB_KMEANS_MAX_ITER
		);
		if (split.length < 2) break;

		clusters = [
			...clusters.slice(0, splitIndex),
			...split,
			...clusters.slice(splitIndex + 1),
		];
	}

	return sortCuratedBlobClusters(clusters).slice(0, CURATED_BLOB_MAX_REGIONS);
};

const pickCuratedBlobLobeClusters = (
	cluster: CuratedBlobCluster
): CuratedBlobCluster[] => {
	if (cluster.points.length < CURATED_BLOB_MIN_REGION_POINTS) return [];
	const lobeCount = Math.min(
		CURATED_BLOB_LOBE_MAX_COUNT,
		Math.max(
			CURATED_BLOB_LOBE_MIN_COUNT,
			Math.ceil(Math.sqrt(cluster.points.length))
		),
		cluster.points.length
	);
	return sortCuratedBlobClusters(
		kMeansClusterMercator(cluster.points, lobeCount, CURATED_BLOB_KMEANS_MAX_ITER)
	);
};

const curatedBlobLobeRadiusKm = (
	lobe: CuratedBlobCluster,
	allLobes: CuratedBlobCluster[],
	seed: number
): number | null => {
	const center = curatedBlobLatLngFromMercator(lobe.centroid);
	if (!center) return null;
	const kmPerMercator = curatedBlobKmPerMercatorUnit(center);
	if (!kmPerMercator) return null;

	let maxPointDistanceKm = 0;
	for (const point of lobe.points) {
		maxPointDistanceKm = Math.max(
			maxPointDistanceKm,
			Math.hypot(point.x - lobe.centroid.x, point.y - lobe.centroid.y) *
				kmPerMercator
		);
	}

	let nearestLobeDistanceKm = Infinity;
	for (const other of allLobes) {
		if (other === lobe) continue;
		const distanceKm = curatedBlobMercatorDistanceKm(lobe.centroid, other.centroid);
		if (distanceKm != null) {
			nearestLobeDistanceKm = Math.min(nearestLobeDistanceKm, distanceKm);
		}
	}

	const overlapRadiusKm = Number.isFinite(nearestLobeDistanceKm)
		? nearestLobeDistanceKm * CURATED_BLOB_LOBE_OVERLAP_RADIUS_RATIO
		: 0;
	const coverageRadiusKm = Math.max(
		CURATED_BLOB_LOBE_MIN_RADIUS_KM,
		maxPointDistanceKm + CURATED_BLOB_LOBE_PADDING_KM,
		overlapRadiusKm
	);
	const jitter =
		1 +
		(curatedBlobDeterministicUnit(seed) * 2 - 1) *
			CURATED_BLOB_LOBE_RADIUS_JITTER;
	return Math.max(
		maxPointDistanceKm + CURATED_BLOB_LOBE_PADDING_KM,
		clamp(
			coverageRadiusKm * jitter,
			CURATED_BLOB_LOBE_MIN_RADIUS_KM,
			CURATED_BLOB_LOBE_MAX_RADIUS_KM
		)
	);
};

const buildCuratedBlobSingletonLobeMultiPolygons = (
	point: CuratedBlobMercatorPoint,
	clusterIndex: number
): ClippingMultiPolygon[] => {
	const baseSeed = point.id + clusterIndex * 997;
	const angle = curatedBlobDeterministicUnit(baseSeed) * Math.PI * 2;
	const centers = [
		offsetCuratedBlobPointByKm(point, CURATED_BLOB_SINGLETON_LOBE_OFFSET_KM, angle),
		offsetCuratedBlobPointByKm(
			point,
			CURATED_BLOB_SINGLETON_LOBE_OFFSET_KM,
			angle + Math.PI
		),
	];

	return centers
		.map((center, index): ClippingMultiPolygon | null => {
			if (!center) return null;
			const radiusKm =
				CURATED_BLOB_SINGLETON_LOBE_RADIUS_KM *
				(1 +
					(index === 0
						? CURATED_BLOB_LOBE_RADIUS_JITTER
						: -CURATED_BLOB_LOBE_RADIUS_JITTER));
			return buildMercatorCircleMultiPolygon(
				center,
				radiusKm,
				CURATED_BLOB_SHAPE_STEPS,
				baseSeed + index * 131,
				CURATED_BLOB_ORGANIC_WOBBLE
			);
		})
		.filter((source): source is ClippingMultiPolygon => source != null);
};

export const buildCuratedBlobClusterLobeMultiPolygons = (
	cluster: CuratedBlobCluster,
	clusterIndex: number
): ClippingMultiPolygon[] => {
	if (cluster.points.length === 1) {
		return buildCuratedBlobSingletonLobeMultiPolygons(
			cluster.points[0],
			clusterIndex
		);
	}

	const lobes = pickCuratedBlobLobeClusters(cluster);
	if (lobes.length < CURATED_BLOB_LOBE_MIN_COUNT) return [];

	const multiPolygons: ClippingMultiPolygon[] = [];
	for (let i = 0; i < lobes.length; i++) {
		const lobe = lobes[i];
		const center = curatedBlobLatLngFromMercator(lobe.centroid);
		const organicSeed =
			minCuratedBlobClusterPointId(lobe) + clusterIndex * 997 + i * 131;
		const radiusKm = curatedBlobLobeRadiusKm(lobe, lobes, organicSeed);
		if (!center || radiusKm == null) continue;
		const mercatorMultiPolygon = buildMercatorCircleMultiPolygon(
			center,
			radiusKm,
			CURATED_BLOB_SHAPE_STEPS,
			organicSeed,
			CURATED_BLOB_ORGANIC_WOBBLE
		);
		if (mercatorMultiPolygon?.length) multiPolygons.push(mercatorMultiPolygon);
	}

	return multiPolygons;
};

// ============================================================================
// Smoothing + projection
// ============================================================================

const smoothClosedCuratedBlobRing = (
	ring: ClippingRing,
	passes: number
): ClippingRing => {
	let current = closeRing(ring).slice();
	if (current.length < 4 || passes <= 0) return current;

	for (let pass = 0; pass < passes; pass++) {
		const open = current.slice(0, -1);
		if (open.length < 3) break;

		const smoothed: ClippingRing = [];
		for (let i = 0; i < open.length; i++) {
			const a = open[i];
			const b = open[(i + 1) % open.length];
			smoothed.push([
				a[0] * 0.75 + b[0] * 0.25,
				a[1] * 0.75 + b[1] * 0.25,
			]);
			smoothed.push([
				a[0] * 0.25 + b[0] * 0.75,
				a[1] * 0.25 + b[1] * 0.75,
			]);
		}

		current = closeRing(smoothed);
	}

	return current;
};

export const smoothCuratedBlobMultiPolygon = (
	multiPolygon: ClippingMultiPolygon,
	passes: number
): ClippingMultiPolygon => {
	if (passes <= 0) return multiPolygon;

	return multiPolygon
		.map((polygon) =>
			polygon
				.map((ring) => smoothClosedCuratedBlobRing(ring, passes))
				.filter((ring) => ring.length >= 4)
		)
		.filter((polygon) => polygon.length > 0);
};

export const mercatorMultiPolygonToLngLat = (
	multiPolygon: ClippingMultiPolygon
): ClippingMultiPolygon => {
	const converted: ClippingMultiPolygon = [];
	for (const polygon of multiPolygon) {
		const convertedPolygon: ClippingPolygon = [];
		for (const ring of polygon) {
			const convertedRing: ClippingRing = [];
			for (const [x, y] of ring) {
				if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
				const ll = new mapboxgl.MercatorCoordinate(x, y, 0).toLngLat();
				if (Number.isFinite(ll.lng) && Number.isFinite(ll.lat)) {
					convertedRing.push([ll.lng, ll.lat]);
				}
			}
			const closed = closeRing(convertedRing);
			if (closed.length >= 4) convertedPolygon.push(closed);
		}
		if (convertedPolygon.length) converted.push(convertedPolygon);
	}
	return converted;
};

const lngLatMultiPolygonToMercator = (
	multiPolygon: ClippingMultiPolygon
): ClippingMultiPolygon => {
	const converted: ClippingMultiPolygon = [];
	for (const polygon of multiPolygon) {
		const convertedPolygon: ClippingPolygon = [];
		for (const ring of polygon) {
			const convertedRing: ClippingRing = [];
			for (const [lng, lat] of ring) {
				if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
				const mercator = mapboxgl.MercatorCoordinate.fromLngLat({ lng, lat });
				if (Number.isFinite(mercator.x) && Number.isFinite(mercator.y)) {
					convertedRing.push([mercator.x, mercator.y]);
				}
			}
			const closed = closeRing(convertedRing);
			if (closed.length >= 4) convertedPolygon.push(closed);
		}
		if (convertedPolygon.length) converted.push(convertedPolygon);
	}
	return converted;
};

// ============================================================================
// Morph sources (for the curated-orb / selected-state circle morph)
// ============================================================================

export const createCuratedBlobMorphSourcesFromMercatorMultiPolygon = (
	multiPolygon: ClippingMultiPolygon
): CuratedBlobMorphSource[] => {
	const sources: CuratedBlobMorphSource[] = [];
	for (const polygon of multiPolygon) {
		const rings = polygon
			.map((ring) =>
				closeRing(ring.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)))
			)
			.filter((ring) => ring.length >= 4);
		if (!rings.length) continue;

		const outerRing = rings.reduce<ClippingRing | null>((best, ring) => {
			if (!best) return ring;
			return absRingArea(ring) > absRingArea(best) ? ring : best;
		}, null);
		if (!outerRing) continue;

		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		for (const [x, y] of outerRing) {
			minX = Math.min(minX, x);
			maxX = Math.max(maxX, x);
			minY = Math.min(minY, y);
			maxY = Math.max(maxY, y);
		}
		if (
			!Number.isFinite(minX) ||
			!Number.isFinite(maxX) ||
			!Number.isFinite(minY) ||
			!Number.isFinite(maxY)
		) {
			continue;
		}

		const centerMerc = {
			x: (minX + maxX) / 2,
			y: (minY + maxY) / 2,
		};
		const center = curatedBlobLatLngFromMercator(centerMerc);
		if (!center) continue;

		const kmPerMercatorUnit = curatedBlobKmPerMercatorUnit(center);
		if (!kmPerMercatorUnit) continue;

		let maxVertexDistMerc = 0;
		for (const ring of rings) {
			for (const point of ring) {
				maxVertexDistMerc = Math.max(
					maxVertexDistMerc,
					Math.hypot(point[0] - centerMerc.x, point[1] - centerMerc.y)
				);
			}
		}

		const maxVertexDistKm = maxVertexDistMerc * kmPerMercatorUnit;
		const minRadiusKm =
			maxVertexDistKm <= CURATED_ORB_SMALL_SHAPE_THRESHOLD_KM
				? CURATED_ORB_SMALL_SHAPE_MIN_RADIUS_KM
				: CURATED_ORB_MIN_RADIUS_KM;
		const minRadiusMerc = minRadiusKm / kmPerMercatorUnit;
		const paddingMerc = CURATED_ORB_RADIUS_PADDING_KM / kmPerMercatorUnit;
		const radiusMerc = Math.max(maxVertexDistMerc + paddingMerc, minRadiusMerc);
		sources.push({
			mercatorMultiPolygon: [rings],
			center,
			centerMerc,
			radiusMerc,
			radiusKm: radiusMerc * kmPerMercatorUnit,
		});
	}
	return sources;
};

export const createSelectedStateMorphSource = (
	multiPolygon: ClippingMultiPolygon
): CuratedBlobMorphSource | null => {
	const mercatorMultiPolygon = lngLatMultiPolygonToMercator(multiPolygon);
	const sources = createCuratedBlobMorphSourcesFromMercatorMultiPolygon(
		mercatorMultiPolygon
	);
	if (sources.length === 0) return null;
	return sources.reduce((largest, source) =>
		source.radiusMerc > largest.radiusMerc ? source : largest
	);
};

export const morphCuratedBlobSourceToLngLat = (
	source: CuratedBlobMorphSource,
	t: number
): ClippingMultiPolygon => {
	const morphT = clamp(t, 0, 1);
	const morphed =
		morphT <= 0
			? source.mercatorMultiPolygon
			: source.mercatorMultiPolygon.map((polygon) =>
					polygon.map((ring) =>
						ring.map((point): [number, number] => {
							const dx = point[0] - source.centerMerc.x;
							const dy = point[1] - source.centerMerc.y;
							if (dx === 0 && dy === 0) return [point[0], point[1]];
							const angle = Math.atan2(dy, dx);
							const tx = source.centerMerc.x + Math.cos(angle) * source.radiusMerc;
							const ty = source.centerMerc.y + Math.sin(angle) * source.radiusMerc;
							return [
								point[0] + (tx - point[0]) * morphT,
								point[1] + (ty - point[1]) * morphT,
							];
						})
					)
			  );
	return mercatorMultiPolygonToLngLat(morphed);
};

// ============================================================================
// SVG screen-path projection
// ============================================================================

export const buildScreenPathFromLngLatMultiPolygon = (
	mapInstance: mapboxgl.Map,
	multiPolygon: ClippingMultiPolygon | null
): {
	d: string;
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
} | null => {
	if (!multiPolygon?.length) return null;

	const commands: string[] = [];
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const polygon of multiPolygon) {
		for (const ring of polygon) {
			const projected: Array<[number, number]> = [];
			for (const [lng, lat] of ring) {
				if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
				let point: mapboxgl.Point;
				try {
					point = mapInstance.project([lng, lat]);
				} catch {
					continue;
				}
				if (Number.isFinite(point.x) && Number.isFinite(point.y)) {
					projected.push([point.x, point.y]);
					minX = Math.min(minX, point.x);
					minY = Math.min(minY, point.y);
					maxX = Math.max(maxX, point.x);
					maxY = Math.max(maxY, point.y);
				}
			}
			if (projected.length < 3) continue;
			const [firstX, firstY] = projected[0];
			commands.push(`M ${firstX.toFixed(2)} ${firstY.toFixed(2)}`);
			for (let i = 1; i < projected.length; i++) {
				const [x, y] = projected[i];
				commands.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
			}
			commands.push('Z');
		}
	}

	const d = commands.join(' ');
	if (!d || !Number.isFinite(minX) || !Number.isFinite(minY)) return null;
	return { d, minX, minY, maxX, maxY };
};
