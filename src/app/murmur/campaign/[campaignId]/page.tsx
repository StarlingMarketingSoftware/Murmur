'use client';

// Force server-rendering (no static path generation) to avoid Clerk chunk build errors
export const dynamic = 'force-dynamic';

import { useCampaignDetail } from './useCampaignDetail';
import type {
	DraftingSectionView,
	InboxSentTab,
	InboxSentTabRequest,
} from './DraftingSection/useDraftingSection';
import { CampaignPageSkeleton } from '@/components/molecules/CampaignPageSkeleton/CampaignPageSkeleton';
import { useSearchParams } from 'next/navigation';
import { urls } from '@/constants/urls';
import { cn } from '@/utils';
import { isSafariBrowser } from '@/utils/browserDetection';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMe } from '@/hooks/useMe';
import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import LeftArrow from '@/components/atoms/_svg/LeftArrow';
import RightArrow from '@/components/atoms/_svg/RightArrow';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import DashboardActionBarPlaybookIcon from '@/components/atoms/_svg/DashboardActionBarPlaybookIcon';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import DashboardActionBarStarIcon from '@/components/atoms/_svg/DashboardActionBarStarIcon';
import DashboardActionBarEnvelopeIcon from '@/components/atoms/_svg/DashboardActionBarEnvelopeIcon';
import SearchMap from '@/components/atoms/_svg/SearchMap';
import BottomFolderIcon from '@/components/atoms/_svg/BottomFolderIcon';
import BottomHomeIcon from '@/components/atoms/_svg/BottomHomeIcon';
import { EnvelopeIcon } from '@/components/atoms/_svg/EnvelopeIcon';
import nextDynamic from 'next/dynamic';
import { CampaignsTable } from '@/components/organisms/_tables/CampaignsTable/CampaignsTable';
import { CampaignHeaderBox } from '@/components/molecules/CampaignHeaderBox/CampaignHeaderBox';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
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
import type { SearchResultsMapProps } from '@/components/molecules/SearchResultsMap/SearchResultsMap';
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
import { MapStackBlueSparkIcon } from '@/components/atoms/_svg/MapStackBlueSparkIcon';
import { MapStackStarIcon } from '@/components/atoms/_svg/MapStackStarIcon';
import { useGlobeWeatherMood } from '@/hooks/useGlobeWeatherMood';
import { useGlobeNightLighting } from '@/hooks/useGlobeNightLighting';

type ViewType = Exclude<DraftingSectionView, 'search'>;

// Transition duration in ms - fast enough to feel instant, still smooth
const TRANSITION_DURATION = 180;
// Safety valve: if a destination view is unusually slow to paint, don't block the transition forever.
const MAX_TRANSITION_WAIT_MS = 650;

const CAMPAIGN_MAP_SHIFT_X_VAR = '--murmur-campaign-map-shift-x';
const CAMPAIGN_MAP_BACKDROP_START_VAR = '--murmur-campaign-map-backdrop-start';
const CAMPAIGN_MAP_CONTENT_SCALE = 0.94;
const CAMPAIGN_MAP_FALLBACK_SHIFT_X_PX = 160;
const CAMPAIGN_MAP_MIN_SHIFT_X_PX = 88;
const CAMPAIGN_MAP_MAX_SHIFT_X_PX = 900;
const CAMPAIGN_STANDARD_RESEARCH_RIGHT_FROM_CENTER_PX = 657;
const CAMPAIGN_STANDARD_LEFT_PANEL_LEFT_FROM_CENTER_PX = -657;
const CAMPAIGN_RESEARCH_RIGHT_GAP_PX = 52;
const CAMPAIGN_BACKDROP_CONTENT_GUTTER_PX = 52;
const CAMPAIGN_BACKDROP_TARGET_START_RATIO = 1 / 3;
const CAMPAIGN_MAP_SELECT_GRAB_LEFT_PX = 26;
const CAMPAIGN_MAP_SELECT_GRAB_VIEW_SCALE = 0.74;
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
const CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS = [
	2.25,
	2.41,
	2.57,
	2.77,
	3.13,
	3.9,
	5,
	7,
	8,
	9,
	10,
	11,
	12,
	13,
	14,
	15,
	16,
	17,
	18.5,
	20,
	22,
] as const;
const CAMPAIGN_MAP_ZOOM_CONTROL_MAX_INDEX = CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS.length - 1;
type CampaignMapZoomControlRequest = { zoom: number; nonce: number; isDragging?: boolean };

const clampCampaignMapZoomControlValue = (levelValue: number) => {
	if (!Number.isFinite(levelValue)) return 0;
	return Math.min(Math.max(levelValue, 0), CAMPAIGN_MAP_ZOOM_CONTROL_MAX_INDEX);
};

const getCampaignMapZoomForControlValue = (levelValue: number) => {
	const safeValue = clampCampaignMapZoomControlValue(levelValue);
	const lowerIndex = Math.floor(safeValue);
	const upperIndex = Math.min(lowerIndex + 1, CAMPAIGN_MAP_ZOOM_CONTROL_MAX_INDEX);
	const progress = safeValue - lowerIndex;
	const lowerZoom = CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS[lowerIndex] ?? CAMPAIGN_MAP_ZOOM_CONTROL_LEVELS[0];
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
	{ w: 1504, h: 940, zoom: 0.84 },  // 14" MacBook Pro (slightly more zoomed-in)
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
const SIXTEEN_BY_NINE_ZOOM_POINTS: SixteenByNineZoomPoint[] = SIXTEEN_BY_NINE_ZOOM_MAP.map(
	(entry) => ({ ...entry, metric: Math.hypot(entry.w, entry.h) })
).sort((a, b) => a.metric - b.metric);

// Dynamically import heavy components to reduce initial bundle size and prevent Vercel timeout
const DraftingSection = nextDynamic(
	() => import('./DraftingSection/DraftingSection').then((mod) => mod.DraftingSection),
	{
		loading: () => <CampaignPageSkeleton />,
	}
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
			html.style.removeProperty(CAMPAIGN_MAP_BACKDROP_START_VAR);
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
			html.style.removeProperty(CAMPAIGN_MAP_BACKDROP_START_VAR);
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
				if (!Number.isFinite(metric) || metric <= 0 || SIXTEEN_BY_TEN_ZOOM_POINTS.length === 0) {
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
				if (!Number.isFinite(metric) || metric <= 0 || SIXTEEN_BY_NINE_ZOOM_POINTS.length === 0) {
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
				when: viewportW >= 1900 && viewportW <= 2050 && viewportH >= 1180 && viewportH <= 1245,
				max: 0.93,
			},
			{
				// ~2144x1340 with Dock: custom preference bump.
				id: 'dock-2144x1340-min',
				when: viewportW >= 2100 && viewportW <= 2200 && viewportH >= 1320 && viewportH <= 1380,
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

		// Clamp zoom so the bottom panels remain fully visible (snug, no scroll).
		try {
			const anchors = Array.from(
				document.querySelectorAll<HTMLElement>('[data-campaign-bottom-anchor]')
			);
			if (anchors.length > 0) {
				// Reserve a small safety margin so we're not "flush" to the bottom edge.
				// On short viewports (e.g. when macOS Dock is visible) we use a smaller margin
				// to avoid forcing the entire UI to scale down too much.
				const SAFE_BOTTOM_MARGIN_PX = viewportH <= 780 ? 8 : 24;
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
		const targetResearchRightCss =
			(viewportW - CAMPAIGN_RESEARCH_RIGHT_GAP_PX) / campaignZoom;
		const calculatedShiftX =
			targetResearchRightCss -
			layoutViewportW / 2 -
			CAMPAIGN_MAP_CONTENT_SCALE * CAMPAIGN_STANDARD_RESEARCH_RIGHT_FROM_CENTER_PX;
		const campaignMapShiftX = clampZoom(
			calculatedShiftX,
			CAMPAIGN_MAP_MIN_SHIFT_X_PX,
			CAMPAIGN_MAP_MAX_SHIFT_X_PX
		);
		const leftContentClusterLeftCss =
			layoutViewportW / 2 +
			CAMPAIGN_MAP_CONTENT_SCALE * CAMPAIGN_STANDARD_LEFT_PANEL_LEFT_FROM_CENTER_PX +
			campaignMapShiftX;
		const contentAlignedBackdropStartCss =
			leftContentClusterLeftCss - CAMPAIGN_BACKDROP_CONTENT_GUTTER_PX / campaignZoom;
		const twoThirdsBackdropStartCss =
			layoutViewportW * CAMPAIGN_BACKDROP_TARGET_START_RATIO;
		const campaignBackdropStartCss = clampZoom(
			Math.min(contentAlignedBackdropStartCss, twoThirdsBackdropStartCss),
			0,
			layoutViewportW
		);

		html.style.setProperty(CAMPAIGN_MAP_SHIFT_X_VAR, `${campaignMapShiftX.toFixed(2)}px`);
		html.style.setProperty(
			CAMPAIGN_MAP_BACKDROP_START_VAR,
			`${campaignBackdropStartCss.toFixed(2)}px`
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
		const scheduleZoomUpdate = () => {
			if (cancelled) return;
			if (scheduledRaf !== null) return;
			scheduledRaf = window.requestAnimationFrame(() => {
				scheduledRaf = null;
				if (cancelled) return;
				updateCampaignZoomForViewport();
			});
		};

		const SAFE_BOTTOM_MARGIN_PX = (viewportH: number) => (viewportH <= 780 ? 8 : 24);

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
				(document.querySelector('[data-campaign-view-layer="active"]') as HTMLElement | null) ??
				document.body;
			scope.querySelectorAll<HTMLElement>('[data-campaign-bottom-anchor]').forEach((el) => {
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
					const safeMargin = SAFE_BOTTOM_MARGIN_PX(viewportH);
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
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_BACKDROP_START_VAR);
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
				// IMPORTANT: CampaignPageSkeleton renders an invisible `[data-campaign-bottom-anchor]`
				// to keep the initial zoom clamp stable while DraftingSection loads.
				// Wait until the *real* campaign view layer exists (i.e. DraftingSection has mounted)
				// before performing the "measure real DOM" zoom update + disconnecting this observer.
				const activeLayer = document.querySelector(
					'[data-campaign-view-layer="active"]'
				) as HTMLElement | null;
				if (!activeLayer) return;

				// Only proceed once a *visible* anchor exists in the active layer.
				// The DraftingSection dynamic import renders `CampaignPageSkeleton`, which includes an
				// invisible bottom anchor for stability — but we still need to re-clamp once the real
				// DraftingSection DOM is mounted (it can shift based on loaded data).
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
				(document.querySelector('[data-campaign-view-layer="active"]') as HTMLElement | null) ??
				document.body;
			mo.observe(observeRoot, { childList: true, subtree: true });
		}
		window.addEventListener('resize', onResize, { passive: true });
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
			document.documentElement.style.removeProperty(CAMPAIGN_MAP_BACKDROP_START_VAR);
			if (scheduledRaf !== null) window.cancelAnimationFrame(scheduledRaf);
			io?.disconnect();
			mo?.disconnect();
			window.cancelAnimationFrame(rafId);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('pageshow', onPageShow);
		};
	}, [isMobile, updateCampaignZoomForViewport]);

	const searchParams = useSearchParams();
	const silentLoad = searchParams.get('silent') === '1';
	const originParam = searchParams.get('origin');
	const cameFromSearch = originParam === 'search';
	const tabParam = searchParams.get('tab');
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

		const searchName = campaign?.userContactLists?.[0]?.name || campaign?.name || '';
		const pendingSearch = searchName ? `[Booking] ${searchName}`.trim() : '';
		if (pendingSearch) {
			sessionStorage.setItem('murmur_pending_search', pendingSearch);
		}

		// Hard navigation: a soft router.push sometimes doesn't fully re-mount the
		// dashboard's map-search mode (especially mid-transition or with cached state),
		// so use window.location.assign for a reliable, fresh dashboard load.
		window.location.assign(
			`${urls.murmur.dashboard.index}?fromCampaignId=${campaign.id}`
		);
	}, [campaign]);

	// Navigation back to the dashboard's map/search view. Restores the user's last search
	// if we persisted one (see the URL-mirror effect in dashboard/page.tsx), otherwise drops
	// them into a default curated map view via the `pick=1` flag. Does NOT enter
	// "fromCampaign" / add-to-campaign mode and does NOT prefill any search query.
	const handleGoToDashboardSearch = useCallback(() => {
		if (typeof window === 'undefined') return;

		let lastSearch = '';
		try {
			lastSearch = localStorage.getItem('murmur_dashboard_last_search') || '';
		} catch {
			// localStorage may be unavailable — fall through to the curated default.
		}

		const query = lastSearch || 'pick=1';
		window.location.assign(`${urls.murmur.dashboard.index}?${query}`);
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
	
	// Determine initial view based on tab query parameter
	const getInitialView = (): ViewType => {
		if (tabParam === 'overview') return 'overview';
		if (tabParam === 'inbox') return 'inbox';
		if (tabParam === 'drafting') return 'drafting';
		// Sent is now a sub-view of Inbox (Inbox -> Sent)
		if (tabParam === 'sent') return 'inbox';
		// Legacy/deeplink support: the campaign no longer has in-page Contacts, Search, or All tabs.
		// The Write tab covers contact management; fall back there.
		if (tabParam === 'contacts' || tabParam === 'search' || tabParam === 'all') return 'testing';
		return 'testing';
	};
	
	const [activeView, setActiveViewInternal] = useState<ViewType>(getInitialView());
	// When the user switches tabs, DraftingSection swaps out and we need to (re)observe
	// the new bottom anchor(s) so the zoom clamp can auto-correct if they become clipped.
	useLayoutEffect(() => {
		refreshCampaignZoomAnchorObserversRef.current?.();
	}, [activeView]);
	const [draftOperationsProgress, setDraftOperationsProgress] = useState<{
		visible: boolean;
		operations: Array<{ current: number; total: number }>;
	}>({ visible: false, operations: [] });
	const getInitialInboxSentTab = (): InboxSentTab => {
		if (tabParam === 'sent') return 'sent';
		return 'inbox';
	};
	const [inboxSentTab, setInboxSentTab] = useState<InboxSentTab>(getInitialInboxSentTab());
	const [inboxSentTabRequest, setInboxSentTabRequest] = useState<InboxSentTabRequest | null>(() =>
		tabParam === 'sent' ? { tab: 'sent', requestId: 1 } : null
	);
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
	const [mapGrabUncategorizedActive, setMapGrabUncategorizedActive] = useState(true);
	const handleMapGrabUncategorizedActiveChange = useCallback((isActive: boolean) => {
		setMapGrabUncategorizedActive(isActive);
	}, []);
	const [mapZoomControlIndex, setMapZoomControlIndex] = useState(1);
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
			scheduleMapZoomControlRequest(getCampaignMapZoomForControlValue(safeLevelValue), true);
		},
		[scheduleMapZoomControlRequest]
	);
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
				pushMapZoomControlRequest(getCampaignMapZoomForControlValue(nextControlValue), true);
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
	const handleMapViewportZoom = useCallback((zoom: number) => {
		const nextControlValue = getCampaignMapZoomControlValueForZoom(zoom);
		mapZoomControlLiveRef.current?.setLevelValue(nextControlValue);
	}, []);
	const handleMapViewportIdle = useCallback((payload: { zoom: number }) => {
		const nextControlValue = getCampaignMapZoomControlValueForZoom(payload.zoom);
		setMapZoomControlIndex((current) =>
			Math.abs(current - nextControlValue) < 0.005 ? current : nextControlValue
		);
	}, []);

	useEffect(() => {
		return () => {
			if (mapZoomControlRequestRafRef.current != null) {
				window.cancelAnimationFrame(mapZoomControlRequestRafRef.current);
				mapZoomControlRequestRafRef.current = null;
			}
			pendingMapZoomControlRequestRef.current = null;
		};
	}, []);

	// In the thinnest "scrollable" campaign breakpoint, some nested scroll containers can trap
	// wheel/trackpad scroll (especially on Write + Inbox), making the page feel "stuck" unless the
	// cursor is positioned just right.
	//
	// This capture handler restores expected scroll behavior:
	// - If a nested scroll container under the cursor CAN scroll, let it.
	// - Otherwise, force the wheel gesture to scroll the PAGE.
	// - Never interfere with text inputs / editable fields.
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
				if (!html.classList.contains(CAMPAIGN_SCROLLABLE_CLASS)) return;
				// Limit to the views that were observed to trap scroll.
				if (!(activeView === 'testing' || activeView === 'inbox')) return;

				const target = e.target as HTMLElement | null;
				if (!target) return;
				if (isEditableTarget(target)) return;

				// Prefer native behavior when the immediate scroll container can handle it.
				const scrollParent = findScrollableAncestor(target);
				if (scrollParent && canScrollY(scrollParent, e.deltaY)) return;

				// Otherwise, force the wheel gesture to scroll the document.
				e.preventDefault();
				window.scrollBy({ top: e.deltaY, left: 0, behavior: 'auto' });
			} catch {
				// ignore
			}
		};

		window.addEventListener('wheel', onWheelCapture, { passive: false, capture: true });
		return () => {
			window.removeEventListener('wheel', onWheelCapture, true);
		};
	}, [activeView]);
	
	// State for top campaigns dropdown
	const [showTopCampaignsDropdown, setShowTopCampaignsDropdown] = useState(false);
	
	// State for right box icon selection ('info' or 'circle')
	const [selectedRightBoxIcon, setSelectedRightBoxIcon] = useState<'info' | 'circle'>('info');
	const topCampaignsDropdownRef = useRef<HTMLDivElement>(null);
	const topCampaignsFolderButtonRef = useRef<HTMLButtonElement>(null);

	// Dashboard Inbox popup (opened from the envelope icon in the top-right box)
	const DASHBOARD_INBOX_POPUP_WIDTH_PX = 625;
	const DASHBOARD_INBOX_POPUP_HEIGHT_PX = 561;
	// Position relative to the top search bar (so it matches design specs).
	const DASHBOARD_INBOX_POPUP_SEARCHBAR_LEFT_OFFSET_PX = 264;
	const DASHBOARD_INBOX_POPUP_SEARCHBAR_BOTTOM_GAP_PX = 26;
	const DASHBOARD_INBOX_POPUP_MARGIN_PX = 8;
	const [isDashboardInboxOpen, setIsDashboardInboxOpen] = useState(false);
	const [dashboardInboxSubtab, setDashboardInboxSubtab] = useState<'messages' | 'campaigns'>(
		'messages'
	);
	const dashboardInboxSearchbarRef = useRef<HTMLButtonElement>(null);
	const dashboardInboxTriggerRef = useRef<HTMLButtonElement>(null);
	const dashboardInboxPopupRef = useRef<HTMLDivElement>(null);
	const [dashboardInboxPosition, setDashboardInboxPosition] = useState<{
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

	const updateDashboardInboxPosition = useCallback(() => {
		if (typeof window === 'undefined') return;
		const trigger = dashboardInboxTriggerRef.current;
		if (!trigger) {
			// If the trigger is unmounted (e.g. narrow breakpoint), close the popup.
			setIsDashboardInboxOpen(false);
			setDashboardInboxPosition(null);
			return;
		}

		const anchor = dashboardInboxSearchbarRef.current ?? trigger;
		const zoom = getCampaignZoomFactor();
		const rect = anchor.getBoundingClientRect();
		const rectTop = rect.top / zoom;
		const rectLeft = rect.left / zoom;
		const rectBottom = rect.bottom / zoom;

		const viewportW = window.innerWidth / zoom;
		const viewportH = window.innerHeight / zoom;

		let left = rectLeft + DASHBOARD_INBOX_POPUP_SEARCHBAR_LEFT_OFFSET_PX;
		let top = rectBottom + DASHBOARD_INBOX_POPUP_SEARCHBAR_BOTTOM_GAP_PX;

		// If it would overflow below, try opening above the trigger.
		if (top + DASHBOARD_INBOX_POPUP_HEIGHT_PX + DASHBOARD_INBOX_POPUP_MARGIN_PX > viewportH) {
			const aboveTop =
				rectTop - DASHBOARD_INBOX_POPUP_SEARCHBAR_BOTTOM_GAP_PX - DASHBOARD_INBOX_POPUP_HEIGHT_PX;
			if (aboveTop >= DASHBOARD_INBOX_POPUP_MARGIN_PX) top = aboveTop;
		}

		left = Math.min(
			Math.max(left, DASHBOARD_INBOX_POPUP_MARGIN_PX),
			viewportW - DASHBOARD_INBOX_POPUP_WIDTH_PX - DASHBOARD_INBOX_POPUP_MARGIN_PX
		);
		top = Math.min(
			Math.max(top, DASHBOARD_INBOX_POPUP_MARGIN_PX),
			viewportH - DASHBOARD_INBOX_POPUP_HEIGHT_PX - DASHBOARD_INBOX_POPUP_MARGIN_PX
		);

		setDashboardInboxPosition({ top, left });
	}, [
		getCampaignZoomFactor,
		DASHBOARD_INBOX_POPUP_HEIGHT_PX,
		DASHBOARD_INBOX_POPUP_SEARCHBAR_BOTTOM_GAP_PX,
		DASHBOARD_INBOX_POPUP_SEARCHBAR_LEFT_OFFSET_PX,
		DASHBOARD_INBOX_POPUP_MARGIN_PX,
		DASHBOARD_INBOX_POPUP_WIDTH_PX,
	]);
	
	// Close dropdown when clicking outside (but not on the folder button itself)
	useEffect(() => {
		if (!showTopCampaignsDropdown) return;
		
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			// Don't close if clicking on the folder button (let the toggle handle it)
			if (topCampaignsFolderButtonRef.current?.contains(target)) {
				return;
			}
			if (
				topCampaignsDropdownRef.current &&
				!topCampaignsDropdownRef.current.contains(target)
			) {
				setShowTopCampaignsDropdown(false);
			}
		};
		
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [showTopCampaignsDropdown]);

	// Position the dashboard inbox popup as soon as it opens (pre-paint).
	useLayoutEffect(() => {
		if (!isDashboardInboxOpen) return;
		updateDashboardInboxPosition();
	}, [isDashboardInboxOpen, updateDashboardInboxPosition]);

	// Keep the dashboard inbox popup positioned on resize/scroll while open.
	useEffect(() => {
		if (!isDashboardInboxOpen) return;
		const handleViewportChange = () => updateDashboardInboxPosition();
		window.addEventListener('resize', handleViewportChange);
		window.addEventListener('scroll', handleViewportChange, true);
		return () => {
			window.removeEventListener('resize', handleViewportChange);
			window.removeEventListener('scroll', handleViewportChange, true);
		};
	}, [isDashboardInboxOpen, updateDashboardInboxPosition]);

	// Close the dashboard inbox popup on outside click / Escape.
	useEffect(() => {
		if (!isDashboardInboxOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			if (dashboardInboxTriggerRef.current?.contains(target)) return;
			if (dashboardInboxPopupRef.current && !dashboardInboxPopupRef.current.contains(target)) {
				setIsDashboardInboxOpen(false);
				setDashboardInboxPosition(null);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			setIsDashboardInboxOpen(false);
			setDashboardInboxPosition(null);
		};

		document.addEventListener('mousedown', handleClickOutside);
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [isDashboardInboxOpen]);
	
	// Track previous view for crossfade transitions
	const [previousView, setPreviousView] = useState<ViewType | null>(null);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [isFadingOutPreviousView, setIsFadingOutPreviousView] = useState(false);
	const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const maxWaitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const crossfadeContainerRef = useRef<HTMLDivElement>(null);
	const headerBoxMoveCleanupRef = useRef<(() => void) | null>(null);
	const contactsDraftsPillMoveCleanupRef = useRef<(() => void) | null>(null);
	const isSafari = useMemo(() => isSafariBrowser(), []);

	// Mobile never supports the Writing ("testing") tab. Clamp immediately so we never mount
	// HybridPromptInput on mobile (and never transition through it).
	const MOBILE_ALLOWED_VIEWS: Array<'drafting' | 'inbox'> = [
		'drafting',
		'inbox',
	];
	useLayoutEffect(() => {
		if (isMobile !== true) return;
		if (MOBILE_ALLOWED_VIEWS.includes(activeView as (typeof MOBILE_ALLOWED_VIEWS)[number])) return;

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
	const setActiveView = useCallback((newView: ViewType) => {
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

		// Safari: disable the Inbox tab transition animation (it breaks badly in WebKit).
		// We keep the animation for Chrome/Chromium.
		if (isSafari && (activeView === 'inbox' || newView === 'inbox')) {
			// Stop any in-flight shared-element animations so we don't leave "ghost" nodes behind.
			if (headerBoxMoveCleanupRef.current) {
				headerBoxMoveCleanupRef.current();
				headerBoxMoveCleanupRef.current = null;
			}
			if (contactsDraftsPillMoveCleanupRef.current) {
				contactsDraftsPillMoveCleanupRef.current();
				contactsDraftsPillMoveCleanupRef.current = null;
			}

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
	}, [activeView, isMobile, isSafari, MOBILE_ALLOWED_VIEWS, requestInboxSentTab]);

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

	// Shared-element move for the CampaignHeaderBox when tab layouts change.
	// This is intentionally driven by the same fade-start signal so timing matches other tab transitions.
	useLayoutEffect(() => {
		if (!isFadingOutPreviousView) return;
		if (!previousView) return;
		if (typeof window === 'undefined') return;

		// Cleanup any in-flight header animation.
		if (headerBoxMoveCleanupRef.current) {
			headerBoxMoveCleanupRef.current();
			headerBoxMoveCleanupRef.current = null;
		}

		// Respect reduced motion.
		if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

		const container = crossfadeContainerRef.current;
		if (!container) return;

		const activeRoot = container.querySelector(
			'[data-campaign-view-layer="active"]'
		) as HTMLElement | null;
		const previousRoot = container.querySelector(
			'[data-campaign-view-layer="previous"]'
		) as HTMLElement | null;
		if (!activeRoot || !previousRoot) return;

		const findVisibleHeader = (root: HTMLElement): HTMLElement | null => {
			const candidates = Array.from(
				root.querySelectorAll('[data-campaign-header-box]')
			) as HTMLElement[];
			for (const el of candidates) {
				const rect = el.getBoundingClientRect();
				if (rect.width > 1 && rect.height > 1) return el;
			}
			return null;
		};

		const fromHeader = findVisibleHeader(previousRoot);
		const toHeader = findVisibleHeader(activeRoot);
		if (!fromHeader || !toHeader) return;

		const fromRect = fromHeader.getBoundingClientRect();
		const toRect = toHeader.getBoundingClientRect();
		if (fromRect.width <= 1 || fromRect.height <= 1 || toRect.width <= 1 || toRect.height <= 1) {
			return;
		}

		// Account for any CSS zoom applied to the root element (keeps the ghost aligned at non-1 zoom).
		const zoomStr = window.getComputedStyle(document.documentElement).zoom;
		const zoom = zoomStr ? parseFloat(zoomStr) : 1;
		const z = zoom || 1;

		const dx = (toRect.left - fromRect.left) / z;
		const dy = (toRect.top - fromRect.top) / z;
		// If the header didn't move, don't do anything (avoids flicker on same-layout tab switches).
		if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

		const ghost = fromHeader.cloneNode(true) as HTMLElement;
		ghost.setAttribute('data-campaign-header-box-ghost', 'true');
		ghost.style.position = 'fixed';
		ghost.style.left = `${fromRect.left / z}px`;
		ghost.style.top = `${fromRect.top / z}px`;
		ghost.style.right = 'auto';
		ghost.style.bottom = 'auto';
		ghost.style.margin = '0';
		ghost.style.zIndex = '99999';
		ghost.style.pointerEvents = 'none';
		ghost.style.willChange = 'transform';
		ghost.style.transform = 'translate3d(0px, 0px, 0px)';

		// Ensure the ghost uses the measured box size (avoid sublayout style differences).
		ghost.style.width = `${fromRect.width / z}px`;
		ghost.style.height = `${fromRect.height / z}px`;
		ghost.style.maxWidth = `${fromRect.width / z}px`;
		ghost.style.maxHeight = `${fromRect.height / z}px`;

		// Hide the real headers during the move to avoid "double header" artifacts.
		const prevFromOpacity = fromHeader.style.opacity;
		const prevFromPointerEvents = fromHeader.style.pointerEvents;
		const prevToOpacity = toHeader.style.opacity;
		const prevToPointerEvents = toHeader.style.pointerEvents;
		fromHeader.style.opacity = '0';
		fromHeader.style.pointerEvents = 'none';
		toHeader.style.opacity = '0';
		toHeader.style.pointerEvents = 'none';

		document.body.appendChild(ghost);

		const animation = ghost.animate(
			[
				{ transform: 'translate3d(0px, 0px, 0px)' },
				{ transform: `translate3d(${dx}px, ${dy}px, 0px)` },
			],
			{
				duration: TRANSITION_DURATION,
				easing: 'ease-out',
				fill: 'forwards',
			}
		);

		const cleanup = () => {
			try {
				animation.cancel();
			} catch {
				// no-op
			}
			ghost.remove();
			fromHeader.style.opacity = prevFromOpacity;
			fromHeader.style.pointerEvents = prevFromPointerEvents;
			toHeader.style.opacity = prevToOpacity;
			toHeader.style.pointerEvents = prevToPointerEvents;
		};

		headerBoxMoveCleanupRef.current = cleanup;

		animation.onfinish = () => {
			ghost.remove();
			// Reveal the destination header.
			toHeader.style.opacity = prevToOpacity;
			toHeader.style.pointerEvents = prevToPointerEvents;
			// Restore the previous header (it's about to be fully faded out / unmounted anyway).
			fromHeader.style.opacity = prevFromOpacity;
			fromHeader.style.pointerEvents = prevFromPointerEvents;
			headerBoxMoveCleanupRef.current = null;
		};

		return cleanup;
	}, [activeView, isFadingOutPreviousView, previousView]);

	// Shared-element move for the Drafts/Sent table header pill when switching between those tabs.
	// This uses the same fade-start signal and duration so the slide is perfectly synced to the tab fade.
	useLayoutEffect(() => {
		if (!isFadingOutPreviousView) return;
		if (!previousView) return;
		if (typeof window === 'undefined') return;

		// Cleanup any in-flight pill animation.
		if (contactsDraftsPillMoveCleanupRef.current) {
			contactsDraftsPillMoveCleanupRef.current();
			contactsDraftsPillMoveCleanupRef.current = null;
		}

		const pillViews: ViewType[] = ['drafting', 'sent'];
		const shouldAnimatePill =
			pillViews.includes(previousView) &&
			pillViews.includes(activeView) &&
			previousView !== activeView;
		if (!shouldAnimatePill) return;

		// Respect reduced motion.
		if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

		const container = crossfadeContainerRef.current;
		if (!container) return;

		const activeRoot = container.querySelector(
			'[data-campaign-view-layer="active"]'
		) as HTMLElement | null;
		const previousRoot = container.querySelector(
			'[data-campaign-view-layer="previous"]'
		) as HTMLElement | null;
		if (!activeRoot || !previousRoot) return;

		const boxIdForView = (v: ViewType) => (v === 'drafting' ? 'drafts' : v);

		const findVisiblePill = (root: HTMLElement, v: ViewType): HTMLElement | null => {
			const boxId = boxIdForView(v);
			const mainBox = root.querySelector(
				`[data-campaign-main-box="${boxId}"]`
			) as HTMLElement | null;
			if (!mainBox) return null;

			const candidates = Array.from(
				mainBox.querySelectorAll('[data-campaign-shared-pill="campaign-tabs-pill"]')
			) as HTMLElement[];
			for (const el of candidates) {
				const rect = el.getBoundingClientRect();
				if (rect.width > 1 && rect.height > 1) return el;
			}
			return null;
		};

		const fromPill = findVisiblePill(previousRoot, previousView);
		const toPill = findVisiblePill(activeRoot, activeView);
		if (!fromPill || !toPill) return;

		const fromRect = fromPill.getBoundingClientRect();
		const toRect = toPill.getBoundingClientRect();
		if (
			fromRect.width <= 1 ||
			fromRect.height <= 1 ||
			toRect.width <= 1 ||
			toRect.height <= 1
		) {
			return;
		}

		// Account for any CSS zoom applied to the root element (keeps the ghost aligned at non-1 zoom).
		const zoomStr = window.getComputedStyle(document.documentElement).zoom;
		const zoom = zoomStr ? parseFloat(zoomStr) : 1;
		const z = zoom || 1;

		const dx = (toRect.left - fromRect.left) / z;
		const dy = (toRect.top - fromRect.top) / z;
		// If the pill didn't move, don't do anything (avoids flicker on same-layout tab switches).
		if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

		// Two ghosts: crossfade the Contacts and Drafts pills mid-flight so label/colors don't snap.
		const ghostFrom = fromPill.cloneNode(true) as HTMLElement;
		const ghostTo = toPill.cloneNode(true) as HTMLElement;
		ghostFrom.setAttribute('data-campaign-shared-pill-ghost', 'from');
		ghostTo.setAttribute('data-campaign-shared-pill-ghost', 'to');

		const initGhost = (ghostEl: HTMLElement) => {
			ghostEl.style.position = 'fixed';
			ghostEl.style.left = `${fromRect.left / z}px`;
			ghostEl.style.top = `${fromRect.top / z}px`;
			ghostEl.style.right = 'auto';
			ghostEl.style.bottom = 'auto';
			ghostEl.style.margin = '0';
			ghostEl.style.zIndex = '99999';
			ghostEl.style.pointerEvents = 'none';
			ghostEl.style.willChange = 'transform, opacity';
			ghostEl.style.transform = 'translate3d(0px, 0px, 0px)';

			// Ensure the ghost uses the measured box size (avoid sublayout style differences).
			ghostEl.style.width = `${fromRect.width / z}px`;
			ghostEl.style.height = `${fromRect.height / z}px`;
			ghostEl.style.maxWidth = `${fromRect.width / z}px`;
			ghostEl.style.maxHeight = `${fromRect.height / z}px`;
		};
		initGhost(ghostFrom);
		initGhost(ghostTo);
		ghostFrom.style.opacity = '1';
		ghostTo.style.opacity = '0';

		// Hide the real pills during the move to avoid "double pill" artifacts.
		const prevFromOpacity = fromPill.style.opacity;
		const prevFromPointerEvents = fromPill.style.pointerEvents;
		const prevToOpacity = toPill.style.opacity;
		const prevToPointerEvents = toPill.style.pointerEvents;
		fromPill.style.opacity = '0';
		fromPill.style.pointerEvents = 'none';
		toPill.style.opacity = '0';
		toPill.style.pointerEvents = 'none';

		document.body.appendChild(ghostFrom);
		document.body.appendChild(ghostTo);

		const transformKeyframes: Keyframe[] = [
			{ transform: 'translate3d(0px, 0px, 0px)' },
			{ transform: `translate3d(${dx}px, ${dy}px, 0px)` },
		];
		const transformTiming: KeyframeAnimationOptions = {
			duration: TRANSITION_DURATION,
			easing: 'ease-out',
			fill: 'forwards',
		};

		// Concentrate the crossfade in the middle of the travel (avoid end-snap).
		const opacityKeyframesFrom: Keyframe[] = [
			{ opacity: 1, offset: 0 },
			{ opacity: 1, offset: 0.3 },
			{ opacity: 0, offset: 0.7 },
			{ opacity: 0, offset: 1 },
		];
		const opacityKeyframesTo: Keyframe[] = [
			{ opacity: 0, offset: 0 },
			{ opacity: 0, offset: 0.3 },
			{ opacity: 1, offset: 0.7 },
			{ opacity: 1, offset: 1 },
		];
		const opacityTiming: KeyframeAnimationOptions = {
			duration: TRANSITION_DURATION,
			easing: 'linear',
			fill: 'forwards',
		};

		const anims: Animation[] = [
			ghostFrom.animate(transformKeyframes, transformTiming),
			ghostTo.animate(transformKeyframes, transformTiming),
			ghostFrom.animate(opacityKeyframesFrom, opacityTiming),
			ghostTo.animate(opacityKeyframesTo, opacityTiming),
		];

		const cleanup = () => {
			try {
				for (const a of anims) a.cancel();
			} catch {
				// no-op
			}
			ghostFrom.remove();
			ghostTo.remove();
			fromPill.style.opacity = prevFromOpacity;
			fromPill.style.pointerEvents = prevFromPointerEvents;
			toPill.style.opacity = prevToOpacity;
			toPill.style.pointerEvents = prevToPointerEvents;
		};

		contactsDraftsPillMoveCleanupRef.current = cleanup;

		// Use the "to" opacity animation as the completion signal (same duration as the fade).
		anims[3].onfinish = () => {
			ghostFrom.remove();
			ghostTo.remove();
			// Reveal the destination pill.
			toPill.style.opacity = prevToOpacity;
			toPill.style.pointerEvents = prevToPointerEvents;
			// Restore the previous pill (it's about to be fully faded out / unmounted anyway).
			fromPill.style.opacity = prevFromOpacity;
			fromPill.style.pointerEvents = prevFromPointerEvents;
			contactsDraftsPillMoveCleanupRef.current = null;
		};

		return cleanup;
	}, [activeView, isFadingOutPreviousView, previousView]);
	
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
			const varZoomStr = window.getComputedStyle(html).getPropertyValue(CAMPAIGN_ZOOM_VAR);
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
	const contactListIds = campaign?.userContactLists?.map((l) => l.id) || [];
	const { data: campaignMapContacts, isLoading: isCampaignMapContactsLoading } = useGetContacts({
		filters: { contactListIds },
		enabled: contactListIds.length > 0 && !isMobile,
	});
	const { data: headerEmails } = useGetEmails({
		filters: { campaignId: campaign?.id },
		enabled: !!campaign?.id && isNarrowestDesktop && !isMobile,
	});

	// Compute header metrics
	const headerContactsCount = campaignMapContacts?.length || 0;
	const headerDraftCount = (headerEmails || []).filter((e) => e.status === EmailStatus.draft).length;
	const headerSentCount = (headerEmails || []).filter((e) => e.status === EmailStatus.sent).length;
	const headerToListNames = campaign?.userContactLists?.map((list) => list.name).join(', ') || '';
	const headerFromName = campaign?.identity?.name || '';

	const campaignMapContactsForMap = useMemo(
		() =>
			(campaignMapContacts || []).filter((contact) => {
				const categoryIndex = getMapSelectGrabCategoryIndexFromContactTitle(
					contact.curatedDisplayLabel || contact.title || contact.headline || ''
				);
				if (categoryIndex >= 0) {
					return mapGrabActiveCategories[categoryIndex] !== false;
				}
				return mapGrabUncategorizedActive;
			}),
		[campaignMapContacts, mapGrabActiveCategories, mapGrabUncategorizedActive]
	);

	const persistentCampaignMapProps = useMemo<SearchResultsMapProps>(
		() => ({
			weatherMood: globeWeatherMood,
			weatherRegionCenter: globeWeatherRegionCenter,
			weatherTemperatureF: globeWeatherTemperatureF,
			nightLighting: globeNightLighting,
			presentation: 'interactive',
			autoSpin: false,
			contacts: campaignMapContactsForMap,
			selectedContacts: [],
			activeTool: activeMapTool,
			requestedZoom: mapZoomControlRequest,
			onViewportZoom: handleMapViewportZoom,
			onViewportIdle: handleMapViewportIdle,
			isLoading: isCampaignMapContactsLoading,
			skipAutoFit: true,
		}),
		[
			activeMapTool,
			campaignMapContactsForMap,
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
		return () => {
			setPersistentMapConfig(null);
		};
	}, [setPersistentMapConfig]);

	const usePersistentCampaignMapBackground = !isMobile && activeView !== 'overview';

	// Tab navigation order
	const tabOrder: ViewType[] = [
		'testing',
		'overview',
		'inbox',
		'drafting',
	];

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
	const mobileTabOrder: Array<'drafting' | 'inbox'> = [
		'drafting',
		'inbox',
	];

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
			if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

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
				{silentLoad || isMobile === null ? null : <CampaignPageSkeleton />}
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

	// Writing + Drafts + Sent + Inbox tab vertical alignment:
	// Place the top of the main content box exactly 159px from the top of the page
	// (only in the standard desktop header layout).
	//
	// Notes:
	// - The campaign header row is a fixed 50px tall.
	// - DraftingSection contains a small 4px spacer div at the very top (mb-[4px]).
	const WRITING_BOX_TOP_PX = 159;
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
			{/* Top navigation box (ported from dashboard map view).
			    Translucent backdrop + 5-tab row (Search / Write / [campaign chip] / Send / Inbox)
			    + empty outline boxes flanking a center search pill. Desktop only. */}
			{!isMobile && (() => {
				// Constants mirror dashboard/page.tsx:3879-3924 so visual proportions match.
				const MAP_VIEW_UI_SCALE = 0.85;
				const MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX = 49;
				const MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX = 440;
				const MAP_VIEW_TOP_BACKDROP_BOX_TOP_PX = 9;
				const MAP_VIEW_TOP_BACKDROP_BOX_WIDTH_PX = Math.round(
					MAP_VIEW_SEARCH_BAR_OUTER_WIDTH_PX * (804 / 488.204)
				);
				const MAP_VIEW_TOP_BACKDROP_BOX_HEIGHT_PX = Math.round(
					MAP_VIEW_SEARCH_BAR_INPUT_HEIGHT_PX * (102 / 54)
				);
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
				const CAMPAIGN_MAP_TOP_TABS_VISUAL_WIDTH_PX = 560;
				const CAMPAIGN_MAP_TOP_TABS_WIDTH_PX = Math.round(
					CAMPAIGN_MAP_TOP_TABS_VISUAL_WIDTH_PX / MAP_VIEW_UI_SCALE
				);

				const campaignName = campaign?.name || 'Campaign';

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

						{/* Tabs row: Search / Write / [campaign chip] / Send / Inbox */}
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
										style={inactiveTabStyle(activeView === 'drafting')}
										onClick={() => setActiveView('drafting')}
									>
										Send
									</button>
									<button
										type="button"
										className="bg-transparent p-0 m-0 border-0 cursor-pointer inline-flex items-center justify-center h-full translate-y-[2px]"
										style={inactiveTabStyle(activeView === 'inbox')}
										onClick={() => setActiveView('inbox')}
									>
										Inbox
									</button>
								</div>
							</div>
						</div>

						{/* Center pill — 5-icon action row (campaign view variant) */}
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
									backgroundColor: '#FFFFFF',
									boxSizing: 'border-box',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-around',
									padding: '0 32px',
									color: '#050505',
								}}
							>
								{(
									[
										{ key: 'playbook', Icon: DashboardActionBarPlaybookIcon, label: 'Playbook', width: 24, height: 20 },
										{ key: 'folder', Icon: DashboardActionBarFolderIcon, label: 'Folder', width: 24, height: 14 },
										{ key: 'search', Icon: SearchIconDesktop, label: 'Search', width: 22, height: 22 },
										{ key: 'star', Icon: DashboardActionBarStarIcon, label: 'Starred', width: 22, height: 21 },
										{ key: 'envelope', Icon: DashboardActionBarEnvelopeIcon, label: 'Messages', width: 22, height: 14 },
									] as const
								).map(({ key, Icon, label, width, height }) => (
									<button
										key={key}
										type="button"
										aria-label={label}
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
											opacity: 0.55,
											transition: 'opacity 150ms ease',
										}}
									>
										<Icon width={width} height={height} />
									</button>
								))}
							</div>
						</div>
					</>
				);
			})()}

			{!isMobile && activeView === 'overview' && (
				<div
					data-campaign-interactive-surface
					className="fixed z-[130] pointer-events-none"
					style={{
						left: `${CAMPAIGN_MAP_SELECT_GRAB_LEFT_PX}px`,
						top: `calc((100dvh - ${
							CAMPAIGN_MAP_SELECT_GRAB_TOTAL_HEIGHT_PX *
							CAMPAIGN_MAP_SELECT_GRAB_VIEW_SCALE
						}px) / 2 + ${
							CAMPAIGN_MAP_SELECT_GRAB_TOP_EXTENT_PX *
							CAMPAIGN_MAP_SELECT_GRAB_VIEW_SCALE
						}px)`,
						transform: `scale(${CAMPAIGN_MAP_SELECT_GRAB_VIEW_SCALE})`,
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
								maskImage: 'linear-gradient(to right, black 60%, transparent 95%)',
								WebkitMaskImage: 'linear-gradient(to right, black 60%, transparent 95%)',
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
									'font-inter text-[13px] font-medium leading-none bg-[#FFE3AA] border cursor-pointer rounded-full px-3 py-1',
									activeView === 'drafting'
										? 'text-black border-black'
										: 'text-[#6B6B6B] border-transparent hover:text-black hover:border-black'
								)}
								onClick={() => setActiveView('drafting')}
							>
								{headerDraftCount.toString().padStart(2, '0')} Drafts
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
						className={cn('flex justify-center', !shouldApplyWritingTopShift && 'mt-6')}
						style={
							shouldApplyWritingTopShift
								? { marginTop: `${writingContentTopMarginPx}px` }
								: undefined
						}
					>
						{/* Crossfade transition container */}
						<div ref={crossfadeContainerRef} className="relative w-full isolate">
							{/* Determine if both views share the same research panel position */}
							{(() => {
								const standardPositionTabs: ViewType[] = ['testing', 'drafting', 'sent'];
								// Only apply the "stable research panel" treatment during the actual fade,
								// not while we're waiting for the destination view to paint.
								const bothSharePosition = isFadingOutPreviousView && previousView && 
									standardPositionTabs.includes(previousView) && 
									standardPositionTabs.includes(activeView);
								
								return (
									<>
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
												isTransitioningIn={bothSharePosition ?? undefined}
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
													isTransitioningOut={bothSharePosition ?? undefined}
												/>
											</div>
										)}
									</>
								);
							})()}
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
						.campaign-map-interactive-page [data-campaign-bottom-anchor],
						.campaign-map-interactive-page [data-draft-button-container],
						.campaign-map-interactive-page [data-draft-review-side-preview],
						.campaign-map-interactive-page [data-left-expanded-panel],
						.campaign-map-interactive-page [role='dialog'] {
							pointer-events: auto;
						}

						.campaign-map-split-overlay {
							position: fixed;
							inset: 0;
							z-index: 0;
							pointer-events: none;
							background: linear-gradient(
								to right,
								rgba(136, 136, 136, 0) 0%,
								rgba(136, 136, 136, 0)
									var(${CAMPAIGN_MAP_BACKDROP_START_VAR}, 33.333%),
								rgba(136, 136, 136, 0.1)
									var(${CAMPAIGN_MAP_BACKDROP_START_VAR}, 33.333%),
								rgba(136, 136, 136, 0.1) 100%
							);
						}

						.campaign-persistent-map-page [data-slot='campaign-top-box-wrapper'],
						.campaign-persistent-map-page [data-slot='campaign-header'],
						.campaign-persistent-map-page [data-slot='campaign-content'] {
							transform: translateX(
									var(${CAMPAIGN_MAP_SHIFT_X_VAR}, ${CAMPAIGN_MAP_FALLBACK_SHIFT_X_PX}px)
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
						.campaign-persistent-map-page [data-slot='campaign-top-search-bar'] {
							transform: translateX(
								var(${CAMPAIGN_MAP_SHIFT_X_VAR}, ${CAMPAIGN_MAP_FALLBACK_SHIFT_X_PX}px)
							);
						}

						/* View transition animations - smooth, clean crossfade */
						@keyframes viewFadeIn {
							0% {
								opacity: 0;
							}
							100% {
								opacity: 1;
							}
						}
						
						@keyframes viewFadeOut {
							0% {
								opacity: 1;
							}
							100% {
								opacity: 0;
							}
						}
						
						/* Animation for transitions where research panel should stay stable
						   The container stays at full opacity so the research panel doesn't fade,
						   but we use CSS to fade in the rest of the content */
						@keyframes viewFadeInStableResearch {
							0% {
								opacity: 1;
							}
							100% {
								opacity: 1;
							}
						}
						
						/* When using stable research transition, fade the main content instead */
						[data-research-panel-container] {
							/* Research panel container - stays stable */
						}
						
						/* Fade in non-research-panel content when transitioning */
						.view-fade-in-content > *:not([data-research-panel-container]) {
							animation: viewFadeIn ${TRANSITION_DURATION}ms ease-out forwards;
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
							body.murmur-mobile [data-hpi-left-panel]:has([data-block-type='full']) {
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
							body.murmur-mobile [data-test-preview-wrapper] [data-test-preview-panel] {
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
							body.murmur-mobile [data-hpi-signature-card] [data-slot='form-label'] {
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
				</div>
				</CampaignTopSearchHighlightProvider>
			</HoverDescriptionProvider>
		</CampaignDeviceProvider>
	);
};

export default Murmur;

