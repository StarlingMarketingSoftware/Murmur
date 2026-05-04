import { Contact, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { sampleContactsByCategory } from '@/app/api/_utils/vectorDb';
import {
	CURATED_BOOKING_CONTACT_TITLE_PREFIXES,
	type BookingContactTitlePrefix,
} from '@/constants/contactCategories';
import { US_STATES } from '@/constants/usStates';
import {
	allocateAcrossCategories,
	contactLooksLikeBusinessEntity,
	contactLooksLikeEducationInstitution,
	distributeAcrossBuckets,
	interleaveByCategory,
	titleHasStateSuffix,
	type AllocatedContact,
	type CategoryPool,
} from './distribution';

// Pure curated-picks pipeline. Takes an already-resolved center + radius (or
// null for the global fallback) and returns a balanced, live-music-prioritized
// tray across the booking categories. Extracted from `route.ts` so the same
// pipeline can serve both the /api/contacts/curated-search route and the
// place-only branch of /api/contacts/search (where the user typed only a
// city/state and wants curated picks anchored at that place).

export const DEFAULT_RADIUS_KM = 250;
export const FETCH_BUFFER = 1.4;
export const FALLBACK_CENTER = { lat: 39.83, lon: -98.58 };
export const FALLBACK_BBOX_RADIUS_KM = 1200;

const CANDIDATE_TAKE = 1500;
const PER_CATEGORY_ES_TAKE = 200;
const PER_CATEGORY_PRISMA_TAKE = 300;
const PER_CATEGORY_FALLBACK_THRESHOLD = 40;
const ES_SAMPLE_TIMEOUT_MS = 7000;

const EXCLUDED_CURATED_CATEGORY_PREFIXES = new Set<BookingContactTitlePrefix>([
	'Wedding Planners',
]);

export const CURATED_DISPLAY_LABEL_BY_PREFIX: Record<BookingContactTitlePrefix, string> = {
	'Music Venues': 'Music Venue',
	Restaurants: 'Restaurant',
	'Coffee Shops': 'Coffee Shop',
	'Music Festivals': 'Music Festival',
	Breweries: 'Brewery',
	Distilleries: 'Distillery',
	Wineries: 'Winery',
	Cideries: 'Cidery',
	'Wedding Planners': 'Wedding Planner',
	'Wedding Venues': 'Wedding Venue',
};

export const CURATED_CATEGORIES = CURATED_BOOKING_CONTACT_TITLE_PREFIXES.filter(
	(titlePrefix) => !EXCLUDED_CURATED_CATEGORY_PREFIXES.has(titlePrefix)
).map((titlePrefix) => ({
	label: titlePrefix.toLowerCase(),
	titlePrefixes: [titlePrefix] as const,
	weight: 1,
	displayLabel: CURATED_DISPLAY_LABEL_BY_PREFIX[titlePrefix],
}));

export type CuratedQualityTier = 'canonical-clean' | 'clean';

export type CuratedSearchContact = Contact & {
	curatedCategory: BookingContactTitlePrefix;
	curatedDisplayLabel: string;
	curatedQualityTier: CuratedQualityTier;
};

const withTimeout = async <T,>(
	promise: Promise<T>,
	timeoutMs: number,
	message: string
): Promise<T> => {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
			}),
		]);
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

const buildBoundedWhere = (
	titlePrefixes: readonly string[],
	bbox: { south: number; north: number; west: number; east: number } | null
): Prisma.ContactWhereInput => {
	const titleOr = titlePrefixes.map((p) => ({
		title: { startsWith: p, mode: 'insensitive' as const },
	}));
	const conditions: Prisma.ContactWhereInput[] = [
		{ title: { not: null } },
		{ OR: titleOr },
		{ latitude: { not: null } },
		{ longitude: { not: null } },
	];
	if (bbox) {
		conditions.push({ latitude: { gte: bbox.south, lte: bbox.north } });
		conditions.push({ longitude: { gte: bbox.west, lte: bbox.east } });
	}
	return { AND: conditions };
};

const buildCanonicalCategoryTitles = (
	titlePrefixes: readonly string[]
): string[] => {
	const titles = new Set<string>();
	for (const prefix of titlePrefixes) {
		for (const state of US_STATES) {
			titles.add(`${prefix} ${state.name}`);
			titles.add(`${prefix} ${state.abbr}`);
		}
	}
	return [...titles];
};

const buildCanonicalWhere = (
	titlePrefixes: readonly string[],
	bbox: { south: number; north: number; west: number; east: number } | null
): Prisma.ContactWhereInput => {
	const canonicalTitles = buildCanonicalCategoryTitles(titlePrefixes);
	const conditions: Prisma.ContactWhereInput[] = [
		{ title: { in: canonicalTitles, mode: 'insensitive' } },
		{ latitude: { not: null } },
		{ longitude: { not: null } },
	];
	if (bbox) {
		conditions.push({ latitude: { gte: bbox.south, lte: bbox.north } });
		conditions.push({ longitude: { gte: bbox.west, lte: bbox.east } });
	}
	return { AND: conditions };
};

const matchCategory = (
	title: string | null,
	categories: readonly { label: string; titlePrefixes: readonly string[] }[]
): string | null => {
	if (!title) return null;
	const lc = title.toLowerCase();
	type Entry = { prefix: string; categoryKey: string };
	const flat: Entry[] = [];
	for (const c of categories) {
		const key = c.titlePrefixes[0];
		for (const p of c.titlePrefixes) flat.push({ prefix: p, categoryKey: key });
	}
	flat.sort((a, b) => b.prefix.length - a.prefix.length);
	for (const { prefix, categoryKey } of flat) {
		if (lc.startsWith(prefix.toLowerCase())) return categoryKey;
	}
	return null;
};

const applyRadius = (
	candidates: Contact[],
	center: { lat: number; lon: number } | null,
	radiusKm: number | null
): Contact[] => {
	if (!center || radiusKm == null) return candidates;
	return candidates.filter((c) => {
		if (c.latitude == null || c.longitude == null) return false;
		return distanceKm(center, { lat: c.latitude, lon: c.longitude }) <= radiusKm;
	});
};

const buildCategoryPool = (
	allCandidates: Contact[],
	perCategoryShare: number,
	requestedLimit: number,
	center: { lat: number; lon: number } | null,
	requestedRadiusKm: number | null,
	radiusLadder: (number | null)[]
): { contacts: Contact[]; radiusUsed: number | null } => {
	if (allCandidates.length === 0) return { contacts: [], radiusUsed: requestedRadiusKm };

	const perPoolLimit = Math.max(requestedLimit * 2, perCategoryShare * 3, 12);
	let best: { contacts: Contact[]; radiusUsed: number | null } | null = null;
	const desiredCount = Math.min(perPoolLimit, Math.max(perCategoryShare, 1));

	for (const r of radiusLadder) {
		const localized = applyRadius(allCandidates, center, r);
		if (localized.length === 0) continue;
		const distributed = distributeAcrossBuckets(localized, perPoolLimit, center, r);
		if (distributed.length > 0) {
			if (!best || distributed.length > best.contacts.length) {
				best = { contacts: distributed, radiusUsed: r };
			}
			if (distributed.length >= desiredCount) return best;
		}
	}
	return best ?? { contacts: [], radiusUsed: requestedRadiusKm };
};

const displayLabelForCategory = (categoryKey: string): string =>
	CURATED_DISPLAY_LABEL_BY_PREFIX[categoryKey as BookingContactTitlePrefix] ??
	categoryKey;

const decorateAllocatedContact = (
	allocated: AllocatedContact
): CuratedSearchContact => ({
	...allocated.contact,
	curatedCategory: allocated.categoryKey as BookingContactTitlePrefix,
	curatedDisplayLabel: displayLabelForCategory(allocated.categoryKey),
	curatedQualityTier: titleHasStateSuffix(allocated.contact.title)
		? 'canonical-clean'
		: 'clean',
});

export interface CuratedNearbyPicksOptions {
	/** Resolved center, or null to fall back to the CONUS centroid + wide bbox. */
	center: { lat: number; lon: number } | null;
	/** Result radius. Ignored when center is null. Defaults to DEFAULT_RADIUS_KM. */
	radiusKm: number | null;
	limit: number;
	/** Optional category filter — restrict the curated mix to these prefixes only. */
	requestedCategoryPrefixes?: readonly BookingContactTitlePrefix[] | null;
	/** Prefix for log lines so the caller can identify which route triggered this run. */
	logTag?: string;
}

export interface CuratedNearbyPicksResult {
	contacts: CuratedSearchContact[];
	categoryBreakdown: Record<string, number>;
	candidateSource: string;
	fetchMs: number;
	effectiveCenter: { lat: number; lon: number };
	effectiveRadiusKm: number | null;
	hasRealCenter: boolean;
}

export const runCuratedNearbyPicks = async (
	options: CuratedNearbyPicksOptions
): Promise<CuratedNearbyPicksResult> => {
	const { center, radiusKm, limit, requestedCategoryPrefixes, logTag } = options;

	const hasRealCenter = center !== null;
	const effectiveCenter = center ?? FALLBACK_CENTER;
	const effectiveRadiusKm = hasRealCenter ? radiusKm ?? DEFAULT_RADIUS_KM : null;
	const fetchBboxRadiusKm = hasRealCenter
		? Math.max(effectiveRadiusKm ?? DEFAULT_RADIUS_KM, DEFAULT_RADIUS_KM) * FETCH_BUFFER
		: FALLBACK_BBOX_RADIUS_KM;
	const radiusLadder: (number | null)[] = hasRealCenter
		? [
				effectiveRadiusKm ?? DEFAULT_RADIUS_KM,
				Math.min(fetchBboxRadiusKm, 1500),
				null,
		  ]
		: [null];

	const activeCategories = requestedCategoryPrefixes
		? CURATED_CATEGORIES.filter((category) =>
				requestedCategoryPrefixes.includes(category.titlePrefixes[0])
		  )
		: CURATED_CATEGORIES;

	if (activeCategories.length === 0) {
		return {
			contacts: [],
			categoryBreakdown: {},
			candidateSource: 'none',
			fetchMs: 0,
			effectiveCenter,
			effectiveRadiusKm,
			hasRealCenter,
		};
	}

	const tag = logTag ? `${logTag} ` : '[curated-nearby] ';
	console.info(
		`${tag}start categories=${activeCategories
			.map((category) => category.titlePrefixes[0])
			.join(',')} hasCenter=${hasRealCenter} requestedRadiusKm=${
			effectiveRadiusKm ?? 'n/a'
		} limit=${limit}`
	);

	const perCategoryShare = Math.ceil(limit / Math.max(1, activeCategories.length));
	const flatPrefixes = activeCategories.flatMap((c) => c.titlePrefixes);
	const fetchBbox = bboxFromCenter(effectiveCenter, fetchBboxRadiusKm);

	type HydratedContact = Awaited<
		ReturnType<typeof prisma.contact.findMany>
	>[number];
	const fetchStarted = Date.now();
	const candidateSources = new Set<string>();
	const categoryCandidates = new Map<string, HydratedContact[]>();
	for (const category of activeCategories) {
		categoryCandidates.set(category.titlePrefixes[0], []);
	}

	const appendCandidates = (
		categoryKey: string,
		contacts: readonly HydratedContact[]
	) => {
		const existing = categoryCandidates.get(categoryKey) ?? [];
		categoryCandidates.set(categoryKey, [...existing, ...contacts]);
	};

	const prependCandidates = (
		categoryKey: string,
		contacts: readonly HydratedContact[]
	) => {
		const existing = categoryCandidates.get(categoryKey) ?? [];
		categoryCandidates.set(categoryKey, [...contacts, ...existing]);
	};

	const cleanBusinessPredicate = (c: Contact): boolean =>
		contactLooksLikeBusinessEntity(c) &&
		!contactLooksLikeEducationInstitution(c);

	const esRows: { categoryKey: string; id: number }[] = [];
	const esSamples = await Promise.all(
		activeCategories.map(async (category) => {
			const categoryKey = category.titlePrefixes[0];
			const esStartedAt = Date.now();
			try {
				const esResult = await withTimeout(
					sampleContactsByCategory({
						titlePrefixes: [...category.titlePrefixes],
						limit: PER_CATEGORY_ES_TAKE,
						candidatePool: PER_CATEGORY_ES_TAKE,
						center: effectiveCenter,
						radiusKm: fetchBboxRadiusKm,
						seed: Date.now() + Math.floor(Math.random() * 1_000_000),
					}),
					ES_SAMPLE_TIMEOUT_MS,
					`ES sampler timed out after ${ES_SAMPLE_TIMEOUT_MS}ms for ${categoryKey}`
				);
				const esMs = Date.now() - esStartedAt;
				if (esMs > 3000) {
					console.info(
						`${tag}ES sampler slow category=${categoryKey} durationMs=${esMs} matches=${esResult.matches.length}`
					);
				}
				return { categoryKey, matches: esResult.matches };
			} catch (err) {
				console.warn(
					`${tag}ES sampler failed for ${categoryKey} after ${
						Date.now() - esStartedAt
					}ms, falling back to Prisma`,
					err
				);
				return { categoryKey, matches: [] };
			}
		})
	);

	for (const sample of esSamples) {
		for (const m of sample.matches) {
			const id = Number(m.metadata?.contactId ?? m.id);
			if (Number.isFinite(id)) {
				esRows.push({ categoryKey: sample.categoryKey, id: Math.trunc(id) });
			}
		}
	}

	if (esRows.length > 0) {
		candidateSources.add('es-per-category');
		const uniqueEsIds = [...new Set(esRows.map((row) => row.id))];
		const hydrated = await prisma.contact.findMany({
			where: {
				AND: [
					{ id: { in: uniqueEsIds } },
					{ latitude: { not: null } },
					{ longitude: { not: null } },
					{ latitude: { gte: fetchBbox.south, lte: fetchBbox.north } },
					{ longitude: { gte: fetchBbox.west, lte: fetchBbox.east } },
				],
			},
		});
		const byId = new Map(hydrated.map((c) => [c.id, c]));
		for (const row of esRows) {
			const contact = byId.get(row.id);
			if (contact) appendCandidates(row.categoryKey, [contact]);
		}
	}

	const canonicalCandidates = await prisma.contact.findMany({
		where: buildCanonicalWhere(flatPrefixes, fetchBbox),
		take: CANDIDATE_TAKE,
		orderBy: [{ id: 'asc' }],
	});
	if (canonicalCandidates.length > 0) {
		candidateSources.add('canonical');
		const canonicalByCategory = new Map<string, HydratedContact[]>();
		for (const contact of canonicalCandidates) {
			const matched = matchCategory(contact.title, activeCategories);
			if (!matched) continue;
			const list = canonicalByCategory.get(matched) ?? [];
			list.push(contact);
			canonicalByCategory.set(matched, list);
		}
		for (const [categoryKey, contacts] of canonicalByCategory) {
			prependCandidates(categoryKey, contacts);
		}
	}

	await Promise.all(
		activeCategories.map(async (category) => {
			const categoryKey = category.titlePrefixes[0];
			const cleanCandidateCount = (
				categoryCandidates.get(categoryKey) ?? []
			).filter(cleanBusinessPredicate).length;
			if (cleanCandidateCount >= PER_CATEGORY_FALLBACK_THRESHOLD) {
				return;
			}
			const prismaCandidates = await prisma.contact.findMany({
				where: buildBoundedWhere(category.titlePrefixes, fetchBbox),
				take: PER_CATEGORY_PRISMA_TAKE,
			});
			if (prismaCandidates.length > 0) {
				candidateSources.add('prisma-per-category');
				appendCandidates(categoryKey, prismaCandidates);
			}
		})
	);

	for (const [categoryKey, contacts] of categoryCandidates) {
		const seen = new Set<number>();
		categoryCandidates.set(
			categoryKey,
			contacts.filter((contact) => {
				if (seen.has(contact.id)) return false;
				seen.add(contact.id);
				return true;
			})
		);
	}

	const allCandidates = activeCategories.flatMap(
		(category) => categoryCandidates.get(category.titlePrefixes[0]) ?? []
	);
	const candidateSource =
		candidateSources.size > 0 ? [...candidateSources].join('+') : 'none';
	const fetchMs = Date.now() - fetchStarted;

	const byCategory = new Map<string, Contact[]>();
	for (const category of activeCategories) {
		const categoryKey = category.titlePrefixes[0];
		byCategory.set(
			categoryKey,
			(categoryCandidates.get(categoryKey) ?? []).filter(
				(contact) => matchCategory(contact.title, [category]) === categoryKey
			)
		);
	}

	const buildPools = (predicate: (contact: Contact) => boolean): CategoryPool[] =>
		activeCategories.map((category) => {
			const canonicalKey = category.titlePrefixes[0];
			const built = buildCategoryPool(
				(byCategory.get(canonicalKey) ?? []).filter(predicate),
				perCategoryShare,
				limit,
				hasRealCenter ? effectiveCenter : null,
				effectiveRadiusKm,
				radiusLadder
			);
			return {
				key: canonicalKey,
				label: category.label,
				weight: category.weight,
				contacts: built.contacts,
				radiusUsed: built.radiusUsed,
			};
		});

	const canonicalBusinessPools = buildPools(
		(c) => titleHasStateSuffix(c.title) && cleanBusinessPredicate(c)
	);
	const looseBusinessPools = buildPools(
		(c) => !titleHasStateSuffix(c.title) && cleanBusinessPredicate(c)
	);

	const canonicalBusinessAllocated = allocateAcrossCategories(
		canonicalBusinessPools,
		limit
	);
	const looseBusinessRemainder = limit - canonicalBusinessAllocated.length;
	const looseBusinessAllocated =
		looseBusinessRemainder > 0
			? allocateAcrossCategories(looseBusinessPools, looseBusinessRemainder)
			: [];

	const allocated = [...canonicalBusinessAllocated, ...looseBusinessAllocated];

	const interleaved = [
		...interleaveByCategory(canonicalBusinessAllocated),
		...interleaveByCategory(looseBusinessAllocated),
	];
	const finalContacts = interleaved.map(decorateAllocatedContact);

	const categoryBreakdown: Record<string, number> = {};
	for (const cat of activeCategories) categoryBreakdown[cat.titlePrefixes[0]] = 0;
	for (const a of allocated) {
		categoryBreakdown[a.categoryKey] = (categoryBreakdown[a.categoryKey] ?? 0) + 1;
	}

	console.log(
		`${tag}source=${candidateSource} hasCenter=${hasRealCenter} ` +
			`requestedRadiusKm=${effectiveRadiusKm ?? 'n/a'} ` +
			`fetchedCandidates=${allCandidates.length} fetchMs=${fetchMs} ` +
			`canonicalBusiness=${canonicalBusinessAllocated.length} ` +
			`looseBusiness=${looseBusinessAllocated.length} ` +
			`returned=${finalContacts.length} breakdown=` +
			Object.entries(categoryBreakdown)
				.filter(([, n]) => n > 0)
				.map(([k, n]) => `${k}:${n}`)
				.join(',')
	);

	return {
		contacts: finalContacts,
		categoryBreakdown,
		candidateSource,
		fetchMs,
		effectiveCenter,
		effectiveRadiusKm,
		hasRealCenter,
	};
};
