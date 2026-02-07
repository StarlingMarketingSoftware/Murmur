import { Campaign } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { Typography } from '@/components/ui/typography';
import { CampaignTitlePills } from '@/components/molecules/CampaignTitlePills/CampaignTitlePills';
import { useDeleteCampaign, useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { cn, mmdd } from '@/utils';
import { useRowConfirmationAnimation } from '@/hooks/useRowConfirmationAnimation';
import DeleteXIcon from '@/components/atoms/svg/DeleteXIcon';

type CampaignWithCounts = Campaign & {
	draftCount?: number;
	sentCount?: number;
};

const useIsomorphicLayoutEffect =
	typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type MetricSortKey = 'drafts' | 'sent' | 'updated';
type MetricSortMode = 'desc' | 'asc';
type MetricSortState = { key: MetricSortKey; mode: MetricSortMode } | null;

const startOfDay = (d: Date) => {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
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

const getUpdatedLabel = (updatedAt: Date): string => {
	const now = startOfDay(new Date());
	const then = startOfDay(updatedAt);
	return now.getTime() === then.getTime() ? 'Today' : mmdd(updatedAt);
};

export const useCampaignsTable = (options?: { compactMetrics?: boolean }) => {
	const compactMetrics = options?.compactMetrics ?? false;
	const [confirmingCampaignId, setConfirmingCampaignId] = useState<number | null>(null);
	const [countdown, setCountdown] = useState<number>(5);
	const confirmationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const [metricSort, setMetricSort] = useState<MetricSortState>(null);
	const metricSortKey = metricSort?.key ?? null;
	const metricSortMode = metricSort?.mode ?? null;
	const isMetricSortActive = metricSort !== null;
	const metricSortRef = useRef<MetricSortState>(null);
	useEffect(() => {
		metricSortRef.current = metricSort;
	}, [metricSort]);

	const draftsHeaderButtonRef = useRef<HTMLButtonElement | null>(null);
	const setDraftsHeaderButtonRef = useCallback((el: HTMLButtonElement | null) => {
		draftsHeaderButtonRef.current = el;
	}, []);
	const sentHeaderButtonRef = useRef<HTMLButtonElement | null>(null);
	const setSentHeaderButtonRef = useCallback((el: HTMLButtonElement | null) => {
		sentHeaderButtonRef.current = el;
	}, []);
	const updatedHeaderButtonRef = useRef<HTMLButtonElement | null>(null);
	const setUpdatedHeaderButtonRef = useCallback((el: HTMLButtonElement | null) => {
		updatedHeaderButtonRef.current = el;
	}, []);

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

	// Keep the Drafts sort underline anchored to the bottom of the table container,
	// aligned with the Drafts header "pill" width.
	useIsomorphicLayoutEffect(() => {
		let raf1: number | null = null;
		let raf2: number | null = null;

		const cancelRafs = () => {
			if (raf1 !== null) cancelAnimationFrame(raf1);
			if (raf2 !== null) cancelAnimationFrame(raf2);
			raf1 = null;
			raf2 = null;
		};

		const update = () => {
			const btn =
				metricSortKey === 'sent'
					? sentHeaderButtonRef.current
					: metricSortKey === 'updated'
						? updatedHeaderButtonRef.current
					: metricSortKey === 'drafts'
						? draftsHeaderButtonRef.current
						: null;
			if (!btn) return;

			const container = btn.closest('.my-campaigns-table') as HTMLElement | null;
			if (!container) return;

			const headerGrid = btn.closest('.metrics-header-grid') as HTMLElement | null;

			const btnRect = btn.getBoundingClientRect();
			const containerRect = container.getBoundingClientRect();
			const headerTh = btn.closest('th') as HTMLElement | null;

			// If an ancestor scales the table (transform: scale OR CSS zoom), getBoundingClientRect()
			// reflects the visual size. We want the *layout* size for CSS positioning inside the same
			// scaled subtree, so compute a visual->layout scale factor. Prefer computed style widths
			// because offsetWidth reflects the *used* (flex-shrunk) layout size (which is what we want).
			const safeScale = (() => {
				if (btn.offsetWidth > 0) {
					const s = btnRect.width / btn.offsetWidth;
					if (Number.isFinite(s) && s > 0) return s;
				}
				return 1;
			})();

			const btnLeftInContainer = (btnRect.left - containerRect.left) / safeScale;
			const bottomLineLeft = btnLeftInContainer + 1;
			const metricBoxSelector =
				metricSortKey === 'sent'
					? ".metric-box[data-sent-fill]"
					: metricSortKey === 'updated'
						? ".metric-box[data-updated-fill]"
					: ".metric-box[data-draft-fill]";
			const metricBox =
				compactMetrics
					? (container.querySelector(metricBoxSelector) as HTMLElement | null)
					: null;
			const headerWidth = metricBox?.offsetWidth ?? btn.offsetWidth;

			const bottomLineWidth = Math.max(0, headerWidth - 2);

			container.style.setProperty('--drafts-sort-indicator-left', `${bottomLineLeft}px`);
			container.style.setProperty('--drafts-sort-indicator-width', `${bottomLineWidth}px`);

			// Header highlight follows the actual rendered Drafts header "pill" width at every breakpoint.
			// Use offsetLeft/offsetWidth to avoid computed-width vs flex-shrink mismatches.
			// Attach it to the <th> so it can fill the full header height.
			if (headerTh) {
				const gridLeftInTh = headerGrid ? headerGrid.offsetLeft : 0;
				const baseLeftInTh = gridLeftInTh + btn.offsetLeft;
				// In very narrow/compact layouts, the header label can be slightly wider than the
				// actual metric pill below (due to flex/text sizing). Prefer the real pill width
				// so the highlight never includes the inter-pill spacing at ~500px widths.
				headerTh.style.setProperty('--drafts-sort-highlight-left', `${baseLeftInTh}px`);
				headerTh.style.setProperty('--drafts-sort-highlight-width', `${headerWidth}px`);

				// Ascending indicator (36x2, BABABA) lives on the header <th> so it scrolls away with the header.
				// Align it to the "Drafts" text start (pl-2) or center in compact mode.
				const desiredAscWidth = 36;
				const ascWidth = Math.max(0, Math.min(desiredAscWidth, headerWidth - 2));
				const shouldCenterAsc = compactMetrics;
				const ascLeft = shouldCenterAsc
					? baseLeftInTh + (headerWidth - ascWidth) / 2
					: baseLeftInTh + 8; // Tailwind pl-2 = 8px, aligns to text start
				headerTh.style.setProperty('--drafts-sort-asc-left', `${ascLeft}px`);
				headerTh.style.setProperty('--drafts-sort-asc-width', `${ascWidth}px`);
			}
		};

		const scheduleUpdate = () => {
			// Run now, then on the next two frames. This catches layout changes that happen via
			// ResizeObserver + requestAnimationFrame (e.g., campaigns-table scaling/zoom).
			cancelRafs();
			update();
			raf1 = requestAnimationFrame(() => {
				update();
				raf2 = requestAnimationFrame(() => update());
			});
		};

		if (!isMetricSortActive) {
			const btn =
				draftsHeaderButtonRef.current ??
				sentHeaderButtonRef.current ??
				updatedHeaderButtonRef.current;
			const container = btn
				? (btn.closest('.my-campaigns-table') as HTMLElement | null)
				: null;
			if (container) {
				container.removeAttribute('data-drafts-sort-active');
				container.removeAttribute('data-drafts-sort-mode');
				container.style.removeProperty('--drafts-sort-indicator-left');
				container.style.removeProperty('--drafts-sort-indicator-width');
			}
			const headerTh = btn ? (btn.closest('th') as HTMLElement | null) : null;
			if (headerTh) {
				headerTh.style.removeProperty('--drafts-sort-highlight-left');
				headerTh.style.removeProperty('--drafts-sort-highlight-width');
				headerTh.style.removeProperty('--drafts-sort-asc-left');
				headerTh.style.removeProperty('--drafts-sort-asc-width');
			}
			cancelRafs();
			return;
		}

		const btn =
			metricSortKey === 'sent'
				? sentHeaderButtonRef.current
				: metricSortKey === 'updated'
					? updatedHeaderButtonRef.current
				: metricSortKey === 'drafts'
					? draftsHeaderButtonRef.current
					: null;
		if (!btn) return;
		const container = btn.closest('.my-campaigns-table') as HTMLElement | null;
		if (!container) return;

		container.setAttribute('data-drafts-sort-active', 'true');
		container.setAttribute('data-drafts-sort-mode', metricSortMode === 'asc' ? 'asc' : 'desc');
		scheduleUpdate();

		const handleResize = () => scheduleUpdate();
		window.addEventListener('resize', handleResize, { passive: true });

		const ro = new ResizeObserver(() => scheduleUpdate());
		ro.observe(container);

		// Watch the parent campaigns-table container for scale/zoom updates (style/attr changes),
		// since CSS zoom changes don't always trigger ResizeObserver on the table itself.
		const scaleContainer = container.closest('.campaigns-table-container') as HTMLElement | null;
		const mo =
			scaleContainer && 'MutationObserver' in window
				? new MutationObserver(() => scheduleUpdate())
				: null;
		if (scaleContainer && mo) {
			mo.observe(scaleContainer, {
				attributes: true,
				attributeFilter: ['style', 'data-ultra-narrow-scale', 'data-mobile-ultra-narrow-scale'],
			});
		}

		return () => {
			window.removeEventListener('resize', handleResize);
			ro.disconnect();
			mo?.disconnect();
			cancelRafs();
		};
	}, [isMetricSortActive, metricSortKey, metricSortMode, compactMetrics]);

	const columns: ColumnDef<CampaignWithCounts>[] = [
		{
			accessorKey: 'name',
			header: () => (
				<div className="text-left pl-0 font-inter font-medium text-[13px] text-black">
					Campaigns
				</div>
			),
			cell: ({ row }) => {
				const name: string = row.getValue('name');
				const isConfirming = row.original.id === confirmingCampaignId;
				return name ? (
					<div className="text-left pr-2">
						<div
							className={cn(
								'inline-flex box-border h-[20px] w-[204px] items-center rounded-[6px] pl-0 pr-[8px] campaign-name-text text-[15px] leading-[20px] font-normal text-black bg-white truncate',
								isConfirming && 'bg-transparent text-white'
							)}
							style={{ fontFamily: '"Times New Roman", Times, serif' }}
						>
							{isConfirming ? (
								<span className="truncate">{name}</span>
							) : (
								<CampaignTitlePills title={name} size="table" />
							)}
						</div>
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
			// This is a "display" column visually, but we still provide an accessor so TanStack
			// treats it as sortable (we sort by Drafts or Sent when their headers are clicked).
			accessorFn: (row) =>
				(metricSortKey === 'sent'
					? (row as CampaignWithCounts)?.sentCount
					: metricSortKey === 'updated'
						? new Date((row as CampaignWithCounts)?.updatedAt as unknown as string | number | Date)
								.getTime()
					: (row as CampaignWithCounts)?.draftCount) ?? 0,
			enableSorting: true,
			// Sort campaigns by Drafts or Sent, depending on which header is active.
			sortingFn: (rowA, rowB) => {
				const aRow = rowA.original as CampaignWithCounts;
				const bRow = rowB.original as CampaignWithCounts;
				const sortKey = metricSortRef.current?.key ?? metricSortKey ?? 'drafts';
				const a =
					sortKey === 'sent'
						? aRow?.sentCount ?? 0
						: sortKey === 'updated'
							? new Date(aRow?.updatedAt as unknown as string | number | Date).getTime() || 0
							: aRow?.draftCount ?? 0;
				const b =
					sortKey === 'sent'
						? bRow?.sentCount ?? 0
						: sortKey === 'updated'
							? new Date(bRow?.updatedAt as unknown as string | number | Date).getTime() || 0
							: bRow?.draftCount ?? 0;
				return a === b ? 0 : a > b ? 1 : -1;
			},
			header: ({ column, table }) => {
				const highlightColor =
					metricSortKey === 'updated'
						? '#FFA3A3'
						: metricSortKey === 'sent'
							? '#B4E8A8'
							: '#FFDA8F';

				return (
				<>
					{isMetricSortActive ? (
						<span
							aria-hidden="true"
							className="absolute top-0 bottom-0 pointer-events-none z-0"
							style={
								{
									left: 'var(--drafts-sort-highlight-left, 0px)',
									width: 'var(--drafts-sort-highlight-width, 80px)',
									backgroundColor: highlightColor,
								} as React.CSSProperties
							}
						/>
					) : null}
					<div
						className={cn(
							'metrics-header-grid w-full h-full items-center relative z-[1]',
							compactMetrics
								? 'flex flex-nowrap gap-[7px] justify-start'
								: 'flex flex-nowrap justify-end'
						)}
						style={
							compactMetrics
								? undefined
								: ({ gap: 'var(--campaign-metric-gap, 32px)' } as React.CSSProperties)
						}
					>
					<button
						type="button"
						ref={setDraftsHeaderButtonRef}
						onClick={(e) => {
							e.stopPropagation();
							// Toggle (Drafts):
							// 1) desc (highest → lowest) with bottom indicator line
							// 2) asc (lowest → highest) with top (36px) indicator line
							// 3) default state (no sorting / no highlight)
							const next: MetricSortState =
								metricSortKey !== 'drafts'
									? { key: 'drafts', mode: 'desc' }
									: metricSortMode === 'desc'
										? { key: 'drafts', mode: 'asc' }
										: null;

							metricSortRef.current = next;
							setMetricSort(next);
							if (next === null) {
								table.setSorting([]);
							} else {
								table.setSorting([{ id: column.id, desc: next.mode === 'desc' }]);
							}
						}}
						className={cn(
							'metrics-header-label relative z-[1] cursor-pointer select-none border-0 bg-transparent p-0 m-0',
							!compactMetrics &&
									'flex w-[80px] min-w-[80px] max-w-[80px] items-center justify-start pl-2 text-left text-[13px] font-inter font-medium',
							compactMetrics &&
								'flex metric-width-short items-center justify-center text-[10px] font-medium tracking-[0.01em] metrics-header-label-compact'
						)}
						data-label="drafts"
						aria-pressed={metricSortKey === 'drafts'}
					>
						Drafts
					</button>
					<button
						type="button"
						ref={setSentHeaderButtonRef}
						onClick={(e) => {
							e.stopPropagation();
							// Toggle (Sent):
							// 1) desc (highest → lowest)
							// 2) asc (lowest → highest)
							// 3) default state (no sorting)
							const next: MetricSortState =
								metricSortKey !== 'sent'
									? { key: 'sent', mode: 'desc' }
									: metricSortMode === 'desc'
										? { key: 'sent', mode: 'asc' }
										: null;

							metricSortRef.current = next;
							setMetricSort(next);
							if (next === null) {
								table.setSorting([]);
							} else {
								table.setSorting([{ id: column.id, desc: next.mode === 'desc' }]);
							}
						}}
						className={cn(
							'metrics-header-label relative z-[1] cursor-pointer select-none border-0 bg-transparent p-0 m-0',
							!compactMetrics &&
									'flex w-[80px] min-w-[80px] max-w-[80px] items-center justify-start pl-2 text-left text-[13px] font-inter font-medium',
							compactMetrics &&
								'flex metric-width-short items-center justify-center text-[10px] font-medium tracking-[0.01em] metrics-header-label-compact'
						)}
						data-label="sent"
						aria-pressed={metricSortKey === 'sent'}
					>
						Sent
					</button>
					<button
						type="button"
						ref={setUpdatedHeaderButtonRef}
						onClick={(e) => {
							e.stopPropagation();
							// Toggle (Updated):
							// 1) desc (most recent → oldest)
							// 2) asc (oldest → most recent)
							// 3) default state (no sorting)
							const next: MetricSortState =
								metricSortKey !== 'updated'
									? { key: 'updated', mode: 'desc' }
									: metricSortMode === 'desc'
										? { key: 'updated', mode: 'asc' }
										: null;

							metricSortRef.current = next;
							setMetricSort(next);
							if (next === null) {
								table.setSorting([]);
							} else {
								table.setSorting([{ id: column.id, desc: next.mode === 'desc' }]);
							}
						}}
						className={cn(
							'metrics-header-label relative z-[1] cursor-pointer select-none border-0 bg-transparent p-0 m-0',
							!compactMetrics &&
								'flex w-[80px] min-w-[80px] max-w-[80px] items-center justify-start pl-2 text-left text-[13px] font-inter font-medium',
							compactMetrics &&
								'flex metric-width-long items-center justify-center text-center text-[10px] font-medium leading-[1.05] tracking-[0.01em] metrics-header-label-compact'
						)}
						data-label="updated"
						aria-pressed={metricSortKey === 'updated'}
					>
						Updated
					</button>
					</div>
				</>
				);
			},
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
												'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',
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
											? 'flex h-[20px] items-center justify-start text-[11px] uppercase tracking-[0.01em]'
											: 'text-[14px]'
									)}
								>
									Click to confirm <span className="ml-2">{countdown}</span>
								</div>
							</div>
							{[0, 1].map((index) => (
								<div
									key={index}
									className={cn(
										'flex items-center',
										compactMetrics
											? 'h-[20px] w-[80px] flex-none justify-center'
											: 'w-full'
									)}
								/>
							))}
						</div>
					);
				}

				const draftCount = campaign.draftCount ?? 0;
				const sentCount = campaign.sentCount ?? 0;
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
				const updatedLabel = getUpdatedLabel(updatedAt);

				return (
					<div
						className={cn(
							'metrics-grid-container w-full items-center text-left',
							compactMetrics
								? 'flex flex-nowrap gap-[7px] justify-start'
								: 'flex flex-nowrap justify-end'
						)}
						style={
							compactMetrics
								? undefined
								: ({ gap: 'var(--campaign-metric-gap, 32px)' } as React.CSSProperties)
						}
					>
						{[
							{
								label: draftDisplay,
								fill: draftFill,
								dataAttr: { 'data-draft-fill': draftFill } as Record<string, string>,
							},
							{
								label: sentDisplay,
								fill: sentFill,
								dataAttr: { 'data-sent-fill': sentFill } as Record<string, string>,
							},
							{
								label: updatedLabel,
								fill: updatedFill,
								dataAttr: { 'data-updated-fill': updatedFill } as Record<string, string>,
							},
						].map(({ label, fill, dataAttr }, index) => (
							<div
								key={index}
								className={cn(
									'campaign-metric-slot relative flex items-center',
									compactMetrics
										? 'w-auto flex-shrink-0 justify-start'
										: 'h-[20px] w-[80px] flex-none justify-center'
								)}
							>
								<div
									{...dataAttr}
									className={cn(
										'metric-box inline-flex box-border items-center justify-center border border-black leading-none truncate h-[20px] w-[80px] min-w-[80px] max-w-[80px] rounded-[6.5px] px-0 flex-none'
									)}
									style={
										{
											backgroundColor: isConfirming ? 'transparent' : fill,
											color: isConfirming ? 'white' : 'inherit',
											borderColor: isConfirming
												? '#A20000'
												: '#000000',
											...(compactMetrics
												? ({ fontSize: '12px' } as React.CSSProperties)
												: {}),
										} as React.CSSProperties
									}
								>
									{label}
								</div>
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
				<div className={cn("flex justify-end transition-opacity duration-75", !isConfirming && "opacity-0 group-hover:opacity-100")}>
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
							<DeleteXIcon
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
