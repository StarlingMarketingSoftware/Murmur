'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import type mapboxgl from 'mapbox-gl';
import { MAPBOX_SOURCE_IDS } from './constants';
import {
	OWNED_VENUE_RADAR_MS,
	RADAR_FRAME_MS,
	buildOwnedVenueGlowFeatures,
	buildOwnedVenueMapOverlayData,
	buildOwnedVenueRadarLineFeatures,
	emptyFeatureCollection,
	isValidOwnedVenueLocation,
	radarDisksIntersectViewport,
} from './radarOverlays';
import type { OwnedVenueLocation } from './radarOverlays';
import type { LatLngLiteral } from './types';
import type { SearchResultsMapProps } from './searchResultsMapProps';

export interface UseOwnedVenueRadarParams {
	map: mapboxgl.Map | null;
	isMapLoaded: boolean;
	ownedVenueLocation: OwnedVenueLocation | null | undefined;
	mapContainerRef: RefObject<HTMLDivElement | null>;
	onOwnedVenueAnchorChangeRef: MutableRefObject<
		SearchResultsMapProps['onOwnedVenueAnchorChange'] | null
	>;
}

// Owned-venue home/radar overlay: writes the glow/ring/icon sources, drives the
// radar pulse rAF, and reports the projected home-icon anchor to the host.
export const useOwnedVenueRadar = ({
	map,
	isMapLoaded,
	ownedVenueLocation,
	mapContainerRef,
	onOwnedVenueAnchorChangeRef,
}: UseOwnedVenueRadarParams): void => {
	const ownedVenuePulseRafRef = useRef<number | null>(null);
	const ownedVenueLat = ownedVenueLocation?.lat;
	const ownedVenueLng = ownedVenueLocation?.lng;
	const ownedVenueCenter = useMemo<LatLngLiteral | null>(() => {
		const location =
			typeof ownedVenueLat === 'number' && typeof ownedVenueLng === 'number'
				? { lat: ownedVenueLat, lng: ownedVenueLng }
				: null;
		return isValidOwnedVenueLocation(location) ? location : null;
	}, [ownedVenueLat, ownedVenueLng]);
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const setSourceData = (sourceId: string, data: GeoJSON.FeatureCollection) => {
			const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
			source?.setData(data);
		};

		if (!ownedVenueCenter) {
			const empty = emptyFeatureCollection();
			setSourceData(MAPBOX_SOURCE_IDS.ownedVenueGlow, empty);
			setSourceData(MAPBOX_SOURCE_IDS.ownedVenueRings, empty);
			setSourceData(MAPBOX_SOURCE_IDS.ownedVenueIcon, empty);
			return;
		}

		const overlayData = buildOwnedVenueMapOverlayData(ownedVenueCenter);
		setSourceData(MAPBOX_SOURCE_IDS.ownedVenueGlow, overlayData.glow);
		setSourceData(MAPBOX_SOURCE_IDS.ownedVenueRings, overlayData.rings);
		setSourceData(MAPBOX_SOURCE_IDS.ownedVenueIcon, overlayData.icon);
	}, [map, isMapLoaded, ownedVenueCenter]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const glowSource = map.getSource(MAPBOX_SOURCE_IDS.ownedVenueGlow) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const ringsSource = map.getSource(MAPBOX_SOURCE_IDS.ownedVenueRings) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const pulseSource = map.getSource(MAPBOX_SOURCE_IDS.ownedVenuePulse) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!glowSource || !ringsSource || !pulseSource) return;

		const clearPulse = () => {
			try {
				pulseSource.setData(emptyFeatureCollection());
			} catch {
				// Non-fatal; source may be tearing down.
			}
		};

		if (!ownedVenueCenter) {
			clearPulse();
			return;
		}

		let prefersReducedMotion = false;
		try {
			prefersReducedMotion = window.matchMedia(
				'(prefers-reduced-motion: reduce)'
			).matches;
		} catch {
			prefersReducedMotion = false;
		}

		if (prefersReducedMotion) {
			clearPulse();
			return;
		}

		let cancelled = false;

		let lastFrameMs = 0;
		const animateRadar = (nowMs: number) => {
			if (cancelled) return;
			if (nowMs - lastFrameMs < RADAR_FRAME_MS) {
				ownedVenuePulseRafRef.current = window.requestAnimationFrame(animateRadar);
				return;
			}
			lastFrameMs = nowMs;

			// Off-screen radar disks skip the geometry regen entirely (see
			// radarDisksIntersectViewport) — the chain stays alive for resume.
			if (!radarDisksIntersectViewport(map, [ownedVenueCenter])) {
				ownedVenuePulseRafRef.current = window.requestAnimationFrame(animateRadar);
				return;
			}

			const phase = (nowMs % OWNED_VENUE_RADAR_MS) / OWNED_VENUE_RADAR_MS;
			// Re-fetch the sources each tick: the once-captured refs go stale if a
			// source is invalidated under rapid camera churn, and setData() on a stale
			// source throws — uncaught in rAF, which would crash the whole app.
			const glow = map.getSource(MAPBOX_SOURCE_IDS.ownedVenueGlow) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const rings = map.getSource(MAPBOX_SOURCE_IDS.ownedVenueRings) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const pulse = map.getSource(MAPBOX_SOURCE_IDS.ownedVenuePulse) as
				| mapboxgl.GeoJSONSource
				| undefined;
			if (!glow || !rings || !pulse) {
				ownedVenuePulseRafRef.current = window.requestAnimationFrame(animateRadar);
				return;
			}
			try {
				glow.setData({
					type: 'FeatureCollection',
					features: buildOwnedVenueGlowFeatures(ownedVenueCenter, phase, true),
				});
				rings.setData({
					type: 'FeatureCollection',
					features: buildOwnedVenueRadarLineFeatures(ownedVenueCenter, phase, {
						animated: true,
					}),
				});
				pulse.setData({
					type: 'FeatureCollection',
					features: buildOwnedVenueRadarLineFeatures(ownedVenueCenter, phase, {
						animated: true,
						bloom: true,
					}),
				});
			} catch {
				// Source transiently invalid mid-churn; stop cleanly. The effect
				// re-arms on the next map / center change.
				cancelled = true;
				return;
			}

			ownedVenuePulseRafRef.current = window.requestAnimationFrame(animateRadar);
		};

		ownedVenuePulseRafRef.current = window.requestAnimationFrame(animateRadar);

		return () => {
			cancelled = true;
			if (ownedVenuePulseRafRef.current != null) {
				window.cancelAnimationFrame(ownedVenuePulseRafRef.current);
				ownedVenuePulseRafRef.current = null;
			}
			clearPulse();
		};
	}, [map, isMapLoaded, ownedVenueCenter]);

	// Owned-venue anchor reporting: lets the host (venue portal) pin DOM chrome next to
	// the home icon. Mirrors the selected-marker overlay pattern (map.project on 'move').
	useEffect(() => {
		const notify = (
			anchor: { x: number; y: number; isOnScreen: boolean; zoom: number } | null
		) => onOwnedVenueAnchorChangeRef.current?.(anchor);
		if (!map || !isMapLoaded || !ownedVenueCenter) {
			notify(null);
			return;
		}

		const update = () => {
			const container = mapContainerRef.current;
			if (!container) return;
			const rect = container.getBoundingClientRect();
			const p = map.project([ownedVenueCenter.lng, ownedVenueCenter.lat]);
			// Globe far-side guard: an occluded point round-trips to a different location.
			const roundTrip = map.unproject(p);
			const occluded =
				Math.abs(roundTrip.lng - ownedVenueCenter.lng) > 1 ||
				Math.abs(roundTrip.lat - ownedVenueCenter.lat) > 1;
			const pad = 40;
			const isOnScreen =
				!occluded &&
				p.x >= -pad &&
				p.x <= rect.width + pad &&
				p.y >= -pad &&
				p.y <= rect.height + pad;
			notify({ x: rect.left + p.x, y: rect.top + p.y, isOnScreen, zoom: map.getZoom() });
		};

		update();
		map.on('move', update);
		map.on('resize', update);
		return () => {
			map.off('move', update);
			map.off('resize', update);
			notify(null);
		};
	}, [map, isMapLoaded, ownedVenueCenter]);
};
