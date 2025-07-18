import { Button } from '@/components/ui/button';
import { Campaign } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { TrashIcon } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import { TableSortingButton } from '../../../molecules/CustomTable/CustomTable';
import { useDeleteCampaign, useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { MMddyyyyHHmm } from '@/utils';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import { useState } from 'react';

export const useCampaignsTable = () => {
	const columns: ColumnDef<Campaign>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Name" />;
			},
			cell: ({ row }) => {
				const name: string = row.getValue('name');
				return name ? (
					<div className="text-left">{name}</div>
				) : (
					<Typography variant="muted" className="text-sm">
						No Data
					</Typography>
				);
			},
		},
		{
			accessorKey: 'createdAt',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Created At" />;
			},
			cell: ({ row }) => {
				const date = new Date(row.getValue('createdAt'));
				return date ? (
					<div className="text-left">{MMddyyyyHHmm(date)}</div>
				) : (
					<Typography variant="muted" className="text-sm">
						No Data
					</Typography>
				);
			},
		},
		{
			accessorKey: 'updatedAt',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Updated At" />;
			},
			cell: ({ row }) => {
				const date = new Date(row.getValue('updatedAt'));
				return date ? (
					<div className="text-left">{MMddyyyyHHmm(date)}</div>
				) : (
					<Typography variant="muted" className="text-sm">
						No Data
					</Typography>
				);
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
						setCurrentRow(row.original);
						setIsConfirmDialogOpen(true);
					}}
				>
					<TrashIcon className="h-3 w-2 text-destructive" />
				</Button>
			),
		},
	];

	const { data, isPending } = useGetCampaigns();
	const router = useRouter();
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [currentRow, setCurrentRow] = useState<Campaign | null>(null);

	const { mutateAsync: deleteCampaign, isPending: isPendingDelete } = useDeleteCampaign();

	const handleRowClick = (rowData: Campaign) => {
		router.push(urls.murmur.campaign.detail(rowData.id));
	};

	return {
		columns,
		data,
		isPending,
		handleRowClick,
		isPendingDelete,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
		currentRow,
		setCurrentRow,
		deleteCampaign,
	};
};
