import {
	MARKER_CONSTELLATION_DETAIL_COMPOSE_ZOOM,
	MARKER_CONSTELLATION_FALLBACK_GROUP_PX,
	MARKER_CONSTELLATION_MAX_EDGE_PX,
	MARKER_CONSTELLATION_MAX_EDGES,
	MARKER_CONSTELLATION_MID_COMPOSE_ZOOM,
	MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM,
	MARKER_CONSTELLATION_MIN_EDGE_PX,
	MARKER_CONSTELLATION_POINT_CLEARANCE_PX,
	MARKER_CONSTELLATION_SPARSE_FALLBACK_MAX_EDGE_PX,
} from './constants';
import { clamp } from './math';
import type {
	MarkerConstellationCandidate,
	MarkerConstellationEdge,
	MarkerConstellationEdgeSeed,
	MarkerConstellationFormation,
	MarkerConstellationLevel,
	MarkerConstellationNode,
	MarkerConstellationPoint,
	MarkerConstellationPointStats,
} from './types';
import { distancePointToSegmentSq, hashStringToUint32 } from './wasmGeo';

const SELECTED_MARKER_CONSTELLATION_MAX_ANCHORS = 44;
const SELECTED_MARKER_CONSTELLATION_MIN_ANCHORS = 12;
const SELECTED_MARKER_CONSTELLATION_MIN_EDGE_PX = 10;
const SELECTED_MARKER_CONSTELLATION_MAX_EDGE_PX = 420;
const CATEGORY_MARKER_CONSTELLATION_MAX_EDGE_PX = 260;

// ============================================================================
// Geometry primitives
// ============================================================================

export const markerConstellationPairKey = (a: number, b: number): string =>
	a < b ? `${a}:${b}` : `${b}:${a}`;

const markerConstellationOrientation = (
	ax: number,
	ay: number,
	bx: number,
	by: number,
	cx: number,
	cy: number
): number => {
	const value = (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
	if (Math.abs(value) < 1e-9) return 0;
	return value > 0 ? 1 : 2;
};

const markerConstellationOnSegment = (
	ax: number,
	ay: number,
	bx: number,
	by: number,
	cx: number,
	cy: number
): boolean =>
	bx <= Math.max(ax, cx) + 1e-9 &&
	bx + 1e-9 >= Math.min(ax, cx) &&
	by <= Math.max(ay, cy) + 1e-9 &&
	by + 1e-9 >= Math.min(ay, cy);

const markerConstellationSegmentsIntersect = (
	a: Pick<MarkerConstellationCandidate, 'ax' | 'ay' | 'bx' | 'by'>,
	b: Pick<MarkerConstellationCandidate, 'ax' | 'ay' | 'bx' | 'by'>
): boolean => {
	const o1 = markerConstellationOrientation(a.ax, a.ay, a.bx, a.by, b.ax, b.ay);
	const o2 = markerConstellationOrientation(a.ax, a.ay, a.bx, a.by, b.bx, b.by);
	const o3 = markerConstellationOrientation(b.ax, b.ay, b.bx, b.by, a.ax, a.ay);
	const o4 = markerConstellationOrientation(b.ax, b.ay, b.bx, b.by, a.bx, a.by);

	if (o1 !== o2 && o3 !== o4) return true;
	if (
		o1 === 0 &&
		markerConstellationOnSegment(a.ax, a.ay, b.ax, b.ay, a.bx, a.by)
	)
		return true;
	if (
		o2 === 0 &&
		markerConstellationOnSegment(a.ax, a.ay, b.bx, b.by, a.bx, a.by)
	)
		return true;
	if (
		o3 === 0 &&
		markerConstellationOnSegment(b.ax, b.ay, a.ax, a.ay, b.bx, b.by)
	)
		return true;
	if (
		o4 === 0 &&
		markerConstellationOnSegment(b.ax, b.ay, a.bx, a.by, b.bx, b.by)
	)
		return true;
	return false;
};

const markerConstellationCandidateCutsThroughPoint = (
	candidate: MarkerConstellationCandidate,
	points: MarkerConstellationPoint[]
): boolean => {
	const clearanceSq =
		MARKER_CONSTELLATION_POINT_CLEARANCE_PX * MARKER_CONSTELLATION_POINT_CLEARANCE_PX;
	for (const point of points) {
		if (point.id === candidate.fromId || point.id === candidate.toId) continue;
		const distSq = distancePointToSegmentSq(
			point.x,
			point.y,
			candidate.ax,
			candidate.ay,
			candidate.bx,
			candidate.by
		);
		if (distSq < clearanceSq) return true;
	}
	return false;
};

const markerConstellationWouldCrossExistingEdge = (
	candidate: MarkerConstellationCandidate,
	edges: MarkerConstellationCandidate[]
): boolean => {
	for (const edge of edges) {
		if (
			edge.fromId === candidate.fromId ||
			edge.fromId === candidate.toId ||
			edge.toId === candidate.fromId ||
			edge.toId === candidate.toId
		) {
			continue;
		}
		if (markerConstellationSegmentsIntersect(candidate, edge)) return true;
	}
	return false;
};

// ============================================================================
// Edge builders (per-group dense, and sparse fallback)
// ============================================================================

const buildMarkerConstellationEdgesForGroup = (
	points: MarkerConstellationPoint[],
	seed: string,
	remainingBudget: number,
	maxEdgeCap: number = MARKER_CONSTELLATION_MAX_EDGE_PX
): MarkerConstellationEdgeSeed[] => {
	if (points.length < 2 || remainingBudget <= 0) return [];

	const sorted = points.slice().sort((a, b) => a.id - b.id);
	const nearestDistances: number[] = [];
	for (let i = 0; i < sorted.length; i++) {
		let nearest = Infinity;
		for (let j = 0; j < sorted.length; j++) {
			if (i === j) continue;
			const dx = sorted[i].x - sorted[j].x;
			const dy = sorted[i].y - sorted[j].y;
			nearest = Math.min(nearest, Math.hypot(dx, dy));
		}
		if (Number.isFinite(nearest)) nearestDistances.push(nearest);
	}

	nearestDistances.sort((a, b) => a - b);
	const medianNearest =
		nearestDistances.length > 0
			? nearestDistances[Math.floor(nearestDistances.length / 2)]
			: MARKER_CONSTELLATION_MIN_EDGE_PX;
	const maxEdgePx = Math.min(
		maxEdgeCap,
		Math.max(MARKER_CONSTELLATION_MIN_EDGE_PX, medianNearest * 2.65)
	);

	const candidates: MarkerConstellationCandidate[] = [];
	for (let i = 0; i < sorted.length; i++) {
		for (let j = i + 1; j < sorted.length; j++) {
			const a = sorted[i];
			const b = sorted[j];
			const dx = a.x - b.x;
			const dy = a.y - b.y;
			const length = Math.hypot(dx, dy);
			if (
				!Number.isFinite(length) ||
				length < MARKER_CONSTELLATION_MIN_EDGE_PX ||
				length > maxEdgePx
			) {
				continue;
			}

			const pairKey = markerConstellationPairKey(a.id, b.id);
			const h = hashStringToUint32(`${seed}|${pairKey}`);
			const candidate: MarkerConstellationCandidate = {
				fromId: a.id,
				toId: b.id,
				ax: a.x,
				ay: a.y,
				bx: b.x,
				by: b.y,
				length,
				// A tiny deterministic wobble avoids overly mechanical ties without changing intent.
				score: length + (h / 0xffffffff) * 8,
			};
			if (markerConstellationCandidateCutsThroughPoint(candidate, sorted)) continue;
			candidates.push(candidate);
		}
	}

	if (candidates.length === 0) return [];
	candidates.sort((a, b) => a.score - b.score);

	const parent = new Map<number, number>();
	for (const point of sorted) parent.set(point.id, point.id);
	const find = (id: number): number => {
		const p = parent.get(id);
		if (p == null || p === id) return id;
		const root = find(p);
		parent.set(id, root);
		return root;
	};
	const union = (a: number, b: number): boolean => {
		const rootA = find(a);
		const rootB = find(b);
		if (rootA === rootB) return false;
		parent.set(rootB, rootA);
		return true;
	};

	const degree = new Map<number, number>();
	const chosen: MarkerConstellationCandidate[] = [];
	const chosenKeys = new Set<string>();
	const maxDegree = sorted.length >= 7 ? 3 : 2;
	let branchDegreeThreeCount = 0;
	const maxBranchDegreeThree = sorted.length >= 10 ? 2 : sorted.length >= 7 ? 1 : 0;

	const canUseCandidate = (candidate: MarkerConstellationCandidate): boolean => {
		const fromDegree = degree.get(candidate.fromId) ?? 0;
		const toDegree = degree.get(candidate.toId) ?? 0;
		if (fromDegree >= maxDegree || toDegree >= maxDegree) return false;

		const wouldCreateThird =
			(maxDegree >= 3 && fromDegree === 2 ? 1 : 0) +
			(maxDegree >= 3 && toDegree === 2 ? 1 : 0);
		if (branchDegreeThreeCount + wouldCreateThird > maxBranchDegreeThree) return false;
		if (markerConstellationWouldCrossExistingEdge(candidate, chosen)) return false;
		return true;
	};

	const acceptCandidate = (candidate: MarkerConstellationCandidate) => {
		chosen.push(candidate);
		chosenKeys.add(markerConstellationPairKey(candidate.fromId, candidate.toId));
		const fromDegree = degree.get(candidate.fromId) ?? 0;
		const toDegree = degree.get(candidate.toId) ?? 0;
		if (maxDegree >= 3 && fromDegree === 2) branchDegreeThreeCount += 1;
		if (maxDegree >= 3 && toDegree === 2) branchDegreeThreeCount += 1;
		degree.set(candidate.fromId, fromDegree + 1);
		degree.set(candidate.toId, toDegree + 1);
	};

	const targetTreeEdges = Math.min(sorted.length - 1, remainingBudget);
	for (const candidate of candidates) {
		if (chosen.length >= targetTreeEdges) break;
		if (!canUseCandidate(candidate)) continue;
		if (!union(candidate.fromId, candidate.toId)) continue;
		acceptCandidate(candidate);
	}

	const maxExtraEdges = Math.min(
		Math.max(0, remainingBudget - chosen.length),
		Math.max(0, Math.floor(sorted.length * 0.16))
	);
	let addedExtra = 0;
	const extraMaxLength = Math.min(maxEdgePx, medianNearest * 1.9);
	for (const candidate of candidates) {
		if (addedExtra >= maxExtraEdges) break;
		const key = markerConstellationPairKey(candidate.fromId, candidate.toId);
		if (chosenKeys.has(key)) continue;
		if (candidate.length > extraMaxLength) continue;
		if (!canUseCandidate(candidate)) continue;
		acceptCandidate(candidate);
		addedExtra += 1;
	}

	return chosen.slice(0, remainingBudget).map((edge) => ({
		fromId: edge.fromId,
		toId: edge.toId,
	}));
};

// Group close-by points so the dense edge builder doesn't try to connect
// every cluster across the country. Used by the component as a fallback when
// `groupKey` isn't already set on the points.
export const buildFallbackMarkerConstellationGroupKeys = (
	points: MarkerConstellationPoint[]
): Map<number, string> => {
	const parent = new Map<number, number>();
	for (const point of points) parent.set(point.id, point.id);

	const find = (id: number): number => {
		const p = parent.get(id);
		if (p == null || p === id) return id;
		const root = find(p);
		parent.set(id, root);
		return root;
	};
	const union = (a: number, b: number) => {
		const rootA = find(a);
		const rootB = find(b);
		if (rootA !== rootB) parent.set(rootB, rootA);
	};

	for (let i = 0; i < points.length; i++) {
		for (let j = i + 1; j < points.length; j++) {
			const dx = points[i].x - points[j].x;
			const dy = points[i].y - points[j].y;
			if (Math.hypot(dx, dy) <= MARKER_CONSTELLATION_FALLBACK_GROUP_PX) {
				union(points[i].id, points[j].id);
			}
		}
	}

	const rootToGroup = new Map<number, string>();
	const groupKeyById = new Map<number, string>();
	for (const point of points) {
		const root = find(point.id);
		let key = rootToGroup.get(root);
		if (!key) {
			key = `fallback:${rootToGroup.size}`;
			rootToGroup.set(root, key);
		}
		groupKeyById.set(point.id, key);
	}
	return groupKeyById;
};

type MarkerConstellationPointGroup = {
	key: string;
	group: MarkerConstellationPoint[];
	minId: number;
};

const getOrderedMarkerConstellationPointGroups = (
	points: MarkerConstellationPoint[]
): MarkerConstellationPointGroup[] => {
	const groups = new Map<string, MarkerConstellationPoint[]>();
	for (const point of points) {
		const group = groups.get(point.groupKey);
		if (group) group.push(point);
		else groups.set(point.groupKey, [point]);
	}

	return Array.from(groups.entries())
		.map(([key, group]) => ({
			key,
			group: group.slice().sort((a, b) => a.id - b.id),
			minId: group.reduce((min, point) => Math.min(min, point.id), Infinity),
		}))
		.filter(({ group }) => group.length >= 2)
		.sort((a, b) => a.minId - b.minId || a.key.localeCompare(b.key));
};

const buildMarkerConstellationEdges = (
	points: MarkerConstellationPoint[],
	seed: string
): MarkerConstellationEdgeSeed[] => {
	if (points.length < 2) return [];

	const orderedGroups = getOrderedMarkerConstellationPointGroups(points);

	const edges: MarkerConstellationEdgeSeed[] = [];
	for (const { key, group } of orderedGroups) {
		if (edges.length >= MARKER_CONSTELLATION_MAX_EDGES) break;
		const groupEdges = buildMarkerConstellationEdgesForGroup(
			group,
			`${seed}|${key}`,
			MARKER_CONSTELLATION_MAX_EDGES - edges.length
		);
		edges.push(...groupEdges);
	}
	return edges;
};

const buildSparseMarkerConstellationEdges = (
	points: MarkerConstellationPoint[],
	seed: string,
	maxEdgeCap: number = MARKER_CONSTELLATION_SPARSE_FALLBACK_MAX_EDGE_PX
): MarkerConstellationEdgeSeed[] => {
	if (points.length < 2) return [];

	const sorted = points.slice().sort((a, b) => a.id - b.id);
	const nearestDistances: number[] = [];
	for (let i = 0; i < sorted.length; i++) {
		let nearest = Infinity;
		for (let j = 0; j < sorted.length; j++) {
			if (i === j) continue;
			const dx = sorted[i].x - sorted[j].x;
			const dy = sorted[i].y - sorted[j].y;
			nearest = Math.min(nearest, Math.hypot(dx, dy));
		}
		if (Number.isFinite(nearest)) nearestDistances.push(nearest);
	}

	nearestDistances.sort((a, b) => a - b);
	const medianNearest =
		nearestDistances.length > 0
			? nearestDistances[Math.floor(nearestDistances.length / 2)]
			: MARKER_CONSTELLATION_MAX_EDGE_PX;
	const upperNearest =
		nearestDistances.length > 0
			? nearestDistances[Math.floor(nearestDistances.length * 0.75)]
			: MARKER_CONSTELLATION_MAX_EDGE_PX;
	const maxEdgePx = Math.min(
		maxEdgeCap,
		Math.max(MARKER_CONSTELLATION_MAX_EDGE_PX, medianNearest * 2.5, upperNearest * 1.35)
	);

	const candidates: MarkerConstellationCandidate[] = [];
	for (let i = 0; i < sorted.length; i++) {
		for (let j = i + 1; j < sorted.length; j++) {
			const a = sorted[i];
			const b = sorted[j];
			const dx = a.x - b.x;
			const dy = a.y - b.y;
			const length = Math.hypot(dx, dy);
			if (
				!Number.isFinite(length) ||
				length < MARKER_CONSTELLATION_MIN_EDGE_PX ||
				length > maxEdgePx
			) {
				continue;
			}

			const pairKey = markerConstellationPairKey(a.id, b.id);
			const h = hashStringToUint32(`${seed}|${pairKey}`);
			const candidate: MarkerConstellationCandidate = {
				fromId: a.id,
				toId: b.id,
				ax: a.x,
				ay: a.y,
				bx: b.x,
				by: b.y,
				length,
				score: length + (h / 0xffffffff) * 14,
			};
			if (markerConstellationCandidateCutsThroughPoint(candidate, sorted)) continue;
			candidates.push(candidate);
		}
	}

	if (candidates.length === 0) return [];
	candidates.sort((a, b) => a.score - b.score);

	const parent = new Map<number, number>();
	for (const point of sorted) parent.set(point.id, point.id);
	const find = (id: number): number => {
		const p = parent.get(id);
		if (p == null || p === id) return id;
		const root = find(p);
		parent.set(id, root);
		return root;
	};
	const union = (a: number, b: number): boolean => {
		const rootA = find(a);
		const rootB = find(b);
		if (rootA === rootB) return false;
		parent.set(rootB, rootA);
		return true;
	};

	const degree = new Map<number, number>();
	const chosen: MarkerConstellationCandidate[] = [];
	const maxDegree = sorted.length >= 9 ? 3 : 2;
	const targetEdges = Math.min(
		MARKER_CONSTELLATION_MAX_EDGES,
		sorted.length - 1,
		Math.max(1, Math.floor(sorted.length * 0.7))
	);

	for (const candidate of candidates) {
		if (chosen.length >= targetEdges) break;
		const fromDegree = degree.get(candidate.fromId) ?? 0;
		const toDegree = degree.get(candidate.toId) ?? 0;
		if (fromDegree >= maxDegree || toDegree >= maxDegree) continue;
		if (markerConstellationWouldCrossExistingEdge(candidate, chosen)) continue;
		if (!union(candidate.fromId, candidate.toId)) continue;

		chosen.push(candidate);
		degree.set(candidate.fromId, fromDegree + 1);
		degree.set(candidate.toId, toDegree + 1);
	}

	return chosen.map((edge) => ({
		fromId: edge.fromId,
		toId: edge.toId,
	}));
};

const buildCategoryMarkerConstellationEdges = (
	points: MarkerConstellationPoint[],
	seed: string
): MarkerConstellationEdgeSeed[] => {
	if (points.length < 2) return [];

	const orderedGroups = getOrderedMarkerConstellationPointGroups(points);
	const edges: MarkerConstellationEdgeSeed[] = [];
	for (const { key, group } of orderedGroups) {
		const remainingBudget = MARKER_CONSTELLATION_MAX_EDGES - edges.length;
		if (remainingBudget <= 0) break;

		let groupEdges = buildMarkerConstellationEdgesForGroup(
			group,
			`${seed}|${key}|category`,
			remainingBudget,
			CATEGORY_MARKER_CONSTELLATION_MAX_EDGE_PX
		);
		if (groupEdges.length === 0 && group.length > 2) {
			groupEdges = buildSparseMarkerConstellationEdges(
				group,
				`${seed}|${key}|category-sparse`,
				CATEGORY_MARKER_CONSTELLATION_MAX_EDGE_PX
			);
		}

		edges.push(...groupEdges.slice(0, remainingBudget));
	}

	return edges;
};

// ============================================================================
// Beauty-mode point selection + scoring
// ============================================================================

const getMarkerConstellationPointStats = (
	points: MarkerConstellationPoint[]
): MarkerConstellationPointStats => {
	if (points.length === 0) {
		return {
			minX: 0,
			maxX: 0,
			minY: 0,
			maxY: 0,
			centerX: 0,
			centerY: 0,
			spanX: 0,
			spanY: 0,
			diagonal: 0,
		};
	}

	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;
	let sumX = 0;
	let sumY = 0;
	for (const point of points) {
		minX = Math.min(minX, point.x);
		maxX = Math.max(maxX, point.x);
		minY = Math.min(minY, point.y);
		maxY = Math.max(maxY, point.y);
		sumX += point.x;
		sumY += point.y;
	}
	const spanX = Math.max(0, maxX - minX);
	const spanY = Math.max(0, maxY - minY);
	return {
		minX,
		maxX,
		minY,
		maxY,
		centerX: sumX / points.length,
		centerY: sumY / points.length,
		spanX,
		spanY,
		diagonal: Math.hypot(spanX, spanY),
	};
};

const scaleMarkerConstellationPoints = (
	points: MarkerConstellationPoint[],
	scale: number
): MarkerConstellationPoint[] =>
	points.map((point) => ({
		...point,
		x: point.x * scale,
		y: point.y * scale,
	}));

const markerConstellationPointDistance = (
	a: MarkerConstellationPoint,
	b: MarkerConstellationPoint
): number => Math.hypot(a.x - b.x, a.y - b.y);

const markerConstellationAngleDiff = (a: number, b: number): number => {
	const diff = Math.abs(a - b) % (Math.PI * 2);
	return diff > Math.PI ? Math.PI * 2 - diff : diff;
};

const getBeautyConstellationTargetCount = (
	points: MarkerConstellationPoint[],
	level: MarkerConstellationLevel
): number => {
	const n = points.length;
	if (n <= 2) return n;

	const stats = getMarkerConstellationPointStats(points);
	if (level === 'wide') {
		const base = Math.round(Math.sqrt(n) * 1.15 + 3);
		const spanCapacity = Math.floor(stats.diagonal / 58) + 3;
		return Math.min(n, 14, Math.max(Math.min(n, 3), Math.min(base, spanCapacity)));
	}
	if (level === 'mid') {
		const base = Math.round(Math.sqrt(n) * 3.1 + 6);
		const spanCapacity = Math.floor(stats.diagonal / 34) + 6;
		return Math.min(n, 54, Math.max(Math.min(n, 5), Math.min(base, spanCapacity)));
	}

	const base = Math.round(Math.sqrt(n) * 5.5 + 12);
	const spanCapacity = Math.floor(stats.diagonal / 20) + 16;
	return Math.min(n, 120, Math.max(Math.min(n, 8), Math.min(base, spanCapacity)));
};

const selectBeautyConstellationPoints = (
	points: MarkerConstellationPoint[],
	seed: string,
	targetCount: number,
	minSeparationPx: number
): MarkerConstellationPoint[] => {
	if (points.length <= targetCount) return points.slice().sort((a, b) => a.id - b.id);
	if (targetCount <= 0) return [];

	const stats = getMarkerConstellationPointStats(points);
	const selected: MarkerConstellationPoint[] = [];
	const selectedIds = new Set<number>();
	const sorted = points.slice().sort((a, b) => a.id - b.id);

	const distanceToSelected = (point: MarkerConstellationPoint): number => {
		if (selected.length === 0) return Infinity;
		let minDistance = Infinity;
		for (const existing of selected) {
			minDistance = Math.min(minDistance, markerConstellationPointDistance(point, existing));
		}
		return minDistance;
	};

	const addPoint = (point: MarkerConstellationPoint): boolean => {
		if (selectedIds.has(point.id)) return false;
		selectedIds.add(point.id);
		selected.push(point);
		return true;
	};

	const pointAngle = (point: MarkerConstellationPoint): number => {
		const raw = Math.atan2(point.y - stats.centerY, point.x - stats.centerX);
		return raw < 0 ? raw + Math.PI * 2 : raw;
	};

	const sectorCount = Math.min(
		targetCount,
		Math.max(4, Math.round(targetCount * 0.72))
	);
	const sectorOrder = Array.from({ length: sectorCount }, (_, index) => index).sort(
		(a, b) =>
			hashStringToUint32(`${seed}|sector:${a}`) -
			hashStringToUint32(`${seed}|sector:${b}`)
	);

	for (const sector of sectorOrder) {
		if (selected.length >= targetCount) break;
		const start = (sector / sectorCount) * Math.PI * 2;
		const end = ((sector + 1) / sectorCount) * Math.PI * 2;
		let best: MarkerConstellationPoint | null = null;
		let bestScore = -Infinity;
		for (const point of sorted) {
			if (selectedIds.has(point.id)) continue;
			const angle = pointAngle(point);
			if (angle < start || angle >= end) continue;
			const radial = Math.hypot(point.x - stats.centerX, point.y - stats.centerY);
			const spacing = distanceToSelected(point);
			if (selected.length >= 2 && spacing < minSeparationPx * 0.62) continue;
			const jitter = hashStringToUint32(`${seed}|sector:${sector}|${point.id}`) / 0xffffffff;
			const score = radial + spacing * 0.24 + jitter * Math.max(8, stats.diagonal * 0.015);
			if (score > bestScore) {
				best = point;
				bestScore = score;
			}
		}
		if (best) addPoint(best);
	}

	let spacingFloor = minSeparationPx;
	while (selected.length < targetCount && spacingFloor >= minSeparationPx * 0.34) {
		let best: MarkerConstellationPoint | null = null;
		let bestScore = -Infinity;
		for (const point of sorted) {
			if (selectedIds.has(point.id)) continue;
			const minDistance = distanceToSelected(point);
			if (selected.length >= 2 && minDistance < spacingFloor) continue;

			const radial = Math.hypot(point.x - stats.centerX, point.y - stats.centerY);
			const angle = pointAngle(point);
			let minAngle = Math.PI;
			for (const existing of selected) {
				minAngle = Math.min(minAngle, markerConstellationAngleDiff(angle, pointAngle(existing)));
			}
			const jitter = hashStringToUint32(`${seed}|fill:${point.id}`) / 0xffffffff;
			const score =
				minDistance * 1.08 +
				radial * 0.34 +
				minAngle * Math.max(24, stats.diagonal * 0.08) +
				jitter * Math.max(8, stats.diagonal * 0.018);
			if (score > bestScore) {
				best = point;
				bestScore = score;
			}
		}
		if (best) {
			addPoint(best);
		} else {
			spacingFloor *= 0.78;
		}
	}

	for (const point of sorted) {
		if (selected.length >= targetCount) break;
		addPoint(point);
	}

	return selected.sort((a, b) => a.id - b.id);
};

const getSelectedMarkerConstellationTargetCount = (
	points: MarkerConstellationPoint[]
): number => {
	const n = points.length;
	if (n <= 18) return n;

	const stats = getMarkerConstellationPointStats(points);
	const base = Math.round(Math.sqrt(n) * 3.35 + 7);
	const spanCapacity = Math.floor(stats.diagonal / 32) + 8;
	return Math.min(
		n,
		SELECTED_MARKER_CONSTELLATION_MAX_ANCHORS,
		Math.max(
			Math.min(n, SELECTED_MARKER_CONSTELLATION_MIN_ANCHORS),
			Math.min(base, spanCapacity)
		)
	);
};

const buildSelectedMarkerConstellationEdgesForAnchors = (
	anchors: MarkerConstellationPoint[],
	clearancePoints: MarkerConstellationPoint[],
	seed: string
): MarkerConstellationEdgeSeed[] => {
	if (anchors.length < 2) return [];
	if (anchors.length === 2) {
		return [{ fromId: anchors[0].id, toId: anchors[1].id }];
	}

	const sorted = anchors.slice().sort((a, b) => a.id - b.id);
	const nearestDistances: number[] = [];
	for (let i = 0; i < sorted.length; i++) {
		let nearest = Infinity;
		for (let j = 0; j < sorted.length; j++) {
			if (i === j) continue;
			const dx = sorted[i].x - sorted[j].x;
			const dy = sorted[i].y - sorted[j].y;
			nearest = Math.min(nearest, Math.hypot(dx, dy));
		}
		if (Number.isFinite(nearest)) nearestDistances.push(nearest);
	}

	nearestDistances.sort((a, b) => a - b);
	const medianNearest =
		nearestDistances.length > 0
			? nearestDistances[Math.floor(nearestDistances.length / 2)]
			: MARKER_CONSTELLATION_MAX_EDGE_PX;
	const upperNearest =
		nearestDistances.length > 0
			? nearestDistances[Math.floor(nearestDistances.length * 0.75)]
			: MARKER_CONSTELLATION_MAX_EDGE_PX;
	const maxEdgePx = Math.min(
		SELECTED_MARKER_CONSTELLATION_MAX_EDGE_PX,
		Math.max(150, medianNearest * 2.8, upperNearest * 1.45)
	);

	const candidates: MarkerConstellationCandidate[] = [];
	for (let i = 0; i < sorted.length; i++) {
		for (let j = i + 1; j < sorted.length; j++) {
			const a = sorted[i];
			const b = sorted[j];
			const dx = a.x - b.x;
			const dy = a.y - b.y;
			const length = Math.hypot(dx, dy);
			if (
				!Number.isFinite(length) ||
				length < SELECTED_MARKER_CONSTELLATION_MIN_EDGE_PX ||
				length > maxEdgePx
			) {
				continue;
			}

			const pairKey = markerConstellationPairKey(a.id, b.id);
			const h = hashStringToUint32(`${seed}|selected:${pairKey}`);
			const candidate: MarkerConstellationCandidate = {
				fromId: a.id,
				toId: b.id,
				ax: a.x,
				ay: a.y,
				bx: b.x,
				by: b.y,
				length,
				score: length + (h / 0xffffffff) * 12,
			};
			if (markerConstellationCandidateCutsThroughPoint(candidate, clearancePoints)) {
				continue;
			}
			candidates.push(candidate);
		}
	}

	if (candidates.length === 0) return [];
	candidates.sort((a, b) => a.score - b.score);

	const parent = new Map<number, number>();
	for (const point of sorted) parent.set(point.id, point.id);
	const find = (id: number): number => {
		const p = parent.get(id);
		if (p == null || p === id) return id;
		const root = find(p);
		parent.set(id, root);
		return root;
	};
	const union = (a: number, b: number): boolean => {
		const rootA = find(a);
		const rootB = find(b);
		if (rootA === rootB) return false;
		parent.set(rootB, rootA);
		return true;
	};

	const degree = new Map<number, number>();
	const chosen: MarkerConstellationCandidate[] = [];
	const chosenKeys = new Set<string>();
	const maxDegree = sorted.length >= 10 ? 3 : 2;
	let branchDegreeThreeCount = 0;
	const maxBranchDegreeThree =
		sorted.length >= 18 ? 3 : sorted.length >= 10 ? 1 : 0;
	const targetEdges =
		sorted.length <= 16
			? sorted.length - 1
			: Math.max(1, Math.floor(sorted.length * 0.72));

	const canUseCandidate = (candidate: MarkerConstellationCandidate): boolean => {
		const fromDegree = degree.get(candidate.fromId) ?? 0;
		const toDegree = degree.get(candidate.toId) ?? 0;
		if (fromDegree >= maxDegree || toDegree >= maxDegree) return false;

		const wouldCreateThird =
			(maxDegree >= 3 && fromDegree === 2 ? 1 : 0) +
			(maxDegree >= 3 && toDegree === 2 ? 1 : 0);
		if (branchDegreeThreeCount + wouldCreateThird > maxBranchDegreeThree) return false;
		if (markerConstellationWouldCrossExistingEdge(candidate, chosen)) return false;
		return true;
	};

	const acceptCandidate = (candidate: MarkerConstellationCandidate) => {
		chosen.push(candidate);
		chosenKeys.add(markerConstellationPairKey(candidate.fromId, candidate.toId));
		const fromDegree = degree.get(candidate.fromId) ?? 0;
		const toDegree = degree.get(candidate.toId) ?? 0;
		if (maxDegree >= 3 && fromDegree === 2) branchDegreeThreeCount += 1;
		if (maxDegree >= 3 && toDegree === 2) branchDegreeThreeCount += 1;
		degree.set(candidate.fromId, fromDegree + 1);
		degree.set(candidate.toId, toDegree + 1);
	};

	for (const candidate of candidates) {
		if (chosen.length >= targetEdges) break;
		if (!canUseCandidate(candidate)) continue;
		if (!union(candidate.fromId, candidate.toId)) continue;
		acceptCandidate(candidate);
	}

	const maxExtraEdges = Math.min(
		Math.max(0, Math.floor(sorted.length * 0.08)),
		Math.max(0, MARKER_CONSTELLATION_MAX_EDGES - chosen.length)
	);
	const extraMaxLength = Math.min(maxEdgePx, medianNearest * 1.85);
	let addedExtra = 0;
	for (const candidate of candidates) {
		if (addedExtra >= maxExtraEdges) break;
		const key = markerConstellationPairKey(candidate.fromId, candidate.toId);
		if (chosenKeys.has(key)) continue;
		if (candidate.length > extraMaxLength) continue;
		if (!canUseCandidate(candidate)) continue;
		acceptCandidate(candidate);
		addedExtra += 1;
	}

	return chosen.map((edge) => ({ fromId: edge.fromId, toId: edge.toId }));
};

export const buildSelectedMarkerConstellationEdges = (
	points: MarkerConstellationPoint[],
	seed: string
): MarkerConstellationEdgeSeed[] => {
	if (points.length < 2) return [];
	if (points.length === 2) return [{ fromId: points[0].id, toId: points[1].id }];

	const targetCount = getSelectedMarkerConstellationTargetCount(points);
	const anchors =
		targetCount >= points.length
			? points.slice().sort((a, b) => a.id - b.id)
			: selectBeautyConstellationPoints(
					points,
					`${seed}|selected-anchors`,
					targetCount,
					34
				);

	const strictEdges = buildSelectedMarkerConstellationEdgesForAnchors(
		anchors,
		points,
		`${seed}|strict`
	);
	if (strictEdges.length > 0) return strictEdges;

	return buildSelectedMarkerConstellationEdgesForAnchors(
		anchors,
		anchors,
		`${seed}|relaxed`
	);
};

const scoreBeautyConstellationFormation = (
	allPoints: MarkerConstellationPoint[],
	selectedPoints: MarkerConstellationPoint[],
	edges: MarkerConstellationEdgeSeed[]
): number => {
	if (selectedPoints.length === 0) return -Infinity;
	const allStats = getMarkerConstellationPointStats(allPoints);
	const selectedStats = getMarkerConstellationPointStats(selectedPoints);
	const coverage =
		allStats.diagonal > 0 ? clamp(selectedStats.diagonal / allStats.diagonal, 0, 1) : 1;

	const pointById = new Map<number, MarkerConstellationPoint>();
	for (const point of selectedPoints) pointById.set(point.id, point);

	const edgeLengths: number[] = [];
	const degree = new Map<number, number>();
	for (const edge of edges) {
		const a = pointById.get(edge.fromId);
		const b = pointById.get(edge.toId);
		if (!a || !b) continue;
		edgeLengths.push(markerConstellationPointDistance(a, b));
		degree.set(edge.fromId, (degree.get(edge.fromId) ?? 0) + 1);
		degree.set(edge.toId, (degree.get(edge.toId) ?? 0) + 1);
	}

	const meanLength =
		edgeLengths.length > 0
			? edgeLengths.reduce((sum, length) => sum + length, 0) / edgeLengths.length
			: 0;
	const lengthVariance =
		edgeLengths.length > 0
			? edgeLengths.reduce((sum, length) => sum + Math.pow(length - meanLength, 2), 0) /
				edgeLengths.length
			: 0;
	const lengthRhythmPenalty =
		meanLength > 0 ? clamp(Math.sqrt(lengthVariance) / meanLength, 0, 2) : 1;
	let branchPenalty = 0;
	for (const value of degree.values()) {
		if (value > 3) branchPenalty += (value - 3) * 0.3;
	}

	const edgeDensity =
		selectedPoints.length > 1 ? edges.length / Math.max(1, selectedPoints.length - 1) : 0;
	const densityBalance = 1 - Math.abs(edgeDensity - 0.78);
	const linePresence = edges.length > 0 ? 1 : -0.8;

	return (
		coverage * 3.2 +
		densityBalance * 0.8 +
		linePresence -
		lengthRhythmPenalty * 0.65 -
		branchPenalty
	);
};

// ============================================================================
// Edge/node annotation + multi-level formation
// ============================================================================

const annotateMarkerConstellationEdges = (
	level: MarkerConstellationLevel,
	points: MarkerConstellationPoint[],
	edgeSeeds: MarkerConstellationEdgeSeed[]
): MarkerConstellationEdge[] => {
	if (edgeSeeds.length === 0) return [];

	const pointById = new Map<number, MarkerConstellationPoint>();
	for (const point of points) pointById.set(point.id, point);
	const ranked = edgeSeeds
		.map((edge, index) => {
			const a = pointById.get(edge.fromId);
			const b = pointById.get(edge.toId);
			const length = a && b ? markerConstellationPointDistance(a, b) : 0;
			return { edge, index, length };
		})
		.sort((a, b) => a.length - b.length || a.index - b.index);

	const rankByPair = new Map<string, number>();
	const denom = Math.max(1, ranked.length - 1);
	ranked.forEach((item, index) => {
		rankByPair.set(markerConstellationPairKey(item.edge.fromId, item.edge.toId), index / denom);
	});

	const opacityScale =
		level === 'wide' ? 1 : level === 'mid' ? 0.92 : edgeSeeds.length > 70 ? 0.72 : 0.82;
	return edgeSeeds.map((edge) => ({
		...edge,
		level,
		rank: rankByPair.get(markerConstellationPairKey(edge.fromId, edge.toId)) ?? 0,
		opacityScale,
	}));
};

const buildMarkerConstellationNodesForLevel = (
	level: MarkerConstellationLevel,
	edges: MarkerConstellationEdge[]
): MarkerConstellationNode[] => {
	const rankById = new Map<number, number>();
	for (const edge of edges) {
		const existingFrom = rankById.get(edge.fromId);
		if (existingFrom == null || edge.rank < existingFrom) rankById.set(edge.fromId, edge.rank);
		const existingTo = rankById.get(edge.toId);
		if (existingTo == null || edge.rank < existingTo) rankById.set(edge.toId, edge.rank);
	}

	const opacityScale = level === 'wide' ? 0.88 : level === 'mid' ? 0.78 : 0.62;
	return Array.from(rankById.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([id, rank]) => ({ id, level, rank, opacityScale }));
};

const buildBeautyConstellationLevel = (
	allPoints: MarkerConstellationPoint[],
	seed: string,
	level: MarkerConstellationLevel,
	minSeparationPx: number
): { edges: MarkerConstellationEdge[]; nodes: MarkerConstellationNode[]; score: number } => {
	if (allPoints.length < 2) return { edges: [], nodes: [], score: -Infinity };

	const targetCount = getBeautyConstellationTargetCount(allPoints, level);
	const variants = level === 'detail' ? 5 : 7;
	let bestEdges: MarkerConstellationEdge[] = [];
	let bestNodes: MarkerConstellationNode[] = [];
	let bestScore = -Infinity;

	for (let variant = 0; variant < variants; variant++) {
		const variantSeed = `${seed}|${level}|variant:${variant}`;
		const selected = selectBeautyConstellationPoints(
			allPoints,
			variantSeed,
			targetCount,
			minSeparationPx * (1 - variant * 0.035)
		);
		if (selected.length < 2) continue;

		let edgeSeeds =
			level === 'detail'
				? buildMarkerConstellationEdges(selected, `${variantSeed}|grouped`)
				: buildSparseMarkerConstellationEdges(selected, `${variantSeed}|sparse`);
		if (edgeSeeds.length === 0) {
			edgeSeeds = buildSparseMarkerConstellationEdges(selected, `${variantSeed}|fallback`);
		}

		const score = scoreBeautyConstellationFormation(allPoints, selected, edgeSeeds);
		if (score <= bestScore) continue;

		bestScore = score;
		bestEdges = annotateMarkerConstellationEdges(level, selected, edgeSeeds);
		bestNodes = buildMarkerConstellationNodesForLevel(level, bestEdges);
	}

	return { edges: bestEdges, nodes: bestNodes, score: bestScore };
};

// Build a three-level (wide / mid / detail) constellation formation. The
// wide level uses fewer, longer edges visible from globe zoom; detail uses
// many, short edges visible only when zoomed in.
export const buildBeautyMarkerConstellationFormation = (
	points: MarkerConstellationPoint[],
	seed: string,
	sourceZoom: number
): MarkerConstellationFormation => {
	if (points.length < 2) {
		return { edges: [], nodes: [], lowZoomNodeIds: new Set() };
	}

	const scaledForZoom = (zoom: number) =>
		scaleMarkerConstellationPoints(points, Math.pow(2, zoom - sourceZoom));

	const wide = buildBeautyConstellationLevel(
		scaledForZoom(MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM),
		`${seed}|wide`,
		'wide',
		58
	);
	const mid = buildBeautyConstellationLevel(
		scaledForZoom(MARKER_CONSTELLATION_MID_COMPOSE_ZOOM),
		`${seed}|mid`,
		'mid',
		38
	);
	const detailComposeZoom = Math.max(
		MARKER_CONSTELLATION_DETAIL_COMPOSE_ZOOM,
		Math.min(sourceZoom, 10.5)
	);
	const detail = buildBeautyConstellationLevel(
		scaledForZoom(detailComposeZoom),
		`${seed}|detail`,
		'detail',
		24
	);

	const edges = [...wide.edges, ...mid.edges, ...detail.edges].slice(
		0,
		MARKER_CONSTELLATION_MAX_EDGES * 2
	);
	const nodes = [...wide.nodes, ...mid.nodes, ...detail.nodes];
	const lowZoomNodeIds = new Set<number>();
	for (const node of nodes) lowZoomNodeIds.add(node.id);

	return { edges, nodes, lowZoomNodeIds };
};

export const buildCategoryMarkerConstellationFormation = (
	points: MarkerConstellationPoint[],
	seed: string
): MarkerConstellationFormation => {
	if (points.length < 2) {
		return { edges: [], nodes: [], lowZoomNodeIds: new Set() };
	}

	const edgeSeeds = buildCategoryMarkerConstellationEdges(points, seed);
	const edges = annotateMarkerConstellationEdges('mid', points, edgeSeeds);
	const nodes = buildMarkerConstellationNodesForLevel('mid', edges);
	const lowZoomNodeIds = new Set<number>();
	for (const node of nodes) lowZoomNodeIds.add(node.id);

	return { edges, nodes, lowZoomNodeIds };
};
