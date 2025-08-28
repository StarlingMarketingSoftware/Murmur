import { ContactWithName } from '@/types/contact';
import { Dispatch, SetStateAction, useRef } from 'react';

export interface ContactsSelectionProps {
	contacts: ContactWithName[];
	selectedContactIds: Set<number>;
	setSelectedContactIds: Dispatch<SetStateAction<Set<number>>>;
	handleContactSelection: (contactId: number, event?: React.MouseEvent) => void;
	generationProgress?: number;
	cancelGeneration?: () => void;
	generationTotal?: number;
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

	// Track the last clicked contact for shift-click selection
	const lastClickedRef = useRef<number | null>(null);

	const handleContactSelection = (contactId: number, event?: React.MouseEvent) => {
		if (event?.shiftKey && lastClickedRef.current !== null) {
			// Prevent text selection on shift-click
			event.preventDefault();
			window.getSelection()?.removeAllRanges();

			// Shift-click: select range
			const currentIndex = contacts.findIndex((c) => c.id === contactId);
			const lastIndex = contacts.findIndex((c) => c.id === lastClickedRef.current);

			if (currentIndex !== -1 && lastIndex !== -1) {
				const start = Math.min(currentIndex, lastIndex);
				const end = Math.max(currentIndex, lastIndex);

				// Clear all selections first, then select only the range
				const newSelectedIds = new Set<number>();

				// Add all contacts in the range
				for (let i = start; i <= end; i++) {
					newSelectedIds.add(contacts[i].id);
				}

				setSelectedContactIds(newSelectedIds);
			}
		} else {
			// Normal click: toggle single selection
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
