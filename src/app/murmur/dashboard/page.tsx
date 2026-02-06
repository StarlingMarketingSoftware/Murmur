'use client';

import {
	FC,
	Suspense,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { gsap } from 'gsap';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createPortal, flushSync } from 'react-dom';
import { CampaignsTable } from '../../../components/organisms/_tables/CampaignsTable/CampaignsTable';
import { useDashboard } from './useDashboard';
import { urls } from '@/constants/urls';
import { isProblematicBrowser } from '@/utils/browserDetection';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import MurmurLogoNew from '@/components/atoms/_svg/MurmurLogoNew';
import CampaignsDropdownIcon from '@/components/atoms/_svg/CampaignsDropdownIcon';
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
import HomeIcon from '@/components/atoms/_svg/HomeIcon';
import HomeExpandedIcon from '@/components/atoms/_svg/HomeExpandedIcon';
import BottomArrowIcon from '@/components/atoms/_svg/BottomArrowIcon';
import GrabIcon from '@/components/atoms/svg/GrabIcon';
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
import { useGetLocations, useBatchUpdateContacts } from '@/hooks/queryHooks/useContacts';
import { useMe } from '@/hooks/useMe';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import SearchResultsMap, {
	DASHBOARD_TO_INTERACTIVE_TRANSITION_CSS_EASING,
	DASHBOARD_TO_INTERACTIVE_TRANSITION_MS,
} from '@/components/molecules/SearchResultsMap/SearchResultsMap';
import { ContactWithName } from '@/types/contact';
import { MapResultsPanelSkeleton } from '@/components/molecules/MapResultsPanelSkeleton/MapResultsPanelSkeleton';
import { buildAllUsStateNames, getNearestUsStateNames, normalizeUsStateName } from '@/utils/usStates';
import {
	ContactResearchPanel,
	ContactResearchHorizontalStrip,
} from '@/components/molecules/ContactResearchPanel/ContactResearchPanel';
import { CampaignsInboxView } from '@/components/molecules/CampaignsInboxView/CampaignsInboxView';
import InboxSection from '@/components/molecules/InboxSection/InboxSection';
import { InboundEmailNotificationList } from '@/components/molecules/InboundEmailNotificationList/InboundEmailNotificationList';
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
	// "From Home" mode: triggered from landing page search button, shows a pre-configured search
	// with sign-up modal for unauthenticated users.
	const fromHomeParam = searchParams.get('fromHome') === 'true';
	const FROM_HOME_SEARCH_QUERY = '[Booking] Wine, Beer, and Spirits (California)';
	const FROM_HOME_WHY = '[Booking]';
	const FROM_HOME_WHAT = 'Wine, Beer, and Spirits';
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
	const isTabPreviewingOther = hoveredTab != null && hoveredTab !== activeTab;
	// Dashboard inbox deep-link (`?tab=inbox`) should land on the Campaigns sub-tab.
	const [inboxSubtab, setInboxSubtab] = useState<'messages' | 'campaigns'>('campaigns');
	const [dashboardLandingPanel, setDashboardLandingPanel] = useState<
		'new' | 'campaigns' | 'responses'
	>('new');

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

	// Detect narrow desktop breakpoint
	useEffect(() => {
		if (typeof window === 'undefined') return;

		const handleResize = () => {
			const width = window.innerWidth;
			setIsBelowMd(width < 768);
			setIsNarrowestDesktop(width < 952);
			setIsXlDesktop(width >= 1280);
		};

		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const debouncedWhereValue = useDebounce(whereValue, 300);
	const { data: locationResults, isLoading: isLoadingLocations } = useGetLocations(
		debouncedWhereValue,
		'state'
	);

	// Helper to trigger search with a specific "where" value (called when clicking state from dropdown)
	const triggerSearchWithWhere = (
		newWhereValue: string,
		isNearMe = false,
		base?: { why?: string; what?: string }
	) => {
		const baseWhy = base?.why ?? whyValue;
		const baseWhat = base?.what ?? whatValue;

		// Update the state values
		if (base?.why !== undefined && base.why !== whyValue) setWhyValue(base.why);
		if (base?.what !== undefined && base.what !== whatValue) setWhatValue(base.what);
		setWhereValue(newWhereValue);
		setIsNearMeLocation(isNearMe);
		setActiveSection(null);

		// Build the combined search query with the new where value
		const formattedWhere = newWhereValue.trim() ? `(${newWhereValue.trim()})` : '';
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

		// Build the combined search query
		const formattedWhere = whereValue.trim() ? `(${whereValue.trim()})` : '';
		const combinedSearch = [whyValue, whatValue, formattedWhere].filter(Boolean).join(' ').trim();

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

		const dropdownHeight =
			activeSection === 'why'
				? 173
				: activeSection === 'what'
					? whyValue === '[Promotion]'
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

		// Map-view UX: if the user already has an exact state selected, show that state first,
		// then the 4 nearest states (by centroid distance), then continue with the full 50-state list.
		const canonicalWhereState = normalizeUsStateName(whereValue);
		const shouldSuggestNearbyStates =
			activeSection === 'where' &&
			isMapView &&
			!!canonicalWhereState &&
			!!locationResults &&
			locationResults.length === 1 &&
			normalizeUsStateName(locationResults[0]?.label) === canonicalWhereState;

		const whereSuggestedStateNames =
			shouldSuggestNearbyStates && canonicalWhereState
				? [canonicalWhereState, ...getNearestUsStateNames(canonicalWhereState, 4)]
				: [];

		const whereDropdownStateNames = (() => {
			const preferredStateNames =
				shouldSuggestNearbyStates && canonicalWhereState && locationResults
					? [
							...locationResults.map((loc) => loc?.label || loc?.state),
							...getNearestUsStateNames(canonicalWhereState, 4),
					  ]
					: (locationResults ?? []).map((loc) => loc?.label || loc?.state);

			return buildAllUsStateNames(preferredStateNames);
		})();

		const whereDropdownLocations = whereDropdownStateNames.map((name) => ({
			city: '',
			state: name,
			label: name,
		}));

		const whereSuggestedLocations = whereSuggestedStateNames.map((name) => ({
			city: '',
			state: name,
			label: name,
		}));

		// Full canonical 50-state list (alphabetical) used for the "All states" portion.
		const whereAllStateLocations = buildAllUsStateNames().map((name) => ({
			city: '',
			state: name,
			label: name,
		}));

		const dropdownContent = (
			<div
				className="search-dropdown-menu w-[439px] max-w-[calc(100vw-16px)] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[110] relative overflow-hidden"
				style={
					isMapView
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
					{whyValue === '[Promotion]' ? (
						<div className="flex flex-col items-center justify-start gap-[10px] w-full h-full py-[12px]">
							<div
								className="w-[415px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
								onClick={() => {
									setWhatValue('Radio Stations');
									// On the results screen, changing "What" should immediately re-search
									// without auto-advancing the UI to the "Where" (state) step.
									setActiveSection(isMapView ? null : 'where');
								}}
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
									onClick={() => {
										setWhatValue('Wine, Beer, and Spirits');
										// On the results screen, changing "What" should immediately re-search
										// without auto-advancing the UI to the "Where" (state) step.
										setActiveSection(isMapView ? null : 'where');
									}}
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
									onClick={() => {
										setWhatValue('Restaurants');
										// On the results screen, changing "What" should immediately re-search
										// without auto-advancing the UI to the "Where" (state) step.
										setActiveSection(isMapView ? null : 'where');
									}}
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
								<div
									className="w-[415px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setWhatValue('Coffee Shops');
										// On the results screen, changing "What" should immediately re-search
										// without auto-advancing the UI to the "Where" (state) step.
										setActiveSection(isMapView ? null : 'where');
									}}
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
									onClick={() => {
										setWhatValue('Festivals');
										// On the results screen, changing "What" should immediately re-search
										// without auto-advancing the UI to the "Where" (state) step.
										setActiveSection(isMapView ? null : 'where');
									}}
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
									onClick={() => {
										setWhatValue('Wedding Planners');
										// On the results screen, changing "What" should immediately re-search
										// without auto-advancing the UI to the "Where" (state) step.
										setActiveSection(isMapView ? null : 'where');
									}}
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
									onClick={() => {
										setWhatValue('Music Venues');
										// On the results screen, changing "What" should immediately re-search
										// without auto-advancing the UI to the "Where" (state) step.
										setActiveSection(isMapView ? null : 'where');
									}}
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
						{whereValue.length >= 1 ? (
							<CustomScrollbar
								className="w-full h-full"
								contentClassName="flex flex-col items-center justify-start gap-[20px] py-4"
								thumbWidth={2}
								thumbColor="#000000"
								trackColor="transparent"
								offsetRight={-5}
							>
								{isLoadingLocations || debouncedWhereValue !== whereValue ? (
									<div className="flex items-center justify-center h-full">
										<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
									</div>
								) : whereDropdownLocations && whereDropdownLocations.length > 0 ? (
									(
										shouldSuggestNearbyStates && whereSuggestedLocations.length > 0
											? [...whereSuggestedLocations, ...whereAllStateLocations]
											: whereDropdownLocations
									).map((loc, idx) => {
										const { icon, backgroundColor } = getCityIconProps(
											loc.city,
											loc.state
										);
										return (
											<div
												key={`${loc.city}-${loc.state}-${loc.label}-${idx}`}
												className="w-[415px] max-w-[calc(100%-24px)] min-h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 mb-2"
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
									})
								) : (
									<div className="text-black font-medium font-secondary">
										No locations found
									</div>
								)}
							</CustomScrollbar>
						) : (
							<CustomScrollbar
								className="w-full h-full"
								contentClassName="flex flex-col items-center justify-start gap-[20px] py-4"
								thumbWidth={2}
								thumbColor="#000000"
								trackColor="transparent"
								offsetRight={-5}
							>
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

								{DEFAULT_STATE_SUGGESTIONS.map(
									({ label, promotionDescription, generalDescription }) => {
										const { icon, backgroundColor } = getCityIconProps('', label);
										return (
											<div
												key={label}
												className="w-[415px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
												onClick={() => {
													triggerSearchWithWhere(label, false);
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
														{label}
													</div>
													<div className="text-[12px] leading-tight text-black mt-[4px]">
														{isPromotion ? promotionDescription : generalDescription}
													</div>
												</div>
											</div>
										);
									}
								)}

								{(() => {
									const defaultNames = DEFAULT_STATE_SUGGESTIONS.map((s) => s.label);
									const defaultSet = new Set(defaultNames.map((s) => s.toLowerCase()));
									return buildAllUsStateNames(defaultNames)
										.filter((name) => !defaultSet.has(name.toLowerCase()))
										.map((stateName) => {
											const { icon, backgroundColor } = getCityIconProps('', stateName);
											return (
												<div
													key={stateName}
													className="w-[415px] max-w-[calc(100%-24px)] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
													onClick={() => {
														triggerSearchWithWhere(stateName, false);
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
															{stateName}
														</div>
														<div className="text-[12px] leading-tight text-black mt-[4px]">
															Search contacts in {stateName}
														</div>
													</div>
												</div>
											);
										});
								})()}
							</CustomScrollbar>
						)}
					</div>
				</div>
			</div>
		);

		// When in map view, render dropdowns via portal to escape the stacking context
		if (isMapView && typeof window !== 'undefined') {
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
	const whatInputRef = useRef<HTMLInputElement>(null);
	const whereInputRef = useRef<HTMLInputElement>(null);
	const activeSectionIndicatorRef = useRef<HTMLDivElement>(null);
	const prevActiveSectionForIndicatorRef = useRef<'why' | 'what' | 'where' | null>(null);
	// Mini search bar (map view results) indicator refs
	const miniActiveSectionIndicatorRef = useRef<HTMLDivElement>(null);
	const prevMiniActiveSectionRef = useRef<'why' | 'what' | 'where' | null>(null);
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
	} = useDashboard({ derivedTitle: derivedContactTitle, forceApplyDerivedTitle: shouldForceApplyDerivedTitle, fromHome: fromHomeParam });

	// Best-effort: infer the user's US state **without** prompting for geolocation permission.
	// This relies on hosting/proxy geolocation headers (e.g. Vercel). In local dev it returns null.
	const inferredStateNameRef = useRef<string | null>(null);
	const inferStatePromiseRef = useRef<Promise<string | null> | null>(null);
	const inferUserUsStateName = useCallback(async (): Promise<string | null> => {
		// If we've already inferred a state in this session, reuse it.
		if (inferredStateNameRef.current) return inferredStateNameRef.current;

		// Prefer a persisted value from a prior visit/session.
		if (typeof window !== 'undefined') {
			try {
				const stored = window.localStorage.getItem('murmur_inferred_us_state');
				const normalized = normalizeUsStateName(stored);
				if (normalized) {
					inferredStateNameRef.current = normalized;
					return normalized;
				}
			} catch {
				// Ignore storage errors
			}
		}

		// If another call is already in-flight, await it.
		if (inferStatePromiseRef.current) return await inferStatePromiseRef.current;

		const run = (async (): Promise<string | null> => {
			// Attempt 1: internal endpoint (Vercel/proxy geo headers; no browser prompt)
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 650);
				try {
					const res = await fetch('/api/geo/state', {
						method: 'GET',
						cache: 'no-store',
						signal: controller.signal,
					});
					if (res.ok) {
						const json = (await res.json()) as { stateName?: unknown };
						const stateName = typeof json?.stateName === 'string' ? json.stateName.trim() : '';
						const normalized = normalizeUsStateName(stateName);
						if (normalized) return normalized;
					}
				} finally {
					clearTimeout(timeout);
				}
			} catch {
				// ignore and fall through
			}

			// Attempt 2 (fallback): public IP geolocation (still no browser prompt).
			// This works in local dev too, but depends on the 3rd-party service availability.
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 900);
				try {
					const res = await fetch('https://ipapi.co/json/', {
						method: 'GET',
						cache: 'no-store',
						signal: controller.signal,
					});
					if (!res.ok) return null;
					const json = (await res.json()) as {
						country_code?: unknown;
						region?: unknown;
						region_code?: unknown;
					};

					const country = typeof json.country_code === 'string' ? json.country_code.trim().toUpperCase() : '';
					if (country && country !== 'US') return null;

					const regionCode =
						typeof json.region_code === 'string' ? json.region_code.trim().toUpperCase() : '';
					const regionName = typeof json.region === 'string' ? json.region.trim() : '';

					return normalizeUsStateName(regionCode) ?? normalizeUsStateName(regionName);
				} finally {
					clearTimeout(timeout);
				}
			} catch {
				return null;
			}
		})();

		inferStatePromiseRef.current = run;
		const result = await run;
		inferStatePromiseRef.current = null;

		inferredStateNameRef.current = result;
		if (result && typeof window !== 'undefined') {
			try {
				window.localStorage.setItem('murmur_inferred_us_state', result);
			} catch {
				// Ignore storage errors
			}
		}

		return result;
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

		// If BOTH Why + What are empty, set a default "starter" search.
		if (!nextWhy && !nextWhat) {
			nextWhy = '[Booking]';
			nextWhat = 'Wine, Beer, and Spirits';
			setWhyValue(nextWhy);
			setWhatValue(nextWhat);
		}

		// If Where is empty, try to infer the user's state (no permission prompt).
		if (!nextWhere) {
			const inferredWhere = await inferUserUsStateName();
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
	}, [form, hasSearched, inferUserUsStateName, whatValue, whereValue, whyValue]);

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

	// Mapbox GL doesn't reliably size/position its WebGL canvas under CSS zoom/transform scaling.
	// While in fullscreen map view, force 1x scaling so the map always fills the stroked container.
	useLayoutEffect(() => {
		// Avoid running until we know whether this is a real mobile device.
		if (isMobile === null) return;

		// Never shrink the mobile map UI (it's already heavily tuned).
		if (isMobile) {
			document.documentElement.classList.remove(DASHBOARD_MAP_COMPACT_CLASS);
			document.documentElement.style.removeProperty(DASHBOARD_ZOOM_VAR);
			return;
		}

		if (isMapView) {
			document.documentElement.classList.add(DASHBOARD_MAP_COMPACT_CLASS);
			// Force 1x scaling to avoid Mapbox canvas layout drift (especially in browsers that
			// fall back to transform-based scaling when CSS `zoom` is unsupported).
			document.documentElement.style.setProperty(DASHBOARD_ZOOM_VAR, '1');
		} else {
			document.documentElement.classList.remove(DASHBOARD_MAP_COMPACT_CLASS);
			document.documentElement.style.removeProperty(DASHBOARD_ZOOM_VAR);
		}

		return () => {
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
		if (!dashboardSearchParam) return;
		// Don't auto-trigger auth flows; only run if already signed in.
		if (!isSignedIn) return;

		// If we already have results, don't re-run the hydration search.
		if (hasSearched && activeSearchQuery.trim().length > 0) {
			hasHydratedDashboardUrlRef.current = true;
			return;
		}

		hasHydratedDashboardUrlRef.current = true;

		// Keep the segmented UI in sync with the restored query (best-effort).
		const inferredWhy = extractWhyFromSearchQuery(dashboardSearchParam) || '';
		const inferredWhat = extractWhatFromSearchQuery(dashboardSearchParam) || '';
		const inferredWhere = extractWhereFromSearchQuery(dashboardSearchParam) || '';
		if (inferredWhy) setWhyValue(inferredWhy);
		if (inferredWhat) setWhatValue(inferredWhat);
		if (inferredWhere) {
			setWhereValue(inferredWhere);
			setIsNearMeLocation(false);
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
		dashboardSearchParam,
		dashboardViewParam,
		form,
		hasSearched,
		isAddToCampaignMode,
		isSignedIn,
		onSubmit,
		setIsMapView,
	]);

	// If we refreshed while in the "from campaign" map view, restore the map results view by
	// re-running the last executed search stored in the URL. This is gated to `fromCampaignId`
	// so the main dashboard flow is unchanged.
	const hasHydratedFromCampaignUrlRef = useRef(false);
	useEffect(() => {
		if (!isAddToCampaignMode) return;
		if (hasHydratedFromCampaignUrlRef.current) return;
		if (!fromCampaignSearchParam) return;
		// Don't auto-trigger auth flows; only run if already signed in.
		if (!isSignedIn) return;

		// If we already have results, don't re-run the hydration search.
		if (hasSearched && activeSearchQuery.trim().length > 0) {
			hasHydratedFromCampaignUrlRef.current = true;
			return;
		}

		hasHydratedFromCampaignUrlRef.current = true;

		// Keep the segmented UI in sync with the restored query (best-effort).
		const inferredWhy = extractWhyFromSearchQuery(fromCampaignSearchParam) || '';
		const inferredWhat = extractWhatFromSearchQuery(fromCampaignSearchParam) || '';
		const inferredWhere = extractWhereFromSearchQuery(fromCampaignSearchParam) || '';
		if (inferredWhy) setWhyValue(inferredWhy);
		if (inferredWhat) setWhatValue(inferredWhat);
		if (inferredWhere) {
			setWhereValue(inferredWhere);
			setIsNearMeLocation(false);
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
		form,
		fromCampaignSearchParam,
		fromCampaignViewParam,
		hasSearched,
		isAddToCampaignMode,
		isSignedIn,
		onSubmit,
		setIsMapView,
	]);

	// Mirror the current results view + search query into the URL so browser refresh keeps you
	// in the same place (normal dashboard flow).
	useEffect(() => {
		if (isAddToCampaignMode) return;
		if (!hasSearched) return;
		if (!activeSearchQuery || activeSearchQuery.trim().length === 0) return;

		const desiredView = isMapView ? 'map' : 'table';
		const currentView = dashboardViewParam;
		const currentSearch = dashboardSearchParam;

		if (currentView === desiredView && currentSearch === activeSearchQuery) return;

		const params = new URLSearchParams(searchParams.toString());
		params.set('view', desiredView);
		params.set('search', activeSearchQuery);
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	}, [
		activeSearchQuery,
		dashboardSearchParam,
		dashboardViewParam,
		hasSearched,
		isAddToCampaignMode,
		isMapView,
		pathname,
		router,
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

		const params = new URLSearchParams(searchParams.toString());
		const had =
			params.get('view') !== null ||
			params.get('search') !== null;
		if (!had) return;

		params.delete('view');
		params.delete('search');
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
		const currentView = fromCampaignViewParam;
		const currentSearch = fromCampaignSearchParam;

		if (currentView === desiredView && currentSearch === activeSearchQuery) return;

		const params = new URLSearchParams(searchParams.toString());
		params.set('fromCampaignView', desiredView);
		params.set('fromCampaignSearch', activeSearchQuery);
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	}, [
		activeSearchQuery,
		fromCampaignSearchParam,
		fromCampaignViewParam,
		hasSearched,
		isAddToCampaignMode,
		isMapView,
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

	const primaryCtaLabel = isAddToCampaignMode ? 'Add to Campaign' : 'Create Campaign';
	const primaryCtaPending = isAddToCampaignMode
		? isPendingAddToCampaign || isPendingFromCampaign
		: isPendingCreateCampaign || isPendingBatchUpdateContacts;
	const handlePrimaryCta = isAddToCampaignMode ? handleAddSelectedToCampaign : handleCreateCampaign;

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
	const isSelectMapToolActive = activeMapTool === 'select';
	const isGrabMapToolActive = activeMapTool === 'grab';
	const hasNoSearchResults =
		hasSearched && !isMapResultsLoading && (contacts?.length ?? 0) === 0;

	type SearchThisAreaViewportIdlePayload = {
		bounds: { south: number; west: number; north: number; east: number };
		zoom: number;
		isCenterInSearchArea: boolean;
	};

	// "Search this area" CTA timing + placement (map view).
	const SEARCH_THIS_AREA_MIN_ZOOM = 8;
	const SEARCH_THIS_AREA_DELAY_MS = 2000;
	// Scale down fullscreen map UI chrome (buttons/panels) without scaling the Mapbox canvas.
	const MAP_VIEW_UI_SCALE = isMobile ? 1 : 0.85;
	const MAP_VIEW_SEARCH_BAR_TOP_PX = 33;
	const MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX = 49;
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

	const handleMapViewportIdle = useCallback(
		(payload: SearchThisAreaViewportIdlePayload) => {
			lastSearchThisAreaViewportRef.current = payload;
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
		[activeSearchQuery, hasSearched, hideSearchThisAreaCta, isMapResultsLoading, isMapView]
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
		// First click: activate Select tool. Second click (while active): select all visible.
		if (!isSelectMapToolActive) {
			setActiveMapTool('select');
			return;
		}
		setSelectAllInViewNonce((n) => n + 1);
	}, [isSelectMapToolActive]);

	useEffect(() => {
		// Prevent stale hover state when leaving map view or while results are transitioning.
		if (!isMapView || isMapResultsLoading) {
			setHoveredMapPanelContactId(null);
		}
	}, [isMapResultsLoading, isMapView]);

	const [isPointerInMapSidePanel, setIsPointerInMapSidePanel] = useState(false);
	const [isPointerInMapBottomHalf, setIsPointerInMapBottomHalf] = useState(false);

	const shouldUseDynamicMapCreateCampaignCta =
		isMapView &&
		!isMobile &&
		isXlDesktop &&
		!isMapResultsLoading &&
		!hasNoSearchResults &&
		!isNarrowestDesktop;

	const mapCreateCampaignCtaLocation: 'panel' | 'bottom' | 'none' =
		!shouldUseDynamicMapCreateCampaignCta
			? 'panel'
			: isPointerInMapSidePanel
				? 'panel'
				: isPointerInMapBottomHalf
					? 'bottom'
					: 'none';

	const isMapPanelCreateCampaignVisible =
		!shouldUseDynamicMapCreateCampaignCta || mapCreateCampaignCtaLocation === 'panel';
	const isMapBottomCreateCampaignVisible =
		!shouldUseDynamicMapCreateCampaignCta || mapCreateCampaignCtaLocation === 'bottom';

	useEffect(() => {
		if (typeof window === 'undefined') return;

		// Reset when dynamic behavior is not active (prevents "stale" cursor state).
		if (!shouldUseDynamicMapCreateCampaignCta) {
			setIsPointerInMapSidePanel(false);
			setIsPointerInMapBottomHalf(false);
			return;
		}

		// Default to showing the bottom CTA until we observe the current cursor position.
		setIsPointerInMapSidePanel(false);
		setIsPointerInMapBottomHalf(true);

		const handleMouseMove = (e: MouseEvent) => {
			const nextIsBottomHalf = e.clientY >= window.innerHeight / 2;
			setIsPointerInMapBottomHalf((prev) =>
				prev === nextIsBottomHalf ? prev : nextIsBottomHalf
			);
		};

		window.addEventListener('mousemove', handleMouseMove, { passive: true });
		return () => window.removeEventListener('mousemove', handleMouseMove);
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

	// Lock body scroll when in map view
	useEffect(() => {
		if (isMapView) {
			document.body.style.overflow = 'hidden';
			document.body.style.height = '100vh';
		} else {
			document.body.style.overflow = '';
			document.body.style.height = '';
		}
		return () => {
			document.body.style.overflow = '';
			document.body.style.height = '';
		};
	}, [isMapView]);

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
				!target.closest('.search-sections-container') &&
				!target.closest('.search-dropdown-menu') &&
				!target.closest('.mini-search-section-why') &&
				!target.closest('.mini-search-section-what') &&
				!target.closest('.mini-search-section-where')
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
		if (activeSection === 'what' && whatInputRef.current) {
			whatInputRef.current.focus();
		} else if (activeSection === 'where' && whereInputRef.current) {
			whereInputRef.current.focus();
		}
	}, [activeSection]);

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

	const contactsForMap =
		fromHomeParam && (!isSignedIn || !hasSearched)
			? fromHomePlaceholderContacts
			: (contacts || []);

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

	const selectedAreaBoundsForMap = mapBboxFilter
		? {
				south: mapBboxFilter.south,
				west: mapBboxFilter.west,
				north: mapBboxFilter.north,
				east: mapBboxFilter.east,
		  }
		: null;

	// Fullscreen map view "frame" animation.
	// Key goal: keep the Mapbox container size stable during the transition.
	// Resizing the container causes canvas reflow + debounced `map.resize()` calls, which looks jittery.
	// We instead animate a clipped viewport + overlay border, so the frame slides in without displacing the map.
	const MAP_VIEW_FRAME_INSET_PX = 9;
	const MAP_VIEW_FRAME_RADIUS_PX = 8;
	const MAP_VIEW_FRAME_BORDER_PX = 3;
	const mapViewFrameTransition = `${DASHBOARD_TO_INTERACTIVE_TRANSITION_MS}ms ${DASHBOARD_TO_INTERACTIVE_TRANSITION_CSS_EASING}`;
	const mapViewInnerInsetPx = MAP_VIEW_FRAME_INSET_PX + MAP_VIEW_FRAME_BORDER_PX;
	const mapViewInnerRadiusPx = Math.max(0, MAP_VIEW_FRAME_RADIUS_PX - MAP_VIEW_FRAME_BORDER_PX);
	const mapViewClip = isMapView
		? `inset(${mapViewInnerInsetPx}px round ${mapViewInnerRadiusPx}px)`
		: 'inset(0px round 0px)';
	const mapPortal =
		typeof window !== 'undefined'
			? createPortal(
					<div
						className="dashboard-globe-bg"
						style={{
							position: 'fixed',
							inset: 0,
							// Important: this portal is appended to <body>, so with zIndex 0 it can paint
							// above the dashboard content. Keep it behind the normal dashboard UI, and
							// raise it only when entering fullscreen map view.
							zIndex: isMapView ? 98 : -1,
							pointerEvents: isMapView ? 'auto' : 'none',
						}}
					>
					<div
						style={{
							width: '100%',
							height: '100%',
							position: 'relative',
						}}
					>
						{/* Map viewport (clipped; animates insets without resizing the map container) */}
						<div
							style={{
								width: '100%',
								height: '100%',
								WebkitClipPath: mapViewClip,
								clipPath: mapViewClip,
								transition: `-webkit-clip-path ${mapViewFrameTransition}, clip-path ${mapViewFrameTransition}`,
								willChange: 'clip-path',
								overflow: 'hidden',
							}}
						>
							<SearchResultsMap
								presentation={mapPresentation}
								autoSpin={shouldSpinBackgroundMap}
								contacts={contactsForMap}
								selectedContacts={selectedContacts}
								externallyHoveredContactId={hoveredMapPanelContactId}
								searchQuery={activeSearchQuery}
								searchWhat={searchWhatForMap}
								selectAllInViewNonce={isMapView ? selectAllInViewNonce : undefined}
								onVisibleOverlayContactsChange={
									isMapView
										? (overlayContacts) => {
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
										  }
										: undefined
								}
								activeTool={isMapView ? activeMapTool : undefined}
								selectedAreaBounds={selectedAreaBoundsForMap}
								onViewportInteraction={isMapView ? handleMapViewportInteraction : undefined}
								onViewportIdle={isMapView ? handleMapViewportIdle : undefined}
								onAreaSelect={
									isMapView
										? (bounds, payload) => {
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
										  }
										: undefined
								}
								onMarkerHover={isMapView ? handleMapMarkerHover : undefined}
								lockedStateName={lockedStateNameForMap}
								skipAutoFit={skipAutoFitForMap}
								onStateSelect={
									isMapView
										? (stateName) => {
												// In demo mode, show the free trial prompt instead of searching
												if (isFromHomeDemoMode) {
													setShowFreeTrialPrompt(true);
													return;
												}

												const nextState = (stateName || '').trim();
												if (!nextState) return;

												// Keep the last executed Why/What (the map is showing results for this query),
												// and only swap the state for the next search.
												const baseWhy =
													(extractWhyFromSearchQuery(activeSearchQuery) || whyValue).trim();
												const baseWhat =
													(extractWhatFromSearchQuery(activeSearchQuery) || whatValue).trim();
												triggerSearchWithWhere(nextState, false, { why: baseWhy, what: baseWhat });
										  }
										: undefined
								}
								isLoading={isSearchPending || isLoadingContacts || isRefetchingContacts}
								onMarkerClick={
									isMapView
										? (contact) => {
												// Ensure map-only overlay markers (e.g. Booking extra pins) can show up as
												// rows in the right-hand panel when selected/clicked.
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
										  }
										: undefined
								}
								onToggleSelection={
									isMapView
										? (contactId) => {
												const wasSelected = selectedContacts.includes(contactId);

												// Ensure the selected contact stays renderable in the side panel across
												// subsequent searches by caching the full object.
												if (!wasSelected) {
													const fromBase = (contacts || []).find((c) => c.id === contactId);
													const fromOverlay = mapPanelVisibleOverlayContacts.find((c) => c.id === contactId);
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
										  }
										: undefined
								}
							/>
						</div>

						{/* Decorative frame (slides in; does not affect map layout) */}
						<div
							aria-hidden="true"
							style={{
								position: 'absolute',
								top: isMapView ? MAP_VIEW_FRAME_INSET_PX : 0,
								left: isMapView ? MAP_VIEW_FRAME_INSET_PX : 0,
								right: isMapView ? MAP_VIEW_FRAME_INSET_PX : 0,
								bottom: isMapView ? MAP_VIEW_FRAME_INSET_PX : 0,
								// Animate radius + width together so the inner edge stays perfectly aligned
								// with the clipped map viewport throughout the transition.
								borderRadius: isMapView ? MAP_VIEW_FRAME_RADIUS_PX : 0,
								borderStyle: 'solid',
								borderColor: '#143883',
								borderWidth: isMapView ? MAP_VIEW_FRAME_BORDER_PX : 0,
								boxSizing: 'border-box',
								pointerEvents: 'none',
								transition: `top ${mapViewFrameTransition}, left ${mapViewFrameTransition}, right ${mapViewFrameTransition}, bottom ${mapViewFrameTransition}, border-radius ${mapViewFrameTransition}, border-width ${mapViewFrameTransition}`,
								willChange: 'top, left, right, bottom, border-radius, border-width',
							}}
						/>
						</div>
					</div>,
					document.body
			  )
			: null;

	// Return null during initial load to prevent hydration mismatch
	if (isMobile === null) {
		return <div className="min-h-screen w-full">{mapPortal}</div>;
	}

	// Mobile dashboard: show only the campaigns inbox table (no search bar, no tab toggle).
	if (isMobile) {
		return (
			<div className="min-h-screen w-full">
				{mapPortal}
				<Link
					href={urls.home.activeLanding}
					prefetch
					className="fixed left-8 top-6 flex items-center gap-5 text-[15px] font-inter font-normal no-underline hover:no-underline z-[10000] group text-[#060606] hover:text-gray-500"
					title="Back to Landing"
					aria-label="Back to Landing"
					onClick={(e) => {
						e.preventDefault();
						if (typeof window !== 'undefined') {
							window.location.assign(urls.home.activeLanding);
						}
					}}
				>
					<svg
						width="16"
						height="10"
						viewBox="0 0 27 16"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						className="inline-block align-middle"
					>
						<path
							d="M0.292892 7.29289C-0.0976315 7.68342 -0.0976315 8.31658 0.292892 8.70711L6.65685 15.0711C7.04738 15.4616 7.68054 15.4616 8.07107 15.0711C8.46159 14.6805 8.46159 14.0474 8.07107 13.6569L2.41421 8L8.07107 2.34315C8.46159 1.95262 8.46159 1.31946 8.07107 0.928932C7.68054 0.538408 7.04738 0.538408 6.65685 0.928932L0.292892 7.29289ZM27 8V7L1 7V8V9L27 9V8Z"
							fill="currentColor"
						/>
					</svg>
					<span className="hidden md:inline">to Landing</span>
				</Link>

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
	const bottomPadding = isMobile && hasSearched ? 'pb-[64px]' : 'pb-0 md:pb-[100px]';

	return (
		<>
		{/* Shared Mapbox globe background */}
		{mapPortal}

		<AppLayout>
			<Link
				href={urls.home.activeLanding}
				prefetch
				className={`fixed left-8 top-6 flex items-center gap-5 text-[15px] font-inter font-normal no-underline hover:no-underline z-[10000] group text-[#060606] hover:text-gray-500 transition-opacity duration-500 ${
					isMapView ? 'opacity-0 pointer-events-none' : 'opacity-100'
				}`}
				title="Back to Landing"
				aria-label="Back to Landing"
				onClick={(e) => {
					e.preventDefault();
					if (typeof window !== 'undefined') {
						window.location.assign(urls.home.activeLanding);
					}
				}}
			>
				<svg
					width="16"
					height="10"
					viewBox="0 0 27 16"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className="inline-block align-middle"
				>
					<path
						d="M0.292892 7.29289C-0.0976315 7.68342 -0.0976315 8.31658 0.292892 8.70711L6.65685 15.0711C7.04738 15.4616 7.68054 15.4616 8.07107 15.0711C8.46159 14.6805 8.46159 14.0474 8.07107 13.6569L2.41421 8L8.07107 2.34315C8.46159 1.95262 8.46159 1.31946 8.07107 0.928932C7.68054 0.538408 7.04738 0.538408 6.65685 0.928932L0.292892 7.29289ZM27 8V7L1 7V8V9L27 9V8Z"
						fill="currentColor"
					/>
				</svg>
				<span className="hidden md:inline">to Landing</span>
			</Link>

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
												await ensureNonEmptyDashboardSearchOnBlankSubmit();
												if (!isSignedIn) {
													if (hasProblematicBrowser) {
														// For Edge/Safari, navigate to sign-in page
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
													// Switch to search tab when submitting from inbox tab
													if (activeTab === 'inbox') {
														transitionToTab('search', {
															after: () => {
																form.handleSubmit(onSubmit)();
															},
														});
														return;
													}
													form.handleSubmit(onSubmit)(e);
												}
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
															>
																<div
																	className={`search-wave-container ${
																		isSearchPending ||
																		isLoadingContacts ||
																		isRefetchingContacts
																			? 'search-wave-loading'
																			: ''
																	}`}
																	style={{ transition: 'none' }}
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
																		}`}
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
																	{/* Desktop Search Button */}
																	<button
																		type="submit"
																		className={`dashboard-search-button flex absolute right-[6px] items-center justify-center w-[58px] ${
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
																	>
																		<SearchIconDesktop width={inboxView ? 25 : 26} height={inboxView ? 25 : 28} />
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
						const trayWhy = isPromotion
							? {
									backgroundColor: MAP_RESULTS_SEARCH_TRAY.whyBackgroundColors.promotion,
									icon: <PromotionIcon />,
							  }
							: {
									backgroundColor: MAP_RESULTS_SEARCH_TRAY.whyBackgroundColors.booking,
									icon: <BookingIcon />,
							  };

						const normalizedWhatKey = whatValue.trim();
						// If the segmented "What" state isn't populated (e.g. the user searched via raw text),
						// fall back to the last executed query so the tray doesn't "jump" to a default icon.
						const searchedWhatKey = (searchedWhat || '').trim();
						const effectiveWhatKeyForTray = normalizedWhatKey || searchedWhatKey;
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

						const whereCandidate = (whereValue || userLocationName || '').trim();
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
							{/* Map view: show the 189x52 icon tray to the left of the search bar */}
							{isMapView && (
								<div
									className="hidden lg:flex items-center justify-between"
									style={{
										position: 'absolute',
										// Map is inset 9px from the viewport; "25px from map top" => 34px viewport.
										// Search bar wrapper sits at 33px viewport, so this becomes 1px inside the wrapper.
										top: '1px',
										left: `-${
											MAP_RESULTS_SEARCH_TRAY.containerWidth +
											MAP_RESULTS_SEARCH_TRAY.gapToSearchBar
										}px`,
										width: `${MAP_RESULTS_SEARCH_TRAY.containerWidth}px`,
										height: `${MAP_RESULTS_SEARCH_TRAY.containerHeight}px`,
										backgroundColor: MAP_RESULTS_SEARCH_TRAY.backgroundColor,
										border: `${MAP_RESULTS_SEARCH_TRAY.borderWidth}px solid ${MAP_RESULTS_SEARCH_TRAY.borderColor}`,
										borderRadius: `${MAP_RESULTS_SEARCH_TRAY.containerRadius}px`,
										paddingLeft: '6px',
										paddingRight: '6px',
									}}
								>
									{/* First icon (Why) - clickable with dropdown */}
									<div ref={whyDropdownRef} className="relative">
										<button
											type="button"
											className="cursor-pointer border-none bg-transparent p-0"
											onClick={() => setIsWhyDropdownOpen(!isWhyDropdownOpen)}
											aria-label={isPromotion ? 'Promotion search type' : 'Booking search type'}
											aria-expanded={isWhyDropdownOpen}
											aria-haspopup="listbox"
										>
											<SearchTrayIconTile backgroundColor={trayWhy.backgroundColor}>
												{trayWhy.icon}
											</SearchTrayIconTile>
										</button>
										{/* Why dropdown */}
										{isWhyDropdownOpen && (
											<div
												role="listbox"
												aria-label="Search type options"
												className="absolute top-[calc(100%+8px)] left-0 border-[3px] border-black rounded-[12px] z-50"
												style={{
													width: '171px',
													height: '110px',
													backgroundColor: 'rgba(216, 229, 251, 0.9)',
													padding: '6px',
												}}
											>
												<div className="flex flex-col gap-[6px] h-full items-center">
													{/* Promotion option */}
													<div
														role="option"
														aria-selected={isPromotion}
														className="flex items-center gap-3 cursor-pointer bg-white rounded-[8px] hover:bg-gray-50 transition-colors"
														style={{
															width: '160px',
															height: '46px',
															paddingLeft: '4px',
															paddingRight: '12px',
														}}
														onClick={() => {
															setWhyValue('[Promotion]');
															setIsWhyDropdownOpen(false);
															setIsWhatDropdownOpen(true);
														}}
													>
														<div
															className="flex items-center justify-center flex-shrink-0"
															style={{
																width: '38px',
																height: '38px',
																backgroundColor: MAP_RESULTS_SEARCH_TRAY.whyBackgroundColors.promotion,
																borderRadius: '10px',
															}}
														>
															<PromotionIcon />
														</div>
														<span className="text-[15px] font-medium text-black font-inter">Promotion</span>
													</div>
													{/* Booking option */}
													<div
														role="option"
														aria-selected={!isPromotion}
														className="flex items-center gap-3 cursor-pointer bg-white rounded-[8px] hover:bg-gray-50 transition-colors"
														style={{
															width: '160px',
															height: '46px',
															paddingLeft: '4px',
															paddingRight: '12px',
														}}
														onClick={() => {
															setWhyValue('[Booking]');
															setIsWhyDropdownOpen(false);
															setIsWhatDropdownOpen(true);
														}}
													>
														<div
															className="flex items-center justify-center flex-shrink-0"
															style={{
																width: '38px',
																height: '38px',
																backgroundColor: MAP_RESULTS_SEARCH_TRAY.whyBackgroundColors.booking,
																borderRadius: '10px',
															}}
														>
															<BookingIcon />
														</div>
														<span className="text-[15px] font-medium text-black font-inter">Booking</span>
													</div>
												</div>
											</div>
										)}
									</div>
									{/* Second icon (What) - clickable with dropdown */}
									<div ref={whatDropdownRef} className="relative">
										<button
											type="button"
											className="cursor-pointer border-none bg-transparent p-0"
											onClick={() => setIsWhatDropdownOpen(!isWhatDropdownOpen)}
											aria-label={`${whatValue || 'Category'} search category`}
											aria-expanded={isWhatDropdownOpen}
											aria-haspopup="listbox"
										>
											<SearchTrayIconTile backgroundColor={trayWhat.backgroundColor}>
												{trayWhat.icon}
											</SearchTrayIconTile>
										</button>
										{/* What dropdown */}
										{isWhatDropdownOpen && (
											<div
												id="map-search-tray-what-dropdown-container"
												role="listbox"
												aria-label="Search category options"
												className="absolute top-[calc(100%+8px)] left-0 border-[3px] border-black rounded-[12px] z-50"
												style={{
													width: '249px',
													height: isPromotion ? '66px' : '277px',
													backgroundColor: 'rgba(216, 229, 251, 0.9)',
												}}
											>
												<style jsx global>{`
													#map-search-tray-what-dropdown-container .scrollbar-hide {
														scrollbar-width: none !important;
														scrollbar-color: transparent transparent !important;
														-ms-overflow-style: none !important;
													}
													#map-search-tray-what-dropdown-container .scrollbar-hide::-webkit-scrollbar {
														display: none !important;
														width: 0 !important;
														height: 0 !important;
													}
												`}</style>
												{isPromotion ? (
													/* Promotion: only Radio Stations - centered in compact container */
													<div className="flex items-center justify-center h-full w-full">
														<div
															role="option"
															aria-selected={whatValue === 'Radio Stations'}
															className="flex items-center gap-3 cursor-pointer bg-white rounded-[8px] hover:bg-gray-50 transition-colors flex-shrink-0"
															style={{
																width: '237px',
																height: '46px',
																paddingLeft: '4px',
																paddingRight: '12px',
															}}
															onClick={() => {
																setWhatValue('Radio Stations');
																setIsWhatDropdownOpen(false);
															}}
														>
															<div
																className="flex items-center justify-center flex-shrink-0"
																style={{
																	width: '38px',
																	height: '38px',
																	backgroundColor:
																		MAP_RESULTS_SEARCH_TRAY.whatIconByLabel['Radio Stations']
																			.backgroundColor,
																	borderRadius: '10px',
																}}
															>
																<RadioStationsIcon />
															</div>
															<span className="text-[15px] font-medium text-black font-inter">
																Radio Stations
															</span>
														</div>
													</div>
												) : (
													<CustomScrollbar
														className="h-full"
														contentClassName="flex flex-col items-center gap-[10px] py-[10px] pl-[6px] pr-[26px] -mr-[20px]"
														thumbWidth={2}
														thumbColor="#000000"
														offsetRight={-5}
														lockHorizontalScroll
													>
														<>
															{/* 1. Wine, Beer, and Spirits option */}
															<div
																role="option"
																aria-selected={whatValue === 'Wine, Beer, and Spirits'}
																className="flex items-center gap-3 cursor-pointer bg-white rounded-[8px] hover:bg-gray-50 transition-colors flex-shrink-0"
																style={{
																	width: '237px',
																	height: '46px',
																	paddingLeft: '4px',
																	paddingRight: '12px',
																}}
																onClick={() => {
																	setWhatValue('Wine, Beer, and Spirits');
																	setIsWhatDropdownOpen(false);
																}}
															>
																<div
																	className="flex items-center justify-center flex-shrink-0"
																	style={{
																		width: '38px',
																		height: '38px',
																		backgroundColor:
																			MAP_RESULTS_SEARCH_TRAY.whatIconByLabel[
																				'Wine, Beer, and Spirits'
																			].backgroundColor,
																		borderRadius: '10px',
																	}}
																>
																	<WineBeerSpiritsIcon size={22} />
																</div>
																<span className="text-[15px] font-medium text-black font-inter flex-1 min-w-0 truncate">
																	Wine, Beer, and Spirits
																</span>
															</div>
															{/* 2. Restaurants option */}
															<div
																role="option"
																aria-selected={whatValue === 'Restaurants'}
																className="flex items-center gap-3 cursor-pointer bg-white rounded-[8px] hover:bg-gray-50 transition-colors flex-shrink-0"
																style={{
																	width: '237px',
																	height: '46px',
																	paddingLeft: '4px',
																	paddingRight: '12px',
																}}
																onClick={() => {
																	setWhatValue('Restaurants');
																	setIsWhatDropdownOpen(false);
																}}
															>
																<div
																	className="flex items-center justify-center flex-shrink-0"
																	style={{
																		width: '38px',
																		height: '38px',
																		backgroundColor:
																			MAP_RESULTS_SEARCH_TRAY.whatIconByLabel['Restaurants']
																				.backgroundColor,
																		borderRadius: '10px',
																	}}
																>
																	<RestaurantsIcon />
																</div>
																<span className="text-[15px] font-medium text-black font-inter">
																	Restaurants
																</span>
															</div>
															{/* 3. Coffee Shops option */}
															<div
																role="option"
																aria-selected={whatValue === 'Coffee Shops'}
																className="flex items-center gap-3 cursor-pointer bg-white rounded-[8px] hover:bg-gray-50 transition-colors flex-shrink-0"
																style={{
																	width: '237px',
																	height: '46px',
																	paddingLeft: '4px',
																	paddingRight: '12px',
																}}
																onClick={() => {
																	setWhatValue('Coffee Shops');
																	setIsWhatDropdownOpen(false);
																}}
															>
																<div
																	className="flex items-center justify-center flex-shrink-0"
																	style={{
																		width: '38px',
																		height: '38px',
																		backgroundColor:
																			MAP_RESULTS_SEARCH_TRAY.whatIconByLabel['Coffee Shops']
																				.backgroundColor,
																		borderRadius: '10px',
																	}}
																>
																	<CoffeeShopsIcon />
																</div>
																<span className="text-[15px] font-medium text-black font-inter">
																	Coffee Shops
																</span>
															</div>
															{/* 4. Festivals option */}
															<div
																role="option"
																aria-selected={whatValue === 'Festivals'}
																className="flex items-center gap-3 cursor-pointer bg-white rounded-[8px] hover:bg-gray-50 transition-colors flex-shrink-0"
																style={{
																	width: '237px',
																	height: '46px',
																	paddingLeft: '4px',
																	paddingRight: '12px',
																}}
																onClick={() => {
																	setWhatValue('Festivals');
																	setIsWhatDropdownOpen(false);
																}}
															>
																<div
																	className="flex items-center justify-center flex-shrink-0"
																	style={{
																		width: '38px',
																		height: '38px',
																		backgroundColor:
																			MAP_RESULTS_SEARCH_TRAY.whatIconByLabel['Festivals']
																				.backgroundColor,
																		borderRadius: '10px',
																	}}
																>
																	<FestivalsIcon />
																</div>
																<span className="text-[15px] font-medium text-black font-inter">
																	Festivals
																</span>
															</div>
															{/* 5. Wedding Planners option */}
															<div
																role="option"
																aria-selected={whatValue === 'Wedding Planners'}
																className="flex items-center gap-3 cursor-pointer bg-white rounded-[8px] hover:bg-gray-50 transition-colors flex-shrink-0"
																style={{
																	width: '237px',
																	height: '46px',
																	paddingLeft: '4px',
																	paddingRight: '12px',
																}}
																onClick={() => {
																	setWhatValue('Wedding Planners');
																	setIsWhatDropdownOpen(false);
																}}
															>
																<div
																	className="flex items-center justify-center flex-shrink-0"
																	style={{
																		width: '38px',
																		height: '38px',
																		backgroundColor:
																			MAP_RESULTS_SEARCH_TRAY.whatIconByLabel[
																				'Wedding Planners'
																			].backgroundColor,
																		borderRadius: '10px',
																	}}
																>
																	<WeddingPlannersIcon />
																</div>
																<span className="text-[15px] font-medium text-black font-inter">
																	Wedding Planners
																</span>
															</div>
															{/* 6. Music Venues option */}
															<div
																role="option"
																aria-selected={whatValue === 'Music Venues'}
																className="flex items-center gap-3 cursor-pointer bg-white rounded-[8px] hover:bg-gray-50 transition-colors flex-shrink-0"
																style={{
																	width: '237px',
																	height: '46px',
																	paddingLeft: '4px',
																	paddingRight: '12px',
																}}
																onClick={() => {
																	setWhatValue('Music Venues');
																	setIsWhatDropdownOpen(false);
																}}
															>
																<div
																	className="flex items-center justify-center flex-shrink-0"
																	style={{
																		width: '38px',
																		height: '38px',
																		backgroundColor:
																			MAP_RESULTS_SEARCH_TRAY.whatIconByLabel['Music Venues']
																				.backgroundColor,
																		borderRadius: '10px',
																	}}
																>
																	<MusicVenuesIcon />
																</div>
																<span className="text-[15px] font-medium text-black font-inter">
																	Music Venues
																</span>
															</div>
														</>
													</CustomScrollbar>
												)}
											</div>
										)}
									</div>
									{/* Third icon (Where) - clickable with dropdown */}
									<div ref={whereDropdownRef} className="relative">
										<button
											type="button"
											className="cursor-pointer border-none bg-transparent p-0"
											onClick={() => setIsWhereDropdownOpen(!isWhereDropdownOpen)}
											aria-label={`${whereValue || 'Location'} search location`}
											aria-expanded={isWhereDropdownOpen}
											aria-haspopup="listbox"
										>
											<SearchTrayIconTile backgroundColor={trayWhere.backgroundColor}>
												{trayWhere.icon}
											</SearchTrayIconTile>
										</button>
										{/* Where dropdown */}
										{isWhereDropdownOpen && (
											<div
												id="map-search-tray-where-dropdown-container"
												role="listbox"
												aria-label="Search location options"
												className="absolute top-[calc(100%+8px)] right-0 border-[3px] border-black rounded-[12px] z-50"
												style={{
													width: '206px',
													height: '277px',
													backgroundColor: 'rgba(216, 229, 251, 0.9)',
												}}
											>
												<style jsx global>{`
													#map-search-tray-where-dropdown-container .scrollbar-hide {
														scrollbar-width: none !important;
														scrollbar-color: transparent transparent !important;
														-ms-overflow-style: none !important;
													}
													#map-search-tray-where-dropdown-container .scrollbar-hide::-webkit-scrollbar {
														display: none !important;
														width: 0 !important;
														height: 0 !important;
													}
												`}</style>
												<CustomScrollbar
													className="h-full"
													contentClassName="flex flex-col items-center gap-[10px] py-[10px] pl-[6px] pr-[26px] -mr-[20px]"
													thumbWidth={2}
													thumbColor="#000000"
													offsetRight={-5}
													lockHorizontalScroll
												>
													{buildAllUsStateNames().map((stateName) => {
														const { icon, backgroundColor } = getCityIconProps('', stateName);
														return (
															<div
																key={stateName}
																role="option"
																aria-selected={whereValue === stateName}
																className="flex items-center gap-3 cursor-pointer bg-white rounded-[8px] hover:bg-gray-50 transition-colors flex-shrink-0"
																style={{
																	width: '194px',
																	height: '46px',
																	paddingLeft: '4px',
																	paddingRight: '12px',
																}}
																onClick={() => {
																	setIsWhereDropdownOpen(false);
																	setIsNearMeLocation(false);
																	triggerSearchWithWhere(stateName, false);
																}}
															>
																<div
																	className="flex items-center justify-center flex-shrink-0"
																	style={{
																		width: '38px',
																		height: '38px',
																		backgroundColor,
																		borderRadius: '10px',
																	}}
																>
																	{icon}
																</div>
																<span className="text-[15px] font-medium text-black font-inter">
																	{stateName}
																</span>
															</div>
														);
													})}
												</CustomScrollbar>
											</div>
										)}
									</div>
								</div>
							)}
							<div
								className={`results-search-bar-inner ${
									hoveredContact && !isMapView ? 'invisible' : ''
								}`}
							>
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
							</div>
							{isMapView && (
								<>
									{/* Box to the left of the Home button */}
									<div
										className="group relative h-[52px] hover:h-[80px]"
										style={{
											...(() => {
												const buttonSize = 43;
												const gap = isSelectMapToolActive ? 8 : 20;
												// Existing collapsed design: 2 buttons + 20px gap inside a 130px wrapper.
												// That leaves ~12px padding on each side (24px total).
												const horizontalPadding = 24;
												const innerWidth = isSelectMapToolActive
													? buttonSize * 3 + gap * 2
													: buttonSize * 2 + gap;
												const wrapperWidth = innerWidth + horizontalPadding;
												const gapToHomeButton = 10;
												return {
													width: `${wrapperWidth}px`,
													left: `calc(100% + 179px - ${wrapperWidth + gapToHomeButton}px)`,
												};
											})(),
											position: 'absolute',
											// Map is inset 9px from the viewport; "25px from map top" => 34px viewport.
											// Search bar wrapper sits at 33px viewport, so this becomes 1px inside the wrapper.
											top: '1px',
											// Home button is at: calc(100% + 179px). This box should be 10px to its left.
											borderRadius: '6px',
											backgroundColor: 'rgba(255, 255, 255, 0.9)', // #FFFFFF @ 90%
											border: '3px solid #000000',
										}}
									>
										{/* Keep the buttons pinned to the collapsed center so expanding height doesn't move them */}
										<div
											className={`absolute left-1/2 top-[24px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center ${
												isSelectMapToolActive ? 'gap-[8px]' : 'gap-[20px]'
											}`}
										>
											{isSelectMapToolActive ? (
												<>
													{/* Left: active "What" category icon from the current search */}
													<div className="relative">
														<div
															aria-label={`Active category: ${effectiveWhatKeyForTray || 'Music Venues'}`}
															className="flex items-center justify-center"
															style={{
																width: '43px',
																height: '43px',
																borderRadius: '9px',
																backgroundColor: trayWhat.backgroundColor,
															}}
														>
															<TrayWhatIcon size={trayWhatIconSize} />
														</div>
													</div>

													{/* Center: Select tool */}
													<div className="relative">
														<button
															type="button"
															onClick={handleSelectMapToolClick}
															aria-label="Select tool"
															aria-pressed={isSelectMapToolActive}
															className="flex items-center justify-center font-inter text-[16px] font-semibold leading-none text-black"
															style={{
																width: '43px',
																height: '43px',
																borderRadius: '9px',
																backgroundColor:
																	isSelectMapToolActive
																		? '#999999'
																		: 'rgba(153, 153, 153, 0.3)', // #999999 @ 30%
																cursor: 'pointer',
																padding: 0,
																border: 'none',
															}}
														>
															<div
																aria-hidden="true"
																style={{
																	width: '24px',
																	height: '24px',
																	backgroundColor:
																		isSelectMapToolActive ? '#999999' : 'transparent',
																	border: '2px solid #000000',
																	boxSizing: 'border-box',
																	display: 'flex',
																	alignItems: 'center',
																	justifyContent: 'center',
																}}
															>
																{isSelectMapToolActive && (
																	<span
																		className="font-inter"
																		style={{
																			fontSize: '8px',
																			fontWeight: 500,
																			color: '#000000',
																			lineHeight: 1,
																		}}
																	>
																		All
																	</span>
																)}
															</div>
														</button>
														{isSelectMapToolActive && (
															<div className="pointer-events-none absolute left-1/2 top-[51px] -translate-x-1/2 opacity-0 group-hover:opacity-100 font-inter text-[16px] font-semibold leading-none text-black select-none whitespace-nowrap">
																Select
															</div>
														)}
													</div>

													{/* Right: Grab tool */}
													<div className="relative">
														<button
															type="button"
															onClick={() => setActiveMapTool('grab')}
															aria-label="Grab tool"
															aria-pressed={isGrabMapToolActive}
															className="flex items-center justify-center"
															style={{
																width: '43px',
																height: '43px',
																borderRadius: '9px',
																backgroundColor:
																	isGrabMapToolActive
																		? '#4CDE71'
																		: '#999999',
																cursor: 'pointer',
																padding: 0,
																border: 'none',
															}}
														>
															<GrabIcon
																innerFill="#FFFFFF"
															/>
														</button>
													</div>
												</>
											) : (
												<>
													<div className="relative">
														<button
															type="button"
															onClick={handleSelectMapToolClick}
															aria-label="Select tool"
															aria-pressed={isSelectMapToolActive}
															className="flex items-center justify-center"
															style={{
																width: '43px',
																height: '43px',
																borderRadius: '9px',
																backgroundColor:
																	isSelectMapToolActive
																		? '#999999'
																		: 'rgba(153, 153, 153, 0.3)', // #999999 @ 30%
																cursor: 'pointer',
																padding: 0,
																border: 'none',
															}}
														>
															<div
																aria-hidden="true"
																style={{
																	width: '24px',
																	height: '24px',
																	backgroundColor:
																		isSelectMapToolActive
																			? '#999999'
																			: 'transparent',
																	border: '2px solid #000000',
																	boxSizing: 'border-box',
																	display: 'flex',
																	alignItems: 'center',
																	justifyContent: 'center',
																}}
															>
																{isSelectMapToolActive && (
																	<span
																		className="font-inter"
																		style={{
																			fontSize: '8px',
																			fontWeight: 500,
																			color: '#000000',
																			lineHeight: 1,
																		}}
																	>
																		All
																	</span>
																)}
															</div>
														</button>
														{isSelectMapToolActive && (
															<div className="pointer-events-none absolute left-1/2 top-[51px] -translate-x-1/2 opacity-0 group-hover:opacity-100 font-inter text-[16px] font-semibold leading-none text-black select-none whitespace-nowrap">
																Select
															</div>
														)}
													</div>
													<div className="relative">
														<button
															type="button"
															onClick={() => setActiveMapTool('grab')}
															aria-label="Grab tool"
															aria-pressed={isGrabMapToolActive}
															className="flex items-center justify-center"
															style={{
																width: '43px',
																height: '43px',
																borderRadius: '9px',
																backgroundColor:
																	isGrabMapToolActive
																		? '#4CDE71'
																		: '#999999',
																cursor: 'pointer',
																padding: 0,
																border: 'none',
															}}
														>
															<GrabIcon
																innerFill="#FFFFFF"
															/>
														</button>
														{isGrabMapToolActive && (
															<div className="pointer-events-none absolute left-1/2 top-[51px] -translate-x-1/2 opacity-0 group-hover:opacity-100 font-inter text-[16px] font-semibold leading-none text-black select-none whitespace-nowrap">
																Grab
															</div>
														)}
													</div>
												</>
											)}
										</div>
									</div>
									<button
										type="button"
										onClick={handleCloseMapView}
										aria-label="Home"
										className="group flex items-center justify-center cursor-pointer w-[52px] hover:w-[155px]"
										style={{
											position: 'absolute',
											// Map is inset 9px from the viewport; "25px from map top" => 34px viewport.
											// Search bar wrapper sits at 33px viewport, so this becomes 1px inside the wrapper.
											top: '1px',
											// "179px to the right of the searchbar" => from wrapper's right edge.
											left: 'calc(100% + 179px)',
											height: '52px',
											borderRadius: '9px',
											backgroundColor: '#D6D6D6',
											border: '3px solid #000000',
											padding: '2px',
										}}
									>
										<div
											className="flex items-center justify-center w-[42px] group-hover:w-[143px]"
											style={{
												height: '42px',
												borderRadius: '9px',
												backgroundColor: '#EAEAEA',
											}}
										>
											{/* Default: show house icon */}
											<span className="group-hover:hidden flex items-center justify-center">
												<HomeIcon width={20} height={17} />
											</span>
											{/* Hover: show "Home" text SVG */}
											<HomeExpandedIcon className="hidden group-hover:block" width={80} height={21} />
										</div>
									</button>
								</>
							)}
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
													backgroundColor: isRestaurantTitle(hoveredContact.title || '')
														? '#C3FBD1'
														: isCoffeeShopTitle(hoveredContact.title || '')
															? '#D6F1BD'
															: isMusicVenueTitle(hoveredContact.title || '')
																? '#B7E5FF'
																: isMusicFestivalTitle(hoveredContact.title || '')
																	? '#C1D6FF'
																	: (isWeddingPlannerTitle(hoveredContact.title || '') || isWeddingVenueTitle(hoveredContact.title || ''))
																		? '#FFF8DC'
																		: isWineBeerSpiritsTitle(hoveredContact.title || '')
																			? '#BFC4FF'
																			: '#E8EFFF',
													border: '0.7px solid #000000',
												}}
											>
												{isRestaurantTitle(hoveredContact.title || '') && (
													<RestaurantsIcon size={12} className="flex-shrink-0" />
												)}
												{isCoffeeShopTitle(hoveredContact.title || '') && (
													<CoffeeShopsIcon size={7} />
												)}
												{isMusicVenueTitle(hoveredContact.title || '') && (
													<MusicVenuesIcon size={12} className="flex-shrink-0" />
												)}
												{isMusicFestivalTitle(hoveredContact.title || '') && (
													<FestivalsIcon size={12} className="flex-shrink-0" />
												)}
												{(isWeddingPlannerTitle(hoveredContact.title || '') || isWeddingVenueTitle(hoveredContact.title || '')) && (
													<WeddingPlannersIcon size={12} />
												)}
												{isWineBeerSpiritsTitle(hoveredContact.title || '') && (
													<WineBeerSpiritsIcon size={12} className="flex-shrink-0" />
												)}
												<span className="text-[14px] leading-none font-secondary font-medium">
													{isRestaurantTitle(hoveredContact.title || '')
														? 'Restaurant'
														: isCoffeeShopTitle(hoveredContact.title || '')
															? 'Coffee Shop'
															: isMusicVenueTitle(hoveredContact.title || '')
																? 'Music Venue'
																: isMusicFestivalTitle(hoveredContact.title || '')
																	? 'Music Festival'
																	: isWeddingVenueTitle(hoveredContact.title || '')
																		? 'Wedding Venue'
																		: isWeddingPlannerTitle(hoveredContact.title || '')
																			? 'Wedding Planner'
																			: isWineBeerSpiritsTitle(hoveredContact.title || '')
																				? getWineBeerSpiritsLabel(hoveredContact.title || '')
																				: (hoveredContact.title || '—')}
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

						const searchBar = isMapView ? (
							<div
								className="fixed left-0 right-0 flex justify-center pointer-events-none"
								style={{
									// Overlay directly on the map (no header band).
									// Map container is inset 9px from viewport; place bar 24px below map top.
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

						const campaignMapTopTabs =
							isMapView && isAddToCampaignMode ? (
								<div
									data-slot="campaign-map-top-tabs"
									className="fixed left-0 right-0 z-[9999] flex items-center justify-center pointer-events-none"
									style={{
										// The map search bar is fixed at top: 33px in map view.
										// The map container is inset 9px from the viewport.
										// Center the tabs within the 24px band between the map top (9px)
										// and the search bar top (33px) so they never feel too high/low.
										top: '9px',
										height: '24px',
									}}
								>
									<div
										className="pointer-events-auto relative"
										style={{
											width: 'min(440px, calc(100vw - 120px))',
											maxWidth: '440px',
											height: '24px',
											// Optical nudge: align the tray with the visible search bar below.
											transform: `translateX(-5px) scale(${MAP_VIEW_UI_SCALE})`,
											transformOrigin: 'top center',
										}}
									>
										{/* Background box behind tabs (matches search bar width & centering) */}
										<div
											aria-hidden="true"
											style={{
												position: 'absolute',
												// Keep the map's 3px black border visible above this box.
												top: '3px',
												left: 0,
												right: 0,
												// Leave a small gap so it doesn't press against the search bar.
												bottom: '3px',
												backgroundColor: 'rgba(238, 237, 237, 0.8)', // #EEEDED @ 80%
												border: '1px solid rgba(173, 173, 173, 0.8)', // #ADADAD @ 80%
												borderTopLeftRadius: 0,
												borderTopRightRadius: 0,
												borderBottomLeftRadius: '8px',
												borderBottomRightRadius: '8px',
												boxSizing: 'border-box',
												pointerEvents: 'none',
											}}
										/>

										<div className="relative z-[1] flex h-full w-full items-center justify-between px-4 pt-[3px] pb-[3px]">
											<button
												type="button"
												className="font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer text-[#A0A0A0] inline-flex items-center h-full"
												onClick={() =>
													router.push(
														`${urls.murmur.campaign.detail(fromCampaignIdParam)}?origin=search&tab=contacts`
													)
												}
											>
												Contacts
											</button>
											<button
												type="button"
												className="font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer text-[#A0A0A0] inline-flex items-center h-full"
												onClick={() =>
													router.push(
														`${urls.murmur.campaign.detail(fromCampaignIdParam)}?origin=search&tab=testing`
													)
												}
											>
												Write
											</button>
											<button
												type="button"
												aria-label="All"
												title="All"
												className="bg-transparent p-0 m-0 border-0 cursor-pointer text-[#A0A0A0] inline-flex items-center justify-center h-full"
												onClick={() =>
													router.push(
														`${urls.murmur.campaign.detail(fromCampaignIdParam)}?origin=search&tab=all`
													)
												}
											>
												<BottomArrowIcon
													aria-hidden="true"
													focusable="false"
													width={18}
													height={12}
													className="block translate-y-[1px]"
												/>
											</button>
											<button
												type="button"
												className="font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer text-[#A0A0A0] inline-flex items-center h-full"
												onClick={() =>
													router.push(
														`${urls.murmur.campaign.detail(fromCampaignIdParam)}?origin=search&tab=drafting`
													)
												}
											>
												Drafts
											</button>
											<button
												type="button"
												className="font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer text-[#A0A0A0] inline-flex items-center h-full"
												onClick={() =>
													router.push(
														`${urls.murmur.campaign.detail(fromCampaignIdParam)}?origin=search&tab=inbox`
													)
												}
											>
												Inbox
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
									{campaignMapTopTabs}
									{searchBar}
									{searchThisAreaCta}
								</>,
								document.body
							);
						}
						return searchBar;
					})()}

					{(activeSearchQuery || fromHomeParam) && activeTab === 'search' && (
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
															top: '9px',
															left: '9px',
															right: '9px',
															bottom: '9px',
															zIndex: 99,
															pointerEvents: 'none',
														}}
													>
														<div
															// Frame is drawn/animated by the shared map portal.
															// This wrapper exists only to clip/anchor map-view overlays.
															className="w-full h-full rounded-[8px] overflow-hidden relative pointer-events-none"
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
																selectedAreaBounds={selectedAreaBoundsForMap}
																onViewportInteraction={handleMapViewportInteraction}
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
																onStateSelect={(stateName) => {
																	// In demo mode, show the free trial prompt instead of searching
																	if (isFromHomeDemoMode) {
																		setShowFreeTrialPrompt(true);
																		return;
																	}

																	const nextState = (stateName || '').trim();
																	if (!nextState) return;

																	// Keep the last executed Why/What (the map is showing results for this query),
																	// and only swap the state for the next search.
																	const baseWhy =
																		(extractWhyFromSearchQuery(activeSearchQuery) || whyValue).trim();
																	const baseWhat =
																		(extractWhatFromSearchQuery(activeSearchQuery) || whatValue).trim();
																	triggerSearchWithWhere(nextState, false, { why: baseWhy, what: baseWhat });
																}}
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
																		className="absolute top-[97px] right-[10px] rounded-[12px] flex flex-col pointer-events-auto"
																		onMouseEnter={() => {
																			if (!shouldUseDynamicMapCreateCampaignCta) return;
																			setIsPointerInMapSidePanel(true);
																		}}
																		onMouseLeave={() => {
																			if (!shouldUseDynamicMapCreateCampaignCta) return;
																			setIsPointerInMapSidePanel(false);
																		}}
																		style={{
																			width: '433px',
																			height: mapResearchPanelContact && mapResearchPanelCompactHeightPx
																				? mapResearchPanelCompactHeightPx
																				: 800,
																			maxHeight: 'calc(100% - 117px)',
																			backgroundColor:
																				mapResearchPanelContact && isMapResearchPanelVisible
																				? '#D8E5FB'
																				: 'rgba(175, 214, 239, 0.8)',
																			border: mapResearchPanelContact && isMapResearchPanelVisible
																				? '3px solid #000000'
																				: '3px solid #143883',
																			overflow: 'hidden',
																			transform: `scale(${MAP_VIEW_UI_SCALE})`,
																			transformOrigin: 'top right',
																		}}
																	>
																		{/* Header area for right-hand panel (same color as panel) */}
																		<div
																			className="w-full h-[49px] flex-shrink-0 flex items-center justify-center px-4 relative"
																		>
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
																			<span className="font-inter text-[13px] font-medium text-black relative -translate-y-[2px]">
																				{selectedContacts.length} selected
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
																			{isMapResultsLoading ? (
																				<MapResultsPanelSkeleton
																					variant="desktop"
																					rows={Math.max(mapPanelContacts.length, 14)}
																				/>
																			) : (
																				mapPanelContacts.map((contact) => {
																				const isSelected = selectedContacts.includes(
																					contact.id
																				);
																				const isHovered = hoveredMapPanelContactId === contact.id;
																				const isUsed = usedContactIdsSet.has(contact.id);
																				const isInBaseResults = baseContactIdSet.has(contact.id);
																				const firstName = contact.firstName || '';
																				const lastName = contact.lastName || '';
																				const fullName =
																					contact.name ||
																					`${firstName} ${lastName}`.trim();
																				const company = contact.company || '';
																				// For restaurant/coffee shop searches, always use the search-derived headline
																				// Otherwise, use contact's headline or fall back to search What + Where
																				const searchDerivedHeadline =
																					whatValue && whereValue
																						? `${whatValue} ${whereValue}`
																						: whatValue || '';
																				const isSpecialCategorySearch =
																					/^restaurants?$/i.test(whatValue.trim()) ||
																					/^coffee\s*shops?$/i.test(whatValue.trim());
																				// For overlay-only contacts (not in base results), prefer the true contact title.
																				const contactHeadline = isInBaseResults
																					? contact.headline || contact.title || ''
																					: contact.title || contact.headline || '';
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
																				const stateAbbr =
																					getStateAbbreviation(contact.state || '') || '';
																				const city = contact.city || '';

																				return (
																					<div
																						key={contact.id}
																						data-contact-id={contact.id}
																						className="cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-[3px] border-[#ABABAB] select-none relative"
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
																						{/* Centered used contact dot */}
																						{fullName && isUsed && (
																							<span
																								className="absolute shrink-0"
																								style={{
																									width: '16px',
																									height: '16px',
																									borderRadius: '50%',
																									border: '1px solid #000000',
																									backgroundColor: '#DAE6FE',
																									left: '12px',
																									top: '50%',
																									transform: 'translateY(-50%)',
																								}}
																							/>
																						)}
																						{fullName ? (
																							<>
																								{/* Top Left - Name */}
																								<div className="pl-3 pr-1 flex items-center h-[23px]">
																									{isUsed && (
																										<span
																											className="inline-block shrink-0 mr-2"
																											style={{
																												width: '16px',
																												height: '16px',
																											}}
																										/>
																									)}
																									<div className="font-bold text-[11px] w-full truncate leading-tight">
																										{fullName}
																									</div>
																								</div>
																								{/* Top Right - Title/Headline */}
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
																								{/* Bottom Left - Company */}
																								<div className="pl-3 pr-1 flex items-center h-[22px]">
																									{isUsed && (
																										<span
																											className="inline-block shrink-0 mr-2"
																											style={{
																												width: '16px',
																												height: '16px',
																											}}
																										/>
																									)}
																									<div className="text-[11px] text-black w-full truncate leading-tight">
																										{company}
																									</div>
																								</div>
																								{/* Bottom Right - Location */}
																								<div className="pr-2 pl-1 flex items-center h-[22px]">
																									{city || stateAbbr ? (
																										<div className="flex items-center gap-1 w-full">
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
																									) : (
																										<div className="w-full" />
																									)}
																								</div>
																							</>
																						) : (
																							<>
																								{/* No name - Company spans left column */}
																								<div className="row-span-2 pl-3 pr-1 flex items-center h-full">
																									{isUsed && (
																										<span
																											className="inline-block shrink-0 mr-2"
																											style={{
																												width: '16px',
																												height: '16px',
																												borderRadius: '50%',
																												border: '1px solid #000000',
																												backgroundColor: '#DAE6FE',
																											}}
																										/>
																									)}
																									<div className="font-bold text-[11px] w-full truncate leading-tight">
																										{company || '—'}
																									</div>
																								</div>
																								{/* Top Right - Title/Headline */}
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
																								{/* Bottom Right - Location */}
																								<div className="pr-2 pl-1 flex items-center h-[22px]">
																									{city || stateAbbr ? (
																										<div className="flex items-center gap-1 w-full">
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
																									) : (
																										<div className="w-full" />
																									)}
																								</div>
																							</>
																						)}
																					</div>
																				);
																				})
																			)}
																		</CustomScrollbar>
																		{!isMapResultsLoading && isMapPanelCreateCampaignVisible && !fromHomeParam && (
																			<div className="flex-shrink-0 w-full px-[10px] pb-[10px]">
																				<Button
																					disabled={primaryCtaPending}
																					variant="primary-light"
																					bold
																					className={`relative w-full h-[39px] !bg-[#5DAB68] hover:!bg-[#4e9b5d] !text-white border border-[#000000] overflow-hidden ${
																						selectedContacts.length === 0
																							? 'opacity-[0.62]'
																							: 'opacity-100'
																					}`}
																					style={
																						selectedContacts.length === 0
																							? {
																									height: '39px',
																									filter: 'grayscale(100%)',
																								}
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
																					// Tune box width for the 433px side panel
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
																{/* Create Campaign button overlaid on map - only show when not loading */}
																{/* Hidden below xl (1280px) to prevent overlap with right panel */}
																{!isMobile &&
																	!fromHomeParam &&
																	!(
																		isSearchPending ||
																		isLoadingContacts ||
																		isRefetchingContacts
																	) &&
																	!hasNoSearchResults && (
																		<div
																			className={`absolute bottom-[10px] left-[10px] right-[10px] hidden xl:flex justify-center transition-opacity duration-150 ${
																				isMapBottomCreateCampaignVisible
																					? 'opacity-100'
																					: 'opacity-0 pointer-events-none'
																			}`}
																			aria-hidden={!isMapBottomCreateCampaignVisible}
																		>
																			<Button
																				disabled={primaryCtaPending}
																				variant="primary-light"
																				bold
																				className={`relative w-full max-w-[420px] h-[39px] !bg-[#5DAB68] hover:!bg-[#4e9b5d] !text-white border border-[#000000] overflow-hidden ${
																					selectedContacts.length === 0
																						? 'opacity-[0.62]'
																						: 'opacity-100'
																				}`}
																				style={
																					selectedContacts.length === 0
																						? { filter: 'grayscale(100%)' }
																						: undefined
																				}
																				onClick={() => {
																					if (selectedContacts.length === 0) return;
																					handlePrimaryCta();
																				}}
																				tabIndex={isMapBottomCreateCampaignVisible ? 0 : -1}
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
															{/* Single column search results panel overlay at bottom - narrowest breakpoint (< 952px) */}
															{/* Keep mounted during loading so UI doesn't disappear between state searches. */}
															{isNarrowestDesktop && !hasNoSearchResults && (
																	<div
																		className="absolute left-[10px] right-[10px] bottom-[10px] rounded-[12px] shadow-lg flex flex-col"
																		style={{
																			height: '45%',
																			maxHeight: 'calc(100% - 20px)',
																			backgroundColor: '#AFD6EF',
																			border: '3px solid #143883',
																			overflow: 'hidden',
																			transform: `scale(${MAP_VIEW_UI_SCALE})`,
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
																		mapPanelContacts.map((contact) => {
																		const isSelected = selectedContacts.includes(
																			contact.id
																		);
																		const isHovered = hoveredMapPanelContactId === contact.id;
																		const isUsed = usedContactIdsSet.has(contact.id);
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
																		// For overlay-only contacts (not in base results), prefer the true contact title.
																		const contactHeadline = isInBaseResults
																			? contact.headline || contact.title || ''
																			: contact.title || contact.headline || '';
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
																								{isUsed && (
																									<span
																										className="inline-block shrink-0 mr-2"
																										style={{
																											width: '16px',
																											height: '16px',
																											borderRadius: '50%',
																											border: '1px solid #000000',
																											backgroundColor: '#DAE6FE',
																										}}
																									/>
																								)}
																								<div className="font-bold text-[11px] truncate leading-tight">
																									{fullName}
																								</div>
																							</div>
																							<div className="flex items-center mt-[2px]">
																								{isUsed && (
																									<span
																										className="inline-block shrink-0 mr-2"
																										style={{
																											width: '16px',
																											height: '16px',
																										}}
																									/>
																								)}
																								<div className="text-[11px] text-black truncate leading-tight">
																									{company}
																								</div>
																							</div>
																						</>
																					) : (
																						<div className="flex items-center">
																							{isUsed && (
																								<span
																									className="inline-block shrink-0 mr-2"
																									style={{
																										width: '16px',
																										height: '16px',
																										borderRadius: '50%',
																										border: '1px solid #000000',
																										backgroundColor: '#DAE6FE',
																									}}
																								/>
																							)}
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
																		})
																	)}
														</CustomScrollbar>
															{!isMapResultsLoading && !fromHomeParam && (
																	<div className="flex-shrink-0 w-full px-[10px] pb-[10px]">
																		<Button
																			disabled={primaryCtaPending}
																			variant="primary-light"
																			bold
																			className={`relative w-full h-[39px] !bg-[#5DAB68] hover:!bg-[#4e9b5d] !text-white border border-[#000000] overflow-hidden ${
																				selectedContacts.length === 0
																					? 'opacity-[0.62]'
																					: 'opacity-100'
																			}`}
																			style={
																				selectedContacts.length === 0
																					? { height: '39px', filter: 'grayscale(100%)' }
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
														className="relative w-full max-w-[984px] h-[39px] mx-auto mt-[20px] !bg-[#5DAB68] hover:!bg-[#4e9b5d] !text-white border border-[#000000] overflow-hidden"
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
															className="w-full h-[54px] min-h-[54px] !rounded-none !bg-[#5dab68] hover:!bg-[#4e9b5d] !text-white border border-[#000000] transition-colors !opacity-100 disabled:!opacity-100"
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

				{/* CampaignsTable for search tab - rendered outside hero-wrapper */}
				{!hasSearched && activeTab === 'search' && (
					<div
						ref={tabbedLandingBoxRef}
						className="campaigns-table-wrapper dashboard-recent-campaigns w-full max-w-[960px] mx-auto px-4"
						style={{
							willChange: 'transform, opacity',
						}}
					>
						{(() => {
							const panels = [
								{
									key: 'new',
									label: 'New',
									render: () => (
										<InboundEmailNotificationList enabled={isSignedIn === true} />
									),
								},
								{
									key: 'campaigns',
									label: 'Campaigns',
									render: () => <CampaignsTable />,
								},
								{
									key: 'responses',
									label: 'Responses',
									render: () => (
										<InboxSection
											desktopHeight={535}
											dashboardMode
											loadingVariant="dashboard"
											inboxSubtab="messages"
											onInboxSubtabChange={() => {}}
										/>
									),
								},
							] as const;

							const activePanel =
								panels.find((panel) => panel.key === dashboardLandingPanel) ??
								panels[0];
							const inactivePanels = panels.filter(
								(panel) => panel.key !== activePanel.key
							);

							return (
								<>
									<div className="mt-[18px] mb-[18px] w-full flex flex-col items-center">
										{activePanel.render()}
									</div>

									{inactivePanels.map((panel) => (
										<div
											key={panel.key}
											className="w-[603px] max-w-full mx-auto"
											style={{ opacity: 0.6 }}
										>
											<button
												type="button"
												onClick={() => setDashboardLandingPanel(panel.key)}
												className="flex items-center justify-center gap-[6px] cursor-pointer hover:opacity-80 transition-opacity"
												style={{
													width: '127px',
													height: '26px',
													borderRadius: '12px',
													border: '1px solid #ccc',
													backgroundColor: '#fff',
													fontSize: '13px',
													fontWeight: 500,
													color: '#333',
													marginBottom: '12px',
												}}
											>
												<CampaignsDropdownIcon style={{ flexShrink: 0 }} />
												{panel.label}
											</button>
										</div>
									))}
								</>
							);
						})()}
					</div>
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
