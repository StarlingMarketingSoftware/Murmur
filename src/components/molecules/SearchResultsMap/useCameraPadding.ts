'use client';

import { useLayoutEffect, useRef } from 'react';
import type mapboxgl from 'mapbox-gl';
import { mapboxEaseInOutCubic } from './math';
import type { SearchResultsMapProps } from './searchResultsMapProps';

export interface UseCameraPaddingParams {
	map: mapboxgl.Map | null;
	isMapLoaded: boolean;
	isBackgroundPresentation: boolean;
	cameraPadding: SearchResultsMapProps['cameraPadding'];
}

export const useCameraPadding = ({
	map,
	isMapLoaded,
	isBackgroundPresentation,
	cameraPadding,
}: UseCameraPaddingParams): void => {
	// Track last-applied camera padding so we don't spam Mapbox with identical updates.
	const lastCameraPaddingKeyRef = useRef<string>('');
	// Apply camera padding (campaign map shift-left uses this). Layout timing is important
	// for search→campaign tab switches: the dashboard commits optimistic campaign padding
	// on the click frame, then starts route navigation on the next animation frame.
	useLayoutEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;

		const safe = (n: unknown) => {
			const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
			return v > 0 ? v : 0;
		};
		// In decorative background mode (dashboard globe) UI-driven padding must not apply — but we
		// must still CLEAR any padding left over from a prior interactive view (e.g. the campaign
		// left-shift). Otherwise the decorative easeTo({ offset }) centering runs on top of stale
		// right-padding and the globe sits off-center to the left (e.g. after campaign -> Back).
		const next = isBackgroundPresentation
			? { top: 0, right: 0, bottom: 0, left: 0 }
			: {
					top: safe(cameraPadding?.top),
					right: safe(cameraPadding?.right),
					bottom: safe(cameraPadding?.bottom),
					left: safe(cameraPadding?.left),
				};
		const key = `${next.top},${next.right},${next.bottom},${next.left}`;
		const previousKey = lastCameraPaddingKeyRef.current;
		if (key === previousKey) return;
		lastCameraPaddingKeyRef.current = key;

		try {
			const shouldAnimatePadding =
				previousKey !== '' &&
				!isBackgroundPresentation &&
				!(
					typeof window !== 'undefined' &&
					window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
				);

			if (shouldAnimatePadding) {
				map.easeTo({
					padding: next,
					duration: 520,
					easing: mapboxEaseInOutCubic,
					essential: true,
				});
			} else {
				map.setPadding(next);
			}
		} catch {
			// Non-fatal; map may be mid-teardown.
		}
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		cameraPadding?.top,
		cameraPadding?.right,
		cameraPadding?.bottom,
		cameraPadding?.left,
	]);
};
