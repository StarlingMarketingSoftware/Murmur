import {
	DAY_FAR_SIDE_SHADE_CANVAS_SIZE_PX,
	DAY_FAR_SIDE_SHADE_DAYTIME_DRIFT_DEG,
	DAY_FAR_SIDE_SHADE_FADE_END_DEG,
	DAY_FAR_SIDE_SHADE_FADE_POWER,
	DAY_FAR_SIDE_SHADE_FADE_START_DEG,
	DAY_FAR_SIDE_SHADE_MAX_ALPHA,
	defaultCenter,
} from './constants';
import { angularLngDistanceDeg, clamp, normalizeLngDeg, smoothstep } from './math';
import type { GlobeNightLightingLike } from './types';

// `DAY_FAR_SIDE_SHADE_CENTER_LNG` depends on `normalizeLngDeg` so it stays in
// this module (the rest of the day-far-side / clouds polar / contact-lights /
// sun-transition constants live in `./constants`).
export const DAY_FAR_SIDE_SHADE_CENTER_LNG = normalizeLngDeg(defaultCenter.lng + 180);

export const getDayFarSideShadeDayProgress = (
	nightLighting: GlobeNightLightingLike | null | undefined,
	nowMs: number
) => {
	if (!nightLighting) return 0;
	if (nightLighting.phase === 'sunrise') return 0;
	if (nightLighting.phase === 'sunset') return 1;
	if (nightLighting.phase !== 'day') return 0;

	const startMs = nightLighting.phaseStartMs;
	const endMs = nightLighting.phaseEndMs;
	const durationMs = endMs - startMs;
	if (!Number.isFinite(durationMs) || durationMs <= 0) return 0;
	return clamp((nowMs - startMs) / durationMs, 0, 1);
};

export const getDayFarSideShadeCenterLng = (dayProgress: number) =>
	normalizeLngDeg(
		DAY_FAR_SIDE_SHADE_CENTER_LNG +
			clamp(dayProgress, 0, 1) * DAY_FAR_SIDE_SHADE_DAYTIME_DRIFT_DEG
	);

export const paintDayFarSideShadeCanvas = (
	canvas: HTMLCanvasElement,
	centerLng: number = DAY_FAR_SIDE_SHADE_CENTER_LNG
) => {
	canvas.width = DAY_FAR_SIDE_SHADE_CANVAS_SIZE_PX;
	canvas.height = DAY_FAR_SIDE_SHADE_CANVAS_SIZE_PX;

	const ctx = canvas.getContext('2d');
	if (!ctx) return false;

	const w = canvas.width;
	const h = canvas.height;
	const imageData = ctx.createImageData(w, h);
	const data = imageData.data;

	for (let y = 0; y < h; y += 1) {
		const mercatorY = (y + 0.5) / h;
		const lat =
			(Math.atan(Math.sinh(Math.PI * (1 - 2 * mercatorY))) * 180) / Math.PI;
		const latRad = (lat * Math.PI) / 180;

		for (let x = 0; x < w; x += 1) {
			const lng = ((x + 0.5) / w) * 360 - 180;
			const lngRad = (lng * Math.PI) / 180;
			const wobble =
				9 * Math.sin(latRad * 2.1 + lngRad * 1.15) +
				5 * Math.sin(lngRad * 2.7 - latRad * 0.8);
			const distToAsiaSide = angularLngDistanceDeg(lng + wobble, centerLng);
			const farSideT = Math.pow(
				1 -
					smoothstep(
						DAY_FAR_SIDE_SHADE_FADE_START_DEG,
						DAY_FAR_SIDE_SHADE_FADE_END_DEG,
						distToAsiaSide
					),
				DAY_FAR_SIDE_SHADE_FADE_POWER
			);
			const usProtectionT = smoothstep(
				40,
				78,
				angularLngDistanceDeg(lng, defaultCenter.lng)
			);
			const polarTaperT = 1 - smoothstep(62, 80, Math.abs(lat));
			const northTopTaperT = 1 - smoothstep(50, 74, lat) * 0.5;
			const alpha =
				DAY_FAR_SIDE_SHADE_MAX_ALPHA *
				farSideT *
				usProtectionT *
				polarTaperT *
				northTopTaperT;

			const idx = (y * w + x) * 4;
			data[idx] = 4;
			data[idx + 1] = 8;
			data[idx + 2] = 22;
			data[idx + 3] = Math.round(clamp(alpha, 0, DAY_FAR_SIDE_SHADE_MAX_ALPHA) * 255);
		}
	}

	ctx.putImageData(imageData, 0, 0);
	return true;
};

export const createDayFarSideShadeCanvas = (): HTMLCanvasElement | null => {
	if (typeof document === 'undefined') return null;

	const canvas = document.createElement('canvas');
	if (!paintDayFarSideShadeCanvas(canvas)) return null;
	return canvas;
};
