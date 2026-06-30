import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	INTERACTIVE_MAP_MIN_ZOOM_DELTA_MAX,
	MAP_MIN_ZOOM,
	STATE_LABEL_CONTEXT_FADE_END_ZOOM,
	STATE_LABEL_CONTEXT_FADE_START_ZOOM,
	STATE_LABEL_CONTEXT_HIDE_ZOOM,
	STATE_LABEL_CONTEXT_HOLD_ZOOM,
	STATE_LABELS_FULL_OPACITY_ZOOM,
	getInteractiveMapMinZoomDelta,
} from './constants';
import { computeCuratedOrbT } from './mapExpressions';
import { computeLightingOverlayOpacity } from './lightingOverlay';
import { getLightningZoomedOutBoostT } from './lightning';
import { buildCloudsOpacityExpr } from './clouds';
import {
	buildStateDividerLineOpacityExpr,
	buildStateInteractiveBorderOpacityExpr,
	buildStateLabelsTextOpacityExpr,
} from './stateOverlayStyle';

const DELTAS = [0, 0.4, 1.0, INTERACTIVE_MAP_MIN_ZOOM_DELTA_MAX];

test('delta is 0 at and below the 1920×1080 reference viewport', () => {
	assert.equal(getInteractiveMapMinZoomDelta(1920, 1080), 0);
	assert.equal(getInteractiveMapMinZoomDelta(1280, 720), 0);
	assert.equal(getInteractiveMapMinZoomDelta(1440, 900), 0);
	// Narrow window on a big monitor: the limiting dimension keeps today's floor.
	assert.equal(getInteractiveMapMinZoomDelta(1280, 1440), 0);
});

test('delta scales as log2 of the limiting viewport ratio', () => {
	// 2560×1440 → min ratio 1.333… → log2 ≈ 0.415 → quantized to 0.4.
	assert.equal(getInteractiveMapMinZoomDelta(2560, 1440), 0.4);
	// 4K at 1x → ratio 2 → exactly +1.
	assert.equal(getInteractiveMapMinZoomDelta(3840, 2160), 1.0);
	// Ultrawide: height is the limiting dimension (1440/1080 → 0.4), not width.
	assert.equal(getInteractiveMapMinZoomDelta(3440, 1440), 0.4);
});

test('delta caps at the max and guards degenerate inputs', () => {
	assert.equal(
		getInteractiveMapMinZoomDelta(5120, 2880),
		INTERACTIVE_MAP_MIN_ZOOM_DELTA_MAX
	);
	assert.equal(getInteractiveMapMinZoomDelta(0, 1080), 0);
	assert.equal(getInteractiveMapMinZoomDelta(1920, -1), 0);
	assert.equal(getInteractiveMapMinZoomDelta(Number.NaN, 1080), 0);
	assert.equal(getInteractiveMapMinZoomDelta(Number.POSITIVE_INFINITY, 1080), 0);
});

test('runtime fades are exactly z-shifted by the floor delta', () => {
	const computers: Array<(zoom: number, floorDelta?: number) => number> = [
		computeCuratedOrbT,
		computeLightingOverlayOpacity,
		getLightningZoomedOutBoostT,
	];
	for (const compute of computers) {
		for (const delta of DELTAS) {
			for (let zoom = 1; zoom <= 11; zoom += 0.25) {
				// Tolerance: (zoom + delta) - delta is not bit-identical to zoom.
				const shifted = compute(zoom + delta, delta);
				const reference = compute(zoom, 0);
				assert.ok(
					Math.abs(shifted - reference) < 1e-9,
					`${compute.name} at zoom=${zoom} delta=${delta}: ${shifted} vs ${reference}`
				);
			}
		}
		// Default arg preserves today's behavior.
		assert.equal(compute(MAP_MIN_ZOOM), compute(MAP_MIN_ZOOM, 0));
	}
});

const interpolateStops = (expr: unknown[]): number[] => {
	// ['interpolate', ['linear'], ['zoom'], stop, value, stop, value, ...]
	const stops: number[] = [];
	for (let i = 3; i < expr.length; i += 2) {
		stops.push(expr[i] as number);
	}
	return stops;
};

test('expression builders shift only the near-floor stops', () => {
	const d = INTERACTIVE_MAP_MIN_ZOOM_DELTA_MAX;

	const labels0 = interpolateStops(buildStateLabelsTextOpacityExpr(0.8, 0));
	const labelsD = interpolateStops(buildStateLabelsTextOpacityExpr(0.8, d));
	assert.deepEqual(labels0, [
		MAP_MIN_ZOOM,
		STATE_LABELS_FULL_OPACITY_ZOOM,
		STATE_LABEL_CONTEXT_HOLD_ZOOM,
		STATE_LABEL_CONTEXT_FADE_START_ZOOM,
		STATE_LABEL_CONTEXT_FADE_END_ZOOM,
		STATE_LABEL_CONTEXT_HIDE_ZOOM,
	]);
	assert.deepEqual(
		labelsD.slice(0, 2),
		labels0.slice(0, 2).map((stop) => stop + d)
	);
	assert.deepEqual(labelsD.slice(2), labels0.slice(2));

	const dividers0 = interpolateStops(buildStateDividerLineOpacityExpr(0));
	const dividersD = interpolateStops(buildStateDividerLineOpacityExpr(d));
	assert.deepEqual(dividersD.slice(0, 2), [
		dividers0[0] + d,
		dividers0[1] + d,
	]);
	assert.deepEqual(dividersD.slice(2), dividers0.slice(2));

	const borders0 = interpolateStops(buildStateInteractiveBorderOpacityExpr(0));
	const bordersD = interpolateStops(buildStateInteractiveBorderOpacityExpr(d));
	assert.deepEqual(bordersD.slice(0, 2), [borders0[0] + d, borders0[1] + d]);
	assert.deepEqual(bordersD.slice(2), borders0.slice(2));

	const clouds0 = interpolateStops(buildCloudsOpacityExpr(0.78, 0.66, 0, 0));
	const cloudsD = interpolateStops(buildCloudsOpacityExpr(0.78, 0.66, 0, d));
	// The 0 stop holds (mobile floor); the two near-floor stops shift; the
	// fade-out stops (8/10.5/22) hold.
	assert.equal(cloudsD[0], clouds0[0]);
	assert.deepEqual(cloudsD.slice(1, 3), [clouds0[1] + d, clouds0[2] + d]);
	assert.deepEqual(cloudsD.slice(3), clouds0.slice(3));

	// Stop order must stay strictly increasing at the max delta for every builder.
	for (const stops of [labelsD, dividersD, bordersD, cloudsD]) {
		for (let i = 1; i < stops.length; i += 1) {
			assert.ok(
				stops[i] > stops[i - 1],
				`stops not strictly increasing at max delta: ${stops.join(', ')}`
			);
		}
	}
});
