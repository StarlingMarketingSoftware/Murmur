import { useDeleteEmail } from '@/hooks/queryHooks/useEmails';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';
import { Dispatch, SetStateAction } from 'react';

export interface DraftedEmailsProps {
	contacts: ContactWithName[];
	setSelectedDraft: Dispatch<SetStateAction<EmailWithRelations | null>>;
	setIsDraftDialogOpen: Dispatch<SetStateAction<boolean>>;
	draftEmails: EmailWithRelations[];
	isPendingEmails: boolean;
}

export const useDraftedEmails = (props: DraftedEmailsProps) => {
	const {
		draftEmails,
		isPendingEmails,
		setSelectedDraft,
		setIsDraftDialogOpen,
		contacts,
	} = props;

	const { mutateAsync: deleteEmail, isPending: isPendingDeleteEmail } = useDeleteEmail();

	const handleDraftClick = (draft: EmailWithRelations) => {
		setSelectedDraft(draft);
		setIsDraftDialogOpen(true);
	};

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
		handleDraftClick,
		handleDeleteDraft,
		contacts,
	};
};
