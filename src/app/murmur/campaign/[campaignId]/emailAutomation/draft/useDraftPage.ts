import { CampaignWithRelations } from '@/types';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus } from '@prisma/client';

export interface DraftsPageProps {
	campaign: CampaignWithRelations;
}

export const useDraftPage = (props: DraftsPageProps) => {
	const { campaign } = props;
	const campaignId = campaign.id;

	const { data, isPending } = useGetEmails({
		filters: {
			campaignId,
		},
	});

	const draftEmails = data?.filter((email) => email.status === EmailStatus.draft) || [];

	return {
		...props,
		draftEmails,
		isPending,
	};
};
