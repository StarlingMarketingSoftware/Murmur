import { ContactWithName } from '@/types/contact';
import { Dispatch, SetStateAction } from 'react';

export interface ContactsSelectionProps {
	contacts: ContactWithName[];
	selectedContactIds: Set<number>;
	setSelectedContactIds: Dispatch<SetStateAction<Set<number>>>;
	handleContactSelection: (contactId: number) => void;
	generationProgress?: number;
	cancelGeneration?: () => void;
	generationTotal?: number;
}

export const useContactsSelection = (props: ContactsSelectionProps) => {
	const {
		contacts,
		selectedContactIds,
		setSelectedContactIds,
		handleContactSelection,
		generationProgress,
		generationTotal,
	} = props;

	const handleClick = () => {
		if (selectedContactIds.size === contacts?.length && contacts?.length > 0) {
			setSelectedContactIds(new Set());
		} else {
			setSelectedContactIds(new Set(contacts?.map((c) => c.id) || []));
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
