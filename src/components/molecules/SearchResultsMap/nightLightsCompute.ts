import {
	NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_END_ZOOM,
	NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_START_ZOOM,
	NIGHT_LIGHTS_CRISP_FADE_OUT_END_ZOOM,
	NIGHT_LIGHTS_CRISP_FADE_OUT_START_ZOOM,
	NIGHT_LIGHTS_FADE_END_ZOOM,
	NIGHT_LIGHTS_FADE_START_ZOOM,
	NIGHT_LIGHTS_GLOW_FADE_END_ZOOM,
	NIGHT_LIGHTS_GLOW_FADE_START_ZOOM,
	NIGHT_LIGHTS_SPACE_GLOW_FADE_END_ZOOM,
	NIGHT_LIGHTS_SPACE_GLOW_FADE_START_ZOOM,
	NIGHT_LIGHTS_ZOOM_OUT_LIFT_END_ZOOM,
	NIGHT_LIGHTS_ZOOM_OUT_LIFT_MAX,
	NIGHT_LIGHTS_ZOOM_OUT_LIFT_START_ZOOM,
} from './constants';
import { clamp, easeInOutCubic } from './math';
import type { GlobeNightLightingLike } from './types';

// `?devMoodTransitionMs=<n>` overrides the mood transition duration for design QA.
// Clamped to a sane range so a typo can't freeze the globe.
export const getDevMoodTransitionMs = (): number | null => {
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

// During sunrise/sunset the night factor is interpolated by phase progress so the
// rest of the lighting math stays a simple 0..1 dial. Outside those phases the
// globe lighting feed (or the prop fallback) is treated as the source of truth.
export const computeRuntimeNightT = (
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

export const computeNightLightsFade = (zoom: number) => {
	if (zoom <= NIGHT_LIGHTS_FADE_START_ZOOM) return 1;
	if (zoom >= NIGHT_LIGHTS_FADE_END_ZOOM) return 0;
	const t =
		(zoom - NIGHT_LIGHTS_FADE_START_ZOOM) /
		(NIGHT_LIGHTS_FADE_END_ZOOM - NIGHT_LIGHTS_FADE_START_ZOOM);
	const inv = 1 - clamp(t, 0, 1);
	// Steep fade: drops quickly after the start zoom so the overlay doesn't read as texture.
	return Math.pow(inv, 2.25);
};

export const computeNightLightsZoomOutLift = (zoom: number) => {
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

export const computeNightLightsGlowFade = (zoom: number) => {
	if (zoom <= NIGHT_LIGHTS_GLOW_FADE_START_ZOOM) return 1;
	if (zoom >= NIGHT_LIGHTS_GLOW_FADE_END_ZOOM) return 0;
	const t =
		(zoom - NIGHT_LIGHTS_GLOW_FADE_START_ZOOM) /
		(NIGHT_LIGHTS_GLOW_FADE_END_ZOOM - NIGHT_LIGHTS_GLOW_FADE_START_ZOOM);
	// Ease-out: hold most of the glow, then drop off as we approach state-level zoom.
	return 1 - t * t;
};

export const computeNightLightsSpaceGlowFade = (zoom: number) => {
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

export const computeNightLightsCrispMul = (zoom: number) => {
	if (zoom <= NIGHT_LIGHTS_CRISP_FADE_OUT_START_ZOOM) return 1;
	if (zoom >= NIGHT_LIGHTS_CRISP_FADE_OUT_END_ZOOM) return 0;
	const t =
		(zoom - NIGHT_LIGHTS_CRISP_FADE_OUT_START_ZOOM) /
		(NIGHT_LIGHTS_CRISP_FADE_OUT_END_ZOOM - NIGHT_LIGHTS_CRISP_FADE_OUT_START_ZOOM);
	const inv = 1 - clamp(t, 0, 1);
	// Ease-out: hold crisp longer, then drop as we approach state-level zoom.
	return inv * inv;
};

export const computeNightLightsCloseGlowMul = (zoom: number) => {
	if (zoom <= NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_START_ZOOM) return 0;
	if (zoom >= NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_END_ZOOM) return 1;
	const t =
		(zoom - NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_START_ZOOM) /
		(NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_END_ZOOM -
			NIGHT_LIGHTS_CLOSE_GLOW_FADE_IN_START_ZOOM);
	// Ease-in: let dots dominate, then let glow take over smoothly.
	return clamp(t, 0, 1) * clamp(t, 0, 1);
};
