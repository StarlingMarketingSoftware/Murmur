'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createPortal, flushSync } from 'react-dom';
import { CampaignsTable } from '../../../components/organisms/_tables/CampaignsTable/CampaignsTable';
import { useDashboard } from './useDashboard';
import { urls } from '@/constants/urls';
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
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle } from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { RadioStationsIcon } from '@/components/atoms/_svg/RadioStationsIcon';
import { NearMeIcon } from '@/components/atoms/_svg/NearMeIcon';
import HomeIcon from '@/components/atoms/_svg/HomeIcon';
import HomeExpandedIcon from '@/components/atoms/_svg/HomeExpandedIcon';
import GrabIcon from '@/components/atoms/svg/GrabIcon';
import { getCityIconProps } from '@/utils/cityIcons';
import { Typography } from '@/components/ui/typography';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import { Card, CardContent } from '@/components/ui/card';

import { useClerk } from '@clerk/nextjs';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDebounce } from '@/hooks/useDebounce';
import { useGetLocations, useBatchUpdateContacts } from '@/hooks/queryHooks/useContacts';
import { useMe } from '@/hooks/useMe';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import SearchResultsMap from '@/components/molecules/SearchResultsMap/SearchResultsMap';
import { ContactWithName } from '@/types/contact';
import { MapResultsPanelSkeleton } from '@/components/molecules/MapResultsPanelSkeleton/MapResultsPanelSkeleton';
import { buildAllUsStateNames, getNearestUsStateNames, normalizeUsStateName } from '@/utils/usStates';
import {
	ContactResearchPanel,
	ContactResearchHorizontalStrip,
} from '@/components/molecules/ContactResearchPanel/ContactResearchPanel';
import { CampaignsInboxView } from '@/components/molecules/CampaignsInboxView/CampaignsInboxView';
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
	{ backgroundColor: string; Icon: () => ReactNode }
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
	const { isSignedIn, openSignIn } = useClerk();
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
	const { data: fromCampaign, isPending: isPendingFromCampaign } = useGetCampaign(fromCampaignIdParam);
	const addToCampaignUserContactListId = fromCampaign?.userContactLists?.[0]?.id;
	const { mutateAsync: editUserContactList, isPending: isPendingAddToCampaign } =
		useEditUserContactList({ suppressToasts: true });

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
	const [isNearMeLocation, setIsNearMeLocation] = useState(false);
	const hasWhereValue = whereValue.trim().length > 0;
	const isPromotion = whyValue === '[Promotion]';
	const [activeSection, setActiveSection] = useState<'why' | 'what' | 'where' | null>(
		null
	);
	const initialTabFromQuery = searchParams.get('tab') === 'inbox' ? 'inbox' : 'search';
	const [activeTab, setActiveTab] = useState<'search' | 'inbox'>(initialTabFromQuery);
	const inboxView = activeTab === 'inbox';

	// Handle tab query parameter
	// Only react to *URL changes*. If we also depend on `activeTab`, this effect can run
	// immediately after a click-driven tab switch (before `router.replace` updates the URL),
	// momentarily forcing the UI back to the previous tab (the "flash" you were seeing).
	const tabParam = searchParams.get('tab');
	useEffect(() => {
		if (tabParam === 'search' || tabParam === 'inbox') {
			// URL is the source of truth when it changes externally (back/forward, deep link)
			setActiveTab(tabParam);
		}
	}, [tabParam]);
	const [userLocationName, setUserLocationName] = useState<string | null>(null);
	const [isLoadingLocation, setIsLoadingLocation] = useState(false);

	// Narrowest desktop detection (< 952px) - single column layout for map view
	const [isNarrowestDesktop, setIsNarrowestDesktop] = useState(false);
	const [isXlDesktop, setIsXlDesktop] = useState(false);

	// Detect narrow desktop breakpoint
	useEffect(() => {
		if (typeof window === 'undefined') return;

		const handleResize = () => {
			const width = window.innerWidth;
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
	const triggerSearchWithCurrentValues = () => {
		setActiveSection(null);

		// Build the combined search query
		const formattedWhere = whereValue.trim() ? `(${whereValue.trim()})` : '';
		const combinedSearch = [whyValue, whatValue, formattedWhere]
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
		}
	};

	const renderDesktopSearchDropdowns = () => {
		if (!activeSection) return null;

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
				className="search-dropdown-menu hidden md:block w-[439px] bg-[#D8E5FB] rounded-[16px] border-2 border-black z-[110] relative overflow-hidden"
				style={
					isMapView
						? {
								position: 'fixed',
								// In map view, the mini search bar is overlaid on the map,
								// so the dropdown should anchor just below it.
								// Search bar is fixed at 33px and the input is 49px tall; add a small gap.
								top: '92px',
								left: dropdownLeft,
								height: dropdownHeight,
								transition: dropdownTransition,
								willChange: 'left, height',
								// Ensure dropdown appears above the overlaid search bar.
								zIndex: 140,
						  }
						: {
								position: 'absolute',
								top: 'calc(100% + 10px)',
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
							className="w-[410px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
							className="w-[410px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
								className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setWhatValue('Wine, Beer, and Spirits');
										// On the results screen, changing "What" should immediately re-search
										// without auto-advancing the UI to the "Where" (state) step.
										setActiveSection(isMapView ? null : 'where');
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#80AAFF] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<WineBeerSpiritsIcon />
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
									onClick={() => {
										setWhatValue('Wedding Planners');
										// On the results screen, changing "What" should immediately re-search
										// without auto-advancing the UI to the "Where" (state) step.
										setActiveSection(isMapView ? null : 'where');
									}}
								>
									<div className="w-[38px] h-[38px] bg-[#EED56E] rounded-[8px] flex-shrink-0 flex items-center justify-center">
										<WeddingPlannersIcon />
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
												className="w-[415px] min-h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200 mb-2"
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
									className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
												className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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
													className="w-[415px] h-[68px] bg-white hover:bg-[#f0f0f0] rounded-[12px] flex-shrink-0 flex items-center px-[15px] cursor-pointer transition-colors duration-200"
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

	// Mobile-friendly sizing for hero logo and subtitle; desktop remains unchanged
	const logoWidth = isMobile ? '190px' : '300px';
	const logoHeight = isMobile ? '50px' : '79px';
	const hasProblematicBrowser = isProblematicBrowser();
	useMe(); // Hook call for side effects
	const tabToggleTrackRef = useRef<HTMLDivElement>(null);
	const tabTogglePillRef = useRef<HTMLDivElement>(null);
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
	} = useDashboard({ derivedTitle: derivedContactTitle, forceApplyDerivedTitle: shouldForceApplyDerivedTitle });

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
	const mapViewContainerRef = useRef<HTMLDivElement | null>(null);
	const [activeMapTool, setActiveMapTool] = useState<'select' | 'grab'>('grab');
	const [hoveredMapMarkerContact, setHoveredMapMarkerContact] = useState<ContactWithName | null>(
		null
	);
	// When hovering a row in the map side panel, highlight/show the corresponding marker on the map.
	const [hoveredMapPanelContactId, setHoveredMapPanelContactId] = useState<number | null>(null);
	const isMapResultsLoading = isSearchPending || isLoadingContacts || isRefetchingContacts;
	const hasNoSearchResults =
		hasSearched && !isMapResultsLoading && (contacts?.length ?? 0) === 0;

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
	useEffect(() => {
		setMapPanelExtraContactIds([]);
		setMapPanelExtraContacts([]);
		setMapPanelVisibleOverlayContacts([]);
	}, [activeSearchQuery]);

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
	const searchedStateAbbrForMap = searchedStateAbbr;

	// Use the "What" from the last executed search (activeSearchQuery), not the live dropdown value.
	const searchedWhat = useMemo(
		() => extractWhatFromSearchQuery(activeSearchQuery),
		[activeSearchQuery]
	);

	// Check if the current executed search is for a specific category (to apply labels to all results)
	const searchWhatLower = searchedWhat?.toLowerCase() || '';
	const isMusicVenuesSearch = searchWhatLower.includes('music venue') || searchWhatLower.includes('venues');
	const isRestaurantsSearch = searchWhatLower.includes('restaurant');
	const isCoffeeShopsSearch = searchWhatLower.includes('coffee shop') || searchWhatLower.includes('coffee shops');

	const baseContactIdSet = useMemo(
		() => new Set<number>((contacts || []).map((c) => c.id)),
		[contacts]
	);

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

	const TAB_PILL_COLORS = {
		search: '#DAE6FE',
		inbox: '#CBE7D1',
	} as const;

	const getTabPillXFor = (tab: 'search' | 'inbox') => {
		const track = tabToggleTrackRef.current;
		const pill = tabTogglePillRef.current;

		// Fallbacks match the fixed design values used in the markup below.
		const trackWidth = track?.getBoundingClientRect().width ?? 228;
		const pillWidth = pill?.getBoundingClientRect().width ?? 85;

		const half = trackWidth / 2;
		const inset = (half - pillWidth) / 2;

		return tab === 'search' ? inset : half + inset;
	};

	const updateTabQueryParam = (tab: 'search' | 'inbox') => {
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

	useEffect(() => {
		if (hasSearched) return;
		const handleResize = () => {
			if (isTabSwitchAnimatingRef.current) return;
			const pill = tabTogglePillRef.current;
			if (!pill) return;
			gsap.set(pill, { x: getTabPillXFor(activeTab) });
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [activeTab, hasSearched]);

	const transitionToTab = (
		nextTab: 'search' | 'inbox',
		opts?: { animate?: boolean; after?: () => void }
	) => {
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
		setIsMapView(false);
		setHoveredContact(null);
		// Reset search completely to return to default dashboard
		handleEnhancedResetSearch();
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

	// Return null during initial load to prevent hydration mismatch
	if (isMobile === null) {
		return null;
	}

	// Mobile dashboard: show only the campaigns inbox table (no search bar, no tab toggle).
	if (isMobile) {
		return (
			<div className="min-h-screen w-full">
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
		<AppLayout>
			<div
				ref={dashboardContentRef}
				className={`relative min-h-screen dashboard-main-offset w-full max-w-full ${bottomPadding} ${
					hasSearched ? 'search-active' : ''
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
								marginTop: activeTab === 'inbox' ? '136px' : '50px',
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
							className={`search-bar-wrapper w-full max-w-[1132px] mx-auto px-4 !z-[50] ${
								hasSearched ? 'search-bar-active' : ''
							}`}
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
											onSubmit={(e) => {
												e.preventDefault();
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
																		className={`search-wave-input !focus-visible:ring-0 !focus-visible:ring-offset-0 !focus:ring-0 !focus:ring-offset-0 !ring-0 !outline-none !accent-transparent ${inboxView ? '!h-[39px] !border-0' : '!h-[72px] !border-2 !border-black'} pr-[70px] md:pr-[80px]`}
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
																		className={`search-sections-container absolute left-[4px] right-[68px] top-1/2 -translate-y-1/2 ${inboxView ? 'h-[31px]' : 'h-[64px]'} rounded-[8px] z-20 font-secondary flex items-center ${
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
																			onClick={() => setActiveSection('why')}
																		>
																			<div className={`absolute z-20 left-[24px] ${inboxView ? 'top-1/2 -translate-y-1/2 text-[14px]' : 'top-[10px] text-[22px]'} font-bold text-black leading-none`}>
																				{inboxView ? (whyValue ? whyValue.replace(/[\[\]]/g, '') : 'Why') : 'Why'}
																			</div>
																			<div className={`absolute z-20 left-[24px] right-[4px] top-[42px] h-[12px] overflow-hidden ${inboxView ? 'hidden' : ''}`}>
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
																			onClick={() => setActiveSection('what')}
																		>
																			{inboxView ? (
																				activeSection === 'what' ? (
																					<input
																						ref={whatInputRef}
																						type="text"
																						value={whatValue}
																						onChange={(e) => setWhatValue(e.target.value)}
																						onKeyDown={(e) => {
																							if (e.key === 'Enter') {
																								e.preventDefault();
																								setActiveSection(null);
																							}
																						}}
																					className="absolute z-20 left-[24px] right-[8px] top-1/2 -translate-y-1/2 w-auto font-bold text-black text-[14px] bg-transparent outline-none border-none leading-none placeholder:text-black"
																						style={{
																							fontFamily: 'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
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
																								onChange={(e) => setWhatValue(e.target.value)}
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
																			onClick={() => setActiveSection('where')}
																		>
																			{inboxView ? (
																				activeSection === 'where' ? (
																					<input
																						ref={whereInputRef}
																						type="text"
																						value={whereValue}
																						onChange={(e) => {
																							setWhereValue(e.target.value);
																							setIsNearMeLocation(false);
																						}}
																						onKeyDown={(e) => {
																							if (e.key === 'Enter') {
																								e.preventDefault();
																								triggerSearchWithCurrentValues();
																							}
																						}}
																					className="absolute z-20 left-[24px] right-[8px] top-1/2 -translate-y-1/2 w-auto font-bold text-black text-[14px] bg-transparent outline-none border-none leading-none placeholder:text-black"
																						style={{
																							fontFamily: 'var(--font-secondary), Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
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
																										setWhereValue(e.target.value);
																										setIsNearMeLocation(false);
																									}}
																									onKeyDown={(e) => {
																										if (e.key === 'Enter') {
																											e.preventDefault();
																											triggerSearchWithCurrentValues();
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
																		className={`flex absolute right-[6px] items-center justify-center w-[58px] ${inboxView ? 'h-[31px]' : 'h-[62px]'} z-40 cursor-pointer group`}
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
																			transition: 'none',
																		}}
																		onMouseEnter={(e) => {
																			e.currentTarget.style.backgroundColor =
																				'rgba(93, 171, 104, 0.65)';
																		}}
																		onMouseLeave={(e) => {
																			e.currentTarget.style.backgroundColor =
																				'rgba(93, 171, 104, 0.49)';
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

						{/* Search/Inbox tab toggle - only shown here for search tab */}
						{!hasSearched && activeTab === 'search' && (
							<div className="flex justify-center" style={{ marginTop: '92px' }}>
								<div
									ref={tabToggleTrackRef}
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
											transform: 'translateX(14.5px) translateY(-50%)',
											willChange: 'transform, background-color',
										}}
									/>
									<button
										type="button"
										className="relative z-10 flex-1 h-full flex items-center justify-center font-medium"
										onClick={() => transitionToTab('search')}
										aria-pressed={true}
									>
										Search
									</button>
									<button
										type="button"
										className="relative z-10 flex-1 h-full flex items-center justify-center font-medium"
										onClick={() => transitionToTab('inbox')}
										aria-pressed={false}
									>
										Inbox
									</button>
								</div>
							</div>
						)}

						{/* Inbox tab: CampaignsInboxView + toggle - inside hero-wrapper for proper positioning */}
						{!hasSearched && activeTab === 'inbox' && (
							<div
								ref={tabbedLandingBoxRef}
								style={{
									marginTop: '20px',
									willChange: 'transform, opacity',
								}}
							>
								<CampaignsInboxView />
								{/* Toggle below table for inbox tab */}
								<div className="flex justify-center" style={{ marginTop: '34px' }}>
									<div
										ref={tabToggleTrackRef}
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
												transform: 'translateX(128.5px) translateY(-50%)',
												willChange: 'transform, background-color',
											}}
										/>
										<button
											type="button"
											className="relative z-10 flex-1 h-full flex items-center justify-center font-medium"
											onClick={() => transitionToTab('search')}
											aria-pressed={false}
										>
											Search
										</button>
										<button
											type="button"
											className="relative z-10 flex-1 h-full flex items-center justify-center font-medium"
											onClick={() => transitionToTab('inbox')}
											aria-pressed={true}
										>
											Inbox
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

				{hasSearched &&
					activeTab === 'search' &&
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
						const whatCfg = MAP_RESULTS_SEARCH_TRAY.whatIconByLabel[normalizedWhatKey];
						const TrayWhatIcon = whatCfg?.Icon || (isPromotion ? RadioStationsIcon : MusicVenuesIcon);
						const trayWhat = {
							backgroundColor:
								whatCfg?.backgroundColor ||
								(isPromotion
									? MAP_RESULTS_SEARCH_TRAY.whatIconByLabel['Radio Stations'].backgroundColor
									: MAP_RESULTS_SEARCH_TRAY.whatIconByLabel['Music Venues'].backgroundColor),
							icon: <TrayWhatIcon />,
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

						const searchBar = (
							<div
					className={`results-search-bar-wrapper w-full max-w-[650px] mx-auto px-4 ${
							// When the horizontal research strip is active (sm–lg desktop),
							// hide the mini search bar + helper text so the strip owns this area.
							showHorizontalResearchStrip ? 'sm:hidden xl:block' : ''
						} ${isMapView ? '' : 'relative'}`}
							style={
								isMapView
									? {
											position: 'fixed',
											// Overlay directly on the map (no header band).
											// Map container is inset 9px from viewport; place bar 24px below map top.
											top: '33px',
											left: '50%',
											transform: 'translateX(-50%)',
											zIndex: 120,
											// Leave room for the floating close button on the left.
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
									aria-hidden="true"
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
										pointerEvents: 'none',
									}}
								>
									<SearchTrayIconTile backgroundColor={trayWhy.backgroundColor}>
										{trayWhy.icon}
									</SearchTrayIconTile>
									<SearchTrayIconTile backgroundColor={trayWhat.backgroundColor}>
										{trayWhat.icon}
									</SearchTrayIconTile>
									<SearchTrayIconTile backgroundColor={trayWhere.backgroundColor}>
										{trayWhere.icon}
									</SearchTrayIconTile>
								</div>
							)}
							<div
								className={`results-search-bar-inner ${
									hoveredContact && !isMapView ? 'invisible' : ''
								}`}
							>
								<Form {...form}>
									<form
										onSubmit={(e) => {
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
																			onClick={() => setActiveSection('why')}
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
																			onClick={() => setActiveSection('where')}
																		>
																			<input
																				value={whereValue}
																				onChange={(e) => {
																					setWhereValue(e.target.value);
																					setIsNearMeLocation(false);
																				}}
																				onKeyDown={(e) => {
																					if (e.key === 'Enter') {
																						e.preventDefault();
																						triggerSearchWithCurrentValues();
																					}
																				}}
																				className="w-full h-full text-left bg-transparent border-none outline-none text-[13px] font-bold font-secondary overflow-hidden placeholder:text-gray-400 p-0 focus:ring-0 cursor-pointer relative z-10"
																				style={{
																					maskImage: 'linear-gradient(to right, black 75%, transparent 100%)',
																					WebkitMaskImage: 'linear-gradient(to right, black 75%, transparent 100%)',
																				}}
																				placeholder="Where"
																				onFocus={(e) => {
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
											position: 'absolute',
											// Map is inset 9px from the viewport; "25px from map top" => 34px viewport.
											// Search bar wrapper sits at 33px viewport, so this becomes 1px inside the wrapper.
											top: '1px',
											// Home button is at: calc(100% + 179px). This box should be 10px to its left.
											left: 'calc(100% + 179px - 140px)', // 130px width + 10px gap
											width: '130px',
											borderRadius: '6px',
											backgroundColor: 'rgba(255, 255, 255, 0.9)', // #FFFFFF @ 90%
											border: '3px solid #000000',
										}}
									>
										{/* Keep the buttons pinned to the collapsed center so expanding height doesn't move them */}
										<div className="absolute left-1/2 top-[24px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-[20px]">
											<div className="relative">
												<button
													type="button"
													onClick={() => setActiveMapTool('select')}
													aria-label="Select tool"
													aria-pressed={activeMapTool === 'select'}
													className="flex items-center justify-center"
													style={{
														width: '43px',
														height: '43px',
														borderRadius: '9px',
														backgroundColor:
															activeMapTool === 'select'
																? '#4CDE71'
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
																activeMapTool === 'select' ? '#FFFFFF' : 'transparent',
															border: '2px solid #000000',
															boxSizing: 'border-box',
														}}
													/>
												</button>
												{activeMapTool === 'select' && (
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
													aria-pressed={activeMapTool === 'grab'}
													className="flex items-center justify-center"
													style={{
														width: '43px',
														height: '43px',
														borderRadius: '9px',
														backgroundColor:
															activeMapTool === 'grab'
																? '#4CDE71'
																: 'rgba(153, 153, 153, 0.3)', // #999999 @ 30%
														cursor: 'pointer',
														padding: 0,
														border: 'none',
													}}
												>
													<GrabIcon innerFill={activeMapTool === 'grab' ? '#FFFFFF' : '#DCDFDD'} />
												</button>
												{activeMapTool === 'grab' && (
													<div className="pointer-events-none absolute left-1/2 top-[51px] -translate-x-1/2 opacity-0 group-hover:opacity-100 font-inter text-[16px] font-semibold leading-none text-black select-none whitespace-nowrap">
														Grab
													</div>
												)}
											</div>
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
											<span className="group-hover:hidden">
												<HomeIcon width={28} height={24} />
											</span>
											{/* Hover: show "Home" text SVG */}
											<HomeExpandedIcon className="hidden group-hover:block" />
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
												className="inline-flex items-center justify-center h-[19px] rounded-[8px] px-2 whitespace-nowrap"
												style={{
													backgroundColor: '#E8EFFF',
													border: '0.7px solid #000000',
												}}
											>
												<span className="text-[14px] leading-none font-secondary font-medium">
													{hoveredContact.title || '—'}
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

						// In map view, the map itself is rendered via a portal to <body>.
						// Portal the mini search bar too so it reliably stacks above the map,
						// regardless of any parent stacking contexts/transforms.
						if (isMapView && typeof window !== 'undefined') {
							return createPortal(searchBar, document.body);
						}
						return searchBar;
					})()}

				{activeSearchQuery && activeTab === 'search' && (
					<>
						{isError ? (
							<div className="mt-10 w-full px-4">
								<Card className="w-full max-w-full mx-auto">
									<CardContent className="py-8">
										<div className="text-center">
											<Typography variant="h3" className="text-destructive mb-2">
												Search Failed
											</Typography>
											<Typography className="text-gray-600 mb-4">
												{error instanceof Error && error.message.includes('timeout')
													? 'The search took too long to complete. Please try a more specific query.'
													: error instanceof Error
													? error.message
													: 'Unable to complete your search. Please try again.'}
											</Typography>
											<Button
												onClick={() => form.handleSubmit(onSubmit)()}
												variant="primary-light"
												className="mt-4"
											>
												Retry Search
											</Button>
										</div>
									</CardContent>
								</Card>
							</div>
						) : isSearchPending ||
						  isLoadingContacts ||
						  isRefetchingContacts ||
						  (contacts && contacts.length > 0) ||
						  (isMapView && hasNoSearchResults) ? (
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
														}}
													>
														<div
															ref={mapViewContainerRef}
															className="w-full h-full rounded-[8px] border-[3px] border-[#143883] overflow-hidden relative"
														>
															<SearchResultsMap
																contacts={contacts || []}
																selectedContacts={selectedContacts}
																externallyHoveredContactId={hoveredMapPanelContactId}
																searchQuery={activeSearchQuery}
																searchWhat={searchedWhat}
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
																lockedStateName={searchedStateAbbrForMap}
																onStateSelect={(stateName) => {
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
																	if (selectedContacts.includes(contactId)) {
																		setSelectedContacts(
																			selectedContacts.filter((id) => id !== contactId)
																		);
																	} else {
																		setSelectedContacts([
																			...selectedContacts,
																			contactId,
																		]);
																	}
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
															{hasNoSearchResults && (
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
															{/* Search Results overlay box on the right side - keep mounted during loading
															    so the UI doesn't disappear between state searches. */}
															{!isNarrowestDesktop && !hasNoSearchResults && (
																	<div
																		className="absolute top-[97px] right-[10px] rounded-[12px] flex flex-col"
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
																				const firstName = contact.firstName || '';
																				const lastName = contact.lastName || '';
																				const fullName =
																					contact.name ||
																					`${firstName} ${lastName}`.trim();
																				const company = contact.company || '';
																				// For restaurant/coffee shop searches, always use the search-derived headline
																				// Otherwise, use contact's headline or fall back to search What + Where
																				const searchDerivedHeadline = whatValue && whereValue ? `${whatValue} ${whereValue}` : whatValue || '';
																				const isSpecialCategorySearch = /^restaurants?$/i.test(whatValue.trim()) || /^coffee\s*shops?$/i.test(whatValue.trim());
																				const contactHeadline = contact.headline || contact.title || '';
																				const headline = isSpecialCategorySearch ? searchDerivedHeadline : (contactHeadline || searchDerivedHeadline);
																				const stateAbbr =
																					getStateAbbreviation(contact.state || '') || '';
																				const city = contact.city || '';

																				return (
																					<div
																						key={contact.id}
																						data-contact-id={contact.id}
																						className="cursor-pointer transition-colors grid grid-cols-2 grid-rows-2 w-full h-[49px] overflow-hidden rounded-[8px] border-2 border-black select-none relative"
																						style={{
																							// Hover should be a subtle darken, not "selected" blue.
																							backgroundColor: isSelected
																								? isHovered
																									? '#BFE3FF'
																									: '#C9EAFF'
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
																								title="Used in a previous campaign"
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
																									{(headline || isMusicVenuesSearch || isRestaurantsSearch || isCoffeeShopsSearch) ? (
																										<div
																											className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
																											style={{
																												backgroundColor: (isRestaurantsSearch || isRestaurantTitle(headline))
																													? '#C3FBD1'
																													: (isCoffeeShopsSearch || isCoffeeShopTitle(headline))
																														? '#D6F1BD'
																														: (isMusicVenuesSearch || isMusicVenueTitle(headline))
																															? '#B7E5FF'
																															: '#E8EFFF',
																											}}
																										>
																											{(isRestaurantsSearch || isRestaurantTitle(headline)) && (
																												<RestaurantsIcon size={12} className="flex-shrink-0" />
																											)}
																											{(isCoffeeShopsSearch || isCoffeeShopTitle(headline)) && (
																												<CoffeeShopsIcon size={7} />
																											)}
																											{(isMusicVenuesSearch || isMusicVenueTitle(headline)) && (
																												<MusicVenuesIcon size={12} className="flex-shrink-0" />
																											)}
																											<span className="text-[10px] text-black leading-none truncate">
																												{(isRestaurantsSearch || isRestaurantTitle(headline))
																													? 'Restaurant'
																													: (isCoffeeShopsSearch || isCoffeeShopTitle(headline))
																														? 'Coffee Shop'
																														: (isMusicVenuesSearch || isMusicVenueTitle(headline))
																															? 'Music Venue'
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
																											title="Used in a previous campaign"
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
																									{(headline || isMusicVenuesSearch || isRestaurantsSearch || isCoffeeShopsSearch) ? (
																										<div
																											className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
																											style={{
																												backgroundColor: (isRestaurantsSearch || isRestaurantTitle(headline))
																													? '#C3FBD1'
																													: (isCoffeeShopsSearch || isCoffeeShopTitle(headline))
																														? '#D6F1BD'
																														: (isMusicVenuesSearch || isMusicVenueTitle(headline))
																															? '#B7E5FF'
																															: '#E8EFFF',
																											}}
																										>
																											{(isRestaurantsSearch || isRestaurantTitle(headline)) && (
																												<RestaurantsIcon size={12} className="flex-shrink-0" />
																											)}
																											{(isCoffeeShopsSearch || isCoffeeShopTitle(headline)) && (
																												<CoffeeShopsIcon size={7} />
																											)}
																											{(isMusicVenuesSearch || isMusicVenueTitle(headline)) && (
																												<MusicVenuesIcon size={12} className="flex-shrink-0" />
																											)}
																											<span className="text-[10px] text-black leading-none truncate">
																												{(isRestaurantsSearch || isRestaurantTitle(headline))
																													? 'Restaurant'
																													: (isCoffeeShopsSearch || isCoffeeShopTitle(headline))
																														? 'Coffee Shop'
																														: (isMusicVenuesSearch || isMusicVenueTitle(headline))
																															? 'Music Venue'
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
																		{!isMapResultsLoading && isMapPanelCreateCampaignVisible && (
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
																		const firstName = contact.firstName || '';
																		const lastName = contact.lastName || '';
																		const fullName =
																			contact.name ||
																			`${firstName} ${lastName}`.trim();
																		const company = contact.company || '';
																		// For restaurant searches, always use the search-derived headline
																		// Otherwise, use contact's headline or fall back to search What + Where
																		const searchDerivedHeadline = whatValue && whereValue ? `${whatValue} ${whereValue}` : whatValue || '';
																		const isRestaurantSearch = /^restaurants?$/i.test(whatValue.trim());
																		const contactHeadline = contact.headline || contact.title || '';
																		const headline = isRestaurantSearch ? searchDerivedHeadline : (contactHeadline || searchDerivedHeadline);
																		const stateAbbr =
																			getStateAbbreviation(contact.state || '') || '';
																		const city = contact.city || '';

																		return (
																			<div
																				key={contact.id}
																				data-contact-id={contact.id}
																				className="cursor-pointer transition-colors flex w-full h-[49px] overflow-hidden rounded-[8px] border-2 border-black select-none relative"
																				style={{
																					// Hover should be a subtle darken, not "selected" blue.
																					backgroundColor: isSelected
																						? isHovered
																							? '#BFE3FF'
																							: '#C9EAFF'
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
																										title="Used in a previous campaign"
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
																									title="Used in a previous campaign"
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
																							className="overflow-hidden flex items-center px-2"
																							style={{
																								width: '230px',
																								height: '19px',
																								backgroundColor: '#E8EFFF',
																								border: '0.7px solid #000000',
																								borderRadius: '8px',
																							}}
																						>
																							<span className="text-[14px] text-black leading-none truncate">
																								{headline}
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
																{!isMapResultsLoading && (
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
															!isMobile ? (
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
											{!isMobile && (
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
						<CampaignsTable />
					</div>
				)}
			</div>
		</AppLayout>
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
