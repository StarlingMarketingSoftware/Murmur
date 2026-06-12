// Shared "chrome zoom" for the two fullscreen map workspaces — the dashboard map
// view (--murmur-dashboard-zoom) and the campaign page (--murmur-campaign-zoom).
// Both pages render the same fixed top-tab chrome, so they MUST derive their root
// scale from this single function or the chrome visibly jumps in size when
// navigating between them. History: each page used to carry its own copy of the
// resolution tables; the campaign page additionally snug-fits its bottom panels
// and treats this value as a cap (see updateCampaignZoomForViewport).
//
// Matching semantics: near-match/interpolation use RAW screen dimensions (stable
// across macOS Dock / menubar changes, hits the tuned entries exactly), while the
// aspect-ratio detection prefers avail dimensions. This mirrors the campaign
// page's historical behavior; the dashboard previously matched on avail dims and
// could disagree with the campaign when the Dock was visible.

export const MURMUR_CHROME_ZOOM_DEFAULT = 0.85;
export const MURMUR_CHROME_ZOOM_MIN = 0.5;
export const MURMUR_CHROME_ZOOM_MAX = 1.6;

// Campaign snug-fit constants, exported so the campaign page (zoom cap) and
// DraftingSection (envelope expansion) can never drift apart.
export const CAMPAIGN_SNUG_SAFE_BOTTOM_MARGIN_PX = 22;
export const CAMPAIGN_SNUG_MAX_HEIGHT_FIT_ZOOM = 1.2;
export const CAMPAIGN_SNUG_MIN_EFFECTIVE_WIDTH_PX = 952;
// Inner workspace scale applied to [data-slot='campaign-content'] (page.tsx).
export const CAMPAIGN_WORKSPACE_CONTENT_SCALE = 0.94;

export type MurmurChromeZoomScreen = {
	width?: number;
	height?: number;
	availWidth?: number;
	availHeight?: number;
};

const ZOOM_MATCH_TOLERANCE_PX = 50;

type ZoomMapEntry = { w: number; h: number; zoom: number };
type ZoomPoint = ZoomMapEntry & { metric: number };

// 16:10 resolution-specific zoom levels: [width, height] → zoom
const SIXTEEN_BY_TEN_ZOOM_MAP: ZoomMapEntry[] = [
	{ w: 1152, h: 720, zoom: 0.52 },
	{ w: 1280, h: 800, zoom: 0.6 },
	{ w: 1440, h: 900, zoom: 0.7 },
	{ w: 1504, h: 940, zoom: 0.84 }, // 14" MacBook Pro — the cross-page parity anchor
	{ w: 1664, h: 1040, zoom: 0.88 },
	{ w: 1920, h: 1200, zoom: 0.95 },
	{ w: 2048, h: 1280, zoom: 0.95 },
	{ w: 2304, h: 1440, zoom: 1.1 },
	{ w: 2592, h: 1620, zoom: 1.2 },
	{ w: 2880, h: 1800, zoom: 1.2 },
	{ w: 2976, h: 1860, zoom: 1.45 },
	{ w: 4608, h: 2880, zoom: 1.6 },
];
const SIXTEEN_BY_TEN_FALLBACK_ZOOM = 0.8;

// 16:9 resolution-specific zoom levels: [width, height] → zoom
const SIXTEEN_BY_NINE_ZOOM_MAP: ZoomMapEntry[] = [
	{ w: 1280, h: 720, zoom: 0.52 },
	{ w: 1344, h: 756, zoom: 0.55 },
	{ w: 1600, h: 900, zoom: 0.78 },
	{ w: 1920, h: 1080, zoom: 0.92 },
	{ w: 2560, h: 1440, zoom: 1.02 },
];
const SIXTEEN_BY_NINE_FALLBACK_ZOOM = 0.85;

// Precompute a size metric (diagonal length) so we can smoothly interpolate
// between tuned points.
const toSortedPoints = (map: ZoomMapEntry[]): ZoomPoint[] =>
	map
		.map((entry) => ({ ...entry, metric: Math.hypot(entry.w, entry.h) }))
		.sort((a, b) => a.metric - b.metric);

const SIXTEEN_BY_TEN_ZOOM_POINTS = toSortedPoints(SIXTEEN_BY_TEN_ZOOM_MAP);
const SIXTEEN_BY_NINE_ZOOM_POINTS = toSortedPoints(SIXTEEN_BY_NINE_ZOOM_MAP);

const clampZoom = (
	z: number,
	min = MURMUR_CHROME_ZOOM_MIN,
	max = MURMUR_CHROME_ZOOM_MAX
) => Math.min(max, Math.max(min, z));

export const computeMurmurChromeZoomForViewport = (
	viewportW: number,
	viewportH: number,
	screen?: MurmurChromeZoomScreen
): number => {
	if (!Number.isFinite(viewportW) || !Number.isFinite(viewportH)) {
		return MURMUR_CHROME_ZOOM_DEFAULT;
	}
	if (viewportW <= 0 || viewportH <= 0) return MURMUR_CHROME_ZOOM_DEFAULT;

	const ratio = viewportW / viewportH;
	const IDEAL_16X10 = 16 / 10;
	const IDEAL_16X9 = 16 / 9;
	const viewportDelta16x10 = Math.abs(ratio - IDEAL_16X10);
	const viewportDelta16x9 = Math.abs(ratio - IDEAL_16X9);
	// Aspect detection prefers avail dims (full-monitor ratio minus Dock still reads
	// closer to the true aspect than a windowed viewport does).
	const ratioScreenW = screen?.availWidth ?? screen?.width ?? viewportW;
	const ratioScreenH = screen?.availHeight ?? screen?.height ?? viewportH;
	const screenRatio =
		ratioScreenW > 0 && ratioScreenH > 0 ? ratioScreenW / ratioScreenH : ratio;
	const screenDelta16x10 = Math.abs(screenRatio - IDEAL_16X10);
	const screenDelta16x9 = Math.abs(screenRatio - IDEAL_16X9);
	const isSixteenByTenish = viewportDelta16x10 <= 0.14 || screenDelta16x10 <= 0.14;
	const isSixteenByNineish = viewportDelta16x9 <= 0.08 || screenDelta16x9 <= 0.08;

	// Near-match/interpolation use RAW screen dims (see header comment).
	const matchScreenW = screen?.width ?? viewportW;
	const matchScreenH = screen?.height ?? viewportH;

	const pickFromTable = (
		table: ZoomMapEntry[],
		points: ZoomPoint[],
		fallback: number
	) => {
		const findNearMatch = (w: number, h: number) =>
			table.find(
				(entry) =>
					Math.abs(w - entry.w) <= ZOOM_MATCH_TOLERANCE_PX &&
					Math.abs(h - entry.h) <= ZOOM_MATCH_TOLERANCE_PX
			);

		const interpolateZoom = (w: number, h: number) => {
			const metric = Math.hypot(w, h);
			if (!Number.isFinite(metric) || metric <= 0 || points.length === 0) {
				return fallback;
			}
			const first = points[0];
			const last = points[points.length - 1];
			if (metric <= first.metric) return first.zoom;
			if (metric >= last.metric) return last.zoom;
			for (let i = 0; i < points.length - 1; i++) {
				const a = points[i];
				const b = points[i + 1];
				if (metric < a.metric || metric > b.metric) continue;
				const denom = b.metric - a.metric;
				const t = denom > 0 ? (metric - a.metric) / denom : 0;
				return a.zoom + (b.zoom - a.zoom) * t;
			}
			return fallback;
		};

		const distanceToMap = (w: number, h: number) => {
			let best = Number.POSITIVE_INFINITY;
			for (const entry of points) {
				best = Math.min(best, Math.hypot(w - entry.w, h - entry.h));
			}
			return best;
		};

		// Prefer a tuned near-match when possible (screen first, then viewport).
		const screenNearMatch = findNearMatch(matchScreenW, matchScreenH);
		if (screenNearMatch) return screenNearMatch.zoom;
		const viewportNearMatch = findNearMatch(viewportW, viewportH);
		if (viewportNearMatch) return viewportNearMatch.zoom;
		// Otherwise interpolate smoothly between the two nearest tuned points,
		// choosing whichever dimensions are "closer" to our tuned resolution set.
		const screenDistance = distanceToMap(matchScreenW, matchScreenH);
		const viewportDistance = distanceToMap(viewportW, viewportH);
		const useViewportDims = viewportDistance + 0.5 < screenDistance; // bias ties toward screen dims
		const w = useViewportDims ? viewportW : matchScreenW;
		const h = useViewportDims ? viewportH : matchScreenH;
		return interpolateZoom(w, h);
	};

	let targetZoom = MURMUR_CHROME_ZOOM_DEFAULT;
	if (isSixteenByTenish) {
		targetZoom = pickFromTable(
			SIXTEEN_BY_TEN_ZOOM_MAP,
			SIXTEEN_BY_TEN_ZOOM_POINTS,
			SIXTEEN_BY_TEN_FALLBACK_ZOOM
		);
	} else if (isSixteenByNineish) {
		targetZoom = pickFromTable(
			SIXTEEN_BY_NINE_ZOOM_MAP,
			SIXTEEN_BY_NINE_ZOOM_POINTS,
			SIXTEEN_BY_NINE_FALLBACK_ZOOM
		);
	}

	// --- Dock / windowed zoom overrides ---
	// Keep these rules narrow + ordered so they're easy to reason about and don't
	// accidentally affect unrelated resolutions. They apply after the resolution map
	// and fire on VIEWPORT dims, so both pages agree in windowed setups too.
	if (viewportW >= 1400 && viewportH <= 780) {
		// Wide-but-short windows (often due to macOS Dock / non-maximized browser
		// windows) can feel too zoomed out; prefer allowing scroll instead of
		// shrinking indefinitely.
		targetZoom = clampZoom(targetZoom, 0.7);
	}
	if (viewportW >= 1900 && viewportW <= 2050 && viewportH >= 1180 && viewportH <= 1245) {
		// ~1952x1220 with Dock: 1920x1200 tuned zoom feels a hair too large.
		targetZoom = clampZoom(targetZoom, MURMUR_CHROME_ZOOM_MIN, 0.93);
	}
	if (viewportW >= 2100 && viewportW <= 2200 && viewportH >= 1320 && viewportH <= 1380) {
		// ~2144x1340 with Dock: custom preference bump.
		targetZoom = clampZoom(targetZoom, 1.2);
	}

	// Guardrails: keep zoom within sane bounds (prevents accidental extreme values).
	return clampZoom(targetZoom);
};

export const getMurmurChromeZoomForWindow = (): number => {
	if (typeof window === 'undefined') return MURMUR_CHROME_ZOOM_DEFAULT;
	return computeMurmurChromeZoomForViewport(
		window.innerWidth,
		window.innerHeight,
		window.screen
	);
};
