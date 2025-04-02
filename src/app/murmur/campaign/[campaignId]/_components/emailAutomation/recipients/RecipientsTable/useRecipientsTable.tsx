import { Button } from '@/components/ui/button';
import { Contact } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { TrashIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { updateCampaignSchema } from '@/app/api/campaigns/[campaignId]/route';
import { z } from 'zod';
import { TableSortingButton } from '../../../CustomTable';

export interface RecipientsTableProps {
	contacts: Contact[];
}

export const useRecipientsTable = (props: RecipientsTableProps) => {
	const { contacts } = props;
	const queryClient = useQueryClient();
	const params = useParams();
	const { campaignId } = params;

	const { isPending: isPendingRemoveContacts, mutate: removeRecipients } = useMutation({
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
			toast.success('Recipient successfully remove from campaign.');
			queryClient.invalidateQueries({ queryKey: ['campaign'] });
		},
		onError: () => {
			toast.error('Failed to remove recipient from campaign. Please try again.');
		},
	});

	const columns: ColumnDef<Contact>[] = [
		// {
		// 	id: 'select',
		// 	header: ({ table }) => (
		// 		<Checkbox
		// 			checked={
		// 				table.getIsAllPageRowsSelected() ||
		// 				(table.getIsSomePageRowsSelected() && 'indeterminate')
		// 			}
		// 			onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
		// 			aria-label="Select all"
		// 		/>
		// 	),
		// 	cell: ({ row }) => (
		// 		<Checkbox
		// 			checked={row.getIsSelected()}
		// 			onCheckedChange={(value) => row.toggleSelected(!!value)}
		// 			aria-label="Select row"
		// 		/>
		// 	),
		// },
		{
			accessorKey: 'name',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Name" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('name')}</div>;
			},
		},
		{
			accessorKey: 'email',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Email" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('email')}</div>;
			},
		},
		// {
		// 	accessorKey: 'website',
		// 	header: ({ column }) => {
		// 		return <TableSortingButton column={column} label="Website" />;
		// 	},
		// 	cell: ({ row }) => {
		// 		return <div className="text-left">{row.getValue('website')}</div>;
		// 	},
		// },
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
					variant="ghost" // or any other variant like "outline", "default"
					size="icon"
					onClick={(e) => {
						e.stopPropagation();
						const contactId = row.original.id;
						removeRecipients({
							contactOperation: {
								action: 'disconnect',
								contactIds: [contactId],
							},
						});
					}}
				>
					<TrashIcon className="h-3 w-2 text-destructive" />
				</Button>
				// <Checkbox
				// 	checked={row.getIsSelected()}
				// 	onCheckedChange={(value) => row.toggleSelected(!!value)}
				// 	aria-label="Select row"
				// />
			),
		},
	];

	return {
		columns,
		contacts,
		isPendingRemoveContacts,
	};
};
