import mapboxgl from 'mapbox-gl';
import {
	MAP_MIN_ZOOM,
	MAPBOX_LAYER_IDS,
	NIGHT_STATE_LINE_DARKEN_MAX,
	STATE_DIVIDER_LINES_MAX_ZOOM,
	STATE_LABEL_COLOR,
	STATE_LABELS_FULL_OPACITY_ZOOM,
} from './constants';
import { mixCssRgb } from './color';
import { clamp } from './math';

const getNightStateLineDarkenT = (nightT: number) => {
	const night = clamp(nightT, 0, 1);
	const eased = night * night * (3 - 2 * night);
	return clamp(eased * NIGHT_STATE_LINE_DARKEN_MAX, 0, 1);
};

// The near-floor stops below take `floorDelta` — the viewport-proportional
// raise of the interactive zoom floor (see getInteractiveMapMinZoomDelta).
// Shifting only the near-floor stops keeps each ramp's shape, so the view at
// the raised floor matches the old view at MAP_MIN_ZOOM exactly; the
// zoomed-in stops (5/8/9/14) stay machine-independent.

export const buildStateLabelsTextOpacityExpr = (overlay: number, floorDelta = 0) => [
	'interpolate',
	['linear'],
	['zoom'],
	MAP_MIN_ZOOM + floorDelta,
	0,
	STATE_LABELS_FULL_OPACITY_ZOOM + floorDelta,
	overlay,
];

export const buildStateDividerLineOpacityExpr = (floorDelta = 0) => [
	'interpolate',
	['linear'],
	['zoom'],
	MAP_MIN_ZOOM + floorDelta,
	0,
	// Max shifted stop: 2.25 + 1.25 + 1.25 = 4.75 < the fixed 5 stop.
	MAP_MIN_ZOOM + 1.25 + floorDelta,
	0.5,
	5,
	0.65,
	STATE_DIVIDER_LINES_MAX_ZOOM,
	0.74,
];

export const buildStateInteractiveBorderOpacityExpr = (floorDelta = 0) => {
	const isSelected = ['boolean', ['feature-state', 'selected'], false];
	return [
		'interpolate',
		['linear'],
		['zoom'],
		MAP_MIN_ZOOM + floorDelta,
		['case', isSelected, 0, 0],
		MAP_MIN_ZOOM + 1.25 + floorDelta,
		['case', isSelected, 1, 0.6],
		5,
		['case', isSelected, 1, 0.75],
		9,
		['case', isSelected, 1, 0.82],
		14,
		['case', isSelected, 1, 0.7],
	];
};

export const buildStateDividerLineWidthExpr = () => [
	'interpolate',
	['linear'],
	['zoom'],
	MAP_MIN_ZOOM,
	0.8,
	5,
	1.0,
	STATE_DIVIDER_LINES_MAX_ZOOM,
	1.4,
];

export const buildStateInteractiveBorderWidthExpr = () => {
	const isSelected = ['boolean', ['feature-state', 'selected'], false];
	return [
		'interpolate',
		['linear'],
		['zoom'],
		MAP_MIN_ZOOM,
		// Selected state should be only subtly emphasized.
		['case', isSelected, 0.9, 0.7],
		5,
		['case', isSelected, 1.05, 0.85],
		9,
		['case', isSelected, 1.05, 0.85],
		14,
		['case', isSelected, 0.9, 0.6],
	];
};

export const buildStateInteractiveBorderColorExpr = (nightT: number) => {
	const darkenT = getNightStateLineDarkenT(nightT);
	const darken = (rgb: [number, number, number]) => mixCssRgb(rgb, [0, 0, 0], darkenT);
	const isSelected = ['boolean', ['feature-state', 'selected'], false];
	return [
		'interpolate',
		['linear'],
		['zoom'],
		MAP_MIN_ZOOM,
		['case', isSelected, darken([255, 255, 255]), darken([148, 163, 184])],
		6,
		['case', isSelected, darken([255, 255, 255]), darken([148, 163, 184])],
		14,
		['case', isSelected, darken([255, 255, 255]), darken([207, 216, 220])],
	];
};

export const buildLockedStateOutlineWidthExpr = () => [
	'interpolate',
	['linear'],
	['zoom'],
	3.4,
	1.7,
	5,
	4.1,
	12,
	3,
];

export const applyStateOverlayNightColors = (
	mapInstance: mapboxgl.Map,
	nightT: number
) => {
	const darkenT = getNightStateLineDarkenT(nightT);
	const dividerColor = mixCssRgb([122, 135, 153], [0, 0, 0], darkenT);
	const borderColor = buildStateInteractiveBorderColorExpr(nightT);
	const labelColor = STATE_LABEL_COLOR;
	const labelHaloOpacity = 0;

	try {
		if (mapInstance.getLayer(MAPBOX_LAYER_IDS.statesDividers)) {
			mapInstance.setPaintProperty(
				MAPBOX_LAYER_IDS.statesDividers,
				'line-color',
				dividerColor
			);
			mapInstance.setPaintProperty(
				MAPBOX_LAYER_IDS.statesDividers,
				'line-width',
				buildStateDividerLineWidthExpr() as any
			);
		}
		if (mapInstance.getLayer(MAPBOX_LAYER_IDS.statesBordersInteractive)) {
			mapInstance.setPaintProperty(
				MAPBOX_LAYER_IDS.statesBordersInteractive,
				'line-color',
				borderColor as any
			);
			mapInstance.setPaintProperty(
				MAPBOX_LAYER_IDS.statesBordersInteractive,
				'line-width',
				buildStateInteractiveBorderWidthExpr() as any
			);
		}
		if (mapInstance.getLayer(MAPBOX_LAYER_IDS.statesLabels)) {
			mapInstance.setPaintProperty(
				MAPBOX_LAYER_IDS.statesLabels,
				'text-color',
				labelColor
			);
			mapInstance.setPaintProperty(
				MAPBOX_LAYER_IDS.statesLabels,
				'text-halo-color',
				`rgba(2, 8, 23, ${labelHaloOpacity.toFixed(3)})`
			);
			mapInstance.setPaintProperty(MAPBOX_LAYER_IDS.statesLabels, 'text-halo-width', 0);
			mapInstance.setPaintProperty(MAPBOX_LAYER_IDS.statesLabels, 'text-halo-blur', 0);
		}
	} catch {
		// Non-fatal.
	}
};
