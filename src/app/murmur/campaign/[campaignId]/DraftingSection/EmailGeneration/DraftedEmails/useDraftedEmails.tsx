import { useDeleteEmail, useEditEmail } from '@/hooks/queryHooks/useEmails';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';
import { convertHtmlToPlainText } from '@/utils';
import { Dispatch, SetStateAction, useState } from 'react';
import { toast } from 'sonner';

export interface DraftedEmailsProps {
	contacts: ContactWithName[];
	selectedDraftIds: Set<number>;
	selectedDraft: EmailWithRelations | null;
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
		selectedDraft,
	} = props;

	const { mutateAsync: deleteEmail, isPending: isPendingDeleteEmail } = useDeleteEmail();

	const handleDraftClick = (draft: EmailWithRelations) => {
		// Single click - toggle selection only
		const newSelectedIds = new Set(selectedDraftIds);
		if (newSelectedIds.has(draft.id)) {
			newSelectedIds.delete(draft.id);
		} else {
			newSelectedIds.add(draft.id);
		}
		setSelectedDraftIds(newSelectedIds);
	};

	const handleDraftDoubleClick = (draft: EmailWithRelations) => {
		// Double click - open editor
		setSelectedDraft(draft);
		setEditedSubject(draft.subject || '');
		const plainMessage = convertHtmlToPlainText(draft.message);
		setEditedMessage(plainMessage);
	};

	const handleSelectAllDrafts = () => {
		if (selectedDraftIds.size === draftEmails?.length && draftEmails?.length > 0) {
			setSelectedDraftIds(new Set());
		} else {
			setSelectedDraftIds(new Set(draftEmails?.map((d) => d.id) || []));
		}
	};

	const handleDeleteDraft = async (e: React.MouseEvent, draftId: number) => {
		e.stopPropagation();
		e.preventDefault();
		await deleteEmail(draftId);
	};

	const [editedSubject, setEditedSubject] = useState('');
	const [editedMessage, setEditedMessage] = useState('');
	const { mutateAsync: updateEmail, isPending: isPendingUpdate } = useEditEmail();

	const handleDraftSelect = handleDraftClick;

	const handleSave = async () => {
		if (!selectedDraft) return;
		try {
			const paragraphs = editedMessage.split('\n\n');
			const htmlMessage = paragraphs
				.map((para) => {
					// Within each paragraph, convert single newlines to <br>
					const withBreaks = para.replace(/\n/g, '<br>');
					return `<p>${withBreaks}</p>`;
				})
				.join('');

			await updateEmail({
				id: selectedDraft.id.toString(),
				data: {
					subject: editedSubject,
					message: htmlMessage,
				},
			});
			toast.success('Draft updated successfully');
		} catch {
			toast.error('Failed to update draft');
		}
	};

	const handleBack = () => {
		setSelectedDraft(null);
		setEditedSubject('');
		setEditedMessage('');
	};

	return {
		draftEmails,
		isPendingEmails,
		isPendingDeleteEmail,
		deleteEmail,
		handleDraftClick,
		handleDraftDoubleClick,
		handleDeleteDraft,
		handleDraftSelection,
		handleSelectAllDrafts,
		selectedDraftIds,
		contacts,
		handleDraftSelect,
		handleSave,
		handleBack,
		isPendingUpdate,
		selectedDraft,
		editedSubject,
		editedMessage,
		setEditedMessage,
		setEditedSubject,
		setSelectedDraft,
	};
};
