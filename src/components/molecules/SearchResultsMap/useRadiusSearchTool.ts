'use client';

import { useCallback, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import mapboxgl from 'mapbox-gl';
import type { ContactWithName } from '@/types/contact';
import type { LatLngLiteral } from './types';
import type { SearchResultsMapProps } from './searchResultsMapProps';
import { EMPTY_POLYGON_FC, HOVER_TOOLTIP_Z_INDEX, MAPBOX_SOURCE_IDS } from './constants';
import { buildMercatorCircleMultiPolygon, mercatorMultiPolygonToLngLat } from './curatedBlob';
import { clamp } from './math';
import { KM_PER_MILE, RADIUS_PLACEMENT_PREVIEW_STEPS } from './radarOverlays';
import { getClientPointFromDomEvent } from './wasmGeo';
import { profileAreaMarkerSvg } from '@/components/atoms/_svg/ProfileAreaMarkerIcon';

// Radius search tool: the committed draggable center pin, the cursor-locked
// placement-mode ghost pin + live preview circle, and their map listeners.

export interface UseRadiusSearchToolParams {
	clearEmptyMapPrompt: () => void;
	contactsWithCoords: ContactWithName[];
	isBackgroundPresentation: boolean;
	isDraggingRadiusRef: MutableRefObject<boolean>;
	isLoading: boolean | undefined;
	isMapLoaded: boolean;
	map: mapboxgl.Map | null;
	onRadiusCenterChangeRef: MutableRefObject<SearchResultsMapProps['onRadiusCenterChange'] | null>;
	onRadiusPlaceRef: MutableRefObject<SearchResultsMapProps['onRadiusPlace'] | null>;
	onRadiusPlacementCancelRef: MutableRefObject<SearchResultsMapProps['onRadiusPlacementCancel'] | null>;
	radiusDragSuppressEmptyMapUntilRef: MutableRefObject<number>;
	radiusMarkerRef: MutableRefObject<mapboxgl.Marker | null>;
	radiusMarkerZoomHandlerRef: MutableRefObject<(() => void) | null>;
	radiusOverlay: SearchResultsMapProps['radiusOverlay'];
	radiusPlacementActive: boolean;
	radiusPlacementDownClientRef: MutableRefObject<{ x: number; y: number } | null>;
	radiusPlacementGhostElRef: MutableRefObject<HTMLDivElement | null>;
	radiusPlacementLastLngLatRef: MutableRefObject<LatLngLiteral | null>;
	radiusPlacementMiles: number;
	radiusPlacementMilesRef: MutableRefObject<number>;
	searchEngaged: boolean;
}

export const useRadiusSearchTool = (params: UseRadiusSearchToolParams): void => {
	const {
		clearEmptyMapPrompt,
		contactsWithCoords,
		isBackgroundPresentation,
		isDraggingRadiusRef,
		isLoading,
		isMapLoaded,
		map,
		onRadiusCenterChangeRef,
		onRadiusPlaceRef,
		onRadiusPlacementCancelRef,
		radiusDragSuppressEmptyMapUntilRef,
		radiusMarkerRef,
		radiusMarkerZoomHandlerRef,
		radiusOverlay,
		radiusPlacementActive,
		radiusPlacementDownClientRef,
		radiusPlacementGhostElRef,
		radiusPlacementLastLngLatRef,
		radiusPlacementMiles,
		radiusPlacementMilesRef,
		searchEngaged,
	} = params;
	// Radius-search center pin. Appears alongside the single-circle blob (i.e. only
	// once a radius search has results), reusing the shared profile-area location
	// marker SVG — a touch smaller, scaled with zoom. Draggable: dropping it
	// recenters the radius and re-runs the search.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		// While the user is placing a new center, the cursor-locked ghost pin stands in
		// for the committed pin — hide the draggable one so there's never two.
		const showPin =
			!!radiusOverlay &&
			searchEngaged &&
			!radiusPlacementActive;
		if (!showPin) {
			if (radiusMarkerZoomHandlerRef.current) {
				map.off('zoom', radiusMarkerZoomHandlerRef.current);
				radiusMarkerZoomHandlerRef.current = null;
			}
			radiusMarkerRef.current?.remove();
			radiusMarkerRef.current = null;
			return;
		}
		const { center } = radiusOverlay;
		if (!radiusMarkerRef.current) {
			const el = document.createElement('div');
			el.dataset.radiusCenterMarker = 'true';
			el.style.cursor = 'grab';
			el.style.width = '22px';
			el.style.height = '27px';
			const inner = document.createElement('div');
			inner.style.width = '100%';
			inner.style.height = '100%';
			inner.style.transformOrigin = 'bottom center';
			inner.innerHTML = profileAreaMarkerSvg;
			el.appendChild(inner);

			const applyRadiusPinZoomScale = () => {
				const scale = clamp(0.55 + (map.getZoom() - 5) * 0.075, 0.6, 1.15);
				inner.style.transform = `scale(${scale})`;
			};
			applyRadiusPinZoomScale();
			map.on('zoom', applyRadiusPinZoomScale);
			radiusMarkerZoomHandlerRef.current = applyRadiusPinZoomScale;

			const marker = new mapboxgl.Marker({
				element: el,
				anchor: 'bottom',
				draggable: true,
			})
				.setLngLat([center.lng, center.lat])
				.addTo(map);
			marker.on('dragstart', () => {
				isDraggingRadiusRef.current = true;
				radiusDragSuppressEmptyMapUntilRef.current = Number.POSITIVE_INFINITY;
				clearEmptyMapPrompt();
				el.style.cursor = 'grabbing';
			});
			marker.on('dragend', () => {
				isDraggingRadiusRef.current = false;
				radiusDragSuppressEmptyMapUntilRef.current = Date.now() + 300;
				el.style.cursor = 'grab';
				const ll = marker.getLngLat();
				onRadiusCenterChangeRef.current?.({ lat: ll.lat, lng: ll.lng });
			});
			radiusMarkerRef.current = marker;
		} else if (!isDraggingRadiusRef.current) {
			radiusMarkerRef.current.setLngLat([center.lng, center.lat]);
		}
	}, [
		map,
		isMapLoaded,
		radiusOverlay,
		searchEngaged,
		radiusPlacementActive,
		clearEmptyMapPrompt,
	]);

	// ── Radius-center placement (cursor-locked pin + live preview circle) ──────
	// When radius mode is turned on, instead of assuming the user's closest location
	// the map enters a "placement" mode: the same red radius pin used by the dropped
	// center is locked to the cursor with a preview circle (sized to the draft
	// slider), so the user can click anywhere to drop the center. Panning still
	// works — only a click that isn't a drag commits. ESC cancels.
	//
	// Helper to (re)draw the preview circle from a lngLat + current draft radius.
	const drawRadiusPlacementPreview = useCallback(
		(lngLat: LatLngLiteral | null, radiusMilesOverride?: number) => {
			if (!map) return;
			const source = map.getSource(MAPBOX_SOURCE_IDS.radiusPreview) as
				| mapboxgl.GeoJSONSource
				| undefined;
			if (!source) return;
			if (!lngLat) {
				source.setData(EMPTY_POLYGON_FC as GeoJSON.FeatureCollection);
				return;
			}
			const radiusMiles = radiusMilesOverride ?? radiusPlacementMilesRef.current;
			const radiusKm = Math.max(0, radiusMiles) * KM_PER_MILE;
			const circle = buildMercatorCircleMultiPolygon(
				lngLat,
				radiusKm,
				RADIUS_PLACEMENT_PREVIEW_STEPS,
				0,
				0
			);
			const rings = circle ? mercatorMultiPolygonToLngLat(circle) : null;
			if (!rings || rings.length === 0) {
				source.setData(EMPTY_POLYGON_FC as GeoJSON.FeatureCollection);
				return;
			}
			source.setData({
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						properties: {},
						geometry: { type: 'Polygon', coordinates: rings[0] as number[][][] },
					},
				],
			} as GeoJSON.FeatureCollection);
		},
		[map]
	);

	// Keep the preview circle in sync when the draft radius changes mid-placement.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (!radiusPlacementActive) return;
		drawRadiusPlacementPreview(radiusPlacementLastLngLatRef.current);
	}, [map, isMapLoaded, radiusPlacementActive, radiusPlacementMiles, drawRadiusPlacementPreview]);

	// Once a radius center has been dropped, keep drawing the "old" radius UI circle
	// from the committed overlay itself. This makes the red pin + circle appear
	// immediately on drop (and stay visible even while results are loading / empty),
	// instead of only appearing after curated blob geometry has contacts to build from.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (radiusPlacementActive) return;
		if (
			!radiusOverlay ||
			!searchEngaged ||
			// Once real radius results have loaded, the normal curated blob layer owns
			// the circle behind markers. Keep this top-level preview only during the
			// pending gap or for empty-result radius searches.
			(!isLoading && contactsWithCoords.length > 0)
		) {
			drawRadiusPlacementPreview(null);
			return;
		}
		drawRadiusPlacementPreview(radiusOverlay.center, radiusOverlay.radiusMiles);
	}, [
		map,
		isMapLoaded,
		radiusPlacementActive,
		radiusOverlay,
		searchEngaged,
		isLoading,
		contactsWithCoords,
		drawRadiusPlacementPreview,
	]);

	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isBackgroundPresentation) return;
		if (!radiusPlacementActive) return;

		const canvas = map.getCanvas();
		const container = map.getContainer();

		// Build the cursor-locked ghost pin (absolutely positioned inside the map
		// container; we move it in viewport px on each pointer move).
		const ghost = document.createElement('div');
		ghost.dataset.radiusPlacementGhost = 'true';
		ghost.style.position = 'absolute';
		ghost.style.left = '0';
		ghost.style.top = '0';
		ghost.style.width = '22px';
		ghost.style.height = '27px';
		ghost.style.pointerEvents = 'none';
		ghost.style.zIndex = String(HOVER_TOOLTIP_Z_INDEX + 9);
		ghost.style.transformOrigin = 'bottom center';
		ghost.style.willChange = 'transform';
		ghost.style.filter = 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))';
		ghost.style.opacity = '0';
		const ghostInner = document.createElement('div');
		ghostInner.style.width = '100%';
		ghostInner.style.height = '100%';
		ghostInner.innerHTML = profileAreaMarkerSvg;
		ghost.appendChild(ghostInner);
		container.appendChild(ghost);
		radiusPlacementGhostElRef.current = ghost;

		// Position the ghost from Mapbox's `point` (canvas-local CSS px, i.e. the map
		// container's own untransformed coordinate space). This is robust to any CSS
		// transform on an ancestor (e.g. the scroll-scrub scale) — unlike a clientX -
		// containerRect computation, which would be thrown off by that scale.
		const positionGhost = (point: { x: number; y: number } | null) => {
			if (!point) {
				ghost.style.opacity = '0';
				return;
			}
			// Anchor the pin tip at the pointer; scale the glyph with zoom to mirror the
			// committed radius pin.
			const scale = clamp(0.55 + ((map.getZoom() ?? 5) - 5) * 0.075, 0.6, 1.15);
			ghost.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -100%) scale(${scale})`;
			ghost.style.opacity = '1';
		};

		// Hide the native cursor over the canvas so only the ghost pin shows.
		let prevCursor = '';
		try {
			prevCursor = canvas.style.cursor;
			canvas.style.cursor = 'none';
		} catch {
			// Ignore.
		}

		const onMove = (e: mapboxgl.MapMouseEvent) => {
			// Re-assert the hidden cursor: the shared hover handler resets it to '' on
			// canvas mouseleave, so keep hiding it while placing.
			try {
				canvas.style.cursor = 'none';
			} catch {
				// Ignore.
			}
			radiusPlacementLastLngLatRef.current = { lat: e.lngLat.lat, lng: e.lngLat.lng };
			positionGhost(e.point);
			drawRadiusPlacementPreview({ lat: e.lngLat.lat, lng: e.lngLat.lng });
		};
		const onTouchMove = (e: mapboxgl.MapTouchEvent) => {
			radiusPlacementLastLngLatRef.current = { lat: e.lngLat.lat, lng: e.lngLat.lng };
			positionGhost(e.point);
			drawRadiusPlacementPreview({ lat: e.lngLat.lat, lng: e.lngLat.lng });
		};
		const onDown = (e: mapboxgl.MapMouseEvent) => {
			radiusPlacementDownClientRef.current = getClientPointFromDomEvent(e.originalEvent);
		};
		const onUp = (e: mapboxgl.MapMouseEvent) => {
			// Only a left-click that didn't move (i.e. not a pan) places the center.
			const domEv = e.originalEvent;
			if (domEv instanceof MouseEvent && domEv.button !== 0) return;
			const down = radiusPlacementDownClientRef.current;
			radiusPlacementDownClientRef.current = null;
			const up = getClientPointFromDomEvent(domEv);
			const moved = Boolean(
				down &&
				up &&
				(Math.abs(down.x - up.x) >= 6 || Math.abs(down.y - up.y) >= 6)
			);
			if (moved) return;
			onRadiusPlaceRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
		};
		const onCanvasLeave = () => {
			ghost.style.opacity = '0';
		};
		const onKeyDown = (ev: KeyboardEvent) => {
			if (ev.key === 'Escape') onRadiusPlacementCancelRef.current?.();
		};

		map.on('mousemove', onMove);
		map.on('touchmove', onTouchMove);
		map.on('mousedown', onDown);
		map.on('click', onUp);
		canvas.addEventListener('mouseleave', onCanvasLeave);
		window.addEventListener('keydown', onKeyDown);

		// Seed the preview at the last known pointer position (if any) so the circle is
		// visible immediately after entering placement without waiting for a move.
		drawRadiusPlacementPreview(radiusPlacementLastLngLatRef.current);

		return () => {
			map.off('mousemove', onMove);
			map.off('touchmove', onTouchMove);
			map.off('mousedown', onDown);
			map.off('click', onUp);
			canvas.removeEventListener('mouseleave', onCanvasLeave);
			window.removeEventListener('keydown', onKeyDown);
			try {
				canvas.style.cursor = prevCursor;
			} catch {
				// Ignore.
			}
			ghost.remove();
			radiusPlacementGhostElRef.current = null;
			radiusPlacementDownClientRef.current = null;
			drawRadiusPlacementPreview(null);
		};
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		radiusPlacementActive,
		drawRadiusPlacementPreview,
	]);
};
