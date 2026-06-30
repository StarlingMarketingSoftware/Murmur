'use client';

import {
	memo,
	Suspense,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	type ReactNode,
} from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { gsap } from 'gsap';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createPortal, flushSync } from 'react-dom';
import {
	CampaignsTable,
	type CampaignsMockState,
} from '../../../components/organisms/_tables/CampaignsTable/CampaignsTable';
import { CampaignsTableDebugPanel } from '../../../components/organisms/_tables/CampaignsTable/CampaignsTableDebugPanel';
import { DashboardStrategyBox } from '@/components/molecules/DashboardStrategyBox/DashboardStrategyBox';
import DashboardCalendarPanel, {
	type DashboardCalendarMockState,
} from '@/components/molecules/DashboardCalendarPanel/DashboardCalendarPanel';
import { DashboardCalendarDebugPanel } from '@/components/molecules/DashboardCalendarPanel/DashboardCalendarDebugPanel';
import { MobileDashboardCalendar } from '@/components/molecules/DashboardCalendarPanel/MobileDashboardCalendar';
import {
	MobileDashboardTabBar,
	type MobileDashboardTab,
} from '@/components/molecules/MobileDashboardTabBar/MobileDashboardTabBar';
import { MobileFolderCards } from '@/components/molecules/MobileFolderCards/MobileFolderCards';
import { MobileDashboardSearch } from '@/app/murmur/dashboard/MobileDashboardSearch';
import {
	DASHBOARD_SEARCH_SELECTION_LIMIT,
	getSelectionLimitedContactIds,
	mergeContactIdsWithSelectionLimit,
	useDashboard,
} from './useDashboard';
import { useLenis } from '@/contexts/ScrollContext';
import { withClerkNoBranding } from '@/constants/auth';
import { urls } from '@/constants/urls';
import { ContactsHeaderChrome } from '@/app/murmur/campaign/[campaignId]/DraftingSection/EmailGeneration/DraftingTable/DraftingTable';
import {
	getMsUntilNextSearchGradientBucket,
	getSearchGradientForDate,
} from '@/constants/searchGradients';
import { isProblematicBrowser } from '@/utils/browserDetection';
import {
	computeMapSelectGrabViewScale,
	computeSideRailCenterShiftPx,
	DASHBOARD_SIDE_SHIFT_VAR,
	getMurmurChromeZoomForWindow,
	MURMUR_CHROME_ZOOM_DEFAULT,
} from '@/utils/murmurChromeZoom';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import MurmurLogoNew from '@/components/atoms/_svg/MurmurLogoNew';
import UndoIcon from '@/components/atoms/_svg/UndoIcon';
import SelectionCountClearIcon from '@/components/atoms/_svg/SelectionCountClearIcon';
import { PromotionIcon } from '@/components/atoms/_svg/PromotionIcon';
import { BookingIcon } from '@/components/atoms/_svg/BookingIcon';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import { SearchIconMobile } from '@/components/atoms/_svg/SearchIconMobile';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import {
	isRestaurantTitle,
	isCoffeeShopTitle,
	isMusicVenueTitle,
	isMusicFestivalTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
	getWineBeerSpiritsLabel,
} from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { RadioStationsIcon } from '@/components/atoms/_svg/RadioStationsIcon';
import { NearMeIcon } from '@/components/atoms/_svg/NearMeIcon';
import MapBottomSearchArrowIcon from '@/components/atoms/_svg/MapBottomSearchArrowIcon';
import MapBottomSearchAdvancedIcon from '@/components/atoms/_svg/MapBottomSearchAdvancedIcon';
import MapBottomSearchCategoryIcon from '@/components/atoms/_svg/MapBottomSearchCategoryIcon';
import MapBottomSearchForYouIcon from '@/components/atoms/_svg/MapBottomSearchForYouIcon';
import MapBottomSearchProfileIcon from '@/components/atoms/_svg/MapBottomSearchProfileIcon';
import MapBottomSearchKeywordIcon from '@/components/atoms/_svg/MapBottomSearchKeywordIcon';
import MapBottomSearchRadiusIcon from '@/components/atoms/_svg/MapBottomSearchRadiusIcon';
import MapSearchRadiusPinIcon from '@/components/atoms/_svg/MapSearchRadiusPinIcon';
import DashboardActionBarPlaybookIcon from '@/components/atoms/_svg/DashboardActionBarPlaybookIcon';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import DashboardActionBarCalendarIcon from '@/components/atoms/_svg/DashboardActionBarCalendarIcon';
import DashboardActionBarStarIcon from '@/components/atoms/_svg/DashboardActionBarStarIcon';
import DashboardActionBarEnvelopeIcon from '@/components/atoms/_svg/DashboardActionBarEnvelopeIcon';
import { MapStackBlueSparkIcon } from '@/components/atoms/_svg/MapStackBlueSparkIcon';
import { MapStackStarIcon } from '@/components/atoms/_svg/MapStackStarIcon';
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
import { getCityIconProps } from '@/utils/cityIcons';
import { Typography } from '@/components/ui/typography';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import { Card, CardContent } from '@/components/ui/card';

import { useClerk, useAuth, SignUp } from '@clerk/nextjs';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDashboardScrollToMap } from '@/hooks/useDashboardScrollToMap';
import { useDebounce } from '@/hooks/useDebounce';
import {
	useBatchUpdateContacts,
	useGetContacts,
	useContactWithResearch,
	getContactsListQueryKey,
	fetchContactsList,
} from '@/hooks/queryHooks/useContacts';
import { useMe } from '@/hooks/useMe';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { CITY_LOCATIONS_LIST } from '@/constants/cityLocations';
import SearchResultsMap, {
	DASHBOARD_TO_INTERACTIVE_TRANSITION_CSS_EASING,
	DASHBOARD_TO_INTERACTIVE_TRANSITION_MS,
	type DashboardDraftingMapContactStatus,
	type SearchResultsMapProps,
} from '@/components/molecules/SearchResultsMap/SearchResultsMap';
import { MAP_MIN_ZOOM } from '@/components/molecules/SearchResultsMap/constants';
import {
	MAP_ZOOM_CONTROL_MAX_INDEX,
	buildZoomControlLevels,
	clampZoomControlValue,
	controlValueForZoom,
	zoomForControlValue,
} from '@/utils/mapZoomControlLadder';
import MapRadiusSlider, {
	RADIUS_DEFAULT_MILES,
} from '@/components/molecules/MapRadiusSlider';
import type {
	LatLngLiteral,
	MarkerHoverMeta,
} from '@/components/molecules/SearchResultsMap/types';
import {
	type PersistentDashboardMapConfig,
	usePersistentMapFirstPaint,
	usePersistentMapReady,
	usePersistentMapSetter,
} from '@/contexts/PersistentMapContext';
import { useWebsitePreview } from '@/contexts/WebsitePreviewContext';
import { getMurmurRootScale } from '@/utils/rootScale';
import { DashboardBootBackdrop } from '@/components/molecules/DashboardBootBackdrop/DashboardBootBackdrop';
import { DashboardBootProgress } from '@/components/molecules/DashboardBootProgress/DashboardBootProgress';
import { MapStatusLoadingPill } from '@/components/molecules/MapStatusLoadingPill';
import { useGlobeWeatherMood } from '@/hooks/useGlobeWeatherMood';
import { useGlobeNightLighting } from '@/hooks/useGlobeNightLighting';
import DashboardHeroDateWeatherBar from './DashboardHeroDateWeatherBar';
import { ContactWithName } from '@/types/contact';
import { MapResultsPanelSkeleton } from '@/components/molecules/MapResultsPanelSkeleton/MapResultsPanelSkeleton';
import {
	buildAllUsStateNames,
	extractUsStateNameFromText,
	getNearestUsStateNameForPoint,
	getNearestUsStateNames,
	normalizeUsStateName,
} from '@/utils/usStates';
import { getApproximateLocation } from '@/utils/approximateLocation';
import { markPerf } from '@/utils/perfMarks';
import { useGetIdentities } from '@/hooks/queryHooks/useIdentities';
import {
	deriveProfileSearchSignals,
	hasUsableProfileSignals,
	buildProfileSig,
	type ProfileIdentityInput,
} from '@/utils/profileSignals';
import {
	ContactResearchPanel,
	ContactResearchHorizontalStrip,
} from '@/components/molecules/ContactResearchPanel/ContactResearchPanel';
import { ContactResearchDescriptionBox } from '@/components/molecules/ContactResearchPanel/ContactResearchDescriptionBox';
import { ContactResearchHoverCard } from '@/components/molecules/ContactResearchPanel/ContactResearchHoverCard';
import { CampaignsInboxView } from '@/components/molecules/CampaignsInboxView/CampaignsInboxView';
import InboxSection from '@/components/molecules/InboxSection/InboxSection';
import { CampaignHeaderBox } from '@/components/molecules/CampaignHeaderBox/CampaignHeaderBox';
import { HoverDescriptionProvider } from '@/contexts/HoverDescriptionContext';
import {
	DashboardWriteOverlay,
	type DashboardDraftingStatus,
} from './DashboardWriteOverlay';
import { LegacyInwardExpandIcon } from './DashboardDraftingDeck';
import { SelectionFolderMoveBanner } from './SelectionFolderMoveBanner';
import { MapEventPopupCard, formatMapPostedEventDate } from './MapEventPopupCard';
import { ApplyModal } from './ApplyModal';
import { UnsubscribeFlow } from '@/components/organisms/UnsubscribeFlow/UnsubscribeFlow';
import DashboardResponsesWidget, {
	type ResponsesMockState,
} from '@/components/molecules/DashboardResponsesWidget/DashboardResponsesWidget';
import { DashboardResponsesDebugPanel } from '@/components/molecules/DashboardResponsesWidget/DashboardResponsesDebugPanel';
import DashboardOpportunitiesWidget, {
	type OpportunitiesMockState,
} from '@/components/molecules/DashboardOpportunitiesWidget/DashboardOpportunitiesWidget';
import { DashboardOpportunitiesDebugPanel } from '@/components/molecules/DashboardOpportunitiesWidget/DashboardOpportunitiesDebugPanel';
import {
	useGetCampaign,
	useGetCampaignContacts,
	useGetCampaigns,
	getCampaignDetailQueryKey,
	fetchCampaignDetail,
	getCampaignContactsQueryKey,
	fetchCampaignContacts,
} from '@/hooks/queryHooks/useCampaigns';
import { useCampaignTopNavScheme } from '@/hooks/useCampaignTopNavScheme';
import {
	useGetEmails,
	getEmailsListQueryKey,
	fetchEmailsList,
} from '@/hooks/queryHooks/useEmails';
import {
	useGetInboundEmails,
	getInboundEmailsListQueryKey,
	fetchInboundEmailsList,
} from '@/hooks/queryHooks/useInboundEmails';
import { useGetMapEvents } from '@/hooks/queryHooks/useGetMapEvents';
import { useGetMyEventApplications } from '@/hooks/queryHooks/useEventApplications';
import type { MapEventData } from '@/app/api/events/route';
import {
	getIdentitiesListQueryKey,
	fetchIdentitiesList,
} from '@/hooks/queryHooks/useIdentities';
import { useEditUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EmailStatus } from '@prisma/client';
import { useSendingSessionState } from '@/contexts/SendingSessionContext';
import { SearchSendingOverlay } from '@/components/molecules/SendingProgress/SearchSendingOverlay';
import { DashboardSendQueueOverlay } from '@/components/molecules/SendingProgress/DashboardSendQueueOverlay';
import {
	SendQueueViewProvider,
	useSendQueueView,
} from '@/contexts/SendQueueViewContext';
import {
	SEND_QUEUE_QUERY_KEYS,
	fetchSendQueue,
	useSendQueue,
} from '@/hooks/queryHooks/useSendQueue';

// Horizontally-scrollable row with edge fades but NO visible scrollbar.
// The fades are dynamic: the left edge only fades once the content has been
// scrolled off the left, and the right edge stops fading once the end is
// reached. Native trackpad/touch horizontal scrolling works as-is, and a wheel
// handler translates predominantly-vertical mouse-wheel deltas into horizontal
// scroll so mouse users can scroll the row too.
const HorizontalFadeScroller = ({
	className,
	style,
	contentClassName,
	fadeWidth = 40,
	children,
}: {
	className?: string;
	style?: React.CSSProperties;
	contentClassName?: string;
	fadeWidth?: number;
	children: ReactNode;
}) => {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [fade, setFade] = useState({ left: false, right: false });

	const updateFades = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		const maxScroll = el.scrollWidth - el.clientWidth;
		const left = el.scrollLeft > 1;
		const right = el.scrollLeft < maxScroll - 1;
		setFade((prev) =>
			prev.left === left && prev.right === right ? prev : { left, right }
		);
	}, []);

	useLayoutEffect(() => {
		updateFades();
	}, [updateFades, children]);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		updateFades();
		const handleWheel = (event: WheelEvent) => {
			const maxScroll = el.scrollWidth - el.clientWidth;
			if (maxScroll <= 0) return;
			const delta =
				Math.abs(event.deltaY) > Math.abs(event.deltaX)
					? event.deltaY
					: event.deltaX;
			if (delta === 0) return;
			const atStart = el.scrollLeft <= 0;
			const atEnd = el.scrollLeft >= maxScroll;
			// Let the page scroll naturally when we're already at an edge.
			if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
			event.preventDefault();
			el.scrollLeft += delta;
			updateFades();
		};
		el.addEventListener('wheel', handleWheel, { passive: false });
		const resizeObserver = new ResizeObserver(() => updateFades());
		resizeObserver.observe(el);
		return () => {
			el.removeEventListener('wheel', handleWheel);
			resizeObserver.disconnect();
		};
	}, [updateFades]);

	const leftStop = fade.left ? 'transparent 0' : 'black 0';
	const rightStop = fade.right ? 'transparent 100%' : 'black 100%';
	const mask = `linear-gradient(to right, ${leftStop}, black ${fadeWidth}px, black calc(100% - ${fadeWidth}px), ${rightStop})`;

	return (
		<div
			ref={scrollRef}
			className={`scrollbar-hide overflow-x-auto overflow-y-hidden ${className ?? ''}`}
			onScroll={updateFades}
			style={{
				maskImage: mask,
				WebkitMaskImage: mask,
				...style,
			}}
		>
			<div className={contentClassName}>{children}</div>
		</div>
	);
};

const DEFAULT_STATE_SUGGESTIONS = [
	{
		label: 'New York',
		promotionDescription: 'reach out to radio stations, playlists, and more',
		generalDescription: 'contact venues, restaurants and more, to book shows',
	},
	{
		label: 'Pennsylvania',
		promotionDescription: 'reach out to radio stations, playlists, and more',
		generalDescription: 'contact venues, restaurants and more, to book shows',
	},
	{
		label: 'California',
		promotionDescription: 'reach out to radio stations, playlists, and more',
		generalDescription: 'contact venues, restaurants and more, to book shows',
	},
];

const TAB_PILL_COLORS = {
	search: '#DAE6FE',
	inbox: '#CBE7D1',
} as const;

const getContactCategoryDisplaySource = (
	contact: Pick<ContactWithName, 'curatedDisplayLabel' | 'title'>
): string => contact.curatedDisplayLabel || contact.title || '';

const isCuratedPicksSearchQuery = (query: string): boolean =>
	/^curated picks near\b/i.test(query.trim());

const DEFAULT_CATEGORY_SEARCH_WHAT = 'Wine, Beer, and Spirits';

// ── Curated "For You" search-results skin ─────────────────────────────────────
// Only the curated ("For You") search type gets a special results-box treatment:
// the header band ("top part") and the rows container ("body area") swap their
// flat fills for these linear gradients. Every other search type keeps the
// existing flat fills, and all sizing/borders stay identical — only the
// background changes. These two constants are the single source of truth, so
// the exact Figma gradient CSS can be pasted here verbatim.
const FOR_YOU_RESULTS_HEADER_GRADIENT =
	'linear-gradient(90deg, #A0E6B5 0%, #E78FBE 55%, #EF7D7D 100%)';
const FOR_YOU_RESULTS_BODY_GRADIENT =
	'linear-gradient(180deg, #D8C6E3 0%, #E9CCDC 48%, #F0C7C7 100%)';

const CURATED_URL_PARAM_KEYS = ['pick', 'area', 'state', 'cat', 'lat', 'lon', 'r'] as const;
// Distinct from CURATED_URL_PARAM_KEYS so a refresh from a free-text run can't be mistaken
// for a curated rehydration (which would replay /api/contacts/curated-search instead of
// restoring the cached free-text results from sessionStorage).
const FREETEXT_URL_PARAM_KEYS = [
	'ft',
	'ftLat',
	'ftLon',
	'ftR',
	'ftStrict',
	'ftKeyword',
	'ftProfile',
] as const;

const MILES_TO_KM = 1.609344;

const MAP_POSTED_EVENT_CARD_WIDTH_PX = 420;
const MAP_POSTED_EVENT_CARD_HEIGHT_PX = 121;
// Collapsed-deck chrome (all in the card's 420-wide design space): each card
// edge peeking above the front card is offset up by the step and inset more
// per depth level, deck-of-cards style.
const MAP_POSTED_EVENT_DECK_EDGE_STEP_PX = 6;
const MAP_POSTED_EVENT_DECK_EDGE_INSET_PX = 6;
const MAP_POSTED_EVENT_DECK_MAX_EDGES = 3;
const MAP_POSTED_EVENT_CARD_SURFACE_STYLE = {
	borderRadius: '8px',
	border: '3px solid #8F2B2B',
	backgroundColor: '#F9FAFB',
} as const;

// Browser memory for radius mode (enabled flag + draft/default center + miles), so it's
// retained across disengage/re-engage, toggling off, and reloads. Only the Radius pill
// turns the mode off.
const RADIUS_STORAGE_KEY = 'murmur_radius_mode_v1';
const PENDING_SEARCH_STORAGE_KEY = 'murmur_pending_search';
const SEARCH_TO_CAMPAIGN_TRANSITION_KEY = 'murmur_search_to_campaign_transition';
const SEARCH_TO_CAMPAIGN_TRANSITION_BODY_CLASS =
	'murmur-search-to-campaign-transitioning';
const ALL_CONTACTS_MAP_PARAM = 'allContacts';

// Bumped once per campaign-tab → search mount (the `instant=1` URL flag). The persistent Mapbox
// map is a long-lived singleton, so a boolean "instant" prop would only fire on the first switch;
// a fresh nonce per mount re-arms the instant (duration-0) fit on every subsequent switch.
let instantTabFitNonceCounter = 0;

type CuratedUrlArgs = {
	lat: number | null;
	lon: number | null;
	radiusKm: number | null;
	category: string | null;
	area: string | null;
	state: string | null;
} | null;

type FreeTextUrlArgs = {
	lat: number | null;
	lon: number | null;
	radiusKm: number | null;
	strictRadius: boolean;
	keywordMode?: boolean;
	profile?: boolean;
} | null;

type PendingDashboardSearch = {
	query: string;
	fromCampaignId: string | null;
};

type MapPanelResultsSnapshot = {
	contacts: ContactWithName[];
	baseContactIds: number[];
	whatValue: string;
	whereValue: string;
	isRestaurantsSearch: boolean;
	isCoffeeShopsSearch: boolean;
	isMusicVenuesSearch: boolean;
	isMusicFestivalsSearch: boolean;
	isWeddingPlannersSearch: boolean;
};

type FolderMoveNotice = {
	count: number;
	folderName: string;
	phase: 'moving' | 'complete' | 'exiting';
};

const parsePendingDashboardSearch = (raw: string): PendingDashboardSearch => {
	try {
		const parsed = JSON.parse(raw) as {
			query?: unknown;
			fromCampaignId?: unknown;
		};
		if (parsed && typeof parsed === 'object' && typeof parsed.query === 'string') {
			return {
				query: parsed.query,
				fromCampaignId:
					typeof parsed.fromCampaignId === 'string' ? parsed.fromCampaignId : null,
			};
		}
	} catch {
		// Legacy payloads were plain query strings.
	}

	return { query: raw, fromCampaignId: null };
};

// Serializes curated-mode args onto the given URLSearchParams under short, shared keys.
// Pass `null` to strip them (e.g. when switching back to a regular text search).
const writeCuratedParams = (params: URLSearchParams, args: CuratedUrlArgs): void => {
	if (!args) {
		for (const key of CURATED_URL_PARAM_KEYS) params.delete(key);
		return;
	}
	params.set('pick', '1');
	if (args.area) params.set('area', args.area);
	else params.delete('area');
	if (args.state) params.set('state', args.state);
	else params.delete('state');
	if (args.category) params.set('cat', args.category);
	else params.delete('cat');
	if (args.lat != null) params.set('lat', String(args.lat));
	else params.delete('lat');
	if (args.lon != null) params.set('lon', String(args.lon));
	else params.delete('lon');
	if (args.radiusKm != null) params.set('r', String(args.radiusKm));
	else params.delete('r');
};

// Same shape as writeCuratedParams but for free-text "Search Anything" runs. The query string
// itself already lives in `search`; these extra params just flag the URL so the rehydration
// path knows to look in the free-text session cache (instead of falling through to the
// regular /api/contacts vector search, which is a different endpoint with different scoring).
const writeFreeTextParams = (params: URLSearchParams, args: FreeTextUrlArgs): void => {
	if (!args) {
		for (const key of FREETEXT_URL_PARAM_KEYS) params.delete(key);
		return;
	}
	params.set('ft', '1');
	if (args.lat != null) params.set('ftLat', String(args.lat));
	else params.delete('ftLat');
	if (args.lon != null) params.set('ftLon', String(args.lon));
	else params.delete('ftLon');
	if (args.radiusKm != null) params.set('ftR', String(args.radiusKm));
	else params.delete('ftR');
	if (args.strictRadius) params.set('ftStrict', '1');
	else params.delete('ftStrict');
	if (args.keywordMode) params.set('ftKeyword', '1');
	else params.delete('ftKeyword');
	if (args.profile) params.set('ftProfile', '1');
	else params.delete('ftProfile');
};

const extractStateAbbrFromSearchQuery = (query: string): string | null => {
	// Search queries are typically formatted like: "[Promotion] Radio Stations (Maine)"
	// or "[Booking] Venues (Portland, ME)". We only infer state from the parenthetical
	// to avoid false positives (e.g. the word "in" -> "IN").
	if (!query) return null;
	const match = query.match(/\(([^)]+)\)/);
	const locationText = match?.[1]?.trim();
	if (!locationText) return null;

	const stateCandidate = locationText.includes(',')
		? locationText.split(',').pop()?.trim() || ''
		: locationText;
	if (!stateCandidate) return null;

	const abbr = getStateAbbreviation(stateCandidate).trim().toUpperCase();
	return /^[A-Z]{2}$/.test(abbr) ? abbr : null;
};

const extractWhatFromSearchQuery = (query: string): string | null => {
	// Typical formats:
	// - "[Promotion] Radio Stations (Maine)"
	// - "[Booking] Music Venues (Portland, ME)"
	// Also support the legacy "in" format used by some deep links: "[Booking] X in Y"
	if (!query) return null;
	let s = query.trim();
	if (!s) return null;

	// Remove leading "[...]" (Why)
	s = s.replace(/^\[[^\]]+\]\s*/i, '');
	// Remove trailing "(...)" (Where)
	s = s.replace(/\s*\([^)]*\)\s*$/, '');
	// Remove trailing " in ..." if present
	s = s.replace(/\s+in\s+.+$/i, '').trim();

	return s || null;
};

const extractWhereFromSearchQuery = (query: string): string | null => {
	// Typical formats:
	// - "[Promotion] Radio Stations (Maine)"
	// - "[Booking] Music Venues (Portland, ME)"
	// Also support legacy "in" format: "[Booking] X in Y"
	if (!query) return null;
	const s = query.trim();
	if (!s) return null;

	// Prefer a trailing "(...)" (our canonical format)
	const parenMatch = s.match(/\(([^)]+)\)\s*$/);
	const parenValue = parenMatch?.[1]?.trim();
	if (parenValue) return parenValue;

	// Fallback: "... in <where>"
	const inMatch = s.match(/\s+in\s+(.+)$/i);
	const inValue = inMatch?.[1]?.trim();
	return inValue || null;
};

const extractWhyFromSearchQuery = (query: string): string | null => {
	// Typical formats:
	// - "[Promotion] ..."
	// - "[Booking] ..."
	if (!query) return null;
	const s = query.trim();
	if (!s) return null;

	const m = s.match(/^\[([^\]]+)\]/);
	const tag = m?.[1]?.trim();
	return tag ? `[${tag}]` : null;
};

const parseCategorySearchQuery = (
	query: string
): {
	why: string;
	what: string;
	where: string;
	isCategorySearch: boolean;
} => {
	const why = extractWhyFromSearchQuery(query) || '';
	const what = extractWhatFromSearchQuery(query) || '';
	const where = extractWhereFromSearchQuery(query) || '';

	return {
		why,
		what,
		where,
		isCategorySearch: Boolean(why && (what || where)),
	};
};

type MapTopSearchDisplay =
	| { kind: 'curated'; label: string }
	| { kind: 'freeText'; label: string }
	| {
			kind: 'category';
			what: string;
			where: string;
			whereLabel: string;
			label: string;
	  };

const formatMapTopSearchWhereLabel = (where: string): string => {
	const trimmed = where.trim();
	if (!trimmed) return '';
	return /^in\s+/i.test(trimmed) ? trimmed : `in ${trimmed}`;
};

const clampNumber = (n: number, min: number, max: number): number => {
	return Math.min(max, Math.max(min, n));
};

// Hover-revealed white pill around the "X/Y selected" count on the Selection
// sub-panel header. The count text remains visible; the backing + X reveal on hover.
const SelectionCountPill = ({
	label,
	onClear,
	disabled = false,
	className,
	onUndo,
	canUndo = false,
}: {
	label: string;
	onClear: () => void;
	disabled?: boolean;
	className?: string;
	onUndo?: () => void;
	canUndo?: boolean;
}) => {
	const hasPositionClass = /\b(?:absolute|relative|fixed|sticky)\b/.test(
		className ?? ''
	);

	return (
		<div
			className={`group ${hasPositionClass ? '' : 'relative'} flex items-center justify-center gap-[3px] ${className ?? ''}`}
			style={{
				width: '138px',
				height: '20px',
				borderRadius: '9px',
			}}
		>
			{/* Undo last selection — revealed on hover of the pill. Reuses the shared
			    UndoIcon (same glyph as the prompt-suggestions undo control). */}
			{onUndo && (
				<button
					type="button"
					aria-label="Undo last selection"
					title="Undo last selection"
					onClick={(e) => {
						e.stopPropagation();
						if (!canUndo) return;
						onUndo();
					}}
					disabled={!canUndo}
					className={`absolute left-full top-1/2 z-10 ml-[6px] flex -translate-y-1/2 items-center justify-center border-0 p-0 leading-none opacity-0 transition-opacity duration-150 group-hover:opacity-50 focus-visible:opacity-50 ${
						canUndo ? 'cursor-pointer' : 'cursor-default'
					}`}
					style={{
						width: '21px',
						height: '20px',
						borderRadius: '7px',
						background: '#FFF',
					}}
				>
					<UndoIcon
						width="14"
						height="14"
						className={canUndo ? '' : 'opacity-40'}
					/>
				</button>
			)}
			<span
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-70 group-focus-within:opacity-70"
				style={{
					borderRadius: '9px',
					background: '#FFF',
				}}
			/>
			<span className="relative z-10 translate-x-[3px] font-inter text-[13px] font-medium text-black leading-none whitespace-nowrap">
				{label}
			</span>
			<button
				type="button"
				aria-label="Deselect all"
				onClick={(e) => {
					e.stopPropagation();
					if (disabled) return;
					onClear();
				}}
				disabled={disabled}
				className={`relative z-10 flex h-[18px] w-[18px] translate-x-[5px] flex-shrink-0 items-center justify-center border-0 bg-transparent p-0 leading-none opacity-0 transition-opacity duration-150 ${
					disabled
						? 'cursor-default group-hover:opacity-40 group-focus-within:opacity-40'
						: 'cursor-pointer group-hover:opacity-100 group-focus-within:opacity-100'
				}`}
			>
				<SelectionCountClearIcon />
			</button>
		</div>
	);
};

const SelectionDraftingProgressBar = ({
	completed,
	total,
	isCollapsed,
	onToggleCollapsed,
	className,
}: {
	completed: number;
	total: number;
	isCollapsed: boolean;
	onToggleCollapsed: () => void;
	className?: string;
}) => {
	const safeTotal = Math.max(0, total);
	const safeCompleted = safeTotal > 0 ? Math.min(completed, safeTotal) : completed;

	return (
		<div
			className={`flex items-center ${className ?? ''}`}
			style={{
				height: 24,
				backgroundColor: '#9AC3FF',
				borderTop: '2px solid #000000',
				borderBottom: '2px solid #000000',
			}}
		>
			<div className="pl-[10px] font-inter text-[13px] font-semibold leading-none text-black">
				Drafting
			</div>
			<div className="ml-[12px] font-inter text-[13px] font-medium leading-none text-black">
				{safeCompleted}/{safeTotal}
			</div>
			<button
				type="button"
				onClick={onToggleCollapsed}
				className="ml-auto mr-[9px] flex items-center justify-center border-0 bg-transparent p-0"
				style={{ width: 22, height: 22 }}
				aria-label={isCollapsed ? 'Expand drafting deck' : 'Collapse drafting deck'}
			>
				<LegacyInwardExpandIcon className="text-black" />
			</button>
		</div>
	);
};

const MAP_RESULTS_BOTTOM_SEARCH_BOX = {
	width: 474,
	height: 38,
	activeWidth: 472,
	activeHeight: 80,
	activeMaxHeight: 114,
	borderRadius: 10.863,
	rightSlotWidth: 57,
	rightSlotHeight: 36,
	textRowHeight: 36,
	textLineHeight: 20,
	textVerticalPadding: 14,
	bottomOffset: 89,
	borderWidth: 2,
	borderColor: '#000000',
	backgroundColor: '#FFFFFF',
	rightSlotBackgroundColor: '#A6C5F3',
	rightSlotHoverBackgroundColor: '#95B8EA',
	rightSlotActiveBackgroundColor: '#86A8DB',
	opacity: 0.8,
} as const;

// Map-view chrome width breakpoints, in *layout px* (window.innerWidth ÷ the map-view
// zoom — the chrome lays out under the html `zoom` var, so raw-px thresholds would
// fire at different visual states per monitor). Below MID the centered top assembly
// (~616px visual) collides with the right results panel footprint, so the centered
// chrome re-centers over the map strip left of the panel; below COMPRESSED even that
// strip is too narrow and the results panel becomes a full-width bottom sheet.
const MAP_CHROME_MID_MAX_LAYOUT_WIDTH_PX = 1490;
const MAP_CHROME_COMPRESSED_MAX_LAYOUT_WIDTH_PX = 1080;

// Cinematic boot splash over the cold-loading map: minimum on-screen time, fade-out
// duration, and a safety cap that dismisses the splash even if Mapbox errors or never
// loads. The desktop reveal waits for the persistent map's full readiness signal,
// then the loading chrome fades away without animating the SVG/logo morph.
const DASHBOARD_BOOT_MIN_VISIBLE_MS = 0;
const DASHBOARD_BOOT_FADE_MS = 800;
const DASHBOARD_BOOT_MAX_WAIT_MS = 10000;
type DashboardBootPhase = 'active' | 'fading' | 'done';

const INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX = {
	width: 418,
	height: 39,
	activeMaxHeight: 140,
	borderRadius: 26,
	borderWidth: 2,
	borderColor: '#000000',
	backgroundColor: 'rgba(254, 254, 254, 0.74)',
	buttonSize: 31,
	buttonInset: 4,
	buttonRadius: 264,
	buttonBackgroundColor: '#368FED',
	buttonIconColor: '#9AE4FF',
	restingOpacity: 0.2,
	activeOpacity: 1,
	bottomOffset: 14,
} as const;

const INITIAL_DASHBOARD_ACTIVE_SEARCH_SUGGESTIONS = [
	{ label: 'Wineries in New York', opacity: 0.3 },
	{ label: 'Breweries in New Jersey', opacity: 0.5 },
	{ label: 'Music venues in Pennsylvania', opacity: 0.7 },
] as const;

type InitialDashboardSearchSuggestionState = {
	name: string;
	abbr: string;
};

type InitialDashboardSearchSuggestionLocation = {
	city: string;
	state: InitialDashboardSearchSuggestionState;
	label: string;
};

type InitialDashboardSearchSuggestionSeed = {
	label: string;
	state: InitialDashboardSearchSuggestionState;
	location?: InitialDashboardSearchSuggestionLocation;
};

type LiveMusicSearchSuggestionTemplate = {
	label: string;
	keywords: readonly string[];
};

type LiveMusicSearchSuggestionCategory = {
	key: string;
	label: string;
	baseScore: number;
	keywords: readonly string[];
	templates: readonly LiveMusicSearchSuggestionTemplate[];
};

type SearchSuggestionsApiResponse = {
	suggestions?: Array<{
		label?: unknown;
		state?: { name?: unknown; abbr?: unknown };
	}>;
	location?: {
		city?: unknown;
		region?: unknown;
		nearbyStates?: Array<{ name?: unknown; abbr?: unknown }>;
	};
};

const INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT =
	INITIAL_DASHBOARD_ACTIVE_SEARCH_SUGGESTIONS.length;

const DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_STATES = [
	{ name: 'New York', abbr: 'NY' },
	{ name: 'New Jersey', abbr: 'NJ' },
	{ name: 'Pennsylvania', abbr: 'PA' },
] as const satisfies readonly InitialDashboardSearchSuggestionState[];

const DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_LOCATIONS = [
	{
		city: 'New York',
		state: DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_STATES[0],
		label: 'New York, NY',
	},
	{
		city: 'Newark',
		state: DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_STATES[1],
		label: 'Newark, NJ',
	},
	{
		city: 'Philadelphia',
		state: DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_STATES[2],
		label: 'Philadelphia, PA',
	},
] as const satisfies readonly InitialDashboardSearchSuggestionLocation[];

const AMBIGUOUS_STATE_ABBR_TOKENS = new Set(['hi', 'in', 'me', 'or']);

const INITIAL_DASHBOARD_SEARCH_LOCATION_ALIASES: Record<string, readonly string[]> = {
	'New York, NY': ['nyc', 'new york city'],
	'Los Angeles, CA': ['la'],
	'Philadelphia, PA': ['philly'],
	'San Francisco, CA': ['sf'],
	'Portland, OR': ['pdx'],
};

const LIVE_MUSIC_GENERIC_SUGGESTION_KEYWORDS = [
	'live music',
	'music',
	'booking',
	'book',
	'bands',
	'band',
	'acts',
	'act',
	'shows',
	'show',
	'gigs',
	'gig',
	'concerts',
	'concert',
	'touring',
	'open mic',
	'acoustic',
	'local music',
] as const;

const LIVE_MUSIC_SEARCH_SUGGESTION_CATEGORIES = [
	{
		key: 'wineries',
		label: 'Wineries',
		baseScore: 7.6,
		keywords: [
			'wineries',
			'winery',
			'vineyards',
			'vineyard',
			'wine',
			'tasting room',
			'acoustic',
			'folk',
		],
		templates: [
			{
				label: 'Wineries with acoustic nights in {state}',
				keywords: ['wineries', 'winery', 'wine', 'acoustic nights', 'acoustic'],
			},
			{
				label: 'Vineyards booking live music in {state}',
				keywords: ['vineyards', 'vineyard', 'booking', 'live music'],
			},
			{
				label: 'Wine tasting rooms booking acoustic acts in {state}',
				keywords: ['wine', 'tasting room', 'booking', 'acoustic acts'],
			},
		],
	},
	{
		key: 'breweries',
		label: 'Breweries',
		baseScore: 7.3,
		keywords: [
			'breweries',
			'brewery',
			'brew',
			'beer',
			'taproom',
			'taprooms',
			'pub',
			'craft beer',
			'bands',
		],
		templates: [
			{
				label: 'Breweries with live music in {state}',
				keywords: ['breweries', 'brewery', 'beer', 'live music'],
			},
			{
				label: 'Brewery taprooms booking bands in {state}',
				keywords: ['brewery', 'taprooms', 'booking', 'bands'],
			},
			{
				label: 'Breweries with weekend shows in {state}',
				keywords: ['breweries', 'weekend', 'shows'],
			},
		],
	},
	{
		key: 'music-venues',
		label: 'Music venues',
		baseScore: 6.9,
		keywords: [
			'music venues',
			'music venue',
			'venues',
			'venue',
			'clubs',
			'club',
			'listening room',
			'listening rooms',
			'talent buyer',
			'booker',
			'booking',
			'emerging acts',
		],
		templates: [
			{
				label: 'Music venues booking emerging acts in {state}',
				keywords: ['music venues', 'booking', 'emerging acts'],
			},
			{
				label: 'Small music venues booking bands in {state}',
				keywords: ['small music venues', 'booking', 'bands'],
			},
			{
				label: 'Listening-room music venues in {state}',
				keywords: ['listening room', 'music venues'],
			},
		],
	},
	{
		key: 'coffee-shops',
		label: 'Coffee shops',
		baseScore: 6.7,
		keywords: [
			'coffee shops',
			'coffee shop',
			'coffeehouses',
			'coffeehouse',
			'cafes',
			'cafe',
			'open mic',
			'open mics',
			'singer songwriter',
			'acoustic',
		],
		templates: [
			{
				label: 'Coffee shops with open mic nights in {state}',
				keywords: ['coffee shops', 'open mic nights', 'open mic'],
			},
			{
				label: 'Coffeehouses booking acoustic sets in {state}',
				keywords: ['coffeehouses', 'booking', 'acoustic sets'],
			},
			{
				label: 'Coffee shops with singer-songwriter nights in {state}',
				keywords: ['coffee shops', 'singer songwriter', 'nights'],
			},
		],
	},
	{
		key: 'restaurants',
		label: 'Restaurants',
		baseScore: 6.6,
		keywords: [
			'restaurants',
			'restaurant',
			'dinner',
			'brunch',
			'patio',
			'bar',
			'bars',
			'local bands',
			'cover band',
		],
		templates: [
			{
				label: 'Restaurants booking local bands in {state}',
				keywords: ['restaurants', 'booking', 'local bands'],
			},
			{
				label: 'Dinner spots with live music in {state}',
				keywords: ['dinner', 'live music'],
			},
			{
				label: 'Restaurants with live music patios in {state}',
				keywords: ['restaurants', 'live music', 'patios'],
			},
		],
	},
	{
		key: 'music-festivals',
		label: 'Music festivals',
		baseScore: 6.5,
		keywords: [
			'music festivals',
			'music festival',
			'festivals',
			'festival',
			'outdoor',
			'summer',
			'community',
			'local acts',
		],
		templates: [
			{
				label: 'Music festivals booking local acts in {state}',
				keywords: ['music festivals', 'booking', 'local acts'],
			},
			{
				label: 'Outdoor music festivals in {state}',
				keywords: ['outdoor', 'music festivals'],
			},
			{
				label: 'Community music festivals booking bands in {state}',
				keywords: ['community', 'music festivals', 'booking', 'bands'],
			},
		],
	},
	{
		key: 'distilleries',
		label: 'Distilleries',
		baseScore: 6.3,
		keywords: [
			'distilleries',
			'distillery',
			'spirits',
			'whiskey',
			'cocktail',
			'tasting room',
			'weekend shows',
		],
		templates: [
			{
				label: 'Distilleries with weekend shows in {state}',
				keywords: ['distilleries', 'weekend shows'],
			},
			{
				label: 'Distillery tasting rooms booking bands in {state}',
				keywords: ['distillery', 'tasting rooms', 'booking', 'bands'],
			},
			{
				label: 'Distilleries with live music nights in {state}',
				keywords: ['distilleries', 'live music nights'],
			},
		],
	},
	{
		key: 'cideries',
		label: 'Cideries',
		baseScore: 6.1,
		keywords: ['cideries', 'cidery', 'cider', 'cider house', 'folk', 'acoustic'],
		templates: [
			{
				label: 'Cideries with folk nights in {state}',
				keywords: ['cideries', 'folk nights'],
			},
			{
				label: 'Cider houses booking acoustic acts in {state}',
				keywords: ['cider houses', 'booking', 'acoustic acts'],
			},
			{
				label: 'Cideries with live music in {state}',
				keywords: ['cideries', 'live music'],
			},
		],
	},
	{
		key: 'wedding-venues',
		label: 'Wedding venues',
		baseScore: 5.8,
		keywords: [
			'wedding venues',
			'wedding venue',
			'weddings',
			'wedding',
			'event barns',
			'event barn',
			'reception',
			'private events',
			'live bands',
		],
		templates: [
			{
				label: 'Wedding venues booking live bands in {state}',
				keywords: ['wedding venues', 'booking', 'live bands'],
			},
			{
				label: 'Event barns booking live music in {state}',
				keywords: ['event barns', 'booking', 'live music'],
			},
			{
				label: 'Wedding venues with preferred musicians in {state}',
				keywords: ['wedding venues', 'preferred musicians'],
			},
		],
	},
] as const satisfies readonly LiveMusicSearchSuggestionCategory[];

const getDefaultInitialDashboardSearchSuggestionSeeds =
	(): InitialDashboardSearchSuggestionSeed[] =>
		INITIAL_DASHBOARD_ACTIVE_SEARCH_SUGGESTIONS.map((suggestion, index) => ({
			label: suggestion.label,
			state:
				DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_STATES[index] ??
				DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_STATES[0],
			location: DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_LOCATIONS[index],
		}));

const normalizeSearchSuggestionText = (value: string): string =>
	value
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

const tokenizeSearchSuggestionText = (value: string): string[] =>
	normalizeSearchSuggestionText(value).split(' ').filter(Boolean);

const scoreSearchSuggestionKeyword = (
	normalizedQuery: string,
	queryTokens: readonly string[],
	keyword: string
): number => {
	const normalizedKeyword = normalizeSearchSuggestionText(keyword);
	if (!normalizedKeyword) return 0;

	const keywordTokens = normalizedKeyword.split(' ');
	if (normalizedQuery.includes(normalizedKeyword)) {
		return keywordTokens.length > 1 ? 6 + keywordTokens.length : 4;
	}

	if (keywordTokens.length > 1) {
		for (let start = 0; start <= queryTokens.length - keywordTokens.length; start += 1) {
			const isPhrasePrefix = keywordTokens.every((keywordToken, offset) => {
				const queryToken = queryTokens[start + offset];
				return Boolean(queryToken && keywordToken.startsWith(queryToken));
			});
			if (isPhrasePrefix) return 4 + keywordTokens.length;
		}
		return 0;
	}

	const keywordToken = keywordTokens[0];
	const matchedToken = queryTokens.find(
		(queryToken) =>
			keywordToken.startsWith(queryToken) ||
			(queryToken.length >= 3 && queryToken.startsWith(keywordToken))
	);

	if (!matchedToken) return 0;
	return matchedToken === keywordToken ? 3 : Math.max(1.2, matchedToken.length / 2);
};

const scoreSearchSuggestionKeywords = (
	normalizedQuery: string,
	queryTokens: readonly string[],
	keywords: readonly string[]
): number =>
	keywords.reduce(
		(score, keyword) =>
			score + scoreSearchSuggestionKeyword(normalizedQuery, queryTokens, keyword),
		0
	);

const coerceInitialDashboardSuggestionState = (
	value: { name?: unknown; abbr?: unknown } | null | undefined
): InitialDashboardSearchSuggestionState | null => {
	const stateName = typeof value?.name === 'string' ? value.name.trim() : '';
	const stateAbbr =
		typeof value?.abbr === 'string' ? value.abbr.trim().toUpperCase() : '';
	const canonicalName = normalizeUsStateName(stateName || stateAbbr);
	if (!canonicalName) return null;

	const canonicalAbbr = getStateAbbreviation(canonicalName).trim().toUpperCase();
	if (!/^[A-Z]{2}$/.test(canonicalAbbr)) return null;

	return {
		name: canonicalName,
		abbr: canonicalAbbr,
	};
};

const getInitialDashboardSuggestionStateFromName = (
	value: string | null | undefined
): InitialDashboardSearchSuggestionState | null =>
	coerceInitialDashboardSuggestionState({ name: value });

const formatInitialDashboardSuggestionLocationLabel = (
	city: string,
	state: InitialDashboardSearchSuggestionState
): string => `${city}, ${state.abbr}`;

const coerceInitialDashboardSuggestionLocation = (
	city: unknown,
	stateValue: unknown
): InitialDashboardSearchSuggestionLocation | null => {
	const cityName = typeof city === 'string' ? city.trim() : '';
	if (!cityName) return null;

	const stateText = typeof stateValue === 'string' ? stateValue.trim() : '';
	const state = coerceInitialDashboardSuggestionState({
		name: stateText,
		abbr: stateText,
	});
	if (!state) return null;

	return {
		city: cityName,
		state,
		label: formatInitialDashboardSuggestionLocationLabel(cityName, state),
	};
};

const parseInitialDashboardSuggestionCityLocation = (
	value: string
): InitialDashboardSearchSuggestionLocation | null => {
	const commaIndex = value.lastIndexOf(',');
	if (commaIndex <= 0) return null;

	return coerceInitialDashboardSuggestionLocation(
		value.slice(0, commaIndex),
		value.slice(commaIndex + 1)
	);
};

const dedupeInitialDashboardSuggestionStates = (
	states: readonly InitialDashboardSearchSuggestionState[]
): InitialDashboardSearchSuggestionState[] => {
	const seen = new Set<string>();
	const deduped: InitialDashboardSearchSuggestionState[] = [];

	for (const state of states) {
		if (seen.has(state.abbr)) continue;
		seen.add(state.abbr);
		deduped.push(state);
	}

	return deduped;
};

const dedupeInitialDashboardSuggestionLocations = (
	locations: readonly InitialDashboardSearchSuggestionLocation[]
): InitialDashboardSearchSuggestionLocation[] => {
	const seen = new Set<string>();
	const deduped: InitialDashboardSearchSuggestionLocation[] = [];

	for (const location of locations) {
		const key = `${normalizeSearchSuggestionText(location.city)}:${location.state.abbr}`;
		if (seen.has(key)) continue;
		seen.add(key);
		deduped.push(location);
	}

	return deduped;
};

const getAllInitialDashboardSuggestionLocations = (
	seeds: readonly InitialDashboardSearchSuggestionSeed[]
): InitialDashboardSearchSuggestionLocation[] =>
	dedupeInitialDashboardSuggestionLocations([
		...seeds
			.map((seed) => seed.location)
			.filter((location): location is InitialDashboardSearchSuggestionLocation =>
				Boolean(location)
			),
		...CITY_LOCATIONS_LIST.map(parseInitialDashboardSuggestionCityLocation).filter(
			(location): location is InitialDashboardSearchSuggestionLocation =>
				Boolean(location)
		),
	]);

const scoreInitialDashboardSuggestionState = (
	state: InitialDashboardSearchSuggestionState,
	normalizedQuery: string,
	queryTokens: readonly string[]
): number => {
	if (!normalizedQuery) return 0;

	const normalizedStateName = normalizeSearchSuggestionText(state.name);
	const normalizedAbbr = state.abbr.toLowerCase();
	const stateTokens = normalizedStateName.split(' ');
	let score = 0;

	if (normalizedQuery.length >= 3 && normalizedQuery.includes(normalizedStateName)) {
		score += 10;
	}
	if (normalizedQuery.length >= 2 && normalizedStateName.includes(normalizedQuery)) {
		score += 6;
	}

	for (let start = 0; start < queryTokens.length; start += 1) {
		const token = queryTokens[start];
		if (token === normalizedAbbr && !AMBIGUOUS_STATE_ABBR_TOKENS.has(token)) {
			score += 8;
		}

		const isStatePrefix = stateTokens.every((stateToken, offset) => {
			const queryToken = queryTokens[start + offset];
			return Boolean(
				queryToken && queryToken.length >= 2 && stateToken.startsWith(queryToken)
			);
		});
		if (isStatePrefix) score += 5 + stateTokens.length;
	}

	return score;
};

const scoreInitialDashboardSuggestionLocation = (
	location: InitialDashboardSearchSuggestionLocation,
	normalizedQuery: string,
	queryTokens: readonly string[]
): number => {
	if (!normalizedQuery) return 0;

	const normalizedCity = normalizeSearchSuggestionText(location.city);
	const normalizedLocation = normalizeSearchSuggestionText(location.label);
	const cityTokens = normalizedCity.split(' ');
	const aliasScore = scoreSearchSuggestionKeywords(
		normalizedQuery,
		queryTokens,
		INITIAL_DASHBOARD_SEARCH_LOCATION_ALIASES[location.label] ?? []
	);
	let score =
		scoreInitialDashboardSuggestionState(location.state, normalizedQuery, queryTokens) *
			0.45 +
		aliasScore * 1.4;

	if (normalizedQuery.length >= 3 && normalizedQuery.includes(normalizedCity)) {
		score += 12;
	}
	if (normalizedQuery.length >= 2 && normalizedCity.includes(normalizedQuery)) {
		score += 7;
	}
	if (normalizedQuery.length >= 3 && normalizedLocation.includes(normalizedQuery)) {
		score += 4;
	}

	for (let start = 0; start < queryTokens.length; start += 1) {
		const isCityPrefix = cityTokens.every((cityToken, offset) => {
			const queryToken = queryTokens[start + offset];
			return Boolean(
				queryToken && queryToken.length >= 2 && cityToken.startsWith(queryToken)
			);
		});
		if (isCityPrefix) score += 6 + cityTokens.length;
	}

	return score;
};

const scoreInitialDashboardSuggestionCityIntent = (
	location: InitialDashboardSearchSuggestionLocation,
	normalizedQuery: string,
	queryTokens: readonly string[]
): number => {
	if (!normalizedQuery) return 0;

	const normalizedCity = normalizeSearchSuggestionText(location.city);
	const cityTokens = normalizedCity.split(' ');
	const aliasScore = scoreSearchSuggestionKeywords(
		normalizedQuery,
		queryTokens,
		INITIAL_DASHBOARD_SEARCH_LOCATION_ALIASES[location.label] ?? []
	);
	let score = aliasScore * 1.5;

	if (normalizedQuery.length >= 3 && normalizedQuery.includes(normalizedCity)) {
		score += 12;
	}
	if (normalizedQuery.length >= 2 && normalizedCity.includes(normalizedQuery)) {
		score += 7;
	}

	for (let start = 0; start < queryTokens.length; start += 1) {
		const isCityPrefix = cityTokens.every((cityToken, offset) => {
			const queryToken = queryTokens[start + offset];
			return Boolean(
				queryToken && queryToken.length >= 2 && cityToken.startsWith(queryToken)
			);
		});
		if (isCityPrefix) score += 6 + cityTokens.length;
	}

	return score;
};

const rankInitialDashboardSuggestionStates = (
	query: string,
	seeds: readonly InitialDashboardSearchSuggestionSeed[]
): Array<{ state: InitialDashboardSearchSuggestionState; score: number }> => {
	const normalizedQuery = normalizeSearchSuggestionText(query);
	const queryTokens = tokenizeSearchSuggestionText(query);
	const seedStates = dedupeInitialDashboardSuggestionStates(
		seeds.map((seed) => seed.state)
	);
	const allStates = dedupeInitialDashboardSuggestionStates([
		...seedStates,
		...buildAllUsStateNames()
			.map(getInitialDashboardSuggestionStateFromName)
			.filter((state): state is InitialDashboardSearchSuggestionState => Boolean(state)),
	]);

	const ranked = allStates
		.map((state) => {
			const seedIndex = seedStates.findIndex(
				(seedState) => seedState.abbr === state.abbr
			);
			const seedBoost = seedIndex >= 0 ? (seedStates.length - seedIndex) * 0.2 : 0;
			return {
				state,
				score:
					scoreInitialDashboardSuggestionState(state, normalizedQuery, queryTokens) +
					seedBoost,
			};
		})
		.sort((a, b) => b.score - a.score || a.state.name.localeCompare(b.state.name));

	return ranked.slice(0, Math.max(6, INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT));
};

const rankInitialDashboardSuggestionLocations = (
	query: string,
	seeds: readonly InitialDashboardSearchSuggestionSeed[]
): Array<{ location: InitialDashboardSearchSuggestionLocation; score: number }> => {
	const normalizedQuery = normalizeSearchSuggestionText(query);
	const queryTokens = tokenizeSearchSuggestionText(query);
	const seedLocations = seeds
		.map((seed) => seed.location)
		.filter((location): location is InitialDashboardSearchSuggestionLocation =>
			Boolean(location)
		);
	const allLocations = getAllInitialDashboardSuggestionLocations(seeds);

	const ranked = allLocations
		.map((location, order) => {
			const seedIndex = seedLocations.findIndex(
				(seedLocation) =>
					seedLocation.state.abbr === location.state.abbr &&
					normalizeSearchSuggestionText(seedLocation.city) ===
						normalizeSearchSuggestionText(location.city)
			);
			const seedBoost = seedIndex >= 0 ? (seedLocations.length - seedIndex) * 0.35 : 0;
			return {
				location,
				order,
				score:
					scoreInitialDashboardSuggestionLocation(
						location,
						normalizedQuery,
						queryTokens
					) + seedBoost,
			};
		})
		.sort((a, b) => b.score - a.score || a.order - b.order);

	return ranked.slice(0, Math.max(12, INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT));
};

const scoreLiveMusicSearchSuggestionCategory = (
	category: LiveMusicSearchSuggestionCategory,
	normalizedQuery: string,
	queryTokens: readonly string[]
): number => {
	const categoryScore = scoreSearchSuggestionKeywords(
		normalizedQuery,
		queryTokens,
		category.keywords
	);
	const genericScore = scoreSearchSuggestionKeywords(
		normalizedQuery,
		queryTokens,
		LIVE_MUSIC_GENERIC_SUGGESTION_KEYWORDS
	);
	const bestTemplateScore = Math.max(
		...category.templates.map((template) =>
			scoreSearchSuggestionKeywords(normalizedQuery, queryTokens, [
				template.label.replace('{state}', ''),
				...template.keywords,
			])
		)
	);

	return (
		category.baseScore + categoryScore + genericScore * 0.35 + bestTemplateScore * 0.45
	);
};

const scoreLiveMusicSearchSuggestionTemplate = (
	template: LiveMusicSearchSuggestionTemplate,
	normalizedQuery: string,
	queryTokens: readonly string[]
): number =>
	scoreSearchSuggestionKeywords(normalizedQuery, queryTokens, [
		template.label.replace('{state}', ''),
		...template.keywords,
	]);

const buildInitialDashboardSearchSuggestions = (
	query: string,
	seeds: readonly InitialDashboardSearchSuggestionSeed[]
): string[] => {
	const normalizedQuery = normalizeSearchSuggestionText(query);
	if (!normalizedQuery) {
		return LIVE_MUSIC_SEARCH_SUGGESTION_CATEGORIES.slice(
			0,
			INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT
		).map((category, index) => {
			const state =
				seeds[index]?.state ??
				DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_STATES[index] ??
				DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_STATES[0];
			return `${category.label} in ${state.name}`;
		});
	}

	const queryTokens = tokenizeSearchSuggestionText(query);
	const rankedStates = rankInitialDashboardSuggestionStates(query, seeds);
	const rankedLocations = rankInitialDashboardSuggestionLocations(query, seeds);
	const rankedCityLocations = rankedLocations
		.map((entry) => ({
			...entry,
			cityScore: scoreInitialDashboardSuggestionCityIntent(
				entry.location,
				normalizedQuery,
				queryTokens
			),
		}))
		.sort((a, b) => b.cityScore - a.cityScore || b.score - a.score);
	const focusedLocation =
		rankedCityLocations.find((entry) => entry.cityScore >= 7)?.location ?? null;
	const focusedState =
		focusedLocation?.state ??
		rankedStates.find((entry) => entry.score >= 5)?.state ??
		null;
	const rankedCategories = LIVE_MUSIC_SEARCH_SUGGESTION_CATEGORIES.map((category) => ({
		category,
		score: scoreLiveMusicSearchSuggestionCategory(category, normalizedQuery, queryTokens),
	})).sort((a, b) => b.score - a.score || b.category.baseScore - a.category.baseScore);
	const focusedCategory =
		rankedCategories[0] &&
		rankedCategories[0].score >= rankedCategories[0].category.baseScore + 2 &&
		rankedCategories[0].score - (rankedCategories[1]?.score ?? 0) >= 1.4
			? rankedCategories[0].category
			: null;
	const states = focusedState
		? [focusedState, ...rankedStates.map((entry) => entry.state)]
		: rankedStates.map((entry) => entry.state);
	const statePool = dedupeInitialDashboardSuggestionStates(states).slice(
		0,
		INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT
	);
	const fallbackStatePool =
		statePool.length > 0 ? statePool : seeds.map((seed) => seed.state);
	const shouldUseSpecificLocations = Boolean(focusedLocation);
	const specificLocationPool = shouldUseSpecificLocations
		? dedupeInitialDashboardSuggestionLocations([
				...(focusedLocation ? [focusedLocation] : []),
				...rankedCityLocations
					.filter((entry) => entry.location.state.abbr === focusedState?.abbr)
					.map((entry) => entry.location),
				...rankedCityLocations.map((entry) => entry.location),
			]).slice(0, Math.max(6, INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT))
		: [];
	const fallbackSearchTargets: Array<{
		state: InitialDashboardSearchSuggestionState;
		location?: InitialDashboardSearchSuggestionLocation;
	}> = shouldUseSpecificLocations
		? specificLocationPool.map((location) => ({ location, state: location.state }))
		: fallbackStatePool.map((state) => ({ state }));
	const candidates: Array<{
		label: string;
		categoryKey: string;
		stateAbbr: string;
		score: number;
	}> = [];

	for (const { category, score: categoryScore } of rankedCategories) {
		const templateScores = category.templates
			.map((template, index) => ({
				index,
				score: scoreLiveMusicSearchSuggestionTemplate(
					template,
					normalizedQuery,
					queryTokens
				),
			}))
			.sort((a, b) => b.score - a.score || a.index - b.index);

		if (
			shouldUseSpecificLocations &&
			focusedCategory &&
			category.key !== focusedCategory.key
		) {
			continue;
		}

		for (const [targetIndex, target] of fallbackSearchTargets.entries()) {
			const state = target.state;
			const stateScore =
				rankedStates.find((entry) => entry.state.abbr === state.abbr)?.score ?? 0;
			const locationScore = target.location
				? (rankedLocations.find(
						(entry) =>
							entry.location.state.abbr === target.location?.state.abbr &&
							normalizeSearchSuggestionText(entry.location.city) ===
								normalizeSearchSuggestionText(target.location?.city ?? '')
					)?.score ?? 0)
				: 0;

			for (const { score: templateScore, index: templateIndex } of templateScores) {
				candidates.push({
					label: target.location
						? `${category.label} in ${target.location.label}`
						: `${category.label} in ${state.name}`,
					categoryKey: category.key,
					stateAbbr: state.abbr,
					score:
						categoryScore +
						stateScore * 0.8 +
						locationScore * 0.9 +
						templateScore * 0.7 -
						targetIndex * 0.2 -
						templateIndex * 0.04,
				});
			}
		}
	}

	const allowRepeatedCategory = Boolean(focusedCategory);
	const allowRepeatedState = Boolean(focusedState);
	const selected: string[] = [];
	const usedLabels = new Set<string>();
	const usedCategories = new Set<string>();
	const usedStates = new Set<string>();
	const sortedCandidates = candidates.sort((a, b) => b.score - a.score);

	for (const candidate of sortedCandidates) {
		if (selected.length >= INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT) break;
		if (usedLabels.has(candidate.label)) continue;
		if (!allowRepeatedCategory && usedCategories.has(candidate.categoryKey)) continue;
		if (!allowRepeatedState && usedStates.has(candidate.stateAbbr)) continue;

		selected.push(candidate.label);
		usedLabels.add(candidate.label);
		usedCategories.add(candidate.categoryKey);
		usedStates.add(candidate.stateAbbr);
	}

	for (const candidate of sortedCandidates) {
		if (selected.length >= INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT) break;
		if (usedLabels.has(candidate.label)) continue;

		selected.push(candidate.label);
		usedLabels.add(candidate.label);
	}

	return selected.length === INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT
		? selected
		: LIVE_MUSIC_SEARCH_SUGGESTION_CATEGORIES.slice(
				0,
				INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT
			).map((category, index) => {
				const state =
					seeds[index]?.state ??
					DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_STATES[index] ??
					DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_STATES[0];
				return `${category.label} in ${state.name}`;
			});
};

// Resolution-aware zoom for the fullscreen map view. Delegates to the shared chrome
// zoom module (src/utils/murmurChromeZoom.ts) so the dashboard map-view chrome lands
// at exactly the same physical size as the campaign page chrome on every monitor.
const DASHBOARD_MAP_ZOOM_DEFAULT = MURMUR_CHROME_ZOOM_DEFAULT;
// Baseline zoom for the non-map dashboard (initial/hero + results views). The fullscreen
// map view keeps its own resolution-aware zoom anchored to DASHBOARD_MAP_ZOOM_DEFAULT.
// At/above the 1512×945 anchor the zoom grows with the monitor (so the layout doesn't
// shrink into a sea of map). Below the anchor it HOLDS at 0.81 — the hero keeps its
// full size and the map margin around it compresses — until the window can no longer
// fit the hero cluster's fixed footprint; from there it scales down just enough to
// fit, so the content stays as big as the window allows while remaining one uniform
// unit (every hero element is anchor-frozen px).
const DASHBOARD_INITIAL_ZOOM = 0.81;
const DASHBOARD_INITIAL_ZOOM_ANCHOR_W = 1512;
const DASHBOARD_INITIAL_ZOOM_ANCHOR_H = 945;
const DASHBOARD_INITIAL_ZOOM_MAX = 1.15;
const DASHBOARD_INITIAL_ZOOM_MIN = 0.2;
// Hero cluster footprint in CSS px at zoom 1. Width: the search input-group is 603px
// × its 1.08 inner scale ≈ 651, plus breathing room. Height: logo offset through the
// strategy box bottom ≈ 761, plus the Ask-Anything bar pinned underneath.
const DASHBOARD_HERO_FIT_W = 700;
const DASHBOARD_HERO_FIT_H = 840;
const computeDashboardInitialZoomForViewport = (w: number, h: number): number => {
	const scale = Math.min(
		w / DASHBOARD_INITIAL_ZOOM_ANCHOR_W,
		h / DASHBOARD_INITIAL_ZOOM_ANCHOR_H,
	);
	const grown = DASHBOARD_INITIAL_ZOOM * Math.max(1, scale);
	const fit = Math.min(w / DASHBOARD_HERO_FIT_W, h / DASHBOARD_HERO_FIT_H);
	return clampNumber(
		Math.min(grown, fit),
		DASHBOARD_INITIAL_ZOOM_MIN,
		DASHBOARD_INITIAL_ZOOM_MAX,
	);
};

const MAP_SELECT_GRAB_LEFT_PX = 26;
// The rail view-scale curve lives in murmurChromeZoom.ts (computeMapSelectGrabViewScale),
// shared with the campaign page and the side-shift centering math.
const MAP_VIEW_SIDE_PANEL_VISUAL_TOP_PX = 106;
const MAP_VIEW_SIDE_PANEL_BOTTOM_GAP_PX = 20;
const MAP_VIEW_SIDE_PANEL_GROUP_NUDGE_UP_PX = 24;
// Full row-following hover card height: abridged card (312.713) + 13 gap + the
// Description box at its EXPANDED height incl. the "Press Tab" pill (415 + 9 gap +
// 23 pill). Reserving the expanded height keeps the card's y stable across Tab
// toggles so a low row's Description box never gets clipped at the viewport bottom.
const MAP_PANEL_HOVER_RESEARCH_CARD_HEIGHT_PX = 312.713 + 13 + 415 + 9 + 23; // ≈ 773
const MAP_PANEL_ABRIDGED_RESEARCH_GAP_PX = 13;
const MAP_PANEL_ABRIDGED_RESEARCH_CLEAR_DELAY_MS = 220;
// Marker-hover research group (abridged card + Description box docked left/right).
const MAP_MARKER_RESEARCH_GROUP_WIDTH_PX = 272.425; // abridged card width
// ceil(312.713 max abridged card height) + 13 gap — fixed so the Description box
// never shifts vertically with the card's variable band count.
const MAP_MARKER_RESEARCH_DESCRIPTION_TOP_PX = 326;
const MAP_MARKER_RESEARCH_LEFT_DOCK_LEFT_PX = 110; // clears the left select/grab rail
const MAP_MARKER_RESEARCH_DOCK_FLIP_MARGIN_PX = 24;
const MAP_VIEW_CAMPAIGN_HEADER_HEIGHT_PX = 59;
const MAP_VIEW_CAMPAIGN_HEADER_GAP_PX = 13;
// Floor height for the Search Results sub-panel when the Selection sub-panel is fully
// expanded: header (50px) + category toolbar (≈55px @ bottom-9) + breathing room. Below this
// the Selection cap stops growing so the toolbar (and the bottom CTA) stay visible.
const MAP_VIEW_SEARCH_RESULTS_MIN_HEIGHT_PX = 125;
// Hold the Selection panel to ~50% height until Search Results is down to the last few rows,
// then allow the existing “compress results, expand selection” behavior.
const MAP_VIEW_SEARCH_RESULTS_COMPRESS_THRESHOLD = 5;
// Keep both map side panels visually pinned after the dashboard root zoom is applied.
// The side-shift var (written by the map-view zoom effect) lowers the whole side
// chrome toward vertical center on tall monitors; 0px on the 1080p baseline.
const MAP_VIEW_SIDE_PANEL_TOP_CSS = `calc((${MAP_VIEW_SIDE_PANEL_VISUAL_TOP_PX}px + var(${DASHBOARD_SIDE_SHIFT_VAR}, 0px)) / var(--murmur-dashboard-zoom, ${DASHBOARD_MAP_ZOOM_DEFAULT}))`;
const MAP_VIEW_SIDE_PANEL_GROUP_TOP_CSS = `calc((${MAP_VIEW_SIDE_PANEL_VISUAL_TOP_PX}px - ${MAP_VIEW_SIDE_PANEL_GROUP_NUDGE_UP_PX}px + var(${DASHBOARD_SIDE_SHIFT_VAR}, 0px)) / var(--murmur-dashboard-zoom, ${DASHBOARD_MAP_ZOOM_DEFAULT}))`;
const MAP_SELECT_GRAB_VISUAL_TOP_NUDGE_UP_CSS = `calc(4px / var(--murmur-dashboard-zoom, ${DASHBOARD_MAP_ZOOM_DEFAULT}))`;
const MAP_SELECT_GRAB_TOP_EXTENT_PX =
	MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
	MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
	MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
	MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
	MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX +
	MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
	MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX +
	MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX;
const MAP_SELECT_GRAB_TOTAL_HEIGHT_PX =
	MAP_SELECT_GRAB_TOP_EXTENT_PX + MAP_SELECT_GRAB_TOOL_COLLAPSED_HEIGHT_PX;
// Zoom-control ladder + converters live in @/utils/mapZoomControlLadder (shared
// with the campaign page); the ladder is rebased at runtime off the map's
// viewport-proportional minimum zoom.
type MapZoomControlRequest = { zoom: number; nonce: number; isDragging?: boolean };

const MAP_RESULTS_BOTTOM_CATEGORY_SEARCH_BOX = {
	width: 401,
	height: 67,
	innerWidth: 329,
	innerHeight: 60,
	submitWidth: 61,
	submitHeight: 58,
	borderRadius: 8,
	borderWidth: 2,
	borderColor: '#000000',
	backgroundColor: '#FFFFFF',
	submitBackgroundColor: '#95CEFF',
	submitHoverBackgroundColor: '#82C4FA',
	submitActiveBackgroundColor: '#71B5ED',
	opacity: 0.9,
} as const;

const MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_BOX = {
	width: 301,
	compactWidth: 157,
	height: 55,
	gapToSearchBar: 20,
	borderRadius: 6,
	borderWidth: 2,
	borderColor: '#000000',
	backgroundColor: '#FFFFFF',
} as const;

const MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_SEGMENT_BOX = {
	width: 192,
	height: 45,
	rightOffset: 3,
	borderRadius: 8,
	borderColor: '#000000',
	advancedWidth: 49,
	dividerWidth: 2,
	internalDividerWidth: 1,
	segmentWidth: 47,
	advancedBackgroundColor: '#FD7171',
	profileBackgroundColor: '#E0F3FE',
	profileActiveBackgroundColor: '#71C9FD',
	keywordBackgroundColor: '#EEF5FF',
	keywordActiveBackgroundColor: '#71A9FD',
	radiusBackgroundColor: '#FBF5DE',
	radiusActiveBackgroundColor: '#EED56E',
} as const;

const MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_LEFT_TILE_BOX = {
	size: 45,
	leftOffset: 4,
	gap: 4,
	borderRadius: 8,
	dailyMixBackgroundColor: '#15D3344A',
	categoryBackgroundColor: '#ACE1FF5E',
	advancedCompactBackgroundColor: 'rgba(253, 113, 113, 0.50)',
	selectedBackgroundColor: '#EF6F7D',
	categorySelectedBackgroundColor: '#ACE1FF',
	selectedBorderColor: '#000000',
	selectedBorderWidth: 2,
} as const;

const MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_ICON_LAYOUT = {
	forYou: {
		width: 29,
		height: 34,
		translateX: 1,
		translateY: 0.8,
	},
	category: {
		width: 35,
		height: 34,
		translateX: 0,
		activeTranslateX: -0.5,
		translateY: 2.2,
		activeTranslateY: 5.2,
	},
	advanced: {
		width: 38,
		height: 40,
		translateX: 0,
		translateY: 3,
	},
	profile: {
		width: 30,
		height: 37,
		translateX: 0,
		translateY: 0,
	},
	keyword: {
		width: 39,
		height: 37,
		translateX: 0,
		translateY: 2,
	},
	radius: {
		width: 31,
		height: 37,
		translateX: -2,
		translateY: 1,
	},
} as const;

type MapBottomSearchFollowupSelection = 'for-you' | 'category' | null;
type MapBottomSearchFollowupPreview = MapBottomSearchFollowupSelection | 'anything';

type MapBottomSearchBarProps = {
	value: string;
	isExpanded: boolean;
	activeHeight: number;
	inputRef: RefObject<HTMLTextAreaElement | null>;
	mode?: 'anything' | 'category' | 'for-you';
	appearance?: 'default' | 'initial-dashboard';
	/** When true (anything mode), shows the gold radius pin before the placeholder. */
	radiusEnabled?: boolean;
	/** When true (anything mode), shows the profile avatar before the placeholder. */
	profileModeEnabled?: boolean;
	/** When true (anything mode), switches placeholder/copy to direct keyword search. */
	keywordModeEnabled?: boolean;
	categoryWhatValue?: string;
	categoryWhereValue?: string;
	activeCategoryField?: 'what' | 'where' | null;
	onActivate: () => void;
	onSubmit: () => void;
	onValueChange: (value: string) => void;
	onActiveChange: (active: boolean) => void;
	onCategoryFieldFocus?: (field: 'what' | 'where') => void;
	onCategoryWhatChange?: (value: string) => void;
	onCategoryWhereChange?: (value: string) => void;
	onCategoryWhatEnter?: () => void;
	onCategorySubmit?: () => void | Promise<void>;
	onForYouSubmit?: () => void | Promise<void>;
};

const MapBottomSearchBar = memo(
	({
		value,
		isExpanded,
		activeHeight,
		inputRef,
		mode = 'anything',
		appearance = 'default',
		radiusEnabled = false,
		profileModeEnabled = false,
		keywordModeEnabled = false,
		categoryWhatValue = '',
		categoryWhereValue = '',
		activeCategoryField = null,
		onActivate,
		onSubmit,
		onValueChange,
		onActiveChange,
		onCategoryFieldFocus,
		onCategoryWhatChange,
		onCategoryWhereChange,
		onCategoryWhatEnter,
		onCategorySubmit,
		onForYouSubmit,
	}: MapBottomSearchBarProps) => {
		const activeCategoryIndicatorRef = useRef<HTMLDivElement>(null);
		const prevActiveCategoryFieldRef = useRef<'what' | 'where' | null>(null);
		const categoryWhatInputRef = useRef<HTMLInputElement>(null);
		const categoryWhereInputRef = useRef<HTMLInputElement>(null);
		const [isInitialDashboardSearchHovered, setIsInitialDashboardSearchHovered] =
			useState(false);
		const isInitialDashboardSearch = appearance === 'initial-dashboard';

		useLayoutEffect(() => {
			const indicator = activeCategoryIndicatorRef.current;
			if (!indicator) return;

			gsap.killTweensOf(indicator);

			if (mode !== 'category' || !activeCategoryField) {
				gsap.set(indicator, {
					opacity: 0,
					xPercent: 0,
					scaleX: 1,
					transformOrigin: 'center center',
				});
				prevActiveCategoryFieldRef.current = null;
				return;
			}

			const nextXPercent = activeCategoryField === 'where' ? 100 : 0;
			const previousField = prevActiveCategoryFieldRef.current;

			if (!previousField) {
				gsap.set(indicator, {
					xPercent: nextXPercent,
					opacity: 1,
					scaleX: 2,
					transformOrigin:
						activeCategoryField === 'where' ? 'right center' : 'left center',
				});
				gsap.to(indicator, {
					scaleX: 1,
					duration: 0.6,
					ease: 'power2.out',
					overwrite: 'auto',
				});
				prevActiveCategoryFieldRef.current = activeCategoryField;
				return;
			}

			gsap.set(indicator, { scaleX: 1, transformOrigin: 'center center' });
			gsap.to(indicator, {
				xPercent: nextXPercent,
				duration: 0.6,
				ease: 'power2.out',
				overwrite: 'auto',
			});
			gsap.to(indicator, {
				opacity: 1,
				duration: 0.15,
				ease: 'power2.out',
				overwrite: 'auto',
			});

			prevActiveCategoryFieldRef.current = activeCategoryField;
		}, [activeCategoryField, mode]);

		useEffect(() => {
			if (mode !== 'category') return;

			if (activeCategoryField === 'what') {
				categoryWhatInputRef.current?.focus();
			} else if (activeCategoryField === 'where') {
				categoryWhereInputRef.current?.focus();
			}
		}, [activeCategoryField, mode]);

		if (mode === 'for-you') {
			return (
				<div
					aria-label="Search For You on the map"
					className="relative h-full w-full overflow-hidden pointer-events-auto"
					style={{
						borderRadius: `${MAP_RESULTS_BOTTOM_SEARCH_BOX.borderRadius}px`,
						border: `${MAP_RESULTS_BOTTOM_SEARCH_BOX.borderWidth}px solid ${MAP_RESULTS_BOTTOM_SEARCH_BOX.borderColor}`,
						backgroundColor: '#FFFFFF',
						boxSizing: 'border-box',
						cursor: 'pointer',
					}}
					onClick={() => onForYouSubmit?.()}
				>
					<div
						className="search-gradient-button absolute overflow-hidden"
						style={{
							left: '6px',
							right: '6px',
							top: '7px',
							bottom: '7px',
							borderRadius: '6px',
							border: '0.75px solid #595959',
							opacity: 0.65,
							boxSizing: 'border-box',
						}}
					/>
					<div className="absolute left-[16px] top-[17px] font-inter text-[17px] leading-none text-white">
						For You
					</div>
					<button
						type="button"
						aria-label="Submit For You search"
						className="absolute flex items-center justify-center"
						style={{
							right: '9px',
							top: '10px',
							width: '45px',
							height: '37px',
							backgroundColor: '#FFFFFF',
							borderRadius: '8px',
							border: 0,
							boxSizing: 'border-box',
							padding: 0,
							cursor: 'pointer',
						}}
						onClick={(event) => {
							event.stopPropagation();
							onForYouSubmit?.();
						}}
					>
						<MapBottomSearchArrowIcon aria-hidden="true" />
					</button>
				</div>
			);
		}

		if (mode === 'category') {
			const categoryBox = MAP_RESULTS_BOTTOM_CATEGORY_SEARCH_BOX;
			const whatLabel = categoryWhatValue.trim() || 'Add Recipients';
			const whereLabel = categoryWhereValue.trim() || 'Search Destinations';
			const isWhatActive = activeCategoryField === 'what';
			const isWhereActive = activeCategoryField === 'where';
			const hasActiveCategoryField = activeCategoryField !== null;

			return (
				<div
					aria-label="Category search on the map"
					className="map-bottom-category-search relative h-full w-full overflow-hidden pointer-events-auto"
					style={{
						borderRadius: `${categoryBox.borderRadius}px`,
						border: `${categoryBox.borderWidth}px solid ${categoryBox.borderColor}`,
						backgroundColor: categoryBox.backgroundColor,
						opacity: categoryBox.opacity,
						boxSizing: 'border-box',
					}}
				>
					<div
						className="absolute overflow-hidden"
						style={{
							left: '2px',
							top: '1.5px',
							width: `${categoryBox.innerWidth}px`,
							height: `${categoryBox.innerHeight}px`,
							borderRadius: `${categoryBox.borderRadius}px`,
							border: 0,
							backgroundColor: hasActiveCategoryField ? '#EFEFEF' : '#FFFFFF',
							boxSizing: 'border-box',
							transition: 'background-color 150ms ease',
						}}
					>
						<div
							aria-hidden="true"
							className="absolute inset-0 rounded-[8px] border-2 border-black pointer-events-none"
							style={{
								opacity: hasActiveCategoryField ? 0 : 1,
								zIndex: 1,
								boxSizing: 'border-box',
							}}
						/>
						<div
							ref={activeCategoryIndicatorRef}
							aria-hidden="true"
							className="absolute top-0 left-0 h-full w-1/2 bg-white border-2 border-black rounded-[8px] pointer-events-none"
							style={{
								opacity: 0,
								zIndex: 1,
								boxSizing: 'border-box',
								willChange: 'transform, opacity',
							}}
						/>
						<div
							className={`absolute top-0 left-0 h-full cursor-pointer overflow-hidden transition-colors duration-150 ${
								isWhatActive ? '' : 'hover:bg-black/[0.05]'
							}`}
							style={{
								width: '50%',
								borderTopLeftRadius: `${categoryBox.borderRadius - categoryBox.borderWidth}px`,
								borderBottomLeftRadius: `${categoryBox.borderRadius - categoryBox.borderWidth}px`,
								zIndex: 2,
							}}
							onMouseDown={(event) => {
								if ((event.target as HTMLElement).tagName !== 'INPUT') {
									event.preventDefault();
								}
								categoryWhatInputRef.current?.focus();
								onCategoryFieldFocus?.('what');
							}}
						>
							<div className="absolute left-[18px] top-[12px] font-medium text-[21px] leading-none text-black font-secondary pointer-events-none">
								What
							</div>
							<div className="absolute left-[18px] right-[8px] top-[37px] h-[14px] overflow-hidden">
								<input
									ref={categoryWhatInputRef}
									value={categoryWhatValue}
									onChange={(event) => onCategoryWhatChange?.(event.target.value)}
									onKeyDown={(event) => {
										event.stopPropagation();
										if (event.key === 'Enter') {
											event.preventDefault();
											onCategoryWhatEnter?.();
										}
									}}
									className="absolute inset-0 w-full bg-transparent border-0 outline-none p-0 font-semibold text-[12px] leading-[14px] text-black font-secondary"
									placeholder="Add Recipients"
									style={{
										opacity: isWhatActive ? 1 : 0,
										pointerEvents: isWhatActive ? 'auto' : 'none',
									}}
								/>
								{!isWhatActive && (
									<div
										aria-hidden="true"
										className="absolute inset-0 font-semibold text-[12px] leading-[14px] whitespace-nowrap overflow-hidden font-secondary pointer-events-none"
										style={{
											color: categoryWhatValue.trim() ? '#000000' : 'rgba(0, 0, 0, 0.42)',
											maskImage: 'linear-gradient(to right, black 82%, transparent 100%)',
											WebkitMaskImage:
												'linear-gradient(to right, black 82%, transparent 100%)',
										}}
									>
										{whatLabel}
									</div>
								)}
							</div>
						</div>
						<div
							className={`absolute top-0 right-0 h-full cursor-pointer overflow-hidden transition-colors duration-150 ${
								isWhereActive ? '' : 'hover:bg-black/[0.05]'
							}`}
							style={{
								width: '50%',
								borderTopRightRadius: `${categoryBox.borderRadius - categoryBox.borderWidth}px`,
								borderBottomRightRadius: `${categoryBox.borderRadius - categoryBox.borderWidth}px`,
								zIndex: 2,
							}}
							onMouseDown={(event) => {
								if ((event.target as HTMLElement).tagName !== 'INPUT') {
									event.preventDefault();
								}
								categoryWhereInputRef.current?.focus();
								onCategoryFieldFocus?.('where');
							}}
						>
							<div className="absolute left-[18px] top-[12px] font-medium text-[21px] leading-none text-black font-secondary pointer-events-none">
								Where
							</div>
							<div className="absolute left-[18px] right-[8px] top-[37px] h-[14px] overflow-hidden">
								<input
									ref={categoryWhereInputRef}
									value={categoryWhereValue}
									onChange={(event) => onCategoryWhereChange?.(event.target.value)}
									onKeyDown={(event) => {
										event.stopPropagation();
										if (event.key === 'Enter') {
											event.preventDefault();
											onCategorySubmit?.();
										}
									}}
									className="absolute inset-0 w-full bg-transparent border-0 outline-none p-0 font-semibold text-[12px] leading-[14px] text-black font-secondary"
									placeholder="Search Destinations"
									style={{
										opacity: isWhereActive ? 1 : 0,
										pointerEvents: isWhereActive ? 'auto' : 'none',
									}}
								/>
								{!isWhereActive && (
									<div
										aria-hidden="true"
										className="absolute inset-0 font-semibold text-[12px] leading-[14px] whitespace-nowrap overflow-hidden font-secondary pointer-events-none"
										style={{
											color: categoryWhereValue.trim()
												? '#000000'
												: 'rgba(0, 0, 0, 0.42)',
											maskImage: 'linear-gradient(to right, black 82%, transparent 100%)',
											WebkitMaskImage:
												'linear-gradient(to right, black 82%, transparent 100%)',
										}}
									>
										{whereLabel}
									</div>
								)}
							</div>
						</div>
					</div>
					<button
						type="button"
						aria-label="Submit category search"
						className="absolute flex items-center justify-center transition-colors duration-100"
						style={{
							right: '2px',
							top: '50%',
							width: `${categoryBox.submitWidth}px`,
							height: `${categoryBox.submitHeight}px`,
							transform: 'translateY(-50%)',
							backgroundColor: categoryBox.submitBackgroundColor,
							borderRadius: `${categoryBox.borderRadius}px`,
							border: 0,
							boxSizing: 'border-box',
							padding: 0,
							cursor: 'pointer',
						}}
						onMouseEnter={(event) => {
							event.currentTarget.style.backgroundColor =
								categoryBox.submitHoverBackgroundColor;
						}}
						onMouseLeave={(event) => {
							event.currentTarget.style.backgroundColor =
								categoryBox.submitBackgroundColor;
						}}
						onMouseDown={(event) => {
							event.stopPropagation();
							event.currentTarget.style.backgroundColor =
								categoryBox.submitActiveBackgroundColor;
						}}
						onMouseUp={(event) => {
							event.currentTarget.style.backgroundColor =
								categoryBox.submitHoverBackgroundColor;
						}}
						onClick={() => onCategorySubmit?.()}
					>
						<MapBottomSearchArrowIcon aria-hidden="true" />
					</button>
				</div>
			);
		}

		const anythingSearchBox = isInitialDashboardSearch
			? INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX
			: MAP_RESULTS_BOTTOM_SEARCH_BOX;
		const anythingRightReservedWidth = isInitialDashboardSearch
			? INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.buttonSize +
				INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.buttonInset +
				20
			: MAP_RESULTS_BOTTOM_SEARCH_BOX.rightSlotWidth + 28;
		// Mode icons sit before the text; nudge the textarea right so typed text
		// doesn't overlap the same leading slot.
		const radiusPinOffset = radiusEnabled && !isInitialDashboardSearch ? 22 : 0;
		const shouldShowProfilePlaceholderIcon =
			profileModeEnabled && !keywordModeEnabled && !isInitialDashboardSearch;
		const profileIconOffset = shouldShowProfilePlaceholderIcon ? 24 : 0;
		const leadingIconOffset = radiusPinOffset + profileIconOffset;
		const shouldShowKeywordPlaceholder = keywordModeEnabled && !isInitialDashboardSearch;
		const isInitialDashboardSearchActive =
			isInitialDashboardSearch &&
			(isInitialDashboardSearchHovered || isExpanded || value.trim().length > 0);

		return (
			<div
				aria-label="Search anything on the map"
				className="relative h-full w-full overflow-hidden pointer-events-auto"
				style={{
					borderRadius: `${anythingSearchBox.borderRadius}px`,
					border: `${anythingSearchBox.borderWidth}px solid ${anythingSearchBox.borderColor}`,
					backgroundColor: anythingSearchBox.backgroundColor,
					opacity: isInitialDashboardSearch
						? isInitialDashboardSearchActive
							? INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.activeOpacity
							: INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.restingOpacity
						: MAP_RESULTS_BOTTOM_SEARCH_BOX.opacity,
					boxSizing: 'border-box',
					cursor: 'text',
					transition: isInitialDashboardSearch ? 'opacity 150ms ease' : undefined,
				}}
				onMouseEnter={() => {
					if (isInitialDashboardSearch) {
						setIsInitialDashboardSearchHovered(true);
					}
				}}
				onMouseLeave={() => {
					if (isInitialDashboardSearch) {
						setIsInitialDashboardSearchHovered(false);
					}
				}}
				onMouseDown={(event) => {
					if (event.target !== inputRef.current) {
						event.preventDefault();
					}
					onActivate();
				}}
			>
				{/* Leading mode icons (profile avatar / radius pin) live in their own
				    persistent slot so they stay visible while typing. They must NOT be
				    nested in the placeholder block below, which unmounts the moment the
				    box has any text. */}
				{(shouldShowProfilePlaceholderIcon ||
					(radiusEnabled && !isInitialDashboardSearch)) && (
					<div
						aria-hidden="true"
						className="absolute flex items-center gap-[4px] pointer-events-none"
						style={{
							top: 0,
							left: '14px',
							height: `${MAP_RESULTS_BOTTOM_SEARCH_BOX.textRowHeight}px`,
						}}
					>
						{shouldShowProfilePlaceholderIcon && (
							<MapBottomSearchProfileIcon
								aria-hidden="true"
								viewBox="0 0 28 28"
								textColor="transparent"
								iconColor="#3498DB"
								style={{
									width: 20,
									height: 20,
									flexShrink: 0,
									display: 'block',
								}}
							/>
						)}
						{radiusEnabled && !isInitialDashboardSearch && (
							<MapSearchRadiusPinIcon
								aria-hidden="true"
								style={{
									width: 15,
									height: 19,
									flexShrink: 0,
									display: 'block',
								}}
							/>
						)}
					</div>
				)}
				{value.length === 0 && (
					<div
						aria-hidden="true"
						className="absolute flex items-center gap-[4px] font-inter text-[16px] leading-none text-black pointer-events-none"
						style={{
							top: 0,
							left: isInitialDashboardSearch ? '24px' : `${14 + leadingIconOffset}px`,
							right: `${anythingRightReservedWidth}px`,
							height: isInitialDashboardSearch
								? `${INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.height - 4}px`
								: `${MAP_RESULTS_BOTTOM_SEARCH_BOX.textRowHeight}px`,
							fontSize: isInitialDashboardSearch ? '16px' : undefined,
							fontWeight: isInitialDashboardSearch ? 500 : undefined,
						}}
					>
						{shouldShowKeywordPlaceholder ? (
							<>
								<span>Search any</span>
								<span className="rounded-[5px] bg-[#D4E5FE] px-[4px] py-[2px] font-medium">Keyword</span>
								<span>here</span>
							</>
						) : isInitialDashboardSearch ? (
							<span>Ask Anything</span>
						) : (
							<>
								<span className="font-bold">Search</span>
								<span>Anything</span>
							</>
						)}
					</div>
				)}
				<textarea
					ref={inputRef}
					value={value}
					rows={1}
					onChange={(event) => onValueChange(event.target.value)}
					onFocus={() => onActiveChange(true)}
					onBlur={() => onActiveChange(false)}
					onKeyDown={(event) => {
						event.stopPropagation();
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault();
							onSubmit();
						}
					}}
					className="absolute bg-transparent border-0 outline-none font-inter text-[16px] text-black"
					style={{
						top: 0,
						left: isInitialDashboardSearch ? '24px' : `${14 + leadingIconOffset}px`,
						width: `calc(100% - ${anythingRightReservedWidth + (isInitialDashboardSearch ? 24 : 0) + leadingIconOffset}px)`,
						height: `${
							isInitialDashboardSearch
								? activeHeight
								: isExpanded
									? activeHeight
									: MAP_RESULTS_BOTTOM_SEARCH_BOX.textRowHeight
						}px`,
						padding: isInitialDashboardSearch ? '8px 0 7px' : '8px 0 6px',
						opacity: isExpanded || value.length > 0 ? 1 : 0,
						pointerEvents: isExpanded ? 'auto' : 'none',
						caretColor: '#000000',
						lineHeight: `${MAP_RESULTS_BOTTOM_SEARCH_BOX.textLineHeight}px`,
						resize: 'none',
						overflow: isExpanded ? 'auto' : 'hidden',
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word',
						boxSizing: 'border-box',
					}}
				/>
				<button
					type="button"
					aria-label="Submit map search"
					className="absolute flex items-center justify-center transition-colors duration-100"
					style={{
						right: isInitialDashboardSearch
							? `${INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.buttonInset}px`
							: 0,
						top: isInitialDashboardSearch ? '50%' : 0,
						width: isInitialDashboardSearch
							? `${INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.buttonSize}px`
							: `${MAP_RESULTS_BOTTOM_SEARCH_BOX.rightSlotWidth}px`,
						height: isInitialDashboardSearch
							? `${INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.buttonSize}px`
							: `${MAP_RESULTS_BOTTOM_SEARCH_BOX.rightSlotHeight}px`,
						transform: isInitialDashboardSearch ? 'translateY(-50%)' : undefined,
						backgroundColor: isInitialDashboardSearch
							? INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.buttonBackgroundColor
							: MAP_RESULTS_BOTTOM_SEARCH_BOX.rightSlotBackgroundColor,
						color: isInitialDashboardSearch
							? INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.buttonIconColor
							: undefined,
						borderRadius: isInitialDashboardSearch
							? `${INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.buttonRadius}px`
							: undefined,
						border: 0,
						borderLeft: isInitialDashboardSearch
							? undefined
							: `${MAP_RESULTS_BOTTOM_SEARCH_BOX.borderWidth}px solid ${MAP_RESULTS_BOTTOM_SEARCH_BOX.borderColor}`,
						borderBottom:
							!isInitialDashboardSearch && isExpanded
								? `${MAP_RESULTS_BOTTOM_SEARCH_BOX.borderWidth}px solid ${MAP_RESULTS_BOTTOM_SEARCH_BOX.borderColor}`
								: undefined,
						boxSizing: 'border-box',
						cursor: 'pointer',
						padding: 0,
					}}
					onMouseEnter={(event) => {
						if (isInitialDashboardSearch) return;
						event.currentTarget.style.backgroundColor =
							MAP_RESULTS_BOTTOM_SEARCH_BOX.rightSlotHoverBackgroundColor;
					}}
					onMouseLeave={(event) => {
						if (isInitialDashboardSearch) return;
						event.currentTarget.style.backgroundColor =
							MAP_RESULTS_BOTTOM_SEARCH_BOX.rightSlotBackgroundColor;
					}}
					onMouseDown={(event) => {
						event.stopPropagation();
						if (isInitialDashboardSearch) return;
						event.currentTarget.style.backgroundColor =
							MAP_RESULTS_BOTTOM_SEARCH_BOX.rightSlotActiveBackgroundColor;
					}}
					onMouseUp={(event) => {
						if (isInitialDashboardSearch) return;
						event.currentTarget.style.backgroundColor =
							MAP_RESULTS_BOTTOM_SEARCH_BOX.rightSlotHoverBackgroundColor;
					}}
					onClick={() => {
						// The arrow is an explicit "run the search" affordance, so it must
						// always submit — never just open/refocus the box. An empty box is a
						// valid submit: submitMapBottomSearchQuery routes it to a curated
						// "For You" (or a profile-tailored / radius search when those advanced
						// modes are on). Gating this on non-empty text was why clicking the
						// blue button in keyword/radius mode (or with an empty box) did nothing
						// but blur/close the box.
						onSubmit();
					}}
				>
					<MapBottomSearchArrowIcon aria-hidden="true" />
				</button>
			</div>
		);
	}
);
MapBottomSearchBar.displayName = 'MapBottomSearchBar';

const getCategorySearchWhyForWhat = (what: string) =>
	what.trim() === 'Radio Stations' ? '[Promotion]' : '[Booking]';

type MapBottomSearchFollowupBoxProps = {
	selectedSearchFollowup: MapBottomSearchFollowupSelection;
	previewedSearchFollowup: MapBottomSearchFollowupPreview;
	onSelectedSearchFollowupChange: (selection: MapBottomSearchFollowupSelection) => void;
	onPreviewSearchFollowupChange: (selection: MapBottomSearchFollowupPreview) => void;
	onForYouSubmit: () => void;
	isKeywordModeEnabled: boolean;
	onKeywordToggle: () => void;
	isRadiusModeEnabled: boolean;
	onRadiusToggle: () => void;
	isProfileModeEnabled: boolean;
	onProfileToggle: () => void;
	// Positional overrides (e.g. flip above the search bar in compressed chrome).
	style?: React.CSSProperties;
};

const MapBottomSearchFollowupBox = memo(
	({
		selectedSearchFollowup,
		previewedSearchFollowup,
		onSelectedSearchFollowupChange,
		onPreviewSearchFollowupChange,
		onForYouSubmit,
		isKeywordModeEnabled,
		onKeywordToggle,
		isRadiusModeEnabled,
		onRadiusToggle,
		isProfileModeEnabled,
		onProfileToggle,
		style: styleOverride,
	}: MapBottomSearchFollowupBoxProps) => {
		const segmentBox = MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_SEGMENT_BOX;
		const leftTileBox = MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_LEFT_TILE_BOX;
		const iconLayout = MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_ICON_LAYOUT;
		const profileLeft = segmentBox.advancedWidth + segmentBox.internalDividerWidth;
		const keywordLeft = profileLeft + segmentBox.segmentWidth;
		const radiusLeft = keywordLeft + segmentBox.segmentWidth;
		const visualSearchFollowup =
			previewedSearchFollowup === 'anything'
				? null
				: (previewedSearchFollowup ?? selectedSearchFollowup);
		const isForYouSelected = selectedSearchFollowup === 'for-you';
		const isCategorySelected = selectedSearchFollowup === 'category';
		const isForYouActive = visualSearchFollowup === 'for-you';
		const isCategoryActive = visualSearchFollowup === 'category';
		const isAdvancedActive = previewedSearchFollowup === 'anything';
		const isCompactFollowup = isForYouSelected || isCategorySelected;
		const isProfileAdvancedSelected = isProfileModeEnabled;
		const isKeywordAdvancedSelected = isKeywordModeEnabled;
		const isRadiusAdvancedSelected = isRadiusModeEnabled;

		return (
			<div
				className="absolute left-1/2 pointer-events-auto"
				style={{
					top: `calc(100% + ${MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_BOX.gapToSearchBar}px)`,
					width: `${
						isCompactFollowup
							? MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_BOX.compactWidth
							: MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_BOX.width
					}px`,
					height: `${MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_BOX.height}px`,
					transform: 'translateX(-50%)',
					borderRadius: `${MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_BOX.borderRadius}px`,
					border: `${MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_BOX.borderWidth}px solid ${MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_BOX.borderColor}`,
					backgroundColor: MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_BOX.backgroundColor,
					boxSizing: 'border-box',
					...styleOverride,
				}}
			>
				<button
					type="button"
					aria-label="Run For You search"
					className="absolute flex items-center justify-center"
					style={{
						left: `${leftTileBox.leftOffset}px`,
						top: '50%',
						width: `${leftTileBox.size}px`,
						height: `${leftTileBox.size}px`,
						transform: 'translateY(-50%)',
						borderRadius: `${leftTileBox.borderRadius}px`,
						border: `${leftTileBox.selectedBorderWidth}px solid ${
							isForYouActive ? leftTileBox.selectedBorderColor : 'transparent'
						}`,
						backgroundColor: isForYouActive
							? leftTileBox.selectedBackgroundColor
							: leftTileBox.dailyMixBackgroundColor,
						boxSizing: 'border-box',
						padding: 0,
						cursor: 'pointer',
					}}
					onMouseEnter={() => onPreviewSearchFollowupChange('for-you')}
					onFocus={() => onPreviewSearchFollowupChange('for-you')}
					onClick={() => onForYouSubmit()}
				>
					<MapBottomSearchForYouIcon
						aria-hidden="true"
						textColor={isForYouActive ? '#000000' : undefined}
						waveColor={isForYouActive ? '#000000' : undefined}
						style={{
							display: 'block',
							width: `${iconLayout.forYou.width}px`,
							height: `${iconLayout.forYou.height}px`,
							transform: `translate(${iconLayout.forYou.translateX}px, ${iconLayout.forYou.translateY}px)`,
						}}
					/>
				</button>
				<button
					type="button"
					aria-label="Select Category"
					aria-pressed={isCategorySelected}
					className="absolute flex items-center justify-center"
					style={{
						left: `${leftTileBox.leftOffset + leftTileBox.size + leftTileBox.gap}px`,
						top: '50%',
						width: `${leftTileBox.size}px`,
						height: `${leftTileBox.size}px`,
						transform: 'translateY(-50%)',
						borderRadius: `${leftTileBox.borderRadius}px`,
						border: `${leftTileBox.selectedBorderWidth}px solid ${
							isCategoryActive ? leftTileBox.selectedBorderColor : 'transparent'
						}`,
						backgroundColor: isCategoryActive
							? leftTileBox.categorySelectedBackgroundColor
							: leftTileBox.categoryBackgroundColor,
						boxSizing: 'border-box',
						padding: 0,
						cursor: 'pointer',
					}}
					onMouseEnter={() => onPreviewSearchFollowupChange('category')}
					onFocus={() => onPreviewSearchFollowupChange('category')}
					onClick={() =>
						onSelectedSearchFollowupChange(isCategorySelected ? null : 'category')
					}
				>
					<MapBottomSearchCategoryIcon
						aria-hidden="true"
						active={isCategoryActive}
						style={{
							display: 'block',
							width: `${isCategoryActive ? 36 : iconLayout.category.width}px`,
							height: `${isCategoryActive ? 40 : iconLayout.category.height}px`,
							transform: `translate(${
								isCategoryActive
									? iconLayout.category.activeTranslateX
									: iconLayout.category.translateX
							}px, ${
								isCategoryActive
									? iconLayout.category.activeTranslateY
									: iconLayout.category.translateY
							}px)`,
						}}
					/>
				</button>
				{isCompactFollowup ? (
					<button
						type="button"
						aria-label="Open Advanced options"
						aria-pressed={isAdvancedActive}
						className="absolute flex items-center justify-center"
						style={{
							left: `${
								leftTileBox.leftOffset + 2 * leftTileBox.size + 2 * leftTileBox.gap
							}px`,
							top: '50%',
							width: `${leftTileBox.size}px`,
							height: `${leftTileBox.size}px`,
							transform: 'translateY(-50%)',
							borderRadius: `${leftTileBox.borderRadius}px`,
							backgroundColor: isAdvancedActive
								? segmentBox.advancedBackgroundColor
								: leftTileBox.advancedCompactBackgroundColor,
							boxSizing: 'border-box',
							border: `${leftTileBox.selectedBorderWidth}px solid ${
								isAdvancedActive ? leftTileBox.selectedBorderColor : 'transparent'
							}`,
							padding: 0,
							cursor: 'pointer',
						}}
						onMouseEnter={() => onPreviewSearchFollowupChange('anything')}
						onFocus={() => onPreviewSearchFollowupChange('anything')}
						onClick={() => onSelectedSearchFollowupChange(null)}
					>
						<MapBottomSearchAdvancedIcon
							aria-hidden="true"
							textColor={isAdvancedActive ? '#000000' : '#8D8D8D'}
							iconColor={isAdvancedActive ? '#000000' : '#CA7171'}
							lensFill={isAdvancedActive ? '#FFFFFF' : 'transparent'}
							style={{
								display: 'block',
								width: `${iconLayout.advanced.width}px`,
								height: `${iconLayout.advanced.height}px`,
								transform: `translate(${iconLayout.advanced.translateX}px, ${iconLayout.advanced.translateY}px)`,
							}}
						/>
					</button>
				) : (
					<div
						role="group"
						aria-label="Advanced filter options"
						className="absolute"
						onMouseEnter={() => onPreviewSearchFollowupChange('anything')}
						style={{
							right: `${segmentBox.rightOffset}px`,
							top: '50%',
							width: `${segmentBox.width}px`,
							height: `${segmentBox.height}px`,
							transform: 'translateY(-50%)',
							borderRadius: `${segmentBox.borderRadius}px`,
							border: `${segmentBox.dividerWidth}px solid ${segmentBox.borderColor}`,
							background: `linear-gradient(to right, ${segmentBox.advancedBackgroundColor} 0 ${segmentBox.advancedWidth}px, ${segmentBox.borderColor} ${segmentBox.advancedWidth}px ${profileLeft}px, ${segmentBox.profileBackgroundColor} ${profileLeft}px ${keywordLeft}px, ${segmentBox.keywordBackgroundColor} ${keywordLeft}px ${radiusLeft}px, ${segmentBox.radiusBackgroundColor} ${radiusLeft}px 100%)`,
							boxSizing: 'border-box',
							overflow: 'hidden',
						}}
					>
						<div
							className="absolute flex items-center justify-center"
							style={{
								left: 0,
								top: 0,
								width: `${segmentBox.advancedWidth}px`,
								height: '100%',
								transform: 'translateY(3px)',
							}}
						>
							<MapBottomSearchAdvancedIcon />
						</div>
						<button
							type="button"
							aria-label="Toggle Profile"
							aria-pressed={isProfileAdvancedSelected}
							className="absolute flex items-center justify-center"
							style={{
								left: `${profileLeft}px`,
								top: 0,
								width: `${segmentBox.segmentWidth}px`,
								height: '100%',
								backgroundColor: isProfileAdvancedSelected
									? segmentBox.profileActiveBackgroundColor
									: 'transparent',
								border: 0,
								borderRadius: 0,
								outline: 'none',
								appearance: 'none',
								padding: 0,
								cursor: 'pointer',
								zIndex: 1,
							}}
							onClick={onProfileToggle}
						>
							<MapBottomSearchProfileIcon
								aria-hidden="true"
								textColor={isProfileAdvancedSelected ? '#000000' : undefined}
								iconColor={isProfileAdvancedSelected ? '#000000' : undefined}
								avatarFill={isProfileAdvancedSelected ? '#FFFFFF' : undefined}
								style={{
									display: 'block',
									width: `${iconLayout.profile.width}px`,
									height: `${iconLayout.profile.height}px`,
								}}
							/>
						</button>
						<button
							type="button"
							aria-label="Toggle Keyword"
							aria-pressed={isKeywordAdvancedSelected}
							className="absolute flex items-center justify-center"
							style={{
								left: `${keywordLeft}px`,
								top: 0,
								width: `${segmentBox.segmentWidth}px`,
								height: '100%',
								backgroundColor: isKeywordAdvancedSelected
									? segmentBox.keywordActiveBackgroundColor
									: 'transparent',
								border: 0,
								borderRadius: 0,
								outline: 'none',
								appearance: 'none',
								padding: 0,
								cursor: 'pointer',
								zIndex: 1,
							}}
							onClick={onKeywordToggle}
						>
							<MapBottomSearchKeywordIcon
								aria-hidden="true"
								textColor={isKeywordAdvancedSelected ? '#000000' : undefined}
								iconColor={isKeywordAdvancedSelected ? '#000000' : undefined}
								innerFill={isKeywordAdvancedSelected ? '#FFFFFF' : undefined}
								style={{
									display: 'block',
									width: `${iconLayout.keyword.width}px`,
									height: `${iconLayout.keyword.height}px`,
									transform: `translate(${iconLayout.keyword.translateX}px, ${iconLayout.keyword.translateY}px)`,
								}}
							/>
						</button>
						<button
							type="button"
							aria-label="Toggle Radius"
							aria-pressed={isRadiusAdvancedSelected}
							className="absolute flex items-center justify-center"
							style={{
								left: `${radiusLeft}px`,
								top: 0,
								width: `${segmentBox.segmentWidth - segmentBox.internalDividerWidth}px`,
								height: '100%',
								backgroundColor: isRadiusAdvancedSelected
									? segmentBox.radiusActiveBackgroundColor
									: 'transparent',
								border: 0,
								borderTopRightRadius: `${segmentBox.borderRadius - segmentBox.dividerWidth}px`,
								borderBottomRightRadius: `${segmentBox.borderRadius - segmentBox.dividerWidth}px`,
								outline: 'none',
								appearance: 'none',
								padding: 0,
								cursor: 'pointer',
								zIndex: 1,
							}}
							onClick={onRadiusToggle}
						>
							<MapBottomSearchRadiusIcon
								aria-hidden="true"
								textColor={isRadiusAdvancedSelected ? '#000000' : undefined}
								iconColor={isRadiusAdvancedSelected ? '#000000' : undefined}
								innerFill={isRadiusAdvancedSelected ? '#FFFFFF' : undefined}
								style={{
									display: 'block',
									width: `${iconLayout.radius.width}px`,
									height: `${iconLayout.radius.height}px`,
									transform: `translate(${iconLayout.radius.translateX}px, ${iconLayout.radius.translateY}px)`,
								}}
							/>
						</button>
						<div
							aria-hidden="true"
							className="absolute pointer-events-none"
							style={{
								left: `${segmentBox.advancedWidth}px`,
								top: 0,
								width: `${segmentBox.internalDividerWidth}px`,
								height: '100%',
								backgroundColor: segmentBox.borderColor,
								zIndex: 2,
							}}
						/>
					</div>
				)}
			</div>
		);
	}
);
MapBottomSearchFollowupBox.displayName = 'MapBottomSearchFollowupBox';

// Campaign-style nav boxes flanking the dashboard "Search Anything" bar. Values
// mirror the campaign overview's count boxes (see CampaignOverviewBottomBoxes in
// campaign/[campaignId]/page.tsx) so the two surfaces read as the same control.
const DASHBOARD_ASK_FLANK_BOX_STYLE: React.CSSProperties = {
	width: 39.154,
	height: 39.154,
	borderRadius: 7.458,
	border: '0.725px solid #000',
	boxSizing: 'border-box',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
};
const DASHBOARD_ASK_FLANK_COUNT_STYLE: React.CSSProperties = {
	fontFamily: 'Inter, sans-serif',
	fontSize: 12.326,
	fontWeight: 500,
	lineHeight: '10.151px',
	color: '#000',
};

// A single flanking box: a decorative spacer, or an interactive count/icon box
// that is disabled (display-only) until a non-null onClick is supplied — matching
// the campaign's "no handler => not clickable when count is 0" behavior.
const DashboardAskFlankBox = ({
	label,
	background,
	count,
	icon,
	opacity,
	decorative,
	onClick,
}: {
	label?: string;
	background: string;
	count?: number;
	icon?: ReactNode;
	opacity?: number;
	decorative?: boolean;
	onClick?: () => void;
}) => {
	if (decorative) {
		return (
			<div
				aria-hidden="true"
				style={{ ...DASHBOARD_ASK_FLANK_BOX_STYLE, background, opacity }}
			/>
		);
	}
	return (
		<button
			type="button"
			aria-label={label}
			disabled={!onClick}
			className={`pointer-events-auto border-0 p-0 transition-opacity duration-150${
				onClick ? ' hover:opacity-85' : ''
			}`}
			style={{
				...DASHBOARD_ASK_FLANK_BOX_STYLE,
				...DASHBOARD_ASK_FLANK_COUNT_STYLE,
				background,
				opacity,
				cursor: onClick ? 'pointer' : 'default',
			}}
			onClick={onClick}
		>
			{icon ?? count}
		</button>
	);
};

// Left + right groups of campaign nav boxes that flank the dashboard search bar
// (same row). Rendered inside the bar's positioned wrapper as siblings of the
// bar, so `right/left: calc(100% + 8px)` anchors each group just outside the bar
// and `bottom: 0` pins them to the resting bar row. Used by both the pre-search
// ask box and the map-results search bar.
const DASHBOARD_SEARCH_FLANK_GROUP_CLASS =
	'dashboard-ask-flank pointer-events-none absolute flex items-end';
const DashboardSearchFlankBoxes = ({
	contactsCount,
	draftCount,
	inboxCount,
	sentCount,
	navEnabled,
	onNavigate,
	dimmed,
}: {
	contactsCount: number;
	draftCount: number;
	inboxCount: number;
	sentCount: number;
	navEnabled: boolean;
	onNavigate: (tab: 'write' | 'drafts' | 'inbox' | 'sent') => void;
	// Recede the right-of-bar group to very low opacity while an expanded Description
	// card overlaps it, so the (translucent) card reads cleanly above those boxes.
	dimmed?: boolean;
}) => {
	const handler = (
		tab: 'write' | 'drafts' | 'inbox' | 'sent',
		count: number
	) => (navEnabled && count > 0 ? () => onNavigate(tab) : undefined);
	// Boxes fade out toward the outer edges (full opacity nearest the bar), so the
	// row reads as the campaign control trailing off into the map on both sides.
	const OUTER = 0.18;
	const MID = 0.45;
	// Receded opacity for the right-of-bar group (the one the right-docked
	// Description card overlaps) while that card is expanded.
	const DIM = 0.08;
	const groupOpacity = dimmed ? DIM : 1;
	const dimTransition = 'opacity 150ms ease-out';
	return (
		<>
			<div
				className={DASHBOARD_SEARCH_FLANK_GROUP_CLASS}
				style={{ right: 'calc(100% + 8px)', bottom: 0, gap: 3 }}
			>
				<DashboardAskFlankBox decorative background="#F3EEE1" opacity={OUTER} />
				<DashboardAskFlankBox
					label="sent"
					background="#5AB478"
					count={sentCount}
					opacity={MID}
					onClick={handler('sent', sentCount)}
				/>
				<DashboardAskFlankBox
					label="opportunities"
					background="#EFD7D3"
					icon={
						<DashboardActionBarStarIcon
							width={15}
							height={15}
							style={{ color: '#E32222' }}
						/>
					}
					onClick={handler('inbox', inboxCount)}
				/>
			</div>
			<div
				className={DASHBOARD_SEARCH_FLANK_GROUP_CLASS}
				style={{
					left: 'calc(100% + 8px)',
					bottom: 0,
					gap: 3,
					opacity: groupOpacity,
					transition: dimTransition,
				}}
			>
				<DashboardAskFlankBox
					label="contacts"
					background="#EB8586"
					count={contactsCount}
					onClick={handler('write', contactsCount)}
				/>
				<DashboardAskFlankBox
					label="drafts"
					background="#FFE3AA"
					count={draftCount}
					opacity={MID}
					onClick={handler('drafts', draftCount)}
				/>
				<DashboardAskFlankBox
					label="inbox"
					background="#6EBED5"
					count={inboxCount}
					opacity={OUTER}
					onClick={handler('inbox', inboxCount)}
				/>
			</div>
		</>
	);
};

const DashboardContent = () => {
	const { openSignIn } = useClerk();
	const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const isMobile = useIsMobile();
	const { data: campaigns, isSuccess: hasLoadedCampaigns } = useGetCampaigns();
	// Loaded-and-empty only: a FAILED campaigns fetch must never count as "no
	// campaigns" (it would auto-create a starter campaign for an account that
	// merely couldn't load its list — the tab frame handles the error instead).
	const isMobileZeroCampaigns =
		isMobile === true && hasLoadedCampaigns && (campaigns?.length ?? 0) === 0;
	const queryClient = useQueryClient();
	const setPersistentMapConfig = usePersistentMapSetter();
	const {
		mood: globeWeatherMood,
		temperatureF: globeWeatherTemperatureF,
		weatherCode: globeWeatherCode,
		regionCenter: globeWeatherRegionCenter,
	} = useGlobeWeatherMood();
	const globeNightLighting = useGlobeNightLighting();

	// If we navigated here from a campaign, enable "Add to Campaign" mode.
	const fromCampaignIdParam = searchParams.get('fromCampaignId')?.trim() || '';
	const isAddToCampaignMode = Boolean(fromCampaignIdParam);
	// Campaign send session (provider lives in MurmurLayoutClient, so a batch
	// started on the campaign page stays live across the pick-flow navigation).
	const sendingSession = useSendingSessionState();
	const showMapSendingOverlay =
		isAddToCampaignMode &&
		isMobile === false &&
		(sendingSession.status === 'sending' || sendingSession.status === 'done') &&
		!sendingSession.dismissed;
	// Send-queue VIEW open/close — toggled by the campaign header "in send queue"
	// pill (provider wraps DashboardContent), drives the on-demand queue overlay.
	const { isOpen: isSendQueueViewOpen, close: closeSendQueueView } = useSendQueueView();
	// Persisted (URL) search + view state for the normal dashboard flow so refresh keeps the user
	// in the same results view (map/table) instead of resetting back to the initial search screen.
	const dashboardViewParam = searchParams.get('view')?.trim() || '';
	const dashboardSearchParam = searchParams.get('search')?.trim() || '';
	// Persisted (URL) search + view state for the "from campaign" flow so refresh keeps the user
	// in the correct results view without affecting the normal dashboard entry.
	const fromCampaignViewParam = searchParams.get('fromCampaignView')?.trim() || '';
	const fromCampaignSearchParam = searchParams.get('fromCampaignSearch')?.trim() || '';
	// Curated-search rehydration params: a curated session can't be replayed by re-running
	// the regular text search (the API path is different and curated metadata like
	// `curatedCategory`/`curatedDisplayLabel` would be lost), so we persist the original args
	// and restore via triggerCuratedSearch on refresh. The `pick=` flag identifies the mode;
	// remaining args reuse short keys (area/state/cat/lat/lon/r) under that namespace.
	const curatedModeParam = searchParams.get('pick')?.trim() === '1';
	const curatedAreaParam = searchParams.get('area')?.trim() || '';
	const curatedStateParam = searchParams.get('state')?.trim() || '';
	const curatedCategoryParam = searchParams.get('cat')?.trim() || '';
	const parseFiniteNumberParam = (key: string): number | null => {
		const raw = searchParams.get(key);
		if (raw == null) return null;
		const n = Number(raw);
		return Number.isFinite(n) ? n : null;
	};
	const curatedLatParam = parseFiniteNumberParam('lat');
	const curatedLonParam = parseFiniteNumberParam('lon');
	const curatedRadiusKmParam = parseFiniteNumberParam('r');
	// Free-text "Search Anything" rehydration flag. The query itself is in `search`; the bias
	// args (lat/lon/r) live under `ftLat`/`ftLon`/`ftR` so they don't clash with the curated
	// short-key namespace. Presence of `ft=1` is what tells rehydration to look in the
	// free-text session cache before falling through to the regular onSubmit.
	const freeTextModeParam = searchParams.get('ft')?.trim() === '1';
	const freeTextLatParam = parseFiniteNumberParam('ftLat');
	const freeTextLonParam = parseFiniteNumberParam('ftLon');
	const freeTextRadiusKmParam = parseFiniteNumberParam('ftR');
	const freeTextStrictParam = searchParams.get('ftStrict')?.trim() === '1';
	const freeTextKeywordParam = searchParams.get('ftKeyword')?.trim() === '1';
	const freeTextProfileParam = searchParams.get('ftProfile')?.trim() === '1';
	const allContactsMapParam = searchParams.get(ALL_CONTACTS_MAP_PARAM)?.trim() === '1';
	// "From Home" mode: triggered from landing page search button, shows a pre-configured search
	// with sign-up modal for unauthenticated users.
	const fromHomeParam = searchParams.get('fromHome') === 'true';
	// Unsubscribe flow (settings-styled overlay over the bare globe). URL-driven so a
	// refresh stays in the flow and the campaign page's settings gear can deep-link here.
	const isUnsubscribeFlowOpen = searchParams.get('unsubscribe')?.trim() === '1';
	const FROM_HOME_SEARCH_QUERY = '[Booking] Wine, Beer, and Spirits (California)';
	const FROM_HOME_WHY = '[Booking]';
	const FROM_HOME_WHAT = DEFAULT_CATEGORY_SEARCH_WHAT;
	const FROM_HOME_WHERE = 'California';

	// Placeholder contacts for fromHome loading state - shows fake dots in California
	const fromHomePlaceholderContacts = useMemo(() => {
		if (!fromHomeParam) return [];
		const placeholders: ContactWithName[] = [];
		// Use a seeded random approach for consistent positions
		const seed = 12345;
		const random = (i: number) => {
			const x = Math.sin(seed + i) * 10000;
			return x - Math.floor(x);
		};
		const createPlaceholder = (
			id: number,
			lat: number,
			lng: number,
			state?: string
		): ContactWithName =>
			({
				id,
				email: '',
				name: null,
				firstName: null,
				lastName: null,
				company: null,
				title: null,
				headline: null,
				latitude: lat,
				longitude: lng,
				state: state ?? 'California',
				city: null,
				country: 'United States',
				address: null,
				phone: null,
				website: null,
				linkedInUrl: null,
				photoUrl: null,
				metadata: null,
				apolloPersonId: null,
				contactListId: null,
				userId: null,
				venueId: null,
				isPrivate: false,
				hasVectorEmbedding: false,
				userContactListCount: 0,
				manualDeselections: 0,
				companyFoundedYear: null,
				companyIndustry: null,
				companyKeywords: [],
				companyLinkedInUrl: null,
				companyPostalCode: null,
				companyTechStack: [],
				companyType: null,
				lastResearchedDate: null,
				emailValidatedAt: null,
				emailValidationStatus: 'unknown',
				emailValidationSubStatus: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			}) as ContactWithName;

		// Add anchor points in neighboring states to keep the map somewhat zoomed out
		// and show blue outlines on Arizona and Nevada (visually near California)
		placeholders.push(createPlaceholder(-1, 36.2, -115.1, 'Nevada')); // Las Vegas area
		placeholders.push(createPlaceholder(-2, 39.5, -119.8, 'Nevada')); // Reno area
		placeholders.push(createPlaceholder(-3, 33.4, -112.0, 'Arizona')); // Phoenix area
		placeholders.push(createPlaceholder(-4, 32.2, -110.9, 'Arizona')); // Tucson area

		// California regions spread across the entire state (all inland, no water)
		// Kept well east of the coastline to avoid ocean
		const regions = [
			// Northern California (inland)
			{ lat: 41.5, lng: -122.0, spread: 0.8, weight: 8 }, // Redding area
			{ lat: 40.5, lng: -121.5, spread: 0.7, weight: 6 }, // Shasta
			{ lat: 41.0, lng: -120.5, spread: 0.8, weight: 5 }, // Modoc
			// Sacramento Valley
			{ lat: 39.5, lng: -121.5, spread: 1.0, weight: 12 }, // Sacramento
			{ lat: 39.0, lng: -121.8, spread: 0.8, weight: 8 }, // Yuba City
			{ lat: 38.6, lng: -121.3, spread: 0.6, weight: 10 }, // Sacramento city
			// Napa/Sonoma (inland from coast)
			{ lat: 38.5, lng: -122.3, spread: 0.5, weight: 15 }, // Napa
			{ lat: 38.4, lng: -122.7, spread: 0.4, weight: 12 }, // Sonoma
			// Bay Area (inland parts)
			{ lat: 37.7, lng: -121.9, spread: 0.6, weight: 14 }, // East Bay
			{ lat: 37.4, lng: -121.5, spread: 0.7, weight: 12 }, // San Jose area
			{ lat: 37.0, lng: -121.8, spread: 0.5, weight: 8 }, // Gilroy
			// Central Valley (entire length)
			{ lat: 38.0, lng: -120.8, spread: 1.0, weight: 10 }, // Stockton
			{ lat: 37.5, lng: -120.5, spread: 1.0, weight: 10 }, // Modesto
			{ lat: 36.7, lng: -119.8, spread: 1.2, weight: 12 }, // Fresno
			{ lat: 36.0, lng: -119.3, spread: 1.0, weight: 10 }, // Visalia
			{ lat: 35.4, lng: -119.0, spread: 1.0, weight: 10 }, // Bakersfield
			// Central Coast (inland from coast)
			{ lat: 35.6, lng: -120.5, spread: 0.6, weight: 10 }, // Paso Robles
			{ lat: 34.9, lng: -120.2, spread: 0.5, weight: 8 }, // Santa Maria
			// Los Angeles Basin (inland)
			{ lat: 34.1, lng: -117.8, spread: 0.8, weight: 15 }, // Inland Empire
			{ lat: 34.4, lng: -118.5, spread: 0.6, weight: 12 }, // San Fernando Valley
			{ lat: 34.0, lng: -117.4, spread: 0.7, weight: 12 }, // Riverside/San Bernardino
			{ lat: 33.8, lng: -117.9, spread: 0.5, weight: 10 }, // Orange County inland
			// San Diego (inland)
			{ lat: 33.0, lng: -116.8, spread: 0.6, weight: 10 }, // Escondido/Temecula
			{ lat: 32.8, lng: -116.9, spread: 0.5, weight: 8 }, // East San Diego
			// Desert regions
			{ lat: 34.5, lng: -116.5, spread: 1.0, weight: 8 }, // High Desert
			{ lat: 33.8, lng: -116.5, spread: 0.8, weight: 6 }, // Palm Springs area
			{ lat: 35.5, lng: -117.5, spread: 1.0, weight: 6 }, // Mojave
			// Sierra Nevada foothills
			{ lat: 39.0, lng: -120.5, spread: 0.8, weight: 8 }, // Gold Country
			{ lat: 38.0, lng: -120.0, spread: 0.8, weight: 6 }, // Yosemite foothills
			{ lat: 37.0, lng: -119.5, spread: 0.7, weight: 5 }, // Southern Sierra
		];
		// Build weighted list
		const weightedRegions: typeof regions = [];
		for (const r of regions) {
			for (let w = 0; w < r.weight; w++) {
				weightedRegions.push(r);
			}
		}
		for (let i = 0; i < 300; i++) {
			const regionIdx = Math.floor(random(i * 7) * weightedRegions.length);
			const region = weightedRegions[regionIdx];
			const lat = region.lat + (random(i) - 0.5) * region.spread * 2;
			const lng = region.lng + (random(i + 1) - 0.5) * region.spread * 2;
			placeholders.push(createPlaceholder(-1000 - i, lat, lng));
		}
		return placeholders;
	}, [fromHomeParam]);

	const { data: fromCampaign, isPending: isPendingFromCampaign } =
		useGetCampaign(fromCampaignIdParam);
	const [dashboardSearchCampaignIdOverride, setDashboardSearchCampaignIdOverride] =
		useState<number | null>(null);
	const dashboardSearchCampaignOverrideFetchId =
		dashboardSearchCampaignIdOverride != null &&
		String(dashboardSearchCampaignIdOverride) !== fromCampaignIdParam
			? String(dashboardSearchCampaignIdOverride)
			: '';
	const {
		data: fetchedDashboardSearchCampaignOverride,
		isPending: isPendingDashboardSearchCampaignOverride,
	} = useGetCampaign(dashboardSearchCampaignOverrideFetchId);
	const { mutateAsync: editUserContactList, isPending: isPendingAddToCampaign } =
		useEditUserContactList({ suppressToasts: true });

	// ── Mapbox globe styles (shared background + results map) ──
	// Inject globe-related styles (hide Mapbox controls, transparent body bg).
	useEffect(() => {
		const style = document.createElement('style');
		style.setAttribute('data-dashboard-globe', '');
		style.textContent = `
			.dashboard-globe-bg .mapboxgl-ctrl-logo,
			.dashboard-globe-bg .mapboxgl-ctrl-attrib {
				display: none !important;
			}
			.dashboard-globe-bg .mapboxgl-map,
			.dashboard-globe-bg .mapboxgl-canvas-container,
			.dashboard-globe-bg .mapboxgl-canvas {
				width: 100% !important;
				height: 100% !important;
			}
			/* Map-view fills the viewport edge-to-edge — no rounded corners */
			.dashboard-globe-bg .murmur-search-results-map,
			.dashboard-globe-bg .mapboxgl-map,
			.dashboard-globe-bg .mapboxgl-canvas-container,
			.dashboard-globe-bg .mapboxgl-canvas {
				border-radius: 0 !important;
			}
			/* Counteract root-level dashboard zoom so the globe fills the real viewport */
			html.murmur-compact .dashboard-globe-bg {
				zoom: calc(1 / var(--murmur-dashboard-zoom, 0.85));
			}
			html:has(.dashboard-globe-bg),
			body:has(.dashboard-globe-bg),
			body:has(.dashboard-globe-bg) > main,
			body:has(.dashboard-globe-bg) main.flex-1 {
				background: transparent !important;
				background-color: transparent !important;
			}
		`;
		document.head.appendChild(style);
		return () => {
			style.remove();
		};
	}, []);

	// Pick the hero search-bar gradient for the current AM/PM bucket and publish it
	// as `--search-gradient` on the document root. `.search-gradient-button` reads
	// this var (with the original magenta/red as fallback). Re-pick at the next
	// bucket boundary so a user sitting on the dashboard across noon/midnight gets
	// the swap without a reload.
	useEffect(() => {
		const root = document.documentElement;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		const applyForNow = () => {
			const now = new Date();
			root.style.setProperty('--search-gradient', getSearchGradientForDate(now));
			// +1s margin so we land cleanly inside the next bucket rather than racing the boundary.
			timeoutId = setTimeout(applyForNow, getMsUntilNextSearchGradientBucket(now) + 1000);
		};

		applyForNow();

		return () => {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
			root.style.removeProperty('--search-gradient');
		};
	}, []);
	const [isMobileLandscape, setIsMobileLandscape] = useState(false);
	const [whyValue, setWhyValue] = useState('');
	const [whatValue, setWhatValue] = useState('');
	const [whereValue, setWhereValue] = useState('');
	const [isWhyDropdownOpen, setIsWhyDropdownOpen] = useState(false);
	const whyDropdownRef = useRef<HTMLDivElement>(null);
	const [isWhatDropdownOpen, setIsWhatDropdownOpen] = useState(false);
	const whatDropdownRef = useRef<HTMLDivElement>(null);
	const [isWhereDropdownOpen, setIsWhereDropdownOpen] = useState(false);
	const whereDropdownRef = useRef<HTMLDivElement>(null);
	const [, setIsNearMeLocation] = useState(false);
	const hasWhereValue = whereValue.trim().length > 0;
	const [activeSection, setActiveSection] = useState<'why' | 'what' | 'where' | null>(
		null
	);
	const [mapBottomSearchFollowupSelection, setMapBottomSearchFollowupSelection] =
		useState<MapBottomSearchFollowupSelection>(null);
	const [mapBottomSearchFollowupPreview, setMapBottomSearchFollowupPreview] =
		useState<MapBottomSearchFollowupPreview>(null);
	const mapBottomSearchFollowupPreviewClearTimeoutRef = useRef<ReturnType<
		typeof setTimeout
	> | null>(null);
	const [isMapBottomCategoryDropdownActive, setIsMapBottomCategoryDropdownActive] =
		useState(false);
	const [isKeywordModeEnabled, setIsKeywordModeEnabled] = useState(false);
	const isKeywordModeEnabledRef = useRef(false);
	useEffect(() => {
		isKeywordModeEnabledRef.current = isKeywordModeEnabled;
	}, [isKeywordModeEnabled]);
	useEffect(() => {
		if (freeTextModeParam) setIsKeywordModeEnabled(freeTextKeywordParam);
	}, [freeTextModeParam, freeTextKeywordParam]);

	// ── Profile search mode (the bottom "Profile" pill) ────────────────────────
	// Folds identity-derived signals (genre/area/bio) into the search. Page-level
	// state + ref so the stable submit callback can read it, mirroring keyword/radius.
	// Disabled by DEFAULT — a plain "Search Anything" should return unbiased
	// results, and the user explicitly opts in via the Profile pill to personalize
	// toward their genre/location. The Profile pill toggles it on; an active
	// free-text rehydration (the `ftProfile` effect below) still restores whatever
	// state that specific search actually ran with.
	const [isProfileModeEnabled, setIsProfileModeEnabled] = useState(false);
	const isProfileModeEnabledRef = useRef(false);
	useEffect(() => {
		isProfileModeEnabledRef.current = isProfileModeEnabled;
	}, [isProfileModeEnabled]);
	useEffect(() => {
		if (freeTextModeParam) setIsProfileModeEnabled(freeTextProfileParam);
	}, [freeTextModeParam, freeTextProfileParam]);
	// One-time-per-session hint when Profile is enabled with an empty profile.
	const profileHintShownRef = useRef(false);
	// Lets submitMapBottomSearchQuery (defined before the curated handler) invoke
	// the empty-query profile path without a forward reference or dep churn.
	const runProfileTailoredForYouRef = useRef<() => void>(() => {});
	// Same forward-reference trick for the other empty-query entry points so
	// submitMapBottomSearchQuery (defined above the curated handlers) can route an
	// empty submit to a plain curated "For You" or a curated radius search.
	const runCuratedForYouRef = useRef<() => void>(() => {});
	const runRadiusCuratedForYouRef = useRef<() => void>(() => {});

	// ── Radius search mode (the bottom "Radius" pill) ──────────────────────────
	const [isRadiusModeEnabled, setIsRadiusModeEnabled] = useState(false);
	const [radiusCenter, setRadiusCenter] = useState<LatLngLiteral | null>(null);
	const [radiusMiles, setRadiusMiles] = useState(RADIUS_DEFAULT_MILES);
	// While a strict-radius free-text search is pending, `lastFreeTextArgs` is
	// intentionally null (so URL/state mirroring does not label stale results as
	// current). The map still needs an immediate signal to hide the old
	// viewport-wide contact overlays during that pending gap.
	const [isPendingRadiusSearchOnMap, setIsPendingRadiusSearchOnMap] = useState(false);
	// Ref mirrors so submitMapBottomSearchQuery (a stable useCallback) reads current
	// radius values without churning its deps on every slider tick.
	const isRadiusModeEnabledRef = useRef(false);
	const radiusCenterRef = useRef<LatLngLiteral | null>(null);
	const radiusMilesRef = useRef(RADIUS_DEFAULT_MILES);
	// Cancels a stale async geolocation enable (toggled off / re-toggled mid-fetch).
	const radiusEnableTokenRef = useRef(0);
	const pendingRadiusSearchTokenRef = useRef(0);
	useEffect(() => {
		isRadiusModeEnabledRef.current = isRadiusModeEnabled;
	}, [isRadiusModeEnabled]);
	useEffect(() => {
		radiusCenterRef.current = radiusCenter;
	}, [radiusCenter]);
	useEffect(() => {
		radiusMilesRef.current = radiusMiles;
	}, [radiusMiles]);

	// Restore remembered radius mode once on mount, then persist on change. The
	// `radiusHydrated` gate stops the persist effect from clobbering storage with
	// defaults before the restore has applied.
	const [radiusHydrated, setRadiusHydrated] = useState(false);
	useEffect(() => {
		if (typeof window === 'undefined') {
			setRadiusHydrated(true);
			return;
		}
		try {
			const raw = window.localStorage.getItem(RADIUS_STORAGE_KEY);
			if (raw) {
				const saved = JSON.parse(raw) as {
					enabled?: boolean;
					center?: { lat: number; lng: number } | null;
					miles?: number;
				};
				if (typeof saved.miles === 'number' && Number.isFinite(saved.miles)) {
					setRadiusMiles(saved.miles);
				}
				if (
					saved.center &&
					Number.isFinite(saved.center.lat) &&
					Number.isFinite(saved.center.lng)
				) {
					setRadiusCenter({ lat: saved.center.lat, lng: saved.center.lng });
				}
				if (saved.enabled) setIsRadiusModeEnabled(true);
			}
		} catch {
			// Corrupt/unavailable storage — start fresh.
		}
		setRadiusHydrated(true);
	}, []);
	useEffect(() => {
		if (!radiusHydrated || typeof window === 'undefined') return;
		try {
			window.localStorage.setItem(
				RADIUS_STORAGE_KEY,
				JSON.stringify({
					enabled: isRadiusModeEnabled,
					center: radiusCenter,
					miles: radiusMiles,
				})
			);
		} catch {
			// Ignore quota / private-mode errors.
		}
	}, [radiusHydrated, isRadiusModeEnabled, radiusCenter, radiusMiles]);

	const isMapBottomCategoryMode = mapBottomSearchFollowupSelection === 'category';
	// When the scroll-to-map gesture commits, it fires a "For You" search but holds the top
	// search pill empty/white until the curated results have actually loaded into the right
	// panel — then we flip this false and the pill reveals "For You". See handleScrollCommitToMap
	// and the effect that clears it on results-loaded.
	const [pendingForYouReveal, setPendingForYouReveal] = useState(false);
	// Scroll-entry should land in the "show all contacts" (disengaged) view, not focused on the
	// For You search geometry. Set at commit; consumed once the search has loaded (an effect
	// below disengages the map). A ref so it survives renders without retriggering effects.
	const scrollEntryDisengageRef = useRef(false);

	// Close why dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				whyDropdownRef.current &&
				!whyDropdownRef.current.contains(event.target as Node)
			) {
				setIsWhyDropdownOpen(false);
			}
		};
		if (isWhyDropdownOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isWhyDropdownOpen]);

	// Close what dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				whatDropdownRef.current &&
				!whatDropdownRef.current.contains(event.target as Node)
			) {
				setIsWhatDropdownOpen(false);
			}
		};
		if (isWhatDropdownOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isWhatDropdownOpen]);

	// Close where dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				whereDropdownRef.current &&
				!whereDropdownRef.current.contains(event.target as Node)
			) {
				setIsWhereDropdownOpen(false);
			}
		};
		if (isWhereDropdownOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isWhereDropdownOpen]);

	// NOTE: Keep Inbox tab code intact, but hide it for now.
	const ENABLE_DASHBOARD_INBOX_TAB = false;

	const initialTabFromQuery =
		ENABLE_DASHBOARD_INBOX_TAB && searchParams.get('tab') === 'inbox'
			? 'inbox'
			: 'search';
	const [activeTab, setActiveTab] = useState<'search' | 'inbox'>(initialTabFromQuery);
	const [hoveredTab, setHoveredTab] = useState<'search' | 'inbox' | null>(null);
	// When hovering the "Searching New" status pill, preview what clicking it does
	// by morphing the pill into the destination's "Filtering in {campaign}" look.
	const [isSearchingPillHovered, setIsSearchingPillHovered] = useState(false);
	const inboxView = activeTab === 'inbox';
	type DashboardActionBarKey = 'playbook' | 'folder' | 'calendar' | 'star' | 'envelope';
	type DashboardMapTopActionKey = Exclude<DashboardActionBarKey, 'calendar'>;
	const [selectedActionBarIcon, setSelectedActionBarIcon] =
		useState<DashboardActionBarKey>('playbook');
	// Mobile dashboard tab bar selection (folders / calendar / inbox).
	const [mobileActiveTab, setMobileActiveTab] = useState<MobileDashboardTab>('folders');
	const [openMapTopAction, setOpenMapTopAction] =
		useState<DashboardMapTopActionKey | null>(null);
	const mapTopStrategyButtonRef = useRef<HTMLButtonElement>(null);
	const mapTopCampaignsFolderButtonRef = useRef<HTMLButtonElement>(null);
	const mapTopOpportunitiesButtonRef = useRef<HTMLButtonElement>(null);
	const mapTopResponsesButtonRef = useRef<HTMLButtonElement>(null);
	const mapTopStrategyDropdownRef = useRef<HTMLDivElement>(null);
	const mapTopCampaignsDropdownRef = useRef<HTMLDivElement>(null);
	const mapTopOpportunitiesPopupRef = useRef<HTMLDivElement>(null);
	const mapTopResponsesPopupRef = useRef<HTMLDivElement>(null);
	const toggleMapTopAction = (key: DashboardMapTopActionKey) => {
		setSelectedActionBarIcon(key);
		setActiveSection(null);
		setOpenMapTopAction((open) => (open === key ? null : key));
	};
	const campaignsDebugEnabled = searchParams.get('campaignsDebug') === '1';
	const [campaignsMockState, setCampaignsMockState] = useState<
		CampaignsMockState | undefined
	>(undefined);
	const calendarDebugEnabled = searchParams.get('calendarDebug') === '1';
	const [calendarMockState, setCalendarMockState] = useState<
		DashboardCalendarMockState | undefined
	>(undefined);
	const opportunitiesDebugEnabled = searchParams.get('opportunitiesDebug') === '1';
	const [opportunitiesMockState, setOpportunitiesMockState] = useState<
		OpportunitiesMockState | undefined
	>(undefined);
	const inboxDebugEnabled = searchParams.get('inboxDebug') === '1';
	const [responsesMockState, setResponsesMockState] = useState<
		ResponsesMockState | undefined
	>(undefined);
	const [isCampaignFinderOpen, setIsCampaignFinderOpen] = useState(false);
	// The calendar tab's body-portaled event-editor popup. Tracked here so the
	// scroll-to-map gesture can stand down while it floats over the hero.
	const [isCalendarPopupOpen, setIsCalendarPopupOpen] = useState(false);
	const isTabPreviewingOther = hoveredTab != null && hoveredTab !== activeTab;
	// Dashboard inbox deep-link (`?tab=inbox`) should land on the Campaigns sub-tab.
	const [inboxSubtab, setInboxSubtab] = useState<'messages' | 'campaigns'>('campaigns');
	useEffect(() => {
		if (!openMapTopAction) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			const targetElement =
				target instanceof Element
					? target
					: target instanceof Node
						? target.parentElement
						: null;
			const activeButtonRef =
				openMapTopAction === 'playbook'
					? mapTopStrategyButtonRef
					: openMapTopAction === 'folder'
						? mapTopCampaignsFolderButtonRef
						: openMapTopAction === 'star'
							? mapTopOpportunitiesButtonRef
							: mapTopResponsesButtonRef;
			const activePopupRef =
				openMapTopAction === 'playbook'
					? mapTopStrategyDropdownRef
					: openMapTopAction === 'folder'
						? mapTopCampaignsDropdownRef
						: openMapTopAction === 'star'
							? mapTopOpportunitiesPopupRef
							: mapTopResponsesPopupRef;

			if (activeButtonRef.current?.contains(target)) return;
			if (targetElement?.closest('.campaign-finder-context-menu, .campaign-finder-info-popup')) {
				return;
			}
			if (activePopupRef.current?.contains(target)) return;

			setOpenMapTopAction(null);
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setOpenMapTopAction(null);
		};

		document.addEventListener('mousedown', handleClickOutside);
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [openMapTopAction]);
	// Handle tab query parameter
	// Only react to *URL changes*. If we also depend on `activeTab`, this effect can run
	// immediately after a click-driven tab switch (before `router.replace` updates the URL),
	// momentarily forcing the UI back to the previous tab (the "flash" you were seeing).
	const tabParam = searchParams.get('tab');
	useEffect(() => {
		if (tabParam === 'search') {
			// URL is the source of truth when it changes externally (back/forward, deep link)
			setActiveTab('search');
			return;
		}

		if (tabParam === 'inbox') {
			if (ENABLE_DASHBOARD_INBOX_TAB) {
				setActiveTab('inbox');
			} else {
				// Normalize old deep-links back to Search while Inbox is disabled.
				setActiveTab('search');
				updateTabQueryParam('search');
			}
		}
	}, [tabParam]);
	useEffect(() => {
		// Clear any hover-preview state when the real tab changes.
		setHoveredTab(null);
	}, [activeTab]);
	const [userLocationName, setUserLocationName] = useState<string | null>(null);
	const [isLoadingLocation, setIsLoadingLocation] = useState(false);

	const [isBelowMd, setIsBelowMd] = useState(false);
	const [isXlDesktop, setIsXlDesktop] = useState(false);
	const [viewportWidth, setViewportWidth] = useState(0);
	const [viewportHeight, setViewportHeight] = useState(0);
	// Map-view chrome width state: 'full' (today's layout), 'mid' (centered chrome
	// re-centers over the map strip beside the right panel), 'compressed' (results
	// panel becomes a bottom sheet under the top-half map).
	const [mapChromeState, setMapChromeState] = useState<'full' | 'mid' | 'compressed'>(
		'full'
	);

	// Detect desktop width breakpoints. Layout effect so a narrow first paint (e.g. a
	// ?fromHome=1 deep link straight into map view) never flashes the wide chrome.
	useLayoutEffect(() => {
		if (typeof window === 'undefined') return;

		const handleResize = () => {
			const width = window.innerWidth;
			setViewportWidth(width);
			setIsBelowMd(width < 768);
			setIsXlDesktop(width >= 1280);
			setViewportHeight(window.innerHeight);
			// Same zoom the map-view layout effect applies, so chrome state and zoom
			// always change together from the same inputs.
			const layoutWidth = width / getMurmurChromeZoomForWindow();
			setMapChromeState(
				layoutWidth < MAP_CHROME_COMPRESSED_MAX_LAYOUT_WIDTH_PX
					? 'compressed'
					: layoutWidth < MAP_CHROME_MID_MAX_LAYOUT_WIDTH_PX
						? 'mid'
						: 'full'
			);
		};

		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);
	const isCompressedMapChrome = mapChromeState === 'compressed';

	// Helper to trigger search with a specific "where" value (called when clicking state from dropdown)
	const triggerSearchWithWhere = (
		newWhereValue: string,
		isNearMe = false,
		base?: { why?: string; what?: string }
	) => {
		const trimmedNewWhere = newWhereValue.trim();
		const initialBaseWhat = base?.what ?? whatValue;
		// Selecting a Where without a What would otherwise build a query like
		// "[Booking] (Maine)" — no category to match against. Default to the
		// Wine/Beer/Spirits category so the curated search returns real results.
		const shouldAutoFillWhat = trimmedNewWhere.length > 0 && !initialBaseWhat.trim();
		const baseWhat = shouldAutoFillWhat ? DEFAULT_CATEGORY_SEARCH_WHAT : initialBaseWhat;
		const baseWhy = shouldAutoFillWhat
			? getCategorySearchWhyForWhat(baseWhat)
			: (base?.why ?? whyValue);

		// Update the state values
		if (shouldAutoFillWhat) {
			if (baseWhy !== whyValue) setWhyValue(baseWhy);
			if (baseWhat !== whatValue) setWhatValue(baseWhat);
		} else {
			if (base?.why !== undefined && base.why !== whyValue) setWhyValue(base.why);
			if (base?.what !== undefined && base.what !== whatValue) setWhatValue(base.what);
		}
		setWhereValue(newWhereValue);
		setIsNearMeLocation(isNearMe);
		setActiveSection(null);

		// Build the combined search query with the new where value
		const formattedWhere = trimmedNewWhere ? `(${trimmedNewWhere})` : '';
		const combinedSearch = [baseWhy, baseWhat, formattedWhere]
			.filter(Boolean)
			.join(' ')
			.trim();

		// Trigger the search immediately (no setTimeout) to avoid race conditions
		// when user interacts with the map during zoom animation.
		if (combinedSearch && onSubmit) {
			// Update form value for display consistency
			form.setValue('searchText', combinedSearch, {
				shouldValidate: false,
				shouldDirty: true,
			});
			// Call onSubmit directly with the search data
			onSubmit({
				searchText: combinedSearch,
				excludeUsedContacts: form.getValues('excludeUsedContacts') ?? false,
			});
		}
	};

	// Helper to trigger search with current input values (called on Enter key in "Where" input)
	const triggerSearchWithCurrentValues = async () => {
		setActiveSection(null);

		// If "Where" (or the entire bar) is blank, auto-fill before submitting.
		await ensureNonEmptyDashboardSearchOnBlankSubmit();

		const trimmedWhere = whereValue.trim();
		const trimmedWhat = whatValue.trim();
		// Where without What would build "[Booking] (Maine)" with no category — default
		// to Wine/Beer/Spirits so the curated search has a real category to filter on.
		const shouldAutoFillWhat = trimmedWhere.length > 0 && !trimmedWhat;
		const effectiveWhat = shouldAutoFillWhat ? DEFAULT_CATEGORY_SEARCH_WHAT : whatValue;
		const effectiveWhy = shouldAutoFillWhat
			? getCategorySearchWhyForWhat(effectiveWhat)
			: whyValue;
		if (shouldAutoFillWhat) {
			if (effectiveWhat !== whatValue) setWhatValue(effectiveWhat);
			if (effectiveWhy !== whyValue) setWhyValue(effectiveWhy);
		}

		// Build the combined search query
		const formattedWhere = trimmedWhere ? `(${trimmedWhere})` : '';
		const combinedSearch = [effectiveWhy, effectiveWhat, formattedWhere]
			.filter(Boolean)
			.join(' ')
			.trim();

		// Set form value and submit
		if (combinedSearch && form && onSubmit) {
			form.setValue('searchText', combinedSearch, {
				shouldValidate: false,
				shouldDirty: true,
			});
			form.handleSubmit(onSubmit)();
			return;
		}

		// Fallback: submit whatever is currently in the form (e.g. after auto-fill setValue).
		const currentSearchText = (form.getValues('searchText') ?? '').trim();
		if (currentSearchText && onSubmit) {
			form.handleSubmit(onSubmit)();
		}
	};

	const renderDesktopSearchDropdowns = () => {
		if (!activeSection) return null;

		// Don't show dropdowns in demo mode - search is locked to the pre-configured query
		if (isFromHomeDemoMode) {
			// Close the section and show a message
			setActiveSection(null);
			setShowFreeTrialPrompt(true);
			return null;
		}

		// Match the active-section pill timing (0.6s) and easing.
		const dropdownEase = 'cubic-bezier(0.22, 1, 0.36, 1)';
		const dropdownTransition = `left 0.6s ${dropdownEase}, height 0.6s ${dropdownEase}`;
		// Slightly faster than the pill, per UX request.
		const dropdownFadeTransition = `opacity 0.35s ${dropdownEase}`;
		const isMapBottomCategoryDropdown =
			isMapBottomCategoryMode && isMapBottomCategoryDropdownActive;
		const shouldShowPromotionOnlyWhatDropdown =
			whyValue === '[Promotion]' && !isMapBottomCategoryDropdown;
		const selectWhatFromDropdown = (nextWhat: string) => {
			if (isMapBottomCategoryDropdown) {
				setWhyValue(getCategorySearchWhyForWhat(nextWhat));
				setWhatValue(nextWhat);
				setActiveSection('where');
				return;
			}

			setWhatValue(nextWhat);
			// On the results screen, changing "What" should immediately re-search
			// without auto-advancing the UI to the "Where" (state) step.
			setActiveSection(isMapView ? null : 'where');
		};

		const dropdownHeight =
			activeSection === 'why'
				? 173
				: activeSection === 'what'
					? shouldShowPromotionOnlyWhatDropdown
						? 92
						: 404
					: 370;

		const dropdownLeft = isMapView
			? activeSection === 'why'
				? 'calc(50% - 220px)'
				: activeSection === 'what'
					? 'calc(50% - 60px)'
					: 'calc(50% - 120px)'
			: activeSection === 'why'
				? 4
				: activeSection === 'what'
					? 176
					: 98;

		const canonicalWhereState = normalizeUsStateName(whereValue);
		const whereQuery = whereValue.trim().toLowerCase();
		const allWhereStateNames = buildAllUsStateNames();
		const matchingWhereStateNames =
			whereQuery.length > 0
				? allWhereStateNames.filter((stateName) => {
						const stateNameLower = stateName.toLowerCase();
						const stateAbbrLower = getStateAbbreviation(stateName)?.toLowerCase() ?? '';
						return (
							stateNameLower.includes(whereQuery) || stateAbbrLower.includes(whereQuery)
						);
					})
				: DEFAULT_STATE_SUGGESTIONS.map((suggestion) => suggestion.label);
		const nearbyWhereStateNames =
			activeSection === 'where' && isMapView && canonicalWhereState
				? getNearestUsStateNames(canonicalWhereState, 4)
				: [];
		const whereDropdownStateNames = buildAllUsStateNames([
			...matchingWhereStateNames,
			...(canonicalWhereState ? [canonicalWhereState] : []),
			...nearbyWhereStateNames,
		]);

		const whereDropdownLocations = whereDropdownStateNames.map((name) => ({
			city: '',
			state: name,
			label: name,
		}));

		const dropdownContent = (
			<div
				className="search-dropdown-menu w-[439px] max-w-[calc(100vw-16px)] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[110] relative overflow-hidden"
				style={
					isMapBottomCategoryDropdown
						? {
								position: 'fixed',
								left: '50%',
								bottom: `${
									MAP_RESULTS_BOTTOM_SEARCH_BOX.bottomOffset +
									MAP_RESULTS_BOTTOM_CATEGORY_SEARCH_BOX.height +
									14
								}px`,
								transform: 'translateX(-50%)',
								height: dropdownHeight,
								transition: dropdownTransition,
								willChange: 'height',
								zIndex: 140,
							}
						: isMapView
							? {
									position: 'fixed',
									// In map view, the mini search bar is overlaid on the map,
									// so the dropdown should anchor just below it.
									// Search bar is fixed at 33px and the input is 49px tall; add a small gap.
									top: '92px',
									left: isBelowMd ? '50%' : dropdownLeft,
									transform: isBelowMd ? 'translateX(-50%)' : undefined,
									height: dropdownHeight,
									transition: dropdownTransition,
									willChange: 'left, height',
									// Ensure dropdown appears above the overlaid search bar.
									zIndex: 140,
								}
							: {
									position: 'absolute',
									top: 'calc(100% + 10px)',
									// Anchored in zoomed hero px; the root zoom keeps it
									// proportional at every window width.
									left: dropdownLeft,
									height: dropdownHeight,
									transition: dropdownTransition,
									willChange: 'left, height',
								}
				}
			>
				{/* Cross-fade the inner content so height changes don't "lift" it. */}
				<div
					className="absolute inset-0"
					style={{
						opacity: activeSection === 'why' ? 1 : 0,
						pointerEvents: activeSection === 'why' ? 'auto' : 'none',
						transition: dropdownFadeTransition,
						willChange: 'opacity',
					}}
				>
					<div className="flex flex-col items-center justify-start gap-[12px] w-full h-full py-[12px]">
						<div
							className="w-[410px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200"
							onClick={() => {
								setWhyValue('[Booking]');
								setActiveSection('what');
							}}
						>
							<div className="w-[38px] h-[38px] bg-[#9DCBFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
								<BookingIcon />
							</div>
							<div className="ml-[12px] flex flex-col">
								<div className="text-[20px] font-medium leading-none text-black font-inter">
									Booking
								</div>
								<div className="text-[12px] leading-tight text-black mt-[4px] max-w-[300px]">
									contact venues, resturants and more, to book shows
								</div>
							</div>
						</div>
						<div
							className="w-[410px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200"
							onClick={() => {
								setWhyValue('[Promotion]');
								setActiveSection('what');
							}}
						>
							<div className="w-[38px] h-[38px] bg-[#7AD47A] rounded-[8px] flex-shrink-0 flex items-center justify-center">
								<PromotionIcon />
							</div>
							<div className="ml-[12px] flex flex-col">
								<div className="text-[20px] font-medium leading-none text-black font-inter">
									Promotion
								</div>
								<div className="text-[12px] leading-tight text-black mt-[4px] max-w-[300px]">
									reach out to radio stations, playlists, and more to get your music
									played
								</div>
							</div>
						</div>
					</div>
				</div>

				<div
					className="absolute inset-0"
					style={{
						opacity: activeSection === 'what' ? 1 : 0,
						pointerEvents: activeSection === 'what' ? 'auto' : 'none',
						transition: dropdownFadeTransition,
						willChange: 'opacity',
					}}
				>
					{/* What dropdown - Promotion */}
					{shouldShowPromotionOnlyWhatDropdown ? (
						<div className="flex flex-col items-center justify-start gap-[10px] w-full h-full py-[12px]">
							<div
								className="w-[415px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
								onClick={() => selectWhatFromDropdown('Radio Stations')}
							>
								<div className="w-[38px] h-[38px] bg-[#56DA73] rounded-[8px] flex-shrink-0 flex items-center justify-center">
									<RadioStationsIcon />
								</div>
								<div className="ml-[12px] flex flex-col">
									<div className="text-[20px] font-medium leading-none text-black font-inter">
										Radio Stations
									</div>
									<div className="text-[12px] leading-tight text-black mt-[4px]">
										Reach out to radio stations
									</div>
								</div>
							</div>
						</div>
					) : (
						<div id="what-dropdown-container" className="w-full h-full">
							<style jsx global>{`
								#what-dropdown-container .scrollbar-hide {
									scrollbar-width: none !important;
									scrollbar-color: transparent transparent !important;
									-ms-overflow-style: none !important;
								}
								#what-dropdown-container .scrollbar-hide::-webkit-scrollbar {
									display: none !important;
									width: 0 !important;
									height: 0 !important;
								}
							`}</style>
							<CustomScrollbar
								className="w-full h-full"
								contentClassName="flex flex-col items-center gap-[10px] py-[12px]"
								thumbWidth={2}
								thumbColor="#000000"
								trackColor="transparent"
								offsetRight={-5}
							>
								<div
									className="w-[415px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => selectWhatFromDropdown('Wine, Beer, and Spirits')}
								>
									<div className="w-[38px] h-[38px] bg-[#80AAFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<WineBeerSpiritsIcon size={22} />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Wine, Beer, and Spirits
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Pitch your act for seasonal events
										</div>
									</div>
								</div>
								<div
									className="w-[415px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => selectWhatFromDropdown('Restaurants')}
								>
									<div className="w-[38px] h-[38px] bg-[#77DD91] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<RestaurantsIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Restaurants
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Land steady dinner and brunch gigs
										</div>
									</div>
								</div>
								{isMapBottomCategoryDropdown && (
									<div
										className="w-[415px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
										onClick={() => selectWhatFromDropdown('Radio Stations')}
									>
										<div className="w-[38px] h-[38px] bg-[#56DA73] rounded-[8px] flex-shrink-0 flex items-center justify-center">
											<RadioStationsIcon />
										</div>
										<div className="ml-[12px] flex flex-col">
											<div className="text-[20px] font-medium leading-none text-black font-inter">
												Radio Stations
											</div>
											<div className="text-[12px] leading-tight text-black mt-[4px]">
												Reach out to radio stations
											</div>
										</div>
									</div>
								)}
								<div
									className="w-[415px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => selectWhatFromDropdown('Coffee Shops')}
								>
									<div className="w-[38px] h-[38px] bg-[#A9DE78] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<CoffeeShopsIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Coffee Shops
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Book intimate daytime performances
										</div>
									</div>
								</div>
								<div
									className="w-[415px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => selectWhatFromDropdown('Festivals')}
								>
									<div className="w-[38px] h-[38px] bg-[#80AAFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<FestivalsIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Festivals
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Pitch your act for seasonal events
										</div>
									</div>
								</div>
								<div
									className="w-[415px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => selectWhatFromDropdown('Wedding Planners')}
								>
									<div className="w-[38px] h-[38px] bg-[#EED56E] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<WeddingPlannersIcon size={22} />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Wedding Planners
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Get hired for ceremonies & receptions
										</div>
									</div>
								</div>
								<div
									className="w-[415px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => selectWhatFromDropdown('Music Venues')}
								>
									<div className="w-[38px] h-[38px] bg-[#71C9FD] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<MusicVenuesIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Music Venues
										</div>
										<div className="text-[12px] leading-tight text-black mt-[4px]">
											Reach talent buyers for live shows
										</div>
									</div>
								</div>
							</CustomScrollbar>
						</div>
					)}
				</div>

				<div
					className="absolute inset-0"
					style={{
						opacity: activeSection === 'where' ? 1 : 0,
						pointerEvents: activeSection === 'where' ? 'auto' : 'none',
						transition: dropdownFadeTransition,
						willChange: 'opacity',
					}}
				>
					<div id="where-dropdown-container" className="w-full h-full">
						<style jsx global>{`
							#where-dropdown-container .scrollbar-hide {
								scrollbar-width: none !important;
								scrollbar-color: transparent transparent !important;
								-ms-overflow-style: none !important;
							}
							#where-dropdown-container .scrollbar-hide::-webkit-scrollbar {
								display: none !important;
								width: 0 !important;
								height: 0 !important;
								background: transparent !important;
								-webkit-appearance: none !important;
							}
						`}</style>
						<CustomScrollbar
							className="w-full h-full"
							contentClassName="flex flex-col items-center justify-start gap-[20px] py-4"
							thumbWidth={2}
							thumbColor="#000000"
							trackColor="transparent"
							offsetRight={-5}
						>
							{whereValue.length < 1 && (
								<div
									className="w-[415px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										if (userLocationName && !isLoadingLocation) {
											triggerSearchWithWhere(userLocationName, true);
										}
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#D0E6FF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<NearMeIcon />
									</div>
									<div className="ml-[12px] flex flex-col">
										<div className="text-[20px] font-medium leading-none text-black font-inter">
											Near Me
										</div>
										<div
											className={`text-[12px] leading-tight mt-[4px] select-none ${
												userLocationName || isLoadingLocation
													? 'text-black/60'
													: 'text-transparent'
											}`}
										>
											{isLoadingLocation
												? 'Locating...'
												: userLocationName || 'Placeholder'}
										</div>
									</div>
								</div>
							)}

							{whereDropdownLocations.map((loc, idx) => {
								const { icon, backgroundColor } = getCityIconProps(loc.city, loc.state);
								return (
									<div
										key={`${loc.city}-${loc.state}-${loc.label}-${idx}`}
										className="w-[415px] max-w-[calc(100%-24px)] min-h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
										onClick={() => {
											triggerSearchWithWhere(loc.label, false);
										}}
									>
										<div
											className="w-[38px] h-[38px] rounded-[8px] flex-shrink-0 flex items-center justify-center"
											style={{ backgroundColor }}
										>
											{icon}
										</div>
										<div className="ml-[12px] flex flex-col">
											<div className="text-[20px] font-medium leading-none text-black font-inter">
												{loc.label}
											</div>
											<div className="text-[12px] leading-tight text-black mt-[4px]">
												Search contacts in {loc.city || loc.state}
											</div>
										</div>
									</div>
								);
							})}
						</CustomScrollbar>
					</div>
				</div>
			</div>
		);

		// Map and bottom-category dropdowns render via portal to escape stacking contexts.
		if ((isMapView || isMapBottomCategoryDropdown) && typeof window !== 'undefined') {
			return createPortal(dropdownContent, document.body);
		}

		return dropdownContent;
	};

	useEffect(() => {
		if (activeSection === 'where' && !userLocationName && !isLoadingLocation) {
			setIsLoadingLocation(true);
			if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
				navigator.geolocation.getCurrentPosition(
					async (position) => {
						try {
							const { latitude, longitude } = position.coords;
							const response = await fetch(
								`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
							);
							const data = await response.json();
							const city =
								data.address?.city ||
								data.address?.town ||
								data.address?.village ||
								data.address?.hamlet;
							const state = data.address?.state;

							const stateToAbbr: Record<string, string> = {
								Alabama: 'AL',
								Alaska: 'AK',
								Arizona: 'AZ',
								Arkansas: 'AR',
								California: 'CA',
								Colorado: 'CO',
								Connecticut: 'CT',
								Delaware: 'DE',
								Florida: 'FL',
								Georgia: 'GA',
								Hawaii: 'HI',
								Idaho: 'ID',
								Illinois: 'IL',
								Indiana: 'IN',
								Iowa: 'IA',
								Kansas: 'KS',
								Kentucky: 'KY',
								Louisiana: 'LA',
								Maine: 'ME',
								Maryland: 'MD',
								Massachusetts: 'MA',
								Michigan: 'MI',
								Minnesota: 'MN',
								Mississippi: 'MS',
								Missouri: 'MO',
								Montana: 'MT',
								Nebraska: 'NE',
								Nevada: 'NV',
								'New Hampshire': 'NH',
								'New Jersey': 'NJ',
								'New Mexico': 'NM',
								'New York': 'NY',
								'North Carolina': 'NC',
								'North Dakota': 'ND',
								Ohio: 'OH',
								Oklahoma: 'OK',
								Oregon: 'OR',
								Pennsylvania: 'PA',
								'Rhode Island': 'RI',
								'South Carolina': 'SC',
								'South Dakota': 'SD',
								Tennessee: 'TN',
								Texas: 'TX',
								Utah: 'UT',
								Vermont: 'VT',
								Virginia: 'VA',
								Washington: 'WA',
								'West Virginia': 'WV',
								Wisconsin: 'WI',
								Wyoming: 'WY',
							};

							const stateAbbr = state ? stateToAbbr[state] || state : null;

							if (city && stateAbbr) {
								setUserLocationName(`${city}, ${stateAbbr}`);
							} else if (city) {
								setUserLocationName(city);
							} else if (stateAbbr) {
								setUserLocationName(stateAbbr);
							} else {
								setUserLocationName('Current Location');
							}
						} catch (error) {
							console.error('Error getting location:', error);
							setUserLocationName('Unable to find location');
						} finally {
							setIsLoadingLocation(false);
						}
					},
					(error) => {
						console.error('Geolocation error:', error);
						setUserLocationName('Location access needed');
						setIsLoadingLocation(false);
					}
				);
			} else {
				setUserLocationName('Geolocation not supported');
				setIsLoadingLocation(false);
			}
		}
	}, [activeSection, userLocationName, isLoadingLocation]);

	useEffect(() => {
		if (isMobile !== true) {
			setIsMobileLandscape(false);
			return;
		}

		const check = () => {
			if (typeof window !== 'undefined') {
				setIsMobileLandscape(window.innerWidth > window.innerHeight);
			}
		};

		check();
		window.addEventListener('resize', check);
		window.addEventListener('orientationchange', check);
		return () => {
			window.removeEventListener('resize', check);
			window.removeEventListener('orientationchange', check);
		};
	}, [isMobile]);

	// Hero logo sizing. Desktop is frozen at the 1512×945 anchor size (300x79): the whole
	// dashboard scales uniformly via the root zoom, so any vw-based sizing here would
	// double-scale and break the hero's proportions at narrow window widths.
	const logoWidth = isMobile ? 'clamp(150px, 45vw, 190px)' : '300px';
	const logoHeight = isMobile ? 'clamp(39.5px, 11.85vw, 50px)' : '79px';
	const hasProblematicBrowser = isProblematicBrowser();
	useMe(); // Hook call for side effects
	const tabToggleTrackRef = useRef<HTMLDivElement>(null);
	const tabTogglePillRef = useRef<HTMLDivElement>(null);
	const tabToggleHoverPillRef = useRef<HTMLDivElement>(null);
	const tabToggleWhitePillRef = useRef<HTMLDivElement>(null);
	const tabbedLandingBoxRef = useRef<HTMLDivElement>(null);
	const dashboardContentRef = useRef<HTMLDivElement>(null);
	const isTabSwitchAnimatingRef = useRef(false);
	const tabSwitchTimelineRef = useRef<gsap.core.Timeline | null>(null);
	const searchContainerRef = useRef<HTMLDivElement>(null);
	const heroSearchGradientButtonRef = useRef<HTMLButtonElement>(null);
	const heroSearchIconButtonRef = useRef<HTMLButtonElement>(null);
	const heroSearchGradientAnimRestoreRef = useRef<Map<Animation, number> | null>(null);
	const whatInputRef = useRef<HTMLInputElement>(null);
	const whereInputRef = useRef<HTMLInputElement>(null);
	const activeSectionIndicatorRef = useRef<HTMLDivElement>(null);
	const prevActiveSectionForIndicatorRef = useRef<'why' | 'what' | 'where' | null>(null);
	// Mini search bar (map view results) indicator refs
	const miniActiveSectionIndicatorRef = useRef<HTMLDivElement>(null);
	const prevMiniActiveSectionRef = useRef<'why' | 'what' | 'where' | null>(null);

	const updateSpotlightVarsFromPointer = useCallback(
		(event: ReactPointerEvent<HTMLElement>) => {
			// Avoid sticky hover behavior on touch devices (pointerenter can be fired on pointerdown).
			if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
			const el = event.currentTarget;
			const rect = el.getBoundingClientRect();
			const x = event.clientX - rect.left;
			// Keep the glow vertically centered while the horizontal position follows the pointer.
			const y = rect.height / 2;
			el.style.setProperty('--spotlight-x', `${x}px`);
			el.style.setProperty('--spotlight-y', `${y}px`);
		},
		[]
	);

	const setHeroSearchGradientPlaybackRate = useCallback(
		(nextPlaybackRate: number | null) => {
			const gradientEl = heroSearchGradientButtonRef.current;
			if (!gradientEl) return;

			if (typeof window !== 'undefined') {
				if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
			}

			const animations = gradientEl.getAnimations();
			if (animations.length === 0) return;

			if (typeof nextPlaybackRate === 'number') {
				// Capture original rates on first hover so we can restore precisely.
				if (!heroSearchGradientAnimRestoreRef.current) {
					heroSearchGradientAnimRestoreRef.current = new Map(
						animations.map((anim) => [anim, anim.playbackRate])
					);
				}
				animations.forEach((anim) => {
					try {
						anim.updatePlaybackRate(nextPlaybackRate);
					} catch {
						// Fallback: set synchronously if updatePlaybackRate isn't available for some reason.
						anim.playbackRate = nextPlaybackRate;
					}
				});
				return;
			}

			const restoreMap = heroSearchGradientAnimRestoreRef.current;
			if (!restoreMap) return;
			restoreMap.forEach((rate, anim) => {
				try {
					anim.updatePlaybackRate(rate);
				} catch {
					anim.playbackRate = rate;
				}
			});
			heroSearchGradientAnimRestoreRef.current = null;
		},
		[]
	);
	// Derive title for contacts without one (e.g., "Restaurants New York")
	const derivedContactTitle = useMemo(() => {
		if (!whatValue) return undefined;
		if (whereValue) {
			return `${whatValue} ${whereValue}`;
		}
		return whatValue;
	}, [whatValue, whereValue]);

	// Check if this is a restaurant search - if so, all contacts should get the restaurant label
	const isRestaurantSearch = useMemo(() => {
		return /^restaurants?$/i.test(whatValue.trim());
	}, [whatValue]);

	// Check if this is a coffee shop search - if so, all contacts should get the coffee shop label
	const isCoffeeShopSearch = useMemo(() => {
		return /^coffee\s*shops?$/i.test(whatValue.trim());
	}, [whatValue]);

	// Combined flag for searches that should force-apply the derived title to all contacts
	const shouldForceApplyDerivedTitle = isRestaurantSearch || isCoffeeShopSearch;

	const {
		form,
		onSubmit,
		isLoadingContacts,
		handleCreateCampaign,
		isPendingCreateCampaign,
		contacts,
		columns,
		setSelectedContacts,
		isWriteMode,
		setIsWriteMode,
		isRefetchingContacts,
		activeSearchQuery,
		tableRef,
		selectedContacts,
		undoLastSelection,
		canUndoSelection,
		isPendingBatchUpdateContacts,
		isError,
		error,
		hasSearched,
		handleResetSearch,
		handleSelectAll,
		setHoveredContact,
		hoveredContact,
		isMapView,
		setIsMapView,
		isSearchPending,
		isFromHomeDemoMode,
		mapBboxFilter,
		setMapBboxFilter,
		triggerCuratedSearch,
		prefetchCuratedSearch,
		rehydrateCuratedSession,
		isCuratedSearchActive,
		lastCuratedArgs,
		primeFreeTextSearch,
		triggerFreeTextSearch,
		rehydrateFreeTextSession,
		lastFreeTextArgs,
		activeCampaignId,
		activeCampaign,
		setActiveCampaignId,
		ensureActiveCampaign,
	} = useDashboard({
		derivedTitle: derivedContactTitle,
		forceApplyDerivedTitle: shouldForceApplyDerivedTitle,
		fromHome: fromHomeParam,
		disableAutoCreateCampaign: isAddToCampaignMode,
	});

	// Dashboard search has its own campaign context. In normal mode it follows the
	// active campaign; in add-to-campaign mode it follows `fromCampaignId`; after a
	// folder-dropdown pick it follows the locally selected id immediately, without
	// waiting for a navigation/remount. This is the source of truth for the search
	// page header, counts, add-to-folder/write actions, and campaign tab prefetching.
	const dashboardSearchCampaignOverride = useMemo(() => {
		if (dashboardSearchCampaignIdOverride == null) return null;
		if (fromCampaign?.id === dashboardSearchCampaignIdOverride) return fromCampaign;
		if (activeCampaign?.id === dashboardSearchCampaignIdOverride) return activeCampaign;
		if (fetchedDashboardSearchCampaignOverride?.id === dashboardSearchCampaignIdOverride) {
			return fetchedDashboardSearchCampaignOverride;
		}
		return null;
	}, [
		activeCampaign,
		dashboardSearchCampaignIdOverride,
		fetchedDashboardSearchCampaignOverride,
		fromCampaign,
	]);
	const dashboardSearchCampaign =
		dashboardSearchCampaignOverride ?? fromCampaign ?? activeCampaign;
	const addToCampaignUserContactListId =
		dashboardSearchCampaign?.userContactLists?.[0]?.id;

	// Profile search source: the active campaign's identity, falling back to the
	// user's most-recently-edited identity. Mirrored to a ref so the stable submit
	// callback reads the latest without churning its deps.
	const { data: userIdentities } = useGetIdentities({});
	const resolvedIdentity = useMemo<ProfileIdentityInput | null>(() => {
		if (activeCampaign?.identity) return activeCampaign.identity;
		const list = userIdentities ?? [];
		if (list.length === 0) return null;
		return [...list].sort(
			(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
		)[0];
	}, [activeCampaign, userIdentities]);
	const resolvedIdentityRef = useRef<ProfileIdentityInput | null>(null);
	useEffect(() => {
		resolvedIdentityRef.current = resolvedIdentity;
	}, [resolvedIdentity]);

	// True while the dashboard Write overlay shows the post-draft review; keeps the overlay mounted
	// even if the live map selection changes mid-review.
	const [isWriteReviewActive, setIsWriteReviewActive] = useState(false);
	const [activeWriteReviewContactId, setActiveWriteReviewContactId] = useState<
		number | null
	>(null);
	const [dashboardDraftingStatus, setDashboardDraftingStatus] =
		useState<DashboardDraftingStatus>({
			isDrafting: false,
			activeContactId: null,
			completedContactIds: [],
			total: 0,
		});
	const [isDashboardDraftingDeckCollapsed, setIsDashboardDraftingDeckCollapsed] =
		useState(false);
	const [folderMoveNotice, setFolderMoveNotice] = useState<FolderMoveNotice | null>(
		null
	);
	useEffect(() => {
		if (!isWriteMode) {
			setIsWriteReviewActive(false);
			setActiveWriteReviewContactId(null);
			setDashboardDraftingStatus({
				isDrafting: false,
				activeContactId: null,
				completedContactIds: [],
				total: 0,
			});
			setIsDashboardDraftingDeckCollapsed(false);
		}
	}, [isWriteMode]);

	useEffect(() => {
		if (!isWriteReviewActive) setActiveWriteReviewContactId(null);
	}, [isWriteReviewActive]);

	useEffect(() => {
		if (isWriteMode && selectedContacts.length === 0 && !isWriteReviewActive) {
			setIsWriteMode(false);
		}
	}, [isWriteMode, isWriteReviewActive, selectedContacts.length, setIsWriteMode]);

	const handleActiveWriteReviewContactChange = useCallback((contactId: number | null) => {
		setActiveWriteReviewContactId(contactId);
		if (contactId != null) {
			setIsWriteReviewActive(true);
		}
	}, []);

	const handleCloseWriteOverlay = useCallback(() => {
		setIsWriteMode(false);
		setIsWriteReviewActive(false);
		setActiveWriteReviewContactId(null);
		setDashboardDraftingStatus({
			isDrafting: false,
			activeContactId: null,
			completedContactIds: [],
			total: 0,
		});
		setIsDashboardDraftingDeckCollapsed(false);
		setSelectedContacts([]);
	}, [setIsWriteMode, setSelectedContacts]);

	const handleDashboardDraftingStatusChange = useCallback(
		(status: DashboardDraftingStatus) => {
			setDashboardDraftingStatus(status);
		},
		[]
	);

	useEffect(() => {
		if (folderMoveNotice?.phase !== 'complete') return;

		const fadeTimer = window.setTimeout(() => {
			setFolderMoveNotice((current) =>
				current?.phase === 'complete' ? { ...current, phase: 'exiting' } : current
			);
		}, 900);

		return () => window.clearTimeout(fadeTimer);
	}, [folderMoveNotice]);

	useEffect(() => {
		if (folderMoveNotice?.phase !== 'exiting') return;

		const removeTimer = window.setTimeout(() => {
			setFolderMoveNotice((current) =>
				current?.phase === 'exiting' ? null : current
			);
		}, 220);

		return () => window.clearTimeout(removeTimer);
	}, [folderMoveNotice]);

	useEffect(() => {
		if (!isMapView) setOpenMapTopAction(null);
	}, [isMapView]);

	// --- Search → Campaign hover prefetch -----------------------------------
	// The map-view top tabs (Write/Campaign/Inbox/Drafts) all router.push to the
	// same /murmur/campaign/[id] route. Warm that navigation ahead of the click:
	// Tier 1 = the route's JS chunks (always, on hover); Tier 2/3 = the React Query
	// cache the campaign page reads on mount (campaign detail + identities + the
	// heavy contacts list), gated behind real intent. mapCampaignId mirrors the
	// value the tabs compute below.
	const mapCampaignId =
		(dashboardSearchCampaignIdOverride != null
			? String(dashboardSearchCampaignIdOverride)
			: '') ||
		fromCampaignIdParam ||
		(activeCampaignId != null ? String(activeCampaignId) : '');
	// Per-campaign color scheme for the top navigation box + folder icon (matches
	// the campaign page's header for the same campaign).
	const topNavScheme = useCampaignTopNavScheme(mapCampaignId);

	// The exact contacts filter the campaign page issues (see useDraftingSection):
	// derived purely from the campaign's contact lists, so the prefetch lands on the
	// same React Query key. null when the campaign isn't warm enough to build it —
	// in that case we skip the contacts prefetch rather than miss the key.
	const prefetchContactsFilter = useMemo(() => {
		const lists = dashboardSearchCampaign?.userContactLists;
		if (!lists) return null;
		return { contactListIds: lists.map((list) => list.id) };
	}, [dashboardSearchCampaign]);

	// Some campaign-page queries key on the NUMERIC campaign id (every campaign-page
	// caller passes `campaign.id` / `Number(params.campaignId)`); a string id would warm a
	// key nobody reads. null when we can't resolve a numeric id.
	const prefetchNumericCampaignId = useMemo(() => {
		if (dashboardSearchCampaign?.id != null) return dashboardSearchCampaign.id;
		const parsed = Number(mapCampaignId);
		return mapCampaignId && Number.isFinite(parsed) ? parsed : null;
	}, [dashboardSearchCampaign, mapCampaignId]);

	// True once contacts were added during this dashboard visit WITHOUT navigating
	// (folder add / write-selection commit). The campaign-tab pushes below append
	// `added=1` so the campaign page still refetches contacts in that case; pure
	// tab switches stay refetch-free. Read at click time via the ref.
	const hasAddedContactsThisVisitRef = useRef(false);
	const campaignReturnAddedSuffix = useCallback(
		() => (hasAddedContactsThisVisitRef.current ? '&added=1' : ''),
		[]
	);
	const [optimisticSearchToCampaignTab, setOptimisticSearchToCampaignTab] =
		useState<'write' | 'drafts' | 'inbox' | 'sent' | 'all' | null>(null);
	// Latch: true from the instant a search → campaign tab handoff is armed until it
	// completes (this page unmounts) or is abandoned (the safety timeout below). The
	// dashboard stays mounted and interactive while Next.js loads the campaign route,
	// and the shared persistent map keeps firing THIS page's handlers. Any dashboard
	// self-navigation (a router.replace on the dashboard URL) during that window would
	// supersede the in-flight router.push and bounce the user back to the dashboard —
	// which reads as "the tab I clicked got undone" when you play with the map mid-
	// transition. While this is set, the URL-mirror effects and the map gestures that
	// would start a new dashboard search all bail, so the campaign push always wins.
	const isLeavingForCampaignRef = useRef(false);

	// Arm the leaving-for-campaign latch for any dashboard → campaign navigation. The
	// dashboard stays mounted on the shared persistent map while Next.js loads the
	// campaign route, so this stands the dashboard's own URL writers down until the
	// handoff completes (unmount) or is abandoned (the timeout self-heals control).
	const beginCampaignHandoffLatch = useCallback(() => {
		isLeavingForCampaignRef.current = true;
		if (typeof window === 'undefined') return;
		window.setTimeout(() => {
			isLeavingForCampaignRef.current = false;
		}, 6000);
	}, []);

	const armSearchToCampaignTransition = useCallback(
		(tab?: 'write' | 'drafts' | 'inbox' | 'sent' | 'all') => {
			if (typeof window === 'undefined') return;

			try {
				window.sessionStorage.setItem(
					SEARCH_TO_CAMPAIGN_TRANSITION_KEY,
					String(Date.now())
				);
			} catch {
				// Best-effort only: navigation should never depend on transition storage.
			}

			document.body.classList.add(SEARCH_TO_CAMPAIGN_TRANSITION_BODY_CLASS);
			if (tab) {
				document.body.dataset.searchToCampaignTab = tab;
			} else {
				delete document.body.dataset.searchToCampaignTab;
			}

			// If navigation is interrupted or the route chunk is unusually slow, do not leave
			// the dashboard chrome faded forever. The campaign page also removes this class
			// when it mounts/reveals.
			window.setTimeout(() => {
				document.body.classList.remove(SEARCH_TO_CAMPAIGN_TRANSITION_BODY_CLASS);
				delete document.body.dataset.searchToCampaignTab;
			}, 6000);
		},
		[]
	);

	// The ask-box flanking nav boxes jump to the in-scope campaign's tabs, reusing
	// the same push pattern as the map-view tab buttons below.
	const navigateToCampaignRouteFromSearch = useCallback(
		(tab: 'write' | 'drafts' | 'inbox' | 'sent' | 'all') => {
			if (!mapCampaignId) return;
			const href = `${urls.murmur.campaign.detail(mapCampaignId)}?origin=search&tab=${tab}${campaignReturnAddedSuffix()}`;

			// Latch the handoff BEFORE any state commit so the URL-mirror effects and
			// map-search gestures that this same click frame (or a mid-transition map
			// interaction) could trigger see the page as "leaving" and stand down. This
			// guarantees the campaign push below is the last navigation that runs.
			beginCampaignHandoffLatch();
			armSearchToCampaignTransition(tab);
			// Commit the visual state before handing control to the App Router. This makes
			// the tab switch feel accepted on the click frame: dashboard chrome fades and
			// the persistent map starts easing toward the campaign framing while the route
			// payload/chunks catch up.
			flushSync(() => {
				setOptimisticSearchToCampaignTab(tab);
			});
			window.setTimeout(() => {
				setOptimisticSearchToCampaignTab(null);
			}, 6000);
			window.requestAnimationFrame(() => {
				router.push(href);
			});
		},
		[
			armSearchToCampaignTransition,
			beginCampaignHandoffLatch,
			mapCampaignId,
			router,
			campaignReturnAddedSuffix,
		]
	);

	const navigateToCampaignTab = useCallback(
		(tab: 'write' | 'drafts' | 'inbox' | 'sent') => {
			navigateToCampaignRouteFromSearch(tab);
		},
		[navigateToCampaignRouteFromSearch]
	);

	const prefetchedCampaignRoutes = useRef<Set<string>>(new Set());

	// Tier 1: warm the campaign route's JS chunks. The ?tab= query doesn't change the
	// route segment, so the bare path warms all four tabs; prefetch it once.
	const prefetchCampaignRoute = useCallback(() => {
		if (!mapCampaignId) return;
		const href = urls.murmur.campaign.detail(mapCampaignId);
		if (prefetchedCampaignRoutes.current.has(href)) return;
		prefetchedCampaignRoutes.current.add(href);
		router.prefetch(href);
	}, [router, mapCampaignId]);

	// Tier 2/3: warm the React Query cache the campaign page reads on mount.
	const prefetchCampaignData = useCallback(() => {
		if (!mapCampaignId) return;
		// Tier 2 (cheap): campaign detail is usually already warm via the active-campaign
		// query, so prefetchQuery is a near-free no-op while it stays fresh.
		queryClient.prefetchQuery({
			queryKey: getCampaignDetailQueryKey(mapCampaignId),
			queryFn: () => fetchCampaignDetail(mapCampaignId),
			staleTime: 1000 * 60 * 5,
		});
		queryClient.prefetchQuery({
			queryKey: getIdentitiesListQueryKey(),
			queryFn: () => fetchIdentitiesList(),
		});
		// Tier 3 (heavy): the contacts list — only when we can build the exact filter.
		if (prefetchContactsFilter) {
			queryClient.prefetchQuery({
				queryKey: getContactsListQueryKey(prefetchContactsFilter),
				queryFn: ({ signal }) => fetchContactsList(prefetchContactsFilter, signal),
				staleTime: 1000 * 60 * 60, // match useGetContacts so the page won't refetch
			});
		}
		// Tier 3 (medium): the page-level campaign contacts — this is the query the
		// campaign page uses to feed the persistent map on desktop. The DraftingSection's
		// main contact list is warmed above via the contact-list filter.
		if (prefetchNumericCampaignId != null && isMobile === false) {
			queryClient.prefetchQuery({
				queryKey: getCampaignContactsQueryKey(prefetchNumericCampaignId),
				queryFn: () => fetchCampaignContacts(prefetchNumericCampaignId),
				staleTime: 1000 * 60 * 5,
			});
		}
		// Tier 3 (light/medium): send queue count/items — this is read by both the
		// campaign page header/map affordance and the DraftingSection.
		if (prefetchNumericCampaignId != null) {
			queryClient.prefetchQuery({
				queryKey: SEND_QUEUE_QUERY_KEYS.list(prefetchNumericCampaignId),
				queryFn: () => fetchSendQueue(prefetchNumericCampaignId),
				staleTime: 1000 * 60 * 5,
			});
		}
		// Tier 3 (heavy): the campaign's emails + inbound emails — these gate the
		// Drafts/Sent/Inbox lists and the header counts on every campaign tab.
		// 5-min staleTime matches the global default useGetEmails inherits, so the
		// page reads the prefetched entry without refetching on mount.
		if (prefetchNumericCampaignId != null) {
			const emailFilters = { campaignId: prefetchNumericCampaignId };
			queryClient.prefetchQuery({
				queryKey: getEmailsListQueryKey(emailFilters),
				queryFn: () => fetchEmailsList(emailFilters),
				staleTime: 1000 * 60 * 5,
			});
			queryClient.prefetchQuery({
				queryKey: getInboundEmailsListQueryKey(emailFilters),
				queryFn: () => fetchInboundEmailsList(emailFilters),
				staleTime: 1000 * 60 * 5,
			});
		}
	}, [
		queryClient,
		mapCampaignId,
		prefetchContactsFilter,
		prefetchNumericCampaignId,
		isMobile,
	]);

	// Fire Tier 1 immediately on hover/focus; gate Tier 2/3 behind ~120ms of sustained
	// hover (or pointerdown) so an incidental pass-over doesn't trigger the large fetch.
	const campaignPrefetchTimerRef = useRef<number | null>(null);

	const handleCampaignTabPointerEnter = useCallback(() => {
		prefetchCampaignRoute();
		if (campaignPrefetchTimerRef.current) {
			window.clearTimeout(campaignPrefetchTimerRef.current);
		}
		campaignPrefetchTimerRef.current = window.setTimeout(() => {
			campaignPrefetchTimerRef.current = null;
			prefetchCampaignData();
		}, 120);
	}, [prefetchCampaignRoute, prefetchCampaignData]);

	const handleCampaignTabPointerLeave = useCallback(() => {
		if (campaignPrefetchTimerRef.current) {
			window.clearTimeout(campaignPrefetchTimerRef.current);
			campaignPrefetchTimerRef.current = null;
		}
	}, []);

	const handleCampaignTabPointerDown = useCallback(() => {
		// Strong intent (about to click): skip the debounce and warm everything now.
		markPerf('murmur:camp:click');
		if (campaignPrefetchTimerRef.current) {
			window.clearTimeout(campaignPrefetchTimerRef.current);
			campaignPrefetchTimerRef.current = null;
		}
		prefetchCampaignRoute();
		prefetchCampaignData();
	}, [prefetchCampaignRoute, prefetchCampaignData]);

	// Eagerly warm Tier 1 (route JS only) once the map-view tabs are visible and the
	// target campaign is known — mirrors the campaign page's reverse router.prefetch.
	useEffect(() => {
		if (isMapView && mapCampaignId) prefetchCampaignRoute();
	}, [isMapView, mapCampaignId, prefetchCampaignRoute]);

	// Eagerly warm the campaign data once the Search map is stable, not only on
	// hover. This makes touch/keyboard/fast-click entries benefit from the same warm
	// React Query state as repeat transitions, while still yielding to first paint.
	const idlePrefetchedCampaignData = useRef<Set<string>>(new Set());
	useEffect(() => {
		if (!isMapView || !mapCampaignId || isMobile === null) return;
		if (idlePrefetchedCampaignData.current.has(mapCampaignId)) return;
		idlePrefetchedCampaignData.current.add(mapCampaignId);

		let didRun = false;
		const warm = () => {
			didRun = true;
			prefetchCampaignData();
		};
		const idle = window as unknown as {
			requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
			cancelIdleCallback?: (handle: number) => void;
		};
		if (typeof idle.requestIdleCallback === 'function') {
			const handle = idle.requestIdleCallback(warm, { timeout: 2000 });
			return () => {
				idle.cancelIdleCallback?.(handle);
				if (!didRun) idlePrefetchedCampaignData.current.delete(mapCampaignId);
			};
		}
		const timer = window.setTimeout(warm, 800);
		return () => {
			window.clearTimeout(timer);
			if (!didRun) idlePrefetchedCampaignData.current.delete(mapCampaignId);
		};
	}, [isMapView, mapCampaignId, isMobile, prefetchCampaignData]);

	// Also warm the campaign page's heavy async chunks on idle.
	// router.prefetch above only loads the route's own chunks — the nextDynamic
	// import inside the campaign page starts downloading only when it renders,
	// which is exactly the first-switch wait this removes. Webpack resolves this
	// aliased path to the same module as the campaign page's relative import, so
	// loading it here registers the chunk for the nextDynamic loader.
	const hasWarmedDraftingSectionChunkRef = useRef(false);
	useEffect(() => {
		if (!isMapView || !mapCampaignId) return;
		if (hasWarmedDraftingSectionChunkRef.current) return;
		hasWarmedDraftingSectionChunkRef.current = true;
		const warm = () => {
			void import(
				'@/app/murmur/campaign/[campaignId]/DraftingSection/DraftingSection'
			).catch(() => undefined);
			void import(
				'@/components/organisms/_dialogs/IdentityDialog/IdentityDialog'
			).catch(() => undefined);
			void import(
				'@/components/molecules/HybridPromptInput/HybridPromptInput'
			).catch(() => undefined);
		};
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
	}, [isMapView, mapCampaignId]);

	useEffect(() => {
		return () => {
			if (campaignPrefetchTimerRef.current) {
				window.clearTimeout(campaignPrefetchTimerRef.current);
			}
		};
	}, []);

	// Warm the coarse IP geolocation on idle shortly after mount. It's cached 24h, so this takes
	// the IP round-trip off the critical path of both the first "For You" click and the first
	// free-text submit (which otherwise races a 3s geolocation lookup before it can search).
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

	const activeCategorySearchForStateSelection = parseCategorySearchQuery(activeSearchQuery);
	const shouldEnableMapStateCategorySelection =
		isMapView &&
		!isCuratedSearchActive &&
		activeCategorySearchForStateSelection.isCategorySearch &&
		Boolean(normalizeUsStateName(activeCategorySearchForStateSelection.where)) &&
		!mapBboxFilter;

	const handleMapStateSelect = useCallback(
		(stateName: string) => {
			// A campaign tab handoff is in flight (the dashboard is still mounted on the
			// shared map while the campaign route loads). Starting a new state search now
			// would update the dashboard URL and undo the tab switch — ignore it.
			if (isLeavingForCampaignRef.current) return;
			// In demo mode, show the free trial prompt instead of searching
			if (isFromHomeDemoMode) {
				setShowFreeTrialPrompt(true);
				return;
			}

			const nextState = (stateName || '').trim();
			if (!nextState) return;

			const currentCategorySearch = parseCategorySearchQuery(activeSearchQuery);
			const nextCanonicalState = normalizeUsStateName(nextState);
			const currentCanonicalState = normalizeUsStateName(currentCategorySearch.where);
			if (
				currentCategorySearch.isCategorySearch &&
				nextCanonicalState &&
				currentCanonicalState === nextCanonicalState
			) {
				return;
			}

			const isCurrentNonCategorySearch =
				isCuratedSearchActive || isCuratedPicksSearchQuery(activeSearchQuery);
			if (isCurrentNonCategorySearch) {
				// State clicks are a category-search affordance. If the current map came
				// from For You or Search Anything, seed a real category query instead of
				// replaying the curated endpoint with only a state.
				const baseWhat = whatValue.trim() || DEFAULT_CATEGORY_SEARCH_WHAT;
				triggerSearchWithWhere(nextState, false, {
					why: getCategorySearchWhyForWhat(baseWhat),
					what: baseWhat,
				});
				return;
			}

			// Keep the last executed Why/What (the map is showing results for this query),
			// and only swap the state for the next search.
			const baseWhy = (extractWhyFromSearchQuery(activeSearchQuery) || whyValue).trim();
			const baseWhat = (
				extractWhatFromSearchQuery(activeSearchQuery) || whatValue
			).trim();
			triggerSearchWithWhere(nextState, false, { why: baseWhy, what: baseWhat });
		},
		[
			activeSearchQuery,
			isCuratedSearchActive,
			isFromHomeDemoMode,
			triggerSearchWithWhere,
			whatValue,
			whyValue,
		]
	);

	const resolveDefaultCategorySearchWhere = useCallback(async (): Promise<string> => {
		let inferredWhere: string | null = null;
		try {
			const loc = await Promise.race([
				getApproximateLocation(),
				new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
			]);
			if (loc) {
				inferredWhere =
					normalizeUsStateName(loc.regionCode) ??
					normalizeUsStateName(loc.region) ??
					(loc.lat != null && loc.lon != null
						? getNearestUsStateNameForPoint(loc.lat, loc.lon)
						: null);
			}
		} catch {
			// Non-fatal — falls through to the random-state fallback below.
		}
		if (inferredWhere) return inferredWhere;

		const lower48States = buildAllUsStateNames().filter(
			(s) => s !== 'Alaska' && s !== 'Hawaii'
		);
		return lower48States[Math.floor(Math.random() * lower48States.length)] ?? 'California';
	}, []);

	// If the user submits with missing segments, auto-fill sensible defaults
	// and (when Where is blank) best-effort infer a US state so the search always runs.
	const ensureNonEmptyDashboardSearchOnBlankSubmit = useCallback(async () => {
		// Only apply this behavior on the initial (pre-results) dashboard screen.
		if (hasSearched) return;

		const trimmedWhy = whyValue.trim();
		const trimmedWhat = whatValue.trim();
		const trimmedWhere = whereValue.trim();

		let nextWhy = trimmedWhy;
		let nextWhat = trimmedWhat;
		let nextWhere = trimmedWhere;

		// If What is empty, set a default "starter" category.
		if (!nextWhat) {
			nextWhat = DEFAULT_CATEGORY_SEARCH_WHAT;
			nextWhy = getCategorySearchWhyForWhat(nextWhat);
			setWhyValue(nextWhy);
			setWhatValue(nextWhat);
		} else if (!nextWhy) {
			nextWhy = getCategorySearchWhyForWhat(nextWhat);
			setWhyValue(nextWhy);
		}

		// If Where is empty, try to infer the user's state from coarse IP geolocation
		// (no permission prompt). `getApproximateLocation` caches in localStorage for
		// 24h and falls back through ipapi.co → ipwho.is, so this is essentially free
		// after the first successful resolution.
		if (!nextWhere) {
			nextWhere = await resolveDefaultCategorySearchWhere();
			setWhereValue(nextWhere);
			setIsNearMeLocation(false);
		}

		// Keep UI + form consistent
		setActiveSection(null);

		const formattedWhere = nextWhere ? `(${nextWhere})` : '';
		const combinedSearch = [nextWhy, nextWhat, formattedWhere]
			.filter(Boolean)
			.join(' ')
			.trim();
		if (!combinedSearch) return;
		form.setValue('searchText', combinedSearch, {
			shouldValidate: false,
			shouldDirty: true,
		});
	}, [form, hasSearched, resolveDefaultCategorySearchWhere, whatValue, whereValue, whyValue]);

	// Free trial CTA for fromHome demo mode
	const handleStartFreeTrial = useCallback(() => {
		router.push(urls.home.startFreeTrial);
	}, [router]);

	const DASHBOARD_MAP_COMPACT_CLASS = 'murmur-dashboard-map-compact';
	const DASHBOARD_COMPACT_CLASS = 'murmur-dashboard-compact';
	const DASHBOARD_ZOOM_VAR = '--murmur-dashboard-zoom';
	const DASHBOARD_INITIAL_ZOOM_VAR = '--murmur-dashboard-initial-zoom';
	const DASHBOARD_VIEWPORT_H_VAR = '--murmur-dashboard-viewport-h';

	// Mobile dashboard marker class: scopes the map-water html background that
	// covers anything iOS exposes beyond the rendered content (keyboard pan,
	// toolbar transitions, rubber band) — see globals.css next to the campaign
	// force-transform background precedent. Standalone effect (not the zoom-pin
	// effect below) so cleanup always runs and the class never leaks to other
	// murmur routes.
	useLayoutEffect(() => {
		if (isMobile !== true) return;
		document.documentElement.classList.add('murmur-mobile-dashboard');
		return () => {
			document.documentElement.classList.remove('murmur-mobile-dashboard');
		};
	}, [isMobile]);

	// Apply dashboard-only compact class + viewport-aware zoom; clear on mobile/unmount.
	// Layout effect so narrow windows never paint a frame at the unscaled fallback zoom.
	useLayoutEffect(() => {
		if (isMobile === null) return;
		if (isMobile) {
			document.documentElement.classList.remove(DASHBOARD_COMPACT_CLASS);
			// Mobile keeps only the base murmur-compact zoom (0.9). Pin the var to it so
			// the persistent map's counter-zoom (1/var, fallback 0.85) cancels exactly —
			// an unset var leaves the canvas ~6% oversized and skews marker tap targets.
			document.documentElement.style.setProperty(DASHBOARD_ZOOM_VAR, '0.9');
			document.documentElement.style.removeProperty(DASHBOARD_INITIAL_ZOOM_VAR);
			// Publish the real (JS-measured) window height so the in-flow mobile app frame
			// can size as `viewport-h / zoom` and fill the viewport exactly under the 0.9
			// root zoom (a bare 100dvh renders at 100dvh·0.9 — ~10% short — leaving a band).
			// Re-applied on resize/orientation so the height stays true. The desktop branch
			// below owns this same var via applyInitialZoom.
			const applyMobileViewportH = () => {
				document.documentElement.style.setProperty(
					DASHBOARD_VIEWPORT_H_VAR,
					`${window.innerHeight}px`
				);
			};
			applyMobileViewportH();
			window.addEventListener('resize', applyMobileViewportH);
			window.addEventListener('orientationchange', applyMobileViewportH);
			return () => {
				window.removeEventListener('resize', applyMobileViewportH);
				window.removeEventListener('orientationchange', applyMobileViewportH);
				document.documentElement.style.removeProperty(DASHBOARD_VIEWPORT_H_VAR);
			};
		}

		const applyInitialZoom = () => {
			const zoom = computeDashboardInitialZoomForViewport(
				window.innerWidth,
				window.innerHeight,
			);
			// Publish what the non-map dashboard uses on this monitor (the map-view
			// campaigns dropdown reads it), and pin the page zoom to it unless map view
			// owns the var. On a map-view commit the map-view layout effect is declared
			// after this one, so it runs later in the same pre-paint flush and overwrites
			// the var; the class check covers the window-resize listener path so we never
			// pave over the per-monitor map zoom while map view is up.
			document.documentElement.style.setProperty(
				DASHBOARD_INITIAL_ZOOM_VAR,
				zoom.toFixed(3),
			);
			// Real window height in px: under the root zoom, 100vh renders at
			// 100vh·zoom (shorter than the window), so the scroll-locked landing
			// wrapper sizes itself with `viewport-h / zoom` instead of h-screen.
			document.documentElement.style.setProperty(
				DASHBOARD_VIEWPORT_H_VAR,
				`${window.innerHeight}px`,
			);
			if (!document.documentElement.classList.contains(DASHBOARD_MAP_COMPACT_CLASS)) {
				document.documentElement.style.setProperty(DASHBOARD_ZOOM_VAR, zoom.toFixed(3));
			}
		};

		applyInitialZoom();
		document.documentElement.classList.add(DASHBOARD_COMPACT_CLASS);
		window.addEventListener('resize', applyInitialZoom);
		return () => {
			window.removeEventListener('resize', applyInitialZoom);
			document.documentElement.classList.remove(DASHBOARD_COMPACT_CLASS);
			document.documentElement.style.removeProperty(DASHBOARD_ZOOM_VAR);
			document.documentElement.style.removeProperty(DASHBOARD_INITIAL_ZOOM_VAR);
			document.documentElement.style.removeProperty(DASHBOARD_VIEWPORT_H_VAR);
		};
	}, [isMobile]);

	// Apply a resolution-aware zoom to the fullscreen map view so the dashboard's map-view
	// chrome (top tabs, search bar, side panels, bottom search) scales like the campaign page
	// across monitor sizes. The shared map portal counter-applies `zoom: 1 / dashboard-zoom`
	// to `.dashboard-globe-bg`, so the Mapbox canvas keeps filling the viewport at 1x.
	useLayoutEffect(() => {
		// Avoid running until we know whether this is a real mobile device.
		if (isMobile === null) return;

		// Never shrink the mobile map UI (it's already heavily tuned).
		if (isMobile) {
			document.documentElement.classList.remove(DASHBOARD_MAP_COMPACT_CLASS);
			// Same as the dashboard-compact effect above: pin the var to the base
			// murmur-compact zoom so the persistent map's counter-zoom cancels exactly.
			document.documentElement.style.setProperty(DASHBOARD_ZOOM_VAR, '0.9');
			document.documentElement.style.setProperty(DASHBOARD_SIDE_SHIFT_VAR, '0px');
			return;
		}

		if (!isMapView) {
			document.documentElement.classList.remove(DASHBOARD_MAP_COMPACT_CLASS);
			// Restore the non-map baseline (the dashboard-compact effect only re-runs on
			// isMobile changes, so it can't do this for us when we leave map view).
			document.documentElement.style.setProperty(
				DASHBOARD_ZOOM_VAR,
				computeDashboardInitialZoomForViewport(
					window.innerWidth,
					window.innerHeight,
				).toFixed(3),
			);
			document.documentElement.style.setProperty(DASHBOARD_SIDE_SHIFT_VAR, '0px');
			return;
		}

		document.documentElement.classList.add(DASHBOARD_MAP_COMPACT_CLASS);

		const applyMapViewZoom = () => {
			if (typeof window === 'undefined') return;
			const zoom = getMurmurChromeZoomForWindow();
			// Always set the var inline: the non-map baseline (DASHBOARD_INITIAL_ZOOM) differs
			// from the map default, so an unset var no longer means "the right zoom applies".
			document.documentElement.style.setProperty(DASHBOARD_ZOOM_VAR, zoom.toFixed(3));
			// Vertical-centering shift for the side chrome (rail, right panel cluster and
			// the overlays docked to them). 0 in compressed chrome — the bottom-sheet
			// layout doesn't use the side-panel top anchors.
			const layoutWidth = zoom > 0 ? window.innerWidth / zoom : window.innerWidth;
			const sideShiftPx =
				layoutWidth < MAP_CHROME_COMPRESSED_MAX_LAYOUT_WIDTH_PX
					? 0
					: computeSideRailCenterShiftPx(
							window.innerHeight,
							zoom,
							MAP_SELECT_GRAB_TOTAL_HEIGHT_PX
						);
			document.documentElement.style.setProperty(
				DASHBOARD_SIDE_SHIFT_VAR,
				`${sideShiftPx}px`
			);
		};

		applyMapViewZoom();
		window.addEventListener('resize', applyMapViewZoom);

		return () => {
			window.removeEventListener('resize', applyMapViewZoom);
			document.documentElement.classList.remove(DASHBOARD_MAP_COMPACT_CLASS);
			document.documentElement.style.removeProperty(DASHBOARD_ZOOM_VAR);
			document.documentElement.style.removeProperty(DASHBOARD_SIDE_SHIFT_VAR);
		};
	}, [isMapView, isMobile]);

	// If we refreshed while in the normal dashboard results view, restore the results by re-running
	// the last executed search stored in the URL. We intentionally do not auto-trigger auth flows.
	const hasHydratedDashboardUrlRef = useRef(false);
	useEffect(() => {
		if (isAddToCampaignMode) return;
		if (hasHydratedDashboardUrlRef.current) return;
		// Don't auto-trigger auth flows; only run if already signed in.
		if (!isSignedIn) return;
		// Wait for the mobile/desktop probe to resolve before flipping into map view. Two
		// dashboard layout effects co-own `--murmur-dashboard-zoom`: the map-view one sets
		// the per-monitor map zoom, and the earlier-declared one sets the viewport-aware
		// non-map baseline — but only when map view doesn't already own the var (it checks
		// for DASHBOARD_MAP_COMPACT_CLASS). Gating on `isMobile !== null` still makes
		// the curated path fire on a later commit so the two effects can't collide in the
		// very render where `isMobile` first resolves (the historical "everything is tiny"
		// bug).
		if (isMobile === null) return;

		// Curated rehydration takes precedence: the regular onSubmit path runs a free-text
		// vector search which has no concept of `curatedCategory` and won't restore the
		// curated map styling (blob outline, category-coloured markers). When the URL says
		// we were in a curated session, replay it via triggerCuratedSearch so contacts come
		// back with the same metadata they had pre-refresh.
		const isCuratedRehydration =
			curatedModeParam || isCuratedPicksSearchQuery(dashboardSearchParam);

		if (isCuratedRehydration) {
			// If we already have curated results in memory (e.g. just navigated back to this
			// page in-app), don't trigger a duplicate fetch.
			if (hasSearched && activeSearchQuery.trim().length > 0) {
				hasHydratedDashboardUrlRef.current = true;
				return;
			}

			hasHydratedDashboardUrlRef.current = true;
			// Fresh curated entry (e.g. arriving via the campaign "Search" tab with just `?pick=1`)
			// won't have captured a location anchor in the URL the way a refresh-resume does.
			// Match the "For You" submit by trying `getApproximateLocation` only when neither
			// coords nor an explicit area/state anchor were captured.
			const hasCapturedLocationAnchor =
				(curatedLatParam != null && curatedLonParam != null) ||
				Boolean(curatedAreaParam || curatedStateParam);
			void (async () => {
				let lat = curatedLatParam;
				let lon = curatedLonParam;
				if (!hasCapturedLocationAnchor) {
					try {
						const loc = await getApproximateLocation();
						lat = loc.lat;
						lon = loc.lon;
					} catch {
						// Non-fatal: backend can infer from request headers.
					}
				}
				await rehydrateCuratedSession({
					lat,
					lon,
					radiusKm: curatedRadiusKmParam,
					category: curatedCategoryParam || null,
					area: curatedAreaParam || null,
					state: curatedStateParam || null,
				}).catch(() => undefined);
			})();
			return;
		}

		if (!dashboardSearchParam) return;

		const restoredCategorySearch = parseCategorySearchQuery(dashboardSearchParam);

		// If we already have results, don't re-run the hydration search.
		if (hasSearched && activeSearchQuery.trim().length > 0) {
			if (restoredCategorySearch.isCategorySearch) {
				setMapBottomSearchFollowupSelection('category');
				setMapBottomSearchFollowupPreview(null);
				setIsMapBottomCategoryDropdownActive(false);
				setActiveSection(null);
			}
			hasHydratedDashboardUrlRef.current = true;
			return;
		}

		// Free-text "Search Anything" rehydration. The URL flag `ft=1` (set by the URL-mirror
		// when a free-text search is active) tells us to look in the free-text session cache
		// before falling through to the regular onSubmit path. We need this branch because the
		// regular vector search at /api/contacts is a *different endpoint* with different
		// scoring than /api/contacts/search; running it would give the user a different
		// result set and — because it doesn't decorate contacts with `curatedCategory` — also
		// breaks the map's stable curated marker rendering, leaving the panel populated but
		// the map empty until auto-fit + moveend reseed the viewport sample (the original bug).
		if (freeTextModeParam) {
			hasHydratedDashboardUrlRef.current = true;
			const profileSignals = freeTextProfileParam
				? deriveProfileSearchSignals(resolvedIdentityRef.current)
				: null;
			rehydrateFreeTextSession(
				{
					q: dashboardSearchParam,
					lat: freeTextLatParam,
					lon: freeTextLonParam,
					radiusKm: freeTextRadiusKmParam,
					strictRadius: freeTextStrictParam,
					keywordMode: freeTextKeywordParam,
					profileSig: buildProfileSig(
						profileSignals?.genre,
						profileSignals?.embedText,
						profileSignals?.areaText
					),
				},
				profileSignals
					? {
							profileGenre: profileSignals.genre,
							profileEmbedText: profileSignals.embedText,
							profileArea: profileSignals.areaText,
					  }
					: undefined
			).catch(() => undefined);
			if (dashboardViewParam === 'table') {
				setTimeout(() => setIsMapView(false), 0);
			}
			return;
		}

		hasHydratedDashboardUrlRef.current = true;

		// Keep the segmented UI in sync with the restored query (best-effort).
		if (restoredCategorySearch.why) setWhyValue(restoredCategorySearch.why);
		if (restoredCategorySearch.what) setWhatValue(restoredCategorySearch.what);
		if (restoredCategorySearch.where) {
			setWhereValue(restoredCategorySearch.where);
			setIsNearMeLocation(false);
		}
		if (restoredCategorySearch.isCategorySearch) {
			setMapBottomSearchFollowupSelection('category');
			setMapBottomSearchFollowupPreview(null);
			setIsMapBottomCategoryDropdownActive(false);
			setActiveSection(null);
		}

		// Defer to the next tick so the restored UI state flushes and paints first, then submit.
		// Uses 0 (not a wall-clock delay) so there's no perceptible dead time before the search runs.
		setTimeout(() => {
			form.setValue('searchText', dashboardSearchParam);
			form.handleSubmit(onSubmit)();

			// Restore table view if that was the last view stored in the URL.
			if (dashboardViewParam === 'table') {
				setTimeout(() => setIsMapView(false), 0);
			}
		}, 0);
	}, [
		activeSearchQuery,
		curatedAreaParam,
		curatedCategoryParam,
		curatedLatParam,
		curatedLonParam,
		curatedModeParam,
		curatedRadiusKmParam,
		curatedStateParam,
		dashboardSearchParam,
		dashboardViewParam,
		form,
		freeTextLatParam,
		freeTextKeywordParam,
		freeTextProfileParam,
		freeTextLonParam,
		freeTextModeParam,
		freeTextRadiusKmParam,
		freeTextStrictParam,
		hasSearched,
		isAddToCampaignMode,
		isMobile,
		isSignedIn,
		onSubmit,
		rehydrateCuratedSession,
		rehydrateFreeTextSession,
		setIsMapView,
	]);

	// If we refreshed while in the "from campaign" map view, restore the map results view by
	// re-running the last executed search stored in the URL. This is gated to `fromCampaignId`
	// so the main dashboard flow is unchanged.
	const hasHydratedFromCampaignUrlRef = useRef(false);
	useEffect(() => {
		if (!isAddToCampaignMode) return;
		if (hasHydratedFromCampaignUrlRef.current) return;
		// Don't auto-trigger auth flows; only run if already signed in.
		if (!isSignedIn) return;
		// Same `isMobile` gate as the dashboard rehydration — see comment there for why.
		if (isMobile === null) return;

		// Same curated-rehydration treatment as the dashboard flow above.
		const isCuratedRehydration =
			curatedModeParam || isCuratedPicksSearchQuery(fromCampaignSearchParam);

		if (isCuratedRehydration) {
			if (hasSearched && activeSearchQuery.trim().length > 0) {
				hasHydratedFromCampaignUrlRef.current = true;
				return;
			}

			hasHydratedFromCampaignUrlRef.current = true;
			markPerf('murmur:pick:rehydrate-start');
			const hasCapturedLocationAnchor =
				(curatedLatParam != null && curatedLonParam != null) ||
				Boolean(curatedAreaParam || curatedStateParam);
			void (async () => {
				let lat = curatedLatParam;
				let lon = curatedLonParam;
				if (!hasCapturedLocationAnchor) {
					try {
						const loc = await getApproximateLocation();
						lat = loc.lat;
						lon = loc.lon;
					} catch {
						// Non-fatal: backend can infer from request headers.
					}
				}
				markPerf('murmur:pick:loc-resolved');
				await rehydrateCuratedSession({
					lat,
					lon,
					radiusKm: curatedRadiusKmParam,
					category: curatedCategoryParam || null,
					area: curatedAreaParam || null,
					state: curatedStateParam || null,
				}).catch(() => undefined);
			})();
			return;
		}

		if (!fromCampaignSearchParam) return;

		const restoredCategorySearch = parseCategorySearchQuery(fromCampaignSearchParam);

		// If we already have results, don't re-run the hydration search.
		if (hasSearched && activeSearchQuery.trim().length > 0) {
			if (restoredCategorySearch.isCategorySearch) {
				setMapBottomSearchFollowupSelection('category');
				setMapBottomSearchFollowupPreview(null);
				setIsMapBottomCategoryDropdownActive(false);
				setActiveSection(null);
			}
			hasHydratedFromCampaignUrlRef.current = true;
			return;
		}

		// Free-text "Search Anything" rehydration — same treatment as the dashboard flow.
		if (freeTextModeParam) {
			hasHydratedFromCampaignUrlRef.current = true;
			const profileSignals = freeTextProfileParam
				? deriveProfileSearchSignals(resolvedIdentityRef.current)
				: null;
			rehydrateFreeTextSession(
				{
					q: fromCampaignSearchParam,
					lat: freeTextLatParam,
					lon: freeTextLonParam,
					radiusKm: freeTextRadiusKmParam,
					strictRadius: freeTextStrictParam,
					keywordMode: freeTextKeywordParam,
					profileSig: buildProfileSig(
						profileSignals?.genre,
						profileSignals?.embedText,
						profileSignals?.areaText
					),
				},
				profileSignals
					? {
							profileGenre: profileSignals.genre,
							profileEmbedText: profileSignals.embedText,
							profileArea: profileSignals.areaText,
					  }
					: undefined
			).catch(() => undefined);
			if (fromCampaignViewParam === 'table') {
				setTimeout(() => setIsMapView(false), 0);
			}
			return;
		}

		hasHydratedFromCampaignUrlRef.current = true;

		// Keep the segmented UI in sync with the restored query (best-effort).
		if (restoredCategorySearch.why) setWhyValue(restoredCategorySearch.why);
		if (restoredCategorySearch.what) setWhatValue(restoredCategorySearch.what);
		if (restoredCategorySearch.where) {
			setWhereValue(restoredCategorySearch.where);
			setIsNearMeLocation(false);
		}
		if (restoredCategorySearch.isCategorySearch) {
			setMapBottomSearchFollowupSelection('category');
			setMapBottomSearchFollowupPreview(null);
			setIsMapBottomCategoryDropdownActive(false);
			setActiveSection(null);
		}

		// Defer to the next tick so the restored UI state flushes and paints first, then submit.
		// Uses 0 (not a wall-clock delay) so there's no perceptible dead time before the search runs.
		setTimeout(() => {
			form.setValue('searchText', fromCampaignSearchParam);
			form.handleSubmit(onSubmit)();

			// Restore table view if that was the last view stored in the URL.
			if (fromCampaignViewParam === 'table') {
				setTimeout(() => setIsMapView(false), 0);
			}
		}, 0);
	}, [
		activeSearchQuery,
		curatedAreaParam,
		curatedCategoryParam,
		curatedLatParam,
		curatedLonParam,
		curatedModeParam,
		curatedRadiusKmParam,
		curatedStateParam,
		form,
		freeTextLatParam,
		freeTextKeywordParam,
		freeTextProfileParam,
		freeTextLonParam,
		freeTextModeParam,
		freeTextRadiusKmParam,
		freeTextStrictParam,
		fromCampaignSearchParam,
		fromCampaignViewParam,
		hasSearched,
		isAddToCampaignMode,
		isMobile,
		isSignedIn,
		onSubmit,
		rehydrateCuratedSession,
		rehydrateFreeTextSession,
		setIsMapView,
	]);

	// Mirror the current results view + search query into the URL so browser refresh keeps you
	// in the same place (normal dashboard flow).
	useEffect(() => {
		if (isAddToCampaignMode) return;
		// A search → campaign tab handoff is in flight. Writing the dashboard URL now
		// would replace the pending campaign push and bounce the user back here.
		if (isLeavingForCampaignRef.current) return;
		if (!hasSearched) return;
		if (!activeSearchQuery || activeSearchQuery.trim().length === 0) return;

		const desiredView = isMapView ? 'map' : 'table';
		const params = new URLSearchParams(searchParams.toString());

		params.set('view', desiredView);
		params.set('search', activeSearchQuery);

		// Curated and free-text both surface results through `isCuratedSearchActive`, but
		// they're distinguished by which `lastXxxArgs` snapshot is set. Persist whichever
		// mode is active and strip the other so a refresh can't accidentally cross-replay.
		const inCuratedMode = isCuratedSearchActive && lastCuratedArgs != null;
		const inFreeTextMode =
			isCuratedSearchActive && lastFreeTextArgs != null && !inCuratedMode;
		writeCuratedParams(params, inCuratedMode ? lastCuratedArgs : null);
		writeFreeTextParams(
			params,
			inFreeTextMode
				? {
						lat: lastFreeTextArgs?.lat ?? null,
						lon: lastFreeTextArgs?.lon ?? null,
						radiusKm: lastFreeTextArgs?.radiusKm ?? null,
						strictRadius: lastFreeTextArgs?.strictRadius ?? false,
						keywordMode: lastFreeTextArgs?.keywordMode ?? false,
						profile: Boolean(lastFreeTextArgs?.profileSig),
					}
				: null
		);
		params.delete(ALL_CONTACTS_MAP_PARAM);

		const next = params.toString();
		const current = searchParams.toString();
		if (next === current) return;

		router.replace(`${pathname}?${next}`, { scroll: false });
	}, [
		activeSearchQuery,
		hasSearched,
		isAddToCampaignMode,
		isCuratedSearchActive,
		isMapView,
		lastCuratedArgs,
		lastFreeTextArgs,
		pathname,
		router,
		searchParams,
	]);

	// Persist the last NORMAL-mode (not add-to-campaign) dashboard search URL to localStorage.
	// The campaign page's "Search" tab reads this so we can drop the user back into the same
	// map view + search they were last looking at, falling back to a curated default if missing.
	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (isAddToCampaignMode) return;
		if (!hasSearched) return;
		if (!activeSearchQuery || activeSearchQuery.trim().length === 0) return;

		const params = new URLSearchParams(searchParams.toString());
		// Drop fromCampaign-mode keys before persisting so the saved URL is purely a normal search.
		params.delete('fromCampaignId');
		params.delete('fromCampaignView');
		params.delete('fromCampaignSearch');
		params.delete(ALL_CONTACTS_MAP_PARAM);
		try {
			localStorage.setItem('murmur_dashboard_last_search', params.toString());
		} catch {
			// localStorage may be unavailable (private mode, quota) — non-fatal.
		}
	}, [
		activeSearchQuery,
		hasSearched,
		isAddToCampaignMode,
		searchParams,
	]);

	// When leaving the results view, clear the persisted normal-dashboard search/view params
	// so we don't unexpectedly re-hydrate a stale search after the user has reset.
	const prevHasSearchedRef = useRef(hasSearched);
	useEffect(() => {
		const prev = prevHasSearchedRef.current;
		prevHasSearchedRef.current = hasSearched;

		if (isAddToCampaignMode) return;
		// Don't rewrite the dashboard URL while handing off to the campaign route.
		if (isLeavingForCampaignRef.current) return;
		if (!prev || hasSearched) return;

		if (typeof window !== 'undefined') {
			try {
				localStorage.removeItem('murmur_dashboard_last_search');
			} catch {
				// non-fatal
			}
		}

		const params = new URLSearchParams(searchParams.toString());
		const had =
			params.get('view') !== null ||
			params.get('search') !== null ||
			params.get(ALL_CONTACTS_MAP_PARAM) !== null ||
			CURATED_URL_PARAM_KEYS.some((key) => params.get(key) !== null) ||
			FREETEXT_URL_PARAM_KEYS.some((key) => params.get(key) !== null);
		if (!had) return;

		params.delete('view');
		params.delete('search');
		params.delete(ALL_CONTACTS_MAP_PARAM);
		writeCuratedParams(params, null);
		writeFreeTextParams(params, null);
		const qs = params.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	}, [hasSearched, isAddToCampaignMode, pathname, router, searchParams]);

	// When in "from campaign" mode, mirror the current results view + search query into the URL
	// so browser refresh keeps you in the same place. This is intentionally gated to avoid
	// changing behavior for the normal dashboard entry.
	useEffect(() => {
		if (!isAddToCampaignMode) return;
		// Don't rewrite the dashboard URL while handing off to the campaign route.
		if (isLeavingForCampaignRef.current) return;
		if (!hasSearched) return;
		if (!activeSearchQuery || activeSearchQuery.trim().length === 0) return;

		const desiredView = isMapView ? 'map' : 'table';
		const params = new URLSearchParams(searchParams.toString());

		params.set('fromCampaignView', desiredView);
		params.set('fromCampaignSearch', activeSearchQuery);
		// Drop the one-shot tab-transition flag (already captured in component state) so a later
		// refresh of this URL animates normally instead of snapping.
		params.delete('instant');

		// Curated and free-text travel under their own short-key namespaces so the rehydration
		// effect can branch on whichever flag is present.
		const inCuratedMode = isCuratedSearchActive && lastCuratedArgs != null;
		const inFreeTextMode =
			isCuratedSearchActive && lastFreeTextArgs != null && !inCuratedMode;
		writeCuratedParams(params, inCuratedMode ? lastCuratedArgs : null);
		writeFreeTextParams(
			params,
			inFreeTextMode
				? {
						lat: lastFreeTextArgs?.lat ?? null,
						lon: lastFreeTextArgs?.lon ?? null,
						radiusKm: lastFreeTextArgs?.radiusKm ?? null,
						strictRadius: lastFreeTextArgs?.strictRadius ?? false,
						keywordMode: lastFreeTextArgs?.keywordMode ?? false,
						profile: Boolean(lastFreeTextArgs?.profileSig),
					}
				: null
		);
		params.delete(ALL_CONTACTS_MAP_PARAM);

		const next = params.toString();
		const current = searchParams.toString();
		if (next === current) return;

		router.replace(`${pathname}?${next}`, { scroll: false });
	}, [
		activeSearchQuery,
		hasSearched,
		isAddToCampaignMode,
		isCuratedSearchActive,
		isMapView,
		lastCuratedArgs,
		lastFreeTextArgs,
		pathname,
		router,
		searchParams,
	]);

	// If we're in "from home" mode, immediately show the map view and set the search UI values
	// so the user sees the map preview while the sign-up modal is shown.
	const hasInitializedFromHomeRef = useRef(false);
	useEffect(() => {
		if (!fromHomeParam) return;
		if (hasInitializedFromHomeRef.current) return;

		hasInitializedFromHomeRef.current = true;

		// Set the segmented UI values immediately so they appear in the search bar
		setWhyValue(FROM_HOME_WHY);
		setWhatValue(FROM_HOME_WHAT);
		setWhereValue(FROM_HOME_WHERE);
		setIsNearMeLocation(false);

		// Force map view immediately
		setIsMapView(true);
	}, [fromHomeParam]);

	// Delay showing the sign-up modal for 3 seconds in fromHome mode
	// so the user can see the map and placeholder dots first
	const [showFromHomeSignUp, setShowFromHomeSignUp] = useState(false);
	useEffect(() => {
		if (!fromHomeParam || isSignedIn) return;

		const timer = setTimeout(() => {
			setShowFromHomeSignUp(true);
		}, 3000);

		return () => clearTimeout(timer);
	}, [fromHomeParam, isSignedIn]);

	// Show the free trial prompt after 15 seconds in fromHome demo mode
	const [showFreeTrialPrompt, setShowFreeTrialPrompt] = useState(false);
	useEffect(() => {
		if (!fromHomeParam || !isFromHomeDemoMode || !isSignedIn) return;

		const timer = setTimeout(() => {
			setShowFreeTrialPrompt(true);
		}, 15000);

		return () => clearTimeout(timer);
	}, [fromHomeParam, isFromHomeDemoMode, isSignedIn]);

	const isFreeTrialPromptVisible =
		fromHomeParam && isFromHomeDemoMode && isSignedIn === true && showFreeTrialPrompt;

	// When the free-trial prompt is open, "pause" the page by preventing scroll/interaction behind it.
	useEffect(() => {
		if (!isFreeTrialPromptVisible) return;
		if (typeof document === 'undefined') return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isFreeTrialPromptVisible]);

	// If we're in "from home" mode (from landing page), auto-trigger the pre-configured search
	// once the user signs in. This shows the Wine, Beer, and Spirits in California results.
	const hasHydratedFromHomeRef = useRef(false);
	useEffect(() => {
		if (!fromHomeParam) return;
		if (hasHydratedFromHomeRef.current) return;
		// Don't auto-trigger if not signed in - they'll see the sign-up modal.
		if (!isSignedIn) return;

		// If we already have results from this search, don't re-run.
		if (hasSearched && activeSearchQuery === FROM_HOME_SEARCH_QUERY) {
			hasHydratedFromHomeRef.current = true;
			return;
		}

		hasHydratedFromHomeRef.current = true;

		// Submit after a short delay to allow state to update.
		setTimeout(() => {
			form.setValue('searchText', FROM_HOME_SEARCH_QUERY);
			form.handleSubmit(onSubmit)();
		}, 100);
	}, [activeSearchQuery, form, fromHomeParam, hasSearched, isSignedIn, onSubmit]);

	// Batch update for assigning titles to contacts without one
	const { mutateAsync: batchUpdateContacts } = useBatchUpdateContacts({
		suppressToasts: true,
	});

	const handleAddSelectedToCampaign = useCallback(async () => {
		if (!isAddToCampaignMode) return;

		if (selectedContacts.length === 0) {
			toast.error('Please select contacts to add');
			return;
		}

		if (isPendingFromCampaign || isPendingDashboardSearchCampaignOverride) {
			toast('Loading campaign…');
			return;
		}

		if (!addToCampaignUserContactListId) {
			toast.error('Campaign has no contact list');
			return;
		}

		try {
			// If we have a derived title, update contacts before adding them
			// For restaurant/coffee shop searches, update ALL contacts; otherwise only those without a title
			if (derivedContactTitle && contacts) {
				const contactsToUpdate = contacts.filter(
					(c) =>
						selectedContacts.includes(c.id) &&
						(shouldForceApplyDerivedTitle || (!c.title && !c.headline))
				);
				if (contactsToUpdate.length > 0) {
					await batchUpdateContacts({
						updates: contactsToUpdate.map((c) => ({
							id: c.id,
							data: { title: derivedContactTitle },
						})),
					});
				}
			}

			await editUserContactList({
				id: addToCampaignUserContactListId,
				data: {
					contactOperation: {
						action: 'connect',
						contactIds: selectedContacts,
					},
				},
			});

			const addedCount = selectedContacts.length;
			setSelectedContacts([]);

			// Keep caches consistent (mirrors in-campaign behavior)
			// Await invalidations to ensure cache is properly cleared before navigation
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
				queryClient.invalidateQueries({ queryKey: ['contacts'] }),
				queryClient.invalidateQueries({ queryKey: ['userContactLists'] }),
			]);

			toast.success(
				`${addedCount} contact${addedCount === 1 ? '' : 's'} added to campaign!`
			);

			// Return to the campaign page we came from
			// `added=1`: contacts actually changed — the campaign page uses it to refetch
			// contacts/lists on arrival (pure tab-switch arrivals skip that work).
			const returnCampaignId = dashboardSearchCampaign?.id ?? fromCampaignIdParam;
			beginCampaignHandoffLatch();
			router.push(
				`${urls.murmur.campaign.detail(returnCampaignId)}?origin=search&added=1`
			);
		} catch (error) {
			console.error('Error adding contacts to campaign:', error);
			toast.error('Failed to add contacts to campaign');
		}
	}, [
		fromCampaignIdParam,
		addToCampaignUserContactListId,
		batchUpdateContacts,
		beginCampaignHandoffLatch,
		contacts,
		dashboardSearchCampaign,
		derivedContactTitle,
		editUserContactList,
		isAddToCampaignMode,
		isPendingDashboardSearchCampaignOverride,
		isPendingFromCampaign,
		shouldForceApplyDerivedTitle,
		queryClient,
		router,
		selectedContacts,
		setSelectedContacts,
	]);

	const activeCampaignUserContactListId =
		dashboardSearchCampaign?.userContactLists?.[0]?.id;

	const handleAddSelectedToActiveCampaign = useCallback(async () => {
		if (selectedContacts.length === 0) {
			toast.error('Please select contacts to add');
			return;
		}

		if (!dashboardSearchCampaign) {
			toast.error('No active campaign yet — search to start one.');
			return;
		}

		if (!activeCampaignUserContactListId) {
			toast.error('Active campaign has no contact list yet — try again in a moment.');
			return;
		}

		try {
			if (derivedContactTitle && contacts) {
				const contactsToUpdate = contacts.filter(
					(c) =>
						selectedContacts.includes(c.id) &&
						(shouldForceApplyDerivedTitle || (!c.title && !c.headline))
				);
				if (contactsToUpdate.length > 0) {
					await batchUpdateContacts({
						updates: contactsToUpdate.map((c) => ({
							id: c.id,
							data: { title: derivedContactTitle },
						})),
					});
				}
			}

			await editUserContactList({
				id: activeCampaignUserContactListId,
				data: {
					contactOperation: {
						action: 'connect',
						contactIds: selectedContacts,
					},
				},
			});

			const addedCount = selectedContacts.length;
			setSelectedContacts([]);

			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
				queryClient.invalidateQueries({ queryKey: ['contacts'] }),
				queryClient.invalidateQueries({ queryKey: ['userContactLists'] }),
			]);

			toast.success(
				`${addedCount} contact${addedCount === 1 ? '' : 's'} added to ${dashboardSearchCampaign.name}`
			);

			beginCampaignHandoffLatch();
			router.push(
				`${urls.murmur.campaign.detail(dashboardSearchCampaign.id)}?origin=search&added=1`
			);
		} catch (error) {
			console.error('Error adding contacts to active campaign:', error);
			toast.error('Failed to add contacts to campaign');
		}
	}, [
		activeCampaignUserContactListId,
		batchUpdateContacts,
		beginCampaignHandoffLatch,
		contacts,
		dashboardSearchCampaign,
		derivedContactTitle,
		editUserContactList,
		queryClient,
		router,
		selectedContacts,
		setSelectedContacts,
		shouldForceApplyDerivedTitle,
	]);

	// Map multi-select "Add Contacts to Folder" action. Adds the selected contacts
	// to the folder the current search is within the context of (the active
	// campaign's contact list) WITHOUT navigating away — the user stays on the map
	// to keep curating. Deliberately separate from handleAddSelectedToActiveCampaign
	// (which navigates) so the primary-CTA flow is untouched.
	const handleAddSelectedToContextFolder = useCallback(async () => {
		if (selectedContacts.length === 0) {
			toast.error('Please select contacts to add');
			return;
		}

		if (!activeCampaignUserContactListId) {
			toast.error('Active campaign has no contact list yet — try again in a moment.');
			return;
		}

		const contactIdsToAdd = [...selectedContacts];
		const addedCount = contactIdsToAdd.length;
		const folderName =
			dashboardSearchCampaign?.userContactLists?.[0]?.name ??
			dashboardSearchCampaign?.name ??
			'folder';

		setFolderMoveNotice({
			count: addedCount,
			folderName,
			phase: 'moving',
		});
		setSelectedContacts([]);

		try {
			if (derivedContactTitle && contacts) {
				const contactsToUpdate = contacts.filter(
					(c) =>
						contactIdsToAdd.includes(c.id) &&
						(shouldForceApplyDerivedTitle || (!c.title && !c.headline))
				);
				if (contactsToUpdate.length > 0) {
					await batchUpdateContacts({
						updates: contactsToUpdate.map((c) => ({
							id: c.id,
							data: { title: derivedContactTitle },
						})),
					});
				}
			}

			await editUserContactList({
				id: activeCampaignUserContactListId,
				data: {
					contactOperation: {
						action: 'connect',
						contactIds: contactIdsToAdd,
					},
				},
			});

			hasAddedContactsThisVisitRef.current = true;

			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
				queryClient.invalidateQueries({ queryKey: ['contacts'] }),
				queryClient.invalidateQueries({ queryKey: ['userContactLists'] }),
			]);

			setFolderMoveNotice({
				count: addedCount,
				folderName,
				phase: 'complete',
			});
		} catch (error) {
			console.error('Error adding contacts to context folder:', error);
			setFolderMoveNotice(null);
			toast.error('Failed to add contacts to folder');
		}
	}, [
		activeCampaignUserContactListId,
		batchUpdateContacts,
		contacts,
		dashboardSearchCampaign,
		derivedContactTitle,
		editUserContactList,
		queryClient,
		selectedContacts,
		setSelectedContacts,
		shouldForceApplyDerivedTitle,
	]);

	// Map multi-select "Write Message" action. Opens the inline drafting panel over the map for the
	// current selection, scoped to the campaign the search is in the context of
	// (the one shown in the dashboard search header). The panel opens immediately; the contacts are
	// committed to that campaign's contact list in the background (the drafting engine only drafts
	// for campaign members, so the panel's Draft button stays gated until they land). Keeps
	// `selectedContacts` — they are the draft target.
	const handleWriteSelectionMessage = useCallback(async () => {
		if (selectedContacts.length === 0) {
			toast.error('Please select contacts to add');
			return;
		}

		const contextCampaign = dashboardSearchCampaign;
		const contextUclId = contextCampaign?.userContactLists?.[0]?.id;
		if (!contextCampaign || !contextUclId) {
			toast.error('This search isn’t linked to a campaign yet — try again in a moment.');
			return;
		}

		// Open the panel right away so the click always produces visible feedback.
		setIsWriteMode(true);

		try {
			if (derivedContactTitle && contacts) {
				const contactsToUpdate = contacts.filter(
					(c) =>
						selectedContacts.includes(c.id) &&
						(shouldForceApplyDerivedTitle || (!c.title && !c.headline))
				);
				if (contactsToUpdate.length > 0) {
					await batchUpdateContacts({
						updates: contactsToUpdate.map((c) => ({
							id: c.id,
							data: { title: derivedContactTitle },
						})),
					});
				}
			}

			await editUserContactList({
				id: contextUclId,
				data: {
					contactOperation: {
						action: 'connect',
						contactIds: selectedContacts,
					},
				},
			});

			hasAddedContactsThisVisitRef.current = true;

			// Refresh so the inline drafting panel (and the campaign header counts) see the new
			// members. Target the exact contacts query the panel reads so we await the right refetch.
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
				queryClient.invalidateQueries({
					queryKey: getContactsListQueryKey({
						contactListIds: contextCampaign.userContactLists.map((list) => list.id),
					}),
				}),
				queryClient.invalidateQueries({ queryKey: ['userContactLists'] }),
			]);
		} catch (error) {
			console.error('Error adding contacts to campaign for drafting:', error);
			toast.error('Failed to add contacts to campaign');
		}
	}, [
		batchUpdateContacts,
		contacts,
		dashboardSearchCampaign,
		derivedContactTitle,
		editUserContactList,
		queryClient,
		selectedContacts,
		setIsWriteMode,
		shouldForceApplyDerivedTitle,
	]);

	const primaryCtaLabel = isAddToCampaignMode
		? 'Add to Campaign'
		: dashboardSearchCampaign
			? `Add to ${dashboardSearchCampaign.name ?? 'Campaign'}`
			: 'Create Campaign';
	const primaryCtaPending = isAddToCampaignMode
		? isPendingAddToCampaign || isPendingFromCampaign
		: dashboardSearchCampaign
			? isPendingAddToCampaign || isPendingBatchUpdateContacts
			: isPendingCreateCampaign || isPendingBatchUpdateContacts;
	const handlePrimaryCta = isAddToCampaignMode
		? handleAddSelectedToCampaign
		: dashboardSearchCampaign
			? handleAddSelectedToActiveCampaign
			: handleCreateCampaign;

	// Map-side panel should default to only the searched state, while the map itself keeps
	// showing all results. Clicking an out-of-state marker adds it to this panel list.
	const [mapPanelExtraContactIds, setMapPanelExtraContactIds] = useState<number[]>([]);
	// Booking zoom-in "extra" pins come from the map-overlay endpoint and are not part of the
	// primary `contacts` list. Keep a local cache so selected/clicked overlay pins can appear
	// as rows in the map side panel.
	const [mapPanelExtraContacts, setMapPanelExtraContacts] = useState<ContactWithName[]>(
		[]
	);
	// Live (viewport-driven) overlay pins that match the active "What" (Zillow-style panel updates).
	const [mapPanelVisibleOverlayContacts, setMapPanelVisibleOverlayContacts] = useState<
		ContactWithName[]
	>([]);
	// Sticky (per-selected-contact) search-derived headline so selected items keep their
	// category identity (e.g. Wedding Planner) across subsequent searches in the same map session.
	const [selectedContactStickyHeadlineById, setSelectedContactStickyHeadlineById] =
		useState<Record<number, string>>({});
	const [activeMapTool, setActiveMapTool] = useState<'select' | 'grab'>('grab');
	const [isMapShowingRailHovered, setIsMapShowingRailHovered] = useState(false);
	const [isMapSearchEngaged, setIsMapSearchEngaged] = useState(true);
	// True only when the user explicitly exits the focused search via the map-view
	// search-bar X (or the map's "Click to see all contacts"). Distinguishes that
	// user-initiated deselect — which grays the bar + hides the Searching pill —
	// from the automatic entry disengages (pick-mode landing, For You scroll-entry),
	// which must keep their normal look.
	const [isSearchDeselectedByUser, setIsSearchDeselectedByUser] = useState(false);
	useEffect(() => {
		if (!isMapView || isMobile || isSearchDeselectedByUser || !mapCampaignId) {
			setIsSearchingPillHovered(false);
		}
	}, [isMapView, isMobile, isSearchDeselectedByUser, mapCampaignId]);
	// Hover over the user-deselected (grayed) search bar reveals the green
	// "Activate" affordance that re-engages the just-disengaged search.
	const [isDisengagedSearchHovered, setIsDisengagedSearchHovered] = useState(false);
	const [mapSearchAutoFitRequestNonce, setMapSearchAutoFitRequestNonce] = useState(0);
	// Crossing the compressed-chrome boundary hides/shows the left rail and swaps the
	// results panel between the right edge and a bottom sheet: never strand the
	// area-select tool with its toggle hidden, and re-fit the camera so markers stay
	// inside the newly visible map area.
	const prevCompressedMapChromeRef = useRef<boolean | null>(null);
	useEffect(() => {
		const prev = prevCompressedMapChromeRef.current;
		prevCompressedMapChromeRef.current = isCompressedMapChrome;
		if (prev === null || prev === isCompressedMapChrome) return;
		if (isCompressedMapChrome) {
			setActiveMapTool((tool) => (tool === 'select' ? 'grab' : tool));
		}
		setMapSearchAutoFitRequestNonce((nonce) => nonce + 1);
	}, [isCompressedMapChrome]);
	const lastMapSearchEngagementKeyRef = useRef('');
	// Per-category visibility driven by the tall-stack tile toggles in grab mode.
	// True = tile is colored (visible on map); false = tile is gray (hidden).
	// Indexes follow MAP_SELECT_GRAB_CATEGORY_TITLE_PREFIXES order.
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
	// Visibility for "uncategorized" contacts (people not matched by any tall-
	// stack category prefix — they render as the blue diamond marker on the map).
	// Driven by the blue-spark stack box's grab-mode toggle.
	const [mapGrabUncategorizedActive, setMapGrabUncategorizedActive] = useState(true);
	const handleMapGrabUncategorizedActiveChange = useCallback((isActive: boolean) => {
		setMapGrabUncategorizedActive(isActive);
	}, []);
	// Visibility for venue-posted event markers (the red-star radar icons).
	// Driven by the red-star stack box's grab-mode toggle.
	const [mapGrabEventsActive, setMapGrabEventsActive] = useState(true);
	const handleMapGrabEventsActiveChange = useCallback((isActive: boolean) => {
		setMapGrabEventsActive(isActive);
	}, []);
	const [mapZoomControlIndex, setMapZoomControlIndex] = useState(1);
	const [isMapZoomControlDragging, setIsMapZoomControlDragging] = useState(false);
	const [mapZoomControlRequest, setMapZoomControlRequest] =
		useState<MapZoomControlRequest | null>(null);
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
	const [selectAllInViewNonce] = useState(0);
	const [hoveredMapMarkerContact, setHoveredMapMarkerContact] =
		useState<ContactWithName | null>(null);
	// Marker-hover research group docking: right (beside Search Results) unless the
	// hovered marker sits under that dock, then left (beside the select/grab rail).
	const [mapMarkerResearchDockSide, setMapMarkerResearchDockSide] = useState<
		'left' | 'right'
	>('right');
	// Tab toggles the Description box; persists across hovered contacts until collapsed.
	const [isMapMarkerResearchExpanded, setIsMapMarkerResearchExpanded] = useState(false);
	// Mirror of the side-panel row-hover card's (separate, internally-owned) expand
	// state, so the parent can lift that card above — and recede — the bottom nav boxes.
	const [mapPanelHoverResearchExpanded, setMapPanelHoverResearchExpanded] =
		useState(false);
	// When hovering a row in the map side panel, highlight/show the corresponding marker on the map.
	const [hoveredMapPanelContactId, setHoveredMapPanelContactId] = useState<number | null>(
		null
	);
	const [applyModalOpen, setApplyModalOpen] = useState(false);
	const [applyModalEvent, setApplyModalEvent] = useState<MapEventData | null>(null);
	const [mapPanelHoverResearchTopPx, setMapPanelHoverResearchTopPx] = useState<
		number | null
	>(null);
	const mapPanelHoverResearchClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [isMapOverlayBusy, setIsMapOverlayBusy] = useState(false);
	const handleMapOverlayBusyChange = useCallback((busy: boolean) => {
		setIsMapOverlayBusy(busy);
	}, []);
	// Show loading in the map panel when:
	// 1. A search is actively pending/loading, OR
	// 2. We're in fromHome mode and the search hasn't been executed yet (user not signed in or waiting for search trigger)
	const isMapResultsLoading =
		isSearchPending ||
		isLoadingContacts ||
		isRefetchingContacts ||
		(fromHomeParam && isMapView && (!isSignedIn || !hasSearched));
	const isMapStatusPillBusy =
		isMapView &&
		Boolean(isSearchPending || isLoadingContacts || isRefetchingContacts || isMapOverlayBusy);
	useEffect(() => {
		if (isMapView && !isMapResultsLoading) return;
		if (mapPanelHoverResearchClearTimeoutRef.current) {
			clearTimeout(mapPanelHoverResearchClearTimeoutRef.current);
			mapPanelHoverResearchClearTimeoutRef.current = null;
		}
		setHoveredMapPanelContactId(null);
		setMapPanelHoverResearchTopPx(null);
	}, [isMapResultsLoading, isMapView]);
	useEffect(() => {
		return () => {
			if (mapPanelHoverResearchClearTimeoutRef.current) {
				clearTimeout(mapPanelHoverResearchClearTimeoutRef.current);
				mapPanelHoverResearchClearTimeoutRef.current = null;
			}
		};
	}, []);
	const shouldRenderSearchResultsStage =
		activeTab === 'search' &&
		(activeSearchQuery.trim().length > 0 ||
			fromHomeParam ||
			(isMapView && hasSearched && isMapResultsLoading));
	const isSelectMapToolActive = activeMapTool === 'select';
	const hasNoSearchResults =
		hasSearched && !isMapResultsLoading && (contacts?.length ?? 0) === 0;
	const dashboardMapCampaignForHeader = dashboardSearchCampaign;
	// Switch the campaign IN the dashboard search context (folder dropdown pick)
	// WITHOUT redirecting to the campaign detail page's "All" tab. The header box
	// reads `dashboardSearchCampaign`, so we set a local override immediately and
	// also update whichever persisted source is currently driving the page:
	//  - add-to-campaign mode (?fromCampaignId=…): rewrite that URL param in place
	//    so the header re-resolves to the picked folder while staying on /dashboard.
	//  - normal search mode: persist the new active campaign id.
	// In both cases we also persist the active id so the choice sticks across the
	// surface (prefetch, "Add to {campaign}", etc.).
	const handleSelectDashboardCampaign = useCallback(
		(nextCampaignId: number) => {
			if (!Number.isFinite(nextCampaignId)) return;
			setDashboardSearchCampaignIdOverride(nextCampaignId);
			setActiveCampaignId(nextCampaignId);
			if (fromCampaignIdParam) {
				const params = new URLSearchParams(searchParams.toString());
				params.set('fromCampaignId', String(nextCampaignId));
				router.replace(`${pathname}?${params.toString()}`, { scroll: false });
			}
		},
		[fromCampaignIdParam, pathname, router, searchParams, setActiveCampaignId]
	);
	// Keep the send-queue view honest: once the queue drains to 0 the header pill
	// disappears (so it can't be toggled shut manually) — close the view so its
	// open state and chevron don't get stuck. Shares useSendQueue's query key with
	// the overlay + the pill, so this is the same deduped fetch (no extra request).
	const { count: dashboardSendQueueCount } = useSendQueue(
		dashboardMapCampaignForHeader?.id ?? 0
	);
	const isDashboardSendQueueResearchSuppressed =
		activeTab === 'search' &&
		isMapView &&
		isSendQueueViewOpen &&
		dashboardSendQueueCount > 0;
	useEffect(() => {
		if (isSendQueueViewOpen && dashboardSendQueueCount === 0) closeSendQueueView();
	}, [isSendQueueViewOpen, dashboardSendQueueCount, closeSendQueueView]);
	useEffect(() => {
		if (!isDashboardSendQueueResearchSuppressed) return;

		const handlePointerDown = (event: PointerEvent) => {
			const target =
				event.target instanceof Element
					? event.target
					: event.target instanceof Node
						? event.target.parentElement
						: null;
			if (
				target?.closest(
					'[data-dashboard-send-queue-overlay], [data-send-queue-toggle]'
				)
			) {
				return;
			}
			closeSendQueueView();
		};

		document.addEventListener('pointerdown', handlePointerDown, true);
		return () => document.removeEventListener('pointerdown', handlePointerDown, true);
	}, [closeSendQueueView, isDashboardSendQueueResearchSuppressed]);
	const shouldLoadDashboardMapCampaignFootprint =
		activeTab === 'search' && isMapView && Boolean(dashboardMapCampaignForHeader?.id);
	const { data: dashboardMapCampaignFootprintContacts } = useGetCampaignContacts(
		dashboardMapCampaignForHeader?.id,
		{ enabled: shouldLoadDashboardMapCampaignFootprint }
	);
	const dashboardMapCampaignContactListIds = useMemo(
		() => dashboardMapCampaignForHeader?.userContactLists?.map((list) => list.id) ?? [],
		[dashboardMapCampaignForHeader?.userContactLists]
	);
	const dashboardMapCampaignContactsFilter = useMemo(
		() =>
			dashboardMapCampaignContactListIds.length > 0
				? { contactListIds: dashboardMapCampaignContactListIds }
				: undefined,
		[dashboardMapCampaignContactListIds]
	);
	const dashboardMapCampaignEmailFilter = useMemo(
		() =>
			dashboardMapCampaignForHeader
				? { campaignId: dashboardMapCampaignForHeader.id }
				: undefined,
		[dashboardMapCampaignForHeader]
	);
	// Mobile pick flow renders its own campaign header over the map, so metrics must
	// load there too — even during the pre-results window (isMapView still false) and
	// on phone widths (the compressed chrome state is always active there).
	const isMobileAddToCampaignSearch = isMobile === true && isAddToCampaignMode;
	const shouldLoadDashboardMapCampaignHeaderMetrics = isMobileAddToCampaignSearch
		? Boolean(dashboardMapCampaignForHeader)
		: isMapView &&
			!isCompressedMapChrome &&
			!hasNoSearchResults &&
			Boolean(dashboardMapCampaignForHeader);
	const { data: dashboardMapHeaderContacts } = useGetContacts({
		filters: dashboardMapCampaignContactsFilter,
		enabled:
			shouldLoadDashboardMapCampaignHeaderMetrics &&
			Boolean(dashboardMapCampaignContactsFilter),
	});
	const { data: dashboardMapHeaderEmails } = useGetEmails({
		filters: dashboardMapCampaignEmailFilter,
		enabled:
			shouldLoadDashboardMapCampaignHeaderMetrics &&
			Boolean(dashboardMapCampaignEmailFilter),
	});
	// New-messages pill on the mobile pick-flow header (mirrors the campaign page's
	// inbox count).
	const { data: mobileSearchInboundEmails } = useGetInboundEmails({
		filters: { campaignId: dashboardMapCampaignForHeader?.id },
		enabled:
			shouldLoadDashboardMapCampaignHeaderMetrics &&
			Boolean(dashboardMapCampaignForHeader?.id),
	});
	const mobileSearchNewMessageCount = mobileSearchInboundEmails?.length || 0;
	// Same inbound data drives the desktop ask-box Inbox/Opportunities nav boxes
	// (mirrors the campaign overview's `overviewInboxCount`).
	const dashboardMapHeaderInboxCount = mobileSearchInboundEmails?.length || 0;
	const dashboardMapHeaderContactsCount = dashboardMapHeaderContacts?.length || 0;
	const dashboardMapHeaderDraftCount = (dashboardMapHeaderEmails || []).filter(
		(email) => email.status === EmailStatus.draft
	).length;
	const dashboardMapHeaderSentCount = (dashboardMapHeaderEmails || []).filter(
		(email) => email.status === EmailStatus.sent
	).length;
	const dashboardMapHeaderToListNames =
		dashboardMapCampaignForHeader?.userContactLists?.map((list) => list.name).join(', ') || '';
	const dashboardMapHeaderFromName = dashboardMapCampaignForHeader?.identity?.name || '';
	const shouldShowDashboardMapCampaignHeader = Boolean(dashboardMapCampaignForHeader);

	// Reveal the staged "For You" top pill once the scroll-entered curated search has finished
	// loading results into the right panel (or settled with none). Until then the pill stays
	// empty/white. Also clear if we somehow leave map view, so the flag can't get stuck.
	useEffect(() => {
		if (!pendingForYouReveal) return;
		if (!isMapView) {
			setPendingForYouReveal(false);
			return;
		}
		const curatedSettled =
			isCuratedSearchActive && !isMapResultsLoading && (contacts?.length ?? 0) > 0;
		if (curatedSettled || hasNoSearchResults) {
			setPendingForYouReveal(false);
		}
	}, [
		pendingForYouReveal,
		isMapView,
		isCuratedSearchActive,
		isMapResultsLoading,
		contacts,
		hasNoSearchResults,
	]);
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

	useEffect(() => {
		return () => {
			if (mapZoomControlRequestRafRef.current != null) {
				window.cancelAnimationFrame(mapZoomControlRequestRafRef.current);
				mapZoomControlRequestRafRef.current = null;
			}
			pendingMapZoomControlRequestRef.current = null;
		};
	}, []);

	// ── Search-results row cascade animation ─────────────────────────────────
	// Rows start as placeholder-coloured rectangles (matching the panel bg).
	// One by one from top to bottom each row flips to its normal white state
	// with content, like the list is being populated in real-time.
	const mapPanelRowsDesktopRef = useRef<HTMLDivElement>(null);
	const prevMapResultsLoadingRef = useRef(isMapResultsLoading);
	const cascadeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	// Match the map panel skeleton wave animation so the cascade feels like it
	// "resolves" the wave into real results.
	const WAVE_BASE_BG = '#C5F0FF';
	const WAVE_DURATION_SECONDS = 2.5;
	const WAVE_ROW_STEP_DELAY_SECONDS = 0.1;
	const CASCADE_INITIAL_DELAY_MS = 120;
	const CASCADE_STAGGER_MS = 100;
	// How far above/below the scroll viewport a row may sit and still be treated
	// as "visible" for the cascade, so a row half-clipped at the fold still
	// reveals instead of leaving a hard seam.
	const CASCADE_FOLD_TOLERANCE_PX = 40;

	// useLayoutEffect: runs synchronously BEFORE the browser paints so the user
	// never sees a flash of white rows — they start as placeholders.
	useLayoutEffect(() => {
		const wasLoading = prevMapResultsLoadingRef.current;
		prevMapResultsLoadingRef.current = isMapResultsLoading;
		if (!wasLoading || isMapResultsLoading) return;

		// Clear any in-flight timers from a previous cascade.
		for (const t of cascadeTimersRef.current) clearTimeout(t);
		cascadeTimersRef.current = [];

		const refs = [mapPanelRowsDesktopRef.current];
		for (const container of refs) {
			if (!container) continue;
			const allRows = Array.from(container.children) as HTMLElement[];
			if (allRows.length === 0) continue;

			// Cascade only the rows the user is actually looking at, so the reveal
			// always starts from the top of the viewport at *any* scroll position
			// (not just when scrolled to the top). The scrollable viewport is the
			// CustomScrollbar's internal overflow container — this rows wrapper's
			// direct parent.
			const scroller = container.parentElement;
			const viewportRect = scroller?.getBoundingClientRect();
			const viewTop = viewportRect
				? viewportRect.top - CASCADE_FOLD_TOLERANCE_PX
				: -Infinity;
			const viewBottom = viewportRect
				? viewportRect.bottom + CASCADE_FOLD_TOLERANCE_PX
				: Infinity;

			// Measure pass (read-only — classify every row before any style writes
			// so we don't thrash layout).
			const visibleRows: HTMLElement[] = [];
			const offscreenRows: HTMLElement[] = [];
			for (const row of allRows) {
				const rect = row.getBoundingClientRect();
				const isVisible =
					rect.width > 0 &&
					rect.height > 0 &&
					rect.bottom > viewTop &&
					rect.top < viewBottom;
				(isVisible ? visibleRows : offscreenRows).push(row);
			}

			// Snap off-screen rows straight to their final painted state. This stops
			// the "sharp cutoff": rows scrolled out of view never get left in the
			// placeholder wave, and — because rows are keyed by contact.id so React
			// reuses DOM nodes — a node carrying stale styles from an interrupted
			// earlier cascade can't get stuck invisible. Don't touch backgroundColor
			// on contact rows (React owns it); only the event/opportunity card's
			// wrapper bg is painted by the cascade, so clear that one.
			for (const row of offscreenRows) {
				gsap.killTweensOf(row);
				gsap.killTweensOf(Array.from(row.children));
				row.style.animation = '';
				row.style.animationDelay = '';
				row.style.willChange = '';
				row.style.borderColor = '';
				delete row.dataset.cascadeBg;
				if (!row.hasAttribute('data-contact-id')) {
					row.style.backgroundColor = '';
				}
				for (const child of Array.from(row.children) as HTMLElement[]) {
					child.style.opacity = '';
					child.style.visibility = '';
				}
			}

			if (visibleRows.length === 0) continue;

			// Set every visible row to the placeholder wave state before the browser
			// paints. `idx` is local to the visible set, so the topmost visible row
			// reveals first.
			visibleRows.forEach((row, idx) => {
				// Preserve the *real* background (set by React) so we can restore it.
				row.dataset.cascadeBg = row.style.backgroundColor;
				// Keep the normal outline; remove any stale inline override.
				row.style.borderColor = '';

				// Continue the wave background animation used by the skeleton rows.
				row.style.backgroundColor = WAVE_BASE_BG;
				row.style.animation = `mapResultsPanelLoadingWave ${WAVE_DURATION_SECONDS}s ease-in-out infinite`;
				row.style.animationDelay = `${-(WAVE_DURATION_SECONDS - idx * WAVE_ROW_STEP_DELAY_SECONDS)}s`;
				row.style.willChange = 'background-color';

				for (const child of Array.from(row.children) as HTMLElement[]) {
					// Ensure we don't keep any stale visibility settings from a previous run.
					child.style.visibility = '';
					child.style.opacity = '0';
				}
			});

			// Schedule the cascade: each row flips to its real appearance one at a time.
			visibleRows.forEach((row, idx) => {
				const timer = setTimeout(
					() => {
						const targetBg =
							row.dataset.cascadeBg && row.dataset.cascadeBg.length > 0
								? row.dataset.cascadeBg
								: '#FFFFFF';
						delete row.dataset.cascadeBg;

						// Freeze the wave at its current color, then tween to the final bg.
						const waveBg = getComputedStyle(row).backgroundColor;
						row.style.animation = '';
						row.style.animationDelay = '';
						row.style.willChange = '';
						row.style.backgroundColor = waveBg;

						const children = Array.from(row.children) as HTMLElement[];
						gsap.killTweensOf(row);
						gsap.killTweensOf(children);

						gsap.to(row, {
							backgroundColor: targetBg,
							duration: 0.26,
							ease: 'power1.out',
						});
						gsap.to(children, {
							opacity: 1,
							duration: 0.22,
							delay: 0.02,
							ease: 'power1.out',
							clearProps: 'opacity',
						});
					},
					CASCADE_INITIAL_DELAY_MS + idx * CASCADE_STAGGER_MS
				);
				cascadeTimersRef.current.push(timer);
			});
		}
	}, [isMapResultsLoading]);

	type SearchThisAreaViewportIdlePayload = {
		bounds: { south: number; west: number; north: number; east: number };
		center: { lat: number; lng: number };
		zoom: number;
		isCenterInSearchArea: boolean;
	};

	// "Search this area" CTA timing + placement (map view).
	const SEARCH_THIS_AREA_MIN_ZOOM = 8;
	const SEARCH_THIS_AREA_DELAY_MS = 2000;
	// Map-view chrome transforms (applied on top of the resolution-aware root zoom).
	// Top-bar / search-bar match the campaign page's 0.85 transform so they land at the same
	// visual size as the campaign chrome on every monitor. Side panels use a slightly larger
	// transform so they don't shrink too far under the root zoom. The bottom search
	// apparatus mirrors the top bar's 0.85 to balance the top↔bottom chrome.
	const MAP_VIEW_UI_SCALE = isMobile ? 1 : 0.85;
	const MAP_VIEW_PANEL_SCALE = isMobile ? 1 : 0.95;
	const MAP_VIEW_BOTTOM_SEARCH_SCALE = isMobile ? 1 : 0.85;
	// Right results panel footprint (433px box at right:10px, scaled, origin top-right).
	const MAP_VIEW_RIGHT_PANEL_EDGE_PX = Math.round(10 + 433 * MAP_VIEW_PANEL_SCALE);
	// The panel edge plus a comfort gap — what centered chrome reserves on the right
	// when it re-centers over the map strip in the mid chrome state.
	const MAP_VIEW_RIGHT_PANEL_FOOTPRINT_PX = MAP_VIEW_RIGHT_PANEL_EDGE_PX + 13;
	const mapViewCampaignHeaderTopOffsetPx =
		MAP_VIEW_CAMPAIGN_HEADER_HEIGHT_PX * MAP_VIEW_PANEL_SCALE +
		MAP_VIEW_CAMPAIGN_HEADER_GAP_PX;
	const mapViewResultsPanelTopOffsetPx = shouldShowDashboardMapCampaignHeader
		? mapViewCampaignHeaderTopOffsetPx
		: 0;
	const mapViewSidePanelGroupTopCss = shouldShowDashboardMapCampaignHeader
		? MAP_VIEW_SIDE_PANEL_GROUP_TOP_CSS
		: MAP_VIEW_SIDE_PANEL_TOP_CSS;
	const mapViewResultsPanelTopCss =
		mapViewResultsPanelTopOffsetPx > 0
			? `calc(${mapViewSidePanelGroupTopCss} + ${mapViewResultsPanelTopOffsetPx}px)`
			: mapViewSidePanelGroupTopCss;
	const mapViewResultsPanelMaxHeightCss = `calc(100% - ${mapViewSidePanelGroupTopCss} - ${MAP_VIEW_SIDE_PANEL_BOTTOM_GAP_PX + mapViewResultsPanelTopOffsetPx}px)`;
	const mapSelectGrabViewScale = useMemo(() => {
		if (isMobile) return 1;
		// Shared curve (murmurChromeZoom.ts) — also feeds the side-shift centering math.
		return computeMapSelectGrabViewScale(viewportHeight, MAP_SELECT_GRAB_TOTAL_HEIGHT_PX);
	}, [isMobile, viewportHeight]);
	const mapSelectGrabOriginOffsetPx =
		MAP_SELECT_GRAB_TOP_EXTENT_PX * mapSelectGrabViewScale;
	const MAP_VIEW_TOP_BACKDROP_BOX_TOP_PX = 9;
	const MAP_VIEW_SEARCH_BAR_BOTTOM_INSET_PX = 4;
	const MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX = 49;
	const MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX = 440;
	const CAMPAIGN_MAP_TOP_TABS_VISUAL_WIDTH_PX = 560;
	const CAMPAIGN_MAP_TOP_TABS_WIDTH_PX = Math.round(
		CAMPAIGN_MAP_TOP_TABS_VISUAL_WIDTH_PX / MAP_VIEW_UI_SCALE
	);
	// Box sized using Figma's box-to-bar ratio (804×102 around a 488×54 bar),
	// applied to our actual bar (440×49) so the visual proportions match.
	const MAP_VIEW_TOP_BACKDROP_BOX_WIDTH_PX = Math.round(
		MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX * (804 / 488.204)
	);
	const MAP_VIEW_TOP_BACKDROP_BOX_HEIGHT_PX = Math.round(
		MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX * (102 / 54)
	);
	// Outline-only stroke box positioned to the left of the search bar.
	// Figma: 124×42 box (post rotate(-90)), 23px gap from the bar — sized
	// against the same 488×54 Figma bar reference and converted to our bar.
	const MAP_VIEW_TOP_OUTLINE_BOX_WIDTH_PX = Math.round(
		124 * (MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX / 488.204)
	);
	const MAP_VIEW_TOP_OUTLINE_BOX_HEIGHT_PX = Math.round(
		42 * (MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX / 488.204)
	);
	const MAP_VIEW_TOP_OUTLINE_BOX_LEFT_GAP_PX = Math.round(
		23 * (MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX / 488.204)
	);
	// Right-side outline-only box. Figma: 105×42 box, 31px gap from the bar.
	const MAP_VIEW_TOP_OUTLINE_BOX_RIGHT_WIDTH_PX = Math.round(
		105 * (MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX / 488.204)
	);
	const MAP_VIEW_TOP_OUTLINE_BOX_RIGHT_HEIGHT_PX = Math.round(
		42 * (MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX / 488.204)
	);
	const MAP_VIEW_TOP_OUTLINE_BOX_RIGHT_GAP_PX = Math.round(
		31 * (MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX / 488.204)
	);
	// Bar sits 4px above the bottom of the top backdrop box. Both the box and
	// the bar are rendered with `scale(MAP_VIEW_UI_SCALE)` and
	// `transformOrigin: top center`, so visual heights are `unscaled * scale`.
	const MAP_VIEW_SEARCH_BAR_TOP_PX =
		MAP_VIEW_TOP_BACKDROP_BOX_TOP_PX +
		MAP_VIEW_TOP_BACKDROP_BOX_HEIGHT_PX * MAP_VIEW_UI_SCALE -
		MAP_VIEW_SEARCH_BAR_BOTTOM_INSET_PX -
		MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX * MAP_VIEW_UI_SCALE;
	const MAP_VIEW_TOP_ACTION_DROPDOWN_TOP_PX =
		MAP_VIEW_SEARCH_BAR_TOP_PX +
		MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX * MAP_VIEW_UI_SCALE +
		18;
	const SEARCH_THIS_AREA_GAP_PX = 45;
	const SEARCH_THIS_AREA_BUTTON_TOP_PX =
		MAP_VIEW_SEARCH_BAR_TOP_PX +
		MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX +
		SEARCH_THIS_AREA_GAP_PX;

	const [isSearchThisAreaCtaVisible, setIsSearchThisAreaCtaVisible] = useState(false);
	const searchThisAreaCtaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastSearchThisAreaViewportRef = useRef<SearchThisAreaViewportIdlePayload | null>(
		null
	);

	const clearSearchThisAreaCtaTimer = useCallback(() => {
		if (!searchThisAreaCtaTimeoutRef.current) return;
		clearTimeout(searchThisAreaCtaTimeoutRef.current);
		searchThisAreaCtaTimeoutRef.current = null;
	}, []);

	const hideSearchThisAreaCta = useCallback(() => {
		clearSearchThisAreaCtaTimer();
		setIsSearchThisAreaCtaVisible(false);
	}, [clearSearchThisAreaCtaTimer]);

	const handleMapViewportInteraction = useCallback(() => {
		hideSearchThisAreaCta();
	}, [hideSearchThisAreaCta]);

	const mapSearchEngagementKey = useMemo(() => {
		const query = activeSearchQuery.trim();
		if (!hasSearched || !query) return '';
		const bboxKey = mapBboxFilter
			? `${mapBboxFilter.south.toFixed(4)},${mapBboxFilter.west.toFixed(4)},${mapBboxFilter.north.toFixed(4)},${mapBboxFilter.east.toFixed(4)}`
			: 'no-bbox';
		return `${query}|${bboxKey}`;
	}, [activeSearchQuery, hasSearched, mapBboxFilter]);

	useEffect(() => {
		if (!mapSearchEngagementKey) {
			lastMapSearchEngagementKeyRef.current = '';
			setIsMapSearchEngaged(true);
			return;
		}

		if (lastMapSearchEngagementKeyRef.current === mapSearchEngagementKey) return;
		lastMapSearchEngagementKeyRef.current = mapSearchEngagementKey;
		setIsMapSearchEngaged(true);
	}, [mapSearchEngagementKey]);

	const canDisengageMapSearch =
		isMapView &&
		hasSearched &&
		activeSearchQuery.trim().length > 0 &&
		!isMapResultsLoading;

	const handleEmptyMapClick = useCallback(() => {
		if (!canDisengageMapSearch) return;
		setIsSearchDeselectedByUser(true);
		setIsMapSearchEngaged(false);
		setActiveMapTool('grab');
		setActiveSection(null);
		hideSearchThisAreaCta();
	}, [canDisengageMapSearch, hideSearchThisAreaCta]);

	// Whenever a search becomes engaged again (re-engage click, new-search
	// force-engage, etc.), drop the user-deselected styling so the bar returns
	// to its active look and the Searching pill reappears.
	useEffect(() => {
		if (isMapSearchEngaged) setIsSearchDeselectedByUser(false);
	}, [isMapSearchEngaged]);

	// Scroll-entry: the instant the committed For You search registers (hasSearched + a query),
	// disengage straight into the "show all contacts" view so the focused/engaged search view
	// never flashes. Defined AFTER the mapSearchEngagementKey effect (which force-engages once
	// per new search) so our disengage runs last in the same commit and sticks.
	useEffect(() => {
		if (!scrollEntryDisengageRef.current) return;
		if (!hasSearched || activeSearchQuery.trim().length === 0) return;
		scrollEntryDisengageRef.current = false;
		setIsMapSearchEngaged(false);
		setActiveMapTool('grab');
		setActiveSection(null);
	}, [hasSearched, activeSearchQuery]);

	const handleMapTopSearchReengage = useCallback(() => {
		if (!isMapView || !hasSearched || activeSearchQuery.trim().length === 0) return;
		// Mid-handoff to the campaign route: ignore map-search re-engagement so it can't
		// router.replace the dashboard URL over the pending campaign push.
		if (isLeavingForCampaignRef.current) return;
		setIsMapSearchEngaged(true);
		if (allContactsMapParam) {
			const params = new URLSearchParams(searchParams.toString());
			params.delete(ALL_CONTACTS_MAP_PARAM);
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		}
		setMapSearchAutoFitRequestNonce((nonce) => nonce + 1);
		hideSearchThisAreaCta();
	}, [
		activeSearchQuery,
		allContactsMapParam,
		hasSearched,
		hideSearchThisAreaCta,
		isMapView,
		pathname,
		router,
		searchParams,
	]);

	// The top search bar is a single toggle: clicking anywhere on it disables an
	// engaged search (same as the inline × affordance) and re-engages a disengaged
	// one. The × button and "Activate" chip remain as explicit affordances, but the
	// whole pill now drives the same on/off behavior. While results are loading the
	// search can't be disengaged (canDisengageMapSearch is false), so a click in that
	// window falls through to a harmless re-engage/refocus rather than no-oping.
	const handleMapTopSearchToggle = useCallback(() => {
		if (!isMapView || !hasSearched || activeSearchQuery.trim().length === 0) return;
		if (canDisengageMapSearch && isMapSearchEngaged) {
			handleEmptyMapClick();
			return;
		}
		handleMapTopSearchReengage();
	}, [
		activeSearchQuery,
		canDisengageMapSearch,
		handleEmptyMapClick,
		handleMapTopSearchReengage,
		hasSearched,
		isMapSearchEngaged,
		isMapView,
	]);

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
		(payload: SearchThisAreaViewportIdlePayload) => {
			lastSearchThisAreaViewportRef.current = payload;
			lastMapViewportZoomRef.current = payload.zoom;
			if (!isMapZoomControlDragging) {
				const nextControlValue = controlValueForZoom(
					mapZoomControlLevels,
					payload.zoom
				);
				setMapZoomControlIndex((current) =>
					Math.abs(current - nextControlValue) < 0.005 ? current : nextControlValue
				);
			}
			hideSearchThisAreaCta();

			// Only show in fullscreen map view when we have an active executed search.
			if (!isMapView) return;
			if (!hasSearched) return;
			if (!activeSearchQuery || activeSearchQuery.trim().length === 0) return;
			// Don't show while results are loading/transitioning.
			if (isMapResultsLoading) return;

			// Only show when zoomed in and the user is outside the current search area.
			if (payload.zoom < SEARCH_THIS_AREA_MIN_ZOOM) return;
			if (payload.isCenterInSearchArea) return;

			searchThisAreaCtaTimeoutRef.current = setTimeout(() => {
				setIsSearchThisAreaCtaVisible(true);
			}, SEARCH_THIS_AREA_DELAY_MS);
		},
		[
			activeSearchQuery,
			hasSearched,
			hideSearchThisAreaCta,
			isMapResultsLoading,
			isMapView,
			isMapZoomControlDragging,
			mapZoomControlLevels,
		]
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

	const handleSearchThisAreaClick = useCallback(() => {
		const payload = lastSearchThisAreaViewportRef.current;
		if (!payload) return;
		// In flight to the campaign route: a new bbox search would re-mirror the
		// dashboard URL and clobber the pending campaign navigation.
		if (isLeavingForCampaignRef.current) return;

		// Keep the same query (Why/What), but constrain the search to the exact current viewport.
		// Provide an explicit title prefix when available (API also infers from `activeSearchQuery`).
		const titlePrefix = extractWhatFromSearchQuery(activeSearchQuery);
		setMapBboxFilter({
			south: payload.bounds.south,
			west: payload.bounds.west,
			north: payload.bounds.north,
			east: payload.bounds.east,
			titlePrefix,
		});

		// UX: once a new bbox search is triggered, keep the user in grab mode to pan/zoom freely.
		setActiveMapTool('grab');
		hideSearchThisAreaCta();
	}, [activeSearchQuery, hideSearchThisAreaCta, setMapBboxFilter]);

	// Defensive cleanup on unmount.
	useEffect(() => {
		return () => {
			if (searchThisAreaCtaTimeoutRef.current) {
				clearTimeout(searchThisAreaCtaTimeoutRef.current);
				searchThisAreaCtaTimeoutRef.current = null;
			}
		};
	}, []);

	// Hide CTA whenever the map view or search state changes.
	useEffect(() => {
		hideSearchThisAreaCta();
	}, [
		activeSearchQuery,
		hideSearchThisAreaCta,
		isMapResultsLoading,
		isMapView,
		mapBboxFilter,
	]);

	const handleSelectMapToolClick = useCallback(() => {
		// First click: activate Select tool. Second click: toggle back to grab.
		setActiveMapTool((prev) => (prev === 'select' ? 'grab' : 'select'));
	}, []);

	useEffect(() => {
		// Prevent stale hover state when leaving map view or while results are transitioning.
		if (!isMapView || isMapResultsLoading || isDashboardSendQueueResearchSuppressed) {
			setHoveredMapPanelContactId(null);
			setMapPanelHoverResearchTopPx(null);
		}
	}, [isDashboardSendQueueResearchSuppressed, isMapResultsLoading, isMapView]);

	const [isMapBottomSearchActive, setIsMapBottomSearchActive] = useState(false);
	const [mapBottomSearchValue, setMapBottomSearchValue] = useState('');
	// Last submitted "Search Anything" text that we keep visible in
	// the bottom bar after the search collapses. When the user clicks the bar again
	// we clear the draft field so typing starts a fresh search instead of editing
	// the prior query.
	const [mapBottomCommittedSearchValue, setMapBottomCommittedSearchValue] =
		useState('');
	// Advanced toggles should open the bottom search into its taller composing
	// state for the current draft, even before the user has typed anything.
	// After submit/reset, the persisted search text (if any) drives the shell.
	const [isMapBottomSearchAdvancedDraftArmed, setIsMapBottomSearchAdvancedDraftArmed] =
		useState(false);

	// Mobile pick-flow exit (browser back / any navigation that strips the pick
	// params): same-route navigations don't remount DashboardContent, so the search
	// state and the rehydration one-shot must be reset by hand. Without this the
	// persistent map stays at z-98 pointer-events:auto and bricks the tab frame, and
	// a re-entry would skip rehydration (stale curated shuffle — results must stay
	// fresh per entry).
	useEffect(() => {
		if (isMobile !== true || isAddToCampaignMode) return;
		hasHydratedFromCampaignUrlRef.current = false;
		if (!hasSearched && !isMapView) return;
		handleResetSearch();
		setIsMapView(false);
		setMapBottomSearchValue('');
		setMapBottomCommittedSearchValue('');
		setIsMapBottomSearchAdvancedDraftArmed(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isMobile, isAddToCampaignMode, hasSearched, isMapView]);

	// Zero-campaign mobile entry starts the pick flow without hiding the dashboard shell.
	const hasStartedZeroCampaignSearchEntryRef = useRef(false);
	const [zeroCampaignEntryState, setZeroCampaignEntryState] = useState<
		'idle' | 'redirecting' | 'failed'
	>('idle');
	useEffect(() => {
		if (!isMobileZeroCampaigns || isAddToCampaignMode || !isSignedIn) return;
		if (hasStartedZeroCampaignSearchEntryRef.current) return;
		hasStartedZeroCampaignSearchEntryRef.current = true;
		setZeroCampaignEntryState('redirecting');
		void (async () => {
			const campaignId = await ensureActiveCampaign('');
			if (campaignId == null) {
				setZeroCampaignEntryState('failed');
				return;
			}
			try {
				sessionStorage.removeItem('murmur_pending_search');
			} catch {
				// sessionStorage may be unavailable — navigation can still proceed.
			}
			router.replace(
				`${urls.murmur.dashboard.index}?fromCampaignId=${campaignId}&pick=1&instant=1`
			);
		})();
	}, [
		isMobileZeroCampaigns,
		isAddToCampaignMode,
		isSignedIn,
		ensureActiveCampaign,
		router,
	]);
	useEffect(() => {
		if (isAddToCampaignMode && zeroCampaignEntryState === 'redirecting') {
			setZeroCampaignEntryState('idle');
		}
	}, [isAddToCampaignMode, zeroCampaignEntryState]);
	useEffect(() => {
		if (zeroCampaignEntryState !== 'redirecting' || isAddToCampaignMode) return;
		const timer = window.setTimeout(() => {
			setZeroCampaignEntryState('failed');
		}, 3000);
		return () => window.clearTimeout(timer);
	}, [isAddToCampaignMode, zeroCampaignEntryState]);
	// Location-aware seeds for the no-results recovery suggestion pills (rendered above
	// the map-results bottom search bar). Loaded once from /api/search-suggestions when
	// the user is in the search results context, so they are ready if a search comes back
	// empty. Mirrors the engine that formerly fed the initial-dashboard suggestion bar.
	const [emptyResultSuggestionSeeds, setEmptyResultSuggestionSeeds] = useState<
		InitialDashboardSearchSuggestionSeed[]
	>(getDefaultInitialDashboardSearchSuggestionSeeds);
	const hasLoadedEmptyResultSuggestionsRef = useRef(false);
	const [mapBottomSearchActiveHeight, setMapBottomSearchActiveHeight] = useState<number>(
		MAP_RESULTS_BOTTOM_SEARCH_BOX.activeHeight
	);
	const mapBottomSearchInputRef = useRef<HTMLTextAreaElement | null>(null);
	// The bottom "anything" box grows to its tall composing variant only while the
	// user is actively drafting a search. A draft session is "armed" when the user
	// types text or toggles Keyword/Radius, and it is disarmed the moment a search
	// runs (or the search is reset). That way, after a search the box snaps back to
	// the slim variant even though the submitted text stays "in mind" in the field.
	const hasMapBottomSearchDraftText = mapBottomSearchValue.trim().length > 0;
	const isMapBottomSearchKeywordOrRadiusMode =
		isKeywordModeEnabled || isRadiusModeEnabled;
	const isMapBottomSearchDraftExpanded =
		isMapBottomSearchAdvancedDraftArmed &&
		(hasMapBottomSearchDraftText || isMapBottomSearchKeywordOrRadiusMode);
	const isMapBottomSearchExpanded =
		isMapBottomSearchActive || isMapBottomSearchDraftExpanded;

	// A completed search on the dashboard search tab that returned no contacts. Drives the
	// recovery suggestion pills above the bottom search bar.
	const isSearchEmptyResult =
		hasSearched &&
		!isLoadingContacts &&
		!isRefetchingContacts &&
		(contacts === undefined ||
			(Array.isArray(contacts) && contacts.length === 0));
	// Suggestions are derived from the FAILED query so they steer the user toward related
	// searches that actually return results (the engine falls back to location-popular
	// categories when the query has no usable signal).
	const emptyResultSearchSuggestions = useMemo(
		() =>
			buildInitialDashboardSearchSuggestions(
				activeSearchQuery,
				emptyResultSuggestionSeeds
			),
		[activeSearchQuery, emptyResultSuggestionSeeds]
	);
	// Float the recovery pills clear of whatever stacks above the bottom search bar so they
	// never overlap it: the radius slider (29px tall, anchored at +12) in normal chrome, and
	// the follow-up segmented control in compressed chrome (which flips above the bar and
	// already clears the radius slider, so we only need to clear the control itself).
	const emptyResultSuggestionsBottomOffsetPx = isCompressedMapChrome
		? (isRadiusModeEnabled ? 53 : 20) +
			MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_BOX.height +
			12
		: isRadiusModeEnabled
			? 53
			: 12;

	useEffect(() => {
		if (
			hasLoadedEmptyResultSuggestionsRef.current ||
			isMobile !== false ||
			!hasSearched ||
			activeTab !== 'search' ||
			fromHomeParam
		) {
			return;
		}

		let cancelled = false;
		hasLoadedEmptyResultSuggestionsRef.current = true;

		const loadSuggestions = async () => {
			const params = new URLSearchParams();
			let approximateLocation: Awaited<ReturnType<typeof getApproximateLocation>> | null =
				null;

			try {
				const loc = await Promise.race([
					getApproximateLocation(),
					new Promise<null>((resolve) => setTimeout(() => resolve(null), 1600)),
				]);
				if (loc) {
					approximateLocation = loc;
					if (loc.lat != null && loc.lon != null) {
						params.set('lat', String(loc.lat));
						params.set('lon', String(loc.lon));
					}
					if (loc.city) params.set('city', loc.city);
					if (loc.region) params.set('region', loc.region);
					if (loc.regionCode) params.set('regionCode', loc.regionCode);
				}
			} catch {
				// Server-side geo headers or fallback states still give useful suggestions.
			}

			const query = params.toString();
			try {
				const response = await fetch(
					`/api/search-suggestions${query ? `?${query}` : ''}`,
					{ cache: 'no-store' }
				);
				if (!response.ok) throw new Error('Suggestion request failed');

				const data = (await response.json()) as SearchSuggestionsApiResponse;
				const nearbyStates = (data.location?.nearbyStates ?? [])
					.map(coerceInitialDashboardSuggestionState)
					.filter((state): state is InitialDashboardSearchSuggestionState =>
						Boolean(state)
					);
				const responseLocation = coerceInitialDashboardSuggestionLocation(
					data.location?.city,
					data.location?.region
				);
				const approximateSuggestionLocation = coerceInitialDashboardSuggestionLocation(
					approximateLocation?.city,
					approximateLocation?.regionCode ?? approximateLocation?.region
				);
				const allSuggestionLocations = getAllInitialDashboardSuggestionLocations([]);
				const suggestionSeeds = (data.suggestions ?? [])
					.map((suggestion, index): InitialDashboardSearchSuggestionSeed | null => {
						const label =
							typeof suggestion.label === 'string' ? suggestion.label.trim() : '';
						if (!label) return null;

						const state =
							coerceInitialDashboardSuggestionState(suggestion.state) ??
							nearbyStates[index] ??
							DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_STATES[index] ??
							DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_STATES[0];
						const location =
							(index === 0
								? (responseLocation ?? approximateSuggestionLocation)
								: null) ??
							allSuggestionLocations.find(
								(candidate) => candidate.state.abbr === state.abbr
							) ??
							DEFAULT_INITIAL_DASHBOARD_SEARCH_SUGGESTION_LOCATIONS[index];

						return { label, state, location };
					})
					.filter((seed): seed is InitialDashboardSearchSuggestionSeed => Boolean(seed))
					.slice(0, INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT);

				if (
					!cancelled &&
					suggestionSeeds.length === INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT
				) {
					setEmptyResultSuggestionSeeds(suggestionSeeds);
				}
			} catch {
				if (!cancelled) {
					hasLoadedEmptyResultSuggestionsRef.current = false;
				}
			}
		};

		void loadSuggestions();

		return () => {
			cancelled = true;
		};
	}, [activeTab, fromHomeParam, hasSearched, isMobile]);

	useLayoutEffect(() => {
		const baseHeight = isMapView
			? MAP_RESULTS_BOTTOM_SEARCH_BOX.activeHeight
			: INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.height;
		const maxHeight = isMapView
			? MAP_RESULTS_BOTTOM_SEARCH_BOX.activeMaxHeight
			: INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.activeMaxHeight;

		const input = mapBottomSearchInputRef.current;
		if (!input) {
			setMapBottomSearchActiveHeight(baseHeight);
			return;
		}

		const previousHeight = input.style.height;
		input.style.height = '0px';
		const nextHeight = Math.min(maxHeight, Math.max(baseHeight, input.scrollHeight));
		input.style.height = previousHeight;

		setMapBottomSearchActiveHeight((current) =>
			current === nextHeight ? current : nextHeight
		);
	}, [isMapBottomSearchExpanded, mapBottomSearchValue, isMapView]);

	const handleMapBottomSearchActivate = useCallback(() => {
		// Focusing the box starts a draft session so it expands and stays expanded
		// while the user composes (text present) or has Keyword/Radius enabled.
		if (
			!isMapBottomSearchAdvancedDraftArmed &&
			mapBottomCommittedSearchValue.trim().length > 0 &&
			mapBottomSearchValue.trim() === mapBottomCommittedSearchValue.trim()
		) {
			setMapBottomSearchValue('');
		}
		setIsMapBottomSearchAdvancedDraftArmed(true);
		setIsMapBottomSearchActive(true);
		window.requestAnimationFrame(() => {
			mapBottomSearchInputRef.current?.focus();
		});
	}, [
		isMapBottomSearchAdvancedDraftArmed,
		mapBottomCommittedSearchValue,
		mapBottomSearchValue,
	]);

	const handleMapBottomSearchActiveChange = useCallback(
		(active: boolean) => {
			setIsMapBottomSearchActive(active);
			if (active) return;

			// If the user clicked into the committed query but left without typing a
			// replacement, restore the submitted text so it still "sticks" in the bar.
			if (
				mapBottomCommittedSearchValue.trim().length > 0 &&
				mapBottomSearchValue.trim().length === 0
			) {
				setIsMapBottomSearchAdvancedDraftArmed(false);
				setMapBottomSearchValue(mapBottomCommittedSearchValue.trim());
			}
		},
		[mapBottomCommittedSearchValue, mapBottomSearchValue]
	);

	// Typing in the box arms the draft session too, so the tall variant persists on
	// blur as long as there is text. Submitting (or resetting) disarms it, which
	// returns the box to the slim variant with the searched text still shown.
	const handleMapBottomSearchValueChange = useCallback((value: string) => {
		setIsMapBottomSearchAdvancedDraftArmed(true);
		setMapBottomSearchValue(value);
	}, []);

	// Resolve the radius center. Typed radius searches use only user-location sources
	// so a new query never inherits the last dragged result center.
	const resolveRadiusCenter = useCallback(
		async (options?: { allowViewportFallback?: boolean }): Promise<LatLngLiteral | null> => {
			const precise = await new Promise<LatLngLiteral | null>((resolve) => {
				if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
					resolve(null);
					return;
				}
				navigator.geolocation.getCurrentPosition(
					(pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
					() => resolve(null),
					{ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
				);
			});
			if (precise) return precise;
			try {
				const loc = await getApproximateLocation();
				if (loc.lat != null && loc.lon != null) return { lat: loc.lat, lng: loc.lon };
			} catch {
				// Coarse lookup failed — fall through to the optional map viewport fallback.
			}
			if (options?.allowViewportFallback === false) return null;
			const viewport = lastSearchThisAreaViewportRef.current;
			if (viewport) return { lat: viewport.center.lat, lng: viewport.center.lng };
			return null;
		},
		[]
	);

	// Free-text "Search Anything" submit. Runs the hybrid retriever route and
	// surfaces results through the same curated-results pipe so map pins,
	// list, and selection just update. Empty input → no-op (don't accidentally
	// kick off a curated re-roll). Available on the free trial — no demo-mode
	// gate here.
	const submitMapBottomSearchQuery = useCallback(
		async (query: string) => {
			const q = query.trim();
			setIsMapBottomSearchAdvancedDraftArmed(false);
			if (!q) {
				setMapBottomCommittedSearchValue('');
				// Empty box → still run a search; the blue arrow must never be a no-op.
				// Route by the active advanced mode (precedence: radius → profile →
				// plain). Keyword mode with nothing typed has no literal to match, so it
				// falls through to a plain curated "For You" too.
				//  • Radius: a radius-bounded curated search around the chosen center, so
				//    the circle/pin render even without a typed query.
				//  • Profile: a profile-tailored "For You" (genre/area-biased picks).
				//  • Otherwise: a plain curated "For You".
				if (isRadiusModeEnabledRef.current) {
					runRadiusCuratedForYouRef.current?.();
				} else if (isProfileModeEnabledRef.current && !isKeywordModeEnabledRef.current) {
					runProfileTailoredForYouRef.current?.();
				} else {
					runCuratedForYouRef.current?.();
				}
				return;
			}
			const keywordMode = isKeywordModeEnabledRef.current;
			const shouldPersistBottomSearchValue = isMobile !== true;
			// Profile overlay: derive soft signals from the resolved identity. Omitted
			// in keyword mode (literal field matching ignores semantic/area signals).
			const profileSignals =
				isProfileModeEnabledRef.current && !keywordMode
					? deriveProfileSearchSignals(resolvedIdentityRef.current)
					: null;
			const profileOverrides =
				profileSignals &&
				(profileSignals.genre || profileSignals.embedText || profileSignals.areaText)
					? {
							profileGenre: profileSignals.genre,
							profileEmbedText: profileSignals.embedText,
							profileArea: profileSignals.areaText,
					  }
					: undefined;
			mapBottomSearchInputRef.current?.blur();
			setIsMapBottomSearchActive(false);
			setMapBottomCommittedSearchValue(shouldPersistBottomSearchValue ? q : '');
			setMapBottomSearchValue(shouldPersistBottomSearchValue ? q : '');
			primeFreeTextSearch(q);

			// First search of the session creates the active campaign (in parallel
			// with the actual search). Skip in URL-pinned add-to-campaign mode and
			// in fromHome demo mode; in either case there's nothing to materialize.
			if (!isAddToCampaignMode && !isFromHomeDemoMode) {
				void ensureActiveCampaign(q);
			}

			// Radius mode: run from the currently chosen draft center (set when the
			// user enabled Radius) or resolve a user-location center on demand. We do
			// not use the last dragged result pin here, so a fresh query does not
			// accidentally inherit a prior result-center tweak. If no center can be
			// resolved, fall through to the normal soft-locality path so the search
			// still runs.
			if (isRadiusModeEnabledRef.current) {
				const pendingRadiusToken = (pendingRadiusSearchTokenRef.current += 1);
				setIsPendingRadiusSearchOnMap(true);
				const center =
					radiusCenterRef.current ??
					(await resolveRadiusCenter({ allowViewportFallback: false }));
				if (center) {
					setRadiusCenter(center);
					triggerFreeTextSearch(q, {
						lat: center.lat,
						lon: center.lng,
						radiusKm: radiusMilesRef.current * MILES_TO_KM,
						strictRadius: true,
						keywordMode,
						...profileOverrides,
					})
						.catch(() => undefined)
						.finally(() => {
							if (pendingRadiusSearchTokenRef.current === pendingRadiusToken) {
								setIsPendingRadiusSearchOnMap(false);
							}
						});
					return;
				}
				if (pendingRadiusSearchTokenRef.current === pendingRadiusToken) {
					setIsPendingRadiusSearchOnMap(false);
				}
			}

			pendingRadiusSearchTokenRef.current += 1;
			setIsPendingRadiusSearchOnMap(false);

			if (keywordMode) {
				triggerFreeTextSearch(q, { keywordMode: true }).catch(() => undefined);
				return;
			}

			// Profile area anchors the center server-side. A client IP location would
			// outrank it (overrides beat area), so when we have an area to anchor on,
			// skip location resolution and let the server geocode it (with its own IP
			// header fallback if the area is unrecognized).
			if (profileOverrides?.profileArea) {
				triggerFreeTextSearch(q, { ...profileOverrides }).catch(() => undefined);
				return;
			}

			let lat: number | null = null;
			let lon: number | null = null;
			try {
				const loc = await Promise.race([
					getApproximateLocation(),
					new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
				]);
				if (loc) {
					lat = loc.lat;
					lon = loc.lon;
				}
			} catch {
				// If the coarse IP lookup fails, fall back to a zoomed-in map viewport.
			}

			if (lat == null || lon == null) {
				const viewport = lastSearchThisAreaViewportRef.current;
				if (viewport && viewport.zoom >= SEARCH_THIS_AREA_MIN_ZOOM) {
					lat = viewport.center.lat;
					lon = viewport.center.lng;
				}
			}

			triggerFreeTextSearch(q, {
				lat: lat ?? undefined,
				lon: lon ?? undefined,
				radiusKm: lat != null && lon != null ? 250 : undefined,
				...profileOverrides,
			}).catch(() => undefined);
		},
		[
			primeFreeTextSearch,
			resolveRadiusCenter,
			triggerFreeTextSearch,
			ensureActiveCampaign,
			isMobile,
			isAddToCampaignMode,
			isFromHomeDemoMode,
		]
	);

	const handleMapBottomSearchSubmit = useCallback(async () => {
		await submitMapBottomSearchQuery(mapBottomSearchValue);
	}, [mapBottomSearchValue, submitMapBottomSearchQuery]);

	const handleKeywordToggle = useCallback(() => {
		setIsMapBottomSearchAdvancedDraftArmed(true);
		setIsKeywordModeEnabled((enabled) => !enabled);
	}, []);

	const handleProfileToggle = useCallback(() => {
		setIsMapBottomSearchAdvancedDraftArmed(true);
		setIsProfileModeEnabled((enabled) => {
			const next = !enabled;
			// On enable with an empty profile, nudge the user to fill it out (once
			// per session). The search still runs; augmentation just no-ops until
			// they add genre/area/bio in campaign drafting.
			if (
				next &&
				!hasUsableProfileSignals(resolvedIdentityRef.current) &&
				!profileHintShownRef.current
			) {
				profileHintShownRef.current = true;
				toast('Add your genre, area, and bio in campaign drafting to tailor results');
			}
			return next;
		});
	}, []);

	// Toggle the radius input mode for future searches. The active map geometry is
	// driven by the result set that produced it, so toggling off must not re-run or
	// visually reinterpret an existing radius-originated search.
	const handleRadiusToggle = useCallback(() => {
		// Disable: keep radiusCenter/miles in memory so re-enabling reuses them
		// without re-prompting for location.
		setIsMapBottomSearchAdvancedDraftArmed(true);
		if (isRadiusModeEnabledRef.current) {
			radiusEnableTokenRef.current += 1;
			setIsRadiusModeEnabled(false);
			return;
		}
		// Enable: reuse a remembered center if we have one; otherwise prompt for
		// location (with fallbacks). Do NOT run a search here — the circle/blob and
		// center pin only appear once the user actually runs a radius search.
		setIsRadiusModeEnabled(true);
		if (radiusCenterRef.current) return;
		const token = (radiusEnableTokenRef.current += 1);
		void (async () => {
			const resolved = await resolveRadiusCenter();
			// Aborted if the user toggled off (or re-toggled) while we were resolving.
			if (radiusEnableTokenRef.current !== token) return;
			if (!resolved) return;
			setRadiusCenter(resolved);
		})();
	}, [resolveRadiusCenter]);

	// The radius slider is a pre-search filter: changing it only updates the draft
	// value. The radius is applied on the next explicit search, not by mutating the
	// already-rendered circle.
	const handleRadiusMilesChange = useCallback((miles: number) => {
		setRadiusMiles(miles);
	}, []);

	// Pin dropped at a new location: rerun the active radius free-text search there.
	// Keep radiusCenter untouched so typing a new radius search still starts from
	// the user's draft/default location, not the last dragged result center.
	const handleRadiusCenterChange = useCallback(
		(center: LatLngLiteral) => {
			// In flight to the campaign route: dragging the radius pin would rerun a
			// dashboard search and re-mirror the URL over the pending campaign push.
			if (isLeavingForCampaignRef.current) return;
			// Typed radius search: rerun the same free-text query at the new center.
			if (
				lastFreeTextArgs?.strictRadius &&
				lastFreeTextArgs.radiusKm != null &&
				lastFreeTextArgs.q.trim()
			) {
				triggerFreeTextSearch(lastFreeTextArgs.q.trim(), {
					lat: center.lat,
					lon: center.lng,
					radiusKm: lastFreeTextArgs.radiusKm,
					strictRadius: true,
					keywordMode: lastFreeTextArgs.keywordMode,
				}).catch(() => undefined);
				return;
			}

			// Empty-box radius search (curated radius): rerun the curated radius search
			// at the dragged center so the pin stays draggable for query-less searches.
			if (lastCuratedArgs?.radiusKm != null) {
				setRadiusCenter(center);
				triggerCuratedSearch({
					lat: center.lat,
					lon: center.lng,
					radiusKm: lastCuratedArgs.radiusKm,
					category: lastCuratedArgs.category ?? undefined,
				}).catch(() => undefined);
			}
		},
		[lastFreeTextArgs, lastCuratedArgs, triggerFreeTextSearch, triggerCuratedSearch]
	);

	const cancelMapBottomSearchFollowupPreviewClear = useCallback(() => {
		if (!mapBottomSearchFollowupPreviewClearTimeoutRef.current) return;
		clearTimeout(mapBottomSearchFollowupPreviewClearTimeoutRef.current);
		mapBottomSearchFollowupPreviewClearTimeoutRef.current = null;
	}, []);

	// Speculatively prefetch the "For You" curated results on hover/focus intent so the click
	// adopts an in-flight (or finished) fetch instead of starting cold. Mirrors
	// handleCampaignTabPointerEnter; skipped where For You can't actually run. Resolving
	// geolocation here (cached 24h) makes the prefetch args match the click's args exactly.
	const handleForYouPointerIntent = useCallback(async () => {
		if (isFromHomeDemoMode || isAddToCampaignMode) return;
		let lat: number | undefined;
		let lon: number | undefined;
		try {
			const loc = await getApproximateLocation();
			lat = loc.lat ?? undefined;
			lon = loc.lon ?? undefined;
		} catch {
			// Non-fatal: prefetch without coords; the backend infers from headers. If the click
			// later resolves coords, the args won't match and it simply fetches fresh.
		}
		prefetchCuratedSearch({ lat, lon });
	}, [isFromHomeDemoMode, isAddToCampaignMode, prefetchCuratedSearch]);

	const handleMapBottomSearchFollowupPreviewChange = useCallback(
		(selection: MapBottomSearchFollowupPreview) => {
			cancelMapBottomSearchFollowupPreviewClear();
			setMapBottomSearchFollowupPreview(selection);
			// Hover/focus on the For You tile is strong intent — warm its curated results now.
			if (selection === 'for-you') {
				void handleForYouPointerIntent();
			}
		},
		[cancelMapBottomSearchFollowupPreviewClear, handleForYouPointerIntent]
	);

	const scheduleMapBottomSearchFollowupPreviewClear = useCallback(() => {
		cancelMapBottomSearchFollowupPreviewClear();
		if (mapBottomSearchFollowupPreview !== 'for-you') {
			setMapBottomSearchFollowupPreview(null);
			return;
		}

		mapBottomSearchFollowupPreviewClearTimeoutRef.current = setTimeout(() => {
			setMapBottomSearchFollowupPreview(null);
			mapBottomSearchFollowupPreviewClearTimeoutRef.current = null;
		}, 220);
	}, [cancelMapBottomSearchFollowupPreviewClear, mapBottomSearchFollowupPreview]);

	useEffect(
		() => cancelMapBottomSearchFollowupPreviewClear,
		[cancelMapBottomSearchFollowupPreviewClear]
	);

	const handleMapBottomForYouSubmit = useCallback(async () => {
		cancelMapBottomSearchFollowupPreviewClear();
		setMapBottomSearchFollowupPreview(null);
		setMapBottomSearchFollowupSelection(null);
		mapBottomSearchInputRef.current?.blur();
		setIsMapBottomSearchActive(false);
		setMapBottomSearchValue('');
		setMapBottomCommittedSearchValue('');
		setIsMapBottomSearchAdvancedDraftArmed(false);
		setActiveSection(null);

		// "For You" has no user-typed query — pass an empty string; the campaign
		// gets a generateCampaignName constellation name like any other search.
		if (!isAddToCampaignMode && !isFromHomeDemoMode) {
			void ensureActiveCampaign('');
		}

		let lat: number | null = null;
		let lon: number | null = null;
		try {
			const loc = await getApproximateLocation();
			lat = loc.lat;
			lon = loc.lon;
		} catch {
			// Non-fatal: the backend can infer from request headers or return an unrestricted sample.
		}

		try {
			await triggerCuratedSearch({
				lat: lat ?? undefined,
				lon: lon ?? undefined,
			});
		} catch {
			// triggerCuratedSearch owns the user-facing error toast.
		}
	}, [
		cancelMapBottomSearchFollowupPreviewClear,
		triggerCuratedSearch,
		ensureActiveCampaign,
		isAddToCampaignMode,
		isFromHomeDemoMode,
	]);

	// Empty-box Profile search: a profile-tailored "For You". Genre tightens the
	// curated category subset (still broad); area sets the center (city-level
	// when the profile area can be geocoded, then state-level, else IP/user
	// location). Reuses the curated engine so results flow through the same
	// rendering/cache path as the For-You tile.
	const runProfileTailoredForYou = useCallback(async () => {
		cancelMapBottomSearchFollowupPreviewClear();
		setMapBottomSearchFollowupPreview(null);
		setMapBottomSearchFollowupSelection(null);
		mapBottomSearchInputRef.current?.blur();
		setIsMapBottomSearchActive(false);
		setMapBottomSearchValue('');
		setMapBottomCommittedSearchValue('');
		setIsMapBottomSearchAdvancedDraftArmed(false);
		setActiveSection(null);

		if (!isAddToCampaignMode && !isFromHomeDemoMode) {
			void ensureActiveCampaign('');
		}

		const signals = deriveProfileSearchSignals(resolvedIdentityRef.current);
		const category = signals.categorySubset?.length
			? signals.categorySubset.join(',')
			: undefined;

		// Anchor on the user's SET location, not their current IP. Pass the raw
		// profile area so the curated route can use the same gazetteer-backed
		// parser as typed Search Anything ("Brooklyn, NY" stays Brooklyn, not a
		// broad NY/IP fallback). The normalized state is only a safe fallback for
		// area strings that contain a US state but cannot be city-geocoded.
		const profileArea = signals.areaText?.trim() || null;
		const profileState = extractUsStateNameFromText(profileArea);

		let lat: number | null = null;
		let lon: number | null = null;
		// Skip the IP/geo lookup entirely when the profile provides an area to
		// anchor on — it would only add latency and, if sent as lat/lon, risk
		// competing with the configured profile location.
		if (!profileArea) {
			try {
				const loc = await getApproximateLocation();
				lat = loc.lat;
				lon = loc.lon;
			} catch {
				// Non-fatal: the backend can infer from request headers.
			}
		}

		try {
			await triggerCuratedSearch({
				lat: lat ?? undefined,
				lon: lon ?? undefined,
				category,
				area: profileArea ?? undefined,
				state: profileState ?? undefined,
			});
		} catch {
			// triggerCuratedSearch owns the user-facing error toast.
		}
	}, [
		cancelMapBottomSearchFollowupPreviewClear,
		triggerCuratedSearch,
		ensureActiveCampaign,
		isAddToCampaignMode,
		isFromHomeDemoMode,
	]);
	useEffect(() => {
		runProfileTailoredForYouRef.current = runProfileTailoredForYou;
	}, [runProfileTailoredForYou]);
	useEffect(() => {
		runCuratedForYouRef.current = handleMapBottomForYouSubmit;
	}, [handleMapBottomForYouSubmit]);

	// Empty-box Radius search: a radius-bounded curated "For You" centered on the
	// chosen radius center (the user's location / remembered center), using the
	// draft slider radius. Reuses the curated engine — which already honors a hard
	// `radiusKm` — so an empty Radius submit still draws the circle/pin and returns
	// in-area picks even though no specific query was typed. Profile mode layers its
	// genre/area signals on top so an empty Radius+Profile submit stays personalized.
	const runRadiusCuratedForYou = useCallback(async () => {
		cancelMapBottomSearchFollowupPreviewClear();
		setMapBottomSearchFollowupPreview(null);
		setMapBottomSearchFollowupSelection(null);
		mapBottomSearchInputRef.current?.blur();
		setIsMapBottomSearchActive(false);
		setMapBottomSearchValue('');
		setMapBottomCommittedSearchValue('');
		setIsMapBottomSearchAdvancedDraftArmed(false);
		setActiveSection(null);

		if (!isAddToCampaignMode && !isFromHomeDemoMode) {
			void ensureActiveCampaign('');
		}

		// Profile signals (when Profile is also on and Keyword is off) narrow the
		// curated categories, mirroring the typed radius+profile path.
		const profileSignals =
			isProfileModeEnabledRef.current && !isKeywordModeEnabledRef.current
				? deriveProfileSearchSignals(resolvedIdentityRef.current)
				: null;
		const category = profileSignals?.categorySubset?.length
			? profileSignals.categorySubset.join(',')
			: undefined;

		const radiusKm = radiusMilesRef.current * MILES_TO_KM;
		const pendingRadiusToken = (pendingRadiusSearchTokenRef.current += 1);
		setIsPendingRadiusSearchOnMap(true);

		// The circle must be drawn around an explicit center. Prefer the currently
		// chosen draft center (the "specified area" from the Radius control); if it
		// is not ready yet, resolve a user-location center on demand.
		const center =
			radiusCenterRef.current ??
			(await resolveRadiusCenter({ allowViewportFallback: false }));
		if (!center) {
			if (pendingRadiusSearchTokenRef.current === pendingRadiusToken) {
				setIsPendingRadiusSearchOnMap(false);
			}
			toast.error('Could not determine your location for a radius search');
			return;
		}
		setRadiusCenter(center);

		try {
			await triggerCuratedSearch({
				lat: center.lat,
				lon: center.lng,
				radiusKm,
				category,
			});
		} catch {
			// triggerCuratedSearch owns the user-facing error toast.
		} finally {
			if (pendingRadiusSearchTokenRef.current === pendingRadiusToken) {
				setIsPendingRadiusSearchOnMap(false);
			}
		}
	}, [
		cancelMapBottomSearchFollowupPreviewClear,
		resolveRadiusCenter,
		triggerCuratedSearch,
		ensureActiveCampaign,
		isAddToCampaignMode,
		isFromHomeDemoMode,
	]);
	useEffect(() => {
		runRadiusCuratedForYouRef.current = runRadiusCuratedForYou;
	}, [runRadiusCuratedForYou]);

	const handleMapBottomSearchFollowupSelectionChange = useCallback(
		(selection: MapBottomSearchFollowupSelection) => {
			cancelMapBottomSearchFollowupPreviewClear();
			setMapBottomSearchFollowupPreview(null);
			setMapBottomSearchFollowupSelection(selection);

			if (selection === 'category' || selection === 'for-you') {
				mapBottomSearchInputRef.current?.blur();
				setIsMapBottomSearchActive(false);
			}

			// Committing to For You mode is strong intent (the submit click is imminent) — warm
			// the curated results now so the click adopts an in-flight fetch. Covers the
			// initial-dashboard path, which selects For You before there's a hover target.
			if (selection === 'for-you') {
				void handleForYouPointerIntent();
			}

			if (selection !== 'category') {
				if (isMapBottomCategoryDropdownActive) {
					setActiveSection(null);
				}
				setIsMapBottomCategoryDropdownActive(false);
			}
		},
		[
			cancelMapBottomSearchFollowupPreviewClear,
			handleForYouPointerIntent,
			isMapBottomCategoryDropdownActive,
		]
	);

	const handleMapBottomCategoryFieldFocus = useCallback(
		(field: 'what' | 'where') => {
			if (isFromHomeDemoMode) {
				setShowFreeTrialPrompt(true);
				return;
			}

			cancelMapBottomSearchFollowupPreviewClear();
			setMapBottomSearchFollowupPreview(null);
			setMapBottomSearchFollowupSelection('category');
			setIsMapBottomSearchActive(false);
			setIsMapBottomCategoryDropdownActive(true);
			setWhyValue(getCategorySearchWhyForWhat(whatValue));
			setActiveSection(field);
		},
		[cancelMapBottomSearchFollowupPreviewClear, isFromHomeDemoMode, whatValue]
	);

	const handleMapBottomCategoryWhatChange = useCallback((value: string) => {
		setWhatValue(value);
		setWhyValue(getCategorySearchWhyForWhat(value));
		setIsMapBottomCategoryDropdownActive(true);
	}, []);

	const handleMapBottomCategoryWhereChange = useCallback((value: string) => {
		setWhereValue(value);
		setIsNearMeLocation(false);
		setIsMapBottomCategoryDropdownActive(true);
	}, []);

	const handleMapBottomCategoryWhatEnter = useCallback(() => {
		setIsMapBottomCategoryDropdownActive(true);
		setWhyValue(getCategorySearchWhyForWhat(whatValue));
		setActiveSection('where');
	}, [whatValue]);

	const handleMapBottomCategorySubmit = useCallback(async () => {
		if (isFromHomeDemoMode) {
			setShowFreeTrialPrompt(true);
			return;
		}

		const initialTrimmedWhat = whatValue.trim();
		let trimmedWhere = whereValue.trim();
		// Where without What would build "[Booking] (Maine)" with no category — default
		// to Wine/Beer/Spirits so the curated search has a real category to filter on.
		// If both fields are empty, also infer a state so the arrow always runs a useful
		// starter search from Category mode.
		const shouldAutoFillWhat = !initialTrimmedWhat;
		const shouldAutoFillWhere = shouldAutoFillWhat && !trimmedWhere;
		const trimmedWhat = shouldAutoFillWhat
			? DEFAULT_CATEGORY_SEARCH_WHAT
			: initialTrimmedWhat;
		const nextWhy = getCategorySearchWhyForWhat(trimmedWhat);

		if (trimmedWhat !== initialTrimmedWhat) {
			setWhatValue(trimmedWhat);
		}
		if (shouldAutoFillWhere) {
			trimmedWhere = await resolveDefaultCategorySearchWhere();
			setWhereValue(trimmedWhere);
			setIsNearMeLocation(false);
		}
		setWhyValue(nextWhy);
		setActiveSection(null);
		setIsMapBottomCategoryDropdownActive(false);
		setIsMapSearchEngaged(true);

		const formattedWhere = trimmedWhere ? `(${trimmedWhere})` : '';
		const combinedSearch = [nextWhy, trimmedWhat, formattedWhere]
			.filter(Boolean)
			.join(' ')
			.trim();

		if (combinedSearch && form && onSubmit) {
			form.setValue('searchText', combinedSearch, {
				shouldValidate: false,
				shouldDirty: true,
			});
			form.handleSubmit(onSubmit)();
		}
	}, [
		form,
		isFromHomeDemoMode,
		onSubmit,
		resolveDefaultCategorySearchWhere,
		whatValue,
		whereValue,
	]);

	const [, setIsPointerInMapSidePanel] = useState(false);
	const [isMapCampaignHeaderDropdownOpen, setIsMapCampaignHeaderDropdownOpen] =
		useState(false);
	const [selectedCategoryChips, setSelectedCategoryChips] = useState<Set<string>>(
		new Set()
	);
	const [mapPanelShiftClickAnchor, setMapPanelShiftClickAnchor] = useState<{
		contactId: number;
		index: number;
	} | null>(null);
	const hasAppliedInitialAllContactsMapDisengageRef = useRef(false);

	useEffect(() => {
		if (!allContactsMapParam) {
			hasAppliedInitialAllContactsMapDisengageRef.current = false;
			return;
		}
		if (hasAppliedInitialAllContactsMapDisengageRef.current) return;
		if (!hasSearched || !isMapView) return;
		if (!activeSearchQuery.trim()) return;
		if (isMapResultsLoading) return;

		hasAppliedInitialAllContactsMapDisengageRef.current = true;
		setIsMapSearchEngaged(false);
		setActiveMapTool('grab');
		setActiveSection(null);
		setSelectedCategoryChips(new Set());
		setMapPanelShiftClickAnchor(null);
		setMapPanelExtraContactIds([]);
		setMapPanelExtraContacts([]);
		setMapPanelVisibleOverlayContacts([]);
		hideSearchThisAreaCta();
	}, [
		activeSearchQuery,
		allContactsMapParam,
		hasSearched,
		hideSearchThisAreaCta,
		isMapResultsLoading,
		isMapView,
	]);

	const shouldUseDynamicMapCreateCampaignCta =
		isMapView &&
		!isMobile &&
		isXlDesktop &&
		!isMapResultsLoading &&
		!hasNoSearchResults &&
		!isCompressedMapChrome;

	useEffect(() => {
		// Reset when dynamic behavior is not active (prevents "stale" cursor state).
		if (!shouldUseDynamicMapCreateCampaignCta) {
			setIsPointerInMapSidePanel(false);
		}
	}, [shouldUseDynamicMapCreateCampaignCta]);
	// Map hover research overlay behavior:
	// - Hold briefly after hover ends (prevents flicker)
	// - Then fade out quickly
	const MAP_RESEARCH_PANEL_HOLD_MS = 250;
	const MAP_RESEARCH_PANEL_FADE_MS = 120;
	const [mapResearchPanelContact, setMapResearchPanelContact] =
		useState<ContactWithName | null>(null);
	const [isMapResearchPanelVisible, setIsMapResearchPanelVisible] = useState(false);
	const mapResearchPanelCloseDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const mapResearchPanelUnmountTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const mapResearchPanelContactRef = useRef<ContactWithName | null>(null);
	const {
		activeContactId: websitePreviewContactId,
		activeAnchorRect: websitePreviewAnchorRect,
	} = useWebsitePreview();
	const isWebsitePreviewOpen = websitePreviewContactId != null;
	const canShowContactForWebsitePreview = useCallback(
		(contactId: number | null | undefined) =>
			!isWebsitePreviewOpen || contactId === websitePreviewContactId,
		[isWebsitePreviewOpen, websitePreviewContactId]
	);
	useEffect(() => {
		if (
			isWebsitePreviewOpen &&
			hoveredMapPanelContactId != null &&
			!canShowContactForWebsitePreview(hoveredMapPanelContactId)
		) {
			setHoveredMapPanelContactId(null);
			setMapPanelHoverResearchTopPx(null);
		}
	}, [
		canShowContactForWebsitePreview,
		hoveredMapPanelContactId,
		isWebsitePreviewOpen,
	]);
	// When the executed search changes, reset map-panel "extras" for the new search,
	// but keep any currently-selected contacts so selection can persist across searches
	// within the same map session.
	const prevActiveSearchQueryForMapPanelRef = useRef<string>(activeSearchQuery);
	useEffect(() => {
		if (prevActiveSearchQueryForMapPanelRef.current === activeSearchQuery) return;
		prevActiveSearchQueryForMapPanelRef.current = activeSearchQuery;

		setMapPanelExtraContactIds([]);
		setMapPanelVisibleOverlayContacts([]);
		setMapPanelExtraContacts((prev) => {
			if (selectedContacts.length === 0) return [];
			const selectedSet = new Set<number>(selectedContacts);
			return prev.filter((c) => selectedSet.has(c.id));
		});
		setMapPanelShiftClickAnchor(null);
	}, [activeSearchQuery, selectedContacts]);

	useEffect(() => {
		if (isMapResultsLoading) {
			setMapPanelShiftClickAnchor(null);
		}
	}, [isMapResultsLoading]);

	// Cleanup timers on unmount
	useEffect(() => {
		return () => {
			if (mapResearchPanelCloseDelayTimeoutRef.current) {
				clearTimeout(mapResearchPanelCloseDelayTimeoutRef.current);
				mapResearchPanelCloseDelayTimeoutRef.current = null;
			}
			if (mapResearchPanelUnmountTimeoutRef.current) {
				clearTimeout(mapResearchPanelUnmountTimeoutRef.current);
				mapResearchPanelUnmountTimeoutRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (!isDashboardSendQueueResearchSuppressed) return;
		if (mapPanelHoverResearchClearTimeoutRef.current) {
			clearTimeout(mapPanelHoverResearchClearTimeoutRef.current);
			mapPanelHoverResearchClearTimeoutRef.current = null;
		}
		if (mapResearchPanelCloseDelayTimeoutRef.current) {
			clearTimeout(mapResearchPanelCloseDelayTimeoutRef.current);
			mapResearchPanelCloseDelayTimeoutRef.current = null;
		}
		if (mapResearchPanelUnmountTimeoutRef.current) {
			clearTimeout(mapResearchPanelUnmountTimeoutRef.current);
			mapResearchPanelUnmountTimeoutRef.current = null;
		}
		setHoveredMapPanelContactId(null);
		setMapPanelHoverResearchTopPx(null);
		setHoveredMapMarkerContact(null);
		setIsMapMarkerResearchExpanded(false);
		setIsMapResearchPanelVisible(false);
		setMapResearchPanelContact(null);
		mapResearchPanelContactRef.current = null;
	}, [isDashboardSendQueueResearchSuppressed]);

	// Ensure marker-hover research never "sticks" and apply hold+fade behavior.
	useEffect(() => {
		// Reset everything when leaving map view or while results are loading.
		if (!isMapView || isMapResultsLoading || isDashboardSendQueueResearchSuppressed) {
			setHoveredMapMarkerContact(null);
			setIsMapResearchPanelVisible(false);
			setMapResearchPanelContact(null);
			mapResearchPanelContactRef.current = null;
			if (mapResearchPanelCloseDelayTimeoutRef.current) {
				clearTimeout(mapResearchPanelCloseDelayTimeoutRef.current);
				mapResearchPanelCloseDelayTimeoutRef.current = null;
			}
			if (mapResearchPanelUnmountTimeoutRef.current) {
				clearTimeout(mapResearchPanelUnmountTimeoutRef.current);
				mapResearchPanelUnmountTimeoutRef.current = null;
			}
			return;
		}

		if (
			isWebsitePreviewOpen &&
			mapResearchPanelContactRef.current &&
			!canShowContactForWebsitePreview(mapResearchPanelContactRef.current.id)
		) {
			if (mapResearchPanelCloseDelayTimeoutRef.current) {
				clearTimeout(mapResearchPanelCloseDelayTimeoutRef.current);
				mapResearchPanelCloseDelayTimeoutRef.current = null;
			}
			if (mapResearchPanelUnmountTimeoutRef.current) {
				clearTimeout(mapResearchPanelUnmountTimeoutRef.current);
				mapResearchPanelUnmountTimeoutRef.current = null;
			}
			setHoveredMapMarkerContact((current) =>
				canShowContactForWebsitePreview(current?.id) ? current : null
			);
			setIsMapResearchPanelVisible(false);
			setMapResearchPanelContact(null);
			mapResearchPanelContactRef.current = null;
			return;
		}

		// Hovering a marker: show immediately (with snappy fade-in on first mount).
		if (hoveredMapMarkerContact) {
			if (!canShowContactForWebsitePreview(hoveredMapMarkerContact.id)) {
				setHoveredMapMarkerContact(null);
				return;
			}
			if (mapResearchPanelCloseDelayTimeoutRef.current) {
				clearTimeout(mapResearchPanelCloseDelayTimeoutRef.current);
				mapResearchPanelCloseDelayTimeoutRef.current = null;
			}
			if (mapResearchPanelUnmountTimeoutRef.current) {
				clearTimeout(mapResearchPanelUnmountTimeoutRef.current);
				mapResearchPanelUnmountTimeoutRef.current = null;
			}
			setMapResearchPanelContact(hoveredMapMarkerContact);
			mapResearchPanelContactRef.current = hoveredMapMarkerContact;
			setIsMapResearchPanelVisible(true);
			return;
		}

		if (
			isWebsitePreviewOpen &&
			mapResearchPanelContactRef.current?.id === websitePreviewContactId
		) {
			if (mapResearchPanelCloseDelayTimeoutRef.current) {
				clearTimeout(mapResearchPanelCloseDelayTimeoutRef.current);
				mapResearchPanelCloseDelayTimeoutRef.current = null;
			}
			if (mapResearchPanelUnmountTimeoutRef.current) {
				clearTimeout(mapResearchPanelUnmountTimeoutRef.current);
				mapResearchPanelUnmountTimeoutRef.current = null;
			}
			setIsMapResearchPanelVisible(true);
			return;
		}

		// No hovered marker: hold for ~1s, then fade out quickly and unmount.
		if (!mapResearchPanelContactRef.current) return;
		if (mapResearchPanelCloseDelayTimeoutRef.current) return;

		mapResearchPanelCloseDelayTimeoutRef.current = setTimeout(() => {
			mapResearchPanelCloseDelayTimeoutRef.current = null;
			setIsMapResearchPanelVisible(false);
			if (mapResearchPanelUnmountTimeoutRef.current) {
				clearTimeout(mapResearchPanelUnmountTimeoutRef.current);
			}
			mapResearchPanelUnmountTimeoutRef.current = setTimeout(() => {
				setMapResearchPanelContact(null);
				mapResearchPanelContactRef.current = null;
			}, MAP_RESEARCH_PANEL_FADE_MS);
		}, MAP_RESEARCH_PANEL_HOLD_MS);
	}, [
		canShowContactForWebsitePreview,
		hoveredMapMarkerContact,
		isDashboardSendQueueResearchSuppressed,
		isMapView,
		isMapResultsLoading,
		isWebsitePreviewOpen,
		websitePreviewContactId,
	]);

	const handleMapMarkerHover = useCallback(
		(contact: ContactWithName | null, meta?: MarkerHoverMeta) => {
			if (isDashboardSendQueueResearchSuppressed) {
				setHoveredMapMarkerContact(null);
				return;
			}
			if (contact && !canShowContactForWebsitePreview(contact.id)) {
				setHoveredMapMarkerContact((current) =>
					canShowContactForWebsitePreview(current?.id) ? current : null
				);
				return;
			}
			// Pick the dock side once per hover-start so it never flickers; when meta
			// is absent (tooltip-overlay re-entry) or hover ends, keep the prior side.
			if (contact && meta) {
				const rawDashboardZoom = window
					.getComputedStyle(document.documentElement)
					.getPropertyValue(DASHBOARD_ZOOM_VAR)
					.trim();
				const dashboardZoom =
					Number.parseFloat(rawDashboardZoom) || DASHBOARD_MAP_ZOOM_DEFAULT;
				// CSS-px width of the right-docked group + the results panel beside it.
				const rightDockBandCssPx =
					10 +
					433 * MAP_VIEW_PANEL_SCALE +
					MAP_PANEL_ABRIDGED_RESEARCH_GAP_PX +
					MAP_MARKER_RESEARCH_GROUP_WIDTH_PX * MAP_VIEW_PANEL_SCALE +
					MAP_MARKER_RESEARCH_DOCK_FLIP_MARGIN_PX;
				setMapMarkerResearchDockSide(
					meta.clientX >= window.innerWidth - rightDockBandCssPx * dashboardZoom
						? 'left'
						: 'right'
				);
			}
			setHoveredMapMarkerContact(contact);
		},
		[MAP_VIEW_PANEL_SCALE, canShowContactForWebsitePreview, isDashboardSendQueueResearchSuppressed]
	);

	// Tab toggles the marker-hover Description box while the panel is visible.
	useEffect(() => {
		if (!isMapView || !isMapResearchPanelVisible) return;
		const handleResearchTabToggle = (event: KeyboardEvent) => {
			if (event.key !== 'Tab') return;
			const target = event.target as HTMLElement | null;
			if (
				target &&
				(target.isContentEditable ||
					['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
			) {
				return;
			}
			event.preventDefault();
			setIsMapMarkerResearchExpanded((prev) => !prev);
		};
		window.addEventListener('keydown', handleResearchTabToggle);
		return () => window.removeEventListener('keydown', handleResearchTabToggle);
	}, [isMapView, isMapResearchPanelVisible]);

	const searchedStateAbbr = useMemo(
		() => extractStateAbbrFromSearchQuery(activeSearchQuery),
		[activeSearchQuery]
	);
	// Keep the map side panel defaulted to the searched state (markers outside can still be added as extras).
	const searchedStateAbbrForMap = mapBboxFilter ? null : searchedStateAbbr;

	// Use the "What" from the last executed search (activeSearchQuery), not the live dropdown value.
	const searchedWhat = useMemo(
		() => extractWhatFromSearchQuery(activeSearchQuery),
		[activeSearchQuery]
	);

	// Check if the current executed search is for a specific category (to apply labels to all results)
	const searchWhatLower = searchedWhat?.toLowerCase() || '';
	// Treat "Venues" as shorthand for "Music Venues" but avoid matching "Wedding Venues", etc.
	const isMusicVenuesSearch =
		searchWhatLower.includes('music venue') || /^venues?$/.test(searchWhatLower.trim());
	const isRestaurantsSearch = searchWhatLower.includes('restaurant');
	const isCoffeeShopsSearch =
		searchWhatLower.includes('coffee shop') || searchWhatLower.includes('coffee shops');
	// Treat "Festivals" as shorthand for "Music Festivals" but avoid matching "Beer Festivals", etc.
	const isMusicFestivalsSearch =
		searchWhatLower.includes('music festival') ||
		/^festivals?$/.test(searchWhatLower.trim());
	const isWeddingPlannersSearch = searchWhatLower.includes('wedding planner');

	const searchedWhere = useMemo(
		() => extractWhereFromSearchQuery(activeSearchQuery),
		[activeSearchQuery]
	);

	const mapTopSearchDisplay = useMemo<MapTopSearchDisplay>(() => {
		if (fromHomeParam && isMapView && !hasSearched) {
			const whereLabel = formatMapTopSearchWhereLabel(FROM_HOME_WHERE);
			return {
				kind: 'category',
				what: FROM_HOME_WHAT,
				where: FROM_HOME_WHERE,
				whereLabel,
				label: [FROM_HOME_WHAT, whereLabel].filter(Boolean).join(' '),
			};
		}

		const committedQuery = activeSearchQuery.trim();
		if (isCuratedSearchActive && lastCuratedArgs) {
			return { kind: 'curated', label: 'For You' };
		}

		if (committedQuery && isCuratedPicksSearchQuery(committedQuery)) {
			return { kind: 'curated', label: 'For You' };
		}

		if (committedQuery && isCuratedSearchActive) {
			return { kind: 'freeText', label: committedQuery };
		}

		const what = (searchedWhat || '').trim();
		const where = (searchedWhere || '').trim();
		const whereLabel = formatMapTopSearchWhereLabel(where);
		if (what || whereLabel) {
			return {
				kind: 'category',
				what,
				where,
				whereLabel,
				label: [what, whereLabel].filter(Boolean).join(' '),
			};
		}

		return { kind: 'freeText', label: committedQuery || 'Search' };
	}, [
		FROM_HOME_WHAT,
		FROM_HOME_WHERE,
		activeSearchQuery,
		fromHomeParam,
		hasSearched,
		isCuratedSearchActive,
		isMapView,
		lastCuratedArgs,
		searchedWhat,
		searchedWhere,
	]);

	// For category-style searches, keep a sticky per-selected-contact headline so selected items
	// retain their category identity when the user runs another search in the same map session.
	const stickyCategoryHeadlineForCurrentSearch = useMemo(() => {
		const rawWhat = (searchedWhat || '').trim();
		const rawWhere = (searchedWhere || '').trim();
		if (!rawWhat && !rawWhere) return '';

		const canonicalWhat = isRestaurantsSearch
			? 'Restaurants'
			: isCoffeeShopsSearch
				? 'Coffee Shops'
				: isMusicVenuesSearch
					? 'Music Venues'
					: isMusicFestivalsSearch
						? 'Music Festivals'
						: isWeddingPlannersSearch
							? 'Wedding Planners'
							: rawWhat;

		return [canonicalWhat, rawWhere].filter(Boolean).join(' ').trim();
	}, [
		isCoffeeShopsSearch,
		isMusicFestivalsSearch,
		isMusicVenuesSearch,
		isRestaurantsSearch,
		isWeddingPlannersSearch,
		searchedWhat,
		searchedWhere,
	]);

	const shouldPersistSelectedCategoryIdentity = useMemo(() => {
		const headline = stickyCategoryHeadlineForCurrentSearch;
		if (!headline) return false;
		return (
			isRestaurantTitle(headline) ||
			isCoffeeShopTitle(headline) ||
			isMusicVenueTitle(headline) ||
			isMusicFestivalTitle(headline) ||
			isWeddingPlannerTitle(headline) ||
			isWeddingVenueTitle(headline) ||
			isWineBeerSpiritsTitle(headline)
		);
	}, [stickyCategoryHeadlineForCurrentSearch]);

	const prevSelectedContactsForStickyRef = useRef<number[]>(selectedContacts);
	useEffect(() => {
		const prevSelected = prevSelectedContactsForStickyRef.current;
		const prevSelectedSet = new Set<number>(prevSelected);
		const nextSelectedSet = new Set<number>(selectedContacts);

		const addedIds: number[] = [];
		for (const id of selectedContacts) {
			if (!prevSelectedSet.has(id)) addedIds.push(id);
		}

		prevSelectedContactsForStickyRef.current = selectedContacts;

		setSelectedContactStickyHeadlineById((prev) => {
			if (selectedContacts.length === 0) {
				return Object.keys(prev).length === 0 ? prev : {};
			}

			let changed = false;
			const next: Record<number, string> = {};

			// Keep existing sticky headlines for still-selected contacts.
			for (const [idStr, stickyHeadline] of Object.entries(prev)) {
				const id = Number(idStr);
				if (!Number.isFinite(id)) continue;
				if (!nextSelectedSet.has(id)) {
					changed = true;
					continue;
				}
				next[id] = stickyHeadline;
			}

			// For category searches, assign the current category headline to contacts that were just selected.
			if (
				addedIds.length > 0 &&
				shouldPersistSelectedCategoryIdentity &&
				stickyCategoryHeadlineForCurrentSearch
			) {
				// Only apply the sticky category identity to contacts that were part of the current
				// base search results list. Overlay-only contacts (e.g. high-zoom gray dots) should
				// keep their real `contact.title` / `contact.headline`.
				const baseIdsForThisSearch = new Set<number>((contacts || []).map((c) => c.id));
				for (const id of addedIds) {
					if (next[id]) continue;
					if (!baseIdsForThisSearch.has(id)) continue;
					next[id] = stickyCategoryHeadlineForCurrentSearch;
					changed = true;
				}
			}

			return changed ? next : prev;
		});
	}, [
		selectedContacts,
		shouldPersistSelectedCategoryIdentity,
		stickyCategoryHeadlineForCurrentSearch,
		contacts,
	]);

	const baseContactIdSet = useMemo(
		() => new Set<number>((contacts || []).map((c) => c.id)),
		[contacts]
	);

	// Cache selected contacts as full objects so they can remain pinned/visible in the map side
	// panel even after running another search (when `contacts` changes).
	useEffect(() => {
		if (!isMapView) return;
		if (!contacts || contacts.length === 0) return;
		if (selectedContacts.length === 0) return;

		const selectedSet = new Set<number>(selectedContacts);
		setMapPanelExtraContacts((prev) => {
			const cachedIds = new Set<number>(prev.map((c) => c.id));
			const toAdd: ContactWithName[] = [];
			for (const c of contacts) {
				if (selectedSet.has(c.id) && !cachedIds.has(c.id)) {
					toAdd.push(c);
				}
			}
			if (toAdd.length === 0) return prev;
			return [...toAdd, ...prev];
		});
	}, [isMapView, contacts, selectedContacts]);

	const mapPanelContacts = useMemo(() => {
		const allContacts = contacts || [];
		const baseList = !searchedStateAbbrForMap
			? allContacts
			: allContacts.filter((contact) => {
					const contactStateAbbr = getStateAbbreviation(contact.state || '')
						.trim()
						.toUpperCase();
					return contactStateAbbr === searchedStateAbbrForMap;
				});

		// Allow panel to render contacts that aren't in the base results (e.g. booking overlay pins).
		const byId = new Map<number, ContactWithName>();
		for (const c of allContacts) byId.set(c.id, c);
		for (const c of mapPanelExtraContacts) {
			if (!byId.has(c.id)) byId.set(c.id, c);
		}
		for (const c of mapPanelVisibleOverlayContacts) {
			if (!byId.has(c.id)) byId.set(c.id, c);
		}

		const out: ContactWithName[] = [];
		const seen = new Set<number>();
		const push = (c: ContactWithName | null | undefined) => {
			if (!c) return;
			if (seen.has(c.id)) return;
			seen.add(c.id);
			out.push(c);
		};

		// Always pin selected contacts to the top so they don't "sink" as the viewport-driven list changes.
		for (const id of selectedContacts) {
			push(byId.get(id));
		}

		// Visible overlay pins (matching "What") next so the panel feels reactive as you pan/zoom.
		for (const c of mapPanelVisibleOverlayContacts) {
			push(byId.get(c.id) ?? c);
		}

		// Base searched-state list next.
		for (const c of baseList) push(c);

		// Sticky extras last (clicked/selected out-of-state + overlay-only contacts).
		for (const id of mapPanelExtraContactIds) push(byId.get(id));

		return out;
	}, [
		contacts,
		mapPanelExtraContactIds,
		mapPanelExtraContacts,
		mapPanelVisibleOverlayContacts,
		selectedContacts,
		searchedStateAbbrForMap,
	]);

	const lastNonEmptyMapPanelResultsRef = useRef<MapPanelResultsSnapshot | null>(null);
	useEffect(() => {
		if (!hasSearched) {
			lastNonEmptyMapPanelResultsRef.current = null;
			return;
		}
		if (!isMapView || isMapResultsLoading || hasNoSearchResults) return;
		if (mapPanelContacts.length === 0) return;

		lastNonEmptyMapPanelResultsRef.current = {
			contacts: mapPanelContacts,
			baseContactIds: Array.from(baseContactIdSet),
			whatValue,
			whereValue,
			isRestaurantsSearch,
			isCoffeeShopsSearch,
			isMusicVenuesSearch,
			isMusicFestivalsSearch,
			isWeddingPlannersSearch,
		};
	}, [
		baseContactIdSet,
		hasNoSearchResults,
		hasSearched,
		isCoffeeShopsSearch,
		isMapResultsLoading,
		isMapView,
		isMusicFestivalsSearch,
		isMusicVenuesSearch,
		isRestaurantsSearch,
		isWeddingPlannersSearch,
		mapPanelContacts,
		whatValue,
		whereValue,
	]);

	const lastNonEmptyMapPanelResults = lastNonEmptyMapPanelResultsRef.current;
	const shouldUseLastMapPanelResults =
		hasNoSearchResults && Boolean(lastNonEmptyMapPanelResults?.contacts.length);
	const displayedMapPanelContacts =
		shouldUseLastMapPanelResults && lastNonEmptyMapPanelResults
			? lastNonEmptyMapPanelResults.contacts
			: mapPanelContacts;
	const displayedBaseContactIdSet = useMemo(
		() =>
			shouldUseLastMapPanelResults && lastNonEmptyMapPanelResults
				? new Set<number>(lastNonEmptyMapPanelResults.baseContactIds)
				: baseContactIdSet,
		[baseContactIdSet, lastNonEmptyMapPanelResults, shouldUseLastMapPanelResults]
	);
	const displayedWhatValue =
		shouldUseLastMapPanelResults && lastNonEmptyMapPanelResults
			? lastNonEmptyMapPanelResults.whatValue
			: whatValue;
	const displayedWhereValue =
		shouldUseLastMapPanelResults && lastNonEmptyMapPanelResults
			? lastNonEmptyMapPanelResults.whereValue
			: whereValue;
	const displayedIsRestaurantsSearch =
		shouldUseLastMapPanelResults && lastNonEmptyMapPanelResults
			? lastNonEmptyMapPanelResults.isRestaurantsSearch
			: isRestaurantsSearch;
	const displayedIsCoffeeShopsSearch =
		shouldUseLastMapPanelResults && lastNonEmptyMapPanelResults
			? lastNonEmptyMapPanelResults.isCoffeeShopsSearch
			: isCoffeeShopsSearch;
	const displayedIsMusicVenuesSearch =
		shouldUseLastMapPanelResults && lastNonEmptyMapPanelResults
			? lastNonEmptyMapPanelResults.isMusicVenuesSearch
			: isMusicVenuesSearch;
	const displayedIsMusicFestivalsSearch =
		shouldUseLastMapPanelResults && lastNonEmptyMapPanelResults
			? lastNonEmptyMapPanelResults.isMusicFestivalsSearch
			: isMusicFestivalsSearch;
	const displayedIsWeddingPlannersSearch =
		shouldUseLastMapPanelResults && lastNonEmptyMapPanelResults
			? lastNonEmptyMapPanelResults.isWeddingPlannersSearch
			: isWeddingPlannersSearch;
	const shouldShowMapResultsSidePanel =
		!hasNoSearchResults || displayedMapPanelContacts.length > 0;
	// "For You" is the curated search type: results came from the curated engine
	// (lastCuratedArgs set), not the free-text/category path (lastFreeTextArgs).
	// Only this type gets the gradient results-box skin; everything else keeps
	// the existing flat fills.
	const isForYouCuratedSearch = isCuratedSearchActive && lastCuratedArgs != null;
	// Mid chrome state only matters while the right panel actually occupies the right
	// edge — with no panel there is nothing to re-center away from.
	const isMidMapChrome =
		isMapView && mapChromeState === 'mid' && shouldShowMapResultsSidePanel;

	// Full objects for the selected contacts so the map can keep their white halos rendered
	// even after the dataset swaps (e.g. disengaging the search to the ambient atlas), where
	// the selected ids would otherwise have no coordinate source on the map side.
	// Resolve from viewport-stable sources only — base results + sticky-pinned selections —
	// NOT mapPanelContacts, whose visible-overlay churn on every pan/zoom would make this array
	// (and the map props) change each frame and re-render the map mid-zoom (constellation flicker).
	const selectedContactObjectsForMap = useMemo(() => {
		if (selectedContacts.length === 0) return [];
		const byId = new Map<number, ContactWithName>();
		for (const c of contacts || []) byId.set(c.id, c);
		for (const c of mapPanelExtraContacts) {
			if (!byId.has(c.id)) byId.set(c.id, c);
		}
		const out: ContactWithName[] = [];
		for (const id of selectedContacts) {
			const c = byId.get(id);
			if (c) out.push(c);
		}
		return out;
	}, [selectedContacts, contacts, mapPanelExtraContacts]);

	useEffect(() => {
		// If the user selects contacts that are outside the searched state (or overlay-only),
		// pin them into the right-hand panel list so they don't disappear when the viewport changes.
		if (!isMapView) return;
		if (selectedContacts.length === 0) return;

		const allContacts = contacts || [];
		const byId = new Map<number, ContactWithName>();
		for (const c of allContacts) byId.set(c.id, c);
		for (const c of mapPanelExtraContacts) {
			if (!byId.has(c.id)) byId.set(c.id, c);
		}

		const idsToPin: number[] = [];
		for (const id of selectedContacts) {
			// Overlay-only (not in base results)
			if (!baseContactIdSet.has(id)) {
				idsToPin.push(id);
				continue;
			}

			// Out-of-state (relative to the searched/locked state)
			if (!searchedStateAbbrForMap) continue;
			const c = byId.get(id);
			if (!c) continue;
			const contactStateAbbr = getStateAbbreviation(c.state || '')
				.trim()
				.toUpperCase();
			if (contactStateAbbr && contactStateAbbr !== searchedStateAbbrForMap) {
				idsToPin.push(id);
			}
		}

		if (idsToPin.length === 0) return;
		setMapPanelExtraContactIds((prev) => {
			const next = new Set(prev);
			let changed = false;
			for (const id of idsToPin) {
				if (next.has(id)) continue;
				next.add(id);
				changed = true;
			}
			return changed ? Array.from(next) : prev;
		});
	}, [
		isMapView,
		selectedContacts,
		contacts,
		mapPanelExtraContacts,
		baseContactIdSet,
		searchedStateAbbrForMap,
	]);

	// Check if all panel contacts are selected (for map view "Select all" button)
	const isAllPanelContactsSelected = useMemo(() => {
		const cappedPanelContacts = displayedMapPanelContacts.slice(
			0,
			DASHBOARD_SEARCH_SELECTION_LIMIT
		);
		if (cappedPanelContacts.length === 0) return false;
		return cappedPanelContacts.every((contact) =>
			selectedContacts.includes(contact.id)
		);
	}, [displayedMapPanelContacts, selectedContacts]);
	const mapSelectionDisplayTotal = Math.min(
		displayedMapPanelContacts.length,
		DASHBOARD_SEARCH_SELECTION_LIMIT
	);

	const dashboardDraftingCompletedContactIdSet = useMemo(
		() => new Set(dashboardDraftingStatus.completedContactIds),
		[dashboardDraftingStatus.completedContactIds]
	);
	const dashboardDraftingCompletedOrderById = useMemo(() => {
		const order = new Map<number, number>();
		dashboardDraftingStatus.completedContactIds.forEach((id, index) => {
			if (!order.has(id)) order.set(id, index);
		});
		return order;
	}, [dashboardDraftingStatus.completedContactIds]);
	const dashboardDraftingMapStatusByContactId = useMemo<
		ReadonlyMap<number, DashboardDraftingMapContactStatus> | undefined
	>(() => {
		if (!isWriteMode || selectedContacts.length === 0) return undefined;
		const statuses = new Map<number, DashboardDraftingMapContactStatus>();
		const activeId = dashboardDraftingStatus.isDrafting
			? dashboardDraftingStatus.activeContactId
			: null;
		for (const id of selectedContacts) {
			if (dashboardDraftingCompletedContactIdSet.has(id)) {
				statuses.set(id, 'drafted');
				continue;
			}
			if (activeId != null && id === activeId) {
				statuses.set(id, 'drafting');
				continue;
			}
			statuses.set(id, 'queued');
		}
		return statuses;
	}, [
		dashboardDraftingCompletedContactIdSet,
		dashboardDraftingStatus.activeContactId,
		dashboardDraftingStatus.isDrafting,
		isWriteMode,
		selectedContacts,
	]);

	const mapPanelSelectedContacts = useMemo(
		() => {
			const selected = displayedMapPanelContacts.filter((c) =>
				selectedContacts.includes(c.id)
			);
			if (!dashboardDraftingStatus.isDrafting) return selected;

			const activeId = dashboardDraftingStatus.activeContactId;
			return [...selected].sort((a, b) => {
				const aCompletedOrder = dashboardDraftingCompletedOrderById.get(a.id);
				const bCompletedOrder = dashboardDraftingCompletedOrderById.get(b.id);
				const aCompleted = aCompletedOrder != null;
				const bCompleted = bCompletedOrder != null;
				if (aCompleted && bCompleted) return aCompletedOrder - bCompletedOrder;
				if (aCompleted) return -1;
				if (bCompleted) return 1;
				const aActive = activeId != null && a.id === activeId;
				const bActive = activeId != null && b.id === activeId;
				if (aActive && !bActive) return -1;
				if (!aActive && bActive) return 1;
				return 0;
			});
		},
		[
			dashboardDraftingCompletedOrderById,
			dashboardDraftingStatus.activeContactId,
			dashboardDraftingStatus.isDrafting,
			displayedMapPanelContacts,
			selectedContacts,
		]
	);
	const mapPanelUnselectedContacts = useMemo(
		() => displayedMapPanelContacts.filter((c) => !selectedContacts.includes(c.id)),
		[displayedMapPanelContacts, selectedContacts]
	);

	// Maps a contact to one of the chip keys (or null) — mirrors the row renderer's category pill priority.
	const getChipKeyForContact = useCallback(
		(contact: ContactWithName): string | null => {
			const isInBase = displayedBaseContactIdSet.has(contact.id);
			const headline =
				contact.curatedDisplayLabel || contact.headline || contact.title || '';
			if ((isInBase && displayedIsRestaurantsSearch) || isRestaurantTitle(headline))
				return 'restaurants';
			if ((isInBase && displayedIsCoffeeShopsSearch) || isCoffeeShopTitle(headline))
				return 'coffee-shops';
			if ((isInBase && displayedIsMusicVenuesSearch) || isMusicVenueTitle(headline))
				return 'music-venues';
			if ((isInBase && displayedIsMusicFestivalsSearch) || isMusicFestivalTitle(headline))
				return 'festivals';
			if (
				(isInBase && displayedIsWeddingPlannersSearch) ||
				isWeddingPlannerTitle(headline) ||
				isWeddingVenueTitle(headline)
			)
				return 'wedding-planners';
			if (isWineBeerSpiritsTitle(headline)) return 'wine-beer-spirits';
			return null;
		},
		[
			displayedBaseContactIdSet,
			displayedIsRestaurantsSearch,
			displayedIsCoffeeShopsSearch,
			displayedIsMusicVenuesSearch,
			displayedIsMusicFestivalsSearch,
			displayedIsWeddingPlannersSearch,
		]
	);

	// Set of chip keys present in the panel results — drives which chips are visible at the bottom.
	const mapPanelCategoryKeys = useMemo(() => {
		const set = new Set<string>();
		for (const c of displayedMapPanelContacts) {
			const key = getChipKeyForContact(c);
			if (key) set.add(key);
		}
		return set;
	}, [displayedMapPanelContacts, getChipKeyForContact]);

	// Unselected contacts with the chip-bar category filter applied.
	const mapPanelUnselectedContactsFiltered = useMemo(() => {
		if (selectedCategoryChips.size === 0) return mapPanelUnselectedContacts;
		return mapPanelUnselectedContacts.filter((c) => {
			const key = getChipKeyForContact(c);
			return !key || !selectedCategoryChips.has(key);
		});
	}, [mapPanelUnselectedContacts, selectedCategoryChips, getChipKeyForContact]);

	// Chip keys actually present in the FILTERED visible list — drives the header pill row.
	const mapPanelVisibleCategoryKeys = useMemo(() => {
		const set = new Set<string>();
		for (const c of mapPanelUnselectedContactsFiltered) {
			const key = getChipKeyForContact(c);
			if (key) set.add(key);
		}
		return set;
	}, [mapPanelUnselectedContactsFiltered, getChipKeyForContact]);

	// Bottom category-tile box — only once results are loaded and at least one maps to a category.
	const showMapPanelCategoryBox = !isMapResultsLoading && mapPanelCategoryKeys.size > 0;
	// When the Search Results panel is intentionally compressed (last few remaining),
	// reserve enough height to keep 1–2 rows fully visible above the bottom category box
	// (rows are `h-[49px]` with `space-y-[7px]` between them).
	const mapPanelCompressedVisibleSearchRows = Math.min(
		2,
		mapPanelUnselectedContactsFiltered.length
	);
	const mapPanelDesktopSearchResultsMinHeightPx =
		MAP_VIEW_SEARCH_RESULTS_MIN_HEIGHT_PX +
		(showMapPanelCategoryBox &&
		mapPanelUnselectedContactsFiltered.length <=
			MAP_VIEW_SEARCH_RESULTS_COMPRESS_THRESHOLD
			? mapPanelCompressedVisibleSearchRows * 49 +
				Math.max(0, mapPanelCompressedVisibleSearchRows - 1) * 7
			: 0);
	const mapPanelDesktopPanelBottomPadPx =
		!isMapResultsLoading && !fromHomeParam ? 39 + 18 : 9;
	// Gradually release the Selection panel height as Search Results gets low
	// (avoid a hard jump at 6→5 remaining items). Uses a quadratic ramp so the
	// earliest steps change minimally, then accelerate as you approach 0.
	const mapPanelDesktopSelectionRampSpan =
		MAP_VIEW_SEARCH_RESULTS_COMPRESS_THRESHOLD + 1;
	const mapPanelDesktopSelectionRampProgress = Math.min(
		1,
		Math.max(
			0,
			(mapPanelDesktopSelectionRampSpan -
				mapPanelUnselectedContactsFiltered.length) /
				mapPanelDesktopSelectionRampSpan
		)
	);
	const mapPanelDesktopSelectionRampEased =
		mapPanelDesktopSelectionRampProgress * mapPanelDesktopSelectionRampProgress;
	const mapPanelDesktopSelectionFraction =
		0.5 + 0.5 * mapPanelDesktopSelectionRampEased;
	const mapPanelDesktopSelectionDivisor = 1 / mapPanelDesktopSelectionFraction;
	const mapPanelDesktopSelectionMaxHeightCss = `min(calc((100% - ${mapPanelDesktopPanelBottomPadPx}px) / ${mapPanelDesktopSelectionDivisor.toFixed(
		4
	)}), calc(100% - ${
		mapPanelDesktopSearchResultsMinHeightPx + mapPanelDesktopPanelBottomPadPx
	}px))`;

	const getMapResearchDisplayFields = useCallback(
		(contact: ContactWithName) => {
			const isSelected = selectedContacts.includes(contact.id);
			const isInBaseResults = displayedBaseContactIdSet.has(contact.id);
			const searchDerivedHeadline =
				displayedWhatValue && displayedWhereValue
					? `${displayedWhatValue} ${displayedWhereValue}`
					: displayedWhatValue || '';
			const isSpecialCategorySearch =
				/^restaurants?$/i.test(displayedWhatValue.trim()) ||
				/^coffee\s*shops?$/i.test(displayedWhatValue.trim());
			const curatedDisplayHeadline = contact.curatedDisplayLabel || '';
			const contactHeadline =
				curatedDisplayHeadline ||
				(isInBaseResults
					? contact.headline || contact.title || ''
					: contact.title || contact.headline || '');
			const computedHeadline = isInBaseResults
				? isSpecialCategorySearch
					? searchDerivedHeadline
					: contactHeadline || searchDerivedHeadline
				: contactHeadline;
			const stickyHeadline = selectedContactStickyHeadlineById[contact.id] || '';
			const rowHeadline =
				isSelected && stickyHeadline ? stickyHeadline : computedHeadline;
			const displayTitleCategory = displayedIsRestaurantsSearch && isInBaseResults
				? 'Restaurants'
				: displayedIsCoffeeShopsSearch && isInBaseResults
					? 'Coffee Shops'
					: displayedIsMusicVenuesSearch && isInBaseResults
						? 'Music Venues'
						: displayedIsMusicFestivalsSearch && isInBaseResults
							? 'Music Festivals'
							: displayedIsWeddingPlannersSearch && isInBaseResults
								? 'Wedding Planners'
								: rowHeadline || contact.title || '';

			return {
				displayHeadline:
					contact.headline?.trim() || contact.title?.trim() || rowHeadline || '',
				displayTitleCategory,
			};
		},
		[
			displayedBaseContactIdSet,
			displayedIsCoffeeShopsSearch,
			displayedIsMusicFestivalsSearch,
			displayedIsMusicVenuesSearch,
			displayedIsRestaurantsSearch,
			displayedIsWeddingPlannersSearch,
			displayedWhatValue,
			displayedWhereValue,
			selectedContactStickyHeadlineById,
			selectedContacts,
		]
	);

	const mapPanelHoveredResearchContact = useMemo(() => {
		const effectiveContactId = websitePreviewContactId ?? hoveredMapPanelContactId;
		if (
			isDashboardSendQueueResearchSuppressed ||
			!isMapView ||
			isMapResultsLoading ||
			effectiveContactId == null
		) {
			return null;
		}

		const contact = displayedMapPanelContacts.find(
			(candidate) => candidate.id === effectiveContactId
		);
		if (!contact) return null;

		return { contact, ...getMapResearchDisplayFields(contact) };
	}, [
		displayedMapPanelContacts,
		getMapResearchDisplayFields,
		hoveredMapPanelContactId,
		isDashboardSendQueueResearchSuppressed,
		isMapResultsLoading,
		isMapView,
		websitePreviewContactId,
	]);

	const mapMarkerResearchDisplayFields = useMemo(
		() =>
			mapResearchPanelContact
				? getMapResearchDisplayFields(mapResearchPanelContact)
				: null,
		[getMapResearchDisplayFields, mapResearchPanelContact]
	);

	// The row-hover card owns its expand state internally and resets it on unmount;
	// clear the parent mirror whenever that card isn't showing so the nav boxes
	// don't stay receded after the hover ends.
	const isDashboardWriteOverlayVisible =
		isWriteMode &&
		Boolean(dashboardMapCampaignForHeader) &&
		(selectedContacts.length > 0 || isWriteReviewActive) &&
		!isCompressedMapChrome &&
		shouldShowMapResultsSidePanel;
	// While the write overlay occupies the space beside Search Results, dock row-hover
	// research on the left rail so it doesn't stack under the contact boxes.
	const mapPanelHoverResearchDockSide: 'left' | 'right' =
		isDashboardWriteOverlayVisible ? 'left' : 'right';
	const shouldShowMapResearchPanel =
		!isDashboardSendQueueResearchSuppressed &&
		mapResearchPanelContact != null &&
		canShowContactForWebsitePreview(mapResearchPanelContact.id);
	const shouldShowMapPanelHoverResearch =
		!isDashboardSendQueueResearchSuppressed &&
		mapPanelHoveredResearchContact != null &&
		canShowContactForWebsitePreview(mapPanelHoveredResearchContact.contact.id);
	const isMapPanelHoverResearchVisible =
		shouldShowMapPanelHoverResearch && !shouldShowMapResearchPanel;
	useEffect(() => {
		if (!isMapPanelHoverResearchVisible) setMapPanelHoverResearchExpanded(false);
	}, [isMapPanelHoverResearchVisible]);
	const websitePreviewPinnedResearchStyle = useMemo<React.CSSProperties | null>(() => {
		if (!websitePreviewAnchorRect) return null;
		const rootScale = getMurmurRootScale() || 1;
		return {
			position: 'fixed',
			top: `${websitePreviewAnchorRect.top / rootScale}px`,
			left: `${websitePreviewAnchorRect.left / rootScale}px`,
			width: `${MAP_MARKER_RESEARCH_GROUP_WIDTH_PX}px`,
			transform: `scale(${MAP_VIEW_PANEL_SCALE})`,
			transformOrigin: 'top left',
		};
	}, [MAP_VIEW_PANEL_SCALE, websitePreviewAnchorRect]);

	// Hovered overlay markers/rows may be slim map-overlay payloads; backfill their
	// research fields so the hover research panels don't render blank.
	const mapResearchPanelContactEnriched = useContactWithResearch(mapResearchPanelContact);
	const mapPanelHoveredResearchContactEnriched = useContactWithResearch(
		mapPanelHoveredResearchContact?.contact ?? null
	);

	const getTabPillXFor = (tab: 'search' | 'inbox') => {
		const track = tabToggleTrackRef.current;
		const pill = tabTogglePillRef.current;

		// Fallbacks match the fixed design values used in the markup below.
		// Use clientWidth (excludes border) to align with the flex button layout.
		// Note: transforms (scale) do not affect these layout measurements.
		const trackWidth = track?.clientWidth ?? 222;
		const pillWidth = pill?.offsetWidth ?? 85;

		const half = trackWidth / 2;
		const inset = (half - pillWidth) / 2;

		return tab === 'search' ? inset : half + inset;
	};

	const updateTabQueryParam = (tab: 'search' | 'inbox') => {
		if (!ENABLE_DASHBOARD_INBOX_TAB && tab === 'inbox') return;
		const current = searchParams.get('tab');
		if (current === tab) return;
		const params = new URLSearchParams(searchParams.toString());
		params.set('tab', tab);
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	};

	// Keep the Search/Inbox pill positioned correctly (no animation) whenever it mounts
	// or the tab changes outside of our GSAP transition.
	useEffect(() => {
		if (hasSearched) return;
		const pill = tabTogglePillRef.current;
		if (!pill) return;
		if (isTabSwitchAnimatingRef.current) return;

		gsap.set(pill, {
			// GSAP can parse an existing `translateY(-50%)` as a pixel `y` value (e.g. -8.5px),
			// and then *also* apply `yPercent: -50`, effectively doubling the vertical offset.
			// Explicitly zero out `y` so `yPercent` is the only centering mechanism.
			y: 0,
			yPercent: -50,
			x: getTabPillXFor(activeTab),
			backgroundColor: TAB_PILL_COLORS[activeTab],
		});
	}, [activeTab, hasSearched]);

	// Hover preview (matches Campaign Auto/Manual/Hybrid behavior):
	// - When hovering the *other* tab, show its colored pill
	// - Turn the selected pill white (overlay) + hide its label
	useLayoutEffect(() => {
		if (hasSearched) return;
		if (isTabSwitchAnimatingRef.current) return;

		const hoverPill = tabToggleHoverPillRef.current;
		const whitePill = tabToggleWhitePillRef.current;
		if (!hoverPill || !whitePill) return;

		const isPreviewingOther = hoveredTab != null && hoveredTab !== activeTab;

		if (!isPreviewingOther || !hoveredTab) {
			// Let CSS handle the actual animation timing/curve (matches campaign UI).
			gsap.set(hoverPill, { opacity: 0 });
			gsap.set(whitePill, { opacity: 0 });
			return;
		}

		// Set correct positions immediately; animate only opacity (snappier, matches campaign UI).
		gsap.set(hoverPill, {
			y: 0,
			yPercent: -50,
			x: getTabPillXFor(hoveredTab),
			backgroundColor: TAB_PILL_COLORS[hoveredTab],
			opacity: 1,
		});
		gsap.set(whitePill, {
			y: 0,
			yPercent: -50,
			x: getTabPillXFor(activeTab),
			opacity: 1,
		});
	}, [activeTab, hoveredTab, hasSearched]);

	useEffect(() => {
		if (hasSearched) return;
		const handleResize = () => {
			if (isTabSwitchAnimatingRef.current) return;
			const pill = tabTogglePillRef.current;
			if (!pill) return;
			gsap.set(pill, { x: getTabPillXFor(activeTab) });
			const hoverPill = tabToggleHoverPillRef.current;
			const whitePill = tabToggleWhitePillRef.current;
			if (hoverPill && hoveredTab && hoveredTab !== activeTab) {
				gsap.set(hoverPill, { y: 0, yPercent: -50, x: getTabPillXFor(hoveredTab) });
			}
			if (whitePill && hoveredTab && hoveredTab !== activeTab) {
				gsap.set(whitePill, { y: 0, yPercent: -50, x: getTabPillXFor(activeTab) });
			}
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [activeTab, hasSearched, hoveredTab]);

	const transitionToTab = (
		nextTab: 'search' | 'inbox',
		opts?: { animate?: boolean; after?: () => void }
	) => {
		if (!ENABLE_DASHBOARD_INBOX_TAB && nextTab === 'inbox') {
			// Inbox is intentionally disabled on the Dashboard for now.
			opts?.after?.();
			return;
		}

		// Always clear hover-preview state on click.
		setHoveredTab(null);
		const hoverPill = tabToggleHoverPillRef.current;
		if (hoverPill) gsap.set(hoverPill, { opacity: 0 });
		const whitePill = tabToggleWhitePillRef.current;
		if (whitePill) gsap.set(whitePill, { opacity: 0 });

		if (nextTab === activeTab) {
			opts?.after?.();
			return;
		}

		const animate = opts?.animate ?? true;
		const pill = tabTogglePillRef.current;
		const dashboardContent = dashboardContentRef.current;

		// If we can't animate (e.g. refs not mounted), just switch.
		if (!animate || !pill) {
			setActiveTab(nextTab);
			updateTabQueryParam(nextTab);
			opts?.after?.();
			return;
		}

		// Kill any in-flight transition.
		if (tabSwitchTimelineRef.current) {
			tabSwitchTimelineRef.current.kill();
			tabSwitchTimelineRef.current = null;
		}

		isTabSwitchAnimatingRef.current = true;

		const nextX = getTabPillXFor(nextTab);

		const tl = gsap.timeline({
			onComplete: () => {
				isTabSwitchAnimatingRef.current = false;
				tabSwitchTimelineRef.current = null;
				opts?.after?.();
			},
		});
		tabSwitchTimelineRef.current = tl;

		// Pill: slide + color tween
		tl.to(
			pill,
			{
				x: nextX,
				backgroundColor: TAB_PILL_COLORS[nextTab],
				duration: 0.6,
				ease: 'power2.out',
				overwrite: 'auto',
			},
			0
		);

		// Whole page: fade out
		const fadeOutDuration = 0.22;
		const fadeInDuration = 0.26;
		if (dashboardContent) {
			tl.to(
				dashboardContent,
				{
					opacity: 0,
					duration: fadeOutDuration,
					ease: 'power2.out',
					overwrite: 'auto',
				},
				0
			);
		}

		// Swap the tab only once opacity has hit 0.
		// Use flushSync so React commits the new tab before we fade back in,
		// avoiding a single-frame "flash" of the previous tab during the fade-in.
		tl.call(
			() => {
				flushSync(() => {
					setActiveTab(nextTab);
				});
				updateTabQueryParam(nextTab);
			},
			[],
			fadeOutDuration
		);

		// Whole page: fade in
		if (dashboardContent) {
			tl.to(
				dashboardContent,
				{
					opacity: 1,
					duration: fadeInDuration,
					ease: 'power1.inOut',
					overwrite: 'auto',
				},
				fadeOutDuration
			);
		}
	};

	const showHorizontalResearchStrip =
		isMobile === false && !!hoveredContact && !isMapView;

	// Clear hover state on mobile to prevent stuck hover
	useEffect(() => {
		if (isMobile) {
			setHoveredContact(null);
		}
	}, [isMobile, setHoveredContact]);

	// The initial desktop dashboard uses a scroll-locked, single-screen layout.
	// Calendar now fits without page scrolling, so we never unlock.
	const shouldUnlockLandingDashboardScroll = false;
	const shouldLockLandingDashboardScroll =
		isMobile === false &&
		!hasSearched &&
		activeTab === 'search' &&
		!fromHomeParam &&
		!isMapView &&
		!shouldUnlockLandingDashboardScroll;
	// Mobile is always locked: the dashboard is a fixed app frame there, and any
	// document scroll slack reads as a white band below the persistent map.
	const shouldLockDashboardPageScroll =
		isMapView || shouldLockLandingDashboardScroll || isMobile === true;

	// The calendar panel's natural height can exceed the locked-100vh wrapper on shorter
	// monitors, which clips its bottom row. Treat it the same way the open campaign finder
	// is treated: let it paint past the wrapper (overflow: visible on html/body, drop the
	// `h-screen overflow-hidden` clipper) while still preventing the page from scrolling.
	const isCalendarPanelOpen =
		!hasSearched && activeTab === 'search' && selectedActionBarIcon === 'calendar';
	const isOverflowingDashboardPanelOpen = isCampaignFinderOpen || isCalendarPanelOpen;

	// Cinematic boot splash: dark starfield + skeleton hero chrome while the map
	// cold-loads. Desktop waits for Mapbox's full `load` readiness signal before
	// fading out, so the reveal does not happen over half-loaded map detail. The
	// mobile progress pill still keys off the earlier first-paint signal below.
	const isPersistentMapFirstPainted = usePersistentMapFirstPaint();
	const isPersistentMapReady = usePersistentMapReady();
	const [bootPhase, setBootPhase] = useState<DashboardBootPhase>(() =>
		isPersistentMapReady ? 'done' : 'active'
	);
	const bootStartRef = useRef(Date.now());

	// Full map load → hold until the minimum cover time has elapsed, then fade in.
	useEffect(() => {
		if (bootPhase !== 'active' || !isPersistentMapReady) return;
		const elapsed = Date.now() - bootStartRef.current;
		const timer = setTimeout(
			() => setBootPhase('fading'),
			Math.max(0, DASHBOARD_BOOT_MIN_VISIBLE_MS - elapsed)
		);
		return () => clearTimeout(timer);
	}, [bootPhase, isPersistentMapReady]);

	useEffect(() => {
		if (bootPhase !== 'fading') return;
		markPerf('murmur:map:reveal-start');
		const timer = setTimeout(() => setBootPhase('done'), DASHBOARD_BOOT_FADE_MS);
		return () => clearTimeout(timer);
	}, [bootPhase]);

	// Safety cap: never hold the cover past the max wait (map error / blocked tiles);
	// reveal anyway rather than leaving the dashboard hidden forever.
	useEffect(() => {
		if (bootPhase !== 'active') return;
		const elapsed = Date.now() - bootStartRef.current;
		const timer = setTimeout(
			() => setBootPhase('fading'),
			Math.max(0, DASHBOARD_BOOT_MAX_WAIT_MS - elapsed)
		);
		return () => clearTimeout(timer);
	}, [bootPhase]);

	// Abort instantly anywhere off the clean desktop landing (mobile tree, deep-linked
	// search/map-view/?fromHome, or a search/scroll-to-map commit mid-load).
	useEffect(() => {
		if (bootPhase === 'done') return;
		if (isMobile === true || (isMobile === false && !shouldLockLandingDashboardScroll)) {
			setBootPhase('done');
		}
	}, [bootPhase, isMobile, shouldLockLandingDashboardScroll]);

	// Body classes drive the boot chrome skin/fade. Classes rather than prop-threading
	// because the skinned elements span the hero and the ask-anything bar, which
	// lives outside the scroll-lock wrapper.
	useLayoutEffect(() => {
		const body = document.body;
		body.classList.toggle(
			'dashboard-booting',
			bootPhase === 'active' && shouldLockLandingDashboardScroll
		);
		body.classList.toggle(
			'dashboard-boot-fading',
			bootPhase === 'fading' && shouldLockLandingDashboardScroll
		);
		return () => {
			body.classList.remove('dashboard-booting', 'dashboard-boot-fading');
		};
	}, [bootPhase, shouldLockLandingDashboardScroll]);

	// The hero Input's border is layered Tailwind `!important` utilities, which CSS in
	// globals.css cannot reliably beat — so its boot skin swaps the classes in JSX.
	const isBootSkin = bootPhase === 'active' && shouldLockLandingDashboardScroll;
	const isBootTransition = bootPhase !== 'done' && shouldLockLandingDashboardScroll;

	// Lock body scroll when in map view or on the initial desktop dashboard.
	useLayoutEffect(() => {
		if (shouldLockDashboardPageScroll) {
			const root = document.documentElement;
			const body = document.body;
			const previousRootOverflow = root.style.overflow;
			const previousRootHeight = root.style.height;
			const previousRootOverscrollBehavior = root.style.overscrollBehavior;
			const previousBodyOverflow = body.style.overflow;
			const previousBodyHeight = body.style.height;
			const previousBodyMinHeight = body.style.minHeight;
			const previousBodyOverscrollBehavior = body.style.overscrollBehavior;

			if (shouldLockLandingDashboardScroll || isMobile === true) {
				window.scrollTo({ top: 0, left: 0 });
			}

			if (isMobile === true) {
				// Mobile: collapse the document instead of pinning it to a viewport
				// unit. Under the root murmur-compact zoom, 100vh/100dvh on html/body
				// resolves to ~innerHeight/0.9 CSS px on real Safari — scrollable
				// slack that iOS keyboard-reveal scrolling exploits even through
				// overflow:hidden, exposing a white band below the map. All mobile
				// dashboard content is fixed, so body needs no height at all; min-height
				// 0 neutralizes the root layout's min-h-screen on body.
				root.style.overflow = 'hidden';
				root.style.overscrollBehavior = 'none';
				body.style.overflow = 'hidden';
				body.style.minHeight = '0';
				body.style.overscrollBehavior = 'none';

				return () => {
					root.style.overflow = previousRootOverflow;
					root.style.overscrollBehavior = previousRootOverscrollBehavior;
					body.style.overflow = previousBodyOverflow;
					body.style.minHeight = previousBodyMinHeight;
					body.style.overscrollBehavior = previousBodyOverscrollBehavior;
				};
			}

			const overflowValue = isOverflowingDashboardPanelOpen ? 'visible' : 'hidden';

			root.style.overflow = overflowValue;
			root.style.height = '100vh';
			root.style.overscrollBehavior = 'none';
			body.style.overflow = overflowValue;
			body.style.height = '100vh';
			body.style.overscrollBehavior = 'none';

			return () => {
				root.style.overflow = previousRootOverflow;
				root.style.height = previousRootHeight;
				root.style.overscrollBehavior = previousRootOverscrollBehavior;
				body.style.overflow = previousBodyOverflow;
				body.style.height = previousBodyHeight;
				body.style.overscrollBehavior = previousBodyOverscrollBehavior;
			};
		}

		return undefined;
	}, [
		shouldLockDashboardPageScroll,
		shouldLockLandingDashboardScroll,
		isOverflowingDashboardPanelOpen,
		isMobile,
	]);

	// When the campaign finder OR the calendar panel is open we allow the panel to overflow
	// the viewport (overflow: visible) so it can paint past the locked-100vh wrapper at its
	// full height. We still want to prevent the *page* from scrolling, so we intercept
	// wheel/touch/keyboard scroll events.
	useEffect(() => {
		if (!isOverflowingDashboardPanelOpen || !shouldLockDashboardPageScroll) return;

		const preventWheel = (e: WheelEvent) => {
			e.preventDefault();
		};

		const preventTouch = (e: TouchEvent) => {
			e.preventDefault();
		};

		const preventKeyScroll = (e: KeyboardEvent) => {
			const scrollKeys = [
				'ArrowUp',
				'ArrowDown',
				'PageUp',
				'PageDown',
				'Home',
				'End',
				' ',
			];
			if (!scrollKeys.includes(e.key)) return;

			const target = e.target as HTMLElement;
			const isEditable =
				target.isContentEditable ||
				['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
			if (isEditable) return;

			e.preventDefault();
		};

		window.addEventListener('wheel', preventWheel, { passive: false });
		window.addEventListener('touchmove', preventTouch, { passive: false });
		window.addEventListener('keydown', preventKeyScroll);

		return () => {
			window.removeEventListener('wheel', preventWheel);
			window.removeEventListener('touchmove', preventTouch);
			window.removeEventListener('keydown', preventKeyScroll);
		};
	}, [isOverflowingDashboardPanelOpen, shouldLockDashboardPageScroll]);

	// Combine section values into main search field
	useEffect(() => {
		const formattedWhere =
			whereValue && whereValue.trim().length > 0 ? `(${whereValue})` : '';
		const combinedSearch = [whyValue, whatValue, formattedWhere]
			.filter(Boolean)
			.join(' ');
		if (combinedSearch) {
			form.setValue('searchText', combinedSearch);
		}
	}, [whyValue, whatValue, whereValue, form]);

	// Map view (results): automatically re-run the search when "What" changes.
	// Intentionally do NOT auto-search on "Why"-only edits.
	// "Where" changes do NOT auto-search; user must click a state from dropdown or press Enter.
	// The bottom Category panel is explicit-submit only; opening/focusing it should not replay
	// the current search.
	const mapAutoSearchPayload = useMemo(
		() => JSON.stringify({ what: whatValue.trim() }),
		[whatValue]
	);
	const debouncedMapAutoSearchPayload = useDebounce(mapAutoSearchPayload, 650);
	const lastMapAutoSearchPayloadRef = useRef<string | null>(null);

	useEffect(() => {
		// Reset when leaving results/map view
		if (!hasSearched || !isMapView) {
			lastMapAutoSearchPayloadRef.current = null;
			return;
		}

		if (isMapBottomCategoryMode) {
			lastMapAutoSearchPayloadRef.current = mapAutoSearchPayload;
			return;
		}

		// Prime the baseline payload so "Why" changes alone don't trigger a search.
		if (lastMapAutoSearchPayloadRef.current == null) {
			lastMapAutoSearchPayloadRef.current = debouncedMapAutoSearchPayload;
			return;
		}

		// Only respond to debounced changes in What.
		if (lastMapAutoSearchPayloadRef.current === debouncedMapAutoSearchPayload) return;

		let parsed: { what: string } | null = null;
		try {
			parsed = JSON.parse(debouncedMapAutoSearchPayload) as { what: string };
		} catch {
			// Should never happen, but don't break the page if it does.
			return;
		}

		const typedWhat = (parsed.what || '').trim();

		// If the segmented inputs aren't initialized (e.g. user searched via raw text),
		// infer missing pieces from the last executed query so edits behave intuitively.
		const inferredWhy = extractWhyFromSearchQuery(activeSearchQuery) || '';
		const inferredWhat = extractWhatFromSearchQuery(activeSearchQuery) || '';
		const inferredWhere = extractWhereFromSearchQuery(activeSearchQuery) || '';

		const effectiveWhy = (whyValue || inferredWhy).trim();
		const effectiveWhat = (typedWhat || inferredWhat).trim();
		// Use current whereValue for auto-search, but changes to it won't trigger auto-search
		const effectiveWhere = (whereValue || inferredWhere).trim();

		// Auto-search only when "What" is meaningful. ("Where" can be left unchanged.)
		if (!effectiveWhat) return;

		const formattedWhere = effectiveWhere ? `(${effectiveWhere})` : '';
		const combinedSearch = [effectiveWhy, effectiveWhat, formattedWhere]
			.filter(Boolean)
			.join(' ')
			.trim();

		// If the debounced What/Where already match the active query, just update the baseline.
		if (combinedSearch === activeSearchQuery) {
			lastMapAutoSearchPayloadRef.current = debouncedMapAutoSearchPayload;
			return;
		}

		// Don't auto-trigger auth flows; only run if already signed in.
		if (!isSignedIn) return;

		lastMapAutoSearchPayloadRef.current = debouncedMapAutoSearchPayload;
		form.setValue('searchText', combinedSearch, {
			shouldValidate: false,
			shouldDirty: true,
		});
		form.handleSubmit(onSubmit)();
	}, [
		activeSearchQuery,
		debouncedMapAutoSearchPayload,
		form,
		hasSearched,
		isMapBottomCategoryMode,
		isMapView,
		mapAutoSearchPayload,
		isSignedIn,
		onSubmit,
		whereValue,
		whyValue,
	]);

	// Check for pending search from campaign searchbars. Campaign-scoped payloads must
	// match the current `fromCampaignId`; stale payloads should never override a curated
	// campaign entry or bind a search to the wrong campaign.
	useEffect(() => {
		if (typeof window === 'undefined') return;

		let rawPendingSearch: string | null = null;
		try {
			rawPendingSearch = sessionStorage.getItem(PENDING_SEARCH_STORAGE_KEY);
			if (rawPendingSearch) {
				// Clear immediately so ignored stale payloads cannot replay later.
				sessionStorage.removeItem(PENDING_SEARCH_STORAGE_KEY);
			}
		} catch {
			return;
		}

		if (rawPendingSearch) {
			const pending = parsePendingDashboardSearch(rawPendingSearch);
			const pendingSearch = pending.query.trim();
			if (!pendingSearch) return;

			const hasExplicitSearchContext =
				curatedModeParam ||
				freeTextModeParam ||
				allContactsMapParam ||
				Boolean(dashboardSearchParam || fromCampaignSearchParam);
			if (hasExplicitSearchContext) return;

			if (pending.fromCampaignId) {
				if (pending.fromCampaignId !== fromCampaignIdParam) return;
			} else if (isAddToCampaignMode) {
				return;
			}

			// Parse the search query: "[Why] What in Where"
			const whyMatch = pendingSearch.match(/^\[(Booking|Promotion)\]/i);
			const inMatch = pendingSearch.match(/\s+in\s+(.+)$/i);

			let parsedWhy = '';
			let parsedWhat = '';
			let parsedWhere = '';

			if (whyMatch) {
				parsedWhy = `[${whyMatch[1]}]`;
			}

			if (inMatch) {
				parsedWhere = inMatch[1].trim();
				// Get the "what" part - everything after [Why] and before " in "
				let whatPart = pendingSearch;
				if (whyMatch) {
					whatPart = whatPart.replace(whyMatch[0], '').trim();
				}
				whatPart = whatPart.replace(/\s+in\s+.+$/i, '').trim();
				parsedWhat = whatPart;
			} else {
				// No "in" found, the whole thing minus [Why] is the "what"
				let whatPart = pendingSearch;
				if (whyMatch) {
					whatPart = whatPart.replace(whyMatch[0], '').trim();
				}
				parsedWhat = whatPart;
			}

			// Set the values
			if (parsedWhy) setWhyValue(parsedWhy);
			if (parsedWhat) setWhatValue(parsedWhat);
			if (parsedWhere) {
				setWhereValue(parsedWhere);
				setIsNearMeLocation(false);
			}

			// Set the form value and submit after a short delay to allow state to update
			setTimeout(() => {
				const formattedWhere = parsedWhere ? `(${parsedWhere})` : '';
				const combinedSearch = [parsedWhy, parsedWhat, formattedWhere]
					.filter(Boolean)
					.join(' ');
				if (combinedSearch) {
					form.setValue('searchText', combinedSearch);
					form.handleSubmit(onSubmit)();
				}
			}, 100);
		}
	}, [
		allContactsMapParam,
		curatedModeParam,
		dashboardSearchParam,
		form,
		freeTextModeParam,
		fromCampaignIdParam,
		fromCampaignSearchParam,
		isAddToCampaignMode,
		onSubmit,
	]);

	// Handle clicks outside to deactivate sections
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (
				target.closest('.search-sections-container') ||
				target.closest('.mini-search-section-why') ||
				target.closest('.mini-search-section-what') ||
				target.closest('.mini-search-section-where')
			) {
				setIsMapBottomCategoryDropdownActive(false);
			}

			if (
				!target.closest('.search-sections-container') &&
				!target.closest('.search-dropdown-menu') &&
				!target.closest('.mini-search-section-why') &&
				!target.closest('.mini-search-section-what') &&
				!target.closest('.mini-search-section-where') &&
				!target.closest('.map-bottom-category-search')
			) {
				setActiveSection(null);
			}
		};

		if (activeSection) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
	}, [activeSection]);

	//animation between the sections of the search bar
	useEffect(() => {
		const indicator = activeSectionIndicatorRef.current;
		if (!indicator) return;

		// Prevent overlapping tweens when the user clicks quickly
		gsap.killTweensOf(indicator);

		const xPercentForSection = (section: 'why' | 'what' | 'where') => {
			switch (section) {
				case 'why':
					return 0;
				case 'what':
					return 100;
				case 'where':
					return 200;
				default:
					return 0;
			}
		};

		const transformOriginForSection = (section: 'why' | 'what' | 'where') => {
			switch (section) {
				case 'why':
					return 'left center';
				case 'where':
					return 'right center';
				case 'what':
				default:
					return 'center center';
			}
		};

		// Hide when no active section (default state shows dividers)
		if (!activeSection) {
			gsap.to(indicator, {
				opacity: 0,
				duration: 0.15,
				ease: 'power2.out',
				overwrite: 'auto',
			});
			gsap.set(indicator, { scaleX: 1, transformOrigin: 'center center' });
			prevActiveSectionForIndicatorRef.current = null;
			return;
		}

		const nextXPercent = xPercentForSection(activeSection);
		const prevSection = prevActiveSectionForIndicatorRef.current;

		// On first open (empty -> selected), animate a "shrink" into the selected segment
		// so it feels consistent with the tab switching motion.
		if (!prevSection) {
			const origin = transformOriginForSection(activeSection);

			// Start as a full-width highlight (scaleX: 3 because the indicator is 1/3 width),
			// then shrink toward the selected segment's side/center.
			gsap.set(indicator, {
				xPercent: nextXPercent,
				opacity: 1,
				scaleX: 3,
				transformOrigin: origin,
			});
			gsap.to(indicator, {
				scaleX: 1,
				duration: 0.6,
				ease: 'power2.out',
				overwrite: 'auto',
			});
			prevActiveSectionForIndicatorRef.current = activeSection;
			return;
		}

		// Between tabs, slide with requested timing/ease (width/height remain constant)
		gsap.set(indicator, { scaleX: 1, transformOrigin: 'center center' });
		gsap.to(indicator, {
			xPercent: nextXPercent,
			duration: 0.6,
			ease: 'power2.out',
			overwrite: 'auto',
		});
		gsap.to(indicator, {
			opacity: 1,
			duration: 0.15,
			ease: 'power2.out',
			overwrite: 'auto',
		});

		prevActiveSectionForIndicatorRef.current = activeSection;
	}, [activeSection]);

	// Animation for the mini search bar (map view results) pill indicator
	useEffect(() => {
		const indicator = miniActiveSectionIndicatorRef.current;
		if (!indicator) return;

		// Prevent overlapping tweens when the user clicks quickly
		gsap.killTweensOf(indicator);

		// xPercent shifts by the indicator's own width (which is 1/3 of the container)
		const xPercentForSection = (section: 'why' | 'what' | 'where') => {
			switch (section) {
				case 'why':
					return 0;
				case 'what':
					return 100;
				case 'where':
					return 200;
				default:
					return 0;
			}
		};

		const transformOriginForSection = (section: 'why' | 'what' | 'where') => {
			switch (section) {
				case 'why':
					return 'left center';
				case 'where':
					return 'right center';
				case 'what':
				default:
					return 'center center';
			}
		};

		// Hide when no active section (default state shows dividers)
		if (!activeSection) {
			gsap.to(indicator, {
				opacity: 0,
				duration: 0.15,
				ease: 'power2.out',
				overwrite: 'auto',
			});
			gsap.set(indicator, { scaleX: 1, transformOrigin: 'center center' });
			prevMiniActiveSectionRef.current = null;
			return;
		}

		const nextXPercent = xPercentForSection(activeSection);
		const prevSection = prevMiniActiveSectionRef.current;

		// On first open (empty -> selected), animate a "shrink" into the selected segment
		if (!prevSection) {
			const origin = transformOriginForSection(activeSection);

			// Start as a full-width highlight (scaleX: 3 because the indicator is 1/3 width),
			// then shrink toward the selected segment's side/center.
			gsap.set(indicator, {
				xPercent: nextXPercent,
				opacity: 1,
				scaleX: 3,
				transformOrigin: origin,
			});
			gsap.to(indicator, {
				scaleX: 1,
				duration: 0.6,
				ease: 'power2.out',
				overwrite: 'auto',
			});
			prevMiniActiveSectionRef.current = activeSection;
			return;
		}

		// Between tabs, slide with requested timing/ease (width/height remain constant)
		gsap.set(indicator, { scaleX: 1, transformOrigin: 'center center' });
		gsap.to(indicator, {
			xPercent: nextXPercent,
			duration: 0.6,
			ease: 'power2.out',
			overwrite: 'auto',
		});
		gsap.to(indicator, {
			opacity: 1,
			duration: 0.15,
			ease: 'power2.out',
			overwrite: 'auto',
		});

		prevMiniActiveSectionRef.current = activeSection;
	}, [activeSection]);

	useEffect(() => {
		if (!activeSection) {
			setIsMapBottomCategoryDropdownActive(false);
		}
	}, [activeSection]);

	useEffect(() => {
		if (isMapBottomCategoryDropdownActive) return;

		if (activeSection === 'what' && whatInputRef.current) {
			whatInputRef.current.focus();
		} else if (activeSection === 'where' && whereInputRef.current) {
			whereInputRef.current.focus();
		}
	}, [activeSection, isMapBottomCategoryDropdownActive]);

	// Enhanced reset search that also clears section values
	const handleEnhancedResetSearch = () => {
		handleResetSearch();
		setIsMapBottomSearchAdvancedDraftArmed(false);
		setMapBottomCommittedSearchValue('');
		setMapBottomSearchValue('');
		setMapPanelShiftClickAnchor(null);
		setWhyValue('');
		setWhatValue('');
		setWhereValue('');
		setIsNearMeLocation(false);
		setActiveSection(null);
	};

	// Entering the unsubscribe flow must land on the bare spinning globe: leave map
	// view and clear any active search (idempotent — runs once, then the guard fails).
	useEffect(() => {
		if (!isUnsubscribeFlowOpen) return;
		if (!isMapView && !hasSearched) return;
		setIsMapView(false);
		setHoveredContact(null);
		handleEnhancedResetSearch();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isUnsubscribeFlowOpen, isMapView, hasSearched]);

	// While the map view is the sole interaction surface, halt Lenis' per-frame
	// scroll processing + wheel hooks (it stays alive for the hero/results
	// scroll on exit). stop() is idempotent and instance-safe.
	const lenis = useLenis();
	useEffect(() => {
		if (typeof document === 'undefined') return;

		if (isMapView || bootPhase !== 'done') {
			document.body.classList.toggle('murmur-map-view', isMapView);
			lenis?.stop();
		} else {
			document.body.classList.remove('murmur-map-view');
			lenis?.start();
		}

		return () => {
			document.body.classList.remove('murmur-map-view');
			lenis?.start();
		};
	}, [isMapView, bootPhase, lenis]);

	// Shared Mapbox layer (background globe + interactive results) — one map instance.
	// One-shot signal set only by the campaign "Search" tab. Captured once at mount (the URL is
	// stripped of `instant` after rehydration) so this transition snaps the map straight to the
	// search framing with no background-globe flash and no pan-down animation.
	const [isInstantTabTransition] = useState(
		() => searchParams.get('instant')?.trim() === '1'
	);
	const [instantTabFitNonce] = useState(() =>
		searchParams.get('instant')?.trim() === '1' ? ++instantTabFitNonceCounter : 0
	);
	const mapPresentation: 'background' | 'interactive' =
		!isInstantTabTransition && !fromHomeParam && !hasSearched && !isMapView
			? 'background'
			: 'interactive';
	const shouldSpinBackgroundMap = mapPresentation === 'background';
	const shouldShowSearchGeometryOnMap = !hasSearched || isMapSearchEngaged;
	// `shouldShowAmbientContactsOnMap` / `shouldPreloadAmbientContactsOnMap` are defined below,
	// after `activeRadiusSearchOverlay` (they now depend on `curatedBlobSearchActive`).

	// Scroll-to-map gesture: scrubbing down on the locked landing hero fades it out and dollies
	// the map in, then commits by firing the same "For You" curated search a click would — so it
	// lands in the full search-results UI (right/left panels) with the URL updated, just like a
	// normal search. The top search pill is staged empty (pendingForYouReveal) until those
	// results load, then reveals "For You". Armed only in the locked-landing state, on desktop,
	// not during an instant tab transition, and with no full-screen flow owning scrolling on top
	// (a calendar event-popup floating over the hero, or the unsubscribe flow). The campaign
	// finder and the calendar tab both stay armed even while expanded: the gesture still fires
	// over the surrounding hero/map, and the hook bails out per-target over each panel's own
	// scroll area (the calendar month-scroller and the campaigns table) so a wheel there scrolls
	// that panel independently instead of yanking the user into the map. This is why we gate on
	// isCalendarPopupOpen — not isCampaignFinderOpen / isOverflowingDashboardPanelOpen, which
	// expanding the table or the calendar would trip and would wrongly kill the whole gesture.
	const scrollToMapEnabled =
		shouldLockLandingDashboardScroll &&
		bootPhase === 'done' && // do not arm the gesture during the boot splash/fade
		!isCalendarPopupOpen &&
		!isInstantTabTransition &&
		!isUnsubscribeFlowOpen;
	const handleScrollCommitToMap = useCallback(() => {
		setPendingForYouReveal(true);
		scrollEntryDisengageRef.current = true; // land in "show all contacts", not focused
		setIsMapView(true); // reveal the map immediately so the gesture flows straight in
		void handleMapBottomForYouSubmit();
	}, [setIsMapView, handleMapBottomForYouSubmit]);
	useDashboardScrollToMap({
		enabled: scrollToMapEnabled,
		onCommit: handleScrollCommitToMap,
	});

	// Upcoming venue-posted events → radar opportunity markers on the interactive map.
	const { data: mapEvents } = useGetMapEvents({ enabled: isMapView });
	// Submitted applications hide their events from BOTH the map markers and the
	// results-panel deck (withdrawn ones stay visible so the user can re-apply).
	// useApplyToEvent invalidates ['eventApplications'] on success, so both update
	// right after an apply without touching the shared /api/events cache.
	const { data: myEventApplications, isPending: isMyEventApplicationsPending } =
		useGetMyEventApplications({ enabled: isMapView && isSignedIn === true });
	const appliedEventIds = useMemo(() => {
		const ids = new Set<number>();
		for (const application of myEventApplications ?? []) {
			if (application.status === 'submitted') ids.add(application.eventId);
		}
		return ids;
	}, [myEventApplications]);
	const unappliedMapEvents = useMemo<MapEventData[]>(
		() => (mapEvents ?? []).filter((event) => !appliedEventIds.has(event.id)),
		[mapEvents, appliedEventIds]
	);
	const eventsForMap = useMemo<SearchResultsMapProps['events']>(
		() =>
			unappliedMapEvents
				.filter((event) => event.latitude != null && event.longitude != null)
				.map((event) => ({
					id: event.id,
					lat: event.latitude as number,
					lng: event.longitude as number,
					name: event.name,
				})),
		[unappliedMapEvents]
	);
	// Renders the event-popup card for the active marker (looked up by id) inside the map's
	// white inner box. The map owns the popup container/positioning; this owns the content.
	const renderEventPopupContent = useCallback(
		(eventId: number) => {
			const event = unappliedMapEvents.find((e) => e.id === eventId);
			return event ? (
				<MapEventPopupCard
					event={event}
					onApply={() => {
						setApplyModalEvent(event);
						setApplyModalOpen(true);
					}}
				/>
			) : null;
		},
		[unappliedMapEvents]
	);
	// The user's "general area" for the results-panel deck: their profile state plus
	// its 5 nearest states. Null = no parseable profile state = no geo filter. The
	// map markers are never geo-filtered — only the panel is area-scoped.
	const panelAreaStateSet = useMemo<Set<string> | null>(() => {
		const userStateName = extractUsStateNameFromText(resolvedIdentity?.area);
		if (!userStateName) return null;
		return new Set([userStateName, ...getNearestUsStateNames(userStateName, 5)]);
	}, [resolvedIdentity?.area]);
	// In-area unapplied opportunities for the panel deck. API order is startsAt asc,
	// so the front card is the soonest. The EVENT's own coords decide its state —
	// venueState is the venue's HOME state and an event can be posted elsewhere
	// (nearest-centroid border error is benign: the set spans 6 states). Coordless
	// rows (impossible via /api/events today) fall back to venueState.
	const panelPostedEvents = useMemo<MapEventData[]>(() => {
		if (!panelAreaStateSet) return unappliedMapEvents;
		return unappliedMapEvents.filter((event) => {
			const stateName =
				event.latitude != null && event.longitude != null
					? getNearestUsStateNameForPoint(event.latitude, event.longitude)
					: normalizeUsStateName(event.venueState);
			return stateName != null && panelAreaStateSet.has(stateName);
		});
	}, [unappliedMapEvents, panelAreaStateSet]);

	const contactsForMap = useMemo(() => {
		const sourceContacts =
			fromHomeParam && (!isSignedIn || !hasSearched)
				? fromHomePlaceholderContacts
				: contacts || [];
		const allCategoriesActive = mapGrabActiveCategories.every(Boolean);
		if (allCategoriesActive && mapGrabUncategorizedActive) return sourceContacts;
		return sourceContacts.filter((contact) => {
			const categoryIndex = getMapSelectGrabCategoryIndexFromContactTitle(contact.title);
			if (categoryIndex < 0) return mapGrabUncategorizedActive;
			return mapGrabActiveCategories[categoryIndex] === true;
		});
	}, [
		fromHomeParam,
		isSignedIn,
		hasSearched,
		fromHomePlaceholderContacts,
		contacts,
		mapGrabActiveCategories,
		mapGrabUncategorizedActive,
	]);

	const searchWhatForMap =
		fromHomeParam && (!isSignedIn || !hasSearched) ? FROM_HOME_WHAT : searchedWhat;

	const lockedStateNameForMap = (() => {
		if (mapPresentation === 'background') return null;
		if (!shouldShowSearchGeometryOnMap) return null;
		if (mapBboxFilter) return null;
		if (fromHomeParam && (!isSignedIn || !hasSearched)) return 'CA';
		return searchedStateAbbrForMap;
	})();

	const skipAutoFitForMap =
		mapPresentation === 'background' ||
		!shouldShowSearchGeometryOnMap ||
		(fromHomeParam && (!isSignedIn || !hasSearched)) ||
		Boolean(mapBboxFilter);

	const selectedAreaBoundsForMap = useMemo(
		() =>
			shouldShowSearchGeometryOnMap && mapBboxFilter
				? {
						south: mapBboxFilter.south,
						west: mapBboxFilter.west,
						north: mapBboxFilter.north,
						east: mapBboxFilter.east,
					}
				: null,
		[mapBboxFilter, shouldShowSearchGeometryOnMap]
	);

	// Fullscreen map view "frame" animation.
	// Key goal: keep the Mapbox container size stable during the transition.
	// Resizing the container causes canvas reflow + debounced `map.resize()` calls, which looks jittery.
	// We instead animate a clipped viewport + overlay border, so the frame slides in without displacing the map.
	const MAP_VIEW_FRAME_INSET_PX = 0;
	const MAP_VIEW_FRAME_RADIUS_PX = 0;
	const MAP_VIEW_FRAME_BORDER_PX = 0;
	const mapViewFrameTransition = `${DASHBOARD_TO_INTERACTIVE_TRANSITION_MS}ms ${DASHBOARD_TO_INTERACTIVE_TRANSITION_CSS_EASING}`;
	const mapViewInnerInsetPx = MAP_VIEW_FRAME_INSET_PX + MAP_VIEW_FRAME_BORDER_PX;
	const mapViewInnerRadiusPx = Math.max(
		0,
		MAP_VIEW_FRAME_RADIUS_PX - MAP_VIEW_FRAME_BORDER_PX
	);
	const mapViewClip = isMapView
		? `inset(${mapViewInnerInsetPx}px round ${mapViewInnerRadiusPx}px)`
		: 'inset(0px round 0px)';

	// Stable callbacks for SearchResultsMap so it can be memoized.
	// Without stable references, the heavy map component re-renders on every
	// Dashboard state change (e.g. opening the bottom search bar dropdown),
	// which causes noticeable click lag.
	const handleMapVisibleOverlayContactsChange = useCallback(
		(overlayContacts: ContactWithName[]) => {
			setMapPanelVisibleOverlayContacts(overlayContacts);

			if (overlayContacts.length > 0) {
				setMapPanelExtraContacts((prev) => {
					const byId = new Map<number, ContactWithName>();
					for (const c of prev) byId.set(c.id, c);
					for (const c of overlayContacts) {
						if (!byId.has(c.id)) byId.set(c.id, c);
					}
					return Array.from(byId.values());
				});
			}
		},
		[]
	);

	const handleMapAreaSelect = useCallback(
		(
			_bounds: { south: number; west: number; north: number; east: number },
			payload?: { contactIds?: number[]; extraContacts?: ContactWithName[] }
		) => {
			const ids = payload?.contactIds ?? [];
			const extraContacts = payload?.extraContacts ?? [];
			const acceptedIds = getSelectionLimitedContactIds(selectedContacts, ids);
			const acceptedIdSet = new Set(acceptedIds);
			const acceptedExtraContacts = extraContacts.filter((contact) =>
				acceptedIdSet.has(contact.id)
			);

			if (ids.length > 0) {
				setSelectedContacts((prev) => mergeContactIdsWithSelectionLimit(prev, ids));
			}

			if (acceptedExtraContacts.length > 0) {
				setMapPanelExtraContacts((prev) => {
					const byId = new Map<number, ContactWithName>();
					for (const c of prev) byId.set(c.id, c);
					for (const c of acceptedExtraContacts) {
						if (!byId.has(c.id)) byId.set(c.id, c);
					}
					return Array.from(byId.values());
				});
			}

			if (acceptedIds.length > 0) {
				const nextExtraIds: number[] = [];
				const byId = new Map<number, ContactWithName>();
				for (const c of contacts || []) byId.set(c.id, c);

				for (const id of acceptedIds) {
					if (!baseContactIdSet.has(id)) {
						nextExtraIds.push(id);
						continue;
					}
					if (!searchedStateAbbrForMap) continue;
					const c = byId.get(id);
					if (!c) continue;
					const contactStateAbbr = getStateAbbreviation(c.state || '')
						.trim()
						.toUpperCase();
					if (contactStateAbbr && contactStateAbbr !== searchedStateAbbrForMap) {
						nextExtraIds.push(id);
					}
				}

				for (const c of acceptedExtraContacts) nextExtraIds.push(c.id);

				if (nextExtraIds.length > 0) {
					setMapPanelExtraContactIds((prev) => {
						const next = new Set(prev);
						for (const id of nextExtraIds) next.add(id);
						return Array.from(next);
					});
				}
			}

			setActiveMapTool('grab');
		},
		[
			selectedContacts,
			contacts,
			baseContactIdSet,
			searchedStateAbbrForMap,
			setSelectedContacts,
		]
	);

	const handleMapMarkerClick = useCallback(
		(contact: ContactWithName) => {
			const isInBaseResults = baseContactIdSet.has(contact.id);
			if (!isInBaseResults) {
				setMapPanelExtraContacts((prev) =>
					prev.some((c) => c.id === contact.id) ? prev : [contact, ...prev]
				);
				setMapPanelExtraContactIds((prev) =>
					prev.includes(contact.id) ? prev : [...prev, contact.id]
				);
				return;
			}

			if (!searchedStateAbbrForMap) return;
			const contactStateAbbr = getStateAbbreviation(contact.state || '')
				.trim()
				.toUpperCase();
			if (contactStateAbbr === searchedStateAbbrForMap) return;
			setMapPanelExtraContactIds((prev) =>
				prev.includes(contact.id) ? prev : [...prev, contact.id]
			);
		},
		[baseContactIdSet, searchedStateAbbrForMap]
	);

	const handleMapToggleSelection = useCallback(
		(contactId: number) => {
			const wasSelected = selectedContacts.includes(contactId);
			if (!wasSelected && selectedContacts.length >= DASHBOARD_SEARCH_SELECTION_LIMIT) return;

			if (!wasSelected) {
				const fromBase = (contacts || []).find((c) => c.id === contactId);
				const fromOverlay = mapPanelVisibleOverlayContacts.find(
					(c) => c.id === contactId
				);
				const fromExtra = mapPanelExtraContacts.find((c) => c.id === contactId);
				const selectedContact = fromBase ?? fromOverlay ?? fromExtra;
				if (selectedContact) {
					setMapPanelExtraContacts((prev) =>
						prev.some((c) => c.id === contactId) ? prev : [selectedContact, ...prev]
					);
				}
			}

			setSelectedContacts((prev) => {
				if (prev.includes(contactId)) {
					return prev.filter((id) => id !== contactId);
				}
				return mergeContactIdsWithSelectionLimit(prev, [contactId]);
			});

			const tryScroll = (attempt = 0) => {
				const contactElement = document.querySelector(`[data-contact-id="${contactId}"]`);
				if (contactElement) {
					contactElement.scrollIntoView({
						behavior: 'smooth',
						block: 'center',
					});
					return;
				}
				if (attempt < 10) {
					setTimeout(() => tryScroll(attempt + 1), 50);
				}
			};
			setTimeout(() => tryScroll(0), 0);
		},
		[
			selectedContacts,
			contacts,
			mapPanelVisibleOverlayContacts,
			mapPanelExtraContacts,
			setSelectedContacts,
		]
	);

	// Selecting a contact from the right-hand results panel. Mirrors the map-marker
	// selection path (handleMapToggleSelection) so the map renders the same selected
	// halo: the full contact object is pinned into mapPanelExtraContacts, which feeds
	// selectedContactObjectsForMap (the map's coordinate fallback for the halo). Without
	// this pin, overlay/out-of-state contacts that aren't in the base results have no
	// coordinate source on the map side, so they render as a bare result dot instead of
	// the selected halo. Unlike the marker path, it does not auto-scroll the panel (the
	// clicked row is already in view).
	const handleMapPanelRowSelect = useCallback(
		(
			contact: ContactWithName,
			event: ReactMouseEvent<HTMLDivElement> | undefined,
			source: 'selection' | 'search-results'
		) => {
			const currentSearchIndex = mapPanelUnselectedContactsFiltered.findIndex(
				(c) => c.id === contact.id
			);

			if (
				source === 'search-results' &&
				event?.shiftKey &&
				mapPanelShiftClickAnchor &&
				currentSearchIndex !== -1
			) {
				event.preventDefault();
				window.getSelection()?.removeAllRanges();

				const anchorVisualIndex = Math.max(
					0,
					Math.min(mapPanelShiftClickAnchor.index, mapPanelUnselectedContactsFiltered.length)
				);
				const currentVisualIndex =
					currentSearchIndex >= anchorVisualIndex
						? currentSearchIndex + 1
						: currentSearchIndex;
				const start = Math.min(anchorVisualIndex, currentVisualIndex);
				const end = Math.max(anchorVisualIndex, currentVisualIndex);
				const rangeContactIds = new Set<number>([mapPanelShiftClickAnchor.contactId]);
				const contactsToPin: ContactWithName[] = [];
				const anchorContact = displayedMapPanelContacts.find(
					(c) => c.id === mapPanelShiftClickAnchor.contactId
				);

				if (anchorContact) {
					contactsToPin.push(anchorContact);
				}

				mapPanelUnselectedContactsFiltered.forEach((resultContact, index) => {
					const visualIndex = index >= anchorVisualIndex ? index + 1 : index;
					if (visualIndex < start || visualIndex > end) return;
					rangeContactIds.add(resultContact.id);
					contactsToPin.push(resultContact);
				});

				const acceptedRangeContactIds = getSelectionLimitedContactIds(
					selectedContacts,
					Array.from(rangeContactIds)
				);
				const acceptedRangeContactIdSet = new Set(acceptedRangeContactIds);
				const acceptedContactsToPin = contactsToPin.filter((contact) =>
					acceptedRangeContactIdSet.has(contact.id)
				);

				if (acceptedContactsToPin.length > 0) {
					setMapPanelExtraContacts((prev) => {
						const existing = new Set(prev.map((c) => c.id));
						const toAdd = acceptedContactsToPin.filter((c) => !existing.has(c.id));
						return toAdd.length > 0 ? [...toAdd, ...prev] : prev;
					});
				}

				setSelectedContacts((prev) => {
					return mergeContactIdsWithSelectionLimit(prev, Array.from(rangeContactIds));
				});
				setMapPanelShiftClickAnchor(null);
				return;
			}

			if (source === 'search-results' && currentSearchIndex !== -1) {
				setMapPanelShiftClickAnchor({
					contactId: contact.id,
					index: currentSearchIndex,
				});
			} else {
				setMapPanelShiftClickAnchor(null);
			}

			if (
				!selectedContacts.includes(contact.id) &&
				selectedContacts.length >= DASHBOARD_SEARCH_SELECTION_LIMIT
			) {
				return;
			}

			if (!selectedContacts.includes(contact.id)) {
				setMapPanelExtraContacts((prev) =>
					prev.some((c) => c.id === contact.id) ? prev : [contact, ...prev]
				);
			}
			setSelectedContacts((prev) =>
				prev.includes(contact.id)
					? prev.filter((id) => id !== contact.id)
					: mergeContactIdsWithSelectionLimit(prev, [contact.id])
			);
		},
		[
			displayedMapPanelContacts,
			mapPanelShiftClickAnchor,
			mapPanelUnselectedContactsFiltered,
			selectedContacts,
			setSelectedContacts,
		]
	);
	const handleMobileMapPanelRowSelect = useCallback(
		(contact: ContactWithName) => {
			handleMapPanelRowSelect(contact, undefined, 'selection');
		},
		[handleMapPanelRowSelect]
	);

	const activeRadiusSearchOverlay = useMemo<
		NonNullable<SearchResultsMapProps['radiusOverlay']> | null
	>(() => {
		// Typed radius search (free-text strict-radius): the circle comes from the
		// committed free-text args.
		if (
			lastFreeTextArgs?.strictRadius &&
			lastFreeTextArgs.radiusKm != null &&
			lastFreeTextArgs.lat != null &&
			lastFreeTextArgs.lon != null
		) {
			return {
				center: { lat: lastFreeTextArgs.lat, lng: lastFreeTextArgs.lon },
				radiusMiles: lastFreeTextArgs.radiusKm / MILES_TO_KM,
			};
		}

		// Empty-box radius search (curated radius): runRadiusCuratedForYou is the only
		// curated path that commits a hard radiusKm alongside an explicit center, so a
		// non-null radiusKm + coords reliably identifies it. Draw the same circle/pin
		// so an empty Radius submit reads exactly like a typed one.
		if (
			lastCuratedArgs?.radiusKm != null &&
			lastCuratedArgs.lat != null &&
			lastCuratedArgs.lon != null
		) {
			return {
				center: { lat: lastCuratedArgs.lat, lng: lastCuratedArgs.lon },
				radiusMiles: lastCuratedArgs.radiusKm / MILES_TO_KM,
			};
		}

		return null;
	}, [lastFreeTextArgs, lastCuratedArgs]);

	// A curated/"For You" blob search is the active geometry when engaged and the search drew a
	// blob — the radius circle (typed strict-radius OR curated-radius For You) or the organic
	// curated For-You blob — and it's NOT a bbox "Search this area" rectangle. This is the scope
	// gate for letting the lightweight ambient overlay render outside the blob and swapping the
	// empty-map prompt for the perimeter-only "Disengage search" affordance. State-lock and bbox
	// searches are intentionally excluded (they keep the full-marker UI + "Click to see all
	// contacts"). The map ANDs this with its own `hasCuratedBlobOutline`, so if a curated search
	// ever drew a non-blob footprint the new mode stays inert.
	const curatedBlobSearchActive =
		isMapSearchEngaged &&
		!mapBboxFilter &&
		(activeRadiusSearchOverlay != null || isForYouCuratedSearch);
	// A category search scoped to a US state (e.g. "Wine, Beer, and Spirits in
	// Pennsylvania") is the active geometry when engaged and the map drew the locked-state
	// outline. This is the scope gate that lets the lightweight ambient overlay render
	// OUTSIDE the state polygon and swaps the empty-map prompt for the perimeter-only
	// "Disengage search" affordance — the same treatment the curated blob gets.
	// `shouldEnableMapStateCategorySelection` already requires a real category query, a valid
	// state, and excludes bbox/curated searches; the map ANDs this with its own
	// `hasLockedStateOutline` so it stays inert until the state polygon is actually drawn.
	const stateCategorySearchActive =
		isMapSearchEngaged &&
		shouldEnableMapStateCategorySelection &&
		Boolean(lockedStateNameForMap);
	const canUseAmbientContactsOverlay =
		isMapView && hasSearched && activeSearchQuery.trim().length > 0;
	const shouldShowAmbientContactsOnMap = canUseAmbientContactsOverlay;
	const shouldPreloadAmbientContactsOnMap = false;

	// Compressed chrome: the bottom sheet covers the lower half of the viewport, so
	// camera fits must land markers in the visible top-half strip. Values are real px —
	// the map canvas counter-zooms the dashboard zoom var, and viewportHeight is real px.
	// Desktop only: phones satisfy the width check too but render the mobile chrome,
	// which has no bottom sheet.
	const compressedMapChromePadding = useMemo(
		() =>
			isMapView &&
			isMobile === false &&
			isCompressedMapChrome &&
			shouldShowMapResultsSidePanel
				? {
						top: 120,
						right: 40,
						bottom: Math.round(viewportHeight / 2) + 24,
						left: 40,
					}
				: undefined,
		[
			isMapView,
			isMobile,
			isCompressedMapChrome,
			shouldShowMapResultsSidePanel,
			viewportHeight,
		]
	);
	const optimisticSearchToCampaignCameraPadding = useMemo<
		| { top: number; right: number; bottom: number; left: number }
		| undefined
	>(() => {
		if (!optimisticSearchToCampaignTab) return undefined;
		if (!isMapView || isMobile !== false) return undefined;
		if (optimisticSearchToCampaignTab === 'all') return undefined;

		// Match the campaign page's compact-tab map framing ahead of navigation. The
		// destination will recompute the exact same idea after mount; this optimistic
		// value exists only so the map begins moving on the click frame instead of after
		// the campaign route/data are ready.
		const CAMPAIGN_OPTIMISTIC_ZOOM = 0.85;
		const CAMPAIGN_COMPACT_WORKSPACE_BACKDROP_WIDTH_PX = 985;
		const CAMPAIGN_CENTERED_STAGE_COMPACT_MAX_LAYOUT_W_PX = 1317;
		const CAMERA_PADDING_BACKOFF_PX = 550;
		// Use the dashboard's layout-tracked viewport width instead of reaching for an
		// undeclared/global value during render. The window fallback only covers the
		// first pre-resize commit in the browser.
		const viewportW =
			viewportWidth || (typeof window !== 'undefined' ? window.innerWidth : 0);

		if (!viewportW) return undefined;
		const layoutViewportW = viewportW / CAMPAIGN_OPTIMISTIC_ZOOM;
		if (layoutViewportW < CAMPAIGN_CENTERED_STAGE_COMPACT_MAX_LAYOUT_W_PX) {
			return { top: 0, right: 0, bottom: 0, left: 0 };
		}

		const backdropStartCss = Math.max(
			0,
			layoutViewportW - CAMPAIGN_COMPACT_WORKSPACE_BACKDROP_WIDTH_PX
		);
		const backdropStartPx = backdropStartCss * CAMPAIGN_OPTIMISTIC_ZOOM;
		const uiCoveredRightPx = viewportW - backdropStartPx;
		const rightPaddingPx = Math.max(
			0,
			Math.round(uiCoveredRightPx - CAMERA_PADDING_BACKOFF_PX)
		);

		return { top: 0, right: rightPaddingPx, bottom: 0, left: 0 };
	}, [isMapView, isMobile, optimisticSearchToCampaignTab, viewportWidth]);

	const persistentMapProps = useMemo<SearchResultsMapProps>(
		() => ({
			weatherMood: globeWeatherMood,
			weatherRegionCenter: globeWeatherRegionCenter,
			weatherTemperatureF: globeWeatherTemperatureF,
			nightLighting: globeNightLighting,
			presentation: mapPresentation,
			// Street view is a desktop-only affordance; never engage it under the
			// mobile pick-flow chrome.
			streetViewEnabled: isMapView && isMobile === false,
			// Mobile pick flow: keep camera fits clear of the fixed chrome (campaign
			// header on top, search bar at the bottom) — same insets the in-campaign
			// mobile map used.
			cameraPadding:
				optimisticSearchToCampaignCameraPadding ??
				(isMobile === true && isAddToCampaignMode
					? { top: 170, right: 30, bottom: 120, left: 30 }
					: compressedMapChromePadding),
			autoFitPadding:
				optimisticSearchToCampaignCameraPadding ??
				(isMobile === true && isAddToCampaignMode
					? { top: 170, right: 30, bottom: 120, left: 30 }
					: compressedMapChromePadding),
			autoSpin: shouldSpinBackgroundMap,
			contacts: shouldShowSearchGeometryOnMap ? contactsForMap : [],
			selectedContacts:
				shouldShowSearchGeometryOnMap || shouldShowAmbientContactsOnMap
					? selectedContacts
					: [],
			selectedContactObjects:
				shouldShowSearchGeometryOnMap || shouldShowAmbientContactsOnMap
					? selectedContactObjectsForMap
					: [],
			externallyHoveredContactId: shouldShowSearchGeometryOnMap
				? hoveredMapPanelContactId
				: null,
			searchQuery: shouldShowSearchGeometryOnMap ? activeSearchQuery : '',
			searchWhat: shouldShowSearchGeometryOnMap ? searchWhatForMap : null,
			searchEngaged: shouldShowSearchGeometryOnMap,
			lightweightSearchOverlayEnabled: isMapView,
			curatedBlobSearchActive: isMapView && curatedBlobSearchActive,
			stateCategorySearchActive: isMapView && stateCategorySearchActive,
			dashboardDraftingContactStatusById: isMapView
				? dashboardDraftingMapStatusByContactId
				: undefined,
			campaignFootprintContacts: shouldLoadDashboardMapCampaignFootprint
				? (dashboardMapCampaignFootprintContacts ?? [])
				: [],
			ambientContactsEnabled: shouldShowAmbientContactsOnMap,
			ambientContactsPreloadEnabled: shouldPreloadAmbientContactsOnMap,
			ambientActiveCategories: mapGrabActiveCategories,
			ambientUncategorizedActive: mapGrabUncategorizedActive,
			autoFitRequestNonce: mapSearchAutoFitRequestNonce,
			instantAutoFitNonce: instantTabFitNonce,
			emptyMapClickPrompt:
				canDisengageMapSearch && isMapSearchEngaged
					? curatedBlobSearchActive || stateCategorySearchActive
						? 'Disengage search'
						: 'Click to see all contacts'
					: null,
			onEmptyMapClick:
				canDisengageMapSearch && isMapSearchEngaged ? handleEmptyMapClick : undefined,
			disableDotWaveReveal: isMapView,
			selectAllInViewNonce: isMapView ? selectAllInViewNonce : undefined,
			onVisibleOverlayContactsChange: isMapView
				? handleMapVisibleOverlayContactsChange
				: undefined,
			onOverlayBusyChange: handleMapOverlayBusyChange,
			activeTool: isMapView ? activeMapTool : undefined,
			requestedZoom: isMapView ? mapZoomControlRequest : null,
			selectedAreaBounds: selectedAreaBoundsForMap,
			onViewportInteraction: isMapView ? handleMapViewportInteraction : undefined,
			onViewportZoom: isMapView ? handleMapViewportZoom : undefined,
			onViewportIdle: isMapView ? handleMapViewportIdle : undefined,
			// Ungated by isMapView (informational): the slider ladder is already
			// rebased before the user enters map view.
			onInteractiveMinZoomChange: handleInteractiveMinZoomChange,
			onAreaSelect: isMapView ? handleMapAreaSelect : undefined,
			onMarkerHover: isMapView ? handleMapMarkerHover : undefined,
			lockedStateName: lockedStateNameForMap,
			skipAutoFit: skipAutoFitForMap,
			enableStateInteractions: shouldEnableMapStateCategorySelection,
			onStateSelect: shouldEnableMapStateCategorySelection
				? handleMapStateSelect
				: undefined,
			isLoading: isSearchPending || isLoadingContacts || isRefetchingContacts,
			onMarkerClick: isMapView ? handleMapMarkerClick : undefined,
			onToggleSelection: isMapView ? handleMapToggleSelection : undefined,
			onAddSelectionToFolder: isMapView
				? handleAddSelectedToContextFolder
				: undefined,
			onWriteSelectionMessage: isMapView ? handleWriteSelectionMessage : undefined,
			// Drive circle-vs-blob from the active result set, not the bottom
			// radius toggle. Toggling the icon off only affects the next search.
			radiusOverlay: activeRadiusSearchOverlay,
			suppressContextualContactOverlays: isPendingRadiusSearchOnMap,
			onRadiusCenterChange: handleRadiusCenterChange,
			// Venue-posted opportunity markers only on the interactive map, not the globe.
			events: isMapView && mapGrabEventsActive ? eventsForMap : [],
			suppressEventPopups: applyModalOpen,
			// Reserve the right-side search-results panel's footprint (433px box at
			// right:10px, scaled, origin top-right) so the event popup places to the right of
			// a marker only when it clears the panel, and flips left otherwise.
			rightSafeAreaPx:
				isMapView && !isCompressedMapChrome && shouldShowMapResultsSidePanel
					? MAP_VIEW_RIGHT_PANEL_EDGE_PX
					: 0,
			renderEventPopupContent: isMapView ? renderEventPopupContent : undefined,
		}),
		[
			activeMapTool,
			applyModalOpen,
			activeRadiusSearchOverlay,
			activeSearchQuery,
			eventsForMap,
			renderEventPopupContent,
			canDisengageMapSearch,
			compressedMapChromePadding,
			contactsForMap,
			dashboardMapCampaignFootprintContacts,
			dashboardDraftingMapStatusByContactId,
			handleRadiusCenterChange,
			globeNightLighting,
			globeWeatherMood,
			globeWeatherRegionCenter,
			globeWeatherTemperatureF,
			handleAddSelectedToContextFolder,
			handleWriteSelectionMessage,
			handleMapAreaSelect,
			handleEmptyMapClick,
			handleMapMarkerClick,
			handleMapMarkerHover,
			handleMapStateSelect,
			handleMapToggleSelection,
			handleMapViewportIdle,
			handleMapViewportInteraction,
			handleMapViewportZoom,
			handleMapOverlayBusyChange,
			handleInteractiveMinZoomChange,
			handleMapVisibleOverlayContactsChange,
			hoveredMapPanelContactId,
			instantTabFitNonce,
			isAddToCampaignMode,
			isMapSearchEngaged,
			isLoadingContacts,
			isMapView,
			isMobile,
			isCompressedMapChrome,
			isPendingRadiusSearchOnMap,
			isRefetchingContacts,
			isSearchPending,
			lockedStateNameForMap,
			mapGrabActiveCategories,
			mapGrabEventsActive,
			mapGrabUncategorizedActive,
			mapSearchAutoFitRequestNonce,
			mapPresentation,
			MAP_VIEW_RIGHT_PANEL_EDGE_PX,
			mapZoomControlRequest,
			optimisticSearchToCampaignCameraPadding,
			searchWhatForMap,
			selectedAreaBoundsForMap,
			selectedContacts,
			selectedContactObjectsForMap,
			selectAllInViewNonce,
			shouldEnableMapStateCategorySelection,
			shouldShowMapResultsSidePanel,
			shouldShowSearchGeometryOnMap,
			shouldShowAmbientContactsOnMap,
			curatedBlobSearchActive,
			stateCategorySearchActive,
			shouldLoadDashboardMapCampaignFootprint,
			shouldPreloadAmbientContactsOnMap,
			shouldSpinBackgroundMap,
			skipAutoFitForMap,
		]
	);

	const persistentMapConfig = useMemo<PersistentDashboardMapConfig>(
		() => ({
			ownerRoute: 'dashboard',
			isMapView,
			mapViewClip,
			mapViewFrameTransition,
			mapViewFrameInsetPx: MAP_VIEW_FRAME_INSET_PX,
			mapViewFrameRadiusPx: MAP_VIEW_FRAME_RADIUS_PX,
			mapViewFrameBorderPx: MAP_VIEW_FRAME_BORDER_PX,
			mapProps: persistentMapProps,
		}),
		[isMapView, mapViewClip, mapViewFrameTransition, persistentMapProps]
	);

	useLayoutEffect(() => {
		setPersistentMapConfig(persistentMapConfig);
	}, [persistentMapConfig, setPersistentMapConfig]);

	// Clear the shared map config when the dashboard unmounts so the next route never
	// inherits the dashboard's live search props (search markers + constellation lines).
	// The campaign page and venue portal already do this; without the symmetric cleanup
	// here the stale dashboard config could keep painting the search overlay after
	// navigating away (e.g. search → campaign).
	useLayoutEffect(() => {
		return () => {
			setPersistentMapConfig(null);
		};
	}, [setPersistentMapConfig]);

	// The posted-event card is laid out at a fixed 420×121 design size, but in the
	// desktop results column it must match the result-row width. We measure the
	// available width: narrower columns scale the whole card down proportionally
	// (keeping its aspect ratio instead of overflowing to the right), while wider
	// columns stretch the card to the full row width like the contact rows.
	// NOTE: these hooks must stay above the early `isMobile` returns below —
	// React requires the same hook order on every render.
	const [postedEventCardScale, setPostedEventCardScale] = useState(1);
	const [postedEventCardStretch, setPostedEventCardStretch] = useState(false);
	// Whether the >1-opportunity deck is spread into a vertical list. No reset
	// effect: rendering branches on the live panelPostedEvents.length, so a stale
	// `true` is moot once the deck shrinks to 0/1 cards.
	const [arePostedEventsExpanded, setArePostedEventsExpanded] = useState(false);
	const postedEventCardResizeObserverRef = useRef<ResizeObserver | null>(null);
	const measurePostedEventCard = useCallback((node: HTMLDivElement | null) => {
		postedEventCardResizeObserverRef.current?.disconnect();
		postedEventCardResizeObserverRef.current = null;
		if (!node) return;
		const update = () => {
			const width = node.clientWidth;
			if (width > 0) {
				setPostedEventCardScale(Math.min(1, width / MAP_POSTED_EVENT_CARD_WIDTH_PX));
				setPostedEventCardStretch(width >= MAP_POSTED_EVENT_CARD_WIDTH_PX);
			}
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(node);
		postedEventCardResizeObserverRef.current = observer;
	}, []);

	const mapPortal = null;

	// Return null during initial load to prevent hydration mismatch
	if (isMobile === null) {
		// The boot backdrop here is the SSR/first-paint output — it keeps the page dark
		// before the device branch resolves (mobile sees at most a brief dark frame).
		return (
			<div className="min-h-screen w-full">
				{mapPortal}
				{bootPhase !== 'done' && (
					<DashboardBootBackdrop fading={bootPhase === 'fading'} />
				)}
			</div>
		);
	}

	// Mobile dashboard: tabbed app frame over the persistent map (folders /
	// calendar / inbox, switched by the white tab bar). While campaigns load the
	// frame renders normally (MobileFolderCards shows its own wave skeletons).
	// Zero-campaign accounts never see the empty frame: the auto-entry effect
	// creates their starter campaign and replaces the URL into the For You
	// pick-flow search.
	if (isMobile) {
		// Pick flow (add contacts to a campaign): the search chrome renders over the
		// persistent map, driven by the same search machinery as desktop. Gated on the
		// URL params alone so the chrome is already up while the entry search is still
		// fetching.
		if (isAddToCampaignMode) {
			// Plain wrapper (no min-h-screen): the overlay is fixed and in-flow
			// viewport-unit height creates Safari scroll slack under the root zoom.
			return (
				<div className="w-full">
					{mapPortal}
					<MobileDashboardSearch
						campaignName={dashboardSearchCampaign?.name || 'Untitled Campaign'}
						headerContacts={dashboardMapHeaderContacts ?? []}
						contactsCount={dashboardMapHeaderContactsCount}
						draftCount={dashboardMapHeaderDraftCount}
						sentCount={dashboardMapHeaderSentCount}
						newMessageCount={mobileSearchNewMessageCount}
						onOpenCampaignSummary={(section) => {
							beginCampaignHandoffLatch();
							router.push(
								`${urls.murmur.campaign.detail(mapCampaignId)}?origin=search&summarySection=${section}${campaignReturnAddedSuffix()}`
							);
						}}
						queryPillLabel={
							canDisengageMapSearch && isMapSearchEngaged
								? mapTopSearchDisplay.label
								: null
						}
						onClearQuery={handleEmptyMapClick}
						listContacts={displayedMapPanelContacts}
						selectedContactIds={selectedContacts}
						onToggleContact={handleMobileMapPanelRowSelect}
						isLoading={isMapResultsLoading}
						hasNoResults={hasNoSearchResults}
						hasSearched={hasSearched}
						searchValue={mapBottomSearchValue}
						onSearchValueChange={handleMapBottomSearchValueChange}
						onSubmitSearch={handleMapBottomSearchSubmit}
						canAddSelected={selectedContacts.length > 0}
						onAddSelected={handleAddSelectedToCampaign}
						isAddPending={isPendingAddToCampaign}
					/>
				</div>
			);
		}

		// In-flow column sized to `viewport-h / zoom`, NOT `position: fixed; inset: 0`.
		// Under the root `html.murmur-compact { zoom: 0.9 }`, a fixed element with no
		// counter-zoom hits WebKit's fixed+ancestor-zoom containing-block bug: on real
		// iOS (Safari AND Chrome — both WebKit) the frame collapses to nothing and only
		// the map-water html background paints (the "blue screen"). Blink (desktop
		// Chrome / its device emulation) resolves fixed against the true viewport, so it
		// looked fine there. An in-flow element is geometry-true under the zoom in both
		// engines; dividing the JS-measured viewport height by the zoom makes it fill the
		// viewport exactly with no white/blue band (the `--murmur-dashboard-viewport-h`
		// var is published on mobile by the zoom effect above; 100dvh is the first-paint
		// fallback). The sibling pick-flow overlay stays fixed because it counter-zooms
		// via `.mobile-campaign-search-overlay`.
		return (
			<div
				className="w-full flex flex-col overflow-hidden"
				style={{
					height:
						'calc(var(--murmur-dashboard-viewport-h, 100dvh) / var(--murmur-dashboard-zoom, 0.9))',
				}}
			>
				{mapPortal}

				{/* Loading-progress % during the cold map load. Mobile has no boot splash,
				    so this is the only loading UI here; keyed to the raw land-ready signal
				    (bootPhase is force-'done' on mobile) and self-dismisses via its own cap. */}
				<DashboardBootProgress
					enabled={true}
					done={isPersistentMapFirstPainted}
					isMobile={true}
					fadeMs={DASHBOARD_BOOT_FADE_MS}
					maxWaitMs={DASHBOARD_BOOT_MAX_WAIT_MS}
				/>

				{/* Logo row — left-aligned over the map; the Clerk avatar stays fixed top-right */}
				<div
					className="flex items-center justify-start"
					style={{ padding: '14px 0 10px 20px', flexShrink: 0 }}
				>
					<MurmurLogoNew width={logoWidth} height={logoHeight} />
				</div>

				<MobileDashboardTabBar
					activeTab={mobileActiveTab}
					onTabChange={setMobileActiveTab}
					onSearchClick={
						activeCampaignId != null
							? () => {
									try {
										sessionStorage.removeItem('murmur_pending_search');
									} catch {
										// sessionStorage may be unavailable — navigation can still proceed.
									}
									// Same-route param push (no remount): the pick-mode exit effect
									// resets the rehydration one-shot so this entry always runs a
									// fresh For You curated search. Params are built fresh — never
									// from searchParams — so no stale curated keys leak in.
									router.push(
										`${urls.murmur.dashboard.index}?fromCampaignId=${activeCampaignId}&pick=1&instant=1`
									);
								}
							: undefined
					}
				/>

				<div className="flex-1 min-h-0 w-full" style={{ overflow: 'hidden' }}>
					{mobileActiveTab === 'folders' && <MobileFolderCards className="h-full" />}
					{mobileActiveTab === 'calendar' && (
						<MobileDashboardCalendar
							persistEvents={isSignedIn === true}
							showTodayReturnButton
						/>
					)}
					{mobileActiveTab === 'inbox' && (
						<DashboardResponsesWidget
							mobile
							enabled={isSignedIn === true}
							mockState={responsesMockState}
						/>
					)}
				</div>
			</div>
		);
	}

	// Reduce extra white space above the fixed mobile action button by
	// only adding bottom padding when needed and using a smaller value on mobile
	const isInitialDashboardLanding =
		isMobile === false &&
		!hasSearched &&
		activeTab === 'search' &&
		!fromHomeParam &&
		!isMapView;
	const bottomPadding = isInitialDashboardLanding
		? 'pb-0'
		: isMobile && hasSearched
			? 'pb-[64px]'
			: 'pb-0 md:pb-[100px]';
	// For You preview bar is hover-driven. Suppressed while the search bar is being
	// typed in, so an accidental tile hover never unmounts the user's active input.
	const isMapBottomForYouMode =
		mapBottomSearchFollowupPreview === 'for-you' && !isMapBottomSearchActive;
	const mapBottomSearchShellWidth = isMapBottomCategoryMode
		? MAP_RESULTS_BOTTOM_CATEGORY_SEARCH_BOX.width
		: isMapBottomForYouMode
			? // Match the idle width (474, not the 472 activeWidth) so the hover-driven
				// For You preview doesn't nudge the bar/tiles sideways by 2px.
				MAP_RESULTS_BOTTOM_SEARCH_BOX.width
			: isMapBottomSearchExpanded
				? MAP_RESULTS_BOTTOM_SEARCH_BOX.activeWidth
				: MAP_RESULTS_BOTTOM_SEARCH_BOX.width;
	const mapBottomSearchShellHeight = isMapBottomCategoryMode
		? MAP_RESULTS_BOTTOM_CATEGORY_SEARCH_BOX.height
		: isMapBottomForYouMode
			? MAP_RESULTS_BOTTOM_SEARCH_BOX.activeHeight
			: isMapBottomSearchExpanded
				? mapBottomSearchActiveHeight
				: MAP_RESULTS_BOTTOM_SEARCH_BOX.height;
	const activeMapBottomCategoryField =
		isMapBottomCategoryMode &&
		isMapBottomCategoryDropdownActive &&
		(activeSection === 'what' || activeSection === 'where')
			? activeSection
			: null;
	const shouldShowMapBottomKeywordBadge =
		isKeywordModeEnabled && !isMapBottomCategoryMode && !isMapBottomForYouMode;

	// Mirrors the keyword badge. Hidden in keyword mode (where Profile is a no-op)
	// so the two single-slot badges never overlap.
	const shouldShowMapBottomProfileBadge =
		isProfileModeEnabled &&
		!isKeywordModeEnabled &&
		!isMapBottomCategoryMode &&
		!isMapBottomForYouMode;

	const updateMapPanelHoverResearchTop = (rowElement: HTMLElement) => {
		const rawDashboardZoom = window
			.getComputedStyle(document.documentElement)
			.getPropertyValue(DASHBOARD_ZOOM_VAR)
			.trim();
		const dashboardZoom = Number.parseFloat(rawDashboardZoom) || DASHBOARD_MAP_ZOOM_DEFAULT;
		const rowRect = rowElement.getBoundingClientRect();
		const visualCardHeight =
			MAP_PANEL_HOVER_RESEARCH_CARD_HEIGHT_PX * MAP_VIEW_PANEL_SCALE * dashboardZoom;
		const minVisualTop = 12;
		const maxVisualTop = Math.max(
			minVisualTop,
			window.innerHeight - MAP_VIEW_SIDE_PANEL_BOTTOM_GAP_PX - visualCardHeight
		);
		setMapPanelHoverResearchTopPx(
			clampNumber(rowRect.top, minVisualTop, maxVisualTop) / dashboardZoom
		);
	};

	const cancelMapPanelHoverResearchClear = () => {
		if (!mapPanelHoverResearchClearTimeoutRef.current) return;
		clearTimeout(mapPanelHoverResearchClearTimeoutRef.current);
		mapPanelHoverResearchClearTimeoutRef.current = null;
	};

	const scheduleMapPanelHoverResearchClear = (contactId: number) => {
		if (isWebsitePreviewOpen) return;
		cancelMapPanelHoverResearchClear();
		mapPanelHoverResearchClearTimeoutRef.current = setTimeout(() => {
			mapPanelHoverResearchClearTimeoutRef.current = null;
			setHoveredMapPanelContactId((prev) => (prev === contactId ? null : prev));
			setMapPanelHoverResearchTopPx(null);
		}, MAP_PANEL_ABRIDGED_RESEARCH_CLEAR_DELAY_MS);
	};

	// Deck chrome shown on a posted-event card: total in-area opportunity count plus
	// the expand/collapse affordance. Null = plain card (single card, or rows 2..N
	// of the expanded list).
	type PostedEventDeckChrome = { deckCount: number; expanded: boolean };

	// The 420×121 design-px content of one posted-event card. Shared by the
	// standalone/expanded cards and the collapsed deck's front card, so the deck
	// face stays byte-identical to the plain card.
	const renderMapPostedEventCardBody = (
		event: MapEventData,
		chrome: PostedEventDeckChrome | null
	) => {
		const eventName = event.name.trim() || 'Posted Event';
		const eventDate = formatMapPostedEventDate(event);
		const venueName = event.venueName?.trim() || 'Venue TBA';
		const venueCity = event.venueCity?.trim() || '';
		const venueStateAbbr =
			getStateAbbreviation(event.venueState || '') ||
			event.venueState?.trim().toUpperCase() ||
			'';

		return (
			<>
				<div className="absolute left-[10px] right-[10px] top-[7px] bottom-[42px] min-w-0">
					<div className="grid h-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-[10px]">
						<div className="min-w-0">
							<div className="flex min-w-0 items-center gap-[5px]">
								<span className="relative flex-shrink-0">
									<MapStackStarIcon size={24} />
									{chrome && !chrome.expanded && (
										<span
											className="absolute flex items-center justify-center rounded-full font-inter text-[10px] font-bold leading-none"
											style={{
												top: '-5px',
												right: '-7px',
												minWidth: '15px',
												height: '15px',
												padding: '0 3px',
												backgroundColor: '#F8A6A6',
												color: '#8F2B2B',
											}}
										>
											{chrome.deckCount}
										</span>
									)}
								</span>
								{venueStateAbbr && (
									<span
										className="inline-flex h-[19px] w-[35px] flex-shrink-0 items-center justify-center rounded-[5.6px] border font-inter text-[12px] font-bold leading-none text-black"
										style={{
											backgroundColor: stateBadgeColorMap[venueStateAbbr] || '#FFF8DC',
											borderColor: '#000000',
										}}
									>
										{venueStateAbbr}
									</span>
								)}
								{venueCity && (
									<span className="truncate font-inter text-[12px] leading-none text-black">
										{venueCity}
									</span>
								)}
							</div>
							<div className="mt-[4px] truncate font-inter text-[16px] font-bold leading-[19px] text-black">
								{venueName}
							</div>
						</div>
						<div className="min-w-0 pt-[1px]">
							<div className="truncate font-inter text-[15px] font-medium leading-[18px] text-black">
								{eventName}
							</div>
							<div className="mt-[3px] inline-flex max-w-full truncate rounded-[4px] bg-[#D6F7FF] px-[4px] py-[1px] font-inter text-[14px] leading-[16px] text-black">
								{eventDate}
							</div>
						</div>
					</div>
				</div>
				<div
					aria-hidden="true"
					className="absolute left-0 right-0 bottom-[15px] h-[27px]"
					style={{ backgroundColor: '#FFD5D5' }}
				/>
				<div
					aria-hidden="true"
					className="absolute left-0 right-0 bottom-0 h-[15px]"
					style={{ backgroundColor: '#FF9595' }}
				/>
				<button
					type="button"
					aria-label={`Apply to ${eventName}`}
					className="absolute left-[34px] bottom-[15px] flex items-center justify-center font-inter text-[16px] font-medium leading-none text-black"
					style={{
						width: '78px',
						height: '27px',
						backgroundColor: '#E06D6D',
					}}
					onClick={(mouseEvent) => {
						mouseEvent.stopPropagation();
						setApplyModalEvent(event);
						setApplyModalOpen(true);
					}}
				>
					Apply
				</button>
				{chrome && (
					<button
						type="button"
						aria-expanded={chrome.expanded}
						aria-label={
							chrome.expanded
								? 'Collapse opportunities'
								: `Expand ${chrome.deckCount} opportunities`
						}
						className="absolute bottom-[5px] right-[9px] flex items-center gap-[5px]"
						onClick={(mouseEvent) => {
							// The collapsed deck's front card also toggles — don't double-fire.
							mouseEvent.stopPropagation();
							setArePostedEventsExpanded((prev) => !prev);
						}}
					>
						<span
							className="font-inter text-[11px] lowercase leading-none"
							style={{ color: '#6B7280' }}
						>
							{chrome.expanded ? 'collapse' : 'expand'}
						</span>
						<span
							className="flex h-[22px] w-[22px] items-center justify-center rounded-full font-inter text-[12px] font-bold leading-none text-white"
							style={{ backgroundColor: '#CE0202', border: '2px solid #FFFFFF' }}
						>
							{chrome.deckCount}
						</span>
					</button>
				)}
			</>
		);
	};

	// Outer wrapper fills the result-row width. In columns narrower than the
	// 420px design width it caps at that width, reserves the proportional
	// height via aspect-ratio, and scales the natively-laid-out 420×121 card
	// down to fit, so the whole card — text, badges, banners and button —
	// shrinks together instead of overflowing. In wider columns the card
	// stretches to the full row width (its layers are left/right-anchored)
	// so it lines up with the contact rows instead of floating centered.
	// `withMeasureRef` attaches the shared ResizeObserver — exactly ONE rendered
	// card (or the deck wrapper) carries it; the scale it produces is shared.
	const renderMapPostedEventCard = (
		event: MapEventData,
		chrome: PostedEventDeckChrome | null,
		withMeasureRef: boolean,
		animateAppear = false
	) => {
		return (
			<div
				key={`posted-event-${event.id}`}
				ref={withMeasureRef ? measurePostedEventCard : undefined}
				className={`mx-auto flex-shrink-0 overflow-hidden select-none${
					animateAppear ? ' map-overlay-appear' : ''
				}`}
				style={{
					width: '100%',
					maxWidth: postedEventCardStretch
						? undefined
						: `${MAP_POSTED_EVENT_CARD_WIDTH_PX}px`,
					// Match the inner card's rounding so the wrapper's own background
					// (which the results-cascade animation paints white) is clipped to
					// the rounded shape instead of bleeding into the corners.
					borderRadius: '8px',
					...(postedEventCardStretch
						? {}
						: {
								aspectRatio: `${MAP_POSTED_EVENT_CARD_WIDTH_PX} / ${MAP_POSTED_EVENT_CARD_HEIGHT_PX}`,
							}),
				}}
			>
				<div
					className="relative overflow-hidden"
					style={{
						width: postedEventCardStretch
							? '100%'
							: `${MAP_POSTED_EVENT_CARD_WIDTH_PX}px`,
						height: `${MAP_POSTED_EVENT_CARD_HEIGHT_PX}px`,
						transformOrigin: 'top left',
						transform: postedEventCardStretch
							? undefined
							: `scale(${postedEventCardScale})`,
						...MAP_POSTED_EVENT_CARD_SURFACE_STYLE,
					}}
				>
					{renderMapPostedEventCardBody(event, chrome)}
				</div>
			</div>
		);
	};

	// Collapsed deck: the front card (soonest event) at full size with up to
	// three card edges peeking above it. Everything lives inside the one scaled
	// 420-coordinate block, so the existing scale transform shrinks edges,
	// bubbles and badges together with the card.
	const renderMapPostedEventsDeck = (events: MapEventData[]) => {
		const [frontEvent] = events;
		const deckEdgeCount = Math.min(events.length - 1, MAP_POSTED_EVENT_DECK_MAX_EDGES);
		const deckPadPx = deckEdgeCount * MAP_POSTED_EVENT_DECK_EDGE_STEP_PX;
		const deckHeightPx = MAP_POSTED_EVENT_CARD_HEIGHT_PX + deckPadPx;
		return (
			<div
				key="posted-event-deck"
				ref={measurePostedEventCard}
				className="mx-auto flex-shrink-0 overflow-hidden select-none"
				style={{
					width: '100%',
					maxWidth: postedEventCardStretch
						? undefined
						: `${MAP_POSTED_EVENT_CARD_WIDTH_PX}px`,
					borderRadius: '8px',
					...(postedEventCardStretch
						? {}
						: {
								aspectRatio: `${MAP_POSTED_EVENT_CARD_WIDTH_PX} / ${deckHeightPx}`,
							}),
				}}
			>
				<div
					className="relative"
					style={{
						width: postedEventCardStretch
							? '100%'
							: `${MAP_POSTED_EVENT_CARD_WIDTH_PX}px`,
						height: `${deckHeightPx}px`,
						transformOrigin: 'top left',
						transform: postedEventCardStretch
							? undefined
							: `scale(${postedEventCardScale})`,
					}}
				>
					{/* Peeking card edges, back-most first — DOM order paints the stack. */}
					{Array.from({ length: deckEdgeCount }, (_, i) => {
						const depth = deckEdgeCount - i;
						return (
							<div
								key={`posted-event-deck-edge-${depth}`}
								aria-hidden="true"
								className="absolute"
								style={{
									top: `${deckPadPx - depth * MAP_POSTED_EVENT_DECK_EDGE_STEP_PX}px`,
									left: `${depth * MAP_POSTED_EVENT_DECK_EDGE_INSET_PX}px`,
									right: `${depth * MAP_POSTED_EVENT_DECK_EDGE_INSET_PX}px`,
									height: '24px',
									...MAP_POSTED_EVENT_CARD_SURFACE_STYLE,
								}}
							/>
						);
					})}
					{/* Front card — today's card face, clickable to spread the deck. The
					    Apply and expand buttons inside stopPropagation, so they keep
					    working without toggling. */}
					<div
						className="absolute left-0 right-0 cursor-pointer overflow-hidden"
						style={{
							top: `${deckPadPx}px`,
							height: `${MAP_POSTED_EVENT_CARD_HEIGHT_PX}px`,
							...MAP_POSTED_EVENT_CARD_SURFACE_STYLE,
						}}
						onClick={() => setArePostedEventsExpanded(true)}
					>
						{renderMapPostedEventCardBody(frontEvent, {
							deckCount: events.length,
							expanded: false,
						})}
					</div>
				</div>
			</div>
		);
	};

	// Posted-events section at the top of the Search Results rows: nothing when
	// no in-area unapplied opportunities, today's plain card for exactly one,
	// otherwise the stacked deck / expanded vertical list.
	const renderMapPostedEventsSection = () => {
		// Signed in: wait for the applications query so an already-applied card
		// never flashes and then vanishes (pending only before the first fetch
		// resolves; a failed query falls through to the unfiltered list).
		if (isSignedIn && isMyEventApplicationsPending) return null;
		const events = panelPostedEvents;
		if (events.length === 0) return null;
		if (events.length === 1) return renderMapPostedEventCard(events[0], null, true);
		if (!arePostedEventsExpanded) return renderMapPostedEventsDeck(events);
		return (
			<>
				{events.map((event, index) =>
					renderMapPostedEventCard(
						event,
						index === 0 ? { deckCount: events.length, expanded: true } : null,
						index === 0,
						true
					)
				)}
			</>
		);
	};

	// Renders one contact row in the map-view right-side panel (desktop variant).
	// Used by both the "Selection" and "Search Results" sub-panels — they differ
	// only in which slice of `displayedMapPanelContacts` they iterate over.
	const renderMapPanelDesktopRow = (
		contact: ContactWithName,
		source: 'selection' | 'search-results'
	) => {
		const isSelected = selectedContacts.includes(contact.id);
		const isHovered = hoveredMapPanelContactId === contact.id;
		const isInBaseResults = displayedBaseContactIdSet.has(contact.id);
		const firstName = contact.firstName || '';
		const lastName = contact.lastName || '';
		const fullName = contact.name || `${firstName} ${lastName}`.trim();
		const company = contact.company || '';
		const searchDerivedHeadline =
			displayedWhatValue && displayedWhereValue
				? `${displayedWhatValue} ${displayedWhereValue}`
				: displayedWhatValue || '';
		const isSpecialCategorySearch =
			/^restaurants?$/i.test(displayedWhatValue.trim()) ||
			/^coffee\s*shops?$/i.test(displayedWhatValue.trim());
		const curatedDisplayHeadline = contact.curatedDisplayLabel || '';
		const contactHeadline =
			curatedDisplayHeadline ||
			(isInBaseResults
				? contact.headline || contact.title || ''
				: contact.title || contact.headline || '');
		const computedHeadline = isInBaseResults
			? isSpecialCategorySearch
				? searchDerivedHeadline
				: contactHeadline || searchDerivedHeadline
			: contactHeadline;
		const stickyHeadline = selectedContactStickyHeadlineById[contact.id] || '';
		const headline = isSelected && stickyHeadline ? stickyHeadline : computedHeadline;
		const isRestaurantsSearchForContact = displayedIsRestaurantsSearch && isInBaseResults;
		const isCoffeeShopsSearchForContact = displayedIsCoffeeShopsSearch && isInBaseResults;
		const isMusicVenuesSearchForContact = displayedIsMusicVenuesSearch && isInBaseResults;
		const isMusicFestivalsSearchForContact =
			displayedIsMusicFestivalsSearch && isInBaseResults;
		const isWeddingPlannersSearchForContact =
			displayedIsWeddingPlannersSearch && isInBaseResults;
		const stateAbbr = getStateAbbreviation(contact.state || '') || '';
		const city = contact.city || '';
		const isWriteReviewRow =
			isWriteReviewActive || activeWriteReviewContactId != null;
		const isDashboardDraftingRow = dashboardDraftingStatus.isDrafting;
		const writeModeSelectedRowBackground = isDashboardDraftingRow
			? dashboardDraftingCompletedContactIdSet.has(contact.id)
				? '#FDDEA5'
				: contact.id === dashboardDraftingStatus.activeContactId
					? '#9AC3FF'
					: '#FD8E89'
			: isWriteReviewRow
			? contact.id === activeWriteReviewContactId
				? '#F8C262'
				: '#FDDEA5'
			: '#FD8E89';

		return (
			<div
				key={contact.id}
				data-contact-id={contact.id}
				className="cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-[3px] border-[#ABABAB] select-none relative"
				style={{
					border: isSelected && isWriteMode ? '2px solid #FFF' : undefined,
					backgroundColor: isSelected
						? isWriteMode
							? writeModeSelectedRowBackground
							: isRestaurantsSearchForContact || isRestaurantTitle(headline)
							? isHovered
								? '#C5F5D1'
								: '#D7FFE1'
							: isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline)
								? isHovered
									? '#DDF4CC'
									: '#EDFEDC'
								: isMusicVenuesSearchForContact || isMusicVenueTitle(headline)
									? isHovered
										? '#C5E8FF'
										: '#D7F0FF'
									: isMusicFestivalsSearchForContact || isMusicFestivalTitle(headline)
										? isHovered
											? '#ADD4FF'
											: '#BFDCFF'
										: isWeddingPlannersSearchForContact ||
											  isWeddingPlannerTitle(headline) ||
											  isWeddingVenueTitle(headline)
											? isHovered
												? '#F5EDCE'
												: '#FFF8DC'
											: isWineBeerSpiritsTitle(headline)
												? isHovered
													? '#C8CBFF'
													: '#DADDFF'
												: isHovered
													? '#BFE3FF'
													: '#C9EAFF'
						: isHovered
							? '#F3F4F6'
							: '#FFFFFF',
				}}
				onMouseDown={(event) => {
					if (source === 'search-results' && event.shiftKey) {
						event.preventDefault();
					}
				}}
				onClick={(event) => handleMapPanelRowSelect(contact, event, source)}
				onMouseEnter={(event) => {
					cancelMapPanelHoverResearchClear();
					if (isDashboardSendQueueResearchSuppressed) return;
					if (!canShowContactForWebsitePreview(contact.id)) return;
					setHoveredMapPanelContactId(contact.id);
					updateMapPanelHoverResearchTop(event.currentTarget);
				}}
				onMouseLeave={() => {
					if (isDashboardSendQueueResearchSuppressed) return;
					scheduleMapPanelHoverResearchClear(contact.id);
				}}
			>
				{fullName ? (
					<>
						<div className="pl-3 pr-1 flex items-center h-[23px]">
							<div className="font-bold text-[11px] w-full truncate leading-tight">
								{fullName}
							</div>
						</div>
						<div className="pr-2 pl-1 flex items-center h-[23px]">
							{headline ||
							isMusicVenuesSearchForContact ||
							isRestaurantsSearchForContact ||
							isCoffeeShopsSearchForContact ||
							isMusicFestivalsSearchForContact ||
							isWeddingPlannersSearchForContact ? (
								<div
									className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
									style={{
										backgroundColor:
											isRestaurantsSearchForContact || isRestaurantTitle(headline)
												? '#C3FBD1'
												: isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline)
													? '#D6F1BD'
													: isMusicVenuesSearchForContact || isMusicVenueTitle(headline)
														? '#B7E5FF'
														: isMusicFestivalsSearchForContact ||
															  isMusicFestivalTitle(headline)
															? '#C1D6FF'
															: isWeddingPlannersSearchForContact ||
																  isWeddingPlannerTitle(headline) ||
																  isWeddingVenueTitle(headline)
																? '#FFF8DC'
																: isWineBeerSpiritsTitle(headline)
																	? '#BFC4FF'
																	: '#E8EFFF',
									}}
								>
									{(isRestaurantsSearchForContact || isRestaurantTitle(headline)) && (
										<RestaurantsIcon size={12} className="flex-shrink-0" />
									)}
									{(isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline)) && (
										<CoffeeShopsIcon size={7} />
									)}
									{(isMusicVenuesSearchForContact || isMusicVenueTitle(headline)) && (
										<MusicVenuesIcon size={12} className="flex-shrink-0" />
									)}
									{(isMusicFestivalsSearchForContact ||
										isMusicFestivalTitle(headline)) && (
										<FestivalsIcon size={12} className="flex-shrink-0" />
									)}
									{(isWeddingPlannersSearchForContact ||
										isWeddingPlannerTitle(headline) ||
										isWeddingVenueTitle(headline)) && <WeddingPlannersIcon size={12} />}
									{isWineBeerSpiritsTitle(headline) && (
										<WineBeerSpiritsIcon size={12} className="flex-shrink-0" />
									)}
									<span className="text-[10px] text-black leading-none truncate">
										{isRestaurantsSearchForContact || isRestaurantTitle(headline)
											? 'Restaurant'
											: isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline)
												? 'Coffee Shop'
												: isMusicVenuesSearchForContact || isMusicVenueTitle(headline)
													? 'Music Venue'
													: isMusicFestivalsSearchForContact ||
														  isMusicFestivalTitle(headline)
														? 'Music Festival'
														: isWeddingVenueTitle(headline)
															? 'Wedding Venue'
															: isWeddingPlannersSearchForContact ||
																  isWeddingPlannerTitle(headline)
																? 'Wedding Planner'
																: isWineBeerSpiritsTitle(headline)
																	? getWineBeerSpiritsLabel(headline)
																	: headline}
									</span>
								</div>
							) : (
								<div className="w-full" />
							)}
						</div>
						<div className="pl-3 pr-1 flex items-center h-[22px]">
							<div className="text-[11px] text-black w-full truncate leading-tight">
								{company}
							</div>
						</div>
						<div className="pr-2 pl-1 flex items-center h-[22px]">
							{city || stateAbbr ? (
								<div className="flex items-center gap-1 w-full">
									{stateAbbr && (
										<span
											className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
											style={{
												backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
												borderColor: '#000000',
											}}
										>
											{stateAbbr}
										</span>
									)}
									{city && (
										<span className="text-[10px] text-black leading-none truncate">
											{city}
										</span>
									)}
								</div>
							) : (
								<div className="w-full" />
							)}
						</div>
					</>
				) : (
					<>
						<div className="row-span-2 pl-3 pr-1 flex items-center h-full">
							<div className="font-bold text-[11px] w-full truncate leading-tight">
								{company || '—'}
							</div>
						</div>
						<div className="pr-2 pl-1 flex items-center h-[23px]">
							{headline ||
							isMusicVenuesSearchForContact ||
							isRestaurantsSearchForContact ||
							isCoffeeShopsSearchForContact ||
							isMusicFestivalsSearchForContact ||
							isWeddingPlannersSearchForContact ? (
								<div
									className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
									style={{
										backgroundColor:
											isRestaurantsSearchForContact || isRestaurantTitle(headline)
												? '#C3FBD1'
												: isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline)
													? '#D6F1BD'
													: isMusicVenuesSearchForContact || isMusicVenueTitle(headline)
														? '#B7E5FF'
														: isMusicFestivalsSearchForContact ||
															  isMusicFestivalTitle(headline)
															? '#C1D6FF'
															: isWeddingPlannersSearchForContact ||
																  isWeddingPlannerTitle(headline) ||
																  isWeddingVenueTitle(headline)
																? '#FFF8DC'
																: isWineBeerSpiritsTitle(headline)
																	? '#BFC4FF'
																	: '#E8EFFF',
									}}
								>
									{(isRestaurantsSearchForContact || isRestaurantTitle(headline)) && (
										<RestaurantsIcon size={12} className="flex-shrink-0" />
									)}
									{(isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline)) && (
										<CoffeeShopsIcon size={7} />
									)}
									{(isMusicVenuesSearchForContact || isMusicVenueTitle(headline)) && (
										<MusicVenuesIcon size={12} className="flex-shrink-0" />
									)}
									{(isMusicFestivalsSearchForContact ||
										isMusicFestivalTitle(headline)) && (
										<FestivalsIcon size={12} className="flex-shrink-0" />
									)}
									{(isWeddingPlannersSearchForContact ||
										isWeddingPlannerTitle(headline) ||
										isWeddingVenueTitle(headline)) && <WeddingPlannersIcon size={12} />}
									{isWineBeerSpiritsTitle(headline) && (
										<WineBeerSpiritsIcon size={12} className="flex-shrink-0" />
									)}
									<span className="text-[10px] text-black leading-none truncate">
										{isRestaurantsSearchForContact || isRestaurantTitle(headline)
											? 'Restaurant'
											: isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline)
												? 'Coffee Shop'
												: isMusicVenuesSearchForContact || isMusicVenueTitle(headline)
													? 'Music Venue'
													: isMusicFestivalsSearchForContact ||
														  isMusicFestivalTitle(headline)
														? 'Music Festival'
														: isWeddingVenueTitle(headline)
															? 'Wedding Venue'
															: isWeddingPlannersSearchForContact ||
																  isWeddingPlannerTitle(headline)
																? 'Wedding Planner'
																: isWineBeerSpiritsTitle(headline)
																	? getWineBeerSpiritsLabel(headline)
																	: headline}
									</span>
								</div>
							) : (
								<div className="w-full" />
							)}
						</div>
						<div className="pr-2 pl-1 flex items-center h-[22px]">
							{city || stateAbbr ? (
								<div className="flex items-center gap-1 w-full">
									{stateAbbr && (
										<span
											className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
											style={{
												backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
												borderColor: '#000000',
											}}
										>
											{stateAbbr}
										</span>
									)}
									{city && (
										<span className="text-[10px] text-black leading-none truncate">
											{city}
										</span>
									)}
								</div>
							) : (
								<div className="w-full" />
							)}
						</div>
					</>
				)}
			</div>
		);
	};

	const renderMapPanelShiftClickAnchorPlaceholder = () => (
		<div
			key="map-panel-shift-click-anchor"
			aria-hidden="true"
			className="pointer-events-none flex w-full items-center justify-center"
			style={{ height: '14px', backgroundColor: 'transparent' }}
		>
			<div
				style={{
					width: '100%',
					height: '14px',
					borderRadius: '8px',
					border: '2.33px solid #FFF',
					backgroundColor: 'transparent',
					boxSizing: 'border-box',
				}}
			/>
		</div>
	);

	const renderMapPanelSearchResultRows = () => {
		const rows: ReactNode[] = [];
		const anchorIndex =
			mapPanelShiftClickAnchor &&
			selectedContacts.includes(mapPanelShiftClickAnchor.contactId)
				? Math.max(
						0,
						Math.min(
							mapPanelShiftClickAnchor.index,
							mapPanelUnselectedContactsFiltered.length
						)
					)
				: -1;

		mapPanelUnselectedContactsFiltered.forEach((contact, index) => {
			if (index === anchorIndex) {
				rows.push(renderMapPanelShiftClickAnchorPlaceholder());
			}
			rows.push(renderMapPanelDesktopRow(contact, 'search-results'));
		});

		if (anchorIndex === mapPanelUnselectedContactsFiltered.length) {
			rows.push(renderMapPanelShiftClickAnchorPlaceholder());
		}

		return rows;
	};

	return (
		<>
			<style jsx global>{`
				/* Height note: under the root dashboard zoom, 100vh renders at 100vh·zoom —
				   shorter than the real window — so html/body (overflow hidden) would clip
				   the hero cluster's bottom on short monitors. Real innerHeight (published
				   as --murmur-dashboard-viewport-h) ÷ zoom always renders one full window. */
				html:has(
					[data-dashboard-scroll-lock='true']:not([data-campaign-finder-open='true']):not(
							[data-calendar-panel-open='true']
						)
				),
				body:has(
					[data-dashboard-scroll-lock='true']:not([data-campaign-finder-open='true']):not(
							[data-calendar-panel-open='true']
						)
				) {
					overflow: hidden !important;
					height: calc(
						var(--murmur-dashboard-viewport-h, 100vh) /
							var(--murmur-dashboard-zoom, 1)
					) !important;
					overscroll-behavior: none !important;
				}
				html:has([data-dashboard-scroll-lock='true'][data-campaign-finder-open='true']),
				html:has([data-dashboard-scroll-lock='true'][data-calendar-panel-open='true']),
				body:has([data-dashboard-scroll-lock='true'][data-campaign-finder-open='true']),
				body:has([data-dashboard-scroll-lock='true'][data-calendar-panel-open='true']) {
					overflow: visible !important;
					height: calc(
						var(--murmur-dashboard-viewport-h, 100vh) /
							var(--murmur-dashboard-zoom, 1)
					) !important;
					overscroll-behavior: none !important;
				}
				#map-search-tray-what-dropdown-container .scrollbar-hide,
				#map-search-tray-where-dropdown-container .scrollbar-hide {
					scrollbar-width: none !important;
					scrollbar-color: transparent transparent !important;
					-ms-overflow-style: none !important;
				}
				#map-search-tray-what-dropdown-container .scrollbar-hide::-webkit-scrollbar,
				#map-search-tray-where-dropdown-container .scrollbar-hide::-webkit-scrollbar {
					display: none !important;
					width: 0 !important;
					height: 0 !important;
				}
				.initial-dashboard-search-suggestion {
					appearance: none;
					background-color: var(
						--initial-dashboard-search-suggestion-background,
						#f8f8f8
					);
					border: 0;
					cursor: pointer;
					opacity: var(--initial-dashboard-search-suggestion-opacity, 0.5);
					text-align: left;
					transform: translateY(0) scale(1);
					transform-origin: center bottom;
					transition:
						background-color 120ms ease,
						box-shadow 120ms ease,
						opacity 120ms ease,
						transform 120ms ease;
					animation: initial-dashboard-search-suggestion-enter 320ms
						cubic-bezier(0, 0, 0.2, 1) backwards;
					will-change: opacity, transform;
				}
				.initial-dashboard-search-suggestion:hover,
				.initial-dashboard-search-suggestion:focus-visible {
					background-color: #ffffff;
					box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
					opacity: 1;
					transform: translateY(-1px) scale(1.01);
				}
				.initial-dashboard-search-suggestion:focus-visible {
					outline: 2px solid rgba(54, 143, 237, 0.9);
					outline-offset: 2px;
				}
				@keyframes initial-dashboard-search-suggestion-enter {
					from {
						opacity: 0;
						transform: translateY(12px) scale(0.985);
					}
					to {
						opacity: var(--initial-dashboard-search-suggestion-opacity, 0.5);
						transform: translateY(0) scale(1);
					}
				}
				@media (prefers-reduced-motion: reduce) {
					.initial-dashboard-search-suggestion {
						animation: none;
						opacity: var(--initial-dashboard-search-suggestion-opacity, 0.5);
						transform: none;
					}
				}
			`}</style>
			{/* Shared Mapbox globe background */}
			{mapPortal}
			{/* Boot splash starfield: fixed at z -1 like the map but later in the DOM, so it
			    paints above the canvas while staying under all static-flow hero content. Kept
			    outside the content wrapper so the hasSearched transform can never capture it. */}
			{bootPhase !== 'done' && shouldLockLandingDashboardScroll && (
				<DashboardBootBackdrop fading={bootPhase === 'fading'} />
			)}
			{/* Loading-progress % below the hero logo. Keyed to the splash lifecycle
			    (bootPhase leaves 'active' on map-ready OR the safety cap), so it snaps
			    to 100% and fades out in lockstep with the starfield. */}
			<DashboardBootProgress
				enabled={shouldLockLandingDashboardScroll}
				done={bootPhase !== 'active'}
				isMobile={false}
				fadeMs={DASHBOARD_BOOT_FADE_MS}
				maxWaitMs={DASHBOARD_BOOT_MAX_WAIT_MS}
			/>

			<div
				data-dashboard-scroll-lock={shouldLockDashboardPageScroll ? 'true' : undefined}
				data-campaign-finder-open={isCampaignFinderOpen ? 'true' : undefined}
				data-calendar-panel-open={isCalendarPanelOpen ? 'true' : undefined}
				className={
					shouldLockDashboardPageScroll && !isOverflowingDashboardPanelOpen
						? 'h-screen overflow-hidden'
						: undefined
				}
				style={
					shouldLockLandingDashboardScroll && !isOverflowingDashboardPanelOpen
						? {
								// Under the root zoom, h-screen renders at 100vh·zoom — shorter
								// than the real window — and clips the hero cluster's bottom on
								// short monitors. Real innerHeight ÷ zoom always renders exactly
								// one full window tall regardless of vh-under-zoom semantics.
								height: `calc(var(${DASHBOARD_VIEWPORT_H_VAR}, 100vh) / var(${DASHBOARD_ZOOM_VAR}, 1))`,
							}
						: undefined
				}
			>
				<AppLayout>
					<div
						ref={dashboardContentRef}
						className={`relative min-h-screen dashboard-main-offset w-full max-w-full transition-opacity duration-500 ${bottomPadding} ${
							hasSearched ? 'search-active' : ''
						} ${
							// Add-to-campaign (pick-flow) arrivals go straight to the map: keep the
							// landing hero invisible for the frames before isMapView flips so the
							// campaign→Search transition doesn't flash it. Exiting pick mode (Home)
							// strips the URL param, which un-hides this again.
							isMapView || isUnsubscribeFlowOpen || isAddToCampaignMode
								? 'opacity-0 pointer-events-none'
								: 'opacity-100'
						}`}
						style={
							hasSearched
								? {
										transform: 'scale(0.9)',
										transformOrigin: 'top left',
										width: '111.11%',
										maxWidth: '111.11%',
										minHeight: '111.11vh',
									}
								: undefined
						}
					>
						{!hasSearched && activeTab === 'search' && (
							<DashboardHeroDateWeatherBar
								temperatureF={globeWeatherTemperatureF}
								weatherCode={globeWeatherCode}
							/>
						)}
						<div
							className={`hero-wrapper flex flex-col items-center !z-[40] ${
								activeTab === 'inbox' ? 'justify-start' : 'justify-center'
							}`}
						>
							<div className="w-full">
								<div
									className="flex justify-center items-center w-full px-4"
									style={{
										marginBottom: '0.75rem',
										marginTop: activeTab === 'inbox' ? '136px' : '320px',
									}}
								>
									<div className="premium-hero-section flex flex-col items-center justify-center w-full max-w-[600px]">
										<div
											className="premium-logo-container flex items-center justify-center"
											style={{ width: logoWidth, height: logoHeight }}
										>
											{/* Scale the SVG, not the container: the container's transform/opacity
											    are driven by useDashboardScrollToMap + .search-active, and keeping
											    its layout box unchanged leaves the search bar position intact. */}
											<MurmurLogoNew
												width={logoWidth}
												height={logoHeight}
												className="dashboard-hero-logo origin-bottom scale-[1.5] -translate-x-[15%] translate-y-[40px]"
											/>
										</div>
									</div>
								</div>

								<div
									className={`search-bar-wrapper w-full max-w-[1132px] mx-auto px-4 !z-[50] ${
										hasSearched ? 'search-bar-active' : ''
									}`}
								>
									<div
										className="origin-center w-full"
										style={{
											// Frozen at the saturated anchor value: the root zoom owns
											// responsive scaling, so a vw-based scale would double-apply.
											transform: 'scale(1.08)',
										}}
									>
										<div className="search-bar-inner">
											{hasSearched && activeSearchQuery && (
												<div className="search-context-label">
													<span className="search-query-text">{activeSearchQuery}</span>
												</div>
											)}
											{!hasSearched && (
												<Form {...form}>
													<form
														onSubmit={async (e) => {
															e.preventDefault();

															if (!isSignedIn) {
																if (hasProblematicBrowser) {
																	if (typeof window !== 'undefined') {
																		sessionStorage.setItem(
																			'redirectAfterSignIn',
																			window.location.pathname
																		);
																	}
																	window.location.href = urls.signIn.index;
																} else {
																	openSignIn();
																}
																return;
															}

															// Curated path: when why/what/where are all blank, the gradient/search
															// button surfaces a randomly-curated set of nearby venues/restaurants/
															// coffee shops/festivals/wineries/breweries via the Elasticsearch
															// category sampler. Different every click. No location prompt.
															const isWhyWhatWhereBlank =
																!whyValue.trim() &&
																!whatValue.trim() &&
																!whereValue.trim();
															if (isWhyWhatWhereBlank && !isFromHomeDemoMode) {
																setActiveSection(null);
																// First search of the session creates the active campaign,
																// same as the other search entry points. Skip in URL-pinned
																// add-to-campaign mode, where searches target that campaign.
																if (!isAddToCampaignMode) {
																	void ensureActiveCampaign('');
																}
																// Resolve coarse lat/lon from the user's IP (cached 24h,
																// no permission prompt). Works locally and in prod —
																// covers the gaps where Vercel headers aren't populated.
																let lat: number | null = null;
																let lon: number | null = null;
																try {
																	const loc = await getApproximateLocation();
																	lat = loc.lat;
																	lon = loc.lon;
																} catch {
																	// Non-fatal — backend still infers from headers if present
																	// and falls back to an unrestricted curated set otherwise.
																}
																await triggerCuratedSearch({
																	lat: lat ?? undefined,
																	lon: lon ?? undefined,
																});
																return;
															}

															await ensureNonEmptyDashboardSearchOnBlankSubmit();
															if (activeTab === 'inbox') {
																transitionToTab('search', {
																	after: () => {
																		form.handleSubmit(onSubmit)();
																	},
																});
																return;
															}
															form.handleSubmit(onSubmit)(e);
														}}
														className={hasSearched ? 'search-form-active' : ''}
													>
														<FormField
															control={form.control}
															name="searchText"
															render={({ field }) => (
																<FormItem>
																	<FormControl>
																		{/* Keep the hero search bar from stretching full-width at narrower widths. */}
																		<div className="mx-auto w-full max-w-[603px]">
																			<div
																				ref={searchContainerRef}
																				className={`search-input-group relative ${
																					hasSearched ? 'search-input-group-active' : ''
																				}`}
																				onPointerEnter={(event) => {
																					if (
																						event.pointerType !== 'mouse' &&
																						event.pointerType !== 'pen'
																					)
																						return;
																					// "Almost halt" the animated gradient while hovered.
																					setHeroSearchGradientPlaybackRate(0.08);
																				}}
																				onPointerLeave={(event) => {
																					if (
																						event.pointerType !== 'mouse' &&
																						event.pointerType !== 'pen'
																					)
																						return;
																					setHeroSearchGradientPlaybackRate(null);
																				}}
																			>
																				<div
																					className={`search-wave-container ${
																						isSearchPending ||
																						isLoadingContacts ||
																						isRefetchingContacts
																							? 'search-wave-loading'
																							: ''
																					}`}
																					style={{
																						transition: 'none',
																						opacity: inboxView ? undefined : 0.8,
																					}}
																				>
																					<Input
																						className={`search-wave-input !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus:ring-0 !focus:ring-offset-0 !ring-0 !outline-none !accent-transparent ${
																							inboxView
																								? '!h-[39px] !border-0'
																								: isBootSkin
																									? '!h-[72px] !border-2 !border-[#caccce]'
																									: '!h-[72px] !border-2 !border-black'
																						} ${
																							isBootTransition
																								? 'transition-[border-color] duration-700'
																								: ''
																						} pr-[80px]`}
																						placeholder=""
																						style={{
																							accentColor: 'transparent',
																							// The boot crossfade needs the border-color transition
																							// class to win; otherwise transitions stay disabled.
																							transition: isBootTransition ? undefined : 'none',
																							...(inboxView
																								? { backgroundColor: '#EFEFEF' }
																								: {}),
																						}}
																						autoComplete="off"
																						autoCorrect="off"
																						autoCapitalize="off"
																						spellCheck="false"
																						{...field}
																					/>
																					{/* New 532x64px element - Added border-black and z-20 */}
																					<div
																						className={`search-sections-container absolute left-[4px] right-[68px] top-1/2 -translate-y-1/2 ${
																							inboxView
																								? 'h-[31px]'
																								: 'h-[64px]'
																						} rounded-[8px] z-20 font-secondary flex items-center ${
																							inboxView
																								? 'bg-[#EFEFEF] border-0'
																								: activeSection
																									? 'bg-[#EFEFEF] border border-transparent'
																									: 'bg-white border border-black'
																						} ${inboxView ? '' : 'invisible pointer-events-none'}`}
																						style={{ transition: 'none' }}
																					>
																						{/* Sliding active tab indicator */}
																						<div
																							ref={activeSectionIndicatorRef}
																							className="absolute top-0 left-0 h-full w-1/3 bg-white border border-black rounded-[8px] pointer-events-none z-10"
																							style={{
																								opacity: 0,
																								willChange: 'transform',
																							}}
																						/>
																						{/* Why Section */}
																						<div
																							className={`relative h-full cursor-pointer border flex-1 min-w-0 ${
																								activeSection === 'why'
																									? 'bg-transparent border-transparent rounded-[8px]'
																									: `border-transparent ${
																											activeSection
																												? 'hover:bg-[#F9F9F9]'
																												: 'hover:bg-black/5'
																										} rounded-l-[8px]`
																							}`}
																							onClick={() => {
																								if (isFromHomeDemoMode) {
																									setShowFreeTrialPrompt(true);
																									return;
																								}
																								setActiveSection('why');
																							}}
																						>
																							<div
																								className={`absolute z-20 left-[24px] ${
																									inboxView
																										? 'top-1/2 -translate-y-1/2 text-[14px]'
																										: 'top-[10px] text-[22px]'
																								} font-bold text-black leading-none`}
																							>
																								{inboxView
																									? whyValue
																										? whyValue.replace(/[\[\]]/g, '')
																										: 'Why'
																									: 'Why'}
																							</div>
																							<div
																								className={`absolute z-20 left-[24px] right-[4px] top-[42px] h-[12px] overflow-hidden ${
																									inboxView ? 'hidden' : ''
																								}`}
																							>
																								<div
																									className="absolute top-0 left-0 font-semibold text-[12px] whitespace-nowrap"
																									style={{
																										height: '12px',
																										lineHeight: '12px',
																										padding: '0',
																										margin: '0',
																										color:
																											whyValue &&
																											whyValue.trim().length > 0
																												? '#000000'
																												: 'rgba(0, 0, 0, 0.42)',
																									}}
																								>
																									{whyValue || 'Choose Type of Search'}
																								</div>
																							</div>
																						</div>
																						<div
																							className={`w-[2px] h-full bg-black/10 flex-shrink-0 ${
																								activeSection || inboxView ? 'hidden' : ''
																							}`}
																						/>
																						{/* What Section */}
																						<div
																							className={`relative h-full cursor-pointer border overflow-hidden flex-1 min-w-0 ${
																								activeSection === 'what'
																									? 'bg-transparent border-transparent rounded-[8px]'
																									: `border-transparent ${
																											activeSection
																												? 'hover:bg-[#F9F9F9]'
																												: 'hover:bg-black/5'
																										}`
																							}`}
																							onClick={() => {
																								if (isFromHomeDemoMode) {
																									setShowFreeTrialPrompt(true);
																									return;
																								}
																								setActiveSection('what');
																							}}
																						>
																							{inboxView ? (
																								activeSection === 'what' ? (
																									<input
																										ref={whatInputRef}
																										type="text"
																										value={whatValue}
																										onChange={(e) => {
																											if (isFromHomeDemoMode) return;
																											setWhatValue(e.target.value);
																										}}
																										readOnly={isFromHomeDemoMode}
																										onKeyDown={(e) => {
																											if (e.key === 'Enter') {
																												e.preventDefault();
																												setActiveSection(null);
																											}
																										}}
																										className="absolute z-20 left-[24px] right-[8px] top-1/2 -translate-y-1/2 w-auto font-bold text-black text-[14px] bg-transparent outline-none border-none leading-none placeholder:text-black"
																										style={{
																											fontFamily:
																												'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
																										}}
																										placeholder="What"
																										onClick={(e) => e.stopPropagation()}
																									/>
																								) : (
																									<div className="absolute z-20 left-[24px] right-[8px] top-1/2 -translate-y-1/2 font-bold text-black text-[14px] leading-none">
																										{whatValue || 'What'}
																									</div>
																								)
																							) : (
																								<>
																									<div className="absolute z-20 left-[24px] top-[10px] text-[22px] font-bold text-black leading-none">
																										What
																									</div>
																									<div className="absolute z-20 left-[24px] right-[8px] top-[42px] h-[12px] overflow-hidden">
																										{activeSection === 'what' ? (
																											<input
																												ref={whatInputRef}
																												type="text"
																												value={whatValue}
																												onChange={(e) => {
																													if (isFromHomeDemoMode) return;
																													setWhatValue(e.target.value);
																												}}
																												readOnly={isFromHomeDemoMode}
																												onKeyDown={(e) => {
																													if (e.key === 'Enter') {
																														e.preventDefault();
																														setActiveSection(null);
																													}
																												}}
																												className="absolute z-20 top-0 left-0 w-full font-semibold text-black text-[12px] bg-transparent outline-none border-none"
																												style={{
																													height: '12px',
																													lineHeight: '12px',
																													padding: '0',
																													margin: '0',
																													transform: 'translateY(-1px)',
																													fontFamily:
																														'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
																												}}
																												placeholder="Add Recipients"
																												onClick={(e) =>
																													e.stopPropagation()
																												}
																											/>
																										) : (
																											<div
																												className="absolute z-20 top-0 left-0 w-full font-semibold text-[12px] whitespace-nowrap overflow-hidden hover:text-black/60 transition-colors"
																												style={{
																													height: '12px',
																													lineHeight: '12px',
																													padding: '0',
																													margin: '0',
																													color: whatValue
																														? '#000000'
																														: 'rgba(0, 0, 0, 0.42)',
																													maskImage:
																														'linear-gradient(to right, black 80%, transparent 100%)',
																													WebkitMaskImage:
																														'linear-gradient(to right, black 80%, transparent 100%)',
																												}}
																											>
																												{whatValue || 'Add Recipients'}
																											</div>
																										)}
																									</div>
																								</>
																							)}
																						</div>
																						<div
																							className={`w-[2px] h-full bg-black/10 flex-shrink-0 ${
																								activeSection || inboxView ? 'hidden' : ''
																							}`}
																						/>
																						{/* Where Section */}
																						<div
																							className={`relative h-full cursor-pointer border overflow-hidden flex-1 min-w-0 ${
																								activeSection === 'where'
																									? 'bg-transparent border-transparent rounded-[8px]'
																									: `border-transparent ${
																											activeSection
																												? 'hover:bg-[#F9F9F9]'
																												: 'hover:bg-black/5'
																										} rounded-r-[8px]`
																							}`}
																							onClick={() => {
																								if (isFromHomeDemoMode) {
																									setShowFreeTrialPrompt(true);
																									return;
																								}
																								setActiveSection('where');
																							}}
																						>
																							{inboxView ? (
																								activeSection === 'where' ? (
																									<input
																										ref={whereInputRef}
																										type="text"
																										value={whereValue}
																										onChange={(e) => {
																											if (isFromHomeDemoMode) return;
																											setWhereValue(e.target.value);
																											setIsNearMeLocation(false);
																										}}
																										readOnly={isFromHomeDemoMode}
																										onKeyDown={(e) => {
																											if (e.key === 'Enter') {
																												e.preventDefault();
																												void triggerSearchWithCurrentValues();
																											}
																										}}
																										className="absolute z-20 left-[24px] right-[8px] top-1/2 -translate-y-1/2 w-auto font-bold text-black text-[14px] bg-transparent outline-none border-none leading-none placeholder:text-black"
																										style={{
																											fontFamily:
																												'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
																										}}
																										placeholder="Where"
																										onClick={(e) => e.stopPropagation()}
																									/>
																								) : (
																									<div className="absolute z-20 left-[24px] right-[8px] top-1/2 -translate-y-1/2 font-bold text-black text-[14px] leading-none">
																										{whereValue || 'Where'}
																									</div>
																								)
																							) : (
																								<>
																									<div className="absolute z-20 left-[24px] top-[10px] text-[22px] font-bold text-black leading-none">
																										Where
																									</div>
																									<div className="absolute z-20 left-[24px] right-[8px] top-[42px] h-[12px] overflow-hidden">
																										{activeSection === 'where' ? (
																											<div className="absolute z-20 top-0 left-0 w-full h-full flex items-center gap-[2px]">
																												<input
																													ref={whereInputRef}
																													type="text"
																													value={whereValue}
																													onChange={(e) => {
																														if (isFromHomeDemoMode)
																															return;
																														setWhereValue(e.target.value);
																														setIsNearMeLocation(false);
																													}}
																													readOnly={isFromHomeDemoMode}
																													onKeyDown={(e) => {
																														if (e.key === 'Enter') {
																															e.preventDefault();
																															void triggerSearchWithCurrentValues();
																														}
																													}}
																													className="z-20 flex-1 font-semibold text-black text-[12px] bg-transparent outline-none border-none"
																													style={{
																														height: '12px',
																														lineHeight: '12px',
																														padding: '0',
																														margin: '0',
																														transform: 'translateY(-1px)',
																														fontFamily:
																															'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
																													}}
																													placeholder="Search States"
																													onClick={(e) =>
																														e.stopPropagation()
																													}
																												/>
																											</div>
																										) : (
																											<div
																												className="absolute z-20 top-0 left-0 w-full font-semibold text-[12px] whitespace-nowrap overflow-hidden hover:text-black/60 transition-colors"
																												style={{
																													height: '12px',
																													lineHeight: '12px',
																													padding: '0',
																													margin: '0',
																													color: hasWhereValue
																														? '#000000'
																														: 'rgba(0, 0, 0, 0.42)',
																													maskImage:
																														'linear-gradient(to right, black 80%, transparent 100%)',
																													WebkitMaskImage:
																														'linear-gradient(to right, black 80%, transparent 100%)',
																												}}
																											>
																												{hasWhereValue
																													? whereValue
																													: 'Search States'}
																											</div>
																										)}
																									</div>
																								</>
																							)}
																						</div>
																					</div>
																					{!inboxView && (
																						<button
																							type="submit"
																							aria-label="Search"
																							ref={heroSearchGradientButtonRef}
																							className="search-gradient-button search-spotlight-zone search-pond-zone absolute left-[4px] right-[68px] top-1/2 -translate-y-1/2 h-[64px] rounded-[8px] z-30 cursor-pointer"
																							style={{
																								border: '1px solid #000000',
																								color: '#FFFFFF',
																								fontFamily:
																									'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
																								fontSize: '25px',
																								fontWeight: 600,
																								lineHeight: 1,
																							}}
																							onClick={() => setActiveSection(null)}
																							onPointerEnter={
																								updateSpotlightVarsFromPointer
																							}
																							onPointerMove={
																								updateSpotlightVarsFromPointer
																							}
																						>
																							{/* Anisotropic streak field — follows gradient flow */}
																							<div
																								className="search-refraction-streaks"
																								aria-hidden="true"
																							/>
																							{/* Micro caustics ripple layer */}
																							<div
																								className="search-refraction-caustics"
																								aria-hidden="true"
																							/>
																							<span
																								className="search-spotlight-content"
																								style={{
																									position: 'absolute',
																									left: 'calc(50% + 32px)',
																									top: '50%',
																									transform: 'translate(-50%, -50%)',
																								}}
																							>
																								Search
																							</span>
																						</button>
																					)}
																					{/* Desktop Search Button */}
																					<button
																						type="submit"
																						ref={heroSearchIconButtonRef}
																						className={`dashboard-search-button search-spotlight-zone search-spotlight-zone-sm flex absolute right-[6px] items-center justify-center w-[58px] ${
																							inboxView
																								? 'h-[31px]'
																								: 'h-[62px]'
																						} z-40 cursor-pointer group`}
																						style={{
																							top: '50%',
																							transform: 'translateY(-50%)',
																							backgroundColor: 'rgba(93, 171, 104, 0.49)',
																							borderTopRightRadius: '7px',
																							borderBottomRightRadius: '7px',
																							borderTopLeftRadius: '0',
																							borderBottomLeftRadius: '0',
																							border: '1px solid #5DAB68',
																							borderLeft: '1px solid #5DAB68',
																						}}
																						onPointerEnter={
																							updateSpotlightVarsFromPointer
																						}
																						onPointerMove={updateSpotlightVarsFromPointer}
																					>
																						<span className="search-spotlight-content">
																							<SearchIconDesktop
																								width={inboxView ? 25 : 26}
																								height={inboxView ? 25 : 28}
																							/>
																						</span>
																					</button>
																					{/* Mobile-only submit icon inside input */}
																					<button
																						type="submit"
																						className="search-input-icon-btn hidden"
																						aria-label="Search"
																					>
																						<SearchIconMobile />
																					</button>
																				</div>
																				{renderDesktopSearchDropdowns()}
																			</div>
																			{!hasSearched && !inboxView && (
																				<div
																					className="dashboard-action-bar"
																					style={{
																						borderRadius: 8,
																						opacity: 0.8,
																						background: 'rgba(242, 242, 242, 0.20)',
																						width: 601,
																						height: 43,
																						marginTop: 9,
																						border: '1px solid white',
																						display: 'flex',
																						alignItems: 'center',
																						justifyContent: 'space-around',
																						padding: '0 24px',
																						color: '#050505',
																					}}
																				>
																					{(
																						[
																							{
																								key: 'playbook',
																								Icon: DashboardActionBarPlaybookIcon,
																								label: 'Playbook',
																							},
																							{
																								key: 'folder',
																								Icon: DashboardActionBarFolderIcon,
																								label: 'Folder',
																							},
																							{
																								key: 'calendar',
																								Icon: DashboardActionBarCalendarIcon,
																								label: 'Calendar',
																							},
																							{
																								key: 'star',
																								Icon: DashboardActionBarStarIcon,
																								label: 'Opportunities',
																							},
																							{
																								key: 'envelope',
																								Icon: DashboardActionBarEnvelopeIcon,
																								label: 'Messages',
																							},
																						] as const
																					).map(({ key, Icon, label }) => {
																						const isSelected =
																							selectedActionBarIcon === key;
																						return (
																							<button
																								key={key}
																								type="button"
																								aria-label={label}
																								aria-pressed={isSelected}
																								onClick={() =>
																									setSelectedActionBarIcon(key)
																								}
																								style={{
																									background: 'none',
																									border: 'none',
																									padding: '4px 8px',
																									margin: 0,
																									display: 'flex',
																									alignItems: 'center',
																									justifyContent: 'center',
																									cursor: 'pointer',
																									color: '#050505',
																									opacity: isSelected ? 1 : 0.3,
																									transition: 'opacity 150ms ease',
																								}}
																							>
																								<Icon />
																							</button>
																						);
																					})}
																				</div>
																			)}
																		</div>
																	</FormControl>
																</FormItem>
															)}
														/>
														{false && !hasSearched && (
															<div className="flex flex-row gap-4 items-center justify-between w-full flex-wrap">
																<div className="flex flex-row gap-4 items-center h-[39px] justify-start flex-shrink-0">
																	<div
																		className="exclude-contacts-box bg-[#EFEFEF] w-[227px] h-[32px] rounded-[8px] flex items-center px-4 my-auto"
																		style={
																			isMobile
																				? ({
																						width: '124px',
																						height: '16px',
																						padding: '0 6px',
																						borderRadius: '6px',
																					} as React.CSSProperties)
																				: undefined
																		}
																	>
																		<FormField
																			control={form.control}
																			name="excludeUsedContacts"
																			render={({ field }) => (
																				<FormItem className="flex flex-row items-center justify-between space-y-0 m-0 w-full gap-3">
																					<div className="leading-none flex items-center">
																						<FormLabel
																							className="font-bold cursor-pointer select-none whitespace-nowrap"
																							style={
																								isMobile
																									? ({
																											fontSize: '8px',
																											lineHeight: '10px',
																											fontFamily:
																												'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
																											fontWeight: 700,
																											letterSpacing: '0',
																											whiteSpace: 'nowrap',
																										} as React.CSSProperties)
																									: ({
																											fontSize: '14px',
																											lineHeight: '16px',
																										} as React.CSSProperties)
																							}
																						>
																							Exclude Used Contacts
																						</FormLabel>
																					</div>
																					<FormControl>
																						<label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
																							<input
																								type="checkbox"
																								className="sr-only peer"
																								checked={field.value}
																								onChange={(e) =>
																									field.onChange(e.target.checked)
																								}
																							/>
																							<div
																								className={`toggle-switch-track w-[26px] h-4 rounded-full relative overflow-hidden transition-colors duration-200 shadow-none drop-shadow-none ${
																									field.value ? 'toggle-on' : 'toggle-off'
																								}`}
																								style={
																									{
																										'--toggle-bg': field.value
																											? '#5dab68'
																											: '#E5E5E5',
																										backgroundColor: 'var(--toggle-bg)',
																										background: 'var(--toggle-bg)',
																										...(isMobile
																											? ({
																													width: '13px',
																													minWidth: '13px',
																													height: '8px',
																													borderRadius: '9999px',
																												} as React.CSSProperties)
																											: {}),
																									} as React.CSSProperties
																								}
																								data-checked={field.value}
																								data-debug={JSON.stringify({
																									value: field.value,
																									type: typeof field.value,
																								})}
																							>
																								<div
																									className={`absolute transform transition-transform duration-200 ease-in-out ${
																										field.value
																											? 'bg-white'
																											: 'bg-[#050505]'
																									} rounded-full shadow-none drop-shadow-none`}
																									style={
																										isMobile
																											? ({
																													width: '6px',
																													height: '6px',
																													left: '2px',
																													top: '50%',
																													transform: `translateX(${
																														field.value ? 3 : 0
																													}px) translateY(-50%)`,
																												} as React.CSSProperties)
																											: ({
																													top: '50%',
																													left: '2px',
																													width: '12px',
																													height: '12px',
																													transform: `translateX(${
																														field.value ? 10 : 0
																													}px) translateY(-50%)`,
																												} as React.CSSProperties)
																									}
																								/>
																							</div>
																						</label>
																					</FormControl>
																				</FormItem>
																			)}
																		/>
																	</div>
																</div>
															</div>
														)}
													</form>
												</Form>
											)}
										</div>
									</div>
								</div>

								{/* TSV upload is always visible on the search tab, before any search is made */}
								{/* Hidden: Import button
						{activeTab === 'search' && (
							<div className="mt-2 w-full max-w-[532px] mx-auto flex justify-start pl-1">
								<ContactTSVUploadDialog
									isAdmin={user?.role === 'admin'}
									triggerText="Import"
									asTextTrigger
								/>
							</div>
						)}
						*/}

								{/* Search/Inbox tab toggle - disabled for now (keep code for later) */}
								{ENABLE_DASHBOARD_INBOX_TAB && !hasSearched && activeTab === 'search' && (
									<div className="flex justify-center" style={{ marginTop: '92px' }}>
										<div
											ref={tabToggleTrackRef}
											onMouseLeave={() => setHoveredTab(null)}
											className="relative flex items-center origin-center scale-[0.8] sm:scale-[0.9] lg:scale-100"
											style={{
												width: '228px',
												height: '36px',
												borderWidth: '3px',
												borderStyle: 'solid',
												borderColor: '#7A7A7A',
												borderRadius: '10px',
												backgroundColor: '#FFFFFF',
											}}
										>
											{/* Hover preview pill (shows the other tab on hover) */}
											<div
												ref={tabToggleHoverPillRef}
												aria-hidden="true"
												style={{
													position: 'absolute',
													top: '50%',
													left: 0,
													width: '85px',
													height: '17px',
													borderWidth: '2px',
													borderStyle: 'solid',
													borderColor: '#000000',
													borderRadius: '10px',
													backgroundColor: TAB_PILL_COLORS.inbox,
													pointerEvents: 'none',
													opacity: 0,
													transform: 'translateX(124px) translateY(-50%)',
													willChange: 'transform, opacity, background-color',
													transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
												}}
											/>
											{/* Sliding pill indicator - positioned at search (left) */}
											<div
												ref={tabTogglePillRef}
												style={{
													position: 'absolute',
													top: '50%',
													left: 0,
													width: '85px',
													height: '17px',
													borderWidth: '2px',
													borderStyle: 'solid',
													borderColor: '#000000',
													borderRadius: '10px',
													backgroundColor: '#DAE6FE',
													pointerEvents: 'none',
													transform: 'translateX(13px) translateY(-50%)',
													willChange: 'transform, background-color',
												}}
											/>
											{/* White overlay pill (visible only during hover-preview) */}
											<div
												ref={tabToggleWhitePillRef}
												aria-hidden="true"
												style={{
													position: 'absolute',
													top: '50%',
													left: 0,
													width: '85px',
													height: '17px',
													borderWidth: '2px',
													borderStyle: 'solid',
													borderColor: '#000000',
													borderRadius: '10px',
													backgroundColor: '#FFFFFF',
													pointerEvents: 'none',
													opacity: 0,
													transform: 'translateX(13px) translateY(-50%)',
													willChange: 'transform, opacity',
													transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
												}}
											/>
											<button
												type="button"
												className="relative z-10 flex-1 h-full flex items-center justify-center font-medium"
												style={{ fontSize: '14px' }}
												onMouseEnter={() => setHoveredTab('search')}
												onClick={() => transitionToTab('search')}
												aria-pressed={true}
											>
												<span
													className={`inline-block ${isTabPreviewingOther ? 'opacity-0' : 'opacity-100'}`}
													style={{
														transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
													}}
												>
													Search
												</span>
											</button>
											<button
												type="button"
												className="relative z-10 flex-1 h-full flex items-center justify-center font-medium"
												style={{ fontSize: '14px' }}
												onMouseEnter={() => setHoveredTab('inbox')}
												onClick={() => transitionToTab('inbox')}
												aria-pressed={false}
											>
												<span
													className="inline-block opacity-100"
													style={{
														display: 'inline-block',
														transform: 'translateX(2px)',
														transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
													}}
												>
													Inbox
												</span>
											</button>
										</div>
									</div>
								)}

								{/* Inbox tab: CampaignsInboxView + toggle - disabled for now (keep code for later) */}
								{ENABLE_DASHBOARD_INBOX_TAB && !hasSearched && activeTab === 'inbox' && (
									<div
										ref={tabbedLandingBoxRef}
										style={{
											marginTop: '20px',
											willChange: 'transform, opacity',
										}}
									>
										{/*
									Keep the inbox mounted so it can finish loading while the user views
									the "Campaigns" sub-tab. (Do NOT change the campaign-page popup behavior.)
								*/}
										<div
											style={{ display: inboxSubtab === 'messages' ? 'block' : 'none' }}
										>
											<InboxSection
												desktopHeight={535}
												dashboardMode
												loadingVariant="dashboard"
												inboxSubtab={inboxSubtab}
												onInboxSubtabChange={setInboxSubtab}
											/>
										</div>

										{inboxSubtab === 'campaigns' && (
											<CampaignsInboxView
												inboxSubtab={inboxSubtab}
												onInboxSubtabChange={setInboxSubtab}
											/>
										)}
										{/* Toggle below table for inbox tab */}
										<div className="flex justify-center" style={{ marginTop: '34px' }}>
											<div
												ref={tabToggleTrackRef}
												onMouseLeave={() => setHoveredTab(null)}
												className="relative flex items-center"
												style={{
													width: '228px',
													height: '36px',
													borderWidth: '3px',
													borderStyle: 'solid',
													borderColor: '#7A7A7A',
													borderRadius: '10px',
													backgroundColor: '#FFFFFF',
												}}
											>
												{/* Hover preview pill (shows the other tab on hover) */}
												<div
													ref={tabToggleHoverPillRef}
													aria-hidden="true"
													style={{
														position: 'absolute',
														top: '50%',
														left: 0,
														width: '85px',
														height: '17px',
														borderWidth: '2px',
														borderStyle: 'solid',
														borderColor: '#000000',
														borderRadius: '10px',
														backgroundColor: TAB_PILL_COLORS.search,
														pointerEvents: 'none',
														opacity: 0,
														transform: 'translateX(13px) translateY(-50%)',
														willChange: 'transform, opacity, background-color',
														transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
													}}
												/>
												{/* Sliding pill indicator - positioned at inbox (right) */}
												<div
													ref={tabTogglePillRef}
													style={{
														position: 'absolute',
														top: '50%',
														left: 0,
														width: '85px',
														height: '17px',
														borderWidth: '2px',
														borderStyle: 'solid',
														borderColor: '#000000',
														borderRadius: '10px',
														backgroundColor: '#CBE7D1',
														pointerEvents: 'none',
														transform: 'translateX(124px) translateY(-50%)',
														willChange: 'transform, background-color',
													}}
												/>
												{/* White overlay pill (visible only during hover-preview) */}
												<div
													ref={tabToggleWhitePillRef}
													aria-hidden="true"
													style={{
														position: 'absolute',
														top: '50%',
														left: 0,
														width: '85px',
														height: '17px',
														borderWidth: '2px',
														borderStyle: 'solid',
														borderColor: '#000000',
														borderRadius: '10px',
														backgroundColor: '#FFFFFF',
														pointerEvents: 'none',
														opacity: 0,
														transform: 'translateX(124px) translateY(-50%)',
														willChange: 'transform, opacity',
														transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
													}}
												/>
												<button
													type="button"
													className="relative z-10 flex-1 h-full flex items-center justify-center font-medium"
													style={{ fontSize: '14px' }}
													onMouseEnter={() => setHoveredTab('search')}
													onClick={() => transitionToTab('search')}
													aria-pressed={false}
												>
													<span
														className="inline-block opacity-100"
														style={{
															transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
														}}
													>
														Search
													</span>
												</button>
												<button
													type="button"
													className="relative z-10 flex-1 h-full flex items-center justify-center font-medium"
													style={{ fontSize: '14px' }}
													onMouseEnter={() => setHoveredTab('inbox')}
													onClick={() => transitionToTab('inbox')}
													aria-pressed={true}
												>
													<span
														className={`inline-block ${isTabPreviewingOther ? 'opacity-0' : 'opacity-100'}`}
														style={{
															display: 'inline-block',
															transform: 'translateX(2px)',
															transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
														}}
													>
														Inbox
													</span>
												</button>
											</div>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Search query display with back button - hidden when in map view */}
						{hasSearched &&
							activeSearchQuery &&
							!isMapView &&
							activeTab === 'search' &&
							(isSearchPending || isLoadingContacts || isRefetchingContacts) && (
								<div className="search-query-display mt-8">
									<div className="search-query-display-inner">
										<button
											onClick={handleEnhancedResetSearch}
											className="search-back-button"
											aria-label="Back to search"
										>
											<svg
												width="20"
												height="20"
												viewBox="0 0 20 20"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
												className="search-back-icon"
											>
												<path
													d="M12 16L6 10L12 4"
													stroke="currentColor"
													strokeWidth="1.5"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
											<span className="search-back-text">Back</span>
										</button>
										<div className="search-query-display-text">
											<span className="search-query-quote-left">&ldquo;</span>
											{activeSearchQuery}
											<span className="search-query-quote-right">&rdquo;</span>
										</div>
									</div>
								</div>
							)}

						{/* Show the mini search bar and tools when:
			    1. A search has been executed (normal case), OR
			    2. We're in fromHome mode with map view (pre-auth demo state) */}
						{((hasSearched && activeTab === 'search') || (fromHomeParam && isMapView)) &&
							(isMapView || (!isLoadingContacts && !isRefetchingContacts)) &&
							(() => {
								const mapTopSearchLabel = mapTopSearchDisplay.label.trim() || 'Search';
								const isCuratedTopSearch = mapTopSearchDisplay.kind === 'curated';
								const isMapTopSearchReengageAvailable =
									isMapView &&
									hasSearched &&
									activeSearchQuery.trim().length > 0;
								const isSplitCategoryTopSearch =
									mapTopSearchDisplay.kind === 'category' &&
									mapTopSearchDisplay.what.trim().length > 0 &&
									mapTopSearchDisplay.whereLabel.trim().length > 0;
								// Staged reveal for the scroll-to-map entry: hold the pill empty/white
								// until the For You results have loaded, then show the gradient pill.
								// If a For You search is user-disabled, keep the For You gradient chrome
								// visible instead of collapsing to the generic white inactive search pill.
								const showCuratedPill = isCuratedTopSearch && !pendingForYouReveal;
								const isCuratedSearchDeselected =
									isCuratedTopSearch && isSearchDeselectedByUser;
								const isCuratedSearchDeselectedHovered =
									isCuratedSearchDeselected && isDisengagedSearchHovered;
								const showCuratedDisengagedActivateOverlay =
									isCuratedSearchDeselectedHovered &&
									isMapTopSearchReengageAvailable;
								// When the user exits the focused search via the bar X, the bar drops
								// to a plain white pill showing the prior query grayed out.
								const showExitSearchButton =
									canDisengageMapSearch && isMapSearchEngaged;
								// Hovering the user-deselected (grayed) bar reveals the green
								// "Activate" affordance that re-engages the prior search.
								const showDisengagedActivate =
									!isCuratedTopSearch &&
									isSearchDeselectedByUser &&
									isDisengagedSearchHovered &&
									isMapTopSearchReengageAvailable;

								const searchBarBase = (
									<div
										className={`results-search-bar-wrapper w-full max-w-[650px] mx-auto px-4 ${
											// When the horizontal research strip is active (sm–lg desktop),
											// hide the mini search bar + helper text so the strip owns this area.
											showHorizontalResearchStrip ? 'sm:hidden xl:block' : ''
										} relative`}
										style={
											isMapView
												? {
														// In fullscreen map view we render this via a portal + outer fixed wrapper,
														// so keep this inner container relative for absolute children.
														position: 'relative',
														width: 'min(440px, calc(100vw - 120px))',
														maxWidth: '440px',
														padding: 0,
														backgroundColor: 'transparent',
														borderBottom: 'none',
													}
												: undefined
										}
									>
										<div
											className={`results-search-bar-inner ${
												hoveredContact && !isMapView ? 'invisible' : ''
											}`}
										>
											{isMapView ? (
												<div
													className="results-search-form"
													aria-label={`Active search: ${mapTopSearchLabel}`}
												>
													<div className="results-search-input-group">
														<div
															className="search-wave-container relative"
															role={
																isMapTopSearchReengageAvailable ? 'button' : undefined
															}
															aria-label={
																isMapTopSearchReengageAvailable
																	? `${
																			canDisengageMapSearch && isMapSearchEngaged
																				? 'Disable'
																				: 'Re-engage'
																		} ${mapTopSearchLabel} search`
																	: undefined
															}
															tabIndex={isMapTopSearchReengageAvailable ? 0 : undefined}
															title={
																isMapTopSearchReengageAvailable
																	? canDisengageMapSearch && isMapSearchEngaged
																		? 'Click to disable this search'
																		: 'Click to re-engage this search on the map'
																	: undefined
															}
															onClick={
																isMapTopSearchReengageAvailable
																	? handleMapTopSearchToggle
																	: undefined
															}
															onKeyDown={
																isMapTopSearchReengageAvailable
																	? (event) => {
																			if (event.key !== 'Enter' && event.key !== ' ')
																				return;
																			event.preventDefault();
																			handleMapTopSearchToggle();
																		}
																	: undefined
															}
															onMouseEnter={() =>
																setIsDisengagedSearchHovered(true)
															}
															onMouseLeave={() =>
																setIsDisengagedSearchHovered(false)
															}
															style={{
																cursor: isMapTopSearchReengageAvailable
																	? 'pointer'
																	: 'default',
															}}
														>
															<div
																className={`search-wave-input results-search-input !h-[49px] !border-[3px] !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus:ring-0 !focus:ring-offset-0 !ring-0 !outline-none !accent-transparent !border-black ${
																	showExitSearchButton ||
																	isCuratedSearchDeselectedHovered
																		? '!bg-[#A6C5F3]'
																		: '!bg-white'
																} !pr-[12px] !text-black`}
																style={{
																	accentColor: 'transparent',
																	cursor: isMapTopSearchReengageAvailable
																		? 'pointer'
																		: 'default',
																	letterSpacing: 0,
																	padding: 0,
																	userSelect: 'none',
																}}
															>
																<div
																	className="absolute left-[6px] top-1/2 z-10 flex -translate-y-1/2 items-center overflow-hidden rounded-[6px] border border-black"
																	style={{
																		width: 'calc(100% - 12px)',
																		height: '38px',
																		background:
																			showCuratedPill
																				? undefined
																				: showDisengagedActivate
																					? 'linear-gradient(90deg, #ADFFC2 0%, #EFFFF3 100%)'
																					: '#FFFFFF',
																	}}
																>
																	{showCuratedPill && (
																		<div
																			aria-hidden="true"
																			className={`search-gradient-button absolute inset-0 z-0 ${
																				isCuratedSearchDeselected
																					? 'for-you-curated-search-gradient--grayscale'
																					: ''
																			}`}
																			style={{ transition: 'filter 150ms ease' }}
																		/>
																	)}
																	{showCuratedPill ? (
																		<>
																			<div
																				className={`relative z-10 flex h-full w-full items-center px-[24px] font-secondary text-[13px] font-bold leading-none text-white ${
																					showExitSearchButton ? 'pr-[40px]' : ''
																				}`}
																			>
																				{mapTopSearchDisplay.label}
																			</div>
																			{showCuratedDisengagedActivateOverlay && (
																				<div
																					className="absolute inset-0 z-20 flex h-full w-full min-w-0 items-center px-[24px] font-secondary text-[13px] font-bold leading-none text-black/40"
																					style={{
																						background:
																							'linear-gradient(90deg, #ADFFC2 0%, #EFFFF3 100%)',
																					}}
																				>
																					<button
																						type="button"
																						aria-label={`Activate ${mapTopSearchLabel}`}
																						title="Activate this search"
																						onClick={(event) => {
																							event.stopPropagation();
																							handleMapTopSearchReengage();
																						}}
																						className="absolute left-[12px] top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-[10px] bg-[#D9D9D9] px-[10px] py-[6px] font-secondary text-[13px] font-bold leading-none text-black/60 transition-colors hover:bg-[#cfcfcf] hover:text-black/80"
																					>
																						Activate
																					</button>
																					<span className="truncate">
																						{mapTopSearchLabel}
																					</span>
																				</div>
																			)}
																		</>
																	) : isSearchDeselectedByUser ? (
																		<div className="relative flex h-full w-full min-w-0 items-center px-[24px] font-secondary text-[13px] font-bold leading-none text-black/40">
																			{showDisengagedActivate && (
																				<button
																					type="button"
																					aria-label={`Activate ${mapTopSearchLabel}`}
																					title="Activate this search"
																					onClick={(event) => {
																						event.stopPropagation();
																						handleMapTopSearchReengage();
																					}}
																					className="absolute left-[12px] top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-[10px] bg-[#D9D9D9] px-[10px] py-[6px] font-secondary text-[13px] font-bold leading-none text-black/60 transition-colors hover:bg-[#cfcfcf] hover:text-black/80"
																				>
																					Activate
																				</button>
																			)}
																			<span className="truncate">
																				{mapTopSearchLabel}
																			</span>
																		</div>
																	) : pendingForYouReveal ? (
																		<div className="flex h-full w-full items-center px-[24px]" />
																	) : isSplitCategoryTopSearch &&
																	  mapTopSearchDisplay.kind === 'category' ? (
																		<div className="flex h-full w-full items-center font-secondary text-[13px] font-bold leading-none text-black">
																			<div className="flex h-full min-w-0 basis-[46%] items-center justify-start pl-[20px] pr-[8px]">
																				<MapBottomSearchCategoryIcon
																					aria-hidden="true"
																					active
																					viewBox="2 0 31 24"
																					width={28}
																					height={22}
																					className="mr-[13px] flex-shrink-0"
																				/>
																				<span className="min-w-0 truncate">
																					{mapTopSearchDisplay.what}
																				</span>
																			</div>
																			<div className="flex h-full min-w-0 flex-1 items-center justify-start pl-[24px] pr-[44px]">
																				<span className="min-w-0 truncate">
																					{mapTopSearchDisplay.whereLabel}
																				</span>
																			</div>
																		</div>
																	) : (
																		<div
																			className={`flex h-full w-full min-w-0 items-center px-[24px] font-secondary text-[13px] font-bold leading-none text-black ${
																				showExitSearchButton ? 'pr-[40px]' : ''
																			}`}
																		>
																			<span className="truncate">
																				{mapTopSearchLabel}
																			</span>
																		</div>
																	)}
																</div>
																{showExitSearchButton && (
																	<button
																		type="button"
																		aria-label="Exit search"
																		onClick={(event) => {
																			event.stopPropagation();
																			handleEmptyMapClick();
																		}}
																		className="absolute right-[14px] top-1/2 z-20 flex h-[23.147px] w-[24.927px] -translate-y-1/2 items-center justify-center rounded-[5.342px] bg-[#EBEBEB] text-[#B1ABAB] opacity-80 transition-opacity hover:opacity-100"
																	>
																		<span className="text-[16px] leading-none -translate-y-[1px]">
																			×
																		</span>
																	</button>
																)}
															</div>
														</div>
													</div>
													{renderDesktopSearchDropdowns()}
												</div>
											) : (
												<Form {...form}>
													<form
														onSubmit={async (e) => {
															e.preventDefault();
															await ensureNonEmptyDashboardSearchOnBlankSubmit();
															if (!isSignedIn) {
																if (hasProblematicBrowser) {
																	if (typeof window !== 'undefined') {
																		sessionStorage.setItem(
																			'redirectAfterSignIn',
																			window.location.pathname
																		);
																	}
																	window.location.href = urls.signIn.index;
																} else {
																	openSignIn();
																}
															} else {
																form.handleSubmit(onSubmit)(e);
															}
														}}
														className="results-search-form"
													>
														<FormField
															control={form.control}
															name="searchText"
															render={({ field }) => (
																<FormItem className="w-full">
																	<FormControl>
																		<div className="results-search-input-group">
																			<div
																				className={`search-wave-container relative ${
																					isSearchPending ||
																					isLoadingContacts ||
																					isRefetchingContacts
																						? 'search-wave-loading'
																						: ''
																				}`}
																			>
																				<Input
																					className={`search-wave-input results-search-input !h-[49px] !border-[3px] !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus:ring-0 !focus:ring-offset-0 !ring-0 !outline-none !accent-transparent !border-black ${
																						isMapView ? '!pr-[12px]' : '!pr-[60px]'
																					} ${
																						activeSection ? '!bg-[#F3F3F3]' : '!bg-white'
																					} ${
																						field.value === activeSearchQuery &&
																						(field.value?.trim()?.length ?? 0) > 0
																							? 'text-center'
																							: 'text-left'
																					} ${
																						!isMobile
																							? 'text-transparent placeholder:text-transparent'
																							: ''
																					}`}
																					placeholder='Refine your search... e.g. "Music venues in North Carolina"'
																					style={{ accentColor: 'transparent' }}
																					autoComplete="off"
																					autoCorrect="off"
																					autoCapitalize="off"
																					spellCheck="false"
																					{...field}
																				/>
																				{!isMobile && (
																					<div
																						className={`absolute left-[6px] top-1/2 -translate-y-1/2 flex items-center rounded-[6px] z-10 group ${
																							activeSection
																								? 'bg-[#F3F3F3] border border-transparent'
																								: 'bg-white border border-black'
																						}`}
																						style={{
																							width: isMapView
																								? 'calc(100% - 12px)'
																								: 'calc(100% - 66px)',
																							height: '38px',
																						}}
																					>
																						{/* Sliding active section indicator for mini search bar */}
																						<div
																							ref={miniActiveSectionIndicatorRef}
																							className="absolute top-0 left-0 h-full w-1/3 bg-white border border-black rounded-[6px] pointer-events-none z-0"
																							style={{
																								opacity: 0,
																								willChange: 'transform',
																							}}
																						/>
																						<div
																							className={`flex-1 flex items-center justify-start border-r border-transparent ${
																								!activeSection
																									? 'group-hover:border-black/10'
																									: ''
																							} h-full min-w-0 relative pl-[16px] pr-1 mini-search-section-why`}
																							onClick={() => {
																								if (isFromHomeDemoMode) {
																									setShowFreeTrialPrompt(true);
																									return;
																								}
																								setActiveSection('why');
																							}}
																						>
																							<div className="w-full h-full flex items-center text-left text-[13px] font-bold font-secondary truncate p-0 relative z-10 cursor-pointer">
																								{whyValue
																									? whyValue.replace(/[\[\]]/g, '')
																									: 'Why'}
																							</div>
																						</div>
																						<div
																							className={`flex-1 flex items-center justify-start border-r border-transparent ${
																								!activeSection
																									? 'group-hover:border-black/10'
																									: ''
																							} h-full min-w-0 relative pl-[16px] pr-1 mini-search-section-what`}
																							onClick={() => setActiveSection('what')}
																						>
																							<input
																								value={whatValue}
																								onChange={(e) =>
																									setWhatValue(e.target.value)
																								}
																								className="w-full h-full text-left bg-transparent border-none outline-none text-[13px] font-bold font-secondary overflow-hidden placeholder:text-gray-400 p-0 focus:ring-0 cursor-pointer relative z-10"
																								style={{
																									maskImage:
																										'linear-gradient(to right, black 75%, transparent 100%)',
																									WebkitMaskImage:
																										'linear-gradient(to right, black 75%, transparent 100%)',
																								}}
																								placeholder="What"
																								onFocus={(e) => {
																									setActiveSection('what');
																									const target = e.target;
																									setTimeout(
																										() => target.setSelectionRange(0, 0),
																										0
																									);
																								}}
																							/>
																						</div>
																						<div
																							className={`flex-1 flex items-center justify-end h-full min-w-0 relative ${
																								isMapView ? 'pr-[12px]' : 'pr-[29px]'
																							} pl-[16px] mini-search-section-where`}
																							onClick={() => {
																								if (isFromHomeDemoMode) {
																									setShowFreeTrialPrompt(true);
																									return;
																								}
																								setActiveSection('where');
																							}}
																						>
																							<input
																								value={whereValue}
																								onChange={(e) => {
																									if (isFromHomeDemoMode) return;
																									setWhereValue(e.target.value);
																									setIsNearMeLocation(false);
																								}}
																								onKeyDown={(e) => {
																									if (e.key === 'Enter') {
																										e.preventDefault();
																										void triggerSearchWithCurrentValues();
																									}
																								}}
																								readOnly={isFromHomeDemoMode}
																								className="w-full h-full text-left bg-transparent border-none outline-none text-[13px] font-bold font-secondary overflow-hidden placeholder:text-gray-400 p-0 focus:ring-0 cursor-pointer relative z-10"
																								style={{
																									maskImage:
																										'linear-gradient(to right, black 75%, transparent 100%)',
																									WebkitMaskImage:
																										'linear-gradient(to right, black 75%, transparent 100%)',
																								}}
																								placeholder="Where"
																								onFocus={(e) => {
																									if (isFromHomeDemoMode) {
																										e.target.blur();
																										setShowFreeTrialPrompt(true);
																										return;
																									}
																									setActiveSection('where');
																									const target = e.target;
																									setTimeout(
																										() =>
																											target.setSelectionRange(
																												0,
																												target.value.length
																											),
																										0
																									);
																								}}
																							/>
																						</div>
																					</div>
																				)}
																				{!isMapView && (
																					<button
																						type="submit"
																						className="absolute right-[6px] top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors cursor-pointer z-20 hover:bg-[#a3d9a5]"
																						style={{
																							width: '48px',
																							height: '37px',
																							backgroundColor: '#B8E4BE',
																							border: '1px solid #5DAB68',
																							borderTopRightRadius: '6px',
																							borderBottomRightRadius: '6px',
																							borderTopLeftRadius: '0',
																							borderBottomLeftRadius: '0',
																						}}
																						aria-label="Search"
																					>
																						<div
																							style={{
																								transform: 'scale(0.75)',
																								display: 'flex',
																							}}
																						>
																							<SearchIconDesktop />
																						</div>
																					</button>
																				)}
																			</div>
																			{renderDesktopSearchDropdowns()}
																		</div>
																	</FormControl>
																</FormItem>
															)}
														/>
														{/* Generate action removed; awaiting left-side SVG submit icon */}
													</form>
													{!isMapView && (
														<div className="w-full flex flex-col items-center gap-2 mt-2 results-helper-text">
															<span
																className="font-secondary text-center"
																style={{
																	fontSize: '13px',
																	fontWeight: 400,
																	color: '#7f7f7f',
																}}
															>
																Select who you want to contact
															</span>
															{/* Hidden: Import button
											<div className="flex justify-center">
												<ContactTSVUploadDialog
													isAdmin={user?.role === 'admin'}
													triggerText="Import"
													asTextTrigger
												/>
											</div>
											*/}
														</div>
													)}
												</Form>
											)}
										</div>
										{hoveredContact && !isMobile && !isMapView && (
											<div className="absolute inset-0 z-[90] pointer-events-none bg-white hidden xl:flex items-start justify-center">
												<div className="w-full max-w-[1132px] mx-auto px-4 py-3 text-center">
													<div className="font-secondary font-bold text-[19px] leading-tight truncate">
														{`${hoveredContact.firstName || ''} ${
															hoveredContact.lastName || ''
														}`.trim() ||
															hoveredContact.name ||
															hoveredContact.company ||
															'—'}
													</div>
													<div className="mt-1 w-full flex justify-center">
														<div
															className="inline-flex items-center justify-center h-[19px] rounded-[8px] px-2 gap-1 whitespace-nowrap"
															style={{
																backgroundColor: isRestaurantTitle(
																	getContactCategoryDisplaySource(hoveredContact)
																)
																	? '#C3FBD1'
																	: isCoffeeShopTitle(
																				getContactCategoryDisplaySource(hoveredContact)
																		  )
																		? '#D6F1BD'
																		: isMusicVenueTitle(
																					getContactCategoryDisplaySource(hoveredContact)
																			  )
																			? '#B7E5FF'
																			: isMusicFestivalTitle(
																						getContactCategoryDisplaySource(
																							hoveredContact
																						)
																				  )
																				? '#C1D6FF'
																				: isWeddingPlannerTitle(
																							getContactCategoryDisplaySource(
																								hoveredContact
																							)
																					  ) ||
																					  isWeddingVenueTitle(
																							getContactCategoryDisplaySource(
																								hoveredContact
																							)
																					  )
																					? '#FFF8DC'
																					: isWineBeerSpiritsTitle(
																								getContactCategoryDisplaySource(
																									hoveredContact
																								)
																						  )
																						? '#BFC4FF'
																						: '#E8EFFF',
																border: '0.7px solid #000000',
															}}
														>
															{isRestaurantTitle(
																getContactCategoryDisplaySource(hoveredContact)
															) && (
																<RestaurantsIcon size={12} className="flex-shrink-0" />
															)}
															{isCoffeeShopTitle(
																getContactCategoryDisplaySource(hoveredContact)
															) && <CoffeeShopsIcon size={7} />}
															{isMusicVenueTitle(
																getContactCategoryDisplaySource(hoveredContact)
															) && (
																<MusicVenuesIcon size={12} className="flex-shrink-0" />
															)}
															{isMusicFestivalTitle(
																getContactCategoryDisplaySource(hoveredContact)
															) && <FestivalsIcon size={12} className="flex-shrink-0" />}
															{(isWeddingPlannerTitle(
																getContactCategoryDisplaySource(hoveredContact)
															) ||
																isWeddingVenueTitle(
																	getContactCategoryDisplaySource(hoveredContact)
																)) && <WeddingPlannersIcon size={12} />}
															{isWineBeerSpiritsTitle(
																getContactCategoryDisplaySource(hoveredContact)
															) && (
																<WineBeerSpiritsIcon
																	size={12}
																	className="flex-shrink-0"
																/>
															)}
															<span className="text-[14px] leading-none font-secondary font-medium">
																{isRestaurantTitle(
																	getContactCategoryDisplaySource(hoveredContact)
																)
																	? 'Restaurant'
																	: isCoffeeShopTitle(
																				getContactCategoryDisplaySource(hoveredContact)
																		  )
																		? 'Coffee Shop'
																		: isMusicVenueTitle(
																					getContactCategoryDisplaySource(hoveredContact)
																			  )
																			? 'Music Venue'
																			: isMusicFestivalTitle(
																						getContactCategoryDisplaySource(
																							hoveredContact
																						)
																				  )
																				? 'Music Festival'
																				: isWeddingVenueTitle(
																							getContactCategoryDisplaySource(
																								hoveredContact
																							)
																					  )
																					? 'Wedding Venue'
																					: isWeddingPlannerTitle(
																								getContactCategoryDisplaySource(
																									hoveredContact
																								)
																						  )
																						? 'Wedding Planner'
																						: isWineBeerSpiritsTitle(
																									getContactCategoryDisplaySource(
																										hoveredContact
																									)
																							  )
																							? getWineBeerSpiritsLabel(
																									getContactCategoryDisplaySource(
																										hoveredContact
																									)
																								)
																							: getContactCategoryDisplaySource(
																									hoveredContact
																								) || '—'}
															</span>
														</div>
													</div>
													{((hoveredContact.firstName &&
														hoveredContact.firstName.length > 0) ||
														(hoveredContact.lastName &&
															hoveredContact.lastName.length > 0) ||
														(hoveredContact.name && hoveredContact.name.length > 0)) &&
													hoveredContact.company ? (
														<div
															className="mt-1 text-[14px] leading-tight truncate"
															style={{ color: '#838383' }}
														>
															{hoveredContact.company}
														</div>
													) : null}
													<div
														className="mt-1 text-[14px] leading-tight truncate"
														style={{ color: '#838383' }}
													>
														{[hoveredContact.city, hoveredContact.state]
															.filter(Boolean)
															.join(', ') || '—'}
													</div>
												</div>
											</div>
										)}
									</div>
								);

								const mapTopBackdropBox = isMapView ? (
									<div
										aria-hidden="true"
										className="fixed left-0 right-0 flex justify-center pointer-events-none map-overlay-appear"
										style={{
											top: `${MAP_VIEW_TOP_BACKDROP_BOX_TOP_PX}px`,
											zIndex: 110,
											// Mid chrome: center over the map strip left of the results panel.
											paddingRight: isMidMapChrome
												? `${MAP_VIEW_RIGHT_PANEL_FOOTPRINT_PX}px`
												: undefined,
										}}
									>
										<div
											style={{
												transform: `scale(${MAP_VIEW_UI_SCALE})`,
												transformOrigin: 'top center',
												width: `${MAP_VIEW_TOP_BACKDROP_BOX_WIDTH_PX}px`,
												height: `${MAP_VIEW_TOP_BACKDROP_BOX_HEIGHT_PX}px`,
												borderRadius: '8px',
												backgroundColor: topNavScheme.box,
												opacity: 0.9,
											}}
										/>
									</div>
								) : null;

								const mapTopOutlineBox = isMapView ? (
									<div
										className="fixed left-0 right-0 flex justify-center pointer-events-none map-overlay-appear"
										style={{
											top: `${MAP_VIEW_SEARCH_BAR_TOP_PX}px`,
											zIndex: 115,
											paddingRight: isMidMapChrome
												? `${MAP_VIEW_RIGHT_PANEL_FOOTPRINT_PX}px`
												: undefined,
										}}
									>
										<div
											className="relative"
											style={{
												transform: `scale(${MAP_VIEW_UI_SCALE})`,
												transformOrigin: 'top center',
												width: `${MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX}px`,
												maxWidth: `${MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX}px`,
												height: `${MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX}px`,
											}}
										>
											<div
												className="pointer-events-auto"
												style={{
													position: 'absolute',
													right: `calc(100% + ${MAP_VIEW_TOP_OUTLINE_BOX_LEFT_GAP_PX}px)`,
													top: '50%',
													transform: 'translateY(-50%)',
													width: `${MAP_VIEW_TOP_OUTLINE_BOX_WIDTH_PX}px`,
													height: `${MAP_VIEW_TOP_OUTLINE_BOX_HEIGHT_PX}px`,
													border: '1px solid #000',
													borderRadius: '8px',
													boxSizing: 'border-box',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'space-around',
													padding: '0 6px',
													color: '#050505',
												}}
											>
												{(
													[
														{
															key: 'playbook',
															Icon: DashboardActionBarPlaybookIcon,
															label: 'Playbook',
															width: 22,
															height: 18,
														},
														{
															key: 'folder',
															Icon: DashboardActionBarFolderIcon,
															label: 'Folder',
															width: 22,
															height: 13,
														},
											] as const
										).map(({ key, Icon, label, width, height }) => {
											const isOpen = openMapTopAction === key;
											return (
												<button
													key={key}
													type="button"
													ref={
														key === 'playbook'
															? mapTopStrategyButtonRef
															: mapTopCampaignsFolderButtonRef
													}
													aria-label={label}
													aria-haspopup="dialog"
													aria-expanded={isOpen}
													onClick={() => toggleMapTopAction(key)}
													style={{
														background: 'none',
														border: 'none',
																padding: '2px 4px',
																margin: 0,
																display: 'flex',
																alignItems: 'center',
														justifyContent: 'center',
														cursor: 'pointer',
														color: '#050505',
														opacity: isOpen ? 1 : 0.55,
														transition: 'opacity 150ms ease',
													}}
												>
															<Icon width={width} height={height} />
														</button>
													);
												})}
											</div>
											<div
												className="pointer-events-auto"
												style={{
													position: 'absolute',
													left: `calc(100% + ${MAP_VIEW_TOP_OUTLINE_BOX_RIGHT_GAP_PX}px)`,
													top: '50%',
													transform: 'translateY(-50%)',
													width: `${MAP_VIEW_TOP_OUTLINE_BOX_RIGHT_WIDTH_PX}px`,
													height: `${MAP_VIEW_TOP_OUTLINE_BOX_RIGHT_HEIGHT_PX}px`,
													border: '1px solid #000',
													borderRadius: '8px',
													boxSizing: 'border-box',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'space-around',
													padding: '0 8px',
													color: '#050505',
												}}
											>
												{(
													[
														{
															key: 'star',
															Icon: DashboardActionBarStarIcon,
															label: 'Opportunities',
															width: 21,
															height: 20,
														},
														{
															key: 'envelope',
															Icon: DashboardActionBarEnvelopeIcon,
															label: 'Messages',
															width: 22,
															height: 13,
														},
											] as const
										).map(({ key, Icon, label, width, height }) => {
											const isOpen = openMapTopAction === key;
											return (
												<button
													key={key}
													type="button"
													ref={
														key === 'star'
															? mapTopOpportunitiesButtonRef
															: mapTopResponsesButtonRef
													}
													aria-label={label}
													aria-haspopup="dialog"
													aria-expanded={isOpen}
													onClick={() => toggleMapTopAction(key)}
													style={{
														background: 'none',
														border: 'none',
																padding: '2px 4px',
																margin: 0,
																display: 'flex',
																alignItems: 'center',
														justifyContent: 'center',
														cursor: 'pointer',
														color: '#050505',
														opacity: isOpen ? 1 : 0.55,
														transition: 'opacity 150ms ease',
													}}
														>
															<Icon width={width} height={height} />
														</button>
													);
												})}
											</div>
										</div>
									</div>
								) : null;

								// mapCampaignName resolves to the campaign currently scoping the dashboard
								// search (or '' while still loading). Declared here so the "Searching New"
								// pill below can preview the "Filtering in {campaign}" destination on hover.
								const mapCampaignName = dashboardSearchCampaign?.name || '';

								// Persistent "Searching New" status pill, centered directly below the
								// map-view search bar. When scoped to a campaign, it toggles back to
								// that campaign's All tab.
								// On hover (and keyboard focus) the pill previews its click target by
								// morphing into the campaign's "Filtering in {campaign}" look, so users
								// understand they're about to leave search for the campaign view before
								// they click.
								const mapTopSearchingPill =
									isMapView &&
									!isMobile &&
									(!isSearchDeselectedByUser || isCuratedTopSearch) ? (
										<div
											className="fixed left-0 right-0 flex justify-center pointer-events-none map-overlay-appear"
											style={{
												top: `${
													MAP_VIEW_SEARCH_BAR_TOP_PX +
													MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX * MAP_VIEW_UI_SCALE +
													10
												}px`,
												zIndex: 115,
												paddingRight: isMidMapChrome
													? `${MAP_VIEW_RIGHT_PANEL_FOOTPRINT_PX}px`
													: undefined,
											}}
										>
											<MapStatusLoadingPill
												type="button"
												aria-label={
													mapCampaignName
														? `Open all contacts in ${mapCampaignName}`
														: 'Open all campaign contacts'
												}
												isBusy={isMapStatusPillBusy}
												disabled={!mapCampaignId}
												tabIndex={mapCampaignId ? 0 : -1}
												onPointerEnter={() => mapCampaignId && setIsSearchingPillHovered(true)}
												onPointerLeave={() => setIsSearchingPillHovered(false)}
												onFocus={() => mapCampaignId && setIsSearchingPillHovered(true)}
												onBlur={() => setIsSearchingPillHovered(false)}
												onClick={() => navigateToCampaignRouteFromSearch('all')}
												style={{
													appearance: 'none',
													border: 'none',
													margin: 0,
													transform: `scale(${MAP_VIEW_UI_SCALE})`,
													transformOrigin: 'top center',
													display: 'inline-flex',
													height: '33px',
													padding: '7px 8px 7px 12px',
													alignItems: 'center',
													gap: '8px',
													borderRadius: '9999px',
													backgroundColor:
														isSearchingPillHovered && mapCampaignName ? '#CDEFCF' : '#B9EAF1',
													fontFamily: 'Inter, sans-serif',
													color: '#000000',
													whiteSpace: 'nowrap',
													cursor: mapCampaignId ? 'pointer' : 'default',
													pointerEvents: mapCampaignId ? 'auto' : 'none',
													transition: 'background-color 150ms ease',
												}}
											>
												{isSearchingPillHovered && mapCampaignName ? (
													<>
														<span
															style={{ color: '#000', fontSize: '15px', fontWeight: 600, lineHeight: 1 }}
														>
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
																<rect y="2" width="30" height="15" rx="1" fill={topNavScheme.icon} />
																<path
																	d="M0 2C0 0.89543 0.895431 0 2 0H13C14.1046 0 15 0.895431 15 2V4C15 4.55228 14.5523 5 14 5H1C0.447715 5 0 4.55228 0 4V2Z"
																	fill={topNavScheme.icon}
																/>
															</svg>
															<span
																className="min-w-0 truncate"
																style={{
																	color: '#000',
																	fontSize: '15px',
																	fontWeight: 600,
																	lineHeight: 1,
																}}
															>
																{mapCampaignName}
															</span>
														</span>
													</>
												) : (
													<>
														<span
															style={{ color: '#000', fontSize: '15px', fontWeight: 600, lineHeight: 1 }}
														>
															Searching
														</span>
														<span
															style={{
																display: 'inline-flex',
																alignItems: 'center',
																justifyContent: 'center',
																gap: '6px',
																minWidth: '85px',
																height: '19px',
																boxSizing: 'border-box',
																background: '#EAF6FF',
																borderRadius: '4px',
																padding: '0 8px',
															}}
														>
															<MapBottomSearchProfileIcon
																aria-hidden="true"
																viewBox="0 0 28 28"
																textColor="transparent"
																iconColor="#3498DB"
																style={{ width: 16, height: 16, flexShrink: 0, display: 'block' }}
															/>
															<span
																style={{ color: '#000', fontSize: '15px', fontWeight: 600, lineHeight: 1 }}
															>
																New
															</span>
														</span>
													</>
												)}
											</MapStatusLoadingPill>
										</div>
									) : null;

								const mapTopActionDropdowns = isMapView ? (
									<>
										{openMapTopAction === 'playbook' ? (
											<div
												data-slot="dashboard-map-top-strategy-dropdown"
												className="fixed left-0 right-0 flex justify-center pointer-events-none map-overlay-appear"
												style={{
													top: `${MAP_VIEW_TOP_ACTION_DROPDOWN_TOP_PX}px`,
													zIndex: 128,
												}}
											>
												<div
													ref={mapTopStrategyDropdownRef}
													role="dialog"
													aria-label="Strategy"
													className="pointer-events-auto"
													style={{ transformOrigin: 'top center' }}
												>
													<DashboardStrategyBox
														onSearchContacts={() => {
															setOpenMapTopAction(null);
															handleMapBottomForYouSubmit();
														}}
													/>
												</div>
											</div>
										) : null}

										{openMapTopAction === 'folder' ? (
											<div
												data-slot="dashboard-map-top-campaigns-dropdown"
												className="fixed left-0 right-0 flex justify-center pointer-events-none map-overlay-appear"
												style={{
													top: `${MAP_VIEW_TOP_ACTION_DROPDOWN_TOP_PX}px`,
													zIndex: 128,
												}}
											>
												<div
													ref={mapTopCampaignsDropdownRef}
													role="dialog"
													aria-label="Campaign folders"
													className="campaigns-table-wrapper dashboard-recent-campaigns pointer-events-auto w-full max-w-[960px] mx-auto px-4"
													style={{
														transformOrigin: 'top center',
														// The initial dashboard renders at the viewport-aware initial-zoom baseline;
														// cancel the per-monitor map-view zoom so this dropdown matches it on every screen.
														zoom: `calc(var(${DASHBOARD_INITIAL_ZOOM_VAR}, ${DASHBOARD_INITIAL_ZOOM}) / var(--murmur-dashboard-zoom, ${DASHBOARD_MAP_ZOOM_DEFAULT}))`,
													}}
												>
													<div className="w-full flex flex-col items-center">
														<CampaignsTable
															mockState={campaignsMockState}
															onMockStateChange={setCampaignsMockState}
															defaultOpenCampaignId={fromCampaign?.id ?? activeCampaignId ?? null}
															defaultOpenContactsFolder
															onFinderOpenChange={setIsCampaignFinderOpen}
															enableRowDelete
															onSelectCampaign={(campaignId) => {
																handleSelectDashboardCampaign(campaignId);
																setOpenMapTopAction(null);
															}}
														/>
													</div>
												</div>
											</div>
										) : null}

										{openMapTopAction === 'star' ? (
											<div
												data-slot="dashboard-map-top-opportunities-popup"
												className="fixed left-0 right-0 flex justify-center pointer-events-none map-overlay-appear"
												style={{
													top: `${MAP_VIEW_TOP_ACTION_DROPDOWN_TOP_PX}px`,
													zIndex: 128,
												}}
											>
												<div
													ref={mapTopOpportunitiesPopupRef}
													role="dialog"
													aria-label="Opportunities"
													className="pointer-events-auto"
													style={{ transformOrigin: 'top center' }}
												>
													<DashboardOpportunitiesWidget
														enabled={isSignedIn === true}
														mockState={opportunitiesMockState}
													/>
												</div>
											</div>
										) : null}

										{openMapTopAction === 'envelope' ? (
											<div
												data-slot="dashboard-map-top-responses-popup"
												className="fixed left-0 right-0 flex justify-center pointer-events-none map-overlay-appear"
												style={{
													top: `${MAP_VIEW_TOP_ACTION_DROPDOWN_TOP_PX}px`,
													zIndex: 128,
												}}
											>
												<div
													ref={mapTopResponsesPopupRef}
													role="dialog"
													aria-label="Responses"
													className="pointer-events-auto"
												>
													<DashboardResponsesWidget
														enabled={isSignedIn === true}
														mockState={responsesMockState}
														previewPlacement="below"
													/>
												</div>
											</div>
										) : null}
									</>
								) : null;

								const searchBar = isMapView ? (
									<div
										className="fixed left-0 right-0 flex justify-center pointer-events-none map-overlay-appear"
										style={{
											top: `${MAP_VIEW_SEARCH_BAR_TOP_PX}px`,
											zIndex: 120,
											paddingRight: isMidMapChrome
												? `${MAP_VIEW_RIGHT_PANEL_FOOTPRINT_PX}px`
												: undefined,
										}}
									>
										<div
											className="pointer-events-auto"
											style={{
												transform: `scale(${MAP_VIEW_UI_SCALE})`,
												transformOrigin: 'top center',
											}}
										>
											{searchBarBase}
										</div>
									</div>
								) : (
									searchBarBase
								);

								const mapSelectGrabberTool =
									// Compressed chrome: the bottom sheet owns the lower half, so the
									// tall left rail has no room — hide it (matches mobile).
									isMapView && !isMobile && !isCompressedMapChrome ? (
										<div
											className="fixed z-[130] pointer-events-none"
											onMouseEnter={() => setIsMapShowingRailHovered(true)}
											onMouseLeave={() => setIsMapShowingRailHovered(false)}
											style={{
												left: `${MAP_SELECT_GRAB_LEFT_PX}px`,
												// The visible column starts `TOP_EXTENT * scale` above this origin.
												// Pin that visual top to the canonical side-panel Y.
												top: `calc(${MAP_VIEW_SIDE_PANEL_TOP_CSS} + ${mapSelectGrabOriginOffsetPx}px - ${MAP_SELECT_GRAB_VISUAL_TOP_NUDGE_UP_CSS})`,
												transform: `scale(${mapSelectGrabViewScale})`,
												transformOrigin: 'top left',
												opacity: isMapShowingRailHovered ? 1 : 0.4,
												transition: 'opacity 0.18s ease',
											}}
										>
											<div
												aria-hidden="true"
												style={{
													position: 'absolute',
													left: '-2px',
													width: '60px',
													top: `-${
														MAP_SELECT_GRAB_TOP_EXTENT_PX + 40
													}px`,
													height: `${MAP_SELECT_GRAB_TOP_EXTENT_PX + 200}px`,
													pointerEvents: 'auto',
												}}
											/>
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
												{isSelectMapToolActive ? 'Select' : 'Showing'}
											</div>
											<MapSelectGrabTallStackBox
												className="absolute pointer-events-none"
												isSelectActive={isSelectMapToolActive}
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
																opacity: 0.9,
															}
														: {}),
												}}
											/>
											<MapSelectGrabStackBox
												className="absolute left-0 pointer-events-none"
												isSelectActive={isSelectMapToolActive}
												selectedContent={<StackBoxSelectStarIcon />}
												hoverLabel="Opportunities"
												inactiveContent={
													<MapSelectGrabStackTile backgroundColor="#EDF2F0">
														<MapStackStarIcon fill="#EDF2F0" stroke="#9E9E9E" />
													</MapSelectGrabStackTile>
												}
												onActiveChange={handleMapGrabEventsActiveChange}
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
												hoverLabel="People"
												inactiveContent={
													<MapSelectGrabStackTile backgroundColor="#EDF2F0">
														<MapStackBlueSparkIcon fill="#9E9E9E" stroke="#EDF2F0" />
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
									) : null;

								const searchThisAreaCta =
									isMapView && isSearchThisAreaCtaVisible ? (
										<div
											className="fixed z-[9999] pointer-events-none left-0 right-0 flex justify-center"
											style={{
												top: `${SEARCH_THIS_AREA_BUTTON_TOP_PX}px`,
											}}
										>
											<div
												className="pointer-events-auto"
												style={{
													transform: `scale(${MAP_VIEW_UI_SCALE})`,
													transformOrigin: 'top center',
												}}
											>
												<button
													type="button"
													className="flex items-center justify-center font-secondary font-medium text-[17px] leading-none text-black"
													style={{
														width: '212px',
														height: '39px',
														opacity: 0.9,
														backgroundColor: '#AFD6EF',
														border: '2px solid #347AB3',
														borderRadius: '11px',
														boxSizing: 'border-box',
													}}
													onClick={handleSearchThisAreaClick}
												>
													Search this area
												</button>
											</div>
										</div>
									) : null;

								// mapCampaignId is computed once at component scope (and drives the
								// hover-prefetch handlers wired onto these tabs below).
								// '' — not the literal "Campaign" — while the active campaign is still
								// resolving, so the tab below renders nothing until a real name loads.
								const campaignMapTopTabs = isMapView ? (
									<div
										data-slot="campaign-map-top-tabs"
										className="fixed left-0 right-0 z-[9999] flex items-center justify-center pointer-events-none map-overlay-appear"
										style={{
											top: '12px',
											height: '24px',
											paddingRight: isMidMapChrome
												? `${MAP_VIEW_RIGHT_PANEL_FOOTPRINT_PX}px`
												: undefined,
										}}
									>
										<div
											className="pointer-events-auto relative"
											style={{
												width: `${CAMPAIGN_MAP_TOP_TABS_WIDTH_PX}px`,
												maxWidth: isMidMapChrome
													? `calc(100vw - ${MAP_VIEW_RIGHT_PANEL_FOOTPRINT_PX}px - 64px)`
													: 'calc(100vw - 64px)',
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
													className="bg-transparent p-0 m-0 border-0 cursor-default inline-flex items-center justify-center h-full"
													style={{
														color: '#1F1F1F',
														fontFamily: 'Inter, sans-serif',
														fontSize: '17px',
														fontStyle: 'normal',
														fontWeight: 600,
														lineHeight: '14px',
													}}
												>
													Search
												</button>
												<button
													type="button"
													className="bg-transparent p-0 m-0 border-0 cursor-pointer inline-flex items-center justify-center h-full translate-y-[2px]"
													style={{
														color: '#2C2C2C',
														fontFamily: 'Inter, sans-serif',
														fontSize: '17px',
														fontStyle: 'normal',
														fontWeight: 500,
														lineHeight: '14px',
														opacity: 0.5,
													}}
													onPointerEnter={handleCampaignTabPointerEnter}
													onFocus={handleCampaignTabPointerEnter}
													onPointerLeave={handleCampaignTabPointerLeave}
													onPointerDown={handleCampaignTabPointerDown}
													onClick={() => navigateToCampaignRouteFromSearch('write')}
												>
													Write
												</button>
												<button
													type="button"
													aria-label={mapCampaignName ? `Open ${mapCampaignName}` : 'Open campaign'}
													title={mapCampaignName || undefined}
													className="bg-transparent p-0 m-0 border-0 cursor-pointer inline-flex min-w-0 items-center justify-center gap-[7px] h-full"
													style={{
														color: '#000',
														fontFamily: 'Inter, sans-serif',
														fontSize: '20.719px',
														fontStyle: 'normal',
														fontWeight: 500,
														lineHeight: '24px',
													}}
													onPointerEnter={handleCampaignTabPointerEnter}
													onFocus={handleCampaignTabPointerEnter}
													onPointerLeave={handleCampaignTabPointerLeave}
													onPointerDown={handleCampaignTabPointerDown}
													onClick={() => navigateToCampaignRouteFromSearch('all')}
												>
													{mapCampaignName ? (
														<>
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
																<rect y="2" width="30" height="15" rx="1" fill={topNavScheme.icon} />
																<path
																	d="M0 2C0 0.89543 0.895431 0 2 0H13C14.1046 0 15 0.895431 15 2V4C15 4.55228 14.5523 5 14 5H1C0.447715 5 0 4.55228 0 4V2Z"
																	fill={topNavScheme.icon}
																/>
															</svg>
															<span className="min-w-0 truncate">{mapCampaignName}</span>
														</>
													) : null}
												</button>
												<button
													type="button"
													className="bg-transparent p-0 m-0 border-0 cursor-pointer inline-flex items-center justify-center h-full translate-y-[2px]"
													style={{
														color: '#2C2C2C',
														fontFamily: 'Inter, sans-serif',
														fontSize: '17px',
														fontStyle: 'normal',
														fontWeight: 500,
														lineHeight: '14px',
														opacity: 0.5,
													}}
													onPointerEnter={handleCampaignTabPointerEnter}
													onFocus={handleCampaignTabPointerEnter}
													onPointerLeave={handleCampaignTabPointerLeave}
													onPointerDown={handleCampaignTabPointerDown}
													onClick={() => navigateToCampaignRouteFromSearch('inbox')}
												>
													Inbox
												</button>
												<button
													type="button"
													className="bg-transparent p-0 m-0 border-0 cursor-pointer inline-flex items-center justify-center h-full translate-y-[2px]"
													style={{
														color: '#2C2C2C',
														fontFamily: 'Inter, sans-serif',
														fontSize: '17px',
														fontStyle: 'normal',
														fontWeight: 500,
														lineHeight: '14px',
														opacity: 0.5,
													}}
													onPointerEnter={handleCampaignTabPointerEnter}
													onFocus={handleCampaignTabPointerEnter}
													onPointerLeave={handleCampaignTabPointerLeave}
													onPointerDown={handleCampaignTabPointerDown}
													onClick={() => navigateToCampaignRouteFromSearch('drafts')}
												>
													Drafts
												</button>
											</div>
										</div>
									</div>
								) : null;

								// In map view, the map itself is rendered via a portal to <body>.
								// Portal the mini search bar too so it reliably stacks above the map,
								// regardless of any parent stacking contexts/transforms.
								if (isMapView && typeof window !== 'undefined') {
									return createPortal(
										<>
											{mapTopBackdropBox}
											{mapTopOutlineBox}
											{mapTopSearchingPill}
											{campaignMapTopTabs}
											{searchBar}
											{mapTopActionDropdowns}
											{mapSelectGrabberTool}
											{searchThisAreaCta}
											{showMapSendingOverlay && (
												<div
													className="fixed map-overlay-appear"
													style={{
														// Aligned with the side-chrome band; rides the centering
														// shift so it stays level with the rail on tall monitors.
														top: `calc(110px + var(${DASHBOARD_SIDE_SHIFT_VAR}, 0px) / var(--murmur-dashboard-zoom, ${DASHBOARD_MAP_ZOOM_DEFAULT}))`,
														left: 'max(80px, calc(50% - 480px))',
														zIndex: 9990,
														pointerEvents: 'none',
													}}
												>
													<SearchSendingOverlay />
												</div>
											)}
										</>,
										document.body
									);
								}
								return searchBar;
							})()}

						{shouldRenderSearchResultsStage && (
							<>
								{isSearchPending ||
								isLoadingContacts ||
								isRefetchingContacts ||
								(contacts && contacts.length > 0) ||
								(isMapView && hasNoSearchResults) ||
								(fromHomeParam && isMapView) ||
								isError ? (
									<div className="flex justify-center w-full px-0 sm:px-4 relative">
										<div className="w-full max-w-full results-appear results-align">
											{isMapView ? (
												<>
													{/* Fullscreen Map View - rendered via portal for true full-page positioning */}
													{typeof window !== 'undefined' &&
														createPortal(
															<>
																{/* Map container */}
																<div
																	className="map-overlay-appear"
																	style={{
																		position: 'fixed',
																		top: 0,
																		left: 0,
																		right: 0,
																		bottom: 0,
																		zIndex: 99,
																		pointerEvents: 'none',
																	}}
																>
																	<div
																		// Frame is drawn/animated by the shared map portal.
																		// This wrapper exists only to clip/anchor map-view overlays.
																		className="w-full h-full overflow-hidden relative pointer-events-none"
																	>
																		{/* Map is rendered by the shared portal */}
																		{false && (
																			<SearchResultsMap
																				contacts={
																					// Show placeholder dots while in fromHome loading state
																					fromHomeParam && (!isSignedIn || !hasSearched)
																						? fromHomePlaceholderContacts
																						: contacts || []
																				}
																				selectedContacts={selectedContacts}
																				externallyHoveredContactId={
																					hoveredMapPanelContactId
																				}
																				searchQuery={activeSearchQuery}
																				searchWhat={
																					// Use Wine, Beer, and Spirits color for fromHome placeholder dots
																					fromHomeParam && (!isSignedIn || !hasSearched)
																						? FROM_HOME_WHAT
																						: searchedWhat
																				}
																				selectAllInViewNonce={selectAllInViewNonce}
																				onVisibleOverlayContactsChange={(
																					overlayContacts
																				) => {
																					setMapPanelVisibleOverlayContacts(
																						overlayContacts
																					);

																					// Cache overlay-only contacts so if the user selects one, it can remain
																					// renderable in the side panel even after panning away.
																					if (overlayContacts.length > 0) {
																						setMapPanelExtraContacts((prev) => {
																							const byId = new Map<
																								number,
																								ContactWithName
																							>();
																							for (const c of prev) byId.set(c.id, c);
																							for (const c of overlayContacts) {
																								if (!byId.has(c.id)) byId.set(c.id, c);
																							}
																							return Array.from(byId.values());
																						});
																					}
																				}}
																				activeTool={activeMapTool}
																				requestedZoom={mapZoomControlRequest}
																				selectedAreaBounds={selectedAreaBoundsForMap}
																				onViewportInteraction={
																					handleMapViewportInteraction
																				}
																				onViewportZoom={handleMapViewportZoom}
																				onViewportIdle={handleMapViewportIdle}
																				onAreaSelect={handleMapAreaSelect}
																				onMarkerHover={handleMapMarkerHover}
																				lockedStateName={
																					// When a bbox search is active, don't lock/wash out a single state.
																					mapBboxFilter
																						? null
																						: // Show California outline for fromHome placeholder state
																							fromHomeParam &&
																							  (!isSignedIn || !hasSearched)
																							? 'CA'
																							: searchedStateAbbrForMap
																				}
																				skipAutoFit={
																					// Prevent zoom for fromHome placeholder - keep map zoomed out over US
																					(fromHomeParam &&
																						(!isSignedIn || !hasSearched)) ||
																					Boolean(mapBboxFilter)
																				}
																				onStateSelect={handleMapStateSelect}
																				isLoading={
																					isSearchPending ||
																					isLoadingContacts ||
																					isRefetchingContacts
																				}
																				onMarkerClick={(contact) => {
																					// Ensure map-only overlay markers (e.g. Booking extra pins) can show up as
																					// rows in the right-hand panel when selected/clicked.
																					const isInBaseResults = baseContactIdSet.has(
																						contact.id
																					);
																					if (!isInBaseResults) {
																						setMapPanelExtraContacts((prev) =>
																							prev.some((c) => c.id === contact.id)
																								? prev
																								: [contact, ...prev]
																						);
																						setMapPanelExtraContactIds((prev) =>
																							prev.includes(contact.id)
																								? prev
																								: [...prev, contact.id]
																						);
																						return;
																					}

																					// If the marker is outside the searched state, include it in the
																					// right-hand map panel list (without changing what the map shows).
																					if (!searchedStateAbbrForMap) return;
																					const contactStateAbbr = getStateAbbreviation(
																						contact.state || ''
																					)
																						.trim()
																						.toUpperCase();
																					if (
																						contactStateAbbr === searchedStateAbbrForMap
																					)
																						return;
																					setMapPanelExtraContactIds((prev) =>
																						prev.includes(contact.id)
																							? prev
																							: [...prev, contact.id]
																					);
																				}}
																				onToggleSelection={handleMapToggleSelection}
																			/>
																		)}
																		{/* Search Failed overlay - shown when there's an error */}
																		{isError && (
																			<div
																				className="absolute inset-0 z-[120] flex items-start justify-center pt-[180px] pointer-events-none"
																				style={{
																					paddingRight: isMidMapChrome
																						? `${MAP_VIEW_RIGHT_PANEL_FOOTPRINT_PX}px`
																						: undefined,
																				}}
																			>
																				<div
																					className="pointer-events-auto flex flex-col items-center justify-center text-center"
																					style={{
																						width: 517,
																						padding: '24px 0',
																						borderRadius: 8,
																						backgroundColor: 'rgba(106, 180, 227, 0.8)',
																						border: '3px solid #143883',
																					}}
																				>
																					<div
																						className="flex flex-col items-center justify-center gap-[16px]"
																						style={{ width: 496 }}
																					>
																						<div
																							className="flex items-center justify-center text-center bg-white"
																							style={{
																								width: 496,
																								height: 58,
																								borderRadius: 8,
																								border: '2px solid #101010',
																							}}
																						>
																							<span className="font-secondary font-bold text-[18px] leading-none text-black">
																								Search Failed
																							</span>
																						</div>
																						<div
																							className="flex items-center justify-center text-center bg-white px-6"
																							style={{
																								width: 496,
																								minHeight: 58,
																								borderRadius: 8,
																								border: '2px solid #101010',
																								padding: '12px 24px',
																							}}
																						>
																							<span className="font-secondary font-bold text-[16px] leading-tight text-black">
																								{error instanceof Error &&
																								error.message.includes('timeout')
																									? 'The search took too long to complete. Please try a more specific query.'
																									: error instanceof Error
																										? error.message
																										: 'Unable to complete your search. Please try again.'}
																							</span>
																						</div>
																						<div
																							className="flex items-center justify-center text-center bg-white cursor-pointer hover:bg-gray-50 transition-colors"
																							style={{
																								width: 496,
																								height: 58,
																								borderRadius: 8,
																								border: '2px solid #101010',
																							}}
																							onClick={() =>
																								form.handleSubmit(onSubmit)()
																							}
																						>
																							<span className="font-secondary font-bold text-[18px] leading-none text-black">
																								Retry Search
																							</span>
																						</div>
																					</div>
																				</div>
																			</div>
																		)}
												{shouldShowDashboardMapCampaignHeader &&
													dashboardMapCampaignForHeader &&
													!isCompressedMapChrome &&
													shouldShowMapResultsSidePanel && (
																<div
																	className="absolute right-[10px] pointer-events-auto"
																	onMouseEnter={() => {
																		if (!shouldUseDynamicMapCreateCampaignCta) return;
																		setIsPointerInMapSidePanel(true);
																	}}
																	onMouseLeave={() => {
																		if (!shouldUseDynamicMapCreateCampaignCta) return;
																		setIsPointerInMapSidePanel(false);
																	}}
																	style={{
																		top: mapViewSidePanelGroupTopCss,
																		width: '433px',
																		transform: `scale(${MAP_VIEW_PANEL_SCALE})`,
																		transformOrigin: 'top right',
																	}}
																>
																	<HoverDescriptionProvider defaultEnabled>
																		<CampaignHeaderBox
																			campaignId={dashboardMapCampaignForHeader.id}
																			campaignName={
																				dashboardMapCampaignForHeader.name || 'Untitled Campaign'
																			}
																			toListNames={dashboardMapHeaderToListNames}
																			fromName={dashboardMapHeaderFromName}
																			contactsCount={dashboardMapHeaderContactsCount}
																			draftCount={dashboardMapHeaderDraftCount}
																			sentCount={dashboardMapHeaderSentCount}
																			onContactsClick={() => navigateToCampaignRouteFromSearch('write')}
																			onDraftsClick={() => navigateToCampaignRouteFromSearch('drafts')}
																			onSentClick={() => navigateToCampaignRouteFromSearch('sent')}
																			onFolderDropdownOpenChange={setIsMapCampaignHeaderDropdownOpen}
																			onSelectCampaign={handleSelectDashboardCampaign}
																			width={433}
																		/>
																	</HoverDescriptionProvider>
																</div>
															)}
														{/* Inline "Write Message" drafting panel — floats over the map (left of the
											    right-side panel) for the current selection, scoped to the active campaign. */}
														{isWriteMode &&
															dashboardMapCampaignForHeader &&
													(selectedContacts.length > 0 ||
														isWriteReviewActive) &&
													!isCompressedMapChrome &&
													shouldShowMapResultsSidePanel && (
																<div
																	className="absolute pointer-events-none map-overlay-appear"
																			style={{
																				zIndex: 125,
																				top: `calc(${MAP_VIEW_SIDE_PANEL_TOP_CSS} + ${
																					isWriteReviewActive || dashboardDraftingStatus.isDrafting
																						? 84
																						: 36
																				}px)`,
																				right: 10 + 433 * MAP_VIEW_PANEL_SCALE + 13,
																			}}
																>
																	<div
																		className="pointer-events-auto"
																		style={{
																		}}
																	>
																		<DashboardWriteOverlay
																			campaign={dashboardMapCampaignForHeader}
																			targetContactIds={selectedContacts}
																			onClose={handleCloseWriteOverlay}
																			onSwitchToAddToFolder={() => {
																				void handleAddSelectedToContextFolder();
																				setIsWriteMode(false);
																			}}
																			onReviewActiveChange={setIsWriteReviewActive}
																			onActiveReviewContactChange={
																				handleActiveWriteReviewContactChange
																			}
																			onDraftingStatusChange={
																				handleDashboardDraftingStatusChange
																			}
																			isDraftingDeckCollapsed={
																				isDashboardDraftingDeckCollapsed
																			}
																			onDraftingDeckCollapsedChange={
																				setIsDashboardDraftingDeckCollapsed
																			}
																			onViewDrafting={() => navigateToCampaignRouteFromSearch('write')}
																		/>
																	</div>
													</div>
												)}
												{/* Send-queue stack overlay — opened on demand from the campaign
												    header "in send queue" pill; floats left of the right-side
												    panel. Shares the write overlay's slot, so it never co-shows
												    with write mode or the live send overlay. */}
												{isSendQueueViewOpen &&
													!isMobile &&
													!isWriteMode &&
													!isCompressedMapChrome &&
													shouldShowMapResultsSidePanel &&
													!showMapSendingOverlay &&
													dashboardMapCampaignForHeader && (
														<div
															className="absolute pointer-events-none map-overlay-appear"
															style={{
																zIndex: 125,
																top: `calc(${MAP_VIEW_SIDE_PANEL_TOP_CSS} + 180px)`,
																right: 10 + 433 * MAP_VIEW_PANEL_SCALE + 13,
																transform: `scale(${MAP_VIEW_PANEL_SCALE * 0.85})`,
																transformOrigin: 'top right',
															}}
														>
															<div
																data-dashboard-send-queue-overlay="true"
																className="pointer-events-auto"
															>
																<DashboardSendQueueOverlay
																	campaignId={dashboardMapCampaignForHeader.id}
																	onClose={closeSendQueueView}
																/>
															</div>
														</div>
													)}
												{!isCompressedMapChrome &&
													mapPanelHoveredResearchContact &&
													shouldShowMapPanelHoverResearch &&
													!shouldShowMapResearchPanel && (
													<div
														data-dashboard-website-preview-size="large"
														className="absolute"
														onMouseEnter={cancelMapPanelHoverResearchClear}
														onMouseLeave={() =>
															scheduleMapPanelHoverResearchClear(
																mapPanelHoveredResearchContact.contact.id
															)
														}
														style={{
															pointerEvents: 'auto',
															// Lift above the bottom nav boxes (z-130) only while expanded,
															// matching the marker-hover card's behavior.
															zIndex: mapPanelHoverResearchExpanded ? 131 : 124,
															...(websitePreviewContactId ===
																mapPanelHoveredResearchContact.contact.id &&
															websitePreviewPinnedResearchStyle
																? websitePreviewPinnedResearchStyle
																: {
																		top:
																			mapPanelHoverResearchTopPx != null
																				? `${mapPanelHoverResearchTopPx}px`
																				: MAP_VIEW_SIDE_PANEL_TOP_CSS,
																		...(mapPanelHoverResearchDockSide === 'right'
																			? {
																					right:
																						10 +
																						433 * MAP_VIEW_PANEL_SCALE +
																						MAP_PANEL_ABRIDGED_RESEARCH_GAP_PX,
																				}
																			: {
																					left: MAP_MARKER_RESEARCH_LEFT_DOCK_LEFT_PX,
																				}),
																		transform: `scale(${MAP_VIEW_PANEL_SCALE})`,
																		transformOrigin:
																			mapPanelHoverResearchDockSide === 'right'
																				? 'top right'
																				: 'top left',
																	}),
														}}
													>
														<ContactResearchHoverCard
															contact={
																mapPanelHoveredResearchContactEnriched ??
																mapPanelHoveredResearchContact.contact
															}
															displayHeadline={
																mapPanelHoveredResearchContact.displayHeadline
															}
															displayTitleCategory={
																mapPanelHoveredResearchContact.displayTitleCategory
															}
															onExpandedChange={setMapPanelHoverResearchExpanded}
														/>
													</div>
												)}
												{/* Marker-hover research group: abridged card + Description box,
												    statically docked beside the results panel or the left rail. */}
												{!isMobile &&
													!isCompressedMapChrome &&
													mapResearchPanelContact &&
													shouldShowMapResearchPanel && (
													<div
														data-dashboard-website-preview-size="large"
														className="absolute pointer-events-none"
														style={{
															// Lift above the bottom search bar's nav boxes (z-130) only while
															// expanded — when the taller card overlaps that row — so collapsed
															// hover keeps its prior ordering vs. the z-125 Write panel.
															zIndex: isMapMarkerResearchExpanded ? 131 : 124,
															...(websitePreviewContactId === mapResearchPanelContact.id &&
															websitePreviewPinnedResearchStyle
																? websitePreviewPinnedResearchStyle
																: {
																		top: MAP_VIEW_SIDE_PANEL_TOP_CSS,
																		...(mapMarkerResearchDockSide === 'right'
																			? {
																					right:
																						10 +
																						433 * MAP_VIEW_PANEL_SCALE +
																						MAP_PANEL_ABRIDGED_RESEARCH_GAP_PX,
																				}
																			: {
																					left: MAP_MARKER_RESEARCH_LEFT_DOCK_LEFT_PX,
																				}),
																		width: `${MAP_MARKER_RESEARCH_GROUP_WIDTH_PX}px`,
																		transform: `scale(${MAP_VIEW_PANEL_SCALE})`,
																		transformOrigin:
																			mapMarkerResearchDockSide === 'right'
																				? 'top right'
																				: 'top left',
																	}),
															opacity: isMapResearchPanelVisible ? 1 : 0,
															transition: `opacity ${MAP_RESEARCH_PANEL_FADE_MS}ms ease-out`,
														}}
													>
														{/* Bottom-align the card to its slot so shorter cards slide down,
														    keeping a constant gap above the static Description box. */}
														<div
															className="absolute left-0 top-0 flex w-full flex-col justify-end"
															style={{
																height: `${
																	MAP_MARKER_RESEARCH_DESCRIPTION_TOP_PX -
																	MAP_PANEL_ABRIDGED_RESEARCH_GAP_PX
																}px`,
															}}
														>
															<ContactResearchPanel
																contact={mapResearchPanelContactEnriched ?? mapResearchPanelContact}
																variant="abridged"
																displayHeadline={
																	mapMarkerResearchDisplayFields?.displayHeadline
																}
																displayTitleCategory={
																	mapMarkerResearchDisplayFields?.displayTitleCategory
																}
															/>
														</div>
														<ContactResearchDescriptionBox
															className="absolute left-0"
															style={{
																top: `${MAP_MARKER_RESEARCH_DESCRIPTION_TOP_PX}px`,
															}}
															metadata={
																(mapResearchPanelContactEnriched ?? mapResearchPanelContact)
																	.metadata
															}
															fallbackText={
																(mapResearchPanelContactEnriched ?? mapResearchPanelContact)
																	.headline || ''
															}
															expanded={isMapMarkerResearchExpanded}
														/>
													</div>
												)}
												{/* Search Results overlay box — right side panel on wide desktops, full-width
									    bottom sheet under the top-half map in compressed chrome. Keep mounted during
									    loading so the UI doesn't disappear between state searches. */}
																{shouldShowMapResultsSidePanel && (
																			<div
																				className="absolute flex flex-col gap-[9px] pointer-events-auto"
																				onMouseEnter={() => {
																					if (!shouldUseDynamicMapCreateCampaignCta)
																						return;
																					setIsPointerInMapSidePanel(true);
																				}}
																				onMouseLeave={() => {
																					if (!shouldUseDynamicMapCreateCampaignCta)
																						return;
																					setIsPointerInMapSidePanel(false);
																				}}
																				style={
																					isCompressedMapChrome
																						? {
																							left: 10,
																							right: 10,
																							bottom: 10,
																							height: 'calc(50% - 20px)',
																							opacity: isMapCampaignHeaderDropdownOpen ? 0.5 : 1,
																							transition: 'opacity 0.2s ease',
																							overflow: 'hidden',
																						}
																						: {
																								right: 10,
																								top: mapViewResultsPanelTopCss,
																								width: '433px',
																								height: 800,
																								maxHeight: mapViewResultsPanelMaxHeightCss,
																								opacity: isMapCampaignHeaderDropdownOpen ? 0.5 : 1,
																								transition: 'opacity 0.2s ease',
																								overflow: 'hidden',
																												transform: `scale(${MAP_VIEW_PANEL_SCALE})`,
																												transformOrigin: 'top right',
																											}
																				}
																			>
																				{/* Compressed-only sheet header: Map button, selection count, Select all. */}
																				{isCompressedMapChrome && (
																					<div
																						className="w-full h-[42px] flex-shrink-0 flex items-center justify-center px-4 relative"
																						style={{
																							backgroundColor: 'rgba(175, 214, 239, 0.8)',
																							border: '3px solid #143883',
																							borderRadius: '8px',
																						}}
																					>
																						<button
																							type="button"
																							onClick={() => setIsMapView(false)}
																							className="absolute left-[10px] top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer"
																							style={{
																								width: '53px',
																								height: '19px',
																								backgroundColor: '#CDEFC3',
																								borderRadius: '4px',
																								border: '2px solid #000000',
																								fontFamily:
																									'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
																								fontSize: '13px',
																								fontWeight: 600,
																								lineHeight: '1',
																							}}
																						>
																							Map
																						</button>
																						<span className="font-inter text-[13px] font-medium text-black">
																							{selectedContacts.length} selected
																						</span>
																						<button
																							type="button"
																							onClick={() => {
																								setMapPanelShiftClickAnchor(null);
																								handleSelectAll(displayedMapPanelContacts);
																							}}
																							disabled={isMapResultsLoading}
																							className={`font-secondary text-[12px] font-medium text-black absolute right-[10px] top-1/2 -translate-y-1/2 ${
																								isMapResultsLoading
																									? 'opacity-60 pointer-events-none'
																									: 'hover:underline'
																							}`}
																						>
																							{isAllPanelContactsSelected
																								? 'Deselect All'
																								: 'Select all'}
																						</button>
																					</div>
																				)}
																				{/* Selection sub-panel — always present on desktop (header carries the campaign-stops chrome); mobile/compressed keeps the existing gated sheet behaviour. */}
																				{(!isCompressedMapChrome ||
																					selectedContacts.length > 0 ||
																					folderMoveNotice != null) && (
																					<div
																						className="flex flex-col flex-shrink-0"
																						style={{
																							maxHeight: isCompressedMapChrome
																								? '30%'
																								: mapPanelDesktopSelectionMaxHeightCss,
																							backgroundColor: isCompressedMapChrome
																								? 'rgba(175, 214, 239, 0.8)'
																								: 'rgba(184, 224, 255, 0.54)',
																							border: isCompressedMapChrome ? '3px solid #143883' : '2px solid #000',
																							borderRadius: isCompressedMapChrome ? '8px' : '7px',
																							overflow: 'hidden',
																						}}
																					>
																						{isCompressedMapChrome ? (
																							<div
																								className="w-full flex-shrink-0 flex items-start justify-center px-4 relative"
																								style={{ height: dashboardDraftingStatus.isDrafting ? 73 : 49 }}
																							>
																								<span className="absolute left-[10px] top-[24.5px] -translate-y-1/2 font-secondary text-[13px] font-medium text-black">
																									Selection
																								</span>
																								<SelectionCountPill
																									className="absolute left-1/2 top-[24.5px] -translate-x-1/2 -translate-y-1/2"
																									label={`${selectedContacts.length}/${mapSelectionDisplayTotal} selected`}
																									disabled={selectedContacts.length === 0}
																									onClear={() => {
																										setMapPanelShiftClickAnchor(null);
																										setSelectedContacts([]);
																									}}
																									onUndo={undoLastSelection}
																									canUndo={canUndoSelection}
																								/>
																								<button
																									type="button"
																									onClick={() => {
																										setMapPanelShiftClickAnchor(null);
																										handleSelectAll(displayedMapPanelContacts);
																									}}
																									disabled={isMapResultsLoading}
																									className={`font-secondary text-[12px] font-medium text-black absolute right-[10px] top-[24.5px] -translate-y-1/2 ${
																										isMapResultsLoading ? 'opacity-60 pointer-events-none' : 'hover:underline'
																									}`}
																								>
																									{isAllPanelContactsSelected ? 'Deselect All' : 'Select all'}
																								</button>
																								{dashboardDraftingStatus.isDrafting && (
																									<SelectionDraftingProgressBar
																										className="absolute left-0 right-0 bottom-0"
																										completed={dashboardDraftingStatus.completedContactIds.length}
																										total={dashboardDraftingStatus.total}
																										isCollapsed={isDashboardDraftingDeckCollapsed}
																										onToggleCollapsed={() =>
																											setIsDashboardDraftingDeckCollapsed((prev) => !prev)
																										}
																									/>
																								)}
																							</div>
																						) : (
																							<div
																								className="w-full flex-shrink-0 relative"
																								style={{
																									height: dashboardDraftingStatus.isDrafting ? 101 : 77,
																									backgroundColor: '#CBF0FF',
																									borderBottom: '2px solid #000',
																								}}
																							>
																								<ContactsHeaderChrome
																									variant="campaignStops"
																									activeCampaignStop="search"
																									whiteSectionHeight={77}
																									offsetY={-19.5}
																									hasData
																									interactive
																									onAllClick={() => navigateToCampaignRouteFromSearch('all')}
																									onWriteClick={() => navigateToCampaignRouteFromSearch('write')}
																									onSendClick={() => navigateToCampaignRouteFromSearch('drafts')}
																									onInboxClick={() => navigateToCampaignRouteFromSearch('inbox')}
																								/>
																								<span className="absolute left-[10px] top-[58px] -translate-y-1/2 font-secondary text-[13px] font-medium text-black">
																									Selection
																								</span>
																								<SelectionCountPill
																									className="absolute left-1/2 top-[58px] -translate-x-1/2 -translate-y-1/2"
																									label={`${selectedContacts.length}/${mapSelectionDisplayTotal} selected`}
																									disabled={selectedContacts.length === 0}
																									onClear={() => {
																										setMapPanelShiftClickAnchor(null);
																										setSelectedContacts([]);
																									}}
																									onUndo={undoLastSelection}
																									canUndo={canUndoSelection}
																								/>
																								<button
																									type="button"
																									onClick={() => {
																										setMapPanelShiftClickAnchor(null);
																										handleSelectAll(displayedMapPanelContacts);
																									}}
																									disabled={isMapResultsLoading}
																									className={`font-secondary text-[12px] font-medium text-black absolute right-[10px] top-[58px] -translate-y-1/2 ${
																										isMapResultsLoading ? 'opacity-60 pointer-events-none' : 'hover:underline'
																									}`}
																								>
																									{isAllPanelContactsSelected ? 'Deselect All' : 'Select all'}
																								</button>
																								{dashboardDraftingStatus.isDrafting && (
																									<SelectionDraftingProgressBar
																										className="absolute left-0 right-0 top-[77px]"
																										completed={dashboardDraftingStatus.completedContactIds.length}
																										total={dashboardDraftingStatus.total}
																										isCollapsed={isDashboardDraftingDeckCollapsed}
																										onToggleCollapsed={() =>
																											setIsDashboardDraftingDeckCollapsed((prev) => !prev)
																										}
																									/>
																								)}
																							</div>
																						)}
																						{folderMoveNotice && (
																							<SelectionFolderMoveBanner
																								count={folderMoveNotice.count}
																								folderName={folderMoveNotice.folderName}
																								iconColor={topNavScheme.icon}
																								includeTopDivider={isCompressedMapChrome}
																								phase={folderMoveNotice.phase}
																								onDismiss={() =>
																									setFolderMoveNotice((current) =>
																										current
																											? { ...current, phase: 'exiting' }
																											: current
																									)
																								}
																							/>
																						)}
																						<CustomScrollbar
																							className="flex-1 min-h-0"
																							contentClassName="p-[6px] pb-[14px] space-y-[7px]"
																							thumbWidth={2}
																							thumbColor="#000000"
																							trackColor="transparent"
																							offsetRight={-6}
																							disableOverflowClass
																						>
																							<div className="space-y-[7px]">
																								{mapPanelSelectedContacts.map((contact) =>
																									renderMapPanelDesktopRow(contact, 'selection')
																								)}
																							</div>
																						</CustomScrollbar>
																					</div>
																				)}
																				{/* Search Results sub-panel — always present; flexes to fill remaining height. */}
																				<div
																					className="flex flex-col flex-1 min-h-0"
																					style={{
																						backgroundColor: 'rgba(99, 155, 244, 0.5)',
																						// Desktop floor so a fully expanded Selection can't compress this below its
																						// header + category toolbar; compressed sheet keeps its own 30% split.
																						minHeight: isCompressedMapChrome ? undefined : MAP_VIEW_SEARCH_RESULTS_MIN_HEIGHT_PX,
																						borderRadius: '8px',
																						overflow: 'hidden',
																					}}
																				>
																					<div
																						className="w-full h-[50px] flex-shrink-0 flex items-center justify-center px-4 relative"
																						style={{
																							...(isForYouCuratedSearch
																								? { backgroundImage: FOR_YOU_RESULTS_HEADER_GRADIENT }
																								: { backgroundColor: '#CBF0FF' }),
																							border: '2px solid #000',
																							borderRadius: '8px 8px 0 0',
																						}}
																					>
																						<span className="absolute left-[13px] top-[2px] font-inter text-[15px] font-semibold leading-[20px] text-center text-black">
																							{isForYouCuratedSearch ? 'For You' : 'Search Results'}
																						</span>
																						<HorizontalFadeScroller
																							className="absolute left-[14px] right-[10px] bottom-[7px]"
																							contentClassName="flex items-center gap-[12px] w-max"
																						>
																							{[
																								{
																									key: 'restaurants',
																									pillColor: '#C3FBD1',
																									label: 'Restaurants',
																									Icon: RestaurantsIcon,
																									iconSize: 11,
																								},
																								{
																									key: 'coffee-shops',
																									pillColor: '#D6F1BD',
																									label: 'Coffee',
																									Icon: CoffeeShopsIcon,
																									iconSize: 6,
																								},
																								{
																									key: 'music-venues',
																									pillColor: '#B7E5FF',
																									label: 'Music Venues',
																									Icon: MusicVenuesIcon,
																									iconSize: 11,
																								},
																								{
																									key: 'festivals',
																									pillColor: '#C1D6FF',
																									label: 'Festivals',
																									Icon: FestivalsIcon,
																									iconSize: 11,
																								},
																								{
																									key: 'wedding-planners',
																									pillColor: '#FFF8DC',
																									label: 'Weddings',
																									Icon: WeddingPlannersIcon,
																									iconSize: 11,
																								},
																								{
																									key: 'wine-beer-spirits',
																									pillColor: '#BFC4FF',
																									label: 'Wineries',
																									Icon: WineBeerSpiritsIcon,
																									iconSize: 11,
																								},
																								{
																									key: 'radio-stations',
																									pillColor: '#C5F0CC',
																									label: 'Radio',
																									Icon: RadioStationsIcon,
																									iconSize: 11,
																								},
																							]
																								.filter(({ key }) =>
																									mapPanelVisibleCategoryKeys.has(key)
																								)
																								.map(
																									({
																										key,
																										pillColor,
																										label,
																										Icon,
																										iconSize,
																									}) => (
																										<div
																											key={key}
																											className="h-[15px] rounded-[7px] px-2 flex items-center gap-1 border border-black flex-shrink-0 cursor-pointer"
																											style={{
																												backgroundColor: pillColor,
																											}}
																											onClick={() => {
																												setMapPanelShiftClickAnchor(null);
																												setSelectedCategoryChips(
																													(prev) => {
																														const next = new Set(prev);
																														if (next.has(key))
																															next.delete(key);
																														else next.add(key);
																														return next;
																													}
																												);
																											}}
																										>
																											<Icon
																												size={iconSize}
																												className="flex-shrink-0"
																											/>
																											<span className="text-[10px] text-black leading-none whitespace-nowrap">
																												{label}
																											</span>
																										</div>
																									)
																								)}
																						</HorizontalFadeScroller>
																					</div>
																					<div
																						className="flex flex-col flex-1 min-h-0 relative"
																						style={{
																							...(isForYouCuratedSearch
																								? { backgroundImage: FOR_YOU_RESULTS_BODY_GRADIENT }
																								: null),
																							borderLeft: '3px solid #5B7469',
																							borderRight: '3px solid #5B7469',
																							borderBottom: '3px solid #5B7469',
																							borderRadius: '0 0 8px 8px',
																						}}
																					>
																						<CustomScrollbar
																							className="flex-1 min-h-0"
																							contentClassName={`p-[6px] ${
																								showMapPanelCategoryBox
																									? 'pb-[78px]'
																									: 'pb-[14px]'
																							} space-y-[7px]`}
																							thumbWidth={2}
																							thumbColor="#000000"
																							trackColor="transparent"
																							offsetRight={-6}
																							disableOverflowClass
																						>
																							{isMapResultsLoading ? (
																								<MapResultsPanelSkeleton
																									variant={
																										isCompressedMapChrome
																											? 'narrow'
																											: 'desktop'
																									}
																									rows={Math.max(
																										mapPanelUnselectedContacts.length,
																										isCompressedMapChrome ? 8 : 14
																									)}
																								/>
															) : (
																<div
																	ref={mapPanelRowsDesktopRef}
																	className="space-y-[7px]"
																>
																	{renderMapPostedEventsSection()}
																	{renderMapPanelSearchResultRows()}
																</div>
															)}
																						</CustomScrollbar>
																						{showMapPanelCategoryBox && (
																							<div
																								className="absolute left-1/2 -translate-x-1/2 bottom-[9px] flex items-center gap-[2px] pl-[4px]"
																								style={{
																									width: '420px',
																									height: '55px',
																									borderRadius: '9.86px',
																									border: '1.446px solid #000',
																									backgroundColor: '#65A1B9',
																								}}
																							>
																								{[
																									{
																										key: 'music-venues',
																										color: '#71C9FD',
																										Icon: MusicVenuesIcon,
																										size: 32,
																									},
																									{
																										key: 'wine-beer-spirits',
																										color: '#80AAFF',
																										Icon: WineBeerSpiritsIcon,
																										size: 25,
																									},
																									{
																										key: 'restaurants',
																										color: '#77DD91',
																										Icon: RestaurantsIcon,
																										size: 32,
																									},
																									{
																										key: 'coffee-shops',
																										color: '#A9DE78',
																										Icon: CoffeeShopsIcon,
																										size: 18,
																									},
																									{
																										key: 'wedding-planners',
																										color: '#EED56E',
																										Icon: WeddingPlannersIcon,
																										size: 30,
																									},
																									{
																										key: 'festivals',
																										color: '#80AAFF',
																										Icon: FestivalsIcon,
																										size: 32,
																									},
																									{
																										key: 'radio-stations',
																										color: '#56DA73',
																										Icon: RadioStationsIcon,
																										size: 32,
																									},
																								]
																									.filter(({ key }) =>
																										mapPanelCategoryKeys.has(key)
																									)
																									.map(({ key, color, Icon, size }) => {
																										const isSelected =
																											selectedCategoryChips.has(key);
																										return (
																											<div
																												key={key}
																												className="flex items-center justify-center flex-shrink-0 cursor-pointer"
																												style={{
																													width: 45,
																													height: 45,
																													backgroundColor: isSelected
																														? 'transparent'
																														: color,
																													borderRadius: 6,
																													border: isSelected
																														? `2px solid ${color}`
																														: '1px solid #000',
																												}}
																												onClick={() => {
																													setMapPanelShiftClickAnchor(null);
																													setSelectedCategoryChips(
																														(prev) => {
																															const next = new Set(prev);
																															if (next.has(key))
																																next.delete(key);
																															else next.add(key);
																															return next;
																														}
																													);
																												}}
																											>
																												<Icon
																													size={size}
																													innerFill={
																														isSelected ? color : 'white'
																													}
																												/>
																											</div>
																										);
																									})}
																							</div>
																						)}
																					</div>
																				</div>
																				{!isMapResultsLoading && !fromHomeParam && (
																					<div
																						className={`flex-shrink-0 w-full px-[10px] ${
																							isCompressedMapChrome ? 'pb-[4px]' : ''
																						}`}
																					>
																						<Button
																							disabled={primaryCtaPending}
																							variant="primary-light"
																							bold
																							className={`relative w-full h-[39px] !bg-[#5DAB68] hover:!bg-[#5DAB68] !text-white border border-[#000000] overflow-hidden ${
																								selectedContacts.length === 0
																									? 'opacity-[0.62]'
																									: 'opacity-100'
																							}`}
																							style={
																								selectedContacts.length === 0
																									? { height: '39px' }
																									: { height: '39px' }
																							}
																							onClick={() => {
																								if (selectedContacts.length === 0) return;
																								handlePrimaryCta();
																							}}
																						>
																							<span
																								className="relative z-20"
																								style={{
																									fontFamily: 'Inter, sans-serif',
																									fontWeight: 700,
																								}}
																							>
																								Add Contacts
																							</span>
																						</Button>
																					</div>
																				)}
																			</div>
																		)}
																{!isMobile && (
																				<div
																					className="absolute left-1/2 pointer-events-none"
																					onMouseEnter={
																						cancelMapBottomSearchFollowupPreviewClear
																					}
																					onMouseLeave={
																						scheduleMapBottomSearchFollowupPreviewClear
																					}
																					style={{
																						// Compressed chrome: float just above the bottom results
																						// sheet (sheet top sits at calc(50% - 10px) from the bottom).
																						bottom: isCompressedMapChrome
																							? 'calc(50% + 14px)'
																							: `${MAP_RESULTS_BOTTOM_SEARCH_BOX.bottomOffset}px`,
																						// Mid chrome: center over the map strip left of the panel.
																						left: isMidMapChrome
																							? `calc(50% - ${MAP_VIEW_RIGHT_PANEL_FOOTPRINT_PX / 2}px)`
																							: undefined,
																						width: `${mapBottomSearchShellWidth}px`,
																						height: `${mapBottomSearchShellHeight}px`,
																						transform: `translateX(-50%) scale(${MAP_VIEW_BOTTOM_SEARCH_SCALE})`,
																						transformOrigin: 'bottom center',
																						transition: 'none',
																						zIndex: 130,
																					}}
																				>
																					{isSearchEmptyResult &&
																						!isMapBottomCategoryMode &&
																						!isMapBottomForYouMode && (
																						<div
																							aria-label="Search suggestions"
																							className="absolute left-1/2 flex flex-col gap-[5px] pointer-events-none"
																							style={{
																								bottom: `calc(100% + ${emptyResultSuggestionsBottomOffsetPx}px)`,
																								width: '100%',
																								transform: 'translateX(-50%)',
																							}}
																						>
																							{emptyResultSearchSuggestions.map((label, index) => (
																								<button
																									type="button"
																									aria-label={`Search for ${label}`}
																									key={`empty-result-search-suggestion-${index}`}
																									className="initial-dashboard-search-suggestion pointer-events-auto flex items-center overflow-hidden"
																									style={
																										{
																											width: '100%',
																											height: '29px',
																											borderRadius: '10px',
																											'--initial-dashboard-search-suggestion-background': '#F8F8F8',
																											'--initial-dashboard-search-suggestion-opacity':
																												INITIAL_DASHBOARD_ACTIVE_SEARCH_SUGGESTIONS[index]?.opacity ??
																												0.5,
																											animationDelay: `${
																												(emptyResultSearchSuggestions.length - 1 - index) * 48
																											}ms`,
																											boxSizing: 'border-box',
																											padding: '0 16px',
																										} as React.CSSProperties
																									}
																									onMouseDown={(event) => {
																										event.preventDefault();
																										event.stopPropagation();
																									}}
																									onClick={(event) => {
																										event.stopPropagation();
																										void submitMapBottomSearchQuery(label);
																									}}
																								>
																									<span
																										className="truncate"
																										style={{
																											color: '#000000',
																											fontFamily: 'Inter, sans-serif',
																											fontSize: '12.809px',
																											fontStyle: 'normal',
																											fontWeight: 400,
																											lineHeight: '20.199px',
																										}}
																									>
																										{label}
																									</span>
																								</button>
																							))}
																						</div>
																					)}
																					<MapBottomSearchBar
																						value={mapBottomSearchValue}
																						isExpanded={isMapBottomSearchExpanded}
																						activeHeight={mapBottomSearchActiveHeight}
																						inputRef={mapBottomSearchInputRef}
																						mode={
																							isMapBottomCategoryMode
																								? 'category'
																								: isMapBottomForYouMode
																									? 'for-you'
																									: 'anything'
																						}
																						categoryWhatValue={whatValue}
																						categoryWhereValue={whereValue}
																						activeCategoryField={
																							activeMapBottomCategoryField
																						}
																						onActivate={handleMapBottomSearchActivate}
																						onSubmit={handleMapBottomSearchSubmit}
																						onValueChange={handleMapBottomSearchValueChange}
																						onActiveChange={
																							handleMapBottomSearchActiveChange
																						}
																						onCategoryFieldFocus={
																							handleMapBottomCategoryFieldFocus
																						}
																						onCategoryWhatChange={
																							handleMapBottomCategoryWhatChange
																						}
																						onCategoryWhereChange={
																							handleMapBottomCategoryWhereChange
																						}
																						onCategoryWhatEnter={
																							handleMapBottomCategoryWhatEnter
																						}
																						onCategorySubmit={
																							handleMapBottomCategorySubmit
																						}
																				onForYouSubmit={handleMapBottomForYouSubmit}
										radiusEnabled={isRadiusModeEnabled}
										profileModeEnabled={isProfileModeEnabled}
										keywordModeEnabled={isKeywordModeEnabled}
									/>
									{/* Campaign nav boxes flanking the map-results search bar (same row). */}
									<DashboardSearchFlankBoxes
										contactsCount={dashboardMapHeaderContactsCount}
										draftCount={dashboardMapHeaderDraftCount}
										inboxCount={dashboardMapHeaderInboxCount}
										sentCount={dashboardMapHeaderSentCount}
										navEnabled={Boolean(mapCampaignId)}
										onNavigate={navigateToCampaignTab}
										dimmed={
											!isCompressedMapChrome &&
											((isMapResearchPanelVisible &&
												isMapMarkerResearchExpanded) ||
												(isMapPanelHoverResearchVisible &&
													mapPanelHoverResearchExpanded))
										}
									/>
									{shouldShowMapBottomKeywordBadge && (
										<div
											aria-hidden="true"
											className="absolute flex items-center justify-center gap-[6px] pointer-events-none font-inter text-[9px] font-medium text-black"
											style={{
												top: 'calc(100% + 4px)',
												right: 0,
												width: '148px',
												height: '13px',
												borderRadius: '8px',
												backgroundColor: '#FFFFFF',
												lineHeight: '20px',
												textAlign: 'center',
												zIndex: 1,
											}}
										>
											<span
												style={{
													width: '8px',
													height: '8px',
													borderRadius: '50%',
													backgroundColor: '#71A9FD',
													flexShrink: 0,
												}}
											/>
											<span>keyword search enabled</span>
										</div>
									)}
									{shouldShowMapBottomProfileBadge && (
										<div
											aria-hidden="true"
											className="absolute flex items-center justify-center gap-[6px] pointer-events-none font-inter text-[9px] font-medium text-black"
											style={{
												top: 'calc(100% + 4px)',
												right: 0,
												width: '148px',
												height: '13px',
												borderRadius: '8px',
												backgroundColor: '#FFFFFF',
												lineHeight: '20px',
												textAlign: 'center',
												zIndex: 1,
											}}
										>
											<span
												style={{
													width: '8px',
													height: '8px',
													borderRadius: '50%',
													backgroundColor: '#71C9FD',
													flexShrink: 0,
												}}
											/>
											<span>Profile search enabled</span>
										</div>
									)}
									<MapBottomSearchFollowupBox
																		selectedSearchFollowup={
																			mapBottomSearchFollowupSelection
																						}
																						previewedSearchFollowup={
																							mapBottomSearchFollowupPreview
																						}
																						onSelectedSearchFollowupChange={
																							handleMapBottomSearchFollowupSelectionChange
																						}
																		onPreviewSearchFollowupChange={
																			handleMapBottomSearchFollowupPreviewChange
																		}
																		onForYouSubmit={handleMapBottomForYouSubmit}
																		isKeywordModeEnabled={isKeywordModeEnabled}
																		onKeywordToggle={handleKeywordToggle}
																		isRadiusModeEnabled={isRadiusModeEnabled}
																		onRadiusToggle={handleRadiusToggle}
																		isProfileModeEnabled={isProfileModeEnabled}
																		onProfileToggle={handleProfileToggle}
																		// Compressed chrome: the results sheet sits below the bar, so
																		// the pills flip above it (stacking over the radius slider
																		// when that is open).
																		style={
																			isCompressedMapChrome
																				? {
																						top: 'auto',
																						bottom: `calc(100% + ${isRadiusModeEnabled ? 53 : 20}px)`,
																					}
																				: undefined
																		}
																	/>
																		{isRadiusModeEnabled && (
																			<MapRadiusSlider
																				miles={radiusMiles}
																				onMilesChange={handleRadiusMilesChange}
																				className="absolute"
																				style={{
																					left: 0,
																					bottom: 'calc(100% + 12px)',
																					width: '196px',
																				}}
																			/>
																		)}
																				</div>
																			)}
																	</div>
																</div>
															</>,
															document.body
														)}
												</>
											) : (
												<>
													{/* Table View (default) */}
													{/* Map button positioned above table on the right */}
													<div className="w-full max-w-[1004px] mx-auto flex justify-end mb-[4px] relative z-[80] search-results-map-toggle">
														<button
															type="button"
															onClick={() => setIsMapView(true)}
															className="bg-white border-2 border-black rounded-[8px] text-[14px] font-medium font-secondary hover:bg-gray-50 transition-colors flex items-center justify-center cursor-pointer"
															style={{ width: '105px', height: '22px' }}
														>
															Map
														</button>
													</div>
													{/* Horizontal research strip for medium-width desktops (when side panel is hidden) */}
													{showHorizontalResearchStrip && (
														<ContactResearchHorizontalStrip contact={hoveredContact} />
													)}
													<Card className="border-0 shadow-none !p-0 w-full !my-0">
														<CardContent className="!p-0 w-full">
															<CustomTable
																initialSelectAll={false}
																isSelectable
																setSelectedRows={setSelectedContacts}
																data={mapPanelContacts}
																columns={columns}
																searchable={false}
																tableRef={tableRef}
																rowsPerPage={100}
																displayRowsPerPage={false}
																constrainHeight
																useCustomScrollbar={!isMobileLandscape}
																scrollbarOffsetRight={-7}
																containerClassName="search-results-table h-[571px] rounded-[8px] border-[#143883] md:w-[1004px] border-[3px]"
																tableClassName="w-[calc(100%-12px)] mx-auto border-separate border-spacing-y-[6px]"
																headerClassName="[&_tr]:border-[#737373]"
																theadCellClassName="border-[#737373] font-secondary text-[14px] font-medium"
																rowClassName="border-[#737373] row-hover-scroll bg-white odd:bg-white even:bg-white rounded-[8px] [&>td:first-child]:rounded-l-[8px] [&>td:last-child]:rounded-r-[8px] [&>td]:border-y-2 [&>td:first-child]:border-l-2 [&>td:last-child]:border-r-2 border-none !h-[58px] min-h-[58px] [&>td]:!h-[58px] [&>td]:!py-0"
																stickyHeaderClassName="bg-[#AFD6EF]"
																hidePagination
																headerAction={
																	!isMobile && !fromHomeParam ? (
																		<button
																			type="button"
																			onClick={handlePrimaryCta}
																			disabled={
																				selectedContacts.length === 0 || primaryCtaPending
																			}
																			className="font-secondary"
																			style={{
																				width: '127px',
																				height: '31px',
																				background:
																					selectedContacts.length === 0 ||
																					primaryCtaPending
																						? 'rgba(93, 171, 104, 0.1)'
																						: '#B8E4BE',
																				border: '2px solid #000000',
																				color:
																					selectedContacts.length === 0 ||
																					primaryCtaPending
																						? 'rgba(0, 0, 0, 0.4)'
																						: '#000000',
																				fontSize: '13px',
																				fontWeight: 700,
																				fontFamily: 'Inter, sans-serif',
																				borderRadius: '8px',
																				lineHeight: 'normal',
																				display: 'flex',
																				alignItems: 'center',
																				justifyContent: 'center',
																				padding: '0',
																				textAlign: 'center',
																				whiteSpace: 'nowrap',
																				cursor:
																					selectedContacts.length === 0 ||
																					primaryCtaPending
																						? 'default'
																						: 'pointer',
																				opacity:
																					selectedContacts.length === 0 ||
																					primaryCtaPending
																						? 0.6
																						: 1,
																			}}
																		>
																			{primaryCtaLabel}
																		</button>
																	) : null
																}
																headerInlineAction={
																	<button
																		onClick={() => {
																			setMapPanelShiftClickAnchor(null);
																			handleSelectAll(mapPanelContacts);
																		}}
																		className="text-[14px] font-secondary font-normal text-black hover:underline"
																		type="button"
																	>
																		{isAllPanelContactsSelected
																			? 'Deselect All'
																			: 'Select all'}
																	</button>
																}
															/>
														</CardContent>
													</Card>
													{/* Desktop button (non-sticky) */}
													{!isMobile && !fromHomeParam && (
														<div className="flex items-center justify-center w-full search-results-cta-wrapper">
															<Button
																isLoading={primaryCtaPending}
																variant="primary-light"
																bold
																className="relative w-full max-w-[984px] h-[39px] mx-auto mt-[20px] !bg-[#5DAB68] hover:!bg-[#5DAB68] !text-white border border-[#000000] overflow-hidden"
																onClick={() => {
																	if (selectedContacts.length === 0) return;
																	handlePrimaryCta();
																}}
															>
																<span
																	className="relative z-20"
																	style={{
																		fontFamily: 'Inter, sans-serif',
																		fontWeight: 700,
																	}}
																>
																	{primaryCtaLabel}
																</span>
																<div
																	className="absolute inset-y-0 right-0 w-[65px] z-20 flex items-center justify-center bg-[#74D178] cursor-pointer"
																	onClick={(e) => {
																		e.stopPropagation();
																		setMapPanelShiftClickAnchor(null);
																		handleSelectAll(mapPanelContacts);
																	}}
																>
																	<span className="text-black text-[14px] font-medium">
																		All
																	</span>
																</div>
																<span
																	aria-hidden="true"
																	className="pointer-events-none absolute inset-y-0 right-[65px] w-[2px] bg-[#349A37] z-10"
																/>
															</Button>
														</div>
													)}

													{/* Mobile sticky button at bottom */}
													{isMobile &&
														!fromHomeParam &&
														typeof window !== 'undefined' &&
														createPortal(
															<div className="mobile-sticky-cta">
																<Button
																	onClick={handlePrimaryCta}
																	isLoading={primaryCtaPending}
																	variant="primary-light"
																	bold
																	className="w-full h-[54px] min-h-[54px] !rounded-none !bg-[#5dab68] hover:!bg-[#5DAB68] !text-white border border-[#000000] transition-colors !opacity-100 disabled:!opacity-100"
																	disabled={
																		selectedContacts.length === 0 || primaryCtaPending
																	}
																>
																	<span
																		style={{
																			fontFamily: 'Inter, sans-serif',
																			fontWeight: 700,
																		}}
																	>
																		{primaryCtaLabel}
																	</span>
																</Button>
															</div>,
															document.body
														)}
												</>
											)}
										</div>
										{/* Right-side box */}
										{!isMobile && hoveredContact && (
											<div
												className="hidden xl:block search-results-research-panel"
												style={{
													left: 'calc(50% + 502px + 33px)',
												}}
											>
												<ContactResearchPanel contact={hoveredContact} />
											</div>
										)}
									</div>
								) : hasSearched &&
								  (contacts === undefined ||
										(Array.isArray(contacts) && contacts.length === 0)) ? (
									<div className="mt-10 w-full px-4">
										<Card className="w-full max-w-full mx-auto">
											<CardContent className="py-8">
												<div className="text-center">
													<Typography variant="h3" className="mb-2">
														No Results Found
													</Typography>
													<Typography className="text-gray-600">
														No contacts match your search criteria. Try a different search
														term.
													</Typography>
												</div>
											</CardContent>
										</Card>
									</div>
								) : null}
							</>
						)}

						{/* Panel content for search tab - driven by the action bar icon selection.
						    Skipped in add-to-campaign (pick-flow) mode: the rehydration effect flips
						    hasSearched within a couple frames, so this subtree would mount, flash over
						    the interactive map, and unmount — pure waste on a tab transition. */}
						{!hasSearched && !isAddToCampaignMode && activeTab === 'search' && (
							<div
								ref={tabbedLandingBoxRef}
								className="campaigns-table-wrapper dashboard-recent-campaigns w-full max-w-[960px] mx-auto px-4"
								style={{
									willChange: 'transform, opacity',
								}}
							>
								{/* Inner div (not tabbedLandingBoxRef) is the scroll-to-map scrub target so it
								    doesn't fight the GSAP tab-transition fade on the outer ref. */}
								<div className="dashboard-landing-panel mt-[30px] mb-[18px] w-full flex flex-col items-center">
									{selectedActionBarIcon === 'playbook' && (
										<DashboardStrategyBox
											onSearchContacts={handleMapBottomForYouSubmit}
										/>
									)}
									{selectedActionBarIcon === 'calendar' && (
										<DashboardCalendarPanel
											mockState={calendarMockState}
											persistEvents={isSignedIn === true}
											showTodayReturnButton
											onPopupOpenChange={setIsCalendarPopupOpen}
										/>
									)}
									{selectedActionBarIcon === 'folder' && (
										<CampaignsTable
											mockState={campaignsMockState}
											onMockStateChange={setCampaignsMockState}
											onFinderOpenChange={setIsCampaignFinderOpen}
											enableRowDelete
										/>
									)}
									{selectedActionBarIcon === 'star' && (
										<DashboardOpportunitiesWidget
											enabled={isSignedIn === true}
											mockState={opportunitiesMockState}
										/>
									)}
									{selectedActionBarIcon === 'envelope' && (
										<DashboardResponsesWidget
											enabled={isSignedIn === true}
											mockState={responsesMockState}
										/>
									)}
								</div>
							</div>
						)}

						{campaignsDebugEnabled && (
							<CampaignsTableDebugPanel
								value={campaignsMockState}
								onChange={setCampaignsMockState}
							/>
						)}

						{calendarDebugEnabled && (
							<DashboardCalendarDebugPanel
								value={calendarMockState}
								onChange={setCalendarMockState}
							/>
						)}

						{opportunitiesDebugEnabled && (
							<DashboardOpportunitiesDebugPanel
								value={opportunitiesMockState}
								onChange={setOpportunitiesMockState}
							/>
						)}

						{inboxDebugEnabled && (
							<DashboardResponsesDebugPanel
								value={responsesMockState}
								onChange={setResponsesMockState}
							/>
						)}

						{/* Sign-up overlay for "from home" mode when user is not authenticated */}
						{/* Shows after 3 seconds so user can see the map and placeholders first */}
						{fromHomeParam &&
							isAuthLoaded &&
							isSignedIn === false &&
							showFromHomeSignUp &&
							typeof window !== 'undefined' &&
							createPortal(
								<div className="fixed inset-0 z-[10000] flex items-center justify-center">
									<SignUp
										appearance={withClerkNoBranding({
											elements: {
												rootBox: 'w-full max-w-[420px] mx-4',
												cardBox: { boxShadow: 'none' },
												card: {
													boxShadow: 'none',
													borderRadius: '16px',
												},
												formButtonPrimary:
													'bg-black hover:bg-gray-800 text-sm normal-case',
												socialButtonsBlockButton:
													'border border-gray-300 hover:bg-gray-50',
												dividerLine: 'bg-gray-200',
												dividerText: 'text-gray-500',
												formFieldLabel: 'text-gray-700',
												formFieldInput:
													'border-gray-300 focus:border-black focus:ring-black',
												footerActionLink: 'text-black hover:text-gray-700',
											},
										})}
										routing="hash"
										forceRedirectUrl={`${urls.murmur.dashboard.index}?fromHome=true`}
										signInUrl={`/sign-in?redirect_url=${encodeURIComponent(`${urls.murmur.dashboard.index}?fromHome=true`)}`}
										signInForceRedirectUrl={`${urls.murmur.dashboard.index}?fromHome=true`}
									/>
								</div>,
								document.body
							)}

						{/* Free trial prompt for "from home" mode when user is authenticated but has no subscription (after 15s) */}
						{isFreeTrialPromptVisible &&
							typeof window !== 'undefined' &&
							createPortal(
								<div className="fixed inset-0 z-[10000] flex items-center justify-center">
									<div
										className="flex flex-col items-center rounded-[16px] pointer-events-auto py-8 px-8"
										style={{
											backgroundColor: '#6FCF84',
											border: '3px solid #000000',
										}}
									>
										<button
											type="button"
											onClick={handleStartFreeTrial}
											className="font-semibold text-white rounded-[8px] cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
											style={{
												width: '475px',
												height: '56px',
												backgroundColor: '#1D942E',
												border: '3px solid #000000',
											}}
										>
											Start Your Free Trial
										</button>
										<div
											className="flex flex-col items-center justify-center text-center mt-5"
											style={{
												fontFamily: '"Times New Roman", Times, serif',
											}}
										>
											<p className="text-lg italic text-black mb-1">
												&quot;You miss 100% of the shots you don&apos;t take&quot;
											</p>
											<p className="text-sm text-black">-Wayne Gretzky</p>
										</div>
									</div>
								</div>,
								document.body
							)}

						{/* Apply modal - centered two-box overlay (opened from either Apply button) */}
						<ApplyModal
							open={applyModalOpen}
							event={applyModalEvent}
							onClose={() => {
								setApplyModalOpen(false);
								setApplyModalEvent(null);
							}}
						/>

						{/* Unsubscribe flow — settings-styled multi-step overlay over the bare globe */}
						{isUnsubscribeFlowOpen && isSignedIn && <UnsubscribeFlow />}
					</div>
				</AppLayout>
			</div>
		</>
	);
};

const Dashboard = () => {
	return (
		<Suspense
			fallback={
				// Matches the cinematic boot splash (dark starfield + boot-skinned logo) so a
				// suspended first render is visually seamless with the post-hydration splash.
				<div
					className="flex min-h-screen flex-col items-center justify-center gap-4"
					style={{ backgroundColor: '#1f2123' }}
				>
					<DashboardBootBackdrop />
					<MurmurLogoNew width={180} height={32} className="murmur-logo-boot" />
				</div>
			}
		>
			<SendQueueViewProvider>
				<DashboardContent />
			</SendQueueViewProvider>
		</Suspense>
	);
};

export default Dashboard;
