import { Campaign } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import { useDeleteCampaign, useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

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
	const [confirmingCampaignId, setConfirmingCampaignId] = useState<number | null>(null);
	const [countdown, setCountdown] = useState<number>(5);
	const confirmationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const gradientAnimationRef = useRef<gsap.core.Tween | null>(null);

	// Clear timeout and animation on unmount
	useEffect(() => {
		return () => {
			if (confirmationTimeoutRef.current) {
				clearTimeout(confirmationTimeoutRef.current);
			}
			if (countdownIntervalRef.current) {
				clearInterval(countdownIntervalRef.current);
			}
			if (gradientAnimationRef.current) {
				gradientAnimationRef.current.kill();
			}
		};
	}, []);

	// Animate gradient when confirmation state changes
	useEffect(() => {
		if (confirmingCampaignId !== null) {
			// Reset countdown
			setCountdown(5);

			// Start countdown interval
			if (countdownIntervalRef.current) {
				clearInterval(countdownIntervalRef.current);
			}
			countdownIntervalRef.current = setInterval(() => {
				setCountdown((prev) => {
					if (prev <= 1) {
						return 1;
					}
					return prev - 1;
				});
			}, 1000);

			// Use setTimeout to ensure DOM is updated
			setTimeout(() => {
				// Start gradient animation
				const rowElement = document.querySelector(
					`[data-campaign-id="${confirmingCampaignId}"]`
				);

				if (rowElement) {
					// Clear any previous inline animation styles from all rows to avoid leftover seams
					const allRows = document.querySelectorAll('[data-campaign-id]');
					allRows.forEach((row) => {
						const r = row as HTMLElement;
						r.style.removeProperty('background');
						r.style.removeProperty('background-color');
						r.style.removeProperty('background-image');
						r.style.removeProperty('background-size');
						r.style.removeProperty('background-position');
						r.style.removeProperty('will-change');
						r.style.removeProperty('border-color');
						const tds = row.querySelectorAll('td');
						tds.forEach((cell) => {
							const c = cell as HTMLElement;
							c.style.removeProperty('background');
							c.style.removeProperty('background-color');
							c.style.removeProperty('background-image');
							c.style.removeProperty('background-size');
							c.style.removeProperty('background-position');
						});
					});

					// Kill previous animation if exists
					if (gradientAnimationRef.current) {
						gradientAnimationRef.current.kill();
					}

					// Make all cells transparent so the row background shows seamlessly
					const cells = rowElement.querySelectorAll('td');
					cells.forEach((cell) => {
						(cell as HTMLElement).style.setProperty(
							'background',
							'transparent',
							'important'
						);
						(cell as HTMLElement).style.setProperty(
							'background-color',
							'transparent',
							'important'
						);
						(cell as HTMLElement).style.removeProperty('background-image');
						(cell as HTMLElement).style.removeProperty('background-size');
						// Also make all child elements transparent
						const childDivs = cell.querySelectorAll('div');
						childDivs.forEach((div) => {
							(div as HTMLElement).style.setProperty(
								'background',
								'transparent',
								'important'
							);
							(div as HTMLElement).style.setProperty(
								'background-color',
								'transparent',
								'important'
							);
							(div as HTMLElement).style.setProperty(
								'border-color',
								'#A20000',
								'important'
							);
						});
					});

					// Apply a single-row shimmer: top layer highlight over a solid base
					const rowEl = rowElement as HTMLElement;
					rowEl.style.setProperty(
						'background-image',
						'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 100%), linear-gradient(0deg, #A20000, #A20000)',
						'important'
					);
					rowEl.style.setProperty('background-size', '200% 100%, 100% 100%', 'important');
					rowEl.style.setProperty('background-position', '0% 0%, 0% 0%', 'important');
					rowEl.style.setProperty('background-color', '#A20000', 'important');
					rowEl.style.setProperty('border-color', '#A20000', 'important');
					rowEl.style.setProperty('will-change', 'background-position', 'important');

					// Animate only the row's highlight layer for a smooth, unified effect
					gradientAnimationRef.current = gsap.to(rowEl, {
						backgroundPosition: '200% 0%, 0% 0%',
						duration: 2.2,
						ease: 'power1.inOut',
						repeat: -1,
					});
				}
			}, 0);
		} else {
			// Clean up animation, countdown and reset backgrounds
			if (countdownIntervalRef.current) {
				clearInterval(countdownIntervalRef.current);
				countdownIntervalRef.current = null;
			}
			if (gradientAnimationRef.current) {
				gradientAnimationRef.current.kill();
				gradientAnimationRef.current = null;
			}
			// Reset all row backgrounds and cells
			const allRows = document.querySelectorAll('[data-campaign-id]');
			allRows.forEach((row) => {
				(row as HTMLElement).style.removeProperty('background');
				(row as HTMLElement).style.removeProperty('background-color');
				(row as HTMLElement).style.removeProperty('background-image');
				(row as HTMLElement).style.removeProperty('background-size');
				(row as HTMLElement).style.removeProperty('background-position');
				(row as HTMLElement).style.removeProperty('will-change');
				(row as HTMLElement).style.removeProperty('border-color');
				// Also reset cells
				const cells = row.querySelectorAll('td');
				cells.forEach((cell) => {
					(cell as HTMLElement).style.removeProperty('background');
					(cell as HTMLElement).style.removeProperty('background-color');
					(cell as HTMLElement).style.removeProperty('background-image');
					(cell as HTMLElement).style.removeProperty('background-size');
					(cell as HTMLElement).style.removeProperty('background-position');
				});
			});
		}
	}, [confirmingCampaignId]);

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
								style={{
									backgroundColor: isConfirming ? 'transparent' : draftFill,
									color: isConfirming ? 'white' : 'inherit',
									borderColor: isConfirming ? '#A20000' : '#8C8C8C',
								}}
								data-draft-fill={draftFill}
							>
								{draftLabel}
							</div>
							<div
								className="absolute -right-4 md:-right-5 lg:-right-6 h-[14px] w-[1.5px]"
								style={{ backgroundColor: isConfirming ? 'transparent' : 'black' }}
							/>
						</div>
						<div className="relative flex items-center">
							<div
								className="inline-flex items-center justify-start w-[6.13em] h-[1.33em] rounded-[4px] border border-[#8C8C8C] pl-3 pr-2 leading-none truncate"
								style={{
									backgroundColor: isConfirming ? 'transparent' : sentFill,
									color: isConfirming ? 'white' : 'inherit',
									borderColor: isConfirming ? '#A20000' : '#8C8C8C',
								}}
								data-sent-fill={sentFill}
							>
								{sentLabel}
							</div>
							<div
								className="absolute -right-4 md:-right-5 lg:-right-6 h-[14px] w-[1.5px]"
								style={{ backgroundColor: isConfirming ? 'transparent' : 'black' }}
							/>
						</div>
						<div className="relative flex items-center">
							<div
								className="inline-flex items-center justify-start w-[6.13em] h-[1.33em] rounded-[4px] border border-[#8C8C8C] pl-3 pr-2 leading-none truncate"
								style={{
									backgroundColor: isConfirming ? 'transparent' : updatedFill,
									color: isConfirming ? 'white' : 'inherit',
									borderColor: isConfirming ? '#A20000' : '#8C8C8C',
								}}
								data-updated-fill={updatedFill}
							>
								{formatDate(updatedAt)}
							</div>
							<div
								className="absolute -right-4 md:-right-5 lg:-right-6 h-[14px] w-[1.5px]"
								style={{ backgroundColor: isConfirming ? 'transparent' : 'black' }}
							/>
						</div>
						<div className="relative flex items-center">
							<div
								className="inline-flex items-center justify-start w-[6.13em] h-[1.33em] rounded-[4px] border border-[#8C8C8C] pl-3 pr-2 leading-none truncate"
								style={{
									backgroundColor: isConfirming ? 'transparent' : createdFill,
									color: isConfirming ? 'white' : 'inherit',
									borderColor: isConfirming ? '#A20000' : '#8C8C8C',
								}}
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

								// Clear any existing timeout and interval
								if (confirmationTimeoutRef.current) {
									clearTimeout(confirmationTimeoutRef.current);
								}
								if (countdownIntervalRef.current) {
									clearInterval(countdownIntervalRef.current);
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
			// Clear any existing timeout and interval
			if (confirmationTimeoutRef.current) {
				clearTimeout(confirmationTimeoutRef.current);
			}
			if (countdownIntervalRef.current) {
				clearInterval(countdownIntervalRef.current);
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
