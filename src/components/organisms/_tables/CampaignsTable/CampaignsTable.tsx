import {
	FC,
	type CSSProperties,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import CustomTable from '../../../molecules/CustomTable/CustomTable';
import {
	useCampaignsTable,
	getActiveCampaignFinderDragPreview,
	getCampaignFolderColors,
	type FinderFolderKey,
} from './useCampaignsTable';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/utils';
import type { CampaignDataTypeSummary } from '@/utils/campaignDataTypes';
import {
	CampaignApiError,
	useCreateCampaign,
	useGetCampaigns,
} from '@/hooks/queryHooks/useCampaigns';
import { useCreateUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { generateCampaignName } from '@/utils/campaignNames';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import DragAddBadgeIcon from '@/components/atoms/_svg/DragAddBadgeIcon';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import LogoIcon from '@/components/atoms/_svg/LogoIcon';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';

const MAX_CAMPAIGNS = 5;
const CAMPAIGN_FINDER_MIN_HEIGHT = 415;
const CAMPAIGN_FINDER_MAX_HEIGHT = 415;
const CAMPAIGN_FINDER_VIEWPORT_BOTTOM_GAP = 0;
// Offsets (px, in the document-root zoom space) that place the floating drag pill's
// bottom-left corner — where the green "+" add badge sits — near the cursor. Tunable.
const FINDER_DRAG_PILL_CURSOR_DX = 16;
const FINDER_DRAG_PILL_CURSOR_DY = 36;
// Grace period before the hover-delete "X" disappears once the cursor leaves the
// row. The overlay sits flush against the row's right edge (no dead gap to cross),
// so this only needs to bridge the row→overlay mouseleave/mouseenter event race —
// kept short so the "X" doesn't visibly linger after you move away.
const ROW_DELETE_HIDE_DELAY_MS = 50;
// Invisible bridge to the right of the campaigns table that stays hover-active while
// moving from a row to its floating delete button.
const ROW_DELETE_HOVER_GUTTER_OVERLAP_PX = 8;
const ROW_DELETE_HOVER_GUTTER_WIDTH_PX = 66;
const ROW_DELETE_ARMED_HOVER_GUTTER_WIDTH_PX = 150;

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

type FinderSidebarRow = {
	id: number;
	name: string;
	folderIconColor: string;
};

type CampaignsFinderSidebarProps = {
	/** Active campaign folders, in the same order the table renders them. */
	rows: FinderSidebarRow[];
	/** The campaign whose finder is currently open (green highlight), or null. */
	openCampaignId: number | null;
	/** Open a campaign's finder in the main pane (Contacts pre-expanded). */
	onSelectRoot: () => void;
	/** Collapse the finder back to the all-folders list ("Murmur" root click). */
	onSelectCampaign: (campaignId: number) => void;
};

/**
 * Left rail for the dropdown finder view. It is NOT a second table — it's a
 * Finder-style source list of shortcuts:
 *   • "Murmur" (root) → closes the finder so every folder shows collapsed.
 *   • each campaign  → opens that campaign's finder (Contacts expanded).
 * It drives the SAME finder state the main pane reads (openCampaignId), so the
 * two never disagree. Rendered as a sibling to the LEFT of
 * `.campaigns-table-container` so the hover-delete overlay's container-anchored
 * math is untouched.
 */
const CampaignsFinderSidebar: FC<CampaignsFinderSidebarProps> = ({
	rows,
	openCampaignId,
	onSelectRoot,
	onSelectCampaign,
}) => {
	// Root ("Murmur") is the active shortcut whenever no campaign finder is open.
	const isRootActive = openCampaignId === null;
	return (
		<div
			className="campaigns-finder-sidebar"
			data-custom-table-ignore-row-click="true"
			aria-label="Folders"
		>
			<div className="campaigns-finder-sidebar-dots" aria-hidden="true">
				<span />
				<span />
				<span />
			</div>
			<div className="campaigns-finder-sidebar-label">Folders</div>
			<div className="campaigns-finder-sidebar-list">
				<button
					type="button"
					className={cn(
						'campaigns-finder-sidebar-item campaigns-finder-sidebar-item-root',
						isRootActive && 'campaigns-finder-sidebar-item-active'
					)}
					aria-pressed={isRootActive}
					onClick={onSelectRoot}
				>
					<span className="campaigns-finder-sidebar-item-icon campaigns-finder-sidebar-item-icon-root">
						<LogoIcon width={18} height={16} pathClassName="fill-black" />
					</span>
					<span className="campaigns-finder-sidebar-item-name">Murmur</span>
				</button>
				{rows.map((row) => {
					const isActive = row.id === openCampaignId;
					return (
						<button
							key={row.id}
							type="button"
							className={cn(
								'campaigns-finder-sidebar-item',
								isActive && 'campaigns-finder-sidebar-item-active'
							)}
							aria-pressed={isActive}
							onClick={() => onSelectCampaign(row.id)}
							title={row.name}
						>
							<span className="campaigns-finder-sidebar-item-icon">
								<DashboardActionBarFolderIcon
									width={18}
									height={11}
									style={{ color: row.folderIconColor, display: 'block' }}
									aria-hidden="true"
								/>
							</span>
							<span className="campaigns-finder-sidebar-item-name">{row.name}</span>
						</button>
					);
				})}
			</div>
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
	contactIds?: number[];
	campaignDataTypes?: CampaignDataTypeSummary[];
};

export type CampaignsMockState = {
	folders?: CampaignsMockFolder[];
};

type CampaignsTableProps = {
	mockState?: CampaignsMockState;
	onMockStateChange?: (next: CampaignsMockState | undefined) => void;
	defaultOpenCampaignId?: number | null;
	defaultOpenContactsFolder?: boolean;
	/** Called whenever the campaign finder (single or split) opens or closes. */
	onFinderOpenChange?: (isOpen: boolean) => void;
	/**
	 * When true, hovering a campaign row reveals a small white "X" just to the
	 * right of the row (floating over the map) that runs the two-click confirm
	 * delete flow. Opt-in; enabled on the dashboard only.
	 */
	enableRowDelete?: boolean;
	/**
	 * When provided, clicking a campaign row selects that campaign in the parent
	 * surface instead of navigating to the campaign page.
	 */
	onSelectCampaign?: (campaignId: number) => void;
	/**
	 * Dropdown-only: render the left #F4F4F4 Finder sidebar (source list of
	 * folder shortcuts) beside the table. The box grows leftward by the sidebar
	 * width; the main table keeps its size. Desktop single-pane view only.
	 */
	showFinderSidebar?: boolean;
};

export const CampaignsTable: FC<CampaignsTableProps> = ({
	mockState,
	onMockStateChange,
	defaultOpenCampaignId,
	defaultOpenContactsFolder,
	onFinderOpenChange,
	enableRowDelete = false,
	onSelectCampaign,
	showFinderSidebar = false,
}) => {
	const router = useRouter();
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
	// Finder split-view drag overlay: a custom cursor-following pill that replaces the
	// native drag image so a green "+" add badge can be glued to it on the destination
	// pane. Position is driven imperatively (transform) from a document `dragover`
	// listener; only isFinderDragOverlayActive (+ the per-pane drop-target flags) go
	// through React state, so the finder tables never re-render on every mouse move.
	const finderDragOverlayRef = useRef<HTMLDivElement | null>(null);
	const finderDragPreviewRef =
		useRef<ReturnType<typeof getActiveCampaignFinderDragPreview>>(null);
	const [isFinderDragOverlayActive, setIsFinderDragOverlayActive] = useState(false);

	const shouldShowMobileFeatures = isMobile === true;
	const [isLandscape, setIsLandscape] = useState<boolean>(false);
	// Detect narrow desktop viewport (<=960px) for compact mode on desktop
	const [isNarrowDesktop, setIsNarrowDesktop] = useState<boolean>(false);
	// Campaign whose hover-delete "X" is currently hovered. Drives the red
	// "Click to Delete and move contents to Archive" warning on that row (passed
	// into useCampaignsTable). Declared before the hook calls so it can be passed in.
	const [deleteButtonHoverCampaignId, setDeleteButtonHoverCampaignId] = useState<
		number | null
	>(null);

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
		initialOpenCampaignId: defaultOpenCampaignId,
		initialOpenContactsFolder: defaultOpenContactsFolder,
		onFinderOpenInNewTab: (campaignId) => handleFinderOpenInNewTab(campaignId, 'left'),
		onSelectCampaign,
		deleteWarningCampaignId: deleteButtonHoverCampaignId,
	});
	const rightCampaignsTable = useCampaignsTable({
		compactMetrics: shouldUseCompactMetrics,
		mockState,
		onMockStateChange,
		enableFinder: !shouldShowMobileFeatures,
		finderSearchQuery: rightFinderSearchQuery,
		onFinderOpenInNewTab: (campaignId) => handleFinderOpenInNewTab(campaignId, 'right'),
		onSelectCampaign,
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
	// Real campaign list — the id-keyed source of truth for folder colors so the
	// sidebar swatches match the table row pills exactly (falls back to render
	// index for mock/debug rows not in this list).
	const { data: realCampaignsData } = useGetCampaigns();
	const campaignRows = Array.isArray(campaignDataRows) ? campaignDataRows : [];
	const campaignCount = campaignRows.length;
	const isSplitFinderView =
		!shouldShowMobileFeatures && campaignFinderViewMode === 'split';
	// Dropdown-only sidebar mode: keep the single-pane table in the same
	// finder-style frame even when the "Murmur" root collapses the open campaign.
	// This must be known before we build topContent / table classes so the
	// collapsed/root view stays visually connected to the 115px sidebar.
	const isFinderSidebarVisible =
		showFinderSidebar && !shouldShowMobileFeatures && !isSplitFinderView;
	// The green "+" add affordance shows only while the cursor is over the OTHER pane (a
	// valid drop target). Only the destination pane's hook flips isFinderDropTargetActive
	// true (its dragOver rejects same-campaign drops), so the OR is exactly "is over the
	// side being dragged into"; dragging back to the source clears both → badge hides.
	const isFinderAddAffordanceVisible =
		isSplitFinderView &&
		(leftCampaignsTable.isFinderDropTargetActive ||
			rightCampaignsTable.isFinderDropTargetActive);
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

	// --- Hover-to-delete "X" overlay (opt-in via enableRowDelete; dashboard only) ---
	// A small white "X" appears just to the right of the hovered campaign row,
	// floating over the map. It lives OUTSIDE the scrolling table (the CustomScrollbar
	// clips horizontally) and is anchored to `.campaigns-table-container`
	// (position:relative; overflow:visible). Clicking it runs the existing two-click
	// confirm delete flow (handleDeleteClick).
	const [hoveredDeleteCampaignId, setHoveredDeleteCampaignId] = useState<number | null>(
		null
	);
	const [deleteOverlayTop, setDeleteOverlayTop] = useState<number>(0);
	const [deleteOverlayLeft, setDeleteOverlayLeft] = useState<number>(0);
	const deleteClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const activeDeleteIdRef = useRef<number | null>(null);
	const deleteOverlayRef = useRef<HTMLDivElement | null>(null);
	const deleteButtonRef = useRef<HTMLButtonElement | null>(null);

	// Write the new anchor straight to the overlay node so the "X" snaps to the
	// hovered row on the same frame as the cursor, instead of trailing a few
	// frames behind while React re-renders the (heavy) table. State is still set
	// alongside this — it remains the source of truth for the initial mount and
	// for React's own re-render, which lands on the identical value.
	const applyDeleteOverlayPosition = useCallback((top: number, left: number) => {
		const node = deleteOverlayRef.current;
		if (node) {
			node.style.top = '0px';
			node.style.bottom = '0px';
			node.style.left = `${left - ROW_DELETE_HOVER_GUTTER_OVERLAP_PX}px`;
		}

		const button = deleteButtonRef.current;
		if (button) {
			button.style.top = `${top}px`;
		}

		setDeleteOverlayTop(top);
		setDeleteOverlayLeft(left);
	}, []);

	// Measure the hovered row's vertical center and right edge as local px relative
	// to the container, using the codebase's rect/offset scale ratio so it stays
	// correct under the dashboard `zoom` and `--campaigns-table-scale`. Anchoring to
	// the measured right edge keeps the "X" correct regardless of table
	// width/centering/scale (rather than assuming the 655px table is centered).
	const measureDeleteRowAnchor = useCallback(
		(campaignId: number): { top: number; left: number } | null => {
			const container = desktopMeasureRef.current;
			if (!container) return null;
			const tr = container.querySelector(
				`[data-campaign-id="${campaignId}"]`
			) as HTMLElement | null;
			if (!tr) return null;
			const cRect = container.getBoundingClientRect();
			const rRect = tr.getBoundingClientRect();
			const offsetWidth = container.offsetWidth || cRect.width;
			const scale = offsetWidth > 0 ? cRect.width / offsetWidth : 1;
			if (!scale) return null;
			return {
				top: (rRect.top + rRect.height / 2 - cRect.top) / scale,
				left: (rRect.right - cRect.left) / scale,
			};
		},
		[]
	);

	const cancelDeleteClear = useCallback(() => {
		if (deleteClearTimeoutRef.current) {
			clearTimeout(deleteClearTimeoutRef.current);
			deleteClearTimeoutRef.current = null;
		}
	}, []);

	// Short delay so moving the cursor off the row and onto the X (which sits flush
	// against the row's right edge) doesn't dismiss the button before it can be
	// clicked. Kept brief (ROW_DELETE_HIDE_DELAY_MS) so it doesn't linger.
	const scheduleDeleteClear = useCallback(() => {
		cancelDeleteClear();
		deleteClearTimeoutRef.current = setTimeout(() => {
			setHoveredDeleteCampaignId(null);
		}, ROW_DELETE_HIDE_DELAY_MS);
	}, [cancelDeleteClear]);

	const handleRowDeleteHover = useCallback(
		(rowData: unknown) => {
			if (!rowData || typeof rowData !== 'object') {
				scheduleDeleteClear();
				return;
			}
			// Archive rows are not deletable (the folder is synthetic; its children are
			// already deleted). The folder row's id is a string so it's caught below, but
			// deleted-campaign children carry numeric ids — guard them explicitly.
			const rowType = (rowData as { __rowType?: unknown }).__rowType;
			if (rowType === 'archiveFolder' || rowType === 'archivedCampaign') {
				scheduleDeleteClear();
				return;
			}
			const id = (rowData as { id?: unknown }).id;
			if (typeof id !== 'number') {
				scheduleDeleteClear();
				return;
			}
			const anchor = measureDeleteRowAnchor(id);
			if (anchor === null) return;
			cancelDeleteClear();
			applyDeleteOverlayPosition(anchor.top, anchor.left);
			setHoveredDeleteCampaignId(id);
		},
		[
			applyDeleteOverlayPosition,
			cancelDeleteClear,
			measureDeleteRowAnchor,
			scheduleDeleteClear,
		]
	);

	// Measured positions go stale when the list scrolls (4–5 campaigns scroll within
	// the 3-row window); re-measure the active row, or drop it if it scrolled away.
	const handleDeleteOverlayScroll = useCallback(() => {
		const id = activeDeleteIdRef.current;
		if (id === null) return;
		const anchor = measureDeleteRowAnchor(id);
		if (anchor === null) {
			setHoveredDeleteCampaignId(null);
		} else {
			applyDeleteOverlayPosition(anchor.top, anchor.left);
		}
	}, [applyDeleteOverlayPosition, measureDeleteRowAnchor]);

	useEffect(() => () => cancelDeleteClear(), [cancelDeleteClear]);

	// Drop a stale hover target if its campaign disappears (e.g. after delete).
	// Depends on the hook's row source (campaignDataRows) rather than the
	// per-render campaignRows array so the effect doesn't run every render.
	useEffect(() => {
		const rows = Array.isArray(campaignDataRows) ? campaignDataRows : [];
		if (
			hoveredDeleteCampaignId !== null &&
			!rows.some(
				(campaign) => (campaign as { id?: unknown }).id === hoveredDeleteCampaignId
			)
		) {
			setHoveredDeleteCampaignId(null);
		}
	}, [campaignDataRows, hoveredDeleteCampaignId]);

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
			const campaign = await createCampaign({
				name,
				userContactLists: [contactList.id],
			});
			if (campaign?.id) {
				router.push(
					`${urls.murmur.dashboard.index}?fromCampaignId=${campaign.id}&pick=1&allContacts=1&instant=1`
				);
			}
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

	// Drive the finder split-view drag overlay: follow the cursor (imperative transform,
	// no per-move re-render) and tear down on drag end/drop. Active only in split view.
	useEffect(() => {
		if (!isSplitFinderView) return;

		const getDocumentZoom = () => {
			const zoom = window.getComputedStyle(document.documentElement).zoom;
			if (!zoom || zoom === 'normal') return 1;
			const parsed = parseFloat(zoom);
			return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
		};

		const handleDragOver = (event: DragEvent) => {
			const preview = getActiveCampaignFinderDragPreview();
			if (!preview) return;

			// Activate on the first dragover, NOT in onDragStart: mutating state during the
			// dragstart dispatch re-renders the source row and aborts the native drag.
			if (!finderDragPreviewRef.current) {
				finderDragPreviewRef.current = preview;
				setIsFinderDragOverlayActive(true);
			}

			const node = finderDragOverlayRef.current;
			if (!node) return;
			// clientX/clientY are viewport px; the overlay is portaled into the document
			// root `zoom` space, so divide to land under the cursor (mirrors
			// getClampedFinderPopupPosition in useCampaignsTable).
			const zoom = getDocumentZoom();
			const x = event.clientX / zoom - FINDER_DRAG_PILL_CURSOR_DX;
			const y = event.clientY / zoom - FINDER_DRAG_PILL_CURSOR_DY;
			node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
		};

		const handleDragDone = () => {
			finderDragPreviewRef.current = null;
			setIsFinderDragOverlayActive(false);
		};

		// Capture phase is REQUIRED: the destination panel's dragover/drop handlers call
		// event.stopPropagation() (useCampaignsTable handleFinderPanelDragOver/Drop), which
		// — via React's synthetic→native propagation — starves a bubble-phase document
		// listener the instant the cursor enters the drop pane. Capture fires before the
		// panel can stop it, so the overlay keeps tracking the cursor over the drop area
		// (otherwise the pill freezes there and the badge looks detached from the drag).
		document.addEventListener('dragover', handleDragOver, true);
		document.addEventListener('dragend', handleDragDone, true);
		document.addEventListener('drop', handleDragDone, true);
		return () => {
			document.removeEventListener('dragover', handleDragOver, true);
			document.removeEventListener('dragend', handleDragDone, true);
			document.removeEventListener('drop', handleDragDone, true);
		};
	}, [isSplitFinderView]);

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
	const finderTopContent = singleCampaignsTable.isFinderOpen || isFinderSidebarVisible ? (
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
				(tableState.isFinderOpen || splitPane || (isFinderSidebarVisible && !splitPane)) &&
					'campaigns-finder-open',
				// Without an expansion the table grows to fit its rows (incl. the ARCHIVE
				// folder) so it never shows a scrollbar; expanding the archive caps it so
				// a long deleted list scrolls within the table.
				!tableState.isFinderOpen &&
					!splitPane &&
					!isFinderSidebarVisible &&
					!tableState.isArchiveExpanded &&
					'campaigns-table-flow',
				!tableState.isFinderOpen &&
					!splitPane &&
					!isFinderSidebarVisible &&
					tableState.isArchiveExpanded &&
					'campaigns-table-archive-open',
				splitPane && 'campaign-finder-split-table',
				splitPane && `campaign-finder-split-table-${splitPane}`
			)}
			headerClassName="!bg-white [&_tr]:!bg-white [&_th]:!bg-white [&_th]:!border-0 [&_th]:!h-[28px] [&_tr]:!h-[28px] [&_th:first-child]:rounded-tl-[8px] [&_th:last-child]:rounded-tr-[8px] [&_th]:relative [&_th]:!overflow-visible"
			rowClassName="!bg-transparent !border-0 hover:!bg-transparent group"
			renderLoadingCell={renderCampaignLoadingCell}
			handleRowClick={tableState.handleRowClick}
			onRowContextMenu={tableState.onRowContextMenu}
			onRowHover={!splitPane && enableRowDelete ? handleRowDeleteHover : undefined}
			onScroll={!splitPane && enableRowDelete ? handleDeleteOverlayScroll : undefined}
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
			// While a delete confirmation is armed, the red band lives in the scroll flow
			// but the floating "✕ Delete" button is anchored outside it. Freeze the list so
			// the two stay aligned and the confirmation doesn't slide as the user scrolls.
			scrollLocked={
				!splitPane && enableRowDelete && tableState.confirmingCampaignId !== null
			}
			stickyHeader={false}
			footerContent={splitPane || (isFinderSidebarVisible && !splitPane) ? null : addCampaignFooter}
		/>
	);

	// Active campaign for the hover-to-delete "X": the confirming row pins the X
	// (so the 2nd confirm click is easy even if the cursor drifts), otherwise the
	// currently hovered row. The single dashboard table keeps this active even
	// while its Finder is open so the right-side delete gutter remains usable.
	const isRowDeleteOverlayEnabled =
		enableRowDelete &&
		!shouldShowMobileFeatures &&
		!isSplitFinderView;
	const activeDeleteCampaignId = isRowDeleteOverlayEnabled
		? singleCampaignsTable.confirmingCampaignId ?? hoveredDeleteCampaignId
		: null;
	activeDeleteIdRef.current = activeDeleteCampaignId;
	const activeDeleteCampaign =
		activeDeleteCampaignId !== null
			? campaignRows.find(
					(campaign) => (campaign as { id?: unknown }).id === activeDeleteCampaignId
			  )
			: undefined;
	const activeDeleteCampaignNameValue = (
		activeDeleteCampaign as { name?: unknown } | undefined
	)?.name;
	const activeDeleteCampaignName =
		typeof activeDeleteCampaignNameValue === 'string'
			? activeDeleteCampaignNameValue
			: 'campaign';
	// The "X" expands into the red "✕ Delete" pill only once the first click has
	// armed the confirm. On plain X-hover (not yet armed) it stays a compact red
	// square; the red row band + red X box are the only hover changes (pills stay).
	const isActiveDeleteArmed =
		activeDeleteCampaignId !== null &&
		singleCampaignsTable.confirmingCampaignId === activeDeleteCampaignId;
	const isActiveDeleteButtonHovered =
		activeDeleteCampaignId !== null &&
		deleteButtonHoverCampaignId === activeDeleteCampaignId;
	const showDeletePill = isActiveDeleteArmed;
	const showRedXBox = showDeletePill || isActiveDeleteButtonHovered;

	// Read the drag-preview descriptor once per render (const so TS narrows the union).
	const finderDragPreview = finderDragPreviewRef.current;

	// Finder sidebar (dropdown-only). It mirrors the SINGLE finder's state so the
	// rail highlight and the open pane never disagree. Colors are resolved from the
	// real campaign list (id-keyed) exactly like the table rows, with the render
	// index as the mock/debug fallback.
	const singleOpenCampaignId = singleCampaignsTable.openCampaignId;
	const openSingleFinderForCampaign = singleCampaignsTable.openFinderForCampaign;
	const closeSingleFinder = singleCampaignsTable.closeFinder;
	const finderSidebarRows: FinderSidebarRow[] = campaignRows.map((campaign, index) => {
		const row = campaign as { id: number; name?: string | null };
		return {
			id: row.id,
			name: row.name || `Folder ${index + 1}`,
			folderIconColor: getCampaignFolderColors(
				row.id,
				realCampaignsData as ReadonlyArray<{ id: number }> | null | undefined,
				index
			).folderIconColor,
		};
	});
	// Plain handlers (not hooks): this point is past the `isMobile === null` early
	// return, so calling useCallback here would violate rules-of-hooks. They're
	// only handed to a child that re-renders with this component anyway.
	const handleFinderSidebarSelectRoot = () => {
		// "Murmur" root → collapse the finder so every folder shows closed.
		closeSingleFinder();
	};
	const handleFinderSidebarSelectCampaign = (campaignId: number) => {
		// Re-selecting the already-open folder is a no-op (keeps it open).
		if (campaignId === singleOpenCampaignId) return;
		// Open the campaign with Contacts pre-expanded, matching the dropdown's
		// default-open behavior.
		openSingleFinderForCampaign(campaignId, ['contacts'] as FinderFolderKey[]);
	};

	return (
		<>
		{leftCampaignsTable.campaignRowMenuPortals}
		{rightCampaignsTable.campaignRowMenuPortals}
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
					} ${shouldShowMobileFeatures && isLandscape ? 'mobile-landscape-mode' : ''} ${
						isFinderSidebarVisible ? 'campaigns-finder-has-sidebar' : ''
					}`}
				>
					{isFinderSidebarVisible ? (
						<CampaignsFinderSidebar
							rows={finderSidebarRows}
							openCampaignId={singleOpenCampaignId}
							onSelectRoot={handleFinderSidebarSelectRoot}
							onSelectCampaign={handleFinderSidebarSelectCampaign}
						/>
					) : null}
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
						{activeDeleteCampaignId !== null && (
							<div
								ref={deleteOverlayRef}
								className="campaign-row-delete-overlay"
								data-custom-table-ignore-row-click="true"
								style={{
									position: 'absolute',
									top: 0,
									bottom: 0,
									left: deleteOverlayLeft - ROW_DELETE_HOVER_GUTTER_OVERLAP_PX,
									width:
										(showDeletePill
											? ROW_DELETE_ARMED_HOVER_GUTTER_WIDTH_PX
											: ROW_DELETE_HOVER_GUTTER_WIDTH_PX) +
										ROW_DELETE_HOVER_GUTTER_OVERLAP_PX,
									zIndex: 60,
									pointerEvents: 'auto',
								}}
								onMouseEnter={cancelDeleteClear}
								onMouseLeave={scheduleDeleteClear}
								onPointerDown={(event) => {
									event.stopPropagation();
									event.nativeEvent.stopImmediatePropagation();
								}}
								onMouseDown={(event) => {
									event.stopPropagation();
									event.nativeEvent.stopImmediatePropagation();
								}}
								onClick={(event) => {
									event.stopPropagation();
									event.nativeEvent.stopImmediatePropagation();
								}}
							>
								<button
									ref={deleteButtonRef}
									type="button"
									aria-label={`Delete ${activeDeleteCampaignName}`}
									onMouseEnter={() => {
										cancelDeleteClear();
										if (activeDeleteCampaignId !== null) {
											setDeleteButtonHoverCampaignId(activeDeleteCampaignId);
										}
									}}
									onMouseLeave={() => setDeleteButtonHoverCampaignId(null)}
									onClick={(e) => {
										if (activeDeleteCampaignId === null) return;
										const willDelete =
											singleCampaignsTable.confirmingCampaignId ===
											activeDeleteCampaignId;
										singleCampaignsTable.handleDeleteClick(e, activeDeleteCampaignId);
										if (willDelete) {
											cancelDeleteClear();
											setDeleteButtonHoverCampaignId(null);
											setHoveredDeleteCampaignId(null);
										}
									}}
									style={
										showDeletePill
											? {
													position: 'absolute',
													top: deleteOverlayTop,
													left: ROW_DELETE_HOVER_GUTTER_OVERLAP_PX + 10,
													transform: 'translateY(-50%)',
													height: 21,
													borderRadius: 7,
													background: '#E7677C',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													gap: 7,
													padding: '0 12px',
													border: 'none',
													cursor: 'pointer',
													flex: 'none',
													whiteSpace: 'nowrap',
											  }
											: isActiveDeleteButtonHovered
											? {
													position: 'absolute',
													top: deleteOverlayTop,
													left: ROW_DELETE_HOVER_GUTTER_OVERLAP_PX + 10,
													transform: 'translateY(-50%)',
													width: 21,
													height: 21,
													borderRadius: 7,
													background: '#E7677C',
													boxShadow: '0 1px 4px rgba(0, 0, 0, 0.18)',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													padding: 0,
													border: 'none',
													cursor: 'pointer',
													flex: 'none',
											  }
											: {
													position: 'absolute',
													top: deleteOverlayTop,
													left: ROW_DELETE_HOVER_GUTTER_OVERLAP_PX + 10,
													transform: 'translateY(-50%)',
													width: 21,
													height: 21,
													borderRadius: 7,
													background: '#FFFFFF',
													boxShadow: '0 1px 4px rgba(0, 0, 0, 0.18)',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													padding: 0,
													border: 'none',
													cursor: 'pointer',
													flex: 'none',
											  }
									}
								>
									<svg
										width={18}
										height={18}
										viewBox="0 0 18 18"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
										aria-hidden="true"
									>
										<line
											x1="4.58793"
											y1="4.41176"
											x2="13.5876"
											y2="13.4115"
											stroke={showRedXBox ? '#FFFFFF' : 'black'}
										/>
										<line
											x1="4.41207"
											y1="13.4118"
											x2="13.4118"
											y2="4.41207"
											stroke={showRedXBox ? '#FFFFFF' : 'black'}
										/>
									</svg>
									{showDeletePill && (
										<span
											className="font-inter"
											style={{
												color: '#FFFFFF',
												fontSize: 15,
												fontWeight: 500,
												lineHeight: 1,
											}}
										>
											Delete
										</span>
									)}
								</button>
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
		{isSplitFinderView &&
			typeof document !== 'undefined' &&
			createPortal(
				<div
					ref={finderDragOverlayRef}
					className={cn(
						'campaign-finder-drag-overlay',
						!isFinderDragOverlayActive && 'campaign-finder-drag-overlay-hidden'
					)}
					aria-hidden="true"
				>
					<div className="campaign-finder-drag-preview">
						{finderDragPreview?.dotColor ? (
							<span
								className="campaign-finder-drag-preview-dot"
								style={{ backgroundColor: finderDragPreview.dotColor }}
							/>
						) : null}
						<span className="campaign-finder-drag-preview-text">
							<span className="campaign-finder-drag-preview-label">
								{finderDragPreview?.label ?? ''}
							</span>
							{finderDragPreview?.secondary && finderDragPreview.secondary.trim() ? (
								<span className="campaign-finder-drag-preview-secondary">
									{finderDragPreview.secondary}
								</span>
							) : null}
						</span>
					</div>
					{isFinderAddAffordanceVisible ? (
						<span className="campaign-finder-drag-add-badge">
							<DragAddBadgeIcon width={18} height={18} />
						</span>
					) : null}
				</div>,
				document.body
			)}
		</>
	);
};
