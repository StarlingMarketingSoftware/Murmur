import type { Contact } from '@prisma/client';
import { US_STATES } from '@/constants/usStates';
import { BOOKING_CONTACT_TITLE_PREFIXES } from '@/constants/contactCategories';

// Pure, side-effect-free distribution + allocation logic. Lives in its own file
// so it can be unit-tested without spinning up Next, Prisma, or Clerk.

export interface CategoryPool {
	key: string;
	label: string;
	contacts: Contact[];
	radiusUsed: number | null;
	/**
	 * Relative share weight for this category in the final mix.
	 * 1.0 = default share, 0.5 = roughly half-share, 2.0 = double, etc.
	 * Defaults to 1 when unspecified.
	 */
	weight?: number;
}

export interface AllocatedContact {
	categoryKey: string;
	categoryLabel: string;
	contact: Contact;
}

const shuffleInPlace = <T,>(arr: T[]): T[] => {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
};

// Quality tier: prefer contacts with the most useful display data so the
// curated set feels considered rather than a raw dump.
const qualityTier = (c: Contact): number => {
	let tier = 0;
	if (c.company && String(c.company).trim().length > 0) tier += 1;
	if (c.headline && String(c.headline).trim().length > 0) tier += 1;
	if (c.website && String(c.website).trim().length > 0) tier += 1;
	if (c.email && String(c.email).trim().length > 0) tier += 1;
	if (c.photoUrl && String(c.photoUrl).trim().length > 0) tier += 1;
	return tier;
};

const hasText = (value: string | null | undefined): boolean =>
	String(value ?? '').trim().length > 0;

/**
 * Category-list rows generated for map/curated discovery represent venues or
 * businesses directly: `company` is the thing to contact and `firstName` /
 * `lastName` are empty. Rows with person names are Apollo-style people at a
 * business, which are useful elsewhere but should not lead the curated feed.
 */
export const contactLooksLikeBusinessEntity = (c: Contact): boolean =>
	!hasText(c.firstName) && !hasText(c.lastName);

const normalizeContactText = (value: string | null | undefined): string =>
	String(value ?? '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();

/**
 * Hard blocker for curated venue discovery. Universities and higher-ed records
 * often look "rich" because they have addresses, websites, and performance
 * metadata, but they do not fit the clean venue/business tray the curated flow
 * is trying to build.
 */
export const contactLooksLikeEducationInstitution = (c: Contact): boolean => {
	const company = normalizeContactText(c.company);
	const title = normalizeContactText(c.title);
	const website = normalizeContactText(c.website);
	const industry = normalizeContactText(c.companyIndustry);
	const type = normalizeContactText(c.companyType);
	const metadata = normalizeContactText(c.metadata);
	const keywordBlob = (c.companyKeywords ?? [])
		.map((k) => normalizeContactText(k))
		.filter(Boolean)
		.join(' ');

	if (website.includes('.edu')) return true;

	const orgBlob = `${company} ${title} ${website} ${industry} ${type} ${metadata} ${keywordBlob}`;
	if (/\b(university|college|community college|campus)\b/.test(orgBlob)) return true;
	if (
		/\b(higher education|education management|primary\/secondary education|e-?learning|student affairs)\b/.test(
			orgBlob
		)
	) {
		return true;
	}

	return false;
};

// Pre-compiled US-state suffix matchers. Tested against the *end* of the
// title (case-insensitive) to detect the canonical "<Prefix> <State>" naming
// pattern that the map overlay treats as first-class. Sorted longest-first
// so multi-word names like "New York" win against the "York" suffix.
const STATE_NAME_SUFFIXES = [...US_STATES.map((s) => s.name)].sort(
	(a, b) => b.length - a.length
);
const STATE_ABBR_SET = new Set(US_STATES.map((s) => s.abbr.toLowerCase()));
const BOOKING_CATEGORY_LABEL_SET = new Set(
	BOOKING_CONTACT_TITLE_PREFIXES.map((prefix) => prefix.toLowerCase())
);

const normalizeTitleLabel = (value: string): string =>
	value.toLowerCase().replace(/\s+/g, ' ').trim();

const stripTrailingStateLabel = (title: string): string | null => {
	const trimmed = title.trim().replace(/[.,;:]+$/g, '').trim();
	if (!trimmed) return null;
	const lower = trimmed.toLowerCase();

	const abbrMatch = /^(.*\S)\s+([a-z]{2})$/i.exec(trimmed);
	if (abbrMatch && STATE_ABBR_SET.has(abbrMatch[2].toLowerCase())) {
		return abbrMatch[1].trim();
	}

	for (const name of STATE_NAME_SUFFIXES) {
		const lc = name.toLowerCase();
		if (lower.endsWith(' ' + lc)) {
			return trimmed.slice(0, trimmed.length - name.length).trim();
		}
	}

	return null;
};

/**
 * Whether a title is one of the literal map-overlay booking category labels
 * followed by a US state name or 2-letter abbreviation.
 *
 * This distinguishes canonical seeded entries like "Coffee Shops Pennsylvania"
 * from looser dynamic titles like "Restaurant Manager at Joe's" or
 * "Restaurants with live music in PA".
 */
export const titleHasStateSuffix = (title: string | null | undefined): boolean => {
	if (!title) return false;
	const base = stripTrailingStateLabel(String(title));
	if (!base) return false;
	return BOOKING_CATEGORY_LABEL_SET.has(normalizeTitleLabel(base));
};

// Personal-title indicators — heuristic for rows that are *people who work at
// venues* rather than venues themselves. The booking overlay's prefix filter
// (see /api/contacts/map-overlay) matches "Coffee Shop Owner", "Restaurant
// Manager at Joe's", etc. just as much as it matches a real "Coffee Shops PA"
// venue row. We want those personal rows pushed to the very end of the curated
// pool so the user sees venue pins, not employees of venues. Tokens matched
// case-insensitively at word boundaries; the trailing " at " catches the
// canonical "<Role> at <Place>" pattern.
const PERSONAL_TITLE_RE =
	/\b(owner|manager|director|head|chef|barista|server|bartender|founder|ceo|coo|cto|vp|cmo|host|hostess|sommelier|winemaker|brewer|distiller|booker|booking|talent|promoter|publicist|consultant|representative|coordinator|associate|assistant|musician|singer)\b|\sat\s/i;

const titleLooksPersonal = (title: string | null | undefined): boolean => {
	if (!title) return false;
	return PERSONAL_TITLE_RE.test(title);
};

/**
 * How closely a row matches the data fingerprint of a row that renders well on
 * the booking-overlay layer (`/api/contacts/map-overlay`). The overlay's only
 * hard filter is `title startsWith <prefix>` + lat/lng populated — identical
 * to the curated candidate filter — but the rows that look right *as pins* are
 * venue-shaped: they have a venue name (company), a venue site (website), full
 * address / location data, and a non-personal title. This score promotes those
 * rows aggressively over thin or person-titled rows that slipped through the
 * prefix filter, and is amplified by `OVERLAY_FIT_TIER` so it dominates the
 * generic `qualityTier` while staying below `CANONICAL_TIER`.
 */
const overlayFitScore = (c: Contact): number => {
	let score = 0;
	if (c.company && String(c.company).trim().length > 0) score += 1;
	if (c.website && String(c.website).trim().length > 0) score += 1;
	if (c.city && String(c.city).trim().length > 0) score += 1;
	if (c.state && String(c.state).trim().length > 0) score += 1;
	if (c.address && String(c.address).trim().length > 0) score += 1;
	if (!contactLooksLikeBusinessEntity(c)) score -= 8;
	if (titleLooksPersonal(c.title)) score -= 3;
	return score;
};

// Live music vocabulary, paired with the ES sampler boost in vectorDb.ts.
// Strong terms = explicit "this place hosts live music" signals. Weak terms =
// adjacent music/performance signals that often indicate live music but are
// not as definitive on their own.
//
// The split lets us heavily favour rows where the operator has actually
// described the place as a live-music spot (e.g. metadata: "Live music every
// Friday, sets at 8 and 10pm") over rows that just happen to mention "stage"
// or "performance" once.
const LIVE_MUSIC_STRONG_PATTERNS: readonly RegExp[] = [
	/\blive[\s-]?music\b/i,
	/\bmusic venues?\b/i,
	/\bconcert venues?\b/i,
	/\bconcert halls?\b/i,
	/\bmusic halls?\b/i,
	/\blive performances?\b/i,
	/\bshow\s?times?\b/i,
	/\bset\s?times?\b/i,
	/\btour dates\b/i,
	/\blive entertainment\b/i,
	/\blive shows?\b/i,
	/\blive acts?\b/i,
	/\blive bands?\b/i,
	/\bnight ?clubs?\b/i,
	/\bjazz clubs?\b/i,
	/\bblues clubs?\b/i,
	/\bopen mic\b/i,
];

const LIVE_MUSIC_WEAK_PATTERNS: readonly RegExp[] = [
	/\bconcerts?\b/i,
	/\bgigs?\b/i,
	/\bjazz\b/i,
	/\bblues\b/i,
	/\bbands?\b/i,
	/\bsinger[-\s]?songwriters?\b/i,
	/\bperformances?\b/i,
	/\bperforming arts\b/i,
	/\bstages?\b/i,
	/\bshows?\b/i,
	/\btouring\b/i,
];

// Bonus signal when the metadata mentions specific show/set times — strong
// indicator that this place actually books live music on a regular schedule
// (e.g. "Live music every Friday 8pm", "Sets at 7pm and 10pm").
const SHOW_TIME_PATTERN =
	/\b(?:sets?|shows?|doors|live music|performances?)[^.]{0,40}\b(?:at|every|nightly|weekly|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i;
const TIME_OF_DAY_PATTERN = /\b(?:1?\d)(?::\d{2})?\s?(?:am|pm)\b/i;

/**
 * Live music relevance score for a contact, computed across the same text
 * fields the ES sampler boosts (title / headline / metadata / companyKeywords
 * / companyIndustry / companyType / company). Designed to mirror the ES boost
 * shape so the in-memory tier and the candidate-pool selection point in the
 * same direction:
 *   - Each strong-term hit: +6
 *   - Each weak-term hit: +1
 *   - Bonus +4 if metadata describes a regular show/set schedule
 *   - Bonus +2 if metadata mentions a specific show/set time of day
 * Capped at a sane max so a long metadata blob full of music keywords doesn't
 * runaway dominate every other ranking signal.
 */
export const liveMusicSignalScore = (c: Contact): number => {
	const company = String(c.company ?? '');
	const title = String(c.title ?? '');
	const headline = String(c.headline ?? '');
	const industry = String(c.companyIndustry ?? '');
	const type = String(c.companyType ?? '');
	const metadata = String(c.metadata ?? '');
	const keywordBlob = (c.companyKeywords ?? []).join(' ');
	const blob = `${title} ${headline} ${metadata} ${keywordBlob} ${industry} ${type} ${company}`;
	if (!blob.trim()) return 0;

	let score = 0;
	for (const pattern of LIVE_MUSIC_STRONG_PATTERNS) {
		if (pattern.test(blob)) score += 6;
	}
	for (const pattern of LIVE_MUSIC_WEAK_PATTERNS) {
		if (pattern.test(blob)) score += 1;
	}
	// Schedule signals — only check the metadata field directly, where operators
	// describe their regular booking cadence. Avoids false positives from a
	// company name like "5pm Wines" or a website slug.
	if (metadata && SHOW_TIME_PATTERN.test(metadata)) score += 4;
	if (metadata && TIME_OF_DAY_PATTERN.test(metadata) && /\b(music|live|show|set|band|concert|gig)\b/i.test(metadata)) {
		score += 2;
	}
	return Math.min(score, 50);
};

// Composite ordering tier within a bucket, layered so the dominant signal is
// always the most direct one:
//   1. CANONICAL_TIER — title is the seeded "<Prefix> <State>" form. This is
//      the strictest "this row IS the category" signal in the dataset.
//   2. LIVE_MUSIC_TIER — explicit live-music / concert / show-time signals in
//      title / headline / metadata / keywords. Within any phase, rows that
//      operators describe as live-music spots surface first. Slotted *below*
//      CANONICAL_TIER so canonical rows still lead each category, but *above*
//      OVERLAY_FIT_TIER so a row that mentions live music with weak overlay
//      data still beats a row with strong overlay data and no music signal.
//   3. OVERLAY_FIT_TIER — venue-shaped data (company / website / address /
//      city+state) and absence of personal-title patterns. Mirrors what makes
//      a row render usefully on the booking-overlay layer.
//   4. qualityTier — generic profile richness as the final tiebreaker.
//
// Each tier strictly dominates the next: CANONICAL_TIER (100k) >> max live
// music contribution (≈+50,000 capped at 50 * tier) > max overlay contribution
// (≈+500, range −300..+500) >> qualityTier max (5). Live music max (50 * 1000
// = 50,000) is intentionally large enough that within a category, a non-music
// canonical row CANNOT outrank a music-flagged canonical row, but is still
// strictly less than CANONICAL_TIER so a non-canonical music row never beats a
// canonical music row.
const CANONICAL_TIER = 100_000;
const LIVE_MUSIC_TIER = 1_000;
const OVERLAY_FIT_TIER = 100;
const orderingTier = (c: Contact): number =>
	qualityTier(c) +
	overlayFitScore(c) * OVERLAY_FIT_TIER +
	liveMusicSignalScore(c) * LIVE_MUSIC_TIER +
	(titleHasStateSuffix(c.title) ? CANONICAL_TIER : 0);

const bucketKeyFor = (
	contact: Contact,
	center: { lat: number; lon: number } | null,
	cellSizeDeg: number
): string => {
	if (center && contact.latitude != null && contact.longitude != null) {
		const latCell = Math.floor(contact.latitude / cellSizeDeg);
		const lonCell = Math.floor(contact.longitude / cellSizeDeg);
		return `cell:${latCell}:${lonCell}`;
	}
	return `state:${(contact.state ?? '∅').toLowerCase()}`;
};

// Round-robin across geographic buckets so the same city doesn't dog-pile a
// category. Within each bucket: quality tier (desc) + random tie-break.
export const distributeAcrossBuckets = (
	candidates: Contact[],
	limit: number,
	center: { lat: number; lon: number } | null,
	radiusKm: number | null
): Contact[] => {
	if (candidates.length === 0 || limit <= 0) return [];

	// Memoize composite tier per candidate. orderingTier runs a regex and a
	// ~50-element state-suffix scan; the bucket sort comparator below would
	// otherwise re-evaluate it O(log n) times per item, which on a hundreds-row
	// candidate pool is the difference between a sub-second curated-search
	// response and a request that exceeds the frontend's 25s timeout.
	const tierByContact = new Map<Contact, number>();
	const tierOf = (c: Contact): number => {
		const cached = tierByContact.get(c);
		if (cached !== undefined) return cached;
		const t = orderingTier(c);
		tierByContact.set(c, t);
		return t;
	};

	const cellSizeDeg = radiusKm != null ? Math.max(0.25, radiusKm / 200) : 1;

	const buckets = new Map<string, Contact[]>();
	for (const c of candidates) {
		const key = bucketKeyFor(c, center, cellSizeDeg);
		const list = buckets.get(key) ?? [];
		list.push(c);
		buckets.set(key, list);
	}

	for (const list of buckets.values()) {
		list.sort((a, b) => tierOf(b) - tierOf(a));
		// Shuffle within identical composite tier so output varies per click.
		let i = 0;
		while (i < list.length) {
			const tier = tierOf(list[i]);
			let j = i;
			while (j < list.length && tierOf(list[j]) === tier) j++;
			const slice = list.slice(i, j);
			shuffleInPlace(slice);
			for (let k = 0; k < slice.length; k++) list[i + k] = slice[k];
			i = j;
		}
	}

	const orderedBucketKeys = shuffleInPlace([...buckets.keys()]);
	const cursors = new Map<string, number>();
	for (const k of orderedBucketKeys) cursors.set(k, 0);

	const picked: Contact[] = [];
	let exhausted = 0;
	while (picked.length < limit && exhausted < orderedBucketKeys.length) {
		exhausted = 0;
		for (const key of orderedBucketKeys) {
			if (picked.length >= limit) break;
			const idx = cursors.get(key) ?? 0;
			const list = buckets.get(key)!;
			if (idx >= list.length) {
				exhausted++;
				continue;
			}
			picked.push(list[idx]);
			cursors.set(key, idx + 1);
		}
	}

	return picked;
};

const weightOf = (pool: CategoryPool): number => {
	const w = pool.weight;
	if (w == null || !Number.isFinite(w) || w <= 0) return 1;
	return w;
};

// Compute each pool's target share of `limit` based on its relative weight.
// Targets are floored, then leftover slots (limit - sum(floors)) are
// distributed to the pools with the largest fractional remainders ("largest
// remainder method"), so the rounding bias doesn't always favour the same
// category. With all weights equal, this reduces exactly to the prior
// floor(limit/N) behaviour.
const computeWeightedTargets = (
	pools: CategoryPool[],
	limit: number
): Map<string, number> => {
	const totalWeight = pools.reduce((sum, p) => sum + weightOf(p), 0);
	if (totalWeight <= 0 || pools.length === 0) return new Map();

	type Row = { key: string; floor: number; frac: number };
	const rows: Row[] = pools.map((p) => {
		const ideal = (limit * weightOf(p)) / totalWeight;
		const f = Math.floor(ideal);
		return { key: p.key, floor: f, frac: ideal - f };
	});

	const targets = new Map<string, number>();
	let assigned = 0;
	for (const r of rows) {
		targets.set(r.key, r.floor);
		assigned += r.floor;
	}

	// Distribute remainder slots to the largest fractional remainders. Ties
	// are broken randomly so no single category always receives the leftover.
	let leftover = limit - assigned;
	if (leftover > 0) {
		const sorted = rows
			.slice()
			.sort((a, b) =>
				b.frac !== a.frac ? b.frac - a.frac : Math.random() - 0.5
			);
		for (const r of sorted) {
			if (leftover <= 0) break;
			targets.set(r.key, (targets.get(r.key) ?? 0) + 1);
			leftover--;
		}
	}

	return targets;
};

/**
 * Weighted even-mix allocation across categories.
 *
 * Goals:
 * 1. Each category's contribution to `limit` tracks its `weight` (default 1).
 *    Equal weights → equal split; halved weight → ~half share, etc.
 * 2. When a pool can't fill its target (sparse data), redistribute the deficit
 *    to other categories rather than dropping below `limit`.
 * 3. Stable per-call: the *count* per category is determined by weights and
 *    inventory; the *order* and pass-1 rotation are randomized so consecutive
 *    clicks vary.
 *
 * Algorithm: per-category target = round(limit * weight / Σweight) using the
 * largest-remainder method to keep the total exactly equal to `limit`. Pass 1
 * takes up to `target` from each pool. Pass 2+ round-robins to fill any
 * remaining deficit from pools that still have inventory.
 */
export const allocateAcrossCategories = (
	pools: CategoryPool[],
	limit: number
): AllocatedContact[] => {
	if (limit <= 0) return [];
	const nonEmpty = pools.filter((p) => p.contacts.length > 0);
	if (nonEmpty.length === 0) return [];

	const targets = computeWeightedTargets(nonEmpty, limit);
	const cursors = new Map<string, number>();
	for (const p of nonEmpty) cursors.set(p.key, 0);

	const allocated: AllocatedContact[] = [];

	const takeFrom = (pool: CategoryPool, max: number): number => {
		let taken = 0;
		while (taken < max && allocated.length < limit) {
			const idx = cursors.get(pool.key) ?? 0;
			if (idx >= pool.contacts.length) break;
			allocated.push({
				categoryKey: pool.key,
				categoryLabel: pool.label,
				contact: pool.contacts[idx],
			});
			cursors.set(pool.key, idx + 1);
			taken++;
		}
		return taken;
	};

	// Pass 1 — fill each category's weighted target, in randomized order.
	const pass1Order = shuffleInPlace(nonEmpty.slice());
	for (const pool of pass1Order) {
		if (allocated.length >= limit) break;
		const target = targets.get(pool.key) ?? 0;
		if (target > 0) takeFrom(pool, target);
	}

	// Pass 2+ — round-robin one-by-one across pools that still have inventory
	// to fill any deficit (e.g. a pool was under-stocked relative to its target).
	while (allocated.length < limit) {
		const stillHavePool = nonEmpty.filter((p) => {
			const idx = cursors.get(p.key) ?? 0;
			return idx < p.contacts.length;
		});
		if (stillHavePool.length === 0) break;
		const order = shuffleInPlace(stillHavePool.slice());
		let progressedThisPass = false;
		for (const pool of order) {
			if (allocated.length >= limit) break;
			const took = takeFrom(pool, 1);
			if (took > 0) progressedThisPass = true;
		}
		if (!progressedThisPass) break;
	}

	return allocated;
};

/**
 * Final ordering pass: interleave allocated contacts so consecutive positions
 * hit different categories whenever possible.
 *
 * Random shuffling produces visible clumps (the user noticed "3 distilleries
 * in a row at the top"). A round-robin interleave is much stronger:
 * - Positions [0..N) where N = number of categories show every category once,
 *   no repeats. So the first ~8 results are guaranteed to be a complete mix.
 * - Adjacency between same-category items only occurs at the tail when one
 *   category outlasts every other (rare under the weighted allocator).
 *
 * Order of categories within each round is randomized once per call so two
 * consecutive clicks don't produce the same sequence.
 */
export const interleaveByCategory = (
	allocated: AllocatedContact[]
): AllocatedContact[] => {
	if (allocated.length === 0) return [];

	const groups = new Map<string, AllocatedContact[]>();
	for (const a of allocated) {
		const list = groups.get(a.categoryKey) ?? [];
		list.push(a);
		groups.set(a.categoryKey, list);
	}

	const orderedKeys = shuffleInPlace([...groups.keys()]);
	const cursors = new Map<string, number>();
	for (const k of orderedKeys) cursors.set(k, 0);

	const result: AllocatedContact[] = [];
	let progressing = true;
	while (progressing) {
		progressing = false;
		for (const key of orderedKeys) {
			const list = groups.get(key)!;
			const idx = cursors.get(key) ?? 0;
			if (idx >= list.length) continue;
			result.push(list[idx]);
			cursors.set(key, idx + 1);
			progressing = true;
		}
	}
	return result;
};

// Test-only export: deterministic allocator that doesn't shuffle. Honors weights
// via the same largest-remainder method as the main allocator, with a fixed
// (input-order) tie-break so output is fully deterministic.
export const allocateAcrossCategoriesDeterministic = (
	pools: CategoryPool[],
	limit: number
): AllocatedContact[] => {
	if (limit <= 0) return [];
	const nonEmpty = pools.filter((p) => p.contacts.length > 0);
	if (nonEmpty.length === 0) return [];

	const totalWeight = nonEmpty.reduce((sum, p) => sum + weightOf(p), 0);
	type Row = { key: string; floor: number; frac: number; index: number };
	const rows: Row[] = nonEmpty.map((p, index) => {
		const ideal = totalWeight > 0 ? (limit * weightOf(p)) / totalWeight : 0;
		const f = Math.floor(ideal);
		return { key: p.key, floor: f, frac: ideal - f, index };
	});
	const targets = new Map<string, number>();
	let assigned = 0;
	for (const r of rows) {
		targets.set(r.key, r.floor);
		assigned += r.floor;
	}
	let leftover = limit - assigned;
	if (leftover > 0) {
		const sorted = rows
			.slice()
			.sort((a, b) => (b.frac !== a.frac ? b.frac - a.frac : a.index - b.index));
		for (const r of sorted) {
			if (leftover <= 0) break;
			targets.set(r.key, (targets.get(r.key) ?? 0) + 1);
			leftover--;
		}
	}

	const cursors = new Map<string, number>();
	for (const p of nonEmpty) cursors.set(p.key, 0);

	const allocated: AllocatedContact[] = [];

	const takeFrom = (pool: CategoryPool, max: number): number => {
		let taken = 0;
		while (taken < max && allocated.length < limit) {
			const idx = cursors.get(pool.key) ?? 0;
			if (idx >= pool.contacts.length) break;
			allocated.push({
				categoryKey: pool.key,
				categoryLabel: pool.label,
				contact: pool.contacts[idx],
			});
			cursors.set(pool.key, idx + 1);
			taken++;
		}
		return taken;
	};

	for (const pool of nonEmpty) {
		if (allocated.length >= limit) break;
		const target = targets.get(pool.key) ?? 0;
		if (target > 0) takeFrom(pool, target);
	}

	while (allocated.length < limit) {
		const stillHavePool = nonEmpty.filter((p) => {
			const idx = cursors.get(p.key) ?? 0;
			return idx < p.contacts.length;
		});
		if (stillHavePool.length === 0) break;
		let progressed = false;
		for (const pool of stillHavePool) {
			if (allocated.length >= limit) break;
			const took = takeFrom(pool, 1);
			if (took > 0) progressed = true;
		}
		if (!progressed) break;
	}

	return allocated;
};
