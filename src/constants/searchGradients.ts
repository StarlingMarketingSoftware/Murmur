// Hero search bar gradient library.
//
// The dashboard search bar shows one of these gradients at a time, picked
// deterministically from the date + AM/PM bucket so the mood shifts twice
// per day. The pick is hash-based (not round-robin) so the visual order
// across days feels shuffled rather than marching through the list.
//
// SEARCH_GRADIENT_DEFAULT is the original magenta/red gradient. It is the
// fallback used by CSS when JS hasn't applied the per-bucket pick yet, and
// it carries extra weight in the weighted selection so it appears slightly
// more often than any individual alternative.

export const SEARCH_GRADIENT_DEFAULT =
	'linear-gradient(90deg, #DA29B4 1.69%, #EA1F1F 34.7%, #E122F2 65.83%, #F00404 98.97%)';

const SEARCH_GRADIENT_ALTERNATES: readonly string[] = [
	'linear-gradient(90deg, #29DAC6 1.69%, #1FAAEA 17.59%, #7C29DA 34.43%, #0D888C 65.83%, #9A17EC 98.97%)',
	'linear-gradient(90deg, #6DDA29 1.69%, #1FAAEA 17.59%, #6DDA29 34.43%, #0D888C 65.83%, #17EC17 98.97%)',
	'linear-gradient(90deg, #6DDA29 1.69%, #E0EA1F 17.59%, #6DDA29 34.43%, #60A038 65.83%, #E1EC17 98.97%)',
	'linear-gradient(90deg, #29DAC0 1.69%, #17D3EC 17.59%, #29DAC0 34.43%, #3863A0 65.83%, #17D3EC 98.97%)',
	'linear-gradient(90deg, #8D29DA 1.69%, #EC17B0 17.59%, #AB29DA 34.43%, #F73F6D 65.83%, #9717EC 98.97%)',
	'linear-gradient(90deg, #DA2952 1.69%, #EC17B0 17.59%, #DA4729 34.43%, #F73F6D 65.83%, #EC8817 98.97%)',
];

// Weighted selection: default at 3, alternates at 2 each.
// Total weight = 3 + 6 * 2 = 15. Default appears 3/15 ≈ 20% of buckets;
// each alternate ≈ 13.3%. Uniform baseline would be 1/7 ≈ 14.3%, so the
// default is a tasteful bump above baseline rather than dominant.
const DEFAULT_WEIGHT = 3;
const ALTERNATE_WEIGHT = 2;

const WEIGHTED_ENTRIES: readonly { gradient: string; weight: number }[] = [
	{ gradient: SEARCH_GRADIENT_DEFAULT, weight: DEFAULT_WEIGHT },
	...SEARCH_GRADIENT_ALTERNATES.map((gradient) => ({ gradient, weight: ALTERNATE_WEIGHT })),
];

const TOTAL_WEIGHT = WEIGHTED_ENTRIES.reduce((sum, entry) => sum + entry.weight, 0);

// djb2 — non-cryptographic, well-distributed for short keys like our bucket
// strings. We just need stable, well-spread integers; this fits.
function hashBucketKey(key: string): number {
	let hash = 5381;
	for (let i = 0; i < key.length; i += 1) {
		hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
	}
	return hash >>> 0;
}

export type SearchGradientBucket = 'AM' | 'PM';

export function getSearchGradientBucket(date: Date): SearchGradientBucket {
	return date.getHours() < 12 ? 'AM' : 'PM';
}

export function getSearchGradientBucketKey(date: Date): string {
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	return `${year}-${month}-${day}-${getSearchGradientBucket(date)}`;
}

export function getSearchGradientForDate(date: Date): string {
	const bucketKey = getSearchGradientBucketKey(date);
	let target = hashBucketKey(bucketKey) % TOTAL_WEIGHT;
	for (const entry of WEIGHTED_ENTRIES) {
		if (target < entry.weight) return entry.gradient;
		target -= entry.weight;
	}
	return SEARCH_GRADIENT_DEFAULT;
}

// Milliseconds from `from` until the next AM/PM bucket boundary (noon or
// midnight, whichever is sooner). Used to schedule a live swap so the
// gradient updates without a page reload when the user is sitting on the
// dashboard across the boundary.
export function getMsUntilNextSearchGradientBucket(from: Date): number {
	const next = new Date(from);
	next.setMinutes(0, 0, 0);
	next.setHours(from.getHours() < 12 ? 12 : 24);
	return next.getTime() - from.getTime();
}

// ── "For You" results-box skin, derived from the day's search-bar gradient ────
//
// The dashboard's curated "For You" results box (header band + rows body) used to
// carry two hard-coded pink/red gradients, so it never matched the hero search
// bar's per-day mood. These helpers instead PASTELIZE the exact gradient the bar
// is showing for the current AM/PM bucket, so the box tracks the same daily color
// scheme as the bar (green day → green box, blue day → blue box, etc.).
//
// The box keeps its own geometry: the header stays horizontal (90deg, matching the
// bar) and slightly more saturated; the body stays vertical (180deg) and much paler
// so black row text/labels stay legible on top. We mix each stop toward white by a
// fixed amount rather than reusing the bar's saturated colors directly.

// How far each stop is mixed toward white (0 = raw day color, 1 = pure white).
// Header keeps more color than the body; body is a soft, high-legibility wash.
const FOR_YOU_HEADER_WHITE_MIX = 0.48;
const FOR_YOU_BODY_WHITE_MIX = 0.74;

export type ForYouResultsGradients = {
	header: string;
	body: string;
};

type GradientStop = { color: string; offset: string | null };
type ParsedLinearGradient = { angle: string; stops: GradientStop[] };

const clampChannel = (value: number): number =>
	Math.max(0, Math.min(255, Math.round(value)));

const parseHexColor = (raw: string): { r: number; g: number; b: number } | null => {
	const match = /^#([0-9a-fA-F]{6})$/.exec(raw.trim());
	if (!match) return null;
	const int = Number.parseInt(match[1], 16);
	return { r: (int >> 16) & 0xff, g: (int >> 8) & 0xff, b: int & 0xff };
};

const toHexColor = (r: number, g: number, b: number): string => {
	const hex = ((clampChannel(r) << 16) | (clampChannel(g) << 8) | clampChannel(b))
		.toString(16)
		.padStart(6, '0');
	return `#${hex.toUpperCase()}`;
};

// Mix a hex color toward white by `amount` (0..1). Non-hex colors pass through
// unchanged so we never emit something the browser can't parse.
const mixColorTowardWhite = (color: string, amount: number): string => {
	const rgb = parseHexColor(color);
	if (!rgb) return color;
	const clampedAmount = Math.max(0, Math.min(1, amount));
	return toHexColor(
		rgb.r + (255 - rgb.r) * clampedAmount,
		rgb.g + (255 - rgb.g) * clampedAmount,
		rgb.b + (255 - rgb.b) * clampedAmount
	);
};

// Paren-aware split so any future rgb()/rgba() stops (which contain commas) don't
// get torn apart. Today's gradients are all hex, but this keeps the parser robust.
const splitTopLevelCommas = (input: string): string[] => {
	const parts: string[] = [];
	let depth = 0;
	let current = '';
	for (const char of input) {
		if (char === '(') depth += 1;
		else if (char === ')') depth = Math.max(0, depth - 1);
		if (char === ',' && depth === 0) {
			parts.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	if (current.trim().length > 0) parts.push(current);
	return parts;
};

const parseLinearGradient = (gradient: string): ParsedLinearGradient | null => {
	const trimmed = gradient.trim();
	const open = trimmed.indexOf('(');
	if (!trimmed.startsWith('linear-gradient') || open === -1 || !trimmed.endsWith(')')) {
		return null;
	}
	const inner = trimmed.slice(open + 1, -1);
	const tokens = splitTopLevelCommas(inner)
		.map((token) => token.trim())
		.filter((token) => token.length > 0);
	if (tokens.length < 2) return null;
	const [angle, ...stopTokens] = tokens;
	const stops: GradientStop[] = [];
	for (const token of stopTokens) {
		// color then optional position (percentage or length). Handles hex + functional colors.
		const stopMatch = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+\([^)]*\)|[a-zA-Z]+)\s*(.*)$/.exec(
			token
		);
		if (!stopMatch) return null;
		const offset = stopMatch[2].trim();
		stops.push({ color: stopMatch[1], offset: offset.length > 0 ? offset : null });
	}
	if (stops.length === 0) return null;
	return { angle, stops };
};

const buildPastelGradient = (
	parsed: ParsedLinearGradient,
	angle: string,
	whiteMix: number
): string => {
	const stops = parsed.stops.map((stop) => {
		const color = mixColorTowardWhite(stop.color, whiteMix);
		return stop.offset ? `${color} ${stop.offset}` : color;
	});
	return `linear-gradient(${angle}, ${stops.join(', ')})`;
};

// Header keeps the bar's horizontal sweep and more color; body runs vertically
// down the rows and is far paler so black row text/labels stay legible on top.
const deriveForYouGradients = (parsed: ParsedLinearGradient): ForYouResultsGradients => ({
	header: buildPastelGradient(parsed, '90deg', FOR_YOU_HEADER_WHITE_MIX),
	body: buildPastelGradient(parsed, '180deg', FOR_YOU_BODY_WHITE_MIX),
});

// Pastelized fallback (a whitened version of the bar's own magenta/red default),
// used for SSR / first paint before the client effect publishes the live per-day
// values, and whenever a gradient string fails to parse. Defined before the
// builder so there is no forward reference.
export const FOR_YOU_RESULTS_DEFAULT_GRADIENTS: ForYouResultsGradients = (() => {
	const parsed = parseLinearGradient(SEARCH_GRADIENT_DEFAULT);
	// Should never happen for our own constant, but stay defensive.
	if (!parsed) return { header: SEARCH_GRADIENT_DEFAULT, body: SEARCH_GRADIENT_DEFAULT };
	return deriveForYouGradients(parsed);
})();

// Derive the For You results box header/body gradients from an arbitrary bar
// gradient string. Falls back to the pastelized default if the string can't be
// parsed, so callers always get two valid, legible gradients.
export function buildForYouResultsGradients(barGradient: string): ForYouResultsGradients {
	const parsed = parseLinearGradient(barGradient);
	if (!parsed) return FOR_YOU_RESULTS_DEFAULT_GRADIENTS;
	return deriveForYouGradients(parsed);
}

// The per-day pair the dashboard publishes to CSS vars, mirroring
// getSearchGradientForDate for the bar.
export function getForYouResultsGradientsForDate(date: Date): ForYouResultsGradients {
	return buildForYouResultsGradients(getSearchGradientForDate(date));
}
