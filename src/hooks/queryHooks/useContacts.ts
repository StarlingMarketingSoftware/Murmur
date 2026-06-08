import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CustomMutationOptions, CustomQueryOptions } from '@/types';
import { toast } from 'sonner';
import { ContactFilterData, PostContactData } from '@/app/api/contacts/route';
import { appendQueryParamsToUrl } from '@/utils';
import { PostBatchContactData } from '@/app/api/contacts/batch/route';
import { PatchContactData } from '@/app/api/contacts/[id]/route';
import { PostBulkUpdateContactData } from '@/app/api/contacts/bulk-update/route';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { ContactWithName } from '@/types/contact';

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

export const useGetLocations = (query: string, mode?: 'state' | 'state-first') => {
	const isStateOnly = mode === 'state';

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
		enabled: isStateOnly || query.length >= 1,
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

			return response.json() as Promise<ContactWithName[]>;
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
		gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
	});
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
	state?: string | null;
	limit?: number;
	// Caller-supplied signal: lets the dashboard cancel an in-flight curated
	// search when the user fires another one. Without this, rapid-fire searches
	// stack on the server and contend on ES, making everything slow.
	signal?: AbortSignal;
}

export const useCuratedContactsSearch = (options: CustomMutationOptions = {}) => {
	const { suppressToasts = true, onSuccess: onSuccessCallback } = options;

	return useMutation({
		mutationFn: async (vars: CuratedSearchVariables = {}): Promise<CuratedSearchResult> => {
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
		},
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
