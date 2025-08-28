import { Button } from '@/components/ui/button';
import { Campaign } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import { useDeleteCampaign, useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import { useState } from 'react';

type CampaignWithCounts = Campaign & { draftCount?: number; sentCount?: number };

export const useCampaignsTable = () => {
	const columns: ColumnDef<CampaignWithCounts>[] = [
		{
			accessorKey: 'name',
			header: 'Name',
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
			accessorKey: 'draftCount',
			header: 'Drafts',
			cell: ({ row }) => {
				const value = row.getValue<number>('draftCount');
				const count = typeof value === 'number' ? value : 0;
				return <div className="text-left">{`${count} drafts`}</div>;
			},
		},
		{
			accessorKey: 'sentCount',
			header: 'Sent',
			cell: ({ row }) => {
				const value = row.getValue<number>('sentCount');
				const count = typeof value === 'number' ? value : 0;
				return <div className="text-left">{`${count} sent`}</div>;
			},
		},
		{
			accessorKey: 'updatedAt',
			header: 'Updated Last',
			cell: ({ row }) => {
				const date = new Date(row.getValue('updatedAt'));
				return date ? (
					<div className="text-left">{`${date.getMonth() + 1}.${date.getDate()}`}</div>
				) : (
					<Typography variant="muted" className="text-sm">
						No Data
					</Typography>
				);
			},
		},
		{
			accessorKey: 'createdAt',
			header: 'Created On',
			cell: ({ row }) => {
				const date = new Date(row.getValue('createdAt'));
				return date ? (
					<div className="text-left">{`${date.getMonth() + 1}.${date.getDate()}`}</div>
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
					<X className="h-4 w-4 text-destructive" />
				</Button>
			),
		},
	];

	const { data, isPending } = useGetCampaigns();
	const router = useRouter();
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [currentRow, setCurrentRow] = useState<CampaignWithCounts | null>(null);

	const { mutateAsync: deleteCampaign, isPending: isPendingDelete } = useDeleteCampaign();

	const handleRowClick = (rowData: CampaignWithCounts) => {
		const target = `${urls.murmur.campaign.detail(rowData.id)}?silent=1`;
		router.push(target);
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
