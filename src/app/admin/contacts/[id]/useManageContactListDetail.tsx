'use client';
import { Contact } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { useParams } from 'next/navigation';
import { useMe } from '@/hooks/useMe';
import FeatureLockedButton from '@/components/atoms/FeatureLockedButton/FeatureLockedButton';
import { restrictedFeatureMessages } from '@/constants/constants';
import {
	NoDataCell,
	TableSortingButton,
} from '@/components/molecules/CustomTable/CustomTable';
import { useDeleteContact, useGetContacts } from '@/hooks/queryHooks/useContacts';
import { useQueryClient } from '@tanstack/react-query';
import { TableDeleteRowButton } from '@/components/molecules/TableDeleteRowButton/TableDeleteRowButton';
import { useGetContactList } from '@/hooks/queryHooks/useContactLists';

export const useManageContactListDetail = () => {
	const { subscriptionTier } = useMe();
	const params = useParams<{ id: string }>();
	const contactListId = params.id;

	const queryClient = useQueryClient();
	const { data, isPending } = useGetContacts({ filters: { contactListId } });
	const { data: contactListData, isPending: isPendingContactList } =
		useGetContactList(contactListId);
	const { mutateAsync: deleteContact, isPending: isPendingDeleteContact } =
		useDeleteContact();

	const columns: ColumnDef<Contact>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Name" />;
			},
			cell: ({ row }) => {
				const name: string = row.getValue('name');
				if (!name) return <NoDataCell />;

				return <div className="text-left">{row.getValue('name')}</div>;
			},
		},
		{
			accessorKey: 'email',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Email" />;
			},
			cell: ({ row }) => {
				return subscriptionTier?.viewEmailAddresses ? (
					<div className="text-left">{row.getValue('email')}</div>
				) : (
					<FeatureLockedButton message={restrictedFeatureMessages.viewEmails} />
				);
			},
		},
		{
			accessorKey: 'company',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('company')}</div>;
			},
		},
		{
			accessorKey: 'country',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Country" />;
			},
			cell: ({ row }) => {
				const country: string = row.getValue('country');
				if (!country) return <NoDataCell />;

				return <div className="text-left">{row.getValue('country')}</div>;
			},
		},
		{
			accessorKey: 'state',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="State" />;
			},
			cell: ({ row }) => {
				const state: string = row.getValue('state');
				if (!state) return <NoDataCell />;

				return <div className="text-left">{row.getValue('state')}</div>;
			},
		},
		{
			accessorKey: 'phone',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Phone" />;
			},
			cell: ({ row }) => {
				const phone: string = row.getValue('phone');
				if (!phone) return <NoDataCell />;

				return <div className="text-left">{row.getValue('phone')}</div>;
			},
		},
		{
			accessorKey: 'website',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Website" />;
			},
			cell: ({ row }) => {
				const website: string = row.getValue('website');
				if (!website) return <NoDataCell />;

				return <div className="text-left">{row.getValue('website')}</div>;
			},
		},
		{
			id: 'action',
			cell: ({ row }) => (
				<TableDeleteRowButton
					onClick={async () => {
						await deleteContact(row.original.id);
						queryClient.invalidateQueries({
							queryKey: ['contacts'],
						});
					}}
				/>
			),
		},
	];

	return {
		data,
		isPending,
		columns,
		isPendingDeleteContact,
		contactListData,
		isPendingContactList,
	};
};
