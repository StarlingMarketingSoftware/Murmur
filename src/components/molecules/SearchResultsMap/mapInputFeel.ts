import { MAPBOX_NATIVE_PINCH_ZOOM_RATE, MAPBOX_NATIVE_WHEEL_ZOOM_RATE, MAP_PINCH_ZOOM_RATE, MAP_WHEEL_ZOOM_RATE, STREET_VIEW_MAX_PITCH, STREET_VIEW_PITCH_RAMP_FULL_ZOOM, STREET_VIEW_PITCH_RAMP_START_ZOOM, ZOOM_OUT_GOVERNOR_APPLY_EPSILON, ZOOM_OUT_GOVERNOR_DEADZONE, ZOOM_OUT_GOVERNOR_ENABLED, ZOOM_OUT_GOVERNOR_ENERGY_DECAY_TAU_MS, ZOOM_OUT_GOVERNOR_ENERGY_SCALE, ZOOM_OUT_GOVERNOR_GESTURE_GAP_MS, ZOOM_OUT_GOVERNOR_MIN_RATE_MULTIPLIER, getDragPanInertiaOptions } from './constants';
import { createZoomOutGovernor } from './zoomOutGovernor';
export const MAP_RIGHT_CLICK_DOUBLE_MS = 500;

export const MAP_RIGHT_CLICK_DOUBLE_DISTANCE_PX = 18;

// "a bit of a zoom out": intentionally smaller than Mapbox's default full-level
// (1.0) double-click step so a double right-click nudges the camera out rather
// than making a big jump.
export const MAP_RIGHT_DOUBLE_CLICK_ZOOM_OUT_DELTA = 0.75;

export const MAP_RIGHT_DOUBLE_CLICK_ZOOM_EASE_MS = 300;

export const MAP_SHIFT_ARROW_ZOOM_DELTA = 1;

export const MAP_CUSTOM_INPUT_EVENT_KEY = '__murmurMapCustomInput';


export const createConfiguredZoomOutGovernor = () =>
	createZoomOutGovernor({
		enabled: ZOOM_OUT_GOVERNOR_ENABLED,
		baseWheelRate: MAP_WHEEL_ZOOM_RATE,
		baseTrackpadRate: MAP_PINCH_ZOOM_RATE,
		minRateMultiplier: ZOOM_OUT_GOVERNOR_MIN_RATE_MULTIPLIER,
		energyScale: ZOOM_OUT_GOVERNOR_ENERGY_SCALE,
		energyDecayTauMs: ZOOM_OUT_GOVERNOR_ENERGY_DECAY_TAU_MS,
		gestureGapMs: ZOOM_OUT_GOVERNOR_GESTURE_GAP_MS,
		deadzone: ZOOM_OUT_GOVERNOR_DEADZONE,
		applyEpsilon: ZOOM_OUT_GOVERNOR_APPLY_EPSILON,
	});


// `nativeFeel` restores Mapbox's built-in scroll/pinch zoom rates. The tuned
// MAP_WHEEL_ZOOM_RATE / MAP_PINCH_ZOOM_RATE are a DESKTOP feel; on touch devices
// we want native pinch-zoom, so the mobile paths call this with
// `nativeFeel = true`. Defaults to the desktop tuning so every existing desktop
// call site is unchanged.
export const applyScrollZoomFeel = (mapInstance: mapboxgl.Map, nativeFeel = false) => {
	const wheelRate = nativeFeel
		? MAPBOX_NATIVE_WHEEL_ZOOM_RATE
		: MAP_WHEEL_ZOOM_RATE;
	const pinchRate = nativeFeel
		? MAPBOX_NATIVE_PINCH_ZOOM_RATE
		: MAP_PINCH_ZOOM_RATE;
	try {
		mapInstance.scrollZoom.setWheelZoomRate(wheelRate);
		mapInstance.scrollZoom.setZoomRate(pinchRate);
	} catch {
		// Non-fatal — older Mapbox builds may not expose these setters.
	}

	// Local-dev sanity hook: if Fast Refresh preserves the Mapbox instance, this
	// lets us confirm the live handler has received the newest tuning constants.
	if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
		(
			window as unknown as {
				__murmurMapZoomFeel?: {
					wheelRate: number;
					trackpadRate: number;
					zoomOutGovernorMinMultiplier: number;
					zoomOutGovernorEnergyScale: number;
				};
			}
		).__murmurMapZoomFeel = {
			wheelRate,
			trackpadRate: pinchRate,
			zoomOutGovernorMinMultiplier: ZOOM_OUT_GOVERNOR_MIN_RATE_MULTIPLIER,
			zoomOutGovernorEnergyScale: ZOOM_OUT_GOVERNOR_ENERGY_SCALE,
		};
	}
};


// Enable drag-pan with the right inertia "feel" for the device. Desktop gets the
// tuned "Airbnb latch" inertia (getDragPanInertiaOptions, zoom-aware); mobile
// gets Mapbox's native touch inertia. mapbox-gl 3.x does NOT persist inertia
// options on the handler: `DragPanHandler.enable(opts)` does
// `this._inertiaOptions = opts || {}`, and on release Mapbox merges
// `Object.assign({}, defaultPanInertiaOptions, this._inertiaOptions)` — so a bare
// `enable()` (empty options) yields native inertia, while the desktop feel must
// be RE-passed at every enable() site (a bare enable() silently reverts it).
// This helper is therefore the single source of truth invoked at all drag-pan
// enable sites (construction, safeEnableInteractions, rectangle-select toggle,
// zoom-end refresh) so the desktop/mobile split can't drift between them.
export const enableDragPanFeel = (mapInstance: mapboxgl.Map, nativeFeel = false) => {
	try {
		if (nativeFeel) {
			// Mobile / touch: bare enable() → Mapbox's native pan inertia.
			mapInstance.dragPan.enable();
		} else {
			// Desktop: re-pass the tuned, zoom-aware inertia every time.
			mapInstance.dragPan.enable(getDragPanInertiaOptions(mapInstance.getZoom()));
		}
	} catch {
		// Non-fatal — older Mapbox builds may not accept all options.
	}
};


// Upload the current canvas content to the source's GPU texture once, leaving the
// source paused afterwards (CanvasSource.pause() runs prepare() — a synchronous
// texture.update — before clearing its playing flag).
export const uploadCanvasSourceOnce = (
	src: { play?: () => void; pause?: () => void } | null | undefined
) => {
	try {
		src?.play?.();
		src?.pause?.();
	} catch {
		// Non-fatal.
	}
};


// Street-view pitch as a continuous function of zoom: flat below the ramp,
// linearly tilting to STREET_VIEW_MAX_PITCH at full street zoom.
export const computeStreetViewPitch = (zoom: number): number => {
	if (zoom <= STREET_VIEW_PITCH_RAMP_START_ZOOM) return 0;
	if (zoom >= STREET_VIEW_PITCH_RAMP_FULL_ZOOM) return STREET_VIEW_MAX_PITCH;
	const t =
		(zoom - STREET_VIEW_PITCH_RAMP_START_ZOOM) /
		(STREET_VIEW_PITCH_RAMP_FULL_ZOOM - STREET_VIEW_PITCH_RAMP_START_ZOOM);
	return STREET_VIEW_MAX_PITCH * t;
};
