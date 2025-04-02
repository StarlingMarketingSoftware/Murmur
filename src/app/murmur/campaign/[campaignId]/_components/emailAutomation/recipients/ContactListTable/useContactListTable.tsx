import { CampaignWithRelations } from '@/constants/types';
import { useState } from 'react';
import { ContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { TableSortingButton } from '../../../CustomTable';

export interface ContactListTableProps {
	campaign: CampaignWithRelations;
}

export const useContactListTable = (props: ContactListTableProps) => {
	const columns: ColumnDef<ContactList>[] = [
		{
			accessorKey: 'category',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Category" />;
			},
			cell: ({ row }) => {
				return <div className="capitalize text-left">{row.getValue('category')}</div>;
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
	// 			console.log('🚀 ~ handleImportGoogleContacts ~ data:', data);
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
		console.log('🚀 ~ handleRowClick ~ rowData:', rowData);
		setIsContactListDialogOpen(true);
		setSelectedContactList(rowData);
	};

	const { data: dataContactLists, isPending: isPendingContactLists } = useQuery<
		ContactList[]
	>({
		queryKey: ['contact-list'],
		queryFn: async () => {
			const response = await fetch(`/api/contact-list/`);
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message);
			}
			return await response.json();
		},
	});

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
