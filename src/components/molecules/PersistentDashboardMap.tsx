'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import SearchResultsMap, {
	type SearchResultsMapProps,
} from '@/components/molecules/SearchResultsMap/SearchResultsMap';
import { urls } from '@/constants/urls';
import { usePersistentMapValue } from '@/contexts/PersistentMapContext';

const IDLE_CLIP_PATH = 'inset(0px round 0px)';
const IDLE_FRAME_TRANSITION = '0ms ease';

const FALLBACK_MAP_PROPS: SearchResultsMapProps = {
	contacts: [],
	selectedContacts: [],
	presentation: 'background',
	autoSpin: true,
	skipAutoFit: true,
};

export function PersistentDashboardMap() {
	const pathname = usePathname();
	const mapConfig = usePersistentMapValue();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const isDashboardRoute = pathname === urls.murmur.dashboard.index;
	const isCampaignRoute =
		pathname === urls.murmur.campaign.index ||
		pathname.startsWith(`${urls.murmur.campaign.index}/`);

	const shouldRenderMap = mounted && (Boolean(mapConfig) || isCampaignRoute);
	const isInteractiveDashboardMap = isDashboardRoute && Boolean(mapConfig?.isMapView);

	const mapProps = useMemo<SearchResultsMapProps>(
		() => mapConfig?.mapProps ?? FALLBACK_MAP_PROPS,
		[mapConfig?.mapProps]
	);

	if (!shouldRenderMap) return null;

	const mapViewClip = isInteractiveDashboardMap
		? mapConfig?.mapViewClip ?? IDLE_CLIP_PATH
		: IDLE_CLIP_PATH;
	const mapViewFrameTransition =
		mapConfig?.mapViewFrameTransition ?? IDLE_FRAME_TRANSITION;
	const frameInsetPx = isInteractiveDashboardMap ? mapConfig?.mapViewFrameInsetPx ?? 0 : 0;
	const frameRadiusPx = isInteractiveDashboardMap ? mapConfig?.mapViewFrameRadiusPx ?? 0 : 0;
	const frameBorderPx = isInteractiveDashboardMap ? mapConfig?.mapViewFrameBorderPx ?? 0 : 0;

	return (
		<>
			<div
				className="dashboard-globe-bg"
				style={{
					position: 'fixed',
					inset: 0,
					zIndex: isInteractiveDashboardMap ? 98 : -1,
					pointerEvents: isInteractiveDashboardMap ? 'auto' : 'none',
				}}
			>
				<div
					style={{
						width: '100%',
						height: '100%',
						position: 'relative',
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
						<SearchResultsMap {...mapProps} />
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
