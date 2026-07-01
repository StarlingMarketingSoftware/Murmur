'use client';

import { useCallback, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type mapboxgl from 'mapbox-gl';
import { applyMapboxFogForMoodAndNight, applyMurmurGlobeLighting, applyNightLandPalette } from './basemap';
import { buildCloudsOpacityExpr } from './clouds';
import { LIGHTNING_LAYER_OPACITY, MAPBOX_LAYER_IDS } from './constants';
import { buildLightningOpacityExpr } from './lightning';
import { computeMoodVisualNightT } from './moodConfig';
import { buildSnowOpacityExpr } from './snow';
import { applyStateOverlayNightColors } from './stateOverlayStyle';
import type { RuntimeMoodVisualConfig } from './types';

export interface UseApplyWeatherMoodConfigParams {
	applyLightingOverlayOpacity: () => void;
	applyStateOverlayOpacity: (nextOverlayOpacity: number, nextModeT: number) => void;
	interactiveFloorDeltaRef: MutableRefObject<number>;
	isMapLoaded: boolean;
	map: mapboxgl.Map | null;
	mapRef: MutableRefObject<mapboxgl.Map | null>;
	nightTRef: MutableRefObject<number>;
	stateOverlayModeRef: MutableRefObject<number>;
	stateOverlayOpacityRef: MutableRefObject<number>;
	unsubscribeBurnTRef: MutableRefObject<number>;
	weatherMoodConfigRef: MutableRefObject<RuntimeMoodVisualConfig>;
}

// Night-palette zoom re-apply + the applyWeatherMoodConfig applier (the single
// writer that pushes the live mood config into every Mapbox layer/overlay).
export const useApplyWeatherMoodConfig = (params: UseApplyWeatherMoodConfigParams) => {
	const {
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
	} = params;
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

	return { applyWeatherMoodConfig };
};
