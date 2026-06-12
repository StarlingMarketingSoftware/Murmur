import mapboxgl from 'mapbox-gl';
import {
	MAP_MIN_ZOOM,
	MAPBOX_LAYER_IDS,
	NIGHT_STATE_LINE_DARKEN_MAX,
	STATE_DIVIDER_LINES_MAX_ZOOM,
	STATE_LABEL_COLOR,
} from './constants';
import { mixCssRgb } from './color';
import { clamp } from './math';

const getNightStateLineDarkenT = (nightT: number) => {
	const night = clamp(nightT, 0, 1);
	const eased = night * night * (3 - 2 * night);
	return clamp(eased * NIGHT_STATE_LINE_DARKEN_MAX, 0, 1);
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
