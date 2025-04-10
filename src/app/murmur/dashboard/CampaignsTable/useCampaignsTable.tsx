import { Button } from '@/components/ui/button';
import { Campaign } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { TrashIcon } from 'lucide-react';
import { TypographyMuted } from '@/components/ui/typography';
import { TableSortingButton } from '../../campaign/[campaignId]/_components/CustomTable';
import { useDeleteCampaign, useGetCampaigns } from '@/hooks/useCampaigns';
import { MMddyyyyHHmm } from '@/app/utils/functions';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import { useState } from 'react';

export const useCampaignsTable = () => {
	const { data, isPending } = useGetCampaigns();
	const router = useRouter();
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [currentRow, setCurrentRow] = useState<Campaign | null>(null);

	const { mutateAsync: deleteCampaign, isPending: isPendingDelete } = useDeleteCampaign();

	const handleRowClick = (rowData: Campaign) => {
		router.push(`${urls.murmur.campaign.path}/${rowData.id}`);
	};
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
					<TypographyMuted className="text-sm">No Data</TypographyMuted>
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
					<TypographyMuted className="text-sm">No Data</TypographyMuted>
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
					<TypographyMuted className="text-sm">No Data</TypographyMuted>
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
