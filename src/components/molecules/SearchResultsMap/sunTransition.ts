import {
	defaultCenter,
	SUN_TRANSITION_CANVAS_SIZE_PX,
	SUN_TRANSITION_CLOSE_FADE_END_ZOOM,
	SUN_TRANSITION_CLOSE_FADE_START_ZOOM,
	SUN_TRANSITION_COLOR_ALPHA_MULT,
	SUN_TRANSITION_LAYER_MAX_OPACITY,
	SUN_TRANSITION_MAX_PIXEL_ALPHA,
	SUN_TRANSITION_SUNRISE_END_OFFSET_DEG,
	SUN_TRANSITION_SUNRISE_START_OFFSET_DEG,
	SUN_TRANSITION_SUNSET_END_OFFSET_DEG,
	SUN_TRANSITION_SUNSET_START_OFFSET_DEG,
} from './constants';
import { computeLightingOverlayOpacity } from './lightingOverlay';
import { clamp, lerp, normalizeLngDeg, smoothstep } from './math';
import type {
	GlobeNightLightingLike,
	SunTransitionVisualState,
} from './types';

export const getSunTransitionVisualState = (
	nightLighting: GlobeNightLightingLike | null | undefined,
	nowMs: number
): SunTransitionVisualState | null => {
	if (!nightLighting) return null;
	const phase = nightLighting?.phase;
	if (phase !== 'sunrise' && phase !== 'sunset') return null;

	const startMs = nightLighting.phaseStartMs;
	const endMs = nightLighting.phaseEndMs;
	const durationMs = endMs - startMs;
	if (!Number.isFinite(durationMs) || durationMs <= 0) return null;

	const progress = clamp((nowMs - startMs) / durationMs, 0, 1);
	const sweepT = smoothstep(0, 1, progress);
	const [startOffset, endOffset] =
		phase === 'sunrise'
			? [SUN_TRANSITION_SUNRISE_START_OFFSET_DEG, SUN_TRANSITION_SUNRISE_END_OFFSET_DEG]
			: [SUN_TRANSITION_SUNSET_START_OFFSET_DEG, SUN_TRANSITION_SUNSET_END_OFFSET_DEG];
	const centerLng = normalizeLngDeg(defaultCenter.lng + lerp(startOffset, endOffset, sweepT));
	const bell = Math.sin(progress * Math.PI);
	const intensity = Math.pow(Math.max(0, bell), 0.62);

	if (intensity <= 0.001) return null;

	return {
		phase,
		progress,
		intensity,
		centerLng,
		direction: phase === 'sunrise' ? 1 : -1,
	};
};

const computeSunTransitionZoomOpacity = (zoom: number) => {
	const globeFade = computeLightingOverlayOpacity(zoom);
	const closeFade =
		1 -
		smoothstep(
			SUN_TRANSITION_CLOSE_FADE_START_ZOOM,
			SUN_TRANSITION_CLOSE_FADE_END_ZOOM,
			zoom
		);
	return clamp(globeFade * closeFade, 0, 1);
};

export const computeSunTransitionLayerOpacity = (
	visual: SunTransitionVisualState | null,
	zoom: number
) => {
	if (!visual) return 0;
	return clamp(
		computeSunTransitionZoomOpacity(zoom) *
			SUN_TRANSITION_LAYER_MAX_OPACITY *
			visual.intensity,
		0,
		1
	);
};

const addSunTransitionColor = (
	acc: { r: number; g: number; b: number; a: number },
	signedDistDeg: number,
	centerDeg: number,
	widthDeg: number,
	rgb: [number, number, number],
	alpha: number
) => {
	if (alpha <= 0) return;
	const x = (signedDistDeg - centerDeg) / widthDeg;
	const a = alpha * Math.exp(-x * x);
	if (a <= 0.0001) return;
	acc.r += rgb[0] * a;
	acc.g += rgb[1] * a;
	acc.b += rgb[2] * a;
	acc.a += a;
};

export const paintSunTransitionCanvas = (
	canvas: HTMLCanvasElement,
	visual: SunTransitionVisualState | null
) => {
	canvas.width = SUN_TRANSITION_CANVAS_SIZE_PX;
	canvas.height = SUN_TRANSITION_CANVAS_SIZE_PX;

	const ctx = canvas.getContext('2d');
	if (!ctx) return false;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (!visual) return true;

	const w = canvas.width;
	const h = canvas.height;
	const imageData = ctx.createImageData(w, h);
	const data = imageData.data;
	const p = visual.progress;
	const sunriseT = visual.phase === 'sunrise' ? p : 1 - p;
	const violetGate =
		visual.phase === 'sunrise'
			? 1 - smoothstep(0.52, 0.98, p) * 0.66
			: smoothstep(0.14, 0.82, p);
	const roseGate =
		visual.phase === 'sunrise'
			? 1 - smoothstep(0.72, 1, p) * 0.28
			: smoothstep(0.06, 0.72, p);
	const warmGate =
		visual.phase === 'sunrise'
			? smoothstep(0.12, 0.66, p)
			: 1 - smoothstep(0.44, 0.98, p) * 0.52;
	const goldGate =
		visual.phase === 'sunrise'
			? smoothstep(0.32, 0.88, p)
			: 1 - smoothstep(0.16, 0.78, p);
	const paleGate =
		visual.phase === 'sunrise'
			? smoothstep(0.52, 0.96, p)
			: 1 - smoothstep(0.08, 0.6, p);

	for (let y = 0; y < h; y += 1) {
		const mercatorY = (y + 0.5) / h;
		const lat =
			(Math.atan(Math.sinh(Math.PI * (1 - 2 * mercatorY))) * 180) / Math.PI;
		const latRad = (lat * Math.PI) / 180;
		const absLat = Math.abs(lat);
		const polarTaper = 1 - smoothstep(62, 84, absLat);
		const midLatLift = 0.72 + 0.28 * (1 - smoothstep(8, 58, absLat));

		for (let x = 0; x < w; x += 1) {
			const lng = ((x + 0.5) / w) * 360 - 180;
			const lngRad = (lng * Math.PI) / 180;
			const wobble =
				8.5 * Math.sin(latRad * 1.55 + lngRad * 0.74 + sunriseT * 1.8) +
				4.25 * Math.sin(lngRad * 2.2 - latRad * 0.9 - sunriseT * 2.4);
			const arrowTilt = lat * 0.16 * visual.direction;
			const signedDist =
				normalizeLngDeg(lng + wobble + arrowTilt - visual.centerLng) *
				visual.direction;
			const latAlpha = polarTaper * midLatLift;
			if (latAlpha <= 0.001) continue;

			const acc = { r: 0, g: 0, b: 0, a: 0 };
			const intensity = visual.intensity * latAlpha * SUN_TRANSITION_COLOR_ALPHA_MULT;
			addSunTransitionColor(acc, signedDist, -62, 34, [12, 24, 72], 0.08 * intensity);
			addSunTransitionColor(acc, signedDist, -43, 25, [78, 55, 145], 0.13 * intensity * violetGate);
			addSunTransitionColor(acc, signedDist, -28, 20, [178, 62, 142], 0.16 * intensity * violetGate);
			addSunTransitionColor(acc, signedDist, -13, 19, [238, 94, 116], 0.2 * intensity * roseGate);
			addSunTransitionColor(acc, signedDist, 4, 17, [255, 137, 82], 0.18 * intensity * warmGate);
			addSunTransitionColor(acc, signedDist, 18, 14, [255, 188, 82], 0.15 * intensity * goldGate);
			addSunTransitionColor(acc, signedDist, 31, 12, [255, 236, 172], 0.1 * intensity * paleGate);

			const alpha = clamp(acc.a, 0, SUN_TRANSITION_MAX_PIXEL_ALPHA);
			if (alpha <= 0.001) continue;

			const idx = (y * w + x) * 4;
			data[idx] = Math.round(clamp(acc.r / acc.a, 0, 255));
			data[idx + 1] = Math.round(clamp(acc.g / acc.a, 0, 255));
			data[idx + 2] = Math.round(clamp(acc.b / acc.a, 0, 255));
			data[idx + 3] = Math.round(alpha * 255);
		}
	}

	ctx.putImageData(imageData, 0, 0);
	return true;
};

export const createSunTransitionCanvas = (): HTMLCanvasElement | null => {
	if (typeof document === 'undefined') return null;

	const canvas = document.createElement('canvas');
	if (!paintSunTransitionCanvas(canvas, null)) return null;
	return canvas;
};
