import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Contact } from '@prisma/client';
import {
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import prisma from '@/lib/prisma';
import {
	countPersonTitleMatches,
	keywordSearchContacts,
	lexicalSearchContacts,
	searchSimilarContacts,
	titlePrefixSearchContacts,
} from '@/app/api/_utils/vectorDb';
import {
	allocateAcrossCategories,
	contactLooksLikeBusinessEntity,
	contactLooksLikeEducationInstitution,
	distributeAcrossBuckets,
	interleaveByCategory,
	liveMusicSignalScore,
	titleHasStateSuffix,
	titleLooksPersonal,
	type CategoryPool,
} from '@/app/api/contacts/curated-search/distribution';
import {
	BOOKING_CONTACT_TITLE_PREFIXES,
	type BookingContactTitlePrefix,
} from '@/constants/contactCategories';
import { US_STATES } from '@/constants/usStates';
import { runCuratedNearbyPicks } from '@/app/api/contacts/curated-search/runCuratedNearbyPicks';
import { parseFreeTextSearchQuery } from './parse';

export const maxDuration = 60;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const PER_RETRIEVER_TAKE = 200;
const RRF_K = 60; // standard reciprocal rank fusion constant
const KNN_TIMEOUT_MS = 8000;
const LEXICAL_TIMEOUT_MS = 6000;
const PREFIX_TIMEOUT_MS = 6000;
// Mirrors curated-search/route.ts. When the user types a vague query (no place
// mentioned), we anchor to their IP-resolved location and use the curated
// default radius — same logic as curated picks. Falls back to a CONUS centroid
// with a 1200km radius when there's no center at all (rare in prod where
// Vercel headers are populated; common locally).
const DEFAULT_LOCALITY_RADIUS_KM = 250;
const FALLBACK_CENTER = { lat: 39.83, lon: -98.58 };
const FALLBACK_BBOX_RADIUS_KM = 1200;
const CURATED_CATEGORY_FETCH_BUFFER = 1.4;
const CURATED_CATEGORY_CANDIDATE_TAKE = 1500;
// National fallback: when a vague implicit-locality query (no place anchor,
// no enforced state) produces near-zero scored results — typically because
// the user typed something out-of-domain like "plumber" or "electrician" the
// booking-focused index has nothing local for — we re-issue lexical+prefix
// without geo, reuse the global kNN we already ran, and re-score with the
// locality multiplier neutralized and the noun-led person/loose hard drop
// relaxed. Cap output low because cross-country matches are inherently
// lower-confidence than the locally-anchored result.
const NATIONAL_FALLBACK_SPARSE_THRESHOLD = 8;
const NATIONAL_FALLBACK_LITERAL_MATCH_FLOOR = 1;
const NATIONAL_FALLBACK_LIMIT_CAP = 18;
const NATIONAL_FALLBACK_LEXICAL_TIMEOUT_MS = 6000;
const NATIONAL_FALLBACK_PREFIX_TIMEOUT_MS = 6000;
const SEARCH_ROUTE_SOFT_BUDGET_MS = 52000;
const SEARCH_ROUTE_SAFETY_MARGIN_MS = 3000;
const SEARCH_ROUTE_PATH_TIMEOUT_MS = 45000;
const SEARCH_ROUTE_PRISMA_TIMEOUT_MS = 8000;

const createRequestId = (): string => Math.random().toString(36).slice(2, 8);

const parseFloatOrNull = (value: string | null): number | null => {
	if (!value) return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
};

const getSearchRouteRemainingMs = (startedAtMs: number): number =>
	Math.max(0, SEARCH_ROUTE_SOFT_BUDGET_MS - (Date.now() - startedAtMs));

const getSearchRouteTimeoutMs = (startedAtMs: number, maxTimeoutMs: number): number =>
	Math.max(
		0,
		Math.min(maxTimeoutMs, getSearchRouteRemainingMs(startedAtMs) - SEARCH_ROUTE_SAFETY_MARGIN_MS)
	);

const withBudgetFallback = async <T,>(
	operation: () => Promise<T>,
	options: {
		timeoutMs: number;
		fallback: T;
		tag: string;
		requestId: string;
	}
): Promise<T> => {
	if (options.timeoutMs <= 0) {
		console.warn(
			`[contacts-search][${options.requestId}] ${options.tag} skipped because route budget is exhausted`
		);
		return options.fallback;
	}

	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let timedOut = false;

	try {
		const timeoutPromise = new Promise<T>((resolve) => {
			timeoutId = setTimeout(() => {
				timedOut = true;
				resolve(options.fallback);
			}, options.timeoutMs);
		});
		const result = await Promise.race([operation(), timeoutPromise]);
		if (timedOut) {
			console.warn(
				`[contacts-search][${options.requestId}] ${options.tag} exceeded ${options.timeoutMs}ms; returning fallback response`
			);
		}
		return result;
	} catch (err) {
		console.warn(
			`[contacts-search][${options.requestId}] ${options.tag} failed; returning fallback response`,
			err
		);
		return options.fallback;
	} finally {
		if (timeoutId) clearTimeout(timeoutId);
	}
};

const withTimeout = async <T,>(
	promise: Promise<T>,
	timeoutMs: number,
	fallback: T,
	tag: string,
	requestId: string
): Promise<T> => {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	try {
		return await Promise.race([
			promise,
			new Promise<T>((resolve) => {
				timeoutId = setTimeout(() => {
					console.warn(`[contacts-search][${requestId}] ${tag} timed out after ${timeoutMs}ms`);
					resolve(fallback);
				}, timeoutMs);
			}),
		]);
	} catch (err) {
		console.warn(`[contacts-search][${requestId}] ${tag} failed`, err);
		return fallback;
	} finally {
		if (timeoutId) clearTimeout(timeoutId);
	}
};

const distanceKm = (
	a: { lat: number; lon: number },
	b: { lat: number; lon: number }
): number => {
	const R = 6371;
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLon = toRad(b.lon - a.lon);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const bboxFromCenter = (
	center: { lat: number; lon: number },
	radiusKm: number
): { south: number; north: number; west: number; east: number } => {
	const dLat = radiusKm / 111;
	const cos = Math.max(0.01, Math.cos((center.lat * Math.PI) / 180));
	const dLon = radiusKm / (111 * cos);
	return {
		south: Math.max(-90, center.lat - dLat),
		north: Math.min(90, center.lat + dLat),
		west: Math.max(-180, center.lon - dLon),
		east: Math.min(180, center.lon + dLon),
	};
};

type CleanlinessTier =
	| 'canonical-clean'
	| 'clean-business'
	| 'clean-person'
	| 'loose';

const CLEANLINESS_MULTIPLIER: Record<CleanlinessTier, number> = {
	'canonical-clean': 4,
	'clean-business': 2,
	'clean-person': 1.2,
	loose: 1,
};

// Carve-out for noun-led queries that an ES probe identified as role-shaped
// ("professor", "janitor", "florist"). The default table puts canonical-clean
// 3.3× ahead of clean-person, which steamrolls people on these queries even
// before the noun-led hard-drop fires. Here clean-person rises to parity with
// canonical-clean so RRF + literal-match decide the order, while
// clean-business stays near person so an org row can still win when its
// title/company directly matches the query.
const PERSON_TARGETED_CLEANLINESS_MULTIPLIER: Record<CleanlinessTier, number> = {
	'canonical-clean': 2.5,
	'clean-business': 2,
	'clean-person': 2.5,
	loose: 1.5,
};

const classifyCleanliness = (c: Contact): CleanlinessTier => {
	// `contactLooksLikeBusinessEntity` only checks for empty firstName/lastName.
	// A row with empty names but title="Communications Director" is shaped like
	// a person, just with the name fields missing — it should never lift to
	// canonical-clean or clean-business. titleLooksPersonal catches that.
	const personalTitle = titleLooksPersonal(c.title);
	if (
		titleHasStateSuffix(c.title) &&
		contactLooksLikeBusinessEntity(c) &&
		!personalTitle
	) {
		return 'canonical-clean';
	}
	if (
		contactLooksLikeBusinessEntity(c) &&
		!contactLooksLikeEducationInstitution(c) &&
		!personalTitle &&
		(c.company?.trim().length ?? 0) > 0
	) {
		return 'clean-business';
	}
	const hasName =
		(c.firstName?.trim().length ?? 0) > 0 ||
		(c.lastName?.trim().length ?? 0) > 0;
	const hasCompany = (c.company?.trim().length ?? 0) > 0;
	if (
		(hasName || personalTitle) &&
		hasCompany &&
		(c.title?.trim().length ?? 0) > 0
	) {
		return 'clean-person';
	}
	return 'loose';
};

const matchesAnyTitlePrefix = (
	title: string | null,
	prefixes: readonly string[]
): boolean => {
	if (!title || prefixes.length === 0) return false;
	const lc = title.toLowerCase();
	return prefixes.some((p) => lc.startsWith(p.toLowerCase()));
};

const EMERGING_ARTIST_SUPPORT_TERMS = [
	'emerging artist',
	'emerging artists',
	'emerging act',
	'emerging acts',
	'local artist',
	'local artists',
	'local act',
	'local acts',
	'new artist',
	'new artists',
	'up-and-coming',
	'up and coming',
	'independent artist',
	'independent artists',
	'indie artist',
	'indie artists',
	'showcase',
	'showcases',
	'open mic',
	'open-mic',
	'singer-songwriter',
	'songwriter night',
	'booking bands',
	'booking acts',
] as const;

const SOFT_DESCRIPTOR_GROUPS: readonly {
	triggers: readonly RegExp[];
	terms: readonly string[];
}[] = [
	{
		triggers: [
			/\bemerging\s+(artists?|acts?)\b/i,
			/\bsupport(?:s|ing)?\s+emerging\b/i,
			/\blocal\s+(artists?|acts?|bands?)\b/i,
			/\bup[-\s]and[-\s]coming\b/i,
			/\bopen\s?mic\b/i,
			/\bshowcases?\b/i,
		],
		terms: EMERGING_ARTIST_SUPPORT_TERMS,
	},
];

const getSoftDescriptorTerms = (restOfQuery: string): readonly string[] => {
	const terms = new Set<string>();
	for (const group of SOFT_DESCRIPTOR_GROUPS) {
		if (!group.triggers.some((trigger) => trigger.test(restOfQuery))) continue;
		for (const term of group.terms) terms.add(term);
	}
	return [...terms];
};

const fieldContainsAnyTerm = (
	value: string | null | undefined,
	terms: readonly string[]
): boolean => {
	if (!value) return false;
	const lc = value.toLowerCase();
	return terms.some((term) => lc.includes(term));
};

const softDescriptorSignalScore = (
	contact: Contact,
	terms: readonly string[]
): number => {
	if (terms.length === 0) return 0;
	let score = 0;
	if (fieldContainsAnyTerm(contact.title, terms)) score += 5;
	if (fieldContainsAnyTerm(contact.company, terms)) score += 4;
	if (fieldContainsAnyTerm(contact.headline, terms)) score += 3;
	if (fieldContainsAnyTerm((contact.companyKeywords ?? []).join(' '), terms)) score += 3;
	if (fieldContainsAnyTerm(contact.metadata, terms)) score += 2;
	if (fieldContainsAnyTerm(contact.companyIndustry, terms)) score += 1;
	if (fieldContainsAnyTerm(contact.companyType, terms)) score += 1;
	return score;
};

const VAGUE_REST_TOKENS = new Set([
	'best',
	'cool',
	'good',
	'great',
	'local',
	'me',
	'nearby',
	'nice',
	'top',
]);

type LocalBusinessIntent = {
	key: string;
	terms: readonly string[];
	patterns: readonly RegExp[];
};

const LOCAL_BUSINESS_INTENTS: readonly LocalBusinessIntent[] = [
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

const isVagueCategoryRest = (restOfQuery: string): boolean => {
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
const isPlaceOnlyQuery = (
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
const NOUN_LED_FILLER_TOKENS = new Set<string>([
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
const isNounLedQuery = (
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

// Threshold of person-shaped title matches that flips a noun-led query into
// "person-targeted" mode. Tuned conservatively: queries like "professor" or
// "janitor" easily clear this against a real-world index, while plausibly
// ambiguous business nouns ("deli", "bookstore") stay below it because almost
// no person-shaped rows have those words in their title.
const PERSON_TARGET_MATCH_THRESHOLD = 8;
const PERSON_TARGET_PROBE_TIMEOUT_MS = 2500;

// Detects oddball noun-led queries that should surface people, not just
// venues. Runs a single ES `count` against the title field with canonical
// venue prefixes excluded — if enough non-venue rows have the query text in
// their title, we assume the user is asking about a role/profession and
// relax the noun-led person-drop further down the pipeline.
const detectQueryTargetsPerson = async (
	parsed: ReturnType<typeof parseFreeTextSearchQuery>,
	isNounLed: boolean,
	requestId: string
): Promise<{ targetsPerson: boolean; matchCount: number }> => {
	if (!isNounLed) return { targetsPerson: false, matchCount: 0 };
	const probeText = parsed.restOfQuery.trim();
	if (probeText.length < 3) return { targetsPerson: false, matchCount: 0 };
	const count = await withTimeout(
		countPersonTitleMatches(probeText, BOOKING_CONTACT_TITLE_PREFIXES),
		PERSON_TARGET_PROBE_TIMEOUT_MS,
		0,
		'person-target probe',
		requestId
	);
	return {
		targetsPerson: count >= PERSON_TARGET_MATCH_THRESHOLD,
		matchCount: count,
	};
};

const resolveLocalBusinessIntent = (rawQuery: string): LocalBusinessIntent | null => {
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

const contactMatchesCategory = (
	contact: Contact,
	category: BookingContactTitlePrefix
): boolean => matchesAnyTitlePrefix(contact.title, [category]);

const cleanBusinessCandidate = (contact: Contact): boolean =>
	contactLooksLikeBusinessEntity(contact) &&
	!contactLooksLikeEducationInstitution(contact) &&
	(contact.company?.trim().length ?? 0) > 0;

const applyRadius = (
	contacts: Contact[],
	center: { lat: number; lon: number } | null,
	radiusKm: number | null
): Contact[] => {
	if (!center || radiusKm == null) return contacts;
	return contacts.filter((contact) => {
		if (contact.latitude == null || contact.longitude == null) return false;
		return distanceKm(center, {
			lat: contact.latitude,
			lon: contact.longitude,
		}) <= radiusKm;
	});
};

const buildCategoryPool = (
	contacts: Contact[],
	perCategoryShare: number,
	requestedLimit: number,
	center: { lat: number; lon: number } | null,
	requestedRadiusKm: number | null,
	radiusLadder: (number | null)[]
): { contacts: Contact[]; radiusUsed: number | null } => {
	const perPoolLimit = Math.max(requestedLimit * 2, perCategoryShare * 3, 12);
	const desiredCount = Math.min(perPoolLimit, Math.max(perCategoryShare, 1));
	let best: { contacts: Contact[]; radiusUsed: number | null } | null = null;

	for (const radius of radiusLadder) {
		const localized = applyRadius(contacts, center, radius);
		if (localized.length === 0) continue;
		const distributed = distributeAcrossBuckets(
			localized,
			perPoolLimit,
			center,
			radius
		);
		if (distributed.length === 0) continue;
		if (!best || distributed.length > best.contacts.length) {
			best = { contacts: distributed, radiusUsed: radius };
		}
		if (distributed.length >= desiredCount) return best;
	}

	return best ?? { contacts: [], radiusUsed: requestedRadiusKm };
};

const toSearchContact = (
	contact: Contact,
	categoryMatch: BookingContactTitlePrefix | null
): FreeTextSearchContact => ({
	...contact,
	searchCleanliness: classifyCleanliness(contact),
	searchCategoryMatch: categoryMatch,
});

const localBusinessIntentScore = (
	contact: Contact,
	intent: LocalBusinessIntent
): number => {
	const company = contact.company ?? '';
	const title = contact.title ?? '';
	const headline = contact.headline ?? '';
	const metadata = contact.metadata ?? '';
	const companyType = contact.companyType ?? '';
	const companyIndustry = contact.companyIndustry ?? '';
	const keywords = (contact.companyKeywords ?? []).join(' ');

	const scoreField = (value: string, weight: number): number =>
		intent.patterns.some((pattern) => pattern.test(value)) ? weight : 0;

	return (
		scoreField(company, 8) +
		scoreField(title, 6) +
		scoreField(headline, 3) +
		scoreField(metadata, 2) +
		scoreField(companyType, 2) +
		scoreField(companyIndustry, 1) +
		scoreField(keywords, 1)
	);
};

const extractKeywordTerms = (query: string): string[] => {
	const seen = new Set<string>();
	for (const term of query.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
		if (!term) continue;
		seen.add(term);
	}
	return [...seen];
};

const tokenizeKeywordText = (value: string | null | undefined): Set<string> =>
	new Set((value ?? '').toLowerCase().match(/[a-z0-9]+/g) ?? []);

const normalizeKeywordText = (value: string | null | undefined): string =>
	(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

const keywordFieldSpecs = (contact: Contact): { value: string; weight: number }[] => [
	{ value: contact.companyIndustry ?? '', weight: 10 },
	{ value: contact.headline ?? '', weight: 8 },
	{ value: contact.title ?? '', weight: 7 },
	{ value: contact.company ?? '', weight: 7 },
	{ value: [contact.firstName, contact.lastName].filter(Boolean).join(' '), weight: 7 },
	{ value: contact.metadata ?? '', weight: 5 },
	{ value: (contact.companyKeywords ?? []).join(' '), weight: 4 },
	{ value: contact.companyType ?? '', weight: 3 },
	{ value: (contact.companyTechStack ?? []).join(' '), weight: 2 },
	{ value: contact.email ?? '', weight: 2 },
	{ value: contact.website ?? '', weight: 2 },
	{ value: contact.address ?? '', weight: 1 },
	{ value: [contact.city, contact.state, contact.country].filter(Boolean).join(' '), weight: 1 },
];

const keywordContactScore = (contact: Contact, terms: readonly string[]): number => {
	if (terms.length === 0) return 0;
	const phrase = terms.join(' ');
	let score = 0;
	for (const field of keywordFieldSpecs(contact)) {
		const tokens = tokenizeKeywordText(field.value);
		let fieldHits = 0;
		for (const term of terms) {
			if (tokens.has(term)) fieldHits++;
		}
		if (fieldHits === 0) continue;
		score += fieldHits * field.weight;

		const normalized = normalizeKeywordText(field.value);
		if (normalized === phrase) score += field.weight * terms.length * 4;
		else if (normalized.startsWith(phrase)) score += field.weight * terms.length * 3;
		else if (normalized.includes(phrase)) score += field.weight * terms.length * 2;
	}
	return score;
};

const contactMatchesAllKeywordTerms = (
	contact: Contact,
	terms: readonly string[]
): boolean => {
	if (terms.length === 0) return false;
	const allTokens = new Set<string>();
	for (const field of keywordFieldSpecs(contact)) {
		for (const token of tokenizeKeywordText(field.value)) allTokens.add(token);
	}
	return terms.every((term) => allTokens.has(term));
};

interface RetrieverResult {
	name: string;
	ids: number[];
}

const collectRetrieverIds = (matches: { id: string | undefined }[]): number[] => {
	const out: number[] = [];
	const seen = new Set<number>();
	for (const match of matches) {
		const idNum = Number(match.id);
		if (!Number.isFinite(idNum)) continue;
		const id = Math.trunc(idNum);
		if (seen.has(id)) continue;
		seen.add(id);
		out.push(id);
	}
	return out;
};

const buildRrfRankMap = (results: RetrieverResult[]): Map<number, number> => {
	const score = new Map<number, number>();
	for (const r of results) {
		r.ids.forEach((id, idx) => {
			const contribution = 1 / (RRF_K + idx + 1);
			score.set(id, (score.get(id) ?? 0) + contribution);
		});
	}
	return score;
};

interface ResolvedCenter {
	lat: number | null;
	lon: number | null;
	city: string | null;
	region: string | null;
	source: 'query' | 'override' | 'header' | 'none';
}

const inferCenter = (
	req: NextRequest,
	overrides: { lat: number | null; lon: number | null },
	parsed: { city: string | null; lat: number | null; lon: number | null; state: string | null }
): ResolvedCenter => {
	if (parsed.lat != null && parsed.lon != null) {
		return {
			lat: parsed.lat,
			lon: parsed.lon,
			city: parsed.city,
			region: parsed.state,
			source: 'query',
		};
	}
	if (overrides.lat != null && overrides.lon != null) {
		return {
			lat: overrides.lat,
			lon: overrides.lon,
			city: null,
			region: null,
			source: 'override',
		};
	}
	const headers = req.headers;
	const lat = parseFloatOrNull(headers.get('x-vercel-ip-latitude'));
	const lon = parseFloatOrNull(headers.get('x-vercel-ip-longitude'));
	const city = headers.get('x-vercel-ip-city');
	const region =
		headers.get('x-vercel-ip-country-region') ??
		headers.get('x-vercel-ip-region') ??
		null;
	if (lat != null && lon != null) {
		return {
			lat,
			lon,
			city: city ? decodeURIComponent(city) : null,
			region,
			source: 'header',
		};
	}
	return { lat: null, lon: null, city: null, region: null, source: 'none' };
};

export type FreeTextSearchContact = Contact & {
	searchCleanliness: CleanlinessTier;
	searchCategoryMatch: BookingContactTitlePrefix | null;
};

export interface FreeTextSearchResponse {
	query: string;
	parsed: {
		categories: BookingContactTitlePrefix[];
		city: string | null;
		state: string | null;
		country: string | null;
		restOfQuery: string;
	};
	center: { lat: number; lon: number } | null;
	radiusKm: number | null;
	retrieverBreakdown: Record<string, number>;
	cleanlinessBreakdown: Record<CleanlinessTier, number>;
	contacts: FreeTextSearchContact[];
	// 'national-fallback' when the hybrid retriever path detected sparse
	// implicit-locality results and re-issued retrievers globally. Absent on
	// the curated/place-only/local-business branches and on the non-expanded
	// hybrid path.
	expansionMode?: 'none' | 'national-fallback';
}

const cleanlinessBreakdownFor = (
	contacts: readonly FreeTextSearchContact[]
): Record<CleanlinessTier, number> => {
	const breakdown: Record<CleanlinessTier, number> = {
		'canonical-clean': 0,
		'clean-business': 0,
		'clean-person': 0,
		loose: 0,
	};
	for (const contact of contacts) breakdown[contact.searchCleanliness] += 1;
	return breakdown;
};

const applyStrictRadiusToResponse = (
	response: FreeTextSearchResponse,
	center: { lat: number; lon: number } | null,
	radiusKm: number | null
): FreeTextSearchResponse => {
	if (!center || radiusKm == null) return response;
	const contacts = response.contacts.filter(
		(contact) =>
			contact.latitude != null &&
			contact.longitude != null &&
			distanceKm(center, { lat: contact.latitude, lon: contact.longitude }) <= radiusKm
	);
	return {
		...response,
		center,
		radiusKm,
		contacts,
		cleanlinessBreakdown: cleanlinessBreakdownFor(contacts),
	};
};

const runCuratedCategorySearch = async (options: {
	rawQuery: string;
	parsed: ReturnType<typeof parseFreeTextSearchQuery>;
	centerPoint: { lat: number; lon: number } | null;
	radiusKm: number;
	requestedLimit: number;
	strictRadius?: boolean;
}): Promise<FreeTextSearchResponse> => {
	const {
		rawQuery,
		parsed,
		centerPoint,
		radiusKm,
		requestedLimit,
		strictRadius = false,
	} = options;
	const activeCategories = parsed.categories;
	const emptyResponse = (retrieverBreakdown: Record<string, number>): FreeTextSearchResponse => ({
		query: rawQuery,
		parsed: {
			categories: parsed.categories,
			city: parsed.city?.name ?? null,
			state: parsed.state?.name ?? null,
			country: parsed.country,
			restOfQuery: parsed.restOfQuery,
		},
		center: centerPoint,
		radiusKm: null,
		retrieverBreakdown,
		cleanlinessBreakdown: {
			'canonical-clean': 0,
			'clean-business': 0,
			'clean-person': 0,
			loose: 0,
		},
		contacts: [],
	});
	if (activeCategories.length === 0) return emptyResponse({ curatedLocal: 0 });
	if (!centerPoint) {
		return emptyResponse({ curatedLocal: 0, missingLocalityAnchor: 1 });
	}

	const queryCenter = centerPoint;
	const requestedRadiusKm = radiusKm;
	const fetchBboxRadiusKm = Math.max(
		requestedRadiusKm,
		DEFAULT_LOCALITY_RADIUS_KM
	) * CURATED_CATEGORY_FETCH_BUFFER;
	const fetchBbox = bboxFromCenter(queryCenter, fetchBboxRadiusKm);

	const candidates = await prisma.contact.findMany({
		where: {
			AND: [
				{ title: { not: null } },
				{
					OR: activeCategories.map((category) => ({
						title: { startsWith: category, mode: 'insensitive' as const },
					})),
				},
				{ latitude: { not: null } },
				{ longitude: { not: null } },
				{ latitude: { gte: fetchBbox.south, lte: fetchBbox.north } },
				{ longitude: { gte: fetchBbox.west, lte: fetchBbox.east } },
			],
		},
		take: CURATED_CATEGORY_CANDIDATE_TAKE,
		orderBy: [{ id: 'asc' }],
	});

	const perCategoryShare = Math.ceil(
		requestedLimit / Math.max(1, activeCategories.length)
	);
	const radiusLadder: (number | null)[] = strictRadius
		? [requestedRadiusKm]
		: [requestedRadiusKm, Math.min(fetchBboxRadiusKm, 1500), null];

	const buildPools = (predicate: (contact: Contact) => boolean): CategoryPool[] =>
		activeCategories.map((category) => {
			const categoryContacts = candidates.filter(
				(contact) =>
					contactMatchesCategory(contact, category) &&
					cleanBusinessCandidate(contact) &&
					predicate(contact)
			);
			const built = buildCategoryPool(
				categoryContacts,
				perCategoryShare,
				requestedLimit,
				queryCenter,
				requestedRadiusKm,
				radiusLadder
			);
			return {
				key: category,
				label: category.toLowerCase(),
				weight: 1,
				contacts: built.contacts,
				radiusUsed: built.radiusUsed,
			};
		});

	const canonicalPools = buildPools((contact) => titleHasStateSuffix(contact.title));
	const canonicalAllocated = allocateAcrossCategories(
		canonicalPools,
		requestedLimit
	);
	const looseRemainder = requestedLimit - canonicalAllocated.length;
	const looseAllocated =
		looseRemainder > 0
			? allocateAcrossCategories(
					buildPools((contact) => !titleHasStateSuffix(contact.title)),
					looseRemainder
			  )
			: [];

	const finalContacts = [
		...interleaveByCategory(canonicalAllocated),
		...interleaveByCategory(looseAllocated),
	]
		.slice(0, requestedLimit)
		.map((allocated) =>
			toSearchContact(
				allocated.contact,
				allocated.categoryKey as BookingContactTitlePrefix
			)
		);

	if (finalContacts.length === 0) return emptyResponse({ curatedLocal: candidates.length });

	const cleanlinessBreakdown: Record<CleanlinessTier, number> = {
		'canonical-clean': 0,
		'clean-business': 0,
		'clean-person': 0,
		loose: 0,
	};
	for (const contact of finalContacts) {
		cleanlinessBreakdown[contact.searchCleanliness] += 1;
	}

	return {
		query: rawQuery,
		parsed: {
			categories: parsed.categories,
			city: parsed.city?.name ?? null,
			state: parsed.state?.name ?? null,
			country: parsed.country,
			restOfQuery: parsed.restOfQuery,
		},
		center: centerPoint,
		radiusKm: requestedRadiusKm,
		retrieverBreakdown: {
			curatedLocal: candidates.length,
		},
		cleanlinessBreakdown,
		contacts: finalContacts,
	};
};

const emptyFreeTextSearchResponse = (options: {
	rawQuery: string;
	parsed: ReturnType<typeof parseFreeTextSearchQuery>;
	centerPoint: { lat: number; lon: number } | null;
	retrieverBreakdown: Record<string, number>;
}): FreeTextSearchResponse => ({
	query: options.rawQuery,
	parsed: {
		categories: options.parsed.categories,
		city: options.parsed.city?.name ?? null,
		state: options.parsed.state?.name ?? null,
		country: options.parsed.country,
		restOfQuery: options.parsed.restOfQuery,
	},
	center: options.centerPoint,
	radiusKm: null,
	retrieverBreakdown: options.retrieverBreakdown,
	cleanlinessBreakdown: {
		'canonical-clean': 0,
		'clean-business': 0,
		'clean-person': 0,
		loose: 0,
	},
	contacts: [],
});

const runKeywordSearch = async (options: {
	rawQuery: string;
	parsed: ReturnType<typeof parseFreeTextSearchQuery>;
	centerPoint: { lat: number; lon: number } | null;
	radiusKm: number | null;
	requestedLimit: number;
}): Promise<FreeTextSearchResponse> => {
	const { rawQuery, parsed, centerPoint, radiusKm, requestedLimit } = options;
	const terms = extractKeywordTerms(rawQuery);
	if (terms.length === 0) {
		return emptyFreeTextSearchResponse({
			rawQuery,
			parsed,
			centerPoint,
			retrieverBreakdown: { keyword: 0 },
		});
	}

	const keywordResult = await keywordSearchContacts({
		queryText: rawQuery,
		limit: Math.min(1000, Math.max(PER_RETRIEVER_TAKE, requestedLimit * 10)),
		center: centerPoint,
		radiusKm,
	});
	const ids = collectRetrieverIds(keywordResult.matches);

	if (ids.length === 0) {
		return emptyFreeTextSearchResponse({
			rawQuery,
			parsed,
			centerPoint,
			retrieverBreakdown: { keyword: 0 },
		});
	}

	const hydrated = await prisma.contact.findMany({
		where: { id: { in: ids } },
	});
	const rankById = new Map(ids.map((id, index) => [id, index]));

	const matchedContacts = hydrated
		.filter((contact) => contactMatchesAllKeywordTerms(contact, terms))
		.map((contact) => ({
			contact,
			score: keywordContactScore(contact, terms),
			rank: rankById.get(contact.id) ?? Number.MAX_SAFE_INTEGER,
		}))
		.sort((a, b) => b.score - a.score || a.rank - b.rank)
		.slice(0, requestedLimit)
		.map(({ contact }) => contact);

	const finalContacts = matchedContacts.map((contact) => toSearchContact(contact, null));

	return {
		query: rawQuery,
		parsed: {
			categories: parsed.categories,
			city: parsed.city?.name ?? null,
			state: parsed.state?.name ?? null,
			country: parsed.country,
			restOfQuery: parsed.restOfQuery,
		},
		center: centerPoint,
		radiusKm: centerPoint && radiusKm != null ? radiusKm : null,
		retrieverBreakdown: {
			keyword: ids.length,
			keywordHydrated: hydrated.length,
			keywordMatched: matchedContacts.length,
		},
		cleanlinessBreakdown: cleanlinessBreakdownFor(finalContacts),
		contacts: finalContacts,
	};
};

const runLocalBusinessSearch = async (options: {
	rawQuery: string;
	parsed: ReturnType<typeof parseFreeTextSearchQuery>;
	intent: LocalBusinessIntent;
	centerPoint: { lat: number; lon: number } | null;
	radiusKm: number;
	requestedLimit: number;
	strictRadius?: boolean;
}): Promise<FreeTextSearchResponse> => {
	const {
		rawQuery,
		parsed,
		intent,
		centerPoint,
		radiusKm,
		requestedLimit,
		strictRadius = false,
	} = options;
	if (!centerPoint) {
		return emptyFreeTextSearchResponse({
			rawQuery,
			parsed,
			centerPoint,
			retrieverBreakdown: { localBusiness: 0, missingLocalityAnchor: 1 },
		});
	}

	const fetchBboxRadiusKm =
		Math.max(radiusKm, DEFAULT_LOCALITY_RADIUS_KM) * CURATED_CATEGORY_FETCH_BUFFER;
	const fetchBbox = bboxFromCenter(centerPoint, fetchBboxRadiusKm);
	const textFields = [
		'company',
		'title',
		'headline',
		'metadata',
		'companyType',
		'companyIndustry',
	] as const;
	const candidates = await prisma.contact.findMany({
		where: {
			AND: [
				{ latitude: { not: null } },
				{ longitude: { not: null } },
				{ latitude: { gte: fetchBbox.south, lte: fetchBbox.north } },
				{ longitude: { gte: fetchBbox.west, lte: fetchBbox.east } },
				{
					OR: intent.terms.flatMap((term) =>
						textFields.map((field) => ({
							[field]: { contains: term, mode: 'insensitive' as const },
						}))
					),
				},
			],
		},
		take: CURATED_CATEGORY_CANDIDATE_TAKE,
		orderBy: [{ id: 'asc' }],
	});

	const scored = candidates
		.map((contact) => ({
			contact,
			score: localBusinessIntentScore(contact, intent),
		}))
		.filter(({ contact, score }) => score > 0 && cleanBusinessCandidate(contact));

	const radiusLadder: (number | null)[] = strictRadius
		? [radiusKm]
		: [radiusKm, Math.min(fetchBboxRadiusKm, 1500), null];
	let selected: Contact[] = [];
	for (const radius of radiusLadder) {
		const localized = applyRadius(
			scored.map(({ contact }) => contact),
			centerPoint,
			radius
		);
		if (localized.length === 0) continue;
		selected = distributeAcrossBuckets(
			localized,
			Math.max(requestedLimit, 1),
			centerPoint,
			radius
		);
		if (selected.length > 0) break;
	}

	if (selected.length === 0) {
		return emptyFreeTextSearchResponse({
			rawQuery,
			parsed,
			centerPoint,
			retrieverBreakdown: { localBusiness: candidates.length },
		});
	}

	const scoreById = new Map(scored.map(({ contact, score }) => [contact.id, score]));
	const finalContacts = selected
		.slice()
		.sort((a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0))
		.slice(0, requestedLimit)
		.map((contact) => toSearchContact(contact, null));

	const cleanlinessBreakdown: Record<CleanlinessTier, number> = {
		'canonical-clean': 0,
		'clean-business': 0,
		'clean-person': 0,
		loose: 0,
	};
	for (const contact of finalContacts) {
		cleanlinessBreakdown[contact.searchCleanliness] += 1;
	}

	return {
		query: rawQuery,
		parsed: {
			categories: parsed.categories,
			city: parsed.city?.name ?? null,
			state: parsed.state?.name ?? null,
			country: parsed.country,
			restOfQuery: parsed.restOfQuery,
		},
		center: centerPoint,
		radiusKm,
		retrieverBreakdown: {
			localBusiness: candidates.length,
			localBusinessClean: scored.length,
		},
		cleanlinessBreakdown,
		contacts: finalContacts,
	};
};

const runPlaceOnlyCuratedSearch = async (options: {
	rawQuery: string;
	parsed: ReturnType<typeof parseFreeTextSearchQuery>;
	centerPoint: { lat: number; lon: number };
	radiusKm: number;
	requestedLimit: number;
	enforcedState: { name: string; abbr: string } | null;
	strictRadius?: boolean;
	logTag: string;
}): Promise<FreeTextSearchResponse> => {
	const {
		rawQuery,
		parsed,
		centerPoint,
		radiusKm,
		requestedLimit,
		enforcedState,
		strictRadius = false,
		logTag,
	} = options;

	const result = await runCuratedNearbyPicks({
		center: centerPoint,
		radiusKm,
		limit: requestedLimit,
		strictRadius,
		logTag,
	});

	// State safety net for state-only queries — the centroid + radius will
	// mostly stay in-state but border picks can leak. When the user typed a
	// state (directly), restrict to that state. City-only queries are NOT
	// state-restricted: typing "Brooklyn" should legitimately surface metro-area
	// picks across NJ too, and the radius already keeps things local.
	let curatedContacts = result.contacts;
	if (enforcedState) {
		const stateNameLc = enforcedState.name.toLowerCase();
		const stateAbbrLc = enforcedState.abbr.toLowerCase();
		const allowed = new Set([stateNameLc, stateAbbrLc]);
		curatedContacts = curatedContacts.filter((c) => {
			const s = (c.state ?? '').trim().toLowerCase();
			const titleLc = (c.title ?? '').toLowerCase();
			const stateExact = s.length > 0 && allowed.has(s);
			const statePrefixed =
				s.length > 0 &&
				(s.startsWith(stateNameLc + ',') ||
					s.startsWith(stateNameLc + ' ') ||
					s.startsWith(stateAbbrLc + ',') ||
					s.startsWith(stateAbbrLc + ' '));
			const titleHasState =
				titleLc.includes(' ' + stateNameLc) ||
				titleLc.endsWith(' ' + stateNameLc) ||
				titleLc.endsWith(' ' + stateAbbrLc);
			return stateExact || statePrefixed || titleHasState;
		});
	}

	// Note: `curatedDisplayLabel` and `curatedQualityTier` ride along on the
	// response object. They aren't part of FreeTextSearchContact but the type is
	// open and they serialize harmlessly — stripping them every request isn't
	// worth the perf or readability cost.
	const finalContacts: FreeTextSearchContact[] = curatedContacts.map((c) => ({
		...c,
		searchCleanliness: classifyCleanliness(c),
		searchCategoryMatch: c.curatedCategory,
	}));

	const cleanlinessBreakdown: Record<CleanlinessTier, number> = {
		'canonical-clean': 0,
		'clean-business': 0,
		'clean-person': 0,
		loose: 0,
	};
	for (const c of finalContacts) cleanlinessBreakdown[c.searchCleanliness] += 1;

	return {
		query: rawQuery,
		parsed: {
			categories: parsed.categories,
			city: parsed.city?.name ?? null,
			state: parsed.state?.name ?? null,
			country: parsed.country,
			restOfQuery: parsed.restOfQuery,
		},
		center: centerPoint,
		radiusKm: result.effectiveRadiusKm,
		retrieverBreakdown: {
			curatedNearby: result.contacts.length,
		},
		cleanlinessBreakdown,
		contacts: finalContacts,
	};
};

type ScoredRow = {
	contact: Contact;
	score: number;
	cleanliness: CleanlinessTier;
	categoryMatch: BookingContactTitlePrefix | null;
};

interface ScoreAndInterleaveOptions {
	ids: number[];
	byId: Map<number, Contact>;
	rrfScores: Map<number, number>;
	parsed: ReturnType<typeof parseFreeTextSearchQuery>;
	centerPoint: { lat: number; lon: number } | null;
	hasCenter: boolean;
	radiusKm: number;
	isNounLed: boolean;
	// When true, the locality multiplier is held at 1.0 throughout — the
	// national-fallback stage is explicitly going wide so distance shouldn't
	// penalize.
	neutralizeLocality: boolean;
	// When true, noun-led queries hard-drop clean-person and loose rows. The
	// fallback stage relaxes this so person/loose can ride through scaled by
	// their cleanliness multiplier (1.2 / 1.0) when they're the only matches.
	dropPersonOrLoose: boolean;
	// When true, the noun-led probe found enough non-venue title matches that
	// the query likely refers to a role (e.g. "professor"). Skips the noun-led
	// person/loose drop and switches to the person-targeted multiplier table
	// so people can compete with venues on lexical/RRF score.
	queryTargetsPerson: boolean;
	// When true, the literal-match check uses a prefix-aware regex (so
	// "plumber" boosts contacts whose title says "Plumbers" or "Plumbery")
	// and additionally tests `headline` for the literal token with a moderate
	// boost. Used by the national-fallback stage; the locally-anchored stage
	// keeps the strict word-boundary regex because in healthy in-domain
	// queries we don't want "deli" matching "delicate" or boosting people
	// whose headline mentions delis in passing.
	literalSweepMode: boolean;
	// Profile mode: tokenized genre terms for a gentle, capped ranking lift.
	// Empty when Profile is off; gated off explicit categories in the body.
	profileGenreTerms: readonly string[];
	limit: number;
}

interface ScoreAndInterleaveResult {
	finalContacts: FreeTextSearchContact[];
	scored: ScoredRow[];
	droppedPersonOrLoose: number;
	literalMatchCount: number;
}

// Shared scoring + light-interleave for the hybrid retriever path. Called
// once for the locally-anchored Stage 1 result; if Stage 1 came up sparse
// and the query was implicit-locality, called again for the national
// fallback. The two knobs (`neutralizeLocality` and `dropPersonOrLoose`) are
// the only differences between the two stages.
const scoreAndInterleave = (
	opts: ScoreAndInterleaveOptions
): ScoreAndInterleaveResult => {
	const {
		ids,
		byId,
		rrfScores,
		parsed,
		centerPoint,
		hasCenter,
		radiusKm,
		isNounLed,
		neutralizeLocality,
		dropPersonOrLoose,
		queryTargetsPerson,
		literalSweepMode,
		profileGenreTerms,
		limit,
	} = opts;
	const cleanlinessTable = queryTargetsPerson
		? PERSON_TARGETED_CLEANLINESS_MULTIPLIER
		: CLEANLINESS_MULTIPLIER;

	const explicitPlace = parsed.hadExplicitPlace;
	const onlyOneCategory = parsed.categories.length === 1;
	const liveMusicQuery = parsed.mentionsLiveMusic;
	const exactCityCenter = parsed.city?.coordinatePrecision === 'city';
	const cityState = parsed.city?.state
		? US_STATES.find(
				(s) => s.abbr.toLowerCase() === parsed.city!.state!.toLowerCase()
			  )
		: null;
	const localityStateNameLc = (parsed.state?.name ?? cityState?.name ?? null)?.toLowerCase() ?? null;
	const localityStateAbbrLc = (parsed.state?.abbr ?? parsed.city?.state ?? null)?.toLowerCase() ?? null;
	const softDescriptorTerms = getSoftDescriptorTerms(parsed.restOfQuery);

	const restOfQueryLc = parsed.restOfQuery.trim().toLowerCase();
	const escapedQuery =
		restOfQueryLc.length > 0
			? restOfQueryLc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
			: '';
	// Strict word boundary in normal mode; prefix-aware in literal-sweep mode
	// so "plumber" matches "Plumbers Tennessee" / "plumbery" but doesn't get
	// fooled by mid-word substrings like "rumberger".
	const restOfQueryWordRe =
		escapedQuery.length > 0
			? literalSweepMode
				? new RegExp(`\\b${escapedQuery}\\w*`, 'i')
				: new RegExp(`\\b${escapedQuery}\\b`, 'i')
			: null;

	let droppedPersonOrLoose = 0;
	let literalMatchCount = 0;
	const scored: ScoredRow[] = [];
	for (const id of ids) {
		const contact = byId.get(id);
		if (!contact) continue;
		const base = rrfScores.get(id) ?? 0;
		const cleanliness = classifyCleanliness(contact);

		if (
			dropPersonOrLoose &&
			isNounLed &&
			!queryTargetsPerson &&
			(cleanliness === 'clean-person' || cleanliness === 'loose')
		) {
			droppedPersonOrLoose++;
			continue;
		}

		let multiplier = cleanlinessTable[cleanliness];

		let categoryMatch: BookingContactTitlePrefix | null = null;
		if (parsed.categories.length > 0) {
			const matched = parsed.categories.find((p) =>
				matchesAnyTitlePrefix(contact.title, [p])
			);
			if (matched) {
				categoryMatch = matched;
				multiplier *= parsed.hadExplicitCategory ? 2.1 : 1.5;
			} else if (onlyOneCategory) {
				multiplier *= parsed.hadExplicitCategory ? 0.25 : 0.6;
			}
		}

		if (!neutralizeLocality) {
			if (explicitPlace) {
				const cityMatch =
					parsed.city &&
					contact.city &&
					contact.city.toLowerCase() === parsed.city.name.toLowerCase();
				const contactStateLc = (contact.state ?? '').trim().toLowerCase();
				const stateMatch =
					contactStateLc.length > 0 &&
					((localityStateNameLc != null &&
						(contactStateLc === localityStateNameLc ||
							contactStateLc.startsWith(localityStateNameLc + ',') ||
							contactStateLc.startsWith(localityStateNameLc + ' '))) ||
						(localityStateAbbrLc != null &&
							(contactStateLc === localityStateAbbrLc ||
								contactStateLc.startsWith(localityStateAbbrLc + ',') ||
								contactStateLc.startsWith(localityStateAbbrLc + ' '))));
				const d =
					hasCenter && contact.latitude != null && contact.longitude != null
						? distanceKm(centerPoint!, {
								lat: contact.latitude,
								lon: contact.longitude,
						  })
						: null;
				if (cityMatch) multiplier *= 2.2;
				else if (exactCityCenter && d != null) {
					if (d <= 25) multiplier *= 1.85;
					else if (d <= 50) multiplier *= 1.6;
					else if (d <= 100) multiplier *= 1.35;
					else if (d <= radiusKm) multiplier *= 1.18;
					else if (stateMatch) multiplier *= 1.05;
					else multiplier *= 0.85;
				} else if (stateMatch) {
					multiplier *= 1.35;
				} else if (d != null && d <= radiusKm) {
					multiplier *= 1.15;
				}
			} else if (
				hasCenter &&
				contact.latitude != null &&
				contact.longitude != null
			) {
				const d = distanceKm(centerPoint!, {
					lat: contact.latitude,
					lon: contact.longitude,
				});
				if (d <= radiusKm) multiplier *= 1.15;
				else if (d <= radiusKm * 3) multiplier *= 1.0;
				else multiplier *= 0.9;
			}
		}

		if (liveMusicQuery) {
			const lm = liveMusicSignalScore(contact);
			if (lm >= 6) multiplier *= 1.35;
			else if (lm >= 1) multiplier *= 1.1;
		}

		const softDescriptorScore = softDescriptorSignalScore(contact, softDescriptorTerms);
		if (softDescriptorScore >= 6) multiplier *= 1.3;
		else if (softDescriptorScore >= 3) multiplier *= 1.18;
		else if (softDescriptorScore > 0) multiplier *= 1.08;

		// Profile mode: gently lift contacts whose fields echo the artist's genre.
		// Capped (<=1.2x) and gated off explicit categories so a typed category
		// still leads. Soft signal only — never a filter.
		if (profileGenreTerms.length > 0 && !parsed.hadExplicitCategory) {
			const genreScore = softDescriptorSignalScore(contact, profileGenreTerms);
			if (genreScore >= 6) multiplier *= 1.2;
			else if (genreScore >= 3) multiplier *= 1.12;
			else if (genreScore > 0) multiplier *= 1.06;
		}

		if (restOfQueryWordRe) {
			const titleLc = (contact.title ?? '').toLowerCase();
			const companyLc = (contact.company ?? '').toLowerCase();
			const startsTitle = titleLc.startsWith(restOfQueryLc);
			const startsCompany = companyLc.startsWith(restOfQueryLc);
			const titleHit = startsTitle || restOfQueryWordRe.test(contact.title ?? '');
			const companyHit =
				startsCompany || restOfQueryWordRe.test(contact.company ?? '');
			// Headline check is gated on literalSweepMode. In the locally-
			// anchored stage we don't want a row whose headline mentions the
			// noun (but whose title/company don't) to lift over a real in-
			// domain match. In the national-fallback stage that headline-only
			// row is often the BEST signal we have.
			const headlineHit =
				literalSweepMode &&
				restOfQueryWordRe.test(contact.headline ?? '');
			if (titleHit || companyHit || headlineHit) literalMatchCount++;
			if (startsTitle || startsCompany) {
				multiplier *= isNounLed ? 4 : 2;
			} else if (titleHit || companyHit) {
				multiplier *= isNounLed ? 2.5 : 1.4;
			} else if (headlineHit) {
				multiplier *= isNounLed ? 1.6 : 1.25;
			}
		}

		scored.push({
			contact,
			score: base * multiplier,
			cleanliness,
			categoryMatch,
		});
	}

	scored.sort((a, b) => b.score - a.score);

	const interleaveTopN = Math.min(20, scored.length);
	const head = scored.slice(0, interleaveTopN);
	const tail = scored.slice(interleaveTopN);
	const distinctCategoriesInHead = new Set(
		head
			.filter((s) => s.categoryMatch !== null)
			.map((s) => s.categoryMatch as string)
	).size;
	let finalOrder: ScoredRow[];
	if (distinctCategoriesInHead >= 2) {
		const groups = new Map<string, ScoredRow[]>();
		const ungrouped: ScoredRow[] = [];
		for (const s of head) {
			if (s.categoryMatch) {
				const list = groups.get(s.categoryMatch) ?? [];
				list.push(s);
				groups.set(s.categoryMatch, list);
			} else {
				ungrouped.push(s);
			}
		}
		const orderedKeys = [...groups.keys()].sort((a, b) => {
			const aTop = groups.get(a)![0].score;
			const bTop = groups.get(b)![0].score;
			return bTop - aTop;
		});
		const cursors = new Map<string, number>();
		for (const k of orderedKeys) cursors.set(k, 0);
		const interleaved: ScoredRow[] = [];
		let progressing = true;
		while (progressing) {
			progressing = false;
			for (const k of orderedKeys) {
				const list = groups.get(k)!;
				const idx = cursors.get(k) ?? 0;
				if (idx >= list.length) continue;
				interleaved.push(list[idx]);
				cursors.set(k, idx + 1);
				progressing = true;
			}
		}
		finalOrder = [...interleaved, ...ungrouped, ...tail];
	} else {
		finalOrder = scored;
	}

	if (parsed.hadExplicitCategory && onlyOneCategory) {
		const categoryRows = finalOrder.filter((s) => s.categoryMatch !== null);
		if (categoryRows.length > 0) {
			const nonCategoryRows = finalOrder.filter((s) => s.categoryMatch === null);
			finalOrder = [...categoryRows, ...nonCategoryRows];
		}
	}

	const finalContacts: FreeTextSearchContact[] = finalOrder
		.slice(0, limit)
		.map((s) => ({
			...s.contact,
			searchCleanliness: s.cleanliness,
			searchCategoryMatch: s.categoryMatch,
		}));

	return {
		finalContacts,
		scored,
		droppedPersonOrLoose,
		literalMatchCount,
	};
};

export async function GET(req: NextRequest) {
	const requestId = createRequestId();
	const requestStartedAt = Date.now();
	let clientAborted = false;
	const onAbort = () => {
		clientAborted = true;
		console.warn(
			`[contacts-search][${requestId}] client aborted after ${Date.now() - requestStartedAt}ms`
		);
	};
	req.signal.addEventListener('abort', onAbort, { once: true });

	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const url = new URL(req.url);
		const rawQuery = (url.searchParams.get('q') ?? '').trim();
		const overrideLat = parseFloatOrNull(url.searchParams.get('lat'));
		const overrideLon = parseFloatOrNull(url.searchParams.get('lon'));
		const overrideRadiusKm = parseFloatOrNull(url.searchParams.get('radiusKm'));
		const keywordMode =
			url.searchParams.get('keywordMode') === '1' ||
			url.searchParams.get('keywordMode') === 'true';
		// Radius-search mode (the map's "Radius" pill). Unlike the default soft
		// locality bias, this makes the radius a HARD geographic constraint: the
		// center/radius come ONLY from the explicit overrides (so parsed place-text
		// can't move the drawn circle), national fallback is suppressed, and a final
		// haversine gate drops everything outside the circle.
		const strictRadius =
			url.searchParams.get('strictRadius') === '1' ||
			url.searchParams.get('strictRadius') === 'true';
		const strictCenter =
			strictRadius &&
			overrideLat != null &&
			Number.isFinite(overrideLat) &&
			overrideLon != null &&
			Number.isFinite(overrideLon)
				? { lat: overrideLat, lon: overrideLon }
				: null;
		const strictRadiusKm =
			strictRadius && overrideRadiusKm != null && Number.isFinite(overrideRadiusKm)
				? overrideRadiusKm
				: null;
		const strictRadiusActive = strictCenter != null && strictRadiusKm != null;
		// Profile mode (dashboard "Profile" pill): soft, identity-derived signals.
		// profileGenre → a gentle ranking multiplier; profileEmbedText (genre + bio
		// keywords) → biases the kNN embedding only; profileArea → a soft location
		// anchor. All subordinate to anything the user typed explicitly.
		const profileGenre = (url.searchParams.get('profileGenre') ?? '').trim();
		const profileEmbedText = (url.searchParams.get('profileEmbedText') ?? '').trim();
		const profileArea = (url.searchParams.get('profileArea') ?? '').trim();
		const profileActive = !!(profileGenre || profileEmbedText || profileArea);
		const profileGenreTerms = profileGenre
			? Array.from(
					new Set(
						profileGenre
							.toLowerCase()
							.split(/[^a-z0-9]+/)
							.filter((t) => t.length >= 3)
					)
			  )
			: [];
		const requestedLimit = (() => {
			const parsed = Number(url.searchParams.get('limit'));
			if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
			return Math.max(1, Math.min(Math.trunc(parsed), MAX_LIMIT));
		})();

		if (!rawQuery) {
			return apiResponse({
				query: '',
				parsed: {
					categories: [],
					city: null,
					state: null,
					country: null,
					restOfQuery: '',
				},
				center: null,
				radiusKm: null,
				retrieverBreakdown: {},
				cleanlinessBreakdown: {
					'canonical-clean': 0,
					'clean-business': 0,
					'clean-person': 0,
					loose: 0,
				},
				contacts: [],
			} satisfies FreeTextSearchResponse);
		}

		const parsed = parseFreeTextSearchQuery(rawQuery);
		const cityStateForCenter = parsed.city?.state
			? US_STATES.find(
					(s) => s.abbr.toLowerCase() === parsed.city!.state!.toLowerCase()
			  )
			: null;
		const parsedCityHasExactCenter = parsed.city?.coordinatePrecision === 'city';
		const parsedCenterLat = parsedCityHasExactCenter
			? parsed.city!.lat
			: parsed.state?.lat ?? cityStateForCenter?.centroid.lat ?? null;
		const parsedCenterLon = parsedCityHasExactCenter
			? parsed.city!.lon
			: parsed.state?.lon ?? cityStateForCenter?.centroid.lng ?? null;
		// Profile area as a SOFT location anchor: only when the user named no place,
		// gave no override coords, and isn't in strict-radius mode. Reuses the
		// free-text parser so "Austin" / "Austin, TX" resolve; fail-closed for
		// unrecognized regions like "Pacific Northwest" (no anchor, no pollution).
		const profileAreaParsed =
			profileActive &&
			profileArea &&
			!parsed.hadExplicitPlace &&
			!strictRadiusActive &&
			overrideLat == null &&
			overrideLon == null
				? parseFreeTextSearchQuery(profileArea)
				: null;
		let profileAreaCenterLat: number | null = null;
		let profileAreaCenterLon: number | null = null;
		let profileAreaCity: string | null = null;
		let profileAreaState: string | null = null;
		if (profileAreaParsed?.hadExplicitPlace) {
			const areaCityState = profileAreaParsed.city?.state
				? US_STATES.find(
						(s) =>
							s.abbr.toLowerCase() ===
							profileAreaParsed.city!.state!.toLowerCase()
				  )
				: null;
			const areaHasExactCenter =
				profileAreaParsed.city?.coordinatePrecision === 'city';
			profileAreaCenterLat = areaHasExactCenter
				? profileAreaParsed.city!.lat
				: profileAreaParsed.state?.lat ?? areaCityState?.centroid.lat ?? null;
			profileAreaCenterLon = areaHasExactCenter
				? profileAreaParsed.city!.lon
				: profileAreaParsed.state?.lon ?? areaCityState?.centroid.lng ?? null;
			profileAreaCity = profileAreaParsed.city?.name ?? null;
			profileAreaState =
				profileAreaParsed.state?.name ?? areaCityState?.name ?? null;
		}
		const center: ResolvedCenter = strictRadiusActive
			? {
					lat: strictCenter.lat,
					lon: strictCenter.lon,
					city: null,
					region: null,
					source: 'override',
			  }
			: inferCenter(
					req,
					{ lat: overrideLat, lon: overrideLon },
					{
						lat: parsedCenterLat ?? profileAreaCenterLat,
						lon: parsedCenterLon ?? profileAreaCenterLon,
						city: parsed.city?.name ?? profileAreaCity ?? null,
						state:
							parsed.state?.name ??
							cityStateForCenter?.name ??
							profileAreaState ??
							null,
					}
			  );
		const hasCenter = center.lat != null && center.lon != null;
		const centerPoint = hasCenter
			? { lat: center.lat as number, lon: center.lon as number }
			: null;
		// When the query had an explicit place we use a tighter radius. With no
		// place at all and only an IP-resolved center, we soft-bias toward locality
		// without hard-filtering — anything beyond the radius can still surface,
		// just with a smaller locality multiplier.
		const radiusKm = overrideRadiusKm ?? (parsed.hadExplicitPlace ? 250 : DEFAULT_LOCALITY_RADIUS_KM);
		const emptyResponse = (
			retrieverBreakdown: Record<string, number>
		): FreeTextSearchResponse =>
			emptyFreeTextSearchResponse({
				rawQuery,
				parsed,
				centerPoint,
				retrieverBreakdown,
			});

		if (keywordMode) {
			const keywordCenter = strictRadiusActive ? strictCenter : null;
			const keywordRadiusKm = strictRadiusActive ? strictRadiusKm : null;
			const keywordResponse = await withBudgetFallback(
				() =>
					runKeywordSearch({
						rawQuery,
						parsed,
						centerPoint: keywordCenter,
						radiusKm: keywordRadiusKm,
						requestedLimit,
					}),
				{
					timeoutMs: getSearchRouteTimeoutMs(
						requestStartedAt,
						SEARCH_ROUTE_PATH_TIMEOUT_MS
					),
					fallback: emptyFreeTextSearchResponse({
						rawQuery,
						parsed,
						centerPoint: keywordCenter,
						retrieverBreakdown: { keyword: 0, timedOut: 1 },
					}),
					tag: 'keyword path',
					requestId,
				}
			);
			console.info(
				`[contacts-search][${requestId}] keyword path returned=${keywordResponse.contacts.length} candidates=${keywordResponse.retrieverBreakdown.keyword ?? 0} strictRadius=${strictRadiusActive} totalMs=${Date.now() - requestStartedAt}`
			);
			return apiResponse(
				applyStrictRadiusToResponse(keywordResponse, strictCenter, strictRadiusKm)
			);
		}

		// Strict state enforcement. When the user explicitly names a state
		// (directly via "in arkansas" or transitively via a city in our dictionary
		// like "music venues in brooklyn" → NY), we hard-filter every retriever
		// to that state and apply a final post-hydration safety net. Out-of-state
		// matches don't help no matter how strong the semantic match is.
		const enforcedState = strictRadiusActive
			? null
			: parsed.state ??
			  (parsed.city?.state
					? (() => {
							const abbr = parsed.city!.state as string;
							// Resolve the city's state abbr back to a state name for enforcement.
							const us = US_STATES.find(
								(s) => s.abbr.toLowerCase() === abbr.toLowerCase()
							);
							return us
								? {
										name: us.name,
										abbr: us.abbr,
										lat: us.centroid.lat,
										lon: us.centroid.lng,
								  }
								: null;
					  })()
					: null);
		const enforcedStateValues = enforcedState
			? [enforcedState.name.toLowerCase(), enforcedState.abbr.toLowerCase()]
			: null;

		// Curated-style locality anchoring. When the query has no explicit place
		// but we have an IP-resolved center, retrievers are hard-filtered to the
		// curated default radius around that center — vague queries should
		// surface local results, not global. With no center at all, we fall back
		// to a CONUS centroid + wide bbox, mirroring curated-search exactly.
		const useImplicitLocality = !parsed.hadExplicitPlace && !enforcedState;
		const implicitLocalityCenter = useImplicitLocality
			? hasCenter
				? centerPoint
				: FALLBACK_CENTER
			: null;
		const implicitLocalityRadiusKm = useImplicitLocality
			? hasCenter
				? DEFAULT_LOCALITY_RADIUS_KM
				: FALLBACK_BBOX_RADIUS_KM
			: null;
		// Center+radius passed to the lexical and prefix retrievers as a hard
		// geo_distance filter. Explicit state still enforces state; if the user also
		// named a city with exact coordinates, geo narrows to that city's radius.
		// With no explicit place, the implicit locality above is used.
		const explicitCityCenter = parsedCityHasExactCenter && parsed.city
			? { lat: parsed.city.lat, lon: parsed.city.lon }
			: null;
		const retrieverCenter = enforcedState
			? explicitCityCenter
			: hasCenter
			? centerPoint
			: implicitLocalityCenter;
		const retrieverRadiusKm = enforcedState
			? explicitCityCenter
				? radiusKm
				: null
			: hasCenter
			? radiusKm
			: implicitLocalityRadiusKm;

		const isNounLed = isNounLedQuery(parsed);

		console.info(
			`[contacts-search][${requestId}] start q="${rawQuery}" categories=${parsed.categories.join(',') || 'none'} city=${parsed.city?.name ?? 'none'} cityPrecision=${parsed.city?.coordinatePrecision ?? 'none'} state=${parsed.state?.abbr ?? 'none'} enforcedState=${enforcedState?.abbr ?? 'none'} implicitLocality=${useImplicitLocality ? `center=${implicitLocalityCenter?.lat},${implicitLocalityCenter?.lon} r=${implicitLocalityRadiusKm}km` : 'no'} restOfQuery="${parsed.restOfQuery}" nounLed=${isNounLed} centerSource=${center.source} radiusKm=${radiusKm} limit=${requestedLimit}`
		);

		// Person-target probe runs only on noun-led queries. The other routing
		// branches (local-business intent, place-only, curated-category) all
		// short-circuit before we need this flag, so we hold off issuing the ES
		// count until we know we're on the hybrid path.

		const localBusinessIntent = resolveLocalBusinessIntent(parsed.restOfQuery);
		if (localBusinessIntent) {
			const localBusinessResponse = await withBudgetFallback(
				() =>
					runLocalBusinessSearch({
						rawQuery,
						parsed,
						intent: localBusinessIntent,
						centerPoint,
						radiusKm,
						requestedLimit,
						strictRadius: strictRadiusActive,
					}),
				{
					timeoutMs: getSearchRouteTimeoutMs(
						requestStartedAt,
						SEARCH_ROUTE_PATH_TIMEOUT_MS
					),
					fallback: emptyResponse({ localBusiness: 0, timedOut: 1 }),
					tag: 'local-business path',
					requestId,
				}
			);
			console.info(
				`[contacts-search][${requestId}] local-business path intent=${localBusinessIntent.key} returned=${localBusinessResponse.contacts.length} candidates=${localBusinessResponse.retrieverBreakdown.localBusiness ?? 0} clean=${localBusinessResponse.retrieverBreakdown.localBusinessClean ?? 0} missingLocalityAnchor=${localBusinessResponse.retrieverBreakdown.missingLocalityAnchor ?? 0} totalMs=${Date.now() - requestStartedAt}`
			);
			return apiResponse(
				applyStrictRadiusToResponse(localBusinessResponse, strictCenter, strictRadiusKm)
			);
		}

		// Place-only fallback: the user typed only a city or state (or "best
		// nashville", "near LA"). Run the curated nearby picks pipeline anchored
		// at the parsed place. Same response shape, no UI change — the dashboard
		// surfaces these through the existing curated-results state pipe.
		// Live-music prioritization is intrinsic to the curated ES sampler.
		if (isPlaceOnlyQuery(parsed)) {
			const placeCenter =
				strictRadiusActive && strictCenter
					? strictCenter
					: parsed.city
					? { lat: parsed.city.lat, lon: parsed.city.lon }
					: { lat: parsed.state!.lat, lon: parsed.state!.lon };
			const placeRadiusKm = overrideRadiusKm ?? DEFAULT_LOCALITY_RADIUS_KM;
			const placeEnforcedState =
				!strictRadiusActive && parsed.state
					? { name: parsed.state.name, abbr: parsed.state.abbr }
					: null;
			const placeResponse = await withBudgetFallback(
				() =>
					runPlaceOnlyCuratedSearch({
						rawQuery,
						parsed,
						centerPoint: placeCenter,
						radiusKm: placeRadiusKm,
						requestedLimit,
						enforcedState: placeEnforcedState,
						strictRadius: strictRadiusActive,
						logTag: `[contacts-search][${requestId}][place-only]`,
					}),
				{
					timeoutMs: getSearchRouteTimeoutMs(
						requestStartedAt,
						SEARCH_ROUTE_PATH_TIMEOUT_MS
					),
					fallback: emptyResponse({ curatedNearby: 0, timedOut: 1 }),
					tag: 'place-only curated path',
					requestId,
				}
			);
			console.info(
				`[contacts-search][${requestId}] place-only path place=${
					parsed.city?.name ?? parsed.state?.name ?? 'unknown'
				} stateEnforced=${placeEnforcedState?.abbr ?? 'no'} returned=${
					placeResponse.contacts.length
				} totalMs=${Date.now() - requestStartedAt}`
			);
			return apiResponse(
				applyStrictRadiusToResponse(placeResponse, strictCenter, strictRadiusKm)
			);
		}

		if (
			parsed.categories.length > 0 &&
			isVagueCategoryRest(parsed.restOfQuery)
		) {
			const curatedCategoryResponse = await withBudgetFallback(
				() =>
					runCuratedCategorySearch({
						rawQuery,
						parsed,
						centerPoint,
						radiusKm,
						requestedLimit,
						strictRadius: strictRadiusActive,
					}),
				{
					timeoutMs: getSearchRouteTimeoutMs(
						requestStartedAt,
						SEARCH_ROUTE_PATH_TIMEOUT_MS
					),
					fallback: emptyResponse({ curatedLocal: 0, timedOut: 1 }),
					tag: 'curated-local category path',
					requestId,
				}
			);
			console.info(
				`[contacts-search][${requestId}] curated-local category path returned=${curatedCategoryResponse.contacts.length} candidates=${curatedCategoryResponse.retrieverBreakdown.curatedLocal ?? 0} missingLocalityAnchor=${curatedCategoryResponse.retrieverBreakdown.missingLocalityAnchor ?? 0} totalMs=${Date.now() - requestStartedAt}`
			);
			return apiResponse(
				applyStrictRadiusToResponse(curatedCategoryResponse, strictCenter, strictRadiusKm)
			);
		}

		const fetchStarted = Date.now();
		const retrievers: RetrieverResult[] = [];

		// Retriever A — kNN over `vector_field` via the existing
		// searchSimilarContacts pipeline. Only when there's substantive query text
		// to embed; if the user typed only a category and a place, we let lexical
		// + prefix carry the load (no point burning an embedding on an empty
		// rest-of-query).
		const knnBaseText = parsed.restOfQuery.length > 2 ? parsed.restOfQuery : rawQuery;
		const knnCategoryText = parsed.categories.length > 0
			? `${parsed.categories.join(' ')} ${knnBaseText}`.trim()
			: knnBaseText;
		// Profile mode biases the semantic embedding toward the artist's genre + a
		// few bio keywords. This touches ONLY knnText (the embedded string), never
		// rawQuery — the lexical retriever and literal-title regex keep the user's
		// exact words. The embedding cache keys on this same string (vectorDb
		// normalizeQueryEmbeddingKey <-> createTextEmbedding both use restOfQuery =
		// knnText), so distinct identities never collide in the cache.
		const knnText =
			profileActive && profileEmbedText
				? `${knnCategoryText} ${profileEmbedText}`.trim()
				: knnCategoryText;
		const shouldRunKnn = knnText.trim().length > 1;

		type KnnResult = Awaited<ReturnType<typeof searchSimilarContacts>>;
		type LexicalResult = Awaited<ReturnType<typeof lexicalSearchContacts>>;
		type PrefixResult = Awaited<ReturnType<typeof titlePrefixSearchContacts>>;
		const emptyKnn: KnnResult = { matches: [], totalFound: 0, locationStrategy: 'flexible' };
		const emptyLexical: LexicalResult = { matches: [], totalFound: 0 };
		const emptyPrefix: PrefixResult = { matches: [], totalFound: 0 };

		const [knnResult, lexicalResult, prefixResult, personTargetProbe] =
			await Promise.all([
				shouldRunKnn
					? withTimeout(
							searchSimilarContacts(
								{
									city: parsed.city?.name ?? null,
									state: enforcedState?.name ?? null,
									country: parsed.country,
									restOfQuery: knnText,
								},
								PER_RETRIEVER_TAKE,
								// Always 'flexible'. kNN's state.keyword strict filter is too
								// brittle against the wild variants present in production data
								// (e.g. "Arkansas, USA"). We enforce state at the lexical/prefix
								// retriever level and again as a post-hydration safety net,
								// where matching is permissive enough to handle dirty values.
								'flexible'
							),
							KNN_TIMEOUT_MS,
							emptyKnn,
							'kNN retriever',
							requestId
					  )
					: Promise.resolve(emptyKnn),
				withTimeout(
					lexicalSearchContacts({
						queryText: rawQuery,
						limit: PER_RETRIEVER_TAKE,
						titlePrefixes: parsed.categories.length > 0 ? parsed.categories : undefined,
						city: parsed.city?.name ?? null,
						state: enforcedState?.abbr ?? null,
						country: parsed.country,
						center: retrieverCenter,
						radiusKm: retrieverRadiusKm,
						enforcedStateValues,
						shortQueryMode: isNounLed,
					}),
					LEXICAL_TIMEOUT_MS,
					emptyLexical,
					'lexical retriever',
					requestId
				),
				parsed.categories.length > 0
					? withTimeout(
							titlePrefixSearchContacts({
								titlePrefixes: parsed.categories,
								limit: PER_RETRIEVER_TAKE,
								center: retrieverCenter,
								radiusKm: retrieverRadiusKm,
								enforcedStateValues,
							}),
							PREFIX_TIMEOUT_MS,
							emptyPrefix,
							'prefix retriever',
							requestId
					  )
					: Promise.resolve(emptyPrefix),
				detectQueryTargetsPerson(parsed, isNounLed, requestId),
			]);
		const queryTargetsPerson = personTargetProbe.targetsPerson;

		const collectIds = (matches: { id: string | undefined }[]): number[] => {
			const out: number[] = [];
			const seen = new Set<number>();
			for (const m of matches) {
				const idNum = Number(m.id);
				if (!Number.isFinite(idNum)) continue;
				const id = Math.trunc(idNum);
				if (seen.has(id)) continue;
				seen.add(id);
				out.push(id);
			}
			return out;
		};

		const knnIds = collectIds(knnResult.matches);
		const lexicalIds = collectIds(lexicalResult.matches);
		const prefixIds = collectIds(prefixResult.matches);

		retrievers.push({ name: 'knn', ids: knnIds });
		retrievers.push({ name: 'lexical', ids: lexicalIds });
		if (prefixIds.length > 0) retrievers.push({ name: 'prefix', ids: prefixIds });

		const rrfScores = buildRrfRankMap(retrievers);
		const allIds = [...rrfScores.keys()];

		// Short-circuit only when the user gave us an explicit place anchor or
		// enforced state. With implicit locality we drop through so the
		// national-fallback can still try going wide — the geo filters on
		// lexical/prefix may have been the limiting factor.
		if (allIds.length === 0 && !useImplicitLocality) {
			console.info(
				`[contacts-search][${requestId}] no candidates; q="${rawQuery}" durationMs=${Date.now() - requestStartedAt}`
			);
			return apiResponse({
				query: rawQuery,
				parsed: {
					categories: parsed.categories,
					city: parsed.city?.name ?? null,
					state: parsed.state?.name ?? null,
					country: parsed.country,
					restOfQuery: parsed.restOfQuery,
				},
				center: centerPoint,
				radiusKm: hasCenter ? radiusKm : null,
				retrieverBreakdown: {
					knn: knnIds.length,
					lexical: lexicalIds.length,
					prefix: prefixIds.length,
				},
				cleanlinessBreakdown: {
					'canonical-clean': 0,
					'clean-business': 0,
					'clean-person': 0,
					loose: 0,
				},
				contacts: [],
			} satisfies FreeTextSearchResponse);
		}

		// Hydrate full Contact rows. Cap at 600 to keep the payload bounded —
		// after rank fusion we only need the top ~150 to apply multipliers and
		// trim to `requestedLimit`. Strictly more than enough headroom.
		const HYDRATE_CAP = Math.min(600, allIds.length);
		const topIdsForHydration = allIds
			.slice()
			.sort((a, b) => (rrfScores.get(b) ?? 0) - (rrfScores.get(a) ?? 0))
			.slice(0, HYDRATE_CAP);

		const hydrated = await withBudgetFallback(
			() =>
				prisma.contact.findMany({
					where: { id: { in: topIdsForHydration } },
				}),
			{
				timeoutMs: getSearchRouteTimeoutMs(
					requestStartedAt,
					SEARCH_ROUTE_PRISMA_TIMEOUT_MS
				),
				fallback: [],
				tag: 'stage1 Prisma hydration',
				requestId,
			}
		);
		// `byIdAll` is the unfiltered master map — Stage 2 (national fallback)
		// reuses it so the implicit-locality drop doesn't leak across stages.
		// Stage 1 derives `byIdStage1` and applies the locality + state safety
		// nets to that copy.
		const byIdAll = new Map<number, Contact>();
		for (const c of hydrated) byIdAll.set(c.id, c);
		const byIdStage1 = new Map<number, Contact>(byIdAll);

		// Final state-enforcement safety net. The lexical/prefix retrievers
		// already applied an ES state filter, but kNN ran in flexible mode and
		// can return out-of-state rows. We accept a row if any of:
		//   - contact.state exactly matches name or abbr (lowercase)
		//   - contact.state STARTS with name or abbr (handles dirty values like
		//     "Arkansas, USA" or "AR, US")
		//   - contact.title contains the state name (canonical "<Cat> <State>"
		//     rows where state is null in the DB)
		// This stays strict on intent ("only show Arkansas") while tolerating
		// the variance present in production contact data.
		// kNN ran in flexible mode so its candidates can be from anywhere. When
		// implicit locality is in effect (vague query + IP center), drop hydrated
		// rows beyond the locality radius — the lexical/prefix retrievers were
		// already geo-filtered, but kNN-only ids would otherwise leak through.
		if (
			useImplicitLocality &&
			implicitLocalityCenter &&
			implicitLocalityRadiusKm
		) {
			for (const [id, contact] of byIdStage1) {
				if (contact.latitude == null || contact.longitude == null) {
					byIdStage1.delete(id);
					continue;
				}
				const d = distanceKm(implicitLocalityCenter, {
					lat: contact.latitude,
					lon: contact.longitude,
				});
				if (d > implicitLocalityRadiusKm) byIdStage1.delete(id);
			}
		}

		if (enforcedStateValues && enforcedState) {
			const stateNameLc = enforcedState.name.toLowerCase();
			const stateAbbrLc = enforcedState.abbr.toLowerCase();
			const allowed = new Set(enforcedStateValues);
			for (const [id, contact] of byIdStage1) {
				const s = (contact.state ?? '').trim().toLowerCase();
				const titleLc = (contact.title ?? '').toLowerCase();
				const stateExact = s.length > 0 && allowed.has(s);
				const statePrefixed =
					s.length > 0 &&
					(s.startsWith(stateNameLc + ',') ||
						s.startsWith(stateNameLc + ' ') ||
						s.startsWith(stateAbbrLc + ',') ||
						s.startsWith(stateAbbrLc + ' '));
				const titleHasState =
					titleLc.includes(' ' + stateNameLc) ||
					titleLc.endsWith(' ' + stateNameLc) ||
					titleLc.endsWith(' ' + stateAbbrLc);
				if (!stateExact && !statePrefixed && !titleHasState) byIdStage1.delete(id);
			}
		}

		// Stage 1: locally-anchored scoring and interleave. Hard-drops noun-led
		// person/loose rows; locality multiplier is active. Strict literal
		// match (no prefix tolerance, no headline boost) — those would help
		// out-of-domain queries but hurt healthy in-domain ones like "deli".
		const stage1 = scoreAndInterleave({
			ids: topIdsForHydration,
			byId: byIdStage1,
			rrfScores,
			parsed,
			centerPoint,
			hasCenter,
			radiusKm,
			isNounLed,
			neutralizeLocality: false,
			dropPersonOrLoose: true,
			queryTargetsPerson,
			literalSweepMode: false,
			profileGenreTerms,
			limit: requestedLimit,
		});

		let finalContacts = stage1.finalContacts;
		let expansionMode: 'none' | 'national-fallback' = 'none';
		let cleanlinessBreakdown: Record<CleanlinessTier, number> = {
			'canonical-clean': 0,
			'clean-business': 0,
			'clean-person': 0,
			loose: 0,
		};
		for (const c of finalContacts) cleanlinessBreakdown[c.searchCleanliness] += 1;

		// National-fallback trigger. Only eligible when the query had no
		// explicit place and no enforced state — those are explicit user
		// signals we don't override. When sparse (count below threshold OR no
		// row literally matched the query text), re-issue retrievers without
		// geo and re-score with locality neutralized.
		const sparseTrigger: 'countLow' | 'literalLow' | 'both' | null = (() => {
			if (!useImplicitLocality) return null;
			// Going national would contradict a hard radius — never relax it.
			if (strictRadiusActive) return null;
			if (
				getSearchRouteTimeoutMs(
					requestStartedAt,
					NATIONAL_FALLBACK_LEXICAL_TIMEOUT_MS
				) <= 0
			) {
				console.warn(
					`[contacts-search][${requestId}] skipping national fallback because route budget is exhausted`
				);
				return null;
			}
			const countLow =
				stage1.finalContacts.length < NATIONAL_FALLBACK_SPARSE_THRESHOLD;
			const literalLow =
				stage1.literalMatchCount < NATIONAL_FALLBACK_LITERAL_MATCH_FLOOR;
			if (!countLow && !literalLow) return null;
			if (countLow && literalLow) return 'both';
			return countLow ? 'countLow' : 'literalLow';
		})();

		let stage2Lex = 0;
		let stage2Prefix = 0;
		let stage2HydratedNew = 0;
		let stage2LiteralMatchCount = 0;
		let stage2Ms = 0;

		if (sparseTrigger !== null) {
			const stage2StartedAt = Date.now();
			const [lexicalResultWide, prefixResultWide] = await Promise.all([
				withTimeout(
					lexicalSearchContacts({
						queryText: rawQuery,
						limit: PER_RETRIEVER_TAKE,
						titlePrefixes:
							parsed.categories.length > 0 ? parsed.categories : undefined,
						city: parsed.city?.name ?? null,
						state: null,
						country: parsed.country,
						center: null,
						radiusKm: null,
						enforcedStateValues: null,
						// literalSweep takes precedence over shortQueryMode in
						// the retriever — wide field list incl. headline /
						// metadata / company-meta, no fuzziness, plus a
						// phrase_prefix pass for morphological matches.
						literalSweepMode: true,
					}),
					NATIONAL_FALLBACK_LEXICAL_TIMEOUT_MS,
					emptyLexical,
					'national-fallback lexical retriever',
					requestId
				),
				parsed.categories.length > 0
					? withTimeout(
							titlePrefixSearchContacts({
								titlePrefixes: parsed.categories,
								limit: PER_RETRIEVER_TAKE,
								center: null,
								radiusKm: null,
								enforcedStateValues: null,
							}),
							NATIONAL_FALLBACK_PREFIX_TIMEOUT_MS,
							emptyPrefix,
							'national-fallback prefix retriever',
							requestId
					  )
					: Promise.resolve(emptyPrefix),
			]);

			const lexicalIdsWide = collectIds(lexicalResultWide.matches);
			const prefixIdsWide = collectIds(prefixResultWide.matches);
			stage2Lex = lexicalIdsWide.length;
			stage2Prefix = prefixIdsWide.length;

			// Reuse the global kNN we already ran. Build wide RRF over kNN +
			// no-geo lexical (+ no-geo prefix when present).
			const retrieversWide: RetrieverResult[] = [
				{ name: 'knn', ids: knnIds },
				{ name: 'lexicalNoGeo', ids: lexicalIdsWide },
			];
			if (prefixIdsWide.length > 0) {
				retrieversWide.push({ name: 'prefixNoGeo', ids: prefixIdsWide });
			}
			const rrfScoresWide = buildRrfRankMap(retrieversWide);
			const allIdsWide = [...rrfScoresWide.keys()];
			const HYDRATE_CAP_WIDE = Math.min(600, allIdsWide.length);
			const topIdsForHydrationWide = allIdsWide
				.slice()
				.sort((a, b) => (rrfScoresWide.get(b) ?? 0) - (rrfScoresWide.get(a) ?? 0))
				.slice(0, HYDRATE_CAP_WIDE);

			// Incremental hydration — Prisma-fetch only IDs we don't already
			// have in the master map.
			const newIdsToHydrate = topIdsForHydrationWide.filter(
				(id) => !byIdAll.has(id)
			);
			if (newIdsToHydrate.length > 0) {
				const hydratedNew = await withBudgetFallback(
					() =>
						prisma.contact.findMany({
							where: { id: { in: newIdsToHydrate } },
						}),
					{
						timeoutMs: getSearchRouteTimeoutMs(
							requestStartedAt,
							SEARCH_ROUTE_PRISMA_TIMEOUT_MS
						),
						fallback: [],
						tag: 'national-fallback Prisma hydration',
						requestId,
					}
				);
				for (const c of hydratedNew) byIdAll.set(c.id, c);
				stage2HydratedNew = hydratedNew.length;
			}

			const stage2 = scoreAndInterleave({
				ids: topIdsForHydrationWide,
				byId: byIdAll,
				rrfScores: rrfScoresWide,
				parsed,
				centerPoint,
				hasCenter,
				radiusKm,
				isNounLed,
				neutralizeLocality: true,
				dropPersonOrLoose: false,
				queryTargetsPerson,
				literalSweepMode: true,
				profileGenreTerms,
				limit: Math.min(requestedLimit, NATIONAL_FALLBACK_LIMIT_CAP),
			});
			stage2LiteralMatchCount = stage2.literalMatchCount;

			finalContacts = stage2.finalContacts;
			expansionMode = 'national-fallback';
			cleanlinessBreakdown = {
				'canonical-clean': 0,
				'clean-business': 0,
				'clean-person': 0,
				loose: 0,
			};
			for (const c of finalContacts) cleanlinessBreakdown[c.searchCleanliness] += 1;
			stage2Ms = Date.now() - stage2StartedAt;
		}

		// Strict radius: final hard geographic gate. Belt-and-suspenders over the ES
		// geo filters — kNN has none, null-coord rows can ride RRF, and (fallback is
		// suppressed above). Guarantees every returned contact sits inside the drawn
		// circle. Reuses the haversine distanceKm and drops rows missing coordinates.
		if (strictCenter && strictRadiusKm != null) {
			finalContacts = finalContacts.filter(
				(c) =>
					c.latitude != null &&
					c.longitude != null &&
					distanceKm(strictCenter, { lat: c.latitude, lon: c.longitude }) <=
						strictRadiusKm
			);
			cleanlinessBreakdown = {
				'canonical-clean': 0,
				'clean-business': 0,
				'clean-person': 0,
				loose: 0,
			};
			for (const c of finalContacts) cleanlinessBreakdown[c.searchCleanliness] += 1;
		}

		const fetchMs = Date.now() - fetchStarted;
		console.info(
			`[contacts-search][${requestId}] q="${rawQuery}" knn=${knnIds.length} lex=${lexicalIds.length} prefix=${prefixIds.length} hydrated=${hydrated.length} nounLed=${isNounLed} personTarget=${queryTargetsPerson}(matches=${personTargetProbe.matchCount}) droppedPersonOrLoose=${stage1.droppedPersonOrLoose} stage1Returned=${stage1.finalContacts.length} stage1LiteralMatches=${stage1.literalMatchCount} expansionMode=${expansionMode}` +
				(expansionMode === 'national-fallback'
					? ` sparseTrigger=${sparseTrigger} stage2Lex=${stage2Lex} stage2Prefix=${stage2Prefix} stage2HydratedNew=${stage2HydratedNew} stage2LiteralMatches=${stage2LiteralMatchCount} stage2Ms=${stage2Ms}`
					: '') +
				` returned=${finalContacts.length} fetchMs=${fetchMs} totalMs=${Date.now() - requestStartedAt} cleanliness=` +
				Object.entries(cleanlinessBreakdown)
					.filter(([, n]) => n > 0)
					.map(([k, n]) => `${k}:${n}`)
					.join(',') +
				` clientAborted=${clientAborted}`
		);

		const retrieverBreakdown: Record<string, number> = {
			knn: knnIds.length,
			lexical: lexicalIds.length,
			prefix: prefixIds.length,
		};
		if (expansionMode === 'national-fallback') {
			retrieverBreakdown.lexicalNoGeo = stage2Lex;
			retrieverBreakdown.prefixNoGeo = stage2Prefix;
			retrieverBreakdown.hydratedWide = stage2HydratedNew;
		}

		const response: FreeTextSearchResponse = {
			query: rawQuery,
			parsed: {
				categories: parsed.categories,
				city: parsed.city?.name ?? null,
				state: parsed.state?.name ?? null,
				country: parsed.country,
				restOfQuery: parsed.restOfQuery,
			},
			center: strictRadiusActive && strictCenter ? strictCenter : centerPoint,
			radiusKm:
				strictRadiusActive && strictRadiusKm != null
					? strictRadiusKm
					: expansionMode === 'national-fallback'
					? null
					: hasCenter
					? radiusKm
					: null,
			retrieverBreakdown,
			cleanlinessBreakdown,
			contacts: finalContacts,
			expansionMode,
		};

		return apiResponse(response);
	} catch (error) {
		console.error(
			`[contacts-search][${requestId}] failed after ${Date.now() - requestStartedAt}ms clientAborted=${clientAborted}`,
			error
		);
		return handleApiError(error);
	} finally {
		req.signal.removeEventListener('abort', onAbort);
	}
}
