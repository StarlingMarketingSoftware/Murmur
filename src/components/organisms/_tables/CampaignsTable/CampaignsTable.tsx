import { FC, type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import CustomTable from '../../../molecules/CustomTable/CustomTable';
import { useCampaignsTable } from './useCampaignsTable';
import { X } from 'lucide-react';
import { Campaign } from '@prisma/client';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/utils';

export const CampaignsTable: FC = () => {
	// Treat all mobile orientations (portrait and landscape) as mobile for this table
	const isMobile = useIsMobile();
	const mobileTableWrapperRef = useRef<HTMLDivElement | null>(null);
	const mobileScrollWrapperRef = useRef<HTMLDivElement | null>(null);
	const mobileDeleteButtonsRef = useRef<HTMLDivElement | null>(null);
	const desktopMeasureRef = useRef<HTMLDivElement | null>(null);
	const [rowHeightsById, setRowHeightsById] = useState<Record<string | number, number>>(
		{}
	);
	const [desktopScale, setDesktopScale] = useState<number>(1);
	const [shouldScaleDesktopTable, setShouldScaleDesktopTable] = useState<boolean>(false);
	const [mobileScale, setMobileScale] = useState<number>(1);
	const [shouldScaleMobileTable, setShouldScaleMobileTable] = useState<boolean>(false);

	const shouldShowMobileFeatures = isMobile === true;
	// Detect landscape to decide whether to embed delete buttons back into rows
	const [isLandscape, setIsLandscape] = useState<boolean>(false);
	// Detect narrow desktop viewport (<=960px) for compact mode on desktop
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

	// Use compact metrics on mobile OR on narrow desktop (<=960px)
	const shouldUseCompactMetrics = shouldShowMobileFeatures || (!isMobile && isNarrowDesktop);

	const {
		data,
		isPending,
		columns,
		handleRowClick,
		handleDeleteClick,
		confirmingCampaignId,
	} = useCampaignsTable({ compactMetrics: shouldUseCompactMetrics });

	const metricsSkeletonContainerClassName = cn(
		'metrics-grid-container w-full items-center text-left',
		shouldUseCompactMetrics
			? 'flex flex-nowrap gap-[7px] justify-start'
			: 'flex flex-nowrap justify-start'
	);
	const metricsSkeletonContainerStyle: CSSProperties | undefined = shouldUseCompactMetrics
		? undefined
		: { gap: 'var(--campaign-metric-gap, 32px)' };
	const metricSlotClassName = cn(
		'campaign-metric-slot relative flex items-center',
		shouldUseCompactMetrics
			? 'w-auto flex-shrink-0 justify-start'
			: 'h-[20px] w-[94px] flex-none justify-center'
	);
	const metricBoxSkeletonClassName =
		'metric-box inline-flex items-center justify-center border border-[#8C8C8C] leading-none truncate h-[20px] w-[92px] min-w-[92px] max-w-[92px] rounded-[6px] px-0 flex-none bg-black/10 animate-pulse';

	// No orientation gating; we rely on device detection so landscape uses mobile layout too

	// Ultra-narrow desktop: measure available width and scale the table as a whole instead of
	// letting it reflow into an unusable compressed layout.
	useEffect(() => {
		if (typeof window === 'undefined') return;

		const el = desktopMeasureRef.current;
		if (!el || !('ResizeObserver' in window)) return;

		const DESKTOP_BASE_WIDTH = 460; // designed minimum width for narrow-desktop table
		const DESKTOP_MIN_SCALE = 0.62; // prevent extreme unreadability on ultra-narrow widths

		// Mobile: once the container gets under 388px, keep the table layout at 388px and
		// scale it down as one whole object (instead of squeezing columns).
		const MOBILE_BASE_WIDTH = 388;
		const MOBILE_MIN_SCALE = 0.7;

		let raf: number | null = null;
		const update = () => {
			if (raf !== null) cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const available = el.clientWidth;
				if (!available || available <= 0) return;

				if (shouldShowMobileFeatures) {
					const shouldScale = available < MOBILE_BASE_WIDTH;
					const nextScale = shouldScale
						? Math.max(MOBILE_MIN_SCALE, Math.min(1, available / MOBILE_BASE_WIDTH))
						: 1;

					setShouldScaleMobileTable(shouldScale);
					setMobileScale((prev) => (Math.abs(prev - nextScale) > 0.01 ? nextScale : prev));

					// Reset desktop scaling state while in mobile mode
					setShouldScaleDesktopTable(false);
					setDesktopScale(1);
				} else {
					const shouldScale = available < DESKTOP_BASE_WIDTH;
					const nextScale = shouldScale
						? Math.max(DESKTOP_MIN_SCALE, Math.min(1, available / DESKTOP_BASE_WIDTH))
						: 1;

					setShouldScaleDesktopTable(shouldScale);
					setDesktopScale((prev) =>
						Math.abs(prev - nextScale) > 0.01 ? nextScale : prev
					);

					// Reset mobile scaling state while in desktop mode
					setShouldScaleMobileTable(false);
					setMobileScale(1);
				}
			});
		};

		update();
		const ro = new ResizeObserver(() => update());
		ro.observe(el);

		return () => {
			if (raf !== null) cancelAnimationFrame(raf);
			ro.disconnect();
		};
	}, [shouldShowMobileFeatures]);

	useLayoutEffect(() => {
		if (typeof window === 'undefined' || !shouldUseExternalDeleteColumn) {
			return;
		}

		const containerEl = mobileTableWrapperRef.current;
		if (!containerEl) {
			return;
		}

		// If the entire table is being scaled down, measurements from getBoundingClientRect()
		// are also scaled. We store unscaled measurements so the delete buttons remain aligned
		// after the same scale is applied to them.
		const measurementScale = shouldScaleMobileTable ? mobileScale : 1;

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
				const unscaledOffset =
					measurementScale !== 1 ? offset / measurementScale : offset;
				containerEl.style.setProperty('--delete-column-top', `${unscaledOffset}px`);

				// Measure each row height and store by campaign id for per-button height
				const rows = containerEl.querySelectorAll('.my-campaigns-table tbody tr');
				const nextHeights: Record<string | number, number> = {};
				rows.forEach((r) => {
					const el = r as HTMLElement;
					const idAttr = el.getAttribute('data-campaign-id');
					if (!idAttr) return;
					const rect = el.getBoundingClientRect();
					const unscaledHeight =
						measurementScale !== 1 ? rect.height / measurementScale : rect.height;
					nextHeights[idAttr] = Math.max(Math.round(unscaledHeight), 44);
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
	}, [
		shouldUseExternalDeleteColumn,
		data?.length,
		rowHeightsById,
		shouldScaleMobileTable,
		mobileScale,
	]);

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

	const campaignsTableScale = shouldScaleDesktopTable
		? desktopScale
		: shouldScaleMobileTable
			? mobileScale
			: 1;

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
					<div
						className="campaigns-table-container"
						id="campaigns-table-container"
						ref={desktopMeasureRef}
						data-ultra-narrow-scale={shouldScaleDesktopTable ? 'true' : undefined}
						data-mobile-ultra-narrow-scale={shouldScaleMobileTable ? 'true' : undefined}
						style={
							{
								['--campaigns-table-scale' as never]: campaignsTableScale,
							} as React.CSSProperties
						}
					>
						{shouldShowMobileFeatures ? (
							// Mobile portrait mode: wrapper scroll container with table, and delete buttons outside
							<div className="mobile-campaigns-outer-container">
								<div className="mobile-scroll-wrapper" ref={mobileScrollWrapperRef}>
									<div className="mobile-table-wrapper" ref={mobileTableWrapperRef}>
							<CustomTable
								variant="secondary"
								containerClassName="my-campaigns-table mobile-table-no-scroll !bg-[#EDEDED]"
								headerClassName="[&_tr]:!bg-[#EDEDED] [&_th]:!bg-[#EDEDED] [&_th]:!border-b-[#EDEDED] [&_th]:relative [&_th]:!overflow-visible"
								rowClassName="!bg-[#EDEDED] !border-b-[#EDEDED] hover:!bg-[#E0E0E0] transition-colors duration-200"
											renderLoadingCell={({ column }) => {
												if (column.id === 'metrics') {
													return (
														<div
															className={metricsSkeletonContainerClassName}
															style={metricsSkeletonContainerStyle}
														>
															<div className={metricSlotClassName}>
																<div
																	data-draft-fill="skeleton"
																	className={metricBoxSkeletonClassName}
																/>
															</div>
															<div className={metricSlotClassName}>
																<div
																	data-sent-fill="skeleton"
																	className={metricBoxSkeletonClassName}
																/>
															</div>
															<div className={metricSlotClassName}>
																<div
																	data-updated-fill="skeleton"
																	className={metricBoxSkeletonClassName}
																/>
															</div>
															<div className={metricSlotClassName}>
																<div
																	data-created-fill="skeleton"
																	className={metricBoxSkeletonClassName}
																/>
															</div>
														</div>
													);
												}

												if (column.id === 'delete') {
													return (
														<div className="flex justify-end">
															<div className="h-[20px] w-[20px] rounded-[4px] bg-black/10 animate-pulse" />
														</div>
													);
												}

												return (
													<div className="flex items-center">
														<div className="h-[16px] w-[70%] rounded bg-black/10 animate-pulse" />
													</div>
												);
											}}
											handleRowClick={handleRowClick}
											columns={
												shouldUseExternalDeleteColumn
													? columns.filter((col) => col.id !== 'delete')
													: columns
											}
											data={data}
											isLoading={isPending}
											loadingRowCount={6}
											noDataMessage="Start Your First Campaign"
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
								headerClassName="[&_tr]:!bg-white [&_th]:!bg-white [&_th]:!border-0 [&_th]:!h-[28px] [&_tr]:!h-[28px] [&_th:first-child]:rounded-tl-[4px] [&_th:last-child]:rounded-tr-[4px] [&_th]:relative [&_th]:!overflow-visible"
								rowClassName="!bg-[#EDEDED] !border-0 hover:!bg-[#E0E0E0] transition-colors duration-200"
								renderLoadingCell={({ column }) => {
									if (column.id === 'metrics') {
										return (
											<div
												className={metricsSkeletonContainerClassName}
												style={metricsSkeletonContainerStyle}
											>
												<div className={metricSlotClassName}>
													<div
														data-draft-fill="skeleton"
														className={metricBoxSkeletonClassName}
													/>
												</div>
												<div className={metricSlotClassName}>
													<div
														data-sent-fill="skeleton"
														className={metricBoxSkeletonClassName}
													/>
												</div>
												<div className={metricSlotClassName}>
													<div
														data-updated-fill="skeleton"
														className={metricBoxSkeletonClassName}
													/>
												</div>
												<div className={metricSlotClassName}>
													<div
														data-created-fill="skeleton"
														className={metricBoxSkeletonClassName}
													/>
												</div>
											</div>
										);
									}

									if (column.id === 'delete') {
										return (
											<div className="flex justify-end">
												<div className="h-[20px] w-[20px] rounded-[4px] bg-black/10 animate-pulse" />
											</div>
										);
									}

									return (
										<div className="flex items-center">
											<div className="h-[16px] w-[70%] rounded bg-black/10 animate-pulse" />
										</div>
									);
								}}
								handleRowClick={handleRowClick}
								columns={columns}
								data={data}
								isLoading={isPending}
								loadingRowCount={6}
								noDataMessage="Start Your First Campaign"
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
