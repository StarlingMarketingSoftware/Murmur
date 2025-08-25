import { ReactNode } from 'react';

export interface DraftingTableProps {
	handleClick: () => void;
	children: ReactNode;
	areAllSelected: boolean;
	hasData: boolean;
	noDataMessage: string;
	noDataDescription: string;
	isPending: boolean;
}

export const useDraftingTable = (props: DraftingTableProps) => {
	const {
		handleClick,
		children,
		areAllSelected,
		hasData,
		noDataMessage,
		noDataDescription,
		isPending,
	} = props;

	return {
		handleClick,
		children,
		areAllSelected,
		hasData,
		noDataMessage,
		noDataDescription,
		isPending,
	};
};
