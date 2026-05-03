import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Contact, Prisma } from '@prisma/client';
import {
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import prisma from '@/lib/prisma';
import { sampleContactsByCategory } from '@/app/api/_utils/vectorDb';
import {
	CURATED_BOOKING_CONTACT_TITLE_PREFIXES,
	WINE_BEER_SPIRITS_CONTACT_TITLE_PREFIXES,
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

export const maxDuration = 60;

const DEFAULT_RESULT_COUNT = 50;
const MAX_RESULT_COUNT = 100;
const DEFAULT_RADIUS_KM = 250;
// Bbox buffer factor — fetch slightly wider than the requested radius so we
// have headroom for the geographic bucketing without inflating the bbox to
// where Postgres falls back to a seqscan. Anything much wider than ~5°×5°
// degrades because the lat/lng index stops being selective. This mirrors the
// map-overlay viewport pattern (which only stays fast at ≤24° spans).
const FETCH_BUFFER = 1.4;
// Fallback bbox when we have no center at all (rare — the frontend resolves
// IP geolocation before calling, and Vercel sets lat/lon headers in prod).
// Anchoring at the geographic centroid of CONUS with a wide radius keeps the
// query bounded enough to avoid a full seqscan while still touching enough
// data to return a real mix. Better than timing out.
const FALLBACK_CENTER = { lat: 39.83, lon: -98.58 };
const FALLBACK_BBOX_RADIUS_KM = 1200;
// Candidate cap for the bounded query. Sized so an even mix across curated
// categories has plenty to choose from without pulling more than the planner
// can handle quickly.
const CANDIDATE_TAKE = 1500;
const PER_CATEGORY_ES_TAKE = 200;
const PER_CATEGORY_PRISMA_TAKE = 300;
const PER_CATEGORY_FALLBACK_THRESHOLD = 40;

const EXCLUDED_CURATED_CATEGORY_PREFIXES = new Set<BookingContactTitlePrefix>([
	'Wedding Planners',
]);

const CURATED_DISPLAY_LABEL_BY_PREFIX: Record<BookingContactTitlePrefix, string> = {
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

// Curated search intentionally uses the exact same literal booking-category
// title prefixes as the map overlay. Singular forms are not included here:
// "Restaurant Manager at ..." and "Coffee Shop Owner" are loose people/job
// rows and should only appear as fallback tail inventory, not curated pins.
const CURATED_CATEGORIES = CURATED_BOOKING_CONTACT_TITLE_PREFIXES.filter(
	(titlePrefix) => !EXCLUDED_CURATED_CATEGORY_PREFIXES.has(titlePrefix)
).map((titlePrefix) => ({
	label: titlePrefix.toLowerCase(),
	titlePrefixes: [titlePrefix] as const,
	weight: 1,
	displayLabel: CURATED_DISPLAY_LABEL_BY_PREFIX[titlePrefix],
}));

const normalizeCategoryKey = (value: string | null | undefined): string =>
	(value ?? '')
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');

const CATEGORY_PARAM_ALIASES: Record<string, readonly BookingContactTitlePrefix[]> = {
	venues: ['Music Venues'],
	venue: ['Music Venues'],
	'music venues': ['Music Venues'],
	'music venue': ['Music Venues'],
	restaurants: ['Restaurants'],
	restaurant: ['Restaurants'],
	'coffee shops': ['Coffee Shops'],
	'coffee shop': ['Coffee Shops'],
	festivals: ['Music Festivals'],
	festival: ['Music Festivals'],
	'music festivals': ['Music Festivals'],
	'music festival': ['Music Festivals'],
	breweries: ['Breweries'],
	brewery: ['Breweries'],
	distilleries: ['Distilleries'],
	distillery: ['Distilleries'],
	wineries: ['Wineries'],
	winery: ['Wineries'],
	cideries: ['Cideries'],
	cidery: ['Cideries'],
	'wedding planners': ['Wedding Planners'],
	'wedding planner': ['Wedding Planners'],
	'wedding venues': ['Wedding Venues'],
	'wedding venue': ['Wedding Venues'],
	'wine beer and spirits': WINE_BEER_SPIRITS_CONTACT_TITLE_PREFIXES,
	'wine beer spirits': WINE_BEER_SPIRITS_CONTACT_TITLE_PREFIXES,
};

const resolveRequestedCategoryPrefixes = (
	value: string | null
): readonly BookingContactTitlePrefix[] | null => {
	const key = normalizeCategoryKey(value);
	if (!key) return null;
	return CATEGORY_PARAM_ALIASES[key] ?? null;
};

const parseFloatOrNull = (value: string | null): number | null => {
	if (!value) return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
};

interface ResolvedCenter {
	lat: number | null;
	lon: number | null;
	city: string | null;
	region: string | null;
}

const inferCenterFromRequest = (
	req: NextRequest,
	overrides: { lat: number | null; lon: number | null }
): ResolvedCenter => {
	if (overrides.lat != null && overrides.lon != null) {
		return { lat: overrides.lat, lon: overrides.lon, city: null, region: null };
	}
	const headers = req.headers;
	const lat = parseFloatOrNull(headers.get('x-vercel-ip-latitude'));
	const lon = parseFloatOrNull(headers.get('x-vercel-ip-longitude'));
	const city = headers.get('x-vercel-ip-city');
	const region =
		headers.get('x-vercel-ip-country-region') ??
		headers.get('x-vercel-ip-region') ??
		null;
	return {
		lat,
		lon,
		city: city ? decodeURIComponent(city) : null,
		region,
	};
};

// Haversine distance in km.
const distanceKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number => {
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

// Bounding box centered on lat/lon at radiusKm. Approximate — uses a fixed
// 111 km/deg conversion for lat and a cosine-corrected one for lon. Good
// enough for a coarse pre-filter before haversine distance is applied per
// candidate in JS.
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
	categories: readonly {
		label: string;
		titlePrefixes: readonly string[];
	}[]
): string | null => {
	if (!title) return null;
	const lc = title.toLowerCase();
	// Match against the FIRST (canonical) prefix of each category. Returning
	// that as the key keeps pool grouping consistent regardless of which
	// variant the underlying row used. We test longer prefixes before shorter
	// so e.g. "Music Venues …" matches `Music Venues` rather than something
	// shorter that happens to share the same start.
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

// Pick the best available candidate set for a category by widening the radius
// step-by-step before giving up. Operates entirely on the in-memory candidate
// pool — no extra DB calls.
const buildCategoryPool = (
	allCandidates: Contact[],
	perCategoryShare: number,
	requestedLimit: number,
	center: { lat: number; lon: number } | null,
	requestedRadiusKm: number | null,
	radiusLadder: (number | null)[]
): { contacts: Contact[]; radiusUsed: number | null } => {
	if (allCandidates.length === 0) return { contacts: [], radiusUsed: requestedRadiusKm };

	// Per-pool size has to cover *both* phases of the route's two-phase
	// allocation (canonical-first, then dynamic to fill the tail), even when a
	// single category dominates the user's region. Capping at perCategoryShare *
	// 3 (=21 for limit=50) was throwing away canonical inventory when one
	// category had 50+ canonical rows — the pool only saw 21 of them, so the
	// canonical phase ran out early and dynamic rows leaked into the top.
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

type CuratedQualityTier = 'canonical-clean' | 'clean';

export type CuratedSearchContact = Contact & {
	curatedCategory: BookingContactTitlePrefix;
	curatedDisplayLabel: string;
	curatedQualityTier: CuratedQualityTier;
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

export interface CuratedSearchResponse {
	categoryBreakdown: Record<string, number>;
	center: { lat: number; lon: number } | null;
	radiusKm: number | null;
	city: string | null;
	region: string | null;
	contacts: CuratedSearchContact[];
}

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const url = new URL(req.url);
		const overrideLat = parseFloatOrNull(url.searchParams.get('lat'));
		const overrideLon = parseFloatOrNull(url.searchParams.get('lon'));
		const overrideRadiusKm = parseFloatOrNull(url.searchParams.get('radiusKm'));
		const requestedCategoryPrefixes = resolveRequestedCategoryPrefixes(
			url.searchParams.get('category')
		);
		const requestedLimit = (() => {
			const parsed = Number(url.searchParams.get('limit'));
			if (!Number.isFinite(parsed)) return DEFAULT_RESULT_COUNT;
			return Math.max(1, Math.min(Math.trunc(parsed), MAX_RESULT_COUNT));
		})();

		const center = inferCenterFromRequest(req, { lat: overrideLat, lon: overrideLon });
		const hasCenter = center.lat != null && center.lon != null;
		const requestedRadiusKm = hasCenter
			? overrideRadiusKm ?? DEFAULT_RADIUS_KM
			: null;
		const centerPoint = hasCenter
			? { lat: center.lat as number, lon: center.lon as number }
			: null;

		// Radius ladder runs in-memory against the bounded fetch pool. The widest
		// rung is the bbox itself — going wider would require a second DB query.
		// The deficit-redistribution in the allocator handles sparse categories
		// gracefully: if a category has no rows in the bbox, other categories pick
		// up its slots.
		const fetchBboxRadiusKm = hasCenter
			? Math.max(requestedRadiusKm ?? DEFAULT_RADIUS_KM, DEFAULT_RADIUS_KM) *
				FETCH_BUFFER
			: FALLBACK_BBOX_RADIUS_KM;
		const radiusLadder: (number | null)[] = hasCenter
			? [
					requestedRadiusKm ?? DEFAULT_RADIUS_KM,
					Math.min(fetchBboxRadiusKm, 1500),
					null, // unrestricted within the bbox-fetched pool
			  ]
			: [null];

		const activeCategories = requestedCategoryPrefixes
			? CURATED_CATEGORIES.filter((category) =>
					requestedCategoryPrefixes.includes(category.titlePrefixes[0])
			  )
			: CURATED_CATEGORIES;

		if (activeCategories.length === 0) {
			return apiResponse({
				categoryBreakdown: {},
				center: centerPoint,
				radiusKm: requestedRadiusKm,
				city: center.city,
				region: center.region,
				contacts: [],
			} satisfies CuratedSearchResponse);
		}

		const perCategoryShare = Math.ceil(
			requestedLimit / Math.max(1, activeCategories.length)
		);

		const bboxAnchor = centerPoint ?? FALLBACK_CENTER;
		const flatPrefixes = activeCategories.flatMap((c) => c.titlePrefixes);
		const fetchBbox = bboxFromCenter(bboxAnchor, fetchBboxRadiusKm);

		// PRIMARY PATH — Elasticsearch per category.
		// ES remains the recall engine and live-music booster, but we no longer
		// ask one global randomized pool to represent every category. Each active
		// category gets its own ES sample, then Prisma hydrates the combined IDs.
		// Final cleanliness/balance is enforced in memory below.
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
				try {
					const esResult = await sampleContactsByCategory({
						titlePrefixes: [...category.titlePrefixes],
						limit: PER_CATEGORY_ES_TAKE,
						candidatePool: PER_CATEGORY_ES_TAKE,
						center: centerPoint ?? bboxAnchor,
						radiusKm: fetchBboxRadiusKm,
						seed: Date.now() + Math.floor(Math.random() * 1_000_000),
					});
					return { categoryKey, matches: esResult.matches };
				} catch (err) {
					console.warn(
						`[curated-search] ES sampler failed for ${categoryKey}, falling back to Prisma`,
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
			const hydrated = await prisma.contact.findMany({
				where: { id: { in: [...new Set(esRows.map((row) => row.id))] } },
			});
			const byId = new Map(hydrated.map((c) => [c.id, c]));
			for (const row of esRows) {
				const contact = byId.get(row.id);
				if (contact) appendCandidates(row.categoryKey, [contact]);
			}
		}

		// Always top up with exact map-overlay category labels. These rows render
		// as clean SVG/color chips and should lead their category when present.
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

		// Per-category Prisma top-up keeps sparse categories from being erased by
		// dense categories. This is the safety net when ES is empty, behind, or
		// returned too few clean candidates for a category.
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

		// Group candidates by category in memory. Category key = the literal
		// map-overlay title prefix. We keep the per-category ES/Prisma assignment,
		// but still verify the title prefix so a stale or malformed row cannot
		// leak into another category's quota.
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
					requestedLimit,
					centerPoint,
					requestedRadiusKm,
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

		// Two hard phases, not just boosts:
		// 1. Generated map-overlay category rows representing businesses directly
		//    (`<Category> <State>`, no first/last person name, no higher-ed).
		// 2. Other category-prefix rows that are still business-shaped.
		// Person-shaped rows and university/higher-ed records are intentionally
		// excluded instead of used as filler; fewer clean rows is better than 50
		// visually dirty picks.
		const canonicalBusinessPools = buildPools(
			(c) => titleHasStateSuffix(c.title) && cleanBusinessPredicate(c)
		);
		const looseBusinessPools = buildPools(
			(c) => !titleHasStateSuffix(c.title) && cleanBusinessPredicate(c)
		);

		const canonicalBusinessAllocated = allocateAcrossCategories(
			canonicalBusinessPools,
			requestedLimit
		);
		const looseBusinessRemainder =
			requestedLimit - canonicalBusinessAllocated.length;
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
			`[curated-search] source=${candidateSource} hasCenter=${hasCenter} ` +
				`requestedRadiusKm=${requestedRadiusKm ?? 'n/a'} ` +
				`fetchedCandidates=${allCandidates.length} fetchMs=${fetchMs} ` +
				`canonicalBusiness=${canonicalBusinessAllocated.length} ` +
				`looseBusiness=${looseBusinessAllocated.length} ` +
				`returned=${finalContacts.length} breakdown=` +
				Object.entries(categoryBreakdown)
					.filter(([, n]) => n > 0)
					.map(([k, n]) => `${k}:${n}`)
					.join(',')
		);

		const response: CuratedSearchResponse = {
			categoryBreakdown,
			center: centerPoint,
			radiusKm: requestedRadiusKm,
			city: center.city,
			region: center.region,
			contacts: finalContacts,
		};

		return apiResponse(response);
	} catch (error) {
		return handleApiError(error);
	}
}
