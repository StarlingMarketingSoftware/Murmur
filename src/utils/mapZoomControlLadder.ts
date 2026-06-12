// Shared zoom-control "ladder" for the dashboard map view and the campaign
// page sliders (MapSelectGrabStarterBox). The slider itself deals only in
// fractional level indices 0..N-1; these helpers convert between that index
// domain and Mapbox zoom values. History: both pages carried their own copy of
// the levels + converters (the campaign copy said "Match dashboard map-view
// zoom calibration") — same drift hazard murmurChromeZoom.ts was created for.
//
// The interactive map's minimum zoom is viewport-proportional on large
// monitors (see getInteractiveMapMinZoomDelta in SearchResultsMap/constants):
// buildZoomControlLevels rebases the ladder so index 0 lands exactly on the
// live floor — otherwise the bottom of the slider becomes a dead zone that
// requests zooms the map clamps away.

// 21 entries; count must stay equal to MAP_SELECT_GRAB_ZOOM_LEVEL_COUNT
// (MapSelectGrabTool.tsx) — the slider has 21 hand-tuned thumb stops.
export const MAP_ZOOM_CONTROL_BASE_LEVELS: readonly number[] = [
	2.25, 2.41, 2.57, 2.73, 2.88, 3.04, 3.2, 3.52, 3.83, 4.15, 4.47, 4.78, 5.1, 5.34,
	5.58, 5.81, 6.05, 6.29, 6.52, 6.76, 7,
] as const;

export const MAP_ZOOM_CONTROL_MAX_INDEX = MAP_ZOOM_CONTROL_BASE_LEVELS.length - 1;

const BASE_MIN = MAP_ZOOM_CONTROL_BASE_LEVELS[0];
const BASE_MAX = MAP_ZOOM_CONTROL_BASE_LEVELS[MAP_ZOOM_CONTROL_MAX_INDEX];

export const clampZoomControlValue = (levelValue: number): number => {
	if (!Number.isFinite(levelValue)) return 0;
	return Math.min(Math.max(levelValue, 0), MAP_ZOOM_CONTROL_MAX_INDEX);
};

// Linear remap of the base ladder from [BASE_MIN, BASE_MAX] to
// [minZoom, BASE_MAX]. Identity (the base array itself, referentially) when
// minZoom is at/below the base floor — i.e. on ≤1080p viewports and mobile.
export const buildZoomControlLevels = (minZoom: number): readonly number[] => {
	if (!Number.isFinite(minZoom) || minZoom <= BASE_MIN) {
		return MAP_ZOOM_CONTROL_BASE_LEVELS;
	}
	// Defensive: the real floor caps well below this (delta ≤ 1.25 → 3.5).
	const safeMin = Math.min(minZoom, BASE_MAX - 0.5);
	const scale = (BASE_MAX - safeMin) / (BASE_MAX - BASE_MIN);
	return MAP_ZOOM_CONTROL_BASE_LEVELS.map(
		(level) => safeMin + (level - BASE_MIN) * scale
	);
};

export const zoomForControlValue = (
	levels: readonly number[],
	levelValue: number
): number => {
	const safeValue = clampZoomControlValue(levelValue);
	const lowerIndex = Math.floor(safeValue);
	const upperIndex = Math.min(lowerIndex + 1, MAP_ZOOM_CONTROL_MAX_INDEX);
	const progress = safeValue - lowerIndex;
	const lowerZoom = levels[lowerIndex] ?? levels[0];
	const upperZoom = levels[upperIndex] ?? lowerZoom;
	return lowerZoom + (upperZoom - lowerZoom) * progress;
};

export const controlValueForZoom = (
	levels: readonly number[],
	zoom: number
): number => {
	if (!Number.isFinite(zoom)) return 0;
	const minZoom = levels[0] ?? 0;
	const maxZoom = levels[MAP_ZOOM_CONTROL_MAX_INDEX] ?? minZoom;
	if (zoom <= minZoom) return 0;
	if (zoom >= maxZoom) return MAP_ZOOM_CONTROL_MAX_INDEX;

	for (let index = 0; index < MAP_ZOOM_CONTROL_MAX_INDEX; index += 1) {
		const lowerZoom = levels[index] ?? minZoom;
		const upperZoom = levels[index + 1] ?? lowerZoom;
		if (zoom <= upperZoom) {
			const span = upperZoom - lowerZoom;
			if (span <= 0) return index;
			return index + (zoom - lowerZoom) / span;
		}
	}

	return MAP_ZOOM_CONTROL_MAX_INDEX;
};
