import { ContactWithName } from '@/types/contact';
import { CampaignWithRelations } from '@/types';
import { Dispatch, MouseEvent, SetStateAction, useRef } from 'react';

export interface ContactsSelectionProps {
	contacts: ContactWithName[];
	selectedContactIds: Set<number>;
	setSelectedContactIds: Dispatch<SetStateAction<Set<number>>>;
	handleContactSelection: (contactId: number, event?: React.MouseEvent) => void;
	onContactClick?: (contact: ContactWithName | null) => void;
	onContactHover?: (contact: ContactWithName | null) => void;
	generationProgress?: number;
	cancelGeneration?: () => void;
	generationTotal?: number;
	campaign?: CampaignWithRelations;
	onDraftEmails?: (contactIds: number[]) => Promise<void>;
	isDraftingDisabled?: boolean;
	/**
	 * Optional callback for when the search bar triggers a search.
	 * When provided, this overrides the default dashboard navigation behavior.
	 */
	onSearchFromMiniBar?: (params: { why: string; what: string; where: string }) => void;
	/**
	 * Callback to navigate to the search tab.
	 */
	goToSearch?: () => void;
	/**
	 * Callback to navigate to the drafts tab.
	 */
	goToDrafts?: () => void;
	/**
	 * Callback to navigate to the inbox tab.
	 */
	goToInbox?: () => void;
	/**
	 * Callback to navigate to the write tab.
	 */
	goToWriting?: () => void;
	allContacts?: ContactWithName[];
	/**
	 * If true, the bottom panels (Drafts, Sent, Inbox) will not be rendered.
	 * Useful when these panels are rendered separately in the parent layout.
	 */
	hideBottomPanels?: boolean;
	/**
	 * If true, the draft button will not be rendered.
	 * Useful when the button needs to be rendered separately in the parent layout for centering.
	 */
	hideButton?: boolean;
	/**
	 * Optional: marks this contacts table as the "main box" for cross-tab morph animations.
	 * When provided, this value is forwarded to the underlying DraftingTable `mainBoxId`.
	 */
	mainBoxId?: string;
	/**
	 * Whether to show the mini search bar above the contacts rows.
	 * Defaults to true to preserve existing behavior in non-campaign contexts.
	 */
	showSearchBar?: boolean;
}

export const useContactsSelection = (props: ContactsSelectionProps) => {
	const {
		contacts,
		selectedContactIds,
		setSelectedContactIds,
		handleContactSelection: originalHandleContactSelection,
		generationProgress,
		generationTotal,
	} = props;

	const lastClickedRef = useRef<number | null>(null);

	const handleContactSelection = (contactId: number, event?: MouseEvent) => {
		if (event?.shiftKey && lastClickedRef.current !== null) {
			event.preventDefault();
			window.getSelection()?.removeAllRanges();

			const currentIndex = contacts.findIndex((c) => c.id === contactId);
			const lastIndex = contacts.findIndex((c) => c.id === lastClickedRef.current);

			if (currentIndex !== -1 && lastIndex !== -1) {
				const start = Math.min(currentIndex, lastIndex);
				const end = Math.max(currentIndex, lastIndex);

				const newSelectedIds = new Set<number>();

				for (let i = start; i <= end; i++) {
					newSelectedIds.add(contacts[i].id);
				}

				setSelectedContactIds(newSelectedIds);
			}
		} else {
			originalHandleContactSelection(contactId);
			lastClickedRef.current = contactId;
		}
	};

	const handleClick = () => {
		if (selectedContactIds.size === contacts?.length && contacts?.length > 0) {
			setSelectedContactIds(new Set());
			lastClickedRef.current = null;
		} else {
			setSelectedContactIds(new Set(contacts?.map((c) => c.id) || []));
			if (contacts.length > 0) {
				lastClickedRef.current = contacts[contacts.length - 1].id;
			}
		}
	};

	const areAllSelected =
		selectedContactIds.size === contacts?.length && contacts?.length > 0;

	return {
		contacts,
		selectedContactIds,
		setSelectedContactIds,
		handleContactSelection,
		handleClick,
		areAllSelected,
		generationProgress,
		generationTotal,
	};
};
