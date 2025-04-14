import { useEffect, useMemo, useState } from 'react';
import { Contact, ContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { useParams } from 'next/navigation';
import { updateCampaignSchema } from '@/app/api/campaigns/[campaignId]/route';
import { z } from 'zod';
import { NoDataCell, TableSortingButton } from '../../../CustomTable';
import { useMe } from '@/hooks/useMe';
import FeatureLockedButton from '@/app/murmur/_components/FeatureLockedButton';
import { restrictedFeatureMessages } from '@/constants/constants';

export interface ContactListDialogProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	selectedContactList: ContactList | null;
	selectedRecipients: Contact[];
}

export const useContactListDialog = (props: ContactListDialogProps) => {
	const { subscriptionTier } = useMe();

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
					<div className="text-left">{row.getValue('contactEmail')}</div>
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
	const { selectedContactList, isOpen, setIsOpen, selectedRecipients } = props;
	const [selectedRows, setSelectedRows] = useState<Contact[]>([]);

	const params = useParams();
	const { campaignId } = params;

	const {
		data,
		isPending,
		mutate: fetchContacts,
	} = useMutation({
		mutationFn: async (contactListIds: number[]) => {
			const response = await fetch('/api/contacts/get-by-category', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ contactListIds }),
			});
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		},
	});

	const filteredData = useMemo(() => {
		if (!data) return [];

		return data.filter((contact: Contact) => {
			return !selectedRecipients.some(
				(selectedContact) => selectedContact.id === contact.id
			);
		});
	}, [data, selectedRecipients]);

	const queryClient = useQueryClient();

	const { mutate: updateCampaign } = useMutation({
		mutationFn: async (campaign: z.infer<typeof updateCampaignSchema>) => {
			const response = await fetch(`/api/campaigns/${campaignId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(campaign),
			});
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		},
		onSuccess: () => {
			toast.success('Recipients saved successfully!');
			setIsOpen(false);
			queryClient.invalidateQueries({ queryKey: ['campaign'] });
		},
		onError: () => {
			toast.error('Failed to save recipients. Please try again.');
		},
	});

	useEffect(() => {
		if (selectedContactList) {
			fetchContacts([selectedContactList.id]);
		}
	}, [selectedContactList, fetchContacts]);

	const saveSelectedRecipients = async () => {
		console.log('were updating campaign');
		if (selectedContactList && !!campaignId) {
			updateCampaign({
				contactOperation: {
					action: 'connect',
					contactIds: selectedRows.map((row) => row.id),
				},
			});
		}
	};

	return {
		data,
		isPending,
		fetchContacts,
		isOpen,
		setIsOpen,
		columns,
		setSelectedRows,
		selectedContactList,
		saveSelectedRecipients,
		filteredData,
	};
};
