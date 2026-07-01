import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
	DRAG_PAN_DECELERATION,
	DRAG_PAN_LINEARITY,
	DRAG_PAN_MAX_SPEED,
	DRAG_PAN_ZOOMED_IN_MAX_SPEED,
	DRAG_PAN_ZOOM_BOOST_START_ZOOM,
	DRAG_PAN_ZOOM_BOOST_END_ZOOM,
	DRAG_PAN_INERTIA_OPTIONS,
	getDragPanInertiaOptions,
	getDragPanMaxSpeedForZoom,
	MAP_WHEEL_ZOOM_RATE,
	MAP_PINCH_ZOOM_RATE,
	MAPBOX_NATIVE_WHEEL_ZOOM_RATE,
	MAPBOX_NATIVE_PINCH_ZOOM_RATE,
} from './constants';
import { mapboxDragPanLinearDecel } from './math';

// These tests lock in the drag-pan "Airbnb latch" feel and, crucially, guard
// against the regression they fix: in mapbox-gl 3.x `dragPan.enable()` with no
// args resets inertia to Mapbox defaults, so every enable() site must pass the
// zoom-aware tuned options. enableDragPanFeel (mapInputFeel.ts) is the single
// source of truth re-passed at all dragPan.enable call sites; the component
// (SearchResultsMap.tsx) must only ever call the helper.

// Mapbox GL 3.x built-in pan inertia defaults (the "floaty" preset we override).
const MAPBOX_DEFAULT_DECELERATION = 2500;
const MAPBOX_DEFAULT_LINEARITY = 0.3;
const MAPBOX_DEFAULT_MAX_SPEED = 1400;
const searchResultsMapSource = readFileSync(
	new URL('./SearchResultsMap.tsx', import.meta.url),
	'utf8'
);
const mapInputFeelSource = readFileSync(
	new URL('./mapInputFeel.ts', import.meta.url),
	'utf8'
);

// Mirrors mapbox-gl's calculateEasing(): coast distance for a flick at the
// velocity clamp. speed is clamped to maxSpeed, duration = speed /
// (deceleration * linearity), and the eased distance = speed * duration / 2.
const coastDistanceAtClamp = (opts: {
	deceleration: number;
	linearity: number;
	maxSpeed: number;
}) => {
	const speed = opts.maxSpeed;
	const duration = Math.abs(speed) / (opts.deceleration * opts.linearity);
	return speed * (duration / 2);
};

const durationAtClamp = (opts: {
	deceleration: number;
	linearity: number;
	maxSpeed: number;
}) => Math.abs(opts.maxSpeed) / (opts.deceleration * opts.linearity);

test('default inertia object carries the tuned zoomed-out values', () => {
	assert.equal(DRAG_PAN_INERTIA_OPTIONS.deceleration, DRAG_PAN_DECELERATION);
	assert.equal(DRAG_PAN_INERTIA_OPTIONS.linearity, DRAG_PAN_LINEARITY);
	assert.equal(DRAG_PAN_INERTIA_OPTIONS.maxSpeed, DRAG_PAN_MAX_SPEED);
	assert.equal(DRAG_PAN_INERTIA_OPTIONS.easing, mapboxDragPanLinearDecel);
	assert.deepEqual(DRAG_PAN_INERTIA_OPTIONS, getDragPanInertiaOptions(0));
});

test('tuning keeps the snap fields non-default while allowing larger flicks', () => {
	// If any field silently matched the Mapbox default, a bare enable() reset
	// would be indistinguishable from our tuning — defeating the fix.
	assert.notEqual(
		DRAG_PAN_INERTIA_OPTIONS.deceleration,
		MAPBOX_DEFAULT_DECELERATION
	);
	assert.notEqual(DRAG_PAN_INERTIA_OPTIONS.linearity, MAPBOX_DEFAULT_LINEARITY);
	assert.notEqual(DRAG_PAN_INERTIA_OPTIONS.maxSpeed, MAPBOX_DEFAULT_MAX_SPEED);
	// deceleration must remain aggressive for the crisp end snap; maxSpeed is
	// intentionally above Mapbox's default so big flicks travel farther.
	assert.ok(DRAG_PAN_INERTIA_OPTIONS.deceleration > MAPBOX_DEFAULT_DECELERATION);
	assert.ok(DRAG_PAN_INERTIA_OPTIONS.maxSpeed > MAPBOX_DEFAULT_MAX_SPEED);
	// heavy/direct blend in the documented 0.3-0.5 band.
	assert.ok(
		DRAG_PAN_INERTIA_OPTIONS.linearity >= 0.3 &&
			DRAG_PAN_INERTIA_OPTIONS.linearity <= 0.5
	);
});

test('zoom-aware maxSpeed keeps low zoom restrained and boosts high zoom', () => {
	assert.equal(
		getDragPanMaxSpeedForZoom(DRAG_PAN_ZOOM_BOOST_START_ZOOM - 1),
		DRAG_PAN_MAX_SPEED
	);
	assert.equal(
		getDragPanMaxSpeedForZoom(DRAG_PAN_ZOOM_BOOST_START_ZOOM),
		DRAG_PAN_MAX_SPEED
	);
	assert.equal(
		getDragPanMaxSpeedForZoom(DRAG_PAN_ZOOM_BOOST_END_ZOOM),
		DRAG_PAN_ZOOMED_IN_MAX_SPEED
	);
	assert.equal(
		getDragPanMaxSpeedForZoom(DRAG_PAN_ZOOM_BOOST_END_ZOOM + 1),
		DRAG_PAN_ZOOMED_IN_MAX_SPEED
	);
	const midZoom =
		(DRAG_PAN_ZOOM_BOOST_START_ZOOM + DRAG_PAN_ZOOM_BOOST_END_ZOOM) / 2;
	const midSpeed = getDragPanMaxSpeedForZoom(midZoom);
	assert.ok(midSpeed > DRAG_PAN_MAX_SPEED);
	assert.ok(midSpeed < DRAG_PAN_ZOOMED_IN_MAX_SPEED);
});

test('drag-pan enable is centralized with a desktop-tuned / mobile-native split', () => {
	// Drag-pan inertia is now DESKTOP-only: desktop keeps the tuned "Airbnb latch"
	// feel, mobile gets Mapbox's native touch inertia (a bare enable(), which
	// Mapbox merges over defaultPanInertiaOptions on release). Both raw
	// dragPan.enable() calls must live inside the single enableDragPanFeel helper
	// so the desktop/mobile decision can't drift between call sites, and the
	// desktop branch must still RE-pass the zoom-aware options (mapbox-gl 3.x does
	// not persist _inertiaOptions on the handler — the original regression).
	const rawEnableLines = mapInputFeelSource
		.split('\n')
		.filter((line) => line.includes('dragPan.enable('));
	assert.equal(rawEnableLines.length, 2);
	// The component itself must never call dragPan.enable() directly.
	assert.equal(
		searchResultsMapSource
			.split('\n')
			.filter((line) => line.includes('dragPan.enable(')).length,
		0
	);
	const desktopEnable = rawEnableLines.filter((line) =>
		/getDragPanInertiaOptions\(.+\.getZoom\(\)\)/.test(line)
	);
	const nativeEnable = rawEnableLines.filter((line) =>
		/dragPan\.enable\(\s*\)/.test(line)
	);
	assert.equal(desktopEnable.length, 1);
	assert.equal(nativeEnable.length, 1);

	// Every drag-pan (re-)enable site must delegate to the helper rather than
	// calling dragPan.enable() directly (construction, the device-class/Fast-Refresh
	// re-apply, safeEnableInteractions, the rectangle-select toggle, and the
	// zoom-end inertia refresh).
	const helperCallSites = searchResultsMapSource
		.split('\n')
		.filter((line) => /enableDragPanFeel\((?:map|mapInstance)/.test(line)).length;
	assert.ok(
		helperCallSites >= 4,
		`expected >=4 enableDragPanFeel call sites, found ${helperCallSites}`
	);
});

test('mobile scroll/pinch zoom feel falls back to Mapbox native rates', () => {
	// The desktop feel tuning (MAP_WHEEL_ZOOM_RATE / MAP_PINCH_ZOOM_RATE) must not
	// leak onto touch devices: the native fallbacks must equal Mapbox's built-in
	// ScrollZoomHandler rates, and must differ from the desktop tuning so the split
	// is real.
	assert.equal(MAPBOX_NATIVE_WHEEL_ZOOM_RATE, 1 / 450);
	assert.equal(MAPBOX_NATIVE_PINCH_ZOOM_RATE, 1 / 100);
	assert.notEqual(MAPBOX_NATIVE_WHEEL_ZOOM_RATE, MAP_WHEEL_ZOOM_RATE);
	assert.notEqual(MAPBOX_NATIVE_PINCH_ZOOM_RATE, MAP_PINCH_ZOOM_RATE);

	// applyScrollZoomFeel must actually consume the native constants on its
	// nativeFeel path (guards against the mobile branch silently keeping desktop
	// rates).
	assert.match(mapInputFeelSource, /MAPBOX_NATIVE_WHEEL_ZOOM_RATE/);
	assert.match(mapInputFeelSource, /MAPBOX_NATIVE_PINCH_ZOOM_RATE/);
});

test('hard flicks travel farther when zoomed in while keeping a snappy duration', () => {
	const zoomedOut = getDragPanInertiaOptions(DRAG_PAN_ZOOM_BOOST_START_ZOOM);
	const zoomedIn = getDragPanInertiaOptions(DRAG_PAN_ZOOM_BOOST_END_ZOOM);
	const zoomedOutCoast = coastDistanceAtClamp(zoomedOut);
	const zoomedInCoast = coastDistanceAtClamp(zoomedIn);
	const zoomedInDuration = durationAtClamp(zoomedIn);
	const mapboxDefault = coastDistanceAtClamp({
		deceleration: MAPBOX_DEFAULT_DECELERATION,
		linearity: MAPBOX_DEFAULT_LINEARITY,
		maxSpeed: MAPBOX_DEFAULT_MAX_SPEED,
	});
	const mapboxDefaultDuration = durationAtClamp({
		deceleration: MAPBOX_DEFAULT_DECELERATION,
		linearity: MAPBOX_DEFAULT_LINEARITY,
		maxSpeed: MAPBOX_DEFAULT_MAX_SPEED,
	});
	// Low zoom remains the current open-but-bounded coast (~691px).
	assert.ok(zoomedOutCoast < mapboxDefault * 0.6);
	// High zoom travels much farther (~1286px) so zoomed-in flicks stop feeling
	// underpowered, but the duration remains much shorter than Mapbox default so
	// the end still snaps instead of floating.
	assert.ok(zoomedInCoast > zoomedOutCoast * 1.8);
	assert.ok(zoomedInCoast < mapboxDefault);
	assert.ok(zoomedInDuration < mapboxDefaultDuration / 2);
});

test('custom easing is constant-deceleration ease-out (no soft bezier tail)', () => {
	// position(t) = 1 - (1 - t)^2 → endpoints clamped, monotonic, midpoint 0.75.
	assert.equal(mapboxDragPanLinearDecel(0), 0);
	assert.equal(mapboxDragPanLinearDecel(1), 1);
	assert.equal(mapboxDragPanLinearDecel(0.5), 0.75);
	// out-of-range inputs clamp rather than overshoot.
	assert.equal(mapboxDragPanLinearDecel(-0.5), 0);
	assert.equal(mapboxDragPanLinearDecel(1.5), 1);
	// strictly increasing across the interval.
	let prev = -Infinity;
	for (let t = 0; t <= 1.0001; t += 0.1) {
		const v = mapboxDragPanLinearDecel(t);
		assert.ok(v >= prev, `easing must be monotonic non-decreasing at t=${t}`);
		prev = v;
	}
});
