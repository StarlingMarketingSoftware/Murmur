import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { CampaignWithRelations } from '@/types';
import { EmailStatus } from '@prisma/client';
import { useState } from 'react';

export interface PrepareSendingSectionProps {
	campaign: CampaignWithRelations;
}

export const usePrepareSendingSection = (props: PrepareSendingSectionProps) => {
	const { campaign } = props;
	const [sendingProgress, setSendingProgress] = useState(-1);

	const { data: emails, isPending: isPendingEmails } = useGetEmails({
		filters: {
			campaignId: campaign.id,
		},
	});

	const draftEmails = emails?.filter((email) => email.status === EmailStatus.draft) || [];
	const sentEmails = emails?.filter((email) => email.status === EmailStatus.sent) || [];

	return {
		...props,
		draftEmails,
		sendingProgress,
		setSendingProgress,
		isPendingEmails,
		sentEmails,
	};
};
