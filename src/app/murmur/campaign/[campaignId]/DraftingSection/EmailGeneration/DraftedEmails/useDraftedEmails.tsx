import { useDeleteEmail } from '@/hooks/queryHooks/useEmails';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';

export interface DraftedEmailsProps {
	contacts: ContactWithName[];
	draftEmails: EmailWithRelations[];
	isPendingEmails: boolean;
}

export const useDraftedEmails = (props: DraftedEmailsProps) => {
	const { draftEmails, isPendingEmails, contacts } = props;

	const { mutateAsync: deleteEmail, isPending: isPendingDeleteEmail } = useDeleteEmail();

	const handleDeleteDraft = async (e: React.MouseEvent, draftId: number) => {
		e.stopPropagation();
		e.preventDefault();
		await deleteEmail(draftId);
	};

	return {
		draftEmails,
		isPendingEmails,
		isPendingDeleteEmail,
		deleteEmail,
		handleDeleteDraft,
		contacts,
	};
};
