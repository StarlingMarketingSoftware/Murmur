'use client';
import { TableSortingButton } from '@/components/molecules/CustomTable/CustomTable';
import { TableDeleteRowButton } from '@/components/molecules/TableDeleteRowButton/TableDeleteRowButton';
import { useDeleteContactList, useGetContactLists } from '@/hooks/useContactLists';
import { ContactList } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
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
		{
			id: 'action',
			cell: ({ row }) => (
				<TableDeleteRowButton
					onClick={async () => {
						await deleteContactList(row.original.id);
						queryClient.invalidateQueries({
							queryKey: ['contactLists'],
						});
					}}
				/>
			),
		},
	];

	const { data: contactLists, isPending: isPendingContactLists } = useGetContactLists();

	const queryClient = useQueryClient();

	const { mutateAsync: deleteContactList, isPending: isPendingDeleteContactList } =
		useDeleteContactList();

	const handleRowClick = (rowData: ContactList) => {
		router.push(`/admin/contacts/${rowData.id}`);
	};

	return {
		columns,
		handleRowClick,
		contactLists,
		isPendingContactLists,
		isPendingDeleteContactList,
	};
};
