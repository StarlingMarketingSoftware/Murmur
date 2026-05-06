import {
	CLOUDS_OVERLAY_FADE_OUT_END_ZOOM,
	CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
	LIGHTNING_SCALE_ZOOM_END,
	LIGHTNING_SCALE_ZOOM_START,
	LIGHTNING_STAMPS_VERSION,
	LIGHTNING_ZOOMED_OUT_BOOST_END_ZOOM,
	LIGHTNING_ZOOMED_OUT_BOOST_FULL_ZOOM,
	MAP_MIN_ZOOM,
} from './constants';
import { clamp } from './math';

export const LIGHTNING_STAMPS_URL = (i: number) =>
	`/maps/lightning_stamps/flash_${String(i).padStart(2, '0')}.png?v=${LIGHTNING_STAMPS_VERSION}`;

// At fully zoomed-out globe view we boost lightning frequency / scale so the
// effect reads from far away. This `t` ramps 1 → 0 as the user zooms in.
export const getLightningZoomedOutBoostT = (zoom: number) => {
	if (zoom <= LIGHTNING_ZOOMED_OUT_BOOST_FULL_ZOOM) return 1;
	if (zoom >= LIGHTNING_ZOOMED_OUT_BOOST_END_ZOOM) return 0;
	const t =
		(LIGHTNING_ZOOMED_OUT_BOOST_END_ZOOM - zoom) /
		(LIGHTNING_ZOOMED_OUT_BOOST_END_ZOOM - LIGHTNING_ZOOMED_OUT_BOOST_FULL_ZOOM);
	const clamped = clamp(t, 0, 1);
	return clamped * clamped * (3 - 2 * clamped);
};

// At zoomed-in (city-level) we want lightning to feel "close" — bigger flashes,
// brighter glow. This `t` ramps 0 → 1 over the close-zoom range.
export const getLightningZoomedInT = (zoom: number) => {
	if (zoom <= LIGHTNING_SCALE_ZOOM_START) return 0;
	if (zoom >= LIGHTNING_SCALE_ZOOM_END) return 1;
	const t =
		(zoom - LIGHTNING_SCALE_ZOOM_START) /
		(LIGHTNING_SCALE_ZOOM_END - LIGHTNING_SCALE_ZOOM_START);
	const clamped = clamp(t, 0, 1);
	return clamped * clamped * (3 - 2 * clamped);
};

export const buildLightningOpacityExpr = (intensity: number) => [
	'interpolate',
	['linear'],
	['zoom'],
	0,
	intensity,
	MAP_MIN_ZOOM,
	intensity,
	4,
	intensity,
	CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
	intensity * 0.9,
	CLOUDS_OVERLAY_FADE_OUT_END_ZOOM,
	0,
	22,
	0,
];
