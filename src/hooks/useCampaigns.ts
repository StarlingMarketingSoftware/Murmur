import { CampaignWithRelations } from '@/constants/types';
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

export const useEditCampaign = (
	campaignId: number,
	suppressToasts?: boolean,
	successMessage?: string,
	errorMessage?: string
) => {
	const queryClient = useQueryClient();
	const { mutateAsync: updateCampaign, isPending: isPendingCampaign } = useMutation({
		mutationFn: async (campaignData: Partial<CampaignWithRelations>) => {
			const response = await fetch(`/api/campaigns/${campaignId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(campaignData),
			});

			if (!response.ok) {
				toast.error('Failed to save campaign');
				throw new Error('Failed to save campaign');
			}
			queryClient.invalidateQueries({ queryKey: ['campaign'] });
			return response.json();
		},
		onSuccess: () => {
			if (suppressToasts) return;
			toast.success(successMessage || 'Campaign updated successfully');
		},
		onError: (error) => {
			if (suppressToasts) return;
			if (error instanceof Error) {
				toast.error(errorMessage || 'Failed to update campaign. Please try again.');
			}
		},
	});

	return {
		updateCampaign,
		isPendingCampaign,
	};
};

interface CampaignMutationOptions {
	suppressToasts?: boolean;
	successMessage?: string;
	errorMessage?: string;
	onSuccess?: () => void;
}

export const useDeleteCampaign = (options: CampaignMutationOptions = {}) => {
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
