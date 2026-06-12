import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	MAP_ZOOM_CONTROL_BASE_LEVELS,
	MAP_ZOOM_CONTROL_MAX_INDEX,
	buildZoomControlLevels,
	clampZoomControlValue,
	controlValueForZoom,
	zoomForControlValue,
} from './mapZoomControlLadder';

test('the base ladder matches the slider thumb-stop count (21)', () => {
	assert.equal(MAP_ZOOM_CONTROL_BASE_LEVELS.length, 21);
	assert.equal(MAP_ZOOM_CONTROL_MAX_INDEX, 20);
});

test('clampZoomControlValue guards the index domain', () => {
	assert.equal(clampZoomControlValue(Number.NaN), 0);
	assert.equal(clampZoomControlValue(-2), 0);
	assert.equal(clampZoomControlValue(7.4), 7.4);
	assert.equal(clampZoomControlValue(99), MAP_ZOOM_CONTROL_MAX_INDEX);
});

test('ladder is the base array (referentially) at/below the base floor', () => {
	assert.equal(buildZoomControlLevels(2.25), MAP_ZOOM_CONTROL_BASE_LEVELS);
	assert.equal(buildZoomControlLevels(2.0), MAP_ZOOM_CONTROL_BASE_LEVELS);
	// Mobile floor (1) and bad inputs also resolve to the identity ladder.
	assert.equal(buildZoomControlLevels(1), MAP_ZOOM_CONTROL_BASE_LEVELS);
	assert.equal(buildZoomControlLevels(Number.NaN), MAP_ZOOM_CONTROL_BASE_LEVELS);
});

test('rebased ladder spans [floor, 7] with no dead zone', () => {
	for (const floor of [2.65, 3.25, 3.5]) {
		const levels = buildZoomControlLevels(floor);
		assert.equal(levels.length, MAP_ZOOM_CONTROL_BASE_LEVELS.length);
		// Index 0 lands exactly on the floor: the bottom of the track requests a
		// zoom the map never clamps away.
		assert.equal(levels[0], floor);
		assert.equal(levels[MAP_ZOOM_CONTROL_MAX_INDEX], 7);
		for (let i = 1; i < levels.length; i += 1) {
			assert.ok(levels[i] > levels[i - 1], `not monotonic at floor ${floor}`);
		}
	}
});

test('converters round-trip on rebased ladders', () => {
	for (const floor of [2.25, 3.25]) {
		const levels = buildZoomControlLevels(floor);
		for (let value = 0; value <= MAP_ZOOM_CONTROL_MAX_INDEX; value += 0.5) {
			const zoom = zoomForControlValue(levels, value);
			const roundTripped = controlValueForZoom(levels, zoom);
			assert.ok(
				Math.abs(roundTripped - value) < 1e-9,
				`round trip failed at floor=${floor} value=${value}: got ${roundTripped}`
			);
		}
		// Below-floor zooms (transient relaxed camera states) peg the thumb at 0.
		assert.equal(controlValueForZoom(levels, levels[0] - 0.5), 0);
		assert.equal(controlValueForZoom(levels, 9), MAP_ZOOM_CONTROL_MAX_INDEX);
	}
});
