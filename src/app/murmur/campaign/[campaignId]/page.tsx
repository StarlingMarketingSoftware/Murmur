'use client';

// Force server-rendering (no static path generation) to avoid Clerk chunk build errors
export const dynamic = 'force-dynamic';

import { useCampaignDetail } from './useCampaignDetail';
import type { DraftingSectionView } from './DraftingSection/useDraftingSection';
import { CampaignPageSkeleton } from '@/components/molecules/CampaignPageSkeleton/CampaignPageSkeleton';
import { useRouter, useSearchParams } from 'next/navigation';
import { urls } from '@/constants/urls';
import Link from 'next/link';
import { cn } from '@/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMe } from '@/hooks/useMe';
import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import LeftArrow from '@/components/atoms/_svg/LeftArrow';
import RightArrow from '@/components/atoms/_svg/RightArrow';
import BottomArrowIcon from '@/components/atoms/_svg/BottomArrowIcon';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import SearchMap from '@/components/atoms/_svg/SearchMap';
import BottomFolderIcon from '@/components/atoms/_svg/BottomFolderIcon';
import BottomHomeIcon from '@/components/atoms/_svg/BottomHomeIcon';
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

type ViewType = 'contacts' | 'testing' | 'drafting' | 'sent' | 'inbox' | 'all';

// Transition duration in ms - fast enough to feel instant, still smooth
const TRANSITION_DURATION = 180;
// Safety valve: if a destination view is unusually slow to paint, don't block the transition forever.
const MAX_TRANSITION_WAIT_MS = 650;

const SIXTEEN_BY_TEN_ZOOM_MATCH_TOLERANCE_PX = 50;

// 16:10 resolution-specific zoom levels: [width, height] → zoom
const SIXTEEN_BY_TEN_ZOOM_MAP: Array<{ w: number; h: number; zoom: number }> = [
	{ w: 1152, h: 720, zoom: 0.52 },
	{ w: 1280, h: 800, zoom: 0.6 },
	{ w: 1440, h: 900, zoom: 0.7 },
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

const CampaignRightPanel = nextDynamic(
	() =>
		import('@/components/organisms/CampaignRightPanel/CampaignRightPanel').then(
			(mod) => mod.CampaignRightPanel
		),
	{}
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
	const router = useRouter();
	const isMobile = useIsMobile();
	const CAMPAIGN_COMPACT_CLASS = 'murmur-campaign-compact';
	const CAMPAIGN_ZOOM_VAR = '--murmur-campaign-zoom';
	const DEFAULT_CAMPAIGN_ZOOM = 0.85;
	const CAMPAIGN_ZOOM_EVENT = 'murmur:campaign-zoom-changed';

	// Resolution-aware zoom calculation for campaign page
	const updateCampaignZoomForViewport = useCallback(() => {
		if (typeof window === 'undefined') return;

		const html = document.documentElement;
		const viewportH = window.visualViewport?.height ?? window.innerHeight;
		const viewportW = window.visualViewport?.width ?? window.innerWidth;
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

		// If the viewport height shrinks (e.g. Dock/taskbar visible), clamp zoom so the bottom panels
		// remain fully visible. This is applied only when we'd otherwise clip content.
		//
		// Important: on short viewports (e.g. ~740px tall) this can demand an overly aggressive zoom
		// reduction (making the whole UI feel "tiny"). In those cases, we cap how far we shrink and
		// prefer allowing vertical scroll rather than destroying readability.
		try {
			const anchors = Array.from(
				document.querySelectorAll<HTMLElement>('[data-campaign-bottom-anchor]')
			);
			if (anchors.length > 0) {
				const computed = window.getComputedStyle(html);
				const zoomStr = computed.zoom;
				const parsedZoom = zoomStr ? parseFloat(zoomStr) : NaN;
				const varZoomStr = computed.getPropertyValue(CAMPAIGN_ZOOM_VAR);
				const parsedVarZoom = varZoomStr ? parseFloat(varZoomStr) : NaN;
				const currentZoom =
					Number.isFinite(parsedZoom) && parsedZoom > 0 && parsedZoom !== 1
						? parsedZoom
						: Number.isFinite(parsedVarZoom) && parsedVarZoom > 0
							? parsedVarZoom
							: DEFAULT_CAMPAIGN_ZOOM;

				const maxBottomPx = anchors.reduce((acc, el) => {
					const rect = el.getBoundingClientRect();
					return Math.max(acc, rect.bottom);
				}, 0);

				// Reserve a small safety margin so we're not "flush" to the bottom edge.
				// On short viewports (e.g. when macOS Dock is visible) we use a smaller margin
				// to avoid forcing the entire UI to scale down too much.
				const SAFE_BOTTOM_MARGIN_PX = viewportH <= 780 ? 8 : 24;
				// Soft clamp: shrink to fit only up to a point; beyond that, prefer scroll over
				// making the entire UI unreadably small/large swings on resize.
				const RELATIVE_MIN_DOCK_CLAMP_RATIO = viewportH <= 780 ? 0.95 : 0.9;
				const ABSOLUTE_MIN_DOCK_CLAMP_ZOOM = 0.5;
				const minDockClampZoom = Math.max(
					ABSOLUTE_MIN_DOCK_CLAMP_ZOOM,
					targetZoom * RELATIVE_MIN_DOCK_CLAMP_RATIO
				);
				const availableH = Math.max(0, viewportH - SAFE_BOTTOM_MARGIN_PX);
				if (currentZoom > 0 && maxBottomPx > availableH) {
					const unscaledBottomPx = maxBottomPx / currentZoom;
					const maxZoomToFit = unscaledBottomPx > 0 ? availableH / unscaledBottomPx : NaN;
					if (Number.isFinite(maxZoomToFit) && maxZoomToFit > 0) {
						targetZoom = Math.min(targetZoom, Math.max(maxZoomToFit, minDockClampZoom));
					}
				}
			}
		} catch {
			// no-op
		}

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
			});
		}

		try {
			window.dispatchEvent(
				new CustomEvent(CAMPAIGN_ZOOM_EVENT, { detail: { zoom: targetZoom } })
			);
		} catch {
			// no-op
		}
	}, []);

	// Make the campaign page render slightly "zoomed out" on desktop (85%),
	// without changing the rest of the Murmur app.
	useEffect(() => {
		// Avoid running until we know whether this is a real mobile device.
		if (isMobile === null) return;

		// Never shrink the mobile campaign UI (it's already heavily tuned).
		if (isMobile) {
			document.documentElement.classList.remove(CAMPAIGN_COMPACT_CLASS);
			document.documentElement.style.removeProperty(CAMPAIGN_ZOOM_VAR);
			return;
		}

		document.documentElement.classList.add(CAMPAIGN_COMPACT_CLASS);

		const onResize = () => updateCampaignZoomForViewport();
		updateCampaignZoomForViewport();
		// Re-run once the drafting UI mounts so the bottom-panels clamp can measure real DOM.
		// (DraftingSection is dynamically imported, so it may not exist on the first call.)
		let mo: MutationObserver | null = null;
		if (typeof MutationObserver !== 'undefined') {
			mo = new MutationObserver(() => {
				const hasAnchors = Boolean(document.querySelector('[data-campaign-bottom-anchor]'));
				if (!hasAnchors) return;
				requestAnimationFrame(() => updateCampaignZoomForViewport());
				mo?.disconnect();
			});
			mo.observe(document.body, { childList: true, subtree: true });
		}
		window.addEventListener('resize', onResize, { passive: true });
		window.visualViewport?.addEventListener('resize', onResize);

		return () => {
			document.documentElement.classList.remove(CAMPAIGN_COMPACT_CLASS);
			document.documentElement.style.removeProperty(CAMPAIGN_ZOOM_VAR);
			mo?.disconnect();
			window.removeEventListener('resize', onResize);
			window.visualViewport?.removeEventListener('resize', onResize);
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
	const [isDraftsTabHighlighted, setDraftsTabHighlighted] = useState(false);
	const [isInboxTabHighlighted, setInboxTabHighlighted] = useState(false);
	const [isWriteTabHighlighted, setWriteTabHighlighted] = useState(false);
	const topSearchHighlightCtx = useMemo(
		() => ({
			isTopSearchHighlighted,
			setTopSearchHighlighted,
			isDraftsTabHighlighted,
			setDraftsTabHighlighted,
			isInboxTabHighlighted,
			setInboxTabHighlighted,
			isWriteTabHighlighted,
			setWriteTabHighlighted,
		}),
		[
			isTopSearchHighlighted,
			isDraftsTabHighlighted,
			isInboxTabHighlighted,
			isWriteTabHighlighted,
		]
	);

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
		if (tabParam === 'inbox') return 'inbox';
		if (tabParam === 'contacts') return 'contacts';
		if (tabParam === 'drafting') return 'drafting';
		if (tabParam === 'sent') return 'sent';
		// Legacy/deeplink support: the campaign no longer has an in-page Search tab.
		// If someone lands on ?tab=search, fall back to Contacts.
		if (tabParam === 'search') return 'contacts';
		if (tabParam === 'all') return 'all';
		return 'testing';
	};
	
	const [activeView, setActiveViewInternal] = useState<ViewType>(getInitialView());
	
	// State for top campaigns dropdown
	const [showTopCampaignsDropdown, setShowTopCampaignsDropdown] = useState(false);
	
	// State for right box icon selection ('info' or 'circle')
	const [selectedRightBoxIcon, setSelectedRightBoxIcon] = useState<'info' | 'circle'>('info');
	const topCampaignsDropdownRef = useRef<HTMLDivElement>(null);
	const topCampaignsFolderButtonRef = useRef<HTMLButtonElement>(null);
	
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
	
	// Track previous view for crossfade transitions
	const [previousView, setPreviousView] = useState<ViewType | null>(null);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [isFadingOutPreviousView, setIsFadingOutPreviousView] = useState(false);
	const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const maxWaitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const crossfadeContainerRef = useRef<HTMLDivElement>(null);
	const headerBoxMoveCleanupRef = useRef<(() => void) | null>(null);
	const contactsDraftsPillMoveCleanupRef = useRef<(() => void) | null>(null);

	// Mobile never supports the Writing ("testing") or All tabs. Clamp immediately so we never mount
	// HybridPromptInput on mobile (and never transition through it).
	const MOBILE_ALLOWED_VIEWS: Array<'contacts' | 'drafting' | 'sent' | 'inbox'> = [
		'contacts',
		'drafting',
		'sent',
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
		setActiveViewInternal('contacts');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isMobile, activeView]);
	
	// Wrapped setActiveView that handles transitions
	const setActiveView = useCallback((newView: ViewType) => {
		// Never allow unsupported views on mobile.
		if (
			isMobile === true &&
			!MOBILE_ALLOWED_VIEWS.includes(newView as (typeof MOBILE_ALLOWED_VIEWS)[number])
		) {
			newView = 'contacts';
		}
		if (newView === activeView) return;
		
		// Clear any pending transition timers
		if (transitionTimeoutRef.current) {
			clearTimeout(transitionTimeoutRef.current);
			transitionTimeoutRef.current = null;
		}
		if (maxWaitTimeoutRef.current) {
			clearTimeout(maxWaitTimeoutRef.current);
			maxWaitTimeoutRef.current = null;
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
	}, [activeView, isMobile, MOBILE_ALLOWED_VIEWS]);

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

		// The All tab should crossfade (opacity-only) rather than sliding/moving the header box.
		// Skip the shared-element "ghost move" when entering or leaving All.
		if (activeView === 'all' || previousView === 'all') return;

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

	// Shared-element move for the Contacts/Drafts table header pill when switching between those tabs.
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

		const pillViews: ViewType[] = ['contacts', 'drafting', 'sent'];
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

	// Narrow desktop detection for Writing tab compact layout (952px - 1279px)
	const [isNarrowDesktop, setIsNarrowDesktop] = useState(false);
	// Narrowest desktop detection (< 952px) - header box above tabs
	const [isNarrowestDesktop, setIsNarrowestDesktop] = useState(false);
	// Hide right panel when arrows would overlap with it (below 1522px)
	const [hideRightPanel, setHideRightPanel] = useState(false);
	// Hide right panel on all tab at breakpoint (below 1665px)
	const [hideRightPanelOnAll, setHideRightPanelOnAll] = useState(false);
	// Hide right panel on inbox tab at breakpoint (below 1681px)
	const [hideRightPanelOnInbox, setHideRightPanelOnInbox] = useState(false);
	// Hide arrows when they would overlap with content boxes (below 1317px)
	const [hideArrowsAtBreakpoint, setHideArrowsAtBreakpoint] = useState(false);
	// Hide arrows on all tab at breakpoint (at or below 1396px)
	const [hideArrowsOnAll, setHideArrowsOnAll] = useState(false);
	// Hide arrows on inbox tab at breakpoint (below 1476px)
	const [hideArrowsOnInbox, setHideArrowsOnInbox] = useState(false);
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

			setIsNarrowDesktop(effectiveWidth >= 952 && effectiveWidth < 1280);
			setIsNarrowestDesktop(effectiveWidth < 952);
			setHideRightPanel(effectiveWidth < 1522);
			setHideRightPanelOnAll(effectiveWidth <= 1665);
			setHideRightPanelOnInbox(effectiveWidth < 1681);
			setHideArrowsAtBreakpoint(effectiveWidth < 1317);
			setHideArrowsOnAll(effectiveWidth <= 1396);
			setHideArrowsOnInbox(effectiveWidth < 1476);
		};
		checkBreakpoints();
		window.addEventListener('resize', checkBreakpoints);
		window.addEventListener(CAMPAIGN_ZOOM_EVENT, checkBreakpoints as EventListener);
		return () => {
			window.removeEventListener('resize', checkBreakpoints);
			window.removeEventListener(CAMPAIGN_ZOOM_EVENT, checkBreakpoints as EventListener);
		};
	}, []);

	// Fetch header data for narrowest desktop layout
	const contactListIds = campaign?.userContactLists?.map((l) => l.id) || [];
	const { data: headerContacts } = useGetContacts({
		filters: { contactListIds },
		enabled: contactListIds.length > 0 && isNarrowestDesktop && !isMobile,
	});
	const { data: headerEmails } = useGetEmails({
		filters: { campaignId: campaign?.id },
		enabled: !!campaign?.id && isNarrowestDesktop && !isMobile,
	});

	// Compute header metrics
	const headerContactsCount = headerContacts?.length || 0;
	const headerDraftCount = (headerEmails || []).filter((e) => e.status === EmailStatus.draft).length;
	const headerSentCount = (headerEmails || []).filter((e) => e.status === EmailStatus.sent).length;
	const headerToListNames = campaign?.userContactLists?.map((list) => list.name).join(', ') || '';
	const headerFromName = campaign?.identity?.name || '';

	// Hide fixed arrows when in narrow desktop + testing view (arrows show next to draft button instead)
	// or when width < 1317px to prevent overlap with content boxes
	// or when on all tab and width <= 1396px
	// or when on inbox/sent tab and width < 1476px
	const hideFixedArrows =
		(activeView === 'testing' && isNarrowDesktop) ||
		hideArrowsAtBreakpoint ||
		(activeView === 'all' && hideArrowsOnAll) ||
		((activeView === 'inbox' || activeView === 'sent') && hideArrowsOnInbox);

	// Tab navigation order
	const tabOrder: ViewType[] = [
		'contacts',
		'testing',
		'all',
		'drafting',
		'sent',
		'inbox',
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

	// Mobile-specific tab navigation (only the 4 visible tabs on mobile)
	const mobileTabOrder: Array<'contacts' | 'drafting' | 'sent' | 'inbox'> = [
		'contacts',
		'drafting',
		'sent',
		'inbox',
	];

	const goToPreviousMobileTab = () => {
		const currentIndex = mobileTabOrder.indexOf(activeView as 'contacts' | 'drafting' | 'sent' | 'inbox');
		if (currentIndex > 0) {
			setActiveView(mobileTabOrder[currentIndex - 1]);
		} else {
			// Wrap around to the last mobile tab
			setActiveView(mobileTabOrder[mobileTabOrder.length - 1]);
		}
	};

	const goToNextMobileTab = () => {
		const currentIndex = mobileTabOrder.indexOf(activeView as 'contacts' | 'drafting' | 'sent' | 'inbox');
		if (currentIndex >= 0 && currentIndex < mobileTabOrder.length - 1) {
			setActiveView(mobileTabOrder[currentIndex + 1]);
		} else {
			// Wrap around to the first mobile tab
			setActiveView(mobileTabOrder[0]);
		}
	};

	const handleOpenDashboardSearchForCampaign = useCallback(() => {
		if (!campaign) return;

		const searchName = campaign?.userContactLists?.[0]?.name || campaign?.name || '';
		const pendingSearch = searchName ? `[Booking] ${searchName}`.trim() : '';
		if (pendingSearch && typeof window !== 'undefined') {
			sessionStorage.setItem('murmur_pending_search', pendingSearch);
		}

		router.push(`${urls.murmur.dashboard.index}?fromCampaignId=${campaign.id}`);
	}, [campaign, router]);

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

	// Writing + Contacts + Drafts + Sent + Inbox + All tab vertical alignment:
	// Place the top of the main content box exactly 159px from the top of the page
	// (only in the standard desktop header layout).
	//
	// Notes:
	// - The campaign header row is a fixed 50px tall.
	// - DraftingSection contains a small 4px spacer div at the very top (mb-[4px]).
	// - The default content spacing below the header is mt-6 (24px).
	const WRITING_BOX_TOP_PX = 159;
	const CAMPAIGN_HEADER_HEIGHT_PX = 50;
	const DRAFTING_SECTION_TOP_SPACER_PX = 4;
	const DEFAULT_CONTENT_TOP_MARGIN_PX = 24;
	const writingContentTopMarginPx =
		WRITING_BOX_TOP_PX - CAMPAIGN_HEADER_HEIGHT_PX - DRAFTING_SECTION_TOP_SPACER_PX; // 105px
	const writingTabShiftPx = writingContentTopMarginPx - DEFAULT_CONTENT_TOP_MARGIN_PX; // 81px
	const shouldApplyWritingTopShift =
		(activeView === 'testing' ||
			activeView === 'contacts' ||
			activeView === 'drafting' ||
			activeView === 'sent' ||
			activeView === 'inbox' ||
			activeView === 'all') &&
		!isMobile &&
		!isNarrowestDesktop;
	const fixedNavArrowsTopPx = 355 + (shouldApplyWritingTopShift ? writingTabShiftPx : 0);
	return (
		<CampaignDeviceProvider isMobile={isMobile} activeView={activeView}>
			<HoverDescriptionProvider enabled={selectedRightBoxIcon === 'info'}>
				<CampaignTopSearchHighlightProvider value={topSearchHighlightCtx}>
				<div className="min-h-screen relative">
			{/* Left navigation arrow - absolute position (hidden in narrow desktop + testing) */}
			{!hideFixedArrows && (
				<button
					type="button"
					onClick={goToPreviousTab}
					className="absolute z-50 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity"
					style={{
						left: '33px',
						top: `${fixedNavArrowsTopPx}px`,
					}}
					aria-label="Previous tab"
				>
					<LeftArrow />
				</button>
			)}

			{/* Right navigation arrow - absolute position (hidden in narrow desktop + testing) */}
			{!hideFixedArrows && (
				<button
					type="button"
					onClick={goToNextTab}
					className="absolute z-50 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity"
					style={{
						right: '33px',
						top: `${fixedNavArrowsTopPx}px`,
					}}
					aria-label="Next tab"
				>
					<RightArrow />
				</button>
			)}

			{/* Desktop top box (477 x 42, 1px stroke #929292, 10px radius) */}
			{!isMobile && !isNarrowestDesktop && (
				<div
					data-slot="campaign-top-box-wrapper"
					className="absolute inset-x-0 top-16 flex justify-center pointer-events-none"
				>
					<div className="relative">
						{/* Left box - 124 x 42px, 30px to the left of search box */}
						<div
							data-slot="campaign-left-box"
							className="pointer-events-auto absolute right-full top-0 mr-[30px] w-[124px] h-[42px] box-border border border-[#929292] rounded-[10px] overflow-hidden flex items-center justify-center gap-[33px]"
						>
							<button
								ref={topCampaignsFolderButtonRef}
								type="button"
								onClick={() => setShowTopCampaignsDropdown((prev) => !prev)}
								className={cn(
									"flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer transition-opacity",
									showTopCampaignsDropdown ? "opacity-100" : "opacity-40 hover:opacity-100"
								)}
								aria-label="Toggle campaigns dropdown"
							>
								<BottomFolderIcon width={30} height={15} className="text-black" />
							</button>
							<button
								type="button"
								data-hover-description="Back to Home Button"
								onClick={() => {
									if (typeof window !== 'undefined') {
										window.location.assign(urls.murmur.dashboard.index);
									}
								}}
								className="flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer transition-opacity opacity-40 hover:opacity-100 active:opacity-100"
								aria-label="Go to dashboard"
							>
								<BottomHomeIcon width={20} height={19} className="text-black" />
							</button>
						</div>
						{/* Campaigns dropdown positioned below the left box, left-aligned with content */}
						{showTopCampaignsDropdown && (
							<div
								ref={topCampaignsDropdownRef}
								data-slot="campaign-top-dropdown"
								className="pointer-events-auto fixed top-[116px] left-[300px] z-[60]"
							>
								<div className="bg-[#EDEDED] rounded-[12px] overflow-hidden w-[891px] h-[242px] border-2 border-[#8C8C8C]">
									<CampaignsTable />
								</div>
							</div>
						)}
						<button
							type="button"
							data-slot="campaign-top-box"
							aria-label="Open dashboard search for this campaign"
							title="Search for more contacts"
							data-hover-description="Hop back in to the map, Add some more contacts to your campaign"
							onClick={handleOpenDashboardSearchForCampaign}
							className={cn(
								"group relative pointer-events-auto w-[477px] max-w-[calc(100vw-32px)] h-[42px] box-border border border-[#929292] hover:border-black hover:border-2 rounded-[10px] overflow-hidden transition-[color,border-color,border-width] duration-150 cursor-pointer",
								isTopSearchHighlighted && "border-black border-2"
							)}
						>
							<SearchMap
								aria-hidden="true"
								width="100%"
								height="100%"
								viewBox="1 1 475.184 39.877"
								preserveAspectRatio="none"
								rectStroke="none"
								rectStrokeWidth={0}
								rectRx={10}
								className={cn(
									"absolute inset-0 w-full h-full opacity-40 group-hover:opacity-100 transition-opacity duration-150",
									isTopSearchHighlighted && "opacity-100"
								)}
							/>
							<div
								className={cn(
									"absolute right-3 top-1/2 -translate-y-1/2 flex text-[#929292] group-hover:text-black transition-colors duration-150",
									isTopSearchHighlighted && "text-black"
								)}
							>
								<SearchIconDesktop stroke="currentColor" />
							</div>
						</button>
						{/* Right box - 105 x 42px, 36px to the right of search box */}
						<div
							data-slot="campaign-right-box"
							className="pointer-events-auto absolute left-full top-0 ml-[36px] w-[105px] h-[42px] box-border border border-[#929292] rounded-[10px] overflow-hidden flex items-center justify-center gap-[14px]"
						>
							{/* Left icon - italic "i" in circle */}
							<button
								type="button"
								onClick={() => setSelectedRightBoxIcon('info')}
								className={cn(
									"w-[35px] h-[35px] flex items-center justify-center bg-transparent border rounded-[8px] cursor-pointer transition-all",
									selectedRightBoxIcon === 'info'
										? "border-[#929292]"
										: "border-transparent"
								)}
								aria-label="Turn info on"
							>
								<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
									<g opacity="0.4">
										<path d="M6.22656 0.25C9.53383 0.250077 12.2029 2.85379 12.2031 6.05078C12.2031 9.24793 9.53396 11.8525 6.22656 11.8525C2.9191 11.8525 0.25 9.24798 0.25 6.05078C0.250198 2.85375 2.91922 0.25 6.22656 0.25Z" stroke="black" strokeWidth="0.5"/>
										<path d="M8.05656 2.82696C7.8419 2.82696 7.68856 2.75796 7.59656 2.61996C7.53523 2.54329 7.50456 2.44363 7.50456 2.32096C7.50456 2.07563 7.61956 1.87629 7.84956 1.72296C8.01823 1.63096 8.17156 1.58496 8.30956 1.58496C8.53956 1.58496 8.70056 1.65396 8.79256 1.79196C8.8539 1.86863 8.88456 1.96829 8.88456 2.09096C8.88456 2.33629 8.7619 2.53563 8.51656 2.68896C8.37856 2.78096 8.22523 2.82696 8.05656 2.82696ZM4.05456 11.682C3.90123 11.682 3.7709 11.6513 3.66356 11.59C3.57156 11.5286 3.52556 11.4136 3.52556 11.245C3.52556 11.0303 3.57923 10.7773 3.68656 10.486C3.80923 10.1946 3.93956 9.90329 4.07756 9.61196C4.2309 9.32063 4.3459 9.08296 4.42256 8.89896C4.5299 8.68429 4.66023 8.40829 4.81356 8.07096C4.98223 7.71829 5.13556 7.38863 5.27356 7.08196C5.4269 6.75996 5.53423 6.53763 5.59556 6.41496C5.3809 6.64496 5.12023 6.93629 4.81356 7.28896C4.52223 7.62629 4.24623 7.95596 3.98556 8.27796C3.7249 8.59996 3.52556 8.85296 3.38756 9.03696C3.34156 9.09829 3.30323 9.12896 3.27256 9.12896C3.2419 9.12896 3.22656 9.09063 3.22656 9.01396C3.22656 8.89129 3.2649 8.77629 3.34156 8.66896C3.6329 8.30096 3.9549 7.88696 4.30756 7.42696C4.67556 6.96696 5.00523 6.54529 5.29656 6.16196C5.5879 5.76329 5.7719 5.50263 5.84856 5.37996C6.01723 5.34929 6.26256 5.30329 6.58456 5.24196C6.9219 5.18063 7.1519 5.09629 7.27456 4.98896C7.32056 4.94296 7.36656 4.91996 7.41256 4.91996C7.44323 4.91996 7.45856 4.95063 7.45856 5.01196C7.4739 5.05796 7.45856 5.11163 7.41256 5.17296C7.32056 5.28029 7.15956 5.54096 6.92956 5.95496C6.69956 6.36896 6.45423 6.82896 6.19356 7.33496C5.94823 7.82563 5.71823 8.27029 5.50356 8.66896C5.2889 9.08296 5.1049 9.48163 4.95156 9.86496C4.79823 10.2483 4.72156 10.5243 4.72156 10.693C4.72156 10.9076 4.8289 11.015 5.04356 11.015C5.2429 11.015 5.4959 10.8923 5.80256 10.647C6.12456 10.4016 6.44656 10.1103 6.76856 9.77296C7.09056 9.42029 7.37423 9.09829 7.61956 8.80696C7.69623 8.71496 7.78823 8.60763 7.89556 8.48496C8.01823 8.34696 8.0949 8.26263 8.12556 8.23196C8.15623 8.26263 8.17156 8.31629 8.17156 8.39296C8.15623 8.50029 8.1179 8.60763 8.05656 8.71496C7.99523 8.80696 7.9339 8.89129 7.87256 8.96796C7.55056 9.36663 7.1979 9.78063 6.81456 10.21C6.43123 10.624 6.00956 10.9766 5.54956 11.268C5.08956 11.544 4.59123 11.682 4.05456 11.682Z" fill="black"/>
									</g>
								</svg>
							</button>
							{/* Right icon - empty circle */}
							<button
								type="button"
								onClick={() => setSelectedRightBoxIcon('circle')}
								className={cn(
									"w-[35px] h-[35px] flex items-center justify-center bg-transparent border rounded-[8px] cursor-pointer transition-all",
									selectedRightBoxIcon === 'circle'
										? "border-[#929292]"
										: "border-transparent"
								)}
								aria-label="Turn info off"
							>
								<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" opacity="0.4">
									<path d="M6.22656 0.25C9.53383 0.250077 12.2029 2.85379 12.2031 6.05078C12.2031 9.24793 9.53396 11.8525 6.22656 11.8525C2.9191 11.8525 0.25 9.24798 0.25 6.05078C0.250198 2.85375 2.91922 0.25 6.22656 0.25Z" stroke="black" strokeWidth="0.5"/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Header row with Back to Home link, centered tabs, and Clerk icon (from layout) */}
			<div data-slot="campaign-header">
				<div className="relative h-[50px] flex items-center justify-center">
					{/* Back to Home link - left side */}
					<Link
						href={urls.murmur.dashboard.index}
						prefetch
						className={cn(
							'absolute left-8 flex items-center text-[15px] font-inter font-normal no-underline hover:no-underline z-[100] group text-[#060606] hover:text-gray-500',
							isMobile && 'hidden'
						)}
						title="Back to Home"
						onClick={(e) => {
							e.preventDefault();
							if (typeof window !== 'undefined') {
								window.location.assign(urls.murmur.dashboard.index);
							}
						}}
						style={{
							gap: '20px',
							fontWeight: 400,
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
						<span>Back to Home</span>
					</Link>

					{/* View tabs - centered in header (hidden at narrowest breakpoint and on mobile) */}
					<div
						className={cn(
							'absolute inset-0 flex items-center justify-center pointer-events-none mobile-landscape-hide',
							(isMobile || isNarrowestDesktop) && 'hidden'
						)}
					>
						<div
							className="pointer-events-auto grid w-[560px] max-w-full grid-cols-5 items-center justify-items-center"
							data-hover-description-suppress="true"
							style={{ transform: 'translateY(13px)' }}
						>
							<button
							type="button"
							className={cn(
								'font-inter text-[17px] font-medium max-[480px]:text-[12px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
								activeView === 'contacts'
									? 'text-black'
									: 'text-[#6B6B6B] hover:text-black'
							)}
							onClick={() => setActiveView('contacts')}
						>
							Contacts
							</button>
							<button
							type="button"
							className={cn(
								'font-inter text-[17px] font-medium max-[480px]:text-[12px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
								activeView === 'testing'
									? 'text-black'
									: 'text-[#6B6B6B] hover:text-black'
							)}
							onClick={() => setActiveView('testing')}
						>
							<div className="relative inline-flex items-center justify-center w-[62px] h-[27px]">
								<div
									aria-hidden="true"
									className={cn(
										'absolute inset-0 pointer-events-none',
										'rounded-[8px] border-2 border-[#000000] bg-[#A6E2A8]',
										'transition-opacity duration-150',
										isWriteTabHighlighted ? 'opacity-100' : 'opacity-0'
									)}
								/>
								<span
									className={cn(
										'relative z-10',
										isWriteTabHighlighted && 'text-black'
									)}
								>
									Write
								</span>
							</div>
							</button>
							<button
							type="button"
							aria-label="All"
							title="All"
							className={cn(
								'font-inter text-[17px] font-medium max-[480px]:text-[12px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer inline-flex items-center justify-center',
								activeView === 'all'
									? 'text-black'
									: 'text-[#6B6B6B] hover:text-black'
							)}
							onClick={() => setActiveView('all')}
						>
							<BottomArrowIcon
								aria-hidden="true"
								focusable="false"
								width={20}
								height={14}
								className="block translate-y-[1px]"
							/>
							</button>
							<button
							type="button"
							className={cn(
								'font-inter text-[17px] font-medium max-[480px]:text-[12px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
								activeView === 'drafting'
									? 'text-black'
									: 'text-[#6B6B6B] hover:text-black'
							)}
							onClick={() => setActiveView('drafting')}
						>
							<div className="relative inline-flex items-center justify-center w-[64px] h-[28px]">
								<div
									aria-hidden="true"
									className={cn(
										'absolute inset-0 pointer-events-none',
										'rounded-[8px] border-2 border-[#000000] bg-[#EFDAAF]',
										'transition-opacity duration-150',
										isDraftsTabHighlighted ? 'opacity-100' : 'opacity-0'
									)}
								/>
								<span
									className={cn(
										'relative z-10',
										isDraftsTabHighlighted && 'text-black'
									)}
								>
									Drafts
								</span>
							</div>
							</button>
							<div className="relative group">
								<button
								type="button"
								className={cn(
									'font-inter text-[17px] font-medium max-[480px]:text-[12px] leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
									activeView === 'inbox'
										? 'text-black'
										: 'text-[#6B6B6B] hover:text-black'
								)}
								onClick={() => setActiveView('inbox')}
							>
								<div className="relative inline-flex items-center justify-center w-[62px] h-[27px]">
									<div
										aria-hidden="true"
										className={cn(
											'absolute inset-0 pointer-events-none',
											'rounded-[8px] border-2 border-[#000000] bg-[#84B9F5]',
											'transition-opacity duration-150',
											isInboxTabHighlighted ? 'opacity-100' : 'opacity-0'
										)}
									/>
									<span
										className={cn(
											'relative z-10',
											isInboxTabHighlighted && 'text-black'
										)}
									>
										Inbox
									</span>
								</div>
								</button>
								{/* Hover bridge: keeps the "Sent" bubble open while moving the cursor down */}
								<span
								aria-hidden="true"
								className={cn(
									'absolute left-1/2 -translate-x-1/2 top-full z-40',
									'hidden group-hover:block group-focus-within:block',
									'w-[110px] h-[56px]',
									'bg-transparent cursor-pointer'
								)}
							/>
								<button
								type="button"
								aria-label="Sent"
								title="Sent"
								onClick={() => setActiveView('sent')}
								className={cn(
									'absolute left-1/2 -translate-x-1/2 top-full mt-[6px] z-50',
									activeView === 'sent'
										? 'flex'
										: 'hidden group-hover:flex group-focus-within:flex',
									'w-[54px] h-[27px] rounded-[8px]',
									'bg-[#E4EBE6]',
									'items-center justify-center cursor-pointer',
									'font-inter text-[17px] font-medium',
									activeView === 'sent' ? 'text-black' : 'text-[#929292]'
								)}
							>
								Sent
								</button>
							</div>
						</div>
					</div>

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
								className={cn(
									'font-inter text-[13px] font-medium leading-none bg-[#F5DADA] border cursor-pointer rounded-full px-3 py-1',
									activeView === 'contacts'
										? 'text-black border-black'
										: 'text-[#6B6B6B] border-transparent hover:text-black hover:border-black'
								)}
								onClick={() => setActiveView('contacts')}
							>
								{headerContactsCount.toString().padStart(2, '0')} Contacts
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
									'font-inter text-[13px] font-medium leading-none bg-[#B0E0A6] border cursor-pointer rounded-full px-3 py-1',
									activeView === 'sent'
										? 'text-black border-black'
										: 'text-[#6B6B6B] border-transparent hover:text-black hover:border-black'
								)}
								onClick={() => setActiveView('sent')}
							>
								{headerSentCount.toString().padStart(2, '0')} Sent
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
								onFromClick={() => {
									setIdentityDialogOrigin('campaign');
									setIsIdentityDialogOpen(true);
								}}
								fullWidth
							/>
						</div>
					)}

					{/* View tabs - shown below header box at narrowest breakpoint (< 952px) */}
					{!isMobile && isNarrowestDesktop && (
						<div className="flex justify-center mb-4">
						<div
							className="grid w-[560px] max-w-full grid-cols-5 items-center justify-items-center"
							data-hover-description-suppress="true"
						>
								<button
									type="button"
									className={cn(
										'font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
										activeView === 'contacts'
											? 'text-black'
											: 'text-[#6B6B6B] hover:text-black'
									)}
									onClick={() => setActiveView('contacts')}
								>
									Contacts
								</button>
								<button
									type="button"
									className={cn(
										'font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
										activeView === 'testing'
											? 'text-black'
											: 'text-[#6B6B6B] hover:text-black'
									)}
									onClick={() => setActiveView('testing')}
								>
									Writing
								</button>
								<button
									type="button"
									aria-label="All"
									title="All"
									className={cn(
										'font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer inline-flex items-center justify-center',
										activeView === 'all'
											? 'text-black'
											: 'text-[#6B6B6B] hover:text-black'
									)}
									onClick={() => setActiveView('all')}
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
									className={cn(
										'font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
										activeView === 'drafting'
											? 'text-black'
											: 'text-[#6B6B6B] hover:text-black'
									)}
									onClick={() => setActiveView('drafting')}
								>
									Drafts
								</button>
								<div className="relative group">
									<button
										type="button"
										className={cn(
											'font-inter text-[14px] font-medium leading-none bg-transparent p-0 m-0 border-0 cursor-pointer',
											activeView === 'inbox'
												? 'text-black'
												: 'text-[#6B6B6B] hover:text-black'
										)}
										onClick={() => setActiveView('inbox')}
									>
										Inbox
									</button>
									{/* Hover bridge: keeps the "Sent" bubble open while moving the cursor down */}
									<span
										aria-hidden="true"
										className={cn(
											'absolute left-1/2 -translate-x-1/2 top-full z-40',
											'hidden group-hover:block group-focus-within:block',
											'w-[110px] h-[56px]',
											'bg-transparent cursor-pointer'
										)}
									/>
									<button
										type="button"
										aria-label="Sent"
										title="Sent"
										onClick={() => setActiveView('sent')}
										className={cn(
											'absolute left-1/2 -translate-x-1/2 top-full mt-[6px] z-50',
											activeView === 'sent'
												? 'flex'
												: 'hidden group-hover:flex group-focus-within:flex',
											'w-[54px] h-[27px] rounded-[8px]',
											'bg-[#E4EBE6]',
											'items-center justify-center cursor-pointer',
											'font-inter text-[17px] font-medium',
											activeView === 'sent' ? 'text-black' : 'text-[#929292]'
										)}
									>
										Sent
									</button>
								</div>
							</div>
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
								const standardPositionTabs: ViewType[] = ['testing', 'contacts', 'drafting', 'sent'];
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
												autoOpenProfileTabWhenIncomplete={cameFromSearch}
												goToDrafting={() => setActiveView('drafting')}
												goToAll={() => setActiveView('all')}
												goToWriting={() => setActiveView('testing')}
												onGoToSearch={handleOpenDashboardSearchForCampaign}
												goToContacts={() => setActiveView('contacts')}
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
													goToDrafting={() => setActiveView('drafting')}
													goToAll={() => setActiveView('all')}
													goToWriting={() => setActiveView('testing')}
													onGoToSearch={handleOpenDashboardSearchForCampaign}
													goToContacts={() => setActiveView('contacts')}
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

			{/* Right side panel - hidden on mobile, when width < 1522px, on all tab when width <= 1665px, or on inbox tab when width < 1681px */}
			{!isMobile && !hideRightPanel && !(activeView === 'all' && hideRightPanelOnAll) && !(activeView === 'inbox' && hideRightPanelOnInbox) && (
				<CampaignRightPanel
					view={activeView}
					onTabChange={setActiveView}
					transitionDurationMs={TRANSITION_DURATION}
					isViewTransitionFading={isFadingOutPreviousView}
					className={shouldApplyWritingTopShift ? 'translate-y-[81px]' : undefined}
				/>
			)}

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

