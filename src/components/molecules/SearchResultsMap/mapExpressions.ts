import { parseHexColor, toHexByte } from './color';
import {
	CURATED_DOT_FADE_END_ZOOM,
	CURATED_DOT_FADE_START_ZOOM,
	CURATED_ORB_TRANSITION_END_ZOOM,
	CURATED_ORB_TRANSITION_START_ZOOM,
	MARKER_CONSTELLATION_EDGE_RANK_OPACITY_EXPR,
	MARKER_CONSTELLATION_NODE_RANK_OPACITY_EXPR,
	NON_CONSTELLATION_FADE_END_ZOOM,
	NON_CONSTELLATION_FADE_START_ZOOM,
	ORB_FADE_MARKER_FEATURE_EXPR,
	RESULT_DOT_GLOW_OPACITY,
	SELECTED_STATE_ORB_FADE_MARKER_FEATURE_EXPR,
} from './constants';
import { clamp } from './math';

// ============================================================================
// Curated orb transition
// ============================================================================

export const computeCuratedOrbT = (zoom: number) => {
	if (zoom >= CURATED_ORB_TRANSITION_START_ZOOM) return 0;
	if (zoom <= CURATED_ORB_TRANSITION_END_ZOOM) return 1;
	const raw =
		(CURATED_ORB_TRANSITION_START_ZOOM - zoom) /
		(CURATED_ORB_TRANSITION_START_ZOOM - CURATED_ORB_TRANSITION_END_ZOOM);
	return raw * raw * (3 - 2 * raw);
};

// ============================================================================
// Generic Mapbox opacity expression composition
// ============================================================================

const multiplyOpacityExpr = (opacity: any, multiplier?: any): any =>
	multiplier == null ? opacity : ['*', opacity, multiplier];

// ============================================================================
// Result-dot / selected-marker / categorized-dot opacity expressions
// ============================================================================

export const getNormalMarkerFadeOpacityExpr = (): any => [
	'-',
	1,
	['coalesce', ['feature-state', 'selectedMarkerT'], 0],
];

export const getSelectedStateOrbZoomFadedOpacity = (
	opacity: number,
	opacityMultiplier?: any
): any => [
	'interpolate',
	['linear'],
	['zoom'],
	CURATED_DOT_FADE_END_ZOOM,
	multiplyOpacityExpr(
		['case', SELECTED_STATE_ORB_FADE_MARKER_FEATURE_EXPR, 0, opacity],
		opacityMultiplier
	),
	CURATED_DOT_FADE_START_ZOOM,
	multiplyOpacityExpr(opacity, opacityMultiplier),
];

export const getCategorizedDotZoomFadedOpacity = (
	opacityMultiplier?: any
): any => {
	const nonUncategorizedVisible = [
		'case',
		['boolean', ['get', 'isUncategorized'], false],
		0,
		['case', ['boolean', ['feature-state', 'inConstellation'], true], 1, 0],
	];
	return [
		'interpolate',
		['linear'],
		['zoom'],
		CURATED_DOT_FADE_END_ZOOM,
		multiplyOpacityExpr(
			[
				'case',
				['boolean', ['get', 'isUncategorized'], false],
				0,
				[
					'case',
					ORB_FADE_MARKER_FEATURE_EXPR,
					0,
					['case', ['boolean', ['feature-state', 'inConstellation'], true], 1, 0],
				],
			],
			opacityMultiplier
		),
		CURATED_DOT_FADE_START_ZOOM,
		multiplyOpacityExpr(nonUncategorizedVisible, opacityMultiplier),
		NON_CONSTELLATION_FADE_END_ZOOM,
		multiplyOpacityExpr(nonUncategorizedVisible, opacityMultiplier),
		NON_CONSTELLATION_FADE_START_ZOOM,
		multiplyOpacityExpr(
			['case', ['boolean', ['get', 'isUncategorized'], false], 0, 1],
			opacityMultiplier
		),
	];
};

export const getCategorizedDotGlowZoomFadedOpacity = (
	opacityMultiplier?: any
): any => {
	const nonUncategorizedGlowVisible = [
		'case',
		['boolean', ['get', 'isUncategorized'], false],
		0,
		[
			'case',
			['boolean', ['feature-state', 'inConstellation'], true],
			RESULT_DOT_GLOW_OPACITY,
			0,
		],
	];
	return [
		'interpolate',
		['linear'],
		['zoom'],
		CURATED_DOT_FADE_END_ZOOM,
		multiplyOpacityExpr(
			[
				'case',
				['boolean', ['get', 'isUncategorized'], false],
				0,
				[
					'case',
					ORB_FADE_MARKER_FEATURE_EXPR,
					0,
					[
						'case',
						['boolean', ['feature-state', 'inConstellation'], true],
						RESULT_DOT_GLOW_OPACITY,
						0,
					],
				],
			],
			opacityMultiplier
		),
		CURATED_DOT_FADE_START_ZOOM,
		multiplyOpacityExpr(nonUncategorizedGlowVisible, opacityMultiplier),
		NON_CONSTELLATION_FADE_END_ZOOM,
		multiplyOpacityExpr(nonUncategorizedGlowVisible, opacityMultiplier),
		NON_CONSTELLATION_FADE_START_ZOOM,
		multiplyOpacityExpr(
			[
				'case',
				['boolean', ['get', 'isUncategorized'], false],
				0,
				RESULT_DOT_GLOW_OPACITY,
			],
			opacityMultiplier
		),
	];
};

export const getSelectedMarkerZoomFadedOpacity = (
	opacityMultiplier?: any
): any => [
	'interpolate',
	['linear'],
	['zoom'],
	CURATED_DOT_FADE_END_ZOOM,
	0,
	CURATED_DOT_FADE_START_ZOOM,
	multiplyOpacityExpr(1, opacityMultiplier),
];

export const getSelectedMarkerIconOpacityExpr = (): any => {
	const markerFadeOpacity = ['coalesce', ['get', 'selectedMarkerOpacity'], 1];
	return getSelectedMarkerZoomFadedOpacity(markerFadeOpacity);
};

// ============================================================================
// Marker hover (darken + show hover overlay)
// ============================================================================

export const MARKER_HOVER_DARKEN_AMOUNT = 0.14;

export const MARKER_HOVER_FEATURE_STATE_EXPR: any = [
	'boolean',
	['feature-state', 'markerHover'],
	false,
];

export const darkenHexColor = (
	hex: string,
	amount = MARKER_HOVER_DARKEN_AMOUNT
): string => {
	const rgb = parseHexColor(hex);
	if (!rgb) return hex;
	const t = clamp(amount, 0, 1);
	return `#${toHexByte(rgb.r * (1 - t))}${toHexByte(rgb.g * (1 - t))}${toHexByte(
		rgb.b * (1 - t)
	)}`;
};

export const getMarkerHoverFillColorExpr = (): any => [
	'case',
	MARKER_HOVER_FEATURE_STATE_EXPR,
	['coalesce', ['get', 'hoverFillColor'], ['get', 'fillColor']],
	['get', 'fillColor'],
];

export const getMarkerHoverOpacityExpr = (): any => [
	'case',
	MARKER_HOVER_FEATURE_STATE_EXPR,
	1,
	0,
];

export const getSelectedMarkerHoverIconOpacityExpr = (): any => {
	const markerFadeOpacity = ['coalesce', ['get', 'selectedMarkerOpacity'], 1];
	return getSelectedMarkerZoomFadedOpacity([
		'*',
		markerFadeOpacity,
		getMarkerHoverOpacityExpr(),
	]);
};

// ============================================================================
// Selected-marker animation tuning
// ============================================================================

export const SELECTED_MARKER_FADE_MS = 115;
export const SELECTED_MARKER_ENTRY_OPACITY = 0.58;
export const SELECTED_MARKER_SCALE_MULTIPLIER = 1.78;
export const SELECTED_MARKER_INITIAL_TRANSFORM_SCALE = 0.7;

// ============================================================================
// Marker constellation paint expressions
// ============================================================================

const markerConstellationLevelOpacityAtZoomStop = (
	wide: number,
	mid: number,
	detail: number
): any => [
	'case',
	['==', ['get', 'level'], 'wide'],
	wide,
	['==', ['get', 'level'], 'mid'],
	mid,
	['==', ['get', 'level'], 'detail'],
	detail,
	0,
];

const markerConstellationEdgeOpacityAtZoomStop = (
	opacity: number,
	wide: number,
	mid: number,
	detail: number
): any => [
	'*',
	opacity,
	markerConstellationLevelOpacityAtZoomStop(wide, mid, detail),
	MARKER_CONSTELLATION_EDGE_RANK_OPACITY_EXPR,
	['coalesce', ['get', 'opacityScale'], 1],
];

const markerConstellationNodeOpacityAtZoomStop = (
	opacity: number,
	wide: number,
	mid: number,
	detail: number
): any => [
	'*',
	opacity,
	markerConstellationLevelOpacityAtZoomStop(wide, mid, detail),
	MARKER_CONSTELLATION_NODE_RANK_OPACITY_EXPR,
	['coalesce', ['get', 'opacityScale'], 1],
];

export const getMarkerConstellationZoomFadedOpacity = (opacity: any): any => {
	if (typeof opacity !== 'number') return opacity;
	if (opacity <= 0) return 0;
	const unifiedOpacity = markerConstellationEdgeOpacityAtZoomStop(opacity, 1, 1, 1);
	return [
		'interpolate',
		['linear'],
		['zoom'],
		3.6,
		0,
		4.2,
		unifiedOpacity,
		13,
		unifiedOpacity,
	];
};

export const getSelectedMarkerConstellationZoomFadedOpacity = (
	opacity: number
): any => {
	if (opacity <= 0) return 0;
	const unifiedOpacity = [
		'*',
		opacity,
		['coalesce', ['get', 'selectedLineOpacity'], 1],
	];
	return [
		'interpolate',
		['linear'],
		['zoom'],
		3.6,
		0,
		4.2,
		unifiedOpacity,
		13,
		unifiedOpacity,
	];
};

export const getMarkerConstellationNodeZoomFadedOpacity = (
	opacity: number
): any => {
	if (opacity <= 0) return 0;
	const unifiedOpacity = markerConstellationNodeOpacityAtZoomStop(opacity, 1, 1, 1);
	return [
		'interpolate',
		['linear'],
		['zoom'],
		3.6,
		0,
		4.2,
		unifiedOpacity,
		13,
		unifiedOpacity,
	];
};
