'use client';

// Force server-rendering (no static path generation) to avoid Clerk chunk build errors
export const dynamic = 'force-dynamic';

import { useCampaignDetail } from './useCampaignDetail';
import type {
	DraftingSectionView,
	InboxSentTab,
	InboxSentTabRequest,
} from './DraftingSection/useDraftingSection';
import { useSearchParams } from 'next/navigation';
import { urls } from '@/constants/urls';
import { cn } from '@/utils';
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
import LeftArrow from '@/components/atoms/_svg/LeftArrow';
import RightArrow from '@/components/atoms/_svg/RightArrow';
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
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { useCreateIdentity, useGetIdentities } from '@/hooks/queryHooks/useIdentities';
import { EmailStatus } from '@/constants/prismaEnums';
import { useQueryClient } from '@tanstack/react-query';
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

type ViewType = Exclude<DraftingSectionView, 'search'>;
type CampaignUrlTab = 'write' | 'all' | 'inbox' | 'sent' | 'drafts';

type CampaignOverviewBottomBoxesProps = {
	contactsCount: number;
	draftCount: number;
	inboxCount: number;
	sentCount: number;
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
};

const CampaignOverviewAskAnythingBox = ({
	onSubmit,
	value,
	leftOverride,
	bottomOverride,
}: CampaignOverviewAskAnythingBoxProps) => {
	const [query, setQuery] = useState(value ?? '');
	const inputRef = useRef<HTMLInputElement | null>(null);
	const submitQuery = () => onSubmit(query);

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
			style={{
				...boxStyle,
				opacity,
				background: '#F3EEE1',
			}}
		/>
	);

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed left-0 right-0 flex justify-center"
			style={{ bottom: CAMPAIGN_OVERVIEW_BOTTOM_BOXES_BOTTOM_PX, zIndex: 125 }}
		>
			<div className="flex" style={{ gap: 3 }}>
				{inactiveBox('left-1', 0.1)}
				{inactiveBox('left-2', 0.2)}
				<div style={{ ...boxStyle, background: '#FFFFFF' }}>
					<SearchIconDesktop width={17} height={18} stroke="#8B8B8B" strokeWidth={2.3} />
				</div>
				<div style={{ ...boxStyle, ...countStyle, background: '#EB8586' }}>
					{contactsCount}
				</div>
				<div style={{ ...boxStyle, ...countStyle, background: '#FFE3AA' }}>
					{draftCount}
				</div>
				<div style={{ ...boxStyle, ...countStyle, background: '#6EBED5' }}>
					{inboxCount}
				</div>
				<div style={{ ...boxStyle, ...countStyle, background: '#5AB478' }}>
					{sentCount}
				</div>
				<div style={{ ...boxStyle, background: '#EFD7D3' }}>
					<DashboardActionBarStarIcon width={15} height={15} style={{ color: '#E32222' }} />
				</div>
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
		case 'write':
		case 'testing':
		case 'contacts':
		case 'search':
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
const TRANSITION_DURATION = 180;
// Safety valve: if a destination view is unusually slow to paint, don't block the transition forever.
const MAX_TRANSITION_WAIT_MS = 650;

const CAMPAIGN_MAP_SHIFT_X_VAR = '--murmur-campaign-map-shift-x';
const CAMPAIGN_TOP_NAV_SHIFT_X_VAR = '--murmur-campaign-top-nav-shift-x';
const CAMPAIGN_MAP_BACKDROP_START_VAR = '--murmur-campaign-map-backdrop-start';
const CAMPAIGN_MAP_BACKDROP_END_VAR = '--murmur-campaign-map-backdrop-end';
const CAMPAIGN_MAP_CONTENT_SCALE = 0.94;
const CAMPAIGN_MAP_FALLBACK_SHIFT_X_PX = 160;
const CAMPAIGN_MAP_MIN_SHIFT_X_PX = 88;
const CAMPAIGN_MAP_MAX_SHIFT_X_PX = 900;
const CAMPAIGN_STANDARD_RESEARCH_RIGHT_FROM_CENTER_PX = 657;
const CAMPAIGN_STANDARD_LEFT_PANEL_LEFT_FROM_CENTER_PX = -657;
const CAMPAIGN_RESEARCH_RIGHT_GAP_PX = 52;
const CAMPAIGN_BACKDROP_CONTENT_GUTTER_PX = 52;
const CAMPAIGN_BACKDROP_TARGET_START_RATIO = 1 / 3;
const CAMPAIGN_COMPACT_WORKSPACE_BACKDROP_WIDTH_PX = 985;
const CAMPAIGN_COMPACT_WORKSPACE_LEFT_PANEL_INSET_PX = 52;
const CAMPAIGN_COMPACT_WORKSPACE_TOP_NAV_INSET_PX = 184;
const CAMPAIGN_COMPACT_WORKSPACE_MAIN_PANEL_HALF_WIDTH_PX = 250;
const CAMPAIGN_COMPACT_WORKSPACE_CONTACT_PANEL_WIDTH_PX = 377;
const CAMPAIGN_COMPACT_WORKSPACE_MAIN_PANEL_GAP_PX = 34;
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

// Match dashboard map-view scaling so the left-side map tools look identical.
// See: src/app/murmur/dashboard/page.tsx (mapSelectGrabViewScale)
const CAMPAIGN_MAP_SELECT_GRAB_MIN_VIEW_SCALE = 0.8;
const CAMPAIGN_MAP_SELECT_GRAB_DEFAULT_VIEW_SCALE = 0.84;
const CAMPAIGN_MAP_SELECT_GRAB_MAX_VIEW_SCALE = 0.95;
const CAMPAIGN_MAP_SELECT_GRAB_SCALE_GROW_START_HEIGHT_PX = 1180;
const CAMPAIGN_MAP_SELECT_GRAB_SCALE_GROW_END_HEIGHT_PX = 1480;
const CAMPAIGN_MAP_SELECT_GRAB_VIEWPORT_INSET_PX = 16;
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
const CAMPAIGN_MAP_TOOL_VISUAL_TOP_PX = 106;
const CAMPAIGN_MAP_TOOL_VISUAL_TOP_CSS = `calc(${CAMPAIGN_MAP_TOOL_VISUAL_TOP_PX}px / var(--murmur-campaign-zoom, 0.85))`;
const CAMPAIGN_MAP_TOOL_VISUAL_TOP_NUDGE_UP_CSS = `calc(4px / var(--murmur-campaign-zoom, 0.85))`;
const CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS = [
	// Match dashboard map-view zoom calibration.
	2.25, 2.41, 2.57, 2.73, 2.88, 3.04, 3.2, 3.52, 3.83, 4.15, 4.47, 4.78, 5.1, 5.34, 5.58,
	5.81, 6.05, 6.29, 6.52, 6.76, 7,
] as const;
const CAMPAIGN_MAP_ZOOM_CONTROL_MAX_INDEX = CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS.length - 1;

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

const clampCampaignMapZoomControlValue = (levelValue: number) => {
	if (!Number.isFinite(levelValue)) return 0;
	return Math.min(Math.max(levelValue, 0), CAMPAIGN_MAP_ZOOM_CONTROL_MAX_INDEX);
};

const getCampaignMapZoomForControlValue = (levelValue: number) => {
	const safeValue = clampCampaignMapZoomControlValue(levelValue);
	const lowerIndex = Math.floor(safeValue);
	const upperIndex = Math.min(lowerIndex + 1, CAMPAIGN_MAP_ZOOM_CONTROL_MAX_INDEX);
	const progress = safeValue - lowerIndex;
	const lowerZoom =
		CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS[lowerIndex] ?? CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS[0];
	const upperZoom = CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS[upperIndex] ?? lowerZoom;
	return lowerZoom + (upperZoom - lowerZoom) * progress;
};

const getCampaignMapZoomControlValueForZoom = (zoom: number) => {
	if (!Number.isFinite(zoom)) return 0;
	const minZoom = CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS[0] ?? 0;
	const maxZoom =
		CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS[CAMPAIGN_MAP_ZOOM_CONTROL_MAX_INDEX] ?? minZoom;
	if (zoom <= minZoom) return 0;
	if (zoom >= maxZoom) return CAMPAIGN_MAP_ZOOM_CONTROL_MAX_INDEX;

	for (let index = 0; index < CAMPAIGN_MAP_ZOOM_CONTROL_MAX_INDEX; index += 1) {
		const lowerZoom = CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS[index] ?? minZoom;
		const upperZoom = CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS[index + 1] ?? lowerZoom;
		if (zoom <= upperZoom) {
			const span = upperZoom - lowerZoom;
			if (span <= 0) return index;
			return index + (zoom - lowerZoom) / span;
		}
	}

	return CAMPAIGN_MAP_ZOOM_CONTROL_MAX_INDEX;
};

const SIXTEEN_BY_TEN_ZOOM_MATCH_TOLERANCE_PX = 50;

// 16:10 resolution-specific zoom levels: [width, height] → zoom
const SIXTEEN_BY_TEN_ZOOM_MAP: Array<{ w: number; h: number; zoom: number }> = [
	{ w: 1152, h: 720, zoom: 0.52 },
	{ w: 1280, h: 800, zoom: 0.6 },
	{ w: 1440, h: 900, zoom: 0.7 },
	{ w: 1504, h: 940, zoom: 0.84 }, // 14" MacBook Pro (slightly more zoomed-in)
	{ w: 1664, h: 1040, zoom: 0.77 },
	{ w: 1920, h: 1200, zoom: 0.95 },
	{ w: 2048, h: 1280, zoom: 0.95 },
	{ w: 2304, h: 1440, zoom: 1.1 },
	{ w: 2592, h: 1620, zoom: 1.2 },
	{ w: 2880, h: 1800, zoom: 1.2 },
	{ w: 2976, h: 1860, zoom: 1.45 },
	{ w: 4608, h: 2880, zoom: 1.6 },
];

// Fallback zoom for 16:10-ish resolutions that don't match any tuned point
const SIXTEEN_BY_TEN_FALLBACK_ZOOM = 0.8;

type SixteenByTenZoomPoint = { w: number; h: number; zoom: number; metric: number };

// Precompute a size metric (diagonal length) so we can smoothly interpolate between tuned points.
const SIXTEEN_BY_TEN_ZOOM_POINTS: SixteenByTenZoomPoint[] = SIXTEEN_BY_TEN_ZOOM_MAP.map(
	(entry) => ({ ...entry, metric: Math.hypot(entry.w, entry.h) })
).sort((a, b) => a.metric - b.metric);

// 16:9 resolution-specific zoom levels: [width, height] → zoom
const SIXTEEN_BY_NINE_ZOOM_MAP: Array<{ w: number; h: number; zoom: number }> = [
	{ w: 1280, h: 720, zoom: 0.52 },
	{ w: 1344, h: 756, zoom: 0.55 },
	{ w: 1600, h: 900, zoom: 0.68 },
	{ w: 1920, h: 1080, zoom: 0.83 },
];

// Fallback zoom for 16:9 resolutions that don't match any tuned point
const SIXTEEN_BY_NINE_FALLBACK_ZOOM = 0.85;

type SixteenByNineZoomPoint = { w: number; h: number; zoom: number; metric: number };

// Precompute a size metric (diagonal length) so we can smoothly interpolate between tuned points.
const SIXTEEN_BY_NINE_ZOOM_POINTS: SixteenByNineZoomPoint[] =
	SIXTEEN_BY_NINE_ZOOM_MAP.map((entry) => ({
		...entry,
		metric: Math.hypot(entry.w, entry.h),
	})).sort((a, b) => a.metric - b.metric);

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
const DashboardCampaignsInboxView = nextDynamic(
	() => import('@/components/molecules/CampaignsInboxView/CampaignsInboxView'),
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
					backgroundColor: '#4ca9db',
				}}
				aria-busy="true"
				aria-label="Loading campaigns"
			>
				<span className="sr-only">Loading campaigns…</span>

				{/* Search Bar skeleton */}
				<div
					className="animate-pulse"
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

				{/* Messages/Campaigns toggle skeleton (Campaigns selected) */}
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
						zIndex: 10,
						display: 'flex',
						pointerEvents: 'none',
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
					<div
						style={{
							flex: 1,
							height: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							backgroundColor: '#4DA6D7',
						}}
					>
						<span
							style={{
								fontFamily: 'Inter, sans-serif',
								fontSize: '15px',
								fontWeight: 500,
								color: '#000000',
								opacity: 0.55,
								userSelect: 'none',
							}}
						>
							Messages
						</span>
					</div>
					<div
						style={{
							flex: 1,
							height: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							backgroundColor: '#B3E5FF',
						}}
					>
						<span
							style={{
								fontFamily: 'Inter, sans-serif',
								fontSize: '15px',
								fontWeight: 500,
								color: '#000000',
								opacity: 0.65,
								userSelect: 'none',
							}}
						>
							Campaigns
						</span>
					</div>
				</div>

				{/* Campaign row skeletons (campaign page inbox pill variant) */}
				<div className="w-full flex flex-col items-center">
					{Array.from({ length: 5 }).map((_, idx) => (
						<div
							key={`dashboard-campaigns-loading-${idx}`}
							className="select-none mb-2 w-full overflow-hidden"
							style={{
								height: '66px',
								minHeight: '66px',
								border: '3px solid #000000',
								borderRadius: '10px',
								backgroundColor: '#EAEAEA',
								display: 'flex',
								alignItems: 'flex-start',
								padding: '10px 16px',
							}}
							aria-hidden
						>
							<div className="flex flex-col w-full gap-2 animate-pulse">
								{/* Campaign name */}
								<div className="h-[16px] bg-black/20 rounded w-[60%]" />
								{/* Pills row */}
								<div className="flex items-center gap-3 w-full">
									<div className="h-[15px] w-[121px] rounded-[7px] bg-black/10 border border-black/25" />
									{Array.from({ length: 4 }).map((__, metricIdx) => (
										<div
											key={`dashboard-campaigns-loading-pill-${idx}-${metricIdx}`}
											className="h-[20px] w-[92px] rounded-[6px] bg-black/10 border border-black/25"
										/>
									))}
								</div>
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
	const { campaign, isPendingCampaign, setIsIdentityDialogOpen, isIdentityDialogOpen } =
		useCampaignDetail();
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
		const availableHeight =
			viewportHeight > 0
				? viewportHeight - CAMPAIGN_MAP_SELECT_GRAB_VIEWPORT_INSET_PX * 2
				: CAMPAIGN_MAP_SELECT_GRAB_TOTAL_HEIGHT_PX *
					CAMPAIGN_MAP_SELECT_GRAB_DEFAULT_VIEW_SCALE;
		const fitScale = availableHeight / CAMPAIGN_MAP_SELECT_GRAB_TOTAL_HEIGHT_PX;
		const tallViewportProgress = clampNumber(
			(viewportHeight - CAMPAIGN_MAP_SELECT_GRAB_SCALE_GROW_START_HEIGHT_PX) /
				(CAMPAIGN_MAP_SELECT_GRAB_SCALE_GROW_END_HEIGHT_PX -
					CAMPAIGN_MAP_SELECT_GRAB_SCALE_GROW_START_HEIGHT_PX),
			0,
			1
		);
		const preferredScale =
			CAMPAIGN_MAP_SELECT_GRAB_DEFAULT_VIEW_SCALE +
			(CAMPAIGN_MAP_SELECT_GRAB_MAX_VIEW_SCALE -
				CAMPAIGN_MAP_SELECT_GRAB_DEFAULT_VIEW_SCALE) *
				tallViewportProgress;
		return clampNumber(
			Math.min(fitScale, preferredScale),
			CAMPAIGN_MAP_SELECT_GRAB_MIN_VIEW_SCALE,
			CAMPAIGN_MAP_SELECT_GRAB_MAX_VIEW_SCALE
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
			html.style.removeProperty(CAMPAIGN_MAP_SHIFT_X_VAR);
			html.style.removeProperty(CAMPAIGN_TOP_NAV_SHIFT_X_VAR);
			html.style.removeProperty(CAMPAIGN_MAP_BACKDROP_START_VAR);
			html.style.removeProperty(CAMPAIGN_MAP_BACKDROP_END_VAR);
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
			html.style.removeProperty(CAMPAIGN_MAP_SHIFT_X_VAR);
			html.style.removeProperty(CAMPAIGN_TOP_NAV_SHIFT_X_VAR);
			html.style.removeProperty(CAMPAIGN_MAP_BACKDROP_START_VAR);
			html.style.removeProperty(CAMPAIGN_MAP_BACKDROP_END_VAR);
			return;
		}

		// NOTE: We intentionally avoid `window.visualViewport` here.
		// Safari can fire `visualViewport.resize` (and report different viewport sizes) when we apply
		// CSS `zoom` to the root element, which can create a feedback loop that progressively shrinks
		// the campaign UI on first load. `innerWidth/innerHeight` reflect the stable layout viewport
		// we want for resolution mapping + snug-fit clamping.
		const viewportH = window.innerHeight;
		const viewportW = window.innerWidth;
		if (viewportH <= 0 || viewportW <= 0) return;

		const ratio = viewportW / viewportH;
		const IDEAL_16X10 = 16 / 10; // 1.6
		const IDEAL_16X9 = 16 / 9; // ~1.777
		const viewportDelta16x10 = Math.abs(ratio - IDEAL_16X10);
		const viewportDelta16x9 = Math.abs(ratio - IDEAL_16X9);
		const screenW = window.screen?.availWidth ?? window.screen?.width ?? viewportW;
		const screenH = window.screen?.availHeight ?? window.screen?.height ?? viewportH;
		const screenRatio = screenW > 0 && screenH > 0 ? screenW / screenH : ratio;
		const screenDelta16x10 = Math.abs(screenRatio - IDEAL_16X10);
		const screenDelta16x9 = Math.abs(screenRatio - IDEAL_16X9);
		const isSixteenByTenish = viewportDelta16x10 <= 0.14 || screenDelta16x10 <= 0.14;
		const isSixteenByNineish = viewportDelta16x9 <= 0.08 || screenDelta16x9 <= 0.08;

		let targetZoom = DEFAULT_CAMPAIGN_ZOOM;

		if (isSixteenByTenish) {
			// Check both screen dimensions AND viewport dimensions.
			// Screen dims work for real monitors; viewport dims work for dev tools simulation.
			const screenW = window.screen?.width;
			const screenH = window.screen?.height;
			const matchScreenW = screenW ?? viewportW;
			const matchScreenH = screenH ?? viewportH;

			const findNearMatch = (w: number, h: number) =>
				SIXTEEN_BY_TEN_ZOOM_MAP.find(
					(entry) =>
						Math.abs(w - entry.w) <= SIXTEEN_BY_TEN_ZOOM_MATCH_TOLERANCE_PX &&
						Math.abs(h - entry.h) <= SIXTEEN_BY_TEN_ZOOM_MATCH_TOLERANCE_PX
				);

			const interpolateZoom = (w: number, h: number) => {
				const metric = Math.hypot(w, h);
				if (
					!Number.isFinite(metric) ||
					metric <= 0 ||
					SIXTEEN_BY_TEN_ZOOM_POINTS.length === 0
				) {
					return SIXTEEN_BY_TEN_FALLBACK_ZOOM;
				}

				const first = SIXTEEN_BY_TEN_ZOOM_POINTS[0];
				const last = SIXTEEN_BY_TEN_ZOOM_POINTS[SIXTEEN_BY_TEN_ZOOM_POINTS.length - 1];
				if (metric <= first.metric) return first.zoom;
				if (metric >= last.metric) return last.zoom;

				for (let i = 0; i < SIXTEEN_BY_TEN_ZOOM_POINTS.length - 1; i++) {
					const a = SIXTEEN_BY_TEN_ZOOM_POINTS[i];
					const b = SIXTEEN_BY_TEN_ZOOM_POINTS[i + 1];
					if (metric < a.metric || metric > b.metric) continue;

					const denom = b.metric - a.metric;
					const t = denom > 0 ? (metric - a.metric) / denom : 0;
					return a.zoom + (b.zoom - a.zoom) * t;
				}

				return SIXTEEN_BY_TEN_FALLBACK_ZOOM;
			};

			const distanceToMap = (w: number, h: number) => {
				let best = Number.POSITIVE_INFINITY;
				for (const entry of SIXTEEN_BY_TEN_ZOOM_POINTS) {
					best = Math.min(best, Math.hypot(w - entry.w, h - entry.h));
				}
				return best;
			};

			// Prefer a tuned near-match when possible (screen first, then viewport).
			const screenNearMatch = findNearMatch(matchScreenW, matchScreenH);
			if (screenNearMatch) {
				targetZoom = screenNearMatch.zoom;
			} else {
				const viewportNearMatch = findNearMatch(viewportW, viewportH);
				if (viewportNearMatch) {
					targetZoom = viewportNearMatch.zoom;
				} else {
					// Otherwise interpolate smoothly between the two nearest tuned points.
					// Choose whichever dimensions are "closer" to our tuned resolution set.
					const screenDistance = distanceToMap(matchScreenW, matchScreenH);
					const viewportDistance = distanceToMap(viewportW, viewportH);
					const useViewportDims = viewportDistance + 0.5 < screenDistance; // bias ties toward screen dims
					const w = useViewportDims ? viewportW : matchScreenW;
					const h = useViewportDims ? viewportH : matchScreenH;
					targetZoom = interpolateZoom(w, h);
				}
			}
		} else if (isSixteenByNineish) {
			// 16:9 monitor handling
			const screenW = window.screen?.width;
			const screenH = window.screen?.height;
			const matchScreenW = screenW ?? viewportW;
			const matchScreenH = screenH ?? viewportH;

			const findNearMatch = (w: number, h: number) =>
				SIXTEEN_BY_NINE_ZOOM_MAP.find(
					(entry) =>
						Math.abs(w - entry.w) <= SIXTEEN_BY_TEN_ZOOM_MATCH_TOLERANCE_PX &&
						Math.abs(h - entry.h) <= SIXTEEN_BY_TEN_ZOOM_MATCH_TOLERANCE_PX
				);

			const interpolateZoom = (w: number, h: number) => {
				const metric = Math.hypot(w, h);
				if (
					!Number.isFinite(metric) ||
					metric <= 0 ||
					SIXTEEN_BY_NINE_ZOOM_POINTS.length === 0
				) {
					return SIXTEEN_BY_NINE_FALLBACK_ZOOM;
				}

				const first = SIXTEEN_BY_NINE_ZOOM_POINTS[0];
				const last = SIXTEEN_BY_NINE_ZOOM_POINTS[SIXTEEN_BY_NINE_ZOOM_POINTS.length - 1];
				if (metric <= first.metric) return first.zoom;
				if (metric >= last.metric) return last.zoom;

				for (let i = 0; i < SIXTEEN_BY_NINE_ZOOM_POINTS.length - 1; i++) {
					const a = SIXTEEN_BY_NINE_ZOOM_POINTS[i];
					const b = SIXTEEN_BY_NINE_ZOOM_POINTS[i + 1];
					if (metric < a.metric || metric > b.metric) continue;

					const denom = b.metric - a.metric;
					const t = denom > 0 ? (metric - a.metric) / denom : 0;
					return a.zoom + (b.zoom - a.zoom) * t;
				}

				return SIXTEEN_BY_NINE_FALLBACK_ZOOM;
			};

			const distanceToMap = (w: number, h: number) => {
				let best = Number.POSITIVE_INFINITY;
				for (const entry of SIXTEEN_BY_NINE_ZOOM_POINTS) {
					best = Math.min(best, Math.hypot(w - entry.w, h - entry.h));
				}
				return best;
			};

			// Prefer a tuned near-match when possible (screen first, then viewport).
			const screenNearMatch = findNearMatch(matchScreenW, matchScreenH);
			if (screenNearMatch) {
				targetZoom = screenNearMatch.zoom;
			} else {
				const viewportNearMatch = findNearMatch(viewportW, viewportH);
				if (viewportNearMatch) {
					targetZoom = viewportNearMatch.zoom;
				} else {
					// Otherwise interpolate smoothly between the two nearest tuned points.
					const screenDistance = distanceToMap(matchScreenW, matchScreenH);
					const viewportDistance = distanceToMap(viewportW, viewportH);
					const useViewportDims = viewportDistance + 0.5 < screenDistance;
					const w = useViewportDims ? viewportW : matchScreenW;
					const h = useViewportDims ? viewportH : matchScreenH;
					targetZoom = interpolateZoom(w, h);
				}
			}
		}

		// --- Dock / windowed zoom overrides ---
		// Keep these rules narrow + ordered so they’re easy to reason about and don’t accidentally
		// affect unrelated resolutions. These apply after the general resolution map.
		const clampZoom = (z: number, min = -Infinity, max = Infinity) =>
			Math.min(max, Math.max(min, z));
		const appliedDockRules: string[] = [];
		type DockZoomRule = { id: string; when: boolean; min?: number; max?: number };
		const dockZoomRules: DockZoomRule[] = [
			{
				// Wide-but-short windows (often due to macOS Dock / non-maximized browser windows)
				// can feel too zoomed out; prefer allowing scroll instead of shrinking indefinitely.
				id: 'short-viewport-min',
				when: viewportW >= 1400 && viewportH <= 780,
				min: 0.7,
			},
			{
				// ~1952x1220 with Dock: 1920x1200 tuned zoom feels a hair too large.
				id: 'dock-1952x1220-max',
				when:
					viewportW >= 1900 &&
					viewportW <= 2050 &&
					viewportH >= 1180 &&
					viewportH <= 1245,
				max: 0.93,
			},
			{
				// ~2144x1340 with Dock: custom preference bump.
				id: 'dock-2144x1340-min',
				when:
					viewportW >= 2100 &&
					viewportW <= 2200 &&
					viewportH >= 1320 &&
					viewportH <= 1380,
				min: 1.2,
			},
		];
		for (const rule of dockZoomRules) {
			if (!rule.when) continue;
			const next = clampZoom(targetZoom, rule.min, rule.max);
			if (Math.abs(next - targetZoom) > 1e-6) {
				targetZoom = next;
				appliedDockRules.push(rule.id);
			}
		}
		// Guardrails: keep zoom within sane bounds (prevents accidental extreme values).
		targetZoom = clampZoom(targetZoom, 0.5, 1.6);

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
				const SAFE_BOTTOM_MARGIN_PX = 22;
				const ABSOLUTE_MIN_DOCK_CLAMP_ZOOM = 0.5;
				const ABSOLUTE_MAX_HEIGHT_FIT_ZOOM = 1.2;
				const availableH = Math.max(0, viewportH - SAFE_BOTTOM_MARGIN_PX);

				const isTransformScaleMode = (() => {
					try {
						if (html.classList.contains(CAMPAIGN_FORCE_TRANSFORM_CLASS)) return true;
						return window.getComputedStyle(document.body).transform !== 'none';
					} catch {
						return false;
					}
				})();

				const getOffsetTopToDocument = (el: HTMLElement): number => {
					let top = 0;
					let node: HTMLElement | null = el;
					// `offsetTop` is layout-based (unaffected by transforms), so this works well
					// when we are using transform scaling.
					while (node) {
						top += node.offsetTop || 0;
						node = node.offsetParent as HTMLElement | null;
					}
					return top;
				};

				let unscaledBottomPx = 0;
				if (isTransformScaleMode) {
					// Transform scaling does not affect layout metrics — use offset* to avoid any
					// Safari/WebKit quirks with getBoundingClientRect under a transformed <body>.
					unscaledBottomPx = anchors.reduce((acc, el) => {
						const top = getOffsetTopToDocument(el);
						return Math.max(acc, top + el.offsetHeight);
					}, 0);
				} else {
					// Zoom scaling affects layout — use bounding rect and unscale.
					const maxBottomPx = anchors.reduce((acc, el) => {
						const rect = el.getBoundingClientRect();
						return Math.max(acc, rect.bottom);
					}, 0);

					const computed = window.getComputedStyle(html);
					const zoomStr = computed.zoom;
					const parsedZoom = zoomStr ? parseFloat(zoomStr) : NaN;
					const varZoomStr = computed.getPropertyValue(CAMPAIGN_ZOOM_VAR);
					const parsedVarZoom = varZoomStr ? parseFloat(varZoomStr) : NaN;
					const appliedScale =
						Number.isFinite(parsedZoom) && parsedZoom > 0 && parsedZoom !== 1
							? parsedZoom
							: Number.isFinite(parsedVarZoom) && parsedVarZoom > 0
								? parsedVarZoom
								: DEFAULT_CAMPAIGN_ZOOM;

					unscaledBottomPx = appliedScale > 0 ? maxBottomPx / appliedScale : maxBottomPx;
				}

				if (unscaledBottomPx > 0) {
					// Calculate exact zoom to make the content bottom align with the viewport bottom
					const zoomToFitHeight = availableH / unscaledBottomPx;

					if (Number.isFinite(zoomToFitHeight) && zoomToFitHeight > 0) {
						// Apply the fit-height zoom, but constrained:
						// 1. Never shrink below ABSOLUTE_MIN_DOCK_CLAMP_ZOOM (0.5)
						// 2. Never grow above ABSOLUTE_MAX_HEIGHT_FIT_ZOOM (1.2)
						// 3. Ensure we don't break the layout width (keep effective width >= 952px)

						const minEffectiveWidth = 952;
						const maxZoomForWidth = viewportW / minEffectiveWidth;

						const finalMaxZoom = Math.min(ABSOLUTE_MAX_HEIGHT_FIT_ZOOM, maxZoomForWidth);

						// We strictly use the calculated zoomToFitHeight (clamped)
						// because the user wants it "SNUG" (filled).
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
		const isCompactWorkspaceActive =
			!isCampaignWorkspaceExpandedRef.current &&
			isCompactCampaignWorkspaceView(campaignWorkspaceActiveViewRef.current);

		let campaignMapShiftX: number;
		let campaignTopNavShiftX: number;
		let campaignBackdropStartCss: number;
		let campaignBackdropEndCss: number;

		if (isCompactWorkspaceActive) {
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
				CAMPAIGN_MAP_MAX_SHIFT_X_PX
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
				CAMPAIGN_MAP_MAX_SHIFT_X_PX
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
				Math.min(contentAlignedBackdropStartCss, twoThirdsBackdropStartCss),
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

		const existingOverrideStr = html.style.getPropertyValue(CAMPAIGN_ZOOM_VAR);
		const existingOverride = existingOverrideStr ? parseFloat(existingOverrideStr) : NaN;
		const existingZoom =
			Number.isFinite(existingOverride) && existingOverride > 0
				? existingOverride
				: DEFAULT_CAMPAIGN_ZOOM;

		if (Math.abs(existingZoom - targetZoom) < 0.002) return;

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
				appliedDockRules,
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

		const onResize = () => {
			// Ensure we register any newly-rendered anchors after responsive/layout changes.
			refreshBottomAnchors();
			scheduleZoomUpdate();
		};
		// Defensive: clear any stale campaign zoom (e.g. Safari BFCache restores).
		try {
			document.documentElement.style.removeProperty(CAMPAIGN_ZOOM_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_SHIFT_X_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_TOP_NAV_SHIFT_X_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_BACKDROP_START_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_BACKDROP_END_VAR);
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
			if (e.persisted) updateCampaignZoomForViewport();
		};
		window.addEventListener('pageshow', onPageShow);

		return () => {
			cancelled = true;
			refreshCampaignZoomAnchorObserversRef.current = null;
			document.documentElement.classList.remove(CAMPAIGN_COMPACT_CLASS);
			document.documentElement.classList.remove(CAMPAIGN_SCROLLABLE_CLASS);
			document.documentElement.classList.remove(CAMPAIGN_FORCE_TRANSFORM_CLASS);
			document.documentElement.style.removeProperty(CAMPAIGN_ZOOM_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_SHIFT_X_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_TOP_NAV_SHIFT_X_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_BACKDROP_START_VAR);
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_BACKDROP_END_VAR);
			if (scheduledRaf !== null) window.cancelAnimationFrame(scheduledRaf);
			if (scrollResetRaf !== null) window.cancelAnimationFrame(scrollResetRaf);
			io?.disconnect();
			mo?.disconnect();
			window.cancelAnimationFrame(rafId);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('scroll', keepCompactPageAtOrigin);
			window.removeEventListener('pageshow', onPageShow);
		};
	}, [isMobile, updateCampaignZoomForViewport]);

	const searchParams = useSearchParams();
	const originParam = searchParams.get('origin');
	const cameFromSearch = originParam === 'search';
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

	// Moved here to be accessible by the keydown listener
	const handleOpenDashboardSearchForCampaign = useCallback(() => {
		if (!campaign) return;
		if (typeof window === 'undefined') return;

		try {
			sessionStorage.removeItem('murmur_pending_search');
		} catch {
			// sessionStorage may be unavailable — navigation can still proceed.
		}

		// Hard navigation: a soft router.push sometimes doesn't fully re-mount the
		// dashboard's map-search mode (especially mid-transition or with cached state),
		// so use window.location.assign for a reliable, fresh dashboard load.
		window.location.assign(
			`${urls.murmur.dashboard.index}?fromCampaignId=${campaign.id}&pick=1&allContacts=1`
		);
	}, [campaign]);

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
	}, [handleOpenDashboardSearchForCampaign]);

	// Cleanup timer on unmount
	useEffect(() => {
		return () => {
			if (topSearchHighlightTimeoutRef.current) {
				clearTimeout(topSearchHighlightTimeoutRef.current);
			}
		};
	}, []);

	const { user, isPendingUser, isLoaded } = useMe();
	const { data: identities, isPending: isPendingIdentities } = useGetIdentities({});
	const { mutateAsync: editCampaign } = useEditCampaign({ suppressToasts: true });
	const { mutateAsync: createIdentity } = useCreateIdentity({ suppressToasts: true });
	const autoEnsureIdentityOnceRef = useRef(false);
	const queryClient = useQueryClient();
	const hasRefetchedContactsRef = useRef(false);

	// Refetch contacts when returning from map search (origin=search) to ensure newly added contacts are shown
	useEffect(() => {
		if (cameFromSearch && campaign && !hasRefetchedContactsRef.current) {
			hasRefetchedContactsRef.current = true;
			// Invalidate all contacts and userContactLists queries to force fresh data
			// This marks queries as stale so they refetch when accessed
			queryClient.invalidateQueries({ queryKey: ['contacts'] });
			queryClient.invalidateQueries({ queryKey: ['userContactLists'] });
			// Also immediately refetch any active queries
			queryClient.refetchQueries({ queryKey: ['contacts'], type: 'active' });
			queryClient.refetchQueries({ queryKey: ['userContactLists'], type: 'active' });
		}
	}, [cameFromSearch, campaign, queryClient]);

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

			const backdropStartStr =
				html.style.getPropertyValue(CAMPAIGN_MAP_BACKDROP_START_VAR) ||
				cs.getPropertyValue(CAMPAIGN_MAP_BACKDROP_START_VAR);
			const backdropStartCss = backdropStartStr
				? parseFloat(backdropStartStr)
				: Number.NaN;
			if (!Number.isFinite(backdropStartCss) || backdropStartCss <= 0) {
				setCampaignMapCameraPadding({ right: 0, left: 0, top: 0, bottom: 0 });
				return;
			}

			const viewportW = window.innerWidth;
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
			const safeLevelValue = clampCampaignMapZoomControlValue(levelValue);
			scheduleMapZoomControlRequest(
				getCampaignMapZoomForControlValue(safeLevelValue),
				true
			);
		},
		[scheduleMapZoomControlRequest]
	);
	const handleMapZoomControlInteractionChange = useCallback((isDragging: boolean) => {
		setIsMapZoomControlDragging(isDragging);
	}, []);
	const handleMapZoomControlChange = useCallback(
		(levelIndex: number, meta?: MapZoomControlIndexChangeMeta) => {
			const safeLevelIndex = Math.min(
				Math.max(Math.round(levelIndex), 0),
				CAMPAIGN_MAP_ZOOM_CONTROL_MAX_INDEX
			);
			const nextControlValue =
				meta?.source === 'drag-release'
					? clampCampaignMapZoomControlValue(meta.levelValue)
					: safeLevelIndex;
			setMapZoomControlIndex(nextControlValue);
			if (meta?.source === 'drag-release') {
				if (mapZoomControlRequestRafRef.current != null) {
					window.cancelAnimationFrame(mapZoomControlRequestRafRef.current);
					mapZoomControlRequestRafRef.current = null;
				}
				pendingMapZoomControlRequestRef.current = null;
				pushMapZoomControlRequest(
					getCampaignMapZoomForControlValue(nextControlValue),
					true
				);
				return;
			}
			pushMapZoomControlRequest(
				CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS[safeLevelIndex] ??
					CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS[0],
				false
			);
		},
		[pushMapZoomControlRequest]
	);
	const handleSelectMapToolClick = useCallback(() => {
		setActiveMapTool((prev) => (prev === 'select' ? 'grab' : 'select'));
	}, []);
	const handleMapViewportZoom = useCallback(
		(zoom: number) => {
			if (isMapZoomControlDragging) return;
			const nextControlValue = getCampaignMapZoomControlValueForZoom(zoom);
			mapZoomControlLiveRef.current?.setLevelValue(nextControlValue);
		},
		[isMapZoomControlDragging]
	);
	const handleMapViewportIdle = useCallback(
		(payload: { zoom: number }) => {
			if (isMapZoomControlDragging) return;
			const nextControlValue = getCampaignMapZoomControlValueForZoom(payload.zoom);
			setMapZoomControlIndex((current) =>
				Math.abs(current - nextControlValue) < 0.005 ? current : nextControlValue
			);
		},
		[isMapZoomControlDragging]
	);

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
					const overlay = document.querySelector('.campaign-map-split-overlay');
					if (!overlay) return;
					const bandRect = overlay.getBoundingClientRect();
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
		return () => {
			window.removeEventListener('wheel', onWheelCapture, true);
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
	const RESPONSES_POPUP_WIDTH_PX = 654;
	const RESPONSES_POPUP_HEIGHT_PX = 266;
	const RESPONSES_POPUP_SEARCHBAR_BOTTOM_GAP_PX = 18;
	const RESPONSES_POPUP_MARGIN_PX = 8;
	const [isResponsesPopupOpen, setIsResponsesPopupOpen] = useState(false);
	const responsesPopupAnchorRef = useRef<HTMLDivElement>(null);
	const responsesPopupTriggerRef = useRef<HTMLButtonElement>(null);
	const responsesPopupRef = useRef<HTMLDivElement>(null);
	const [responsesPopupPosition, setResponsesPopupPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);

	const getCampaignZoomFactor = useCallback(() => {
		if (typeof window === 'undefined') return 1;
		const html = document.documentElement;
		// Only apply zoom when the campaign page is in its compact/scaled mode.
		if (!html.classList.contains(CAMPAIGN_COMPACT_CLASS)) return 1;
		const raw = getComputedStyle(html).getPropertyValue(CAMPAIGN_ZOOM_VAR).trim();
		const parsed = Number.parseFloat(raw);
		if (Number.isFinite(parsed) && parsed > 0) return parsed;
		return DEFAULT_CAMPAIGN_ZOOM;
	}, [CAMPAIGN_COMPACT_CLASS, CAMPAIGN_ZOOM_VAR, DEFAULT_CAMPAIGN_ZOOM]);

	const updateResponsesPopupPosition = useCallback(() => {
		if (typeof window === 'undefined') return;
		const trigger = responsesPopupTriggerRef.current;
		if (!trigger) {
			// If the trigger is unmounted (e.g. narrow breakpoint), close the popup.
			setIsResponsesPopupOpen(false);
			setResponsesPopupPosition(null);
			return;
		}

		const anchor = responsesPopupAnchorRef.current ?? trigger;
		const zoom = getCampaignZoomFactor();
		const rect = anchor.getBoundingClientRect();
		const rectTop = rect.top / zoom;
		const rectLeft = rect.left / zoom;
		const rectBottom = rect.bottom / zoom;
		const rectWidth = rect.width / zoom;

		const viewportW = window.innerWidth / zoom;
		const viewportH = window.innerHeight / zoom;

		let left = rectLeft + rectWidth / 2 - RESPONSES_POPUP_WIDTH_PX / 2;
		let top = rectBottom + RESPONSES_POPUP_SEARCHBAR_BOTTOM_GAP_PX;

		// If it would overflow below, try opening above the trigger.
		if (
			top + RESPONSES_POPUP_HEIGHT_PX + RESPONSES_POPUP_MARGIN_PX >
			viewportH
		) {
			const aboveTop =
				rectTop -
				RESPONSES_POPUP_SEARCHBAR_BOTTOM_GAP_PX -
				RESPONSES_POPUP_HEIGHT_PX;
			if (aboveTop >= RESPONSES_POPUP_MARGIN_PX) top = aboveTop;
		}

		left = Math.min(
			Math.max(left, RESPONSES_POPUP_MARGIN_PX),
			viewportW - RESPONSES_POPUP_WIDTH_PX - RESPONSES_POPUP_MARGIN_PX
		);
		top = Math.min(
			Math.max(top, RESPONSES_POPUP_MARGIN_PX),
			viewportH - RESPONSES_POPUP_HEIGHT_PX - RESPONSES_POPUP_MARGIN_PX
		);

		setResponsesPopupPosition({ top, left });
	}, [
		getCampaignZoomFactor,
		RESPONSES_POPUP_HEIGHT_PX,
		RESPONSES_POPUP_SEARCHBAR_BOTTOM_GAP_PX,
		RESPONSES_POPUP_MARGIN_PX,
		RESPONSES_POPUP_WIDTH_PX,
	]);

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
		setResponsesPopupPosition(null);
	}, [activeView]);

	useEffect(() => {
		if ((overviewSearchQuery ?? '').trim().length > 0) {
			setShowTopCampaignsDropdown(false);
			setIsResponsesPopupOpen(false);
			setResponsesPopupPosition(null);
		}
	}, [overviewSearchQuery]);

	// Position the responses popup as soon as it opens (pre-paint).
	useLayoutEffect(() => {
		if (!isResponsesPopupOpen) return;
		updateResponsesPopupPosition();
	}, [isResponsesPopupOpen, updateResponsesPopupPosition]);

	// Keep the responses popup positioned on resize/scroll while open.
	useEffect(() => {
		if (!isResponsesPopupOpen) return;
		const handleViewportChange = () => updateResponsesPopupPosition();
		window.addEventListener('resize', handleViewportChange);
		window.addEventListener('scroll', handleViewportChange, true);
		return () => {
			window.removeEventListener('resize', handleViewportChange);
			window.removeEventListener('scroll', handleViewportChange, true);
		};
	}, [isResponsesPopupOpen, updateResponsesPopupPosition]);

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
				setResponsesPopupPosition(null);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			setIsResponsesPopupOpen(false);
			setResponsesPopupPosition(null);
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

	// Mobile never supports the Writing ("testing") tab. Clamp immediately so we never mount
	// HybridPromptInput on mobile (and never transition through it).
	const MOBILE_ALLOWED_VIEWS: Array<'drafting' | 'inbox'> = ['drafting', 'inbox'];
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
		requestedViewRef.current = 'drafting';
		setActiveViewInternal('drafting');
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
			// Never allow unsupported views on mobile.
			if (
				isMobile === true &&
				!MOBILE_ALLOWED_VIEWS.includes(newView as (typeof MOBILE_ALLOWED_VIEWS)[number])
			) {
				newView = 'drafting';
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
		[activeView, isMobile, MOBILE_ALLOWED_VIEWS, requestInboxSentTab]
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
		useGetCampaignContacts(campaign?.id, {
			enabled: Boolean(campaign?.id) && !isMobile,
		});
	const { data: headerEmails } = useGetEmails({
		filters: { campaignId: campaign?.id },
		enabled:
			Boolean(campaign?.id) &&
			isMobile === false &&
			(isNarrowestDesktop ||
				activeView === 'overview' ||
				isCompactCampaignWorkspaceView(activeView)),
	});
	const { data: overviewInboundEmails } = useGetInboundEmails({
		filters: { campaignId: campaign?.id },
		enabled:
			Boolean(campaign?.id) &&
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
			if (effectiveMapGroupingForActiveView === 'status') {
				const status = campaignOverviewContactStatusById.get(contact.id) ?? 'contacts';
				if (!effectiveActiveStatusSetForActiveView.has(status)) continue;
				out.push(contact);
				continue;
			}

			const titleLike =
				contact.curatedDisplayLabel || contact.title || contact.headline || '';
			const categoryIndex = getMapSelectGrabCategoryIndexFromContactTitle(titleLike);
			if (categoryIndex >= 0) {
				if (mapGrabActiveCategories[categoryIndex] === false) continue;
			} else if (!mapGrabUncategorizedActive) {
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
			selectedContacts: [],
			campaignContactStatusById: campaignOverviewContactStatusById,
			campaignMarkerMode: effectiveMapGroupingForActiveView,
			categoryConstellationsEnabled: true,
			activeTool: activeMapTool,
			requestedZoom: mapZoomControlRequest,
			onViewportZoom: handleMapViewportZoom,
			onViewportIdle: handleMapViewportIdle,
			isLoading: isCampaignMapContactsLoading,
			skipAutoFit: true,
		}),
		[
			activeMapTool,
			campaignMapCameraPadding,
			campaignMapContactsForMap,
			campaignOverviewContactStatusById,
			effectiveMapGroupingForActiveView,
			globeNightLighting,
			globeWeatherMood,
			globeWeatherRegionCenter,
			globeWeatherTemperatureF,
			handleMapViewportIdle,
			isCampaignMapContactsLoading,
			handleMapViewportZoom,
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

	useLayoutEffect(() => {
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
	const isCampaignWorkspaceToggleVisible =
		!isMobile &&
		usePersistentCampaignMapBackground &&
		isCompactCampaignWorkspaceView(activeView);
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

	// Mobile-specific tab navigation (only the visible tabs on mobile)
	const mobileTabOrder: Array<'drafting' | 'inbox'> = ['inbox', 'drafting'];

	const goToPreviousMobileTab = () => {
		const currentIndex = mobileTabOrder.indexOf(activeView as 'drafting' | 'inbox');
		if (currentIndex > 0) {
			setActiveView(mobileTabOrder[currentIndex - 1]);
		} else {
			// Wrap around to the last mobile tab
			setActiveView(mobileTabOrder[mobileTabOrder.length - 1]);
		}
	};

	const goToNextMobileTab = () => {
		const currentIndex = mobileTabOrder.indexOf(activeView as 'drafting' | 'inbox');
		if (currentIndex >= 0 && currentIndex < mobileTabOrder.length - 1) {
			setActiveView(mobileTabOrder[currentIndex + 1]);
		} else {
			// Wrap around to the first mobile tab
			setActiveView(mobileTabOrder[0]);
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

			// Use mobile tab order on mobile, desktop tab order otherwise
			if (isMobile === true) {
				if (e.key === 'ArrowLeft') {
					goToPreviousMobileTab();
				} else {
					goToNextMobileTab();
				}
			} else {
				if (e.key === 'ArrowLeft') {
					goToPreviousTab();
				} else {
					goToNextTab();
				}
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
	const isPresetMapControlsView =
		!isMobile &&
		Boolean(activeTabPresetStatuses) &&
		!shouldHideContent &&
		!isNarrowestDesktop;
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
	// CAMPAIGN_MAP_CONTENT_SCALE, so its bottom edge resolves to
	// 9 + (height × scale). We anchor the content box 27px beneath that.
	//
	// Notes:
	// - The campaign header row is a fixed 50px tall.
	// - DraftingSection contains a small 4px spacer div at the very top (mb-[4px]).
	const CAMPAIGN_TOP_NAV_BOX_BOTTOM_PX =
		CAMPAIGN_TOP_NAV_BACKDROP_BOX_TOP_PX +
		CAMPAIGN_TOP_NAV_BACKDROP_BOX_HEIGHT_PX * CAMPAIGN_MAP_CONTENT_SCALE;
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
								/>
							</div>
						)}
						{/* Write/Drafts/Inbox tabs: the same legend locked to the tab's
						    preset (full opacity), plus a dimmed, display-only search bar. */}
						{isPresetMapControlsView && (
							<>
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
									<div inert aria-hidden="true" style={{ opacity: 0.4 }}>
										<CampaignOverviewAskAnythingBox
											onSubmit={() => undefined}
											value=""
											leftOverride={presetMapControlsLeftCss}
											bottomOverride={presetMapAskBoxBottomPx}
										/>
									</div>
								</div>
								{/* Dimmed, display-only mirror of the overview "Showing" strip.
								    No data-campaign-overview-* attrs (DraftingSection queries
								    those) and no mutating callbacks, so it can never disturb the
								    overview's category/zoom/tool state. `inert` disables all
								    interaction even though children opt into pointer-events. */}
								<div inert aria-hidden="true" style={{ opacity: 0.4 }}>
									<div
										className="fixed z-[130] pointer-events-none"
										style={{
											left: `${CAMPAIGN_MAP_SELECT_GRAB_LEFT_PX}px`,
											top: presetMapToolTopCss,
											transform: `scale(${campaignMapSelectGrabViewScale})`,
											transformOrigin: 'top left',
										}}
									>
										<div
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
											isSelectActive={false}
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
											}}
										/>
										<MapSelectGrabStackBox
											className="absolute left-0 pointer-events-none"
											isSelectActive={false}
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
											isSelectActive={false}
											selectedContent={<StackBoxSelectBlueSparkIcon />}
											inactiveContent={
												<MapSelectGrabStackTile backgroundColor="#EFEFEF">
													<MapStackBlueSparkIcon />
												</MapSelectGrabStackTile>
											}
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
											className="absolute left-0 pointer-events-none"
											zoomLevelIndex={mapZoomControlIndex}
											zoomLevelValue={mapZoomControlDisplayValue}
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
											activeTool="grab"
											onSelectClick={() => undefined}
											onGrabClick={() => undefined}
											className="pointer-events-none"
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

								return (
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
													transform: `scale(${CAMPAIGN_MAP_CONTENT_SCALE})`,
													transformOrigin: 'top center',
													width: `${MAP_VIEW_TOP_BACKDROP_BOX_WIDTH_PX}px`,
													height: `${MAP_VIEW_TOP_BACKDROP_BOX_HEIGHT_PX}px`,
													borderRadius: '8px',
													backgroundColor: '#B9EAF1',
													opacity: 0.9,
												}}
											/>
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
																				ref={responsesPopupAnchorRef}
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
																			setResponsesPopupPosition(null);
																			setIsTopOpportunitiesOpen(false);
																			setIsTopStrategyDropdownOpen((open) => !open);
																		}
																		: isFolderButton
																			? () => {
																				setIsTopStrategyDropdownOpen(false);
																				setIsResponsesPopupOpen(false);
																				setResponsesPopupPosition(null);
																				setIsTopOpportunitiesOpen(false);
																				setShowTopCampaignsDropdown((open) => !open);
																			}
																		: isOpportunitiesButton
																				? () => {
																					setShowTopCampaignsDropdown(false);
																				setIsResponsesPopupOpen(false);
																				setResponsesPopupPosition(null);
																				setIsTopStrategyDropdownOpen(false);
																				setIsTopOpportunitiesOpen((open) => !open);
																			}
																			: isResponsesButton
																				? () => {
																					setShowTopCampaignsDropdown(false);
																					setIsTopStrategyDropdownOpen(false);
																					setIsTopOpportunitiesOpen(false);
																					setResponsesPopupPosition(null);
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
													className="pointer-events-auto"
													style={{
														// The campaign page already applies a root-level zoom (murmur-campaign-compact).
														// Scaling this dropdown again makes it noticeably smaller than the dashboard.
														transformOrigin: 'top center',
													}}
												>
													<DashboardStrategyBox onSearchContacts={handleGoToDashboardSearch} />
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
												className="pointer-events-auto"
												style={{
													// The campaign page already applies a root-level zoom (murmur-campaign-compact).
													// Scaling this dropdown again makes it noticeably smaller than the dashboard.
													transformOrigin: 'top center',
													width: '743px',
													maxWidth: 'calc(100vw - 32px)',
												}}
											>
												<CampaignsTable
													defaultOpenCampaignId={campaign.id}
													defaultOpenContactsFolder
												/>
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
													className="pointer-events-auto"
													style={{
														// The campaign page already applies a root-level zoom (murmur-campaign-compact).
														// Scaling this dropdown again makes it noticeably smaller than the dashboard.
														transformOrigin: 'top center',
													}}
												>
													<DashboardOpportunitiesWidget enabled={isLoaded && !!user} />
												</div>
											</div>
										) : null}

										{isResponsesPopupOpen && responsesPopupPosition && !isOverviewLocalSearchActive ? (
											<div
												data-slot="campaign-top-responses-popup"
												className="fixed pointer-events-none"
												style={{
													top: `${responsesPopupPosition.top}px`,
													left: `${responsesPopupPosition.left}px`,
													zIndex: 128,
												}}
											>
												<div
													ref={responsesPopupRef}
													data-campaign-interactive-surface
													role="dialog"
													aria-label="Responses"
													className="pointer-events-auto"
												>
													<DashboardResponsesWidget enabled={isLoaded && !!user} />
												</div>
											</div>
										) : null}
									</>
								);
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
									top: '56dvh',
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
												className="font-inter text-[13px] font-medium leading-none bg-[#F5DADA] border border-transparent text-[#6B6B6B] hover:text-black hover:border-black cursor-pointer rounded-full px-3 py-1"
												onClick={handleGoToDashboardSearch}
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

								{/* Campaign Header Box - shown at narrowest breakpoint (< 952px) */}
								{!isMobile && isNarrowestDesktop && campaign && (
									<div className="flex justify-center mb-4">
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
											className={cn(
												'relative w-full',
												// Prevent interacting with the destination view while the previous view is still covering it.
												isTransitioning && previousView && 'pointer-events-none'
											)}
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
												onInboxSentTabChange={setInboxSentTab}
												goToOverview={() => setActiveView('overview')}
												goToDrafting={() => setActiveView('drafting')}
												goToWriting={() => setActiveView('testing')}
												onGoToSearch={handleOpenDashboardSearchForCampaign}
												goToInbox={() => setActiveView('inbox')}
												goToSent={() => setActiveView('sent')}
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

										{/* Previous view - fades out above the current view */}
										{isTransitioning && previousView && (
											<div
												data-campaign-view-layer="previous"
												className="absolute inset-0 w-full pointer-events-none"
												aria-hidden="true"
												style={{
													zIndex: 2,
													willChange: 'opacity',
													...(isFadingOutPreviousView
														? {
																animation: `viewFadeOut ${TRANSITION_DURATION}ms ease-out forwards`,
															}
														: { opacity: 1 }),
												}}
											>
												<DraftingSection
													campaign={campaign}
													view={previousView}
													overviewRightRailSearchQuery={overviewSearchQuery}
													onClearOverviewRightRailSearch={handleClearOverviewSearchQuery}
													overviewRightRailSearchContacts={campaignMapContacts ?? []}
													overviewRightRailSearchContactsLoading={
													isCampaignMapContactsLoading
												}
													renderGlobalOverlays={false}
													autoOpenProfileTabWhenIncomplete={cameFromSearch}
													inboxSentTabRequest={inboxSentTabRequest}
													onInboxSentTabChange={setInboxSentTab}
													goToOverview={() => setActiveView('overview')}
													goToDrafting={() => setActiveView('drafting')}
													goToWriting={() => setActiveView('testing')}
													onGoToSearch={handleOpenDashboardSearchForCampaign}
													goToInbox={() => setActiveView('inbox')}
													goToSent={() => setActiveView('sent')}
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
										background: rgba(136, 136, 136, 0.1);
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
									.campaign-persistent-map-page [data-slot='campaign-top-backdrop'],
									.campaign-persistent-map-page [data-slot='campaign-top-outline-boxes'],
									.campaign-persistent-map-page [data-slot='campaign-top-tabs'],
									.campaign-persistent-map-page [data-slot='campaign-top-search-bar'],
									.campaign-persistent-map-page [data-slot='campaign-top-strategy-dropdown'],
									.campaign-persistent-map-page [data-slot='campaign-top-campaigns-dropdown'],
									.campaign-persistent-map-page [data-slot='campaign-top-opportunities-popup'] {
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

						{/* Mobile bottom navigation panel */}
						{isMobile && (
							<div
								className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-1"
								style={{ backgroundColor: '#E1EFF4' }}
							>
								<button
									type="button"
									onClick={goToPreviousMobileTab}
									className="bg-transparent border-0 p-1 cursor-pointer hover:opacity-70 transition-opacity"
									aria-label="Previous tab"
								>
									<LeftArrow width={18} height={34} color="#000000" opacity={1} />
								</button>
								<button
									type="button"
									onClick={goToNextMobileTab}
									className="bg-transparent border-0 p-1 cursor-pointer hover:opacity-70 transition-opacity"
									aria-label="Next tab"
								>
									<RightArrow width={18} height={34} color="#000000" opacity={1} />
								</button>
							</div>
						)}
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
