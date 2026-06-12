import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	CAMPAIGN_SNUG_MAX_HEIGHT_FIT_ZOOM,
	computeMapSelectGrabViewScale,
	computeMurmurChromeZoomForViewport,
	computeSideRailCenterDeadbandPx,
	computeSideRailCenterShiftPx,
	MURMUR_CHROME_ZOOM_DEFAULT,
	MURMUR_CHROME_ZOOM_MAX,
	MURMUR_CHROME_ZOOM_MIN,
} from './murmurChromeZoom';

// MAP_SELECT_GRAB_TOTAL_HEIGHT_PX / CAMPAIGN_MAP_SELECT_GRAB_TOTAL_HEIGHT_PX:
// 144 + 23 + 21 + 55 + 12 + 55 + 19 + 473 (top extent) + 114 (collapsed tool).
const RAIL_TOTAL_HEIGHT_PX = 916;

test('maximized 1920×1080 monitor hits the tuned 0.92 entry via screen near-match', () => {
	// Real browser viewport on a 1080p monitor (menu bar + browser chrome eat ~130px);
	// the screen near-match must still resolve the tuned entry from raw screen dims.
	const zoom = computeMurmurChromeZoomForViewport(1920, 949, {
		width: 1920,
		height: 1080,
		availWidth: 1920,
		availHeight: 1055,
	});
	assert.equal(zoom, 0.92);
});

test('windowed browser on a 1920×1080 monitor still matches the screen entry', () => {
	// A wide-but-not-16:10-ish window classifies via the screen ratio and the raw
	// screen dims near-match the tuned 1920×1080 entry.
	const zoom = computeMurmurChromeZoomForViewport(1700, 850, {
		width: 1920,
		height: 1080,
		availWidth: 1920,
		availHeight: 1055,
	});
	assert.equal(zoom, 0.92);
	// A 16:10-ish window (e.g. 1300×800) instead viewport-matches its own tuned
	// 16:10 entry — identical on both pages, so chrome parity still holds.
	const windowed16x10 = computeMurmurChromeZoomForViewport(1300, 800, {
		width: 1920,
		height: 1080,
	});
	assert.equal(windowed16x10, 0.6);
});

test('14" MacBook Pro (1504×940) parity anchor stays 0.84', () => {
	const zoom = computeMurmurChromeZoomForViewport(1504, 858, {
		width: 1504,
		height: 940,
		availWidth: 1504,
		availHeight: 915,
	});
	assert.equal(zoom, 0.84);
	// Devtools-style emulation: viewport dims only, no screen info.
	assert.equal(computeMurmurChromeZoomForViewport(1504, 940), 0.84);
});

test('1600×900 and 2560×1440 16:9 entries', () => {
	assert.equal(
		computeMurmurChromeZoomForViewport(1600, 810, { width: 1600, height: 900 }),
		0.78
	);
	assert.equal(
		computeMurmurChromeZoomForViewport(2560, 1350, { width: 2560, height: 1440 }),
		1.02
	);
});

test('1664×1040 dip is retuned to interpolate monotonically', () => {
	assert.equal(
		computeMurmurChromeZoomForViewport(1664, 990, { width: 1664, height: 1040 }),
		0.88
	);
});

test('non-wide unmatched aspect ratios fall back to the shared default', () => {
	// 4:3.
	assert.equal(
		computeMurmurChromeZoomForViewport(1600, 1150, { width: 1600, height: 1200 }),
		MURMUR_CHROME_ZOOM_DEFAULT
	);
	// Portrait.
	assert.equal(
		computeMurmurChromeZoomForViewport(1080, 1850, { width: 1080, height: 1920 }),
		MURMUR_CHROME_ZOOM_DEFAULT
	);
});

test('ultrawides map to the 16:9 entry of the same height', () => {
	// 21:9 3440×1440 → treated as 2560×1440 → tuned 1.02 (same vertical space as QHD).
	assert.equal(
		computeMurmurChromeZoomForViewport(3440, 1400, { width: 3440, height: 1440 }),
		1.02
	);
	// 5K2K → treated as 3840×2160 → tuned 1.53.
	assert.equal(
		computeMurmurChromeZoomForViewport(5120, 2100, { width: 5120, height: 2160 }),
		1.53
	);
	// FHD ultrawide → treated as 1920×1080 → tuned 0.92.
	assert.equal(
		computeMurmurChromeZoomForViewport(2560, 1020, { width: 2560, height: 1080 }),
		0.92
	);
});

test('large 16:9 monitors hit the new tuned entries via screen near-match', () => {
	// Browser-chrome-shortened viewports; raw screen dims resolve the tuned entry.
	assert.equal(
		computeMurmurChromeZoomForViewport(3008, 1574, { width: 3008, height: 1692 }),
		1.2
	);
	assert.equal(
		computeMurmurChromeZoomForViewport(3360, 1760, { width: 3360, height: 1890 }),
		1.34
	);
	assert.equal(
		computeMurmurChromeZoomForViewport(3840, 2010, { width: 3840, height: 2160 }),
		1.53
	);
});

test('zoom grows continuously past the tuned points instead of flat-lining', () => {
	// Between 2560×1440 (1.02) and 3008×1692 (1.2): interpolates, no jump.
	const mid = computeMurmurChromeZoomForViewport(2650, 1490, {
		width: 2650,
		height: 1490,
	});
	assert.ok(mid > 1.02 && mid < 1.2, `expected 1.02 < ${mid} < 1.2`);
	// Just past the last tuned 16:9 point: proportional growth, not flat 1.53.
	const past = computeMurmurChromeZoomForViewport(3900, 2194, {
		width: 3900,
		height: 2194,
	});
	assert.ok(past > 1.53 && past < 1.58, `expected 1.53 < ${past} < 1.58`);
});

test('extrapolation clamps at the shared max on the biggest screens', () => {
	// 5K 16:9: proportional would be ~2.04 → clamped.
	assert.equal(
		computeMurmurChromeZoomForViewport(5120, 2780, { width: 5120, height: 2880 }),
		MURMUR_CHROME_ZOOM_MAX
	);
	// Beyond the 16:10 table's 4608×2880 endpoint (already at max).
	assert.equal(
		computeMurmurChromeZoomForViewport(5760, 3500, { width: 5760, height: 3600 }),
		MURMUR_CHROME_ZOOM_MAX
	);
});

test('campaign snug cap stays pinned to the shared max (chrome parity contract)', () => {
	assert.equal(CAMPAIGN_SNUG_MAX_HEIGHT_FIT_ZOOM, MURMUR_CHROME_ZOOM_MAX);
});

test('dock/windowed overrides', () => {
	// Wide-but-short window: zoom floored at 0.7 (1440×900 tunes to 0.7 anyway,
	// so use a size that would interpolate lower).
	const shortWide = computeMurmurChromeZoomForViewport(1450, 760, {
		width: 1280,
		height: 800,
	});
	assert.ok(shortWide >= 0.7);
	// ~1952×1220 with Dock: capped at 0.93 (1920×1200 tunes to 0.95).
	const dock1952 = computeMurmurChromeZoomForViewport(1952, 1220, {
		width: 1920,
		height: 1200,
	});
	assert.equal(dock1952, 0.93);
	// ~2144×1340 with Dock: floored at 1.2.
	const dock2144 = computeMurmurChromeZoomForViewport(2144, 1340, {
		width: 2144,
		height: 1340,
	});
	assert.ok(dock2144 >= 1.2);
});

test('guardrails and invalid input', () => {
	assert.equal(computeMurmurChromeZoomForViewport(NaN, 900), MURMUR_CHROME_ZOOM_DEFAULT);
	assert.equal(computeMurmurChromeZoomForViewport(0, 0), MURMUR_CHROME_ZOOM_DEFAULT);
	const huge = computeMurmurChromeZoomForViewport(4608, 2780, {
		width: 4608,
		height: 2880,
	});
	assert.ok(huge <= MURMUR_CHROME_ZOOM_MAX && huge >= MURMUR_CHROME_ZOOM_MIN);
});

test('interpolation between tuned 16:9 points rises between 1080p and QHD', () => {
	// No near-match (>50px from both entries): diagonal-metric interpolation.
	const mid = computeMurmurChromeZoomForViewport(2240, 1260, {
		width: 2240,
		height: 1260,
	});
	assert.ok(mid > 0.92 && mid < 1.02, `expected 0.92 < ${mid} < 1.02`);
});

test('side-rail view scale: 0.84 floor, lerp to 0.95 over 1180→1480 viewport height', () => {
	assert.equal(computeMapSelectGrabViewScale(1080, RAIL_TOTAL_HEIGHT_PX), 0.84);
	assert.equal(computeMapSelectGrabViewScale(1480, RAIL_TOTAL_HEIGHT_PX), 0.95);
	const mid = computeMapSelectGrabViewScale(1330, RAIL_TOTAL_HEIGHT_PX);
	assert.ok(mid > 0.84 && mid < 0.95, `expected 0.84 < ${mid} < 0.95`);
	// Short viewports fit-clamp down to the 0.8 floor.
	assert.equal(computeMapSelectGrabViewScale(600, RAIL_TOTAL_HEIGHT_PX), 0.8);
});

test('side-rail centering shift floors to 0 at the 1080p baseline and below', () => {
	// Fullscreen 1920×1080 @ tuned zoom 0.92: centering delta is 84.05px — inside
	// the 85px dead band, so the reference layout stays pixel-identical.
	assert.equal(computeSideRailCenterShiftPx(1080, 0.92, RAIL_TOTAL_HEIGHT_PX), 0);
	// Windowed 1080p monitor (browser chrome eats height): still 0.
	assert.equal(computeSideRailCenterShiftPx(949, 0.92, RAIL_TOTAL_HEIGHT_PX), 0);
	// 14" MacBook Pro.
	assert.equal(computeSideRailCenterShiftPx(940, 0.84, RAIL_TOTAL_HEIGHT_PX), 0);
	// Invalid input never shifts.
	assert.equal(computeSideRailCenterShiftPx(0, 0.92, RAIL_TOTAL_HEIGHT_PX), 0);
	assert.equal(computeSideRailCenterShiftPx(NaN, 0.92, RAIL_TOTAL_HEIGHT_PX), 0);
	assert.equal(computeSideRailCenterShiftPx(1440, 0, RAIL_TOTAL_HEIGHT_PX), 0);
});

test('side-rail centering shift grows with monitor size', () => {
	// 2048×1280-class (16:10 "looks like" mode, zoom 0.95, rail scale ~0.8657).
	assert.equal(computeSideRailCenterShiftPx(1250, 0.95, RAIL_TOTAL_HEIGHT_PX), 61);
	// 2560×1440 (zoom 1.02, rail scale ~0.9353).
	assert.equal(computeSideRailCenterShiftPx(1440, 1.02, RAIL_TOTAL_HEIGHT_PX), 96);
	// 2560×1600 (zoom 1.2): mid-taper — dead band down to ~66.5px.
	assert.equal(computeSideRailCenterShiftPx(1600, 1.2, RAIL_TOTAL_HEIGHT_PX), 109);
	// 3232×2020 (BetterDisplay 16:10 virtual screen): past the taper end, the
	// dead band is fully gone and the rail centers true.
	const tallSixteenTenZoom = computeMurmurChromeZoomForViewport(3232, 2020, {
		width: 3232,
		height: 2020,
		availWidth: 3232,
		availHeight: 2020,
	});
	assert.equal(
		computeSideRailCenterShiftPx(2020, tallSixteenTenZoom, RAIL_TOTAL_HEIGHT_PX),
		267
	);
	// 3840×2160 (zoom 1.53, rail scale capped at 0.95).
	assert.equal(computeSideRailCenterShiftPx(2160, 1.53, RAIL_TOTAL_HEIGHT_PX), 312);
});

test('side-rail dead band tapers to 0 on very tall viewports', () => {
	assert.equal(computeSideRailCenterDeadbandPx(1080), 85);
	assert.equal(computeSideRailCenterDeadbandPx(1500), 85);
	assert.equal(computeSideRailCenterDeadbandPx(1730), 42.5);
	assert.equal(computeSideRailCenterDeadbandPx(1960), 0);
	assert.equal(computeSideRailCenterDeadbandPx(2160), 0);
});

test('side-rail centering shift puts the rail midpoint at H/2 − deadband(H) (cross-page parity)', () => {
	// Whenever the shift is > 0, visibleTop(102) + shift + railVisualH/2 must equal
	// viewportH/2 − deadband(viewportH) regardless of zoom — this is what keeps the
	// campaign and dashboard rails vertically even on big monitors even if their
	// zooms differ.
	for (const [viewportH, zoom] of [
		[1440, 1.02],
		[1440, 0.95],
		[2160, 1.53],
		[2020, 1.4735],
		[1890, 1.34],
	] as const) {
		const shift = computeSideRailCenterShiftPx(viewportH, zoom, RAIL_TOTAL_HEIGHT_PX);
		assert.ok(shift > 0, `expected a positive shift at ${viewportH}/${zoom}`);
		const railVisualH =
			RAIL_TOTAL_HEIGHT_PX *
			computeMapSelectGrabViewScale(viewportH, RAIL_TOTAL_HEIGHT_PX) *
			zoom;
		const midpoint = 102 + shift + railVisualH / 2;
		const target = viewportH / 2 - computeSideRailCenterDeadbandPx(viewportH);
		assert.ok(
			Math.abs(midpoint - target) <= 0.5,
			`midpoint ${midpoint} should be within rounding of ${target} (${viewportH}/${zoom})`
		);
	}
});
