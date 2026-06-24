// Client-side search-result cache + speculative-fetch slot shared by the dashboard
// (useDashboard) and the campaign page's Search-tab prefetch. Everything here is
// module-scope and hook-free: the localStorage cache survives reloads, and the
// speculative slot survives soft route changes (campaign ⇄ dashboard) because the
// JS context persists — which is exactly what lets a fetch fired on the campaign
// page be adopted by the dashboard after it remounts.

import { ContactWithName } from '@/types/contact';
import {
	fetchCuratedSearch,
	type CuratedSearchResult,
} from '@/hooks/queryHooks/useContacts';
import { getApproximateLocation } from '@/utils/approximateLocation';

// Args a given search ran with. Doubles as the cache match key (after normalization).
export type CuratedSearchArgs = {
	lat: number | null;
	lon: number | null;
	radiusKm: number | null;
	category: string | null;
	area: string | null;
	state: string | null;
};

// Args we ran a free-text "Search Anything" search with. The decorated result is cached so
// a repeat restores the same hybrid-retriever result set (and its `curatedCategory`
// decoration) instead of falling back to the regular /api/contacts vector search — which
// returns differently-scored data and breaks the map's stable curated marker rendering.
export type FreeTextSearchArgs = {
	q: string;
	lat: number | null;
	lon: number | null;
	radiusKm: number | null;
	// Radius-search mode. Part of the cache identity so a strict (hard-filtered)
	// search isn't served a soft-locality result cached at the same radius.
	strictRadius: boolean;
	// Keyword mode swaps the server into direct field matching instead of semantic search.
	keywordMode: boolean;
	// Profile mode: a normalized signature of the identity signals (genre|embedText|
	// area). Part of the cache identity so profile-tailored results don't collide
	// with non-profile results, and an identity edit (new signature) busts stale
	// entries. Empty string when Profile is off.
	profileSig: string;
};

// Client-side multi-entry result cache (localStorage). Repeating a recent dashboard search
// should paint instantly instead of re-running the multi-second curated/free-text pipelines.
// localStorage (not sessionStorage) so it survives tab close and is shared across tabs within
// the window. Curated stays non-deterministic on the server — the SWR path in
// triggerCuratedSearch paints the cache, then swaps in a fresh shuffle.
const SEARCH_CACHE_VERSION = 3 as const;
// Three hours: covers same-session repeats and "I came back after lunch", short enough that a
// stale contact set is bounded. Curated additionally self-heals via background revalidate.
const SEARCH_CACHE_MAX_AGE_MS = 3 * 60 * 60 * 1000;
// Per path. ~50 contacts/entry × ~1.5 KB ≈ <1 MB/path, comfortably under the localStorage budget.
const SEARCH_CACHE_MAX_ENTRIES = 12;
export const CURATED_CACHE_KEY_PREFIX = 'murmur_search_cache_curated_v3';
export const FREETEXT_CACHE_KEY_PREFIX = 'murmur_search_cache_freetext_v3';

// One cached result set: the args that produced it, the display query, and the exact contacts
// that were rendered (so a replay is byte-identical).
export type SearchCacheEntry<TArgs> = {
	ts: number;
	args: TArgs;
	query: string;
	contacts: ContactWithName[];
};

type SearchCacheEnvelope<TArgs> = {
	v: typeof SEARCH_CACHE_VERSION;
	entries: SearchCacheEntry<TArgs>[];
};

// Namespace by user so a different signed-in user on the same browser can't read prior
// results. Expired entries are dropped on read, so no explicit sign-out clear is required.
export const searchCacheKey = (
	prefix: string,
	userId: string | number | null | undefined
): string => `${prefix}:${userId ?? 'anon'}`;

// JSON.stringify(new Date()) is an ISO string, JSON.parse leaves it as a string.
// Contact has Date-typed fields that downstream consumers may treat as Dates, so
// we revive them on read. Missing/null pass through unchanged.
const reviveContactDates = (raw: unknown): ContactWithName => {
	const c = raw as Record<string, unknown>;
	const reviveOne = (v: unknown): unknown =>
		typeof v === 'string' ? new Date(v) : v;
	return {
		...c,
		createdAt: reviveOne(c.createdAt),
		updatedAt: reviveOne(c.updatedAt),
		lastResearchedDate: c.lastResearchedDate != null ? reviveOne(c.lastResearchedDate) : null,
		emailValidatedAt: c.emailValidatedAt != null ? reviveOne(c.emailValidatedAt) : null,
	} as ContactWithName;
};

export const readSearchCache = <TArgs,>(storageKey: string): SearchCacheEntry<TArgs>[] => {
	if (typeof window === 'undefined') return [];
	try {
		const raw = window.localStorage.getItem(storageKey);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as SearchCacheEnvelope<TArgs>;
		if (parsed?.v !== SEARCH_CACHE_VERSION || !Array.isArray(parsed.entries)) return [];
		const now = Date.now();
		return parsed.entries
			.filter(
				(e): e is SearchCacheEntry<TArgs> =>
					!!e &&
					typeof e.ts === 'number' &&
					now - e.ts <= SEARCH_CACHE_MAX_AGE_MS &&
					Array.isArray(e.contacts)
			)
			.map((e) => ({
				ts: e.ts,
				args: e.args,
				query: typeof e.query === 'string' ? e.query : '',
				contacts: e.contacts.map(reviveContactDates),
			}));
	} catch {
		return [];
	}
};

export const findSearchCacheEntry = <TArgs,>(
	entries: SearchCacheEntry<TArgs>[],
	argsEqual: (a: TArgs, b: TArgs) => boolean,
	args: TArgs
): SearchCacheEntry<TArgs> | null => entries.find((e) => argsEqual(e.args, args)) ?? null;

export const writeSearchCacheEntry = <TArgs,>(
	storageKey: string,
	entry: SearchCacheEntry<TArgs>,
	argsEqual: (a: TArgs, b: TArgs) => boolean
): void => {
	if (typeof window === 'undefined') return;
	// Dedupe by args, move to front (MRU), cap length.
	const others = readSearchCache<TArgs>(storageKey).filter(
		(e) => !argsEqual(e.args, entry.args)
	);
	let entries = [entry, ...others].slice(0, SEARCH_CACHE_MAX_ENTRIES);
	// On quota exhaustion, drop the oldest entry and retry so the cache degrades to
	// "fewer entries" instead of failing to persist at all.
	while (entries.length > 0) {
		try {
			window.localStorage.setItem(
				storageKey,
				JSON.stringify({ v: SEARCH_CACHE_VERSION, entries })
			);
			return;
		} catch {
			entries = entries.slice(0, -1);
		}
	}
};

const roundTo = (value: number, decimals: number): number => {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
};

// Normalize so trivially-different inputs hit the same entry. Curated is a neighborhood
// sample → coarse 2dp (~1.1 km) buckets; free-text is more location-specific → 3dp.
export const normalizeCuratedArgs = (args: CuratedSearchArgs): CuratedSearchArgs => ({
	lat: args.lat == null ? null : roundTo(args.lat, 2),
	lon: args.lon == null ? null : roundTo(args.lon, 2),
	radiusKm: args.radiusKm == null ? null : Math.round(args.radiusKm),
	category: args.category?.trim().toLowerCase() ?? null,
	area: args.area?.trim().toLowerCase() ?? null,
	state: args.state?.trim().toLowerCase() ?? null,
});

export const normalizeFreeTextArgs = (args: FreeTextSearchArgs): FreeTextSearchArgs => ({
	q: args.q.trim().toLowerCase().replace(/\s+/g, ' '),
	lat: args.lat == null ? null : roundTo(args.lat, 3),
	lon: args.lon == null ? null : roundTo(args.lon, 3),
	radiusKm: args.radiusKm == null ? null : Math.round(args.radiusKm),
	strictRadius: args.strictRadius,
	keywordMode: args.keywordMode,
	profileSig: args.profileSig,
});

export const curatedArgsEqual = (a: CuratedSearchArgs, b: CuratedSearchArgs): boolean =>
	a.lat === b.lat &&
	a.lon === b.lon &&
	a.radiusKm === b.radiusKm &&
	a.category === b.category &&
	(a.area ?? null) === (b.area ?? null) &&
	(a.state ?? null) === (b.state ?? null);

export const freeTextArgsEqual = (a: FreeTextSearchArgs, b: FreeTextSearchArgs): boolean =>
	a.q === b.q &&
	a.lat === b.lat &&
	a.lon === b.lon &&
	a.radiusKm === b.radiusKm &&
	a.strictRadius === b.strictRadius &&
	Boolean(a.keywordMode) === Boolean(b.keywordMode) &&
	a.profileSig === b.profileSig;

export type CuratedOverrides = {
	lat?: number | null;
	lon?: number | null;
	radiusKm?: number | null;
	category?: string | null;
	area?: string | null;
	state?: string | null;
};

export const toCuratedArgs = (overrides?: CuratedOverrides): CuratedSearchArgs => ({
	lat: overrides?.lat ?? null,
	lon: overrides?.lon ?? null,
	radiusKm: overrides?.radiusKm ?? null,
	category: overrides?.category ?? null,
	area: overrides?.area ?? null,
	state: overrides?.state ?? null,
});

// Speculative "For You" curated fetch: kicked off on hover/click intent — by the
// dashboard's For You tile hover, or by the campaign page's Search tab before the
// route swap. The dashboard's triggerCuratedSearch adopts a slot whose args match
// instead of firing a second request (rapid duplicate curated searches contend on
// Elasticsearch and make everything slow). Keyed by the exact (unrounded) args so
// the consumer's args match byte-for-byte. `origin: 'campaign'` promises don't run
// through the dashboard's mutation, so the adopter must surface its own pending
// state (see isAdoptedCuratedFetchPending in useDashboard).
export type SpeculativeCuratedFetch = {
	args: CuratedSearchArgs;
	promise: Promise<CuratedSearchResult>;
	controller: AbortController;
	origin: 'dashboard' | 'campaign';
	startedAt: number;
};

// The slot is module-scope, so an unconsumed entry outlives page mounts. A speculative
// shuffle is only useful within moments of the intent that fired it — past this age,
// readers must treat the entry as absent (adopting an hours-old resolved promise would
// resurrect stale contacts and re-cache them as fresh).
export const SPECULATIVE_CURATED_MAX_AGE_MS = 60 * 1000;

export const isSpeculativeCuratedFetchFresh = (
	spec: SpeculativeCuratedFetch
): boolean => Date.now() - spec.startedAt <= SPECULATIVE_CURATED_MAX_AGE_MS;

export const speculativeCuratedSlot: { current: SpeculativeCuratedFetch | null } = {
	current: null,
};

// Campaign-page Search-tab prefetch: start the default "For You" curated fetch the
// dashboard's pick-flow rehydration is about to run, so the route swap overlaps the
// search instead of serializing after it. Cache-first — when a valid cached shuffle
// exists the rehydration paints it instantly and no request is spent. Skipped while
// signed out: the cache key is per-user and an `anon` write would be invisible to
// the dashboard. The server stays non-deterministic; this only moves the fetch's
// start time earlier (same SWR-cache/speculative-adopt pattern as the dashboard).
export const prefetchCuratedForYouFromCampaign = async (
	userId: string | number | null | undefined
): Promise<void> => {
	if (userId == null || typeof window === 'undefined') return;
	try {
		const loc = await getApproximateLocation().catch(() => null);
		// Mirrors the dashboard rehydration's args for a bare pick URL: location only.
		const rawArgs = toCuratedArgs({ lat: loc?.lat ?? null, lon: loc?.lon ?? null });
		const cacheKey = searchCacheKey(CURATED_CACHE_KEY_PREFIX, userId);
		const cached = findSearchCacheEntry(
			readSearchCache<CuratedSearchArgs>(cacheKey),
			curatedArgsEqual,
			normalizeCuratedArgs(rawArgs)
		);
		if (cached) return;
		const existing = speculativeCuratedSlot.current;
		if (
			existing &&
			curatedArgsEqual(existing.args, rawArgs) &&
			isSpeculativeCuratedFetchFresh(existing)
		) {
			return;
		}
		existing?.controller.abort();
		const controller = new AbortController();
		const promise = fetchCuratedSearch({
			lat: rawArgs.lat,
			lon: rawArgs.lon,
			limit: 50, // must match the dashboard's buildCuratedVars limit
			signal: controller.signal,
		});
		promise
			.then((result) => {
				// Second-chance path: persist the shuffle so the dashboard's cache read still
				// hits even if the slot was replaced before rehydration ran. Same write the
				// dashboard performs after its own fetch, so a later adoption just dedupes.
				const where = result.city ?? result.region ?? 'your area';
				writeSearchCacheEntry(
					cacheKey,
					{
						ts: Date.now(),
						args: normalizeCuratedArgs(rawArgs),
						query: `Curated picks near ${where}`,
						contacts: result.contacts,
					},
					curatedArgsEqual
				);
			})
			.catch(() => undefined);
		speculativeCuratedSlot.current = {
			args: rawArgs,
			promise,
			controller,
			origin: 'campaign',
			startedAt: Date.now(),
		};
	} catch {
		// Best-effort: the dashboard runs the search itself if this never landed.
	}
};
