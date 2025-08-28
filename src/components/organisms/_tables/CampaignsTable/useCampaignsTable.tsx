import { Campaign } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import { useDeleteCampaign, useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import { useState } from 'react';

type CampaignWithCounts = Campaign & {
	draftCount?: number;
	sentCount?: number;
};

const formatDate = (date: Date) => {
	if (date && !isNaN(date.getTime())) {
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		return `${month}.${day}`;
	}
	return 'No Data';
};

const getDraftFillColor = (value: number): string => {
	const v = Math.max(0, Math.min(value, 50));
	if (v === 0) return '#FFFFFF';
	if (v <= 6.25) return '#FFFBF3';
	if (v <= 12.5) return '#FFF7E7';
	if (v <= 18.75) return '#FFF3DB';
	if (v <= 25) return '#FFEFCE';
	if (v <= 31.25) return '#FFEBC2';
	if (v <= 37.5) return '#FFE7B6';
	return '#FFE3AA';
};

const getSentFillColor = (value: number): string => {
	const v = Math.max(0, Math.min(value, 50));
	if (v === 0) return '#FFFFFF';
	if (v > 1) return '#F3FCF1';
	return '#FFFFFF'; // v === 1
};

const getUpdatedFillColor = (updatedAt: Date): string => {
	const startOfDay = (d: Date) => {
		const x = new Date(d);
		x.setHours(0, 0, 0, 0);
		return x;
	};
	const now = startOfDay(new Date());
	const then = startOfDay(updatedAt);
	const msInDay = 24 * 60 * 60 * 1000;
	const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / msInDay));

	if (days === 0) return '#FFFFFF'; // Today
	if (days <= 3) return '#FBEEEE'; // Yesterday to 3 days ago
	if (days <= 7) return '#F8DDDD'; // 1 week ago
	if (days <= 14) return '#F4CCCC'; // 2 weeks ago
	if (days <= 30) return '#F0BABA'; // 1 month ago
	if (days <= 45) return '#ECA9A9'; // 1.5 months ago
	if (days <= 60) return '#E99898'; // 2 months ago
	return '#E58787'; // 3+ months ago
};

const getCreatedFillColor = (createdAt: Date): string => {
	const startOfDay = (d: Date) => {
		const x = new Date(d);
		x.setHours(0, 0, 0, 0);
		return x;
	};
	const now = startOfDay(new Date());
	const then = startOfDay(createdAt);
	const msInDay = 24 * 60 * 60 * 1000;
	const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / msInDay));

	if (days === 0) return '#FFFFFF'; // Today
	if (days === 1) return '#F4F7FF'; // Yesterday
	if (days <= 3) return '#E9F0FF'; // Up to 3 days ago
	if (days <= 7) return '#DEE8FF'; // 1 week ago
	if (days <= 14) return '#D3E0FF'; // 2 weeks ago
	if (days <= 30) return '#C8D8FF'; // 1 month ago
	if (days <= 60) return '#BDD1FF'; // 2 months ago
	return '#B2C9FF'; // 3+ months ago
};

export const useCampaignsTable = () => {
	const columns: ColumnDef<CampaignWithCounts>[] = [
		{
			accessorKey: 'name',
			header: () => <div className="text-left"></div>,
			cell: ({ row }) => {
				const name: string = row.getValue('name');
				return name ? (
					<div
						className="text-left pr-8 font-bold text-[18px]"
						style={{ fontFamily: '"Times New Roman", Times, serif' }}
					>
						{name}
					</div>
				) : (
					<Typography variant="muted" className="text-sm">
						No Data
					</Typography>
				);
			},
			size: 350,
		},
		{
			id: 'metrics',
			header: () => (
				<div
					className="grid w-full items-center justify-items-start gap-8 md:gap-10 lg:gap-12 text-left text-sm"
					style={{
						gridTemplateColumns:
							'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.25fr)',
					}}
				>
					<span>Drafts</span>
					<span>Sent</span>
					<span>Updated Last</span>
					<span>Created On</span>
				</div>
			),
			cell: ({ row }) => {
				const campaign = row.original as CampaignWithCounts;
				const draftCount = campaign.draftCount ?? 0;
				const sentCount = campaign.sentCount ?? 0;
				const createdAt = new Date(campaign.createdAt);
				const updatedAt = new Date(campaign.updatedAt);

				const draftLabel = draftCount.toString().padStart(2, '0') + ' drafts';
				const sentLabel = sentCount.toString().padStart(2, '0') + ' sent';
				const draftFill = getDraftFillColor(draftCount);
				const sentFill = getSentFillColor(sentCount);
				const updatedFill = getUpdatedFillColor(updatedAt);
				const createdFill = getCreatedFillColor(createdAt);

				return (
					<div
						className="grid w-full items-center justify-items-start gap-8 md:gap-10 lg:gap-12 text-left"
						style={{
							gridTemplateColumns:
								'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.25fr)',
						}}
					>
						<div className="relative flex items-center">
							<div
								className="inline-flex items-center justify-start w-[6.13em] h-[1.33em] rounded-[4px] border border-[#8C8C8C] pl-3 pr-2 leading-none truncate"
								style={{ backgroundColor: draftFill }}
								data-draft-fill={draftFill}
							>
								{draftLabel}
							</div>
							<div className="absolute -right-4 md:-right-5 lg:-right-6 h-[14px] w-[1.5px] bg-black" />
						</div>
						<div className="relative flex items-center">
							<div
								className="inline-flex items-center justify-start w-[6.13em] h-[1.33em] rounded-[4px] border border-[#8C8C8C] pl-3 pr-2 leading-none truncate"
								style={{ backgroundColor: sentFill }}
								data-sent-fill={sentFill}
							>
								{sentLabel}
							</div>
							<div className="absolute -right-4 md:-right-5 lg:-right-6 h-[14px] w-[1.5px] bg-black" />
						</div>
						<div className="relative flex items-center">
							<div
								className="inline-flex items-center justify-start w-[6.13em] h-[1.33em] rounded-[4px] border border-[#8C8C8C] pl-3 pr-2 leading-none truncate"
								style={{ backgroundColor: updatedFill }}
								data-updated-fill={updatedFill}
							>
								{formatDate(updatedAt)}
							</div>
							<div className="absolute -right-4 md:-right-5 lg:-right-6 h-[14px] w-[1.5px] bg-black" />
						</div>
						<div className="relative flex items-center">
							<div
								className="inline-flex items-center justify-start w-[6.13em] h-[1.33em] rounded-[4px] border border-[#8C8C8C] pl-3 pr-2 leading-none truncate"
								style={{ backgroundColor: createdFill }}
								data-created-fill={createdFill}
							>
								{formatDate(createdAt)}
							</div>
						</div>
					</div>
				);
			},
		},
		{
			id: 'delete',
			header: () => <div className="text-right"></div>,
			cell: ({ row }) => (
				<div className="flex justify-end">
					<button
						className="w-[20px] h-[20px] flex items-center justify-center hover:opacity-70 transition-opacity"
						style={{
							background: 'transparent',
							border: 'none',
							padding: 0,
							cursor: 'pointer',
						}}
						onClick={(e) => {
							e.stopPropagation();
							setCurrentRow(row.original);
							setIsConfirmDialogOpen(true);
						}}
						aria-label="Delete campaign"
					>
						<X className="w-[20px] h-[20px]" style={{ color: '#000000' }} />
					</button>
				</div>
			),
			size: 60,
			minSize: 60,
			maxSize: 60,
		},
	];

	const { data, isPending } = useGetCampaigns();
	const router = useRouter();
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [currentRow, setCurrentRow] = useState<Campaign | null>(null);

	const { mutateAsync: deleteCampaign, isPending: isPendingDelete } = useDeleteCampaign();

	const handleRowClick = (rowData: Campaign) => {
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
