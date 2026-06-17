import type { SearchMode } from './types';
import {
	BOOKING_EXTRA_TITLE_PREFIXES,
	DEFAULT_RESULT_DOT_COLOR,
	LOCKED_STATE_MARKER_BIAS_SHARE_MAX,
	LOCKED_STATE_MARKER_BIAS_SHARE_MIN,
	LOCKED_STATE_MARKER_BIAS_ZOOM_END,
	LOCKED_STATE_MARKER_BIAS_ZOOM_START,
	PROMOTION_OVERLAY_TITLE_PREFIXES,
	RESULT_DOT_GLOW_OPACITY,
	RESULT_DOT_SCALE_MAX,
	RESULT_DOT_SCALE_MIN,
	RESULT_DOT_STROKE_WEIGHT_MAX_PX,
	RESULT_DOT_STROKE_WEIGHT_MIN_PX,
	RESULT_DOT_ZOOM_MAX,
	RESULT_DOT_ZOOM_MIN,
} from './constants';
import { clamp } from './math';

// ============================================================================
// Mapbox expression helpers (dot opacity wrappers)
// ============================================================================

export const withResultDotGlowOpacity = (dotOpacityExpr: unknown) =>
	['*', RESULT_DOT_GLOW_OPACITY, dotOpacityExpr] as any;

export const withCategorizedDotOpacity = (dotOpacityExpr: unknown) =>
	[
		'case',
		['boolean', ['get', 'isUncategorized'], false],
		0,
		dotOpacityExpr,
	] as any;

// ============================================================================
// Title prefix matchers
// ============================================================================

export const startsWithCaseInsensitive = (
	value: string | null | undefined,
	prefix: string
): boolean => {
	if (!value) return false;
	const p = prefix.trim().toLowerCase();
	if (!p) return false;
	return value.trim().toLowerCase().startsWith(p);
};

export const getBookingTitlePrefixFromContactTitle = (
	title: string | null | undefined
): string | null => {
	if (!title) return null;
	for (const prefix of BOOKING_EXTRA_TITLE_PREFIXES) {
		if (startsWithCaseInsensitive(title, prefix)) return prefix;
	}
	return null;
};

export const isPromotionOverlayListTitle = (
	title: string | null | undefined
): boolean => {
	if (!title) return false;
	return PROMOTION_OVERLAY_TITLE_PREFIXES.some((p) =>
		startsWithCaseInsensitive(title, p)
	);
};

// Promotion overlay pins should use the Radio Stations visual language (icon + color).
export const getPromotionOverlayWhatFromContactTitle = (
	title: string | null | undefined
): string | null => (isPromotionOverlayListTitle(title) ? 'Radio Stations' : null);

// ============================================================================
// Search mode inference
// ============================================================================

export const extractSearchModeFromQueryPrefix = (
	query: string | null | undefined
): SearchMode | null => {
	const s = (query ?? '').trim().toLowerCase();
	if (s.startsWith('[booking]')) return 'booking';
	if (s.startsWith('[promotion]')) return 'promotion';
	return null;
};

// When the query string no longer embeds "[Booking]"/"[Promotion]", infer mode from the
// dashboard's structured "What" input so overlays + pin styling behave the same.
export const inferSearchModeFromSearchWhat = (
	searchWhat: string | null | undefined
): SearchMode | null => {
	const w = (searchWhat ?? '').trim().toLowerCase();
	if (!w) return null;

	// Promotion modes (radio outreach)
	if (
		w.includes('radio station') ||
		w.includes('radio stations') ||
		w.includes('college radio')
	) {
		return 'promotion';
	}

	// Booking modes (venues/restaurants/etc.)
	if (
		w === 'venues' ||
		w === 'venue' ||
		w.includes('music venue') ||
		w.includes('restaurant') ||
		w.includes('coffee shop') ||
		w === 'festivals' ||
		w === 'festival' ||
		w.includes('music festival') ||
		w.includes('brewery') ||
		w.includes('winery') ||
		w.includes('distillery') ||
		w.includes('cidery') ||
		w.includes('wedding planner') ||
		w.includes('wedding venue') ||
		w.includes('wine, beer') ||
		w.includes('wine beer')
	) {
		return 'booking';
	}

	return null;
};

// ============================================================================
// "What" key normalization + dot color tables
// ============================================================================

export const normalizeWhatKey = (value: string): string =>
	value
		.trim()
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');

// Booking overlay "alcohol" subcategories should be treated as part of the broader
// "Wine, Beer, and Spirits" search "What" (even though the overlay titles are
// "Wineries <state>", "Breweries <state>", etc).
export const WINE_BEER_SPIRITS_WHAT_KEY = normalizeWhatKey('Wine, Beer, and Spirits');
export const WINE_BEER_SPIRITS_BOOKING_PREFIX_KEYS = new Set<string>([
	normalizeWhatKey('Wineries'),
	normalizeWhatKey('Breweries'),
	normalizeWhatKey('Distilleries'),
	normalizeWhatKey('Cideries'),
]);

export const bookingTitlePrefixMatchesSearchWhatKey = (
	prefix: string,
	normalizedSearchWhatKey: string
): boolean => {
	const prefixKey = normalizeWhatKey(prefix);
	if (prefixKey === normalizedSearchWhatKey) return true;
	if (
		normalizedSearchWhatKey === WINE_BEER_SPIRITS_WHAT_KEY &&
		WINE_BEER_SPIRITS_BOOKING_PREFIX_KEYS.has(prefixKey)
	) {
		return true;
	}
	return false;
};

export const WHAT_TO_RESULT_DOT_COLOR: Record<string, string> = {
	[normalizeWhatKey('Radio Stations')]: '#56DA73',
	[normalizeWhatKey('Venues')]: '#00CBFB',
	[normalizeWhatKey('Music Venues')]: '#00CBFB',
	[normalizeWhatKey('Festivals')]: '#2D27DC',
	[normalizeWhatKey('Music Festivals')]: '#2D27DC',
	[normalizeWhatKey('Restaurants')]: '#1EA300',
	[normalizeWhatKey('Coffee Shops')]: '#8BD003',
	[normalizeWhatKey('Wedding Planners')]: '#D6990A',
	[normalizeWhatKey('Wine Beer and spirits')]: '#981AEC',
	[normalizeWhatKey('Wine, Beer, and Spirits')]: '#981AEC',
	[normalizeWhatKey('Wine, Beer, Spirits')]: '#981AEC',
	// Booking extras: map alcohol-related categories to the Wine/Beer/Spirits palette.
	[normalizeWhatKey('Breweries')]: '#981AEC',
	[normalizeWhatKey('Wineries')]: '#981AEC',
	[normalizeWhatKey('Distilleries')]: '#981AEC',
	[normalizeWhatKey('Cideries')]: '#981AEC',
	// Booking extras: show wedding venues with the same palette as wedding planners.
	[normalizeWhatKey('Wedding Venues')]: '#D6990A',
};

// Hover tooltip title-box fill colors by search "What" value.
// Match the category dropdown icon background palette.
export const WHAT_TO_HOVER_TOOLTIP_FILL_COLOR: Record<string, string> = {
	// Promotion: match the search tray palette.
	[normalizeWhatKey('Radio Stations')]: '#56DA73',
	[normalizeWhatKey('Venues')]: '#71C9FD',
	[normalizeWhatKey('Music Venues')]: '#71C9FD',

	[normalizeWhatKey('Wine, Beer, and Spirits')]: '#80AAFF',
	[normalizeWhatKey('Wine, Beer, Spirits')]: '#80AAFF',
	[normalizeWhatKey('Wine Beer and Spirits')]: '#80AAFF',
	[normalizeWhatKey('Wine Beer Spirits')]: '#80AAFF',
	[normalizeWhatKey('Breweries')]: '#80AAFF',
	[normalizeWhatKey('Wineries')]: '#80AAFF',
	[normalizeWhatKey('Distilleries')]: '#80AAFF',
	[normalizeWhatKey('Cideries')]: '#80AAFF',
	// Defensive: handle a misspelling we've seen in copy.
	[normalizeWhatKey('Wine, Beer, and Spiriti')]: '#80AAFF',
	[normalizeWhatKey('Wine Beer and Spiriti')]: '#80AAFF',
	[normalizeWhatKey('Wine Beer Spiriti')]: '#80AAFF',

	[normalizeWhatKey('Restaurants')]: '#77DD91',
	[normalizeWhatKey('Coffee Shops')]: '#A9DE78',
	[normalizeWhatKey('Wedding Planners')]: '#EED56E',
	[normalizeWhatKey('Wedding Venues')]: '#EED56E',
	[normalizeWhatKey('Festivals')]: '#80AAFF',
	[normalizeWhatKey('Music Festivals')]: '#80AAFF',
};

// Hover tooltip top-card fill colors by search "What" value.
// Match the faded category backgrounds used by the Showing rail.
export const WHAT_TO_HOVER_TOOLTIP_BODY_FILL_COLOR: Record<string, string> = {
	[normalizeWhatKey('Radio Stations')]: '#C5F0CC',
	[normalizeWhatKey('Venues')]: '#B7E5FF',
	[normalizeWhatKey('Music Venues')]: '#B7E5FF',

	[normalizeWhatKey('Wine, Beer, and Spirits')]: '#BFC4FF',
	[normalizeWhatKey('Wine, Beer, Spirits')]: '#BFC4FF',
	[normalizeWhatKey('Wine Beer and Spirits')]: '#BFC4FF',
	[normalizeWhatKey('Wine Beer Spirits')]: '#BFC4FF',
	[normalizeWhatKey('Breweries')]: '#BFC4FF',
	[normalizeWhatKey('Wineries')]: '#BFC4FF',
	[normalizeWhatKey('Distilleries')]: '#BFC4FF',
	[normalizeWhatKey('Cideries')]: '#BFC4FF',
	[normalizeWhatKey('Wine, Beer, and Spiriti')]: '#BFC4FF',
	[normalizeWhatKey('Wine Beer and Spiriti')]: '#BFC4FF',
	[normalizeWhatKey('Wine Beer Spiriti')]: '#BFC4FF',

	[normalizeWhatKey('Restaurants')]: '#C3FBD1',
	[normalizeWhatKey('Coffee Shops')]: '#D6F1BD',
	[normalizeWhatKey('Wedding Planners')]: '#FFF8DC',
	[normalizeWhatKey('Wedding Venues')]: '#FFF8DC',
	[normalizeWhatKey('Festivals')]: '#C1D6FF',
	[normalizeWhatKey('Music Festivals')]: '#C1D6FF',
};

export const getResultDotColorForWhat = (searchWhat?: string | null): string => {
	if (!searchWhat) return DEFAULT_RESULT_DOT_COLOR;
	const key = normalizeWhatKey(searchWhat);
	return WHAT_TO_RESULT_DOT_COLOR[key] ?? DEFAULT_RESULT_DOT_COLOR;
};

// ============================================================================
// Dot sizing / locked-state bias
// ============================================================================

export const getResultDotTForZoom = (zoom: number): number => {
	const clampedZoom = clamp(zoom, RESULT_DOT_ZOOM_MIN, RESULT_DOT_ZOOM_MAX);
	return (
		(clampedZoom - RESULT_DOT_ZOOM_MIN) / (RESULT_DOT_ZOOM_MAX - RESULT_DOT_ZOOM_MIN)
	);
};

export const getResultDotScaleForZoom = (zoom: number): number => {
	const t = getResultDotTForZoom(zoom);
	return RESULT_DOT_SCALE_MIN + t * (RESULT_DOT_SCALE_MAX - RESULT_DOT_SCALE_MIN);
};

export const getResultDotStrokeWeightForZoom = (zoom: number): number => {
	const t = getResultDotTForZoom(zoom);
	return (
		RESULT_DOT_STROKE_WEIGHT_MIN_PX +
		t * (RESULT_DOT_STROKE_WEIGHT_MAX_PX - RESULT_DOT_STROKE_WEIGHT_MIN_PX)
	);
};

export const getLockedStateMarkerShareForZoom = (zoom: number): number => {
	const denom = LOCKED_STATE_MARKER_BIAS_ZOOM_END - LOCKED_STATE_MARKER_BIAS_ZOOM_START;
	if (!Number.isFinite(denom) || denom <= 0) return LOCKED_STATE_MARKER_BIAS_SHARE_MIN;
	const t = clamp((zoom - LOCKED_STATE_MARKER_BIAS_ZOOM_START) / denom, 0, 1);
	return (
		LOCKED_STATE_MARKER_BIAS_SHARE_MAX +
		t * (LOCKED_STATE_MARKER_BIAS_SHARE_MIN - LOCKED_STATE_MARKER_BIAS_SHARE_MAX)
	);
};

// ============================================================================
// Generic Mapbox opacity expression scaler
// ============================================================================

export const scaleMapboxOpacityExpr = (expr: any, mul: number): any => {
	if (typeof expr === 'number') return expr * mul;
	if (!Array.isArray(expr) || expr.length === 0) return expr;

	const op = expr[0];

	if (op === 'interpolate') {
		// ['interpolate', method, input, z1, v1, z2, v2, ...]
		const result = [...expr];
		for (let i = 4; i < result.length; i += 2) {
			result[i] = scaleMapboxOpacityExpr(result[i], mul);
		}
		return result;
	}

	if (op === 'step') {
		// ['step', input, defaultVal, z1, v1, z2, v2, ...]
		const result = [...expr];
		result[2] = scaleMapboxOpacityExpr(result[2], mul);
		for (let i = 4; i < result.length; i += 2) {
			result[i] = scaleMapboxOpacityExpr(result[i], mul);
		}
		return result;
	}

	if (op === 'case') {
		// ['case', cond1, val1, cond2, val2, ..., fallback]
		const result = [...expr];
		for (let i = 2; i < result.length - 1; i += 2) {
			result[i] = scaleMapboxOpacityExpr(result[i], mul);
		}
		result[result.length - 1] = scaleMapboxOpacityExpr(result[result.length - 1], mul);
		return result;
	}

	return expr;
};
