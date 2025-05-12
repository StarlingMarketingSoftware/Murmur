import { useMemo, useState } from 'react';
import { Contact, ContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { useParams } from 'next/navigation';
import { useMe } from '@/hooks/useMe';
import FeatureLockedButton from '@/components/atoms/FeatureLockedButton/FeatureLockedButton';
import { restrictedFeatureMessages } from '@/constants/constants';
import {
	NoDataCell,
	TableSortingButton,
} from '@/components/molecules/CustomTable/CustomTable';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';

export interface ContactListDialogProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	selectedContactList: ContactList | null;
	selectedRecipients: Contact[];
}

export const useContactListDialog = (props: ContactListDialogProps) => {
	const params = useParams();
	const campaignId = params.campaignId as string;
	const { selectedContactList, isOpen, setIsOpen, selectedRecipients } = props;

	const [selectedRows, setSelectedRows] = useState<Contact[]>([]);

	const { subscriptionTier } = useMe();
	const { data, isPending } = useGetContacts({
		filters: {
			contactListId: selectedContactList?.id,
		},
	});
	const { mutate: updateCampaign } = useEditCampaign({
		onSuccess: () => {
			setIsOpen(false);
		},
		successMessage: 'Recipients saved successfully!',
		errorMessage: 'Failed to save recipients. Please try again.',
	});

	const filteredData = useMemo(() => {
		if (!data) return [];

		return data.filter((contact: Contact) => {
			return !selectedRecipients.some(
				(selectedContact) => selectedContact.id === contact.id
			);
		});
	}, [data, selectedRecipients]);

	const saveSelectedRecipients = async () => {
		if (selectedContactList && !!campaignId) {
			updateCampaign({
				id: Number(campaignId),
				data: {
					contactOperation: {
						action: 'connect',
						contactIds: selectedRows.map((row) => row.id),
					},
				},
			});
		}
	};

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
	];

	return {
		data,
		isPending,
		isOpen,
		setIsOpen,
		columns,
		setSelectedRows,
		selectedContactList,
		saveSelectedRecipients,
		filteredData,
	};
};
