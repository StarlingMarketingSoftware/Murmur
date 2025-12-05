import { useDeleteEmail, useEditEmail } from '@/hooks/queryHooks/useEmails';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';
import { convertHtmlToPlainText } from '@/utils';
import { Dispatch, SetStateAction, useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const plainTextToHtml = (text: string) =>
	text
		.split('\n\n')
		.map((paragraph) => {
			const withBreaks = paragraph.replace(/\n/g, '<br>');
			return `<p>${withBreaks}</p>`;
		})
		.join('');

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
	onSend: () => void | Promise<void>;
	isSendingDisabled: boolean;
	isFreeTrial: boolean;
	fromName?: string;
	fromEmail?: string;
	subject?: string;
	onContactClick?: (contact: ContactWithName | null) => void;
	onContactHover?: (contact: ContactWithName | null) => void;
	/** Optional: called when the inline preview icon is clicked */
	onPreview?: (draft: EmailWithRelations) => void;
	/** Optional: callback to navigate to the Writing tab */
	goToWriting?: () => void;
	/** Optional: callback to navigate to the Search tab */
	goToSearch?: () => void;
	/** Optional: callback to navigate to the Inbox tab */
	goToInbox?: () => void;
	/** Optional: callback invoked when a draft is rejected in preview */
	onRejectDraft?: (draftId: number) => void;
	/** Optional: callback invoked when a draft is approved in preview */
	onApproveDraft?: (draftId: number) => void;
	/** Optional: callback invoked when regenerating a draft using AI */
	onRegenerateDraft?: (draft: EmailWithRelations) => Promise<{ subject: string; message: string } | null>;
	/** Optional: drafts marked for rejection (for UI badges) */
	rejectedDraftIds?: Set<number>;
	/** Optional: drafts marked for approval (for UI badges) */
	approvedDraftIds?: Set<number>;
}

export const useDraftedEmails = (props: DraftedEmailsProps) => {
	const {
		draftEmails,
		isPendingEmails,
		setSelectedDraft,
		handleDraftSelection,
		selectedDraftIds,
		setSelectedDraftIds,
		contacts,
		selectedDraft,
		onSend,
		isSendingDisabled,
		isFreeTrial,
		fromName,
		fromEmail,
		subject,
	} = props;

	const { mutateAsync: deleteEmail, isPending: isPendingDeleteEmail } = useDeleteEmail();

	const lastClickedRef = useRef<number | null>(null);

	const handleDraftClick = (draft: EmailWithRelations, event?: React.MouseEvent) => {
		if (event?.shiftKey && lastClickedRef.current !== null) {
			event.preventDefault();
			window.getSelection()?.removeAllRanges();

			const currentIndex = draftEmails.findIndex((d) => d.id === draft.id);
			const lastIndex = draftEmails.findIndex((d) => d.id === lastClickedRef.current);

			if (currentIndex !== -1 && lastIndex !== -1) {
				const start = Math.min(currentIndex, lastIndex);
				const end = Math.max(currentIndex, lastIndex);

				const newSelectedIds = new Set<number>();

				for (let i = start; i <= end; i++) {
					newSelectedIds.add(draftEmails[i].id);
				}

				setSelectedDraftIds(newSelectedIds);
			}
		} else {
			// Normal click - toggle selection only
			const newSelectedIds = new Set(selectedDraftIds);
			if (newSelectedIds.has(draft.id)) {
				newSelectedIds.delete(draft.id);
			} else {
				newSelectedIds.add(draft.id);
			}
			setSelectedDraftIds(newSelectedIds);
			lastClickedRef.current = draft.id;
		}
	};

	const handleDraftDoubleClick = (draft: EmailWithRelations) => {
		// Double click - open editor (legacy behavior)
		setSelectedDraft(draft);
		setEditedSubject(draft.subject || '');
		const plainMessage = convertHtmlToPlainText(draft.message);
		setEditedMessage(plainMessage);
	};

	const handleSelectAllDrafts = () => {
		if (selectedDraftIds.size === draftEmails?.length && draftEmails?.length > 0) {
			setSelectedDraftIds(new Set());
			lastClickedRef.current = null;
		} else {
			setSelectedDraftIds(new Set(draftEmails?.map((d) => d.id) || []));
			if (draftEmails.length > 0) {
				lastClickedRef.current = draftEmails[draftEmails.length - 1].id;
			}
		}
	};

	const handleDeleteDraft = async (e: React.MouseEvent, draftId: number) => {
		e.stopPropagation();
		e.preventDefault();
		await deleteEmail(draftId);
	};

	const [editedSubject, setEditedSubject] = useState('');
	const [editedMessage, setEditedMessage] = useState('');
	const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastSavedValuesRef = useRef<{ subject: string; message: string } | null>(null);
	const { mutateAsync: updateEmail, isPending: isPendingUpdate } = useEditEmail();

	useEffect(() => {
		if (autoSaveTimeoutRef.current) {
			clearTimeout(autoSaveTimeoutRef.current);
			autoSaveTimeoutRef.current = null;
		}

		if (!selectedDraft) {
			setEditedSubject('');
			setEditedMessage('');
			lastSavedValuesRef.current = null;
			return;
		}

		const nextSubject = selectedDraft.subject || '';
		const plainMessage = convertHtmlToPlainText(selectedDraft.message);
		setEditedSubject(nextSubject);
		setEditedMessage(plainMessage);
		lastSavedValuesRef.current = {
			subject: nextSubject,
			message: plainMessage,
		};
	}, [selectedDraft]);

	const saveDraft = useCallback(
		async (
			subjectToSave: string,
			messageToSave: string,
			options?: { silent?: boolean }
		) => {
			if (!selectedDraft) return;

			try {
				const htmlMessage = plainTextToHtml(messageToSave);
				await updateEmail({
					id: selectedDraft.id.toString(),
					data: {
						subject: subjectToSave,
						message: htmlMessage,
					},
				});

				lastSavedValuesRef.current = {
					subject: subjectToSave,
					message: messageToSave,
				};

				setSelectedDraft((prev) => {
					if (!prev || prev.id !== selectedDraft.id) return prev;
					return {
						...prev,
						subject: subjectToSave,
						message: htmlMessage,
					};
				});

				if (!options?.silent) {
					toast.success('Draft updated successfully');
				}
			} catch {
				if (options?.silent) {
					toast.error('Failed to auto-save draft changes');
				} else {
					toast.error('Failed to update draft');
				}
			}
		},
		[selectedDraft, setSelectedDraft, updateEmail]
	);

	useEffect(() => {
		if (!selectedDraft) return;

		const lastSaved = lastSavedValuesRef.current;
		const hasChanges =
			!lastSaved ||
			lastSaved.subject !== editedSubject ||
			lastSaved.message !== editedMessage;

		if (!hasChanges) return;

		if (autoSaveTimeoutRef.current) {
			clearTimeout(autoSaveTimeoutRef.current);
		}

		autoSaveTimeoutRef.current = setTimeout(() => {
			saveDraft(editedSubject, editedMessage, { silent: true });
		}, 1500);

		return () => {
			if (autoSaveTimeoutRef.current) {
				clearTimeout(autoSaveTimeoutRef.current);
				autoSaveTimeoutRef.current = null;
			}
		};
	}, [editedSubject, editedMessage, saveDraft, selectedDraft]);

	const handleSave = async () => {
		if (!selectedDraft) return;
		try {
			await saveDraft(editedSubject, editedMessage);
		} catch {
			// saveDraft already handles toast messaging
		}
	};

	const handleBack = () => {
		setSelectedDraft(null);
		setEditedSubject('');
		setEditedMessage('');
		lastSavedValuesRef.current = null;
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
		handleDraftSelect: handleDraftClick,
		handleSave,
		handleBack,
		isPendingUpdate,
		selectedDraft,
		editedSubject,
		editedMessage,
		setEditedMessage,
		setEditedSubject,
		setSelectedDraft,
		fromName,
		fromEmail,
		subject,
		onSend,
		isSendingDisabled,
		isFreeTrial,
	};
};
