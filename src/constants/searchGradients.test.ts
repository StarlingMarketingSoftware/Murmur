// Run with: npx tsx src/constants/searchGradients.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
	SEARCH_GRADIENT_DEFAULT,
	buildForYouResultsGradients,
	getForYouResultsGradientsForDate,
	getSearchGradientForDate,
	FOR_YOU_RESULTS_DEFAULT_GRADIENTS,
} from './searchGradients';

// Pull every "#RRGGBB" stop out of a gradient string, in order.
const hexStops = (gradient: string): string[] =>
	(gradient.match(/#[0-9a-fA-F]{6}/g) ?? []).map((h) => h.toUpperCase());

const hexToRgb = (hex: string) => {
	const int = Number.parseInt(hex.slice(1), 16);
	return { r: (int >> 16) & 0xff, g: (int >> 8) & 0xff, b: int & 0xff };
};

test('For You header keeps the bar sweep horizontal and the body vertical', () => {
	const { header, body } = buildForYouResultsGradients(
		'linear-gradient(90deg, #DA29B4 1.69%, #EA1F1F 34.7%)'
	);
	assert.match(header, /^linear-gradient\(90deg,/);
	assert.match(body, /^linear-gradient\(180deg,/);
});

test('For You gradients preserve stop count and offsets from the bar gradient', () => {
	const bar = 'linear-gradient(90deg, #6DDA29 1.69%, #1FAAEA 17.59%, #17EC17 98.97%)';
	const { header, body } = buildForYouResultsGradients(bar);
	// Three color stops in, three color stops out (for both derived gradients).
	assert.equal(hexStops(header).length, 3);
	assert.equal(hexStops(body).length, 3);
	// Offsets are carried through verbatim.
	assert.match(header, /1\.69%/);
	assert.match(header, /17\.59%/);
	assert.match(header, /98\.97%/);
	assert.match(body, /1\.69%/);
});

test('For You stops are pastelized (mixed toward white), body paler than header', () => {
	const bar = 'linear-gradient(90deg, #EA1F1F 0%, #0D888C 100%)';
	const { header, body } = buildForYouResultsGradients(bar);
	const barStops = hexStops(bar);
	const headerStops = hexStops(header);
	const bodyStops = hexStops(body);

	// Every derived stop should be lighter (each channel >=) than the raw bar stop,
	// and the body stop should be lighter than the header stop.
	barStops.forEach((barHex, i) => {
		const raw = hexToRgb(barHex);
		const h = hexToRgb(headerStops[i]);
		const b = hexToRgb(bodyStops[i]);
		assert.ok(h.r >= raw.r && h.g >= raw.g && h.b >= raw.b, `header stop ${i} lighter`);
		assert.ok(b.r >= h.r && b.g >= h.g && b.b >= h.b, `body stop ${i} lighter than header`);
		// Not fully white — the day's hue must still read through.
		assert.ok(!(b.r === 255 && b.g === 255 && b.b === 255), `body stop ${i} not pure white`);
	});
});

test('color family tracks the day: a green day yields a green-dominant box', () => {
	// A predominantly-green bar gradient should stay green-dominant after pastelizing
	// (green channel remains the largest in each derived stop).
	const greenBar =
		'linear-gradient(90deg, #6DDA29 1.69%, #6DDA29 34.43%, #17EC17 98.97%)';
	const { header, body } = buildForYouResultsGradients(greenBar);
	[...hexStops(header), ...hexStops(body)].forEach((hex) => {
		const { r, g, b } = hexToRgb(hex);
		assert.ok(g >= r && g >= b, `green stays dominant in ${hex}`);
	});
});

test('unparseable gradient falls back to the pastelized default pair', () => {
	const result = buildForYouResultsGradients('not-a-gradient');
	assert.deepEqual(result, FOR_YOU_RESULTS_DEFAULT_GRADIENTS);
	// The default itself is a valid, pastelized version of the bar default.
	assert.match(FOR_YOU_RESULTS_DEFAULT_GRADIENTS.header, /^linear-gradient\(90deg,/);
	assert.match(FOR_YOU_RESULTS_DEFAULT_GRADIENTS.body, /^linear-gradient\(180deg,/);
});

test('date-driven pair matches deriving from the same date bar gradient', () => {
	// Same date → the box pair is exactly the pastelization of the bar pick, so the
	// box and bar can never disagree about the day's scheme.
	const date = new Date('2026-07-01T09:00:00');
	const fromDate = getForYouResultsGradientsForDate(date);
	const fromBar = buildForYouResultsGradients(getSearchGradientForDate(date));
	assert.deepEqual(fromDate, fromBar);
});

test('the AM and PM buckets of a day can differ (mirrors the bar bucketing)', () => {
	// Not guaranteed for every date, but the mechanism must be capable of a swap.
	// Scan a handful of days; at least one must have AM !== PM to prove bucketing
	// flows through to the box.
	let sawSwap = false;
	for (let day = 1; day <= 14 && !sawSwap; day += 1) {
		const am = getForYouResultsGradientsForDate(
			new Date(2026, 0, day, 9, 0, 0)
		);
		const pm = getForYouResultsGradientsForDate(
			new Date(2026, 0, day, 15, 0, 0)
		);
		if (am.header !== pm.header || am.body !== pm.body) sawSwap = true;
	}
	assert.ok(sawSwap, 'AM/PM bucketing should be able to change the box gradient');
});

test('every built-in day gradient pastelizes into two valid gradients', () => {
	// Sweep a year of AM/PM buckets; each must yield parseable, non-crashing output
	// with the expected orientation. This covers all weighted entries over time.
	for (let day = 0; day < 366; day += 1) {
		const base = new Date(2026, 0, 1);
		base.setDate(base.getDate() + day);
		for (const hour of [9, 15]) {
			const d = new Date(base);
			d.setHours(hour, 0, 0, 0);
			const { header, body } = getForYouResultsGradientsForDate(d);
			assert.match(header, /^linear-gradient\(90deg, .+\)$/);
			assert.match(body, /^linear-gradient\(180deg, .+\)$/);
		}
	}
});

test('SEARCH_GRADIENT_DEFAULT itself pastelizes cleanly', () => {
	const { header, body } = buildForYouResultsGradients(SEARCH_GRADIENT_DEFAULT);
	assert.equal(hexStops(header).length, hexStops(SEARCH_GRADIENT_DEFAULT).length);
	assert.equal(hexStops(body).length, hexStops(SEARCH_GRADIENT_DEFAULT).length);
});
