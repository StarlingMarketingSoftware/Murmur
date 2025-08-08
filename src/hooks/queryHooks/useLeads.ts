import { _fetch, appendQueryParamsToUrl } from '@/utils';
import { CustomMutationOptions, CustomQueryOptions } from '@/types';
import { urls } from '@/constants/urls';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PatchLeadData } from '@/app/api/leads/[id]/route';
import { Lead } from '@prisma/client';
import { LeadFilterData, PostLeadData } from '@/app/api/leads/route';

const QUERY_KEYS = {
	all: ['leads'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export interface LeadQueryOptions extends CustomQueryOptions {
	filters?: LeadFilterData;
}

interface EditLeadData {
	id: string | number;
	data: PatchLeadData;
}

export const useGetLeads = (options: LeadQueryOptions) => {
	return useQuery<Lead[]>({
		queryKey: QUERY_KEYS.list(),
		queryFn: async () => {
			const url = appendQueryParamsToUrl(urls.api.leads.index, options.filters);
			const response = await _fetch(url);
			if (!response.ok) {
				throw new Error('Failed to fetch leads');
			}
			return response.json();
		},
	});
};

export const useCreateLead = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Lead created successfully',
		errorMessage = 'Failed to create lead',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostLeadData) => {
			const response = await _fetch(urls.api.leads.index, 'POST', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create lead');
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

export const useEditLead = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Lead updated successfully',
		errorMessage = 'Failed to update lead',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ data, id }: EditLeadData) => {
			const response = await _fetch(urls.api.leads.detail(id), 'PATCH', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update lead');
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

export const useDeleteLead = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Lead deleted successfully',
		errorMessage = 'Failed to delete lead',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number) => {
			const response = await _fetch(urls.api.leads.detail(id), 'DELETE');

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete lead');
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
