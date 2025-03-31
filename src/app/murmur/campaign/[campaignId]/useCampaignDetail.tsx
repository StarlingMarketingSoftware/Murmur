import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

export const useCampaignDetail = () => {
	const params = useParams();
	const campaignId = params.campaignId;
	console.log('🚀 ~ useCampaignDetail ~ campaignId:', campaignId);

	const { data, isPending, error } = useQuery({
		queryKey: ['campaign', campaignId],
		queryFn: async () => {
			const response = await fetch(`/api/campaigns/${campaignId}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		},
	});

	return {
		data,
		isPending,
	};
};
