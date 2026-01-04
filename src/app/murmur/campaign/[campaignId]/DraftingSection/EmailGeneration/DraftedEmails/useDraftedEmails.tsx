import { useDeleteEmail, useEditEmail } from '@/hooks/queryHooks/useEmails';
import { EmailWithRelations } from '@/types';
import { ContactWithName } from '@/types/contact';
import { convertHtmlToPlainText } from '@/utils';
import {
	extractMurmurDraftSettingsSnapshot,
	injectMurmurDraftSettingsSnapshot,
	stripMurmurDraftSettingsSnapshot,
	type MurmurDraftSettingsSnapshotV1,
} from '@/utils/draftSettings';
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

// Check if HTML contains hyperlinks
const hasHyperlinks = (html: string) => /<a\s+[^>]*href=/i.test(html);

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
	/** Optional: called when a draft row is hovered (used to preview the draft's original settings) */
	onDraftHover?: (draft: EmailWithRelations | null) => void;
	/** Optional: called when the inline preview icon is clicked */
	onPreview?: (draft: EmailWithRelations) => void;
	/** Optional: callback to navigate to the Writing tab */
	goToWriting?: () => void;
	/** Optional: callback to navigate to the Search tab */
	goToSearch?: () => void;
	/** Optional: callback to navigate to the Inbox tab */
	goToInbox?: () => void;
	/** Optional: callback invoked when a draft is rejected in preview (toggle behavior) */
	onRejectDraft?: (draftId: number, currentlyRejected?: boolean) => void;
	/** Optional: callback invoked when a draft is approved in preview (toggle behavior) */
	onApproveDraft?: (draftId: number, currentlyApproved?: boolean) => void;
	/** Optional: callback invoked when regenerating a draft using AI */
	onRegenerateDraft?: (draft: EmailWithRelations) => Promise<{ subject: string; message: string } | null>;
	/** Optional: drafts marked for rejection (for UI badges) */
	rejectedDraftIds?: Set<number>;
	/** Optional: drafts marked for approval (for UI badges) */
	approvedDraftIds?: Set<number>;
	/** Current status filter for Drafts tab */
	statusFilter: 'all' | 'approved' | 'rejected';
	/** Callback to change status filter */
	onStatusFilterChange: (filter: 'all' | 'approved' | 'rejected') => void;
	/** Optional: hide the send button at the bottom of the table */
	hideSendButton?: boolean;
	/** Optional: narrowest desktop breakpoint (< 952px) - moves counter to bottom-left in draft review */
	isNarrowestDesktop?: boolean;
	/** Optional: narrow desktop breakpoint (952px - 1279px) - moves counter to bottom-left in draft review */
	isNarrowDesktop?: boolean;
	/** Optional: callback to navigate to the previous tab */
	goToPreviousTab?: () => void;
	/** Optional: callback to navigate to the next tab */
	goToNextTab?: () => void;
	/**
	 * Optional: marks this drafts table as the "main box" for cross-tab morph animations.
	 * When provided, this value is forwarded to the underlying DraftingTable `mainBoxId`.
	 */
	mainBoxId?: string;
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
	const draftSettingsSnapshotRef = useRef<MurmurDraftSettingsSnapshotV1 | null>(null);

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
		// Preserve HTML for drafts with links, otherwise convert to plain text
		if (hasHyperlinks(draft.message)) {
			setEditedMessage(stripMurmurDraftSettingsSnapshot(draft.message));
		} else {
			const plainMessage = convertHtmlToPlainText(draft.message);
			setEditedMessage(plainMessage);
		}
	};

	const handleSelectAllDrafts = (targetDrafts?: EmailWithRelations[]) => {
		const draftsToSelect = targetDrafts ?? draftEmails;
		const ids = draftsToSelect.map((d) => d.id);
		const allSelected = ids.length > 0 && ids.every((id) => selectedDraftIds.has(id));

		if (allSelected) {
			setSelectedDraftIds(new Set());
			lastClickedRef.current = null;
			return;
		}

		setSelectedDraftIds(new Set(ids));
		if (ids.length > 0) {
			lastClickedRef.current = ids[ids.length - 1];
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
			draftSettingsSnapshotRef.current = null;
			return;
		}

		// Preserve the original drafting settings snapshot (if present) so edits don't strip it.
		draftSettingsSnapshotRef.current = extractMurmurDraftSettingsSnapshot(selectedDraft.message);

		const nextSubject = selectedDraft.subject || '';
		// Preserve HTML for drafts with links, otherwise convert to plain text
		const messageContent = hasHyperlinks(selectedDraft.message)
			? stripMurmurDraftSettingsSnapshot(selectedDraft.message)
			: convertHtmlToPlainText(selectedDraft.message);
		setEditedSubject(nextSubject);
		setEditedMessage(messageContent);
		lastSavedValuesRef.current = {
			subject: nextSubject,
			message: messageContent,
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
				// If message already contains HTML (has links), use it directly
				// Otherwise, convert plain text to HTML
				const htmlMessageBase = hasHyperlinks(messageToSave)
					? messageToSave
					: plainTextToHtml(messageToSave);
				const htmlMessage =
					draftSettingsSnapshotRef.current
						? injectMurmurDraftSettingsSnapshot(
								htmlMessageBase,
								draftSettingsSnapshotRef.current
						  )
						: htmlMessageBase;
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
