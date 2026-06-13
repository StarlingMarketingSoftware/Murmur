import { PatchCampaignData } from '@/app/api/campaigns/[id]/route';
import { PostCampaignData } from '@/app/api/campaigns/route';
import { _fetch } from '@/utils';
import { CampaignWithRelations, CustomMutationOptions } from '@/types';
import { ContactWithName } from '@/types/contact';
import { urls } from '@/constants/urls';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCreateUserContactList } from '@/hooks/queryHooks/useUserContactLists';

export type CampaignApiErrorCode = 'CAMPAIGN_CAP_REACHED' | string;

export class CampaignApiError extends Error {
	code?: CampaignApiErrorCode;
	status?: number;
	constructor(message: string, code?: CampaignApiErrorCode, status?: number) {
		super(message);
		this.name = 'CampaignApiError';
		this.code = code;
		this.status = status;
	}
}

const QUERY_KEYS = {
	all: ['campaigns'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

const CONTACT_EVENTS_QUERY_KEY = (id: string | number) =>
	[...QUERY_KEYS.detail(id), 'contact-events'] as const;

const CONTACTS_QUERY_KEY = (id: string | number) =>
	[...QUERY_KEYS.detail(id), 'contacts'] as const;

interface EditCampaignData {
	id: string | number;
	data: PatchCampaignData;
}

export interface CampaignContactEventDto {
	id: number;
	campaignId: number;
	createdAt: string;
	addedCount: number;
	totalContacts: number;
	source: string | null;
	metadata: unknown | null;
}

// Exported so callers (e.g. the dashboard's ensureActiveCampaign) can read/await the
// exact same React Query cache entry that useGetCampaigns populates — same key, same
// fetcher. The list is the authority on which campaigns are active (the API filters
// out soft-deleted ones).
export const getCampaignsListQueryKey = () => QUERY_KEYS.list();

export const fetchCampaignsList = async () => {
	const response = await _fetch(urls.api.campaigns.index);
	if (!response.ok) {
		throw new Error('Failed to fetch campaigns');
	}
	return response.json();
};

export const useGetCampaigns = () => {
	return useQuery({
		queryKey: getCampaignsListQueryKey(),
		queryFn: fetchCampaignsList,
	});
};

// Exported so callers (e.g. dashboard hover prefetch) can warm the exact same
// React Query cache entry that useGetCampaign reads — same key, same fetcher.
export const getCampaignDetailQueryKey = (id: string | number) => QUERY_KEYS.detail(id);

export const fetchCampaignDetail = async (
	id: string | number
): Promise<CampaignWithRelations> => {
	const response = await _fetch(urls.api.campaigns.detail(id));
	if (!response.ok) {
		throw new Error('Failed to fetch campaign');
	}
	return response.json();
};

export const useGetCampaign = (id: string) => {
	return useQuery<CampaignWithRelations>({
		queryKey: getCampaignDetailQueryKey(id),
		queryFn: () => fetchCampaignDetail(id),
		enabled: !!id,
	});
};

export const useGetCampaignContactEvents = (
	campaignId?: string | number,
	options: { enabled?: boolean } = {}
) => {
	const enabled = (options.enabled ?? true) && Boolean(campaignId);
	return useQuery<CampaignContactEventDto[]>({
		queryKey: CONTACT_EVENTS_QUERY_KEY(String(campaignId || '')),
		queryFn: async () => {
			const response = await _fetch(
				urls.api.campaigns.contactEvents.index(campaignId as string | number)
			);
			if (!response.ok) {
				throw new Error('Failed to fetch campaign contact events');
			}
			return response.json();
		},
		enabled,
		staleTime: 1000 * 30,
	});
};

export const useGetCampaignContacts = (
	campaignId?: string | number,
	options: { enabled?: boolean } = {}
) => {
	const enabled = (options.enabled ?? true) && Boolean(campaignId);
	return useQuery<ContactWithName[]>({
		queryKey: CONTACTS_QUERY_KEY(String(campaignId || '')),
		queryFn: async () => {
			const response = await _fetch(
				urls.api.campaigns.contacts.index(campaignId as string | number)
			);
			if (!response.ok) {
				throw new Error('Failed to fetch campaign contacts');
			}
			return response.json();
		},
		enabled,
		// 5 min, matching the other campaign queries: avoids refetching contacts on quick
		// dashboard<->campaign round-trips. Add-contacts mutations invalidate this key, which
		// forces a refetch regardless of staleTime, so freshness after edits is preserved.
		staleTime: 1000 * 60 * 5,
	});
};

export const useCreateCampaign = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Campaign created successfully',
		errorMessage = 'Failed to create campaign',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostCampaignData) => {
			const response = await _fetch(urls.api.campaigns.index, 'POST', data);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const code =
					typeof errorData?.error === 'string' ? errorData.error : undefined;
				const message =
					typeof errorData?.message === 'string'
						? errorData.message
						: code || 'Failed to create campaign';
				throw new CampaignApiError(message, code, response.status);
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

export const useEditCampaign = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Campaign updated successfully',
		errorMessage = 'Failed to update campaign',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ data, id }: EditCampaignData) => {
			const response = await _fetch(urls.api.campaigns.detail(id), 'PATCH', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update campaign');
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

export const ACTIVE_CAMPAIGN_STORAGE_KEY = 'murmur_active_campaign_v1';

type ActiveCampaignStorage = { v: 1; ts: number; id: number };

const readActiveCampaignStorage = (): number | null => {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.localStorage.getItem(ACTIVE_CAMPAIGN_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<ActiveCampaignStorage>;
		if (parsed?.v !== 1) return null;
		if (typeof parsed.id !== 'number') return null;
		return parsed.id;
	} catch {
		return null;
	}
};

const writeActiveCampaignStorage = (id: number | null): void => {
	if (typeof window === 'undefined') return;
	try {
		if (id == null) {
			window.localStorage.removeItem(ACTIVE_CAMPAIGN_STORAGE_KEY);
			return;
		}
		const payload: ActiveCampaignStorage = { v: 1, ts: Date.now(), id };
		window.localStorage.setItem(
			ACTIVE_CAMPAIGN_STORAGE_KEY,
			JSON.stringify(payload)
		);
	} catch {
		// Quota exceeded or storage disabled — non-fatal.
	}
};

export type CampaignListItem = { id: number; updatedAt: string | Date; name?: string };

export interface UseActiveCampaignResult {
	activeCampaignId: number | null;
	activeCampaign: CampaignWithRelations | null;
	isResolving: boolean;
	setActiveCampaignId: (id: number | null) => void;
}

export const useActiveCampaign = (): UseActiveCampaignResult => {
	const { data: campaigns, isLoading: isLoadingList } = useGetCampaigns();
	const [storedId, setStoredId] = useState<number | null>(() =>
		readActiveCampaignStorage()
	);

	const resolvedId = useMemo<number | null>(() => {
		if (!campaigns) return storedId;
		const list = campaigns as CampaignListItem[];
		if (storedId && list.some((c) => c.id === storedId)) return storedId;
		if (list.length === 0) return null;
		const mostRecent = [...list].sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
		)[0];
		return mostRecent?.id ?? null;
	}, [campaigns, storedId]);

	useEffect(() => {
		if (resolvedId !== storedId) {
			writeActiveCampaignStorage(resolvedId);
			setStoredId(resolvedId);
		}
	}, [resolvedId, storedId]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const onStorage = (e: StorageEvent) => {
			if (e.key !== ACTIVE_CAMPAIGN_STORAGE_KEY) return;
			setStoredId(readActiveCampaignStorage());
		};
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	}, []);

	const setActiveCampaignId = useCallback((id: number | null) => {
		writeActiveCampaignStorage(id);
		setStoredId(id);
	}, []);

	const { data: activeCampaign } = useGetCampaign(
		resolvedId != null ? String(resolvedId) : ''
	);

	const { mutateAsync: createUserContactList } = useCreateUserContactList({
		suppressToasts: true,
	});
	const { mutateAsync: editCampaign } = useEditCampaign({ suppressToasts: true });
	const backfillInFlightForId = useRef<number | null>(null);

	useEffect(() => {
		if (!activeCampaign) return;
		if (activeCampaign.id !== resolvedId) return;
		// The detail endpoint doesn't filter soft-deleted campaigns, so a stale
		// stored id can resolve to one before the list loads — only backfill ids
		// the active list vouches for.
		const list = campaigns as CampaignListItem[] | undefined;
		if (!list?.some((c) => c.id === activeCampaign.id)) return;
		const ucls = activeCampaign.userContactLists ?? [];
		if (ucls.length > 0) return;
		if (backfillInFlightForId.current === activeCampaign.id) return;
		backfillInFlightForId.current = activeCampaign.id;
		(async () => {
			try {
				const newUcl = await createUserContactList({
					name: activeCampaign.name,
					contactIds: [],
				});
				await editCampaign({
					id: activeCampaign.id,
					data: {
						userContactListOperation: {
							action: 'connect',
							userContactListIds: [newUcl.id],
						},
					},
				});
			} catch {
				// Best-effort: a failed backfill leaves the campaign without a UCL,
				// and the next add-contacts attempt will surface the existing
				// "Campaign has no contact list" toast.
			} finally {
				backfillInFlightForId.current = null;
			}
		})();
	}, [activeCampaign, resolvedId, campaigns, createUserContactList, editCampaign]);

	const isResolving = isLoadingList && resolvedId == null;

	return {
		activeCampaignId: resolvedId,
		activeCampaign: activeCampaign ?? null,
		isResolving,
		setActiveCampaignId,
	};
};

export const useDeleteCampaign = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Campaign deleted successfully',
		errorMessage = 'Failed to delete campaign',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number) => {
			const response = await _fetch(`/api/campaigns/${id}`, 'DELETE');

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete campaign');
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
