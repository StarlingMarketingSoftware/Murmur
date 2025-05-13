import { PatchCampaignData } from '@/app/api/campaigns/[id]/route';
import { PostCampaignData } from '@/app/api/campaigns/route';
import { _fetch } from '@/app/utils/api';
import { CampaignWithRelations, CustomMutationOptions } from '@/constants/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const QUERY_KEYS = {
	all: ['campaigns'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

interface EditCampaignData {
	id: string | number;
	data: PatchCampaignData;
}

export const useGetCampaigns = () => {
	return useQuery({
		queryKey: QUERY_KEYS.list(),
		queryFn: async () => {
			const response = await _fetch('/api/campaigns');
			if (!response.ok) {
				throw new Error('Failed to fetch campaigns');
			}
			return response.json();
		},
	});
};

export const useGetCampaign = (id: string) => {
	return useQuery<CampaignWithRelations>({
		queryKey: QUERY_KEYS.detail(id),
		queryFn: async () => {
			const response = await _fetch(`/api/campaigns/${id}`);
			if (!response.ok) {
				throw new Error('Failed to fetch campaign');
			}
			return response.json();
		},
		enabled: !!id,
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
			const response = await _fetch('/api/campaigns', 'POST', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create campaign');
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
			const response = await _fetch(`/api/campaigns/${id}`, 'PATCH', data);
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
