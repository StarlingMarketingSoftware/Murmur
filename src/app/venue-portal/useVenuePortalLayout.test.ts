import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	computeVenuePortalChromeBoost,
	computeVenuePortalLayout,
} from './useVenuePortalLayout';
import {
	VENUE_MAP_LEFT_CLUSTER_SCALE,
	VENUE_MAP_OVERLAY_SCALE,
	VENUE_MAP_PANEL_NATIVE_W_PX,
} from './constants';

const approx = (actual: number, expected: number, eps = 1e-6) =>
	assert.ok(
		Math.abs(actual - expected) <= eps,
		`expected ${actual} ≈ ${expected} (±${eps})`
	);

test('1920×1080 baseline is pixel-identical to the pre-boost layout', () => {
	const layout = computeVenuePortalLayout(1920, 1080, { width: 1920, height: 1080 });
	assert.equal(layout.tier, 'full');
	approx(layout.boost, 1);
	// Anchor stays exactly at the historical 500/122 anchor — no centering drift.
	approx(layout.panel.left, 500);
	approx(layout.panel.top, 122);
	approx(layout.panel.scale, VENUE_MAP_OVERLAY_SCALE);
	approx(layout.bar.left, 500);
	approx(layout.cluster.left, 24);
	approx(layout.cluster.top, 56);
	approx(layout.cluster.scale, VENUE_MAP_LEFT_CLUSTER_SCALE);
});

test('maximized 1080p browser viewport (chrome eats height) keeps boost 1', () => {
	const layout = computeVenuePortalLayout(1920, 949, { width: 1920, height: 1080 });
	approx(layout.boost, 1);
	approx(layout.panel.left, 500);
});

test('2560×1440 grows chrome by the standard-side curve and centers the panel', () => {
	const layout = computeVenuePortalLayout(2560, 1440, { width: 2560, height: 1440 });
	// 16:9 tuned zoom 1.02 → boost 1.02/0.92.
	approx(layout.boost, 1.02 / 0.92, 1e-9);
	assert.equal(layout.tier, 'full');
	approx(layout.panel.scale, VENUE_MAP_OVERLAY_SCALE * layout.boost, 1e-9);
	// Fully centered: panel midpoint sits at the viewport midpoint.
	const panelCenter =
		layout.panel.left + (VENUE_MAP_PANEL_NATIVE_W_PX * layout.panel.scale) / 2;
	approx(panelCenter, 2560 / 2, 0.5);
	// Bar shares the anchor and scale.
	approx(layout.bar.left, layout.panel.left);
	approx(layout.bar.scale, layout.panel.scale);
	// Corner cluster boosted.
	approx(layout.cluster.scale, VENUE_MAP_LEFT_CLUSTER_SCALE * layout.boost, 1e-9);
	approx(layout.cluster.left, 24 * layout.boost, 1e-9);
});

test('3840×2160 (4K) boosts ≈1.66 and stays centered without overlaps', () => {
	const layout = computeVenuePortalLayout(3840, 2160, { width: 3840, height: 2160 });
	approx(layout.boost, 1.53 / 0.92, 1e-9);
	assert.equal(layout.tier, 'full');
	const panelW = VENUE_MAP_PANEL_NATIVE_W_PX * layout.panel.scale;
	approx(layout.panel.left + panelW / 2, 3840 / 2, 0.5);
	// Panel clears the boosted left cluster (656 native × 0.7 × boost + 24·boost).
	const clusterRight = layout.cluster.left + 656 * layout.cluster.scale;
	assert.ok(layout.panel.left > clusterRight, 'panel overlaps left cluster');
	// And clears the notifications panel (431 native × 0.7·boost + 24·boost right margin).
	const notificationsLeft =
		3840 - 24 * layout.boost - 431 * VENUE_MAP_LEFT_CLUSTER_SCALE * layout.boost;
	assert.ok(layout.panel.left + panelW < notificationsLeft, 'panel overlaps notifications');
});

test('windowed 1600×900 on a 4K screen degrades the tier like a root zoom would', () => {
	// Screen near-match drives the boost even in a small window (same semantics
	// as the dashboard/campaign chrome zoom) — the design viewport shrinks below
	// the hideLeftCluster breakpoint.
	const layout = computeVenuePortalLayout(1600, 900, { width: 3840, height: 2160 });
	approx(layout.boost, 1.53 / 0.92, 1e-9);
	assert.equal(layout.tier, 'hideLeftCluster');
	// No centering at this tier: anchored at the 24px design margin, boosted.
	approx(layout.panel.left, 24 * layout.boost, 1e-9);
});

test('centering ramp is continuous around the 1920 design-px baseline', () => {
	// Pure-viewport sizes (no tuned screen entry nearby) around the ramp start.
	// Use a fixed sub-baseline boost-1 height so only width varies.
	const screen = { width: 10, height: 10 }; // far from every tuned entry
	let previousLeft = computeVenuePortalLayout(1900, 1000, screen).panel.left;
	for (let vw = 1901; vw <= 2300; vw += 1) {
		const { panel, boost } = computeVenuePortalLayout(vw, 1000, screen);
		approx(boost, 1, 1e-9); // odd aspect → default zoom 0.85 → floored to 1
		assert.ok(
			panel.left >= previousLeft - 1e-6 && panel.left <= previousLeft + 1 + 1e-6,
			`left jumped from ${previousLeft} to ${panel.left} at vw=${vw}`
		);
		previousLeft = panel.left;
	}
	// By the end of the ramp the panel is truly centered.
	const wide = computeVenuePortalLayout(2300, 1000, screen);
	const panelW = VENUE_MAP_PANEL_NATIVE_W_PX * wide.panel.scale;
	approx(wide.panel.left + panelW / 2, 2300 / 2, 0.5);
});

test('boost floors at 1 below the baseline (no shrink from the standard curve)', () => {
	// 14" MacBook Pro: standard-side zoom 0.84 < 0.92 must not shrink the portal.
	approx(computeVenuePortalChromeBoost(1504, 940, { width: 1504, height: 940 }), 1);
});
