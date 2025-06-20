import { useGetCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export const useCampaignDetail = () => {
	const params = useParams();
	const [isIdentityDialogOpen, setIsIdentityDialogOpen] = useState(false);

	const campaignId = params.campaignId as string;
	const router = useRouter();
	const searchParams = useSearchParams();
	const tab = searchParams.get('tab') ?? 'murmur';

	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(searchParams);
		params.set('tab', value);
		router.push(`/murmur?${params.toString()}`);
	};

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
		tab,
		handleTabChange,
		campaign,
		isPendingCampaign,
		isIdentityDialogOpen,
		setIsIdentityDialogOpen,
	};
};
