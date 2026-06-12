import {
	DOT_WAVE_JITTER_MS,
	DOT_WAVE_TRAVEL_MS_MAX,
	DOT_WAVE_TRAVEL_MS_MIN,
} from './constants';
import { clamp } from './math';

// Travel time scales with the number of dots so dense result sets get a slightly
// longer wave (keeps the per-dot delay perceivable) without dragging on for sparse ones.
export const computeDotWaveTravelMs = (featureCount: number): number => {
	if (!Number.isFinite(featureCount) || featureCount <= 0) return DOT_WAVE_TRAVEL_MS_MIN;
	const raw = 800 + Math.sqrt(featureCount) * 22;
	return clamp(Math.round(raw), DOT_WAVE_TRAVEL_MS_MIN, DOT_WAVE_TRAVEL_MS_MAX);
};

// Per-dot reveal delay: primarily west→east (longitude), with a small lat
// undulation so the wave reads organic instead of as a straight vertical line.
// A deterministic per-id jitter prevents identical-coord dots from popping in lockstep.
export const computeDotWaveDelayMs = (
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
