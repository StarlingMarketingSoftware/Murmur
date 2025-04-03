import { Button } from '@/components/ui/button';
import { Checkbox } from '@radix-ui/react-checkbox';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Email } from '@prisma/client';
import { TableSortingButton } from '../../../CustomTable';

export const useSavedDraftsTable = () => {
	const columns: ColumnDef<Email>[] = [
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
		// {
		// 	accessorKey: 'contactEmail',
		// 	header: ({ column }) => {
		// 		return <TableSortingButton column={column} label="Email" />;
		// 	},
		// 	cell: ({ row }) => {
		// 		return <div className=" text-left">{row.getValue('contactEmail')}</div>;
		// 	},
		// },
		{
			accessorKey: 'subject',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Subject" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('subject')}</div>;
			},
		},
		{
			accessorKey: 'message',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Message" />;
			},
			cell: ({ row }) => {
				const message: string = row.getValue('message');
				return <div className="text-left">{message.substring(0, 60) + '...'}</div>;
			},
		},
	];

	const params = useParams();
	const { campaignId } = params;

	// Function to fetch emails for a specific campaign

	// Set up the query to fetch drafts
	const { data, isPending, isError, error } = useQuery({
		queryKey: ['drafts', campaignId],
		queryFn: async (): Promise<Email[]> => {
			const response = await fetch(`/api/emails?campaignId=${campaignId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch drafts');
			}
			return response.json();
		},
		enabled: !!campaignId,
	});

	return {
		columns,
		data,
		isPending,
		isError,
		error,
	};
};
