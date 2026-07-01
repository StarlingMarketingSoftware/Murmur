import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	LEDGER_MAX_STEP_PX,
	LEDGER_POINTER_MOVE_EPS_PX,
	clampLedgerResizeDelta,
	forwardTerminalResult,
	normalizeWheelDeltaPx,
	resolveLedgerRegionFromGeometry,
	shouldFallThroughToSecondary,
	shouldRetargetLedgerRegion,
	type LedgerSpendResult,
} from './ledgerWheel';

// ── normalizeWheelDeltaPx ────────────────────────────────────────────────────
test('normalizeWheelDeltaPx passes pixel mode through unchanged', () => {
	assert.equal(normalizeWheelDeltaPx(53, 0, 800), 53);
	assert.equal(normalizeWheelDeltaPx(-53, 0, 800), -53);
});

test('normalizeWheelDeltaPx scales line and page modes to pixels', () => {
	assert.equal(normalizeWheelDeltaPx(3, 1, 800), 48); // 3 lines * 16px
	assert.equal(normalizeWheelDeltaPx(1, 2, 800), 800); // 1 page = panel height
	// Page mode with a nonsensical height falls back to a sane default.
	assert.equal(normalizeWheelDeltaPx(1, 2, 0), 400);
});

// ── clampLedgerResizeDelta ───────────────────────────────────────────────────
test('clampLedgerResizeDelta leaves a normal mouse notch untouched', () => {
	// The whole point of raising the cap: a ~100px notch must pass through so the
	// divider tracks the wheel 1:1 (the "clunky" fix). 100 < 120, so unchanged.
	assert.equal(clampLedgerResizeDelta(100), 100);
	assert.equal(clampLedgerResizeDelta(-100), -100);
});

test('clampLedgerResizeDelta still caps a pathological fling sample', () => {
	assert.equal(clampLedgerResizeDelta(900), LEDGER_MAX_STEP_PX);
	assert.equal(clampLedgerResizeDelta(-900), -LEDGER_MAX_STEP_PX);
});

// ── shouldFallThroughToSecondary (the end-of-scroll bug) ──────────────────────
test('a reached terminal is absorbed, never handed to the other box', () => {
	// This is the core of the "bugs when I get to the end and keep scrolling" fix:
	// once the active box is fully open and its rows are at the boundary, further
	// samples must NOT reverse the divider by acting on the other box.
	assert.equal(shouldFallThroughToSecondary('exhausted'), false);
	assert.equal(shouldFallThroughToSecondary('moved'), false);
	assert.equal(shouldFallThroughToSecondary('settling'), false);
});

test('only a genuine dead zone falls through to the other box', () => {
	// A short list with nothing to reveal must not create a dead wheel zone.
	assert.equal(shouldFallThroughToSecondary('blocked'), true);
});

test('every spend result has a defined fall-through decision', () => {
	const all: LedgerSpendResult[] = ['moved', 'settling', 'exhausted', 'blocked'];
	for (const r of all) {
		assert.equal(typeof shouldFallThroughToSecondary(r), 'boolean');
	}
});

// ── shouldRetargetLedgerRegion (the static-cursor / seam twitch bug) ───────────
test('first sample with no latch always resolves a region', () => {
	assert.equal(
		shouldRetargetLedgerRegion({ hasLatch: false, idle: true, pointerMoved: true }),
		true
	);
	assert.equal(
		shouldRetargetLedgerRegion({ hasLatch: false, idle: false, pointerMoved: false }),
		true
	);
});

test('a static cursor keeps its latched region across an idle gap', () => {
	// The seam-twitch fix: the divider slides under a stationary pointer, so an idle
	// gap alone must NOT re-target while the cursor has not moved.
	assert.equal(
		shouldRetargetLedgerRegion({ hasLatch: true, idle: true, pointerMoved: false }),
		false
	);
});

test('continuous (non-idle) momentum never re-targets', () => {
	assert.equal(
		shouldRetargetLedgerRegion({ hasLatch: true, idle: false, pointerMoved: true }),
		false
	);
});

test('an idle gap WITH real pointer movement re-targets', () => {
	// A deliberate new gesture at a new location should still pick the box under the
	// cursor.
	assert.equal(
		shouldRetargetLedgerRegion({ hasLatch: true, idle: true, pointerMoved: true }),
		true
	);
});

test('pointer-move epsilon is a small, positive pixel threshold', () => {
	assert.ok(LEDGER_POINTER_MOVE_EPS_PX > 0 && LEDGER_POINTER_MOVE_EPS_PX < 12);
});

// ── resolveLedgerRegionFromGeometry (seam resolution) ─────────────────────────
test('pointer clearly inside a box resolves to that box', () => {
	const base = { selectionBottom: 200, resultsTop: 220, deltaSign: 1 };
	assert.equal(
		resolveLedgerRegionFromGeometry({ clientY: 100, ...base }),
		'selection'
	);
	assert.equal(
		resolveLedgerRegionFromGeometry({ clientY: 400, ...base }),
		'results'
	);
});

test('in the seam, direction — not sub-pixel position — decides the region', () => {
	// Cursor sits in the 20px gap between the boxes. Same cursor Y, opposite scroll
	// directions must resolve consistently (down→results, up→selection) so a 1px
	// cursor wiggle in the gap can't flip behavior.
	const seam = { clientY: 210, selectionBottom: 200, resultsTop: 220 };
	assert.equal(
		resolveLedgerRegionFromGeometry({ ...seam, deltaSign: 1 }),
		'results'
	);
	assert.equal(
		resolveLedgerRegionFromGeometry({ ...seam, deltaSign: -1 }),
		'selection'
	);
});

// ── forwardTerminalResult ────────────────────────────────────────────────────
test('forwardTerminalResult: scrolled content is a move', () => {
	assert.equal(forwardTerminalResult(true), 'moved');
});

test('forwardTerminalResult: a fully-open box that cannot scroll is exhausted', () => {
	// No movement at a fully-open box = genuine terminal → absorb (never reverse the
	// divider by handing the sample to the other box).
	assert.equal(forwardTerminalResult(false), 'exhausted');
});
