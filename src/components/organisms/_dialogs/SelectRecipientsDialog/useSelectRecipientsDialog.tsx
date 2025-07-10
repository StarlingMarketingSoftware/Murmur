import { useState } from 'react';
import { Contact, UserContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { useMe } from '@/hooks/useMe';
import FeatureLockedButton from '@/components/atoms/FeatureLockedButton/FeatureLockedButton';
import { RESTRICTED_FEATURE_MESSAGES } from '@/constants';
import {
	NoDataCell,
	TableSortingButton,
} from '@/components/molecules/CustomTable/CustomTable';
import { useGetUserContactList } from '@/hooks/queryHooks/useUserContactLists';

export interface SelectRecipientsDialogProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	selectedContactList: UserContactList | null;
}

export const useSelectRecipientsDialog = (props: SelectRecipientsDialogProps) => {
	const { selectedContactList, isOpen, setIsOpen } = props;

	const [selectedRows, setSelectedRows] = useState<Contact[]>([]);

	const { subscriptionTier } = useMe();
	const { data, isPending } = useGetUserContactList(
		selectedContactList?.id.toString() || ''
	);

	const columns: ColumnDef<Contact>[] = [
		{
			id: 'select',
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && 'indeterminate')
					}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
					aria-label="Select all"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
					aria-label="Select row"
				/>
			),
		},
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
					<FeatureLockedButton message={RESTRICTED_FEATURE_MESSAGES.viewEmails} />
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
	];

	return {
		data,
		isPending,
		isOpen,
		setIsOpen,
		columns,
		selectedContactList,
		setSelectedRows,
	};
};
