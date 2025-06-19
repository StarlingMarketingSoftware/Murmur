import { Button } from '@/components/ui/button';
import { Contact } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { TrashIcon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMe } from '@/hooks/useMe';
import { Typography } from '@/components/ui/typography';
import FeatureLockedButton from '@/components/atoms/FeatureLockedButton/FeatureLockedButton';
import { RESTRICTED_FEATURE_MESSAGES } from '@/constants';
import { TableSortingButton } from '@/components/molecules/CustomTable/CustomTable';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';

export interface RecipientsTableProps {
	contacts: Contact[];
}

export const useRecipientsTable = (props: RecipientsTableProps) => {
	const params = useParams();
	const campaignId = params.campaignId as string;
	const { contacts } = props;
	const { subscriptionTier } = useMe();

	const { isPending: isPendingRemoveContacts, mutate: removeRecipients } =
		useEditCampaign({
			successMessage: 'Recipient successfully removed from campaign.',
			errorMessage: 'Failed to remove recipient from campaign. Please try again.',
		});

	const columns: ColumnDef<Contact>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Name" />;
			},
			cell: ({ row }) => {
				const name: string = row.getValue('name');
				return name ? (
					<div>{name}</div>
				) : (
					<Typography variant="muted" className="text-sm">
						No Data
					</Typography>
				);
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
			accessorKey: 'state',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="State" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('state')}</div>;
			},
		},
		{
			accessorKey: 'country',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Country" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('country')}</div>;
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
			id: 'delete',
			cell: ({ row }) => (
				<Button
					variant="ghost"
					size="icon"
					onClick={(e) => {
						e.stopPropagation();
						const contactId = row.original.id;
						removeRecipients({
							id: campaignId,
							data: {
								contactOperation: {
									action: 'disconnect',
									contactIds: [contactId],
								},
							},
						});
					}}
				>
					<TrashIcon className="h-3 w-2 text-destructive" />
				</Button>
			),
		},
	];

	return {
		columns,
		contacts,
		isPendingRemoveContacts,
	};
};
