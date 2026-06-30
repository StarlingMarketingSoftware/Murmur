/**
 * Smart label parsing for the lightweight (Airbnb-style) compact overlay pills.
 *
 * The compact pills only have room for a couple of words, so a long source name
 * (company / venue / person) is shortened to its first couple of "significant"
 * words. The naive approach — `words.slice(0, 2).join(' ')` — produces dangling,
 * open-ended labels such as:
 *
 *   "Washington & Jefferson College" -> "Washington &"
 *   "Lewis and Clark College"        -> "Lewis and"
 *   "University of Pittsburgh"        -> "University of"
 *
 * A label must never *end* on a conjunction, article, joining preposition, or a
 * connector symbol (&, +, /, -). This module keeps a small, fixed budget of
 * significant words but:
 *   1. "Bridges" a connector that sits *between* significant words so the natural
 *      phrase is preserved ("Washington & Jefferson", "University of Pittsburgh"),
 *      without the connector consuming the significant-word budget.
 *   2. Strips any connector / open-ended token (and dangling punctuation) that
 *      would otherwise be left at the very end.
 *
 * The first token of a name is always protected — a leading "The", "A", "&"
 * (e.g. "The Odeon", "&pizza") is part of the name, not a dangling connector.
 */

/** Default number of "significant" (non-connector) words kept in a pill label. */
export const COMPACT_OVERLAY_LABEL_MAX_WORDS = 2;

/**
 * Tokens that read as "open-ended" when they trail a label. Kept intentionally
 * focused: coordinating conjunctions, articles, joining prepositions that almost
 * always expect a continuation, a few proper-name particles, and connector
 * symbols. Spatial prepositions that frequently *end* real names ("in", "on",
 * "up", "out", "over", "under", "below", "above", "by"...) are deliberately
 * excluded so names like "Five Below" or "Stand Up" are not mangled.
 */
const CONNECTOR_TOKENS: ReadonlySet<string> = new Set([
	// coordinating conjunctions
	'and',
	'or',
	'nor',
	'but',
	'yet',
	'so',
	// spoken "n" joiner ("Rock n Roll", "Mac n Cheese")
	'n',
	// articles
	'a',
	'an',
	'the',
	// joining prepositions / comparatives that signal an incomplete phrase
	'of',
	'at',
	'to',
	'for',
	'with',
	'from',
	'into',
	'onto',
	'upon',
	'as',
	'than',
	'per',
	'via',
	'vs',
	'versus',
	'and/or',
	// proper-name particles ("Cirque du Soleil", "Café de la ...", "Van ...")
	'de',
	'del',
	'du',
	'di',
	'da',
	'la',
	'le',
	'von',
	'van',
	// connector symbols
	'&',
	'+',
	'/',
	'-',
	'\u2013', // en dash
	'\u2014', // em dash
]);

/**
 * Normalize a raw token for connector matching: lowercase and strip surrounding
 * punctuation/quotes (but keep the connector symbols & + / - themselves), so
 * "and,", "&.", "'n'" all resolve to their bare form.
 */
const normalizeToken = (token: string): string =>
	token
		.toLowerCase()
		.replace(/^[^\p{L}\p{N}&+/\-\u2013\u2014]+/u, '')
		.replace(/[^\p{L}\p{N}&+/\-\u2013\u2014]+$/u, '');

/** True when a standalone token is an open-ended connector word/symbol. */
export const isConnectorToken = (token: string): boolean =>
	CONNECTOR_TOKENS.has(normalizeToken(token));

const cleanJoinedLabel = (rawWords: string[]): string => {
	const words = [...rawWords];

	// Defensive: remove any trailing connector tokens (e.g. the source itself
	// ended on "and"/"&", or data was malformed). Never strip the first token.
	while (words.length > 1 && isConnectorToken(words[words.length - 1]!)) {
		words.pop();
	}

	// Remove trailing dangling punctuation/symbols left attached to the final
	// word ("Smith," -> "Smith", "Rock &" -> "Rock"). Periods are preserved so
	// abbreviations ("Co.", "Inc.", "St.") keep their dot.
	return words
		.join(' ')
		.replace(/[\s&+/,;:\u2013\u2014-]+$/u, '')
		.trim();
};

/**
 * Build a compact pill label from a source name. Returns a label that fits the
 * significant-word budget, preserves bridged connectors between significant
 * words, and never ends on an open-ended conjunction/preposition/article/symbol.
 *
 * Returns an empty string only when the source has no usable word characters
 * (callers supply their own final fallback such as "Unknown").
 */
export const buildCompactOverlayLabel = (
	rawSource: string | null | undefined,
	maxSignificantWords: number = COMPACT_OVERLAY_LABEL_MAX_WORDS
): string => {
	const budget = Math.max(1, Math.floor(maxSignificantWords));
	const words = (rawSource ?? '')
		// Drop bracket characters (kept from the original behavior) so parenthetical
		// noise doesn't eat the word budget.
		.replace(/[(){}[\]<>]/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (words.length === 0) return '';

	const out: string[] = [];
	let significant = 0;

	for (const word of words) {
		// The first token is always treated as significant content — a leading
		// article/symbol ("The Odeon", "&pizza") is part of the name.
		const isBridgingConnector = out.length > 0 && isConnectorToken(word);
		// Stop once the significant-word budget is spent. We also stop here for a
		// connector so we never append a connector we'd only have to strip.
		if (significant >= budget) break;
		out.push(word);
		if (!isBridgingConnector) significant += 1;
	}

	let label = cleanJoinedLabel(out);

	// If stripping emptied the label (source was only connectors/symbols), fall
	// back to the raw first token so we still show something.
	if (!label) label = words[0]!;

	return label;
};

/**
 * Make an already parsed compact label fit a rendered pill without cutting in
 * the middle of a word. If the whole label would overflow, drop complete trailing
 * words and then re-clean dangling connectors. This prevents visual labels like
 * "Allegheny Colle" or a faded "Washington &" when the true parsed label is too
 * wide for the max pill.
 */
export const shrinkCompactOverlayLabelToFit = (
	label: string,
	fitsLabel: (candidate: string) => boolean
): string => {
	const trimmed = label.trim();
	if (!trimmed || fitsLabel(trimmed)) return trimmed;

	const words = trimmed.split(/\s+/).filter(Boolean);
	if (words.length <= 1) return trimmed;

	for (let keep = words.length - 1; keep >= 1; keep -= 1) {
		const candidate = cleanJoinedLabel(words.slice(0, keep));
		if (!candidate) continue;
		if (fitsLabel(candidate)) return candidate;
	}

	return cleanJoinedLabel([words[0]!]) || words[0]!;
};
