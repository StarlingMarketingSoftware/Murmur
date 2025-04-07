import { CampaignWithRelations, EmailWithRelations } from '@/constants/types';

export interface PrepareSendingTableProps {
	campaign: CampaignWithRelations;
	emails: EmailWithRelations[];
	isPending: boolean;
}

export const usePrepareSendingTable = (props: PrepareSendingTableProps) => {
	const { emails } = props;
	const draftEmails = emails.filter((email) => email.status === 'draft');

	return {
		...props,
		draftEmails,
	};
};
