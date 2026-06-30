import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	WHEEL_ZOOM_DELTA,
	classifyWheelKind,
	createZoomOutGovernor,
	normalizeWheelValue,
	rateMultiplierForEnergy,
	type ZoomOutGovernorConfig,
} from './zoomOutGovernor';

const BASE_WHEEL = 1 / 1700;
const BASE_TRACKPAD = 1 / 175;

const cfg = (over: Partial<ZoomOutGovernorConfig> = {}): ZoomOutGovernorConfig => ({
	enabled: true,
	baseWheelRate: BASE_WHEEL,
	baseTrackpadRate: BASE_TRACKPAD,
	minRateMultiplier: 0.42,
	energyScale: 1.3,
	energyDecayTauMs: 320,
	gestureGapMs: 220,
	deadzone: 0.01,
	applyEpsilon: 0.02,
	...over,
});

test('normalizeWheelValue scales line-mode by 40 and quarters on shift', () => {
	assert.equal(normalizeWheelValue(3, 0, false), 3);
	assert.equal(normalizeWheelValue(3, 1, false), 120);
	assert.equal(normalizeWheelValue(120, 0, true), 30);
	assert.equal(normalizeWheelValue(NaN, 0, false), 0);
});

test('classifyWheelKind detects notched wheel vs trackpad', () => {
	assert.equal(classifyWheelKind(WHEEL_ZOOM_DELTA), 'wheel');
	assert.equal(classifyWheelKind(WHEEL_ZOOM_DELTA * 3), 'wheel');
	assert.equal(classifyWheelKind(5), 'trackpad');
	assert.equal(classifyWheelKind(2), 'trackpad');
	assert.equal(classifyWheelKind(0), 'trackpad');
});

test('rateMultiplierForEnergy is 1 at 0, asymptotes to floor, strictly decreasing', () => {
	assert.equal(rateMultiplierForEnergy(0, 0.42, 1.3), 1);
	let prev = rateMultiplierForEnergy(0, 0.42, 1.3);
	for (let e = 0.05; e <= 20; e += 0.05) {
		const m = rateMultiplierForEnergy(e, 0.42, 1.3);
		assert.ok(m <= prev, `non-increasing at e=${e}: ${m} > ${prev}`);
		assert.ok(m >= 0.42 - 1e-9, `never below floor at e=${e}: ${m}`);
		assert.ok(m <= 1 + 1e-9, `never above 1 at e=${e}: ${m}`);
		prev = m;
	}
	assert.ok(rateMultiplierForEnergy(50, 0.42, 1.3) < 0.43);
});

test('rate curve has no discontinuity (small input => small output change)', () => {
	let prev = rateMultiplierForEnergy(0, 0.42, 1.3);
	for (let e = 0.01; e <= 20; e += 0.01) {
		const m = rateMultiplierForEnergy(e, 0.42, 1.3);
		assert.ok(Math.abs(m - prev) < 0.01, `jump at e=${e}: ${Math.abs(m - prev)}`);
		prev = m;
	}
});

test('disabled governor is a pure no-op (multiplier stays 1)', () => {
	const g = createZoomOutGovernor(cfg({ enabled: false }));
	const r = g.onWheel(100, 0, false, 1000);
	assert.equal(r.changed, false);
	assert.equal(r.multiplier, 1);
	assert.equal(r.wheelRate, BASE_WHEEL);
	assert.equal(r.trackpadRate, BASE_TRACKPAD);
});

test('a single gentle notch does not perceptibly govern', () => {
	const g = createZoomOutGovernor(cfg());
	const r = g.onWheel(WHEEL_ZOOM_DELTA, 0, false, 1000);
	assert.equal(r.changed, false);
	assert.ok(g.getMultiplier() > 0.98);
});

test('sustained trackpad fling ramps friction down to the moderated floor', () => {
	const g = createZoomOutGovernor(cfg());
	let t = 1000;
	let last = 1;
	for (let i = 0; i < 30; i++) {
		const r = g.onWheel(60, 0, false, t);
		assert.ok(r.multiplier <= last + 1e-9, 'never re-accelerates mid-gesture');
		last = r.multiplier;
		t += 16;
	}
	assert.ok(last <= 0.45, `reaches near the moderated floor, got ${last}`);
});

test('MONOTONIC-DOWN within a gesture: multiplier never rises while flinging', () => {
	const g = createZoomOutGovernor(cfg());
	let t = 1000;
	let last = 1;
	const deltas = [80, 80, 5, 60, 3, 70, 2, 50, 1, 90];
	for (const d of deltas) {
		const r = g.onWheel(d, 0, false, t);
		assert.ok(r.multiplier <= last + 1e-9, `rose mid-gesture: ${r.multiplier} > ${last}`);
		last = r.multiplier;
		t += 16;
	}
});

test('self-heals after an idle gap (fresh gesture is full speed)', () => {
	const g = createZoomOutGovernor(cfg());
	let t = 1000;
	for (let i = 0; i < 20; i++) {
		g.onWheel(80, 0, false, t);
		t += 16;
	}
	assert.ok(g.getMultiplier() < 0.6, 'governed during fling');
	const r = g.onWheel(WHEEL_ZOOM_DELTA, 0, false, t + 5000);
	assert.equal(r.changed, true, 'caller must restore Mapbox base rates on this event');
	assert.equal(r.multiplier, 1, 'restored to full speed after gap');
	assert.equal(r.wheelRate, BASE_WHEEL);
	assert.equal(r.trackpadRate, BASE_TRACKPAD);
});

test('inward (zoom-in) input instantly restores full speed (reversal responsive)', () => {
	const g = createZoomOutGovernor(cfg());
	let t = 1000;
	for (let i = 0; i < 20; i++) {
		g.onWheel(80, 0, false, t);
		t += 16;
	}
	assert.ok(g.getMultiplier() < 0.6);
	const r = g.onWheel(-80, 0, false, t + 16);
	assert.equal(r.changed, true, 'caller must restore Mapbox base rates immediately');
	assert.equal(r.multiplier, 1, 'zoom-in is never governed');
	assert.equal(r.wheelRate, BASE_WHEEL);
	assert.equal(r.trackpadRate, BASE_TRACKPAD);
});

test('deadzone events leave the rate exactly where it is', () => {
	const g = createZoomOutGovernor(cfg());
	let t = 1000;
	for (let i = 0; i < 10; i++) {
		g.onWheel(80, 0, false, t);
		t += 16;
	}
	const before = g.getMultiplier();
	const r = g.onWheel(0, 0, false, t + 16);
	assert.equal(r.changed, false);
	assert.equal(g.getMultiplier(), before);
});

test('reset clears gesture state', () => {
	const g = createZoomOutGovernor(cfg());
	let t = 1000;
	for (let i = 0; i < 20; i++) {
		g.onWheel(80, 0, false, t);
		t += 16;
	}
	assert.ok(g.getMultiplier() < 0.6);
	g.reset();
	assert.equal(g.getMultiplier(), 1);
});

test('non-monotonic / NaN clock does not corrupt state', () => {
	const g = createZoomOutGovernor(cfg());
	const r1 = g.onWheel(80, 0, false, 1000);
	assert.ok(Number.isFinite(r1.multiplier));
	const r2 = g.onWheel(80, 0, false, 500);
	assert.ok(Number.isFinite(r2.multiplier));
	assert.equal(r2.multiplier, 1, 'backward clock treated as fresh gesture');
	const r3 = g.onWheel(80, 0, false, NaN);
	assert.ok(Number.isFinite(r3.multiplier));
});

test('wheel-rate and trackpad-rate convenience outputs track the multiplier', () => {
	const g = createZoomOutGovernor(cfg());
	let t = 1000;
	let r = g.onWheel(80, 0, false, t);
	for (let i = 0; i < 20; i++) {
		t += 16;
		r = g.onWheel(80, 0, false, t);
	}
	assert.ok(Math.abs(r.wheelRate - BASE_WHEEL * r.multiplier) < 1e-12);
	assert.ok(Math.abs(r.trackpadRate - BASE_TRACKPAD * r.multiplier) < 1e-12);
});
