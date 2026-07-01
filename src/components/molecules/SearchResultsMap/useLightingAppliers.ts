'use client';

import { useCallback, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { GlobeNightLightingLike, RuntimeMoodVisualConfig } from './types';
import { unsubscribeBurnEase } from './basemap';
import {
	CLOUDS_OVERLAY_FADE_OUT_END_ZOOM,
	DAY_FAR_SIDE_SHADE_CANVAS_SIZE_PX,
	DAY_FAR_SIDE_SHADE_MIN_REPAINT_DELTA_DEG,
	DAY_FAR_SIDE_SHADE_OPACITY_MULTIPLIER,
	DAY_FAR_SIDE_SHADE_REPAINT_MS,
	HOT_WASH_OPACITY,
	LIGHTNING_HIDE_AT_OR_ABOVE_ZOOM,
	MAPBOX_LAYER_IDS,
	MAPBOX_SOURCE_IDS,
	MAP_DEFAULT_ZOOM,
	NIGHT_DARK_WASH_OPACITY,
	NIGHT_FACE_SHADE_OPACITY,
	NIGHT_GLOOM_WASH_OPACITY,
	NIGHT_LOWER_LEFT_SHADOW_OPACITY,
	NIGHT_MOONLIGHT_KEY_OPACITY,
	NIGHT_MOON_RIM_OPACITY,
	NIGHT_SHADOW_OVERLAY_MUL_MIN,
	NIGHT_VIGNETTE_OPACITY,
	NIGHT_WARM_KEY_MIN_MUL,
	SNOW_HIDE_AT_OR_ABOVE_ZOOM,
	SUN_TRANSITION_CLOUD_CATCHLIGHT_OPACITY_MULT,
	SUN_TRANSITION_PROGRESS_PAINT_STEPS,
	SUN_TRANSITION_SPACE_GLOW_OPACITY_MULT,
	UNSUBSCRIBE_BURN_GLOW_MAX_OPACITY,
	UNSUBSCRIBE_BURN_WASH_MAX_OPACITY,
} from './constants';
import { getDayFarSideShadeCenterLng, getDayFarSideShadeDayProgress, paintDayFarSideShadeCanvas } from './dayFarSideShade';
import { computeGloomWashFade, computeLightingOverlayOpacity } from './lightingOverlay';
import { angularLngDistanceDeg, clamp, smoothstep } from './math';
import { computeMoodVisualNightT } from './moodConfig';
import { CANVAS_PERF_MODE } from './perfFlags';
import { computeSunTransitionLayerOpacity, getSunTransitionVisualState, paintSunTransitionCanvas } from './sunTransition';

export interface UseLightingAppliersParams {
	dayFarSideShadeCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
	dayFarSideShadeCenterLngRef: MutableRefObject<number>;
	dayFarSideShadeLightingRef: MutableRefObject<GlobeNightLightingLike | null>;
	dayFarSideShadePhase: string | null;
	dayFarSideShadePhaseEndMs: string | number | null;
	dayFarSideShadePhaseStartMs: string | number | null;
	ensureMapboxSourcesAndLayers: (mapInstance: mapboxgl.Map) => void;
	interactiveFloorDeltaRef: MutableRefObject<number>;
	isHotRef: MutableRefObject<boolean>;
	isMapLoaded: boolean;
	lightingLayerVisibilityAppliedRef: MutableRefObject<Record<string, string>>;
	lightingOverlayBurnGlowRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayBurnWashRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayDarkKeyRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayGloomWashRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayHotWashRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayMoonRimRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayNightDarkWashRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayNightLowerLeftShadowRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayNightMoonlightRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayNightShadeRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayNightVignetteRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayShadowRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlaySunSpaceGlowRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayWarmKeyRef: MutableRefObject<HTMLDivElement | null>;
	lightingRasterOpacityAppliedRef: MutableRefObject<Record<string, number>>;
	map: mapboxgl.Map | null;
	mapRef: MutableRefObject<mapboxgl.Map | null>;
	nightLightingRef: MutableRefObject<GlobeNightLightingLike | null>;
	nightTRef: MutableRefObject<number>;
	sunTransitionCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
	sunTransitionPaintKeyRef: MutableRefObject<string>;
	sunTransitionPhase: string | null;
	sunTransitionPhaseEndMs: string | number | null;
	sunTransitionPhaseStartMs: string | number | null;
	unsubscribeBurnTRef: MutableRefObject<number>;
	weatherMoodConfigRef: MutableRefObject<RuntimeMoodVisualConfig>;
}

// The imperative lighting appliers (softbox overlay opacity, raster opacity,
// sun-transition canvas repaint) plus the shade-refresh / sun-transition /
// zoom-binding driver effects. Callback identities are returned to the shell:
// they feed deps arrays across the mood/night/parity clusters.
export const useLightingAppliers = (params: UseLightingAppliersParams) => {
	const {
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
	} = params;
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
				setRasterOpacityIfChanged(m, MAPBOX_LAYER_IDS.dayFarSideShade, dayShadeOpacity);
				setRasterOpacityIfChanged(
					m,
					MAPBOX_LAYER_IDS.sunTransition,
					sunTransitionOpacity
				);
				setRasterOpacityIfChanged(
					m,
					MAPBOX_LAYER_IDS.sunTransitionCloudCatchlight,
					sunTransitionCatchlightOpacity
				);
			}
		} catch {
			// Non-fatal.
		}

		// Hide weather raster layers when effectively invisible. Mapbox keeps loading +
		// compositing raster/canvas sources for opacity-0 layers, so visibility gates
		// remove the work entirely.
		try {
			const m = mapRef.current;
			if (m) {
				const setVisibility = (layerId: string, visible: boolean) => {
					if (!m.getLayer(layerId)) return;
					const v = visible ? 'visible' : 'none';
					if (lightingLayerVisibilityAppliedRef.current[layerId] !== v) {
						m.setLayoutProperty(layerId, 'visibility', v);
						lightingLayerVisibilityAppliedRef.current[layerId] = v;
					}
				};

				const anyCloudOpacity =
					cfg.cloudOpacityGlobeZoom > 0.0005 ||
					cfg.cloudOpacityDecorativeZoom > 0.0005 ||
					cfg.cloudDeepZoomOpacity > 0.0005;
				const showClouds =
					anyCloudOpacity &&
					(zoom < CLOUDS_OVERLAY_FADE_OUT_END_ZOOM || cfg.cloudDeepZoomOpacity > 0.0005);

				const showLightning =
					Boolean(cfg.lightning) &&
					cfg.lightningIntensity > 0.001 &&
					zoom < LIGHTNING_HIDE_AT_OR_ABOVE_ZOOM;

				const showSnow =
					cfg.snowOpacity > 0.001 &&
					cfg.snowDensity > 0.001 &&
					zoom < SNOW_HIDE_AT_OR_ABOVE_ZOOM;

				setVisibility(MAPBOX_LAYER_IDS.clouds, showClouds);
				setVisibility(MAPBOX_LAYER_IDS.lightning, showLightning);
				setVisibility(MAPBOX_LAYER_IDS.snow, showSnow);
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
				// Perf mode: upload once, then stop forcing per-frame texture uploads.
				if (CANVAS_PERF_MODE) sunSrc?.pause?.();
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
				// Perf mode: upload once, then stop forcing per-frame texture uploads.
				if (CANVAS_PERF_MODE) source?.pause?.();
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

	return { setRasterOpacityIfChanged, applyLightingOverlayOpacity, repaintSunTransitionCanvas };
};
