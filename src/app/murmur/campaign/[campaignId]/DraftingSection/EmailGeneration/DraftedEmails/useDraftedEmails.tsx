import { useDeleteEmail } from '@/hooks/queryHooks/useEmails';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';
import { Dispatch, SetStateAction } from 'react';

export interface DraftedEmailsProps {
	contacts: ContactWithName[];
	selectedDraftIds: Set<number>;
	setSelectedDraft: Dispatch<SetStateAction<EmailWithRelations | null>>;
	setIsDraftDialogOpen: Dispatch<SetStateAction<boolean>>;
	handleDraftSelection: (draftId: number) => void;
	draftEmails: EmailWithRelations[];
	isPendingEmails: boolean;
	setSelectedDraftIds: Dispatch<SetStateAction<Set<number>>>;
}

export const useDraftedEmails = (props: DraftedEmailsProps) => {
	const {
		draftEmails,
		isPendingEmails,
		setSelectedDraft,
		setIsDraftDialogOpen,
		handleDraftSelection,
		selectedDraftIds,
		setSelectedDraftIds,
		contacts,
	} = props;

	const { mutateAsync: deleteEmail, isPending: isPendingDeleteEmail } = useDeleteEmail();

	const handleDraftClick = (draft: EmailWithRelations) => {
		setSelectedDraft(draft);
		setIsDraftDialogOpen(true);
	};

	const handleSelectAllDrafts = () => {
		if (selectedDraftIds.size === draftEmails?.length && draftEmails?.length > 0) {
			// Deselect all if all are selected
			setSelectedDraftIds(new Set());
		} else {
			// Select all
			setSelectedDraftIds(new Set(draftEmails?.map((d) => d.id) || []));
		}
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
		handleDraftSelection,
		handleSelectAllDrafts,
		selectedDraftIds,
		contacts,
	};
};
