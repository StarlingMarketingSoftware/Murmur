'use client';

import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { RuntimeMoodVisualConfig } from './types';
import type { WeatherMood } from '@/lib/weather/regions';
import type { SearchResultsMapProps } from './searchResultsMapProps';
import { applyMapboxFogForMoodAndNight, applyMurmurGlobeLighting, applyNightLandPalette } from './basemap';
import { MANUAL_NIGHT_T_OVERRIDE, UNSUBSCRIBE_BURN_TRANSITION_MS } from './constants';
import { clamp, lerp } from './math';
import { computeMoodVisualNightT } from './moodConfig';
import { computeRuntimeNightT } from './nightLightsCompute';
import { applyStateOverlayNightColors } from './stateOverlayStyle';
import { getUnsubscribeBurnTarget, subscribeUnsubscribeBurn } from './unsubscribeBurnState';

export interface UseLightingDriversParams {
	applyLightingOverlayOpacity: () => void;
	applyStateOverlayOpacity: (nextOverlayOpacity: number, nextModeT: number) => void;
	isMapLoaded: boolean;
	map: mapboxgl.Map | null;
	nightLighting: SearchResultsMapProps['nightLighting'];
	nightT: number;
	nightTRef: MutableRefObject<number>;
	presentation: 'background' | 'interactive';
	repaintSunTransitionCanvas: (nowMs: number, force?: boolean) => void;
	stateOverlayModeRef: MutableRefObject<number>;
	stateOverlayOpacityRef: MutableRefObject<number>;
	unsubscribeBurnTRef: MutableRefObject<number>;
	weatherMood: WeatherMood;
	weatherMoodConfigRef: MutableRefObject<RuntimeMoodVisualConfig>;
}

// Day/night + palette sync, the sunrise/sunset imperative RAF, and the
// unsubscribe-burn tween — the effects that drive the lighting appliers.
export const useLightingDrivers = (params: UseLightingDriversParams): void => {
	const {
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
	} = params;
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
};
