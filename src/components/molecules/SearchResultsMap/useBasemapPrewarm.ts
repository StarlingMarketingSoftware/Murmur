'use client';

import { useEffect, useRef } from 'react';
import type mapboxgl from 'mapbox-gl';
import {
	MAP_DEFAULT_ZOOM,
	MAP_MIN_ZOOM,
	OVERVIEW_PREWARM_CENTER_QUANT_DEG,
	OVERVIEW_PREWARM_DEBOUNCE_MS,
	OVERVIEW_PREWARM_FLOOR_SKIP_MARGIN,
	OVERVIEW_PREWARM_ZOOMS,
} from './constants';

export interface UseBasemapPrewarmParams {
	map: mapboxgl.Map | null;
	isMapLoaded: boolean;
	isBackgroundPresentation: boolean;
}

export const useBasemapPrewarm = ({
	map,
	isMapLoaded,
	isBackgroundPresentation,
}: UseBasemapPrewarmParams): void => {
	// Basemap overview prewarm (see the prewarm effect below): last-warmed center
	// key for dedupe, and the pending debounce timer handle.
	const lastPrewarmKeyRef = useRef<string | null>(null);
	const prewarmTimerRef = useRef<number | null>(null);
	// Prewarm the coarse low-zoom basemap for the wide region the user would reveal
	// on zoom-out, so even the FIRST zoom-out renders already-cached cartography
	// instead of streaming streets-v12 across the periphery. Uses Mapbox's public,
	// event-free `jumpTo(preloadOnly)`: it clones the transform (no camera move, no
	// events) and warms the browser tile cache for that camera. Fires on a debounced
	// settle so it stays off the interaction hot path. The first settle after the
	// map turns interactive seeds the whole zoom-out path (overview levels + floor
	// view), so even a boot-then-immediate-zoom-out never streams.
	//
	// The background-presentation gate below is load-bearing beyond etiquette: the
	// decorative dashboard locks minZoom=maxZoom, and `preloadOnly` transforms clamp
	// to the live zoom constraints — a background-mode preload would silently warm
	// nothing useful.
	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (isBackgroundPresentation) return;

		const prewarm = () => {
			try {
				if (typeof map.jumpTo !== 'function') return;
				// `jumpTo` calls `map.stop()`, which would abort an in-progress camera
				// animation. Never prewarm while the camera is moving — defer until it
				// settles so we can't interrupt a fresh gesture started mid-debounce.
				if (typeof map.isMoving === 'function' && map.isMoving()) {
					schedule();
					return;
				}
				const zoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
				if (typeof document !== 'undefined' && document.hidden) return;
				const c = map.getCenter();
				if (!c) return;
				// Warm only the levels a zoom-out from here would newly reveal, plus
				// the floor view itself — the level every zoom-out ultimately lands
				// on (live getMinZoom: z2 desktop / z1 mobile / z3 large monitors).
				const minZoom =
					typeof map.getMinZoom === 'function' ? map.getMinZoom() : MAP_MIN_ZOOM;
				const zoomBand = Math.floor(zoom);
				const levels: number[] = OVERVIEW_PREWARM_ZOOMS.filter((z) => z < zoomBand);
				if (zoom - minZoom >= OVERVIEW_PREWARM_FLOOR_SKIP_MARGIN) {
					levels.push(minZoom);
				}
				if (levels.length === 0) return;
				const q = OVERVIEW_PREWARM_CENTER_QUANT_DEG;
				// Key includes the zoom band so descending in steps re-warms the levels
				// each step newly uncovers, while micro-zooms within a band still dedupe.
				const key = `${Math.round(c.lng / q) * q}:${Math.round(c.lat / q) * q}:${zoomBand}`;
				if (lastPrewarmKeyRef.current === key) return;
				lastPrewarmKeyRef.current = key;
				for (const z of levels) {
					map.jumpTo({ center: [c.lng, c.lat], zoom: z, preloadOnly: true } as any);
				}
			} catch {
				// Non-fatal — prewarm is a pure optimization, never break the map.
			}
		};

		// Hoisted function declaration (not a const): prewarm and schedule are
		// mutually recursive, and no-use-before-define only permits hoisted
		// function use-before-define (the pre-split file was lint-exempt).
		function schedule() {
			if (prewarmTimerRef.current != null) {
				window.clearTimeout(prewarmTimerRef.current);
			}
			prewarmTimerRef.current = window.setTimeout(prewarm, OVERVIEW_PREWARM_DEBOUNCE_MS);
		}

		map.on('moveend', schedule);
		// Seed once on first settle (covers deep-link-then-zoom-out with no pan).
		schedule();

		return () => {
			map.off('moveend', schedule);
			if (prewarmTimerRef.current != null) {
				window.clearTimeout(prewarmTimerRef.current);
				prewarmTimerRef.current = null;
			}
		};
	}, [map, isMapLoaded, isBackgroundPresentation]);
};
