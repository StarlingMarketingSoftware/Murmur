import { CreateCampaignBody } from '@/app/api/campaigns/route';
import { CampaignWithRelations, CustomMutationOptions } from '@/constants/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useGetCampaigns = () => {
	return useQuery({
		queryKey: ['campaigns'],
		queryFn: async () => {
			const response = await fetch('/api/campaigns');
			if (!response.ok) {
				throw new Error('Failed to fetch campaigns');
			}
			return response.json();
		},
	});
};

interface EditCampaignData {
	campaignId: number;
	data: Partial<CampaignWithRelations>;
}

export const useEditCampaign = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Campaign updated successfully',
		errorMessage = 'Failed to update campaign',
		onSuccess: onSuccessCallback,
	} = options;

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ data, campaignId }: EditCampaignData) => {
			const response = await fetch(`/api/campaigns/${campaignId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update campaign');
			}

			return response.json();
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			queryClient.invalidateQueries({ queryKey: ['campaigns'] });
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
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
		mutationFn: async (data: CreateCampaignBody) => {
			const response = await fetch('/api/campaigns', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create campaign');
			}

			return response.json();
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			queryClient.invalidateQueries({ queryKey: ['campaigns'] });
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
		mutationFn: async (campaignId: number) => {
			const response = await fetch(`/api/campaigns/${campaignId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete campaign');
			}

			return response.json();
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			queryClient.invalidateQueries({ queryKey: ['campaigns'] });
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};
