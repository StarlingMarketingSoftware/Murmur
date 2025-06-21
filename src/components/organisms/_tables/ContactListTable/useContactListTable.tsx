import { Dispatch, SetStateAction, useState } from 'react';
import { ContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { TableSortingButton } from '../../../molecules/CustomTable/CustomTable';
import { useGetContactLists } from '@/hooks/queryHooks/useContactLists';

export interface ContactListTableProps {
	setSelectedRows: Dispatch<SetStateAction<ContactList[]>>;
}

export const useContactListTable = (props: ContactListTableProps) => {
	const { setSelectedRows } = props;
	const columns: ColumnDef<ContactList>[] = [
		{
			accessorKey: 'title',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Name" />;
			},
			cell: ({ row }) => {
				return <div className="capitalize text-left">{row.getValue('title')}</div>;
			},
		},
	];

	const [isContactListDialogOpen, setIsContactListDialogOpen] = useState(false);

	const [selectedContactList, setSelectedContactList] = useState<ContactList | null>(
		null
	);

	const handleRowClick = (rowData: ContactList) => {
		setIsContactListDialogOpen(true);
		setSelectedContactList(rowData);
	};

	const { data: dataContactLists, isPending: isPendingContactLists } =
		useGetContactLists();

	return {
		columns,
		handleRowClick,
		dataContactLists,
		isPendingContactLists,
		isContactListDialogOpen,
		setIsContactListDialogOpen,
		selectedContactList,
		setSelectedContactList,
		setSelectedRows,
	};
};
