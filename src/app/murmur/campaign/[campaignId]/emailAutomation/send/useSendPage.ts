import { CampaignWithRelations } from '@/constants/types';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';

export interface SendPageProps {
	campaign: CampaignWithRelations;
}

export const useSendPage = (props: SendPageProps) => {
	const { campaign } = props;
	const campaignId = campaign.id;
	const { data: dataEmails, isPending: isPendingEmails } = useGetEmails({
		filters: {
			campaignId,
		},
	});

	return {
		dataEmails,
		campaign,
		isPendingEmails,
	};
};
