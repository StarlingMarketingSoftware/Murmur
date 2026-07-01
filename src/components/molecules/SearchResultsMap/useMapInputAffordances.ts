'use client';

import { useEffect } from 'react';
import type mapboxgl from 'mapbox-gl';
import { MAP_DEFAULT_ZOOM } from './constants';
import { clamp, mapboxEaseOutQuart } from './math';
import {
	MAP_CUSTOM_INPUT_EVENT_KEY,
	MAP_RIGHT_CLICK_DOUBLE_DISTANCE_PX,
	MAP_RIGHT_CLICK_DOUBLE_MS,
	MAP_RIGHT_DOUBLE_CLICK_ZOOM_EASE_MS,
	MAP_RIGHT_DOUBLE_CLICK_ZOOM_OUT_DELTA,
	MAP_SHIFT_ARROW_ZOOM_DELTA,
} from './mapInputFeel';

export interface UseMapInputAffordancesParams {
	map: mapboxgl.Map | null;
	isMapLoaded: boolean;
	isBackgroundPresentation: boolean;
}

export const useMapInputAffordances = ({
	map,
	isMapLoaded,
	isBackgroundPresentation,
}: UseMapInputAffordancesParams): void => {
	// Custom map mouse/keyboard affordances:
	// - a normal right click should be inert (and should not open the browser menu);
	// - a double right click zooms out a small step;
	// - Mapbox's built-in Shift+Arrow tilt/rotate shortcuts stay disabled. We let
	//   Shift+Up/Right zoom in and Shift+Down/Left zoom out instead.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isBackgroundPresentation) return;

		try {
			map.keyboard.disableRotation();
		} catch {
			// Non-fatal — older Mapbox builds may not expose keyboard rotation toggles.
		}

		let lastRightClick:
			| {
					at: number;
					x: number;
					y: number;
			  }
			| null = null;

		const easeZoomBy = (
			delta: number,
			point: mapboxgl.Point | [number, number] | null,
			originalEvent: Event
		) => {
			try {
				(
					originalEvent as Event & {
						[MAP_CUSTOM_INPUT_EVENT_KEY]?: boolean;
					}
				)[MAP_CUSTOM_INPUT_EVENT_KEY] = true;
				const currentZoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
				const targetZoom = clamp(
					currentZoom + delta,
					map.getMinZoom(),
					map.getMaxZoom()
				);
				if (Math.abs(targetZoom - currentZoom) < 0.01) return;
				map.easeTo(
					{
						zoom: targetZoom,
						around: point ? map.unproject(point) : map.getCenter(),
						duration: MAP_RIGHT_DOUBLE_CLICK_ZOOM_EASE_MS,
						easing: mapboxEaseOutQuart,
						essential: true,
					},
					{ originalEvent }
				);
			} catch {
				// Ignore transient teardown/style-race errors.
			}
		};

		const canvas = map.getCanvas();
		const canvasContainer = map.getCanvasContainer();
		const getCanvasPoint = (event: MouseEvent): [number, number] => {
			const rect = canvas.getBoundingClientRect();
			const scaleX = rect.width > 0 ? canvas.offsetWidth / rect.width : 1;
			const scaleY = rect.height > 0 ? canvas.offsetHeight / rect.height : 1;
			return [
				(event.clientX - rect.left) * scaleX,
				(event.clientY - rect.top) * scaleY,
			];
		};

		const onContextMenuCapture = (event: MouseEvent) => {
			event.preventDefault();
			event.stopPropagation();
			if (typeof event.stopImmediatePropagation === 'function') {
				event.stopImmediatePropagation();
			}
		};

		const onMouseDownCapture = (event: MouseEvent) => {
			if (event.button !== 2) return;

			event.preventDefault();
			event.stopPropagation();
			if (typeof event.stopImmediatePropagation === 'function') {
				event.stopImmediatePropagation();
			}

			const now =
				Number.isFinite(event.timeStamp) && event.timeStamp > 0
					? event.timeStamp
					: Date.now();
			const current = { at: now, x: event.clientX, y: event.clientY };
			const previous = lastRightClick;
			lastRightClick = current;
			if (!previous || now - previous.at > MAP_RIGHT_CLICK_DOUBLE_MS) return;

			const dx = current.x - previous.x;
			const dy = current.y - previous.y;
			if (Math.hypot(dx, dy) > MAP_RIGHT_CLICK_DOUBLE_DISTANCE_PX) return;

			lastRightClick = null;
			easeZoomBy(
				-MAP_RIGHT_DOUBLE_CLICK_ZOOM_OUT_DELTA,
				getCanvasPoint(event),
				event
			);
		};

		const onDblClickCapture = (event: MouseEvent) => {
			if (event.button !== 2) return;
			event.preventDefault();
			event.stopPropagation();
			if (typeof event.stopImmediatePropagation === 'function') {
				event.stopImmediatePropagation();
			}
		};

		const onKeyDownCapture = (event: KeyboardEvent) => {
			if (!event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
			if (
				event.key !== 'ArrowUp' &&
				event.key !== 'ArrowDown' &&
				event.key !== 'ArrowLeft' &&
				event.key !== 'ArrowRight'
			) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			if (typeof event.stopImmediatePropagation === 'function') {
				event.stopImmediatePropagation();
			}

			const zoomDirection =
				event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 1 : -1;
			easeZoomBy(zoomDirection * MAP_SHIFT_ARROW_ZOOM_DELTA, null, event);
		};

		canvasContainer.addEventListener('contextmenu', onContextMenuCapture, true);
		canvasContainer.addEventListener('mousedown', onMouseDownCapture, true);
		canvasContainer.addEventListener('dblclick', onDblClickCapture, true);
		// Mapbox binds its own keyboard handler on the canvas *container* in the
		// bubble phase, so a capture-phase listener on that same element is
		// guaranteed to run first (and intercept Shift+Arrow before Mapbox's
		// pitch/rotate shortcuts) regardless of which child is the focus target.
		canvasContainer.addEventListener('keydown', onKeyDownCapture, true);
		return () => {
			canvasContainer.removeEventListener('contextmenu', onContextMenuCapture, true);
			canvasContainer.removeEventListener('mousedown', onMouseDownCapture, true);
			canvasContainer.removeEventListener('dblclick', onDblClickCapture, true);
			canvasContainer.removeEventListener('keydown', onKeyDownCapture, true);
		};
	}, [map, isMapLoaded, isBackgroundPresentation]);
};
