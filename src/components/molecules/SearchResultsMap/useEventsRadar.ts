'use client';

import { useEffect, useRef } from 'react';
import type mapboxgl from 'mapbox-gl';
import { MAPBOX_SOURCE_IDS } from './constants';
import {
	OWNED_VENUE_RADAR_MS,
	RADAR_FRAME_MS,
	buildEventsGlowFeatures,
	buildEventsMapOverlayData,
	buildEventsRadarLineFeatures,
	emptyFeatureCollection,
	radarDisksIntersectViewport,
} from './radarOverlays';
import type { MapEvent } from './radarOverlays';

export interface UseEventsRadarParams {
	map: mapboxgl.Map | null;
	isMapLoaded: boolean;
	eventCenters: MapEvent[];
}

export const useEventsRadar = ({
	map,
	isMapLoaded,
	eventCenters,
}: UseEventsRadarParams): void => {
	const eventsPulseRafRef = useRef<number | null>(null);
	// Event opportunity markers: same radar machinery as the owned venue, but anchored
	// to many event centers at once (red star icon instead of the home icon).
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const setSourceData = (sourceId: string, data: GeoJSON.FeatureCollection) => {
			const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
			source?.setData(data);
		};

		if (eventCenters.length === 0) {
			const empty = emptyFeatureCollection();
			setSourceData(MAPBOX_SOURCE_IDS.eventsGlow, empty);
			setSourceData(MAPBOX_SOURCE_IDS.eventsRings, empty);
			setSourceData(MAPBOX_SOURCE_IDS.eventsIcon, empty);
			return;
		}

		const overlayData = buildEventsMapOverlayData(eventCenters);
		setSourceData(MAPBOX_SOURCE_IDS.eventsGlow, overlayData.glow);
		setSourceData(MAPBOX_SOURCE_IDS.eventsRings, overlayData.rings);
		setSourceData(MAPBOX_SOURCE_IDS.eventsIcon, overlayData.icon);
	}, [map, isMapLoaded, eventCenters]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const glowSource = map.getSource(MAPBOX_SOURCE_IDS.eventsGlow) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const ringsSource = map.getSource(MAPBOX_SOURCE_IDS.eventsRings) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const pulseSource = map.getSource(MAPBOX_SOURCE_IDS.eventsPulse) as
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

		if (eventCenters.length === 0) {
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
				eventsPulseRafRef.current = window.requestAnimationFrame(animateRadar);
				return;
			}
			lastFrameMs = nowMs;

			// Off-screen radar disks skip the geometry regen entirely (see
			// radarDisksIntersectViewport) — the chain stays alive for resume.
			if (!radarDisksIntersectViewport(map, eventCenters)) {
				eventsPulseRafRef.current = window.requestAnimationFrame(animateRadar);
				return;
			}

			const phase = (nowMs % OWNED_VENUE_RADAR_MS) / OWNED_VENUE_RADAR_MS;
			// Re-fetch the sources each tick: the once-captured refs go stale if a
			// source is invalidated under rapid camera churn, and setData() on a stale
			// source throws — uncaught in rAF, which would crash the whole app.
			const glow = map.getSource(MAPBOX_SOURCE_IDS.eventsGlow) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const rings = map.getSource(MAPBOX_SOURCE_IDS.eventsRings) as
				| mapboxgl.GeoJSONSource
				| undefined;
			const pulse = map.getSource(MAPBOX_SOURCE_IDS.eventsPulse) as
				| mapboxgl.GeoJSONSource
				| undefined;
			if (!glow || !rings || !pulse) {
				eventsPulseRafRef.current = window.requestAnimationFrame(animateRadar);
				return;
			}
			try {
				glow.setData({
					type: 'FeatureCollection',
					features: buildEventsGlowFeatures(eventCenters, phase, true),
				});
				rings.setData({
					type: 'FeatureCollection',
					features: buildEventsRadarLineFeatures(eventCenters, phase, {
						animated: true,
					}),
				});
				pulse.setData({
					type: 'FeatureCollection',
					features: buildEventsRadarLineFeatures(eventCenters, phase, {
						animated: true,
						bloom: true,
					}),
				});
			} catch {
				// Source transiently invalid mid-churn; stop cleanly. The effect
				// re-arms on the next map / centers change.
				cancelled = true;
				return;
			}

			eventsPulseRafRef.current = window.requestAnimationFrame(animateRadar);
		};

		eventsPulseRafRef.current = window.requestAnimationFrame(animateRadar);

		return () => {
			cancelled = true;
			if (eventsPulseRafRef.current != null) {
				window.cancelAnimationFrame(eventsPulseRafRef.current);
				eventsPulseRafRef.current = null;
			}
			clearPulse();
		};
	}, [map, isMapLoaded, eventCenters]);
};
