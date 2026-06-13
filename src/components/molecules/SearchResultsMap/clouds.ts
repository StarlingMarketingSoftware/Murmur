import {
	CLOUDS_EXTRA_PASS_OFFSETS,
	CLOUDS_OVERLAY_FADE_OUT_END_ZOOM,
	CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
	CLOUDS_POLAR_TAPER_END_DEG,
	CLOUDS_POLAR_TAPER_START_DEG,
	MAP_MIN_ZOOM,
} from './constants';
import { clamp, smoothstep } from './math';

// ============================================================================
// Cloud canvas painter passes
// ============================================================================

// Stamps the same cloud texture multiple times at offset positions to give a
// soft, layered look. `offsetShift` lets the caller rotate which offsets are
// used per frame so the layering doesn't look static.
export const drawCloudExtraPasses = (
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	extraPasses: number,
	offsetShift = 0,
	passAlphaMultiplier = 1,
	passSpreadMultiplier = 1
) => {
	const count = clamp(extraPasses, 0, CLOUDS_EXTRA_PASS_OFFSETS.length);
	const passAlpha = clamp(passAlphaMultiplier, 0, 1);
	const passSpread = clamp(passSpreadMultiplier, 0.35, 2.5);
	const fullPasses = Math.floor(count);
	const fractionalPass = count - fullPasses;
	const totalPasses = fullPasses + (fractionalPass > 0.001 ? 1 : 0);
	if (totalPasses <= 0 || passAlpha <= 0.001) return;

	const baseAlpha = ctx.globalAlpha;
	for (let p = 0; p < totalPasses; p++) {
		const alphaMul = p < fullPasses ? 1 : fractionalPass;
		if (alphaMul <= 0.001) continue;
		const [oxT, oyT] =
			CLOUDS_EXTRA_PASS_OFFSETS[
				(p + offsetShift) % CLOUDS_EXTRA_PASS_OFFSETS.length
			];
		ctx.globalAlpha = baseAlpha * alphaMul * passAlpha;
		ctx.translate(w * oxT * passSpread, h * oyT * passSpread);
		ctx.fillRect(-w * 2, -h * 2, w * 5, h * 5);
	}
	ctx.globalAlpha = baseAlpha;
};

// ============================================================================
// Mapbox layer opacity expression
// ============================================================================

// `floorDelta` shifts the near-floor stops by the viewport-proportional raise
// of the interactive zoom floor so the densest "globe" cloud cover stays a
// floor state on every monitor. The 0 stop must stay (mobile floor is 1); the
// fade-out stops (8/10.5) govern zoomed-in behavior and never move. Max
// shifted stop: 4 + 1.25 = 5.25 < CLOUDS_OVERLAY_FADE_OUT_START_ZOOM (8).
export const buildCloudsOpacityExpr = (
	globeZoomOpacity: number,
	decorativeZoomOpacity: number,
	deepZoomFloor: number = 0,
	floorDelta: number = 0
) => [
	'interpolate',
	['linear'],
	['zoom'],
	0,
	globeZoomOpacity,
	MAP_MIN_ZOOM + floorDelta,
	globeZoomOpacity,
	4 + floorDelta,
	decorativeZoomOpacity,
	CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
	decorativeZoomOpacity,
	CLOUDS_OVERLAY_FADE_OUT_END_ZOOM,
	deepZoomFloor,
	22,
	deepZoomFloor,
];

// ============================================================================
// Polar fade mask (geographic latitude → alpha taper)
// ============================================================================

// Vertical 1px-wide alpha mask whose alpha follows the inverse Mercator
// formula, so the taper is geographically correct (latitude-pinned) rather
// than just a screen-space gradient. Cached at module scope and reused as a
// `destination-in` source in the cloud and snow draw loops.
let cloudsPolarFadeMaskCanvas: HTMLCanvasElement | null = null;

const buildCloudsPolarFadeMaskCanvas = (
	sizePx: number
): HTMLCanvasElement | null => {
	if (typeof document === 'undefined') return null;
	const mask = document.createElement('canvas');
	mask.width = 1;
	mask.height = sizePx;
	const ctx = mask.getContext('2d');
	if (!ctx) return null;
	const img = ctx.createImageData(1, sizePx);
	const data = img.data;
	for (let y = 0; y < sizePx; y += 1) {
		const mercatorY = (y + 0.5) / sizePx;
		const lat =
			(Math.atan(Math.sinh(Math.PI * (1 - 2 * mercatorY))) * 180) / Math.PI;
		const t =
			1 -
			smoothstep(
				CLOUDS_POLAR_TAPER_START_DEG,
				CLOUDS_POLAR_TAPER_END_DEG,
				Math.abs(lat)
			);
		const a = Math.round(clamp(t, 0, 1) * 255);
		const i = y * 4;
		data[i] = 255;
		data[i + 1] = 255;
		data[i + 2] = 255;
		data[i + 3] = a;
	}
	ctx.putImageData(img, 0, 0);
	return mask;
};

export const getCloudsPolarFadeMask = (sizePx: number): HTMLCanvasElement | null => {
	const existing = cloudsPolarFadeMaskCanvas;
	if (existing && existing.height === sizePx) return existing;
	const next = buildCloudsPolarFadeMaskCanvas(sizePx);
	cloudsPolarFadeMaskCanvas = next;
	return next;
};
