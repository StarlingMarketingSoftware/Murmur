import { parseFreeTextSearchQuery } from './parse';

// Routing predicates for /api/contacts/search. Pure functions over the parsed
// query — extracted from route.ts so the branch-dispatch logic (keyword /
// local-business / place-only / curated-category / hybrid) can be exercised by
// the check scripts without importing the route (which drags in Prisma/ES).

export const VAGUE_REST_TOKENS = new Set([
	'best',
	'cool',
	'good',
	'great',
	'local',
	'me',
	'nearby',
	'nice',
	'top',
	// Articles left behind by place stripping ("in the pacific northwest" →
	// "the" once the region phrase is consumed).
	'the',
	'a',
	'an',
	// Directional leftovers from the parser's region guard ("northeast ohio"
	// parses as Ohio with "northeast" remaining) — place words, not intent.
	'northeast',
	'northeastern',
	'northwest',
	'northwestern',
	'southeast',
	'southeastern',
	'southwest',
	'southwestern',
	'midwest',
	'midwestern',
	'upper',
	'central',
]);

export type LocalBusinessIntent = {
	key: string;
	terms: readonly string[];
	patterns: readonly RegExp[];
};

export const LOCAL_BUSINESS_INTENTS: readonly LocalBusinessIntent[] = [
	{
		key: 'bars',
		terms: [
			'bar',
			'bars',
			'pub',
			'pubs',
			'tavern',
			'taverns',
			'lounge',
			'lounges',
			'cocktail',
			'cocktails',
			'nightclub',
			'nightclubs',
			'taproom',
			'taprooms',
			'brewpub',
			'brewpubs',
		],
		patterns: [
			/\bbars?\b/i,
			/\bpubs?\b/i,
			/\btaverns?\b/i,
			/\blounges?\b/i,
			/\bcocktail\b/i,
			/\bnight\s?clubs?\b/i,
			/\btaprooms?\b/i,
			/\bbrewpubs?\b/i,
		],
	},
];

export const isVagueCategoryRest = (restOfQuery: string): boolean => {
	const normalized = restOfQuery.toLowerCase().replace(/\s+/g, ' ').trim();
	if (!normalized) return true;
	const tokens = normalized.split(' ').filter(Boolean);
	if (tokens.length === 0) return true;
	return tokens.every((token) => VAGUE_REST_TOKENS.has(token));
};

// Place-only fallback detector: the user typed nothing but a place (a city or
// state, optionally wrapped in filler tokens like "best" / "nearby"). With no
// category to anchor on and no substantive descriptor, the cleanest answer is
// the same balanced, live-music-prioritized tray the curated picks tray shows
// — just anchored at the parsed place instead of the user's IP location. The
// hybrid retriever path falls back to a generic vibe match for these queries
// and rarely returns anything useful.
export const isPlaceOnlyQuery = (
	parsed: ReturnType<typeof parseFreeTextSearchQuery>
): boolean => {
	return (
		parsed.hadExplicitPlace &&
		!parsed.hadExplicitCategory &&
		isVagueCategoryRest(parsed.restOfQuery)
	);
};

// Tokens that don't carry intent and shouldn't count toward noun-led length.
// VAGUE_REST_TOKENS plus articles/pronouns. "best deli" and "the deli" both
// reduce to one substantive token.
export const NOUN_LED_FILLER_TOKENS = new Set<string>([
	...VAGUE_REST_TOKENS,
	'a',
	'an',
	'the',
	'some',
	'any',
	'few',
	'my',
	'our',
]);

// A query is "noun-led" when the user typed a short business-type noun (or
// two) with no parsed category and no descriptive vibe text. Examples: "deli",
// "bookstore", "italian deli", "best tattoo shop". These need a different
// scoring regime than vibe queries — Path C's default lexical weights leak
// person rows whose headline/metadata mention the noun, and kNN over a one-
// word embedding amplifies the noise. Detected here so retrieval and scoring
// can both adapt.
export const isNounLedQuery = (
	parsed: ReturnType<typeof parseFreeTextSearchQuery>
): boolean => {
	if (parsed.categories.length > 0) return false;
	const tokens = parsed.restOfQuery
		.toLowerCase()
		.split(/\s+/)
		.map((t) => t.trim())
		.filter((t) => t.length > 0 && !NOUN_LED_FILLER_TOKENS.has(t));
	return tokens.length > 0 && tokens.length <= 2;
};

export const resolveLocalBusinessIntent = (
	rawQuery: string
): LocalBusinessIntent | null => {
	const normalized = rawQuery.toLowerCase().replace(/\s+/g, ' ').trim();
	if (!normalized) return null;
	for (const intent of LOCAL_BUSINESS_INTENTS) {
		const matched = intent.patterns.some((pattern) => pattern.test(normalized));
		if (!matched) continue;
		const remaining = normalized
			.split(/\s+/)
			.filter((token) => !VAGUE_REST_TOKENS.has(token))
			.filter((token) => !['near', 'around', 'in', 'at', 'me'].includes(token))
			.filter((token) => !intent.terms.includes(token))
			.join(' ')
			.trim();
		if (!remaining) return intent;
	}
	return null;
};

export type SearchDispatchBranch =
	| 'keyword'
	| 'local-business'
	| 'place-only'
	| 'curated-category'
	| 'hybrid';

// Mirrors the branch-dispatch order in route.ts GET (first match wins). Used
// by check scripts to pin which execution path a query routes into. Keep in
// sync with the route: keywordMode is a request flag, not derivable from the
// query text, so it's a parameter here.
export const resolveSearchDispatchBranch = (
	parsed: ReturnType<typeof parseFreeTextSearchQuery>,
	options?: { keywordMode?: boolean }
): SearchDispatchBranch => {
	if (options?.keywordMode) return 'keyword';
	if (resolveLocalBusinessIntent(parsed.restOfQuery)) return 'local-business';
	if (isPlaceOnlyQuery(parsed)) return 'place-only';
	if (parsed.categories.length > 0 && isVagueCategoryRest(parsed.restOfQuery)) {
		return 'curated-category';
	}
	return 'hybrid';
};
