'use client';
import { Contact } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { useParams } from 'next/navigation';
import { useMe } from '@/hooks/useMe';
import FeatureLockedButton from '@/app/murmur/_components/FeatureLockedButton';
import { restrictedFeatureMessages } from '@/constants/constants';
import {
	NoDataCell,
	TableSortingButton,
} from '@/app/murmur/campaign/[campaignId]/_components/CustomTable';
import { useDeleteContact, useGetContactsByCategory } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { TrashIcon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export const useManageContactListDetail = () => {
	const { subscriptionTier } = useMe();
	const params = useParams<{ id: string }>();
	const contactListId = params.id;

	if (!contactListId) {
		throw new Error('Contact list ID is required');
	}

	const parsedContactListId = parseInt(contactListId as string);
	if (isNaN(parsedContactListId)) {
		throw new Error('Invalid contact list ID');
	}

	const { data, isPending } = useGetContactsByCategory(parsedContactListId);

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
				<Button
					variant="ghost"
					size="icon"
					onClick={async (e) => {
						e.stopPropagation();
						await deleteContact(row.original.id);
						queryClient.invalidateQueries({
							queryKey: ['contacts', 'by-category', parseInt(contactListId)],
						});
					}}
				>
					<TrashIcon className="h-3 w-2 text-destructive" />
				</Button>
			),
		},
	];

	const queryClient = useQueryClient();

	const { mutateAsync: deleteContact } = useDeleteContact();

	return {
		data,
		isPending,
		columns,
	};
};
