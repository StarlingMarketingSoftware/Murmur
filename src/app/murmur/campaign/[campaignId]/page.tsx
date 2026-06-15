'use client';

// Force server-rendering (no static path generation) to avoid Clerk chunk build errors
export const dynamic = 'force-dynamic';

import { useCampaignDetail } from './useCampaignDetail';
import type {
	DraftingSectionView,
	InboxPanelTabRequest,
	InboxSentTab,
	InboxSentTabRequest,
} from './DraftingSection/useDraftingSection';
import { useRouter, useSearchParams } from 'next/navigation';
import { urls } from '@/constants/urls';
import { cn } from '@/utils';
import { getApproximateLocation } from '@/utils/approximateLocation';
import { markPerf } from '@/utils/perfMarks';
import { prefetchCuratedForYouFromCampaign } from '@/app/murmur/dashboard/searchResultCache';
import {
	CAMPAIGN_SIDE_SHIFT_VAR,
	CAMPAIGN_SNUG_MAX_HEIGHT_FIT_ZOOM,
	CAMPAIGN_SNUG_MIN_EFFECTIVE_WIDTH_PX,
	CAMPAIGN_SNUG_SAFE_BOTTOM_MARGIN_PX,
	CAMPAIGN_WORKSPACE_CONTENT_SCALE,
	computeMapSelectGrabViewScale,
	computeMurmurChromeZoomForViewport,
	computeSideRailCenterShiftPx,
} from '@/utils/murmurChromeZoom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMe } from '@/hooks/useMe';
import {
	useState,
	useEffect,
	useRef,
	useCallback,
	useMemo,
	useLayoutEffect,
	type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import MapBottomSearchArrowIcon from '@/components/atoms/_svg/MapBottomSearchArrowIcon';
import DashboardActionBarPlaybookIcon from '@/components/atoms/_svg/DashboardActionBarPlaybookIcon';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import DashboardActionBarStarIcon from '@/components/atoms/_svg/DashboardActionBarStarIcon';
import DashboardActionBarEnvelopeIcon from '@/components/atoms/_svg/DashboardActionBarEnvelopeIcon';
import { DashboardStrategyBox } from '@/components/molecules/DashboardStrategyBox/DashboardStrategyBox';
import DashboardOpportunitiesWidget from '@/components/molecules/DashboardOpportunitiesWidget/DashboardOpportunitiesWidget';
import DashboardResponsesWidget from '@/components/molecules/DashboardResponsesWidget/DashboardResponsesWidget';
import SearchMap from '@/components/atoms/_svg/SearchMap';
import BottomFolderIcon from '@/components/atoms/_svg/BottomFolderIcon';
import BottomHomeIcon from '@/components/atoms/_svg/BottomHomeIcon';
import { EnvelopeIcon } from '@/components/atoms/_svg/EnvelopeIcon';
import StatusContactsIcon from '@/components/atoms/svg/StatusContactsIcon';
import StatusDraftsIcon from '@/components/atoms/svg/StatusDraftsIcon';
import StatusNewMessageIcon from '@/components/atoms/svg/StatusNewMessageIcon';
import StatusSentIcon from '@/components/atoms/svg/StatusSentIcon';
import nextDynamic from 'next/dynamic';
import { CampaignsTable } from '@/components/organisms/_tables/CampaignsTable/CampaignsTable';
import { CampaignHeaderBox } from '@/components/molecules/CampaignHeaderBox/CampaignHeaderBox';
import { useEditCampaign, useGetCampaignContacts } from '@/hooks/queryHooks/useCampaigns';
import { EMAIL_QUERY_KEYS, useGetEmails } from '@/hooks/queryHooks/useEmails';
import { toast } from 'sonner';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { useCreateIdentity, useGetIdentities } from '@/hooks/queryHooks/useIdentities';
import { EmailStatus } from '@/constants/prismaEnums';
import { useQueryClient } from '@tanstack/react-query';
import type { EmailWithRelations } from '@/types';
import { useSendingSessionState } from '@/contexts/SendingSessionContext';
import { HoverDescriptionProvider } from '@/contexts/HoverDescriptionContext';
import { CampaignTopSearchHighlightProvider } from '@/contexts/CampaignTopSearchHighlightContext';
import { CampaignDeviceProvider } from '@/contexts/CampaignDeviceContext';
import {
	type PersistentDashboardMapConfig,
	usePersistentMapSetter,
} from '@/contexts/PersistentMapContext';
import type {
	CampaignContactMapStatus,
	SearchResultsMapProps,
} from '@/components/molecules/SearchResultsMap/SearchResultsMap';
import { MAP_MIN_ZOOM } from '@/components/molecules/SearchResultsMap/constants';
import {
	MAP_ZOOM_CONTROL_MAX_INDEX,
	buildZoomControlLevels,
	clampZoomControlValue,
	controlValueForZoom,
	zoomForControlValue,
} from '@/utils/mapZoomControlLadder';
import {
	MapSelectGrabStarterBox,
	MapSelectGrabStackBox,
	MapSelectGrabStackTile,
	MapSelectGrabTallStackBox,
	MapSelectGrabTool,
	StackBoxSelectBlueSparkIcon,
	StackBoxSelectStarIcon,
	MAP_SELECT_GRAB_CATEGORY_COUNT,
	MAP_SELECT_GRAB_STARTER_BOX_GAP_PX,
	MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX,
	MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX,
	MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX,
	MAP_SELECT_GRAB_STACK_BOX_SIZE_PX,
	MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX,
	MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX,
	MAP_SELECT_GRAB_TOOL_COLLAPSED_HEIGHT_PX,
	getMapSelectGrabCategoryIndexFromContactTitle,
	type MapZoomControlIndexChangeMeta,
	type MapZoomControlLiveHandle,
} from '@/components/molecules/MapSelectGrabTool/MapSelectGrabTool';
import {
	getBookingTitlePrefixFromContactTitle,
	getPromotionOverlayWhatFromContactTitle,
} from '@/components/molecules/SearchResultsMap/searchMode';
import { MapStackBlueSparkIcon } from '@/components/atoms/_svg/MapStackBlueSparkIcon';
import { MapStackStarIcon } from '@/components/atoms/_svg/MapStackStarIcon';
import { useGlobeWeatherMood } from '@/hooks/useGlobeWeatherMood';
import { useGlobeNightLighting } from '@/hooks/useGlobeNightLighting';
import {
	CampaignInboxDebugPanel,
	type CampaignInboxMockState,
} from './CampaignInboxDebugPanel';

type ViewType = DraftingSectionView;
type CampaignUrlTab = 'write' | 'all' | 'inbox' | 'sent' | 'drafts' | 'summary';

type CampaignOverviewBottomBoxesProps = {
	contactsCount: number;
	draftCount: number;
	inboxCount: number;
	sentCount: number;
	// Navigation handlers; undefined renders that box as a disabled, display-only pill.
	onOpenSearch?: () => void;
	onOpenContacts?: () => void;
	onOpenDrafts?: () => void;
	onOpenInbox?: () => void;
	onOpenSent?: () => void;
	onOpenOpportunities?: () => void;
};

// The overview bottom cluster (status toggle + strip + ask box + count boxes) is
// laid out at intrinsic sizes that read too large once the whole page is zoomed to
// ~85%. Scale the cluster as a unit, anchored at its bottom-center (where the count
// boxes sit), so it shrinks in line with the rest of the page without disturbing the
// tuned per-panel offsets. Applied via a full-viewport wrapper so the panels' own
// `position: fixed` resolves against it and their existing positioning still holds.
const CAMPAIGN_OVERVIEW_CLUSTER_SCALE = 0.85;
const CAMPAIGN_PRESET_EXPANDED_CONTROLS_MIN_SCALE = 0.68;
const CAMPAIGN_PRESET_EXPANDED_CONTROLS_MAX_SCALE = 0.8;
const CAMPAIGN_PRESET_EXPANDED_CONTROLS_SIDE_GUTTER_PX = 24;
const CAMPAIGN_PRESET_EXPANDED_CONTROLS_NUDGE_UP_PX = 14;
const CAMPAIGN_PRESET_EXPANDED_TOOL_NUDGE_UP_PX = 62;
const CAMPAIGN_PRESET_EXPANDED_TOOL_COMPACT_NUDGE_UP_PX = 74;

const CAMPAIGN_OVERVIEW_BOTTOM_BOXES_BOTTOM_PX = 10;
const CAMPAIGN_OVERVIEW_BOTTOM_BOX_SIZE_PX = 39.154;
const CAMPAIGN_OVERVIEW_ASK_BOX_GAP_PX = 9;
const CAMPAIGN_OVERVIEW_ASK_BOX_WIDTH_PX = 477;
const CAMPAIGN_OVERVIEW_ASK_BOX_HEIGHT_PX = 83;
const CAMPAIGN_OVERVIEW_STATUS_STRIP_GAP_PX = 6;
const CAMPAIGN_OVERVIEW_STATUS_STRIP_WIDTH_PX = 520;
const CAMPAIGN_OVERVIEW_STATUS_STRIP_HEIGHT_PX = 37;
const CAMPAIGN_OVERVIEW_STATUS_TOGGLE_GAP_PX = 6;
const CAMPAIGN_OVERVIEW_STATUS_TOGGLE_WIDTH_PX = 264;
const CAMPAIGN_OVERVIEW_STATUS_TOGGLE_HEIGHT_PX = 27;
const CAMPAIGN_OVERVIEW_ASK_BOX_BOTTOM_PX =
	CAMPAIGN_OVERVIEW_BOTTOM_BOXES_BOTTOM_PX +
	CAMPAIGN_OVERVIEW_BOTTOM_BOX_SIZE_PX +
	CAMPAIGN_OVERVIEW_ASK_BOX_GAP_PX;
const CAMPAIGN_OVERVIEW_STATUS_STRIP_BOTTOM_PX =
	CAMPAIGN_OVERVIEW_ASK_BOX_BOTTOM_PX +
	CAMPAIGN_OVERVIEW_ASK_BOX_HEIGHT_PX +
	CAMPAIGN_OVERVIEW_STATUS_STRIP_GAP_PX;
const CAMPAIGN_OVERVIEW_STATUS_TOGGLE_BOTTOM_PX =
	CAMPAIGN_OVERVIEW_STATUS_STRIP_BOTTOM_PX +
	CAMPAIGN_OVERVIEW_STATUS_STRIP_HEIGHT_PX +
	CAMPAIGN_OVERVIEW_STATUS_TOGGLE_GAP_PX;

// The Write/Drafts/Inbox tabs don't render the bottom count boxes, so the ask
// box drops to the same bottom margin those boxes use on the overview tab and
// the status strip stacks just above it — sitting them close to the bottom edge.
const CAMPAIGN_PRESET_ASK_BOX_BOTTOM_PX = CAMPAIGN_OVERVIEW_BOTTOM_BOXES_BOTTOM_PX;
const CAMPAIGN_PRESET_STATUS_STRIP_BOTTOM_PX =
	CAMPAIGN_PRESET_ASK_BOX_BOTTOM_PX +
	CAMPAIGN_OVERVIEW_ASK_BOX_HEIGHT_PX +
	CAMPAIGN_OVERVIEW_STATUS_STRIP_GAP_PX;

type CampaignOverviewMapGrouping = 'category' | 'status';
type CampaignOverviewStatusKey = CampaignContactMapStatus;

const CAMPAIGN_OVERVIEW_STATUS_KEYS = [
	'contacts',
	'drafts',
	'new-message',
	'sent',
] as const satisfies readonly CampaignOverviewStatusKey[];

// The Write/Drafts/Inbox tabs are focused, pre-filtered views of the same map.
// Each one locks the overview status filter to the slice it represents:
//   Write   → fresh contacts (no email activity yet)
//   Drafts  → contacts with a draft
//   Inbox   → contacts we've sent to or who replied
// The All (overview) tab is absent here so it keeps its user-driven selection.
const CAMPAIGN_TAB_PRESET_STATUSES: Partial<
	Record<ViewType, readonly CampaignOverviewStatusKey[]>
> = {
	testing: ['contacts'],
	drafting: ['drafts'],
	inbox: ['sent', 'new-message'],
};

// Per-tab tint for the map selection heatmap glow (rendered behind the status
// pins). Keyed on the active view; tabs without an entry (e.g. overview) get no
// glow. The overview/All tab is intentionally omitted for now.
const CAMPAIGN_TAB_HEATMAP_COLOR: Partial<Record<ViewType, string>> = {
	testing: '#FFA5A5', // Contacts — pink/red
	drafting: '#FFD4A9', // Drafts — orange
	inbox: '#ABD1FF', // Inbox — blue
};

const CAMPAIGN_OVERVIEW_STATUS_PILL_HEIGHT_PX = 27;
const CAMPAIGN_OVERVIEW_STATUS_PILL_RADIUS_PX = 8;
const CAMPAIGN_OVERVIEW_STATUS_PILL_PADDING_X_PX = 9;

// Every status uses a uniform pill box — same height, radius and horizontal
// padding, reserved whether lit or not so toggling never shifts the row. Only
// the background color changes, shown when the status is selected.
const CAMPAIGN_OVERVIEW_STATUS_PILL_COLOR: Record<CampaignOverviewStatusKey, string> = {
	contacts: '#FFA6A7',
	drafts: '#FDDEA5',
	'new-message': '#AEE1FD',
	sent: '#AEFDC3',
};

const getCampaignOverviewStatusFromEmailStatus = (
	status: string | null | undefined
): CampaignOverviewStatusKey | null => {
	switch (status) {
		case EmailStatus.sent:
			return 'sent';
		case EmailStatus.draft:
		case EmailStatus.scheduled:
		case EmailStatus.failed:
			return 'drafts';
		default:
			return null;
	}
};

type CampaignOverviewAskAnythingBoxProps = {
	onSubmit: (query: string) => void;
	value?: string;
	// Overrides the default viewport-centered `left` so the box can be centered
	// over the left map region on the split-screen tabs.
	leftOverride?: string;
	// Overrides the default `bottom` offset (used to sit it lower on the focused tabs).
	bottomOverride?: number;
	// On the Write/Drafts/Inbox preset tabs the box is a dimmed, display-only bar
	// that lights up to full opacity on hover, mirroring the left "Showing" strip.
	// Typing, focus and the submit button are disabled while in this mode.
	dimUntilHover?: boolean;
};

const CampaignOverviewAskAnythingBox = ({
	onSubmit,
	value,
	leftOverride,
	bottomOverride,
	dimUntilHover = false,
}: CampaignOverviewAskAnythingBoxProps) => {
	const [query, setQuery] = useState(value ?? '');
	const [isHovered, setIsHovered] = useState(false);
	const [isFocused, setIsFocused] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const submitQuery = () => onSubmit(query);

	// On the preset (Write/Drafts/Inbox) tabs the box reads as a dimmed bar that
	// lights to full opacity while hovered or focused — mirroring the left
	// "Showing" strip — yet stays fully typeable so a search can be launched
	// straight from those tabs.
	const isLit = !dimUntilHover || isHovered || isFocused;

	useEffect(() => {
		// Keep the input in sync with the parent's active query so leaving/re-entering the tab
		// doesn't desync the right-rail search mode from the visible input state.
		setQuery(value ?? '');
	}, [value]);

	return (
		<div
			className="pointer-events-none fixed"
			style={{
				left: leftOverride ?? '50%',
				bottom: bottomOverride ?? CAMPAIGN_OVERVIEW_ASK_BOX_BOTTOM_PX,
				width: CAMPAIGN_OVERVIEW_ASK_BOX_WIDTH_PX,
				height: CAMPAIGN_OVERVIEW_ASK_BOX_HEIGHT_PX,
				transform: 'translateX(-50%)',
				zIndex: 126,
				opacity: isLit ? 1 : 0.4,
				transition: dimUntilHover ? 'opacity 0.18s ease' : undefined,
			}}
		>
			<div
				aria-label="Ask anything on this campaign"
				role="group"
				className="pointer-events-auto relative h-full w-full overflow-hidden font-inter text-black"
				style={{
					borderRadius: 10.863,
					border: '2px solid #000',
					background: '#EFFFF3',
					boxSizing: 'border-box',
				}}
				onMouseEnter={dimUntilHover ? () => setIsHovered(true) : undefined}
				onMouseLeave={dimUntilHover ? () => setIsHovered(false) : undefined}
				onMouseDown={(event) => {
					if ((event.target as HTMLElement).closest('button')) return;
					inputRef.current?.focus();
				}}
			>
				<input
					ref={inputRef}
					type="text"
					aria-label="Ask anything"
					value={query}
					placeholder="Ask Anything"
					className="pointer-events-auto absolute border-0 bg-transparent p-0 font-inter font-medium leading-none text-black outline-none placeholder:text-black placeholder:opacity-100"
					style={{
						left: 18,
						top: 9,
						width: 'calc(100% - 90px)',
						height: 24,
						fontSize: 16,
					}}
					onChange={(event) => setQuery(event.target.value)}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							submitQuery();
						}
					}}
				/>
				<button
					type="button"
					aria-label="Open campaign search"
					className="pointer-events-auto absolute flex items-center justify-center border-0 p-0 text-black"
					style={{
						right: 9,
						top: 9,
						width: 45,
						height: 37,
						borderRadius: 9,
						background: '#ADFFC2',
						boxSizing: 'border-box',
						cursor: 'pointer',
					}}
					onClick={submitQuery}
				>
					<MapBottomSearchArrowIcon aria-hidden="true" />
				</button>
			</div>
		</div>
	);
};

type CampaignOverviewStatusToggleProps = {
	selected: CampaignOverviewMapGrouping;
	isSearchActive?: boolean;
	onChange: (value: CampaignOverviewMapGrouping) => void;
};

const CampaignOverviewStatusToggle = ({
	selected,
	isSearchActive = false,
	onChange,
}: CampaignOverviewStatusToggleProps) => {
	const tabCount = isSearchActive ? 3 : 2;
	const selectedIndex = isSearchActive ? 0 : selected === 'category' ? 0 : 1;
	const toggleWidth = isSearchActive
		? CAMPAIGN_OVERVIEW_STATUS_TOGGLE_WIDTH_PX * 1.5
		: CAMPAIGN_OVERVIEW_STATUS_TOGGLE_WIDTH_PX;
	const textStyle: CSSProperties = {
		color: '#000',
		fontFamily: 'Inter, sans-serif',
		fontSize: 17,
		fontStyle: 'normal',
		fontWeight: 500,
		lineHeight: '14px',
	};
	const buttonStyle: CSSProperties = {
		...textStyle,
		position: 'relative',
		zIndex: 1,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		width: `${100 / tabCount}%`,
		height: '100%',
		border: 0,
		background: 'transparent',
		padding: 0,
		margin: 0,
		cursor: 'pointer',
	};

	return (
		<div
			className="pointer-events-none fixed left-1/2 flex items-center justify-center font-inter"
			style={{
				bottom: CAMPAIGN_OVERVIEW_STATUS_TOGGLE_BOTTOM_PX,
				width: CAMPAIGN_OVERVIEW_STATUS_STRIP_WIDTH_PX,
				height: CAMPAIGN_OVERVIEW_STATUS_TOGGLE_HEIGHT_PX,
				transform: 'translateX(calc(-50% - 24px))',
				zIndex: 126,
				gap: 28,
			}}
		>
			<span style={textStyle}>Group</span>
			<div
				role="group"
				aria-label="Campaign overview grouping"
				className="pointer-events-auto relative flex overflow-hidden"
				style={{
					width: toggleWidth,
					height: CAMPAIGN_OVERVIEW_STATUS_TOGGLE_HEIGHT_PX,
					borderRadius: 8,
				}}
			>
				<div
					aria-hidden="true"
					className="absolute inset-0"
					style={{
						borderRadius: 8,
						opacity: 0.45,
						background: '#EEF6F0',
					}}
				/>
				<div
					aria-hidden="true"
					className={cn(
						'absolute top-0 h-full',
						!isSearchActive && 'transition-all duration-150'
					)}
					style={{
						left: `${(selectedIndex * 100) / tabCount}%`,
						width: `${100 / tabCount}%`,
						borderRadius: 8,
						background: isSearchActive
							? '#A7F5D2'
							: selected === 'category'
								? '#A7F5B6'
								: '#BFF7FF',
					}}
				/>
				{isSearchActive ? (
					<button
						type="button"
						aria-pressed={true}
						style={buttonStyle}
						onClick={() => undefined}
					>
						Search
					</button>
				) : null}
				<button
					type="button"
					aria-pressed={!isSearchActive && selected === 'category'}
					style={buttonStyle}
					onClick={() => onChange('category')}
				>
					Category
				</button>
				<button
					type="button"
					aria-pressed={!isSearchActive && selected === 'status'}
					style={buttonStyle}
					onClick={() => onChange('status')}
				>
					Status
				</button>
			</div>
		</div>
	);
};

type CampaignOverviewStatusStripProps = {
	selectedStatuses: ReadonlySet<CampaignOverviewStatusKey>;
	disabled?: boolean;
	// `locked` keeps the selected pills highlighted at full opacity but makes the
	// strip non-interactive — used on the focused tabs where the filter is fixed.
	locked?: boolean;
	// Overrides the default viewport-centered `left` so the strip can be centered
	// over the left map region on the split-screen tabs.
	leftOverride?: string;
	// Overrides the default `bottom` offset (used to sit it lower on the focused tabs).
	bottomOverride?: number;
	onToggleStatus: (status: CampaignOverviewStatusKey) => void;
};

const CampaignOverviewStatusStrip = ({
	selectedStatuses,
	disabled = false,
	locked = false,
	leftOverride,
	bottomOverride,
	onToggleStatus,
}: CampaignOverviewStatusStripProps) => {
	const getItemStyle = (status: CampaignOverviewStatusKey): CSSProperties => ({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		whiteSpace: 'nowrap',
		height: CAMPAIGN_OVERVIEW_STATUS_PILL_HEIGHT_PX,
		padding: `0 ${CAMPAIGN_OVERVIEW_STATUS_PILL_PADDING_X_PX}px`,
		borderRadius: CAMPAIGN_OVERVIEW_STATUS_PILL_RADIUS_PX,
		border: 0,
		margin: 0,
		font: 'inherit',
		color: 'inherit',
		background:
			(!disabled || locked) && selectedStatuses.has(status)
				? CAMPAIGN_OVERVIEW_STATUS_PILL_COLOR[status]
				: 'transparent',
		opacity: locked ? 1 : disabled ? 0.55 : 1,
		cursor: locked || disabled ? 'default' : 'pointer',
	});

	return (
		<div
			role="group"
			aria-label="Campaign overview status"
			className="pointer-events-none fixed font-inter text-black"
			style={{
				left: leftOverride ?? '50%',
				bottom: bottomOverride ?? CAMPAIGN_OVERVIEW_STATUS_STRIP_BOTTOM_PX,
				width: CAMPAIGN_OVERVIEW_STATUS_STRIP_WIDTH_PX,
				height: CAMPAIGN_OVERVIEW_STATUS_STRIP_HEIGHT_PX,
				transform: 'translateX(-50%)',
				zIndex: 126,
			}}
		>
			<div
				aria-hidden="true"
				className="absolute inset-0"
				style={{
					borderRadius: 8,
					opacity: 0.45,
					background: '#EEF6F0',
				}}
			/>
			<div
				className="relative flex h-full items-center justify-between"
				style={{
					padding: '0 20px',
					color: '#000',
					fontFamily: 'Inter, sans-serif',
					fontSize: 15.627,
					fontStyle: 'normal',
					fontWeight: 500,
					lineHeight: '12.869px',
				}}
			>
				<button
					type="button"
					aria-pressed={selectedStatuses.has('contacts')}
					disabled={disabled || locked}
					className={cn(
						'transition-opacity duration-150',
						!locked && 'pointer-events-auto'
					)}
					style={getItemStyle('contacts')}
					onClick={() => onToggleStatus('contacts')}
				>
					<span>Contacts</span>
					<StatusContactsIcon width={17} height={17} aria-hidden="true" />
				</button>
				<button
					type="button"
					aria-pressed={selectedStatuses.has('drafts')}
					disabled={disabled || locked}
					className={cn(
						'transition-opacity duration-150',
						!locked && 'pointer-events-auto'
					)}
					style={getItemStyle('drafts')}
					onClick={() => onToggleStatus('drafts')}
				>
					<span>Drafts</span>
					<StatusDraftsIcon width={17} height={17} aria-hidden="true" />
				</button>
				<button
					type="button"
					aria-pressed={selectedStatuses.has('new-message')}
					disabled={disabled || locked}
					className={cn(
						'transition-opacity duration-150',
						!locked && 'pointer-events-auto'
					)}
					style={getItemStyle('new-message')}
					onClick={() => onToggleStatus('new-message')}
				>
					<span>New Messages</span>
					<StatusNewMessageIcon width={19} height={19} aria-hidden="true" />
				</button>
				<button
					type="button"
					aria-pressed={selectedStatuses.has('sent')}
					disabled={disabled || locked}
					className={cn(
						'transition-opacity duration-150',
						!locked && 'pointer-events-auto'
					)}
					style={getItemStyle('sent')}
					onClick={() => onToggleStatus('sent')}
				>
					<span>Sent</span>
					<StatusSentIcon width={19} height={19} aria-hidden="true" />
				</button>
			</div>
		</div>
	);
};

const CampaignOverviewBottomBoxes = ({
	contactsCount,
	draftCount,
	inboxCount,
	sentCount,
	onOpenSearch,
	onOpenContacts,
	onOpenDrafts,
	onOpenInbox,
	onOpenSent,
	onOpenOpportunities,
}: CampaignOverviewBottomBoxesProps) => {
	const boxStyle: CSSProperties = {
		width: 39.154,
		height: 39.154,
		borderRadius: 7.458,
		border: '0.725px solid #000',
		boxSizing: 'border-box',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
	};
	const countStyle: CSSProperties = {
		fontFamily: 'Inter, sans-serif',
		fontSize: 12.326,
		fontStyle: 'normal',
		fontWeight: 500,
		lineHeight: '10.151px',
		color: '#000',
	};
	const inactiveBox = (key: string, opacity: number) => (
		<div
			key={key}
			aria-hidden="true"
			style={{
				...boxStyle,
				opacity,
				background: '#F3EEE1',
			}}
		/>
	);
	const navBoxClassName = (onClick?: () => void) =>
		cn(
			'pointer-events-auto border-0 p-0 transition-opacity duration-150',
			onClick && 'hover:opacity-85'
		);
	const countBox = ({
		label,
		count,
		background,
		onClick,
	}: {
		label: string;
		count: number;
		background: string;
		onClick?: () => void;
	}) => (
		<button
			type="button"
			aria-label={`${count} ${label}`}
			disabled={!onClick}
			className={navBoxClassName(onClick)}
			style={{
				...boxStyle,
				...countStyle,
				background,
				cursor: onClick ? 'pointer' : 'default',
			}}
			onClick={onClick}
		>
			{count}
		</button>
	);

	return (
		<div
			className="pointer-events-none fixed left-0 right-0 flex justify-center"
			style={{ bottom: CAMPAIGN_OVERVIEW_BOTTOM_BOXES_BOTTOM_PX, zIndex: 125 }}
		>
			<div className="flex" style={{ gap: 3 }}>
				{inactiveBox('left-1', 0.1)}
				{inactiveBox('left-2', 0.2)}
				<button
					type="button"
					aria-label="Open search"
					disabled={!onOpenSearch}
					className={navBoxClassName(onOpenSearch)}
					style={{
						...boxStyle,
						background: '#FFFFFF',
						cursor: onOpenSearch ? 'pointer' : 'default',
					}}
					onClick={onOpenSearch}
				>
					<SearchIconDesktop width={17} height={18} stroke="#8B8B8B" strokeWidth={2.3} />
				</button>
				{countBox({
					label: 'contacts',
					count: contactsCount,
					background: '#EB8586',
					onClick: onOpenContacts,
				})}
				{countBox({
					label: 'drafts',
					count: draftCount,
					background: '#FFE3AA',
					onClick: onOpenDrafts,
				})}
				{countBox({
					label: 'inbox',
					count: inboxCount,
					background: '#6EBED5',
					onClick: onOpenInbox,
				})}
				{countBox({
					label: 'sent',
					count: sentCount,
					background: '#5AB478',
					onClick: onOpenSent,
				})}
				<button
					type="button"
					aria-label="Open inbox opportunities"
					disabled={!onOpenOpportunities}
					className={navBoxClassName(onOpenOpportunities)}
					style={{
						...boxStyle,
						background: '#EFD7D3',
						cursor: onOpenOpportunities ? 'pointer' : 'default',
					}}
					onClick={onOpenOpportunities}
				>
					<DashboardActionBarStarIcon width={15} height={15} style={{ color: '#E32222' }} />
				</button>
				{inactiveBox('right-1', 0.2)}
				{inactiveBox('right-2', 0.1)}
			</div>
		</div>
	);
};

const getCampaignViewFromUrlTab = (tab: string | null): ViewType => {
	switch (tab?.toLowerCase()) {
		case 'all':
		case 'overview':
			return 'overview';
		case 'inbox':
		case 'sent':
			return 'inbox';
		case 'drafts':
		case 'drafting':
			return 'drafting';
		case 'search':
			// Legacy deep link: search now lives on the dashboard pick flow. A redirect
			// effect sends ?tab=search there; render Summary in the meantime (mobile-safe
			// — never mounts HybridPromptInput; the desktop clamp coerces it to 'testing').
			return 'summary';
		case 'write':
		case 'testing':
		case 'contacts':
		default:
			return 'testing';
	}
};

const getInboxSentTabFromUrlTab = (tab: string | null): InboxSentTab => {
	return tab?.toLowerCase() === 'sent' ? 'sent' : 'inbox';
};

const getCampaignUrlTabForView = (
	view: ViewType,
	inboxSentTab: InboxSentTab
): CampaignUrlTab => {
	switch (view) {
		case 'overview':
			return 'all';
		case 'inbox':
			return inboxSentTab === 'sent' ? 'sent' : 'inbox';
		case 'sent':
			return 'sent';
		case 'drafting':
			return 'drafts';
		case 'testing':
			return 'write';
		case 'search':
			// Unreachable once nothing sets the in-campaign 'search' view; kept for
			// exhaustiveness while DraftingSectionView still carries it.
			return 'summary';
		case 'summary':
			return 'summary';
	}
};

const isCompactCampaignWorkspaceView = (view: ViewType) =>
	view === 'testing' || view === 'drafting' || view === 'inbox';

const getInitialCampaignWorkspaceViewFromLocation = (): ViewType => {
	if (typeof window === 'undefined') return 'testing';
	const params = new URLSearchParams(window.location.search);
	const tab = params.get('tab');
	if (
		params.get('inboxDebug') === '1' &&
		(!tab || getCampaignViewFromUrlTab(tab) !== 'inbox')
	) {
		return 'inbox';
	}
	return getCampaignViewFromUrlTab(tab);
};

// Transition duration in ms - fast enough to feel instant, still smooth
const TRANSITION_DURATION = 120;
// Safety valve: if a destination view is unusually slow to paint, don't block the transition forever.
const MAX_TRANSITION_WAIT_MS = 650;

const CAMPAIGN_MAP_SHIFT_X_VAR = '--murmur-campaign-map-shift-x';
const CAMPAIGN_TOP_NAV_SHIFT_X_VAR = '--murmur-campaign-top-nav-shift-x';
const CAMPAIGN_MAP_BACKDROP_START_VAR = '--murmur-campaign-map-backdrop-start';
const CAMPAIGN_MAP_BACKDROP_END_VAR = '--murmur-campaign-map-backdrop-end';
const CAMPAIGN_MAP_CONTENT_SCALE = CAMPAIGN_WORKSPACE_CONTENT_SCALE;

// The shift-x value the current DOM was painted with, read from the INLINE html
// style on purpose: the var is absent in scrollable/mobile modes, where the
// previous-layer pinning below must be skipped.
const readCampaignShiftXSnapshotPx = (): number | null => {
	if (typeof document === 'undefined') return null;
	const raw = document.documentElement.style.getPropertyValue(CAMPAIGN_MAP_SHIFT_X_VAR);
	const parsed = raw ? parseFloat(raw) : NaN;
	return Number.isFinite(parsed) ? parsed : null;
};

type CampaignViewSnapshot = {
	node: HTMLElement;
	// [flat element index, scrollTop, scrollLeft] — scroll offsets can only be
	// applied once the clone is attached and has layout, so they're replayed in
	// the overlay's mount callback rather than written onto the detached clone.
	scrolls: Array<[number, number, number]>;
};

// Static DOM snapshot of the active view layer for the tab crossfade's previous
// layer. A second React DraftingSection cannot faithfully reproduce what was on
// screen — component-local state (envelope expansion, breakpoint tiers, form
// text, selections, scroll) resets and pops at full opacity — and mounting that
// whole tree at click time is itself a frame hitch. A clone is pixel-faithful
// by construction and inert.
const cloneCampaignActiveViewLayer = (): CampaignViewSnapshot | null => {
	if (typeof document === 'undefined') return null;
	const layer = document.querySelector(
		'[data-campaign-view-layer="active"]'
	) as HTMLElement | null;
	if (!layer) return null;
	const node = layer.cloneNode(true) as HTMLElement;
	// Never a second "active" layer in the document: every zoom/envelope
	// measurement pass scopes its anchor queries to that selector.
	node.removeAttribute('data-campaign-view-layer');
	node.setAttribute('aria-hidden', 'true');
	// cloneNode copies attributes, not live element state — controlled inputs
	// keep their value in a DOM property, so restore it by walking both
	// (structurally identical) trees in parallel.
	const originals = layer.querySelectorAll<HTMLElement>('*');
	const copies = node.querySelectorAll<HTMLElement>('*');
	const scrolls: CampaignViewSnapshot['scrolls'] = [];
	const count = Math.min(originals.length, copies.length);
	for (let i = 0; i < count; i++) {
		const src = originals[i];
		const dst = copies[i];
		if (
			(src instanceof HTMLInputElement && dst instanceof HTMLInputElement) ||
			(src instanceof HTMLTextAreaElement && dst instanceof HTMLTextAreaElement) ||
			(src instanceof HTMLSelectElement && dst instanceof HTMLSelectElement)
		) {
			dst.value = src.value;
		}
		if (src instanceof HTMLInputElement && dst instanceof HTMLInputElement) {
			dst.checked = src.checked;
		}
		if (src.scrollTop || src.scrollLeft) {
			scrolls.push([i, src.scrollTop, src.scrollLeft]);
		}
	}
	return { node, scrolls };
};
const CAMPAIGN_MAP_FALLBACK_SHIFT_X_PX = 160;
const CAMPAIGN_MAP_MIN_SHIFT_X_PX = 88;
const CAMPAIGN_MAP_MAX_SHIFT_X_PX = 900;
const CAMPAIGN_STANDARD_RESEARCH_RIGHT_FROM_CENTER_PX = 657;
const CAMPAIGN_STANDARD_LEFT_PANEL_LEFT_FROM_CENTER_PX = -657;
const CAMPAIGN_RESEARCH_RIGHT_GAP_PX = 52;
const CAMPAIGN_BACKDROP_CONTENT_GUTTER_PX = 52;
const CAMPAIGN_BACKDROP_TARGET_START_RATIO = 1 / 3;
// Standard stage: the band targets a 1/3-viewport start, but on very wide layouts
// (ultrawides) that opens a huge empty gutter left of the content. Cap the extra
// at just above the largest tuned look (556px at 2560×1440) so tuned sizes are
// pixel-identical and only ultrawide layouts pull the band back toward content.
const CAMPAIGN_BACKDROP_MAX_EXTRA_GUTTER_PX = 600;
const CAMPAIGN_COMPACT_WORKSPACE_BACKDROP_WIDTH_PX = 985;
const CAMPAIGN_COMPACT_WORKSPACE_LEFT_PANEL_INSET_PX = 52;
const CAMPAIGN_COMPACT_WORKSPACE_TOP_NAV_INSET_PX = 184;
const CAMPAIGN_COMPACT_WORKSPACE_MAIN_PANEL_HALF_WIDTH_PX = 250;
const CAMPAIGN_COMPACT_WORKSPACE_CONTACT_PANEL_WIDTH_PX = 377;
const CAMPAIGN_COMPACT_WORKSPACE_MAIN_PANEL_GAP_PX = 34;
// Below this layout-px width, non-overview tabs drop the split map strip: the translucent
// band covers the full viewport and the workspace centers (shift = 0). Mirrors
// DraftingSection's isNarrowDesktop upper bound (< 1317), where the grouped layouts begin.
const CAMPAIGN_CENTERED_STAGE_COMPACT_MAX_LAYOUT_W_PX = 1317;
// The standard right-anchored cluster (Sent / expanded workspace) spans ±657·0.94 from
// center; with the 88px min shift clamp it clips the right edge below ~1418 layout px.
const CAMPAIGN_CENTERED_STAGE_STANDARD_MAX_LAYOUT_W_PX = 1418;
// On the compact (non-expanded) Write/Drafts/Inbox stage the bottom map cluster
// (status strip + ask box, ×CAMPAIGN_OVERVIEW_CLUSTER_SCALE, centered over the clear
// left strip) keeps a fixed size while the 985px band's left edge marches toward it
// as the window narrows. Below this layout width the band would overlap the cluster,
// so it hides early (the left "Showing" tool column stays — the band never reaches it).
const CAMPAIGN_COMPACT_PRESET_CLUSTER_MIN_LAYOUT_W_PX =
	CAMPAIGN_COMPACT_WORKSPACE_BACKDROP_WIDTH_PX +
	CAMPAIGN_OVERVIEW_STATUS_STRIP_WIDTH_PX * CAMPAIGN_OVERVIEW_CLUSTER_SCALE +
	16;
const CAMPAIGN_TOP_NAV_UI_SCALE = 0.85;
const CAMPAIGN_TOP_NAV_SEARCH_BAR_OUTER_WIDTH_PX = 440;
const CAMPAIGN_TOP_NAV_SEARCH_BAR_INPUT_HEIGHT_PX = 49;
const CAMPAIGN_TOP_NAV_BACKDROP_BOX_TOP_PX = 9;
const CAMPAIGN_TOP_NAV_BACKDROP_BOX_WIDTH_PX = Math.round(
	CAMPAIGN_TOP_NAV_SEARCH_BAR_OUTER_WIDTH_PX * (804 / 488.204)
);
const CAMPAIGN_TOP_NAV_BACKDROP_BOX_HEIGHT_PX = Math.round(
	CAMPAIGN_TOP_NAV_SEARCH_BAR_INPUT_HEIGHT_PX * (102 / 54)
);
const CAMPAIGN_TOP_NAV_BACKDROP_VISUAL_WIDTH_PX =
	CAMPAIGN_TOP_NAV_BACKDROP_BOX_WIDTH_PX * CAMPAIGN_TOP_NAV_UI_SCALE;
const CAMPAIGN_MAP_SELECT_GRAB_LEFT_PX = 26;

// The rail view-scale curve lives in murmurChromeZoom.ts (computeMapSelectGrabViewScale),
// shared with the dashboard map view so the left-side map tools look identical.
const CAMPAIGN_MAP_SELECT_GRAB_TOP_EXTENT_PX =
	MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
	MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
	MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
	MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
	MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX +
	MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
	MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX +
	MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX;
const CAMPAIGN_MAP_SELECT_GRAB_TOTAL_HEIGHT_PX =
	CAMPAIGN_MAP_SELECT_GRAB_TOP_EXTENT_PX + MAP_SELECT_GRAB_TOOL_COLLAPSED_HEIGHT_PX;

// Keep the left tool stack aligned with the dashboard's map-view chrome.
// The side-shift var (written by updateCampaignZoomForViewport) lowers the rail —
// and everything docked to it — toward vertical center on tall monitors; 0px on
// the 1080p baseline. Same scheme as the dashboard's --murmur-dashboard-side-shift.
const CAMPAIGN_MAP_TOOL_VISUAL_TOP_PX = 106;
const CAMPAIGN_MAP_TOOL_VISUAL_TOP_CSS = `calc((${CAMPAIGN_MAP_TOOL_VISUAL_TOP_PX}px + var(${CAMPAIGN_SIDE_SHIFT_VAR}, 0px)) / var(--murmur-campaign-zoom, 0.85))`;
const CAMPAIGN_MAP_TOOL_VISUAL_TOP_NUDGE_UP_CSS = `calc(4px / var(--murmur-campaign-zoom, 0.85))`;
// Zoom-control ladder + converters live in @/utils/mapZoomControlLadder (shared
// with the dashboard map view, so the calibration can't drift); the ladder is
// rebased at runtime off the map's viewport-proportional minimum zoom.

const resetCampaignDocumentScroll = () => {
	if (typeof window === 'undefined' || typeof document === 'undefined') return;

	const root = document.documentElement;
	const body = document.body;
	const hasScrollOffset =
		window.scrollX !== 0 ||
		window.scrollY !== 0 ||
		root.scrollTop !== 0 ||
		root.scrollLeft !== 0 ||
		body.scrollTop !== 0 ||
		body.scrollLeft !== 0;

	if (!hasScrollOffset) return;

	try {
		window.scrollTo(0, 0);
	} catch {
		// ignore
	}
	root.scrollTop = 0;
	root.scrollLeft = 0;
	body.scrollTop = 0;
	body.scrollLeft = 0;
};

const clampNumber = (n: number, min: number, max: number): number => {
	return Math.min(max, Math.max(min, n));
};

type CampaignMapZoomControlRequest = {
	zoom: number;
	nonce: number;
	isDragging?: boolean;
};

// Dynamically import heavy components to reduce initial bundle size and prevent Vercel timeout
const DraftingSection = nextDynamic(() =>
	import('./DraftingSection/DraftingSection').then((mod) => mod.DraftingSection)
);

const IdentityDialog = nextDynamic(
	() =>
		import('@/components/organisms/_dialogs/IdentityDialog/IdentityDialog').then(
			(mod) => mod.IdentityDialog
		),
	{}
);

// Dashboard inbox popover content (opened from the envelope icon in the campaign header)
const DashboardInboxSection = nextDynamic(
	() => import('@/components/molecules/InboxSection/InboxSection'),
	{
		ssr: false,
		loading: () => (
			<div
				className="relative flex flex-col items-center overflow-hidden"
				style={{
					width: '625px',
					height: '561px',
					border: '3px solid #000000',
					borderRadius: '8px',
					padding: '16px',
					paddingTop: '76px',
					backgroundColor: '#6fa4e1',
				}}
				aria-busy="true"
				aria-label="Loading inbox"
			>
				<span className="sr-only">Loading inbox…</span>

				{/* Search Bar skeleton */}
				<div
					style={{
						position: 'absolute',
						top: '13px',
						left: '14px',
						right: '286px', // 14px + 260px toggle + 12px gap
						height: '48px',
						border: '3px solid #000000',
						borderRadius: '8px',
												backgroundColor: '#FFFFFF',
						zIndex: 10,
						display: 'flex',
						alignItems: 'center',
						paddingLeft: '16px',
					}}
					aria-hidden
				>
					<div className="w-[18px] h-[18px] rounded-[3px] bg-black/20" />
					<div className="ml-4 h-[14px] w-[180px] rounded-[4px] bg-black/15" />
				</div>

				{/* Messages/Campaigns toggle skeleton */}
				<div
					style={{
						position: 'absolute',
						top: '13px',
						right: '14px',
						width: '260px',
						height: '48px',
						border: '3px solid #000000',
						borderRadius: '8px',
						overflow: 'hidden',
						backgroundColor: '#FFFFFF',
						zIndex: 10,
						display: 'flex',
					}}
					aria-hidden
				>
					<div
						aria-hidden
						style={{
							position: 'absolute',
							left: '50%',
							top: 0,
							bottom: 0,
							width: '3px',
							backgroundColor: '#000000',
							transform: 'translateX(-1.5px)',
							pointerEvents: 'none',
						}}
					/>
					<div className="h-full flex-1 bg-black/10" />
					<div className="h-full flex-1 bg-black/10" />
				</div>

				{/* Email row skeletons */}
				<div className="w-full flex flex-col items-center">
					{Array.from({ length: 6 }).map((_, idx) => (
						<div
							key={`dashboard-inbox-loading-${idx}`}
							className="select-none mb-2 overflow-hidden"
							style={{
								width: '587px',
								height: '78px',
								minHeight: '78px',
								border: '3px solid #000000',
								borderRadius: '8px',
								backgroundColor: '#FFFFFF',
								display: 'flex',
								alignItems: 'center',
								padding: '0 16px',
							}}
							aria-hidden
						>
							<div className="flex flex-col w-full">
								<div className="flex items-center justify-between gap-3">
									<div className="h-[14px] rounded bg-black/20 w-[180px]" />
									<div className="h-[14px] rounded bg-black/20 w-[90px]" />
								</div>
								<div className="mt-2 h-[12px] rounded bg-black/15 w-[260px]" />
								<div className="mt-2 h-[10px] rounded bg-black/15 w-[320px]" />
							</div>
						</div>
					))}
				</div>
			</div>
		),
	}
);

const Murmur = () => {
	// Add campaign-specific class to body for background styling
	useEffect(() => {
		document.body.classList.add('murmur-campaign');
		return () => {
			document.body.classList.remove('murmur-campaign');
		};
	}, []);
	const { campaign, campaignId, isPendingCampaign, setIsIdentityDialogOpen, isIdentityDialogOpen } =
		useCampaignDetail();
	// Route id is known immediately (before the detail query resolves), so the contact/email/inbound
	// queries can fire in parallel with useGetCampaign instead of waiting on campaign?.id.
	const routeCampaignId = campaignId ? Number(campaignId) : undefined;
	const isMobile = useIsMobile();
	const [viewportWidth, setViewportWidth] = useState(0);
	const [viewportHeight, setViewportHeight] = useState(0);
	const setPersistentMapConfig = usePersistentMapSetter();
	const {
		mood: globeWeatherMood,
		temperatureF: globeWeatherTemperatureF,
		regionCenter: globeWeatherRegionCenter,
	} = useGlobeWeatherMood();
	const globeNightLighting = useGlobeNightLighting();
	const CAMPAIGN_COMPACT_CLASS = 'murmur-campaign-compact';
	const CAMPAIGN_ZOOM_VAR = '--murmur-campaign-zoom';
	const CAMPAIGN_VIEWPORT_H_VAR = '--murmur-campaign-viewport-h';
	const DEFAULT_CAMPAIGN_ZOOM = 0.85;
	const CAMPAIGN_ZOOM_EVENT = 'murmur:campaign-zoom-changed';
	const CAMPAIGN_SCROLLABLE_CLASS = 'murmur-campaign-scrollable';
	const CAMPAIGN_FORCE_TRANSFORM_CLASS = 'murmur-campaign-force-transform';

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const update = () => {
			setViewportWidth(window.innerWidth);
			setViewportHeight(window.innerHeight);
		};
		update();
		window.addEventListener('resize', update, { passive: true });
		return () => window.removeEventListener('resize', update);
	}, []);

	const campaignMapSelectGrabViewScale = useMemo(() => {
		if (isMobile) return 1;
		// Shared curve (murmurChromeZoom.ts) — also feeds the side-shift centering math.
		return computeMapSelectGrabViewScale(
			viewportHeight,
			CAMPAIGN_MAP_SELECT_GRAB_TOTAL_HEIGHT_PX
		);
	}, [isMobile, viewportHeight]);
	const campaignMapSelectGrabOriginOffsetPx =
		CAMPAIGN_MAP_SELECT_GRAB_TOP_EXTENT_PX * campaignMapSelectGrabViewScale;
	const [isCampaignWorkspaceExpanded, setIsCampaignWorkspaceExpanded] = useState(false);
	const isCampaignWorkspaceExpandedRef = useRef(false);
	const campaignWorkspaceActiveViewRef = useRef<ViewType>(
		getInitialCampaignWorkspaceViewFromLocation()
	);
	// Allows other effects (e.g. tab switches) to re-register bottom anchors for zoom fitting.
	const refreshCampaignZoomAnchorObserversRef = useRef<(() => void) | null>(null);

	// Resolution-aware zoom calculation for campaign page
	const updateCampaignZoomForViewport = useCallback(() => {
		if (typeof window === 'undefined') return;

		const html = document.documentElement;
		// IMPORTANT: `visualViewport.width` can jitter on mobile / responsive emulation while scrolling
		// (address-bar/show-hide), which can accidentally flip us back into the no-scroll "nuclear" mode
		// mid-scroll. Use the stable layout viewport width for breakpoint decisions.
		const stableViewportW = window.innerWidth;
		const stableViewportH = window.innerHeight;

		// Safari desktop: prefer transform-based scaling (root `zoom` can mis-render and/or double-scale).
		let shouldForceTransform = false;
		try {
			const ua = navigator.userAgent || '';
			const vendor = navigator.vendor || '';
			shouldForceTransform =
				/Safari/.test(ua) &&
				/Apple Computer/.test(vendor) &&
				!/Chrome|CriOS|FxiOS|Edg/i.test(ua);
		} catch {
			// ignore
		}
		if (shouldForceTransform) {
			html.classList.add(CAMPAIGN_FORCE_TRANSFORM_CLASS);
		} else {
			html.classList.remove(CAMPAIGN_FORCE_TRANSFORM_CLASS);
		}

		// On the thinnest breakpoint (<= 776px), we *must* allow page scroll for the stacked layout.
		const THINNEST_VIEWPORT_W_PX = 776;
		const shouldAllowScroll = stableViewportW <= THINNEST_VIEWPORT_W_PX;

		// IMPORTANT:
		// The campaign page uses the "nuclear option" (overflow hidden + snug zoom fit) for normal + narrow.
		// On the thinnest breakpoint (<= 776px), we *must* allow page scroll for the stacked layout.
		//
		// On some browsers (notably those without CSS `zoom`), the combination of root-level scaling +
		// overflow locking can make scroll restoration unreliable. So on the thinnest breakpoint we:
		// - enable scroll mode via class
		// - disable campaign compact scaling entirely (removes overflow:hidden + zoom/transform fallback)
		if (shouldAllowScroll) {
			html.classList.add(CAMPAIGN_SCROLLABLE_CLASS);
			html.classList.remove(CAMPAIGN_COMPACT_CLASS);
			html.classList.remove(CAMPAIGN_FORCE_TRANSFORM_CLASS);
			html.style.removeProperty(CAMPAIGN_ZOOM_VAR);
			html.style.removeProperty(CAMPAIGN_VIEWPORT_H_VAR);
			html.style.removeProperty(CAMPAIGN_MAP_SHIFT_X_VAR);
			html.style.removeProperty(CAMPAIGN_TOP_NAV_SHIFT_X_VAR);
			html.style.removeProperty(CAMPAIGN_MAP_BACKDROP_START_VAR);
			html.style.removeProperty(CAMPAIGN_MAP_BACKDROP_END_VAR);
			html.style.removeProperty(CAMPAIGN_SIDE_SHIFT_VAR);
			// Clear any inline scroll locks that could prevent scrolling (defensive).
			try {
				document.body.style.overflow = '';
				document.body.style.overflowX = '';
				document.body.style.overflowY = '';
				document.body.style.position = '';
				document.body.style.top = '';
				document.body.style.width = '';
				document.body.style.touchAction = '';
				document.documentElement.style.overflow = '';
			} catch {
				// ignore
			}
			return;
		}

		// Never shrink the mobile campaign UI (it's already heavily tuned).
		// Still enforce the <=776px scrollable mode above.
		if (isMobile) {
			html.classList.remove(CAMPAIGN_SCROLLABLE_CLASS);
			html.classList.remove(CAMPAIGN_COMPACT_CLASS);
			html.classList.remove(CAMPAIGN_FORCE_TRANSFORM_CLASS);
			html.style.removeProperty(CAMPAIGN_ZOOM_VAR);
			html.style.removeProperty(CAMPAIGN_VIEWPORT_H_VAR);
			html.style.removeProperty(CAMPAIGN_MAP_SHIFT_X_VAR);
			html.style.removeProperty(CAMPAIGN_TOP_NAV_SHIFT_X_VAR);
			html.style.removeProperty(CAMPAIGN_MAP_BACKDROP_START_VAR);
			html.style.removeProperty(CAMPAIGN_MAP_BACKDROP_END_VAR);
			html.style.removeProperty(CAMPAIGN_SIDE_SHIFT_VAR);
			return;
		}

		// NOTE: We intentionally avoid `window.visualViewport` here.
		// Safari can fire `visualViewport.resize` (and report different viewport sizes) when we apply
		// CSS `zoom` to the root element, which can create a feedback loop that progressively shrinks
		// the campaign UI on first load. `innerWidth/innerHeight` reflect the stable layout viewport
		// we want for resolution mapping + snug-fit clamping.
		const viewportH = stableViewportH;
		const viewportW = stableViewportW;
		if (viewportH <= 0 || viewportW <= 0) return;
		html.style.setProperty(CAMPAIGN_VIEWPORT_H_VAR, `${viewportH}px`);

		// Shared chrome zoom target — single source of truth with the dashboard map
		// view (src/utils/murmurChromeZoom.ts): resolution tables, dock/windowed
		// overrides, guardrails. The snug-fit pass below may shrink the zoom so the
		// bottom panels stay visible, but never grows past this target, so the fixed
		// top-tab chrome renders at exactly the dashboard map view's size.
		let targetZoom = computeMurmurChromeZoomForViewport(
			viewportW,
			viewportH,
			window.screen
		);
		const chromeZoomTarget = targetZoom;
		const clampZoom = (z: number, min = -Infinity, max = Infinity) =>
			Math.min(max, Math.max(min, z));

		// Normal + narrow: keep compact mode (snug, no page scroll).
		html.classList.remove(CAMPAIGN_SCROLLABLE_CLASS);
		html.classList.add(CAMPAIGN_COMPACT_CLASS);
		// This route is a fixed-position workspace on desktop. If the document keeps a
		// restored/early wheel scroll offset, rect-based zoom fitting measures the wrong bottom.
		resetCampaignDocumentScroll();

		// Clamp zoom so the bottom panels remain fully visible (snug, no scroll).
		try {
			// IMPORTANT:
			// Only measure bottom anchors from the *active* view layer.
			// During tab switches we can temporarily render both the active and previous
			// views (crossfade). If we query the whole document we may pick up the previous
			// view's anchors, which can slightly change the snug-fit zoom and therefore the
			// computed X-shift. That manifests as a one-time 1-5px horizontal nudge after
			// leaving the Overview tab.
			const anchorScope =
				(document.querySelector('[data-campaign-view-layer="active"]') as HTMLElement | null) ??
				document.body;
			const anchors = Array.from(
				anchorScope.querySelectorAll<HTMLElement>('[data-campaign-bottom-anchor]')
			);
			if (anchors.length > 0) {
				// Keep the campaign bottom panels' measured bottom exactly 22px above the viewport.
				const SAFE_BOTTOM_MARGIN_PX = CAMPAIGN_SNUG_SAFE_BOTTOM_MARGIN_PX;
				const ABSOLUTE_MIN_DOCK_CLAMP_ZOOM = 0.5;
				const ABSOLUTE_MAX_HEIGHT_FIT_ZOOM = CAMPAIGN_SNUG_MAX_HEIGHT_FIT_ZOOM;
				const availableH = Math.max(0, viewportH - SAFE_BOTTOM_MARGIN_PX);

				const isTransformScaleMode = (() => {
					try {
						if (html.classList.contains(CAMPAIGN_FORCE_TRANSFORM_CLASS)) return true;
						return window.getComputedStyle(document.body).transform !== 'none';
					} catch {
						return false;
					}
				})();

				// Both scaling modes measure the anchors' visual rects and divide out the
				// root-level scale. Rects (unlike offsetTop chains) include the inner
				// campaign-content scale (CAMPAIGN_MAP_CONTENT_SCALE) — an offset-based
				// measurement overestimates the content bottom by that factor, which made
				// the Safari snug fit pick a too-small zoom and float the bottom panels
				// ~55px above the viewport bottom.
				const maxBottomPx = anchors.reduce((acc, el) => {
					const rect = el.getBoundingClientRect();
					return Math.max(acc, rect.bottom);
				}, 0);

				const computed = window.getComputedStyle(html);
				const varZoomStr = computed.getPropertyValue(CAMPAIGN_ZOOM_VAR);
				const parsedVarZoom = varZoomStr ? parseFloat(varZoomStr) : NaN;
				let appliedScale =
					Number.isFinite(parsedVarZoom) && parsedVarZoom > 0
						? parsedVarZoom
						: DEFAULT_CAMPAIGN_ZOOM;
				if (isTransformScaleMode) {
					// The scale lives on body's transform matrix (`matrix(s, 0, 0, s, tx, ty)`).
					try {
						const bodyTransform = window.getComputedStyle(document.body).transform;
						const matrixMatch =
							bodyTransform && bodyTransform !== 'none'
								? bodyTransform.match(/matrix\(\s*([^,]+),/)
								: null;
						const parsedScale = matrixMatch ? parseFloat(matrixMatch[1]) : NaN;
						if (Number.isFinite(parsedScale) && parsedScale > 0) {
							appliedScale = parsedScale;
						}
					} catch {
						// keep the zoom-var fallback
					}
				} else {
					const zoomStr = computed.zoom;
					const parsedZoom = zoomStr ? parseFloat(zoomStr) : NaN;
					if (Number.isFinite(parsedZoom) && parsedZoom > 0 && parsedZoom !== 1) {
						appliedScale = parsedZoom;
					}
				}

				const unscaledBottomPx = appliedScale > 0 ? maxBottomPx / appliedScale : maxBottomPx;

				if (unscaledBottomPx > 0) {
					// Calculate exact zoom to make the content bottom align with the viewport bottom
					const zoomToFitHeight = availableH / unscaledBottomPx;

					if (Number.isFinite(zoomToFitHeight) && zoomToFitHeight > 0) {
						// Apply the fit-height zoom, but constrained:
						// 1. Never shrink below ABSOLUTE_MIN_DOCK_CLAMP_ZOOM (0.5)
						// 2. Never grow above ABSOLUTE_MAX_HEIGHT_FIT_ZOOM (1.2)
						// 3. Ensure we don't break the layout width (keep effective width >= 952px)
						// 4. Never grow above the shared chrome zoom target — the workspace
						//    layout expands its vertical envelope instead (DraftingSection's
						//    extraEnvelopeHeightPx), so the snug fit lands AT the target and
						//    the chrome matches the dashboard map view exactly.

						const minEffectiveWidth = CAMPAIGN_SNUG_MIN_EFFECTIVE_WIDTH_PX;
						const maxZoomForWidth = viewportW / minEffectiveWidth;

						const finalMaxZoom = Math.min(
							ABSOLUTE_MAX_HEIGHT_FIT_ZOOM,
							maxZoomForWidth,
							chromeZoomTarget
						);

						targetZoom = Math.min(
							Math.max(zoomToFitHeight, ABSOLUTE_MIN_DOCK_CLAMP_ZOOM),
							finalMaxZoom
						);
					}
				}
			}
		} catch {
			// no-op
		}

		const campaignZoom = targetZoom > 0 ? targetZoom : DEFAULT_CAMPAIGN_ZOOM;
		const layoutViewportW = viewportW / campaignZoom;
		// Both split branches legitimately want shift ≈ layoutViewportW/2 − k (k ≥ ~315),
		// so the fixed 900px cap binds on large monitors and drags the workspace left of
		// the band. Derive the guard from geometry — the content center may never shift
		// past the right viewport edge — keeping 900 as the floor for continuity.
		const maxMapShiftXPx = Math.max(CAMPAIGN_MAP_MAX_SHIFT_X_PX, layoutViewportW / 2);
		const isCompactWorkspaceActive =
			!isCampaignWorkspaceExpandedRef.current &&
			isCompactCampaignWorkspaceView(campaignWorkspaceActiveViewRef.current);

		let campaignMapShiftX: number;
		let campaignTopNavShiftX: number;
		let campaignBackdropStartCss: number;
		let campaignBackdropEndCss: number;

		const centeredStageMaxLayoutW = isCompactWorkspaceActive
			? CAMPAIGN_CENTERED_STAGE_COMPACT_MAX_LAYOUT_W_PX
			: CAMPAIGN_CENTERED_STAGE_STANDARD_MAX_LAYOUT_W_PX;
		const isCenteredStage =
			campaignWorkspaceActiveViewRef.current !== 'overview' &&
			layoutViewportW < centeredStageMaxLayoutW;

		if (isCenteredStage) {
			// Narrow windows: drop the split map strip entirely — the translucent band
			// covers the full viewport and the grouped/stacked workspace centers unshifted.
			campaignMapShiftX = 0;
			campaignTopNavShiftX = 0;
			campaignBackdropStartCss = 0;
			campaignBackdropEndCss = layoutViewportW;
		} else if (isCompactWorkspaceActive) {
			campaignBackdropStartCss = clampZoom(
				layoutViewportW - CAMPAIGN_COMPACT_WORKSPACE_BACKDROP_WIDTH_PX,
				0,
				layoutViewportW
			);
			campaignBackdropEndCss = layoutViewportW;

			const compactLeftContentClusterLeftCss =
				campaignBackdropStartCss + CAMPAIGN_COMPACT_WORKSPACE_LEFT_PANEL_INSET_PX;
			const calculatedShiftX =
				compactLeftContentClusterLeftCss -
				layoutViewportW / 2 -
				CAMPAIGN_MAP_CONTENT_SCALE * CAMPAIGN_STANDARD_LEFT_PANEL_LEFT_FROM_CENTER_PX;

			campaignMapShiftX = clampZoom(
				calculatedShiftX,
				CAMPAIGN_MAP_MIN_SHIFT_X_PX,
				maxMapShiftXPx
			);

			const currentTopNavLeftCss =
				layoutViewportW / 2 - CAMPAIGN_TOP_NAV_BACKDROP_VISUAL_WIDTH_PX / 2;
			campaignTopNavShiftX =
				campaignBackdropStartCss +
				CAMPAIGN_COMPACT_WORKSPACE_TOP_NAV_INSET_PX -
				currentTopNavLeftCss;
		} else {
			const targetResearchRightCss =
				(viewportW - CAMPAIGN_RESEARCH_RIGHT_GAP_PX) / campaignZoom;
			const calculatedShiftX =
				targetResearchRightCss -
				layoutViewportW / 2 -
				CAMPAIGN_MAP_CONTENT_SCALE * CAMPAIGN_STANDARD_RESEARCH_RIGHT_FROM_CENTER_PX;
			campaignMapShiftX = clampZoom(
				calculatedShiftX,
				CAMPAIGN_MAP_MIN_SHIFT_X_PX,
				maxMapShiftXPx
			);
			campaignTopNavShiftX = campaignMapShiftX;

			const leftContentClusterLeftCss =
				layoutViewportW / 2 +
				CAMPAIGN_MAP_CONTENT_SCALE * CAMPAIGN_STANDARD_LEFT_PANEL_LEFT_FROM_CENTER_PX +
				campaignMapShiftX;
			const contentAlignedBackdropStartCss =
				leftContentClusterLeftCss - CAMPAIGN_BACKDROP_CONTENT_GUTTER_PX / campaignZoom;
			const twoThirdsBackdropStartCss =
				layoutViewportW * CAMPAIGN_BACKDROP_TARGET_START_RATIO;
			campaignBackdropStartCss = clampZoom(
				Math.max(
					Math.min(contentAlignedBackdropStartCss, twoThirdsBackdropStartCss),
					contentAlignedBackdropStartCss - CAMPAIGN_BACKDROP_MAX_EXTRA_GUTTER_PX
				),
				0,
				layoutViewportW
			);
			campaignBackdropEndCss = layoutViewportW;
		}

		html.style.setProperty(CAMPAIGN_MAP_SHIFT_X_VAR, `${campaignMapShiftX.toFixed(2)}px`);
		html.style.setProperty(
			CAMPAIGN_TOP_NAV_SHIFT_X_VAR,
			`${campaignTopNavShiftX.toFixed(2)}px`
		);
		html.style.setProperty(
			CAMPAIGN_MAP_BACKDROP_START_VAR,
			`${campaignBackdropStartCss.toFixed(2)}px`
		);
		html.style.setProperty(
			CAMPAIGN_MAP_BACKDROP_END_VAR,
			`${campaignBackdropEndCss.toFixed(2)}px`
		);
		// Vertical-centering shift for the side chrome (left rail + the All-tab panels
		// docked to it / to the header). Written before the zoom-changed dispatch below
		// so DraftingSection's dock re-measures read the shifted rail rects.
		html.style.setProperty(
			CAMPAIGN_SIDE_SHIFT_VAR,
			`${computeSideRailCenterShiftPx(
				viewportH,
				targetZoom,
				CAMPAIGN_MAP_SELECT_GRAB_TOTAL_HEIGHT_PX
			)}px`
		);

		const existingOverrideStr = html.style.getPropertyValue(CAMPAIGN_ZOOM_VAR);
		const existingOverride = existingOverrideStr ? parseFloat(existingOverrideStr) : NaN;
		const existingZoom =
			Number.isFinite(existingOverride) && existingOverride > 0
				? existingOverride
				: DEFAULT_CAMPAIGN_ZOOM;

		if (Math.abs(existingZoom - targetZoom) < 0.002) {
			try {
				window.dispatchEvent(
					new CustomEvent(CAMPAIGN_ZOOM_EVENT, { detail: { zoom: targetZoom } })
				);
			} catch {
				// no-op
			}
			return;
		}

		if (Math.abs(targetZoom - DEFAULT_CAMPAIGN_ZOOM) < 0.002) {
			html.style.removeProperty(CAMPAIGN_ZOOM_VAR);
		} else {
			html.style.setProperty(CAMPAIGN_ZOOM_VAR, targetZoom.toFixed(3));
		}

		// Optional debugging for tuning (enable via `?debugCampaignZoom=1` or localStorage key).
		let debugCampaignZoom = false;
		try {
			debugCampaignZoom =
				window.location.search.includes('debugCampaignZoom=1') ||
				window.localStorage.getItem('murmur:debugCampaignZoom') === '1';
		} catch {
			// ignore
		}
		if (debugCampaignZoom) {
			console.debug('[CampaignZoom]', {
				viewportW,
				viewportH,
				targetZoom,
				chromeZoomTarget,
				forceTransform: shouldForceTransform,
				htmlZoom: (() => {
					try {
						return window.getComputedStyle(html).zoom;
					} catch {
						return 'unknown';
					}
				})(),
				bodyTransform: (() => {
					try {
						return window.getComputedStyle(document.body).transform;
					} catch {
						return 'unknown';
					}
				})(),
				campaignZoomVar: (() => {
					try {
						return window.getComputedStyle(html).getPropertyValue(CAMPAIGN_ZOOM_VAR);
					} catch {
						return 'unknown';
					}
				})(),
			});
		}

		try {
			window.dispatchEvent(
				new CustomEvent(CAMPAIGN_ZOOM_EVENT, { detail: { zoom: targetZoom } })
			);
		} catch {
			// no-op
		}
	}, [isMobile]);

	// Make the campaign page render slightly "zoomed out" on desktop (85%),
	// without changing the rest of the Murmur app.
	useLayoutEffect(() => {
		// Avoid running until we know whether this is a real mobile device.
		if (isMobile === null) return;

		let cancelled = false;
		let scheduledRaf: number | null = null;
		let scrollResetRaf: number | null = null;
		const resizeSettleTimers: ReturnType<typeof setTimeout>[] = [];
		const scheduleZoomUpdate = () => {
			if (cancelled) return;
			if (scheduledRaf !== null) return;
			scheduledRaf = window.requestAnimationFrame(() => {
				scheduledRaf = null;
				if (cancelled) return;
				updateCampaignZoomForViewport();
			});
		};
		const keepCompactPageAtOrigin = () => {
			if (cancelled) return;
			const html = document.documentElement;
			if (!html.classList.contains(CAMPAIGN_COMPACT_CLASS)) return;
			if (html.classList.contains(CAMPAIGN_SCROLLABLE_CLASS)) return;
			if (scrollResetRaf !== null) return;

			scrollResetRaf = window.requestAnimationFrame(() => {
				scrollResetRaf = null;
				if (cancelled) return;
				resetCampaignDocumentScroll();
			});
		};

		const SAFE_BOTTOM_MARGIN_PX = 22;

		// Observe the campaign bottom anchor(s) and re-run zoom fitting if they become clipped.
		// This fixes intermittent first-load cases where layout settles after our initial measurement
		// (e.g., data/font-driven layout shifts), and the bottom panels end up slightly cut off until
		// the user triggers a resize (browser zoom / monitor swap).
		let io: IntersectionObserver | null = null;
		const observedAnchors = new WeakSet<HTMLElement>();
		const refreshBottomAnchors = () => {
			if (cancelled) return;
			if (!io) return;
			const scope =
				(document.querySelector(
					'[data-campaign-view-layer="active"]'
				) as HTMLElement | null) ?? document.body;
			scope
				.querySelectorAll<HTMLElement>('[data-campaign-bottom-anchor]')
				.forEach((el) => {
					if (observedAnchors.has(el)) return;
					observedAnchors.add(el);
					io?.observe(el);
				});
		};

		if (isMobile === false && typeof IntersectionObserver !== 'undefined') {
			io = new IntersectionObserver(
				(entries) => {
					if (cancelled) return;
					const html = document.documentElement;
					// Only enforce "snug fit" in compact (non-scrollable) mode.
					if (!html.classList.contains(CAMPAIGN_COMPACT_CLASS)) return;
					if (html.classList.contains(CAMPAIGN_SCROLLABLE_CLASS)) return;

					const viewportH = window.innerHeight;
					const safeMargin = SAFE_BOTTOM_MARGIN_PX;
					for (const entry of entries) {
						const rect = entry.boundingClientRect;
						if (rect.width <= 0 || rect.height <= 0) continue;
						// If the bottom anchor is below the safe area (or clipped), re-fit zoom.
						if (rect.bottom > viewportH - safeMargin + 1) {
							scheduleZoomUpdate();
							break;
						}
					}
				},
				// Threshold 1 means we get callbacks when an anchor becomes fully visible / not fully visible.
				{ threshold: [1] }
			);
		}

		const clearResizeSettleTimers = () => {
			while (resizeSettleTimers.length > 0) {
				const timer = resizeSettleTimers.pop();
				if (timer) clearTimeout(timer);
			}
		};

		const scheduleZoomSettlePasses = () => {
			refreshBottomAnchors();
			scheduleZoomUpdate();
			clearResizeSettleTimers();
			for (const ms of [50, 150, 300]) {
				resizeSettleTimers.push(
					setTimeout(() => {
						if (cancelled) return;
						refreshBottomAnchors();
						scheduleZoomUpdate();
					}, ms)
				);
			}
		};

		const onResize = () => {
			// Safari fullscreen / rapid vertical resize settles over multiple frames.
			scheduleZoomSettlePasses();
		};
		// DraftingSection grows its vertical envelope (extraEnvelopeHeightPx) so the
		// snug fit lands at the shared chrome zoom target. That can commit AFTER the
		// resize settle passes (e.g. inbox content loads late), so it announces the
		// change and we re-fit against the moved anchors. The re-fit must be
		// SYNCHRONOUS: the dispatch comes from a layout effect (pre-paint), and a
		// rAF here can land after the paint (WebKit always; any engine when the
		// dispatching commit itself ran in the rAF phase), painting a frame with
		// vars computed against the pre-envelope DOM — a visible tab-switch jerk.
		const onEnvelopeChanged = () => {
			if (cancelled) return;
			refreshBottomAnchors();
			updateCampaignZoomForViewport();
		};
		window.addEventListener(
			'murmur:campaign-envelope-changed',
			onEnvelopeChanged as EventListener
		);
		// Defensive: clear any stale campaign zoom (e.g. Safari BFCache restores).
		try {
			document.documentElement.style.removeProperty(CAMPAIGN_ZOOM_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_VIEWPORT_H_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_SHIFT_X_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_TOP_NAV_SHIFT_X_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_BACKDROP_START_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_BACKDROP_END_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_SIDE_SHIFT_VAR);
		} catch {
			// ignore
		}

		updateCampaignZoomForViewport();
		// Re-run on the next frame to catch late style/font application (especially Safari/WebKit).
		const rafId = window.requestAnimationFrame(() => updateCampaignZoomForViewport());
		// Register anchors immediately (in case DraftingSection was already loaded/cached).
		refreshBottomAnchors();
		// Expose refresh for view switches (DraftingSection swaps when tab changes).
		refreshCampaignZoomAnchorObserversRef.current = refreshBottomAnchors;
		// Re-run once the drafting UI mounts so the bottom-panels clamp can measure real DOM.
		// (DraftingSection is dynamically imported, so it may not exist on the first call.)
		let mo: MutationObserver | null = null;
		if (isMobile === false && typeof MutationObserver !== 'undefined') {
			mo = new MutationObserver(() => {
				// DraftingSection (and its bottom anchors) mount asynchronously; once present, observe them.
				refreshBottomAnchors();
				// Wait until the campaign view layer exists (i.e. DraftingSection has mounted)
				// before performing the "measure real DOM" zoom update + disconnecting this observer.
				const activeLayer = document.querySelector(
					'[data-campaign-view-layer="active"]'
				) as HTMLElement | null;
				if (!activeLayer) return;

				// Only proceed once a visible anchor exists in the active layer.
				const anchors = Array.from(
					activeLayer.querySelectorAll<HTMLElement>('[data-campaign-bottom-anchor]')
				);
				const hasVisibleAnchor = anchors.some((el) => {
					try {
						const cs = window.getComputedStyle(el);
						if (cs.display === 'none') return false;
						if (cs.visibility === 'hidden') return false;
						if (cs.opacity === '0') return false;
						const rect = el.getBoundingClientRect();
						return rect.width > 0 && rect.height > 0;
					} catch {
						return false;
					}
				});
				if (!hasVisibleAnchor) return;
				requestAnimationFrame(() => updateCampaignZoomForViewport());
				mo?.disconnect();
			});
			const observeRoot =
				(document.querySelector(
					'[data-campaign-view-layer="active"]'
				) as HTMLElement | null) ?? document.body;
			mo.observe(observeRoot, { childList: true, subtree: true });
		}
		window.addEventListener('resize', onResize, { passive: true });
		window.addEventListener('scroll', keepCompactPageAtOrigin, { passive: true });
		const onPageShow = (e: PageTransitionEvent) => {
			if (e.persisted) scheduleZoomSettlePasses();
		};
		window.addEventListener('pageshow', onPageShow);
		document.addEventListener('fullscreenchange', onResize);
		document.addEventListener('webkitfullscreenchange', onResize as EventListener);

		return () => {
			cancelled = true;
			refreshCampaignZoomAnchorObserversRef.current = null;
			window.removeEventListener(
				'murmur:campaign-envelope-changed',
				onEnvelopeChanged as EventListener
			);
			document.documentElement.classList.remove(CAMPAIGN_COMPACT_CLASS);
			document.documentElement.classList.remove(CAMPAIGN_SCROLLABLE_CLASS);
			document.documentElement.classList.remove(CAMPAIGN_FORCE_TRANSFORM_CLASS);
			document.documentElement.style.removeProperty(CAMPAIGN_ZOOM_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_VIEWPORT_H_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_SHIFT_X_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_TOP_NAV_SHIFT_X_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_BACKDROP_START_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_BACKDROP_END_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_SIDE_SHIFT_VAR);
			if (scheduledRaf !== null) window.cancelAnimationFrame(scheduledRaf);
			if (scrollResetRaf !== null) window.cancelAnimationFrame(scrollResetRaf);
			clearResizeSettleTimers();
			io?.disconnect();
			mo?.disconnect();
			window.cancelAnimationFrame(rafId);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('scroll', keepCompactPageAtOrigin);
			window.removeEventListener('pageshow', onPageShow);
			document.removeEventListener('fullscreenchange', onResize);
			document.removeEventListener('webkitfullscreenchange', onResize as EventListener);
		};
	}, [isMobile, updateCampaignZoomForViewport]);

	const router = useRouter();
	const searchParams = useSearchParams();
	const originParam = searchParams.get('origin');
	const cameFromSearch = originParam === 'search';
	// Set only by the dashboard's add-to-campaign pushes — pure tab-switch arrivals
	// (origin=search without it) skip the contacts refetch below.
	const searchAddedContacts = searchParams.get('added') === '1';
	const tabParam = searchParams.get('tab');
	const inboxDebugEnabled = searchParams.get('inboxDebug') === '1';
	const [inboxMockState, setInboxMockState] = useState<
		CampaignInboxMockState | undefined
	>(undefined);
	const [identityDialogOrigin, setIdentityDialogOrigin] = useState<'campaign' | 'search'>(
		cameFromSearch ? 'search' : 'campaign'
	);

	const [isTopSearchHighlighted, setTopSearchHighlighted] = useState(false);
	const [isHomeButtonHighlighted, setHomeButtonHighlighted] = useState(false);
	const [isDraftsTabHighlighted, setDraftsTabHighlighted] = useState(false);
	const [isInboxTabHighlighted, setInboxTabHighlighted] = useState(false);
	const [isWriteTabHighlighted, setWriteTabHighlighted] = useState(false);
	const topSearchHighlightCtx = useMemo(
		() => ({
			isTopSearchHighlighted,
			setTopSearchHighlighted,
			isHomeButtonHighlighted,
			setHomeButtonHighlighted,
			isDraftsTabHighlighted,
			setDraftsTabHighlighted,
			isInboxTabHighlighted,
			setInboxTabHighlighted,
			isWriteTabHighlighted,
			setWriteTabHighlighted,
		}),
		[
			isTopSearchHighlighted,
			isHomeButtonHighlighted,
			isDraftsTabHighlighted,
			isInboxTabHighlighted,
			isWriteTabHighlighted,
		]
	);

	const topSearchHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Hoisted above the Search-tab handlers: the curated prefetch below keys its
	// localStorage cache by user id.
	const { user, isPendingUser, isLoaded } = useMe();

	// Speculative "For You" prefetch for the Search tab: starts the curated fetch the
	// dashboard pick-flow is about to run (and warms the IP-location cache it awaits)
	// so the route swap overlaps the search instead of serializing after it. Fired on
	// hover intent and again as a guaranteed floor inside the click handler — repeat
	// calls dedupe via the module-scope slot/cache.
	const prefetchDashboardCuratedForYou = useCallback(() => {
		void prefetchCuratedForYouFromCampaign(user?.id);
	}, [user?.id]);

	// Hover tier for the Search tab (template: the dashboard's campaign-tab prefetch):
	// ~120ms of sustained hover means real intent — an incidental pass-over shouldn't
	// cost a curated search. Pointerdown (about to click) fires immediately.
	const searchTabPrefetchTimerRef = useRef<number | null>(null);
	const handleSearchTabPointerEnter = useCallback(() => {
		if (searchTabPrefetchTimerRef.current) {
			window.clearTimeout(searchTabPrefetchTimerRef.current);
		}
		searchTabPrefetchTimerRef.current = window.setTimeout(() => {
			searchTabPrefetchTimerRef.current = null;
			prefetchDashboardCuratedForYou();
		}, 120);
	}, [prefetchDashboardCuratedForYou]);
	const handleSearchTabPointerLeave = useCallback(() => {
		if (searchTabPrefetchTimerRef.current) {
			window.clearTimeout(searchTabPrefetchTimerRef.current);
			searchTabPrefetchTimerRef.current = null;
		}
	}, []);
	const handleSearchTabPointerDown = useCallback(() => {
		if (searchTabPrefetchTimerRef.current) {
			window.clearTimeout(searchTabPrefetchTimerRef.current);
			searchTabPrefetchTimerRef.current = null;
		}
		prefetchDashboardCuratedForYou();
	}, [prefetchDashboardCuratedForYou]);
	useEffect(() => {
		return () => {
			if (searchTabPrefetchTimerRef.current) {
				window.clearTimeout(searchTabPrefetchTimerRef.current);
			}
		};
	}, []);

	// Moved here to be accessible by the keydown listener
	const handleOpenDashboardSearchForCampaign = useCallback(() => {
		if (!campaign) return;

		prefetchDashboardCuratedForYou();

		try {
			sessionStorage.removeItem('murmur_pending_search');
		} catch {
			// sessionStorage may be unavailable — navigation can still proceed.
		}

		// Soft client-side navigation: the shared /murmur layout keeps the persistent
		// Mapbox map mounted across the route swap and the bundle is already parsed, so
		// there's no white-flash full reload. The dashboard page remounts fresh, so its
		// URL-param rehydration effects (fromCampaignId / pick / allContacts) re-run and
		// re-enter map-search mode exactly as a full reload did.
		// `instant=1` is a one-shot signal: the dashboard snaps the persistent map straight to the
		// search framing (no background-globe flash, no pan-down) only for this tab transition.
		// Mobile omits allContacts=1 so the entry stays engaged on the fresh "For You"
		// curated picks (the pill + pins) instead of disengaging to ambient all-contacts.
		markPerf('murmur:pick:click');
		router.push(
			`${urls.murmur.dashboard.index}?fromCampaignId=${campaign.id}&pick=1${
				isMobile === true ? '' : '&allContacts=1'
			}&instant=1`
		);
	}, [campaign, isMobile, prefetchDashboardCuratedForYou, router]);

	// Legacy ?tab=search deep link (the in-campaign mobile search view is gone — search
	// lives on the dashboard pick flow). Capture the param once on mount: the tab URL
	// mirror below rewrites tab=search to the rendered view's tab in the same commit,
	// so the live searchParams value can't be trusted across commits. Redirect once
	// isMobile resolves (the device decides the entry URL), using the route campaignId
	// so this works before the campaign query lands. router.replace keeps Back from
	// bouncing through the redirect.
	const [hadSearchTabDeepLink, setHadSearchTabDeepLink] = useState(() => {
		if (typeof window === 'undefined') return false;
		const tab = new URLSearchParams(window.location.search).get('tab');
		return tab?.toLowerCase() === 'search';
	});
	useEffect(() => {
		if (!hadSearchTabDeepLink) return;
		if (isMobile === null) return;
		if (!routeCampaignId) return;
		setHadSearchTabDeepLink(false);
		try {
			sessionStorage.removeItem('murmur_pending_search');
		} catch {
			// sessionStorage may be unavailable — navigation can still proceed.
		}
		router.replace(
			`${urls.murmur.dashboard.index}?fromCampaignId=${routeCampaignId}&pick=1${
				isMobile ? '' : '&allContacts=1'
			}&instant=1`
		);
	}, [hadSearchTabDeepLink, isMobile, routeCampaignId, router]);

	// Warm the dashboard route's JS chunks while the user is on the campaign page so the
	// soft navigation above lands instantly.
	useEffect(() => {
		router.prefetch(urls.murmur.dashboard.index);
	}, [router]);

	// Warm the coarse IP geolocation on idle (cached 24h, in-flight deduped). The dashboard's
	// pick-flow rehydration awaits it before the curated search — cold, that's an external IP
	// round-trip (up to two 4s-timeout providers) sitting serially inside the Search tab
	// transition. Mirrors the dashboard's own idle warm.
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const warm = () => void getApproximateLocation().catch(() => undefined);
		const idle = window as unknown as {
			requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
			cancelIdleCallback?: (handle: number) => void;
		};
		if (typeof idle.requestIdleCallback === 'function') {
			const handle = idle.requestIdleCallback(warm, { timeout: 2000 });
			return () => idle.cancelIdleCallback?.(handle);
		}
		const timer = window.setTimeout(warm, 500);
		return () => window.clearTimeout(timer);
	}, []);

	// Campaign Search should always stay pinned to the campaign the user is viewing.
	const handleGoToDashboardSearch = handleOpenDashboardSearchForCampaign;
	// Overview (All tab) local search state: when set, the right-rail swaps to the dashboard-style
	// Search Results panel, but results are filtered to this campaign's contacts.
	const [overviewSearchQuery, setOverviewSearchQuery] = useState<string | null>(null);
	const handleOverviewAskAnythingSubmit = useCallback((query: string) => {
		const trimmedQuery = query.trim();
		setOverviewSearchQuery(trimmedQuery ? trimmedQuery : null);
	}, []);
	const handleClearOverviewSearchQuery = useCallback(() => {
		setOverviewSearchQuery(null);
	}, []);

	// Track highlight state in a ref so the event listener has fresh access without re-binding constantly
	const isTopSearchHighlightedRef = useRef(isTopSearchHighlighted);
	useEffect(() => {
		isTopSearchHighlightedRef.current = isTopSearchHighlighted;
	}, [isTopSearchHighlighted]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === 'Space') {
				const target = e.target as HTMLElement;
				if (target.matches('input, textarea, [contenteditable="true"]')) {
					return;
				}

				e.preventDefault();

				if (isTopSearchHighlightedRef.current) {
					handleOpenDashboardSearchForCampaign();
				} else {
					setTopSearchHighlighted(true);
					// First Space press arms the Search shortcut — strong intent that the
					// second press will navigate, so start the curated prefetch now.
					prefetchDashboardCuratedForYou();

					if (topSearchHighlightTimeoutRef.current) {
						clearTimeout(topSearchHighlightTimeoutRef.current);
					}

					topSearchHighlightTimeoutRef.current = setTimeout(() => {
						setTopSearchHighlighted(false);
					}, 3000);
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [handleOpenDashboardSearchForCampaign, prefetchDashboardCuratedForYou]);

	// Cleanup timer on unmount
	useEffect(() => {
		return () => {
			if (topSearchHighlightTimeoutRef.current) {
				clearTimeout(topSearchHighlightTimeoutRef.current);
			}
		};
	}, []);

	const { data: identities, isPending: isPendingIdentities } = useGetIdentities({});
	const { mutateAsync: editCampaign } = useEditCampaign({ suppressToasts: true });
	const { mutateAsync: createIdentity } = useCreateIdentity({ suppressToasts: true });
	const autoEnsureIdentityOnceRef = useRef(false);
	const queryClient = useQueryClient();
	const hasRefetchedContactsRef = useRef(false);

	// Refetch contacts when returning from map search with newly added contacts (added=1,
	// set by the dashboard's add-to-campaign pushes). Gated so plain origin=search tab
	// switches don't blow away the contacts/lists cache the dashboard just prefetched.
	// Kept (rather than relying on the dashboard's own awaited invalidations) as the
	// safety net for inactive queries: useGetContacts has refetchOnMount:false, so an
	// invalidated-but-unmounted query would otherwise stay stale when it mounts here.
	useEffect(() => {
		if (cameFromSearch && searchAddedContacts && campaign && !hasRefetchedContactsRef.current) {
			hasRefetchedContactsRef.current = true;
			// Invalidate all contacts and userContactLists queries to force fresh data
			// This marks queries as stale so they refetch when accessed
			queryClient.invalidateQueries({ queryKey: ['contacts'] });
			queryClient.invalidateQueries({ queryKey: ['userContactLists'] });
			// Also immediately refetch any active queries
			queryClient.refetchQueries({ queryKey: ['contacts'], type: 'active' });
			queryClient.refetchQueries({ queryKey: ['userContactLists'], type: 'active' });
		}
	}, [cameFromSearch, searchAddedContacts, campaign, queryClient]);

	// If we landed here without an identity:
	// - Normal flow: force the IdentityDialog (existing behavior)
	// - Search -> campaign flow: silently create/assign an identity so Profile tab can populate it
	useEffect(() => {
		if (!campaign) return;
		if (campaign.identityId) return;

		if (!cameFromSearch) {
			setIsIdentityDialogOpen(true);
			return;
		}

		if (autoEnsureIdentityOnceRef.current) return;
		if (isPendingIdentities) return;

		const existingIdentityId = identities?.[0]?.id;
		const needsCreate = !existingIdentityId;
		if (needsCreate) {
			// Wait for auth + user record, otherwise we can't create an identity.
			if (!isLoaded || isPendingUser) return;
			// If we still can't access a user email, fall back to the dialog to avoid a dead-end.
			if (!user?.email) {
				autoEnsureIdentityOnceRef.current = true;
				setIdentityDialogOrigin('search');
				setIsIdentityDialogOpen(true);
				return;
			}
		}

		autoEnsureIdentityOnceRef.current = true;

		(async () => {
			try {
				const identityIdToAssign = existingIdentityId
					? existingIdentityId
					: (
							await createIdentity({
								name:
									`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
									user?.email ||
									'New Profile',
								email: user?.replyToEmail ?? user?.email ?? '',
							})
						)?.id;

				if (!identityIdToAssign) {
					throw new Error('Failed to determine identityId for campaign');
				}

				await editCampaign({
					id: campaign.id,
					data: { identityId: identityIdToAssign },
				});
			} catch (error) {
				console.error('Failed to auto-assign identity for campaign:', error);
				// Fallback: allow the existing IdentityDialog flow so the user isn't blocked
				setIdentityDialogOrigin('search');
				setIsIdentityDialogOpen(true);
			}
		})();
	}, [
		campaign,
		cameFromSearch,
		identities,
		isPendingIdentities,
		isLoaded,
		isPendingUser,
		user,
		createIdentity,
		editCampaign,
		setIsIdentityDialogOpen,
	]);

	// Determine initial view based on tab query parameter.
	// Legacy values are still accepted, but the URL is canonicalized to current tab names below.
	// When `?inboxDebug=1` is set with no `tab=` (or a non-inbox tab), force the inbox tab
	// so the debug mock data is immediately visible.
	const getInitialView = (): ViewType => {
		if (
			inboxDebugEnabled &&
			(!tabParam || getCampaignViewFromUrlTab(tabParam) !== 'inbox')
		) {
			return 'inbox';
		}
		return getCampaignViewFromUrlTab(tabParam);
	};

	const [activeView, setActiveViewInternal] = useState<ViewType>(getInitialView());
	// When the user switches tabs, DraftingSection swaps out and we need to (re)observe
	// the new bottom anchor(s) so the zoom clamp can auto-correct if they become clipped.
	useLayoutEffect(() => {
		campaignWorkspaceActiveViewRef.current = activeView;
		refreshCampaignZoomAnchorObserversRef.current?.();
		updateCampaignZoomForViewport();
	}, [activeView, updateCampaignZoomForViewport]);
	useLayoutEffect(() => {
		isCampaignWorkspaceExpandedRef.current = isCampaignWorkspaceExpanded;
		updateCampaignZoomForViewport();
	}, [isCampaignWorkspaceExpanded, updateCampaignZoomForViewport]);

	// Campaign-only map camera padding: shift the globe left so the interactive viewport
	// excludes the right-side UI panels. This must not affect dashboard/search and must
	// reset on the Overview tab unless the Overview right-rail is present.
	const shouldApplyCampaignMapCameraPadding = isMobile === false;
	const [campaignMapCameraPadding, setCampaignMapCameraPadding] =
		useState<SearchResultsMapProps['cameraPadding']>(null);
	const recomputeCampaignMapCameraPadding = useCallback(() => {
		if (typeof window === 'undefined') return;
		const html = document.documentElement;
		if (!shouldApplyCampaignMapCameraPadding) {
			setCampaignMapCameraPadding(null);
			return;
		}

		// Overview ("All" tab): keep the globe centered in the full viewport, matching the
		// dashboard map. We intentionally do NOT apply right-side camera padding here (even
		// when the Overview right rail is present), so the globe isn't pushed to the left.
		// The other (compact) tabs keep their left-shifted padding via the branch below.
		if (activeView === 'overview') {
			setCampaignMapCameraPadding(null);
			return;
		}

		try {
			const cs = window.getComputedStyle(html);
			const zoomStr = cs.zoom;
			const parsedZoom = zoomStr ? parseFloat(zoomStr) : Number.NaN;
			const varZoomStr = cs.getPropertyValue(CAMPAIGN_ZOOM_VAR);
			const parsedVarZoom = varZoomStr ? parseFloat(varZoomStr) : Number.NaN;
			const z =
				Number.isFinite(parsedZoom) && parsedZoom > 0 && parsedZoom !== 1
					? parsedZoom
					: Number.isFinite(parsedVarZoom) && parsedVarZoom > 0
						? parsedVarZoom
						: DEFAULT_CAMPAIGN_ZOOM;

			const viewportW = window.innerWidth;

			// Centered stage: the band covers the full viewport, so there is no clear
			// map strip to keep markers inside — center the globe like the overview tab.
			// Mirrors the centered branch of updateCampaignZoomForViewport.
			const layoutViewportWForStage = viewportW / (z || 1);
			const isCompactWorkspaceActiveForStage =
				isCompactCampaignWorkspaceView(activeView) &&
				!isCampaignWorkspaceExpandedRef.current;
			const centeredStageMaxLayoutW = isCompactWorkspaceActiveForStage
				? CAMPAIGN_CENTERED_STAGE_COMPACT_MAX_LAYOUT_W_PX
				: CAMPAIGN_CENTERED_STAGE_STANDARD_MAX_LAYOUT_W_PX;
			if (layoutViewportWForStage < centeredStageMaxLayoutW) {
				setCampaignMapCameraPadding(null);
				return;
			}

			let backdropStartCss: number;
			if (isCompactCampaignWorkspaceView(activeView)) {
				// Anchor the globe to the COMPACT backdrop regardless of expand state, so
				// expanding the workspace never shoves the globe further left (which drags
				// its globe-projection limb into view as a black ring). Mirrors the compact
				// branch of updateCampaignZoomForViewport.
				const layoutViewportW = viewportW / (z || 1);
				backdropStartCss = Math.max(
					0,
					layoutViewportW - CAMPAIGN_COMPACT_WORKSPACE_BACKDROP_WIDTH_PX
				);
			} else {
				const backdropStartStr =
					html.style.getPropertyValue(CAMPAIGN_MAP_BACKDROP_START_VAR) ||
					cs.getPropertyValue(CAMPAIGN_MAP_BACKDROP_START_VAR);
				const parsed = backdropStartStr ? parseFloat(backdropStartStr) : Number.NaN;
				if (!Number.isFinite(parsed) || parsed <= 0) {
					setCampaignMapCameraPadding({ right: 0, left: 0, top: 0, bottom: 0 });
					return;
				}
				backdropStartCss = parsed;
			}

			// CSS vars are expressed in the unscaled (layout) coordinate space; multiply by the
			// effective campaign zoom to convert to physical pixels.
			const backdropStartPx = backdropStartCss * (z || 1);
			const uiCoveredRightPx = viewportW - backdropStartPx;
			// Back off a bit from the overlay boundary so the globe doesn't feel "too far left".
			// This still keeps markers away from the main UI column, but preserves more center mass.
			const CAMERA_PADDING_BACKOFF_PX = 550;
			const rightPaddingPx = Math.max(
				0,
				Math.round(uiCoveredRightPx - CAMERA_PADDING_BACKOFF_PX)
			);
			setCampaignMapCameraPadding({ right: rightPaddingPx, left: 0, top: 0, bottom: 0 });
		} catch {
			setCampaignMapCameraPadding(null);
		}
	}, [activeView, shouldApplyCampaignMapCameraPadding]);
	const [draftOperationsProgress, setDraftOperationsProgress] = useState<{
		visible: boolean;
		operations: Array<{ current: number; total: number }>;
	}>({ visible: false, operations: [] });
	const sendingSession = useSendingSessionState();
	const getInitialInboxSentTab = (): InboxSentTab => getInboxSentTabFromUrlTab(tabParam);
	const [inboxSentTab, setInboxSentTab] = useState<InboxSentTab>(
		getInitialInboxSentTab()
	);
	const [inboxSentTabRequest, setInboxSentTabRequest] =
		useState<InboxSentTabRequest | null>(() =>
			getInboxSentTabFromUrlTab(tabParam) === 'sent'
				? { tab: 'sent', requestId: 1 }
				: null
		);
	useEffect(() => {
		if (typeof window === 'undefined') return;

		const nextTab = getCampaignUrlTabForView(activeView, inboxSentTab);
		const params = new URLSearchParams(window.location.search);
		if (params.get('tab') === nextTab) return;

		params.set('tab', nextTab);
		const nextSearch = params.toString();
		const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${
			window.location.hash
		}`;

		window.history.replaceState(window.history.state, '', nextUrl);
	}, [activeView, inboxSentTab]);
	const requestInboxSentTab = useCallback((tab: InboxSentTab) => {
		setInboxSentTab(tab);
		setInboxSentTabRequest((prev) => ({
			tab,
			requestId: (prev?.requestId ?? 0) + 1,
		}));
	}, []);
	// One-shot Responses/Opportunities filter seed for the inbox left panel (the
	// overview star pill). Cleared whenever navigation lands anywhere but the inbox
	// so a consumed request can't re-apply on a later plain Inbox visit (the list
	// remounts per entry/breakpoint tier with a fresh handled-ref).
	const [inboxPanelTabRequest, setInboxPanelTabRequest] =
		useState<InboxPanelTabRequest | null>(null);
	const requestInboxPanelTab = useCallback((tab: InboxPanelTabRequest['tab']) => {
		setInboxPanelTabRequest((prev) => ({
			tab,
			requestId: (prev?.requestId ?? 0) + 1,
		}));
	}, []);
	// Bidirectional campaign-map ↔ tab selection. The child DraftingSection owns each
	// tab's native selection; it publishes the active tab's selected contact ids here
	// (so the map can highlight their markers as the bigger blue circle), and a marker
	// click bumps a request the child consumes to run the tab's native selection action.
	// Mirrors the inboxSentTab publish + inboxSentTabRequest request pattern above.
	const [campaignMapSelectedContactIds, setCampaignMapSelectedContactIds] = useState<
		number[]
	>([]);
	const [mapMarkerSelectionRequest, setMapMarkerSelectionRequest] = useState<{
		contactId: number;
		requestId: number;
	} | null>(null);
	const requestMapMarkerSelection = useCallback((contactId: number) => {
		setMapMarkerSelectionRequest((prev) => ({
			contactId,
			requestId: (prev?.requestId ?? 0) + 1,
		}));
	}, []);
	// Note: no separate reset-on-tab-switch effect — DraftingSection republishes the
	// active tab's selection (defaulting to []) whenever `view` changes, which is the
	// single source of truth. A parent reset here would fire AFTER the child's publish
	// (React runs child effects first) and wipe the freshly published set.
	// Track if we navigated from inbox to sent via down arrow (so up arrow can return to inbox)
	const [cameToSentFromInbox, setCameToSentFromInbox] = useState(false);
	// Track the latest requested view so rapid tab flips don't get dropped due to stale closures.
	// Example: user clicks A -> B, then quickly clicks A again before React commits B.
	// Without this, the second click can be ignored (newView === activeView), skipping the right-panel slide.
	const requestedViewRef = useRef<ViewType>(activeView);
	useEffect(() => {
		requestedViewRef.current = activeView;
	}, [activeView]);

	const [activeMapTool, setActiveMapTool] = useState<'select' | 'grab'>('grab');
	// Hover state for the dimmed Write/Drafts/Inbox left "Showing" strip: dimmed
	// by default, full opacity + interactive while hovered (like the search page).
	const [isPresetStripHovered, setIsPresetStripHovered] = useState(false);
	const [campaignOverviewMapGrouping, setCampaignOverviewMapGrouping] =
		useState<CampaignOverviewMapGrouping>('status');
	const handleCampaignOverviewMapGroupingChange = useCallback(
		(grouping: CampaignOverviewMapGrouping) => {
			setCampaignOverviewMapGrouping(grouping);
			setOverviewSearchQuery(null);
		},
		[]
	);
	// An active All-tab search surfaces a dedicated "Search" tab and shows results by category,
	// so the map ignores the Category/Status selection and groups by category until search clears.
	const isOverviewSearchActive = (overviewSearchQuery ?? '').trim().length > 0;
	const effectiveCampaignOverviewMapGrouping: CampaignOverviewMapGrouping =
		isOverviewSearchActive ? 'category' : campaignOverviewMapGrouping;
	const [campaignOverviewSelectedStatuses, setCampaignOverviewSelectedStatuses] =
		useState<readonly CampaignOverviewStatusKey[]>([]);
	const campaignOverviewSelectedStatusSet = useMemo(
		() => new Set(campaignOverviewSelectedStatuses),
		[campaignOverviewSelectedStatuses]
	);
	// Each status toggles independently. With nothing toggled on there is no
	// filter, so the map shows every status; otherwise it shows the union.
	const campaignOverviewActiveStatusSet = useMemo(
		() =>
			campaignOverviewSelectedStatuses.length === 0
				? new Set<CampaignOverviewStatusKey>(CAMPAIGN_OVERVIEW_STATUS_KEYS)
				: new Set<CampaignOverviewStatusKey>(campaignOverviewSelectedStatuses),
		[campaignOverviewSelectedStatuses]
	);
	// On the Write/Drafts/Inbox tabs the map filter is locked to the tab's preset
	// (see CAMPAIGN_TAB_PRESET_STATUSES). These derived values shadow the overview
	// ones for the map filter only — the overview's own selection state is left
	// untouched so returning to All restores whatever the user had chosen there.
	const activeTabPresetStatuses = CAMPAIGN_TAB_PRESET_STATUSES[activeView];
	const effectiveMapGroupingForActiveView: CampaignOverviewMapGrouping =
		activeTabPresetStatuses ? 'status' : effectiveCampaignOverviewMapGrouping;
	const effectiveActiveStatusSetForActiveView = useMemo<
		ReadonlySet<CampaignOverviewStatusKey>
	>(
		() =>
			activeTabPresetStatuses
				? new Set<CampaignOverviewStatusKey>(activeTabPresetStatuses)
				: campaignOverviewActiveStatusSet,
		[activeTabPresetStatuses, campaignOverviewActiveStatusSet]
	);
	const handleCampaignOverviewStatusToggle = useCallback(
		(status: CampaignOverviewStatusKey) => {
			setCampaignOverviewSelectedStatuses((prev) =>
				prev.includes(status)
					? prev.filter((value) => value !== status)
					: [...prev, status]
			);
		},
		[]
	);
	const [mapGrabActiveCategories, setMapGrabActiveCategories] = useState<
		readonly boolean[]
	>(() => new Array(MAP_SELECT_GRAB_CATEGORY_COUNT).fill(true));
	const handleMapGrabActiveCategoriesChange = useCallback(
		(active: readonly boolean[]) => {
			setMapGrabActiveCategories((prev) => {
				if (
					prev.length === active.length &&
					prev.every((value, index) => value === active[index])
				) {
					return prev;
				}
				return active.slice();
			});
		},
		[]
	);
	const [mapGrabUncategorizedActive, setMapGrabUncategorizedActive] = useState(true);
	const handleMapGrabUncategorizedActiveChange = useCallback((isActive: boolean) => {
		setMapGrabUncategorizedActive(isActive);
	}, []);
	const [mapZoomControlIndex, setMapZoomControlIndex] = useState(1);
	const [isMapZoomControlDragging, setIsMapZoomControlDragging] = useState(false);
	const [mapZoomControlRequest, setMapZoomControlRequest] =
		useState<CampaignMapZoomControlRequest | null>(null);
	const mapZoomControlLiveRef = useRef<MapZoomControlLiveHandle | null>(null);
	const mapZoomControlRequestNonceRef = useRef(0);
	const pendingMapZoomControlRequestRef = useRef<{
		zoom: number;
		isDragging: boolean;
	} | null>(null);
	const mapZoomControlRequestRafRef = useRef<number | null>(null);
	// Live interactive zoom floor reported by the map (viewport-proportional on
	// large monitors); the slider ladder rebases off it so index 0 always lands
	// exactly on the floor — no dead zone at the bottom of the track.
	const [mapInteractiveMinZoom, setMapInteractiveMinZoom] = useState(MAP_MIN_ZOOM);
	const handleInteractiveMinZoomChange = useCallback((minZoom: number) => {
		if (!Number.isFinite(minZoom)) return;
		// Functional dedup breaks the callback → state → mapProps → re-render loop.
		setMapInteractiveMinZoom((current) => (current === minZoom ? current : minZoom));
	}, []);
	const mapZoomControlLevels = useMemo(
		() => buildZoomControlLevels(mapInteractiveMinZoom),
		[mapInteractiveMinZoom]
	);
	// Last zoom the map reported — lets the ladder-rebase effect re-place the
	// thumb when the floor changes without any camera movement (window shrink).
	const lastMapViewportZoomRef = useRef<number | null>(null);
	const isSelectMapToolActive = activeMapTool === 'select';
	const mapZoomControlDisplayValue = mapZoomControlIndex;
	const pushMapZoomControlRequest = useCallback((zoom: number, isDragging = false) => {
		mapZoomControlRequestNonceRef.current += 1;
		setMapZoomControlRequest({
			zoom,
			nonce: mapZoomControlRequestNonceRef.current,
			isDragging,
		});
	}, []);
	const scheduleMapZoomControlRequest = useCallback(
		(zoom: number, isDragging = false) => {
			pendingMapZoomControlRequestRef.current = { zoom, isDragging };
			if (mapZoomControlRequestRafRef.current != null) return;
			mapZoomControlRequestRafRef.current = window.requestAnimationFrame(() => {
				mapZoomControlRequestRafRef.current = null;
				const pendingRequest = pendingMapZoomControlRequestRef.current;
				pendingMapZoomControlRequestRef.current = null;
				if (!pendingRequest) return;
				pushMapZoomControlRequest(pendingRequest.zoom, pendingRequest.isDragging);
			});
		},
		[pushMapZoomControlRequest]
	);
	const handleMapZoomControlValueChange = useCallback(
		(levelValue: number) => {
			const safeLevelValue = clampZoomControlValue(levelValue);
			scheduleMapZoomControlRequest(
				zoomForControlValue(mapZoomControlLevels, safeLevelValue),
				true
			);
		},
		[scheduleMapZoomControlRequest, mapZoomControlLevels]
	);
	const handleMapZoomControlInteractionChange = useCallback((isDragging: boolean) => {
		setIsMapZoomControlDragging(isDragging);
	}, []);
	const handleMapZoomControlChange = useCallback(
		(levelIndex: number, meta?: MapZoomControlIndexChangeMeta) => {
			const safeLevelIndex = Math.min(
				Math.max(Math.round(levelIndex), 0),
				MAP_ZOOM_CONTROL_MAX_INDEX
			);
			const nextControlValue =
				meta?.source === 'drag-release'
					? clampZoomControlValue(meta.levelValue)
					: safeLevelIndex;
			setMapZoomControlIndex(nextControlValue);
			if (meta?.source === 'drag-release') {
				if (mapZoomControlRequestRafRef.current != null) {
					window.cancelAnimationFrame(mapZoomControlRequestRafRef.current);
					mapZoomControlRequestRafRef.current = null;
				}
				pendingMapZoomControlRequestRef.current = null;
				pushMapZoomControlRequest(
					zoomForControlValue(mapZoomControlLevels, nextControlValue),
					true
				);
				return;
			}
			pushMapZoomControlRequest(
				mapZoomControlLevels[safeLevelIndex] ?? mapZoomControlLevels[0],
				false
			);
		},
		[pushMapZoomControlRequest, mapZoomControlLevels]
	);
	const handleSelectMapToolClick = useCallback(() => {
		setActiveMapTool((prev) => (prev === 'select' ? 'grab' : 'select'));
	}, []);
	const handleMapViewportZoom = useCallback(
		(zoom: number) => {
			lastMapViewportZoomRef.current = zoom;
			if (isMapZoomControlDragging) return;
			const nextControlValue = controlValueForZoom(mapZoomControlLevels, zoom);
			mapZoomControlLiveRef.current?.setLevelValue(nextControlValue);
		},
		[isMapZoomControlDragging, mapZoomControlLevels]
	);
	const handleMapViewportIdle = useCallback(
		(payload: { zoom: number }) => {
			lastMapViewportZoomRef.current = payload.zoom;
			if (isMapZoomControlDragging) return;
			const nextControlValue = controlValueForZoom(mapZoomControlLevels, payload.zoom);
			setMapZoomControlIndex((current) =>
				Math.abs(current - nextControlValue) < 0.005 ? current : nextControlValue
			);
		},
		[isMapZoomControlDragging, mapZoomControlLevels]
	);

	// When the ladder rebases (interactive floor changed with the viewport), the
	// map may not move at all — e.g. the floor *dropped* after a window shrink —
	// so no zoom/idle event fires. Re-place the thumb against the new ladder.
	useEffect(() => {
		if (isMapZoomControlDragging) return;
		const lastZoom = lastMapViewportZoomRef.current;
		if (lastZoom == null) return;
		const nextControlValue = controlValueForZoom(mapZoomControlLevels, lastZoom);
		mapZoomControlLiveRef.current?.setLevelValue(nextControlValue);
		setMapZoomControlIndex((current) =>
			Math.abs(current - nextControlValue) < 0.005 ? current : nextControlValue
		);
	}, [mapZoomControlLevels, isMapZoomControlDragging]);

	useEffect(() => {
		return () => {
			if (mapZoomControlRequestRafRef.current != null) {
				window.cancelAnimationFrame(mapZoomControlRequestRafRef.current);
				mapZoomControlRequestRafRef.current = null;
			}
			pendingMapZoomControlRequestRef.current = null;
		};
	}, []);

	// Wheel/trackpad behavior over the campaign UI, handled per layout mode:
	//
	// Thinnest "scrollable" breakpoint: some nested scroll containers can trap wheel scroll
	// (especially on Write + Inbox), making the page feel "stuck" unless the cursor is just right.
	// - If a nested scroll container under the cursor CAN scroll, let it.
	// - Otherwise, force the wheel gesture to scroll the PAGE.
	// - Never interfere with text inputs / editable fields.
	//
	// Compact ("nuclear") desktop mode: the page itself must never scroll — panels do their own
	// scrolling. Over the opacity band that holds the panels, a wheel gesture no nested container
	// can consume would otherwise nudge the document a few px before keepCompactPageAtOrigin snaps
	// it back (a visible jitter). Swallow it so the band stays steady; leave the clear map area
	// outside the band alone so Mapbox wheel-zoom keeps working.
	useEffect(() => {
		if (typeof window === 'undefined') return;

		const isEditableTarget = (el: HTMLElement | null) =>
			Boolean(
				el?.closest('textarea, input, select, [contenteditable="true"], [role="textbox"]')
			);

		const findScrollableAncestor = (el: HTMLElement | null): HTMLElement | null => {
			let node: HTMLElement | null = el;
			while (node && node !== document.body && node !== document.documentElement) {
				const cs = window.getComputedStyle(node);
				const overflowY = cs.overflowY;
				const isScrollableY =
					(overflowY === 'auto' || overflowY === 'scroll') &&
					node.scrollHeight > node.clientHeight + 1;
				if (isScrollableY) return node;
				node = node.parentElement;
			}
			return null;
		};

		const canScrollY = (el: HTMLElement, deltaY: number) => {
			if (!Number.isFinite(deltaY) || deltaY === 0) return false;
			if (deltaY > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
			return el.scrollTop > 0;
		};

		// Cache the split-overlay band rect: this capture handler runs for EVERY
		// wheel event (including continuous trackpad map-zoom streams), and a
		// querySelector + getBoundingClientRect per event forces style/layout on
		// the wheel path. Invalidated on resize/zoom-change/overlay resize below.
		let cachedOverlay: Element | null = null;
		let cachedBand: { left: number; right: number } | null = null;
		let overlayResizeObserver: ResizeObserver | null = null;
		const invalidateBandRect = () => {
			cachedBand = null;
		};
		const getBandRect = (): { left: number; right: number } | null => {
			if (!cachedOverlay || !cachedOverlay.isConnected) {
				cachedOverlay = document.querySelector('.campaign-map-split-overlay');
				cachedBand = null;
				overlayResizeObserver?.disconnect();
				if (cachedOverlay && typeof ResizeObserver !== 'undefined') {
					overlayResizeObserver = new ResizeObserver(invalidateBandRect);
					overlayResizeObserver.observe(cachedOverlay);
				}
			}
			if (!cachedOverlay) return null;
			if (!cachedBand) {
				const rect = cachedOverlay.getBoundingClientRect();
				cachedBand = { left: rect.left, right: rect.right };
			}
			return cachedBand;
		};

		const onWheelCapture = (e: WheelEvent) => {
			try {
				const html = document.documentElement;
				const target = e.target as HTMLElement | null;
				if (!target) return;

				// Thinnest "scrollable" breakpoint: force the gesture to scroll the page when the
				// immediate scroll container can't take it.
				if (html.classList.contains(CAMPAIGN_SCROLLABLE_CLASS)) {
					// Limit to the views that were observed to trap scroll.
					if (!(activeView === 'testing' || activeView === 'inbox')) return;
					if (isEditableTarget(target)) return;

					// Prefer native behavior when the immediate scroll container can handle it.
					const scrollParent = findScrollableAncestor(target);
					if (scrollParent && canScrollY(scrollParent, e.deltaY)) return;

					// Otherwise, force the wheel gesture to scroll the document.
					e.preventDefault();
					window.scrollBy({ top: e.deltaY, left: 0, behavior: 'auto' });
					return;
				}

				// Compact ("nuclear") desktop mode: keep the opacity band steady (no page nudge /
				// overscroll snap-back), but leave the clear map area free for Mapbox wheel-zoom.
				if (html.classList.contains(CAMPAIGN_COMPACT_CLASS)) {
					const bandRect = getBandRect();
					if (!bandRect) return;
					// Outside the band's horizontal span is the clear map region — let the map zoom.
					if (e.clientX < bandRect.left || e.clientX > bandRect.right) return;

					// If a nested scroll container under the cursor can consume the delta, let it scroll.
					const scrollParent = findScrollableAncestor(target);
					if (scrollParent && canScrollY(scrollParent, e.deltaY)) return;

					// Otherwise swallow it so the panels/band don't jitter.
					e.preventDefault();
				}
			} catch {
				// ignore
			}
		};

		window.addEventListener('wheel', onWheelCapture, { passive: false, capture: true });
		window.addEventListener('resize', invalidateBandRect, { passive: true });
		window.addEventListener(
			CAMPAIGN_ZOOM_EVENT,
			invalidateBandRect as EventListener
		);
		return () => {
			window.removeEventListener('wheel', onWheelCapture, true);
			window.removeEventListener('resize', invalidateBandRect);
			window.removeEventListener(
				CAMPAIGN_ZOOM_EVENT,
				invalidateBandRect as EventListener
			);
			overlayResizeObserver?.disconnect();
		};
	}, [activeView]);

	// State for top toolbar dropdowns
	const [showTopCampaignsDropdown, setShowTopCampaignsDropdown] = useState(false);
	const [isTopStrategyDropdownOpen, setIsTopStrategyDropdownOpen] = useState(false);
	const [isTopOpportunitiesOpen, setIsTopOpportunitiesOpen] = useState(false);

	// State for right box icon selection ('info' or 'circle')
	const [selectedRightBoxIcon, setSelectedRightBoxIcon] = useState<'info' | 'circle'>(
		'info'
	);
	const topCampaignsDropdownRef = useRef<HTMLDivElement>(null);
	const topCampaignsFolderButtonRef = useRef<HTMLButtonElement>(null);
	const topStrategyDropdownRef = useRef<HTMLDivElement>(null);
	const topStrategyButtonRef = useRef<HTMLButtonElement>(null);
	const topOpportunitiesPopupRef = useRef<HTMLDivElement>(null);
	const topOpportunitiesButtonRef = useRef<HTMLButtonElement>(null);

	// Responses popup (opened from the envelope icon in the top action row)
	const [isResponsesPopupOpen, setIsResponsesPopupOpen] = useState(false);
	const responsesPopupTriggerRef = useRef<HTMLButtonElement>(null);
	const responsesPopupRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside (but not on the folder button itself)
	useEffect(() => {
		if (!showTopCampaignsDropdown) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			const targetElement =
				target instanceof Element
					? target
					: target instanceof Node
						? target.parentElement
						: null;
			// Don't close if clicking on the folder button (let the toggle handle it)
			if (topCampaignsFolderButtonRef.current?.contains(target)) {
				return;
			}
			if (targetElement?.closest('.campaign-finder-context-menu, .campaign-finder-info-popup')) {
				return;
			}
			if (
				topCampaignsDropdownRef.current &&
				!topCampaignsDropdownRef.current.contains(target)
			) {
				setShowTopCampaignsDropdown(false);
			}
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setShowTopCampaignsDropdown(false);
		};

		document.addEventListener('mousedown', handleClickOutside);
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [showTopCampaignsDropdown]);

	useEffect(() => {
		if (!isTopStrategyDropdownOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			if (topStrategyButtonRef.current?.contains(target)) return;
			if (
				topStrategyDropdownRef.current &&
				!topStrategyDropdownRef.current.contains(target)
			) {
				setIsTopStrategyDropdownOpen(false);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setIsTopStrategyDropdownOpen(false);
		};

		document.addEventListener('mousedown', handleClickOutside);
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [isTopStrategyDropdownOpen]);

	useEffect(() => {
		if (!isTopOpportunitiesOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			if (topOpportunitiesButtonRef.current?.contains(target)) return;
			if (
				topOpportunitiesPopupRef.current &&
				!topOpportunitiesPopupRef.current.contains(target)
			) {
				setIsTopOpportunitiesOpen(false);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setIsTopOpportunitiesOpen(false);
		};

		document.addEventListener('mousedown', handleClickOutside);
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [isTopOpportunitiesOpen]);

	useEffect(() => {
		setShowTopCampaignsDropdown(false);
		setIsTopStrategyDropdownOpen(false);
		setIsTopOpportunitiesOpen(false);
		setIsResponsesPopupOpen(false);
	}, [activeView]);

	useEffect(() => {
		if ((overviewSearchQuery ?? '').trim().length > 0) {
			setShowTopCampaignsDropdown(false);
			setIsResponsesPopupOpen(false);
		}
	}, [overviewSearchQuery]);

	// Close the responses popup on outside click / Escape.
	useEffect(() => {
		if (!isResponsesPopupOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			if (responsesPopupTriggerRef.current?.contains(target)) return;
			if (
				responsesPopupRef.current &&
				!responsesPopupRef.current.contains(target)
			) {
				setIsResponsesPopupOpen(false);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			setIsResponsesPopupOpen(false);
		};

		document.addEventListener('mousedown', handleClickOutside);
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [isResponsesPopupOpen]);

	// Track previous view for crossfade transitions
	const [previousView, setPreviousView] = useState<ViewType | null>(null);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [isFadingOutPreviousView, setIsFadingOutPreviousView] = useState(false);
	const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const maxWaitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const crossfadeContainerRef = useRef<HTMLDivElement>(null);
	// The previous layer is a static DOM snapshot of what was on screen, captured
	// in setActiveView while the DOM still shows the origin view (see
	// cloneCampaignActiveViewLayer). The id keys the overlay div so a mid-fade
	// restage remounts it with the fresh clone.
	const previousViewSnapshotRef = useRef<CampaignViewSnapshot | null>(null);
	const [previousViewSnapshotId, setPreviousViewSnapshotId] = useState(0);
	// Shift-x the snapshot was painted with; pins it in place when the new view
	// writes a different shift (null = scrollable/mobile modes, no pinning).
	const [previousViewShiftXSnapshotPx, setPreviousViewShiftXSnapshotPx] = useState<
		number | null
	>(null);
	const mountPreviousViewSnapshot = useCallback((container: HTMLDivElement | null) => {
		if (!container) return;
		// Ref callbacks can re-run (StrictMode, remount on key change) — never double-append.
		container.replaceChildren();
		const snapshot = previousViewSnapshotRef.current;
		if (!snapshot) return;
		container.appendChild(snapshot.node);
		// Scroll offsets only stick once the clone is attached and has layout.
		const all = snapshot.node.querySelectorAll<HTMLElement>('*');
		for (const [i, top, left] of snapshot.scrolls) {
			const el = all[i];
			if (!el) continue;
			if (top) el.scrollTop = top;
			if (left) el.scrollLeft = left;
		}
	}, []);
	// Every path that ends a transition nulls previousView — release the snapshot
	// there instead of threading cleanup through each branch.
	useEffect(() => {
		if (previousView) return;
		previousViewSnapshotRef.current = null;
		setPreviousViewShiftXSnapshotPx(null);
	}, [previousView]);

	// Mobile never supports the Writing ("testing") tab. Clamp immediately so we never mount
	// HybridPromptInput on mobile (and never transition through it). Search lives on the
	// dashboard pick flow — Summary is the only in-campaign mobile view.
	const MOBILE_ALLOWED_VIEWS: Array<'summary'> = ['summary'];
	useLayoutEffect(() => {
		if (isMobile !== true) return;
		if (
			MOBILE_ALLOWED_VIEWS.includes(activeView as (typeof MOBILE_ALLOWED_VIEWS)[number])
		)
			return;

		// Cancel any in-flight transitions so we don't briefly show a previous (invalid) view.
		if (transitionTimeoutRef.current) {
			clearTimeout(transitionTimeoutRef.current);
			transitionTimeoutRef.current = null;
		}
		if (maxWaitTimeoutRef.current) {
			clearTimeout(maxWaitTimeoutRef.current);
			maxWaitTimeoutRef.current = null;
		}

		setPreviousView(null);
		setIsTransitioning(false);
		setIsFadingOutPreviousView(false);
		requestedViewRef.current = 'summary';
		setActiveViewInternal('summary');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isMobile, activeView]);

	// Desktop never supports the mobile-only Search/Summary views (e.g. a ?tab=search
	// deep link from the mobile dashboard opened on desktop). setActiveView already
	// coerces these; this covers the URL-initialized state.
	useLayoutEffect(() => {
		if (isMobile !== false) return;
		if (activeView !== 'search' && activeView !== 'summary') return;
		requestedViewRef.current = 'testing';
		setActiveViewInternal('testing');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isMobile, activeView]);

	// Wrapped setActiveView that handles transitions
	const setActiveView = useCallback(
		(newView: ViewType) => {
			// Campaign "Sent" is now Inbox -> Sent. Route any "sent" navigation into the inbox's Sent tab.
			if (newView === 'sent') {
				requestInboxSentTab('sent');
				newView = 'inbox';
			}
			// The Search and Summary views are mobile-only.
			if (isMobile !== true && (newView === 'search' || newView === 'summary')) {
				newView = 'testing';
			}
			// Never allow unsupported views on mobile.
			if (
				isMobile === true &&
				!MOBILE_ALLOWED_VIEWS.includes(newView as (typeof MOBILE_ALLOWED_VIEWS)[number])
			) {
				newView = 'summary';
			}
			// An empty Drafts tab is just the blank placeholder page — route to Write instead.
			// Read the email cache at call time (not a captured render value) so flows that
			// create a draft and then navigate here see the fresh count. Skip while a drafting
			// run or sending session is live: drafts are in flight, not absent.
			if (
				newView === 'drafting' &&
				isMobile === false &&
				!draftOperationsProgress.visible &&
				sendingSession.status !== 'sending'
			) {
				const cachedEmails = queryClient.getQueryData<EmailWithRelations[]>([
					...EMAIL_QUERY_KEYS.list(),
					{ campaignId: routeCampaignId },
				]);
				if (cachedEmails && !cachedEmails.some((e) => e.status === EmailStatus.draft)) {
					newView = 'testing';
					toast('No drafts yet — write your messages first.', {
						id: 'campaign-empty-tab-redirect',
					});
				}
			}
			// A pending Opportunities-filter seed only makes sense while landing on the
			// inbox — clear it for any other destination (covers every leave-inbox path).
			if (newView !== 'inbox') {
				setInboxPanelTabRequest(null);
			}
			// Dedupe against the *latest requested* view (not just the last committed render) so
			// rapid flips like A -> B -> A still enqueue the final A update and don't get dropped.
			if (newView === requestedViewRef.current) return;
			requestedViewRef.current = newView;

			// Clear any pending transition timers
			if (transitionTimeoutRef.current) {
				clearTimeout(transitionTimeoutRef.current);
				transitionTimeoutRef.current = null;
			}
			if (maxWaitTimeoutRef.current) {
				clearTimeout(maxWaitTimeoutRef.current);
				maxWaitTimeoutRef.current = null;
			}

			// While a crossfade is staged but the destination hasn't been revealed yet (the
			// previous view still covers it at full opacity), retarget the hidden destination
			// instead of staging a second crossfade from a half-painted view (the empty-tab
			// redirects land here when their data resolves mid-transition).
			if (isTransitioning && previousView && !isFadingOutPreviousView) {
				if (newView === previousView) {
					// Round trip back to the still-visible origin — cancel outright; nothing moves.
					setPreviousView(null);
					setIsTransitioning(false);
					setActiveViewInternal(newView);
					return;
				}
				setActiveViewInternal(newView);
				maxWaitTimeoutRef.current = setTimeout(() => {
					if (isMobile === true) {
						setPreviousView(null);
						setIsTransitioning(false);
						setIsFadingOutPreviousView(false);
						return;
					}
					setIsFadingOutPreviousView(true);
				}, MAX_TRANSITION_WAIT_MS);
				return;
			}

			// If the user clicks back to the currently committed view while a different view was pending,
			// treat it as a cancel (no need to stage a crossfade from an uncommitted/never-painted view).
			if (newView === activeView) {
				setPreviousView(null);
				setIsTransitioning(false);
				setIsFadingOutPreviousView(false);
				setActiveViewInternal(newView);
				return;
			}

			// Start transition: keep previous view visible while the destination paints.
			// Desktop: fade out the previous view once the destination is ready.
			// Mobile: no fade (hard swap) once the destination is ready.
			// Snapshot the on-screen DOM NOW, before React renders the destination —
			// the previous layer shows this static clone (a fresh DraftingSection
			// can't reproduce component-local state and flashes defaults at full
			// opacity: envelope expansion, breakpoint tiers, typed text, selections).
			const snapshot = cloneCampaignActiveViewLayer();
			if (!snapshot) {
				// Nothing to cover with — hard swap rather than staging an empty overlay.
				setPreviousView(null);
				setIsTransitioning(false);
				setIsFadingOutPreviousView(false);
				setActiveViewInternal(newView);
				return;
			}
			previousViewSnapshotRef.current = snapshot;
			setPreviousViewSnapshotId((id) => id + 1);
			setPreviousViewShiftXSnapshotPx(readCampaignShiftXSnapshotPx());
			setPreviousView(activeView);
			setIsTransitioning(true);
			setIsFadingOutPreviousView(false);
			setActiveViewInternal(newView);

			// Fallback: if we never get a "view ready" callback (should be rare),
			// end the transition anyway (fade on desktop, hard swap on mobile).
			maxWaitTimeoutRef.current = setTimeout(() => {
				if (isMobile === true) {
					setPreviousView(null);
					setIsTransitioning(false);
					setIsFadingOutPreviousView(false);
					return;
				}
				setIsFadingOutPreviousView(true);
			}, MAX_TRANSITION_WAIT_MS);
		},
		[
			activeView,
			isMobile,
			MOBILE_ALLOWED_VIEWS,
			requestInboxSentTab,
			draftOperationsProgress.visible,
			sendingSession.status,
			queryClient,
			routeCampaignId,
			isTransitioning,
			previousView,
			isFadingOutPreviousView,
		]
	);

	// Query-only navigations to this campaign (e.g. an opportunities-row deep link
	// clicked while already on the page) don't remount anything, so the tab-param
	// useState initializers never re-run — react to the params and switch views.
	// inboxEmailIdParam is in the deps because a repeat deep link can carry the same
	// tab with a different target message.
	const inboxEmailIdParam = searchParams.get('inboxEmailId');
	useEffect(() => {
		if (!tabParam) return;
		const requestedView = getCampaignViewFromUrlTab(tabParam);
		if (requestedView === activeView) return;
		setActiveView(requestedView);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tabParam, inboxEmailIdParam]);

	// Overview star pill: land on the Inbox tab with the Opportunities filter
	// selected. The explicit 'inbox' sent-tab request beats a stale 'sent' request
	// left by a prior Sent navigation (the view dedupe can skip re-requesting).
	const handleOpenInboxOpportunities = useCallback(() => {
		requestInboxSentTab('inbox');
		requestInboxPanelTab('opportunities');
		setActiveView('inbox');
	}, [requestInboxSentTab, requestInboxPanelTab, setActiveView]);

	// Launch a campaign search from the Write/Drafts/Inbox tabs: jump to the All
	// tab, drop that tab's preset status filter (so results aren't scoped to e.g.
	// just drafts), and run the query there.
	const handlePresetAskAnythingSubmit = useCallback(
		(query: string) => {
			const trimmedQuery = query.trim();
			if (!trimmedQuery) return;
			setCampaignOverviewSelectedStatuses([]);
			setOverviewSearchQuery(trimmedQuery);
			setActiveView('overview');
		},
		[setActiveView]
	);

	const handleActiveViewReady = useCallback(
		(readyView: DraftingSectionView) => {
			// Only start fading once the destination view has actually painted.
			if (!isTransitioning || !previousView) return;
			if (readyView !== activeView) return;

			if (maxWaitTimeoutRef.current) {
				clearTimeout(maxWaitTimeoutRef.current);
				maxWaitTimeoutRef.current = null;
			}

			// Mobile: hard swap (no fade) when the destination is ready.
			if (isMobile === true) {
				setPreviousView(null);
				setIsTransitioning(false);
				setIsFadingOutPreviousView(false);
				return;
			}

			// Desktop: fade out the previous view.
			if (isFadingOutPreviousView) return;
			setIsFadingOutPreviousView(true);
		},
		[activeView, isFadingOutPreviousView, isMobile, isTransitioning, previousView]
	);

	// Zoom is viewport-driven; no need to recompute per tab transition (keeps 16:9 looking unchanged).

	// Once the fade-out has started, end the transition after the animation duration.
	useEffect(() => {
		if (!isFadingOutPreviousView) return;
		if (!previousView) return;

		if (transitionTimeoutRef.current) {
			clearTimeout(transitionTimeoutRef.current);
			transitionTimeoutRef.current = null;
		}

		transitionTimeoutRef.current = setTimeout(() => {
			setPreviousView(null);
			setIsTransitioning(false);
			setIsFadingOutPreviousView(false);
		}, TRANSITION_DURATION);
	}, [isFadingOutPreviousView, previousView]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (transitionTimeoutRef.current) {
				clearTimeout(transitionTimeoutRef.current);
			}
			if (maxWaitTimeoutRef.current) {
				clearTimeout(maxWaitTimeoutRef.current);
			}
		};
	}, []);

	// Narrowest desktop detection (< 952px) - header box above tabs
	const [isNarrowestDesktop, setIsNarrowestDesktop] = useState(false);
	// Centered-stage detection: mirrors the backdrop/shift branches in
	// updateCampaignZoomForViewport so the over-map chrome can hide once the
	// translucent band covers the full viewport.
	const [isCampaignChromeCentered, setIsCampaignChromeCentered] = useState(false);
	const [isCampaignStandardStageNarrow, setIsCampaignStandardStageNarrow] =
		useState(false);
	const [isCompactPresetClusterBandClipped, setIsCompactPresetClusterBandClipped] =
		useState(false);
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const checkBreakpoints = () => {
			const html = document.documentElement;
			const zoomStr = window.getComputedStyle(html).zoom;
			const parsedZoom = zoomStr ? parseFloat(zoomStr) : NaN;
			const varZoomStr = window
				.getComputedStyle(html)
				.getPropertyValue(CAMPAIGN_ZOOM_VAR);
			const parsedVarZoom = varZoomStr ? parseFloat(varZoomStr) : NaN;
			const z =
				Number.isFinite(parsedZoom) && parsedZoom > 0 && parsedZoom !== 1
					? parsedZoom
					: Number.isFinite(parsedVarZoom) && parsedVarZoom > 0
						? parsedVarZoom
						: DEFAULT_CAMPAIGN_ZOOM;
			const effectiveWidth = window.innerWidth / (z || 1);

			setIsNarrowestDesktop(effectiveWidth < 952);
			setIsCampaignChromeCentered(
				effectiveWidth < CAMPAIGN_CENTERED_STAGE_COMPACT_MAX_LAYOUT_W_PX
			);
			setIsCampaignStandardStageNarrow(
				effectiveWidth < CAMPAIGN_CENTERED_STAGE_STANDARD_MAX_LAYOUT_W_PX
			);
			setIsCompactPresetClusterBandClipped(
				effectiveWidth < CAMPAIGN_COMPACT_PRESET_CLUSTER_MIN_LAYOUT_W_PX
			);
		};
		checkBreakpoints();
		window.addEventListener('resize', checkBreakpoints);
		window.addEventListener(CAMPAIGN_ZOOM_EVENT, checkBreakpoints as EventListener);
		return () => {
			window.removeEventListener('resize', checkBreakpoints);
			window.removeEventListener(CAMPAIGN_ZOOM_EVENT, checkBreakpoints as EventListener);
		};
	}, []);

	// Fetch campaign contacts at the page level so the persistent map can stay interactive on every tab.
	const { data: campaignMapContacts, isLoading: isCampaignMapContactsLoading } =
		useGetCampaignContacts(routeCampaignId, {
			enabled: Boolean(routeCampaignId) && !isMobile,
		});
	const { data: headerEmails } = useGetEmails({
		filters: { campaignId: routeCampaignId },
		enabled:
			Boolean(routeCampaignId) &&
			isMobile === false &&
			(isNarrowestDesktop ||
				activeView === 'overview' ||
				isCompactCampaignWorkspaceView(activeView)),
	});
	const { data: overviewInboundEmails } = useGetInboundEmails({
		filters: { campaignId: routeCampaignId },
		enabled:
			Boolean(routeCampaignId) &&
			isMobile === false &&
			(activeView === 'overview' || isCompactCampaignWorkspaceView(activeView)),
	});

	// Compute header metrics
	const headerContactsCount = campaignMapContacts?.length || 0;
	const headerDraftCount = (headerEmails || []).filter(
		(e) => e.status === EmailStatus.draft
	).length;
	const headerSentCount = (headerEmails || []).filter(
		(e) => e.status === EmailStatus.sent
	).length;
	const overviewInboxCount = overviewInboundEmails?.length || 0;
	const headerToListNames =
		campaign?.userContactLists?.map((list) => list.name).join(', ') || '';
	const headerFromName = campaign?.identity?.name || '';

	// A Drafts tab with nothing drafted is just the blank placeholder page — redirect to
	// Write. Covers the URL-initialized state (?tab=drafts deep link, which bypasses
	// setActiveView) and the list emptying out while the tab is open (last draft deleted).
	// Skip while a drafting run or sending session is live: drafts are in flight, not absent.
	useEffect(() => {
		if (isMobile !== false) return;
		if (activeView !== 'drafting') return;
		if (headerEmails === undefined) return;
		if (headerDraftCount > 0) return;
		if (draftOperationsProgress.visible) return;
		if (sendingSession.status !== 'idle') return;
		// After a send drains the drafts the bounce itself is expected — only toast
		// when nothing has been written yet.
		if (headerSentCount === 0) {
			toast('No drafts yet — write your messages first.', {
				id: 'campaign-empty-tab-redirect',
			});
		}
		setActiveView('testing');
	}, [
		isMobile,
		activeView,
		headerEmails,
		headerDraftCount,
		headerSentCount,
		draftOperationsProgress.visible,
		sendingSession.status,
		setActiveView,
	]);
	const campaignOverviewContactStatusById = useMemo(() => {
		const statusById = new Map<number, CampaignOverviewStatusKey>();
		for (const contact of campaignMapContacts || []) {
			statusById.set(contact.id, 'contacts');
		}

		const latestEmailByContactId = new Map<number, string>();
		for (const email of headerEmails || []) {
			if (latestEmailByContactId.has(email.contactId)) continue;
			latestEmailByContactId.set(email.contactId, email.status);
		}
		for (const [contactId, status] of latestEmailByContactId) {
			const overviewStatus = getCampaignOverviewStatusFromEmailStatus(status);
			if (overviewStatus) statusById.set(contactId, overviewStatus);
		}

		for (const inboundEmail of overviewInboundEmails || []) {
			if (typeof inboundEmail.contactId !== 'number') continue;
			statusById.set(inboundEmail.contactId, 'new-message');
		}

		return statusById;
	}, [campaignMapContacts, headerEmails, overviewInboundEmails]);

	const campaignMapContactsForMap = useMemo(() => {
		const contacts = campaignMapContacts || [];
		if (contacts.length === 0) return contacts;

		const out = [] as typeof contacts;
		for (const contact of contacts) {
			const titleLike =
				contact.curatedDisplayLabel || contact.title || contact.headline || '';

			// The left-panel category-tile filter applies in every grouping mode, so
			// deselecting a category hides those markers whether the map is grouped by
			// status or by category.
			const categoryIndex = getMapSelectGrabCategoryIndexFromContactTitle(titleLike);
			if (categoryIndex >= 0) {
				if (mapGrabActiveCategories[categoryIndex] === false) continue;
			} else if (!mapGrabUncategorizedActive) {
				continue;
			}

			if (effectiveMapGroupingForActiveView === 'status') {
				const status = campaignOverviewContactStatusById.get(contact.id) ?? 'contacts';
				if (!effectiveActiveStatusSetForActiveView.has(status)) continue;
				out.push(contact);
				continue;
			}

			// The map colors result dots by `contact.curatedCategory` (or the active search "What").
			// Campaign contacts are not a single-category search, so derive a per-contact category
			// from the stored title prefix.
			const derivedCategory =
				getPromotionOverlayWhatFromContactTitle(titleLike) ||
				getBookingTitlePrefixFromContactTitle(titleLike);
			out.push(
				derivedCategory
					? { ...contact, curatedCategory: derivedCategory }
					: contact
			);
		}

		return out;
	}, [
		campaignMapContacts,
		effectiveActiveStatusSetForActiveView,
		campaignOverviewContactStatusById,
		effectiveMapGroupingForActiveView,
		mapGrabActiveCategories,
		mapGrabUncategorizedActive,
	]);

	const persistentCampaignMapProps = useMemo<SearchResultsMapProps>(
		() => ({
			weatherMood: globeWeatherMood,
			weatherRegionCenter: globeWeatherRegionCenter,
			weatherTemperatureF: globeWeatherTemperatureF,
			nightLighting: globeNightLighting,
			presentation: 'interactive',
			autoSpin: false,
			cameraPadding: campaignMapCameraPadding,
			contacts: campaignMapContactsForMap,
			selectedContacts: campaignMapSelectedContactIds,
			onToggleSelection: requestMapMarkerSelection,
			campaignContactStatusById: campaignOverviewContactStatusById,
			campaignMarkerMode: effectiveMapGroupingForActiveView,
			campaignHeatmapColor: CAMPAIGN_TAB_HEATMAP_COLOR[activeView] ?? null,
			// Inbox glows its whole set ambiently; Contacts/Drafts glow only the selection.
			campaignHeatmapAmbient: activeView === 'inbox',
			categoryConstellationsEnabled: true,
			activeTool: activeMapTool,
			requestedZoom: mapZoomControlRequest,
			onViewportZoom: handleMapViewportZoom,
			onViewportIdle: handleMapViewportIdle,
			onInteractiveMinZoomChange: handleInteractiveMinZoomChange,
			isLoading: isCampaignMapContactsLoading,
			skipAutoFit: true,
		}),
		[
			activeView,
			activeMapTool,
			campaignMapCameraPadding,
			campaignMapContactsForMap,
			campaignMapSelectedContactIds,
			requestMapMarkerSelection,
			campaignOverviewContactStatusById,
			effectiveMapGroupingForActiveView,
			globeNightLighting,
			globeWeatherMood,
			globeWeatherRegionCenter,
			globeWeatherTemperatureF,
			handleMapViewportIdle,
			isCampaignMapContactsLoading,
			handleMapViewportZoom,
			handleInteractiveMinZoomChange,
			mapZoomControlRequest,
		]
	);

	const persistentCampaignMapConfig = useMemo<PersistentDashboardMapConfig | null>(
		() =>
			!isMobile
				? {
						isMapView: true,
						mapViewClip: 'inset(0px round 0px)',
						mapViewFrameTransition: '0ms ease',
						mapViewFrameInsetPx: 0,
						mapViewFrameRadiusPx: 0,
						mapViewFrameBorderPx: 0,
						mapProps: persistentCampaignMapProps,
					}
				: null,
		[isMobile, persistentCampaignMapProps]
	);

	// Deferred to useEffect (not useLayoutEffect) so a tab switch paints the new tab UI immediately;
	// the background map picks up the new config one frame later (imperceptible behind the content).
	useEffect(() => {
		setPersistentMapConfig(persistentCampaignMapConfig);
	}, [persistentCampaignMapConfig, setPersistentMapConfig]);

	useLayoutEffect(() => {
		// Keep camera padding synced with campaign zoom + right-side UI coverage.
		recomputeCampaignMapCameraPadding();
	}, [recomputeCampaignMapCameraPadding, activeView, isCampaignWorkspaceExpanded]);
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const onResize = () => recomputeCampaignMapCameraPadding();
		window.addEventListener('resize', onResize, { passive: true });
		window.addEventListener(CAMPAIGN_ZOOM_EVENT, onResize as EventListener);
		return () => {
			window.removeEventListener('resize', onResize);
			window.removeEventListener(CAMPAIGN_ZOOM_EVENT, onResize as EventListener);
		};
	}, [recomputeCampaignMapCameraPadding]);

	useLayoutEffect(() => {
		return () => {
			setPersistentMapConfig(null);
		};
	}, [setPersistentMapConfig]);

	const usePersistentCampaignMapBackground = !isMobile && activeView !== 'overview';
	// The top-nav is portaled to document.body (createPortal below), so the in-tree
	// `.campaign-persistent-map-page` selector can't reach it. Mirror that exact
	// condition with a body class so the top-nav translateX shift still applies.
	useEffect(() => {
		if (typeof document === 'undefined') return;
		const body = document.body;
		body.classList.toggle('murmur-campaign-persistent-map', usePersistentCampaignMapBackground);
		return () => {
			body.classList.remove('murmur-campaign-persistent-map');
		};
	}, [usePersistentCampaignMapBackground]);
	const isCampaignWorkspaceToggleVisible =
		!isMobile &&
		usePersistentCampaignMapBackground &&
		isCompactCampaignWorkspaceView(activeView) &&
		// Below the compact centered-stage threshold the grouped layouts ignore the
		// expanded state, so the toggle is moot. Between 1317–1418 it stays reachable
		// (at the window's left edge) so an expanded workspace can be collapsed back.
		!isCampaignChromeCentered;
	const requestCampaignWorkspaceExpanded = useCallback(() => {
		isCampaignWorkspaceExpandedRef.current = true;
		setIsCampaignWorkspaceExpanded(true);
		if (typeof window !== 'undefined') {
			window.requestAnimationFrame(() => updateCampaignZoomForViewport());
		}
	}, [updateCampaignZoomForViewport]);
	const toggleCampaignWorkspaceExpanded = useCallback(() => {
		setIsCampaignWorkspaceExpanded((prev) => {
			const next = !prev;
			isCampaignWorkspaceExpandedRef.current = next;
			if (typeof window !== 'undefined') {
				window.requestAnimationFrame(() => updateCampaignZoomForViewport());
			}
			return next;
		});
	}, [updateCampaignZoomForViewport]);

	// Tab navigation order
	const tabOrder: ViewType[] = ['testing', 'overview', 'inbox', 'drafting'];

	const goToPreviousTab = () => {
		const currentIndex = tabOrder.indexOf(activeView);
		if (currentIndex > 0) {
			setActiveView(tabOrder[currentIndex - 1]);
		} else {
			// Wrap around to the last tab
			setActiveView(tabOrder[tabOrder.length - 1]);
		}
	};

	const goToNextTab = () => {
		const currentIndex = tabOrder.indexOf(activeView);
		if (currentIndex < tabOrder.length - 1) {
			setActiveView(tabOrder[currentIndex + 1]);
		} else {
			// Wrap around to the first tab
			setActiveView(tabOrder[0]);
		}
	};

	// Keyboard navigation: arrow keys to switch tabs when no text input is focused
	// Left/Right: cycle through tabs. Up/Down: toggle the Inbox <-> Sent sub-view.
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Only handle arrow keys
			if (
				e.key !== 'ArrowLeft' &&
				e.key !== 'ArrowRight' &&
				e.key !== 'ArrowUp' &&
				e.key !== 'ArrowDown'
			)
				return;

			// Check if a text input element is focused (don't intercept typing)
			const activeElement = document.activeElement;
			if (activeElement) {
				const tagName = activeElement.tagName.toLowerCase();
				// Skip if focused on input, textarea, or contentEditable
				if (
					tagName === 'input' ||
					tagName === 'textarea' ||
					(activeElement as HTMLElement).isContentEditable
				) {
					return;
				}
			}

			// Prevent default scrolling behavior
			e.preventDefault();

			// Handle up/down arrows: only used to toggle the Inbox -> Sent sub-view.
			if (e.key === 'ArrowUp') {
				if (activeView === 'inbox' && inboxSentTab === 'sent' && cameToSentFromInbox) {
					setCameToSentFromInbox(false);
					requestInboxSentTab('inbox');
				}
				return;
			}

			if (e.key === 'ArrowDown') {
				if (activeView === 'inbox') {
					setCameToSentFromInbox(true);
					requestInboxSentTab('sent');
				}
				return;
			}

			// Mobile has a single view (Summary) — nothing to cycle.
			if (isMobile === true) return;
			if (e.key === 'ArrowLeft') {
				goToPreviousTab();
			} else {
				goToNextTab();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [
		isMobile,
		goToPreviousTab,
		goToNextTab,
		activeView,
		cameToSentFromInbox,
		setActiveView,
		inboxSentTab,
		requestInboxSentTab,
	]);

	if (isPendingCampaign || !campaign) {
		return (
			<CampaignDeviceProvider isMobile={isMobile} activeView={activeView}>
				{null}
			</CampaignDeviceProvider>
		);
	}

	if (isMobile === null) {
		return (
			<CampaignDeviceProvider isMobile={isMobile} activeView={activeView}>
				{null}
			</CampaignDeviceProvider>
		);
	}
	// Hide underlying content and show a white overlay when we require the user to set up an identity
	// or while the full-screen User Settings dialog is open. This prevents any visual "glimpses" and
	// ensures a premium, smooth transition with no scale effects.
	const shouldHideContent = isIdentityDialogOpen || !campaign.identityId;

	// The Write/Drafts/Inbox tabs reuse the overview map controls: a status legend
	// locked to the tab's preset, plus a dimmed, display-only category strip and
	// search bar. Only on the roomy desktop layout, where the split-screen leaves a
	// clear left map region for them to sit over.
	// Once the centered stage kicks in (the band covers the full viewport) there is
	// no clear map strip left, so the controls hide. The expanded workspace uses the
	// standard (wider) cluster, which centers at the higher 1418 threshold.
	const isCampaignMapStageCentered =
		isCampaignChromeCentered ||
		(isCampaignWorkspaceExpanded && isCampaignStandardStageNarrow);
	const isPresetMapControlsView =
		!isMobile &&
		Boolean(activeTabPresetStatuses) &&
		!shouldHideContent &&
		!isNarrowestDesktop &&
		!isCampaignMapStageCentered;
	// The compact (non-expanded) stage keeps the bottom cluster at a fixed scale, so
	// the band's left edge reaches it before the centered-stage cutoff — drop just the
	// bottom cluster once the clear strip can no longer fit it. The expanded workspace
	// rescales the cluster to the strip instead, so it's exempt.
	const isPresetBottomClusterVisible =
		isPresetMapControlsView &&
		(isCampaignWorkspaceExpanded || !isCompactPresetClusterBandClipped);
	const presetMapControlsLeftCss = `calc(var(${CAMPAIGN_MAP_BACKDROP_START_VAR}, 33.333vw) / 2)`;
	const presetMapControlsScale =
		isPresetMapControlsView && isCampaignWorkspaceExpanded && viewportWidth > 0
			? clampNumber(
					(viewportWidth * CAMPAIGN_BACKDROP_TARGET_START_RATIO -
						CAMPAIGN_PRESET_EXPANDED_CONTROLS_SIDE_GUTTER_PX) /
						CAMPAIGN_OVERVIEW_STATUS_STRIP_WIDTH_PX,
					CAMPAIGN_PRESET_EXPANDED_CONTROLS_MIN_SCALE,
					CAMPAIGN_PRESET_EXPANDED_CONTROLS_MAX_SCALE
				)
			: CAMPAIGN_OVERVIEW_CLUSTER_SCALE;
	const presetMapToolExtraNudgeUpPx =
		isPresetMapControlsView && isCampaignWorkspaceExpanded
			? presetMapControlsScale < 0.78
				? CAMPAIGN_PRESET_EXPANDED_TOOL_COMPACT_NUDGE_UP_PX
				: CAMPAIGN_PRESET_EXPANDED_TOOL_NUDGE_UP_PX
			: 0;
	const presetMapToolExtraNudgeUpCss = presetMapToolExtraNudgeUpPx
		? `calc(${presetMapToolExtraNudgeUpPx}px / var(${CAMPAIGN_ZOOM_VAR}, ${DEFAULT_CAMPAIGN_ZOOM}))`
		: '0px';
	const presetMapToolTopCss =
		`calc(${CAMPAIGN_MAP_TOOL_VISUAL_TOP_CSS} + ${campaignMapSelectGrabOriginOffsetPx}px - ` +
		`${CAMPAIGN_MAP_TOOL_VISUAL_TOP_NUDGE_UP_CSS} - ${presetMapToolExtraNudgeUpCss})`;
	const presetMapControlsExtraBottomPx =
		isPresetMapControlsView && isCampaignWorkspaceExpanded
			? CAMPAIGN_PRESET_EXPANDED_CONTROLS_NUDGE_UP_PX
			: 0;
	const presetMapAskBoxBottomPx =
		CAMPAIGN_PRESET_ASK_BOX_BOTTOM_PX + presetMapControlsExtraBottomPx;
	const presetMapStatusStripBottomPx =
		CAMPAIGN_PRESET_STATUS_STRIP_BOTTOM_PX + presetMapControlsExtraBottomPx;

	// Writing + Drafts + Sent + Inbox tab vertical alignment:
	// Sit the top of the main content box exactly 27px below the bottom edge of the
	// fixed top nav box (only in the standard desktop header layout).
	//
	// The top nav backdrop box is fixed at top:9px and its inner box is scaled by
	// CAMPAIGN_TOP_NAV_UI_SCALE (matching the dashboard search bar), so its bottom edge
	// resolves to 9 + (height × scale). We anchor the content box 27px beneath that.
	//
	// Notes:
	// - The campaign header row is a fixed 50px tall.
	// - DraftingSection contains a small 4px spacer div at the very top (mb-[4px]).
	const CAMPAIGN_TOP_NAV_BOX_BOTTOM_PX =
		CAMPAIGN_TOP_NAV_BACKDROP_BOX_TOP_PX +
		CAMPAIGN_TOP_NAV_BACKDROP_BOX_HEIGHT_PX * CAMPAIGN_TOP_NAV_UI_SCALE;
	const WRITING_BOX_TOP_PX = Math.round(CAMPAIGN_TOP_NAV_BOX_BOTTOM_PX + 27);
	const CAMPAIGN_HEADER_HEIGHT_PX = 50;
	const DRAFTING_SECTION_TOP_SPACER_PX = 4;
	const writingContentTopMarginPx =
		WRITING_BOX_TOP_PX - CAMPAIGN_HEADER_HEIGHT_PX - DRAFTING_SECTION_TOP_SPACER_PX; // 105px
	const shouldApplyWritingTopShift =
		(activeView === 'testing' ||
			activeView === 'drafting' ||
			activeView === 'sent' ||
			activeView === 'inbox') &&
		!isMobile &&
		!isNarrowestDesktop;
	// Per-view version of the crossfade wrapper's margin (mt-6 = 24px unless the
	// top shift above applies for that view). The previous-layer snapshot offsets
	// itself by the delta so it stays at the margin its view was painted with.
	const getCampaignViewContentTopMarginPx = (view: ViewType): number =>
		(view === 'testing' ||
			view === 'drafting' ||
			view === 'sent' ||
			view === 'inbox') &&
		!isMobile &&
		!isNarrowestDesktop
			? writingContentTopMarginPx
			: 24;
	return (
		<CampaignDeviceProvider isMobile={isMobile} activeView={activeView}>
			<HoverDescriptionProvider enabled={selectedRightBoxIcon === 'info'}>
				<CampaignTopSearchHighlightProvider value={topSearchHighlightCtx}>
					<div
						className={cn(
							'min-h-screen relative',
							!isMobile && 'campaign-map-interactive-page',
							usePersistentCampaignMapBackground && 'campaign-persistent-map-page'
						)}
					>
						{usePersistentCampaignMapBackground && (
							<div className="campaign-map-split-overlay" aria-hidden="true" />
						)}
						{isMobile === false && activeView === 'overview' && !shouldHideContent && (
							<div
								className="pointer-events-none fixed inset-0"
								style={{
									transform: `scale(${CAMPAIGN_OVERVIEW_CLUSTER_SCALE})`,
									transformOrigin: 'bottom center',
									zIndex: 126,
								}}
							>
								<CampaignOverviewStatusToggle
									selected={campaignOverviewMapGrouping}
									isSearchActive={isOverviewSearchActive}
									onChange={handleCampaignOverviewMapGroupingChange}
								/>
								<CampaignOverviewStatusStrip
									selectedStatuses={campaignOverviewSelectedStatusSet}
									disabled={effectiveCampaignOverviewMapGrouping !== 'status'}
									onToggleStatus={handleCampaignOverviewStatusToggle}
								/>
								<CampaignOverviewAskAnythingBox
									onSubmit={handleOverviewAskAnythingSubmit}
									value={overviewSearchQuery ?? ''}
								/>
								<CampaignOverviewBottomBoxes
									contactsCount={headerContactsCount}
									draftCount={headerDraftCount}
									inboxCount={overviewInboxCount}
									sentCount={headerSentCount}
									onOpenSearch={handleOpenDashboardSearchForCampaign}
									onOpenContacts={
										headerContactsCount > 0 ? () => setActiveView('testing') : undefined
									}
									onOpenDrafts={
										headerDraftCount > 0 ? () => setActiveView('drafting') : undefined
									}
									onOpenInbox={
										overviewInboxCount > 0
											? () => {
													// Explicit 'inbox' request beats a stale 'sent' one when the
													// view dedupe skips re-requesting (sent pill → inbox pill).
													requestInboxSentTab('inbox');
													setActiveView('inbox');
												}
											: undefined
									}
									onOpenSent={
										headerSentCount > 0 ? () => setActiveView('sent') : undefined
									}
									onOpenOpportunities={
										overviewInboxCount > 0 ? handleOpenInboxOpportunities : undefined
									}
								/>
							</div>
						)}
						{/* Write/Drafts/Inbox tabs: the same legend locked to the tab's
						    preset (full opacity), plus a dimmed, display-only search bar
						    that lights up to full opacity on hover, like the left strip. */}
						{isPresetMapControlsView && (
							<>
								{isPresetBottomClusterVisible && (
									<div
										className="pointer-events-none fixed inset-0"
										style={{
											transform: `scale(${presetMapControlsScale})`,
											transformOrigin: `${presetMapControlsLeftCss} bottom`,
											zIndex: 126,
										}}
									>
										<CampaignOverviewStatusStrip
											selectedStatuses={effectiveActiveStatusSetForActiveView}
											locked
											leftOverride={presetMapControlsLeftCss}
											bottomOverride={presetMapStatusStripBottomPx}
											onToggleStatus={() => undefined}
										/>
										<CampaignOverviewAskAnythingBox
											onSubmit={handlePresetAskAnythingSubmit}
											value={overviewSearchQuery ?? ''}
											leftOverride={presetMapControlsLeftCss}
											bottomOverride={presetMapAskBoxBottomPx}
											dimUntilHover
										/>
									</div>
								)}
								{/* The overview "Showing" strip, mirrored onto the Write/Drafts/Inbox
								    tabs: dimmed to 0.4 by default, fading to full opacity + becoming
								    interactive while hovered (like the search page). Wired to the same
								    map tool / category / zoom handlers as the overview strip. Omits the
								    data-campaign-overview-* attrs — DraftingSection queries those only to
								    dock overview contacts, which never happens on these preset tabs. */}
								<div
									data-campaign-interactive-surface
									className="fixed z-[130] pointer-events-none"
									onMouseEnter={() => setIsPresetStripHovered(true)}
									onMouseLeave={() => setIsPresetStripHovered(false)}
									style={{
										left: `${CAMPAIGN_MAP_SELECT_GRAB_LEFT_PX}px`,
										top: presetMapToolTopCss,
										transform: `scale(${campaignMapSelectGrabViewScale})`,
										transformOrigin: 'top left',
										opacity: isPresetStripHovered ? 1 : 0.4,
										transition: 'opacity 0.18s ease',
									}}
								>
									{/* Invisible hit-area spanning the whole column so hovering anywhere
									    over the strip (including the gaps between the stacked boxes)
									    keeps it lit and interactive, matching the search page. */}
									<div
										aria-hidden="true"
										style={{
											position: 'absolute',
											left: '-2px',
											width: '60px',
											top: `-${
												MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
												MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
												MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
												MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
												MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX +
												MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
												MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX +
												MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX +
												40
											}px`,
											height: `${
												MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
												MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
												MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
												MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
												MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX +
												MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
												MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX +
												MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX +
												200
											}px`,
											pointerEvents: 'auto',
										}}
									/>
									<div className="pointer-events-none">
										<div
											className="absolute pointer-events-none flex items-center justify-center overflow-hidden rounded-[10px] bg-[#FDFCFB] font-inter font-normal text-black"
											style={{
												width: '66px',
												height: '17px',
												fontSize: '14px',
												lineHeight: '39.473px',
												textAlign: 'center',
												left: '-5.5px',
												top: `-${
													MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
													MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
													MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
													MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
													MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX +
													MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
													MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX +
													MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX +
													17 +
													6
												}px`,
											}}
										>
											Showing
										</div>
										<MapSelectGrabTallStackBox
											className="absolute pointer-events-none"
											isSelectActive={isSelectMapToolActive}
											onAllDeselected={() => setActiveMapTool('grab')}
											onActiveCategoriesChange={handleMapGrabActiveCategoriesChange}
											style={{
												left: '-0.5px',
												top: `-${
													MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
													MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
													MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
													MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
													MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX +
													MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
													MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX +
													MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX
												}px`,
												...(isSelectMapToolActive
													? {
														backgroundColor: '#A6DCB3',
													}
													: {}),
											}}
										/>
										<MapSelectGrabStackBox
											className="absolute left-0 pointer-events-none"
											isSelectActive={isSelectMapToolActive}
											selectedContent={<StackBoxSelectStarIcon />}
											inactiveContent={
												<MapSelectGrabStackTile backgroundColor="#EFEFEF">
													<MapStackStarIcon />
												</MapSelectGrabStackTile>
											}
											style={{
												top: `-${
													MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
													MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
													MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
													MAP_SELECT_GRAB_STACK_BOX_SIZE_PX
												}px`,
											}}
										>
											<MapSelectGrabStackTile backgroundColor="#FFBDBD">
												<MapStackStarIcon />
											</MapSelectGrabStackTile>
										</MapSelectGrabStackBox>
										<MapSelectGrabStackBox
											className="absolute left-0 pointer-events-none"
											isSelectActive={isSelectMapToolActive}
											selectedContent={<StackBoxSelectBlueSparkIcon />}
											inactiveContent={
												<MapSelectGrabStackTile backgroundColor="#EFEFEF">
													<MapStackBlueSparkIcon />
												</MapSelectGrabStackTile>
											}
											onActiveChange={handleMapGrabUncategorizedActiveChange}
											style={{
												top: `-${
													MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
													MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
													MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
													MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
													MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX +
													MAP_SELECT_GRAB_STACK_BOX_SIZE_PX
												}px`,
											}}
										>
											<MapSelectGrabStackTile backgroundColor="#50A5C970">
												<MapStackBlueSparkIcon />
											</MapSelectGrabStackTile>
										</MapSelectGrabStackBox>
										<MapSelectGrabStarterBox
											className="absolute left-0 pointer-events-auto"
											zoomLevelIndex={mapZoomControlIndex}
											zoomLevelValue={mapZoomControlDisplayValue}
											zoomLevelLiveControlRef={mapZoomControlLiveRef}
											onZoomLevelIndexChange={handleMapZoomControlChange}
											onZoomLevelValueChange={handleMapZoomControlValueChange}
											onZoomLevelInteractionChange={handleMapZoomControlInteractionChange}
											style={{
												position: 'absolute',
												left: 0,
												top: `-${
													MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
													MAP_SELECT_GRAB_STARTER_BOX_GAP_PX
												}px`,
											}}
										/>
										<MapSelectGrabTool
											activeTool={activeMapTool}
											onSelectClick={handleSelectMapToolClick}
											onGrabClick={() => setActiveMapTool('grab')}
											className="pointer-events-auto"
										/>
									</div>
								</div>
							</>
						)}
						{/* Top navigation box (ported from dashboard map view).
			    Translucent backdrop + 5-tab row (Search / Write / [campaign chip] / Inbox / Drafts)
			    + empty outline boxes flanking a center search pill. Desktop only. */}
						{!isMobile &&
							(() => {
								// Constants mirror dashboard/page.tsx:3879-3924 so visual proportions match.
								const MAP_VIEW_UI_SCALE = CAMPAIGN_TOP_NAV_UI_SCALE;
								const MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX =
									CAMPAIGN_TOP_NAV_SEARCH_BAR_INPUT_HEIGHT_PX;
								const MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX =
									CAMPAIGN_TOP_NAV_SEARCH_BAR_OUTER_WIDTH_PX;
								const MAP_VIEW_TOP_BACKDROP_BOX_TOP_PX =
									CAMPAIGN_TOP_NAV_BACKDROP_BOX_TOP_PX;
								const MAP_VIEW_TOP_BACKDROP_BOX_WIDTH_PX =
									CAMPAIGN_TOP_NAV_BACKDROP_BOX_WIDTH_PX;
								const MAP_VIEW_TOP_BACKDROP_BOX_HEIGHT_PX =
									CAMPAIGN_TOP_NAV_BACKDROP_BOX_HEIGHT_PX;
								const MAP_VIEW_TOP_OUTLINE_BOX_WIDTH_PX = Math.round(
									124 * (MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX / 488.204)
								);
								const MAP_VIEW_TOP_OUTLINE_BOX_HEIGHT_PX = Math.round(
									42 * (MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX / 488.204)
								);
								const MAP_VIEW_TOP_OUTLINE_BOX_LEFT_GAP_PX = Math.round(
									23 * (MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX / 488.204)
								);
								const MAP_VIEW_TOP_OUTLINE_BOX_RIGHT_WIDTH_PX = Math.round(
									105 * (MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX / 488.204)
								);
								const MAP_VIEW_TOP_OUTLINE_BOX_RIGHT_HEIGHT_PX = Math.round(
									42 * (MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX / 488.204)
								);
								const MAP_VIEW_TOP_OUTLINE_BOX_RIGHT_GAP_PX = Math.round(
									31 * (MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX / 488.204)
								);
								const MAP_VIEW_SEARCH_BAR_BOTTOM_INSET_PX = 4;
								const MAP_VIEW_SEARCH_BAR_TOP_PX =
									MAP_VIEW_TOP_BACKDROP_BOX_TOP_PX +
									MAP_VIEW_TOP_BACKDROP_BOX_HEIGHT_PX * MAP_VIEW_UI_SCALE -
									MAP_VIEW_SEARCH_BAR_BOTTOM_INSET_PX -
									MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX * MAP_VIEW_UI_SCALE;
								const MAP_VIEW_STRATEGY_DROPDOWN_TOP_PX =
									MAP_VIEW_SEARCH_BAR_TOP_PX +
									MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX * MAP_VIEW_UI_SCALE +
									18;
								const MAP_VIEW_CAMPAIGNS_DROPDOWN_TOP_PX = MAP_VIEW_STRATEGY_DROPDOWN_TOP_PX;
								const CAMPAIGN_MAP_TOP_TABS_VISUAL_WIDTH_PX = 560;
								const CAMPAIGN_MAP_TOP_TABS_WIDTH_PX = Math.round(
									CAMPAIGN_MAP_TOP_TABS_VISUAL_WIDTH_PX / MAP_VIEW_UI_SCALE
								);

																	const campaignName = campaign?.name || 'Campaign';
																	const isOverviewLocalSearchActive =
																		activeView === 'overview' &&
																		(overviewSearchQuery ?? '').trim().length > 0;
																	const overviewLocalSearchLabel = (overviewSearchQuery ?? '').trim();

								const inactiveTabStyle = (isActive: boolean) => ({
									color: '#2C2C2C',
									fontFamily: 'Inter, sans-serif',
									fontSize: '17px',
									fontStyle: 'normal' as const,
									fontWeight: isActive ? 600 : 500,
									lineHeight: '14px',
									opacity: isActive ? 1 : 0.5,
								});
								const dashboardInitialPanelClassName =
									'campaigns-table-wrapper dashboard-recent-campaigns pointer-events-auto w-full max-w-[960px] mx-auto px-4';
								const dashboardInitialPanelContentClassName =
									'w-full flex flex-col items-center';

								const topNavContent = (
									<>
										{/* Translucent sky-blue backdrop */}
										<div
											aria-hidden="true"
											data-slot="campaign-top-backdrop"
											className="fixed left-0 right-0 flex justify-center pointer-events-none"
											style={{
												top: `${MAP_VIEW_TOP_BACKDROP_BOX_TOP_PX}px`,
												zIndex: 110,
											}}
										>
											<div
												style={{
													transform: `scale(${MAP_VIEW_UI_SCALE})`,
													transformOrigin: 'top center',
													width: `${MAP_VIEW_TOP_BACKDROP_BOX_WIDTH_PX}px`,
													height: `${MAP_VIEW_TOP_BACKDROP_BOX_HEIGHT_PX}px`,
													borderRadius: '8px',
													backgroundColor: '#B9EAF1',
													opacity: 0.9,
												}}
											/>
										</div>

										{/* Persistent "Filtering in {campaign}" status pill, centered over the
										    map strip left of the panels. Display-only (pointer-events:none) and
										    intentionally NOT added to the top-nav right-shift rule below, so it
										    stays over the map instead of riding the chrome's translateX. */}
										<div
											data-slot={
												activeView === 'overview'
													? 'campaign-top-filter-pill-nav'
													: 'campaign-top-filter-pill'
											}
											aria-hidden="true"
											className="fixed flex justify-center pointer-events-none"
											style={
												activeView === 'overview'
													? {
															// All/overview tab: center the pill UNDER the middle top-nav
															// panel, just below the backdrop. The horizontal centering +
															// right-shift are inherited from the shared top-nav shift CSS
															// rule (which matches the campaign-top-filter-pill-nav slot),
															// so the pill tracks the nav exactly in every layout mode
															// (including origin=search, where the nav shift is 0).
															top: `${
																MAP_VIEW_TOP_BACKDROP_BOX_TOP_PX +
																MAP_VIEW_TOP_BACKDROP_BOX_HEIGHT_PX * MAP_VIEW_UI_SCALE +
																8
															}px`,
															left: 0,
															right: 0,
															zIndex: 115,
													  }
													: {
															// Other tabs: top-center over the left map strip.
															top: '10px',
															left: 0,
															width: `var(${CAMPAIGN_MAP_BACKDROP_START_VAR}, 33.333%)`,
															zIndex: 115,
													  }
											}
										>
											<div
												style={{
													transform: `scale(${MAP_VIEW_UI_SCALE})`,
													transformOrigin: 'top center',
													display: 'inline-flex',
													height: '33px',
													padding: '7px 8px 7px 12px',
													alignItems: 'center',
													gap: '8px',
													borderRadius: '9999px',
													backgroundColor: '#CDEFCF',
													fontFamily: 'Inter, sans-serif',
													whiteSpace: 'nowrap',
												}}
											>
												<span style={{ color: '#000', fontSize: '15px', fontWeight: 600, lineHeight: 1 }}>
													Filtering in
												</span>
												<span
													style={{
														display: 'inline-flex',
														alignItems: 'center',
														justifyContent: 'center',
														gap: '6px',
														minWidth: '85px',
														height: '19px',
														maxWidth: '180px',
														boxSizing: 'border-box',
														background: '#FFFFFF',
														borderRadius: '4px',
														padding: '0 8px',
													}}
												>
													<svg
														aria-hidden="true"
														focusable="false"
														width="23"
														height="13"
														viewBox="0 0 30 17"
														fill="none"
														xmlns="http://www.w3.org/2000/svg"
														className="block flex-shrink-0"
													>
														<rect y="2" width="30" height="15" rx="1" fill="#B43A35" />
														<path
															d="M0 2C0 0.89543 0.895431 0 2 0H13C14.1046 0 15 0.895431 15 2V4C15 4.55228 14.5523 5 14 5H1C0.447715 5 0 4.55228 0 4V2Z"
															fill="#B43A35"
														/>
													</svg>
													<span
														className="min-w-0 truncate"
														style={{ color: '#000', fontSize: '15px', fontWeight: 600, lineHeight: 1 }}
													>
														{campaignName}
													</span>
												</span>
											</div>
										</div>

										{/* Tabs row: Search / Write / [campaign chip] / Inbox / Drafts */}
										<div
											data-slot="campaign-top-tabs"
											data-hover-description-suppress="true"
											className="fixed left-0 right-0 z-[9999] flex items-center justify-center pointer-events-none"
											style={{ top: '12px', height: '24px' }}
										>
											<div
												className="pointer-events-auto relative"
												style={{
													width: `${CAMPAIGN_MAP_TOP_TABS_WIDTH_PX}px`,
													maxWidth: 'calc(100vw - 64px)',
													height: '24px',
													transform: `scale(${MAP_VIEW_UI_SCALE})`,
													transformOrigin: 'top center',
												}}
											>
												<div
													className="relative z-[1] grid h-full w-full items-center justify-items-center"
													style={{
														gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
													}}
												>
													<button
														type="button"
														className="bg-transparent p-0 m-0 border-0 cursor-pointer inline-flex items-center justify-center h-full translate-y-[2px]"
														style={inactiveTabStyle(false)}
														onPointerEnter={handleSearchTabPointerEnter}
														onFocus={handleSearchTabPointerEnter}
														onPointerLeave={handleSearchTabPointerLeave}
														onPointerDown={handleSearchTabPointerDown}
														onClick={handleGoToDashboardSearch}
													>
														Search
													</button>
													<button
														type="button"
														className="bg-transparent p-0 m-0 border-0 cursor-pointer inline-flex items-center justify-center h-full translate-y-[2px]"
														style={inactiveTabStyle(activeView === 'testing')}
														onClick={() => setActiveView('testing')}
													>
														Write
													</button>
													<button
														type="button"
														aria-label={campaignName}
														title={campaignName}
														className="bg-transparent p-0 m-0 border-0 cursor-pointer inline-flex min-w-0 items-center justify-center gap-[7px] h-full"
														onClick={() => setActiveView('overview')}
														style={{
															color: '#000',
															fontFamily: 'Inter, sans-serif',
															fontSize: '20.719px',
															fontStyle: 'normal',
															fontWeight: activeView === 'overview' ? 600 : 500,
															lineHeight: '17.063px',
															opacity: activeView === 'overview' ? 1 : 0.72,
														}}
													>
														<svg
															aria-hidden="true"
															focusable="false"
															width="23"
															height="13"
															viewBox="0 0 30 17"
															fill="none"
															xmlns="http://www.w3.org/2000/svg"
															className="block flex-shrink-0"
														>
															<rect y="2" width="30" height="15" rx="1" fill="#B43A35" />
															<path
																d="M0 2C0 0.89543 0.895431 0 2 0H13C14.1046 0 15 0.895431 15 2V4C15 4.55228 14.5523 5 14 5H1C0.447715 5 0 4.55228 0 4V2Z"
																fill="#B43A35"
															/>
														</svg>
														<span className="min-w-0 truncate">{campaignName}</span>
													</button>
													<button
														type="button"
														className="bg-transparent p-0 m-0 border-0 cursor-pointer inline-flex items-center justify-center h-full translate-y-[2px]"
														style={inactiveTabStyle(activeView === 'inbox')}
														onClick={() => setActiveView('inbox')}
													>
														Inbox
													</button>
													<button
														type="button"
														className="bg-transparent p-0 m-0 border-0 cursor-pointer inline-flex items-center justify-center h-full translate-y-[2px]"
														style={inactiveTabStyle(activeView === 'drafting')}
														onClick={() => setActiveView('drafting')}
													>
														Drafts
													</button>
																			</div>
																		</div>
																	</div>

																	{/* Center pill — action row (or active overview search) */}
																	<div
																		data-slot="campaign-top-search-bar"
																		className="fixed left-0 right-0 flex justify-center pointer-events-none"
																		style={{
																			top: `${MAP_VIEW_SEARCH_BAR_TOP_PX}px`,
																			zIndex: 120,
																		}}
																	>
															<div
																className="pointer-events-auto"
																			style={{
																				transform: `scale(${MAP_VIEW_UI_SCALE})`,
																				transformOrigin: 'top center',
																				width: `${MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX}px`,
																				maxWidth: `${MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX}px`,
																				height: `${MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX}px`,
																				borderRadius: '8px',
																				border: '3px solid #000',
																				background: isOverviewLocalSearchActive
																					? 'linear-gradient(90deg, #ADFFC2 0%, #EFFFF3 100%)'
																					: '#FFFFFF',
																				boxSizing: 'border-box',
																				display: 'flex',
																				alignItems: 'center',
																				justifyContent: 'space-around',
																				padding: '0 32px',
																				color: '#050505',
																			}}
																		>
																				{isOverviewLocalSearchActive ? (
																					<div className="relative flex h-full w-full items-center justify-center">
																							<span
																								className="max-w-[calc(100%_-_54px)] truncate font-inter text-[15px] font-semibold leading-none text-black"
																							title={overviewLocalSearchLabel}
																							>
																								{overviewLocalSearchLabel}
																							</span>
																							<button
																								type="button"
																								aria-label="Exit campaign search"
																								onClick={handleClearOverviewSearchQuery}
																								className="absolute right-[-24px] top-1/2 flex h-[23.147px] w-[24.927px] -translate-y-1/2 items-center justify-center rounded-[5.342px] bg-[#ABABAB] opacity-80 hover:opacity-100 text-white transition-opacity"
																							>
																								<span className="text-[16px] leading-none -translate-y-[1px]">×</span>
																							</button>
																						</div>
																				) : (
																					[
																							{
																									key: 'playbook',
																										Icon: DashboardActionBarPlaybookIcon,
																										label: 'Playbook',
																										width: 24,
																										height: 20,
																									},
																									{
																										key: 'folder',
																										Icon: DashboardActionBarFolderIcon,
																										label: 'Folder',
																										width: 24,
																										height: 14,
																									},
																									{
																										key: 'search',
																										Icon: SearchIconDesktop,
																										label: 'Search',
																										width: 22,
																										height: 22,
																									},
															{
																key: 'star',
																Icon: DashboardActionBarStarIcon,
																label: 'Opportunities',
																width: 22,
																height: 21,
															},
																									{
																										key: 'envelope',
																										Icon: DashboardActionBarEnvelopeIcon,
																										label: 'Messages',
																										width: 22,
																										height: 14,
																									},
													] as const
												).map(({ key, Icon, label, width, height }) => {
													const isStrategyButton = key === 'playbook';
																const isFolderButton = key === 'folder';
																const isOpportunitiesButton = key === 'star';
																const isResponsesButton = key === 'envelope';
																const isSearchButton = key === 'search';

													return (
														<button
															key={key}
															type="button"
																ref={
																	isStrategyButton
																		? topStrategyButtonRef
																		: isFolderButton
																			? topCampaignsFolderButtonRef
																					: isOpportunitiesButton
																						? topOpportunitiesButtonRef
																						: isResponsesButton
																							? responsesPopupTriggerRef
																							: undefined
																}
																aria-label={label}
																aria-haspopup={
																			isStrategyButton ||
																			isFolderButton ||
																			isOpportunitiesButton ||
																			isResponsesButton
																				? 'dialog'
																		: undefined
																}
																aria-expanded={
																	isStrategyButton
																		? isTopStrategyDropdownOpen
																		: isFolderButton
																			? showTopCampaignsDropdown
																				: isOpportunitiesButton
																					? isTopOpportunitiesOpen
																					: isResponsesButton
																						? isResponsesPopupOpen
																						: undefined
																}
															onClick={
																isStrategyButton
																	? () => {
																		setShowTopCampaignsDropdown(false);
																		setIsResponsesPopupOpen(false);
																		setIsTopOpportunitiesOpen(false);
																		setIsTopStrategyDropdownOpen((open) => !open);
																	}
																		: isFolderButton
																	? () => {
																		setIsTopStrategyDropdownOpen(false);
																		setIsResponsesPopupOpen(false);
																		setIsTopOpportunitiesOpen(false);
																		setShowTopCampaignsDropdown((open) => !open);
																	}
																		: isOpportunitiesButton
																		? () => {
																			setShowTopCampaignsDropdown(false);
																		setIsResponsesPopupOpen(false);
																		setIsTopStrategyDropdownOpen(false);
																		setIsTopOpportunitiesOpen((open) => !open);
																	}
																			: isResponsesButton
																	? () => {
																		setShowTopCampaignsDropdown(false);
																		setIsTopStrategyDropdownOpen(false);
																		setIsTopOpportunitiesOpen(false);
																		setIsResponsesPopupOpen((open) => !open);
																	}
																			: isSearchButton
																				? handleGoToDashboardSearch
																			: undefined
																}
																	style={{
																		background: 'none',
																		border: 'none',
																		padding: '4px 6px',
																		margin: 0,
																		display: 'flex',
																		alignItems: 'center',
																		justifyContent: 'center',
																		cursor: 'pointer',
																		color: '#050505',
																opacity:
																(isStrategyButton && isTopStrategyDropdownOpen) ||
																(isFolderButton && showTopCampaignsDropdown) ||
																(isOpportunitiesButton && isTopOpportunitiesOpen) ||
																(isResponsesButton && isResponsesPopupOpen)
																? 1
																: 0.55,
																		transition: 'opacity 150ms ease',
																	}}
																>
																	<Icon width={width} height={height} />
																</button>
															);
														})
												}
											</div>
																			</div>

										{isTopStrategyDropdownOpen && !isOverviewLocalSearchActive ? (
											<div
												data-slot="campaign-top-strategy-dropdown"
												className="fixed left-0 right-0 flex justify-center pointer-events-none"
												style={{
													top: `${MAP_VIEW_STRATEGY_DROPDOWN_TOP_PX}px`,
													zIndex: 128,
												}}
											>
												<div
													ref={topStrategyDropdownRef}
													data-campaign-interactive-surface
													role="dialog"
													aria-label="Strategy"
													className={dashboardInitialPanelClassName}
													style={{ transformOrigin: 'top center' }}
												>
													<div className={dashboardInitialPanelContentClassName}>
														<DashboardStrategyBox onSearchContacts={handleGoToDashboardSearch} />
													</div>
												</div>
											</div>
										) : null}

										{showTopCampaignsDropdown && !isOverviewLocalSearchActive ? (
											<div
												data-slot="campaign-top-campaigns-dropdown"
											className="fixed left-0 right-0 flex justify-center pointer-events-none"
											style={{
												top: `${MAP_VIEW_CAMPAIGNS_DROPDOWN_TOP_PX}px`,
												zIndex: 128,
											}}
										>
											<div
												ref={topCampaignsDropdownRef}
													data-campaign-interactive-surface
													role="dialog"
													aria-label="Campaign folders"
													className={dashboardInitialPanelClassName}
													style={{
														transformOrigin: 'top center',
														// The initial dashboard renders at the 0.85 baseline zoom; cancel the
														// per-monitor campaign zoom so this dropdown matches it on every screen.
														zoom: 'calc(0.85 / var(--murmur-campaign-zoom, 0.85))',
													}}
												>
													<div className={dashboardInitialPanelContentClassName}>
														<CampaignsTable
															defaultOpenCampaignId={campaign.id}
															defaultOpenContactsFolder
														/>
													</div>
												</div>
											</div>
										) : null}

										{isTopOpportunitiesOpen && !isOverviewLocalSearchActive ? (
											<div
												data-slot="campaign-top-opportunities-popup"
												className="fixed left-0 right-0 flex justify-center pointer-events-none"
												style={{
													top: `${MAP_VIEW_STRATEGY_DROPDOWN_TOP_PX}px`,
													zIndex: 128,
												}}
											>
												<div
													ref={topOpportunitiesPopupRef}
													data-campaign-interactive-surface
													role="dialog"
													aria-label="Opportunities"
													className={dashboardInitialPanelClassName}
													style={{ transformOrigin: 'top center' }}
												>
													<div className={dashboardInitialPanelContentClassName}>
														<DashboardOpportunitiesWidget enabled={isLoaded && !!user} />
													</div>
												</div>
											</div>
										) : null}

										{isResponsesPopupOpen && !isOverviewLocalSearchActive ? (
											<div
												data-slot="campaign-top-responses-popup"
												className="fixed left-0 right-0 flex justify-center pointer-events-none"
												style={{
													top: `${MAP_VIEW_STRATEGY_DROPDOWN_TOP_PX}px`,
													zIndex: 128,
												}}
											>
												<div
													ref={responsesPopupRef}
													data-campaign-interactive-surface
													role="dialog"
													aria-label="Responses"
													className={dashboardInitialPanelClassName}
												>
													<div className={dashboardInitialPanelContentClassName}>
														<DashboardResponsesWidget
															enabled={isLoaded && !!user}
															previewPlacement="below"
														/>
													</div>
												</div>
											</div>
										) : null}
									</>
								);

								if (typeof window !== 'undefined') {
									return createPortal(topNavContent, document.body);
								}

								return topNavContent;
							})()}

						{isCampaignWorkspaceToggleVisible && (
							<button
								type="button"
								data-campaign-workspace-toggle
								aria-label={
									isCampaignWorkspaceExpanded
										? 'Collapse campaign workspace'
										: 'Expand campaign workspace'
								}
								onClick={toggleCampaignWorkspaceExpanded}
								className="fixed flex items-center justify-center border-0 bg-transparent p-0 transition-opacity hover:opacity-70"
								style={{
									left: `var(${CAMPAIGN_MAP_BACKDROP_START_VAR}, 33.333vw)`,
									// Inside the zoomed root dvh renders at value·zoom, so above the
									// 1080p baseline (zoom 0.92) a bare 56dvh drifts toward the bottom
									// of big monitors. Cap the visual position at the baseline
									// fraction (56 · 0.92 = 51.52% of the viewport).
									top: `min(56dvh, calc(51.52dvh / var(--murmur-campaign-zoom, 0.85)))`,
									transform: 'translateY(-50%)',
									zIndex: 140,
									width: '34px',
									height: '56px',
									cursor: 'pointer',
									color: '#777777',
								}}
							>
								<svg
									width="18"
									height="34"
									viewBox="0 0 18 34"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									aria-hidden="true"
									focusable="false"
								>
									<path
										d={
											isCampaignWorkspaceExpanded ? 'M6 5L14 17L6 29' : 'M12 5L4 17L12 29'
										}
										stroke="currentColor"
										strokeWidth="1.8"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</button>
						)}

					{!isMobile && activeView === 'overview' && (
						<div
							data-campaign-interactive-surface
							data-campaign-overview-left-panel="true"
							className="fixed z-[130] pointer-events-none"
							style={{
								left: `${CAMPAIGN_MAP_SELECT_GRAB_LEFT_PX}px`,
								top: `calc(${CAMPAIGN_MAP_TOOL_VISUAL_TOP_CSS} + ${campaignMapSelectGrabOriginOffsetPx}px - ${CAMPAIGN_MAP_TOOL_VISUAL_TOP_NUDGE_UP_CSS})`,
								transform: `scale(${campaignMapSelectGrabViewScale})`,
								transformOrigin: 'top left',
							}}
						>
							<div
								data-campaign-overview-showing-pill="true"
								className="absolute left-0 pointer-events-none rounded-[5px] bg-white px-[4px] py-[1px] font-inter text-[11px] font-medium text-black"
								style={{
									top: `-${
										MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
										MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
										MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
										MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
										MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX +
										MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
										MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX +
										MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX +
										22
									}px`,
								}}
							>
								Showing
							</div>
								<MapSelectGrabTallStackBox
									className="absolute pointer-events-none"
									isSelectActive={isSelectMapToolActive}
									onAllDeselected={() => setActiveMapTool('grab')}
									onActiveCategoriesChange={handleMapGrabActiveCategoriesChange}
									style={{
										left: '-0.5px',
										top: `-${
											MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
											MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
											MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
											MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
											MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX +
											MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
											MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX +
											MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX
										}px`,
										...(isSelectMapToolActive
											? {
													backgroundColor: '#A6DCB3',
												}
											: {}),
									}}
								/>
								<MapSelectGrabStackBox
									className="absolute left-0 pointer-events-none"
									isSelectActive={isSelectMapToolActive}
									selectedContent={<StackBoxSelectStarIcon />}
									inactiveContent={
										<MapSelectGrabStackTile backgroundColor="#EFEFEF">
											<MapStackStarIcon />
										</MapSelectGrabStackTile>
									}
									style={{
										top: `-${
											MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
											MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
											MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
											MAP_SELECT_GRAB_STACK_BOX_SIZE_PX
										}px`,
									}}
								>
									<MapSelectGrabStackTile backgroundColor="#FFBDBD">
										<MapStackStarIcon />
									</MapSelectGrabStackTile>
								</MapSelectGrabStackBox>
								<MapSelectGrabStackBox
									className="absolute left-0 pointer-events-none"
									isSelectActive={isSelectMapToolActive}
									selectedContent={<StackBoxSelectBlueSparkIcon />}
									inactiveContent={
										<MapSelectGrabStackTile backgroundColor="#EFEFEF">
											<MapStackBlueSparkIcon />
										</MapSelectGrabStackTile>
									}
									onActiveChange={handleMapGrabUncategorizedActiveChange}
									style={{
										top: `-${
											MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
											MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
											MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
											MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
											MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX +
											MAP_SELECT_GRAB_STACK_BOX_SIZE_PX
										}px`,
									}}
								>
									<MapSelectGrabStackTile backgroundColor="#50A5C970">
										<MapStackBlueSparkIcon />
									</MapSelectGrabStackTile>
								</MapSelectGrabStackBox>
									<MapSelectGrabStarterBox
										className="absolute left-0 pointer-events-auto"
										zoomLevelIndex={mapZoomControlIndex}
										zoomLevelValue={mapZoomControlDisplayValue}
										zoomLevelLiveControlRef={mapZoomControlLiveRef}
										onZoomLevelIndexChange={handleMapZoomControlChange}
										onZoomLevelValueChange={handleMapZoomControlValueChange}
										onZoomLevelInteractionChange={
											handleMapZoomControlInteractionChange
										}
										style={{
											position: 'absolute',
											left: 0,
										top: `-${
											MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
											MAP_SELECT_GRAB_STARTER_BOX_GAP_PX
										}px`,
									}}
								/>
								<MapSelectGrabTool
									activeTool={activeMapTool}
									onSelectClick={handleSelectMapToolClick}
									onGrabClick={() => setActiveMapTool('grab')}
									className="pointer-events-auto"
								/>
							</div>
						)}

						{/* Header row with centered tabs and Clerk icon (from layout).
			    Desktop tabs are now rendered inside the top nav box above.
			    The h-[50px] wrapper remains for spacing and to host the mobile header below. */}
						<div data-slot="campaign-header">
							<div className="relative h-[50px] flex items-center justify-center">
								{/* Mobile header - campaign title and tabs */}
								{isMobile && (
									<div className="absolute inset-x-0 top-0 flex flex-col mt-3">
										<div
											className="pl-4 pr-20 overflow-hidden"
											style={{
												maskImage:
													'linear-gradient(to right, black 60%, transparent 95%)',
												WebkitMaskImage:
													'linear-gradient(to right, black 60%, transparent 95%)',
											}}
										>
											<h1
												className="text-[22px] font-medium text-left text-black mb-2 leading-7 whitespace-nowrap"
												style={{ fontFamily: "'Times New Roman', Times, serif" }}
											>
												{campaign?.name || 'Untitled Campaign'}
											</h1>
										</div>
										<div className="flex gap-3 justify-center mt-4">
											<button
												type="button"
												className={cn(
													'font-inter text-[13px] font-medium leading-none bg-[#F5DADA] border cursor-pointer rounded-full px-3 py-1',
													'text-[#6B6B6B] border-transparent hover:text-black hover:border-black'
												)}
												onClick={handleOpenDashboardSearchForCampaign}
											>
												Search
											</button>
											<button
												type="button"
												className={cn(
													'font-inter text-[13px] font-medium leading-none bg-[#E8EFFF] border cursor-pointer rounded-full px-3 py-1',
													activeView === 'inbox'
														? 'text-black border-black'
														: 'text-[#6B6B6B] border-transparent hover:text-black hover:border-black'
												)}
												onClick={() => setActiveView('inbox')}
											>
												Inbox
											</button>
											<button
												type="button"
												className={cn(
													'font-inter text-[13px] font-medium leading-none bg-[#FFE3AA] border cursor-pointer rounded-full px-3 py-1',
													activeView === 'drafting'
														? 'text-black border-black'
														: 'text-[#6B6B6B] border-transparent hover:text-black hover:border-black'
												)}
												onClick={() => setActiveView('drafting')}
											>
												{headerDraftCount.toString().padStart(2, '0')} Drafts
											</button>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Main content container */}
						<div data-slot="campaign-content" className="relative">
							{shouldHideContent && (
								<div
									className={cn(
										'fixed inset-0 z-40 pointer-events-none flex items-center justify-center',
										isMobile ? 'bg-white' : 'bg-background'
									)}
								>
									{cameFromSearch && !campaign.identityId && !isIdentityDialogOpen ? (
										<div className="text-center">
											<p className="font-inter text-[14px] text-[#3b3b3b]">
												Setting up your profile…
											</p>
										</div>
									) : null}
								</div>
							)}
							<div
								className={cn(
									'transition-opacity duration-200',
									shouldHideContent
										? 'opacity-0 pointer-events-none select-none'
										: 'opacity-100'
								)}
								style={{
									WebkitTransition: 'opacity 0.2s',
									transition: 'opacity 0.2s',
								}}
							>
								<IdentityDialog
									campaign={campaign}
									title="User Settings"
									open={isIdentityDialogOpen}
									onOpenChange={setIsIdentityDialogOpen}
									backButtonText={
										identityDialogOrigin === 'search'
											? 'Back to Search Results'
											: 'Back to Campaign'
									}
								/>

								{/* Campaign Header Box - shown at narrowest breakpoint (< 952px).
								    Excluded on the All tab, where the whole contacts column hides instead. */}
								{!isMobile && isNarrowestDesktop && activeView !== 'overview' && campaign && (
									<div className="campaign-narrowest-header-box flex justify-center mb-4">
										<CampaignHeaderBox
											campaignId={campaign.id}
											campaignName={campaign.name || 'Untitled Campaign'}
											toListNames={headerToListNames}
											fromName={headerFromName}
											contactsCount={headerContactsCount}
											draftCount={headerDraftCount}
											sentCount={headerSentCount}
											draftingProgress={
												draftOperationsProgress.visible
													? draftOperationsProgress.operations
													: null
											}
											onFromClick={() => {
												setIdentityDialogOrigin('campaign');
												setIsIdentityDialogOpen(true);
											}}
											onDraftsClick={() => setActiveView('drafting')}
											onSentClick={() => setActiveView('sent')}
											fullWidth
										/>
									</div>
								)}

								<div
									className={cn(
										'flex justify-center',
										!shouldApplyWritingTopShift && 'mt-6'
									)}
									style={
										shouldApplyWritingTopShift
											? { marginTop: `${writingContentTopMarginPx}px` }
											: undefined
									}
								>
									{/* Crossfade transition container */}
									<div ref={crossfadeContainerRef} className="relative w-full isolate">
										{/* Current view - always visible (avoid the "white flash" between tabs) */}
										<div
											data-campaign-view-layer="active"
											// Always interactive: the new tab accepts clicks immediately on switch. The
											// previous layer fading out above is pointer-events-none, so clicks fall through here.
											className="relative w-full"
											style={{ zIndex: 1 }}
										>
										<DraftingSection
											campaign={campaign}
											view={activeView}
											overviewRightRailSearchQuery={overviewSearchQuery}
											onClearOverviewRightRailSearch={handleClearOverviewSearchQuery}
											overviewRightRailSearchContacts={campaignMapContacts ?? []}
											overviewRightRailSearchContactsLoading={
												isCampaignMapContactsLoading
											}
											renderGlobalOverlays
											onViewReady={handleActiveViewReady}
											onDraftOperationsProgress={setDraftOperationsProgress}
												autoOpenProfileTabWhenIncomplete={cameFromSearch}
												inboxSentTabRequest={inboxSentTabRequest}
												inboxPanelTabRequest={inboxPanelTabRequest}
												onInboxSentTabChange={setInboxSentTab}
												onMapSelectionChange={setCampaignMapSelectedContactIds}
												mapMarkerSelectionRequest={mapMarkerSelectionRequest}
												goToOverview={() => setActiveView('overview')}
												goToDrafting={() => setActiveView('drafting')}
												goToWriting={() => setActiveView('testing')}
												onGoToSearch={handleOpenDashboardSearchForCampaign}
												goToInbox={() => setActiveView('inbox')}
												goToSent={() => setActiveView('sent')}
												goToSummary={() => setActiveView('summary')}
												onOpenIdentityDialog={() => {
													setIdentityDialogOrigin('campaign');
													setIsIdentityDialogOpen(true);
												}}
												goToPreviousTab={goToPreviousTab}
												goToNextTab={goToNextTab}
												hideHeaderBox={isNarrowestDesktop && !isMobile}
												isCampaignWorkspaceExpanded={isCampaignWorkspaceExpanded}
												onRequestCampaignWorkspaceExpanded={
													requestCampaignWorkspaceExpanded
												}
												inboxMockState={inboxDebugEnabled ? inboxMockState : undefined}
											/>
										</div>

										{/* Previous view — a static DOM snapshot of what was on screen,
										    fading out above the current view. top/left pin it at the
										    geometry its view was painted with while the page vars move to
										    the new view's values (left, NOT transform: a transform would
										    become the containing block for the clone's fixed children). */}
										{isTransitioning && previousView && (
											<div
												key={previousViewSnapshotId}
												ref={mountPreviousViewSnapshot}
												data-campaign-view-layer="previous"
												className="absolute w-full pointer-events-none"
												aria-hidden="true"
												style={{
													zIndex: 2,
													willChange: 'opacity',
													top: `${
														getCampaignViewContentTopMarginPx(previousView) -
														getCampaignViewContentTopMarginPx(activeView)
													}px`,
													left:
														previousViewShiftXSnapshotPx != null
															? `calc((${previousViewShiftXSnapshotPx}px - var(${CAMPAIGN_MAP_SHIFT_X_VAR}, ${previousViewShiftXSnapshotPx}px)) / ${CAMPAIGN_MAP_CONTENT_SCALE})`
															: undefined,
													...(isFadingOutPreviousView
														? {
																animation: `viewFadeOut ${TRANSITION_DURATION}ms ease-out forwards`,
															}
														: { opacity: 1 }),
												}}
											/>
										)}
									</div>
								</div>
								{/* Crossfade transition animations and mobile-specific styles */}
								<style jsx global>{`
									.campaign-persistent-map-page {
										isolation: isolate;
										background: transparent;
									}

									.campaign-map-interactive-page {
										z-index: 1;
										pointer-events: none;
									}

									.campaign-map-interactive-page [data-slot='campaign-top-tabs'],
									.campaign-map-interactive-page [data-slot='campaign-top-search-bar'],
									.campaign-map-interactive-page [data-slot='campaign-header'],
									.campaign-map-interactive-page [data-campaign-interactive-surface],
									.campaign-map-interactive-page [data-campaign-header-box],
									.campaign-map-interactive-page [data-campaign-main-box],
									.campaign-map-interactive-page [data-research-panel-container],
									.campaign-map-interactive-page [data-campaign-workspace-toggle],
									.campaign-map-interactive-page [data-campaign-bottom-anchor],
									.campaign-map-interactive-page [data-history-ledger-box],
									.campaign-map-interactive-page [data-draft-button-container],
									.campaign-map-interactive-page [data-draft-review-side-preview],
									.campaign-map-interactive-page [data-left-expanded-panel],
									.campaign-map-interactive-page [role='dialog'] {
										pointer-events: auto;
									}

									/* Opacity band behind the campaign content; pointer-events: auto so the map can't be dragged behind the panels; only the clear map area outside the band stays interactive. */
									.campaign-map-split-overlay {
										position: fixed;
										top: 0;
										bottom: 0;
										left: var(${CAMPAIGN_MAP_BACKDROP_START_VAR}, 33.333%);
										right: calc(100% - var(${CAMPAIGN_MAP_BACKDROP_END_VAR}, 100%));
										z-index: 0;
										pointer-events: auto;
										background: rgba(136, 136, 136, 0.15);
									}

									/* ≤776px scrollable mode strips the inline shift/backdrop vars; without
									   these overrides the fallbacks (33.333% band, 160px shift) misalign the
									   stacked layout. Pin the band full-width and center the content. */
									html.murmur-campaign-scrollable .campaign-map-split-overlay {
										left: 0;
										right: 0;
									}

									/* ≤776px scrollable mode: the fixed top-nav chrome sits over the top of
									   the stacked layout and covers the in-flow header box — hide it there. */
									html.murmur-campaign-scrollable .campaign-narrowest-header-box {
										display: none;
									}

									/* ≤776px scrollable mode: there is no left map strip, so the
									   "Filtering in" pill (centered over that strip) has nowhere to live.
									   Matches both the map-strip slot and the under-nav (overview) slot. */
									html.murmur-campaign-scrollable [data-slot^='campaign-top-filter-pill'] {
										display: none;
									}

									/* ≤776px scrollable mode: the fixed top-right settings gear + Clerk
									   avatar cluster (from MurmurLayoutClient) collides with the top-nav
									   backdrop — hide it. Desktop only; mobile keeps its avatar. */
									html.murmur-campaign-scrollable body:not(.murmur-mobile) .clerk-user-button {
										display: none;
									}

									html.murmur-campaign-scrollable .campaign-persistent-map-page [data-slot='campaign-top-box-wrapper'],
									html.murmur-campaign-scrollable .campaign-persistent-map-page [data-slot='campaign-header'],
									html.murmur-campaign-scrollable .campaign-persistent-map-page [data-slot='campaign-content'] {
										transform: translateX(0) scale(${CAMPAIGN_MAP_CONTENT_SCALE});
									}

									/* ≤776px scrollable mode: the fixed top-nav chrome stays pinned (bottom
									   edge ≈ 82px) while the stacked content starts at ~67px and slides
									   underneath it. Pad the content container so its first box clears the
									   chrome by the same ~27px gap the standard desktop layout uses.
									   (Padding also stops the inner mt-6 from collapsing through, and is
									   scaled by the 0.94 content scale above.) */
									html.murmur-campaign-scrollable .campaign-persistent-map-page [data-slot='campaign-content'] {
										padding-top: 40px;
									}

									.campaign-persistent-map-page [data-slot='campaign-top-box-wrapper'],
									.campaign-persistent-map-page [data-slot='campaign-header'],
									.campaign-persistent-map-page [data-slot='campaign-content'] {
										transform: translateX(
												var(
													${CAMPAIGN_MAP_SHIFT_X_VAR},
													${CAMPAIGN_MAP_FALLBACK_SHIFT_X_PX}px
												)
											)
											scale(${CAMPAIGN_MAP_CONTENT_SCALE});
										transform-origin: top center;
									}

									/* New top nav: shift right to center over the main box.
						   Uses the same shift variable as the rest of campaign content, but no
						   scale — the new nav has its own internal scale (MAP_VIEW_UI_SCALE). */
									body.murmur-campaign-persistent-map [data-slot='campaign-top-backdrop'],
									body.murmur-campaign-persistent-map [data-slot='campaign-top-outline-boxes'],
									body.murmur-campaign-persistent-map [data-slot='campaign-top-tabs'],
									body.murmur-campaign-persistent-map [data-slot='campaign-top-search-bar'],
									body.murmur-campaign-persistent-map [data-slot='campaign-top-filter-pill-nav'],
									body.murmur-campaign-persistent-map [data-slot='campaign-top-strategy-dropdown'],
									body.murmur-campaign-persistent-map [data-slot='campaign-top-campaigns-dropdown'],
									body.murmur-campaign-persistent-map [data-slot='campaign-top-opportunities-popup'] {
										transform: translateX(
											var(
												${CAMPAIGN_TOP_NAV_SHIFT_X_VAR},
												var(
													${CAMPAIGN_MAP_SHIFT_X_VAR},
													${CAMPAIGN_MAP_FALLBACK_SHIFT_X_PX}px
												)
											)
										);
									}

									/* ≤776px scrollable mode: keep the portaled top nav at its natural centered spot. */
									html.murmur-campaign-scrollable body.murmur-campaign-persistent-map [data-slot='campaign-top-backdrop'],
									html.murmur-campaign-scrollable body.murmur-campaign-persistent-map [data-slot='campaign-top-outline-boxes'],
									html.murmur-campaign-scrollable body.murmur-campaign-persistent-map [data-slot='campaign-top-tabs'],
									html.murmur-campaign-scrollable body.murmur-campaign-persistent-map [data-slot='campaign-top-search-bar'],
									html.murmur-campaign-scrollable body.murmur-campaign-persistent-map [data-slot='campaign-top-strategy-dropdown'],
									html.murmur-campaign-scrollable body.murmur-campaign-persistent-map [data-slot='campaign-top-campaigns-dropdown'],
									html.murmur-campaign-scrollable body.murmur-campaign-persistent-map [data-slot='campaign-top-opportunities-popup'] {
										transform: none;
									}

									/* View transition animation - simple tab fade */
									@keyframes viewFadeOut {
										0% {
											opacity: 1;
										}
										100% {
											opacity: 0;
										}
									}

									/* Mobile styles below */
									body.murmur-mobile [data-drafting-container] {
										display: none !important;
									}

									/* Default: hide the inline header controls (used only in landscape) */
									body.murmur-mobile .mobile-landscape-inline-controls {
										display: none !important;
									}

									/* Default: hide the centered metrics overlay (shown only in landscape) */
									body.murmur-mobile .mobile-landscape-metrics-center {
										display: none !important;
									}

									/* Mobile portrait: fix signature block height */
									@media (max-width: 480px) and (orientation: portrait) {
										/* Specific case: when Full Auto block exists, set exact 8px gap to Signature while keeping it bottom-anchored */
										body.murmur-mobile
											[data-hpi-left-panel]:has([data-block-type='full']) {
											display: grid !important;
											grid-template-rows: auto 1fr auto !important;
											row-gap: 8px !important;
										}
										body.murmur-mobile
											[data-hpi-left-panel]:has([data-block-type='full'])
											[data-hpi-footer] {
											margin-top: 0 !important; /* grid controls the 8px gap */
										}
										/* Ensure the drafting box doesn't get too small */
										body.murmur-mobile [data-hpi-container] {
											min-height: 483px !important;
										}
										/* Keep the signature footer anchored to the bottom */
										body.murmur-mobile [data-hpi-content] {
											padding-bottom: 0 !important;
										}
										body.murmur-mobile [data-hpi-content] > div {
											padding-bottom: 0 !important; /* override inner pb-3 */
										}
										/* Make the gap from Signature to the bottom of the box exactly 8px */
										body.murmur-mobile [data-hpi-footer] .mb-\[23px\],
										body.murmur-mobile [data-hpi-footer] .mb-\[9px\] {
											margin-bottom: 8px !important;
										}
										/* Anchor footer at bottom of the drafting box and layer above gradient */
										body.murmur-mobile [data-hpi-footer] {
											margin-top: auto !important; /* keep bottom-anchored */
											position: relative !important;
											z-index: 10 !important;
										}
										/* Ensure signature card and textarea are fully opaque white */
										body.murmur-mobile [data-hpi-signature-card] {
											background-color: #ffffff !important;
											position: relative !important;
											z-index: 10 !important;
										}
										body.murmur-mobile .signature-textarea {
											background-color: #ffffff !important;
										}
										body.murmur-mobile [data-hpi-signature-card] {
											min-height: 68px !important;
										}
										/* Allow the signature textarea to auto-expand on mobile portrait */
										body.murmur-mobile .signature-textarea {
											min-height: 44px !important; /* base height */
											font-size: 12px !important;
											line-height: 1.2 !important;
											padding: 2px 0 0 2px !important;
											overflow: hidden !important;
											resize: none !important;
										}
									}

									/* Mobile landscape: inline header controls, centered metrics, and title layout */
									@media (orientation: landscape) {
										/* Left-side expanded panel height cap in mobile landscape (exclude Email Structure) */
										body.murmur-mobile
											[data-left-expanded-panel]
											> div:not([aria-label='Expanded email structure']) {
											height: 273px !important;
											max-height: 273px !important;
											overflow: hidden !important;
										}
										/* Ensure inner scroll areas flex correctly within the capped height */
										body.murmur-mobile
											[data-left-expanded-panel]
											> div:not([aria-label='Expanded email structure'])
											> * {
											max-height: 100% !important;
										}
										/* Row: use a 3-column grid so title/metrics/controls never overlap */
										body.murmur-mobile .mobile-header-row {
											display: grid !important;
											grid-template-columns: 1fr auto 1fr !important; /* left flex, centered auto, right flex */
											align-items: center !important;
											gap: 6px !important;
										}
										/* Centered metrics: inline in the center grid cell */
										body.murmur-mobile .mobile-landscape-metrics-center {
											display: inline-flex !important;
											gap: 6px !important;
											position: static !important;
											left: auto !important;
											top: auto !important;
											transform: none !important;
											z-index: auto !important;
											pointer-events: auto !important;
											justify-self: center !important; /* center within middle column */
											grid-column: 2 / 3 !important;
										}
										/* Controls: right grid cell */
										body.murmur-mobile .mobile-landscape-inline-controls {
											display: inline-flex !important;
											gap: 3px; /* tighter spacing to free more room for title */
											align-items: center !important;
											position: static !important;
											left: auto !important;
											transform: none !important;
											margin-left: 0 !important;
											padding-right: 15px !important; /* increased right padding */
											justify-self: end !important;
											grid-column: 3 / 4 !important;
										}
										/* Title: flex and truncate on the left side */
										body.murmur-mobile .campaign-title-landscape {
											margin-left: -8px !important; /* nudge farther left in landscape */
											padding-left: 15px !important; /* increased left padding */
											max-width: none;
											overflow: hidden;
											white-space: nowrap;
											text-overflow: ellipsis;
											flex: 1 1 auto; /* allow the title to use remaining row space */
											min-width: 0; /* enable proper truncation inside flex layouts */
										}
										/* smaller title text only in mobile landscape and enforce truncation */
										body.murmur-mobile .campaign-title-landscape * {
											font-size: 15px !important;
											line-height: 1 !important;
											text-align: left !important; /* show more of the beginning */
											max-width: 100% !important;
											width: 100% !important; /* override inner w-fit to enable truncation */
											overflow: hidden !important;
											white-space: nowrap !important;
											text-overflow: ellipsis !important;
										}

										/* Shrink metric boxes a bit to free width for the title */
										body.murmur-mobile .mobile-landscape-inline-controls .metric-box {
											width: 70px !important;
											font-size: 10.5px !important;
											padding-left: 6px !important;
											padding-right: 6px !important;
										}
										/* Make To/From pills slightly narrower */
										body.murmur-mobile .mobile-landscape-inline-controls .pill-mini {
											width: 32px !important;
											height: 14px !important;
											border-radius: 5px !important;
										}
										body.murmur-mobile .mobile-landscape-inline-controls .pill-mini span {
											font-size: 9px !important;
										}
										/* Tighten spacing before the inline view tabs in landscape */
										body.murmur-mobile .mobile-landscape-inline-controls .ml-2 {
											margin-left: 4px !important;
										}
										/* Slightly smaller view-tab labels to prioritize title width */
										body.murmur-mobile .mobile-landscape-inline-controls button {
											font-size: 14px !important;
										}

										/* Make the preview panel mimic portrait style by hiding its outer chrome */
										body.murmur-mobile [data-drafting-preview-panel] {
											background: transparent !important;
											border: 0 !important;
											scale: 1 !important;
											border-radius: 0 !important;
										}
										body.murmur-mobile [data-drafting-preview-header] {
											display: none !important;
										}

										/* Mobile landscape: make Test Preview match main drafting box dimensions */
										body.murmur-mobile [data-test-preview-wrapper] {
											width: 96.27vw !important; /* same as main drafting box */
										}
										body.murmur-mobile
											[data-test-preview-wrapper]
											[data-test-preview-panel] {
											width: 100% !important; /* fill wrapper */
											height: 644px !important; /* keep same inner height used in portrait */
										}
										/* Show sticky Back to Testing / Go to Drafting footer in landscape on mobile */
										body.murmur-mobile
											[data-test-preview-wrapper]
											.mobile-landscape-sticky-preview-footer {
											display: block !important;
										}
									}

									/* At 667px landscape, adjust spacing for less cramped layout */
									@media (max-width: 667px) and (orientation: landscape) {
										body.murmur-mobile .campaign-title-landscape {
											margin-left: -20px;
										}
										/* Home button on the right - push it out slightly */
										body.murmur-mobile button[title='Home'] {
											margin-right: -4px;
										}
									}

									@media (orientation: landscape) {
										/* Hide portrait container and bottom tabs while in landscape */
										body.murmur-mobile [data-slot='mobile-header-controls'] {
											display: none !important;
										}
										body.murmur-mobile .mobile-landscape-hide {
											display: none !important;
										}
										/* Mobile landscape: shrink the Hybrid Prompt Input to its minimal functional height */
										body.murmur-mobile [data-hpi-container] {
											min-height: unset !important;
											margin-bottom: 6px !important;
										}
										body.murmur-mobile [data-hpi-left-panel] {
											padding-top: 6px !important;
											padding-bottom: 6px !important;
										}
										body.murmur-mobile [data-hpi-content] {
											padding-top: 6px !important;
											padding-bottom: 0 !important;
											gap: 8px !important;
										}
										/* Mobile landscape: enforce exact 8px gap from subject bar to first block */
										body.murmur-mobile
											[data-hpi-left-panel]
											[data-slot='form-item']:first-of-type {
											margin-bottom: 0 !important;
										}
										/* Remove container top padding and set inner wrapper top padding to 8px */
										body.murmur-mobile [data-hpi-content] {
											padding-top: 0 !important;
											gap: 6px !important; /* keep tighter inter-block spacing */
										}
										body.murmur-mobile [data-hpi-content] > div {
											padding-top: 8px !important; /* overrides pt-[16px]/pt-[8px] utility classes */
										}
										/* Subject bar: minimal but legible */
										body.murmur-mobile .subject-bar {
											height: 24px !important;
											min-height: 24px !important;
											max-height: 24px !important;
										}
										/* iPhone landscape: prevent overlap by slightly reducing label size and spacing toggle */
										body.murmur-mobile .subject-bar .subject-label {
											font-size: 15px !important;
										}
										body.murmur-mobile .subject-bar .subject-toggle {
											margin-right: 4px !important;
										}
										/* Full Auto textarea: reduce height and hide example for space */
										body.murmur-mobile .full-auto-textarea {
											height: 90px !important;
											min-height: 90px !important;
										}
										body.murmur-mobile .full-auto-placeholder-example {
											display: none !important;
										}
										/* Mini Email Structure: make Full Auto much shorter in mobile landscape */
										body.murmur-mobile
											[aria-label='Expanded email structure']
											.mini-full-auto-textarea {
											height: 48px !important;
											min-height: 48px !important;
										}
										/* Reduce extra whitespace under the paragraph slider in the mini card */
										body.murmur-mobile
											[aria-label='Expanded email structure']
											.mini-paragraph-slider {
											margin-bottom: 0 !important;
											padding-bottom: 0 !important;
										}
										body.murmur-mobile
											[aria-label='Expanded email structure']
											.mini-full-auto-card {
											padding-bottom: 6px !important; /* tighten bottom padding of the card */
										}
										body.murmur-mobile
											[aria-label='Expanded email structure']
											.mini-full-auto-placeholder {
											display: block !important;
											font-size: 9px !important;
											line-height: 1.15 !important;
											padding: 4px 6px 2px 0 !important;
											color: #505050 !important;
											overflow: hidden !important;
										}
										/* Show full guidance text (both lines) but keep smaller sizing */
										/* Signature area: single-line compact */
										body.murmur-mobile [data-hpi-footer] {
											margin-top: 2px !important;
										}
										/* Reduce space between last block and signature */
										body.murmur-mobile [data-hpi-content] [data-block-type]:last-of-type {
											margin-bottom: 2px !important;
										}
										body.murmur-mobile [data-hpi-signature-card] {
											min-height: 42px !important;
											padding-top: 4px !important;
											padding-bottom: 4px !important;
											display: flex !important;
											align-items: center !important;
											gap: 8px !important;
										}
										body.murmur-mobile
											[data-hpi-signature-card]
											[data-slot='form-label'] {
											margin: 0 8px 0 0 !important;
											white-space: nowrap !important;
										}
										body.murmur-mobile .signature-textarea {
											height: 30px !important;
											min-height: 30px !important;
											max-height: 30px !important;
											overflow: hidden !important;
											resize: none !important;
											flex: 1 1 auto !important;
											min-width: 0 !important;
											font-size: 12px !important; /* match the 'Signature' header size on mobile */
											line-height: 1.2 !important;
											padding: 2px 0 0 2px !important;
										}
										/* Blocks: tighten vertical chrome */
										body.murmur-mobile [data-block-type] {
											margin-top: 6px !important;
											margin-bottom: 6px !important;
										}
										body.murmur-mobile [data-block-type='text'] {
											min-height: 44px !important;
										}
										body.murmur-mobile [data-drag-handle] {
											height: 24px !important;
										}
										/* Show sticky Test; hide in-box Test */
										body.murmur-mobile .mobile-sticky-test-button {
											display: block !important;
										}
										body.murmur-mobile .w-full > .flex.justify-center.mb-4.w-full {
											display: none !important;
										}
										/* Exact 8px gap between last content block and Signature; keep Signature bottom-anchored */
										body.murmur-mobile [data-hpi-container] {
											display: grid !important;
											grid-template-rows: 1fr auto !important; /* content fills, footer at bottom */
											align-items: stretch !important;
											row-gap: 8px !important; /* exact gap above signature */
										}
										/* Remove extra bottom spacing inside the content area so the gap is truly 8px */
										body.murmur-mobile [data-hpi-left-panel] {
											padding-bottom: 0 !important;
										}
										body.murmur-mobile [data-hpi-content] {
											padding-bottom: 0 !important;
										}
										body.murmur-mobile [data-hpi-content] > div {
											padding-bottom: 0 !important; /* override inner pb-3 */
										}
										body.murmur-mobile [data-hpi-content] [data-block-type]:last-of-type {
											margin-bottom: 0 !important; /* account for any margins on the last block */
										}
										/* Rely on grid spacing; do not add margin on footer */
										body.murmur-mobile [data-hpi-footer] {
											margin-top: 0 !important; /* override mt-auto/margin rules */
										}
										/* Ensure exactly 8px between the bottom of Signature and the bottom of the box */
										body.murmur-mobile [data-hpi-footer] {
											padding-bottom: 8px !important;
										}
										/* Remove extra bottom margin from the Signature FormItem wrapper */
										body.murmur-mobile [data-hpi-footer] .mb-\[23px\],
										body.murmur-mobile [data-hpi-footer] .mb-\[9px\] {
											margin-bottom: 0 !important;
										}
										/* Hide any in-box footer content below Signature in landscape (Test/error), relying on sticky Test */
										body.murmur-mobile [data-hpi-footer] > .w-full {
											display: none !important;
										}
									}

									/* Previously we drew only a bottom divider. Replace with a full header box in landscape. */
									@media (orientation: landscape) {
										/* Full-width box around header */
										body.murmur-mobile [data-slot='campaign-header'] {
											border: 2px solid #000000 !important;
											box-sizing: border-box !important;
										}
										/* Remove old bottom divider and any gap so header box touches content */
										body.murmur-mobile [data-slot='campaign-content'] {
											border-top: 0 !important;
											margin-top: 0 !important;
										}
									}
								`}</style>
							</div>
						</div>

						{inboxDebugEnabled && (
							<CampaignInboxDebugPanel
								value={inboxMockState}
								onChange={setInboxMockState}
							/>
						)}
					</div>
				</CampaignTopSearchHighlightProvider>
			</HoverDescriptionProvider>
		</CampaignDeviceProvider>
	);
};

export default Murmur;
