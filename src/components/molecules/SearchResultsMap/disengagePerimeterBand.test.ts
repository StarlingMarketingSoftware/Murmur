import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CURATED_BLOB_DISENGAGE_PERIMETER_BAND_PX } from './constants';
import { buildOuterRingWorldSegments, isWorldPointNearSegments } from './polygons';
import { latLngToWorldPixel } from './wasmGeo';
import type { ClippingMultiPolygon } from './types';

// These tests pin the geometric contract behind the "Disengage search" affordance.
//
// The affordance is a band of CURATED_BLOB_DISENGAGE_PERIMETER_BAND_PX *screen pixels*
// centered on the curated blob's outline, so it straddles the edge: roughly half the band
// sits INSIDE the blob fill and half sits OUTSIDE it. The map click handler must therefore
// treat a click anywhere in that band — including the inner half over the fill — as a
// disengage, instead of letting the in-blob "search interaction" branch swallow it (which was
// the original bug: the prompt showed but only the razor-thin outside sliver actually worked).

const BAND = CURATED_BLOB_DISENGAGE_PERIMETER_BAND_PX;

// A large axis-aligned square blob (in lng/lat) whose top edge runs along lat = +2.
const SQUARE_BLOB: ClippingMultiPolygon = [
	[
		[
			[-2, -2],
			[2, -2],
			[2, 2],
			[-2, 2],
			[-2, -2],
		],
	],
];

const worldSizeForZoom = (zoom: number): number => 512 * Math.pow(2, zoom);

// World pixels per degree of latitude near the top edge (lat ≈ 2) at this worldSize.
// Used to convert a desired pixel offset across the edge into a lat delta.
const pxPerDegLatNearTopEdge = (worldSize: number): number => {
	const a = latLngToWorldPixel({ lat: 2, lng: 0 }, worldSize);
	const b = latLngToWorldPixel({ lat: 2.001, lng: 0 }, worldSize);
	return Math.abs(a.y - b.y) / 0.001;
};

const nearPerimeter = (
	mp: ClippingMultiPolygon,
	worldSize: number,
	lng: number,
	lat: number
): boolean => {
	const segments = buildOuterRingWorldSegments(mp, worldSize);
	const wp = latLngToWorldPixel({ lat, lng }, worldSize);
	return isWorldPointNearSegments(wp.x, wp.y, segments, BAND);
};

test('band constant is a comfortable click target (not a razor-thin sliver)', () => {
	// Regression guard: shrinking this back toward ~0 reintroduces the "needs a ton of
	// clicks" feel. It does not need to be large, just a real target.
	assert.ok(BAND >= 12, `expected a usable band width, got ${BAND}px`);
});

test('the disengage band straddles the outline — inner half (over the fill) is included', () => {
	const worldSize = worldSizeForZoom(6);
	const pxPerDeg = pxPerDegLatNearTopEdge(worldSize);
	// A quarter-band INSIDE the top edge: this is the region the old click ordering wrongly
	// swallowed as an in-blob "search interaction". It must register as on the perimeter.
	const insideLat = 2 - (BAND * 0.5) / pxPerDeg;
	assert.equal(
		nearPerimeter(SQUARE_BLOB, worldSize, 0, insideLat),
		true,
		'a click just inside the outline must still be within the disengage band'
	);
});

test('the disengage band includes the matching outer half too', () => {
	const worldSize = worldSizeForZoom(6);
	const pxPerDeg = pxPerDegLatNearTopEdge(worldSize);
	const outsideLat = 2 + (BAND * 0.5) / pxPerDeg;
	assert.equal(
		nearPerimeter(SQUARE_BLOB, worldSize, 0, outsideLat),
		true,
		'a click just outside the outline must be within the disengage band'
	);
});

test('deep interior and far exterior are NOT in the band (disengage stays edge-only)', () => {
	const worldSize = worldSizeForZoom(6);
	const pxPerDeg = pxPerDegLatNearTopEdge(worldSize);
	// Center of the blob — an intentional in-blob interaction, must NOT disengage.
	assert.equal(nearPerimeter(SQUARE_BLOB, worldSize, 0, 0), false, 'blob center');
	// Well inside the top edge (several band-widths in) — must NOT disengage.
	const deepInsideLat = 2 - (BAND * 3) / pxPerDeg;
	assert.equal(
		nearPerimeter(SQUARE_BLOB, worldSize, 0, deepInsideLat),
		false,
		'deep interior near the top edge'
	);
	// Well outside the top edge (ambient overlay) — must NOT disengage.
	const farOutsideLat = 2 + (BAND * 3) / pxPerDeg;
	assert.equal(
		nearPerimeter(SQUARE_BLOB, worldSize, 0, farOutsideLat),
		false,
		'far exterior near the top edge'
	);
});

test('band tracks the live geometry: rebuilt segments hit-test against the new outline', () => {
	const worldSize = worldSizeForZoom(6);
	// Simulate a morph that moves the top edge from lat 2 up to lat 3 (a fresh array, as
	// applyBlobMorph reassigns). The perimeter test must follow the new edge, not the old one.
	const morphed: ClippingMultiPolygon = [
		[
			[
				[-2, -2],
				[2, -2],
				[2, 3],
				[-2, 3],
				[-2, -2],
			],
		],
	];
	const pxPerDeg = pxPerDegLatNearTopEdge(worldSize);
	// The OLD edge (lat 2) is now deep interior of the morphed shape → not on the perimeter.
	const oldEdgeOffset = (BAND * 3) / pxPerDeg;
	assert.equal(
		nearPerimeter(morphed, worldSize, 0, 2 - oldEdgeOffset),
		false,
		'old edge location should no longer be treated as the perimeter after a morph'
	);
	// The NEW edge (lat 3) is now the perimeter.
	assert.equal(nearPerimeter(morphed, worldSize, 0, 3), true, 'new edge is the perimeter');
});

test('a higher zoom (larger worldSize) keeps the same pixel band width', () => {
	// The band is defined in screen pixels, so at higher zoom the same pixel offset maps to a
	// smaller lat delta. Verify the helper still reports "near" for a half-band pixel offset.
	const worldSize = worldSizeForZoom(9);
	const pxPerDeg = pxPerDegLatNearTopEdge(worldSize);
	const insideLat = 2 - (BAND * 0.5) / pxPerDeg;
	assert.equal(nearPerimeter(SQUARE_BLOB, worldSize, 0, insideLat), true);
});
