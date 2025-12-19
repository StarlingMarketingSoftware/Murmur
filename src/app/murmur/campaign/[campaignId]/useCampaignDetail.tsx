import { useGetCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useParams } from 'next/navigation';
import { useState } from 'react';

export const useCampaignDetail = () => {
	const params = useParams();
	const [isIdentityDialogOpen, setIsIdentityDialogOpen] = useState(false);

	const campaignId = params.campaignId as string;

	const { data: campaign, isPending: isPendingCampaign } = useGetCampaign(campaignId);

	return {
		campaign,
		isPendingCampaign,
		isIdentityDialogOpen,
		setIsIdentityDialogOpen,
	};
};
