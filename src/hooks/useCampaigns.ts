import { CampaignWithRelations } from '@/constants/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useCampaigns = () => {
	const {
		data,
		isPending,
		mutate: fetchContacts,
	} = useMutation({
		mutationFn: async (campaign: { name: string }) => {
			const response = await fetch('/api/campaigns', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ campaign }),
			});
			if (!response.ok) {
				toast.error('Failed to create campaign. Please try again.');
				throw new Error('Network response was not ok');
			}
			return response.json();
		},
	});

	return { data, isPending, fetchContacts };
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
