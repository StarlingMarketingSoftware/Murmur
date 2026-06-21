'use client';

import {
	FC,
	Fragment,
	memo,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import mapboxgl from 'mapbox-gl';
import { ContactWithName } from '@/types/contact';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import {
	useGetContactResearch,
	useGetContactsMapOverlay,
} from '@/hooks/queryHooks/useContacts';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
	MAP_SELECT_GRAB_STARTER_BOX_GAP_PX,
	MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX,
	MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX,
	MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX,
	MAP_SELECT_GRAB_STACK_BOX_SIZE_PX,
	MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX,
	MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX,
	MAP_SELECT_GRAB_TOOL_COLLAPSED_HEIGHT_PX,
} from '@/components/molecules/MapSelectGrabTool/MapSelectGrabTool';
import {
	computeMapSelectGrabViewScale,
	DASHBOARD_SIDE_SHIFT_VAR,
	MURMUR_CHROME_ZOOM_DEFAULT,
} from '@/utils/murmurChromeZoom';
import {
	calculateTooltipWidth,
	calculateTooltipHeight,
	calculateTooltipAnchorY,
	generateMapTooltipSvg,
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
import { generateSelectedCategorizedContactMarkerIconUrl } from '@/components/atoms/_svg/SelectedCategorizedContactMarkerIcon';
import { profileAreaMarkerSvg } from '@/components/atoms/_svg/ProfileAreaMarkerIcon';
import { venueHomeIconSvg } from '@/components/atoms/_svg/VenueHomeIcon';
import { mapStackStarIconSvg } from '@/components/atoms/_svg/MapStackStarIcon';
import {
	SELECTED_CONTACT_MARKER_CENTER_OUTER_DIAMETER,
	SELECTED_CONTACT_MARKER_CENTER_X,
	SELECTED_CONTACT_MARKER_CENTER_Y,
	SELECTED_CONTACT_MARKER_VIEWBOX_HEIGHT,
	SELECTED_CONTACT_MARKER_VIEWBOX_WIDTH,
} from '@/components/atoms/_svg/SelectedContactMarkerIcon';
import { generateSelectedUncategorizedContactMarkerIconUrl } from '@/components/atoms/_svg/SelectedUncategorizedContactMarkerIcon';
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
import { isMobileDevice, isSafariBrowser } from '@/utils/browserDetection';
import { markPerf } from '@/utils/perfMarks';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { WeatherMood } from '@/lib/weather/regions';
import {
	getMoodConfig,
	SOFTBOX_DARK_POOL_BG,
	SOFTBOX_WARM_KEY_BG,
} from '@/lib/weather/moodConfig';
import type {
	AreaSelectPayload,
	BasemapCartographyClipState,
	BoundingBox,
	ClippingCoord,
	ClippingMultiPolygon,
	CuratedBlobMercatorPoint,
	CuratedBlobMorphSource,
	DotWaveMeta,
	GeoJsonFeatureCollection,
	GeoJsonGeometry,
	GlobeNightLightingLike,
	LatLngLiteral,
	MapSelectionBounds,
	MarkerConstellationEdge,
	MarkerConstellationEdgeSeed,
	MarkerConstellationNode,
	MarkerConstellationPoint,
	MarkerHoverMeta,
	PreparedClippingPolygon,
	RuntimeMoodVisualConfig,
	SnowCloudInteractionImpact,
	SnowParticle,
	StormLightningCell,
	StormLightningEvent,
	StormLightningEventKind,
	StormLightningPulse,
} from './types';
import {
	ALL_CONTACTS_DOT_GLOW_OPACITY,
	ALL_CONTACTS_OVERLAY_DOT_FILL_COLOR,
	ALL_CONTACTS_OVERLAY_LIMIT,
	ALL_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM,
	CAMPAIGN_HEATMAP_FADE_MS,
	CAMPAIGN_HEATMAP_GLOW_BLUR,
	CAMPAIGN_HEATMAP_GLOW_OPACITY_MAX,
	campaignHeatmapGlowRadiusExpr,
	AMBIENT_CONTACTS_OVERLAY_BUFFER_DOTS,
	AMBIENT_CONTACTS_OVERLAY_LIMIT,
	AMBIENT_CONTACTS_OVERLAY_MARKERS_FULL_ZOOM,
	AMBIENT_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM,
	AMBIENT_CONTACTS_OVERLAY_MIN_DOTS,
	AMBIENT_CONTACTS_OVERLAY_TARGET_DOTS,
	AMBIENT_CONTACTS_UNCATEGORIZED_FILL_COLOR,
	AUTO_FIT_CONTACTS_MAX_ZOOM,
	AUTO_FIT_STATE_MAX_ZOOM,
	BOOKING_EXTRA_MARKERS_MAX_DOTS,
	BOOKING_EXTRA_MARKERS_MIN_ZOOM,
	BOOKING_EXTRA_PIN_HOVER_STROKE_COLOR,
	CAMPAIGN_FOOTPRINT_COLOR,
	CAMPAIGN_FOOTPRINT_GLOW_OPACITY,
	CAMPAIGN_FOOTPRINT_LINE_COLOR,
	CAMPAIGN_FOOTPRINT_LINE_CORE_COLOR,
	CAMPAIGN_FOOTPRINT_LINE_CORE_OPACITY,
	CAMPAIGN_FOOTPRINT_LINE_GLOW_OPACITY,
	CAMPAIGN_FOOTPRINT_MAX_POINTS,
	CAMPAIGN_FOOTPRINT_NODE_GLOW_OPACITY,
	CAMPAIGN_FOOTPRINT_REPLACE_MARKER_MIN_ZOOM,
	CAMPAIGN_FOOTPRINT_SPARK_COLOR,
	CAMPAIGN_FOOTPRINT_SPARK_OPACITY,
	campaignFootprintGlowRadiusExpr,
	campaignFootprintLineCoreWidthExpr,
	campaignFootprintLineGlowWidthExpr,
	campaignFootprintNodeGlowRadiusExpr,
	campaignFootprintSparkSizeExpr,
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
	CLOUDS_OVERLAY_FADE_OUT_END_ZOOM,
	CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
	CLOUDS_SNOW_INTERACTION_MAX_REFRACT_SHIFT_PX,
	CLOUDS_SNOW_INTERACTION_STAMP_SIZE_PX,
	CLOUDS_SNOW_INTERACTION_TARGET_IMPACTS,
	CLOUDS_SNOW_INTERACTION_TARGET_IMPACTS_REDUCED,
	CLOUDS_TILES_MAX_ZOOM,
	CLOUDS_TILES_URL_TEMPLATE,
	CLOUDS_TURBULENCE_AMPLITUDE_X_PX,
	CLOUDS_TURBULENCE_LOOP_MS,
	CLOUDS_TURBULENCE_STRIP_PX,
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
	CURATED_ORB_SMALL_SHAPE_MIN_RADIUS_KM,
	CURATED_ORB_SMALL_SHAPE_THRESHOLD_KM,
	CURATED_ORB_BLOOM_OPACITY,
	CURATED_ORB_COLOR_BLEND_OPACITY,
	CURATED_ORB_ELLIPSE_RX_RATIO,
	CURATED_ORB_ELLIPSE_RY_RATIO,
	CURATED_ORB_GRADIENT_ROTATION_DEG,
	CURATED_ORB_GRADIENT_SCALE_X_RATIO,
	CURATED_ORB_GRADIENT_SCALE_Y_RATIO,
	CURATED_ORB_SLOT_COUNT,
	CURATED_STABLE_MARKER_MAX_DOTS,
	DASHBOARD_DECORATIVE_CENTER,
	DASHBOARD_DECORATIVE_OFFSET_PX,
	DASHBOARD_DECORATIVE_PITCH,
	DASHBOARD_DECORATIVE_ZOOM,
	DASHBOARD_TO_INTERACTIVE_HANDOFF_GLIDE_MS,
	DASHBOARD_TO_INTERACTIVE_TRANSITION_MS,
	DAY_FAR_SIDE_SHADE_CANVAS_SIZE_PX,
	DAY_FAR_SIDE_SHADE_MIN_REPAINT_DELTA_DEG,
	DAY_FAR_SIDE_SHADE_OPACITY_MULTIPLIER,
	DAY_FAR_SIDE_SHADE_REPAINT_MS,
	DEFAULT_MAX_ZOOM_FALLBACK,
	DOT_WAVE_DELAY_PROP,
	DOT_WAVE_EASING,
	DOT_WAVE_FADE_MS,
	DOT_WAVE_FRAME_MS,
	DOT_WAVE_SMOOTH_TRANSITION_MS,
	EMPTY_POLYGON_FC,
	HOT_TEMPERATURE_THRESHOLD_F,
	HOT_WASH_OPACITY,
	HOVER_INTERACTION_MIN_ZOOM,
	HOVER_TOOLTIP_Z_INDEX,
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
	LIGHTNING_REGION_BIAS_CHANCE,
	LIGHTNING_RESTRIKE_MAX_INTERVAL_MS,
	LIGHTNING_RESTRIKE_MAX_REMAINING_FLASHES,
	LIGHTNING_RESTRIKE_MIN_INTERVAL_MS,
	LIGHTNING_RESTRIKE_MIN_REMAINING_FLASHES,
	LIGHTNING_SCALE_CLOSE_MAX,
	LIGHTNING_SCALE_CLOSE_MIN,
	LIGHTNING_SCALE_GLOBE_MAX,
	LIGHTNING_SCALE_GLOBE_MIN,
	LIGHTNING_SHEET_FLASH_CHANCE,
	LIGHTNING_STAMPS_COUNT,
	LIGHTNING_STORM_CELL_COUNT,
	LIGHTNING_US_BOUNDS,
	LIGHTNING_US_POSITION_TRIES,
	LIGHTNING_ZOOMED_OUT_MAX_ACTIVE_EVENTS,
	LIGHTNING_ZOOMED_OUT_MAX_INTERVAL_MS,
	LIGHTNING_ZOOMED_OUT_MIN_INTERVAL_MS,
	MANUAL_NIGHT_T_OVERRIDE,
	MANUAL_WEATHER_MOOD_OVERRIDE,
	MANUAL_WEATHER_TEMPERATURE_OVERRIDE_F,
	MAPBOX_LAYER_IDS,
	MAPBOX_SOURCE_IDS,
	MAPBOX_STYLE,
	MAP_DEFAULT_ZOOM,
	MAP_MIN_ZOOM,
	MOBILE_MAP_MIN_ZOOM,
	getInteractiveMapMinZoomDelta,
	MAP_PINCH_ZOOM_RATE,
	MAP_WHEEL_ZOOM_RATE,
	MAP_WORLD_LAND_LOCAL_SOURCE_ID,
	MARKER_CONSTELLATION_CORE_OPACITY,
	MARKER_CONSTELLATION_GLOW_OPACITY,
	MARKER_CONSTELLATION_HALO_COLOR,
	MARKER_CONSTELLATION_LINE_COLOR,
	MARKER_CONSTELLATION_MAX_POINTS,
	MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM,
	MARKER_CONSTELLATION_NODE_GLOW_OPACITY,
	MARKER_CONSTELLATION_NODE_OPACITY,
	MARKER_CONSTELLATION_REVEAL_FADE_MS,
	MARKER_CONSTELLATION_SELECTED_CORE_OPACITY,
	MARKER_CONSTELLATION_SELECTED_GLOW_OPACITY,
	MARKER_CONSTELLATION_SELECTED_HALO_COLOR,
	MARKER_CONSTELLATION_SELECTED_LINE_COLOR,
	MARKER_RECOMPUTE_SETTLE_MS,
	MAX_TOTAL_DOTS,
	MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX,
	MOOD_CONTINUOUS_TRANSITION_MS,
	MOOD_DISCRETE_EFFECT_FADE_MS,
	MOOD_TRANSITION_PAINT_FRAME_MS,
	NIGHT_DARK_WASH_OPACITY,
	NIGHT_FACE_SHADE_BG,
	NIGHT_FACE_SHADE_OPACITY,
	NIGHT_GLOOM_WASH_OPACITY,
	NIGHT_LOWER_LEFT_SHADOW_BG,
	NIGHT_LOWER_LEFT_SHADOW_OPACITY,
	NIGHT_MOONLIGHT_KEY_BG,
	NIGHT_MOONLIGHT_KEY_OPACITY,
	NIGHT_MOON_RIM_BG,
	NIGHT_MOON_RIM_OPACITY,
	NIGHT_SHADOW_OVERLAY_MUL_MIN,
	NIGHT_STATE_LINE_OPACITY_MUL_MIN,
	NIGHT_VIGNETTE_BG,
	NIGHT_VIGNETTE_OPACITY,
	NIGHT_WARM_KEY_MIN_MUL,
	OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE,
	OVERVIEW_PREWARM_CENTER_QUANT_DEG,
	OVERVIEW_PREWARM_DEBOUNCE_MS,
	OVERVIEW_PREWARM_FLOOR_SKIP_MARGIN,
	OVERVIEW_PREWARM_ZOOMS,
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
	RESULT_DOT_TRANSPARENT_STROKE_COLOR,
	RESULT_DOT_ZOOM_MAX,
	RESULT_DOT_ZOOM_MIN,
	SAFARI_CLOUDS_DRIFT_UPDATE_MS,
	SAFARI_CLOUDS_IDLE_AFTER_MS,
	SAFARI_CLOUDS_IDLE_DRIFT_UPDATE_MS,
	SELECTED_STATE_GRADIENT_BLOOM_OPACITY,
	SELECTED_STATE_GRADIENT_COLOR_OPACITY,
	SNOWFLAKE_STAMPS_COUNT,
	SNOW_BASE_FALL_PX_PER_S,
	SNOW_BASE_WIND_PX_PER_S,
	SNOW_CANVAS_SIZE_PX,
	SNOW_DENSITY_BAND_LOOP_MS,
	SNOW_EDDY_DRIFT_BASE_PX,
	SNOW_GUST_BAND_LOOP_MS,
	SNOW_GUST_PUSH_BASE_PX,
	SNOW_HIDE_AT_OR_ABOVE_ZOOM,
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
	STREET_VIEW_BUILDINGS_MIN_ZOOM,
	STREET_VIEW_BUILDINGS_RISE_FULL_ZOOM,
	STREET_VIEW_BUILDING_COLOR,
	STREET_VIEW_BUILDING_OPACITY,
	STREET_VIEW_MAX_PERSISTENT_CARDS,
	STREET_VIEW_MAX_PITCH,
	STREET_VIEW_MIN_ZOOM,
	STREET_VIEW_PITCH_EASE_MS,
	STREET_VIEW_PITCH_EPSILON_DEG,
	STREET_VIEW_PITCH_FRAME_EPSILON_DEG,
	STREET_VIEW_PITCH_RAMP_FULL_ZOOM,
	STREET_VIEW_PITCH_RAMP_START_ZOOM,
	SUN_TRANSITION_CLOUD_CATCHLIGHT_OPACITY_MULT,
	SUN_TRANSITION_PROGRESS_PAINT_STEPS,
	SUN_TRANSITION_SPACE_GLOW_BG,
	SUN_TRANSITION_SPACE_GLOW_OPACITY_MULT,
	UNSUBSCRIBE_BURN_GLOW_BG,
	UNSUBSCRIBE_BURN_GLOW_MAX_OPACITY,
	UNSUBSCRIBE_BURN_TRANSITION_MS,
	UNSUBSCRIBE_BURN_WASH_COLOR,
	UNSUBSCRIBE_BURN_WASH_MAX_OPACITY,
	US_ONLY_BASEMAP_CLIP_MAX_ZOOM,
	VIEWPORT_BBOX_PAD_FACTOR,
	defaultCenter,
	stateBadgeColorMap,
} from './constants';
import { setDashboardGlobeSpinLng } from './dashboardGlobeSpinState';
import {
	getUnsubscribeBurnTarget,
	subscribeUnsubscribeBurn,
} from './unsubscribeBurnState';
import {
	bboxFromMultiPolygon,
	boundsToPolygonFeatureCollection,
	createOutlineGeoJsonFromMultiPolygon,
	geoJsonGeometryToClippingMultiPolygon,
	isLatLngInBbox,
} from './geometry';
import {
	angularLngDistanceDeg,
	clamp,
	lerp,
	mapboxEaseOutCubic,
	normalizeLngDeg,
	smoothstep,
} from './math';
import { hashStringToStableKey, mixCssColorString, washOutHexColor } from './color';
import {
	computeGlobeFrontHemisphereOpacity,
	coordinateKey,
	getLatLngFromContact,
	jitterDuplicateCoords,
} from './coordinates';
import {
	applyFreeTrialMapVisualTuning,
	applyMapboxFogForMoodAndNight,
	applyMurmurGlobeLighting,
	applyNightLandPalette,
	applyUsOnlyBasemapCartography,
	ensureWorldLandFill,
	restoreBasemapCartography,
	unsubscribeBurnEase,
} from './basemap';
import {
	buildCuratedBlobClusterLobeMultiPolygons,
	buildMercatorCircleMultiPolygon,
	buildScreenPathFromLngLatMultiPolygon,
	createCuratedBlobMorphSourcesFromMercatorMultiPolygon,
	createSelectedStateMorphSource,
	mercatorMultiPolygonToLngLat,
	morphCuratedBlobSourceToLngLat,
	pickAdaptiveCuratedBlobClusters,
	projectCuratedBlobPoint,
	smoothCuratedBlobMultiPolygon,
} from './curatedBlob';
import {
	buildCloudsOpacityExpr,
	drawCloudExtraPasses,
	getCloudsPolarFadeMask,
} from './clouds';
import {
	DAY_FAR_SIDE_SHADE_CENTER_LNG,
	createDayFarSideShadeCanvas,
	getDayFarSideShadeCenterLng,
	getDayFarSideShadeDayProgress,
	paintDayFarSideShadeCanvas,
} from './dayFarSideShade';
import { computeDotWaveDelayMs, computeDotWaveTravelMs } from './dotWave';
import {
	LIGHTNING_STAMPS_URL,
	buildLightningOpacityExpr,
	getLightningZoomedInT,
	getLightningZoomedOutBoostT,
} from './lightning';
import { computeGloomWashFade, computeLightingOverlayOpacity } from './lightingOverlay';
import {
	buildBeautyMarkerConstellationFormation,
	buildCategoryMarkerConstellationFormation,
	buildFallbackMarkerConstellationGroupKeys,
	buildSelectedMarkerConstellationEdges,
	markerConstellationPairKey,
} from './markerConstellation';
import {
	buildOuterRingWorldSegments,
	isWorldPointNearSegments,
	pointInClippingPolygon,
	pointInMultiPolygon,
} from './polygons';
import {
	batchLatLngToWorldPixels,
	ensureWasmGeoModuleLoaded,
	getBackgroundDotsQuantizationDeg,
	getClientPointFromDomEvent,
	getWasmGeoModuleSync,
	hashStringToUint32,
	latLngToWorldPixel,
	logWasmGeoRuntimeError,
	stableViewportSampleContacts,
} from './wasmGeo';
import {
	MARKER_HOVER_DARKEN_AMOUNT,
	MARKER_HOVER_FEATURE_STATE_EXPR,
	MARKER_HOVER_RADIUS_SCALE,
	SELECTED_MARKER_ENTRY_OPACITY,
	SELECTED_MARKER_FADE_MS,
	SELECTED_MARKER_INITIAL_TRANSFORM_SCALE,
	SELECTED_MARKER_SCALE_MULTIPLIER,
	computeCuratedOrbT,
	darkenHexColor,
	getCategorizedDotGlowZoomFadedOpacity,
	getCategorizedDotZoomFadedOpacity,
	getMarkerConstellationNodeZoomFadedOpacity,
	getMarkerConstellationZoomFadedOpacity,
	getMarkerHoverFillColorExpr,
	getMarkerHoverOpacityExpr,
	getNormalMarkerFadeOpacityExpr,
	getSelectedMarkerConstellationZoomFadedOpacity,
	getSelectedMarkerHoverIconOpacityExpr,
	getSelectedMarkerIconOpacityExpr,
	getSelectedStateOrbZoomFadedOpacity,
} from './mapExpressions';
import {
	blendRuntimeMoodConfig,
	computeMoodVisualNightT,
	toRuntimeMoodConfig,
} from './moodConfig';
import { SNOWFLAKE_STAMPS_URL, buildSnowOpacityExpr } from './snow';
import {
	applyStateOverlayNightColors,
	buildLockedStateOutlineWidthExpr,
	buildStateDividerLineOpacityExpr,
	buildStateDividerLineWidthExpr,
	buildStateInteractiveBorderColorExpr,
	buildStateInteractiveBorderOpacityExpr,
	buildStateInteractiveBorderWidthExpr,
	buildStateLabelsTextOpacityExpr,
} from './stateOverlayStyle';
import {
	computeSunTransitionLayerOpacity,
	createSunTransitionCanvas,
	getSunTransitionVisualState,
	paintSunTransitionCanvas,
} from './sunTransition';
import { computeRuntimeNightT, getDevMoodTransitionMs } from './nightLightsCompute';
import {
	getStateAbbreviation,
	normalizeStateKey,
	parseMetadataSections,
} from './metadata';
import { StreetViewContactCard } from './StreetViewContactCard';
import {
	WHAT_TO_HOVER_TOOLTIP_BODY_FILL_COLOR,
	WHAT_TO_HOVER_TOOLTIP_FILL_COLOR,
	bookingTitlePrefixMatchesSearchWhatKey,
	extractSearchModeFromQueryPrefix,
	getBookingTitlePrefixFromContactTitle,
	getLockedStateMarkerShareForZoom,
	getPromotionOverlayWhatFromContactTitle,
	getResultDotColorForWhat,
	getResultDotScaleForZoom,
	getResultDotStrokeWeightForZoom,
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

// Pre-spin Mapbox's shared worker pool at chunk eval, well before the
// construction effect runs, so map creation doesn't pay worker startup on the
// boot-critical path. SSR-guarded: 'use client' modules still evaluate on the server.
if (typeof window !== 'undefined') {
	try {
		mapboxgl.prewarm();
	} catch {
		// Best-effort optimization only.
	}
}

// Safari/WebKit: canvas→GPU-texture uploads are far slower than Chrome's, and any
// *playing* Mapbox canvas source forces the map to re-render (and re-upload every
// playing canvas) every frame, forever — the map never idles. In Safari we keep the
// animated canvas sources paused between content updates instead. Module-level:
// the UA never changes within a session (false during SSR; the map only runs client-side).
const SAFARI_CANVAS_PERF_MODE = isSafariBrowser();

// Memory-constrained devices (phones/tablets) get a tighter Mapbox tile cache
// (see the map constructor). Module-level for the same reason as above: the
// device class never changes within a session (false during SSR; the map only
// runs client-side), and the cache config must be chosen at construction —
// `useIsMobile()` is still null at that point.
const LOW_MEMORY_DEVICE = isMobileDevice();

// Real per-source tile-cache ceiling (replaces the prior inert 1024). Per the
// Mapbox source-cache formula the dynamic per-source target is
// `(ceil(w/512)+1)*(ceil(h/512)+1)*5`, clamped by min/max. This ceiling only
// binds on large/ultrawide/4K viewports where that target exceeds it (a no-op at
// <=1440p), so it trims retained tiles on the highest-memory machines without
// touching the 64 floor that drives instant, flash-free zoom-out. Verified: at
// 3840x2160 this drops every per-source cap from 270 to 128 (in-view working set
// ~90 tiles stays comfortably cached); a no-op at <=2560x1440 (dynamic 100–120).
const MAP_MAX_TILE_CACHE_SIZE = 128;

// Upload the current canvas content to the source's GPU texture once, leaving the
// source paused afterwards (CanvasSource.pause() runs prepare() — a synchronous
// texture.update — before clearing its playing flag).
const uploadCanvasSourceOnce = (
	src: { play?: () => void; pause?: () => void } | null | undefined
) => {
	try {
		src?.play?.();
		src?.pause?.();
	} catch {
		// Non-fatal.
	}
};

const EMPTY_MAP_CLICK_PROMPT_EDGE_PADDING_X_PX = 112;
const EMPTY_MAP_CLICK_PROMPT_EDGE_PADDING_TOP_PX = 48;
const EMPTY_MAP_CLICK_PROMPT_EDGE_PADDING_BOTTOM_PX = 24;
const GENERAL_CONTACT_CONSTELLATION_LINE_COLOR = '#1F2429';
const CAMPAIGN_STATUS_CONSTELLATION_CORE_OPACITY = 1;
const CAMPAIGN_STATUS_CONSTELLATION_GLOW_OPACITY = 0.18;
const CAMPAIGN_STATUS_MARKER_RADIUS_SCALE = 1;
const CAMPAIGN_STATUS_MARKER_STROKE_WIDTH = 2.32338;
// Selected campaign status marker (Write/Drafts/Inbox tabs): a bigger light-blue
// circle (#A8BFF5 fill, #5A81DA stroke) per the campaign marker spec. Applied via
// the `selected` feature-state, gated on the per-feature `statusMode` flag so the
// dashboard pick-flow / category-mode dots stay untouched.
const SELECTED_STATUS_DOT_RADIUS_SCALE = 1.45;
const SELECTED_STATUS_DOT_FILL_COLOR = '#A8BFF5';
const SELECTED_STATUS_DOT_STROKE_COLOR = '#5A81DA';
const SELECTED_STATUS_DOT_STROKE_WIDTH = 2.4;

export type CampaignContactMapStatus = 'contacts' | 'drafts' | 'new-message' | 'sent';

type CampaignStatusMarkerStyle = {
	fillColor: string;
	/** Multiplies the dot fill opacity; 0 renders a hollow ring (e.g. "sent"). */
	fillOpacity: number;
	strokeColor: string;
	strokeWidth: number;
	strokeOpacity: number;
	radiusScale: number;
	lineColor: string;
};

const CAMPAIGN_STATUS_MARKER_STYLES: Record<
	CampaignContactMapStatus,
	CampaignStatusMarkerStyle
> = {
	// Solid white disc (white fill + white stroke) — matches StatusContactsIcon.
	contacts: {
		fillColor: '#FFFFFF',
		fillOpacity: 1,
		strokeColor: '#FFFFFF',
		strokeWidth: CAMPAIGN_STATUS_MARKER_STROKE_WIDTH,
		strokeOpacity: 1,
		radiusScale: CAMPAIGN_STATUS_MARKER_RADIUS_SCALE,
		lineColor: '#FFFFFF',
	},
	// Light-blue fill, white ring — matches StatusDraftsIcon.
	drafts: {
		fillColor: '#B7E5FF',
		fillOpacity: 1,
		strokeColor: '#FFFFFF',
		strokeWidth: CAMPAIGN_STATUS_MARKER_STROKE_WIDTH,
		strokeOpacity: 1,
		radiusScale: CAMPAIGN_STATUS_MARKER_RADIUS_SCALE,
		lineColor: '#B6B6B6',
	},
	// Deep-blue fill, white ring — matches StatusNewMessageIcon.
	'new-message': {
		fillColor: '#277CAE',
		fillOpacity: 1,
		strokeColor: '#FFFFFF',
		strokeWidth: CAMPAIGN_STATUS_MARKER_STROKE_WIDTH,
		strokeOpacity: 1,
		radiusScale: CAMPAIGN_STATUS_MARKER_RADIUS_SCALE,
		lineColor: '#000000',
	},
	// Hollow deep-blue ring at 30% opacity (no fill) — matches StatusSentIcon.
	// fillColor stays a real hex so hover/washout helpers keep working; fillOpacity 0 hides it.
	sent: {
		fillColor: '#277CAE',
		fillOpacity: 0,
		strokeColor: '#277CAE',
		strokeWidth: CAMPAIGN_STATUS_MARKER_STROKE_WIDTH,
		strokeOpacity: 0.3,
		radiusScale: CAMPAIGN_STATUS_MARKER_RADIUS_SCALE,
		lineColor: '#91C9CF',
	},
};

const FEATURE_FILL_OPACITY_FACTOR: any = ['coalesce', ['get', 'fillOpacity'], 1];
const FEATURE_STROKE_OPACITY_FACTOR = ['coalesce', ['get', 'strokeOpacity'], 0] as const;

// Registered venues render larger than a normal dot so they stand out on the map.
const VENUE_DOT_RADIUS_SCALE = 1.75;
// Per-feature icon-size multiplier so venue fallback (uncategorized) markers match
// the 1.75× circle scale. Folded into interpolate stops to keep zoom outermost.
const VENUE_ICON_SIZE_SCALE_EXPR: any = [
	'case',
	['boolean', ['get', 'isVenue'], false],
	VENUE_DOT_RADIUS_SCALE,
	1,
];

type OwnedVenueLocation = LatLngLiteral & { name?: string | null };

const OWNED_VENUE_HOME_ICON_IMAGE_NAME = 'murmur-owned-venue-home-icon-image';
const OWNED_VENUE_HOME_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
	venueHomeIconSvg
)}`;
const OWNED_VENUE_HOME_ICON_IMAGE_DIMENSIONS = { width: 72, height: 63 } as const;
const OWNED_VENUE_RING_STEPS = 160;
const OWNED_VENUE_RADAR_MS = 3400;
// Radar sweeps animate via 3 GeoJSON setData calls per frame (reparse +
// re-tessellation + forced repaint); 30fps over a 3.4s period is ~113 steps —
// visually identical to 60fps at half the cost.
const RADAR_FRAME_MS = 33;
const OWNED_VENUE_RADAR_OUTER_TRAVEL_KM = 10;
const OWNED_VENUE_RADAR_IDLE_COLOR = 'rgb(255, 255, 255)';
const OWNED_VENUE_GLOW_IDLE_COLOR = 'rgb(169, 231, 255)';
const OWNED_VENUE_GLOW_ACTIVE_COLOR = 'rgb(96, 207, 255)';
const OWNED_VENUE_GLOW_CIRCLES = [
	{ radiusKm: 340, opacity: 0.03 },
	{ radiusKm: 240, opacity: 0.05 },
	{ radiusKm: 150, opacity: 0.075 },
	{ radiusKm: 82, opacity: 0.12 },
] as const;
const OWNED_VENUE_RING_CIRCLES = [
	{ radiusKm: 26, opacity: 0.86, width: 2.35 },
	{ radiusKm: 35, opacity: 0.82, width: 2.25 },
	{ radiusKm: 45, opacity: 0.76, width: 2.12 },
	{ radiusKm: 58, opacity: 0.69, width: 1.96 },
	{ radiusKm: 74, opacity: 0.61, width: 1.78 },
	{ radiusKm: 93, opacity: 0.52, width: 1.58 },
	{ radiusKm: 116, opacity: 0.43, width: 1.38 },
	{ radiusKm: 145, opacity: 0.35, width: 1.18 },
	{ radiusKm: 180, opacity: 0.28, width: 1 },
	{ radiusKm: 222, opacity: 0.21, width: 0.86 },
	{ radiusKm: 272, opacity: 0.15, width: 0.72 },
] as const;

const isValidOwnedVenueLocation = (
	location: OwnedVenueLocation | null | undefined
): location is OwnedVenueLocation =>
	Boolean(
		location &&
		Number.isFinite(location.lat) &&
		Number.isFinite(location.lng) &&
		location.lat >= -90 &&
		location.lat <= 90 &&
		location.lng >= -180 &&
		location.lng <= 180
	);

const buildOwnedVenueCircleRing = (
	center: LatLngLiteral,
	radiusKm: number
): number[][] | null => {
	const circle = buildMercatorCircleMultiPolygon(
		center,
		radiusKm,
		OWNED_VENUE_RING_STEPS,
		0,
		0
	);
	if (!circle) return null;
	return mercatorMultiPolygonToLngLat(circle)[0]?.[0] ?? null;
};

const buildOwnedVenueGlowFeatures = (
	center: LatLngLiteral,
	radarPhase = 0,
	animated = false
) =>
	OWNED_VENUE_GLOW_CIRCLES.flatMap((circle, index) => {
		const lastGlowIndex = OWNED_VENUE_GLOW_CIRCLES.length - 1;
		const glowPhase = (radarPhase - index * 0.09 + 1) % 1;
		const rawLift = animated
			? smoothstep(0.12, 0.34, glowPhase) * (1 - smoothstep(0.66, 0.98, glowPhase))
			: 0;
		const falloff = lastGlowIndex > 0 ? 1 - (index / lastGlowIndex) * 0.65 : 1;
		const lift = rawLift * falloff;
		const ring = buildOwnedVenueCircleRing(center, circle.radiusKm + lift * 3.5);
		if (!ring) return [];

		return [
			{
				type: 'Feature' as const,
				id: `owned-venue-glow-${index}`,
				properties: {
					color: mixCssColorString(
						OWNED_VENUE_GLOW_IDLE_COLOR,
						OWNED_VENUE_GLOW_ACTIVE_COLOR,
						lift * 0.35
					),
					opacity: circle.opacity * (1 + lift * 0.28),
					sort: OWNED_VENUE_GLOW_CIRCLES.length - index,
				},
				geometry: { type: 'Polygon' as const, coordinates: [ring] },
			},
		];
	});

const buildOwnedVenueRadarLineFeatures = (
	center: LatLngLiteral,
	radarPhase = 0,
	{
		animated = false,
		bloom = false,
	}: {
		animated?: boolean;
		bloom?: boolean;
	} = {}
) => {
	const lastRingIndex = OWNED_VENUE_RING_CIRCLES.length - 1;

	return OWNED_VENUE_RING_CIRCLES.flatMap((circle, index) => {
		const nextCircle = OWNED_VENUE_RING_CIRCLES[index + 1];
		const outerT = lastRingIndex > 0 ? index / lastRingIndex : 0;
		const ringPhase = (radarPhase - index * 0.066 + 1) % 1;
		const rawPulse = animated
			? smoothstep(0.04, 0.22, ringPhase) * (1 - smoothstep(0.52, 0.98, ringPhase))
			: 0;
		const pulse = Math.pow(rawPulse, 1.45);
		const eased = animated ? smoothstep(0, 1, ringPhase) : 0;
		const travelKm = nextCircle
			? (nextCircle.radiusKm - circle.radiusKm) * 0.28
			: OWNED_VENUE_RADAR_OUTER_TRAVEL_KM;
		const ring = buildOwnedVenueCircleRing(center, circle.radiusKm + travelKm * eased);
		if (!ring) return [];

		const edgeFade = lastRingIndex > 0 ? lerp(1, 0.84, outerT) : 1;
		const outerFade = 1 - smoothstep(0.78, 1, outerT) * 0.7;
		const centerWeight = lastRingIndex > 0 ? 1 - smoothstep(0.25, 0.9, outerT) : 1;
		if (bloom && centerWeight <= 0) return [];

		const color = bloom
			? mixCssColorString(
					OWNED_VENUE_RADAR_IDLE_COLOR,
					OWNED_VENUE_GLOW_ACTIVE_COLOR,
					0.18 + pulse * 0.22
				)
			: OWNED_VENUE_RADAR_IDLE_COLOR;
		const opacity = bloom
			? clamp(circle.opacity * edgeFade * centerWeight * (0.012 + pulse * 0.065), 0, 0.11)
			: clamp(circle.opacity * edgeFade * outerFade * (0.24 + pulse * 0.2), 0, 0.66);
		const width = bloom
			? circle.width * (1.35 + pulse * 1.1)
			: circle.width * (0.94 + pulse * 0.12);

		return [
			{
				type: 'Feature' as const,
				id: bloom ? `owned-venue-bloom-${index}` : `owned-venue-ring-${index}`,
				properties: bloom ? { color, opacity, width } : { opacity, width },
				geometry: { type: 'LineString' as const, coordinates: ring },
			},
		];
	});
};

const emptyFeatureCollection = (): GeoJSON.FeatureCollection => ({
	type: 'FeatureCollection',
	features: [],
});

const buildOwnedVenueMapOverlayData = (center: LatLngLiteral) => {
	return {
		glow: {
			type: 'FeatureCollection' as const,
			features: buildOwnedVenueGlowFeatures(center),
		},
		rings: {
			type: 'FeatureCollection' as const,
			features: buildOwnedVenueRadarLineFeatures(center),
		},
		icon: {
			type: 'FeatureCollection' as const,
			features: [
				{
					type: 'Feature' as const,
					id: 'owned-venue-icon',
					properties: {},
					geometry: {
						type: 'Point' as const,
						coordinates: [center.lng, center.lat],
					},
				},
			],
		},
	};
};

// A venue-posted event to render on the shared map as a radar opportunity marker.
type MapEvent = LatLngLiteral & { id: number; name?: string | null };

const EVENT_STAR_ICON_IMAGE_NAME = 'murmur-event-star-icon-image';
const EVENT_STAR_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
	mapStackStarIconSvg
)}`;
const EVENT_STAR_ICON_IMAGE_DIMENSIONS = { width: 54, height: 54 } as const;
const CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_NAME = 'murmur-campaign-footprint-spark-icon-image';
const CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_DIMENSIONS = { width: 32, height: 32 } as const;
const CAMPAIGN_FOOTPRINT_SPARK_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
	<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
		<rect x="7" y="7" width="18" height="18" rx="3.2" fill="${CAMPAIGN_FOOTPRINT_SPARK_COLOR}" opacity="0.16"/>
		<rect x="9" y="9" width="14" height="14" rx="2.6" fill="${CAMPAIGN_FOOTPRINT_SPARK_COLOR}" opacity="0.4"/>
		<rect x="10.75" y="10.75" width="10.5" height="10.5" rx="2" fill="${CAMPAIGN_FOOTPRINT_SPARK_COLOR}" stroke="${CAMPAIGN_FOOTPRINT_COLOR}" stroke-width="0.7"/>
	</svg>
`)}`;

// Event opportunity popup (phase 1: shapes + lat/lng only). Outer red box, inner white
// box inset 5px from the top, and a bottom red strip showing the event coordinates.
// The card is authored at its natural "design" size, then uniformly scaled down so it
// reads at the same compact weight as the rest of the map chrome (result rows,
// tooltips). All inner content (MapEventPopupCard) is pixel-positioned against the
// design size and scales with it, so only EVENT_POPUP_SCALE needs tuning to resize.
const EVENT_POPUP_SCALE = 0.75;
const EVENT_POPUP_DESIGN_W = 356;
const EVENT_POPUP_DESIGN_H = 457;
// On-screen footprint after scaling — used by the edge-aware placement math so the
// popup is positioned and clamped against its actual rendered size.
const EVENT_POPUP_W = Math.round(EVENT_POPUP_DESIGN_W * EVENT_POPUP_SCALE);
const EVENT_POPUP_H = Math.round(EVENT_POPUP_DESIGN_H * EVENT_POPUP_SCALE);
// Gap between the star marker and the popup edge, plus an approximate half-extent of the
// star glyph on screen (icon-size tops out ~0.66 × 54px ≈ 36px → ~14px half-extent at
// typical zoom). Used by the edge-aware placement math.
const EVENT_POPUP_GAP = 14;
const EVENT_POPUP_STAR_HALF = 14;
// Grace period before a hover-opened popup closes after the pointer leaves the star.
// Bridges the star→box gap so the cursor can travel into the (interactive) popup and
// hover/click it, instead of the popup vanishing the instant the star is no longer hit.
const EVENT_POPUP_HOVER_CLOSE_DELAY_MS = 90;
const SELECTED_TOOLTIP_FADE_START_ZOOM = 5.4;
const SELECTED_TOOLTIP_FADE_END_ZOOM = 4.7;
// Multi-select action card dock layout (mirrors dashboard MapSelectGrab rail).
const SELECTION_ACTIONS_MAP_SELECT_GRAB_LEFT_PX = 26;
const SELECTION_ACTIONS_MAP_VIEW_SIDE_PANEL_TOP_PX = 106;
const SELECTION_ACTIONS_MAP_SELECT_GRAB_TOP_EXTENT_PX =
	MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
	MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
	MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
	MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
	MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX +
	MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
	MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX +
	MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX;
const SELECTION_ACTIONS_SHOWING_ABOVE_GRAB_ORIGIN_PX =
	SELECTION_ACTIONS_MAP_SELECT_GRAB_TOP_EXTENT_PX + 17 + 6;
const SELECTION_ACTIONS_DOCK_RAIL_WIDTH_PX = 66;
const SELECTION_ACTIONS_DOCK_GAP_PX = 16;
// Gap between the card and the selection's tooltip footprint when anchored.
const SELECTION_ACTIONS_AROUND_SIDE_GAP_PX = 24;
// Conservative first-frame obstacle before the tooltip placement effect has
// published exact boxes. This prevents the card from flashing over the tooltip
// on the initial selection frame.
const SELECTION_ACTIONS_FALLBACK_TOOLTIP_HALF_W_PX = 210;
const SELECTION_ACTIONS_FALLBACK_TOOLTIP_ABOVE_PX = 125;
// The action card must also clear the selected marker/ring itself, not only the
// tooltip. Use a little padding because selected marker rings pulse/scale.
const SELECTION_ACTIONS_MARKER_CLEAR_RADIUS_PX = 40;
// Continuous dock blend: the card eases from "anchored around the selection" to
// "parked by the rail" as the view zooms out and/or the selection is panned
// off-center — never a sudden snap. Fully anchored at/above the full-anchor zoom,
// fully docked at/below the full-dock zoom, linearly blended between.
const SELECTION_ACTIONS_ANCHOR_FULL_ZOOM = 6.5;
const SELECTION_ACTIONS_DOCK_FULL_ZOOM = 4;
// Pan blend: the cluster center stays fully anchored while inside the viewport
// inset by COMFORT_PAD; past that it ramps to fully docked over DOCK_RAMP px.
const SELECTION_ACTIONS_PAN_COMFORT_PAD_PX = 96;
const SELECTION_ACTIONS_PAN_DOCK_RAMP_PX = 220;
const SELECTION_ACTIONS_VIEWPORT_MARGIN_PX = 16;
// Keep the docked card below the portaled top nav / search chrome (z-120+).
const SELECTION_ACTIONS_MAP_VIEW_UI_SCALE = 0.85;
const SELECTION_ACTIONS_TOP_BACKDROP_TOP_PX = 9;
const SELECTION_ACTIONS_TOP_BACKDROP_HEIGHT_PX = 93;
const SELECTION_ACTIONS_SEARCH_BAR_INPUT_HEIGHT_PX = 49;
const SELECTION_ACTIONS_SEARCH_BAR_BOTTOM_INSET_PX = 4;
const SELECTION_ACTIONS_TOP_CHROME_PAD_PX = 8;
// Above the selection tooltips (HOVER_TOOLTIP_Z_INDEX ± a few) so the card never
// hides behind them. Still inside the map subtree (body z-98), so the dashboard's
// portaled top nav / side panel (z-120+) keeps painting above it.
const SELECTION_ACTIONS_Z_INDEX = HOVER_TOOLTIP_Z_INDEX + 12;
const readSelectionActionsTopChromeBottomPx = (): number => {
	const scale = SELECTION_ACTIONS_MAP_VIEW_UI_SCALE;
	const searchBarTop =
		SELECTION_ACTIONS_TOP_BACKDROP_TOP_PX +
		SELECTION_ACTIONS_TOP_BACKDROP_HEIGHT_PX * scale -
		SELECTION_ACTIONS_SEARCH_BAR_BOTTOM_INSET_PX -
		SELECTION_ACTIONS_SEARCH_BAR_INPUT_HEIGHT_PX * scale;
	return (
		searchBarTop +
		SELECTION_ACTIONS_SEARCH_BAR_INPUT_HEIGHT_PX * scale +
		SELECTION_ACTIONS_TOP_CHROME_PAD_PX
	);
};
const SELECTED_TOOLTIP_STACK_MIN_SCALE = 0.9;
const SELECTED_TOOLTIP_LEGACY_STACK_T = 0.18;
const SELECTED_TOOLTIP_STACK_GROUP_SIZE = 10;
const SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX = 6;
const SELECTED_TOOLTIP_PLACEMENT_OVERLAP_WEIGHT = 200;
const SELECTED_TOOLTIP_PLACEMENT_DISTANCE_WEIGHT = 0.08;
const SELECTED_TOOLTIP_PLACEMENT_MAX_RING = 18;
const SELECTED_TOOLTIP_PLACEMENT_RING_STEP_PX = 28;
const SELECTED_TOOLTIP_PLACEMENT_MIN_SEPARATION_PX = 2;
// Stack cards use a tiny up-left offset, enough to read as a deck without
// becoming a diagonal ribbon across the map.
const SELECTED_TOOLTIP_STACK_OFFSET_X_PX = 3;
const SELECTED_TOOLTIP_STACK_OFFSET_Y_PX = 6;
const SELECTED_TOOLTIP_STACK_FAKE_BACK_COUNT = 3;
const HOVER_TOOLTIP_SIDE_GAP_X_PX = 3;
const HOVER_TOOLTIP_SIDE_GAP_Y_PX = 14;
const HOVER_TOOLTIP_VIEWPORT_PADDING_PX = 8;
const PEOPLE_TOOLTIP_FILL_COLOR = '#99E0FF';

type SelectedCompactTooltipEntry = {
	contact: ContactWithName;
	coords: LatLngLiteral;
	width: number;
	height: number;
	anchorY: number;
	svg: string;
	bodyFillColor: string;
	categoryKey: string;
	categoryFillColor: string;
	selectedOrder: number;
};

type ProjectedSelectedTooltipEntry = SelectedCompactTooltipEntry & {
	markerX: number;
	markerY: number;
	naturalX: number;
	naturalY: number;
	left: number;
	top: number;
	right: number;
	bottom: number;
	centerX: number;
	centerY: number;
};

type SelectedTooltipStackGroup = {
	id: string;
	contactIds: number[];
	count: number;
	colors: string[];
	width: number;
	height: number;
	svg: string;
	bodyFillColor: string;
};

type SelectedTooltipStackPlacement = SelectedTooltipStackGroup & {
	x: number;
	y: number;
	opacity?: number;
	scale?: number;
};

type SelectedTooltipHoverHiddenTarget =
	| { type: 'contact'; id: number }
	| { type: 'stack'; id: string };

type SelectedTooltipPlacementSide =
	| 'top'
	| 'right'
	| 'left'
	| 'bottom'
	| 'top-right'
	| 'top-left'
	| 'bottom-right'
	| 'bottom-left';

type SelectedTooltipBounds = {
	left: number;
	top: number;
	right: number;
	bottom: number;
};

type SelectedTooltipIndividualPlacement = SelectedTooltipBounds & {
	side: SelectedTooltipPlacementSide;
	x: number;
	y: number;
	centerX: number;
	centerY: number;
	transformOrigin: string;
	preferenceRank: number;
};

const createHoverTooltipSidePlacement = ({
	markerX,
	markerY,
	tooltipWidth,
	tooltipHeight,
	hitSlopPx,
	sideGapXPx,
	sideGapYPx,
	viewportWidth,
	viewportHeight,
}: {
	markerX: number;
	markerY: number;
	tooltipWidth: number;
	tooltipHeight: number;
	hitSlopPx: number;
	sideGapXPx: number;
	sideGapYPx: number;
	viewportWidth: number;
	viewportHeight: number;
}): { x: number; y: number } => {
	const minX = HOVER_TOOLTIP_VIEWPORT_PADDING_PX;
	const maxX = Math.max(
		minX,
		viewportWidth - HOVER_TOOLTIP_VIEWPORT_PADDING_PX - tooltipWidth
	);
	const rightX = markerX + sideGapXPx;
	const leftX = markerX - tooltipWidth - sideGapXPx;
	const rightFits = rightX + tooltipWidth <= viewportWidth - HOVER_TOOLTIP_VIEWPORT_PADDING_PX;
	const leftFits = leftX >= HOVER_TOOLTIP_VIEWPORT_PADDING_PX;
	const innerX = clamp(rightFits || !leftFits ? rightX : leftX, minX, maxX);

	const minY = HOVER_TOOLTIP_VIEWPORT_PADDING_PX;
	const maxY = Math.max(
		minY,
		viewportHeight - HOVER_TOOLTIP_VIEWPORT_PADDING_PX - tooltipHeight
	);
	const innerY = clamp(markerY - tooltipHeight - sideGapYPx, minY, maxY);

	return {
		x: innerX - hitSlopPx,
		y: innerY - hitSlopPx,
	};
};

const selectedTooltipHoverTargetsEqual = (
	a: SelectedTooltipHoverHiddenTarget | null,
	b: SelectedTooltipHoverHiddenTarget | null
): boolean => a?.type === b?.type && a?.id === b?.id;

const isClientPointInsideRect = (
	clientX: number,
	clientY: number,
	rect: DOMRect
): boolean =>
	rect.width > 0 &&
	rect.height > 0 &&
	clientX >= rect.left &&
	clientX <= rect.right &&
	clientY >= rect.top &&
	clientY <= rect.bottom;

const selectedTooltipRectsOverlap = (
	a: ProjectedSelectedTooltipEntry,
	b: ProjectedSelectedTooltipEntry
): boolean =>
	a.left - SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX <
		b.right + SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX &&
	a.right + SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX >
		b.left - SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX &&
	a.top - SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX <
		b.bottom + SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX &&
	a.bottom + SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX >
		b.top - SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX;

const SELECTED_TOOLTIP_PLACEMENT_SIDES: SelectedTooltipPlacementSide[] = [
	'top-right',
	'top',
	'right',
	'left',
	'bottom',
	'top-left',
	'bottom-right',
	'bottom-left',
];

const getSelectedTooltipPlacementTransformOrigin = (
	side: SelectedTooltipPlacementSide
): string => {
	switch (side) {
		case 'bottom':
			return 'top center';
		case 'left':
			return 'center right';
		case 'right':
			return 'center left';
		case 'top-left':
			return 'bottom right';
		case 'top-right':
			return 'bottom left';
		case 'bottom-left':
			return 'top right';
		case 'bottom-right':
			return 'top left';
		case 'top':
		default:
			return 'bottom center';
	}
};

const createSelectedTooltipPlacement = (
	entry: ProjectedSelectedTooltipEntry,
	side: SelectedTooltipPlacementSide,
	baseGapPx: number,
	ringExpansionPx: number,
	preferenceRank: number
): SelectedTooltipIndividualPlacement => {
	const { markerX, markerY, width, height } = entry;
	const gapPx = baseGapPx + ringExpansionPx;
	// The primary `top-right` side hugs the marker at the same gaps as the hover
	// overlay so the resting label sits exactly where the hover tooltip appears
	// (a pure cross-fade on hover). Collisions still push it outward via the ring.
	const topRightGapX = HOVER_TOOLTIP_SIDE_GAP_X_PX + ringExpansionPx;
	const topRightGapY = HOVER_TOOLTIP_SIDE_GAP_Y_PX + ringExpansionPx;
	let x = markerX - width / 2;
	let y = markerY - height - gapPx;

	switch (side) {
		case 'bottom':
			x = markerX - width / 2;
			y = markerY + gapPx;
			break;
		case 'left':
			x = markerX - width - gapPx;
			y = markerY - height / 2;
			break;
		case 'right':
			x = markerX + gapPx;
			y = markerY - height / 2;
			break;
		case 'top-left':
			x = markerX - width - gapPx;
			y = markerY - height - gapPx;
			break;
		case 'top-right':
			x = markerX + topRightGapX;
			y = markerY - height - topRightGapY;
			break;
		case 'bottom-left':
			x = markerX - width - gapPx;
			y = markerY + gapPx;
			break;
		case 'bottom-right':
			x = markerX + gapPx;
			y = markerY + gapPx;
			break;
		case 'top':
		default:
			break;
	}

	return {
		side,
		x,
		y,
		left: x,
		top: y,
		right: x + width,
		bottom: y + height,
		centerX: x + width / 2,
		centerY: y + height / 2,
		transformOrigin: getSelectedTooltipPlacementTransformOrigin(side),
		preferenceRank,
	};
};

const getSelectedTooltipOverlapArea = (
	a: SelectedTooltipBounds,
	b: SelectedTooltipBounds
): number => {
	const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
	const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
	return overlapWidth * overlapHeight;
};

const selectedTooltipBoundsOverlap = (
	a: SelectedTooltipBounds,
	b: SelectedTooltipBounds,
	paddingPx = 0
): boolean =>
	a.left - paddingPx < b.right + paddingPx &&
	a.right + paddingPx > b.left - paddingPx &&
	a.top - paddingPx < b.bottom + paddingPx &&
	a.bottom + paddingPx > b.top - paddingPx;

const selectedTooltipPlacementOverlapsAny = (
	placement: SelectedTooltipIndividualPlacement,
	blockingBounds: SelectedTooltipBounds[]
): boolean =>
	blockingBounds.some((bounds) =>
		selectedTooltipBoundsOverlap(
			placement,
			bounds,
			SELECTED_TOOLTIP_PLACEMENT_MIN_SEPARATION_PX
		)
	);

const scoreSelectedTooltipPlacement = (
	entry: ProjectedSelectedTooltipEntry,
	placement: SelectedTooltipIndividualPlacement,
	placedTooltips: SelectedTooltipIndividualPlacement[]
): number => {
	const overlapArea = placedTooltips.reduce(
		(sum, placed) => sum + getSelectedTooltipOverlapArea(placement, placed),
		0
	);
	const distanceFromNatural = Math.hypot(
		placement.x - entry.naturalX,
		placement.y - entry.naturalY
	);
	return (
		overlapArea * SELECTED_TOOLTIP_PLACEMENT_OVERLAP_WEIGHT +
		distanceFromNatural * SELECTED_TOOLTIP_PLACEMENT_DISTANCE_WEIGHT +
		placement.preferenceRank
	);
};

const createSelectedTooltipFallbackPlacement = (
	entry: ProjectedSelectedTooltipEntry,
	blockingBounds: SelectedTooltipBounds[],
	gapPx: number
): SelectedTooltipIndividualPlacement => {
	let placement = createSelectedTooltipPlacement(
		entry,
		'bottom',
		gapPx,
		0,
		SELECTED_TOOLTIP_PLACEMENT_SIDES.length
	);

	while (selectedTooltipPlacementOverlapsAny(placement, blockingBounds)) {
		const nextY =
			blockingBounds.reduce((bottom, bounds) => Math.max(bottom, bounds.bottom), placement.y) +
			SELECTED_TOOLTIP_PLACEMENT_MIN_SEPARATION_PX;
		const nextX = entry.markerX - entry.width / 2;
		placement = {
			...placement,
			x: nextX,
			y: nextY,
			left: nextX,
			top: nextY,
			right: nextX + entry.width,
			bottom: nextY + entry.height,
			centerX: nextX + entry.width / 2,
			centerY: nextY + entry.height / 2,
			transformOrigin: 'top center',
		};
	}

	return placement;
};

const buildSelectedTooltipIndividualPlacements = (
	projectedEntries: ProjectedSelectedTooltipEntry[],
	hiddenContactIds: ReadonlySet<number>,
	blockingBounds: SelectedTooltipBounds[],
	gapPx: number
): Map<number, SelectedTooltipIndividualPlacement> => {
	const placements = new Map<number, SelectedTooltipIndividualPlacement>();
	const placedBounds: SelectedTooltipBounds[] = [...blockingBounds];
	const placedTooltips: SelectedTooltipIndividualPlacement[] = [];
	const visibleEntries = projectedEntries
		.filter((entry) => !hiddenContactIds.has(entry.contact.id))
		.slice()
		.sort((a, b) => a.selectedOrder - b.selectedOrder);

	for (const entry of visibleEntries) {
		let bestPlacement: SelectedTooltipIndividualPlacement | null = null;
		let bestScore = Number.POSITIVE_INFINITY;

		for (let ring = 0; ring <= SELECTED_TOOLTIP_PLACEMENT_MAX_RING; ring += 1) {
			const ringExpansionPx = ring * SELECTED_TOOLTIP_PLACEMENT_RING_STEP_PX;
			for (let index = 0; index < SELECTED_TOOLTIP_PLACEMENT_SIDES.length; index += 1) {
				const side = SELECTED_TOOLTIP_PLACEMENT_SIDES[index];
				const placement = createSelectedTooltipPlacement(
					entry,
					side,
					gapPx,
					ringExpansionPx,
					ring * SELECTED_TOOLTIP_PLACEMENT_SIDES.length + index
				);
				if (selectedTooltipPlacementOverlapsAny(placement, placedBounds)) continue;

				const score = scoreSelectedTooltipPlacement(
					entry,
					placement,
					placedTooltips
				);
				if (score < bestScore) {
					bestScore = score;
					bestPlacement = placement;
				}
			}
		}

		const placement =
			bestPlacement ??
			createSelectedTooltipFallbackPlacement(entry, placedBounds, gapPx);
		placements.set(entry.contact.id, placement);
		placedBounds.push(placement);
		placedTooltips.push(placement);
	}

	return placements;
};

const getSelectedTooltipGroupColors = (
	entries: ProjectedSelectedTooltipEntry[]
): string[] => {
	const colors: string[] = [];
	const seen = new Set<string>();
	for (const entry of entries) {
		const color = entry.bodyFillColor || entry.categoryFillColor || PEOPLE_TOOLTIP_FILL_COLOR;
		if (seen.has(color)) continue;
		seen.add(color);
		colors.push(color);
		if (colors.length >= SELECTED_TOOLTIP_STACK_FAKE_BACK_COUNT + 1) break;
	}
	return colors.length > 0 ? colors : [PEOPLE_TOOLTIP_FILL_COLOR];
};

const getSelectedTooltipStackBounds = (placement: SelectedTooltipStackPlacement) => {
	const backLayerCount = Math.min(
		SELECTED_TOOLTIP_STACK_FAKE_BACK_COUNT,
		Math.max(0, placement.count - 1)
	);
	return {
		left:
			placement.x -
			backLayerCount * SELECTED_TOOLTIP_STACK_OFFSET_X_PX -
			SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX,
		top:
			placement.y -
			backLayerCount * SELECTED_TOOLTIP_STACK_OFFSET_Y_PX -
			SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX,
		right:
			placement.x +
			placement.width +
			SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX,
		bottom:
			placement.y +
			placement.height +
			SELECTED_TOOLTIP_STACK_COLLISION_PADDING_PX,
	};
};

const selectedTooltipStackPlacementsOverlap = (
	a: SelectedTooltipStackPlacement,
	b: SelectedTooltipStackPlacement
): boolean => {
	const aBounds = getSelectedTooltipStackBounds(a);
	const bBounds = getSelectedTooltipStackBounds(b);
	return (
		aBounds.left < bBounds.right &&
		aBounds.right > bBounds.left &&
		aBounds.top < bBounds.bottom &&
		aBounds.bottom > bBounds.top
	);
};

const mergeSelectedTooltipStackPlacements = (
	placements: SelectedTooltipStackPlacement[]
): SelectedTooltipStackPlacement => {
	const frontPlacement = placements
		.slice()
		.sort((a, b) => b.count - a.count || b.width - a.width || a.y - b.y)[0];
	const contactIds: number[] = [];
	const seenContactIds = new Set<number>();
	const colors: string[] = [];
	const seenColors = new Set<string>();

	for (const placement of placements) {
		for (const contactId of placement.contactIds) {
			if (seenContactIds.has(contactId)) continue;
			seenContactIds.add(contactId);
			contactIds.push(contactId);
		}
		for (const color of placement.colors) {
			if (seenColors.has(color)) continue;
			seenColors.add(color);
			colors.push(color);
		}
	}

	const totalCount = contactIds.length;
	const weightedCenterX =
		placements.reduce(
			(sum, placement) => sum + (placement.x + placement.width / 2) * placement.count,
			0
		) / Math.max(1, placements.reduce((sum, placement) => sum + placement.count, 0));
	const topY = Math.min(...placements.map((placement) => placement.y));

	return {
		id: `selected-stack-${contactIds.join('-')}`,
		contactIds,
		count: totalCount,
		colors: colors.length > 0 ? colors.slice(0, SELECTED_TOOLTIP_STACK_FAKE_BACK_COUNT + 1) : [PEOPLE_TOOLTIP_FILL_COLOR],
		width: frontPlacement.width,
		height: frontPlacement.height,
		svg: frontPlacement.svg,
		bodyFillColor: frontPlacement.bodyFillColor,
		x: weightedCenterX - frontPlacement.width / 2,
		y: topY,
	};
};

const compressOverlappingSelectedTooltipStacks = (
	placements: SelectedTooltipStackPlacement[]
): SelectedTooltipStackPlacement[] => {
	let current = placements;
	let didMerge = true;

	while (didMerge && current.length > 1) {
		didMerge = false;
		const visited = new Set<number>();
		const next: SelectedTooltipStackPlacement[] = [];

		for (let startIndex = 0; startIndex < current.length; startIndex += 1) {
			if (visited.has(startIndex)) continue;
			const queue = [startIndex];
			const component: SelectedTooltipStackPlacement[] = [];
			visited.add(startIndex);

			while (queue.length > 0) {
				const index = queue.shift();
				if (index == null) continue;
				const placement = current[index];
				component.push(placement);

				for (let nextIndex = 0; nextIndex < current.length; nextIndex += 1) {
					if (visited.has(nextIndex)) continue;
					if (!selectedTooltipStackPlacementsOverlap(placement, current[nextIndex])) continue;
					visited.add(nextIndex);
					queue.push(nextIndex);
				}
			}

			if (component.length > 1) {
				didMerge = true;
				next.push(mergeSelectedTooltipStackPlacements(component));
			} else {
				next.push(component[0]);
			}
		}

		current = next;
	}

	return current;
};

const buildSelectedTooltipStackPlacements = (
	projectedEntries: ProjectedSelectedTooltipEntry[]
): SelectedTooltipStackPlacement[] => {
	if (projectedEntries.length <= SELECTED_TOOLTIP_STACK_GROUP_SIZE) return [];

	const components: ProjectedSelectedTooltipEntry[][] = [];
	const visited = new Set<number>();

	for (let startIndex = 0; startIndex < projectedEntries.length; startIndex += 1) {
		if (visited.has(startIndex)) continue;

		const queue = [startIndex];
		const component: ProjectedSelectedTooltipEntry[] = [];
		visited.add(startIndex);

		while (queue.length > 0) {
			const index = queue.shift();
			if (index == null) continue;
			const entry = projectedEntries[index];
			component.push(entry);

			for (let nextIndex = 0; nextIndex < projectedEntries.length; nextIndex += 1) {
				if (visited.has(nextIndex)) continue;
				if (!selectedTooltipRectsOverlap(entry, projectedEntries[nextIndex])) continue;
				visited.add(nextIndex);
				queue.push(nextIndex);
			}
		}

		components.push(component);
	}

	const placements: SelectedTooltipStackPlacement[] = [];
	for (const component of components) {
		if (component.length <= 1) continue;

		const sorted = component.slice().sort((a, b) => {
			const yDelta = a.centerY - b.centerY;
			if (Math.abs(yDelta) > 1) return yDelta;
			const xDelta = a.centerX - b.centerX;
			if (Math.abs(xDelta) > 1) return xDelta;
			return a.selectedOrder - b.selectedOrder;
		});

		for (
			let startIndex = 0;
			startIndex < sorted.length;
			startIndex += SELECTED_TOOLTIP_STACK_GROUP_SIZE
		) {
			const groupEntries = sorted.slice(
				startIndex,
				startIndex + SELECTED_TOOLTIP_STACK_GROUP_SIZE
			);
			if (groupEntries.length <= 1) continue;

			const centerX =
				groupEntries.reduce((sum, entry) => sum + entry.centerX, 0) / groupEntries.length;
			const topY = Math.min(...groupEntries.map((entry) => entry.top));
			const frontEntry =
				groupEntries
					.slice()
					.sort((a, b) => a.selectedOrder - b.selectedOrder)
					.at(-1) ?? groupEntries[groupEntries.length - 1];
			const contactIds = groupEntries
				.slice()
				.sort((a, b) => a.selectedOrder - b.selectedOrder)
				.map((entry) => entry.contact.id);

			placements.push({
				id: `selected-stack-${contactIds.join('-')}`,
				contactIds,
				count: groupEntries.length,
				colors: getSelectedTooltipGroupColors(groupEntries),
				width: frontEntry.width,
				height: frontEntry.height,
				svg: frontEntry.svg,
				bodyFillColor: frontEntry.bodyFillColor,
				x: centerX - frontEntry.width / 2,
				y: topY,
			});
		}
	}

	return compressOverlappingSelectedTooltipStacks(placements);
};

// The opportunity markers reuse the owned-venue radar builders per event center,
// re-keying each feature id so features from different events never collide inside a
// shared source. This keeps the motion identical to the venue-portal radar.
const buildEventsGlowFeatures = (events: MapEvent[], radarPhase = 0, animated = false) =>
	events.flatMap((event) =>
		buildOwnedVenueGlowFeatures(event, radarPhase, animated).map((feature) => ({
			...feature,
			id: `event-${event.id}-${feature.id}`,
		}))
	);

const buildEventsRadarLineFeatures = (
	events: MapEvent[],
	radarPhase = 0,
	opts: { animated?: boolean; bloom?: boolean } = {}
) =>
	events.flatMap((event) =>
		buildOwnedVenueRadarLineFeatures(event, radarPhase, opts).map((feature) => ({
			...feature,
			id: `event-${event.id}-${feature.id}`,
		}))
	);

const buildEventsIconFeatures = (events: MapEvent[]) =>
	events.map((event) => ({
		type: 'Feature' as const,
		id: `event-${event.id}-icon`,
		properties: { eventId: event.id },
		geometry: {
			type: 'Point' as const,
			coordinates: [event.lng, event.lat],
		},
	}));

const buildEventsMapOverlayData = (events: MapEvent[]) => ({
	glow: {
		type: 'FeatureCollection' as const,
		features: buildEventsGlowFeatures(events),
	},
	rings: {
		type: 'FeatureCollection' as const,
		features: buildEventsRadarLineFeatures(events),
	},
	icon: {
		type: 'FeatureCollection' as const,
		features: buildEventsIconFeatures(events),
	},
});

const withFeatureOpacityFactor = (opacityExpr: any, factorExpr: any): any => {
	if (Array.isArray(opacityExpr)) {
		const op = opacityExpr[0];
		const isInterpolate =
			op === 'interpolate' || op === 'interpolate-hcl' || op === 'interpolate-lab';
		const isStep = op === 'step';
		if (isInterpolate || isStep) {
			// Output values are the second item of each (stop, output) pair:
			// interpolate -> indices 4, 6, 8, … ; step -> 2, 4, 6, … . The zoom
			// input (interpolate[2] / step[1]) and the stop inputs stay untouched.
			const firstOutputIndex = isInterpolate ? 4 : 2;
			return opacityExpr.map((part: any, i: number) =>
				i >= firstOutputIndex && i % 2 === 0 ? ['*', part, factorExpr] : part
			);
		}
	}
	return ['*', opacityExpr, factorExpr];
};

const withFeatureFillOpacity = (opacityExpr: any): any =>
	withFeatureOpacityFactor(opacityExpr, FEATURE_FILL_OPACITY_FACTOR);

const withFeatureStrokeOpacity = (opacityExpr: any): any =>
	withFeatureOpacityFactor(opacityExpr, FEATURE_STROKE_OPACITY_FACTOR);

const buildBaseMarkerVisibilityFilter = (
	visibleIds: number[],
	zoom: number,
	campaignFootprintContactIds: ReadonlySet<number>
): any => {
	const effectiveVisibleIds =
		zoom >= CAMPAIGN_FOOTPRINT_REPLACE_MARKER_MIN_ZOOM &&
		campaignFootprintContactIds.size > 0
			? visibleIds.filter((id) => !campaignFootprintContactIds.has(id))
			: visibleIds;

	return effectiveVisibleIds.length === 0
		? ['==', ['id'], -1]
		: ['match', ['id'], effectiveVisibleIds, true, false];
};

type AllContactsOverlayFetchMode = 'all' | 'ambient';
type AllContactsOverlayFetchPhase = 'visible' | 'buffer';
type AllContactsOverlayFetchBbox = BoundingBox & {
	mode: AllContactsOverlayFetchMode;
	phase: AllContactsOverlayFetchPhase;
	zoom: number;
	seed: string;
};

const AMBIENT_CONTACT_CATEGORY_TITLE_PREFIXES: readonly (readonly string[])[] = [
	['Radio Stations', 'College Radio'],
	['Wedding Planners', 'Wedding Venues'],
	['Coffee Shops'],
	['Music Festivals'],
	['Breweries', 'Distilleries', 'Wineries', 'Cideries'],
	['Music Venues'],
	['Restaurants'],
] as const;

const getAmbientContactCategoryIndexFromTitle = (
	title: string | null | undefined
): number => {
	if (!title) return -1;
	for (let i = 0; i < AMBIENT_CONTACT_CATEGORY_TITLE_PREFIXES.length; i += 1) {
		for (const prefix of AMBIENT_CONTACT_CATEGORY_TITLE_PREFIXES[i]) {
			if (startsWithCaseInsensitive(title, prefix)) return i;
		}
	}
	return -1;
};

const getAmbientContactWhatFromTitle = (
	title: string | null | undefined
): string | null =>
	getBookingTitlePrefixFromContactTitle(title) ??
	getPromotionOverlayWhatFromContactTitle(title);

export interface SearchResultsMapProps {
	contacts: ContactWithName[];
	selectedContacts: number[];
	/** Full objects for the selected contacts, so halos persist even when those contacts
	 *  are not in `contacts`/overlays (e.g. after disengaging search to the ambient atlas). */
	selectedContactObjects?: ContactWithName[];
	/** When set, highlights the corresponding marker as hovered (e.g. hovering a row in the map results panel). */
	externallyHoveredContactId?: number | null;
	/** Full search query string (e.g. "[Booking] Music Venues (Portland, ME)") */
	searchQuery?: string | null;
	/** Used to color the default (unselected) result dots by the active "What" search value. */
	searchWhat?: string | null;
	/** When false, keeps contacts/results available but hides search-specific geography (blobs/outlines/locked areas). */
	searchEngaged?: boolean;
	/** When true, connects result dots by category even without an active search query. */
	categoryConstellationsEnabled?: boolean;
	/** When true, renders the persistent selected-contact SVG labels without requiring the Search action card. */
	showSelectedContactTooltips?: boolean;
	/** Campaign overview marker mode. Category mode preserves the normal category-colored markers. */
	campaignMarkerMode?: 'category' | 'status';
	/** Per-contact campaign status used when `campaignMarkerMode` is `status`. */
	campaignContactStatusById?: ReadonlyMap<number, CampaignContactMapStatus>;
	/**
	 * Tint for the campaign selection heatmap glow (rendered behind the status
	 * pins). `null`/absent disables the glow. Only takes effect in
	 * `campaignMarkerMode === 'status'`.
	 */
	campaignHeatmapColor?: string | null;
	/** Optional per-status tints for the campaign heatmap glow. */
	campaignHeatmapStatusColors?: Readonly<Record<CampaignContactMapStatus, string>>;
	/**
	 * When true, the heatmap glow shows the whole tab set while nothing is
	 * selected. When false/absent, the glow is selection-only and stays hidden
	 * until contacts are selected.
	 */
	campaignHeatmapAmbient?: boolean;
	/** Real contacts from the active campaign, rendered as a subtle non-interactive footprint under search results. */
	campaignFootprintContacts?: ContactWithName[];
	/** When true, renders a browse-oriented all-contact atlas while search results are visually disengaged. */
	ambientContactsEnabled?: boolean;
	/** When true, warms the ambient atlas cache before the user disengages the search. */
	ambientContactsPreloadEnabled?: boolean;
	/** Per-category ambient visibility, ordered like the map grab-category stack. */
	ambientActiveCategories?: readonly boolean[];
	/** Ambient visibility for contacts that do not map to a known category. */
	ambientUncategorizedActive?: boolean;
	/** Increment to ask the map to refit to the active search without changing the query/results. */
	autoFitRequestNonce?: number;
	/**
	 * Bump to request that the *next* auto-fit be applied instantly (duration 0) instead of an
	 * animated ease/fly. Consumed once per distinct value; later fits animate normally. Used for the
	 * campaign-tab → dashboard-search transition, which must land without a pan or globe flash.
	 */
	instantAutoFitNonce?: number;
	/** Empty-map hover prompt. When present, an empty map click calls `onEmptyMapClick`. */
	emptyMapClickPrompt?: string | null;
	onEmptyMapClick?: () => void;
	/** When set, shows a persistent outline of the selected search area. */
	selectedAreaBounds?: MapSelectionBounds | null;
	/**
	 * Called as soon as the user starts interacting with the viewport (drag/zoom).
	 * Useful for dismissing transient UI (e.g. "Search this area" CTA).
	 */
	onViewportInteraction?: () => void;
	/**
	 * Called during live zoom gestures so parent UI can track the camera without
	 * waiting for Mapbox's `moveend`.
	 */
	onViewportZoom?: (zoom: number) => void;
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
	/** Imperative zoom request from dashboard map chrome. */
	requestedZoom?: { zoom: number; nonce: number; isDragging?: boolean } | null;
	/** Changes when the dashboard triggers "select all in view". */
	selectAllInViewNonce?: number;

	onAreaSelect?: (bounds: MapSelectionBounds, payload?: AreaSelectPayload) => void;

	onVisibleOverlayContactsChange?: (contacts: ContactWithName[]) => void;
	onMarkerClick?: (contact: ContactWithName) => void;
	onMarkerHover?: (contact: ContactWithName | null, meta?: MarkerHoverMeta) => void;
	onToggleSelection?: (contactId: number) => void;
	/**
	 * Multi-select action card (dashboard search map). When >= 1 contacts are
	 * selected, a floating card offers these actions. While the selection is
	 * on-screen at street zoom it tracks the top-most dot; otherwise it docks
	 * beside the left "Showing" rail (venue-portal pill pattern). Providing
	 * `onAddSelectionToFolder` opts a host into showing the card.
	 */
	onAddSelectionToFolder?: () => void;
	onWriteSelectionMessage?: () => void;
	onStateSelect?: (stateName: string) => void;
	enableStateInteractions?: boolean;
	lockedStateName?: string | null;
	/** When true, hides the state outlines (useful while search is loading). */
	isLoading?: boolean;
	/**
	 * Reports map readiness: called with true once Mapbox's `load` event fires (style + first
	 * render complete), and with false on map teardown/recreate or unmount.
	 */
	onMapLoadedChange?: (loaded: boolean) => void;
	/**
	 * Reports the earlier "globe silhouette ready" stage: true once the style is in
	 * and the world-land fill has painted (cream continents on ocean blue) — usually
	 * well before the full `load` event — and false on teardown/recreate or unmount.
	 * Hosts can drop boot masks on this and let street detail stream in behind.
	 */
	onMapFirstPaintChange?: (painted: boolean) => void;
	/**
	 * Reports the *computed* interactive zoom floor: desktop MAP_MIN_ZOOM plus the
	 * viewport-proportional delta (large monitors), mobile MOBILE_MAP_MIN_ZOOM.
	 * Fires when the value changes AND when the callback attaches (the persistent
	 * singleton map outlives route handoffs, so host pages attach this after map
	 * mount and need the current floor immediately). Never reports the transient
	 * relaxed floors used during background→interactive camera sweeps.
	 */
	onInteractiveMinZoomChange?: (minZoom: number) => void;
	/**
	 * When true, disables the base-dot "wave reveal" animation.
	 * Useful in fullscreen/cinematic map transitions where hiding dots causes visible flicker.
	 */
	disableDotWaveReveal?: boolean;
	/** When true, prevents the map from auto-zooming to fit contacts or the locked state. */
	skipAutoFit?: boolean;
	/**
	 * Optional Mapbox camera padding (in px). Useful for layouts where UI covers part
	 * of the map (e.g. a right-side panel) and the map should behave as if that area
	 * is not available.
	 */
	cameraPadding?: {
		top?: number;
		right?: number;
		bottom?: number;
		left?: number;
	} | null;
	/**
	 * Optional padding (in px) for auto-fit camera moves (fitBounds). Use when fixed UI
	 * chrome overlays the map (e.g. the mobile search view) so fitted results land in
	 * the uncovered area. Clamped to the canvas size so Mapbox's "cannot fit" bail is
	 * unreachable on small viewports. Defaults preserve the historical insets
	 * (50px contacts / 100px state).
	 */
	autoFitPadding?: {
		top: number;
		right: number;
		bottom: number;
		left: number;
	} | null;
	/**
	 * Controls whether the map should behave like a decorative dashboard background (no interactions,
	 * optional auto-rotation), or the full interactive results map.
	 */
	presentation?: 'background' | 'interactive';
	/**
	 * When true (interactive presentation only), deep zoom transitions the camera into a
	 * pitched street-level 3D view with extruded buildings, and marker hover shows the
	 * rich research card instead of the slim tooltip. Opt-in so only the dashboard
	 * map-search surface gets it (not campaign/venue/mobile maps).
	 */
	streetViewEnabled?: boolean;
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
	/**
	 * Radius-search overlay. When set, draws a translucent circle (white ring +
	 * faint fill) of `radiusMiles` around `center` plus a draggable red center pin.
	 * Null clears the overlay. `radiusMiles` should be the committed search radius,
	 * not a draft slider value.
	 */
	radiusOverlay?: { center: LatLngLiteral; radiusMiles: number } | null;
	/** Called when the user drops the draggable radius center pin at a new location. */
	onRadiusCenterChange?: (center: LatLngLiteral) => void;
	/** Current venue account location; draws the map-anchored home/radar overlay. */
	ownedVenueLocation?: OwnedVenueLocation | null;
	/**
	 * Camera target for entering interactive mode. When set, the background →
	 * interactive reveal snaps straight here (no zoom-in sweep) instead of gliding
	 * to the neutral handoff target derived from the decorative globe framing. A
	 * value that resolves or changes shortly after the reveal (e.g. the venue save
	 * is still refetching as the portal flips views) still snaps into place — until
	 * the user moves the camera themselves, after which it is never overridden.
	 */
	interactiveEntryCamera?: { center: LatLngLiteral; zoom: number } | null;
	/** Reports the owned-venue home icon's projected position in viewport px on every
	 *  camera move/resize. Null when there is no valid venue location, the map is not
	 *  loaded, or on teardown. `isOnScreen` is false when the icon is outside the
	 *  viewport (40px pad) or occluded behind the globe at low zoom. */
	onOwnedVenueAnchorChange?: (
		anchor: { x: number; y: number; isOnScreen: boolean; zoom: number } | null
	) => void;
	/** Venue-posted events to draw as radar opportunity markers (red star + radar). */
	events?: MapEvent[];
	/** Pixels along the right edge obstructed by host UI (e.g. the search-results panel).
	 *  The event popup places to the right of a marker only when it clears this region,
	 *  flipping left otherwise. */
	rightSafeAreaPx?: number;
	/** Renders the content inside an event popup's white inner box for the active event.
	 *  The map owns the popup container + positioning; the host owns the event card. */
	renderEventPopupContent?: (eventId: number) => ReactNode;
	/** When true, hides and resets event popups while a higher-level modal owns pointer flow. */
	suppressEventPopups?: boolean;
}

// Identity key for an interactive entry camera, so a refetch that re-delivers the
// same values (new object identity) is distinguishable from actually-new values.
const interactiveEntryCameraKey = (
	camera: SearchResultsMapProps['interactiveEntryCamera']
) => (camera ? `${camera.center.lat},${camera.center.lng},${camera.zoom}` : null);

// Street-view pitch as a continuous function of zoom: flat below the ramp,
// linearly tilting to STREET_VIEW_MAX_PITCH at full street zoom.
const computeStreetViewPitch = (zoom: number): number => {
	if (zoom <= STREET_VIEW_PITCH_RAMP_START_ZOOM) return 0;
	if (zoom >= STREET_VIEW_PITCH_RAMP_FULL_ZOOM) return STREET_VIEW_MAX_PITCH;
	const t =
		(zoom - STREET_VIEW_PITCH_RAMP_START_ZOOM) /
		(STREET_VIEW_PITCH_RAMP_FULL_ZOOM - STREET_VIEW_PITCH_RAMP_START_ZOOM);
	return STREET_VIEW_MAX_PITCH * t;
};

export const SearchResultsMap: FC<SearchResultsMapProps> = ({
	contacts,
	selectedContacts,
	selectedContactObjects = [],
	externallyHoveredContactId,
	searchQuery,
	searchWhat,
	searchEngaged = true,
	categoryConstellationsEnabled = false,
	showSelectedContactTooltips = false,
	campaignMarkerMode = 'category',
	campaignContactStatusById,
	campaignHeatmapColor = null,
	campaignHeatmapStatusColors,
	campaignHeatmapAmbient = false,
	campaignFootprintContacts = [],
	ambientContactsEnabled = false,
	ambientContactsPreloadEnabled = false,
	ambientActiveCategories,
	ambientUncategorizedActive = true,
	autoFitRequestNonce = 0,
	instantAutoFitNonce = 0,
	emptyMapClickPrompt = null,
	onEmptyMapClick,
	selectedAreaBounds,
	onViewportInteraction,
	onViewportZoom,
	onViewportIdle,
	activeTool,
	requestedZoom,
	selectAllInViewNonce,
	onAreaSelect,
	onVisibleOverlayContactsChange,
	onMarkerClick,
	onMarkerHover,
	onToggleSelection,
	onAddSelectionToFolder,
	onWriteSelectionMessage,
	onStateSelect,
	enableStateInteractions,
	lockedStateName,
	isLoading,
	onMapLoadedChange,
	onMapFirstPaintChange,
	onInteractiveMinZoomChange,
	disableDotWaveReveal = false,
	skipAutoFit,
	cameraPadding = null,
	autoFitPadding = null,
	presentation = 'interactive',
	streetViewEnabled = false,
	autoSpin = false,
	weatherMood: weatherMoodProp = 'normal',
	weatherRegionCenter = null,
	weatherTemperatureF = null,
	nightLighting = null,
	nightT: nightTProp = null,
	radiusOverlay = null,
	onRadiusCenterChange,
	ownedVenueLocation = null,
	interactiveEntryCamera = null,
	onOwnedVenueAnchorChange,
	events = [],
	rightSafeAreaPx = 0,
	renderEventPopupContent,
	suppressEventPopups = false,
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
	const getCampaignStatusMarkerStyleForContact = useCallback(
		(contactId: number): CampaignStatusMarkerStyle | null => {
			if (campaignMarkerMode !== 'status') return null;
			const status = campaignContactStatusById?.get(contactId) ?? 'contacts';
			return CAMPAIGN_STATUS_MARKER_STYLES[status];
		},
		[campaignContactStatusById, campaignMarkerMode]
	);
	const getCampaignStatusForContact = useCallback(
		(contactId: number): CampaignContactMapStatus =>
			campaignContactStatusById?.get(contactId) ?? 'contacts',
		[campaignContactStatusById]
	);
	const getCampaignStatusLineStyleForContacts = useCallback(
		(fromContactId: number, toContactId: number): CampaignStatusMarkerStyle | null => {
			if (campaignMarkerMode !== 'status') return null;
			const fromStatus = getCampaignStatusForContact(fromContactId);
			const toStatus = getCampaignStatusForContact(toContactId);
			if (fromStatus !== toStatus) return null;
			return CAMPAIGN_STATUS_MARKER_STYLES[fromStatus];
		},
		[campaignMarkerMode, getCampaignStatusForContact]
	);
	const emptyMapPromptText = (emptyMapClickPrompt ?? '').trim();
	const emptyMapPromptEnabled = Boolean(
		emptyMapPromptText && onEmptyMapClick && !isBackgroundPresentation && !isLoading
	);
	const [emptyMapPromptPoint, setEmptyMapPromptPoint] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const emptyMapPointerDownClientRef = useRef<{ x: number; y: number } | null>(null);
	const isDraggingRadiusRef = useRef(false);
	const radiusDragSuppressEmptyMapUntilRef = useRef(0);
	const shouldSuppressEmptyMapPrompt = useCallback(
		() =>
			isDraggingRadiusRef.current ||
			Date.now() < radiusDragSuppressEmptyMapUntilRef.current,
		[]
	);
	// Keep the latest presentation value available to async Mapbox callbacks (moveend, etc).
	const presentationRef = useRef<'background' | 'interactive'>(presentation);
	presentationRef.current = presentation;
	// Latest interactive entry camera for the map-init/presentation effects.
	// `pending` means "the user hasn't moved the camera since entering interactive
	// mode": while it holds, the camera follows the latest entry-camera value, so a
	// late or corrected arrival (e.g. fresh venue coordinates replacing a stale
	// cache row right after a save) still lands. `appliedKey` dedupes value-equal
	// re-deliveries so a confirming refetch causes no camera motion.
	const interactiveEntryCameraRef = useRef(interactiveEntryCamera);
	interactiveEntryCameraRef.current = interactiveEntryCamera;
	const interactiveEntryCameraPendingRef = useRef(false);
	const interactiveEntryCameraAppliedKeyRef = useRef<string | null>(null);
	// Basemap overview prewarm (see the prewarm effect below): last-warmed center
	// key for dedupe, and the pending debounce timer handle.
	const lastPrewarmKeyRef = useRef<string | null>(null);
	const prewarmTimerRef = useRef<number | null>(null);
	// Leading+trailing settle for the camera-driven marker resample (see onMoveEnd): the
	// first stop after a quiet period recomputes IMMEDIATELY (markers fill the instant you
	// stop — no load-in delay), while a gesture's moveend storm collapses into one trailing
	// recompute. `markerSettleTimerRef` holds the trailing timer (cleared on movestart /
	// data-driven recompute / unmount); `lastHeavyMarkerRunRef` timestamps the last run so
	// the leading edge can tell a discrete stop apart from a storm.
	const markerSettleTimerRef = useRef<number | null>(null);
	const lastHeavyMarkerRunRef = useRef<number>(0);

	const clearEmptyMapPrompt = useCallback(() => {
		setEmptyMapPromptPoint(null);
	}, []);

	const scheduleEmptyMapPrompt = useCallback(
		(point: { x: number; y: number }) => {
			if (!emptyMapPromptEnabled || shouldSuppressEmptyMapPrompt()) {
				clearEmptyMapPrompt();
				return;
			}

			const width = typeof window !== 'undefined' ? window.innerWidth : 0;
			const height = typeof window !== 'undefined' ? window.innerHeight : 0;
			const minX = EMPTY_MAP_CLICK_PROMPT_EDGE_PADDING_X_PX;
			const maxX = width > 0 ? Math.max(minX, width - minX) : point.x;
			const minY = EMPTY_MAP_CLICK_PROMPT_EDGE_PADDING_TOP_PX;
			const maxY =
				height > 0
					? Math.max(minY, height - EMPTY_MAP_CLICK_PROMPT_EDGE_PADDING_BOTTOM_PX)
					: point.y;
			const nextPoint = {
				x: width > 0 ? clamp(point.x, minX, maxX) : point.x,
				y: height > 0 ? clamp(point.y, minY, maxY) : point.y,
			};

			setEmptyMapPromptPoint(nextPoint);
		},
		[clearEmptyMapPrompt, emptyMapPromptEnabled, shouldSuppressEmptyMapPrompt]
	);

	useEffect(() => {
		if (!emptyMapPromptEnabled) clearEmptyMapPrompt();
	}, [clearEmptyMapPrompt, emptyMapPromptEnabled]);

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
	// Last camera-motion timestamp; drives the Safari idle drift cadence.
	const cloudsDriftLastCameraMoveMsRef = useRef<number>(0);
	// Last raster-opacity applied per layer by applyLightingOverlayOpacity (it
	// runs on every zoom frame; skipping unchanged values avoids restarting
	// mapbox paint transitions, which keep the render loop warm — a WebKit-felt
	// cost). Cleared in ensureMapboxSourcesAndLayers so style reloads re-assert.
	const lightingRasterOpacityAppliedRef = useRef<Record<string, number>>({});
	const lightingLayerVisibilityAppliedRef = useRef<Record<string, string>>({});
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
	// Safari perf mode: whether the lightning/snow canvases uploaded last tick, so the
	// final cleared canvas still reaches the GPU one tick after a flash/mood ends.
	const lightningUploadWasActiveRef = useRef<boolean>(false);
	const snowUploadWasActiveRef = useRef<boolean>(false);
	const snowCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const snowCanvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
	const snowStampImagesRef = useRef<HTMLImageElement[] | null>(null);
	const snowStampLoadPromiseRef = useRef<Promise<HTMLImageElement[]> | null>(null);
	const snowParticlesRef = useRef<SnowParticle[] | null>(null);
	const cloudsSnowInteractionScratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const cloudsSnowInteractionScratchCtxRef = useRef<CanvasRenderingContext2D | null>(
		null
	);
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
	// Unsubscribe burn factor (0=normal, 1=apocalypse), tweened by the burn
	// effect toward the unsubscribe flow's published target. A ref (like
	// `nightTRef`) so every pipeline reapplication can read the live value.
	const unsubscribeBurnTRef = useRef<number>(0);
	// Capture the base Mapbox paint values once, then we apply a multiplier for fading.
	const stateLineOpacityBaseRef = useRef<{ dividers: any; borders: any } | null>(null);

	const [selectedMarker, setSelectedMarker] = useState<ContactWithName | null>(null);
	const [hoveredMarkerId, setHoveredMarkerId] = useState<number | null>(null);
	const hoveredMarkerIdRef = useRef<number | null>(null);
	const hoverSourceRef = useRef<'map' | 'external' | null>(null);
	// Event opportunity popup: hover opens it, click pins it open (pinned wins over hover).
	// The ref mirrors `hoveredEventId` so the unified pointer handler can read/clear hover
	// without being added to that effect's dependency array.
	const [hoveredEventId, setHoveredEventId] = useState<number | null>(null);
	const [pinnedEventId, setPinnedEventId] = useState<number | null>(null);
	const hoveredEventIdRef = useRef<number | null>(null);
	const eventPopupOverlayRef = useRef<HTMLDivElement | null>(null);
	// Hover-intent close timer + a flag for "pointer is currently over the popup box", so the
	// hover popup survives the star→box gap and stays open while the cursor is on the card.
	const eventHoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isPointerOverEventPopupRef = useRef(false);
	// Track tooltip that is fading out (for smooth transition)
	const [fadingTooltipId, setFadingTooltipId] = useState<number | null>(null);
	const fadingTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const hoverTooltipOverlayRef = useRef<HTMLDivElement | null>(null);
	const [selectedTooltipHoverHiddenTarget, setSelectedTooltipHoverHiddenTarget] =
		useState<SelectedTooltipHoverHiddenTarget | null>(null);
	const selectedTooltipHoverHiddenTargetRef =
		useRef<SelectedTooltipHoverHiddenTarget | null>(null);
	const setSelectedTooltipHoverHiddenTargetIfChanged = useCallback(
		(target: SelectedTooltipHoverHiddenTarget | null) => {
			if (selectedTooltipHoverTargetsEqual(selectedTooltipHoverHiddenTargetRef.current, target))
				return;
			selectedTooltipHoverHiddenTargetRef.current = target;
			setSelectedTooltipHoverHiddenTarget(target);
		},
		[]
	);
	const selectedCompactTooltipRefs = useRef<Map<number, HTMLDivElement>>(new Map());
	const registerSelectedCompactTooltipEl = useCallback(
		(id: number, el: HTMLDivElement | null) => {
			if (el) {
				selectedCompactTooltipRefs.current.set(id, el);
			} else {
				selectedCompactTooltipRefs.current.delete(id);
			}
		},
		[]
	);
	const selectedTooltipStackRefs = useRef<Map<string, HTMLDivElement>>(new Map());
	const selectedTooltipStackSignatureRef = useRef('');
	const selectedTooltipStackSelectionKeyRef = useRef('');
	const [selectedTooltipStackGroups, setSelectedTooltipStackGroups] = useState<
		SelectedTooltipStackGroup[]
	>([]);
	const registerSelectedTooltipStackEl = useCallback(
		(id: string, el: HTMLDivElement | null) => {
			if (el) {
				selectedTooltipStackRefs.current.set(id, el);
			} else {
				selectedTooltipStackRefs.current.delete(id);
			}
		},
		[]
	);
	const updateSelectedTooltipHoverHiddenTarget = useCallback(
		(clientX: number, clientY: number) => {
			for (const [id, el] of selectedTooltipStackRefs.current) {
				if (isClientPointInsideRect(clientX, clientY, el.getBoundingClientRect())) {
					setSelectedTooltipHoverHiddenTargetIfChanged({ type: 'stack', id });
					return;
				}
			}

			for (const [id, el] of selectedCompactTooltipRefs.current) {
				if (isClientPointInsideRect(clientX, clientY, el.getBoundingClientRect())) {
					setSelectedTooltipHoverHiddenTargetIfChanged({ type: 'contact', id });
					return;
				}
			}

			setSelectedTooltipHoverHiddenTargetIfChanged(null);
		},
		[setSelectedTooltipHoverHiddenTargetIfChanged]
	);
	const streetCardOverlayRef = useRef<HTMLDivElement | null>(null);
	// Persistent street-view research cards: container + per-contact card elements,
	// positioned imperatively by a single shared 'move' listener.
	const streetCardsContainerRef = useRef<HTMLDivElement | null>(null);
	const streetCardElsByContactIdRef = useRef<Map<number, HTMLDivElement>>(new Map());
	const registerStreetCardEl = useCallback(
		(contactId: number, el: HTMLDivElement | null) => {
			if (el) {
				streetCardElsByContactIdRef.current.set(contactId, el);
			} else {
				streetCardElsByContactIdRef.current.delete(contactId);
			}
		},
		[]
	);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const [map, setMap] = useState<mapboxgl.Map | null>(null);
	// Mobile gets a lower interactive zoom floor so the full globe fits the narrow
	// viewport. Kept in a ref because the camera-constraint paths below (decorative
	// transitions, post-cinematic restore) re-apply the floor when they settle.
	const isMobile = useIsMobile();
	const interactiveMinZoomRef = useRef(MAP_MIN_ZOOM);
	// Viewport-proportional raise of the desktop floor (0 at ≤1920×1080). Every
	// near-floor visual ramp shifts by this delta so the fully-zoomed-out globe
	// looks identical on every monitor. Refs (not state): consumers are imperative
	// map callbacks and per-tick closures.
	const interactiveFloorDeltaRef = useRef(0);
	// Last delta whose parity anchors were actually applied to the style — gates
	// the (rare, resize-time) setPaintProperty re-application bundle.
	const lastParityAppliedFloorDeltaRef = useRef(0);
	const lastReportedInteractiveMinZoomRef = useRef<number | null>(null);
	const reapplyFloorParityRef = useRef<(() => boolean) | null>(null);
	const isMobileRef = useRef(isMobile);
	isMobileRef.current = isMobile;
	const [isMapLoaded, setIsMapLoaded] = useState(false);
	const initialZoomConstraintsRef = useRef<{ minZoom: number; maxZoom: number } | null>(
		null
	);
	const backgroundSpinCleanupRef = useRef<(() => void) | null>(null);
	const [mapLoadError, setMapLoadError] = useState<string | null>(null);
	// Ref-based notify keeps the map-init effect's deps untouched while reporting
	// readiness to the host (load → true, teardown/recreate → false, unmount → false).
	const onMapLoadedChangeRef = useRef(onMapLoadedChange);
	useEffect(() => {
		onMapLoadedChangeRef.current = onMapLoadedChange;
	});
	useEffect(() => {
		onMapLoadedChangeRef.current?.(isMapLoaded);
	}, [isMapLoaded]);
	useEffect(() => () => onMapLoadedChangeRef.current?.(false), []);
	// Earlier "land painted" readiness stage; same ref-based notify pattern.
	const [isMapFirstPainted, setIsMapFirstPainted] = useState(false);
	const onMapFirstPaintChangeRef = useRef(onMapFirstPaintChange);
	useEffect(() => {
		onMapFirstPaintChangeRef.current = onMapFirstPaintChange;
	});
	useEffect(() => {
		onMapFirstPaintChangeRef.current?.(isMapFirstPainted);
	}, [isMapFirstPainted]);
	useEffect(() => () => onMapFirstPaintChangeRef.current?.(false), []);
	const onInteractiveMinZoomChangeRef = useRef(onInteractiveMinZoomChange);
	useEffect(() => {
		onInteractiveMinZoomChangeRef.current = onInteractiveMinZoomChange;
		// The singleton map outlives route handoffs; host pages attach this callback
		// after mount via a mapProps swap, so re-fire the current floor at them.
		if (onInteractiveMinZoomChange && lastReportedInteractiveMinZoomRef.current != null) {
			onInteractiveMinZoomChange(lastReportedInteractiveMinZoomRef.current);
		}
	}, [onInteractiveMinZoomChange]);
	// While easing from the decorative globe (zoom below the interactive floor) the
	// floor is temporarily relaxed; these track the pending restore (see the
	// background→interactive transition and the post-auto-fit moveend restore).
	const pendingMinZoomRestoreRef = useRef(false);
	const hasAttachedMinZoomRestoreRef = useRef(false);

	// Single compute+apply+report function for the interactive zoom floor. Reads
	// only refs (deps []) so the map-init effect, the resize pipeline and the
	// device-class effect can all share it.
	const syncInteractiveFloor = useCallback(() => {
		// useIsMobile() returns null while detecting; treat as desktop (matches the
		// previous `isMobile ? … : …` falsy branch).
		const mobile = isMobileRef.current === true;
		let delta = 0;
		if (!mobile) {
			// Container client dims are the same CSS-px units mapbox uses to size the
			// globe on its canvas — correct under counter-zoom / Safari force-transform.
			const container = mapContainerRef.current ?? mapRef.current?.getContainer() ?? null;
			if (container) {
				delta = getInteractiveMapMinZoomDelta(
					container.clientWidth,
					container.clientHeight
				);
			}
		}
		interactiveFloorDeltaRef.current = delta;
		const floor = mobile ? MOBILE_MAP_MIN_ZOOM : MAP_MIN_ZOOM + delta;
		interactiveMinZoomRef.current = floor;

		// Report the COMPUTED floor upward (never transient relaxed map.getMinZoom()).
		if (lastReportedInteractiveMinZoomRef.current !== floor) {
			lastReportedInteractiveMinZoomRef.current = floor;
			onInteractiveMinZoomChangeRef.current?.(floor);
		}

		// Apply, unless the decorative lock or a relaxed floor owns the constraints —
		// those paths re-apply interactiveMinZoomRef.current once the camera settles.
		const m = mapRef.current;
		if (
			m &&
			presentationRef.current !== 'background' &&
			!pendingMinZoomRestoreRef.current
		) {
			try {
				m.setMinZoom(floor);
			} catch {
				// Ignore (map may be tearing down).
			}
		}

		// Shift the near-floor visual ramps exactly once per delta change. The gate
		// only advances when re-application actually ran against a loaded style
		// (ensureMapboxSourcesAndLayers also bakes the current delta at creation).
		if (lastParityAppliedFloorDeltaRef.current !== delta) {
			if (reapplyFloorParityRef.current?.() === true) {
				lastParityAppliedFloorDeltaRef.current = delta;
			}
		}
	}, []);
	const [selectedStateKey, setSelectedStateKey] = useState<string | null>(null);
	const [zoomLevel, setZoomLevel] = useState(MAP_DEFAULT_ZOOM);
	// Track last-applied camera padding so we don't spam Mapbox with identical updates.
	const lastCameraPaddingKeyRef = useRef<string>('');
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
	const lightingOverlayBurnWashRef = useRef<HTMLDivElement | null>(null);
	const lightingOverlayBurnGlowRef = useRef<HTMLDivElement | null>(null);
	const [visibleContacts, setVisibleContacts] = useState<ContactWithName[]>([]);
	// Keep a "sticky" set of currently-rendered marker ids so zooming can rescale existing markers
	// and only introduce *new* markers, instead of re-sampling a totally different set each time.
	const visibleContactIdSetRef = useRef<Set<number>>(new Set());
	// Identity salt for per-contact dot sampling/hashing. Invariant under zoom & pan
	// (so the visible dot set doesn't reshuffle when crossing zoom thresholds); resets
	// only when the underlying result set / locked state changes.
	const dotSampleSaltRef = useRef<string>('');
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

	// High-zoom "all contacts" overlay plus disengaged ambient atlas.
	const [allContactsOverlayVisibleContacts, setAllContactsOverlayVisibleContacts] =
		useState<ContactWithName[]>([]);
	const allContactsOverlayVisibleIdSetRef = useRef<Set<number>>(new Set());
	const lastAllContactsOverlayVisibleContactsKeyRef = useRef<string>('');
	const lastAllContactsOverlayVisibleFetchKeyRef = useRef<string>('');
	const lastAllContactsOverlayBufferFetchKeyRef = useRef<string>('');
	const [allContactsOverlayFetchBbox, setAllContactsOverlayFetchBbox] =
		useState<AllContactsOverlayFetchBbox | null>(null);
	const [allContactsOverlayBufferFetchBbox, setAllContactsOverlayBufferFetchBbox] =
		useState<AllContactsOverlayFetchBbox | null>(null);
	const allContactsOverlayLandMaskByIdRef = useRef<Map<number, boolean>>(new Map());
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
	const curatedOrbBloomGradientRefs = useRef<Array<SVGRadialGradientElement | null>>([]);
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

	// Apply camera padding (campaign map shift-left uses this).
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		// Never apply UI-driven padding in decorative background mode.
		if (isBackgroundPresentation) return;

		const safe = (n: unknown) => {
			const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
			return v > 0 ? v : 0;
		};
		const next = {
			top: safe(cameraPadding?.top),
			right: safe(cameraPadding?.right),
			bottom: safe(cameraPadding?.bottom),
			left: safe(cameraPadding?.left),
		};
		const key = `${next.top},${next.right},${next.bottom},${next.left}`;
		if (key === lastCameraPaddingKeyRef.current) return;
		lastCameraPaddingKeyRef.current = key;

		try {
			map.setPadding(next);
		} catch {
			// Non-fatal; map may be mid-teardown.
		}
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		cameraPadding?.top,
		cameraPadding?.right,
		cameraPadding?.bottom,
		cameraPadding?.left,
	]);

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
	const isAmbientContactsEnabled = ambientContactsEnabled && !isBackgroundPresentation;
	const shouldFetchAmbientContacts =
		(ambientContactsEnabled || ambientContactsPreloadEnabled) &&
		!isBackgroundPresentation;
	const onViewportInteractionRef = useRef<
		SearchResultsMapProps['onViewportInteraction'] | null
	>(null);
	const onViewportZoomRef = useRef<SearchResultsMapProps['onViewportZoom'] | null>(null);
	const onViewportIdleRef = useRef<SearchResultsMapProps['onViewportIdle'] | null>(null);
	const selectedAreaBoundsRef = useRef<MapSelectionBounds | null>(null);
	useEffect(() => {
		onViewportInteractionRef.current = onViewportInteraction ?? null;
	}, [onViewportInteraction]);
	useEffect(() => {
		onViewportZoomRef.current = onViewportZoom ?? null;
	}, [onViewportZoom]);
	useEffect(() => {
		onViewportIdleRef.current = onViewportIdle ?? null;
	}, [onViewportIdle]);
	const onOwnedVenueAnchorChangeRef = useRef<
		SearchResultsMapProps['onOwnedVenueAnchorChange'] | null
	>(null);
	useEffect(() => {
		onOwnedVenueAnchorChangeRef.current = onOwnedVenueAnchorChange ?? null;
	}, [onOwnedVenueAnchorChange]);
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
		lastAllContactsOverlayVisibleFetchKeyRef.current = '';
		lastAllContactsOverlayBufferFetchKeyRef.current = '';
		setAllContactsOverlayFetchBbox(null);
		setAllContactsOverlayBufferFetchBbox(null);
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

	// ── Radius-search overlay (circle + draggable center pin) ──────────────────
	const onRadiusCenterChangeRef = useRef<
		SearchResultsMapProps['onRadiusCenterChange'] | null
	>(null);
	useEffect(() => {
		onRadiusCenterChangeRef.current = onRadiusCenterChange ?? null;
	}, [onRadiusCenterChange]);

	// Latest overlay snapshot, read inside marker drag handlers (whose closures are
	// created once) so pin drags keep using the committed radius.
	const radiusOverlayRef = useRef(radiusOverlay);
	useEffect(() => {
		radiusOverlayRef.current = radiusOverlay;
	}, [radiusOverlay]);

	const radiusMarkerRef = useRef<mapboxgl.Marker | null>(null);
	const radiusMarkerZoomHandlerRef = useRef<(() => void) | null>(null);
	const ownedVenuePulseRafRef = useRef<number | null>(null);
	const ownedVenueLat = ownedVenueLocation?.lat;
	const ownedVenueLng = ownedVenueLocation?.lng;
	const ownedVenueCenter = useMemo<LatLngLiteral | null>(() => {
		const location =
			typeof ownedVenueLat === 'number' && typeof ownedVenueLng === 'number'
				? { lat: ownedVenueLat, lng: ownedVenueLng }
				: null;
		return isValidOwnedVenueLocation(location) ? location : null;
	}, [ownedVenueLat, ownedVenueLng]);
	const eventsPulseRafRef = useRef<number | null>(null);
	const eventCenters = useMemo<MapEvent[]>(
		() =>
			events.filter((event) =>
				isValidOwnedVenueLocation({ lat: event.lat, lng: event.lng })
			),
		[events]
	);
	const eventCentersById = useMemo(() => {
		const map = new Map<number, MapEvent>();
		for (const event of eventCenters) map.set(event.id, event);
		return map;
	}, [eventCenters]);
	// Pinned (click) wins over hovered. Deriving the event object via `.get()` makes the
	// "events emptied / id no longer present" cases collapse to null automatically, so the
	// popup overlay simply unmounts.
	const activeEventId = suppressEventPopups ? null : (pinnedEventId ?? hoveredEventId);
	const activeEvent =
		activeEventId != null ? (eventCentersById.get(activeEventId) ?? null) : null;
	// Drop hovered/pinned ids whose event has disappeared (e.g. events list changed).
	useEffect(() => {
		if (hoveredEventId != null && !eventCentersById.has(hoveredEventId)) {
			hoveredEventIdRef.current = null;
			setHoveredEventId(null);
		}
		if (pinnedEventId != null && !eventCentersById.has(pinnedEventId)) {
			setPinnedEventId(null);
		}
	}, [eventCentersById, hoveredEventId, pinnedEventId]);

	// Event-popup hover lifecycle. These mirror the contact-tooltip bridge: hovering the star
	// opens the popup, and a short grace period lets the cursor cross the star→box gap into the
	// (now interactive) card without it closing. The box's onMouseEnter cancels the pending
	// close; its onMouseLeave reschedules it. Pinned popups (click) ignore all of this.
	const cancelEventHoverClose = useCallback(() => {
		if (eventHoverCloseTimerRef.current) {
			clearTimeout(eventHoverCloseTimerRef.current);
			eventHoverCloseTimerRef.current = null;
		}
	}, []);
	const setEventHover = useCallback(
		(id: number) => {
			if (suppressEventPopups) return;
			cancelEventHoverClose();
			if (hoveredEventIdRef.current !== id) {
				hoveredEventIdRef.current = id;
				setHoveredEventId(id);
			}
		},
		[cancelEventHoverClose, suppressEventPopups]
	);
	const clearEventHoverImmediate = useCallback(() => {
		cancelEventHoverClose();
		// Every caller of this is a case where the cursor is provably on the map canvas
		// (area-select, or hovering a contact marker), not on the box — so the over-box flag
		// is stale and must be dropped, or it would wedge scheduleEventHoverClose off.
		isPointerOverEventPopupRef.current = false;
		if (hoveredEventIdRef.current != null) {
			hoveredEventIdRef.current = null;
			setHoveredEventId(null);
		}
	}, [cancelEventHoverClose]);
	const scheduleEventHoverClose = useCallback(() => {
		// No-op while the cursor is on the box (any stale mousemove frame would otherwise
		// reschedule a close), if nothing is hovered, or if a close is already pending.
		if (isPointerOverEventPopupRef.current) return;
		if (hoveredEventIdRef.current == null) return;
		if (eventHoverCloseTimerRef.current != null) return;
		eventHoverCloseTimerRef.current = setTimeout(() => {
			eventHoverCloseTimerRef.current = null;
			hoveredEventIdRef.current = null;
			setHoveredEventId(null);
		}, EVENT_POPUP_HOVER_CLOSE_DELAY_MS);
	}, []);
	// Drop the "pointer over box" flag whenever the popup isn't rendered. React never fires
	// the box's onMouseLeave on unmount, so if the card disappears while the cursor is inside
	// it (a new search flips isLoading, or its event leaves the set), the flag would stick
	// `true` and permanently wedge scheduleEventHoverClose off for every later hover popup.
	useEffect(() => {
		if (isLoading || activeEventId == null) {
			isPointerOverEventPopupRef.current = false;
		}
	}, [isLoading, activeEventId]);
	useEffect(() => {
		if (!suppressEventPopups) return;
		cancelEventHoverClose();
		isPointerOverEventPopupRef.current = false;
		if (hoveredEventIdRef.current != null) {
			hoveredEventIdRef.current = null;
			setHoveredEventId(null);
		}
		setPinnedEventId(null);
	}, [cancelEventHoverClose, suppressEventPopups]);
	// Clear any pending close timer + the flag on unmount (the persistent map can outlive this).
	useEffect(
		() => () => {
			cancelEventHoverClose();
			isPointerOverEventPopupRef.current = false;
		},
		[cancelEventHoverClose]
	);
	// The radius circle reuses the curated-blob pipeline (see updateCuratedBlob), so
	// it appears only once a radius search returns results, rendered as one circle.
	// The draggable center pin is set up in the marker effect below the blob builder.

	// Detach the zoom listener + marker on unmount (the persistent map is a
	// singleton that can outlive this component, so a leaked listener would pile
	// up). The per-overlay effect handles the common clear/redraw cases.
	useEffect(() => {
		if (!map) return;
		return () => {
			if (radiusMarkerZoomHandlerRef.current) {
				map.off('zoom', radiusMarkerZoomHandlerRef.current);
				radiusMarkerZoomHandlerRef.current = null;
			}
			radiusMarkerRef.current?.remove();
			radiusMarkerRef.current = null;
		};
	}, [map]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const setSourceData = (sourceId: string, data: GeoJSON.FeatureCollection) => {
			const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
			source?.setData(data);
		};

		if (!ownedVenueCenter) {
			const empty = emptyFeatureCollection();
			setSourceData(MAPBOX_SOURCE_IDS.ownedVenueGlow, empty);
			setSourceData(MAPBOX_SOURCE_IDS.ownedVenueRings, empty);
			setSourceData(MAPBOX_SOURCE_IDS.ownedVenueIcon, empty);
			return;
		}

		const overlayData = buildOwnedVenueMapOverlayData(ownedVenueCenter);
		setSourceData(MAPBOX_SOURCE_IDS.ownedVenueGlow, overlayData.glow);
		setSourceData(MAPBOX_SOURCE_IDS.ownedVenueRings, overlayData.rings);
		setSourceData(MAPBOX_SOURCE_IDS.ownedVenueIcon, overlayData.icon);
	}, [map, isMapLoaded, ownedVenueCenter]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const glowSource = map.getSource(MAPBOX_SOURCE_IDS.ownedVenueGlow) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const ringsSource = map.getSource(MAPBOX_SOURCE_IDS.ownedVenueRings) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const pulseSource = map.getSource(MAPBOX_SOURCE_IDS.ownedVenuePulse) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!glowSource || !ringsSource || !pulseSource) return;

		const clearPulse = () => {
			try {
				pulseSource.setData(emptyFeatureCollection());
			} catch {
				// Non-fatal; source may be tearing down.
			}
		};

		if (!ownedVenueCenter) {
			clearPulse();
			return;
		}

		let prefersReducedMotion = false;
		try {
			prefersReducedMotion = window.matchMedia(
				'(prefers-reduced-motion: reduce)'
			).matches;
		} catch {
			prefersReducedMotion = false;
		}

		if (prefersReducedMotion) {
			clearPulse();
			return;
		}

		let cancelled = false;

		let lastFrameMs = 0;
		const animateRadar = (nowMs: number) => {
			if (cancelled) return;
			if (nowMs - lastFrameMs < RADAR_FRAME_MS) {
				ownedVenuePulseRafRef.current = window.requestAnimationFrame(animateRadar);
				return;
			}
			lastFrameMs = nowMs;

			const phase = (nowMs % OWNED_VENUE_RADAR_MS) / OWNED_VENUE_RADAR_MS;
			// Re-fetch the sources each tick: the once-captured refs go stale if a
			// source is invalidated under rapid camera churn, and setData() on a stale
			// source throws — uncaught in rAF, which would crash the whole app.
			const glow = map.getSource(MAPBOX_SOURCE_IDS.ownedVenueGlow) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const rings = map.getSource(MAPBOX_SOURCE_IDS.ownedVenueRings) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const pulse = map.getSource(MAPBOX_SOURCE_IDS.ownedVenuePulse) as
				| mapboxgl.GeoJSONSource
				| undefined;
			if (!glow || !rings || !pulse) {
				ownedVenuePulseRafRef.current = window.requestAnimationFrame(animateRadar);
				return;
			}
			try {
				glow.setData({
					type: 'FeatureCollection',
					features: buildOwnedVenueGlowFeatures(ownedVenueCenter, phase, true),
				});
				rings.setData({
					type: 'FeatureCollection',
					features: buildOwnedVenueRadarLineFeatures(ownedVenueCenter, phase, {
						animated: true,
					}),
				});
				pulse.setData({
					type: 'FeatureCollection',
					features: buildOwnedVenueRadarLineFeatures(ownedVenueCenter, phase, {
						animated: true,
						bloom: true,
					}),
				});
			} catch {
				// Source transiently invalid mid-churn; stop cleanly. The effect
				// re-arms on the next map / center change.
				cancelled = true;
				return;
			}

			ownedVenuePulseRafRef.current = window.requestAnimationFrame(animateRadar);
		};

		ownedVenuePulseRafRef.current = window.requestAnimationFrame(animateRadar);

		return () => {
			cancelled = true;
			if (ownedVenuePulseRafRef.current != null) {
				window.cancelAnimationFrame(ownedVenuePulseRafRef.current);
				ownedVenuePulseRafRef.current = null;
			}
			clearPulse();
		};
	}, [map, isMapLoaded, ownedVenueCenter]);

	// Owned-venue anchor reporting: lets the host (venue portal) pin DOM chrome next to
	// the home icon. Mirrors the selected-marker overlay pattern (map.project on 'move').
	useEffect(() => {
		const notify = (
			anchor: { x: number; y: number; isOnScreen: boolean; zoom: number } | null
		) => onOwnedVenueAnchorChangeRef.current?.(anchor);
		if (!map || !isMapLoaded || !ownedVenueCenter) {
			notify(null);
			return;
		}

		const update = () => {
			const container = mapContainerRef.current;
			if (!container) return;
			const rect = container.getBoundingClientRect();
			const p = map.project([ownedVenueCenter.lng, ownedVenueCenter.lat]);
			// Globe far-side guard: an occluded point round-trips to a different location.
			const roundTrip = map.unproject(p);
			const occluded =
				Math.abs(roundTrip.lng - ownedVenueCenter.lng) > 1 ||
				Math.abs(roundTrip.lat - ownedVenueCenter.lat) > 1;
			const pad = 40;
			const isOnScreen =
				!occluded &&
				p.x >= -pad &&
				p.x <= rect.width + pad &&
				p.y >= -pad &&
				p.y <= rect.height + pad;
			notify({ x: rect.left + p.x, y: rect.top + p.y, isOnScreen, zoom: map.getZoom() });
		};

		update();
		map.on('move', update);
		map.on('resize', update);
		return () => {
			map.off('move', update);
			map.off('resize', update);
			notify(null);
		};
	}, [map, isMapLoaded, ownedVenueCenter]);

	// Event opportunity markers: same radar machinery as the owned venue, but anchored
	// to many event centers at once (red star icon instead of the home icon).
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const setSourceData = (sourceId: string, data: GeoJSON.FeatureCollection) => {
			const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
			source?.setData(data);
		};

		if (eventCenters.length === 0) {
			const empty = emptyFeatureCollection();
			setSourceData(MAPBOX_SOURCE_IDS.eventsGlow, empty);
			setSourceData(MAPBOX_SOURCE_IDS.eventsRings, empty);
			setSourceData(MAPBOX_SOURCE_IDS.eventsIcon, empty);
			return;
		}

		const overlayData = buildEventsMapOverlayData(eventCenters);
		setSourceData(MAPBOX_SOURCE_IDS.eventsGlow, overlayData.glow);
		setSourceData(MAPBOX_SOURCE_IDS.eventsRings, overlayData.rings);
		setSourceData(MAPBOX_SOURCE_IDS.eventsIcon, overlayData.icon);
	}, [map, isMapLoaded, eventCenters]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const glowSource = map.getSource(MAPBOX_SOURCE_IDS.eventsGlow) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const ringsSource = map.getSource(MAPBOX_SOURCE_IDS.eventsRings) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const pulseSource = map.getSource(MAPBOX_SOURCE_IDS.eventsPulse) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!glowSource || !ringsSource || !pulseSource) return;

		const clearPulse = () => {
			try {
				pulseSource.setData(emptyFeatureCollection());
			} catch {
				// Non-fatal; source may be tearing down.
			}
		};

		if (eventCenters.length === 0) {
			clearPulse();
			return;
		}

		let prefersReducedMotion = false;
		try {
			prefersReducedMotion = window.matchMedia(
				'(prefers-reduced-motion: reduce)'
			).matches;
		} catch {
			prefersReducedMotion = false;
		}

		if (prefersReducedMotion) {
			clearPulse();
			return;
		}

		let cancelled = false;

		let lastFrameMs = 0;
		const animateRadar = (nowMs: number) => {
			if (cancelled) return;
			if (nowMs - lastFrameMs < RADAR_FRAME_MS) {
				eventsPulseRafRef.current = window.requestAnimationFrame(animateRadar);
				return;
			}
			lastFrameMs = nowMs;

			const phase = (nowMs % OWNED_VENUE_RADAR_MS) / OWNED_VENUE_RADAR_MS;
			// Re-fetch the sources each tick: the once-captured refs go stale if a
			// source is invalidated under rapid camera churn, and setData() on a stale
			// source throws — uncaught in rAF, which would crash the whole app.
			const glow = map.getSource(MAPBOX_SOURCE_IDS.eventsGlow) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const rings = map.getSource(MAPBOX_SOURCE_IDS.eventsRings) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const pulse = map.getSource(MAPBOX_SOURCE_IDS.eventsPulse) as
				| mapboxgl.GeoJSONSource
				| undefined;
			if (!glow || !rings || !pulse) {
				eventsPulseRafRef.current = window.requestAnimationFrame(animateRadar);
				return;
			}
			try {
				glow.setData({
					type: 'FeatureCollection',
					features: buildEventsGlowFeatures(eventCenters, phase, true),
				});
				rings.setData({
					type: 'FeatureCollection',
					features: buildEventsRadarLineFeatures(eventCenters, phase, {
						animated: true,
					}),
				});
				pulse.setData({
					type: 'FeatureCollection',
					features: buildEventsRadarLineFeatures(eventCenters, phase, {
						animated: true,
						bloom: true,
					}),
				});
			} catch {
				// Source transiently invalid mid-churn; stop cleanly. The effect
				// re-arms on the next map / centers change.
				cancelled = true;
				return;
			}

			eventsPulseRafRef.current = window.requestAnimationFrame(animateRadar);
		};

		eventsPulseRafRef.current = window.requestAnimationFrame(animateRadar);

		return () => {
			cancelled = true;
			if (eventsPulseRafRef.current != null) {
				window.cancelAnimationFrame(eventsPulseRafRef.current);
				eventsPulseRafRef.current = null;
			}
			clearPulse();
		};
	}, [map, isMapLoaded, eventCenters]);

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

	// If the user releases the mouse (or lifts the finger) outside the map, ensure we
	// don't get "stuck" selecting.
	useEffect(() => {
		if (!isAreaSelecting) return;
		// Defer so the map's own mouseup/touchend handler can run first.
		const onWindowPointerEnd = () => setTimeout(() => clearSelectionRect(), 0);
		window.addEventListener('mouseup', onWindowPointerEnd);
		window.addEventListener('touchend', onWindowPointerEnd);
		window.addEventListener('touchcancel', onWindowPointerEnd);
		return () => {
			window.removeEventListener('mouseup', onWindowPointerEnd);
			window.removeEventListener('touchend', onWindowPointerEnd);
			window.removeEventListener('touchcancel', onWindowPointerEnd);
		};
	}, [isAreaSelecting, clearSelectionRect]);

	const beginAreaSelection = useCallback(
		(
			start: { lat: number; lng: number },
			startClient: { x: number; y: number } | null
		) => {
			selectionStartLatLngRef.current = start;
			selectionStartClientRef.current = startClient;
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
		[setPolygonSourceBounds]
	);

	const updateAreaSelection = useCallback(
		(current: { lat: number; lng: number }) => {
			if (!isAreaSelecting) return;
			const start = selectionStartLatLngRef.current;
			if (!start) return;
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

	const handleMapMouseDown = useCallback(
		(e: mapboxgl.MapMouseEvent) => {
			if (!areaSelectionEnabled) return;

			// Only left-click starts a selection.
			const domEv = e.originalEvent;
			if (domEv.button !== 0) return;

			beginAreaSelection(
				{ lat: e.lngLat.lat, lng: e.lngLat.lng },
				getClientPointFromDomEvent(domEv)
			);
		},
		[areaSelectionEnabled, beginAreaSelection]
	);

	const handleMapMouseMove = useCallback(
		(e: mapboxgl.MapMouseEvent) => {
			updateAreaSelection({ lat: e.lngLat.lat, lng: e.lngLat.lng });
		},
		[updateAreaSelection]
	);

	// Touch adapters: Mapbox does not synthesize mouse events from touches, so the
	// rectangle selection needs its own touch handlers (single-finger drag draws the
	// box; a second finger cancels so pinch-zoom never fights an in-progress selection).
	const handleMapTouchStart = useCallback(
		(e: mapboxgl.MapTouchEvent) => {
			if (!areaSelectionEnabled) return;
			if (e.originalEvent.touches.length > 1) {
				clearSelectionRect();
				return;
			}
			e.preventDefault();
			beginAreaSelection(
				{ lat: e.lngLat.lat, lng: e.lngLat.lng },
				getClientPointFromDomEvent(e.originalEvent)
			);
		},
		[areaSelectionEnabled, beginAreaSelection, clearSelectionRect]
	);

	const handleMapTouchMove = useCallback(
		(e: mapboxgl.MapTouchEvent) => {
			if (!isAreaSelecting) return;
			if (e.originalEvent.touches.length > 1) {
				clearSelectionRect();
				return;
			}
			e.preventDefault();
			updateAreaSelection({ lat: e.lngLat.lat, lng: e.lngLat.lng });
		},
		[isAreaSelecting, clearSelectionRect, updateAreaSelection]
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
			const clearAllContactsFetchWindows = () => {
				if (
					lastAllContactsOverlayVisibleFetchKeyRef.current !== '' ||
					lastAllContactsOverlayBufferFetchKeyRef.current !== ''
				) {
					lastAllContactsOverlayVisibleFetchKeyRef.current = '';
					lastAllContactsOverlayBufferFetchKeyRef.current = '';
					setAllContactsOverlayFetchBbox(null);
					setAllContactsOverlayBufferFetchBbox(null);
				}
			};

			// Search mode uses the close-zoom "all contacts" overlay. Disengaged mode uses
			// the regional ambient atlas. We also preload ambient while the empty-map prompt
			// is available so disengaging can render from cache immediately.
			const overlayMode: AllContactsOverlayFetchMode | null = shouldFetchAmbientContacts
				? 'ambient'
				: isAnySearch
					? 'all'
					: null;
			if (!overlayMode) {
				clearAllContactsFetchWindows();
				return;
			}

			const zoomRaw = mapInstance.getZoom() ?? 4;
			// Ambient gate shifts with the interactive floor so the dot-free
			// fully-zoomed-out browse state survives on large monitors.
			const minZoom =
				overlayMode === 'ambient'
					? AMBIENT_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM + interactiveFloorDeltaRef.current
					: ALL_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM;
			if (zoomRaw < minZoom) {
				clearAllContactsFetchWindows();
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

			// The visible window is intentionally unpadded in ambient mode so the first
			// request returns quickly. The padded buffer follows as a separate background
			// request and merges without clearing the visible chunk.
			const latSpan = north - south;
			const lngSpan = east - west;
			const padFactor = overlayMode === 'ambient' ? 0.42 : 0.2;
			const padLat = latSpan * padFactor;
			const padLng = lngSpan * padFactor;

			const paddedSouth = clamp(south - padLat, -90, 90);
			const paddedWest = clamp(west - padLng, -180, 180);
			const paddedNorth = clamp(north + padLat, -90, 90);
			const paddedEast = clamp(east + padLng, -180, 180);

			// Quantize the fetch window so we don't refetch on tiny pans/zooms.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);

			const buildFetchBbox = (
				phase: AllContactsOverlayFetchPhase,
				boundsForPhase: BoundingBox
			): AllContactsOverlayFetchBbox => {
				const phaseQuant =
					overlayMode === 'ambient' && phase === 'visible'
						? Math.max(0.05, quant * 0.5)
						: quant;
				const qSouth = Math.floor(boundsForPhase.minLat / phaseQuant) * phaseQuant;
				const qWest = Math.floor(boundsForPhase.minLng / phaseQuant) * phaseQuant;
				const qNorth = Math.ceil(boundsForPhase.maxLat / phaseQuant) * phaseQuant;
				const qEast = Math.ceil(boundsForPhase.maxLng / phaseQuant) * phaseQuant;
				const seed = `${overlayMode}|${phase}|${zoomKey}|${qSouth.toFixed(4)}|${qWest.toFixed(4)}|${qNorth.toFixed(4)}|${qEast.toFixed(4)}`;
				return {
					minLat: qSouth,
					minLng: qWest,
					maxLat: qNorth,
					maxLng: qEast,
					mode: overlayMode,
					phase,
					zoom: zoomRaw,
					seed,
				};
			};

			const visibleFetchBbox = buildFetchBbox('visible', {
				minLat: overlayMode === 'ambient' ? south : paddedSouth,
				minLng: overlayMode === 'ambient' ? west : paddedWest,
				maxLat: overlayMode === 'ambient' ? north : paddedNorth,
				maxLng: overlayMode === 'ambient' ? east : paddedEast,
			});

			if (visibleFetchBbox.seed !== lastAllContactsOverlayVisibleFetchKeyRef.current) {
				lastAllContactsOverlayVisibleFetchKeyRef.current = visibleFetchBbox.seed;
				setAllContactsOverlayFetchBbox(visibleFetchBbox);
			}

			if (overlayMode !== 'ambient') {
				if (lastAllContactsOverlayBufferFetchKeyRef.current !== '') {
					lastAllContactsOverlayBufferFetchKeyRef.current = '';
					setAllContactsOverlayBufferFetchBbox(null);
				}
				return;
			}

			const bufferFetchBbox = buildFetchBbox('buffer', {
				minLat: paddedSouth,
				minLng: paddedWest,
				maxLat: paddedNorth,
				maxLng: paddedEast,
			});

			if (bufferFetchBbox.seed !== lastAllContactsOverlayBufferFetchKeyRef.current) {
				lastAllContactsOverlayBufferFetchKeyRef.current = bufferFetchBbox.seed;
				setAllContactsOverlayBufferFetchBbox(bufferFetchBbox);
			}
		},
		[isAnySearch, shouldFetchAmbientContacts]
	);

	const allContactsOverlayFilters = useMemo(() => {
		if (!allContactsOverlayFetchBbox) return undefined;
		const isAmbient = allContactsOverlayFetchBbox.mode === 'ambient';
		return {
			mode: allContactsOverlayFetchBbox.mode,
			south: allContactsOverlayFetchBbox.minLat,
			west: allContactsOverlayFetchBbox.minLng,
			north: allContactsOverlayFetchBbox.maxLat,
			east: allContactsOverlayFetchBbox.maxLng,
			limit: isAmbient ? 760 : ALL_CONTACTS_OVERLAY_LIMIT,
			zoom: allContactsOverlayFetchBbox.zoom,
			seed: allContactsOverlayFetchBbox.seed,
			phase: allContactsOverlayFetchBbox.phase,
		};
	}, [allContactsOverlayFetchBbox]);

	const allContactsOverlayBufferFilters = useMemo(() => {
		if (!allContactsOverlayBufferFetchBbox) return undefined;
		return {
			mode: allContactsOverlayBufferFetchBbox.mode,
			south: allContactsOverlayBufferFetchBbox.minLat,
			west: allContactsOverlayBufferFetchBbox.minLng,
			north: allContactsOverlayBufferFetchBbox.maxLat,
			east: allContactsOverlayBufferFetchBbox.maxLng,
			limit: AMBIENT_CONTACTS_OVERLAY_LIMIT,
			zoom: allContactsOverlayBufferFetchBbox.zoom,
			seed: allContactsOverlayBufferFetchBbox.seed,
			phase: allContactsOverlayBufferFetchBbox.phase,
		};
	}, [allContactsOverlayBufferFetchBbox]);

	const { data: allContactsOverlayVisibleRawContacts } = useGetContactsMapOverlay({
		filters: allContactsOverlayFilters,
		enabled: Boolean(allContactsOverlayFilters),
	});
	const { data: allContactsOverlayBufferRawContacts } = useGetContactsMapOverlay({
		filters: allContactsOverlayBufferFilters,
		enabled: Boolean(
			allContactsOverlayBufferFilters &&
			allContactsOverlayVisibleRawContacts !== undefined
		),
	});

	const allContactsOverlayRawContacts = useMemo(() => {
		const visible = allContactsOverlayFetchBbox
			? (allContactsOverlayVisibleRawContacts ?? [])
			: [];
		const buffer = allContactsOverlayBufferFetchBbox
			? (allContactsOverlayBufferRawContacts ?? [])
			: [];
		if (visible.length === 0) return buffer;
		if (buffer.length === 0) return visible;
		const byId = new Map<number, ContactWithName>();
		for (const contact of visible) byId.set(contact.id, contact);
		for (const contact of buffer) {
			if (!byId.has(contact.id)) byId.set(contact.id, contact);
		}
		return Array.from(byId.values());
	}, [
		allContactsOverlayFetchBbox,
		allContactsOverlayBufferFetchBbox,
		allContactsOverlayVisibleRawContacts,
		allContactsOverlayBufferRawContacts,
	]);

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
		const key = Array.from(ids)
			.sort((a, b) => a - b)
			.join(',');
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
			// additionally fade out near the interactive floor so they're invisible
			// when fully zoomed out (floor-delta-shifted on large monitors).
			if (map.getLayer(MAPBOX_LAYER_IDS.statesLabels)) {
				try {
					if (overlay <= 0.001) {
						map.setPaintProperty(MAPBOX_LAYER_IDS.statesLabels, 'text-opacity', 0);
					} else {
						map.setPaintProperty(
							MAPBOX_LAYER_IDS.statesLabels,
							'text-opacity',
							buildStateLabelsTextOpacityExpr(
								overlay,
								interactiveFloorDeltaRef.current
							) as any
						);
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
		// Safari: the tick below re-uploads after each draw instead; keep the source
		// paused between ticks so the map can idle (see SAFARI_CANVAS_PERF_MODE).
		try {
			cloudsSource.play?.();
			if (SAFARI_CANVAS_PERF_MODE) cloudsSource.pause?.();
		} catch {
			// Ignore.
		}

		// Mirror the same play() guarantee for the dedicated lightning canvas source.
		// Safari: skipped — the tick uploads the lightning/snow canvases only while
		// their weather visuals are actually active.
		// Mobile lite mode: skipped — the drift tick never runs, so these canvases
		// stay blank; leaving them paused (see source setup) keeps the map idle.
		if (!SAFARI_CANVAS_PERF_MODE && isMobileRef.current !== true) {
			try {
				const lightningSource: { play?: () => void } | null = (() => {
					try {
						return map.getSource(MAPBOX_SOURCE_IDS.lightning) as {
							play?: () => void;
						} | null;
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
						return map.getSource(MAPBOX_SOURCE_IDS.snow) as { play?: () => void } | null;
					} catch {
						return null;
					}
				})();
				snowSource?.play?.();
			} catch {
				// Ignore.
			}
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
			const boostT = getLightningZoomedOutBoostT(
				opts?.zoom ?? getCurrentLightningZoom(),
				interactiveFloorDeltaRef.current
			);
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
					radiusPx: lerp(
						LIGHTNING_CELL_RADIUS_GLOBE_PX * 0.7,
						LIGHTNING_CELL_RADIUS_GLOBE_PX * 1.4,
						Math.random()
					),
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
					((x / w) * CLOUDS_CANVAS_SIZE_PX) % CLOUDS_CANVAS_SIZE_PX,
					(y / h) * CLOUDS_CANVAS_SIZE_PX,
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
			const boostT = getLightningZoomedOutBoostT(zoom, interactiveFloorDeltaRef.current);
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
				const basePeak = kind === 'dramatic' ? 0.78 : kind === 'sheet' ? 0.5 : 0.62;
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

			const enabled = !prefersReducedMotion && lightningIntensity > 0.001 && zoomOk;

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
					Math.random() <
					0.08 *
						getLightningZoomedOutBoostT(currentZoom, interactiveFloorDeltaRef.current)
						? 2
						: 1;
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
				glowA = clamp(glowA * (0.34 + occlusion * 0.38) * lightningIntensity, 0, 0.86);

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
					drawStamp(stamp, coreX, coreY, e.glowScale * 0.54, e.rotationRad, glowA * 0.5);
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
						lerp(0.18, 0.95, hash01(seed + 73.4)) * (hash01(seed + 83.9) < 0.44 ? -1 : 1),
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
				const gradient = ctx.createRadialGradient(
					s * 0.5,
					s * 0.5,
					0,
					s * 0.5,
					s * 0.5,
					s * 0.5
				);
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
				const alpha = clamp(strength * Math.pow(clamp(impact.alpha01, 0, 1), 0.55), 0, 1);
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
				const alpha = clamp(strength * Math.pow(clamp(impact.alpha01, 0, 1), 0.55), 0, 1);
				const a = alpha * 0.56;
				if (a <= 0.001) continue;

				const cx = impact.x * scaleX;
				const cy = impact.y * scaleY;
				const r = clamp(impact.radiusPx * scale, 9, 44);
				const drift = clamp(Math.tanh((impact.driftXPx * scaleX) / 12) * 1.8, -1.8, 1.8);

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
				const alpha = clamp(strength * Math.pow(clamp(impact.alpha01, 0, 1), 0.55), 0, 1);
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
				Math.max(
					0,
					Math.round(particles.length * clamp(cfg.snowDensity, 0, 1) * densityScale)
				)
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
				((((value + margin) % (span + margin * 2)) + span + margin * 2) %
					(span + margin * 2)) -
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
						(noise1D(turbulenceT * lerp(1.35, 2.35, p.depth) + p.gustSeed + 17.3) - 0.5) *
						2;
					const gustBand =
						(noise1D(baseY * 0.0042 + baseX * 0.0014 + gustT * 1.2 + 210.3) - 0.5) * 2;
					const gustFine =
						(noise1D(baseY * 0.011 - baseX * 0.002 + gustT * 2.1 + p.gustSeed) - 0.5) * 2;
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
						const alpha01 = clamp(
							flakeAlpha / Math.max(0.001, SNOW_STAMP_MAX_ALPHA),
							0,
							1
						);
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
						Math.pow(smoothstep(0.07, 0.34, a), 0.9) * (1 - smoothstep(0.48, 0.86, a));

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
						const { coreData, edgeData, corePixels, edgePixels } =
							buildStormCloudMaskData(groupDatas[g], w, h);
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
							fillPatternAt(stormEdgePattern, x0, y0, stormEdgeOpacity * baseLayerAlpha);
						}
						if (stormCorePattern) {
							fillPatternAt(stormCorePattern, x0, y0, stormCoreOpacity * baseLayerAlpha);
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

		const driftUpdateMs = SAFARI_CANVAS_PERF_MODE
			? SAFARI_CLOUDS_DRIFT_UPDATE_MS
			: CLOUDS_DRIFT_UPDATE_MS;
		const tick = (now: number, img: HTMLImageElement, pattern: CanvasPattern | null) => {
			if (canceled) return;

			// Safari: every drift tick forces a whole-map repaint (triggerRepaint
			// below). Skip ticks entirely while the weather visuals are invisible
			// (deep zoom in moods with no deep-zoom cloud veil; lightning and snow
			// are also hidden at CLOUDS_OVERLAY_FADE_OUT_END_ZOOM), and at rest
			// drop the cadence — sub-pixel drift at 10fps reads the same.
			let effectiveDriftMs = driftUpdateMs;
			if (SAFARI_CANVAS_PERF_MODE) {
				const cfg = weatherMoodConfigRef.current;
				let zoom: number | null = null;
				try {
					zoom = map.getZoom();
				} catch {
					zoom = null;
				}
				if (
					zoom != null &&
					zoom >= CLOUDS_OVERLAY_FADE_OUT_END_ZOOM &&
					cfg.cloudDeepZoomOpacity <= 0.001 &&
					lightningEventsRef.current.length === 0 &&
					!lightningUploadWasActiveRef.current &&
					!snowUploadWasActiveRef.current
				) {
					// Keep dt sane for the eventual resume, keep the rAF chain
					// alive, do no draw/upload/repaint work: the map truly idles.
					cloudsDriftLastFrameMsRef.current = now;
					cloudsDriftRafRef.current = requestAnimationFrame((t) => tick(t, img, pattern));
					return;
				}
				try {
					if (
						!map.isMoving() &&
						now - cloudsDriftLastCameraMoveMsRef.current > SAFARI_CLOUDS_IDLE_AFTER_MS
					) {
						effectiveDriftMs = SAFARI_CLOUDS_IDLE_DRIFT_UPDATE_MS;
					}
				} catch {
					// Keep the normal cadence.
				}
			}

			const last = cloudsDriftLastFrameMsRef.current;
			if (!last || now - last >= effectiveDriftMs) {
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
				if (SAFARI_CANVAS_PERF_MODE) {
					// Upload this tick's content, then leave the sources paused so the map
					// idles between ticks instead of re-uploading every canvas every frame.
					uploadCanvasSourceOnce(cloudsSource);

					// Lightning/snow upload only while visually active, plus one trailing
					// tick so the final cleared canvas reaches the GPU (drawLightning and
					// drawSnow clearRect every tick).
					const cfg = weatherMoodConfigRef.current;
					const lightningActive = lightningEventsRef.current.length > 0;
					if (lightningActive || lightningUploadWasActiveRef.current) {
						try {
							uploadCanvasSourceOnce(
								map.getSource(MAPBOX_SOURCE_IDS.lightning) as {
									play?: () => void;
									pause?: () => void;
								} | null
							);
						} catch {
							// Ignore.
						}
					}
					lightningUploadWasActiveRef.current = lightningActive;

					const snowActive = cfg.snowOpacity > 0.001 && cfg.snowDensity > 0.001;
					if (snowActive || snowUploadWasActiveRef.current) {
						try {
							uploadCanvasSourceOnce(
								map.getSource(MAPBOX_SOURCE_IDS.snow) as {
									play?: () => void;
									pause?: () => void;
								} | null
							);
						} catch {
							// Ignore.
						}
					}
					snowUploadWasActiveRef.current = snowActive;
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
				// Mobile lite mode: paint the cloud composite once and stop. The drift
				// loop also drives snow + lightning and re-uploads every canvas to the GPU
				// each frame; skipping it lets the phone idle. The static frame stays
				// pinned to the globe via the canvas source coordinates.
				if (isMobileRef.current === true) {
					uploadCanvasSourceOnce(cloudsSource);
					return;
				}
				cloudsDriftRafRef.current = requestAnimationFrame((t) => tick(t, img, pattern));
			})
			.catch(() => {
				// If the texture fails to load, just leave clouds static.
			});

		// Stamp camera motion so the Safari idle drift cadence can re-engage the
		// normal cadence the moment the user (or an ease) moves the camera.
		const stampCameraMove = () => {
			cloudsDriftLastCameraMoveMsRef.current = performance.now();
		};
		stampCameraMove();
		map.on('move', stampCameraMove);

		return () => {
			canceled = true;
			map.off('move', stampCameraMove);
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
					map.getSource(MAPBOX_SOURCE_IDS.snow) as { pause?: () => void } | undefined
				)?.pause?.();
			} catch {
				// Ignore.
			}
			if (cloudsDriftRafRef.current != null) {
				cancelAnimationFrame(cloudsDriftRafRef.current);
				cloudsDriftRafRef.current = null;
			}
		};
		// `isMobile` is included so the effect re-runs when device detection resolves
		// (it starts null): mobile takes the static path above, desktop runs the loop.
	}, [map, isMapLoaded, isMobile]);

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

		// Style (re)loads reset paint/layout values; drop the lighting memos so
		// the next applyLightingOverlayOpacity re-asserts every layer.
		lightingRasterOpacityAppliedRef.current = {};
		lightingLayerVisibilityAppliedRef.current = {};

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
					const cloudsSrc = mapInstance.getSource(MAPBOX_SOURCE_IDS.clouds) as any;
					cloudsSrc?.play?.();
					// Mobile lite mode pauses every animated canvas source so the map idles;
					// clouds are uploaded once + repinned by the static drift path.
					if (SAFARI_CANVAS_PERF_MODE || isMobileRef.current === true)
						cloudsSrc?.pause?.();
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
					const lightningSrc = mapInstance.getSource(MAPBOX_SOURCE_IDS.lightning) as
						| { play?: () => void; pause?: () => void }
						| undefined;
					lightningSrc?.play?.();
					if (SAFARI_CANVAS_PERF_MODE || isMobileRef.current === true)
						lightningSrc?.pause?.();
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
					const snowSrc = mapInstance.getSource(MAPBOX_SOURCE_IDS.snow) as
						| { play?: () => void; pause?: () => void }
						| undefined;
					snowSrc?.play?.();
					if (SAFARI_CANVAS_PERF_MODE || isMobileRef.current === true)
						snowSrc?.pause?.();
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
					const shadeSrc = mapInstance.getSource(MAPBOX_SOURCE_IDS.dayFarSideShade) as
						| { play?: () => void; pause?: () => void }
						| undefined;
					shadeSrc?.play?.();
					// Far-side shade stays visible on mobile; it's re-uploaded once whenever
					// the shade actually changes (see the shade repaint effect), then paused.
					if (SAFARI_CANVAS_PERF_MODE || isMobileRef.current === true)
						shadeSrc?.pause?.();
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
					const sunSrc = mapInstance.getSource(MAPBOX_SOURCE_IDS.sunTransition) as
						| { play?: () => void; pause?: () => void }
						| undefined;
					sunSrc?.play?.();
					if (SAFARI_CANVAS_PERF_MODE || isMobileRef.current === true)
						sunSrc?.pause?.();
				} catch {
					// Non-fatal; sunrise still falls back to the normal day/night fade.
				}
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
		ensureSource(MAPBOX_SOURCE_IDS.markerConstellationSelected);
		ensureSource(MAPBOX_SOURCE_IDS.markerConstellationNodes);
		ensureSource(MAPBOX_SOURCE_IDS.campaignFootprintPoints);
		if (!mapInstance.getSource(MAPBOX_SOURCE_IDS.campaignFootprintLines)) {
			mapInstance.addSource(MAPBOX_SOURCE_IDS.campaignFootprintLines, {
				type: 'geojson',
				data: emptyFc,
				lineMetrics: true,
			});
		}
		ensureSource(MAPBOX_SOURCE_IDS.campaignFootprintNodes);
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
		ensureSource(MAPBOX_SOURCE_IDS.markersSelected);
		ensureSource(MAPBOX_SOURCE_IDS.campaignHeatmap);
		ensureSource(MAPBOX_SOURCE_IDS.ownedVenueGlow);
		ensureSource(MAPBOX_SOURCE_IDS.ownedVenueRings);
		ensureSource(MAPBOX_SOURCE_IDS.ownedVenuePulse);
		ensureSource(MAPBOX_SOURCE_IDS.ownedVenueIcon);
		ensureSource(MAPBOX_SOURCE_IDS.eventsGlow);
		ensureSource(MAPBOX_SOURCE_IDS.eventsRings);
		ensureSource(MAPBOX_SOURCE_IDS.eventsPulse);
		ensureSource(MAPBOX_SOURCE_IDS.eventsIcon);

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

		// 3D buildings for the street-level view. Inserted beneath the basemap's first
		// symbol layer (labels stay readable) and beneath every appended murmur-* overlay.
		// Always added (minzoom-gated, so free at normal zooms); visibility is toggled by
		// the streetViewEnabled effect because this runs at 'load'/'style.load', when the
		// persistent dashboard map can still be in background presentation.
		{
			let firstBasemapSymbolLayerId: string | undefined;
			try {
				for (const layer of mapInstance.getStyle()?.layers ?? []) {
					if (!layer.id || layer.id.startsWith('murmur-')) continue;
					if (layer.type === 'symbol') {
						firstBasemapSymbolLayerId = layer.id;
						break;
					}
				}
			} catch {
				// Fall through — appended on top of the basemap is still acceptable.
			}
			ensureLayer(
				{
					id: MAPBOX_LAYER_IDS.streetViewBuildings,
					type: 'fill-extrusion',
					source: 'composite',
					'source-layer': 'building',
					filter: ['==', ['get', 'extrude'], 'true'],
					minzoom: STREET_VIEW_BUILDINGS_MIN_ZOOM,
					layout: { visibility: 'none' },
					paint: {
						'fill-extrusion-color': STREET_VIEW_BUILDING_COLOR,
						'fill-extrusion-height': [
							'interpolate',
							['linear'],
							['zoom'],
							STREET_VIEW_BUILDINGS_MIN_ZOOM,
							0,
							STREET_VIEW_BUILDINGS_RISE_FULL_ZOOM,
							['get', 'height'],
						],
						'fill-extrusion-base': [
							'interpolate',
							['linear'],
							['zoom'],
							STREET_VIEW_BUILDINGS_MIN_ZOOM,
							0,
							STREET_VIEW_BUILDINGS_RISE_FULL_ZOOM,
							['get', 'min_height'],
						],
						'fill-extrusion-opacity': [
							'interpolate',
							['linear'],
							['zoom'],
							STREET_VIEW_BUILDINGS_MIN_ZOOM,
							0,
							STREET_VIEW_BUILDINGS_RISE_FULL_ZOOM,
							STREET_VIEW_BUILDING_OPACITY,
						],
					},
				},
				firstBasemapSymbolLayerId
			);
		}

		const cfg = weatherMoodConfigRef.current;
		const cloudsOpacityExpr = buildCloudsOpacityExpr(
			cfg.cloudOpacityGlobeZoom,
			cfg.cloudOpacityDecorativeZoom,
			cfg.cloudDeepZoomOpacity,
			interactiveFloorDeltaRef.current
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

		const resultDotRadiusScaleExpr = ['coalesce', ['get', 'radiusScale'], 1];
		// Grow the dot slightly while hovered. The hover factor is a per-feature
		// constant (feature-state), so folding it into each interpolate stop keeps
		// the "zoom" curve outermost (required by mapbox-gl v3).
		const resultDotHoverRadiusScaleExpr = [
			'*',
			resultDotRadiusScaleExpr,
			['case', MARKER_HOVER_FEATURE_STATE_EXPR, MARKER_HOVER_RADIUS_SCALE, 1],
		];
		const resultDotRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			['*', RESULT_DOT_SCALE_MIN, resultDotHoverRadiusScaleExpr],
			RESULT_DOT_ZOOM_MIN,
			['*', RESULT_DOT_SCALE_MIN, resultDotHoverRadiusScaleExpr],
			RESULT_DOT_ZOOM_MAX,
			['*', RESULT_DOT_SCALE_MAX, resultDotHoverRadiusScaleExpr],
			24,
			['*', RESULT_DOT_SCALE_MAX, resultDotHoverRadiusScaleExpr],
		];
		// Selected status dot (campaign Write/Drafts/Inbox): bigger blue circle.
		// Gated on the per-feature `statusMode` flag AND the `selected` feature-state
		// so category-mode / dashboard pick-flow dots (statusMode:false) are untouched.
		const isSelectedStatusDotExpr: any = [
			'all',
			['boolean', ['get', 'statusMode'], false],
			['boolean', ['feature-state', 'selected'], false],
		];
		// `zoom` must stay the OUTERMOST input of an interpolate/step (mapbox-gl v3), so
		// the selected-size boost is folded into each stop as a per-feature multiplier
		// rather than wrapping two interpolates in a `case` (which nests zoom and errors).
		const selectedStatusDotRadiusMultiplierExpr = [
			'case',
			isSelectedStatusDotExpr,
			SELECTED_STATUS_DOT_RADIUS_SCALE,
			1,
		];
		const baseDotsRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			[
				'*',
				RESULT_DOT_SCALE_MIN,
				resultDotHoverRadiusScaleExpr,
				selectedStatusDotRadiusMultiplierExpr,
			],
			RESULT_DOT_ZOOM_MIN,
			[
				'*',
				RESULT_DOT_SCALE_MIN,
				resultDotHoverRadiusScaleExpr,
				selectedStatusDotRadiusMultiplierExpr,
			],
			RESULT_DOT_ZOOM_MAX,
			[
				'*',
				RESULT_DOT_SCALE_MAX,
				resultDotHoverRadiusScaleExpr,
				selectedStatusDotRadiusMultiplierExpr,
			],
			24,
			[
				'*',
				RESULT_DOT_SCALE_MAX,
				resultDotHoverRadiusScaleExpr,
				selectedStatusDotRadiusMultiplierExpr,
			],
		];
		// `sent` status dots are drawn hollow (fillOpacity 0, strokeOpacity 0.3); when
		// selected they must read as a solid blue disc, so force the opacity factors to 1.
		const selectedAwareFillFactor: any = [
			'case',
			isSelectedStatusDotExpr,
			1,
			FEATURE_FILL_OPACITY_FACTOR,
		];
		const selectedAwareStrokeFactor: any = [
			'case',
			isSelectedStatusDotExpr,
			1,
			FEATURE_STROKE_OPACITY_FACTOR,
		];
		const resultDotGlowRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			['*', RESULT_DOT_GLOW_RADIUS_MIN_PX, resultDotRadiusScaleExpr],
			RESULT_DOT_ZOOM_MIN,
			['*', RESULT_DOT_GLOW_RADIUS_MIN_PX, resultDotRadiusScaleExpr],
			RESULT_DOT_ZOOM_MAX,
			['*', RESULT_DOT_GLOW_RADIUS_MAX_PX, resultDotRadiusScaleExpr],
			24,
			['*', RESULT_DOT_GLOW_RADIUS_MAX_PX, resultDotRadiusScaleExpr],
		];
		const resultDotHitRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			['*', RESULT_DOT_GLOW_RADIUS_MIN_PX, resultDotRadiusScaleExpr],
			RESULT_DOT_ZOOM_MIN,
			['*', RESULT_DOT_GLOW_RADIUS_MIN_PX, resultDotRadiusScaleExpr],
			RESULT_DOT_ZOOM_MAX,
			['*', RESULT_DOT_GLOW_RADIUS_MAX_PX, resultDotRadiusScaleExpr],
			24,
			['*', RESULT_DOT_GLOW_RADIUS_MAX_PX, resultDotRadiusScaleExpr],
		];
		// Grow the invisible hit target in step with the bigger selected status dot so
		// the larger circle stays comfortably clickable (the dot must never exceed it).
		// Same zoom-outermost rule: fold the multiplier into each stop.
		const baseHitRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			[
				'*',
				RESULT_DOT_GLOW_RADIUS_MIN_PX,
				resultDotRadiusScaleExpr,
				selectedStatusDotRadiusMultiplierExpr,
			],
			RESULT_DOT_ZOOM_MIN,
			[
				'*',
				RESULT_DOT_GLOW_RADIUS_MIN_PX,
				resultDotRadiusScaleExpr,
				selectedStatusDotRadiusMultiplierExpr,
			],
			RESULT_DOT_ZOOM_MAX,
			[
				'*',
				RESULT_DOT_GLOW_RADIUS_MAX_PX,
				resultDotRadiusScaleExpr,
				selectedStatusDotRadiusMultiplierExpr,
			],
			24,
			[
				'*',
				RESULT_DOT_GLOW_RADIUS_MAX_PX,
				resultDotRadiusScaleExpr,
				selectedStatusDotRadiusMultiplierExpr,
			],
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
		const allOverlayHitRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			RESULT_DOT_GLOW_RADIUS_MIN_PX * 1.05,
			RESULT_DOT_ZOOM_MIN,
			RESULT_DOT_GLOW_RADIUS_MIN_PX * 1.05,
			RESULT_DOT_ZOOM_MAX,
			RESULT_DOT_GLOW_RADIUS_MAX_PX * 1.05,
			24,
			RESULT_DOT_GLOW_RADIUS_MAX_PX * 1.05,
		];
		const allOverlayStarIconSizeExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			0.34,
			6,
			0.38,
			10,
			0.5,
			14,
			0.62,
		];
		const markerConstellationGlowLineWidthExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			3,
			['case', ['boolean', ['get', 'useSelectedLineWidth'], false], 6, 3.4],
			7,
			['case', ['boolean', ['get', 'useSelectedLineWidth'], false], 8.4, 5.4],
			13,
			['case', ['boolean', ['get', 'useSelectedLineWidth'], false], 11.2, 7.2],
		];
		const markerConstellationCoreLineWidthExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			3,
			['case', ['boolean', ['get', 'useSelectedLineWidth'], false], 3.4, 1.25],
			7,
			['case', ['boolean', ['get', 'useSelectedLineWidth'], false], 4.8, 1.85],
			13,
			['case', ['boolean', ['get', 'useSelectedLineWidth'], false], 6.2, 2.55],
		];
		const constellationNodeRadiusScaleExpr = ['coalesce', ['get', 'radiusScale'], 1];
		const constellationNodeRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			3,
			['*', 2.1, constellationNodeRadiusScaleExpr],
			7,
			['*', 2.9, constellationNodeRadiusScaleExpr],
			13,
			['*', 4.1, constellationNodeRadiusScaleExpr],
		];
		const constellationNodeGlowRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			3,
			['*', 6, constellationNodeRadiusScaleExpr],
			7,
			['*', 8, constellationNodeRadiusScaleExpr],
			13,
			['*', 11, constellationNodeRadiusScaleExpr],
		];
		const constellationNodeStrokeWidthExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			3,
			['coalesce', ['get', 'strokeWidth'], 0.45],
			7,
			['coalesce', ['get', 'strokeWidth'], 0.65],
			13,
			['coalesce', ['get', 'strokeWidth'], 0.9],
		];
		const constellationNodeOpacityExpr = getMarkerConstellationNodeZoomFadedOpacity(
			MARKER_CONSTELLATION_NODE_OPACITY
		);

		const pinRadiusLow =
			Math.max(MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX, 2 * RESULT_DOT_SCALE_MIN) / 2;
		const pinRadiusHigh =
			Math.max(MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX, 2 * RESULT_DOT_SCALE_MAX) / 2;
		const pinHitRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			pinRadiusLow + 8,
			RESULT_DOT_ZOOM_MIN,
			pinRadiusLow + 8,
			RESULT_DOT_ZOOM_MAX,
			pinRadiusHigh + 9,
			24,
			pinRadiusHigh + 9,
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
			['*', pinIconSizeLow, VENUE_ICON_SIZE_SCALE_EXPR],
			RESULT_DOT_ZOOM_MIN,
			['*', pinIconSizeLow, VENUE_ICON_SIZE_SCALE_EXPR],
			RESULT_DOT_ZOOM_MAX,
			['*', pinIconSizeHigh, VENUE_ICON_SIZE_SCALE_EXPR],
			24,
			['*', pinIconSizeHigh, VENUE_ICON_SIZE_SCALE_EXPR],
		];
		const selectedMarkerTransformScaleExpr = [
			'coalesce',
			['get', 'selectedMarkerScale'],
			1,
		];
		const selectedMarkerIconSizeLow =
			(SELECTED_MARKER_SCALE_MULTIPLIER * 2 * RESULT_DOT_SCALE_MIN) /
			SELECTED_CONTACT_MARKER_CENTER_OUTER_DIAMETER;
		const selectedMarkerIconSizeHigh =
			(SELECTED_MARKER_SCALE_MULTIPLIER * 2 * RESULT_DOT_SCALE_MAX) /
			SELECTED_CONTACT_MARKER_CENTER_OUTER_DIAMETER;
		const selectedMarkerIconSizeExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			CURATED_DOT_FADE_END_ZOOM,
			['*', selectedMarkerIconSizeLow, selectedMarkerTransformScaleExpr],
			RESULT_DOT_ZOOM_MIN,
			['*', selectedMarkerIconSizeLow, selectedMarkerTransformScaleExpr],
			RESULT_DOT_ZOOM_MAX,
			['*', selectedMarkerIconSizeHigh, selectedMarkerTransformScaleExpr],
			24,
			['*', selectedMarkerIconSizeHigh, selectedMarkerTransformScaleExpr],
		];
		const ownedVenueHomeIconSizeExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			MAP_MIN_ZOOM,
			0.3,
			MAP_DEFAULT_ZOOM,
			0.5,
			10,
			0.72,
			14,
			0.95,
		];
		// Track the contact result dots' zoom anchors. Star image is 54px natural; these
		// give ~18px at min zoom and ~20px at the default zoom (MAP_DEFAULT_ZOOM=5),
		// growing to ~36px when zoomed in — a clear marker that reads bigger than a dot
		// without the oversized original.
		const eventStarIconSizeExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			0.33,
			RESULT_DOT_ZOOM_MIN,
			0.33,
			RESULT_DOT_ZOOM_MAX,
			0.66,
			24,
			0.66,
		];

		// States: hover fill + hit fill (transparent) + divider lines + interactive borders
		const stateDividerLineWidthExpr = buildStateDividerLineWidthExpr();
		const stateDividerLineOpacityExpr = buildStateDividerLineOpacityExpr(
			interactiveFloorDeltaRef.current
		);
		const stateInteractiveBorderWidthExpr = buildStateInteractiveBorderWidthExpr();
		const stateInteractiveBorderOpacityExpr = buildStateInteractiveBorderOpacityExpr(
			interactiveFloorDeltaRef.current
		);
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
			// Per-state zoom gate: small states (DC, territories) only label once
			// zoomed in; big states label from the wide view. `minZoom` is baked
			// into each feature by the preprocess script (area-based).
			filter: ['>=', ['zoom'], ['get', 'minZoom']],
			layout: {
				// Abbreviations when zoomed out, full names when zoomed in.
				'text-field': ['step', ['zoom'], ['get', 'key'], 8.5, ['get', 'name']],
				'text-size': ['interpolate', ['linear'], ['zoom'], 3, 9, 5, 10, 7, 12, 10, 14],
				'text-font': ['Inter Medium', 'Arial Unicode MS Regular'],
				'text-allow-overlap': false,
				'text-ignore-placement': false,
				// Smaller padding lets more initials survive collision when zoomed out.
				'text-padding': 1,
				// Rank 1 = largest state. Lower sort key is placed first and wins
				// collisions, so big states stay legible far out and crowded small
				// states (NE corner) fill in as you zoom.
				'symbol-sort-key': ['get', 'rank'],
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
				'line-width': ['interpolate', ['linear'], ['zoom'], 3.4, 0.75, 5, 5],
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

		// Campaign selection heatmap glow — a soft colored cloud behind the status
		// pins and constellation lines. Inserted before the constellation glow so it
		// sits under all linework/markers but above the basemap and curated blob.
		ensureLayer(
			{
				id: MAPBOX_LAYER_IDS.campaignHeatmapGlow,
				type: 'circle',
				source: MAPBOX_SOURCE_IDS.campaignHeatmap,
				paint: {
					'circle-radius': campaignHeatmapGlowRadiusExpr,
					'circle-color': ['coalesce', ['get', 'glowColor'], '#FFA5A5'],
					'circle-opacity': [
						'*',
						CAMPAIGN_HEATMAP_GLOW_OPACITY_MAX,
						['coalesce', ['get', 'glowFade'], 1],
					],
					'circle-blur': CAMPAIGN_HEATMAP_GLOW_BLUR,
					'circle-stroke-width': 0,
				},
			},
			MAPBOX_LAYER_IDS.markerConstellationGlow
		);

		// Active-campaign footprint — real campaign contacts rendered as subtle
		// background context under the live search result constellation/markers.
		ensureLayer(
			{
				id: MAPBOX_LAYER_IDS.campaignFootprintGlow,
				type: 'circle',
				source: MAPBOX_SOURCE_IDS.campaignFootprintPoints,
				paint: {
					'circle-radius': campaignFootprintGlowRadiusExpr,
					'circle-color': CAMPAIGN_FOOTPRINT_COLOR,
					'circle-opacity': CAMPAIGN_FOOTPRINT_GLOW_OPACITY,
					'circle-blur': 1.45,
					'circle-stroke-width': 0,
				},
			},
			MAPBOX_LAYER_IDS.markerConstellationGlow
		);
		ensureLayer(
			{
				id: MAPBOX_LAYER_IDS.campaignFootprintLineGlow,
				type: 'line',
				source: MAPBOX_SOURCE_IDS.campaignFootprintLines,
				layout: { 'line-join': 'round', 'line-cap': 'round' },
				paint: {
					'line-color': CAMPAIGN_FOOTPRINT_LINE_COLOR,
					'line-gradient': [
						'interpolate',
						['linear'],
						['line-progress'],
						0,
						'rgba(143, 180, 242, 0)',
						0.18,
						CAMPAIGN_FOOTPRINT_LINE_COLOR,
						0.5,
						'#CFE0FF',
						0.82,
						CAMPAIGN_FOOTPRINT_LINE_COLOR,
						1,
						'rgba(143, 180, 242, 0)',
					],
					'line-opacity': [
						'*',
						CAMPAIGN_FOOTPRINT_LINE_GLOW_OPACITY,
						['coalesce', ['get', 'lineOpacity'], 1],
					],
					'line-width': campaignFootprintLineGlowWidthExpr,
					'line-blur': 1.85,
				},
			},
			MAPBOX_LAYER_IDS.markerConstellationGlow
		);
		ensureLayer(
			{
				id: MAPBOX_LAYER_IDS.campaignFootprintLineCore,
				type: 'line',
				source: MAPBOX_SOURCE_IDS.campaignFootprintLines,
				layout: { 'line-join': 'round', 'line-cap': 'round' },
				paint: {
					'line-color': CAMPAIGN_FOOTPRINT_LINE_CORE_COLOR,
					'line-gradient': [
						'interpolate',
						['linear'],
						['line-progress'],
						0,
						'rgba(207, 224, 255, 0)',
						0.2,
						CAMPAIGN_FOOTPRINT_LINE_CORE_COLOR,
						0.52,
						'#EAF1FF',
						0.8,
						CAMPAIGN_FOOTPRINT_LINE_CORE_COLOR,
						1,
						'rgba(207, 224, 255, 0)',
					],
					'line-opacity': [
						'*',
						CAMPAIGN_FOOTPRINT_LINE_CORE_OPACITY,
						['coalesce', ['get', 'lineOpacity'], 1],
					],
					'line-width': campaignFootprintLineCoreWidthExpr,
					'line-blur': 0,
				},
			},
			MAPBOX_LAYER_IDS.markerConstellationGlow
		);
		ensureLayer(
			{
				id: MAPBOX_LAYER_IDS.campaignFootprintNodeGlow,
				type: 'circle',
				source: MAPBOX_SOURCE_IDS.campaignFootprintNodes,
				paint: {
					'circle-radius': campaignFootprintNodeGlowRadiusExpr,
					'circle-color': CAMPAIGN_FOOTPRINT_COLOR,
					'circle-opacity': [
						'interpolate',
						['linear'],
						['zoom'],
						CAMPAIGN_FOOTPRINT_REPLACE_MARKER_MIN_ZOOM - 0.75,
						[
							'*',
							CAMPAIGN_FOOTPRINT_NODE_GLOW_OPACITY,
							['coalesce', ['get', 'nodeOpacity'], 1],
						],
						CAMPAIGN_FOOTPRINT_REPLACE_MARKER_MIN_ZOOM,
						['coalesce', ['get', 'closeNodeGlowOpacity'], 0.9],
						CAMPAIGN_FOOTPRINT_REPLACE_MARKER_MIN_ZOOM + 1.5,
						['coalesce', ['get', 'closeNodeGlowOpacity'], 0.9],
					],
					'circle-blur': 0.82,
					'circle-stroke-width': 0,
				},
			},
			MAPBOX_LAYER_IDS.markerConstellationGlow
		);
		ensureLayer(
			{
				id: MAPBOX_LAYER_IDS.campaignFootprintNodeSpark,
				type: 'symbol',
				source: MAPBOX_SOURCE_IDS.campaignFootprintNodes,
				layout: {
					'icon-image': CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_NAME,
					'icon-size': campaignFootprintSparkSizeExpr,
					'icon-rotate': ['coalesce', ['get', 'sparkRotation'], 0],
					'icon-rotation-alignment': 'viewport',
					'icon-anchor': 'center',
					'icon-allow-overlap': true,
					'icon-ignore-placement': true,
				},
				paint: {
					'icon-opacity': [
						'interpolate',
						['linear'],
						['zoom'],
						CAMPAIGN_FOOTPRINT_REPLACE_MARKER_MIN_ZOOM - 0.75,
						[
							'*',
							CAMPAIGN_FOOTPRINT_SPARK_OPACITY,
							['coalesce', ['get', 'nodeOpacity'], 1],
						],
						CAMPAIGN_FOOTPRINT_REPLACE_MARKER_MIN_ZOOM,
						['coalesce', ['get', 'closeSparkOpacity'], 1],
						CAMPAIGN_FOOTPRINT_REPLACE_MARKER_MIN_ZOOM + 1.5,
						['coalesce', ['get', 'closeSparkOpacity'], 1],
					],
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
				'line-color': [
					'coalesce',
					['get', 'lineGlowColor'],
					MARKER_CONSTELLATION_HALO_COLOR,
				],
				'line-opacity': 0,
				'line-width': markerConstellationGlowLineWidthExpr,
				'line-blur': 1.8,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.markerConstellationCore,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.markerConstellation,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': ['coalesce', ['get', 'lineColor'], MARKER_CONSTELLATION_LINE_COLOR],
				'line-opacity': 0,
				'line-width': markerConstellationCoreLineWidthExpr,
				'line-blur': 0,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.markerConstellationSelectedGlow,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.markerConstellationSelected,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': [
					'case',
					['boolean', ['get', 'statusMode'], false],
					SELECTED_STATUS_DOT_FILL_COLOR,
					MARKER_CONSTELLATION_SELECTED_HALO_COLOR,
				],
				'line-opacity': getSelectedMarkerConstellationZoomFadedOpacity(
					MARKER_CONSTELLATION_SELECTED_GLOW_OPACITY
				),
				'line-width': ['interpolate', ['linear'], ['zoom'], 3, 6, 7, 8.4, 13, 11.2],
				'line-blur': 1.6,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.markerConstellationSelectedCore,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.markerConstellationSelected,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': [
					'case',
					['boolean', ['get', 'statusMode'], false],
					SELECTED_STATUS_DOT_STROKE_COLOR,
					MARKER_CONSTELLATION_SELECTED_LINE_COLOR,
				],
				'line-opacity': getSelectedMarkerConstellationZoomFadedOpacity(
					MARKER_CONSTELLATION_SELECTED_CORE_OPACITY
				),
				'line-width': ['interpolate', ['linear'], ['zoom'], 3, 3.4, 7, 4.8, 13, 6.2],
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
				'circle-opacity': withFeatureFillOpacity(constellationNodeOpacityExpr),
				'circle-stroke-color': [
					'coalesce',
					['get', 'strokeColor'],
					MARKER_CONSTELLATION_HALO_COLOR,
				],
				'circle-stroke-opacity': withFeatureStrokeOpacity(constellationNodeOpacityExpr),
				'circle-stroke-width': constellationNodeStrokeWidthExpr,
			},
		});

		// All-contacts overlay (gray dots) — lowest marker priority
		ensureLayer({
			id: MAPBOX_LAYER_IDS.markersAllHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersAllOverlay,
			paint: {
				'circle-radius': allOverlayHitRadiusExpr,
				'circle-opacity': 0,
				'circle-stroke-width': 0,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.markersAllGlow,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersAllOverlay,
			filter: ['!=', ['get', 'isUncategorized'], true],
			paint: {
				'circle-radius': allOverlayGlowRadiusExpr,
				'circle-color': RESULT_DOT_GLOW_COLOR,
				'circle-opacity': getSelectedStateOrbZoomFadedOpacity(
					ALL_CONTACTS_DOT_GLOW_OPACITY,
					getNormalMarkerFadeOpacityExpr()
				),
				'circle-blur': RESULT_DOT_GLOW_BLUR,
				'circle-stroke-width': 0,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.markersAllDots,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersAllOverlay,
			filter: ['!=', ['get', 'isUncategorized'], true],
			paint: {
				'circle-radius': allOverlayRadiusExpr,
				'circle-color': getMarkerHoverFillColorExpr(),
				'circle-opacity': getSelectedStateOrbZoomFadedOpacity(
					1,
					getNormalMarkerFadeOpacityExpr()
				),
				'circle-stroke-color': RESULT_DOT_TRANSPARENT_STROKE_COLOR,
				'circle-stroke-width': 0,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.markersAllFallbackIcons,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersAllOverlay,
			filter: ['==', ['get', 'isUncategorized'], true],
			layout: {
				'icon-image': ['get', 'fallbackIcon'],
				'icon-size': allOverlayStarIconSizeExpr,
				'icon-anchor': 'top-left',
				'icon-offset': [-MAP_MARKER_PIN_CIRCLE_CENTER_X, -MAP_MARKER_PIN_CIRCLE_CENTER_Y],
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
			},
			paint: {
				'icon-opacity': getSelectedStateOrbZoomFadedOpacity(
					1,
					getNormalMarkerFadeOpacityExpr()
				),
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.markersAllFallbackIconsHover,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersAllOverlay,
			filter: ['==', ['get', 'isUncategorized'], true],
			layout: {
				'icon-image': ['coalesce', ['get', 'fallbackIconHover'], ['get', 'fallbackIcon']],
				'icon-size': allOverlayStarIconSizeExpr,
				'icon-anchor': 'top-left',
				'icon-offset': [-MAP_MARKER_PIN_CIRCLE_CENTER_X, -MAP_MARKER_PIN_CIRCLE_CENTER_Y],
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
			},
			paint: {
				'icon-opacity': getSelectedStateOrbZoomFadedOpacity(1, [
					'*',
					getNormalMarkerFadeOpacityExpr(),
					getMarkerHoverOpacityExpr(),
				]),
			},
		});

		// Promotion overlay pins (outside locked state / no locked state) — behind primary dots
		// The circle layer doubles as hit area AND visual ring for selection (feature-state in paint is allowed).
		ensureLayer({
			id: MAPBOX_LAYER_IDS.promotionPinHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersPromotionPin,
			paint: {
				'circle-radius': pinHitRadiusExpr,
				'circle-opacity': 0,
				'circle-stroke-width': 0,
				'circle-stroke-color': 'transparent',
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
				'icon-opacity': getSelectedStateOrbZoomFadedOpacity(
					1,
					getNormalMarkerFadeOpacityExpr()
				),
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.promotionPinIconsHover,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersPromotionPin,
			layout: {
				'icon-image': ['coalesce', ['get', 'iconHover'], ['get', 'iconDefault']],
				'icon-size': pinIconSizeExpr,
				'icon-anchor': 'top-left',
				'icon-offset': [-MAP_MARKER_PIN_CIRCLE_CENTER_X, -MAP_MARKER_PIN_CIRCLE_CENTER_Y],
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
			},
			paint: {
				'icon-opacity': getSelectedStateOrbZoomFadedOpacity(1, [
					'*',
					getNormalMarkerFadeOpacityExpr(),
					getMarkerHoverOpacityExpr(),
				]),
			},
		});

		// Booking extra pins — behind primary dots
		// The circle layer doubles as hit area AND visual ring for selection.
		ensureLayer({
			id: MAPBOX_LAYER_IDS.bookingPinHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersBookingPin,
			paint: {
				'circle-radius': pinHitRadiusExpr,
				'circle-opacity': 0,
				'circle-stroke-width': 0,
				'circle-stroke-color': 'transparent',
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
				'icon-opacity': getSelectedStateOrbZoomFadedOpacity(
					1,
					getNormalMarkerFadeOpacityExpr()
				),
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.bookingPinIconsMarkerHover,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersBookingPin,
			layout: {
				'icon-image': ['coalesce', ['get', 'iconHover'], ['get', 'iconDefault']],
				'icon-size': pinIconSizeExpr,
				'icon-anchor': 'top-left',
				'icon-offset': [-MAP_MARKER_PIN_CIRCLE_CENTER_X, -MAP_MARKER_PIN_CIRCLE_CENTER_Y],
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
			},
			paint: {
				'icon-opacity': getSelectedStateOrbZoomFadedOpacity(1, [
					'*',
					getNormalMarkerFadeOpacityExpr(),
					getMarkerHoverOpacityExpr(),
				]),
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
				'icon-opacity': getSelectedStateOrbZoomFadedOpacity(
					1,
					getNormalMarkerFadeOpacityExpr()
				),
			},
		});

		// Promotion overlay dots (inside locked state) — below primary dots
		ensureLayer({
			id: MAPBOX_LAYER_IDS.promotionDotHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersPromotionDot,
			paint: {
				'circle-radius': resultDotHitRadiusExpr,
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
					RESULT_DOT_GLOW_OPACITY,
					getNormalMarkerFadeOpacityExpr()
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
				'circle-color': getMarkerHoverFillColorExpr(),
				'circle-opacity': getSelectedStateOrbZoomFadedOpacity(
					1,
					getNormalMarkerFadeOpacityExpr()
				),
				'circle-stroke-color': RESULT_DOT_TRANSPARENT_STROKE_COLOR,
				'circle-stroke-width': 0,
			},
		});

		// Primary result dots — top marker priority
		ensureLayer({
			id: MAPBOX_LAYER_IDS.baseHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersBase,
			paint: {
				'circle-radius': baseHitRadiusExpr,
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
				'circle-opacity': getCategorizedDotGlowZoomFadedOpacity(
					getNormalMarkerFadeOpacityExpr()
				),
				'circle-blur': RESULT_DOT_GLOW_BLUR,
				'circle-stroke-width': 0,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.baseDots,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersBase,
			paint: {
				'circle-radius': baseDotsRadiusExpr,
				'circle-color': [
					'case',
					isSelectedStatusDotExpr,
					SELECTED_STATUS_DOT_FILL_COLOR,
					getMarkerHoverFillColorExpr(),
				],
				'circle-opacity': withFeatureOpacityFactor(
					getCategorizedDotZoomFadedOpacity(getNormalMarkerFadeOpacityExpr()),
					selectedAwareFillFactor
				),
				'circle-stroke-color': [
					'case',
					isSelectedStatusDotExpr,
					SELECTED_STATUS_DOT_STROKE_COLOR,
					['coalesce', ['get', 'strokeColor'], RESULT_DOT_TRANSPARENT_STROKE_COLOR],
				],
				'circle-stroke-width': [
					'case',
					isSelectedStatusDotExpr,
					SELECTED_STATUS_DOT_STROKE_WIDTH,
					['coalesce', ['get', 'strokeWidth'], 0],
				],
				'circle-stroke-opacity': withFeatureOpacityFactor(
					getCategorizedDotZoomFadedOpacity(getNormalMarkerFadeOpacityExpr()),
					selectedAwareStrokeFactor
				),
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
				'icon-opacity': getSelectedStateOrbZoomFadedOpacity(
					1,
					getNormalMarkerFadeOpacityExpr()
				),
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.baseFallbackIconsHover,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersBase,
			filter: ['==', ['get', 'isUncategorized'], true],
			layout: {
				'icon-image': ['coalesce', ['get', 'fallbackIconHover'], ['get', 'fallbackIcon']],
				'icon-size': pinIconSizeExpr,
				'icon-anchor': 'top-left',
				'icon-offset': [-MAP_MARKER_PIN_CIRCLE_CENTER_X, -MAP_MARKER_PIN_CIRCLE_CENTER_Y],
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
			},
			paint: {
				'icon-opacity': getSelectedStateOrbZoomFadedOpacity(1, [
					'*',
					getNormalMarkerFadeOpacityExpr(),
					getMarkerHoverOpacityExpr(),
				]),
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.ownedVenueGlowFill,
			type: 'fill',
			source: MAPBOX_SOURCE_IDS.ownedVenueGlow,
			layout: { 'fill-sort-key': ['get', 'sort'] },
			paint: {
				'fill-color': ['coalesce', ['get', 'color'], '#A8E6FF'],
				'fill-opacity': ['coalesce', ['get', 'opacity'], 0],
				'fill-antialias': true,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.ownedVenueRingLines,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.ownedVenueRings,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': '#FFFFFF',
				'line-opacity': ['coalesce', ['get', 'opacity'], 0],
				'line-width': [
					'interpolate',
					['linear'],
					['zoom'],
					MAP_MIN_ZOOM,
					['*', ['coalesce', ['get', 'width'], 1], 0.72],
					MAP_DEFAULT_ZOOM,
					['coalesce', ['get', 'width'], 1],
					10,
					['*', ['coalesce', ['get', 'width'], 1], 1.1],
				],
				'line-blur': 0.18,
			},
		});
		ensureLayer(
			{
				id: MAPBOX_LAYER_IDS.ownedVenuePulseLine,
				type: 'line',
				source: MAPBOX_SOURCE_IDS.ownedVenuePulse,
				layout: { 'line-join': 'round', 'line-cap': 'round' },
				paint: {
					'line-color': ['coalesce', ['get', 'color'], '#6BD9FF'],
					'line-opacity': ['coalesce', ['get', 'opacity'], 0],
					'line-width': [
						'interpolate',
						['linear'],
						['zoom'],
						MAP_MIN_ZOOM,
						['*', ['coalesce', ['get', 'width'], 1], 0.72],
						MAP_DEFAULT_ZOOM,
						['coalesce', ['get', 'width'], 1],
						10,
						['*', ['coalesce', ['get', 'width'], 1], 1.12],
					],
					'line-blur': 1.05,
				},
			},
			MAPBOX_LAYER_IDS.ownedVenueRingLines
		);
		ensureLayer({
			id: MAPBOX_LAYER_IDS.ownedVenueHomeGlow,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.ownedVenueIcon,
			paint: {
				'circle-color': '#6BD9FF',
				'circle-radius': [
					'interpolate',
					['linear'],
					['zoom'],
					MAP_MIN_ZOOM,
					18,
					MAP_DEFAULT_ZOOM,
					34,
					10,
					52,
					14,
					68,
				],
				'circle-opacity': [
					'interpolate',
					['linear'],
					['zoom'],
					MAP_MIN_ZOOM,
					0.12,
					MAP_DEFAULT_ZOOM,
					0.22,
					10,
					0.28,
					14,
					0.24,
				],
				'circle-blur': 0.92,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.ownedVenueHomeIcon,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.ownedVenueIcon,
			layout: {
				'icon-image': OWNED_VENUE_HOME_ICON_IMAGE_NAME,
				'icon-size': ownedVenueHomeIconSizeExpr,
				'icon-anchor': 'center',
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
			},
			paint: {
				'icon-opacity': ['interpolate', ['linear'], ['zoom'], MAP_MIN_ZOOM, 0.82, 4, 1],
			},
		});
		// Event opportunity markers — same radar layer stack as the owned venue, but
		// fed by the events* sources and centered on the red star icon.
		ensureLayer({
			id: MAPBOX_LAYER_IDS.eventsGlowFill,
			type: 'fill',
			source: MAPBOX_SOURCE_IDS.eventsGlow,
			layout: { 'fill-sort-key': ['get', 'sort'] },
			paint: {
				'fill-color': ['coalesce', ['get', 'color'], '#A8E6FF'],
				'fill-opacity': ['coalesce', ['get', 'opacity'], 0],
				'fill-antialias': true,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.eventsRingLines,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.eventsRings,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': '#FFFFFF',
				'line-opacity': ['coalesce', ['get', 'opacity'], 0],
				'line-width': [
					'interpolate',
					['linear'],
					['zoom'],
					MAP_MIN_ZOOM,
					['*', ['coalesce', ['get', 'width'], 1], 0.72],
					MAP_DEFAULT_ZOOM,
					['coalesce', ['get', 'width'], 1],
					10,
					['*', ['coalesce', ['get', 'width'], 1], 1.1],
				],
				'line-blur': 0.18,
			},
		});
		ensureLayer(
			{
				id: MAPBOX_LAYER_IDS.eventsPulseLine,
				type: 'line',
				source: MAPBOX_SOURCE_IDS.eventsPulse,
				layout: { 'line-join': 'round', 'line-cap': 'round' },
				paint: {
					'line-color': ['coalesce', ['get', 'color'], '#6BD9FF'],
					'line-opacity': ['coalesce', ['get', 'opacity'], 0],
					'line-width': [
						'interpolate',
						['linear'],
						['zoom'],
						MAP_MIN_ZOOM,
						['*', ['coalesce', ['get', 'width'], 1], 0.72],
						MAP_DEFAULT_ZOOM,
						['coalesce', ['get', 'width'], 1],
						10,
						['*', ['coalesce', ['get', 'width'], 1], 1.12],
					],
					'line-blur': 1.05,
				},
			},
			MAPBOX_LAYER_IDS.eventsRingLines
		);
		ensureLayer({
			id: MAPBOX_LAYER_IDS.eventsStarGlow,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.eventsIcon,
			paint: {
				'circle-color': '#6BD9FF',
				// Soft halo a bit larger than the star, on the dots' anchors.
				'circle-radius': [
					'interpolate',
					['linear'],
					['zoom'],
					0,
					13,
					RESULT_DOT_ZOOM_MIN,
					13,
					RESULT_DOT_ZOOM_MAX,
					30,
					24,
					30,
				],
				'circle-opacity': [
					'interpolate',
					['linear'],
					['zoom'],
					MAP_MIN_ZOOM,
					0.12,
					MAP_DEFAULT_ZOOM,
					0.22,
					10,
					0.28,
					14,
					0.24,
				],
				'circle-blur': 0.92,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.eventsStarIcon,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.eventsIcon,
			layout: {
				'icon-image': EVENT_STAR_ICON_IMAGE_NAME,
				'icon-size': eventStarIconSizeExpr,
				'icon-anchor': 'center',
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
			},
			paint: {
				'icon-opacity': ['interpolate', ['linear'], ['zoom'], MAP_MIN_ZOOM, 0.82, 4, 1],
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.selectedMarkerIcons,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersSelected,
			minzoom: CURATED_DOT_FADE_END_ZOOM,
			layout: {
				'icon-image': ['get', 'selectedIcon'],
				'icon-size': selectedMarkerIconSizeExpr,
				'icon-anchor': 'top-left',
				'icon-offset': [
					-SELECTED_CONTACT_MARKER_CENTER_X,
					-SELECTED_CONTACT_MARKER_CENTER_Y,
				],
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
			},
			paint: {
				'icon-opacity': getSelectedMarkerIconOpacityExpr(),
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.selectedMarkerIconsHover,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersSelected,
			minzoom: CURATED_DOT_FADE_END_ZOOM,
			layout: {
				'icon-image': ['coalesce', ['get', 'selectedIconHover'], ['get', 'selectedIcon']],
				'icon-size': selectedMarkerIconSizeExpr,
				'icon-anchor': 'top-left',
				'icon-offset': [
					-SELECTED_CONTACT_MARKER_CENTER_X,
					-SELECTED_CONTACT_MARKER_CENTER_Y,
				],
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
			},
			paint: {
				'icon-opacity': getSelectedMarkerHoverIconOpacityExpr(),
			},
		});

		// Close-zoom campaign replacements need marker-level priority; keep them
		// under selected halos, but above the normal result/event marker stack.
		for (const layerId of [
			MAPBOX_LAYER_IDS.campaignFootprintNodeGlow,
			MAPBOX_LAYER_IDS.campaignFootprintNodeSpark,
		]) {
			try {
				if (mapInstance.getLayer(layerId) && mapInstance.getLayer(MAPBOX_LAYER_IDS.selectedMarkerIcons)) {
					mapInstance.moveLayer(layerId, MAPBOX_LAYER_IDS.selectedMarkerIcons);
				}
			} catch {
				// Ignore style timing races.
			}
		}

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

		// All floor-shifted expressions above were built with the current floor
		// delta, so creation/style-reload bakes it — keep the parity gate in step.
		lastParityAppliedFloorDeltaRef.current = interactiveFloorDeltaRef.current;
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
		const initialEntryCamera =
			initialPresentation === 'interactive' ? interactiveEntryCameraRef.current : null;
		if (initialPresentation === 'interactive') {
			interactiveEntryCameraPendingRef.current = true;
			interactiveEntryCameraAppliedKeyRef.current =
				interactiveEntryCameraKey(initialEntryCamera);
		}
		const initialCenter: [number, number] =
			initialPresentation === 'background'
				? DASHBOARD_DECORATIVE_CENTER
				: initialEntryCamera
					? [initialEntryCamera.center.lng, initialEntryCamera.center.lat]
					: [defaultCenter.lng, defaultCenter.lat];
		const initialZoom =
			initialPresentation === 'background'
				? DASHBOARD_DECORATIVE_ZOOM
				: (initialEntryCamera?.zoom ?? MAP_DEFAULT_ZOOM);
		const initialPitch =
			initialPresentation === 'background' ? DASHBOARD_DECORATIVE_PITCH : 0;

		// Compute the viewport-proportional floor from the (already measurable)
		// container before construction; the map is still null so this only
		// computes + reports.
		syncInteractiveFloor();

		markPerf('murmur:map:construct');
		const mapInstance = new mapboxgl.Map({
			container: mapContainerRef.current,
			style: MAPBOX_STYLE,
			center: initialCenter,
			zoom: initialZoom,
			pitch: initialPitch,
			bearing: 0,
			minZoom: interactiveMinZoomRef.current,
			attributionControl: true,
			dragRotate: false,
			pitchWithRotate: false,
			touchPitch: false,
			// Per-source tile cache. `minTileCacheSize` (the FLOOR) retains
			// recently-displayed low-zoom basemap tiles so a zoom-out renders the center
			// instantly (no re-parse, no ocean-blue flash); held at 64 (~2× the in-view tile
			// count) rather than 128 to halve retained tiles per source — the dominant
			// renderer-memory cost — at the cost of an occasional re-stream when zooming out
			// after a deep zoom-in (the scaled parent tile shows meanwhile).
			// `maxTileCacheSize` is the CEILING: the dynamic per-source target
			// (~(ceil(w/512)+1)*(ceil(h/512)+1)*5) outgrows the floor on normal viewports and
			// was previously capped only at an inert 1024, so on large/ultrawide/4K screens
			// each source retained ~150–270 tiles. MAP_MAX_TILE_CACHE_SIZE caps that growth
			// (a no-op at <=1440p, where the dynamic target stays below it). Memory-constrained
			// devices omit the floor (dynamic ~viewport*5, ~40 on a phone) and take a tight
			// ceiling so panning can't grow the cache.
			minTileCacheSize: LOW_MEMORY_DEVICE ? undefined : 64,
			maxTileCacheSize: LOW_MEMORY_DEVICE ? 64 : MAP_MAX_TILE_CACHE_SIZE,
			refreshExpiredTiles: false,
		});

		mapRef.current = mapInstance;
		setMap(mapInstance);
		// Deterministic camera handle for scripts/measure-dashboard-memory.mjs and
		// scripts/measure-map-fps.mjs (drives fixed camera sequences); also handy
		// for manual debugging.
		(window as unknown as { __murmurMapDebug?: unknown }).__murmurMapDebug = mapInstance;
		try {
			initialZoomConstraintsRef.current = {
				minZoom: mapInstance.getMinZoom(),
				maxZoom: mapInstance.getMaxZoom(),
			};
		} catch {
			// Non-fatal.
		}

		// Soften scroll/pinch zoom for a smoother, more premium feel. Persists
		// across scrollZoom enable/disable cycles since rates live on the handler.
		try {
			mapInstance.scrollZoom.setWheelZoomRate(MAP_WHEEL_ZOOM_RATE);
			mapInstance.scrollZoom.setZoomRate(MAP_PINCH_ZOOM_RATE);
		} catch {
			// Non-fatal — older Mapbox builds may not expose these setters.
		}

		// Boot-stage marks (construct → style-load → land-ready → load) for the
		// measurement scripts; latched so style reload re-fires don't re-mark.
		let styleLoadMarked = false;
		const onStyleLoad = () => {
			if (!styleLoadMarked) {
				styleLoadMarked = true;
				markPerf('murmur:map:style-load');
			}
			applyFreeTrialMapVisualTuning(mapInstance);
			const initialVisualNightT = computeMoodVisualNightT(
				nightTRef.current,
				weatherMoodConfigRef.current
			);
			applyMurmurGlobeLighting(mapInstance, unsubscribeBurnTRef.current);
			applyMapboxFogForMoodAndNight(
				mapInstance,
				weatherMoodConfigRef.current,
				initialVisualNightT,
				unsubscribeBurnTRef.current
			);
			// Add Murmur sources/layers (including clouds + world-land fill) as early as
			// possible so they can begin loading before the first reveal.
			ensureMapboxSourcesAndLayers(mapInstance);
		};

		const onLoad = () => {
			markPerf('murmur:map:load');
			applyFreeTrialMapVisualTuning(mapInstance);
			const initialVisualNightT = computeMoodVisualNightT(
				nightTRef.current,
				weatherMoodConfigRef.current
			);
			applyMurmurGlobeLighting(mapInstance, unsubscribeBurnTRef.current);
			applyMapboxFogForMoodAndNight(
				mapInstance,
				weatherMoodConfigRef.current,
				initialVisualNightT,
				unsubscribeBurnTRef.current
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
			applyMurmurGlobeLighting(mapInstance, unsubscribeBurnTRef.current);
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
			setIsMapFirstPainted(false);
		};
	}, [ensureMapboxSourcesAndLayers, syncInteractiveFloor]);

	// Land-first readiness latch: flip `isMapFirstPainted` once the local
	// world-land fill has painted (style in + cream continents on ocean blue) —
	// typically well before the full `load` event, which also waits on composite
	// tiles, glyphs and the country-boundaries tileset. The dashboard boot splash
	// gates on this signal so street detail streams in behind its fade.
	// `isMapLoaded` is both the warm-return fast path and the backstop for a
	// world-land source-add failure (offline → the poll would never settle).
	useEffect(() => {
		if (!map) return;
		if (isMapFirstPainted) return;
		if (typeof window === 'undefined') return;

		let cancelled = false;
		let rafId: number | null = null;
		let intervalId: number | null = null;

		const latch = () => {
			if (cancelled) return;
			// Replicate the decorative framing applied at `load` before revealing —
			// without it the globe would visibly jump into position when `load`
			// fires after the splash has already dropped. (The `load` copy stays:
			// both are idempotent 0ms eases to the same camera.)
			if (presentationRef.current === 'background') {
				try {
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
			}
			// Double rAF so the frame that drew the land has actually painted.
			rafId = window.requestAnimationFrame(() => {
				rafId = window.requestAnimationFrame(() => {
					if (cancelled) return;
					markPerf('murmur:map:land-ready');
					setIsMapFirstPainted(true);
				});
			});
		};

		if (isMapLoaded) {
			latch();
		} else {
			const poll = () => {
				if (cancelled) return;
				try {
					if (
						map.getSource(MAP_WORLD_LAND_LOCAL_SOURCE_ID) &&
						map.isSourceLoaded(MAP_WORLD_LAND_LOCAL_SOURCE_ID)
					) {
						if (intervalId != null) {
							window.clearInterval(intervalId);
							intervalId = null;
						}
						latch();
					}
				} catch {
					// Source not queryable yet — keep polling; `load` is the backstop.
				}
			};
			intervalId = window.setInterval(poll, 100);
			poll();
		}

		return () => {
			cancelled = true;
			if (intervalId != null) window.clearInterval(intervalId);
			if (rafId != null) window.cancelAnimationFrame(rafId);
		};
	}, [map, isMapLoaded, isMapFirstPainted]);

	const prevPresentationRef = useRef<'background' | 'interactive'>(presentation);

	const cinematicAutoFitRef = useRef(false);

	const cinematicInFlightRef = useRef(false);
	const cinematicInFlightTimerRef = useRef<NodeJS.Timeout | null>(null);

	const backgroundCinematicMoveEndHandlerRef = useRef<(() => void) | null>(null);

	// Keep the interactive zoom floor in sync with the device class and viewport
	// size. Skip-while-locked semantics live inside syncInteractiveFloor.
	useEffect(() => {
		syncInteractiveFloor();
	}, [map, isMobile, syncInteractiveFloor]);

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
				map.keyboard.enable();
			} catch {}
			try {
				map.touchZoomRotate.enable();
				map.touchZoomRotate.disableRotation();
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
				// Cap per-tick elapsed time: background tabs suspend the ease, and an
				// uncapped dt on tab return would visibly snap the globe forward.
				const maxTickDtMs = 2000;

				const normalizeLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;

				const baseLng = DASHBOARD_DECORATIVE_CENTER[0];
				const maxDriftDeg = 35; // keep camera within a US-visible band
				let direction: 1 | -1 = 1;
				let currentLng = normalizeLng(map.getCenter()?.lng ?? baseLng);
				// Seed one full step back so the kick-off tick advances a full increment.
				let lastTickMs = performance.now() - animationDurationMs;

				const spinGlobe = () => {
					try {
						// Advance by wall-clock elapsed time, not per event: map.resize()
						// (e.g. while the window is being drag-resized) fires extra moveend
						// events, and a fixed per-tick step would speed up the spin.
						const now = performance.now();
						const dtMs = Math.min(now - lastTickMs, maxTickDtMs);
						lastTickMs = now;
						currentLng = normalizeLng(
							currentLng + direction * distancePerSecond * (dtMs / 1000)
						);
						const drift = normalizeLng(currentLng - baseLng);
						if (drift > maxDriftDeg) {
							currentLng = normalizeLng(baseLng + maxDriftDeg);
							direction = -1;
						} else if (drift < -maxDriftDeg) {
							currentLng = normalizeLng(baseLng - maxDriftDeg);
							direction = 1;
						}

						// Publish the new target longitude so the strategy-card decorative
						// globe can ease alongside us in lock-step.
						setDashboardGlobeSpinLng(currentLng);

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
					// Pick up any viewport change whose resize was skipped mid-sweep.
					syncInteractiveFloor();
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
		// Restore interactive zoom constraints. If we're coming from the decorative globe (zoom < the
		// interactive floor), temporarily allow that starting zoom so the camera move begins exactly
		// from the dashboard view.
		try {
			const currentZoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
			const interactiveMinZoom = interactiveMinZoomRef.current;
			const safeMinZoom = Math.min(interactiveMinZoom, currentZoom);
			map.setMinZoom(safeMinZoom);
			map.setMaxZoom(DEFAULT_MAX_ZOOM_FALLBACK);
			if (safeMinZoom < interactiveMinZoom) {
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
			// framing on the dashboard. With a host-provided entry camera (e.g. the venue
			// portal centering on the venue home icon), snap straight there so the reveal
			// is already framed correctly — no zoom-in sweep. Otherwise start gliding
			// toward a neutral interactive camera, then let the search/state auto-fit
			// interrupt and continue from the current camera position once data is ready.
			// This avoids the old instant reset.
			const entryCamera = interactiveEntryCameraRef.current;
			interactiveEntryCameraPendingRef.current = true;
			interactiveEntryCameraAppliedKeyRef.current =
				interactiveEntryCameraKey(entryCamera);
			try {
				let center: [number, number] = DASHBOARD_DECORATIVE_CENTER;
				let zoom = MAP_DEFAULT_ZOOM;
				if (entryCamera) {
					center = [entryCamera.center.lng, entryCamera.center.lat];
					zoom = entryCamera.zoom;
				} else {
					const container = map.getContainer?.() as HTMLElement | undefined;
					const w = container?.clientWidth ?? 0;
					const h = container?.clientHeight ?? 0;
					if (w > 0 && h > 0) {
						const target = map.unproject([
							w / 2 + DASHBOARD_DECORATIVE_OFFSET_PX[0],
							h / 2 + DASHBOARD_DECORATIVE_OFFSET_PX[1],
						]);
						center = [target.lng, target.lat];
					}
				}
				map.easeTo({
					center,
					zoom,
					pitch: 0,
					bearing: 0,
					offset: [0, 0],
					duration: entryCamera ? 0 : DASHBOARD_TO_INTERACTIVE_HANDOFF_GLIDE_MS,
					easing: mapboxEaseOutCubic,
				});
			} catch {}
		}
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		shouldAutoSpin,
		presentation,
		syncInteractiveFloor,
	]);

	// The interactive entry camera can resolve — or be corrected — after the reveal
	// has already happened (e.g. the venue save's refetch is still in flight while
	// the portal flips views, so the flip render briefly carries stale coordinates).
	// While the user hasn't moved the camera since entry, follow the latest value —
	// same snap semantics as the entry itself.
	const interactiveEntryCameraLat = interactiveEntryCamera?.center.lat;
	const interactiveEntryCameraLng = interactiveEntryCamera?.center.lng;
	const interactiveEntryCameraZoom = interactiveEntryCamera?.zoom;
	useEffect(() => {
		if (!map || !isMapLoaded || isBackgroundPresentation) return;
		if (!interactiveEntryCameraPendingRef.current) return;
		if (
			interactiveEntryCameraLat == null ||
			interactiveEntryCameraLng == null ||
			interactiveEntryCameraZoom == null
		) {
			return;
		}
		const key = `${interactiveEntryCameraLat},${interactiveEntryCameraLng},${interactiveEntryCameraZoom}`;
		if (key === interactiveEntryCameraAppliedKeyRef.current) return;
		interactiveEntryCameraAppliedKeyRef.current = key;
		try {
			map.easeTo({
				center: [interactiveEntryCameraLng, interactiveEntryCameraLat],
				zoom: interactiveEntryCameraZoom,
				pitch: 0,
				bearing: 0,
				offset: [0, 0],
				duration: 0,
			});
		} catch {
			// Ignore (map may be tearing down).
		}
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		interactiveEntryCameraLat,
		interactiveEntryCameraLng,
		interactiveEntryCameraZoom,
	]);

	// Once the user moves the camera themselves, stop following the entry camera —
	// never yank the map out from under them. User-driven moves carry
	// `originalEvent`; programmatic eases do not. Two mapbox-gl quirks: window
	// resize/orientation/fullscreen changes are forwarded through Map#resize with
	// `originalEvent` set (not user camera intent — ignore those), and box zoom
	// fires `movestart` without `originalEvent` (caught via `boxzoomstart`).
	useEffect(() => {
		if (!map || !isMapLoaded || isBackgroundPresentation) return;
		const onUserMoveStart = (event: { originalEvent?: { type?: string } }) => {
			const originalEvent = event?.originalEvent;
			if (!originalEvent) return;
			if (
				originalEvent.type === 'resize' ||
				originalEvent.type === 'orientationchange' ||
				originalEvent.type === 'fullscreenchange' ||
				originalEvent.type === 'webkitfullscreenchange'
			) {
				return;
			}
			interactiveEntryCameraPendingRef.current = false;
		};
		const onBoxZoomStart = () => {
			interactiveEntryCameraPendingRef.current = false;
		};
		map.on('movestart', onUserMoveStart);
		map.on('boxzoomstart', onBoxZoomStart);
		return () => {
			map.off('movestart', onUserMoveStart);
			map.off('boxzoomstart', onBoxZoomStart);
		};
	}, [map, isMapLoaded, isBackgroundPresentation]);

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
			// (The cinematic-end timeout re-syncs the floor for resizes skipped here.)
			if (cinematicInFlightRef.current) return;
			try {
				map.resize();
			} catch {
				/* map may be tearing down */
			}
			// Viewport size feeds the interactive zoom floor; re-sync after the canvas
			// picks up the new container dimensions.
			syncInteractiveFloor();
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

		// Mobile browsers change the layout viewport when the URL bar / keyboard
		// shows or hides; mapbox-gl only listens to window resize, and the container
		// observer can miss these transitions — track the visual viewport directly so
		// the canvas never ends up shorter than its container (black band).
		window.addEventListener('resize', scheduleResize, { passive: true });
		window.visualViewport?.addEventListener('resize', scheduleResize);
		window.addEventListener('orientationchange', scheduleResize);
		window.addEventListener(
			'murmur:campaign-zoom-changed',
			scheduleResize as EventListener
		);
		document.addEventListener('fullscreenchange', scheduleResize);
		document.addEventListener('webkitfullscreenchange', scheduleResize as EventListener);

		// Burst of retries to catch portal/fixed layout settling.
		const timers: ReturnType<typeof setTimeout>[] = [];
		for (const ms of [0, 50, 150, 300, 600]) {
			timers.push(setTimeout(safeResize, ms));
		}

		return () => {
			ro.disconnect();
			window.removeEventListener('resize', scheduleResize);
			window.visualViewport?.removeEventListener('resize', scheduleResize);
			window.removeEventListener('orientationchange', scheduleResize);
			window.removeEventListener(
				'murmur:campaign-zoom-changed',
				scheduleResize as EventListener
			);
			document.removeEventListener('fullscreenchange', scheduleResize);
			document.removeEventListener(
				'webkitfullscreenchange',
				scheduleResize as EventListener
			);
			for (const t of timers) clearTimeout(t);
			if (resizeDebounce) clearTimeout(resizeDebounce);
		};
	}, [map, syncInteractiveFloor]);

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

	const isAllContactsOverlayContactOnLand = useCallback(
		(contact: ContactWithName, coords: LatLngLiteral): boolean => {
			// Don't block first paint on the state-prepared polygon payload. Contacts with
			// valid coordinates are overwhelmingly land-based; once polygons are ready we
			// cache the exact check per contact id.
			if (!isStateLayerReady) return true;
			const cached = allContactsOverlayLandMaskByIdRef.current.get(contact.id);
			if (cached != null) return cached;
			const isOnLand = isCoordsInAnyUsState(coords);
			allContactsOverlayLandMaskByIdRef.current.set(contact.id, isOnLand);
			return isOnLand;
		},
		[isCoordsInAnyUsState, isStateLayerReady]
	);

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

	const { campaignFootprintContactsWithCoords, campaignFootprintCoordsByContactId } =
		useMemo(() => {
			const coordsByContactId = new Map<number, LatLngLiteral>();
			const contactsWithCoords: ContactWithName[] = [];
			const groups = new Map<string, number[]>();
			const seenContactIds = new Set<number>();

			for (const contact of campaignFootprintContacts) {
				if (seenContactIds.has(contact.id)) continue;
				seenContactIds.add(contact.id);
				const coords = getLatLngFromContact(contact);
				if (!coords) continue;
				coordsByContactId.set(contact.id, coords);
				contactsWithCoords.push(contact);
				const key = coordinateKey(coords);
				const existing = groups.get(key);
				if (existing) existing.push(contact.id);
				else groups.set(key, [contact.id]);
			}

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

			return {
				campaignFootprintContactsWithCoords: contactsWithCoords,
				campaignFootprintCoordsByContactId: coordsByContactId,
			};
		}, [campaignFootprintContacts]);
	const campaignFootprintContactIdSet = useMemo(
		() => new Set(campaignFootprintContactsWithCoords.map((contact) => contact.id)),
		[campaignFootprintContactsWithCoords]
	);

	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const pointSource = map.getSource(MAPBOX_SOURCE_IDS.campaignFootprintPoints) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const lineSource = map.getSource(MAPBOX_SOURCE_IDS.campaignFootprintLines) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const nodeSource = map.getSource(MAPBOX_SOURCE_IDS.campaignFootprintNodes) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!pointSource || !lineSource || !nodeSource) return;

		const clearFootprint = () => {
			const empty = emptyFeatureCollection();
			pointSource.setData(empty);
			lineSource.setData(empty);
			nodeSource.setData(empty);
		};

		// Hide the footprint whenever a search is engaged (typed query or a curated
		// "For You" search) so it never clutters the live result dots/lines. It only
		// shows in the disengaged/browse state.
		if (
			isBackgroundPresentation ||
			searchEngaged ||
			campaignFootprintContactsWithCoords.length === 0
		) {
			clearFootprint();
			return;
		}

		const pointFeatures: GeoJSON.Feature[] = [];
		for (const contact of campaignFootprintContactsWithCoords) {
			const coords = campaignFootprintCoordsByContactId.get(contact.id);
			if (!coords) continue;
			pointFeatures.push({
				type: 'Feature',
				id: contact.id,
				properties: { contactId: contact.id },
				geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
			});
		}

		let contactsForConstellation = campaignFootprintContactsWithCoords.slice();
		if (contactsForConstellation.length > CAMPAIGN_FOOTPRINT_MAX_POINTS) {
			contactsForConstellation = contactsForConstellation
				.map((contact) => ({
					contact,
					score: hashStringToUint32(`campaign-footprint|${contact.id}`),
				}))
				.sort((a, b) => a.score - b.score)
				.slice(0, CAMPAIGN_FOOTPRINT_MAX_POINTS)
				.map(({ contact }) => contact);
		}
		contactsForConstellation.sort((a, b) => a.id - b.id);

		const constellationWorldSize = 512 * Math.pow(2, MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM);
		const constellationPoints: MarkerConstellationPoint[] = [];
		for (const contact of contactsForConstellation) {
			const coords = campaignFootprintCoordsByContactId.get(contact.id);
			if (!coords) continue;
			const projected = latLngToWorldPixel(coords, constellationWorldSize);
			if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) continue;
			constellationPoints.push({
				id: contact.id,
				coords,
				x: projected.x,
				y: projected.y,
				groupKey: 'campaign-footprint',
			});
		}

		const formation =
			constellationPoints.length >= 2
				? buildBeautyMarkerConstellationFormation(
						constellationPoints,
						'campaign-footprint',
						MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM
					)
				: { edges: [], nodes: [], lowZoomNodeIds: new Set<number>() };

		const lineFeatures: GeoJSON.Feature[] = [];
		for (const edge of formation.edges) {
			const fromCoords = campaignFootprintCoordsByContactId.get(edge.fromId);
			const toCoords = campaignFootprintCoordsByContactId.get(edge.toId);
			if (!fromCoords || !toCoords) continue;
			const edgeId = markerConstellationPairKey(edge.fromId, edge.toId);
			const lineOpacity = Math.max(0.36, (1 - edge.rank * 0.34) * edge.opacityScale);
			lineFeatures.push({
				type: 'Feature',
				id: `campaign-footprint:${edge.level}:${edgeId}`,
				properties: { level: edge.level, lineOpacity },
				geometry: {
					type: 'LineString',
					coordinates: [
						[fromCoords.lng, fromCoords.lat],
						[toCoords.lng, toCoords.lat],
					],
				},
			});
		}

		const nodeFeatureById = new Map<number, GeoJSON.Feature>();
		for (const node of formation.nodes) {
			const coords = campaignFootprintCoordsByContactId.get(node.id);
			if (!coords) continue;
			const nodeOpacity = Math.max(0.46, (1 - node.rank * 0.26) * node.opacityScale);
			nodeFeatureById.set(node.id, {
				type: 'Feature',
				id: `campaign-footprint:${node.level}:${node.id}`,
				properties: {
					level: node.level,
					nodeOpacity,
					closeNodeGlowOpacity: 0.9,
					closeSparkOpacity: 1,
					sparkRotation: hashStringToUint32(`campaign-footprint-spark|${node.id}`) % 90,
				},
				geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
			});
		}
		for (const contact of campaignFootprintContactsWithCoords) {
			if (nodeFeatureById.has(contact.id)) continue;
			const coords = campaignFootprintCoordsByContactId.get(contact.id);
			if (!coords) continue;
			nodeFeatureById.set(contact.id, {
				type: 'Feature',
				id: `campaign-footprint:contact:${contact.id}`,
				properties: {
					level: 'detail',
					nodeOpacity: 0.46,
					closeNodeGlowOpacity: 0.9,
					closeSparkOpacity: 1,
					sparkRotation: hashStringToUint32(`campaign-footprint-spark|${contact.id}`) % 90,
				},
				geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
			});
		}
		const nodeFeatures = Array.from(nodeFeatureById.values());

		pointSource.setData({ type: 'FeatureCollection', features: pointFeatures });
		lineSource.setData({ type: 'FeatureCollection', features: lineFeatures });
		nodeSource.setData({ type: 'FeatureCollection', features: nodeFeatures });
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		searchEngaged,
		campaignFootprintContactsWithCoords,
		campaignFootprintCoordsByContactId,
	]);

	// --- Campaign selection heatmap glow -------------------------------------
	// The heatmap envelops the currently-selected contacts (intersected with the
	// tab's on-map set so off-tab/coordless ids are dropped). Ambient tab views
	// glow the whole visible set when nothing is selected.
	const heatmapContactIds = useMemo<number[]>(() => {
		if (
			campaignMarkerMode !== 'status' ||
			(!campaignHeatmapColor && !campaignHeatmapStatusColors)
		) {
			return [];
		}
		const onMapIds = contactsWithCoords.map((c) => c.id);
		if (selectedContacts.length === 0) return campaignHeatmapAmbient ? onMapIds : [];
		const onMap = new Set(onMapIds);
		return selectedContacts.filter((id) => onMap.has(id));
	}, [
		campaignMarkerMode,
		campaignHeatmapColor,
		campaignHeatmapStatusColors,
		campaignHeatmapAmbient,
		contactsWithCoords,
		selectedContacts,
	]);

	const campaignHeatmapFadeRafRef = useRef<number | null>(null);
	// Last rendered glowFade per contact id — the start of the next crossfade.
	const campaignHeatmapFadeByIdRef = useRef<Map<number, number>>(new Map());

	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.campaignHeatmap) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;

		const cancelFade = () => {
			if (campaignHeatmapFadeRafRef.current != null) {
				cancelAnimationFrame(campaignHeatmapFadeRafRef.current);
				campaignHeatmapFadeRafRef.current = null;
			}
		};

		// Off unless in status mode with a tint supplied.
		if (
			campaignMarkerMode !== 'status' ||
			(!campaignHeatmapColor && !campaignHeatmapStatusColors)
		) {
			cancelFade();
			campaignHeatmapFadeByIdRef.current.clear();
			source.setData(emptyFeatureCollection());
			return;
		}

		// The source carries the full tab set so members can crossfade in and out:
		// each contact's target glowFade is 1 when it's in the heatmap set and 0
		// otherwise. Animate from the last rendered value toward the target, then
		// go idle (the GPU re-projects the static layer on pan/zoom for free).
		const targetSet = new Set(heatmapContactIds);
		const coordsById = new Map<number, LatLngLiteral>();
		for (const contact of contactsWithCoords) {
			const coords = getContactCoords(contact);
			if (coords) coordsById.set(contact.id, coords);
		}

		const startById = campaignHeatmapFadeByIdRef.current;
		const needsAnim = Array.from(coordsById.keys()).some((id) => {
			const start = startById.get(id) ?? 0;
			const target = targetSet.has(id) ? 1 : 0;
			return Math.abs(start - target) > 0.001;
		});

		const writeFrame = (eased: number) => {
			const nextById = new Map<number, number>();
			const features: GeoJSON.Feature[] = [];
			coordsById.forEach((coords, id) => {
				const start = startById.get(id) ?? 0;
				const target = targetSet.has(id) ? 1 : 0;
				const fade = eased >= 1 ? target : start + (target - start) * eased;
				nextById.set(id, fade);
				if (fade <= 0.001) return; // fully faded out — omit (opacity 0)
				features.push({
					type: 'Feature' as const,
					id,
					properties: {
						glowColor:
							campaignHeatmapStatusColors?.[getCampaignStatusForContact(id)] ??
							campaignHeatmapColor ??
							'#FFA5A5',
						glowFade: fade,
					},
					geometry: { type: 'Point' as const, coordinates: [coords.lng, coords.lat] },
				});
			});
			campaignHeatmapFadeByIdRef.current = nextById;
			source.setData({ type: 'FeatureCollection' as const, features });
		};

		cancelFade();

		if (!needsAnim) {
			writeFrame(1);
			return;
		}

		const startMs = performance.now();
		writeFrame(0);
		const tick = () => {
			const progress = Math.min(
				1,
				(performance.now() - startMs) / CAMPAIGN_HEATMAP_FADE_MS
			);
			writeFrame(smoothstep(0, 1, progress));
			if (progress < 1) {
				campaignHeatmapFadeRafRef.current = requestAnimationFrame(tick);
				return;
			}
			campaignHeatmapFadeRafRef.current = null;
		};
		campaignHeatmapFadeRafRef.current = requestAnimationFrame(tick);

		return cancelFade;
	}, [
		map,
		isMapLoaded,
		campaignMarkerMode,
		campaignHeatmapColor,
		campaignHeatmapStatusColors,
		heatmapContactIds,
		contactsWithCoords,
		coordsByContactId,
		getContactCoords,
		getCampaignStatusForContact,
	]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;

		// Curated blob UI is reserved for active search mode.
		// Campaign pages can still color markers via `contact.curatedCategory`, but should not
		// render the search-only blob geometry.
		const searchKey = (searchQuery ?? '').trim();
		if (!searchKey) {
			clearCuratedBlobOutline();
			return;
		}

		if (isLoading || !searchEngaged) {
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
			.map((dot) => `${dot.id}:${dot.coords.lng.toFixed(5)}:${dot.coords.lat.toFixed(5)}`)
			.join('|');
		const radiusOverlaySig = radiusOverlayRef.current
			? `r:${radiusOverlayRef.current.center.lat.toFixed(5)}:${radiusOverlayRef.current.center.lng.toFixed(5)}:${radiusOverlayRef.current.radiusMiles}`
			: 'r:none';
		const nextSignature = `v12:${CURATED_BLOB_MIN_REGION_POINTS}:${CURATED_BLOB_MAX_REGIONS}:${CURATED_BLOB_MAX_REGION_SPAN_KM}:${CURATED_BLOB_SHAPE_STEPS}:${CURATED_BLOB_OUTLINE_SMOOTHING_PASSES}:${CURATED_BLOB_LOBE_MIN_COUNT}:${CURATED_BLOB_LOBE_MAX_COUNT}:${CURATED_BLOB_LOBE_PADDING_KM}:${CURATED_BLOB_LOBE_MIN_RADIUS_KM}:${CURATED_BLOB_LOBE_MAX_RADIUS_KM}:${CURATED_BLOB_LOBE_OVERLAP_RADIUS_RATIO}:${CURATED_BLOB_LOBE_RADIUS_JITTER}:${CURATED_BLOB_SINGLETON_LOBE_RADIUS_KM}:${CURATED_BLOB_SINGLETON_LOBE_OFFSET_KM}:${CURATED_ORB_SMALL_SHAPE_MIN_RADIUS_KM}:${CURATED_ORB_SMALL_SHAPE_THRESHOLD_KM}:${CURATED_BLOB_ORGANIC_WOBBLE}:${radiusOverlaySig}:${signature}`;
		if (nextSignature === curatedBlobSignatureRef.current) return;

		let cancelled = false;

		const updateCuratedBlob = async () => {
			const radiusOv = radiusOverlayRef.current;
			const protectedMarkerIds = new Set<number>();
			let lobeMultiPolygons: ClippingMultiPolygon[];

			if (radiusOv) {
				// Radius mode: one circular blob at the radius center, sized to the
				// committed search radius. Reuses the same blob/orb visuals as a single circle.
				const circle = buildMercatorCircleMultiPolygon(
					radiusOv.center,
					radiusOv.radiusMiles * 1.609344,
					CURATED_BLOB_SHAPE_STEPS,
					0,
					0
				);
				if (!circle) {
					if (!cancelled) clearCuratedBlobOutline();
					return;
				}
				lobeMultiPolygons = [circle];
				for (const dot of curatedDots) protectedMarkerIds.add(dot.id);
			} else {
				const mercatorPoints = curatedDots
					.map((dot) => projectCuratedBlobPoint(dot.id, dot.coords))
					.filter((point): point is CuratedBlobMercatorPoint => point != null);

				if (mercatorPoints.length === 0) {
					if (!cancelled) clearCuratedBlobOutline();
					return;
				}

				const clusters = pickAdaptiveCuratedBlobClusters(mercatorPoints);
				for (const cluster of clusters) {
					for (const point of cluster.points) {
						protectedMarkerIds.add(point.id);
					}
				}
				lobeMultiPolygons = clusters.flatMap((cluster, index) =>
					buildCuratedBlobClusterLobeMultiPolygons(cluster, index)
				);
			}

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
					unionedMercatorMultiPolygon = unionClippingMultiPolygons(...lobeMultiPolygons);
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
			const morphSources = createCuratedBlobMorphSourcesFromMercatorMultiPolygon(
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
		searchQuery,
		isLoading,
		searchEngaged,
		contactsWithCoords,
		radiusOverlay,
		getContactCoords,
		clearCuratedBlobOutline,
		updateCuratedBlobProtectedMarkerIds,
	]);

	// Radius-search center pin. Appears alongside the single-circle blob (i.e. only
	// once a radius search has results), reusing the shared profile-area location
	// marker SVG — a touch smaller, scaled with zoom. Draggable: dropping it
	// recenters the radius and re-runs the search.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const showPin = !!radiusOverlay && searchEngaged && contactsWithCoords.length > 0;
		if (!showPin) {
			if (radiusMarkerZoomHandlerRef.current) {
				map.off('zoom', radiusMarkerZoomHandlerRef.current);
				radiusMarkerZoomHandlerRef.current = null;
			}
			radiusMarkerRef.current?.remove();
			radiusMarkerRef.current = null;
			return;
		}
		const { center } = radiusOverlay;
		if (!radiusMarkerRef.current) {
			const el = document.createElement('div');
			el.dataset.radiusCenterMarker = 'true';
			el.style.cursor = 'grab';
			el.style.width = '22px';
			el.style.height = '27px';
			const inner = document.createElement('div');
			inner.style.width = '100%';
			inner.style.height = '100%';
			inner.style.transformOrigin = 'bottom center';
			inner.innerHTML = profileAreaMarkerSvg;
			el.appendChild(inner);

			const applyRadiusPinZoomScale = () => {
				const scale = clamp(0.55 + (map.getZoom() - 5) * 0.075, 0.6, 1.15);
				inner.style.transform = `scale(${scale})`;
			};
			applyRadiusPinZoomScale();
			map.on('zoom', applyRadiusPinZoomScale);
			radiusMarkerZoomHandlerRef.current = applyRadiusPinZoomScale;

			const marker = new mapboxgl.Marker({
				element: el,
				anchor: 'bottom',
				draggable: true,
			})
				.setLngLat([center.lng, center.lat])
				.addTo(map);
			marker.on('dragstart', () => {
				isDraggingRadiusRef.current = true;
				radiusDragSuppressEmptyMapUntilRef.current = Number.POSITIVE_INFINITY;
				clearEmptyMapPrompt();
				el.style.cursor = 'grabbing';
			});
			marker.on('dragend', () => {
				isDraggingRadiusRef.current = false;
				radiusDragSuppressEmptyMapUntilRef.current = Date.now() + 300;
				el.style.cursor = 'grab';
				const ll = marker.getLngLat();
				onRadiusCenterChangeRef.current?.({ lat: ll.lat, lng: ll.lng });
			});
			radiusMarkerRef.current = marker;
		} else if (!isDraggingRadiusRef.current) {
			radiusMarkerRef.current.setLngLat([center.lng, center.lat]);
		}
	}, [
		map,
		isMapLoaded,
		radiusOverlay,
		searchEngaged,
		contactsWithCoords,
		clearEmptyMapPrompt,
	]);

	const completeAreaSelection = useCallback(
		(end: { lat: number; lng: number }, endClient: { x: number; y: number } | null) => {
			if (!isAreaSelecting) return;
			const start = selectionStartLatLngRef.current;
			if (!start) {
				clearSelectionRect();
				return;
			}

			// Ignore tiny "click" selections (treat as cancel).
			const startClient = selectionStartClientRef.current;
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

	const handleMapMouseUp = useCallback(
		(e: mapboxgl.MapMouseEvent) => {
			completeAreaSelection(
				{ lat: e.lngLat.lat, lng: e.lngLat.lng },
				getClientPointFromDomEvent(e.originalEvent)
			);
		},
		[completeAreaSelection]
	);

	const handleMapTouchEnd = useCallback(
		(e: mapboxgl.MapTouchEvent) => {
			if (!isAreaSelecting) return;
			// `touches` is empty on touchend — the lifted finger lives in `changedTouches`.
			const changed = e.originalEvent.changedTouches;
			const endClient =
				changed && changed.length > 0
					? { x: changed[0].clientX, y: changed[0].clientY }
					: getClientPointFromDomEvent(e.originalEvent);
			completeAreaSelection({ lat: e.lngLat.lat, lng: e.lngLat.lng }, endClient);
		},
		[isAreaSelecting, completeAreaSelection]
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

			// Identity salt for per-contact hashing — invariant under zoom/pan so the
			// non-priority dot fill doesn't reshuffle across zoom thresholds. Resets on a
			// new result set / locked-state change, which also clears the carry-over set
			// (see below) so a new search doesn't inherit the prior set's visible dots.
			const sampleSalt = `${(searchQuery ?? '').trim()}|${lockedStateKey ?? ''}|${baseContactIdSet.size}`;
			if (sampleSalt !== dotSampleSaltRef.current) {
				dotSampleSaltRef.current = sampleSalt;
				visibleContactIdSetRef.current = new Set();
			}

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
					key: hashStringToUint32(`${sampleSalt}|${contact.id}`),
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

			// Monotonic stability across zoom: never drop a base dot that was already
			// visible and is still within the padded viewport. The non-overlap picker
			// culls priority dots that collide at lower zoom (minSeparationPx grows as
			// you zoom out), which reads as dots "going away." Re-add those survivors so
			// the visible set only grows while panning/zooming within the same result
			// set. Stale dots fall out naturally: a new search clears
			// `visibleContactIdSetRef` (salt reset above) and contacts that leave the
			// padded bbox aren't in `inBounds`.
			const pickedIdSet = new Set<number>(picked.map((c) => c.id));
			const carryOver: ContactWithName[] = [];
			for (const contact of inBounds) {
				if (pickedIdSet.has(contact.id)) continue;
				if (visibleContactIdSetRef.current.has(contact.id)) carryOver.push(contact);
			}

			let nextVisibleContacts: ContactWithName[];
			if (carryOver.length === 0) {
				nextVisibleContacts = picked;
			} else if (picked.length + carryOver.length <= maxPrimaryDots) {
				nextVisibleContacts = [...picked, ...carryOver];
			} else {
				// Over budget: keep selected/hovered first, then picked, then as many
				// carry-overs (stable by id) as fit, so the cap never evicts a selected dot.
				const keep: ContactWithName[] = [];
				const keepIds = new Set<number>();
				const pushKeep = (contact: ContactWithName) => {
					if (keepIds.has(contact.id)) return;
					keepIds.add(contact.id);
					keep.push(contact);
				};
				for (const contact of picked) {
					if (
						selectedSet.has(contact.id) ||
						(hoveredId != null && contact.id === hoveredId)
					)
						pushKeep(contact);
				}
				for (const contact of picked) {
					if (keep.length >= maxPrimaryDots) break;
					pushKeep(contact);
				}
				const sortedCarry = carryOver.slice().sort((a, b) => a.id - b.id);
				for (const contact of sortedCarry) {
					if (keep.length >= maxPrimaryDots) break;
					pushKeep(contact);
				}
				nextVisibleContacts = keep;
			}

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
							key: hashStringToUint32(`${sampleSalt}|bookingExtra|${contact.id}`),
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

			// All-contact overlay:
			// - active-search mode: close-zoom gray/context dots
			// - disengaged ambient mode: regional contact atlas, sampled to ~500 visible dots
			const isAmbientAllContactsOverlay =
				isAmbientContactsEnabled &&
				zoomRaw >=
					AMBIENT_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM + interactiveFloorDeltaRef.current;
			const isSearchAllContactsOverlay =
				isAnySearch && zoomRaw >= ALL_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM;
			const shouldShowAllContactsOverlay =
				(isAmbientAllContactsOverlay || isSearchAllContactsOverlay) &&
				allContactsOverlayContactsWithCoords.length > 0;
			let nextAllContactsOverlayVisible: ContactWithName[] = [];
			if (shouldShowAllContactsOverlay) {
				const excludeIdSet = new Set<number>(baseContactIdSet);
				for (const c of nextBookingExtraVisible) excludeIdSet.add(c.id);
				for (const c of nextPromotionOverlayVisible) excludeIdSet.add(c.id);

				const visibleViewportBbox: BoundingBox = {
					minLat: south,
					maxLat: north,
					minLng: west,
					maxLng: east,
				};

				const isAllContactsOverlayContactAllowed = (contact: ContactWithName): boolean => {
					const categoryIndex = getAmbientContactCategoryIndexFromTitle(contact.title);
					if (categoryIndex < 0) return ambientUncategorizedActive;
					return ambientActiveCategories?.[categoryIndex] !== false;
				};

				const visibleInBounds: ContactWithName[] = [];
				const bufferInBounds: ContactWithName[] = [];
				for (const contact of allContactsOverlayContactsWithCoords) {
					if (excludeIdSet.has(contact.id)) continue;
					if (!isAllContactsOverlayContactAllowed(contact)) continue;
					const coords = getAllContactsOverlayContactCoords(contact);
					if (!coords) continue;
					if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;
					// Never render gray dots in water once state polygons are ready. Cached per id.
					if (!isAllContactsOverlayContactOnLand(contact, coords)) continue;
					if (isLatLngInBbox(coords.lat, coords.lng, visibleViewportBbox)) {
						visibleInBounds.push(contact);
					} else {
						bufferInBounds.push(contact);
					}
				}

				if (isAmbientAllContactsOverlay) {
					const ambientT = smoothstep(
						0,
						1,
						clamp(
							(zoomRaw -
								interactiveFloorDeltaRef.current -
								AMBIENT_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM) /
								(AMBIENT_CONTACTS_OVERLAY_MARKERS_FULL_ZOOM -
									AMBIENT_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM),
							0,
							1
						)
					);
					const visibleTarget = Math.max(
						AMBIENT_CONTACTS_OVERLAY_MIN_DOTS,
						Math.round(AMBIENT_CONTACTS_OVERLAY_TARGET_DOTS * ambientT)
					);
					const bufferTarget = Math.min(
						AMBIENT_CONTACTS_OVERLAY_BUFFER_DOTS,
						Math.round(visibleTarget * 0.85)
					);
					const ambientMinSeparationPx = Math.max(
						7,
						2 * (markerScale * 0.78) + dotStrokeWeight + 1
					);
					const ambientMinSeparationSq = ambientMinSeparationPx * ambientMinSeparationPx;

					const pickAmbientContacts = (
						candidatesSource: ContactWithName[],
						bbox: BoundingBox,
						slots: number,
						seedSuffix: string
					): ContactWithName[] => {
						if (slots <= 0 || candidatesSource.length === 0) return [];
						const priorityIdSet = new Set<number>(selectedSet);
						if (hoveredId != null) priorityIdSet.add(hoveredId);
						for (const id of allContactsOverlayVisibleIdSetRef.current) {
							priorityIdSet.add(id);
						}

						const priorityCandidates = candidatesSource.filter((contact) =>
							priorityIdSet.has(contact.id)
						);
						const otherCandidates = candidatesSource.filter(
							(contact) => !priorityIdSet.has(contact.id)
						);
						const poolSlots = slots * 4;
						let pool: ContactWithName[];
						if (candidatesSource.length <= poolSlots) {
							pool = candidatesSource;
						} else {
							const remainingSlots = Math.max(0, poolSlots - priorityCandidates.length);
							const sampledOther = stableViewportSampleContacts(
								otherCandidates,
								getAllContactsOverlayContactCoords,
								bbox,
								remainingSlots,
								`${seed}|ambient:${seedSuffix}:pool`
							);
							pool = [...priorityCandidates, ...sampledOther];
						}

						type AmbientCandidate = {
							contact: ContactWithName;
							x: number;
							y: number;
							isPriority: boolean;
							key: number;
						};
						const candidateContacts: ContactWithName[] = [];
						const candidateCoords: LatLngLiteral[] = [];
						for (const contact of pool) {
							const coords = getAllContactsOverlayContactCoords(contact);
							if (!coords) continue;
							candidateContacts.push(contact);
							candidateCoords.push(coords);
						}
						const projectedCandidates = batchLatLngToWorldPixels(
							candidateCoords,
							worldSize
						);
						const candidates: AmbientCandidate[] = [];
						for (let i = 0; i < candidateContacts.length; i++) {
							const contact = candidateContacts[i];
							const projected = projectedCandidates[i];
							if (!projected) continue;
							candidates.push({
								contact,
								x: projected.x,
								y: projected.y,
								isPriority: priorityIdSet.has(contact.id),
								key: hashStringToUint32(
									`${sampleSalt}|ambient:${seedSuffix}|${contact.id}`
								),
							});
						}
						candidates.sort((a, b) => {
							if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
							return a.key - b.key;
						});

						const picked: ContactWithName[] = [];
						const grid = new Map<string, Array<{ x: number; y: number }>>();
						const cellSize = Math.max(6, ambientMinSeparationPx);
						const hasNeighborWithin = (x: number, y: number): boolean => {
							const cx = Math.floor(x / cellSize);
							const cy = Math.floor(y / cellSize);
							for (let dx = -1; dx <= 1; dx++) {
								for (let dy = -1; dy <= 1; dy++) {
									const arr = grid.get(`${cx + dx},${cy + dy}`);
									if (!arr) continue;
									for (const p of arr) {
										const ddx = x - p.x;
										const ddy = y - p.y;
										if (ddx * ddx + ddy * ddy < ambientMinSeparationSq) return true;
									}
								}
							}
							return false;
						};

						for (const candidate of candidates) {
							if (picked.length >= slots) break;
							if (hasNeighborWithin(candidate.x, candidate.y)) continue;
							picked.push(candidate.contact);
							const cx = Math.floor(candidate.x / cellSize);
							const cy = Math.floor(candidate.y / cellSize);
							const k = `${cx},${cy}`;
							const arr = grid.get(k);
							if (arr) arr.push({ x: candidate.x, y: candidate.y });
							else grid.set(k, [{ x: candidate.x, y: candidate.y }]);
						}
						return picked;
					};

					const pickedVisible = pickAmbientContacts(
						visibleInBounds,
						visibleViewportBbox,
						visibleTarget,
						'visible'
					);
					const pickedVisibleIds = new Set(pickedVisible.map((contact) => contact.id));
					const pickedBuffer = pickAmbientContacts(
						bufferInBounds.filter((contact) => !pickedVisibleIds.has(contact.id)),
						viewportBbox,
						bufferTarget,
						'buffer'
					);

					nextAllContactsOverlayVisible = [...pickedVisible, ...pickedBuffer];
				} else {
					nextAllContactsOverlayVisible = visibleInBounds;
				}

				nextAllContactsOverlayVisible.sort((a, b) => a.id - b.id);
			}

			const nextAllKey = `${isAmbientAllContactsOverlay ? 'ambient' : 'all'}|${nextAllContactsOverlayVisible.map((c) => c.id).join(',')}`;
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
			searchQuery,
			lockedStateKey,
			isCoordsInLockedState,
			isBookingSearch,
			bookingExtraContactsWithCoords,
			getBookingExtraContactCoords,
			isPromotionSearch,
			promotionOverlayContactsWithCoords,
			getPromotionOverlayContactCoords,
			isAnySearch,
			isAmbientContactsEnabled,
			ambientActiveCategories,
			ambientUncategorizedActive,
			allContactsOverlayContactsWithCoords,
			getAllContactsOverlayContactCoords,
			isAllContactsOverlayContactOnLand,
		]
	);

	// Trigger background dots update when US state polygons become available or loading state changes
	useEffect(() => {
		if (!map) return;
		if (isBackgroundPresentation) return;
		// Data-driven recompute stays IMMEDIATE (new search results / isLoading /
		// isStateLayerReady flips must render synchronously). Cancel any pending
		// camera-settle pass so this isn't followed ~MARKER_RECOMPUTE_SETTLE_MS later
		// by a redundant trailing recompute against the same viewport.
		if (markerSettleTimerRef.current != null) {
			window.clearTimeout(markerSettleTimerRef.current);
			markerSettleTimerRef.current = null;
		}
		recomputeViewportDots(map);
		// Count this immediate pass as the last heavy run so the next moveend within the
		// settle window defers instead of redundantly re-running the leading edge.
		lastHeavyMarkerRunRef.current = performance.now();
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
		const requestedZoomValue = requestedZoom?.zoom;
		if (typeof requestedZoomValue !== 'number' || !Number.isFinite(requestedZoomValue))
			return;

		try {
			const minZoom = map.getMinZoom();
			const maxZoom = map.getMaxZoom();
			const targetZoom = clamp(requestedZoomValue, minZoom, maxZoom);
			const currentZoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
			if (Math.abs(currentZoom - targetZoom) < 0.03) return;
			if (requestedZoom?.isDragging) {
				map.jumpTo({ zoom: targetZoom });
				return;
			}
			map.easeTo({
				zoom: targetZoom,
				duration: 180,
				essential: true,
			});
		} catch {
			// Non-fatal; the slider will sync again on the next map idle event.
		}
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		requestedZoom?.isDragging,
		requestedZoom?.nonce,
		requestedZoom?.zoom,
	]);

	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (isBackgroundPresentation) return;
		// The heavy contact-marker resample + overlay-fetch decisions. Reads the map LIVE
		// at call time (getBounds/getZoom happen inside the callees), so when this runs on a
		// trailing settle it samples the FINAL camera, not where the gesture started.
		const runHeavy = () => {
			updateBookingExtraFetchBbox(map);
			updatePromotionOverlayFetchBbox(map);
			updateAllContactsOverlayFetchBbox(map);
			recomputeViewportDots(map);
			lastHeavyMarkerRunRef.current = performance.now();
		};

		// Leading+trailing settle. A discrete pan/zoom stop fires a single moveend after a
		// quiet period → run IMMEDIATELY (markers fill the instant you stop, exactly as
		// before the debounce — no load-in delay). A gesture STORM (zoom-slider jumpTo per
		// frame, wheel/inertia eases, prewarm jumpTo chains) fires moveends faster than the
		// settle window → collapse them into ONE trailing recompute. Existing GeoJSON
		// markers pan natively during the gesture, so nothing is ever blank mid-move.
		const scheduleHeavy = () => {
			if (markerSettleTimerRef.current != null) {
				window.clearTimeout(markerSettleTimerRef.current);
				markerSettleTimerRef.current = null;
			}
			if (performance.now() - lastHeavyMarkerRunRef.current > MARKER_RECOMPUTE_SETTLE_MS) {
				// Leading edge: first stop of a gesture — no waiting.
				runHeavy();
				return;
			}
			// Inside a storm: defer to the trailing edge so the storm collapses to one pass.
			markerSettleTimerRef.current = window.setTimeout(() => {
				markerSettleTimerRef.current = null;
				runHeavy();
			}, MARKER_RECOMPUTE_SETTLE_MS);
		};

		// The lightweight, must-stay-immediate work: zoom-gated React state, basemap
		// cartography, and the parent viewport-idle callback (zoom-slider thumb sync +
		// "Search this area" CTA). Cheap, and already ran on every moveend — keep it live.
		const emitLight = () => {
			const zoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
			setZoomLevel(zoom);
			syncUsOnlyBasemapCartography(map);

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

		const onMoveEnd = () => {
			emitLight();
			scheduleHeavy();
		};
		map.on('moveend', onMoveEnd);
		// Initial fill: light + heavy both run immediately so first marker paint is not
		// delayed by the settle window.
		emitLight();
		runHeavy();
		return () => {
			map.off('moveend', onMoveEnd);
			if (markerSettleTimerRef.current != null) {
				window.clearTimeout(markerSettleTimerRef.current);
				markerSettleTimerRef.current = null;
			}
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

	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (isBackgroundPresentation) return;

		const onZoom = () => {
			onViewportZoomRef.current?.(map.getZoom() ?? MAP_DEFAULT_ZOOM);
		};

		onZoom();
		map.on('zoom', onZoom);
		return () => {
			map.off('zoom', onZoom);
		};
	}, [map, isMapLoaded, isBackgroundPresentation]);

	// Street-level 3D: couple camera pitch to the settled zoom. Reconciles on
	// 'moveend' only — never per zoom frame — because setPitch/jumpTo fire a
	// synchronous moveend (storming the heavy viewport-idle pipeline) and stop()
	// any in-flight easeTo/fitBounds. Two subtleties make the reconcile deferred
	// by one frame with an isEasing/isMoving re-check:
	// - moveends fired by *interrupting* an ease (every input/render frame of an
	//   active gesture calls map stop()) report isEasing() === false, so a
	//   synchronous reconcile would re-arm at frame rate for the whole gesture;
	// - starting an ease synchronously from inside another ease's stop() leaves
	//   two render-frame chains running concurrently.
	// After the one-frame deferral only a genuinely settled camera starts the
	// pitch ease. The ramp is continuous, so leaving street zoom naturally
	// returns pitch to 0; the epsilon dead-band makes the pitch ease's own
	// moveend a terminating no-op.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (isBackgroundPresentation) return;
		if (!streetViewEnabled) return;

		let frameId: number | null = null;
		const reconcilePitch = () => {
			if (frameId !== null) return;
			frameId = requestAnimationFrame(() => {
				frameId = null;
				try {
					if (map.isEasing() || map.isMoving()) return;
					const target = computeStreetViewPitch(map.getZoom() ?? MAP_DEFAULT_ZOOM);
					const current = map.getPitch() ?? 0;
					if (Math.abs(current - target) < STREET_VIEW_PITCH_EPSILON_DEG) return;
					map.easeTo({
						pitch: target,
						duration: STREET_VIEW_PITCH_EASE_MS,
						easing: mapboxEaseOutCubic,
						essential: true,
					});
				} catch {
					// Non-fatal.
				}
			});
		};

		map.on('moveend', reconcilePitch);
		// Align immediately on enable / re-entry to the search surface.
		reconcilePitch();
		return () => {
			map.off('moveend', reconcilePitch);
			if (frameId !== null) {
				cancelAnimationFrame(frameId);
				frameId = null;
			}
		};
	}, [map, isMapLoaded, isBackgroundPresentation, streetViewEnabled]);

	// Street-level 3D: continuous pitch ramp during user zoom gestures, so the
	// camera tilts WHILE zooming instead of after the gesture settles. Writes
	// map.transform.pitch directly (the exact write jumpTo performs internally:
	// the setter clamps to [minPitch, maxPitch] and recalcs matrices) because
	// every public camera mutator funnels through stop(), which resets all
	// gesture handlers — freezing wheel smoothing and killing a live pinch. The
	// gesture pipeline applies deltas only (tr.pitch += pitchDelta) and no zoom
	// handler emits pitchDelta (touchPitch/pitchWithRotate are off on this map),
	// so these writes are never overwritten. e.originalEvent separates user
	// input (wheel/pinch frames; dblclick/inertia eases, which never touch
	// pitch) from programmatic flights/handoffs, which stay owned by the
	// moveend reconcile above — that effect remains the settle pass and the
	// fallback if mapbox internals ever change shape.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (isBackgroundPresentation) return;
		if (!streetViewEnabled) return;

		const onZoomFrame = (e: mapboxgl.MapboxEvent) => {
			try {
				const originalEvent = (e as { originalEvent?: Event }).originalEvent;
				if (!originalEvent) return; // programmatic camera move — skip
				const tr = map.transform;
				if (!tr || typeof tr.pitch !== 'number') return; // private-API fence
				const target = computeStreetViewPitch(map.getZoom() ?? MAP_DEFAULT_ZOOM);
				if (Math.abs(tr.pitch - target) < STREET_VIEW_PITCH_FRAME_EPSILON_DEG) return;
				tr.pitch = target;
				map.triggerRepaint(); // no-op mid-render; safety net otherwise
			} catch {
				// Fence: on any mapbox internals change, fall back to the
				// moveend reconcile (today's behavior).
			}
		};

		map.on('zoom', onZoomFrame);
		return () => {
			map.off('zoom', onZoomFrame);
		};
	}, [map, isMapLoaded, isBackgroundPresentation, streetViewEnabled]);

	// Show the 3D buildings only on surfaces that opted into street view.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		try {
			if (!map.getLayer(MAPBOX_LAYER_IDS.streetViewBuildings)) return;
			map.setLayoutProperty(
				MAPBOX_LAYER_IDS.streetViewBuildings,
				'visibility',
				streetViewEnabled && !isBackgroundPresentation ? 'visible' : 'none'
			);
		} catch {
			// Non-fatal.
		}
	}, [map, isMapLoaded, isBackgroundPresentation, streetViewEnabled]);

	// If street view is disabled while pitched (e.g. the host toggles the prop while
	// staying interactive), ease back to the flat top-down camera. The background
	// handoff is excluded: it owns pitch explicitly (0 / DASHBOARD_DECORATIVE_PITCH).
	// Same one-frame deferral + settled-camera re-check as the street-view pitch
	// reconciler above: in particular this must never stop() an in-flight
	// background → interactive handoff glide (which already lands at pitch 0).
	// Reconciling on moveend covers a prop flip that lands mid-animation.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (streetViewEnabled) return;
		if (isBackgroundPresentation) return;

		let frameId: number | null = null;
		const flattenPitch = () => {
			if (frameId !== null) return;
			frameId = requestAnimationFrame(() => {
				frameId = null;
				try {
					if (map.isEasing() || map.isMoving()) return;
					if ((map.getPitch() ?? 0) <= STREET_VIEW_PITCH_EPSILON_DEG) return;
					map.easeTo({
						pitch: 0,
						duration: STREET_VIEW_PITCH_EASE_MS,
						easing: mapboxEaseOutCubic,
						essential: true,
					});
				} catch {
					// Non-fatal.
				}
			});
		};

		map.on('moveend', flattenPitch);
		flattenPitch();
		return () => {
			map.off('moveend', flattenPitch);
			if (frameId !== null) {
				cancelAnimationFrame(frameId);
				frameId = null;
			}
		};
	}, [map, isMapLoaded, isBackgroundPresentation, streetViewEnabled]);

	// Prewarm the coarse low-zoom basemap for the wide region the user would reveal
	// on zoom-out, so even the FIRST zoom-out renders already-cached cartography
	// instead of streaming streets-v12 across the periphery. Uses Mapbox's public,
	// event-free `jumpTo(preloadOnly)`: it clones the transform (no camera move, no
	// events) and warms the browser tile cache for that camera. Fires on a debounced
	// settle so it stays off the interaction hot path. The first settle after the
	// map turns interactive seeds the whole zoom-out path (overview levels + floor
	// view), so even a boot-then-immediate-zoom-out never streams.
	//
	// The background-presentation gate below is load-bearing beyond etiquette: the
	// decorative dashboard locks minZoom=maxZoom, and `preloadOnly` transforms clamp
	// to the live zoom constraints — a background-mode preload would silently warm
	// nothing useful.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (isBackgroundPresentation) return;

		const prewarm = () => {
			try {
				if (typeof map.jumpTo !== 'function') return;
				// `jumpTo` calls `map.stop()`, which would abort an in-progress camera
				// animation. Never prewarm while the camera is moving — defer until it
				// settles so we can't interrupt a fresh gesture started mid-debounce.
				if (typeof map.isMoving === 'function' && map.isMoving()) {
					schedule();
					return;
				}
				const zoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
				if (typeof document !== 'undefined' && document.hidden) return;
				const c = map.getCenter();
				if (!c) return;
				// Warm only the levels a zoom-out from here would newly reveal, plus
				// the floor view itself — the level every zoom-out ultimately lands
				// on (live getMinZoom: z2 desktop / z1 mobile / z3 large monitors).
				const minZoom =
					typeof map.getMinZoom === 'function' ? map.getMinZoom() : MAP_MIN_ZOOM;
				const zoomBand = Math.floor(zoom);
				const levels: number[] = OVERVIEW_PREWARM_ZOOMS.filter((z) => z < zoomBand);
				if (zoom - minZoom >= OVERVIEW_PREWARM_FLOOR_SKIP_MARGIN) {
					levels.push(minZoom);
				}
				if (levels.length === 0) return;
				const q = OVERVIEW_PREWARM_CENTER_QUANT_DEG;
				// Key includes the zoom band so descending in steps re-warms the levels
				// each step newly uncovers, while micro-zooms within a band still dedupe.
				const key = `${Math.round(c.lng / q) * q}:${Math.round(c.lat / q) * q}:${zoomBand}`;
				if (lastPrewarmKeyRef.current === key) return;
				lastPrewarmKeyRef.current = key;
				for (const z of levels) {
					map.jumpTo({ center: [c.lng, c.lat], zoom: z, preloadOnly: true } as any);
				}
			} catch {
				// Non-fatal — prewarm is a pure optimization, never break the map.
			}
		};

		const schedule = () => {
			if (prewarmTimerRef.current != null) {
				window.clearTimeout(prewarmTimerRef.current);
			}
			prewarmTimerRef.current = window.setTimeout(prewarm, OVERVIEW_PREWARM_DEBOUNCE_MS);
		};

		map.on('moveend', schedule);
		// Seed once on first settle (covers deep-link-then-zoom-out with no pan).
		schedule();

		return () => {
			map.off('moveend', schedule);
			if (prewarmTimerRef.current != null) {
				window.clearTimeout(prewarmTimerRef.current);
				prewarmTimerRef.current = null;
			}
		};
	}, [map, isMapLoaded, isBackgroundPresentation]);

	// Notify the parent as soon as the user starts interacting with the viewport.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isBackgroundPresentation) return;
		const onMoveStart = () => {
			// A fresh gesture cancels any pending trailing marker resample aimed at the
			// viewport the user is already leaving; the new gesture's moveend re-arms it.
			// (Do NOT freeze recompute here — movestart also fires for programmatic
			// jumpTo/easeTo/fitBounds, and a freeze would starve new-search auto-fit.)
			if (markerSettleTimerRef.current != null) {
				window.clearTimeout(markerSettleTimerRef.current);
				markerSettleTimerRef.current = null;
			}
			clearEmptyMapPrompt();
			onViewportInteractionRef.current?.();
		};
		map.on('movestart', onMoveStart);
		return () => {
			map.off('movestart', onMoveStart);
			if (markerSettleTimerRef.current != null) {
				window.clearTimeout(markerSettleTimerRef.current);
				markerSettleTimerRef.current = null;
			}
		};
	}, [map, isMapLoaded, isBackgroundPresentation, clearEmptyMapPrompt]);

	// Rectangle selection handlers (Mapbox mouse + touch events).
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isBackgroundPresentation) return;
		map.on('mousedown', handleMapMouseDown);
		map.on('mousemove', handleMapMouseMove);
		map.on('mouseup', handleMapMouseUp);
		map.on('touchstart', handleMapTouchStart);
		map.on('touchmove', handleMapTouchMove);
		map.on('touchend', handleMapTouchEnd);
		return () => {
			map.off('mousedown', handleMapMouseDown);
			map.off('mousemove', handleMapMouseMove);
			map.off('mouseup', handleMapMouseUp);
			map.off('touchstart', handleMapTouchStart);
			map.off('touchmove', handleMapTouchMove);
			map.off('touchend', handleMapTouchEnd);
		};
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		handleMapMouseDown,
		handleMapMouseMove,
		handleMapMouseUp,
		handleMapTouchStart,
		handleMapTouchMove,
		handleMapTouchEnd,
	]);

	// Toggle map interaction mode for rectangle selection.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isBackgroundPresentation) return;
		const selecting = areaSelectionEnabled || isAreaSelecting;
		try {
			if (selecting) {
				map.dragPan.disable();
			} else {
				map.dragPan.enable();
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
		if (!searchEngaged || isLoading || !resultStateKeysSignature || selectedAreaBounds) {
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
		searchEngaged,
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
	const lastAutoFitRequestNonceRef = useRef<number>(autoFitRequestNonce ?? 0);
	// Tracks the last consumed `instantAutoFitNonce` so each distinct value snaps exactly one fit.
	const lastInstantAutoFitNonceRef = useRef<number>(0);
	// Debounce auto-fit camera moves so rapid result updates don't cause zoom oscillation.
	const autoFitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Keep the latest autoFitPadding without churning the fit callbacks' identity (the
	// host passes an inline object literal).
	const autoFitPaddingRef = useRef(autoFitPadding);
	autoFitPaddingRef.current = autoFitPadding;

	// Resolve the padding for a fitBounds call: the host's chrome-aware autoFitPadding
	// when provided, scaled down so the bounds always have ≥80px of canvas to land in
	// (Mapbox bails out of fits whose padding exceeds the canvas), else the fallback.
	const resolveAutoFitPadding = useCallback(
		(
			mapInstance: mapboxgl.Map,
			fallback: { top: number; right: number; bottom: number; left: number }
		) => {
			const requested = autoFitPaddingRef.current;
			if (!requested) return fallback;
			const container = mapInstance.getContainer();
			let { top, right, bottom, left } = requested;
			const maxVertical = Math.max(0, container.clientHeight - 80);
			const maxHorizontal = Math.max(0, container.clientWidth - 80);
			if (top + bottom > maxVertical && top + bottom > 0) {
				const scale = maxVertical / (top + bottom);
				top *= scale;
				bottom *= scale;
			}
			if (left + right > maxHorizontal && left + right > 0) {
				const scale = maxHorizontal / (left + right);
				left *= scale;
				right *= scale;
			}
			return { top, right, bottom, left };
		},
		[]
	);

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
				padding: resolveAutoFitPadding(mapInstance, {
					top: 50,
					right: 50,
					bottom: 50,
					left: 50,
				}),
				maxZoom: AUTO_FIT_CONTACTS_MAX_ZOOM,
				pitch: 0,
				bearing: 0,
				offset: [0, 0],
				duration: dur,
				// Smooth ease-out for cinematic transitions (default Mapbox ease is too stiff at long durations).
				...(dur > 1000 ? { easing: mapboxEaseOutCubic } : {}),
			});
		},
		[getContactCoords, resolveAutoFitPadding]
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
					padding: resolveAutoFitPadding(mapInstance, {
						top: 100,
						right: 100,
						bottom: 100,
						left: 100,
					}),
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
		[resolveAutoFitPadding]
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
		const autoFitRequestNonceValue = autoFitRequestNonce ?? 0;
		const isAutoFitRequested =
			autoFitRequestNonceValue !== lastAutoFitRequestNonceRef.current;

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
			lockedStateKeyIsUsState &&
			isStateLayerReady &&
			(!hasFitLockedStateForKey || isAutoFitRequested);

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
				isAutoFitRequested ||
				(!lockedStateKeyIsUsState && coordsJustBecameAvailable)
			: // Outside search mode (campaign contacts view), keep the existing "results changed" behavior.
				!hasFitBoundsRef.current ||
				isNewSearch ||
				isNewStateSearch ||
				isAutoFitRequested ||
				contactsWithCoords.length > lastContactsCountRef.current ||
				Math.abs(contactsWithCoords.length - lastContactsCountRef.current) > 5;

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

		// Only advance new-search detection refs once we're committed to scheduling a fit.
		// Advancing earlier (before the wait-for-fresh-contacts gate) consumes the
		// `isNewSearch` signal on the stale-contacts run, so the fresh-contacts run
		// can no longer detect the new search and never re-fits to the new location.
		if (isSearchMode) lastSearchQueryKeyRef.current = searchQueryKey;
		else lastFirstContactIdRef.current = currentFirstId;
		lastLockedStateKeyRef.current = lockedStateKey;

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

		const instantFitRequested =
			(instantAutoFitNonce ?? 0) > 0 &&
			(instantAutoFitNonce ?? 0) !== lastInstantAutoFitNonceRef.current;
		const autoFitDebounceMs =
			instantFitRequested || cinematicAutoFitRef.current || isSearchQueryCinematic
				? 0
				: 180;
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
			const durationMs = instantFitRequested
				? 0
				: cinematicNow || isUserStateClickCinematic || isSearchQueryCinematicNow
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
				lastAutoFitRequestNonceRef.current = autoFitRequestNonceValue;
				if (instantFitRequested) {
					// Mark this nonce consumed; clear pending cinematic intents so the next *real*
					// search/state-click animates normally instead of inheriting this snap.
					lastInstantAutoFitNonceRef.current = instantAutoFitNonce ?? 0;
					pendingSearchQueryCinematicRef.current = null;
					pendingStateClickCinematicRef.current = null;
				}
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

				// If we temporarily allowed zoom below the interactive floor to start the animation
				// from the decorative globe, restore the normal constraint once the camera settles.
				if (pendingMinZoomRestoreRef.current && !hasAttachedMinZoomRestoreRef.current) {
					hasAttachedMinZoomRestoreRef.current = true;
					try {
						map.once('moveend', () => {
							hasAttachedMinZoomRestoreRef.current = false;
							pendingMinZoomRestoreRef.current = false;
							try {
								map.setMinZoom(interactiveMinZoomRef.current);
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
						// Pick up any viewport change whose resize was skipped mid-sweep.
						syncInteractiveFloor();
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
		autoFitRequestNonce,
		instantAutoFitNonce,
		syncInteractiveFloor,
	]);

	// If auto-fit is disabled, ensure we don't have a queued fit from a prior render.
	useEffect(() => {
		if (!skipAutoFit) return;
		if (autoFitTimeoutRef.current) {
			clearTimeout(autoFitTimeoutRef.current);
			autoFitTimeoutRef.current = null;
		}
	}, [skipAutoFit]);

	// Reset bounds tracking when contacts prop is empty (preparing for new search).
	// Do NOT re-arm while auto-fit is disabled: an empty-contacts frame under skipAutoFit is
	// always transient (the route-handoff FALLBACK flash between campaign/dashboard, or
	// background/decorative mode). Re-arming there forces a spurious re-fit when the real
	// interactive config rehydrates with the same search, overriding the user's camera.
	useEffect(() => {
		if (skipAutoFit) return;
		if (contacts.length === 0) {
			hasFitBoundsRef.current = false;
			lastContactsCountRef.current = 0;
			lastFirstContactIdRef.current = null;
			lastLockedStateKeyRef.current = null;
		}
	}, [contacts, skipAutoFit]);

	// Selection toggling is allowed for:
	// - the primary result set;
	// - in Booking mode, the zoom-in "extra" pins (even though they come from the
	//   map-overlay endpoint rather than the primary results list);
	// - at extremely high zoom, the "all contacts" gray-dot overlay.
	// Shared by marker clicks and the street-view card's selection button.
	const isSelectionToggleEligible = (contact: ContactWithName): boolean => {
		const isPrimaryResult = baseContactIdSet.has(contact.id);
		const isBookingExtraResult =
			isBookingSearch && bookingExtraVisibleContacts.some((c) => c.id === contact.id);
		const isAllContactsOverlayResult = allContactsOverlayVisibleIdSetRef.current.has(
			contact.id
		);
		return isPrimaryResult || isBookingExtraResult || isAllContactsOverlayResult;
	};

	const handleMarkerClick = (contact: ContactWithName) => {
		onMarkerClick?.(contact);
		if (isSelectionToggleEligible(contact)) {
			onToggleSelection?.(contact.id);
		}
	};

	// Street-view card "Add to Selection" must follow the marker-click contract:
	// onMarkerClick first, so the consumer can pin overlay-only contacts (ambient
	// dots, non-matching booking/promotion pins) into its results panel — a bare
	// onToggleSelection(id) leaves the dashboard with an id it can't resolve to a
	// row. Stable identity so the memoized persistent cards don't re-render.
	// (The cards only render this button for selection-eligible contacts.)
	const handleStreetCardToggleSelection = useCallback(
		(contact: ContactWithName) => {
			onMarkerClick?.(contact);
			onToggleSelection?.(contact.id);
		},
		[onMarkerClick, onToggleSelection]
	);

	// Hover cards flip to pointer-events:auto while their marker is hovered, which
	// otherwise swallows wheel events before they reach Mapbox's scroll-zoom handler
	// (it lives on the canvas container, a sibling subtree). Re-dispatch the wheel
	// onto that element so native zoom-to-cursor / wheel rate / pinch all still apply.
	const forwardWheelToMap = useCallback((e: React.WheelEvent) => {
		const map = mapRef.current;
		if (!map) return;
		map.getCanvasContainer().dispatchEvent(
			new WheelEvent('wheel', {
				deltaX: e.deltaX,
				deltaY: e.deltaY,
				deltaZ: e.deltaZ,
				deltaMode: e.deltaMode,
				clientX: e.clientX,
				clientY: e.clientY,
				ctrlKey: e.ctrlKey,
				metaKey: e.metaKey,
				shiftKey: e.shiftKey,
				altKey: e.altKey,
				bubbles: false,
				cancelable: true,
			})
		);
	}, []);

	const handleMarkerMouseOver = useCallback(
		(contact: ContactWithName, domEvent?: MouseEvent | TouchEvent) => {
			clearEmptyMapPrompt();
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
		[clearEmptyMapPrompt, onMarkerHover, zoomLevel]
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
		const bloomT = computeCuratedOrbT(zoom, interactiveFloorDeltaRef.current);
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

			const projectedClip = buildScreenPathFromLngLatMultiPolygon(m, shapeMultiPolygon);
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
			ellipse.setAttribute('rx', (halfWidth * CURATED_ORB_ELLIPSE_RX_RATIO).toFixed(2));
			ellipse.setAttribute('ry', (halfHeight * CURATED_ORB_ELLIPSE_RY_RATIO).toFixed(2));
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
			ellipse.setAttribute('opacity', (colorOpacity * frontHemisphereOpacity).toFixed(3));
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
		const t = computeCuratedOrbT(zoom, interactiveFloorDeltaRef.current);
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
									return [point[0] + (tx - point[0]) * t, point[1] + (ty - point[1]) * t];
								})
							)
						)
		);
		const lngLatShapes = morphedShapes.map(mercatorMultiPolygonToLngLat);
		const lngLat = lngLatShapes.flat();
		curatedBlobLngLatShapeMultiPolygonsRef.current = lngLatShapes;
		curatedBlobLngLatMultiPolygonRef.current = lngLat;
		const fc = createOutlineGeoJsonFromMultiPolygon(lngLat);
		try {
			source.setData(fc as GeoJSON.FeatureCollection);
		} catch {
			// Non-fatal; the source can be transiently invalid mid camera churn. The
			// orb resyncs on the next move/idle frame.
		}
		applyCuratedOrbStateRef.current?.();
	}, []);
	applyBlobMorphRef.current = applyBlobMorph;

	// Softbox lighting overlay opacity is owned entirely by `applyLightingOverlayOpacity`
	// below, which fires on every `zoom` event and on mood changes. We deliberately do
	// NOT render an `opacity` value into the JSX style: any React re-render during a
	// zoom gesture would otherwise overwrite the smooth imperative update with the stale
	// `zoomLevel`-derived value (zoomLevel only updates on `moveend`).

	const setRasterOpacityIfChanged = useCallback(
		(m: mapboxgl.Map, layerId: string, value: number) => {
			const prev = lightingRasterOpacityAppliedRef.current[layerId];
			if (prev != null && Math.abs(prev - value) < 0.0005) return;
			if (!m.getLayer(layerId)) return;
			m.setPaintProperty(layerId, 'raster-opacity', value);
			// While effectively invisible, hide the layer outright: mapbox keeps
			// loading + compositing raster/canvas sources for opacity-0 layers.
			const visibility = value < 0.0005 ? 'none' : 'visible';
			if (lightingLayerVisibilityAppliedRef.current[layerId] !== visibility) {
				m.setLayoutProperty(layerId, 'visibility', visibility);
				lightingLayerVisibilityAppliedRef.current[layerId] = visibility;
			}
			lightingRasterOpacityAppliedRef.current[layerId] = value;
		},
		[]
	);

	const applyLightingOverlayOpacity = useCallback(() => {
		if (!mapRef.current) return;
		const zoom = mapRef.current.getZoom() ?? MAP_DEFAULT_ZOOM;
		const base = computeLightingOverlayOpacity(zoom, interactiveFloorDeltaRef.current);
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
		const keyNightMul = 1 - trueNightEase * (1 - clamp(NIGHT_WARM_KEY_MIN_MUL, 0, 1));
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
			base *
				cfg.shadowOpacityMultiplier *
				shadowNightMul *
				(1 - sunWashSuppression * 0.9),
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
			if (m) {
				// Mobile lite mode: far-side shade stays (cheap, static), but the animated
				// sun-transition wash + catchlight are forced off.
				const mobileLite = isMobileRef.current === true;
				setRasterOpacityIfChanged(m, MAPBOX_LAYER_IDS.dayFarSideShade, dayShadeOpacity);
				setRasterOpacityIfChanged(
					m,
					MAPBOX_LAYER_IDS.sunTransition,
					mobileLite ? 0 : sunTransitionOpacity
				);
				setRasterOpacityIfChanged(
					m,
					MAPBOX_LAYER_IDS.sunTransitionCloudCatchlight,
					mobileLite ? 0 : sunTransitionCatchlightOpacity
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

		// Unsubscribe burn washes — uniform multiply char plus a late-stage
		// screen-blend ember under-glow (only emerges past mid-burn). Both are
		// 0 outside the unsubscribe flow.
		const unsubscribeBurn = unsubscribeBurnEase(unsubscribeBurnTRef.current);
		const burnWashOpacity = clamp(
			unsubscribeBurn * UNSUBSCRIBE_BURN_WASH_MAX_OPACITY,
			0,
			1
		);
		const burnGlowOpacity = clamp(
			smoothstep(0.45, 1, unsubscribeBurn) * UNSUBSCRIBE_BURN_GLOW_MAX_OPACITY,
			0,
			1
		);
		if (lightingOverlayBurnWashRef.current)
			lightingOverlayBurnWashRef.current.style.opacity = String(burnWashOpacity);
		if (lightingOverlayBurnGlowRef.current)
			lightingOverlayBurnGlowRef.current.style.opacity = String(burnGlowOpacity);
	}, [setRasterOpacityIfChanged]);

	const repaintSunTransitionCanvas = useCallback((nowMs: number, force = false) => {
		// Mobile lite mode: the sunrise/sunset wash + cloud catchlight are disabled
		// (layer opacity forced to 0 in applyLightingOverlayOpacity); skip painting and
		// uploading the canvas so its source stays paused and the map idles. The plain
		// day/night land palette still applies, so the globe still transitions.
		if (isMobileRef.current === true) return false;
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
				const sunSrc = m?.getSource(MAPBOX_SOURCE_IDS.sunTransition) as
					| { play?: () => void; pause?: () => void }
					| undefined;
				sunSrc?.play?.();
				// Safari: upload once, then stop forcing per-frame texture uploads.
				if (SAFARI_CANVAS_PERF_MODE) sunSrc?.pause?.();
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
					| { play?: () => void; pause?: () => void }
					| undefined;
				source?.play?.();
				// Safari + mobile lite: upload once, then stop forcing per-frame texture uploads.
				if (SAFARI_CANVAS_PERF_MODE || isMobileRef.current === true) source?.pause?.();
				map?.triggerRepaint();
			} catch {
				// Non-fatal.
			}
		};

		const repaint = (nowMs: number, forceRefresh = false) => {
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

			if (needsPaint && !paintDayFarSideShadeCanvas(shadeCanvas, nextCenterLng)) {
				return false;
			}
			if (needsPaint) dayFarSideShadeCenterLngRef.current = nextCenterLng;

			// Re-upload + reapply lighting only when the canvas actually changed
			// (or on the forced setup call after a (re)mount/style reload): the
			// unconditional 4s refresh re-uploaded the texture and restarted paint
			// transitions for nothing, keeping the map's render loop warm at idle.
			if (needsPaint || forceRefresh) {
				refreshSource();
				if (map && isMapLoaded) applyLightingOverlayOpacity();
			}
			return true;
		};

		repaint(Date.now(), true);
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
		// `move` fires on every camera-change frame, which keeps the DOM SVG clip
		// in the same cadence as Mapbox's camera transform during quick pinch/
		// scroll zooms — without also running on every non-camera repaint (e.g.
		// the clouds-drift ticks) the way `render` did. All non-camera triggers
		// invoke applyBlobMorph directly.
		map.on('move', applyBlobMorph);
		map.on('moveend', applyBlobMorph);
		map.on('resize', applyBlobMorph);
		return () => {
			map.off('move', applyBlobMorph);
			map.off('moveend', applyBlobMorph);
			map.off('resize', applyBlobMorph);
		};
	}, [map, isMapLoaded, applyBlobMorph]);

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
		applyMurmurGlobeLighting(map, unsubscribeBurnTRef.current);
		applyNightLandPalette(map, visualNightT, unsubscribeBurnTRef.current);
		applyStateOverlayNightColors(map, visualNightT);
		applyMapboxFogForMoodAndNight(
			map,
			weatherMoodConfigRef.current,
			visualNightT,
			unsubscribeBurnTRef.current
		);
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
			applyMurmurGlobeLighting(map, unsubscribeBurnTRef.current);
			applyNightLandPalette(map, visualNightT, unsubscribeBurnTRef.current);
			applyStateOverlayNightColors(map, visualNightT);
			applyMapboxFogForMoodAndNight(
				map,
				weatherMoodConfigRef.current,
				visualNightT,
				unsubscribeBurnTRef.current
			);
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

	// Unsubscribe burn ("globe on fire"): tween the visual burn factor toward
	// the flow's published target and repaint the burn-aware appliers each
	// frame. Burn composes *inside* the night/mood pipeline, so the periodic
	// reapplications elsewhere repaint (rather than wipe) the current level.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;

		let rafId: number | null = null;

		const applyBurnFrame = () => {
			const burn = unsubscribeBurnTRef.current;
			const visualNightT = computeMoodVisualNightT(
				nightTRef.current,
				weatherMoodConfigRef.current
			);
			applyMurmurGlobeLighting(map, burn);
			applyNightLandPalette(map, visualNightT, burn);
			applyMapboxFogForMoodAndNight(
				map,
				weatherMoodConfigRef.current,
				visualNightT,
				burn
			);
			applyLightingOverlayOpacity();
			try {
				map.triggerRepaint();
			} catch {
				// Non-fatal.
			}
		};

		// Tuning/screenshot escape hatch: `?devBurnT=0.5` pins the burn factor.
		const devBurnRaw =
			typeof window === 'undefined'
				? null
				: new URLSearchParams(window.location.search).get('devBurnT');
		const devBurnT = devBurnRaw == null ? null : Number(devBurnRaw);
		if (devBurnT != null && Number.isFinite(devBurnT)) {
			unsubscribeBurnTRef.current = clamp(devBurnT, 0, 1);
			applyBurnFrame();
			return;
		}

		const seekTo = (target: number) => {
			if (rafId != null) cancelAnimationFrame(rafId);
			rafId = null;
			const from = unsubscribeBurnTRef.current;
			if (Math.abs(target - from) < 0.001) {
				unsubscribeBurnTRef.current = target;
				applyBurnFrame();
				return;
			}
			const startMs = performance.now();
			const tick = () => {
				const t = clamp(
					(performance.now() - startMs) / UNSUBSCRIBE_BURN_TRANSITION_MS,
					0,
					1
				);
				const eased = t * t * (3 - 2 * t);
				unsubscribeBurnTRef.current = lerp(from, target, eased);
				applyBurnFrame();
				if (t < 1) {
					rafId = requestAnimationFrame(tick);
					return;
				}
				rafId = null;
			};
			tick();
		};

		// Catch up if the flow advanced before the map was ready (or after a
		// style reload re-asserted the unburned look).
		if (getUnsubscribeBurnTarget() !== unsubscribeBurnTRef.current) {
			seekTo(getUnsubscribeBurnTarget());
		}
		const unsubscribe = subscribeUnsubscribeBurn(seekTo);
		return () => {
			unsubscribe();
			if (rafId != null) cancelAnimationFrame(rafId);
		};
	}, [map, isMapLoaded, applyLightingOverlayOpacity]);

	const getSelectedStateDisplayMultiPolygon = useCallback(
		(mapInstance: mapboxgl.Map): ClippingMultiPolygon | null => {
			const selection = lockedStateSelectionMultiPolygonRef.current;
			if (!selection?.length) return null;

			const zoom = mapInstance.getZoom() ?? MAP_DEFAULT_ZOOM;
			const t = computeCuratedOrbT(zoom, interactiveFloorDeltaRef.current);
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
				source.setData(createOutlineGeoJsonFromMultiPolygon(displayMultiPolygon) as any);
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

		if (!m || !ellipse || !bloomEllipse || !gradient || !bloomGradient || !clipPath) {
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
		const bloomT = computeCuratedOrbT(zoom, interactiveFloorDeltaRef.current);
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
		ellipse.setAttribute('rx', (halfWidth * CURATED_ORB_ELLIPSE_RX_RATIO).toFixed(2));
		ellipse.setAttribute('ry', (halfHeight * CURATED_ORB_ELLIPSE_RY_RATIO).toFixed(2));
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
		ellipse.setAttribute('opacity', colorOpacity.toFixed(3));
		bloomEllipse.setAttribute('opacity', bloomOpacity.toFixed(3));
		overlay.style.opacity = '1';
	}, [getSelectedStateDisplayMultiPolygon]);
	applySelectedStateGradientStateRef.current = applySelectedStateGradientState;

	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;

		applySelectedStateGradientState();
		// Camera events only (not `render`): the gradient's inputs are all
		// camera-derived; non-camera triggers call the function directly.
		map.on('move', applySelectedStateGradientState);
		map.on('moveend', applySelectedStateGradientState);
		map.on('resize', applySelectedStateGradientState);
		return () => {
			map.off('move', applySelectedStateGradientState);
			map.off('moveend', applySelectedStateGradientState);
			map.off('resize', applySelectedStateGradientState);
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
				computeMoodVisualNightT(nightTRef.current, weatherMoodConfigRef.current),
				unsubscribeBurnTRef.current
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
					cfg.cloudDeepZoomOpacity,
					interactiveFloorDeltaRef.current
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
			applyMapboxFogForMoodAndNight(m, cfg, visualNightT, unsubscribeBurnTRef.current);
			applyMurmurGlobeLighting(m, unsubscribeBurnTRef.current);
			applyNightLandPalette(m, visualNightT, unsubscribeBurnTRef.current);
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
		// NOTE: besides mood changes, reapplyFloorShiftedAnchors re-runs this whole
		// bundle when the viewport-proportional floor delta changes (rare resize) —
		// additions here inherit that trigger and must stay idempotent.
		[applyLightingOverlayOpacity, applyStateOverlayOpacity]
	);

	// Re-applies every floor-shifted visual anchor after the interactive floor
	// delta changes (rare: monitor/window resize). Returns true only when the
	// style was actually updated so syncInteractiveFloor's once-per-delta gate
	// stays correct; layer creation (ensureMapboxSourcesAndLayers) bakes the
	// current delta itself.
	const reapplyFloorShiftedAnchors = useCallback((): boolean => {
		const m = mapRef.current;
		if (!m || !isMapLoaded) return false;
		const delta = interactiveFloorDeltaRef.current;

		// Divider/border base opacity expressions: rebuild shifted and swap the
		// cached base BEFORE applyStateOverlayOpacity scales it by the current
		// overlay/mode multipliers.
		stateLineOpacityBaseRef.current = {
			dividers: buildStateDividerLineOpacityExpr(delta),
			borders: buildStateInteractiveBorderOpacityExpr(delta),
		};

		// Clouds expr, softbox + night-lights tick, state overlay opacities
		// (incl. the shifted labels expr) — all flow through the mood path.
		applyWeatherMoodConfig(weatherMoodConfigRef.current);

		// Curated orb morph + selected-state gradient recompute their t on the
		// shifted ramp (t-cached, so cheap when nothing changed).
		applyBlobMorphRef.current?.();
		applyCuratedOrbStateRef.current?.();
		applySelectedStateGradientStateRef.current?.();

		// Ambient atlas: re-evaluate the shifted fetch gate + render gate/density.
		updateAllContactsOverlayFetchBbox(m);
		recomputeViewportDots(m);
		return true;
	}, [
		isMapLoaded,
		applyWeatherMoodConfig,
		updateAllContactsOverlayFetchBbox,
		recomputeViewportDots,
	]);
	reapplyFloorParityRef.current = reapplyFloorShiftedAnchors;

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
				const discreteT = clamp((now - transition.startMs) / transition.discreteMs, 0, 1);
				const cfg = blendRuntimeMoodConfig(
					transition.from,
					transition.to,
					continuousT,
					discreteT
				);

				if (
					now - moodTransitionLastPaintMsRef.current >= MOOD_TRANSITION_PAINT_FRAME_MS ||
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
	}, [map, isMapLoaded, weatherMood, applyWeatherMoodConfig, startWeatherMoodTransition]);

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
	const contactsWithCoordsById = useMemo(
		() => new Map<number, ContactWithName>(contactsWithCoords.map((c) => [c.id, c])),
		[contactsWithCoords]
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
	const selectedContactObjectsById = useMemo(
		() =>
			new Map<number, ContactWithName>(
				selectedContactObjects.map((contact) => [contact.id, contact])
			),
		[selectedContactObjects]
	);

	// Marker hover/click + (optional) state hover/click interactions.
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		// Coalesce mousemove hover detection to one run per animation frame, against the
		// latest event. Mapbox fires mousemove 60–120×/sec; running the 6-layer
		// queryRenderedFeatures + setHoveredMarkerId on every event janks rapid sweeps.
		let mouseMoveRafId: number | null = null;
		let latestMouseMoveEvent: mapboxgl.MapMouseEvent | null = null;

		const markerHitLayers = [
			MAPBOX_LAYER_IDS.selectedMarkerIcons,
			MAPBOX_LAYER_IDS.baseHit,
			MAPBOX_LAYER_IDS.promotionDotHit,
			MAPBOX_LAYER_IDS.bookingPinHit,
			MAPBOX_LAYER_IDS.promotionPinHit,
			MAPBOX_LAYER_IDS.markersAllHit,
		];
		const searchAreaHitLayers = [
			MAPBOX_LAYER_IDS.curatedBlobFill,
			MAPBOX_LAYER_IDS.curatedBlobCore,
		];
		const markerHitLayerSet = new Set<string>(markerHitLayers);
		const searchAreaHitLayerSet = new Set<string>(searchAreaHitLayers);
		// Active search footprints are not "empty map"; the all-contacts prompt belongs outside them.
		const isPointInSelectionBounds = (lng: number, lat: number): boolean => {
			const bounds = selectedAreaBoundsRef.current;
			if (!bounds) return false;
			const { south, west, north, east } = bounds;
			if (![south, west, north, east].every(Number.isFinite)) return false;

			const isLatInside = lat >= south && lat <= north;
			const isLngInside =
				west <= east ? lng >= west && lng <= east : lng >= west || lng <= east;
			return isLatInside && isLngInside;
		};
		const isPointInSelectionMultiPolygon = (
			lng: number,
			lat: number,
			multiPolygon: ClippingMultiPolygon | null,
			bbox: BoundingBox | null
		): boolean => {
			if (!multiPolygon?.length) return false;
			if (bbox && !isLatLngInBbox(lat, lng, bbox)) return false;
			return pointInMultiPolygon([lng, lat], multiPolygon);
		};
		const isActiveSearchSelectionHit = (e: mapboxgl.MapMouseEvent): boolean => {
			const lng = e.lngLat.lng;
			const lat = e.lngLat.lat;
			const stateSelectionHit =
				stateInteractionsEnabled &&
				(isPointInSelectionMultiPolygon(
					lng,
					lat,
					lockedStateSelectionMultiPolygonRef.current,
					lockedStateSelectionBboxRef.current
				) ||
					isPointInSelectionMultiPolygon(
						lng,
						lat,
						resultsSelectionMultiPolygonRef.current,
						resultsSelectionBboxRef.current
					));
			return (
				isPointInSelectionBounds(lng, lat) ||
				stateSelectionHit
			);
		};
		const isSearchAreaHit = (e: mapboxgl.MapMouseEvent): boolean => {
			const searchAreaFeatures = map.queryRenderedFeatures(e.point, {
				layers: searchAreaHitLayers,
			});
			if (searchAreaFeatures.length > 0) return true;

			const blobMultiPolygon = curatedBlobLngLatMultiPolygonRef.current;
			if (!blobMultiPolygon?.length) return false;
			return pointInMultiPolygon([e.lngLat.lng, e.lngLat.lat], blobMultiPolygon);
		};

		const getContactForHit = (layerId: string, id: number): ContactWithName | null => {
			if (layerId === MAPBOX_LAYER_IDS.selectedMarkerIcons) {
				return (
					contactsWithCoordsById.get(id) ??
					bookingExtraContactsById.get(id) ??
					promotionOverlayContactsById.get(id) ??
					allOverlayContactsById.get(id) ??
					visibleContactsById.get(id) ??
					null
				);
			}
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

		const getSourceForHitLayer = (layerId: string): string | null => {
			if (layerId === MAPBOX_LAYER_IDS.selectedMarkerIcons)
				return MAPBOX_SOURCE_IDS.markersSelected;
			if (layerId === MAPBOX_LAYER_IDS.baseHit) return MAPBOX_SOURCE_IDS.markersBase;
			if (layerId === MAPBOX_LAYER_IDS.bookingPinHit)
				return MAPBOX_SOURCE_IDS.markersBookingPin;
			if (layerId === MAPBOX_LAYER_IDS.promotionDotHit)
				return MAPBOX_SOURCE_IDS.markersPromotionDot;
			if (layerId === MAPBOX_LAYER_IDS.promotionPinHit)
				return MAPBOX_SOURCE_IDS.markersPromotionPin;
			if (layerId === MAPBOX_LAYER_IDS.markersAllHit)
				return MAPBOX_SOURCE_IDS.markersAllOverlay;
			return null;
		};

		// Event-star hit test. Event features carry a STRING feature id (`event-<id>-icon`),
		// so the eventId lives in `properties.eventId`, not the feature id. Returns the
		// numeric event id under the pointer (and present in the current set), else null.
		const getEventHit = (e: mapboxgl.MapMouseEvent): number | null => {
			if (suppressEventPopups) return null;
			if (eventCentersById.size === 0) return null;
			const raw = map.queryRenderedFeatures(e.point, {
				layers: [MAPBOX_LAYER_IDS.eventsStarIcon],
			})[0]?.properties?.eventId;
			const id =
				typeof raw === 'number'
					? raw
					: typeof raw === 'string'
						? Number.parseInt(raw, 10)
						: NaN;
			return Number.isFinite(id) && eventCentersById.has(id) ? id : null;
		};

		const setCursor = (cursor: string) => {
			// Avoid fighting the rectangle-selection cursor.
			if (areaSelectionEnabled || isAreaSelecting) return;
			map.getCanvas().style.cursor = cursor;
		};

		const clearMarkerVisualHover = () => {
			const prev = hoveredMarkerVisualRef.current;
			if (!prev) return;
			try {
				map.setFeatureState(
					{ source: prev.sourceId, id: prev.id },
					{ markerHover: false }
				);
			} catch {
				// Ignore.
			}
			hoveredMarkerVisualRef.current = null;
		};

		const setMarkerVisualHover = (sourceId: string, id: number) => {
			const prev = hoveredMarkerVisualRef.current;
			if (prev?.sourceId === sourceId && prev.id === id) return;
			clearMarkerVisualHover();
			try {
				map.setFeatureState({ source: sourceId, id }, { markerHover: true });
				hoveredMarkerVisualRef.current = { sourceId, id };
			} catch {
				// Ignore.
			}
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

		const processMouseMove = (e: mapboxgl.MapMouseEvent) => {
			const pointer = getClientPointFromDomEvent(e.originalEvent);
			if (pointer) {
				updateSelectedTooltipHoverHiddenTarget(pointer.x, pointer.y);
			} else {
				setSelectedTooltipHoverHiddenTargetIfChanged(null);
			}

			if (areaSelectionEnabled || isAreaSelecting) {
				clearEmptyMapPrompt();
				clearEventHoverImmediate();
				return;
			}

			const zoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;

			// ONE combined queryRenderedFeatures for every hover target (markers,
			// event stars, curated blob, states). Each call walks the per-tile
			// feature index on the main thread, and four separate walks per pointer
			// frame were the dominant hover cost (worst in Safari, which is already
			// main-thread-bound). Results are top-to-bottom, so "first feature per
			// layer group" preserves the old per-layer query semantics; guards that
			// used to decide whether to QUERY now decide whether to USE a partition.
			const wantEventHit = !suppressEventPopups && eventCentersById.size > 0;
			const wantStateHit =
				stateInteractionsEnabled &&
				isStateLayerReady &&
				zoom <= STATE_HOVER_HIGHLIGHT_MAX_ZOOM + 0.001;
			const hoverHitCandidateLayers = [
				...markerHitLayers,
				...(wantEventHit ? [MAPBOX_LAYER_IDS.eventsStarIcon] : []),
				...searchAreaHitLayers,
				...(wantStateHit ? [MAPBOX_LAYER_IDS.statesFillHit] : []),
			];
			let hoverFeatures: mapboxgl.GeoJSONFeature[] = [];
			try {
				hoverFeatures = map.queryRenderedFeatures(e.point, {
					layers: hoverHitCandidateLayers.filter((id) => Boolean(map.getLayer(id))),
				});
			} catch {
				// Ignore (style mid-reload); treated as empty-map hover below.
			}
			let topMarker: (typeof hoverFeatures)[number] | undefined;
			let topEventFeature: (typeof hoverFeatures)[number] | undefined;
			let blobLayerHit = false;
			let topStateFeature: (typeof hoverFeatures)[number] | undefined;
			for (const feature of hoverFeatures) {
				const featureLayerId = feature.layer?.id;
				if (!featureLayerId) continue;
				if (!topMarker && markerHitLayerSet.has(featureLayerId)) {
					topMarker = feature;
				} else if (
					!topEventFeature &&
					featureLayerId === MAPBOX_LAYER_IDS.eventsStarIcon
				) {
					topEventFeature = feature;
				} else if (!blobLayerHit && searchAreaHitLayerSet.has(featureLayerId)) {
					blobLayerHit = true;
				} else if (
					!topStateFeature &&
					featureLayerId === MAPBOX_LAYER_IDS.statesFillHit
				) {
					topStateFeature = feature;
				}
			}

			const markerLayerId = topMarker?.layer?.id;
			const rawMarkerId = topMarker?.id;
			const markerId =
				typeof rawMarkerId === 'number'
					? rawMarkerId
					: typeof rawMarkerId === 'string'
						? Number.parseInt(rawMarkerId, 10)
						: NaN;

			if (markerLayerId && Number.isFinite(markerId)) {
				const contact = getContactForHit(markerLayerId, markerId);
				const sourceId = getSourceForHitLayer(markerLayerId);
				if (contact && sourceId) {
					clearEmptyMapPrompt();
					clearEventHoverImmediate();
					setCursor('pointer');
					setMarkerVisualHover(sourceId, markerId);
					clearStateHover();
					if (
						zoom >= HOVER_INTERACTION_MIN_ZOOM &&
						(hoverSourceRef.current !== 'map' || hoveredMarkerIdRef.current !== markerId)
					) {
						handleMarkerMouseOver(
							contact,
							e.originalEvent as unknown as MouseEvent | TouchEvent
						);
					}
					return;
				}
			}

			clearMarkerVisualHover();
			const prevHovered = hoveredMarkerIdRef.current;
			if (hoverSourceRef.current === 'map' && prevHovered != null) {
				handleMarkerMouseOut(prevHovered);
			}
			setCursor('');

			// Event-star hover (independent of the contact/state hover machinery). Contacts
			// win ties because their branch returns above. Stop before the state-hover and
			// empty-map-prompt logic so a star hover doesn't also highlight the state under it.
			// (Same id extraction as getEventHit, on the partitioned feature.)
			const rawEventId = topEventFeature?.properties?.eventId;
			const parsedEventId =
				typeof rawEventId === 'number'
					? rawEventId
					: typeof rawEventId === 'string'
						? Number.parseInt(rawEventId, 10)
						: NaN;
			const eventHitId =
				Number.isFinite(parsedEventId) && eventCentersById.has(parsedEventId)
					? parsedEventId
					: null;
			if (eventHitId != null) {
				clearStateHover();
				clearEmptyMapPrompt();
				setCursor('pointer');
				setEventHover(eventHitId);
				return;
			}
			// Pointer left the star to empty map: don't close instantly — give the cursor a grace
			// window to reach the (interactive) popup box, whose onMouseEnter cancels this close.
			scheduleEventHoverClose();

			// Same semantics as isSearchAreaHit, using the partitioned layer hit
			// plus the CPU multipolygon fallback.
			const searchAreaHit =
				blobLayerHit ||
				(() => {
					const blobMultiPolygon = curatedBlobLngLatMultiPolygonRef.current;
					if (!blobMultiPolygon?.length) return false;
					return pointInMultiPolygon([e.lngLat.lng, e.lngLat.lat], blobMultiPolygon);
				})();
			if (searchAreaHit) {
				clearEmptyMapPrompt();
				clearStateHover();
				return;
			}
			if (emptyMapPromptEnabled && isActiveSearchSelectionHit(e)) {
				clearEmptyMapPrompt();
				clearStateHover();
				return;
			}

			// Optional state hover highlight (only when state interactions are enabled).
			if (!stateInteractionsEnabled || !isStateLayerReady) {
				clearStateHover();
				scheduleEmptyMapPrompt(e.point);
				return;
			}
			if (zoom > STATE_HOVER_HIGHLIGHT_MAX_ZOOM + 0.001) {
				clearStateHover();
				scheduleEmptyMapPrompt(e.point);
				return;
			}

			// If a marker is hovered, don't also hover-highlight the state underneath.
			if (hoverSourceRef.current === 'map' && hoveredMarkerIdRef.current != null) {
				clearStateHover();
				clearEmptyMapPrompt();
				return;
			}
			// While zooming-to-state after a state click (or while results are loading), don't show
			// hover overlays on other states as the camera sweeps.
			if (stateClickZoomInFlightRef.current || isLoadingRef.current) {
				clearStateHover();
				clearEmptyMapPrompt();
				return;
			}

			// The guards above mirror wantStateHit exactly, so reaching this point
			// means the states layer was part of the combined query.
			const nextStateId = topStateFeature?.id ?? null;
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
				clearEmptyMapPrompt();
				setCursor('pointer');
			} else {
				scheduleEmptyMapPrompt(e.point);
			}
		};

		// Run hover detection at most once per frame, using the latest pointer position.
		const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
			latestMouseMoveEvent = e;
			if (mouseMoveRafId != null) return;
			mouseMoveRafId = window.requestAnimationFrame(() => {
				mouseMoveRafId = null;
				const ev = latestMouseMoveEvent;
				latestMouseMoveEvent = null;
				if (ev) processMouseMove(ev);
			});
		};

		const onMouseDown = (e: mapboxgl.MapMouseEvent) => {
			emptyMapPointerDownClientRef.current = getClientPointFromDomEvent(e.originalEvent);
			clearEmptyMapPrompt();
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

			// Click on an event star pins its popup open (toggle). Returning here also stops
			// the generic empty-map handling below from firing for star clicks.
			const eventClickId = getEventHit(e);
			if (eventClickId != null) {
				setPinnedEventId((prev) => (prev === eventClickId ? null : eventClickId));
				setEventHover(eventClickId);
				return;
			}

			// Clicks inside curated blobs are intentional search-result interactions, not
			// empty-map clicks that should disengage the current search.
			if (isSearchAreaHit(e)) {
				clearEmptyMapPrompt();
				clearStateHover();
				return;
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

			const downClient = emptyMapPointerDownClientRef.current;
			emptyMapPointerDownClientRef.current = null;
			const upClient = getClientPointFromDomEvent(e.originalEvent);
			const movedAfterPointerDown = Boolean(
				downClient &&
				upClient &&
				(Math.abs(downClient.x - upClient.x) >= 6 ||
					Math.abs(downClient.y - upClient.y) >= 6)
			);

			// Click on empty map clears any selected marker panel and dismisses a pinned
			// event popup.
			setSelectedMarker(null);
			setPinnedEventId(null);

			if (emptyMapPromptEnabled && isActiveSearchSelectionHit(e)) {
				clearEmptyMapPrompt();
				clearStateHover();
				return;
			}

			if (
				!movedAfterPointerDown &&
				emptyMapPromptEnabled &&
				onEmptyMapClick &&
				!shouldSuppressEmptyMapPrompt()
			) {
				clearEmptyMapPrompt();
				onEmptyMapClick();
			}
		};

		map.on('mousedown', onMouseDown);
		map.on('mousemove', onMouseMove);
		map.on('click', onClick);
		const canvas = map.getCanvas();
		const isInsideHoverTooltip = (event: MouseEvent): boolean => {
			// Street-view cards are interactive, so moving from the canvas into them keeps
			// hover alive. The slim SVG tooltip is intentionally excluded so it does not
			// block hovering markers that sit behind/above it.
			for (const tooltipEl of [
				streetCardOverlayRef.current,
				streetCardsContainerRef.current,
			]) {
				if (!tooltipEl) continue;

				const relatedTarget = event.relatedTarget;
				if (relatedTarget instanceof Node && tooltipEl.contains(relatedTarget)) {
					return true;
				}

				const pointTarget = tooltipEl.ownerDocument.elementFromPoint(
					event.clientX,
					event.clientY
				);
				if (pointTarget && tooltipEl.contains(pointTarget)) return true;
			}
			return false;
		};
		const onCanvasMouseLeave = (event: MouseEvent) => {
			if (isInsideHoverTooltip(event)) return;
			clearEmptyMapPrompt();
			clearMarkerVisualHover();
			setSelectedTooltipHoverHiddenTargetIfChanged(null);
			// Schedule (don't force) the popup close: if the cursor is leaving the canvas to
			// enter the popup box, the box's onMouseEnter cancels this before it fires.
			scheduleEventHoverClose();
			const prevHovered = hoveredMarkerIdRef.current;
			if (hoverSourceRef.current === 'map' && prevHovered != null) {
				handleMarkerMouseOut(prevHovered);
			}
			setCursor('');
		};
		canvas.addEventListener('mouseleave', onCanvasMouseLeave);

		return () => {
			map.off('mousedown', onMouseDown);
			map.off('mousemove', onMouseMove);
			if (mouseMoveRafId != null) window.cancelAnimationFrame(mouseMoveRafId);
			map.off('click', onClick);
			canvas.removeEventListener('mouseleave', onCanvasMouseLeave);
			try {
				map.getCanvas().style.cursor = '';
			} catch {
				// Ignore.
			}
			clearMarkerVisualHover();
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
		contactsWithCoordsById,
		bookingExtraContactsById,
		promotionOverlayContactsById,
		allOverlayContactsById,
		clearEmptyMapPrompt,
		scheduleEmptyMapPrompt,
		shouldSuppressEmptyMapPrompt,
		emptyMapPromptEnabled,
		onEmptyMapClick,
		handleMarkerMouseOver,
		handleMarkerMouseOut,
		handleMarkerClick,
		eventCentersById,
		suppressEventPopups,
		setEventHover,
		clearEventHoverImmediate,
		scheduleEventHoverClose,
		updateSelectedTooltipHoverHiddenTarget,
		setSelectedTooltipHoverHiddenTargetIfChanged,
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
		(
			imageName: string,
			url: string,
			dimensions: { width: number; height: number } = {
				width: MAP_MARKER_PIN_VIEWBOX_WIDTH,
				height: MAP_MARKER_PIN_VIEWBOX_HEIGHT,
			}
		): Promise<void> => {
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
							const w = dimensions.width * scale;
							const h = dimensions.height * scale;
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
	const selectedCategorizedContactMarkerAssetCacheRef = useRef<
		Map<
			string,
			{
				imageName: string;
				url: string;
				hoverImageName: string;
				hoverUrl: string;
			}
		>
	>(new Map());
	const getSelectedCategorizedContactMarkerAssets = useCallback(
		(accentColor: string) => {
			const key = accentColor.trim();
			const cached = selectedCategorizedContactMarkerAssetCacheRef.current.get(key);
			if (cached) return cached;

			const url = generateSelectedCategorizedContactMarkerIconUrl(key);
			const hoverColor = darkenHexColor(key, MARKER_HOVER_DARKEN_AMOUNT);
			const hoverUrl = generateSelectedCategorizedContactMarkerIconUrl(
				hoverColor,
				hoverColor
			);
			const assets = {
				imageName: imageNameFromUrl(url),
				url,
				hoverImageName: imageNameFromUrl(hoverUrl),
				hoverUrl,
			};
			selectedCategorizedContactMarkerAssetCacheRef.current.set(key, assets);
			return assets;
		},
		[imageNameFromUrl]
	);

	const uncategorizedContactMarkerUrl = useMemo(
		() => generateUncategorizedContactMarkerIconUrl(),
		[]
	);
	const uncategorizedContactMarkerHoverUrl = useMemo(
		() =>
			generateUncategorizedContactMarkerIconUrl(
				darkenHexColor('#5BB6DD', MARKER_HOVER_DARKEN_AMOUNT)
			),
		[]
	);
	const uncategorizedContactMarkerImageName = useMemo(
		() => imageNameFromUrl(uncategorizedContactMarkerUrl),
		[imageNameFromUrl, uncategorizedContactMarkerUrl]
	);
	const uncategorizedContactMarkerHoverImageName = useMemo(
		() => imageNameFromUrl(uncategorizedContactMarkerHoverUrl),
		[imageNameFromUrl, uncategorizedContactMarkerHoverUrl]
	);
	const selectedUncategorizedContactMarkerUrl = useMemo(
		() => generateSelectedUncategorizedContactMarkerIconUrl(),
		[]
	);
	const selectedUncategorizedContactMarkerHoverUrl = useMemo(
		() => {
			const hoverColor = darkenHexColor('#50A5C9', MARKER_HOVER_DARKEN_AMOUNT);
			return generateSelectedUncategorizedContactMarkerIconUrl(hoverColor, hoverColor);
		},
		[]
	);
	const selectedUncategorizedContactMarkerImageName = useMemo(
		() => imageNameFromUrl(selectedUncategorizedContactMarkerUrl),
		[imageNameFromUrl, selectedUncategorizedContactMarkerUrl]
	);
	const selectedUncategorizedContactMarkerHoverImageName = useMemo(
		() => imageNameFromUrl(selectedUncategorizedContactMarkerHoverUrl),
		[imageNameFromUrl, selectedUncategorizedContactMarkerHoverUrl]
	);

	useEffect(() => {
		if (!map || !isMapLoaded) return;
		void ensureMapImageFromUrl(
			uncategorizedContactMarkerImageName,
			uncategorizedContactMarkerUrl
		);
		void ensureMapImageFromUrl(
			uncategorizedContactMarkerHoverImageName,
			uncategorizedContactMarkerHoverUrl
		);
	}, [
		map,
		isMapLoaded,
		ensureMapImageFromUrl,
		uncategorizedContactMarkerImageName,
		uncategorizedContactMarkerUrl,
		uncategorizedContactMarkerHoverImageName,
		uncategorizedContactMarkerHoverUrl,
	]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const selectedMarkerDimensions = {
			width: SELECTED_CONTACT_MARKER_VIEWBOX_WIDTH,
			height: SELECTED_CONTACT_MARKER_VIEWBOX_HEIGHT,
		};
		void ensureMapImageFromUrl(
			selectedUncategorizedContactMarkerImageName,
			selectedUncategorizedContactMarkerUrl,
			selectedMarkerDimensions
		);
		void ensureMapImageFromUrl(
			selectedUncategorizedContactMarkerHoverImageName,
			selectedUncategorizedContactMarkerHoverUrl,
			selectedMarkerDimensions
		);
	}, [
		map,
		isMapLoaded,
		ensureMapImageFromUrl,
		selectedUncategorizedContactMarkerImageName,
		selectedUncategorizedContactMarkerUrl,
		selectedUncategorizedContactMarkerHoverImageName,
		selectedUncategorizedContactMarkerHoverUrl,
	]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;
		void ensureMapImageFromUrl(
			OWNED_VENUE_HOME_ICON_IMAGE_NAME,
			OWNED_VENUE_HOME_ICON_URL,
			OWNED_VENUE_HOME_ICON_IMAGE_DIMENSIONS
		);
		void ensureMapImageFromUrl(
			EVENT_STAR_ICON_IMAGE_NAME,
			EVENT_STAR_ICON_URL,
			EVENT_STAR_ICON_IMAGE_DIMENSIONS
		);
		void ensureMapImageFromUrl(
			CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_NAME,
			CAMPAIGN_FOOTPRINT_SPARK_ICON_URL,
			CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_DIMENSIONS
		);
	}, [map, isMapLoaded, ensureMapImageFromUrl]);

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
	const hoveredMarkerVisualRef = useRef<{ sourceId: string; id: number } | null>(null);
	const markerConstellationEdgesRef = useRef<MarkerConstellationEdge[]>([]);
	const markerConstellationUsesCategoryColorsRef = useRef<boolean>(false);
	const markerConstellationNodesRef = useRef<MarkerConstellationNode[]>([]);
	const markerConstellationContactsByIdRef = useRef<Map<number, ContactWithName>>(
		new Map()
	);
	const selectedMarkerFadeRafRef = useRef<number | null>(null);
	const selectedMarkerFadeByIdRef = useRef<Map<number, number>>(new Map());
	const selectedMarkerScaleByIdRef = useRef<Map<number, number>>(new Map());
	const selectedMarkerFeatureByIdRef = useRef<Map<number, any>>(new Map());
	// Signature of the last-built selected-marker feature set (selected ids + coords +
	// styling, NOT zoom). Lets the selected-marker effect no-op pure-zoom re-runs so
	// selected halos don't re-animate/flicker when zooming.
	const selectedMarkerBuildSignatureRef = useRef<string>('');
	// Ref mirrors of the overlay arrays so the selected-marker effect can read them
	// without listing them as deps (they get fresh references on every zoom, which
	// would otherwise re-trigger the fade animation on each zoom).
	const bookingExtraVisibleContactsRef = useRef<ContactWithName[]>([]);
	const promotionOverlayVisibleContactsRef = useRef<ContactWithName[]>([]);
	const allContactsOverlayVisibleContactsRef = useRef<ContactWithName[]>([]);
	useEffect(() => {
		bookingExtraVisibleContactsRef.current = bookingExtraVisibleContacts;
		promotionOverlayVisibleContactsRef.current = promotionOverlayVisibleContacts;
		allContactsOverlayVisibleContactsRef.current = allContactsOverlayVisibleContacts;
	}, [
		bookingExtraVisibleContacts,
		promotionOverlayVisibleContacts,
		allContactsOverlayVisibleContacts,
	]);
	const selectedConstellationLineFadeRafRef = useRef<number | null>(null);
	const selectedConstellationLineOpacityRef = useRef<number>(1);
	const selectedConstellationHadPathRef = useRef<boolean>(false);
	const selectedConstellationEdgesRef = useRef<MarkerConstellationEdgeSeed[]>([]);
	const selectedConstellationGraphKeyRef = useRef<string>('');
	const markerConstellationNodeIdsRef = useRef<Set<number>>(new Set());
	const markerConstellationLastSearchKeyRef = useRef<string>((searchQuery ?? '').trim());
	const markerConstellationComposedSearchKeyRef = useRef<string>('');
	const markerConstellationRevealCancelRef = useRef<(() => void) | null>(null);
	const markerConstellationRevealDoneRef = useRef<boolean>(true);
	const markerConstellationLastDataKeyRef = useRef<string>('');
	const markerConstellationIsStatusModeRef = useRef<boolean>(false);
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
					getCategorizedDotGlowZoomFadedOpacity(getNormalMarkerFadeOpacityExpr())
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
					withFeatureFillOpacity(
						getCategorizedDotZoomFadedOpacity(getNormalMarkerFadeOpacityExpr())
					)
				);
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-stroke-opacity',
					withFeatureStrokeOpacity(
						getCategorizedDotZoomFadedOpacity(getNormalMarkerFadeOpacityExpr())
					)
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
					getSelectedStateOrbZoomFadedOpacity(1, getNormalMarkerFadeOpacityExpr())
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
				const visibilityFilter = buildBaseMarkerVisibilityFilter(
					visibleIds,
					map.getZoom() ?? 0,
					campaignFootprintContactIdSet
				);
				map.setFilter(MAPBOX_LAYER_IDS.baseHit, visibilityFilter);
			}
		} catch {
			// Ignore style timing races.
		}
	}, [map, isMapLoaded, campaignFootprintContactIdSet]);

	// Status mode renders every contact as a campaign-status dot, so the soft glow
	// halos beneath them read as fuzzy "residue" around the crisp status circles.
	// Hide those glow layers while in status mode; restore them for category mode.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const hideStatusGlow = campaignMarkerMode === 'status';
		const glowLayerIds = [
			MAPBOX_LAYER_IDS.baseGlow,
			MAPBOX_LAYER_IDS.markerConstellationNodeGlow,
		];
		for (const layerId of glowLayerIds) {
			if (!map.getLayer(layerId)) continue;
			try {
				map.setLayoutProperty(layerId, 'visibility', hideStatusGlow ? 'none' : 'visible');
			} catch {
				// Ignore style timing races.
			}
		}
		// The campaign heatmap glow is the colored replacement for that white halo,
		// so it shows exactly when the per-dot glow hides (status mode only).
		if (map.getLayer(MAPBOX_LAYER_IDS.campaignHeatmapGlow)) {
			try {
				map.setLayoutProperty(
					MAPBOX_LAYER_IDS.campaignHeatmapGlow,
					'visibility',
					hideStatusGlow ? 'visible' : 'none'
				);
			} catch {
				// Ignore style timing races.
			}
		}
	}, [map, isMapLoaded, campaignMarkerMode]);

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

	const clearMarkerConstellation = useCallback(
		(includeSelected = true) => {
			stopMarkerConstellationReveal();
			markerConstellationEdgesRef.current = [];
			markerConstellationUsesCategoryColorsRef.current = false;
			markerConstellationNodesRef.current = [];
			markerConstellationContactsByIdRef.current = new Map();
			markerConstellationNodeIdsRef.current = new Set();
			markerConstellationComposedSearchKeyRef.current = '';
			markerConstellationRevealDoneRef.current = true;
			markerConstellationLastDataKeyRef.current = '';
			markerConstellationIsStatusModeRef.current = false;
			setMarkerConstellationCompositionNonce((value) => value + 1);
			setMarkerConstellationLineOpacity(0, 0, 0);
			if (!map || !isMapLoaded) return;
			const lineSource = map.getSource(MAPBOX_SOURCE_IDS.markerConstellation) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const selectedLineSource = map.getSource(
				MAPBOX_SOURCE_IDS.markerConstellationSelected
			) as mapboxgl.GeoJSONSource | undefined;
			const nodeSource = map.getSource(MAPBOX_SOURCE_IDS.markerConstellationNodes) as
				| mapboxgl.GeoJSONSource
				| undefined;
			try {
				const empty = { type: 'FeatureCollection', features: [] } as any;
				lineSource?.setData(empty);
				if (includeSelected) selectedLineSource?.setData(empty);
				nodeSource?.setData(empty);
			} catch {
				// Ignore style timing races.
			}
		},
		[map, isMapLoaded, stopMarkerConstellationReveal, setMarkerConstellationLineOpacity]
	);

	const writeMarkerConstellationSourceData = useCallback(
		(contactsForVisibility?: ContactWithName[]): void => {
			if (!map || !isMapLoaded) return;
			const source = map.getSource(MAPBOX_SOURCE_IDS.markerConstellation) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const selectedLineSource = map.getSource(
				MAPBOX_SOURCE_IDS.markerConstellationSelected
			) as mapboxgl.GeoJSONSource | undefined;
			const nodeSource = map.getSource(MAPBOX_SOURCE_IDS.markerConstellationNodes) as
				| mapboxgl.GeoJSONSource
				| undefined;
			if (!source && !selectedLineSource && !nodeSource) return;

			const contactsById =
				contactsForVisibility != null
					? new Map<number, ContactWithName>(
							contactsForVisibility.map((contact) => [contact.id, contact])
						)
					: markerConstellationContactsByIdRef.current;
			const selectedSet = new Set<number>(selectedContacts);

			const features: any[] = [];
			const dataKeyParts: string[] = [];
			for (const edge of markerConstellationEdgesRef.current) {
				if (selectedSet.has(edge.fromId) || selectedSet.has(edge.toId)) continue;
				const fromContact = contactsById.get(edge.fromId);
				const toContact = contactsById.get(edge.toId);
				if (!fromContact || !toContact) continue;

				const fromCoords = getContactCoords(fromContact);
				const toCoords = getContactCoords(toContact);
				if (!fromCoords || !toCoords) continue;

				let lineColor: string | null = null;
				let lineGlowColor: string | null = null;
				let useSelectedLineWidth = false;
				const campaignStatusLineStyle = getCampaignStatusLineStyleForContacts(
					fromContact.id,
					toContact.id
				);
				if (campaignStatusLineStyle) {
					lineColor = campaignStatusLineStyle.lineColor;
					lineGlowColor = campaignStatusLineStyle.lineColor;
					useSelectedLineWidth = true;
				}
				if (
					!campaignStatusLineStyle &&
					markerConstellationUsesCategoryColorsRef.current
				) {
					const fromCategory = fromContact.curatedCategory ?? null;
					const toCategory = toContact.curatedCategory ?? null;
					const fromCategoryKey = fromCategory
						? normalizeWhatKey(fromCategory)
						: '__general__';
					const toCategoryKey = toCategory ? normalizeWhatKey(toCategory) : '__general__';
					if (fromCategoryKey === toCategoryKey) {
						lineColor = fromCategory
							? getResultDotColorForWhat(fromCategory)
							: GENERAL_CONTACT_CONSTELLATION_LINE_COLOR;
						lineGlowColor = fromCategory ? lineColor : MARKER_CONSTELLATION_HALO_COLOR;
					}
				}

				const rank = useSelectedLineWidth ? 0 : edge.rank;
				const opacityScale = useSelectedLineWidth ? 1 : edge.opacityScale;
				const edgeId = markerConstellationPairKey(edge.fromId, edge.toId);
				const featureId = `${edge.level}:${edgeId}`;
				dataKeyParts.push(
					`e:${featureId}:${lineColor ?? ''}:${useSelectedLineWidth ? 'selected' : 'normal'}:${rank.toFixed(3)}:${opacityScale.toFixed(2)}`
				);
				features.push({
					type: 'Feature',
					id: featureId,
					properties: {
						level: edge.level,
						rank,
						opacityScale,
						...(lineColor
							? {
									lineColor,
									lineGlowColor: lineGlowColor ?? lineColor,
									useSelectedLineWidth,
								}
							: {}),
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
				if (selectedSet.has(node.id)) continue;
				const contact = contactsById.get(node.id);
				if (!contact) continue;
				const coords = getContactCoords(contact);
				if (!coords) continue;
				const isOutsideLockedState = hasLockedStateSelection
					? !isCoordsInLockedState(coords)
					: false;
				const whatForContact = contact.curatedCategory ?? searchWhat ?? null;
				const statusMarkerStyle = getCampaignStatusMarkerStyleForContact(contact.id);
				const baseFillColor =
					statusMarkerStyle?.fillColor ?? getResultDotColorForWhat(whatForContact);
				const fillColor = isOutsideLockedState
					? washOutHexColor(baseFillColor, OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE)
					: baseFillColor;
				const strokeColor =
					statusMarkerStyle?.strokeColor ?? MARKER_CONSTELLATION_HALO_COLOR;
				const strokeWidth = statusMarkerStyle?.strokeWidth;
				const strokeOpacity = statusMarkerStyle?.strokeOpacity;
				const radiusScale = statusMarkerStyle?.radiusScale;
				const fillOpacity = statusMarkerStyle?.fillOpacity;
				const featureId = `${node.level}:${node.id}`;
				dataKeyParts.push(
					`n:${featureId}:${fillColor}:${strokeColor}:${strokeWidth ?? ''}:${
						strokeOpacity ?? ''
					}:${radiusScale ?? ''}:${node.rank.toFixed(3)}:${node.opacityScale.toFixed(2)}`
				);
				nodeFeatures.push({
					type: 'Feature',
					id: featureId,
					properties: {
						fillColor,
						strokeColor,
						...(strokeWidth != null ? { strokeWidth } : {}),
						...(strokeOpacity != null ? { strokeOpacity } : {}),
						...(radiusScale != null ? { radiusScale } : {}),
						...(fillOpacity != null ? { fillOpacity } : {}),
						level: node.level,
						rank: node.rank,
						opacityScale: node.opacityScale,
					},
					geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
				});
			}

			const selectedPointById = new Map<number, LatLngLiteral>();
			const addSelectedPoint = (
				contact: ContactWithName,
				coords: LatLngLiteral | null
			) => {
				if (!selectedSet.has(contact.id)) return;
				if (!coords) return;
				if (selectedPointById.has(contact.id)) return;
				selectedPointById.set(contact.id, coords);
			};
			if (selectedSet.size >= 2) {
				for (const contact of contactsById.values()) {
					addSelectedPoint(contact, getContactCoords(contact));
				}
				for (const contact of contactsWithCoords) {
					addSelectedPoint(contact, getContactCoords(contact));
				}
				for (const contact of bookingExtraVisibleContacts) {
					addSelectedPoint(contact, getBookingExtraContactCoords(contact));
				}
				for (const contact of promotionOverlayVisibleContacts) {
					addSelectedPoint(contact, getPromotionOverlayContactCoords(contact));
				}
				for (const contact of allContactsOverlayVisibleContacts) {
					addSelectedPoint(contact, getAllContactsOverlayContactCoords(contact));
				}
			}

			const selectedLineFeatures: any[] = [];
			const selectedPointSeeds: Array<{ id: number; coords: LatLngLiteral }> = [];
			const seenSelectedIds = new Set<number>();
			for (const id of selectedContacts) {
				if (seenSelectedIds.has(id)) continue;
				seenSelectedIds.add(id);
				const selectedCoords = selectedPointById.get(id);
				if (!selectedCoords) continue;
				selectedPointSeeds.push({ id, coords: selectedCoords });
			}
			selectedPointSeeds.sort((a, b) => a.id - b.id);

			if (selectedPointSeeds.length < 2) {
				selectedConstellationEdgesRef.current = [];
				selectedConstellationGraphKeyRef.current = '';
			} else {
				const selectedGraphKey = selectedPointSeeds
					.map((point) =>
						[point.id, point.coords.lng.toFixed(5), point.coords.lat.toFixed(5)].join(':')
					)
					.join(',');

				if (selectedConstellationGraphKeyRef.current !== selectedGraphKey) {
					let selectedComposeZoom = MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM;
					try {
						selectedComposeZoom = Math.max(
							MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM,
							map.getZoom() ?? MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM
						);
					} catch {
						selectedComposeZoom = MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM;
					}
					if (!Number.isFinite(selectedComposeZoom)) {
						selectedComposeZoom = MARKER_CONSTELLATION_MIN_COMPOSE_ZOOM;
					}

					const selectedWorldSize = 512 * Math.pow(2, selectedComposeZoom);
					const selectedGraphPoints: MarkerConstellationPoint[] = [];
					for (const point of selectedPointSeeds) {
						const projected = latLngToWorldPixel(point.coords, selectedWorldSize);
						if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
							continue;
						}
						selectedGraphPoints.push({
							id: point.id,
							coords: point.coords,
							x: projected.x,
							y: projected.y,
							groupKey: 'selected',
						});
					}

					const selectedGraphSeed = hashStringToUint32(selectedGraphKey).toString(36);
					selectedConstellationEdgesRef.current = buildSelectedMarkerConstellationEdges(
						selectedGraphPoints,
						`selected|${selectedGraphPoints.length}|${selectedGraphSeed}`
					);
					selectedConstellationGraphKeyRef.current = selectedGraphKey;
				}

				for (const edge of selectedConstellationEdgesRef.current) {
					const fromCoords = selectedPointById.get(edge.fromId);
					const toCoords = selectedPointById.get(edge.toId);
					if (!fromCoords || !toCoords) continue;

					const edgeIndex = selectedLineFeatures.length;
					const edgeId = markerConstellationPairKey(edge.fromId, edge.toId);
					const featureId = `selected:${edgeIndex}:${edgeId}`;
					dataKeyParts.push(`s:${featureId}`);
					selectedLineFeatures.push({
						type: 'Feature',
						id: featureId,
						properties: {
							selectedLineOpacity: selectedConstellationLineOpacityRef.current,
							// Campaign status mode recolors the selected lines blue to match the
							// blue selected circles (dashboard pick-flow keeps the white lines).
							statusMode: campaignMarkerMode === 'status',
							fromId: edge.fromId,
							toId: edge.toId,
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
			}

			const dataKey = dataKeyParts.join(',');
			markerConstellationLastDataKeyRef.current = dataKey;

			try {
				source?.setData({ type: 'FeatureCollection', features } as any);
				selectedLineSource?.setData({
					type: 'FeatureCollection',
					features: selectedLineFeatures,
				} as any);
				nodeSource?.setData({ type: 'FeatureCollection', features: nodeFeatures } as any);
			} catch {
				// Ignore style timing races.
			}
		},
		[
			map,
			isMapLoaded,
			selectedContacts,
			contactsWithCoords,
			bookingExtraVisibleContacts,
			promotionOverlayVisibleContacts,
			allContactsOverlayVisibleContacts,
			getCampaignStatusLineStyleForContacts,
			getCampaignStatusMarkerStyleForContact,
			getContactCoords,
			getBookingExtraContactCoords,
			getPromotionOverlayContactCoords,
			getAllContactsOverlayContactCoords,
			lockedStateKey,
			isCoordsInLockedState,
			searchWhat,
			campaignMarkerMode,
		]
	);

	useEffect(() => {
		if (!map || !isMapLoaded) return;

		if (selectedConstellationLineFadeRafRef.current != null) {
			cancelAnimationFrame(selectedConstellationLineFadeRafRef.current);
			selectedConstellationLineFadeRafRef.current = null;
		}

		const hasSelectedPath = selectedContacts.length >= 2;
		const hadSelectedPath = selectedConstellationHadPathRef.current;
		selectedConstellationHadPathRef.current = hasSelectedPath;

		if (!hasSelectedPath) {
			selectedConstellationLineOpacityRef.current = 0;
			writeMarkerConstellationSourceData();
			return;
		}

		if (hadSelectedPath) {
			selectedConstellationLineOpacityRef.current = 1;
			writeMarkerConstellationSourceData();
			return;
		}

		let cancelled = false;
		const start = performance.now();
		const durationMs = 220;

		const tick = (now: number) => {
			if (cancelled) return;
			const rawT = clamp((now - start) / durationMs, 0, 1);
			const easedT = 1 - Math.pow(1 - rawT, 3);
			selectedConstellationLineOpacityRef.current = easedT;
			writeMarkerConstellationSourceData();

			if (rawT < 1) {
				selectedConstellationLineFadeRafRef.current = requestAnimationFrame(tick);
			} else {
				selectedConstellationLineFadeRafRef.current = null;
			}
		};

		selectedConstellationLineOpacityRef.current = 0;
		writeMarkerConstellationSourceData();
		selectedConstellationLineFadeRafRef.current = requestAnimationFrame(tick);

		return () => {
			cancelled = true;
			if (selectedConstellationLineFadeRafRef.current != null) {
				cancelAnimationFrame(selectedConstellationLineFadeRafRef.current);
				selectedConstellationLineFadeRafRef.current = null;
			}
		};
	}, [map, isMapLoaded, selectedContacts, writeMarkerConstellationSourceData]);

	const startMarkerConstellationReveal = useCallback(() => {
		stopMarkerConstellationReveal();

		if (!map || !isMapLoaded) return;
		if (markerConstellationEdgesRef.current.length === 0) {
			markerConstellationRevealDoneRef.current = true;
			setMarkerConstellationLineOpacity(0, 0, 0);
			return;
		}

		markerConstellationRevealDoneRef.current = true;
		const coreOpacity = markerConstellationIsStatusModeRef.current
			? CAMPAIGN_STATUS_CONSTELLATION_CORE_OPACITY
			: MARKER_CONSTELLATION_CORE_OPACITY;
		const glowOpacity = markerConstellationIsStatusModeRef.current
			? CAMPAIGN_STATUS_CONSTELLATION_GLOW_OPACITY
			: MARKER_CONSTELLATION_GLOW_OPACITY;
		setMarkerConstellationLineOpacity(
			coreOpacity,
			glowOpacity,
			MARKER_CONSTELLATION_REVEAL_FADE_MS
		);
		return;
	}, [
		map,
		isMapLoaded,
		stopMarkerConstellationReveal,
		setMarkerConstellationLineOpacity,
	]);

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

		if (!searchEngaged) {
			if (baseDotsWaveCancelRef.current) {
				baseDotsWaveCancelRef.current();
				baseDotsWaveCancelRef.current = null;
			}
			baseDotsWaveMetaRef.current = null;
			baseDotsLastDataKeyRef.current = '';
			source.setData({ type: 'FeatureCollection', features: [] } as any);
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
			hoverFillColor: string;
			fillOpacity: number;
			strokeColor: string;
			strokeWidth: number;
			strokeOpacity: number;
			radiusScale: number;
			isCurated: boolean;
			isUncategorized: boolean;
			isVenue: boolean;
			statusMode: boolean;
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
			const statusMarkerStyle = getCampaignStatusMarkerStyleForContact(contact.id);
			const isUncategorized = statusMarkerStyle
				? false
				: !isCleanMapMarkerCategory(whatForContact);
			const isVenue = contact.venueId != null;
			const baseFillColor =
				statusMarkerStyle?.fillColor ?? getResultDotColorForWhat(whatForContact);
			const fillColor = isOutsideLockedState
				? washOutHexColor(baseFillColor, OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE)
				: baseFillColor;
			dots.push({
				id: contact.id,
				lng: coords.lng,
				lat: coords.lat,
				fillColor,
				// Status markers keep their fill on hover (darkening a near-white
				// "contacts" dot makes it vanish into the light map); they grow
				// instead. Non-status (search/category) dots keep the darken cue.
				hoverFillColor: statusMarkerStyle ? fillColor : darkenHexColor(fillColor),
				strokeColor:
					statusMarkerStyle?.strokeColor ?? RESULT_DOT_TRANSPARENT_STROKE_COLOR,
				strokeWidth: statusMarkerStyle?.strokeWidth ?? 0,
				strokeOpacity: statusMarkerStyle?.strokeOpacity ?? 0,
				fillOpacity: statusMarkerStyle?.fillOpacity ?? 1,
				radiusScale: isVenue
					? VENUE_DOT_RADIUS_SCALE
					: (statusMarkerStyle?.radiusScale ?? 1),
				isCurated: statusMarkerStyle ? false : Boolean(contact.curatedCategory),
				isUncategorized,
				isVenue,
				statusMode: Boolean(statusMarkerStyle),
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
				d.strokeColor +
				':' +
				d.strokeWidth +
				':' +
				d.strokeOpacity +
				':' +
				d.radiusScale +
				':' +
				(d.isUncategorized ? 'u' : 'c') +
				':' +
				(d.isVenue ? 'v' : 'n') +
				':' +
				(d.statusMode ? 's' : 'n') +
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
					hoverFillColor: dot.hoverFillColor,
					fillOpacity: dot.fillOpacity,
					strokeColor: dot.strokeColor,
					strokeWidth: dot.strokeWidth,
					strokeOpacity: dot.strokeOpacity,
					radiusScale: dot.radiusScale,
					[DOT_WAVE_DELAY_PROP]: delayMs,
					isCurated: dot.isCurated,
					isUncategorized: dot.isUncategorized,
					isVenue: dot.isVenue,
					statusMode: dot.statusMode,
					fadeWithSelectedStateOrb: dot.fadeWithSelectedStateOrb,
					fallbackIcon: dot.isUncategorized ? uncategorizedContactMarkerImageName : '',
					fallbackIconHover: dot.isUncategorized
						? uncategorizedContactMarkerHoverImageName
						: '',
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
						withFeatureFillOpacity(withCategorizedDotOpacity(expr0))
					);
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.baseDots,
						'circle-stroke-opacity',
						withFeatureStrokeOpacity(expr0)
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
		searchEngaged,
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
		getCampaignStatusMarkerStyleForContact,
		stopBaseDotsWaveAndRestoreSteadyRendering,
		uncategorizedContactMarkerImageName,
		uncategorizedContactMarkerHoverImageName,
	]);

	// Selected marker artwork. This source is separate from the normal dot/pin sources so
	// selected contacts can swap to the bespoke halo markers without rebuilding every marker.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.markersSelected) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;

		// Nothing selected: hard-clear the bespoke selected-marker source and cancel any
		// in-flight fade. This must run BEFORE the isLoading / signature short-circuits below.
		// When the selection empties during a refetch (e.g. right after "Add Contacts"
		// invalidates queries) or while a fade-out is interrupted, those short-circuits
		// otherwise strand phantom halo rings on the map with nothing selected.
		if (selectedContacts.length === 0) {
			if (selectedMarkerFadeRafRef.current != null) {
				cancelAnimationFrame(selectedMarkerFadeRafRef.current);
				selectedMarkerFadeRafRef.current = null;
			}
			selectedMarkerFadeByIdRef.current.clear();
			selectedMarkerScaleByIdRef.current.clear();
			selectedMarkerFeatureByIdRef.current = new Map();
			selectedMarkerBuildSignatureRef.current = '';
			source.setData({ type: 'FeatureCollection', features: [] } as any);
			return;
		}

		if (isLoading) {
			// Preserve existing selected markers while parent data is refetching.
			return;
		}

		// Campaign status mode (Write/Drafts/Inbox) renders selection as the bigger
		// blue circle on the base dot itself — keep this bespoke halo artwork cleared
		// so it never fades the base dot out (its selectedMarkerT) or overlays the
		// dashboard pick-flow halo on top of the status-colored markers.
		if (
			campaignMarkerMode === 'status' ||
			(!searchEngaged && !isAmbientContactsEnabled)
		) {
			if (selectedMarkerFadeRafRef.current != null) {
				cancelAnimationFrame(selectedMarkerFadeRafRef.current);
				selectedMarkerFadeRafRef.current = null;
			}
			selectedMarkerFadeByIdRef.current.clear();
			selectedMarkerScaleByIdRef.current.clear();
			selectedMarkerFeatureByIdRef.current = new Map();
			selectedMarkerBuildSignatureRef.current = '';
			source.setData({ type: 'FeatureCollection', features: [] } as any);
			return;
		}

		let cancelled = false;

		const run = async () => {
			const selectedSet = new Set<number>(selectedContacts);
			const seenIds = new Set<number>();
			const nextSelectedFeaturesById = new Map<number, any>();
			const selectedMarkerImagesToEnsure = new Map<string, string>();
			const fadeWithSelectedStateOrb = Boolean(
				lockedStateKey &&
				lockedStateSelectionKeyRef.current === lockedStateKey &&
				selectedStateMorphSourceRef.current
			);

			const addSelectedMarker = (
				contact: ContactWithName,
				coords: LatLngLiteral | null,
				whatForMarker?: string | null
			) => {
				if (!selectedSet.has(contact.id)) return;
				if (seenIds.has(contact.id)) return;
				if (!coords) return;

				const isUncategorized = !isCleanMapMarkerCategory(whatForMarker);
				const selectedIconAssets = isUncategorized
					? {
							imageName: selectedUncategorizedContactMarkerImageName,
							url: selectedUncategorizedContactMarkerUrl,
							hoverImageName: selectedUncategorizedContactMarkerHoverImageName,
							hoverUrl: selectedUncategorizedContactMarkerHoverUrl,
						}
					: getSelectedCategorizedContactMarkerAssets(
							getResultDotColorForWhat(whatForMarker)
						);
				selectedMarkerImagesToEnsure.set(
					selectedIconAssets.imageName,
					selectedIconAssets.url
				);
				selectedMarkerImagesToEnsure.set(
					selectedIconAssets.hoverImageName,
					selectedIconAssets.hoverUrl
				);
				seenIds.add(contact.id);
				nextSelectedFeaturesById.set(contact.id, {
					type: 'Feature',
					id: contact.id,
					properties: {
						selectedIcon: selectedIconAssets.imageName,
						selectedIconHover: selectedIconAssets.hoverImageName,
						isUncategorized,
						fadeWithSelectedStateOrb,
					},
					geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
				});
			};

			for (const contact of contactsWithCoords) {
				addSelectedMarker(
					contact,
					getContactCoords(contact),
					contact.curatedCategory ?? searchWhat ?? null
				);
			}

			// Read overlay arrays from refs (not the effect deps) so zoom-driven overlay
			// resamples don't re-trigger this effect and restart the fade animation.
			for (const contact of bookingExtraVisibleContactsRef.current) {
				addSelectedMarker(
					contact,
					getBookingExtraContactCoords(contact),
					getBookingTitlePrefixFromContactTitle(contact.title) ?? null
				);
			}

			for (const contact of promotionOverlayVisibleContactsRef.current) {
				addSelectedMarker(
					contact,
					getPromotionOverlayContactCoords(contact),
					getPromotionOverlayWhatFromContactTitle(contact.title) ?? null
				);
			}

			for (const contact of allContactsOverlayVisibleContactsRef.current) {
				addSelectedMarker(
					contact,
					getAllContactsOverlayContactCoords(contact),
					getAmbientContactWhatFromTitle(contact.title)
				);
			}

			// Fallback for selected contacts that aren't in the current map dataset/overlays
			// (e.g. curated selections kept visible after disengaging to the ambient atlas).
			// Deduped by seenIds, so contacts already added above keep their dot-aligned coords.
			for (const contact of selectedContactObjects) {
				addSelectedMarker(
					contact,
					getLatLngFromContact(contact),
					contact.curatedCategory ??
						searchWhat ??
						getAmbientContactWhatFromTitle(contact.title) ??
						null
				);
			}

			// Pure-zoom re-runs (overlay arrays changed reference but the selected
			// subset, its coords, and styling are identical) are no-ops. Skip the
			// rebuild + re-animation so selected halos stay stable while zooming.
			const signatureParts: string[] = [];
			for (const id of Array.from(nextSelectedFeaturesById.keys()).sort(
				(a, b) => a - b
			)) {
				const feature = nextSelectedFeaturesById.get(id);
				const [lng, lat] = feature.geometry.coordinates;
				const properties = feature.properties ?? {};
				signatureParts.push(
					`${id}:${properties.selectedIcon ?? ''}:${
						properties.selectedIconHover ?? ''
					}:${properties.isUncategorized ? 'u' : 'c'}:${
						properties.fadeWithSelectedStateOrb ? '1' : '0'
					}:${lng.toFixed(5)}:${lat.toFixed(5)}`
				);
			}
			const nextSignature = signatureParts.join(',');
			const selectedMarkerDimensions = {
				width: SELECTED_CONTACT_MARKER_VIEWBOX_WIDTH,
				height: SELECTED_CONTACT_MARKER_VIEWBOX_HEIGHT,
			};
			await Promise.all(
				Array.from(selectedMarkerImagesToEnsure.entries()).map(([imageName, url]) =>
					ensureMapImageFromUrl(imageName, url, selectedMarkerDimensions)
				)
			);
			if (cancelled) return;

			if (
				nextSignature === selectedMarkerBuildSignatureRef.current &&
				selectedMarkerFadeRafRef.current == null
			) {
				return;
			}
			selectedMarkerBuildSignatureRef.current = nextSignature;

			if (selectedMarkerFadeRafRef.current != null) {
				cancelAnimationFrame(selectedMarkerFadeRafRef.current);
				selectedMarkerFadeRafRef.current = null;
			}

			const featureById = new Map<number, any>(selectedMarkerFeatureByIdRef.current);
			for (const [id, feature] of nextSelectedFeaturesById) {
				featureById.set(id, feature);
			}

			const fadeById = selectedMarkerFadeByIdRef.current;
			const scaleById = selectedMarkerScaleByIdRef.current;
			const targets = new Map<number, number>();
			for (const id of featureById.keys()) {
				targets.set(id, nextSelectedFeaturesById.has(id) ? 1 : 0);
			}

			if (targets.size === 0) {
				fadeById.clear();
				scaleById.clear();
				selectedMarkerFeatureByIdRef.current = new Map();
				selectedMarkerBuildSignatureRef.current = '';
				source.setData({ type: 'FeatureCollection', features: [] } as any);
				return;
			}

			const startFadeById = new Map<number, number>();
			const startScaleById = new Map<number, number>();
			for (const id of targets.keys()) {
				const isSelecting = nextSelectedFeaturesById.has(id);
				startFadeById.set(
					id,
					fadeById.get(id) ?? (isSelecting ? SELECTED_MARKER_ENTRY_OPACITY : 1)
				);
				startScaleById.set(
					id,
					scaleById.get(id) ?? (isSelecting ? SELECTED_MARKER_INITIAL_TRANSFORM_SCALE : 1)
				);
			}

			const setNormalMarkerAnimationState = (id: number, t: number) => {
				for (const sourceId of [
					MAPBOX_SOURCE_IDS.markersBase,
					MAPBOX_SOURCE_IDS.markersBookingPin,
					MAPBOX_SOURCE_IDS.markersPromotionDot,
					MAPBOX_SOURCE_IDS.markersPromotionPin,
					MAPBOX_SOURCE_IDS.markersAllOverlay,
				]) {
					try {
						map.setFeatureState({ source: sourceId, id }, { selectedMarkerT: t });
					} catch {
						// Feature may not be present in this source.
					}
				}
			};

			const writeFrame = (progress: number) => {
				const eased = 1 - Math.pow(1 - progress, 3);
				const features: any[] = [];

				for (const [id, target] of targets) {
					const feature = featureById.get(id);
					if (!feature) continue;
					const start = startFadeById.get(id) ?? target;
					const opacity = start + (target - start) * eased;
					const startScale = startScaleById.get(id) ?? 1;
					const targetScale = target > 0 ? 1 : SELECTED_MARKER_INITIAL_TRANSFORM_SCALE;
					const scale = startScale + (targetScale - startScale) * eased;

					if (progress >= 1 && target <= 0) {
						fadeById.delete(id);
						scaleById.delete(id);
						featureById.delete(id);
						setNormalMarkerAnimationState(id, 0);
						continue;
					}

					fadeById.set(id, opacity);
					scaleById.set(id, scale);
					setNormalMarkerAnimationState(id, opacity);
					features.push({
						...feature,
						properties: {
							...(feature.properties ?? {}),
							selectedMarkerOpacity: opacity,
							selectedMarkerScale: scale,
						},
					});
				}

				selectedMarkerFeatureByIdRef.current = featureById;
				source.setData({ type: 'FeatureCollection', features } as any);
			};

			const startMs = performance.now();
			writeFrame(0);

			const tick = () => {
				const progress = Math.min(
					1,
					(performance.now() - startMs) / SELECTED_MARKER_FADE_MS
				);
				writeFrame(progress);

				if (progress < 1) {
					selectedMarkerFadeRafRef.current = requestAnimationFrame(tick);
					return;
				}

				selectedMarkerFadeRafRef.current = null;
			};

			selectedMarkerFadeRafRef.current = requestAnimationFrame(tick);
		};

		void run();

		return () => {
			cancelled = true;
			if (selectedMarkerFadeRafRef.current != null) {
				cancelAnimationFrame(selectedMarkerFadeRafRef.current);
				selectedMarkerFadeRafRef.current = null;
			}
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		searchEngaged,
		isAmbientContactsEnabled,
		campaignMarkerMode,
		selectedContacts,
		selectedContactObjects,
		contactsWithCoords,
		getContactCoords,
		searchWhat,
		getBookingExtraContactCoords,
		getPromotionOverlayContactCoords,
		getAllContactsOverlayContactCoords,
		lockedStateKey,
		isStateLayerReady,
		ensureMapImageFromUrl,
		getSelectedCategorizedContactMarkerAssets,
		selectedUncategorizedContactMarkerImageName,
		selectedUncategorizedContactMarkerUrl,
		selectedUncategorizedContactMarkerHoverImageName,
		selectedUncategorizedContactMarkerHoverUrl,
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

		const safeSet = (layerId: string, filter: any) => {
			try {
				if (!map.getLayer(layerId)) return;
				map.setFilter(layerId, filter);
			} catch {
				// Ignore style timing races.
			}
		};

		const applyFilters = () => {
			const visibilityFilter = buildBaseMarkerVisibilityFilter(
				visibleIds,
				map.getZoom() ?? 0,
				campaignFootprintContactIdSet
			);

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
			safeSet(MAPBOX_LAYER_IDS.baseFallbackIconsHover, [
				'all',
				['==', ['get', 'isUncategorized'], true],
				visibilityFilter,
			]);
		};

		applyFilters();
		map.on('zoomend', applyFilters);
		return () => {
			map.off('zoomend', applyFilters);
		};
	}, [map, isMapLoaded, visibleContacts, campaignFootprintContactIdSet]);

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
				getCategorizedDotGlowZoomFadedOpacity(getNormalMarkerFadeOpacityExpr())
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
				withFeatureFillOpacity(
					getCategorizedDotZoomFadedOpacity(getNormalMarkerFadeOpacityExpr())
				)
			);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseDots,
				'circle-stroke-opacity',
				withFeatureStrokeOpacity(
					getCategorizedDotZoomFadedOpacity(getNormalMarkerFadeOpacityExpr())
				)
			);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseFallbackIcons,
				'icon-opacity-transition',
				transition
			);
			safeSetPaint(
				MAPBOX_LAYER_IDS.baseFallbackIcons,
				'icon-opacity',
				getSelectedStateOrbZoomFadedOpacity(1, getNormalMarkerFadeOpacityExpr())
			);
			safeSetFilter(
				MAPBOX_LAYER_IDS.baseHit,
				buildBaseMarkerVisibilityFilter(
					Array.from(visibleContactIdSetRef.current),
					map.getZoom() ?? 0,
					campaignFootprintContactIdSet
				)
			);
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
					withFeatureFillOpacity(withCategorizedDotOpacity(expr))
				);
				safeSetPaint(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-stroke-opacity',
					withFeatureStrokeOpacity(expr)
				);
				safeSetPaint(MAPBOX_LAYER_IDS.baseFallbackIcons, 'icon-opacity', expr);
				lastPaintUpdateAt = t;
			}

			// Don't churn filters at 60fps; updating every ~90ms is plenty for hit gating.
			if (t - lastHitUpdateAt >= 90) {
				safeSetFilter(MAPBOX_LAYER_IDS.baseHit, [
					'all',
					[
						'<=',
						['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0],
						t,
					],
					buildBaseMarkerVisibilityFilter(
						Array.from(visibleContactIdSetRef.current),
						map.getZoom() ?? 0,
						campaignFootprintContactIdSet
					),
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
			withFeatureFillOpacity(withCategorizedDotOpacity(expr0))
		);
		safeSetPaint(
			MAPBOX_LAYER_IDS.baseDots,
			'circle-stroke-opacity',
			withFeatureStrokeOpacity(expr0)
		);
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
		campaignFootprintContactIdSet,
	]);

	// Keep the frozen constellation's rendered line source synced after style/coordinate changes.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (!markerConstellationComposedSearchKeyRef.current) return;
		writeMarkerConstellationSourceData();
		if (markerConstellationRevealDoneRef.current) {
			const coreOpacity = markerConstellationIsStatusModeRef.current
				? CAMPAIGN_STATUS_CONSTELLATION_CORE_OPACITY
				: MARKER_CONSTELLATION_CORE_OPACITY;
			const glowOpacity = markerConstellationIsStatusModeRef.current
				? CAMPAIGN_STATUS_CONSTELLATION_GLOW_OPACITY
				: MARKER_CONSTELLATION_GLOW_OPACITY;
			setMarkerConstellationLineOpacity(
				markerConstellationEdgesRef.current.length > 0 ? coreOpacity : 0,
				markerConstellationEdgesRef.current.length > 0 ? glowOpacity : 0,
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
		const isCategoryConstellationMode = categoryConstellationsEnabled && !isSearchMode;
		const isStatusConstellationMode =
			isCategoryConstellationMode && campaignMarkerMode === 'status';
		const shouldComposeConstellation = isSearchMode || isCategoryConstellationMode;
		const constellationKey = isSearchMode
			? searchKey
			: isCategoryConstellationMode
				? isStatusConstellationMode
					? '__status-constellations__'
					: '__category-constellations__'
				: '';
		const loading = Boolean(isLoading);

		if (!shouldComposeConstellation || isBackgroundPresentation || !searchEngaged) {
			markerConstellationLastSearchKeyRef.current = constellationKey;
			clearMarkerConstellation(!isAmbientContactsEnabled);
			return;
		}

		if (constellationKey !== markerConstellationLastSearchKeyRef.current) {
			markerConstellationLastSearchKeyRef.current = constellationKey;
			clearMarkerConstellation();
		}

		if (loading) {
			const composedKey = markerConstellationComposedSearchKeyRef.current;
			const hasComposedForCurrentSearch =
				composedKey === constellationKey ||
				composedKey.startsWith(`${constellationKey}|results:`);
			if (!hasComposedForCurrentSearch) {
				stopMarkerConstellationReveal();
				markerConstellationEdgesRef.current = [];
				markerConstellationUsesCategoryColorsRef.current = false;
				markerConstellationNodesRef.current = [];
				markerConstellationContactsByIdRef.current = new Map();
				markerConstellationNodeIdsRef.current = new Set();
				markerConstellationComposedSearchKeyRef.current = '';
				markerConstellationLastDataKeyRef.current = '';
				markerConstellationIsStatusModeRef.current = false;
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
				const groupSignature = isStatusConstellationMode
					? getCampaignStatusForContact(contact.id)
					: (contact.curatedCategory ?? '');
				return `${contact.id}:${groupSignature}:${coords.lng.toFixed(
					5
				)}:${coords.lat.toFixed(5)}`;
			})
			.filter((part): part is string => part != null)
			.sort()
			.join(',');
		if (!resultSignature) return;

		const resultKey = `${constellationKey}|results:${resultSignature}`;
		const formationVersion = isStatusConstellationMode
			? 'status-v1'
			: isCategoryConstellationMode
				? 'category-v2'
				: 'beauty-v2';
		if (
			markerConstellationComposedSearchKeyRef.current.startsWith(
				`${resultKey}|${formationVersion}:`
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
			if (!isCategoryConstellationMode) {
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
						score: hashStringToUint32(`${constellationKey}|constellation|${contact.id}`),
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
			const constellationWorldSize = 512 * Math.pow(2, constellationComposeZoom);

			let points: MarkerConstellationPoint[] = [];
			const contactsByPointId = new Map<number, ContactWithName>();
			for (const contact of contactsForConstellation) {
				const coords = getContactCoords(contact);
				if (!coords) continue;
				let groupKey: string;
				if (isCategoryConstellationMode) {
					if (isStatusConstellationMode) {
						groupKey = `status:${getCampaignStatusForContact(contact.id)}`;
					} else {
						const categoryKey = contact.curatedCategory
							? normalizeWhatKey(contact.curatedCategory)
							: '';
						groupKey = categoryKey ? `category:${categoryKey}` : 'general';
					}
				} else {
					const curatedGroupKey = curatedBlobGroupKeyByContactId.get(contact.id);
					if (curatedBlobGroupKeyByContactId.size > 0 && !curatedGroupKey) continue;
					groupKey = curatedGroupKey ?? 'fallback:pending';
				}

				const projected = latLngToWorldPixel(coords, constellationWorldSize);
				if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) continue;

				points.push({
					id: contact.id,
					coords,
					x: projected.x,
					y: projected.y,
					groupKey,
				});
				contactsByPointId.set(contact.id, contact);
			}

			if (
				!isCategoryConstellationMode &&
				curatedBlobGroupKeyByContactId.size === 0 &&
				points.length >= 2
			) {
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
			const compositionKey = `${resultKey}|${formationVersion}:${pointsSignature}`;
			if (markerConstellationComposedSearchKeyRef.current === compositionKey) return;

			if (points.length < 2) {
				// No projectable points. Don't cache — leave composedKey unset so a
				// later contactsWithCoords update can retry.
				stopMarkerConstellationReveal();
				markerConstellationEdgesRef.current = [];
				markerConstellationUsesCategoryColorsRef.current = false;
				markerConstellationNodesRef.current = [];
				markerConstellationContactsByIdRef.current = new Map();
				markerConstellationNodeIdsRef.current = new Set();
				markerConstellationComposedSearchKeyRef.current = '';
				markerConstellationRevealDoneRef.current = true;
				markerConstellationLastDataKeyRef.current = '';
				markerConstellationIsStatusModeRef.current = false;
				setMarkerConstellationCompositionNonce((value) => value + 1);
				setMarkerConstellationLineOpacity(0, 0, 0);
				writeMarkerConstellationSourceData();
				ensureDeferredMoveEndListener();
				return;
			}

			const seed = `${constellationKey}|${formationVersion}|${points
				.map((point) => point.id)
				.join(',')}`;
			const formation = isCategoryConstellationMode
				? buildCategoryMarkerConstellationFormation(points, seed)
				: buildBeautyMarkerConstellationFormation(points, seed, constellationComposeZoom);

			if (formation.edges.length === 0 && formation.nodes.length === 0) {
				// No drawable formation. Leave composedKey unset so the next idle update
				// can retry after a pan/zoom or a denser coordinate update.
				stopMarkerConstellationReveal();
				markerConstellationEdgesRef.current = [];
				markerConstellationUsesCategoryColorsRef.current = false;
				markerConstellationNodesRef.current = [];
				markerConstellationContactsByIdRef.current = contactsByPointId;
				markerConstellationNodeIdsRef.current = new Set();
				markerConstellationComposedSearchKeyRef.current = '';
				markerConstellationRevealDoneRef.current = true;
				markerConstellationLastDataKeyRef.current = '';
				markerConstellationIsStatusModeRef.current = false;
				setMarkerConstellationCompositionNonce((value) => value + 1);
				setMarkerConstellationLineOpacity(0, 0, 0);
				writeMarkerConstellationSourceData();
				ensureDeferredMoveEndListener();
				return;
			}

			stopMarkerConstellationReveal();
			markerConstellationEdgesRef.current = formation.edges;
			markerConstellationUsesCategoryColorsRef.current =
				isCategoryConstellationMode && !isStatusConstellationMode;
			markerConstellationNodesRef.current = formation.nodes;
			markerConstellationContactsByIdRef.current = contactsByPointId;
			markerConstellationNodeIdsRef.current = formation.lowZoomNodeIds;
			markerConstellationComposedSearchKeyRef.current = compositionKey;
			markerConstellationRevealDoneRef.current = false;
			markerConstellationLastDataKeyRef.current = '';
			markerConstellationIsStatusModeRef.current = isStatusConstellationMode;
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
		searchEngaged,
		isAmbientContactsEnabled,
		campaignMarkerMode,
		categoryConstellationsEnabled,
		searchQuery,
		contactsWithCoords,
		getCampaignStatusForContact,
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

		// Gate on `isAnySearch` (a real, non-empty query) rather than the overloaded
		// `searchEngaged`, which defaults to `true` and is left at that default by the
		// campaign map. This mirrors the overlay's own populate gate (`isSearchAllContactsOverlay`)
		// so the gray dots clear deterministically when no dashboard search/ambient mode is active.
		if (!isAnySearch && !isAmbientContactsEnabled) {
			source.setData({ type: 'FeatureCollection', features: [] } as any);
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
			const whatForMarker = getAmbientContactWhatFromTitle(contact.title);
			const isUncategorized = !isCleanMapMarkerCategory(whatForMarker);
			const fillColor = isAmbientContactsEnabled
				? whatForMarker
					? getResultDotColorForWhat(whatForMarker)
					: AMBIENT_CONTACTS_UNCATEGORIZED_FILL_COLOR
				: ALL_CONTACTS_OVERLAY_DOT_FILL_COLOR;
			features.push({
				type: 'Feature',
				id: contact.id,
				properties: {
					fillColor,
					hoverFillColor: darkenHexColor(fillColor),
					fadeWithSelectedStateOrb,
					isUncategorized,
					category: whatForMarker ?? '',
					fallbackIcon: isUncategorized ? uncategorizedContactMarkerImageName : '',
					fallbackIconHover: isUncategorized
						? uncategorizedContactMarkerHoverImageName
						: '',
				},
				geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
			});
		}

		source.setData({ type: 'FeatureCollection', features } as any);
	}, [
		map,
		isMapLoaded,
		isLoading,
		isAnySearch,
		isAmbientContactsEnabled,
		allContactsOverlayVisibleContacts,
		getAllContactsOverlayContactCoords,
		lockedStateKey,
		isStateLayerReady,
		uncategorizedContactMarkerImageName,
		uncategorizedContactMarkerHoverImageName,
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

		if (!searchEngaged) {
			const empty = { type: 'FeatureCollection', features: [] } as any;
			dotSource.setData(empty);
			pinSource.setData(empty);
			promotionDotIdsRef.current = new Set();
			promotionPinIdsRef.current = new Set();
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
						properties: {
							fillColor: dotFillColor,
							hoverFillColor: darkenHexColor(dotFillColor),
							fadeWithSelectedStateOrb,
						},
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
				const hoverUrl = getMarkerPinUrl(
					darkenHexColor(pinFillColor),
					RESULT_DOT_STROKE_COLOR_DEFAULT,
					whatForMarker
				);
				const iconDefault = imageNameFromUrl(defaultUrl);
				const iconHover = imageNameFromUrl(hoverUrl);
				imagesToEnsure.set(iconDefault, defaultUrl);
				imagesToEnsure.set(iconHover, hoverUrl);

				pinFeatures.push({
					type: 'Feature',
					id: contact.id,
					properties: { iconDefault, iconHover, fadeWithSelectedStateOrb },
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
		searchEngaged,
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

		if (!searchEngaged) {
			source.setData({ type: 'FeatureCollection', features: [] } as any);
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
					darkenHexColor(pinFillColor),
					BOOKING_EXTRA_PIN_HOVER_STROKE_COLOR,
					whatForMarker,
					BOOKING_EXTRA_PIN_HOVER_STROKE_COLOR
				);

				const iconDefault = imageNameFromUrl(defaultUrl);
				const iconHover = imageNameFromUrl(hoverUrl);
				imagesToEnsure.set(iconDefault, defaultUrl);
				imagesToEnsure.set(iconHover, hoverUrl);

				features.push({
					type: 'Feature',
					id: contact.id,
					properties: {
						iconDefault,
						iconHover,
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
		searchEngaged,
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
		const categoryFilter: any = ['==', ['get', 'category'], cat ?? ''];
		// Match features whose `category` property equals the hovered category.
		// When no category is hovered, match nothing (empty string never stored as a real category).
		map.setFilter(layer, categoryFilter);
	}, [map, isMapLoaded, hoveredBookingExtraCategory]);

	// Give the DOM tooltip a real hover target around the SVG so moving from the
	// marker into the bubble does not cross a tiny Mapbox/DOM dead zone.
	const hoverTooltipHitSlopPx = useMemo(
		() => Math.max(14, markerScale * 2),
		[markerScale]
	);
	const tooltipMarkerGapPx = useMemo(
		() => Math.max(18, markerScale + 10),
		[markerScale]
	);
	const getSelectedTooltipStackT = useCallback((zoom: number): number => {
		return clamp(
			(SELECTED_TOOLTIP_FADE_START_ZOOM - zoom) /
				(SELECTED_TOOLTIP_FADE_START_ZOOM - SELECTED_TOOLTIP_FADE_END_ZOOM),
			0,
			1
		);
	}, []);

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

	// Event opportunity popup anchoring with edge-aware placement. The EVENT_POPUP_W×_H box flips
	// above/below/left/right of the star depending on available room in the map container,
	// then clamps so it always stays fully on screen. Re-runs on every map move (pan/zoom).
	useLayoutEffect(() => {
		if (!map || !isMapLoaded || isLoading) return;
		const el = eventPopupOverlayRef.current;
		const container = mapContainerRef.current;
		if (!el || !container || !activeEvent) return;

		const place = () => {
			const rect = container.getBoundingClientRect();
			const cw = rect.width;
			const ch = rect.height;
			// Right boundary excludes any host UI obstructing the right edge (e.g. the
			// search-results panel), plus a gap, so the popup is placed to the right of a
			// marker only when it fully clears that region — otherwise it flips left.
			const usableRight = Math.max(EVENT_POPUP_W, cw - rightSafeAreaPx - EVENT_POPUP_GAP);
			// map.project() returns container-relative pixels, matching getBoundingClientRect.
			const p = map.project([activeEvent.lng, activeEvent.lat]);
			const offset = EVENT_POPUP_STAR_HALF + EVENT_POPUP_GAP;

			// Room on each side of the star, beyond the star half-extent + gap.
			const roomAbove = p.y - offset;
			const roomBelow = ch - p.y - offset;
			const roomLeft = p.x - offset;
			const roomRight = usableRight - p.x - offset;

			// Candidate placements (top-left corner of the popup) for each side. Above/below
			// center horizontally on the marker; left/right center vertically.
			const above = { x: p.x - EVENT_POPUP_W / 2, y: p.y - offset - EVENT_POPUP_H };
			const below = { x: p.x - EVENT_POPUP_W / 2, y: p.y + offset };
			const toRight = { x: p.x + offset, y: p.y - EVENT_POPUP_H / 2 };
			const toLeft = { x: p.x - offset - EVENT_POPUP_W, y: p.y - EVENT_POPUP_H / 2 };

			const fitsAbove = roomAbove >= EVENT_POPUP_H;
			const fitsBelow = roomBelow >= EVENT_POPUP_H;
			// Horizontal side that clears the right-side panel: right preferred, else left.
			const horizontal =
				roomRight >= EVENT_POPUP_W ? toRight : roomLeft >= EVENT_POPUP_W ? toLeft : null;

			// Vertical position drives above/below; the middle band uses the sides. A marker
			// low in the view opens upward, one near the top opens downward, and the middle
			// third opens to the side (right when it clears the panel, otherwise left).
			const lowInView = p.y > ch * (2 / 3);
			const highInView = p.y < ch * (1 / 3);

			let placement: { x: number; y: number };
			if (lowInView && fitsAbove) {
				placement = above;
			} else if (highInView && fitsBelow) {
				placement = below;
			} else if (horizontal) {
				placement = horizontal;
			} else if (fitsAbove) {
				placement = above;
			} else if (fitsBelow) {
				placement = below;
			} else {
				// Nothing fits cleanly (small container): pick the side with the most room and
				// let the clamp below keep the box on screen.
				const maxVertical = Math.max(roomAbove, roomBelow);
				const maxHorizontal = Math.max(roomLeft, roomRight);
				if (maxHorizontal >= maxVertical) {
					placement = roomRight >= roomLeft ? toRight : toLeft;
				} else {
					placement = roomAbove >= roomBelow ? above : below;
				}
			}

			let x = placement.x;
			let y = placement.y;

			// Clamp so the EVENT_POPUP_W×_H box stays within the usable area (and on the top/left).
			x = Math.max(0, Math.min(x, usableRight - EVENT_POPUP_W));
			y = Math.max(0, Math.min(y, ch - EVENT_POPUP_H));
			el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
		};

		place();
		map.on('move', place);
		return () => {
			map.off('move', place);
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		activeEvent?.id,
		activeEvent?.lat,
		activeEvent?.lng,
		rightSafeAreaPx,
	]);

	// Multi-select action card anchoring. Follows the venue-portal action-pill
	// pattern: track the top-most selected dot while it is on-screen at street
	// zoom, otherwise dock beside the dashboard's left "Showing" rail so the
	// actions stay accessible when panning away or zooming out.
	const selectionActionsOverlayRef = useRef<HTMLDivElement | null>(null);
	// Union of the currently-rendered selection tooltip boxes (container-px),
	// written by the tooltip placement effect each frame. The action card reads
	// it so it can place itself AROUND the tooltips with no overlap.
	const selectionTooltipsFootprintRef = useRef<{
		left: number;
		top: number;
		right: number;
		bottom: number;
	} | null>(null);
	const selectionActionsSideRef = useRef<'top' | 'bottom' | 'left' | 'right' | null>(
		null
	);
	const selectedAnchorPoints = useMemo(() => {
		if (selectedContacts.length < 1) return null;
		const points: LatLngLiteral[] = [];
		for (const id of selectedContacts) {
			const coords =
				coordsByContactId.get(id) ??
				bookingExtraCoordsByContactId.get(id) ??
				promotionOverlayCoordsByContactId.get(id) ??
				allContactsOverlayCoordsByContactId.get(id) ??
				(selectedContactObjectsById.get(id)
					? getLatLngFromContact(selectedContactObjectsById.get(id)!)
					: null);
			if (coords) points.push(coords);
		}
		return points.length >= 1 ? points : null;
	}, [
		selectedContacts,
		coordsByContactId,
		bookingExtraCoordsByContactId,
		promotionOverlayCoordsByContactId,
		allContactsOverlayCoordsByContactId,
		selectedContactObjectsById,
	]);
	const selectedContactsKey = useMemo(
		() => selectedContacts.slice().sort((a, b) => a - b).join(','),
		[selectedContacts]
	);
	useLayoutEffect(() => {
		selectionTooltipsFootprintRef.current = null;
		selectionActionsSideRef.current = null;
	}, [selectedContactsKey]);
	useLayoutEffect(() => {
		if (!map || !isMapLoaded || isLoading || !onAddSelectionToFolder) return;
		if (selectedContacts.length < 1) return;
		const el = selectionActionsOverlayRef.current;
		if (!el) return;

		const readSelectionActionsDock = () => {
			const rootStyles = getComputedStyle(document.documentElement);
			const dashboardZoom =
				Number.parseFloat(
					rootStyles.getPropertyValue('--murmur-dashboard-zoom').trim()
				) || MURMUR_CHROME_ZOOM_DEFAULT;
			const sideShiftPx =
				Number.parseFloat(rootStyles.getPropertyValue(DASHBOARD_SIDE_SHIFT_VAR).trim()) ||
				0;
			const viewportH = window.innerHeight;
			const railTotalHeightPx =
				SELECTION_ACTIONS_MAP_SELECT_GRAB_TOP_EXTENT_PX +
				MAP_SELECT_GRAB_TOOL_COLLAPSED_HEIGHT_PX;
			const grabViewScale = computeMapSelectGrabViewScale(
				viewportH,
				railTotalHeightPx
			);
			const sidePanelTop =
				(SELECTION_ACTIONS_MAP_VIEW_SIDE_PANEL_TOP_PX + sideShiftPx) /
				dashboardZoom;
			const grabOriginTop =
				sidePanelTop +
				SELECTION_ACTIONS_MAP_SELECT_GRAB_TOP_EXTENT_PX * grabViewScale -
				4 / dashboardZoom;
			return {
				minX:
					SELECTION_ACTIONS_MAP_SELECT_GRAB_LEFT_PX +
					SELECTION_ACTIONS_DOCK_RAIL_WIDTH_PX * grabViewScale +
					SELECTION_ACTIONS_DOCK_GAP_PX,
				top:
					grabOriginTop -
					SELECTION_ACTIONS_SHOWING_ABOVE_GRAB_ORIGIN_PX * grabViewScale,
			};
		};

		const place = () => {
			const container = mapContainerRef.current;
			if (!container) return;

			// Project the selected dots into a screen-space cluster box so the card
			// can sit AROUND the selection (on the side with the most room) instead
			// of being pinned directly above the top-most dot.
			let clusterLeft = Infinity;
			let clusterTop = Infinity;
			let clusterRight = -Infinity;
			let clusterBottom = -Infinity;
			let anyProjected = false;
			if (selectedAnchorPoints) {
				for (const pt of selectedAnchorPoints) {
					const p = map.project([pt.lng, pt.lat]);
					clusterLeft = Math.min(clusterLeft, p.x);
					clusterTop = Math.min(clusterTop, p.y);
					clusterRight = Math.max(clusterRight, p.x);
					clusterBottom = Math.max(clusterBottom, p.y);
					anyProjected = true;
				}
			}

			const rect = container.getBoundingClientRect();

			const w = el.offsetWidth;
			const h = el.offsetHeight;
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			const margin = SELECTION_ACTIONS_VIEWPORT_MARGIN_PX;
			const { minX: dockMinX, top: dockTop } = readSelectionActionsDock();
			const maxX = vw - w - margin;
			const minY = readSelectionActionsTopChromeBottomPx();
			const maxY = vh - h - margin;

			const dockX = clamp(dockMinX, margin, maxX);
			const dockY = clamp(dockTop, minY, maxY);

			// Continuous 0..1 blend toward the docked spot: 0 = anchored around the
			// selection, 1 = parked by the "Showing" rail. Driven by BOTH how far the
			// view is zoomed out and how far the selection is panned off-center, so
			// the card eases between the two states instead of snapping all at once.
			let dockProgress = 1;
			let anchoredX = dockX;
			let anchoredY = dockY;
			let obstacleBounds: {
				left: number;
				top: number;
				right: number;
				bottom: number;
			} | null = null;
			if (anyProjected) {
				// Obstacle to avoid = tooltip footprint UNION selected-marker footprint.
				// If the real tooltip footprint has not been published yet (first select
				// frame), use a conservative tooltip-shaped fallback above the marker so
				// the card never flashes over it.
				const footprint = selectionTooltipsFootprintRef.current;
				const markerLeft =
					rect.left + clusterLeft - SELECTION_ACTIONS_MARKER_CLEAR_RADIUS_PX;
				const markerTop =
					rect.top + clusterTop - SELECTION_ACTIONS_MARKER_CLEAR_RADIUS_PX;
				const markerRight =
					rect.left + clusterRight + SELECTION_ACTIONS_MARKER_CLEAR_RADIUS_PX;
				const markerBottom =
					rect.top + clusterBottom + SELECTION_ACTIONS_MARKER_CLEAR_RADIUS_PX;
				// Keep the conservative first-frame footprint in the union even
				// after the exact tooltip footprint arrives. Otherwise the obstacle
				// can shrink on the first pan after selection, making the card jump
				// from its safe initial placement to a tighter placement.
				const fallbackTooltipLeft =
					rect.left + clusterLeft - SELECTION_ACTIONS_FALLBACK_TOOLTIP_HALF_W_PX;
				const fallbackTooltipTop =
					rect.top + clusterTop - SELECTION_ACTIONS_FALLBACK_TOOLTIP_ABOVE_PX;
				const fallbackTooltipRight =
					rect.left + clusterRight + SELECTION_ACTIONS_FALLBACK_TOOLTIP_HALF_W_PX;
				const fallbackTooltipBottom = markerBottom;
				const exactTooltipLeft = footprint ? rect.left + footprint.left : fallbackTooltipLeft;
				const exactTooltipTop = footprint ? rect.top + footprint.top : fallbackTooltipTop;
				const exactTooltipRight = footprint
					? rect.left + footprint.right
					: fallbackTooltipRight;
				const exactTooltipBottom = footprint
					? rect.top + footprint.bottom
					: fallbackTooltipBottom;
				const tooltipLeft = Math.min(fallbackTooltipLeft, exactTooltipLeft);
				const tooltipTop = Math.min(fallbackTooltipTop, exactTooltipTop);
				const tooltipRight = Math.max(fallbackTooltipRight, exactTooltipRight);
				const tooltipBottom = Math.max(fallbackTooltipBottom, exactTooltipBottom);
				const obLeft = Math.min(markerLeft, tooltipLeft);
				const obTop = Math.min(markerTop, tooltipTop);
				const obRight = Math.max(markerRight, tooltipRight);
				const obBottom = Math.max(markerBottom, tooltipBottom);
				obstacleBounds = { left: obLeft, top: obTop, right: obRight, bottom: obBottom };
				const obCenterX = (obLeft + obRight) / 2;
				const obCenterY = (obTop + obBottom) / 2;
				const gap = SELECTION_ACTIONS_AROUND_SIDE_GAP_PX;
				// Candidates fully clear of the obstacle on each side (a positive gap
				// guarantees no overlap). Pick the one that best fits the viewport and
				// otherwise hugs the selection — so it lands wherever is optimal at the
				// moment instead of always favoring one side.
				const candidates = [
					{ side: 'top' as const, x: obCenterX - w / 2, y: obTop - gap - h },
					{ side: 'bottom' as const, x: obCenterX - w / 2, y: obBottom + gap },
					{ side: 'left' as const, x: obLeft - gap - w, y: obCenterY - h / 2 },
					{ side: 'right' as const, x: obRight + gap, y: obCenterY - h / 2 },
				];
				const scoreCandidate = (c: (typeof candidates)[number]) => {
					const outOfBounds =
						Math.max(0, margin - c.x) +
						Math.max(0, c.x - maxX) +
						Math.max(0, minY - c.y) +
						Math.max(0, c.y - maxY);
					const cardCenterX = c.x + w / 2;
					const cardCenterY = c.y + h / 2;
					const hug = Math.hypot(cardCenterX - obCenterX, cardCenterY - obCenterY);
					// Out-of-bounds dominates; hug distance breaks ties so the card
					// snuggles the nearest comfortably-visible side.
					return outOfBounds * 10000 + hug;
				};
				let best = candidates[0];
				let bestScore = scoreCandidate(best);
				for (const c of candidates) {
					const score = scoreCandidate(c);
					if (score < bestScore) {
						bestScore = score;
						best = c;
					}
				}
				const current = candidates.find(
					(c) => c.side === selectionActionsSideRef.current
				);
				if (current) {
					const currentScore = scoreCandidate(current);
					// Hysteresis: do not flip sides on tiny score changes while panning.
					// That was the visible flicker. Only switch when the new side is
					// meaningfully better or the current side is being clipped.
					const currentOutOfBounds =
						Math.max(0, margin - current.x) +
						Math.max(0, current.x - maxX) +
						Math.max(0, minY - current.y) +
						Math.max(0, current.y - maxY);
					if (currentOutOfBounds === 0 && currentScore <= bestScore + 80) {
						best = current;
					}
				}
				selectionActionsSideRef.current = best.side;
				anchoredX = clamp(best.x, margin, maxX);
				anchoredY = clamp(best.y, minY, maxY);

				const boxCenterX = obCenterX;
				const boxCenterY = obCenterY;
				// Zoom term: ramps in as the view zooms out past the anchor zoom.
				const zoomProgress = clamp(
					(SELECTION_ACTIONS_ANCHOR_FULL_ZOOM - map.getZoom()) /
						(SELECTION_ACTIONS_ANCHOR_FULL_ZOOM -
							SELECTION_ACTIONS_DOCK_FULL_ZOOM),
					0,
					1
				);
				// Pan term: 0 while the selection's center sits inside the comfort
				// rect, ramping to 1 as it travels toward / past the viewport edges.
				const comfortPad = SELECTION_ACTIONS_PAN_COMFORT_PAD_PX;
				const ramp = SELECTION_ACTIONS_PAN_DOCK_RAMP_PX;
				const overX = Math.max(
					0,
					comfortPad - boxCenterX,
					boxCenterX - (vw - comfortPad)
				);
				const overY = Math.max(
					0,
					minY + comfortPad - boxCenterY,
					boxCenterY - (vh - comfortPad)
				);
				const panProgress = clamp(Math.max(overX, overY) / ramp, 0, 1);
				dockProgress = Math.max(zoomProgress, panProgress);
			} else {
				selectionActionsSideRef.current = null;
			}

			let viewportX = lerp(anchoredX, dockX, dockProgress);
			let viewportY = lerp(anchoredY, dockY, dockProgress);
			if (obstacleBounds) {
				const gap = SELECTION_ACTIONS_AROUND_SIDE_GAP_PX;
				const overlapsObstacle =
					viewportX < obstacleBounds.right + gap &&
					viewportX + w > obstacleBounds.left - gap &&
					viewportY < obstacleBounds.bottom + gap &&
					viewportY + h > obstacleBounds.top - gap;
				if (overlapsObstacle) {
					switch (selectionActionsSideRef.current) {
						case 'top':
							viewportY = obstacleBounds.top - gap - h;
							break;
						case 'bottom':
							viewportY = obstacleBounds.bottom + gap;
							break;
						case 'left':
							viewportX = obstacleBounds.left - gap - w;
							break;
						case 'right':
						default:
							viewportX = obstacleBounds.right + gap;
							break;
					}
					viewportX = clamp(viewportX, margin, maxX);
					viewportY = clamp(viewportY, minY, maxY);
				}
			}

			// Container-relative coords — stays in the map layer (z-99) so the
			// dashboard's portaled top nav / side panel always paints above.
			const x = viewportX - rect.left;
			const y = viewportY - rect.top;

			// Rigid per-frame placement (no CSS easing): the position itself is what
			// moves gradually, since dockProgress changes smoothly with zoom/pan — so
			// the follow stays strict like the tooltips and the dock never snaps.
			el.style.transition = 'none';
			el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
			el.style.opacity = '1';
			el.style.pointerEvents = 'auto';
		};

		place();
		map.on('move', place);
		window.addEventListener('resize', place);
		return () => {
			map.off('move', place);
			window.removeEventListener('resize', place);
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		onAddSelectionToFolder,
		selectedContacts.length,
		selectedAnchorPoints,
	]);

	// Hover tooltip anchoring (single overlay).
	const stackedSelectedContactIdSet = useMemo(() => {
		const ids = new Set<number>();
		for (const group of selectedTooltipStackGroups) {
			for (const contactId of group.contactIds) ids.add(contactId);
		}
		return ids;
	}, [selectedTooltipStackGroups]);
	const hoverTooltipContactId = hoveredMarkerId ?? fadingTooltipId;
	const hoverTooltipEntry = useMemo(() => {
		if (hoverTooltipContactId == null) return null;
		if (stackedSelectedContactIdSet.has(hoverTooltipContactId)) return null;
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
		stackedSelectedContactIdSet,
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

	// Street-view research cards, engaged only at street zoom on surfaces that
	// opted in. Base/booking/promotion markers get PERSISTENT cards (see
	// streetCardEntries below); this hover-gated single-card path now serves
	// only the ambient 'all'-contacts gray dots, which stay hover-only.
	const isStreetCardMode = streetViewEnabled && zoomLevel >= STREET_VIEW_MIN_ZOOM;
	const selectedCompactTooltipEntries = useMemo(() => {
		if ((!onAddSelectionToFolder && !showSelectedContactTooltips) || isStreetCardMode) return [];

		type SelectedTooltipKind = 'base' | 'booking' | 'promotion' | 'all' | 'fallback';

		const compactTooltipOptions = { showTitleBand: false };
		const entries: SelectedCompactTooltipEntry[] = [];
		const seenIds = new Set<number>();

		const resolveSelectedContact = (
			id: number
		): { kind: SelectedTooltipKind; contact: ContactWithName; coords: LatLngLiteral | null } | null => {
			const base = contactsWithCoordsById.get(id) ?? visibleContactsById.get(id);
			if (base) return { kind: 'base', contact: base, coords: getContactCoords(base) };

			const booking = bookingExtraContactsById.get(id);
			if (booking) {
				return {
					kind: 'booking',
					contact: booking,
					coords: getBookingExtraContactCoords(booking),
				};
			}

			const promo = promotionOverlayContactsById.get(id);
			if (promo) {
				return {
					kind: 'promotion',
					contact: promo,
					coords: getPromotionOverlayContactCoords(promo),
				};
			}

			const all = allOverlayContactsById.get(id);
			if (all) {
				return {
					kind: 'all',
					contact: all,
					coords: getAllContactsOverlayContactCoords(all),
				};
			}

			const fallback = selectedContactObjectsById.get(id);
			if (fallback) {
				return {
					kind: 'fallback',
					contact: fallback,
					coords: getLatLngFromContact(fallback),
				};
			}

			return null;
		};

		const getWhatForSelectedTooltip = (
			contact: ContactWithName,
			kind: SelectedTooltipKind
		): string | null => {
			switch (kind) {
				case 'base':
					return contact.curatedCategory ?? searchWhat ?? null;
				case 'booking':
					return getBookingTitlePrefixFromContactTitle(contact.title) ?? null;
				case 'promotion':
					return getPromotionOverlayWhatFromContactTitle(contact.title) ?? null;
				case 'all':
					return getAmbientContactWhatFromTitle(contact.title);
				case 'fallback':
					return (
						contact.curatedCategory ??
						searchWhat ??
						getAmbientContactWhatFromTitle(contact.title) ??
						null
					);
				default:
					return null;
			}
		};

		for (let selectedIndex = 0; selectedIndex < selectedContacts.length; selectedIndex += 1) {
			const id = selectedContacts[selectedIndex];
			if (seenIds.has(id)) continue;
			seenIds.add(id);

			const resolved = resolveSelectedContact(id);
			if (!resolved || !resolved.coords) continue;

			const { contact, coords, kind } = resolved;
			const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
			const nameForTooltip = fullName || contact.name || '';
			const companyForTooltip = contact.company || '';
			const titleForTooltip = (
				contact.curatedDisplayLabel ||
				contact.title ||
				contact.headline ||
				''
			).trim();
			const whatForMarker = getWhatForSelectedTooltip(contact, kind);
			const normalizedWhat = whatForMarker ? normalizeWhatKey(whatForMarker) : null;
			const tooltipFillColor = normalizedWhat
				? (WHAT_TO_HOVER_TOOLTIP_FILL_COLOR[normalizedWhat] ?? PEOPLE_TOOLTIP_FILL_COLOR)
				: kind === 'all'
					? PEOPLE_TOOLTIP_FILL_COLOR
					: PEOPLE_TOOLTIP_FILL_COLOR;
			const tooltipBodyFillColor = normalizedWhat
				? (WHAT_TO_HOVER_TOOLTIP_BODY_FILL_COLOR[normalizedWhat] ?? PEOPLE_TOOLTIP_FILL_COLOR)
				: tooltipFillColor;
			const width = calculateTooltipWidth(
				nameForTooltip,
				companyForTooltip,
				titleForTooltip,
				whatForMarker,
				compactTooltipOptions
			);
			const height = calculateTooltipHeight(
				nameForTooltip,
				companyForTooltip,
				compactTooltipOptions
			);
			const anchorY = calculateTooltipAnchorY(
				nameForTooltip,
				companyForTooltip,
				compactTooltipOptions
			);

			entries.push({
				contact,
				coords,
				width,
				height,
				anchorY,
				bodyFillColor: tooltipBodyFillColor,
				categoryKey: normalizedWhat ?? '__people__',
				categoryFillColor: tooltipFillColor,
				selectedOrder: selectedIndex,
				svg: generateMapTooltipSvg(
					nameForTooltip,
					companyForTooltip,
					titleForTooltip,
					tooltipFillColor,
					whatForMarker,
					tooltipBodyFillColor,
					compactTooltipOptions
				),
			});
		}

		return entries;
	}, [
		onAddSelectionToFolder,
		showSelectedContactTooltips,
		isStreetCardMode,
		selectedContacts,
		contactsWithCoordsById,
		visibleContactsById,
		bookingExtraContactsById,
		promotionOverlayContactsById,
		allOverlayContactsById,
		selectedContactObjectsById,
		getContactCoords,
		getBookingExtraContactCoords,
		getPromotionOverlayContactCoords,
		getAllContactsOverlayContactCoords,
		searchWhat,
	]);
	const selectedCompactTooltipEntryIdsKey = useMemo(
		() => selectedCompactTooltipEntries.map((entry) => entry.contact.id).join(','),
		[selectedCompactTooltipEntries]
	);
	const projectSelectedTooltipEntries = useCallback(
		(m: mapboxgl.Map): ProjectedSelectedTooltipEntry[] =>
			selectedCompactTooltipEntries.map((entry) => {
				const p = m.project([entry.coords.lng, entry.coords.lat]);
				// Preferred resting anchor = the hover overlay's up-and-to-the-right
				// spot (bottom-left corner at marker + 3 / marker - 8) so hovering is a
				// pure cross-fade. The bounding rect stays horizontally centered on the
				// marker so the zoomed-out stacks don't drift sideways.
				const centeredX = p.x - entry.width / 2;
				const naturalX = p.x + HOVER_TOOLTIP_SIDE_GAP_X_PX;
				const naturalY = p.y - entry.anchorY - HOVER_TOOLTIP_SIDE_GAP_Y_PX;
				return {
					...entry,
					markerX: p.x,
					markerY: p.y,
					naturalX,
					naturalY,
					left: centeredX,
					top: naturalY,
					right: centeredX + entry.width,
					bottom: naturalY + entry.height,
					centerX: centeredX + entry.width / 2,
					centerY: naturalY + entry.height / 2,
				};
			}),
		[selectedCompactTooltipEntries]
	);
	const buildSelectedTooltipStackLayout = useCallback(
		(projectedEntries: ProjectedSelectedTooltipEntry[], zoom: number) => {
			const stackT =
				projectedEntries.length > 1 ? getSelectedTooltipStackT(zoom) : 0;
			const shouldUseLegacyStack = stackT >= SELECTED_TOOLTIP_LEGACY_STACK_T;
			const stackScale = lerp(1, SELECTED_TOOLTIP_STACK_MIN_SCALE, stackT);

			const buildLegacyStackPlacement = (): SelectedTooltipStackPlacement[] => {
				const frontEntry =
					projectedEntries
						.slice()
						.sort((a, b) => a.selectedOrder - b.selectedOrder)
						.at(-1) ?? null;
				const firstProjectedEntry = projectedEntries[0] ?? null;
				if (!frontEntry || !firstProjectedEntry) return [];
				const stackAnchor = projectedEntries.reduce<ProjectedSelectedTooltipEntry>(
					(topEntry, entry) => (entry.naturalY < topEntry.naturalY ? entry : topEntry),
					firstProjectedEntry
				);
				const contactIds = projectedEntries
					.slice()
					.sort((a, b) => a.selectedOrder - b.selectedOrder)
					.map((entry) => entry.contact.id);
				return [
					{
						id: 'selected-stack-legacy-zoomed-out',
						contactIds,
						count: projectedEntries.length,
						colors: getSelectedTooltipGroupColors(projectedEntries),
						width: frontEntry.width,
						height: frontEntry.height,
						svg: frontEntry.svg,
						bodyFillColor: frontEntry.bodyFillColor,
						x: stackAnchor.centerX - frontEntry.width / 2,
						y: stackAnchor.naturalY,
						opacity: 1,
						scale: stackScale,
					},
				];
			};

			const collisionStackPlacements =
				shouldUseLegacyStack
					? []
					: buildSelectedTooltipStackPlacements(projectedEntries).map((placement) => ({
							...placement,
							opacity: 1,
							scale: stackScale,
						}));
			const legacyStackPlacements =
				shouldUseLegacyStack ? buildLegacyStackPlacement() : [];
			const stackPlacements = [...collisionStackPlacements, ...legacyStackPlacements];
			const collisionGroupedContactIds = new Set<number>();
			for (const group of collisionStackPlacements) {
				for (const contactId of group.contactIds) collisionGroupedContactIds.add(contactId);
			}
			const stackGroups = stackPlacements.map<SelectedTooltipStackGroup>(
				({ id, contactIds, count, colors, width, height, svg, bodyFillColor }) => ({
					id,
					contactIds,
					count,
					colors,
					width,
					height,
					svg,
					bodyFillColor,
				})
			);

			return {
				shouldUseLegacyStack,
				stackPlacements,
				collisionGroupedContactIds,
				stackGroups,
			};
		},
		[getSelectedTooltipStackT]
	);
	const predictedSelectedTooltipStackGroups = useMemo(() => {
		if (!map || !isMapLoaded || isLoading || selectedCompactTooltipEntries.length === 0) {
			return [];
		}
		return buildSelectedTooltipStackLayout(
			projectSelectedTooltipEntries(map),
			map.getZoom() ?? MAP_DEFAULT_ZOOM
		).stackGroups;
	}, [
		map,
		isMapLoaded,
		isLoading,
		selectedCompactTooltipEntries,
		projectSelectedTooltipEntries,
		buildSelectedTooltipStackLayout,
	]);
	const committedSelectedTooltipStackGroups =
		selectedTooltipStackSelectionKeyRef.current === selectedCompactTooltipEntryIdsKey
			? selectedTooltipStackGroups
			: [];
	const renderedSelectedTooltipStackGroups =
		committedSelectedTooltipStackGroups.length > 0
			? committedSelectedTooltipStackGroups
			: predictedSelectedTooltipStackGroups;
	const renderedStackedSelectedContactIdSet = useMemo(() => {
		const ids = new Set<number>();
		for (const group of renderedSelectedTooltipStackGroups) {
			for (const contactId of group.contactIds) ids.add(contactId);
		}
		return ids;
	}, [renderedSelectedTooltipStackGroups]);
	useEffect(() => {
		const target = selectedTooltipHoverHiddenTargetRef.current;
		if (!target) return;
		if (isStreetCardMode || selectedCompactTooltipEntries.length === 0) {
			setSelectedTooltipHoverHiddenTargetIfChanged(null);
			return;
		}

		if (target.type === 'contact') {
			const stillSelected = selectedCompactTooltipEntries.some(
				(entry) => entry.contact.id === target.id
			);
			if (!stillSelected) setSelectedTooltipHoverHiddenTargetIfChanged(null);
			return;
		}

		const stillStacked = renderedSelectedTooltipStackGroups.some(
			(group) => group.id === target.id
		);
		if (!stillStacked) setSelectedTooltipHoverHiddenTargetIfChanged(null);
	}, [
		isStreetCardMode,
		selectedCompactTooltipEntries,
		renderedSelectedTooltipStackGroups,
		setSelectedTooltipHoverHiddenTargetIfChanged,
	]);
	useLayoutEffect(() => {
		if (selectedCompactTooltipEntries.length === 0) {
			selectionTooltipsFootprintRef.current = null;
			if (selectedTooltipStackSignatureRef.current) {
				selectedTooltipStackSignatureRef.current = '';
				selectedTooltipStackSelectionKeyRef.current = '';
				setSelectedTooltipStackGroups([]);
			}
			return;
		}
		if (!map || !isMapLoaded || isLoading) return;

		const update = () => {
			const projectedEntries = projectSelectedTooltipEntries(map);
			const {
				shouldUseLegacyStack,
				stackPlacements,
				collisionGroupedContactIds,
				stackGroups,
			} = buildSelectedTooltipStackLayout(
				projectedEntries,
				map.getZoom() ?? MAP_DEFAULT_ZOOM
			);
			const stackBlockingBounds = stackPlacements.map(getSelectedTooltipStackBounds);
			const individualPlacements = shouldUseLegacyStack
				? new Map<number, SelectedTooltipIndividualPlacement>()
				: buildSelectedTooltipIndividualPlacements(
						projectedEntries,
						collisionGroupedContactIds,
						stackBlockingBounds,
						tooltipMarkerGapPx
					);

			const nextStackSignature = stackGroups
				.map(
					(group) =>
						`${group.id}:${group.count}:${group.width}:${group.height}:${group.bodyFillColor}:${group.contactIds.join(',')}:${group.colors.join(',')}`
				)
				.join('|');
			if (selectedTooltipStackSignatureRef.current !== nextStackSignature) {
				selectedTooltipStackSignatureRef.current = nextStackSignature;
				selectedTooltipStackSelectionKeyRef.current = selectedCompactTooltipEntryIdsKey;
				setSelectedTooltipStackGroups(stackGroups);
			}

			for (const entry of projectedEntries) {
				const el = selectedCompactTooltipRefs.current.get(entry.contact.id);
				if (!el) continue;
				const placement = individualPlacements.get(entry.contact.id);
				const isHiddenByTooltipHover =
					selectedTooltipHoverHiddenTarget?.type === 'contact' &&
					selectedTooltipHoverHiddenTarget.id === entry.contact.id;
				el.style.transformOrigin = placement?.transformOrigin ?? 'bottom left';
				el.style.transform = `translate(${Math.round(
					placement?.x ?? entry.naturalX
				)}px, ${Math.round(
					placement?.y ?? entry.naturalY
				)}px)`;
				el.style.zIndex = String(HOVER_TOOLTIP_Z_INDEX - 1);
				el.style.opacity =
					isHiddenByTooltipHover ||
					hoveredMarkerId === entry.contact.id ||
					collisionGroupedContactIds.has(entry.contact.id) ||
					shouldUseLegacyStack
						? '0'
						: '1';
			}

			const placementById = new Map(stackPlacements.map((placement) => [placement.id, placement]));
			for (const [id, el] of selectedTooltipStackRefs.current) {
				const placement = placementById.get(id);
				if (!placement) {
					el.style.opacity = '0';
					continue;
				}
				el.style.transformOrigin = 'center center';
				el.style.transform = `translate(${Math.round(placement.x)}px, ${Math.round(
					placement.y
				)}px) scale(${placement.scale ?? 1})`;
				el.style.opacity =
					selectedTooltipHoverHiddenTarget?.type === 'stack' &&
					selectedTooltipHoverHiddenTarget.id === id
						? '0'
						: String(placement.opacity ?? 1);
				el.style.zIndex = String(HOVER_TOOLTIP_Z_INDEX + 1);
			}

			// Publish the union of every rendered tooltip box (container-px) so the
			// action card can place itself clear of them. Skip individuals that are
			// folded into a stack or hidden — they aren't visually present.
			let fpLeft = Infinity;
			let fpTop = Infinity;
			let fpRight = -Infinity;
			let fpBottom = -Infinity;
			for (const entry of projectedEntries) {
				if (
					collisionGroupedContactIds.has(entry.contact.id) ||
					shouldUseLegacyStack
				) {
					continue;
				}
				const placement = individualPlacements.get(entry.contact.id);
				const px = placement?.x ?? entry.naturalX;
				const py = placement?.y ?? entry.naturalY;
				fpLeft = Math.min(fpLeft, px);
				fpTop = Math.min(fpTop, py);
				fpRight = Math.max(fpRight, px + entry.width);
				fpBottom = Math.max(fpBottom, py + entry.height);
			}
			for (const placement of stackPlacements) {
				const scale = placement.scale ?? 1;
				fpLeft = Math.min(fpLeft, placement.x);
				fpTop = Math.min(fpTop, placement.y);
				fpRight = Math.max(fpRight, placement.x + placement.width * scale);
				fpBottom = Math.max(fpBottom, placement.y + placement.height * scale);
			}
			selectionTooltipsFootprintRef.current =
				fpLeft <= fpRight
					? { left: fpLeft, top: fpTop, right: fpRight, bottom: fpBottom }
					: null;
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
		selectedCompactTooltipEntries,
		selectedCompactTooltipEntryIdsKey,
		projectSelectedTooltipEntries,
		buildSelectedTooltipStackLayout,
		tooltipMarkerGapPx,
		hoveredMarkerId,
		selectedTooltipHoverHiddenTarget,
	]);
	const streetCardContact =
		isStreetCardMode && hoverTooltipEntry?.kind === 'all'
			? hoverTooltipEntry.contact
			: null;
	// Slim overlay payloads (booking/promotion/all — see api/contacts/map-overlay) omit
	// metadata/address; backfill via the per-contact research endpoint (30-min cache).
	const streetCardNeedsBackfill =
		streetCardContact != null &&
		(!streetCardContact.metadata || !streetCardContact.address);
	const { data: streetCardResearch, isLoading: isStreetCardResearchLoading } =
		useGetContactResearch(
			streetCardNeedsBackfill && streetCardContact ? streetCardContact.id : null
		);

	const streetCardData = useMemo(() => {
		if (!isStreetCardMode || !hoverTooltipEntry || hoverTooltipEntry.kind !== 'all')
			return null;
		const contact = hoverTooltipEntry.contact;
		const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
		const name = fullName || contact.name || contact.company || 'Unknown';
		const company = fullName || contact.name ? contact.company || '' : '';
		const whatForMarker = getAmbientContactWhatFromTitle(contact.title);
		const accentColor = getResultDotColorForWhat(whatForMarker);
		const cityStateFallback = [
			contact.city,
			getStateAbbreviation(contact.state || '') || contact.state,
		]
			.filter(Boolean)
			.join(', ');
		const address = contact.address || streetCardResearch?.address || cityStateFallback;
		const metadata = contact.metadata || streetCardResearch?.metadata || null;
		const sections = parseMetadataSections(metadata);
		const blurb = sections['1'] ?? (metadata?.trim() || '');
		return {
			name,
			company,
			accentColor,
			address,
			blurb,
			isSelected: selectedContactIdSet.has(contact.id),
			isSelectionEligible: isSelectionToggleEligible(contact),
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isStreetCardMode,
		hoverTooltipEntry,
		searchWhat,
		streetCardResearch,
		selectedContactIdSet,
		baseContactIdSet,
		isBookingSearch,
		bookingExtraVisibleContacts,
	]);

	// Persistent street-view research cards: one per visible search-result dot and
	// booking/promotion pin (ambient 'all' dots excluded — they keep the hover-only
	// card above). Capped to the markers nearest the viewport center so dense
	// blocks can't wall the screen, then id-sorted so render order (and therefore
	// paint stacking among equal z-indexes) stays stable while panning.
	const streetCardEntries = useMemo(() => {
		if (!isStreetCardMode || isBackgroundPresentation) return [];
		type StreetCardEntry = {
			contact: ContactWithName;
			coords: LatLngLiteral;
			isSelected: boolean;
			isSelectionEligible: boolean;
		};
		const seenIds = new Set<number>();
		const candidates: StreetCardEntry[] = [];
		const collect = (
			contacts: ContactWithName[],
			getCoords: (contact: ContactWithName) => LatLngLiteral | null
		) => {
			for (const contact of contacts) {
				if (seenIds.has(contact.id)) continue;
				const coords = getCoords(contact);
				if (!coords) continue;
				seenIds.add(contact.id);
				candidates.push({
					contact,
					coords,
					isSelected: selectedContactIdSet.has(contact.id),
					isSelectionEligible: isSelectionToggleEligible(contact),
				});
			}
		};
		collect(visibleContacts, getContactCoords);
		collect(bookingExtraVisibleContacts, getBookingExtraContactCoords);
		collect(promotionOverlayVisibleContacts, getPromotionOverlayContactCoords);

		let kept = candidates;
		if (candidates.length > STREET_VIEW_MAX_PERSISTENT_CARDS) {
			// Membership (not render order) is distance-ranked. Recomputed only when a
			// visible list's identity changes — a pure pan inside the padded bbox keeps
			// the same set, which is the stability we want.
			const center = map?.getCenter();
			if (center) {
				kept = candidates
					.slice()
					.sort((a, b) => {
						const da =
							(a.coords.lat - center.lat) ** 2 + (a.coords.lng - center.lng) ** 2;
						const db =
							(b.coords.lat - center.lat) ** 2 + (b.coords.lng - center.lng) ** 2;
						return da - db;
					})
					.slice(0, STREET_VIEW_MAX_PERSISTENT_CARDS);
			} else {
				kept = candidates.slice(0, STREET_VIEW_MAX_PERSISTENT_CARDS);
			}
		}

		return kept.slice().sort((a, b) => a.contact.id - b.contact.id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isStreetCardMode,
		isBackgroundPresentation,
		visibleContacts,
		bookingExtraVisibleContacts,
		promotionOverlayVisibleContacts,
		getContactCoords,
		getBookingExtraContactCoords,
		getPromotionOverlayContactCoords,
		selectedContactIdSet,
		baseContactIdSet,
		isBookingSearch,
	]);

	const hoverTooltipData = useMemo(() => {
		if (!hoverTooltipEntry) return null;
		const contact = hoverTooltipEntry.contact;
		const kind = hoverTooltipEntry.kind;

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
			const whatForMarker = getAmbientContactWhatFromTitle(contact.title);
			if (whatForMarker) {
				const normalizedWhat = normalizeWhatKey(whatForMarker);
				const tooltipFillColor =
					WHAT_TO_HOVER_TOOLTIP_FILL_COLOR[normalizedWhat] ?? PEOPLE_TOOLTIP_FILL_COLOR;
				const tooltipBodyFillColor =
					WHAT_TO_HOVER_TOOLTIP_BODY_FILL_COLOR[normalizedWhat] ?? PEOPLE_TOOLTIP_FILL_COLOR;
				const width = calculateTooltipWidth(
					nameForTooltip,
					companyForTooltip,
					titleForTooltip,
					whatForMarker
				);
				const height = calculateTooltipHeight(nameForTooltip, companyForTooltip);
				const anchorY = calculateTooltipAnchorY(nameForTooltip, companyForTooltip);
				return {
					svg: generateMapTooltipSvg(
						nameForTooltip,
						companyForTooltip,
						titleForTooltip,
						tooltipFillColor,
						whatForMarker,
						tooltipBodyFillColor
					),
					width,
					height,
					anchorY,
				};
			}

			const tooltipFillColor = PEOPLE_TOOLTIP_FILL_COLOR;
			const width = calculateTooltipWidth(
				nameForTooltip,
				companyForTooltip,
				titleForTooltip
			);
			const height = calculateTooltipHeight(nameForTooltip, companyForTooltip);
			const anchorY = calculateTooltipAnchorY(nameForTooltip, companyForTooltip);
			return {
				svg: generateMapTooltipSvg(
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
		const normalizedWhat = whatForMarker ? normalizeWhatKey(whatForMarker) : null;
		const baseTooltipFillColor = normalizedWhat
			? (WHAT_TO_HOVER_TOOLTIP_FILL_COLOR[normalizedWhat] ?? PEOPLE_TOOLTIP_FILL_COLOR)
			: PEOPLE_TOOLTIP_FILL_COLOR;
		const baseTooltipBodyFillColor = normalizedWhat
			? (WHAT_TO_HOVER_TOOLTIP_BODY_FILL_COLOR[normalizedWhat] ?? PEOPLE_TOOLTIP_FILL_COLOR)
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
			svg: generateMapTooltipSvg(
				nameForTooltip,
				companyForTooltip,
				titleForTooltip,
				baseTooltipFillColor,
				whatForMarker,
				baseTooltipBodyFillColor
			),
			width,
			height,
			anchorY,
		};
	}, [hoverTooltipEntry, searchWhat]);

	const hoverTooltipLat = hoverTooltipCoords?.lat ?? null;
	const hoverTooltipLng = hoverTooltipCoords?.lng ?? null;
	const hoverTooltipWidth = hoverTooltipData?.width ?? null;
	const hoverTooltipHeight = hoverTooltipData?.height ?? null;

	useLayoutEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isLoading) return;
		const el = hoverTooltipOverlayRef.current;
		if (
			!el ||
			hoverTooltipLat == null ||
			hoverTooltipLng == null ||
			hoverTooltipWidth == null ||
			hoverTooltipHeight == null
		)
			return;

		const update = () => {
			const p = map.project([hoverTooltipLng, hoverTooltipLat]);
			const { clientWidth, clientHeight } = map.getContainer();
			const placement = createHoverTooltipSidePlacement({
				markerX: p.x,
				markerY: p.y,
				tooltipWidth: hoverTooltipWidth,
				tooltipHeight: hoverTooltipHeight,
				hitSlopPx: hoverTooltipHitSlopPx,
				sideGapXPx: HOVER_TOOLTIP_SIDE_GAP_X_PX,
				sideGapYPx: HOVER_TOOLTIP_SIDE_GAP_Y_PX,
				viewportWidth: clientWidth,
				viewportHeight: clientHeight,
			});
			el.style.transform = `translate(${Math.round(placement.x)}px, ${Math.round(
				placement.y
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
		// The street-card mode flip unmounts/remounts this overlay (same hover
		// target, same coords), so it must re-run the effect: cleanup detaches the
		// 'move' listener bound to the old element and the remounted tooltip is
		// positioned before paint.
		isStreetCardMode,
		hoverTooltipContactId,
		hoverTooltipLat,
		hoverTooltipLng,
		hoverTooltipWidth,
		hoverTooltipHeight,
		hoverTooltipHitSlopPx,
		tooltipMarkerGapPx,
	]);

	// Street-view research card positioning: the outer overlay anchors at the marker's
	// projected point only; an inner div self-centers above it (translate(-50%, -100%)),
	// so async research data changing the card's height never needs a re-measure.
	// map.project runs through the full camera matrix, so the pitched street camera
	// is handled for free.
	useLayoutEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isLoading) return;
		const el = streetCardOverlayRef.current;
		if (!el || !isStreetCardMode || !hoverTooltipCoords) return;

		const update = () => {
			const p = map.project([hoverTooltipCoords.lng, hoverTooltipCoords.lat]);
			el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
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
		isStreetCardMode,
		hoverTooltipContactId,
		hoverTooltipCoords?.lat,
		hoverTooltipCoords?.lng,
	]);

	// Persistent street-view cards positioning: ONE shared listener re-projects every
	// mounted card (same outer-anchor/inner-self-center scheme as the hover card
	// above). 'moveend' is included because the continuous pitch coupler writes the
	// transform without firing 'move' — the gesture's own frames cover the ramp, but
	// the final frame's pitch lands after the last 'move', so the settle pass here
	// squares the cards with the settled camera. Both handlers MUST stay read-only
	// (project only — see the synchronous-moveend hazard on the pitch reconciler).
	useLayoutEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isLoading) return;
		if (!isStreetCardMode || streetCardEntries.length === 0) return;

		const update = () => {
			for (const entry of streetCardEntries) {
				const el = streetCardElsByContactIdRef.current.get(entry.contact.id);
				if (!el) continue;
				const p = map.project([entry.coords.lng, entry.coords.lat]);
				el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
			}
		};

		update();
		map.on('move', update);
		map.on('moveend', update);
		return () => {
			map.off('move', update);
			map.off('moveend', update);
		};
	}, [map, isMapLoaded, isLoading, isStreetCardMode, streetCardEntries]);

	return (
		<div
			data-website-preview-scroll-dismiss
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
			{/* Three-class selectors so the logo out-specifies the
			    `.dashboard-globe-bg .mapboxgl-ctrl-logo { display: none }` hide rule in
			    every presentation, including the background globe. */}
			<style>{`
				.murmur-search-results-map .mapboxgl-ctrl-bottom-left {
					left: 8px !important;
					bottom: 6px !important;
				}
				.murmur-search-results-map .mapboxgl-ctrl-bottom-left .mapboxgl-ctrl-logo {
					display: block !important;
					transform: scale(0.6);
					transform-origin: 0 100%;
					opacity: 0.8;
				}
			`}</style>
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
					<clipPath id={selectedStateGradientIds.clipPath} clipPathUnits="userSpaceOnUse">
						<path ref={selectedStateGradientClipPathRef} d="" clipRule="evenodd" />
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
								<stop offset="0.783654" stopColor="#FFF8E5" stopOpacity="0.55" />
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
			{/*
			  Unsubscribe burn washes. The flow's "globe on fire" effect: a uniform
			  multiply char that reddens/darkens what the basemap paint can't reach
			  (clouds, lighting overlays), plus a late-stage screen-blend ember
			  under-glow. Opacities owned by applyLightingOverlayOpacity; both stay
			  0 outside the unsubscribe flow, so initial opacity is set explicitly
			  to avoid a dark-red first paint before the first apply runs.
			*/}
			<div
				ref={lightingOverlayBurnWashRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: UNSUBSCRIBE_BURN_WASH_COLOR,
					mixBlendMode: 'multiply',
					zIndex: 1,
					opacity: 0,
				}}
			/>
			<div
				ref={lightingOverlayBurnGlowRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: UNSUBSCRIBE_BURN_GLOW_BG,
					mixBlendMode: 'screen',
					zIndex: 1,
					opacity: 0,
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

			{/* Empty-map hover prompt: pointer-events none so dragging/panning remains Mapbox-owned. */}
			{emptyMapPromptEnabled && emptyMapPromptPoint && emptyMapPromptText && (
				<div
					aria-hidden="true"
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						transform: `translate(${emptyMapPromptPoint.x}px, ${emptyMapPromptPoint.y}px)`,
						pointerEvents: 'none',
						zIndex: HOVER_TOOLTIP_Z_INDEX + 8,
					}}
				>
					<div
						style={{
							position: 'relative',
							transform: 'translate(-50%, calc(-100% - 14px))',
							backgroundColor: '#000000',
							color: '#FFFFFF',
							borderRadius: '8px',
							padding: '5px 9px',
							fontFamily: 'Inter, sans-serif',
							fontSize: '12px',
							fontWeight: 600,
							lineHeight: 1.15,
							letterSpacing: '0.01em',
							whiteSpace: 'nowrap',
						}}
					>
						{emptyMapPromptText}
					</div>
				</div>
			)}

			{!isLoading &&
				!isStreetCardMode &&
				renderedSelectedTooltipStackGroups.length > 0 &&
				renderedSelectedTooltipStackGroups.map((group) => {
					const backLayerCount = Math.min(
						SELECTED_TOOLTIP_STACK_FAKE_BACK_COUNT,
						Math.max(0, group.count - 1)
					);
					return (
						<div
							key={group.id}
							ref={(el) => registerSelectedTooltipStackEl(group.id, el)}
							aria-hidden="true"
							style={{
								position: 'absolute',
								left: 0,
								top: 0,
								width: `${group.width}px`,
								height: `${group.height}px`,
								pointerEvents: 'none',
								opacity: 0,
								zIndex: HOVER_TOOLTIP_Z_INDEX + 1,
								transition: 'opacity 150ms ease-in-out',
							}}
						>
							{Array.from({ length: backLayerCount }).map((_, index) => {
								const depth = backLayerCount - index;
								return (
									<div
										key={index}
										style={{
											position: 'absolute',
											left: `${-depth * SELECTED_TOOLTIP_STACK_OFFSET_X_PX}px`,
											top: `${-depth * SELECTED_TOOLTIP_STACK_OFFSET_Y_PX}px`,
											width: '100%',
											height: '100%',
											boxSizing: 'border-box',
											border: '1.5px solid black',
											borderRadius: '8px',
											backgroundColor:
												group.colors[depth % group.colors.length] ??
												group.bodyFillColor,
										}}
									/>
								);
							})}
							<div
								dangerouslySetInnerHTML={{ __html: group.svg }}
								style={{
									position: 'absolute',
									left: 0,
									top: 0,
									width: '100%',
									height: '100%',
									display: 'block',
									lineHeight: 0,
								}}
							/>
						</div>
					);
				})}

			{/* Selected compact SVG tooltips: persistent top-card-only labels for the
			    dashboard search map. The active hover tooltip renders above these and
			    includes the bottom title band. */}
			{!isLoading &&
				!isStreetCardMode &&
				selectedCompactTooltipEntries.length > 0 &&
				selectedCompactTooltipEntries.map((entry) => (
					<div
						key={entry.contact.id}
						ref={(el) => registerSelectedCompactTooltipEl(entry.contact.id, el)}
						style={{
							position: 'absolute',
							left: 0,
							top: 0,
							width: `${entry.width}px`,
							height: `${entry.height}px`,
							pointerEvents: 'none',
							opacity:
								hoveredMarkerId === entry.contact.id ||
								renderedStackedSelectedContactIdSet.has(entry.contact.id) ||
								(selectedTooltipHoverHiddenTarget?.type === 'contact' &&
									selectedTooltipHoverHiddenTarget.id === entry.contact.id)
									? 0
									: 1,
							transition: 'opacity 150ms ease-in-out',
							zIndex: HOVER_TOOLTIP_Z_INDEX - 1,
						}}
					>
						<div
							dangerouslySetInnerHTML={{ __html: entry.svg }}
							style={{
								width: '100%',
								height: '100%',
								display: 'block',
								lineHeight: 0,
							}}
						/>
					</div>
				))}

			{/* Hover SVG tooltip (single overlay; positioned via map.project). At street
			    zoom the rich research card below replaces it. */}
			{!isLoading &&
				!isStreetCardMode &&
				hoverTooltipEntry &&
				hoverTooltipCoords &&
				hoverTooltipData && (
					<div
						ref={hoverTooltipOverlayRef}
						style={{
							position: 'absolute',
							left: 0,
							top: 0,
							width: `${hoverTooltipData.width + hoverTooltipHitSlopPx * 2}px`,
							height: `${hoverTooltipData.height + hoverTooltipHitSlopPx * 2}px`,
							pointerEvents: 'none',
							padding: `${hoverTooltipHitSlopPx}px`,
							boxSizing: 'border-box',
							zIndex: HOVER_TOOLTIP_Z_INDEX,
						}}
					>
						<div
							style={{
								width: '100%',
								height: `${hoverTooltipData.height}px`,
								opacity:
									hoverTooltipContactId != null &&
									hoveredMarkerId === hoverTooltipContactId
										? 1
										: 0,
								transition: 'opacity 150ms ease-in-out',
								flexShrink: 0,
							}}
						>
							<div
								dangerouslySetInnerHTML={{ __html: hoverTooltipData.svg }}
								style={{
									width: '100%',
									height: '100%',
									display: 'block',
									lineHeight: 0,
								}}
							/>
						</div>
					</div>
				)}

			{/* Persistent street-view research cards (search-result dots + booking/
			    promotion pins). Positions are set imperatively by the shared 'move'
			    listener; hover raises a card within this container. */}
			{!isLoading && isStreetCardMode && streetCardEntries.length > 0 && (
				<div
					ref={streetCardsContainerRef}
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						zIndex: HOVER_TOOLTIP_Z_INDEX,
						pointerEvents: 'none',
					}}
				>
					{streetCardEntries.map((entry) => (
						<StreetViewContactCard
							key={entry.contact.id}
							contact={entry.contact}
							coords={entry.coords}
							isSelected={entry.isSelected}
							isSelectionEligible={entry.isSelectionEligible}
							isHovered={hoveredMarkerId === entry.contact.id}
							onHoverStart={handleMarkerMouseOver}
							onHoverEnd={handleMarkerMouseOut}
							onToggleSelection={handleStreetCardToggleSelection}
							onWheelForward={forwardWheelToMap}
							registerEl={registerStreetCardEl}
						/>
					))}
				</div>
			)}

			{/* Street-view research card for ambient 'all'-contacts dots only (those
			    stay hover-gated; everything else has a persistent card above). */}
			{!isLoading &&
				isStreetCardMode &&
				hoverTooltipEntry &&
				hoverTooltipCoords &&
				streetCardData && (
					<div
						ref={streetCardOverlayRef}
						style={{
							position: 'absolute',
							left: 0,
							top: 0,
							// Above the persistent cards (hover intent), below the
							// selected-marker panel (+10).
							zIndex: HOVER_TOOLTIP_Z_INDEX + 5,
							pointerEvents: 'none',
						}}
					>
						{/* Self-centers above the marker point; the transparent bottom padding
					    bridges the marker→card gap so hover never crosses a dead zone. */}
						<div
							style={{
								transform: 'translate(-50%, -100%)',
								paddingBottom: '18px',
								pointerEvents:
									hoverTooltipContactId != null &&
									hoveredMarkerId === hoverTooltipContactId
										? 'auto'
										: 'none',
								opacity:
									hoverTooltipContactId != null &&
									hoveredMarkerId === hoverTooltipContactId
										? 1
										: 0,
								transition: 'opacity 150ms ease-in-out',
							}}
							onMouseEnter={() => handleMarkerMouseOver(hoverTooltipEntry.contact)}
							onMouseLeave={() => handleMarkerMouseOut(hoverTooltipEntry.contact.id)}
							onWheel={forwardWheelToMap}
						>
							<div
								className="relative w-[280px] rounded-[10px] bg-white overflow-hidden font-inter"
								style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
							>
								{/* Name / company / coordinates */}
								<div className="px-3 pt-3 pb-2">
									<div className="font-bold text-[14px] leading-tight text-black truncate">
										{streetCardData.name}
									</div>
									{streetCardData.company && (
										<div className="text-[12px] leading-tight text-black/70 truncate mt-[2px]">
											{streetCardData.company}
										</div>
									)}
									<div className="text-[10px] leading-none text-black/50 mt-[6px] tabular-nums">
										{hoverTooltipCoords.lat.toFixed(4)}{' '}
										{hoverTooltipCoords.lng.toFixed(4)}
									</div>
								</div>
								{/* Category-colored accent divider */}
								<div
									className="w-full"
									style={{ height: '3px', backgroundColor: streetCardData.accentColor }}
								/>
								{/* Address + research blurb */}
								<div className="px-3 py-2">
									{streetCardData.address && (
										<div className="text-[12px] font-semibold text-black leading-snug">
											{streetCardData.address}
										</div>
									)}
									{streetCardData.blurb ? (
										<div
											className="text-[11px] text-black/70 leading-snug mt-1"
											style={{
												display: '-webkit-box',
												WebkitLineClamp: 3,
												WebkitBoxOrient: 'vertical',
												overflow: 'hidden',
											}}
										>
											{streetCardData.blurb}
										</div>
									) : isStreetCardResearchLoading ? (
										<div className="text-[11px] italic text-black/40 mt-1">
											Researching…
										</div>
									) : null}
								</div>
								{/* Selection toggle (hidden for contacts the marker click also ignores) */}
								{streetCardData.isSelectionEligible && (
									<button
										type="button"
										className="w-full h-[34px] text-[12px] font-bold text-black transition-colors"
										style={{
											backgroundColor: streetCardData.isSelected ? '#9BC6DF' : '#C9EAFF',
											borderTop: '1px solid rgba(0,0,0,0.15)',
										}}
										onClick={(e) => {
											e.stopPropagation();
											handleStreetCardToggleSelection(hoverTooltipEntry.contact);
										}}
									>
										{streetCardData.isSelected
											? 'Remove from Selection'
											: 'Add to Selection'}
									</button>
								)}
							</div>
							{/* Pointer triangle (sits in the bottom hover-bridge padding) */}
							<div
								className="absolute left-1/2 -translate-x-1/2"
								style={{
									bottom: '8px',
									width: 0,
									height: 0,
									borderLeft: '8px solid transparent',
									borderRight: '8px solid transparent',
									borderTop: `10px solid ${
										streetCardData.isSelectionEligible
											? streetCardData.isSelected
												? '#9BC6DF'
												: '#C9EAFF'
											: '#FFFFFF'
									}`,
								}}
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

			{/* Event opportunity popup (phase 1: shapes + lat/lng only). Outer red box,
			    inner white box inset 5px from the top, and a bottom red strip with the
			    event coordinates. Positioned by the edge-aware placement effect above. */}
			{!isLoading && activeEvent && (
				<div
					ref={eventPopupOverlayRef}
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: `${EVENT_POPUP_W}px`,
						height: `${EVENT_POPUP_H}px`,
						pointerEvents: hoveredEventId === activeEvent.id ? 'auto' : 'none',
						zIndex: HOVER_TOOLTIP_Z_INDEX + 12,
					}}
					onMouseEnter={() => {
						isPointerOverEventPopupRef.current = true;
						setEventHover(activeEvent.id);
					}}
					onMouseLeave={() => {
						isPointerOverEventPopupRef.current = false;
						scheduleEventHoverClose();
					}}
					onWheel={forwardWheelToMap}
				>
					{/* Outer red box — authored at its natural design size and uniformly
					    scaled down to the footprint above. transform-origin top-left so the
					    scaled box aligns with the overlay's translate() placement. */}
					<div
						style={{
							position: 'relative',
							width: `${EVENT_POPUP_DESIGN_W}px`,
							height: `${EVENT_POPUP_DESIGN_H}px`,
							transform: `scale(${EVENT_POPUP_SCALE})`,
							transformOrigin: 'top left',
							background: '#E06D6D',
							border: '3px solid #A43B3B',
							borderRadius: '16px',
							boxSizing: 'border-box',
						}}
					>
						{/* Inner white box: 347×427, 5px from top, horizontally centered. Hosts the
						    event card content supplied by the host via renderEventPopupContent. */}
						<div
							style={{
								position: 'absolute',
								top: '5px',
								left: 0,
								right: 0,
								marginLeft: 'auto',
								marginRight: 'auto',
								width: '347px',
								height: '427px',
								background: '#FFF',
								border: '2px solid #000',
								borderRadius: '12px',
								boxSizing: 'border-box',
								overflow: 'hidden',
							}}
						>
							{renderEventPopupContent?.(activeEvent.id)}
						</div>
						{/* Bottom red strip: the event's lat/lng (the only text in phase 1). */}
						<div
							style={{
								position: 'absolute',
								left: 0,
								right: 0,
								top: '432px',
								bottom: 0,
								paddingLeft: '14px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'flex-start',
								color: '#000',
								fontSize: '12px',
								lineHeight: 1,
								fontVariantNumeric: 'tabular-nums',
							}}
						>
							{`${activeEvent.lat.toFixed(4)}  ${activeEvent.lng.toFixed(4)}`}
						</div>
					</div>
				</div>
			)}

			{/* Multi-select action card — docked beside the left "Showing" rail when the
			    selection is off-screen or zoomed out; otherwise anchored above the
			    top-most selected dot. Stays in the map layer so portaled top nav /
			    side panel (z-120+) always stacks above (see VenueMapActionPills). */}
			{!isLoading && selectedContacts.length >= 1 && onAddSelectionToFolder && (
				<div
					ref={selectionActionsOverlayRef}
					className="pointer-events-none absolute left-0 top-0 will-change-transform"
					style={{
						opacity: 0,
						zIndex: SELECTION_ACTIONS_Z_INDEX,
					}}
					onMouseDown={(e) => e.stopPropagation()}
					onPointerDown={(e) => e.stopPropagation()}
					onWheel={forwardWheelToMap}
				>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '4px',
							padding: '5px',
							backgroundColor: '#FFFFFF',
							borderRadius: '9px',
							boxSizing: 'border-box',
						}}
					>
						<button
							type="button"
							onClick={() => onAddSelectionToFolder?.()}
							className="font-inter"
							style={{
								width: '100%',
								padding: '5px 10px',
								backgroundColor: '#EFEFEF',
								border: 'none',
								borderRadius: '6px',
								fontSize: '12px',
								fontWeight: 500,
								color: '#000000',
								textAlign: 'left',
								whiteSpace: 'nowrap',
								cursor: 'pointer',
							}}
						>
							Add Contacts to Folder
						</button>
						<button
							type="button"
							onClick={() => onWriteSelectionMessage?.()}
							className="font-inter"
							style={{
								width: '100%',
								padding: '5px 10px',
								backgroundColor: '#EFEFEF',
								border: 'none',
								borderRadius: '6px',
								fontSize: '12px',
								fontWeight: 500,
								color: '#000000',
								textAlign: 'left',
								whiteSpace: 'nowrap',
								cursor: 'pointer',
							}}
						>
							Write Message
						</button>
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
