import { FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import CustomTable from '../../../molecules/CustomTable/CustomTable';
import { useCampaignsTable } from './useCampaignsTable';
import { X } from 'lucide-react';
import { Campaign } from '@prisma/client';
import { useIsMobile } from '@/hooks/useIsMobile';

export const CampaignsTable: FC = () => {
	// Treat all mobile orientations (portrait and landscape) as mobile for this table
	const isMobile = useIsMobile();
	const mobileTableWrapperRef = useRef<HTMLDivElement | null>(null);
	const mobileScrollWrapperRef = useRef<HTMLDivElement | null>(null);
	const mobileDeleteButtonsRef = useRef<HTMLDivElement | null>(null);
	const [rowHeightsById, setRowHeightsById] = useState<Record<string | number, number>>(
		{}
	);

	const shouldShowMobileFeatures = isMobile === true;
	// Detect landscape to decide whether to embed delete buttons back into rows
	const [isLandscape, setIsLandscape] = useState<boolean>(false);
	// Detect narrow desktop viewport (<=630px) for compact mode on desktop
	const [isNarrowDesktop, setIsNarrowDesktop] = useState<boolean>(false);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(orientation: landscape)');
		const handleChange = (ev: MediaQueryListEvent) => setIsLandscape(ev.matches);
		// Initialize from current state
		setIsLandscape(mq.matches);
		if (typeof mq.addEventListener === 'function') {
			mq.addEventListener('change', handleChange);
		} else if (typeof mq.addListener === 'function') {
			mq.addListener(handleChange);
		}
		return () => {
			if (typeof mq.removeEventListener === 'function') {
				mq.removeEventListener('change', handleChange);
			} else if (typeof mq.removeListener === 'function') {
				mq.removeListener(handleChange);
			}
		};
	}, []);

	// Detect narrow desktop viewport (<=960px) for compact metrics on desktop
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const checkNarrowDesktop = () => {
			setIsNarrowDesktop(window.innerWidth <= 960);
		};
		checkNarrowDesktop();
		window.addEventListener('resize', checkNarrowDesktop);
		return () => window.removeEventListener('resize', checkNarrowDesktop);
	}, []);

	// Only use the external delete overlay in portrait; in landscape place delete inside each row
	const shouldUseExternalDeleteColumn = shouldShowMobileFeatures && !isLandscape;

	// Use compact metrics on mobile OR on narrow desktop (<=630px)
	const shouldUseCompactMetrics = shouldShowMobileFeatures || (!isMobile && isNarrowDesktop);

	const {
		data,
		isPending,
		columns,
		handleRowClick,
		handleDeleteClick,
		confirmingCampaignId,
	} = useCampaignsTable({ compactMetrics: shouldUseCompactMetrics });

	// No orientation gating; we rely on device detection so landscape uses mobile layout too

	useLayoutEffect(() => {
		if (typeof window === 'undefined' || !shouldUseExternalDeleteColumn) {
			return;
		}

		const containerEl = mobileTableWrapperRef.current;
		if (!containerEl) {
			return;
		}

		let resizeObserver: ResizeObserver | null = null;
		let frameId: number | null = null;

		const updateMeasurements = () => {
			if (frameId !== null) {
				window.cancelAnimationFrame(frameId);
			}
			frameId = window.requestAnimationFrame(() => {
				const firstRow = containerEl.querySelector('.my-campaigns-table tbody tr');
				if (!firstRow) {
					containerEl.style.removeProperty('--delete-column-top');
					return;
				}

				const containerRect = containerEl.getBoundingClientRect();
				const rowRect = (firstRow as HTMLElement).getBoundingClientRect();
				const offset = Math.max(rowRect.top - containerRect.top, 0);
				containerEl.style.setProperty('--delete-column-top', `${offset}px`);

				// Measure each row height and store by campaign id for per-button height
				const rows = containerEl.querySelectorAll('.my-campaigns-table tbody tr');
				const nextHeights: Record<string | number, number> = {};
				rows.forEach((r) => {
					const el = r as HTMLElement;
					const idAttr = el.getAttribute('data-campaign-id');
					if (!idAttr) return;
					const rect = el.getBoundingClientRect();
					nextHeights[idAttr] = Math.max(Math.round(rect.height), 44);
				});

				// Shallow compare before updating state to avoid loops
				let changed = false;
				const keys = Object.keys(nextHeights);
				if (keys.length !== Object.keys(rowHeightsById).length) {
					changed = true;
				} else {
					for (const k of keys) {
						if (rowHeightsById[k as unknown as string] !== nextHeights[k]) {
							changed = true;
							break;
						}
					}
				}
				if (changed) {
					setRowHeightsById(nextHeights);
				}
			});
		};

		const handleResize = () => {
			updateMeasurements();
		};

		updateMeasurements();

		window.addEventListener('resize', handleResize);
		window.addEventListener('orientationchange', handleResize);

		const tableBody = containerEl.querySelector('.my-campaigns-table tbody');
		if (tableBody && 'ResizeObserver' in window) {
			resizeObserver = new ResizeObserver(() => updateMeasurements());
			resizeObserver.observe(tableBody);
		}

		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('orientationchange', handleResize);
			if (frameId !== null) {
				window.cancelAnimationFrame(frameId);
			}
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
			containerEl.style.removeProperty('--delete-column-top');
		};
	}, [shouldUseExternalDeleteColumn, data?.length, rowHeightsById]);

	// Synchronize scrolling between table wrapper and delete buttons
	useEffect(() => {
		if (!shouldUseExternalDeleteColumn) return;

		const scrollWrapper = mobileScrollWrapperRef.current;
		const deleteButtons = mobileDeleteButtonsRef.current;

		if (!scrollWrapper || !deleteButtons) return;

		let rafId: number | null = null;
		let isUpdating = false;

		const handleScrollWrapperScroll = () => {
			if (isUpdating) return;

			// Cancel any pending animation frame
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
			}

			// Immediately update the delete buttons position
			deleteButtons.scrollTop = scrollWrapper.scrollTop;

			// Use RAF to prevent recursive updates
			isUpdating = true;
			rafId = requestAnimationFrame(() => {
				isUpdating = false;
			});
		};

		const handleDeleteButtonsScroll = () => {
			if (isUpdating) return;

			// Cancel any pending animation frame
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
			}

			// Immediately update the scroll wrapper position
			scrollWrapper.scrollTop = deleteButtons.scrollTop;

			// Use RAF to prevent recursive updates
			isUpdating = true;
			rafId = requestAnimationFrame(() => {
				isUpdating = false;
			});
		};

		scrollWrapper.addEventListener('scroll', handleScrollWrapperScroll, {
			passive: true,
		});
		deleteButtons.addEventListener('scroll', handleDeleteButtonsScroll, {
			passive: true,
		});

		return () => {
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
			}
			scrollWrapper.removeEventListener('scroll', handleScrollWrapperScroll);
			deleteButtons.removeEventListener('scroll', handleDeleteButtonsScroll);
		};
	}, [shouldUseExternalDeleteColumn, data?.length]);

	if (isMobile === null) {
		return null;
	}

	return (
		<Card className="relative border-none bg-transparent w-full max-w-[1132px] mx-auto !p-0 !my-0">
			{isPending && <Spinner size="medium" className="absolute top-2 right-2" />}
			{shouldShowMobileFeatures && (
				<CardHeader className="bg-transparent mobile-portrait-card-header">
					<CardTitle
						className="text-left text-[10px] font-secondary font-medium"
						variant="secondary"
					>
						Your Campaigns
					</CardTitle>
				</CardHeader>
			)}
			<CardContent
				className={`w-full px-0 pt-0 ${
					shouldShowMobileFeatures ? 'pb-6 mobile-portrait-card-content' : 'pb-0'
				}`}
			>
				<div
					className={`mobile-campaigns-wrapper ${
						shouldShowMobileFeatures ? 'mobile-portrait-mode' : ''
					} ${shouldShowMobileFeatures && isLandscape ? 'mobile-landscape-mode' : ''}`}
				>
					<div className="campaigns-table-container" id="campaigns-table-container">
						{shouldShowMobileFeatures ? (
							// Mobile portrait mode: wrapper scroll container with table, and delete buttons outside
							<div className="mobile-campaigns-outer-container">
								<div className="mobile-scroll-wrapper" ref={mobileScrollWrapperRef}>
									<div className="mobile-table-wrapper" ref={mobileTableWrapperRef}>
							<CustomTable
								variant="secondary"
								containerClassName="my-campaigns-table mobile-table-no-scroll !bg-[#EDEDED]"
								headerClassName="[&_tr]:!bg-[#EDEDED] [&_th]:!bg-[#EDEDED] [&_th]:!border-b-[#EDEDED]"
								rowClassName="!bg-[#EDEDED] !border-b-[#EDEDED] hover:!bg-[#E0E0E0] transition-colors duration-200"
											handleRowClick={handleRowClick}
											columns={
												shouldUseExternalDeleteColumn
													? columns.filter((col) => col.id !== 'delete')
													: columns
											}
											data={data}
											isLoading={isPending}
											loadingRowCount={6}
											noDataMessage="No campaigns found."
											rowsPerPage={100}
											displayRowsPerPage={false}
											constrainHeight={false}
											hidePagination={true}
											searchable={false}
											useAutoLayout
											useCustomScrollbar={false}
											scrollbarOffsetRight={0}
											nativeScroll={false}
											stickyHeader={false}
										/>
									</div>
								</div>
								{shouldUseExternalDeleteColumn && data && data.length > 0 && (
									<div
										className="mobile-delete-buttons-external"
										ref={mobileDeleteButtonsRef}
									>
										{data.map((campaign: Campaign) => (
											<button
												key={campaign.id}
												type="button"
												aria-label="Delete campaign"
												className="mobile-delete-btn"
												style={{
													height: rowHeightsById[campaign.id]
														? `${rowHeightsById[campaign.id]}px`
														: undefined,
												}}
												data-campaign-id={campaign.id}
												onClick={(e) => handleDeleteClick(e, campaign.id)}
											>
												<X
													className="w-[20px] h-[20px]"
													style={{
														color:
															campaign.id === confirmingCampaignId
																? '#FFFFFF'
																: '#000000',
													}}
												/>
											</button>
										))}
									</div>
								)}
							</div>
						) : (
							// Desktop mode: normal table with delete column
							<CustomTable
								variant="secondary"
								containerClassName={`border-none rounded-[8px] my-campaigns-table !bg-[#EDEDED] !mx-auto !p-[6px] ${
									isNarrowDesktop ? 'narrow-desktop-table' : '!w-[891px]'
								}`}
								headerClassName="[&_tr]:!bg-white [&_th]:!bg-white [&_th]:!border-0 [&_th]:!h-[28px] [&_tr]:!h-[28px] [&_th:first-child]:rounded-tl-[4px] [&_th:last-child]:rounded-tr-[4px]"
								rowClassName="!bg-[#EDEDED] !border-0 hover:!bg-[#E0E0E0] transition-colors duration-200"
								handleRowClick={handleRowClick}
								columns={columns}
								data={data}
								isLoading={isPending}
								loadingRowCount={6}
								noDataMessage="No campaigns found."
								rowsPerPage={100}
								displayRowsPerPage={false}
								constrainHeight
								hidePagination={true}
								searchable={false}
								useAutoLayout
								useCustomScrollbar={true}
								scrollbarOffsetRight={-5}
								nativeScroll={false}
								stickyHeader={false}
							/>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
