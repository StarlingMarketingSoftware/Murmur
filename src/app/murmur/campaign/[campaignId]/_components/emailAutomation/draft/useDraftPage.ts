import { CampaignWithRelations, EmailWithRelations } from '@/constants/types';
import { useQuery } from '@tanstack/react-query';

export interface DraftsPageProps {
	campaign: CampaignWithRelations;
}

export const useDraftPage = (props: DraftsPageProps) => {
	const { campaign } = props;
	const campaignId = campaign.id;

	const { data, isPending } = useQuery({
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

	const draftEmails = data?.filter((email) => email.status === 'draft') || [];

	return {
		...props,
		draftEmails,
		isPending,
	};
};
