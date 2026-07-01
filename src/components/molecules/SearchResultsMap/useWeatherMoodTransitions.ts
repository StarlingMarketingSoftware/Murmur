'use client';

import { useCallback, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { RuntimeMoodVisualConfig } from './types';
import { HOT_TEMPERATURE_THRESHOLD_F, MOOD_CONTINUOUS_TRANSITION_MS, MOOD_DISCRETE_EFFECT_FADE_MS, MOOD_TRANSITION_PAINT_FRAME_MS } from './constants';
import { clamp } from './math';
import { blendRuntimeMoodConfig, toRuntimeMoodConfig } from './moodConfig';
import { getDevMoodTransitionMs } from './nightLightsCompute';
import { getMoodConfig } from '@/lib/weather/moodConfig';
import { WeatherMood } from '@/lib/weather/regions';

export interface UseWeatherMoodTransitionsParams {
	appliedWeatherMoodRef: MutableRefObject<WeatherMood>;
	applyLightingOverlayOpacity: () => void;
	applyWeatherMoodConfig: (cfg: RuntimeMoodVisualConfig) => void;
	effectiveTemperatureF: number | null;
	isHotRef: MutableRefObject<boolean>;
	isMapLoaded: boolean;
	map: mapboxgl.Map | null;
	moodTransitionLastPaintMsRef: MutableRefObject<number>;
	moodTransitionRafRef: MutableRefObject<number | null>;
	moodTransitionRef: MutableRefObject<{
		from: RuntimeMoodVisualConfig;
		to: RuntimeMoodVisualConfig;
		startMs: number;
		continuousMs: number;
		discreteMs: number;
	} | null>;
	weatherMood: WeatherMood;
	weatherMoodConfigRef: MutableRefObject<RuntimeMoodVisualConfig>;
}

// Mood crossfade transitions (RAF mutates weatherMoodConfigRef in place) and
// the hot-temperature flag sync.
export const useWeatherMoodTransitions = (params: UseWeatherMoodTransitionsParams): void => {
	const {
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
	} = params;
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
};
