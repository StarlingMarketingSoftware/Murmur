import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	computeMurmurChromeZoomForViewport,
	MURMUR_CHROME_ZOOM_DEFAULT,
	MURMUR_CHROME_ZOOM_MAX,
	MURMUR_CHROME_ZOOM_MIN,
} from './murmurChromeZoom';

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

test('neither 16:9 nor 16:10 falls back to the shared default', () => {
	// Ultrawide 21:9.
	assert.equal(
		computeMurmurChromeZoomForViewport(3440, 1400, { width: 3440, height: 1440 }),
		MURMUR_CHROME_ZOOM_DEFAULT
	);
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
