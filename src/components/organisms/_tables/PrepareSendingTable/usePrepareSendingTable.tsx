import { CampaignWithRelations, EmailWithRelations } from '@/types';
import { useState } from 'react';

export interface PrepareSendingTableProps {
	campaign: CampaignWithRelations;
	emails: EmailWithRelations[];
	isPending: boolean;
}

export const usePrepareSendingTable = (props: PrepareSendingTableProps) => {
	const { emails } = props;
	const draftEmails = emails.filter((email) => email.status === 'draft');
	const [sendingProgress, setSendingProgress] = useState(-1);

	return {
		...props,
		draftEmails,
		sendingProgress,
		setSendingProgress,
	};
};
