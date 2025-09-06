import { Campaign } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import { useDeleteCampaign, useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import { useState, useEffect, useRef } from 'react';
import { mmdd } from '@/utils';
import { useRowConfirmationAnimation } from '@/hooks/useRowConfirmationAnimation';

type CampaignWithCounts = Campaign & {
	draftCount?: number;
	sentCount?: number;
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
	const [confirmingCampaignId, setConfirmingCampaignId] = useState<number | null>(null);
	const [countdown, setCountdown] = useState<number>(5);
	const confirmationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Use the custom animation hook
	useRowConfirmationAnimation({
		confirmingCampaignId,
		setCountdown,
	});

	// Clear timeout on unmount
	useEffect(() => {
		return () => {
			if (confirmationTimeoutRef.current) {
				clearTimeout(confirmationTimeoutRef.current);
			}
		};
	}, []);

	const columns: ColumnDef<CampaignWithCounts>[] = [
		{
			accessorKey: 'name',
			header: () => <div className="text-left"></div>,
			cell: ({ row }) => {
				const name: string = row.getValue('name');
				const isConfirming = row.original.id === confirmingCampaignId;
				return name ? (
					<div
						className="text-left pr-8 font-bold text-[18px]"
						style={{
							fontFamily: '"Times New Roman", Times, serif',
							color: isConfirming ? 'white' : 'inherit',
						}}
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
				const isConfirming = campaign.id === confirmingCampaignId;

				// Show white text on red background when confirming
				if (isConfirming) {
					return (
						<div
							className="grid w-full items-center justify-items-start gap-8 md:gap-10 lg:gap-12 text-left"
							style={{
								gridTemplateColumns:
									'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.25fr)',
							}}
						>
							{/* Show "Click to confirm" with countdown in first column */}
							<div
								style={{
									color: 'white',
									fontFamily: 'Inter, sans-serif',
									fontSize: '14px',
									fontWeight: 400,
									pointerEvents: 'none',
								}}
							>
								Click to confirm <span style={{ marginLeft: '8px' }}>{countdown}</span>
							</div>
							{/* Empty cells for other columns */}
							<div></div>
							<div></div>
							<div></div>
						</div>
					);
				}

				const draftCount = campaign.draftCount ?? 0;
				const sentCount = campaign.sentCount ?? 0;
				const createdAt = new Date(campaign.createdAt);
				const updatedAt = new Date(campaign.updatedAt);

				const draftLabel =
					draftCount.toString().padStart(2, '0') +
					(draftCount === 1 ? ' draft' : ' drafts');
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
						<div className="relative flex items-center w-full">
							<div
								className="metric-box inline-flex items-center justify-start w-[6.13em] h-[1.33em] rounded-[4px] border border-[#8C8C8C] px-2.5 leading-none truncate"
								style={
									{
										'--draft-fill-color': draftFill,
										backgroundColor: isConfirming ? 'transparent' : draftFill,
										color: isConfirming ? 'white' : 'inherit',
										borderColor: isConfirming ? '#A20000' : '#8C8C8C',
									} as React.CSSProperties
								}
								data-draft-fill={draftFill}
							>
								{draftLabel}
							</div>
							<div
								className="absolute h-[17px] w-[2px]"
								style={{
									top: 'calc(50% - 8.5px)',
									backgroundColor: isConfirming ? 'transparent' : 'black',
									right: 'calc(-1rem - 1px)', // Default: center in gap-8 (32px gap)
								}}
							/>
						</div>
						<div className="relative flex items-center w-full">
							<div
								className="metric-box inline-flex items-center justify-start w-[6.13em] h-[1.33em] rounded-[4px] border border-[#8C8C8C] px-2.5 leading-none truncate"
								style={
									{
										'--sent-fill-color': sentFill,
										backgroundColor: isConfirming ? 'transparent' : sentFill,
										color: isConfirming ? 'white' : 'inherit',
										borderColor: isConfirming ? '#A20000' : '#8C8C8C',
									} as React.CSSProperties
								}
								data-sent-fill={sentFill}
							>
								{sentLabel}
							</div>
							<div
								className="absolute h-[17px] w-[2px]"
								style={{
									top: 'calc(50% - 8.5px)',
									backgroundColor: isConfirming ? 'transparent' : 'black',
									right: 'calc(-1rem - 1px)', // Default: center in gap-8 (32px gap)
								}}
							/>
						</div>
						<div className="relative flex items-center w-full">
							<div
								className="metric-box inline-flex items-center justify-start w-[6.13em] h-[1.33em] rounded-[4px] border border-[#8C8C8C] px-2.5 leading-none truncate"
								style={
									{
										'--updated-fill-color': updatedFill,
										backgroundColor: isConfirming ? 'transparent' : updatedFill,
										color: isConfirming ? 'white' : 'inherit',
										borderColor: isConfirming ? '#A20000' : '#8C8C8C',
									} as React.CSSProperties
								}
								data-updated-fill={updatedFill}
							>
								{mmdd(updatedAt)}
							</div>
							<div
								className="absolute h-[17px] w-[2px]"
								style={{
									top: 'calc(50% - 8.5px)',
									backgroundColor: isConfirming ? 'transparent' : 'black',
									right: 'calc(-1rem - 1px)', // Default: center in gap-8 (32px gap)
								}}
							/>
						</div>
						<div className="relative flex items-center">
							<div
								className="metric-box inline-flex items-center justify-start w-[6.13em] h-[1.33em] rounded-[4px] border border-[#8C8C8C] px-2.5 leading-none truncate"
								style={
									{
										'--created-fill-color': createdFill,
										backgroundColor: isConfirming ? 'transparent' : createdFill,
										color: isConfirming ? 'white' : 'inherit',
										borderColor: isConfirming ? '#A20000' : '#8C8C8C',
									} as React.CSSProperties
								}
								data-created-fill={createdFill}
							>
								{mmdd(createdAt)}
							</div>
						</div>
					</div>
				);
			},
		},
		{
			id: 'delete',
			header: () => <div className="text-right"></div>,
			cell: ({ row }) => {
				const isConfirming = row.original.id === confirmingCampaignId;
				return (
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

								// Clear any existing timeout
								if (confirmationTimeoutRef.current) {
									clearTimeout(confirmationTimeoutRef.current);
								}

								// If clicking the same campaign that's confirming, execute delete
								if (row.original.id === confirmingCampaignId) {
									// Execute deletion
									deleteCampaign(row.original.id);
									setConfirmingCampaignId(null);
									setCurrentRow(null);
								} else {
									// Set confirming state for new campaign
									setConfirmingCampaignId(row.original.id);
									setCurrentRow(row.original);

									// Set timeout to revert after 5 seconds
									confirmationTimeoutRef.current = setTimeout(() => {
										setConfirmingCampaignId(null);
										setCurrentRow(null);
									}, 5000);
								}
							}}
							aria-label="Delete campaign"
						>
							<X
								className="w-[20px] h-[20px]"
								style={{ color: isConfirming ? 'white' : '#000000' }}
							/>
						</button>
					</div>
				);
			},
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
		// If clicking on the confirming row, execute deletion
		if (rowData.id === confirmingCampaignId) {
			// Clear any existing timeout
			if (confirmationTimeoutRef.current) {
				clearTimeout(confirmationTimeoutRef.current);
			}
			// Execute deletion
			deleteCampaign(rowData.id);
			setConfirmingCampaignId(null);
			setCurrentRow(null);
		} else {
			// Normal navigation
			const target = `${urls.murmur.campaign.detail(rowData.id)}?silent=1`;
			router.push(target);
		}
	};

	return {
		columns,
		data,
		isPending,
		handleRowClick,
		isPendingDelete,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
		confirmingCampaignId,
		setConfirmingCampaignId,
		currentRow,
		setCurrentRow,
		deleteCampaign,
	};
};
