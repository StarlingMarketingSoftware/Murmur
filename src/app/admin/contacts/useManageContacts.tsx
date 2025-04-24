'use client';
import { TableSortingButton } from '@/app/murmur/campaign/[campaignId]/_components/CustomTable';
import { useGetContactLists } from '@/hooks/useContactLists';
import { ContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';

export const useManageContacts = () => {
	// fetch all contact lists
	const router = useRouter();
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

	const { data: contactLists, isPending: isPendingContactLists } = useGetContactLists();

	const handleRowClick = (rowData: ContactList) => {
		router.push(`/admin/contacts/${rowData.id}`);
	};

	return {
		columns,
		handleRowClick,
		contactLists,
		isPendingContactLists,
	};
};
