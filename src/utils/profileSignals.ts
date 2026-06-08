import {
	BOOKING_CONTACT_TITLE_PREFIXES,
	type BookingContactTitlePrefix,
} from '@/constants/contactCategories';

/**
 * Profile search "mapper" — the single place a user's Identity is interpreted
 * into deterministic search signals for the dashboard's Profile mode. This is the
 * seam where a future LLM enrichment step would plug in: replace the body of
 * `deriveProfileSearchSignals` and every downstream consumer keeps working
 * unchanged because it depends only on the returned shape.
 *
 * Everything here is SOFT: the signals bias retrieval/ranking, they never become
 * hard filters. Explicit user input (a typed place/category/word) always wins on
 * the server side; these signals are only applied where the user left a gap.
 */

// Structural subset of the Prisma `Identity` we actually read, so callers can
// pass `campaign.identity` (CampaignWithRelations) without a cast.
export interface ProfileIdentityInput {
	genre?: string | null;
	area?: string | null;
	bio?: string | null;
	name?: string | null;
	bandName?: string | null;
}

export interface ProfileSearchSignals {
	/** Raw genre, lightly normalized. Server tokenizes it for a soft ranking multiplier. */
	genre: string | null;
	/** Genre + a few deduped bio keywords. Appended to the embedding text ONLY. */
	embedText: string | null;
	/** Raw area string. Server geocodes it via the existing free-text parser. */
	areaText: string | null;
	/**
	 * Genre → a subset of the curated/For-You categories, used to TIGHTEN (not
	 * hard-filter) the empty-query "tailored For-You" search. Either null or a
	 * subset of length >= 2 drawn from the curated set; never `[]` (which would
	 * over-filter the curated tray to nothing).
	 */
	categorySubset: BookingContactTitlePrefix[] | null;
}

const trimToNull = (value?: string | null): string | null => {
	const v = (value ?? '').trim();
	return v.length > 0 ? v : null;
};

/**
 * Stable, normalized signature of the profile signals that actually influence a
 * search. Used as part of the result-cache identity so profile-tailored results
 * never collide with non-profile ones, and an identity edit (which changes the
 * derived signals) busts stale cache entries. Empty string => no profile signal.
 * The fresh-search and rehydration paths MUST build the key with this same fn.
 */
export const buildProfileSig = (
	genre?: string | null,
	embedText?: string | null,
	areaText?: string | null
): string =>
	[genre, embedText, areaText]
		.map((v) => (v ?? '').trim())
		.filter(Boolean)
		.join('|')
		.toLowerCase();

/** True when at least one identity field carries a usable search signal. */
export const hasUsableProfileSignals = (
	identity?: ProfileIdentityInput | null
): boolean =>
	!!(
		trimToNull(identity?.genre) ||
		trimToNull(identity?.area) ||
		trimToNull(identity?.bio)
	);

// The curated/For-You engine serves the booking categories minus Wedding
// Planners (mirrors CURATED_CATEGORIES in runCuratedNearbyPicks.ts). A genre
// subset must be drawn from this set; derived from the shared constant to stay
// in sync without importing server-only code.
const CURATED_CATEGORY_SET: readonly BookingContactTitlePrefix[] =
	BOOKING_CONTACT_TITLE_PREFIXES.filter((p) => p !== 'Wedding Planners');

// Live-music hosts that fit essentially any performing artist; included whenever
// a genre is recognized so the tailored tray still feels broad ("For-You-like").
const UNIVERSAL_MUSIC_CATEGORIES: BookingContactTitlePrefix[] = [
	'Music Venues',
	'Music Festivals',
];

// Genre → additional curated categories. Every matching rule's categories are
// unioned (genre is often a CSV like "electronic, indie pop").
const GENRE_CATEGORY_RULES: { re: RegExp; cats: BookingContactTitlePrefix[] }[] = [
	{ re: /rock|indie|punk|metal|emo|garage|grunge|alt/, cats: ['Breweries'] },
	{
		re: /folk|country|bluegrass|americana|acoustic|singer|songwriter/,
		cats: ['Restaurants', 'Coffee Shops', 'Wineries'],
	},
	{
		re: /jazz|blues|soul|funk|r&b|rnb/,
		cats: ['Restaurants', 'Wineries', 'Distilleries'],
	},
	{
		re: /electronic|edm|house|techno|dubstep|\bdj\b|hip\s?hop|\brap\b|trap/,
		cats: ['Breweries'],
	},
	{
		re: /classical|orchestr|chamber|opera|symphon|choral/,
		cats: ['Wedding Venues', 'Wineries'],
	},
	{ re: /pop\b/, cats: ['Coffee Shops'] },
	{ re: /wedding|cover band|covers/, cats: ['Wedding Venues', 'Wineries'] },
];

const MAX_GENRE_CATEGORIES = 6;

/**
 * Map a free-text genre to a curated category subset for the empty-query
 * "tailored For-You" path. Returns null when the genre is blank or unrecognized
 * (the caller then falls back to plain For-You — the recall floor). Never returns
 * a subset smaller than the two universal music categories.
 */
export const genreToCuratedCategories = (
	genre?: string | null
): BookingContactTitlePrefix[] | null => {
	const g = (genre ?? '').toLowerCase();
	if (!g.trim()) return null;
	const matched = new Set<BookingContactTitlePrefix>();
	for (const rule of GENRE_CATEGORY_RULES) {
		if (rule.re.test(g)) rule.cats.forEach((c) => matched.add(c));
	}
	if (matched.size === 0) return null; // unrecognized genre → plain For-You
	UNIVERSAL_MUSIC_CATEGORIES.forEach((c) => matched.add(c));
	// Order by the curated set for stable output; cap so it stays "tighter" than
	// the full tray.
	const ordered = CURATED_CATEGORY_SET.filter((c) => matched.has(c)).slice(
		0,
		MAX_GENRE_CATEGORIES
	);
	return ordered.length >= 2 ? ordered : null;
};

const BIO_STOPWORDS = new Set([
	'the','and','for','with','our','out','are','was','were','that','this','from',
	'have','has','had','their','they','them','you','your','who','what','when',
	'where','about','into','over','under','than','then','also','very','just',
	'more','most','some','any','all','can','will','would','been','being','based',
	'music','band','artist','musician','sound','songs','song','album','live',
]);

const MAX_BIO_KEYWORDS = 5;
const MAX_EMBED_TEXT_LEN = 200;

// The sender's own identifying words (name/bandName/area) describe the sender,
// not the search target, so they are excluded from bio keywords.
const ownTokenSet = (identity: ProfileIdentityInput): Set<string> => {
	const own = `${identity.name ?? ''} ${identity.bandName ?? ''} ${identity.area ?? ''}`
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean);
	return new Set(own);
};

const extractBioKeywords = (
	bio: string | null,
	identity: ProfileIdentityInput
): string[] => {
	if (!bio) return [];
	const own = ownTokenSet(identity);
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of bio.toLowerCase().split(/[^a-z0-9]+/)) {
		const tok = raw.trim();
		if (tok.length < 3) continue;
		if (BIO_STOPWORDS.has(tok)) continue;
		if (own.has(tok)) continue;
		if (seen.has(tok)) continue;
		seen.add(tok);
		out.push(tok);
		if (out.length >= MAX_BIO_KEYWORDS) break;
	}
	return out;
};

/**
 * The single profile→signals interpreter. Deterministic in v1; swap the body for
 * an async LLM enrichment step later without touching any consumer.
 */
export const deriveProfileSearchSignals = (
	identity?: ProfileIdentityInput | null
): ProfileSearchSignals => {
	if (!identity) {
		return { genre: null, embedText: null, areaText: null, categorySubset: null };
	}
	const genre = trimToNull(identity.genre);
	const areaText = trimToNull(identity.area);
	const bio = trimToNull(identity.bio);

	const bioKeywords = extractBioKeywords(bio, identity);
	const embedParts = [genre, ...bioKeywords].filter(Boolean) as string[];
	const embedText = embedParts.length
		? embedParts.join(' ').slice(0, MAX_EMBED_TEXT_LEN).trim()
		: null;

	return {
		genre,
		embedText,
		areaText,
		categorySubset: genreToCuratedCategories(genre),
	};
};
