import type { InboundEmailFilterData } from '@/app/api/inbound/route';
import type { PatchInboundEmailData } from '@/app/api/inbound/[id]/route';
import { _fetch } from '@/utils';
import { appendQueryParamsToUrl } from '@/utils';
import { CustomMutationOptions, CustomQueryOptions, InboundEmailWithRelations } from '@/types';
import { urls } from '@/constants/urls';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

export const useGetInboundEmails = (options: InboundEmailQueryOptions = {}) => {
	return useQuery({
		queryKey: [...INBOUND_EMAIL_QUERY_KEYS.list(), options.filters],
		queryFn: async () => {
			const url = appendQueryParamsToUrl(urls.api.inboundEmails.index, options.filters);
			const response = await _fetch(url);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to fetch inbound emails');
			}

			return response.json() as Promise<InboundEmailWithRelations[]>;
		},
		enabled: options.enabled,
	});
};

export const useAssignInboundEmailToCampaign = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Email assigned to campaign',
		errorMessage = 'Failed to assign email to campaign',
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
