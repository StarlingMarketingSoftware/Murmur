import { CampaignWithRelations, EmailWithRelations } from '@/constants/types';
import { useQuery } from '@tanstack/react-query';

export interface SendPageProps {
	campaign: CampaignWithRelations;
}

export const useSendPage = (props: SendPageProps) => {
	const { campaign } = props;
	const campaignId = campaign.id;
	const { data: dataEmails, isPending: isPendingEmails } = useQuery({
		queryKey: ['drafts', campaignId],
		queryFn: async (): Promise<EmailWithRelations[]> => {
			const response = await fetch(`/api/emails?campaignId=${campaignId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch drafts');
			}
			return response.json();
		},
		enabled: !!campaignId,
	});

	return {
		dataEmails,
		campaign,
		isPendingEmails,
	};
};
