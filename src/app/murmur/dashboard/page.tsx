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
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle, isMusicFestivalTitle, isWeddingPlannerTitle, isWeddingVenueTitle, isWineBeerSpiritsTitle, getWineBeerSpiritsLabel } from '@/utils/restaurantTitle';
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
import { useDebounce } from '@/hooks/useDebounce';
import { useBatchUpdateContacts } from '@/hooks/queryHooks/useContacts';
import { useMe } from '@/hooks/useMe';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import SearchResultsMap, {
	DASHBOARD_TO_INTERACTIVE_TRANSITION_CSS_EASING,
	DASHBOARD_TO_INTERACTIVE_TRANSITION_MS,
	type SearchResultsMapProps,
} from '@/components/molecules/SearchResultsMap/SearchResultsMap';
import {
	type PersistentDashboardMapConfig,
	usePersistentMapSetter,
} from '@/contexts/PersistentMapContext';
import { useGlobeWeatherMood } from '@/hooks/useGlobeWeatherMood';
import { useGlobeNightLighting } from '@/hooks/useGlobeNightLighting';
import { ContactWithName } from '@/types/contact';
import { MapResultsPanelSkeleton } from '@/components/molecules/MapResultsPanelSkeleton/MapResultsPanelSkeleton';
import { buildAllUsStateNames, getNearestUsStateNames, normalizeUsStateName } from '@/utils/usStates';
import { getApproximateLocation } from '@/utils/approximateLocation';
import {
	ContactResearchPanel,
	ContactResearchHorizontalStrip,
} from '@/components/molecules/ContactResearchPanel/ContactResearchPanel';
import { CampaignsInboxView } from '@/components/molecules/CampaignsInboxView/CampaignsInboxView';
import InboxSection from '@/components/molecules/InboxSection/InboxSection';
import DashboardResponsesWidget, {
	type ResponsesMockState,
} from '@/components/molecules/DashboardResponsesWidget/DashboardResponsesWidget';
import { DashboardResponsesDebugPanel } from '@/components/molecules/DashboardResponsesWidget/DashboardResponsesDebugPanel';
import DashboardOpportunitiesWidget, {
	type OpportunitiesMockState,
} from '@/components/molecules/DashboardOpportunitiesWidget/DashboardOpportunitiesWidget';
import { DashboardOpportunitiesDebugPanel } from '@/components/molecules/DashboardOpportunitiesWidget/DashboardOpportunitiesDebugPanel';
import { useGetCampaign, useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { useEditUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
const FREETEXT_URL_PARAM_KEYS = ['ft', 'ftLat', 'ftLon', 'ftR'] as const;

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
} | null;

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

const countParsedResearchSections = (metadata: string | null | undefined): number => {
	if (!metadata) return 0;

	// Extract all [n] sections first.
	const allSections: Record<string, string> = {};
	const regex = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(metadata)) !== null) {
		const sectionNum = match[1];
		const content = match[2]?.trim() ?? '';
		allSections[sectionNum] = content;
	}

	// Count sequential sections starting from [1] with meaningful content.
	let expectedNum = 1;
	let validCount = 0;
	while (allSections[String(expectedNum)]) {
		const content = allSections[String(expectedNum)] ?? '';
		const meaningfulContent = content.replace(/[.\s,;:!?'"()\-–—]/g, '').trim();
		if (meaningfulContent.length < 5) break;
		validCount++;
		expectedNum++;
	}

	return validCount;
};

const estimateWrappedLineCount = (text: string, charsPerLine: number): number => {
	if (!text) return 0;
	const lines = text.split(/\r?\n/);
	let total = 0;
	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) {
			total += 1;
			continue;
		}
		total += Math.max(1, Math.ceil(line.length / charsPerLine));
	}
	return total;
};

const clampNumber = (n: number, min: number, max: number): number => {
	return Math.min(max, Math.max(min, n));
};

/**
 * For the map hover "Research" overlay, collapse the right-side panel height when the research
 * is *unparsed summary-only* and short (roughly a single paragraph), to avoid large empty space.
 */
const getCompactMapResearchPanelHeightPx = (metadata: string): number | null => {
	const text = metadata.trim();
	if (!text) return null;

	// Heuristic tuned to the map panel widths (boxWidth={405}) and 15px text at 1.5 line-height.
	const approxLines = estimateWrappedLineCount(text, 52);

	// If the unparsed text is long, keep the full panel height for readability.
	if (approxLines > 12) return null;

	// ContactResearchPanel summary-only (with a fixed height prop) effectively needs:
	// height ≈ (lines * lineHeight) + chrome/padding.
	const LINE_HEIGHT_PX = 23; // 15px * 1.5 ≈ 22.5
	const BASE_OVERHEAD_PX = 130;
	const rawHeight = Math.ceil(approxLines * LINE_HEIGHT_PX + BASE_OVERHEAD_PX);

	// Cap to the panel's natural unparsed height so it never feels cramped or oversized.
	return clampNumber(rawHeight, 310, 423);
};

const MAP_RESEARCH_PANEL_FIXED_HEIGHT_BULLET_SPACING_PX = 73;
const MAP_RESEARCH_PANEL_FIXED_HEIGHT_BULLET_OUTER_HEIGHT_PX = 59;
const MAP_RESEARCH_PANEL_FIXED_HEIGHT_BULLET_INNER_HEIGHT_PX = 50;

/**
 * For parsed bullets + summary (bottom box) in the map panel, grow the summary box height
 * with longer metadata so more text is visible without scrolling.
 *
 * Tuned to ContactResearchPanel's 15px text at 1.5 line-height and p-3 padding.
 */
const getMapPanelParsedSummaryBoxHeightPx = (metadata: string): number => {
	const text = metadata.trim();
	if (!text) return 197;

	const approxLines = estimateWrappedLineCount(text, 52);
	const targetLines = clampNumber(approxLines, 6, 12);

	// Inner white box: (lines * lineHeight) + padding; outer adds a fixed chrome overhead.
	const LINE_HEIGHT_PX = 23;
	const INNER_PADDING_PX = 24; // p-3 top+bottom
	const OUTER_OVERHEAD_PX = 15; // legacy: 197 outer -> 182 inner
	const inner = Math.ceil(targetLines * LINE_HEIGHT_PX + INNER_PADDING_PX);
	const outer = inner + OUTER_OVERHEAD_PX;

	return clampNumber(outer, 197, 315);
};

/**
 * For the map hover "Research" overlay, compute a compact height when the research panel is
 * showing parsed bullets *and* the bottom summary box (to remove the large empty gap between them).
 *
 * NOTE: This is tuned to the `ContactResearchPanel` compact sizing that kicks in when a fixed
 * `height` prop is provided (smaller bullets/spacing).
 */
const getCompactMapResearchPanelHeightPxForParsed = (metadata: string): number | null => {
	const parsedCountRaw = countParsedResearchSections(metadata);
	if (parsedCountRaw < 3) return null;

	// `ContactResearchPanel` renders at most [1]-[5]
	const parsedCount = clampNumber(parsedCountRaw, 3, 5);

	// These constants mirror `ContactResearchPanel`'s non-compact header + compact (fixed height) bullets.
	const HEADER_HEIGHT_PX = 24;
	const CONTENT_START_TOP_PX = HEADER_HEIGHT_PX + 43; // header + divider + contact bar + divider
	const BULLET_SPACING_PX = MAP_RESEARCH_PANEL_FIXED_HEIGHT_BULLET_SPACING_PX;
	const SUMMARY_HEIGHT_PX = getMapPanelParsedSummaryBoxHeightPx(metadata);
	const SUMMARY_BOTTOM_INSET_PX = 14;
	// Mirrors `ContactResearchPanel`'s content height estimation for bullets in fixed-height mode.
	// (See `contentHeight` inside the panel's `if (height)` branch.)
	const BULLET_CONTENT_TOP_PADDING_PX = 6;
	const BULLET_CONTENT_BOTTOM_PADDING_PX = 10;

	const bulletContentHeightPx =
		BULLET_CONTENT_TOP_PADDING_PX +
		parsedCount * BULLET_SPACING_PX +
		BULLET_CONTENT_BOTTOM_PADDING_PX;
	const heightPx =
		CONTENT_START_TOP_PX + bulletContentHeightPx + SUMMARY_HEIGHT_PX + SUMMARY_BOTTOM_INSET_PX;

	return Math.ceil(heightPx);
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

const INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX = {
	width: 418,
	height: 39,
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
	{ label: 'Wineries with acoustic nights in New York', opacity: 0.3 },
	{ label: 'Breweries with live music in New Jersey', opacity: 0.5 },
	{ label: 'Music venues booking emerging acts in Pennsylvania', opacity: 0.7 },
] as const;

type InitialDashboardSearchSuggestionState = {
	name: string;
	abbr: string;
};

type InitialDashboardSearchSuggestionSeed = {
	label: string;
	state: InitialDashboardSearchSuggestionState;
};

type LiveMusicSearchSuggestionTemplate = {
	label: string;
	keywords: readonly string[];
};

type LiveMusicSearchSuggestionCategory = {
	key: string;
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

const AMBIGUOUS_STATE_ABBR_TOKENS = new Set(['hi', 'in', 'me', 'or']);

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
		baseScore: 6.1,
		keywords: [
			'cideries',
			'cidery',
			'cider',
			'cider house',
			'folk',
			'acoustic',
		],
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
	const stateAbbr = typeof value?.abbr === 'string' ? value.abbr.trim().toUpperCase() : '';
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
		if (
			token === normalizedAbbr &&
			!AMBIGUOUS_STATE_ABBR_TOKENS.has(token)
		) {
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

const rankInitialDashboardSuggestionStates = (
	query: string,
	seeds: readonly InitialDashboardSearchSuggestionSeed[]
): Array<{ state: InitialDashboardSearchSuggestionState; score: number }> => {
	const normalizedQuery = normalizeSearchSuggestionText(query);
	const queryTokens = tokenizeSearchSuggestionText(query);
	const seedStates = dedupeInitialDashboardSuggestionStates(seeds.map((seed) => seed.state));
	const allStates = dedupeInitialDashboardSuggestionStates([
		...seedStates,
		...buildAllUsStateNames()
			.map(getInitialDashboardSuggestionStateFromName)
			.filter((state): state is InitialDashboardSearchSuggestionState => Boolean(state)),
	]);

	const ranked = allStates
		.map((state) => {
			const seedIndex = seedStates.findIndex((seedState) => seedState.abbr === state.abbr);
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

	return category.baseScore + categoryScore + genericScore * 0.35 + bestTemplateScore * 0.45;
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
		return seeds
			.map((seed) => seed.label)
			.slice(0, INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT);
	}

	const queryTokens = tokenizeSearchSuggestionText(query);
	const rankedStates = rankInitialDashboardSuggestionStates(query, seeds);
	const focusedState = rankedStates.find((entry) => entry.score >= 5)?.state ?? null;
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
	const fallbackStatePool = statePool.length > 0 ? statePool : seeds.map((seed) => seed.state);
	const candidates: Array<{
		label: string;
		categoryKey: string;
		stateAbbr: string;
		score: number;
	}> = [];

	for (const { category, score: categoryScore } of rankedCategories) {
		const templateScores = category.templates
			.map((template, index) => ({
				template,
				index,
				score: scoreLiveMusicSearchSuggestionTemplate(
					template,
					normalizedQuery,
					queryTokens
				),
			}))
			.sort((a, b) => b.score - a.score || a.index - b.index);

		for (const [stateIndex, state] of fallbackStatePool.entries()) {
			const stateScore =
				rankedStates.find((entry) => entry.state.abbr === state.abbr)?.score ?? 0;

			for (const { template, score: templateScore, index: templateIndex } of templateScores) {
				if (focusedCategory && category.key !== focusedCategory.key) continue;

				candidates.push({
					label: template.label.replace('{state}', state.name),
					categoryKey: category.key,
					stateAbbr: state.abbr,
					score:
						categoryScore +
						stateScore * 0.8 +
						templateScore * 0.7 -
						stateIndex * 0.2 -
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
		: seeds
				.map((seed) => seed.label)
				.slice(0, INITIAL_DASHBOARD_SEARCH_SUGGESTION_COUNT);
};

// Resolution-aware zoom for the fullscreen map view. Mirrors the campaign page's tuned
// `SIXTEEN_BY_TEN_ZOOM_MAP` / `SIXTEEN_BY_NINE_ZOOM_MAP` tables so the dashboard map-view
// chrome lands at the same physical size as the campaign chrome on every monitor.
const DASHBOARD_MAP_ZOOM_DEFAULT = 0.85;
const DASHBOARD_MAP_ZOOM_MATCH_TOLERANCE_PX = 50;
const DASHBOARD_MAP_ZOOM_MIN = 0.5;
const DASHBOARD_MAP_ZOOM_MAX = 1.6;
const DASHBOARD_MAP_SIXTEEN_BY_TEN_ZOOM_MAP: Array<{ w: number; h: number; zoom: number }> = [
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
const DASHBOARD_MAP_SIXTEEN_BY_NINE_ZOOM_MAP: Array<{ w: number; h: number; zoom: number }> = [
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
	if (
		viewportW >= 1900 &&
		viewportW <= 2050 &&
		viewportH >= 1180 &&
		viewportH <= 1245
	) {
		targetZoom = clampDashboardMapZoom(targetZoom, undefined, 0.93);
	}
	if (
		viewportW >= 2100 &&
		viewportW <= 2200 &&
		viewportH >= 1320 &&
		viewportH <= 1380
	) {
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
	2.25,
	2.41,
	2.57,
	2.73,
	2.88,
	3.04,
	3.2,
	3.52,
	3.83,
	4.15,
	4.47,
	4.78,
	5.1,
	5.34,
	5.58,
	5.81,
	6.05,
	6.29,
	6.52,
	6.76,
	7,
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
	const maxZoom =
		MAP_ZOOM_CONTROL_LEVELS[MAP_ZOOM_CONTROL_MAX_INDEX] ?? minZoom;
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

type MapBottomSearchAdvancedSelections = {
	profile: boolean;
	keyword: boolean;
	radius: boolean;
};

type MapBottomSearchBarProps = {
	value: string;
	isExpanded: boolean;
	activeHeight: number;
	inputRef: RefObject<HTMLTextAreaElement | null>;
	mode?: 'anything' | 'category' | 'for-you';
	appearance?: 'default' | 'initial-dashboard';
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

const MapBottomSearchBar = memo(({
	value,
	isExpanded,
	activeHeight,
	inputRef,
	mode = 'anything',
	appearance = 'default',
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
										color: categoryWhatValue.trim()
											? '#000000'
											: 'rgba(0, 0, 0, 0.42)',
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
					{isInitialDashboardSearch ? (
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
					left: isInitialDashboardSearch ? '24px' : '14px',
					width: `calc(100% - ${anythingRightReservedWidth + (isInitialDashboardSearch ? 24 : 0)}px)`,
					height: `${
						isExpanded
							? activeHeight
							: isInitialDashboardSearch
								? INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.height - 4
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
					if (value.trim().length > 0) {
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
});
MapBottomSearchBar.displayName = 'MapBottomSearchBar';

const getCategorySearchWhyForWhat = (what: string) =>
	what.trim() === 'Radio Stations' ? '[Promotion]' : '[Booking]';

type MapBottomSearchFollowupBoxProps = {
	selectedSearchFollowup: MapBottomSearchFollowupSelection;
	previewedSearchFollowup: MapBottomSearchFollowupPreview;
	onSelectedSearchFollowupChange: (
		selection: MapBottomSearchFollowupSelection
	) => void;
	onPreviewSearchFollowupChange: (
		selection: MapBottomSearchFollowupPreview
	) => void;
};

const MapBottomSearchFollowupBox = memo(({
	selectedSearchFollowup,
	previewedSearchFollowup,
	onSelectedSearchFollowupChange,
	onPreviewSearchFollowupChange,
}: MapBottomSearchFollowupBoxProps) => {
	const segmentBox = MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_SEGMENT_BOX;
	const leftTileBox = MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_LEFT_TILE_BOX;
	const iconLayout = MAP_RESULTS_BOTTOM_SEARCH_FOLLOWUP_ICON_LAYOUT;
	const profileLeft = segmentBox.advancedWidth + segmentBox.internalDividerWidth;
	const keywordLeft = profileLeft + segmentBox.segmentWidth;
	const radiusLeft = keywordLeft + segmentBox.segmentWidth;
	const [advancedSelections, setAdvancedSelections] =
		useState<MapBottomSearchAdvancedSelections>({
			profile: false,
			keyword: false,
			radius: false,
		});
	const visualSearchFollowup =
		previewedSearchFollowup === 'anything'
			? null
			: previewedSearchFollowup ?? selectedSearchFollowup;
	const isForYouSelected = selectedSearchFollowup === 'for-you';
	const isCategorySelected = selectedSearchFollowup === 'category';
	const isForYouActive = visualSearchFollowup === 'for-you';
	const isCategoryActive = visualSearchFollowup === 'category';
	const isAdvancedActive = previewedSearchFollowup === 'anything';
	const isCompactFollowup = isForYouSelected || isCategorySelected;
	const isProfileAdvancedSelected = advancedSelections.profile;
	const isKeywordAdvancedSelected = advancedSelections.keyword;
	const isRadiusAdvancedSelected = advancedSelections.radius;

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
							leftTileBox.leftOffset +
							2 * leftTileBox.size +
							2 * leftTileBox.gap
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
							backgroundColor: isProfileAdvancedSelected ? '#71C9FD' : 'transparent',
							border: 0,
							borderRadius: 0,
							outline: 'none',
							appearance: 'none',
							padding: 0,
							cursor: 'pointer',
							zIndex: 1,
						}}
						onClick={() =>
							setAdvancedSelections((current) => ({
								...current,
								profile: !current.profile,
							}))
						}
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
						onClick={() =>
							setAdvancedSelections((current) => ({
								...current,
								keyword: !current.keyword,
							}))
						}
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
						onClick={() =>
							setAdvancedSelections((current) => ({
								...current,
								radius: !current.radius,
							}))
						}
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
});
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

const DashboardContent = () => {
	const { openSignIn } = useClerk();
	const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const isMobile = useIsMobile();
	const { data: campaigns } = useGetCampaigns();
	const hasCampaigns = campaigns && campaigns.length > 0;
	const queryClient = useQueryClient();
	const setPersistentMapConfig = usePersistentMapSetter();
	const {
		mood: globeWeatherMood,
		temperatureF: globeWeatherTemperatureF,
		regionCenter: globeWeatherRegionCenter,
	} =
		useGlobeWeatherMood();
	const globeNightLighting = useGlobeNightLighting();

	// If we navigated here from a campaign, enable "Add to Campaign" mode.
	const fromCampaignIdParam = searchParams.get('fromCampaignId')?.trim() || '';
	const isAddToCampaignMode = Boolean(fromCampaignIdParam);
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
		const createPlaceholder = (id: number, lat: number, lng: number, state?: string): ContactWithName => ({
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
		} as ContactWithName);

		// Add anchor points in neighboring states to keep the map somewhat zoomed out
		// and show blue outlines on Arizona and Nevada (visually near California)
		placeholders.push(createPlaceholder(-1, 36.2, -115.1, 'Nevada'));     // Las Vegas area
		placeholders.push(createPlaceholder(-2, 39.5, -119.8, 'Nevada'));     // Reno area
		placeholders.push(createPlaceholder(-3, 33.4, -112.0, 'Arizona'));    // Phoenix area
		placeholders.push(createPlaceholder(-4, 32.2, -110.9, 'Arizona'));    // Tucson area

		// California regions spread across the entire state (all inland, no water)
		// Kept well east of the coastline to avoid ocean
		const regions = [
			// Northern California (inland)
			{ lat: 41.5, lng: -122.0, spread: 0.8, weight: 8 },   // Redding area
			{ lat: 40.5, lng: -121.5, spread: 0.7, weight: 6 },   // Shasta
			{ lat: 41.0, lng: -120.5, spread: 0.8, weight: 5 },   // Modoc
			// Sacramento Valley
			{ lat: 39.5, lng: -121.5, spread: 1.0, weight: 12 },  // Sacramento
			{ lat: 39.0, lng: -121.8, spread: 0.8, weight: 8 },   // Yuba City
			{ lat: 38.6, lng: -121.3, spread: 0.6, weight: 10 },  // Sacramento city
			// Napa/Sonoma (inland from coast)
			{ lat: 38.5, lng: -122.3, spread: 0.5, weight: 15 },  // Napa
			{ lat: 38.4, lng: -122.7, spread: 0.4, weight: 12 },  // Sonoma
			// Bay Area (inland parts)
			{ lat: 37.7, lng: -121.9, spread: 0.6, weight: 14 },  // East Bay
			{ lat: 37.4, lng: -121.5, spread: 0.7, weight: 12 },  // San Jose area
			{ lat: 37.0, lng: -121.8, spread: 0.5, weight: 8 },   // Gilroy
			// Central Valley (entire length)
			{ lat: 38.0, lng: -120.8, spread: 1.0, weight: 10 },  // Stockton
			{ lat: 37.5, lng: -120.5, spread: 1.0, weight: 10 },  // Modesto
			{ lat: 36.7, lng: -119.8, spread: 1.2, weight: 12 },  // Fresno
			{ lat: 36.0, lng: -119.3, spread: 1.0, weight: 10 },  // Visalia
			{ lat: 35.4, lng: -119.0, spread: 1.0, weight: 10 },  // Bakersfield
			// Central Coast (inland from coast)
			{ lat: 35.6, lng: -120.5, spread: 0.6, weight: 10 },  // Paso Robles
			{ lat: 34.9, lng: -120.2, spread: 0.5, weight: 8 },   // Santa Maria
			// Los Angeles Basin (inland)
			{ lat: 34.1, lng: -117.8, spread: 0.8, weight: 15 },  // Inland Empire
			{ lat: 34.4, lng: -118.5, spread: 0.6, weight: 12 },  // San Fernando Valley
			{ lat: 34.0, lng: -117.4, spread: 0.7, weight: 12 },  // Riverside/San Bernardino
			{ lat: 33.8, lng: -117.9, spread: 0.5, weight: 10 },  // Orange County inland
			// San Diego (inland)
			{ lat: 33.0, lng: -116.8, spread: 0.6, weight: 10 },  // Escondido/Temecula
			{ lat: 32.8, lng: -116.9, spread: 0.5, weight: 8 },   // East San Diego
			// Desert regions
			{ lat: 34.5, lng: -116.5, spread: 1.0, weight: 8 },   // High Desert
			{ lat: 33.8, lng: -116.5, spread: 0.8, weight: 6 },   // Palm Springs area
			{ lat: 35.5, lng: -117.5, spread: 1.0, weight: 6 },   // Mojave
			// Sierra Nevada foothills
			{ lat: 39.0, lng: -120.5, spread: 0.8, weight: 8 },   // Gold Country
			{ lat: 38.0, lng: -120.0, spread: 0.8, weight: 6 },   // Yosemite foothills
			{ lat: 37.0, lng: -119.5, spread: 0.7, weight: 5 },   // Southern Sierra
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

	const { data: fromCampaign, isPending: isPendingFromCampaign } = useGetCampaign(fromCampaignIdParam);
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
	const mapBottomSearchFollowupPreviewClearTimeoutRef =
		useRef<ReturnType<typeof setTimeout> | null>(null);
	const [isMapBottomCategoryDropdownActive, setIsMapBottomCategoryDropdownActive] =
		useState(false);
	const isMapBottomForYouMode =
		mapBottomSearchFollowupSelection === 'for-you';
	const isMapBottomCategoryMode =
		mapBottomSearchFollowupSelection === 'category';

	// Close why dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (whyDropdownRef.current && !whyDropdownRef.current.contains(event.target as Node)) {
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
			if (whatDropdownRef.current && !whatDropdownRef.current.contains(event.target as Node)) {
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
			if (whereDropdownRef.current && !whereDropdownRef.current.contains(event.target as Node)) {
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
		ENABLE_DASHBOARD_INBOX_TAB && searchParams.get('tab') === 'inbox' ? 'inbox' : 'search';
	const [activeTab, setActiveTab] = useState<'search' | 'inbox'>(initialTabFromQuery);
	const [hoveredTab, setHoveredTab] = useState<'search' | 'inbox' | null>(null);
	const inboxView = activeTab === 'inbox';
	type DashboardActionBarKey = 'playbook' | 'folder' | 'calendar' | 'star' | 'envelope';
	const [selectedActionBarIcon, setSelectedActionBarIcon] =
		useState<DashboardActionBarKey>('playbook');
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

	// Narrowest desktop detection (< 952px) - single column layout for map view
	const [isBelowMd, setIsBelowMd] = useState(false);
	const [isNarrowestDesktop, setIsNarrowestDesktop] = useState(false);
	const [isXlDesktop, setIsXlDesktop] = useState(false);
	const [viewportHeight, setViewportHeight] = useState(0);

	// Detect narrow desktop breakpoint
	useEffect(() => {
		if (typeof window === 'undefined') return;

		const handleResize = () => {
			const width = window.innerWidth;
			setIsBelowMd(width < 768);
			setIsNarrowestDesktop(width < 952);
			setIsXlDesktop(width >= 1280);
			setViewportHeight(window.innerHeight);
		};

		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

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
		const shouldAutoFillWhat =
			trimmedNewWhere.length > 0 && !initialBaseWhat.trim();
		const baseWhat = shouldAutoFillWhat
			? DEFAULT_CATEGORY_SEARCH_WHAT
			: initialBaseWhat;
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
			onSubmit({ searchText: combinedSearch, excludeUsedContacts: form.getValues('excludeUsedContacts') ?? false });
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
		const effectiveWhat = shouldAutoFillWhat
			? DEFAULT_CATEGORY_SEARCH_WHAT
			: whatValue;
		const effectiveWhy = shouldAutoFillWhat
			? getCategorySearchWhyForWhat(effectiveWhat)
			: whyValue;
		if (shouldAutoFillWhat) {
			if (effectiveWhat !== whatValue) setWhatValue(effectiveWhat);
			if (effectiveWhy !== whyValue) setWhyValue(effectiveWhy);
		}

		// Build the combined search query
		const formattedWhere = trimmedWhere ? `(${trimmedWhere})` : '';
		const combinedSearch = [effectiveWhy, effectiveWhat, formattedWhere].filter(Boolean).join(' ').trim();

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
		const dropdownTransition =
			`left 0.6s ${dropdownEase}, height 0.6s ${dropdownEase}`;
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
						const stateAbbrLower =
							getStateAbbreviation(stateName)?.toLowerCase() ?? '';
						return (
							stateNameLower.includes(whereQuery) ||
							stateAbbrLower.includes(whereQuery)
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
								left: isBelowMd ? '50%' : dropdownLeft,
								transform: isBelowMd ? 'translateX(-50%)' : undefined,
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
								const { icon, backgroundColor } = getCityIconProps(
									loc.city,
									loc.state
								);
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

	// Responsive sizing for hero logo (shrink with viewport width, but keep sensible min/max)
	// NOTE: We keep the same aspect ratio as the previous desktop size (300x79).
	const logoWidth = isMobile
		? 'clamp(150px, 45vw, 190px)'
		: 'clamp(180px, 30vw, 300px)';
	const logoHeight = isMobile
		? 'clamp(39.5px, 11.85vw, 50px)'
		: 'clamp(47.4px, 7.9vw, 79px)';
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

	const setHeroSearchGradientPlaybackRate = useCallback((nextPlaybackRate: number | null) => {
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
	}, []);
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
	const shouldEnableMapStateCategorySelection =
		isMapView && isMapBottomCategoryMode;

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
			const baseWhat = (extractWhatFromSearchQuery(activeSearchQuery) || whatValue).trim();
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
						normalizeUsStateName(loc.regionCode) ??
						normalizeUsStateName(loc.region);
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

	// Apply dashboard-only compact class + clear zoom var on mobile/unmount.
	useEffect(() => {
		if (isMobile === null) return;
		if (isMobile) {
			document.documentElement.classList.remove(DASHBOARD_COMPACT_CLASS);
			document.documentElement.style.removeProperty(DASHBOARD_ZOOM_VAR);
			return;
		}

		// Keep the dashboard at its CSS baseline zoom (avoid "whole page" rescaling on desktop window resize).
		document.documentElement.style.removeProperty(DASHBOARD_ZOOM_VAR);
		document.documentElement.classList.add(DASHBOARD_COMPACT_CLASS);
		return () => {
			document.documentElement.classList.remove(DASHBOARD_COMPACT_CLASS);
			document.documentElement.style.removeProperty(DASHBOARD_ZOOM_VAR);
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
			document.documentElement.style.removeProperty(DASHBOARD_ZOOM_VAR);
			return;
		}

		if (!isMapView) {
			document.documentElement.classList.remove(DASHBOARD_MAP_COMPACT_CLASS);
			document.documentElement.style.removeProperty(DASHBOARD_ZOOM_VAR);
			return;
		}

		document.documentElement.classList.add(DASHBOARD_MAP_COMPACT_CLASS);

		const applyMapViewZoom = () => {
			if (typeof window === 'undefined') return;
			const w = window.innerWidth;
			const h = window.innerHeight;
			const zoom = computeDashboardMapZoomForViewport(w, h);
			// Match the campaign behaviour: when the computed zoom equals the CSS default, remove the
			// inline override so the value reverts cleanly instead of paving over the default.
			if (Math.abs(zoom - DASHBOARD_MAP_ZOOM_DEFAULT) < 0.002) {
				document.documentElement.style.removeProperty(DASHBOARD_ZOOM_VAR);
			} else {
				document.documentElement.style.setProperty(
					DASHBOARD_ZOOM_VAR,
					zoom.toFixed(3)
				);
			}
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
		// dashboard effects co-own `--murmur-dashboard-zoom`: a useLayoutEffect sets it to
		// '1' on map view, a useEffect on the same commit removes it on desktop. If we set
		// `isMapView=true` in the very render where `isMobile` first resolves, the desktop
		// effect runs *after* the layout effect and wipes the var, leaving the page at the
		// 0.85 default while map-view UI panels still scale themselves 0.85 — net ~0.72 (the
		// "everything is tiny" bug). Gating on `isMobile !== null` makes the curated path
		// fire on a later commit so the two effects can't collide.
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
			const hasCapturedCoords =
				curatedLatParam != null && curatedLonParam != null;
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

		const restoredCategorySearch =
			parseCategorySearchQuery(dashboardSearchParam);

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
			rehydrateFreeTextSession({
				q: dashboardSearchParam,
				lat: freeTextLatParam,
				lon: freeTextLonParam,
				radiusKm: freeTextRadiusKmParam,
			}).catch(() => undefined);
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

		// Submit after a short delay to allow state to update.
		setTimeout(() => {
			form.setValue('searchText', dashboardSearchParam);
			form.handleSubmit(onSubmit)();

			// Restore table view if that was the last view stored in the URL.
			if (dashboardViewParam === 'table') {
				setTimeout(() => setIsMapView(false), 0);
			}
		}, 100);
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
		freeTextLonParam,
		freeTextModeParam,
		freeTextRadiusKmParam,
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
			rehydrateCuratedSession({
				lat: curatedLatParam,
				lon: curatedLonParam,
				radiusKm: curatedRadiusKmParam,
				category: curatedCategoryParam || null,
				state: curatedStateParam || null,
			}).catch(() => undefined);
			return;
		}

		if (!fromCampaignSearchParam) return;

		const restoredCategorySearch =
			parseCategorySearchQuery(fromCampaignSearchParam);

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
			rehydrateFreeTextSession({
				q: fromCampaignSearchParam,
				lat: freeTextLatParam,
				lon: freeTextLonParam,
				radiusKm: freeTextRadiusKmParam,
			}).catch(() => undefined);
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

		// Submit after a short delay to allow state to update.
		setTimeout(() => {
			form.setValue('searchText', fromCampaignSearchParam);
			form.handleSubmit(onSubmit)();

			// Restore table view if that was the last view stored in the URL.
			if (fromCampaignViewParam === 'table') {
				setTimeout(() => setIsMapView(false), 0);
			}
		}, 100);
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
		freeTextLonParam,
		freeTextModeParam,
		freeTextRadiusKmParam,
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
		const inFreeTextMode = isCuratedSearchActive && lastFreeTextArgs != null && !inCuratedMode;
		writeCuratedParams(params, inCuratedMode ? lastCuratedArgs : null);
		writeFreeTextParams(
			params,
			inFreeTextMode
				? {
						lat: lastFreeTextArgs?.lat ?? null,
						lon: lastFreeTextArgs?.lon ?? null,
						radiusKm: lastFreeTextArgs?.radiusKm ?? null,
				  }
				: null
		);

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
		try {
			localStorage.setItem('murmur_dashboard_last_search', params.toString());
		} catch {
			// localStorage may be unavailable (private mode, quota) — non-fatal.
		}
	}, [activeSearchQuery, hasSearched, isAddToCampaignMode, searchParams]);

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
			CURATED_URL_PARAM_KEYS.some((key) => params.get(key) !== null) ||
			FREETEXT_URL_PARAM_KEYS.some((key) => params.get(key) !== null);
		if (!had) return;

		params.delete('view');
		params.delete('search');
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

		// Curated and free-text travel under their own short-key namespaces so the rehydration
		// effect can branch on whichever flag is present.
		const inCuratedMode = isCuratedSearchActive && lastCuratedArgs != null;
		const inFreeTextMode = isCuratedSearchActive && lastFreeTextArgs != null && !inCuratedMode;
		writeCuratedParams(params, inCuratedMode ? lastCuratedArgs : null);
		writeFreeTextParams(
			params,
			inFreeTextMode
				? {
						lat: lastFreeTextArgs?.lat ?? null,
						lon: lastFreeTextArgs?.lon ?? null,
						radiusKm: lastFreeTextArgs?.radiusKm ?? null,
				  }
				: null
		);

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
	}, [
		activeSearchQuery,
		form,
		fromHomeParam,
		hasSearched,
		isSignedIn,
		onSubmit,
	]);

	// Batch update for assigning titles to contacts without one
	const { mutateAsync: batchUpdateContacts } = useBatchUpdateContacts({ suppressToasts: true });

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
					(c) => selectedContacts.includes(c.id) && 
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

	const activeCampaignUserContactListId =
		activeCampaign?.userContactLists?.[0]?.id;

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

			router.push(
				`${urls.murmur.campaign.detail(activeCampaignId)}?origin=search`
			);
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
	const [mapPanelExtraContacts, setMapPanelExtraContacts] = useState<ContactWithName[]>([]);
	// Live (viewport-driven) overlay pins that match the active "What" (Zillow-style panel updates).
	const [mapPanelVisibleOverlayContacts, setMapPanelVisibleOverlayContacts] = useState<
		ContactWithName[]
	>([]);
	// Sticky (per-selected-contact) search-derived headline so selected items keep their
	// category identity (e.g. Wedding Planner) across subsequent searches in the same map session.
	const [selectedContactStickyHeadlineById, setSelectedContactStickyHeadlineById] = useState<
		Record<number, string>
	>({});
	const [activeMapTool, setActiveMapTool] = useState<'select' | 'grab'>('grab');
	// Per-category visibility driven by the tall-stack tile toggles in grab mode.
	// True = tile is colored (visible on map); false = tile is gray (hidden).
	// Indexes follow MAP_SELECT_GRAB_CATEGORY_TITLE_PREFIXES order.
	const [mapGrabActiveCategories, setMapGrabActiveCategories] = useState<readonly boolean[]>(
		() => new Array(MAP_SELECT_GRAB_CATEGORY_COUNT).fill(true)
	);
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
	const [hoveredMapMarkerContact, setHoveredMapMarkerContact] = useState<ContactWithName | null>(
		null
	);
	// When hovering a row in the map side panel, highlight/show the corresponding marker on the map.
	const [hoveredMapPanelContactId, setHoveredMapPanelContactId] = useState<number | null>(null);
	// Show loading in the map panel when:
	// 1. A search is actively pending/loading, OR
	// 2. We're in fromHome mode and the search hasn't been executed yet (user not signed in or waiting for search trigger)
	const isMapResultsLoading = isSearchPending || isLoadingContacts || isRefetchingContacts ||
		(fromHomeParam && isMapView && (!isSignedIn || !hasSearched));
	const shouldRenderSearchResultsStage =
		activeTab === 'search' &&
		(activeSearchQuery.trim().length > 0 ||
			fromHomeParam ||
			(isMapView && hasSearched && isMapResultsLoading));
	const isSelectMapToolActive = activeMapTool === 'select';
	const hasNoSearchResults =
		hasSearched && !isMapResultsLoading && (contacts?.length ?? 0) === 0;
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
	const mapPanelRowsNarrowRef = useRef<HTMLDivElement>(null);
	const prevMapResultsLoadingRef = useRef(isMapResultsLoading);
	const cascadeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

	// Match the map panel skeleton wave animation so the cascade feels like it
	// "resolves" the wave into real results.
	const WAVE_BASE_BG = '#C5F0FF';
	const WAVE_DURATION_SECONDS = 2.5;
	const WAVE_ROW_STEP_DELAY_SECONDS = 0.1;
	const CASCADE_INITIAL_DELAY_MS = 120;
	const CASCADE_STAGGER_MS = 100;
	const CASCADE_MAX_ROWS = 14;

	// useLayoutEffect: runs synchronously BEFORE the browser paints so the user
	// never sees a flash of white rows — they start as placeholders.
	useLayoutEffect(() => {
		const wasLoading = prevMapResultsLoadingRef.current;
		prevMapResultsLoadingRef.current = isMapResultsLoading;
		if (!wasLoading || isMapResultsLoading) return;

		// Clear any in-flight timers from a previous cascade.
		for (const t of cascadeTimersRef.current) clearTimeout(t);
		cascadeTimersRef.current = [];

		const refs = [mapPanelRowsDesktopRef.current, mapPanelRowsNarrowRef.current];
		for (const container of refs) {
			if (!container) continue;
			const rows = Array.from(container.children).slice(0, CASCADE_MAX_ROWS) as HTMLElement[];
			if (rows.length === 0) continue;

			// Set every row to the placeholder wave state before the browser paints.
			rows.forEach((row, idx) => {
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
			rows.forEach((row, idx) => {
				const timer = setTimeout(() => {
					const targetBg =
						row.dataset.cascadeBg && row.dataset.cascadeBg.length > 0 ? row.dataset.cascadeBg : '#FFFFFF';
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
				}, CASCADE_INITIAL_DELAY_MS + idx * CASCADE_STAGGER_MS);
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
	const SEARCH_THIS_AREA_GAP_PX = 45;
	const SEARCH_THIS_AREA_BUTTON_TOP_PX =
		MAP_VIEW_SEARCH_BAR_TOP_PX + MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX + SEARCH_THIS_AREA_GAP_PX;

	const [isSearchThisAreaCtaVisible, setIsSearchThisAreaCtaVisible] = useState(false);
	const searchThisAreaCtaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastSearchThisAreaViewportRef = useRef<SearchThisAreaViewportIdlePayload | null>(null);

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
	}, [activeSearchQuery, hideSearchThisAreaCta, isMapResultsLoading, isMapView, mapBboxFilter]);

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
	const [initialDashboardSearchSuggestionSeeds, setInitialDashboardSearchSuggestionSeeds] =
		useState<InitialDashboardSearchSuggestionSeed[]>(
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

			try {
				const loc = await Promise.race([
					getApproximateLocation(),
					new Promise<null>((resolve) => setTimeout(() => resolve(null), 1600)),
				]);
				if (loc) {
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
					.filter(
						(state): state is InitialDashboardSearchSuggestionState => Boolean(state)
					);
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

						return { label, state };
					})
					.filter(
						(
							seed
						): seed is InitialDashboardSearchSuggestionSeed => Boolean(seed)
					)
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
		if (!isMapBottomSearchExpanded) {
			setMapBottomSearchActiveHeight(MAP_RESULTS_BOTTOM_SEARCH_BOX.activeHeight);
			return;
		}

		const input = mapBottomSearchInputRef.current;
		if (!input) return;

		const previousHeight = input.style.height;
		input.style.height = 'auto';
		const nextHeight = Math.min(
			MAP_RESULTS_BOTTOM_SEARCH_BOX.activeMaxHeight,
			Math.max(MAP_RESULTS_BOTTOM_SEARCH_BOX.activeHeight, input.scrollHeight)
		);
		input.style.height = previousHeight;

		setMapBottomSearchActiveHeight((current) =>
			current === nextHeight ? current : nextHeight
		);
	}, [isMapBottomSearchExpanded, mapBottomSearchValue]);

	const handleMapBottomSearchActivate = useCallback(() => {
		setIsMapBottomSearchActive(true);
		window.requestAnimationFrame(() => {
			mapBottomSearchInputRef.current?.focus();
		});
	}, []);

	// Free-text "Search Anything" submit. Runs the hybrid retriever route and
	// surfaces results through the same curated-results pipe so map pins,
	// list, and selection just update. Empty input → no-op (don't accidentally
	// kick off a curated re-roll). Available on the free trial — no demo-mode
	// gate here.
	const submitMapBottomSearchQuery = useCallback(async (query: string) => {
		const q = query.trim();
		if (!q) return;
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
		}).catch(() => undefined);
	}, [
		primeFreeTextSearch,
		triggerFreeTextSearch,
		ensureActiveCampaign,
		isAddToCampaignMode,
		isFromHomeDemoMode,
	]);

	const handleMapBottomSearchSubmit = useCallback(async () => {
		await submitMapBottomSearchQuery(mapBottomSearchValue);
	}, [mapBottomSearchValue, submitMapBottomSearchQuery]);

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

	const handleMapBottomSearchFollowupPreviewChange = useCallback(
		(selection: MapBottomSearchFollowupPreview) => {
			cancelMapBottomSearchFollowupPreviewClear();
			setMapBottomSearchFollowupPreview(selection);
		},
		[cancelMapBottomSearchFollowupPreviewClear]
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

	useEffect(() => cancelMapBottomSearchFollowupPreviewClear, [
		cancelMapBottomSearchFollowupPreviewClear,
	]);

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

	const handleMapBottomSearchFollowupSelectionChange = useCallback(
		(selection: MapBottomSearchFollowupSelection) => {
			cancelMapBottomSearchFollowupPreviewClear();
			setMapBottomSearchFollowupPreview(null);
			setMapBottomSearchFollowupSelection(selection);

			if (selection === 'category' || selection === 'for-you') {
				mapBottomSearchInputRef.current?.blur();
				setIsMapBottomSearchActive(false);
			}

			if (selection !== 'category') {
				if (isMapBottomCategoryDropdownActive) {
					setActiveSection(null);
				}
				setIsMapBottomCategoryDropdownActive(false);
			}
		},
		[cancelMapBottomSearchFollowupPreviewClear, isMapBottomCategoryDropdownActive]
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
	const [selectedCategoryChips, setSelectedCategoryChips] = useState<Set<string>>(new Set());

	const shouldUseDynamicMapCreateCampaignCta =
		isMapView &&
		!isMobile &&
		isXlDesktop &&
		!isMapResultsLoading &&
		!hasNoSearchResults &&
		!isNarrowestDesktop;

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
		(contact: ContactWithName | null) => {
			setHoveredMapMarkerContact(contact);
		},
		[]
	);

	const mapResearchPanelCompactHeightPx = useMemo(() => {
		const metadata = mapResearchPanelContact?.metadata;
		if (!metadata || metadata.trim().length === 0) return null;
		// Prefer a compact height for parsed bullets + summary (removes the big dead space gap).
		const parsedHeight = getCompactMapResearchPanelHeightPxForParsed(metadata);
		if (parsedHeight) return parsedHeight;

		// Fallback: only compact summary-only research when it is short enough.
		return getCompactMapResearchPanelHeightPx(metadata);
	}, [mapResearchPanelContact?.metadata]);

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
	const isCoffeeShopsSearch = searchWhatLower.includes('coffee shop') || searchWhatLower.includes('coffee shops');
	// Treat "Festivals" as shorthand for "Music Festivals" but avoid matching "Beer Festivals", etc.
	const isMusicFestivalsSearch =
		searchWhatLower.includes('music festival') || /^festivals?$/.test(searchWhatLower.trim());
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
					const contactStateAbbr = getStateAbbreviation(contact.state || '').trim().toUpperCase();
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
			const contactStateAbbr = getStateAbbreviation(c.state || '').trim().toUpperCase();
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
	}, [isMapView, selectedContacts, contacts, mapPanelExtraContacts, baseContactIdSet, searchedStateAbbrForMap]);

	// Check if all panel contacts are selected (for map view "Select all" button)
	const isAllPanelContactsSelected = useMemo(() => {
		if (mapPanelContacts.length === 0) return false;
		return mapPanelContacts.every((contact) => selectedContacts.includes(contact.id));
	}, [mapPanelContacts, selectedContacts]);

	const mapPanelSelectedContacts = useMemo(
		() => mapPanelContacts.filter((c) => selectedContacts.includes(c.id)),
		[mapPanelContacts, selectedContacts]
	);
	const mapPanelUnselectedContacts = useMemo(
		() => mapPanelContacts.filter((c) => !selectedContacts.includes(c.id)),
		[mapPanelContacts, selectedContacts]
	);

	// Maps a contact to one of the chip keys (or null) — mirrors the row renderer's category pill priority.
	const getChipKeyForContact = useCallback((contact: ContactWithName): string | null => {
		const isInBase = baseContactIdSet.has(contact.id);
		const headline = contact.curatedDisplayLabel || contact.headline || contact.title || '';
		if ((isInBase && isRestaurantsSearch) || isRestaurantTitle(headline)) return 'restaurants';
		if ((isInBase && isCoffeeShopsSearch) || isCoffeeShopTitle(headline)) return 'coffee-shops';
		if ((isInBase && isMusicVenuesSearch) || isMusicVenueTitle(headline)) return 'music-venues';
		if ((isInBase && isMusicFestivalsSearch) || isMusicFestivalTitle(headline)) return 'festivals';
		if ((isInBase && isWeddingPlannersSearch) || isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) return 'wedding-planners';
		if (isWineBeerSpiritsTitle(headline)) return 'wine-beer-spirits';
		return null;
	}, [baseContactIdSet, isRestaurantsSearch, isCoffeeShopsSearch, isMusicVenuesSearch, isMusicFestivalsSearch, isWeddingPlannersSearch]);

	// Set of chip keys present in the panel results — drives which chips are visible at the bottom.
	const mapPanelCategoryKeys = useMemo(() => {
		const set = new Set<string>();
		for (const c of mapPanelContacts) {
			const key = getChipKeyForContact(c);
			if (key) set.add(key);
		}
		return set;
	}, [mapPanelContacts, getChipKeyForContact]);

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
		gsap.set(whitePill, { y: 0, yPercent: -50, x: getTabPillXFor(activeTab), opacity: 1 });
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
	const shouldLockDashboardPageScroll =
		isMapView || shouldLockLandingDashboardScroll;

	// The calendar panel's natural height can exceed the locked-100vh wrapper on shorter
	// monitors, which clips its bottom row. Treat it the same way the open campaign finder
	// is treated: let it paint past the wrapper (overflow: visible on html/body, drop the
	// `h-screen overflow-hidden` clipper) while still preventing the page from scrolling.
	const isCalendarPanelOpen =
		!hasSearched && activeTab === 'search' && selectedActionBarIcon === 'calendar';
	const isOverflowingDashboardPanelOpen =
		isCampaignFinderOpen || isCalendarPanelOpen;

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
			const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
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

	// Check for pending search from contacts page searchbar
	useEffect(() => {
		const pendingSearch = sessionStorage.getItem('murmur_pending_search');
		if (pendingSearch) {
			// Clear the pending search immediately to prevent re-triggering
			sessionStorage.removeItem('murmur_pending_search');

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
	}, [form, onSubmit]);

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
	const mapPresentation: 'background' | 'interactive' =
		!fromHomeParam && !hasSearched ? 'background' : 'interactive';
	const shouldSpinBackgroundMap = mapPresentation === 'background';

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

	const lockedStateNameForMap =
		mapPresentation === 'background'
			? null
			: mapBboxFilter
				? null
				: fromHomeParam && (!isSignedIn || !hasSearched)
					? 'CA'
					: searchedStateAbbrForMap;

	const skipAutoFitForMap =
		mapPresentation === 'background'
			? true
			: (fromHomeParam && (!isSignedIn || !hasSearched)) || Boolean(mapBboxFilter);

	const selectedAreaBoundsForMap = useMemo(
		() =>
			mapBboxFilter
				? {
						south: mapBboxFilter.south,
						west: mapBboxFilter.west,
						north: mapBboxFilter.north,
						east: mapBboxFilter.east,
				  }
				: null,
		[mapBboxFilter]
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
	const mapViewInnerRadiusPx = Math.max(0, MAP_VIEW_FRAME_RADIUS_PX - MAP_VIEW_FRAME_BORDER_PX);
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
						prev.some((c) => c.id === contactId)
							? prev
							: [selectedContact, ...prev]
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

	const persistentMapProps = useMemo<SearchResultsMapProps>(
		() => ({
			weatherMood: globeWeatherMood,
			weatherRegionCenter: globeWeatherRegionCenter,
			weatherTemperatureF: globeWeatherTemperatureF,
			nightLighting: globeNightLighting,
			presentation: mapPresentation,
			autoSpin: shouldSpinBackgroundMap,
			contacts: contactsForMap,
			selectedContacts,
			externallyHoveredContactId: hoveredMapPanelContactId,
			searchQuery: activeSearchQuery,
			searchWhat: searchWhatForMap,
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
			onStateSelect: shouldEnableMapStateCategorySelection ? handleMapStateSelect : undefined,
			isLoading: isSearchPending || isLoadingContacts || isRefetchingContacts,
			onMarkerClick: isMapView ? handleMapMarkerClick : undefined,
			onToggleSelection: isMapView ? handleMapToggleSelection : undefined,
		}),
		[
			activeMapTool,
			activeSearchQuery,
			contactsForMap,
			globeNightLighting,
			globeWeatherMood,
			globeWeatherRegionCenter,
			globeWeatherTemperatureF,
			handleMapAreaSelect,
			handleMapMarkerClick,
			handleMapMarkerHover,
			handleMapStateSelect,
			handleMapToggleSelection,
			handleMapViewportIdle,
			handleMapViewportInteraction,
			handleMapViewportZoom,
			handleMapVisibleOverlayContactsChange,
			hoveredMapPanelContactId,
			isLoadingContacts,
			isMapView,
			isRefetchingContacts,
			isSearchPending,
			lockedStateNameForMap,
			mapPresentation,
			mapZoomControlRequest,
			searchWhatForMap,
			selectedAreaBoundsForMap,
			selectedContacts,
			selectAllInViewNonce,
			shouldEnableMapStateCategorySelection,
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

	const mapPortal = null;

	// Return null during initial load to prevent hydration mismatch
	if (isMobile === null) {
		return <div className="min-h-screen w-full">{mapPortal}</div>;
	}

	// Mobile dashboard: show only the campaigns inbox table (no search bar, no tab toggle).
	if (isMobile) {
		return (
			<div className="min-h-screen w-full">
				{mapPortal}

				{/* Only show logo above box when there are campaigns */}
				{hasCampaigns && (
					<div className="w-full">
						<div
							className="flex justify-center items-center w-full px-4"
							style={{
								marginBottom: '0.5rem',
								marginTop: '40px',
							}}
						>
							<div className="premium-hero-section flex flex-col items-center justify-center w-full max-w-[600px]">
								<div
									className="premium-logo-container flex items-center justify-center"
									style={{ width: logoWidth, height: logoHeight }}
								>
									<MurmurLogoNew width={logoWidth} height={logoHeight} />
								</div>
							</div>
						</div>
					</div>
				)}

				<div style={{ marginTop: hasCampaigns ? '12px' : '40px' }}>
					<CampaignsInboxView
						hideSearchBar
						containerHeight={hasCampaigns ? 'calc(100dvh - 120px - env(safe-area-inset-bottom, 0px))' : 'calc(100dvh - 60px - env(safe-area-inset-bottom, 0px))'}
					/>
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

	// Renders one contact row in the map-view right-side panel (desktop variant).
	// Used by both the "Selection" and "Search Results" sub-panels — they differ
	// only in which slice of `mapPanelContacts` they iterate over.
	const renderMapPanelDesktopRow = (contact: ContactWithName) => {
		const isSelected = selectedContacts.includes(contact.id);
		const isHovered = hoveredMapPanelContactId === contact.id;
		const isInBaseResults = baseContactIdSet.has(contact.id);
		const firstName = contact.firstName || '';
		const lastName = contact.lastName || '';
		const fullName = contact.name || `${firstName} ${lastName}`.trim();
		const company = contact.company || '';
		const searchDerivedHeadline =
			whatValue && whereValue
				? `${whatValue} ${whereValue}`
				: whatValue || '';
		const isSpecialCategorySearch =
			/^restaurants?$/i.test(whatValue.trim()) ||
			/^coffee\s*shops?$/i.test(whatValue.trim());
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
		const stickyHeadline =
			selectedContactStickyHeadlineById[contact.id] || '';
		const headline =
			isSelected && stickyHeadline ? stickyHeadline : computedHeadline;
		const isRestaurantsSearchForContact = isRestaurantsSearch && isInBaseResults;
		const isCoffeeShopsSearchForContact = isCoffeeShopsSearch && isInBaseResults;
		const isMusicVenuesSearchForContact = isMusicVenuesSearch && isInBaseResults;
		const isMusicFestivalsSearchForContact = isMusicFestivalsSearch && isInBaseResults;
		const isWeddingPlannersSearchForContact = isWeddingPlannersSearch && isInBaseResults;
		const stateAbbr = getStateAbbreviation(contact.state || '') || '';
		const city = contact.city || '';

		return (
			<div
				key={contact.id}
				data-contact-id={contact.id}
				className="cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-[3px] border-[#ABABAB] select-none relative"
				style={{
					backgroundColor: isSelected
						? (isRestaurantsSearchForContact || isRestaurantTitle(headline))
							? isHovered ? '#C5F5D1' : '#D7FFE1'
							: (isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline))
								? isHovered ? '#DDF4CC' : '#EDFEDC'
								: (isMusicVenuesSearchForContact || isMusicVenueTitle(headline))
									? isHovered ? '#C5E8FF' : '#D7F0FF'
									: (isMusicFestivalsSearchForContact || isMusicFestivalTitle(headline))
										? isHovered ? '#ADD4FF' : '#BFDCFF'
										: (isWeddingPlannersSearchForContact || isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
											? isHovered ? '#F5EDCE' : '#FFF8DC'
											: isWineBeerSpiritsTitle(headline)
												? isHovered ? '#C8CBFF' : '#DADDFF'
												: isHovered ? '#BFE3FF' : '#C9EAFF'
						: isHovered
							? '#F3F4F6'
							: '#FFFFFF',
				}}
				onClick={() => {
					if (isSelected) {
						setSelectedContacts(
							selectedContacts.filter((id) => id !== contact.id)
						);
					} else {
						setSelectedContacts([...selectedContacts, contact.id]);
					}
				}}
				onMouseEnter={() => setHoveredMapPanelContactId(contact.id)}
				onMouseLeave={() =>
					setHoveredMapPanelContactId((prev) =>
						prev === contact.id ? null : prev
					)
				}
			>
				{fullName ? (
					<>
						<div className="pl-3 pr-1 flex items-center h-[23px]">
							<div className="font-bold text-[11px] w-full truncate leading-tight">
								{fullName}
							</div>
						</div>
						<div className="pr-2 pl-1 flex items-center h-[23px]">
							{(headline || isMusicVenuesSearchForContact || isRestaurantsSearchForContact || isCoffeeShopsSearchForContact || isMusicFestivalsSearchForContact || isWeddingPlannersSearchForContact) ? (
								<div
									className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
									style={{
										backgroundColor: (isRestaurantsSearchForContact || isRestaurantTitle(headline))
											? '#C3FBD1'
											: (isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline))
												? '#D6F1BD'
												: (isMusicVenuesSearchForContact || isMusicVenueTitle(headline))
													? '#B7E5FF'
													: (isMusicFestivalsSearchForContact || isMusicFestivalTitle(headline))
														? '#C1D6FF'
														: (isWeddingPlannersSearchForContact || isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
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
									{(isMusicFestivalsSearchForContact || isMusicFestivalTitle(headline)) && (
										<FestivalsIcon size={12} className="flex-shrink-0" />
									)}
									{(isWeddingPlannersSearchForContact || isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) && (
										<WeddingPlannersIcon size={12} />
									)}
									{isWineBeerSpiritsTitle(headline) && (
										<WineBeerSpiritsIcon size={12} className="flex-shrink-0" />
									)}
									<span className="text-[10px] text-black leading-none truncate">
										{(isRestaurantsSearchForContact || isRestaurantTitle(headline))
											? 'Restaurant'
											: (isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline))
												? 'Coffee Shop'
												: (isMusicVenuesSearchForContact || isMusicVenueTitle(headline))
													? 'Music Venue'
													: (isMusicFestivalsSearchForContact || isMusicFestivalTitle(headline))
														? 'Music Festival'
														: isWeddingVenueTitle(headline)
															? 'Wedding Venue'
															: (isWeddingPlannersSearchForContact || isWeddingPlannerTitle(headline))
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
												backgroundColor:
													stateBadgeColorMap[stateAbbr] || 'transparent',
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
							{(headline || isMusicVenuesSearchForContact || isRestaurantsSearchForContact || isCoffeeShopsSearchForContact || isMusicFestivalsSearchForContact || isWeddingPlannersSearchForContact) ? (
								<div
									className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
									style={{
										backgroundColor: (isRestaurantsSearchForContact || isRestaurantTitle(headline))
											? '#C3FBD1'
											: (isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline))
												? '#D6F1BD'
												: (isMusicVenuesSearchForContact || isMusicVenueTitle(headline))
													? '#B7E5FF'
													: (isMusicFestivalsSearchForContact || isMusicFestivalTitle(headline))
														? '#C1D6FF'
														: (isWeddingPlannersSearchForContact || isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
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
									{(isMusicFestivalsSearchForContact || isMusicFestivalTitle(headline)) && (
										<FestivalsIcon size={12} className="flex-shrink-0" />
									)}
									{(isWeddingPlannersSearchForContact || isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) && (
										<WeddingPlannersIcon size={12} />
									)}
									{isWineBeerSpiritsTitle(headline) && (
										<WineBeerSpiritsIcon size={12} className="flex-shrink-0" />
									)}
									<span className="text-[10px] text-black leading-none truncate">
										{(isRestaurantsSearchForContact || isRestaurantTitle(headline))
											? 'Restaurant'
											: (isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline))
												? 'Coffee Shop'
												: (isMusicVenuesSearchForContact || isMusicVenueTitle(headline))
													? 'Music Venue'
													: (isMusicFestivalsSearchForContact || isMusicFestivalTitle(headline))
														? 'Music Festival'
														: isWeddingVenueTitle(headline)
															? 'Wedding Venue'
															: (isWeddingPlannersSearchForContact || isWeddingPlannerTitle(headline))
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
												backgroundColor:
													stateBadgeColorMap[stateAbbr] || 'transparent',
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
					height: 100vh !important;
					overscroll-behavior: none !important;
				}
				html:has([data-dashboard-scroll-lock='true'][data-campaign-finder-open='true']),
				html:has([data-dashboard-scroll-lock='true'][data-calendar-panel-open='true']),
				body:has([data-dashboard-scroll-lock='true'][data-campaign-finder-open='true']),
				body:has([data-dashboard-scroll-lock='true'][data-calendar-panel-open='true']) {
					overflow: visible !important;
					height: 100vh !important;
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
					background-color: var(--initial-dashboard-search-suggestion-background, #f8f8f8);
					border: 0;
					cursor: pointer;
					opacity: var(--initial-dashboard-search-suggestion-opacity, 0.5);
					text-align: left;
					transform: translateY(0) scale(1);
					transform-origin: center bottom;
					transition: background-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease, transform 120ms ease;
					animation: initial-dashboard-search-suggestion-enter 320ms cubic-bezier(0, 0, 0.2, 1) backwards;
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
			{!hasSearched && activeTab === 'search' && !fromHomeParam && !isMapView && !isNarrowestDesktop && (
				<div
					className="fixed left-1/2 pointer-events-none"
					onMouseEnter={cancelMapBottomSearchFollowupPreviewClear}
					onMouseLeave={scheduleMapBottomSearchFollowupPreviewClear}
					style={{
						bottom: `${INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.bottomOffset}px`,
						width: `${INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.width}px`,
						height: `${INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.height}px`,
						transform: 'translateX(-50%)',
						transition: 'none',
						zIndex: 70,
					}}
				>
					{isMapBottomSearchExpanded && !isMapBottomCategoryMode && !isMapBottomForYouMode && (
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
									style={{
										width: '404px',
										height: '29px',
										borderRadius: '10px',
										'--initial-dashboard-search-suggestion-background': '#F8F8F8',
										'--initial-dashboard-search-suggestion-opacity':
											INITIAL_DASHBOARD_ACTIVE_SEARCH_SUGGESTIONS[index]?.opacity ?? 0.5,
										animationDelay: `${
											(initialDashboardSearchSuggestions.length - 1 - index) * 48
										}ms`,
										boxSizing: 'border-box',
										padding: '0 16px',
									} as React.CSSProperties}
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
						activeHeight={INITIAL_DASHBOARD_BOTTOM_SEARCH_BOX.height}
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
			)}

			<div
				data-dashboard-scroll-lock={
					shouldLockDashboardPageScroll ? 'true' : undefined
				}
				data-campaign-finder-open={
					isCampaignFinderOpen ? 'true' : undefined
				}
				data-calendar-panel-open={
					isCalendarPanelOpen ? 'true' : undefined
				}
				className={
					shouldLockDashboardPageScroll && !isOverflowingDashboardPanelOpen
						? 'h-screen overflow-hidden'
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
									<MurmurLogoNew width={logoWidth} height={logoHeight} />
								</div>
							</div>
						</div>

						<div
							className={`search-bar-wrapper w-full max-w-[1132px] mx-auto px-4 max-[480px]:px-2 !z-[50] ${
								hasSearched ? 'search-bar-active' : ''
							}`}
						>
							<div
								className="origin-center w-full"
								style={{
									transform:
										'scale(clamp(0.84, calc(0.72 + (100vw / 3333px)), 1.08))',
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
																		if (event.pointerType !== 'mouse' && event.pointerType !== 'pen')
																			return;
																		// "Almost halt" the animated gradient while hovered.
																		setHeroSearchGradientPlaybackRate(0.08);
																	}}
																	onPointerLeave={(event) => {
																		if (event.pointerType !== 'mouse' && event.pointerType !== 'pen')
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
																				: '!h-[72px] max-[480px]:!h-[60px] !border-2 !border-black'
																		} pr-[70px] max-[480px]:pr-[58px] md:pr-[80px]`}
																		placeholder=""
																		style={{
																			accentColor: 'transparent',
																			transition: 'none',
																			...(inboxView ? { backgroundColor: '#EFEFEF' } : {}),
																		}}
																		autoComplete="off"
																		autoCorrect="off"
																		autoCapitalize="off"
																		spellCheck="false"
																		{...field}
																	/>
																	{/* New 532x64px element - Added border-black and z-20 */}
																	<div
																		className={`search-sections-container absolute left-[4px] right-[68px] ${
																			inboxView ? '' : 'max-[480px]:right-[56px]'
																		} top-1/2 -translate-y-1/2 ${
																			inboxView
																				? 'h-[31px]'
																				: 'h-[64px] max-[480px]:h-[52px]'
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
																		style={{ opacity: 0, willChange: 'transform' }}
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
																				className={`absolute z-20 left-[24px] max-[480px]:left-[12px] ${
																					inboxView
																						? 'top-1/2 -translate-y-1/2 text-[14px]'
																						: 'top-[10px] max-[480px]:top-[7px] text-[22px] max-[480px]:text-[18px]'
																				} font-bold text-black leading-none`}
																			>
																				{inboxView ? (whyValue ? whyValue.replace(/[\[\]]/g, '') : 'Why') : 'Why'}
																			</div>
																			<div
																				className={`absolute z-20 left-[24px] max-[480px]:left-[12px] right-[4px] top-[42px] max-[480px]:top-[30px] h-[12px] overflow-hidden ${
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
																							whyValue && whyValue.trim().length > 0
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
																					className="absolute z-20 left-[24px] max-[480px]:left-[12px] right-[8px] top-1/2 -translate-y-1/2 w-auto font-bold text-black text-[14px] bg-transparent outline-none border-none leading-none placeholder:text-black"
																						style={{
																							fontFamily: 'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
																						}}
																						placeholder="What"
																						onClick={(e) => e.stopPropagation()}
																					/>
																				) : (
																				<div className="absolute z-20 left-[24px] max-[480px]:left-[12px] right-[8px] top-1/2 -translate-y-1/2 font-bold text-black text-[14px] leading-none">
																						{whatValue || 'What'}
																					</div>
																				)
																			) : (
																				<>
																				<div className="absolute z-20 left-[24px] max-[480px]:left-[12px] top-[10px] max-[480px]:top-[7px] text-[22px] max-[480px]:text-[18px] font-bold text-black leading-none">
																						What
																					</div>
																				<div className="absolute z-20 left-[24px] max-[480px]:left-[12px] right-[8px] top-[42px] max-[480px]:top-[30px] h-[12px] overflow-hidden">
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
																								onClick={(e) => e.stopPropagation()}
																							/>
																						) : (
																							<div
																							className="absolute z-20 top-0 left-0 w-full font-semibold text-[12px] whitespace-nowrap overflow-hidden hover:text-black/60 transition-colors"
																								style={{
																									height: '12px',
																									lineHeight: '12px',
																									padding: '0',
																									margin: '0',
																									color: whatValue ? '#000000' : 'rgba(0, 0, 0, 0.42)',
																									maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
																									WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
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
																					className="absolute z-20 left-[24px] max-[480px]:left-[12px] right-[8px] top-1/2 -translate-y-1/2 w-auto font-bold text-black text-[14px] bg-transparent outline-none border-none leading-none placeholder:text-black"
																						style={{
																							fontFamily: 'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
																						}}
																						placeholder="Where"
																						onClick={(e) => e.stopPropagation()}
																					/>
																				) : (
																				<div className="absolute z-20 left-[24px] max-[480px]:left-[12px] right-[8px] top-1/2 -translate-y-1/2 font-bold text-black text-[14px] leading-none">
																						{whereValue || 'Where'}
																					</div>
																				)
																			) : (
																				<>
																				<div className="absolute z-20 left-[24px] max-[480px]:left-[12px] top-[10px] max-[480px]:top-[7px] text-[22px] max-[480px]:text-[18px] font-bold text-black leading-none">
																						Where
																					</div>
																				<div className="absolute z-20 left-[24px] max-[480px]:left-[12px] right-[8px] top-[42px] max-[480px]:top-[30px] h-[12px] overflow-hidden">
																						{activeSection === 'where' ? (
																						<div className="absolute z-20 top-0 left-0 w-full h-full flex items-center gap-[2px]">
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
																									onClick={(e) => e.stopPropagation()}
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
																									color: hasWhereValue ? '#000000' : 'rgba(0, 0, 0, 0.42)',
																									maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
																									WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
																								}}
																							>
																								{hasWhereValue ? whereValue : 'Search States'}
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
																		className="search-gradient-button search-spotlight-zone search-pond-zone absolute left-[4px] right-[68px] max-[480px]:right-[56px] top-1/2 -translate-y-1/2 h-[64px] max-[480px]:h-[52px] rounded-[8px] z-30 cursor-pointer"
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
																		onPointerEnter={updateSpotlightVarsFromPointer}
																		onPointerMove={updateSpotlightVarsFromPointer}
																	>
																		{/* Anisotropic streak field — follows gradient flow */}
																		<div className="search-refraction-streaks" aria-hidden="true" />
																		{/* Micro caustics ripple layer */}
																		<div className="search-refraction-caustics" aria-hidden="true" />
																		<span className="search-spotlight-content" style={{ position: 'absolute', left: 'calc(50% + 32px)', top: '50%', transform: 'translate(-50%, -50%)' }}>Search</span>
																	</button>
																		)}
																	{/* Desktop Search Button */}
																		<button
																			type="submit"
																			ref={heroSearchIconButtonRef}
																			className={`dashboard-search-button search-spotlight-zone search-spotlight-zone-sm flex absolute right-[6px] items-center justify-center w-[58px] ${
																				inboxView
																					? 'h-[31px]'
																					: 'h-[62px] max-[480px]:h-[50px] max-[480px]:w-[46px]'
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
																			onPointerEnter={updateSpotlightVarsFromPointer}
																			onPointerMove={updateSpotlightVarsFromPointer}
																		>
																			<span className="search-spotlight-content">
																				<SearchIconDesktop width={inboxView ? 25 : 26} height={inboxView ? 25 : 28} />
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
															{ key: 'playbook', Icon: DashboardActionBarPlaybookIcon, label: 'Playbook' },
															{ key: 'folder', Icon: DashboardActionBarFolderIcon, label: 'Folder' },
															{ key: 'calendar', Icon: DashboardActionBarCalendarIcon, label: 'Calendar' },
															{ key: 'star', Icon: DashboardActionBarStarIcon, label: 'Opportunities' },
															{ key: 'envelope', Icon: DashboardActionBarEnvelopeIcon, label: 'Messages' },
																		] as const
																	).map(({ key, Icon, label }) => {
																		const isSelected = selectedActionBarIcon === key;
																		return (
																			<button
																				key={key}
																				type="button"
																				aria-label={label}
																				aria-pressed={isSelected}
																				onClick={() => setSelectedActionBarIcon(key)}
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
																							field.value ? 'bg-white' : 'bg-[#050505]'
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
								<div style={{ display: inboxSubtab === 'messages' ? 'block' : 'none' }}>
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
									backgroundColor: MAP_RESULTS_SEARCH_TRAY.whyBackgroundColors.promotion,
									icon: <PromotionIcon />,
							  }
							: {
									backgroundColor: MAP_RESULTS_SEARCH_TRAY.whyBackgroundColors.booking,
									icon: <BookingIcon />,
							  };

						const effectiveWhatKeyForTray =
							mapTopSearchDisplay.kind === 'category'
								? mapTopSearchDisplay.what.trim()
								: (searchedWhat || '').trim();
						const whatCfg = MAP_RESULTS_SEARCH_TRAY.whatIconByLabel[effectiveWhatKeyForTray];
						const TrayWhatIcon = whatCfg?.Icon || MusicVenuesIcon;
						const trayWhatIconSize =
							effectiveWhatKeyForTray === 'Wine, Beer, and Spirits' ? 22 : undefined;
						const trayWhat = {
							backgroundColor:
								whatCfg?.backgroundColor ||
								MAP_RESULTS_SEARCH_TRAY.whatIconByLabel['Music Venues'].backgroundColor,
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
						const isSplitCategoryTopSearch =
							mapTopSearchDisplay.kind === 'category' &&
							mapTopSearchDisplay.what.trim().length > 0 &&
							mapTopSearchDisplay.whereLabel.trim().length > 0;

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
													style={{ cursor: 'default' }}
												>
													<div
														className="search-wave-input results-search-input !h-[49px] !border-[3px] !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus:ring-0 !focus:ring-offset-0 !ring-0 !outline-none !accent-transparent !border-black !bg-white !pr-[12px] !text-black"
														style={{
															accentColor: 'transparent',
															cursor: 'default',
															letterSpacing: 0,
															padding: 0,
															userSelect: 'none',
														}}
													>
														<div
															className={`absolute left-[6px] top-1/2 -translate-y-1/2 flex items-center rounded-[6px] z-10 overflow-hidden border border-black ${
																mapTopSearchDisplay.kind === 'curated' ? 'search-gradient-button' : ''
															}`}
															style={{
																width: 'calc(100% - 12px)',
																height: '38px',
																background:
																	mapTopSearchDisplay.kind === 'curated'
																		? undefined
																		: '#FFFFFF',
															}}
														>
															{mapTopSearchDisplay.kind === 'curated' ? (
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
																	<span className="truncate">{mapTopSearchLabel}</span>
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
																			style={{ opacity: 0, willChange: 'transform' }}
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
																				onChange={(e) => setWhatValue(e.target.value)}
																				className="w-full h-full text-left bg-transparent border-none outline-none text-[13px] font-bold font-secondary overflow-hidden placeholder:text-gray-400 p-0 focus:ring-0 cursor-pointer relative z-10"
																				style={{
																					maskImage: 'linear-gradient(to right, black 75%, transparent 100%)',
																					WebkitMaskImage: 'linear-gradient(to right, black 75%, transparent 100%)',
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
																					maskImage: 'linear-gradient(to right, black 75%, transparent 100%)',
																					WebkitMaskImage: 'linear-gradient(to right, black 75%, transparent 100%)',
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
												style={{ fontSize: '13px', fontWeight: 400, color: '#7f7f7f' }}
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
													backgroundColor: isRestaurantTitle(getContactCategoryDisplaySource(hoveredContact))
														? '#C3FBD1'
														: isCoffeeShopTitle(getContactCategoryDisplaySource(hoveredContact))
															? '#D6F1BD'
															: isMusicVenueTitle(getContactCategoryDisplaySource(hoveredContact))
																? '#B7E5FF'
																: isMusicFestivalTitle(getContactCategoryDisplaySource(hoveredContact))
																	? '#C1D6FF'
																	: (isWeddingPlannerTitle(getContactCategoryDisplaySource(hoveredContact)) || isWeddingVenueTitle(getContactCategoryDisplaySource(hoveredContact)))
																		? '#FFF8DC'
																		: isWineBeerSpiritsTitle(getContactCategoryDisplaySource(hoveredContact))
																			? '#BFC4FF'
																			: '#E8EFFF',
													border: '0.7px solid #000000',
												}}
											>
												{isRestaurantTitle(getContactCategoryDisplaySource(hoveredContact)) && (
													<RestaurantsIcon size={12} className="flex-shrink-0" />
												)}
												{isCoffeeShopTitle(getContactCategoryDisplaySource(hoveredContact)) && (
													<CoffeeShopsIcon size={7} />
												)}
												{isMusicVenueTitle(getContactCategoryDisplaySource(hoveredContact)) && (
													<MusicVenuesIcon size={12} className="flex-shrink-0" />
												)}
												{isMusicFestivalTitle(getContactCategoryDisplaySource(hoveredContact)) && (
													<FestivalsIcon size={12} className="flex-shrink-0" />
												)}
												{(isWeddingPlannerTitle(getContactCategoryDisplaySource(hoveredContact)) || isWeddingVenueTitle(getContactCategoryDisplaySource(hoveredContact))) && (
													<WeddingPlannersIcon size={12} />
												)}
												{isWineBeerSpiritsTitle(getContactCategoryDisplaySource(hoveredContact)) && (
													<WineBeerSpiritsIcon size={12} className="flex-shrink-0" />
												)}
												<span className="text-[14px] leading-none font-secondary font-medium">
													{isRestaurantTitle(getContactCategoryDisplaySource(hoveredContact))
														? 'Restaurant'
														: isCoffeeShopTitle(getContactCategoryDisplaySource(hoveredContact))
															? 'Coffee Shop'
															: isMusicVenueTitle(getContactCategoryDisplaySource(hoveredContact))
																? 'Music Venue'
																: isMusicFestivalTitle(getContactCategoryDisplaySource(hoveredContact))
																	? 'Music Festival'
																	: isWeddingVenueTitle(getContactCategoryDisplaySource(hoveredContact))
																		? 'Wedding Venue'
																		: isWeddingPlannerTitle(getContactCategoryDisplaySource(hoveredContact))
																			? 'Wedding Planner'
																			: isWineBeerSpiritsTitle(getContactCategoryDisplaySource(hoveredContact))
																				? getWineBeerSpiritsLabel(getContactCategoryDisplaySource(hoveredContact))
																				: (getContactCategoryDisplaySource(hoveredContact) || '—')}
												</span>
											</div>
										</div>
										{((hoveredContact.firstName && hoveredContact.firstName.length > 0) ||
											(hoveredContact.lastName && hoveredContact.lastName.length > 0) ||
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
						) : null;

						const mapTopOutlineBox = isMapView ? (
							<div
								className="fixed left-0 right-0 flex justify-center pointer-events-none"
								style={{
									top: `${MAP_VIEW_SEARCH_BAR_TOP_PX}px`,
									zIndex: 115,
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
												{ key: 'playbook', Icon: DashboardActionBarPlaybookIcon, label: 'Playbook', width: 22, height: 18 },
												{ key: 'folder', Icon: DashboardActionBarFolderIcon, label: 'Folder', width: 22, height: 13 },
											] as const
										).map(({ key, Icon, label, width, height }) => {
											const isSelected = selectedActionBarIcon === key;
											return (
												<button
													key={key}
													type="button"
													aria-label={label}
													aria-pressed={isSelected}
													onClick={() => setSelectedActionBarIcon(key)}
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
														opacity: isSelected ? 1 : 0.3,
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
												{ key: 'star', Icon: DashboardActionBarStarIcon, label: 'Opportunities', width: 21, height: 20 },
												{ key: 'envelope', Icon: DashboardActionBarEnvelopeIcon, label: 'Messages', width: 22, height: 13 },
											] as const
										).map(({ key, Icon, label, width, height }) => {
											const isSelected = selectedActionBarIcon === key;
											return (
												<button
													key={key}
													type="button"
													aria-label={label}
													aria-pressed={isSelected}
													onClick={() => setSelectedActionBarIcon(key)}
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
														opacity: isSelected ? 1 : 0.3,
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

						const searchBar = isMapView ? (
							<div
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
									}}
								>
									{searchBarBase}
								</div>
							</div>
						) : (
							searchBarBase
						);

						const mapSelectGrabberTool =
							isMapView && !isMobile ? (
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

						const mapCampaignId =
							fromCampaignIdParam || (activeCampaignId != null ? String(activeCampaignId) : '');
						const mapCampaignName =
							fromCampaign?.name || activeCampaign?.name || 'Campaign';

						const campaignMapTopTabs =
							isMapView ? (
								<div
									data-slot="campaign-map-top-tabs"
									className="fixed left-0 right-0 z-[9999] flex items-center justify-center pointer-events-none"
									style={{
										top: '12px',
										height: '24px',
									}}
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
												onClick={() => {
													if (!mapCampaignId) return;
													router.push(
														`${urls.murmur.campaign.detail(mapCampaignId)}?origin=search&tab=testing`
													);
												}}
											>
												Write
											</button>
											<button
												type="button"
												aria-label={`Open ${mapCampaignName}`}
												title={mapCampaignName}
												className="bg-transparent p-0 m-0 border-0 cursor-pointer inline-flex min-w-0 items-center justify-center gap-[7px] h-full"
												style={{
													color: '#000',
													fontFamily: 'Inter, sans-serif',
													fontSize: '20.719px',
													fontStyle: 'normal',
													fontWeight: 500,
													lineHeight: '17.063px',
												}}
												onClick={() => {
													if (!mapCampaignId) return;
													router.push(
														`${urls.murmur.campaign.detail(mapCampaignId)}?origin=search&tab=overview`
													);
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
												<span className="min-w-0 truncate">
													{mapCampaignName}
												</span>
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
												onClick={() => {
													if (!mapCampaignId) return;
													router.push(
														`${urls.murmur.campaign.detail(mapCampaignId)}?origin=search&tab=drafting`
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
									{mapSelectGrabberTool}
									{searchThisAreaCta}
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
																		: (contacts || [])
																}
																selectedContacts={selectedContacts}
																externallyHoveredContactId={hoveredMapPanelContactId}
																searchQuery={activeSearchQuery}
																searchWhat={
																	// Use Wine, Beer, and Spirits color for fromHome placeholder dots
																	fromHomeParam && (!isSignedIn || !hasSearched)
																		? FROM_HOME_WHAT
																		: searchedWhat
																}
																selectAllInViewNonce={selectAllInViewNonce}
																onVisibleOverlayContactsChange={(overlayContacts) => {
																	setMapPanelVisibleOverlayContacts(overlayContacts);

																	// Cache overlay-only contacts so if the user selects one, it can remain
																	// renderable in the side panel even after panning away.
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
																}}
																activeTool={activeMapTool}
																requestedZoom={mapZoomControlRequest}
																selectedAreaBounds={selectedAreaBoundsForMap}
																onViewportInteraction={handleMapViewportInteraction}
																onViewportZoom={handleMapViewportZoom}
																onViewportIdle={handleMapViewportIdle}
																	onAreaSelect={(bounds, payload) => {
																		const ids = payload?.contactIds ?? [];
																		const extraContacts = payload?.extraContacts ?? [];

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
																				const byId = new Map<number, ContactWithName>();
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
																		  fromHomeParam && (!isSignedIn || !hasSearched)
																			? 'CA'
																			: searchedStateAbbrForMap
																}
																skipAutoFit={
																	// Prevent zoom for fromHome placeholder - keep map zoomed out over US
																	(fromHomeParam && (!isSignedIn || !hasSearched)) || Boolean(mapBboxFilter)
																}
																onStateSelect={handleMapStateSelect}
																isLoading={isSearchPending || isLoadingContacts || isRefetchingContacts}
																onMarkerClick={(contact) => {
																	// Ensure map-only overlay markers (e.g. Booking extra pins) can show up as
																	// rows in the right-hand panel when selected/clicked.
																	const isInBaseResults = baseContactIdSet.has(contact.id);
																	if (!isInBaseResults) {
																		setMapPanelExtraContacts((prev) =>
																			prev.some((c) => c.id === contact.id)
																				? prev
																				: [contact, ...prev]
																		);
																		setMapPanelExtraContactIds((prev) =>
																			prev.includes(contact.id) ? prev : [...prev, contact.id]
																		);
																		return;
																	}

																	// If the marker is outside the searched state, include it in the
																	// right-hand map panel list (without changing what the map shows).
																	if (!searchedStateAbbrForMap) return;
																	const contactStateAbbr = getStateAbbreviation(contact.state || '')
																		.trim()
																		.toUpperCase();
																	if (contactStateAbbr === searchedStateAbbrForMap) return;
																	setMapPanelExtraContactIds((prev) =>
																		prev.includes(contact.id) ? prev : [...prev, contact.id]
																	);
																}}
																onToggleSelection={(contactId) => {
																	const wasSelected = selectedContacts.includes(contactId);

																	// Ensure the selected contact stays renderable in the side panel across
																	// subsequent searches by caching the full object.
																	if (!wasSelected) {
																		const fromBase = (contacts || []).find((c) => c.id === contactId);
																		const fromOverlay = mapPanelVisibleOverlayContacts.find(
																			(c) => c.id === contactId
																		);
																		const fromExtra = mapPanelExtraContacts.find(
																			(c) => c.id === contactId
																		);
																		const selectedContact = fromBase ?? fromOverlay ?? fromExtra;
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
																			return prev.filter((id) => id !== contactId);
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
																			setTimeout(() => tryScroll(attempt + 1), 50);
																		}
																	};
																	setTimeout(() => tryScroll(0), 0);
																}}
															/>
															)}
															{hasNoSearchResults && !isError && (
																<div className="absolute inset-0 z-[120] flex items-start justify-center pt-[120px] pointer-events-none">
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
																					Try a new search term to find contacts in this area
																				</span>
																			</div>
																		</div>
																	</div>
																</div>
															)}
															{/* Search Failed overlay - shown when there's an error */}
															{isError && (
																<div className="absolute inset-0 z-[120] flex items-start justify-center pt-[180px] pointer-events-none">
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
																					{error instanceof Error && error.message.includes('timeout')
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
																				onClick={() => form.handleSubmit(onSubmit)()}
																			>
																				<span className="font-secondary font-bold text-[18px] leading-none text-black">
																					Retry Search
																				</span>
																			</div>
																		</div>
																	</div>
																</div>
															)}
															{/* Search Results overlay box on the right side - keep mounted during loading
															    so the UI doesn't disappear between state searches. */}
															{!isNarrowestDesktop && !hasNoSearchResults && (
																	<div
																		className="absolute right-[10px] flex flex-col gap-[9px] pointer-events-auto"
																		onMouseEnter={() => {
																			if (!shouldUseDynamicMapCreateCampaignCta) return;
																			setIsPointerInMapSidePanel(true);
																		}}
																		onMouseLeave={() => {
																			if (!shouldUseDynamicMapCreateCampaignCta) return;
																			setIsPointerInMapSidePanel(false);
																		}}
																		style={{
																			top: MAP_VIEW_SIDE_PANEL_TOP_CSS,
																			width: '433px',
																			height: mapResearchPanelContact && mapResearchPanelCompactHeightPx
																				? mapResearchPanelCompactHeightPx
																				: 800,
																			maxHeight: `calc(100% - ${MAP_VIEW_SIDE_PANEL_TOP_CSS} - ${MAP_VIEW_SIDE_PANEL_BOTTOM_GAP_PX}px)`,
																			overflow: 'hidden',
																			transform: `scale(${MAP_VIEW_PANEL_SCALE})`,
																			transformOrigin: 'top right',
																		}}
																	>
																		{/* Selection sub-panel — appears once at least one contact is selected. */}
																		{selectedContacts.length > 0 && (
																			<div
																				className="flex flex-col flex-shrink-0"
																				style={{
																					maxHeight: '342px',
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
																						{selectedContacts.length}/{mapPanelContacts.length} selected
																					</span>
																					<button
																						type="button"
																						onClick={() => handleSelectAll(mapPanelContacts)}
																						disabled={isMapResultsLoading}
																						className={`font-secondary text-[12px] font-medium text-black absolute right-[10px] top-1/2 translate-y-[4px] ${
																							isMapResultsLoading
																								? 'opacity-60 pointer-events-none'
																								: 'hover:underline'
																						}`}
																					>
																						{isAllPanelContactsSelected ? 'Deselect All' : 'Select all'}
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
																						{mapPanelSelectedContacts.map(renderMapPanelDesktopRow)}
																					</div>
																				</CustomScrollbar>
																			</div>
																		)}
																		{/* Search Results sub-panel — always present; flexes to fill remaining height. */}
																		<div
																			className="flex flex-col flex-1 min-h-0"
																			style={{
																				backgroundColor:
																					mapResearchPanelContact && isMapResearchPanelVisible
																						? '#D8E5FB'
																						: 'rgba(99, 155, 244, 0.5)',
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
																						maskImage: 'linear-gradient(to right, black 0, black calc(100% - 40px), transparent 100%)',
																						WebkitMaskImage: 'linear-gradient(to right, black 0, black calc(100% - 40px), transparent 100%)',
																					}}
																				>
																					{[
																						{ key: 'restaurants', pillColor: '#C3FBD1', label: 'Restaurants', Icon: RestaurantsIcon, iconSize: 11 },
																						{ key: 'coffee-shops', pillColor: '#D6F1BD', label: 'Coffee', Icon: CoffeeShopsIcon, iconSize: 6 },
																						{ key: 'music-venues', pillColor: '#B7E5FF', label: 'Music Venues', Icon: MusicVenuesIcon, iconSize: 11 },
																						{ key: 'festivals', pillColor: '#C1D6FF', label: 'Festivals', Icon: FestivalsIcon, iconSize: 11 },
																						{ key: 'wedding-planners', pillColor: '#FFF8DC', label: 'Weddings', Icon: WeddingPlannersIcon, iconSize: 11 },
																						{ key: 'wine-beer-spirits', pillColor: '#BFC4FF', label: 'Wineries', Icon: WineBeerSpiritsIcon, iconSize: 11 },
																						{ key: 'radio-stations', pillColor: '#C5F0CC', label: 'Radio', Icon: RadioStationsIcon, iconSize: 11 },
																					].filter(({ key }) => mapPanelVisibleCategoryKeys.has(key)).map(({ key, pillColor, label, Icon, iconSize }) => (
																						<div
																							key={key}
																							className="h-[15px] rounded-[7px] px-2 flex items-center gap-1 border border-black flex-shrink-0 cursor-pointer"
																							style={{ backgroundColor: pillColor }}
																							onClick={() => {
																								setSelectedCategoryChips((prev) => {
																									const next = new Set(prev);
																									if (next.has(key)) next.delete(key);
																									else next.add(key);
																									return next;
																								});
																							}}
																						>
																							<Icon size={iconSize} className="flex-shrink-0" />
																							<span className="text-[10px] text-black leading-none whitespace-nowrap">{label}</span>
																						</div>
																					))}
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
																					contentClassName="p-[6px] pb-[78px] space-y-[7px]"
																					thumbWidth={2}
																					thumbColor="#000000"
																					trackColor="transparent"
																					offsetRight={-6}
																					disableOverflowClass
																				>
																					{isMapResultsLoading ? (
																						<MapResultsPanelSkeleton
																							variant="desktop"
																							rows={Math.max(mapPanelUnselectedContacts.length, 14)}
																						/>
																					) : (
																						<div ref={mapPanelRowsDesktopRef} className="space-y-[7px]">
																							{mapPanelUnselectedContactsFiltered.map(renderMapPanelDesktopRow)}
																						</div>
																					)}
																				</CustomScrollbar>
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
																						{ key: 'music-venues', color: '#71C9FD', Icon: MusicVenuesIcon, size: 32 },
																						{ key: 'wine-beer-spirits', color: '#80AAFF', Icon: WineBeerSpiritsIcon, size: 25 },
																						{ key: 'restaurants', color: '#77DD91', Icon: RestaurantsIcon, size: 32 },
																						{ key: 'coffee-shops', color: '#A9DE78', Icon: CoffeeShopsIcon, size: 18 },
																						{ key: 'wedding-planners', color: '#EED56E', Icon: WeddingPlannersIcon, size: 30 },
																						{ key: 'festivals', color: '#80AAFF', Icon: FestivalsIcon, size: 32 },
																						{ key: 'radio-stations', color: '#56DA73', Icon: RadioStationsIcon, size: 32 },
																					].filter(({ key }) => mapPanelCategoryKeys.has(key)).map(({ key, color, Icon, size }) => {
																						const isSelected = selectedCategoryChips.has(key);
																						return (
																							<div
																								key={key}
																								className="flex items-center justify-center flex-shrink-0 cursor-pointer"
																								style={{
																									width: 45,
																									height: 45,
																									backgroundColor: isSelected ? 'transparent' : color,
																									borderRadius: 6,
																									border: isSelected ? `2px solid ${color}` : '1px solid #000',
																								}}
																								onClick={() => {
																									setSelectedCategoryChips((prev) => {
																										const next = new Set(prev);
																										if (next.has(key)) next.delete(key);
																										else next.add(key);
																										return next;
																									});
																								}}
																							>
																								<Icon size={size} innerFill={isSelected ? color : 'white'} />
																							</div>
																						);
																					})}
																				</div>
																			</div>
																		</div>
																		{!isMapResultsLoading && !fromHomeParam && (
																			<div className="flex-shrink-0 w-full px-[10px]">
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
																						style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}
																					>
																						Add Contacts
																					</span>
																				</Button>
																			</div>
																		)}
																		{mapResearchPanelContact && (
																			<div
																				className="absolute inset-0 z-50"
																				style={{
																					backgroundColor: '#D8E5FB',
																					opacity: isMapResearchPanelVisible ? 1 : 0,
																					transition: `opacity ${MAP_RESEARCH_PANEL_FADE_MS}ms ease-out`,
																					pointerEvents: isMapResearchPanelVisible ? 'auto' : 'none',
																				}}
																			>
																				<ContactResearchPanel
																					contact={mapResearchPanelContact}
																					className="!block !border-0 !bg-transparent !rounded-none"
																					style={{ width: '100%', height: '100%' }}
																					boxWidth={405}
																					height={mapResearchPanelCompactHeightPx ?? undefined}
																					fixedHeightBoxSpacingPx={
																						MAP_RESEARCH_PANEL_FIXED_HEIGHT_BULLET_SPACING_PX
																					}
																					fixedHeightBulletOuterHeightPx={
																						MAP_RESEARCH_PANEL_FIXED_HEIGHT_BULLET_OUTER_HEIGHT_PX
																					}
																					fixedHeightBulletInnerHeightPx={
																						MAP_RESEARCH_PANEL_FIXED_HEIGHT_BULLET_INNER_HEIGHT_PX
																					}
																					expandSummaryToFillHeight
																				/>
																			</div>
																		)}
																	</div>
																)}
																{!isMobile && !isNarrowestDesktop && !hasNoSearchResults && (
																	<div
																		className="absolute left-1/2 pointer-events-none"
																		onMouseEnter={
																			cancelMapBottomSearchFollowupPreviewClear
																		}
																		onMouseLeave={
																			scheduleMapBottomSearchFollowupPreviewClear
																		}
																		style={{
																			bottom: `${MAP_RESULTS_BOTTOM_SEARCH_BOX.bottomOffset}px`,
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
																			activeCategoryField={activeMapBottomCategoryField}
																			onActivate={handleMapBottomSearchActivate}
																			onSubmit={handleMapBottomSearchSubmit}
																			onValueChange={setMapBottomSearchValue}
																			onActiveChange={setIsMapBottomSearchActive}
																			onCategoryFieldFocus={handleMapBottomCategoryFieldFocus}
																			onCategoryWhatChange={handleMapBottomCategoryWhatChange}
																			onCategoryWhereChange={handleMapBottomCategoryWhereChange}
																			onCategoryWhatEnter={handleMapBottomCategoryWhatEnter}
																			onCategorySubmit={handleMapBottomCategorySubmit}
																			onForYouSubmit={handleMapBottomForYouSubmit}
																		/>
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
																		/>
																	</div>
																)}
															{/* Single column search results panel overlay at bottom - narrowest breakpoint (< 952px) */}
															{/* Keep mounted during loading so UI doesn't disappear between state searches. */}
															{isNarrowestDesktop && !hasNoSearchResults && (
																	<div
																		className="absolute left-[10px] right-[10px] bottom-[10px] shadow-lg flex flex-col"
																		style={{
																			height: '45%',
																			maxHeight: 'calc(100% - 20px)',
																			backgroundColor: '#AFD6EF',
																			border: '3px solid #143883',
																			overflow: 'hidden',
																			transform: `scale(${MAP_VIEW_PANEL_SCALE})`,
																			transformOrigin: 'bottom center',
																		}}
																	>
																		{/* Header area */}
																		<div className="w-full h-[42px] flex-shrink-0 bg-[#AFD6EF] flex items-center justify-center px-4 relative">
																	{/* Map label button in top-left of panel header */}
																	<button
																		type="button"
																		onClick={() => setIsMapView(false)}
																		className="absolute left-[10px] top-[7px] flex items-center justify-center cursor-pointer"
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
																		onClick={() => handleSelectAll(mapPanelContacts)}
																		disabled={isMapResultsLoading}
																		className={`font-secondary text-[12px] font-medium text-black absolute right-[10px] top-1/2 -translate-y-1/2 ${
																			isMapResultsLoading
																				? 'opacity-60 pointer-events-none'
																				: 'hover:underline'
																		}`}
																	>
																		{isAllPanelContactsSelected ? 'Deselect All' : 'Select all'}
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
																	{isMapResultsLoading ? (
																		<MapResultsPanelSkeleton
																			variant="narrow"
																			rows={Math.max(mapPanelContacts.length, 8)}
																		/>
																	) : (
																		<div ref={mapPanelRowsNarrowRef} className="space-y-[7px]">
																		{mapPanelContacts.map((contact) => {
																		const isSelected = selectedContacts.includes(
																			contact.id
																		);
																		const isHovered = hoveredMapPanelContactId === contact.id;
																		const isInBaseResults = baseContactIdSet.has(contact.id);
																		const firstName = contact.firstName || '';
																		const lastName = contact.lastName || '';
																		const fullName =
																			contact.name ||
																			`${firstName} ${lastName}`.trim();
																		const company = contact.company || '';
																		// For restaurant searches, always use the search-derived headline
																		// Otherwise, use contact's headline or fall back to search What + Where
																		const searchDerivedHeadline =
																			whatValue && whereValue
																				? `${whatValue} ${whereValue}`
																				: whatValue || '';
																		const isRestaurantSearch = /^restaurants?$/i.test(whatValue.trim());
																		const curatedDisplayHeadline =
																			contact.curatedDisplayLabel || '';
																		// Curated search owns category display explicitly. Do not let
																		// freeform headlines replace clean SVG/color chips.
																		const contactHeadline =
																			curatedDisplayHeadline ||
																			(isInBaseResults
																				? contact.headline || contact.title || ''
																				: contact.title || contact.headline || '');
																		const computedHeadline = isInBaseResults
																			? isRestaurantSearch
																				? searchDerivedHeadline
																				: contactHeadline || searchDerivedHeadline
																			: contactHeadline;
																		const stickyHeadline =
																			selectedContactStickyHeadlineById[contact.id] || '';
																		const headline =
																			isSelected && stickyHeadline ? stickyHeadline : computedHeadline;
																		const isRestaurantsSearchForContact = isRestaurantsSearch && isInBaseResults;
																		const isCoffeeShopsSearchForContact = isCoffeeShopsSearch && isInBaseResults;
																		const isMusicVenuesSearchForContact = isMusicVenuesSearch && isInBaseResults;
																		const isMusicFestivalsSearchForContact = isMusicFestivalsSearch && isInBaseResults;
																		const isWeddingPlannersSearchForContact = isWeddingPlannersSearch && isInBaseResults;
																		const stateAbbr =
																			getStateAbbreviation(contact.state || '') || '';
																		const city = contact.city || '';

																		return (
																			<div
																				key={contact.id}
																				data-contact-id={contact.id}
																				className="cursor-pointer transition-colors flex w-full h-[49px] overflow-hidden rounded-[8px] border-[3px] border-[#ABABAB] select-none relative"
																				style={{
																					// Hover should be a subtle darken, not "selected" blue.
																					// Category-specific selection colors.
																					backgroundColor: isSelected
																						? (isRestaurantsSearchForContact || isRestaurantTitle(headline))
																							? isHovered ? '#C5F5D1' : '#D7FFE1'
																							: (isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline))
																								? isHovered ? '#DDF4CC' : '#EDFEDC'
																								: (isMusicVenuesSearchForContact || isMusicVenueTitle(headline))
																									? isHovered ? '#C5E8FF' : '#D7F0FF'
																									: (isMusicFestivalsSearchForContact || isMusicFestivalTitle(headline))
																										? isHovered ? '#ADD4FF' : '#BFDCFF'
																										: (isWeddingPlannersSearchForContact || isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
																											? isHovered ? '#F5EDCE' : '#FFF8DC'
																											: isWineBeerSpiritsTitle(headline)
																												? isHovered ? '#C8CBFF' : '#DADDFF'
																												: isHovered ? '#BFE3FF' : '#C9EAFF'
																						: isHovered
																							? '#F3F4F6'
																							: '#FFFFFF',
																				}}
																				onClick={() => {
																					if (isSelected) {
																						setSelectedContacts(
																							selectedContacts.filter(
																								(id) => id !== contact.id
																							)
																						);
																					} else {
																						setSelectedContacts([
																							...selectedContacts,
																							contact.id,
																						]);
																					}
																				}}
																				onMouseEnter={() => setHoveredMapPanelContactId(contact.id)}
																				onMouseLeave={() =>
																					setHoveredMapPanelContactId((prev) =>
																						prev === contact.id ? null : prev
																					)
																				}
																			>
																				{/* Left side - Name/Company and Location */}
																				<div className="flex-1 min-w-0 flex flex-col justify-center pl-3 pr-2">
																					{fullName ? (
																						<>
																							<div className="flex items-center">
																								<div className="font-bold text-[11px] truncate leading-tight">
																									{fullName}
																								</div>
																							</div>
																							<div className="flex items-center mt-[2px]">
																								<div className="text-[11px] text-black truncate leading-tight">
																									{company}
																								</div>
																							</div>
																						</>
																					) : (
																						<div className="flex items-center">
																							<div className="font-bold text-[11px] truncate leading-tight">
																								{company || '—'}
																							</div>
																						</div>
																					)}
																				</div>
																				{/* Right side - Title (fixed 230px width) */}
																				<div className="flex-shrink-0 flex flex-col justify-center pr-2" style={{ width: '240px' }}>
																					{headline ? (
																						<div
																							className="overflow-hidden flex items-center px-2 gap-1"
																							style={{
																								width: '230px',
																								height: '19px',
																								backgroundColor: (isRestaurantsSearchForContact || isRestaurantTitle(headline))
																									? '#C3FBD1'
																									: (isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline))
																										? '#D6F1BD'
																										: (isMusicVenuesSearchForContact || isMusicVenueTitle(headline))
																											? '#B7E5FF'
																											: (isMusicFestivalsSearchForContact || isMusicFestivalTitle(headline))
																												? '#C1D6FF'
																												: (isWeddingPlannersSearchForContact || isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline))
																													? '#FFF8DC'
																													: isWineBeerSpiritsTitle(headline)
																														? '#BFC4FF'
																														: '#E8EFFF',
																								border: '0.7px solid #000000',
																								borderRadius: '8px',
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
																							{(isMusicFestivalsSearchForContact || isMusicFestivalTitle(headline)) && (
																								<FestivalsIcon size={12} className="flex-shrink-0" />
																							)}
																							{(isWeddingPlannersSearchForContact || isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) && (
																								<WeddingPlannersIcon size={12} />
																							)}
																							{isWineBeerSpiritsTitle(headline) && (
																								<WineBeerSpiritsIcon size={12} className="flex-shrink-0" />
																							)}
																							<span className="text-[14px] text-black leading-none truncate">
																								{(isRestaurantsSearchForContact || isRestaurantTitle(headline))
																									? 'Restaurant'
																									: (isCoffeeShopsSearchForContact || isCoffeeShopTitle(headline))
																										? 'Coffee Shop'
																										: (isMusicVenuesSearchForContact || isMusicVenueTitle(headline))
																											? 'Music Venue'
																											: (isMusicFestivalsSearchForContact || isMusicFestivalTitle(headline))
																												? 'Music Festival'
																												: isWeddingVenueTitle(headline)
																													? 'Wedding Venue'
																													: (isWeddingPlannersSearchForContact || isWeddingPlannerTitle(headline))
																														? 'Wedding Planner'
																														: isWineBeerSpiritsTitle(headline)
																															? getWineBeerSpiritsLabel(headline)
																															: headline}
																							</span>
																						</div>
																					) : null}
																					{(city || stateAbbr) && (
																						<div className="flex items-center gap-1 mt-[4px]">
																							{stateAbbr && (
																								<span
																									className="inline-flex items-center justify-center w-[35px] h-[19px] rounded-[5.6px] border text-[12px] leading-none font-bold flex-shrink-0"
																									style={{
																										backgroundColor:
																											stateBadgeColorMap[
																												stateAbbr
																											] || 'transparent',
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
																					)}
																				</div>
																			</div>
																		);
																		})}
																		</div>
																	)}
														</CustomScrollbar>
															{!isMapResultsLoading && !fromHomeParam && (
																	<div className="flex-shrink-0 w-full px-[10px] pb-[10px]">
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
																			<span className="relative z-20" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
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
														onRowHover={
															isMobile ? undefined : (row) => setHoveredContact(row)
														}
														headerAction={
															!isMobile && !fromHomeParam ? (
																<button
																	type="button"
																	onClick={handlePrimaryCta}
																	disabled={selectedContacts.length === 0 || primaryCtaPending}
																	className="font-secondary"
																	style={{
																		width: '127px',
																		height: '31px',
																		background:
																			selectedContacts.length === 0 || primaryCtaPending
																				? 'rgba(93, 171, 104, 0.1)'
																				: '#B8E4BE',
																		border: '2px solid #000000',
																		color:
																			selectedContacts.length === 0 || primaryCtaPending
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
																			selectedContacts.length === 0 || primaryCtaPending
																				? 'default'
																				: 'pointer',
																		opacity: selectedContacts.length === 0 || primaryCtaPending ? 0.6 : 1,
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
																{isAllPanelContactsSelected ? 'Deselect All' : 'Select all'}
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
														<span className="relative z-20" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
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
															disabled={selectedContacts.length === 0 || primaryCtaPending}
														>
															<span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
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
						<div className="mt-[18px] mb-[18px] w-full flex flex-col items-center">
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
						<div
							className="fixed inset-0 z-[10000] flex items-center justify-center"
						>
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
						<div
							className="fixed inset-0 z-[10000] flex items-center justify-center"
						>
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
									<p className="text-sm text-black">
										-Wayne Gretzky
									</p>
								</div>
							</div>
						</div>,
						document.body
					)}
			</div>
				</AppLayout>
			</div>

		</>
	);
};

const Dashboard = () => {
	return (
		<Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
			<DashboardContent />
		</Suspense>
	);
};

export default Dashboard;
