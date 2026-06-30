import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	BASEMAP_SETTLEMENT_MAJOR_LABEL_FADE_END_ZOOM,
	BASEMAP_SETTLEMENT_MAJOR_LABEL_FADE_START_ZOOM,
	BASEMAP_SETTLEMENT_MAJOR_LABEL_MIN_ZOOM,
	BASEMAP_SETTLEMENT_MAJOR_LABEL_OPACITY,
	BASEMAP_SETTLEMENT_MAJOR_SYMBOLRANK_CEILING,
	BASEMAP_SETTLEMENT_MAJOR_TEXT_PADDING_STOPS,
	BASEMAP_SETTLEMENT_TOP_CITY_MATCHES,
	BASEMAP_SETTLEMENT_TOP_CITY_ONLY_MAX_ZOOM,
	BASEMAP_SETTLEMENT_MINOR_LABEL_FADE_END_ZOOM,
	BASEMAP_SETTLEMENT_MINOR_LABEL_FADE_START_ZOOM,
	BASEMAP_SETTLEMENT_MINOR_LABEL_MIN_ZOOM,
	BASEMAP_SETTLEMENT_MINOR_LABEL_OPACITY,
	BASEMAP_SETTLEMENT_MINOR_SYMBOLRANK_STOPS,
	BASEMAP_SETTLEMENT_SUBDIVISION_LABEL_MIN_ZOOM,
	BASEMAP_STREET_LABEL_FADE_START_ZOOM,
	MAP_DEFAULT_ZOOM,
	MAP_MIN_ZOOM,
	STATE_LABELS_FULL_OPACITY_ZOOM,
} from './constants';
import {
	buildBasemapLabelOpacityRamp,
	buildBasemapMajorSettlementRankFilter,
	buildBasemapMajorSettlementTextPaddingRamp,
	buildBasemapMinorSettlementRankFilter,
	buildBasemapTopCityFilter,
	classifyBasemapLabelLayer,
	combineBasemapLabelFilters,
	composeBasemapSettlementFilter,
	expressionReferencesSymbolrank,
	getBasemapLabelVisualSpec,
	isBasemapSettlementLabelKind,
	stripNativeSymbolrankClause,
} from './basemapLabelGate';

test('classifies basemap labels into atlas tiers', () => {
	assert.equal(
		classifyBasemapLabelLayer('settlement-major-label', 'place_label'),
		'settlement-major'
	);
	assert.equal(
		classifyBasemapLabelLayer('settlement-minor-label', 'place_label'),
		'settlement-minor'
	);
	assert.equal(
		classifyBasemapLabelLayer('settlement-subdivision-label', 'place_label'),
		'settlement-subdivision'
	);
	assert.equal(
		classifyBasemapLabelLayer('neighborhood-label', 'place_label'),
		'settlement-subdivision'
	);
	assert.equal(
		classifyBasemapLabelLayer('place-label', 'place_label'),
		'settlement-minor'
	);
	assert.equal(classifyBasemapLabelLayer('road-label-simple', 'road'), 'street');

	assert.equal(classifyBasemapLabelLayer('country-label', 'place_label'), null);
	assert.equal(classifyBasemapLabelLayer('state-label', 'place_label'), null);
	assert.equal(classifyBasemapLabelLayer('road-number-shield', 'road'), null);
});

test('keeps label ladder ordered from major cities to streets', () => {
	const major = getBasemapLabelVisualSpec('settlement-major');
	const minor = getBasemapLabelVisualSpec('settlement-minor');
	const subdivision = getBasemapLabelVisualSpec('settlement-subdivision');
	const street = getBasemapLabelVisualSpec('street');

	assert.equal(major.minZoom, BASEMAP_SETTLEMENT_MAJOR_LABEL_MIN_ZOOM);
	assert.equal(major.fadeStartZoom, BASEMAP_SETTLEMENT_MAJOR_LABEL_FADE_START_ZOOM);
	assert.equal(major.fadeEndZoom, BASEMAP_SETTLEMENT_MAJOR_LABEL_FADE_END_ZOOM);
	assert.equal(major.targetOpacity, BASEMAP_SETTLEMENT_MAJOR_LABEL_OPACITY);

	assert.equal(minor.minZoom, BASEMAP_SETTLEMENT_MINOR_LABEL_MIN_ZOOM);
	assert.equal(minor.fadeStartZoom, BASEMAP_SETTLEMENT_MINOR_LABEL_FADE_START_ZOOM);
	assert.equal(minor.fadeEndZoom, BASEMAP_SETTLEMENT_MINOR_LABEL_FADE_END_ZOOM);
	assert.equal(minor.targetOpacity, BASEMAP_SETTLEMENT_MINOR_LABEL_OPACITY);

	assert.ok(major.minZoom < minor.minZoom);
	assert.ok(minor.minZoom < subdivision.minZoom);
	assert.ok(subdivision.minZoom < street.minZoom);
	assert.equal(subdivision.minZoom, BASEMAP_SETTLEMENT_SUBDIVISION_LABEL_MIN_ZOOM);
	assert.equal(street.minZoom, BASEMAP_STREET_LABEL_FADE_START_ZOOM);

	// Major city labels should be readable at the default US-wide view.
	assert.ok(major.fadeEndZoom <= MAP_DEFAULT_ZOOM);
});

test('ties the major-city fade to the state-initials zoom band', () => {
	const major = getBasemapLabelVisualSpec('settlement-major');
	// Big cities and state initials must establish together at the far-out view.
	assert.equal(major.fadeStartZoom, MAP_MIN_ZOOM);
	assert.equal(major.fadeEndZoom, STATE_LABELS_FULL_OPACITY_ZOOM);

	// The fade shifts by the same viewport-proportional floor delta the state
	// initials use, so the two stay coupled on large monitors.
	const delta = 1.25;
	const shifted = getBasemapLabelVisualSpec('settlement-major', delta);
	assert.equal(shifted.fadeStartZoom, MAP_MIN_ZOOM + delta);
	assert.equal(shifted.fadeEndZoom, STATE_LABELS_FULL_OPACITY_ZOOM + delta);
	assert.equal(shifted.minZoom, BASEMAP_SETTLEMENT_MAJOR_LABEL_MIN_ZOOM + delta);

	// Only the major tier is floor-coupled; smaller tiers ignore the delta.
	assert.equal(
		getBasemapLabelVisualSpec('settlement-minor', delta).fadeStartZoom,
		BASEMAP_SETTLEMENT_MINOR_LABEL_FADE_START_ZOOM
	);
});

test('builds simple Mapbox-compatible opacity ramps', () => {
	assert.deepEqual(buildBasemapLabelOpacityRamp(4.15, 4.95, 0.95), [
		'interpolate',
		['linear'],
		['zoom'],
		4.15,
		0,
		4.95,
		0.95,
	]);
});

test('caps the far-out view to an exact researched top-15 city allowlist', () => {
	assert.equal(BASEMAP_SETTLEMENT_TOP_CITY_MATCHES.length, 15);

	const filter = buildBasemapTopCityFilter() as readonly any[];
	assert.equal(filter[0], 'any');
	assert.equal(filter.length - 1, 15);

	// City/state pairs are required so names like Columbus do not match the
	// wrong state.
	const columbusClause = filter.find((clause: any) =>
		JSON.stringify(clause).includes('"Columbus"')
	);
	assert.deepEqual(columbusClause, [
		'all',
		['==', ['coalesce', ['get', 'name_en'], ['get', 'name']], 'Columbus'],
		['==', ['get', 'iso_3166_2'], 'US-OH'],
	]);
});

test('broadens major labels only after the far-out top-15 band', () => {
	const major = buildBasemapMajorSettlementRankFilter() as readonly any[];
	assert.equal(major[0], 'step');
	assert.deepEqual(major[1], ['zoom']);
	assert.deepEqual(major[2], buildBasemapTopCityFilter());
	assert.equal(major[3], BASEMAP_SETTLEMENT_TOP_CITY_ONLY_MAX_ZOOM);
	assert.deepEqual(major[4], [
		'any',
		buildBasemapTopCityFilter(),
		[
			'<=',
			['coalesce', ['get', 'symbolrank'], ['get', 'filterrank'], 99],
			BASEMAP_SETTLEMENT_MAJOR_SYMBOLRANK_CEILING,
		],
	]);
});

test('reveals smaller cities on a monotonic, disjoint symbolrank window', () => {
	const minor = buildBasemapMinorSettlementRankFilter() as readonly any[];
	assert.equal(minor[0], 'all');
	// Top-15 labels stay owned by the major tier after the broadening point, so
	// the minor tier must not duplicate them.
	assert.deepEqual(minor[1], ['case', buildBasemapTopCityFilter(), false, true]);
	// Lower bound keeps the minor tier strictly below the major ceiling (disjoint
	// tiers — nothing is double-counted at the far-out view).
	assert.deepEqual(minor[2], [
		'>',
		['coalesce', ['get', 'symbolrank'], ['get', 'filterrank'], 99],
		BASEMAP_SETTLEMENT_MAJOR_SYMBOLRANK_CEILING,
	]);
	const ceilingByZoom = (minor[3] as readonly any[])[2] as readonly any[];
	// step expr starts at the major ceiling, so nothing extra paints far out.
	assert.deepEqual(ceilingByZoom.slice(0, 3), [
		'step',
		['zoom'],
		BASEMAP_SETTLEMENT_MAJOR_SYMBOLRANK_CEILING,
	]);

	let prevZoom = -Infinity;
	let prevRank = BASEMAP_SETTLEMENT_MAJOR_SYMBOLRANK_CEILING - 1;
	for (const [zoom, rank] of BASEMAP_SETTLEMENT_MINOR_SYMBOLRANK_STOPS) {
		assert.ok(zoom > prevZoom, 'zoom strictly increasing');
		assert.ok(rank > prevRank, 'ceiling strictly increasing');
		assert.ok(
			rank > BASEMAP_SETTLEMENT_MAJOR_SYMBOLRANK_CEILING,
			'minor ceiling stays above the major pool'
		);
		prevZoom = zoom;
		prevRank = rank;
	}
});

test('builds a monotonic far-out collision-padding ramp', () => {
	const ramp = buildBasemapMajorSettlementTextPaddingRamp() as readonly any[];
	assert.deepEqual(ramp.slice(0, 3), ['interpolate', ['linear'], ['zoom']]);
	const stops: Array<[number, number]> = [];
	for (let i = 3; i < ramp.length; i += 2) {
		stops.push([ramp[i] as number, ramp[i + 1] as number]);
	}
	assert.deepEqual(stops, BASEMAP_SETTLEMENT_MAJOR_TEXT_PADDING_STOPS.map((s) => [s[0], s[1]]));
	// Zoom stops strictly increasing; the far-out pool is hard-capped to 15, so
	// padding stays close to native to maximize placement of those labels.
	for (let i = 1; i < stops.length; i += 1) {
		assert.ok(stops[i][0] > stops[i - 1][0], 'padding ramp zoom strictly increasing');
	}
	assert.ok(stops[0][1] <= 4, 'far-out padding remains low because the pool is exact');
	assert.ok(stops.at(-1)![1] <= 2, 'padding relaxes to the native default when zoomed in');
});

test('strips the native symbolrank clause but keeps class/filterrank predicates', () => {
	// Mirrors the real Streets v12 settlement-major-label filter shape.
	const nativeFilter = [
		'all',
		['<=', ['get', 'filterrank'], 3],
		['match', ['get', 'class'], ['settlement'], true, false],
		['step', ['zoom'], false, 2, ['<=', ['get', 'symbolrank'], 6]],
	];
	assert.equal(expressionReferencesSymbolrank(nativeFilter), true);

	const stripped = stripNativeSymbolrankClause(nativeFilter) as any[];
	assert.equal(stripped[0], 'all');
	// The symbolrank step clause is gone…
	assert.equal(expressionReferencesSymbolrank(stripped), false);
	// …but the class + filterrank predicates survive.
	assert.deepEqual(stripped[1], ['<=', ['get', 'filterrank'], 3]);
	assert.deepEqual(stripped[2], [
		'match',
		['get', 'class'],
		['settlement'],
		true,
		false,
	]);

	// A bare rank-only filter carries no predicates worth keeping.
	assert.deepEqual(stripNativeSymbolrankClause(['<=', ['get', 'symbolrank'], 6]), [
		'all',
	]);
	// Non-rank filters pass through untouched.
	assert.deepEqual(stripNativeSymbolrankClause(['has', 'name']), ['has', 'name']);
});

test('composes settlement filters with native predicates AND our rank window', () => {
	const nativeFilter = [
		'all',
		['<=', ['get', 'filterrank'], 3],
		['step', ['zoom'], false, 2, ['<=', ['get', 'symbolrank'], 6]],
	];
	const composed = composeBasemapSettlementFilter(
		nativeFilter,
		'settlement-major'
	) as any[];
	assert.equal(composed[0], 'all');
	// No native symbolrank clause leaks through.
	const nativePart = composed[1];
	assert.equal(expressionReferencesSymbolrank(nativePart), false);
	// Our exact far-out / broad-after-regional gate is appended.
	assert.deepEqual(composed.at(-1), buildBasemapMajorSettlementRankFilter());

	// Non-settlement kinds keep their base filter untouched.
	assert.equal(composeBasemapSettlementFilter(nativeFilter, 'street'), nativeFilter);
});

test('combines label filters without wrapping missing filters', () => {
	const extra = ['<=', ['get', 'filterrank'], 2];
	assert.deepEqual(combineBasemapLabelFilters(null, extra), extra);
	assert.deepEqual(combineBasemapLabelFilters(['==', ['get', 'class'], 'town'], null), [
		'==',
		['get', 'class'],
		'town',
	]);
	assert.deepEqual(combineBasemapLabelFilters(['has', 'name'], extra), [
		'all',
		['has', 'name'],
		extra,
	]);
	assert.equal(isBasemapSettlementLabelKind('settlement-major'), true);
	assert.equal(isBasemapSettlementLabelKind('street'), false);
	assert.equal(isBasemapSettlementLabelKind(null), false);
});
