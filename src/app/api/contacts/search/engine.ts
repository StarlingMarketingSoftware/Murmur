import { Contact } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
	countPersonTitleMatches,
	keywordSearchContacts,
	lexicalSearchContacts,
	orgTypeSearchContacts,
	searchSimilarContacts,
	titlePrefixSearchContacts,
	type StructuredQueryTerms,
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
import {
	buildCityAnchorRadiusLadder,
	buildRadiusLadder,
} from '@/app/api/contacts/curated-search/distribution';
import { parseFreeTextSearchQuery } from './parse';
import { getCityGazetteer } from './cityGazetteer';
import {
	isNounLedQuery,
	isPlaceOnlyQuery,
	isVagueCategoryRest,
	resolveLocalBusinessIntent,
	type LocalBusinessIntent,
} from './queryPredicates';
import { isSearchLlmIntentEnabled, isSearchRankingV2Enabled } from './flags';
import {
	getQueryIntent,
	intentIsActionable,
	intentOverridesCategory,
	type QueryIntent,
	type QueryIntentResolution,
} from './queryUnderstanding';
import { orgTypeRecipeByKey } from './orgTypeRegistry';

// The free-text search ENGINE — extracted verbatim from the route handler so
// (a) the legacy /api/contacts route can delegate general queries to the same
// brain and (b) the search-quality harness can run the full pipeline against
// local ES with a synthetic hydrator (dev Postgres ids do not match dev ES).
// HTTP concerns (auth, rate limiting, param parsing, error mapping) live in
// the route shells, NOT here.

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
// Exact-city anchors ("Hartford CT") search tight around the city and expand
// gradually only when sparse — the 250km default around a city scatters the
// tray across neighboring states. The hybrid retrievers keep a slightly wider
// hard geo circle so recall doesn't starve before proximity scoring orders it.
const CITY_ANCHOR_RADIUS_KM = 30;
const CITY_HYBRID_GEO_RADIUS_KM = 60;
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

export const createRequestId = (): string => Math.random().toString(36).slice(2, 8);

export const parseFloatOrNull = (value: string | null): number | null => {
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
// Intent-conditioned tables (SEARCH_RANKING_V2). person-role puts persons 5×
// ahead of canonical venue rows — today's default table has it 3.3× the OTHER
// way, which is the primary "I search professor, I get venues" mechanism.
// business stays at 1.6 so an org row with direct literal evidence can still
// win. org-type leads with business but keeps persons competitive — label
// A&R staff are clean-person rows at label companies.
const PERSON_ROLE_CLEANLINESS_MULTIPLIER: Record<CleanlinessTier, number> = {
	'canonical-clean': 0.5,
	'clean-business': 1.6,
	'clean-person': 2.5,
	loose: 1.2,
};

const ORG_TARGETED_CLEANLINESS_MULTIPLIER: Record<CleanlinessTier, number> = {
	'canonical-clean': 0.8,
	'clean-business': 2.5,
	'clean-person': 1.8,
	loose: 1.0,
};

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

// VAGUE_REST_TOKENS, LOCAL_BUSINESS_INTENTS, isVagueCategoryRest,
// isPlaceOnlyQuery, isNounLedQuery, resolveLocalBusinessIntent moved to
// ./queryPredicates.ts (pure move — check scripts exercise the dispatch
// logic without importing this route).

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
	radiusLadder: (number | null)[],
	nearFirst?: boolean
): { contacts: Contact[]; radiusUsed: number | null } => {
	const perPoolLimit = Math.max(requestedLimit * 2, perCategoryShare * 3, 12);

	// City-precision anchors: concatenate rung outputs tightest-first (dedup)
	// so allocation consumes in-town picks before padding from wider rungs.
	// Mirrors runCuratedNearbyPicks' buildCategoryPool nearFirst mode.
	if (nearFirst && center) {
		const picked: Contact[] = [];
		const seen = new Set<number>();
		for (const radius of radiusLadder) {
			if (picked.length >= perPoolLimit) break;
			const localized = applyRadius(contacts, center, radius);
			if (localized.length === 0) continue;
			const fresh = localized.filter((c) => !seen.has(c.id));
			if (fresh.length === 0) continue;
			const distributed = distributeAcrossBuckets(
				fresh,
				perPoolLimit - picked.length,
				center,
				radius
			);
			for (const c of distributed) {
				if (seen.has(c.id)) continue;
				seen.add(c.id);
				picked.push(c);
			}
		}
		return { contacts: picked, radiusUsed: requestedRadiusKm };
	}

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
	// Per-retriever RRF weight (blended mode only — legacy callers omit it and
	// the math is byte-identical). Local docs found by BOTH lexical lists sum
	// 0.6+0.6=1.2 lexical weight — built-in local preference without a hard
	// geo filter.
	weight?: number;
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
		const weight = r.weight ?? 1;
		r.ids.forEach((id, idx) => {
			const contribution = weight / (RRF_K + idx + 1);
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
	ipHeaders: Headers | null,
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
	const headers = ipHeaders;
	if (!headers) {
		return { lat: null, lon: null, city: null, region: null, source: 'none' };
	}
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
	// implicit-locality results and re-issued retrievers globally.
	// 'blended-national' when the SEARCH_RANKING_V2 blended stage returned
	// rows beyond the old implicit radius (single-pass national retrieval with
	// local preference). Absent on the curated/place-only/local-business
	// branches and on the non-expanded hybrid path.
	expansionMode?: 'none' | 'national-fallback' | 'blended-national';
	// Honest-void evidence gate outcome (SEARCH_RANKING_V2, person-role/
	// org-type intents only): 'sparse' = below the evidence floor, only proven
	// rows returned, NO padding; 'partial'/'full' = evidence rows + kNN
	// band-mates. Absent when the gate didn't run. Additive — old clients
	// ignore it; the UI can message "few real matches for X".
	coverage?: 'full' | 'partial' | 'sparse';
	evidence?: { literalMatches: number; knnBandMatches: number };
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

type EnforcedState = { name: string; abbr: string };

// Permissive any-of state predicate shared by the post-hydration safety net
// and the curated/local-business candidate filters. Accepts a contact when
// its state exactly matches or starts with any enforced state's name/abbr
// (handles dirty values like "Arkansas, USA"), or when its title carries the
// state name/abbr (canonical "<Category> <State>" rows with null state).
const contactMatchesAnyEnforcedState = (
	contact: { state: string | null; title: string | null },
	states: readonly EnforcedState[]
): boolean => {
	const s = (contact.state ?? '').trim().toLowerCase();
	const titleLc = (contact.title ?? '').toLowerCase();
	for (const state of states) {
		const nameLc = state.name.toLowerCase();
		const abbrLc = state.abbr.toLowerCase();
		if (s.length > 0) {
			if (s === nameLc || s === abbrLc) return true;
			if (
				s.startsWith(nameLc + ',') ||
				s.startsWith(nameLc + ' ') ||
				s.startsWith(abbrLc + ',') ||
				s.startsWith(abbrLc + ' ')
			) {
				return true;
			}
		}
		if (
			titleLc.includes(' ' + nameLc) ||
			titleLc.endsWith(' ' + nameLc) ||
			titleLc.endsWith(' ' + abbrLc)
		) {
			return true;
		}
	}
	return false;
};

const runCuratedCategorySearch = async (options: {
	rawQuery: string;
	parsed: ReturnType<typeof parseFreeTextSearchQuery>;
	centerPoint: { lat: number; lon: number } | null;
	radiusKm: number;
	requestedLimit: number;
	strictRadius?: boolean;
	enforcedStates?: EnforcedState[] | null;
	cityPrecisionAnchor?: boolean;
	metroRegionAnchor?: boolean;
}): Promise<FreeTextSearchResponse> => {
	const {
		rawQuery,
		parsed,
		centerPoint,
		radiusKm,
		requestedLimit,
		strictRadius = false,
		enforcedStates = null,
		cityPrecisionAnchor = false,
		metroRegionAnchor = false,
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
	const tightCityAnchor = cityPrecisionAnchor && !strictRadius;
	// City anchors fetch tight around the city — the wide default envelope
	// (~350km for a 30km anchor) spans whole other metros and the take-cap
	// (id-ordered) would starve the tight rungs of local candidates. Metro
	// regions fetch their own circle.
	const fetchBboxRadiusKm = tightCityAnchor
		? Math.max(120, requestedRadiusKm * 4)
		: metroRegionAnchor
		? requestedRadiusKm * CURATED_CATEGORY_FETCH_BUFFER
		: Math.max(
				requestedRadiusKm,
				DEFAULT_LOCALITY_RADIUS_KM
		  ) * CURATED_CATEGORY_FETCH_BUFFER;
	const fetchBbox = bboxFromCenter(queryCenter, fetchBboxRadiusKm);

	const fetched = await prisma.contact.findMany({
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
	// Region/state enforcement happens at the candidate level — the fetch bbox
	// is a circle and circles around multi-state regions admit neighbors
	// ("midwest" circle includes Denver/Nashville/Toronto).
	const candidates =
		enforcedStates && enforcedStates.length > 0
			? fetched.filter((contact) =>
					contactMatchesAnyEnforcedState(contact, enforcedStates)
			  )
			: fetched;

	const perCategoryShare = Math.ceil(
		requestedLimit / Math.max(1, activeCategories.length)
	);
	// Metro regions never expand past their circle — "bay area" filled from
	// 250km away isn't the Bay Area. City anchors get the tight near-first
	// ladder; everything else keeps the classic expansion.
	const radiusLadder = tightCityAnchor
		? buildCityAnchorRadiusLadder(requestedRadiusKm)
		: metroRegionAnchor && !strictRadius
		? [requestedRadiusKm, requestedRadiusKm * 1.25]
		: buildRadiusLadder(requestedRadiusKm, fetchBboxRadiusKm, strictRadius);

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
				radiusLadder,
				tightCityAnchor
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
	enforcedStates?: EnforcedState[] | null;
	cityPrecisionAnchor?: boolean;
	metroRegionAnchor?: boolean;
}): Promise<FreeTextSearchResponse> => {
	const {
		rawQuery,
		parsed,
		intent,
		centerPoint,
		radiusKm,
		requestedLimit,
		strictRadius = false,
		enforcedStates = null,
		cityPrecisionAnchor = false,
		metroRegionAnchor = false,
	} = options;
	if (!centerPoint) {
		return emptyFreeTextSearchResponse({
			rawQuery,
			parsed,
			centerPoint,
			retrieverBreakdown: { localBusiness: 0, missingLocalityAnchor: 1 },
		});
	}

	const tightCityAnchor = cityPrecisionAnchor && !strictRadius;
	const fetchBboxRadiusKm = tightCityAnchor
		? Math.max(120, radiusKm * 4)
		: metroRegionAnchor
		? radiusKm * CURATED_CATEGORY_FETCH_BUFFER
		: Math.max(radiusKm, DEFAULT_LOCALITY_RADIUS_KM) * CURATED_CATEGORY_FETCH_BUFFER;
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
		.filter(
			({ contact, score }) =>
				score > 0 &&
				cleanBusinessCandidate(contact) &&
				(!enforcedStates ||
					enforcedStates.length === 0 ||
					contactMatchesAnyEnforcedState(contact, enforcedStates))
		);

	const radiusLadder = tightCityAnchor
		? buildCityAnchorRadiusLadder(radiusKm)
		: metroRegionAnchor && !strictRadius
		? [radiusKm, radiusKm * 1.25]
		: buildRadiusLadder(radiusKm, fetchBboxRadiusKm, strictRadius);
	let selected: Contact[] = [];
	if (tightCityAnchor) {
		// Tight anchor: fill near-first across the graduated rungs instead of
		// stopping at the first non-empty rung (which could return 2 rows) or
		// jumping wide (which scatters).
		const seen = new Set<number>();
		for (const radius of radiusLadder) {
			if (selected.length >= Math.max(requestedLimit, 1)) break;
			const localized = applyRadius(
				scored.map(({ contact }) => contact),
				centerPoint,
				radius
			);
			const fresh = localized.filter((c) => !seen.has(c.id));
			if (fresh.length === 0) continue;
			const distributed = distributeAcrossBuckets(
				fresh,
				Math.max(requestedLimit, 1) - selected.length,
				centerPoint,
				radius
			);
			for (const c of distributed) {
				if (seen.has(c.id)) continue;
				seen.add(c.id);
				selected.push(c);
			}
		}
	} else {
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
	enforcedStates: EnforcedState[] | null;
	strictRadius?: boolean;
	cityPrecisionAnchor?: boolean;
	logTag: string;
}): Promise<FreeTextSearchResponse> => {
	const {
		rawQuery,
		parsed,
		centerPoint,
		radiusKm,
		requestedLimit,
		enforcedStates,
		strictRadius = false,
		cityPrecisionAnchor = false,
		logTag,
	} = options;

	// State safety net for state/region queries — the centroid + radius will
	// mostly stay in-region but border picks can leak. Applied INSIDE the
	// picks pipeline (candidate level) so allocation fills the tray with
	// valid rows instead of having a post-filter gut it. City-only queries
	// are NOT state-restricted: typing "Brooklyn" should legitimately surface
	// metro-area picks across NJ too, and the radius keeps things local.
	const stateFilter =
		enforcedStates && enforcedStates.length > 0
			? (c: Contact) => contactMatchesAnyEnforcedState(c, enforcedStates)
			: null;

	const result = await runCuratedNearbyPicks({
		center: centerPoint,
		radiusKm,
		limit: requestedLimit,
		strictRadius,
		stateFilter,
		cityPrecisionAnchor,
		logTag,
	});

	// In-city rows lead the tray for exact-city searches ("Hartford CT" shows
	// Hartford first, then the surrounding towns). Stable partition — the
	// by-design shuffle survives within each group.
	let curatedContacts = result.contacts;
	if (parsed.city) {
		const cityLc = parsed.city.name.trim().toLowerCase();
		const inCity = curatedContacts.filter(
			(c) => (c.city ?? '').trim().toLowerCase() === cityLc
		);
		if (inCity.length > 0) {
			const rest = curatedContacts.filter(
				(c) => (c.city ?? '').trim().toLowerCase() !== cityLc
			);
			curatedContacts = [...inCity, ...rest];
		}
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
	// True when the row carries term-level literal evidence for the intent
	// (role/org/phrase hit). Feeds the honest-void evidence gate.
	hasTermEvidence: boolean;
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
	// SEARCH_RANKING_V2: actionable query intent. null → every intent-
	// conditioned branch below short-circuits to current behavior verbatim.
	intent?: QueryIntent | null;
	// kNN cosine per candidate id (only ids the kNN retriever returned).
	// Anchors the evidence gate's relative-cosine band.
	knnScores?: Map<number, number> | null;
	// Blended mode: implicit-locality hard geo is gone; distance becomes a
	// decay multiplier ladder keyed on intent.localityBias.
	localityDecay?: boolean;
	// Blended mode, person-role/org-type targets: apply the honest-void
	// evidence gate post-sort (janitor must return its 1-2 real rows, never
	// venue padding).
	evidenceGate?: boolean;
}

interface ScoreAndInterleaveResult {
	finalContacts: FreeTextSearchContact[];
	scored: ScoredRow[];
	droppedPersonOrLoose: number;
	literalMatchCount: number;
	coverage: 'full' | 'partial' | 'sparse' | null;
	evidence: { literalMatches: number; knnBandMatches: number } | null;
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
		knnScores,
		localityDecay,
		evidenceGate,
	} = opts;
	const intent = intentIsActionable(opts.intent) ? opts.intent : null;
	// Table precedence: intent person-role/org-type pick their tables; for
	// venue/vibe intents (and no intent) the probe-forced person-safety floor
	// keeps today's behavior — data beats model, the probe can only WIDEN
	// person treatment.
	const cleanlinessTable =
		intent?.targetKind === 'person-role'
			? PERSON_ROLE_CLEANLINESS_MULTIPLIER
			: intent?.targetKind === 'org-type'
			? ORG_TARGETED_CLEANLINESS_MULTIPLIER
			: queryTargetsPerson
			? PERSON_TARGETED_CLEANLINESS_MULTIPLIER
			: CLEANLINESS_MULTIPLIER;
	const intentSuppressesCategory = intentOverridesCategory(
		intent,
		parsed.categories
	);

	// Term-level literal machinery (intent path). Prefix-aware regexes
	// ("plumber" → "Plumbing Corp", "janitor" → "janitorial" — the old literal
	// sweep had this and the gate must not lose it); multi-word terms tolerate
	// whitespace runs. Index 0 = user-literal (full boost), rest = synonyms
	// (reduced boost).
	type CompiledTerm = { re: RegExp; isLiteral: boolean };
	const compileTerms = (terms: readonly (string | null)[]): CompiledTerm[] =>
		terms
			.map((term, index) => {
				const cleaned = (term ?? '').trim().toLowerCase();
				if (!cleaned) return null;
				const pattern = cleaned
					.split(/\s+/)
					.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
					.join('\\s+');
				return {
					re: new RegExp(`\\b${pattern}\\w*`, 'i'),
					isLiteral: index === 0,
				};
			})
			.filter((t): t is CompiledTerm => t !== null);
	const roleTermRes = intent?.personRole
		? compileTerms([
				intent.personRole.canonicalRole,
				...intent.personRole.roleSynonyms,
		  ])
		: [];
	const domainTermRes = intent?.personRole
		? compileTerms([
				intent.personRole.domain,
				...intent.personRole.domainSynonyms,
		  ])
		: [];
	const orgTermRes = intent?.orgType
		? compileTerms([intent.orgType.label, ...intent.orgType.industryTerms])
		: [];
	const phraseRes = intent ? compileTerms(intent.expandedPhrases) : [];
	const phraseLcs = intent
		? intent.expandedPhrases.map((p) => p.trim().toLowerCase()).filter(Boolean)
		: [];

	const explicitPlace = parsed.hadExplicitPlace;
	const onlyOneCategory = parsed.categories.length === 1;
	const liveMusicQuery = parsed.mentionsLiveMusic;
	const exactCityCenter = parsed.city?.coordinatePrecision === 'city';
	const cityState = parsed.city?.state
		? US_STATES.find(
				(s) => s.abbr.toLowerCase() === parsed.city!.state!.toLowerCase()
			  )
		: null;
	// State(s) that count as a locality match: the explicit state, the city's
	// state, or — for region queries — every state in the region.
	const localityStates: { nameLc: string; abbrLc: string }[] = parsed.state
		? [
				{
					nameLc: parsed.state.name.toLowerCase(),
					abbrLc: parsed.state.abbr.toLowerCase(),
				},
		  ]
		: cityState
		? [
				{
					nameLc: cityState.name.toLowerCase(),
					abbrLc: cityState.abbr.toLowerCase(),
				},
		  ]
		: parsed.region
		? parsed.region.states.map((s) => ({
				nameLc: s.name.toLowerCase(),
				abbrLc: s.abbr.toLowerCase(),
		  }))
		: [];
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

		// Term-level hits (intent path) — computed before drop decisions
		// because the venue-target soft demotion needs them.
		const titleValue = contact.title ?? '';
		const companyValue = contact.company ?? '';
		const headlineValue = contact.headline ?? '';
		const industryValue = contact.companyIndustry ?? '';
		const titleLcV2 = titleValue.toLowerCase();
		const companyLcV2 = companyValue.toLowerCase();
		let roleTitleHit: CompiledTerm | null = null;
		let roleHeadlineHit: CompiledTerm | null = null;
		let roleCompanyHit: CompiledTerm | null = null;
		let orgCompanyHit: CompiledTerm | null = null;
		let orgTitleHit: CompiledTerm | null = null;
		let domainTitleHit = false;
		let domainHeadlineHit = false;
		let phraseStarts = false;
		let phraseContains = false;
		if (intent) {
			for (const term of roleTermRes) {
				if (!roleTitleHit && term.re.test(titleValue)) roleTitleHit = term;
				if (!roleHeadlineHit && term.re.test(headlineValue)) roleHeadlineHit = term;
				// Company-surface tier: the servable "plumber" rows are plumbing
				// COMPANIES/engineers with nothing in title/headline.
				if (!roleCompanyHit && term.re.test(companyValue)) roleCompanyHit = term;
			}
			for (const term of orgTermRes) {
				if (
					!orgCompanyHit &&
					(term.re.test(companyValue) || term.re.test(industryValue))
				) {
					orgCompanyHit = term;
				}
				if (!orgTitleHit && term.re.test(titleValue)) orgTitleHit = term;
			}
			domainTitleHit = domainTermRes.some((t) => t.re.test(titleValue));
			domainHeadlineHit = domainTermRes.some((t) => t.re.test(headlineValue));
			phraseStarts = phraseLcs.some(
				(p) => titleLcV2.startsWith(p) || companyLcV2.startsWith(p)
			);
			phraseContains =
				phraseStarts ||
				phraseRes.some((t) => t.re.test(titleValue) || t.re.test(companyValue));
		}
		const roleHit = !!(roleTitleHit || roleHeadlineHit || roleCompanyHit);
		const orgHit = !!(orgCompanyHit || orgTitleHit);
		const hasTermEvidence = intent
			? roleHit || orgHit || phraseContains
			: false;

		if (intent) {
			// person-role / org-type: NEVER hard-drop — the drop is what deleted
			// record-label staff and magazine editors. venue-category / vibe:
			// soft ×0.25 demotion (below, after the base multiplier) replaces
			// the drop; a real "Deli Manager" title survives via its term hit.
		} else if (
			dropPersonOrLoose &&
			isNounLed &&
			!queryTargetsPerson &&
			(cleanliness === 'clean-person' || cleanliness === 'loose')
		) {
			droppedPersonOrLoose++;
			continue;
		}

		let multiplier = cleanlinessTable[cleanliness];
		if (
			intent &&
			(intent.targetKind === 'venue-category' || intent.targetKind === 'vibe') &&
			(cleanliness === 'clean-person' || cleanliness === 'loose') &&
			!hasTermEvidence
		) {
			// Person-leak protection for venue-seeking queries, soft form.
			multiplier *= 0.25;
		}

		let categoryMatch: BookingContactTitlePrefix | null = null;
		if (parsed.categories.length > 0) {
			const matched = parsed.categories.find((p) =>
				matchesAnyTitlePrefix(contact.title, [p])
			);
			if (matched) {
				categoryMatch = matched;
				// When the intent says the parsed category is incidental
				// ("coffee roaster" → Coffee Shops), the venue lift and the
				// non-venue tax are both suppressed — roasteries shouldn't be
				// taxed ×0.25 and coffee-shop trays shouldn't be lifted ×2.1.
				if (!intentSuppressesCategory) {
					multiplier *= parsed.hadExplicitCategory ? 2.1 : 1.5;
				}
			} else if (onlyOneCategory && !intentSuppressesCategory) {
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
					localityStates.some(
						({ nameLc, abbrLc }) =>
							contactStateLc === nameLc ||
							contactStateLc.startsWith(nameLc + ',') ||
							contactStateLc.startsWith(nameLc + ' ') ||
							contactStateLc === abbrLc ||
							contactStateLc.startsWith(abbrLc + ',') ||
							contactStateLc.startsWith(abbrLc + ' ')
					);
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
			} else if (localityDecay && hasCenter) {
				// Blended mode: the hard 250km gate is gone; locality becomes a
				// preference ladder keyed on the intent's locality bias. Rows
				// with NO coordinates (27.8% of the index) are no longer
				// silently invisible — they ride at the ladder's neutral tier.
				const bias = intent?.localityBias ?? 'either';
				const d =
					contact.latitude != null && contact.longitude != null
						? distanceKm(centerPoint!, {
								lat: contact.latitude,
								lon: contact.longitude,
						  })
						: null;
				if (bias === 'local-first') {
					if (d == null) multiplier *= 0.95;
					else if (d <= 50) multiplier *= 1.3;
					else if (d <= 250) multiplier *= 1.15;
					else if (d <= 750) multiplier *= 1.0;
					else multiplier *= 0.85;
				} else if (bias === 'national') {
					if (d != null && d <= 250) multiplier *= 1.1;
				} else {
					if (d == null) multiplier *= 1.0;
					else if (d <= 50) multiplier *= 1.2;
					else if (d <= 250) multiplier *= 1.1;
					else if (d <= 750) multiplier *= 1.0;
					else multiplier *= 0.95;
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

		if (intent) {
			// Term-level literal boosts. Multiplicative so role+domain rows
			// ("Professor of Music") stack above single-signal rows; domain
			// hits apply ONLY alongside a role/org hit on the same row — the
			// anti-pollution rule that keeps "Music Venues Tennessee" from
			// scoring on "music magazine". Product capped ×6.
			let termBoost = 1;
			if (phraseStarts) {
				termBoost *=
					intent.targetKind === 'person-role' ||
					intent.targetKind === 'org-type'
						? 4
						: 2;
			} else {
				if (roleTitleHit) termBoost *= roleTitleHit.isLiteral ? 2.2 : 1.6;
				else if (roleHeadlineHit) termBoost *= 1.5;
				else if (roleCompanyHit) termBoost *= 1.4;
				if (orgCompanyHit) termBoost *= orgCompanyHit.isLiteral ? 2.2 : 1.6;
				else if (orgTitleHit) termBoost *= 1.8;
				if (roleHit || orgHit) {
					if (domainTitleHit) termBoost *= 1.8;
					else if (domainHeadlineHit) termBoost *= 1.4;
				}
				if (!roleHit && !orgHit && phraseContains) termBoost *= 1.8;
			}
			multiplier *= Math.min(termBoost, 6);
			if (hasTermEvidence) literalMatchCount++;
		} else if (restOfQueryWordRe) {
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
			hasTermEvidence,
		});
	}

	scored.sort((a, b) => b.score - a.score);

	// Honest-void evidence gate (blended mode, person-role/org-type targets).
	// Never pad a data-void query with venue junk or semantically-loose kNN
	// neighbors: below the evidence floor return ONLY the proven rows; above
	// it, admit kNN band-mates within 0.02 cosine of the best PROVEN row
	// (absolute cosine can't split void 0.624 from thin 0.644 — anchoring on
	// evidence can; the measured void/thin gap is Δ0.02, so 0.03 would leak).
	const EVIDENCE_FLOOR = 3;
	const KNN_EVIDENCE_BAND = 0.02;
	let coverage: 'full' | 'partial' | 'sparse' | null = null;
	let evidence: { literalMatches: number; knnBandMatches: number } | null =
		null;
	let gatedScored = scored;
	if (
		evidenceGate &&
		intent &&
		(intent.targetKind === 'person-role' || intent.targetKind === 'org-type')
	) {
		const evidenceRows = scored.filter((row) => row.hasTermEvidence);
		if (evidenceRows.length < EVIDENCE_FLOOR) {
			gatedScored = evidenceRows;
			coverage = 'sparse';
			evidence = {
				literalMatches: evidenceRows.length,
				knnBandMatches: 0,
			};
		} else {
			let bestEvidenceCosine = -Infinity;
			for (const row of evidenceRows) {
				const cos = knnScores?.get(row.contact.id);
				if (cos != null && cos > bestEvidenceCosine) bestEvidenceCosine = cos;
			}
			if (!Number.isFinite(bestEvidenceCosine)) {
				// No proven row carries a kNN cosine (lexical/org-only hits
				// outside the kNN top-200) — the band has no anchor, so no
				// band fill: evidence rows only.
				gatedScored = evidenceRows;
				coverage = 'partial';
				evidence = {
					literalMatches: evidenceRows.length,
					knnBandMatches: 0,
				};
			} else {
				const bandFloor = bestEvidenceCosine - KNN_EVIDENCE_BAND;
				let knnBandMatches = 0;
				gatedScored = scored.filter((row) => {
					if (row.hasTermEvidence) return true;
					const cos = knnScores?.get(row.contact.id);
					if (cos != null && cos >= bandFloor) {
						knnBandMatches++;
						return true;
					}
					return false;
				});
				coverage = gatedScored.length >= 20 ? 'full' : 'partial';
				evidence = {
					literalMatches: evidenceRows.length,
					knnBandMatches,
				};
			}
		}
	}

	const interleaveTopN = Math.min(20, gatedScored.length);
	const head = gatedScored.slice(0, interleaveTopN);
	const tail = gatedScored.slice(interleaveTopN);
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
		finalOrder = gatedScored;
	}

	// The explicit-single-category float-to-front must also respect an
	// intent override — otherwise it shoves venue rows to the front of
	// "coffee roaster" and undoes the category-multiplier rescue.
	if (
		parsed.hadExplicitCategory &&
		onlyOneCategory &&
		!intentSuppressesCategory
	) {
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
		coverage,
		evidence,
	};
};

export interface FreeTextSearchParams {
	rawQuery: string;
	overrideLat?: number | null;
	overrideLon?: number | null;
	overrideRadiusKm?: number | null;
	strictRadius?: boolean;
	keywordMode?: boolean;
	profileGenre?: string;
	profileEmbedText?: string;
	profileArea?: string;
	limit?: number | null;
	// x-vercel-ip-* geolocation headers from the incoming request; null when
	// unavailable (harness, scripts).
	ipHeaders?: Headers | null;
	// Contact ids the caller wants excluded (legacy excludeUsedContacts).
	// Applied pre-scoring on the hybrid path and post-hoc on curated trays.
	excludeContactIds?: readonly number[];
	// 'valid' restricts Prisma hydration to email-validated contacts (legacy
	// route contract). Undefined = no filter (current /api/contacts/search
	// behavior; the ES index is populated from validated rows anyway).
	verificationStatus?: 'valid';
	requestId?: string;
	requestStartedAt?: number;
}

export interface FreeTextSearchDeps {
	// Hydration seam: maps candidate ids to full Contact rows. Defaults to
	// Prisma. The search-quality harness substitutes an ES-backed hydrator.
	hydrateContacts?: (ids: number[]) => Promise<Contact[]>;
}

export async function runFreeTextSearch(
	params: FreeTextSearchParams,
	deps?: FreeTextSearchDeps
): Promise<FreeTextSearchResponse> {
	const response = await runFreeTextSearchInner(params, deps);
	const excluded = new Set(params.excludeContactIds ?? []);
	if (excluded.size === 0) return response;
	return {
		...response,
		contacts: response.contacts.filter((c) => !excluded.has(c.id)),
	};
}

const runFreeTextSearchInner = async (
	params: FreeTextSearchParams,
	deps?: FreeTextSearchDeps
): Promise<FreeTextSearchResponse> => {
	const requestId = params.requestId ?? createRequestId();
	const requestStartedAt = params.requestStartedAt ?? Date.now();
	const rawQuery = params.rawQuery.trim();
	const overrideLat = params.overrideLat ?? null;
	const overrideLon = params.overrideLon ?? null;
	const overrideRadiusKm = params.overrideRadiusKm ?? null;
	const keywordMode = params.keywordMode ?? false;
	const ipHeaders = params.ipHeaders ?? null;
	const excludedIdSet = new Set(params.excludeContactIds ?? []);
	const hydrateContacts =
		deps?.hydrateContacts ??
		((ids: number[]) =>
			prisma.contact.findMany({
				where: {
					id: { in: ids },
					...(params.verificationStatus === 'valid'
						? { emailValidationStatus: 'valid' as const }
						: {}),
				},
			}));
	// Radius-search mode (the map's "Radius" pill). Unlike the default soft
	// locality bias, this makes the radius a HARD geographic constraint: the
	// center/radius come ONLY from the explicit overrides (so parsed place-text
	// can't move the drawn circle), national fallback is suppressed, and a final
	// haversine gate drops everything outside the circle.
	const strictRadius = params.strictRadius ?? false;
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
	const profileGenre = (params.profileGenre ?? '').trim();
	const profileEmbedText = (params.profileEmbedText ?? '').trim();
	const profileArea = (params.profileArea ?? '').trim();
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
		const parsed = Number(params.limit);
		if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
		return Math.max(1, Math.min(Math.trunc(parsed), MAX_LIMIT));
	})();

		if (!rawQuery) {
			return ({
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

		// DB-derived town gazetteer: cached module-level (6h TTL), so this is a
		// one-time cost per instance. null (build failure) degrades the parser
		// to the static dictionaries.
		const gazetteer = await getCityGazetteer();
		const parsed = parseFreeTextSearchQuery(rawQuery, { gazetteer });
		const cityStateForCenter = parsed.city?.state
			? US_STATES.find(
					(s) => s.abbr.toLowerCase() === parsed.city!.state!.toLowerCase()
			  )
			: null;
		const parsedCityHasExactCenter = parsed.city?.coordinatePrecision === 'city';
		// Anchor precedence: exact city > state centroid > region centroid.
		const parsedCenterLat = parsedCityHasExactCenter
			? parsed.city!.lat
			: parsed.state?.lat ??
			  cityStateForCenter?.centroid.lat ??
			  parsed.region?.lat ??
			  null;
		const parsedCenterLon = parsedCityHasExactCenter
			? parsed.city!.lon
			: parsed.state?.lon ??
			  cityStateForCenter?.centroid.lng ??
			  parsed.region?.lon ??
			  null;
		// Profile area as a SOFT location anchor: only when the user named no place,
		// gave no override coords, and isn't in strict-radius mode. Reuses the
		// free-text parser (with the gazetteer) so "Austin" / "Austin, TX" and
		// obscure towns resolve; fail-closed for unresolvable areas.
		const profileAreaParsed =
			profileActive &&
			profileArea &&
			!parsed.hadExplicitPlace &&
			!strictRadiusActive &&
			overrideLat == null &&
			overrideLon == null
				? parseFreeTextSearchQuery(profileArea, { gazetteer })
				: null;
		let profileAreaCenterLat: number | null = null;
		let profileAreaCenterLon: number | null = null;
		let profileAreaCity: string | null = null;
		let profileAreaState: string | null = null;
		let profileAreaHasExactCenter = false;
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
			profileAreaHasExactCenter = areaHasExactCenter;
			profileAreaCenterLat = areaHasExactCenter
				? profileAreaParsed.city!.lat
				: profileAreaParsed.state?.lat ??
				  areaCityState?.centroid.lat ??
				  profileAreaParsed.region?.lat ??
				  null;
			profileAreaCenterLon = areaHasExactCenter
				? profileAreaParsed.city!.lon
				: profileAreaParsed.state?.lon ??
				  areaCityState?.centroid.lng ??
				  profileAreaParsed.region?.lon ??
				  null;
			profileAreaCity = profileAreaParsed.city?.name ?? null;
			profileAreaState =
				profileAreaParsed.state?.name ??
				areaCityState?.name ??
				profileAreaParsed.region?.name ??
				null;
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
					ipHeaders,
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
		const profileAreaCityPrecisionAnchor =
			!parsed.hadExplicitPlace && profileAreaHasExactCenter;
		// Radius derivation. When the user typed an explicit place, the PLACE
		// decides the radius — exact cities get a tight anchor, regions their
		// own extent — and the client's soft radius is ignored (the dashboard
		// unconditionally sends radiusKm=250 alongside IP coords, which must
		// not defeat a parsed place). Strict-radius mode keeps full override
		// precedence. With no place at all, the soft override / default keeps
		// the locality-bias behavior.
		const radiusKm =
			parsed.hadExplicitPlace && !strictRadiusActive
				? parsedCityHasExactCenter
					? CITY_ANCHOR_RADIUS_KM
					: parsed.state || cityStateForCenter
					? DEFAULT_LOCALITY_RADIUS_KM
					: parsed.region?.radiusKm ?? DEFAULT_LOCALITY_RADIUS_KM
				: profileAreaCityPrecisionAnchor && !strictRadiusActive
				? CITY_ANCHOR_RADIUS_KM
				: overrideRadiusKm ?? DEFAULT_LOCALITY_RADIUS_KM;
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
			return (
				applyStrictRadiusToResponse(keywordResponse, strictCenter, strictRadiusKm)
			);
		}

		// Strict state enforcement. When the user explicitly names a state
		// (directly via "in arkansas" or transitively via a city in our dictionary
		// like "music venues in brooklyn" → NY), we hard-filter every retriever
		// to that state and apply a final post-hydration safety net. Out-of-state
		// matches don't help no matter how strong the semantic match is.
		// Strict state enforcement, generalized to a SET so multi-state regions
		// ("pacific northwest" → WA+OR) ride the same plumbing as single states.
		// Precedence: explicit state > city's state > region's states. Empty
		// region state lists (circle-scoped regions like Gulf Coast) normalize
		// to null — the metro distance net is their authority.
		const enforcedStates: EnforcedState[] | null = strictRadiusActive
			? null
			: parsed.state
			? [{ name: parsed.state.name, abbr: parsed.state.abbr }]
			: cityStateForCenter
			? [{ name: cityStateForCenter.name, abbr: cityStateForCenter.abbr }]
			: parsed.region && parsed.region.states.length > 0
			? parsed.region.states
			: null;
		const enforcedStateValues = enforcedStates
			? enforcedStates.flatMap((s) => [
					s.name.toLowerCase(),
					s.abbr.toLowerCase(),
			  ])
			: null;
		// Single-state queries keep the soft state boost inside the retrievers;
		// multi-state regions rely on the hard filter + post-hydration net.
		const singleEnforcedState =
			enforcedStates && enforcedStates.length === 1 ? enforcedStates[0] : null;
		const metroRegion =
			!strictRadiusActive && parsed.region?.scope === 'metro'
				? parsed.region
				: null;
		// The metro circle is the anchor only when no more-specific place was
		// parsed alongside it ("bay area venues" vs "venues in oakland, bay area").
		const metroRegionIsAnchor = !!metroRegion && !parsed.city && !parsed.state;
		// The curated paths only enforce states the user actually TYPED (a
		// state or a region) — never the city's own state. City-only queries
		// legitimately surface metro picks across a state line ("Brooklyn" →
		// NJ neighbors); their tight radius keeps things local. The hybrid
		// path below keeps city-derived enforcement (its kNN retriever roams
		// nationally and needs the harder net).
		const typedEnforcedStates: EnforcedState[] | null = strictRadiusActive
			? null
			: parsed.state
			? [{ name: parsed.state.name, abbr: parsed.state.abbr }]
			: parsed.region && parsed.region.states.length > 0
			? parsed.region.states
			: null;

		// Curated-style locality anchoring. When the query has no explicit place
		// but we have an IP-resolved center, retrievers are hard-filtered to the
		// curated default radius around that center — vague queries should
		// surface local results, not global. With no center at all, we fall back
		// to a CONUS centroid + wide bbox, mirroring curated-search exactly.
		const useImplicitLocality = !parsed.hadExplicitPlace && !enforcedStates;
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
		// geo_distance filter. Explicit state still enforces state; if the user
		// named a city with exact coordinates, geo narrows to a city-scale
		// circle (slightly wider than the anchor so recall doesn't starve);
		// metro-scope regions get their circle as hard geo. With no explicit
		// place, the implicit locality above is used.
		const explicitCityCenter = parsedCityHasExactCenter && parsed.city
			? { lat: parsed.city.lat, lon: parsed.city.lon }
			: null;
		const metroRegionCenter =
			metroRegion && !explicitCityCenter
				? { lat: metroRegion.lat, lon: metroRegion.lon }
				: null;
		const retrieverCenter = enforcedStates
			? explicitCityCenter ?? metroRegionCenter
			: hasCenter
			? centerPoint
			: implicitLocalityCenter;
		const retrieverRadiusKm = enforcedStates
			? explicitCityCenter
				? Math.max(radiusKm, CITY_HYBRID_GEO_RADIUS_KM)
				: metroRegionCenter
				? metroRegion!.radiusKm
				: null
			: hasCenter
			? radiusKm
			: implicitLocalityRadiusKm;

		const isNounLed = isNounLedQuery(parsed);

		console.info(
			`[contacts-search][${requestId}] start q="${rawQuery}" categories=${parsed.categories.join(',') || 'none'} city=${parsed.city?.name ?? 'none'} cityPrecision=${parsed.city?.coordinatePrecision ?? 'none'} state=${parsed.state?.abbr ?? 'none'} region=${parsed.region?.name ?? 'none'} enforcedStates=${enforcedStates?.map((s) => s.abbr).join('+') ?? 'none'} implicitLocality=${useImplicitLocality ? `center=${implicitLocalityCenter?.lat},${implicitLocalityCenter?.lon} r=${implicitLocalityRadiusKm}km` : 'no'} restOfQuery="${parsed.restOfQuery}" nounLed=${isNounLed} centerSource=${center.source} radiusKm=${radiusKm} limit=${requestedLimit}`
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
						enforcedStates: typedEnforcedStates,
						cityPrecisionAnchor:
							parsedCityHasExactCenter || profileAreaCityPrecisionAnchor,
						metroRegionAnchor: metroRegionIsAnchor,
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
			return (
				applyStrictRadiusToResponse(localBusinessResponse, strictCenter, strictRadiusKm)
			);
		}

		// Place-only fallback: the user typed only a city or state (or "best
		// nashville", "near LA"). Run the curated nearby picks pipeline anchored
		// at the parsed place. Same response shape, no UI change — the dashboard
		// surfaces these through the existing curated-results state pipe.
		// Live-music prioritization is intrinsic to the curated ES sampler.
		if (isPlaceOnlyQuery(parsed)) {
			// Anchor precedence: drawn circle (strict) > exact city > state
			// centroid > region centroid.
			const placeCenter =
				strictRadiusActive && strictCenter
					? strictCenter
					: parsed.city
					? { lat: parsed.city.lat, lon: parsed.city.lon }
					: parsed.state
					? { lat: parsed.state.lat, lon: parsed.state.lon }
					: { lat: parsed.region!.lat, lon: parsed.region!.lon };
			const placeRadiusKm = strictRadiusActive
				? overrideRadiusKm ?? DEFAULT_LOCALITY_RADIUS_KM
				: radiusKm;
			// State enforcement: explicit state, or the region's state set.
			// City-only queries stay un-restricted (metro areas cross state
			// lines). Metro-scope regions anchored at the region itself cap the
			// ladder at the region circle — expanding a "bay area" search to
			// 350km would betray the region's meaning.
			const placeEnforcedStates =
				!strictRadiusActive && parsed.state
					? [{ name: parsed.state.name, abbr: parsed.state.abbr }]
					: !strictRadiusActive &&
					  !parsed.city &&
					  parsed.region &&
					  parsed.region.states.length > 0
					? parsed.region.states
					: null;
			const placeIsMetroRegion =
				!strictRadiusActive &&
				!parsed.city &&
				!parsed.state &&
				parsed.region?.scope === 'metro';
			const placeResponse = await withBudgetFallback(
				() =>
					runPlaceOnlyCuratedSearch({
						rawQuery,
						parsed,
						centerPoint: placeCenter,
						radiusKm: placeRadiusKm,
						requestedLimit,
						enforcedStates: placeEnforcedStates,
						strictRadius: strictRadiusActive || placeIsMetroRegion,
						cityPrecisionAnchor:
							!strictRadiusActive && parsedCityHasExactCenter,
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
					parsed.city?.name ?? parsed.state?.name ?? parsed.region?.name ?? 'unknown'
				} statesEnforced=${placeEnforcedStates?.map((s) => s.abbr).join('+') ?? 'no'} radiusKm=${placeRadiusKm} cityAnchor=${!strictRadiusActive && parsedCityHasExactCenter} returned=${
					placeResponse.contacts.length
				} totalMs=${Date.now() - requestStartedAt}`
			);
			return (
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
						enforcedStates: typedEnforcedStates,
						cityPrecisionAnchor:
							parsedCityHasExactCenter || profileAreaCityPrecisionAnchor,
						metroRegionAnchor: metroRegionIsAnchor,
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
			return (
				applyStrictRadiusToResponse(curatedCategoryResponse, strictCenter, strictRadiusKm)
			);
		}

		const fetchStarted = Date.now();
		const retrievers: RetrieverResult[] = [];

		// Query understanding — SHADOW MODE (SEARCH_LLM_INTENT). Resolves the
		// LLM intent concurrently with the retrievers and logs it for burn-in
		// audit; NOTHING consumes it yet (that's the SEARCH_RANKING_V2 flip).
		// Awaited before the hybrid path returns so serverless doesn't kill the
		// in-flight resolution/cache write — by then the retrievers have long
		// dominated the wall clock.
		const shadowIntentPromise: Promise<QueryIntentResolution | null> =
			isSearchLlmIntentEnabled()
				? getQueryIntent(
						{
							restOfQuery: parsed.restOfQuery,
							categories: parsed.categories,
						},
						{ requestId }
				  ).catch((error) => {
						console.warn(
							`[contacts-search][${requestId}] shadow intent resolution failed`,
							error instanceof Error ? error.message : error
						);
						return null;
				  })
				: Promise.resolve(null);
		const logShadowIntent = async (): Promise<void> => {
			const resolution = await shadowIntentPromise;
			if (!resolution) return;
			const { intent, personProbeCount, tookMs } = resolution;
			console.info(
				`[contacts-search][${requestId}] shadow-intent q="${rawQuery}" target=${intent.targetKind} source=${intent.source} orgKey=${intent.orgType?.key ?? 'none'} role=${intent.personRole?.canonicalRole ?? 'none'} domain=${intent.personRole?.domain ?? 'none'} locality=${intent.localityBias} confidence=${intent.confidence} probeCount=${personProbeCount} actionable=${intentIsActionable(intent)} tookMs=${tookMs}`
			);
		};

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

		const buildKnnPromise = (text: string): Promise<KnnResult> =>
			text.trim().length > 1
				? withTimeout(
						searchSimilarContacts(
							{
								city: parsed.city?.name ?? null,
								// Single state only — multi-state regions rely on the
								// hard lexical/prefix filter + post-hydration net; a
								// lone state name would skew the soft boost.
								state: singleEnforcedState?.name ?? null,
								country: parsed.country,
								restOfQuery: text,
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
				: Promise.resolve(emptyKnn);
		const buildPrefixPromise = (): Promise<PrefixResult> =>
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
				: Promise.resolve(emptyPrefix);

		type OrgTypeResult = Awaited<ReturnType<typeof orgTypeSearchContacts>>;
		const emptyOrgType: OrgTypeResult = { matches: [], totalFound: 0 };

		const rankingV2 = isSearchRankingV2Enabled();
		let knnResult: KnnResult = emptyKnn;
		let lexicalResult: LexicalResult = emptyLexical;
		let lexicalNationalResult: LexicalResult = emptyLexical;
		let prefixResult: PrefixResult = emptyPrefix;
		let orgTypeResult: OrgTypeResult = emptyOrgType;
		let queryTargetsPerson = false;
		let personProbeMatchCount = 0;
		let intent: QueryIntent | null = null;
		let blendedActive = false;

		if (!rankingV2) {
			const [knnR, lexicalR, prefixR, personTargetProbe] = await Promise.all([
				buildKnnPromise(shouldRunKnn ? knnText : ''),
				withTimeout(
					lexicalSearchContacts({
						queryText: rawQuery,
						limit: PER_RETRIEVER_TAKE,
						titlePrefixes: parsed.categories.length > 0 ? parsed.categories : undefined,
						city: parsed.city?.name ?? null,
						state: singleEnforcedState?.abbr ?? null,
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
				buildPrefixPromise(),
				detectQueryTargetsPerson(parsed, isNounLed, requestId),
			]);
			knnResult = knnR;
			lexicalResult = lexicalR;
			prefixResult = prefixR;
			queryTargetsPerson = personTargetProbe.targetsPerson;
			personProbeMatchCount = personTargetProbe.matchCount;
		} else {
			// SEARCH_RANKING_V2 consumption path. The default-text kNN fires
			// CONCURRENTLY with intent resolution and is reused whenever the
			// intent's embedText composes to the same string — on a cache hit
			// the intent await costs ~0-50ms and nothing is wasted.
			const knnDefaultPromise = buildKnnPromise(shouldRunKnn ? knnText : '');
			const resolution = await shadowIntentPromise;
			personProbeMatchCount = resolution?.personProbeCount ?? 0;
			intent =
				resolution && intentIsActionable(resolution.intent)
					? resolution.intent
					: null;
			// Probe-forced person-safety: data beats model — the probe can only
			// WIDEN person treatment, never narrow it below what the LLM said.
			queryTargetsPerson =
				intent?.targetKind === 'person-role' ||
				personProbeMatchCount >= PERSON_TARGET_MATCH_THRESHOLD;
			// Blended national-with-local-preference applies ONLY to
			// person-role/org-type intents on implicit-locality queries.
			// Explicit place, strict radius, and profile-area anchors keep
			// their current geo semantics exactly; vibe/venue intents keep the
			// hard local guarantee.
			blendedActive =
				!!intent &&
				(intent.targetKind === 'person-role' ||
					intent.targetKind === 'org-type') &&
				useImplicitLocality &&
				!strictRadiusActive &&
				!(profileActive && profileArea.length > 0);

			// kNN text: intent.embedText replaces the raw remainder, but the
			// category prefix and the profile pill's embed suffix keep their
			// existing composition contract.
			const knnBaseTextV2 =
				intent && intent.embedText.trim().length > 1
					? intent.embedText.trim()
					: knnBaseText;
			const knnCategoryTextV2 =
				parsed.categories.length > 0
					? `${parsed.categories.join(' ')} ${knnBaseTextV2}`.trim()
					: knnBaseTextV2;
			const knnTextV2 =
				profileActive && profileEmbedText
					? `${knnCategoryTextV2} ${profileEmbedText}`.trim()
					: knnCategoryTextV2;

			const structuredTerms: StructuredQueryTerms | null = intent
				? {
						roleTerms: intent.personRole
							? [
									intent.personRole.canonicalRole,
									...intent.personRole.roleSynonyms,
							  ]
							: [],
						domainTerms: intent.personRole
							? [
									...(intent.personRole.domain
										? [intent.personRole.domain]
										: []),
									...intent.personRole.domainSynonyms,
							  ]
							: [],
						orgTerms: intent.orgType
							? [intent.orgType.label, ...intent.orgType.industryTerms]
							: [],
						expandedPhrases: intent.expandedPhrases,
				  }
				: null;
			const orgRecipe = orgTypeRecipeByKey(intent?.orgType?.key ?? null);

			const [knnR, lexLocalR, lexNationalR, prefixR, orgR] = await Promise.all([
				knnTextV2 === knnText
					? knnDefaultPromise
					: buildKnnPromise(knnTextV2),
				withTimeout(
					lexicalSearchContacts({
						queryText: rawQuery,
						limit: PER_RETRIEVER_TAKE,
						titlePrefixes: parsed.categories.length > 0 ? parsed.categories : undefined,
						city: parsed.city?.name ?? null,
						state: singleEnforcedState?.abbr ?? null,
						country: parsed.country,
						center: retrieverCenter,
						radiusKm: retrieverRadiusKm,
						enforcedStateValues,
						shortQueryMode: isNounLed,
						structuredTerms,
					}),
					LEXICAL_TIMEOUT_MS,
					emptyLexical,
					'lexical retriever',
					requestId
				),
				blendedActive
					? withTimeout(
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
								shortQueryMode: isNounLed,
								structuredTerms,
							}),
							LEXICAL_TIMEOUT_MS,
							emptyLexical,
							'national lexical retriever',
							requestId
					  )
					: Promise.resolve(emptyLexical),
				buildPrefixPromise(),
				orgRecipe
					? withTimeout(
							orgTypeSearchContacts({
								esShould: orgRecipe.esShould,
								domainTerms: structuredTerms?.domainTerms,
								limit: PER_RETRIEVER_TAKE,
								// Org inventory is national: geo/state apply only when
								// the user actually typed a place.
								center: blendedActive ? null : retrieverCenter,
								radiusKm: blendedActive ? null : retrieverRadiusKm,
								enforcedStateValues: blendedActive
									? null
									: enforcedStateValues,
							}),
							LEXICAL_TIMEOUT_MS,
							emptyOrgType,
							'org-type retriever',
							requestId
					  )
					: Promise.resolve(emptyOrgType),
			]);
			knnResult = knnR;
			lexicalResult = lexLocalR;
			lexicalNationalResult = lexNationalR;
			prefixResult = prefixR;
			orgTypeResult = orgR;
		}

		const collectIds = (matches: { id: string | undefined }[]): number[] => {
			const out: number[] = [];
			const seen = new Set<number>();
			for (const m of matches) {
				const idNum = Number(m.id);
				if (!Number.isFinite(idNum)) continue;
				const id = Math.trunc(idNum);
				if (seen.has(id)) continue;
				// Caller-excluded contacts (legacy excludeUsedContacts) drop out
				// BEFORE rank fusion so the hydration pool refills around them.
				if (excludedIdSet.has(id)) continue;
				seen.add(id);
				out.push(id);
			}
			return out;
		};

		const knnIds = collectIds(knnResult.matches);
		const lexicalIds = collectIds(lexicalResult.matches);
		const lexicalNationalIds = collectIds(lexicalNationalResult.matches);
		const prefixIds = collectIds(prefixResult.matches);
		const orgTypeIds = collectIds(orgTypeResult.matches);

		// kNN cosine per candidate — anchors the evidence gate's relative band.
		const knnScores = new Map<number, number>();
		for (const m of knnResult.matches) {
			const idNum = Number(m.id);
			if (!Number.isFinite(idNum)) continue;
			knnScores.set(Math.trunc(idNum), m.score ?? 0);
		}

		if (blendedActive) {
			// Weighted RRF: kNN is the semantic workhorse; local docs appear in
			// BOTH lexical lists (0.6 + 0.6 = 1.2) so locality is preferred
			// without any hard geo cut.
			retrievers.push({ name: 'knn', ids: knnIds, weight: 1 });
			retrievers.push({ name: 'lexical', ids: lexicalIds, weight: 0.6 });
			if (lexicalNationalIds.length > 0) {
				retrievers.push({
					name: 'lexicalNational',
					ids: lexicalNationalIds,
					weight: 0.6,
				});
			}
			if (prefixIds.length > 0) {
				retrievers.push({ name: 'prefix', ids: prefixIds, weight: 1 });
			}
			if (orgTypeIds.length > 0) {
				retrievers.push({ name: 'orgType', ids: orgTypeIds, weight: 1 });
			}
		} else {
			retrievers.push({ name: 'knn', ids: knnIds });
			retrievers.push({ name: 'lexical', ids: lexicalIds });
			if (prefixIds.length > 0) retrievers.push({ name: 'prefix', ids: prefixIds });
			if (orgTypeIds.length > 0) {
				retrievers.push({ name: 'orgType', ids: orgTypeIds });
			}
		}

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
			await logShadowIntent();
			return ({
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
			() => hydrateContacts(topIdsForHydration),
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
			!blendedActive &&
			useImplicitLocality &&
			implicitLocalityCenter &&
			implicitLocalityRadiusKm
		) {
			// Blended mode keeps national rows and lets the distance-decay
			// multipliers express locality preference — this hard gate is what
			// starved national-inventory professions (154 total docs within
			// 250km of Boise) and hid the 27.8% of docs with no coordinates.
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

		if (enforcedStates && enforcedStates.length > 0) {
			for (const [id, contact] of byIdStage1) {
				if (!contactMatchesAnyEnforcedState(contact, enforcedStates)) {
					byIdStage1.delete(id);
				}
			}
		}

		// Metro-scope regions ("bay area", "socal") are circles, not state
		// sets — drop hydrated rows beyond the region circle (with slack for
		// the fringe). Mirrors the implicit-locality kNN-leak guard above.
		if (metroRegion && !explicitCityCenter) {
			const metroCenter = { lat: metroRegion.lat, lon: metroRegion.lon };
			const maxDistanceKm = metroRegion.radiusKm * 1.2;
			for (const [id, contact] of byIdStage1) {
				if (contact.latitude == null || contact.longitude == null) {
					byIdStage1.delete(id);
					continue;
				}
				const d = distanceKm(metroCenter, {
					lat: contact.latitude,
					lon: contact.longitude,
				});
				if (d > maxDistanceKm) byIdStage1.delete(id);
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
			intent,
			knnScores,
			localityDecay: blendedActive,
			evidenceGate: blendedActive,
		});

		let finalContacts = stage1.finalContacts;
		let coverage = stage1.coverage;
		let evidence = stage1.evidence;
		let expansionMode: 'none' | 'national-fallback' | 'blended-national' =
			'none';
		if (blendedActive) {
			// UI back-compat signal: report the blended expansion whenever a
			// returned row sits beyond the old implicit radius.
			const beyondRadius =
				hasCenter &&
				finalContacts.some(
					(c) =>
						c.latitude != null &&
						c.longitude != null &&
						distanceKm(centerPoint!, { lat: c.latitude, lon: c.longitude }) >
							DEFAULT_LOCALITY_RADIUS_KM
				);
			if (beyondRadius) expansionMode = 'blended-national';
		}
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
			// Blended mode already retrieved nationally in one pass — the
			// two-step fallback (with its 18-cap and its suppression trap) is
			// structurally replaced.
			if (blendedActive) return null;
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
					() => hydrateContacts(newIdsToHydrate),
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
				// Stage 2 is only reachable with a vibe/venue (or null) intent —
				// person/org intents on implicit locality run blended and never
				// trigger the fallback. Intent still conditions the category
				// gating and soft demotion for consistency.
				intent,
				knnScores,
				limit: Math.min(requestedLimit, NATIONAL_FALLBACK_LIMIT_CAP),
			});
			stage2LiteralMatchCount = stage2.literalMatchCount;

			finalContacts = stage2.finalContacts;
			coverage = stage2.coverage;
			evidence = stage2.evidence;
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
			`[contacts-search][${requestId}] q="${rawQuery}" knn=${knnIds.length} lex=${lexicalIds.length} lexNational=${lexicalNationalIds.length} prefix=${prefixIds.length} orgType=${orgTypeIds.length} hydrated=${hydrated.length} nounLed=${isNounLed} personTarget=${queryTargetsPerson}(matches=${personProbeMatchCount}) intent=${intent ? `${intent.targetKind}/${intent.source}` : 'off'} blended=${blendedActive} droppedPersonOrLoose=${stage1.droppedPersonOrLoose} stage1Returned=${stage1.finalContacts.length} stage1LiteralMatches=${stage1.literalMatchCount} expansionMode=${expansionMode}` +
				(coverage ? ` coverage=${coverage}` : '') +
				(expansionMode === 'national-fallback'
					? ` sparseTrigger=${sparseTrigger} stage2Lex=${stage2Lex} stage2Prefix=${stage2Prefix} stage2HydratedNew=${stage2HydratedNew} stage2LiteralMatches=${stage2LiteralMatchCount} stage2Ms=${stage2Ms}`
					: '') +
				` returned=${finalContacts.length} fetchMs=${fetchMs} totalMs=${Date.now() - requestStartedAt} cleanliness=` +
				Object.entries(cleanlinessBreakdown)
					.filter(([, n]) => n > 0)
					.map(([k, n]) => `${k}:${n}`)
					.join(',') +
				``
		);

		const retrieverBreakdown: Record<string, number> = {
			knn: knnIds.length,
			lexical: lexicalIds.length,
			prefix: prefixIds.length,
		};
		if (lexicalNationalIds.length > 0) {
			retrieverBreakdown.lexicalNational = lexicalNationalIds.length;
		}
		if (orgTypeIds.length > 0) {
			retrieverBreakdown.orgType = orgTypeIds.length;
		}
		if (expansionMode === 'national-fallback') {
			retrieverBreakdown.lexicalNoGeo = stage2Lex;
			retrieverBreakdown.prefixNoGeo = stage2Prefix;
			retrieverBreakdown.hydratedWide = stage2HydratedNew;
		}

		await logShadowIntent();

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
					: expansionMode === 'national-fallback' ||
					  expansionMode === 'blended-national'
					? null
					: hasCenter
					? radiusKm
					: null,
			retrieverBreakdown,
			cleanlinessBreakdown,
			contacts: finalContacts,
			expansionMode,
			...(coverage ? { coverage } : {}),
			...(evidence ? { evidence } : {}),
		};

		return (response);
};
