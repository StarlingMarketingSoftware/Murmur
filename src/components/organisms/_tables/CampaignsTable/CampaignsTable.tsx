import { FC, useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import CustomTable from '../../../molecules/CustomTable/CustomTable';
import { useCampaignsTable } from './useCampaignsTable';
import { X } from 'lucide-react';

export const CampaignsTable: FC = () => {
	const [isMobilePortrait, setIsMobilePortrait] = useState<boolean | null>(null);

	const shouldShowMobileFeatures = isMobilePortrait === true;

	const {
		data,
		isPending,
		columns,
		handleRowClick,
		handleDeleteClick,
		confirmingCampaignId,
	} = useCampaignsTable({ compactMetrics: shouldShowMobileFeatures });

	// Refs for measuring and syncing external delete buttons
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [buttonPositions, setButtonPositions] = useState<
		Array<{ id: number; top: number }>
	>([]);
	const [overlayLeft, setOverlayLeft] = useState<number>(0);
	const [overlayTop, setOverlayTop] = useState<number>(0);
	const [maskHeight, setMaskHeight] = useState<number>(0);
	const overlayRef = useRef<HTMLDivElement | null>(null);

	// Constants for table layout (kept as defaults, but we now measure DOM for accuracy)
	//	const HEADER_HEIGHT = 41;

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

	// During SSR or initial client render, render without mobile-specific features
	// On mobile portrait, hide table delete column and use external overlay
	const shouldHideDeleteColumn = shouldShowMobileFeatures;
	const enableExternalOverlay = shouldShowMobileFeatures;

	// Build external delete buttons aligned to each row (mobile portrait only)
	useEffect(() => {
		if (!enableExternalOverlay) return;
		if (!shouldShowMobileFeatures) {
			setButtonPositions([]);
			return;
		}

		const container = containerRef.current;
		if (!container) return;

		// Support both native scroll container structure and potential nested one
		const scrollEl =
			(container.querySelector(
				'.my-campaigns-table > .overflow-y-auto'
			) as HTMLDivElement | null) ||
			(container.querySelector('.my-campaigns-table') as HTMLDivElement | null);
		if (!scrollEl) return;

		let raf = 0;

		const computeLayout = () => {
			if (!container) return;
			const containerRect = container.getBoundingClientRect();
			const scrollRect = scrollEl.getBoundingClientRect();
			const thead = scrollEl.querySelector('thead') as HTMLElement | null;
			const headerHeight = thead?.getBoundingClientRect().height ?? 0;
			const overlayBaseTop = Math.max(0, scrollRect.top - containerRect.top);
			// Anchor the overlay to the top of the first row (below sticky header)
			setOverlayTop(overlayBaseTop + headerHeight);
			// Mask should only cover the scrollable rows area (exclude header)
			setMaskHeight(Math.max(0, scrollRect.height - headerHeight));
			// place overlay just outside the table's right border
			const tableEl = container.querySelector(
				'.my-campaigns-table'
			) as HTMLDivElement | null;
			if (tableEl) {
				const tableRect = tableEl.getBoundingClientRect();
				const GAP_RIGHT = 40; // push clearly outside table border
				const left = Math.round(tableRect.right - containerRect.left + GAP_RIGHT);
				setOverlayLeft(left);
			}
			const tbodyEl = scrollEl.querySelector('tbody') as HTMLElement | null;
			const rows = Array.from(
				(tbodyEl || scrollEl).querySelectorAll<HTMLTableRowElement>('tr')
			);
			const positions: Array<{ id: number; top: number }> = [];
			const BUTTON_HALF_HEIGHT = 10; // 20px icon

			// Base offset to normalize offsetTop irrespective of table header
			const firstRowOffsetTop = rows.length > 0 ? rows[0].offsetTop : 0;

			for (const row of rows) {
				const idAttr = row.getAttribute('data-campaign-id');
				const idNum = idAttr ? Number(idAttr) : NaN;
				if (!Number.isFinite(idNum)) continue;
				// Use offsetTop to correlate with scroll content coordinates (robust to layout/zoom)
				const rowCenterWithinContent =
					row.offsetTop - firstRowOffsetTop + row.offsetHeight / 2;
				// Convert to overlay's coordinate space which starts below the header
				const topWithinContent = rowCenterWithinContent - BUTTON_HALF_HEIGHT;
				positions.push({ id: idNum, top: topWithinContent });
			}
			setButtonPositions(positions);
			// initialize transform based on current scrollTop for exact lockstep
			if (overlayRef.current) {
				overlayRef.current.style.transform = `translateY(${-scrollEl.scrollTop}px)`;
			}
		};

		const onScroll = () => {
			if (overlayRef.current) {
				overlayRef.current.style.transform = `translateY(${-scrollEl.scrollTop}px)`;
			}
		};

		const onResize = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(computeLayout);
		};

		computeLayout();
		scrollEl.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onResize);
		window.addEventListener('orientationchange', onResize);

		// Recompute when row sizes/content change
		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(computeLayout);
		});
		ro.observe(scrollEl);
		const tbodyEl = scrollEl.querySelector('tbody');
		if (tbodyEl) ro.observe(tbodyEl);

		const mo = new MutationObserver(() => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(computeLayout);
		});
		if (tbodyEl)
			mo.observe(tbodyEl, { childList: true, subtree: true, attributes: true });

		return () => {
			cancelAnimationFrame(raf);
			scrollEl.removeEventListener('scroll', onScroll as EventListener);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('orientationchange', onResize);
			ro.disconnect();
			mo.disconnect();
		};
	}, [enableExternalOverlay, shouldShowMobileFeatures, data]);

	return (
		<Card className="relative border-none bg-transparent w-full max-w-[1132px] mx-auto !p-0">
			{isPending && <Spinner size="medium" className="absolute top-2 right-2" />}
			<CardHeader className="px-4 pb-0 bg-transparent">
				<CardTitle
					className="text-left text-[14px] font-inter font-medium mb-0.5"
					variant="secondary"
					style={{ fontFamily: 'Inter, sans-serif' }}
				>
					My Campaigns
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2 w-full px-0 pb-6 pt-0">
				<div
					className={`mobile-campaigns-wrapper ${
						shouldShowMobileFeatures ? 'mobile-portrait-mode' : ''
					}`}
				>
					<div
						className="campaigns-table-container"
						id="campaigns-table-container"
						ref={containerRef}
					>
						<CustomTable
							variant="secondary"
							containerClassName="border-[2px] border-[#8C8C8C] rounded-[8px] my-campaigns-table"
							handleRowClick={handleRowClick}
							columns={
								shouldHideDeleteColumn
									? columns.filter((col) => col.id !== 'delete')
									: columns
							}
							data={data}
							noDataMessage="No campaigns found."
							rowsPerPage={100}
							displayRowsPerPage={false}
							constrainHeight
							hidePagination={true}
							searchable={false}
							useAutoLayout
							useCustomScrollbar={!shouldShowMobileFeatures}
							scrollbarOffsetRight={0}
							nativeScroll={shouldShowMobileFeatures}
						/>

						{shouldShowMobileFeatures &&
						enableExternalOverlay &&
						buttonPositions.length > 0 ? (
							<div
								className="mobile-delete-mask"
								style={{ left: overlayLeft, top: overlayTop, height: maskHeight }}
							>
								<div className="mobile-delete-buttons-container" ref={overlayRef}>
									{buttonPositions.map((bp) => (
										<button
											key={bp.id}
											type="button"
											aria-label="Delete campaign"
											className="mobile-external-delete-btn"
											style={{ top: `${bp.top}px` }}
											onClick={(e) =>
												handleDeleteClick(e as unknown as React.MouseEvent, bp.id)
											}
										>
											<X
												className="w-[20px] h-[20px]"
												style={{
													color: bp.id === confirmingCampaignId ? '#FFFFFF' : '#000000',
												}}
											/>
										</button>
									))}
								</div>
							</div>
						) : null}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
