import type { InboundEmailFilterData } from '@/app/api/inbound/route';
import type { PatchInboundEmailData } from '@/app/api/inbound/[id]/route';
import { _fetch } from '@/utils';
import { appendQueryParamsToUrl } from '@/utils';
import { CustomMutationOptions, CustomQueryOptions, InboundEmailWithRelations } from '@/types';
import { urls } from '@/constants/urls';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Phase 1: poll so newly-received replies (Mailgun inbound + venue messages projected
// into this feed) appear without a manual refresh. Phase 2 flips NEXT_PUBLIC_USE_REALTIME
// and a Pusher subscription replaces polling — matching useConversations.
const REALTIME_ENABLED = process.env.NEXT_PUBLIC_USE_REALTIME === 'true';
const INBOUND_REFETCH_INTERVAL_MS = 15_000;

export const INBOUND_EMAIL_QUERY_KEYS = {
	all: ['inboundEmails'] as const,
	list: () => [...INBOUND_EMAIL_QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) =>
		[...INBOUND_EMAIL_QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export interface InboundEmailQueryOptions extends CustomQueryOptions {
	filters?: InboundEmailFilterData;
}

interface AssignInboundEmailToCampaignData {
	id: string | number;
	data?: PatchInboundEmailData;
}

// Exported so callers (e.g. dashboard hover prefetch) can warm the exact same
// React Query cache entry that useGetInboundEmails reads — same key, same fetcher.
export const getInboundEmailsListQueryKey = (filters?: InboundEmailFilterData) =>
	[...INBOUND_EMAIL_QUERY_KEYS.list(), filters] as const;

export const fetchInboundEmailsList = async (
	filters?: InboundEmailFilterData
): Promise<InboundEmailWithRelations[]> => {
	const url = appendQueryParamsToUrl(urls.api.inboundEmails.index, filters);
	const response = await _fetch(url);

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || 'Failed to fetch inbound emails');
	}

	return response.json() as Promise<InboundEmailWithRelations[]>;
};

export const useGetInboundEmails = (options: InboundEmailQueryOptions = {}) => {
	return useQuery({
		queryKey: getInboundEmailsListQueryKey(options.filters),
		queryFn: () => fetchInboundEmailsList(options.filters),
		enabled: options.enabled,
		refetchInterval: REALTIME_ENABLED ? false : INBOUND_REFETCH_INTERVAL_MS,
	});
};

export const useAssignInboundEmailToCampaign = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Message assigned to campaign',
		errorMessage = 'Failed to assign message to campaign',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, data }: AssignInboundEmailToCampaignData) => {
			const response = await _fetch(urls.api.inboundEmails.detail(id), 'PATCH', data ?? {});
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || errorMessage);
			}

			return response.json() as Promise<InboundEmailWithRelations>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: INBOUND_EMAIL_QUERY_KEYS.all });
			queryClient.invalidateQueries({ queryKey: ['campaigns'] });
			queryClient.invalidateQueries({ queryKey: ['contacts'] });
			queryClient.invalidateQueries({ queryKey: ['userContactLists'] });
			onSuccessCallback?.();
			if (!suppressToasts) {
				toast.success(successMessage);
			}
		},
		onError: (error) => {
			if (!suppressToasts) {
				toast.error(error instanceof Error ? error.message : errorMessage);
			}
		},
	});
};
