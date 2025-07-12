import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { CampaignWithRelations } from '@/types';
import { EmailStatus } from '@prisma/client';
import { useState } from 'react';

export interface PrepareSendingTableProps {
	campaign: CampaignWithRelations;
}

export const usePrepareSendingTable = (props: PrepareSendingTableProps) => {
	const { campaign } = props;
	const [sendingProgress, setSendingProgress] = useState(-1);

	const { data: emails, isPending: isPendingEmails } = useGetEmails({
		filters: {
			campaignId: campaign.id,
		},
	});

	const draftEmails = emails?.filter((email) => email.status === EmailStatus.draft) || [];
	return {
		...props,
		draftEmails,
		sendingProgress,
		setSendingProgress,
		isPendingEmails,
	};
};
