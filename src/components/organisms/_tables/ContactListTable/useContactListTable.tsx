import { CampaignWithRelations } from '@/constants/types';
import { useState } from 'react';
import { ContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { TableSortingButton } from '../../../molecules/CustomTable/CustomTable';
import { useGetContactLists } from '@/hooks/queryHooks/useContactLists';

export interface ContactListTableProps {
	campaign: CampaignWithRelations;
}

export const useContactListTable = (props: ContactListTableProps) => {
	const columns: ColumnDef<ContactList>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Name" />;
			},
			cell: ({ row }) => {
				return <div className="capitalize text-left">{row.getValue('name')}</div>;
			},
		},
		{
			accessorKey: 'count',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Count" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('count')}</div>;
			},
		},
	];
	const { campaign } = props;

	// const handleImportGoogleContacts = async () => {
	// 	if (hasContactsReadOnlyPermission()) {
	// 		console.log('calling peoples api');
	// 		try {
	// 			const response = await fetch(
	// 				'https://people.googleapis.com/v1/people/me/connections?' +
	// 					new URLSearchParams({
	// 						personFields: 'names,emailAddresses',
	// 						pageSize: '1000',
	// 					}),
	// 				{
	// 					headers: {
	// 						Authorization: `Bearer ${localStorage.getItem(
	// 							LocalStorageKeys.GoogleAccessToken
	// 						)}`,
	// 						Accept: 'application/json',
	// 					},
	// 				}
	// 			);

	// 			if (!response.ok) {
	// 				throw new Error(`HTTP error! status: ${response.status}`);
	// 			}

	// 			const data = await response.json();
	// 			// TODO set state
	// 		} catch (error) {
	// 			if (error instanceof Error) {
	// 				toast.error('Error fetching Google contacts: ' + error.message);
	// 			}
	// 			throw error;
	// 		}
	// 	} else {
	// 		setIsPermissionsDialogOpen(true);
	// 	}
	// };

	const [isContactListDialogOpen, setIsContactListDialogOpen] = useState(false);
	// const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
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
		campaign,
	};
};
