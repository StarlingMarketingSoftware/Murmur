'use client';

import {
	FC,
	Fragment,
	memo,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from 'react';
import mapboxgl from 'mapbox-gl';
import { ContactWithName } from '@/types/contact';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { useGetContactsMapOverlay } from '@/hooks/queryHooks/useContacts';
import {
	BOOKING_CONTACT_TITLE_PREFIXES,
	PROMOTION_CONTACT_TITLE_PREFIXES,
} from '@/constants/contactCategories';
import {
	calculateTooltipWidth,
	calculateTooltipHeight,
	calculateTooltipAnchorY,
	generateMapTooltipIconUrl,
	MAP_TOOLTIP_ANCHOR_X,
} from '@/components/atoms/_svg/MapTooltipIcon';
import {
	generateMapMarkerPinIconUrl,
	generateUncategorizedContactMarkerIconUrl,
	MAP_MARKER_PIN_CIRCLE_CENTER_X,
	MAP_MARKER_PIN_CIRCLE_CENTER_Y,
	MAP_MARKER_PIN_CIRCLE_DIAMETER,
	MAP_MARKER_PIN_VIEWBOX_HEIGHT,
	MAP_MARKER_PIN_VIEWBOX_WIDTH,
} from '@/components/atoms/_svg/MapMarkerPinIcon';
import { isCleanMapMarkerCategory } from '@/components/atoms/_svg/mapTooltipCategoryIcons';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import {
	isRestaurantTitle,
	isCoffeeShopTitle,
	isMusicVenueTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
	getWineBeerSpiritsLabel,
} from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { WeatherMood } from '@/lib/weather/regions';
import {
	getMoodConfig,
	MoodVisualConfig,
	SOFTBOX_DARK_POOL_BG,
	SOFTBOX_WARM_KEY_BG,
} from '@/lib/weather/moodConfig';
import type {
	AreaSelectPayload,
	BasemapCartographyClipState,
	BoundingBox,
	ClippingCoord,
	ClippingMultiPolygon,
	ClippingPolygon,
	ClippingRing,
	CuratedBlobCluster,
	CuratedBlobMercatorPoint,
	CuratedBlobMorphSource,
	DotWaveMeta,
	GeoJsonFeatureCollection,
	GeoJsonGeometry,
	GlobeNightLightingLike,
	GlobeSunPhase,
	LatLngLiteral,
	MapSelectionBounds,
	MarkerConstellationCandidate,
	MarkerConstellationEdge,
	MarkerConstellationEdgeSeed,
	MarkerConstellationFormation,
	MarkerConstellationLevel,
	MarkerConstellationNode,
	MarkerConstellationPoint,
	MarkerConstellationPointStats,
	MarkerHoverMeta,
	OutlinePolygonFeatureCollection,
	ParsedCssColor,
	PreparedClippingPolygon,
	RgbColor,
	RuntimeMoodVisualConfig,
	ScoredContact,
	SearchMode,
	SnowCloudInteractionImpact,
	SnowParticle,
	StormLightningCell,
	StormLightningEvent,
	StormLightningEventKind,
	StormLightningPulse,
	SunTransitionVisualState,
	WasmGeoModule,
	WorldSegment,
} from './types';
import {
	ALL_CONTACTS_DOT_GLOW_OPACITY,
	ALL_CONTACTS_OVERLAY_DOT_FILL_COLOR,
	ALL_CONTACTS_OVERLAY_LIMIT,
	ALL_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM,
	ALL_CONTACTS_OVERLAY_TOOLTIP_FILL_COLOR,
	AUTO_FIT_CONTACTS_MAX_ZOOM,
	AUTO_FIT_STATE_MAX_ZOOM,
	BOOKING_EXTRA_MARKERS_MAX_DOTS,
	BOOKING_EXTRA_MARKERS_MIN_ZOOM,
	BOOKING_EXTRA_PIN_HOVER_STROKE_COLOR,
	BOOKING_EXTRA_TITLE_PREFIXES,
	CATEGORIZED_DOT_GLOW_ZOOM_FADE_EXPR,
	CATEGORIZED_DOT_ZOOM_FADE_EXPR,
	CLOUDS_CANVAS_COORDINATES,
	CLOUDS_CANVAS_SIZE_PX,
	CLOUDS_CANVAS_TEXTURE_URL,
	CLOUDS_DRIFT_AMPLITUDE_X_PX,
	CLOUDS_DRIFT_AMPLITUDE_Y_PX,
	CLOUDS_DRIFT_BASE_ZOOM,
	CLOUDS_DRIFT_LOOP_MS,
	CLOUDS_DRIFT_SPEED_X_PX_PER_S,
	CLOUDS_DRIFT_SPEED_Y_PX_PER_S,
	CLOUDS_DRIFT_TIME_SCALE,
	CLOUDS_DRIFT_UPDATE_MS,
	CLOUDS_DRIFT_ZOOM_SCALE_EXP,
	CLOUDS_DRIFT_ZOOM_SCALE_MAX,
	CLOUDS_DRIFT_ZOOM_SCALE_MIN,
	CLOUDS_EXTRA_PASS_OFFSETS,
	CLOUDS_OVERLAY_FADE_OUT_END_ZOOM,
	CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
	CLOUDS_POLAR_TAPER_END_DEG,
	CLOUDS_POLAR_TAPER_START_DEG,
	CLOUDS_SNOW_INTERACTION_MAX_REFRACT_SHIFT_PX,
	CLOUDS_SNOW_INTERACTION_STAMP_SIZE_PX,
	CLOUDS_SNOW_INTERACTION_TARGET_IMPACTS,
	CLOUDS_SNOW_INTERACTION_TARGET_IMPACTS_REDUCED,
	CLOUDS_TILES_MAX_ZOOM,
	CLOUDS_TILES_URL_TEMPLATE,
	CLOUDS_TURBULENCE_AMPLITUDE_X_PX,
	CLOUDS_TURBULENCE_LOOP_MS,
	CLOUDS_TURBULENCE_STRIP_PX,
	CONTACT_LIGHTS_REVEAL_TILES_URL_TEMPLATE,
	CONTACT_LIGHTS_TILES_BOUNDS,
	CONTACT_LIGHTS_TILES_MAX_ZOOM,
	CONTACT_LIGHTS_TILES_URL_TEMPLATE,
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
	CURATED_BLOB_OUTLINE_SMOOTHING_PASSES,
	CURATED_BLOB_SHAPE_STEPS,
	CURATED_BLOB_SINGLETON_LOBE_OFFSET_KM,
	CURATED_BLOB_SINGLETON_LOBE_RADIUS_KM,
	CURATED_DOT_FADE_END_ZOOM,
	CURATED_DOT_FADE_START_ZOOM,
	CURATED_DOT_ZOOM_FADE_EXPR,
	CURATED_ORB_BLOOM_OPACITY,
	CURATED_ORB_COLOR_BLEND_OPACITY,
	CURATED_ORB_ELLIPSE_RX_RATIO,
	CURATED_ORB_ELLIPSE_RY_RATIO,
	CURATED_ORB_GRADIENT_ROTATION_DEG,
	CURATED_ORB_GRADIENT_SCALE_X_RATIO,
	CURATED_ORB_GRADIENT_SCALE_Y_RATIO,
	CURATED_ORB_MIN_RADIUS_KM,
	CURATED_ORB_RADIUS_PADDING_KM,
	CURATED_ORB_SLOT_COUNT,
	CURATED_ORB_SMALL_SHAPE_MIN_RADIUS_KM,
	CURATED_ORB_SMALL_SHAPE_THRESHOLD_KM,
	CURATED_ORB_SOURCE_VIEWBOX_HALF_HEIGHT,
	CURATED_ORB_SOURCE_VIEWBOX_HALF_WIDTH,
	CURATED_ORB_TRANSITION_END_ZOOM,
	CURATED_ORB_TRANSITION_START_ZOOM,
	CURATED_STABLE_MARKER_MAX_DOTS,
	DASHBOARD_DECORATIVE_CENTER,
	DASHBOARD_DECORATIVE_OFFSET_PX,
	DASHBOARD_DECORATIVE_PITCH,
	DASHBOARD_DECORATIVE_ZOOM,
	DASHBOARD_TO_INTERACTIVE_HANDOFF_GLIDE_MS,
	DASHBOARD_TO_INTERACTIVE_TRANSITION_CSS_EASING,
	DASHBOARD_TO_INTERACTIVE_TRANSITION_MS,
	DAY_FAR_SIDE_SHADE_CANVAS_SIZE_PX,
	DAY_FAR_SIDE_SHADE_DAYTIME_DRIFT_DEG,
	DAY_FAR_SIDE_SHADE_FADE_END_DEG,
	DAY_FAR_SIDE_SHADE_FADE_POWER,
	DAY_FAR_SIDE_SHADE_FADE_START_DEG,
	DAY_FAR_SIDE_SHADE_MAX_ALPHA,
	DAY_FAR_SIDE_SHADE_MIN_REPAINT_DELTA_DEG,
	DAY_FAR_SIDE_SHADE_OPACITY_MULTIPLIER,
	DAY_FAR_SIDE_SHADE_REPAINT_MS,
	DEFAULT_MAX_ZOOM_FALLBACK,
	DEFAULT_RESULT_DOT_COLOR,
	DOT_WAVE_DELAY_PROP,
	DOT_WAVE_EASING,
	DOT_WAVE_FADE_MS,
	DOT_WAVE_FRAME_MS,
	DOT_WAVE_JITTER_MS,
	DOT_WAVE_SMOOTH_TRANSITION_MS,
	DOT_WAVE_TRAVEL_MS_MAX,
	DOT_WAVE_TRAVEL_MS_MIN,
	DUPLICATE_JITTER_BASE_DEG,
	EARTH_RADIUS_KM,
	EMPTY_POLYGON_FC,
	GLOOM_WASH_FADE_END_ZOOM,
	GLOOM_WASH_FADE_START_ZOOM,
	GOLDEN_ANGLE,
	HOT_TEMPERATURE_THRESHOLD_F,
	HOT_WASH_OPACITY,
	HOVER_INTERACTION_MIN_ZOOM,
	HOVER_TOOLTIP_Z_INDEX,
	LIGHTING_OVERLAY_FADE_END_ZOOM,
	LIGHTING_OVERLAY_FADE_START_ZOOM,
	LIGHTNING_ALTITUDE_CLOSE_PX,
	LIGHTNING_ALTITUDE_GLOBE_PX,
	LIGHTNING_CANVAS_COORDINATES,
	LIGHTNING_CANVAS_HEIGHT_PX,
	LIGHTNING_CANVAS_WIDTH_PX,
	LIGHTNING_CATCHLIGHT_OPACITY,
	LIGHTNING_CELL_RADIUS_CLOSE_PX,
	LIGHTNING_CELL_RADIUS_GLOBE_PX,
	LIGHTNING_CLUSTER_CHANCE_MAX,
	LIGHTNING_CLUSTER_CHANCE_MIN,
	LIGHTNING_DRAMATIC_STRIKE_CHANCE,
	LIGHTNING_FIRST_FLASH_MAX_INTERVAL_MS,
	LIGHTNING_FIRST_FLASH_MIN_INTERVAL_MS,
	LIGHTNING_HIDE_AT_OR_ABOVE_ZOOM,
	LIGHTNING_LAYER_OPACITY,
	LIGHTNING_MAX_ACTIVE_EVENTS,
	LIGHTNING_MAX_INTERVAL_MS,
	LIGHTNING_MERCATOR_MAX_LAT,
	LIGHTNING_MIN_INTERVAL_MS,
	LIGHTNING_OPACITY_MULTIPLIER,
	LIGHTNING_POTENTIAL_TEXTURE_URL,
	LIGHTNING_POTENTIAL_VERSION,
	LIGHTNING_REGION_BIAS_CHANCE,
	LIGHTNING_RESTRIKE_MAX_INTERVAL_MS,
	LIGHTNING_RESTRIKE_MAX_REMAINING_FLASHES,
	LIGHTNING_RESTRIKE_MIN_INTERVAL_MS,
	LIGHTNING_RESTRIKE_MIN_REMAINING_FLASHES,
	LIGHTNING_SCALE_CLOSE_MAX,
	LIGHTNING_SCALE_CLOSE_MIN,
	LIGHTNING_SCALE_GLOBE_MAX,
	LIGHTNING_SCALE_GLOBE_MIN,
	LIGHTNING_SCALE_ZOOM_END,
	LIGHTNING_SCALE_ZOOM_START,
	LIGHTNING_SHEET_FLASH_CHANCE,
	LIGHTNING_STAMPS_COUNT,
	LIGHTNING_STAMPS_VERSION,
	LIGHTNING_STORM_CELL_COUNT,
	LIGHTNING_US_BOUNDS,
	LIGHTNING_US_POSITION_TRIES,
	LIGHTNING_ZOOMED_OUT_BOOST_END_ZOOM,
	LIGHTNING_ZOOMED_OUT_BOOST_FULL_ZOOM,
	LIGHTNING_ZOOMED_OUT_MAX_ACTIVE_EVENTS,
	LIGHTNING_ZOOMED_OUT_MAX_INTERVAL_MS,
	LIGHTNING_ZOOMED_OUT_MIN_INTERVAL_MS,
	LOCKED_STATE_MARKER_BIAS_SHARE_MAX,
	LOCKED_STATE_MARKER_BIAS_SHARE_MIN,
	LOCKED_STATE_MARKER_BIAS_ZOOM_END,
	LOCKED_STATE_MARKER_BIAS_ZOOM_START,
	MANUAL_NIGHT_T_OVERRIDE,
	MANUAL_WEATHER_MOOD_OVERRIDE,
	MANUAL_WEATHER_TEMPERATURE_OVERRIDE_F,
	MAPBOX_LAYER_IDS,
	MAPBOX_SOURCE_IDS,
	MAPBOX_STYLE,
	MAP_DEFAULT_ZOOM,
	MAP_LANDCOVER_GREEN,
	MAP_LAND_CREAM,
	MAP_MIN_ZOOM,
	MAP_OCEAN_BLUE,
	MAP_WORLD_LAND_LAYER_ID,
	MAP_WORLD_LAND_SOURCE_ID,
	MAP_WORLD_LAND_SOURCE_LAYER,
	MAP_WORLD_LAND_TILESET_URL,
	MARKER_CONSTELLATION_CORE_OPACITY,
	MARKER_CONSTELLATION_DETAIL_COMPOSE_ZOOM,
	MARKER_CONSTELLATION_EDGE_RANK_OPACITY_EXPR,
	MARKER_CONSTELLATION_FALLBACK_GROUP_PX,
	MARKER_CONSTELLATION_GLOW_OPACITY,
	MARKER_CONSTELLATION_HALO_COLOR,
	MARKER_CONSTELLATION_LINE_COLOR,
	MARKER_CONSTELLATION_MAX_EDGES,
	MARKER_CONSTELLATION_MAX_EDGE_PX,
	MARKER_CONSTELLATION_MAX_POINTS,
	MARKER_CONSTELLATION_MID_COMPOSE_ZOOM,
	MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM,
	MARKER_CONSTELLATION_MIN_EDGE_PX,
	MARKER_CONSTELLATION_NODE_GLOW_OPACITY,
	MARKER_CONSTELLATION_NODE_OPACITY,
	MARKER_CONSTELLATION_NODE_RANK_OPACITY_EXPR,
	MARKER_CONSTELLATION_POINT_CLEARANCE_PX,
	MARKER_CONSTELLATION_REVEAL_FADE_MS,
	MARKER_CONSTELLATION_SPARSE_FALLBACK_MAX_EDGE_PX,
	MAX_TOTAL_DOTS,
	MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX,
	MOOD_CONTINUOUS_TRANSITION_MS,
	MOOD_DISCRETE_EFFECT_FADE_MS,
	MOOD_TRANSITION_PAINT_FRAME_MS,
	MURMUR_GLOBE_LIGHT_POLAR_DEG,
	MURMUR_GLOBE_LIGHT_VIEWER_AZIMUTH_OFFSET_DEG,
	NIGHT_CLOSE_FOG_ALPHA_DAY,
	NIGHT_CLOSE_FOG_ALPHA_NIGHT,
	NIGHT_DARK_WASH_OPACITY,
	NIGHT_FACE_SHADE_BG,
	NIGHT_FACE_SHADE_OPACITY,
	NIGHT_GLOOM_WASH_OPACITY,
	NIGHT_HIDE_ROADS_END_T,
	NIGHT_HIDE_ROADS_RESTORE_END_ZOOM,
	NIGHT_HIDE_ROADS_RESTORE_START_ZOOM,
	NIGHT_HIDE_ROADS_START_T,
	NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_END_ZOOM,
	NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_START_ZOOM,
	NIGHT_LIGHTS_CLOSE_GLOW_OPACITY_MULT,
	NIGHT_LIGHTS_CRISP_FADE_OUT_END_ZOOM,
	NIGHT_LIGHTS_CRISP_FADE_OUT_START_ZOOM,
	NIGHT_LIGHTS_FADE_END_ZOOM,
	NIGHT_LIGHTS_FADE_START_ZOOM,
	NIGHT_LIGHTS_GLOW_FADE_END_ZOOM,
	NIGHT_LIGHTS_GLOW_FADE_START_ZOOM,
	NIGHT_LIGHTS_GLOW_OPACITY_MULT,
	NIGHT_LIGHTS_INTRO_CROSSFADE_MS,
	NIGHT_LIGHTS_INTRO_REVEAL_MS,
	NIGHT_LIGHTS_LOAD_FADE_MS,
	NIGHT_LIGHTS_LOAD_POLL_MS,
	NIGHT_LIGHTS_SPACE_GLOW_EXTRA_PASS_OPACITY_MUL,
	NIGHT_LIGHTS_SPACE_GLOW_FADE_END_ZOOM,
	NIGHT_LIGHTS_SPACE_GLOW_FADE_START_ZOOM,
	NIGHT_LIGHTS_SPACE_GLOW_OPACITY_MULT,
	NIGHT_LIGHTS_ZOOM_LOAD_DIM_FLOOR,
	NIGHT_LIGHTS_ZOOM_LOAD_FADE_MS,
	NIGHT_LIGHTS_ZOOM_LOAD_OUT_FADE_MS,
	NIGHT_LIGHTS_ZOOM_LOAD_POLL_MS,
	NIGHT_LIGHTS_ZOOM_OUT_LIFT_END_ZOOM,
	NIGHT_LIGHTS_ZOOM_OUT_LIFT_MAX,
	NIGHT_LIGHTS_ZOOM_OUT_LIFT_START_ZOOM,
	NIGHT_LOWER_LEFT_SHADOW_BG,
	NIGHT_LOWER_LEFT_SHADOW_OPACITY,
	NIGHT_MOONLIGHT_KEY_BG,
	NIGHT_MOONLIGHT_KEY_OPACITY,
	NIGHT_MOON_RIM_BG,
	NIGHT_MOON_RIM_OPACITY,
	NIGHT_SHADOW_OVERLAY_MUL_MIN,
	NIGHT_SPACE_COLOR_DAY,
	NIGHT_SPACE_COLOR_NIGHT,
	NIGHT_STAR_INTENSITY_DAY,
	NIGHT_STAR_INTENSITY_NIGHT,
	NIGHT_STATE_LINE_DARKEN_MAX,
	NIGHT_STATE_LINE_OPACITY_MUL_MIN,
	NIGHT_US_LIGHTS_OPACITY,
	NIGHT_VIGNETTE_BG,
	NIGHT_VIGNETTE_OPACITY,
	NIGHT_WARM_KEY_MIN_MUL,
	NON_CONSTELLATION_FADE_END_ZOOM,
	NON_CONSTELLATION_FADE_START_ZOOM,
	ORB_FADE_MARKER_FEATURE_EXPR,
	OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE,
	PROMOTION_OVERLAY_MARKERS_MAX_PINS,
	PROMOTION_OVERLAY_MARKERS_MIN_ZOOM,
	PROMOTION_OVERLAY_TITLE_PREFIXES,
	RESULT_DOT_GLOW_BLUR,
	RESULT_DOT_GLOW_COLOR,
	RESULT_DOT_GLOW_OPACITY,
	RESULT_DOT_GLOW_RADIUS_MAX_PX,
	RESULT_DOT_GLOW_RADIUS_MIN_PX,
	RESULT_DOT_SCALE_MAX,
	RESULT_DOT_SCALE_MIN,
	RESULT_DOT_STROKE_COLOR_DEFAULT,
	RESULT_DOT_STROKE_COLOR_SELECTED,
	RESULT_DOT_STROKE_WEIGHT_MAX_PX,
	RESULT_DOT_STROKE_WEIGHT_MIN_PX,
	RESULT_DOT_TRANSPARENT_STROKE_COLOR,
	RESULT_DOT_ZOOM_MAX,
	RESULT_DOT_ZOOM_MIN,
	SELECTED_STATE_GRADIENT_BLOOM_OPACITY,
	SELECTED_STATE_GRADIENT_COLOR_OPACITY,
	SELECTED_STATE_ORB_FADE_MARKER_FEATURE_EXPR,
	SNOWFLAKE_STAMPS_COUNT,
	SNOWFLAKE_STAMPS_VERSION,
	SNOW_BASE_FALL_PX_PER_S,
	SNOW_BASE_WIND_PX_PER_S,
	SNOW_CANVAS_SIZE_PX,
	SNOW_DENSITY_BAND_LOOP_MS,
	SNOW_EDDY_DRIFT_BASE_PX,
	SNOW_GUST_BAND_LOOP_MS,
	SNOW_GUST_PUSH_BASE_PX,
	SNOW_HIDE_AT_OR_ABOVE_ZOOM,
	SNOW_LAYER_OPACITY,
	SNOW_MAX_PARTICLES,
	SNOW_ROTATED_PARTICLE_DEPTH_MIN,
	SNOW_STAMP_ALPHA_MULTIPLIER,
	SNOW_STAMP_MAX_ALPHA,
	SNOW_STAMP_MAX_SIZE_PX,
	SNOW_STAMP_MIN_SIZE_PX,
	SNOW_TURBULENCE_LOOP_MS,
	SNOW_US_SIDE_CENTER_LNG,
	SNOW_US_SIDE_FADE_END_DEG,
	SNOW_US_SIDE_FADE_START_DEG,
	SNOW_WIND_SWAY_BASE_PX,
	STATE_DIVIDER_COLOR,
	STATE_DIVIDER_LINES_MAX_ZOOM,
	STATE_HIGHLIGHT_COLOR,
	STATE_HIGHLIGHT_OPACITY,
	STATE_HOVER_HIGHLIGHT_MAX_ZOOM,
	STATE_LABELS_URL,
	STATE_LABEL_COLOR,
	STATE_META_URL,
	STATE_OUTLINE_URL,
	STATE_PREPARED_POLYGONS_URL,
	STATE_PROCESSED_GEOJSON_URL,
	SUN_TRANSITION_CANVAS_SIZE_PX,
	SUN_TRANSITION_CLOSE_FADE_END_ZOOM,
	SUN_TRANSITION_CLOSE_FADE_START_ZOOM,
	SUN_TRANSITION_CLOUD_CATCHLIGHT_OPACITY_MULT,
	SUN_TRANSITION_COLOR_ALPHA_MULT,
	SUN_TRANSITION_LAYER_MAX_OPACITY,
	SUN_TRANSITION_MAX_PIXEL_ALPHA,
	SUN_TRANSITION_PROGRESS_PAINT_STEPS,
	SUN_TRANSITION_SPACE_GLOW_BG,
	SUN_TRANSITION_SPACE_GLOW_OPACITY_MULT,
	SUN_TRANSITION_SUNRISE_END_OFFSET_DEG,
	SUN_TRANSITION_SUNRISE_START_OFFSET_DEG,
	SUN_TRANSITION_SUNSET_END_OFFSET_DEG,
	SUN_TRANSITION_SUNSET_START_OFFSET_DEG,
	TOOLTIP_FILL_COLOR_SELECTED,
	US_ONLY_BASEMAP_CLIP_MAX_ZOOM,
	VIEWPORT_BBOX_PAD_FACTOR,
	WEB_MERCATOR_MAX_LAT,
	defaultCenter,
	stateBadgeColorMap,
} from './constants';
import {
	absRingArea,
	bboxFromMultiPolygon,
	boundsToPolygonFeatureCollection,
	closeRing,
	createOutlineGeoJsonFromMultiPolygon,
	geoJsonGeometryToClippingMultiPolygon,
	geoJsonPolygonToClippingPolygon,
	geoJsonRingToClippingRing,
	isLatLngInBbox,
} from './geometry';
import {
	angularLngDistanceDeg,
	clamp,
	degreesToRadians,
	easeInOutCubic,
	lerp,
	mapboxEaseOutCubic,
	normalizeLngDeg,
	smoothstep,
} from './math';
import {
	formatCssColor,
	hashStringToStableKey,
	mixCssColorString,
	mixCssRgb,
	parseCssColor,
	parseHexColor,
	toHexByte,
	washOutHexColor,
} from './color';
import {
	coerceFiniteNumber,
	computeGlobeFrontHemisphereOpacity,
	coordinateKey,
	getLatLngFromContact,
	jitterDuplicateCoords,
	latLngToGlobeUnitVector,
} from './coordinates';
import {
	getStateAbbreviation,
	normalizeStateKey,
	parseMetadataSections,
} from './metadata';
import {
	WHAT_TO_HOVER_TOOLTIP_FILL_COLOR,
	WHAT_TO_RESULT_DOT_COLOR,
	WINE_BEER_SPIRITS_BOOKING_PREFIX_KEYS,
	WINE_BEER_SPIRITS_WHAT_KEY,
	bookingTitlePrefixMatchesSearchWhatKey,
	extractSearchModeFromQueryPrefix,
	getBookingTitlePrefixFromContactTitle,
	getLockedStateMarkerShareForZoom,
	getPromotionOverlayWhatFromContactTitle,
	getResultDotColorForWhat,
	getResultDotScaleForZoom,
	getResultDotStrokeWeightForZoom,
	getResultDotTForZoom,
	inferSearchModeFromSearchWhat,
	isPromotionOverlayListTitle,
	normalizeWhatKey,
	scaleMapboxOpacityExpr,
	startsWithCaseInsensitive,
	withCategorizedDotOpacity,
	withResultDotGlowOpacity,
} from './searchMode';

// Re-export externally-consumed constants for callers that import from this file
// (e.g. dashboard/page.tsx). The values themselves now live in `./constants`.
export {
	DASHBOARD_TO_INTERACTIVE_TRANSITION_CSS_EASING,
	DASHBOARD_TO_INTERACTIVE_TRANSITION_MS,
} from './constants';

const computeCuratedOrbT = (zoom: number) => {
	if (zoom >= CURATED_ORB_TRANSITION_START_ZOOM) return 0;
	if (zoom <= CURATED_ORB_TRANSITION_END_ZOOM) return 1;
	const raw =
		(CURATED_ORB_TRANSITION_START_ZOOM - zoom) /
		(CURATED_ORB_TRANSITION_START_ZOOM - CURATED_ORB_TRANSITION_END_ZOOM);
	return raw * raw * (3 - 2 * raw);
};

const getSelectedStateOrbZoomFadedOpacity = (opacity: number): any => [
	'interpolate',
	['linear'],
	['zoom'],
	CURATED_DOT_FADE_END_ZOOM,
	['case', SELECTED_STATE_ORB_FADE_MARKER_FEATURE_EXPR, 0, opacity],
	CURATED_DOT_FADE_START_ZOOM,
	opacity,
];

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

const buildMercatorCircleMultiPolygon = (
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

const projectCuratedBlobPoint = (
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

const pickAdaptiveCuratedBlobClusters = (
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
		kMeansClusterMercator(
			cluster.points,
			lobeCount,
			CURATED_BLOB_KMEANS_MAX_ITER
		)
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
		offsetCuratedBlobPointByKm(
			point,
			CURATED_BLOB_SINGLETON_LOBE_OFFSET_KM,
			angle
		),
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

const buildCuratedBlobClusterLobeMultiPolygons = (
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

const smoothCuratedBlobMultiPolygon = (
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

const mercatorMultiPolygonToLngLat = (
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

const createCuratedBlobMorphSourcesFromMercatorMultiPolygon = (
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

const createSelectedStateMorphSource = (
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

const morphCuratedBlobSourceToLngLat = (
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

const buildScreenPathFromLngLatMultiPolygon = (
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

const computeMoodVisualNightT = (nightT: number, cfg: MoodVisualConfig) =>
	clamp(Math.max(nightT, cfg.nightVisualBlend), 0, 1);

const toRuntimeMoodConfig = (cfg: MoodVisualConfig): RuntimeMoodVisualConfig => ({
	...cfg,
	warmSoftboxOpacityMultiplier:
		cfg.softboxBlendMode === 'screen' ? cfg.softboxOpacityMultiplier : 0,
	darkSoftboxOpacityMultiplier:
		cfg.softboxBlendMode === 'multiply' ? cfg.softboxOpacityMultiplier : 0,
	lightningIntensity: cfg.lightning ? cfg.lightningIntensity : 0,
});

const blendRuntimeMoodConfig = (
	from: RuntimeMoodVisualConfig,
	to: RuntimeMoodVisualConfig,
	continuousT: number,
	discreteT: number
): RuntimeMoodVisualConfig => {
	const c = clamp(continuousT, 0, 1);
	const d = clamp(discreteT, 0, 1);

	return {
		...to,
		cloudOpacityGlobeZoom: lerp(from.cloudOpacityGlobeZoom, to.cloudOpacityGlobeZoom, c),
		cloudOpacityDecorativeZoom: lerp(
			from.cloudOpacityDecorativeZoom,
			to.cloudOpacityDecorativeZoom,
			c
		),
		cloudDriftSpeedMultiplier: lerp(
			from.cloudDriftSpeedMultiplier,
			to.cloudDriftSpeedMultiplier,
			c
		),
		cloudTurbulenceMultiplier: lerp(
			from.cloudTurbulenceMultiplier,
			to.cloudTurbulenceMultiplier,
			c
		),
		cloudBrightnessMin: lerp(from.cloudBrightnessMin, to.cloudBrightnessMin, c),
		cloudBrightnessMax: lerp(from.cloudBrightnessMax, to.cloudBrightnessMax, c),
		cloudExtraPasses: lerp(from.cloudExtraPasses, to.cloudExtraPasses, d),
		cloudExtraPassAlpha: lerp(from.cloudExtraPassAlpha, to.cloudExtraPassAlpha, c),
		cloudLayerSpread: lerp(from.cloudLayerSpread, to.cloudLayerSpread, c),
		cloudSecondaryLayerOpacity: lerp(
			from.cloudSecondaryLayerOpacity,
			to.cloudSecondaryLayerOpacity,
			c
		),
		cloudHazeLayerOpacity: lerp(from.cloudHazeLayerOpacity, to.cloudHazeLayerOpacity, c),
		cloudFineVeilOpacity: lerp(
			from.cloudFineVeilOpacity,
			to.cloudFineVeilOpacity,
			c
		),
		cloudStormWindMultiplier: lerp(
			from.cloudStormWindMultiplier,
			to.cloudStormWindMultiplier,
			c
		),
		cloudCoreShadowOpacity: lerp(
			from.cloudCoreShadowOpacity,
			to.cloudCoreShadowOpacity,
			c
		),
		cloudEdgeLiftOpacity: lerp(from.cloudEdgeLiftOpacity, to.cloudEdgeLiftOpacity, c),
		cloudDeepZoomOpacity: lerp(from.cloudDeepZoomOpacity, to.cloudDeepZoomOpacity, d),
		snowOpacity: lerp(from.snowOpacity, to.snowOpacity, d),
		snowDensity: lerp(from.snowDensity, to.snowDensity, d),
		snowFallSpeed: lerp(from.snowFallSpeed, to.snowFallSpeed, c),
		snowWind: lerp(from.snowWind, to.snowWind, c),
		snowDepthParallax: lerp(from.snowDepthParallax, to.snowDepthParallax, c),
		fogColor: mixCssColorString(from.fogColor, to.fogColor, c),
		fogHighColor: mixCssColorString(from.fogHighColor, to.fogHighColor, c),
		fogHorizonBlend: lerp(from.fogHorizonBlend, to.fogHorizonBlend, c),
		softboxOpacityMultiplier: lerp(
			from.softboxOpacityMultiplier,
			to.softboxOpacityMultiplier,
			c
		),
		shadowOpacityMultiplier: lerp(
			from.shadowOpacityMultiplier,
			to.shadowOpacityMultiplier,
			c
		),
		nightVisualBlend: lerp(from.nightVisualBlend, to.nightVisualBlend, c),
		gloomWashOpacity: lerp(from.gloomWashOpacity, to.gloomWashOpacity, c),
		lightningSpread: lerp(from.lightningSpread, to.lightningSpread, c),
		lightningBurstiness: lerp(from.lightningBurstiness, to.lightningBurstiness, c),
		lightningTint: [
			lerp(from.lightningTint[0], to.lightningTint[0], c),
			lerp(from.lightningTint[1], to.lightningTint[1], c),
			lerp(from.lightningTint[2], to.lightningTint[2], c),
		],
		warmSoftboxOpacityMultiplier: lerp(
			from.warmSoftboxOpacityMultiplier,
			to.warmSoftboxOpacityMultiplier,
			c
		),
		darkSoftboxOpacityMultiplier: lerp(
			from.darkSoftboxOpacityMultiplier,
			to.darkSoftboxOpacityMultiplier,
			c
		),
		lightningIntensity: lerp(from.lightningIntensity, to.lightningIntensity, d),
		lightning: to.lightning,
	};
};

const USE_WASM_GEO = process.env.NEXT_PUBLIC_USE_WASM_GEO === 'true';

let cachedWasmGeoModule: WasmGeoModule | null = null;
let wasmGeoModulePromise: Promise<WasmGeoModule | null> | null = null;
let hasLoggedWasmGeoLoadError = false;
let hasLoggedWasmGeoRuntimeError = false;

const logWasmGeoLoadError = (error: unknown): void => {
	if (hasLoggedWasmGeoLoadError) return;
	hasLoggedWasmGeoLoadError = true;
	console.error(
		'[SearchResultsMap] failed to load WASM geo module, using TypeScript fallback',
		error
	);
};

const logWasmGeoRuntimeError = (error: unknown): void => {
	if (hasLoggedWasmGeoRuntimeError) return;
	hasLoggedWasmGeoRuntimeError = true;
	console.error(
		'[SearchResultsMap] WASM geo call failed, using TypeScript fallback',
		error
	);
};

const toFloat64Array = (value: Float64Array | ArrayLike<number>): Float64Array =>
	value instanceof Float64Array ? value : Float64Array.from(value);

const getWasmGeoModuleSync = (): WasmGeoModule | null => cachedWasmGeoModule;

const ensureWasmGeoModuleLoaded = async (): Promise<WasmGeoModule | null> => {
	if (!USE_WASM_GEO) return null;
	if (cachedWasmGeoModule) return cachedWasmGeoModule;

	if (!wasmGeoModulePromise) {
		wasmGeoModulePromise = import('../../../../rust-scorer/pkg-web')
			.then(async (module) => {
				// wasm-pack `--target web` exports an async init function as the default export.
				// We must call it (once) before using the named wrapper exports.
				const maybeInit = (module as { default?: unknown }).default;
				if (typeof maybeInit === 'function') {
					try {
						await (maybeInit as () => Promise<unknown>)();
					} catch (error: unknown) {
						logWasmGeoLoadError(error);
						return null;
					}
				}

				const maybeModule = module as Partial<WasmGeoModule>;
				if (
					typeof maybeModule.lat_lng_to_world_pixel !== 'function' ||
					typeof maybeModule.distance_point_to_segment_sq !== 'function' ||
					typeof maybeModule.point_in_ring !== 'function' ||
					typeof maybeModule.is_point_near_segments !== 'function' ||
					typeof maybeModule.batch_lat_lng_to_world_pixel !== 'function' ||
					typeof maybeModule.pick_non_overlapping_indices !== 'function' ||
					typeof maybeModule.stable_viewport_sample !== 'function'
				) {
					return null;
				}

				// Smoke test: confirm calls don't throw post-init.
				try {
					const projected = toFloat64Array(maybeModule.lat_lng_to_world_pixel(0, 0, 256));
					if (
						projected.length < 2 ||
						!Number.isFinite(projected[0]) ||
						!Number.isFinite(projected[1])
					)
						return null;
				} catch (error: unknown) {
					logWasmGeoLoadError(error);
					return null;
				}

				cachedWasmGeoModule = maybeModule as WasmGeoModule;
				if (process.env.NODE_ENV !== 'production') {
					console.info('[SearchResultsMap] WASM geo module loaded');
				}
				return cachedWasmGeoModule;
			})
			.catch((error: unknown) => {
				logWasmGeoLoadError(error);
				return null;
			});
	}

	return wasmGeoModulePromise;
};

const ringFlatCache = new WeakMap<ClippingRing, Float64Array>();

const flattenRing = (ring: ClippingRing): Float64Array => {
	const cached = ringFlatCache.get(ring);
	if (cached) return cached;
	const flat = new Float64Array(ring.length * 2);
	for (let i = 0; i < ring.length; i++) {
		const [x, y] = ring[i];
		flat[i * 2] = x;
		flat[i * 2 + 1] = y;
	}
	ringFlatCache.set(ring, flat);
	return flat;
};

const getClientPointFromDomEvent = (
	domEvent: unknown
): { x: number; y: number } | null => {
	const ev = domEvent as Partial<MouseEvent & TouchEvent & PointerEvent> | null;
	if (!ev) return null;
	if (
		typeof (ev as MouseEvent).clientX === 'number' &&
		typeof (ev as MouseEvent).clientY === 'number'
	) {
		return { x: (ev as MouseEvent).clientX, y: (ev as MouseEvent).clientY };
	}
	const touches = (ev as TouchEvent).touches;
	if (touches && touches.length > 0) {
		return { x: touches[0].clientX, y: touches[0].clientY };
	}
	return null;
};

const hashStringToUint32 = (str: string): number => {
	// FNV-1a 32-bit
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
};

const getBackgroundDotsQuantizationDeg = (zoom: number): number => {
	// Controls when we regenerate dots as the viewport changes.
	if (zoom <= 4) return 0.75;
	if (zoom <= 6) return 0.4;
	if (zoom <= 8) return 0.22;
	if (zoom <= 10) return 0.12;
	if (zoom <= 12) return 0.08;
	return 0.05;
};

const stableViewportSampleContacts = (
	contacts: ContactWithName[],
	getCoords: (contact: ContactWithName) => LatLngLiteral | null,
	viewportBbox: BoundingBox,
	slots: number,
	seed: string
): ContactWithName[] => {
	if (slots <= 0 || contacts.length === 0) return [];
	if (contacts.length <= slots) return contacts;

	const wasm = getWasmGeoModuleSync();
	if (wasm) {
		try {
			// Build flat typed arrays from contacts
			const n = contacts.length;
			const coordsFlat = new Float64Array(n * 2);
			const idsFlat = new Uint32Array(n);
			for (let i = 0; i < n; i++) {
				const c = getCoords(contacts[i]);
				if (c) {
					coordsFlat[i * 2] = c.lat;
					coordsFlat[i * 2 + 1] = c.lng;
				} else {
					coordsFlat[i * 2] = NaN;
					coordsFlat[i * 2 + 1] = NaN;
				}
				idsFlat[i] = contacts[i].id;
			}
			const seedHash = hashStringToUint32(seed);
			const indices = wasm.stable_viewport_sample(
				coordsFlat,
				idsFlat,
				viewportBbox.minLat,
				viewportBbox.maxLat,
				viewportBbox.minLng,
				viewportBbox.maxLng,
				slots,
				seedHash
			);
			const result: ContactWithName[] = [];
			for (let i = 0; i < indices.length; i++) {
				result.push(contacts[indices[i]]!);
			}
			return result;
		} catch (err) {
			logWasmGeoRuntimeError(err);
		}
	}

	const latSpan = viewportBbox.maxLat - viewportBbox.minLat;
	const lngSpan = viewportBbox.maxLng - viewportBbox.minLng;
	if (
		!Number.isFinite(latSpan) ||
		!Number.isFinite(lngSpan) ||
		latSpan <= 0 ||
		lngSpan <= 0
	) {
		// Fallback: deterministic sample by hash order.
		return contacts
			.map((contact) => ({
				contact,
				score: hashStringToUint32(`${seed}|${contact.id}`),
			}))
			.sort((a, b) => a.score - b.score)
			.slice(0, slots)
			.map((x) => x.contact);
	}

	// Bin into a viewport grid and sample per-cell so spatial density is preserved.
	const grid = Math.max(8, Math.min(64, Math.round(Math.sqrt(slots) * 1.15)));
	const latStep = latSpan / grid;
	const lngStep = lngSpan / grid;
	if (
		!Number.isFinite(latStep) ||
		!Number.isFinite(lngStep) ||
		latStep <= 0 ||
		lngStep <= 0
	) {
		return contacts
			.map((contact) => ({
				contact,
				score: hashStringToUint32(`${seed}|${contact.id}`),
			}))
			.sort((a, b) => a.score - b.score)
			.slice(0, slots)
			.map((x) => x.contact);
	}

	const cellMap = new Map<string, ScoredContact[]>();
	for (const contact of contacts) {
		const coords = getCoords(contact);
		if (!coords) continue;
		if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;

		const x = clamp(
			Math.floor((coords.lng - viewportBbox.minLng) / lngStep),
			0,
			grid - 1
		);
		const y = clamp(
			Math.floor((coords.lat - viewportBbox.minLat) / latStep),
			0,
			grid - 1
		);
		const key = `${x},${y}`;
		const score = hashStringToUint32(`${seed}|${contact.id}`);
		const existing = cellMap.get(key);
		if (existing) existing.push({ contact, score });
		else cellMap.set(key, [{ contact, score }]);
	}

	const cells = Array.from(cellMap.entries()).map(([key, items]) => {
		items.sort((a, b) => a.score - b.score);
		return { key, items, weight: items.length };
	});
	if (cells.length === 0) return [];

	// If we have more non-empty cells than slots, select which cells to represent using
	// weighted sampling (cells with more contacts are more likely to be shown).
	if (cells.length >= slots) {
		const cellChoices = cells
			.map((cell) => {
				const u = (hashStringToUint32(`${seed}|cell|${cell.key}`) + 1) / 4294967296;
				const w = Math.max(1, cell.weight);
				// Efraimidis-Spirakis weighted sampling key: log(u)/w (higher is better).
				const cellScore = Math.log(u) / w;
				return { ...cell, cellScore };
			})
			.sort((a, b) => b.cellScore - a.cellScore)
			.slice(0, slots);

		return cellChoices.map((cell) => cell.items[0]!.contact);
	}

	// Otherwise, include one per cell, then allocate remaining slots proportionally to cell density.
	const picked: ContactWithName[] = cells.map((cell) => cell.items[0]!.contact);
	const remainingSlots = slots - picked.length;
	if (remainingSlots <= 0) return picked;

	const totalRemaining = cells.reduce(
		(sum, cell) => sum + Math.max(0, cell.items.length - 1),
		0
	);
	if (totalRemaining <= 0) return picked;

	const allocs = cells.map((cell) => {
		const remaining = Math.max(0, cell.items.length - 1);
		const exact = (remainingSlots * remaining) / totalRemaining;
		const base = Math.min(remaining, Math.floor(exact));
		const frac = exact - base;
		const tie = hashStringToUint32(`${seed}|rem|${cell.key}`);
		return { key: cell.key, items: cell.items, base, frac, remaining, tie };
	});

	const used = allocs.reduce((sum, a) => sum + a.base, 0);
	let remainder = Math.max(0, remainingSlots - used);

	allocs.sort((a, b) => {
		if (b.frac !== a.frac) return b.frac - a.frac;
		return a.tie - b.tie;
	});

	for (let i = 0; i < allocs.length && remainder > 0; i++) {
		const a = allocs[i];
		if (a.base < a.remaining) {
			a.base += 1;
			remainder--;
		}
	}

	for (const a of allocs) {
		const take = Math.min(a.base, a.remaining);
		for (let i = 1; i <= take; i++) {
			const item = a.items[i];
			if (item) picked.push(item.contact);
		}
	}

	return picked.slice(0, slots);
};

const worldSegmentsFlatCache = new WeakMap<WorldSegment[], Float64Array>();

const flattenWorldSegments = (segments: WorldSegment[]): Float64Array => {
	const cached = worldSegmentsFlatCache.get(segments);
	if (cached) return cached;
	const flat = new Float64Array(segments.length * 8);
	for (let i = 0; i < segments.length; i++) {
		const s = segments[i];
		const baseIdx = i * 8;
		flat[baseIdx] = s.ax;
		flat[baseIdx + 1] = s.ay;
		flat[baseIdx + 2] = s.bx;
		flat[baseIdx + 3] = s.by;
		flat[baseIdx + 4] = s.minX;
		flat[baseIdx + 5] = s.maxX;
		flat[baseIdx + 6] = s.minY;
		flat[baseIdx + 7] = s.maxY;
	}
	worldSegmentsFlatCache.set(segments, flat);
	return flat;
};

const latLngToWorldPixel = (
	coords: LatLngLiteral,
	worldSize: number
): { x: number; y: number } => {
	const wasmGeo = getWasmGeoModuleSync();
	if (wasmGeo) {
		try {
			const projected = toFloat64Array(
				wasmGeo.lat_lng_to_world_pixel(coords.lat, coords.lng, worldSize)
			);
			if (projected.length >= 2) {
				const x = projected[0];
				const y = projected[1];
				if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
			}
		} catch (error: unknown) {
			logWasmGeoRuntimeError(error);
		}
	}

	// Web Mercator world pixel coords at the current zoom.
	const latClamped = clamp(coords.lat, -85, 85);
	const siny = Math.sin((latClamped * Math.PI) / 180);
	const x = ((coords.lng + 180) / 360) * worldSize;
	const y = (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * worldSize;
	return { x, y };
};

const batchLatLngToWorldPixels = (
	coordsList: LatLngLiteral[],
	worldSize: number
): Array<{ x: number; y: number }> => {
	if (coordsList.length === 0) return [];

	const wasmGeo = getWasmGeoModuleSync();
	if (wasmGeo) {
		const flat = new Float64Array(coordsList.length * 2);
		for (let i = 0; i < coordsList.length; i++) {
			const coords = coordsList[i];
			flat[i * 2] = coords.lat;
			flat[i * 2 + 1] = coords.lng;
		}

		try {
			const projected = toFloat64Array(
				wasmGeo.batch_lat_lng_to_world_pixel(flat, worldSize)
			);
			if (projected.length >= coordsList.length * 2) {
				const out = new Array<{ x: number; y: number }>(coordsList.length);
				for (let i = 0; i < coordsList.length; i++) {
					out[i] = { x: projected[i * 2], y: projected[i * 2 + 1] };
				}
				return out;
			}
		} catch (error: unknown) {
			logWasmGeoRuntimeError(error);
		}
	}

	return coordsList.map((coords) => latLngToWorldPixel(coords, worldSize));
};

const distancePointToSegmentSq = (
	px: number,
	py: number,
	ax: number,
	ay: number,
	bx: number,
	by: number
): number => {
	const wasmGeo = getWasmGeoModuleSync();
	if (wasmGeo) {
		try {
			const distSq = wasmGeo.distance_point_to_segment_sq(px, py, ax, ay, bx, by);
			if (Number.isFinite(distSq)) return distSq;
		} catch (error: unknown) {
			logWasmGeoRuntimeError(error);
		}
	}

	const abx = bx - ax;
	const aby = by - ay;
	const apx = px - ax;
	const apy = py - ay;
	const denom = abx * abx + aby * aby;
	if (denom <= 0) return apx * apx + apy * apy;
	let t = (apx * abx + apy * aby) / denom;
	t = clamp(t, 0, 1);
	const cx = ax + t * abx;
	const cy = ay + t * aby;
	const dx = px - cx;
	const dy = py - cy;
	return dx * dx + dy * dy;
};

const markerConstellationPairKey = (a: number, b: number): string =>
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

const buildMarkerConstellationEdgesForGroup = (
	points: MarkerConstellationPoint[],
	seed: string,
	remainingBudget: number
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
		MARKER_CONSTELLATION_MAX_EDGE_PX,
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

const buildFallbackMarkerConstellationGroupKeys = (
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

const buildMarkerConstellationEdges = (
	points: MarkerConstellationPoint[],
	seed: string
): MarkerConstellationEdgeSeed[] => {
	if (points.length < 2) return [];

	const groups = new Map<string, MarkerConstellationPoint[]>();
	for (const point of points) {
		const group = groups.get(point.groupKey);
		if (group) group.push(point);
		else groups.set(point.groupKey, [point]);
	}

	const orderedGroups = Array.from(groups.entries())
		.map(([key, group]) => ({
			key,
			group: group.slice().sort((a, b) => a.id - b.id),
			minId: group.reduce((min, point) => Math.min(min, point.id), Infinity),
		}))
		.filter(({ group }) => group.length >= 2)
		.sort((a, b) => a.minId - b.minId || a.key.localeCompare(b.key));

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
	seed: string
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
		MARKER_CONSTELLATION_SPARSE_FALLBACK_MAX_EDGE_PX,
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

const buildBeautyMarkerConstellationFormation = (
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

const buildOuterRingWorldSegments = (
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

const isWorldPointNearSegments = (
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

const pointInClippingPolygon = (
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

const pointInMultiPolygon = (
	point: ClippingCoord,
	multiPolygon: ClippingMultiPolygon
): boolean => {
	for (const polygon of multiPolygon) {
		if (pointInClippingPolygon(point, polygon)) return true;
	}
	return false;
};

interface SearchResultsMapProps {
	contacts: ContactWithName[];
	selectedContacts: number[];
	/** When set, highlights the corresponding marker as hovered (e.g. hovering a row in the map results panel). */
	externallyHoveredContactId?: number | null;
	/** Full search query string (e.g. "[Booking] Music Venues (Portland, ME)") */
	searchQuery?: string | null;
	/** Used to color the default (unselected) result dots by the active "What" search value. */
	searchWhat?: string | null;
	/** When set, shows a persistent outline of the selected search area. */
	selectedAreaBounds?: MapSelectionBounds | null;
	/**
	 * Called as soon as the user starts interacting with the viewport (drag/zoom).
	 * Useful for dismissing transient UI (e.g. "Search this area" CTA).
	 */
	onViewportInteraction?: () => void;
	/**
	 * Called when the viewport becomes idle after panning/zooming (Mapbox `moveend`).
	 * Useful for syncing viewport-derived state in the parent.
	 */
	onViewportIdle?: (payload: {
		bounds: MapSelectionBounds;
		center: LatLngLiteral;
		zoom: number;
		isCenterInSearchArea: boolean;
	}) => void;
	/** Dashboard/tooling mode (e.g. `"select"` enables rectangle selection). */
	activeTool?: string | null;
	/** Changes when the dashboard triggers "select all in view". */
	selectAllInViewNonce?: number;

	onAreaSelect?: (bounds: MapSelectionBounds, payload?: AreaSelectPayload) => void;

	onVisibleOverlayContactsChange?: (contacts: ContactWithName[]) => void;
	onMarkerClick?: (contact: ContactWithName) => void;
	onMarkerHover?: (contact: ContactWithName | null, meta?: MarkerHoverMeta) => void;
	onToggleSelection?: (contactId: number) => void;
	onStateSelect?: (stateName: string) => void;
	enableStateInteractions?: boolean;
	lockedStateName?: string | null;
	/** When true, hides the state outlines (useful while search is loading). */
	isLoading?: boolean;
	/**
	 * When true, disables the base-dot "wave reveal" animation.
	 * Useful in fullscreen/cinematic map transitions where hiding dots causes visible flicker.
	 */
	disableDotWaveReveal?: boolean;
	/** When true, prevents the map from auto-zooming to fit contacts or the locked state. */
	skipAutoFit?: boolean;
	/**
	 * Controls whether the map should behave like a decorative dashboard background (no interactions,
	 * optional auto-rotation), or the full interactive results map.
	 */
	presentation?: 'background' | 'interactive';
	/** When true (and `presentation="background"`), auto-rotate the globe. */
	autoSpin?: boolean;
	/**
	 * Drives the globe's atmospheric mood (clouds, fog, lighting, precipitation).
	 * Defaults to `"normal"` which preserves the historical visual tuning.
	 */
	weatherMood?: WeatherMood;
	/**
	 * Approximate center of the region driving `weatherMood`. Storm lightning is
	 * localized around this point instead of spawning globally.
	 */
	weatherRegionCenter?: LatLngLiteral | null;
	/**
	 * Current Fahrenheit temperature for the user's region. When > 80°F and the
	 * active mood uses a bright (screen-blend) softbox, the globe gets a small
	 * additional brightness lift so hot weather "feels hot."
	 */
	weatherTemperatureF?: number | null;
	/**
	 * 0 = full day, 1 = deep night. Drives the moonlit rear-lighting overlay
	 * system so night feels organic (not a basemap "dark mode" toggle).
	 */
	nightT?: number | null;
	/**
	 * Full sun-phase timing for globe lighting. When present, the daytime shade
	 * uses this to drift slowly from sunrise to sunset.
	 */
	nightLighting?: GlobeNightLightingLike | null;
}

const computeLightingOverlayOpacity = (zoom: number) => {
	if (zoom <= LIGHTING_OVERLAY_FADE_START_ZOOM) return 1;
	if (zoom >= LIGHTING_OVERLAY_FADE_END_ZOOM) return 0;
	const t =
		(zoom - LIGHTING_OVERLAY_FADE_START_ZOOM) /
		(LIGHTING_OVERLAY_FADE_END_ZOOM - LIGHTING_OVERLAY_FADE_START_ZOOM);
	// Ease-in cubic: stays near full, then drops off fast near the end.
	return 1 - t * t * t;
};

const computeGloomWashFade = (zoom: number) => {
	if (zoom <= GLOOM_WASH_FADE_START_ZOOM) return 1;
	if (zoom >= GLOOM_WASH_FADE_END_ZOOM) return 0;
	return (
		1 -
		(zoom - GLOOM_WASH_FADE_START_ZOOM) /
			(GLOOM_WASH_FADE_END_ZOOM - GLOOM_WASH_FADE_START_ZOOM)
	);
};

const LIGHTNING_STAMPS_URL = (i: number) =>
	`/maps/lightning_stamps/flash_${String(i).padStart(2, '0')}.png?v=${LIGHTNING_STAMPS_VERSION}`;
const SNOWFLAKE_STAMPS_URL = (i: number) =>
	`/maps/snowflake_stamps/drop_${String(i).padStart(2, '0')}.png?v=${SNOWFLAKE_STAMPS_VERSION}`;

const getLightningZoomedOutBoostT = (zoom: number) => {
	if (zoom <= LIGHTNING_ZOOMED_OUT_BOOST_FULL_ZOOM) return 1;
	if (zoom >= LIGHTNING_ZOOMED_OUT_BOOST_END_ZOOM) return 0;
	const t =
		(LIGHTNING_ZOOMED_OUT_BOOST_END_ZOOM - zoom) /
		(LIGHTNING_ZOOMED_OUT_BOOST_END_ZOOM - LIGHTNING_ZOOMED_OUT_BOOST_FULL_ZOOM);
	const clamped = clamp(t, 0, 1);
	return clamped * clamped * (3 - 2 * clamped);
};

const getLightningZoomedInT = (zoom: number) => {
	if (zoom <= LIGHTNING_SCALE_ZOOM_START) return 0;
	if (zoom >= LIGHTNING_SCALE_ZOOM_END) return 1;
	const t =
		(zoom - LIGHTNING_SCALE_ZOOM_START) /
		(LIGHTNING_SCALE_ZOOM_END - LIGHTNING_SCALE_ZOOM_START);
	const clamped = clamp(t, 0, 1);
	return clamped * clamped * (3 - 2 * clamped);
};

// `DAY_FAR_SIDE_SHADE_CENTER_LNG` depends on `normalizeLngDeg` so it stays in this
// module (the rest of the day-far-side / clouds polar / contact-lights / sun-transition
// constants live in `./constants`).
const DAY_FAR_SIDE_SHADE_CENTER_LNG = normalizeLngDeg(defaultCenter.lng + 180);

const getDayFarSideShadeDayProgress = (
	nightLighting: GlobeNightLightingLike | null | undefined,
	nowMs: number
) => {
	if (!nightLighting) return 0;
	if (nightLighting.phase === 'sunrise') return 0;
	if (nightLighting.phase === 'sunset') return 1;
	if (nightLighting.phase !== 'day') return 0;

	const startMs = nightLighting.phaseStartMs;
	const endMs = nightLighting.phaseEndMs;
	const durationMs = endMs - startMs;
	if (!Number.isFinite(durationMs) || durationMs <= 0) return 0;
	return clamp((nowMs - startMs) / durationMs, 0, 1);
};
const getDayFarSideShadeCenterLng = (dayProgress: number) =>
	normalizeLngDeg(
		DAY_FAR_SIDE_SHADE_CENTER_LNG +
			clamp(dayProgress, 0, 1) * DAY_FAR_SIDE_SHADE_DAYTIME_DRIFT_DEG
	);
const paintDayFarSideShadeCanvas = (
	canvas: HTMLCanvasElement,
	centerLng: number = DAY_FAR_SIDE_SHADE_CENTER_LNG
) => {
	canvas.width = DAY_FAR_SIDE_SHADE_CANVAS_SIZE_PX;
	canvas.height = DAY_FAR_SIDE_SHADE_CANVAS_SIZE_PX;

	const ctx = canvas.getContext('2d');
	if (!ctx) return false;

	const w = canvas.width;
	const h = canvas.height;
	const imageData = ctx.createImageData(w, h);
	const data = imageData.data;

	for (let y = 0; y < h; y += 1) {
		const mercatorY = (y + 0.5) / h;
		const lat =
			(Math.atan(Math.sinh(Math.PI * (1 - 2 * mercatorY))) * 180) / Math.PI;
		const latRad = (lat * Math.PI) / 180;

		for (let x = 0; x < w; x += 1) {
			const lng = ((x + 0.5) / w) * 360 - 180;
			const lngRad = (lng * Math.PI) / 180;
			const wobble =
				9 * Math.sin(latRad * 2.1 + lngRad * 1.15) +
				5 * Math.sin(lngRad * 2.7 - latRad * 0.8);
			const distToAsiaSide = angularLngDistanceDeg(lng + wobble, centerLng);
			const farSideT = Math.pow(
				1 -
					smoothstep(
						DAY_FAR_SIDE_SHADE_FADE_START_DEG,
						DAY_FAR_SIDE_SHADE_FADE_END_DEG,
						distToAsiaSide
					),
				DAY_FAR_SIDE_SHADE_FADE_POWER
			);
			const usProtectionT = smoothstep(
				40,
				78,
				angularLngDistanceDeg(lng, defaultCenter.lng)
			);
			const polarTaperT = 1 - smoothstep(62, 80, Math.abs(lat));
			const northTopTaperT = 1 - smoothstep(50, 74, lat) * 0.5;
			const alpha =
				DAY_FAR_SIDE_SHADE_MAX_ALPHA *
				farSideT *
				usProtectionT *
				polarTaperT *
				northTopTaperT;

			const idx = (y * w + x) * 4;
			data[idx] = 4;
			data[idx + 1] = 8;
			data[idx + 2] = 22;
			data[idx + 3] = Math.round(clamp(alpha, 0, DAY_FAR_SIDE_SHADE_MAX_ALPHA) * 255);
		}
	}

	ctx.putImageData(imageData, 0, 0);
	return true;
};
const createDayFarSideShadeCanvas = (): HTMLCanvasElement | null => {
	if (typeof document === 'undefined') return null;

	const canvas = document.createElement('canvas');
	if (!paintDayFarSideShadeCanvas(canvas)) return null;
	return canvas;
};

// Vertical 1px-wide alpha mask whose alpha follows the inverse Mercator
// formula, so the taper is geographically correct (latitude-pinned) rather
// than just a screen-space gradient. Cached at module scope and reused as a
// `destination-in` source in the cloud and snow draw loops.
let cloudsPolarFadeMaskCanvas: HTMLCanvasElement | null = null;
const buildCloudsPolarFadeMaskCanvas = (
	sizePx: number
): HTMLCanvasElement | null => {
	if (typeof document === 'undefined') return null;
	const mask = document.createElement('canvas');
	mask.width = 1;
	mask.height = sizePx;
	const ctx = mask.getContext('2d');
	if (!ctx) return null;
	const img = ctx.createImageData(1, sizePx);
	const data = img.data;
	for (let y = 0; y < sizePx; y += 1) {
		const mercatorY = (y + 0.5) / sizePx;
		const lat =
			(Math.atan(Math.sinh(Math.PI * (1 - 2 * mercatorY))) * 180) / Math.PI;
		const t =
			1 -
			smoothstep(
				CLOUDS_POLAR_TAPER_START_DEG,
				CLOUDS_POLAR_TAPER_END_DEG,
				Math.abs(lat)
			);
		const a = Math.round(clamp(t, 0, 1) * 255);
		const i = y * 4;
		data[i] = 255;
		data[i + 1] = 255;
		data[i + 2] = 255;
		data[i + 3] = a;
	}
	ctx.putImageData(img, 0, 0);
	return mask;
};
const getCloudsPolarFadeMask = (sizePx: number): HTMLCanvasElement | null => {
	const existing = cloudsPolarFadeMaskCanvas;
	if (existing && existing.height === sizePx) return existing;
	const next = buildCloudsPolarFadeMaskCanvas(sizePx);
	cloudsPolarFadeMaskCanvas = next;
	return next;
};

const getSunTransitionVisualState = (
	nightLighting: GlobeNightLightingLike | null | undefined,
	nowMs: number
): SunTransitionVisualState | null => {
	if (!nightLighting) return null;
	const phase = nightLighting?.phase;
	if (phase !== 'sunrise' && phase !== 'sunset') return null;

	const startMs = nightLighting.phaseStartMs;
	const endMs = nightLighting.phaseEndMs;
	const durationMs = endMs - startMs;
	if (!Number.isFinite(durationMs) || durationMs <= 0) return null;

	const progress = clamp((nowMs - startMs) / durationMs, 0, 1);
	const sweepT = smoothstep(0, 1, progress);
	const [startOffset, endOffset] =
		phase === 'sunrise'
			? [SUN_TRANSITION_SUNRISE_START_OFFSET_DEG, SUN_TRANSITION_SUNRISE_END_OFFSET_DEG]
			: [SUN_TRANSITION_SUNSET_START_OFFSET_DEG, SUN_TRANSITION_SUNSET_END_OFFSET_DEG];
	const centerLng = normalizeLngDeg(defaultCenter.lng + lerp(startOffset, endOffset, sweepT));
	const bell = Math.sin(progress * Math.PI);
	const intensity = Math.pow(Math.max(0, bell), 0.62);

	if (intensity <= 0.001) return null;

	return {
		phase,
		progress,
		intensity,
		centerLng,
		direction: phase === 'sunrise' ? 1 : -1,
	};
};

const computeSunTransitionZoomOpacity = (zoom: number) => {
	const globeFade = computeLightingOverlayOpacity(zoom);
	const closeFade =
		1 -
		smoothstep(
			SUN_TRANSITION_CLOSE_FADE_START_ZOOM,
			SUN_TRANSITION_CLOSE_FADE_END_ZOOM,
			zoom
		);
	return clamp(globeFade * closeFade, 0, 1);
};

const computeSunTransitionLayerOpacity = (
	visual: SunTransitionVisualState | null,
	zoom: number
) => {
	if (!visual) return 0;
	return clamp(
		computeSunTransitionZoomOpacity(zoom) *
			SUN_TRANSITION_LAYER_MAX_OPACITY *
			visual.intensity,
		0,
		1
	);
};

const addSunTransitionColor = (
	acc: { r: number; g: number; b: number; a: number },
	signedDistDeg: number,
	centerDeg: number,
	widthDeg: number,
	rgb: [number, number, number],
	alpha: number
) => {
	if (alpha <= 0) return;
	const x = (signedDistDeg - centerDeg) / widthDeg;
	const a = alpha * Math.exp(-x * x);
	if (a <= 0.0001) return;
	acc.r += rgb[0] * a;
	acc.g += rgb[1] * a;
	acc.b += rgb[2] * a;
	acc.a += a;
};

const paintSunTransitionCanvas = (
	canvas: HTMLCanvasElement,
	visual: SunTransitionVisualState | null
) => {
	canvas.width = SUN_TRANSITION_CANVAS_SIZE_PX;
	canvas.height = SUN_TRANSITION_CANVAS_SIZE_PX;

	const ctx = canvas.getContext('2d');
	if (!ctx) return false;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (!visual) return true;

	const w = canvas.width;
	const h = canvas.height;
	const imageData = ctx.createImageData(w, h);
	const data = imageData.data;
	const p = visual.progress;
	const sunriseT = visual.phase === 'sunrise' ? p : 1 - p;
	const violetGate =
		visual.phase === 'sunrise'
			? 1 - smoothstep(0.52, 0.98, p) * 0.66
			: smoothstep(0.14, 0.82, p);
	const roseGate =
		visual.phase === 'sunrise'
			? 1 - smoothstep(0.72, 1, p) * 0.28
			: smoothstep(0.06, 0.72, p);
	const warmGate =
		visual.phase === 'sunrise'
			? smoothstep(0.12, 0.66, p)
			: 1 - smoothstep(0.44, 0.98, p) * 0.52;
	const goldGate =
		visual.phase === 'sunrise'
			? smoothstep(0.32, 0.88, p)
			: 1 - smoothstep(0.16, 0.78, p);
	const paleGate =
		visual.phase === 'sunrise'
			? smoothstep(0.52, 0.96, p)
			: 1 - smoothstep(0.08, 0.6, p);

	for (let y = 0; y < h; y += 1) {
		const mercatorY = (y + 0.5) / h;
		const lat =
			(Math.atan(Math.sinh(Math.PI * (1 - 2 * mercatorY))) * 180) / Math.PI;
		const latRad = (lat * Math.PI) / 180;
		const absLat = Math.abs(lat);
		const polarTaper = 1 - smoothstep(62, 84, absLat);
		const midLatLift = 0.72 + 0.28 * (1 - smoothstep(8, 58, absLat));

		for (let x = 0; x < w; x += 1) {
			const lng = ((x + 0.5) / w) * 360 - 180;
			const lngRad = (lng * Math.PI) / 180;
			const wobble =
				8.5 * Math.sin(latRad * 1.55 + lngRad * 0.74 + sunriseT * 1.8) +
				4.25 * Math.sin(lngRad * 2.2 - latRad * 0.9 - sunriseT * 2.4);
			const arrowTilt = lat * 0.16 * visual.direction;
			const signedDist =
				normalizeLngDeg(lng + wobble + arrowTilt - visual.centerLng) *
				visual.direction;
			const latAlpha = polarTaper * midLatLift;
			if (latAlpha <= 0.001) continue;

			const acc = { r: 0, g: 0, b: 0, a: 0 };
			const intensity = visual.intensity * latAlpha * SUN_TRANSITION_COLOR_ALPHA_MULT;
			addSunTransitionColor(acc, signedDist, -62, 34, [12, 24, 72], 0.08 * intensity);
			addSunTransitionColor(acc, signedDist, -43, 25, [78, 55, 145], 0.13 * intensity * violetGate);
			addSunTransitionColor(acc, signedDist, -28, 20, [178, 62, 142], 0.16 * intensity * violetGate);
			addSunTransitionColor(acc, signedDist, -13, 19, [238, 94, 116], 0.2 * intensity * roseGate);
			addSunTransitionColor(acc, signedDist, 4, 17, [255, 137, 82], 0.18 * intensity * warmGate);
			addSunTransitionColor(acc, signedDist, 18, 14, [255, 188, 82], 0.15 * intensity * goldGate);
			addSunTransitionColor(acc, signedDist, 31, 12, [255, 236, 172], 0.1 * intensity * paleGate);

			const alpha = clamp(acc.a, 0, SUN_TRANSITION_MAX_PIXEL_ALPHA);
			if (alpha <= 0.001) continue;

			const idx = (y * w + x) * 4;
			data[idx] = Math.round(clamp(acc.r / acc.a, 0, 255));
			data[idx + 1] = Math.round(clamp(acc.g / acc.a, 0, 255));
			data[idx + 2] = Math.round(clamp(acc.b / acc.a, 0, 255));
			data[idx + 3] = Math.round(alpha * 255);
		}
	}

	ctx.putImageData(imageData, 0, 0);
	return true;
};

const createSunTransitionCanvas = (): HTMLCanvasElement | null => {
	if (typeof document === 'undefined') return null;

	const canvas = document.createElement('canvas');
	if (!paintSunTransitionCanvas(canvas, null)) return null;
	return canvas;
};
const drawCloudExtraPasses = (
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	extraPasses: number,
	offsetShift = 0,
	passAlphaMultiplier = 1,
	passSpreadMultiplier = 1
) => {
	const count = clamp(extraPasses, 0, CLOUDS_EXTRA_PASS_OFFSETS.length);
	const passAlpha = clamp(passAlphaMultiplier, 0, 1);
	const passSpread = clamp(passSpreadMultiplier, 0.35, 2.5);
	const fullPasses = Math.floor(count);
	const fractionalPass = count - fullPasses;
	const totalPasses = fullPasses + (fractionalPass > 0.001 ? 1 : 0);
	if (totalPasses <= 0 || passAlpha <= 0.001) return;

	const baseAlpha = ctx.globalAlpha;
	for (let p = 0; p < totalPasses; p++) {
		const alphaMul = p < fullPasses ? 1 : fractionalPass;
		if (alphaMul <= 0.001) continue;
		const [oxT, oyT] =
			CLOUDS_EXTRA_PASS_OFFSETS[
				(p + offsetShift) % CLOUDS_EXTRA_PASS_OFFSETS.length
			];
		ctx.globalAlpha = baseAlpha * alphaMul * passAlpha;
		ctx.translate(w * oxT * passSpread, h * oyT * passSpread);
		ctx.fillRect(-w * 2, -h * 2, w * 5, h * 5);
	}
	ctx.globalAlpha = baseAlpha;
};

const buildCloudsOpacityExpr = (
	globeZoomOpacity: number,
	decorativeZoomOpacity: number,
	deepZoomFloor: number = 0
) => [
	'interpolate',
	['linear'],
	['zoom'],
	0,
	globeZoomOpacity,
	MAP_MIN_ZOOM,
	globeZoomOpacity,
	4,
	decorativeZoomOpacity,
	CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
	decorativeZoomOpacity,
	CLOUDS_OVERLAY_FADE_OUT_END_ZOOM,
	deepZoomFloor,
	22,
	deepZoomFloor,
];

const buildSnowOpacityExpr = (opacity: number) => {
	const o = clamp(opacity * SNOW_LAYER_OPACITY, 0, 1);
	return [
		'interpolate',
		['linear'],
		['zoom'],
		0,
		o,
		MAP_MIN_ZOOM,
		o,
		DASHBOARD_DECORATIVE_ZOOM,
		o * 0.98,
		CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
		o * 0.62,
		SNOW_HIDE_AT_OR_ABOVE_ZOOM,
		0,
		22,
		0,
	];
};

const buildLightningOpacityExpr = (intensity: number) => [
	'interpolate',
	['linear'],
	['zoom'],
	0,
	intensity,
	MAP_MIN_ZOOM,
	intensity,
	4,
	intensity,
	CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
	intensity * 0.9,
	CLOUDS_OVERLAY_FADE_OUT_END_ZOOM,
	0,
	22,
	0,
];

const applyMurmurGlobeLighting = (mapInstance: mapboxgl.Map) => {
	try {
		const bearing =
			typeof mapInstance.getBearing === 'function' ? mapInstance.getBearing() : 0;
		const azimuth =
			(MURMUR_GLOBE_LIGHT_VIEWER_AZIMUTH_OFFSET_DEG + (bearing || 0) + 360) % 360;
		const polar = MURMUR_GLOBE_LIGHT_POLAR_DEG;

		(mapInstance as any).setLights?.([
			{
				id: 'murmur-ambient',
				type: 'ambient',
				properties: {
					color: 'rgb(120, 150, 185)',
					intensity: 0.18,
				},
			},
			{
				id: 'murmur-key',
				type: 'directional',
				properties: {
					color: 'rgb(255, 244, 220)',
					intensity: 1.6,
					direction: [azimuth, polar],
					'cast-shadows': true,
					'shadow-intensity': 0.95,
				},
			},
		]);
	} catch {
		// Non-fatal on older Mapbox styles that don't support setLights.
	}
};

// Mapbox Streets v12 has no "land" fill layer covering every continent — the cream land
// tone is just the background layer showing through gaps in landuse/landcover/water.
// That means *any* time tiles are streaming in (initial load, a sudden zoom-out, a pan
// into untiled territory), the background is all the user sees, and there is no single
// color that reads correctly for both land and water.
//
// Fix: paint the background permanently ocean-blue (so untiled sphere reads as water)
// and add a separate cream-colored fill layer sourced from Mapbox's free vector tileset
// `mapbox.country-boundaries-v1`, which has complete world coverage (every country, plus
// Antarctica) and is extremely lightweight. Country tiles cache at all zooms, so after
// the first paint the continents stay cream through every subsequent zoom/pan; water
// fills still draw blue on top, so lakes/rivers inside countries look right.
// Visual night intentionally keeps the day basemap palette — the night look is
// driven by DOM overlays + globe lighting, not by recoloring tiles. This getter
// stays as a single source of truth for the basemap colors.
const getMapPalette = () => ({
	ocean: MAP_OCEAN_BLUE,
	land: MAP_LAND_CREAM,
	landcover: MAP_LANDCOVER_GREEN,
});

const getNightRoadHideT = (nightT: number, zoom: number) => {
	const night = clamp(nightT, 0, 1);
	if (night <= NIGHT_HIDE_ROADS_START_T) return 0;

	const t =
		night >= NIGHT_HIDE_ROADS_END_T
			? 1
			: (night - NIGHT_HIDE_ROADS_START_T) /
				(NIGHT_HIDE_ROADS_END_T - NIGHT_HIDE_ROADS_START_T);
	const nightHideT = t * t * (3 - 2 * t);

	if (zoom <= NIGHT_HIDE_ROADS_RESTORE_START_ZOOM) return nightHideT;
	if (zoom >= NIGHT_HIDE_ROADS_RESTORE_END_ZOOM) return 0;
	const zt =
		(zoom - NIGHT_HIDE_ROADS_RESTORE_START_ZOOM) /
		(NIGHT_HIDE_ROADS_RESTORE_END_ZOOM - NIGHT_HIDE_ROADS_RESTORE_START_ZOOM);
	const z2 = clamp(zt, 0, 1);
	const restoreT = z2 * z2 * (3 - 2 * z2);
	return nightHideT * (1 - restoreT);
};

const basemapRoadOpacityBaseByMap = new WeakMap<mapboxgl.Map, Map<string, any | null>>();

const getBasemapRoadOpacityBase = (mapInstance: mapboxgl.Map, layerId: string) => {
	let byLayerId = basemapRoadOpacityBaseByMap.get(mapInstance);
	if (!byLayerId) {
		byLayerId = new Map();
		basemapRoadOpacityBaseByMap.set(mapInstance, byLayerId);
	}

	if (byLayerId.has(layerId)) return byLayerId.get(layerId) ?? null;

	try {
		const base = mapInstance.getPaintProperty(layerId, 'line-opacity') as any;
		byLayerId.set(layerId, base == null ? null : base);
		return base == null ? null : base;
	} catch {
		byLayerId.set(layerId, null);
		return null;
	}
};

// Night-aware atmosphere — layered on top of the mood-driven fog so the
// existing Mapbox stars/atmosphere read differently when night falls without
// adding any new overlay. Three coupled adjustments, all subtle:
//
//   * `star-intensity` ramps 0.9 → 1.0. Mapbox caps at 1, so we use the full
//     remaining headroom; the perceived glow comes from the stars hitting their
//     ceiling while the surrounding palette darkens.
//   * Close-fog `color` keeps the mood's hue but its alpha scales down at
//     night. This pulls the limb-hugging mist *off* the globe so the haze
//     stops reading as exhalation from the planet's surface.
//   * `space-color` lifts a hair from pure black toward a deeply cool void.
//     This is the atmospheric scatter the user wants — it sits in the space
//     around the globe (driven by Mapbox's camera/projection, so it adapts
//     to zoom and panning automatically — not an overlay we'd have to mask
//     against the earth).
const applyMapboxFogForMoodAndNight = (
	mapInstance: mapboxgl.Map,
	cfg: { fogColor: string; fogHighColor: string; fogHorizonBlend: number },
	nightT: number
) => {
	try {
		const t = clamp(nightT, 0, 1);
		const existingFog = (mapInstance as any).getFog?.() ?? {};

		const starIntensity = lerp(NIGHT_STAR_INTENSITY_DAY, NIGHT_STAR_INTENSITY_NIGHT, t);
		const spaceColor = formatCssColor([
			lerp(NIGHT_SPACE_COLOR_DAY[0], NIGHT_SPACE_COLOR_NIGHT[0], t),
			lerp(NIGHT_SPACE_COLOR_DAY[1], NIGHT_SPACE_COLOR_NIGHT[1], t),
			lerp(NIGHT_SPACE_COLOR_DAY[2], NIGHT_SPACE_COLOR_NIGHT[2], t),
			1,
		]);

		// Scale only the alpha of the mood's chosen close-fog color so the hue
		// remains the mood's; we are dialing how *present* the limb mist is, not
		// recoloring it.
		const baseClose = parseCssColor(cfg.fogColor);
		const alphaScale = lerp(NIGHT_CLOSE_FOG_ALPHA_DAY, NIGHT_CLOSE_FOG_ALPHA_NIGHT, t);
		const closeFogColor = baseClose
			? formatCssColor([baseClose[0], baseClose[1], baseClose[2], baseClose[3] * alphaScale])
			: cfg.fogColor;

		(mapInstance as any).setFog?.({
			...existingFog,
			color: closeFogColor,
			'high-color': cfg.fogHighColor,
			'horizon-blend': cfg.fogHorizonBlend,
			'star-intensity': starIntensity,
			'space-color': spaceColor,
		});
	} catch {
		// Non-fatal.
	}
};

const applyNightLandPalette = (mapInstance: mapboxgl.Map, nightT: number) => {
	const zoom = mapInstance.getZoom() ?? MAP_DEFAULT_ZOOM;
	const palette = getMapPalette();
	const roadOpacityMul = 1 - getNightRoadHideT(nightT, zoom);

	try {
		if (mapInstance.getLayer(MAP_WORLD_LAND_LAYER_ID)) {
			mapInstance.setPaintProperty(MAP_WORLD_LAND_LAYER_ID, 'fill-color', palette.land);
		}
	} catch {
		// Non-fatal.
	}

	try {
		const style = mapInstance.getStyle();
		for (const layer of style.layers ?? []) {
			const id = (layer as any)?.id as string | undefined;
			if (!id || id.startsWith('murmur-')) continue;

			const type = (layer as any).type as string | undefined;
			const sourceLayer = (layer as any)['source-layer'] as string | undefined;
			const idLower = id.toLowerCase();

			try {
				if (type === 'background') {
					mapInstance.setPaintProperty(id, 'background-color', palette.ocean);
				} else if (
					type === 'fill' &&
					(idLower === 'water' || idLower.startsWith('water'))
				) {
					mapInstance.setPaintProperty(id, 'fill-color', palette.ocean);
				} else if (
					type === 'fill' &&
					(idLower.includes('landcover') ||
						idLower.includes('national-park') ||
						idLower.includes('pitch') ||
						idLower === 'park' ||
						idLower.startsWith('park'))
				) {
					mapInstance.setPaintProperty(id, 'fill-color', palette.landcover);
				} else if (
					type === 'fill' &&
					(idLower.includes('landuse') || idLower === 'land')
				) {
					mapInstance.setPaintProperty(id, 'fill-color', palette.land);
				} else if (
					type === 'line' &&
					(sourceLayer === 'road' ||
						idLower.includes('road') ||
						idLower.includes('motorway') ||
						idLower.includes('highway') ||
						idLower.includes('bridge') ||
						idLower.includes('tunnel'))
				) {
					const baseOpacity = getBasemapRoadOpacityBase(mapInstance, id);
					if (roadOpacityMul <= 0.001) {
						mapInstance.setPaintProperty(id, 'line-opacity', 0);
					} else if (baseOpacity == null) {
						mapInstance.setPaintProperty(id, 'line-opacity', roadOpacityMul);
					} else if (roadOpacityMul >= 0.999) {
						mapInstance.setPaintProperty(id, 'line-opacity', baseOpacity);
					} else {
						mapInstance.setPaintProperty(
							id,
							'line-opacity',
							scaleMapboxOpacityExpr(baseOpacity, roadOpacityMul)
						);
					}
				}
			} catch {
				// Data-driven color expression we can't override — skip.
			}
		}
	} catch {
		// Non-fatal.
	}
};

const applyFreeTrialMapVisualTuning = (mapInstance: mapboxgl.Map) => {
	// Projection
	try {
		mapInstance.setProjection({ name: 'globe' } as any);
	} catch {
		// Non-fatal.
	}

	// Fog / atmosphere (subtle glow) — cooler, less saturated to match a Google-Earth-style tone.
	try {
		const existingFog = (mapInstance as any).getFog?.() ?? {};
		(mapInstance as any).setFog?.({
			...existingFog,
			color: 'rgba(180, 210, 215, 0.32)',
			'high-color': 'rgb(18, 44, 78)',
			'space-color': 'rgb(0, 0, 0)',
			'star-intensity': 0.9,
			'horizon-blend': 0.022,
		});
	} catch {
		// Non-fatal.
	}

	// Softbox key light, anchored to the viewer (not to the world). See
	// applyMurmurGlobeLighting for the bearing-compensation trick that keeps the
	// light on the viewer's upper-left regardless of how the globe is spun.
	applyMurmurGlobeLighting(mapInstance);

	// Basemap layer cleanup (hide words + borders; keep our layers) + cooler palette recolor.
	try {
		const style = mapInstance.getStyle();
		for (const layer of style.layers ?? []) {
			const id = (layer as any)?.id as string | undefined;
			if (!id) continue;
			if (id.startsWith('murmur-')) continue;

			const type = (layer as any).type as string | undefined;
			const sourceLayer = (layer as any)['source-layer'] as string | undefined;
			const idLower = id.toLowerCase();

			// Text/icon labels
			if (type === 'symbol') {
				mapInstance.setLayoutProperty(id, 'visibility', 'none');
				continue;
			}

			// Political/administrative boundaries (borders)
			if (
				type === 'line' &&
				(idLower.includes('admin') ||
					idLower.includes('boundary') ||
					idLower.includes('border'))
			) {
				mapInstance.setLayoutProperty(id, 'visibility', 'none');
				continue;
			}

			// Roads / highways — recolor to a soft light gray (lighter than state borders).
			if (
				type === 'line' &&
				(sourceLayer === 'road' ||
					idLower.includes('road') ||
					idLower.includes('motorway') ||
					idLower.includes('highway') ||
					idLower.includes('bridge') ||
					idLower.includes('tunnel'))
			) {
				try {
					mapInstance.setPaintProperty(id, 'line-color', '#E5E9EC');
				} catch {
					// Data-driven color expression we can't override — skip.
				}
				continue;
			}

			// Tone: shift the base palette toward a cooler, softer look (muted teal water,
			// warm cream land, sage vegetation). Wrapped per-layer so data-driven expressions
			// we can't overwrite just get skipped.
			try {
				if (type === 'background') {
					// Permanently ocean-blue so any untiled sphere (initial load, zoom-outs,
					// pans into untiled areas) reads as water. The cream land tone comes
					// from the `murmur-world-land-fill` layer added in ensureMapboxSourcesAndLayers.
					mapInstance.setPaintProperty(id, 'background-color', MAP_OCEAN_BLUE);
				} else if (
					type === 'fill' &&
					(idLower === 'water' || idLower.startsWith('water'))
				) {
					mapInstance.setPaintProperty(id, 'fill-color', MAP_OCEAN_BLUE);
				} else if (
					type === 'fill' &&
					(idLower.includes('landcover') ||
						idLower.includes('national-park') ||
						idLower.includes('pitch') ||
						idLower === 'park' ||
						idLower.startsWith('park'))
				) {
					mapInstance.setPaintProperty(id, 'fill-color', MAP_LANDCOVER_GREEN);
				} else if (type === 'fill' && idLower.includes('landuse')) {
					mapInstance.setPaintProperty(id, 'fill-color', MAP_LAND_CREAM);
				} else if (type === 'fill' && idLower === 'land') {
					mapInstance.setPaintProperty(id, 'fill-color', MAP_LAND_CREAM);
				}
			} catch {
				// Layer color isn't a plain literal — leave as-is.
			}
		}
	} catch {
		// Non-fatal.
	}
};

const ensureWorldLandFill = (mapInstance: mapboxgl.Map) => {
	try {
		if (!mapInstance.getSource(MAP_WORLD_LAND_SOURCE_ID)) {
			mapInstance.addSource(MAP_WORLD_LAND_SOURCE_ID, {
				type: 'vector',
				url: MAP_WORLD_LAND_TILESET_URL,
			} as any);
		}
	} catch {
		// If source add fails (offline / token scoped out) the background stays
		// ocean-blue everywhere, which is a graceful degradation.
		return;
	}

	if (mapInstance.getLayer(MAP_WORLD_LAND_LAYER_ID)) return;

	// Insert the land fill as the first layer above `background` so every other
	// Mapbox layer (water, landuse, roads, labels) draws on top. We can't assume
	// any particular layer name exists, so we look up the first non-background,
	// non-`murmur-` layer and insert before it.
	let beforeId: string | undefined;
	try {
		const style = mapInstance.getStyle();
		for (const layer of style?.layers ?? []) {
			const id = (layer as any)?.id as string | undefined;
			if (!id) continue;
			if (id.startsWith('murmur-')) continue;
			if ((layer as any)?.type === 'background') continue;
			beforeId = id;
			break;
		}
	} catch {
		// Fall through — we'll just append without a `before` target.
	}

	try {
		mapInstance.addLayer(
			{
				id: MAP_WORLD_LAND_LAYER_ID,
				type: 'fill',
				source: MAP_WORLD_LAND_SOURCE_ID,
				'source-layer': MAP_WORLD_LAND_SOURCE_LAYER,
				paint: {
					'fill-color': MAP_LAND_CREAM,
					'fill-antialias': true,
				},
			} as any,
			beforeId
		);
	} catch {
		// Non-fatal.
	}
};

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

const getMarkerConstellationZoomFadedOpacity = (opacity: any): any => {
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

const getMarkerConstellationNodeZoomFadedOpacity = (opacity: number): any => {
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

const computeDotWaveTravelMs = (featureCount: number): number => {
	if (!Number.isFinite(featureCount) || featureCount <= 0) return DOT_WAVE_TRAVEL_MS_MIN;
	const raw = 800 + Math.sqrt(featureCount) * 22;
	return clamp(Math.round(raw), DOT_WAVE_TRAVEL_MS_MIN, DOT_WAVE_TRAVEL_MS_MAX);
};

const computeDotWaveDelayMs = (
	featureId: number,
	lng: number,
	lat: number,
	minLng: number,
	maxLng: number,
	minLat: number,
	maxLat: number,
	travelMs: number
): number => {
	const denomLng = maxLng - minLng;
	const tLng =
		!Number.isFinite(denomLng) || denomLng <= 1e-9
			? 0
			: clamp((lng - minLng) / denomLng, 0, 1);

	const denomLat = maxLat - minLat;
	const tLat =
		!Number.isFinite(denomLat) || denomLat <= 1e-9
			? 0.5
			: clamp((lat - minLat) / denomLat, 0, 1);
	const latUndulation = (Math.sin(tLat * Math.PI) - 0.5) * 0.14 * travelMs;

	const h = (featureId * 2654435761) >>> 0;
	const jitter =
		DOT_WAVE_JITTER_MS > 0 ? ((h & 0xffff) / 0x10000) * DOT_WAVE_JITTER_MS : 0;

	return Math.max(0, tLng * travelMs + latUndulation + jitter);
};

const getBasemapCartographyLayerIds = (mapInstance: mapboxgl.Map): string[] => {
	const layers = mapInstance.getStyle()?.layers ?? [];
	const ids: string[] = [];

	for (const layer of layers as any[]) {
		const id = layer?.id as string | undefined;
		if (!id) continue;
		// Never touch our custom layers.
		if (id.startsWith('murmur-')) continue;

		const type = layer?.type as string | undefined;
		if (type === 'symbol') {
			ids.push(id);
			continue;
		}
		if (type === 'line') {
			// Only clip *roads* (not coastlines/admin boundaries/etc) to avoid extra work.
			const sourceLayer = (layer?.['source-layer'] as string | undefined) ?? '';
			if (sourceLayer === 'road' || id.includes('road')) {
				ids.push(id);
			}
		}
	}

	return ids;
};

const applyUsOnlyBasemapCartography = (
	mapInstance: mapboxgl.Map,
	usGeometry: Extract<GeoJsonGeometry, { type: 'MultiPolygon' }>,
	clipState: BasemapCartographyClipState
) => {
	if (clipState.layerIds.length === 0) {
		clipState.layerIds = getBasemapCartographyLayerIds(mapInstance);
	}

	for (const id of clipState.layerIds) {
		try {
			if (!clipState.originalFilters.has(id)) {
				const original = mapInstance.getFilter(id) as any;
				clipState.originalFilters.set(id, original ?? null);
			}

			const existingFilter = clipState.originalFilters.get(id) as any;
			const withinFilter = ['within', usGeometry] as any;
			const nextFilter = existingFilter
				? (['all', existingFilter, withinFilter] as any)
				: withinFilter;
			mapInstance.setFilter(id, nextFilter);
		} catch {
			// Ignore layers that disappear or can't be mutated.
		}
	}
};

const restoreBasemapCartography = (
	mapInstance: mapboxgl.Map,
	clipState: BasemapCartographyClipState
) => {
	if (clipState.layerIds.length === 0) return;
	for (const id of clipState.layerIds) {
		try {
			if (!clipState.originalFilters.has(id)) continue;
			const original = clipState.originalFilters.get(id) ?? null;
			mapInstance.setFilter(id, original);
		} catch {
			// Ignore.
		}
	}
};

const getNightStateLineDarkenT = (nightT: number) => {
	const night = clamp(nightT, 0, 1);
	const eased = night * night * (3 - 2 * night);
	return clamp(eased * NIGHT_STATE_LINE_DARKEN_MAX, 0, 1);
};

const buildStateDividerLineWidthExpr = () => [
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

const buildStateInteractiveBorderWidthExpr = () => {
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

const buildStateInteractiveBorderColorExpr = (nightT: number) => {
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

const buildLockedStateOutlineWidthExpr = () => [
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

const applyStateOverlayNightColors = (mapInstance: mapboxgl.Map, nightT: number) => {
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

const getDevMoodTransitionMs = (): number | null => {
	if (typeof window === 'undefined') return null;
	try {
		const raw = new URLSearchParams(window.location.search).get('devMoodTransitionMs');
		if (!raw) return null;
		const n = Number(raw);
		if (!Number.isFinite(n)) return null;
		return clamp(Math.round(n), 1_000, 15 * 60_000);
	} catch {
		return null;
	}
};


const computeRuntimeNightT = (
	nightLighting: GlobeNightLightingLike | null | undefined,
	fallbackNightT: number,
	nowMs: number = Date.now()
) => {
	if (!nightLighting) return clamp(fallbackNightT, 0, 1);

	if (nightLighting.phase === 'sunrise' || nightLighting.phase === 'sunset') {
		const durationMs = nightLighting.phaseEndMs - nightLighting.phaseStartMs;
		if (!Number.isFinite(durationMs) || durationMs <= 0) {
			return clamp(fallbackNightT, 0, 1);
		}
		const t = clamp((nowMs - nightLighting.phaseStartMs) / durationMs, 0, 1);
		const eased = easeInOutCubic(t);
		return nightLighting.phase === 'sunrise' ? 1 - eased : eased;
	}

	return clamp(nightLighting.nightT ?? fallbackNightT, 0, 1);
};

const computeNightLightsFade = (zoom: number) => {
	if (zoom <= NIGHT_LIGHTS_FADE_START_ZOOM) return 1;
	if (zoom >= NIGHT_LIGHTS_FADE_END_ZOOM) return 0;
	const t =
		(zoom - NIGHT_LIGHTS_FADE_START_ZOOM) /
		(NIGHT_LIGHTS_FADE_END_ZOOM - NIGHT_LIGHTS_FADE_START_ZOOM);
	const inv = 1 - clamp(t, 0, 1);
	// Steep fade: drops quickly after the start zoom so the overlay doesn't read as texture.
	return Math.pow(inv, 2.25);
};

const computeNightLightsZoomOutLift = (zoom: number) => {
	if (zoom <= NIGHT_LIGHTS_ZOOM_OUT_LIFT_START_ZOOM) {
		return NIGHT_LIGHTS_ZOOM_OUT_LIFT_MAX;
	}
	if (zoom >= NIGHT_LIGHTS_ZOOM_OUT_LIFT_END_ZOOM) return 0;
	const t =
		(zoom - NIGHT_LIGHTS_ZOOM_OUT_LIFT_START_ZOOM) /
		(NIGHT_LIGHTS_ZOOM_OUT_LIFT_END_ZOOM - NIGHT_LIGHTS_ZOOM_OUT_LIFT_START_ZOOM);
	const inv = 1 - Math.max(0, Math.min(1, t));
	// Reverse ease-out: keep some lift up through the decorative globe range,
	// then taper off by the default interactive zoom.
	return NIGHT_LIGHTS_ZOOM_OUT_LIFT_MAX * Math.pow(inv, 1.35);
};

const computeNightLightsGlowFade = (zoom: number) => {
	if (zoom <= NIGHT_LIGHTS_GLOW_FADE_START_ZOOM) return 1;
	if (zoom >= NIGHT_LIGHTS_GLOW_FADE_END_ZOOM) return 0;
	const t =
		(zoom - NIGHT_LIGHTS_GLOW_FADE_START_ZOOM) /
		(NIGHT_LIGHTS_GLOW_FADE_END_ZOOM - NIGHT_LIGHTS_GLOW_FADE_START_ZOOM);
	// Ease-out: hold most of the glow, then drop off as we approach state-level zoom.
	return 1 - t * t;
};

const computeNightLightsSpaceGlowFade = (zoom: number) => {
	if (zoom <= NIGHT_LIGHTS_SPACE_GLOW_FADE_START_ZOOM) return 1;
	if (zoom >= NIGHT_LIGHTS_SPACE_GLOW_FADE_END_ZOOM) return 0;
	const t =
		(zoom - NIGHT_LIGHTS_SPACE_GLOW_FADE_START_ZOOM) /
		(NIGHT_LIGHTS_SPACE_GLOW_FADE_END_ZOOM - NIGHT_LIGHTS_SPACE_GLOW_FADE_START_ZOOM);
	const inv = 1 - clamp(t, 0, 1);
	// Space-only: keep it present across the fully zoomed-out "US from space" range,
	// then drop quickly before state-level interaction.
	return inv * inv;
};

const computeNightLightsCrispMul = (zoom: number) => {
	if (zoom <= NIGHT_LIGHTS_CRISP_FADE_OUT_START_ZOOM) return 1;
	if (zoom >= NIGHT_LIGHTS_CRISP_FADE_OUT_END_ZOOM) return 0;
	const t =
		(zoom - NIGHT_LIGHTS_CRISP_FADE_OUT_START_ZOOM) /
		(NIGHT_LIGHTS_CRISP_FADE_OUT_END_ZOOM - NIGHT_LIGHTS_CRISP_FADE_OUT_START_ZOOM);
	const inv = 1 - clamp(t, 0, 1);
	// Ease-out: hold crisp longer, then drop as we approach state-level zoom.
	return inv * inv;
};

const computeNightLightsCloseGlowMul = (zoom: number) => {
	if (zoom <= NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_START_ZOOM) return 0;
	if (zoom >= NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_END_ZOOM) return 1;
	const t =
		(zoom - NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_START_ZOOM) /
		(NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_END_ZOOM -
			NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_START_ZOOM);
	// Ease-in: let dots dominate, then let glow take over smoothly.
	return clamp(t, 0, 1) * clamp(t, 0, 1);
};

// NOTE: Night lights are generated offline as raster dot tiles (see scripts/generate_contact_lights_tiles.py).

export const SearchResultsMap: FC<SearchResultsMapProps> = ({
	contacts,
	selectedContacts,
	externallyHoveredContactId,
	searchQuery,
	searchWhat,
	selectedAreaBounds,
	onViewportInteraction,
	onViewportIdle,
	activeTool,
	selectAllInViewNonce,
	onAreaSelect,
	onVisibleOverlayContactsChange,
	onMarkerClick,
	onMarkerHover,
	onToggleSelection,
	onStateSelect,
	enableStateInteractions,
	lockedStateName,
	isLoading,
	disableDotWaveReveal = false,
	skipAutoFit,
	presentation = 'interactive',
	autoSpin = false,
	weatherMood: weatherMoodProp = 'normal',
	weatherRegionCenter = null,
	weatherTemperatureF = null,
	nightLighting = null,
	nightT: nightTProp = null,
}) => {
	const curatedOrbSvgIdPrefix = useId().replace(/:/g, '');
	const curatedOrbSlotIds = useMemo(
		() =>
			Array.from({ length: CURATED_ORB_SLOT_COUNT }, (_, index) => ({
				gradient: `${curatedOrbSvgIdPrefix}-curated-orb-gradient-${index}`,
				bloomGradient: `${curatedOrbSvgIdPrefix}-curated-orb-bloom-gradient-${index}`,
				clipPath: `${curatedOrbSvgIdPrefix}-curated-orb-clip-${index}`,
			})),
		[curatedOrbSvgIdPrefix]
	);
	const selectedStateGradientIds = useMemo(
		() => ({
			gradient: `${curatedOrbSvgIdPrefix}-selected-state-gradient`,
			bloomGradient: `${curatedOrbSvgIdPrefix}-selected-state-bloom-gradient`,
			clipPath: `${curatedOrbSvgIdPrefix}-selected-state-clip`,
		}),
		[curatedOrbSvgIdPrefix]
	);

	const contactLightsTilesEnabled = useMemo(() => {
		// Enabled by default (it's a lightweight raster overlay), but allow a
		// URL escape hatch to disable while tuning: `?devContactLights=0`.
		if (typeof window === 'undefined') return true;
		const raw = new URLSearchParams(window.location.search).get('devContactLights');
		return !(raw === '0' || raw === 'false');
	}, []);

	const contactLightsDebugEnabled = useMemo(() => {
		// Debug helper: logs tile errors + shows tile boundaries so we can diagnose
		// "missing ranges" (404s vs opacity gating vs empty tiles).
		// Enable with: `?devContactLightsDebug=1`
		if (typeof window === 'undefined') return false;
		const raw = new URLSearchParams(window.location.search).get('devContactLightsDebug');
		return raw === '1' || raw === 'true';
	}, []);

	const snowCloudInteractionMultiplier = useMemo(() => {
		// Debug/tuning helper: scale the snow→cloud interaction strength.
		// Examples:
		// - `?devSnowCloud=0` disables interaction
		// - `?devSnowCloud=3` exaggerates it (useful to confirm it’s working)
		if (typeof window === 'undefined') return 1;
		const raw = new URLSearchParams(window.location.search).get('devSnowCloud');
		if (raw == null) return 1;
		const n = Number(raw);
		if (!Number.isFinite(n)) return 1;
		return clamp(n, 0, 6);
	}, []);

	const snowDebugEnabled = useMemo(() => {
		// Visual debug: paints snow as bright magenta dots + highlights interaction impact
		// centers on the clouds canvas so you can immediately confirm snow + interaction
		// are running. Enable with `?devSnowDebug=1`.
		if (typeof window === 'undefined') return false;
		const raw = new URLSearchParams(window.location.search).get('devSnowDebug');
		return raw === '1' || raw === 'true';
	}, []);

	const weatherMood = MANUAL_WEATHER_MOOD_OVERRIDE ?? weatherMoodProp;
	const effectiveTemperatureF =
		MANUAL_WEATHER_TEMPERATURE_OVERRIDE_F ?? weatherTemperatureF;
	const nightT = clamp(
		MANUAL_NIGHT_T_OVERRIDE ?? nightLighting?.nightT ?? nightTProp ?? 0,
		0,
		1
	);
	const dayFarSideShadePhase = nightLighting?.phase ?? null;
	const dayFarSideShadePhaseStartMs = nightLighting?.phaseStartMs ?? null;
	const dayFarSideShadePhaseEndMs = nightLighting?.phaseEndMs ?? null;
	const sunTransitionPhase = nightLighting?.phase ?? null;
	const sunTransitionPhaseStartMs = nightLighting?.phaseStartMs ?? null;
	const sunTransitionPhaseEndMs = nightLighting?.phaseEndMs ?? null;
	const isBackgroundPresentation = presentation === 'background';
	const shouldAutoSpin = isBackgroundPresentation && autoSpin;
	// Keep the latest presentation value available to async Mapbox callbacks (moveend, etc).
	const presentationRef = useRef<'background' | 'interactive'>(presentation);
	presentationRef.current = presentation;

	// Default to enabling state hover/click (hover highlight + click-to-search) when a handler is
	// provided, so callers don't have to pass an explicit `enableStateInteractions` flag.
	const stateInteractionsEnabled =
		enableStateInteractions ?? typeof onStateSelect === 'function';

	// Smooth fade for state overlays (borders + labels) when switching presentations.
	// This prevents the "pause then pop" feeling when transitioning from the decorative globe
	// into the interactive results map.
	const stateOverlayOpacityRef = useRef<number>(0);
	// 0 = divider lines, 1 = interactive borders
	const stateOverlayModeRef = useRef<number>(stateInteractionsEnabled ? 1 : 0);
	const stateOverlayAnimRafRef = useRef<number | null>(null);
	const nightLightingRef = useRef<GlobeNightLightingLike | null>(nightLighting ?? null);
	nightLightingRef.current = nightLighting ?? null;
	const dayFarSideShadeCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const dayFarSideShadeCenterLngRef = useRef<number>(DAY_FAR_SIDE_SHADE_CENTER_LNG);
	const dayFarSideShadeLightingRef = useRef<GlobeNightLightingLike | null>(
		nightLighting ?? null
	);
	dayFarSideShadeLightingRef.current = nightLighting ?? null;
	const sunTransitionCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const sunTransitionPaintKeyRef = useRef<string>('');
	const cloudsCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsCanvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
	const cloudsTextureImageRef = useRef<HTMLImageElement | null>(null);
	const cloudsTextureLoadPromiseRef = useRef<Promise<HTMLImageElement> | null>(null);
	const cloudsTextureScratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsTextureHazeCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsTexturePatternHazeRef = useRef<CanvasPattern | null>(null);
	const cloudsTexturePatternRef = useRef<CanvasPattern | null>(null);
	const cloudsTexturePatternSecondaryRef = useRef<CanvasPattern | null>(null);
	const cloudsTextureSecondaryCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsTextureSecondaryReadyRef = useRef<boolean>(false);
	const cloudsTextureStormCorePatternRef = useRef<CanvasPattern | null>(null);
	const cloudsTextureStormCoreCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsTextureStormEdgePatternRef = useRef<CanvasPattern | null>(null);
	const cloudsTextureStormEdgeCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsTextureStormReadyRef = useRef<boolean>(false);
	const cloudsTextureStormCoreGroupPatternsRef = useRef<(CanvasPattern | null)[] | null>(
		null
	);
	const cloudsTextureStormEdgeGroupPatternsRef = useRef<(CanvasPattern | null)[] | null>(
		null
	);
	const cloudsTextureGroupPatternsRef = useRef<(CanvasPattern | null)[] | null>(null);
	const cloudsTextureGroupCanvasesRef = useRef<HTMLCanvasElement[] | null>(null);
	const cloudsTextureGroupReadyRef = useRef<boolean>(false);
	const cloudsTextureGroupDebugLoggedRef = useRef<boolean>(false);
	const cloudsTextureGroupDebugActiveLoggedRef = useRef<boolean>(false);
	const cloudsDriftGroupOffsetsRef = useRef<{ x: number; y: number }[]>([
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
		{ x: 0, y: 0 },
	]);
	const cloudsDriftRafRef = useRef<number | null>(null);
	const cloudsDriftLastFrameMsRef = useRef<number>(0);
	const cloudsDriftOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const cloudsDriftOffsetSecondaryRef = useRef<{ x: number; y: number }>({
		x: 0,
		y: 0,
	});
	const cloudsDriftSimTimeMsRef = useRef<number>(0);
	const lightningCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const lightningCanvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
	const lightningStampImagesRef = useRef<HTMLImageElement[] | null>(null);
	const lightningStampLoadPromiseRef = useRef<Promise<HTMLImageElement[]> | null>(null);
	const lightningPotentialU8Ref = useRef<Uint8Array | null>(null);
	const lightningPotentialLoadPromiseRef = useRef<Promise<Uint8Array> | null>(null);
	const lightningEventsRef = useRef<StormLightningEvent[]>([]);
	const lightningStormCellsRef = useRef<StormLightningCell[] | null>(null);
	const lightningStormCellsKeyRef = useRef<string>('');
	const lightningNextFlashAtMsRef = useRef<number>(0);
	const lightningBurstRemainingRef = useRef<number>(0);
	const lightningRestrikeCellRef = useRef<StormLightningCell | null>(null);
	const lightningEventIdRef = useRef<number>(1);
	const lightningWasEnabledRef = useRef<boolean>(false);
	const snowCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const snowCanvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
	const snowStampImagesRef = useRef<HTMLImageElement[] | null>(null);
	const snowStampLoadPromiseRef = useRef<Promise<HTMLImageElement[]> | null>(null);
	const snowParticlesRef = useRef<SnowParticle[] | null>(null);
	const cloudsSnowInteractionScratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsSnowInteractionScratchCtxRef = useRef<CanvasRenderingContext2D | null>(null);
	const cloudsSnowInteractionThinStampRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsSnowInteractionGlowStampRef = useRef<HTMLCanvasElement | null>(null);
	const prevIsBackgroundPresentationRef = useRef<boolean>(isBackgroundPresentation);
	// Live weather-mood config — read by the cloud animation tick and the lighting
	// overlay opacity calc. Initialized to `normal` so behavior matches pre-weather
	// visuals until applyWeatherMood() runs.
	const weatherMoodConfigRef = useRef<RuntimeMoodVisualConfig>(
		toRuntimeMoodConfig(getMoodConfig('normal'))
	);
	const appliedWeatherMoodRef = useRef<WeatherMood>('normal');
	const moodTransitionRef = useRef<{
		from: RuntimeMoodVisualConfig;
		to: RuntimeMoodVisualConfig;
		startMs: number;
		continuousMs: number;
		discreteMs: number;
	} | null>(null);
	const moodTransitionRafRef = useRef<number | null>(null);
	const moodTransitionLastPaintMsRef = useRef<number>(0);
	const weatherRegionCenterRef = useRef<LatLngLiteral | null>(weatherRegionCenter);
	weatherRegionCenterRef.current = weatherRegionCenter;
	// Mutated by the temperature effect; read by `applyLightingOverlayOpacity`
	// on every zoom event so the hot lift survives zoom-driven recalculations.
	const isHotRef = useRef<boolean>(false);
	// Night factor (0=day, 1=deep night). Stored in a ref so zoom-driven opacity
	// updates can stay fully imperative without React re-render jitter.
	const nightTRef = useRef<number>(nightT);
	nightTRef.current = nightT;
	// 0..1 fade that suppresses the lights overlay until tiles are ready, avoiding
	// the half-loaded "patchy" initial look.
	const nightLightsLoadTRef = useRef<number>(0);
	const nightLightsLoadStartedRef = useRef<boolean>(false);
	// 0..1 fade used during zoom interactions; we hide the overlay while raster tiles
	// are streaming to avoid the "hairy" intermediate look.
	const nightLightsZoomLoadTRef = useRef<number>(1);
	// Intro reveal animation state (west->east dot reveal, then crossfade to real tiles).
	const nightLightsIntroRevealTRef = useRef<number>(0);
	const nightLightsIntroCrossfadeTRef = useRef<number>(0);
	const nightLightsIntroDoneRef = useRef<boolean>(false);
	// Capture the base Mapbox paint values once, then we apply a multiplier for fading.
	const stateLineOpacityBaseRef = useRef<{ dividers: any; borders: any } | null>(null);

	const [selectedMarker, setSelectedMarker] = useState<ContactWithName | null>(null);
	const [hoveredMarkerId, setHoveredMarkerId] = useState<number | null>(null);
	const hoveredMarkerIdRef = useRef<number | null>(null);
	const hoverSourceRef = useRef<'map' | 'external' | null>(null);
	// Track tooltip that is fading out (for smooth transition)
	const [fadingTooltipId, setFadingTooltipId] = useState<number | null>(null);
	const fadingTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const [map, setMap] = useState<mapboxgl.Map | null>(null);
	const [isMapLoaded, setIsMapLoaded] = useState(false);
	const initialZoomConstraintsRef = useRef<{ minZoom: number; maxZoom: number } | null>(
		null
	);
	const backgroundSpinCleanupRef = useRef<(() => void) | null>(null);
	const [mapLoadError, setMapLoadError] = useState<string | null>(null);
	const [selectedStateKey, setSelectedStateKey] = useState<string | null>(null);
	const [zoomLevel, setZoomLevel] = useState(MAP_DEFAULT_ZOOM);
	// Live-updated softbox overlay refs. zoomLevel only updates on `moveend`, so
	// we drive these imperatively from the map's `zoom` event to keep the lighting
	// fade in lockstep with pinch/scroll/wheel interactions.
	const lightingOverlayWarmKeyRef = useRef<HTMLDivElement | null>(null);
	const lightingOverlayDarkKeyRef = useRef<HTMLDivElement | null>(null);
	const lightingOverlayShadowRef = useRef<HTMLDivElement | null>(null);
	const lightingOverlaySunSpaceGlowRef = useRef<HTMLDivElement | null>(null);
	const lightingOverlayHotWashRef = useRef<HTMLDivElement | null>(null);
	const lightingOverlayGloomWashRef = useRef<HTMLDivElement | null>(null);
	const lightingOverlayNightDarkWashRef = useRef<HTMLDivElement | null>(null);
	const lightingOverlayNightLowerLeftShadowRef = useRef<HTMLDivElement | null>(null);
	const lightingOverlayNightMoonlightRef = useRef<HTMLDivElement | null>(null);
	const lightingOverlayNightShadeRef = useRef<HTMLDivElement | null>(null);
	const lightingOverlayMoonRimRef = useRef<HTMLDivElement | null>(null);
	const lightingOverlayNightVignetteRef = useRef<HTMLDivElement | null>(null);
	const [visibleContacts, setVisibleContacts] = useState<ContactWithName[]>([]);
	// Keep a "sticky" set of currently-rendered marker ids so zooming can rescale existing markers
	// and only introduce *new* markers, instead of re-sampling a totally different set each time.
	const visibleContactIdSetRef = useRef<Set<number>>(new Set());
	const [bookingExtraVisibleContacts, setBookingExtraVisibleContacts] = useState<
		ContactWithName[]
	>([]);
	const bookingExtraVisibleIdSetRef = useRef<Set<number>>(new Set());
	const lastBookingExtraVisibleContactsKeyRef = useRef<string>('');
	const lastBookingExtraFetchKeyRef = useRef<string>('');
	const [bookingExtraFetchBbox, setBookingExtraFetchBbox] = useState<BoundingBox | null>(
		null
	);
	const [promotionOverlayVisibleContacts, setPromotionOverlayVisibleContacts] = useState<
		ContactWithName[]
	>([]);
	const lastPromotionOverlayVisibleContactsKeyRef = useRef<string>('');
	const lastPromotionOverlayFetchKeyRef = useRef<string>('');
	const [promotionOverlayFetchBbox, setPromotionOverlayFetchBbox] =
		useState<BoundingBox | null>(null);

	// High-zoom "all contacts" overlay (gray dots)
	const [allContactsOverlayVisibleContacts, setAllContactsOverlayVisibleContacts] =
		useState<ContactWithName[]>([]);
	const allContactsOverlayVisibleIdSetRef = useRef<Set<number>>(new Set());
	const lastAllContactsOverlayVisibleContactsKeyRef = useRef<string>('');
	const lastAllContactsOverlayFetchKeyRef = useRef<string>('');
	const [allContactsOverlayFetchBbox, setAllContactsOverlayFetchBbox] =
		useState<BoundingBox | null>(null);
	// Rectangle selection state (dashboard map select tool)
	const [isAreaSelecting, setIsAreaSelecting] = useState(false);
	const selectionStartLatLngRef = useRef<LatLngLiteral | null>(null);
	const selectionStartClientRef = useRef<{ x: number; y: number } | null>(null);
	const selectionBoundsRef = useRef<MapSelectionBounds | null>(null);
	const lastSelectAllInViewNonceRef = useRef<number>(0);
	// Timeout ref for auto-hiding research panel
	const researchPanelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	// Small delay when moving between marker layers (prevents hover flicker)
	const hoverClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	// US state geometry for outlines, hover/click selection, and point-in-polygon checks.
	const usStatesGeoJsonRef = useRef<GeoJsonFeatureCollection | null>(null);
	const usStatesByKeyRef = useRef<
		Map<
			string,
			{
				key: string;
				name: string;
				geometry: GeoJsonGeometry;
				multiPolygon: ClippingMultiPolygon;
				bbox: BoundingBox | null;
			}
		>
	>(new Map());
	const hoveredStateIdRef = useRef<string | number | null>(null);
	const usBasemapClipGeometryRef = useRef<Extract<
		GeoJsonGeometry,
		{ type: 'MultiPolygon' }
	> | null>(null);
	const usBasemapClipMultiPolygonRef = useRef<ClippingMultiPolygon | null>(null);
	const basemapCartographyClipStateRef = useRef<BasemapCartographyClipState>({
		layerIds: [],
		originalFilters: new Map(),
	});
	const isUsBasemapClipActiveRef = useRef(false);
	const lockedStateSelectionMultiPolygonRef = useRef<ClippingMultiPolygon | null>(null);
	const lockedStateSelectionBboxRef = useRef<BoundingBox | null>(null);
	const lockedStateSelectionKeyRef = useRef<string | null>(null);
	const resultsSelectionMultiPolygonRef = useRef<ClippingMultiPolygon | null>(null);
	const resultsSelectionBboxRef = useRef<BoundingBox | null>(null);
	const resultsSelectionSignatureRef = useRef<string>('');
	const curatedBlobSignatureRef = useRef<string>('');
	const curatedBlobProtectedMarkerIdsRef = useRef<Set<number>>(new Set());
	const curatedBlobProtectedMarkerIdsKeyRef = useRef<string>('');
	const [curatedBlobProtectedMarkerIdsNonce, setCuratedBlobProtectedMarkerIdsNonce] =
		useState(0);
	const curatedBlobOrbTargetsRef = useRef<
		Array<{ center: LatLngLiteral; radiusKm: number | null }>
	>([]);
	const curatedOrbRef = useRef<SVGSVGElement | null>(null);
	const curatedOrbEllipseRefs = useRef<Array<SVGEllipseElement | null>>([]);
	const curatedOrbBloomEllipseRefs = useRef<Array<SVGEllipseElement | null>>([]);
	const curatedOrbGradientRefs = useRef<Array<SVGRadialGradientElement | null>>([]);
	const curatedOrbBloomGradientRefs = useRef<
		Array<SVGRadialGradientElement | null>
	>([]);
	const curatedOrbClipPathRefs = useRef<Array<SVGPathElement | null>>([]);
	const selectedStateGradientSvgRef = useRef<SVGSVGElement | null>(null);
	const selectedStateGradientEllipseRef = useRef<SVGEllipseElement | null>(null);
	const selectedStateGradientBloomEllipseRef = useRef<SVGEllipseElement | null>(null);
	const selectedStateGradientRef = useRef<SVGRadialGradientElement | null>(null);
	const selectedStateGradientBloomRef = useRef<SVGRadialGradientElement | null>(null);
	const selectedStateGradientClipPathRef = useRef<SVGPathElement | null>(null);
	const selectedStateMorphSourceRef = useRef<CuratedBlobMorphSource | null>(null);
	const selectedStateDisplayMultiPolygonRef = useRef<ClippingMultiPolygon | null>(null);
	const selectedStateLastMorphTAppliedRef = useRef<number>(Number.NaN);
	const selectedStateOutlineSourceKeyRef = useRef<string>('');
	const curatedBlobLngLatMultiPolygonRef = useRef<ClippingMultiPolygon | null>(null);
	const curatedBlobLngLatShapeMultiPolygonsRef = useRef<ClippingMultiPolygon[]>([]);
	// Source-of-truth for the blob outline morph: the natural smoothed cluster
	// geometries in Mercator space, plus each cluster's own circle target.
	// Each zoom event lerps every vertex from its natural position toward a
	// point on that cluster's circle, parameterized by `t`.
	const naturalBlobMorphSourceRef = useRef<CuratedBlobMorphSource[] | null>(null);
	const lastBlobMorphTAppliedRef = useRef<number>(Number.NaN);
	// Set below from `applyCuratedOrbState` so earlier hooks (e.g. the blob
	// update effect) can request a one-shot orb refresh after centroid changes
	// without taking the callback as a dependency.
	const applyCuratedOrbStateRef = useRef<(() => void) | null>(null);
	const applySelectedStateGradientStateRef = useRef<(() => void) | null>(null);
	const applyBlobMorphRef = useRef<(() => void) | null>(null);
	const lastVisibleContactsKeyRef = useRef<string>('');
	const usStatesPolygonsRef = useRef<PreparedClippingPolygon[] | null>(null);
	const selectedStateKeyRef = useRef<string | null>(null);
	const onStateSelectRef = useRef<SearchResultsMapProps['onStateSelect'] | null>(null);

	const pendingStateClickCinematicRef = useRef<{ key: string; at: number } | null>(null);

	const pendingSearchQueryCinematicRef = useRef<{ key: string; at: number } | null>(null);
	const isLoadingRef = useRef<boolean>(false);
	// Keep `isLoadingRef` synced during render so async Mapbox handlers can read it immediately.
	isLoadingRef.current = isLoading ?? false;

	const stateClickZoomInFlightRef = useRef(false);
	const stateClickZoomInFlightNonceRef = useRef(0);
	const stateClickZoomInFlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [isStateLayerReady, setIsStateLayerReady] = useState(false);

	useEffect(() => {
		void ensureWasmGeoModuleLoaded();
	}, []);

	const syncUsOnlyBasemapCartography = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance || !isMapLoaded) return;
			const usGeometry = usBasemapClipGeometryRef.current;
			if (!usGeometry) return;

			const zoom = mapInstance.getZoom() ?? MAP_DEFAULT_ZOOM;
			let shouldClip = zoom <= US_ONLY_BASEMAP_CLIP_MAX_ZOOM + 0.001;

			// When zoomed in, disable the clip as long as the viewport still intersects the US.
			// This avoids paying the `within`-filter cost on dense road/label tiles during normal city-level usage.
			if (!shouldClip) {
				const usPolys = usBasemapClipMultiPolygonRef.current;
				if (usPolys && usPolys.length) {
					try {
						const bounds = mapInstance.getBounds();
						const center = mapInstance.getCenter();
						if (!bounds || !center) {
							shouldClip = true;
						} else {
							const sw = bounds.getSouthWest();
							const ne = bounds.getNorthEast();
							const samples: Array<{ lng: number; lat: number }> = [
								{ lng: center.lng, lat: center.lat },
								{ lng: sw.lng, lat: sw.lat },
								{ lng: ne.lng, lat: ne.lat },
								{ lng: sw.lng, lat: ne.lat },
								{ lng: ne.lng, lat: sw.lat },
							];
							const anyInUs = samples.some((p) =>
								pointInMultiPolygon([p.lng, p.lat], usPolys)
							);
							if (!anyInUs) shouldClip = true;
						}
					} catch {
						shouldClip = true;
					}
				} else {
					shouldClip = true;
				}
			}
			const clipState = basemapCartographyClipStateRef.current;

			if (shouldClip) {
				if (!isUsBasemapClipActiveRef.current) {
					applyUsOnlyBasemapCartography(mapInstance, usGeometry, clipState);
					isUsBasemapClipActiveRef.current = true;
				}
			} else {
				if (isUsBasemapClipActiveRef.current) {
					restoreBasemapCartography(mapInstance, clipState);
					isUsBasemapClipActiveRef.current = false;
				}
			}
		},
		[isMapLoaded]
	);

	const baseContactIdSet = useMemo(
		() => new Set<number>(contacts.map((c) => c.id)),
		[contacts]
	);

	const searchMode = useMemo(
		() =>
			extractSearchModeFromQueryPrefix(searchQuery) ??
			inferSearchModeFromSearchWhat(searchWhat),
		[searchQuery, searchWhat]
	);
	const isBookingSearch = searchMode === 'booking';
	const isPromotionSearch = searchMode === 'promotion';
	const isAnySearch = useMemo(() => Boolean((searchQuery ?? '').trim()), [searchQuery]);
	const onViewportInteractionRef = useRef<
		SearchResultsMapProps['onViewportInteraction'] | null
	>(null);
	const onViewportIdleRef = useRef<SearchResultsMapProps['onViewportIdle'] | null>(null);
	const selectedAreaBoundsRef = useRef<MapSelectionBounds | null>(null);
	useEffect(() => {
		onViewportInteractionRef.current = onViewportInteraction ?? null;
	}, [onViewportInteraction]);
	useEffect(() => {
		onViewportIdleRef.current = onViewportIdle ?? null;
	}, [onViewportIdle]);
	useEffect(() => {
		selectedAreaBoundsRef.current = selectedAreaBounds ?? null;
	}, [selectedAreaBounds]);
	useEffect(() => {
		visibleContactIdSetRef.current = new Set(visibleContacts.map((c) => c.id));
	}, [visibleContacts]);
	useEffect(() => {
		bookingExtraVisibleIdSetRef.current = new Set(
			bookingExtraVisibleContacts.map((c) => c.id)
		);
	}, [bookingExtraVisibleContacts]);
	useEffect(() => {
		allContactsOverlayVisibleIdSetRef.current = new Set(
			allContactsOverlayVisibleContacts.map((c) => c.id)
		);
	}, [allContactsOverlayVisibleContacts]);
	// When hovering a booking "extra" marker, highlight all other visible extra markers
	// of the same booking category (e.g. hover a festival → highlight all festivals in view).

	// Pre-compute id → category for O(1) lookups when resolving the hovered category.
	const bookingExtraIdToCategory = useMemo(() => {
		const m = new Map<number, string>();
		for (const c of bookingExtraVisibleContacts) {
			const cat = getBookingTitlePrefixFromContactTitle(c.title);
			if (cat) m.set(c.id, cat);
		}
		return m;
	}, [bookingExtraVisibleContacts]);

	const hoveredBookingExtraCategory = useMemo(() => {
		if (!isBookingSearch) return null;
		if (hoveredMarkerId == null) return null;
		return bookingExtraIdToCategory.get(hoveredMarkerId) ?? null;
	}, [isBookingSearch, hoveredMarkerId, bookingExtraIdToCategory]);
	useEffect(() => {
		// Reset the overlay fetch window and any visible extra markers on search transitions.
		lastBookingExtraFetchKeyRef.current = '';
		setBookingExtraFetchBbox(null);
		lastBookingExtraVisibleContactsKeyRef.current = '';
		setBookingExtraVisibleContacts([]);
		lastPromotionOverlayFetchKeyRef.current = '';
		setPromotionOverlayFetchBbox(null);
		lastPromotionOverlayVisibleContactsKeyRef.current = '';
		setPromotionOverlayVisibleContacts([]);
		lastAllContactsOverlayFetchKeyRef.current = '';
		setAllContactsOverlayFetchBbox(null);
		lastAllContactsOverlayVisibleContactsKeyRef.current = '';
		setAllContactsOverlayVisibleContacts([]);
	}, [searchQuery]);

	const normalizedSearchWhatKey = useMemo(
		() => (searchWhat ? normalizeWhatKey(searchWhat) : null),
		[searchWhat]
	);

	// Check if the current search is for a specific category (to apply labels to all results)
	const searchWhatLower = searchWhat?.toLowerCase() || '';
	const isMusicVenuesSearch =
		searchWhatLower.includes('music venue') || searchWhatLower.includes('venues');
	const isRestaurantsSearch = searchWhatLower.includes('restaurant');
	const isCoffeeShopsSearch =
		searchWhatLower.includes('coffee shop') || searchWhatLower.includes('coffee shops');
	const isWeddingPlannersSearch = searchWhatLower.includes('wedding planner');

	// Booking/promotion overlay pins can contain multiple "What" categories at once; only surface
	// the ones that match the active search "What" in the dashboard's right-hand panel.
	const visibleOverlayContactsMatchingWhat = useMemo(() => {
		if (!normalizedSearchWhatKey) return [];

		const byId = new Map<number, ContactWithName>();

		if (isBookingSearch && bookingExtraVisibleContacts.length > 0) {
			for (const contact of bookingExtraVisibleContacts) {
				const prefix = getBookingTitlePrefixFromContactTitle(contact.title);
				if (!prefix) continue;
				if (!bookingTitlePrefixMatchesSearchWhatKey(prefix, normalizedSearchWhatKey))
					continue;
				byId.set(contact.id, contact);
			}
		}

		if (isPromotionSearch && promotionOverlayVisibleContacts.length > 0) {
			for (const contact of promotionOverlayVisibleContacts) {
				const title = contact.title ?? '';
				const matchedPrefix =
					PROMOTION_OVERLAY_TITLE_PREFIXES.find((p) =>
						startsWithCaseInsensitive(title, p)
					) ?? null;
				if (!matchedPrefix) continue;
				if (normalizeWhatKey(matchedPrefix) !== normalizedSearchWhatKey) continue;
				byId.set(contact.id, contact);
			}
		}

		const list = Array.from(byId.values());
		list.sort((a, b) => a.id - b.id);
		return list;
	}, [
		normalizedSearchWhatKey,
		isBookingSearch,
		bookingExtraVisibleContacts,
		isPromotionSearch,
		promotionOverlayVisibleContacts,
	]);

	const lastReportedVisibleOverlayKeyRef = useRef<string | null>(null);
	useEffect(() => {
		const idsKey = visibleOverlayContactsMatchingWhat.map((c) => c.id).join(',');
		if (idsKey === lastReportedVisibleOverlayKeyRef.current) return;
		lastReportedVisibleOverlayKeyRef.current = idsKey;
		onVisibleOverlayContactsChange?.(visibleOverlayContactsMatchingWhat);
	}, [onVisibleOverlayContactsChange, visibleOverlayContactsMatchingWhat]);

	const areaSelectionEnabled = useMemo(
		() => activeTool === 'select' && typeof onAreaSelect === 'function',
		[activeTool, onAreaSelect]
	);

	const setPolygonSourceBounds = useCallback(
		(sourceId: string, bounds: MapSelectionBounds | null) => {
			if (!map || !isMapLoaded) return;
			const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
			if (!source) return;
			const data = bounds ? boundsToPolygonFeatureCollection(bounds) : EMPTY_POLYGON_FC;
			source.setData(data as any);
		},
		[map, isMapLoaded]
	);

	const clearSelectionRect = useCallback(() => {
		selectionBoundsRef.current = null;
		setPolygonSourceBounds(MAPBOX_SOURCE_IDS.selectionRect, null);
		selectionStartLatLngRef.current = null;
		selectionStartClientRef.current = null;
		setIsAreaSelecting(false);
	}, [setPolygonSourceBounds]);

	// Persist and display the last selected area (black outline) so it's clear what the current
	// map-scoped search is using.
	useEffect(() => {
		// Hide the persisted rectangle while actively drawing a new one to avoid overlap/confusion.
		if (isAreaSelecting) {
			setPolygonSourceBounds(MAPBOX_SOURCE_IDS.selectedAreaRect, null);
			return;
		}

		if (!map || !isMapLoaded || !selectedAreaBounds) {
			setPolygonSourceBounds(MAPBOX_SOURCE_IDS.selectedAreaRect, null);
			return;
		}

		const { south, west, north, east } = selectedAreaBounds;
		if (
			![south, west, north, east].every(
				(n) => typeof n === 'number' && Number.isFinite(n)
			)
		) {
			return;
		}

		setPolygonSourceBounds(MAPBOX_SOURCE_IDS.selectedAreaRect, {
			south,
			west,
			north,
			east,
		});
	}, [map, isMapLoaded, selectedAreaBounds, isAreaSelecting, setPolygonSourceBounds]);

	// Cancel selection if the tool changes or the map unmounts.
	useEffect(() => {
		if (!areaSelectionEnabled && isAreaSelecting) {
			clearSelectionRect();
		}
	}, [areaSelectionEnabled, isAreaSelecting, clearSelectionRect]);

	useEffect(() => {
		return () => {
			// Defensive cleanup on unmount.
			selectionBoundsRef.current = null;
		};
	}, []);

	// ESC cancels an in-progress selection.
	useEffect(() => {
		if (!isAreaSelecting) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				clearSelectionRect();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [isAreaSelecting, clearSelectionRect]);

	// If the user releases the mouse outside the map, ensure we don't get "stuck" selecting.
	useEffect(() => {
		if (!isAreaSelecting) return;
		// Defer so the map's own mouseup handler can run first.
		const onWindowMouseUp = () => setTimeout(() => clearSelectionRect(), 0);
		window.addEventListener('mouseup', onWindowMouseUp);
		return () => window.removeEventListener('mouseup', onWindowMouseUp);
	}, [isAreaSelecting, clearSelectionRect]);

	const handleMapMouseDown = useCallback(
		(e: mapboxgl.MapMouseEvent) => {
			if (!areaSelectionEnabled) return;

			// Only left-click starts a selection.
			const domEv = e.originalEvent;
			if (domEv.button !== 0) return;

			const start = { lat: e.lngLat.lat, lng: e.lngLat.lng };
			selectionStartLatLngRef.current = start;
			selectionStartClientRef.current = getClientPointFromDomEvent(domEv);
			setIsAreaSelecting(true);

			const bounds: MapSelectionBounds = {
				south: start.lat,
				west: start.lng,
				north: start.lat,
				east: start.lng,
			};
			selectionBoundsRef.current = bounds;
			setPolygonSourceBounds(MAPBOX_SOURCE_IDS.selectionRect, bounds);
		},
		[areaSelectionEnabled, setPolygonSourceBounds]
	);

	const handleMapMouseMove = useCallback(
		(e: mapboxgl.MapMouseEvent) => {
			if (!isAreaSelecting) return;
			const start = selectionStartLatLngRef.current;
			if (!start) return;
			const current = { lat: e.lngLat.lat, lng: e.lngLat.lng };
			const bounds: MapSelectionBounds = {
				south: Math.min(start.lat, current.lat),
				west: Math.min(start.lng, current.lng),
				north: Math.max(start.lat, current.lat),
				east: Math.max(start.lng, current.lng),
			};
			selectionBoundsRef.current = bounds;
			setPolygonSourceBounds(MAPBOX_SOURCE_IDS.selectionRect, bounds);
		},
		[isAreaSelecting, setPolygonSourceBounds]
	);

	const updateBookingExtraFetchBbox = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance) return;

			// Only run for booking-mode searches, and only once the user is zoomed in.
			if (!isBookingSearch) {
				if (lastBookingExtraFetchKeyRef.current !== '') {
					lastBookingExtraFetchKeyRef.current = '';
					setBookingExtraFetchBbox(null);
				}
				return;
			}

			const zoomRaw = mapInstance.getZoom() ?? 4;
			if (zoomRaw < BOOKING_EXTRA_MARKERS_MIN_ZOOM) {
				if (lastBookingExtraFetchKeyRef.current !== '') {
					lastBookingExtraFetchKeyRef.current = '';
					setBookingExtraFetchBbox(null);
				}
				return;
			}

			const bounds = mapInstance.getBounds();
			if (!bounds) return;
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat;
			const west = sw.lng;
			const north = ne.lat;
			const east = ne.lng;

			// Skip antimeridian-crossing viewports (not relevant for our UI).
			if (east < west) return;

			// Pad the fetch bounds so panning within the current view doesn't immediately require refetching.
			const latSpan = north - south;
			const lngSpan = east - west;
			const padLat = latSpan * 0.35;
			const padLng = lngSpan * 0.35;

			const paddedSouth = clamp(south - padLat, -90, 90);
			const paddedWest = clamp(west - padLng, -180, 180);
			const paddedNorth = clamp(north + padLat, -90, 90);
			const paddedEast = clamp(east + padLng, -180, 180);

			// Quantize the fetch window so we don't refetch on tiny pans/zooms.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);
			const qSouth = Math.floor(paddedSouth / quant) * quant;
			const qWest = Math.floor(paddedWest / quant) * quant;
			const qNorth = Math.ceil(paddedNorth / quant) * quant;
			const qEast = Math.ceil(paddedEast / quant) * quant;

			const nextKey = `${zoomKey}|${qSouth.toFixed(4)}|${qWest.toFixed(4)}|${qNorth.toFixed(
				4
			)}|${qEast.toFixed(4)}`;

			if (nextKey === lastBookingExtraFetchKeyRef.current) return;
			lastBookingExtraFetchKeyRef.current = nextKey;
			setBookingExtraFetchBbox({
				minLat: qSouth,
				minLng: qWest,
				maxLat: qNorth,
				maxLng: qEast,
			});
		},
		[isBookingSearch]
	);

	const updatePromotionOverlayFetchBbox = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance) return;

			// Only run for promotion-mode searches.
			if (!isPromotionSearch) {
				if (lastPromotionOverlayFetchKeyRef.current !== '') {
					lastPromotionOverlayFetchKeyRef.current = '';
					setPromotionOverlayFetchBbox(null);
				}
				return;
			}

			const zoomRaw = mapInstance.getZoom() ?? 4;
			if (zoomRaw < PROMOTION_OVERLAY_MARKERS_MIN_ZOOM) {
				if (lastPromotionOverlayFetchKeyRef.current !== '') {
					lastPromotionOverlayFetchKeyRef.current = '';
					setPromotionOverlayFetchBbox(null);
				}
				return;
			}

			const bounds = mapInstance.getBounds();
			if (!bounds) return;
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat;
			const west = sw.lng;
			const north = ne.lat;
			const east = ne.lng;

			// Skip antimeridian-crossing viewports (not relevant for our UI).
			if (east < west) return;

			// Light padding to avoid refetching on small pans.
			const latSpan = north - south;
			const lngSpan = east - west;
			const padLat = latSpan * 0.1;
			const padLng = lngSpan * 0.1;

			const paddedSouth = clamp(south - padLat, -90, 90);
			const paddedWest = clamp(west - padLng, -180, 180);
			const paddedNorth = clamp(north + padLat, -90, 90);
			const paddedEast = clamp(east + padLng, -180, 180);

			// Quantize the fetch window so we don't refetch on tiny pans/zooms.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);
			const qSouth = Math.floor(paddedSouth / quant) * quant;
			const qWest = Math.floor(paddedWest / quant) * quant;
			const qNorth = Math.ceil(paddedNorth / quant) * quant;
			const qEast = Math.ceil(paddedEast / quant) * quant;

			const nextKey = `${zoomKey}|${qSouth.toFixed(4)}|${qWest.toFixed(4)}|${qNorth.toFixed(
				4
			)}|${qEast.toFixed(4)}`;
			if (nextKey === lastPromotionOverlayFetchKeyRef.current) return;
			lastPromotionOverlayFetchKeyRef.current = nextKey;
			setPromotionOverlayFetchBbox({
				minLat: qSouth,
				minLng: qWest,
				maxLat: qNorth,
				maxLng: qEast,
			});
		},
		[isPromotionSearch]
	);

	const updateAllContactsOverlayFetchBbox = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance) return;

			// Only run when an explicit search is active (avoid loading the entire dataset in non-search views).
			if (!isAnySearch) {
				if (lastAllContactsOverlayFetchKeyRef.current !== '') {
					lastAllContactsOverlayFetchKeyRef.current = '';
					setAllContactsOverlayFetchBbox(null);
				}
				return;
			}

			const zoomRaw = mapInstance.getZoom() ?? 4;
			// Only fetch/render the gray-dot overlay when zoomed in very close.
			if (zoomRaw < ALL_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM) {
				if (lastAllContactsOverlayFetchKeyRef.current !== '') {
					lastAllContactsOverlayFetchKeyRef.current = '';
					setAllContactsOverlayFetchBbox(null);
				}
				return;
			}

			const bounds = mapInstance.getBounds();
			if (!bounds) return;
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat;
			const west = sw.lng;
			const north = ne.lat;
			const east = ne.lng;

			// Skip antimeridian-crossing viewports (not relevant for our UI).
			if (east < west) return;

			// Light padding to avoid refetching on small pans.
			const latSpan = north - south;
			const lngSpan = east - west;
			const padLat = latSpan * 0.2;
			const padLng = lngSpan * 0.2;

			const paddedSouth = clamp(south - padLat, -90, 90);
			const paddedWest = clamp(west - padLng, -180, 180);
			const paddedNorth = clamp(north + padLat, -90, 90);
			const paddedEast = clamp(east + padLng, -180, 180);

			// Quantize the fetch window so we don't refetch on tiny pans/zooms.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);
			const qSouth = Math.floor(paddedSouth / quant) * quant;
			const qWest = Math.floor(paddedWest / quant) * quant;
			const qNorth = Math.ceil(paddedNorth / quant) * quant;
			const qEast = Math.ceil(paddedEast / quant) * quant;

			const nextKey = `${zoomKey}|${qSouth.toFixed(4)}|${qWest.toFixed(4)}|${qNorth.toFixed(
				4
			)}|${qEast.toFixed(4)}`;
			if (nextKey === lastAllContactsOverlayFetchKeyRef.current) return;

			lastAllContactsOverlayFetchKeyRef.current = nextKey;
			setAllContactsOverlayFetchBbox({
				minLat: qSouth,
				minLng: qWest,
				maxLat: qNorth,
				maxLng: qEast,
			});
		},
		[isAnySearch]
	);

	const allContactsOverlayFilters = useMemo(() => {
		if (!allContactsOverlayFetchBbox) return undefined;
		return {
			mode: 'all' as const,
			south: allContactsOverlayFetchBbox.minLat,
			west: allContactsOverlayFetchBbox.minLng,
			north: allContactsOverlayFetchBbox.maxLat,
			east: allContactsOverlayFetchBbox.maxLng,
			limit: ALL_CONTACTS_OVERLAY_LIMIT,
		};
	}, [allContactsOverlayFetchBbox]);

	const { data: allContactsOverlayRawContacts } = useGetContactsMapOverlay({
		filters: allContactsOverlayFilters,
		enabled: Boolean(allContactsOverlayFilters),
	});

	const bookingExtraOverlayFilters = useMemo(() => {
		if (!bookingExtraFetchBbox) return undefined;
		return {
			mode: 'booking' as const,
			south: bookingExtraFetchBbox.minLat,
			west: bookingExtraFetchBbox.minLng,
			north: bookingExtraFetchBbox.maxLat,
			east: bookingExtraFetchBbox.maxLng,
			limit: 1200,
		};
	}, [bookingExtraFetchBbox]);

	const { data: bookingExtraRawContacts } = useGetContactsMapOverlay({
		filters: bookingExtraOverlayFilters,
		enabled: Boolean(bookingExtraOverlayFilters),
	});

	const promotionOverlayFilters = useMemo(() => {
		if (!promotionOverlayFetchBbox) return undefined;
		return {
			mode: 'promotion' as const,
			south: promotionOverlayFetchBbox.minLat,
			west: promotionOverlayFetchBbox.minLng,
			north: promotionOverlayFetchBbox.maxLat,
			east: promotionOverlayFetchBbox.maxLng,
			limit: 1200,
		};
	}, [promotionOverlayFetchBbox]);

	const { data: promotionOverlayRawContacts } = useGetContactsMapOverlay({
		filters: promotionOverlayFilters,
		enabled: Boolean(promotionOverlayFilters),
	});

	const bookingExtraContacts = useMemo(() => {
		if (!bookingExtraRawContacts || bookingExtraRawContacts.length === 0) return [];
		return bookingExtraRawContacts.filter((c) => {
			// Never duplicate primary result markers.
			if (baseContactIdSet.has(c.id)) return false;
			const prefix = getBookingTitlePrefixFromContactTitle(c.title);
			if (!prefix) return false;
			return true;
		});
	}, [bookingExtraRawContacts, baseContactIdSet]);

	const promotionOverlayContacts = useMemo(() => {
		if (!promotionOverlayRawContacts || promotionOverlayRawContacts.length === 0)
			return [];
		return promotionOverlayRawContacts.filter((c) => {
			// Client-side safety: only keep state-wide list titles.
			return isPromotionOverlayListTitle(c.title);
		});
	}, [promotionOverlayRawContacts]);

	const {
		contactsWithCoords: bookingExtraContactsWithCoords,
		coordsByContactId: bookingExtraCoordsByContactId,
	} = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		for (const contact of bookingExtraContacts) {
			const coords = getLatLngFromContact(contact);
			if (!coords) continue;
			coordsByContactId.set(contact.id, coords);
			contactsWithCoords.push(contact);
			const key = coordinateKey(coords);
			const existing = groups.get(key);
			if (existing) existing.push(contact.id);
			else groups.set(key, [contact.id]);
		}

		// Offset duplicates (keep the smallest id at the true coordinate for accuracy)
		for (const ids of groups.values()) {
			if (ids.length <= 1) continue;
			ids.sort((a, b) => a - b);
			for (let i = 1; i < ids.length; i++) {
				const id = ids[i];
				const base = coordsByContactId.get(id);
				if (!base) continue;
				coordsByContactId.set(id, jitterDuplicateCoords(base, i));
			}
		}

		return { contactsWithCoords, coordsByContactId };
	}, [bookingExtraContacts]);

	const {
		contactsWithCoords: promotionOverlayContactsWithCoords,
		coordsByContactId: promotionOverlayCoordsByContactId,
	} = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		for (const contact of promotionOverlayContacts) {
			const coords = getLatLngFromContact(contact);
			if (!coords) continue;
			coordsByContactId.set(contact.id, coords);
			contactsWithCoords.push(contact);
			const key = coordinateKey(coords);
			const existing = groups.get(key);
			if (existing) existing.push(contact.id);
			else groups.set(key, [contact.id]);
		}

		// Offset duplicates (keep the smallest id at the true coordinate for accuracy)
		for (const ids of groups.values()) {
			if (ids.length <= 1) continue;
			ids.sort((a, b) => a - b);
			for (let i = 1; i < ids.length; i++) {
				const id = ids[i];
				const base = coordsByContactId.get(id);
				if (!base) continue;
				coordsByContactId.set(id, jitterDuplicateCoords(base, i));
			}
		}

		return { contactsWithCoords, coordsByContactId };
	}, [promotionOverlayContacts]);

	const {
		contactsWithCoords: allContactsOverlayContactsWithCoords,
		coordsByContactId: allContactsOverlayCoordsByContactId,
	} = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		if (!allContactsOverlayRawContacts || allContactsOverlayRawContacts.length === 0) {
			return { contactsWithCoords, coordsByContactId };
		}

		for (const contact of allContactsOverlayRawContacts) {
			const coords = getLatLngFromContact(contact);
			if (!coords) continue;
			coordsByContactId.set(contact.id, coords);
			contactsWithCoords.push(contact);
			const key = coordinateKey(coords);
			const existing = groups.get(key);
			if (existing) existing.push(contact.id);
			else groups.set(key, [contact.id]);
		}

		// Offset duplicates (keep the smallest id at the true coordinate for accuracy)
		for (const ids of groups.values()) {
			if (ids.length <= 1) continue;
			ids.sort((a, b) => a - b);
			for (let i = 1; i < ids.length; i++) {
				const id = ids[i];
				const base = coordsByContactId.get(id);
				if (!base) continue;
				coordsByContactId.set(id, jitterDuplicateCoords(base, i));
			}
		}

		return { contactsWithCoords, coordsByContactId };
	}, [allContactsOverlayRawContacts]);

	const getBookingExtraContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			bookingExtraCoordsByContactId.get(contact.id) ?? null,
		[bookingExtraCoordsByContactId]
	);

	const getPromotionOverlayContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			promotionOverlayCoordsByContactId.get(contact.id) ?? null,
		[promotionOverlayCoordsByContactId]
	);

	const getAllContactsOverlayContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			allContactsOverlayCoordsByContactId.get(contact.id) ?? null,
		[allContactsOverlayCoordsByContactId]
	);

	useEffect(() => {
		selectedStateKeyRef.current = selectedStateKey;
	}, [selectedStateKey]);

	useEffect(() => {
		onStateSelectRef.current = onStateSelect ?? null;
	}, [onStateSelect]);

	// If a hovered marker is removed due to viewport sampling, clear hover state
	// to avoid the UI getting "stuck" on a now-nonexistent marker.
	useEffect(() => {
		if (hoveredMarkerId == null) return;
		const stillVisible =
			visibleContacts.some((c) => c.id === hoveredMarkerId) ||
			bookingExtraVisibleContacts.some((c) => c.id === hoveredMarkerId) ||
			promotionOverlayVisibleContacts.some((c) => c.id === hoveredMarkerId) ||
			allContactsOverlayVisibleContacts.some((c) => c.id === hoveredMarkerId);
		if (stillVisible) return;
		if (hoverClearTimeoutRef.current) {
			clearTimeout(hoverClearTimeoutRef.current);
			hoverClearTimeoutRef.current = null;
		}
		setHoveredMarkerId(null);
		hoveredMarkerIdRef.current = null;
		hoverSourceRef.current = null;
		onMarkerHover?.(null);
	}, [
		visibleContacts,
		bookingExtraVisibleContacts,
		promotionOverlayVisibleContacts,
		allContactsOverlayVisibleContacts,
		hoveredMarkerId,
		onMarkerHover,
	]);

	// Clear hover state when zooming out past the minimum threshold
	useEffect(() => {
		if (zoomLevel >= HOVER_INTERACTION_MIN_ZOOM) return;
		if (hoveredMarkerId == null) return;
		if (hoverClearTimeoutRef.current) {
			clearTimeout(hoverClearTimeoutRef.current);
			hoverClearTimeoutRef.current = null;
		}
		if (fadingTooltipTimeoutRef.current) {
			clearTimeout(fadingTooltipTimeoutRef.current);
			fadingTooltipTimeoutRef.current = null;
		}
		setHoveredMarkerId(null);
		setFadingTooltipId(null);
		hoveredMarkerIdRef.current = null;
		hoverSourceRef.current = null;
		onMarkerHover?.(null);
	}, [zoomLevel, hoveredMarkerId, onMarkerHover]);

	useEffect(() => {
		if (lockedStateName === undefined) return;
		const nextKey = normalizeStateKey(lockedStateName);
		setSelectedStateKey(nextKey);
	}, [lockedStateName]);

	// Clear timeout when panel is closed or component unmounts
	useEffect(() => {
		return () => {
			if (researchPanelTimeoutRef.current) {
				clearTimeout(researchPanelTimeoutRef.current);
			}
			if (hoverClearTimeoutRef.current) {
				clearTimeout(hoverClearTimeoutRef.current);
			}
		};
	}, []);

	const clearResultsOutline = useCallback(() => {
		resultsSelectionMultiPolygonRef.current = null;
		resultsSelectionBboxRef.current = null;
		resultsSelectionSignatureRef.current = '';
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.resultsOutline) as
			| mapboxgl.GeoJSONSource
			| undefined;
		source?.setData(EMPTY_POLYGON_FC as any);
	}, [map, isMapLoaded]);

	const updateCuratedBlobProtectedMarkerIds = useCallback((ids: Set<number>) => {
		const key = Array.from(ids).sort((a, b) => a - b).join(',');
		if (key === curatedBlobProtectedMarkerIdsKeyRef.current) return;
		curatedBlobProtectedMarkerIdsKeyRef.current = key;
		curatedBlobProtectedMarkerIdsRef.current = ids;
		setCuratedBlobProtectedMarkerIdsNonce((value) => value + 1);
	}, []);

	const clearCuratedBlobOutline = useCallback(() => {
		curatedBlobSignatureRef.current = '';
		updateCuratedBlobProtectedMarkerIds(new Set());
		curatedBlobOrbTargetsRef.current = [];
		curatedBlobLngLatMultiPolygonRef.current = null;
		curatedBlobLngLatShapeMultiPolygonsRef.current = [];
		naturalBlobMorphSourceRef.current = null;
		lastBlobMorphTAppliedRef.current = Number.NaN;
		applyCuratedOrbStateRef.current?.();
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.curatedBlob) as
			| mapboxgl.GeoJSONSource
			| undefined;
		source?.setData(EMPTY_POLYGON_FC as GeoJSON.FeatureCollection);
	}, [map, isMapLoaded, updateCuratedBlobProtectedMarkerIds]);

	const clearSearchedStateOutline = useCallback(() => {
		selectedStateMorphSourceRef.current = null;
		selectedStateDisplayMultiPolygonRef.current = null;
		selectedStateLastMorphTAppliedRef.current = Number.NaN;
		selectedStateOutlineSourceKeyRef.current = '';
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.lockedOutline) as
			| mapboxgl.GeoJSONSource
			| undefined;
		source?.setData(EMPTY_POLYGON_FC as any);
	}, [map, isMapLoaded]);

	// Load preprocessed US state shapes/metadata generated at build-time.
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		// If we've already loaded the shapes for this map instance, don't refetch.
		// Presentation toggles should only affect visibility/interaction, not data loading.
		if (usStatesGeoJsonRef.current?.features?.length) {
			setIsStateLayerReady(true);
			return;
		}

		let cancelled = false;
		const controller = new AbortController();

		const loadStates = async () => {
			setIsStateLayerReady(false);
			try {
				const fetchJson = async <T,>(url: string): Promise<T> => {
					const res = await fetch(url, { signal: controller.signal });
					if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
					return (await res.json()) as T;
				};

				const [
					processedGeoJson,
					statesMetaByKey,
					stateLabels,
					usOutlineGeometry,
					preparedPolygons,
				] = await Promise.all([
					fetchJson<GeoJsonFeatureCollection>(STATE_PROCESSED_GEOJSON_URL),
					fetchJson<
						Record<
							string,
							{
								key: string;
								name: string;
								bbox: BoundingBox | null;
							}
						>
					>(STATE_META_URL),
					fetchJson<GeoJSON.FeatureCollection>(STATE_LABELS_URL),
					fetchJson<Extract<GeoJsonGeometry, { type: 'MultiPolygon' }>>(
						STATE_OUTLINE_URL
					),
					fetchJson<PreparedClippingPolygon[]>(STATE_PREPARED_POLYGONS_URL),
				]);

				if (cancelled) return;

				const features = Array.isArray(processedGeoJson?.features)
					? processedGeoJson.features
					: [];
				const processed: GeoJsonFeatureCollection = {
					type: 'FeatureCollection',
					features,
				};

				const geometryByKey = new Map<string, GeoJsonGeometry>();
				const nameByKey = new Map<string, string>();
				for (const feature of features) {
					const props = feature.properties ?? {};
					const rawKey =
						typeof props.key === 'string' || typeof props.key === 'number'
							? props.key
							: feature.id;
					const key = normalizeStateKey(rawKey != null ? String(rawKey) : null);
					if (!key) continue;

					const rawName = props.name;
					const safeName =
						typeof rawName === 'string' && rawName.trim().length ? rawName.trim() : key;

					geometryByKey.set(key, feature.geometry);
					nameByKey.set(key, safeName);
				}

				const byKey = new Map<
					string,
					{
						key: string;
						name: string;
						geometry: GeoJsonGeometry;
						multiPolygon: ClippingMultiPolygon;
						bbox: BoundingBox | null;
					}
				>();

				for (const [rawMetaKey, metaEntry] of Object.entries(statesMetaByKey ?? {})) {
					const key = normalizeStateKey(metaEntry?.key ?? rawMetaKey);
					if (!key) continue;

					const geometry = geometryByKey.get(key);
					if (!geometry) continue;

					const multiPolygon = geoJsonGeometryToClippingMultiPolygon(geometry);
					if (!multiPolygon) continue;

					const name =
						typeof metaEntry?.name === 'string' && metaEntry.name.trim().length
							? metaEntry.name.trim()
							: (nameByKey.get(key) ?? key);

					const bbox = metaEntry?.bbox ?? bboxFromMultiPolygon(multiPolygon);
					byKey.set(key, { key, name, geometry, multiPolygon, bbox });
				}

				// Ensure by-key metadata remains usable even if a key is missing from meta payload.
				for (const [key, geometry] of geometryByKey.entries()) {
					if (byKey.has(key)) continue;
					const multiPolygon = geoJsonGeometryToClippingMultiPolygon(geometry);
					if (!multiPolygon) continue;
					byKey.set(key, {
						key,
						name: nameByKey.get(key) ?? key,
						geometry,
						multiPolygon,
						bbox: bboxFromMultiPolygon(multiPolygon),
					});
				}

				usStatesGeoJsonRef.current = processed;
				usStatesByKeyRef.current = byKey;
				const prepared = Array.isArray(preparedPolygons) ? preparedPolygons : [];
				usStatesPolygonsRef.current = prepared.length ? prepared : null;

				const source = map.getSource(MAPBOX_SOURCE_IDS.states) as
					| mapboxgl.GeoJSONSource
					| undefined;
				source?.setData(processed as any);

				const labels: GeoJSON.FeatureCollection =
					stateLabels?.type === 'FeatureCollection' && Array.isArray(stateLabels.features)
						? stateLabels
						: { type: 'FeatureCollection', features: [] };
				const labelSource = map.getSource(MAPBOX_SOURCE_IDS.stateLabels) as
					| mapboxgl.GeoJSONSource
					| undefined;
				labelSource?.setData(labels as any);

				const outline =
					usOutlineGeometry?.type === 'MultiPolygon' &&
					Array.isArray(usOutlineGeometry.coordinates)
						? usOutlineGeometry
						: null;
				usBasemapClipGeometryRef.current = outline;
				usBasemapClipMultiPolygonRef.current = outline
					? geoJsonGeometryToClippingMultiPolygon(outline)
					: null;

				// Apply/restore the clip based on current zoom (performance).
				syncUsOnlyBasemapCartography(map);

				setIsStateLayerReady(true);
			} catch (err) {
				if (cancelled) return;
				console.error('Failed to load preprocessed US states geometry', err);
				usStatesGeoJsonRef.current = null;
				usStatesByKeyRef.current = new Map();
				usStatesPolygonsRef.current = null;
				usBasemapClipGeometryRef.current = null;
				usBasemapClipMultiPolygonRef.current = null;
				setIsStateLayerReady(false);
			}
		};

		void loadStates();

		return () => {
			cancelled = true;
			controller.abort();
			setIsStateLayerReady(false);
			clearResultsOutline();
			clearSearchedStateOutline();
		};
	}, [
		map,
		isMapLoaded,
		clearResultsOutline,
		clearSearchedStateOutline,
		syncUsOnlyBasemapCartography,
	]);

	const applyStateOverlayOpacity = useCallback(
		(nextOverlayOpacity: number, nextModeT: number) => {
			if (!map || !isMapLoaded) return;
			let base = stateLineOpacityBaseRef.current;

			if (!base || base.dividers == null || base.borders == null) {
				try {
					const dividers = map.getPaintProperty(
						MAPBOX_LAYER_IDS.statesDividers,
						'line-opacity'
					) as any;
					const borders = map.getPaintProperty(
						MAPBOX_LAYER_IDS.statesBordersInteractive,
						'line-opacity'
					) as any;
					if (dividers != null && borders != null) {
						base = { dividers, borders };
						stateLineOpacityBaseRef.current = base;
					}
				} catch {
					// Ignore and fall back to numeric opacity below.
				}
			}

			const overlay = clamp(nextOverlayOpacity, 0, 1);
			const modeT = clamp(nextModeT, 0, 1);
			const night = computeMoodVisualNightT(
				nightTRef.current,
				weatherMoodConfigRef.current
			);
			const nightEase = night * night * (3 - 2 * night);
			const nightMul =
				1 - nightEase * (1 - clamp(NIGHT_STATE_LINE_OPACITY_MUL_MIN, 0, 1));
			const dividersMul = overlay * (1 - modeT) * nightMul;
			const bordersMul = overlay * modeT * nightMul;

			const setLineOpacity = (layerId: string, baseOpacity: any, mul: number) => {
				if (!map.getLayer(layerId)) return;
				try {
					if (mul <= 0.001) {
						map.setPaintProperty(layerId, 'line-opacity', 0);
						return;
					}

					if (baseOpacity == null) {
						map.setPaintProperty(layerId, 'line-opacity', mul);
						return;
					}
					if (mul >= 0.999) {
						map.setPaintProperty(layerId, 'line-opacity', baseOpacity);
						return;
					}
					map.setPaintProperty(
						layerId,
						'line-opacity',
						scaleMapboxOpacityExpr(baseOpacity, mul)
					);
				} catch {
					// Ignore.
				}
			};

			setLineOpacity(MAPBOX_LAYER_IDS.statesDividers, base?.dividers, dividersMul);
			setLineOpacity(
				MAPBOX_LAYER_IDS.statesBordersInteractive,
				base?.borders,
				bordersMul
			);

			// Labels fade with the overall overlay opacity (mode doesn't matter), and
			// additionally fade out near MAP_MIN_ZOOM so they're invisible when fully zoomed out.
			if (map.getLayer(MAPBOX_LAYER_IDS.statesLabels)) {
				try {
					if (overlay <= 0.001) {
						map.setPaintProperty(MAPBOX_LAYER_IDS.statesLabels, 'text-opacity', 0);
					} else {
						map.setPaintProperty(MAPBOX_LAYER_IDS.statesLabels, 'text-opacity', [
							'interpolate',
							['linear'],
							['zoom'],
							MAP_MIN_ZOOM,
							0,
							MAP_MIN_ZOOM + 1.25,
							overlay,
						]);
					}
				} catch {
					// Ignore.
				}
			}
		},
		[map, isMapLoaded]
	);

	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const wasBackgroundPresentation = prevIsBackgroundPresentationRef.current;
		prevIsBackgroundPresentationRef.current = isBackgroundPresentation;
		const isEnteringInteractiveFromDashboard =
			wasBackgroundPresentation && !isBackgroundPresentation;

		// Overall: state overlays are hidden in decorative background mode, and until GeoJSON is loaded.
		const targetOverlayOpacity = !isBackgroundPresentation && isStateLayerReady ? 1 : 0;
		// Mode: divider lines when state interactions are disabled; interactive borders when enabled.
		const targetModeT = stateInteractionsEnabled ? 1 : 0;

		const fromOverlay = stateOverlayOpacityRef.current;
		const fromModeT = stateOverlayModeRef.current;

		const needsOverlay = Math.abs(targetOverlayOpacity - fromOverlay) > 0.001;
		const needsMode = Math.abs(targetModeT - fromModeT) > 0.001;

		// Cancel any in-flight animation.
		if (stateOverlayAnimRafRef.current != null) {
			cancelAnimationFrame(stateOverlayAnimRafRef.current);
			stateOverlayAnimRafRef.current = null;
		}

		// Always apply once so we stay in sync even if the map style reloads.
		if (!needsOverlay && !needsMode) {
			stateOverlayOpacityRef.current = targetOverlayOpacity;
			stateOverlayModeRef.current = targetModeT;
			applyStateOverlayOpacity(targetOverlayOpacity, targetModeT);
			return;
		}

		const durationMs =
			needsOverlay && isEnteringInteractiveFromDashboard
				? DASHBOARD_TO_INTERACTIVE_TRANSITION_MS
				: needsOverlay
					? 600
					: 350;
		const start = performance.now();
		const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

		const tick = (now: number) => {
			const t = clamp((now - start) / durationMs, 0, 1);
			const e = easeOutCubic(t);
			const overlay = fromOverlay + (targetOverlayOpacity - fromOverlay) * e;
			const modeT = fromModeT + (targetModeT - fromModeT) * e;

			stateOverlayOpacityRef.current = overlay;
			stateOverlayModeRef.current = modeT;
			applyStateOverlayOpacity(overlay, modeT);

			if (t < 1) {
				stateOverlayAnimRafRef.current = requestAnimationFrame(tick);
			} else {
				stateOverlayAnimRafRef.current = null;
			}
		};

		stateOverlayAnimRafRef.current = requestAnimationFrame(tick);
		return () => {
			if (stateOverlayAnimRafRef.current != null) {
				cancelAnimationFrame(stateOverlayAnimRafRef.current);
				stateOverlayAnimRafRef.current = null;
			}
		};
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		isStateLayerReady,
		stateInteractionsEnabled,
		applyStateOverlayOpacity,
	]);

	// Keep state boundary visibility in sync with night darkening.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		applyStateOverlayOpacity(stateOverlayOpacityRef.current, stateOverlayModeRef.current);
	}, [nightT, map, isMapLoaded, applyStateOverlayOpacity]);

	// Subtle cloud drift so the overlay feels "alive" (especially in background globe mode).
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		let prefersReducedMotion = false;
		try {
			prefersReducedMotion =
				typeof window !== 'undefined' &&
				typeof window.matchMedia === 'function' &&
				window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		} catch {
			prefersReducedMotion = false;
		}

		// Respect Reduce Motion by slowing the drift instead of fully disabling it.
		const motionScale = prefersReducedMotion ? 0.5 : 1;

		const cloudsCanvas = cloudsCanvasRef.current;
		const cloudsCtx = cloudsCanvasCtxRef.current;
		if (!cloudsCanvas || !cloudsCtx) return;

		// If we fell back to raster tiles (no canvas source), there is nothing to animate.
		const cloudsSource: any = (() => {
			try {
				return map.getSource(MAPBOX_SOURCE_IDS.clouds);
			} catch {
				return null;
			}
		})();
		const isCanvasSource = Boolean(
			cloudsSource && typeof cloudsSource.getCanvas === 'function'
		);
		if (!isCanvasSource) return;

		// Ensure Mapbox is actively sampling the canvas each frame.
		try {
			cloudsSource.play?.();
		} catch {
			// Ignore.
		}

		// Mirror the same play() guarantee for the dedicated lightning canvas source.
		try {
			const lightningSource: { play?: () => void } | null = (() => {
				try {
					return map.getSource(MAPBOX_SOURCE_IDS.lightning) as
						| { play?: () => void }
						| null;
				} catch {
					return null;
				}
			})();
			lightningSource?.play?.();
		} catch {
			// Ignore.
		}

		try {
			const snowSource: { play?: () => void } | null = (() => {
				try {
					return map.getSource(MAPBOX_SOURCE_IDS.snow) as
						| { play?: () => void }
						| null;
				} catch {
					return null;
				}
			})();
			snowSource?.play?.();
		} catch {
			// Ignore.
		}

		const loadTexture = (): Promise<HTMLImageElement> => {
			if (cloudsTextureImageRef.current)
				return Promise.resolve(cloudsTextureImageRef.current);
			if (cloudsTextureLoadPromiseRef.current) return cloudsTextureLoadPromiseRef.current;

			cloudsTextureLoadPromiseRef.current = new Promise((resolve, reject) => {
				try {
					const img = new Image();
					img.crossOrigin = 'anonymous';
					img.decoding = 'async';
					img.onload = () => {
						const finalize = () => {
							cloudsTextureImageRef.current = img;
							resolve(img);
						};
						try {
							if (typeof img.decode === 'function') {
								img.decode().then(finalize).catch(finalize);
							} else {
								finalize();
							}
						} catch {
							finalize();
						}
					};
					img.onerror = () => reject(new Error('Failed to load clouds texture'));
					img.src = CLOUDS_CANVAS_TEXTURE_URL;
				} catch (e) {
					reject(e);
				}
			});

			return cloudsTextureLoadPromiseRef.current;
		};

		const loadImage = (src: string): Promise<HTMLImageElement> =>
			new Promise((resolve, reject) => {
				try {
					const img = new Image();
					img.crossOrigin = 'anonymous';
					img.decoding = 'async';
					img.onload = () => {
						const finalize = () => resolve(img);
						try {
							if (typeof img.decode === 'function') {
								img.decode().then(finalize).catch(finalize);
							} else {
								finalize();
							}
						} catch {
							finalize();
						}
					};
					img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
					img.src = src;
				} catch (e) {
					reject(e);
				}
			});

		const loadLightningStamps = (): Promise<HTMLImageElement[]> => {
			if (lightningStampImagesRef.current) {
				return Promise.resolve(lightningStampImagesRef.current);
			}
			if (lightningStampLoadPromiseRef.current)
				return lightningStampLoadPromiseRef.current;

			lightningStampLoadPromiseRef.current = Promise.all(
				Array.from({ length: LIGHTNING_STAMPS_COUNT }, (_, i) =>
					loadImage(LIGHTNING_STAMPS_URL(i))
				)
			).then((imgs) => {
				lightningStampImagesRef.current = imgs;
				return imgs;
			});

			return lightningStampLoadPromiseRef.current;
		};

		const loadSnowStamps = (): Promise<HTMLImageElement[]> => {
			if (snowStampImagesRef.current) {
				return Promise.resolve(snowStampImagesRef.current);
			}
			if (snowStampLoadPromiseRef.current) return snowStampLoadPromiseRef.current;

			snowStampLoadPromiseRef.current = Promise.all(
				Array.from({ length: SNOWFLAKE_STAMPS_COUNT }, (_, i) =>
					loadImage(SNOWFLAKE_STAMPS_URL(i))
				)
			).then((imgs) => {
				snowStampImagesRef.current = imgs;
				return imgs;
			});

			return snowStampLoadPromiseRef.current;
		};

		const loadLightningPotential = (): Promise<Uint8Array> => {
			if (lightningPotentialU8Ref.current) {
				return Promise.resolve(lightningPotentialU8Ref.current);
			}
			if (lightningPotentialLoadPromiseRef.current)
				return lightningPotentialLoadPromiseRef.current;

			lightningPotentialLoadPromiseRef.current = loadImage(
				LIGHTNING_POTENTIAL_TEXTURE_URL
			)
				.then((img) => {
					if (typeof document === 'undefined') throw new Error('no document');

					let scratchCanvas = cloudsTextureScratchCanvasRef.current;
					if (!scratchCanvas) {
						scratchCanvas = document.createElement('canvas');
						scratchCanvas.width = CLOUDS_CANVAS_SIZE_PX;
						scratchCanvas.height = CLOUDS_CANVAS_SIZE_PX;
						cloudsTextureScratchCanvasRef.current = scratchCanvas;
					}

					const w = scratchCanvas.width || CLOUDS_CANVAS_SIZE_PX;
					const h = scratchCanvas.height || CLOUDS_CANVAS_SIZE_PX;
					const ctx = scratchCanvas.getContext('2d');
					if (!ctx) throw new Error('no 2d ctx');

					try {
						ctx.imageSmoothingEnabled = false;
					} catch {
						// Ignore.
					}

					ctx.clearRect(0, 0, w, h);
					ctx.drawImage(img, 0, 0, w, h);

					let imageData: ImageData | null = null;
					try {
						imageData = ctx.getImageData(0, 0, w, h);
					} catch {
						imageData = null;
					}
					if (!imageData) throw new Error('no image data');

					const src = imageData.data;
					const out = new Uint8Array(w * h);
					for (let p = 0, j = 3; p < out.length; p++, j += 4) out[p] = src[j];
					lightningPotentialU8Ref.current = out;
					return out;
				})
				.catch(() => {
					// Non-fatal; fall back to a uniform field (flashes can occur anywhere).
					const fallback = new Uint8Array(CLOUDS_CANVAS_SIZE_PX * CLOUDS_CANVAS_SIZE_PX);
					fallback.fill(255);
					lightningPotentialU8Ref.current = fallback;
					return fallback;
				});

			return lightningPotentialLoadPromiseRef.current;
		};

		let canceled = false;
		cloudsDriftOffsetRef.current = { x: 0, y: 0 };
		cloudsDriftOffsetSecondaryRef.current = { x: 0, y: 0 };
		cloudsDriftSimTimeMsRef.current = 0;
		// Lightweight deterministic noise helpers (shader-style hash + smooth interpolation).
		// Used to add gentle randomness without introducing pulsing opacity.
		const fract = (x: number) => x - Math.floor(x);
		const smoothstep01 = (t: number) => t * t * (3 - 2 * t);
		const hash01 = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453123);
		const noise1D = (x: number) => {
			const i = Math.floor(x);
			const f = x - i;
			const a = hash01(i);
			const b = hash01(i + 1);
			const u = smoothstep01(f);
			return a + (b - a) * u;
		};

		const computePulseOpacity = (tMs: number, pulse: StormLightningPulse): number => {
			if (tMs < pulse.offsetMs) return 0;
			const local = tMs - pulse.offsetMs;
			if (local <= pulse.rampUpMs) {
				const t = pulse.rampUpMs > 0 ? local / pulse.rampUpMs : 1;
				return pulse.peakOpacity * clamp(t, 0, 1);
			}
			if (local <= pulse.rampUpMs + pulse.holdMs) return pulse.peakOpacity;
			const downT = local - pulse.rampUpMs - pulse.holdMs;
			if (downT >= pulse.rampDownMs) return 0;
			const t = pulse.rampDownMs > 0 ? 1 - downT / pulse.rampDownMs : 0;
			return pulse.peakOpacity * clamp(t, 0, 1);
		};

		const getCurrentLightningZoom = () => {
			try {
				return map.getZoom?.() ?? MAP_DEFAULT_ZOOM;
			} catch {
				return MAP_DEFAULT_ZOOM;
			}
		};

		const scheduleNextLightning = (
			nowMs: number,
			opts?: { fast?: boolean; zoom?: number }
		) => {
			const fast = Boolean(opts?.fast);
			const cfg = weatherMoodConfigRef.current;
			if (fast) {
				lightningBurstRemainingRef.current = 0;
				lightningRestrikeCellRef.current = null;
			}
			if (!fast && lightningBurstRemainingRef.current > 0) {
				lightningBurstRemainingRef.current -= 1;
				const wait =
					LIGHTNING_RESTRIKE_MIN_INTERVAL_MS +
					Math.random() *
						(LIGHTNING_RESTRIKE_MAX_INTERVAL_MS - LIGHTNING_RESTRIKE_MIN_INTERVAL_MS);
				lightningNextFlashAtMsRef.current = nowMs + wait;
				return;
			}
			lightningRestrikeCellRef.current = null;

			const baseMin = fast
				? LIGHTNING_FIRST_FLASH_MIN_INTERVAL_MS
				: LIGHTNING_MIN_INTERVAL_MS;
			const baseMax = fast
				? LIGHTNING_FIRST_FLASH_MAX_INTERVAL_MS
				: LIGHTNING_MAX_INTERVAL_MS;
			const boostT = getLightningZoomedOutBoostT(opts?.zoom ?? getCurrentLightningZoom());
			const min = baseMin + (LIGHTNING_ZOOMED_OUT_MIN_INTERVAL_MS - baseMin) * boostT;
			const max = baseMax + (LIGHTNING_ZOOMED_OUT_MAX_INTERVAL_MS - baseMax) * boostT;
			const wait = min + Math.random() * Math.max(0, max - min);
			const clusterChance = lerp(
				LIGHTNING_CLUSTER_CHANCE_MIN,
				LIGHTNING_CLUSTER_CHANCE_MAX,
				clamp(cfg.lightningBurstiness, 0, 1)
			);
			if (!fast && Math.random() < clusterChance) {
				lightningBurstRemainingRef.current =
					LIGHTNING_RESTRIKE_MIN_REMAINING_FLASHES +
					Math.floor(
						Math.random() *
							(LIGHTNING_RESTRIKE_MAX_REMAINING_FLASHES -
								LIGHTNING_RESTRIKE_MIN_REMAINING_FLASHES +
								1)
					);
			}
			lightningNextFlashAtMsRef.current = nowMs + wait;
		};

		const lightningPotentialAlphaAt = (x: number, y: number, w: number, h: number) => {
			const potential = lightningPotentialU8Ref.current;
			if (!potential) return 255;
			const xi = ((Math.floor(x) % w) + w) % w;
			const yi = clamp(Math.floor(y), 0, h - 1);
			return potential[yi * w + xi] ?? 0;
		};

		const lngLatToLightningCanvasPoint = (
			lng: number,
			lat: number,
			w: number,
			h: number
		): { x: number; y: number } | null => {
			if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
			const xNorm = ((((lng + 180) / 360) % 1) + 1) % 1;
			const latClamped = clamp(
				lat,
				-LIGHTNING_MERCATOR_MAX_LAT,
				LIGHTNING_MERCATOR_MAX_LAT
			);
			const latRad = (latClamped * Math.PI) / 180;
			const mercatorY = (1 - Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / Math.PI) / 2;
			if (!Number.isFinite(mercatorY)) return null;
			return { x: xNorm * w, y: clamp(mercatorY, 0, 1) * h };
		};

		const lightningCanvasPointToLngLat = (
			x: number,
			y: number,
			w: number,
			h: number
		): { lng: number; lat: number } | null => {
			if (!Number.isFinite(x) || !Number.isFinite(y) || w <= 0 || h <= 0) return null;
			const lng = (((((x / w) * 360 - 180 + 180) % 360) + 360) % 360) - 180;
			const mercatorY = clamp(y / h, 0, 1);
			const latRad = 2 * Math.atan(Math.exp((1 - 2 * mercatorY) * Math.PI)) - Math.PI / 2;
			const lat = (latRad * 180) / Math.PI;
			return Number.isFinite(lat) && Number.isFinite(lng) ? { lng, lat } : null;
		};

		const isLngLatInLightningUsBounds = (lng: number, lat: number) => {
			const [west, south, east, north] = LIGHTNING_US_BOUNDS;
			return lng >= west && lng <= east && lat >= south && lat <= north;
		};

		const isLngLatInLightningUsRegion = (lng: number, lat: number) => {
			if (!isLngLatInLightningUsBounds(lng, lat)) return false;
			const prepared = usStatesPolygonsRef.current;
			if (!prepared || prepared.length === 0) return true;

			const point: ClippingCoord = [lng, lat];
			for (const { polygon, bbox } of prepared) {
				if (bbox && !isLatLngInBbox(lat, lng, bbox)) continue;
				if (pointInClippingPolygon(point, polygon)) return true;
			}
			return false;
		};

		const randomLightningUsCanvasPoint = (
			w: number,
			h: number
		): { x: number; y: number; alpha: number } => {
			const [west, south, east, north] = LIGHTNING_US_BOUNDS;
			let best: { x: number; y: number; alpha: number } | null = null;
			for (let i = 0; i < LIGHTNING_US_POSITION_TRIES; i++) {
				const lng = lerp(west, east, Math.random());
				const lat = lerp(south, north, Math.random());
				if (!isLngLatInLightningUsRegion(lng, lat)) continue;
				const point = lngLatToLightningCanvasPoint(lng, lat, w, h);
				if (!point) continue;
				const alpha = lightningPotentialAlphaAt(
					point.x,
					point.y,
					CLOUDS_CANVAS_SIZE_PX,
					CLOUDS_CANVAS_SIZE_PX
				);
				if (!best || alpha > best.alpha) best = { ...point, alpha };
				const acceptance = 0.12 + Math.pow(alpha / 255, 1.35) * 0.88;
				if (alpha >= 8 && Math.random() < acceptance) {
					return { ...point, alpha };
				}
			}
			return best ?? { x: w * 0.5, y: h * 0.5, alpha: 128 };
		};

		const getLightningAnchorCanvasPoint = (
			w: number,
			h: number
		): { x: number; y: number } | null => {
			const weatherCenter = weatherRegionCenterRef.current;
			if (
				weatherCenter &&
				Number.isFinite(weatherCenter.lat) &&
				Number.isFinite(weatherCenter.lng) &&
				isLngLatInLightningUsBounds(weatherCenter.lng, weatherCenter.lat)
			) {
				const point = lngLatToLightningCanvasPoint(
					weatherCenter.lng,
					weatherCenter.lat,
					w,
					h
				);
				if (point) return point;
			}

			return lngLatToLightningCanvasPoint(defaultCenter.lng, defaultCenter.lat, w, h);
		};

		const buildLightningStormCells = (w: number, h: number): StormLightningCell[] => {
			const weatherCenter = weatherRegionCenterRef.current;
			const key = `${w}x${h}:${weatherCenter?.lat?.toFixed(2) ?? 'none'}:${
				weatherCenter?.lng?.toFixed(2) ?? 'none'
			}`;
			if (lightningStormCellsKeyRef.current === key && lightningStormCellsRef.current) {
				return lightningStormCellsRef.current;
			}

			const cells: StormLightningCell[] = [];
			const anchor = getLightningAnchorCanvasPoint(w, h);
			if (anchor) {
				cells.push({
					x: anchor.x,
					y: anchor.y,
					weight: 1.25,
					radiusPx: LIGHTNING_CELL_RADIUS_GLOBE_PX * 0.92,
				});
			}

			while (cells.length < LIGHTNING_STORM_CELL_COUNT) {
				const point = randomLightningUsCanvasPoint(w, h);
				cells.push({
					x: point.x,
					y: point.y,
					weight: 0.55 + (point.alpha / 255) * 1.35 + Math.random() * 0.35,
					radiusPx: lerp(LIGHTNING_CELL_RADIUS_GLOBE_PX * 0.7, LIGHTNING_CELL_RADIUS_GLOBE_PX * 1.4, Math.random()),
				});
			}

			lightningStormCellsKeyRef.current = key;
			lightningStormCellsRef.current = cells;
			return cells;
		};

		const pickLightningCell = (
			w: number,
			h: number
		): { cell: StormLightningCell; index: number } => {
			const restrikeCell = lightningRestrikeCellRef.current;
			if (lightningBurstRemainingRef.current > 0 && restrikeCell) {
				return { cell: restrikeCell, index: -1 };
			}

			const cfg = weatherMoodConfigRef.current;
			const cells = buildLightningStormCells(w, h);
			const weatherBiasChance =
				LIGHTNING_REGION_BIAS_CHANCE * (1 - clamp(cfg.lightningSpread, 0, 1) * 0.72);
			if (cells[0] && Math.random() < weatherBiasChance) {
				return { cell: cells[0], index: 0 };
			}

			const total = cells.reduce((sum, cell, index) => {
				const weatherPenalty = index === 0 ? 0.8 : 1;
				return sum + Math.max(0.01, cell.weight * weatherPenalty);
			}, 0);
			let r = Math.random() * Math.max(0.01, total);
			for (let i = 0; i < cells.length; i++) {
				const weight = cells[i].weight * (i === 0 ? 0.8 : 1);
				r -= weight;
				if (r <= 0) return { cell: cells[i], index: i };
			}
			return { cell: cells[cells.length - 1], index: cells.length - 1 };
		};

		const pickLocalizedLightningPosition = (
			w: number,
			h: number,
			zoom: number
		): {
			x: number;
			y: number;
			cell: StormLightningCell;
			cellIndex: number;
			potentialAlpha: number;
		} => {
			const { cell, index: cellIndex } = pickLightningCell(w, h);

			const zoomT = getLightningZoomedInT(zoom);
			const spread = clamp(weatherMoodConfigRef.current.lightningSpread, 0, 1);
			const radius =
				lerp(LIGHTNING_CELL_RADIUS_GLOBE_PX, LIGHTNING_CELL_RADIUS_CLOSE_PX, zoomT) *
				lerp(0.88, 1.34, spread) *
				lerp(0.75, 1.15, Math.random()) *
				lerp(0.85, 1.15, clamp(cell.radiusPx / LIGHTNING_CELL_RADIUS_GLOBE_PX, 0, 1.4));
			let best: { x: number; y: number; alpha: number } | null = null;

			for (let i = 0; i < LIGHTNING_US_POSITION_TRIES; i++) {
				const angle = Math.random() * Math.PI * 2;
				const distance = Math.sqrt(Math.random()) * Math.max(4, radius);
				const x = clamp(cell.x + Math.cos(angle) * distance, 0, w);
				const y = clamp(cell.y + Math.sin(angle) * distance, 0, h);
				const lngLat = lightningCanvasPointToLngLat(x, y, w, h);
				if (!lngLat || !isLngLatInLightningUsRegion(lngLat.lng, lngLat.lat)) continue;
				const alpha = lightningPotentialAlphaAt(
					(((x / w) * CLOUDS_CANVAS_SIZE_PX) % CLOUDS_CANVAS_SIZE_PX),
					((y / h) * CLOUDS_CANVAS_SIZE_PX),
					CLOUDS_CANVAS_SIZE_PX,
					CLOUDS_CANVAS_SIZE_PX
				);
				if (!best || alpha > best.alpha) best = { x, y, alpha };

				const acceptance = 0.1 + Math.pow(alpha / 255, 1.2) * 0.9;
				if (alpha >= 8 && Math.random() < acceptance) {
					return { x, y, cell, cellIndex, potentialAlpha: alpha };
				}
			}

			const fallback = best ?? cell;
			return {
				x: fallback.x,
				y: fallback.y,
				cell,
				cellIndex,
				potentialAlpha: 'alpha' in fallback ? fallback.alpha : 128,
			};
		};

		const pickLightningPosition = (
			w: number,
			h: number,
			zoom: number
		): {
			x: number;
			y: number;
			cell: StormLightningCell;
			cellIndex: number;
			potentialAlpha: number;
		} => {
			return pickLocalizedLightningPosition(w, h, zoom);
		};

		const spawnLightningEvent = (
			nowMs: number,
			w: number,
			h: number
		): StormLightningCell | null => {
			const stamps = lightningStampImagesRef.current;
			if (!Array.isArray(stamps) || stamps.length === 0) return null;

			const zoom = getCurrentLightningZoom();
			const boostT = getLightningZoomedOutBoostT(zoom);
			const maxActiveEvents = Math.round(
				LIGHTNING_MAX_ACTIVE_EVENTS +
					(LIGHTNING_ZOOMED_OUT_MAX_ACTIVE_EVENTS - LIGHTNING_MAX_ACTIVE_EVENTS) * boostT
			);
			const events = lightningEventsRef.current;
			if (events.length >= maxActiveEvents) return null;

			const { x, y, cell, cellIndex, potentialAlpha } = pickLightningPosition(w, h, zoom);
			const stampIndex = Math.floor(Math.random() * stamps.length);
			const zoomT = getLightningZoomedInT(zoom);
			const cloudOcclusion = clamp(potentialAlpha / 255, 0, 1);
			const baseScale =
				lerp(LIGHTNING_SCALE_GLOBE_MIN, LIGHTNING_SCALE_CLOSE_MIN, zoomT) +
				Math.random() *
					lerp(
						LIGHTNING_SCALE_GLOBE_MAX - LIGHTNING_SCALE_GLOBE_MIN,
						LIGHTNING_SCALE_CLOSE_MAX - LIGHTNING_SCALE_CLOSE_MIN,
						zoomT
					);
			const kindRoll = Math.random();
			const kind: StormLightningEventKind =
				kindRoll < LIGHTNING_DRAMATIC_STRIKE_CHANCE
					? 'dramatic'
					: kindRoll < LIGHTNING_DRAMATIC_STRIKE_CHANCE + LIGHTNING_SHEET_FLASH_CHANCE
						? 'sheet'
						: 'strike';
			const kindScale = kind === 'dramatic' ? 1.46 : kind === 'sheet' ? 1.28 : 1;
			const coreScale = baseScale * kindScale;
			const glowScale =
				coreScale * (kind === 'dramatic' ? 3.3 : kind === 'sheet' ? 4.6 : 2.75);
			const altitudePx =
				lerp(LIGHTNING_ALTITUDE_GLOBE_PX, LIGHTNING_ALTITUDE_CLOSE_PX, zoomT) *
				(kind === 'dramatic' ? 1.15 : kind === 'sheet' ? 1.35 : 0.85) *
				lerp(0.75, 1.25, Math.random());
			const rotationRad = (Math.random() - 0.5) * 0.55;
			const sheetRotationRad = (Math.random() - 0.5) * 0.9;
			const sheetScaleX =
				glowScale * (kind === 'sheet' ? lerp(1.85, 2.65, Math.random()) : 1.45);
			const sheetScaleY =
				glowScale * (kind === 'sheet' ? lerp(0.62, 0.95, Math.random()) : 0.86);
			const parallaxPhase = Math.random() * Math.PI * 2;

			const pulseCount = kind === 'dramatic' || Math.random() < 0.28 ? 3 : 2;
			const pulses: StormLightningPulse[] = [];
			for (let p = 0; p < pulseCount; p++) {
				const offsetMs = p === 0 ? 0 : 82 + p * (62 + Math.random() * 48);
				const basePeak =
					kind === 'dramatic' ? 0.78 : kind === 'sheet' ? 0.5 : 0.62;
				const peakOpacity = p === 0 ? basePeak : basePeak * (p === 1 ? 0.48 : 0.28);
				pulses.push({
					offsetMs,
					peakOpacity,
					rampUpMs: p === 0 ? 12 : 22,
					holdMs: p === 0 ? 18 : 8,
					rampDownMs: kind === 'sheet' ? 640 : kind === 'dramatic' ? 500 : 400,
					glowOpacityMultiplier:
						kind === 'sheet' ? 1.55 : kind === 'dramatic' ? 1.36 : 1.08,
				});
			}
			const endMs =
				nowMs +
				Math.max(
					0,
					...pulses.map((p) => p.offsetMs + p.rampUpMs + p.holdMs + p.rampDownMs)
				);

			events.push({
				id: lightningEventIdRef.current++,
				startMs: nowMs,
				endMs,
				kind,
				x,
				y,
				coreScale,
				glowScale,
				sheetScaleX,
				sheetScaleY,
				rotationRad,
				sheetRotationRad,
				stampIndex,
				cellIndex,
				jitterX: (Math.random() - 0.5) * 5,
				jitterY: (Math.random() - 0.5) * 5,
				altitudePx,
				parallaxPhase,
				cloudOcclusion,
				sheetDriftX: (Math.random() - 0.5) * altitudePx * 0.9,
				sheetDriftY: -altitudePx * lerp(0.6, 1.15, Math.random()),
				pulses,
			});
			if (lightningBurstRemainingRef.current > 0) {
				lightningRestrikeCellRef.current = cell;
			}
			return cell;
		};

		const drawLightning = (nowMs: number) => {
			const lightningCanvas = lightningCanvasRef.current;
			const lightningCtx = lightningCanvasCtxRef.current;
			if (!lightningCanvas || !lightningCtx) return;

			const w = lightningCanvas.width || LIGHTNING_CANVAS_WIDTH_PX;
			const h = lightningCanvas.height || LIGHTNING_CANVAS_HEIGHT_PX;
			try {
				lightningCtx.setTransform(1, 0, 0, 1, 0, 0);
			} catch {
				// Ignore.
			}
			lightningCtx.clearRect(0, 0, w, h);

			const currentZoom = getCurrentLightningZoom();
			const zoomOk = currentZoom < LIGHTNING_HIDE_AT_OR_ABOVE_ZOOM;
			const lightningIntensity = clamp(
				weatherMoodConfigRef.current.lightningIntensity,
				0,
				1
			);
			const canSpawnLightning =
				Boolean(weatherMoodConfigRef.current.lightning) && lightningIntensity > 0.001;

			const enabled =
				!prefersReducedMotion &&
				lightningIntensity > 0.001 &&
				zoomOk;

			if (!enabled) {
				lightningWasEnabledRef.current = false;
				if (lightningIntensity <= 0.001) {
					lightningEventsRef.current = [];
					lightningNextFlashAtMsRef.current = 0;
					lightningBurstRemainingRef.current = 0;
					lightningRestrikeCellRef.current = null;
				}
				return;
			}

			const justEnabled = !lightningWasEnabledRef.current;
			lightningWasEnabledRef.current = true;

			const stamps = lightningStampImagesRef.current;
			if (!Array.isArray(stamps) || stamps.length === 0) return;

			// Expire old events (tiny list; mutate in place).
			{
				const events = lightningEventsRef.current;
				for (let i = events.length - 1; i >= 0; i--) {
					if (events[i].endMs <= nowMs) events.splice(i, 1);
				}
			}

			if (!canSpawnLightning) {
				lightningNextFlashAtMsRef.current = 0;
				lightningBurstRemainingRef.current = 0;
			} else if (!lightningNextFlashAtMsRef.current) {
				scheduleNextLightning(nowMs, { fast: justEnabled, zoom: currentZoom });
			}
			if (canSpawnLightning && nowMs >= lightningNextFlashAtMsRef.current) {
				const spawnCount =
					Math.random() < 0.08 * getLightningZoomedOutBoostT(currentZoom) ? 2 : 1;
				let lastCell: StormLightningCell | null = null;
				for (let i = 0; i < spawnCount; i++) {
					const spawnedCell = spawnLightningEvent(
						nowMs + i * (55 + Math.random() * 70),
						w,
						h
					);
					if (spawnedCell) lastCell = spawnedCell;
				}
				scheduleNextLightning(nowMs, { zoom: currentZoom });
				if (lightningBurstRemainingRef.current > 0 && lastCell) {
					lightningRestrikeCellRef.current = lastCell;
				}
			}

			const events = lightningEventsRef.current;
			if (events.length === 0) return;

			const drawStamp = (
				stamp: HTMLImageElement,
				x: number,
				y: number,
				scale: number,
				rotation: number,
				alpha: number
			) => {
				const sw = stamp.naturalWidth || stamp.width || 256;
				const sh = stamp.naturalHeight || stamp.height || 256;
				const dw = sw * scale;
				const dh = sh * scale;

				lightningCtx.globalAlpha = alpha;
				lightningCtx.translate(x, y);
				lightningCtx.rotate(rotation);
				lightningCtx.drawImage(stamp, -dw * 0.5, -dh * 0.5, dw, dh);
				lightningCtx.setTransform(1, 0, 0, 1, 0, 0);
			};

			const drawEllipticalGlow = (
				ctx: CanvasRenderingContext2D,
				x: number,
				y: number,
				radiusX: number,
				radiusY: number,
				rotation: number,
				alpha: number,
				color: [number, number, number]
			) => {
				if (alpha <= 0.001 || radiusX <= 0 || radiusY <= 0) return;
				ctx.save();
				try {
					ctx.translate(x, y);
					ctx.rotate(rotation);
					ctx.scale(radiusX, radiusY);
					const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
					const r = Math.round(color[0]);
					const g = Math.round(color[1]);
					const b = Math.round(color[2]);
					gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
					gradient.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, ${alpha * 0.48})`);
					gradient.addColorStop(0.68, `rgba(${r}, ${g}, ${b}, ${alpha * 0.12})`);
					gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
					ctx.fillStyle = gradient;
					ctx.beginPath();
					ctx.arc(0, 0, 1, 0, Math.PI * 2);
					ctx.fill();
				} catch {
					// Ignore.
				} finally {
					ctx.restore();
				}
			};

			const drawCloudCatchlight = (
				x: number,
				y: number,
				radiusX: number,
				radiusY: number,
				rotation: number,
				alpha: number,
				color: [number, number, number]
			) => {
				if (alpha <= 0.001) return;
				const cw = cloudsCanvas.width || CLOUDS_CANVAS_SIZE_PX;
				const ch = cloudsCanvas.height || CLOUDS_CANVAS_SIZE_PX;
				const cx = (x / w) * cw;
				const cy = (y / h) * ch;
				const rx = (radiusX / w) * cw;
				const ry = (radiusY / h) * ch;
				const prevOp = cloudsCtx.globalCompositeOperation;
				const prevAlpha = cloudsCtx.globalAlpha;
				cloudsCtx.globalCompositeOperation = 'lighter';
				cloudsCtx.globalAlpha = 1;
				drawEllipticalGlow(cloudsCtx, cx, cy, rx, ry, rotation, alpha, color);
				cloudsCtx.globalCompositeOperation = prevOp;
				cloudsCtx.globalAlpha = prevAlpha;
			};

			lightningCtx.save();
			try {
				lightningCtx.setTransform(1, 0, 0, 1, 0, 0);
			} catch {
				// Ignore.
			}
			const prevOp = lightningCtx.globalCompositeOperation;
			const prevFilter = lightningCtx.filter;
			const prevShadowBlur = lightningCtx.shadowBlur;
			const prevShadowColor = lightningCtx.shadowColor;
			const tint = weatherMoodConfigRef.current.lightningTint;
			const tintColor = `rgba(${Math.round(tint[0])}, ${Math.round(
				tint[1]
			)}, ${Math.round(tint[2])}, 0.72)`;
			lightningCtx.globalCompositeOperation = 'lighter';

			for (const e of events) {
				const t = nowMs - e.startMs;
				let a = 0;
				let glowA = 0;
				for (const p of e.pulses) {
					const pulseA = computePulseOpacity(t, p);
					a += pulseA;
					glowA += pulseA * p.glowOpacityMultiplier;
				}
				if (a <= 0.001) continue;
				a = clamp(a * LIGHTNING_OPACITY_MULTIPLIER * lightningIntensity, 0, 0.95);
				const occlusion = clamp(e.cloudOcclusion, 0, 1);
				glowA = clamp(
					glowA * (0.34 + occlusion * 0.38) * lightningIntensity,
					0,
					0.86
				);

				const stamp = stamps[e.stampIndex % stamps.length];
				const sw = stamp.naturalWidth || stamp.width || 256;
				const pulseDriftT = clamp(t / Math.max(1, e.endMs - e.startMs), 0, 1);
				const altitudeX =
					Math.cos(e.parallaxPhase) * e.altitudePx * 0.32 + e.altitudePx * 0.24;
				const altitudeY = -e.altitudePx * (0.72 + Math.sin(e.parallaxPhase) * 0.18);
				const sheetX = e.x + altitudeX + e.sheetDriftX * pulseDriftT;
				const sheetY = e.y + altitudeY + e.sheetDriftY * pulseDriftT;
				const coreX = e.x + altitudeX * 0.42 + e.jitterX * pulseDriftT;
				const coreY = e.y + altitudeY * 0.34 + e.jitterY * pulseDriftT;
				const sheetRadiusX = sw * e.sheetScaleX;
				const sheetRadiusY = sw * e.sheetScaleY;
				const sheetAlpha =
					glowA * (e.kind === 'sheet' ? 1.12 : e.kind === 'dramatic' ? 0.9 : 0.72);
				const boltAlpha =
					e.kind === 'sheet'
						? a * 0.06 * (1 - occlusion * 0.45)
						: a * lerp(0.86, 0.42, occlusion);

				drawCloudCatchlight(
					sheetX,
					sheetY,
					sheetRadiusX * 0.58,
					sheetRadiusY * 0.7,
					e.sheetRotationRad,
					sheetAlpha * LIGHTNING_CATCHLIGHT_OPACITY,
					tint
				);

				drawEllipticalGlow(
					lightningCtx,
					sheetX,
					sheetY,
					sheetRadiusX,
					sheetRadiusY,
					e.sheetRotationRad,
					sheetAlpha * 0.72,
					tint
				);
				drawEllipticalGlow(
					lightningCtx,
					sheetX + altitudeX * 0.35,
					sheetY + altitudeY * 0.25,
					sheetRadiusX * 0.46,
					sheetRadiusY * 0.55,
					e.sheetRotationRad + 0.2,
					sheetAlpha * 0.45,
					[255, 252, 242]
				);

				try {
					lightningCtx.filter = 'blur(2.4px)';
				} catch {
					// Ignore.
				}
				lightningCtx.shadowBlur = e.kind === 'dramatic' ? 18 : 10;
				lightningCtx.shadowColor = tintColor;
				if (e.kind !== 'sheet') {
					drawStamp(stamp, coreX, coreY, e.glowScale, e.rotationRad, glowA * 0.42);
				}
				try {
					lightningCtx.filter = 'blur(0.7px)';
				} catch {
					// Ignore.
				}
				lightningCtx.shadowBlur = e.kind === 'dramatic' ? 10 : 5;
				if (e.kind !== 'sheet') {
					drawStamp(
						stamp,
						coreX,
						coreY,
						e.glowScale * 0.54,
						e.rotationRad,
						glowA * 0.5
					);
				}
				try {
					lightningCtx.filter = 'none';
				} catch {
					// Ignore.
				}
				lightningCtx.shadowBlur = e.kind === 'dramatic' ? 4 : 1.5;
				drawStamp(stamp, coreX, coreY, e.coreScale, e.rotationRad, boltAlpha);
			}

			lightningCtx.globalCompositeOperation = prevOp;
			try {
				lightningCtx.filter = prevFilter;
			} catch {
				// Ignore.
			}
			lightningCtx.shadowBlur = prevShadowBlur;
			lightningCtx.shadowColor = prevShadowColor;
			lightningCtx.restore();
		};

		const buildSnowParticles = (): SnowParticle[] => {
			if (snowParticlesRef.current) return snowParticlesRef.current;

			const particles = Array.from({ length: SNOW_MAX_PARTICLES }, (_, i) => {
				const seed = 9000.5 + i * 131.7;
				const depth = Math.pow(hash01(seed + 3.1), 0.72);
				return {
					x: hash01(seed + 11.3) * SNOW_CANVAS_SIZE_PX,
					y: hash01(seed + 23.7) * SNOW_CANVAS_SIZE_PX,
					depth,
					size: lerp(0.56, 1.42, depth) * lerp(0.78, 1.14, hash01(seed + 37.9)),
					opacity: lerp(0.22, 0.58, depth) * lerp(0.66, 1.0, hash01(seed + 49.2)),
					fallSpeed: lerp(0.52, 1.45, depth) * lerp(0.8, 1.16, hash01(seed + 61.5)),
					windSpeed:
						lerp(0.18, 0.95, hash01(seed + 73.4)) *
						(hash01(seed + 83.9) < 0.44 ? -1 : 1),
					windSway: lerp(0.45, 1.4, hash01(seed + 89.6)) * lerp(0.72, 1.28, depth),
					windPhase: hash01(seed + 92.8) * Math.PI * 2,
					gustResponsiveness:
						lerp(0.34, 1.18, hash01(seed + 94.2)) * lerp(0.78, 1.24, depth),
					wobble: lerp(0.7, 4.2, depth) * lerp(0.7, 1.2, hash01(seed + 97.6)),
					wobblePhase: hash01(seed + 109.8) * Math.PI * 2,
					stampIndex: Math.floor(hash01(seed + 121.1) * SNOWFLAKE_STAMPS_COUNT),
					turbulenceSeed: hash01(seed + 133.6) * 900,
					gustSeed: hash01(seed + 147.4) * 900,
					densitySeed: hash01(seed + 159.8),
					scaleJitter: lerp(0.86, 1.16, hash01(seed + 171.2)),
					stretch: lerp(0.92, 1.08, hash01(seed + 183.5)),
					rotation: hash01(seed + 197.1) * Math.PI * 2,
					rotationSpeed: lerp(-0.018, 0.018, hash01(seed + 211.6)),
				};
			});

			snowParticlesRef.current = particles;
			return particles;
		};

		const ensureCloudsSnowInteractionAssets = (cw: number, ch: number) => {
			if (typeof document === 'undefined') return null;

			let scratchCanvas = cloudsSnowInteractionScratchCanvasRef.current;
			if (!scratchCanvas) {
				scratchCanvas = document.createElement('canvas');
				cloudsSnowInteractionScratchCanvasRef.current = scratchCanvas;
				cloudsSnowInteractionScratchCtxRef.current = scratchCanvas.getContext('2d');
			}
			if (!scratchCanvas) return null;
			if (scratchCanvas.width !== cw) scratchCanvas.width = cw;
			if (scratchCanvas.height !== ch) scratchCanvas.height = ch;

			let scratchCtx = cloudsSnowInteractionScratchCtxRef.current;
			if (!scratchCtx) {
				scratchCtx = scratchCanvas.getContext('2d');
				cloudsSnowInteractionScratchCtxRef.current = scratchCtx;
			}
			if (!scratchCtx) return null;

			try {
				scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
				scratchCtx.imageSmoothingEnabled = true;
				scratchCtx.imageSmoothingQuality = 'high';
			} catch {
				// Ignore.
			}

			const createRadialStamp = (rgb: [number, number, number]) => {
				const canvas = document.createElement('canvas');
				canvas.width = CLOUDS_SNOW_INTERACTION_STAMP_SIZE_PX;
				canvas.height = CLOUDS_SNOW_INTERACTION_STAMP_SIZE_PX;
				const ctx = canvas.getContext('2d');
				if (!ctx) return null;
				const s = CLOUDS_SNOW_INTERACTION_STAMP_SIZE_PX;
				const [r, g, b] = rgb;
				const gradient = ctx.createRadialGradient(s * 0.5, s * 0.5, 0, s * 0.5, s * 0.5, s * 0.5);
				gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
				gradient.addColorStop(0.24, `rgba(${r}, ${g}, ${b}, 0.58)`);
				gradient.addColorStop(0.62, `rgba(${r}, ${g}, ${b}, 0.16)`);
				gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
				ctx.clearRect(0, 0, s, s);
				ctx.fillStyle = gradient;
				ctx.fillRect(0, 0, s, s);
				return canvas;
			};

			if (!cloudsSnowInteractionThinStampRef.current) {
				cloudsSnowInteractionThinStampRef.current = createRadialStamp([0, 0, 0]);
			}
			if (!cloudsSnowInteractionGlowStampRef.current) {
				cloudsSnowInteractionGlowStampRef.current = createRadialStamp([250, 252, 255]);
			}

			const thinStamp = cloudsSnowInteractionThinStampRef.current;
			const glowStamp = cloudsSnowInteractionGlowStampRef.current;
			if (!thinStamp || !glowStamp) return null;
			return { scratchCanvas, scratchCtx, thinStamp, glowStamp };
		};

		const applySnowCloudInteraction = (
			impacts: SnowCloudInteractionImpact[],
			snowW: number,
			snowH: number,
			strength: number
		) => {
			if (impacts.length === 0) return;
			if (strength <= 0.001) return;

			const cw = cloudsCanvas.width || CLOUDS_CANVAS_SIZE_PX;
			const ch = cloudsCanvas.height || CLOUDS_CANVAS_SIZE_PX;
			const assets = ensureCloudsSnowInteractionAssets(cw, ch);
			if (!assets) return;
			const { scratchCanvas, scratchCtx, thinStamp, glowStamp } = assets;

			// Snapshot clouds so we can re-sample without feedback while distorting.
			scratchCtx.clearRect(0, 0, cw, ch);
			scratchCtx.drawImage(cloudsCanvas, 0, 0, cw, ch);

			const scaleX = cw / Math.max(1, snowW);
			const scaleY = ch / Math.max(1, snowH);
			const scale = (scaleX + scaleY) * 0.5;
			const maxShift = CLOUDS_SNOW_INTERACTION_MAX_REFRACT_SHIFT_PX;

			const prevAlpha = cloudsCtx.globalAlpha;
			const prevOp = cloudsCtx.globalCompositeOperation;
			let prevFilter: string | null = null;
			try {
				prevFilter = cloudsCtx.filter;
			} catch {
				prevFilter = null;
			}

			try {
				cloudsCtx.setTransform(1, 0, 0, 1, 0, 0);
			} catch {
				// Ignore.
			}

			// Pass 1: tiny refraction shear in-place (keeps it feeling like distortion, not a reveal).
			try {
				cloudsCtx.globalCompositeOperation = 'source-over';
			} catch {
				// Ignore.
			}
			try {
				cloudsCtx.filter = 'blur(0.95px)';
			} catch {
				// Ignore.
			}
			for (const impact of impacts) {
				const alpha = clamp(
					strength * Math.pow(clamp(impact.alpha01, 0, 1), 0.55),
					0,
					1
				);
				const a = alpha * 0.18;
				if (a <= 0.001) continue;

				const cx = impact.x * scaleX;
				const cy = impact.y * scaleY;
				const r = clamp(impact.radiusPx * scale, 8, 38);
				const driftBias = Math.tanh((impact.driftXPx * scaleX) / 6);
				const warpX = clamp(driftBias * maxShift, -maxShift, maxShift);
				const warpY = -clamp((0.65 + impact.depth) * 0.9, 0.6, 1.9);

				const srcX0 = cx - r;
				const srcY0 = cy - r;
				const srcW = r * 2;
				const srcH = r * 2;
				const srcX = clamp(srcX0, 0, cw - srcW);
				const srcY = clamp(srcY0, 0, ch - srcH);
				const srcDx = srcX - srcX0;
				const srcDy = srcY - srcY0;

				cloudsCtx.save();
				cloudsCtx.beginPath();
				cloudsCtx.ellipse(cx, cy, r * 0.95, r * 0.72, 0, 0, Math.PI * 2);
				cloudsCtx.clip();
				cloudsCtx.globalAlpha = a;
				cloudsCtx.drawImage(
					scratchCanvas,
					srcX,
					srcY,
					srcW,
					srcH,
					cx - r + warpX + srcDx,
					cy - r + warpY + srcDy,
					srcW,
					srcH
				);
				cloudsCtx.restore();
			}

			// Pass 2: feathered thinning so the snow layer reads through cloud density.
			// We draw a trailing column per impact (from impact up into the cloud deck) so the
			// entire fall path of each flake reads as a gentle, vertical parting of clouds.
			try {
				cloudsCtx.globalCompositeOperation = 'destination-out';
			} catch {
				// Ignore.
			}
			try {
				cloudsCtx.filter = 'none';
			} catch {
				// Ignore.
			}
			for (const impact of impacts) {
				const alpha = clamp(
					strength * Math.pow(clamp(impact.alpha01, 0, 1), 0.55),
					0,
					1
				);
				const a = alpha * 0.56;
				if (a <= 0.001) continue;

				const cx = impact.x * scaleX;
				const cy = impact.y * scaleY;
				const r = clamp(impact.radiusPx * scale, 9, 44);
				const drift = clamp(
					Math.tanh((impact.driftXPx * scaleX) / 12) * 1.8,
					-1.8,
					1.8
				);

				// Trailing vertical column — three staggered stamps so the wake feels
				// continuous and "snow-shaped" rather than a circular punch.
				const columnW = r * 2.15;
				const columnHBase = r * 3.2;
				const columns = [
					{ dyMul: -0.25, alphaMul: 1.0, scaleMul: 1.0 },
					{ dyMul: -1.1, alphaMul: 0.78, scaleMul: 1.08 },
					{ dyMul: -2.0, alphaMul: 0.52, scaleMul: 1.18 },
					{ dyMul: -2.9, alphaMul: 0.3, scaleMul: 1.28 },
				];
				for (const seg of columns) {
					cloudsCtx.globalAlpha = a * seg.alphaMul;
					const segW = columnW * seg.scaleMul;
					const segH = columnHBase * seg.scaleMul;
					const segX = cx + drift * Math.abs(seg.dyMul) * 0.45;
					const segY = cy + r * seg.dyMul;
					cloudsCtx.drawImage(
						thinStamp,
						segX - segW * 0.5,
						segY - segH * 0.5,
						segW,
						segH
					);
				}
			}

			// Pass 3: a faint cool bloom so the “through-cloud” snow reads without getting literal.
			try {
				cloudsCtx.globalCompositeOperation = 'lighter';
			} catch {
				// Ignore.
			}
			try {
				cloudsCtx.filter = 'blur(1.25px)';
			} catch {
				// Ignore.
			}
			for (const impact of impacts) {
				const alpha = clamp(
					strength * Math.pow(clamp(impact.alpha01, 0, 1), 0.55),
					0,
					1
				);
				const a = alpha * 0.13;
				if (a <= 0.001) continue;

				const cx = impact.x * scaleX;
				const cy = impact.y * scaleY;
				const r = clamp(impact.radiusPx * scale, 8, 38);

				cloudsCtx.globalAlpha = a;
				const glowW = r * 2.4;
				const glowH = r * 3.65;
				const glowY = cy - r * 0.62;
				cloudsCtx.drawImage(
					glowStamp,
					cx - glowW * 0.5,
					glowY - glowH * 0.5,
					glowW,
					glowH
				);
			}

			cloudsCtx.globalAlpha = prevAlpha;
			cloudsCtx.globalCompositeOperation = prevOp;
			if (prevFilter != null) {
				try {
					cloudsCtx.filter = prevFilter;
				} catch {
					// Ignore.
				}
			}
		};

		const drawSnow = (tMs: number) => {
			const snowCanvas = snowCanvasRef.current;
			const snowCtx = snowCanvasCtxRef.current;
			if (!snowCanvas || !snowCtx) return;

			const w = snowCanvas.width || SNOW_CANVAS_SIZE_PX;
			const h = snowCanvas.height || SNOW_CANVAS_SIZE_PX;
			try {
				snowCtx.setTransform(1, 0, 0, 1, 0, 0);
				snowCtx.imageSmoothingEnabled = true;
				snowCtx.imageSmoothingQuality = 'high';
			} catch {
				// Ignore.
			}
			snowCtx.clearRect(0, 0, w, h);

			const cfg = weatherMoodConfigRef.current;
			if (cfg.snowOpacity <= 0.001 || cfg.snowDensity <= 0.001) return;
			const stamps = snowStampImagesRef.current;
			const hasStamps = Array.isArray(stamps) && stamps.length > 0;

			let currentZoom = MAP_DEFAULT_ZOOM;
			try {
				currentZoom = map.getZoom?.() ?? MAP_DEFAULT_ZOOM;
			} catch {
				currentZoom = MAP_DEFAULT_ZOOM;
			}
			if (currentZoom >= SNOW_HIDE_AT_OR_ABOVE_ZOOM) return;

			const particles = buildSnowParticles();
			const densityScale = prefersReducedMotion ? 0.55 : 1;
			const visibleCount = Math.min(
				particles.length,
				Math.max(0, Math.round(particles.length * clamp(cfg.snowDensity, 0, 1) * densityScale))
			);
			if (visibleCount <= 0) return;

			const interactionTarget = prefersReducedMotion
				? CLOUDS_SNOW_INTERACTION_TARGET_IMPACTS_REDUCED
				: CLOUDS_SNOW_INTERACTION_TARGET_IMPACTS;
			const interactionStride = Math.max(
				1,
				Math.floor(visibleCount / Math.max(1, interactionTarget))
			);
			const impacts: SnowCloudInteractionImpact[] = [];

			const tS = tMs / 1000;
			const motionMul = prefersReducedMotion ? 0.42 : 1;
			const turbulenceMul = prefersReducedMotion ? 0.36 : 1;
			const fallPx = SNOW_BASE_FALL_PX_PER_S * clamp(cfg.snowFallSpeed, 0, 2) * motionMul;
			const windPx = SNOW_BASE_WIND_PX_PER_S * clamp(cfg.snowWind, -2, 2) * motionMul;
			const parallax = clamp(cfg.snowDepthParallax, 0, 1.5);
			const turbulenceT = tMs / SNOW_TURBULENCE_LOOP_MS;
			const gustT = tMs / SNOW_GUST_BAND_LOOP_MS;
			const densityT = tMs / SNOW_DENSITY_BAND_LOOP_MS;
			const wrap = (value: number, span: number, margin: number) =>
				(((value + margin) % (span + margin * 2)) + span + margin * 2) %
					(span + margin * 2) -
				margin;

			snowCtx.save();
			try {
				snowCtx.globalCompositeOperation = 'source-over';
				try {
					snowCtx.filter = 'none';
				} catch {
					// Ignore.
				}

				for (let i = 0; i < visibleCount; i++) {
					const p = particles[i];
					const stamp = hasStamps ? stamps[p.stampIndex % stamps.length] : null;
					const depthScale = lerp(0.86, 1.12, p.depth * parallax);
					const pointRadius = p.size * depthScale;
					const stampSize = clamp(
						pointRadius * 11.2 * p.scaleJitter,
						SNOW_STAMP_MIN_SIZE_PX,
						SNOW_STAMP_MAX_SIZE_PX
					);
					const drawW = stampSize;
					const drawH = stampSize * p.stretch;
					const margin = Math.max(drawW, drawH) * 0.6 + 6;

					const baseX = wrap(
						p.x + tS * windPx * p.windSpeed * (0.55 + p.depth),
						w,
						margin
					);
					const baseY = wrap(
						p.y + tS * fallPx * p.fallSpeed * (0.62 + p.depth * 0.76),
						h,
						margin
					);

					const localDriftA =
						(noise1D(turbulenceT * lerp(0.72, 1.55, p.depth) + p.turbulenceSeed) - 0.5) *
						2;
					const localDriftB =
						(noise1D(turbulenceT * lerp(1.35, 2.35, p.depth) + p.gustSeed + 17.3) -
							0.5) *
						2;
					const gustBand =
						(noise1D(baseY * 0.0042 + baseX * 0.0014 + gustT * 1.2 + 210.3) - 0.5) *
						2;
					const gustFine =
						(noise1D(baseY * 0.011 - baseX * 0.002 + gustT * 2.1 + p.gustSeed) - 0.5) *
						2;
					const windSway =
						Math.sin(
							tS * lerp(0.42, 0.95, p.depth) +
								baseY * lerp(0.006, 0.014, p.depth) +
								p.windPhase
						) *
						SNOW_WIND_SWAY_BASE_PX *
						p.windSway *
						(0.52 + parallax * 0.42);
					const gustPush =
						gustBand *
						SNOW_GUST_PUSH_BASE_PX *
						p.gustResponsiveness *
						lerp(0.45, 1.18, p.depth) *
						(0.46 + parallax * 0.36);
					const eddyDrift =
						(localDriftA - localDriftB) *
						SNOW_EDDY_DRIFT_BASE_PX *
						p.windSway *
						lerp(0.35, 1.05, p.depth);
					const verticalFlutter =
						(noise1D(turbulenceT * lerp(1.1, 2.1, p.depth) + p.turbulenceSeed + 43.8) -
							0.5) *
						2;
					const driftX =
						((localDriftA * 0.68 + localDriftB * 0.32) *
							p.wobble *
							(0.28 + parallax * 0.36) +
							gustBand * lerp(0.35, 2.2, p.depth) * (0.34 + parallax * 0.38) +
							gustFine * lerp(0.12, 0.65, p.depth) +
							windSway +
							gustPush +
							eddyDrift) *
						turbulenceMul;
					const x = wrap(baseX + driftX, w, margin);
					const y = wrap(
						baseY + verticalFlutter * lerp(0.12, 0.78, p.depth) * turbulenceMul,
						h,
						margin
					);
					const lng = normalizeLngDeg((x / w) * 360 - 180);
					const usSideAlpha =
						1 -
						smoothstep(
							SNOW_US_SIDE_FADE_START_DEG,
							SNOW_US_SIDE_FADE_END_DEG,
							angularLngDistanceDeg(lng, SNOW_US_SIDE_CENTER_LNG)
						);
					if (usSideAlpha <= 0.006) continue;

					const densityCoord = y * 0.0056 + x * 0.0018 + densityT;
					const densityField =
						noise1D(densityCoord + 31.7) * 0.68 +
						noise1D(densityCoord * 1.9 + 409.1) * 0.32;
					const particlePresence = clamp(
						(densityField + 0.42 - p.densitySeed * 0.7) / 0.38,
						0,
						1
					);
					const densityAlpha = clamp(
						lerp(0.55, 1.12, densityField) * particlePresence,
						0,
						1.12
					);
					const flakeAlpha = clamp(
						p.opacity *
							lerp(0.72, 1.08, p.depth) *
							densityAlpha *
							usSideAlpha *
							SNOW_STAMP_ALPHA_MULTIPLIER,
						0,
						SNOW_STAMP_MAX_ALPHA
					);
					if (flakeAlpha <= 0.006) continue;

					if (
						impacts.length < interactionTarget &&
						i % interactionStride === 0 &&
						x >= 0 &&
						x <= w &&
						y >= 0 &&
						y <= h
					) {
						const alpha01 = clamp(flakeAlpha / Math.max(0.001, SNOW_STAMP_MAX_ALPHA), 0, 1);
						const radiusPx = clamp(
							Math.max(drawW, drawH) * (1.25 + p.depth * 1.55),
							16,
							72
						);
						impacts.push({
							x,
							y,
							radiusPx,
							alpha01,
							driftXPx: driftX,
							depth: p.depth,
						});
					}

					if (snowDebugEnabled) {
						snowCtx.globalAlpha = 1;
						snowCtx.fillStyle = 'rgb(255, 0, 200)';
						snowCtx.beginPath();
						snowCtx.arc(x, y, Math.max(3, drawW * 0.35), 0, Math.PI * 2);
						snowCtx.fill();
					} else if (stamp) {
						snowCtx.globalAlpha = flakeAlpha;
						if (p.depth >= SNOW_ROTATED_PARTICLE_DEPTH_MIN) {
							snowCtx.translate(x, y);
							snowCtx.rotate(
								p.rotation + p.wobblePhase * 0.04 + tS * p.rotationSpeed * turbulenceMul
							);
							snowCtx.drawImage(stamp, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
							snowCtx.setTransform(1, 0, 0, 1, 0, 0);
						} else {
							snowCtx.drawImage(stamp, x - drawW * 0.5, y - drawH * 0.5, drawW, drawH);
						}
					} else {
						const fallbackSize = clamp(stampSize * 0.16, 1.1, 2.8);
						snowCtx.globalAlpha = flakeAlpha;
						snowCtx.fillStyle = 'rgb(246, 252, 255)';
						snowCtx.beginPath();
						snowCtx.ellipse(x, y, fallbackSize * 0.55, fallbackSize, 0, 0, Math.PI * 2);
						snowCtx.fill();
					}
				}

				// Snow is intentionally layered under clouds; to avoid it feeling “buried,”
				// we add a subtle, snow-driven distortion/thinning pass to the clouds canvas.
				const cloudsPresence =
					1 -
					smoothstep(
						CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
						CLOUDS_OVERLAY_FADE_OUT_END_ZOOM,
						currentZoom
					);
				const interactionStrength =
					clamp(cfg.snowOpacity, 0, 1) *
					clamp(cfg.snowDensity, 0, 1) *
					clamp(cloudsPresence, 0, 1) *
					(prefersReducedMotion ? 0.6 : 1) *
					snowCloudInteractionMultiplier;
				try {
					applySnowCloudInteraction(impacts, w, h, interactionStrength);
				} catch {
					// Non-fatal; snowy mood can still render as just particles under clouds.
				}
			} catch {
				// Non-fatal; the snowy mood can render as just cold clouds/fog.
			} finally {
				snowCtx.restore();
			}

			// Polar fade: same Mercator-vs-globe distortion the cloud canvas
			// gets, since snow shares CLOUDS_CANVAS_COORDINATES. Reuses the
			// shared mask so flakes near the poles fade out cleanly.
			const polarMask = getCloudsPolarFadeMask(h);
			if (polarMask) {
				try {
					snowCtx.setTransform(1, 0, 0, 1, 0, 0);
					snowCtx.globalAlpha = 1;
					snowCtx.globalCompositeOperation = 'destination-in';
					snowCtx.drawImage(polarMask, 0, 0, w, h);
					snowCtx.globalCompositeOperation = 'source-over';
				} catch {
					// Ignore.
				}
			}
		};

		const driftLoopS = CLOUDS_DRIFT_LOOP_MS / 1000;
		const meanderSpeedBaseX =
			driftLoopS > 0 ? (CLOUDS_DRIFT_AMPLITUDE_X_PX / driftLoopS) * 2.2 : 0;
		const meanderSpeedBaseY =
			driftLoopS > 0 ? (CLOUDS_DRIFT_AMPLITUDE_Y_PX / driftLoopS) * 2.2 : 0;

		const buildStormCloudMaskData = (
			src: Uint8ClampedArray,
			w: number,
			h: number
		): {
			coreData: Uint8ClampedArray<ArrayBuffer>;
			edgeData: Uint8ClampedArray<ArrayBuffer>;
			corePixels: number;
			edgePixels: number;
		} => {
			const coreData = new Uint8ClampedArray(new ArrayBuffer(src.length));
			const edgeData = new Uint8ClampedArray(new ArrayBuffer(src.length));
			let corePixels = 0;
			let edgePixels = 0;

			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					const idx = (y * w + x) * 4;
					const a = src[idx + 3] / 255;
					if (a <= 0.001) continue;

					// Dense cloud centers become localized storm shadows; feathered
					// mid-alpha edges become a light rim so storm clouds are not flat black.
					const core = Math.pow(smoothstep(0.42, 0.92, a), 1.28);
					const edge =
						Math.pow(smoothstep(0.07, 0.34, a), 0.9) *
						(1 - smoothstep(0.48, 0.86, a));

					if (core > 0.002) {
						const coreNoise = 0.78 + hash01(x * 13.17 + y * 31.73 + 204.9) * 0.22;
						const c = core * coreNoise;
						const v = Math.round(82 - c * 42);
						coreData[idx] = v;
						coreData[idx + 1] = Math.max(0, v + 4);
						coreData[idx + 2] = Math.min(255, v + 14);
						coreData[idx + 3] = Math.round(clamp(c * 255, 0, 255));
						corePixels++;
					}

					if (edge > 0.002) {
						const edgeNoise = 0.82 + hash01(x * 19.23 + y * 7.91 + 603.1) * 0.18;
						const e = edge * edgeNoise;
						const v = Math.round(222 + e * 26);
						edgeData[idx] = Math.min(255, v - 4);
						edgeData[idx + 1] = Math.min(255, v + 1);
						edgeData[idx + 2] = Math.min(255, v + 6);
						edgeData[idx + 3] = Math.round(clamp(e * 210, 0, 255));
						edgePixels++;
					}
				}
			}

			return { coreData, edgeData, corePixels, edgePixels };
		};

		const putStormMaskPattern = (
			canvas: HTMLCanvasElement,
			data: Uint8ClampedArray<ArrayBuffer>,
			w: number,
			h: number
		): CanvasPattern | null => {
			const ctx = canvas.getContext('2d');
			if (!ctx) return null;
			try {
				ctx.putImageData(new ImageData(data, w, h), 0, 0);
				return cloudsCtx.createPattern(canvas, 'repeat');
			} catch {
				return null;
			}
		};

		const ensureStormCloudTextures = (img: HTMLImageElement) => {
			if (cloudsTextureStormReadyRef.current) return;
			cloudsTextureStormReadyRef.current = false;

			try {
				if (typeof document === 'undefined') return;

				let scratchCanvas = cloudsTextureScratchCanvasRef.current;
				if (!scratchCanvas) {
					scratchCanvas = document.createElement('canvas');
					scratchCanvas.width = CLOUDS_CANVAS_SIZE_PX;
					scratchCanvas.height = CLOUDS_CANVAS_SIZE_PX;
					cloudsTextureScratchCanvasRef.current = scratchCanvas;
				}

				const w = scratchCanvas.width || CLOUDS_CANVAS_SIZE_PX;
				const h = scratchCanvas.height || CLOUDS_CANVAS_SIZE_PX;
				const scratchCtx = scratchCanvas.getContext('2d');
				if (!scratchCtx) return;

				try {
					scratchCtx.imageSmoothingEnabled = true;
					scratchCtx.imageSmoothingQuality = 'high';
				} catch {
					// Ignore.
				}

				scratchCtx.clearRect(0, 0, w, h);
				scratchCtx.drawImage(img, 0, 0, w, h);

				let imageData: ImageData | null = null;
				try {
					imageData = scratchCtx.getImageData(0, 0, w, h);
				} catch {
					imageData = null;
				}
				if (!imageData) return;

				let coreCanvas = cloudsTextureStormCoreCanvasRef.current;
				if (!coreCanvas) {
					coreCanvas = document.createElement('canvas');
					coreCanvas.width = w;
					coreCanvas.height = h;
					cloudsTextureStormCoreCanvasRef.current = coreCanvas;
				}

				let edgeCanvas = cloudsTextureStormEdgeCanvasRef.current;
				if (!edgeCanvas) {
					edgeCanvas = document.createElement('canvas');
					edgeCanvas.width = w;
					edgeCanvas.height = h;
					cloudsTextureStormEdgeCanvasRef.current = edgeCanvas;
				}

				const { coreData, edgeData, corePixels, edgePixels } = buildStormCloudMaskData(
					imageData.data,
					w,
					h
				);
				cloudsTextureStormCorePatternRef.current =
					corePixels > 0 ? putStormMaskPattern(coreCanvas, coreData, w, h) : null;
				cloudsTextureStormEdgePatternRef.current =
					edgePixels > 0 ? putStormMaskPattern(edgeCanvas, edgeData, w, h) : null;
				cloudsTextureStormReadyRef.current = Boolean(
					cloudsTextureStormCorePatternRef.current ||
						cloudsTextureStormEdgePatternRef.current
				);
			} catch {
				cloudsTextureStormReadyRef.current = false;
				cloudsTextureStormCorePatternRef.current = null;
				cloudsTextureStormEdgePatternRef.current = null;
			}
		};

		// Secondary clouds texture: a thinner/sparser variant so we can composite a second
		// independently-drifting layer without it reading like two identical "blankets".
		const ensureSecondaryCloudsTexture = (img: HTMLImageElement) => {
			// If we've already built the secondary texture/pattern, don't redo work.
			if (cloudsTexturePatternSecondaryRef.current) return;
			if (
				cloudsTextureSecondaryReadyRef.current &&
				cloudsTextureSecondaryCanvasRef.current
			)
				return;

			cloudsTextureSecondaryReadyRef.current = false;

			try {
				let secondaryCanvas = cloudsTextureSecondaryCanvasRef.current;
				if (!secondaryCanvas && typeof document !== 'undefined') {
					secondaryCanvas = document.createElement('canvas');
					secondaryCanvas.width = CLOUDS_CANVAS_SIZE_PX;
					secondaryCanvas.height = CLOUDS_CANVAS_SIZE_PX;
					cloudsTextureSecondaryCanvasRef.current = secondaryCanvas;
				}
				if (!secondaryCanvas) return;

				const w = secondaryCanvas.width || CLOUDS_CANVAS_SIZE_PX;
				const h = secondaryCanvas.height || CLOUDS_CANVAS_SIZE_PX;
				const ctx2 = secondaryCanvas.getContext('2d');
				if (!ctx2) return;

				try {
					ctx2.imageSmoothingEnabled = true;
					ctx2.imageSmoothingQuality = 'high';
				} catch {
					// Ignore.
				}

				ctx2.clearRect(0, 0, w, h);
				ctx2.drawImage(img, 0, 0, w, h);

				let imageData: ImageData | null = null;
				try {
					imageData = ctx2.getImageData(0, 0, w, h);
				} catch {
					imageData = null;
				}
				if (!imageData) return;

				// Tileable coarse mask noise (wraps on a small grid) so the secondary layer
				// doesn't add uniform density everywhere.
				// Coarse, tileable mask (wraps at the texture boundary). Keep this fairly low
				// frequency so it reads as distinct cloud systems rather than fine noise.
				const maskGrid = 10;
				const maskVals = new Float32Array(maskGrid * maskGrid);
				for (let gy = 0; gy < maskGrid; gy++) {
					for (let gx = 0; gx < maskGrid; gx++) {
						const n = gx * 127.1 + gy * 311.7 + 74.7;
						maskVals[gy * maskGrid + gx] = hash01(n);
					}
				}
				const maskNoise2D = (u: number, v: number) => {
					// u/v in "grid space" (0..maskGrid).
					const x0 = Math.floor(u);
					const y0 = Math.floor(v);
					const fx = u - x0;
					const fy = v - y0;
					const ix0 = ((x0 % maskGrid) + maskGrid) % maskGrid;
					const iy0 = ((y0 % maskGrid) + maskGrid) % maskGrid;
					const ix1 = (ix0 + 1) % maskGrid;
					const iy1 = (iy0 + 1) % maskGrid;
					const a00 = maskVals[iy0 * maskGrid + ix0];
					const a10 = maskVals[iy0 * maskGrid + ix1];
					const a01 = maskVals[iy1 * maskGrid + ix0];
					const a11 = maskVals[iy1 * maskGrid + ix1];
					const sx = smoothstep01(fx);
					const sy = smoothstep01(fy);
					const xA = a00 + (a10 - a00) * sx;
					const xB = a01 + (a11 - a01) * sx;
					return xA + (xB - xA) * sy;
				};

				const data = imageData.data;
				// Keep only denser cores (removes haze), then gate by the coarse mask.
				const alphaFloor = 0.08;
				const alphaPower = 2.2;
				const maskThreshold = 0.52;
				const maskPower = 1.35;
				const invAlphaDenom = 1 / Math.max(1e-6, 1 - alphaFloor);
				const invMaskDenom = 1 / Math.max(1e-6, 1 - maskThreshold);

				for (let y = 0; y < h; y++) {
					const v = (y / h) * maskGrid;
					for (let x = 0; x < w; x++) {
						const idx = (y * w + x) * 4;
						const a = data[idx + 3] / 255;
						let a2 = Math.max(0, (a - alphaFloor) * invAlphaDenom);
						a2 = Math.pow(a2, alphaPower);

						const n = maskNoise2D((x / w) * maskGrid, v);
						let g = Math.max(0, (n - maskThreshold) * invMaskDenom);
						g = Math.pow(g, maskPower);

						const outA = Math.min(1, a2 * g * 1.15);
						data[idx + 3] = Math.round(outA * 255);
					}
				}

				let applied = false;
				try {
					ctx2.putImageData(imageData, 0, 0);
					applied = true;
				} catch {
					applied = false;
				}
				cloudsTextureSecondaryReadyRef.current = applied;

				try {
					cloudsTexturePatternSecondaryRef.current = cloudsCtx.createPattern(
						secondaryCanvas,
						'repeat'
					);
				} catch {
					cloudsTexturePatternSecondaryRef.current = null;
				}
			} catch {
				// Ignore.
			}
		};

		// Split the base clouds texture into multiple tileable "groups" so different
		// cloud structures can drift at noticeably different speeds without the
		// whole layer reading like a single translating sheet.
		const ensureCloudsGroupPatterns = (img: HTMLImageElement) => {
			const existingPatterns = cloudsTextureGroupPatternsRef.current;
			const desiredGroupCount = cloudsDriftGroupOffsetsRef.current.length;
			if (
				cloudsTextureGroupReadyRef.current &&
				Array.isArray(existingPatterns) &&
				existingPatterns.length === desiredGroupCount &&
				cloudsTexturePatternHazeRef.current
			)
				return;

			cloudsTextureGroupReadyRef.current = false;

			try {
				// Use (and reuse) a scratch canvas to read pixels from the base texture.
				// Important: do NOT reuse the secondary texture canvas (it has different pixels).
				let scratchCanvas = cloudsTextureScratchCanvasRef.current;
				if (!scratchCanvas && typeof document !== 'undefined') {
					scratchCanvas = document.createElement('canvas');
					scratchCanvas.width = CLOUDS_CANVAS_SIZE_PX;
					scratchCanvas.height = CLOUDS_CANVAS_SIZE_PX;
					cloudsTextureScratchCanvasRef.current = scratchCanvas;
				}
				if (!scratchCanvas) return;

				const w = scratchCanvas.width || CLOUDS_CANVAS_SIZE_PX;
				const h = scratchCanvas.height || CLOUDS_CANVAS_SIZE_PX;
				const scratchCtx = scratchCanvas.getContext('2d');
				if (!scratchCtx) return;

				try {
					scratchCtx.imageSmoothingEnabled = true;
					scratchCtx.imageSmoothingQuality = 'high';
				} catch {
					// Ignore.
				}

				scratchCtx.clearRect(0, 0, w, h);
				scratchCtx.drawImage(img, 0, 0, w, h);

				let imageData: ImageData | null = null;
				try {
					imageData = scratchCtx.getImageData(0, 0, w, h);
				} catch {
					imageData = null;
				}
				if (!imageData) return;

				const src = imageData.data;
				// Exclude the very faint haze from the motion groups; it tends to connect
				// distant clouds into a single structure and makes group motion read uniform.
				const alphaGate = 18;

				// Build a "haze-only" texture (alpha below alphaGate). This lets us keep
				// slow global motion without anchoring the dense cloud cores.
				try {
					let hazeCanvas = cloudsTextureHazeCanvasRef.current;
					if (!hazeCanvas && typeof document !== 'undefined') {
						hazeCanvas = document.createElement('canvas');
						hazeCanvas.width = w;
						hazeCanvas.height = h;
						cloudsTextureHazeCanvasRef.current = hazeCanvas;
					}
					const hazeCtx = hazeCanvas ? hazeCanvas.getContext('2d') : null;
					if (hazeCanvas && hazeCtx) {
						const hazeData = new Uint8ClampedArray(new ArrayBuffer(src.length));
						for (let i = 0; i < src.length; i += 4) {
							const a = src[i + 3];
							if (a && a < alphaGate) {
								hazeData[i] = src[i];
								hazeData[i + 1] = src[i + 1];
								hazeData[i + 2] = src[i + 2];
								hazeData[i + 3] = a;
							}
						}

						try {
							hazeCtx.putImageData(new ImageData(hazeData, w, h), 0, 0);
							cloudsTexturePatternHazeRef.current = cloudsCtx.createPattern(
								hazeCanvas,
								'repeat'
							);
						} catch {
							cloudsTexturePatternHazeRef.current = null;
						}
					}
				} catch {
					cloudsTexturePatternHazeRef.current = null;
				}

				const groupCount = Math.max(1, cloudsDriftGroupOffsetsRef.current.length);
				const groupDatas: Uint8ClampedArray<ArrayBuffer>[] = Array.from(
					{ length: groupCount },
					() => new Uint8ClampedArray(new ArrayBuffer(src.length))
				);
				const groupPixelCounts = new Uint32Array(groupCount);

				// Connected-components over alphaGate pixels (with wraparound) so each cloud
				// structure is assigned to a single speed group (cloud-to-cloud variation).
				const pixelCount = w * h;
				const visited = new Uint8Array(pixelCount);
				const stack = new Int32Array(pixelCount);
				const componentPixels: number[] = [];

				const halfIndex = Math.floor(groupCount / 2);
				const slowMax = Math.max(0, halfIndex - 1);
				const fastMin = Math.min(groupCount - 1, halfIndex);

				let compId = 0;
				for (let start = 0; start < pixelCount; start++) {
					if (visited[start]) continue;
					const a0 = src[start * 4 + 3];
					if (a0 < alphaGate) continue;

					let sp = 0;
					stack[sp++] = start;
					visited[start] = 1;
					componentPixels.length = 0;

					while (sp > 0) {
						const p = stack[--sp];
						componentPixels.push(p);

						const x = p % w;
						const y = (p / w) | 0;

						const left = x > 0 ? p - 1 : p + (w - 1);
						const right = x + 1 < w ? p + 1 : p - (w - 1);
						const up = y > 0 ? p - w : p + (h - 1) * w;
						const down = y + 1 < h ? p + w : p - (h - 1) * w;

						if (!visited[left] && src[left * 4 + 3] >= alphaGate) {
							visited[left] = 1;
							stack[sp++] = left;
						}
						if (!visited[right] && src[right * 4 + 3] >= alphaGate) {
							visited[right] = 1;
							stack[sp++] = right;
						}
						if (!visited[up] && src[up * 4 + 3] >= alphaGate) {
							visited[up] = 1;
							stack[sp++] = up;
						}
						if (!visited[down] && src[down * 4 + 3] >= alphaGate) {
							visited[down] = 1;
							stack[sp++] = down;
						}
					}

					const size = componentPixels.length;
					const r = hash01(compId * 91.7 + size * 0.013 + 501.9);
					const r2 = hash01(compId * 37.1 + size * 0.021 + 911.3);
					let bucket = 0;
					// Keep big cloud masses biased toward the slower half, but still distribute
					// across multiple buckets so the motion reads as cloud-to-cloud variation.
					if (size >= 9000) {
						// Small chance that a big cloud system is part of a faster flow.
						if (r2 < 0.15) {
							const span = Math.max(1, groupCount - fastMin);
							bucket = fastMin + Math.min(span - 1, Math.floor(r * span));
						} else {
							const span = Math.max(1, slowMax + 1);
							bucket = Math.min(slowMax, Math.floor(r * span));
						}
					} else if (size <= 420) {
						const span = Math.max(1, groupCount - fastMin);
						bucket = fastMin + Math.min(span - 1, Math.floor(r * span));
					} else {
						bucket = Math.min(groupCount - 1, Math.floor(r * groupCount));
					}

					const out = groupDatas[bucket];
					for (let i = 0; i < size; i++) {
						const p = componentPixels[i];
						const idx = p * 4;
						out[idx] = src[idx];
						out[idx + 1] = src[idx + 1];
						out[idx + 2] = src[idx + 2];
						out[idx + 3] = src[idx + 3];
					}
					groupPixelCounts[bucket] += size;
					compId++;
				}

				const groupCanvases: HTMLCanvasElement[] = [];
				const groupPatterns: (CanvasPattern | null)[] = [];
				const stormCoreGroupPatterns: (CanvasPattern | null)[] = [];
				const stormEdgeGroupPatterns: (CanvasPattern | null)[] = [];

				for (let g = 0; g < groupCount; g++) {
					if (typeof document === 'undefined') {
						groupPatterns.push(null);
						stormCoreGroupPatterns.push(null);
						stormEdgeGroupPatterns.push(null);
						continue;
					}
					if (!groupPixelCounts[g]) {
						groupPatterns.push(null);
						stormCoreGroupPatterns.push(null);
						stormEdgeGroupPatterns.push(null);
						continue;
					}

					const c = document.createElement('canvas');
					c.width = w;
					c.height = h;
					const ctx = c.getContext('2d');
					if (!ctx) {
						groupPatterns.push(null);
						stormCoreGroupPatterns.push(null);
						stormEdgeGroupPatterns.push(null);
						continue;
					}

					let applied = false;
					try {
						ctx.putImageData(new ImageData(groupDatas[g], w, h), 0, 0);
						applied = true;
					} catch {
						applied = false;
					}
					if (!applied) {
						groupPatterns.push(null);
						stormCoreGroupPatterns.push(null);
						stormEdgeGroupPatterns.push(null);
						continue;
					}

					groupCanvases.push(c);
					try {
						groupPatterns.push(cloudsCtx.createPattern(c, 'repeat'));
					} catch {
						groupPatterns.push(null);
					}

					try {
						const { coreData, edgeData, corePixels, edgePixels } = buildStormCloudMaskData(
							groupDatas[g],
							w,
							h
						);
						const coreCanvas = document.createElement('canvas');
						coreCanvas.width = w;
						coreCanvas.height = h;
						stormCoreGroupPatterns.push(
							corePixels > 0 ? putStormMaskPattern(coreCanvas, coreData, w, h) : null
						);

						const edgeCanvas = document.createElement('canvas');
						edgeCanvas.width = w;
						edgeCanvas.height = h;
						stormEdgeGroupPatterns.push(
							edgePixels > 0 ? putStormMaskPattern(edgeCanvas, edgeData, w, h) : null
						);
					} catch {
						stormCoreGroupPatterns.push(null);
						stormEdgeGroupPatterns.push(null);
					}
				}

				cloudsTextureGroupCanvasesRef.current = groupCanvases;
				cloudsTextureGroupPatternsRef.current = groupPatterns;
				cloudsTextureStormCoreGroupPatternsRef.current = stormCoreGroupPatterns;
				cloudsTextureStormEdgeGroupPatternsRef.current = stormEdgeGroupPatterns;
				cloudsTextureGroupReadyRef.current = groupPatterns.some(Boolean);
				if (
					cloudsTextureGroupReadyRef.current &&
					!cloudsTextureGroupDebugLoggedRef.current &&
					typeof process !== 'undefined' &&
					process.env?.NODE_ENV !== 'production'
				) {
					cloudsTextureGroupDebugLoggedRef.current = true;
					try {
						console.info('[SearchResultsMap] clouds groups ready', {
							groups: groupCount,
							nonEmpty: Array.from(groupPixelCounts).filter(Boolean).length,
							pixels: Array.from(groupPixelCounts),
							haze: Boolean(cloudsTexturePatternHazeRef.current),
						});
					} catch {
						// Ignore.
					}
				}
			} catch {
				cloudsTextureGroupReadyRef.current = false;
				cloudsTextureStormCoreGroupPatternsRef.current = null;
				cloudsTextureStormEdgeGroupPatternsRef.current = null;
			}
		};

		const draw = (
			img: HTMLImageElement,
			pattern: CanvasPattern | null,
			tMs: number,
			dt: number
		) => {
			let zoomForScale = CLOUDS_DRIFT_BASE_ZOOM;
			try {
				const z =
					typeof map.getZoom === 'function' ? map.getZoom() : CLOUDS_DRIFT_BASE_ZOOM;
				zoomForScale = clamp(z, MAP_MIN_ZOOM, CLOUDS_OVERLAY_FADE_OUT_END_ZOOM);
			} catch {
				zoomForScale = CLOUDS_DRIFT_BASE_ZOOM;
			}
			const zoomScaleRaw = Math.pow(
				2,
				(CLOUDS_DRIFT_BASE_ZOOM - zoomForScale) * CLOUDS_DRIFT_ZOOM_SCALE_EXP
			);
			const zoomScale = clamp(
				zoomScaleRaw,
				CLOUDS_DRIFT_ZOOM_SCALE_MIN,
				CLOUDS_DRIFT_ZOOM_SCALE_MAX
			);
			const speedScale = zoomScale * motionScale;

			// Drift is implemented as a canvas-source animation. We composite two
			// independently-drifting layers so some cloud structures move at different speeds.
			const w = cloudsCanvas.width || CLOUDS_CANVAS_SIZE_PX;
			const h = cloudsCanvas.height || CLOUDS_CANVAS_SIZE_PX;
			const moodCfg = weatherMoodConfigRef.current;
			const stormWindMult = clamp(moodCfg.cloudStormWindMultiplier, 0.25, 3);
			const extraPasses = moodCfg.cloudExtraPasses;
			const extraPassAlpha = moodCfg.cloudExtraPassAlpha;
			const extraPassSpread = clamp(moodCfg.cloudLayerSpread, 0.35, 2.5);
			const configuredSecondaryAlpha = clamp(moodCfg.cloudSecondaryLayerOpacity, 0, 1);
			const hazeLayerAlpha = clamp(moodCfg.cloudHazeLayerOpacity, 0, 1);
			const fineVeilAlpha = clamp(moodCfg.cloudFineVeilOpacity, 0, 1);
			const stormCoreOpacity = clamp(moodCfg.cloudCoreShadowOpacity, 0, 1);
			const stormEdgeOpacity = clamp(moodCfg.cloudEdgeLiftOpacity, 0, 1);

			// Macro meander (base layer): smooth randomness applied as velocity so zoom changes
			// do not introduce positional jumps.
			const meanderT = tMs / CLOUDS_DRIFT_LOOP_MS;
			const meanderNoiseX1 =
				noise1D(meanderT + 10.3) * 0.72 + noise1D(meanderT * 1.9 + 33.7) * 0.28;
			const meanderNoiseY1 =
				noise1D(meanderT + 50.3) * 0.72 + noise1D(meanderT * 1.9 + 73.7) * 0.28;
			const meanderUnitX1 = (meanderNoiseX1 - 0.5) * 2;
			const meanderUnitY1 = (meanderNoiseY1 - 0.5) * 2;

			const moodDriftMult = moodCfg.cloudDriftSpeedMultiplier * stormWindMult;
			const velX1 =
				(CLOUDS_DRIFT_SPEED_X_PX_PER_S * moodDriftMult +
					meanderUnitX1 * meanderSpeedBaseX) *
				speedScale;
			const velY1 =
				(CLOUDS_DRIFT_SPEED_Y_PX_PER_S * moodDriftMult +
					meanderUnitY1 * meanderSpeedBaseY) *
				speedScale;

			const offset1 = cloudsDriftOffsetRef.current;
			offset1.x += velX1 * dt;
			offset1.y += velY1 * dt;
			offset1.x = ((offset1.x % w) + w) % w;
			offset1.y = ((offset1.y % h) + h) % h;

			const x0 = -offset1.x;
			const y0 = -offset1.y;

			const groupPatterns = cloudsTextureGroupReadyRef.current
				? cloudsTextureGroupPatternsRef.current
				: null;
			const groupOffsets = cloudsDriftGroupOffsetsRef.current;
			const groupCount = Array.isArray(groupPatterns)
				? Math.min(groupPatterns.length, groupOffsets.length)
				: 0;
			const useGroups =
				groupCount > 0 && Array.isArray(groupPatterns) && groupPatterns.some(Boolean);
			const hazePattern = cloudsTexturePatternHazeRef.current;
			const useHazeSplit = useGroups && Boolean(hazePattern);

			if (
				useGroups &&
				!cloudsTextureGroupDebugActiveLoggedRef.current &&
				typeof process !== 'undefined' &&
				process.env?.NODE_ENV !== 'production'
			) {
				cloudsTextureGroupDebugActiveLoggedRef.current = true;
				try {
					console.info('[SearchResultsMap] clouds groups active', {
						useHazeSplit,
						groupCount,
						speedMults: [0.06, 0.18, 0.42, 0.85, 1.4, 2.2, 3.2, 4.6],
					});
				} catch {
					// Ignore.
				}
			}

			// When groups are active we shift most of the visible cloud density into the
			// group layers (so motion is structure-to-structure), and keep a lighter base
			// layer underneath for continuity.
			const baseLayerAlpha = useHazeSplit ? 1 : useGroups ? 0.22 : 1;
			const groupsLayerAlpha = useHazeSplit ? 1 : useGroups ? 1 - baseLayerAlpha : 0;

			if (useGroups) {
				// Per-group velocity fields (different speeds + slight direction offsets).
				const speedMults = [0.06, 0.18, 0.42, 0.85, 1.4, 2.2, 3.2, 4.6];
				const meanderMults = [0.35, 0.55, 0.8, 1.0, 1.25, 1.6, 2.0, 2.4];
				const ySpeeds = [-0.06, -0.03, -0.015, 0.0, 0.02, 0.04, 0.07, 0.1];

				for (let g = 0; g < groupCount; g++) {
					const off = groupOffsets[g];
					const seed = 410.3 + g * 97.7;
					const meanderNoiseX =
						noise1D(meanderT + seed) * 0.72 + noise1D(meanderT * 1.9 + seed * 0.7) * 0.28;
					const meanderNoiseY =
						noise1D(meanderT + seed + 40.0) * 0.72 +
						noise1D(meanderT * 1.9 + seed * 0.7 + 80.0) * 0.28;
					const meanderUnitX = (meanderNoiseX - 0.5) * 2;
					const meanderUnitY = (meanderNoiseY - 0.5) * 2;

					const speedMult = speedMults[g] ?? 1;
					const meanderMult = meanderMults[g] ?? 1;
					const ySpeed = ySpeeds[g] ?? 0;

					const groupMoodDriftMult = moodCfg.cloudDriftSpeedMultiplier * stormWindMult;
					const velX =
						(CLOUDS_DRIFT_SPEED_X_PX_PER_S * speedMult * groupMoodDriftMult +
							meanderUnitX * meanderSpeedBaseX * meanderMult) *
						speedScale;
					const velY =
						(ySpeed * groupMoodDriftMult +
							meanderUnitY * meanderSpeedBaseY * meanderMult) *
						speedScale;

					off.x += velX * dt;
					off.y += velY * dt;
					off.x = ((off.x % w) + w) % w;
					off.y = ((off.y % h) + h) % h;
				}
			}

			// Secondary layer: slightly faster + different meander phase so the motion reads
			// as multiple cloud structures moving independently.
			// Make the secondary layer noticeably different in motion so the eye can
			// separate cloud systems moving at different speeds.
			const L2_SPEED_MULT = 2.85;
			const L2_MEANDER_MULT = 1.6;
			const L2_SPEED_Y_PX_PER_S = 0.07;
			const meanderNoiseX2 =
				noise1D(meanderT + 210.3) * 0.72 + noise1D(meanderT * 1.9 + 233.7) * 0.28;
			const meanderNoiseY2 =
				noise1D(meanderT + 250.3) * 0.72 + noise1D(meanderT * 1.9 + 273.7) * 0.28;
			const meanderUnitX2 = (meanderNoiseX2 - 0.5) * 2;
			const meanderUnitY2 = (meanderNoiseY2 - 0.5) * 2;

			const layer2MoodDriftMult = moodCfg.cloudDriftSpeedMultiplier * stormWindMult;
			const velX2 =
				(CLOUDS_DRIFT_SPEED_X_PX_PER_S * L2_SPEED_MULT * layer2MoodDriftMult +
					meanderUnitX2 * meanderSpeedBaseX * L2_MEANDER_MULT) *
				speedScale;
			const velY2 =
				(L2_SPEED_Y_PX_PER_S * layer2MoodDriftMult +
					meanderUnitY2 * meanderSpeedBaseY * L2_MEANDER_MULT) *
				speedScale;

			const offset2 = cloudsDriftOffsetSecondaryRef.current;
			offset2.x += velX2 * dt;
			offset2.y += velY2 * dt;
			offset2.x = ((offset2.x % w) + w) % w;
			offset2.y = ((offset2.y % h) + h) % h;

			const x1 = -offset2.x;
			const y1 = -offset2.y;

			// Ensure canvas ops are in screen-space coordinates for clear/clip.
			try {
				cloudsCtx.setTransform(1, 0, 0, 1, 0, 0);
				cloudsCtx.globalAlpha = 1;
				cloudsCtx.globalCompositeOperation = 'source-over';
			} catch {
				// Ignore.
			}
			cloudsCtx.clearRect(0, 0, w, h);

			const secondaryPattern = cloudsTexturePatternSecondaryRef.current;
			const secondaryCanvas = cloudsTextureSecondaryCanvasRef.current;
			const secondaryReady =
				Boolean(secondaryPattern) || cloudsTextureSecondaryReadyRef.current;
			const layer2Alpha = useGroups
				? secondaryReady
					? configuredSecondaryAlpha
					: 0
				: secondaryReady
					? Math.max(0.52, configuredSecondaryAlpha)
					: Math.max(0.22, configuredSecondaryAlpha);
			const layer2Pattern = secondaryReady ? secondaryPattern : pattern;
			const layer2Source: CanvasImageSource =
				secondaryReady && secondaryCanvas ? secondaryCanvas : img;

			// Micro turbulence: subtly warp the texture so the cloud shapes feel "alive".
			// Implemented as a gentle X-shear field that changes smoothly over time.
			const stripH = CLOUDS_TURBULENCE_STRIP_PX;
			const stripCount = Math.max(1, Math.ceil(h / stripH));

			const turbulenceUnit = (
				boundaryIndex: number,
				t: number,
				seedA: number,
				seedB: number
			) => {
				const n1 = noise1D(boundaryIndex * 0.91 + t + seedA);
				const n2 = noise1D(boundaryIndex * 1.77 + t * 0.37 + seedB);
				const n = n1 * 0.72 + n2 * 0.28;
				return (n - 0.5) * 2;
			};

			const turbulenceT1 = tMs / CLOUDS_TURBULENCE_LOOP_MS;
			const moodTurbMult = moodCfg.cloudTurbulenceMultiplier * stormWindMult;
			const turbulenceAmp1 =
				CLOUDS_TURBULENCE_AMPLITUDE_X_PX * speedScale * 0.75 * moodTurbMult;
			// Phase + slightly stronger turbulence on the faster layer so it doesn't feel locked
			// to the base drift field.
			const turbulenceT2 = (tMs + 17_000) / CLOUDS_TURBULENCE_LOOP_MS;
			const turbulenceAmp2 =
				CLOUDS_TURBULENCE_AMPLITUDE_X_PX * speedScale * 0.75 * 1.25 * moodTurbMult;
			const stormCorePattern = cloudsTextureStormCorePatternRef.current;
			const stormEdgePattern = cloudsTextureStormEdgePatternRef.current;
			const stormCoreGroupPatterns = cloudsTextureStormCoreGroupPatternsRef.current;
			const stormEdgeGroupPatterns = cloudsTextureStormEdgeGroupPatternsRef.current;

			for (let stripIndex = 0; stripIndex < stripCount; stripIndex++) {
				const yStart = stripIndex * stripH;
				const stripHeight = Math.min(stripH, h - yStart);
				if (stripHeight <= 0) continue;

				cloudsCtx.save();
				cloudsCtx.beginPath();
				cloudsCtx.rect(0, yStart, w, stripHeight);
				cloudsCtx.clip();

				// Base layer
				{
					const dxTop =
						turbulenceUnit(stripIndex, turbulenceT1, 10.7, 97.2) * turbulenceAmp1;
					const dxBottom =
						turbulenceUnit(stripIndex + 1, turbulenceT1, 10.7, 97.2) * turbulenceAmp1;
					const shear = (dxBottom - dxTop) / stripHeight;
					const translateX = dxTop - shear * yStart;

					const fillPatternAt = (
						fillPattern: CanvasPattern,
						x: number,
						y: number,
						alpha: number,
						extraPassCount = 0,
						extraPassOffset = 0,
						passSpread = extraPassSpread
					) => {
						if (alpha <= 0.001) return;
						cloudsCtx.setTransform(1, 0, shear, 1, translateX, 0);
						cloudsCtx.globalAlpha = alpha;
						cloudsCtx.translate(x, y);
						cloudsCtx.fillStyle = fillPattern;
						cloudsCtx.fillRect(-w * 2, -h * 2, w * 5, h * 5);
						drawCloudExtraPasses(
							cloudsCtx,
							w,
							h,
							extraPassCount,
							extraPassOffset,
							extraPassAlpha,
							passSpread
						);
					};

					const basePattern = useHazeSplit ? hazePattern : pattern;
					if (basePattern) {
						// CanvasPattern repeat is much cheaper than multiple drawImage calls and
						// helps keep the animation smooth under load.
						// Mood-driven extra density: re-fill the same pattern with offsets so the
						// same texture covers more of the canvas (no Python re-bake needed).
						fillPatternAt(basePattern, x0, y0, baseLayerAlpha, extraPasses);
					} else {
						// Fill the canvas with wrapped draws (extra copy in X to avoid edge gaps under shear).
						cloudsCtx.setTransform(1, 0, shear, 1, translateX, 0);
						cloudsCtx.globalAlpha = baseLayerAlpha;
						for (let x = x0 - w; x < w + w; x += w) {
							for (let y = y0; y < h; y += h) {
								cloudsCtx.drawImage(img, x, y, w, h);
							}
						}
					}

					if (useHazeSplit && hazePattern && hazeLayerAlpha > 0.001) {
						fillPatternAt(
							hazePattern,
							x0 + w * 0.37,
							y0 - h * 0.22,
							hazeLayerAlpha,
							Math.min(extraPasses, 2),
							3,
							extraPassSpread * 1.18
						);
					}

					const fineVeilPattern = hazePattern ?? secondaryPattern ?? pattern;
					if (fineVeilPattern && fineVeilAlpha > 0.001) {
						fillPatternAt(
							fineVeilPattern,
							x0 - w * 0.19,
							y0 + h * 0.31,
							fineVeilAlpha,
							Math.min(extraPasses * 0.35, 1.65),
							5,
							extraPassSpread * 1.28
						);
					}

					if (!useGroups) {
						if (stormEdgePattern) {
							fillPatternAt(
								stormEdgePattern,
								x0,
								y0,
								stormEdgeOpacity * baseLayerAlpha
							);
						}
						if (stormCorePattern) {
							fillPatternAt(
								stormCorePattern,
								x0,
								y0,
								stormCoreOpacity * baseLayerAlpha
							);
						}
					}

					// Group overlays: independently-drifting subsets of the same texture so
					// different cloud structures move at different speeds.
					if (useGroups && Array.isArray(groupPatterns)) {
						for (let g = 0; g < groupCount; g++) {
							const gp = groupPatterns[g];
							if (!gp) continue;
							const off = groupOffsets[g];
							const xg = -off.x;
							const yg = -off.y;

							// Mood-driven extra density (matches base layer pass count).
							fillPatternAt(gp, xg, yg, groupsLayerAlpha, extraPasses, g);

							const stormEdgeGroupPattern = stormEdgeGroupPatterns?.[g];
							if (stormEdgeGroupPattern) {
								fillPatternAt(
									stormEdgeGroupPattern,
									xg,
									yg,
									stormEdgeOpacity * groupsLayerAlpha
								);
							}

							const stormCoreGroupPattern = stormCoreGroupPatterns?.[g];
							if (stormCoreGroupPattern) {
								fillPatternAt(
									stormCoreGroupPattern,
									xg,
									yg,
									stormCoreOpacity * groupsLayerAlpha
								);
							}
						}
					}
				}

				// Faster secondary layer (subtle)
				if (layer2Alpha > 0.001) {
					const dxTop =
						turbulenceUnit(stripIndex, turbulenceT2, 110.7, 197.2) * turbulenceAmp2;
					const dxBottom =
						turbulenceUnit(stripIndex + 1, turbulenceT2, 110.7, 197.2) * turbulenceAmp2;
					const shear = (dxBottom - dxTop) / stripHeight;
					const translateX = dxTop - shear * yStart;

					cloudsCtx.setTransform(1, 0, shear, 1, translateX, 0);
					cloudsCtx.globalAlpha = layer2Alpha;

					if (layer2Pattern) {
						cloudsCtx.translate(x1, y1);
						cloudsCtx.fillStyle = layer2Pattern;
						cloudsCtx.fillRect(-w * 2, -h * 2, w * 5, h * 5);
					} else {
						for (let x = x1 - w; x < w + w; x += w) {
							for (let y = y1; y < h; y += h) {
								cloudsCtx.drawImage(layer2Source, x, y, w, h);
							}
						}
					}
				}

				cloudsCtx.restore();
			}

			// Polar fade: zero out alpha in the rows that the globe projection
			// would otherwise smear into a distortion ring around each pole.
			// `destination-in` preserves the existing cloud composite exactly,
			// just attenuated where the projection breaks down.
			const polarMask = getCloudsPolarFadeMask(h);
			if (polarMask) {
				try {
					cloudsCtx.setTransform(1, 0, 0, 1, 0, 0);
					cloudsCtx.globalAlpha = 1;
					cloudsCtx.globalCompositeOperation = 'destination-in';
					cloudsCtx.drawImage(polarMask, 0, 0, w, h);
					cloudsCtx.globalCompositeOperation = 'source-over';
				} catch {
					// Ignore.
				}
			}
		};

		const tick = (now: number, img: HTMLImageElement, pattern: CanvasPattern | null) => {
			if (canceled) return;

			const last = cloudsDriftLastFrameMsRef.current;
			if (!last || now - last >= CLOUDS_DRIFT_UPDATE_MS) {
				const dtS = last ? (now - last) / 1000 : 0;
				cloudsDriftLastFrameMsRef.current = now;
				const dtReal = clamp(dtS, 0, 0.25);
				const dt = dtReal * CLOUDS_DRIFT_TIME_SCALE;
				cloudsDriftSimTimeMsRef.current += dt * 1000;
				try {
					draw(img, pattern, cloudsDriftSimTimeMsRef.current, dt);
				} catch {
					// Ignore.
				}
				try {
					drawLightning(now);
				} catch {
					// Ignore.
				}
				try {
					drawSnow(cloudsDriftSimTimeMsRef.current);
				} catch {
					// Ignore.
				}
				// In some Mapbox GL configurations `animate: true` is not enough to force
				// continuous sampling; request repaint after every animated canvas is current.
				try {
					map.triggerRepaint();
				} catch {
					// Ignore.
				}
			}

			cloudsDriftRafRef.current = requestAnimationFrame((t) => tick(t, img, pattern));
		};

		// Cancel any in-flight drift loop before starting.
		if (cloudsDriftRafRef.current != null) {
			cancelAnimationFrame(cloudsDriftRafRef.current);
			cloudsDriftRafRef.current = null;
		}

		loadTexture()
			.then((img) => {
				if (canceled) return;
				const initialNow = performance.now();
				// Preload lightning assets so the first storm flash doesn't hitch.
				loadLightningStamps().catch(() => {
					// Non-fatal.
				});
				loadLightningPotential().catch(() => {
					// Non-fatal.
				});
				loadSnowStamps().catch(() => {
					// Non-fatal.
				});
				cloudsDriftOffsetRef.current = { x: 0, y: 0 };
				// Seed a non-zero initial offset so the secondary layer reads as a distinct
				// cloud system immediately (rather than starting perfectly aligned and only
				// diverging after minutes of drift).
				{
					const w = cloudsCanvas.width || CLOUDS_CANVAS_SIZE_PX;
					const h = cloudsCanvas.height || CLOUDS_CANVAS_SIZE_PX;
					const sx = hash01(901.7);
					const sy = hash01(1902.3);
					cloudsDriftOffsetSecondaryRef.current = { x: sx * w, y: sy * h };
				}
				cloudsDriftSimTimeMsRef.current = 0;
				cloudsDriftLastFrameMsRef.current = initialNow;
				if (!cloudsTexturePatternRef.current) {
					try {
						cloudsTexturePatternRef.current = cloudsCtx.createPattern(img, 'repeat');
					} catch {
						cloudsTexturePatternRef.current = null;
					}
				}
				// Build the secondary (sparser) texture once so the second drift layer is ready
				// for the first painted frame.
				ensureSecondaryCloudsTexture(img);
				ensureStormCloudTextures(img);
				ensureCloudsGroupPatterns(img);
				// Seed group offsets so the independently-drifting structures start de-phased
				// immediately (no initial "locked" look).
				{
					const w = cloudsCanvas.width || CLOUDS_CANVAS_SIZE_PX;
					const h = cloudsCanvas.height || CLOUDS_CANVAS_SIZE_PX;
					const groupOffsets = cloudsDriftGroupOffsetsRef.current;
					for (let g = 0; g < groupOffsets.length; g++) {
						const sx = hash01(5000.7 + g * 91.3);
						const sy = hash01(6000.2 + g * 113.9);
						groupOffsets[g].x = sx * w;
						groupOffsets[g].y = sy * h;
					}
				}
				const pattern = cloudsTexturePatternRef.current;
				draw(img, pattern, 0, 0);
				cloudsDriftRafRef.current = requestAnimationFrame((t) => tick(t, img, pattern));
			})
			.catch(() => {
				// If the texture fails to load, just leave clouds static.
			});

		return () => {
			canceled = true;
			lightningWasEnabledRef.current = false;
			lightningEventsRef.current = [];
			lightningNextFlashAtMsRef.current = 0;
			try {
				cloudsSource.pause?.();
			} catch {
				// Ignore.
			}
			try {
				(
					map.getSource(MAPBOX_SOURCE_IDS.snow) as
						| { pause?: () => void }
						| undefined
				)?.pause?.();
			} catch {
				// Ignore.
			}
			if (cloudsDriftRafRef.current != null) {
				cancelAnimationFrame(cloudsDriftRafRef.current);
				cloudsDriftRafRef.current = null;
			}
		};
	}, [map, isMapLoaded]);

	// Keep the Mapbox "selected" feature-state for US states in sync with `selectedStateKey`.
	const prevSelectedStateKeyOnMapRef = useRef<string | null>(null);
	useEffect(() => {
		if (!map || !isMapLoaded || !isStateLayerReady) return;
		const prev = prevSelectedStateKeyOnMapRef.current;
		if (prev && prev !== selectedStateKey) {
			try {
				map.setFeatureState(
					{ source: MAPBOX_SOURCE_IDS.states, id: prev },
					{ selected: false }
				);
			} catch {
				// Ignore (feature may not be present yet).
			}
		}
		if (selectedStateKey) {
			try {
				map.setFeatureState(
					{ source: MAPBOX_SOURCE_IDS.states, id: selectedStateKey },
					{ selected: true }
				);
			} catch {
				// Ignore (feature may not be present yet).
			}
		}
		prevSelectedStateKeyOnMapRef.current = selectedStateKey;
	}, [map, isMapLoaded, isStateLayerReady, selectedStateKey]);

	const handleResearchPanelMouseEnter = useCallback(() => {
		if (researchPanelTimeoutRef.current) {
			clearTimeout(researchPanelTimeoutRef.current);
			researchPanelTimeoutRef.current = null;
		}
	}, []);

	const handleResearchPanelMouseLeave = useCallback(() => {
		researchPanelTimeoutRef.current = setTimeout(() => {
			setSelectedMarker(null);
		}, 5000);
	}, []);

	const ensureMapboxSourcesAndLayers = useCallback((mapInstance: mapboxgl.Map) => {
		if (!sunTransitionCanvasRef.current && typeof document !== 'undefined') {
			sunTransitionCanvasRef.current = createSunTransitionCanvas();
		}

		// World-land fill (cream continents under the ocean-blue background). Idempotent;
		// safe if style.load already added it earlier.
		ensureWorldLandFill(mapInstance);
		applyNightLandPalette(
			mapInstance,
			computeMoodVisualNightT(nightTRef.current, weatherMoodConfigRef.current)
		);

		const emptyFc: GeoJSON.FeatureCollection = {
			type: 'FeatureCollection',
			features: [],
		};

		const ensureSource = (id: string) => {
			if (mapInstance.getSource(id)) return;
			mapInstance.addSource(id, { type: 'geojson', data: emptyFc });
		};

		// Core sources
		// Clouds: subtle overlay (existing local cloud PNGs), animated via a canvas source so
		// we can drift the texture (Mapbox raster layers do not support translate).
		// Added first so all interactive overlays (states/markers) render above it.
		if (!mapInstance.getSource(MAPBOX_SOURCE_IDS.clouds)) {
			const cloudsCanvas = cloudsCanvasRef.current;
			if (cloudsCanvas) {
				mapInstance.addSource(MAPBOX_SOURCE_IDS.clouds, {
					type: 'canvas',
					canvas: cloudsCanvas,
					animate: true,
					coordinates: CLOUDS_CANVAS_COORDINATES,
				} as any);
				// Start sampling immediately (the drift loop will draw once the texture loads).
				try {
					(mapInstance.getSource(MAPBOX_SOURCE_IDS.clouds) as any)?.play?.();
				} catch {
					// Ignore.
				}
			} else {
				// Fallback: static raster tiles (no drift).
				mapInstance.addSource(MAPBOX_SOURCE_IDS.clouds, {
					type: 'raster',
					tiles: [CLOUDS_TILES_URL_TEMPLATE],
					tileSize: 512,
					maxzoom: CLOUDS_TILES_MAX_ZOOM,
				} as any);
			}
		}

		if (!mapInstance.getSource(MAPBOX_SOURCE_IDS.lightning)) {
			const lightningCanvas = lightningCanvasRef.current;
			if (lightningCanvas) {
				try {
					mapInstance.addSource(MAPBOX_SOURCE_IDS.lightning, {
						type: 'canvas',
						canvas: lightningCanvas,
						animate: true,
						coordinates: LIGHTNING_CANVAS_COORDINATES,
					} as unknown as mapboxgl.AnySourceData);
					(
						mapInstance.getSource(MAPBOX_SOURCE_IDS.lightning) as
							| { play?: () => void }
							| undefined
					)?.play?.();
				} catch {
					// Non-fatal; storm mood simply renders without the dedicated lightning layer.
				}
			}
		}

		if (!mapInstance.getSource(MAPBOX_SOURCE_IDS.snow)) {
			const snowCanvas = snowCanvasRef.current;
			if (snowCanvas) {
				try {
					mapInstance.addSource(MAPBOX_SOURCE_IDS.snow, {
						type: 'canvas',
						canvas: snowCanvas,
						animate: true,
						coordinates: CLOUDS_CANVAS_COORDINATES,
					} as unknown as mapboxgl.AnySourceData);
					(
						mapInstance.getSource(MAPBOX_SOURCE_IDS.snow) as
							| { play?: () => void }
							| undefined
					)?.play?.();
				} catch {
					// Non-fatal; snowy mood simply renders without the particle layer.
				}
			}
		}

		if (!mapInstance.getSource(MAPBOX_SOURCE_IDS.dayFarSideShade)) {
			const shadeCanvas = dayFarSideShadeCanvasRef.current;
			if (shadeCanvas) {
				try {
					mapInstance.addSource(MAPBOX_SOURCE_IDS.dayFarSideShade, {
						type: 'canvas',
						canvas: shadeCanvas,
						// `animate: true` + `play()` matches the clouds source pattern. Even
						// though the shade texture itself is static, this guarantees Mapbox
						// uploads the canvas to a GPU texture (a static `animate: false`
						// canvas source can fail to sample in some Mapbox versions, leaving
						// the layer empty — which makes the whole effect appear "off").
						animate: true,
						coordinates: CLOUDS_CANVAS_COORDINATES,
					} as unknown as mapboxgl.AnySourceData);
					(
						mapInstance.getSource(MAPBOX_SOURCE_IDS.dayFarSideShade) as
							| { play?: () => void }
							| undefined
					)?.play?.();
				} catch {
					// Non-fatal; the background globe simply renders without the extra shade.
				}
			}
		}

		if (!mapInstance.getSource(MAPBOX_SOURCE_IDS.sunTransition)) {
			const sunCanvas = sunTransitionCanvasRef.current;
			if (sunCanvas) {
				try {
					mapInstance.addSource(MAPBOX_SOURCE_IDS.sunTransition, {
						type: 'canvas',
						canvas: sunCanvas,
						animate: true,
						coordinates: CLOUDS_CANVAS_COORDINATES,
					} as unknown as mapboxgl.AnySourceData);
					(
						mapInstance.getSource(MAPBOX_SOURCE_IDS.sunTransition) as
							| { play?: () => void }
							| undefined
					)?.play?.();
				} catch {
					// Non-fatal; sunrise still falls back to the normal day/night fade.
				}
			}
		}

		if (contactLightsTilesEnabled) {
			// Contact lights: dot-only raster tiles derived from contact coords.
			try {
				if (!mapInstance.getSource(MAPBOX_SOURCE_IDS.nightLights)) {
					mapInstance.addSource(MAPBOX_SOURCE_IDS.nightLights, {
						type: 'raster',
						tiles: [CONTACT_LIGHTS_TILES_URL_TEMPLATE],
						tileSize: 512,
						maxzoom: CONTACT_LIGHTS_TILES_MAX_ZOOM,
						bounds: CONTACT_LIGHTS_TILES_BOUNDS,
					} as any);
				}
				if (!mapInstance.getSource(MAPBOX_SOURCE_IDS.nightLightsReveal)) {
					mapInstance.addSource(MAPBOX_SOURCE_IDS.nightLightsReveal, {
						type: 'raster',
						tiles: [CONTACT_LIGHTS_REVEAL_TILES_URL_TEMPLATE],
						tileSize: 512,
						maxzoom: CONTACT_LIGHTS_TILES_MAX_ZOOM,
						bounds: CONTACT_LIGHTS_TILES_BOUNDS,
					} as any);
				}
			} catch {
				// Non-fatal.
			}
		}

		// States source needs `promoteId` so Mapbox uses the string "key" property (e.g. "CA", "TX")
		// as the feature identifier — required for setFeatureState with non-numeric IDs.
		if (!mapInstance.getSource(MAPBOX_SOURCE_IDS.states)) {
			mapInstance.addSource(MAPBOX_SOURCE_IDS.states, {
				type: 'geojson',
				data: emptyFc,
				promoteId: 'key',
			});
		}
			ensureSource(MAPBOX_SOURCE_IDS.resultsOutline);
			ensureSource(MAPBOX_SOURCE_IDS.lockedOutline);
			ensureSource(MAPBOX_SOURCE_IDS.curatedBlob);
			ensureSource(MAPBOX_SOURCE_IDS.markerConstellation);
			ensureSource(MAPBOX_SOURCE_IDS.markerConstellationNodes);
			ensureSource(MAPBOX_SOURCE_IDS.selectedAreaRect);
			ensureSource(MAPBOX_SOURCE_IDS.selectionRect);

		// State label centroids (one point per state — avoids duplicate labels on MultiPolygon states)
		ensureSource(MAPBOX_SOURCE_IDS.stateLabels);

		// Marker sources (all are point FeatureCollections keyed by contact.id)
		ensureSource(MAPBOX_SOURCE_IDS.markersAllOverlay);
		ensureSource(MAPBOX_SOURCE_IDS.markersPromotionPin);
		ensureSource(MAPBOX_SOURCE_IDS.markersBookingPin);
		ensureSource(MAPBOX_SOURCE_IDS.markersPromotionDot);
		ensureSource(MAPBOX_SOURCE_IDS.markersBase);

		const ensureLayer = (layer: any, beforeId?: string) => {
			if (mapInstance.getLayer(layer.id)) {
				if (beforeId && mapInstance.getLayer(beforeId)) {
					try {
						mapInstance.moveLayer(layer.id, beforeId);
					} catch {
						// Ignore; layer order will be corrected on the next style rebuild.
					}
				}
				return;
			}
			if (beforeId && mapInstance.getLayer(beforeId)) {
				mapInstance.addLayer(layer, beforeId);
				return;
			}
			mapInstance.addLayer(layer);
		};

		const cfg = weatherMoodConfigRef.current;
		const cloudsOpacityExpr = buildCloudsOpacityExpr(
			cfg.cloudOpacityGlobeZoom,
			cfg.cloudOpacityDecorativeZoom,
			cfg.cloudDeepZoomOpacity
		);

		if (mapInstance.getSource(MAPBOX_SOURCE_IDS.dayFarSideShade)) {
			ensureLayer({
				id: MAPBOX_LAYER_IDS.dayFarSideShade,
				type: 'raster',
				source: MAPBOX_SOURCE_IDS.dayFarSideShade,
				paint: {
					'raster-opacity': 0,
					'raster-fade-duration': 0,
					'raster-resampling': 'linear',
				},
			});
		}

		if (mapInstance.getSource(MAPBOX_SOURCE_IDS.sunTransition)) {
			ensureLayer({
				id: MAPBOX_LAYER_IDS.sunTransition,
				type: 'raster',
				source: MAPBOX_SOURCE_IDS.sunTransition,
				paint: {
					'raster-opacity': 0,
					'raster-fade-duration': 0,
					'raster-resampling': 'linear',
				},
			});
		}

		if (mapInstance.getSource(MAPBOX_SOURCE_IDS.snow)) {
			ensureLayer(
				{
					id: MAPBOX_LAYER_IDS.snow,
					type: 'raster',
					source: MAPBOX_SOURCE_IDS.snow,
					paint: {
						'raster-opacity': buildSnowOpacityExpr(cfg.snowOpacity),
						'raster-fade-duration': 0,
						'raster-resampling': 'linear',
					},
				},
				MAPBOX_LAYER_IDS.clouds
			);
		}

		// Clouds (baseline globe texture). Added above the dawn band so clouds
		// interrupt the color instead of the sunrise reading as a flat wash.
		// Snow is inserted before this layer so flakes feel suspended below the
		// cloud deck, visible mainly through breaks and feathered cloud edges.
		ensureLayer({
			id: MAPBOX_LAYER_IDS.clouds,
			type: 'raster',
			source: MAPBOX_SOURCE_IDS.clouds,
			// Layer is registered at all zooms; the opacity expression handles
			// fade-out. Most moods drive opacity to 0 by zoom 10.5 (no draw cost),
			// but stormy keeps a small `cloudDeepZoomOpacity` floor so a faint
			// haze persists into city zoom.
			paint: {
				'raster-opacity': cloudsOpacityExpr,
				'raster-brightness-min': cfg.cloudBrightnessMin,
				'raster-brightness-max': cfg.cloudBrightnessMax,
				'raster-contrast': 0.36,
				'raster-saturation': 0,
				'raster-resampling': 'linear',
			},
		});

		if (mapInstance.getSource(MAPBOX_SOURCE_IDS.lightning)) {
			ensureLayer({
				id: MAPBOX_LAYER_IDS.lightning,
				type: 'raster',
				source: MAPBOX_SOURCE_IDS.lightning,
				paint: {
					'raster-opacity': buildLightningOpacityExpr(
						cfg.lightningIntensity * LIGHTNING_LAYER_OPACITY
					),
					'raster-fade-duration': 0,
					'raster-resampling': 'linear',
				},
			});
		}

		if (mapInstance.getSource(MAPBOX_SOURCE_IDS.sunTransition)) {
			ensureLayer({
				id: MAPBOX_LAYER_IDS.sunTransitionCloudCatchlight,
				type: 'raster',
				source: MAPBOX_SOURCE_IDS.sunTransition,
				paint: {
					'raster-opacity': 0,
					'raster-fade-duration': 0,
					'raster-resampling': 'linear',
				},
			});
		}

		// Contact lights (dot tiles). Default opacity is 0; we drive visibility from
		// applyLightingOverlayOpacity based on zoom + `nightT`.
		//
		// Note: this sits above clouds so it reads at globe zoom (clouds can wash out
		// tiny dots when fully zoomed out). We render a subtle low-zoom glow pass under
		// a crisp dot pass so it reads as "sparkling", not blurred.
		try {
			if (mapInstance.getSource(MAPBOX_SOURCE_IDS.nightLights)) {
				ensureLayer({
					id: MAPBOX_LAYER_IDS.nightLightsSpaceGlow,
					type: 'raster',
					source: MAPBOX_SOURCE_IDS.nightLights,
					// Only relevant for the "from space" view.
					maxzoom: NIGHT_LIGHTS_SPACE_GLOW_FADE_END_ZOOM + 0.01,
					paint: {
						'raster-opacity': 0,
						// Avoid Mapbox's per-tile crossfade (it can look like a "hair texture"
						// while zooming). We do our own deliberate fade via raster-opacity.
						'raster-fade-duration': 0,
						// Slight bloom: linear resampling.
						'raster-resampling': 'linear',
					},
				} as any);
				// Second space-only pass: pushes visibility when fully zoomed out without touching tiles.
				ensureLayer({
					id: MAPBOX_LAYER_IDS.nightLightsSpaceGlow2,
					type: 'raster',
					source: MAPBOX_SOURCE_IDS.nightLights,
					maxzoom: NIGHT_LIGHTS_SPACE_GLOW_FADE_END_ZOOM + 0.01,
					paint: {
						'raster-opacity': 0,
						'raster-fade-duration': 0,
						'raster-resampling': 'linear',
					},
				} as any);
				// Intro reveal layers (alpha-biased tiles). These are crossfaded away once the
				// real tiles are fully visible.
				if (mapInstance.getSource(MAPBOX_SOURCE_IDS.nightLightsReveal)) {
					ensureLayer({
						id: MAPBOX_LAYER_IDS.nightLightsRevealGlow,
						type: 'raster',
						source: MAPBOX_SOURCE_IDS.nightLightsReveal,
						maxzoom: NIGHT_LIGHTS_FADE_END_ZOOM + 0.01,
						paint: {
							'raster-opacity': 0,
							'raster-fade-duration': 0,
							'raster-resampling': 'linear',
						},
					} as any);
					ensureLayer({
						id: MAPBOX_LAYER_IDS.nightLightsReveal,
						type: 'raster',
						source: MAPBOX_SOURCE_IDS.nightLightsReveal,
						maxzoom: NIGHT_LIGHTS_FADE_END_ZOOM + 0.01,
						paint: {
							'raster-opacity': 0,
							'raster-fade-duration': 0,
							'raster-resampling': 'nearest',
						},
					} as any);
				}
				ensureLayer({
					id: MAPBOX_LAYER_IDS.nightLightsGlow,
					type: 'raster',
					source: MAPBOX_SOURCE_IDS.nightLights,
					maxzoom: NIGHT_LIGHTS_FADE_END_ZOOM + 0.01,
					paint: {
						'raster-opacity': 0,
						// Avoid Mapbox's per-tile crossfade (it can look like a "hair texture"
						// while zooming). We do our own deliberate fade via raster-opacity.
						'raster-fade-duration': 0,
						// Linear resampling = tiny bloom at far zoom.
						'raster-resampling': 'linear',
					},
				} as any);
				ensureLayer({
					id: MAPBOX_LAYER_IDS.nightLightsCloseGlow,
					type: 'raster',
					source: MAPBOX_SOURCE_IDS.nightLights,
					maxzoom: NIGHT_LIGHTS_FADE_END_ZOOM + 0.01,
					paint: {
						'raster-opacity': 0,
						'raster-fade-duration': 0,
						// Linear resampling so dots read as a soft local glow at mid zoom.
						'raster-resampling': 'linear',
					},
				} as any);
				ensureLayer({
					id: MAPBOX_LAYER_IDS.nightLights,
					type: 'raster',
					source: MAPBOX_SOURCE_IDS.nightLights,
					maxzoom: NIGHT_LIGHTS_FADE_END_ZOOM + 0.01,
					paint: {
						'raster-opacity': 0,
						'raster-fade-duration': 0,
						// Keep it dotty: nearest resampling avoids a low-zoom blur smear.
						'raster-resampling': 'nearest',
					},
				} as any);
			}
		} catch {
			// Non-fatal.
		}

		const resultDotRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			RESULT_DOT_SCALE_MIN,
			RESULT_DOT_ZOOM_MIN,
			RESULT_DOT_SCALE_MIN,
			RESULT_DOT_ZOOM_MAX,
			RESULT_DOT_SCALE_MAX,
			24,
			RESULT_DOT_SCALE_MAX,
		];
		const isSelectedFeatureStateExpr = ['boolean', ['feature-state', 'selected'], false];
		const resultDotGlowRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			RESULT_DOT_GLOW_RADIUS_MIN_PX,
			RESULT_DOT_ZOOM_MIN,
			RESULT_DOT_GLOW_RADIUS_MIN_PX,
			RESULT_DOT_ZOOM_MAX,
			RESULT_DOT_GLOW_RADIUS_MAX_PX,
			24,
			RESULT_DOT_GLOW_RADIUS_MAX_PX,
		];
		const resultDotStrokeColorExpr = [
			'case',
			['boolean', ['feature-state', 'selected'], false],
			RESULT_DOT_STROKE_COLOR_SELECTED,
			RESULT_DOT_TRANSPARENT_STROKE_COLOR,
		];
		const resultDotSelectedStrokeExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			['case', isSelectedFeatureStateExpr, RESULT_DOT_STROKE_WEIGHT_MIN_PX, 0],
			RESULT_DOT_ZOOM_MIN,
			['case', isSelectedFeatureStateExpr, RESULT_DOT_STROKE_WEIGHT_MIN_PX, 0],
			RESULT_DOT_ZOOM_MAX,
			['case', isSelectedFeatureStateExpr, RESULT_DOT_STROKE_WEIGHT_MAX_PX, 0],
			24,
			['case', isSelectedFeatureStateExpr, RESULT_DOT_STROKE_WEIGHT_MAX_PX, 0],
		];

		const allOverlayRadiusLow = RESULT_DOT_SCALE_MIN * 0.72;
		const allOverlayRadiusHigh = RESULT_DOT_SCALE_MAX * 0.72;
		const allOverlayRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			allOverlayRadiusLow,
			RESULT_DOT_ZOOM_MIN,
			allOverlayRadiusLow,
			RESULT_DOT_ZOOM_MAX,
			allOverlayRadiusHigh,
			24,
			allOverlayRadiusHigh,
		];

		const allOverlayStrokeLow = Math.max(1, RESULT_DOT_STROKE_WEIGHT_MIN_PX * 0.85);
		const allOverlayStrokeHigh = Math.max(1, RESULT_DOT_STROKE_WEIGHT_MAX_PX * 0.85);
			const allOverlayGlowRadiusExpr = [
				'interpolate',
				['linear'],
				['zoom'],
			0,
			RESULT_DOT_GLOW_RADIUS_MIN_PX * 0.82,
			RESULT_DOT_ZOOM_MIN,
			RESULT_DOT_GLOW_RADIUS_MIN_PX * 0.82,
			RESULT_DOT_ZOOM_MAX,
			RESULT_DOT_GLOW_RADIUS_MAX_PX * 0.82,
				24,
				RESULT_DOT_GLOW_RADIUS_MAX_PX * 0.82,
			];
			const constellationNodeRadiusExpr = [
				'interpolate',
				['linear'],
				['zoom'],
				3,
				2.1,
				7,
				2.9,
				13,
				4.1,
			];
			const constellationNodeGlowRadiusExpr = [
				'interpolate',
				['linear'],
				['zoom'],
				3,
				6,
				7,
				8,
				13,
				11,
			];
			const allOverlaySelectedStrokeExpr = [
				'interpolate',
				['linear'],
			['zoom'],
			0,
			['case', isSelectedFeatureStateExpr, allOverlayStrokeLow, 0],
			RESULT_DOT_ZOOM_MIN,
			['case', isSelectedFeatureStateExpr, allOverlayStrokeLow, 0],
			RESULT_DOT_ZOOM_MAX,
			['case', isSelectedFeatureStateExpr, allOverlayStrokeHigh, 0],
			24,
			['case', isSelectedFeatureStateExpr, allOverlayStrokeHigh, 0],
		];

		const pinRadiusLow =
			Math.max(MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX, 2 * RESULT_DOT_SCALE_MIN) / 2;
		const pinRadiusHigh =
			Math.max(MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX, 2 * RESULT_DOT_SCALE_MAX) / 2;
		const pinRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			pinRadiusLow,
			RESULT_DOT_ZOOM_MIN,
			pinRadiusLow,
			RESULT_DOT_ZOOM_MAX,
			pinRadiusHigh,
			24,
			pinRadiusHigh,
		];

		const pinIconSizeLow =
			Math.max(MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX, 2 * RESULT_DOT_SCALE_MIN) /
			MAP_MARKER_PIN_CIRCLE_DIAMETER;
		const pinIconSizeHigh =
			Math.max(MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX, 2 * RESULT_DOT_SCALE_MAX) /
			MAP_MARKER_PIN_CIRCLE_DIAMETER;
		const pinIconSizeExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			pinIconSizeLow,
			RESULT_DOT_ZOOM_MIN,
			pinIconSizeLow,
			RESULT_DOT_ZOOM_MAX,
			pinIconSizeHigh,
			24,
			pinIconSizeHigh,
		];

		// States: hover fill + hit fill (transparent) + divider lines + interactive borders
		const isStateSelectedExpr = ['boolean', ['feature-state', 'selected'], false];

		const stateDividerLineWidthExpr = buildStateDividerLineWidthExpr();
		const stateDividerLineOpacityExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			MAP_MIN_ZOOM,
			0,
			MAP_MIN_ZOOM + 1.25,
			0.5,
			5,
			0.65,
			STATE_DIVIDER_LINES_MAX_ZOOM,
			0.74,
		];
		const stateInteractiveBorderWidthExpr = buildStateInteractiveBorderWidthExpr();
		const stateInteractiveBorderOpacityExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			MAP_MIN_ZOOM,
			['case', isStateSelectedExpr, 0, 0],
			MAP_MIN_ZOOM + 1.25,
			['case', isStateSelectedExpr, 1, 0.6],
			5,
			['case', isStateSelectedExpr, 1, 0.75],
			9,
			['case', isStateSelectedExpr, 1, 0.82],
			14,
			['case', isStateSelectedExpr, 1, 0.7],
		];
		const stateInteractiveBorderColorExpr = buildStateInteractiveBorderColorExpr(
			computeMoodVisualNightT(nightTRef.current, weatherMoodConfigRef.current)
		);

		ensureLayer({
			id: MAPBOX_LAYER_IDS.statesFillHover,
			type: 'fill',
			source: MAPBOX_SOURCE_IDS.states,
			paint: {
				'fill-color': STATE_HIGHLIGHT_COLOR,
				'fill-opacity': [
					'case',
					['boolean', ['feature-state', 'hover'], false],
					STATE_HIGHLIGHT_OPACITY,
					0,
				],
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.statesFillHit,
			type: 'fill',
			source: MAPBOX_SOURCE_IDS.states,
			paint: {
				'fill-color': '#000000',
				// Tiny non-zero opacity ensures queryRenderedFeatures reliably returns features
				// across all browsers/GPU drivers (some skip truly invisible geometry).
				'fill-opacity': 0.01,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.statesDividers,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.states,
			maxzoom: STATE_DIVIDER_LINES_MAX_ZOOM + 0.01,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': STATE_DIVIDER_COLOR,
				'line-opacity': stateDividerLineOpacityExpr,
				'line-width': stateDividerLineWidthExpr,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.statesBordersInteractive,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.states,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': stateInteractiveBorderColorExpr,
				'line-opacity': stateInteractiveBorderOpacityExpr,
				'line-width': stateInteractiveBorderWidthExpr,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.statesLabels,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.stateLabels,
			minzoom: MAP_MIN_ZOOM,
			layout: {
				// Abbreviations when zoomed out, full names when zoomed in.
				'text-field': ['step', ['zoom'], ['get', 'key'], 8.5, ['get', 'name']],
				'text-size': ['interpolate', ['linear'], ['zoom'], 3, 9, 5, 10, 7, 12, 10, 14],
				'text-font': ['Inter Medium', 'Arial Unicode MS Regular'],
				'text-allow-overlap': false,
				'text-ignore-placement': false,
				'text-padding': 2,
			},
			paint: {
				'text-color': STATE_LABEL_COLOR,
				// Keep labels flat (no glow) to match `/free-trial`.
				'text-halo-color': 'rgba(0, 0, 0, 0)',
				'text-halo-width': 0,
			},
		});
		applyStateOverlayNightColors(
			mapInstance,
			computeMoodVisualNightT(nightTRef.current, weatherMoodConfigRef.current)
		);

			// Search-results outlines (blue + black) intentionally removed.

			// Curated-search blob body — unioned regional circle-lobes, behind all dot/pin layers.
			ensureLayer(
			{
				id: MAPBOX_LAYER_IDS.curatedBlobFill,
				type: 'fill',
				source: MAPBOX_SOURCE_IDS.curatedBlob,
				paint: {
					'fill-color': '#EFE8D8',
					'fill-opacity': [
						'interpolate',
						['linear'],
						['zoom'],
						3.4,
						0.22,
						5,
						0.44,
						10,
						0.38,
					],
					'fill-antialias': true,
				},
			},
			MAPBOX_LAYER_IDS.statesLabels
		);

		// Curated-search blob outline — plain white, behind all dot/pin layers.
		ensureLayer({
			id: MAPBOX_LAYER_IDS.curatedBlobCore,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.curatedBlob,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': '#FFFFFF',
				// The same outline geometry now morphs from natural blob → circle
				// across the transition zoom range, so opacity stays constant: at
				// t=1 the blob *is* the circle, and at any intermediate t it's a
				// continuously-deforming shape — fading it out would defeat the
				// "shape transforms" effect the user wants to see.
				'line-opacity': 0.86,
				// Width tapers down well before the transition window so the
				// outline already reads as a delicate thin ring by the time the
				// shape morph starts — and stays that way through the rest of
				// the zoom-out. Mapbox clamps outside the stops, so above zoom
				// 5 the line is at full 5px (normal cluster view) and below
				// 3.4 it holds at 0.75px.
				'line-width': [
					'interpolate',
					['linear'],
					['zoom'],
					3.4,
					0.75,
					5,
					5,
					],
					'line-blur': 0,
				},
			});

			// Locked searched-state border. This is Mapbox-owned, so contact marker
			// layers render above it when they overlap the selected state's edge.
			ensureLayer(
				{
					id: MAPBOX_LAYER_IDS.lockedOutline,
					type: 'line',
					source: MAPBOX_SOURCE_IDS.lockedOutline,
					layout: { 'line-join': 'round', 'line-cap': 'round' },
					paint: {
						'line-color': '#FFFFFF',
						'line-opacity': 0.98,
						'line-width': buildLockedStateOutlineWidthExpr(),
						'line-blur': 0,
					},
				},
				MAPBOX_LAYER_IDS.markerConstellationGlow
			);

			// Frozen per-search constellation linework — understated background geometry
			// that sits behind the marker dots and never participates in hit testing.
			ensureLayer({
			id: MAPBOX_LAYER_IDS.markerConstellationGlow,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.markerConstellation,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': MARKER_CONSTELLATION_HALO_COLOR,
				'line-opacity': 0,
				'line-width': [
					'interpolate',
					['linear'],
					['zoom'],
					3,
					3.4,
					7,
					5.4,
					13,
					7.2,
				],
				'line-blur': 1.8,
			},
		});
			ensureLayer({
				id: MAPBOX_LAYER_IDS.markerConstellationCore,
				type: 'line',
				source: MAPBOX_SOURCE_IDS.markerConstellation,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': MARKER_CONSTELLATION_LINE_COLOR,
				'line-opacity': 0,
				'line-width': [
					'interpolate',
					['linear'],
					['zoom'],
					3,
					1.25,
					7,
					1.85,
					13,
					2.55,
				],
					'line-blur': 0,
				},
			});
			ensureLayer({
				id: MAPBOX_LAYER_IDS.markerConstellationNodeGlow,
				type: 'circle',
				source: MAPBOX_SOURCE_IDS.markerConstellationNodes,
				paint: {
					'circle-radius': constellationNodeGlowRadiusExpr,
					'circle-color': MARKER_CONSTELLATION_HALO_COLOR,
					'circle-opacity': getMarkerConstellationNodeZoomFadedOpacity(
						MARKER_CONSTELLATION_NODE_GLOW_OPACITY
					),
					'circle-blur': 0.72,
					'circle-stroke-width': 0,
				},
			});
			ensureLayer({
				id: MAPBOX_LAYER_IDS.markerConstellationNodeDots,
				type: 'circle',
				source: MAPBOX_SOURCE_IDS.markerConstellationNodes,
				paint: {
					'circle-radius': constellationNodeRadiusExpr,
					'circle-color': ['get', 'fillColor'],
					'circle-opacity': getMarkerConstellationNodeZoomFadedOpacity(
						MARKER_CONSTELLATION_NODE_OPACITY
					),
					'circle-stroke-color': MARKER_CONSTELLATION_HALO_COLOR,
					'circle-stroke-opacity': getMarkerConstellationNodeZoomFadedOpacity(0.74),
					'circle-stroke-width': [
						'interpolate',
						['linear'],
						['zoom'],
						3,
						0.45,
						7,
						0.65,
						13,
						0.9,
					],
				},
			});

			// All-contacts overlay (gray dots) — lowest marker priority
			ensureLayer({
			id: MAPBOX_LAYER_IDS.markersAllHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersAllOverlay,
			paint: {
				'circle-radius': allOverlayRadiusExpr,
				'circle-opacity': 0,
				'circle-stroke-width': 0,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.markersAllGlow,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersAllOverlay,
			paint: {
					'circle-radius': allOverlayGlowRadiusExpr,
					'circle-color': RESULT_DOT_GLOW_COLOR,
					'circle-opacity': getSelectedStateOrbZoomFadedOpacity(
						ALL_CONTACTS_DOT_GLOW_OPACITY
					),
					'circle-blur': RESULT_DOT_GLOW_BLUR,
					'circle-stroke-width': 0,
				},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.markersAllDots,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersAllOverlay,
			paint: {
					'circle-radius': allOverlayRadiusExpr,
					'circle-color': ['get', 'fillColor'],
					'circle-opacity': getSelectedStateOrbZoomFadedOpacity(1),
					'circle-stroke-color': resultDotStrokeColorExpr,
					'circle-stroke-width': allOverlaySelectedStrokeExpr,
				},
		});

		// Promotion overlay pins (outside locked state / no locked state) — behind primary dots
		// The circle layer doubles as hit area AND visual ring for selection (feature-state in paint is allowed).
		ensureLayer({
			id: MAPBOX_LAYER_IDS.promotionPinHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersPromotionPin,
			paint: {
				'circle-radius': pinRadiusExpr,
				'circle-opacity': 0,
				'circle-stroke-width': [
					'case',
					['boolean', ['feature-state', 'selected'], false],
					2.5,
					0,
				],
				'circle-stroke-color': [
					'case',
					['boolean', ['feature-state', 'selected'], false],
					RESULT_DOT_STROKE_COLOR_SELECTED,
					'transparent',
				],
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.promotionPinIcons,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersPromotionPin,
			layout: {
				'icon-image': ['get', 'iconDefault'],
				'icon-size': pinIconSizeExpr,
				'icon-anchor': 'top-left',
					'icon-offset': [-MAP_MARKER_PIN_CIRCLE_CENTER_X, -MAP_MARKER_PIN_CIRCLE_CENTER_Y],
					'icon-allow-overlap': true,
					'icon-ignore-placement': true,
				},
				paint: {
					'icon-opacity': getSelectedStateOrbZoomFadedOpacity(1),
				},
			});

		// Booking extra pins — behind primary dots
		// The circle layer doubles as hit area AND visual ring for selection.
		ensureLayer({
			id: MAPBOX_LAYER_IDS.bookingPinHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersBookingPin,
			paint: {
				'circle-radius': pinRadiusExpr,
				'circle-opacity': 0,
				'circle-stroke-width': [
					'case',
					['boolean', ['feature-state', 'selected'], false],
					2.5,
					0,
				],
				'circle-stroke-color': [
					'case',
					['boolean', ['feature-state', 'selected'], false],
					RESULT_DOT_STROKE_COLOR_SELECTED,
					'transparent',
				],
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.bookingPinIcons,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersBookingPin,
			layout: {
				'icon-image': ['get', 'iconDefault'],
				'icon-size': pinIconSizeExpr,
				'icon-anchor': 'top-left',
					'icon-offset': [-MAP_MARKER_PIN_CIRCLE_CENTER_X, -MAP_MARKER_PIN_CIRCLE_CENTER_Y],
					'icon-allow-overlap': true,
					'icon-ignore-placement': true,
				},
				paint: {
					'icon-opacity': getSelectedStateOrbZoomFadedOpacity(1),
				},
			});

		ensureLayer({
			id: MAPBOX_LAYER_IDS.bookingPinIconsHover,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersBookingPin,
			filter: ['==', ['get', 'category'], ''],
			layout: {
				'icon-image': ['get', 'iconHover'],
				'icon-size': pinIconSizeExpr,
				'icon-anchor': 'top-left',
					'icon-offset': [-MAP_MARKER_PIN_CIRCLE_CENTER_X, -MAP_MARKER_PIN_CIRCLE_CENTER_Y],
					'icon-allow-overlap': true,
					'icon-ignore-placement': true,
				},
				paint: {
					'icon-opacity': getSelectedStateOrbZoomFadedOpacity(1),
				},
			});

		// Promotion overlay dots (inside locked state) — below primary dots
		ensureLayer({
			id: MAPBOX_LAYER_IDS.promotionDotHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersPromotionDot,
			paint: {
				'circle-radius': resultDotRadiusExpr,
				'circle-opacity': 0,
				'circle-stroke-width': 0,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.promotionDotGlow,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersPromotionDot,
			paint: {
					'circle-radius': resultDotGlowRadiusExpr,
					'circle-color': RESULT_DOT_GLOW_COLOR,
					'circle-opacity': getSelectedStateOrbZoomFadedOpacity(
						RESULT_DOT_GLOW_OPACITY
					),
					'circle-blur': RESULT_DOT_GLOW_BLUR,
					'circle-stroke-width': 0,
				},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.promotionDotDots,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersPromotionDot,
			paint: {
					'circle-radius': resultDotRadiusExpr,
					'circle-color': ['get', 'fillColor'],
					'circle-opacity': getSelectedStateOrbZoomFadedOpacity(1),
					'circle-stroke-color': resultDotStrokeColorExpr,
					'circle-stroke-width': resultDotSelectedStrokeExpr,
				},
		});

		// Primary result dots — top marker priority
		ensureLayer({
			id: MAPBOX_LAYER_IDS.baseHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersBase,
			paint: {
				'circle-radius': resultDotRadiusExpr,
				'circle-opacity': 0,
				'circle-stroke-width': 0,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.baseGlow,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersBase,
			paint: {
				'circle-radius': resultDotGlowRadiusExpr,
				'circle-color': RESULT_DOT_GLOW_COLOR,
				'circle-opacity': CATEGORIZED_DOT_GLOW_ZOOM_FADE_EXPR,
				'circle-blur': RESULT_DOT_GLOW_BLUR,
				'circle-stroke-width': 0,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.baseDots,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersBase,
			paint: {
				'circle-radius': resultDotRadiusExpr,
				'circle-color': ['get', 'fillColor'],
				'circle-opacity': CATEGORIZED_DOT_ZOOM_FADE_EXPR,
				'circle-stroke-color': resultDotStrokeColorExpr,
				'circle-stroke-width': resultDotSelectedStrokeExpr,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.baseFallbackIcons,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersBase,
			filter: ['==', ['get', 'isUncategorized'], true],
			layout: {
				'icon-image': ['get', 'fallbackIcon'],
				'icon-size': pinIconSizeExpr,
				'icon-anchor': 'top-left',
				'icon-offset': [-MAP_MARKER_PIN_CIRCLE_CENTER_X, -MAP_MARKER_PIN_CIRCLE_CENTER_Y],
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
			},
			paint: {
				'icon-opacity': CURATED_DOT_ZOOM_FADE_EXPR,
			},
		});

		// Persisted selected area (black outline) — above markers
		ensureLayer({
			id: MAPBOX_LAYER_IDS.selectedAreaRect,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.selectedAreaRect,
			paint: { 'line-color': '#000000', 'line-opacity': 1, 'line-width': 3 },
		});

		// In-progress selection rectangle — above everything
		ensureLayer({
			id: MAPBOX_LAYER_IDS.selectionRectFill,
			type: 'fill',
			source: MAPBOX_SOURCE_IDS.selectionRect,
			paint: { 'fill-color': '#143883', 'fill-opacity': 0.08 },
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.selectionRectLine,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.selectionRect,
			paint: { 'line-color': '#143883', 'line-opacity': 1, 'line-width': 2 },
		});
	}, []);

	useEffect(() => {
		if (!mapContainerRef.current) return;
		if (mapRef.current) return;

		// Ensure the clouds canvas exists before the style loads so the Mapbox source can
		// bind to a stable canvas element (and begin animating immediately).
		try {
			if (!dayFarSideShadeCanvasRef.current && typeof document !== 'undefined') {
				dayFarSideShadeCanvasRef.current = createDayFarSideShadeCanvas();
			}

			if (!sunTransitionCanvasRef.current && typeof document !== 'undefined') {
				sunTransitionCanvasRef.current = createSunTransitionCanvas();
			}

			if (!cloudsCanvasRef.current && typeof document !== 'undefined') {
				const canvas = document.createElement('canvas');
				canvas.width = CLOUDS_CANVAS_SIZE_PX;
				canvas.height = CLOUDS_CANVAS_SIZE_PX;
				const ctx = canvas.getContext('2d');
				if (ctx) {
					try {
						ctx.imageSmoothingEnabled = true;
						ctx.imageSmoothingQuality = 'high';
					} catch {
						// Ignore.
					}
					cloudsCanvasRef.current = canvas;
					cloudsCanvasCtxRef.current = ctx;
				}
			}

			if (!lightningCanvasRef.current && typeof document !== 'undefined') {
				const canvas = document.createElement('canvas');
				canvas.width = LIGHTNING_CANVAS_WIDTH_PX;
				canvas.height = LIGHTNING_CANVAS_HEIGHT_PX;
				const ctx = canvas.getContext('2d');
				if (ctx) {
					try {
						ctx.imageSmoothingEnabled = true;
						ctx.imageSmoothingQuality = 'high';
					} catch {
						// Ignore.
					}
					lightningCanvasRef.current = canvas;
					lightningCanvasCtxRef.current = ctx;
				}
			}

			if (!snowCanvasRef.current && typeof document !== 'undefined') {
				const canvas = document.createElement('canvas');
				canvas.width = SNOW_CANVAS_SIZE_PX;
				canvas.height = SNOW_CANVAS_SIZE_PX;
				const ctx = canvas.getContext('2d');
				if (ctx) {
					try {
						ctx.imageSmoothingEnabled = false;
					} catch {
						// Ignore.
					}
					snowCanvasRef.current = canvas;
					snowCanvasCtxRef.current = ctx;
				}
			}
		} catch {
			// Non-fatal; we'll fall back to static raster tiles.
		}

		const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
		if (!accessToken) {
			setMapLoadError('Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN');
			return;
		}

		mapboxgl.accessToken = accessToken;

		const initialPresentation = presentationRef.current;
		const initialCenter: [number, number] =
			initialPresentation === 'background'
				? DASHBOARD_DECORATIVE_CENTER
				: [defaultCenter.lng, defaultCenter.lat];
		const initialZoom =
			initialPresentation === 'background' ? DASHBOARD_DECORATIVE_ZOOM : MAP_DEFAULT_ZOOM;
		const initialPitch =
			initialPresentation === 'background' ? DASHBOARD_DECORATIVE_PITCH : 0;

		const mapInstance = new mapboxgl.Map({
			container: mapContainerRef.current,
			style: MAPBOX_STYLE,
			center: initialCenter,
			zoom: initialZoom,
			pitch: initialPitch,
			bearing: 0,
			minZoom: MAP_MIN_ZOOM,
			attributionControl: true,
			...(contactLightsDebugEnabled ? { showTileBoundaries: true } : {}),
		});

		mapRef.current = mapInstance;
		setMap(mapInstance);
		try {
			initialZoomConstraintsRef.current = {
				minZoom: mapInstance.getMinZoom(),
				maxZoom: mapInstance.getMaxZoom(),
			};
		} catch {
			// Non-fatal.
		}

		const onStyleLoad = () => {
			applyFreeTrialMapVisualTuning(mapInstance);
			const initialVisualNightT = computeMoodVisualNightT(
				nightTRef.current,
				weatherMoodConfigRef.current
			);
			applyMurmurGlobeLighting(mapInstance);
			applyMapboxFogForMoodAndNight(
				mapInstance,
				weatherMoodConfigRef.current,
				initialVisualNightT
			);
			// Add Murmur sources/layers (including clouds + world-land fill) as early as
			// possible so they can begin loading before the first reveal.
			ensureMapboxSourcesAndLayers(mapInstance);
		};

		const onLoad = () => {
			applyFreeTrialMapVisualTuning(mapInstance);
			const initialVisualNightT = computeMoodVisualNightT(
				nightTRef.current,
				weatherMoodConfigRef.current
			);
			applyMurmurGlobeLighting(mapInstance);
			applyMapboxFogForMoodAndNight(
				mapInstance,
				weatherMoodConfigRef.current,
				initialVisualNightT
			);
			ensureMapboxSourcesAndLayers(mapInstance);

			// Ensure the decorative dashboard framing (offset) is applied before we
			// drop the loading mask, so the globe doesn't "jump" into position.
			if (presentationRef.current === 'background') {
				try {
					// `jumpTo` typings don't accept `offset` in our Mapbox version; use 0ms `easeTo`.
					mapInstance.easeTo({
						center: DASHBOARD_DECORATIVE_CENTER,
						zoom: DASHBOARD_DECORATIVE_ZOOM,
						pitch: DASHBOARD_DECORATIVE_PITCH,
						bearing: 0,
						offset: DASHBOARD_DECORATIVE_OFFSET_PX,
						duration: 0,
					});
				} catch {
					// Ignore.
				}
			}

			setIsMapLoaded(true);
			setZoomLevel(mapInstance.getZoom() ?? MAP_DEFAULT_ZOOM);
			setMapLoadError(null);

			let capturedStateLineOpacityBase = false;
			try {
				if (!stateLineOpacityBaseRef.current) {
					const dividers = mapInstance.getPaintProperty(
						MAPBOX_LAYER_IDS.statesDividers,
						'line-opacity'
					) as any;
					const borders = mapInstance.getPaintProperty(
						MAPBOX_LAYER_IDS.statesBordersInteractive,
						'line-opacity'
					) as any;
					if (dividers != null && borders != null) {
						stateLineOpacityBaseRef.current = { dividers, borders };
						capturedStateLineOpacityBase = true;
					}
				} else {
					capturedStateLineOpacityBase = true;
				}
			} catch {
				// Ignore.
			}
			try {
				// Only force-hide on load when we have a recoverable base expression.
				// Otherwise leave defaults in place so overlays do not get stuck invisible.
				if (
					capturedStateLineOpacityBase &&
					mapInstance.getLayer(MAPBOX_LAYER_IDS.statesDividers)
				) {
					mapInstance.setPaintProperty(
						MAPBOX_LAYER_IDS.statesDividers,
						'line-opacity',
						0
					);
				}
				if (
					capturedStateLineOpacityBase &&
					mapInstance.getLayer(MAPBOX_LAYER_IDS.statesBordersInteractive)
				) {
					mapInstance.setPaintProperty(
						MAPBOX_LAYER_IDS.statesBordersInteractive,
						'line-opacity',
						0
					);
				}
				if (
					capturedStateLineOpacityBase &&
					mapInstance.getLayer(MAPBOX_LAYER_IDS.statesLabels)
				) {
					mapInstance.setPaintProperty(MAPBOX_LAYER_IDS.statesLabels, 'text-opacity', 0);
				}
			} catch {
				// Ignore.
			}
		};

		const onError = (e: any) => {
			const message =
				typeof e?.error?.message === 'string'
					? e.error.message
					: typeof e?.error === 'string'
						? e.error
						: 'Error loading map';

			// Suppress transient style-validation warnings that are non-fatal and otherwise show
			// up as a brief fullscreen overlay during initial load.
			if (
				typeof message === 'string' &&
				/(^|\b)(shadow-)?intensity:\s*\d+(?:\.\d+)?\s+is greater than the maximum value 1\b/i.test(
					message
				)
			) {
				return;
			}

			setMapLoadError(message);
		};

		// Keep the softbox anchored to the viewer as the camera bearing changes.
		// `rotate` fires continuously during interaction; the call is cheap (no
		// layer reshuffling) because setLights only updates the existing light defs.
		const onRotate = () => {
			applyMurmurGlobeLighting(mapInstance);
		};

		mapInstance.on('load', onLoad);
		mapInstance.on('style.load', onStyleLoad);
		mapInstance.on('error', onError);
		mapInstance.on('rotate', onRotate);

		// Mapbox can occasionally load a cached style before event handlers are attached.
		// Run the handler once if the style is already ready so the dashboard never misses
		// clouds/shading on the first paint.
		try {
			if (typeof (mapInstance as any).isStyleLoaded === 'function') {
				if ((mapInstance as any).isStyleLoaded()) onStyleLoad();
			}
		} catch {
			// Ignore.
		}

		return () => {
			mapInstance.off('load', onLoad);
			mapInstance.off('style.load', onStyleLoad);
			mapInstance.off('error', onError);
			mapInstance.off('rotate', onRotate);
			backgroundSpinCleanupRef.current?.();
			backgroundSpinCleanupRef.current = null;
			mapInstance.remove();
			mapRef.current = null;
			setMap(null);
			setIsMapLoaded(false);
		};
	}, [ensureMapboxSourcesAndLayers, contactLightsDebugEnabled]);

	// Debug: detect missing tiles / error events for the contact-lights raster overlay.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (!contactLightsDebugEnabled) return;
		if (typeof window === 'undefined') return;

		const isContactLightsUrl = (url: unknown) =>
			typeof url === 'string' &&
			(url.includes('/maps/contact_lights/') ||
				url.includes('/maps/contact_lights_reveal/'));

		const logLoadState = (tag: string) => {
			try {
				const zoom = map.getZoom();
				const night = clamp(nightTRef.current, 0, 1);
				const zoomOutLift = computeNightLightsZoomOutLift(zoom);
				const loadT =
					clamp(nightLightsLoadTRef.current, 0, 1) *
					clamp(nightLightsZoomLoadTRef.current, 0, 1);
				const nightForLights = Math.pow(night, 0.65);
				const lightsBase =
					nightForLights *
					(NIGHT_US_LIGHTS_OPACITY + zoomOutLift) *
					computeNightLightsFade(zoom) *
					loadT;

				const introDone = nightLightsIntroDoneRef.current;
				const introRevealT = clamp(nightLightsIntroRevealTRef.current, 0, 1);
				const introCrossT = clamp(nightLightsIntroCrossfadeTRef.current, 0, 1);
				let introFinalMul = 1;
				let introRevealMul = 0;
				if (!introDone) {
					if (introCrossT > 0) {
						introFinalMul = introCrossT;
						introRevealMul = 1 - introCrossT;
					} else {
						introFinalMul = 0;
						introRevealMul = introRevealT;
					}
				}

				const crispMul = computeNightLightsCrispMul(zoom);
				const closeGlowMul = computeNightLightsCloseGlowMul(zoom);
				const finalCrispOpacity = clamp(lightsBase * introFinalMul * crispMul, 0, 1);
				const finalGlowOpacity = clamp(
					lightsBase *
						NIGHT_LIGHTS_GLOW_OPACITY_MULT *
						computeNightLightsGlowFade(zoom) *
						introFinalMul,
					0,
					1
				);
				const finalCloseGlowOpacity = clamp(
					lightsBase *
						NIGHT_LIGHTS_CLOSE_GLOW_OPACITY_MULT *
						closeGlowMul *
						introFinalMul,
					0,
					1
				);
				const finalSpaceGlowOpacity = clamp(
					lightsBase *
						NIGHT_LIGHTS_SPACE_GLOW_OPACITY_MULT *
						computeNightLightsSpaceGlowFade(zoom) *
						introFinalMul,
					0,
					1
				);
				const revealCrispOpacity = clamp(lightsBase * introRevealMul * crispMul, 0, 1);

				let finalLoaded = false;
				let revealLoaded: boolean | null = null;
				try {
					finalLoaded = map.isSourceLoaded(MAPBOX_SOURCE_IDS.nightLights);
				} catch {
					finalLoaded = false;
				}
				try {
					if ((map as any).getSource?.(MAPBOX_SOURCE_IDS.nightLightsReveal)) {
						revealLoaded = map.isSourceLoaded(MAPBOX_SOURCE_IDS.nightLightsReveal);
					}
				} catch {
					revealLoaded = null;
				}
				// eslint-disable-next-line no-console
				console.debug('[contact-lights]', tag, {
					zoom: typeof zoom === 'number' ? Number(zoom.toFixed(2)) : zoom,
					nightT: Number(night.toFixed(2)),
					finalLoaded,
					revealLoaded,
					fadeT: Number(clamp(computeNightLightsFade(zoom), 0, 1).toFixed(2)),
					zoomOutLift: Number(zoomOutLift.toFixed(2)),
					loadT: Number(clamp(nightLightsLoadTRef.current, 0, 1).toFixed(2)),
					zoomLoadT: Number(clamp(nightLightsZoomLoadTRef.current, 0, 1).toFixed(2)),
					lightsBase: Number(clamp(lightsBase, 0, 1).toFixed(2)),
					crispMul: Number(clamp(crispMul, 0, 1).toFixed(2)),
					closeGlowMul: Number(clamp(closeGlowMul, 0, 1).toFixed(2)),
					finalCrispOpacity: Number(finalCrispOpacity.toFixed(2)),
					finalGlowOpacity: Number(finalGlowOpacity.toFixed(2)),
					finalCloseGlowOpacity: Number(finalCloseGlowOpacity.toFixed(2)),
					finalSpaceGlowOpacity: Number(finalSpaceGlowOpacity.toFixed(2)),
					revealCrispOpacity: Number(revealCrispOpacity.toFixed(2)),
					introDone: nightLightsIntroDoneRef.current,
					introRevealT: Number(
						clamp(nightLightsIntroRevealTRef.current, 0, 1).toFixed(2)
					),
					introCrossT: Number(
						clamp(nightLightsIntroCrossfadeTRef.current, 0, 1).toFixed(2)
					),
				});
			} catch {
				// Ignore.
			}
		};

		const onError = (e: any) => {
			const sourceId = e?.sourceId;
			const url =
				e?.error?.url ??
				e?.url ??
				e?.error?.request?.url ??
				e?.error?.resource?.url ??
				e?.error?.resourceUrl;
			if (
				sourceId === MAPBOX_SOURCE_IDS.nightLights ||
				sourceId === MAPBOX_SOURCE_IDS.nightLightsReveal ||
				isContactLightsUrl(url)
			) {
				// eslint-disable-next-line no-console
				console.warn('[contact-lights] tile error', {
					sourceId,
					url,
					tile: e?.tile,
					status: e?.error?.status,
					message: e?.error?.message ?? e?.message,
				});
			}
		};

		let lastFinalLoaded: boolean | null = null;
		let lastRevealLoaded: boolean | null = null;
		const onSourceData = (e: any) => {
			const sid = e?.sourceId;
			if (
				sid !== MAPBOX_SOURCE_IDS.nightLights &&
				sid !== MAPBOX_SOURCE_IDS.nightLightsReveal
			)
				return;
			try {
				const finalLoaded = map.isSourceLoaded(MAPBOX_SOURCE_IDS.nightLights);
				const revealLoaded =
					(map as any).getSource?.(MAPBOX_SOURCE_IDS.nightLightsReveal) != null
						? map.isSourceLoaded(MAPBOX_SOURCE_IDS.nightLightsReveal)
						: null;
				if (finalLoaded !== lastFinalLoaded || revealLoaded !== lastRevealLoaded) {
					lastFinalLoaded = finalLoaded;
					lastRevealLoaded = revealLoaded;
					logLoadState('sourcedata');
				}
			} catch {
				// Ignore.
			}
		};

		try {
			(map as any).showTileBoundaries = true;
			(map as any).triggerRepaint?.();
		} catch {
			// Ignore.
		}

		map.on('error', onError);
		map.on('sourcedata', onSourceData);
		const onZoomEnd = () => logLoadState('zoomend');
		const onMoveEnd = () => logLoadState('moveend');
		map.on('zoomend', onZoomEnd);
		map.on('moveend', onMoveEnd);
		logLoadState('init');

		return () => {
			try {
				(map as any).showTileBoundaries = false;
				(map as any).triggerRepaint?.();
			} catch {
				// Ignore.
			}
			map.off('error', onError);
			map.off('sourcedata', onSourceData);
			map.off('zoomend', onZoomEnd);
			map.off('moveend', onMoveEnd);
		};
	}, [map, isMapLoaded, contactLightsDebugEnabled]);

	const prevPresentationRef = useRef<'background' | 'interactive'>(presentation);

	const cinematicAutoFitRef = useRef(false);

	const cinematicInFlightRef = useRef(false);
	const cinematicInFlightTimerRef = useRef<NodeJS.Timeout | null>(null);

	const backgroundCinematicMoveEndHandlerRef = useRef<(() => void) | null>(null);

	const pendingMinZoomRestoreRef = useRef(false);
	const hasAttachedMinZoomRestoreRef = useRef(false);
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const wasBackground = prevPresentationRef.current === 'background';
		prevPresentationRef.current = presentation;

		// Stop any prior background spin when presentation changes.
		backgroundSpinCleanupRef.current?.();
		backgroundSpinCleanupRef.current = null;

		const safeEnableInteractions = () => {
			try {
				map.scrollZoom.enable();
			} catch {}
			try {
				map.boxZoom.enable();
			} catch {}
			try {
				map.doubleClickZoom.enable();
			} catch {}
			try {
				map.dragPan.enable();
			} catch {}
			try {
				map.dragRotate.enable();
			} catch {}
			try {
				map.keyboard.enable();
			} catch {}
			try {
				map.touchZoomRotate.enable();
			} catch {}
		};

		const safeDisableInteractions = () => {
			try {
				map.scrollZoom.disable();
			} catch {}
			try {
				map.boxZoom.disable();
			} catch {}
			try {
				map.doubleClickZoom.disable();
			} catch {}
			try {
				map.dragPan.disable();
			} catch {}
			try {
				map.dragRotate.disable();
			} catch {}
			try {
				map.keyboard.disable();
			} catch {}
			try {
				map.touchZoomRotate.disable();
			} catch {}
		};

		if (isBackgroundPresentation) {
			// Decorative dashboard background: fixed zoom, no interactions, optional slow globe spin.
			safeDisableInteractions();

			// Tune these to match the homepage "globe peeking from the top" framing.
			// Key trick: use `offset` (screen-space pan) rather than changing geo center a lot.
			const lockDecorativeZoom = () => {
				try {
					map.setMinZoom(DASHBOARD_DECORATIVE_ZOOM);
					map.setMaxZoom(DASHBOARD_DECORATIVE_ZOOM);
				} catch {
					// Ignore.
				}
			};

			const startBackgroundSpin = () => {
				if (!shouldAutoSpin) return;
				// Slow decorative spin and keep the US in view with a gentle back-and-forth sway.
				const secondsPerRevolution = 3000;
				const distancePerSecond = 360 / secondsPerRevolution;
				const animationDurationMs = 1000;

				const normalizeLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;

				const baseLng = DASHBOARD_DECORATIVE_CENTER[0];
				const maxDriftDeg = 35; // keep camera within a US-visible band
				let direction: 1 | -1 = 1;
				let currentLng = normalizeLng(map.getCenter()?.lng ?? baseLng);

				const spinGlobe = () => {
					try {
						currentLng = normalizeLng(currentLng + direction * distancePerSecond);
						const drift = normalizeLng(currentLng - baseLng);
						if (drift > maxDriftDeg) {
							currentLng = normalizeLng(baseLng + maxDriftDeg);
							direction = -1;
						} else if (drift < -maxDriftDeg) {
							currentLng = normalizeLng(baseLng - maxDriftDeg);
							direction = 1;
						}

						map.easeTo({
							center: [currentLng, DASHBOARD_DECORATIVE_CENTER[1]],
							zoom: DASHBOARD_DECORATIVE_ZOOM,
							pitch: DASHBOARD_DECORATIVE_PITCH,
							bearing: 0,
							offset: DASHBOARD_DECORATIVE_OFFSET_PX,
							duration: animationDurationMs,
							easing: (n) => n,
						});
					} catch {
						// Ignore (map may be tearing down).
					}
				};

				map.on('moveend', spinGlobe);
				// Kick off the loop.
				spinGlobe();

				backgroundSpinCleanupRef.current = () => {
					try {
						map.off('moveend', spinGlobe);
					} catch {}
					try {
						map.stop();
					} catch {}
				};
			};

			const isEnteringBackgroundFromInteractive = !wasBackground;
			if (isEnteringBackgroundFromInteractive) {
				// Cinematic interactive → dashboard background transition: ease back out instead of snapping.
				try {
					map.stop();
				} catch {}

				// Prevent zoom clamping from snapping the camera before the ease starts.
				try {
					const currentZoom = map.getZoom() ?? DASHBOARD_DECORATIVE_ZOOM;
					map.setMinZoom(Math.min(currentZoom, DASHBOARD_DECORATIVE_ZOOM));
					map.setMaxZoom(Math.max(currentZoom, DASHBOARD_DECORATIVE_ZOOM));
				} catch {
					// Ignore.
				}

				// Cancel any prior pending "lock decorative zoom" handler.
				if (backgroundCinematicMoveEndHandlerRef.current) {
					try {
						map.off('moveend', backgroundCinematicMoveEndHandlerRef.current as any);
					} catch {}
					backgroundCinematicMoveEndHandlerRef.current = null;
				}

				// Guard against resize() / other camera ops interrupting the sweep.
				cinematicInFlightRef.current = true;
				if (cinematicInFlightTimerRef.current)
					clearTimeout(cinematicInFlightTimerRef.current);
				cinematicInFlightTimerRef.current = null;

				const dur = DASHBOARD_TO_INTERACTIVE_TRANSITION_MS;
				const onCinematicEnd = () => {
					backgroundCinematicMoveEndHandlerRef.current = null;
					// If the user already flipped back to interactive, don't lock/override anything.
					if (presentationRef.current !== 'background') return;

					lockDecorativeZoom();
					startBackgroundSpin();

					cinematicInFlightRef.current = false;
					if (cinematicInFlightTimerRef.current)
						clearTimeout(cinematicInFlightTimerRef.current);
					cinematicInFlightTimerRef.current = null;
				};
				backgroundCinematicMoveEndHandlerRef.current = onCinematicEnd;
				try {
					map.once('moveend', onCinematicEnd as any);
				} catch {}

				// Fallback: ensure we don't get stuck in "in flight" if moveend never fires.
				cinematicInFlightTimerRef.current = setTimeout(() => {
					cinematicInFlightRef.current = false;
					cinematicInFlightTimerRef.current = null;
				}, dur + 150);

				try {
					map.easeTo({
						center: DASHBOARD_DECORATIVE_CENTER,
						zoom: DASHBOARD_DECORATIVE_ZOOM,
						pitch: DASHBOARD_DECORATIVE_PITCH,
						bearing: 0,
						offset: DASHBOARD_DECORATIVE_OFFSET_PX,
						duration: dur,
						easing: mapboxEaseOutCubic,
					});
				} catch {
					// Ignore.
				}

				return;
			}

			// No transition (initial mount / already background): snap to decorative framing.
			try {
				lockDecorativeZoom();
				// `jumpTo` typings don't accept `offset` in our Mapbox version; use a 0ms `easeTo`.
				map.easeTo({
					center: DASHBOARD_DECORATIVE_CENTER,
					zoom: DASHBOARD_DECORATIVE_ZOOM,
					pitch: DASHBOARD_DECORATIVE_PITCH,
					bearing: 0,
					offset: DASHBOARD_DECORATIVE_OFFSET_PX,
					duration: 0,
				});
			} catch {
				// Ignore.
			}

			startBackgroundSpin();

			return;
		}

		// If we were easing back into the background and the user flipped to interactive mid-sweep,
		// cancel the pending "lock decorative zoom" handler + clear the in-flight guard.
		if (backgroundCinematicMoveEndHandlerRef.current) {
			try {
				map.off('moveend', backgroundCinematicMoveEndHandlerRef.current as any);
			} catch {}
			backgroundCinematicMoveEndHandlerRef.current = null;
			cinematicInFlightRef.current = false;
			if (cinematicInFlightTimerRef.current)
				clearTimeout(cinematicInFlightTimerRef.current);
			cinematicInFlightTimerRef.current = null;
		}

		// Interactive results mode: stop any ongoing animation, restore zoom constraints
		// and re-enable all user interactions.
		try {
			map.stop();
		} catch {}
		// Restore interactive zoom constraints. If we're coming from the decorative globe (zoom < MAP_MIN_ZOOM),
		// temporarily allow that starting zoom so the camera move begins exactly from the dashboard view.
		try {
			const currentZoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
			const safeMinZoom = Math.min(MAP_MIN_ZOOM, currentZoom);
			map.setMinZoom(safeMinZoom);
			map.setMaxZoom(DEFAULT_MAX_ZOOM_FALLBACK);
			if (safeMinZoom < MAP_MIN_ZOOM) {
				pendingMinZoomRestoreRef.current = true;
			}
		} catch {
			// Ignore.
		}
		safeEnableInteractions();

		// When transitioning *from* background → interactive, reset the auto-fit tracking
		// so the map correctly zooms to the search results / locked state.
		if (wasBackground) {
			cinematicAutoFitRef.current = true;
			hasFitBoundsRef.current = false;
			lastContactsCountRef.current = 0;
			lastFirstContactIdRef.current = null;
			lastLockedStateKeyRef.current = null;
			lastFitToLockedStateKeyRef.current = null;
			lastSearchQueryKeyRef.current = null;

			// Force a resize so the canvas matches the (potentially new) portal container size.
			try {
				map.resize();
			} catch {}

			// Background presentation uses a screen-space offset to create the "globe peeking"
			// framing on the dashboard. Start gliding toward a neutral interactive camera
			// immediately, then let the search/state auto-fit interrupt and continue from the
			// current camera position once data is ready. This avoids the old instant reset.
			try {
				const container = map.getContainer?.() as HTMLElement | undefined;
				const w = container?.clientWidth ?? 0;
				const h = container?.clientHeight ?? 0;
				let center: [number, number] = DASHBOARD_DECORATIVE_CENTER;
				if (w > 0 && h > 0) {
					const target = map.unproject([
						w / 2 + DASHBOARD_DECORATIVE_OFFSET_PX[0],
						h / 2 + DASHBOARD_DECORATIVE_OFFSET_PX[1],
					]);
					center = [target.lng, target.lat];
				}
				map.easeTo({
					center,
					zoom: MAP_DEFAULT_ZOOM,
					pitch: 0,
					bearing: 0,
					offset: [0, 0],
					duration: DASHBOARD_TO_INTERACTIVE_HANDOFF_GLIDE_MS,
					easing: mapboxEaseOutCubic,
				});
			} catch {}
		}
	}, [map, isMapLoaded, isBackgroundPresentation, shouldAutoSpin, presentation]);

	// When used as a decorative background, clear any interactive UI state so we don't
	// "carry" selected/hovered marker panels across view transitions.
	useEffect(() => {
		if (!isBackgroundPresentation) return;
		setSelectedMarker(null);
		setHoveredMarkerId(null);
		setFadingTooltipId(null);
		hoveredMarkerIdRef.current = null;
		hoverSourceRef.current = null;
		onMarkerHover?.(null);
	}, [isBackgroundPresentation, onMarkerHover]);

	// Keep the Mapbox canvas in sync with its container.
	// In portal / fixed-position layouts the browser may not have the final height when
	// mapbox-gl first reads it, so we:
	//   1. Observe container resizes (covers window resize, sidebar toggle, etc.)
	//   2. Fire a burst of resize() calls after mount to catch deferred CSS layout
	useEffect(() => {
		const container = mapContainerRef.current;
		if (!container || !map) return;

		let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
		const safeResize = () => {
			// During the cinematic background→interactive sweep, the container isn't truly
			// resizing (we animate via clip-path). Skip resize to avoid interrupting fitBounds.
			if (cinematicInFlightRef.current) return;
			try {
				map.resize();
			} catch {
				/* map may be tearing down */
			}
		};

		const scheduleResize = () => {
			// Debounce aggressive resize loops (e.g. CSS inset transitions) to avoid WebGL canvas flicker.
			if (resizeDebounce) clearTimeout(resizeDebounce);
			resizeDebounce = setTimeout(() => {
				resizeDebounce = null;
				safeResize();
			}, 120);
		};

		// ResizeObserver for ongoing size changes.
		const ro = new ResizeObserver(() => scheduleResize());
		ro.observe(container);

		// Burst of retries to catch portal/fixed layout settling.
		const timers: ReturnType<typeof setTimeout>[] = [];
		for (const ms of [0, 50, 150, 300, 600]) {
			timers.push(setTimeout(safeResize, ms));
		}

		return () => {
			ro.disconnect();
			for (const t of timers) clearTimeout(t);
			if (resizeDebounce) clearTimeout(resizeDebounce);
		};
	}, [map]);

	// Compute valid coords once and keep a per-contact lookup for stable rendering.
	// Also apply a small deterministic offset for duplicate coordinate groups so every result is visible.
	const { contactsWithCoords, coordsByContactId } = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		for (const contact of contacts) {
			const coords = getLatLngFromContact(contact);
			if (!coords) continue;
			coordsByContactId.set(contact.id, coords);
			contactsWithCoords.push(contact);
			const key = coordinateKey(coords);
			const existing = groups.get(key);
			if (existing) existing.push(contact.id);
			else groups.set(key, [contact.id]);
		}

		// Offset duplicates (keep the smallest id at the true coordinate for accuracy)
		for (const ids of groups.values()) {
			if (ids.length <= 1) continue;
			ids.sort((a, b) => a - b);
			for (let i = 1; i < ids.length; i++) {
				const id = ids[i];
				const base = coordsByContactId.get(id);
				if (!base) continue;
				coordsByContactId.set(id, jitterDuplicateCoords(base, i));
			}
		}

		return { contactsWithCoords, coordsByContactId };
	}, [contacts]);

	// State keys represented by the *visible* results on the map (only contacts with coords).
	const resultStateKeys = useMemo(() => {
		const keys = new Set<string>();
		for (const contact of contactsWithCoords) {
			const key = normalizeStateKey(contact.state ?? null);
			if (key) keys.add(key);
		}
		return Array.from(keys).sort();
	}, [contactsWithCoords]);

	const lockedStateKey = useMemo(
		() => normalizeStateKey(lockedStateName ?? null),
		[lockedStateName]
	);

	const isCoordsInLockedState = useCallback((coords: LatLngLiteral): boolean => {
		const selection = lockedStateSelectionMultiPolygonRef.current;
		if (!selection) return true; // no locked state selection -> treat as "in state"
		const bbox = lockedStateSelectionBboxRef.current;
		if (bbox && !isLatLngInBbox(coords.lat, coords.lng, bbox)) return false;
		return pointInMultiPolygon([coords.lng, coords.lat], selection);
	}, []);

	// Used to ensure the high-zoom "all contacts" gray-dot overlay never renders in water.
	// We approximate "land" by requiring the coordinate to fall within at least one US state polygon
	// loaded from `states.js` (this reliably removes oceans/coastal water artifacts without extra API calls).
	const isCoordsInAnyUsState = useCallback((coords: LatLngLiteral): boolean => {
		const prepared = usStatesPolygonsRef.current;
		if (!prepared || prepared.length === 0) return false;
		const point: ClippingCoord = [coords.lng, coords.lat];
		for (const { polygon, bbox } of prepared) {
			if (bbox && !isLatLngInBbox(coords.lat, coords.lng, bbox)) continue;
			if (pointInClippingPolygon(point, polygon)) return true;
		}
		return false;
	}, []);

	const resultStateKeysSignature = useMemo(
		() => resultStateKeys.join('|'),
		[resultStateKeys]
	);

	useEffect(() => {
		resultsSelectionSignatureRef.current = resultStateKeysSignature;
	}, [resultStateKeysSignature]);

	// Helper to get coordinates for a contact (stable + already-parsed)
	const getContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			coordsByContactId.get(contact.id) ?? null,
		[coordsByContactId]
	);

	useEffect(() => {
		if (!map || !isMapLoaded) return;

		if (isLoading) {
			clearCuratedBlobOutline();
			return;
		}

		const curatedDots = contactsWithCoords
			.map((contact) => ({
				id: contact.id,
				isCurated: Boolean(contact.curatedCategory),
				coords: getContactCoords(contact),
			}))
			.filter(
				(
					dot
				): dot is {
					id: number;
					isCurated: true;
					coords: LatLngLiteral;
				} => dot.isCurated && dot.coords != null
			)
			.sort((a, b) => a.id - b.id);

		if (curatedDots.length === 0) {
			clearCuratedBlobOutline();
			return;
		}

		const signature = curatedDots
			.map(
				(dot) =>
					`${dot.id}:${dot.coords.lng.toFixed(5)}:${dot.coords.lat.toFixed(5)}`
			)
			.join('|');
		const nextSignature = `v12:${CURATED_BLOB_MIN_REGION_POINTS}:${CURATED_BLOB_MAX_REGIONS}:${CURATED_BLOB_MAX_REGION_SPAN_KM}:${CURATED_BLOB_SHAPE_STEPS}:${CURATED_BLOB_OUTLINE_SMOOTHING_PASSES}:${CURATED_BLOB_LOBE_MIN_COUNT}:${CURATED_BLOB_LOBE_MAX_COUNT}:${CURATED_BLOB_LOBE_PADDING_KM}:${CURATED_BLOB_LOBE_MIN_RADIUS_KM}:${CURATED_BLOB_LOBE_MAX_RADIUS_KM}:${CURATED_BLOB_LOBE_OVERLAP_RADIUS_RATIO}:${CURATED_BLOB_LOBE_RADIUS_JITTER}:${CURATED_BLOB_SINGLETON_LOBE_RADIUS_KM}:${CURATED_BLOB_SINGLETON_LOBE_OFFSET_KM}:${CURATED_ORB_SMALL_SHAPE_MIN_RADIUS_KM}:${CURATED_ORB_SMALL_SHAPE_THRESHOLD_KM}:${CURATED_BLOB_ORGANIC_WOBBLE}:${signature}`;
		if (nextSignature === curatedBlobSignatureRef.current) return;

		let cancelled = false;

		const updateCuratedBlob = async () => {
			const mercatorPoints = curatedDots
				.map((dot) => projectCuratedBlobPoint(dot.id, dot.coords))
				.filter((point): point is CuratedBlobMercatorPoint => point != null);

			if (mercatorPoints.length === 0) {
				if (!cancelled) clearCuratedBlobOutline();
				return;
			}

			const clusters = pickAdaptiveCuratedBlobClusters(mercatorPoints);
			const protectedMarkerIds = new Set<number>();
			for (const cluster of clusters) {
				for (const point of cluster.points) {
					protectedMarkerIds.add(point.id);
				}
			}
			const lobeMultiPolygons = clusters.flatMap((cluster, index) =>
				buildCuratedBlobClusterLobeMultiPolygons(cluster, index)
			);

			if (lobeMultiPolygons.length === 0) {
				if (!cancelled) clearCuratedBlobOutline();
				return;
			}

			let unionedMercatorMultiPolygon: ClippingMultiPolygon | null =
				lobeMultiPolygons.length === 1 ? lobeMultiPolygons[0] : null;
			if (!unionedMercatorMultiPolygon) {
				const wasmGeo = await ensureWasmGeoModuleLoaded();
				if (typeof wasmGeo?.union_multi_polygons === 'function') {
					try {
						const out = wasmGeo.union_multi_polygons(lobeMultiPolygons);
						if (Array.isArray(out) && out.length) unionedMercatorMultiPolygon = out;
					} catch (err) {
						logWasmGeoRuntimeError(err);
					}
				}
			}

			if (!unionedMercatorMultiPolygon) {
				try {
					const { unionClippingMultiPolygons } = await import('@/utils/polygonClipping');
					unionedMercatorMultiPolygon =
						unionClippingMultiPolygons(...lobeMultiPolygons);
				} catch (err) {
					console.error('Failed to union curated blob lobes', err);
				}
			}

			const naturalMercatorMultiPolygon = smoothCuratedBlobMultiPolygon(
				unionedMercatorMultiPolygon?.length
					? unionedMercatorMultiPolygon
					: lobeMultiPolygons.flat(),
				CURATED_BLOB_OUTLINE_SMOOTHING_PASSES
			);
			const morphSources =
				createCuratedBlobMorphSourcesFromMercatorMultiPolygon(
					naturalMercatorMultiPolygon
				);

			if (morphSources.length === 0) {
				if (!cancelled) clearCuratedBlobOutline();
				return;
			}

			if (cancelled) return;
			const source = map.getSource(MAPBOX_SOURCE_IDS.curatedBlob) as
				| mapboxgl.GeoJSONSource
				| undefined;
			if (!source) return;

			curatedBlobOrbTargetsRef.current = morphSources.map((shapeSource) => ({
				center: shapeSource.center,
				radiusKm: shapeSource.radiusKm,
			}));
			updateCuratedBlobProtectedMarkerIds(protectedMarkerIds);
			naturalBlobMorphSourceRef.current = morphSources;
			lastBlobMorphTAppliedRef.current = Number.NaN;
			curatedBlobSignatureRef.current = nextSignature;

			// Apply the current morph state (which depends on current zoom).
			// At t=0 this writes the natural geometry; otherwise it writes the
			// vertex-lerped morph toward the circle.
			applyBlobMorphRef.current?.();
			applyCuratedOrbStateRef.current?.();
		};

		void updateCuratedBlob();

		return () => {
			cancelled = true;
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		contactsWithCoords,
		getContactCoords,
		clearCuratedBlobOutline,
		updateCuratedBlobProtectedMarkerIds,
	]);

	const handleMapMouseUp = useCallback(
		(e: mapboxgl.MapMouseEvent) => {
			if (!isAreaSelecting) return;
			const start = selectionStartLatLngRef.current;
			if (!start) {
				clearSelectionRect();
				return;
			}
			const end = { lat: e.lngLat.lat, lng: e.lngLat.lng };

			// Ignore tiny "click" selections (treat as cancel).
			const startClient = selectionStartClientRef.current;
			const endClient = getClientPointFromDomEvent(e.originalEvent);
			const dx = startClient && endClient ? Math.abs(endClient.x - startClient.x) : 0;
			const dy = startClient && endClient ? Math.abs(endClient.y - startClient.y) : 0;
			const movedEnough = dx >= 6 || dy >= 6;

			clearSelectionRect();

			if (!movedEnough) return;

			const bounds: MapSelectionBounds = {
				south: Math.min(start.lat, end.lat),
				west: Math.min(start.lng, end.lng),
				north: Math.max(start.lat, end.lat),
				east: Math.max(start.lng, end.lng),
			};

			const isCoordsInBounds = (coords: LatLngLiteral | null | undefined): boolean => {
				if (!coords) return false;
				return (
					coords.lat >= bounds.south &&
					coords.lat <= bounds.north &&
					coords.lng >= bounds.west &&
					coords.lng <= bounds.east
				);
			};

			// Build a selection payload so the dashboard can select contacts without triggering a new search.
			const selectedIds = new Set<number>();
			for (const contact of contactsWithCoords) {
				const coords = coordsByContactId.get(contact.id) ?? null;
				if (!isCoordsInBounds(coords)) continue;
				selectedIds.add(contact.id);
			}

			const normalizedSearchWhat = searchWhat ? normalizeWhatKey(searchWhat) : null;

			const extraContactsById = new Map<number, ContactWithName>();

			// Include booking overlay pins only when they match the active "What" (category) and are visible.
			if (
				isBookingSearch &&
				normalizedSearchWhat &&
				bookingExtraVisibleContacts.length > 0
			) {
				for (const contact of bookingExtraVisibleContacts) {
					const prefix = getBookingTitlePrefixFromContactTitle(contact.title);
					if (!prefix) continue;
					if (!bookingTitlePrefixMatchesSearchWhatKey(prefix, normalizedSearchWhat))
						continue;
					const coords = bookingExtraCoordsByContactId.get(contact.id) ?? null;
					if (!isCoordsInBounds(coords)) continue;
					selectedIds.add(contact.id);
					if (!baseContactIdSet.has(contact.id)) {
						extraContactsById.set(contact.id, contact);
					}
				}
			}

			// Include promotion overlay pins only when they match the active "What" (category) and are visible.
			if (
				isPromotionSearch &&
				normalizedSearchWhat &&
				promotionOverlayVisibleContacts.length > 0
			) {
				for (const contact of promotionOverlayVisibleContacts) {
					const title = contact.title ?? '';
					const matchedPrefix =
						PROMOTION_OVERLAY_TITLE_PREFIXES.find((p) =>
							startsWithCaseInsensitive(title, p)
						) ?? null;
					if (!matchedPrefix) continue;
					if (normalizeWhatKey(matchedPrefix) !== normalizedSearchWhat) continue;
					const coords = promotionOverlayCoordsByContactId.get(contact.id) ?? null;
					if (!isCoordsInBounds(coords)) continue;
					selectedIds.add(contact.id);
					if (!baseContactIdSet.has(contact.id)) {
						extraContactsById.set(contact.id, contact);
					}
				}
			}

			// Include "all contacts" high-zoom gray dots (no category filtering).
			if (allContactsOverlayVisibleContacts.length > 0) {
				for (const contact of allContactsOverlayVisibleContacts) {
					const coords = allContactsOverlayCoordsByContactId.get(contact.id) ?? null;
					if (!isCoordsInBounds(coords)) continue;
					selectedIds.add(contact.id);
					if (!baseContactIdSet.has(contact.id)) {
						extraContactsById.set(contact.id, contact);
					}
				}
			}

			onAreaSelect?.(bounds, {
				contactIds: Array.from(selectedIds),
				extraContacts: Array.from(extraContactsById.values()),
			});
		},
		[
			isAreaSelecting,
			clearSelectionRect,
			onAreaSelect,
			contactsWithCoords,
			coordsByContactId,
			searchWhat,
			isBookingSearch,
			bookingExtraVisibleContacts,
			bookingExtraCoordsByContactId,
			isPromotionSearch,
			promotionOverlayVisibleContacts,
			promotionOverlayCoordsByContactId,
			allContactsOverlayVisibleContacts,
			allContactsOverlayCoordsByContactId,
			baseContactIdSet,
		]
	);

	// Dashboard UX: "All" button selects all markers currently visible in the viewport that
	// match the active search category (including overlay pins when visible).
	useEffect(() => {
		if (!selectAllInViewNonce) return;
		if (selectAllInViewNonce === lastSelectAllInViewNonceRef.current) return;
		if (!map) return;
		if (typeof onAreaSelect !== 'function') return;

		const viewportBounds = map.getBounds();
		if (!viewportBounds) return;
		const sw = viewportBounds.getSouthWest();
		const ne = viewportBounds.getNorthEast();
		const west = sw.lng;
		const east = ne.lng;

		// Skip in the unlikely case the viewport crosses the antimeridian (not relevant for our UI).
		if (east < west) return;

		const bounds: MapSelectionBounds = {
			south: sw.lat,
			west,
			north: ne.lat,
			east,
		};

		const selectedIds = new Set<number>();

		// Base results: only select dots currently rendered in the viewport. Curated
		// searches may keep the full small result set in the marker source for zoom stability.
		for (const contact of visibleContacts) {
			const coords = getContactCoords(contact);
			if (!coords) continue;
			if (
				coords.lat < bounds.south ||
				coords.lat > bounds.north ||
				coords.lng < bounds.west ||
				coords.lng > bounds.east
			) {
				continue;
			}
			selectedIds.add(contact.id);
		}

		const normalizedSearchWhat = searchWhat ? normalizeWhatKey(searchWhat) : null;
		const extraContactsById = new Map<number, ContactWithName>();

		// Booking overlay pins: select only the visible pins that match the active category.
		if (
			isBookingSearch &&
			normalizedSearchWhat &&
			bookingExtraVisibleContacts.length > 0
		) {
			for (const contact of bookingExtraVisibleContacts) {
				const prefix = getBookingTitlePrefixFromContactTitle(contact.title);
				if (!prefix) continue;
				if (!bookingTitlePrefixMatchesSearchWhatKey(prefix, normalizedSearchWhat))
					continue;
				selectedIds.add(contact.id);
				if (!baseContactIdSet.has(contact.id)) {
					extraContactsById.set(contact.id, contact);
				}
			}
		}

		// Promotion overlay pins: select only the visible pins that match the active category.
		if (
			isPromotionSearch &&
			normalizedSearchWhat &&
			promotionOverlayVisibleContacts.length > 0
		) {
			for (const contact of promotionOverlayVisibleContacts) {
				const title = contact.title ?? '';
				const matchedPrefix =
					PROMOTION_OVERLAY_TITLE_PREFIXES.find((p) =>
						startsWithCaseInsensitive(title, p)
					) ?? null;
				if (!matchedPrefix) continue;
				if (normalizeWhatKey(matchedPrefix) !== normalizedSearchWhat) continue;
				selectedIds.add(contact.id);
				if (!baseContactIdSet.has(contact.id)) {
					extraContactsById.set(contact.id, contact);
				}
			}
		}

		// All-contacts gray overlay: select all visible gray dots in the viewport.
		if (allContactsOverlayVisibleContacts.length > 0) {
			for (const contact of allContactsOverlayVisibleContacts) {
				selectedIds.add(contact.id);
				if (!baseContactIdSet.has(contact.id)) {
					extraContactsById.set(contact.id, contact);
				}
			}
		}

		onAreaSelect(bounds, {
			contactIds: Array.from(selectedIds),
			extraContacts: Array.from(extraContactsById.values()),
		});

		// Ensure this runs once per dashboard click, even as viewport-driven state changes.
		lastSelectAllInViewNonceRef.current = selectAllInViewNonce;
	}, [
		selectAllInViewNonce,
		map,
		onAreaSelect,
		visibleContacts,
		getContactCoords,
		searchWhat,
		isBookingSearch,
		bookingExtraVisibleContacts,
		isPromotionSearch,
		promotionOverlayVisibleContacts,
		allContactsOverlayVisibleContacts,
		baseContactIdSet,
	]);

	// Recompute which contact markers are rendered in the current viewport, and
	// budget background dots so the combined total stays under MAX_TOTAL_DOTS.
	const recomputeViewportDots = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance) return;
			// Preserve currently-rendered markers while results are loading/refetching.
			// The dashboard parent can momentarily pass `contacts=[]` during refetch; if we sample
			// against that, we end up clearing and then repopulating the marker sources (visible flicker).
			if (isLoadingRef.current) return;

			const bounds = mapInstance.getBounds();
			if (!bounds) return;
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat;
			const west = sw.lng;
			const north = ne.lat;
			const east = ne.lng;

			// Skip in the unlikely case the viewport crosses the antimeridian (not relevant for our UI).
			if (east < west) return;

			const zoomRaw = mapInstance.getZoom() ?? 4;
			// Compute marker size at this zoom so we can enforce min spacing in screen pixels.
			// Zoom can be fractional, so use the raw value for accurate scaling.
			const markerScale = getResultDotScaleForZoom(zoomRaw);
			const dotStrokeWeight = getResultDotStrokeWeightForZoom(zoomRaw);
			// Ensure *hovered* dots also won't overlap.
			const minSeparationPx = 2 * (markerScale * 1.18) + dotStrokeWeight + 1.5;
			const minSeparationSq = minSeparationPx * minSeparationPx;
			// Mapbox GL's internal "world" is 512px wide at zoom 0 (tileSize=512).
			// Use the same scale so our world-pixel distances match on-screen pixels.
			const worldSize = 512 * Math.pow(2, zoomRaw);

			// Pad the bbox so off-screen-but-near markers stay in the source. Without
			// this, fast zoom/pan changes cull edge markers from the source data, and
			// the resulting `setData()` causes the dot layer to briefly clear before
			// re-rendering — which reads as the "disappear and reload" flicker.
			const latSpan = north - south;
			const lngSpan = east - west;
			const padLat = latSpan * VIEWPORT_BBOX_PAD_FACTOR;
			const padLng = lngSpan * VIEWPORT_BBOX_PAD_FACTOR;
			const paddedSouth = clamp(south - padLat, -90, 90);
			const paddedNorth = clamp(north + padLat, -90, 90);
			const paddedWest = clamp(west - padLng, -180, 180);
			const paddedEast = clamp(east + padLng, -180, 180);

			// Keep the seed quantized so marker sampling stays stable while panning/zooming.
			// Use the padded bounds so the seed only changes when the user moves outside the
			// padded buffer — matching the visibility filter below for end-to-end stability.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);
			const qSouth = Math.round(paddedSouth / quant);
			const qWest = Math.round(paddedWest / quant);
			const qNorth = Math.round(paddedNorth / quant);
			const qEast = Math.round(paddedEast / quant);
			const seed = `${zoomKey}|${qSouth}|${qWest}|${qNorth}|${qEast}`;

			const viewportBbox: BoundingBox = {
				minLat: paddedSouth,
				maxLat: paddedNorth,
				minLng: paddedWest,
				maxLng: paddedEast,
			};

			// Promotion overlay pins: state-wide "Radio Stations <State>" / "College Radio <State>"
			// lists should all be visible together at low zoom.
			const shouldShowPromotionOverlay =
				isPromotionSearch &&
				zoomRaw >= PROMOTION_OVERLAY_MARKERS_MIN_ZOOM &&
				promotionOverlayContactsWithCoords.length > 0;
			let nextPromotionOverlayVisible: ContactWithName[] = [];
			if (shouldShowPromotionOverlay) {
				const promoInBounds: ContactWithName[] = [];
				for (const contact of promotionOverlayContactsWithCoords) {
					const coords = getPromotionOverlayContactCoords(contact);
					if (!coords) continue;
					if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;
					promoInBounds.push(contact);
				}
				// Keep ordering stable.
				promoInBounds.sort((a, b) => a.id - b.id);
				// Defensive cap (we expect far fewer than this).
				nextPromotionOverlayVisible =
					promoInBounds.length > PROMOTION_OVERLAY_MARKERS_MAX_PINS
						? promoInBounds.slice(0, PROMOTION_OVERLAY_MARKERS_MAX_PINS)
						: promoInBounds;
			}

			const nextPromotionKey = nextPromotionOverlayVisible.map((c) => c.id).join(',');
			if (nextPromotionKey !== lastPromotionOverlayVisibleContactsKeyRef.current) {
				lastPromotionOverlayVisibleContactsKeyRef.current = nextPromotionKey;
				setPromotionOverlayVisibleContacts(nextPromotionOverlayVisible);
			}

			const promotionOverlayIdSet =
				nextPromotionOverlayVisible.length > 0
					? new Set<number>(nextPromotionOverlayVisible.map((c) => c.id))
					: null;

			const curatedContactsWithCoords = contactsWithCoords.filter(
				(contact) => Boolean(contact.curatedCategory) && getContactCoords(contact) != null
			);
			const shouldUseStableCuratedMarkers =
				!isBookingSearch &&
				!isPromotionSearch &&
				curatedContactsWithCoords.length > 0 &&
				curatedContactsWithCoords.length === contactsWithCoords.length &&
				curatedContactsWithCoords.length <= CURATED_STABLE_MARKER_MAX_DOTS;
			if (shouldUseStableCuratedMarkers) {
				const nextVisibleContacts = curatedContactsWithCoords
					.slice()
					.sort((a, b) => a.id - b.id);
				const nextKey = nextVisibleContacts.map((c) => c.id).join(',');
				if (nextKey !== lastVisibleContactsKeyRef.current) {
					lastVisibleContactsKeyRef.current = nextKey;
					setVisibleContacts(nextVisibleContacts);
				}
				return;
			}

			// Determine which contacts are currently in the viewport.
			const inBounds: ContactWithName[] = [];
			for (const contact of contactsWithCoords) {
				// If this contact is rendered as a promotion overlay pin, don't duplicate it as a dot.
				if (promotionOverlayIdSet?.has(contact.id)) continue;
				const coords = getContactCoords(contact);
				if (!coords) continue;
				if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;
				inBounds.push(contact);
			}

			const hasLockedStateSelection =
				!!lockedStateKey &&
				lockedStateSelectionKeyRef.current === lockedStateKey &&
				!!lockedStateSelectionMultiPolygonRef.current;

			const selectedSet = new Set<number>(selectedContacts);
			const hoveredId = hoveredMarkerIdRef.current;
			const priorityIdSet = new Set<number>(selectedSet);
			if (hoveredId != null) priorityIdSet.add(hoveredId);
			for (const id of visibleContactIdSetRef.current) priorityIdSet.add(id);

			const priorityInBounds: ContactWithName[] = [];
			const inLockedUnpriorityInBounds: ContactWithName[] = [];
			const outLockedUnpriorityInBounds: ContactWithName[] = [];
			const unpriorityInBounds: ContactWithName[] = [];
			for (const contact of inBounds) {
				if (priorityIdSet.has(contact.id)) {
					priorityInBounds.push(contact);
					continue;
				}

				if (hasLockedStateSelection) {
					// Prefer the contact's state field for inside/outside classification (cheap),
					// and only fall back to polygon containment when state is missing/unknown.
					const contactStateKey = normalizeStateKey(contact.state ?? null);
					if (contactStateKey) {
						if (contactStateKey === lockedStateKey)
							inLockedUnpriorityInBounds.push(contact);
						else outLockedUnpriorityInBounds.push(contact);
						continue;
					}

					const coords = getContactCoords(contact);
					if (coords && isCoordsInLockedState(coords))
						inLockedUnpriorityInBounds.push(contact);
					else outLockedUnpriorityInBounds.push(contact);
					continue;
				}

				unpriorityInBounds.push(contact);
			}

			// When zoomed out, avoid placing locked-state dots directly on top of the state border stroke
			// by deprioritizing points that are too close to the boundary.
			const shouldInsetLockedStateMarkers = hasLockedStateSelection && zoomRaw <= 6;
			let lockedEdgeIdSet: Set<number> | null = null;
			let inLockedUnprioritySafe: ContactWithName[] = inLockedUnpriorityInBounds;
			let inLockedUnpriorityEdge: ContactWithName[] = [];

			if (shouldInsetLockedStateMarkers) {
				const selection = lockedStateSelectionMultiPolygonRef.current;
				if (selection) {
					const borderSegments = buildOuterRingWorldSegments(selection, worldSize);
					if (borderSegments.length > 0) {
						// Inset in screen pixels: marker radius + ~half border stroke + a little padding.
						const borderInsetPx = markerScale + 1.5 + 1;
						const safe: ContactWithName[] = [];
						const edge: ContactWithName[] = [];
						for (const contact of inLockedUnpriorityInBounds) {
							const coords = getContactCoords(contact);
							if (!coords) continue;
							const wp = latLngToWorldPixel(coords, worldSize);
							const isNearBorder = isWorldPointNearSegments(
								wp.x,
								wp.y,
								borderSegments,
								borderInsetPx
							);
							if (isNearBorder) edge.push(contact);
							else safe.push(contact);
						}

						inLockedUnprioritySafe = safe;
						inLockedUnpriorityEdge = edge;
						lockedEdgeIdSet = edge.length > 0 ? new Set(edge.map((c) => c.id)) : null;
					}
				}
			}

			// Reserve budget for promotion overlay pins so they always render.
			const maxPrimaryDots = Math.max(
				0,
				MAX_TOTAL_DOTS - nextPromotionOverlayVisible.length
			);

			// Build a stable "candidate pool" larger than what we render, then pick a
			// non-overlapping subset so dots never visually stack on top of each other.
			const POOL_FACTOR = 4;
			const poolSlots = maxPrimaryDots * POOL_FACTOR;
			let pool: ContactWithName[] = [];
			if (poolSlots <= 0) {
				pool = [];
			} else if (inBounds.length <= poolSlots) {
				pool = inBounds;
			} else if (priorityInBounds.length >= poolSlots) {
				pool = stableViewportSampleContacts(
					priorityInBounds,
					getContactCoords,
					viewportBbox,
					poolSlots,
					`${seed}|pool:priority`
				);
			} else {
				const remainingSlots = poolSlots - priorityInBounds.length;
				if (hasLockedStateSelection) {
					const share = getLockedStateMarkerShareForZoom(zoomRaw);
					const desiredLockedSlots = Math.round(remainingSlots * share);
					const lockedSlots = Math.min(
						inLockedUnpriorityInBounds.length,
						desiredLockedSlots
					);
					let outsideSlots = remainingSlots - lockedSlots;
					const lockedSamplingBbox = lockedStateSelectionBboxRef.current ?? viewportBbox;

					const sampleLockedUnselected = (slots: number): ContactWithName[] => {
						if (slots <= 0) return [];
						if (!shouldInsetLockedStateMarkers || inLockedUnpriorityEdge.length === 0) {
							return stableViewportSampleContacts(
								inLockedUnpriorityInBounds,
								getContactCoords,
								lockedSamplingBbox,
								slots,
								`${seed}|pool:locked`
							);
						}

						const primarySlots = Math.min(inLockedUnprioritySafe.length, slots);
						const edgeSlots = Math.max(0, slots - primarySlots);
						const sampledSafe =
							primarySlots > 0
								? stableViewportSampleContacts(
										inLockedUnprioritySafe,
										getContactCoords,
										lockedSamplingBbox,
										primarySlots,
										`${seed}|pool:locked:safe`
									)
								: [];
						const sampledEdge =
							edgeSlots > 0
								? stableViewportSampleContacts(
										inLockedUnpriorityEdge,
										getContactCoords,
										lockedSamplingBbox,
										edgeSlots,
										`${seed}|pool:locked:edge`
									)
								: [];

						return [...sampledSafe, ...sampledEdge];
					};

					// If there aren't enough "outside" contacts to fill the remainder,
					// reallocate the unused slots back to the locked state.
					const outsideAvailable = outLockedUnpriorityInBounds.length;
					if (outsideAvailable < outsideSlots) {
						const unused = outsideSlots - outsideAvailable;
						outsideSlots = outsideAvailable;
						// NOTE: This may exceed desiredLockedSlots, but it's fine — we prefer
						// more in-locked candidates when zoomed out.
						const additionalLockedSlots = Math.min(
							inLockedUnpriorityInBounds.length - lockedSlots,
							unused
						);
						const finalLockedSlots = lockedSlots + Math.max(0, additionalLockedSlots);

						const sampledLocked = sampleLockedUnselected(finalLockedSlots);
						const sampledOutside = stableViewportSampleContacts(
							outLockedUnpriorityInBounds,
							getContactCoords,
							viewportBbox,
							outsideSlots,
							`${seed}|pool:out`
						);
						pool = [...priorityInBounds, ...sampledLocked, ...sampledOutside];
					} else {
						const sampledLocked = sampleLockedUnselected(lockedSlots);
						const sampledOutside = stableViewportSampleContacts(
							outLockedUnpriorityInBounds,
							getContactCoords,
							viewportBbox,
							outsideSlots,
							`${seed}|pool:out`
						);
						pool = [...priorityInBounds, ...sampledLocked, ...sampledOutside];
					}
				} else {
					const sampled = stableViewportSampleContacts(
						unpriorityInBounds,
						getContactCoords,
						viewportBbox,
						remainingSlots,
						`${seed}|pool`
					);
					pool = [...priorityInBounds, ...sampled];
				}
			}

			type Candidate = {
				contact: ContactWithName;
				x: number;
				y: number;
				isSelected: boolean;
				isHovered: boolean;
				isPriority: boolean;
				isInLockedState: boolean;
				isNearLockedBorder: boolean;
				key: number;
			};

			const candidates: Candidate[] = [];
			const candidateContacts: ContactWithName[] = [];
			const candidateCoords: LatLngLiteral[] = [];
			for (const contact of pool) {
				const coords = getContactCoords(contact);
				if (!coords) continue;
				candidateContacts.push(contact);
				candidateCoords.push(coords);
			}
			const projectedCandidates = batchLatLngToWorldPixels(candidateCoords, worldSize);
			for (let i = 0; i < candidateContacts.length; i++) {
				const contact = candidateContacts[i];
				const coords = candidateCoords[i];
				const projected = projectedCandidates[i];
				if (!coords || !projected) continue;
				const { x, y } = projected;
				let isInLockedState = true;
				if (hasLockedStateSelection) {
					const contactStateKey = normalizeStateKey(contact.state ?? null);
					isInLockedState = contactStateKey
						? contactStateKey === lockedStateKey
						: isCoordsInLockedState(coords);
				}
				candidates.push({
					contact,
					x,
					y,
					isSelected: selectedSet.has(contact.id),
					isHovered: hoveredId != null && contact.id === hoveredId,
					isPriority: priorityIdSet.has(contact.id),
					isInLockedState,
					isNearLockedBorder: !!lockedEdgeIdSet && lockedEdgeIdSet.has(contact.id),
					key: hashStringToUint32(`${seed}|${contact.id}`),
				});
			}

			const priorityCandidates: Candidate[] = [];
			const inLockedCandidates: Candidate[] = [];
			const outLockedCandidates: Candidate[] = [];
			for (const c of candidates) {
				if (c.isPriority) priorityCandidates.push(c);
				else if (c.isInLockedState) inLockedCandidates.push(c);
				else outLockedCandidates.push(c);
			}

			// Stable ordering (we handle "priority first" by splitting arrays).
			// Within priority, keep hovered first, then explicit selections, then stable by id.
			priorityCandidates.sort((a, b) => {
				if (a.isHovered !== b.isHovered) return a.isHovered ? -1 : 1;
				if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
				return a.contact.id - b.contact.id;
			});
			inLockedCandidates.sort((a, b) => {
				if (
					shouldInsetLockedStateMarkers &&
					a.isNearLockedBorder !== b.isNearLockedBorder
				) {
					return a.isNearLockedBorder ? 1 : -1;
				}
				return a.key - b.key;
			});
			outLockedCandidates.sort((a, b) => a.key - b.key);

			const picked: ContactWithName[] = [];
			let didPickWithWasm = false;

			// Prefer the Rust/WASM picker when available.
			{
				const wasmGeo = getWasmGeoModuleSync();
				if (wasmGeo && typeof wasmGeo.pick_non_overlapping_indices === 'function') {
					try {
						const xy = new Float64Array(candidates.length * 2);
						const inLockedMask = new Uint8Array(candidates.length);
						for (let i = 0; i < candidates.length; i++) {
							const c = candidates[i];
							xy[i * 2] = c.x;
							xy[i * 2 + 1] = c.y;
							inLockedMask[i] = c.isInLockedState ? 1 : 0;
						}

						const candidateIndexByRef = new Map<Candidate, number>();
						for (let i = 0; i < candidates.length; i++)
							candidateIndexByRef.set(candidates[i], i);

						const priorityOrder = new Uint32Array(priorityCandidates.length);
						for (let i = 0; i < priorityCandidates.length; i++) {
							const idx = candidateIndexByRef.get(priorityCandidates[i]);
							if (idx == null)
								throw new Error('[SearchResultsMap] missing candidate index (priority)');
							priorityOrder[i] = idx;
						}

						const inLockedOrder = new Uint32Array(inLockedCandidates.length);
						for (let i = 0; i < inLockedCandidates.length; i++) {
							const idx = candidateIndexByRef.get(inLockedCandidates[i]);
							if (idx == null)
								throw new Error('[SearchResultsMap] missing candidate index (inLocked)');
							inLockedOrder[i] = idx;
						}

						const outLockedOrder = new Uint32Array(outLockedCandidates.length);
						for (let i = 0; i < outLockedCandidates.length; i++) {
							const idx = candidateIndexByRef.get(outLockedCandidates[i]);
							if (idx == null)
								throw new Error('[SearchResultsMap] missing candidate index (outLocked)');
							outLockedOrder[i] = idx;
						}

						const inLockedShare = hasLockedStateSelection
							? getLockedStateMarkerShareForZoom(zoomRaw)
							: 1.0;
						const hardCapOutsideByInLocked = hasLockedStateSelection && zoomRaw <= 6;
						const cellSize = Math.max(6, minSeparationPx);

						const wasmResult = wasmGeo.pick_non_overlapping_indices(
							xy,
							priorityOrder,
							inLockedOrder,
							outLockedOrder,
							inLockedMask,
							maxPrimaryDots,
							inLockedShare,
							hardCapOutsideByInLocked,
							minSeparationSq,
							cellSize
						);

						const pickedIndices = wasmResult;
						for (let i = 0; i < pickedIndices.length; i++) {
							picked.push(candidates[pickedIndices[i]].contact);
						}
						didPickWithWasm = true;
					} catch (error: unknown) {
						// Ensure we don't fall through with a partial pick set.
						picked.length = 0;
						logWasmGeoRuntimeError(error);
					}
				}
			}

			if (!didPickWithWasm) {
				// Poisson-disc style selection using a grid acceleration structure.
				const cellSize = Math.max(6, minSeparationPx); // avoid tiny/degenerate cells
				const grid = new Map<string, Array<{ x: number; y: number }>>();
				let pickedInLockedStateCount = 0;

				const hasNeighborWithin = (
					cx: number,
					cy: number,
					x: number,
					y: number
				): boolean => {
					for (let dx = -1; dx <= 1; dx++) {
						for (let dy = -1; dy <= 1; dy++) {
							const arr = grid.get(`${cx + dx},${cy + dy}`);
							if (!arr) continue;
							for (const p of arr) {
								const ddx = x - p.x;
								const ddy = y - p.y;
								if (ddx * ddx + ddy * ddy < minSeparationSq) return true;
							}
						}
					}
					return false;
				};

				const pickFromCandidates = (cands: Candidate[], maxToPick: number) => {
					if (maxToPick <= 0) return;
					for (const c of cands) {
						if (picked.length >= maxPrimaryDots) break;
						if (maxToPick <= 0) break;
						const cx = Math.floor(c.x / cellSize);
						const cy = Math.floor(c.y / cellSize);
						if (hasNeighborWithin(cx, cy, c.x, c.y)) continue;

						picked.push(c.contact);
						if (c.isInLockedState) pickedInLockedStateCount += 1;
						maxToPick -= 1;
						const k = `${cx},${cy}`;
						const arr = grid.get(k);
						if (arr) arr.push({ x: c.x, y: c.y });
						else grid.set(k, [{ x: c.x, y: c.y }]);
					}
				};

				// Keep already-visible markers (plus any explicitly selected ones) stable while zooming:
				// rescale what’s already there, then add more markers as density allows.
				pickFromCandidates(priorityCandidates, maxPrimaryDots);

				// Then pick unselected markers, biasing toward the searched/locked state when zoomed out.
				const remainingBudget = maxPrimaryDots - picked.length;
				if (remainingBudget > 0) {
					if (hasLockedStateSelection) {
						const share = getLockedStateMarkerShareForZoom(zoomRaw);
						const inLockedBudget = Math.round(remainingBudget * share);
						let outLockedBudget = remainingBudget - inLockedBudget;

						const shouldHardCapOutside = zoomRaw <= 6;
						pickFromCandidates(inLockedCandidates, inLockedBudget);
						if (shouldHardCapOutside) {
							// Ensure the locked state visually "wins" when zoomed out.
							outLockedBudget = Math.min(outLockedBudget, pickedInLockedStateCount);
						}
						pickFromCandidates(outLockedCandidates, outLockedBudget);
					} else {
						// Default behavior: just keep a stable Poisson-disc subset.
						pickFromCandidates(inLockedCandidates, remainingBudget);
					}
				}
			}

			const nextVisibleContacts: ContactWithName[] = picked;

			// Stabilize ordering to reduce churn in marker source updates.
			nextVisibleContacts.sort((a, b) => a.id - b.id);

			const nextKey = nextVisibleContacts.map((c) => c.id).join(',');
			if (nextKey !== lastVisibleContactsKeyRef.current) {
				lastVisibleContactsKeyRef.current = nextKey;
				setVisibleContacts(nextVisibleContacts);
			}

			// Booking zoom-in extras: render additional booking categories at high zoom without
			// exceeding MAX_TOTAL_DOTS total markers.
			const shouldShowBookingExtras =
				isBookingSearch &&
				zoomRaw >= BOOKING_EXTRA_MARKERS_MIN_ZOOM &&
				bookingExtraContactsWithCoords.length > 0;
			let nextBookingExtraVisible: ContactWithName[] = [];
			if (shouldShowBookingExtras) {
				const remainingBudget = Math.max(
					0,
					MAX_TOTAL_DOTS - nextPromotionOverlayVisible.length - nextVisibleContacts.length
				);
				const maxExtraDots = Math.min(BOOKING_EXTRA_MARKERS_MAX_DOTS, remainingBudget);
				if (maxExtraDots > 0) {
					const extraInBounds: ContactWithName[] = [];
					for (const contact of bookingExtraContactsWithCoords) {
						const coords = getBookingExtraContactCoords(contact);
						if (!coords) continue;
						if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;
						extraInBounds.push(contact);
					}

					// Always prefer explicitly selected extra markers (so they don't disappear due to sampling).
					const priorityExtraIdSet = new Set<number>(selectedSet);
					if (hoveredId != null) priorityExtraIdSet.add(hoveredId);
					for (const id of bookingExtraVisibleIdSetRef.current)
						priorityExtraIdSet.add(id);
					const priorityExtraInBounds: ContactWithName[] = [];
					const unpriorityExtraInBounds: ContactWithName[] = [];
					for (const contact of extraInBounds) {
						if (priorityExtraIdSet.has(contact.id)) priorityExtraInBounds.push(contact);
						else unpriorityExtraInBounds.push(contact);
					}

					// Use the same sampling + non-overlap strategy as primary markers.
					const POOL_FACTOR = 4;
					const poolSlots = maxExtraDots * POOL_FACTOR;
					let pool: ContactWithName[] = [];
					if (extraInBounds.length <= poolSlots) {
						pool = extraInBounds;
					} else if (priorityExtraInBounds.length >= poolSlots) {
						pool = stableViewportSampleContacts(
							priorityExtraInBounds,
							getBookingExtraContactCoords,
							viewportBbox,
							poolSlots,
							`${seed}|bookingExtra|pool:priority`
						);
					} else {
						const remainingSlots = Math.max(0, poolSlots - priorityExtraInBounds.length);
						const sampledOther =
							unpriorityExtraInBounds.length <= remainingSlots
								? unpriorityExtraInBounds
								: stableViewportSampleContacts(
										unpriorityExtraInBounds,
										getBookingExtraContactCoords,
										viewportBbox,
										remainingSlots,
										`${seed}|bookingExtra|pool:other`
									);
						pool = [...priorityExtraInBounds, ...sampledOther];
					}

					type Candidate = {
						contact: ContactWithName;
						x: number;
						y: number;
						key: number;
						isSelected: boolean;
						isPriority: boolean;
					};
					const candidates: Candidate[] = [];
					const candidateContacts: ContactWithName[] = [];
					const candidateCoords: LatLngLiteral[] = [];
					for (const contact of pool) {
						const coords = getBookingExtraContactCoords(contact);
						if (!coords) continue;
						candidateContacts.push(contact);
						candidateCoords.push(coords);
					}
					const projectedCandidates = batchLatLngToWorldPixels(
						candidateCoords,
						worldSize
					);
					for (let i = 0; i < candidateContacts.length; i++) {
						const contact = candidateContacts[i];
						const projected = projectedCandidates[i];
						if (!projected) continue;
						candidates.push({
							contact,
							x: projected.x,
							y: projected.y,
							key: hashStringToUint32(`${seed}|bookingExtra|${contact.id}`),
							isSelected: selectedSet.has(contact.id),
							isPriority: priorityExtraIdSet.has(contact.id),
						});
					}

					// Stable ordering.
					candidates.sort((a, b) => a.key - b.key);

					const cellSize = Math.max(6, minSeparationPx);
					const grid = new Map<string, Array<{ x: number; y: number }>>();
					const pickedExtra: ContactWithName[] = [];
					const hasNeighborWithin = (
						cx: number,
						cy: number,
						x: number,
						y: number
					): boolean => {
						for (let dx = -1; dx <= 1; dx++) {
							for (let dy = -1; dy <= 1; dy++) {
								const arr = grid.get(`${cx + dx},${cy + dy}`);
								if (!arr) continue;
								for (const p of arr) {
									const ddx = x - p.x;
									const ddy = y - p.y;
									if (ddx * ddx + ddy * ddy < minSeparationSq) return true;
								}
							}
						}
						return false;
					};

					const priorityCandidates: Candidate[] = [];
					const otherCandidates: Candidate[] = [];
					for (const c of candidates) {
						if (c.isPriority) priorityCandidates.push(c);
						else otherCandidates.push(c);
					}

					priorityCandidates.sort((a, b) => {
						const aHovered = hoveredId != null && a.contact.id === hoveredId;
						const bHovered = hoveredId != null && b.contact.id === hoveredId;
						if (aHovered !== bHovered) return aHovered ? -1 : 1;
						if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
						return a.contact.id - b.contact.id;
					});

					const pickFromCandidates = (cands: Candidate[], maxToPick: number) => {
						if (maxToPick <= 0) return;
						for (const c of cands) {
							if (pickedExtra.length >= maxExtraDots) break;
							if (maxToPick <= 0) break;
							const cx = Math.floor(c.x / cellSize);
							const cy = Math.floor(c.y / cellSize);
							if (hasNeighborWithin(cx, cy, c.x, c.y)) continue;
							pickedExtra.push(c.contact);
							maxToPick -= 1;
							const k = `${cx},${cy}`;
							const arr = grid.get(k);
							if (arr) arr.push({ x: c.x, y: c.y });
							else grid.set(k, [{ x: c.x, y: c.y }]);
						}
					};

					// Keep already-visible/selected extras stable, then add more if we have budget.
					pickFromCandidates(priorityCandidates, maxExtraDots);
					pickFromCandidates(otherCandidates, maxExtraDots - pickedExtra.length);

					nextBookingExtraVisible = pickedExtra;
					nextBookingExtraVisible.sort((a, b) => a.id - b.id);
				}
			}

			const nextExtraKey = nextBookingExtraVisible.map((c) => c.id).join(',');
			if (nextExtraKey !== lastBookingExtraVisibleContactsKeyRef.current) {
				lastBookingExtraVisibleContactsKeyRef.current = nextExtraKey;
				setBookingExtraVisibleContacts(nextBookingExtraVisible);
			}

			// High-zoom gray-dot overlay: show *all* contacts in the viewport (excluding contacts
			// already rendered as primary dots or overlay pins).
			const shouldShowAllContactsOverlay =
				isAnySearch &&
				zoomRaw >= ALL_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM &&
				allContactsOverlayContactsWithCoords.length > 0;
			let nextAllContactsOverlayVisible: ContactWithName[] = [];
			if (shouldShowAllContactsOverlay) {
				const excludeIdSet = new Set<number>(baseContactIdSet);
				for (const c of nextBookingExtraVisible) excludeIdSet.add(c.id);
				for (const c of nextPromotionOverlayVisible) excludeIdSet.add(c.id);

				const inBounds: ContactWithName[] = [];
				for (const contact of allContactsOverlayContactsWithCoords) {
					if (excludeIdSet.has(contact.id)) continue;
					const coords = getAllContactsOverlayContactCoords(contact);
					if (!coords) continue;
					if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;
					// Never render gray dots in water (e.g. oceans). Treat "land" as inside any US state polygon.
					if (!isCoordsInAnyUsState(coords)) continue;
					inBounds.push(contact);
				}

				inBounds.sort((a, b) => a.id - b.id);
				nextAllContactsOverlayVisible = inBounds;
			}

			const nextAllKey = nextAllContactsOverlayVisible.map((c) => c.id).join(',');
			if (nextAllKey !== lastAllContactsOverlayVisibleContactsKeyRef.current) {
				lastAllContactsOverlayVisibleContactsKeyRef.current = nextAllKey;
				setAllContactsOverlayVisibleContacts(nextAllContactsOverlayVisible);
			}

			// Background dots are intentionally disabled.
		},
		[
			contactsWithCoords,
			getContactCoords,
			baseContactIdSet,
			selectedContacts,
			lockedStateKey,
			isCoordsInLockedState,
			isBookingSearch,
			bookingExtraContactsWithCoords,
			getBookingExtraContactCoords,
			isPromotionSearch,
			promotionOverlayContactsWithCoords,
			getPromotionOverlayContactCoords,
			isAnySearch,
			allContactsOverlayContactsWithCoords,
			getAllContactsOverlayContactCoords,
			isCoordsInAnyUsState,
		]
	);

	// Trigger background dots update when US state polygons become available or loading state changes
	useEffect(() => {
		if (!map) return;
		if (isBackgroundPresentation) return;
		recomputeViewportDots(map);
	}, [
		map,
		isBackgroundPresentation,
		isStateLayerReady,
		isLoading,
		recomputeViewportDots,
	]);

	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (isBackgroundPresentation) return;
		const onMoveEnd = () => {
			const zoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
			setZoomLevel(zoom);
			syncUsOnlyBasemapCartography(map);

			updateBookingExtraFetchBbox(map);
			updatePromotionOverlayFetchBbox(map);
			updateAllContactsOverlayFetchBbox(map);
			recomputeViewportDots(map);

			const bounds = map.getBounds();
			const center = map.getCenter();
			if (!bounds || !center) return;

			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat;
			const west = sw.lng;
			const north = ne.lat;
			const east = ne.lng;

			// Skip antimeridian-crossing viewports (not relevant for our UI).
			if (east < west) return;

			const centerCoords = { lat: center.lat, lng: center.lng };

			const selectedBounds = selectedAreaBoundsRef.current;
			const isCenterInSelectedBounds = selectedBounds
				? centerCoords.lat >= selectedBounds.south &&
					centerCoords.lat <= selectedBounds.north &&
					centerCoords.lng >= selectedBounds.west &&
					centerCoords.lng <= selectedBounds.east
				: null;

			const isCenterInSearchArea =
				typeof isCenterInSelectedBounds === 'boolean'
					? isCenterInSelectedBounds
					: isCoordsInLockedState(centerCoords);

			onViewportIdleRef.current?.({
				bounds: { south, west, north, east },
				center: centerCoords,
				zoom,
				isCenterInSearchArea,
			});
		};
		map.on('moveend', onMoveEnd);
		// Initial fill
		onMoveEnd();
		return () => {
			map.off('moveend', onMoveEnd);
		};
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		syncUsOnlyBasemapCartography,
		recomputeViewportDots,
		updateBookingExtraFetchBbox,
		updatePromotionOverlayFetchBbox,
		updateAllContactsOverlayFetchBbox,
	]);

	// Notify the parent as soon as the user starts interacting with the viewport.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isBackgroundPresentation) return;
		const onMoveStart = () => {
			onViewportInteractionRef.current?.();
		};
		map.on('movestart', onMoveStart);
		return () => {
			map.off('movestart', onMoveStart);
		};
	}, [map, isMapLoaded, isBackgroundPresentation]);

	// Rectangle selection handlers (Mapbox mouse events).
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isBackgroundPresentation) return;
		map.on('mousedown', handleMapMouseDown);
		map.on('mousemove', handleMapMouseMove);
		map.on('mouseup', handleMapMouseUp);
		return () => {
			map.off('mousedown', handleMapMouseDown);
			map.off('mousemove', handleMapMouseMove);
			map.off('mouseup', handleMapMouseUp);
		};
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		handleMapMouseDown,
		handleMapMouseMove,
		handleMapMouseUp,
	]);

	// Toggle map interaction mode for rectangle selection.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isBackgroundPresentation) return;
		const selecting = areaSelectionEnabled || isAreaSelecting;
		try {
			if (selecting) {
				map.dragPan.disable();
				map.dragRotate.disable();
			} else {
				map.dragPan.enable();
				map.dragRotate.enable();
			}
		} catch {
			// Ignore (handlers may not be ready yet).
		}
	}, [map, isMapLoaded, isBackgroundPresentation, areaSelectionEnabled, isAreaSelecting]);

	// Draw a gray outline around the *group of states* that have results.
	// We union the result states' polygons so the outline is one shape.
	useEffect(() => {
		if (!map || !isMapLoaded || !isStateLayerReady) return;

		// Hide state outlines when using rectangle selection (selectedAreaBounds is set)
		// Clear outlines while loading or if no result states
		if (isLoading || !resultStateKeysSignature || selectedAreaBounds) {
			clearResultsOutline();
			return;
		}

		let cancelled = false;

		const run = async () => {
			const wanted = new Set(resultStateKeys);
			const stateMultiPolygons: ClippingMultiPolygon[] = [];
			for (const key of wanted) {
				const entry = usStatesByKeyRef.current.get(key);
				if (entry?.multiPolygon) stateMultiPolygons.push(entry.multiPolygon);
			}

			// If we couldn't resolve any polygons, nothing to outline.
			if (stateMultiPolygons.length === 0) {
				clearResultsOutline();
				return;
			}

			// Union all selected state polygons into one (or multiple if disjoint) outline.
			let unioned: ClippingMultiPolygon | null = null;
			const wasmGeo = await ensureWasmGeoModuleLoaded();
			if (typeof wasmGeo?.union_multi_polygons === 'function') {
				try {
					const out = wasmGeo.union_multi_polygons(stateMultiPolygons);
					if (Array.isArray(out) && out.length) unioned = out;
				} catch (err) {
					logWasmGeoRuntimeError(err);
				}
			}

			// TypeScript fallback: lazy-load polygon-clipping only if needed.
			if (!unioned) {
				try {
					const { unionClippingMultiPolygons } = await import('@/utils/polygonClipping');
					unioned = unionClippingMultiPolygons(...stateMultiPolygons);
				} catch (err) {
					console.error(
						'Failed to build state outline union; falling back to per-state outline',
						err
					);
				}
			}

			if (cancelled) return;

			// Clear the previous outline polygons
			clearResultsOutline();

			const multiPolygonsToRender: ClippingMultiPolygon =
				unioned && Array.isArray(unioned) && unioned.length
					? unioned
					: stateMultiPolygons.flat();

			const outlineFc = createOutlineGeoJsonFromMultiPolygon(multiPolygonsToRender);
			const source = map.getSource(MAPBOX_SOURCE_IDS.resultsOutline) as
				| mapboxgl.GeoJSONSource
				| undefined;
			source?.setData(outlineFc as any);

			// Store the selected region (used to exclude background dots inside the outline).
			resultsSelectionMultiPolygonRef.current = multiPolygonsToRender;
			resultsSelectionBboxRef.current = bboxFromMultiPolygon(multiPolygonsToRender);
		};

		void run();

		return () => {
			cancelled = true;
		};
	}, [
		map,
		isMapLoaded,
		isStateLayerReady,
		isLoading,
		resultStateKeys,
		resultStateKeysSignature,
		clearResultsOutline,
		selectedAreaBounds,
	]);

	// Track the searched/locked state polygon for marker styling and the clipped state overlay.
	useEffect(() => {
		if (!map || !isMapLoaded || !isStateLayerReady) return;

		// Clear while loading
		if (isLoading) {
			clearSearchedStateOutline();
			lockedStateSelectionMultiPolygonRef.current = null;
			lockedStateSelectionBboxRef.current = null;
			lockedStateSelectionKeyRef.current = null;
			selectedStateMorphSourceRef.current = null;
			selectedStateDisplayMultiPolygonRef.current = null;
			selectedStateLastMorphTAppliedRef.current = Number.NaN;
			selectedStateOutlineSourceKeyRef.current = '';
			applySelectedStateGradientStateRef.current?.();
			recomputeViewportDots(map);
			return;
		}

		if (!lockedStateKey) {
			clearSearchedStateOutline();
			lockedStateSelectionMultiPolygonRef.current = null;
			lockedStateSelectionBboxRef.current = null;
			lockedStateSelectionKeyRef.current = null;
			selectedStateMorphSourceRef.current = null;
			selectedStateDisplayMultiPolygonRef.current = null;
			selectedStateLastMorphTAppliedRef.current = Number.NaN;
			selectedStateOutlineSourceKeyRef.current = '';
			applySelectedStateGradientStateRef.current?.();
			recomputeViewportDots(map);
			return;
		}

		const found = usStatesByKeyRef.current.get(lockedStateKey)?.multiPolygon ?? null;
		if (!found) {
			clearSearchedStateOutline();
			lockedStateSelectionMultiPolygonRef.current = null;
			lockedStateSelectionBboxRef.current = null;
			lockedStateSelectionKeyRef.current = null;
			selectedStateMorphSourceRef.current = null;
			selectedStateDisplayMultiPolygonRef.current = null;
			selectedStateLastMorphTAppliedRef.current = Number.NaN;
			selectedStateOutlineSourceKeyRef.current = '';
			applySelectedStateGradientStateRef.current?.();
			recomputeViewportDots(map);
			return;
		}

		// Store polygon selection for marker "inside/outside" styling (even if we don't draw the outline).
		lockedStateSelectionMultiPolygonRef.current = found;
		lockedStateSelectionBboxRef.current = found ? bboxFromMultiPolygon(found) : null;
		lockedStateSelectionKeyRef.current = lockedStateKey;
		selectedStateMorphSourceRef.current = createSelectedStateMorphSource(found);
		selectedStateDisplayMultiPolygonRef.current = null;
		selectedStateLastMorphTAppliedRef.current = Number.NaN;
		selectedStateOutlineSourceKeyRef.current = '';
		// The locked-state polygon is stored in refs (no rerender) — force a marker recompute
		// so low-zoom bias toward the locked state applies immediately.
		recomputeViewportDots(map);
		applySelectedStateGradientStateRef.current?.();
	}, [
		map,
		isMapLoaded,
		isStateLayerReady,
		isLoading,
		lockedStateKey,
		stateInteractionsEnabled,
		clearSearchedStateOutline,
		recomputeViewportDots,
	]);

	// Track if we've done the initial bounds fit
	const hasFitBoundsRef = useRef(false);
	// Track the last contacts count to detect when results change
	const lastContactsCountRef = useRef(0);
	// Track first contact ID to detect when search results have changed
	const lastFirstContactIdRef = useRef<number | null>(null);
	// Track last locked state to detect new searches
	const lastLockedStateKeyRef = useRef<string | null>(null);
	// Track whether we've successfully fit to the locked state for the current key.
	// This prevents a race where we fit to contacts before the state GeoJSON layer is ready,
	// and then never zoom to the intended state once the layer finishes loading.
	const lastFitToLockedStateKeyRef = useRef<string | null>(null);
	// In search mode, use the query string as the stable "search session" key. This avoids
	// treating resorted/streaming results as a brand new search (which causes map bouncing).
	const lastSearchQueryKeyRef = useRef<string | null>(null);
	// Debounce auto-fit camera moves so rapid result updates don't cause zoom oscillation.
	const autoFitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Helper to fit map bounds with padding
	const fitMapToBounds = useCallback(
		(
			mapInstance: mapboxgl.Map,
			contactsList: ContactWithName[],
			opts?: {
				durationMs?: number;
			}
		) => {
			if (contactsList.length === 0) return;

			let bounds: mapboxgl.LngLatBounds | null = null;
			for (const contact of contactsList) {
				const coords = getContactCoords(contact);
				if (!coords) continue;
				const ll: [number, number] = [coords.lng, coords.lat];
				if (!bounds) bounds = new mapboxgl.LngLatBounds(ll, ll);
				else bounds.extend(ll);
			}

			if (!bounds) return;

			const dur = opts?.durationMs ?? 650;
			mapInstance.fitBounds(bounds, {
				padding: { top: 50, right: 50, bottom: 50, left: 50 },
				maxZoom: AUTO_FIT_CONTACTS_MAX_ZOOM,
				pitch: 0,
				bearing: 0,
				offset: [0, 0],
				duration: dur,
				// Smooth ease-out for cinematic transitions (default Mapbox ease is too stiff at long durations).
				...(dur > 1000 ? { easing: mapboxEaseOutCubic } : {}),
			});
		},
		[getContactCoords]
	);

	// Helper to fit map to a state's bounds
	const fitMapToState = useCallback(
		(
			mapInstance: mapboxgl.Map,
			stateKey: string,
			opts?: {
				durationMs?: number;
			}
		) => {
			const entry = usStatesByKeyRef.current.get(stateKey);
			const bbox = entry?.bbox;
			if (!bbox) return false;

			const dur = opts?.durationMs ?? 650;
			mapInstance.fitBounds(
				[
					[bbox.minLng, bbox.minLat],
					[bbox.maxLng, bbox.maxLat],
				],
				{
					padding: { top: 100, right: 100, bottom: 100, left: 100 },
					maxZoom: AUTO_FIT_STATE_MAX_ZOOM,
					pitch: 0,
					bearing: 0,
					offset: [0, 0],
					duration: dur,
					// Smooth ease-out for cinematic transitions.
					...(dur > 1000 ? { easing: mapboxEaseOutCubic } : {}),
				}
			);

			return true;
		},
		[]
	);

	// Fit bounds when contacts with coordinates change (or when the locked state changes).
	// Important: we still want to zoom to the locked state even if 0 contacts are geocoded yet.
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		// Skip auto-fit when in background/decorative mode or when explicitly requested.
		if (isBackgroundPresentation) return;
		if (skipAutoFit) return;

		// If no locked state is active, allow the next locked-state search to refit to its state.
		if (!lockedStateKey) {
			lastFitToLockedStateKeyRef.current = null;
		}

		const searchQueryKey = (searchQuery ?? '').trim();
		const isSearchMode = searchQueryKey.length > 0;

		// Check if this is a new set of search results.
		// In search mode, rely on the query string (stable). Outside of search mode,
		// fall back to the first contact id heuristic.
		const currentFirstId = contactsWithCoords[0]?.id ?? null;
		const isNewSearch = isSearchMode
			? searchQueryKey !== lastSearchQueryKeyRef.current
			: currentFirstId !== lastFirstContactIdRef.current;

		// If a *new* search query was executed while already in interactive mode, mark it as
		// pending-cinematic so the eventual first auto-fit for that query uses the longer duration
		// (even if contacts/state geometry arrive a moment later).
		if (isSearchMode && isNewSearch) {
			pendingSearchQueryCinematicRef.current = { key: searchQueryKey, at: Date.now() };
		} else if (!isSearchMode) {
			pendingSearchQueryCinematicRef.current = null;
		}

		// Check if the locked state changed (indicating a new search in a different state)
		const isNewStateSearch = lockedStateKey !== lastLockedStateKeyRef.current;

		// Only treat the locked state as a *real* US state if it's a known state abbreviation.
		// This prevents endless "fit to locked state" attempts for values like "Near Me" or city strings.
		const lockedStateKeyIsUsState =
			!!lockedStateKey &&
			Object.prototype.hasOwnProperty.call(stateBadgeColorMap, lockedStateKey);

		const hasFitLockedStateForKey =
			lockedStateKeyIsUsState && lastFitToLockedStateKeyRef.current === lockedStateKey;
		// Even if we've already fit to contacts, we still want to zoom to the locked state
		// once the state layer finishes loading (prevents "random" fallback viewports).
		const shouldFitLockedState =
			lockedStateKeyIsUsState && isStateLayerReady && !hasFitLockedStateForKey;

		// Fit bounds if:
		// 1. We haven't fit bounds yet (initial load after geocoding)
		// 2. This is a completely new search (first contact ID changed)
		// 3. The number of contacts with coords has increased (more were geocoded)
		// 4. The contacts list changed significantly (new search)
		const coordsJustBecameAvailable =
			lastContactsCountRef.current === 0 && contactsWithCoords.length > 0;
		const shouldFitBounds = isSearchMode
			? // In search mode, fit once per search/where change. Avoid repeated fits as results stream/reorder.
				!hasFitBoundsRef.current ||
				isNewSearch ||
				isNewStateSearch ||
				(!lockedStateKeyIsUsState && coordsJustBecameAvailable)
			: // Outside search mode (campaign contacts view), keep the existing "results changed" behavior.
				!hasFitBoundsRef.current ||
				isNewSearch ||
				isNewStateSearch ||
				contactsWithCoords.length > lastContactsCountRef.current ||
				Math.abs(contactsWithCoords.length - lastContactsCountRef.current) > 5;

		// Keep new-search detection refs up to date even if we can't fit yet.
		if (isSearchMode) lastSearchQueryKeyRef.current = searchQueryKey;
		else lastFirstContactIdRef.current = currentFirstId;
		lastLockedStateKeyRef.current = lockedStateKey;

		if (!shouldFitBounds && !shouldFitLockedState) return;

		// If we can't fit to anything yet (no coords and no state geometry ready), wait for the next update.
		const canFitToStateNow =
			lockedStateKeyIsUsState && !!lockedStateKey && isStateLayerReady;
		const canFitToBoundsNow = contactsWithCoords.length > 0;
		if (!canFitToStateNow && !canFitToBoundsNow) return;
		// During a fresh dashboard search, React Query may briefly expose the previous result set
		// while the new request is loading. If we do not have a state target ready yet, wait for
		// fresh contacts instead of flying toward stale coordinates.
		const shouldWaitForFreshContactFit =
			Boolean(isLoading) &&
			isSearchMode &&
			!canFitToStateNow &&
			(isNewSearch || !hasFitBoundsRef.current);
		if (shouldWaitForFreshContactFit) return;

		// Debounce camera moves so rapid updates don't cause zoom in/out oscillation.
		if (autoFitTimeoutRef.current) {
			clearTimeout(autoFitTimeoutRef.current);
			autoFitTimeoutRef.current = null;
		}

		const pendingSearch = pendingSearchQueryCinematicRef.current;
		const isSearchQueryCinematic =
			!!pendingSearch &&
			pendingSearch.key === searchQueryKey &&
			Date.now() - pendingSearch.at < 10_000;

		const autoFitDebounceMs =
			cinematicAutoFitRef.current || isSearchQueryCinematic ? 0 : 180;
		autoFitTimeoutRef.current = setTimeout(() => {
			// If a cinematic fly-in is already underway, don't restart the camera animation.
			if (cinematicInFlightRef.current) return;

			let didFit = false;
			const cinematicNow = cinematicAutoFitRef.current;
			const pendingClick = pendingStateClickCinematicRef.current;
			const isUserStateClickCinematic =
				!!pendingClick &&
				!!lockedStateKey &&
				pendingClick.key === lockedStateKey &&
				Date.now() - pendingClick.at < 10_000;
			const pendingSearchNow = pendingSearchQueryCinematicRef.current;
			const isSearchQueryCinematicNow =
				!!pendingSearchNow &&
				pendingSearchNow.key === searchQueryKey &&
				Date.now() - pendingSearchNow.at < 10_000;
			const durationMs =
				cinematicNow || isUserStateClickCinematic || isSearchQueryCinematicNow
					? DASHBOARD_TO_INTERACTIVE_TRANSITION_MS
					: 650;

			// If there's a locked state (searched state) and this is a new search or new state,
			// zoom to that state first for a better initial view (works even with 0 geocoded contacts).
			// Only do this when the locked state is actually a US state; otherwise we'd keep trying
			// to fit "Near Me" / city strings and cause bouncing.
			if (
				lockedStateKeyIsUsState &&
				lockedStateKey &&
				isStateLayerReady &&
				(isNewSearch ||
					isNewStateSearch ||
					!hasFitBoundsRef.current ||
					shouldFitLockedState)
			) {
				const didFitToState = fitMapToState(map, lockedStateKey, { durationMs });
				// Mark as attempted so we never loop (even if something unexpected prevents a fit).
				lastFitToLockedStateKeyRef.current = lockedStateKey;
				if (didFitToState) {
					didFit = true;
				} else if (contactsWithCoords.length > 0) {
					// Fallback to fitting to contacts if state geometry not found
					fitMapToBounds(map, contactsWithCoords, { durationMs });
					didFit = true;
				}
			} else if (contactsWithCoords.length > 0) {
				fitMapToBounds(map, contactsWithCoords, { durationMs });
				didFit = true;
			}

			// Only mark as "fit" if we actually moved the camera.
			if (didFit) {
				// Clear the user-click flag once we successfully kicked off the cinematic state zoom.
				if (isUserStateClickCinematic) {
					pendingStateClickCinematicRef.current = null;
				}
				// Clear the pending search flag once we successfully kicked off the cinematic search sweep.
				if (isSearchQueryCinematicNow) {
					pendingSearchQueryCinematicRef.current = null;
				}
				hasFitBoundsRef.current = true;
				lastContactsCountRef.current = contactsWithCoords.length;

				// If we temporarily allowed zoom < MAP_MIN_ZOOM to start the animation from the
				// decorative globe, restore the normal constraint once the camera settles.
				if (pendingMinZoomRestoreRef.current && !hasAttachedMinZoomRestoreRef.current) {
					hasAttachedMinZoomRestoreRef.current = true;
					try {
						map.once('moveend', () => {
							hasAttachedMinZoomRestoreRef.current = false;
							pendingMinZoomRestoreRef.current = false;
							try {
								map.setMinZoom(MAP_MIN_ZOOM);
							} catch {}
						});
					} catch {
						// Non-fatal.
						hasAttachedMinZoomRestoreRef.current = false;
						pendingMinZoomRestoreRef.current = false;
					}
				}

				// After the first fly-in from the dashboard globe, revert to normal timings.
				if (cinematicNow) {
					cinematicAutoFitRef.current = false;
					// Lock out resize/re-fit calls for the full duration of the camera sweep
					// so nothing interrupts the smooth animation.
					cinematicInFlightRef.current = true;
					if (cinematicInFlightTimerRef.current)
						clearTimeout(cinematicInFlightTimerRef.current);
					cinematicInFlightTimerRef.current = setTimeout(() => {
						cinematicInFlightRef.current = false;
						cinematicInFlightTimerRef.current = null;
					}, durationMs + 100); // small buffer past the animation end
				}
			}

			if (autoFitTimeoutRef.current) {
				clearTimeout(autoFitTimeoutRef.current);
				autoFitTimeoutRef.current = null;
			}
		}, autoFitDebounceMs);

		return () => {
			if (autoFitTimeoutRef.current) {
				clearTimeout(autoFitTimeoutRef.current);
				autoFitTimeoutRef.current = null;
			}
		};
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		contactsWithCoords,
		fitMapToBounds,
		fitMapToState,
		lockedStateKey,
		isStateLayerReady,
		isLoading,
		skipAutoFit,
		searchQuery,
	]);

	// If auto-fit is disabled, ensure we don't have a queued fit from a prior render.
	useEffect(() => {
		if (!skipAutoFit) return;
		if (autoFitTimeoutRef.current) {
			clearTimeout(autoFitTimeoutRef.current);
			autoFitTimeoutRef.current = null;
		}
	}, [skipAutoFit]);

	// Reset bounds tracking when contacts prop is empty (preparing for new search)
	useEffect(() => {
		if (contacts.length === 0) {
			hasFitBoundsRef.current = false;
			lastContactsCountRef.current = 0;
			lastFirstContactIdRef.current = null;
			lastLockedStateKeyRef.current = null;
		}
	}, [contacts]);

	const handleMarkerClick = (contact: ContactWithName) => {
		onMarkerClick?.(contact);
		// Toggle selection when clicking on a marker.
		// - Always allow selection toggling for primary result set.
		// - In Booking mode, also allow toggling on the zoom-in "extra" pins (even though they
		//   come from the map-overlay endpoint rather than the primary results list).
		const isPrimaryResult = baseContactIdSet.has(contact.id);
		const isBookingExtraResult =
			isBookingSearch && bookingExtraVisibleContacts.some((c) => c.id === contact.id);
		// - At extremely high zoom, also allow toggling for the "all contacts" gray-dot overlay.
		const isAllContactsOverlayResult = allContactsOverlayVisibleIdSetRef.current.has(
			contact.id
		);
		if (isPrimaryResult || isBookingExtraResult || isAllContactsOverlayResult) {
			onToggleSelection?.(contact.id);
		}
	};

	const handleMarkerMouseOver = useCallback(
		(contact: ContactWithName, domEvent?: MouseEvent | TouchEvent) => {
			// Don't trigger hover interactions until sufficiently zoomed in
			if (zoomLevel < HOVER_INTERACTION_MIN_ZOOM) return;

			hoverSourceRef.current = 'map';
			if (hoverClearTimeoutRef.current) {
				clearTimeout(hoverClearTimeoutRef.current);
				hoverClearTimeoutRef.current = null;
			}
			// Clear any fading tooltip when hovering a new marker
			if (fadingTooltipTimeoutRef.current) {
				clearTimeout(fadingTooltipTimeoutRef.current);
				fadingTooltipTimeoutRef.current = null;
			}
			setFadingTooltipId(null);

			hoveredMarkerIdRef.current = contact.id;
			setHoveredMarkerId(contact.id);

			const point = getClientPointFromDomEvent(domEvent);
			const meta: MarkerHoverMeta | undefined = point
				? { clientX: point.x, clientY: point.y }
				: undefined;

			onMarkerHover?.(contact, meta);
		},
		[onMarkerHover, zoomLevel]
	);

	const handleMarkerMouseOut = useCallback(
		(contactId: number) => {
			if (hoverClearTimeoutRef.current) {
				clearTimeout(hoverClearTimeoutRef.current);
			}
			hoverClearTimeoutRef.current = setTimeout(() => {
				if (hoveredMarkerIdRef.current !== contactId) return;
				hoveredMarkerIdRef.current = null;
				hoverSourceRef.current = null;
				// Start fade-out: set the fading tooltip to the current one
				setFadingTooltipId(contactId);
				setHoveredMarkerId(null);
				onMarkerHover?.(null);
				// Clear fading tooltip after transition completes (150ms matches CSS)
				if (fadingTooltipTimeoutRef.current) {
					clearTimeout(fadingTooltipTimeoutRef.current);
				}
				fadingTooltipTimeoutRef.current = setTimeout(() => {
					setFadingTooltipId(null);
				}, 150);
			}, 60);
		},
		[onMarkerHover]
	);

	// Allow the parent (map results panel) to drive marker hover state without triggering
	// `onMarkerHover` (which is reserved for true map interactions).
	useEffect(() => {
		// Keep behavior consistent with map hover: don't show hover tooltips when too zoomed out.
		if (zoomLevel < HOVER_INTERACTION_MIN_ZOOM) {
			if (hoverSourceRef.current !== 'external') return;
			const prevId = hoveredMarkerIdRef.current;
			hoverSourceRef.current = null;
			hoveredMarkerIdRef.current = null;
			setHoveredMarkerId(null);
			if (prevId != null) {
				setFadingTooltipId(prevId);
				if (fadingTooltipTimeoutRef.current)
					clearTimeout(fadingTooltipTimeoutRef.current);
				fadingTooltipTimeoutRef.current = setTimeout(() => setFadingTooltipId(null), 150);
			} else {
				setFadingTooltipId(null);
			}
			return;
		}

		const nextId = externallyHoveredContactId ?? null;

		// If the map is actively hovering something, don't override it from the panel.
		if (hoverSourceRef.current === 'map') return;

		if (nextId == null) {
			if (hoverSourceRef.current !== 'external') return;
			const prevId = hoveredMarkerIdRef.current;
			if (hoverClearTimeoutRef.current) {
				clearTimeout(hoverClearTimeoutRef.current);
				hoverClearTimeoutRef.current = null;
			}
			hoverSourceRef.current = null;
			hoveredMarkerIdRef.current = null;
			setHoveredMarkerId(null);
			if (prevId != null) {
				setFadingTooltipId(prevId);
				if (fadingTooltipTimeoutRef.current)
					clearTimeout(fadingTooltipTimeoutRef.current);
				fadingTooltipTimeoutRef.current = setTimeout(() => setFadingTooltipId(null), 150);
			} else {
				setFadingTooltipId(null);
			}
			return;
		}

		// No-op if already externally hovering this id.
		if (hoverSourceRef.current === 'external' && hoveredMarkerIdRef.current === nextId)
			return;

		if (hoverClearTimeoutRef.current) {
			clearTimeout(hoverClearTimeoutRef.current);
			hoverClearTimeoutRef.current = null;
		}
		if (fadingTooltipTimeoutRef.current) {
			clearTimeout(fadingTooltipTimeoutRef.current);
			fadingTooltipTimeoutRef.current = null;
		}
		setFadingTooltipId(null);
		hoverSourceRef.current = 'external';
		hoveredMarkerIdRef.current = nextId;
		setHoveredMarkerId(nextId);
		// If the hovered contact isn't currently rendered due to sampling, recompute the viewport
		// so the hovered marker can be included (if it is in-bounds).
		if (
			map &&
			!visibleContactIdSetRef.current.has(nextId) &&
			!bookingExtraVisibleIdSetRef.current.has(nextId) &&
			!allContactsOverlayVisibleIdSetRef.current.has(nextId)
		) {
			recomputeViewportDots(map);
		}
	}, [externallyHoveredContactId, map, recomputeViewportDots, zoomLevel]);

	// Calculate marker scale based on zoom level
	// At zoom 4 (zoomed out): scale ~3, at zoom 14 (zoomed in): scale ~11
	const markerScale = useMemo(() => {
		return getResultDotScaleForZoom(zoomLevel);
	}, [zoomLevel]);

	// Curated cluster orbs: project each current morphed blob to screen space,
	// then fit one SVG gradient to each projected blob bounds.
	const applyCuratedOrbState = useCallback(() => {
		const m = mapRef.current;
		const orb = curatedOrbRef.current;
		if (!m || !orb) return;
		const zoom = m.getZoom() ?? MAP_DEFAULT_ZOOM;
		const bloomT = computeCuratedOrbT(zoom);
		const colorOpacity = CURATED_ORB_COLOR_BLEND_OPACITY * (1 - bloomT);
		const bloomOpacity = CURATED_ORB_BLOOM_OPACITY * bloomT;
		const shapeMultiPolygons = curatedBlobLngLatShapeMultiPolygonsRef.current;
		const targets = curatedBlobOrbTargetsRef.current;
		let hasVisibleSlot = false;

		for (let i = 0; i < CURATED_ORB_SLOT_COUNT; i++) {
			const ellipse = curatedOrbEllipseRefs.current[i];
			const bloomEllipse = curatedOrbBloomEllipseRefs.current[i];
			const gradient = curatedOrbGradientRefs.current[i];
			const bloomGradient = curatedOrbBloomGradientRefs.current[i];
			const clipPath = curatedOrbClipPathRefs.current[i];
			const hideSlot = () => {
				clipPath?.setAttribute('d', '');
				ellipse?.setAttribute('opacity', '0');
				bloomEllipse?.setAttribute('opacity', '0');
			};
			if (!ellipse || !bloomEllipse || !gradient || !bloomGradient || !clipPath) {
				continue;
			}

			const shapeMultiPolygon = shapeMultiPolygons[i];
			if (!shapeMultiPolygon?.length) {
				hideSlot();
				continue;
			}

			const target = targets[i];
			const frontHemisphereOpacity = computeGlobeFrontHemisphereOpacity(
				m,
				target?.center ?? null,
				target?.radiusKm ?? null,
				zoom
			);
			if (frontHemisphereOpacity <= 0.006) {
				hideSlot();
				continue;
			}

			const projectedClip = buildScreenPathFromLngLatMultiPolygon(
				m,
				shapeMultiPolygon
			);
			if (!projectedClip) {
				hideSlot();
				continue;
			}

			const width = projectedClip.maxX - projectedClip.minX;
			const height = projectedClip.maxY - projectedClip.minY;
			if (
				!Number.isFinite(width) ||
				!Number.isFinite(height) ||
				width <= 0 ||
				height <= 0
			) {
				hideSlot();
				continue;
			}

			const halfWidth = width / 2;
			const halfHeight = height / 2;
			const centerX = projectedClip.minX + halfWidth;
			const centerY = projectedClip.minY + halfHeight;
			ellipse.setAttribute('cx', centerX.toFixed(2));
			ellipse.setAttribute('cy', centerY.toFixed(2));
			bloomEllipse.setAttribute('cx', centerX.toFixed(2));
			bloomEllipse.setAttribute('cy', centerY.toFixed(2));
			ellipse.setAttribute(
				'rx',
				(halfWidth * CURATED_ORB_ELLIPSE_RX_RATIO).toFixed(2)
			);
			ellipse.setAttribute(
				'ry',
				(halfHeight * CURATED_ORB_ELLIPSE_RY_RATIO).toFixed(2)
			);
			const bloomRadius = Math.max(halfWidth, halfHeight);
			bloomEllipse.setAttribute('rx', bloomRadius.toFixed(2));
			bloomEllipse.setAttribute('ry', bloomRadius.toFixed(2));
			gradient.setAttribute(
				'gradientTransform',
				`translate(${centerX.toFixed(2)} ${centerY.toFixed(2)}) rotate(${CURATED_ORB_GRADIENT_ROTATION_DEG}) scale(${(
					halfWidth * CURATED_ORB_GRADIENT_SCALE_X_RATIO
				).toFixed(2)} ${(halfHeight * CURATED_ORB_GRADIENT_SCALE_Y_RATIO).toFixed(2)})`
			);
			bloomGradient.setAttribute(
				'gradientTransform',
				`translate(${centerX.toFixed(2)} ${centerY.toFixed(2)}) scale(${bloomRadius.toFixed(2)})`
			);
			clipPath.setAttribute('d', projectedClip.d);
			ellipse.setAttribute(
				'opacity',
				(colorOpacity * frontHemisphereOpacity).toFixed(3)
			);
			bloomEllipse.setAttribute(
				'opacity',
				(bloomOpacity * frontHemisphereOpacity).toFixed(3)
			);
			hasVisibleSlot = true;
		}

		orb.style.opacity = hasVisibleSlot ? '1' : '0';
	}, []);
	applyCuratedOrbStateRef.current = applyCuratedOrbState;

	// Vertex-by-vertex morph of the curated blob outline toward a circle of
	// `radiusMerc` around `centerMerc`. Each vertex moves along its own ray
	// from the centroid, so a non-circular blob smoothly widens out into the
	// target circle as `t` grows from 0 → 1. Even when the morph geometry
	// itself is unchanged, the SVG clip must still be reprojected on every
	// render frame so it stays locked to Mapbox's fast camera transforms.
	const applyBlobMorph = useCallback(() => {
		const m = mapRef.current;
		if (!m) return;
		const morphSources = naturalBlobMorphSourceRef.current;
		const source = m.getSource(MAPBOX_SOURCE_IDS.curatedBlob) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;
		if (!morphSources?.length) {
			lastBlobMorphTAppliedRef.current = Number.NaN;
			curatedBlobLngLatMultiPolygonRef.current = null;
			curatedBlobLngLatShapeMultiPolygonsRef.current = [];
			return;
		}
		const zoom = m.getZoom() ?? MAP_DEFAULT_ZOOM;
		const t = computeCuratedOrbT(zoom);
		if (Math.abs(t - lastBlobMorphTAppliedRef.current) < 0.001) {
			applyCuratedOrbStateRef.current?.();
			return;
		}
		lastBlobMorphTAppliedRef.current = t;

		const morphedShapes = morphSources.map(
			({ mercatorMultiPolygon, centerMerc, radiusMerc }) =>
				t <= 0
					? mercatorMultiPolygon
					: mercatorMultiPolygon.map((polygon) =>
							polygon.map((ring) =>
								ring.map((point): [number, number] => {
									const dx = point[0] - centerMerc.x;
									const dy = point[1] - centerMerc.y;
									if (dx === 0 && dy === 0) return [point[0], point[1]];
									const angle = Math.atan2(dy, dx);
									const tx = centerMerc.x + Math.cos(angle) * radiusMerc;
									const ty = centerMerc.y + Math.sin(angle) * radiusMerc;
									return [
										point[0] + (tx - point[0]) * t,
										point[1] + (ty - point[1]) * t,
									];
								})
							)
					  )
		);
		const lngLatShapes = morphedShapes.map(mercatorMultiPolygonToLngLat);
		const lngLat = lngLatShapes.flat();
		curatedBlobLngLatShapeMultiPolygonsRef.current = lngLatShapes;
		curatedBlobLngLatMultiPolygonRef.current = lngLat;
		const fc = createOutlineGeoJsonFromMultiPolygon(lngLat);
		source.setData(fc as GeoJSON.FeatureCollection);
		applyCuratedOrbStateRef.current?.();
	}, []);
	applyBlobMorphRef.current = applyBlobMorph;

	// Softbox lighting overlay opacity is owned entirely by `applyLightingOverlayOpacity`
	// below, which fires on every `zoom` event and on mood changes. We deliberately do
	// NOT render an `opacity` value into the JSX style: any React re-render during a
	// zoom gesture would otherwise overwrite the smooth imperative update with the stale
	// `zoomLevel`-derived value (zoomLevel only updates on `moveend`).

	const applyLightingOverlayOpacity = useCallback(() => {
		if (!mapRef.current) return;
		const zoom = mapRef.current.getZoom() ?? MAP_DEFAULT_ZOOM;
		const base = computeLightingOverlayOpacity(zoom);
		const cfg = weatherMoodConfigRef.current;
		const rawNight = clamp(nightTRef.current, 0, 1);
		const night = computeMoodVisualNightT(nightTRef.current, cfg);
		const sunTransitionVisual = getSunTransitionVisualState(
			nightLightingRef.current,
			Date.now()
		);
		const sunTransitionOpacity = computeSunTransitionLayerOpacity(
			sunTransitionVisual,
			zoom
		);
		const sunTransitionCatchlightOpacity = clamp(
			sunTransitionOpacity * SUN_TRANSITION_CLOUD_CATCHLIGHT_OPACITY_MULT,
			0,
			1
		);
		const sunSpaceGlowOpacity = clamp(
			sunTransitionOpacity * SUN_TRANSITION_SPACE_GLOW_OPACITY_MULT,
			0,
			0.18
		);
		const sunWashSuppression = smoothstep(0.02, 0.22, sunTransitionOpacity);
		const foregroundSunMul = 1 - sunWashSuppression * 0.78;

		const trueNightEase = rawNight * rawNight * (3 - 2 * rawNight);
		// Let night take over the lighting direction: the warm daytime key fades
		// out while the moonlit upper-right key and lower-left shadow fade in.
		const keyNightMul =
			1 - trueNightEase * (1 - clamp(NIGHT_WARM_KEY_MIN_MUL, 0, 1));
		const shadowNightMul =
			1 - trueNightEase * (1 - clamp(NIGHT_SHADOW_OVERLAY_MUL_MIN, 0, 1));

		const warmKeyOpacity = clamp(
			base * cfg.warmSoftboxOpacityMultiplier * keyNightMul * foregroundSunMul,
			0,
			1
		);
		const darkKeyOpacity = clamp(
			base * cfg.darkSoftboxOpacityMultiplier * keyNightMul,
			0,
			1
		);
		const shadowOpacity = clamp(
			base * cfg.shadowOpacityMultiplier * shadowNightMul * (1 - sunWashSuppression * 0.9),
			0,
			1
		);
		if (lightingOverlayWarmKeyRef.current)
			lightingOverlayWarmKeyRef.current.style.opacity = String(warmKeyOpacity);
		if (lightingOverlayDarkKeyRef.current)
			lightingOverlayDarkKeyRef.current.style.opacity = String(darkKeyOpacity);
		if (lightingOverlayShadowRef.current)
			lightingOverlayShadowRef.current.style.opacity = String(shadowOpacity);
		if (lightingOverlaySunSpaceGlowRef.current)
			lightingOverlaySunSpaceGlowRef.current.style.opacity = String(sunSpaceGlowOpacity);

		const nightMoonlightOpacity = clamp(
			base *
				trueNightEase *
				NIGHT_MOONLIGHT_KEY_OPACITY *
				(1 - sunWashSuppression * 0.72),
			0,
			1
		);
		const nightLowerLeftShadowOpacity = clamp(
			base *
				trueNightEase *
				NIGHT_LOWER_LEFT_SHADOW_OPACITY *
				(1 - sunWashSuppression * 0.55),
			0,
			1
		);
		if (lightingOverlayNightMoonlightRef.current) {
			lightingOverlayNightMoonlightRef.current.style.opacity =
				String(nightMoonlightOpacity);
		}
		if (lightingOverlayNightLowerLeftShadowRef.current) {
			lightingOverlayNightLowerLeftShadowRef.current.style.opacity = String(
				nightLowerLeftShadowOpacity
			);
		}

		// Globe-zoom only via `base` (full at zoom ≤2.5, gone by zoom 5), and only
		// during true full day. Intentionally NOT gated on presentation: the shade is
		// a globe-surface effect that's just as valid in the interactive results map
		// when the user is zoomed all the way out to the globe view.
		const dayShadeOpacity = clamp(
			base *
				DAY_FAR_SIDE_SHADE_OPACITY_MULTIPLIER *
				(1 - smoothstep(0.02, 0.22, rawNight)),
			0,
			1
		);
		try {
			const m = mapRef.current;
			if (m?.getLayer(MAPBOX_LAYER_IDS.dayFarSideShade)) {
				m.setPaintProperty(
					MAPBOX_LAYER_IDS.dayFarSideShade,
					'raster-opacity',
					dayShadeOpacity
				);
			}
			if (m?.getLayer(MAPBOX_LAYER_IDS.sunTransition)) {
				m.setPaintProperty(
					MAPBOX_LAYER_IDS.sunTransition,
					'raster-opacity',
					sunTransitionOpacity
				);
			}
			if (m?.getLayer(MAPBOX_LAYER_IDS.sunTransitionCloudCatchlight)) {
				m.setPaintProperty(
					MAPBOX_LAYER_IDS.sunTransitionCloudCatchlight,
					'raster-opacity',
					sunTransitionCatchlightOpacity
				);
			}
		} catch {
			// Non-fatal.
		}

		// Night rear-lighting: deep silhouette + moon rim.
		const nightBase = base * night;
		const shadeOpacity = clamp(nightBase * NIGHT_FACE_SHADE_OPACITY, 0, 1);
		const rimOpacity = clamp(nightBase * NIGHT_MOON_RIM_OPACITY, 0, 1);
		if (lightingOverlayNightShadeRef.current)
			lightingOverlayNightShadeRef.current.style.opacity = String(shadeOpacity);
		if (lightingOverlayMoonRimRef.current)
			lightingOverlayMoonRimRef.current.style.opacity = String(rimOpacity);

		// Night vignette: drives off `trueNightEase` (ignores the per-mood visual
		// floor used for `night`) so it only appears in true full night, then
		// holds steady across all zooms — vignettes shouldn't fade as you zoom in.
		const vignetteOpacity = clamp(trueNightEase * NIGHT_VIGNETTE_OPACITY, 0, 1);
		if (lightingOverlayNightVignetteRef.current)
			lightingOverlayNightVignetteRef.current.style.opacity = String(vignetteOpacity);

		// US night lights (Mapbox raster dot-tiles layer) — helps keep the globe readable at night
		// without turning the whole basemap into a "night mode" style.
		const zoomOutLift = computeNightLightsZoomOutLift(zoom);
		const loadT =
			clamp(nightLightsLoadTRef.current, 0, 1) *
			clamp(nightLightsZoomLoadTRef.current, 0, 1);
		// Make lights appear earlier in dusk/dawn (and feel more "present" at night)
		// without showing them during full daylight.
		const nightForLights = Math.pow(night, 0.65);
		const lightsBase =
			nightForLights *
			(NIGHT_US_LIGHTS_OPACITY + zoomOutLift) *
			computeNightLightsFade(zoom) *
			loadT;

		// Intro: reveal alpha-biased tiles first (reads as dot-by-dot sweep), then crossfade
		// to the real tiles so final brightness/density is correct.
		const introDone = nightLightsIntroDoneRef.current;
		const introRevealT = clamp(nightLightsIntroRevealTRef.current, 0, 1);
		const introCrossT = clamp(nightLightsIntroCrossfadeTRef.current, 0, 1);
		let introFinalMul = 1;
		let introRevealMul = 0;
		if (!introDone) {
			if (introCrossT > 0) {
				introFinalMul = introCrossT;
				introRevealMul = 1 - introCrossT;
			} else {
				introFinalMul = 0;
				introRevealMul = introRevealT;
			}
		}

		const crispMul = computeNightLightsCrispMul(zoom);
		const closeGlowMul = computeNightLightsCloseGlowMul(zoom);

		const finalCrispOpacity = clamp(lightsBase * introFinalMul * crispMul, 0, 1);
		const finalSpaceGlowOpacity = clamp(
			lightsBase *
				NIGHT_LIGHTS_SPACE_GLOW_OPACITY_MULT *
				computeNightLightsSpaceGlowFade(zoom) *
				introFinalMul,
			0,
			1
		);
		const finalSpaceGlowOpacity2 = clamp(
			finalSpaceGlowOpacity * NIGHT_LIGHTS_SPACE_GLOW_EXTRA_PASS_OPACITY_MUL,
			0,
			1
		);
		const finalGlowOpacity = clamp(
			lightsBase *
				NIGHT_LIGHTS_GLOW_OPACITY_MULT *
				computeNightLightsGlowFade(zoom) *
				introFinalMul,
			0,
			1
		);
		const finalCloseGlowOpacity = clamp(
			lightsBase * NIGHT_LIGHTS_CLOSE_GLOW_OPACITY_MULT * closeGlowMul * introFinalMul,
			0,
			1
		);
		const revealCrispOpacity = clamp(lightsBase * introRevealMul * crispMul, 0, 1);
		const revealGlowOpacity = clamp(
			lightsBase *
				NIGHT_LIGHTS_GLOW_OPACITY_MULT *
				computeNightLightsGlowFade(zoom) *
				introRevealMul,
			0,
			1
		);
		try {
			const m = mapRef.current;
			if (m && m.getLayer(MAPBOX_LAYER_IDS.nightLightsSpaceGlow)) {
				(m as any).setPaintProperty(
					MAPBOX_LAYER_IDS.nightLightsSpaceGlow,
					'raster-opacity',
					finalSpaceGlowOpacity
				);
			}
			if (m && m.getLayer(MAPBOX_LAYER_IDS.nightLightsSpaceGlow2)) {
				(m as any).setPaintProperty(
					MAPBOX_LAYER_IDS.nightLightsSpaceGlow2,
					'raster-opacity',
					finalSpaceGlowOpacity2
				);
			}
			if (m && m.getLayer(MAPBOX_LAYER_IDS.nightLightsRevealGlow)) {
				(m as any).setPaintProperty(
					MAPBOX_LAYER_IDS.nightLightsRevealGlow,
					'raster-opacity',
					revealGlowOpacity
				);
			}
			if (m && m.getLayer(MAPBOX_LAYER_IDS.nightLightsReveal)) {
				(m as any).setPaintProperty(
					MAPBOX_LAYER_IDS.nightLightsReveal,
					'raster-opacity',
					revealCrispOpacity
				);
			}
			if (m && m.getLayer(MAPBOX_LAYER_IDS.nightLightsGlow)) {
				(m as any).setPaintProperty(
					MAPBOX_LAYER_IDS.nightLightsGlow,
					'raster-opacity',
					finalGlowOpacity
				);
			}
			if (m && m.getLayer(MAPBOX_LAYER_IDS.nightLightsCloseGlow)) {
				(m as any).setPaintProperty(
					MAPBOX_LAYER_IDS.nightLightsCloseGlow,
					'raster-opacity',
					finalCloseGlowOpacity
				);
			}
			if (m && m.getLayer(MAPBOX_LAYER_IDS.nightLights)) {
				(m as any).setPaintProperty(
					MAPBOX_LAYER_IDS.nightLights,
					'raster-opacity',
					finalCrispOpacity
				);
			}
		} catch {
			// Non-fatal.
		}

		// Hot wash — uniform warm-white screen-blend overlay that brightens the
		// whole globe. Gated on the mood's `hotWashEligible` flag (only sunny/normal)
		// so cloudy/stormy/snowy don't get a brightening lift, and on the raw
		// clock night so a mood's `nightVisualBlend` floor doesn't suppress it.
		const brightSoftboxStrength = clamp(cfg.warmSoftboxOpacityMultiplier, 0, 1);
		const hotActive = isHotRef.current && cfg.hotWashEligible && rawNight < 0.12;
		const washOpacity = hotActive
			? base * HOT_WASH_OPACITY * brightSoftboxStrength * foregroundSunMul
			: 0;
		if (lightingOverlayHotWashRef.current)
			lightingOverlayHotWashRef.current.style.opacity = String(washOpacity);

		// Gloom wash — uniform dark multiply-blend overlay for stormy that
		// persists into city zoom (longer fade curve than the softbox/shadow).
		// Bright moods have gloomWashOpacity=0 so this is a no-op for them.
		const gloomFade = computeGloomWashFade(zoom);
		const gloomOpacity = clamp(
			(cfg.gloomWashOpacity + night * NIGHT_GLOOM_WASH_OPACITY) * gloomFade,
			0,
			0.62
		);
		if (lightingOverlayGloomWashRef.current)
			lightingOverlayGloomWashRef.current.style.opacity = String(gloomOpacity);

		const nightDarkT = night * night * (3 - 2 * night);
		const nightDarkOpacity = clamp(
			nightDarkT * NIGHT_DARK_WASH_OPACITY * gloomFade,
			0,
			NIGHT_DARK_WASH_OPACITY
		);
		if (lightingOverlayNightDarkWashRef.current)
			lightingOverlayNightDarkWashRef.current.style.opacity = String(nightDarkOpacity);
	}, []);

	const repaintSunTransitionCanvas = useCallback((nowMs: number, force = false) => {
		const sunCanvas = sunTransitionCanvasRef.current;
		if (!sunCanvas) return false;

		const visual = getSunTransitionVisualState(nightLightingRef.current, nowMs);
		const paintKey = visual
			? [
					visual.phase,
					Math.round(visual.progress * SUN_TRANSITION_PROGRESS_PAINT_STEPS),
					Math.round(visual.centerLng * 10),
				].join(':')
			: 'off';

		if (force || paintKey !== sunTransitionPaintKeyRef.current) {
			if (!paintSunTransitionCanvas(sunCanvas, visual)) return false;
			sunTransitionPaintKeyRef.current = paintKey;
			try {
				const m = mapRef.current;
				(
					m?.getSource(MAPBOX_SOURCE_IDS.sunTransition) as
						| { play?: () => void }
						| undefined
				)?.play?.();
				m?.triggerRepaint();
			} catch {
				// Non-fatal.
			}
		}

		return Boolean(visual);
	}, []);

	useEffect(() => {
		const refreshSource = () => {
			try {
				const source = map?.getSource(MAPBOX_SOURCE_IDS.dayFarSideShade) as
					| { play?: () => void }
					| undefined;
				source?.play?.();
				map?.triggerRepaint();
			} catch {
				// Non-fatal.
			}
		};

		const repaint = (nowMs: number) => {
			const shadeCanvas = dayFarSideShadeCanvasRef.current;
			if (!shadeCanvas) return false;

			const nextCenterLng = getDayFarSideShadeCenterLng(
				getDayFarSideShadeDayProgress(dayFarSideShadeLightingRef.current, nowMs)
			);
			const centerDelta = angularLngDistanceDeg(
				nextCenterLng,
				dayFarSideShadeCenterLngRef.current
			);
			const needsPaint =
				centerDelta >= DAY_FAR_SIDE_SHADE_MIN_REPAINT_DELTA_DEG ||
				shadeCanvas.width !== DAY_FAR_SIDE_SHADE_CANVAS_SIZE_PX ||
				shadeCanvas.height !== DAY_FAR_SIDE_SHADE_CANVAS_SIZE_PX;

			if (needsPaint) {
				if (!paintDayFarSideShadeCanvas(shadeCanvas, nextCenterLng)) return false;
				dayFarSideShadeCenterLngRef.current = nextCenterLng;
			}

			refreshSource();
			if (map && isMapLoaded) applyLightingOverlayOpacity();
			return true;
		};

		repaint(Date.now());
		if (!map || !isMapLoaded || typeof window === 'undefined') return;

		let timeoutId: number | null = null;
		let rafId: number | null = null;
		let canceled = false;

		const schedule = () => {
			if (canceled) return;
			timeoutId = window.setTimeout(() => {
				timeoutId = null;
				rafId = window.requestAnimationFrame(() => {
					rafId = null;
					if (canceled) return;
					repaint(Date.now());
					schedule();
				});
			}, DAY_FAR_SIDE_SHADE_REPAINT_MS);
		};

		schedule();
		return () => {
			canceled = true;
			if (timeoutId != null) window.clearTimeout(timeoutId);
			if (rafId != null) window.cancelAnimationFrame(rafId);
		};
	}, [
		map,
		isMapLoaded,
		applyLightingOverlayOpacity,
		dayFarSideShadePhase,
		dayFarSideShadePhaseStartMs,
		dayFarSideShadePhaseEndMs,
	]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;
		ensureMapboxSourcesAndLayers(map);
		repaintSunTransitionCanvas(Date.now(), true);
		applyLightingOverlayOpacity();
	}, [
		map,
		isMapLoaded,
		ensureMapboxSourcesAndLayers,
		repaintSunTransitionCanvas,
		applyLightingOverlayOpacity,
		sunTransitionPhase,
		sunTransitionPhaseStartMs,
		sunTransitionPhaseEndMs,
	]);

	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;

		applyLightingOverlayOpacity();
		map.on('zoom', applyLightingOverlayOpacity);
		return () => {
			map.off('zoom', applyLightingOverlayOpacity);
		};
	}, [map, isMapLoaded, applyLightingOverlayOpacity]);

	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;

		applyBlobMorph();
		// `render` keeps the DOM SVG clip in the same frame cadence as Mapbox's
		// camera transform, which prevents the gradient from trailing during
		// quick pinch/scroll zooms.
		map.on('render', applyBlobMorph);
		return () => {
			map.off('render', applyBlobMorph);
		};
	}, [map, isMapLoaded, applyBlobMorph]);

	// Fade in night lights once their tiles are ready to avoid the initial "patchy" look.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (!contactLightsTilesEnabled) return;
		if (typeof window === 'undefined') return;

		nightLightsLoadTRef.current = 0;
		nightLightsLoadStartedRef.current = false;
		nightLightsZoomLoadTRef.current = 1;
		nightLightsIntroRevealTRef.current = 0;
		nightLightsIntroCrossfadeTRef.current = 0;
		nightLightsIntroDoneRef.current = false;
		applyLightingOverlayOpacity();

		let cancelled = false;
		let rafId: number | null = null;
		let intervalId: number | null = null;
		let attempts = 0;

		const clearTimers = () => {
			if (intervalId != null) window.clearInterval(intervalId);
			if (rafId != null) window.cancelAnimationFrame(rafId);
			intervalId = null;
			rafId = null;
		};

		const startFallbackFade = () => {
			if (nightLightsLoadStartedRef.current) return;
			nightLightsLoadStartedRef.current = true;
			nightLightsIntroDoneRef.current = true;
			const start = performance.now();
			const tick = () => {
				if (cancelled) return;
				const now = performance.now();
				const t = clamp((now - start) / NIGHT_LIGHTS_LOAD_FADE_MS, 0, 1);
				const inv = 1 - t;
				const eased = 1 - inv * inv * inv;
				nightLightsLoadTRef.current = eased;
				applyLightingOverlayOpacity();
				if (t < 1) rafId = window.requestAnimationFrame(tick);
			};
			rafId = window.requestAnimationFrame(tick);
		};

		const startIntroReveal = () => {
			if (nightLightsLoadStartedRef.current) return;
			nightLightsLoadStartedRef.current = true;
			// Once tiles are ready, unlock visibility and run the west->east reveal.
			nightLightsLoadTRef.current = 1;
			nightLightsIntroRevealTRef.current = 0;
			nightLightsIntroCrossfadeTRef.current = 0;
			nightLightsIntroDoneRef.current = false;

			const startReveal = performance.now();
			const tickReveal = () => {
				if (cancelled) return;
				const now = performance.now();
				const t = clamp((now - startReveal) / NIGHT_LIGHTS_INTRO_REVEAL_MS, 0, 1);
				// Ease-in-out: lets the left edge "sparkle" before ramping across.
				const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
				nightLightsIntroRevealTRef.current = eased;
				applyLightingOverlayOpacity();
				if (t < 1) {
					rafId = window.requestAnimationFrame(tickReveal);
					return;
				}

				// Crossfade to the real tiles so final brightness is correct everywhere.
				const startCross = performance.now();
				const tickCross = () => {
					if (cancelled) return;
					const now2 = performance.now();
					const t2 = clamp((now2 - startCross) / NIGHT_LIGHTS_INTRO_CROSSFADE_MS, 0, 1);
					// Ease-out cubic.
					const inv = 1 - t2;
					const eased2 = 1 - inv * inv * inv;
					nightLightsIntroCrossfadeTRef.current = eased2;
					applyLightingOverlayOpacity();
					if (t2 < 1) {
						rafId = window.requestAnimationFrame(tickCross);
						return;
					}
					nightLightsIntroDoneRef.current = true;
					applyLightingOverlayOpacity();
				};
				rafId = window.requestAnimationFrame(tickCross);
			};

			rafId = window.requestAnimationFrame(tickReveal);
		};

		const poll = () => {
			if (cancelled) return;
			attempts++;
			const m = mapRef.current;
			if (!m) return;
			let readyFinal = false;
			let readyReveal = false;
			const hasRevealSource = Boolean(
				(m as any).getSource?.(MAPBOX_SOURCE_IDS.nightLightsReveal)
			);
			try {
				readyFinal = m.isSourceLoaded(MAPBOX_SOURCE_IDS.nightLights);
			} catch {
				readyFinal = false;
			}
			if (hasRevealSource) {
				try {
					readyReveal = m.isSourceLoaded(MAPBOX_SOURCE_IDS.nightLightsReveal);
				} catch {
					readyReveal = false;
				}
			}

			const ready = hasRevealSource ? readyFinal && readyReveal : readyFinal;

			// If we can't confirm readiness quickly, still start after a short grace period.
			if (ready || attempts >= 28) {
				clearTimers();
				if (hasRevealSource) startIntroReveal();
				else startFallbackFade();
			}
		};

		intervalId = window.setInterval(poll, NIGHT_LIGHTS_LOAD_POLL_MS);
		poll();

		return () => {
			cancelled = true;
			clearTimers();
		};
	}, [map, isMapLoaded, contactLightsTilesEnabled, applyLightingOverlayOpacity]);

	// During zooming, Mapbox will temporarily resample/scale raster tiles while new tiles stream in.
	// For this dot overlay that can read as a "hairy" texture, we dim it slightly during the
	// interaction and ease it back in once the source reports loaded.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (!contactLightsTilesEnabled) return;
		if (typeof window === 'undefined') return;

		let cancelled = false;
		let rafId: number | null = null;
		let intervalId: number | null = null;
		let attempts = 0;

		const clearTimers = () => {
			if (intervalId != null) window.clearInterval(intervalId);
			if (rafId != null) window.cancelAnimationFrame(rafId);
			intervalId = null;
			rafId = null;
		};

		const fadeTo = (target: number, ms: number) => {
			clearTimers();
			const startT = performance.now();
			const from = clamp(nightLightsZoomLoadTRef.current, 0, 1);
			const to = clamp(target, 0, 1);
			const tick = () => {
				if (cancelled) return;
				const now = performance.now();
				const t = clamp((now - startT) / ms, 0, 1);
				// Ease-out cubic.
				const inv = 1 - t;
				const eased = 1 - inv * inv * inv;
				nightLightsZoomLoadTRef.current = from + (to - from) * eased;
				applyLightingOverlayOpacity();
				if (t < 1) rafId = window.requestAnimationFrame(tick);
			};
			rafId = window.requestAnimationFrame(tick);
		};

		const startFadeInWhenReady = () => {
			clearTimers();
			attempts = 0;

			const poll = () => {
				if (cancelled) return;
				attempts++;
				const m = mapRef.current;
				if (!m) return;
				let ready = false;
				try {
					ready = m.isSourceLoaded(MAPBOX_SOURCE_IDS.nightLights);
				} catch {
					ready = false;
				}
				if (ready || attempts >= 16) {
					fadeTo(1, NIGHT_LIGHTS_ZOOM_LOAD_FADE_MS);
				}
			};

			intervalId = window.setInterval(poll, NIGHT_LIGHTS_ZOOM_LOAD_POLL_MS);
			poll();
		};

		const handleZoomStart = () => {
			// Dim quickly so we don't stare at the scaled/intermediate raster state,
			// but keep the lights present so they feel "part of the map".
			fadeTo(NIGHT_LIGHTS_ZOOM_LOAD_DIM_FLOOR, NIGHT_LIGHTS_ZOOM_LOAD_OUT_FADE_MS);
		};

		const handleZoomEnd = () => {
			nightLightsZoomLoadTRef.current = NIGHT_LIGHTS_ZOOM_LOAD_DIM_FLOOR;
			applyLightingOverlayOpacity();
			startFadeInWhenReady();
		};

		map.on('zoomstart', handleZoomStart);
		map.on('zoomend', handleZoomEnd);

		return () => {
			cancelled = true;
			clearTimers();
			map.off('zoomstart', handleZoomStart);
			map.off('zoomend', handleZoomEnd);
		};
	}, [map, isMapLoaded, contactLightsTilesEnabled, applyLightingOverlayOpacity]);

	// Update overlays when the day/night factor changes (e.g. dusk progression).
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		applyLightingOverlayOpacity();
	}, [nightT, presentation, map, isMapLoaded, applyLightingOverlayOpacity]);

	// Keep Mapbox globe lights and land/water palette in sync with day/night.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		const visualNightT = computeMoodVisualNightT(nightT, weatherMoodConfigRef.current);
		applyMurmurGlobeLighting(map);
		applyNightLandPalette(map, visualNightT);
		applyStateOverlayNightColors(map, visualNightT);
		applyMapboxFogForMoodAndNight(map, weatherMoodConfigRef.current, visualNightT);
	}, [nightT, weatherMood, map, isMapLoaded]);

	// During sunrise/sunset, `useGlobeNightLighting` intentionally avoids React
	// re-rendering every frame. Drive the visual night factor imperatively so
	// lights, dimming, and mood-night blends move continuously through the phase.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (MANUAL_NIGHT_T_OVERRIDE !== null) {
			nightTRef.current = nightT;
			repaintSunTransitionCanvas(Date.now(), true);
			applyLightingOverlayOpacity();
			return;
		}

		const phase = nightLighting?.phase ?? null;
		if (phase !== 'sunrise' && phase !== 'sunset') {
			nightTRef.current = nightT;
			repaintSunTransitionCanvas(Date.now(), true);
			applyLightingOverlayOpacity();
			return;
		}

		let cancelled = false;
		let rafId: number | null = null;
		let lastMapPaintAt = 0;

		const applyMapNightState = (runtimeNightT: number, force = false) => {
			const now = performance.now();
			const shouldPaintMap = force || now - lastMapPaintAt >= 250;
			if (!shouldPaintMap) return;
			lastMapPaintAt = now;
			const visualNightT = computeMoodVisualNightT(
				runtimeNightT,
				weatherMoodConfigRef.current
			);
			applyMurmurGlobeLighting(map);
			applyNightLandPalette(map, visualNightT);
			applyStateOverlayNightColors(map, visualNightT);
			applyMapboxFogForMoodAndNight(map, weatherMoodConfigRef.current, visualNightT);
			applyStateOverlayOpacity(
				stateOverlayOpacityRef.current,
				stateOverlayModeRef.current
			);
		};

		const tick = () => {
			if (cancelled) return;
			const nowMs = Date.now();
			const runtimeNightT = computeRuntimeNightT(nightLighting, nightT, nowMs);
			nightTRef.current = runtimeNightT;
			repaintSunTransitionCanvas(nowMs);
			applyLightingOverlayOpacity();
			applyMapNightState(runtimeNightT, nowMs >= (nightLighting?.phaseEndMs ?? 0));

			if (nowMs < (nightLighting?.phaseEndMs ?? 0)) {
				rafId = requestAnimationFrame(tick);
				return;
			}

			applyMapNightState(runtimeNightT, true);
		};

		tick();
		return () => {
			cancelled = true;
			if (rafId != null) cancelAnimationFrame(rafId);
		};
	}, [
		map,
		isMapLoaded,
		nightLighting,
		nightT,
		repaintSunTransitionCanvas,
		applyLightingOverlayOpacity,
		applyStateOverlayOpacity,
	]);

	const getSelectedStateDisplayMultiPolygon = useCallback(
		(mapInstance: mapboxgl.Map): ClippingMultiPolygon | null => {
			const selection = lockedStateSelectionMultiPolygonRef.current;
			if (!selection?.length) return null;

			const zoom = mapInstance.getZoom() ?? MAP_DEFAULT_ZOOM;
			const t = computeCuratedOrbT(zoom);
			const morphSource = selectedStateMorphSourceRef.current;
			const shouldUseCircleMorph = Boolean(morphSource && t > 0.001);

			let displayMultiPolygon: ClippingMultiPolygon | null = null;
			if (!shouldUseCircleMorph) {
				displayMultiPolygon = selection;
			} else if (
				Number.isFinite(selectedStateLastMorphTAppliedRef.current) &&
				Math.abs(t - selectedStateLastMorphTAppliedRef.current) < 0.001 &&
				selectedStateDisplayMultiPolygonRef.current
			) {
				displayMultiPolygon = selectedStateDisplayMultiPolygonRef.current;
			} else if (morphSource) {
				displayMultiPolygon = morphCuratedBlobSourceToLngLat(morphSource, t);
				selectedStateDisplayMultiPolygonRef.current = displayMultiPolygon;
				selectedStateLastMorphTAppliedRef.current = t;
			}

			if (!displayMultiPolygon?.length) return null;

			const source = mapInstance.getSource(MAPBOX_SOURCE_IDS.lockedOutline) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const outlineKey = `${selectedStateKeyRef.current ?? ''}:${
				shouldUseCircleMorph ? t.toFixed(3) : 'state'
			}`;
			if (source && selectedStateOutlineSourceKeyRef.current !== outlineKey) {
				selectedStateOutlineSourceKeyRef.current = outlineKey;
				source.setData(
					createOutlineGeoJsonFromMultiPolygon(displayMultiPolygon) as any
				);
			}

			return displayMultiPolygon;
		},
		[]
	);

	const applySelectedStateGradientState = useCallback(() => {
		const m = mapRef.current;
		const overlay = selectedStateGradientSvgRef.current;
		if (!overlay) return;

		const ellipse = selectedStateGradientEllipseRef.current;
		const bloomEllipse = selectedStateGradientBloomEllipseRef.current;
		const gradient = selectedStateGradientRef.current;
		const bloomGradient = selectedStateGradientBloomRef.current;
		const clipPath = selectedStateGradientClipPathRef.current;

		const hide = () => {
			overlay.style.opacity = '0';
			clipPath?.setAttribute('d', '');
			ellipse?.setAttribute('opacity', '0');
			bloomEllipse?.setAttribute('opacity', '0');
		};

		if (
			!m ||
			!ellipse ||
			!bloomEllipse ||
			!gradient ||
			!bloomGradient ||
			!clipPath
		) {
			hide();
			return;
		}

		if (presentationRef.current === 'background' || isLoadingRef.current) {
			hide();
			return;
		}

		const selectedKey = selectedStateKeyRef.current;
		const lockedKey = lockedStateSelectionKeyRef.current;
		const selection = lockedStateSelectionMultiPolygonRef.current;
		if (!selectedKey || selectedKey !== lockedKey || !selection?.length) {
			hide();
			return;
		}

		const displayMultiPolygon = getSelectedStateDisplayMultiPolygon(m);
		if (!displayMultiPolygon?.length) {
			hide();
			return;
		}

		const projectedClip = buildScreenPathFromLngLatMultiPolygon(m, displayMultiPolygon);
		if (!projectedClip) {
			hide();
			return;
		}

		const width = projectedClip.maxX - projectedClip.minX;
		const height = projectedClip.maxY - projectedClip.minY;
		if (
			!Number.isFinite(width) ||
			!Number.isFinite(height) ||
			width <= 0 ||
			height <= 0
		) {
			hide();
			return;
		}

		const zoom = m.getZoom() ?? MAP_DEFAULT_ZOOM;
		const morphSource = selectedStateMorphSourceRef.current;
		const bbox = lockedStateSelectionBboxRef.current;
		const stateCenter =
			morphSource?.center ??
			(bbox
				? {
						lat: (bbox.minLat + bbox.maxLat) / 2,
						lng: (bbox.minLng + bbox.maxLng) / 2,
				  }
				: null);
		const frontHemisphereOpacity = computeGlobeFrontHemisphereOpacity(
			m,
			stateCenter,
			morphSource?.radiusKm ?? null,
			zoom
		);
		if (frontHemisphereOpacity <= 0.006) {
			hide();
			return;
		}
		const bloomT = computeCuratedOrbT(zoom);
		const colorOpacity =
			SELECTED_STATE_GRADIENT_COLOR_OPACITY * (1 - bloomT) * frontHemisphereOpacity;
		const bloomOpacity =
			SELECTED_STATE_GRADIENT_BLOOM_OPACITY * bloomT * frontHemisphereOpacity;

		const halfWidth = width / 2;
		const halfHeight = height / 2;
		const centerX = projectedClip.minX + halfWidth;
		const centerY = projectedClip.minY + halfHeight;
		const bloomRadius = Math.max(halfWidth, halfHeight);

		ellipse.setAttribute('cx', centerX.toFixed(2));
		ellipse.setAttribute('cy', centerY.toFixed(2));
		bloomEllipse.setAttribute('cx', centerX.toFixed(2));
		bloomEllipse.setAttribute('cy', centerY.toFixed(2));
		ellipse.setAttribute(
			'rx',
			(halfWidth * CURATED_ORB_ELLIPSE_RX_RATIO).toFixed(2)
		);
		ellipse.setAttribute(
			'ry',
			(halfHeight * CURATED_ORB_ELLIPSE_RY_RATIO).toFixed(2)
		);
		bloomEllipse.setAttribute('rx', bloomRadius.toFixed(2));
		bloomEllipse.setAttribute('ry', bloomRadius.toFixed(2));
		gradient.setAttribute(
			'gradientTransform',
			`translate(${centerX.toFixed(2)} ${centerY.toFixed(2)}) rotate(${CURATED_ORB_GRADIENT_ROTATION_DEG}) scale(${(
				halfWidth * CURATED_ORB_GRADIENT_SCALE_X_RATIO
			).toFixed(2)} ${(halfHeight * CURATED_ORB_GRADIENT_SCALE_Y_RATIO).toFixed(2)})`
		);
		bloomGradient.setAttribute(
			'gradientTransform',
			`translate(${centerX.toFixed(2)} ${centerY.toFixed(2)}) scale(${bloomRadius.toFixed(2)})`
		);
		clipPath.setAttribute('d', projectedClip.d);
		ellipse.setAttribute(
			'opacity',
			colorOpacity.toFixed(3)
		);
		bloomEllipse.setAttribute(
			'opacity',
			bloomOpacity.toFixed(3)
		);
		overlay.style.opacity = '1';
	}, [getSelectedStateDisplayMultiPolygon]);
	applySelectedStateGradientStateRef.current = applySelectedStateGradientState;

	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;

		applySelectedStateGradientState();
		map.on('render', applySelectedStateGradientState);
		return () => {
			map.off('render', applySelectedStateGradientState);
		};
	}, [map, isMapLoaded, applySelectedStateGradientState]);

	useEffect(() => {
		applySelectedStateGradientState();
	}, [
		applySelectedStateGradientState,
		presentation,
		isLoading,
		lockedStateKey,
		isStateLayerReady,
	]);

	// Re-apply the night palette when zoom changes so the "zoomed in" view can be
	// slightly brighter without changing the low-zoom globe read.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		const onZoomEnd = () =>
			applyNightLandPalette(
				map,
				computeMoodVisualNightT(nightTRef.current, weatherMoodConfigRef.current)
			);
		map.on('zoomend', onZoomEnd);
		return () => {
			map.off('zoomend', onZoomEnd);
		};
	}, [map, isMapLoaded]);

	const applyWeatherMoodConfig = useCallback(
		(cfg: RuntimeMoodVisualConfig) => {
			weatherMoodConfigRef.current = cfg;

			const m = mapRef.current;
			if (!m) return;

			// Cloud raster paint — opacity expression + brightness clamp.
			try {
				const opacityExpr = buildCloudsOpacityExpr(
					cfg.cloudOpacityGlobeZoom,
					cfg.cloudOpacityDecorativeZoom,
					cfg.cloudDeepZoomOpacity
				);
				if (m.getLayer(MAPBOX_LAYER_IDS.clouds)) {
					m.setPaintProperty(
						MAPBOX_LAYER_IDS.clouds,
						'raster-opacity',
						opacityExpr as any
					);
					m.setPaintProperty(
						MAPBOX_LAYER_IDS.clouds,
						'raster-brightness-min',
						cfg.cloudBrightnessMin
					);
					m.setPaintProperty(
						MAPBOX_LAYER_IDS.clouds,
						'raster-brightness-max',
						cfg.cloudBrightnessMax
					);
				}
				if (m.getLayer(MAPBOX_LAYER_IDS.lightning)) {
					m.setPaintProperty(
						MAPBOX_LAYER_IDS.lightning,
						'raster-opacity',
						buildLightningOpacityExpr(
							cfg.lightningIntensity * LIGHTNING_LAYER_OPACITY
						) as unknown as mapboxgl.Expression
					);
				}
				if (m.getLayer(MAPBOX_LAYER_IDS.snow)) {
					m.setPaintProperty(
						MAPBOX_LAYER_IDS.snow,
						'raster-opacity',
						buildSnowOpacityExpr(cfg.snowOpacity) as unknown as mapboxgl.Expression
					);
				}
			} catch {
				// Non-fatal.
			}

			applyLightingOverlayOpacity();
			const visualNightT = computeMoodVisualNightT(nightTRef.current, cfg);
			// Atmosphere fog tint — combined with night-aware modulation so the
			// star glow / space haze / muted limb-mist react in a single pass.
			applyMapboxFogForMoodAndNight(m, cfg, visualNightT);
			applyMurmurGlobeLighting(m);
			applyNightLandPalette(m, visualNightT);
			applyStateOverlayNightColors(m, visualNightT);
			applyStateOverlayOpacity(
				stateOverlayOpacityRef.current,
				stateOverlayModeRef.current
			);
			try {
				m.triggerRepaint();
			} catch {
				// Non-fatal.
			}
		},
		[applyLightingOverlayOpacity, applyStateOverlayOpacity]
	);

	const startWeatherMoodTransition = useCallback(
		(mood: WeatherMood) => {
			const to = toRuntimeMoodConfig(getMoodConfig(mood));
			const from = weatherMoodConfigRef.current;
			appliedWeatherMoodRef.current = mood;
			moodTransitionRef.current = {
				from,
				to,
				startMs: performance.now(),
				continuousMs: getDevMoodTransitionMs() ?? MOOD_CONTINUOUS_TRANSITION_MS,
				discreteMs: Math.min(
					MOOD_DISCRETE_EFFECT_FADE_MS,
					getDevMoodTransitionMs() ?? MOOD_DISCRETE_EFFECT_FADE_MS
				),
			};
			moodTransitionLastPaintMsRef.current = 0;

			if (moodTransitionRafRef.current != null) {
				cancelAnimationFrame(moodTransitionRafRef.current);
				moodTransitionRafRef.current = null;
			}

			const tick = (now: number) => {
				const transition = moodTransitionRef.current;
				if (!transition) {
					moodTransitionRafRef.current = null;
					return;
				}

				const continuousT = clamp(
					(now - transition.startMs) / transition.continuousMs,
					0,
					1
				);
				const discreteT = clamp(
					(now - transition.startMs) / transition.discreteMs,
					0,
					1
				);
				const cfg = blendRuntimeMoodConfig(
					transition.from,
					transition.to,
					continuousT,
					discreteT
				);

				if (
					now - moodTransitionLastPaintMsRef.current >=
						MOOD_TRANSITION_PAINT_FRAME_MS ||
					continuousT >= 1
				) {
					moodTransitionLastPaintMsRef.current = now;
					applyWeatherMoodConfig(cfg);
				} else {
					weatherMoodConfigRef.current = cfg;
					applyLightingOverlayOpacity();
				}

				if (continuousT < 1 || discreteT < 1) {
					moodTransitionRafRef.current = requestAnimationFrame(tick);
					return;
				}

				moodTransitionRef.current = null;
				moodTransitionRafRef.current = null;
				applyWeatherMoodConfig(transition.to);
			};

			moodTransitionRafRef.current = requestAnimationFrame(tick);
		},
		[applyLightingOverlayOpacity, applyWeatherMoodConfig]
	);

	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (appliedWeatherMoodRef.current === weatherMood) {
			applyWeatherMoodConfig(weatherMoodConfigRef.current);
			return;
		}
		startWeatherMoodTransition(weatherMood);
	}, [
		map,
		isMapLoaded,
		weatherMood,
		applyWeatherMoodConfig,
		startWeatherMoodTransition,
	]);

	useEffect(() => {
		return () => {
			if (moodTransitionRafRef.current != null) {
				cancelAnimationFrame(moodTransitionRafRef.current);
				moodTransitionRafRef.current = null;
			}
			moodTransitionRef.current = null;
		};
	}, []);

	useEffect(() => {
		const nextHot =
			typeof effectiveTemperatureF === 'number' &&
			effectiveTemperatureF > HOT_TEMPERATURE_THRESHOLD_F;
		if (nextHot === isHotRef.current) return;
		isHotRef.current = nextHot;
		if (!map || !isMapLoaded) return;
		applyLightingOverlayOpacity();
	}, [effectiveTemperatureF, map, isMapLoaded, applyLightingOverlayOpacity]);

	const markerPinUrlCacheRef = useRef<Map<string, string>>(new Map());
	const getMarkerPinUrl = useCallback(
		(
			fillColor: string,
			strokeColor: string,
			searchWhat?: string | null,
			baseColor?: string
		): string => {
			const key = `${fillColor}|${strokeColor}|${searchWhat ?? ''}|${baseColor ?? ''}`;
			const cached = markerPinUrlCacheRef.current.get(key);
			if (cached) return cached;
			const url = generateMapMarkerPinIconUrl(
				fillColor,
				strokeColor,
				searchWhat,
				baseColor
			);
			markerPinUrlCacheRef.current.set(key, url);
			return url;
		},
		[]
	);

	// Build fast id->contact lookups for Mapbox interactions/tooltips.
	const visibleContactsById = useMemo(
		() => new Map<number, ContactWithName>(visibleContacts.map((c) => [c.id, c])),
		[visibleContacts]
	);
	const bookingExtraContactsById = useMemo(
		() =>
			new Map<number, ContactWithName>(bookingExtraVisibleContacts.map((c) => [c.id, c])),
		[bookingExtraVisibleContacts]
	);
	const promotionOverlayContactsById = useMemo(
		() =>
			new Map<number, ContactWithName>(
				promotionOverlayVisibleContacts.map((c) => [c.id, c])
			),
		[promotionOverlayVisibleContacts]
	);
	const allOverlayContactsById = useMemo(
		() =>
			new Map<number, ContactWithName>(
				allContactsOverlayVisibleContacts.map((c) => [c.id, c])
			),
		[allContactsOverlayVisibleContacts]
	);

	// Marker hover/click + (optional) state hover/click interactions.
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const markerHitLayers = [
			MAPBOX_LAYER_IDS.baseHit,
			MAPBOX_LAYER_IDS.promotionDotHit,
			MAPBOX_LAYER_IDS.bookingPinHit,
			MAPBOX_LAYER_IDS.promotionPinHit,
			MAPBOX_LAYER_IDS.markersAllHit,
		];

		const getContactForHit = (layerId: string, id: number): ContactWithName | null => {
			if (layerId === MAPBOX_LAYER_IDS.baseHit)
				return visibleContactsById.get(id) ?? null;
			if (layerId === MAPBOX_LAYER_IDS.bookingPinHit)
				return bookingExtraContactsById.get(id) ?? null;
			if (
				layerId === MAPBOX_LAYER_IDS.promotionDotHit ||
				layerId === MAPBOX_LAYER_IDS.promotionPinHit
			) {
				return promotionOverlayContactsById.get(id) ?? null;
			}
			if (layerId === MAPBOX_LAYER_IDS.markersAllHit)
				return allOverlayContactsById.get(id) ?? null;
			return null;
		};

		const setCursor = (cursor: string) => {
			// Avoid fighting the rectangle-selection cursor.
			if (areaSelectionEnabled || isAreaSelecting) return;
			map.getCanvas().style.cursor = cursor;
		};

		const clearStateHover = () => {
			const prev = hoveredStateIdRef.current;
			if (prev == null) return;
			try {
				map.setFeatureState(
					{ source: MAPBOX_SOURCE_IDS.states, id: prev },
					{ hover: false }
				);
			} catch {
				// Ignore.
			}
			hoveredStateIdRef.current = null;
		};

		const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
			if (areaSelectionEnabled || isAreaSelecting) return;

			// Marker hover interactions only at sufficiently high zoom.
			const zoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
			if (zoom < HOVER_INTERACTION_MIN_ZOOM) {
				const prevHovered = hoveredMarkerIdRef.current;
				if (hoverSourceRef.current === 'map' && prevHovered != null) {
					handleMarkerMouseOut(prevHovered);
				}
				setCursor('');
			} else {
				const features = map.queryRenderedFeatures(e.point, { layers: markerHitLayers });
				const top = features[0];
				const layerId = top?.layer?.id;
				const rawId = top?.id;
				const id =
					typeof rawId === 'number'
						? rawId
						: typeof rawId === 'string'
							? Number.parseInt(rawId, 10)
							: NaN;

				if (layerId && Number.isFinite(id)) {
					const contact = getContactForHit(layerId, id);
					if (contact) {
						setCursor('pointer');
						if (hoverSourceRef.current !== 'map' || hoveredMarkerIdRef.current !== id) {
							handleMarkerMouseOver(
								contact,
								e.originalEvent as unknown as MouseEvent | TouchEvent
							);
						}
					} else {
						const prevHovered = hoveredMarkerIdRef.current;
						if (hoverSourceRef.current === 'map' && prevHovered != null) {
							handleMarkerMouseOut(prevHovered);
						}
						setCursor('');
					}
				} else {
					const prevHovered = hoveredMarkerIdRef.current;
					if (hoverSourceRef.current === 'map' && prevHovered != null) {
						handleMarkerMouseOut(prevHovered);
					}
					setCursor('');
				}
			}

			// Optional state hover highlight (only when state interactions are enabled).
			if (!stateInteractionsEnabled || !isStateLayerReady) {
				clearStateHover();
				return;
			}
			if (zoom > STATE_HOVER_HIGHLIGHT_MAX_ZOOM + 0.001) {
				clearStateHover();
				return;
			}

			// If a marker is hovered, don't also hover-highlight the state underneath.
			if (hoverSourceRef.current === 'map' && hoveredMarkerIdRef.current != null) {
				clearStateHover();
				return;
			}
			// While zooming-to-state after a state click (or while results are loading), don't show
			// hover overlays on other states as the camera sweeps.
			if (stateClickZoomInFlightRef.current || isLoadingRef.current) {
				clearStateHover();
				return;
			}

			const stateFeatures = map.queryRenderedFeatures(e.point, {
				layers: [MAPBOX_LAYER_IDS.statesFillHit],
			});
			const topState = stateFeatures[0];
			const nextStateId = topState?.id ?? null;
			const prev = hoveredStateIdRef.current;
			if (prev != null && prev !== nextStateId) {
				try {
					map.setFeatureState(
						{ source: MAPBOX_SOURCE_IDS.states, id: prev },
						{ hover: false }
					);
				} catch {
					// Ignore.
				}
			}
			if (nextStateId != null && nextStateId !== prev) {
				try {
					map.setFeatureState(
						{ source: MAPBOX_SOURCE_IDS.states, id: nextStateId },
						{ hover: true }
					);
				} catch {
					// Ignore.
				}
			}
			hoveredStateIdRef.current = nextStateId;
			if (nextStateId != null) {
				setCursor('pointer');
			}
		};

		const onClick = (e: mapboxgl.MapMouseEvent) => {
			// In select mode, clicks are part of drawing/finishing a rectangle selection.
			if (areaSelectionEnabled || isAreaSelecting) return;

			// Marker click takes priority over state click.
			const markerFeatures = map.queryRenderedFeatures(e.point, {
				layers: markerHitLayers,
			});
			const top = markerFeatures[0];
			const layerId = top?.layer?.id;
			const rawId = top?.id;
			const id =
				typeof rawId === 'number'
					? rawId
					: typeof rawId === 'string'
						? Number.parseInt(rawId, 10)
						: NaN;
			if (layerId && Number.isFinite(id)) {
				const contact = getContactForHit(layerId, id);
				if (contact) {
					handleMarkerClick(contact);
					return;
				}
			}

			// State click (when enabled and zoomed out).
			if (stateInteractionsEnabled && isStateLayerReady) {
				const zoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
				if (zoom <= STATE_HOVER_HIGHLIGHT_MAX_ZOOM + 0.001) {
					const stateFeatures = map.queryRenderedFeatures(e.point, {
						layers: [MAPBOX_LAYER_IDS.statesFillHit],
					});
					const topState = stateFeatures[0];
					const key = typeof topState?.id === 'string' ? topState.id : null;
					if (key) {
						// Prevent other states from briefly showing hover-fill while we zoom/search.
						stateClickZoomInFlightNonceRef.current += 1;
						const nonce = stateClickZoomInFlightNonceRef.current;
						stateClickZoomInFlightRef.current = true;
						clearStateHover();
						if (stateClickZoomInFlightTimeoutRef.current) {
							clearTimeout(stateClickZoomInFlightTimeoutRef.current);
							stateClickZoomInFlightTimeoutRef.current = null;
						}
						// Safety: never let this suppression get "stuck" if the camera doesn't move.
						stateClickZoomInFlightTimeoutRef.current = setTimeout(() => {
							if (stateClickZoomInFlightNonceRef.current !== nonce) return;
							stateClickZoomInFlightRef.current = false;
							stateClickZoomInFlightTimeoutRef.current = null;
						}, DASHBOARD_TO_INTERACTIVE_TRANSITION_MS + 2500);
						try {
							map.once('moveend', () => {
								if (stateClickZoomInFlightNonceRef.current !== nonce) return;
								stateClickZoomInFlightRef.current = false;
								if (stateClickZoomInFlightTimeoutRef.current) {
									clearTimeout(stateClickZoomInFlightTimeoutRef.current);
									stateClickZoomInFlightTimeoutRef.current = null;
								}
							});
						} catch {
							// Ignore.
						}

						// Mark this as a user-initiated state zoom so our subsequent fit-to-locked-state
						// uses the longer cinematic duration.
						pendingStateClickCinematicRef.current = { key, at: Date.now() };
						const nameRaw = (topState.properties as any)?.name;
						const name =
							typeof nameRaw === 'string' && nameRaw.trim().length > 0
								? nameRaw.trim()
								: key;
						setSelectedStateKey(key);
						onStateSelectRef.current?.(name);
						return;
					}
				}
			}

			// Click on empty map clears any selected marker panel.
			setSelectedMarker(null);
		};

		map.on('mousemove', onMouseMove);
		map.on('click', onClick);

		return () => {
			map.off('mousemove', onMouseMove);
			map.off('click', onClick);
			try {
				map.getCanvas().style.cursor = '';
			} catch {
				// Ignore.
			}
			clearStateHover();
		};
	}, [
		map,
		isMapLoaded,
		areaSelectionEnabled,
		isAreaSelecting,
		stateInteractionsEnabled,
		isStateLayerReady,
		visibleContactsById,
		bookingExtraContactsById,
		promotionOverlayContactsById,
		allOverlayContactsById,
		handleMarkerMouseOver,
		handleMarkerMouseOut,
		handleMarkerClick,
	]);

	// ---- Mapbox marker sources (rendered via layers) ----
	const pendingMapImageLoadsRef = useRef<Map<string, Promise<void>>>(new Map());

	// Rasterize an SVG data-URI to an ImageData via an off-screen canvas.
	// Mapbox GL's `map.loadImage()` doesn't reliably handle `data:image/svg+xml` URIs,
	// so we render the SVG into an <img> → canvas → ImageData and then call `addImage`.
	const rasterizeSvgDataUri = useCallback(
		(
			dataUri: string,
			width: number,
			height: number
		): Promise<{ width: number; height: number; data: Uint8ClampedArray }> => {
			return new Promise((resolve, reject) => {
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement('canvas');
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext('2d');
					if (!ctx) {
						reject(new Error('Canvas 2D context unavailable'));
						return;
					}
					ctx.drawImage(img, 0, 0, width, height);
					const imageData = ctx.getImageData(0, 0, width, height);
					resolve({ width, height, data: imageData.data });
				};
				img.onerror = (e) => reject(e);
				img.src = dataUri;
			});
		},
		[]
	);

	const ensureMapImageFromUrl = useCallback(
		(imageName: string, url: string): Promise<void> => {
			const mapInstance = mapRef.current;
			if (!mapInstance || !isMapLoaded) return Promise.resolve();
			if (mapInstance.hasImage(imageName)) return Promise.resolve();

			const pending = pendingMapImageLoadsRef.current.get(imageName);
			if (pending) return pending;

			// SVG data-URIs need manual rasterization; raster URLs can use loadImage directly.
			const isSvgDataUri = url.startsWith('data:image/svg');

			const promise = isSvgDataUri
				? (async () => {
						try {
							// Render at 2× for retina crispness.
							const scale = 2;
							const w = MAP_MARKER_PIN_VIEWBOX_WIDTH * scale;
							const h = MAP_MARKER_PIN_VIEWBOX_HEIGHT * scale;
							const imgData = await rasterizeSvgDataUri(url, w, h);
							const latestMap = mapRef.current;
							if (!latestMap || latestMap !== mapInstance) return;
							if (!latestMap.hasImage(imageName)) {
								latestMap.addImage(imageName, imgData, { pixelRatio: scale });
							}
						} catch (err) {
							console.error('Failed to rasterize SVG marker image', { imageName, err });
						} finally {
							pendingMapImageLoadsRef.current.delete(imageName);
						}
					})()
				: new Promise<void>((resolve) => {
						mapInstance.loadImage(url, (err, image) => {
							pendingMapImageLoadsRef.current.delete(imageName);
							const latestMap = mapRef.current;
							if (!latestMap || latestMap !== mapInstance) {
								resolve();
								return;
							}
							if (err || !image) {
								console.error('Failed to load Mapbox marker image', { imageName, err });
								resolve();
								return;
							}
							try {
								if (!latestMap.hasImage(imageName)) {
									latestMap.addImage(imageName, image);
								}
							} catch {
								// Ignore.
							}
							resolve();
						});
					});

			pendingMapImageLoadsRef.current.set(imageName, promise);
			return promise;
		},
		[isMapLoaded, rasterizeSvgDataUri]
	);

	const imageNameFromUrl = useCallback(
		(url: string) => `murmur-marker-${hashStringToStableKey(url)}`,
		[]
	);

	const uncategorizedContactMarkerUrl = useMemo(
		() => generateUncategorizedContactMarkerIconUrl(),
		[]
	);
	const uncategorizedContactMarkerImageName = useMemo(
		() => imageNameFromUrl(uncategorizedContactMarkerUrl),
		[imageNameFromUrl, uncategorizedContactMarkerUrl]
	);

	useEffect(() => {
		if (!map || !isMapLoaded) return;
		void ensureMapImageFromUrl(
			uncategorizedContactMarkerImageName,
			uncategorizedContactMarkerUrl
		);
	}, [
		map,
		isMapLoaded,
		ensureMapImageFromUrl,
		uncategorizedContactMarkerImageName,
		uncategorizedContactMarkerUrl,
	]);

	const promotionPinIdsRef = useRef<Set<number>>(new Set());
	const promotionDotIdsRef = useRef<Set<number>>(new Set());
	const baseDotsLastDataKeyRef = useRef<string>('');
	// Sync contacts prop length into a ref so the base-dots effect can detect
	// a stale-empty visibleContacts without adding contacts to its dep array.
	const contactsPropLengthRef = useRef(contacts.length);
	contactsPropLengthRef.current = contacts.length;
	// Guard transient empty-contact renders around query/refetch transitions.
	const baseDotsLastSearchKeyRef = useRef<string>((searchQuery ?? '').trim());
	const baseDotsPendingDataSearchKeyRef = useRef<string | null>(null);
	const baseDotsPendingDataSawLoadingRef = useRef<boolean>(false);
	const baseDotsPrevContactsPropLengthRef = useRef<number>(contacts.length);
	const baseDotsWaveMetaRef = useRef<DotWaveMeta | null>(null);
	const baseDotsWaveCancelRef = useRef<(() => void) | null>(null);
	const baseDotsWavePrevIsLoadingRef = useRef<boolean>(false);
	// Track the query key for which a wave should run (set when a *new* search starts loading).
	const baseDotsWavePendingSearchKeyRef = useRef<string | null>(null);
	// Tracks the last query key that actually played the base-dot wave animation.
	const baseDotsWaveLastSearchKeyRef = useRef<string>('');
	const markerConstellationEdgesRef = useRef<MarkerConstellationEdge[]>([]);
	const markerConstellationNodesRef = useRef<MarkerConstellationNode[]>([]);
	const markerConstellationContactsByIdRef = useRef<Map<number, ContactWithName>>(
		new Map()
	);
	const markerConstellationNodeIdsRef = useRef<Set<number>>(new Set());
	const markerConstellationLastSearchKeyRef = useRef<string>((searchQuery ?? '').trim());
	const markerConstellationComposedSearchKeyRef = useRef<string>('');
	const markerConstellationRevealCancelRef = useRef<(() => void) | null>(null);
	const markerConstellationRevealDoneRef = useRef<boolean>(true);
	const markerConstellationLastDataKeyRef = useRef<string>('');
	// Tracks a pending moveend listener registered when compose is deferred for a
	// camera animation (e.g., autoFit fitBounds after a search from far-out zoom).
	// Stored on a ref so we can keep it idempotent and avoid stacking listeners.
	const markerConstellationDeferredMoveEndRef = useRef<(() => void) | null>(null);
	const [markerConstellationIdleNonce, setMarkerConstellationIdleNonce] = useState(0);
	// Bumped whenever the constellation node set changes (compose, clear, reset),
	// so the feature-state sync effect re-applies `inConstellation` on the dots.
	const [markerConstellationCompositionNonce, setMarkerConstellationCompositionNonce] =
		useState(0);
	const stopBaseDotsWaveAndRestoreSteadyRendering = useCallback(() => {
		if (!map || !isMapLoaded) return;

		const cancel = baseDotsWaveCancelRef.current;
		if (cancel) {
			cancel();
			baseDotsWaveCancelRef.current = null;
		}

		try {
			if (map.getLayer(MAPBOX_LAYER_IDS.baseGlow)) {
				const transition = { duration: 0, delay: 0 } as any;
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseGlow,
					'circle-opacity-transition',
					transition
				);
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseGlow,
					'circle-opacity',
					CATEGORIZED_DOT_GLOW_ZOOM_FADE_EXPR
				);
			}
			if (map.getLayer(MAPBOX_LAYER_IDS.baseDots)) {
				const transition = { duration: 0, delay: 0 } as any;
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-opacity-transition',
					transition
				);
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-stroke-opacity-transition',
					transition
				);
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-opacity',
					CATEGORIZED_DOT_ZOOM_FADE_EXPR
				);
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-stroke-opacity',
					CURATED_DOT_ZOOM_FADE_EXPR
				);
			}
			if (map.getLayer(MAPBOX_LAYER_IDS.baseFallbackIcons)) {
				const transition = { duration: 0, delay: 0 } as any;
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseFallbackIcons,
					'icon-opacity-transition',
					transition
				);
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseFallbackIcons,
					'icon-opacity',
					CURATED_DOT_ZOOM_FADE_EXPR
				);
			}
		} catch {
			// Ignore style timing races.
		}

		try {
			if (map.getLayer(MAPBOX_LAYER_IDS.baseHit)) {
				// Restore the visibility filter (not `null`) so hit detection
				// stays scoped to the currently-sampled visibleContacts after
				// the wave completes. Otherwise off-screen-sampled-out features
				// would be hit-testable just because they're in the source.
				const visibleIds = Array.from(visibleContactIdSetRef.current);
				const visibilityFilter: any =
					visibleIds.length === 0
						? ['==', ['id'], -1]
						: ['match', ['id'], visibleIds, true, false];
				map.setFilter(MAPBOX_LAYER_IDS.baseHit, visibilityFilter);
			}
		} catch {
			// Ignore style timing races.
		}
	}, [map, isMapLoaded]);

	// If the user starts panning/zooming while the post-search reveal wave is running,
	// switch back to steady rendering so newly sampled viewport dots don't appear to vanish.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const onMoveStart = () => {
			if (!baseDotsWaveCancelRef.current) return;
			stopBaseDotsWaveAndRestoreSteadyRendering();
		};
		map.on('movestart', onMoveStart);
		return () => {
			map.off('movestart', onMoveStart);
		};
	}, [map, isMapLoaded, stopBaseDotsWaveAndRestoreSteadyRendering]);

	const stopMarkerConstellationReveal = useCallback(() => {
		const cancel = markerConstellationRevealCancelRef.current;
		if (cancel) {
			cancel();
			markerConstellationRevealCancelRef.current = null;
		}
	}, []);

	const setMarkerConstellationLineOpacity = useCallback(
		(coreOpacity: any, glowOpacity: any, transitionMs = 0) => {
			if (!map || !isMapLoaded) return;
			const transition = { duration: transitionMs, delay: 0 } as any;
			try {
				if (map.getLayer(MAPBOX_LAYER_IDS.markerConstellationCore)) {
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.markerConstellationCore,
						'line-opacity-transition',
						transition
					);
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.markerConstellationCore,
						'line-opacity',
						getMarkerConstellationZoomFadedOpacity(coreOpacity)
					);
				}
				if (map.getLayer(MAPBOX_LAYER_IDS.markerConstellationGlow)) {
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.markerConstellationGlow,
						'line-opacity-transition',
						transition
					);
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.markerConstellationGlow,
						'line-opacity',
						getMarkerConstellationZoomFadedOpacity(glowOpacity)
					);
				}
			} catch {
				// Ignore style timing races.
			}
		},
		[map, isMapLoaded]
	);

	const clearMarkerConstellation = useCallback(() => {
		stopMarkerConstellationReveal();
		markerConstellationEdgesRef.current = [];
		markerConstellationNodesRef.current = [];
		markerConstellationContactsByIdRef.current = new Map();
		markerConstellationNodeIdsRef.current = new Set();
		markerConstellationComposedSearchKeyRef.current = '';
		markerConstellationRevealDoneRef.current = true;
		markerConstellationLastDataKeyRef.current = '';
		setMarkerConstellationCompositionNonce((value) => value + 1);
		setMarkerConstellationLineOpacity(0, 0, 0);
		if (!map || !isMapLoaded) return;
		const lineSource = map.getSource(MAPBOX_SOURCE_IDS.markerConstellation) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const nodeSource = map.getSource(MAPBOX_SOURCE_IDS.markerConstellationNodes) as
			| mapboxgl.GeoJSONSource
			| undefined;
		try {
			const empty = { type: 'FeatureCollection', features: [] } as any;
			lineSource?.setData(empty);
			nodeSource?.setData(empty);
		} catch {
			// Ignore style timing races.
		}
	}, [
		map,
		isMapLoaded,
		stopMarkerConstellationReveal,
		setMarkerConstellationLineOpacity,
	]);

	const writeMarkerConstellationSourceData = useCallback(
		(contactsForVisibility?: ContactWithName[]): void => {
			if (!map || !isMapLoaded) return;
			const source = map.getSource(MAPBOX_SOURCE_IDS.markerConstellation) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const nodeSource = map.getSource(MAPBOX_SOURCE_IDS.markerConstellationNodes) as
				| mapboxgl.GeoJSONSource
				| undefined;
			if (!source && !nodeSource) return;

			const contactsById =
				contactsForVisibility != null
					? new Map<number, ContactWithName>(
							contactsForVisibility.map((contact) => [contact.id, contact])
					  )
					: markerConstellationContactsByIdRef.current;

			const features: any[] = [];
			const dataKeyParts: string[] = [];
			for (const edge of markerConstellationEdgesRef.current) {
				const fromContact = contactsById.get(edge.fromId);
				const toContact = contactsById.get(edge.toId);
				if (!fromContact || !toContact) continue;

				const fromCoords = getContactCoords(fromContact);
				const toCoords = getContactCoords(toContact);
				if (!fromCoords || !toCoords) continue;

				const edgeId = markerConstellationPairKey(edge.fromId, edge.toId);
				const featureId = `${edge.level}:${edgeId}`;
				dataKeyParts.push(
					`e:${featureId}:${edge.rank.toFixed(3)}:${edge.opacityScale.toFixed(2)}`
				);
				features.push({
					type: 'Feature',
					id: featureId,
					properties: {
						level: edge.level,
						rank: edge.rank,
						opacityScale: edge.opacityScale,
					},
					geometry: {
						type: 'LineString',
						coordinates: [
							[fromCoords.lng, fromCoords.lat],
							[toCoords.lng, toCoords.lat],
						],
					},
				});
			}

			const nodeFeatures: any[] = [];
			const hasLockedStateSelection = Boolean(
				lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey
			);
			for (const node of markerConstellationNodesRef.current) {
				const contact = contactsById.get(node.id);
				if (!contact) continue;
				const coords = getContactCoords(contact);
				if (!coords) continue;
				const isOutsideLockedState = hasLockedStateSelection
					? !isCoordsInLockedState(coords)
					: false;
				const whatForContact = contact.curatedCategory ?? searchWhat ?? null;
				const baseFillColor = getResultDotColorForWhat(whatForContact);
				const fillColor = isOutsideLockedState
					? washOutHexColor(baseFillColor, OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE)
					: baseFillColor;
				const featureId = `${node.level}:${node.id}`;
				dataKeyParts.push(
					`n:${featureId}:${fillColor}:${node.rank.toFixed(3)}:${node.opacityScale.toFixed(
						2
					)}`
				);
				nodeFeatures.push({
					type: 'Feature',
					id: featureId,
					properties: {
						fillColor,
						level: node.level,
						rank: node.rank,
						opacityScale: node.opacityScale,
					},
					geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
				});
			}

			const dataKey = dataKeyParts.join(',');
			markerConstellationLastDataKeyRef.current = dataKey;

			try {
				source?.setData({ type: 'FeatureCollection', features } as any);
				nodeSource?.setData({ type: 'FeatureCollection', features: nodeFeatures } as any);
			} catch {
				// Ignore style timing races.
			}
		},
		[map, isMapLoaded, getContactCoords, lockedStateKey, isCoordsInLockedState, searchWhat]
	);

	const startMarkerConstellationReveal = useCallback(
		() => {
			stopMarkerConstellationReveal();

			if (!map || !isMapLoaded) return;
			if (markerConstellationEdgesRef.current.length === 0) {
				markerConstellationRevealDoneRef.current = true;
				setMarkerConstellationLineOpacity(0, 0, 0);
				return;
			}

			markerConstellationRevealDoneRef.current = true;
			setMarkerConstellationLineOpacity(
				MARKER_CONSTELLATION_CORE_OPACITY,
				MARKER_CONSTELLATION_GLOW_OPACITY,
				MARKER_CONSTELLATION_REVEAL_FADE_MS
			);
			return;
		},
		[
			map,
			isMapLoaded,
			stopMarkerConstellationReveal,
			setMarkerConstellationLineOpacity,
		]
	);

	// Base result dots
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.markersBase) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;
		const searchKey = (searchQuery ?? '').trim();
		const loading = Boolean(isLoading);
		const hasLoadingSignal = typeof isLoading === 'boolean';
		const prevContactsLen = baseDotsPrevContactsPropLengthRef.current;
		baseDotsPrevContactsPropLengthRef.current = contacts.length;

		if (searchKey !== baseDotsLastSearchKeyRef.current) {
			baseDotsLastSearchKeyRef.current = searchKey;
			baseDotsPendingDataSearchKeyRef.current = searchKey;
			baseDotsPendingDataSawLoadingRef.current = loading;
		} else if (loading && baseDotsPendingDataSearchKeyRef.current === searchKey) {
			baseDotsPendingDataSawLoadingRef.current = true;
		} else if (
			!loading &&
			searchKey.length > 0 &&
			prevContactsLen > 0 &&
			contacts.length === 0
		) {
			// Same-query refetch path: parent can momentarily clear contacts before
			// loading flips true. Arm the same empty-commit guard used for new queries.
			baseDotsPendingDataSearchKeyRef.current = searchKey;
			baseDotsPendingDataSawLoadingRef.current = false;
		}

		if (loading) {
			// Stop any in-flight reveal animation while loading/refetching.
			if (baseDotsWaveCancelRef.current) {
				baseDotsWaveCancelRef.current();
				baseDotsWaveCancelRef.current = null;
			}
			baseDotsWaveMetaRef.current = null;
			// Keep currently-rendered dots visible during refetches to avoid zoom flicker.
			return;
		}

			const hasLockedStateSelection = Boolean(
				lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey
			);
			const fadeWithSelectedStateOrb = Boolean(
				hasLockedStateSelection && selectedStateMorphSourceRef.current
			);

			type DotSeed = {
				id: number;
				lng: number;
				lat: number;
				fillColor: string;
				isCurated: boolean;
				isUncategorized: boolean;
				fadeWithSelectedStateOrb: boolean;
			};
		const dots: DotSeed[] = [];
		let minLng = Number.POSITIVE_INFINITY;
		let maxLng = Number.NEGATIVE_INFINITY;
		let minLat = Number.POSITIVE_INFINITY;
		let maxLat = Number.NEGATIVE_INFINITY;

		// Iterate the FULL contacts list (not the viewport-sampled `visibleContacts`)
		// so the GeoJSON source stays stable across pans/zooms. `setData` only fires
		// when the underlying contacts (or their fillColor inputs) actually change,
		// not on every moveend. The sampled viewport subset is enforced by `setFilter`
		// on the layers (see the visibility-filter useEffect below) — that's cheap
		// and doesn't trigger a layer rebuild, so fast zoom no longer causes the dot
		// layer to briefly clear and re-render ("disappear and reload").
		for (const contact of contactsWithCoords) {
			const coords = getContactCoords(contact);
			if (!coords) continue;
			const isOutsideLockedState = hasLockedStateSelection
				? !isCoordsInLockedState(coords)
				: false;
			const whatForContact = contact.curatedCategory ?? searchWhat ?? null;
			const isUncategorized = !isCleanMapMarkerCategory(whatForContact);
			const baseFillColor = getResultDotColorForWhat(whatForContact);
			const fillColor = isOutsideLockedState
				? washOutHexColor(baseFillColor, OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE)
				: baseFillColor;
			dots.push({
				id: contact.id,
				lng: coords.lng,
				lat: coords.lat,
					fillColor,
					isCurated: Boolean(contact.curatedCategory),
					isUncategorized,
					fadeWithSelectedStateOrb,
				});
			minLng = Math.min(minLng, coords.lng);
			maxLng = Math.max(maxLng, coords.lng);
			minLat = Math.min(minLat, coords.lat);
			maxLat = Math.max(maxLat, coords.lat);
		}

		// For a newly issued query/refetch, ignore transient empty pushes until
		// we've observed a loading phase for that same query key.
		if (
			dots.length === 0 &&
			hasLoadingSignal &&
			baseDotsPendingDataSearchKeyRef.current === searchKey &&
			!baseDotsPendingDataSawLoadingRef.current
		) {
			return;
		}

		// Guard against the one-render gap where isLoading just turned false but
		// visibleContacts hasn't been repopulated by recomputeViewportDots yet.
		// Without this, setData would briefly clear all dots before the next render
		// fills them back in, producing a visible disappear/reappear flicker.
		if (dots.length === 0 && contactsPropLengthRef.current > 0) {
			return;
		}

		// Fingerprint the data so we skip redundant setData calls that cause
		// Mapbox to briefly clear and re-render the same features (flicker).
		let dataKey = '';
		for (let i = 0; i < dots.length; i++) {
			const d = dots[i];
			dataKey +=
				(i > 0 ? ',' : '') +
				d.id +
				':' +
					d.fillColor +
					':' +
					(d.isUncategorized ? 'u' : 'c') +
					':' +
					(d.fadeWithSelectedStateOrb ? 'f' : 'n');
		}
		if (dataKey === baseDotsLastDataKeyRef.current) {
			return;
		}
		baseDotsLastDataKeyRef.current = dataKey;
		const isStableCuratedMarkerSet =
			dots.length > 0 &&
			dots.length <= CURATED_STABLE_MARKER_MAX_DOTS &&
			visibleContacts.length === dots.length &&
			visibleContacts.every((contact) => Boolean(contact.curatedCategory));

		// Interrupt the reveal wave before swapping source data; otherwise the in-flight
		// opacity expression can keep newly sampled dots hidden until old delays elapse.
		if (baseDotsWaveCancelRef.current) {
			stopBaseDotsWaveAndRestoreSteadyRendering();
		}

		const travelMs = computeDotWaveTravelMs(dots.length);
		let maxDelayMs = 0;
		const features: any[] = dots.map((dot) => {
			const delayMs = computeDotWaveDelayMs(
				dot.id,
				dot.lng,
				dot.lat,
				minLng,
				maxLng,
				minLat,
				maxLat,
				travelMs
			);
			maxDelayMs = Math.max(maxDelayMs, delayMs);
			return {
				type: 'Feature',
				id: dot.id,
				properties: {
					fillColor: dot.fillColor,
						[DOT_WAVE_DELAY_PROP]: delayMs,
						isCurated: dot.isCurated,
						isUncategorized: dot.isUncategorized,
						fadeWithSelectedStateOrb: dot.fadeWithSelectedStateOrb,
						fallbackIcon: dot.isUncategorized ? uncategorizedContactMarkerImageName : '',
					},
				geometry: { type: 'Point', coordinates: [dot.lng, dot.lat] },
			};
		});

		baseDotsWaveMetaRef.current = features.length > 0 ? { maxDelayMs } : null;

		// Prevent "show -> hide -> reveal" flicker: if the wave reveal is about to start
		// on this render, pre-prime frame 0 before updating source data so dots don't
		// flash visible for one frame and then disappear.
		let prefersReducedMotion = false;
		try {
			prefersReducedMotion =
				typeof window !== 'undefined' &&
				typeof window.matchMedia === 'function' &&
				window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		} catch {
			prefersReducedMotion = false;
		}
		prefersReducedMotion =
			prefersReducedMotion || disableDotWaveReveal || isStableCuratedMarkerSet;
		// During long camera eases (e.g. cinematic fitBounds after a top-search),
		// avoid priming the "hide then reveal" wave frame. Otherwise dots can
		// disappear mid-flight and then reappear as the wave runs.
		let isCameraMoving = false;
		try {
			isCameraMoving = map.isMoving();
		} catch {
			isCameraMoving = false;
		}
		const shouldPrimeWaveFrameZero =
			baseDotsWavePrevIsLoadingRef.current &&
			searchKey.length > 0 &&
			!isBackgroundPresentation &&
			!prefersReducedMotion &&
			baseDotsWavePendingSearchKeyRef.current === searchKey &&
			features.length > 0 &&
			!isCameraMoving;
		if (shouldPrimeWaveFrameZero) {
			const expr0 = [
				'interpolate',
				DOT_WAVE_EASING,
				['-', 0, ['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0]],
				0,
				0,
				DOT_WAVE_FADE_MS,
				1,
			] as any;
			try {
				if (map.getLayer(MAPBOX_LAYER_IDS.baseGlow)) {
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.baseGlow,
						'circle-opacity',
						withCategorizedDotOpacity(withResultDotGlowOpacity(expr0))
					);
				}
				if (map.getLayer(MAPBOX_LAYER_IDS.baseDots)) {
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.baseDots,
						'circle-opacity',
						withCategorizedDotOpacity(expr0)
					);
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.baseDots,
						'circle-stroke-opacity',
						expr0
					);
				}
				if (map.getLayer(MAPBOX_LAYER_IDS.baseFallbackIcons)) {
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.baseFallbackIcons,
						'icon-opacity',
						expr0
					);
				}
			} catch {
				// Ignore.
			}
			try {
				if (map.getLayer(MAPBOX_LAYER_IDS.baseHit)) {
					map.setFilter(MAPBOX_LAYER_IDS.baseHit, [
						'<=',
						['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0],
						-1,
					] as any);
				}
			} catch {
				// Ignore.
			}
		}
		source.setData({ type: 'FeatureCollection', features } as any);
		if (baseDotsPendingDataSearchKeyRef.current === searchKey) {
			baseDotsPendingDataSearchKeyRef.current = null;
			baseDotsPendingDataSawLoadingRef.current = false;
		}
	}, [
		map,
		isMapLoaded,
		isLoading,
		contacts.length,
		visibleContacts,
		getContactCoords,
		searchWhat,
		lockedStateKey,
		isStateLayerReady,
		isCoordsInLockedState,
		searchQuery,
		isBackgroundPresentation,
		disableDotWaveReveal,
		stopBaseDotsWaveAndRestoreSteadyRendering,
		uncategorizedContactMarkerImageName,
	]);

	// Drive base-marker visibility via `setFilter` (cheap, no layer rebuild)
	// instead of changing source data on every viewport change. The source
	// above contains the full `contactsWithCoords`; this filter narrows what
	// renders to the viewport-sampled subset (`visibleContacts`). Together
	// these eliminate the `setData`-induced layer clear that fast zoom used
	// to trigger ("disappear and reload").
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const visibleIds = visibleContacts.map((c) => c.id);
		const visibilityFilter: any =
			visibleIds.length === 0
				? ['==', ['id'], -1]
				: ['match', ['id'], visibleIds, true, false];

		const safeSet = (layerId: string, filter: any) => {
			try {
				if (!map.getLayer(layerId)) return;
				map.setFilter(layerId, filter);
			} catch {
				// Ignore style timing races.
			}
		};

		// While a wave reveal is active, leave baseHit's filter alone — the
		// wave manager owns it and will restore the visibility filter when
		// the wave completes (see stopBaseDotsWaveAndRestoreSteadyRendering).
		if (!baseDotsWaveCancelRef.current) {
			safeSet(MAPBOX_LAYER_IDS.baseHit, visibilityFilter);
		}
		safeSet(MAPBOX_LAYER_IDS.baseGlow, visibilityFilter);
		safeSet(MAPBOX_LAYER_IDS.baseDots, visibilityFilter);
		// baseFallbackIcons already filters by isUncategorized; AND with visibility.
		safeSet(MAPBOX_LAYER_IDS.baseFallbackIcons, [
			'all',
			['==', ['get', 'isUncategorized'], true],
			visibilityFilter,
		]);
	}, [map, isMapLoaded, visibleContacts]);

	// Sync `inConstellation` feature-state on the base markers source so the
	// zoom-fade paint expressions can dim non-constellation dots at low zoom.
	// Default (unset) reads as visible; only contacts NOT in the frozen
	// constellation node set are explicitly marked false.
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		try {
			map.removeFeatureState({ source: MAPBOX_SOURCE_IDS.markersBase });
		} catch {
			// Ignore style timing races.
		}

		const nodeIds = markerConstellationNodeIdsRef.current;
		const blobProtectedIds = curatedBlobProtectedMarkerIdsRef.current;
		if (nodeIds.size === 0 && blobProtectedIds.size === 0) return;

		for (const contact of visibleContacts) {
			if (nodeIds.has(contact.id)) continue;
			if (blobProtectedIds.has(contact.id)) continue;
			try {
				map.setFeatureState(
					{ source: MAPBOX_SOURCE_IDS.markersBase, id: contact.id },
					{ inConstellation: false }
				);
			} catch {
				// Ignore style timing races.
			}
		}
	}, [
		map,
		isMapLoaded,
		visibleContacts,
		markerConstellationCompositionNonce,
		curatedBlobProtectedMarkerIdsNonce,
	]);

	// Wave reveal for base dots on each completed search (left → right).
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const safeSetFilter = (layerId: string, filter: any) => {
			try {
				if (!map.getLayer(layerId)) return;
				map.setFilter(layerId, filter);
			} catch {
				// Ignore.
			}
		};
		const safeClearFilter = (layerId: string) => {
			try {
				if (!map.getLayer(layerId)) return;
				map.setFilter(layerId, null as any);
			} catch {
				// Ignore.
			}
		};
		const safeSetPaint = (layerId: string, prop: string, value: any) => {
			try {
				if (!map.getLayer(layerId)) return;
				// Mapbox types are a strict union of paint keys; we intentionally set a small dynamic set.
				(map as any).setPaintProperty(layerId, prop, value);
			} catch {
				// Ignore.
			}
		};

		const stopRunningWave = () => {
			if (baseDotsWaveCancelRef.current) {
				baseDotsWaveCancelRef.current();
				baseDotsWaveCancelRef.current = null;
			}
		};

		const restoreBaseDotsRendering = (transitionMs = 0) => {
			// Reset base dots to normal rendering (no animated expression).
			// IMPORTANT: set transitions *before* opacity changes.
			const transition = { duration: transitionMs, delay: 0 } as any;
			safeSetPaint(MAPBOX_LAYER_IDS.baseGlow, 'circle-opacity-transition', transition);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseGlow,
				'circle-opacity',
				CATEGORIZED_DOT_GLOW_ZOOM_FADE_EXPR
			);
			safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-opacity-transition', transition);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseDots,
				'circle-stroke-opacity-transition',
				transition
			);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseDots,
				'circle-opacity',
				CATEGORIZED_DOT_ZOOM_FADE_EXPR
			);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseDots,
				'circle-stroke-opacity',
				CURATED_DOT_ZOOM_FADE_EXPR
			);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseFallbackIcons,
				'icon-opacity-transition',
				transition
			);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseFallbackIcons,
				'icon-opacity',
				CURATED_DOT_ZOOM_FADE_EXPR
			);
			safeClearFilter(MAPBOX_LAYER_IDS.baseHit);
		};

		const loading = Boolean(isLoading);
		const searchKey = (searchQuery ?? '').trim();
		const isSearchMode = searchKey.length > 0;
		const prevLoading = baseDotsWavePrevIsLoadingRef.current;
		const isNewSearchKey =
			isSearchMode && baseDotsWaveLastSearchKeyRef.current !== searchKey;

		let prefersReducedMotion = false;
		try {
			prefersReducedMotion =
				typeof window !== 'undefined' &&
				typeof window.matchMedia === 'function' &&
				window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		} catch {
			prefersReducedMotion = false;
		}
		prefersReducedMotion = prefersReducedMotion || disableDotWaveReveal;

		// During loading (or in decorative mode), keep everything stable and avoid running reveal.
		if (loading || isBackgroundPresentation || !isSearchMode || prefersReducedMotion) {
			// Only schedule a wave when a *new* search actually enters a loading state.
			// This prevents zoom/viewport refetches from triggering a full hide→reveal cycle.
			if (loading && isNewSearchKey) {
				const pendingCinematic = pendingSearchQueryCinematicRef.current;
				const isCinematicSearchKey =
					!!pendingCinematic &&
					pendingCinematic.key === searchKey &&
					Date.now() - pendingCinematic.at < 10_000;

				// In fullscreen map-view searches we often kick off a long cinematic camera ease.
				// Running the hide→reveal wave during that sweep causes dots to disappear/reappear.
				// Mark the search as "handled" so we keep dots steady instead.
				if (isCinematicSearchKey) {
					baseDotsWaveLastSearchKeyRef.current = searchKey;
					baseDotsWavePendingSearchKeyRef.current = null;
				} else {
					baseDotsWavePendingSearchKeyRef.current = searchKey;
				}
			}

			stopRunningWave();
			restoreBaseDotsRendering(0);
			baseDotsWavePrevIsLoadingRef.current = loading;
			// When not in search mode, allow future searches to animate again.
			if (!isSearchMode) {
				baseDotsWaveLastSearchKeyRef.current = '';
				baseDotsWavePendingSearchKeyRef.current = null;
			} else if (!loading && baseDotsWavePendingSearchKeyRef.current === searchKey) {
				// If we decided not to animate for this search (decorative mode / reduced motion),
				// mark it as handled so it doesn't unexpectedly animate later.
				baseDotsWaveLastSearchKeyRef.current = searchKey;
				baseDotsWavePendingSearchKeyRef.current = null;
			}
			return;
		}

		const shouldStartWave =
			prevLoading && !loading && baseDotsWavePendingSearchKeyRef.current === searchKey;
		baseDotsWavePrevIsLoadingRef.current = loading;

		if (!shouldStartWave) return;

		// If the map camera is still moving/easing (common in cinematic search sweeps),
		// keep dots steady. Starting the wave now causes a visible disappear/reappear flicker.
		let isCameraMoving = false;
		try {
			isCameraMoving = map.isMoving();
		} catch {
			isCameraMoving = false;
		}
		if (isCameraMoving) {
			stopRunningWave();
			restoreBaseDotsRendering(0);
			baseDotsWaveLastSearchKeyRef.current = searchKey;
			baseDotsWavePendingSearchKeyRef.current = null;
			return;
		}

		stopRunningWave();

		const meta = baseDotsWaveMetaRef.current;
		if (!meta || !Number.isFinite(meta.maxDelayMs) || meta.maxDelayMs <= 0) {
			restoreBaseDotsRendering(0);
			baseDotsWaveLastSearchKeyRef.current = searchKey;
			baseDotsWavePendingSearchKeyRef.current = null;
			return;
		}
		baseDotsWaveLastSearchKeyRef.current = searchKey;
		baseDotsWavePendingSearchKeyRef.current = null;

		// Enable smooth transitions between throttled paint updates.
		// A duration slightly longer than the frame interval lets Mapbox interpolate
		// between our discrete expression snapshots, eliminating visible stepping.
		safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-opacity-transition', {
			duration: DOT_WAVE_SMOOTH_TRANSITION_MS,
			delay: 0,
		} as any);
		safeSetPaint(MAPBOX_LAYER_IDS.baseGlow, 'circle-opacity-transition', {
			duration: DOT_WAVE_SMOOTH_TRANSITION_MS,
			delay: 0,
		} as any);
		safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-stroke-opacity-transition', {
			duration: DOT_WAVE_SMOOTH_TRANSITION_MS,
			delay: 0,
		} as any);
		safeSetPaint(MAPBOX_LAYER_IDS.baseFallbackIcons, 'icon-opacity-transition', {
			duration: DOT_WAVE_SMOOTH_TRANSITION_MS,
			delay: 0,
		} as any);

		const buildOpacityExpr = (nowMs: number) => {
			return [
				'interpolate',
				DOT_WAVE_EASING,
				['-', nowMs, ['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0]],
				0,
				0,
				DOT_WAVE_FADE_MS,
				1,
			] as any;
		};

		// Start non-interactive; we'll enable hits as the wave reaches dots.
		safeSetFilter(MAPBOX_LAYER_IDS.baseHit, [
			'<=',
			['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0],
			-1,
		] as any);

		let cancelled = false;
		let rafId: number | null = null;
		let lastPaintUpdateAt = -Infinity;
		let lastHitUpdateAt = -Infinity;
		const start = performance.now();
		const totalMs = meta.maxDelayMs + DOT_WAVE_FADE_MS + 120;

		const cancel = () => {
			cancelled = true;
			if (rafId != null) cancelAnimationFrame(rafId);
			rafId = null;
		};

		const tick = () => {
			if (cancelled) return;
			const now = performance.now();
			const t = now - start;

			if (t - lastPaintUpdateAt >= DOT_WAVE_FRAME_MS) {
				const expr = buildOpacityExpr(t);
				safeSetPaint(
					MAPBOX_LAYER_IDS.baseGlow,
					'circle-opacity',
					withCategorizedDotOpacity(withResultDotGlowOpacity(expr))
				);
				safeSetPaint(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-opacity',
					withCategorizedDotOpacity(expr)
				);
				safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-stroke-opacity', expr);
				safeSetPaint(MAPBOX_LAYER_IDS.baseFallbackIcons, 'icon-opacity', expr);
				lastPaintUpdateAt = t;
			}

			// Don't churn filters at 60fps; updating every ~90ms is plenty for hit gating.
			if (t - lastHitUpdateAt >= 90) {
				safeSetFilter(MAPBOX_LAYER_IDS.baseHit, [
					'<=',
					['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0],
					t,
				] as any);
				lastHitUpdateAt = t;
			}

			if (t < totalMs) {
				rafId = requestAnimationFrame(tick);
				return;
			}

			// Finished: hand off smoothly to steady-state rendering/interactivity.
			restoreBaseDotsRendering(90);
			cancel();
			if (baseDotsWaveCancelRef.current === cancel) baseDotsWaveCancelRef.current = null;
		};
		baseDotsWaveCancelRef.current = cancel;

		// Prime frame 0 (all hidden) before the first rAF callback.
		const expr0 = buildOpacityExpr(0);
		safeSetPaint(
			MAPBOX_LAYER_IDS.baseGlow,
			'circle-opacity',
			withCategorizedDotOpacity(withResultDotGlowOpacity(expr0))
		);
		safeSetPaint(
			MAPBOX_LAYER_IDS.baseDots,
			'circle-opacity',
			withCategorizedDotOpacity(expr0)
		);
		safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-stroke-opacity', expr0);
		safeSetPaint(MAPBOX_LAYER_IDS.baseFallbackIcons, 'icon-opacity', expr0);

		rafId = requestAnimationFrame(tick);

		return () => {
			cancel();
			if (baseDotsWaveCancelRef.current === cancel) baseDotsWaveCancelRef.current = null;
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		isBackgroundPresentation,
		searchQuery,
		disableDotWaveReveal,
	]);

	// Keep the frozen constellation's rendered line source synced after style/coordinate changes.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (!markerConstellationComposedSearchKeyRef.current) return;
		writeMarkerConstellationSourceData();
		if (markerConstellationRevealDoneRef.current) {
			setMarkerConstellationLineOpacity(
				markerConstellationEdgesRef.current.length > 0
					? MARKER_CONSTELLATION_CORE_OPACITY
					: 0,
				markerConstellationEdgesRef.current.length > 0
					? MARKER_CONSTELLATION_GLOW_OPACITY
					: 0,
				0
			);
		}
	}, [
		map,
		isMapLoaded,
		writeMarkerConstellationSourceData,
		setMarkerConstellationLineOpacity,
	]);

	// Compose marker constellations once per result set from the camera-independent
	// pool of result contacts so lines can fade in over the autoFit fly-in.
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const searchKey = (searchQuery ?? '').trim();
		const isSearchMode = searchKey.length > 0;
		const loading = Boolean(isLoading);

		if (!isSearchMode || isBackgroundPresentation) {
			markerConstellationLastSearchKeyRef.current = searchKey;
			clearMarkerConstellation();
			return;
		}

		if (searchKey !== markerConstellationLastSearchKeyRef.current) {
			markerConstellationLastSearchKeyRef.current = searchKey;
			clearMarkerConstellation();
		}

		if (loading) {
			const composedKey = markerConstellationComposedSearchKeyRef.current;
			const hasComposedForCurrentSearch =
				composedKey === searchKey || composedKey.startsWith(`${searchKey}|results:`);
			if (!hasComposedForCurrentSearch) {
				stopMarkerConstellationReveal();
				markerConstellationEdgesRef.current = [];
				markerConstellationNodesRef.current = [];
				markerConstellationContactsByIdRef.current = new Map();
				markerConstellationNodeIdsRef.current = new Set();
				markerConstellationComposedSearchKeyRef.current = '';
				markerConstellationLastDataKeyRef.current = '';
				setMarkerConstellationCompositionNonce((value) => value + 1);
				setMarkerConstellationLineOpacity(0, 0, 0);
			}
			return;
		}

		if (contactsWithCoords.length < 2) return;

		const resultSignature = contactsWithCoords
			.map((contact) => {
				const coords = getContactCoords(contact);
				if (!coords) return null;
				return `${contact.id}:${contact.curatedCategory ?? ''}:${coords.lng.toFixed(
					5
				)}:${coords.lat.toFixed(5)}`;
			})
			.filter((part): part is string => part != null)
			.sort()
			.join(',');
		if (!resultSignature) return;

		const resultKey = `${searchKey}|results:${resultSignature}`;
		if (
			markerConstellationComposedSearchKeyRef.current.startsWith(
				`${resultKey}|beauty-v2:`
			)
		) {
			return;
		}

		// Constellation topology projects to a stable Mercator pixel grid
		// (MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM), so the graph itself doesn't
		// depend on the camera. Source from contactsWithCoords (camera-independent)
		// and compose immediately so the lines fade in over the autoFit fly-in
		// instead of popping in once it lands. The retry-on-moveend path below is
		// kept as a safety net for the rare zero-edges fallback.
		const ensureDeferredMoveEndListener = () => {
			if (markerConstellationDeferredMoveEndRef.current) return;
			const onMoveEnd = () => {
				if (markerConstellationDeferredMoveEndRef.current === onMoveEnd) {
					markerConstellationDeferredMoveEndRef.current = null;
				}
				setMarkerConstellationIdleNonce((value) => value + 1);
			};
			markerConstellationDeferredMoveEndRef.current = onMoveEnd;
			map.once('moveend', onMoveEnd);
		};

		let cancelled = false;
		// rAF-defer one frame so the dot first-paint isn't blocked by the
		// O(N²) edge builder that runs below.
		const rafId = requestAnimationFrame(() => {
			if (cancelled) return;

			const curatedBlobGroupKeyByContactId = new Map<number, string>();
			const curatedBlobPoints = contactsWithCoords
				.map((contact) => {
					if (!contact.curatedCategory) return null;
					const coords = getContactCoords(contact);
					if (!coords) return null;
					return projectCuratedBlobPoint(contact.id, coords);
				})
				.filter((point): point is CuratedBlobMercatorPoint => point != null);

			if (curatedBlobPoints.length >= 2) {
				const clusters = pickAdaptiveCuratedBlobClusters(curatedBlobPoints);
				clusters.forEach((cluster, index) => {
					for (const point of cluster.points) {
						curatedBlobGroupKeyByContactId.set(point.id, `blob:${index}`);
					}
				});
			}

			// When a state is locked, prefer in-state contacts so the 180-point cap
			// doesn't get dominated by out-of-state contacts at low zoom — this
			// mirrors the in/out balance that visibleContacts uses.
			let contactsForConstellation: ContactWithName[];
			if (lockedStateKey) {
				const insideState: ContactWithName[] = [];
				for (const contact of contactsWithCoords) {
					const contactStateKey = normalizeStateKey(contact.state ?? null);
					if (contactStateKey === lockedStateKey) {
						insideState.push(contact);
					} else if (!contactStateKey) {
						const coords = getContactCoords(contact);
						if (coords && isCoordsInLockedState(coords)) insideState.push(contact);
					}
				}
				contactsForConstellation =
					insideState.length >= 2 ? insideState : contactsWithCoords.slice();
			} else {
				contactsForConstellation = contactsWithCoords.slice();
			}

			if (contactsForConstellation.length > MARKER_CONSTELLATION_MAX_POINTS) {
				contactsForConstellation = contactsForConstellation
					.map((contact) => ({
						contact,
						score: hashStringToUint32(`${searchKey}|constellation|${contact.id}`),
					}))
					.sort((a, b) => a.score - b.score)
					.slice(0, MARKER_CONSTELLATION_MAX_POINTS)
					.map(({ contact }) => contact);
			}
			contactsForConstellation.sort((a, b) => a.id - b.id);

			let currentZoom = MAP_DEFAULT_ZOOM;
			try {
				currentZoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
			} catch {
				currentZoom = MAP_DEFAULT_ZOOM;
			}
			if (!Number.isFinite(currentZoom)) currentZoom = MAP_DEFAULT_ZOOM;
			// Constellation topology is frozen once per result set. If a search starts
			// from the low-zoom globe, current screen pixels collapse nearby contacts
			// enough that the edge builder can cache an empty formation. Compose in a
			// stable Mercator pixel space with a normal-map zoom floor instead.
			const constellationComposeZoom = Math.max(
				MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM,
				currentZoom
			);
			const constellationWorldSize =
				512 * Math.pow(2, constellationComposeZoom);

			let points: MarkerConstellationPoint[] = [];
			const contactsByPointId = new Map<number, ContactWithName>();
			for (const contact of contactsForConstellation) {
				const coords = getContactCoords(contact);
				if (!coords) continue;
				const curatedGroupKey = curatedBlobGroupKeyByContactId.get(contact.id);
				if (curatedBlobGroupKeyByContactId.size > 0 && !curatedGroupKey) continue;

				const projected = latLngToWorldPixel(coords, constellationWorldSize);
				if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) continue;

				points.push({
					id: contact.id,
					coords,
					x: projected.x,
					y: projected.y,
					groupKey: curatedGroupKey ?? 'fallback:pending',
				});
				contactsByPointId.set(contact.id, contact);
			}

			if (curatedBlobGroupKeyByContactId.size === 0 && points.length >= 2) {
				const fallbackGroupKeyById = buildFallbackMarkerConstellationGroupKeys(points);
				points = points.map((point) => ({
					...point,
					groupKey: fallbackGroupKeyById.get(point.id) ?? `fallback:${point.id}`,
				}));
			}

			const pointsSignature = points
				.map(
					(point) =>
						`${point.id}:${point.groupKey}:${point.coords.lng.toFixed(
							5
						)}:${point.coords.lat.toFixed(5)}`
				)
				.join(',');
			const compositionKey = `${resultKey}|beauty-v2:${pointsSignature}`;
			if (markerConstellationComposedSearchKeyRef.current === compositionKey) return;

			if (points.length < 2) {
				// No projectable points. Don't cache — leave composedKey unset so a
				// later contactsWithCoords update can retry.
				stopMarkerConstellationReveal();
				markerConstellationEdgesRef.current = [];
				markerConstellationNodesRef.current = [];
				markerConstellationContactsByIdRef.current = new Map();
				markerConstellationNodeIdsRef.current = new Set();
				markerConstellationComposedSearchKeyRef.current = '';
				markerConstellationRevealDoneRef.current = true;
				markerConstellationLastDataKeyRef.current = '';
				setMarkerConstellationCompositionNonce((value) => value + 1);
				setMarkerConstellationLineOpacity(0, 0, 0);
				writeMarkerConstellationSourceData();
				ensureDeferredMoveEndListener();
				return;
			}

			const seed = `${searchKey}|${points.map((point) => point.id).join(',')}`;
			const formation = buildBeautyMarkerConstellationFormation(
				points,
				seed,
				constellationComposeZoom
			);

			if (formation.edges.length === 0 && formation.nodes.length === 0) {
				// No drawable formation. Leave composedKey unset so the next idle update
				// can retry after a pan/zoom or a denser coordinate update.
				stopMarkerConstellationReveal();
				markerConstellationEdgesRef.current = [];
				markerConstellationNodesRef.current = [];
				markerConstellationContactsByIdRef.current = contactsByPointId;
				markerConstellationNodeIdsRef.current = new Set();
				markerConstellationComposedSearchKeyRef.current = '';
				markerConstellationRevealDoneRef.current = true;
				markerConstellationLastDataKeyRef.current = '';
				setMarkerConstellationCompositionNonce((value) => value + 1);
				setMarkerConstellationLineOpacity(0, 0, 0);
				writeMarkerConstellationSourceData();
				ensureDeferredMoveEndListener();
				return;
			}

			stopMarkerConstellationReveal();
			markerConstellationEdgesRef.current = formation.edges;
			markerConstellationNodesRef.current = formation.nodes;
			markerConstellationContactsByIdRef.current = contactsByPointId;
			markerConstellationNodeIdsRef.current = formation.lowZoomNodeIds;
			markerConstellationComposedSearchKeyRef.current = compositionKey;
			markerConstellationRevealDoneRef.current = false;
			markerConstellationLastDataKeyRef.current = '';
			setMarkerConstellationCompositionNonce((value) => value + 1);
			setMarkerConstellationLineOpacity(0, 0, 0);
			writeMarkerConstellationSourceData();
			startMarkerConstellationReveal();
		});

		return () => {
			cancelled = true;
			cancelAnimationFrame(rafId);
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		isBackgroundPresentation,
		searchQuery,
		contactsWithCoords,
		getContactCoords,
		lockedStateKey,
		isCoordsInLockedState,
		markerConstellationIdleNonce,
		clearMarkerConstellation,
		stopMarkerConstellationReveal,
		setMarkerConstellationLineOpacity,
		writeMarkerConstellationSourceData,
		startMarkerConstellationReveal,
	]);

	// All-contacts overlay (gray dots)
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.markersAllOverlay) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;

		if (isLoading) {
			// Preserve existing overlay dots while parent data is refetching.
			return;
			}

			const fadeWithSelectedStateOrb = Boolean(
				lockedStateKey &&
					lockedStateSelectionKeyRef.current === lockedStateKey &&
					selectedStateMorphSourceRef.current
			);
			const features: any[] = [];
			for (const contact of allContactsOverlayVisibleContacts) {
				const coords = getAllContactsOverlayContactCoords(contact);
				if (!coords) continue;
				features.push({
					type: 'Feature',
					id: contact.id,
					properties: {
						fillColor: ALL_CONTACTS_OVERLAY_DOT_FILL_COLOR,
						fadeWithSelectedStateOrb,
					},
					geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
				});
			}

		source.setData({ type: 'FeatureCollection', features } as any);
	}, [
		map,
		isMapLoaded,
		isLoading,
			allContactsOverlayVisibleContacts,
			getAllContactsOverlayContactCoords,
			lockedStateKey,
			isStateLayerReady,
		]);

	// Promotion overlay: split into in-state dots vs out-of-state pins
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const dotSource = map.getSource(MAPBOX_SOURCE_IDS.markersPromotionDot) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const pinSource = map.getSource(MAPBOX_SOURCE_IDS.markersPromotionPin) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!dotSource || !pinSource) return;

		if (isLoading) {
			// Preserve existing promotion markers while parent data is refetching.
			return;
		}

		let cancelled = false;

		const run = async () => {
				const hasLockedStateSelection = Boolean(
					lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey
				);
				const fadeWithSelectedStateOrb = Boolean(
					hasLockedStateSelection && selectedStateMorphSourceRef.current
				);

			const dotFeatures: any[] = [];
			const pinFeatures: any[] = [];
			const dotIds = new Set<number>();
			const pinIds = new Set<number>();
			const imagesToEnsure = new Map<string, string>(); // name -> url

			for (const contact of promotionOverlayVisibleContacts) {
				const coords = getPromotionOverlayContactCoords(contact);
				if (!coords) continue;

				const isOutsideLockedState = hasLockedStateSelection
					? !isCoordsInLockedState(coords)
					: false;
				const shouldUsePinStyle = !hasLockedStateSelection || isOutsideLockedState;

				const whatForMarker =
					getPromotionOverlayWhatFromContactTitle(contact.title) ?? null;
				const dotFillColor = getResultDotColorForWhat(whatForMarker);
				const dotFillColorOutside = washOutHexColor(
					dotFillColor,
					OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE
				);
				const pinFillColor = isOutsideLockedState ? dotFillColorOutside : dotFillColor;

				if (!shouldUsePinStyle) {
					dotIds.add(contact.id);
						dotFeatures.push({
							type: 'Feature',
							id: contact.id,
							properties: { fillColor: dotFillColor, fadeWithSelectedStateOrb },
							geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
						});
					continue;
				}

				pinIds.add(contact.id);
				const defaultUrl = getMarkerPinUrl(
					pinFillColor,
					RESULT_DOT_STROKE_COLOR_DEFAULT,
					whatForMarker
				);
				const selectedUrl = getMarkerPinUrl(
					pinFillColor,
					RESULT_DOT_STROKE_COLOR_SELECTED,
					whatForMarker
				);
				const iconDefault = imageNameFromUrl(defaultUrl);
				const iconSelected = imageNameFromUrl(selectedUrl);
				imagesToEnsure.set(iconDefault, defaultUrl);
				imagesToEnsure.set(iconSelected, selectedUrl);

					pinFeatures.push({
						type: 'Feature',
						id: contact.id,
						properties: { iconDefault, iconSelected, fadeWithSelectedStateOrb },
						geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
					});
			}

			await Promise.all(
				Array.from(imagesToEnsure.entries()).map(([name, url]) =>
					ensureMapImageFromUrl(name, url)
				)
			);

			if (cancelled) return;

			dotSource.setData({ type: 'FeatureCollection', features: dotFeatures } as any);
			pinSource.setData({ type: 'FeatureCollection', features: pinFeatures } as any);
			promotionDotIdsRef.current = dotIds;
			promotionPinIdsRef.current = pinIds;
		};

		void run();

		return () => {
			cancelled = true;
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		promotionOverlayVisibleContacts,
		lockedStateKey,
		isStateLayerReady,
		getPromotionOverlayContactCoords,
		isCoordsInLockedState,
		getMarkerPinUrl,
		imageNameFromUrl,
		ensureMapImageFromUrl,
	]);

	// Booking extra pins
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.markersBookingPin) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;

		if (isLoading) {
			// Preserve existing booking markers while parent data is refetching.
			return;
		}

		let cancelled = false;

		const run = async () => {
				const hasLockedStateSelection = Boolean(
					lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey
				);
				const fadeWithSelectedStateOrb = Boolean(
					hasLockedStateSelection && selectedStateMorphSourceRef.current
				);

			const features: any[] = [];
			const imagesToEnsure = new Map<string, string>(); // name -> url

			for (const contact of bookingExtraVisibleContacts) {
				const coords = getBookingExtraContactCoords(contact);
				if (!coords) continue;

				const isOutsideLockedState = hasLockedStateSelection
					? !isCoordsInLockedState(coords)
					: false;
				const whatForMarker =
					getBookingTitlePrefixFromContactTitle(contact.title) ?? null;
				const dotFillColor = getResultDotColorForWhat(whatForMarker);
				const dotFillColorOutside = washOutHexColor(
					dotFillColor,
					OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE
				);
				const pinFillColor = isOutsideLockedState ? dotFillColorOutside : dotFillColor;

				const defaultUrl = getMarkerPinUrl(
					pinFillColor,
					RESULT_DOT_STROKE_COLOR_DEFAULT,
					whatForMarker,
					RESULT_DOT_STROKE_COLOR_DEFAULT
				);
				const hoverUrl = getMarkerPinUrl(
					pinFillColor,
					BOOKING_EXTRA_PIN_HOVER_STROKE_COLOR,
					whatForMarker,
					BOOKING_EXTRA_PIN_HOVER_STROKE_COLOR
				);
				const selectedUrl = getMarkerPinUrl(
					pinFillColor,
					RESULT_DOT_STROKE_COLOR_SELECTED,
					whatForMarker,
					RESULT_DOT_STROKE_COLOR_SELECTED
				);

				const iconDefault = imageNameFromUrl(defaultUrl);
				const iconHover = imageNameFromUrl(hoverUrl);
				const iconSelected = imageNameFromUrl(selectedUrl);
				imagesToEnsure.set(iconDefault, defaultUrl);
				imagesToEnsure.set(iconHover, hoverUrl);
				imagesToEnsure.set(iconSelected, selectedUrl);

				features.push({
					type: 'Feature',
					id: contact.id,
						properties: {
							iconDefault,
							iconHover,
							iconSelected,
							category: whatForMarker ?? '',
							fadeWithSelectedStateOrb,
						},
					geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
				});
			}

			await Promise.all(
				Array.from(imagesToEnsure.entries()).map(([name, url]) =>
					ensureMapImageFromUrl(name, url)
				)
			);

			if (cancelled) return;
			source.setData({ type: 'FeatureCollection', features } as any);
		};

		void run();

		return () => {
			cancelled = true;
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		bookingExtraVisibleContacts,
		lockedStateKey,
		isStateLayerReady,
		getBookingExtraContactCoords,
		isCoordsInLockedState,
		getMarkerPinUrl,
		imageNameFromUrl,
		ensureMapImageFromUrl,
	]);

	// Keep Mapbox marker "selected" feature-state in sync with `selectedContacts`.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const selectedSet = new Set<number>(selectedContacts);

		const setSelectedSafe = (sourceId: string, id: number, selected: boolean) => {
			try {
				map.setFeatureState({ source: sourceId, id }, { selected });
			} catch {
				// Ignore (feature may not exist yet in the source).
			}
		};

		for (const c of visibleContacts) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersBase, c.id, selectedSet.has(c.id));
		}
		for (const c of bookingExtraVisibleContacts) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersBookingPin, c.id, selectedSet.has(c.id));
		}
		for (const id of promotionDotIdsRef.current) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersPromotionDot, id, selectedSet.has(id));
		}
		for (const id of promotionPinIdsRef.current) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersPromotionPin, id, selectedSet.has(id));
		}
		for (const c of allContactsOverlayVisibleContacts) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersAllOverlay, c.id, selectedSet.has(c.id));
		}
	}, [
		map,
		isMapLoaded,
		selectedContacts,
		visibleContacts,
		bookingExtraVisibleContacts,
		allContactsOverlayVisibleContacts,
		promotionOverlayVisibleContacts,
	]);

	// Booking UX: highlight all booking extra pins of the hovered category.
	// Uses a single setFilter call on the hover layer instead of N setFeatureState calls,
	// so highlight/un-highlight is O(1) regardless of how many pins are in view.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const layer = MAPBOX_LAYER_IDS.bookingPinIconsHover;
		if (!map.getLayer(layer)) return;
		const cat = hoveredBookingExtraCategory;
		// Match features whose `category` property equals the hovered category.
		// When no category is hovered, match nothing (empty string never stored as a real category).
		map.setFilter(layer, ['==', ['get', 'category'], cat ?? '']);
	}, [map, isMapLoaded, hoveredBookingExtraCategory]);

	// Larger leave buffer zone - how much extra padding below the tooltip for hysteresis
	const hoverLeaveBufferPx = useMemo(() => {
		// The buffer should be roughly the size the hit area used to be (2x marker)
		// This prevents flicker when moving off the marker
		return markerScale * 2;
	}, [markerScale]);

	const selectedContactIdSet = useMemo(
		() => new Set<number>(selectedContacts),
		[selectedContacts]
	);

	// Selected marker "Research" panel anchoring (HTML overlay positioned with map.project).
	const selectedMarkerCoords = selectedMarker ? getContactCoords(selectedMarker) : null;
	const selectedMarkerOverlayRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isLoading) return;
		const el = selectedMarkerOverlayRef.current;
		if (!el || !selectedMarkerCoords) return;

		const update = () => {
			const p = map.project([selectedMarkerCoords.lng, selectedMarkerCoords.lat]);
			const rect = el.getBoundingClientRect();
			const x = p.x - rect.width / 2;
			const y = p.y - rect.height - 20;
			el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
		};

		update();
		map.on('move', update);
		return () => {
			map.off('move', update);
		};
	}, [map, isMapLoaded, isLoading, selectedMarkerCoords?.lat, selectedMarkerCoords?.lng]);

	// Hover tooltip anchoring (single overlay).
	const hoverTooltipContactId = hoveredMarkerId ?? fadingTooltipId;
	const hoverTooltipEntry = useMemo(() => {
		if (hoverTooltipContactId == null) return null;
		const base = visibleContactsById.get(hoverTooltipContactId);
		if (base) return { kind: 'base' as const, contact: base };
		const booking = bookingExtraContactsById.get(hoverTooltipContactId);
		if (booking) return { kind: 'booking' as const, contact: booking };
		const promo = promotionOverlayContactsById.get(hoverTooltipContactId);
		if (promo) return { kind: 'promotion' as const, contact: promo };
		const all = allOverlayContactsById.get(hoverTooltipContactId);
		if (all) return { kind: 'all' as const, contact: all };
		return null;
	}, [
		hoverTooltipContactId,
		visibleContactsById,
		bookingExtraContactsById,
		promotionOverlayContactsById,
		allOverlayContactsById,
	]);

	const hoverTooltipCoords = useMemo(() => {
		if (!hoverTooltipEntry) return null;
		const c = hoverTooltipEntry.contact;
		switch (hoverTooltipEntry.kind) {
			case 'base':
				return getContactCoords(c);
			case 'booking':
				return getBookingExtraContactCoords(c);
			case 'promotion':
				return getPromotionOverlayContactCoords(c);
			case 'all':
				return getAllContactsOverlayContactCoords(c);
			default:
				return null;
		}
	}, [
		hoverTooltipEntry,
		getContactCoords,
		getBookingExtraContactCoords,
		getPromotionOverlayContactCoords,
		getAllContactsOverlayContactCoords,
	]);

	const hoverTooltipData = useMemo(() => {
		if (!hoverTooltipEntry) return null;
		const contact = hoverTooltipEntry.contact;
		const kind = hoverTooltipEntry.kind;
		const isSelected = selectedContactIdSet.has(contact.id);

		const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
		const nameForTooltip = fullName || contact.name || '';
		const companyForTooltip = contact.company || '';
		const titleForTooltip = (
			contact.curatedDisplayLabel ||
			contact.title ||
			contact.headline ||
			''
		).trim();

		if (kind === 'all') {
			const tooltipFillColor = isSelected
				? TOOLTIP_FILL_COLOR_SELECTED
				: ALL_CONTACTS_OVERLAY_TOOLTIP_FILL_COLOR;
			const width = calculateTooltipWidth(
				nameForTooltip,
				companyForTooltip,
				titleForTooltip
			);
			const height = calculateTooltipHeight(nameForTooltip, companyForTooltip);
			const anchorY = calculateTooltipAnchorY(nameForTooltip, companyForTooltip);
			return {
				url: generateMapTooltipIconUrl(
					nameForTooltip,
					companyForTooltip,
					titleForTooltip,
					tooltipFillColor
				),
				width,
				height,
				anchorY,
			};
		}

		const whatForMarker =
			kind === 'base'
				? (contact.curatedCategory ?? searchWhat ?? null)
				: kind === 'booking'
					? (getBookingTitlePrefixFromContactTitle(contact.title) ?? null)
					: (getPromotionOverlayWhatFromContactTitle(contact.title) ?? null);

		// Even if the marker dot is "washed out" outside the locked/selected state, keep the hover tooltip
		// using the base category color so it consistently communicates the search intent.
		const dotFillColor = getResultDotColorForWhat(whatForMarker);

		const normalizedWhat = whatForMarker ? normalizeWhatKey(whatForMarker) : null;
		const baseTooltipFillColor = normalizedWhat
			? (WHAT_TO_HOVER_TOOLTIP_FILL_COLOR[normalizedWhat] ?? dotFillColor)
			: dotFillColor;

		const tooltipFillColor = isSelected
			? TOOLTIP_FILL_COLOR_SELECTED
			: baseTooltipFillColor;

		const width = calculateTooltipWidth(
			nameForTooltip,
			companyForTooltip,
			titleForTooltip,
			whatForMarker
		);
		const height = calculateTooltipHeight(nameForTooltip, companyForTooltip);
		const anchorY = calculateTooltipAnchorY(nameForTooltip, companyForTooltip);

		return {
			url: generateMapTooltipIconUrl(
				nameForTooltip,
				companyForTooltip,
				titleForTooltip,
				tooltipFillColor,
				whatForMarker
			),
			width,
			height,
			anchorY,
		};
	}, [hoverTooltipEntry, selectedContactIdSet, searchWhat]);

	const hoverTooltipOverlayRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isLoading) return;
		const el = hoverTooltipOverlayRef.current;
		if (!el || !hoverTooltipCoords || !hoverTooltipData) return;

		const update = () => {
			const p = map.project([hoverTooltipCoords.lng, hoverTooltipCoords.lat]);
			el.style.transform = `translate(${Math.round(p.x - MAP_TOOLTIP_ANCHOR_X)}px, ${Math.round(
				p.y - hoverTooltipData.anchorY
			)}px)`;
		};

		update();
		map.on('move', update);
		return () => {
			map.off('move', update);
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		hoverTooltipContactId,
		hoverTooltipCoords?.lat,
		hoverTooltipCoords?.lng,
		hoverTooltipData?.anchorY,
	]);

	return (
		<div
			className={
				isBackgroundPresentation
					? 'murmur-search-results-map murmur-search-results-map--background'
					: 'murmur-search-results-map murmur-search-results-map--interactive'
			}
			style={{
				width: '100%',
				height: '100%',
				position: 'relative',
				backgroundColor: '#000',
				borderRadius: 0,
				overflow: 'hidden',
			}}
		>
			{!isBackgroundPresentation && (
				<style>{`
					.murmur-search-results-map--interactive .mapboxgl-ctrl-bottom-left {
						left: 8px !important;
						bottom: 6px !important;
					}
					.murmur-search-results-map--interactive .mapboxgl-ctrl-bottom-left .mapboxgl-ctrl-logo {
						display: block !important;
						transform: scale(0.6);
						transform-origin: 0 100%;
						opacity: 0.8;
					}
				`}</style>
			)}
			<div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
			{/*
			  Selected state wash. This reuses the curated blob gradient language,
			  but clips it to the searched state's projected polygon. The white
			  border is a Mapbox layer so markers always render above it.
			*/}
			<svg
				ref={selectedStateGradientSvgRef}
				aria-hidden
				width="100%"
				height="100%"
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					opacity: 0,
					willChange: 'opacity',
					zIndex: 2,
					overflow: 'visible',
				}}
			>
				<defs>
					<radialGradient
						ref={selectedStateGradientRef}
						id={selectedStateGradientIds.gradient}
						cx="0"
						cy="0"
						r="1"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0.716346" stopColor="#EFE8D8" stopOpacity="0" />
						<stop offset="0.783654" stopColor="#FFF8E5" stopOpacity="0.55" />
						<stop offset="0.841346" stopColor="#CAD7FF" />
						<stop offset="0.884615" stopColor="#CBFFE7" />
						<stop offset="1" stopColor="#F0EBDE" stopOpacity="0.2" />
					</radialGradient>
					<radialGradient
						ref={selectedStateGradientBloomRef}
						id={selectedStateGradientIds.bloomGradient}
						cx="0"
						cy="0"
						r="1"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
						<stop offset="0.14" stopColor="#FFFFFF" stopOpacity="0.7" />
						<stop offset="0.36" stopColor="#FFFFFF" stopOpacity="0.4" />
						<stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0.18" />
						<stop offset="0.8" stopColor="#FFFFFF" stopOpacity="0.06" />
						<stop offset="0.92" stopColor="#FFFFFF" stopOpacity="0" />
					</radialGradient>
					<clipPath
						id={selectedStateGradientIds.clipPath}
						clipPathUnits="userSpaceOnUse"
					>
						<path
							ref={selectedStateGradientClipPathRef}
							d=""
							clipRule="evenodd"
						/>
					</clipPath>
				</defs>
				<ellipse
					ref={selectedStateGradientBloomEllipseRef}
					cx="0"
					cy="0"
					rx="0"
					ry="0"
					opacity="0"
					fill={`url(#${selectedStateGradientIds.bloomGradient})`}
					clipPath={`url(#${selectedStateGradientIds.clipPath})`}
				/>
				<ellipse
					ref={selectedStateGradientEllipseRef}
					cx="0"
					cy="0"
					rx="0"
					ry="0"
					opacity="0"
					fill={`url(#${selectedStateGradientIds.gradient})`}
					clipPath={`url(#${selectedStateGradientIds.clipPath})`}
					style={{ mixBlendMode: 'color' }}
				/>
			</svg>
			{/*
			  Curated cluster zoom-out orbs. Each SVG ellipse paints its own
			  radial gradient, while the clip paths are rebuilt from the same
			  morphed Mapbox blob geometry that draws the white outlines.
			*/}
			<svg
				ref={curatedOrbRef}
				aria-hidden
				width="100%"
				height="100%"
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					opacity: 0,
					willChange: 'opacity',
					zIndex: 2,
					overflow: 'visible',
				}}
			>
				<defs>
					{curatedOrbSlotIds.map((ids, index) => (
						<Fragment key={ids.gradient}>
							<radialGradient
								ref={(node) => {
									curatedOrbGradientRefs.current[index] = node;
								}}
								id={ids.gradient}
								cx="0"
								cy="0"
								r="1"
								gradientUnits="userSpaceOnUse"
							>
								<stop offset="0.716346" stopColor="#EFE8D8" stopOpacity="0" />
								<stop
									offset="0.783654"
									stopColor="#FFF8E5"
									stopOpacity="0.55"
								/>
								<stop offset="0.841346" stopColor="#CAD7FF" />
								<stop offset="0.884615" stopColor="#CBFFE7" />
								<stop offset="1" stopColor="#F0EBDE" stopOpacity="0.2" />
							</radialGradient>
							<radialGradient
								ref={(node) => {
									curatedOrbBloomGradientRefs.current[index] = node;
								}}
								id={ids.bloomGradient}
								cx="0"
								cy="0"
								r="1"
								gradientUnits="userSpaceOnUse"
							>
								<stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
								<stop offset="0.14" stopColor="#FFFFFF" stopOpacity="0.7" />
								<stop offset="0.36" stopColor="#FFFFFF" stopOpacity="0.4" />
								<stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0.18" />
								<stop offset="0.8" stopColor="#FFFFFF" stopOpacity="0.06" />
								<stop offset="0.92" stopColor="#FFFFFF" stopOpacity="0" />
							</radialGradient>
							<clipPath id={ids.clipPath} clipPathUnits="userSpaceOnUse">
								<path
									ref={(node) => {
										curatedOrbClipPathRefs.current[index] = node;
									}}
									d=""
									clipRule="evenodd"
								/>
							</clipPath>
						</Fragment>
					))}
				</defs>
				{curatedOrbSlotIds.map((ids, index) => (
					<Fragment key={ids.clipPath}>
						<ellipse
							ref={(node) => {
								curatedOrbBloomEllipseRefs.current[index] = node;
							}}
							cx="0"
							cy="0"
							rx="0"
							ry="0"
							opacity="0"
							fill={`url(#${ids.bloomGradient})`}
							clipPath={`url(#${ids.clipPath})`}
						/>
						<ellipse
							ref={(node) => {
								curatedOrbEllipseRefs.current[index] = node;
							}}
							cx="0"
							cy="0"
							rx="0"
							ry="0"
							opacity="0"
							fill={`url(#${ids.gradient})`}
							clipPath={`url(#${ids.clipPath})`}
							style={{ mixBlendMode: 'color' }}
						/>
					</Fragment>
				))}
			</svg>
			{/*
			  Softbox lighting overlay. Two stacked viewport-anchored radial gradients
			  paint the "lit sphere" feel directly on top of the map. Because these
			  are DOM layers on the container, they stay locked to the viewer no
			  matter how the globe is panned, zoomed, or rotated.

			  Layer 1a (screen): warm highlight radiating from the upper-left.
			  Layer 1b (multiply): stormy dark-pool key in the same upper-left slot.
			  Keeping both layers mounted lets mood transitions crossfade instead of
			  swapping an un-animatable mix-blend-mode.
			  Layer 2 (multiply): cool deep-shadow pooling in the lower-right.
			*/}
			<div
				ref={lightingOverlayWarmKeyRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					// Anchor the radial "hot spot" offscreen past the upper-left so the
					// visible gradient reads as ambient warm wash rather than a disc.
					// Peaks are cranked up because the hot center is offscreen.
					background: SOFTBOX_WARM_KEY_BG,
					mixBlendMode: 'screen',
					// opacity intentionally unset — see applyLightingOverlayOpacity above.
					zIndex: 1,
				}}
			/>
			<div
				ref={lightingOverlayDarkKeyRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: SOFTBOX_DARK_POOL_BG,
					mixBlendMode: 'multiply',
					// opacity intentionally unset — see applyLightingOverlayOpacity above.
					zIndex: 1,
				}}
			/>
			<div
				ref={lightingOverlayShadowRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					// Push the dark pool offscreen past the lower-right corner so only
					// the broad outer falloff is in the viewport — no obvious radial
					// "eye" of shadow in the corner. Peaks are strong to keep the
					// shaded hemisphere readable at globe zoom.
					background:
						'radial-gradient(ellipse 160% 160% at 115% 115%, rgba(6, 10, 28, 0.70) 0%, rgba(6, 10, 28, 0.50) 28%, rgba(10, 16, 36, 0.28) 55%, rgba(20, 28, 56, 0.08) 78%, rgba(0, 0, 0, 0) 100%)',
					mixBlendMode: 'multiply',
					// opacity intentionally unset — see applyLightingOverlayOpacity above.
					zIndex: 1,
				}}
			/>
			{/*
			  Sunrise space glow. A very faint screen-blend bloom in the surrounding
			  "space" so dawn feels present on the page without becoming a full wash.
			  Opacity is owned by applyLightingOverlayOpacity.
			*/}
			<div
				ref={lightingOverlaySunSpaceGlowRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: SUN_TRANSITION_SPACE_GLOW_BG,
					mixBlendMode: 'screen',
					zIndex: 1,
				}}
			/>
			{/*
			  Hot-weather wash. Uniform warm-white screen-blend overlay that
			  brightens the entire globe. Opacity is owned by
			  applyLightingOverlayOpacity (0 when temp is below the hot
			  threshold OR when the mood is a dark-pool variant).
			*/}
			<div
				ref={lightingOverlayHotWashRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: 'rgb(255, 240, 215)',
					mixBlendMode: 'screen',
					zIndex: 1,
				}}
			/>
			{/*
			  Night dark wash. A neutral overlay that slightly lowers value while
			  preserving the normal day map hues. Opacity is owned by
			  applyLightingOverlayOpacity.
			*/}
			<div
				ref={lightingOverlayNightDarkWashRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: 'rgb(0, 0, 0)',
					mixBlendMode: 'multiply',
					zIndex: 1,
				}}
			/>
			{/*
			  Night composition. The moon key comes from the upper-right while the
			  counter-shade pools in the lower-left, opposite the daytime lighting.
			  Opacity is owned by applyLightingOverlayOpacity.
			*/}
			<div
				ref={lightingOverlayNightLowerLeftShadowRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: NIGHT_LOWER_LEFT_SHADOW_BG,
					mixBlendMode: 'multiply',
					zIndex: 1,
				}}
			/>
			<div
				ref={lightingOverlayNightMoonlightRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: NIGHT_MOONLIGHT_KEY_BG,
					mixBlendMode: 'screen',
					zIndex: 1,
				}}
			/>
			{/*
			  Night silhouette (multiply). Darkens the visible face of the globe so the
			  moon backlight can read as true rear lighting instead of a generic glow.
			  Opacity owned by applyLightingOverlayOpacity.
			*/}
			<div
				ref={lightingOverlayNightShadeRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: NIGHT_FACE_SHADE_BG,
					mixBlendMode: 'multiply',
					zIndex: 1,
				}}
			/>
			<div
				ref={lightingOverlayMoonRimRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: NIGHT_MOON_RIM_BG,
					mixBlendMode: 'screen',
					zIndex: 1,
				}}
			/>
			{/*
			  Gloom wash. Uniform dark multiply-blend overlay for stormy
			  that persists into city zoom (longer fade curve than the softbox/
			  shadow). Opacity owned by applyLightingOverlayOpacity; bright
			  moods set gloomWashOpacity=0 so this is a no-op for them.
			*/}
			<div
				ref={lightingOverlayGloomWashRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: 'rgb(20, 28, 50)',
					mixBlendMode: 'multiply',
					zIndex: 1,
				}}
			/>
			{/*
			  Night vignette. Soft viewport-anchored darkening at the corners that
			  pulls the eye toward the globe and gives the night sky an intimate,
			  cinematic frame. Sits on top of the night lighting overlays so the
			  cornering applies even where moonlight or rim light brightens. Opacity
			  is owned by applyLightingOverlayOpacity and is gated on true night.
			*/}
			<div
				ref={lightingOverlayNightVignetteRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: NIGHT_VIGNETTE_BG,
					mixBlendMode: 'multiply',
					zIndex: 1,
				}}
			/>
			{mapLoadError && (
				<div
					className={`absolute inset-0 flex items-center justify-center ${
						isBackgroundPresentation ? 'bg-black/80' : 'bg-gray-100'
					}`}
				>
					<p className="text-gray-500">{mapLoadError}</p>
				</div>
			)}
			{!mapLoadError && !isMapLoaded && (
				<div
					className={`absolute inset-0 flex items-center justify-center ${
						isBackgroundPresentation ? 'bg-black' : 'bg-gray-100'
					}`}
				>
					<div
						className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
							isBackgroundPresentation ? 'border-white' : 'border-gray-900'
						}`}
					/>
				</div>
			)}

			{/* Hover SVG tooltip (single overlay; positioned via map.project) */}
			{!isLoading && hoverTooltipEntry && hoverTooltipCoords && hoverTooltipData && (
				<div
					ref={hoverTooltipOverlayRef}
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: `${hoverTooltipData.width}px`,
						height: `${hoverTooltipData.height + hoverLeaveBufferPx}px`,
						pointerEvents:
							hoverTooltipContactId != null && hoveredMarkerId === hoverTooltipContactId
								? 'auto'
								: 'none',
						display: 'flex',
						flexDirection: 'column',
						zIndex: HOVER_TOOLTIP_Z_INDEX,
					}}
					onMouseEnter={() => handleMarkerMouseOver(hoverTooltipEntry.contact)}
					onMouseLeave={() => handleMarkerMouseOut(hoverTooltipEntry.contact.id)}
					onClick={() => handleMarkerClick(hoverTooltipEntry.contact)}
				>
					<div
						style={{
							width: '100%',
							height: `${hoverTooltipData.height}px`,
							opacity:
								hoverTooltipContactId != null && hoveredMarkerId === hoverTooltipContactId
									? 1
									: 0,
							transition: 'opacity 150ms ease-in-out',
							flexShrink: 0,
						}}
					>
						<img
							src={hoverTooltipData.url}
							alt=""
							draggable={false}
							style={{ width: '100%', height: '100%', display: 'block' }}
						/>
					</div>
				</div>
			)}

			{/* Only show selected marker overlay when not loading */}
			{!isLoading && selectedMarker && selectedMarkerCoords && (
				<div
					ref={selectedMarkerOverlayRef}
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						zIndex: HOVER_TOOLTIP_Z_INDEX + 10,
					}}
				>
					<div
						className="relative"
						style={{
							width: '320px',
							backgroundColor: 'rgba(216, 229, 251, 0.8)',
							border: '2px solid black',
							borderRadius: '7px',
							overflow: 'hidden',
							boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
						}}
						onMouseEnter={handleResearchPanelMouseEnter}
						onMouseLeave={handleResearchPanelMouseLeave}
					>
						{/* Close button */}
						<button
							onClick={() => setSelectedMarker(null)}
							className="absolute top-[10px] -translate-y-1/2 right-2 z-20 flex items-center justify-center text-black/60 hover:text-black transition-colors"
							style={{ fontSize: '14px', lineHeight: 1, fontWeight: 500 }}
						>
							×
						</button>
						{/* Header */}
						<div
							className="w-full"
							style={{ height: '20px', backgroundColor: 'rgba(232, 239, 255, 0.8)' }}
						/>
						<div className="absolute top-[10px] left-[12px] -translate-y-1/2 z-10">
							<span className="font-bold text-[12px] leading-none text-black">
								Research
							</span>
						</div>
						<div
							className="absolute left-0 w-full bg-black z-10"
							style={{ top: '20px', height: '2px' }}
						/>
						{/* Name/Company section */}
						<div className="w-full bg-white" style={{ height: '36px', marginTop: '2px' }}>
							<div className="w-full h-full px-3 flex items-center justify-between overflow-hidden">
								<div className="flex flex-col justify-center min-w-0 flex-1 pr-2">
									<div className="font-inter font-bold text-[13px] leading-none truncate text-black">
										{(() => {
											const fullName = `${selectedMarker.firstName || ''} ${
												selectedMarker.lastName || ''
											}`.trim();
											return (
												fullName ||
												selectedMarker.name ||
												selectedMarker.company ||
												'Unknown'
											);
										})()}
									</div>
									{(() => {
										const fullName = `${selectedMarker.firstName || ''} ${
											selectedMarker.lastName || ''
										}`.trim();
										const hasName =
											fullName.length > 0 ||
											(selectedMarker.name && selectedMarker.name.length > 0);
										if (!hasName) return null;
										return (
											<div className="text-[11px] leading-tight truncate text-black mt-[2px]">
												{selectedMarker.company || ''}
											</div>
										);
									})()}
								</div>
								<div className="flex items-center gap-2 flex-shrink-0">
									<div className="flex flex-col items-end gap-[2px] max-w-[120px]">
										<div className="flex items-center gap-1 w-full justify-end overflow-hidden">
											{(() => {
												const stateAbbr =
													getStateAbbreviation(selectedMarker.state || '') || '';
												if (stateAbbr) {
													return (
														<span
															className="inline-flex items-center justify-center h-[14px] px-[5px] rounded-[3px] border border-black text-[10px] font-bold leading-none flex-shrink-0"
															style={{
																backgroundColor:
																	stateBadgeColorMap[stateAbbr] || '#E0E0E0',
															}}
														>
															{stateAbbr}
														</span>
													);
												}
												return null;
											})()}
											{selectedMarker.city && (
												<span className="text-[11px] leading-none text-black truncate">
													{selectedMarker.city}
												</span>
											)}
										</div>
										{(selectedMarker.curatedDisplayLabel ||
											selectedMarker.title ||
											selectedMarker.headline ||
											isMusicVenuesSearch ||
											isRestaurantsSearch ||
											isCoffeeShopsSearch ||
											isWeddingPlannersSearch) &&
											(() => {
												const titleText =
													selectedMarker.curatedDisplayLabel ||
													selectedMarker.title ||
													selectedMarker.headline ||
													'';
												const isRestaurant =
													isRestaurantsSearch || isRestaurantTitle(titleText);
												const isCoffeeShop =
													isCoffeeShopsSearch || isCoffeeShopTitle(titleText);
												const isMusicVenue =
													isMusicVenuesSearch || isMusicVenueTitle(titleText);
												const isWeddingPlanner =
													isWeddingPlannersSearch || isWeddingPlannerTitle(titleText);
												const isWeddingVenue = isWeddingVenueTitle(titleText);
												const isWineBeerSpirits = isWineBeerSpiritsTitle(titleText);
												const wineBeerSpiritsLabel = getWineBeerSpiritsLabel(titleText);
												return (
													<div
														className="px-1.5 py-[1px] rounded-[6px] border border-black max-w-full flex items-center gap-1"
														style={{
															backgroundColor: isRestaurant
																? '#C3FBD1'
																: isCoffeeShop
																	? '#D6F1BD'
																	: isMusicVenue
																		? '#B7E5FF'
																		: isWeddingPlanner || isWeddingVenue
																			? '#FFF8DC'
																			: isWineBeerSpirits
																				? '#BFC4FF'
																				: '#E8EFFF',
														}}
													>
														{isRestaurant && (
															<RestaurantsIcon size={10} className="flex-shrink-0" />
														)}
														{isCoffeeShop && <CoffeeShopsIcon size={6} />}
														{isMusicVenue && (
															<MusicVenuesIcon size={10} className="flex-shrink-0" />
														)}
														{(isWeddingPlanner || isWeddingVenue) && (
															<WeddingPlannersIcon size={10} />
														)}
														{isWineBeerSpirits && (
															<WineBeerSpiritsIcon size={10} className="flex-shrink-0" />
														)}
														<span className="text-[9px] leading-none text-black block truncate">
															{isRestaurant
																? 'Restaurant'
																: isCoffeeShop
																	? 'Coffee Shop'
																	: isMusicVenue
																		? 'Music Venue'
																		: isWeddingVenue
																			? 'Wedding Venue'
																			: isWeddingPlanner
																				? 'Wedding Planner'
																				: isWineBeerSpirits
																					? wineBeerSpiritsLabel
																					: titleText}
														</span>
													</div>
												);
											})()}
									</div>
								</div>
							</div>
						</div>
						<div
							className="absolute left-0 w-full bg-black z-10"
							style={{ top: '58px', height: '1px' }}
						/>
						{/* Research boxes */}
						{(() => {
							const metadataSections = parseMetadataSections(selectedMarker.metadata);
							const boxConfigs = [
								{ key: '1', color: 'rgba(21, 139, 207, 0.8)' },
								{ key: '2', color: 'rgba(67, 174, 236, 0.8)' },
								{ key: '3', color: 'rgba(124, 201, 246, 0.8)' },
								{ key: '4', color: 'rgba(170, 218, 246, 0.8)' },
							];
							const visibleBoxes = boxConfigs.filter(
								(config) => metadataSections[config.key]
							);

							// If no parsed sections but raw metadata exists, show raw metadata
							if (visibleBoxes.length === 0) {
								if (
									selectedMarker.metadata &&
									selectedMarker.metadata.trim().length > 0
								) {
									// Show raw metadata in a single box if it doesn't match [1], [2] format
									return (
										<div className="p-2">
											<div
												id="map-research-scroll-container"
												className="relative"
												style={{
													width: '100%',
													minHeight: '60px',
													backgroundColor: 'rgba(21, 139, 207, 0.8)',
													border: '2px solid #000000',
													borderRadius: '6px',
												}}
											>
												<style>{`
													#map-research-scroll-container *::-webkit-scrollbar {
														display: none !important;
														width: 0 !important;
														height: 0 !important;
													}
													#map-research-scroll-container * {
														scrollbar-width: none !important;
														-ms-overflow-style: none !important;
													}
												`}</style>
												<div
													className="absolute"
													style={{
														top: '4px',
														bottom: '4px',
														left: '6px',
														right: '6px',
														backgroundColor: '#FFFFFF',
														border: '1px solid #000000',
														borderRadius: '4px',
														overflow: 'hidden',
													}}
												>
													<CustomScrollbar
														className="w-full h-full"
														thumbWidth={2}
														thumbColor="#000000"
														offsetRight={-14}
														contentClassName="scrollbar-hide"
													>
														<div className="px-2 py-1">
															<div className="w-full text-[10px] leading-[1.3] text-black font-inter">
																{selectedMarker.metadata}
															</div>
														</div>
													</CustomScrollbar>
												</div>
											</div>
										</div>
									);
								}
								return (
									<div className="px-3 py-4 text-center text-[11px] text-gray-500 italic">
										No research data available for this contact
									</div>
								);
							}

							return (
								<div className="p-2 flex flex-col gap-2">
									{visibleBoxes.map((config) => (
										<div
											key={config.key}
											className="relative"
											style={{
												width: '100%',
												minHeight: '44px',
												backgroundColor: config.color,
												border: '2px solid #000000',
												borderRadius: '6px',
											}}
										>
											<div
												className="absolute font-inter font-bold"
												style={{
													top: '4px',
													left: '6px',
													fontSize: '10px',
													color: '#000000',
												}}
											>
												[{config.key}]
											</div>
											<div
												className="absolute overflow-hidden"
												style={{
													top: '50%',
													transform: 'translateY(-50%)',
													right: '6px',
													width: 'calc(100% - 36px)',
													minHeight: '36px',
													maxHeight: '36px',
													backgroundColor: '#FFFFFF',
													border: '1px solid #000000',
													borderRadius: '4px',
												}}
											>
												<div className="w-full h-full px-2 flex items-center overflow-hidden">
													<div
														className="w-full text-[10px] leading-[1.3] text-black font-inter"
														style={{
															display: '-webkit-box',
															WebkitLineClamp: 2,
															WebkitBoxOrient: 'vertical',
															overflow: 'hidden',
														}}
													>
														{metadataSections[config.key]}
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							);
						})()}
						{/* Pointer triangle */}
						<div
							className="absolute left-1/2 -translate-x-1/2"
							style={{
								bottom: '-10px',
								width: 0,
								height: 0,
								borderLeft: '10px solid transparent',
								borderRight: '10px solid transparent',
								borderTop: '10px solid #D8E5FB',
							}}
						/>
						<div
							className="absolute left-1/2 -translate-x-1/2"
							style={{
								bottom: '-14px',
								width: 0,
								height: 0,
								borderLeft: '12px solid transparent',
								borderRight: '12px solid transparent',
								borderTop: '12px solid black',
								zIndex: -1,
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
};

// Memoized so the heavy Mapbox component does not re-render when the parent
// (Dashboard) re-renders for unrelated state changes (e.g. the bottom search
// bar opening/closing dropdowns). Requires that all callback props from the
// parent are stable (wrapped in useCallback) to take effect.
const MemoizedSearchResultsMap = memo(SearchResultsMap);
MemoizedSearchResultsMap.displayName = 'SearchResultsMap';
export default MemoizedSearchResultsMap;
