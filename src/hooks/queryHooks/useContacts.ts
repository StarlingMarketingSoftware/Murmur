import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
	type QueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { CustomMutationOptions, CustomQueryOptions } from '@/types';
import { toast } from 'sonner';
import { ContactFilterData, PostContactData } from '@/app/api/contacts/route';
import { appendQueryParamsToUrl } from '@/utils';
import { PostBatchContactData } from '@/app/api/contacts/batch/route';
import { PatchContactData } from '@/app/api/contacts/[id]/route';
import { GetContactResearchData } from '@/app/api/contacts/[id]/research/route';
import { PostBulkUpdateContactData } from '@/app/api/contacts/bulk-update/route';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { ContactWithName } from '@/types/contact';
import {
	getContactResearchSeed,
	hasContactResearchSeed,
	retainContactResearchSeeds,
	setContactResearchSeed,
} from './contactResearchSeeds';

const QUERY_KEYS = {
	all: ['contacts'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

const CONTACT_SEARCH_TIMEOUT_MS = 65000;
const TIMEOUT_ERROR_RE = /\b(timeout|timed\s*out)\b/i;

const readResponseErrorMessage = async (
	response: Response,
	fallback: string,
	timeoutMs?: number
): Promise<string> => {
	let errorMessage = fallback;
	try {
		const rawError = await response.text();
		if (rawError) {
			try {
				const errorData = JSON.parse(rawError);
				errorMessage = errorData.error || errorData.message || rawError;
			} catch {
				errorMessage = rawError;
			}
		} else {
			errorMessage = `HTTP ${response.status} error`;
		}
	} catch {
		errorMessage = `HTTP ${response.status} error`;
	}

	if (response.status === 504 || TIMEOUT_ERROR_RE.test(errorMessage)) {
		return timeoutMs
			? `Request timeout after ${timeoutMs}ms`
			: 'Request timeout';
	}

	return errorMessage;
};

export interface ContactQueryOptions extends CustomQueryOptions {
	filters?: ContactFilterData;
}

interface EditContactData {
	id: string | number;
	data: PatchContactData;
}

// Exported so callers (e.g. dashboard hover prefetch) can warm the exact same
// React Query cache entry that useGetContacts reads — same key, same fetcher.
export const getContactsListQueryKey = (filters?: ContactFilterData) =>
	[...QUERY_KEYS.list(), filters] as const;

export const fetchContactsList = async (
	filters: ContactFilterData | undefined,
	signal?: AbortSignal
): Promise<ContactWithName[]> => {
	const url = appendQueryParamsToUrl(urls.api.contacts.index, filters);
	// The route's maxDuration is 60s. Give the server enough room to
	// finish or return its own 504 instead of aborting a slow success.
	const response = await _fetch(url, undefined, undefined, {
		signal,
		timeout: CONTACT_SEARCH_TIMEOUT_MS,
	});

	if (!response.ok) {
		const errorMessage = await readResponseErrorMessage(
			response,
			'Failed to fetch contacts',
			CONTACT_SEARCH_TIMEOUT_MS
		);
		throw new Error(errorMessage);
	}

	return response.json() as Promise<ContactWithName[]>;
};

export const useGetContacts = (options: ContactQueryOptions) => {
	return useQuery<ContactWithName[]>({
		queryKey: getContactsListQueryKey(options.filters),
		queryFn: ({ signal }) => fetchContactsList(options.filters, signal),
		enabled: options.enabled === undefined ? true : options.enabled,
		// Keep previous results visible while a new search fetches (prevents UI + map flicker).
		placeholderData: keepPreviousData,
		refetchOnMount: false,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
		retry: false,
		staleTime: 1000 * 60 * 60,
		gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
	});
};

export const useGetUsedContactIds = () => {
	return useQuery<number[]>({
		queryKey: [...QUERY_KEYS.list(), 'used-contacts'],
		queryFn: async () => {
			const url = appendQueryParamsToUrl(urls.api.contacts.usedContacts.index);
			const response = await _fetch(url);

			if (!response.ok) {
				let errorMessage = 'Failed to fetch used contacts';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					// If response is not JSON (e.g., plain text "Internal Server Error")
					// try to get the text content
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}

			return response.json() as Promise<number[]>;
		},
	});
};

export interface UsedContactCampaignSummary {
	id: number;
	name: string;
}

export const useGetUsedContactCampaigns = (contactId: number | null) => {
	return useQuery<UsedContactCampaignSummary[]>({
		queryKey: [...QUERY_KEYS.list(), 'used-contacts', 'campaigns', contactId],
		queryFn: async ({ signal }) => {
			const url = appendQueryParamsToUrl(urls.api.contacts.usedContacts.campaigns.index, {
				contactId: contactId as number,
			});
			const response = await _fetch(url, undefined, undefined, {
				signal,
				timeout: 25000,
			});

			if (!response.ok) {
				let errorMessage = 'Failed to fetch used contact campaigns';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}

			return response.json() as Promise<UsedContactCampaignSummary[]>;
		},
		enabled: Boolean(contactId),
		staleTime: 1000 * 60 * 5,
	});
};

export const useCreateContact = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contact created successfully',
		errorMessage = 'Failed to create contact',
		onSuccess: onSuccessCallback,
	} = options;

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostContactData) => {
			const response = await _fetch(urls.api.contacts.index, 'POST', data);
			if (!response.ok) {
				let errorMessage = 'Failed to create contact';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};

export const useBatchCreateContacts = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contacts created successfully',
		errorMessage = 'Failed to create contacts',
		onSuccess: onSuccessCallback,
	} = options;

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostBatchContactData) => {
			const response = await _fetch(urls.api.contacts.batch.index, 'POST', data);
			if (!response.ok) {
				let errorMessage = 'Failed to create contacts';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}

			return response.json();
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
			if (!suppressToasts) {
				toast.success(
					`${successMessage}! ${data.created} contacts created. ${data.skipped} duplicate contacts skipped.`
				);
			}
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};

export const useEditContact = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contact updated successfully',
		errorMessage = 'Failed to update contact',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ data, id }: EditContactData) => {
			const response = await _fetch(urls.api.contacts.detail(id), 'PATCH', data);
			if (!response.ok) {
				let errorMessage = 'Failed to update contact';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}

			return response.json();
		},
		onSuccess: (variables) => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.detail(variables.id),
			});

			if (!suppressToasts) {
				toast.success(successMessage);
			}
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};

export const useDeleteContact = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contact deleted successfully',
		errorMessage = 'Failed to delete contact',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: number) => {
			const response = await _fetch(urls.api.contacts.detail(id), 'DELETE');
			if (!response.ok) {
				let errorMessage = 'Failed to delete contact';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};

export const useBatchUpdateContacts = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contacts updated successfully',
		errorMessage = 'Failed to update contacts',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostBulkUpdateContactData) => {
			const response = await _fetch(urls.api.contacts.bulkUpdate.index, 'PATCH', data, {
				timeout: 120000,
			});
			if (!response.ok) {
				let errorMessage = 'Failed to update contacts';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}

			return response.json();
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
			if (!suppressToasts) {
				const { updatedCount, failedCount } = data;
				const message =
					failedCount > 0
						? `${successMessage}! ${updatedCount} contacts updated, ${failedCount} failed.`
						: `${successMessage}! ${updatedCount} contacts updated.`;
				toast.success(message);
			}
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};

export interface LocationResult {
	city: string;
	state: string;
	label: string;
}

export const useGetLocations = (
	query: string,
	mode?: 'state' | 'state-first',
	options: { enabled?: boolean } = {}
) => {
	const isStateOnly = mode === 'state';
	const enabled = options.enabled ?? true;

	return useQuery<LocationResult[]>({
		queryKey: ['locations', query, mode],
		queryFn: async () => {
			// For state-only mode, allow empty query to return all states
			if (!query && !isStateOnly) return [];

			const url = appendQueryParamsToUrl(urls.api.contacts.locations.index, {
				query,
				mode,
			});
			const response = await _fetch(url);
			if (!response.ok) {
				throw new Error('Failed to fetch locations');
			}
			return response.json();
		},
		enabled: enabled && (isStateOnly || query.length >= 1),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});
};

export type ContactsMapOverlayMode = 'booking' | 'promotion' | 'all' | 'ambient';

export interface ContactsMapOverlayFilters
	extends Record<string, string[] | number[] | string | number | boolean | undefined> {
	mode?: ContactsMapOverlayMode;
	south: number;
	west: number;
	north: number;
	east: number;
	limit?: number;
	zoom?: number;
	seed?: string;
	phase?: 'visible' | 'buffer';
}

// The research-detail fields the map-overlay route inlines on "fat" rows
// (booking/promotion always; 'all' at deep zoom — see api/contacts/map-overlay).
type OverlayResearchFields = {
	metadata?: string | null;
	website?: string | null;
	address?: string | null;
	companyType?: string | null;
	companyFoundedYear?: string | null;
};

// Move a fat row's research fields into the per-contact seed store and return the
// row slim. The fields would otherwise be duplicated in every overlapping cached
// overlay window (~0.5-2KB metadata blurb per row × up to 2000 rows × dozens of
// windows); seeded once per contact id they're served back synchronously through
// useGetContactResearch's initialData — render-identical, no loading flash.
const slimAndSeedOverlayRow = (
	row: ContactWithName & OverlayResearchFields
): ContactWithName => {
	// Key-absence (not null) marks an already-slim row: useContactWithResearch's
	// `'metadata' in contact` contract distinguishes slim from fetched-but-empty.
	if (!('metadata' in row)) return row;
	const { metadata, website, address, companyType, companyFoundedYear, ...slim } = row;
	setContactResearchSeed(row.id, {
		id: row.id,
		metadata: metadata ?? null,
		website: website ?? null,
		address: address ?? null,
		companyType: companyType ?? null,
		companyFoundedYear: companyFoundedYear ?? null,
		// Inline fat rows never carried keywords, so the seeded research must not
		// surface a keywords band either (see useContactWithResearch's seeded merge).
		companyKeywords: [],
	});
	return slim as ContactWithName;
};

export const useGetContactsMapOverlay = (options: {
	filters?: ContactsMapOverlayFilters;
	enabled?: boolean;
}) => {
	return useQuery<ContactWithName[]>({
		queryKey: [...QUERY_KEYS.list(), 'map-overlay', options.filters],
		queryFn: async ({ signal }) => {
			if (!options.filters) return [];
			const url = appendQueryParamsToUrl(urls.api.contacts.mapOverlay.index, options.filters);
			let response: Response;
			try {
				response = await _fetch(url, undefined, undefined, {
					signal,
					timeout: 20000,
				});
			} catch (error) {
				if (error instanceof Error && error.name === 'AbortError') {
					throw error;
				}
				console.warn('[contacts-map-overlay] Background overlay fetch failed', error);
				return [];
			}

			if (!response.ok) {
				const errorMessage = await readResponseErrorMessage(
					response,
					'Failed to fetch map overlay contacts',
					20000
				);
				console.warn('[contacts-map-overlay] Background overlay response failed', {
					status: response.status,
					errorMessage,
				});
				return [];
			}

			const rows = (await response.json()) as (ContactWithName &
				OverlayResearchFields)[];
			return rows.map(slimAndSeedOverlayRow);
		},
		enabled: (options.enabled ?? true) && Boolean(options.filters),
		// Prevent marker flicker when the bbox/zoom changes by keeping the previous
		// overlay results visible while the next window refetches.
		placeholderData: keepPreviousData,
		refetchOnMount: false,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
		retry: false,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 5, // Keep inactive overlay windows briefly without retaining long pan sessions
	});
};

export const getContactsMapOverlayBaseKey = () =>
	[...QUERY_KEYS.list(), 'map-overlay'] as const;

// The overlay queryKey embeds the quantized viewport, so every distinct pan/zoom
// position mints a new cache entry (up to ~2000 rows each) that gcTime keeps for
// 5 minutes — an unbounded pool during a heavy pan burst (gcTime can't cap how
// many windows are minted INSIDE its window). Bound it: keep the most recently
// USED windows per overlay group and evict the rest.
//
// 24 covers a full 16→8→16 zoom traversal (booking/promotion windows mint a new
// key at every integer zoom step) plus pan margin, so any plausible pan-back /
// zoom-back retrace stays a synchronous cache hit. The 2-min age floor must sit
// BELOW the 5-min gcTime or the LRU would never fire before gcTime collects.
const MAP_OVERLAY_LRU_KEEP_PER_GROUP = 24;
const MAP_OVERLAY_LRU_MIN_AGE_MS = 1000 * 60 * 2;

// Cache-hit revisits don't bump dataUpdatedAt, so recency needs its own stamp:
// each trim pass marks the currently-observed (rendered) windows as active.
const mapOverlayLastActiveAt = new Map<string, number>();

export const trimContactsMapOverlayCache = (queryClient: QueryClient) => {
	const now = Date.now();
	const queries = queryClient
		.getQueryCache()
		.findAll({ queryKey: getContactsMapOverlayBaseKey() });

	const liveHashes = new Set<string>();
	const groups = new Map<string, typeof queries>();
	for (const query of queries) {
		liveHashes.add(query.queryHash);
		if (query.getObserversCount() > 0) {
			// Rendered right now (or held by a mounted hook) — never evict.
			mapOverlayLastActiveAt.set(query.queryHash, now);
			continue;
		}
		// Never cancel an in-flight fetch.
		if (query.state.fetchStatus !== 'idle') continue;
		const filters = query.queryKey[query.queryKey.length - 1] as
			| ContactsMapOverlayFilters
			| undefined;
		if (!filters) continue;
		const groupKey = `${filters.mode ?? 'booking'}|${filters.phase ?? ''}`;
		const group = groups.get(groupKey) ?? [];
		group.push(query);
		groups.set(groupKey, group);
	}
	// Don't let the recency map itself outlive the cache entries it describes.
	for (const hash of mapOverlayLastActiveAt.keys()) {
		if (!liveHashes.has(hash)) mapOverlayLastActiveAt.delete(hash);
	}

	const evictHashes = new Set<string>();
	for (const group of groups.values()) {
		if (group.length <= MAP_OVERLAY_LRU_KEEP_PER_GROUP) continue;
		const lastUsed = (q: (typeof group)[number]) =>
			Math.max(q.state.dataUpdatedAt, mapOverlayLastActiveAt.get(q.queryHash) ?? 0);
		group.sort((a, b) => lastUsed(b) - lastUsed(a));
		for (const query of group.slice(MAP_OVERLAY_LRU_KEEP_PER_GROUP)) {
			if (now - lastUsed(query) < MAP_OVERLAY_LRU_MIN_AGE_MS) continue;
			evictHashes.add(query.queryHash);
		}
	}
	if (evictHashes.size > 0) {
		queryClient.removeQueries({ predicate: (q) => evictHashes.has(q.queryHash) });
		for (const hash of evictHashes) mapOverlayLastActiveAt.delete(hash);
	}

	// Keep the research-seed store in lockstep with the windows that survive: any
	// contact still renderable from a retained window keeps its seed; the rest die
	// with their windows (also catches windows the 5-min gcTime removed quietly).
	const retainedIds = new Set<number>();
	for (const query of queries) {
		if (evictHashes.has(query.queryHash)) continue;
		const data = query.state.data as ContactWithName[] | undefined;
		if (!Array.isArray(data)) continue;
		for (const row of data) retainedIds.add(row.id);
	}
	retainContactResearchSeeds(retainedIds);
};

// Backfills the research-detail fields for a single contact when a hovered map-overlay
// row arrived without them (slim payload — see api/contacts/map-overlay).
export const useGetContactResearch = (contactId: number | null) => {
	return useQuery<GetContactResearchData>({
		queryKey: [...QUERY_KEYS.detail(contactId ?? 'none'), 'research'],
		queryFn: async ({ signal }) => {
			const response = await _fetch(
				urls.api.contacts.research(contactId!),
				undefined,
				undefined,
				{ signal }
			);
			if (!response.ok) {
				const errorMessage = await readResponseErrorMessage(
					response,
					'Failed to fetch contact research'
				);
				throw new Error(errorMessage);
			}
			return response.json() as Promise<GetContactResearchData>;
		},
		enabled: contactId != null,
		// Slimmed overlay rows seed this query synchronously, so consumers render
		// success-with-data on first paint (no fetch, no "Researching…" flash) —
		// matching what the inline fields used to provide. With refetchOnMount
		// false, seeded data is pinned exactly like the inline fields were.
		initialData: () =>
			contactId != null ? (getContactResearchSeed(contactId)?.data ?? undefined) : undefined,
		initialDataUpdatedAt: () =>
			contactId != null ? getContactResearchSeed(contactId)?.ts : undefined,
		refetchOnMount: false,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
		retry: false,
		staleTime: 1000 * 60 * 30, // research metadata rarely changes
		gcTime: 1000 * 60 * 30,
	});
};

// Map-overlay rows can arrive without the research-detail fields (slim payload — see
// api/contacts/map-overlay). When a hovered contact is missing them entirely (key absent;
// null means fetched-but-empty), lazily fetch and merge them so the hover research panel
// fills in instead of rendering blank.
export const useContactWithResearch = (contact: ContactWithName | null) => {
	// Cast for the `in` check: ContactWithName declares `metadata`, so TS would
	// otherwise narrow the no-key branch (a slim overlay row) to `never`.
	const needsResearch =
		contact != null && !('metadata' in (contact as Record<string, unknown>));
	const { data: research } = useGetContactResearch(
		contact && needsResearch ? contact.id : null
	);
	return useMemo(() => {
		if (!contact) return null;
		if (!research || research.id !== contact.id) return contact;
		if (hasContactResearchSeed(contact.id)) {
			// This row arrived as a fat overlay row (slimmed into the seed store).
			// The inline path never carried companyKeywords, so a real cached
			// research entry (e.g. from an earlier ambient-dot hover of the same
			// contact) must not surface a keywords band that today's inline rows
			// never show on this surface.
			const researchRest: Partial<typeof research> = { ...research };
			delete researchRest.companyKeywords;
			return { ...contact, ...researchRest };
		}
		return { ...contact, ...research };
	}, [contact, research]);
};

export interface CuratedSearchResult {
	categoryBreakdown: Record<string, number>;
	center: { lat: number; lon: number } | null;
	radiusKm: number | null;
	city: string | null;
	region: string | null;
	contacts: ContactWithName[];
}

export interface CuratedSearchVariables {
	lat?: number | null;
	lon?: number | null;
	radiusKm?: number | null;
	category?: string | null;
	area?: string | null;
	state?: string | null;
	limit?: number;
	// Caller-supplied signal: lets the dashboard cancel an in-flight curated
	// search when the user fires another one. Without this, rapid-fire searches
	// stack on the server and contend on ES, making everything slow.
	signal?: AbortSignal;
}

// Exported so non-mutation callers (e.g. the campaign page's Search-tab speculative
// prefetch) can run the exact same fetch the mutation below runs.
export const fetchCuratedSearch = async (
	vars: CuratedSearchVariables = {}
): Promise<CuratedSearchResult> => {
	const params: Record<string, string> = {};
	if (typeof vars.lat === 'number' && Number.isFinite(vars.lat)) {
		params.lat = String(vars.lat);
	}
	if (typeof vars.lon === 'number' && Number.isFinite(vars.lon)) {
		params.lon = String(vars.lon);
	}
	if (typeof vars.radiusKm === 'number' && Number.isFinite(vars.radiusKm)) {
		params.radiusKm = String(vars.radiusKm);
	}
	if (vars.category) params.category = vars.category;
	if (vars.area) params.area = vars.area.slice(0, 120);
	if (vars.state) params.state = vars.state;
	if (typeof vars.limit === 'number') params.limit = String(vars.limit);
	const url = appendQueryParamsToUrl(
		urls.api.contacts.curatedSearch.index,
		params
	);
	// The route's maxDuration is 60s; let the server own the deadline.
	const response = await _fetch(url, undefined, undefined, {
		timeout: CONTACT_SEARCH_TIMEOUT_MS,
		signal: vars.signal,
	});
	if (!response.ok) {
		const errorMessage = await readResponseErrorMessage(
			response,
			'Failed to fetch curated picks',
			CONTACT_SEARCH_TIMEOUT_MS
		);
		throw new Error(errorMessage);
	}
	return response.json() as Promise<CuratedSearchResult>;
};

export const useCuratedContactsSearch = (options: CustomMutationOptions = {}) => {
	const { suppressToasts = true, onSuccess: onSuccessCallback } = options;

	return useMutation({
		mutationFn: fetchCuratedSearch,
		onSuccess: (data) => {
			onSuccessCallback?.();
			if (!suppressToasts) {
				toast.success(`Showing ${data.contacts.length} curated picks`);
			}
		},
		onError: (error) => {
			if (!suppressToasts) {
				toast.error(error.message || 'Failed to fetch curated picks');
			}
		},
	});
};

export interface FreeTextSearchResult {
	query: string;
	parsed: {
		categories: string[];
		city: string | null;
		state: string | null;
		country: string | null;
		restOfQuery: string;
	};
	center: { lat: number; lon: number } | null;
	radiusKm: number | null;
	retrieverBreakdown: Record<string, number>;
	cleanlinessBreakdown: Record<string, number>;
	contacts: ContactWithName[];
}

export interface FreeTextSearchVariables {
	q: string;
	lat?: number | null;
	lon?: number | null;
	radiusKm?: number | null;
	/** Radius-search mode: makes lat/lon/radiusKm a hard geographic filter server-side. */
	strictRadius?: boolean;
	/** Keyword-search mode: direct field matching instead of semantic/category search. */
	keywordMode?: boolean;
	/** Profile mode: raw genre, server tokenizes it into a soft ranking multiplier. */
	profileGenre?: string | null;
	/** Profile mode: genre + bio keywords appended to the embedding text only. */
	profileEmbedText?: string | null;
	/** Profile mode: raw area string, server geocodes it as a soft location anchor. */
	profileArea?: string | null;
	limit?: number;
	// Caller-supplied signal: see CuratedSearchVariables.signal.
	signal?: AbortSignal;
}

export const useFreeTextContactsSearch = (options: CustomMutationOptions = {}) => {
	const { suppressToasts = true, onSuccess: onSuccessCallback } = options;

	return useMutation({
		mutationFn: async (vars: FreeTextSearchVariables): Promise<FreeTextSearchResult> => {
			const params: Record<string, string> = { q: vars.q };
			if (typeof vars.lat === 'number' && Number.isFinite(vars.lat)) {
				params.lat = String(vars.lat);
			}
			if (typeof vars.lon === 'number' && Number.isFinite(vars.lon)) {
				params.lon = String(vars.lon);
			}
			if (typeof vars.radiusKm === 'number' && Number.isFinite(vars.radiusKm)) {
				params.radiusKm = String(vars.radiusKm);
			}
			if (vars.strictRadius) params.strictRadius = '1';
			if (vars.keywordMode) params.keywordMode = '1';
			if (vars.profileGenre) params.profileGenre = vars.profileGenre.slice(0, 120);
			if (vars.profileEmbedText)
				params.profileEmbedText = vars.profileEmbedText.slice(0, 200);
			if (vars.profileArea) params.profileArea = vars.profileArea.slice(0, 120);
			if (typeof vars.limit === 'number') params.limit = String(vars.limit);
			const url = appendQueryParamsToUrl(urls.api.contacts.search.index, params);
			const response = await _fetch(url, undefined, undefined, {
				timeout: CONTACT_SEARCH_TIMEOUT_MS,
				signal: vars.signal,
			});
			if (!response.ok) {
				const errorMessage = await readResponseErrorMessage(
					response,
					'Failed to run search',
					CONTACT_SEARCH_TIMEOUT_MS
				);
				throw new Error(errorMessage);
			}
			return response.json() as Promise<FreeTextSearchResult>;
		},
		onSuccess: (data) => {
			onSuccessCallback?.();
			if (!suppressToasts) {
				toast.success(`Found ${data.contacts.length} matches`);
			}
		},
		onError: (error) => {
			if (!suppressToasts) {
				toast.error(error.message || 'Failed to run search');
			}
		},
	});
};

export interface GeocodeContactsResult {
	message: string;
	processed: number;
	success: number;
	failed: number;
	geocoded: { id: number; latitude: number; longitude: number }[];
	errors: { id: number; error: string }[];
}

export const useGeocodeContacts = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = true,
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (contactIds: number[]): Promise<GeocodeContactsResult> => {
			const response = await _fetch(urls.api.contacts.geocode.index, 'POST', {
				contactIds,
				limit: contactIds.length,
			});
			if (!response.ok) {
				let errorMessage = 'Failed to geocode contacts';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}

			return response.json();
		},
		onSuccess: (data) => {
			// Invalidate contacts query to refresh with new coordinates
			if (data.success > 0) {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
			}
			if (!suppressToasts && data.success > 0) {
				toast.success(`Geocoded ${data.success} contacts`);
			}
			onSuccessCallback?.();
		},
		onError: (error) => {
			if (!suppressToasts) {
				toast.error(error.message || 'Failed to geocode contacts');
			}
		},
	});
};
