import {
	GLOOM_WASH_FADE_END_ZOOM,
	GLOOM_WASH_FADE_START_ZOOM,
	LIGHTING_OVERLAY_FADE_END_ZOOM,
	LIGHTING_OVERLAY_FADE_START_ZOOM,
} from './constants';

// Globe-wide softbox overlay opacity. Holds full at globe zoom, then fades out
// as the user zooms past the decorative range so close-up city zoom is unlit.
// `floorDelta` (viewport-proportional raise of the interactive zoom floor)
// shifts the whole ramp so the lit-sphere read is at full strength at the
// floor on every monitor.
export const computeLightingOverlayOpacity = (zoom: number, floorDelta = 0) => {
	const z = zoom - floorDelta;
	if (z <= LIGHTING_OVERLAY_FADE_START_ZOOM) return 1;
	if (z >= LIGHTING_OVERLAY_FADE_END_ZOOM) return 0;
	const t =
		(z - LIGHTING_OVERLAY_FADE_START_ZOOM) /
		(LIGHTING_OVERLAY_FADE_END_ZOOM - LIGHTING_OVERLAY_FADE_START_ZOOM);
	// Ease-in cubic: stays near full, then drops off fast near the end.
	return 1 - t * t * t;
};

// Stormy gloom wash. Persists into city zoom (longer fade than the softbox)
// because the brooding atmosphere should still color the streets.
export const computeGloomWashFade = (zoom: number) => {
	if (zoom <= GLOOM_WASH_FADE_START_ZOOM) return 1;
	if (zoom >= GLOOM_WASH_FADE_END_ZOOM) return 0;
	return (
		1 -
		(zoom - GLOOM_WASH_FADE_START_ZOOM) /
			(GLOOM_WASH_FADE_END_ZOOM - GLOOM_WASH_FADE_START_ZOOM)
	);
};
