import { FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import CustomTable from '../../../molecules/CustomTable/CustomTable';
import { useCampaignsTable } from './useCampaignsTable';
import { X } from 'lucide-react';
import { Campaign } from '@prisma/client';

export const CampaignsTable: FC = () => {
	const [isMobilePortrait, setIsMobilePortrait] = useState<boolean | null>(null);
	const mobileTableWrapperRef = useRef<HTMLDivElement | null>(null);
	const mobileScrollWrapperRef = useRef<HTMLDivElement | null>(null);
	const mobileDeleteButtonsRef = useRef<HTMLDivElement | null>(null);
	const [rowHeightsById, setRowHeightsById] = useState<Record<string | number, number>>(
		{}
	);

	const shouldShowMobileFeatures = isMobilePortrait === true;

	const {
		data,
		isPending,
		columns,
		handleRowClick,
		handleDeleteClick,
		confirmingCampaignId,
	} = useCampaignsTable({ compactMetrics: shouldShowMobileFeatures });

	// Check if we're in mobile portrait mode
	useEffect(() => {
		const checkOrientation = () => {
			const isPortrait = window.innerHeight > window.innerWidth;
			const isMobile = window.innerWidth <= 640;
			setIsMobilePortrait(isPortrait && isMobile);
		};

		checkOrientation();
		window.addEventListener('resize', checkOrientation);
		window.addEventListener('orientationchange', checkOrientation);

		return () => {
			window.removeEventListener('resize', checkOrientation);
			window.removeEventListener('orientationchange', checkOrientation);
		};
	}, []);

	useLayoutEffect(() => {
		if (typeof window === 'undefined' || !shouldShowMobileFeatures) {
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
	}, [shouldShowMobileFeatures, data?.length, rowHeightsById]);

	// Synchronize scrolling between table wrapper and delete buttons
	useEffect(() => {
		if (!shouldShowMobileFeatures) return;

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
	}, [shouldShowMobileFeatures, data?.length]);

	return (
		<Card className="relative border-none bg-transparent w-full max-w-[1132px] mx-auto !p-0">
			{isPending && <Spinner size="medium" className="absolute top-2 right-2" />}
			<CardHeader
				className={`bg-transparent ${
					shouldShowMobileFeatures ? 'mobile-portrait-card-header' : 'px-4 pb-0'
				}`}
			>
				<CardTitle
					className={`text-left ${
						shouldShowMobileFeatures
							? 'mobile-portrait-card-title'
							: 'text-[14px] font-inter font-medium mb-0.5'
					}`}
					variant="secondary"
				>
					{shouldShowMobileFeatures ? 'Your Campaigns' : 'My Campaigns'}
				</CardTitle>
			</CardHeader>
			<CardContent
				className={`w-full px-0 pb-6 pt-0 ${
					shouldShowMobileFeatures ? 'mobile-portrait-card-content' : 'space-y-2'
				}`}
			>
				<div
					className={`mobile-campaigns-wrapper ${
						shouldShowMobileFeatures ? 'mobile-portrait-mode' : ''
					}`}
				>
					<div className="campaigns-table-container" id="campaigns-table-container">
						{shouldShowMobileFeatures ? (
							// Mobile portrait mode: wrapper scroll container with table, and delete buttons outside
							<div className="mobile-campaigns-outer-container">
								<div className="mobile-scroll-wrapper" ref={mobileScrollWrapperRef}>
									<div className="mobile-table-wrapper" ref={mobileTableWrapperRef}>
										<CustomTable
											variant="secondary"
											containerClassName="my-campaigns-table mobile-table-no-scroll"
											handleRowClick={handleRowClick}
											columns={columns.filter((col) => col.id !== 'delete')}
											data={data}
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
								{data && data.length > 0 && (
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
								containerClassName="border-[2px] border-[#000000] rounded-[8px] my-campaigns-table"
								handleRowClick={handleRowClick}
								columns={columns}
								data={data}
								noDataMessage="No campaigns found."
								rowsPerPage={100}
								displayRowsPerPage={false}
								constrainHeight
								hidePagination={true}
								searchable={false}
								useAutoLayout
								useCustomScrollbar={true}
								scrollbarOffsetRight={0}
								nativeScroll={false}
							/>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
