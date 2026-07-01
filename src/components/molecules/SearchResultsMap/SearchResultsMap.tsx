'use client';

import { CuratedOrbSvg } from './CuratedOrbSvg';
import { MapLightingOverlays } from './MapLightingOverlays';
import { SelectedStateGradientSvg } from './SelectedStateGradientSvg';
import { useAreaSelectCompletion } from './useAreaSelectCompletion';
import { useRadiusSearchTool } from './useRadiusSearchTool';
import { useCuratedBlobBuilder, useCuratedBlobOrb, useCuratedBlobMorphBinding } from './useCuratedBlob';
import { useSelectedStateGradient } from './useSelectedStateGradient';
import { useBaseDotsWaveControl, useBaseDotsSource, useBaseDotsVisibilityFilter, useBaseDotsWaveReveal } from './useBaseResultDots';
import { useConstellationControls, useConstellationWriter, useConstellationDimSync, useConstellationComposer } from './useMarkerConstellation';
import { useSelectedMarkerArtwork } from './useSelectedMarkerArtwork';
import { useMapMarkerImages } from './useMapMarkerImages';
import { useOverlayMarkerSources } from './useOverlayMarkerSources';
import { useApplyWeatherMoodConfig } from './useApplyWeatherMoodConfig';
import { useLightingAppliers } from './useLightingAppliers';
import { useLightingDrivers } from './useLightingDrivers';
import { useWeatherMoodTransitions } from './useWeatherMoodTransitions';
import { useWeatherCanvasAnimation } from './useWeatherCanvasAnimation';
import { useContactOverlayFetching } from './useContactOverlayFetching';
import { useCampaignFootprint } from './useCampaignFootprint';
import { useCampaignHeatmap } from './useCampaignHeatmap';
import { ensureMapboxSourcesAndLayersImpl } from './ensureMapboxSourcesAndLayers';
import { useBasemapPrewarm } from './useBasemapPrewarm';
import { useCameraPadding } from './useCameraPadding';
import { useEventsRadar } from './useEventsRadar';
import { useMapInputAffordances } from './useMapInputAffordances';
import { useOwnedVenueRadar } from './useOwnedVenueRadar';
import { AllContactsOverlayFetchBbox, AllContactsOverlayFetchMode, AllContactsOverlayFetchPhase, DASHBOARD_MAP_CAMERA_SCRUB_EVENT, DashboardMapCameraScrubDetail, DashboardMapCameraScrubState, RADIO_CONTACT_CATEGORY_INDEX, getAmbientContactCategoryIndexFromTitle, getAmbientContactWhatFromTitle } from './ambientOverlayShared';
import { CompactOverlayPillEntry, CompactOverlaySettledViewport, applyCompactPillLabelFade, compactOverlayRectsOverlap, getCompactOverlayCategoryKey, getCompactOverlayIconSpec, getCompactOverlayLabel, getCompactOverlayPillWidth, getCompactOverlayWhatForContact, prefixCompactOverlayInlineSvgIds, projectCompactOverlayPoint, recolorCompactOverlayInnerFill } from './compactOverlayPillPrimitives';
import { MAP_CUSTOM_INPUT_EVENT_KEY, MAP_RIGHT_CLICK_DOUBLE_DISTANCE_PX, MAP_RIGHT_CLICK_DOUBLE_MS, MAP_RIGHT_DOUBLE_CLICK_ZOOM_EASE_MS, MAP_RIGHT_DOUBLE_CLICK_ZOOM_OUT_DELTA, MAP_SHIFT_ARROW_ZOOM_DELTA, applyScrollZoomFeel, computeStreetViewPitch, createConfiguredZoomOutGovernor, enableDragPanFeel, uploadCanvasSourceOnce } from './mapInputFeel';
import { CAMPAIGN_STATUS_CONSTELLATION_CORE_OPACITY, CAMPAIGN_STATUS_CONSTELLATION_GLOW_OPACITY, CAMPAIGN_STATUS_MARKER_STYLES, CampaignContactMapStatus, CampaignStatusMarkerStyle, DASHBOARD_DRAFTING_DRAFT_LINE_COLOR, DASHBOARD_DRAFTING_MARKER_STYLES, DashboardDraftingMapContactStatus, EMPTY_MAP_CLICK_PROMPT_EDGE_PADDING_BOTTOM_PX, EMPTY_MAP_CLICK_PROMPT_EDGE_PADDING_TOP_PX, EMPTY_MAP_CLICK_PROMPT_EDGE_PADDING_X_PX, FEATURE_FILL_OPACITY_FACTOR, FEATURE_STROKE_OPACITY_FACTOR, GENERAL_CONTACT_CONSTELLATION_LINE_COLOR, SELECTED_STATUS_DOT_FILL_COLOR, SELECTED_STATUS_DOT_RADIUS_SCALE, SELECTED_STATUS_DOT_STROKE_COLOR, SELECTED_STATUS_DOT_STROKE_WIDTH, VENUE_DOT_RADIUS_SCALE, VENUE_ICON_SIZE_SCALE_EXPR, buildBaseMarkerVisibilityFilter, withFeatureFillOpacity, withFeatureOpacityFactor, withFeatureStrokeOpacity } from './markerStatusStyles';
import { CANVAS_PERF_MODE, IS_SAFARI } from './perfFlags';
import { CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_DIMENSIONS, CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_NAME, CAMPAIGN_FOOTPRINT_SPARK_ICON_URL, EVENT_POPUP_DESIGN_H, EVENT_POPUP_DESIGN_W, EVENT_POPUP_GAP, EVENT_POPUP_H, EVENT_POPUP_HOVER_CLOSE_DELAY_MS, EVENT_POPUP_SCALE, EVENT_POPUP_STAR_HALF, EVENT_POPUP_W, EVENT_STAR_ICON_IMAGE_DIMENSIONS, EVENT_STAR_ICON_IMAGE_NAME, EVENT_STAR_ICON_URL, KM_PER_MILE, MapEvent, OWNED_VENUE_HOME_ICON_IMAGE_DIMENSIONS, OWNED_VENUE_HOME_ICON_IMAGE_NAME, OWNED_VENUE_HOME_ICON_URL, OWNED_VENUE_RADAR_MS, RADAR_FRAME_MS, RADIUS_PLACEMENT_PREVIEW_STEPS, buildEventsGlowFeatures, buildEventsMapOverlayData, buildEventsRadarLineFeatures, buildOwnedVenueGlowFeatures, buildOwnedVenueMapOverlayData, buildOwnedVenueRadarLineFeatures, emptyFeatureCollection, isValidOwnedVenueLocation } from './radarOverlays';
import { SearchResultsMapProps, interactiveEntryCameraKey } from './searchResultsMapProps';
import { HOVER_TOOLTIP_SIDE_GAP_X_PX, HOVER_TOOLTIP_SIDE_GAP_Y_PX, PEOPLE_TOOLTIP_BODY_FILL_COLOR, PEOPLE_TOOLTIP_FILL_COLOR, ProjectedSelectedTooltipEntry, SELECTED_TOOLTIP_FADE_END_ZOOM, SELECTED_TOOLTIP_FADE_START_ZOOM, SELECTED_TOOLTIP_STACK_FAKE_BACK_COUNT, SELECTED_TOOLTIP_STACK_MIN_SCALE, SELECTED_TOOLTIP_STACK_OFFSET_X_PX, SELECTED_TOOLTIP_STACK_OFFSET_Y_PX, SelectedCompactTooltipEntry, SelectedCompactTooltipSourceKind, SelectedTooltipHoverHiddenTarget, SelectedTooltipIndividualPlacement, SelectedTooltipStackGroup, buildSelectedTooltipIndividualPlacements, buildSelectedTooltipStackPlacements, createHoverTooltipSidePlacement, getContactTitleForTooltip, getHoverTooltipBodyFillColor, getHoverTooltipFillColor, getSelectedTooltipStackBounds, isClientPointInsideRect, selectedTooltipHoverTargetsEqual } from './selectedTooltipLayout';
import { SELECTION_ACTIONS_ANCHOR_FULL_ZOOM, SELECTION_ACTIONS_AROUND_SIDE_GAP_PX, SELECTION_ACTIONS_DOCK_FULL_ZOOM, SELECTION_ACTIONS_DOCK_GAP_PX, SELECTION_ACTIONS_DOCK_RAIL_WIDTH_PX, SELECTION_ACTIONS_FALLBACK_TOOLTIP_ABOVE_PX, SELECTION_ACTIONS_FALLBACK_TOOLTIP_HALF_W_PX, SELECTION_ACTIONS_MAP_SELECT_GRAB_LEFT_PX, SELECTION_ACTIONS_MAP_SELECT_GRAB_TOP_EXTENT_PX, SELECTION_ACTIONS_MAP_VIEW_SIDE_PANEL_TOP_PX, SELECTION_ACTIONS_MARKER_CLEAR_RADIUS_PX, SELECTION_ACTIONS_PAN_COMFORT_PAD_PX, SELECTION_ACTIONS_PAN_DOCK_RAMP_PX, SELECTION_ACTIONS_SHOWING_ABOVE_GRAB_ORIGIN_PX, SELECTION_ACTIONS_VIEWPORT_MARGIN_PX, SELECTION_ACTIONS_Z_INDEX, readSelectionActionsTopChromeBottomPx } from './selectionActionsLayout';

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
	measureTextWidthWithFallback,
	normalizeInlineSvgMarkupForXml,
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
import {
	getTooltipCategoryIconSpec,
	getTooltipCategoryInnerFillColor,
	isCleanMapMarkerCategory,
	type TooltipCategoryIconSpec,
} from '@/components/atoms/_svg/mapTooltipCategoryIcons';
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
import { isSafariBrowser } from '@/utils/browserDetection';
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
	CAMPAIGN_HEATMAP_DENSITY_SCALE_FULL_COUNT,
	CAMPAIGN_HEATMAP_DENSITY_SCALE_MIN,
	CAMPAIGN_HEATMAP_DENSITY_SCALE_START_COUNT,
	CAMPAIGN_HEATMAP_FADE_MS,
	CAMPAIGN_HEATMAP_GLOW_BLUR,
	CAMPAIGN_HEATMAP_GLOW_OPACITY_MAX,
	campaignHeatmapGlowRadiusExpr,
	buildCampaignHeatmapZoomFadedOpacity,
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
	LIGHTWEIGHT_COMPACT_OVERLAY_CANDIDATE_LIMIT,
	LIGHTWEIGHT_COMPACT_OVERLAY_COLLISION_MARGIN_PX,
	LIGHTWEIGHT_COMPACT_OVERLAY_COMPACT_REENTER_ZOOM,
	LIGHTWEIGHT_COMPACT_OVERLAY_DETAIL_ENTER_ZOOM,
	LIGHTWEIGHT_COMPACT_OVERLAY_FETCH_MIN_ZOOM,
	LIGHTWEIGHT_COMPACT_OVERLAY_HEIGHT_PX,
	LIGHTWEIGHT_COMPACT_OVERLAY_KEEP_PAD_FACTOR,
	LIGHTWEIGHT_COMPACT_OVERLAY_MAX_WIDTH_PX,
	LIGHTWEIGHT_COMPACT_OVERLAY_MIN_WIDTH_PX,
	LIGHTWEIGHT_COMPACT_OVERLAY_TARGET_PILLS_MAX,
	LIGHTWEIGHT_COMPACT_OVERLAY_TARGET_PILLS_MIN,
	LIGHTWEIGHT_COMPACT_OVERLAY_ZOOMED_OUT_END_ZOOM,
	LIGHTWEIGHT_COMPACT_OVERLAY_ZOOMED_OUT_FULL_ZOOM,
	LIGHTWEIGHT_COMPACT_OVERLAY_ZOOMED_OUT_TARGET_PILLS,
	LIGHTWEIGHT_DETAIL_MARKER_BUDGET,
	CURATED_BLOB_DISENGAGE_PERIMETER_BAND_PX,
	MANUAL_NIGHT_T_OVERRIDE,
	MANUAL_WEATHER_MOOD_OVERRIDE,
	MANUAL_WEATHER_TEMPERATURE_OVERRIDE_F,
	MAPBOX_LAYER_IDS,
	MAPBOX_SOURCE_IDS,
	MAPBOX_STYLE,
	MAP_BOOT_BASEMAP_SETTLE_BACKSTOP_MS,
	MAP_BOOT_CONTACTS_GATE_BACKSTOP_MS,
	MAP_DEFAULT_ZOOM,
	MAP_VIEWPORT_SETTLE_DEBOUNCE_MS,
	MAP_VIEWPORT_SETTLE_MAX_WAIT_MS,
	MAP_MIN_ZOOM,
	MOBILE_MAP_MIN_ZOOM,
	getInteractiveMapMinZoomDelta,
	MAP_PINCH_ZOOM_RATE,
	MAP_WHEEL_ZOOM_RATE,
	MAPBOX_NATIVE_PINCH_ZOOM_RATE,
	MAPBOX_NATIVE_WHEEL_ZOOM_RATE,
	MAP_REQUESTED_ZOOM_EASE_MS,
	ZOOM_OUT_GOVERNOR_ENABLED,
	ZOOM_OUT_GOVERNOR_MIN_RATE_MULTIPLIER,
	ZOOM_OUT_GOVERNOR_ENERGY_SCALE,
	ZOOM_OUT_GOVERNOR_ENERGY_DECAY_TAU_MS,
	ZOOM_OUT_GOVERNOR_GESTURE_GAP_MS,
	ZOOM_OUT_GOVERNOR_DEADZONE,
	ZOOM_OUT_GOVERNOR_APPLY_EPSILON,
	getDragPanInertiaOptions,
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
	STATE_LABEL_FULL_NAME_ZOOM,
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
import { createZoomOutGovernor } from './zoomOutGovernor';
import {
	buildCompactOverlayLabel,
	shrinkCompactOverlayLabelToFit,
} from './compactOverlayLabel';
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
	mapboxEaseOutQuart,
	mapboxEaseInOutCubic,
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
	applyBasemapSettlementLabelPresentation,
	applyFreeTrialMapVisualTuning,
	applyMapboxFogForMoodAndNight,
	applyMurmurGlobeLighting,
	applyNightLandPalette,
	applyUsOnlyBasemapCartography,
	ensureWorldLandFill,
	getFirstBasemapSettlementLabelLayerId,
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
export type { DashboardDraftingMapContactStatus, CampaignContactMapStatus } from './markerStatusStyles';
export type { SearchResultsMapProps } from './searchResultsMapProps';

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
	dashboardDraftingContactStatusById,
	campaignHeatmapColor = null,
	campaignHeatmapStatusColors,
	campaignHeatmapAmbient = false,
	campaignFootprintContacts = [],
	transientOverlayResetKey = null,
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
	onOverlayBusyChange,
	onMapLoadedChange,
	onMapFirstPaintChange,
	onInteractiveMinZoomChange,
	disableDotWaveReveal = false,
	lightweightSearchOverlayEnabled = false,
	curatedBlobSearchActive = false,
	stateCategorySearchActive = false,
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
	suppressContextualContactOverlays = false,
	onRadiusCenterChange,
	radiusPlacementActive = false,
	radiusPlacementMiles = 50,
	onRadiusPlace,
	onRadiusPlacementCancel,
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
	const getDashboardDraftingStatusForContact = useCallback(
		(contactId: number): DashboardDraftingMapContactStatus | null =>
			dashboardDraftingContactStatusById?.get(contactId) ?? null,
		[dashboardDraftingContactStatusById]
	);
	const getDashboardDraftingMarkerStyleForContact = useCallback(
		(contactId: number) => {
			const status = getDashboardDraftingStatusForContact(contactId);
			return status ? DASHBOARD_DRAFTING_MARKER_STYLES[status] : null;
		},
		[getDashboardDraftingStatusForContact]
	);
	const getDashboardDraftingTooltipFillColorForContact = useCallback(
		(contactId: number): string | null =>
			getDashboardDraftingMarkerStyleForContact(contactId)?.tooltipFillColor ?? null,
		[getDashboardDraftingMarkerStyleForContact]
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
	// Last camera-motion timestamp; drives the Safari idle drift cadence.
	// Last raster-opacity applied per layer by applyLightingOverlayOpacity (it
	// runs on every zoom frame; skipping unchanged values avoids restarting
	// mapbox paint transitions, which keep the render loop warm — a WebKit-felt
	// cost). Cleared in ensureMapboxSourcesAndLayers so style reloads re-assert.
	const lightingRasterOpacityAppliedRef = useRef<Record<string, number>>({});
	const lightingLayerVisibilityAppliedRef = useRef<Record<string, string>>({});
	const lightningCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const lightningCanvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
	// Safari perf mode: whether the lightning/snow canvases uploaded last tick, so the
	// final cleared canvas still reaches the GPU one tick after a flash/mood ends.
	const snowCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const snowCanvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
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
	const transientOverlayResetKeyRef = useRef<string | number | null>(
		transientOverlayResetKey
	);
	const hoverSourceRef = useRef<'map' | 'pill' | 'external' | null>(null);
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
			if (
				selectedTooltipHoverTargetsEqual(
					selectedTooltipHoverHiddenTargetRef.current,
					target
				)
			)
				return;
			selectedTooltipHoverHiddenTargetRef.current = target;
			setSelectedTooltipHoverHiddenTarget(target);
		},
		[]
	);
	const registerCompactOverlayPillEl = useCallback(
		(id: number, el: HTMLDivElement | null) => {
			if (el) {
				compactOverlayPillRefs.current.set(id, el);
			} else {
				compactOverlayPillRefs.current.delete(id);
			}
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
	const zoomOutGovernorRef = useRef<ReturnType<typeof createZoomOutGovernor> | null>(
		null
	);
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
	// Desktop-only interaction tuning gate. The tuned zoom/drag "feel" (zoom-out
	// governor wheel friction, custom wheel/pinch rates, heavy drag-pan inertia,
	// and the drag-time zoom clamp) is a DESKTOP experience; on touch devices it
	// fights native gestures (e.g. the zoom clamp cancels pinch-driven zoom mid
	// drag, and the pinch-rate override makes two-finger zoom feel wrong). Mobile
	// therefore uses Mapbox's native zoom/drag behavior.
	//
	// `useIsMobile()` is `null` until it resolves on the client. Treat the
	// unresolved state as NON-desktop (`=== false` required) so a real phone never
	// gets the desktop clamp/rates applied on its very first gesture; the effect
	// keyed on `isMobile` below re-applies the correct feel once detection settles.
	const desktopInteractionTuningEnabled = isMobile === false;
	const desktopInteractionTuningRef = useRef(desktopInteractionTuningEnabled);
	desktopInteractionTuningRef.current = desktopInteractionTuningEnabled;
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

	// Drag-pan gesture tracking. Used to (a) prevent the street-view pitch ramp
	// from firing during a pure pan (so panning upward never changes the tilt)
	// and (b) clamp the zoom to its drag-start value mid-pan (preventing the
	// unintended zoom-in when dragging toward the world bounds / poles at a
	// closer zoom level). `isRestoringDragZoomRef` breaks the feedback loop
	// since writing tr.zoom fires another synchronous 'zoom' event.
	const isDragPanningRef = useRef(false);
	const dragStartZoomRef = useRef<number | null>(null);
	const isRestoringDragZoomRef = useRef(false);
	const lastReconciledPitchZoomRef = useRef<number | null>(null);

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
	// Starts false so an active-search surface can never suppress its real contact
	// markers for even a single render before the ambient-only gate effect runs.
	const [isCompactOverlayMode, setIsCompactOverlayMode] = useState(false);
	// Compact overlay membership changes only on the settled-viewport pipeline; live
	// camera moves imperatively reproject the existing 10-15 pills without React churn.
	const [compactOverlaySettledViewport, setCompactOverlaySettledViewport] =
		useState<CompactOverlaySettledViewport | null>(null);
	const compactOverlayVisibleIdSetRef = useRef<Set<number>>(new Set());
	const compactOverlayPillRefs = useRef<Map<number, HTMLDivElement>>(new Map());
	// Sticky reconciliation state: the currently-committed pill set plus the zoom
	// bucket it was ranked under. Pills only change when you pan far enough that
	// survivors fall out of the padded keep-area (you moved into new/empty space) or
	// when the zoom bucket changes (zoom out → a fresh wider spread). Tiny pans reuse
	// the committed set verbatim, so the overlay "sticks" instead of reloading.
	const compactOverlayCommittedRef = useRef<CompactOverlayPillEntry[]>([]);
	const compactOverlayCommittedZoomBucketRef = useRef<number | null>(null);
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
	// Viewport "settle" debounce (Airbnb/Zillow-style): the pending fetch timer and
	// the timestamp of the first pending camera segment, used to enforce the max-wait
	// ceiling across chained wheel/trackpad moveend→movestart bursts.
	const viewportSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const viewportSettleFirstPendingAtRef = useRef<number | null>(null);
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
	// Reactive mirror of "a curated blob outline is currently drawn" (presence of
	// curatedBlobLngLatMultiPolygonRef geometry). Toggled on presence change only — set true
	// when updateCuratedBlob commits an outline, false when clearCuratedBlobOutline runs — so
	// memos that clip the ambient overlay to outside the blob can depend on it without churning
	// on every per-zoom morph reassignment.
	const [hasCuratedBlobOutline, setHasCuratedBlobOutline] = useState(false);
	// Reactive mirror of "a locked-state outline is currently drawn" (presence of
	// lockedStateSelectionMultiPolygonRef geometry). Mirrors `hasCuratedBlobOutline` so the
	// state-category search can drive the same clip/perimeter machinery as the curated blob.
	const [hasLockedStateOutline, setHasLockedStateOutline] = useState(false);
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

	// ── Sequential boot ladder (Airbnb-style staged reveal) ──────────────────
	// Reference: airbnb.com's result map never paints everything at once. It
	// brings up the cream landmasses + ocean first, lets the street/road raster
	// settle, *then* streams the price/result pins by viewport bounds. We mirror
	// that ordering here so the map never tries to drop state markers before the
	// land underneath them exists.
	//
	//   Phase 1  land masses painted      → `isMapFirstPainted` (existing latch)
	//   Phase 2  basemap tiles/roads in   → `isBasemapTilesSettled` (below)
	//   Phase 3  state boundaries + labels → `isStateLayerReady` (existing)
	//   Phase 4  contact pins streamed     → `isReadyForContactsOverlay` (below)
	//
	// Each phase gates the *initial boot* of the next; once a phase has fired it
	// stays latched, so subsequent pans/zooms remain instantly responsive (the
	// ladder only shapes the cold-start reveal, never steady-state interaction).
	// Every gate also has a wall-clock backstop so a slow/failed upstream phase
	// (offline tiles, non-US viewport with no state geometry, etc.) can never
	// permanently strand a downstream phase.
	const [isBasemapTilesSettled, setIsBasemapTilesSettled] = useState(false);
	const [isReadyForContactsOverlay, setIsReadyForContactsOverlay] = useState(false);
	// Ref mirror so the (frequently-memoized) fetch-bbox callback can read the
	// contacts gate without taking it as a dependency and thrashing its identity.
	const isReadyForContactsOverlayRef = useRef(false);
	useEffect(() => {
		isReadyForContactsOverlayRef.current = isReadyForContactsOverlay;
	}, [isReadyForContactsOverlay]);

	useEffect(() => {
		void ensureWasmGeoModuleLoaded();
	}, []);

	useCameraPadding({ map, isMapLoaded, isBackgroundPresentation, cameraPadding });

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
	// Radius search runs through the free-text pipeline, so `searchMode` can infer
	// booking/promotion from the typed query and switch on the viewport-driven
	// contextual overlays (booking-extra pins, promotion overlay pins, and the
	// all-contacts gray dots). Those overlays fetch/render across the WHOLE viewport
	// — far outside the radius circle — using the older pin/dot styling, which reads
	// as the outdated "contact overlay" UI. A radius search is meant to show only its
	// in-radius result markers, so suppress every viewport-wide contextual overlay
	// whenever a radius search is active. `radiusOverlay` is non-null exactly when an
	// active radius search is showing its geometry (see `activeRadiusSearchOverlay`);
	// `suppressContextualContactOverlays` covers the pending gap before results commit.
	// If the user explicitly disengages the search ("Click to see all contacts"),
	// stop treating the stale radius overlay props as active so the ambient atlas can render.
	const isRadiusSearchActive =
		searchEngaged && (radiusOverlay != null || suppressContextualContactOverlays);
	const isAmbientContactsEnabled = ambientContactsEnabled && !isBackgroundPresentation;
	const shouldFetchAmbientContacts =
		(ambientContactsEnabled || ambientContactsPreloadEnabled) &&
		!isBackgroundPresentation;
	// True while a curated/"For You" blob search is engaged AND its outline is actually drawn.
	// In this mode the lightweight ambient overlay is allowed to render OUTSIDE the blob (clipped
	// by isLngLatInsideOrHuggingBlob) while the in-blob search-result markers stay untouched. The
	// `hasCuratedBlobOutline` gate ensures blob geometry exists before any clip/perimeter logic
	// runs; `curatedBlobSearchActive` (dashboard) excludes bbox/state-lock searches from scope.
	const isCuratedBlobSearchEngaged =
		searchEngaged && curatedBlobSearchActive && hasCuratedBlobOutline;
	// State-category sibling of `isCuratedBlobSearchEngaged`: true while a category search scoped
	// to a US state is engaged AND its locked-state outline is actually drawn. In this mode the
	// locked-state display polygon (the morphed orb / state shape) plays the role of the "active
	// search region" — the lightweight ambient overlay renders OUTSIDE it and the empty-map prompt
	// becomes the perimeter-only "Disengage search" affordance. `stateCategorySearchActive`
	// (dashboard) already excludes bbox/curated/non-state searches.
	const isStateCategorySearchEngaged =
		searchEngaged && stateCategorySearchActive && hasLockedStateOutline;
	// Unified gate: either active-search region (curated blob OR locked-state outline) is engaged.
	// The clip/perimeter machinery keys off this so both search types share one code path.
	const isActiveSearchRegionEngaged =
		isCuratedBlobSearchEngaged || isStateCategorySearchEngaged;
	// IMPORTANT: the lightweight Airbnb-style overlay engages in THREE states: (1) the
	// disengaged/general *ambient* browse state (no search), (2) OUTSIDE the blob of an engaged
	// curated/"For You" search, and (3) OUTSIDE the locked-state outline of an engaged category
	// search. It never engages for typed bbox searches, and the legacy contextual overlays
	// (booking/promotion pins, gray all-contacts dots) stay suppressed via `isRadiusSearchActive` —
	// only this lightweight layer is re-enabled here.
	const isLightweightSearchOverlayActive =
		lightweightSearchOverlayEnabled &&
		!isBackgroundPresentation &&
		campaignMarkerMode === 'category' &&
		isAmbientContactsEnabled &&
		(isCuratedBlobSearchEngaged ||
			isStateCategorySearchEngaged ||
			(!isRadiusSearchActive && !isAnySearch && !searchEngaged));
	useEffect(() => {
		if (!isLightweightSearchOverlayActive) {
			setIsCompactOverlayMode(false);
			return;
		}

		setIsCompactOverlayMode((wasCompact) => {
			if (wasCompact) {
				return zoomLevel < LIGHTWEIGHT_COMPACT_OVERLAY_DETAIL_ENTER_ZOOM;
			}
			return zoomLevel <= LIGHTWEIGHT_COMPACT_OVERLAY_COMPACT_REENTER_ZOOM;
		});
	}, [isLightweightSearchOverlayActive, zoomLevel]);
	// Scope the lightweight OVERVIEW (compact pill) layer to the USA for now: only let it
	// engage while the settled camera is centered over the contiguous US (reusing the
	// existing CONUS box). Centered elsewhere — e.g. rotated to Europe — the overview
	// pills never appear; the map falls back to the detail-marker path below. The settled
	// viewport updates on every pan/zoom settle, so this re-evaluates as you move.
	const compactOverlayCenter = compactOverlaySettledViewport?.center ?? null;
	const isCompactOverlayCenterInUsa =
		compactOverlayCenter != null &&
		compactOverlayCenter.lng >= LIGHTNING_US_BOUNDS[0] &&
		compactOverlayCenter.lng <= LIGHTNING_US_BOUNDS[2] &&
		compactOverlayCenter.lat >= LIGHTNING_US_BOUNDS[1] &&
		compactOverlayCenter.lat <= LIGHTNING_US_BOUNDS[3];
	// Effective behavior gate. Use this for every render/fetch/source suppression path
	// instead of raw state so switching from ambient browse → active search can never
	// leave the search map in compact mode for even one render.
	const isCompactOverlayActive =
		isLightweightSearchOverlayActive &&
		isCompactOverlayMode &&
		isCompactOverlayCenterInUsa;
	// Detail markers are intentionally NOT geo-gated — the zoomed-in contact view keeps
	// working in every country; only the lighter overview mode above is US-only.
	const isLightweightDetailMarkerMode =
		isLightweightSearchOverlayActive && !isCompactOverlayActive;
	// Ref mirror of `isStateCategorySearchEngaged` so the empty-dep hit-test callbacks below can
	// resolve the active region without going stale — they must keep a stable identity so their
	// per-identity caches and the map `move` bindings survive across renders.
	const isStateCategorySearchEngagedRef = useRef(isStateCategorySearchEngaged);
	useEffect(() => {
		isStateCategorySearchEngagedRef.current = isStateCategorySearchEngaged;
	}, [isStateCategorySearchEngaged]);
	// Resolve the currently-active "search region" multipolygon for clip/perimeter hit-testing:
	// the curated blob's morphed footprint when present, else (only while a state-category search
	// is engaged) the locked-state display polygon — the morphed orb at low zoom, the raw state
	// shape at high zoom (kept live in `selectedStateDisplayMultiPolygonRef` by
	// `getSelectedStateDisplayMultiPolygon`, with the raw selection as a first-frame fallback).
	const getActiveSearchRegionMultiPolygon = useCallback((): ClippingMultiPolygon | null => {
		const blob = curatedBlobLngLatMultiPolygonRef.current;
		if (blob?.length) return blob;
		if (!isStateCategorySearchEngagedRef.current) return null;
		return (
			selectedStateDisplayMultiPolygonRef.current ??
			lockedStateSelectionMultiPolygonRef.current
		);
	}, []);
	// Outside-region clip predicate: true when (lng,lat) falls inside the active search region's
	// drawn (morphed) footprint — the curated blob OR the locked-state outline — so the lightweight
	// ambient overlay can be excluded there while a search is engaged. Reads the live multipolygon
	// and caches its bbox per-identity for a cheap reject (the ref is reassigned with a fresh array
	// each morph). The caller gates on `isActiveSearchRegionEngaged`, so this is a no-op otherwise.
	const curatedBlobBboxCacheRef = useRef<{
		mp: ClippingMultiPolygon | null;
		bbox: BoundingBox | null;
	}>({ mp: null, bbox: null });
	const isLngLatInsideActiveSearchBlob = useCallback(
		(lng: number, lat: number): boolean => {
			const mp = getActiveSearchRegionMultiPolygon();
			if (!mp?.length) return false;
			const cache = curatedBlobBboxCacheRef.current;
			if (cache.mp !== mp) {
				cache.mp = mp;
				cache.bbox = bboxFromMultiPolygon(mp);
			}
			if (cache.bbox && !isLatLngInBbox(lat, lng, cache.bbox)) return false;
			return pointInMultiPolygon([lng, lat], mp);
		},
		[getActiveSearchRegionMultiPolygon]
	);
	// Perimeter hit-test for the "Disengage search" prompt: true when a lng/lat lies within
	// CURATED_BLOB_DISENGAGE_PERIMETER_BAND_PX (screen px) of the active region's outer edge ring
	// (curated blob OR locked-state outline). Reuses the world-pixel segment helpers; outer-ring
	// segments are rebuilt only when the *morphed* geometry identity or current worldSize changes.
	// We key the cache on the live multipolygon reference (applyBlobMorph / the state morph reassign
	// a fresh array on every geometry change — including resize-driven morphs at a constant zoom,
	// which the old `signature` key missed) AND on worldSize (the segments are projected in world
	// pixels, so a zoom change at constant geometry must still reproject). This mirrors
	// `isLngLatInsideActiveSearchBlob`'s bbox cache.
	const blobPerimeterSegmentsCacheRef = useRef<{
		mp: ClippingMultiPolygon | null;
		worldSize: number;
		segments: ReturnType<typeof buildOuterRingWorldSegments>;
	} | null>(null);
	const isLngLatNearActiveBlobPerimeter = useCallback(
		(lngLat: { lng: number; lat: number }): boolean => {
			const m = mapRef.current;
			const mp = getActiveSearchRegionMultiPolygon();
			if (!m || !mp?.length) return false;
			const zoom = m.getZoom() ?? MAP_DEFAULT_ZOOM;
			const worldSize = 512 * Math.pow(2, zoom);
			const cache = blobPerimeterSegmentsCacheRef.current;
			let segments: ReturnType<typeof buildOuterRingWorldSegments>;
			if (cache && cache.mp === mp && cache.worldSize === worldSize) {
				segments = cache.segments;
			} else {
				segments = buildOuterRingWorldSegments(mp, worldSize);
				blobPerimeterSegmentsCacheRef.current = { mp, worldSize, segments };
			}
			if (segments.length === 0) return false;
			const wp = latLngToWorldPixel({ lat: lngLat.lat, lng: lngLat.lng }, worldSize);
			return isWorldPointNearSegments(
				wp.x,
				wp.y,
				segments,
				CURATED_BLOB_DISENGAGE_PERIMETER_BAND_PX
			);
		},
		[getActiveSearchRegionMultiPolygon]
	);
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

	useEffect(() => {
		if (!isRadiusSearchActive) return;

		// Radius searches must not inherit any viewport-wide contextual overlay from
		// the previous map state — including during the pending/loading gap where
		// marker-source effects normally preserve old overlay data to avoid flicker.
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
	}, [isRadiusSearchActive]);

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
		// Radius-center placement owns all pointer input while active, so the square
		// Select tool (incl. its Shift-hold shortcut) can't run at the same time.
		() =>
			activeTool === 'select' &&
			typeof onAreaSelect === 'function' &&
			!radiusPlacementActive,
		[activeTool, onAreaSelect, radiusPlacementActive]
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
	// Cursor-locked radius placement (choose a center by clicking the map). The ghost
	// marker is a plain DOM element positioned in viewport px on every mousemove; the
	// preview circle is a Mapbox GeoJSON source updated from the same pointer lngLat.
	const radiusPlacementGhostElRef = useRef<HTMLDivElement | null>(null);
	const radiusPlacementLastLngLatRef = useRef<LatLngLiteral | null>(null);
	const radiusPlacementDownClientRef = useRef<{ x: number; y: number } | null>(null);
	// Latest props read inside the (create-once) placement pointer handlers.
	const radiusPlacementActiveRef = useRef(radiusPlacementActive);
	const radiusPlacementMilesRef = useRef(radiusPlacementMiles);
	const onRadiusPlaceRef = useRef<SearchResultsMapProps['onRadiusPlace'] | null>(null);
	const onRadiusPlacementCancelRef = useRef<
		SearchResultsMapProps['onRadiusPlacementCancel'] | null
	>(null);
	useEffect(() => {
		radiusPlacementActiveRef.current = radiusPlacementActive;
	}, [radiusPlacementActive]);
	useEffect(() => {
		radiusPlacementMilesRef.current = radiusPlacementMiles;
	}, [radiusPlacementMiles]);
	useEffect(() => {
		onRadiusPlaceRef.current = onRadiusPlace ?? null;
	}, [onRadiusPlace]);
	useEffect(() => {
		onRadiusPlacementCancelRef.current = onRadiusPlacementCancel ?? null;
	}, [onRadiusPlacementCancel]);
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

	useOwnedVenueRadar({
		map,
		isMapLoaded,
		ownedVenueLocation,
		mapContainerRef,
		onOwnedVenueAnchorChangeRef,
	});

	useEventsRadar({ map, isMapLoaded, eventCenters });

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

	const {
		updateBookingExtraFetchBbox,
		updatePromotionOverlayFetchBbox,
		updateAllContactsOverlayFetchBbox,
		bookingExtraContacts,
		promotionOverlayContacts,
		bookingExtraContactsWithCoords,
		bookingExtraCoordsByContactId,
		promotionOverlayContactsWithCoords,
		promotionOverlayCoordsByContactId,
		allContactsOverlayContactsWithCoords,
		allContactsOverlayCoordsByContactId,
		getBookingExtraContactCoords,
		getPromotionOverlayContactCoords,
		getAllContactsOverlayContactCoords,
	} = useContactOverlayFetching({
		bookingExtraFetchBbox,
		setBookingExtraFetchBbox,
		promotionOverlayFetchBbox,
		setPromotionOverlayFetchBbox,
		allContactsOverlayFetchBbox,
		setAllContactsOverlayFetchBbox,
		allContactsOverlayBufferFetchBbox,
		setAllContactsOverlayBufferFetchBbox,
		lastBookingExtraFetchKeyRef,
		lastPromotionOverlayFetchKeyRef,
		lastAllContactsOverlayVisibleFetchKeyRef,
		lastAllContactsOverlayBufferFetchKeyRef,
		isReadyForContactsOverlayRef,
		interactiveFloorDeltaRef,
		baseContactIdSet,
		isAnySearch,
		isBookingSearch,
		isRadiusSearchActive,
		isCompactOverlayActive,
		isAmbientContactsEnabled,
		shouldFetchAmbientContacts,
		searchEngaged,
		onOverlayBusyChange,
	});

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
			allContactsOverlayVisibleContacts.some((c) => c.id === hoveredMarkerId) ||
			compactOverlayVisibleIdSetRef.current.has(hoveredMarkerId);
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
		compactOverlaySettledViewport,
		hoveredMarkerId,
		onMarkerHover,
	]);

	// Clear hover state when zooming out past the minimum threshold. Compact
	// Airbnb-style pills are intentionally hoverable at low zoom because their hit
	// target is a real label, not a tiny dot.
	useEffect(() => {
		if (zoomLevel >= HOVER_INTERACTION_MIN_ZOOM) return;
		if (hoveredMarkerId == null) return;
		if (
			isCompactOverlayActive &&
			compactOverlayVisibleIdSetRef.current.has(hoveredMarkerId)
		)
			return;
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
	}, [zoomLevel, hoveredMarkerId, onMarkerHover, isCompactOverlayActive]);

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
		setHasCuratedBlobOutline(false);
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

		// Overall: state overlays are hidden in decorative background mode, until the
		// GeoJSON is loaded, and (on cold boot) until the land + basemap tiles have
		// settled beneath them. The `isBasemapTilesSettled` gate is the fix for state
		// boundaries/markers flashing in before any land has painted — it enforces the
		// Airbnb ordering (land + roads first, region boundaries second). Once the
		// basemap has settled the gate stays latched, so this never throttles a later
		// presentation toggle or restyle.
		const targetOverlayOpacity =
			!isBackgroundPresentation && isStateLayerReady && isBasemapTilesSettled ? 1 : 0;
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
		isBasemapTilesSettled,
		stateInteractionsEnabled,
		applyStateOverlayOpacity,
	]);

	// Keep state boundary visibility in sync with night darkening.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		applyStateOverlayOpacity(stateOverlayOpacityRef.current, stateOverlayModeRef.current);
	}, [nightT, map, isMapLoaded, applyStateOverlayOpacity]);

	useWeatherCanvasAnimation({
		map,
		isMapLoaded,
		cloudsCanvasRef,
		cloudsCanvasCtxRef,
		lightningCanvasRef,
		lightningCanvasCtxRef,
		snowCanvasRef,
		snowCanvasCtxRef,
		interactiveFloorDeltaRef,
		usStatesPolygonsRef,
		weatherMoodConfigRef,
		weatherRegionCenterRef,
		snowCloudInteractionMultiplier,
		snowDebugEnabled,
	});

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
		ensureMapboxSourcesAndLayersImpl(mapInstance, {
			cloudsCanvasRef,
			dayFarSideShadeCanvasRef,
			interactiveFloorDeltaRef,
			lastParityAppliedFloorDeltaRef,
			lightingLayerVisibilityAppliedRef,
			lightingRasterOpacityAppliedRef,
			lightningCanvasRef,
			nightTRef,
			snowCanvasRef,
			sunTransitionCanvasRef,
			weatherMoodConfigRef,
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
			// Retain some recently-displayed basemap tiles so zoom/pan-back stays smooth, but
			// do not force the cache far above Mapbox's natural viewport-sized default. In
			// Mapbox GL, `minTileCacheSize` raises the per-source floor, while
			// `maxTileCacheSize` clamps the final cache size. A 64/128 band keeps normal
			// laptop views warm and prevents large monitors / long pan sessions from
			// retaining hundreds of parsed vector tiles at peak.
			minTileCacheSize: 64,
			maxTileCacheSize: 128,
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
		try {
			mapInstance.keyboard.disableRotation();
		} catch {
			// Non-fatal.
		}

		// Soften scroll/pinch zoom for a smoother, more premium feel (desktop only;
		// mobile keeps Mapbox's native rates). Persists across scrollZoom
		// enable/disable cycles since rates live on the handler.
		applyScrollZoomFeel(mapInstance, !desktopInteractionTuningRef.current);

		const governor = createConfiguredZoomOutGovernor();
		zoomOutGovernorRef.current = governor;
		const onGovernedWheel = (e: mapboxgl.MapWheelEvent) => {
			if (presentationRef.current === 'background') return;
			// Desktop-only zoom-out friction. On touch devices the wheel governor is
			// off entirely so mobile pinch/scroll zoom behaves natively.
			if (!desktopInteractionTuningRef.current) return;
			const oe = e.originalEvent;
			if (!oe) return;
			try {
				// Read through the ref instead of permanently closing over the
				// construction-time governor. In local dev, Fast Refresh can preserve
				// the Mapbox instance/listener while the tuning constants change.
				const activeGovernor = zoomOutGovernorRef.current ?? governor;
				const result = activeGovernor.onWheel(
					oe.deltaY,
					oe.deltaMode,
					oe.shiftKey,
					Number.isFinite(oe.timeStamp) ? oe.timeStamp : Date.now()
				);
				if (!result.changed) return;
				mapInstance.scrollZoom.setWheelZoomRate(result.wheelRate);
				mapInstance.scrollZoom.setZoomRate(result.trackpadRate);
			} catch {
				applyScrollZoomFeel(mapInstance, !desktopInteractionTuningRef.current);
			}
		};
		mapInstance.on('wheel', onGovernedWheel);

		// Drag-pan inertia: desktop gets the "heavy / abrupt-stop" (Airbnb-style)
		// feel; mobile gets Mapbox's native touch inertia. mapbox-gl 3.x does NOT
		// persist these options on the handler (a bare enable() resets them to
		// defaults), so the desktop feel is re-passed at every enable() site
		// (safeEnableInteractions + rectangle-select toggle + zoom-end refresh) via
		// enableDragPanFeel.
		enableDragPanFeel(mapInstance, !desktopInteractionTuningRef.current);

		// Boot-stage marks (construct → style-load → land-ready → load) for the
		// measurement scripts; latched so style reload re-fires don't re-mark.
		let styleLoadMarked = false;
		const onStyleLoad = () => {
			if (!styleLoadMarked) {
				styleLoadMarked = true;
				markPerf('murmur:map:style-load');
			}
			// Add the flat low-zoom base before hiding Streets detail: ocean
			// background, cream land, and major lakes must exist before composite
			// water/landcover/roads are culled below z6.
			ensureWorldLandFill(mapInstance);
			applyFreeTrialMapVisualTuning(mapInstance, interactiveFloorDeltaRef.current);
			applyBasemapSettlementLabelPresentation(
				mapInstance,
				presentationRef.current !== 'background',
				interactiveFloorDeltaRef.current
			);
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
			// See the style-load copy: keep the flat low-zoom base in place before
			// the Streets detail gate is re-applied after full load.
			ensureWorldLandFill(mapInstance);
			applyFreeTrialMapVisualTuning(mapInstance, interactiveFloorDeltaRef.current);
			applyBasemapSettlementLabelPresentation(
				mapInstance,
				presentationRef.current !== 'background',
				interactiveFloorDeltaRef.current
			);
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
			mapInstance.off('wheel', onGovernedWheel);
			zoomOutGovernorRef.current = null;
			backgroundSpinCleanupRef.current?.();
			backgroundSpinCleanupRef.current = null;
			mapInstance.remove();
			mapRef.current = null;
			setMap(null);
			setIsMapLoaded(false);
			setIsMapFirstPainted(false);
		};
	}, [ensureMapboxSourcesAndLayers, syncInteractiveFloor]);

	// Keep the live Mapbox scroll handler in sync with tuning constants even when
	// local Fast Refresh preserves the existing map instance. Production gets the
	// same values during construction; this effect mainly prevents "works in prod,
	// not locally" while iterating on zoom feel.
	//
	// Also load-bearing at runtime: `useIsMobile()` resolves AFTER first paint, and
	// the singleton map is constructed once and reused across routes. Depending on
	// `isMobile` here re-applies the correct desktop/mobile zoom + drag-pan feel the
	// moment the device class settles (or changes, e.g. devtools device emulation),
	// so a phone that briefly looked like desktop gets native rates/inertia restored
	// rather than keeping the desktop tuning applied at construction.
	useEffect(() => {
		if (!map) return;
		const nativeFeel = !desktopInteractionTuningRef.current;
		zoomOutGovernorRef.current = createConfiguredZoomOutGovernor();
		applyScrollZoomFeel(map, nativeFeel);
		// Only re-pass drag-pan inertia if drag-pan is currently enabled, so we don't
		// silently re-enable it while a rectangle selection has it disabled.
		try {
			if (map.dragPan?.isEnabled?.()) {
				enableDragPanFeel(map, nativeFeel);
			}
		} catch {
			// Non-fatal — handler may be mid-teardown.
		}
	}, [
		map,
		isMobile,
		MAP_WHEEL_ZOOM_RATE,
		MAP_PINCH_ZOOM_RATE,
		ZOOM_OUT_GOVERNOR_ENABLED,
		ZOOM_OUT_GOVERNOR_MIN_RATE_MULTIPLIER,
		ZOOM_OUT_GOVERNOR_ENERGY_SCALE,
		ZOOM_OUT_GOVERNOR_ENERGY_DECAY_TAU_MS,
		ZOOM_OUT_GOVERNOR_GESTURE_GAP_MS,
		ZOOM_OUT_GOVERNOR_DEADZONE,
		ZOOM_OUT_GOVERNOR_APPLY_EPSILON,
	]);

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

	// ── Phase 2: basemap tiles (roads/landcover/water) settled ───────────────
	// Only starts watching once the land masses have painted (Phase 1). We wait
	// for Mapbox to report the composite basemap source as loaded for the current
	// viewport — that's the moment the streets-v12 roads, landcover and water have
	// actually streamed in, mirroring how Airbnb lets the road raster settle
	// before layering result pins on top. A 2.5s wall-clock backstop guarantees we
	// advance even if the tile fetch stalls (slow network / scoped token), so the
	// downstream phases are never permanently stranded.
	useEffect(() => {
		if (!map) return;
		if (!isMapFirstPainted) return;
		if (isBasemapTilesSettled) return;
		if (typeof window === 'undefined') return;

		let settled = false;
		let intervalId: number | null = null;
		let backstop: number | null = null;
		const settle = () => {
			if (settled) return;
			settled = true;
			markPerf('murmur:map:basemap-settled');
			setIsBasemapTilesSettled(true);
			map.off('idle', onIdle);
			if (intervalId != null) window.clearInterval(intervalId);
			if (backstop != null) window.clearTimeout(backstop);
		};

		// We can't rely on `idle` alone: the always-animating clouds canvas source
		// keeps the render loop hot, so `idle` may never fire. We instead poll
		// `areTilesLoaded()` (true once every renderable source's tiles for the
		// current view are in) on a short interval, and also opportunistically
		// check on `idle` if it ever does fire. Either path that observes tiles-in
		// settles immediately — so the wait is "as fast as the tiles arrive,"
		// not a fixed delay.
		const tilesIn = () => {
			try {
				return (
					typeof (map as any).areTilesLoaded !== 'function' ||
					(map as any).areTilesLoaded()
				);
			} catch {
				// If the check throws, treat as ready rather than stalling the ladder.
				return true;
			}
		};
		const onIdle = () => {
			if (tilesIn()) settle();
		};
		map.on('idle', onIdle);
		// Fast path: tiles may already be in (warm cache / instant return).
		if (tilesIn()) settle();
		// Poll while we wait — cheap boolean check; cleared the moment we settle.
		if (!settled) {
			intervalId = window.setInterval(() => {
				if (tilesIn()) settle();
			}, 120);
		}
		// Backstop: never let a stalled tile fetch block the boundary/pin phases.
		if (!settled) {
			backstop = window.setTimeout(settle, MAP_BOOT_BASEMAP_SETTLE_BACKSTOP_MS);
		}

		return () => {
			map.off('idle', onIdle);
			if (intervalId != null) window.clearInterval(intervalId);
			if (backstop != null) window.clearTimeout(backstop);
		};
	}, [map, isMapFirstPainted, isBasemapTilesSettled]);

	// ── Phase 4 gate: clear to stream contact pins ───────────────────────────
	// Contacts are the heaviest, top-most overlay, so on cold boot we hold their
	// first fetch/paint until the state boundaries phase has resolved (or its own
	// backstop has fired). This is the exact Airbnb ordering: the basemap and
	// region context come up first, then the result pins stream in on top — never
	// pins racing ahead of the land/boundaries beneath them. Once latched it stays
	// open so live searches and pans stream contacts immediately.
	useEffect(() => {
		if (!map) return;
		if (isReadyForContactsOverlay) return;
		if (typeof window === 'undefined') return;

		// Primary path: boundaries are in (or the viewport has no US states to load
		// and the basemap is already settled — e.g. an international view).
		if (isStateLayerReady && isBasemapTilesSettled) {
			markPerf('murmur:map:contacts-gate-open');
			setIsReadyForContactsOverlay(true);
			return;
		}

		// Backstop: even if the boundary phase never resolves (non-US viewport,
		// geometry fetch failure), open the gate so pins still appear. Anchored off
		// the basemap-settled signal so we measure the wait from a real milestone.
		if (!isBasemapTilesSettled) return;
		const backstop = window.setTimeout(() => {
			markPerf('murmur:map:contacts-gate-open');
			setIsReadyForContactsOverlay(true);
		}, MAP_BOOT_CONTACTS_GATE_BACKSTOP_MS);
		return () => window.clearTimeout(backstop);
	}, [map, isReadyForContactsOverlay, isStateLayerReady, isBasemapTilesSettled]);

	// When the Phase 4 gate finally opens, the deferred contact fetch must be
	// kicked once — otherwise pins wouldn't appear until the next user pan/zoom
	// (the fetch window is normally only recomputed on `moveend`). This is the
	// "now stream the pins" step in the Airbnb-style ladder.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (!isReadyForContactsOverlay) return;
		updateAllContactsOverlayFetchBbox(map);
	}, [map, isMapLoaded, isReadyForContactsOverlay, updateAllContactsOverlayFetchBbox]);

	const prevPresentationRef = useRef<'background' | 'interactive'>(presentation);
	const dashboardScrollScrubCameraRef = useRef<DashboardMapCameraScrubState | null>(null);
	const dashboardScrollScrubProgressRef = useRef(0);
	const dashboardScrollScrubActiveRef = useRef(false);
	const dashboardScrollScrubSuppressSpinUntilRef = useRef(0);

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
		if (!map || !isMapLoaded || typeof window === 'undefined') return;

		const getScrubState = (): DashboardMapCameraScrubState | null => {
			if (dashboardScrollScrubCameraRef.current) {
				return dashboardScrollScrubCameraRef.current;
			}

			try {
				const container = map.getContainer?.() as HTMLElement | undefined;
				const width = container?.clientWidth ?? 0;
				const height = container?.clientHeight ?? 0;
				if (width <= 0 || height <= 0) return null;

				const center = map.getCenter();
				// CRITICAL: the scrub start pose MUST be the *canonical* decorative pose
				// (the exact pose the background spin maintains:
				// `easeTo({ center: [lng, DASHBOARD_DECORATIVE_CENTER[1]], offset: [0,140] })`),
				// not `map.getCenter()`/`getPitch()`/`getZoom()`.
				//
				// Why this matters (this is the bug that made the release read as TWO motions):
				// the +140px vertical `offset` means `map.getCenter()` returns a point *north*
				// of `DASHBOARD_DECORATIVE_CENTER[1]` — the offset is already "baked in" to that
				// latitude. Capturing it as `startCenter` and then re-applying `offset: [0,140]`
				// every scrub frame double-counts the offset, so the camera's p=0 resting pose
				// sits ~140px too low and does NOT match the pose the auto-spin expects. On
				// release the snapback faithfully returns to that *wrong* pose, then the spin's
				// `moveend` loop resumes and runs its own 1000ms `easeTo` to correct it — the
				// delayed, separate "tilt/pan back to position at the end" the user is fighting.
				//
				// Keeping `lng` live preserves spin continuity (the vertical offset never changes
				// lng, so this equals the spin's current longitude). Holding the geographic
				// center fixed across the scrub means only offset + zoom + pitch animate off the
				// single progress value `p`, so the entry AND the release are each one
				// continuous, jolt-free motion in lock-step with the page chrome.
				const canonicalCenter: [number, number] = [
					center.lng,
					DASHBOARD_DECORATIVE_CENTER[1],
				];
				const state: DashboardMapCameraScrubState = {
					startCenter: canonicalCenter,
					targetCenter: canonicalCenter,
					startZoom: DASHBOARD_DECORATIVE_ZOOM,
					startPitch: DASHBOARD_DECORATIVE_PITCH,
					startOffset: DASHBOARD_DECORATIVE_OFFSET_PX,
				};
				dashboardScrollScrubCameraRef.current = state;
				return state;
			} catch {
				return null;
			}
		};

		const restoreDecorativeZoomLock = () => {
			try {
				map.setMinZoom(DASHBOARD_DECORATIVE_ZOOM);
				map.setMaxZoom(DASHBOARD_DECORATIVE_ZOOM);
			} catch {
				// Ignore.
			}
		};

		const loosenZoomLockForScrub = () => {
			try {
				const currentZoom = map.getZoom?.() ?? DASHBOARD_DECORATIVE_ZOOM;
				map.setMinZoom(Math.min(currentZoom, DASHBOARD_DECORATIVE_ZOOM));
				map.setMaxZoom(DEFAULT_MAX_ZOOM_FALLBACK);
			} catch {
				// Ignore.
			}
		};

		const handleCameraScrub = (event: Event) => {
			const detail = (event as CustomEvent<DashboardMapCameraScrubDetail>).detail;
			const progress = clamp(Number(detail?.progress ?? 0), 0, 1);
			const isCommit = detail?.phase === 'commit';

			// Scrub events are only meaningful for the dashboard background→map entry.
			// During the commit frame React may already have flipped `presentation` to
			// interactive, so allow the explicit commit event to finish the camera to p=1.
			if (presentationRef.current !== 'background' && !isCommit) return;

			dashboardScrollScrubProgressRef.current = progress;

			// Release-below-threshold return: the hook reverses the scrub as a per-frame eased
			// tween that streams ordinary 'scrub' events back down to p=0 (see snapBack in
			// useDashboardScrollToMap). That keeps the globe on the SAME per-frame camera path as
			// the live entry — chrome and camera recomputed together off one value every frame —
			// so the return is one motion. (A previous approach used a dedicated 'snapback' phase
			// that drove the globe with a single native easeTo on its own clock; the page chrome
			// settled and the globe's pitch then resolved as a visibly separate second "tilt
			// back". The unified per-frame path below — which forces a repaint each frame — fixed
			// that, so the separate snapback branch is gone.)
			if (progress <= 0.0001 && !isCommit) {
				const state = dashboardScrollScrubCameraRef.current;
				if (!state) return;
				// Keep the decorative spin from treating this final duration:0 landing
				// `moveend` as permission to start its own 1000ms ease immediately after the
				// release tween. That instant follow-up ease is exactly what makes the
				// below-threshold release feel like "snap back, then the map fixes itself".
				//
				// The spin loop will see the suppression window, reseat its timing/longitude
				// to the landed camera, and resume on a delayed no-op tick instead of becoming
				// a second visible camera owner on the same frame the snapback completes.
				dashboardScrollScrubSuppressSpinUntilRef.current =
					typeof performance !== 'undefined' ? performance.now() + 220 : Date.now() + 220;
				dashboardScrollScrubActiveRef.current = false;
				try {
					map.easeTo({
						center: state.startCenter,
						zoom: state.startZoom,
						pitch: state.startPitch,
						bearing: 0,
						offset: state.startOffset,
						duration: 0,
					});
				} catch {
					// Ignore.
				}
				restoreDecorativeZoomLock();
				dashboardScrollScrubCameraRef.current = null;
				return;
			}

			const state = getScrubState();
			if (!state) return;

			dashboardScrollScrubActiveRef.current = true;
			loosenZoomLockForScrub();

			const lngDelta = normalizeLngDeg(state.targetCenter[0] - state.startCenter[0]);
			const center: [number, number] = [
				normalizeLngDeg(state.startCenter[0] + lngDelta * progress),
				lerp(state.startCenter[1], state.targetCenter[1], progress),
			];
			const offset: [number, number] = [
				lerp(state.startOffset[0], 0, progress),
				lerp(state.startOffset[1], 0, progress),
			];

			try {
				map.easeTo({
					center,
					zoom: lerp(state.startZoom, MAP_DEFAULT_ZOOM, progress),
					pitch: lerp(state.startPitch, 0, progress),
					bearing: 0,
					offset,
					duration: 0,
				});
				// Same no-continuous-render caveat as the snapback branch: a duration:0 easeTo
				// moves the camera but doesn't guarantee a canvas repaint on the Safari perf path,
				// so force one per scrub frame to keep the live tilt-down painting in lock-step.
				map.triggerRepaint();
			} catch {
				// Ignore.
			}
		};

		window.addEventListener(DASHBOARD_MAP_CAMERA_SCRUB_EVENT, handleCameraScrub);
		return () => {
			window.removeEventListener(DASHBOARD_MAP_CAMERA_SCRUB_EVENT, handleCameraScrub);
		};
	}, [map, isMapLoaded]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const wasBackground = prevPresentationRef.current === 'background';
		prevPresentationRef.current = presentation;

		applyBasemapSettlementLabelPresentation(
			map,
			!isBackgroundPresentation,
			interactiveFloorDeltaRef.current
		);

		// Stop any prior background spin when presentation changes.
		backgroundSpinCleanupRef.current?.();
		backgroundSpinCleanupRef.current = null;

		const safeEnableInteractions = () => {
			const nativeFeel = !desktopInteractionTuningRef.current;
			try {
				map.scrollZoom.enable();
			} catch {}
			try {
				zoomOutGovernorRef.current = createConfiguredZoomOutGovernor();
				applyScrollZoomFeel(map, nativeFeel);
			} catch {}
			try {
				map.boxZoom.enable();
			} catch {}
			try {
				map.doubleClickZoom.enable();
			} catch {}
			try {
				// Desktop re-passes the tuned inertia (a bare enable() resets it to
				// Mapbox defaults — mapbox-gl 3.x does not persist _inertiaOptions);
				// mobile intentionally gets native inertia via a bare enable().
				enableDragPanFeel(map, nativeFeel);
			} catch {}
			try {
				map.keyboard.enable();
				map.keyboard.disableRotation();
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
			if (!dashboardScrollScrubActiveRef.current) {
				dashboardScrollScrubProgressRef.current = 0;
				dashboardScrollScrubCameraRef.current = null;
			}

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
				let resumeAfterScrubTimer: ReturnType<typeof setTimeout> | null = null;

				const spinGlobe = () => {
					const now = performance.now();
					const suppressUntil = dashboardScrollScrubSuppressSpinUntilRef.current;
					if (dashboardScrollScrubActiveRef.current || now < suppressUntil) {
						// The scroll scrub owns the camera right now. Keep the spin loop's timing
						// and longitude pinned to the *live* camera so that when the scrub releases
						// (snapback) and the spin resumes, the first tick advances a normal small
						// step from the current position. Without this, lastTickMs goes stale during
						// the scrub and the resume tick computes a capped ~2s dt — a delayed,
						// out-of-sync "pan back" right after the chrome has already settled.
						lastTickMs = now;
						currentLng = normalizeLng(map.getCenter()?.lng ?? currentLng);
						if (
							!dashboardScrollScrubActiveRef.current &&
							now < suppressUntil &&
							resumeAfterScrubTimer == null
						) {
							resumeAfterScrubTimer = setTimeout(
								() => {
									resumeAfterScrubTimer = null;
									// Start the resumed decorative spin from rest after the snapback has
									// visually completed, not as a same-frame continuation of it.
									lastTickMs = performance.now();
									spinGlobe();
								},
								Math.max(0, suppressUntil - now)
							);
						}
						return;
					}
					try {
						// Advance by wall-clock elapsed time, not per event: map.resize()
						// (e.g. while the window is being drag-resized) fires extra moveend
						// events, and a fixed per-tick step would speed up the spin.
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
					if (resumeAfterScrubTimer != null) {
						clearTimeout(resumeAfterScrubTimer);
						resumeAfterScrubTimer = null;
					}
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
			const scrubbedEntryProgress = dashboardScrollScrubProgressRef.current;
			const scrubbedEntryCamera = dashboardScrollScrubCameraRef.current;
			const hasScrubbedEntryCamera =
				!entryCamera && scrubbedEntryProgress >= 0.85 && !!scrubbedEntryCamera;
			interactiveEntryCameraPendingRef.current = true;
			interactiveEntryCameraAppliedKeyRef.current =
				interactiveEntryCameraKey(entryCamera);
			try {
				let center: [number, number] = DASHBOARD_DECORATIVE_CENTER;
				let zoom = MAP_DEFAULT_ZOOM;
				if (entryCamera) {
					center = [entryCamera.center.lng, entryCamera.center.lat];
					zoom = entryCamera.zoom;
				} else if (hasScrubbedEntryCamera && scrubbedEntryCamera) {
					// The user already scrubbed the dashboard camera to the interactive
					// framing. Reuse that exact target so the presentation flip does not
					// compute a fresh offset-removal target and visibly "correct" afterward.
					center = scrubbedEntryCamera.targetCenter;
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
					duration:
						entryCamera || hasScrubbedEntryCamera
							? 0
							: DASHBOARD_TO_INTERACTIVE_HANDOFF_GLIDE_MS,
					// Ease-in-out (not ease-out): the camera fly begins right after the
					// user-driven scroll scrub releases at ~zero velocity. An ease-out curve
					// starts at max velocity, so the handoff lurched ("jarring shift"). Easing
					// in from rest makes entering the map feel like one continuous gentle move.
					easing: mapboxEaseInOutCubic,
				});
				if (hasScrubbedEntryCamera) {
					dashboardScrollScrubActiveRef.current = false;
					dashboardScrollScrubProgressRef.current = 0;
					dashboardScrollScrubCameraRef.current = null;
				}
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

	const compactOverlayPillEntries = useMemo<CompactOverlayPillEntry[]>(() => {
		const viewport = compactOverlaySettledViewport;
		if (!isMapLoaded || !isCompactOverlayActive || !viewport) {
			compactOverlayCommittedRef.current = [];
			compactOverlayCommittedZoomBucketRef.current = null;
			return [];
		}

		if (!isAmbientContactsEnabled || allContactsOverlayContactsWithCoords.length === 0) {
			compactOverlayCommittedRef.current = [];
			compactOverlayCommittedZoomBucketRef.current = null;
			return [];
		}

		const viewportWidth = viewport.width;
		const viewportHeight = viewport.height;
		const selectedSet = new Set<number>(selectedContacts);

		// Rank seed is keyed to the ZOOM BUCKET only (never the panned bbox), so a
		// contact's priority is identical across a pan — that stability is what lets
		// survivors carry over verbatim instead of reshuffling on every settle.
		const zoomBucket = Math.round(viewport.zoom * 2) / 2;
		const seed = [
			'ambient',
			(searchQuery ?? '').trim(),
			searchWhat ?? '',
			zoomBucket,
		].join('|');

		// Random pill count within [MIN, MAX] (inclusive), derived from the same
		// per-zoom-bucket seed: it stays constant while panning at one zoom (no pop-in
		// churn) and re-rolls when the zoom level changes. Same range on desktop/mobile;
		// collision spacing self-limits how many actually fit on a narrow viewport.
		const targetSpan =
			LIGHTWEIGHT_COMPACT_OVERLAY_TARGET_PILLS_MAX -
			LIGHTWEIGHT_COMPACT_OVERLAY_TARGET_PILLS_MIN +
			1;
		const randomizedTargetCount =
			LIGHTWEIGHT_COMPACT_OVERLAY_TARGET_PILLS_MIN +
			(hashStringToUint32(`${seed}|count`) % targetSpan);
		// Thin the set out at the globe view: show only ~5 pills when fully zoomed
		// out, then ramp linearly up to the normal randomized count by the time you
		// reach the continental view. Normalize the zoom by the interactive floor
		// delta first so a large monitor (whose globe floor sits a little higher)
		// still reads its fully-zoomed-out view as "zoomed out" and gets the same ~5.
		const normalizedZoom = viewport.zoom - interactiveFloorDeltaRef.current;
		const zoomedOutRampT = clamp(
			(normalizedZoom - LIGHTWEIGHT_COMPACT_OVERLAY_ZOOMED_OUT_FULL_ZOOM) /
				(LIGHTWEIGHT_COMPACT_OVERLAY_ZOOMED_OUT_END_ZOOM -
					LIGHTWEIGHT_COMPACT_OVERLAY_ZOOMED_OUT_FULL_ZOOM),
			0,
			1
		);
		const targetCount = Math.max(
			1,
			Math.round(
				lerp(
					LIGHTWEIGHT_COMPACT_OVERLAY_ZOOMED_OUT_TARGET_PILLS,
					randomizedTargetCount,
					zoomedOutRampT
				)
			)
		);

		// Globe back-face guard. A contact on the far hemisphere still projects to an
		// on-screen-looking pixel, so without this the old patch carries over (and
		// doubles up) when you rotate the globe. computeGlobeFrontHemisphereOpacity
		// returns 0 past the limb, and short-circuits to fully-visible above the
		// globe-zoom regime — where the bbox/edge checks already suffice.
		const isOnFrontHemisphere = (coords: LatLngLiteral): boolean =>
			!map || computeGlobeFrontHemisphereOpacity(map, coords, null, viewport.zoom) > 0;

		const ambientContactAllowed = (contact: ContactWithName): boolean => {
			const categoryIndex = getAmbientContactCategoryIndexFromTitle(contact.title);
			if (categoryIndex < 0) return ambientUncategorizedActive;
			return ambientActiveCategories?.[categoryIndex] !== false;
		};

		// Reserve uncategorized "people" for the older zoomed-in detail marker layer:
		// the lightweight compact overlay only ever shows pills that resolve to a real
		// category icon (coffee / restaurants / venues / festivals / weddings /
		// wine-beer-spirits / radio). Anything that would fall back to the generic blue
		// "people" spark icon (null category OR a curatedCategory with no mapped icon)
		// is excluded here so it never appears as a compact pill.
		const isCompactOverlayCategorized = (contact: ContactWithName): boolean =>
			isCleanMapMarkerCategory(getCompactOverlayWhatForContact(contact, null));

		const coordsFor = (contact: ContactWithName): LatLngLiteral | null =>
			getAllContactsOverlayContactCoords(contact) ?? getLatLngFromContact(contact);

		const toEntry = (
			contact: ContactWithName,
			coords: LatLngLiteral
		): (CompactOverlayPillEntry & { x: number; y: number }) | null => {
			const point = projectCompactOverlayPoint(coords, viewport);
			if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
			const label = getCompactOverlayLabel(contact);
			const width = getCompactOverlayPillWidth(label);
			const whatForMarker = getCompactOverlayWhatForContact(contact, null);
			return {
				contact,
				coords,
				label,
				width,
				initialX: Math.round(point.x - width / 2),
				initialY: Math.round(point.y - LIGHTWEIGHT_COMPACT_OVERLAY_HEIGHT_PX / 2),
				whatForMarker,
				categoryKey: getCompactOverlayCategoryKey(whatForMarker),
				iconSpec: getCompactOverlayIconSpec(whatForMarker),
				iconInnerFill: getTooltipCategoryInnerFillColor(whatForMarker),
				isSelected: selectedSet.has(contact.id),
				x: point.x,
				y: point.y,
			};
		};

		// Padded "keep" box (in screen px): a committed pill survives until it scrolls
		// this far past the visible edge. Large pad = the set stays put across a long
		// pan and only refreshes once you've travelled into genuinely new space.
		const padX = viewportWidth * LIGHTWEIGHT_COMPACT_OVERLAY_KEEP_PAD_FACTOR;
		const padY = viewportHeight * LIGHTWEIGHT_COMPACT_OVERLAY_KEEP_PAD_FACTOR;
		const inKeepArea = (x: number, y: number): boolean =>
			x >= -padX && x <= viewportWidth + padX && y >= -padY && y <= viewportHeight + padY;
		const edgePad = 6;
		const inVisibleArea = (rect: {
			left: number;
			top: number;
			right: number;
			bottom: number;
		}): boolean =>
			rect.left >= edgePad &&
			rect.right <= viewportWidth - edgePad &&
			rect.top >= edgePad &&
			rect.bottom <= viewportHeight - edgePad;
		const isPillVisible = (
			entry: CompactOverlayPillEntry & { x: number; y: number }
		): boolean =>
			inVisibleArea({
				left: entry.x - entry.width / 2,
				top: entry.y - LIGHTWEIGHT_COMPACT_OVERLAY_HEIGHT_PX / 2,
				right: entry.x + entry.width / 2,
				bottom: entry.y + LIGHTWEIGHT_COMPACT_OVERLAY_HEIGHT_PX / 2,
			});

		// 1) Carry over the committed set. Survivors are pills still inside the padded
		//    keep-area (reprojected at the new camera). On a zoom-bucket change we drop
		//    everything and rebuild from scratch so the spread widens/narrows cleanly.
		const zoomBucketChanged = compactOverlayCommittedZoomBucketRef.current !== zoomBucket;
		const committed = zoomBucketChanged ? [] : compactOverlayCommittedRef.current;

		const picked: Array<CompactOverlayPillEntry & { x: number; y: number }> = [];
		const pickedIds = new Set<number>();
		const rects: Array<{ left: number; top: number; right: number; bottom: number }> = [];
		const tryPlace = (
			entry: (CompactOverlayPillEntry & { x: number; y: number }) | null,
			{ requireVisible }: { requireVisible: boolean }
		): boolean => {
			if (!entry) return false;
			if (pickedIds.has(entry.contact.id)) return false;
			const rect = {
				left: entry.x - entry.width / 2,
				top: entry.y - LIGHTWEIGHT_COMPACT_OVERLAY_HEIGHT_PX / 2,
				right: entry.x - entry.width / 2 + entry.width,
				bottom: entry.y + LIGHTWEIGHT_COMPACT_OVERLAY_HEIGHT_PX / 2,
			};
			if (!entry.isSelected) {
				if (requireVisible && !inVisibleArea(rect)) return false;
				if (!requireVisible && !inKeepArea(entry.x, entry.y)) return false;
				const collides = rects.some((existing) =>
					compactOverlayRectsOverlap(
						rect,
						existing,
						LIGHTWEIGHT_COMPACT_OVERLAY_COLLISION_MARGIN_PX
					)
				);
				if (collides) return false;
			}
			picked.push(entry);
			pickedIds.add(entry.contact.id);
			rects.push(rect);
			return true;
		};

		// Always keep selected contacts pinned first (never dropped by the cap).
		for (const contact of selectedContactObjects) {
			if (!selectedSet.has(contact.id)) continue;
			const coords = coordsFor(contact);
			if (!coords) continue;
			tryPlace(toEntry(contact, coords), { requireVisible: false });
		}

		// Carry-over survivors (in committed order, reprojected). Kept if still in the
		// padded keep-area — this is what makes the set "stick" while panning.
		for (const prev of committed) {
			if (pickedIds.has(prev.contact.id)) continue;
			const coords = coordsFor(prev.contact);
			if (!coords) continue;
			if (!ambientContactAllowed(prev.contact)) continue;
			// People belong to the zoomed-in detail layer only — drop any carried-over
			// uncategorized survivor so it fades out instead of lingering as a spark pill.
			if (!isCompactOverlayCategorized(prev.contact)) continue;
			// Clip to OUTSIDE the engaged search region (curated blob OR locked state): survivors
			// that fall inside it (e.g. after a center-drag moved the circle over them) are dropped.
			if (
				isActiveSearchRegionEngaged &&
				isLngLatInsideActiveSearchBlob(coords.lng, coords.lat)
			)
				continue;
			// Drop survivors that rotated to the back of the globe so the old patch
			// clears instead of doubling up over the new front-facing patch.
			if (!isOnFrontHemisphere(coords)) continue;
			tryPlace(toEntry(prev.contact, coords), { requireVisible: false });
		}

		// 2) Fill remaining slots from the visible viewport, category-balanced and
		//    collision-free. The cap counts only VISIBLE non-selected pills, so a pan
		//    that pushes survivors toward the edge still tops the visible area back up
		//    to `targetCount` (without disturbing the survivors that remain on screen).
		const visibleNonSelectedCount = (): number =>
			picked.filter((p) => !p.isSelected && isPillVisible(p)).length;
		if (visibleNonSelectedCount() < targetCount) {
			const fillCandidates: Array<
				CompactOverlayPillEntry & { x: number; y: number; stableKey: number }
			> = [];
			for (const contact of allContactsOverlayContactsWithCoords) {
				if (pickedIds.has(contact.id)) continue;
				if (!ambientContactAllowed(contact)) continue;
				// Skip uncategorized "people" — they're reserved for the older zoomed-in
				// detail marker layer and must not surface as compact suggestion pills.
				if (!isCompactOverlayCategorized(contact)) continue;
				const coords = coordsFor(contact);
				if (!coords) continue;
				if (!isLatLngInBbox(coords.lat, coords.lng, viewport)) continue;
				// Clip to OUTSIDE the engaged search region (curated blob OR locked state) — the
				// in-region keeps only its result markers; the ambient pill layer renders elsewhere.
				if (
					isActiveSearchRegionEngaged &&
					isLngLatInsideActiveSearchBlob(coords.lng, coords.lat)
				)
					continue;
				// Only fill from the visible front hemisphere — never the far side.
				if (!isOnFrontHemisphere(coords)) continue;
				const entry = toEntry(contact, coords);
				if (!entry) continue;
				fillCandidates.push({
					...entry,
					stableKey: hashStringToUint32(`${seed}|pill|${contact.id}`),
				});
			}

			const categoryCount = new Set(fillCandidates.map((c) => c.categoryKey)).size;
			const cellKeyFor = (c: { x: number; y: number }): string =>
				`${clamp(Math.floor((c.x / viewportWidth) * 4), 0, 3)}:${clamp(
					Math.floor((c.y / viewportHeight) * 3),
					0,
					2
				)}`;
			const groupKeyFor = (
				c: CompactOverlayPillEntry & { x: number; y: number }
			): string => (categoryCount > 1 ? c.categoryKey : cellKeyFor(c));

			const groups = new Map<
				string,
				Array<CompactOverlayPillEntry & { x: number; y: number; stableKey: number }>
			>();
			for (const candidate of fillCandidates) {
				const key = groupKeyFor(candidate);
				const group = groups.get(key) ?? [];
				group.push(candidate);
				groups.set(key, group);
			}
			for (const group of groups.values()) {
				group.sort((a, b) => a.stableKey - b.stableKey);
			}
			const orderedGroupKeys = Array.from(groups.keys()).sort(
				(a, b) =>
					hashStringToUint32(`${seed}|group|${a}`) -
					hashStringToUint32(`${seed}|group|${b}`)
			);
			const groupCursors = new Map<string, number>(
				orderedGroupKeys.map((key) => [key, 0])
			);
			let madeProgress = true;
			while (madeProgress && visibleNonSelectedCount() < targetCount) {
				madeProgress = false;
				for (const key of orderedGroupKeys) {
					if (visibleNonSelectedCount() >= targetCount) break;
					const group = groups.get(key);
					if (!group) continue;
					const cursor = groupCursors.get(key) ?? 0;
					if (cursor >= group.length) continue;
					groupCursors.set(key, cursor + 1);
					madeProgress = true;
					tryPlace(group[cursor], { requireVisible: true });
				}
			}
		}

		// 3) Commit. Keep selected pinned, then all placed non-selected pills (visible
		//    survivors + just-added fills + still-in-keep-ring survivors). The fill loop
		//    already bounded the visible count to `targetCount`; off-screen-but-kept
		//    survivors are retained so panning back reveals them without a refetch.
		const selectedEntries = picked.filter((p) => p.isSelected);
		// Bound the retained set so a long pan can't grow it without limit: visible
		// pills first, then nearest off-screen survivors, capped at a small multiple of
		// the on-screen target.
		const viewportCenterX = viewportWidth / 2;
		const viewportCenterY = viewportHeight / 2;
		const distToCenterSq = (p: { x: number; y: number }): number =>
			(p.x - viewportCenterX) ** 2 + (p.y - viewportCenterY) ** 2;
		const nonSelectedEntries = picked
			.filter((p) => !p.isSelected)
			.sort((a, b) => {
				const aVis = isPillVisible(a);
				const bVis = isPillVisible(b);
				if (aVis !== bVis) return aVis ? -1 : 1;
				return distToCenterSq(a) - distToCenterSq(b);
			})
			.slice(0, targetCount * 2 + 4);
		const committedNext = [...selectedEntries, ...nonSelectedEntries].map((entry) => ({
			contact: entry.contact,
			coords: entry.coords,
			label: entry.label,
			width: entry.width,
			initialX: entry.initialX,
			initialY: entry.initialY,
			whatForMarker: entry.whatForMarker,
			categoryKey: entry.categoryKey,
			iconSpec: entry.iconSpec,
			iconInnerFill: entry.iconInnerFill,
			isSelected: entry.isSelected,
		}));
		compactOverlayCommittedRef.current = committedNext;
		compactOverlayCommittedZoomBucketRef.current = zoomBucket;
		return committedNext;
	}, [
		map,
		isMapLoaded,
		isCompactOverlayActive,
		compactOverlaySettledViewport,
		isAmbientContactsEnabled,
		allContactsOverlayContactsWithCoords,
		searchQuery,
		selectedContacts,
		selectedContactObjects,
		getAllContactsOverlayContactCoords,
		ambientUncategorizedActive,
		ambientActiveCategories,
		isActiveSearchRegionEngaged,
		hasCuratedBlobOutline,
		hasLockedStateOutline,
		isLngLatInsideActiveSearchBlob,
	]);

	const compactOverlayVisibleIdSet = useMemo(
		() => new Set(compactOverlayPillEntries.map((entry) => entry.contact.id)),
		[compactOverlayPillEntries]
	);
	compactOverlayVisibleIdSetRef.current = compactOverlayVisibleIdSet;
	const compactOverlayPillEntryById = useMemo(
		() =>
			new Map<number, CompactOverlayPillEntry>(
				compactOverlayPillEntries.map((entry) => [entry.contact.id, entry])
			),
		[compactOverlayPillEntries]
	);

	useLayoutEffect(() => {
		if (!map || !isMapLoaded || compactOverlayPillEntries.length === 0) return;
		const entryById = new Map(
			compactOverlayPillEntries.map((entry) => [entry.contact.id, entry])
		);
		const updatePositions = () => {
			for (const [id, el] of compactOverlayPillRefs.current) {
				const entry = entryById.get(id);
				if (!entry) {
					el.style.opacity = '0';
					el.style.pointerEvents = 'none';
					continue;
				}
				const point = map.project([entry.coords.lng, entry.coords.lat]);
				const x = Math.round(point.x - entry.width / 2);
				const y = Math.round(point.y - LIGHTWEIGHT_COMPACT_OVERLAY_HEIGHT_PX / 2);
				el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
				// Hard-cut a pill the instant it rotates to the back of the globe or
				// pans off the visible edge — map.project() returns on-screen-looking
				// coords for back-hemisphere points, so this guard is what keeps a
				// single front patch visible during a rotation gesture.
				const container = map.getContainer();
				const onScreen =
					point.x >= 0 &&
					point.x <= container.clientWidth &&
					point.y >= 0 &&
					point.y <= container.clientHeight;
				const onFront =
					computeGlobeFrontHemisphereOpacity(map, entry.coords, null, map.getZoom()) > 0;
				const visible = onScreen && onFront;
				el.style.opacity = visible ? '1' : '0';
				el.style.pointerEvents = visible ? 'auto' : 'none';
			}
		};
		updatePositions();
		map.on('move', updatePositions);
		return () => {
			map.off('move', updatePositions);
		};
	}, [map, isMapLoaded, compactOverlayPillEntries]);

	const { campaignFootprintContactIdSet } = useCampaignFootprint({
		map,
		isMapLoaded,
		isBackgroundPresentation,
		searchEngaged,
		campaignFootprintContacts,
	});

	const campaignHeatmapFadeRafRef = useRef<number | null>(null);
	// Last rendered glowFade per contact id — the start of the next crossfade.
	const campaignHeatmapFadeByIdRef = useRef<Map<number, number>>(new Map());
	useCampaignHeatmap({
		map,
		isMapLoaded,
		campaignMarkerMode,
		campaignHeatmapColor,
		campaignHeatmapStatusColors,
		campaignHeatmapAmbient,
		contactsWithCoords,
		selectedContacts,
		coordsByContactId,
		getContactCoords,
		getCampaignStatusForContact,
		campaignHeatmapFadeRafRef,
		campaignHeatmapFadeByIdRef,
	});

	useCuratedBlobBuilder({
		applyBlobMorphRef,
		applyCuratedOrbStateRef,
		clearCuratedBlobOutline,
		contactsWithCoords,
		curatedBlobOrbTargetsRef,
		curatedBlobSignatureRef,
		getContactCoords,
		isLoading,
		isMapLoaded,
		lastBlobMorphTAppliedRef,
		map,
		naturalBlobMorphSourceRef,
		radiusOverlay,
		radiusOverlayRef,
		searchEngaged,
		searchQuery,
		setHasCuratedBlobOutline,
		updateCuratedBlobProtectedMarkerIds,
	});

	useRadiusSearchTool({
		clearEmptyMapPrompt,
		contactsWithCoords,
		isBackgroundPresentation,
		isDraggingRadiusRef,
		isLoading,
		isMapLoaded,
		map,
		onRadiusCenterChangeRef,
		onRadiusPlaceRef,
		onRadiusPlacementCancelRef,
		radiusDragSuppressEmptyMapUntilRef,
		radiusMarkerRef,
		radiusMarkerZoomHandlerRef,
		radiusOverlay,
		radiusPlacementActive,
		radiusPlacementDownClientRef,
		radiusPlacementGhostElRef,
		radiusPlacementLastLngLatRef,
		radiusPlacementMiles,
		radiusPlacementMilesRef,
		searchEngaged,
	});

	const { completeAreaSelection, handleMapMouseUp, handleMapTouchEnd } = useAreaSelectCompletion({
		allContactsOverlayCoordsByContactId,
		allContactsOverlayVisibleContacts,
		baseContactIdSet,
		bookingExtraCoordsByContactId,
		bookingExtraVisibleContacts,
		clearSelectionRect,
		compactOverlayPillEntries,
		contactsWithCoords,
		coordsByContactId,
		getContactCoords,
		isAreaSelecting,
		isBookingSearch,
		isPromotionSearch,
		lastSelectAllInViewNonceRef,
		map,
		onAreaSelect,
		promotionOverlayCoordsByContactId,
		promotionOverlayVisibleContacts,
		searchWhat,
		selectAllInViewNonce,
		selectionStartClientRef,
		selectionStartLatLngRef,
		visibleContacts,
	});

	// Recompute which contact markers are rendered in the current viewport, and
	// budget background dots so the combined total stays under MAX_TOTAL_DOTS.
	const recomputeViewportDots = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance) return;
			// Preserve currently-rendered markers while results are loading/refetching.
			// The dashboard parent can momentarily pass `contacts=[]` during refetch; if we sample
			// against that, we end up clearing and then repopulating the marker sources (visible flicker).
			if (isLoadingRef.current) return;

			if (isCompactOverlayActive) {
				// Compact overlay (pill) mode is an AMBIENT layer. When an active search is
				// engaged (curated blob mode), keep the base result dots/markers intact and
				// only suppress the viewport-wide contextual overlays.
				if (!searchEngaged && lastVisibleContactsKeyRef.current !== '') {
					lastVisibleContactsKeyRef.current = '';
					visibleContactIdSetRef.current = new Set();
					setVisibleContacts([]);
				}
				if (lastBookingExtraVisibleContactsKeyRef.current !== '') {
					lastBookingExtraVisibleContactsKeyRef.current = '';
					setBookingExtraVisibleContacts([]);
				}
				if (lastPromotionOverlayVisibleContactsKeyRef.current !== '') {
					lastPromotionOverlayVisibleContactsKeyRef.current = '';
					setPromotionOverlayVisibleContacts([]);
				}
				if (lastAllContactsOverlayVisibleContactsKeyRef.current !== '') {
					lastAllContactsOverlayVisibleContactsKeyRef.current = '';
					setAllContactsOverlayVisibleContacts([]);
				}
				if (!searchEngaged) return;
			}

			const maxTotalMarkers = isLightweightDetailMarkerMode
				? LIGHTWEIGHT_DETAIL_MARKER_BUDGET
				: MAX_TOTAL_DOTS;
			// A state-category search's result markers are the user's targeted set (e.g. every
			// winery in the state), not a curated sampling — keep them at full density even when the
			// lightweight detail overlay engages for the OUTSIDE-region ambient markers. Only the
			// ambient overlay (and booking/promotion extras) stay on the lighter detail budget.
			const maxResultMarkers =
				isLightweightDetailMarkerMode && !isStateCategorySearchEngaged
					? LIGHTWEIGHT_DETAIL_MARKER_BUDGET
					: MAX_TOTAL_DOTS;

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
			// lists are also used as the general radio overlay. They should render for
			// any engaged search (not just dedicated radio searches), while list/area
			// selection remains gated to promotion search elsewhere.
			const shouldShowPromotionOverlay =
				searchEngaged &&
				isAnySearch &&
				!isRadiusSearchActive &&
				ambientActiveCategories?.[RADIO_CONTACT_CATEGORY_INDEX] !== false &&
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
				// Defensive cap (we expect far fewer than this). In lightweight detail
				// mode, promotion pins share the same ~30-marker total budget.
				const promotionOverlayCap = isLightweightDetailMarkerMode
					? Math.min(
							PROMOTION_OVERLAY_MARKERS_MAX_PINS,
							Math.max(0, maxTotalMarkers - selectedContacts.length)
						)
					: PROMOTION_OVERLAY_MARKERS_MAX_PINS;
				nextPromotionOverlayVisible =
					promoInBounds.length > promotionOverlayCap
						? promoInBounds.slice(0, promotionOverlayCap)
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

			const selectedSet = new Set<number>(selectedContacts);
			const hoveredId = hoveredMarkerIdRef.current;
			let nextVisibleContacts: ContactWithName[] = [];

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
				nextVisibleContacts = curatedContactsWithCoords
					.slice()
					.sort((a, b) => a.id - b.id);
				if (
					isLightweightDetailMarkerMode &&
					nextVisibleContacts.length > maxTotalMarkers
				) {
					const selected = nextVisibleContacts.filter((contact) =>
						selectedSet.has(contact.id)
					);
					const rest = nextVisibleContacts.filter(
						(contact) => !selectedSet.has(contact.id)
					);
					nextVisibleContacts = [...selected, ...rest].slice(
						0,
						Math.max(maxTotalMarkers, selected.length)
					);
				}
				const nextKey = nextVisibleContacts.map((c) => c.id).join(',');
				if (nextKey !== lastVisibleContactsKeyRef.current) {
					lastVisibleContactsKeyRef.current = nextKey;
					setVisibleContacts(nextVisibleContacts);
				}
			}

			if (!shouldUseStableCuratedMarkers) {
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
					maxResultMarkers - nextPromotionOverlayVisible.length
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
						const lockedSamplingBbox =
							lockedStateSelectionBboxRef.current ?? viewportBbox;

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
									throw new Error(
										'[SearchResultsMap] missing candidate index (priority)'
									);
								priorityOrder[i] = idx;
							}

							const inLockedOrder = new Uint32Array(inLockedCandidates.length);
							for (let i = 0; i < inLockedCandidates.length; i++) {
								const idx = candidateIndexByRef.get(inLockedCandidates[i]);
								if (idx == null)
									throw new Error(
										'[SearchResultsMap] missing candidate index (inLocked)'
									);
								inLockedOrder[i] = idx;
							}

							const outLockedOrder = new Uint32Array(outLockedCandidates.length);
							for (let i = 0; i < outLockedCandidates.length; i++) {
								const idx = candidateIndexByRef.get(outLockedCandidates[i]);
								if (idx == null)
									throw new Error(
										'[SearchResultsMap] missing candidate index (outLocked)'
									);
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
			}

			// Booking zoom-in extras: render additional booking categories at high zoom without
			// exceeding MAX_TOTAL_DOTS total markers.
			const shouldShowBookingExtras =
				isBookingSearch &&
				!isRadiusSearchActive &&
				zoomRaw >= BOOKING_EXTRA_MARKERS_MIN_ZOOM &&
				bookingExtraContactsWithCoords.length > 0;
			let nextBookingExtraVisible: ContactWithName[] = [];
			if (shouldShowBookingExtras) {
				const remainingBudget = Math.max(
					0,
					maxTotalMarkers -
						nextPromotionOverlayVisible.length -
						nextVisibleContacts.length
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
				isAnySearch &&
				!isRadiusSearchActive &&
				zoomRaw >= ALL_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM;
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

				const isAllContactsOverlayContactAllowed = (
					contact: ContactWithName
				): boolean => {
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
					// Clip the lightweight detail markers to OUTSIDE the engaged search region (curated
					// blob OR locked state) — the region keeps only its result markers until disengage.
					if (
						isActiveSearchRegionEngaged &&
						isLngLatInsideActiveSearchBlob(coords.lng, coords.lat)
					)
						continue;
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
					const ambientVisibleMax = isLightweightDetailMarkerMode
						? maxTotalMarkers
						: AMBIENT_CONTACTS_OVERLAY_TARGET_DOTS;
					const ambientVisibleMin = isLightweightDetailMarkerMode
						? Math.min(12, ambientVisibleMax)
						: AMBIENT_CONTACTS_OVERLAY_MIN_DOTS;
					const visibleTarget = Math.max(
						ambientVisibleMin,
						Math.round(ambientVisibleMax * ambientT)
					);
					const bufferTarget = isLightweightDetailMarkerMode
						? 0
						: Math.min(
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
			baseContactIdSet,
			selectedContacts,
			searchQuery,
			searchEngaged,
			lockedStateKey,
			isCoordsInLockedState,
			isBookingSearch,
			bookingExtraContactsWithCoords,
			getBookingExtraContactCoords,
			isPromotionSearch,
			promotionOverlayContactsWithCoords,
			getPromotionOverlayContactCoords,
			isAnySearch,
			isRadiusSearchActive,
			isAmbientContactsEnabled,
			ambientActiveCategories,
			ambientUncategorizedActive,
			allContactsOverlayContactsWithCoords,
			getAllContactsOverlayContactCoords,
			isAllContactsOverlayContactOnLand,
			isCompactOverlayActive,
			isLightweightDetailMarkerMode,
			isActiveSearchRegionEngaged,
			isStateCategorySearchEngaged,
			isLngLatInsideActiveSearchBlob,
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
				duration: MAP_REQUESTED_ZOOM_EASE_MS,
				easing: mapboxEaseOutQuart,
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

		// ── Airbnb/Zillow-style "settle" loading ──────────────────────────────
		// A single user gesture frequently emits a *burst* of `moveend`s — wheel
		// zoom ticks, inertial fling tails, trackpad pan segments. Recomputing the
		// network-bound overlay fetch windows on every one of those is exactly what
		// made the overlay feel like it was "loading and reloading every time you
		// move once or twice." Competitor maps feel cleaner because marker data
		// behaves as if it is requested for the settled camera. We do the same: the
		// cheap, purely-visual work (zoom readout, basemap clip, local marker
		// re-sampling, the "search this area" CTA) stays immediate so the chrome
		// still tracks the camera live, but the three fetch-window recomputes that
		// trigger overlay network queries are deferred until the viewport settles.
		const runSettledViewportFetch = () => {
			viewportSettleFirstPendingAtRef.current = null;
			if (viewportSettleTimerRef.current) {
				clearTimeout(viewportSettleTimerRef.current);
				viewportSettleTimerRef.current = null;
			}
			updateBookingExtraFetchBbox(map);
			updatePromotionOverlayFetchBbox(map);
			updateAllContactsOverlayFetchBbox(map);

			const bounds = map.getBounds();
			const center = map.getCenter();
			if (bounds && center) {
				const sw = bounds.getSouthWest();
				const ne = bounds.getNorthEast();
				if (ne.lng >= sw.lng) {
					const zoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
					const zoomKey = Math.round(zoom);
					const quant = getBackgroundDotsQuantizationDeg(zoomKey);
					const qSouth = Math.floor(sw.lat / quant);
					const qWest = Math.floor(sw.lng / quant);
					const qNorth = Math.ceil(ne.lat / quant);
					const qEast = Math.ceil(ne.lng / quant);
					const container = map.getContainer();
					const width = Math.max(1, container.clientWidth);
					const height = Math.max(1, container.clientHeight);
					const key = [zoomKey, qSouth, qWest, qNorth, qEast, width, height].join('|');
					setCompactOverlaySettledViewport((prev) =>
						prev?.key === key
							? prev
							: {
									minLat: sw.lat,
									maxLat: ne.lat,
									minLng: sw.lng,
									maxLng: ne.lng,
									center: { lat: center.lat, lng: center.lng },
									zoom,
									width,
									height,
									key,
								}
					);
				}
			}
		};

		const scheduleSettledViewportFetch = () => {
			const now = Date.now();
			if (viewportSettleFirstPendingAtRef.current == null) {
				viewportSettleFirstPendingAtRef.current = now;
			}
			if (viewportSettleTimerRef.current) {
				clearTimeout(viewportSettleTimerRef.current);
			}
			// Honor a max-wait ceiling for chained wheel/trackpad segments: without it,
			// a stream of short moveend→movestart cycles could keep postponing refreshes.
			// Once pending work has aged past the ceiling, fire on the next completed segment.
			const elapsed = now - viewportSettleFirstPendingAtRef.current;
			const wait = Math.min(
				MAP_VIEWPORT_SETTLE_DEBOUNCE_MS,
				Math.max(0, MAP_VIEWPORT_SETTLE_MAX_WAIT_MS - elapsed)
			);
			viewportSettleTimerRef.current = setTimeout(runSettledViewportFetch, wait);
		};

		// A new gesture starting means the pending fetch for the (now superseded)
		// intermediate view should not fire; the gesture's own `moveend` will
		// reschedule. We keep `firstPendingAt` so the max-wait ceiling still spans
		// a chained pan→pan→pan scrub rather than resetting on each grab.
		const onMoveStartCancelSettle = () => {
			if (viewportSettleTimerRef.current) {
				clearTimeout(viewportSettleTimerRef.current);
				viewportSettleTimerRef.current = null;
			}
		};

		const onMoveEnd = () => {
			const zoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
			setZoomLevel(zoom);
			syncUsOnlyBasemapCartography(map);

			// Defer the network-bound overlay fetch windows until the camera settles.
			scheduleSettledViewportFetch();
			// Local marker re-sampling stays immediate: it only reshuffles already
			// loaded markers to track the camera and is what prevents on-screen
			// flicker, so it must not wait for the settle debounce.
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
		map.on('movestart', onMoveStartCancelSettle);
		// Initial fill: run the chrome/CTA path, then force the overlay fetch
		// synchronously so first paint never waits out the settle debounce.
		onMoveEnd();
		runSettledViewportFetch();
		return () => {
			map.off('moveend', onMoveEnd);
			map.off('movestart', onMoveStartCancelSettle);
			if (viewportSettleTimerRef.current) {
				clearTimeout(viewportSettleTimerRef.current);
				viewportSettleTimerRef.current = null;
			}
			viewportSettleFirstPendingAtRef.current = null;
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
		isCoordsInLockedState,
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
					const zoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
					// Skip pan-only moveends: if the zoom hasn't changed since the
					// last reconcile, the camera is already at the correct pitch for
					// this zoom level. This prevents re-pitching after a drag-pan
					// (panning upward should never change the tilt).
					if (
						isDragPanningRef.current ||
						(lastReconciledPitchZoomRef.current != null &&
							Math.abs(lastReconciledPitchZoomRef.current - zoom) < 0.01)
					)
						return;
					lastReconciledPitchZoomRef.current = zoom;
					const target = computeStreetViewPitch(zoom);
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
				if (
					(originalEvent as Event & { [MAP_CUSTOM_INPUT_EVENT_KEY]?: boolean })[
						MAP_CUSTOM_INPUT_EVENT_KEY
					]
				)
					return;
				// Skip during drag-pan: a pure pan should never change the tilt.
				// This prevents the pitch ramp from firing when a pan-induced zoom
				// change (e.g., at the world bounds) emits a 'zoom' event.
				if (isDragPanningRef.current) return;
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

	useBasemapPrewarm({ map, isMapLoaded, isBackgroundPresentation });

	// Notify the parent as soon as the user starts interacting with the viewport.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isBackgroundPresentation) return;
		const onMoveStart = () => {
			clearEmptyMapPrompt();
			onViewportInteractionRef.current?.();
		};
		map.on('movestart', onMoveStart);
		return () => {
			map.off('movestart', onMoveStart);
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
				// The square Select tool can now be engaged by *holding Shift*
				// (hold-to-select on the dashboard search map + campaign map). Mapbox's
				// native box-zoom is also a Shift+drag gesture, so while selecting we
				// must disable it — otherwise a Shift+drag would draw our selection
				// rectangle AND trigger a box-zoom on release, snapping the camera.
				map.boxZoom.disable();
			} else {
				// Desktop re-passes the tuned inertia (a bare enable() resets it to
				// Mapbox defaults); mobile gets native inertia via a bare enable().
				enableDragPanFeel(map, !desktopInteractionTuningRef.current);
				// Restore native box-zoom once the select tool is no longer active.
				map.boxZoom.enable();
			}
		} catch {
			// Ignore (handlers may not be ready yet).
		}
	}, [map, isMapLoaded, isBackgroundPresentation, areaSelectionEnabled, isAreaSelecting]);

	useMapInputAffordances({ map, isMapLoaded, isBackgroundPresentation });

	// Keep the DESKTOP drag-pan inertia zoom-aware. The max flick speed
	// intentionally ramps up at high zoom so city/street-level drags travel farther
	// across the map, while the high deceleration/custom easing still gives the
	// crisp end snap. Mobile uses Mapbox's native (zoom-independent) inertia, so
	// this per-zoom refresh is a no-op there.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (!desktopInteractionTuningEnabled) return;
		const syncDragPanInertiaForZoom = () => {
			if (isBackgroundPresentation || areaSelectionEnabled || isAreaSelecting) return;
			try {
				if (!map.dragPan.isEnabled()) return;
				// Effect is desktop-gated above, so always the tuned feel here.
				enableDragPanFeel(map, false);
			} catch {
				// Non-fatal — handler may be unavailable during teardown/style churn.
			}
		};

		syncDragPanInertiaForZoom();
		map.on('zoomend', syncDragPanInertiaForZoom);
		return () => {
			try {
				map.off('zoomend', syncDragPanInertiaForZoom);
			} catch {
				// Ignore.
			}
		};
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		areaSelectionEnabled,
		isAreaSelecting,
		desktopInteractionTuningEnabled,
	]);

	// Drag-pan gesture tracking + zoom clamp. Two fixes live here:
	//
	// 1. Tilt change on pan: `isDragPanningRef` is read by the continuous pitch
	//    ramp (onZoomFrame) and the moveend reconcile to skip pitch writes while
	//    a drag-pan is active — panning upward should never change the tilt.
	//    This tracking runs on ALL devices (mobile street-view pitch depends on
	//    it), so `dragstart`/`dragend` are always registered.
	//
	// 2. Zoom-in at the poles: when dragging toward the world bounds (max
	//    latitude) at a closer zoom level, the camera can pick up an unintended
	//    zoom change. We clamp the zoom back to its drag-start value on every
	//    'zoom' event during the drag by writing map.transform.zoom directly
	//    (same private-API pattern the pitch ramp uses for tr.pitch). This
	//    avoids stop()/jumpTo, which would cancel the in-flight drag handler.
	//    `isRestoringDragZoomRef` breaks the feedback loop since writing tr.zoom
	//    fires another synchronous 'zoom' event. This clamp is DESKTOP-ONLY: on
	//    touch devices a two-finger pinch during a one-finger-started drag emits
	//    'zoom' with a `touchmove` originalEvent (not in the wheel/dblclick skip
	//    list), so the clamp would cancel legitimate mobile pinch-zoom. Mobile
	//    therefore skips the clamp entirely and keeps native gesture behavior.
	useEffect(() => {
		if (!map || !isMapLoaded || isBackgroundPresentation) return;

		const onDragStart = () => {
			isDragPanningRef.current = true;
			dragStartZoomRef.current = map.getZoom() ?? MAP_DEFAULT_ZOOM;
		};
		const onDragEnd = () => {
			isDragPanningRef.current = false;
			dragStartZoomRef.current = null;
		};
		const onZoomDuringDrag = (e: mapboxgl.MapboxEvent) => {
			// Desktop-only zoom clamp. Read through the ref so a device-class change
			// takes effect without re-subscribing the listener.
			if (!desktopInteractionTuningRef.current) return;
			if (!isDragPanningRef.current) return;
			if (isRestoringDragZoomRef.current) return;
			if (dragStartZoomRef.current == null) return;
			// Don't interfere with legitimate zoom gestures during a drag (e.g.,
			// scroll-wheel zoom while click-dragging on desktop, or double-click
			// zoom). Only clamp zoom changes that aren't from an explicit zoom
			// input — the unintended zoom-in when dragging toward the world bounds.
			const originalEvent = (e as { originalEvent?: Event }).originalEvent;
			if (originalEvent) {
				const type = originalEvent.type;
				if (type === 'wheel' || type === 'dblclick') return;
			}
			try {
				const tr = map.transform;
				if (!tr || typeof tr.zoom !== 'number') return;
				if (Math.abs(tr.zoom - dragStartZoomRef.current) > 0.01) {
					isRestoringDragZoomRef.current = true;
					tr.zoom = dragStartZoomRef.current;
					map.triggerRepaint();
					isRestoringDragZoomRef.current = false;
				}
			} catch {
				// Non-fatal — private-API fence.
			}
		};

		map.on('dragstart', onDragStart);
		map.on('dragend', onDragEnd);
		map.on('zoom', onZoomDuringDrag);
		return () => {
			map.off('dragstart', onDragStart);
			map.off('dragend', onDragEnd);
			map.off('zoom', onZoomDuringDrag);
			isDragPanningRef.current = false;
			dragStartZoomRef.current = null;
		};
	}, [map, isMapLoaded, isBackgroundPresentation]);

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
			setHasLockedStateOutline(false);
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
			setHasLockedStateOutline(false);
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
			setHasLockedStateOutline(false);
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
		setHasLockedStateOutline(true);
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
				// Long cinematic fits (e.g. the dashboard→map entry sweep) run right after the
				// scroll scrub, so ease in/out from rest to avoid a jarring fast start; short
				// interactive fits keep the snappier ease-out.
				...(dur > 1000 ? { easing: mapboxEaseInOutCubic } : {}),
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
					// Long cinematic fits (e.g. the dashboard→map entry sweep) run right after
					// the scroll scrub, so ease in/out from rest to avoid a jarring fast start;
					// short interactive fits keep the snappier ease-out.
					...(dur > 1000 ? { easing: mapboxEaseInOutCubic } : {}),
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
		const isCompactOverlayResult = compactOverlayVisibleIdSetRef.current.has(contact.id);
		return (
			isPrimaryResult ||
			isBookingExtraResult ||
			isAllContactsOverlayResult ||
			isCompactOverlayResult
		);
	};

	const clearCompactOverlayHoverForSelection = useCallback(
		(contactId: number) => {
			if (hoverClearTimeoutRef.current) {
				clearTimeout(hoverClearTimeoutRef.current);
				hoverClearTimeoutRef.current = null;
			}
			if (fadingTooltipTimeoutRef.current) {
				clearTimeout(fadingTooltipTimeoutRef.current);
				fadingTooltipTimeoutRef.current = null;
			}
			if (hoveredMarkerIdRef.current !== contactId && hoveredMarkerId !== contactId) {
				return;
			}
			hoveredMarkerIdRef.current = null;
			hoverSourceRef.current = null;
			setHoveredMarkerId(null);
			setFadingTooltipId(null);
			onMarkerHover?.(null);
		},
		[hoveredMarkerId, onMarkerHover]
	);

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
	// onto that element so the same native-or-latched wheel pipeline still applies.
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
		(
			contact: ContactWithName,
			domEvent?: MouseEvent | TouchEvent,
			options?: { allowLowZoom?: boolean; source?: 'map' | 'pill' }
		) => {
			clearEmptyMapPrompt();
			// Don't trigger tiny-dot hover interactions until sufficiently zoomed in.
			// Compact pills opt out because their DOM target is large/readable at wide zoom.
			if (!options?.allowLowZoom && zoomLevel < HOVER_INTERACTION_MIN_ZOOM) return;

			// Compact pills are real DOM nodes layered ABOVE the Mapbox canvas, so they
			// own their own enter/leave. Tag their hover as 'pill' (not 'map') so the
			// canvas-level teardown paths — the coalesced `mousemove` "no feature here"
			// branch and the canvas `mouseleave` handler, both gated on
			// `hoverSourceRef.current === 'map'` — never tear down a pill hover the
			// instant the cursor crosses off the canvas onto the pill.
			hoverSourceRef.current = options?.source ?? 'map';
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
		const nextId = externallyHoveredContactId ?? null;
		const compactExternalHoverAllowed =
			nextId != null &&
			isCompactOverlayActive &&
			compactOverlayVisibleIdSetRef.current.has(nextId);
		// Keep behavior consistent with map hover: don't show dot hover tooltips when too zoomed out.
		// Compact pills are large DOM labels, so panel-driven hover can still highlight them.
		if (zoomLevel < HOVER_INTERACTION_MIN_ZOOM && !compactExternalHoverAllowed) {
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

		// If the map (a marker) or a compact pill is actively hovering something,
		// don't override it from the panel.
		if (hoverSourceRef.current === 'map' || hoverSourceRef.current === 'pill') return;

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
			!allContactsOverlayVisibleIdSetRef.current.has(nextId) &&
			!compactOverlayVisibleIdSetRef.current.has(nextId)
		) {
			recomputeViewportDots(map);
		}
	}, [
		externallyHoveredContactId,
		map,
		recomputeViewportDots,
		zoomLevel,
		isCompactOverlayActive,
		compactOverlayPillEntries,
	]);

	// Calculate marker scale based on zoom level
	// At zoom 4 (zoomed out): scale ~3, at zoom 14 (zoomed in): scale ~11
	const markerScale = useMemo(() => {
		return getResultDotScaleForZoom(zoomLevel);
	}, [zoomLevel]);

	const { applyCuratedOrbState, applyBlobMorph } = useCuratedBlobOrb({
		applyBlobMorphRef,
		applyCuratedOrbStateRef,
		curatedBlobLngLatMultiPolygonRef,
		curatedBlobLngLatShapeMultiPolygonsRef,
		curatedBlobOrbTargetsRef,
		curatedOrbBloomEllipseRefs,
		curatedOrbBloomGradientRefs,
		curatedOrbClipPathRefs,
		curatedOrbEllipseRefs,
		curatedOrbGradientRefs,
		curatedOrbRef,
		interactiveFloorDeltaRef,
		lastBlobMorphTAppliedRef,
		mapRef,
		naturalBlobMorphSourceRef,
	});

	const { setRasterOpacityIfChanged, applyLightingOverlayOpacity, repaintSunTransitionCanvas } = useLightingAppliers({
		dayFarSideShadeCanvasRef,
		dayFarSideShadeCenterLngRef,
		dayFarSideShadeLightingRef,
		dayFarSideShadePhase,
		dayFarSideShadePhaseEndMs,
		dayFarSideShadePhaseStartMs,
		ensureMapboxSourcesAndLayers,
		interactiveFloorDeltaRef,
		isHotRef,
		isMapLoaded,
		lightingLayerVisibilityAppliedRef,
		lightingOverlayBurnGlowRef,
		lightingOverlayBurnWashRef,
		lightingOverlayDarkKeyRef,
		lightingOverlayGloomWashRef,
		lightingOverlayHotWashRef,
		lightingOverlayMoonRimRef,
		lightingOverlayNightDarkWashRef,
		lightingOverlayNightLowerLeftShadowRef,
		lightingOverlayNightMoonlightRef,
		lightingOverlayNightShadeRef,
		lightingOverlayNightVignetteRef,
		lightingOverlayShadowRef,
		lightingOverlaySunSpaceGlowRef,
		lightingOverlayWarmKeyRef,
		lightingRasterOpacityAppliedRef,
		map,
		mapRef,
		nightLightingRef,
		nightTRef,
		sunTransitionCanvasRef,
		sunTransitionPaintKeyRef,
		sunTransitionPhase,
		sunTransitionPhaseEndMs,
		sunTransitionPhaseStartMs,
		unsubscribeBurnTRef,
		weatherMoodConfigRef,
	});

	useCuratedBlobMorphBinding({
		applyBlobMorph,
		isMapLoaded,
		map,
	});

	useLightingDrivers({
		applyLightingOverlayOpacity,
		applyStateOverlayOpacity,
		isMapLoaded,
		map,
		nightLighting,
		nightT,
		nightTRef,
		presentation,
		repaintSunTransitionCanvas,
		stateOverlayModeRef,
		stateOverlayOpacityRef,
		unsubscribeBurnTRef,
		weatherMood,
		weatherMoodConfigRef,
	});

	const { getSelectedStateDisplayMultiPolygon, applySelectedStateGradientState } = useSelectedStateGradient({
		applySelectedStateGradientStateRef,
		interactiveFloorDeltaRef,
		isLoading,
		isLoadingRef,
		isMapLoaded,
		isStateLayerReady,
		lockedStateKey,
		lockedStateSelectionBboxRef,
		lockedStateSelectionKeyRef,
		lockedStateSelectionMultiPolygonRef,
		map,
		mapRef,
		presentation,
		presentationRef,
		selectedStateDisplayMultiPolygonRef,
		selectedStateGradientBloomEllipseRef,
		selectedStateGradientBloomRef,
		selectedStateGradientClipPathRef,
		selectedStateGradientEllipseRef,
		selectedStateGradientRef,
		selectedStateGradientSvgRef,
		selectedStateKeyRef,
		selectedStateLastMorphTAppliedRef,
		selectedStateMorphSourceRef,
		selectedStateOutlineSourceKeyRef,
	});

	const { applyWeatherMoodConfig } = useApplyWeatherMoodConfig({
		applyLightingOverlayOpacity,
		applyStateOverlayOpacity,
		interactiveFloorDeltaRef,
		isMapLoaded,
		map,
		mapRef,
		nightTRef,
		stateOverlayModeRef,
		stateOverlayOpacityRef,
		unsubscribeBurnTRef,
		weatherMoodConfigRef,
	});

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

		// Major-city basemap labels share the state-initials near-floor fade band,
		// so they shift with the same delta on large monitors. Keep the dashboard
		// background presentation label-free while preserving the interactive ramps.
		applyBasemapSettlementLabelPresentation(
			m,
			presentationRef.current !== 'background',
			delta
		);

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

	useWeatherMoodTransitions({
		appliedWeatherMoodRef,
		applyLightingOverlayOpacity,
		applyWeatherMoodConfig,
		effectiveTemperatureF,
		isHotRef,
		isMapLoaded,
		map,
		moodTransitionLastPaintMsRef,
		moodTransitionRafRef,
		moodTransitionRef,
		weatherMood,
		weatherMoodConfigRef,
	});

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
			const url = generateMapMarkerPinIconUrl(fillColor, strokeColor, baseColor);
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

		// Keep hover tooltip logic responsive even below the global hover-zoom floor
		// for contacts that are explicitly selected.
		const selectedContactIdSetForHover = new Set<number>(selectedContacts);

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
			return isPointInSelectionBounds(lng, lat) || stateSelectionHit;
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
					selectedContactObjectsById.get(id) ??
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
			// Radius placement owns the cursor (ghost pin + preview circle); skip the
			// normal hover detection so it doesn't fight the hidden native cursor or
			// surface marker/state hover affordances mid-placement.
			if (radiusPlacementActiveRef.current) {
				clearEmptyMapPrompt();
				clearEventHoverImmediate();
				return;
			}
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
					const allowLowZoomTooltipHover =
						zoom < HOVER_INTERACTION_MIN_ZOOM &&
						selectedContactIdSetForHover.has(markerId);
					if (
						(zoom >= HOVER_INTERACTION_MIN_ZOOM || allowLowZoomTooltipHover) &&
						(hoverSourceRef.current !== 'map' || hoveredMarkerIdRef.current !== markerId)
					) {
						handleMarkerMouseOver(
							contact,
							e.originalEvent as unknown as MouseEvent | TouchEvent,
							allowLowZoomTooltipHover ? { allowLowZoom: true } : undefined
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

			// While a search region is engaged (curated/"For You" blob OR a locked-state category
			// search) the empty-map prompt becomes a perimeter-only "Disengage search" affordance.
			// Inside the band hugging the region's outer edge → show it (this overrides the in-region
			// clear below). Anywhere else — the region interior, or the freely interactive ambient
			// overlay outside it — suppress the prompt entirely. The generic fallthrough
			// scheduleEmptyMapPrompt calls below are routed through this wrapper so they never
			// re-show the prompt in this mode.
			const scheduleAmbientEmptyMapPrompt = (point: { x: number; y: number }) => {
				if (isActiveSearchRegionEngaged) return;
				scheduleEmptyMapPrompt(point);
			};
			if (isActiveSearchRegionEngaged) {
				if (emptyMapPromptEnabled && isLngLatNearActiveBlobPerimeter(e.lngLat)) {
					clearStateHover();
					// The band is clickable (it disengages the search), so show the pointer
					// cursor to match the "Disengage search" prompt and make the affordance
					// discoverable instead of looking like inert map.
					setCursor('pointer');
					scheduleEmptyMapPrompt(e.point);
					return;
				}
				clearEmptyMapPrompt();
			}

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
				scheduleAmbientEmptyMapPrompt(e.point);
				return;
			}
			if (zoom > STATE_HOVER_HIGHLIGHT_MAX_ZOOM + 0.001) {
				clearStateHover();
				scheduleAmbientEmptyMapPrompt(e.point);
				return;
			}

			// If a marker or a compact pill is hovered, don't also hover-highlight the
			// state underneath.
			if (
				(hoverSourceRef.current === 'map' || hoverSourceRef.current === 'pill') &&
				hoveredMarkerIdRef.current != null
			) {
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
				scheduleAmbientEmptyMapPrompt(e.point);
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
			// Radius placement owns clicks (its own handler commits the center); never
			// let a placement click also disengage a search / select a marker or state.
			if (radiusPlacementActiveRef.current) return;

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

			// A click is only a "click" (not a pan) when the pointer barely moved between
			// mousedown and mouseup. Computed once here and reused by every disengage path
			// below so a drag along the blob edge can never accidentally disengage. The
			// pointer-down anchor is consumed (cleared) so a later stray click without a
			// fresh mousedown is treated as "not moved".
			const downClient = emptyMapPointerDownClientRef.current;
			emptyMapPointerDownClientRef.current = null;
			const upClient = getClientPointFromDomEvent(e.originalEvent);
			const movedAfterPointerDown = Boolean(
				downClient &&
				upClient &&
				(Math.abs(downClient.x - upClient.x) >= 6 ||
					Math.abs(downClient.y - upClient.y) >= 6)
			);

			// Active search region engaged (curated/"For You" blob OR a locked-state category
			// search): the "Disengage search" affordance is the band hugging the region outline
			// (CURATED_BLOB_DISENGAGE_PERIMETER_BAND_PX on BOTH sides of the edge — see
			// isLngLatNearActiveBlobPerimeter / the hover prompt above). This must run BEFORE the
			// in-region `isSearchAreaHit` early-return below: the inner half of that band overlaps the
			// region fill, so the old ordering swallowed those clicks as a "search interaction" and
			// the disengage never fired — the user saw the prompt but had to fish for the razor-thin
			// OUTSIDE sliver, which read as "buggy / needs many clicks." Markers and event stars are
			// already handled above, so they still win over disengage. Only a genuine (non-drag)
			// click disengages; pans and the radius-drag suppression window fall through unchanged.
			//
			// State-category refinement: the band can straddle a neighboring state's territory, so a
			// click that lands OUTSIDE the locked state and over a different selectable state should
			// start a NEW category search there (handled by the state-click block below) instead of
			// disengaging. Inner-band clicks (still inside the locked state) and clicks over non-state
			// area (e.g. water) keep disengaging.
			const perimeterDisengageBlockedByNeighborState =
				isStateCategorySearchEngaged &&
				stateInteractionsEnabled &&
				isStateLayerReady &&
				(map.getZoom() ?? MAP_DEFAULT_ZOOM) <= STATE_HOVER_HIGHLIGHT_MAX_ZOOM + 0.001 &&
				!isCoordsInLockedState({ lat: e.lngLat.lat, lng: e.lngLat.lng }) &&
				map.queryRenderedFeatures(e.point, {
					layers: [MAPBOX_LAYER_IDS.statesFillHit],
				}).length > 0;
			if (
				isActiveSearchRegionEngaged &&
				emptyMapPromptEnabled &&
				onEmptyMapClick &&
				!movedAfterPointerDown &&
				!shouldSuppressEmptyMapPrompt() &&
				isLngLatNearActiveBlobPerimeter(e.lngLat) &&
				!perimeterDisengageBlockedByNeighborState
			) {
				setSelectedMarker(null);
				setPinnedEventId(null);
				clearEmptyMapPrompt();
				clearStateHover();
				onEmptyMapClick();
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

			// Click on empty map clears any selected marker panel and dismisses a pinned
			// event popup.
			setSelectedMarker(null);
			setPinnedEventId(null);

			if (emptyMapPromptEnabled && isActiveSearchSelectionHit(e)) {
				clearEmptyMapPrompt();
				clearStateHover();
				return;
			}

			// Active search region engaged (curated blob OR locked-state category): disengage is
			// owned entirely by the perimeter-band check above (which already returned for a valid
			// disengage click). Reaching here while engaged means the click was NOT a disengage —
			// region-interior clicks already returned via isSearchAreaHit / isActiveSearchSelectionHit,
			// a different-state click already returned via the state-click block, and clicks far
			// outside (the freely interactive ambient overlay) or pans must NOT disengage. Stop here
			// so they never fall through to the generic empty-map disengage below.
			if (isActiveSearchRegionEngaged) {
				clearEmptyMapPrompt();
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
		selectedContactObjectsById,
		clearEmptyMapPrompt,
		scheduleEmptyMapPrompt,
		shouldSuppressEmptyMapPrompt,
		emptyMapPromptEnabled,
		onEmptyMapClick,
		isActiveSearchRegionEngaged,
		isStateCategorySearchEngaged,
		isCoordsInLockedState,
		isLngLatNearActiveBlobPerimeter,
		handleMarkerMouseOver,
		handleMarkerMouseOut,
		handleMarkerClick,
		eventCentersById,
		suppressEventPopups,
		setEventHover,
		clearEventHoverImmediate,
		scheduleEventHoverClose,
		updateSelectedTooltipHoverHiddenTarget,
		selectedContacts,
		setSelectedTooltipHoverHiddenTargetIfChanged,
	]);

	const {
		ensureMapImageFromUrl,
		imageNameFromUrl,
		getSelectedCategorizedContactMarkerAssets,
		getSelectedUncategorizedContactMarkerAssets,
		uncategorizedContactMarkerImageName,
		selectedUncategorizedContactMarkerImageName,
		uncategorizedContactMarkerHoverImageName,
		selectedUncategorizedContactMarkerUrl,
		selectedUncategorizedContactMarkerHoverImageName,
		selectedUncategorizedContactMarkerHoverUrl,
	} = useMapMarkerImages({
		isMapLoaded,
		map,
		mapRef,
	});

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
	// Defer the base-dot reveal wave until the cinematic search camera ease settles
	// (moveend) instead of popping the dots in mid-flight. `awaitingSettle` marks a
	// wave that is armed but waiting for the camera to stop; `moveEndArmed` guards
	// against stacking duplicate one-shot moveend listeners; the settle nonce
	// re-enters the wave effect once the camera stops.
	const baseDotsWaveAwaitingSettleRef = useRef<boolean>(false);
	const baseDotsWaveMoveEndArmedRef = useRef<boolean>(false);
	const [baseDotsWaveSettleNonce, setBaseDotsWaveSettleNonce] = useState(0);
	// Tracks the search-query key whose stale result layers have already been cleared.
	// On a brand-new dashboard search the previous result set's markers/pills are
	// dropped immediately (instead of lingering, recolored, while the new request
	// loads). Initialized to the current query so a deep-linked initial search is not
	// treated as "new" and wiped on mount.
	const newSearchStaleClearKeyRef = useRef<string>((searchQuery ?? '').trim());
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
	const { stopBaseDotsWaveAndRestoreSteadyRendering } = useBaseDotsWaveControl({
		baseDotsWaveCancelRef,
		campaignFootprintContactIdSet,
		campaignMarkerMode,
		isMapLoaded,
		map,
		visibleContactIdSetRef,
	});

	const { stopMarkerConstellationReveal, setMarkerConstellationLineOpacity, clearMarkerConstellation } = useConstellationControls({
		isMapLoaded,
		map,
		markerConstellationComposedSearchKeyRef,
		markerConstellationContactsByIdRef,
		markerConstellationDeferredMoveEndRef,
		markerConstellationEdgesRef,
		markerConstellationIsStatusModeRef,
		markerConstellationLastDataKeyRef,
		markerConstellationNodeIdsRef,
		markerConstellationNodesRef,
		markerConstellationRevealCancelRef,
		markerConstellationRevealDoneRef,
		markerConstellationUsesCategoryColorsRef,
		setMarkerConstellationCompositionNonce,
	});

	useLayoutEffect(() => {
		if (transientOverlayResetKeyRef.current === transientOverlayResetKey) return;
		transientOverlayResetKeyRef.current = transientOverlayResetKey;
		if (transientOverlayResetKey == null) return;

		if (hoverClearTimeoutRef.current) {
			clearTimeout(hoverClearTimeoutRef.current);
			hoverClearTimeoutRef.current = null;
		}
		if (fadingTooltipTimeoutRef.current) {
			clearTimeout(fadingTooltipTimeoutRef.current);
			fadingTooltipTimeoutRef.current = null;
		}
		if (eventHoverCloseTimerRef.current) {
			clearTimeout(eventHoverCloseTimerRef.current);
			eventHoverCloseTimerRef.current = null;
		}
		if (campaignHeatmapFadeRafRef.current != null) {
			cancelAnimationFrame(campaignHeatmapFadeRafRef.current);
			campaignHeatmapFadeRafRef.current = null;
		}
		if (selectedConstellationLineFadeRafRef.current != null) {
			cancelAnimationFrame(selectedConstellationLineFadeRafRef.current);
			selectedConstellationLineFadeRafRef.current = null;
		}
		if (baseDotsWaveCancelRef.current) {
			baseDotsWaveCancelRef.current();
			baseDotsWaveCancelRef.current = null;
		}

		setSelectedMarker(null);
		setHoveredMarkerId(null);
		setFadingTooltipId(null);
		setHoveredEventId(null);
		setPinnedEventId(null);
		setVisibleContacts([]);
		setBookingExtraVisibleContacts([]);
		setPromotionOverlayVisibleContacts([]);
		setAllContactsOverlayVisibleContacts([]);
		setSelectedTooltipHoverHiddenTargetIfChanged(null);
		setSelectedTooltipStackGroups([]);

		hoveredMarkerIdRef.current = null;
		hoverSourceRef.current = null;
		hoveredEventIdRef.current = null;
		isPointerOverEventPopupRef.current = false;
		selectedTooltipStackSignatureRef.current = '';
		selectedTooltipStackSelectionKeyRef.current = '';
		visibleContactIdSetRef.current = new Set();
		bookingExtraVisibleIdSetRef.current = new Set();
		allContactsOverlayVisibleIdSetRef.current = new Set();
		lastVisibleContactsKeyRef.current = '';
		lastBookingExtraVisibleContactsKeyRef.current = '';
		lastPromotionOverlayVisibleContactsKeyRef.current = '';
		lastAllContactsOverlayVisibleContactsKeyRef.current = '';
		baseDotsLastDataKeyRef.current = '';
		baseDotsPendingDataSearchKeyRef.current = null;
		baseDotsPendingDataSawLoadingRef.current = false;
		baseDotsWaveMetaRef.current = null;
		baseDotsWavePrevIsLoadingRef.current = false;
		baseDotsWavePendingSearchKeyRef.current = null;
		campaignHeatmapFadeByIdRef.current.clear();
		selectedConstellationLineOpacityRef.current = 0;
		selectedConstellationHadPathRef.current = false;
		selectedConstellationEdgesRef.current = [];
		selectedConstellationGraphKeyRef.current = '';
		radiusMarkerRef.current?.remove();
		radiusMarkerRef.current = null;
		if (radiusMarkerZoomHandlerRef.current && map) {
			try {
				map.off('zoom', radiusMarkerZoomHandlerRef.current);
			} catch {
				// Ignore style timing races.
			}
			radiusMarkerZoomHandlerRef.current = null;
		}
		isDraggingRadiusRef.current = false;
		radiusDragSuppressEmptyMapUntilRef.current = 0;
		// Tear down any in-progress radius placement ghost pin.
		radiusPlacementGhostElRef.current?.remove();
		radiusPlacementGhostElRef.current = null;
		radiusPlacementDownClientRef.current = null;

		onMarkerHover?.(null);
		clearMarkerConstellation();

		if (!map || !isMapLoaded) return;
		const empty = emptyFeatureCollection();
		const clearGeoJsonSources = [
			MAPBOX_SOURCE_IDS.markersBase,
			MAPBOX_SOURCE_IDS.markersSelected,
			MAPBOX_SOURCE_IDS.markersBookingPin,
			MAPBOX_SOURCE_IDS.markersPromotionDot,
			MAPBOX_SOURCE_IDS.markersPromotionPin,
			MAPBOX_SOURCE_IDS.markersAllOverlay,
			MAPBOX_SOURCE_IDS.markerConstellation,
			MAPBOX_SOURCE_IDS.markerConstellationSelected,
			MAPBOX_SOURCE_IDS.markerConstellationNodes,
			MAPBOX_SOURCE_IDS.campaignFootprintPoints,
			MAPBOX_SOURCE_IDS.campaignFootprintLines,
			MAPBOX_SOURCE_IDS.campaignFootprintNodes,
			MAPBOX_SOURCE_IDS.campaignHeatmap,
			MAPBOX_SOURCE_IDS.eventsGlow,
			MAPBOX_SOURCE_IDS.eventsRings,
			MAPBOX_SOURCE_IDS.eventsPulse,
			MAPBOX_SOURCE_IDS.eventsIcon,
			MAPBOX_SOURCE_IDS.ownedVenueGlow,
			MAPBOX_SOURCE_IDS.ownedVenueRings,
			MAPBOX_SOURCE_IDS.ownedVenuePulse,
			MAPBOX_SOURCE_IDS.ownedVenueIcon,
			MAPBOX_SOURCE_IDS.resultsOutline,
			MAPBOX_SOURCE_IDS.lockedOutline,
			MAPBOX_SOURCE_IDS.curatedBlob,
			MAPBOX_SOURCE_IDS.selectedAreaRect,
			MAPBOX_SOURCE_IDS.selectionRect,
			MAPBOX_SOURCE_IDS.radiusPreview,
		];

		try {
			for (const sourceId of clearGeoJsonSources) {
				const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
				source?.setData(empty);
			}
			map.removeFeatureState({ source: MAPBOX_SOURCE_IDS.markersBase });
			map.removeFeatureState({ source: MAPBOX_SOURCE_IDS.markersBookingPin });
			map.removeFeatureState({ source: MAPBOX_SOURCE_IDS.markersPromotionDot });
			map.removeFeatureState({ source: MAPBOX_SOURCE_IDS.markersPromotionPin });
			map.removeFeatureState({ source: MAPBOX_SOURCE_IDS.markersAllOverlay });
			map.removeFeatureState({ source: MAPBOX_SOURCE_IDS.markersSelected });
		} catch {
			// Ignore style timing races while the route handoff is in progress.
		}
	}, [
		clearMarkerConstellation,
		isMapLoaded,
		map,
		onMarkerHover,
		setSelectedTooltipHoverHiddenTargetIfChanged,
		transientOverlayResetKey,
	]);

	const { writeMarkerConstellationSourceData, startMarkerConstellationReveal } = useConstellationWriter({
		allContactsOverlayVisibleContacts,
		bookingExtraVisibleContacts,
		campaignMarkerMode,
		contactsWithCoords,
		getAllContactsOverlayContactCoords,
		getBookingExtraContactCoords,
		getCampaignStatusLineStyleForContacts,
		getCampaignStatusMarkerStyleForContact,
		getContactCoords,
		getDashboardDraftingStatusForContact,
		getPromotionOverlayContactCoords,
		isCoordsInLockedState,
		isMapLoaded,
		lockedStateKey,
		lockedStateSelectionKeyRef,
		map,
		markerConstellationContactsByIdRef,
		markerConstellationEdgesRef,
		markerConstellationIsStatusModeRef,
		markerConstellationLastDataKeyRef,
		markerConstellationNodesRef,
		markerConstellationRevealDoneRef,
		markerConstellationUsesCategoryColorsRef,
		promotionOverlayVisibleContacts,
		searchWhat,
		selectedConstellationEdgesRef,
		selectedConstellationGraphKeyRef,
		selectedConstellationHadPathRef,
		selectedConstellationLineFadeRafRef,
		selectedConstellationLineOpacityRef,
		selectedContacts,
		setMarkerConstellationLineOpacity,
		stopMarkerConstellationReveal,
	});

	// Drop the previous search's result layers the instant a NEW dashboard search
	// starts loading, so the old (scattered, recolored) markers and overview pills
	// don't linger over the new region while React Query serves the stale
	// `keepPreviousData` result set. The per-layer effects below intentionally
	// preserve their sources during `isLoading` (to avoid zoom flicker on
	// same-query refetches); this central reset is what distinguishes a brand-new
	// query from a refetch. The marker constellation already self-clears on a new
	// key, so it is deliberately not touched here.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const searchKey = (searchQuery ?? '').trim();
		const isRealSearch =
			searchEngaged && searchKey.length > 0 && !isBackgroundPresentation;
		if (!isRealSearch) {
			// Not a real dashboard search (e.g. the campaign contacts view): never wipe.
			newSearchStaleClearKeyRef.current = searchKey;
			return;
		}
		const isNewSearchKey = searchKey !== newSearchStaleClearKeyRef.current;
		if (!isNewSearchKey) return;
		if (!isLoading) {
			// Fresh data for this key has begun to land (or an instant cache hit) —
			// close the window so the populated layers are never wiped.
			newSearchStaleClearKeyRef.current = searchKey;
			return;
		}

		// New query + still loading (contacts are stale): clear the stale result
		// layers. Keep clearing across subsequent loading renders for this same key
		// (do NOT advance the ref until loading flips false) so a late stale
		// re-render can't repaint the old set.
		const emptySource = (sourceId: string) => {
			try {
				const layerSource = map.getSource(sourceId) as
					| mapboxgl.GeoJSONSource
					| undefined;
				layerSource?.setData({ type: 'FeatureCollection', features: [] } as any);
			} catch {
				// Ignore style-timing races.
			}
		};

		// Base result dots.
		if (baseDotsWaveCancelRef.current) {
			baseDotsWaveCancelRef.current();
			baseDotsWaveCancelRef.current = null;
		}
		baseDotsWaveMetaRef.current = null;
		baseDotsLastDataKeyRef.current = '';
		emptySource(MAPBOX_SOURCE_IDS.markersBase);

		// Selected-marker halo. Mirror the "nothing selected" hard-clear so the
		// rebuild isn't no-op'd by a stale build signature when the new results land.
		if (selectedMarkerFadeRafRef.current != null) {
			cancelAnimationFrame(selectedMarkerFadeRafRef.current);
			selectedMarkerFadeRafRef.current = null;
		}
		selectedMarkerFadeByIdRef.current.clear();
		selectedMarkerScaleByIdRef.current.clear();
		selectedMarkerFeatureByIdRef.current = new Map();
		selectedMarkerBuildSignatureRef.current = '';
		emptySource(MAPBOX_SOURCE_IDS.markersSelected);

		// Ambient gray / detail overlay dots.
		emptySource(MAPBOX_SOURCE_IDS.markersAllOverlay);

		// Promotion + booking pins.
		emptySource(MAPBOX_SOURCE_IDS.markersPromotionDot);
		emptySource(MAPBOX_SOURCE_IDS.markersPromotionPin);
		promotionDotIdsRef.current = new Set();
		promotionPinIdsRef.current = new Set();
		emptySource(MAPBOX_SOURCE_IDS.markersBookingPin);

		// Lightweight overview pills are positioned from the settled viewport, which
		// is still the previous (whole-US) view until the camera settles on the new
		// region. Reset it so the pills don't flash at stale positions; they
		// repopulate, freshly placed, on the next viewport settle after the fly.
		setCompactOverlaySettledViewport(null);
	}, [
		map,
		isMapLoaded,
		searchQuery,
		isLoading,
		searchEngaged,
		isBackgroundPresentation,
	]);

	useBaseDotsSource({
		baseDotsLastDataKeyRef,
		baseDotsLastSearchKeyRef,
		baseDotsPendingDataSawLoadingRef,
		baseDotsPendingDataSearchKeyRef,
		baseDotsPrevContactsPropLengthRef,
		baseDotsWaveCancelRef,
		baseDotsWaveMetaRef,
		baseDotsWavePendingSearchKeyRef,
		baseDotsWavePrevIsLoadingRef,
		contacts,
		contactsPropLengthRef,
		contactsWithCoords,
		disableDotWaveReveal,
		getCampaignStatusMarkerStyleForContact,
		getContactCoords,
		isBackgroundPresentation,
		isCompactOverlayActive,
		isCoordsInLockedState,
		isLoading,
		isMapLoaded,
		isStateLayerReady,
		lockedStateKey,
		lockedStateSelectionKeyRef,
		map,
		searchEngaged,
		searchQuery,
		searchWhat,
		selectedStateMorphSourceRef,
		stopBaseDotsWaveAndRestoreSteadyRendering,
		uncategorizedContactMarkerHoverImageName,
		uncategorizedContactMarkerImageName,
		visibleContacts,
	});

	useSelectedMarkerArtwork({
		allContactsOverlayVisibleContactsRef,
		bookingExtraVisibleContactsRef,
		campaignMarkerMode,
		compactOverlayPillEntries,
		contactsWithCoords,
		ensureMapImageFromUrl,
		getAllContactsOverlayContactCoords,
		getBookingExtraContactCoords,
		getContactCoords,
		getDashboardDraftingMarkerStyleForContact,
		getPromotionOverlayContactCoords,
		getSelectedCategorizedContactMarkerAssets,
		getSelectedUncategorizedContactMarkerAssets,
		isAmbientContactsEnabled,
		isLoading,
		isMapLoaded,
		isStateLayerReady,
		lockedStateKey,
		lockedStateSelectionKeyRef,
		map,
		promotionOverlayVisibleContactsRef,
		searchEngaged,
		searchWhat,
		selectedContactObjects,
		selectedContacts,
		selectedMarkerBuildSignatureRef,
		selectedMarkerFadeByIdRef,
		selectedMarkerFadeRafRef,
		selectedMarkerFeatureByIdRef,
		selectedMarkerScaleByIdRef,
		selectedStateMorphSourceRef,
		selectedUncategorizedContactMarkerHoverImageName,
		selectedUncategorizedContactMarkerHoverUrl,
		selectedUncategorizedContactMarkerImageName,
		selectedUncategorizedContactMarkerUrl,
	});

	useBaseDotsVisibilityFilter({
		baseDotsWaveCancelRef,
		campaignFootprintContactIdSet,
		isMapLoaded,
		map,
		visibleContacts,
	});

	useConstellationDimSync({
		curatedBlobProtectedMarkerIdsNonce,
		curatedBlobProtectedMarkerIdsRef,
		isMapLoaded,
		map,
		markerConstellationCompositionNonce,
		markerConstellationNodeIdsRef,
		visibleContacts,
	});

	useBaseDotsWaveReveal({
		baseDotsWaveAwaitingSettleRef,
		baseDotsWaveCancelRef,
		baseDotsWaveLastSearchKeyRef,
		baseDotsWaveMetaRef,
		baseDotsWaveMoveEndArmedRef,
		baseDotsWavePendingSearchKeyRef,
		baseDotsWavePrevIsLoadingRef,
		baseDotsWaveSettleNonce,
		campaignFootprintContactIdSet,
		disableDotWaveReveal,
		isBackgroundPresentation,
		isLoading,
		isMapLoaded,
		map,
		searchQuery,
		setBaseDotsWaveSettleNonce,
		visibleContactIdSetRef,
	});

	useConstellationComposer({
		campaignMarkerMode,
		categoryConstellationsEnabled,
		clearMarkerConstellation,
		contactsWithCoords,
		getCampaignStatusForContact,
		getContactCoords,
		isAmbientContactsEnabled,
		isBackgroundPresentation,
		isCompactOverlayActive,
		isCoordsInLockedState,
		isLoading,
		isMapLoaded,
		lockedStateKey,
		map,
		markerConstellationComposedSearchKeyRef,
		markerConstellationContactsByIdRef,
		markerConstellationDeferredMoveEndRef,
		markerConstellationEdgesRef,
		markerConstellationIdleNonce,
		markerConstellationIsStatusModeRef,
		markerConstellationLastDataKeyRef,
		markerConstellationLastSearchKeyRef,
		markerConstellationNodeIdsRef,
		markerConstellationNodesRef,
		markerConstellationRevealDoneRef,
		markerConstellationUsesCategoryColorsRef,
		searchEngaged,
		searchQuery,
		setMarkerConstellationCompositionNonce,
		setMarkerConstellationIdleNonce,
		setMarkerConstellationLineOpacity,
		startMarkerConstellationReveal,
		stopMarkerConstellationReveal,
		writeMarkerConstellationSourceData,
	});

	useOverlayMarkerSources({
		allContactsOverlayVisibleContacts,
		bookingExtraVisibleContacts,
		ensureMapImageFromUrl,
		getAllContactsOverlayContactCoords,
		getBookingExtraContactCoords,
		getMarkerPinUrl,
		getPromotionOverlayContactCoords,
		hoveredBookingExtraCategory,
		imageNameFromUrl,
		isAmbientContactsEnabled,
		isAnySearch,
		isCompactOverlayActive,
		isCoordsInLockedState,
		isLightweightDetailMarkerMode,
		isLoading,
		isMapLoaded,
		isRadiusSearchActive,
		isStateLayerReady,
		lockedStateKey,
		lockedStateSelectionKeyRef,
		map,
		promotionDotIdsRef,
		promotionOverlayVisibleContacts,
		promotionPinIdsRef,
		searchEngaged,
		selectedContacts,
		selectedStateMorphSourceRef,
		uncategorizedContactMarkerHoverImageName,
		uncategorizedContactMarkerImageName,
		visibleContacts,
	});

	// Give the DOM tooltip a real hover target around the SVG so moving from the
	// marker into the bubble does not cross a tiny Mapbox/DOM dead zone.
	const hoverTooltipHitSlopPx = useMemo(
		() => Math.max(14, markerScale * 2),
		[markerScale]
	);
	const tooltipMarkerGapPx = useMemo(() => Math.max(18, markerScale + 10), [markerScale]);
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
		() =>
			selectedContacts
				.slice()
				.sort((a, b) => a - b)
				.join(','),
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
			const grabViewScale = computeMapSelectGrabViewScale(viewportH, railTotalHeightPx);
			const sidePanelTop =
				(SELECTION_ACTIONS_MAP_VIEW_SIDE_PANEL_TOP_PX + sideShiftPx) / dashboardZoom;
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
					grabOriginTop - SELECTION_ACTIONS_SHOWING_ABOVE_GRAB_ORIGIN_PX * grabViewScale,
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
				const exactTooltipLeft = footprint
					? rect.left + footprint.left
					: fallbackTooltipLeft;
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
						(SELECTION_ACTIONS_ANCHOR_FULL_ZOOM - SELECTION_ACTIONS_DOCK_FULL_ZOOM),
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
	const hoverTooltipContactId = hoveredMarkerId ?? fadingTooltipId;
	const hoverTooltipEntry = useMemo(() => {
		if (hoverTooltipContactId == null) return null;
		// IMPORTANT: hovered markers may be present even when they aren't in the
		// current `visibleContacts` sample (e.g. selected-marker halos, zoom-budget
		// sampling). Resolve from the full contact maps so hover never blanks out.
		const base =
			contactsWithCoordsById.get(hoverTooltipContactId) ??
			visibleContactsById.get(hoverTooltipContactId) ??
			selectedContactObjectsById.get(hoverTooltipContactId);
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
		contactsWithCoordsById,
		visibleContactsById,
		selectedContactObjectsById,
		bookingExtraContactsById,
		promotionOverlayContactsById,
		allOverlayContactsById,
	]);

	const hoverTooltipCoords = useMemo(() => {
		if (!hoverTooltipEntry) return null;
		const c = hoverTooltipEntry.contact;
		switch (hoverTooltipEntry.kind) {
			case 'base':
				return getContactCoords(c) ?? getLatLngFromContact(c);
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
		if ((!onAddSelectionToFolder && !showSelectedContactTooltips) || isStreetCardMode)
			return [];

		// Resting (selected) labels intentionally omit the bottom title band; the
		// full hover tooltip includes it. This matches the live-site behavior where
		// the "little title box" only appears while hovering.
		const compactTooltipOptions = { showTitleBand: false };
		const entries: SelectedCompactTooltipEntry[] = [];
		const seenIds = new Set<number>();

		const resolveSelectedContact = (
			id: number
		): {
			kind: SelectedCompactTooltipSourceKind;
			contact: ContactWithName;
			coords: LatLngLiteral | null;
		} | null => {
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

			const compact = compactOverlayPillEntryById.get(id);
			if (compact) {
				return {
					kind: 'compact',
					contact: compact.contact,
					coords: compact.coords,
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
			kind: SelectedCompactTooltipSourceKind
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
				case 'compact':
					return (
						compactOverlayPillEntryById.get(contact.id)?.whatForMarker ??
						getCompactOverlayWhatForContact(contact, null)
					);
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

		for (
			let selectedIndex = 0;
			selectedIndex < selectedContacts.length;
			selectedIndex += 1
		) {
			const id = selectedContacts[selectedIndex];
			if (seenIds.has(id)) continue;
			seenIds.add(id);

			const resolved = resolveSelectedContact(id);
			if (!resolved || !resolved.coords) continue;

			const { contact, coords, kind } = resolved;
			const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
			const nameForTooltip = fullName || contact.name || '';
			const companyForTooltip = contact.company || '';
			const titleForTooltip = getContactTitleForTooltip(contact);
			const whatForMarker = getWhatForSelectedTooltip(contact, kind);
			const normalizedWhat = whatForMarker ? normalizeWhatKey(whatForMarker) : null;
			const dashboardDraftingTooltipFillColor =
				getDashboardDraftingTooltipFillColorForContact(contact.id);
			const tooltipFillColor =
				dashboardDraftingTooltipFillColor ?? getHoverTooltipFillColor(whatForMarker);
			const tooltipBodyFillColor =
				dashboardDraftingTooltipFillColor ?? getHoverTooltipBodyFillColor(whatForMarker);
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
				sourceKind: kind,
				whatForMarker,
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
		compactOverlayPillEntryById,
		getDashboardDraftingTooltipFillColorForContact,
		searchWhat,
	]);
	const selectedCompactTooltipEntryIdsKey = useMemo(
		() => selectedCompactTooltipEntries.map((entry) => entry.contact.id).join(','),
		[selectedCompactTooltipEntries]
	);
	const selectedTooltipWhatForMarkerById = useMemo(() => {
		const byId = new Map<number, string | null>();
		for (const entry of selectedCompactTooltipEntries) {
			byId.set(entry.contact.id, entry.whatForMarker);
		}
		return byId;
	}, [selectedCompactTooltipEntries]);
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
			const stackT = projectedEntries.length > 1 ? getSelectedTooltipStackT(zoom) : 0;
			const stackScale = lerp(1, SELECTED_TOOLTIP_STACK_MIN_SCALE, stackT);
			// Stack by local collision only. The previous zoomed-out "legacy" path
			// collapsed every selected tooltip into one deck as soon as the map was
			// wide enough, even when the selected labels were spread out across the
			// viewport. That made sparse selections look artificially dense (like
			// one pile in Illinois while nearby pills still had plenty of room). Let
			// the collision pass decide: isolated selections render individually;
			// only overlapping local components become stacks.
			const shouldUseLegacyStack = false;
			const collisionStackPlacements = buildSelectedTooltipStackPlacements(
				projectedEntries
			).map((placement) => ({
				...placement,
				opacity: 1,
				scale: stackScale,
			}));
			const stackPlacements = collisionStackPlacements;
			const collisionGroupedContactIds = new Set<number>();
			for (const group of collisionStackPlacements) {
				for (const contactId of group.contactIds)
					collisionGroupedContactIds.add(contactId);
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
				)}px, ${Math.round(placement?.y ?? entry.naturalY)}px)`;
				el.style.zIndex = String(HOVER_TOOLTIP_Z_INDEX - 1);
				el.style.opacity =
					isHiddenByTooltipHover ||
					hoveredMarkerId === entry.contact.id ||
					collisionGroupedContactIds.has(entry.contact.id) ||
					shouldUseLegacyStack
						? '0'
						: '1';
			}

			const placementById = new Map(
				stackPlacements.map((placement) => [placement.id, placement])
			);
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
				const isHiddenByStackHover =
					hoveredMarkerId != null && placement.contactIds.includes(hoveredMarkerId);
				el.style.opacity =
					isHiddenByStackHover ||
					(selectedTooltipHoverHiddenTarget?.type === 'stack' &&
						selectedTooltipHoverHiddenTarget.id === id)
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
				if (collisionGroupedContactIds.has(entry.contact.id) || shouldUseLegacyStack) {
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
		const titleForTooltip = getContactTitleForTooltip(contact);
		const dashboardDraftingTooltipFillColor =
			getDashboardDraftingTooltipFillColorForContact(contact.id);
		const selectedWhatForMarker =
			selectedTooltipWhatForMarkerById.get(contact.id) ?? null;

		if (kind === 'all') {
			const ambientWhatForMarker = getAmbientContactWhatFromTitle(contact.title);
			const whatForMarker = selectedWhatForMarker ?? ambientWhatForMarker;
			if (whatForMarker) {
				const tooltipFillColor =
					dashboardDraftingTooltipFillColor ?? getHoverTooltipFillColor(whatForMarker);
				const tooltipBodyFillColor =
					dashboardDraftingTooltipFillColor ??
					getHoverTooltipBodyFillColor(whatForMarker);
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

			const tooltipFillColor =
				dashboardDraftingTooltipFillColor ?? PEOPLE_TOOLTIP_FILL_COLOR;
			const tooltipBodyFillColor =
				dashboardDraftingTooltipFillColor ?? PEOPLE_TOOLTIP_BODY_FILL_COLOR;
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
					tooltipFillColor,
					whatForMarker,
					tooltipBodyFillColor
				),
				width,
				height,
				anchorY,
			};
		}

		const resolvedWhatForMarker =
			kind === 'base'
				? (contact.curatedCategory ?? searchWhat ?? null)
				: kind === 'booking'
					? (getBookingTitlePrefixFromContactTitle(contact.title) ?? null)
					: (getPromotionOverlayWhatFromContactTitle(contact.title) ?? null);
		const whatForMarker = selectedWhatForMarker ?? resolvedWhatForMarker;

		// Even if the marker dot is "washed out" outside the locked/selected state, keep the hover tooltip
		// using the base category color so it consistently communicates the search intent.
		const baseTooltipFillColor =
			dashboardDraftingTooltipFillColor ?? getHoverTooltipFillColor(whatForMarker);
		const baseTooltipBodyFillColor =
			dashboardDraftingTooltipFillColor ?? getHoverTooltipBodyFillColor(whatForMarker);

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
	}, [
		hoverTooltipEntry,
		searchWhat,
		getDashboardDraftingTooltipFillColorForContact,
		selectedTooltipWhatForMarkerById,
	]);

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
			<SelectedStateGradientSvg
				selectedStateGradientSvgRef={selectedStateGradientSvgRef}
				selectedStateGradientRef={selectedStateGradientRef}
				selectedStateGradientBloomRef={selectedStateGradientBloomRef}
				selectedStateGradientClipPathRef={selectedStateGradientClipPathRef}
				selectedStateGradientBloomEllipseRef={selectedStateGradientBloomEllipseRef}
				selectedStateGradientEllipseRef={selectedStateGradientEllipseRef}
				selectedStateGradientIds={selectedStateGradientIds}
			/>
			<CuratedOrbSvg
				curatedOrbRef={curatedOrbRef}
				curatedOrbGradientRefs={curatedOrbGradientRefs}
				curatedOrbBloomGradientRefs={curatedOrbBloomGradientRefs}
				curatedOrbClipPathRefs={curatedOrbClipPathRefs}
				curatedOrbBloomEllipseRefs={curatedOrbBloomEllipseRefs}
				curatedOrbEllipseRefs={curatedOrbEllipseRefs}
				curatedOrbSlotIds={curatedOrbSlotIds}
			/>
			<MapLightingOverlays
				lightingOverlayWarmKeyRef={lightingOverlayWarmKeyRef}
				lightingOverlayDarkKeyRef={lightingOverlayDarkKeyRef}
				lightingOverlayShadowRef={lightingOverlayShadowRef}
				lightingOverlaySunSpaceGlowRef={lightingOverlaySunSpaceGlowRef}
				lightingOverlayHotWashRef={lightingOverlayHotWashRef}
				lightingOverlayNightDarkWashRef={lightingOverlayNightDarkWashRef}
				lightingOverlayNightLowerLeftShadowRef={lightingOverlayNightLowerLeftShadowRef}
				lightingOverlayNightMoonlightRef={lightingOverlayNightMoonlightRef}
				lightingOverlayNightShadeRef={lightingOverlayNightShadeRef}
				lightingOverlayMoonRimRef={lightingOverlayMoonRimRef}
				lightingOverlayGloomWashRef={lightingOverlayGloomWashRef}
				lightingOverlayNightVignetteRef={lightingOverlayNightVignetteRef}
				lightingOverlayBurnWashRef={lightingOverlayBurnWashRef}
				lightingOverlayBurnGlowRef={lightingOverlayBurnGlowRef}
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
												group.colors[depth % group.colors.length] ?? group.bodyFillColor,
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

			{/* Lightweight Airbnb-style compact suggestion pills. These are intentionally
			    HTML (not Mapbox features): only ~10-15 nodes, exact pill styling, and
			    map-move repositioning is handled imperatively via refs. */}
			{!isLoading &&
				isCompactOverlayActive &&
				compactOverlayPillEntries.length > 0 &&
				compactOverlayPillEntries.map((entry) => {
					// Once a lightweight pill is selected, hand it off to the original
					// selected-marker chrome (green tooltip + circle halo) instead of
					// keeping the compact white label visible underneath it.
					if (entry.isSelected) return null;

					const isHovered = hoveredMarkerId === entry.contact.id;
					const rawIconContent = entry.iconInnerFill
						? recolorCompactOverlayInnerFill(entry.iconSpec.content, entry.iconInnerFill)
						: entry.iconSpec.content;
					const iconMarkup = prefixCompactOverlayInlineSvgIds(
						normalizeInlineSvgMarkupForXml(rawIconContent),
						`compact-pill-${entry.contact.id}`
					);
					return (
						<div
							key={entry.contact.id}
							ref={(el) => registerCompactOverlayPillEl(entry.contact.id, el)}
							style={{
								position: 'absolute',
								left: 0,
								top: 0,
								width: `${entry.width}px`,
								height: `${LIGHTWEIGHT_COMPACT_OVERLAY_HEIGHT_PX}px`,
								transform: `translate3d(${entry.initialX}px, ${entry.initialY}px, 0)`,
								// opacity + pointerEvents are owned imperatively by the
								// updatePositions layout effect (visibility/back-face guard),
								// so they are intentionally NOT set here — otherwise a React
								// re-render would re-assert pointerEvents and resurrect a
								// hidden back-face pill as an invisible-but-clickable ghost.
								zIndex: isHovered ? HOVER_TOOLTIP_Z_INDEX + 2 : HOVER_TOOLTIP_Z_INDEX - 4,
								// Hard cut at the limb/edge: opacity flips instantly (no fade)
								// so a pill rotating to the back never lingers as a ghost.
								transition: 'none',
							}}
						>
							<button
								type="button"
								aria-label={entry.label}
								onMouseEnter={(event) =>
									handleMarkerMouseOver(entry.contact, event.nativeEvent, {
										allowLowZoom: true,
										source: 'pill',
									})
								}
								onMouseLeave={() => handleMarkerMouseOut(entry.contact.id)}
								onFocus={() =>
									handleMarkerMouseOver(entry.contact, undefined, {
										allowLowZoom: true,
										source: 'pill',
									})
								}
								onBlur={() => handleMarkerMouseOut(entry.contact.id)}
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									clearCompactOverlayHoverForSelection(entry.contact.id);
									handleMarkerClick(entry.contact);
								}}
								onWheel={forwardWheelToMap}
								style={{
									width: '100%',
									height: '100%',
									border: 'none',
									padding: '0 7px 0 5px',
									margin: 0,
									display: 'flex',
									alignItems: 'center',
									gap: '4px',
									borderRadius: '28.8px',
									background: '#FFFFFF',
									boxShadow: entry.isSelected
										? '0 0 0 1.4px #258530, 0 5px 14px -4px rgba(0, 0, 0, 0.25)'
										: isHovered
											? '0 9px 22px -4px rgba(0, 0, 0, 0.32)'
											: '0 5px 14px -4px rgba(0, 0, 0, 0.25)',
									cursor: 'pointer',
									// Grow noticeably on hover so the pill "pops" toward the cursor.
									transform: isHovered ? 'scale(1.12)' : 'scale(1)',
									transformOrigin: 'center center',
									transition: 'transform 130ms ease-out, box-shadow 130ms ease-out',
									fontFamily: 'Inter, Arial, sans-serif',
									fontSize: '12.975px',
									fontWeight: 500,
									lineHeight: '17.301px',
									color: '#000000',
									overflow: 'hidden',
								}}
							>
								<svg
									width="14"
									height="14"
									viewBox={entry.iconSpec.viewBox}
									preserveAspectRatio="xMidYMid meet"
									aria-hidden="true"
									focusable="false"
									style={{ flex: '0 0 auto', display: 'block' }}
									dangerouslySetInnerHTML={{ __html: iconMarkup }}
								/>
								<span
									ref={applyCompactPillLabelFade}
									style={{
										display: 'block',
										minWidth: 0,
										overflow: 'hidden',
										whiteSpace: 'nowrap',
									}}
								>
									{entry.label}
								</span>
							</button>
						</div>
					);
				})}

			{/* Selected compact SVG tooltips: persistent labels for the dashboard
			    search map. These use the same top-card + bottom title-band palette as
			    the active hover tooltip, so selected labels match the map tooltip
			    styling exactly. */}
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
								(entry.sourceKind !== 'compact' &&
									hoveredMarkerId === entry.contact.id) ||
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
