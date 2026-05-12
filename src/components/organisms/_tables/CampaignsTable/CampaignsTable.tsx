import { FC, type CSSProperties, useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import CustomTable from '../../../molecules/CustomTable/CustomTable';
import { useCampaignsTable } from './useCampaignsTable';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/utils';

export type CampaignsMockFolder = {
	name?: string;
	draftCount?: number;
	sentCount?: number;
	updatedDaysAgo?: number;
	newEmailCount?: number;
};

export type CampaignsMockState = {
	folders?: CampaignsMockFolder[];
};

type CampaignsTableProps = {
	mockState?: CampaignsMockState;
};

export const CampaignsTable: FC<CampaignsTableProps> = ({ mockState }) => {
	// Treat all mobile orientations (portrait and landscape) as mobile for this table
	const isMobile = useIsMobile();
	const desktopMeasureRef = useRef<HTMLDivElement | null>(null);
	const [desktopScale, setDesktopScale] = useState<number>(1);
	const [shouldScaleDesktopTable, setShouldScaleDesktopTable] = useState<boolean>(false);
	const [mobileScale, setMobileScale] = useState<number>(1);
	const [shouldScaleMobileTable, setShouldScaleMobileTable] = useState<boolean>(false);

	const shouldShowMobileFeatures = isMobile === true;
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

	// Use compact metrics on mobile OR on narrow desktop (<=960px)
	const shouldUseCompactMetrics = shouldShowMobileFeatures || (!isMobile && isNarrowDesktop);

	const {
		data,
		isPending,
		columns,
		handleRowClick,
	} = useCampaignsTable({ compactMetrics: shouldUseCompactMetrics, mockState });

	const metricsSkeletonContainerClassName = cn(
		'metrics-grid-container w-full items-center text-left',
		shouldUseCompactMetrics
			? 'flex flex-nowrap gap-[7px] justify-start'
			: 'flex flex-nowrap justify-end'
	);
	const metricsSkeletonContainerStyle: CSSProperties | undefined = shouldUseCompactMetrics
		? undefined
		: { gap: 'var(--campaign-metric-gap, 32px)' };
	const metricSlotClassName = cn(
		'campaign-metric-slot relative flex items-center',
		shouldUseCompactMetrics
			? 'w-auto flex-shrink-0 justify-start'
			: 'h-[20px] w-[80px] flex-none justify-center'
	);
	const metricBoxSkeletonClassName =
		'metric-box inline-flex box-border items-center justify-center border border-black leading-none truncate h-[20px] w-[80px] min-w-[80px] max-w-[80px] rounded-[6.5px] px-0 flex-none bg-black/10 animate-pulse';

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
						Folders
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
							<div className="mobile-campaigns-outer-container">
								<div className="mobile-scroll-wrapper">
									<div className="mobile-table-wrapper">
										<CustomTable
											variant="secondary"
											containerClassName="my-campaigns-table mobile-table-no-scroll !bg-[#F8F8F8]"
											headerClassName="!bg-white [&_tr]:!bg-white [&_th]:!bg-white [&_th]:!border-b-[#F8F8F8] [&_th]:relative [&_th]:!overflow-visible"
											rowClassName="!bg-transparent !border-b-[#F8F8F8] hover:!bg-[#F0F0F0] transition-colors duration-200 group"
											renderLoadingCell={({ column }) => {
												if (column.id === 'metrics') {
													return (
														<div
															className={metricsSkeletonContainerClassName}
															style={metricsSkeletonContainerStyle}
														>
															<div className={metricSlotClassName}>
																<div
																	data-new-fill="skeleton"
																	className={metricBoxSkeletonClassName}
																/>
															</div>
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
							</div>
						) : (
							<CustomTable
								variant="secondary"
								containerClassName={`border-none rounded-[12px] my-campaigns-table !bg-[#F8F8F8] !mx-auto !p-[8px] ${
									isNarrowDesktop ? 'narrow-desktop-table' : ''
								}`}
								headerClassName="!bg-white [&_tr]:!bg-white [&_th]:!bg-white [&_th]:!border-0 [&_th]:!h-[28px] [&_tr]:!h-[28px] [&_th:first-child]:rounded-tl-[8px] [&_th:last-child]:rounded-tr-[8px] [&_th]:relative [&_th]:!overflow-visible"
								rowClassName="!bg-transparent !border-0 hover:!bg-[#F0F0F0] transition-colors duration-200 group"
								renderLoadingCell={({ column }) => {
									if (column.id === 'metrics') {
										return (
											<div
												className={metricsSkeletonContainerClassName}
												style={metricsSkeletonContainerStyle}
											>
												<div className={metricSlotClassName}>
													<div
														data-new-fill="skeleton"
														className={metricBoxSkeletonClassName}
													/>
												</div>
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
