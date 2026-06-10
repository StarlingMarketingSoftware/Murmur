'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import SearchResultsMap, {
	type SearchResultsMapProps,
} from '@/components/molecules/SearchResultsMap/SearchResultsMap';
import { urls } from '@/constants/urls';
import {
	usePersistentMapReadySetter,
	usePersistentMapValue,
} from '@/contexts/PersistentMapContext';

const IDLE_CLIP_PATH = 'inset(0px round 0px)';
const IDLE_FRAME_TRANSITION = '0ms ease';

const FALLBACK_MAP_PROPS: SearchResultsMapProps = {
	contacts: [],
	selectedContacts: [],
	presentation: 'interactive',
	autoSpin: false,
	skipAutoFit: true,
};

export function PersistentDashboardMap() {
	const pathname = usePathname();
	const mapConfig = usePersistentMapValue();
	const setPersistentMapReady = usePersistentMapReadySetter();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const isDashboardRoute = pathname === urls.murmur.dashboard.index;
	const isVenuePortalRoute = pathname === urls.venuePortal.index;
	const isCampaignRoute =
		pathname === urls.murmur.campaign.index ||
		pathname.startsWith(`${urls.murmur.campaign.index}/`);

	// Keep the singleton Mapbox instance mounted across every map-bearing route, even while the
	// config is momentarily null during a route handoff (e.g. campaign → dashboard, where the
	// outgoing page clears the config before the incoming page sets it). Without this the map
	// unmounts and re-initializes mid-navigation, which reads as a flash. Non-map routes still
	// hide it (none of these flags match and their config is null).
	const shouldRenderMap =
		mounted &&
		(isDashboardRoute || isVenuePortalRoute || isCampaignRoute || Boolean(mapConfig));
	const isInteractiveDashboardMap = isDashboardRoute && Boolean(mapConfig?.isMapView);
	const isInteractiveVenueMap = isVenuePortalRoute && Boolean(mapConfig?.isMapView);
	// The venue portal reveals the persistent map with the same semantics as the
	// dashboard (idle background → full interactive) once its config flips isMapView.
	const isInteractiveRevealMap = isInteractiveDashboardMap || isInteractiveVenueMap;
	const isInteractiveCampaignMap = isCampaignRoute;
	const isInteractiveMap = isInteractiveRevealMap || isInteractiveCampaignMap;

	const mapProps = useMemo<SearchResultsMapProps>(
		() => {
			const props = mapConfig?.mapProps ?? FALLBACK_MAP_PROPS;
			if (!isInteractiveCampaignMap) return props;

			return {
				...props,
				presentation: 'interactive',
				autoSpin: false,
			};
		},
		[isInteractiveCampaignMap, mapConfig?.mapProps]
	);

	if (!shouldRenderMap) return null;

	const mapViewClip = isInteractiveRevealMap
		? mapConfig?.mapViewClip ?? IDLE_CLIP_PATH
		: IDLE_CLIP_PATH;
	const mapViewFrameTransition =
		mapConfig?.mapViewFrameTransition ?? IDLE_FRAME_TRANSITION;
	const frameInsetPx = isInteractiveRevealMap ? mapConfig?.mapViewFrameInsetPx ?? 0 : 0;
	const frameRadiusPx = isInteractiveRevealMap ? mapConfig?.mapViewFrameRadiusPx ?? 0 : 0;
	const frameBorderPx = isInteractiveRevealMap ? mapConfig?.mapViewFrameBorderPx ?? 0 : 0;

	return (
		<>
			<div
				className="dashboard-globe-bg"
				style={{
					position: 'fixed',
					inset: 0,
					zIndex: isInteractiveRevealMap ? 98 : isInteractiveCampaignMap ? 0 : -1,
					pointerEvents: isInteractiveMap ? 'auto' : 'none',
				}}
			>
				<div
					style={{
						width: '100%',
						height: '100%',
						position: 'relative',
						// Scrub "dolly" for the scroll-to-map gesture. Driven per-frame via the
						// --map-scrub-scale CSS variable (set on :root by useDashboardScrollToMap);
						// defaults to `none` so there is zero effect when no scrub is in progress.
						// This is a pure compositor transform — the Mapbox camera is never touched
						// during the scrub (its zoom is locked in background presentation).
						transform: 'var(--map-scrub-scale, none)',
						transformOrigin: 'center center',
						willChange: 'transform',
					}}
				>
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
						{/* onMapLoadedChange stays after the spread so a host-config mapProps
						    update can never clobber the readiness wiring. */}
						<SearchResultsMap
							{...mapProps}
							onMapLoadedChange={setPersistentMapReady}
						/>
					</div>

					<div
						aria-hidden="true"
						style={{
							position: 'absolute',
							top: frameInsetPx,
							left: frameInsetPx,
							right: frameInsetPx,
							bottom: frameInsetPx,
							borderRadius: frameRadiusPx,
							borderStyle: 'solid',
							borderColor: '#143883',
							borderWidth: frameBorderPx,
							boxSizing: 'border-box',
							pointerEvents: 'none',
							transition: `top ${mapViewFrameTransition}, left ${mapViewFrameTransition}, right ${mapViewFrameTransition}, bottom ${mapViewFrameTransition}, border-radius ${mapViewFrameTransition}, border-width ${mapViewFrameTransition}`,
							willChange: 'top, left, right, bottom, border-radius, border-width',
						}}
					/>
				</div>
			</div>
			<style jsx global>{`
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
				.dashboard-globe-bg .murmur-search-results-map,
				.dashboard-globe-bg .mapboxgl-map,
				.dashboard-globe-bg .mapboxgl-canvas-container,
				.dashboard-globe-bg .mapboxgl-canvas {
					border-radius: 0 !important;
				}
				html.murmur-compact .dashboard-globe-bg {
					zoom: calc(1 / var(--murmur-dashboard-zoom, var(--murmur-campaign-zoom, 0.85)));
				}
				html:has(.dashboard-globe-bg),
				body:has(.dashboard-globe-bg),
				body:has(.dashboard-globe-bg) > main,
				body:has(.dashboard-globe-bg) main.flex-1,
				html:has(body.murmur-page.murmur-campaign):has(.dashboard-globe-bg),
				body.murmur-page.murmur-campaign:has(.dashboard-globe-bg) {
					background: transparent !important;
					background-color: transparent !important;
				}
			`}</style>
		</>
	);
}
