import { EmailWithRelations } from '@/types';

export interface SentEmailsTableProps {
	emails: EmailWithRelations[];
	isPending: boolean;
}

export const useSentEmailsTable = (props: SentEmailsTableProps) => {
	const { emails } = props;

	const sentEmails = emails.filter((email) => email.status === 'sent');

	return {
		...props,
		sentEmails,
	};
};
