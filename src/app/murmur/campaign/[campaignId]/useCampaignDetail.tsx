import { useGetCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export const useCampaignDetail = () => {
	const params = useParams();
	const [isIdentityDialogOpen, setIsIdentityDialogOpen] = useState(false);

	const campaignId = params.campaignId as string;

	const { data: campaign, isPending: isPendingCampaign } = useGetCampaign(campaignId);

	useEffect(() => {
		if (!campaign) {
			return;
		}

		if (!campaign.identityId) {
			setIsIdentityDialogOpen(true);
		}
	}, [campaign]);

	return {
		campaign,
		isPendingCampaign,
		isIdentityDialogOpen,
		setIsIdentityDialogOpen,
	};
};
