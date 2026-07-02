import type { MutableRefObject } from 'react';
import mapboxgl from 'mapbox-gl';
import type { RuntimeMoodVisualConfig } from './types';
import { applyNightLandPalette, ensureWorldLandFill, getFirstBasemapSettlementLabelLayerId } from './basemap';
import { buildCloudsOpacityExpr } from './clouds';
import { ALL_CONTACTS_DOT_GLOW_OPACITY, CAMPAIGN_FOOTPRINT_COLOR, CAMPAIGN_FOOTPRINT_GLOW_OPACITY, CAMPAIGN_FOOTPRINT_LINE_COLOR, CAMPAIGN_FOOTPRINT_LINE_CORE_COLOR, CAMPAIGN_FOOTPRINT_LINE_CORE_OPACITY, CAMPAIGN_FOOTPRINT_LINE_GLOW_OPACITY, CAMPAIGN_FOOTPRINT_NODE_GLOW_OPACITY, CAMPAIGN_FOOTPRINT_REPLACE_MARKER_MIN_ZOOM, CAMPAIGN_FOOTPRINT_SPARK_OPACITY, CAMPAIGN_HEATMAP_GLOW_BLUR, CAMPAIGN_HEATMAP_GLOW_OPACITY_MAX, CLOUDS_CANVAS_COORDINATES, CLOUDS_TILES_MAX_ZOOM, CLOUDS_TILES_URL_TEMPLATE, CURATED_DOT_FADE_END_ZOOM, LIGHTNING_CANVAS_COORDINATES, LIGHTNING_CANVAS_HEIGHT_PX, LIGHTNING_CANVAS_WIDTH_PX, LIGHTNING_LAYER_OPACITY, MAPBOX_LAYER_IDS, MAPBOX_SOURCE_IDS, MAP_DEFAULT_ZOOM, MAP_MIN_ZOOM, MARKER_CONSTELLATION_HALO_COLOR, MARKER_CONSTELLATION_LINE_COLOR, MARKER_CONSTELLATION_NODE_GLOW_OPACITY, MARKER_CONSTELLATION_NODE_OPACITY, MARKER_CONSTELLATION_SELECTED_CORE_OPACITY, MARKER_CONSTELLATION_SELECTED_GLOW_OPACITY, MARKER_CONSTELLATION_SELECTED_HALO_COLOR, MARKER_CONSTELLATION_SELECTED_LINE_COLOR, MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX, RESULT_DOT_GLOW_BLUR, RESULT_DOT_GLOW_COLOR, RESULT_DOT_GLOW_OPACITY, RESULT_DOT_GLOW_RADIUS_MAX_PX, RESULT_DOT_GLOW_RADIUS_MIN_PX, RESULT_DOT_SCALE_MAX, RESULT_DOT_SCALE_MIN, RESULT_DOT_TRANSPARENT_STROKE_COLOR, RESULT_DOT_ZOOM_MAX, RESULT_DOT_ZOOM_MIN, SNOW_CANVAS_SIZE_PX, STATE_DIVIDER_COLOR, STATE_DIVIDER_LINES_MAX_ZOOM, STATE_HIGHLIGHT_COLOR, STATE_HIGHLIGHT_OPACITY, STATE_LABEL_COLOR, STATE_LABEL_FULL_NAME_ZOOM, STREET_VIEW_BUILDINGS_MIN_ZOOM, STREET_VIEW_BUILDINGS_RISE_FULL_ZOOM, STREET_VIEW_BUILDING_COLOR, STREET_VIEW_BUILDING_OPACITY, buildCampaignHeatmapZoomFadedOpacity, campaignFootprintGlowRadiusExpr, campaignFootprintLineCoreWidthExpr, campaignFootprintLineGlowWidthExpr, campaignFootprintNodeGlowRadiusExpr, campaignFootprintSparkSizeExpr, campaignHeatmapGlowRadiusExpr } from './constants';
import { buildLightningOpacityExpr } from './lightning';
import { MARKER_HOVER_FEATURE_STATE_EXPR, MARKER_HOVER_RADIUS_SCALE, SELECTED_MARKER_SCALE_MULTIPLIER, getCategorizedDotGlowZoomFadedOpacity, getCategorizedDotZoomFadedOpacity, getMarkerConstellationNodeZoomFadedOpacity, getMarkerHoverFillColorExpr, getMarkerHoverOpacityExpr, getNormalMarkerFadeOpacityExpr, getSelectedMarkerConstellationZoomFadedOpacity, getSelectedMarkerHoverIconOpacityExpr, getSelectedMarkerIconOpacityExpr, getSelectedStateOrbZoomFadedOpacity } from './mapExpressions';
import { FEATURE_FILL_OPACITY_FACTOR, FEATURE_STROKE_OPACITY_FACTOR, SELECTED_STATUS_DOT_FILL_COLOR, SELECTED_STATUS_DOT_RADIUS_SCALE, SELECTED_STATUS_DOT_STROKE_COLOR, SELECTED_STATUS_DOT_STROKE_WIDTH, VENUE_ICON_SIZE_SCALE_EXPR, withFeatureFillOpacity, withFeatureOpacityFactor, withFeatureStrokeOpacity } from './markerStatusStyles';
import { computeMoodVisualNightT } from './moodConfig';
import { CANVAS_PERF_MODE } from './perfFlags';
import { CAMPAIGN_FOOTPRINT_SPARK_ICON_IMAGE_NAME, EVENT_STAR_ICON_IMAGE_NAME, OWNED_VENUE_HOME_ICON_IMAGE_NAME } from './radarOverlays';
import { buildSnowOpacityExpr } from './snow';
import { applyStateOverlayNightColors, buildLockedStateOutlineWidthExpr, buildStateDividerLineOpacityExpr, buildStateDividerLineWidthExpr, buildStateInteractiveBorderColorExpr, buildStateInteractiveBorderOpacityExpr, buildStateInteractiveBorderWidthExpr } from './stateOverlayStyle';
import { createSunTransitionCanvas } from './sunTransition';
import { MAP_MARKER_PIN_CIRCLE_CENTER_X, MAP_MARKER_PIN_CIRCLE_CENTER_Y, MAP_MARKER_PIN_CIRCLE_DIAMETER } from '@/components/atoms/_svg/MapMarkerPinIcon';
import { SELECTED_CONTACT_MARKER_CENTER_OUTER_DIAMETER, SELECTED_CONTACT_MARKER_CENTER_X, SELECTED_CONTACT_MARKER_CENTER_Y } from '@/components/atoms/_svg/SelectedContactMarkerIcon';

export interface EnsureMapboxSourcesAndLayersDeps {
	cloudsCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
	dayFarSideShadeCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
	interactiveFloorDeltaRef: MutableRefObject<number>;
	lastParityAppliedFloorDeltaRef: MutableRefObject<number>;
	lightingLayerVisibilityAppliedRef: MutableRefObject<Record<string, string>>;
	lightingRasterOpacityAppliedRef: MutableRefObject<Record<string, number>>;
	lightningCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
	lightningCanvasCtxRef: MutableRefObject<CanvasRenderingContext2D | null>;
	nightTRef: MutableRefObject<number>;
	snowCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
	snowCanvasCtxRef: MutableRefObject<CanvasRenderingContext2D | null>;
	sunTransitionCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
	weatherMoodConfigRef: MutableRefObject<RuntimeMoodVisualConfig>;
}

// Lightning/snow pipelines (1024² canvas + GPU-uploaded canvas source +
// raster layer) are LAZY: they exist only once a mood has actually needed
// them, so calm sessions never pay their ~16MB. Both helpers are idempotent
// (cheap getSource/getLayer checks) and are called from (a) the canonical
// layer positions in ensureMapboxSourcesAndLayersImpl — which resurrects them
// after style reloads once the canvas has latched — and (b) the clouds-drift
// ensureWeatherAssetsForNeeds at mood-fade start, while layer opacity is
// still ≈0 (the same guarantee the mood-gated stamp assets rely on).
export interface EnsureLightningSourceAndLayerDeps {
	lightningCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
	lightningCanvasCtxRef: MutableRefObject<CanvasRenderingContext2D | null>;
	weatherMoodConfigRef: MutableRefObject<RuntimeMoodVisualConfig>;
}

export const ensureLightningSourceAndLayer = (
	mapInstance: mapboxgl.Map,
	deps: EnsureLightningSourceAndLayerDeps
): void => {
	const { lightningCanvasRef, lightningCanvasCtxRef, weatherMoodConfigRef } = deps;
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
	const lightningCanvas = lightningCanvasRef.current;
	if (!lightningCanvas) return;
	if (!mapInstance.getSource(MAPBOX_SOURCE_IDS.lightning)) {
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
			if (CANVAS_PERF_MODE) lightningSrc?.pause?.();
		} catch {
			// Non-fatal; storm mood simply renders without the dedicated lightning layer.
		}
	}
	if (
		mapInstance.getSource(MAPBOX_SOURCE_IDS.lightning) &&
		!mapInstance.getLayer(MAPBOX_LAYER_IDS.lightning)
	) {
		const cfg = weatherMoodConfigRef.current;
		const layer = {
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
		} as any;
		// Canonical position: directly before the sun-transition catchlight. At
		// boot that layer does not exist yet (lightning is appended and the
		// catchlight lands right after it — identical order); on a mid-session
		// lazy add it does exist, so the layer slots into the exact boot
		// position instead of on top of pins.
		if (mapInstance.getLayer(MAPBOX_LAYER_IDS.sunTransitionCloudCatchlight)) {
			mapInstance.addLayer(layer, MAPBOX_LAYER_IDS.sunTransitionCloudCatchlight);
		} else {
			mapInstance.addLayer(layer);
		}
	}
};

export interface EnsureSnowSourceAndLayerDeps {
	snowCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
	snowCanvasCtxRef: MutableRefObject<CanvasRenderingContext2D | null>;
	weatherMoodConfigRef: MutableRefObject<RuntimeMoodVisualConfig>;
}

export const ensureSnowSourceAndLayer = (
	mapInstance: mapboxgl.Map,
	deps: EnsureSnowSourceAndLayerDeps
): void => {
	const { snowCanvasRef, snowCanvasCtxRef, weatherMoodConfigRef } = deps;
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
	const snowCanvas = snowCanvasRef.current;
	if (!snowCanvas) return;
	if (!mapInstance.getSource(MAPBOX_SOURCE_IDS.snow)) {
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
			if (CANVAS_PERF_MODE) snowSrc?.pause?.();
		} catch {
			// Non-fatal; snowy mood simply renders without the particle layer.
		}
	}
	if (
		mapInstance.getSource(MAPBOX_SOURCE_IDS.snow) &&
		!mapInstance.getLayer(MAPBOX_LAYER_IDS.snow)
	) {
		const cfg = weatherMoodConfigRef.current;
		const layer = {
			id: MAPBOX_LAYER_IDS.snow,
			type: 'raster',
			source: MAPBOX_SOURCE_IDS.snow,
			paint: {
				'raster-opacity': buildSnowOpacityExpr(cfg.snowOpacity),
				'raster-fade-duration': 0,
				'raster-resampling': 'linear',
			},
		} as any;
		// Canonical position: directly beneath the cloud deck (flakes read as
		// suspended below it). At boot the clouds layer is added right after
		// this — identical order; on a mid-session lazy add it exists.
		if (mapInstance.getLayer(MAPBOX_LAYER_IDS.clouds)) {
			mapInstance.addLayer(layer, MAPBOX_LAYER_IDS.clouds);
		} else {
			mapInstance.addLayer(layer);
		}
	}
};

// The single source+layer registration pass for the whole map: registers every
// GeoJSON/canvas source and all overlay layers (idempotent; runs on style.load
// and load). Moved verbatim from the ensureMapboxSourcesAndLayers useCallback
// in SearchResultsMap.tsx; the shell keeps a deps-[] useCallback wrapper so the
// construction effect's identity contract is untouched.
export const ensureMapboxSourcesAndLayersImpl = (
	mapInstance: mapboxgl.Map,
	deps: EnsureMapboxSourcesAndLayersDeps
): void => {
	const {
		cloudsCanvasRef,
		dayFarSideShadeCanvasRef,
		interactiveFloorDeltaRef,
		lastParityAppliedFloorDeltaRef,
		lightingLayerVisibilityAppliedRef,
		lightingRasterOpacityAppliedRef,
		lightningCanvasRef,
		lightningCanvasCtxRef,
		nightTRef,
		snowCanvasRef,
		snowCanvasCtxRef,
		sunTransitionCanvasRef,
		weatherMoodConfigRef,
	} = deps;
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

		// geojson-vt (inside the map's workers) slices every GeoJSON source to
		// maxzoom 18 by default and caches every generated tile for the source's
		// lifetime — deep-zoom panning accumulates worker heap for the whole
		// session (measured: v8/workers was the single largest renderer pool).
		// Cap tiling depth per source class; rendering past the cap reuses the
		// deepest tile via Mapbox overzoom, so nothing disappears.
		//
		// Caps are set by the WORST-CASE displacement of overzoomed geometry
		// (geojson-vt rounds vertices to the 8192-unit tile grid, i.e.
		// 0.03125px × 2^(zoom − maxzoom) on screen):
		// - Points at 16 → ≤0.125px at z18, 2px at the z22 hard max. Pins must
		//   track their DOM-anchored tooltips/cards (which project RAW coords),
		//   so 12 was NOT acceptable (~2px drift at z18). Point tiles are tiny;
		//   16 still eliminates the z17-22 slicing depth.
		// - Shapes at 14 → ≤0.5px at z18 for the decorative rings/outlines.
		const GEOJSON_POINT_SOURCE_MAXZOOM = 16;
		const GEOJSON_SHAPE_SOURCE_MAXZOOM = 14;

		const ensureSource = (id: string, maxzoom: number) => {
			if (mapInstance.getSource(id)) return;
			mapInstance.addSource(id, { type: 'geojson', data: emptyFc, maxzoom });
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
					if (CANVAS_PERF_MODE) cloudsSrc?.pause?.();
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

		// Lightning/snow sources are NOT added here unconditionally — their
		// canvas+source+layer pipelines are lazy (see ensureLightningSourceAndLayer
		// / ensureSnowSourceAndLayer above), created at their canonical layer
		// positions further down only when a mood has latched them or needs them.

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
					if (CANVAS_PERF_MODE) shadeSrc?.pause?.();
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
					if (CANVAS_PERF_MODE) sunSrc?.pause?.();
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
				// Caps the worker-side geojson-vt tree for the largest static polygon
				// payload on the map (deep-zoom slicing of 304 detailed state polygons).
				// 14, not lower: statesBordersInteractive is a VISIBLE line layer with
				// no layer maxzoom (0.7 opacity from z14 up), and overzoom quantization
				// is 0.03125px × 2^(zoom − maxzoom) — ≤0.5px at z18 with this cap.
				maxzoom: 14,
			});
		}
		ensureSource(MAPBOX_SOURCE_IDS.resultsOutline, GEOJSON_SHAPE_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.lockedOutline, GEOJSON_SHAPE_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.curatedBlob, GEOJSON_SHAPE_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.markerConstellation, GEOJSON_SHAPE_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.markerConstellationSelected, GEOJSON_SHAPE_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.markerConstellationNodes, GEOJSON_POINT_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.campaignFootprintPoints, GEOJSON_POINT_SOURCE_MAXZOOM);
		if (!mapInstance.getSource(MAPBOX_SOURCE_IDS.campaignFootprintLines)) {
			mapInstance.addSource(MAPBOX_SOURCE_IDS.campaignFootprintLines, {
				type: 'geojson',
				data: emptyFc,
				lineMetrics: true,
			});
		}
		ensureSource(MAPBOX_SOURCE_IDS.campaignFootprintNodes, GEOJSON_POINT_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.selectedAreaRect, GEOJSON_SHAPE_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.selectionRect, GEOJSON_SHAPE_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.radiusPreview, GEOJSON_SHAPE_SOURCE_MAXZOOM);

		// State label centroids (one point per state — avoids duplicate labels on MultiPolygon states)
		ensureSource(MAPBOX_SOURCE_IDS.stateLabels, GEOJSON_POINT_SOURCE_MAXZOOM);

		// Marker sources (all are point FeatureCollections keyed by contact.id)
		ensureSource(MAPBOX_SOURCE_IDS.markersAllOverlay, GEOJSON_POINT_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.markersPromotionPin, GEOJSON_POINT_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.markersBookingPin, GEOJSON_POINT_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.markersPromotionDot, GEOJSON_POINT_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.markersBase, GEOJSON_POINT_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.markersSelected, GEOJSON_POINT_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.campaignHeatmap, GEOJSON_POINT_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.ownedVenueGlow, GEOJSON_SHAPE_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.ownedVenueRings, GEOJSON_SHAPE_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.ownedVenuePulse, GEOJSON_SHAPE_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.ownedVenueIcon, GEOJSON_POINT_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.eventsGlow, GEOJSON_SHAPE_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.eventsRings, GEOJSON_SHAPE_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.eventsPulse, GEOJSON_SHAPE_SOURCE_MAXZOOM);
		ensureSource(MAPBOX_SOURCE_IDS.eventsIcon, GEOJSON_POINT_SOURCE_MAXZOOM);

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

		// Snow pipeline: resurrect after style reloads once a snowy mood has
		// latched the canvas, or create at boot when the boot mood already needs
		// it (predicate mirrors weatherAssetNeedsFor's `snow`). Calm sessions
		// skip the canvas, source, layer and GPU texture entirely.
		if (
			snowCanvasRef.current ||
			(cfg.snowOpacity > 0.001 && cfg.snowDensity > 0.001)
		) {
			ensureSnowSourceAndLayer(mapInstance, {
				snowCanvasRef,
				snowCanvasCtxRef,
				weatherMoodConfigRef,
			});
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

		// Lightning pipeline: same lazy contract as snow above (predicate mirrors
		// weatherAssetNeedsFor's `lightning`).
		if (
			lightningCanvasRef.current ||
			cfg.lightning ||
			cfg.lightningIntensity > 0.001
		) {
			ensureLightningSourceAndLayer(mapInstance, {
				lightningCanvasRef,
				lightningCanvasCtxRef,
				weatherMoodConfigRef,
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
		const stateLabelsBeforeId = getFirstBasemapSettlementLabelLayerId(mapInstance);
		ensureLayer(
			{
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
					'text-field': [
						'step',
						['zoom'],
						['get', 'key'],
						STATE_LABEL_FULL_NAME_ZOOM,
						['get', 'name'],
					],
					'text-size': ['interpolate', ['linear'], ['zoom'], 3, 9, 5, 10, 7, 12, 10, 14],
					'text-font': ['Inter Medium', 'Arial Unicode MS Regular'],
					'text-allow-overlap': true,
					'text-ignore-placement': true,
					'text-letter-spacing': [
						'interpolate',
						['linear'],
						['zoom'],
						3,
						0.08,
						7,
						0.06,
						10,
						0.03,
					],
					// Smaller padding lets more initials survive collision when zoomed out.
					'text-padding': 1,
					// Rank 1 = largest state. Keep the rank stable even though labels no
					// longer block city placement; if overlap behavior is tuned again later,
					// large-state labels still win first.
					'symbol-sort-key': ['get', 'rank'],
				},
				paint: {
					'text-color': STATE_LABEL_COLOR,
					// Keep labels flat (no glow) to match `/free-trial`.
					'text-halo-color': 'rgba(0, 0, 0, 0)',
					'text-halo-width': 0,
					// Born hidden. State-name labels come from local GeoJSON, so the symbol
					// layer would otherwise paint at the Mapbox default text-opacity of 1 the
					// instant its source data lands — which can beat the cream land/basemap
					// onto the screen and flash scattered initials over empty ocean/space.
					// The boot ladder's reveal (applyStateOverlayOpacity, gated on
					// isStateLayerReady && isBasemapTilesSettled) is the *only* thing that
					// fades them in, so starting at 0 guarantees labels never appear before
					// the land beneath them. Safe to bake (unlike the divider/border lines):
					// label opacity is always rebuilt fresh via buildStateLabelsTextOpacityExpr
					// and never captured-then-scaled, so a baked 0 can't poison a base value.
					'text-opacity': 0,
				},
			},
			stateLabelsBeforeId
		);
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
					// Fade the whole glow out at far zoom (top-level zoom interpolate, as
					// Mapbox requires) so dense clusters can't alpha-composite into a
					// single white blob from globe distance.
					'circle-opacity': buildCampaignHeatmapZoomFadedOpacity([
						'*',
						CAMPAIGN_HEATMAP_GLOW_OPACITY_MAX,
						['coalesce', ['get', 'glowFade'], 1],
						['coalesce', ['get', 'glowDensityScale'], 1],
					]),
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
					'coalesce',
					['get', 'lineGlowColor'],
					[
						'case',
						['boolean', ['get', 'statusMode'], false],
						SELECTED_STATUS_DOT_FILL_COLOR,
						MARKER_CONSTELLATION_SELECTED_HALO_COLOR,
					],
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
					'coalesce',
					['get', 'lineColor'],
					[
						'case',
						['boolean', ['get', 'statusMode'], false],
						SELECTED_STATUS_DOT_STROKE_COLOR,
						MARKER_CONSTELLATION_SELECTED_LINE_COLOR,
					],
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
				if (
					mapInstance.getLayer(layerId) &&
					mapInstance.getLayer(MAPBOX_LAYER_IDS.selectedMarkerIcons)
				) {
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

		// Radius placement preview — the live circle that tracks the cursor while the
		// user is choosing a radius-search center. Matches the committed radius circle
		// language (cream fill + white ring) so placement reads as a preview of the
		// real result geometry. Above everything so it's never occluded while placing.
		ensureLayer({
			id: MAPBOX_LAYER_IDS.radiusPreviewFill,
			type: 'fill',
			source: MAPBOX_SOURCE_IDS.radiusPreview,
			paint: { 'fill-color': '#EFE8D8', 'fill-opacity': 0.34, 'fill-antialias': true },
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.radiusPreviewLine,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.radiusPreview,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': '#FFFFFF',
				'line-opacity': 0.92,
				'line-width': 2,
				'line-blur': 0,
			},
		});

		// All floor-shifted expressions above were built with the current floor
		// delta, so creation/style-reload bakes it — keep the parity gate in step.
		lastParityAppliedFloorDeltaRef.current = interactiveFloorDeltaRef.current;
};
