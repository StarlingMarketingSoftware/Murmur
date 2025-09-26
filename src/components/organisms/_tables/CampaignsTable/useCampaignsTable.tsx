import { Campaign } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import { useDeleteCampaign, useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import { useState, useEffect, useRef } from 'react';
import { cn, mmdd } from '@/utils';
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

export const useCampaignsTable = (options?: { compactMetrics?: boolean }) => {
	const compactMetrics = options?.compactMetrics ?? false;
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
						className={cn(
							'text-left pr-8 font-bold font-primary campaign-name-text text-[14px] sm:text-[18px]',
							isConfirming && 'text-white'
						)}
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
					className={cn(
						'metrics-header-grid w-full items-center',
						compactMetrics
							? 'flex flex-nowrap gap-[7px] justify-start px-2'
							: 'grid justify-items-start gap-8 md:gap-10 lg:gap-12'
					)}
					style={
						compactMetrics
							? undefined
							: {
									gridTemplateColumns:
										'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.25fr)',
							  }
					}
				>
					<span
						className={cn(
							'metrics-header-label',
							compactMetrics &&
								'flex h-[15px] w-[35px] items-center justify-center text-[10px] font-medium uppercase tracking-[0.01em]'
						)}
						data-label="drafts"
					>
						Drafts
					</span>
					<span
						className={cn(
							'metrics-header-label',
							compactMetrics &&
								'flex h-[15px] w-[35px] items-center justify-center text-[10px] font-medium uppercase tracking-[0.01em]'
						)}
						data-label="sent"
					>
						Sent
					</span>
					<span
						className={cn(
							'metrics-header-label',
							compactMetrics &&
								'flex h-[15px] w-[45px] items-center justify-center text-center text-[10px] font-medium uppercase leading-[1.05] tracking-[0.01em]'
						)}
						data-label="updated"
					>
						Updated Last
					</span>
					<span
						className={cn(
							'metrics-header-label',
							compactMetrics &&
								'flex h-[15px] w-[45px] items-center justify-center text-center text-[10px] font-medium uppercase leading-[1.05] tracking-[0.01em]'
						)}
						data-label="created"
					>
						Created On
					</span>
				</div>
			),
			cell: ({ row }) => {
				const campaign = row.original as CampaignWithCounts;
				const isConfirming = campaign.id === confirmingCampaignId;

				if (isConfirming) {
					return (
						<div
							className={cn(
								'metrics-grid-container w-full items-center text-left',
								compactMetrics
									? 'flex flex-nowrap gap-[7px] justify-start'
									: 'grid justify-items-start gap-8 md:gap-10 lg:gap-12'
							)}
							style={
								compactMetrics
									? undefined
									: {
											gridTemplateColumns:
												'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.25fr)',
									  }
							}
						>
							<div
								className={cn(
									'relative flex items-center',
									compactMetrics ? 'w-auto flex-shrink-0 justify-start' : 'w-full'
								)}
							>
								<div
									className={cn(
										'pointer-events-none font-inter font-normal text-white',
										compactMetrics
											? 'flex h-[15px] items-center justify-start text-[11px] uppercase tracking-[0.01em]'
											: 'text-[14px]'
									)}
								>
									Click to confirm <span className="ml-2">{countdown}</span>
								</div>
							</div>
							{[0, 1, 2].map((index) => (
								<div
									key={index}
									className={cn(
										'flex items-center',
										compactMetrics
											? 'h-[15px] w-[45px] flex-shrink-0 justify-center'
											: 'w-full'
									)}
								/>
							))}
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

				const draftDisplay = compactMetrics
					? draftCount.toString().padStart(2, '0')
					: draftLabel;
				const sentDisplay = compactMetrics
					? sentCount.toString().padStart(2, '0')
					: sentLabel;
				const draftFill = getDraftFillColor(draftCount);
				const sentFill = getSentFillColor(sentCount);
				const updatedFill = getUpdatedFillColor(updatedAt);
				const createdFill = getCreatedFillColor(createdAt);

				return (
					<div
						className={cn(
							'metrics-grid-container w-full items-center text-left',
							compactMetrics
								? 'flex flex-nowrap gap-[7px] justify-start'
								: 'grid justify-items-start gap-8 md:gap-10 lg:gap-12'
						)}
						style={
							compactMetrics
								? undefined
								: {
										gridTemplateColumns:
											'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.25fr)',
								  }
						}
					>
						{[
							{
								label: draftDisplay,
								fill: draftFill,
								dataAttr: { 'data-draft-fill': draftFill } as Record<string, string>,
								width: compactMetrics ? 'w-[35px]' : 'w-[6.13em]',
								separator: !compactMetrics,
							},
							{
								label: sentDisplay,
								fill: sentFill,
								dataAttr: { 'data-sent-fill': sentFill } as Record<string, string>,
								width: compactMetrics ? 'w-[35px]' : 'w-[6.13em]',
								separator: !compactMetrics,
							},
							{
								label: mmdd(updatedAt),
								fill: updatedFill,
								dataAttr: { 'data-updated-fill': updatedFill } as Record<string, string>,
								width: compactMetrics ? 'w-[45px]' : 'w-[6.13em]',
								separator: !compactMetrics,
							},
							{
								label: mmdd(createdAt),
								fill: createdFill,
								dataAttr: { 'data-created-fill': createdFill } as Record<string, string>,
								width: compactMetrics ? 'w-[45px]' : 'w-[6.13em]',
								separator: false,
							},
						].map(({ label, fill, dataAttr, width, separator }, index) => (
							<div
								key={index}
								className={cn(
									'relative flex items-center',
									compactMetrics ? 'w-auto flex-shrink-0 justify-start' : 'w-full'
								)}
							>
								<div
									{...dataAttr}
									className={cn(
										'metric-box inline-flex items-center justify-start border border-[#8C8C8C] leading-none truncate',
										compactMetrics
											? cn(width, 'h-[15px] rounded-[4px] justify-center')
											: 'h-[1.33em] w-[6.13em] rounded-[4px] px-2.5'
									)}
									style={
										{
											backgroundColor: isConfirming ? 'transparent' : fill,
											color: isConfirming ? 'white' : 'inherit',
											borderColor: isConfirming
												? '#A20000'
												: compactMetrics
												? '#000000'
												: '#8C8C8C',
											...(compactMetrics
												? ({ fontSize: '12px' } as React.CSSProperties)
												: {}),
										} as React.CSSProperties
									}
								>
									{label}
								</div>
								{separator && (
									<div
										className="metric-separator absolute h-[17px] w-[2px]"
										style={{
											top: 'calc(50% - 8.5px)',
											backgroundColor: isConfirming ? 'transparent' : 'black',
											right: 'calc(-1rem - 1px)',
										}}
									/>
								)}
							</div>
						))}
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
							className="campaign-delete-btn w-[20px] h-[20px] flex items-center justify-center hover:opacity-70 transition-opacity"
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

	const handleDeleteClick = (e: React.MouseEvent, campaignId: number) => {
		e.stopPropagation();

		// Clear any existing timeout
		if (confirmationTimeoutRef.current) {
			clearTimeout(confirmationTimeoutRef.current);
		}

		// If clicking the same campaign that's confirming, execute delete
		if (campaignId === confirmingCampaignId) {
			// Execute deletion
			deleteCampaign(campaignId);
			setConfirmingCampaignId(null);
			setCurrentRow(null);
		} else {
			// Set confirming state for new campaign
			setConfirmingCampaignId(campaignId);
			const campaign = data?.find((c: Campaign) => c.id === campaignId);
			if (campaign) {
				setCurrentRow(campaign);
			}

			// Set timeout to revert after 5 seconds
			confirmationTimeoutRef.current = setTimeout(() => {
				setConfirmingCampaignId(null);
				setCurrentRow(null);
			}, 5000);
		}
	};

	return {
		columns,
		data,
		isPending,
		handleRowClick,
		handleDeleteClick,
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
