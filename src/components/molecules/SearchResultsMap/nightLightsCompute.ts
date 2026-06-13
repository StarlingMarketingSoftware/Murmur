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
