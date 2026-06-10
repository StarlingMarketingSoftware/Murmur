'use client';

import {
	FC,
	memo,
	Suspense,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
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
import { useDashboard } from './useDashboard';
import { urls } from '@/constants/urls';
import {
	getMsUntilNextSearchGradientBucket,
	getSearchGradientForDate,
} from '@/constants/searchGradients';
import { isProblematicBrowser } from '@/utils/browserDetection';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import MurmurLogoNew from '@/components/atoms/_svg/MurmurLogoNew';
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
	useGetContactResearch,
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
	type SearchResultsMapProps,
} from '@/components/molecules/SearchResultsMap/SearchResultsMap';
import MapRadiusSlider, {
	RADIUS_DEFAULT_MILES,
} from '@/components/molecules/MapRadiusSlider';
import type {
	LatLngLiteral,
	MarkerHoverMeta,
} from '@/components/molecules/SearchResultsMap/types';
import {
	type PersistentDashboardMapConfig,
	usePersistentMapReady,
	usePersistentMapSetter,
} from '@/contexts/PersistentMapContext';
import { DashboardBootBackdrop } from '@/components/molecules/DashboardBootBackdrop/DashboardBootBackdrop';
import { useGlobeWeatherMood } from '@/hooks/useGlobeWeatherMood';
import { useGlobeNightLighting } from '@/hooks/useGlobeNightLighting';
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
import { CampaignsInboxView } from '@/components/molecules/CampaignsInboxView/CampaignsInboxView';
import InboxSection from '@/components/molecules/InboxSection/InboxSection';
import { CampaignHeaderBox } from '@/components/molecules/CampaignHeaderBox/CampaignHeaderBox';
import { DashboardWriteOverlay } from './DashboardWriteOverlay';
import { MapEventPopupCard, formatMapPostedEventDate } from './MapEventPopupCard';
import { ApplyModal } from './ApplyModal';
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
	useGetCampaigns,
	getCampaignDetailQueryKey,
	fetchCampaignDetail,
} from '@/hooks/queryHooks/useCampaigns';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
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

const CURATED_URL_PARAM_KEYS = ['pick', 'state', 'cat', 'lat', 'lon', 'r'] as const;
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

const MAP_RESULTS_SEARCH_TRAY_WHAT_ICON_BY_LABEL: Record<
	string,
	{ backgroundColor: string; Icon: FC<{ size?: number; className?: string }> }
> = {
	'Radio Stations': { backgroundColor: '#56DA73', Icon: RadioStationsIcon },
	'Music Venues': { backgroundColor: '#71C9FD', Icon: MusicVenuesIcon },
	'Wine, Beer, and Spirits': { backgroundColor: '#80AAFF', Icon: WineBeerSpiritsIcon },
	Restaurants: { backgroundColor: '#77DD91', Icon: RestaurantsIcon },
	'Coffee Shops': { backgroundColor: '#A9DE78', Icon: CoffeeShopsIcon },
	'Wedding Planners': { backgroundColor: '#EED56E', Icon: WeddingPlannersIcon },
	Festivals: { backgroundColor: '#80AAFF', Icon: FestivalsIcon },
};

const MAP_RESULTS_SEARCH_TRAY = {
	containerWidth: 189,
	containerHeight: 52,
	containerRadius: 6,
	itemSize: 43,
	itemRadius: 12,
	itemGap: 12,
	gapToSearchBar: 43,
	borderWidth: 3,
	borderColor: '#000000',
	backgroundColor: 'rgba(255, 255, 255, 0.9)',
	nearMeBackgroundColor: '#D0E6FF',
	whyBackgroundColors: {
		booking: '#9DCBFF',
		promotion: '#7AD47A',
	},
	whatIconByLabel: MAP_RESULTS_SEARCH_TRAY_WHAT_ICON_BY_LABEL,
} as const;

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

// Cinematic boot splash over the cold-loading map: minimum on-screen time (so a fast
// cached load never flashes the starfield), fade-out duration, and a safety cap that
// dismisses the splash even if Mapbox errors or never loads.
const DASHBOARD_BOOT_MIN_VISIBLE_MS = 1200;
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

// Resolution-aware zoom for the fullscreen map view. Mirrors the campaign page's tuned
// `SIXTEEN_BY_TEN_ZOOM_MAP` / `SIXTEEN_BY_NINE_ZOOM_MAP` tables so the dashboard map-view
// chrome lands at the same physical size as the campaign chrome on every monitor.
const DASHBOARD_MAP_ZOOM_DEFAULT = 0.85;
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
const DASHBOARD_MAP_ZOOM_MATCH_TOLERANCE_PX = 50;
const DASHBOARD_MAP_ZOOM_MIN = 0.5;
const DASHBOARD_MAP_ZOOM_MAX = 1.6;
const DASHBOARD_MAP_SIXTEEN_BY_TEN_ZOOM_MAP: Array<{
	w: number;
	h: number;
	zoom: number;
}> = [
	{ w: 1152, h: 720, zoom: 0.52 },
	{ w: 1280, h: 800, zoom: 0.6 },
	{ w: 1440, h: 900, zoom: 0.7 },
	{ w: 1504, h: 940, zoom: 0.84 },
	{ w: 1664, h: 1040, zoom: 0.77 },
	{ w: 1920, h: 1200, zoom: 0.95 },
	{ w: 2048, h: 1280, zoom: 0.95 },
	{ w: 2304, h: 1440, zoom: 1.1 },
	{ w: 2592, h: 1620, zoom: 1.2 },
	{ w: 2880, h: 1800, zoom: 1.2 },
	{ w: 2976, h: 1860, zoom: 1.45 },
	{ w: 4608, h: 2880, zoom: 1.6 },
];
const DASHBOARD_MAP_SIXTEEN_BY_TEN_FALLBACK_ZOOM = 0.8;
type DashboardMapZoomPoint = { w: number; h: number; zoom: number; metric: number };
const DASHBOARD_MAP_SIXTEEN_BY_TEN_ZOOM_POINTS: DashboardMapZoomPoint[] =
	DASHBOARD_MAP_SIXTEEN_BY_TEN_ZOOM_MAP.map((entry) => ({
		...entry,
		metric: Math.hypot(entry.w, entry.h),
	})).sort((a, b) => a.metric - b.metric);
const DASHBOARD_MAP_SIXTEEN_BY_NINE_ZOOM_MAP: Array<{
	w: number;
	h: number;
	zoom: number;
}> = [
	{ w: 1280, h: 720, zoom: 0.52 },
	{ w: 1344, h: 756, zoom: 0.55 },
	{ w: 1600, h: 900, zoom: 0.68 },
	{ w: 1920, h: 1080, zoom: 0.83 },
];
const DASHBOARD_MAP_SIXTEEN_BY_NINE_FALLBACK_ZOOM = 0.85;
const DASHBOARD_MAP_SIXTEEN_BY_NINE_ZOOM_POINTS: DashboardMapZoomPoint[] =
	DASHBOARD_MAP_SIXTEEN_BY_NINE_ZOOM_MAP.map((entry) => ({
		...entry,
		metric: Math.hypot(entry.w, entry.h),
	})).sort((a, b) => a.metric - b.metric);

const clampDashboardMapZoom = (
	z: number,
	min = DASHBOARD_MAP_ZOOM_MIN,
	max = DASHBOARD_MAP_ZOOM_MAX
) => Math.min(max, Math.max(min, z));

const computeDashboardMapZoomForViewport = (
	viewportW: number,
	viewportH: number
): number => {
	if (!Number.isFinite(viewportW) || !Number.isFinite(viewportH)) {
		return DASHBOARD_MAP_ZOOM_DEFAULT;
	}
	if (viewportW <= 0 || viewportH <= 0) return DASHBOARD_MAP_ZOOM_DEFAULT;

	const ratio = viewportW / viewportH;
	const IDEAL_16X10 = 16 / 10;
	const IDEAL_16X9 = 16 / 9;
	const viewportDelta16x10 = Math.abs(ratio - IDEAL_16X10);
	const viewportDelta16x9 = Math.abs(ratio - IDEAL_16X9);
	const screenW =
		(typeof window !== 'undefined' &&
			(window.screen?.availWidth ?? window.screen?.width)) ||
		viewportW;
	const screenH =
		(typeof window !== 'undefined' &&
			(window.screen?.availHeight ?? window.screen?.height)) ||
		viewportH;
	const screenRatio = screenW > 0 && screenH > 0 ? screenW / screenH : ratio;
	const screenDelta16x10 = Math.abs(screenRatio - IDEAL_16X10);
	const screenDelta16x9 = Math.abs(screenRatio - IDEAL_16X9);
	const isSixteenByTenish = viewportDelta16x10 <= 0.14 || screenDelta16x10 <= 0.14;
	const isSixteenByNineish = viewportDelta16x9 <= 0.08 || screenDelta16x9 <= 0.08;

	let targetZoom = DASHBOARD_MAP_ZOOM_DEFAULT;

	const pickFromTable = (
		table: Array<{ w: number; h: number; zoom: number }>,
		points: DashboardMapZoomPoint[],
		fallback: number
	) => {
		const matchScreenW = screenW || viewportW;
		const matchScreenH = screenH || viewportH;

		const findNearMatch = (w: number, h: number) =>
			table.find(
				(entry) =>
					Math.abs(w - entry.w) <= DASHBOARD_MAP_ZOOM_MATCH_TOLERANCE_PX &&
					Math.abs(h - entry.h) <= DASHBOARD_MAP_ZOOM_MATCH_TOLERANCE_PX
			);

		const interpolateZoom = (w: number, h: number) => {
			const metric = Math.hypot(w, h);
			if (!Number.isFinite(metric) || metric <= 0 || points.length === 0) {
				return fallback;
			}
			const first = points[0];
			const last = points[points.length - 1];
			if (metric <= first.metric) return first.zoom;
			if (metric >= last.metric) return last.zoom;
			for (let i = 0; i < points.length - 1; i++) {
				const a = points[i];
				const b = points[i + 1];
				if (metric < a.metric || metric > b.metric) continue;
				const denom = b.metric - a.metric;
				const t = denom > 0 ? (metric - a.metric) / denom : 0;
				return a.zoom + (b.zoom - a.zoom) * t;
			}
			return fallback;
		};

		const distanceToMap = (w: number, h: number) => {
			let best = Number.POSITIVE_INFINITY;
			for (const entry of points) {
				best = Math.min(best, Math.hypot(w - entry.w, h - entry.h));
			}
			return best;
		};

		const screenNearMatch = findNearMatch(matchScreenW, matchScreenH);
		if (screenNearMatch) return screenNearMatch.zoom;
		const viewportNearMatch = findNearMatch(viewportW, viewportH);
		if (viewportNearMatch) return viewportNearMatch.zoom;
		const screenDistance = distanceToMap(matchScreenW, matchScreenH);
		const viewportDistance = distanceToMap(viewportW, viewportH);
		const useViewportDims = viewportDistance + 0.5 < screenDistance;
		const w = useViewportDims ? viewportW : matchScreenW;
		const h = useViewportDims ? viewportH : matchScreenH;
		return interpolateZoom(w, h);
	};

	if (isSixteenByTenish) {
		targetZoom = pickFromTable(
			DASHBOARD_MAP_SIXTEEN_BY_TEN_ZOOM_MAP,
			DASHBOARD_MAP_SIXTEEN_BY_TEN_ZOOM_POINTS,
			DASHBOARD_MAP_SIXTEEN_BY_TEN_FALLBACK_ZOOM
		);
	} else if (isSixteenByNineish) {
		targetZoom = pickFromTable(
			DASHBOARD_MAP_SIXTEEN_BY_NINE_ZOOM_MAP,
			DASHBOARD_MAP_SIXTEEN_BY_NINE_ZOOM_POINTS,
			DASHBOARD_MAP_SIXTEEN_BY_NINE_FALLBACK_ZOOM
		);
	}

	// Dock / windowed overrides, mirrored from the campaign page so behaviour matches when
	// the macOS Dock is visible or the browser window is not maximized.
	if (viewportW >= 1400 && viewportH <= 780) {
		targetZoom = clampDashboardMapZoom(targetZoom, 0.7);
	}
	if (viewportW >= 1900 && viewportW <= 2050 && viewportH >= 1180 && viewportH <= 1245) {
		targetZoom = clampDashboardMapZoom(targetZoom, undefined, 0.93);
	}
	if (viewportW >= 2100 && viewportW <= 2200 && viewportH >= 1320 && viewportH <= 1380) {
		targetZoom = clampDashboardMapZoom(targetZoom, 1.2);
	}

	return clampDashboardMapZoom(targetZoom);
};

const MAP_SELECT_GRAB_LEFT_PX = 26;
// Base scales for the left-side map tools. Slightly higher than the chrome's 0.85 so they
// don't shrink too far under the resolution-aware root zoom.
const MAP_SELECT_GRAB_MIN_VIEW_SCALE = 0.8;
const MAP_SELECT_GRAB_DEFAULT_VIEW_SCALE = 0.84;
const MAP_SELECT_GRAB_MAX_VIEW_SCALE = 0.95;
const MAP_SELECT_GRAB_SCALE_GROW_START_HEIGHT_PX = 1180;
const MAP_SELECT_GRAB_SCALE_GROW_END_HEIGHT_PX = 1480;
const MAP_SELECT_GRAB_VIEWPORT_INSET_PX = 16;
const MAP_VIEW_SIDE_PANEL_VISUAL_TOP_PX = 106;
const MAP_VIEW_SIDE_PANEL_BOTTOM_GAP_PX = 20;
const MAP_PANEL_ABRIDGED_RESEARCH_HEIGHT_PX = 292;
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
// Keep both map side panels visually pinned after the dashboard root zoom is applied.
const MAP_VIEW_SIDE_PANEL_TOP_CSS = `calc(${MAP_VIEW_SIDE_PANEL_VISUAL_TOP_PX}px / var(--murmur-dashboard-zoom, ${DASHBOARD_MAP_ZOOM_DEFAULT}))`;
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
const MAP_ZOOM_CONTROL_LEVELS = [
	2.25, 2.41, 2.57, 2.73, 2.88, 3.04, 3.2, 3.52, 3.83, 4.15, 4.47, 4.78, 5.1, 5.34, 5.58,
	5.81, 6.05, 6.29, 6.52, 6.76, 7,
] as const;
const MAP_ZOOM_CONTROL_MAX_INDEX = MAP_ZOOM_CONTROL_LEVELS.length - 1;
type MapZoomControlRequest = { zoom: number; nonce: number; isDragging?: boolean };

const clampMapZoomControlValue = (levelValue: number) => {
	if (!Number.isFinite(levelValue)) return 0;
	return Math.min(Math.max(levelValue, 0), MAP_ZOOM_CONTROL_MAX_INDEX);
};

const getMapZoomForControlValue = (levelValue: number) => {
	const safeValue = clampMapZoomControlValue(levelValue);
	const lowerIndex = Math.floor(safeValue);
	const upperIndex = Math.min(lowerIndex + 1, MAP_ZOOM_CONTROL_MAX_INDEX);
	const progress = safeValue - lowerIndex;
	const lowerZoom = MAP_ZOOM_CONTROL_LEVELS[lowerIndex] ?? MAP_ZOOM_CONTROL_LEVELS[0];
	const upperZoom = MAP_ZOOM_CONTROL_LEVELS[upperIndex] ?? lowerZoom;
	return lowerZoom + (upperZoom - lowerZoom) * progress;
};

const getMapZoomControlValueForZoom = (zoom: number) => {
	if (!Number.isFinite(zoom)) return 0;
	const minZoom = MAP_ZOOM_CONTROL_LEVELS[0] ?? 0;
	const maxZoom = MAP_ZOOM_CONTROL_LEVELS[MAP_ZOOM_CONTROL_MAX_INDEX] ?? minZoom;
	if (zoom <= minZoom) return 0;
	if (zoom >= maxZoom) return MAP_ZOOM_CONTROL_MAX_INDEX;

	for (let index = 0; index < MAP_ZOOM_CONTROL_MAX_INDEX; index += 1) {
		const lowerZoom = MAP_ZOOM_CONTROL_LEVELS[index] ?? minZoom;
		const upperZoom = MAP_ZOOM_CONTROL_LEVELS[index + 1] ?? lowerZoom;
		if (zoom <= upperZoom) {
			const span = upperZoom - lowerZoom;
			if (span <= 0) return index;
			return index + (zoom - lowerZoom) / span;
		}
	}

	return MAP_ZOOM_CONTROL_MAX_INDEX;
};

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
	/** When true, the submit button fires even with an empty box (Profile mode). */
	allowEmptySubmit?: boolean;
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
		allowEmptySubmit = false,
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
				{value.length === 0 && (
					<div
						aria-hidden="true"
						className="absolute flex items-center gap-[4px] font-inter text-[16px] leading-none text-black pointer-events-none"
						style={{
							top: 0,
							left: isInitialDashboardSearch ? '24px' : '14px',
							right: `${anythingRightReservedWidth}px`,
							height: isInitialDashboardSearch
								? `${INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.height - 4}px`
								: `${MAP_RESULTS_BOTTOM_SEARCH_BOX.textRowHeight}px`,
							fontSize: isInitialDashboardSearch ? '16px' : undefined,
							fontWeight: isInitialDashboardSearch ? 500 : undefined,
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
						if (value.trim().length > 0 || allowEmptySubmit) {
							onSubmit();
						} else {
							onActivate();
						}
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
					aria-label="Select For You"
					aria-pressed={isForYouSelected}
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
					onClick={() =>
						onSelectedSearchFollowupChange(isForYouSelected ? null : 'for-you')
					}
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

const SearchTrayIconTile = ({
	backgroundColor,
	children,
}: {
	backgroundColor: string;
	children: ReactNode;
}) => {
	return (
		<div
			className="flex items-center justify-center flex-shrink-0"
			style={{
				width: `${MAP_RESULTS_SEARCH_TRAY.itemSize}px`,
				height: `${MAP_RESULTS_SEARCH_TRAY.itemSize}px`,
				backgroundColor,
				borderRadius: `${MAP_RESULTS_SEARCH_TRAY.itemRadius}px`,
			}}
		>
			{children}
		</div>
	);
};

// Map-overlay rows can arrive without the research-detail fields (slim payload — see
// api/contacts/map-overlay). When a hovered contact is missing them entirely (key absent;
// null means fetched-but-empty), lazily fetch and merge them so the hover research panel
// fills in instead of rendering blank.
const useContactWithResearch = (contact: ContactWithName | null) => {
	// Cast for the `in` check: ContactWithName declares `metadata`, so TS would
	// otherwise narrow the no-key branch (a slim overlay row) to `never`.
	const needsResearch =
		contact != null && !('metadata' in (contact as Record<string, unknown>));
	const { data: research } = useGetContactResearch(
		contact && needsResearch ? contact.id : null
	);
	return useMemo(() => {
		if (!contact) return null;
		if (!research || research.id !== contact.id) return contact;
		return { ...contact, ...research };
	}, [contact, research]);
};

const DashboardContent = () => {
	const { openSignIn } = useClerk();
	const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const isMobile = useIsMobile();
	const { data: campaigns, isLoading: isLoadingCampaigns } = useGetCampaigns();
	const hasCampaigns = campaigns && campaigns.length > 0;
	const queryClient = useQueryClient();
	const setPersistentMapConfig = usePersistentMapSetter();
	const {
		mood: globeWeatherMood,
		temperatureF: globeWeatherTemperatureF,
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
	// remaining args reuse short keys (state/cat/lat/lon/r) under that namespace.
	const curatedModeParam = searchParams.get('pick')?.trim() === '1';
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
	const addToCampaignUserContactListId = fromCampaign?.userContactLists?.[0]?.id;
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

	// Add body class when on mobile with empty dashboard to hide global Clerk button
	useEffect(() => {
		if (isMobile && !hasCampaigns) {
			document.body.classList.add('murmur-mobile-empty');
		} else {
			document.body.classList.remove('murmur-mobile-empty');
		}
		return () => {
			document.body.classList.remove('murmur-mobile-empty');
		};
	}, [isMobile, hasCampaigns]);

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
	const [isNearMeLocation, setIsNearMeLocation] = useState(false);
	const hasWhereValue = whereValue.trim().length > 0;
	const isPromotion = whyValue === '[Promotion]';
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

	// ── Radius search mode (the bottom "Radius" pill) ──────────────────────────
	const [isRadiusModeEnabled, setIsRadiusModeEnabled] = useState(false);
	const [radiusCenter, setRadiusCenter] = useState<LatLngLiteral | null>(null);
	const [radiusMiles, setRadiusMiles] = useState(RADIUS_DEFAULT_MILES);
	// Ref mirrors so submitMapBottomSearchQuery (a stable useCallback) reads current
	// radius values without churning its deps on every slider tick.
	const isRadiusModeEnabledRef = useRef(false);
	const radiusCenterRef = useRef<LatLngLiteral | null>(null);
	const radiusMilesRef = useRef(RADIUS_DEFAULT_MILES);
	// Cancels a stale async geolocation enable (toggled off / re-toggled mid-fetch).
	const radiusEnableTokenRef = useRef(0);
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

	const isMapBottomForYouMode = mapBottomSearchFollowupSelection === 'for-you';
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
			setIsBelowMd(width < 768);
			setIsXlDesktop(width >= 1280);
			setViewportHeight(window.innerHeight);
			// Same zoom the map-view layout effect applies, so chrome state and zoom
			// always change together from the same inputs.
			const layoutWidth =
				width / computeDashboardMapZoomForViewport(width, window.innerHeight);
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
		usedContactIdsSet,
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
		ensureActiveCampaign,
	} = useDashboard({
		derivedTitle: derivedContactTitle,
		forceApplyDerivedTitle: shouldForceApplyDerivedTitle,
		fromHome: fromHomeParam,
		disableAutoCreateCampaign: isAddToCampaignMode,
	});

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
	useEffect(() => {
		if (!isWriteMode) setIsWriteReviewActive(false);
	}, [isWriteMode]);

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
		fromCampaignIdParam ||
		(activeCampaignId != null ? String(activeCampaignId) : '');

	// The exact contacts filter the campaign page issues (see useDraftingSection):
	// derived purely from the campaign's contact lists, so the prefetch lands on the
	// same React Query key. null when the campaign isn't warm enough to build it —
	// in that case we skip the contacts prefetch rather than miss the key.
	const prefetchContactsFilter = useMemo(() => {
		const campaignForPrefetch = fromCampaign ?? activeCampaign;
		const lists = campaignForPrefetch?.userContactLists;
		if (!lists) return null;
		return { contactListIds: lists.map((list) => list.id) };
	}, [fromCampaign, activeCampaign]);

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
	}, [queryClient, mapCampaignId, prefetchContactsFilter]);

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

	const shouldEnableMapStateCategorySelection = isMapView && isMapBottomCategoryMode;

	const handleMapStateSelect = useCallback(
		(stateName: string) => {
			// In demo mode, show the free trial prompt instead of searching
			if (isFromHomeDemoMode) {
				setShowFreeTrialPrompt(true);
				return;
			}

			const nextState = (stateName || '').trim();
			if (!nextState) return;

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

		// If BOTH Why + What are empty, set a default "starter" search.
		if (!nextWhy && !nextWhat) {
			nextWhy = '[Booking]';
			nextWhat = 'Wine, Beer, and Spirits';
			setWhyValue(nextWhy);
			setWhatValue(nextWhat);
		}

		// If Where is empty, try to infer the user's state from coarse IP geolocation
		// (no permission prompt). `getApproximateLocation` caches in localStorage for
		// 24h and falls back through ipapi.co → ipwho.is, so this is essentially free
		// after the first successful resolution.
		if (!nextWhere) {
			let inferredWhere: string | null = null;
			try {
				const loc = await Promise.race([
					getApproximateLocation(),
					new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
				]);
				if (loc) {
					inferredWhere =
						normalizeUsStateName(loc.regionCode) ?? normalizeUsStateName(loc.region);
				}
			} catch {
				// Non-fatal — falls through to the random-state fallback below.
			}
			if (inferredWhere) {
				nextWhere = inferredWhere;
				setWhereValue(inferredWhere);
				setIsNearMeLocation(false);
			}
		}

		// Ultimate fallback: if we still can't infer a state, pick a random lower-48 state
		// so "Where" is never blank. (Exclude Alaska/Hawaii.)
		if (!nextWhere) {
			const lower48States = buildAllUsStateNames().filter(
				(s) => s !== 'Alaska' && s !== 'Hawaii'
			);
			const fallback =
				lower48States[Math.floor(Math.random() * lower48States.length)] ?? 'California';
			nextWhere = fallback;
			setWhereValue(fallback);
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
	}, [form, hasSearched, whatValue, whereValue, whyValue]);

	// Free trial CTA for fromHome demo mode
	const handleStartFreeTrial = useCallback(() => {
		router.push(urls.freeTrial.index);
	}, [router]);

	const DASHBOARD_MAP_COMPACT_CLASS = 'murmur-dashboard-map-compact';
	const DASHBOARD_COMPACT_CLASS = 'murmur-dashboard-compact';
	const DASHBOARD_ZOOM_VAR = '--murmur-dashboard-zoom';
	const DASHBOARD_INITIAL_ZOOM_VAR = '--murmur-dashboard-initial-zoom';
	const DASHBOARD_VIEWPORT_H_VAR = '--murmur-dashboard-viewport-h';

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
			return;
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
			return;
		}

		document.documentElement.classList.add(DASHBOARD_MAP_COMPACT_CLASS);

		const applyMapViewZoom = () => {
			if (typeof window === 'undefined') return;
			const w = window.innerWidth;
			const h = window.innerHeight;
			const zoom = computeDashboardMapZoomForViewport(w, h);
			// Always set the var inline: the non-map baseline (DASHBOARD_INITIAL_ZOOM) differs
			// from the map default, so an unset var no longer means "the right zoom applies".
			document.documentElement.style.setProperty(DASHBOARD_ZOOM_VAR, zoom.toFixed(3));
		};

		applyMapViewZoom();
		window.addEventListener('resize', applyMapViewZoom);

		return () => {
			window.removeEventListener('resize', applyMapViewZoom);
			document.documentElement.classList.remove(DASHBOARD_MAP_COMPACT_CLASS);
			document.documentElement.style.removeProperty(DASHBOARD_ZOOM_VAR);
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
			// won't have captured lat/lon in the URL the way a refresh-resume does. Match the
			// "For You" submit by trying `getApproximateLocation` so the curated picks are
			// location-aware instead of falling back to an unrestricted sample.
			const hasCapturedCoords = curatedLatParam != null && curatedLonParam != null;
			void (async () => {
				let lat = curatedLatParam;
				let lon = curatedLonParam;
				if (!hasCapturedCoords) {
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
			const hasCapturedCoords = curatedLatParam != null && curatedLonParam != null;
			void (async () => {
				let lat = curatedLatParam;
				let lon = curatedLonParam;
				if (!hasCapturedCoords) {
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

		if (isPendingFromCampaign) {
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
			router.push(`${urls.murmur.campaign.detail(fromCampaignIdParam)}?origin=search`);
		} catch (error) {
			console.error('Error adding contacts to campaign:', error);
			toast.error('Failed to add contacts to campaign');
		}
	}, [
		fromCampaignIdParam,
		addToCampaignUserContactListId,
		batchUpdateContacts,
		contacts,
		derivedContactTitle,
		editUserContactList,
		isAddToCampaignMode,
		isPendingFromCampaign,
		shouldForceApplyDerivedTitle,
		queryClient,
		router,
		selectedContacts,
		setSelectedContacts,
	]);

	const activeCampaignUserContactListId = activeCampaign?.userContactLists?.[0]?.id;

	const handleAddSelectedToActiveCampaign = useCallback(async () => {
		if (selectedContacts.length === 0) {
			toast.error('Please select contacts to add');
			return;
		}

		if (activeCampaignId == null || !activeCampaign) {
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
				`${addedCount} contact${addedCount === 1 ? '' : 's'} added to ${activeCampaign.name}`
			);

			router.push(`${urls.murmur.campaign.detail(activeCampaignId)}?origin=search`);
		} catch (error) {
			console.error('Error adding contacts to active campaign:', error);
			toast.error('Failed to add contacts to campaign');
		}
	}, [
		activeCampaign,
		activeCampaignId,
		activeCampaignUserContactListId,
		batchUpdateContacts,
		contacts,
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

			const folderName =
				activeCampaign?.userContactLists?.[0]?.name ?? activeCampaign?.name ?? 'folder';
			toast.success(
				`${addedCount} contact${addedCount === 1 ? '' : 's'} added to ${folderName}`
			);
		} catch (error) {
			console.error('Error adding contacts to context folder:', error);
			toast.error('Failed to add contacts to folder');
		}
	}, [
		activeCampaign,
		activeCampaignUserContactListId,
		batchUpdateContacts,
		contacts,
		derivedContactTitle,
		editUserContactList,
		queryClient,
		selectedContacts,
		setSelectedContacts,
		shouldForceApplyDerivedTitle,
	]);

	// Map multi-select "Write Message" action. Opens the inline drafting panel over the map for the
	// current selection, scoped to the campaign the search is in the context of (the one shown in
	// the header: `fromCampaign ?? activeCampaign`). The panel opens immediately; the contacts are
	// committed to that campaign's contact list in the background (the drafting engine only drafts
	// for campaign members, so the panel's Draft button stays gated until they land). Keeps
	// `selectedContacts` — they are the draft target.
	const handleWriteSelectionMessage = useCallback(async () => {
		if (selectedContacts.length === 0) {
			toast.error('Please select contacts to add');
			return;
		}

		const contextCampaign = fromCampaign ?? activeCampaign;
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
		activeCampaign,
		fromCampaign,
		batchUpdateContacts,
		contacts,
		derivedContactTitle,
		editUserContactList,
		queryClient,
		selectedContacts,
		setIsWriteMode,
		shouldForceApplyDerivedTitle,
	]);

	const primaryCtaLabel = isAddToCampaignMode
		? 'Add to Campaign'
		: activeCampaignId
			? `Add to ${activeCampaign?.name ?? 'Campaign'}`
			: 'Create Campaign';
	const primaryCtaPending = isAddToCampaignMode
		? isPendingAddToCampaign || isPendingFromCampaign
		: activeCampaignId
			? isPendingAddToCampaign || isPendingBatchUpdateContacts
			: isPendingCreateCampaign || isPendingBatchUpdateContacts;
	const handlePrimaryCta = isAddToCampaignMode
		? handleAddSelectedToCampaign
		: activeCampaignId
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
	const [isMapSearchEngaged, setIsMapSearchEngaged] = useState(true);
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
	const [selectAllInViewNonce, setSelectAllInViewNonce] = useState(0);
	const [hoveredMapMarkerContact, setHoveredMapMarkerContact] =
		useState<ContactWithName | null>(null);
	// Marker-hover research group docking: right (beside Search Results) unless the
	// hovered marker sits under that dock, then left (beside the select/grab rail).
	const [mapMarkerResearchDockSide, setMapMarkerResearchDockSide] = useState<
		'left' | 'right'
	>('right');
	// Tab toggles the Description box; persists across hovered contacts until collapsed.
	const [isMapMarkerResearchExpanded, setIsMapMarkerResearchExpanded] = useState(false);
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
	// Show loading in the map panel when:
	// 1. A search is actively pending/loading, OR
	// 2. We're in fromHome mode and the search hasn't been executed yet (user not signed in or waiting for search trigger)
	const isMapResultsLoading =
		isSearchPending ||
		isLoadingContacts ||
		isRefetchingContacts ||
		(fromHomeParam && isMapView && (!isSignedIn || !hasSearched));
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
	const dashboardMapCampaignForHeader = fromCampaign ?? activeCampaign;
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
			isMobileAddToCampaignSearch && Boolean(dashboardMapCampaignForHeader?.id),
	});
	const mobileSearchNewMessageCount = mobileSearchInboundEmails?.length || 0;
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
			const safeLevelValue = clampMapZoomControlValue(levelValue);
			scheduleMapZoomControlRequest(getMapZoomForControlValue(safeLevelValue), true);
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
				MAP_ZOOM_CONTROL_MAX_INDEX
			);
			const nextControlValue =
				meta?.source === 'drag-release'
					? clampMapZoomControlValue(meta.levelValue)
					: safeLevelIndex;
			setMapZoomControlIndex(nextControlValue);
			if (meta?.source === 'drag-release') {
				if (mapZoomControlRequestRafRef.current != null) {
					window.cancelAnimationFrame(mapZoomControlRequestRafRef.current);
					mapZoomControlRequestRafRef.current = null;
				}
				pendingMapZoomControlRequestRef.current = null;
				pushMapZoomControlRequest(getMapZoomForControlValue(nextControlValue), true);
				return;
			}
			pushMapZoomControlRequest(
				MAP_ZOOM_CONTROL_LEVELS[safeLevelIndex] ?? MAP_ZOOM_CONTROL_LEVELS[0],
				false
			);
		},
		[pushMapZoomControlRequest]
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
	const mapSelectGrabViewScale = useMemo(() => {
		if (isMobile) return 1;
		const availableHeight =
			viewportHeight > 0
				? viewportHeight - MAP_SELECT_GRAB_VIEWPORT_INSET_PX * 2
				: MAP_SELECT_GRAB_TOTAL_HEIGHT_PX * MAP_SELECT_GRAB_DEFAULT_VIEW_SCALE;
		const fitScale = availableHeight / MAP_SELECT_GRAB_TOTAL_HEIGHT_PX;
		const tallViewportProgress = clampNumber(
			(viewportHeight - MAP_SELECT_GRAB_SCALE_GROW_START_HEIGHT_PX) /
				(MAP_SELECT_GRAB_SCALE_GROW_END_HEIGHT_PX -
					MAP_SELECT_GRAB_SCALE_GROW_START_HEIGHT_PX),
			0,
			1
		);
		const preferredScale =
			MAP_SELECT_GRAB_DEFAULT_VIEW_SCALE +
			(MAP_SELECT_GRAB_MAX_VIEW_SCALE - MAP_SELECT_GRAB_DEFAULT_VIEW_SCALE) *
				tallViewportProgress;
		return clampNumber(
			Math.min(fitScale, preferredScale),
			MAP_SELECT_GRAB_MIN_VIEW_SCALE,
			MAP_SELECT_GRAB_MAX_VIEW_SCALE
		);
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
		setIsMapSearchEngaged(false);
		setActiveMapTool('grab');
		setActiveSection(null);
		hideSearchThisAreaCta();
	}, [canDisengageMapSearch, hideSearchThisAreaCta]);

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

	const handleMapViewportZoom = useCallback(
		(zoom: number) => {
			if (isMapZoomControlDragging) return;
			const nextControlValue = getMapZoomControlValueForZoom(zoom);
			mapZoomControlLiveRef.current?.setLevelValue(nextControlValue);
		},
		[isMapZoomControlDragging]
	);

	const handleMapViewportIdle = useCallback(
		(payload: SearchThisAreaViewportIdlePayload) => {
			lastSearchThisAreaViewportRef.current = payload;
			if (!isMapZoomControlDragging) {
				const nextControlValue = getMapZoomControlValueForZoom(payload.zoom);
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
		]
	);

	const handleSearchThisAreaClick = useCallback(() => {
		const payload = lastSearchThisAreaViewportRef.current;
		if (!payload) return;

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
		if (!isMapView || isMapResultsLoading) {
			setHoveredMapPanelContactId(null);
		}
	}, [isMapResultsLoading, isMapView]);

	const [isMapBottomSearchActive, setIsMapBottomSearchActive] = useState(false);
	const [mapBottomSearchValue, setMapBottomSearchValue] = useState('');

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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isMobile, isAddToCampaignMode, hasSearched, isMapView]);
	const [
		initialDashboardSearchSuggestionSeeds,
		setInitialDashboardSearchSuggestionSeeds,
	] = useState<InitialDashboardSearchSuggestionSeed[]>(
		getDefaultInitialDashboardSearchSuggestionSeeds
	);
	const [mapBottomSearchActiveHeight, setMapBottomSearchActiveHeight] = useState<number>(
		MAP_RESULTS_BOTTOM_SEARCH_BOX.activeHeight
	);
	const mapBottomSearchInputRef = useRef<HTMLTextAreaElement | null>(null);
	const hasLoadedInitialDashboardSearchSuggestionsRef = useRef(false);
	const isMapBottomSearchExpanded = isMapBottomSearchActive;
	const initialDashboardSearchSuggestions = useMemo(
		() =>
			buildInitialDashboardSearchSuggestions(
				mapBottomSearchValue,
				initialDashboardSearchSuggestionSeeds
			),
		[initialDashboardSearchSuggestionSeeds, mapBottomSearchValue]
	);

	useEffect(() => {
		if (
			hasLoadedInitialDashboardSearchSuggestionsRef.current ||
			!isMapBottomSearchExpanded ||
			isMobile !== false ||
			hasSearched ||
			activeTab !== 'search' ||
			fromHomeParam ||
			isMapView
		) {
			return;
		}

		let cancelled = false;
		hasLoadedInitialDashboardSearchSuggestionsRef.current = true;

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
					setInitialDashboardSearchSuggestionSeeds(suggestionSeeds);
				}
			} catch {
				if (!cancelled) {
					hasLoadedInitialDashboardSearchSuggestionsRef.current = false;
				}
			}
		};

		void loadSuggestions();

		return () => {
			cancelled = true;
		};
	}, [
		activeTab,
		fromHomeParam,
		hasSearched,
		isMapBottomSearchExpanded,
		isMapView,
		isMobile,
	]);

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
		setIsMapBottomSearchActive(true);
		window.requestAnimationFrame(() => {
			mapBottomSearchInputRef.current?.focus();
		});
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
			if (!q) {
				// Profile mode supports an empty box: run a profile-tailored "For You".
				if (isProfileModeEnabledRef.current) runProfileTailoredForYouRef.current?.();
				return;
			}
			const keywordMode = isKeywordModeEnabledRef.current;
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
			setMapBottomSearchValue('');
			primeFreeTextSearch(q);

			// First search of the session creates the active campaign (in parallel
			// with the actual search). Skip in URL-pinned add-to-campaign mode and
			// in fromHome demo mode; in either case there's nothing to materialize.
			if (!isAddToCampaignMode && !isFromHomeDemoMode) {
				void ensureActiveCampaign(q);
			}

			// Radius mode: a fresh typed query starts from the user's default location,
			// not wherever the previous radius pin was dragged. If user location can't be
			// resolved, fall through to the normal soft-locality path so the search still runs.
			if (isRadiusModeEnabledRef.current) {
				const center = await resolveRadiusCenter({ allowViewportFallback: false });
				if (center) {
					setRadiusCenter(center);
					triggerFreeTextSearch(q, {
						lat: center.lat,
						lon: center.lng,
						radiusKm: radiusMilesRef.current * MILES_TO_KM,
						strictRadius: true,
						keywordMode,
						...profileOverrides,
					}).catch(() => undefined);
					return;
				}
			}

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
			isAddToCampaignMode,
			isFromHomeDemoMode,
		]
	);

	const handleMapBottomSearchSubmit = useCallback(async () => {
		await submitMapBottomSearchQuery(mapBottomSearchValue);
	}, [mapBottomSearchValue, submitMapBottomSearchQuery]);

	const handleKeywordToggle = useCallback(() => {
		setIsKeywordModeEnabled((enabled) => !enabled);
	}, []);

	const handleProfileToggle = useCallback(() => {
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
			if (!lastFreeTextArgs?.strictRadius || lastFreeTextArgs.radiusKm == null) return;
			const q = lastFreeTextArgs.q.trim();
			if (!q) return;

			triggerFreeTextSearch(q, {
				lat: center.lat,
				lon: center.lng,
				radiusKm: lastFreeTextArgs.radiusKm,
				strictRadius: true,
				keywordMode: lastFreeTextArgs.keywordMode,
			}).catch(() => undefined);
		},
		[lastFreeTextArgs, triggerFreeTextSearch]
	);

	const handleInitialDashboardSearchSuggestionClick = useCallback(
		(suggestion: string) => {
			void submitMapBottomSearchQuery(suggestion);
		},
		[submitMapBottomSearchQuery]
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
		setActiveSection(null);

		// "For You" has no user-typed query — pass an empty string and let
		// generateCampaignName fall back to the "Untitled Campaign" default
		// (the user's forthcoming naming scheme can refine this).
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
	// curated category subset (still broad); area sets the center (state-level via
	// the curated route, else IP/user location). Reuses the curated engine so
	// results flow through the same rendering/cache path as the For-You tile.
	const runProfileTailoredForYou = useCallback(async () => {
		cancelMapBottomSearchFollowupPreviewClear();
		setMapBottomSearchFollowupPreview(null);
		setMapBottomSearchFollowupSelection(null);
		mapBottomSearchInputRef.current?.blur();
		setIsMapBottomSearchActive(false);
		setMapBottomSearchValue('');
		setActiveSection(null);

		if (!isAddToCampaignMode && !isFromHomeDemoMode) {
			void ensureActiveCampaign('');
		}

		const signals = deriveProfileSearchSignals(resolvedIdentityRef.current);
		const category = signals.categorySubset?.length
			? signals.categorySubset.join(',')
			: undefined;

		let lat: number | null = null;
		let lon: number | null = null;
		try {
			const loc = await getApproximateLocation();
			lat = loc.lat;
			lon = loc.lon;
		} catch {
			// Non-fatal: the backend can infer from request headers.
		}

		try {
			await triggerCuratedSearch({
				lat: lat ?? undefined,
				lon: lon ?? undefined,
				category,
				state: signals.areaText ?? undefined,
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
		const trimmedWhere = whereValue.trim();
		// Where without What would build "[Booking] (Maine)" with no category — default
		// to Wine/Beer/Spirits so the curated search has a real category to filter on.
		const trimmedWhat =
			trimmedWhere && !initialTrimmedWhat
				? DEFAULT_CATEGORY_SEARCH_WHAT
				: initialTrimmedWhat;
		const nextWhy = getCategorySearchWhyForWhat(trimmedWhat);

		if (trimmedWhat !== initialTrimmedWhat) {
			setWhatValue(trimmedWhat);
		}
		setWhyValue(nextWhy);
		setActiveSection(null);
		setIsMapBottomCategoryDropdownActive(false);

		if (!trimmedWhat && !trimmedWhere) {
			if (hasSearched) return;

			await ensureNonEmptyDashboardSearchOnBlankSubmit();
			const currentSearchText = (form.getValues('searchText') ?? '').trim();
			if (currentSearchText && onSubmit) {
				form.handleSubmit(onSubmit)();
			}
			return;
		}

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
		ensureNonEmptyDashboardSearchOnBlankSubmit,
		form,
		hasSearched,
		isFromHomeDemoMode,
		onSubmit,
		whatValue,
		whereValue,
	]);

	const [isPointerInMapSidePanel, setIsPointerInMapSidePanel] = useState(false);
	const [selectedCategoryChips, setSelectedCategoryChips] = useState<Set<string>>(
		new Set()
	);
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

	const isMapPanelCreateCampaignVisible =
		!shouldUseDynamicMapCreateCampaignCta || isPointerInMapSidePanel;

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
	}, [activeSearchQuery, selectedContacts]);

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

	// Ensure marker-hover research never "sticks" and apply hold+fade behavior.
	useEffect(() => {
		// Reset everything when leaving map view or while results are loading.
		if (!isMapView || isMapResultsLoading) {
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

		// Hovering a marker: show immediately (with snappy fade-in on first mount).
		if (hoveredMapMarkerContact) {
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
	}, [hoveredMapMarkerContact, isMapView, isMapResultsLoading]);

	const handleMapMarkerHover = useCallback(
		(contact: ContactWithName | null, meta?: MarkerHoverMeta) => {
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
		[MAP_VIEW_PANEL_SCALE]
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
		if (displayedMapPanelContacts.length === 0) return false;
		return displayedMapPanelContacts.every((contact) =>
			selectedContacts.includes(contact.id)
		);
	}, [displayedMapPanelContacts, selectedContacts]);

	const mapPanelSelectedContacts = useMemo(
		() => displayedMapPanelContacts.filter((c) => selectedContacts.includes(c.id)),
		[displayedMapPanelContacts, selectedContacts]
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
		if (!isMapView || isMapResultsLoading || hoveredMapPanelContactId == null) {
			return null;
		}

		const contact = displayedMapPanelContacts.find(
			(candidate) => candidate.id === hoveredMapPanelContactId
		);
		if (!contact) return null;

		return { contact, ...getMapResearchDisplayFields(contact) };
	}, [
		displayedMapPanelContacts,
		getMapResearchDisplayFields,
		hoveredMapPanelContactId,
		isMapResultsLoading,
		isMapView,
	]);

	const mapMarkerResearchDisplayFields = useMemo(
		() =>
			mapResearchPanelContact
				? getMapResearchDisplayFields(mapResearchPanelContact)
				: null,
		[getMapResearchDisplayFields, mapResearchPanelContact]
	);

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
	const shouldLockDashboardPageScroll = isMapView || shouldLockLandingDashboardScroll;

	// The calendar panel's natural height can exceed the locked-100vh wrapper on shorter
	// monitors, which clips its bottom row. Treat it the same way the open campaign finder
	// is treated: let it paint past the wrapper (overflow: visible on html/body, drop the
	// `h-screen overflow-hidden` clipper) while still preventing the page from scrolling.
	const isCalendarPanelOpen =
		!hasSearched && activeTab === 'search' && selectedActionBarIcon === 'calendar';
	const isOverflowingDashboardPanelOpen = isCampaignFinderOpen || isCalendarPanelOpen;

	// Cinematic boot splash: a dark starfield + skeleton hero chrome shown over the
	// cold-loading map, fading into the globe once Mapbox's `load` fires. Lazy init
	// from the layout-persistent ready flag so client-side route returns (dashboard →
	// campaign → dashboard, map still mounted/loaded) skip the splash entirely.
	const isPersistentMapReady = usePersistentMapReady();
	const [bootPhase, setBootPhase] = useState<DashboardBootPhase>(() =>
		isPersistentMapReady ? 'done' : 'active'
	);
	const bootStartRef = useRef(Date.now());

	// Map ready → hold until the minimum splash time has elapsed, then start the fade.
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
		const timer = setTimeout(() => setBootPhase('done'), DASHBOARD_BOOT_FADE_MS);
		return () => clearTimeout(timer);
	}, [bootPhase]);

	// Safety cap: never hold the splash past the max wait (map error / blocked tiles);
	// what's revealed underneath is the map's own dark loading mask — same as today.
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
	// search/map-view/?fromHome, or a search/scroll-to-map commit mid-splash): the
	// skeleton chrome only exists on the locked landing hero, and once the map jumps
	// to its interactive z-index the splash must not linger underneath.
	useEffect(() => {
		if (bootPhase === 'done') return;
		if (isMobile === true || (isMobile === false && !shouldLockLandingDashboardScroll)) {
			setBootPhase('done');
		}
	}, [bootPhase, isMobile, shouldLockLandingDashboardScroll]);

	// Body classes drive the boot chrome skin (globals.css "dashboard cinematic boot"
	// block). Classes rather than prop-threading because the skinned elements span the
	// hero and the ask-anything bar, which lives outside the scroll-lock wrapper.
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
			const previousBodyOverscrollBehavior = body.style.overscrollBehavior;

			if (shouldLockLandingDashboardScroll) {
				window.scrollTo({ top: 0, left: 0 });
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
		isMapView,
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
		setWhyValue('');
		setWhatValue('');
		setWhereValue('');
		setIsNearMeLocation(false);
		setActiveSection(null);
	};

	// Close map view and return to default dashboard view (before any search)
	const handleCloseMapView = () => {
		// If in "from home" mode, navigate back to the landing page
		if (fromHomeParam) {
			router.push(urls.home.index);
			return;
		}

		setIsMapView(false);
		setHoveredContact(null);
		// Reset search completely to return to default dashboard
		handleEnhancedResetSearch();

		// If we entered the dashboard from a campaign (add-to-campaign mode), the "Home" button
		// should take the user back to the *regular* dashboard (no campaign-search context).
		if (isAddToCampaignMode) {
			router.replace(urls.murmur.dashboard.index, { scroll: false });
		}
	};

	useEffect(() => {
		if (typeof document === 'undefined') return;

		if (isMapView) {
			document.body.classList.add('murmur-map-view');
		} else {
			document.body.classList.remove('murmur-map-view');
		}

		return () => {
			document.body.classList.remove('murmur-map-view');
		};
	}, [isMapView]);

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
	const shouldShowAmbientContactsOnMap = canDisengageMapSearch && !isMapSearchEngaged;
	const shouldPreloadAmbientContactsOnMap = canDisengageMapSearch && isMapSearchEngaged;

	// Scroll-to-map gesture: scrubbing down on the locked landing hero fades it out and dollies
	// the map in, then commits by firing the same "For You" curated search a click would — so it
	// lands in the full search-results UI (right/left panels) with the URL updated, just like a
	// normal search. The top search pill is staged empty (pendingForYouReveal) until those
	// results load, then reveals "For You". Armed only in the locked-landing state, on desktop,
	// with no scroll-hijacking panel open, and not during an instant tab transition.
	const scrollToMapEnabled =
		shouldLockLandingDashboardScroll &&
		!isOverflowingDashboardPanelOpen &&
		!isInstantTabTransition;
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

			if (ids.length > 0) {
				setSelectedContacts((prev) => {
					const next = new Set(prev);
					for (const id of ids) next.add(id);
					return Array.from(next);
				});
			}

			if (extraContacts.length > 0) {
				setMapPanelExtraContacts((prev) => {
					const byId = new Map<number, ContactWithName>();
					for (const c of prev) byId.set(c.id, c);
					for (const c of extraContacts) {
						if (!byId.has(c.id)) byId.set(c.id, c);
					}
					return Array.from(byId.values());
				});
			}

			if (ids.length > 0) {
				const nextExtraIds: number[] = [];
				const byId = new Map<number, ContactWithName>();
				for (const c of contacts || []) byId.set(c.id, c);

				for (const id of ids) {
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

				for (const c of extraContacts) nextExtraIds.push(c.id);

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
		[contacts, baseContactIdSet, searchedStateAbbrForMap, setSelectedContacts]
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
				return [...prev, contactId];
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
		(contact: ContactWithName) => {
			if (!selectedContacts.includes(contact.id)) {
				setMapPanelExtraContacts((prev) =>
					prev.some((c) => c.id === contact.id) ? prev : [contact, ...prev]
				);
			}
			setSelectedContacts((prev) =>
				prev.includes(contact.id)
					? prev.filter((id) => id !== contact.id)
					: [...prev, contact.id]
			);
		},
		[selectedContacts, setSelectedContacts]
	);

	const activeRadiusSearchOverlay = useMemo<
		NonNullable<SearchResultsMapProps['radiusOverlay']> | null
	>(() => {
		if (!lastFreeTextArgs?.strictRadius || lastFreeTextArgs.radiusKm == null) {
			return null;
		}

		const committedCenter =
			lastFreeTextArgs.lat != null && lastFreeTextArgs.lon != null
				? { lat: lastFreeTextArgs.lat, lng: lastFreeTextArgs.lon }
				: null;
		if (!committedCenter) return null;

		return {
			center: committedCenter,
			radiusMiles: lastFreeTextArgs.radiusKm / MILES_TO_KM,
		};
	}, [lastFreeTextArgs]);

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
				isMobile === true && isAddToCampaignMode
					? { top: 170, right: 30, bottom: 120, left: 30 }
					: compressedMapChromePadding,
			autoFitPadding:
				isMobile === true && isAddToCampaignMode
					? { top: 170, right: 30, bottom: 120, left: 30 }
					: compressedMapChromePadding,
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
			ambientContactsEnabled: shouldShowAmbientContactsOnMap,
			ambientContactsPreloadEnabled: shouldPreloadAmbientContactsOnMap,
			ambientActiveCategories: mapGrabActiveCategories,
			ambientUncategorizedActive: mapGrabUncategorizedActive,
			autoFitRequestNonce: mapSearchAutoFitRequestNonce,
			instantAutoFitNonce: instantTabFitNonce,
			emptyMapClickPrompt:
				canDisengageMapSearch && isMapSearchEngaged ? 'Click to see all contacts' : null,
			onEmptyMapClick:
				canDisengageMapSearch && isMapSearchEngaged ? handleEmptyMapClick : undefined,
			disableDotWaveReveal: isMapView,
			selectAllInViewNonce: isMapView ? selectAllInViewNonce : undefined,
			onVisibleOverlayContactsChange: isMapView
				? handleMapVisibleOverlayContactsChange
				: undefined,
			activeTool: isMapView ? activeMapTool : undefined,
			requestedZoom: isMapView ? mapZoomControlRequest : null,
			selectedAreaBounds: selectedAreaBoundsForMap,
			onViewportInteraction: isMapView ? handleMapViewportInteraction : undefined,
			onViewportZoom: isMapView ? handleMapViewportZoom : undefined,
			onViewportIdle: isMapView ? handleMapViewportIdle : undefined,
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
			handleMapVisibleOverlayContactsChange,
			hoveredMapPanelContactId,
			instantTabFitNonce,
			isAddToCampaignMode,
			isMapSearchEngaged,
			isLoadingContacts,
			isMapView,
			isMobile,
			isCompressedMapChrome,
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
			searchWhatForMap,
			selectedAreaBoundsForMap,
			selectedContacts,
			selectedContactObjectsForMap,
			selectAllInViewNonce,
			shouldEnableMapStateCategorySelection,
			shouldShowMapResultsSidePanel,
			shouldShowSearchGeometryOnMap,
			shouldShowAmbientContactsOnMap,
			shouldPreloadAmbientContactsOnMap,
			shouldSpinBackgroundMap,
			skipAutoFitForMap,
		]
	);

	const persistentMapConfig = useMemo<PersistentDashboardMapConfig>(
		() => ({
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
	// frame renders normally (MobileFolderCards shows its own wave skeletons);
	// only the true loaded-and-empty state falls back to the original "open on
	// desktop" CampaignsInboxView empty state.
	if (isMobile) {
		// Pick flow (add contacts to a campaign): the search chrome renders over the
		// persistent map, driven by the same search machinery as desktop. Gated on the
		// URL params alone so the chrome is already up while the entry search is still
		// fetching.
		if (isAddToCampaignMode) {
			return (
				<div className="min-h-screen w-full">
					{mapPortal}
					<MobileDashboardSearch
						campaignName={fromCampaign?.name || 'Untitled Campaign'}
						headerContacts={dashboardMapHeaderContacts ?? []}
						contactsCount={dashboardMapHeaderContactsCount}
						draftCount={dashboardMapHeaderDraftCount}
						sentCount={dashboardMapHeaderSentCount}
						newMessageCount={mobileSearchNewMessageCount}
						onOpenCampaignSummary={(section) =>
							router.push(
								`${urls.murmur.campaign.detail(fromCampaignIdParam)}?origin=search&summarySection=${section}`
							)
						}
						queryPillLabel={
							canDisengageMapSearch && isMapSearchEngaged
								? mapTopSearchDisplay.label
								: null
						}
						onClearQuery={handleEmptyMapClick}
						listContacts={displayedMapPanelContacts}
						selectedContactIds={selectedContacts}
						onToggleContact={handleMapPanelRowSelect}
						isLoading={isMapResultsLoading}
						hasNoResults={hasNoSearchResults}
						hasSearched={hasSearched}
						searchValue={mapBottomSearchValue}
						onSearchValueChange={setMapBottomSearchValue}
						onSubmitSearch={handleMapBottomSearchSubmit}
						canAddSelected={selectedContacts.length > 0}
						onAddSelected={handleAddSelectedToCampaign}
						isAddPending={isPendingAddToCampaign}
					/>
				</div>
			);
		}

		if (!isLoadingCampaigns && !hasCampaigns) {
			return (
				<div className="min-h-screen w-full">
					{mapPortal}
					<div style={{ marginTop: '40px' }}>
						<CampaignsInboxView
							hideSearchBar
							containerHeight="calc(100dvh - 60px - env(safe-area-inset-bottom, 0px))"
						/>
					</div>
				</div>
			);
		}

		return (
			<div
				className="w-full flex flex-col"
				style={{ height: '100dvh', overflow: 'hidden' }}
			>
				{mapPortal}

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
					{mobileActiveTab === 'calendar' && <MobileDashboardCalendar />}
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
	const mapBottomSearchShellWidth = isMapBottomCategoryMode
		? MAP_RESULTS_BOTTOM_CATEGORY_SEARCH_BOX.width
		: isMapBottomForYouMode
			? MAP_RESULTS_BOTTOM_SEARCH_BOX.activeWidth
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
			MAP_PANEL_ABRIDGED_RESEARCH_HEIGHT_PX * MAP_VIEW_PANEL_SCALE * dashboardZoom;
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
	const renderMapPanelDesktopRow = (contact: ContactWithName) => {
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

		return (
			<div
				key={contact.id}
				data-contact-id={contact.id}
				className="cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-[3px] border-[#ABABAB] select-none relative"
				style={{
					backgroundColor: isSelected
						? isWriteMode
							? isHovered
								? '#FAE6E6'
								: '#F5DADA'
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
				onClick={() => handleMapPanelRowSelect(contact)}
				onMouseEnter={(event) => {
					cancelMapPanelHoverResearchClear();
					setHoveredMapPanelContactId(contact.id);
					updateMapPanelHoverResearchTop(event.currentTarget);
				}}
				onMouseLeave={() => {
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
			{!hasSearched &&
				activeTab === 'search' &&
				!fromHomeParam &&
				!isMapView && (
					<div
						className="dashboard-ask-anything-root fixed left-1/2 pointer-events-none"
						onMouseEnter={cancelMapBottomSearchFollowupPreviewClear}
						onMouseLeave={scheduleMapBottomSearchFollowupPreviewClear}
						style={{
							bottom: `${INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.bottomOffset}px`,
							width: `${INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.width}px`,
							height: `${mapBottomSearchActiveHeight}px`,
							transform: 'translateX(-50%)',
							transition: 'none',
							zIndex: 70,
						}}
					>
						{/* Inner scrub target: the wheel-to-map gesture animates this div's
						    opacity/transform, leaving the React-owned translateX(-50%) on the
						    fixed wrapper above untouched. */}
						<div className="dashboard-ask-bar-scrub relative h-full w-full pointer-events-none">
							{isMapBottomSearchExpanded &&
								!isMapBottomCategoryMode &&
								!isMapBottomForYouMode && (
									<div
										aria-label="Search suggestions"
										className="absolute left-1/2 flex flex-col gap-[5px] pointer-events-none"
										style={{
											bottom: 'calc(100% + 12px)',
											width: '404px',
											transform: 'translateX(-50%)',
										}}
									>
										{initialDashboardSearchSuggestions.map((label, index) => (
											<button
												type="button"
												aria-label={`Search for ${label}`}
												key={`initial-dashboard-search-suggestion-${index}`}
												className="initial-dashboard-search-suggestion pointer-events-auto flex items-center overflow-hidden"
												style={
													{
														width: '404px',
														height: '29px',
														borderRadius: '10px',
														'--initial-dashboard-search-suggestion-background': '#F8F8F8',
														'--initial-dashboard-search-suggestion-opacity':
															INITIAL_DASHBOARD_ACTIVE_SEARCH_SUGGESTIONS[index]?.opacity ??
															0.5,
														animationDelay: `${
															(initialDashboardSearchSuggestions.length - 1 - index) * 48
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
													handleInitialDashboardSearchSuggestionClick(label);
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
								appearance="initial-dashboard"
								mode={
									isMapBottomCategoryMode
										? 'category'
										: isMapBottomForYouMode
											? 'for-you'
											: 'anything'
								}
								categoryWhatValue={whatValue}
								categoryWhereValue={whereValue}
								activeCategoryField={activeMapBottomCategoryField}
								onActivate={handleMapBottomSearchActivate}
								onSubmit={handleMapBottomSearchSubmit}
								allowEmptySubmit={isProfileModeEnabled}
								onValueChange={setMapBottomSearchValue}
								onActiveChange={setIsMapBottomSearchActive}
								onCategoryFieldFocus={handleMapBottomCategoryFieldFocus}
								onCategoryWhatChange={handleMapBottomCategoryWhatChange}
								onCategoryWhereChange={handleMapBottomCategoryWhereChange}
								onCategoryWhatEnter={handleMapBottomCategoryWhatEnter}
								onCategorySubmit={handleMapBottomCategorySubmit}
								onForYouSubmit={handleMapBottomForYouSubmit}
							/>
						</div>
					</div>
				)}

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
						} ${isMapView ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
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
																	console.log(
																		'[Dashboard] Edge/Safari detected, navigating to sign-in page'
																	);
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
								const activeWhyForTray = (
									fromHomeParam && isMapView && !hasSearched
										? FROM_HOME_WHY
										: extractWhyFromSearchQuery(activeSearchQuery) ||
											(mapTopSearchDisplay.kind === 'category' && mapTopSearchDisplay.what
												? getCategorySearchWhyForWhat(mapTopSearchDisplay.what)
												: '') ||
											whyValue
								).trim();
								const isPromotionForTray = activeWhyForTray === '[Promotion]';
								const trayWhy = isPromotionForTray
									? {
											backgroundColor:
												MAP_RESULTS_SEARCH_TRAY.whyBackgroundColors.promotion,
											icon: <PromotionIcon />,
										}
									: {
											backgroundColor:
												MAP_RESULTS_SEARCH_TRAY.whyBackgroundColors.booking,
											icon: <BookingIcon />,
										};

								const effectiveWhatKeyForTray =
									mapTopSearchDisplay.kind === 'category'
										? mapTopSearchDisplay.what.trim()
										: (searchedWhat || '').trim();
								const whatCfg =
									MAP_RESULTS_SEARCH_TRAY.whatIconByLabel[effectiveWhatKeyForTray];
								const TrayWhatIcon = whatCfg?.Icon || MusicVenuesIcon;
								const trayWhatIconSize =
									effectiveWhatKeyForTray === 'Wine, Beer, and Spirits' ? 22 : undefined;
								const trayWhat = {
									backgroundColor:
										whatCfg?.backgroundColor ||
										MAP_RESULTS_SEARCH_TRAY.whatIconByLabel['Music Venues']
											.backgroundColor,
									icon: <TrayWhatIcon size={trayWhatIconSize} />,
								};

								const whereCandidate =
									mapTopSearchDisplay.kind === 'category'
										? mapTopSearchDisplay.where.trim()
										: (userLocationName || '').trim();
								const [whereCity, whereState] = (() => {
									if (!whereCandidate) return ['', ''];
									if (whereCandidate.includes(',')) {
										const parts = whereCandidate.split(',');
										const city = (parts[0] || '').trim();
										const state = parts.slice(1).join(',').trim();
										return [city, state];
									}
									return ['', whereCandidate];
								})();
								const whereIconProps =
									!isNearMeLocation && whereState
										? getCityIconProps(whereCity, whereState)
										: null;
								const trayWhere = isNearMeLocation
									? {
											backgroundColor: MAP_RESULTS_SEARCH_TRAY.nearMeBackgroundColor,
											icon: <NearMeIcon />,
										}
									: {
											backgroundColor:
												whereIconProps?.backgroundColor ||
												MAP_RESULTS_SEARCH_TRAY.nearMeBackgroundColor,
											icon: whereIconProps?.icon || <NearMeIcon />,
										};
								const mapTopSearchLabel = mapTopSearchDisplay.label.trim() || 'Search';
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
								const showCuratedPill =
									mapTopSearchDisplay.kind === 'curated' && !pendingForYouReveal;

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
																	? `${isMapSearchEngaged ? 'Refocus' : 'Re-engage'} ${mapTopSearchLabel} on the map`
																	: undefined
															}
															tabIndex={isMapTopSearchReengageAvailable ? 0 : undefined}
															title={
																isMapTopSearchReengageAvailable
																	? isMapSearchEngaged
																		? 'Refocus this search on the map'
																		: 'Re-engage this search on the map'
																	: undefined
															}
															onClick={
																isMapTopSearchReengageAvailable
																	? handleMapTopSearchReengage
																	: undefined
															}
															onKeyDown={
																isMapTopSearchReengageAvailable
																	? (event) => {
																			if (event.key !== 'Enter' && event.key !== ' ')
																				return;
																			event.preventDefault();
																			handleMapTopSearchReengage();
																		}
																	: undefined
															}
															style={{
																cursor: isMapTopSearchReengageAvailable
																	? 'pointer'
																	: 'default',
															}}
														>
															<div
																className="search-wave-input results-search-input !h-[49px] !border-[3px] !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus:ring-0 !focus:ring-offset-0 !ring-0 !outline-none !accent-transparent !border-black !bg-white !pr-[12px] !text-black"
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
																	className={`absolute left-[6px] top-1/2 -translate-y-1/2 flex items-center rounded-[6px] z-10 overflow-hidden border border-black ${
																		showCuratedPill
																			? 'search-gradient-button'
																			: ''
																	}`}
																	style={{
																		width: 'calc(100% - 12px)',
																		height: '38px',
																		background:
																			showCuratedPill
																				? undefined
																				: '#FFFFFF',
																	}}
																>
																	{pendingForYouReveal ? (
																		<div className="flex h-full w-full items-center px-[24px]" />
																	) : mapTopSearchDisplay.kind === 'curated' ? (
																		<div className="flex h-full w-full items-center px-[24px] font-secondary text-[13px] font-bold leading-none text-white">
																			{mapTopSearchDisplay.label}
																		</div>
																	) : isSplitCategoryTopSearch &&
																	  mapTopSearchDisplay.kind === 'category' ? (
																		<div className="flex h-full w-full items-center font-secondary text-[13px] font-bold leading-none text-black">
																			<div className="flex h-full min-w-0 flex-1 items-center justify-center px-[12px]">
																				<span className="truncate">
																					{mapTopSearchDisplay.what}
																				</span>
																			</div>
																			<div className="h-full w-px flex-shrink-0 bg-black/10" />
																			<div className="flex h-full min-w-0 flex-1 items-center justify-center px-[12px]">
																				<span className="truncate">
																					{mapTopSearchDisplay.whereLabel}
																				</span>
																			</div>
																		</div>
																	) : (
																		<div className="flex h-full w-full min-w-0 items-center px-[24px] font-secondary text-[13px] font-bold leading-none text-black">
																			<span className="truncate">
																				{mapTopSearchLabel}
																			</span>
																		</div>
																	)}
																</div>
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
																	console.log(
																		'[Dashboard] Edge/Safari detected, navigating to sign-in page'
																	);
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
												backgroundColor: '#B9EAF1',
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
											style={{
												left: `${MAP_SELECT_GRAB_LEFT_PX}px`,
												// The visible column starts `TOP_EXTENT * scale` above this origin.
												// Pin that visual top to the same zoom-adjusted Y as the right panel.
												top: `calc(${MAP_VIEW_SIDE_PANEL_TOP_CSS} + ${mapSelectGrabOriginOffsetPx}px - ${MAP_SELECT_GRAB_VISUAL_TOP_NUDGE_UP_CSS})`,
												transform: `scale(${mapSelectGrabViewScale})`,
												transformOrigin: 'top left',
											}}
										>
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
																opacity: 0.9,
															}
														: {}),
												}}
											/>
											<MapSelectGrabStackBox
												className="absolute left-0 pointer-events-none"
												isSelectActive={isSelectMapToolActive}
												selectedContent={<StackBoxSelectStarIcon />}
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
								const mapCampaignName =
									fromCampaign?.name || activeCampaign?.name || '';

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
													onClick={() => {
														if (!mapCampaignId) return;
														router.push(
															`${urls.murmur.campaign.detail(mapCampaignId)}?origin=search&tab=write`
														);
													}}
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
														lineHeight: '17.063px',
													}}
													onPointerEnter={handleCampaignTabPointerEnter}
													onFocus={handleCampaignTabPointerEnter}
													onPointerLeave={handleCampaignTabPointerLeave}
													onPointerDown={handleCampaignTabPointerDown}
													onClick={() => {
														if (!mapCampaignId) return;
														router.push(
															`${urls.murmur.campaign.detail(mapCampaignId)}?origin=search&tab=all`
														);
													}}
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
																<rect y="2" width="30" height="15" rx="1" fill="#B43A35" />
																<path
																	d="M0 2C0 0.89543 0.895431 0 2 0H13C14.1046 0 15 0.895431 15 2V4C15 4.55228 14.5523 5 14 5H1C0.447715 5 0 4.55228 0 4V2Z"
																	fill="#B43A35"
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
													onClick={() => {
														if (!mapCampaignId) return;
														router.push(
															`${urls.murmur.campaign.detail(mapCampaignId)}?origin=search&tab=inbox`
														);
													}}
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
													onClick={() => {
														if (!mapCampaignId) return;
														router.push(
															`${urls.murmur.campaign.detail(mapCampaignId)}?origin=search&tab=drafts`
														);
													}}
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
											{campaignMapTopTabs}
											{searchBar}
											{mapTopActionDropdowns}
											{mapSelectGrabberTool}
											{searchThisAreaCta}
											{showMapSendingOverlay && (
												<div
													className="fixed map-overlay-appear"
													style={{
														top: '110px',
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
																				onAreaSelect={(bounds, payload) => {
																					const ids = payload?.contactIds ?? [];
																					const extraContacts =
																						payload?.extraContacts ?? [];

																					if (ids.length > 0) {
																						setSelectedContacts((prev) => {
																							const next = new Set(prev);
																							for (const id of ids) next.add(id);
																							return Array.from(next);
																						});
																					}

																					// Ensure overlay-only contacts (booking/promotion map overlays) can appear
																					// as rows in the right-hand panel.
																					if (extraContacts.length > 0) {
																						setMapPanelExtraContacts((prev) => {
																							const byId = new Map<
																								number,
																								ContactWithName
																							>();
																							for (const c of prev) byId.set(c.id, c);
																							for (const c of extraContacts) {
																								if (!byId.has(c.id)) byId.set(c.id, c);
																							}
																							return Array.from(byId.values());
																						});
																					}

																					// If selected contacts are outside the searched state (or are overlay-only),
																					// include them in the panel list so the user sees what was selected.
																					if (ids.length > 0) {
																						const nextExtraIds: number[] = [];
																						const byId = new Map<
																							number,
																							ContactWithName
																						>();
																						for (const c of contacts || [])
																							byId.set(c.id, c);

																						for (const id of ids) {
																							if (!baseContactIdSet.has(id)) {
																								nextExtraIds.push(id);
																								continue;
																							}
																							if (!searchedStateAbbrForMap) continue;
																							const c = byId.get(id);
																							if (!c) continue;
																							const contactStateAbbr =
																								getStateAbbreviation(c.state || '')
																									.trim()
																									.toUpperCase();
																							if (
																								contactStateAbbr &&
																								contactStateAbbr !==
																									searchedStateAbbrForMap
																							) {
																								nextExtraIds.push(id);
																							}
																						}

																						for (const c of extraContacts)
																							nextExtraIds.push(c.id);

																						if (nextExtraIds.length > 0) {
																							setMapPanelExtraContactIds((prev) => {
																								const next = new Set(prev);
																								for (const id of nextExtraIds)
																									next.add(id);
																								return Array.from(next);
																							});
																						}
																					}

																					// After selecting an area, immediately switch back to Grab mode
																					// so the user can pan/zoom without extra clicks.
																					setActiveMapTool('grab');
																				}}
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
																				onToggleSelection={(contactId) => {
																					const wasSelected =
																						selectedContacts.includes(contactId);

																					// Ensure the selected contact stays renderable in the side panel across
																					// subsequent searches by caching the full object.
																					if (!wasSelected) {
																						const fromBase = (contacts || []).find(
																							(c) => c.id === contactId
																						);
																						const fromOverlay =
																							mapPanelVisibleOverlayContacts.find(
																								(c) => c.id === contactId
																							);
																						const fromExtra = mapPanelExtraContacts.find(
																							(c) => c.id === contactId
																						);
																						const selectedContact =
																							fromBase ?? fromOverlay ?? fromExtra;
																						if (selectedContact) {
																							setMapPanelExtraContacts((prev) =>
																								prev.some((c) => c.id === contactId)
																									? prev
																									: [selectedContact, ...prev]
																							);
																						}
																					}

																					setSelectedContacts((prev) => {
																						if (prev.includes(contactId)) {
																							return prev.filter(
																								(id) => id !== contactId
																							);
																						}
																						return [...prev, contactId];
																					});
																					// Scroll to the contact in the side panel
																					const tryScroll = (attempt = 0) => {
																						const contactElement = document.querySelector(
																							`[data-contact-id="${contactId}"]`
																						);
																						if (contactElement) {
																							contactElement.scrollIntoView({
																								behavior: 'smooth',
																								block: 'center',
																							});
																							return;
																						}
																						if (attempt < 10) {
																							setTimeout(
																								() => tryScroll(attempt + 1),
																								50
																							);
																						}
																					};
																					setTimeout(() => tryScroll(0), 0);
																				}}
																			/>
																		)}
												{hasNoSearchResults && isMapSearchEngaged && !isError && (
																			<div
																				className="absolute inset-0 z-[120] flex items-start justify-center pt-[120px] pointer-events-none"
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
																						height: 174,
																						borderRadius: 8,
																						backgroundColor: 'rgba(106, 180, 227, 0.8)', // #6AB4E3 @ 80%
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
																								Keep Exploring
																							</span>
																						</div>
																						<div
																							className="flex items-center justify-center text-center bg-white px-6"
																							style={{
																								width: 496,
																								height: 58,
																								borderRadius: 8,
																								border: '2px solid #101010',
																							}}
																						>
																							<span className="font-secondary font-bold text-[16px] leading-tight text-black">
																								Try a new search term to find contacts in
																								this area
																							</span>
																						</div>
																					</div>
																				</div>
																			</div>
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
																		top: `calc(${MAP_VIEW_SIDE_PANEL_TOP_CSS} - ${mapViewCampaignHeaderTopOffsetPx}px)`,
																		width: '433px',
																		transform: `scale(${MAP_VIEW_PANEL_SCALE})`,
																		transformOrigin: 'top right',
																	}}
																>
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
																		onContactsClick={() => {
																			if (!mapCampaignId) return;
																			router.push(
																				`${urls.murmur.campaign.detail(mapCampaignId)}?origin=search&tab=write`
																			);
																		}}
																		onDraftsClick={() => {
																			if (!mapCampaignId) return;
																			router.push(
																				`${urls.murmur.campaign.detail(mapCampaignId)}?origin=search&tab=drafts`
																			);
																		}}
																		onSentClick={() => {
																			if (!mapCampaignId) return;
																			router.push(
																				`${urls.murmur.campaign.detail(mapCampaignId)}?origin=search&tab=sent`
																			);
																		}}
																		width={433}
																	/>
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
																				top: `calc(${MAP_VIEW_SIDE_PANEL_TOP_CSS} + ${isWriteReviewActive ? 84 : 36}px)`,
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
																			onSwitchToAddToFolder={() => {
																				void handleAddSelectedToContextFolder();
																				setIsWriteMode(false);
																			}}
																			onReviewActiveChange={setIsWriteReviewActive}
																		/>
																	</div>
													</div>
												)}
												{!isCompressedMapChrome &&
													mapPanelHoveredResearchContact &&
													!mapResearchPanelContact && (
													<div
														className="absolute pointer-events-none"
														style={{
															zIndex: 124,
															top:
																mapPanelHoverResearchTopPx != null
																	? `${mapPanelHoverResearchTopPx}px`
																	: MAP_VIEW_SIDE_PANEL_TOP_CSS,
															right:
																10 +
																433 * MAP_VIEW_PANEL_SCALE +
																MAP_PANEL_ABRIDGED_RESEARCH_GAP_PX,
															transform: `scale(${MAP_VIEW_PANEL_SCALE})`,
															transformOrigin: 'top right',
														}}
													>
														<ContactResearchPanel
															contact={
																mapPanelHoveredResearchContactEnriched ??
																mapPanelHoveredResearchContact.contact
															}
															variant="abridged"
															displayHeadline={
																mapPanelHoveredResearchContact.displayHeadline
															}
															displayTitleCategory={
																mapPanelHoveredResearchContact.displayTitleCategory
															}
														/>
													</div>
												)}
												{/* Marker-hover research group: abridged card + Description box,
												    statically docked beside the results panel or the left rail. */}
												{!isMobile && !isCompressedMapChrome && mapResearchPanelContact && (
													<div
														className="absolute pointer-events-none"
														style={{
															zIndex: 124,
															top: MAP_VIEW_SIDE_PANEL_TOP_CSS,
															...(mapMarkerResearchDockSide === 'right'
																? {
																		right:
																			10 +
																			433 * MAP_VIEW_PANEL_SCALE +
																			MAP_PANEL_ABRIDGED_RESEARCH_GAP_PX,
																	}
																: { left: MAP_MARKER_RESEARCH_LEFT_DOCK_LEFT_PX }),
															width: `${MAP_MARKER_RESEARCH_GROUP_WIDTH_PX}px`,
															transform: `scale(${MAP_VIEW_PANEL_SCALE})`,
															transformOrigin:
																mapMarkerResearchDockSide === 'right'
																	? 'top right'
																	: 'top left',
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
																								overflow: 'hidden',
																							}
																						: {
																								right: 10,
																								top: MAP_VIEW_SIDE_PANEL_TOP_CSS,
																								width: '433px',
																								height: 800,
																								maxHeight: `calc(100% - ${MAP_VIEW_SIDE_PANEL_TOP_CSS} - ${MAP_VIEW_SIDE_PANEL_BOTTOM_GAP_PX}px)`,
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
																							onClick={() =>
																								handleSelectAll(displayedMapPanelContacts)
																							}
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
																				{/* Selection sub-panel — appears once at least one contact is selected. */}
																				{selectedContacts.length > 0 && (
																					<div
																						className="flex flex-col flex-shrink-0"
																						style={{
																							maxHeight: isCompressedMapChrome
																								? '30%'
																								: '342px',
																							backgroundColor: 'rgba(175, 214, 239, 0.8)',
																							border: '3px solid #143883',
																							borderRadius: '8px',
																							overflow: 'hidden',
																						}}
																					>
																						<div className="w-full h-[49px] flex-shrink-0 flex items-center justify-center px-4 relative">
																							<span className="absolute left-[10px] top-1/2 -translate-y-1/2 font-secondary text-[13px] font-medium text-black">
																								Selection
																							</span>
																				<span className="font-inter text-[13px] font-medium text-black relative -translate-y-[2px]">
																					{selectedContacts.length}/
																					{displayedMapPanelContacts.length} selected
																				</span>
																							<button
																					type="button"
																					onClick={() =>
																						handleSelectAll(displayedMapPanelContacts)
																					}
																								disabled={isMapResultsLoading}
																								className={`font-secondary text-[12px] font-medium text-black absolute right-[10px] top-1/2 translate-y-[4px] ${
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
																								{mapPanelSelectedContacts.map(
																									renderMapPanelDesktopRow
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
																						borderRadius: '8px',
																						overflow: 'hidden',
																					}}
																				>
																					<div
																						className="w-full h-[50px] flex-shrink-0 flex items-center justify-center px-4 relative"
																						style={{
																							backgroundColor: '#CBF0FF',
																							border: '2px solid #000',
																							borderRadius: '8px 8px 0 0',
																						}}
																					>
																						<span className="absolute left-[13px] top-[2px] font-inter text-[15px] font-semibold leading-[20px] text-center text-black">
																							Search Results
																						</span>
																						<div
																							className="absolute left-[14px] right-[10px] bottom-[7px] flex items-center gap-[12px] overflow-hidden"
																							style={{
																								maskImage:
																									'linear-gradient(to right, black 0, black calc(100% - 40px), transparent 100%)',
																								WebkitMaskImage:
																									'linear-gradient(to right, black 0, black calc(100% - 40px), transparent 100%)',
																							}}
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
																						</div>
																					</div>
																					<div
																						className="flex flex-col flex-1 min-h-0 relative"
																						style={{
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
																	{mapPanelUnselectedContactsFiltered.map(
																		renderMapPanelDesktopRow
																	)}
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
																						allowEmptySubmit={isProfileModeEnabled}
																						onValueChange={setMapBottomSearchValue}
																						onActiveChange={setIsMapBottomSearchActive}
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
																		onClick={() => handleSelectAll(mapPanelContacts)}
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

						{/* Panel content for search tab - driven by the action bar icon selection */}
						{!hasSearched && activeTab === 'search' && (
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
										<DashboardCalendarPanel mockState={calendarMockState} />
									)}
									{selectedActionBarIcon === 'folder' && (
										<CampaignsTable
											mockState={campaignsMockState}
											onMockStateChange={setCampaignsMockState}
											onFinderOpenChange={setIsCampaignFinderOpen}
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
										appearance={{
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
										}}
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
			<DashboardContent />
		</Suspense>
	);
};

export default Dashboard;
