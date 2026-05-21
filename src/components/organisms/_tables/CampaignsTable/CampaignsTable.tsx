import {
	FC,
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import CustomTable from '../../../molecules/CustomTable/CustomTable';
import { useCampaignsTable } from './useCampaignsTable';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/utils';
import type { CampaignDataTypeSummary } from '@/utils/campaignDataTypes';
import { CampaignApiError, useCreateCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useCreateUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { generateCampaignName } from '@/utils/campaignNames';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import { toast } from 'sonner';

const MAX_CAMPAIGNS = 5;
const CAMPAIGN_FINDER_MIN_HEIGHT = 415;
const CAMPAIGN_FINDER_MAX_HEIGHT = 415;
const CAMPAIGN_FINDER_VIEWPORT_BOTTOM_GAP = 0;

const AddCampaignPlusIcon = () => (
	<svg
		width={7}
		height={7}
		viewBox="0 0 7 7"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<path
			d="M3.5 0.75V6.25M0.75 3.5H6.25"
			stroke="currentColor"
			strokeWidth={1.5}
			strokeLinecap="round"
		/>
	</svg>
);

type CampaignFinderViewMode = 'single' | 'split';

type CampaignFinderTopBarProps = {
	searchValue: string;
	onSearchChange: (value: string) => void;
	viewMode: CampaignFinderViewMode;
	onToggleViewMode: () => void;
	splitPane?: 'left' | 'right';
};

const CampaignFinderTopBar = ({
	searchValue,
	onSearchChange,
	viewMode,
	onToggleViewMode,
	splitPane,
}: CampaignFinderTopBarProps) => {
	const nextViewMode = viewMode === 'single' ? 'split' : 'single';
	const showControls = splitPane !== 'left';

	return (
		<div
			className="campaign-finder-topbar"
			data-split-pane={splitPane}
			data-custom-table-ignore-row-click="true"
		>
			<div className="campaign-finder-topbar-brand">MURMUR</div>
			{showControls ? (
				<>
					<button
						type="button"
						className="campaign-finder-view-control"
						data-custom-table-ignore-row-click="true"
						data-view-mode={viewMode}
						aria-pressed={viewMode === 'split'}
						aria-label={`Switch campaign finder to ${nextViewMode} view`}
						onClick={onToggleViewMode}
					>
						<div className="campaign-finder-view-icons">
							<span
								className={cn(
									'campaign-finder-view-icon',
									viewMode === 'single' && 'campaign-finder-view-icon-active'
								)}
							/>
							<span
								className={cn(
									'campaign-finder-view-icon campaign-finder-view-icon-split',
									viewMode === 'split' && 'campaign-finder-view-icon-active'
								)}
							/>
						</div>
						<span className="campaign-finder-view-label">View</span>
					</button>
					<div className="campaign-finder-topbar-search">
						<SearchIconDesktop
							width={18}
							height={20}
							stroke="#717171"
							strokeWidth={1.8}
						/>
						<input
							type="search"
							className="campaign-finder-topbar-search-input"
							aria-label="Search campaign contacts"
							placeholder="Search"
							value={searchValue}
							autoComplete="off"
							spellCheck={false}
							onChange={(event) => onSearchChange(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Escape' && searchValue) {
									event.preventDefault();
									onSearchChange('');
								}
							}}
						/>
						{searchValue ? (
							<button
								type="button"
								className="campaign-finder-topbar-search-clear"
								aria-label="Clear campaign contact search"
								onClick={() => onSearchChange('')}
							/>
						) : null}
					</div>
				</>
			) : null}
		</div>
	);
};

export type CampaignsMockFolder = {
	name?: string;
	draftCount?: number;
	sentCount?: number;
	updatedDaysAgo?: number;
	newEmailCount?: number;
	contactCount?: number;
	campaignDataTypes?: CampaignDataTypeSummary[];
};

export type CampaignsMockState = {
	folders?: CampaignsMockFolder[];
};

type CampaignsTableProps = {
	mockState?: CampaignsMockState;
	onMockStateChange?: (next: CampaignsMockState | undefined) => void;
	/** Called whenever the campaign finder (single or split) opens or closes. */
	onFinderOpenChange?: (isOpen: boolean) => void;
};

export const CampaignsTable: FC<CampaignsTableProps> = ({
	mockState,
	onMockStateChange,
	onFinderOpenChange,
}) => {
	// Treat all mobile orientations (portrait and landscape) as mobile for this table
	const isMobile = useIsMobile();
	const desktopMeasureRef = useRef<HTMLDivElement | null>(null);
	const [desktopScale, setDesktopScale] = useState<number>(1);
	const [shouldScaleDesktopTable, setShouldScaleDesktopTable] = useState<boolean>(false);
	const [mobileScale, setMobileScale] = useState<number>(1);
	const [shouldScaleMobileTable, setShouldScaleMobileTable] = useState<boolean>(false);
	const [leftFinderSearchQuery, setLeftFinderSearchQuery] = useState<string>('');
	const [rightFinderSearchQuery, setRightFinderSearchQuery] = useState<string>('');
	const [campaignFinderViewMode, setCampaignFinderViewMode] =
		useState<CampaignFinderViewMode>('single');
	const [campaignFinderHeight, setCampaignFinderHeight] = useState<number>(
		CAMPAIGN_FINDER_MIN_HEIGHT
	);
	const [pendingSplitFinderOpen, setPendingSplitFinderOpen] = useState<{
		campaignId: number;
		pane: 'left' | 'right';
	} | null>(null);

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
	const shouldUseCompactMetrics =
		shouldShowMobileFeatures || (!isMobile && isNarrowDesktop);
	const handleFinderOpenInNewTab = useCallback(
		(campaignId: number, sourcePane: 'left' | 'right') => {
			const targetPane = sourcePane === 'left' ? 'right' : 'left';

			setCampaignFinderViewMode('split');
			setPendingSplitFinderOpen({ campaignId, pane: targetPane });

			if (sourcePane === 'left') {
				setRightFinderSearchQuery(leftFinderSearchQuery);
				setLeftFinderSearchQuery('');
			} else {
				setLeftFinderSearchQuery(rightFinderSearchQuery);
				setRightFinderSearchQuery('');
			}
		},
		[leftFinderSearchQuery, rightFinderSearchQuery]
	);

	const leftCampaignsTable = useCampaignsTable({
		compactMetrics: shouldUseCompactMetrics,
		mockState,
		onMockStateChange,
		enableFinder: !shouldShowMobileFeatures,
		finderSearchQuery: leftFinderSearchQuery,
		onFinderOpenInNewTab: (campaignId) => handleFinderOpenInNewTab(campaignId, 'left'),
	});
	const rightCampaignsTable = useCampaignsTable({
		compactMetrics: shouldUseCompactMetrics,
		mockState,
		onMockStateChange,
		enableFinder: !shouldShowMobileFeatures,
		finderSearchQuery: rightFinderSearchQuery,
		onFinderOpenInNewTab: (campaignId) => handleFinderOpenInNewTab(campaignId, 'right'),
	});
	const {
		data,
		campaignRows: campaignDataRows,
		isPending,
		columns,
		handleRowClick,
	} = leftCampaignsTable;
	const closeRightFinder = rightCampaignsTable.closeFinder;
	const openLeftFinderForCampaign = leftCampaignsTable.openFinderForCampaign;
	const openRightFinderForCampaign = rightCampaignsTable.openFinderForCampaign;
	const { mutateAsync: createContactList, isPending: isPendingCreateContactList } =
		useCreateUserContactList({ suppressToasts: true });
	const { mutateAsync: createCampaign, isPending: isPendingCreateCampaign } =
		useCreateCampaign({ suppressToasts: true });
	const isAddingCampaign = isPendingCreateContactList || isPendingCreateCampaign;
	const campaignRows = Array.isArray(campaignDataRows) ? campaignDataRows : [];
	const campaignCount = campaignRows.length;
	const isSplitFinderView =
		!shouldShowMobileFeatures && campaignFinderViewMode === 'split';
	const leftFinderSearchActive = leftFinderSearchQuery.trim().length > 0;
	const rightFinderSearchActive = rightFinderSearchQuery.trim().length > 0;
	const activeFinderSearchPane: 'left' | 'right' | null = rightFinderSearchActive
		? 'right'
		: leftFinderSearchActive
			? 'left'
			: null;
	const isSplitFinderSearchActive = isSplitFinderView && activeFinderSearchPane !== null;
	const shouldRenderSplitFinderView = isSplitFinderView && !isSplitFinderSearchActive;
	const isFinderLayoutOpen = isSplitFinderView
		? leftCampaignsTable.isFinderOpen || rightCampaignsTable.isFinderOpen
		: leftCampaignsTable.isFinderOpen;

	// Notify parent when the finder open state changes.
	useEffect(() => {
		onFinderOpenChange?.(isFinderLayoutOpen);
		return () => {
			onFinderOpenChange?.(false);
		};
	}, [isFinderLayoutOpen, onFinderOpenChange]);

	const existingCampaignNames = campaignRows
		.map((campaign) => {
			const name = (campaign as { name?: unknown }).name;
			return typeof name === 'string' ? name : null;
		})
		.filter((name): name is string => Boolean(name));
	const shouldShowAddCampaignButton =
		!isPending &&
		!isFinderLayoutOpen &&
		!isSplitFinderView &&
		campaignCount < MAX_CAMPAIGNS;
	const campaignsTableScale = shouldScaleDesktopTable
		? desktopScale
		: shouldScaleMobileTable
			? mobileScale
			: 1;

	useEffect(() => {
		if (!pendingSplitFinderOpen) return;

		if (pendingSplitFinderOpen.pane === 'left') {
			openLeftFinderForCampaign(pendingSplitFinderOpen.campaignId);
		} else {
			openRightFinderForCampaign(pendingSplitFinderOpen.campaignId);
		}

		setPendingSplitFinderOpen(null);
	}, [openLeftFinderForCampaign, openRightFinderForCampaign, pendingSplitFinderOpen]);

	useEffect(() => {
		if (campaignFinderViewMode === 'split') {
			if (!leftCampaignsTable.isFinderOpen && !rightCampaignsTable.isFinderOpen) {
				setCampaignFinderViewMode('single');
			}

			if (!leftCampaignsTable.isFinderOpen && leftFinderSearchQuery) {
				setLeftFinderSearchQuery('');
			}

			if (!rightCampaignsTable.isFinderOpen && rightFinderSearchQuery) {
				setRightFinderSearchQuery('');
			}

			return;
		}

		if (!leftCampaignsTable.isFinderOpen && leftFinderSearchQuery) {
			setLeftFinderSearchQuery('');
		}

		if (rightCampaignsTable.isFinderOpen) {
			closeRightFinder();
		}

		if (rightFinderSearchQuery) {
			setRightFinderSearchQuery('');
		}
	}, [
		campaignFinderViewMode,
		closeRightFinder,
		leftCampaignsTable.isFinderOpen,
		leftFinderSearchQuery,
		rightCampaignsTable.isFinderOpen,
		rightFinderSearchQuery,
	]);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		if (!isFinderLayoutOpen || shouldShowMobileFeatures) {
			setCampaignFinderHeight(CAMPAIGN_FINDER_MIN_HEIGHT);
			return;
		}

		const el = desktopMeasureRef.current;
		if (!el) return;

		let raf: number | null = null;
		const update = () => {
			if (raf !== null) cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const rect = el.getBoundingClientRect();
				const scaleFromLayout =
					el.offsetWidth > 0 && rect.width > 0 ? rect.width / el.offsetWidth : 1;
				const tableScale = shouldScaleDesktopTable ? campaignsTableScale : 1;
				const scale = Math.max(0.1, scaleFromLayout * tableScale);
				const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
				const availableHeight =
					(viewportHeight - rect.top - CAMPAIGN_FINDER_VIEWPORT_BOTTOM_GAP) / scale;

				// Guard against NaN/infinity (can happen during layout/scale transitions).
				// If that occurs, fall back to the design height rather than letting NaN
				// propagate and blow the layout up.
				const boundedAvailableHeight = Number.isFinite(availableHeight)
					? Math.floor(availableHeight)
					: CAMPAIGN_FINDER_MAX_HEIGHT;
				const nextHeight = Math.min(
					CAMPAIGN_FINDER_MAX_HEIGHT,
					Math.max(CAMPAIGN_FINDER_MIN_HEIGHT, boundedAvailableHeight)
				);

				setCampaignFinderHeight((current) =>
					Math.abs(current - nextHeight) > 1 ? nextHeight : current
				);
			});
		};

		update();
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		window.visualViewport?.addEventListener('resize', update);
		const ro = 'ResizeObserver' in window ? new ResizeObserver(update) : null;
		ro?.observe(el);

		return () => {
			if (raf !== null) cancelAnimationFrame(raf);
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
			window.visualViewport?.removeEventListener('resize', update);
			ro?.disconnect();
		};
	}, [
		campaignsTableScale,
		isFinderLayoutOpen,
		shouldScaleDesktopTable,
		shouldShowMobileFeatures,
	]);

	const handleAddCampaign = async () => {
		if (isAddingCampaign || !shouldShowAddCampaignButton) return;

		const name = generateCampaignName(existingCampaignNames);

		if (mockState && onMockStateChange) {
			const folders = (mockState.folders ?? []).slice(0, MAX_CAMPAIGNS - 1);
			onMockStateChange({
				folders: [
					...folders,
					{
						name,
						draftCount: 0,
						sentCount: 0,
						updatedDaysAgo: 0,
						newEmailCount: 0,
						contactCount: 0,
					},
				],
			});
			return;
		}

		try {
			const contactList = await createContactList({ name, contactIds: [] });
			await createCampaign({
				name,
				userContactLists: [contactList.id],
			});
		} catch (error) {
			if (error instanceof CampaignApiError && error.code === 'CAMPAIGN_CAP_REACHED') {
				toast.error(
					error.message ||
						`You have reached the maximum of ${MAX_CAMPAIGNS} active campaigns. Delete one to create a new one.`
				);
				return;
			}

			toast.error('Could not create campaign. Please try again.');
		}
	};

	const addCampaignFooter = shouldShowAddCampaignButton ? (
		<div className="mt-[20px] flex w-full justify-center">
			<button
				type="button"
				onClick={handleAddCampaign}
				disabled={isAddingCampaign}
				aria-label="Add campaign"
				className="flex h-[17px] w-[calc(100%-30px)] max-w-[624px] items-center justify-center rounded-[6px] bg-[#EDEDED] text-black transition-colors duration-150 hover:bg-[#E2E2E2] active:bg-[#DADADA] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-[#EDEDED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
			>
				<AddCampaignPlusIcon />
			</button>
		</div>
	) : null;

	const renderCampaignLoadingCell = ({
		column,
	}: {
		column: { id: string };
		columnIndex: number;
	}) => {
		// Keep the campaigns table loading state very quiet: mostly blank rows,
		// with only a subtle name bar to suggest structure.
		if (column.id === 'metrics') {
			return <div className="h-3" />;
		}

		return (
			<div className="flex items-center">
				<div className="h-3 w-2/5 rounded bg-black/5" />
			</div>
		);
	};

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
					setMobileScale((prev) =>
						Math.abs(prev - nextScale) > 0.01 ? nextScale : prev
					);

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

	const handleToggleCampaignFinderViewMode = (sourcePane: 'left' | 'right' = 'left') => {
		if (campaignFinderViewMode === 'single') {
			if (leftCampaignsTable.openCampaignId !== null) {
				rightCampaignsTable.openFinderForCampaign(leftCampaignsTable.openCampaignId);
			}
			setRightFinderSearchQuery(leftFinderSearchQuery);
			setLeftFinderSearchQuery('');
			setCampaignFinderViewMode('split');
			return;
		}

		if (sourcePane === 'right' && rightCampaignsTable.openCampaignId !== null) {
			leftCampaignsTable.openFinderForCampaign(rightCampaignsTable.openCampaignId);
			setLeftFinderSearchQuery(rightFinderSearchQuery);
		}

		setCampaignFinderViewMode('single');
	};
	const clearFinderSearches = () => {
		setLeftFinderSearchQuery('');
		setRightFinderSearchQuery('');
	};

	const campaignsTableStyle = {
		['--campaigns-table-scale' as never]: campaignsTableScale,
		['--campaigns-finder-height' as never]: `${campaignFinderHeight}px`,
	} as CSSProperties;
	const singleFinderPane =
		isSplitFinderSearchActive && activeFinderSearchPane === 'right' ? 'right' : 'left';
	const singleCampaignsTable =
		singleFinderPane === 'right' ? rightCampaignsTable : leftCampaignsTable;
	const singleFinderSearchQuery =
		singleFinderPane === 'right' ? rightFinderSearchQuery : leftFinderSearchQuery;
	const setSingleFinderSearchQuery =
		singleFinderPane === 'right' ? setRightFinderSearchQuery : setLeftFinderSearchQuery;
	const finderTopContent = singleCampaignsTable.isFinderOpen ? (
		<CampaignFinderTopBar
			searchValue={singleFinderSearchQuery}
			onSearchChange={setSingleFinderSearchQuery}
			viewMode={isSplitFinderSearchActive ? 'single' : campaignFinderViewMode}
			onToggleViewMode={
				isSplitFinderSearchActive
					? clearFinderSearches
					: () => handleToggleCampaignFinderViewMode(singleFinderPane)
			}
		/>
	) : undefined;
	const renderDesktopCampaignsTable = (
		tableState: ReturnType<typeof useCampaignsTable>,
		topContent: ReactNode,
		splitPane?: 'left' | 'right'
	) => (
		<CustomTable
			variant="secondary"
			containerClassName={cn(
				'border-none rounded-[8px] my-campaigns-table desktop-campaigns-table !bg-[#F8F8F8] !mx-auto !py-[8px] !px-0 w-[654px] h-[253px]',
				isNarrowDesktop && 'narrow-desktop-table',
				(tableState.isFinderOpen || splitPane) && 'campaigns-finder-open',
				splitPane && 'campaign-finder-split-table',
				splitPane && `campaign-finder-split-table-${splitPane}`
			)}
			headerClassName="!bg-white [&_tr]:!bg-white [&_th]:!bg-white [&_th]:!border-0 [&_th]:!h-[28px] [&_tr]:!h-[28px] [&_th:first-child]:rounded-tl-[8px] [&_th:last-child]:rounded-tr-[8px] [&_th]:relative [&_th]:!overflow-visible"
			rowClassName="!bg-transparent !border-0 hover:!bg-transparent group"
			renderLoadingCell={renderCampaignLoadingCell}
			handleRowClick={tableState.handleRowClick}
			columns={tableState.columns}
			data={tableState.data}
			isLoading={tableState.isPending}
			loadingRowCount={6}
			noDataMessage="Start Your First Campaign"
			topContent={topContent}
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
			footerContent={splitPane ? null : addCampaignFooter}
		/>
	);

	return (
		<Card className="relative border-none bg-transparent w-full max-w-[1132px] mx-auto !p-0 !my-0">
			{(isPending || isAddingCampaign) && (
				<Spinner size="medium" className="absolute top-2 right-2" />
			)}
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
						style={campaignsTableStyle}
					>
						{shouldShowMobileFeatures ? (
							<div className="mobile-campaigns-outer-container">
								<div className="mobile-scroll-wrapper">
									<div className="mobile-table-wrapper">
										<CustomTable
											variant="secondary"
											containerClassName="my-campaigns-table mobile-table-no-scroll !bg-[#F8F8F8]"
											headerClassName="!bg-white [&_tr]:!bg-white [&_th]:!bg-white [&_th]:!border-b-[#F8F8F8] [&_th]:relative [&_th]:!overflow-visible"
											rowClassName="!bg-transparent !border-b-[#F8F8F8] hover:!bg-[#F0F0F0] group"
											renderLoadingCell={renderCampaignLoadingCell}
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
											footerContent={addCampaignFooter}
										/>
									</div>
								</div>
							</div>
						) : shouldRenderSplitFinderView ? (
							<div
								className="campaign-finder-split-shell"
								data-custom-table-ignore-row-click="true"
							>
								<div className="campaign-finder-split-pane campaign-finder-split-pane-left">
									{renderDesktopCampaignsTable(
										leftCampaignsTable,
										<CampaignFinderTopBar
											searchValue={leftFinderSearchQuery}
											onSearchChange={setLeftFinderSearchQuery}
											viewMode={campaignFinderViewMode}
											onToggleViewMode={() => handleToggleCampaignFinderViewMode('left')}
											splitPane="left"
										/>,
										'left'
									)}
								</div>
								<div className="campaign-finder-split-divider" aria-hidden="true" />
								<div className="campaign-finder-split-pane campaign-finder-split-pane-right">
									{renderDesktopCampaignsTable(
										rightCampaignsTable,
										<CampaignFinderTopBar
											searchValue={rightFinderSearchQuery}
											onSearchChange={setRightFinderSearchQuery}
											viewMode={campaignFinderViewMode}
											onToggleViewMode={() => handleToggleCampaignFinderViewMode('right')}
											splitPane="right"
										/>,
										'right'
									)}
								</div>
							</div>
						) : (
							renderDesktopCampaignsTable(singleCampaignsTable, finderTopContent)
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
