import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	BASEMAP_DETAIL_CLEAN_CEILING_ZOOM,
	BASEMAP_DETAIL_FILL_MIN_ZOOM,
	BASEMAP_DETAIL_HILLSHADE_MIN_ZOOM,
	BASEMAP_DETAIL_ROAD_MAJOR_MIN_ZOOM,
	BASEMAP_DETAIL_ROAD_MINOR_MIN_ZOOM,
	BASEMAP_DETAIL_WATER_FILL_FADE_END_ZOOM,
	BASEMAP_DETAIL_WATER_FILL_MIN_ZOOM,
	BASEMAP_DETAIL_WATERWAY_LINE_MIN_ZOOM,
	MAP_LOW_ZOOM_LAKES_MAX_ZOOM,
} from './constants';
import {
	buildBasemapDetailOpacityRamp,
	classifyBasemapDetailLayer,
	containsZoomExpression,
	isBasemapHillshadeLayer,
	isBasemapMajorRoadLikeLineLayer,
	isBasemapWaterFillLayer,
	isBasemapWaterwayLineLayer,
} from './basemapDetailGate';

test('classifies low-zoom detail fills without matching base land or water', () => {
	assert.equal(
		classifyBasemapDetailLayer('fill', 'landcover', 'landcover'),
		'detail-fill'
	);
	assert.equal(
		classifyBasemapDetailLayer('fill', 'national-park', 'landcover'),
		'detail-fill'
	);
	assert.equal(classifyBasemapDetailLayer('fill', 'park', undefined), 'detail-fill');
	assert.equal(classifyBasemapDetailLayer('fill', 'landuse', 'landuse'), 'detail-fill');

	assert.equal(classifyBasemapDetailLayer('fill', 'water', 'water'), null);
	assert.equal(classifyBasemapDetailLayer('fill', 'water-depth', 'water'), null);
	assert.equal(classifyBasemapDetailLayer('fill', 'land', undefined), null);
	assert.equal(classifyBasemapDetailLayer('fill', 'murmur-states-fill-hit'), null);
	assert.equal(isBasemapWaterFillLayer('fill', 'water', 'water'), true);
});

test('classifies roads and waterways as detail linework', () => {
	assert.equal(classifyBasemapDetailLayer('line', 'road-simple', 'road'), 'detail-line');
	assert.equal(classifyBasemapDetailLayer('line', 'motorway-trunk', 'road'), 'detail-line');
	assert.equal(classifyBasemapDetailLayer('line', 'bridge-primary', 'road'), 'detail-line');
	assert.equal(classifyBasemapDetailLayer('line', 'tunnel-secondary', 'road'), 'detail-line');
	assert.equal(classifyBasemapDetailLayer('line', 'waterway', 'waterway'), 'detail-line');

	assert.equal(classifyBasemapDetailLayer('line', 'admin-1-boundary', 'admin'), null);
	assert.equal(classifyBasemapDetailLayer('symbol', 'road-label-simple', 'road'), null);
});

test('splits waterways and major/minor roads for staggered line gates', () => {
	assert.equal(isBasemapWaterwayLineLayer('waterway', 'waterway'), true);
	assert.equal(isBasemapWaterwayLineLayer('waterway-river', undefined), true);
	assert.equal(isBasemapWaterwayLineLayer('road-simple', 'road'), false);

	assert.equal(isBasemapMajorRoadLikeLineLayer('motorway-trunk', 'road'), true);
	assert.equal(isBasemapMajorRoadLikeLineLayer('road-primary', 'road'), true);
	assert.equal(isBasemapMajorRoadLikeLineLayer('highway-shield', 'road'), true);
	assert.equal(isBasemapMajorRoadLikeLineLayer('road-simple', 'road'), true);
	assert.equal(isBasemapMajorRoadLikeLineLayer('bridge-simple', 'road'), true);

	assert.equal(isBasemapMajorRoadLikeLineLayer('road-service', 'road'), false);
	assert.equal(isBasemapMajorRoadLikeLineLayer('road-path', 'road'), false);
	assert.equal(isBasemapMajorRoadLikeLineLayer('tunnel-secondary', 'road'), false);
	assert.equal(isBasemapMajorRoadLikeLineLayer('waterway', 'waterway'), false);
});

test('flags terrain hillshade (its own layer type) for low-zoom gating', () => {
	assert.equal(isBasemapHillshadeLayer('hillshade'), true);
	assert.equal(isBasemapHillshadeLayer('fill'), false);
	assert.equal(isBasemapHillshadeLayer('line'), false);
	assert.equal(isBasemapHillshadeLayer(undefined), false);
	// Hillshade is not a fill/line, so the fill/line classifier must ignore it.
	assert.equal(classifyBasemapDetailLayer('hillshade', 'hillshade'), null);
});

test('builds idempotent detail opacity gates without nesting zoom expressions', () => {
	const startZoom = 7.25;
	const endZoom = 8.5;
	const numericRamp = buildBasemapDetailOpacityRamp(0.42, startZoom, endZoom);
	assert.deepEqual(numericRamp, [
		'interpolate',
		['linear'],
		['zoom'],
		startZoom,
		0,
		endZoom,
		0.42,
	]);

	assert.deepEqual(buildBasemapDetailOpacityRamp(null, startZoom, endZoom), [
		'interpolate',
		['linear'],
		['zoom'],
		startZoom,
		0,
		endZoom,
		1,
	]);

	const dataDrivenOpacity = ['case', ['boolean', ['get', 'active'], false], 0.8, 0.2];
	assert.deepEqual(buildBasemapDetailOpacityRamp(dataDrivenOpacity, startZoom, endZoom), [
		'interpolate',
		['linear'],
		['zoom'],
		startZoom,
		0,
		endZoom,
		dataDrivenOpacity,
	]);

	const zoomOpacity = ['interpolate', ['linear'], ['zoom'], 5, 0.8, 7, 0.1];
	assert.equal(containsZoomExpression(zoomOpacity), true);
	assert.equal(buildBasemapDetailOpacityRamp(zoomOpacity, startZoom, endZoom), null);
});

test('keeps all detail rungs above the clean state-level ceiling', () => {
	const detailMinZooms = [
		BASEMAP_DETAIL_WATER_FILL_MIN_ZOOM,
		BASEMAP_DETAIL_FILL_MIN_ZOOM,
		BASEMAP_DETAIL_WATERWAY_LINE_MIN_ZOOM,
		BASEMAP_DETAIL_ROAD_MAJOR_MIN_ZOOM,
		BASEMAP_DETAIL_ROAD_MINOR_MIN_ZOOM,
		BASEMAP_DETAIL_HILLSHADE_MIN_ZOOM,
	];

	for (const minZoom of detailMinZooms) {
		assert.ok(minZoom > BASEMAP_DETAIL_CLEAN_CEILING_ZOOM);
	}

	for (let index = 1; index < detailMinZooms.length; index += 1) {
		assert.ok(detailMinZooms[index] > detailMinZooms[index - 1]);
	}

	assert.equal(MAP_LOW_ZOOM_LAKES_MAX_ZOOM, BASEMAP_DETAIL_WATER_FILL_FADE_END_ZOOM);
});
