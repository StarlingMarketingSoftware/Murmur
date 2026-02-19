'use client';

import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { ContactWithName } from '@/types/contact';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { useGetContactsMapOverlay } from '@/hooks/queryHooks/useContacts';
import {
	calculateTooltipWidth,
	calculateTooltipHeight,
	calculateTooltipAnchorY,
	generateMapTooltipIconUrl,
	MAP_TOOLTIP_ANCHOR_X,
} from '@/components/atoms/_svg/MapTooltipIcon';
import {
	generateMapMarkerPinIconUrl,
	MAP_MARKER_PIN_CIRCLE_CENTER_X,
	MAP_MARKER_PIN_CIRCLE_CENTER_Y,
	MAP_MARKER_PIN_CIRCLE_DIAMETER,
	MAP_MARKER_PIN_VIEWBOX_HEIGHT,
	MAP_MARKER_PIN_VIEWBOX_WIDTH,
} from '@/components/atoms/_svg/MapMarkerPinIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import {
	isRestaurantTitle,
	isCoffeeShopTitle,
	isMusicVenueTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
	getWineBeerSpiritsLabel,
} from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';

type LatLngLiteral = { lat: number; lng: number };
type MarkerHoverMeta = { clientX: number; clientY: number };

type ClippingCoord = [number, number]; // [lng, lat]
type ClippingRing = ClippingCoord[];
type ClippingPolygon = ClippingRing[];
type ClippingMultiPolygon = ClippingPolygon[];

type BoundingBox = { minLat: number; maxLat: number; minLng: number; maxLng: number };
type PreparedClippingPolygon = { polygon: ClippingPolygon; bbox: BoundingBox };

type MapSelectionBounds = { south: number; west: number; north: number; east: number };
type AreaSelectPayload = {
	/** Contact ids inside the rectangle selection (primary results + matching overlay markers). */
	contactIds: number[];
	/**
	 * Overlay contacts (not part of the primary `contacts` prop) that were selected, so the
	 * parent can render them in a side panel list.
	 */
	extraContacts: ContactWithName[];
};

type GeoJsonGeometry =
	| {
			type: 'Polygon';
			// GeoJSON coords: [lng, lat]
			coordinates: number[][][];
	  }
	| {
			type: 'MultiPolygon';
			// GeoJSON coords: [lng, lat]
			coordinates: number[][][][];
	  };

type GeoJsonFeatureCollection = {
	type: 'FeatureCollection';
	features: Array<{
		type: 'Feature';
		id?: string | number;
		properties?: Record<string, unknown>;
		geometry: GeoJsonGeometry;
	}>;
};

const closeRing = (ring: ClippingRing): ClippingRing => {
	if (ring.length === 0) return ring;
	const first = ring[0];
	const last = ring[ring.length - 1];
	if (first[0] === last[0] && first[1] === last[1]) return ring;
	return [...ring, first];
};

const absRingArea = (ring: ClippingRing): number => {
	if (ring.length < 3) return 0;
	let area2 = 0;
	for (let i = 0; i < ring.length; i++) {
		const [x1, y1] = ring[i];
		const [x2, y2] = ring[(i + 1) % ring.length];
		area2 += x1 * y2 - x2 * y1;
	}
	return Math.abs(area2 / 2);
};

type OutlinePolygonFeatureCollection = {
	type: 'FeatureCollection';
	features: Array<{
		type: 'Feature';
		properties: Record<string, unknown>;
		geometry: {
			type: 'Polygon';
			// GeoJSON coords: [lng, lat]
			coordinates: number[][][];
		};
	}>;
};

const createOutlineGeoJsonFromMultiPolygon = (
	multiPolygon: ClippingMultiPolygon
): OutlinePolygonFeatureCollection => {
	const features: OutlinePolygonFeatureCollection['features'] = [];
	for (const clippingPolygon of multiPolygon) {
		if (!clippingPolygon?.length) continue;

		const outerRing = clippingPolygon.reduce<ClippingRing | null>((best, ring) => {
			if (!ring?.length) return best;
			if (!best) return ring;
			return absRingArea(ring) > absRingArea(best) ? ring : best;
		}, null);

		if (!outerRing) continue;

		const coords = closeRing(
			outerRing.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
		);
		if (coords.length < 4) continue;

		features.push({
			type: 'Feature',
			properties: {},
			geometry: {
				type: 'Polygon',
				coordinates: [coords.map(([lng, lat]) => [lng, lat])],
			},
		});
	}
	return { type: 'FeatureCollection', features };
};

const geoJsonRingToClippingRing = (ring: number[][]): ClippingRing => {
	const coords = ring
		.map((pair): ClippingCoord => [pair?.[0] as number, pair?.[1] as number])
		.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
	if (coords.length < 3) return [];
	return closeRing(coords);
};

const geoJsonPolygonToClippingPolygon = (
	polygonCoords: number[][][]
): ClippingPolygon => {
	const rings = (polygonCoords ?? [])
		.map((ring) => geoJsonRingToClippingRing(ring))
		.filter((ring) => ring.length >= 4);
	return rings;
};

const geoJsonGeometryToClippingMultiPolygon = (
	geometry: GeoJsonGeometry | null | undefined
): ClippingMultiPolygon | null => {
	if (!geometry) return null;
	if (geometry.type === 'Polygon') {
		const poly = geoJsonPolygonToClippingPolygon(geometry.coordinates);
		return poly.length ? [poly] : null;
	}
	if (geometry.type === 'MultiPolygon') {
		const polys = (geometry.coordinates ?? [])
			.map((polyCoords) => geoJsonPolygonToClippingPolygon(polyCoords))
			.filter((poly) => poly.length);
		return polys.length ? polys : null;
	}
	return null;
};

const EMPTY_POLYGON_FC: OutlinePolygonFeatureCollection = {
	type: 'FeatureCollection',
	features: [],
};

const boundsToPolygonFeatureCollection = (
	bounds: MapSelectionBounds,
	properties: Record<string, unknown> = {}
): OutlinePolygonFeatureCollection => {
	const ring: number[][] = [
		[bounds.west, bounds.south],
		[bounds.east, bounds.south],
		[bounds.east, bounds.north],
		[bounds.west, bounds.north],
		[bounds.west, bounds.south],
	];
	return {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				properties,
				geometry: { type: 'Polygon', coordinates: [ring] },
			},
		],
	};
};

const coerceFiniteNumber = (value: unknown): number | null => {
	if (value == null) return null;
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return null;
		// Handle common "decimal comma" formats (e.g. "39,1234")
		const normalized =
			trimmed.includes(',') && !trimmed.includes('.')
				? trimmed.replace(',', '.')
				: trimmed;
		const n = Number(normalized);
		return Number.isFinite(n) ? n : null;
	}

	// Prisma can sometimes surface numeric-like objects; Number(...) is a safe coercion attempt.
	const n = Number((value as { valueOf?: () => unknown })?.valueOf?.() ?? value);
	return Number.isFinite(n) ? n : null;
};

const getLatLngFromContact = (contact: ContactWithName): LatLngLiteral | null => {
	const anyContact = contact as unknown as Record<string, unknown>;
	const lat = coerceFiniteNumber(
		anyContact.latitude ?? anyContact.lat ?? anyContact.Latitude ?? anyContact.LATITUDE
	);
	const lng = coerceFiniteNumber(
		anyContact.longitude ??
			anyContact.lng ??
			anyContact.lon ??
			anyContact.Longitude ??
			anyContact.LONGITUDE
	);

	if (lat == null || lng == null) return null;
	// Treat (0,0) as "unknown" coordinates (common placeholder) to avoid the map jumping to Africa.
	// This product is US-focused; a true (0,0) contact would be in the Gulf of Guinea.
	if (Math.abs(lat) < 1e-9 && Math.abs(lng) < 1e-9) return null;
	// Defensive sanity bounds: Google Maps won't render invalid ranges reliably.
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
	return { lat, lng };
};

const coordinateKey = (coords: LatLngLiteral) =>
	`${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;

// Deterministic "spiderfy" offset for exact/near-exact duplicate coordinates so markers don't fully overlap.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~2.399963...
const DUPLICATE_JITTER_BASE_DEG = 0.0015; // ~167m latitude; visible at mid zoom levels
const jitterDuplicateCoords = (base: LatLngLiteral, index: number): LatLngLiteral => {
	const angle = index * GOLDEN_ANGLE;
	const radius = DUPLICATE_JITTER_BASE_DEG * Math.sqrt(index);
	const dx = radius * Math.cos(angle);
	const dy = radius * Math.sin(angle);
	const latRad = (base.lat * Math.PI) / 180;
	const lngScale = Math.max(0.2, Math.cos(latRad));
	return {
		lat: base.lat + dy,
		lng: base.lng + dx / lngScale,
	};
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

type WasmGeoModule = {
	lat_lng_to_world_pixel: (
		lat: number,
		lng: number,
		worldSize: number
	) => Float64Array | ArrayLike<number>;
	distance_point_to_segment_sq: (
		px: number,
		py: number,
		ax: number,
		ay: number,
		bx: number,
		by: number
	) => number;
	point_in_ring: (px: number, py: number, ring: Float64Array) => boolean;
	is_point_near_segments: (
		x: number,
		y: number,
		segments: Float64Array,
		thresholdPx: number
	) => boolean;
	batch_lat_lng_to_world_pixel: (
		coords: Float64Array,
		worldSize: number
	) => Float64Array | ArrayLike<number>;
	pick_non_overlapping_indices: (
		xy: Float64Array,
		priority_order: Uint32Array,
		in_locked_order: Uint32Array,
		out_locked_order: Uint32Array,
		in_locked_mask: Uint8Array,
		max_primary_dots: number,
		in_locked_share: number,
		hard_cap_outside_by_in_locked: boolean,
		min_separation_sq: number,
		cell_size: number
	) => Uint32Array;
	stable_viewport_sample: (
		coords: Float64Array,
		ids: Uint32Array,
		minLat: number,
		maxLat: number,
		minLng: number,
		maxLng: number,
		slots: number,
		seed: number
	) => Uint32Array;
	union_multi_polygons?: (multiPolygons: ClippingMultiPolygon[]) => ClippingMultiPolygon;
};

const USE_WASM_GEO = process.env.NEXT_PUBLIC_USE_WASM_GEO === 'true';

let cachedWasmGeoModule: WasmGeoModule | null = null;
let wasmGeoModulePromise: Promise<WasmGeoModule | null> | null = null;
let hasLoggedWasmGeoLoadError = false;
let hasLoggedWasmGeoRuntimeError = false;

const logWasmGeoLoadError = (error: unknown): void => {
	if (hasLoggedWasmGeoLoadError) return;
	hasLoggedWasmGeoLoadError = true;
	console.error(
		'[SearchResultsMap] failed to load WASM geo module, using TypeScript fallback',
		error
	);
};

const logWasmGeoRuntimeError = (error: unknown): void => {
	if (hasLoggedWasmGeoRuntimeError) return;
	hasLoggedWasmGeoRuntimeError = true;
	console.error('[SearchResultsMap] WASM geo call failed, using TypeScript fallback', error);
};

const toFloat64Array = (value: Float64Array | ArrayLike<number>): Float64Array =>
	value instanceof Float64Array ? value : Float64Array.from(value);

const getWasmGeoModuleSync = (): WasmGeoModule | null => cachedWasmGeoModule;

const ensureWasmGeoModuleLoaded = async (): Promise<WasmGeoModule | null> => {
	if (!USE_WASM_GEO) return null;
	if (cachedWasmGeoModule) return cachedWasmGeoModule;

	if (!wasmGeoModulePromise) {
		wasmGeoModulePromise = import('../../../../rust-scorer/pkg-web')
			.then(async (module) => {
				// wasm-pack `--target web` exports an async init function as the default export.
				// We must call it (once) before using the named wrapper exports.
				const maybeInit = (module as { default?: unknown }).default;
				if (typeof maybeInit === 'function') {
					try {
						await (maybeInit as () => Promise<unknown>)();
					} catch (error: unknown) {
						logWasmGeoLoadError(error);
						return null;
					}
				}

				const maybeModule = module as Partial<WasmGeoModule>;
				if (
					typeof maybeModule.lat_lng_to_world_pixel !== 'function' ||
					typeof maybeModule.distance_point_to_segment_sq !== 'function' ||
					typeof maybeModule.point_in_ring !== 'function' ||
					typeof maybeModule.is_point_near_segments !== 'function' ||
					typeof maybeModule.batch_lat_lng_to_world_pixel !== 'function' ||
					typeof maybeModule.pick_non_overlapping_indices !== 'function' ||
					typeof maybeModule.stable_viewport_sample !== 'function'
				) {
					return null;
				}

				// Smoke test: confirm calls don't throw post-init.
				try {
					const projected = toFloat64Array(maybeModule.lat_lng_to_world_pixel(0, 0, 256));
					if (projected.length < 2 || !Number.isFinite(projected[0]) || !Number.isFinite(projected[1]))
						return null;
				} catch (error: unknown) {
					logWasmGeoLoadError(error);
					return null;
				}

				cachedWasmGeoModule = maybeModule as WasmGeoModule;
				if (process.env.NODE_ENV !== 'production') {
					console.info('[SearchResultsMap] WASM geo module loaded');
				}
				return cachedWasmGeoModule;
			})
			.catch((error: unknown) => {
				logWasmGeoLoadError(error);
				return null;
			});
	}

	return wasmGeoModulePromise;
};

const ringFlatCache = new WeakMap<ClippingRing, Float64Array>();

const flattenRing = (ring: ClippingRing): Float64Array => {
	const cached = ringFlatCache.get(ring);
	if (cached) return cached;
	const flat = new Float64Array(ring.length * 2);
	for (let i = 0; i < ring.length; i++) {
		const [x, y] = ring[i];
		flat[i * 2] = x;
		flat[i * 2 + 1] = y;
	}
	ringFlatCache.set(ring, flat);
	return flat;
};

const getClientPointFromDomEvent = (
	domEvent: unknown
): { x: number; y: number } | null => {
	const ev = domEvent as Partial<MouseEvent & TouchEvent & PointerEvent> | null;
	if (!ev) return null;
	if (
		typeof (ev as MouseEvent).clientX === 'number' &&
		typeof (ev as MouseEvent).clientY === 'number'
	) {
		return { x: (ev as MouseEvent).clientX, y: (ev as MouseEvent).clientY };
	}
	const touches = (ev as TouchEvent).touches;
	if (touches && touches.length > 0) {
		return { x: touches[0].clientX, y: touches[0].clientY };
	}
	return null;
};

const hashStringToUint32 = (str: string): number => {
	// FNV-1a 32-bit
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
};

// Hard cap for total dots rendered in the viewport (contacts + background dots).
// Rendering more than this tends to overload many machines at low zoom levels.
const MAX_TOTAL_DOTS = 500;

const getBackgroundDotsQuantizationDeg = (zoom: number): number => {
	// Controls when we regenerate dots as the viewport changes.
	if (zoom <= 4) return 0.75;
	if (zoom <= 6) return 0.4;
	if (zoom <= 8) return 0.22;
	if (zoom <= 10) return 0.12;
	if (zoom <= 12) return 0.08;
	return 0.05;
};

const bboxFromMultiPolygon = (multiPolygon: ClippingMultiPolygon): BoundingBox | null => {
	let minLat = Infinity;
	let maxLat = -Infinity;
	let minLng = Infinity;
	let maxLng = -Infinity;
	for (const poly of multiPolygon) {
		for (const ring of poly) {
			for (const [lng, lat] of ring) {
				if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
				minLat = Math.min(minLat, lat);
				maxLat = Math.max(maxLat, lat);
				minLng = Math.min(minLng, lng);
				maxLng = Math.max(maxLng, lng);
			}
		}
	}
	if (
		!Number.isFinite(minLat) ||
		!Number.isFinite(maxLat) ||
		!Number.isFinite(minLng) ||
		!Number.isFinite(maxLng)
	) {
		return null;
	}
	return { minLat, maxLat, minLng, maxLng };
};

const isLatLngInBbox = (lat: number, lng: number, bbox: BoundingBox): boolean =>
	lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;

type ScoredContact = { contact: ContactWithName; score: number };

const stableViewportSampleContacts = (
	contacts: ContactWithName[],
	getCoords: (contact: ContactWithName) => LatLngLiteral | null,
	viewportBbox: BoundingBox,
	slots: number,
	seed: string
): ContactWithName[] => {
	if (slots <= 0 || contacts.length === 0) return [];
	if (contacts.length <= slots) return contacts;

	const wasm = getWasmGeoModuleSync();
	if (wasm) {
		try {
			// Build flat typed arrays from contacts
			const n = contacts.length;
			const coordsFlat = new Float64Array(n * 2);
			const idsFlat = new Uint32Array(n);
			for (let i = 0; i < n; i++) {
				const c = getCoords(contacts[i]);
				if (c) {
					coordsFlat[i * 2] = c.lat;
					coordsFlat[i * 2 + 1] = c.lng;
				} else {
					coordsFlat[i * 2] = NaN;
					coordsFlat[i * 2 + 1] = NaN;
				}
				idsFlat[i] = contacts[i].id;
			}
			const seedHash = hashStringToUint32(seed);
			const indices = wasm.stable_viewport_sample(
				coordsFlat,
				idsFlat,
				viewportBbox.minLat,
				viewportBbox.maxLat,
				viewportBbox.minLng,
				viewportBbox.maxLng,
				slots,
				seedHash
			);
			const result: ContactWithName[] = [];
			for (let i = 0; i < indices.length; i++) {
				result.push(contacts[indices[i]]!);
			}
			return result;
		} catch (err) {
			logWasmGeoRuntimeError(err);
		}
	}

	const latSpan = viewportBbox.maxLat - viewportBbox.minLat;
	const lngSpan = viewportBbox.maxLng - viewportBbox.minLng;
	if (
		!Number.isFinite(latSpan) ||
		!Number.isFinite(lngSpan) ||
		latSpan <= 0 ||
		lngSpan <= 0
	) {
		// Fallback: deterministic sample by hash order.
		return contacts
			.map((contact) => ({
				contact,
				score: hashStringToUint32(`${seed}|${contact.id}`),
			}))
			.sort((a, b) => a.score - b.score)
			.slice(0, slots)
			.map((x) => x.contact);
	}

	// Bin into a viewport grid and sample per-cell so spatial density is preserved.
	const grid = Math.max(8, Math.min(64, Math.round(Math.sqrt(slots) * 1.15)));
	const latStep = latSpan / grid;
	const lngStep = lngSpan / grid;
	if (
		!Number.isFinite(latStep) ||
		!Number.isFinite(lngStep) ||
		latStep <= 0 ||
		lngStep <= 0
	) {
		return contacts
			.map((contact) => ({
				contact,
				score: hashStringToUint32(`${seed}|${contact.id}`),
			}))
			.sort((a, b) => a.score - b.score)
			.slice(0, slots)
			.map((x) => x.contact);
	}

	const cellMap = new Map<string, ScoredContact[]>();
	for (const contact of contacts) {
		const coords = getCoords(contact);
		if (!coords) continue;
		if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;

		const x = clamp(
			Math.floor((coords.lng - viewportBbox.minLng) / lngStep),
			0,
			grid - 1
		);
		const y = clamp(
			Math.floor((coords.lat - viewportBbox.minLat) / latStep),
			0,
			grid - 1
		);
		const key = `${x},${y}`;
		const score = hashStringToUint32(`${seed}|${contact.id}`);
		const existing = cellMap.get(key);
		if (existing) existing.push({ contact, score });
		else cellMap.set(key, [{ contact, score }]);
	}

	const cells = Array.from(cellMap.entries()).map(([key, items]) => {
		items.sort((a, b) => a.score - b.score);
		return { key, items, weight: items.length };
	});
	if (cells.length === 0) return [];

	// If we have more non-empty cells than slots, select which cells to represent using
	// weighted sampling (cells with more contacts are more likely to be shown).
	if (cells.length >= slots) {
		const cellChoices = cells
			.map((cell) => {
				const u = (hashStringToUint32(`${seed}|cell|${cell.key}`) + 1) / 4294967296;
				const w = Math.max(1, cell.weight);
				// Efraimidis-Spirakis weighted sampling key: log(u)/w (higher is better).
				const cellScore = Math.log(u) / w;
				return { ...cell, cellScore };
			})
			.sort((a, b) => b.cellScore - a.cellScore)
			.slice(0, slots);

		return cellChoices.map((cell) => cell.items[0]!.contact);
	}

	// Otherwise, include one per cell, then allocate remaining slots proportionally to cell density.
	const picked: ContactWithName[] = cells.map((cell) => cell.items[0]!.contact);
	const remainingSlots = slots - picked.length;
	if (remainingSlots <= 0) return picked;

	const totalRemaining = cells.reduce(
		(sum, cell) => sum + Math.max(0, cell.items.length - 1),
		0
	);
	if (totalRemaining <= 0) return picked;

	const allocs = cells.map((cell) => {
		const remaining = Math.max(0, cell.items.length - 1);
		const exact = (remainingSlots * remaining) / totalRemaining;
		const base = Math.min(remaining, Math.floor(exact));
		const frac = exact - base;
		const tie = hashStringToUint32(`${seed}|rem|${cell.key}`);
		return { key: cell.key, items: cell.items, base, frac, remaining, tie };
	});

	const used = allocs.reduce((sum, a) => sum + a.base, 0);
	let remainder = Math.max(0, remainingSlots - used);

	allocs.sort((a, b) => {
		if (b.frac !== a.frac) return b.frac - a.frac;
		return a.tie - b.tie;
	});

	for (let i = 0; i < allocs.length && remainder > 0; i++) {
		const a = allocs[i];
		if (a.base < a.remaining) {
			a.base += 1;
			remainder--;
		}
	}

	for (const a of allocs) {
		const take = Math.min(a.base, a.remaining);
		for (let i = 1; i <= take; i++) {
			const item = a.items[i];
			if (item) picked.push(item.contact);
		}
	}

	return picked.slice(0, slots);
};

type WorldSegment = {
	ax: number;
	ay: number;
	bx: number;
	by: number;
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
};

const worldSegmentsFlatCache = new WeakMap<WorldSegment[], Float64Array>();

const flattenWorldSegments = (segments: WorldSegment[]): Float64Array => {
	const cached = worldSegmentsFlatCache.get(segments);
	if (cached) return cached;
	const flat = new Float64Array(segments.length * 8);
	for (let i = 0; i < segments.length; i++) {
		const s = segments[i];
		const baseIdx = i * 8;
		flat[baseIdx] = s.ax;
		flat[baseIdx + 1] = s.ay;
		flat[baseIdx + 2] = s.bx;
		flat[baseIdx + 3] = s.by;
		flat[baseIdx + 4] = s.minX;
		flat[baseIdx + 5] = s.maxX;
		flat[baseIdx + 6] = s.minY;
		flat[baseIdx + 7] = s.maxY;
	}
	worldSegmentsFlatCache.set(segments, flat);
	return flat;
};

const latLngToWorldPixel = (
	coords: LatLngLiteral,
	worldSize: number
): { x: number; y: number } => {
	const wasmGeo = getWasmGeoModuleSync();
	if (wasmGeo) {
		try {
			const projected = toFloat64Array(
				wasmGeo.lat_lng_to_world_pixel(coords.lat, coords.lng, worldSize)
			);
			if (projected.length >= 2) {
				const x = projected[0];
				const y = projected[1];
				if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
			}
		} catch (error: unknown) {
			logWasmGeoRuntimeError(error);
		}
	}

	// Web Mercator world pixel coords at the current zoom.
	const latClamped = clamp(coords.lat, -85, 85);
	const siny = Math.sin((latClamped * Math.PI) / 180);
	const x = ((coords.lng + 180) / 360) * worldSize;
	const y = (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * worldSize;
	return { x, y };
};

const batchLatLngToWorldPixels = (
	coordsList: LatLngLiteral[],
	worldSize: number
): Array<{ x: number; y: number }> => {
	if (coordsList.length === 0) return [];

	const wasmGeo = getWasmGeoModuleSync();
	if (wasmGeo) {
		const flat = new Float64Array(coordsList.length * 2);
		for (let i = 0; i < coordsList.length; i++) {
			const coords = coordsList[i];
			flat[i * 2] = coords.lat;
			flat[i * 2 + 1] = coords.lng;
		}

		try {
			const projected = toFloat64Array(wasmGeo.batch_lat_lng_to_world_pixel(flat, worldSize));
			if (projected.length >= coordsList.length * 2) {
				const out = new Array<{ x: number; y: number }>(coordsList.length);
				for (let i = 0; i < coordsList.length; i++) {
					out[i] = { x: projected[i * 2], y: projected[i * 2 + 1] };
				}
				return out;
			}
		} catch (error: unknown) {
			logWasmGeoRuntimeError(error);
		}
	}

	return coordsList.map((coords) => latLngToWorldPixel(coords, worldSize));
};

const distancePointToSegmentSq = (
	px: number,
	py: number,
	ax: number,
	ay: number,
	bx: number,
	by: number
): number => {
	const wasmGeo = getWasmGeoModuleSync();
	if (wasmGeo) {
		try {
			const distSq = wasmGeo.distance_point_to_segment_sq(px, py, ax, ay, bx, by);
			if (Number.isFinite(distSq)) return distSq;
		} catch (error: unknown) {
			logWasmGeoRuntimeError(error);
		}
	}

	const abx = bx - ax;
	const aby = by - ay;
	const apx = px - ax;
	const apy = py - ay;
	const denom = abx * abx + aby * aby;
	if (denom <= 0) return apx * apx + apy * apy;
	let t = (apx * abx + apy * aby) / denom;
	t = clamp(t, 0, 1);
	const cx = ax + t * abx;
	const cy = ay + t * aby;
	const dx = px - cx;
	const dy = py - cy;
	return dx * dx + dy * dy;
};

const buildOuterRingWorldSegments = (
	multiPolygon: ClippingMultiPolygon,
	worldSize: number
): WorldSegment[] => {
	const segments: WorldSegment[] = [];
	for (const polygon of multiPolygon) {
		if (!polygon?.length) continue;
		const outerRing = polygon.reduce<ClippingRing | null>((best, ring) => {
			if (!ring?.length) return best;
			if (!best) return ring;
			return absRingArea(ring) > absRingArea(best) ? ring : best;
		}, null);
		if (!outerRing || outerRing.length < 2) continue;

		for (let i = 0; i < outerRing.length - 1; i++) {
			const a = outerRing[i];
			const b = outerRing[i + 1];
			if (!a || !b) continue;
			const [lngA, latA] = a;
			const [lngB, latB] = b;
			if (
				!Number.isFinite(lngA) ||
				!Number.isFinite(latA) ||
				!Number.isFinite(lngB) ||
				!Number.isFinite(latB)
			)
				continue;
			const wa = latLngToWorldPixel({ lat: latA, lng: lngA }, worldSize);
			const wb = latLngToWorldPixel({ lat: latB, lng: lngB }, worldSize);
			segments.push({
				ax: wa.x,
				ay: wa.y,
				bx: wb.x,
				by: wb.y,
				minX: Math.min(wa.x, wb.x),
				maxX: Math.max(wa.x, wb.x),
				minY: Math.min(wa.y, wb.y),
				maxY: Math.max(wa.y, wb.y),
			});
		}
	}
	return segments;
};

const isWorldPointNearSegments = (
	x: number,
	y: number,
	segments: WorldSegment[],
	thresholdPx: number
): boolean => {
	const wasmGeo = getWasmGeoModuleSync();
	if (wasmGeo && segments.length > 0) {
		try {
			return wasmGeo.is_point_near_segments(x, y, flattenWorldSegments(segments), thresholdPx);
		} catch (error: unknown) {
			logWasmGeoRuntimeError(error);
		}
	}

	const t = Math.max(0, thresholdPx);
	const tSq = t * t;
	for (const s of segments) {
		// Cheap bbox reject (expanded by threshold).
		if (x < s.minX - t || x > s.maxX + t || y < s.minY - t || y > s.maxY + t) continue;
		const dSq = distancePointToSegmentSq(x, y, s.ax, s.ay, s.bx, s.by);
		if (dSq < tSq) return true;
	}
	return false;
};

const pointInRing = (point: ClippingCoord, ring: ClippingRing): boolean => {
	const [x, y] = point;
	const wasmGeo = getWasmGeoModuleSync();
	if (wasmGeo) {
		try {
			return wasmGeo.point_in_ring(x, y, flattenRing(ring));
		} catch (error: unknown) {
			logWasmGeoRuntimeError(error);
		}
	}

	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		const intersects =
			yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
		if (intersects) inside = !inside;
	}
	return inside;
};

const pointInClippingPolygon = (
	point: ClippingCoord,
	polygon: ClippingPolygon
): boolean => {
	if (!polygon?.length) return false;
	const outerRing = polygon.reduce<ClippingRing | null>((best, ring) => {
		if (!ring?.length) return best;
		if (!best) return ring;
		return absRingArea(ring) > absRingArea(best) ? ring : best;
	}, null);
	if (!outerRing) return false;
	if (!pointInRing(point, outerRing)) return false;
	// Treat all other rings as holes.
	for (const ring of polygon) {
		if (ring === outerRing) continue;
		if (ring?.length && pointInRing(point, ring)) return false;
	}
	return true;
};

const pointInMultiPolygon = (
	point: ClippingCoord,
	multiPolygon: ClippingMultiPolygon
): boolean => {
	for (const polygon of multiPolygon) {
		if (pointInClippingPolygon(point, polygon)) return true;
	}
	return false;
};

// State badge colors matching dashboard
const stateBadgeColorMap: Record<string, string> = {
	AL: '#E57373',
	AK: '#64B5F6',
	AZ: '#FFD54F',
	AR: '#81C784',
	CA: '#BA68C8',
	CO: '#4DD0E1',
	CT: '#FF8A65',
	DE: '#A1887F',
	FL: '#4DB6AC',
	GA: '#7986CB',
	HI: '#F06292',
	ID: '#AED581',
	IL: '#FFB74D',
	IN: '#90A4AE',
	IA: '#DCE775',
	KS: '#FFF176',
	KY: '#4FC3F7',
	LA: '#CE93D8',
	ME: '#80CBC4',
	MD: '#FFCC80',
	MA: '#B39DDB',
	MI: '#80DEEA',
	MN: '#C5E1A5',
	MS: '#EF9A9A',
	MO: '#BCAAA4',
	MT: '#B0BEC5',
	NE: '#E6EE9C',
	NV: '#FFE082',
	NH: '#81D4FA',
	NJ: '#F48FB1',
	NM: '#FFAB91',
	NY: '#9FA8DA',
	NC: '#A5D6A7',
	ND: '#CFD8DC',
	OH: '#FFF59D',
	OK: '#FF8A80',
	OR: '#80CBC4',
	PA: '#EA80FC',
	RI: '#8C9EFF',
	SC: '#FFCDD2',
	SD: '#E1BEE7',
	TN: '#DCEDC8',
	TX: '#FFE0B2',
	UT: '#B2EBF2',
	VT: '#C8E6C9',
	VA: '#D1C4E9',
	WA: '#B2DFDB',
	WV: '#FFE57F',
	WI: '#F8BBD9',
	WY: '#FFCCBC',
	DC: '#E0E0E0',
};

// Helper to get state abbreviation
const getStateAbbreviation = (state: string): string | null => {
	if (!state) return null;
	const upper = state.toUpperCase().trim();
	if (upper.length === 2 && stateBadgeColorMap[upper]) return upper;
	const stateMap: Record<string, string> = {
		ALABAMA: 'AL',
		ALASKA: 'AK',
		ARIZONA: 'AZ',
		ARKANSAS: 'AR',
		CALIFORNIA: 'CA',
		COLORADO: 'CO',
		CONNECTICUT: 'CT',
		DELAWARE: 'DE',
		FLORIDA: 'FL',
		GEORGIA: 'GA',
		HAWAII: 'HI',
		IDAHO: 'ID',
		ILLINOIS: 'IL',
		INDIANA: 'IN',
		IOWA: 'IA',
		KANSAS: 'KS',
		KENTUCKY: 'KY',
		LOUISIANA: 'LA',
		MAINE: 'ME',
		MARYLAND: 'MD',
		MASSACHUSETTS: 'MA',
		MICHIGAN: 'MI',
		MINNESOTA: 'MN',
		MISSISSIPPI: 'MS',
		MISSOURI: 'MO',
		MONTANA: 'MT',
		NEBRASKA: 'NE',
		NEVADA: 'NV',
		'NEW HAMPSHIRE': 'NH',
		'NEW JERSEY': 'NJ',
		'NEW MEXICO': 'NM',
		'NEW YORK': 'NY',
		'NORTH CAROLINA': 'NC',
		'NORTH DAKOTA': 'ND',
		OHIO: 'OH',
		OKLAHOMA: 'OK',
		OREGON: 'OR',
		PENNSYLVANIA: 'PA',
		'RHODE ISLAND': 'RI',
		'SOUTH CAROLINA': 'SC',
		'SOUTH DAKOTA': 'SD',
		TENNESSEE: 'TN',
		TEXAS: 'TX',
		UTAH: 'UT',
		VERMONT: 'VT',
		VIRGINIA: 'VA',
		WASHINGTON: 'WA',
		'WEST VIRGINIA': 'WV',
		WISCONSIN: 'WI',
		WYOMING: 'WY',
		'DISTRICT OF COLUMBIA': 'DC',
	};
	return stateMap[upper] || null;
};

// Parse metadata sections [1], [2], etc.
// Returns sections if at least 1 valid section exists (more lenient than dashboard's 3)
const parseMetadataSections = (
	metadata: string | null | undefined
): Record<string, string> => {
	if (!metadata) return {};
	const allSections: Record<string, string> = {};
	const regex = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
	let match;
	while ((match = regex.exec(metadata)) !== null) {
		allSections[match[1]] = match[2].trim();
	}
	const sections: Record<string, string> = {};
	let expectedNum = 1;
	while (allSections[String(expectedNum)]) {
		const content = allSections[String(expectedNum)];
		const meaningfulContent = content.replace(/[.\s,;:!?'"()\-–—]/g, '').trim();
		if (meaningfulContent.length < 5) break;
		sections[String(expectedNum)] = content;
		expectedNum++;
	}
	// Return sections if we have at least 1 valid section
	return Object.keys(sections).length >= 1 ? sections : {};
};

interface SearchResultsMapProps {
	contacts: ContactWithName[];
	selectedContacts: number[];
	/** When set, highlights the corresponding marker as hovered (e.g. hovering a row in the map results panel). */
	externallyHoveredContactId?: number | null;
	/** Full search query string (e.g. "[Booking] Music Venues (Portland, ME)") */
	searchQuery?: string | null;
	/** Used to color the default (unselected) result dots by the active "What" search value. */
	searchWhat?: string | null;
	/** When set, shows a persistent outline of the selected search area. */
	selectedAreaBounds?: MapSelectionBounds | null;
	/**
	 * Called as soon as the user starts interacting with the viewport (drag/zoom).
	 * Useful for dismissing transient UI (e.g. "Search this area" CTA).
	 */
	onViewportInteraction?: () => void;
	/**
	 * Called when the viewport becomes idle after panning/zooming (Mapbox `moveend`).
	 * Useful for syncing viewport-derived state in the parent.
	 */
	onViewportIdle?: (payload: {
		bounds: MapSelectionBounds;
		center: LatLngLiteral;
		zoom: number;
		isCenterInSearchArea: boolean;
	}) => void;
	/** Dashboard/tooling mode (e.g. `"select"` enables rectangle selection). */
	activeTool?: string | null;
	/** Changes when the dashboard triggers "select all in view". */
	selectAllInViewNonce?: number;

	onAreaSelect?: (bounds: MapSelectionBounds, payload?: AreaSelectPayload) => void;
	
	onVisibleOverlayContactsChange?: (contacts: ContactWithName[]) => void;
	onMarkerClick?: (contact: ContactWithName) => void;
	onMarkerHover?: (contact: ContactWithName | null, meta?: MarkerHoverMeta) => void;
	onToggleSelection?: (contactId: number) => void;
	onStateSelect?: (stateName: string) => void;
	enableStateInteractions?: boolean;
	lockedStateName?: string | null;
	/** When true, hides the state outlines (useful while search is loading). */
	isLoading?: boolean;
	/**
	 * When true, disables the base-dot "wave reveal" animation.
	 * Useful in fullscreen/cinematic map transitions where hiding dots causes visible flicker.
	 */
	disableDotWaveReveal?: boolean;
	/** When true, prevents the map from auto-zooming to fit contacts or the locked state. */
	skipAutoFit?: boolean;
	/**
	 * Controls whether the map should behave like a decorative dashboard background (no interactions,
	 * optional auto-rotation), or the full interactive results map.
	 */
	presentation?: 'background' | 'interactive';
	/** When true (and `presentation="background"`), auto-rotate the globe. */
	autoSpin?: boolean;
}

const defaultCenter = {
	lat: 39.8283, // Center of US
	lng: -98.5795,
};

const MAP_DEFAULT_ZOOM = 5;
// Let users zoom out further than the default US-wide view.
const MAP_MIN_ZOOM = 3;
// Dashboard UX: allow state hover highlight one zoom step past the default zoom.
const STATE_HOVER_HIGHLIGHT_MAX_ZOOM = MAP_DEFAULT_ZOOM + 1;

const AUTO_FIT_CONTACTS_MAX_ZOOM = 10;
const AUTO_FIT_STATE_MAX_ZOOM = 5;
const DEFAULT_MAX_ZOOM_FALLBACK = 22;

export const DASHBOARD_TO_INTERACTIVE_TRANSITION_MS = 7200;
export const DASHBOARD_TO_INTERACTIVE_TRANSITION_CSS_EASING =
	'cubic-bezier(0.22, 1, 0.36, 1)';

const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';

const applyFreeTrialMapVisualTuning = (mapInstance: mapboxgl.Map) => {
	// Projection
	try {
		mapInstance.setProjection({ name: 'globe' } as any);
	} catch {
		// Non-fatal.
	}

	// Fog / atmosphere (subtle glow)
	try {
		const existingFog = (mapInstance as any).getFog?.() ?? {};
		(mapInstance as any).setFog?.({
			...existingFog,
			color: 'rgb(0, 0, 0)',
			'high-color': 'rgb(0, 0, 0)',
			'space-color': 'rgb(0, 0, 0)',
			'star-intensity': 0.9,
			'horizon-blend': 0,
		});
	} catch {
		// Non-fatal.
	}

	// Basemap layer cleanup (hide words + borders; keep our layers)
	try {
		const style = mapInstance.getStyle();
		for (const layer of style.layers ?? []) {
			const id = (layer as any)?.id as string | undefined;
			if (!id) continue;
			if (id.startsWith('murmur-')) continue;

			// Text/icon labels
			if ((layer as any).type === 'symbol') {
				mapInstance.setLayoutProperty(id, 'visibility', 'none');
				continue;
			}

			// Political/administrative boundaries (borders)
			const idLower = id.toLowerCase();
			if (
				(layer as any).type === 'line' &&
				(idLower.includes('admin') ||
					idLower.includes('boundary') ||
					idLower.includes('border'))
			) {
				mapInstance.setLayoutProperty(id, 'visibility', 'none');
			}
		}
	} catch {
		// Non-fatal.
	}
};

// Performance: the `within` filter is helpful when zoomed out (to hide Canada/Mexico labels/roads),
// but it adds overhead at high zoom where there are many more road/label features.
// Only apply the US-only basemap clipping up to this zoom level.
const US_ONLY_BASEMAP_CLIP_MAX_ZOOM = 7;

const MAPBOX_SOURCE_IDS = {
	states: 'murmur-states',
	resultsOutline: 'murmur-results-outline',
	lockedOutline: 'murmur-locked-outline',
	selectionRect: 'murmur-selection-rect',
	selectedAreaRect: 'murmur-selected-area-rect',
	markersBase: 'murmur-markers-base',
	markersPromotionDot: 'murmur-markers-promo-dot',
	markersAllOverlay: 'murmur-markers-all-overlay',
	markersPromotionPin: 'murmur-markers-promo-pin',
	markersBookingPin: 'murmur-markers-booking-pin',
	stateLabels: 'murmur-state-labels',
} as const;

const MAPBOX_LAYER_IDS = {
	// States
	statesFillHit: 'murmur-states-fill-hit',
	statesFillHover: 'murmur-states-fill-hover',
	statesDividers: 'murmur-states-dividers',
	statesBordersInteractive: 'murmur-states-borders-interactive',
	statesLabels: 'murmur-states-labels',
	// Outlines
	resultsOutline: 'murmur-results-outline-line',
	lockedOutline: 'murmur-locked-outline-line',
	// Markers (hit layers are used for hover/click priority)
	markersAllHit: 'murmur-markers-all-hit',
	markersAllDots: 'murmur-markers-all-dots',
	promotionPinHit: 'murmur-promo-pin-hit',
	promotionPinIcons: 'murmur-promo-pin-icons',
	bookingPinHit: 'murmur-booking-pin-hit',
	bookingPinIcons: 'murmur-booking-pin-icons',
	bookingPinIconsHover: 'murmur-booking-pin-icons-hover',
	promotionDotHit: 'murmur-promo-dot-hit',
	promotionDotDots: 'murmur-promo-dot-dots',
	baseHit: 'murmur-base-hit',
	baseDots: 'murmur-base-dots',
	// Rectangles
	selectedAreaRect: 'murmur-selected-area-rect-line',
	selectionRectFill: 'murmur-selection-rect-fill',
	selectionRectLine: 'murmur-selection-rect-line',
} as const;

// --- Dot reveal animation (search results) ---
// Compute a per-dot reveal delay (ms) based on longitude so dots fade in as a smooth left→right wave.
// We drive the animation by updating a single paint expression over time.
const DOT_WAVE_DELAY_PROP = '__murmurWaveDelayMs';
const DOT_WAVE_TRAVEL_MS_MIN = 900;
const DOT_WAVE_TRAVEL_MS_MAX = 1600;
// Each dot fades up over this duration once the wave reaches it.
// A wide band means many dots coexist at different partial opacities, so no visible "edge".
const DOT_WAVE_FADE_MS = 1200;
// Per-dot jitter range (ms). Large enough to separate dots at the same longitude into
// individually-timed reveals rather than batches that pop in together.
const DOT_WAVE_JITTER_MS = 350;
// Throttle paint updates (~60fps) for smoothness.
const DOT_WAVE_FRAME_MS = 16;
// Mapbox transition duration between throttled paint updates. Keep short so individual dot
// timings stay crisp rather than being temporally blurred into batches.
const DOT_WAVE_SMOOTH_TRANSITION_MS = 25;
// Ease-out curve for per-dot opacity ramp. Dots gently emerge then settle into full opacity.
const DOT_WAVE_EASING: any = ['cubic-bezier', 0.33, 0, 0.2, 1];

type DotWaveMeta = {
	maxDelayMs: number;
};

const computeDotWaveTravelMs = (featureCount: number): number => {
	if (!Number.isFinite(featureCount) || featureCount <= 0) return DOT_WAVE_TRAVEL_MS_MIN;
	const raw = 800 + Math.sqrt(featureCount) * 22;
	return clamp(Math.round(raw), DOT_WAVE_TRAVEL_MS_MIN, DOT_WAVE_TRAVEL_MS_MAX);
};

const computeDotWaveDelayMs = (
	featureId: number,
	lng: number,
	lat: number,
	minLng: number,
	maxLng: number,
	minLat: number,
	maxLat: number,
	travelMs: number
): number => {
	const denomLng = maxLng - minLng;
	const tLng =
		!Number.isFinite(denomLng) || denomLng <= 1e-9
			? 0
			: clamp((lng - minLng) / denomLng, 0, 1);

	const denomLat = maxLat - minLat;
	const tLat =
		!Number.isFinite(denomLat) || denomLat <= 1e-9
			? 0.5
			: clamp((lat - minLat) / denomLat, 0, 1);
	const latUndulation = (Math.sin(tLat * Math.PI) - 0.5) * 0.14 * travelMs;

	const h = (featureId * 2654435761) >>> 0;
	const jitter = DOT_WAVE_JITTER_MS > 0 ? ((h & 0xffff) / 0x10000) * DOT_WAVE_JITTER_MS : 0;

	return Math.max(0, tLng * travelMs + latUndulation + jitter);
};

type BasemapCartographyClipState = {
	layerIds: string[];
	originalFilters: Map<string, any | null>;
};

const getBasemapCartographyLayerIds = (mapInstance: mapboxgl.Map): string[] => {
	const layers = mapInstance.getStyle()?.layers ?? [];
	const ids: string[] = [];

	for (const layer of layers as any[]) {
		const id = layer?.id as string | undefined;
		if (!id) continue;
		// Never touch our custom layers.
		if (id.startsWith('murmur-')) continue;

		const type = layer?.type as string | undefined;
		if (type === 'symbol') {
			ids.push(id);
			continue;
		}
		if (type === 'line') {
			// Only clip *roads* (not coastlines/admin boundaries/etc) to avoid extra work.
			const sourceLayer = (layer?.['source-layer'] as string | undefined) ?? '';
			if (sourceLayer === 'road' || id.includes('road')) {
				ids.push(id);
			}
		}
	}

	return ids;
};


const applyUsOnlyBasemapCartography = (
	mapInstance: mapboxgl.Map,
	usGeometry: Extract<GeoJsonGeometry, { type: 'MultiPolygon' }>,
	clipState: BasemapCartographyClipState
) => {
	if (clipState.layerIds.length === 0) {
		clipState.layerIds = getBasemapCartographyLayerIds(mapInstance);
	}

	for (const id of clipState.layerIds) {
		try {
			if (!clipState.originalFilters.has(id)) {
				const original = mapInstance.getFilter(id) as any;
				clipState.originalFilters.set(id, original ?? null);
			}

			const existingFilter = clipState.originalFilters.get(id) as any;
			const withinFilter = ['within', usGeometry] as any;
			const nextFilter = existingFilter
				? (['all', existingFilter, withinFilter] as any)
				: withinFilter;
			mapInstance.setFilter(id, nextFilter);
		} catch {
			// Ignore layers that disappear or can't be mutated.
		}
	}
};

const restoreBasemapCartography = (
	mapInstance: mapboxgl.Map,
	clipState: BasemapCartographyClipState
) => {
	if (clipState.layerIds.length === 0) return;
	for (const id of clipState.layerIds) {
		try {
			if (!clipState.originalFilters.has(id)) continue;
			const original = clipState.originalFilters.get(id) ?? null;
			mapInstance.setFilter(id, original);
		} catch {
			// Ignore.
		}
	}
};

const STATE_PROCESSED_GEOJSON_URL = '/geo/us-states-processed.json';
const STATE_META_URL = '/geo/us-states-meta.json';
const STATE_LABELS_URL = '/geo/us-states-labels.json';
const STATE_OUTLINE_URL = '/geo/us-states-outline.json';
const STATE_PREPARED_POLYGONS_URL = '/geo/us-states-prepared-polygons.json';
const STATE_HIGHLIGHT_COLOR = '#5DAB68';
const STATE_HIGHLIGHT_OPACITY = 0.68;
const STATE_BORDER_COLOR = '#CFD8DC';
// When zoomed out to a US-wide view, show subtle state divider lines (like Zillow).
// Keep these behind the blue/black search-area outlines.
const STATE_DIVIDER_LINES_MAX_ZOOM = 8;

// Marker dot colors by search "What" value (dashboard/drafting search).
const DEFAULT_RESULT_DOT_COLOR = '#D21E1F';
const RESULT_DOT_ZOOM_MIN = 4;
const RESULT_DOT_ZOOM_MAX = 14;
const RESULT_DOT_SCALE_MIN = 3;
const RESULT_DOT_SCALE_MAX = 11;
// Overlay pins look too small when zoomed out; keep their circle readable without
// overpowering the search tray/category icons.
const MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX = 16;
// Stroke weight should be thinner when zoomed out and approach ~3px when zoomed in.
const RESULT_DOT_STROKE_WEIGHT_MIN_PX = 1.5;
const RESULT_DOT_STROKE_WEIGHT_MAX_PX = 3;
const RESULT_DOT_STROKE_COLOR_DEFAULT = '#FFFFFF';
const RESULT_DOT_STROKE_COLOR_SELECTED = '#15C948';
// Fill color for the hover tooltip SVG when the contact is selected.
const TOOLTIP_FILL_COLOR_SELECTED = '#258530';
const BOOKING_EXTRA_PIN_HOVER_STROKE_COLOR = '#000000';

// Keep hover tooltip above all map markers so it never gets covered.
const HOVER_TOOLTIP_Z_INDEX = 1_000_000;
// Minimum zoom level required to trigger hover tooltips and research highlights on markers.
// Below this zoom level, markers are too dense and small for hover interactions to be useful.
const HOVER_INTERACTION_MIN_ZOOM = 8;
const BOOKING_EXTRA_MARKERS_MIN_ZOOM = 8;
// Keep extra markers capped so map remains responsive.
const BOOKING_EXTRA_MARKERS_MAX_DOTS = 160;
// Promotion searches: show state-wide radio list pins as overlay markers.
// Match booking's zoom threshold for consistent UX across modes.
const PROMOTION_OVERLAY_MARKERS_MIN_ZOOM = 8;
// Defensive cap; expected to be ~2 per state.
const PROMOTION_OVERLAY_MARKERS_MAX_PINS = 220;

// "All contacts" gray-dot overlay: only show when zoomed in *extremely* close.
const ALL_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM = 18;
const ALL_CONTACTS_OVERLAY_LIMIT = 2000;
const ALL_CONTACTS_OVERLAY_DOT_FILL_COLOR = '#9CA3AF';
const ALL_CONTACTS_OVERLAY_TOOLTIP_FILL_COLOR = '#6B7280';

const BOOKING_EXTRA_TITLE_PREFIXES = [
	'Music Venues',
	'Coffee Shops',
	'Restaurants',
	'Music Festivals',
	'Breweries',
	'Wineries',
	'Wedding Planners',
	'Wedding Venues',
	// Also supported by the booking search backend; include if present.
	'Distilleries',
	'Cideries',
] as const;

const PROMOTION_OVERLAY_TITLE_PREFIXES = ['Radio Stations', 'College Radio'] as const;

const startsWithCaseInsensitive = (
	value: string | null | undefined,
	prefix: string
): boolean => {
	if (!value) return false;
	const p = prefix.trim().toLowerCase();
	if (!p) return false;
	return value.trim().toLowerCase().startsWith(p);
};

const getBookingTitlePrefixFromContactTitle = (
	title: string | null | undefined
): string | null => {
	if (!title) return null;
	for (const prefix of BOOKING_EXTRA_TITLE_PREFIXES) {
		if (startsWithCaseInsensitive(title, prefix)) return prefix;
	}
	return null;
};

const isPromotionOverlayListTitle = (title: string | null | undefined): boolean => {
	if (!title) return false;
	return PROMOTION_OVERLAY_TITLE_PREFIXES.some((p) =>
		startsWithCaseInsensitive(title, p)
	);
};

// Promotion overlay pins should use the Radio Stations visual language (icon + color).
const getPromotionOverlayWhatFromContactTitle = (
	title: string | null | undefined
): string | null => (isPromotionOverlayListTitle(title) ? 'Radio Stations' : null);

type SearchMode = 'booking' | 'promotion';

const extractSearchModeFromQueryPrefix = (
	query: string | null | undefined
): SearchMode | null => {
	const s = (query ?? '').trim().toLowerCase();
	if (s.startsWith('[booking]')) return 'booking';
	if (s.startsWith('[promotion]')) return 'promotion';
	return null;
};

// When the query string no longer embeds "[Booking]"/"[Promotion]", infer mode from the
// dashboard's structured "What" input so overlays + pin styling behave the same.
const inferSearchModeFromSearchWhat = (
	searchWhat: string | null | undefined
): SearchMode | null => {
	const w = (searchWhat ?? '').trim().toLowerCase();
	if (!w) return null;

	// Promotion modes (radio outreach)
	if (w.includes('radio station') || w.includes('radio stations') || w.includes('college radio')) {
		return 'promotion';
	}

	// Booking modes (venues/restaurants/etc.)
	if (
		w === 'venues' ||
		w === 'venue' ||
		w.includes('music venue') ||
		w.includes('restaurant') ||
		w.includes('coffee shop') ||
		w === 'festivals' ||
		w === 'festival' ||
		w.includes('music festival') ||
		w.includes('brewery') ||
		w.includes('winery') ||
		w.includes('distillery') ||
		w.includes('cidery') ||
		w.includes('wedding planner') ||
		w.includes('wedding venue') ||
		w.includes('wine, beer') ||
		w.includes('wine beer')
	) {
		return 'booking';
	}

	return null;
};
const normalizeWhatKey = (value: string): string =>
	value
		.trim()
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');

// Booking overlay "alcohol" subcategories should be treated as part of the broader
// "Wine, Beer, and Spirits" search "What" (even though the overlay titles are
// "Wineries <state>", "Breweries <state>", etc).
const WINE_BEER_SPIRITS_WHAT_KEY = normalizeWhatKey('Wine, Beer, and Spirits');
const WINE_BEER_SPIRITS_BOOKING_PREFIX_KEYS = new Set<string>([
	normalizeWhatKey('Wineries'),
	normalizeWhatKey('Breweries'),
	normalizeWhatKey('Distilleries'),
	normalizeWhatKey('Cideries'),
]);

const bookingTitlePrefixMatchesSearchWhatKey = (
	prefix: string,
	normalizedSearchWhatKey: string
): boolean => {
	const prefixKey = normalizeWhatKey(prefix);
	if (prefixKey === normalizedSearchWhatKey) return true;
	if (
		normalizedSearchWhatKey === WINE_BEER_SPIRITS_WHAT_KEY &&
		WINE_BEER_SPIRITS_BOOKING_PREFIX_KEYS.has(prefixKey)
	) {
		return true;
	}
	return false;
};

const WHAT_TO_RESULT_DOT_COLOR: Record<string, string> = {
	[normalizeWhatKey('Radio Stations')]: '#56DA73',
	[normalizeWhatKey('Venues')]: '#00CBFB',
	[normalizeWhatKey('Music Venues')]: '#00CBFB',
	[normalizeWhatKey('Festivals')]: '#2D27DC',
	[normalizeWhatKey('Music Festivals')]: '#2D27DC',
	[normalizeWhatKey('Restaurants')]: '#1EA300',
	[normalizeWhatKey('Coffee Shops')]: '#8BD003',
	[normalizeWhatKey('Wedding Planners')]: '#D6990A',
	[normalizeWhatKey('Wine Beer and spirits')]: '#981AEC',
	[normalizeWhatKey('Wine, Beer, and Spirits')]: '#981AEC',
	[normalizeWhatKey('Wine, Beer, Spirits')]: '#981AEC',
	// Booking extras: map alcohol-related categories to the Wine/Beer/Spirits palette.
	[normalizeWhatKey('Breweries')]: '#981AEC',
	[normalizeWhatKey('Wineries')]: '#981AEC',
	[normalizeWhatKey('Distilleries')]: '#981AEC',
	[normalizeWhatKey('Cideries')]: '#981AEC',
	// Booking extras: show wedding venues with the same palette as wedding planners.
	[normalizeWhatKey('Wedding Venues')]: '#D6990A',
};

// Hover tooltip (SVG bubble) fill colors by search "What" value.
// These are intentionally allowed to differ from the dot colors.
const WHAT_TO_HOVER_TOOLTIP_FILL_COLOR: Record<string, string> = {
	// Promotion: match the search tray palette.
	[normalizeWhatKey('Radio Stations')]: '#56DA73',
	// Music venues should be a lighter blue on hover.
	[normalizeWhatKey('Venues')]: '#71C9FD',
	[normalizeWhatKey('Music Venues')]: '#71C9FD',

	// Wine/beer/spirits should be periwinkle on hover.
	[normalizeWhatKey('Wine, Beer, and Spirits')]: '#80AAFF',
	[normalizeWhatKey('Wine, Beer, Spirits')]: '#80AAFF',
	[normalizeWhatKey('Wine Beer and Spirits')]: '#80AAFF',
	[normalizeWhatKey('Wine Beer Spirits')]: '#80AAFF',
	// Defensive: handle a misspelling we've seen in copy.
	[normalizeWhatKey('Wine, Beer, and Spiriti')]: '#80AAFF',
	[normalizeWhatKey('Wine Beer and Spiriti')]: '#80AAFF',
	[normalizeWhatKey('Wine Beer Spiriti')]: '#80AAFF',

	// Keep existing behavior for festivals.
	[normalizeWhatKey('Festivals')]: '#80AAFF',
	[normalizeWhatKey('Music Festivals')]: '#80AAFF',
};

const getResultDotColorForWhat = (searchWhat?: string | null): string => {
	if (!searchWhat) return DEFAULT_RESULT_DOT_COLOR;
	const key = normalizeWhatKey(searchWhat);
	return WHAT_TO_RESULT_DOT_COLOR[key] ?? DEFAULT_RESULT_DOT_COLOR;
};

const getResultDotTForZoom = (zoom: number): number => {
	const clampedZoom = clamp(zoom, RESULT_DOT_ZOOM_MIN, RESULT_DOT_ZOOM_MAX);
	return (
		(clampedZoom - RESULT_DOT_ZOOM_MIN) / (RESULT_DOT_ZOOM_MAX - RESULT_DOT_ZOOM_MIN)
	);
};

const getResultDotScaleForZoom = (zoom: number): number => {
	const t = getResultDotTForZoom(zoom);
	return RESULT_DOT_SCALE_MIN + t * (RESULT_DOT_SCALE_MAX - RESULT_DOT_SCALE_MIN);
};

const getResultDotStrokeWeightForZoom = (zoom: number): number => {
	const t = getResultDotTForZoom(zoom);
	return (
		RESULT_DOT_STROKE_WEIGHT_MIN_PX +
		t * (RESULT_DOT_STROKE_WEIGHT_MAX_PX - RESULT_DOT_STROKE_WEIGHT_MIN_PX)
	);
};

// When very zoomed out, we want the searched/locked state to visually "win" so the user
// can understand where the bulk of results are. As you zoom in, we ease back toward a
// more natural distribution.
const LOCKED_STATE_MARKER_BIAS_ZOOM_START = RESULT_DOT_ZOOM_MIN; // 4
const LOCKED_STATE_MARKER_BIAS_ZOOM_END = STATE_DIVIDER_LINES_MAX_ZOOM; // 8
const LOCKED_STATE_MARKER_BIAS_SHARE_MAX = 0.92; // at zoom ~4
const LOCKED_STATE_MARKER_BIAS_SHARE_MIN = 0.6; // by zoom ~8

const getLockedStateMarkerShareForZoom = (zoom: number): number => {
	const denom = LOCKED_STATE_MARKER_BIAS_ZOOM_END - LOCKED_STATE_MARKER_BIAS_ZOOM_START;
	if (!Number.isFinite(denom) || denom <= 0) return LOCKED_STATE_MARKER_BIAS_SHARE_MIN;
	const t = clamp((zoom - LOCKED_STATE_MARKER_BIAS_ZOOM_START) / denom, 0, 1);
	return (
		LOCKED_STATE_MARKER_BIAS_SHARE_MAX +
		t * (LOCKED_STATE_MARKER_BIAS_SHARE_MIN - LOCKED_STATE_MARKER_BIAS_SHARE_MAX)
	);
};

// When a search/locked state is active, de-emphasize out-of-state markers by making them
// look like they'd be at 50% opacity on a white background (but keep fillOpacity=1).
const OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE = 0.5;

type RgbColor = { r: number; g: number; b: number };

const parseHexColor = (hex: string): RgbColor | null => {
	const trimmed = hex.trim();
	if (!trimmed.startsWith('#')) return null;
	const raw = trimmed.slice(1);
	const isShort = raw.length === 3;
	const isLong = raw.length === 6;
	if (!isShort && !isLong) return null;

	const expand = (c: string) => `${c}${c}`;
	const rHex = isShort ? expand(raw[0]!) : raw.slice(0, 2);
	const gHex = isShort ? expand(raw[1]!) : raw.slice(2, 4);
	const bHex = isShort ? expand(raw[2]!) : raw.slice(4, 6);

	const r = Number.parseInt(rHex, 16);
	const g = Number.parseInt(gHex, 16);
	const b = Number.parseInt(bHex, 16);
	if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
	return { r, g, b };
};

const toHexByte = (n: number): string => {
	const clamped = clamp(Math.round(n), 0, 255);
	return clamped.toString(16).padStart(2, '0').toUpperCase();
};

const washOutHexColor = (hex: string, mixToWhite: number): string => {
	const rgb = parseHexColor(hex);
	if (!rgb) return hex;
	const t = clamp(mixToWhite, 0, 1);

	// Blend toward white → lighter and less saturated (pastel).
	const r = rgb.r + (255 - rgb.r) * t;
	const g = rgb.g + (255 - rgb.g) * t;
	const b = rgb.b + (255 - rgb.b) * t;

	return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
};

const hashStringToStableKey = (input: string): string => {
	// Small deterministic hash for cache keys / image ids.
	// (Not cryptographically secure; just stable and fast.)
	let hash = 5381;
	for (let i = 0; i < input.length; i++) {
		hash = (hash * 33) ^ input.charCodeAt(i);
	}
	return (hash >>> 0).toString(36);
};

const scaleMapboxOpacityExpr = (expr: any, mul: number): any => {
	if (typeof expr === 'number') return expr * mul;
	if (!Array.isArray(expr) || expr.length === 0) return expr;

	const op = expr[0];

	if (op === 'interpolate') {
		// ['interpolate', method, input, z1, v1, z2, v2, ...]
		const result = [...expr];
		for (let i = 4; i < result.length; i += 2) {
			result[i] = scaleMapboxOpacityExpr(result[i], mul);
		}
		return result;
	}

	if (op === 'step') {
		// ['step', input, defaultVal, z1, v1, z2, v2, ...]
		const result = [...expr];
		result[2] = scaleMapboxOpacityExpr(result[2], mul);
		for (let i = 4; i < result.length; i += 2) {
			result[i] = scaleMapboxOpacityExpr(result[i], mul);
		}
		return result;
	}

	if (op === 'case') {
		// ['case', cond1, val1, cond2, val2, ..., fallback]
		const result = [...expr];
		for (let i = 2; i < result.length - 1; i += 2) {
			result[i] = scaleMapboxOpacityExpr(result[i], mul);
		}
		result[result.length - 1] = scaleMapboxOpacityExpr(result[result.length - 1], mul);
		return result;
	}

	return expr;
};

const normalizeStateKey = (state?: string | null): string | null => {
	if (!state) return null;
	const abbr = getStateAbbreviation(state);
	if (abbr) return abbr;
	return state.trim().toUpperCase();
};

export const SearchResultsMap: FC<SearchResultsMapProps> = ({
	contacts,
	selectedContacts,
	externallyHoveredContactId,
	searchQuery,
	searchWhat,
	selectedAreaBounds,
	onViewportInteraction,
	onViewportIdle,
	activeTool,
	selectAllInViewNonce,
	onAreaSelect,
	onVisibleOverlayContactsChange,
	onMarkerClick,
	onMarkerHover,
	onToggleSelection,
	onStateSelect,
	enableStateInteractions,
	lockedStateName,
	isLoading,
	disableDotWaveReveal = false,
	skipAutoFit,
	presentation = 'interactive',
	autoSpin = false,
}) => {
	const isBackgroundPresentation = presentation === 'background';
	const shouldAutoSpin = isBackgroundPresentation && autoSpin;
	// Keep the latest presentation value available to async Mapbox callbacks (moveend, etc).
	const presentationRef = useRef<'background' | 'interactive'>(presentation);
	presentationRef.current = presentation;

	// Default to enabling state hover/click when a handler is provided.
	// This mirrors the old Google Maps UX (hover highlight + click-to-search) without requiring
	// every caller to pass an explicit `enableStateInteractions` flag.
	const stateInteractionsEnabled =
		enableStateInteractions ?? typeof onStateSelect === 'function';

	// Smooth fade for state overlays (borders + labels) when switching presentations.
	// This prevents the "pause then pop" feeling when transitioning from the decorative globe
	// into the interactive results map.
	const stateOverlayOpacityRef = useRef<number>(0);
	// 0 = divider lines, 1 = interactive borders
	const stateOverlayModeRef = useRef<number>(stateInteractionsEnabled ? 1 : 0);
	const stateOverlayAnimRafRef = useRef<number | null>(null);
	const prevIsBackgroundPresentationRef = useRef<boolean>(isBackgroundPresentation);
	// Capture the base Mapbox paint values once, then we apply a multiplier for fading.
	const stateLineOpacityBaseRef = useRef<{ dividers: any; borders: any } | null>(null);

	const [selectedMarker, setSelectedMarker] = useState<ContactWithName | null>(null);
	const [hoveredMarkerId, setHoveredMarkerId] = useState<number | null>(null);
	const hoveredMarkerIdRef = useRef<number | null>(null);
	const hoverSourceRef = useRef<'map' | 'external' | null>(null);
	// Track tooltip that is fading out (for smooth transition)
	const [fadingTooltipId, setFadingTooltipId] = useState<number | null>(null);
	const fadingTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const [map, setMap] = useState<mapboxgl.Map | null>(null);
	const [isMapLoaded, setIsMapLoaded] = useState(false);
	const initialZoomConstraintsRef = useRef<{ minZoom: number; maxZoom: number } | null>(
		null
	);
	const backgroundSpinCleanupRef = useRef<(() => void) | null>(null);
	const [mapLoadError, setMapLoadError] = useState<string | null>(null);
	const [selectedStateKey, setSelectedStateKey] = useState<string | null>(null);
	const [zoomLevel, setZoomLevel] = useState(MAP_DEFAULT_ZOOM);
	const [visibleContacts, setVisibleContacts] = useState<ContactWithName[]>([]);
	// Keep a "sticky" set of currently-rendered marker ids so zooming can rescale existing markers
	// and only introduce *new* markers, instead of re-sampling a totally different set each time.
	const visibleContactIdSetRef = useRef<Set<number>>(new Set());
	const [bookingExtraVisibleContacts, setBookingExtraVisibleContacts] = useState<
		ContactWithName[]
	>([]);
	const bookingExtraVisibleIdSetRef = useRef<Set<number>>(new Set());
	const lastBookingExtraVisibleContactsKeyRef = useRef<string>('');
	const lastBookingExtraFetchKeyRef = useRef<string>('');
	const [bookingExtraFetchBbox, setBookingExtraFetchBbox] = useState<BoundingBox | null>(
		null
	);
	const [promotionOverlayVisibleContacts, setPromotionOverlayVisibleContacts] = useState<
		ContactWithName[]
	>([]);
	const lastPromotionOverlayVisibleContactsKeyRef = useRef<string>('');
	const lastPromotionOverlayFetchKeyRef = useRef<string>('');
	const [promotionOverlayFetchBbox, setPromotionOverlayFetchBbox] =
		useState<BoundingBox | null>(null);

	// High-zoom "all contacts" overlay (gray dots)
	const [allContactsOverlayVisibleContacts, setAllContactsOverlayVisibleContacts] =
		useState<ContactWithName[]>([]);
	const allContactsOverlayVisibleIdSetRef = useRef<Set<number>>(new Set());
	const lastAllContactsOverlayVisibleContactsKeyRef = useRef<string>('');
	const lastAllContactsOverlayFetchKeyRef = useRef<string>('');
	const [allContactsOverlayFetchBbox, setAllContactsOverlayFetchBbox] =
		useState<BoundingBox | null>(null);
	// Rectangle selection state (dashboard map select tool)
	const [isAreaSelecting, setIsAreaSelecting] = useState(false);
	const selectionStartLatLngRef = useRef<LatLngLiteral | null>(null);
	const selectionStartClientRef = useRef<{ x: number; y: number } | null>(null);
	const selectionBoundsRef = useRef<MapSelectionBounds | null>(null);
	const lastSelectAllInViewNonceRef = useRef<number>(0);
	// Timeout ref for auto-hiding research panel
	const researchPanelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	// Small delay when moving between marker layers (prevents hover flicker)
	const hoverClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	// US state geometry for outlines, hover/click selection, and point-in-polygon checks.
	const usStatesGeoJsonRef = useRef<GeoJsonFeatureCollection | null>(null);
	const usStatesByKeyRef = useRef<
		Map<
			string,
			{
				key: string;
				name: string;
				geometry: GeoJsonGeometry;
				multiPolygon: ClippingMultiPolygon;
				bbox: BoundingBox | null;
			}
		>
	>(new Map());
	const hoveredStateIdRef = useRef<string | number | null>(null);
	const usBasemapClipGeometryRef = useRef<Extract<
		GeoJsonGeometry,
		{ type: 'MultiPolygon' }
	> | null>(null);
	const usBasemapClipMultiPolygonRef = useRef<ClippingMultiPolygon | null>(null);
	const basemapCartographyClipStateRef = useRef<BasemapCartographyClipState>({
		layerIds: [],
		originalFilters: new Map(),
	});
	const isUsBasemapClipActiveRef = useRef(false);
	const lockedStateSelectionMultiPolygonRef = useRef<ClippingMultiPolygon | null>(null);
	const lockedStateSelectionBboxRef = useRef<BoundingBox | null>(null);
	const lockedStateSelectionKeyRef = useRef<string | null>(null);
	const resultsSelectionMultiPolygonRef = useRef<ClippingMultiPolygon | null>(null);
	const resultsSelectionBboxRef = useRef<BoundingBox | null>(null);
	const resultsSelectionSignatureRef = useRef<string>('');
	const lastVisibleContactsKeyRef = useRef<string>('');
	const usStatesPolygonsRef = useRef<PreparedClippingPolygon[] | null>(null);
	const selectedStateKeyRef = useRef<string | null>(null);
	const onStateSelectRef = useRef<SearchResultsMapProps['onStateSelect'] | null>(null);

	const pendingStateClickCinematicRef = useRef<{ key: string; at: number } | null>(null);
	
	const pendingSearchQueryCinematicRef = useRef<{ key: string; at: number } | null>(null);
	const isLoadingRef = useRef<boolean>(false);
	// Keep `isLoadingRef` synced during render so async Mapbox handlers can read it immediately.
	isLoadingRef.current = isLoading ?? false;

	const stateClickZoomInFlightRef = useRef(false);
	const stateClickZoomInFlightNonceRef = useRef(0);
	const stateClickZoomInFlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [isStateLayerReady, setIsStateLayerReady] = useState(false);

	useEffect(() => {
		void ensureWasmGeoModuleLoaded();
	}, []);

	const syncUsOnlyBasemapCartography = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance || !isMapLoaded) return;
			const usGeometry = usBasemapClipGeometryRef.current;
			if (!usGeometry) return;

			const zoom = mapInstance.getZoom() ?? MAP_DEFAULT_ZOOM;
			let shouldClip = zoom <= US_ONLY_BASEMAP_CLIP_MAX_ZOOM + 0.001;

			// When zoomed in, disable the clip as long as the viewport still intersects the US.
			// This avoids paying the `within`-filter cost on dense road/label tiles during normal city-level usage.
			if (!shouldClip) {
				const usPolys = usBasemapClipMultiPolygonRef.current;
				if (usPolys && usPolys.length) {
					try {
						const bounds = mapInstance.getBounds();
						const center = mapInstance.getCenter();
						if (!bounds || !center) {
							shouldClip = true;
						} else {
							const sw = bounds.getSouthWest();
							const ne = bounds.getNorthEast();
							const samples: Array<{ lng: number; lat: number }> = [
								{ lng: center.lng, lat: center.lat },
								{ lng: sw.lng, lat: sw.lat },
								{ lng: ne.lng, lat: ne.lat },
								{ lng: sw.lng, lat: ne.lat },
								{ lng: ne.lng, lat: sw.lat },
							];
							const anyInUs = samples.some((p) =>
								pointInMultiPolygon([p.lng, p.lat], usPolys)
							);
							if (!anyInUs) shouldClip = true;
						}
					} catch {
						shouldClip = true;
					}
				} else {
					shouldClip = true;
				}
			}
			const clipState = basemapCartographyClipStateRef.current;

			if (shouldClip) {
				if (!isUsBasemapClipActiveRef.current) {
					applyUsOnlyBasemapCartography(mapInstance, usGeometry, clipState);
					isUsBasemapClipActiveRef.current = true;
				}
			} else {
				if (isUsBasemapClipActiveRef.current) {
					restoreBasemapCartography(mapInstance, clipState);
					isUsBasemapClipActiveRef.current = false;
				}
			}
		},
		[isMapLoaded]
	);

	const baseContactIdSet = useMemo(
		() => new Set<number>(contacts.map((c) => c.id)),
		[contacts]
	);

	const searchMode = useMemo(
		() =>
			extractSearchModeFromQueryPrefix(searchQuery) ??
			inferSearchModeFromSearchWhat(searchWhat),
		[searchQuery, searchWhat]
	);
	const isBookingSearch = searchMode === 'booking';
	const isPromotionSearch = searchMode === 'promotion';
	const isAnySearch = useMemo(() => Boolean((searchQuery ?? '').trim()), [searchQuery]);
	const onViewportInteractionRef = useRef<
		SearchResultsMapProps['onViewportInteraction'] | null
	>(null);
	const onViewportIdleRef = useRef<SearchResultsMapProps['onViewportIdle'] | null>(null);
	const selectedAreaBoundsRef = useRef<MapSelectionBounds | null>(null);
	useEffect(() => {
		onViewportInteractionRef.current = onViewportInteraction ?? null;
	}, [onViewportInteraction]);
	useEffect(() => {
		onViewportIdleRef.current = onViewportIdle ?? null;
	}, [onViewportIdle]);
	useEffect(() => {
		selectedAreaBoundsRef.current = selectedAreaBounds ?? null;
	}, [selectedAreaBounds]);
	useEffect(() => {
		visibleContactIdSetRef.current = new Set(visibleContacts.map((c) => c.id));
	}, [visibleContacts]);
	useEffect(() => {
		bookingExtraVisibleIdSetRef.current = new Set(
			bookingExtraVisibleContacts.map((c) => c.id)
		);
	}, [bookingExtraVisibleContacts]);
	useEffect(() => {
		allContactsOverlayVisibleIdSetRef.current = new Set(
			allContactsOverlayVisibleContacts.map((c) => c.id)
		);
	}, [allContactsOverlayVisibleContacts]);
	// When hovering a booking "extra" marker, highlight all other visible extra markers
	// of the same booking category (e.g. hover a festival → highlight all festivals in view).

	// Pre-compute id → category for O(1) lookups when resolving the hovered category.
	const bookingExtraIdToCategory = useMemo(() => {
		const m = new Map<number, string>();
		for (const c of bookingExtraVisibleContacts) {
			const cat = getBookingTitlePrefixFromContactTitle(c.title);
			if (cat) m.set(c.id, cat);
		}
		return m;
	}, [bookingExtraVisibleContacts]);

	const hoveredBookingExtraCategory = useMemo(() => {
		if (!isBookingSearch) return null;
		if (hoveredMarkerId == null) return null;
		return bookingExtraIdToCategory.get(hoveredMarkerId) ?? null;
	}, [isBookingSearch, hoveredMarkerId, bookingExtraIdToCategory]);
	useEffect(() => {
		// Reset the overlay fetch window and any visible extra markers on search transitions.
		lastBookingExtraFetchKeyRef.current = '';
		setBookingExtraFetchBbox(null);
		lastBookingExtraVisibleContactsKeyRef.current = '';
		setBookingExtraVisibleContacts([]);
		lastPromotionOverlayFetchKeyRef.current = '';
		setPromotionOverlayFetchBbox(null);
		lastPromotionOverlayVisibleContactsKeyRef.current = '';
		setPromotionOverlayVisibleContacts([]);
		lastAllContactsOverlayFetchKeyRef.current = '';
		setAllContactsOverlayFetchBbox(null);
		lastAllContactsOverlayVisibleContactsKeyRef.current = '';
		setAllContactsOverlayVisibleContacts([]);
	}, [searchQuery]);

	const normalizedSearchWhatKey = useMemo(
		() => (searchWhat ? normalizeWhatKey(searchWhat) : null),
		[searchWhat]
	);

	// Check if the current search is for a specific category (to apply labels to all results)
	const searchWhatLower = searchWhat?.toLowerCase() || '';
	const isMusicVenuesSearch =
		searchWhatLower.includes('music venue') || searchWhatLower.includes('venues');
	const isRestaurantsSearch = searchWhatLower.includes('restaurant');
	const isCoffeeShopsSearch =
		searchWhatLower.includes('coffee shop') || searchWhatLower.includes('coffee shops');
	const isWeddingPlannersSearch = searchWhatLower.includes('wedding planner');

	// Booking/promotion overlay pins can contain multiple "What" categories at once; only surface
	// the ones that match the active search "What" in the dashboard's right-hand panel.
	const visibleOverlayContactsMatchingWhat = useMemo(() => {
		if (!normalizedSearchWhatKey) return [];

		const byId = new Map<number, ContactWithName>();

		if (isBookingSearch && bookingExtraVisibleContacts.length > 0) {
			for (const contact of bookingExtraVisibleContacts) {
				const prefix = getBookingTitlePrefixFromContactTitle(contact.title);
				if (!prefix) continue;
				if (!bookingTitlePrefixMatchesSearchWhatKey(prefix, normalizedSearchWhatKey))
					continue;
				byId.set(contact.id, contact);
			}
		}

		if (isPromotionSearch && promotionOverlayVisibleContacts.length > 0) {
			for (const contact of promotionOverlayVisibleContacts) {
				const title = contact.title ?? '';
				const matchedPrefix =
					PROMOTION_OVERLAY_TITLE_PREFIXES.find((p) =>
						startsWithCaseInsensitive(title, p)
					) ?? null;
				if (!matchedPrefix) continue;
				if (normalizeWhatKey(matchedPrefix) !== normalizedSearchWhatKey) continue;
				byId.set(contact.id, contact);
			}
		}

		const list = Array.from(byId.values());
		list.sort((a, b) => a.id - b.id);
		return list;
	}, [
		normalizedSearchWhatKey,
		isBookingSearch,
		bookingExtraVisibleContacts,
		isPromotionSearch,
		promotionOverlayVisibleContacts,
	]);

	const lastReportedVisibleOverlayKeyRef = useRef<string | null>(null);
	useEffect(() => {
		const idsKey = visibleOverlayContactsMatchingWhat.map((c) => c.id).join(',');
		if (idsKey === lastReportedVisibleOverlayKeyRef.current) return;
		lastReportedVisibleOverlayKeyRef.current = idsKey;
		onVisibleOverlayContactsChange?.(visibleOverlayContactsMatchingWhat);
	}, [onVisibleOverlayContactsChange, visibleOverlayContactsMatchingWhat]);

	const areaSelectionEnabled = useMemo(
		() => activeTool === 'select' && typeof onAreaSelect === 'function',
		[activeTool, onAreaSelect]
	);

	const setPolygonSourceBounds = useCallback(
		(sourceId: string, bounds: MapSelectionBounds | null) => {
			if (!map || !isMapLoaded) return;
			const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
			if (!source) return;
			const data = bounds ? boundsToPolygonFeatureCollection(bounds) : EMPTY_POLYGON_FC;
			source.setData(data as any);
		},
		[map, isMapLoaded]
	);

	const clearSelectionRect = useCallback(() => {
		selectionBoundsRef.current = null;
		setPolygonSourceBounds(MAPBOX_SOURCE_IDS.selectionRect, null);
		selectionStartLatLngRef.current = null;
		selectionStartClientRef.current = null;
		setIsAreaSelecting(false);
	}, [setPolygonSourceBounds]);

	// Persist and display the last selected area (black outline) so it's clear what the current
	// map-scoped search is using.
	useEffect(() => {
		// Hide the persisted rectangle while actively drawing a new one to avoid overlap/confusion.
		if (isAreaSelecting) {
			setPolygonSourceBounds(MAPBOX_SOURCE_IDS.selectedAreaRect, null);
			return;
		}

		if (!map || !isMapLoaded || !selectedAreaBounds) {
			setPolygonSourceBounds(MAPBOX_SOURCE_IDS.selectedAreaRect, null);
			return;
		}

		const { south, west, north, east } = selectedAreaBounds;
		if (
			![south, west, north, east].every(
				(n) => typeof n === 'number' && Number.isFinite(n)
			)
		) {
			return;
		}

		setPolygonSourceBounds(MAPBOX_SOURCE_IDS.selectedAreaRect, {
			south,
			west,
			north,
			east,
		});
	}, [map, isMapLoaded, selectedAreaBounds, isAreaSelecting, setPolygonSourceBounds]);

	// Cancel selection if the tool changes or the map unmounts.
	useEffect(() => {
		if (!areaSelectionEnabled && isAreaSelecting) {
			clearSelectionRect();
		}
	}, [areaSelectionEnabled, isAreaSelecting, clearSelectionRect]);

	useEffect(() => {
		return () => {
			// Defensive cleanup on unmount.
			selectionBoundsRef.current = null;
		};
	}, []);

	// ESC cancels an in-progress selection.
	useEffect(() => {
		if (!isAreaSelecting) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				clearSelectionRect();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [isAreaSelecting, clearSelectionRect]);

	// If the user releases the mouse outside the map, ensure we don't get "stuck" selecting.
	useEffect(() => {
		if (!isAreaSelecting) return;
		// Defer so the map's own mouseup handler can run first.
		const onWindowMouseUp = () => setTimeout(() => clearSelectionRect(), 0);
		window.addEventListener('mouseup', onWindowMouseUp);
		return () => window.removeEventListener('mouseup', onWindowMouseUp);
	}, [isAreaSelecting, clearSelectionRect]);

	const handleMapMouseDown = useCallback(
		(e: mapboxgl.MapMouseEvent) => {
			if (!areaSelectionEnabled) return;

			// Only left-click starts a selection.
			const domEv = e.originalEvent;
			if (domEv.button !== 0) return;

			const start = { lat: e.lngLat.lat, lng: e.lngLat.lng };
			selectionStartLatLngRef.current = start;
			selectionStartClientRef.current = getClientPointFromDomEvent(domEv);
			setIsAreaSelecting(true);

			const bounds: MapSelectionBounds = {
				south: start.lat,
				west: start.lng,
				north: start.lat,
				east: start.lng,
			};
			selectionBoundsRef.current = bounds;
			setPolygonSourceBounds(MAPBOX_SOURCE_IDS.selectionRect, bounds);
		},
		[areaSelectionEnabled, setPolygonSourceBounds]
	);

	const handleMapMouseMove = useCallback(
		(e: mapboxgl.MapMouseEvent) => {
			if (!isAreaSelecting) return;
			const start = selectionStartLatLngRef.current;
			if (!start) return;
			const current = { lat: e.lngLat.lat, lng: e.lngLat.lng };
			const bounds: MapSelectionBounds = {
				south: Math.min(start.lat, current.lat),
				west: Math.min(start.lng, current.lng),
				north: Math.max(start.lat, current.lat),
				east: Math.max(start.lng, current.lng),
			};
			selectionBoundsRef.current = bounds;
			setPolygonSourceBounds(MAPBOX_SOURCE_IDS.selectionRect, bounds);
		},
		[isAreaSelecting, setPolygonSourceBounds]
	);

	const updateBookingExtraFetchBbox = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance) return;

			// Only run for booking-mode searches, and only once the user is zoomed in.
			if (!isBookingSearch) {
				if (lastBookingExtraFetchKeyRef.current !== '') {
					lastBookingExtraFetchKeyRef.current = '';
					setBookingExtraFetchBbox(null);
				}
				return;
			}

			const zoomRaw = mapInstance.getZoom() ?? 4;
			if (zoomRaw < BOOKING_EXTRA_MARKERS_MIN_ZOOM) {
				if (lastBookingExtraFetchKeyRef.current !== '') {
					lastBookingExtraFetchKeyRef.current = '';
					setBookingExtraFetchBbox(null);
				}
				return;
			}

			const bounds = mapInstance.getBounds();
			if (!bounds) return;
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat;
			const west = sw.lng;
			const north = ne.lat;
			const east = ne.lng;

			// Skip antimeridian-crossing viewports (not relevant for our UI).
			if (east < west) return;

			// Pad the fetch bounds so panning within the current view doesn't immediately require refetching.
			const latSpan = north - south;
			const lngSpan = east - west;
			const padLat = latSpan * 0.35;
			const padLng = lngSpan * 0.35;

			const paddedSouth = clamp(south - padLat, -90, 90);
			const paddedWest = clamp(west - padLng, -180, 180);
			const paddedNorth = clamp(north + padLat, -90, 90);
			const paddedEast = clamp(east + padLng, -180, 180);

			// Quantize the fetch window so we don't refetch on tiny pans/zooms.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);
			const qSouth = Math.floor(paddedSouth / quant) * quant;
			const qWest = Math.floor(paddedWest / quant) * quant;
			const qNorth = Math.ceil(paddedNorth / quant) * quant;
			const qEast = Math.ceil(paddedEast / quant) * quant;

			const nextKey = `${zoomKey}|${qSouth.toFixed(4)}|${qWest.toFixed(4)}|${qNorth.toFixed(
				4
			)}|${qEast.toFixed(4)}`;

			if (nextKey === lastBookingExtraFetchKeyRef.current) return;
			lastBookingExtraFetchKeyRef.current = nextKey;
			setBookingExtraFetchBbox({
				minLat: qSouth,
				minLng: qWest,
				maxLat: qNorth,
				maxLng: qEast,
			});
		},
		[isBookingSearch]
	);

	const updatePromotionOverlayFetchBbox = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance) return;

			// Only run for promotion-mode searches.
			if (!isPromotionSearch) {
				if (lastPromotionOverlayFetchKeyRef.current !== '') {
					lastPromotionOverlayFetchKeyRef.current = '';
					setPromotionOverlayFetchBbox(null);
				}
				return;
			}

			const zoomRaw = mapInstance.getZoom() ?? 4;
			if (zoomRaw < PROMOTION_OVERLAY_MARKERS_MIN_ZOOM) {
				if (lastPromotionOverlayFetchKeyRef.current !== '') {
					lastPromotionOverlayFetchKeyRef.current = '';
					setPromotionOverlayFetchBbox(null);
				}
				return;
			}

			const bounds = mapInstance.getBounds();
			if (!bounds) return;
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat;
			const west = sw.lng;
			const north = ne.lat;
			const east = ne.lng;

			// Skip antimeridian-crossing viewports (not relevant for our UI).
			if (east < west) return;

			// Light padding to avoid refetching on small pans.
			const latSpan = north - south;
			const lngSpan = east - west;
			const padLat = latSpan * 0.1;
			const padLng = lngSpan * 0.1;

			const paddedSouth = clamp(south - padLat, -90, 90);
			const paddedWest = clamp(west - padLng, -180, 180);
			const paddedNorth = clamp(north + padLat, -90, 90);
			const paddedEast = clamp(east + padLng, -180, 180);

			// Quantize the fetch window so we don't refetch on tiny pans/zooms.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);
			const qSouth = Math.floor(paddedSouth / quant) * quant;
			const qWest = Math.floor(paddedWest / quant) * quant;
			const qNorth = Math.ceil(paddedNorth / quant) * quant;
			const qEast = Math.ceil(paddedEast / quant) * quant;

			const nextKey = `${zoomKey}|${qSouth.toFixed(4)}|${qWest.toFixed(4)}|${qNorth.toFixed(
				4
			)}|${qEast.toFixed(4)}`;
			if (nextKey === lastPromotionOverlayFetchKeyRef.current) return;
			lastPromotionOverlayFetchKeyRef.current = nextKey;
			setPromotionOverlayFetchBbox({
				minLat: qSouth,
				minLng: qWest,
				maxLat: qNorth,
				maxLng: qEast,
			});
		},
		[isPromotionSearch]
	);

	const updateAllContactsOverlayFetchBbox = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance) return;

			// Only run when an explicit search is active (avoid loading the entire dataset in non-search views).
			if (!isAnySearch) {
				if (lastAllContactsOverlayFetchKeyRef.current !== '') {
					lastAllContactsOverlayFetchKeyRef.current = '';
					setAllContactsOverlayFetchBbox(null);
				}
				return;
			}

			const zoomRaw = mapInstance.getZoom() ?? 4;
			// Only fetch/render the gray-dot overlay when zoomed in very close.
			if (zoomRaw < ALL_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM) {
				if (lastAllContactsOverlayFetchKeyRef.current !== '') {
					lastAllContactsOverlayFetchKeyRef.current = '';
					setAllContactsOverlayFetchBbox(null);
				}
				return;
			}

			const bounds = mapInstance.getBounds();
			if (!bounds) return;
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat;
			const west = sw.lng;
			const north = ne.lat;
			const east = ne.lng;

			// Skip antimeridian-crossing viewports (not relevant for our UI).
			if (east < west) return;

			// Light padding to avoid refetching on small pans.
			const latSpan = north - south;
			const lngSpan = east - west;
			const padLat = latSpan * 0.2;
			const padLng = lngSpan * 0.2;

			const paddedSouth = clamp(south - padLat, -90, 90);
			const paddedWest = clamp(west - padLng, -180, 180);
			const paddedNorth = clamp(north + padLat, -90, 90);
			const paddedEast = clamp(east + padLng, -180, 180);

			// Quantize the fetch window so we don't refetch on tiny pans/zooms.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);
			const qSouth = Math.floor(paddedSouth / quant) * quant;
			const qWest = Math.floor(paddedWest / quant) * quant;
			const qNorth = Math.ceil(paddedNorth / quant) * quant;
			const qEast = Math.ceil(paddedEast / quant) * quant;

			const nextKey = `${zoomKey}|${qSouth.toFixed(4)}|${qWest.toFixed(4)}|${qNorth.toFixed(
				4
			)}|${qEast.toFixed(4)}`;
			if (nextKey === lastAllContactsOverlayFetchKeyRef.current) return;

			lastAllContactsOverlayFetchKeyRef.current = nextKey;
			setAllContactsOverlayFetchBbox({
				minLat: qSouth,
				minLng: qWest,
				maxLat: qNorth,
				maxLng: qEast,
			});
		},
		[isAnySearch]
	);

	const allContactsOverlayFilters = useMemo(() => {
		if (!allContactsOverlayFetchBbox) return undefined;
		return {
			mode: 'all' as const,
			south: allContactsOverlayFetchBbox.minLat,
			west: allContactsOverlayFetchBbox.minLng,
			north: allContactsOverlayFetchBbox.maxLat,
			east: allContactsOverlayFetchBbox.maxLng,
			limit: ALL_CONTACTS_OVERLAY_LIMIT,
		};
	}, [allContactsOverlayFetchBbox]);

	const { data: allContactsOverlayRawContacts } = useGetContactsMapOverlay({
		filters: allContactsOverlayFilters,
		enabled: Boolean(allContactsOverlayFilters),
	});

	const bookingExtraOverlayFilters = useMemo(() => {
		if (!bookingExtraFetchBbox) return undefined;
		return {
			mode: 'booking' as const,
			south: bookingExtraFetchBbox.minLat,
			west: bookingExtraFetchBbox.minLng,
			north: bookingExtraFetchBbox.maxLat,
			east: bookingExtraFetchBbox.maxLng,
			limit: 1200,
		};
	}, [bookingExtraFetchBbox]);

	const { data: bookingExtraRawContacts } = useGetContactsMapOverlay({
		filters: bookingExtraOverlayFilters,
		enabled: Boolean(bookingExtraOverlayFilters),
	});

	const promotionOverlayFilters = useMemo(() => {
		if (!promotionOverlayFetchBbox) return undefined;
		return {
			mode: 'promotion' as const,
			south: promotionOverlayFetchBbox.minLat,
			west: promotionOverlayFetchBbox.minLng,
			north: promotionOverlayFetchBbox.maxLat,
			east: promotionOverlayFetchBbox.maxLng,
			limit: 1200,
		};
	}, [promotionOverlayFetchBbox]);

	const { data: promotionOverlayRawContacts } = useGetContactsMapOverlay({
		filters: promotionOverlayFilters,
		enabled: Boolean(promotionOverlayFilters),
	});

	const bookingExtraContacts = useMemo(() => {
		if (!bookingExtraRawContacts || bookingExtraRawContacts.length === 0) return [];
		return bookingExtraRawContacts.filter((c) => {
			// Never duplicate primary result markers.
			if (baseContactIdSet.has(c.id)) return false;
			const prefix = getBookingTitlePrefixFromContactTitle(c.title);
			if (!prefix) return false;
			return true;
		});
	}, [bookingExtraRawContacts, baseContactIdSet]);

	const promotionOverlayContacts = useMemo(() => {
		if (!promotionOverlayRawContacts || promotionOverlayRawContacts.length === 0)
			return [];
		return promotionOverlayRawContacts.filter((c) => {
			// Client-side safety: only keep state-wide list titles.
			return isPromotionOverlayListTitle(c.title);
		});
	}, [promotionOverlayRawContacts]);

	const {
		contactsWithCoords: bookingExtraContactsWithCoords,
		coordsByContactId: bookingExtraCoordsByContactId,
	} = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		for (const contact of bookingExtraContacts) {
			const coords = getLatLngFromContact(contact);
			if (!coords) continue;
			coordsByContactId.set(contact.id, coords);
			contactsWithCoords.push(contact);
			const key = coordinateKey(coords);
			const existing = groups.get(key);
			if (existing) existing.push(contact.id);
			else groups.set(key, [contact.id]);
		}

		// Offset duplicates (keep the smallest id at the true coordinate for accuracy)
		for (const ids of groups.values()) {
			if (ids.length <= 1) continue;
			ids.sort((a, b) => a - b);
			for (let i = 1; i < ids.length; i++) {
				const id = ids[i];
				const base = coordsByContactId.get(id);
				if (!base) continue;
				coordsByContactId.set(id, jitterDuplicateCoords(base, i));
			}
		}

		return { contactsWithCoords, coordsByContactId };
	}, [bookingExtraContacts]);

	const {
		contactsWithCoords: promotionOverlayContactsWithCoords,
		coordsByContactId: promotionOverlayCoordsByContactId,
	} = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		for (const contact of promotionOverlayContacts) {
			const coords = getLatLngFromContact(contact);
			if (!coords) continue;
			coordsByContactId.set(contact.id, coords);
			contactsWithCoords.push(contact);
			const key = coordinateKey(coords);
			const existing = groups.get(key);
			if (existing) existing.push(contact.id);
			else groups.set(key, [contact.id]);
		}

		// Offset duplicates (keep the smallest id at the true coordinate for accuracy)
		for (const ids of groups.values()) {
			if (ids.length <= 1) continue;
			ids.sort((a, b) => a - b);
			for (let i = 1; i < ids.length; i++) {
				const id = ids[i];
				const base = coordsByContactId.get(id);
				if (!base) continue;
				coordsByContactId.set(id, jitterDuplicateCoords(base, i));
			}
		}

		return { contactsWithCoords, coordsByContactId };
	}, [promotionOverlayContacts]);

	const {
		contactsWithCoords: allContactsOverlayContactsWithCoords,
		coordsByContactId: allContactsOverlayCoordsByContactId,
	} = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		if (!allContactsOverlayRawContacts || allContactsOverlayRawContacts.length === 0) {
			return { contactsWithCoords, coordsByContactId };
		}

		for (const contact of allContactsOverlayRawContacts) {
			const coords = getLatLngFromContact(contact);
			if (!coords) continue;
			coordsByContactId.set(contact.id, coords);
			contactsWithCoords.push(contact);
			const key = coordinateKey(coords);
			const existing = groups.get(key);
			if (existing) existing.push(contact.id);
			else groups.set(key, [contact.id]);
		}

		// Offset duplicates (keep the smallest id at the true coordinate for accuracy)
		for (const ids of groups.values()) {
			if (ids.length <= 1) continue;
			ids.sort((a, b) => a - b);
			for (let i = 1; i < ids.length; i++) {
				const id = ids[i];
				const base = coordsByContactId.get(id);
				if (!base) continue;
				coordsByContactId.set(id, jitterDuplicateCoords(base, i));
			}
		}

		return { contactsWithCoords, coordsByContactId };
	}, [allContactsOverlayRawContacts]);

	const getBookingExtraContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			bookingExtraCoordsByContactId.get(contact.id) ?? null,
		[bookingExtraCoordsByContactId]
	);

	const getPromotionOverlayContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			promotionOverlayCoordsByContactId.get(contact.id) ?? null,
		[promotionOverlayCoordsByContactId]
	);

	const getAllContactsOverlayContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			allContactsOverlayCoordsByContactId.get(contact.id) ?? null,
		[allContactsOverlayCoordsByContactId]
	);

	useEffect(() => {
		selectedStateKeyRef.current = selectedStateKey;
	}, [selectedStateKey]);

	useEffect(() => {
		onStateSelectRef.current = onStateSelect ?? null;
	}, [onStateSelect]);

	// If a hovered marker is removed due to viewport sampling, clear hover state
	// to avoid the UI getting "stuck" on a now-nonexistent marker.
	useEffect(() => {
		if (hoveredMarkerId == null) return;
		const stillVisible =
			visibleContacts.some((c) => c.id === hoveredMarkerId) ||
			bookingExtraVisibleContacts.some((c) => c.id === hoveredMarkerId) ||
			promotionOverlayVisibleContacts.some((c) => c.id === hoveredMarkerId) ||
			allContactsOverlayVisibleContacts.some((c) => c.id === hoveredMarkerId);
		if (stillVisible) return;
		if (hoverClearTimeoutRef.current) {
			clearTimeout(hoverClearTimeoutRef.current);
			hoverClearTimeoutRef.current = null;
		}
		setHoveredMarkerId(null);
		hoveredMarkerIdRef.current = null;
		hoverSourceRef.current = null;
		onMarkerHover?.(null);
	}, [
		visibleContacts,
		bookingExtraVisibleContacts,
		promotionOverlayVisibleContacts,
		allContactsOverlayVisibleContacts,
		hoveredMarkerId,
		onMarkerHover,
	]);

	// Clear hover state when zooming out past the minimum threshold
	useEffect(() => {
		if (zoomLevel >= HOVER_INTERACTION_MIN_ZOOM) return;
		if (hoveredMarkerId == null) return;
		if (hoverClearTimeoutRef.current) {
			clearTimeout(hoverClearTimeoutRef.current);
			hoverClearTimeoutRef.current = null;
		}
		if (fadingTooltipTimeoutRef.current) {
			clearTimeout(fadingTooltipTimeoutRef.current);
			fadingTooltipTimeoutRef.current = null;
		}
		setHoveredMarkerId(null);
		setFadingTooltipId(null);
		hoveredMarkerIdRef.current = null;
		hoverSourceRef.current = null;
		onMarkerHover?.(null);
	}, [zoomLevel, hoveredMarkerId, onMarkerHover]);

	useEffect(() => {
		if (lockedStateName === undefined) return;
		const nextKey = normalizeStateKey(lockedStateName);
		setSelectedStateKey(nextKey);
	}, [lockedStateName]);

	// Clear timeout when panel is closed or component unmounts
	useEffect(() => {
		return () => {
			if (researchPanelTimeoutRef.current) {
				clearTimeout(researchPanelTimeoutRef.current);
			}
			if (hoverClearTimeoutRef.current) {
				clearTimeout(hoverClearTimeoutRef.current);
			}
		};
	}, []);

	const clearResultsOutline = useCallback(() => {
		resultsSelectionMultiPolygonRef.current = null;
		resultsSelectionBboxRef.current = null;
		resultsSelectionSignatureRef.current = '';
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.resultsOutline) as
			| mapboxgl.GeoJSONSource
			| undefined;
		source?.setData(EMPTY_POLYGON_FC as any);
	}, [map, isMapLoaded]);

	const clearSearchedStateOutline = useCallback(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.lockedOutline) as
			| mapboxgl.GeoJSONSource
			| undefined;
		source?.setData(EMPTY_POLYGON_FC as any);
	}, [map, isMapLoaded]);

	// Load preprocessed US state shapes/metadata generated at build-time.
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		// If we've already loaded the shapes for this map instance, don't refetch.
		// Presentation toggles should only affect visibility/interaction, not data loading.
		if (usStatesGeoJsonRef.current?.features?.length) {
			setIsStateLayerReady(true);
			return;
		}

		let cancelled = false;
		const controller = new AbortController();

		const loadStates = async () => {
			setIsStateLayerReady(false);
			try {
				const fetchJson = async <T,>(url: string): Promise<T> => {
					const res = await fetch(url, { signal: controller.signal });
					if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
					return (await res.json()) as T;
				};

				const [
					processedGeoJson,
					statesMetaByKey,
					stateLabels,
					usOutlineGeometry,
					preparedPolygons,
				] = await Promise.all([
					fetchJson<GeoJsonFeatureCollection>(STATE_PROCESSED_GEOJSON_URL),
					fetchJson<
						Record<
							string,
							{
								key: string;
								name: string;
								bbox: BoundingBox | null;
							}
						>
					>(STATE_META_URL),
					fetchJson<GeoJSON.FeatureCollection>(STATE_LABELS_URL),
					fetchJson<Extract<GeoJsonGeometry, { type: 'MultiPolygon' }>>(STATE_OUTLINE_URL),
					fetchJson<PreparedClippingPolygon[]>(STATE_PREPARED_POLYGONS_URL),
				]);

				if (cancelled) return;

				const features = Array.isArray(processedGeoJson?.features)
					? processedGeoJson.features
					: [];
				const processed: GeoJsonFeatureCollection = { type: 'FeatureCollection', features };

				const geometryByKey = new Map<string, GeoJsonGeometry>();
				const nameByKey = new Map<string, string>();
				for (const feature of features) {
					const props = feature.properties ?? {};
					const rawKey =
						typeof props.key === 'string' || typeof props.key === 'number'
							? props.key
							: feature.id;
					const key = normalizeStateKey(rawKey != null ? String(rawKey) : null);
					if (!key) continue;

					const rawName = props.name;
					const safeName =
						typeof rawName === 'string' && rawName.trim().length ? rawName.trim() : key;

					geometryByKey.set(key, feature.geometry);
					nameByKey.set(key, safeName);
				}

				const byKey = new Map<
					string,
					{
						key: string;
						name: string;
						geometry: GeoJsonGeometry;
						multiPolygon: ClippingMultiPolygon;
						bbox: BoundingBox | null;
					}
				>();

				for (const [rawMetaKey, metaEntry] of Object.entries(statesMetaByKey ?? {})) {
					const key = normalizeStateKey(metaEntry?.key ?? rawMetaKey);
					if (!key) continue;

					const geometry = geometryByKey.get(key);
					if (!geometry) continue;

					const multiPolygon = geoJsonGeometryToClippingMultiPolygon(geometry);
					if (!multiPolygon) continue;

					const name =
						typeof metaEntry?.name === 'string' && metaEntry.name.trim().length
							? metaEntry.name.trim()
							: (nameByKey.get(key) ?? key);

					const bbox = metaEntry?.bbox ?? bboxFromMultiPolygon(multiPolygon);
					byKey.set(key, { key, name, geometry, multiPolygon, bbox });
				}

				// Ensure by-key metadata remains usable even if a key is missing from meta payload.
				for (const [key, geometry] of geometryByKey.entries()) {
					if (byKey.has(key)) continue;
					const multiPolygon = geoJsonGeometryToClippingMultiPolygon(geometry);
					if (!multiPolygon) continue;
					byKey.set(key, {
						key,
						name: nameByKey.get(key) ?? key,
						geometry,
						multiPolygon,
						bbox: bboxFromMultiPolygon(multiPolygon),
					});
				}

				usStatesGeoJsonRef.current = processed;
				usStatesByKeyRef.current = byKey;
				const prepared = Array.isArray(preparedPolygons) ? preparedPolygons : [];
				usStatesPolygonsRef.current = prepared.length ? prepared : null;

				const source = map.getSource(MAPBOX_SOURCE_IDS.states) as
					| mapboxgl.GeoJSONSource
					| undefined;
				source?.setData(processed as any);

				const labels: GeoJSON.FeatureCollection =
					stateLabels?.type === 'FeatureCollection' &&
					Array.isArray(stateLabels.features)
						? stateLabels
						: { type: 'FeatureCollection', features: [] };
				const labelSource = map.getSource(MAPBOX_SOURCE_IDS.stateLabels) as
					| mapboxgl.GeoJSONSource
					| undefined;
				labelSource?.setData(labels as any);

				const outline =
					usOutlineGeometry?.type === 'MultiPolygon' &&
					Array.isArray(usOutlineGeometry.coordinates)
						? usOutlineGeometry
						: null;
				usBasemapClipGeometryRef.current = outline;
				usBasemapClipMultiPolygonRef.current = outline
					? geoJsonGeometryToClippingMultiPolygon(outline)
					: null;

				// Apply/restore the clip based on current zoom (performance).
				syncUsOnlyBasemapCartography(map);

				setIsStateLayerReady(true);
			} catch (err) {
				if (cancelled) return;
				console.error('Failed to load preprocessed US states geometry', err);
				usStatesGeoJsonRef.current = null;
				usStatesByKeyRef.current = new Map();
				usStatesPolygonsRef.current = null;
				usBasemapClipGeometryRef.current = null;
				usBasemapClipMultiPolygonRef.current = null;
				setIsStateLayerReady(false);
			}
		};

		void loadStates();

		return () => {
			cancelled = true;
			controller.abort();
			setIsStateLayerReady(false);
			clearResultsOutline();
			clearSearchedStateOutline();
		};
	}, [
		map,
		isMapLoaded,
		clearResultsOutline,
		clearSearchedStateOutline,
		syncUsOnlyBasemapCartography,
	]);

	const applyStateOverlayOpacity = useCallback(
		(nextOverlayOpacity: number, nextModeT: number) => {
			if (!map || !isMapLoaded) return;
			let base = stateLineOpacityBaseRef.current;
		
			if (!base || base.dividers == null || base.borders == null) {
				try {
					const dividers = map.getPaintProperty(
						MAPBOX_LAYER_IDS.statesDividers,
						'line-opacity'
					) as any;
					const borders = map.getPaintProperty(
						MAPBOX_LAYER_IDS.statesBordersInteractive,
						'line-opacity'
					) as any;
					if (dividers != null && borders != null) {
						base = { dividers, borders };
						stateLineOpacityBaseRef.current = base;
					}
				} catch {
					// Ignore and fall back to numeric opacity below.
				}
			}

			const overlay = clamp(nextOverlayOpacity, 0, 1);
			const modeT = clamp(nextModeT, 0, 1);
			const dividersMul = overlay * (1 - modeT);
			const bordersMul = overlay * modeT;

			const setLineOpacity = (layerId: string, baseOpacity: any, mul: number) => {
				if (!map.getLayer(layerId)) return;
				try {
					if (mul <= 0.001) {
						map.setPaintProperty(layerId, 'line-opacity', 0);
						return;
					}
				
					if (baseOpacity == null) {
						map.setPaintProperty(layerId, 'line-opacity', mul);
						return;
					}
					if (mul >= 0.999) {
						map.setPaintProperty(layerId, 'line-opacity', baseOpacity);
						return;
					}
					map.setPaintProperty(
						layerId,
						'line-opacity',
						scaleMapboxOpacityExpr(baseOpacity, mul)
					);
				} catch {
					// Ignore.
				}
			};

			setLineOpacity(MAPBOX_LAYER_IDS.statesDividers, base?.dividers, dividersMul);
			setLineOpacity(MAPBOX_LAYER_IDS.statesBordersInteractive, base?.borders, bordersMul);

			// Labels fade with the overall overlay opacity (mode doesn't matter).
			if (map.getLayer(MAPBOX_LAYER_IDS.statesLabels)) {
				try {
					map.setPaintProperty(MAPBOX_LAYER_IDS.statesLabels, 'text-opacity', overlay);
				} catch {
					// Ignore.
				}
			}
		},
		[map, isMapLoaded]
	);

	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const wasBackgroundPresentation = prevIsBackgroundPresentationRef.current;
		prevIsBackgroundPresentationRef.current = isBackgroundPresentation;
		const isEnteringInteractiveFromDashboard =
			wasBackgroundPresentation && !isBackgroundPresentation;

		// Overall: state overlays are hidden in decorative background mode, and until GeoJSON is loaded.
		const targetOverlayOpacity = !isBackgroundPresentation && isStateLayerReady ? 1 : 0;
		// Mode: divider lines when state interactions are disabled; interactive borders when enabled.
		const targetModeT = stateInteractionsEnabled ? 1 : 0;

		const fromOverlay = stateOverlayOpacityRef.current;
		const fromModeT = stateOverlayModeRef.current;

		const needsOverlay = Math.abs(targetOverlayOpacity - fromOverlay) > 0.001;
		const needsMode = Math.abs(targetModeT - fromModeT) > 0.001;

		// Cancel any in-flight animation.
		if (stateOverlayAnimRafRef.current != null) {
			cancelAnimationFrame(stateOverlayAnimRafRef.current);
			stateOverlayAnimRafRef.current = null;
		}

		// Always apply once so we stay in sync even if the map style reloads.
		if (!needsOverlay && !needsMode) {
			stateOverlayOpacityRef.current = targetOverlayOpacity;
			stateOverlayModeRef.current = targetModeT;
			applyStateOverlayOpacity(targetOverlayOpacity, targetModeT);
			return;
		}

		const durationMs =
			needsOverlay && isEnteringInteractiveFromDashboard
				? DASHBOARD_TO_INTERACTIVE_TRANSITION_MS
				: needsOverlay
					? 600
					: 350;
		const start = performance.now();
		const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

		const tick = (now: number) => {
			const t = clamp((now - start) / durationMs, 0, 1);
			const e = easeOutCubic(t);
			const overlay = fromOverlay + (targetOverlayOpacity - fromOverlay) * e;
			const modeT = fromModeT + (targetModeT - fromModeT) * e;

			stateOverlayOpacityRef.current = overlay;
			stateOverlayModeRef.current = modeT;
			applyStateOverlayOpacity(overlay, modeT);

			if (t < 1) {
				stateOverlayAnimRafRef.current = requestAnimationFrame(tick);
			} else {
				stateOverlayAnimRafRef.current = null;
			}
		};

		stateOverlayAnimRafRef.current = requestAnimationFrame(tick);
		return () => {
			if (stateOverlayAnimRafRef.current != null) {
				cancelAnimationFrame(stateOverlayAnimRafRef.current);
				stateOverlayAnimRafRef.current = null;
			}
		};
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		isStateLayerReady,
		stateInteractionsEnabled,
		applyStateOverlayOpacity,
	]);

	// Keep the Mapbox "selected" feature-state for US states in sync with `selectedStateKey`.
	const prevSelectedStateKeyOnMapRef = useRef<string | null>(null);
	useEffect(() => {
		if (!map || !isMapLoaded || !isStateLayerReady) return;
		const prev = prevSelectedStateKeyOnMapRef.current;
		if (prev && prev !== selectedStateKey) {
			try {
				map.setFeatureState(
					{ source: MAPBOX_SOURCE_IDS.states, id: prev },
					{ selected: false }
				);
			} catch {
				// Ignore (feature may not be present yet).
			}
		}
		if (selectedStateKey) {
			try {
				map.setFeatureState(
					{ source: MAPBOX_SOURCE_IDS.states, id: selectedStateKey },
					{ selected: true }
				);
			} catch {
				// Ignore (feature may not be present yet).
			}
		}
		prevSelectedStateKeyOnMapRef.current = selectedStateKey;
	}, [map, isMapLoaded, isStateLayerReady, selectedStateKey]);

	const handleResearchPanelMouseEnter = useCallback(() => {
		if (researchPanelTimeoutRef.current) {
			clearTimeout(researchPanelTimeoutRef.current);
			researchPanelTimeoutRef.current = null;
		}
	}, []);

	const handleResearchPanelMouseLeave = useCallback(() => {
		researchPanelTimeoutRef.current = setTimeout(() => {
			setSelectedMarker(null);
		}, 5000);
	}, []);

	const ensureMapboxSourcesAndLayers = useCallback((mapInstance: mapboxgl.Map) => {
		const emptyFc: GeoJSON.FeatureCollection = {
			type: 'FeatureCollection',
			features: [],
		};

		const ensureSource = (id: string) => {
			if (mapInstance.getSource(id)) return;
			mapInstance.addSource(id, { type: 'geojson', data: emptyFc });
		};

		// Core sources
		// States source needs `promoteId` so Mapbox uses the string "key" property (e.g. "CA", "TX")
		// as the feature identifier — required for setFeatureState with non-numeric IDs.
		if (!mapInstance.getSource(MAPBOX_SOURCE_IDS.states)) {
			mapInstance.addSource(MAPBOX_SOURCE_IDS.states, {
				type: 'geojson',
				data: emptyFc,
				promoteId: 'key',
			});
		}
		ensureSource(MAPBOX_SOURCE_IDS.resultsOutline);
		ensureSource(MAPBOX_SOURCE_IDS.lockedOutline);
		ensureSource(MAPBOX_SOURCE_IDS.selectedAreaRect);
		ensureSource(MAPBOX_SOURCE_IDS.selectionRect);

		// State label centroids (one point per state — avoids duplicate labels on MultiPolygon states)
		ensureSource(MAPBOX_SOURCE_IDS.stateLabels);

		// Marker sources (all are point FeatureCollections keyed by contact.id)
		ensureSource(MAPBOX_SOURCE_IDS.markersAllOverlay);
		ensureSource(MAPBOX_SOURCE_IDS.markersPromotionPin);
		ensureSource(MAPBOX_SOURCE_IDS.markersBookingPin);
		ensureSource(MAPBOX_SOURCE_IDS.markersPromotionDot);
		ensureSource(MAPBOX_SOURCE_IDS.markersBase);

		const ensureLayer = (layer: any) => {
			if (mapInstance.getLayer(layer.id)) return;
			mapInstance.addLayer(layer);
		};

		const resultDotRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			RESULT_DOT_SCALE_MIN,
			RESULT_DOT_ZOOM_MIN,
			RESULT_DOT_SCALE_MIN,
			RESULT_DOT_ZOOM_MAX,
			RESULT_DOT_SCALE_MAX,
			24,
			RESULT_DOT_SCALE_MAX,
		];
		const resultDotStrokeExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			RESULT_DOT_STROKE_WEIGHT_MIN_PX,
			RESULT_DOT_ZOOM_MIN,
			RESULT_DOT_STROKE_WEIGHT_MIN_PX,
			RESULT_DOT_ZOOM_MAX,
			RESULT_DOT_STROKE_WEIGHT_MAX_PX,
			24,
			RESULT_DOT_STROKE_WEIGHT_MAX_PX,
		];

		const allOverlayRadiusLow = RESULT_DOT_SCALE_MIN * 0.72;
		const allOverlayRadiusHigh = RESULT_DOT_SCALE_MAX * 0.72;
		const allOverlayRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			allOverlayRadiusLow,
			RESULT_DOT_ZOOM_MIN,
			allOverlayRadiusLow,
			RESULT_DOT_ZOOM_MAX,
			allOverlayRadiusHigh,
			24,
			allOverlayRadiusHigh,
		];

		const allOverlayStrokeLow = Math.max(1, RESULT_DOT_STROKE_WEIGHT_MIN_PX * 0.85);
		const allOverlayStrokeHigh = Math.max(1, RESULT_DOT_STROKE_WEIGHT_MAX_PX * 0.85);
		const allOverlayStrokeExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			allOverlayStrokeLow,
			RESULT_DOT_ZOOM_MIN,
			allOverlayStrokeLow,
			RESULT_DOT_ZOOM_MAX,
			allOverlayStrokeHigh,
			24,
			allOverlayStrokeHigh,
		];

		const pinRadiusLow =
			Math.max(MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX, 2 * RESULT_DOT_SCALE_MIN) / 2;
		const pinRadiusHigh =
			Math.max(MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX, 2 * RESULT_DOT_SCALE_MAX) / 2;
		const pinRadiusExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			pinRadiusLow,
			RESULT_DOT_ZOOM_MIN,
			pinRadiusLow,
			RESULT_DOT_ZOOM_MAX,
			pinRadiusHigh,
			24,
			pinRadiusHigh,
		];

		const pinIconSizeLow =
			Math.max(MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX, 2 * RESULT_DOT_SCALE_MIN) /
			MAP_MARKER_PIN_CIRCLE_DIAMETER;
		const pinIconSizeHigh =
			Math.max(MIN_OVERLAY_PIN_CIRCLE_DIAMETER_PX, 2 * RESULT_DOT_SCALE_MAX) /
			MAP_MARKER_PIN_CIRCLE_DIAMETER;
		const pinIconSizeExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			0,
			pinIconSizeLow,
			RESULT_DOT_ZOOM_MIN,
			pinIconSizeLow,
			RESULT_DOT_ZOOM_MAX,
			pinIconSizeHigh,
			24,
			pinIconSizeHigh,
		];

		// States: hover fill + hit fill (transparent) + divider lines + interactive borders
		const isStateSelectedExpr = ['boolean', ['feature-state', 'selected'], false];

		const stateDividerLineWidthExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			MAP_MIN_ZOOM,
			0.8,
			5,
			1.0,
			STATE_DIVIDER_LINES_MAX_ZOOM,
			1.4,
		];
		const stateDividerLineOpacityExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			MAP_MIN_ZOOM,
			0.6,
			5,
			0.75,
			STATE_DIVIDER_LINES_MAX_ZOOM,
			0.85,
		];
		const stateInteractiveBorderWidthExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			MAP_MIN_ZOOM,
			// Selected state should be only subtly emphasized.
			['case', isStateSelectedExpr, 1.2, 0.7],
			5,
			['case', isStateSelectedExpr, 1.4, 0.85],
			9,
			['case', isStateSelectedExpr, 1.4, 0.85],
			14,
			['case', isStateSelectedExpr, 1.2, 0.6],
		];
		const stateInteractiveBorderOpacityExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			MAP_MIN_ZOOM,
			['case', isStateSelectedExpr, 1, 0.6],
			5,
			['case', isStateSelectedExpr, 1, 0.75],
			9,
			['case', isStateSelectedExpr, 1, 0.82],
			14,
			['case', isStateSelectedExpr, 1, 0.7],
		];
		const stateInteractiveBorderColorExpr = [
			'interpolate',
			['linear'],
			['zoom'],
			MAP_MIN_ZOOM,
			['case', isStateSelectedExpr, '#8896AB', '#94A3B8'],
			6,
			['case', isStateSelectedExpr, '#8896AB', '#94A3B8'],
			14,
			['case', isStateSelectedExpr, '#C3CED3', STATE_BORDER_COLOR],
		];

		ensureLayer({
			id: MAPBOX_LAYER_IDS.statesFillHover,
			type: 'fill',
			source: MAPBOX_SOURCE_IDS.states,
			paint: {
				'fill-color': STATE_HIGHLIGHT_COLOR,
				'fill-opacity': [
					'case',
					['boolean', ['feature-state', 'hover'], false],
					STATE_HIGHLIGHT_OPACITY,
					0,
				],
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.statesFillHit,
			type: 'fill',
			source: MAPBOX_SOURCE_IDS.states,
			paint: {
				'fill-color': '#000000',
				// Tiny non-zero opacity ensures queryRenderedFeatures reliably returns features
				// across all browsers/GPU drivers (some skip truly invisible geometry).
				'fill-opacity': 0.01,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.statesDividers,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.states,
			maxzoom: STATE_DIVIDER_LINES_MAX_ZOOM + 0.01,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': '#64748B',
				'line-opacity': stateDividerLineOpacityExpr,
				'line-width': stateDividerLineWidthExpr,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.statesBordersInteractive,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.states,
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: {
				'line-color': stateInteractiveBorderColorExpr,
				'line-opacity': stateInteractiveBorderOpacityExpr,
				'line-width': stateInteractiveBorderWidthExpr,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.statesLabels,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.stateLabels,
			minzoom: MAP_MIN_ZOOM,
			layout: {
				// Abbreviations when zoomed out, full names when zoomed in.
				'text-field': ['step', ['zoom'], ['get', 'key'], 7, ['get', 'name']],
				'text-size': ['interpolate', ['linear'], ['zoom'], 3, 9, 5, 10, 7, 12, 10, 14],
				'text-font': ['Inter Medium', 'Arial Unicode MS Regular'],
				'text-allow-overlap': false,
				'text-ignore-placement': false,
				'text-padding': 2,
			},
			paint: {
				'text-color': '#111827',
				// Keep labels flat (no glow) to match `/free-trial`.
				'text-halo-color': 'rgba(0, 0, 0, 0)',
				'text-halo-width': 0,
			},
		});

		// Search-results outlines (blue + black) intentionally removed.

		// All-contacts overlay (gray dots) — lowest marker priority
		ensureLayer({
			id: MAPBOX_LAYER_IDS.markersAllHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersAllOverlay,
			paint: {
				'circle-radius': allOverlayRadiusExpr,
				'circle-opacity': 0,
				'circle-stroke-width': 0,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.markersAllDots,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersAllOverlay,
			paint: {
				'circle-radius': allOverlayRadiusExpr,
				'circle-color': ['get', 'fillColor'],
				'circle-opacity': 1,
				'circle-stroke-color': [
					'case',
					['boolean', ['feature-state', 'selected'], false],
					RESULT_DOT_STROKE_COLOR_SELECTED,
					RESULT_DOT_STROKE_COLOR_DEFAULT,
				],
				'circle-stroke-width': allOverlayStrokeExpr,
			},
		});

		// Promotion overlay pins (outside locked state / no locked state) — behind primary dots
		// The circle layer doubles as hit area AND visual ring for selection (feature-state in paint is allowed).
		ensureLayer({
			id: MAPBOX_LAYER_IDS.promotionPinHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersPromotionPin,
			paint: {
				'circle-radius': pinRadiusExpr,
				'circle-opacity': 0,
				'circle-stroke-width': [
					'case',
					['boolean', ['feature-state', 'selected'], false],
					2.5,
					0,
				],
				'circle-stroke-color': [
					'case',
					['boolean', ['feature-state', 'selected'], false],
					RESULT_DOT_STROKE_COLOR_SELECTED,
					'transparent',
				],
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.promotionPinIcons,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersPromotionPin,
			layout: {
				'icon-image': ['get', 'iconDefault'],
				'icon-size': pinIconSizeExpr,
				'icon-anchor': 'top-left',
				'icon-offset': [-MAP_MARKER_PIN_CIRCLE_CENTER_X, -MAP_MARKER_PIN_CIRCLE_CENTER_Y],
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
			},
		});

		// Booking extra pins — behind primary dots
		// The circle layer doubles as hit area AND visual ring for selection.
		ensureLayer({
			id: MAPBOX_LAYER_IDS.bookingPinHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersBookingPin,
			paint: {
				'circle-radius': pinRadiusExpr,
				'circle-opacity': 0,
				'circle-stroke-width': [
					'case',
					['boolean', ['feature-state', 'selected'], false],
					2.5,
					0,
				],
				'circle-stroke-color': [
					'case',
					['boolean', ['feature-state', 'selected'], false],
					RESULT_DOT_STROKE_COLOR_SELECTED,
					'transparent',
				],
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.bookingPinIcons,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersBookingPin,
			layout: {
				'icon-image': ['get', 'iconDefault'],
				'icon-size': pinIconSizeExpr,
				'icon-anchor': 'top-left',
				'icon-offset': [-MAP_MARKER_PIN_CIRCLE_CENTER_X, -MAP_MARKER_PIN_CIRCLE_CENTER_Y],
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
			},
		});

		ensureLayer({
			id: MAPBOX_LAYER_IDS.bookingPinIconsHover,
			type: 'symbol',
			source: MAPBOX_SOURCE_IDS.markersBookingPin,
			filter: ['==', ['get', 'category'], ''],
			layout: {
				'icon-image': ['get', 'iconHover'],
				'icon-size': pinIconSizeExpr,
				'icon-anchor': 'top-left',
				'icon-offset': [-MAP_MARKER_PIN_CIRCLE_CENTER_X, -MAP_MARKER_PIN_CIRCLE_CENTER_Y],
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
			},
		});

		// Promotion overlay dots (inside locked state) — below primary dots
		ensureLayer({
			id: MAPBOX_LAYER_IDS.promotionDotHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersPromotionDot,
			paint: {
				'circle-radius': resultDotRadiusExpr,
				'circle-opacity': 0,
				'circle-stroke-width': 0,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.promotionDotDots,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersPromotionDot,
			paint: {
				'circle-radius': resultDotRadiusExpr,
				'circle-color': ['get', 'fillColor'],
				'circle-opacity': 1,
				'circle-stroke-color': [
					'case',
					['boolean', ['feature-state', 'selected'], false],
					RESULT_DOT_STROKE_COLOR_SELECTED,
					RESULT_DOT_STROKE_COLOR_DEFAULT,
				],
				'circle-stroke-width': resultDotStrokeExpr,
			},
		});

		// Primary result dots — top marker priority
		ensureLayer({
			id: MAPBOX_LAYER_IDS.baseHit,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersBase,
			paint: {
				'circle-radius': resultDotRadiusExpr,
				'circle-opacity': 0,
				'circle-stroke-width': 0,
			},
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.baseDots,
			type: 'circle',
			source: MAPBOX_SOURCE_IDS.markersBase,
			paint: {
				'circle-radius': resultDotRadiusExpr,
				'circle-color': ['get', 'fillColor'],
				'circle-opacity': 1,
				'circle-stroke-color': [
					'case',
					['boolean', ['feature-state', 'selected'], false],
					RESULT_DOT_STROKE_COLOR_SELECTED,
					RESULT_DOT_STROKE_COLOR_DEFAULT,
				],
				'circle-stroke-width': resultDotStrokeExpr,
			},
		});

		// Persisted selected area (black outline) — above markers
		ensureLayer({
			id: MAPBOX_LAYER_IDS.selectedAreaRect,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.selectedAreaRect,
			paint: { 'line-color': '#000000', 'line-opacity': 1, 'line-width': 3 },
		});

		// In-progress selection rectangle — above everything
		ensureLayer({
			id: MAPBOX_LAYER_IDS.selectionRectFill,
			type: 'fill',
			source: MAPBOX_SOURCE_IDS.selectionRect,
			paint: { 'fill-color': '#143883', 'fill-opacity': 0.08 },
		});
		ensureLayer({
			id: MAPBOX_LAYER_IDS.selectionRectLine,
			type: 'line',
			source: MAPBOX_SOURCE_IDS.selectionRect,
			paint: { 'line-color': '#143883', 'line-opacity': 1, 'line-width': 2 },
		});
	}, []);

	useEffect(() => {
		if (!mapContainerRef.current) return;
		if (mapRef.current) return;

		const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
		if (!accessToken) {
			setMapLoadError('Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN');
			return;
		}

		mapboxgl.accessToken = accessToken;

		const mapInstance = new mapboxgl.Map({
			container: mapContainerRef.current,
			style: MAPBOX_STYLE,
			center: [defaultCenter.lng, defaultCenter.lat],
			zoom: MAP_DEFAULT_ZOOM,
			minZoom: MAP_MIN_ZOOM,
			attributionControl: true,
		});

		mapRef.current = mapInstance;
		setMap(mapInstance);
		try {
			initialZoomConstraintsRef.current = {
				minZoom: mapInstance.getMinZoom(),
				maxZoom: mapInstance.getMaxZoom(),
			};
		} catch {
			// Non-fatal.
		}

		const onStyleLoad = () => {
			applyFreeTrialMapVisualTuning(mapInstance);
		};

		const onLoad = () => {
			applyFreeTrialMapVisualTuning(mapInstance);
			setIsMapLoaded(true);
			setZoomLevel(mapInstance.getZoom() ?? MAP_DEFAULT_ZOOM);
			setMapLoadError(null);
			ensureMapboxSourcesAndLayers(mapInstance);

			let capturedStateLineOpacityBase = false;
			try {
				if (!stateLineOpacityBaseRef.current) {
					const dividers = mapInstance.getPaintProperty(
						MAPBOX_LAYER_IDS.statesDividers,
						'line-opacity'
					) as any;
					const borders = mapInstance.getPaintProperty(
						MAPBOX_LAYER_IDS.statesBordersInteractive,
						'line-opacity'
					) as any;
					if (dividers != null && borders != null) {
						stateLineOpacityBaseRef.current = { dividers, borders };
						capturedStateLineOpacityBase = true;
					}
				} else {
					capturedStateLineOpacityBase = true;
				}
			} catch {
				// Ignore.
			}
			try {
				// Only force-hide on load when we have a recoverable base expression.
				// Otherwise leave defaults in place so overlays do not get stuck invisible.
				if (capturedStateLineOpacityBase && mapInstance.getLayer(MAPBOX_LAYER_IDS.statesDividers)) {
					mapInstance.setPaintProperty(MAPBOX_LAYER_IDS.statesDividers, 'line-opacity', 0);
				}
				if (
					capturedStateLineOpacityBase &&
					mapInstance.getLayer(MAPBOX_LAYER_IDS.statesBordersInteractive)
				) {
					mapInstance.setPaintProperty(
						MAPBOX_LAYER_IDS.statesBordersInteractive,
						'line-opacity',
						0
					);
				}
				if (capturedStateLineOpacityBase && mapInstance.getLayer(MAPBOX_LAYER_IDS.statesLabels)) {
					mapInstance.setPaintProperty(MAPBOX_LAYER_IDS.statesLabels, 'text-opacity', 0);
				}
			} catch {
				// Ignore.
			}
		};

		const onError = (e: any) => {
			const message =
				typeof e?.error?.message === 'string'
					? e.error.message
					: typeof e?.error === 'string'
						? e.error
						: 'Error loading map';
			setMapLoadError(message);
		};

		mapInstance.on('load', onLoad);
		mapInstance.on('style.load', onStyleLoad);
		mapInstance.on('error', onError);

		return () => {
			mapInstance.off('load', onLoad);
			mapInstance.off('style.load', onStyleLoad);
			mapInstance.off('error', onError);
			backgroundSpinCleanupRef.current?.();
			backgroundSpinCleanupRef.current = null;
			mapInstance.remove();
			mapRef.current = null;
			setMap(null);
			setIsMapLoaded(false);
		};
	}, [ensureMapboxSourcesAndLayers]);

	
	const prevPresentationRef = useRef<'background' | 'interactive'>(presentation);

	const cinematicAutoFitRef = useRef(false);
	
	const cinematicInFlightRef = useRef(false);
	const cinematicInFlightTimerRef = useRef<NodeJS.Timeout | null>(null);

	const backgroundCinematicMoveEndHandlerRef = useRef<(() => void) | null>(null);

	const pendingMinZoomRestoreRef = useRef(false);
	const hasAttachedMinZoomRestoreRef = useRef(false);
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const wasBackground = prevPresentationRef.current === 'background';
		prevPresentationRef.current = presentation;

		// Stop any prior background spin when presentation changes.
		backgroundSpinCleanupRef.current?.();
		backgroundSpinCleanupRef.current = null;

		const safeEnableInteractions = () => {
			try {
				map.scrollZoom.enable();
			} catch {}
			try {
				map.boxZoom.enable();
			} catch {}
			try {
				map.doubleClickZoom.enable();
			} catch {}
			try {
				map.dragPan.enable();
			} catch {}
			try {
				map.dragRotate.enable();
			} catch {}
			try {
				map.keyboard.enable();
			} catch {}
			try {
				map.touchZoomRotate.enable();
			} catch {}
		};

		const safeDisableInteractions = () => {
			try {
				map.scrollZoom.disable();
			} catch {}
			try {
				map.boxZoom.disable();
			} catch {}
			try {
				map.doubleClickZoom.disable();
			} catch {}
			try {
				map.dragPan.disable();
			} catch {}
			try {
				map.dragRotate.disable();
			} catch {}
			try {
				map.keyboard.disable();
			} catch {}
			try {
				map.touchZoomRotate.disable();
			} catch {}
		};

		if (isBackgroundPresentation) {
			// Decorative dashboard background: fixed zoom, no interactions, optional slow globe spin.
			safeDisableInteractions();

			// Tune these to match the homepage "globe peeking from the top" framing.
			// Key trick: use `offset` (screen-space pan) rather than changing geo center a lot.
			const DECORATIVE_ZOOM = 4.0;
			const DECORATIVE_PITCH = 15;
			const DECORATIVE_OFFSET: [number, number] = [0, 140]; // push center down -> see more top/horizon
			const DECORATIVE_CENTER: [number, number] = [defaultCenter.lng, defaultCenter.lat];
			const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

			const lockDecorativeZoom = () => {
				try {
					map.setMinZoom(DECORATIVE_ZOOM);
					map.setMaxZoom(DECORATIVE_ZOOM);
				} catch {
					// Ignore.
				}
			};

			const startBackgroundSpin = () => {
				if (!shouldAutoSpin) return;
				// Slow decorative spin and keep the US in view with a gentle back-and-forth sway.
				const secondsPerRevolution = 3000;
				const distancePerSecond = 360 / secondsPerRevolution;
				const animationDurationMs = 1000;

				const normalizeLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;

				const baseLng = DECORATIVE_CENTER[0];
				const maxDriftDeg = 35; // keep camera within a US-visible band
				let direction: 1 | -1 = 1;
				let currentLng = normalizeLng(map.getCenter()?.lng ?? baseLng);

				const spinGlobe = () => {
					try {
						currentLng = normalizeLng(currentLng + direction * distancePerSecond);
						const drift = normalizeLng(currentLng - baseLng);
						if (drift > maxDriftDeg) {
							currentLng = normalizeLng(baseLng + maxDriftDeg);
							direction = -1;
						} else if (drift < -maxDriftDeg) {
							currentLng = normalizeLng(baseLng - maxDriftDeg);
							direction = 1;
						}

						map.easeTo({
							center: [currentLng, DECORATIVE_CENTER[1]],
							zoom: DECORATIVE_ZOOM,
							pitch: DECORATIVE_PITCH,
							bearing: 0,
							offset: DECORATIVE_OFFSET,
							duration: animationDurationMs,
							easing: (n) => n,
						});
					} catch {
						// Ignore (map may be tearing down).
					}
				};

				map.on('moveend', spinGlobe);
				// Kick off the loop.
				spinGlobe();

				backgroundSpinCleanupRef.current = () => {
					try {
						map.off('moveend', spinGlobe);
					} catch {}
					try {
						map.stop();
					} catch {}
				};
			};

			const isEnteringBackgroundFromInteractive = !wasBackground;
			if (isEnteringBackgroundFromInteractive) {
				// Cinematic interactive → dashboard background transition: ease back out instead of snapping.
				try {
					map.stop();
				} catch {}

				// Prevent zoom clamping from snapping the camera before the ease starts.
				try {
					const currentZoom = map.getZoom() ?? DECORATIVE_ZOOM;
					map.setMinZoom(Math.min(currentZoom, DECORATIVE_ZOOM));
					map.setMaxZoom(Math.max(currentZoom, DECORATIVE_ZOOM));
				} catch {
					// Ignore.
				}

				// Cancel any prior pending "lock decorative zoom" handler.
				if (backgroundCinematicMoveEndHandlerRef.current) {
					try {
						map.off('moveend', backgroundCinematicMoveEndHandlerRef.current as any);
					} catch {}
					backgroundCinematicMoveEndHandlerRef.current = null;
				}

				// Guard against resize() / other camera ops interrupting the sweep.
				cinematicInFlightRef.current = true;
				if (cinematicInFlightTimerRef.current)
					clearTimeout(cinematicInFlightTimerRef.current);
				cinematicInFlightTimerRef.current = null;

				const dur = DASHBOARD_TO_INTERACTIVE_TRANSITION_MS;
				const onCinematicEnd = () => {
					backgroundCinematicMoveEndHandlerRef.current = null;
					// If the user already flipped back to interactive, don't lock/override anything.
					if (presentationRef.current !== 'background') return;

					lockDecorativeZoom();
					startBackgroundSpin();

					cinematicInFlightRef.current = false;
					if (cinematicInFlightTimerRef.current)
						clearTimeout(cinematicInFlightTimerRef.current);
					cinematicInFlightTimerRef.current = null;
				};
				backgroundCinematicMoveEndHandlerRef.current = onCinematicEnd;
				try {
					map.once('moveend', onCinematicEnd as any);
				} catch {}

				// Fallback: ensure we don't get stuck in "in flight" if moveend never fires.
				cinematicInFlightTimerRef.current = setTimeout(() => {
					cinematicInFlightRef.current = false;
					cinematicInFlightTimerRef.current = null;
				}, dur + 150);

				try {
					map.easeTo({
						center: DECORATIVE_CENTER,
						zoom: DECORATIVE_ZOOM,
						pitch: DECORATIVE_PITCH,
						bearing: 0,
						offset: DECORATIVE_OFFSET,
						duration: dur,
						easing: easeOutCubic,
					});
				} catch {
					// Ignore.
				}

				return;
			}

			// No transition (initial mount / already background): snap to decorative framing.
			try {
				lockDecorativeZoom();
				// `jumpTo` typings don't accept `offset` in our Mapbox version; use a 0ms `easeTo`.
				map.easeTo({
					center: DECORATIVE_CENTER,
					zoom: DECORATIVE_ZOOM,
					pitch: DECORATIVE_PITCH,
					bearing: 0,
					offset: DECORATIVE_OFFSET,
					duration: 0,
				});
			} catch {
				// Ignore.
			}

			startBackgroundSpin();

			return;
		}

		// If we were easing back into the background and the user flipped to interactive mid-sweep,
		// cancel the pending "lock decorative zoom" handler + clear the in-flight guard.
		if (backgroundCinematicMoveEndHandlerRef.current) {
			try {
				map.off('moveend', backgroundCinematicMoveEndHandlerRef.current as any);
			} catch {}
			backgroundCinematicMoveEndHandlerRef.current = null;
			cinematicInFlightRef.current = false;
			if (cinematicInFlightTimerRef.current)
				clearTimeout(cinematicInFlightTimerRef.current);
			cinematicInFlightTimerRef.current = null;
		}

		// Interactive results mode: stop any ongoing animation, restore zoom constraints
		// and re-enable all user interactions.
		try {
			map.stop();
		} catch {}
		// Restore interactive zoom constraints. If we're coming from the decorative globe (zoom < MAP_MIN_ZOOM),
		// temporarily allow that starting zoom so the camera move begins exactly from the dashboard view.
		try {
			const currentZoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
			const safeMinZoom = Math.min(MAP_MIN_ZOOM, currentZoom);
			map.setMinZoom(safeMinZoom);
			map.setMaxZoom(DEFAULT_MAX_ZOOM_FALLBACK);
			if (safeMinZoom < MAP_MIN_ZOOM) {
				pendingMinZoomRestoreRef.current = true;
			}
		} catch {
			// Ignore.
		}
		safeEnableInteractions();

		// When transitioning *from* background → interactive, reset the auto-fit tracking
		// so the map correctly zooms to the search results / locked state.
		if (wasBackground) {
			cinematicAutoFitRef.current = true;
			hasFitBoundsRef.current = false;
			lastContactsCountRef.current = 0;
			lastFirstContactIdRef.current = null;
			lastLockedStateKeyRef.current = null;
			lastFitToLockedStateKeyRef.current = null;
			lastSearchQueryKeyRef.current = null;

			// Force a resize so the canvas matches the (potentially new) portal container size.
			try {
				map.resize();
			} catch {}
		}
	}, [map, isMapLoaded, isBackgroundPresentation, shouldAutoSpin, presentation]);

	// When used as a decorative background, clear any interactive UI state so we don't
	// "carry" selected/hovered marker panels across view transitions.
	useEffect(() => {
		if (!isBackgroundPresentation) return;
		setSelectedMarker(null);
		setHoveredMarkerId(null);
		setFadingTooltipId(null);
		hoveredMarkerIdRef.current = null;
		hoverSourceRef.current = null;
		onMarkerHover?.(null);
	}, [isBackgroundPresentation, onMarkerHover]);

	// Keep the Mapbox canvas in sync with its container.
	// In portal / fixed-position layouts the browser may not have the final height when
	// mapbox-gl first reads it, so we:
	//   1. Observe container resizes (covers window resize, sidebar toggle, etc.)
	//   2. Fire a burst of resize() calls after mount to catch deferred CSS layout
	useEffect(() => {
		const container = mapContainerRef.current;
		if (!container || !map) return;

		let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
		const safeResize = () => {
			// During the cinematic background→interactive sweep, the container isn't truly
			// resizing (we animate via clip-path). Skip resize to avoid interrupting fitBounds.
			if (cinematicInFlightRef.current) return;
			try {
				map.resize();
			} catch {
				/* map may be tearing down */
			}
		};

		const scheduleResize = () => {
			// Debounce aggressive resize loops (e.g. CSS inset transitions) to avoid WebGL canvas flicker.
			if (resizeDebounce) clearTimeout(resizeDebounce);
			resizeDebounce = setTimeout(() => {
				resizeDebounce = null;
				safeResize();
			}, 120);
		};

		// ResizeObserver for ongoing size changes.
		const ro = new ResizeObserver(() => scheduleResize());
		ro.observe(container);

		// Burst of retries to catch portal/fixed layout settling.
		const timers: ReturnType<typeof setTimeout>[] = [];
		for (const ms of [0, 50, 150, 300, 600]) {
			timers.push(setTimeout(safeResize, ms));
		}

		return () => {
			ro.disconnect();
			for (const t of timers) clearTimeout(t);
			if (resizeDebounce) clearTimeout(resizeDebounce);
		};
	}, [map]);

	// Compute valid coords once and keep a per-contact lookup for stable rendering.
	// Also apply a small deterministic offset for duplicate coordinate groups so every result is visible.
	const { contactsWithCoords, coordsByContactId } = useMemo(() => {
		const coordsByContactId = new Map<number, LatLngLiteral>();
		const contactsWithCoords: ContactWithName[] = [];
		const groups = new Map<string, number[]>();

		for (const contact of contacts) {
			const coords = getLatLngFromContact(contact);
			if (!coords) continue;
			coordsByContactId.set(contact.id, coords);
			contactsWithCoords.push(contact);
			const key = coordinateKey(coords);
			const existing = groups.get(key);
			if (existing) existing.push(contact.id);
			else groups.set(key, [contact.id]);
		}

		// Offset duplicates (keep the smallest id at the true coordinate for accuracy)
		for (const ids of groups.values()) {
			if (ids.length <= 1) continue;
			ids.sort((a, b) => a - b);
			for (let i = 1; i < ids.length; i++) {
				const id = ids[i];
				const base = coordsByContactId.get(id);
				if (!base) continue;
				coordsByContactId.set(id, jitterDuplicateCoords(base, i));
			}
		}

		return { contactsWithCoords, coordsByContactId };
	}, [contacts]);

	// State keys represented by the *visible* results on the map (only contacts with coords).
	const resultStateKeys = useMemo(() => {
		const keys = new Set<string>();
		for (const contact of contactsWithCoords) {
			const key = normalizeStateKey(contact.state ?? null);
			if (key) keys.add(key);
		}
		return Array.from(keys).sort();
	}, [contactsWithCoords]);

	const lockedStateKey = useMemo(
		() => normalizeStateKey(lockedStateName ?? null),
		[lockedStateName]
	);

	const isCoordsInLockedState = useCallback((coords: LatLngLiteral): boolean => {
		const selection = lockedStateSelectionMultiPolygonRef.current;
		if (!selection) return true; // no locked state selection -> treat as "in state"
		const bbox = lockedStateSelectionBboxRef.current;
		if (bbox && !isLatLngInBbox(coords.lat, coords.lng, bbox)) return false;
		return pointInMultiPolygon([coords.lng, coords.lat], selection);
	}, []);

	// Used to ensure the high-zoom "all contacts" gray-dot overlay never renders in water.
	// We approximate "land" by requiring the coordinate to fall within at least one US state polygon
	// loaded from `states.js` (this reliably removes oceans/coastal water artifacts without extra API calls).
	const isCoordsInAnyUsState = useCallback((coords: LatLngLiteral): boolean => {
		const prepared = usStatesPolygonsRef.current;
		if (!prepared || prepared.length === 0) return false;
		const point: ClippingCoord = [coords.lng, coords.lat];
		for (const { polygon, bbox } of prepared) {
			if (bbox && !isLatLngInBbox(coords.lat, coords.lng, bbox)) continue;
			if (pointInClippingPolygon(point, polygon)) return true;
		}
		return false;
	}, []);

	const resultStateKeysSignature = useMemo(
		() => resultStateKeys.join('|'),
		[resultStateKeys]
	);

	useEffect(() => {
		resultsSelectionSignatureRef.current = resultStateKeysSignature;
	}, [resultStateKeysSignature]);

	// Helper to get coordinates for a contact (stable + already-parsed)
	const getContactCoords = useCallback(
		(contact: ContactWithName): LatLngLiteral | null =>
			coordsByContactId.get(contact.id) ?? null,
		[coordsByContactId]
	);

	const handleMapMouseUp = useCallback(
		(e: mapboxgl.MapMouseEvent) => {
			if (!isAreaSelecting) return;
			const start = selectionStartLatLngRef.current;
			if (!start) {
				clearSelectionRect();
				return;
			}
			const end = { lat: e.lngLat.lat, lng: e.lngLat.lng };

			// Ignore tiny "click" selections (treat as cancel).
			const startClient = selectionStartClientRef.current;
			const endClient = getClientPointFromDomEvent(e.originalEvent);
			const dx = startClient && endClient ? Math.abs(endClient.x - startClient.x) : 0;
			const dy = startClient && endClient ? Math.abs(endClient.y - startClient.y) : 0;
			const movedEnough = dx >= 6 || dy >= 6;

			clearSelectionRect();

			if (!movedEnough) return;

			const bounds: MapSelectionBounds = {
				south: Math.min(start.lat, end.lat),
				west: Math.min(start.lng, end.lng),
				north: Math.max(start.lat, end.lat),
				east: Math.max(start.lng, end.lng),
			};

			const isCoordsInBounds = (coords: LatLngLiteral | null | undefined): boolean => {
				if (!coords) return false;
				return (
					coords.lat >= bounds.south &&
					coords.lat <= bounds.north &&
					coords.lng >= bounds.west &&
					coords.lng <= bounds.east
				);
			};

			// Build a selection payload so the dashboard can select contacts without triggering a new search.
			const selectedIds = new Set<number>();
			for (const contact of contactsWithCoords) {
				const coords = coordsByContactId.get(contact.id) ?? null;
				if (!isCoordsInBounds(coords)) continue;
				selectedIds.add(contact.id);
			}

			const normalizedSearchWhat = searchWhat ? normalizeWhatKey(searchWhat) : null;

			const extraContactsById = new Map<number, ContactWithName>();

			// Include booking overlay pins only when they match the active "What" (category) and are visible.
			if (
				isBookingSearch &&
				normalizedSearchWhat &&
				bookingExtraVisibleContacts.length > 0
			) {
				for (const contact of bookingExtraVisibleContacts) {
					const prefix = getBookingTitlePrefixFromContactTitle(contact.title);
					if (!prefix) continue;
					if (!bookingTitlePrefixMatchesSearchWhatKey(prefix, normalizedSearchWhat))
						continue;
					const coords = bookingExtraCoordsByContactId.get(contact.id) ?? null;
					if (!isCoordsInBounds(coords)) continue;
					selectedIds.add(contact.id);
					if (!baseContactIdSet.has(contact.id)) {
						extraContactsById.set(contact.id, contact);
					}
				}
			}

			// Include promotion overlay pins only when they match the active "What" (category) and are visible.
			if (
				isPromotionSearch &&
				normalizedSearchWhat &&
				promotionOverlayVisibleContacts.length > 0
			) {
				for (const contact of promotionOverlayVisibleContacts) {
					const title = contact.title ?? '';
					const matchedPrefix =
						PROMOTION_OVERLAY_TITLE_PREFIXES.find((p) =>
							startsWithCaseInsensitive(title, p)
						) ?? null;
					if (!matchedPrefix) continue;
					if (normalizeWhatKey(matchedPrefix) !== normalizedSearchWhat) continue;
					const coords = promotionOverlayCoordsByContactId.get(contact.id) ?? null;
					if (!isCoordsInBounds(coords)) continue;
					selectedIds.add(contact.id);
					if (!baseContactIdSet.has(contact.id)) {
						extraContactsById.set(contact.id, contact);
					}
				}
			}

			// Include "all contacts" high-zoom gray dots (no category filtering).
			if (allContactsOverlayVisibleContacts.length > 0) {
				for (const contact of allContactsOverlayVisibleContacts) {
					const coords = allContactsOverlayCoordsByContactId.get(contact.id) ?? null;
					if (!isCoordsInBounds(coords)) continue;
					selectedIds.add(contact.id);
					if (!baseContactIdSet.has(contact.id)) {
						extraContactsById.set(contact.id, contact);
					}
				}
			}

			onAreaSelect?.(bounds, {
				contactIds: Array.from(selectedIds),
				extraContacts: Array.from(extraContactsById.values()),
			});
		},
		[
			isAreaSelecting,
			clearSelectionRect,
			onAreaSelect,
			contactsWithCoords,
			coordsByContactId,
			searchWhat,
			isBookingSearch,
			bookingExtraVisibleContacts,
			bookingExtraCoordsByContactId,
			isPromotionSearch,
			promotionOverlayVisibleContacts,
			promotionOverlayCoordsByContactId,
			allContactsOverlayVisibleContacts,
			allContactsOverlayCoordsByContactId,
			baseContactIdSet,
		]
	);

	// Dashboard UX: "All" button selects all markers currently visible in the viewport that
	// match the active search category (including overlay pins when visible).
	useEffect(() => {
		if (!selectAllInViewNonce) return;
		if (selectAllInViewNonce === lastSelectAllInViewNonceRef.current) return;
		if (!map) return;
		if (typeof onAreaSelect !== 'function') return;

		const viewportBounds = map.getBounds();
		if (!viewportBounds) return;
		const sw = viewportBounds.getSouthWest();
		const ne = viewportBounds.getNorthEast();
		const west = sw.lng;
		const east = ne.lng;

		// Skip in the unlikely case the viewport crosses the antimeridian (not relevant for our UI).
		if (east < west) return;

		const bounds: MapSelectionBounds = {
			south: sw.lat,
			west,
			north: ne.lat,
			east,
		};

		const selectedIds = new Set<number>();

		// Base results: only select dots currently rendered in the viewport.
		for (const contact of visibleContacts) selectedIds.add(contact.id);

		const normalizedSearchWhat = searchWhat ? normalizeWhatKey(searchWhat) : null;
		const extraContactsById = new Map<number, ContactWithName>();

		// Booking overlay pins: select only the visible pins that match the active category.
		if (
			isBookingSearch &&
			normalizedSearchWhat &&
			bookingExtraVisibleContacts.length > 0
		) {
			for (const contact of bookingExtraVisibleContacts) {
				const prefix = getBookingTitlePrefixFromContactTitle(contact.title);
				if (!prefix) continue;
				if (!bookingTitlePrefixMatchesSearchWhatKey(prefix, normalizedSearchWhat))
					continue;
				selectedIds.add(contact.id);
				if (!baseContactIdSet.has(contact.id)) {
					extraContactsById.set(contact.id, contact);
				}
			}
		}

		// Promotion overlay pins: select only the visible pins that match the active category.
		if (
			isPromotionSearch &&
			normalizedSearchWhat &&
			promotionOverlayVisibleContacts.length > 0
		) {
			for (const contact of promotionOverlayVisibleContacts) {
				const title = contact.title ?? '';
				const matchedPrefix =
					PROMOTION_OVERLAY_TITLE_PREFIXES.find((p) =>
						startsWithCaseInsensitive(title, p)
					) ?? null;
				if (!matchedPrefix) continue;
				if (normalizeWhatKey(matchedPrefix) !== normalizedSearchWhat) continue;
				selectedIds.add(contact.id);
				if (!baseContactIdSet.has(contact.id)) {
					extraContactsById.set(contact.id, contact);
				}
			}
		}

		// All-contacts gray overlay: select all visible gray dots in the viewport.
		if (allContactsOverlayVisibleContacts.length > 0) {
			for (const contact of allContactsOverlayVisibleContacts) {
				selectedIds.add(contact.id);
				if (!baseContactIdSet.has(contact.id)) {
					extraContactsById.set(contact.id, contact);
				}
			}
		}

		onAreaSelect(bounds, {
			contactIds: Array.from(selectedIds),
			extraContacts: Array.from(extraContactsById.values()),
		});

		// Ensure this runs once per dashboard click, even as viewport-driven state changes.
		lastSelectAllInViewNonceRef.current = selectAllInViewNonce;
	}, [
		selectAllInViewNonce,
		map,
		onAreaSelect,
		visibleContacts,
		searchWhat,
		isBookingSearch,
		bookingExtraVisibleContacts,
		isPromotionSearch,
		promotionOverlayVisibleContacts,
		allContactsOverlayVisibleContacts,
		baseContactIdSet,
	]);

	// Recompute which contact markers are rendered in the current viewport, and
	// budget background dots so the combined total stays under MAX_TOTAL_DOTS.
	const recomputeViewportDots = useCallback(
		(mapInstance: mapboxgl.Map | null) => {
			if (!mapInstance) return;
			// Preserve currently-rendered markers while results are loading/refetching.
			// The dashboard parent can momentarily pass `contacts=[]` during refetch; if we sample
			// against that, we end up clearing and then repopulating the marker sources (visible flicker).
			if (isLoadingRef.current) return;

			const bounds = mapInstance.getBounds();
			if (!bounds) return;
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat;
			const west = sw.lng;
			const north = ne.lat;
			const east = ne.lng;

			// Skip in the unlikely case the viewport crosses the antimeridian (not relevant for our UI).
			if (east < west) return;

			const zoomRaw = mapInstance.getZoom() ?? 4;
			// Compute marker size at this zoom so we can enforce min spacing in screen pixels.
			// Note: Google Maps can report fractional zoom; use the raw value for accurate scaling.
			const markerScale = getResultDotScaleForZoom(zoomRaw);
			const dotStrokeWeight = getResultDotStrokeWeightForZoom(zoomRaw);
			// Ensure *hovered* dots also won't overlap.
			const minSeparationPx = 2 * (markerScale * 1.18) + dotStrokeWeight + 1.5;
			const minSeparationSq = minSeparationPx * minSeparationPx;
			// Mapbox GL's internal "world" is 512px wide at zoom 0 (tileSize=512).
			// Use the same scale so our world-pixel distances match on-screen pixels.
			const worldSize = 512 * Math.pow(2, zoomRaw);

			// Keep the seed quantized so marker sampling stays stable while panning/zooming.
			const zoomKey = Math.round(zoomRaw);
			const quant = getBackgroundDotsQuantizationDeg(zoomKey);
			const qSouth = Math.round(south / quant);
			const qWest = Math.round(west / quant);
			const qNorth = Math.round(north / quant);
			const qEast = Math.round(east / quant);
			const seed = `${zoomKey}|${qSouth}|${qWest}|${qNorth}|${qEast}`;

			const viewportBbox: BoundingBox = {
				minLat: south,
				maxLat: north,
				minLng: west,
				maxLng: east,
			};

			// Promotion overlay pins: state-wide "Radio Stations <State>" / "College Radio <State>"
			// lists should all be visible together at low zoom.
			const shouldShowPromotionOverlay =
				isPromotionSearch &&
				zoomRaw >= PROMOTION_OVERLAY_MARKERS_MIN_ZOOM &&
				promotionOverlayContactsWithCoords.length > 0;
			let nextPromotionOverlayVisible: ContactWithName[] = [];
			if (shouldShowPromotionOverlay) {
				const promoInBounds: ContactWithName[] = [];
				for (const contact of promotionOverlayContactsWithCoords) {
					const coords = getPromotionOverlayContactCoords(contact);
					if (!coords) continue;
					if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;
					promoInBounds.push(contact);
				}
				// Keep ordering stable.
				promoInBounds.sort((a, b) => a.id - b.id);
				// Defensive cap (we expect far fewer than this).
				nextPromotionOverlayVisible =
					promoInBounds.length > PROMOTION_OVERLAY_MARKERS_MAX_PINS
						? promoInBounds.slice(0, PROMOTION_OVERLAY_MARKERS_MAX_PINS)
						: promoInBounds;
			}

			const nextPromotionKey = nextPromotionOverlayVisible.map((c) => c.id).join(',');
			if (nextPromotionKey !== lastPromotionOverlayVisibleContactsKeyRef.current) {
				lastPromotionOverlayVisibleContactsKeyRef.current = nextPromotionKey;
				setPromotionOverlayVisibleContacts(nextPromotionOverlayVisible);
			}

			const promotionOverlayIdSet =
				nextPromotionOverlayVisible.length > 0
					? new Set<number>(nextPromotionOverlayVisible.map((c) => c.id))
					: null;

			// Determine which contacts are currently in the viewport.
			const inBounds: ContactWithName[] = [];
			for (const contact of contactsWithCoords) {
				// If this contact is rendered as a promotion overlay pin, don't duplicate it as a dot.
				if (promotionOverlayIdSet?.has(contact.id)) continue;
				const coords = getContactCoords(contact);
				if (!coords) continue;
				if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;
				inBounds.push(contact);
			}

			const hasLockedStateSelection =
				!!lockedStateKey &&
				lockedStateSelectionKeyRef.current === lockedStateKey &&
				!!lockedStateSelectionMultiPolygonRef.current;

			const selectedSet = new Set<number>(selectedContacts);
			const hoveredId = hoveredMarkerIdRef.current;
			const priorityIdSet = new Set<number>(selectedSet);
			if (hoveredId != null) priorityIdSet.add(hoveredId);
			for (const id of visibleContactIdSetRef.current) priorityIdSet.add(id);

			const priorityInBounds: ContactWithName[] = [];
			const inLockedUnpriorityInBounds: ContactWithName[] = [];
			const outLockedUnpriorityInBounds: ContactWithName[] = [];
			const unpriorityInBounds: ContactWithName[] = [];
			for (const contact of inBounds) {
				if (priorityIdSet.has(contact.id)) {
					priorityInBounds.push(contact);
					continue;
				}

				if (hasLockedStateSelection) {
					// Prefer the contact's state field for inside/outside classification (cheap),
					// and only fall back to polygon containment when state is missing/unknown.
					const contactStateKey = normalizeStateKey(contact.state ?? null);
					if (contactStateKey) {
						if (contactStateKey === lockedStateKey)
							inLockedUnpriorityInBounds.push(contact);
						else outLockedUnpriorityInBounds.push(contact);
						continue;
					}

					const coords = getContactCoords(contact);
					if (coords && isCoordsInLockedState(coords))
						inLockedUnpriorityInBounds.push(contact);
					else outLockedUnpriorityInBounds.push(contact);
					continue;
				}

				unpriorityInBounds.push(contact);
			}

			// When zoomed out, avoid placing locked-state dots directly on top of the state border stroke
			// by deprioritizing points that are too close to the boundary.
			const shouldInsetLockedStateMarkers = hasLockedStateSelection && zoomRaw <= 6;
			let lockedEdgeIdSet: Set<number> | null = null;
			let inLockedUnprioritySafe: ContactWithName[] = inLockedUnpriorityInBounds;
			let inLockedUnpriorityEdge: ContactWithName[] = [];

			if (shouldInsetLockedStateMarkers) {
				const selection = lockedStateSelectionMultiPolygonRef.current;
				if (selection) {
					const borderSegments = buildOuterRingWorldSegments(selection, worldSize);
					if (borderSegments.length > 0) {
						// Inset in screen pixels: marker radius + ~half border stroke + a little padding.
						const borderInsetPx = markerScale + 1.5 + 1;
						const safe: ContactWithName[] = [];
						const edge: ContactWithName[] = [];
						for (const contact of inLockedUnpriorityInBounds) {
							const coords = getContactCoords(contact);
							if (!coords) continue;
							const wp = latLngToWorldPixel(coords, worldSize);
							const isNearBorder = isWorldPointNearSegments(
								wp.x,
								wp.y,
								borderSegments,
								borderInsetPx
							);
							if (isNearBorder) edge.push(contact);
							else safe.push(contact);
						}

						inLockedUnprioritySafe = safe;
						inLockedUnpriorityEdge = edge;
						lockedEdgeIdSet = edge.length > 0 ? new Set(edge.map((c) => c.id)) : null;
					}
				}
			}

			// Reserve budget for promotion overlay pins so they always render.
			const maxPrimaryDots = Math.max(
				0,
				MAX_TOTAL_DOTS - nextPromotionOverlayVisible.length
			);

			// Build a stable "candidate pool" larger than what we render, then pick a
			// non-overlapping subset so dots never visually stack on top of each other.
			const POOL_FACTOR = 4;
			const poolSlots = maxPrimaryDots * POOL_FACTOR;
			let pool: ContactWithName[] = [];
			if (poolSlots <= 0) {
				pool = [];
			} else if (inBounds.length <= poolSlots) {
				pool = inBounds;
			} else if (priorityInBounds.length >= poolSlots) {
				pool = stableViewportSampleContacts(
					priorityInBounds,
					getContactCoords,
					viewportBbox,
					poolSlots,
					`${seed}|pool:priority`
				);
			} else {
				const remainingSlots = poolSlots - priorityInBounds.length;
				if (hasLockedStateSelection) {
					const share = getLockedStateMarkerShareForZoom(zoomRaw);
					const desiredLockedSlots = Math.round(remainingSlots * share);
					const lockedSlots = Math.min(
						inLockedUnpriorityInBounds.length,
						desiredLockedSlots
					);
					let outsideSlots = remainingSlots - lockedSlots;
					const lockedSamplingBbox = lockedStateSelectionBboxRef.current ?? viewportBbox;

					const sampleLockedUnselected = (slots: number): ContactWithName[] => {
						if (slots <= 0) return [];
						if (!shouldInsetLockedStateMarkers || inLockedUnpriorityEdge.length === 0) {
							return stableViewportSampleContacts(
								inLockedUnpriorityInBounds,
								getContactCoords,
								lockedSamplingBbox,
								slots,
								`${seed}|pool:locked`
							);
						}

						const primarySlots = Math.min(inLockedUnprioritySafe.length, slots);
						const edgeSlots = Math.max(0, slots - primarySlots);
						const sampledSafe =
							primarySlots > 0
								? stableViewportSampleContacts(
										inLockedUnprioritySafe,
										getContactCoords,
										lockedSamplingBbox,
										primarySlots,
										`${seed}|pool:locked:safe`
									)
								: [];
						const sampledEdge =
							edgeSlots > 0
								? stableViewportSampleContacts(
										inLockedUnpriorityEdge,
										getContactCoords,
										lockedSamplingBbox,
										edgeSlots,
										`${seed}|pool:locked:edge`
									)
								: [];

						return [...sampledSafe, ...sampledEdge];
					};

					// If there aren't enough "outside" contacts to fill the remainder,
					// reallocate the unused slots back to the locked state.
					const outsideAvailable = outLockedUnpriorityInBounds.length;
					if (outsideAvailable < outsideSlots) {
						const unused = outsideSlots - outsideAvailable;
						outsideSlots = outsideAvailable;
						// NOTE: This may exceed desiredLockedSlots, but it's fine — we prefer
						// more in-locked candidates when zoomed out.
						const additionalLockedSlots = Math.min(
							inLockedUnpriorityInBounds.length - lockedSlots,
							unused
						);
						const finalLockedSlots = lockedSlots + Math.max(0, additionalLockedSlots);

						const sampledLocked = sampleLockedUnselected(finalLockedSlots);
						const sampledOutside = stableViewportSampleContacts(
							outLockedUnpriorityInBounds,
							getContactCoords,
							viewportBbox,
							outsideSlots,
							`${seed}|pool:out`
						);
						pool = [...priorityInBounds, ...sampledLocked, ...sampledOutside];
					} else {
						const sampledLocked = sampleLockedUnselected(lockedSlots);
						const sampledOutside = stableViewportSampleContacts(
							outLockedUnpriorityInBounds,
							getContactCoords,
							viewportBbox,
							outsideSlots,
							`${seed}|pool:out`
						);
						pool = [...priorityInBounds, ...sampledLocked, ...sampledOutside];
					}
				} else {
					const sampled = stableViewportSampleContacts(
						unpriorityInBounds,
						getContactCoords,
						viewportBbox,
						remainingSlots,
						`${seed}|pool`
					);
					pool = [...priorityInBounds, ...sampled];
				}
			}

			type Candidate = {
				contact: ContactWithName;
				x: number;
				y: number;
				isSelected: boolean;
				isHovered: boolean;
				isPriority: boolean;
				isInLockedState: boolean;
				isNearLockedBorder: boolean;
				key: number;
			};

			const candidates: Candidate[] = [];
			const candidateContacts: ContactWithName[] = [];
			const candidateCoords: LatLngLiteral[] = [];
			for (const contact of pool) {
				const coords = getContactCoords(contact);
				if (!coords) continue;
				candidateContacts.push(contact);
				candidateCoords.push(coords);
			}
			const projectedCandidates = batchLatLngToWorldPixels(candidateCoords, worldSize);
			for (let i = 0; i < candidateContacts.length; i++) {
				const contact = candidateContacts[i];
				const coords = candidateCoords[i];
				const projected = projectedCandidates[i];
				if (!coords || !projected) continue;
				const { x, y } = projected;
				let isInLockedState = true;
				if (hasLockedStateSelection) {
					const contactStateKey = normalizeStateKey(contact.state ?? null);
					isInLockedState = contactStateKey
						? contactStateKey === lockedStateKey
						: isCoordsInLockedState(coords);
				}
				candidates.push({
					contact,
					x,
					y,
					isSelected: selectedSet.has(contact.id),
					isHovered: hoveredId != null && contact.id === hoveredId,
					isPriority: priorityIdSet.has(contact.id),
					isInLockedState,
					isNearLockedBorder: !!lockedEdgeIdSet && lockedEdgeIdSet.has(contact.id),
					key: hashStringToUint32(`${seed}|${contact.id}`),
				});
			}

			const priorityCandidates: Candidate[] = [];
			const inLockedCandidates: Candidate[] = [];
			const outLockedCandidates: Candidate[] = [];
			for (const c of candidates) {
				if (c.isPriority) priorityCandidates.push(c);
				else if (c.isInLockedState) inLockedCandidates.push(c);
				else outLockedCandidates.push(c);
			}

			// Stable ordering (we handle "priority first" by splitting arrays).
			// Within priority, keep hovered first, then explicit selections, then stable by id.
			priorityCandidates.sort((a, b) => {
				if (a.isHovered !== b.isHovered) return a.isHovered ? -1 : 1;
				if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
				return a.contact.id - b.contact.id;
			});
			inLockedCandidates.sort((a, b) => {
				if (
					shouldInsetLockedStateMarkers &&
					a.isNearLockedBorder !== b.isNearLockedBorder
				) {
					return a.isNearLockedBorder ? 1 : -1;
				}
				return a.key - b.key;
			});
			outLockedCandidates.sort((a, b) => a.key - b.key);

			const picked: ContactWithName[] = [];
			let didPickWithWasm = false;

			// Prefer the Rust/WASM picker when available.
			{
				const wasmGeo = getWasmGeoModuleSync();
				if (wasmGeo && typeof wasmGeo.pick_non_overlapping_indices === 'function') {
					try {
						const xy = new Float64Array(candidates.length * 2);
						const inLockedMask = new Uint8Array(candidates.length);
						for (let i = 0; i < candidates.length; i++) {
							const c = candidates[i];
							xy[i * 2] = c.x;
							xy[i * 2 + 1] = c.y;
							inLockedMask[i] = c.isInLockedState ? 1 : 0;
						}

						const candidateIndexByRef = new Map<Candidate, number>();
						for (let i = 0; i < candidates.length; i++)
							candidateIndexByRef.set(candidates[i], i);

						const priorityOrder = new Uint32Array(priorityCandidates.length);
						for (let i = 0; i < priorityCandidates.length; i++) {
							const idx = candidateIndexByRef.get(priorityCandidates[i]);
							if (idx == null)
								throw new Error('[SearchResultsMap] missing candidate index (priority)');
							priorityOrder[i] = idx;
						}

						const inLockedOrder = new Uint32Array(inLockedCandidates.length);
						for (let i = 0; i < inLockedCandidates.length; i++) {
							const idx = candidateIndexByRef.get(inLockedCandidates[i]);
							if (idx == null)
								throw new Error('[SearchResultsMap] missing candidate index (inLocked)');
							inLockedOrder[i] = idx;
						}

						const outLockedOrder = new Uint32Array(outLockedCandidates.length);
						for (let i = 0; i < outLockedCandidates.length; i++) {
							const idx = candidateIndexByRef.get(outLockedCandidates[i]);
							if (idx == null)
								throw new Error('[SearchResultsMap] missing candidate index (outLocked)');
							outLockedOrder[i] = idx;
						}

						const inLockedShare = hasLockedStateSelection
							? getLockedStateMarkerShareForZoom(zoomRaw)
							: 1.0;
						const hardCapOutsideByInLocked = hasLockedStateSelection && zoomRaw <= 6;
						const cellSize = Math.max(6, minSeparationPx);

						const wasmResult = wasmGeo.pick_non_overlapping_indices(
							xy,
							priorityOrder,
							inLockedOrder,
							outLockedOrder,
							inLockedMask,
							maxPrimaryDots,
							inLockedShare,
							hardCapOutsideByInLocked,
							minSeparationSq,
							cellSize
						);

						const pickedIndices = wasmResult;
						for (let i = 0; i < pickedIndices.length; i++) {
							picked.push(candidates[pickedIndices[i]].contact);
						}
						didPickWithWasm = true;
					} catch (error: unknown) {
						// Ensure we don't fall through with a partial pick set.
						picked.length = 0;
						logWasmGeoRuntimeError(error);
					}
				}
			}

			if (!didPickWithWasm) {
				// Poisson-disc style selection using a grid acceleration structure.
				const cellSize = Math.max(6, minSeparationPx); // avoid tiny/degenerate cells
				const grid = new Map<string, Array<{ x: number; y: number }>>();
				let pickedInLockedStateCount = 0;

				const hasNeighborWithin = (
					cx: number,
					cy: number,
					x: number,
					y: number
				): boolean => {
					for (let dx = -1; dx <= 1; dx++) {
						for (let dy = -1; dy <= 1; dy++) {
							const arr = grid.get(`${cx + dx},${cy + dy}`);
							if (!arr) continue;
							for (const p of arr) {
								const ddx = x - p.x;
								const ddy = y - p.y;
								if (ddx * ddx + ddy * ddy < minSeparationSq) return true;
							}
						}
					}
					return false;
				};

				const pickFromCandidates = (cands: Candidate[], maxToPick: number) => {
					if (maxToPick <= 0) return;
					for (const c of cands) {
						if (picked.length >= maxPrimaryDots) break;
						if (maxToPick <= 0) break;
						const cx = Math.floor(c.x / cellSize);
						const cy = Math.floor(c.y / cellSize);
						if (hasNeighborWithin(cx, cy, c.x, c.y)) continue;

						picked.push(c.contact);
						if (c.isInLockedState) pickedInLockedStateCount += 1;
						maxToPick -= 1;
						const k = `${cx},${cy}`;
						const arr = grid.get(k);
						if (arr) arr.push({ x: c.x, y: c.y });
						else grid.set(k, [{ x: c.x, y: c.y }]);
					}
				};

				// Keep already-visible markers (plus any explicitly selected ones) stable while zooming:
				// rescale what’s already there, then add more markers as density allows.
				pickFromCandidates(priorityCandidates, maxPrimaryDots);

				// Then pick unselected markers, biasing toward the searched/locked state when zoomed out.
				const remainingBudget = maxPrimaryDots - picked.length;
				if (remainingBudget > 0) {
					if (hasLockedStateSelection) {
						const share = getLockedStateMarkerShareForZoom(zoomRaw);
						const inLockedBudget = Math.round(remainingBudget * share);
						let outLockedBudget = remainingBudget - inLockedBudget;

						const shouldHardCapOutside = zoomRaw <= 6;
						pickFromCandidates(inLockedCandidates, inLockedBudget);
						if (shouldHardCapOutside) {
							// Ensure the locked state visually "wins" when zoomed out.
							outLockedBudget = Math.min(outLockedBudget, pickedInLockedStateCount);
						}
						pickFromCandidates(outLockedCandidates, outLockedBudget);
					} else {
						// Default behavior: just keep a stable Poisson-disc subset.
						pickFromCandidates(inLockedCandidates, remainingBudget);
					}
				}
			}

			const nextVisibleContacts: ContactWithName[] = picked;

			// Stabilize ordering to reduce churn in marker source updates.
			nextVisibleContacts.sort((a, b) => a.id - b.id);

			const nextKey = nextVisibleContacts.map((c) => c.id).join(',');
			if (nextKey !== lastVisibleContactsKeyRef.current) {
				lastVisibleContactsKeyRef.current = nextKey;
				setVisibleContacts(nextVisibleContacts);
			}

			// Booking zoom-in extras: render additional booking categories at high zoom without
			// exceeding MAX_TOTAL_DOTS total markers.
			const shouldShowBookingExtras =
				isBookingSearch &&
				zoomRaw >= BOOKING_EXTRA_MARKERS_MIN_ZOOM &&
				bookingExtraContactsWithCoords.length > 0;
			let nextBookingExtraVisible: ContactWithName[] = [];
			if (shouldShowBookingExtras) {
				const remainingBudget = Math.max(
					0,
					MAX_TOTAL_DOTS - nextPromotionOverlayVisible.length - nextVisibleContacts.length
				);
				const maxExtraDots = Math.min(BOOKING_EXTRA_MARKERS_MAX_DOTS, remainingBudget);
				if (maxExtraDots > 0) {
					const extraInBounds: ContactWithName[] = [];
					for (const contact of bookingExtraContactsWithCoords) {
						const coords = getBookingExtraContactCoords(contact);
						if (!coords) continue;
						if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;
						extraInBounds.push(contact);
					}

					// Always prefer explicitly selected extra markers (so they don't disappear due to sampling).
					const priorityExtraIdSet = new Set<number>(selectedSet);
					if (hoveredId != null) priorityExtraIdSet.add(hoveredId);
					for (const id of bookingExtraVisibleIdSetRef.current)
						priorityExtraIdSet.add(id);
					const priorityExtraInBounds: ContactWithName[] = [];
					const unpriorityExtraInBounds: ContactWithName[] = [];
					for (const contact of extraInBounds) {
						if (priorityExtraIdSet.has(contact.id)) priorityExtraInBounds.push(contact);
						else unpriorityExtraInBounds.push(contact);
					}

					// Use the same sampling + non-overlap strategy as primary markers.
					const POOL_FACTOR = 4;
					const poolSlots = maxExtraDots * POOL_FACTOR;
					let pool: ContactWithName[] = [];
					if (extraInBounds.length <= poolSlots) {
						pool = extraInBounds;
					} else if (priorityExtraInBounds.length >= poolSlots) {
						pool = stableViewportSampleContacts(
							priorityExtraInBounds,
							getBookingExtraContactCoords,
							viewportBbox,
							poolSlots,
							`${seed}|bookingExtra|pool:priority`
						);
					} else {
						const remainingSlots = Math.max(0, poolSlots - priorityExtraInBounds.length);
						const sampledOther =
							unpriorityExtraInBounds.length <= remainingSlots
								? unpriorityExtraInBounds
								: stableViewportSampleContacts(
										unpriorityExtraInBounds,
										getBookingExtraContactCoords,
										viewportBbox,
										remainingSlots,
										`${seed}|bookingExtra|pool:other`
									);
						pool = [...priorityExtraInBounds, ...sampledOther];
					}

					type Candidate = {
						contact: ContactWithName;
						x: number;
						y: number;
						key: number;
						isSelected: boolean;
						isPriority: boolean;
					};
					const candidates: Candidate[] = [];
					const candidateContacts: ContactWithName[] = [];
					const candidateCoords: LatLngLiteral[] = [];
					for (const contact of pool) {
						const coords = getBookingExtraContactCoords(contact);
						if (!coords) continue;
						candidateContacts.push(contact);
						candidateCoords.push(coords);
					}
					const projectedCandidates = batchLatLngToWorldPixels(candidateCoords, worldSize);
					for (let i = 0; i < candidateContacts.length; i++) {
						const contact = candidateContacts[i];
						const projected = projectedCandidates[i];
						if (!projected) continue;
						candidates.push({
							contact,
							x: projected.x,
							y: projected.y,
							key: hashStringToUint32(`${seed}|bookingExtra|${contact.id}`),
							isSelected: selectedSet.has(contact.id),
							isPriority: priorityExtraIdSet.has(contact.id),
						});
					}

					// Stable ordering.
					candidates.sort((a, b) => a.key - b.key);

					const cellSize = Math.max(6, minSeparationPx);
					const grid = new Map<string, Array<{ x: number; y: number }>>();
					const pickedExtra: ContactWithName[] = [];
					const hasNeighborWithin = (
						cx: number,
						cy: number,
						x: number,
						y: number
					): boolean => {
						for (let dx = -1; dx <= 1; dx++) {
							for (let dy = -1; dy <= 1; dy++) {
								const arr = grid.get(`${cx + dx},${cy + dy}`);
								if (!arr) continue;
								for (const p of arr) {
									const ddx = x - p.x;
									const ddy = y - p.y;
									if (ddx * ddx + ddy * ddy < minSeparationSq) return true;
								}
							}
						}
						return false;
					};

					const priorityCandidates: Candidate[] = [];
					const otherCandidates: Candidate[] = [];
					for (const c of candidates) {
						if (c.isPriority) priorityCandidates.push(c);
						else otherCandidates.push(c);
					}

					priorityCandidates.sort((a, b) => {
						const aHovered = hoveredId != null && a.contact.id === hoveredId;
						const bHovered = hoveredId != null && b.contact.id === hoveredId;
						if (aHovered !== bHovered) return aHovered ? -1 : 1;
						if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
						return a.contact.id - b.contact.id;
					});

					const pickFromCandidates = (cands: Candidate[], maxToPick: number) => {
						if (maxToPick <= 0) return;
						for (const c of cands) {
							if (pickedExtra.length >= maxExtraDots) break;
							if (maxToPick <= 0) break;
							const cx = Math.floor(c.x / cellSize);
							const cy = Math.floor(c.y / cellSize);
							if (hasNeighborWithin(cx, cy, c.x, c.y)) continue;
							pickedExtra.push(c.contact);
							maxToPick -= 1;
							const k = `${cx},${cy}`;
							const arr = grid.get(k);
							if (arr) arr.push({ x: c.x, y: c.y });
							else grid.set(k, [{ x: c.x, y: c.y }]);
						}
					};

					// Keep already-visible/selected extras stable, then add more if we have budget.
					pickFromCandidates(priorityCandidates, maxExtraDots);
					pickFromCandidates(otherCandidates, maxExtraDots - pickedExtra.length);

					nextBookingExtraVisible = pickedExtra;
					nextBookingExtraVisible.sort((a, b) => a.id - b.id);
				}
			}

			const nextExtraKey = nextBookingExtraVisible.map((c) => c.id).join(',');
			if (nextExtraKey !== lastBookingExtraVisibleContactsKeyRef.current) {
				lastBookingExtraVisibleContactsKeyRef.current = nextExtraKey;
				setBookingExtraVisibleContacts(nextBookingExtraVisible);
			}

			// High-zoom gray-dot overlay: show *all* contacts in the viewport (excluding contacts
			// already rendered as primary dots or overlay pins).
			const shouldShowAllContactsOverlay =
				isAnySearch &&
				zoomRaw >= ALL_CONTACTS_OVERLAY_MARKERS_MIN_ZOOM &&
				allContactsOverlayContactsWithCoords.length > 0;
			let nextAllContactsOverlayVisible: ContactWithName[] = [];
			if (shouldShowAllContactsOverlay) {
				const excludeIdSet = new Set<number>(baseContactIdSet);
				for (const c of nextBookingExtraVisible) excludeIdSet.add(c.id);
				for (const c of nextPromotionOverlayVisible) excludeIdSet.add(c.id);

				const inBounds: ContactWithName[] = [];
				for (const contact of allContactsOverlayContactsWithCoords) {
					if (excludeIdSet.has(contact.id)) continue;
					const coords = getAllContactsOverlayContactCoords(contact);
					if (!coords) continue;
					if (!isLatLngInBbox(coords.lat, coords.lng, viewportBbox)) continue;
					// Never render gray dots in water (e.g. oceans). Treat "land" as inside any US state polygon.
					if (!isCoordsInAnyUsState(coords)) continue;
					inBounds.push(contact);
				}

				inBounds.sort((a, b) => a.id - b.id);
				nextAllContactsOverlayVisible = inBounds;
			}

			const nextAllKey = nextAllContactsOverlayVisible.map((c) => c.id).join(',');
			if (nextAllKey !== lastAllContactsOverlayVisibleContactsKeyRef.current) {
				lastAllContactsOverlayVisibleContactsKeyRef.current = nextAllKey;
				setAllContactsOverlayVisibleContacts(nextAllContactsOverlayVisible);
			}

			// Background dots are intentionally disabled.
		},
		[
			contactsWithCoords,
			getContactCoords,
			baseContactIdSet,
			selectedContacts,
			lockedStateKey,
			isCoordsInLockedState,
			isBookingSearch,
			bookingExtraContactsWithCoords,
			getBookingExtraContactCoords,
			isPromotionSearch,
			promotionOverlayContactsWithCoords,
			getPromotionOverlayContactCoords,
			isAnySearch,
			allContactsOverlayContactsWithCoords,
			getAllContactsOverlayContactCoords,
			isCoordsInAnyUsState,
		]
	);

	// Trigger background dots update when US state polygons become available or loading state changes
	useEffect(() => {
		if (!map) return;
		if (isBackgroundPresentation) return;
		recomputeViewportDots(map);
	}, [
		map,
		isBackgroundPresentation,
		isStateLayerReady,
		isLoading,
		recomputeViewportDots,
	]);

	useEffect(() => {
		if (!map) return;
		if (!isMapLoaded) return;
		if (isBackgroundPresentation) return;
		const onMoveEnd = () => {
			const zoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
			setZoomLevel(zoom);
			syncUsOnlyBasemapCartography(map);

			updateBookingExtraFetchBbox(map);
			updatePromotionOverlayFetchBbox(map);
			updateAllContactsOverlayFetchBbox(map);
			recomputeViewportDots(map);

			const bounds = map.getBounds();
			const center = map.getCenter();
			if (!bounds || !center) return;

			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast();
			const south = sw.lat;
			const west = sw.lng;
			const north = ne.lat;
			const east = ne.lng;

			// Skip antimeridian-crossing viewports (not relevant for our UI).
			if (east < west) return;

			const centerCoords = { lat: center.lat, lng: center.lng };

			const selectedBounds = selectedAreaBoundsRef.current;
			const isCenterInSelectedBounds = selectedBounds
				? centerCoords.lat >= selectedBounds.south &&
					centerCoords.lat <= selectedBounds.north &&
					centerCoords.lng >= selectedBounds.west &&
					centerCoords.lng <= selectedBounds.east
				: null;

			const isCenterInSearchArea =
				typeof isCenterInSelectedBounds === 'boolean'
					? isCenterInSelectedBounds
					: isCoordsInLockedState(centerCoords);

			onViewportIdleRef.current?.({
				bounds: { south, west, north, east },
				center: centerCoords,
				zoom,
				isCenterInSearchArea,
			});
		};
		map.on('moveend', onMoveEnd);
		// Initial fill
		onMoveEnd();
		return () => {
			map.off('moveend', onMoveEnd);
		};
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		syncUsOnlyBasemapCartography,
		recomputeViewportDots,
		updateBookingExtraFetchBbox,
		updatePromotionOverlayFetchBbox,
		updateAllContactsOverlayFetchBbox,
	]);

	// Notify the parent as soon as the user starts interacting with the viewport.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isBackgroundPresentation) return;
		const onMoveStart = () => {
			onViewportInteractionRef.current?.();
		};
		map.on('movestart', onMoveStart);
		return () => {
			map.off('movestart', onMoveStart);
		};
	}, [map, isMapLoaded, isBackgroundPresentation]);

	// Rectangle selection handlers (Mapbox mouse events).
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isBackgroundPresentation) return;
		map.on('mousedown', handleMapMouseDown);
		map.on('mousemove', handleMapMouseMove);
		map.on('mouseup', handleMapMouseUp);
		return () => {
			map.off('mousedown', handleMapMouseDown);
			map.off('mousemove', handleMapMouseMove);
			map.off('mouseup', handleMapMouseUp);
		};
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		handleMapMouseDown,
		handleMapMouseMove,
		handleMapMouseUp,
	]);

	// Toggle map interaction mode for rectangle selection.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isBackgroundPresentation) return;
		const selecting = areaSelectionEnabled || isAreaSelecting;
		try {
			if (selecting) {
				map.dragPan.disable();
				map.dragRotate.disable();
			} else {
				map.dragPan.enable();
				map.dragRotate.enable();
			}
		} catch {
			// Ignore (handlers may not be ready yet).
		}
	}, [map, isMapLoaded, isBackgroundPresentation, areaSelectionEnabled, isAreaSelecting]);

	// Draw a gray outline around the *group of states* that have results.
	// We union the result states' polygons so the outline is one shape.
	useEffect(() => {
		if (!map || !isMapLoaded || !isStateLayerReady) return;

		// Hide state outlines when using rectangle selection (selectedAreaBounds is set)
		// Clear outlines while loading or if no result states
		if (isLoading || !resultStateKeysSignature || selectedAreaBounds) {
			clearResultsOutline();
			return;
		}

		let cancelled = false;

		const run = async () => {
			const wanted = new Set(resultStateKeys);
			const stateMultiPolygons: ClippingMultiPolygon[] = [];
			for (const key of wanted) {
				const entry = usStatesByKeyRef.current.get(key);
				if (entry?.multiPolygon) stateMultiPolygons.push(entry.multiPolygon);
			}

			// If we couldn't resolve any polygons, nothing to outline.
			if (stateMultiPolygons.length === 0) {
				clearResultsOutline();
				return;
			}

			// Union all selected state polygons into one (or multiple if disjoint) outline.
			let unioned: ClippingMultiPolygon | null = null;
			const wasmGeo = await ensureWasmGeoModuleLoaded();
			if (typeof wasmGeo?.union_multi_polygons === 'function') {
				try {
					const out = wasmGeo.union_multi_polygons(stateMultiPolygons);
					if (Array.isArray(out) && out.length) unioned = out;
				} catch (err) {
					logWasmGeoRuntimeError(err);
				}
			}

			// TypeScript fallback: lazy-load polygon-clipping only if needed.
			if (!unioned) {
				try {
					const { unionClippingMultiPolygons } = await import('@/utils/polygonClipping');
					unioned = unionClippingMultiPolygons(...stateMultiPolygons);
				} catch (err) {
					console.error(
						'Failed to build state outline union; falling back to per-state outline',
						err
					);
				}
			}

			if (cancelled) return;

			// Clear the previous outline polygons
			clearResultsOutline();

			const multiPolygonsToRender: ClippingMultiPolygon =
				unioned && Array.isArray(unioned) && unioned.length
					? unioned
					: stateMultiPolygons.flat();

			const outlineFc = createOutlineGeoJsonFromMultiPolygon(multiPolygonsToRender);
			const source = map.getSource(MAPBOX_SOURCE_IDS.resultsOutline) as
				| mapboxgl.GeoJSONSource
				| undefined;
			source?.setData(outlineFc as any);

			// Store the selected region (used to exclude background dots inside the outline).
			resultsSelectionMultiPolygonRef.current = multiPolygonsToRender;
			resultsSelectionBboxRef.current = bboxFromMultiPolygon(multiPolygonsToRender);
		};

		void run();

		return () => {
			cancelled = true;
		};
	}, [
		map,
		isMapLoaded,
		isStateLayerReady,
		isLoading,
		resultStateKeys,
		resultStateKeysSignature,
		clearResultsOutline,
		selectedAreaBounds,
	]);

	// Draw a black outline around the searched/locked state (even when state interactions are off).
	// When state interactions are enabled, our interactive borders layer renders the selected state border.
	useEffect(() => {
		if (!map || !isMapLoaded || !isStateLayerReady) return;

		// Clear while loading
		if (isLoading) {
			clearSearchedStateOutline();
			lockedStateSelectionMultiPolygonRef.current = null;
			lockedStateSelectionBboxRef.current = null;
			lockedStateSelectionKeyRef.current = null;
			recomputeViewportDots(map);
			return;
		}

		if (!lockedStateKey) {
			clearSearchedStateOutline();
			lockedStateSelectionMultiPolygonRef.current = null;
			lockedStateSelectionBboxRef.current = null;
			lockedStateSelectionKeyRef.current = null;
			recomputeViewportDots(map);
			return;
		}

		const found = usStatesByKeyRef.current.get(lockedStateKey)?.multiPolygon ?? null;

		// Store polygon selection for marker "inside/outside" styling (even if we don't draw the outline).
		lockedStateSelectionMultiPolygonRef.current = found;
		lockedStateSelectionBboxRef.current = found ? bboxFromMultiPolygon(found) : null;
		lockedStateSelectionKeyRef.current = lockedStateKey;
		// The locked-state polygon is stored in refs (no rerender) — force a marker recompute
		// so low-zoom bias toward the locked state applies immediately.
		recomputeViewportDots(map);

		clearSearchedStateOutline();
		if (stateInteractionsEnabled || !found) return;

		const outlineFc = createOutlineGeoJsonFromMultiPolygon(found);
		const source = map.getSource(MAPBOX_SOURCE_IDS.lockedOutline) as
			| mapboxgl.GeoJSONSource
			| undefined;
		source?.setData(outlineFc as any);
	}, [
		map,
		isMapLoaded,
		isStateLayerReady,
		isLoading,
		lockedStateKey,
		stateInteractionsEnabled,
		clearSearchedStateOutline,
		recomputeViewportDots,
	]);

	// Track if we've done the initial bounds fit
	const hasFitBoundsRef = useRef(false);
	// Track the last contacts count to detect when results change
	const lastContactsCountRef = useRef(0);
	// Track first contact ID to detect when search results have changed
	const lastFirstContactIdRef = useRef<number | null>(null);
	// Track last locked state to detect new searches
	const lastLockedStateKeyRef = useRef<string | null>(null);
	// Track whether we've successfully fit to the locked state for the current key.
	// This prevents a race where we fit to contacts before the state GeoJSON layer is ready,
	// and then never zoom to the intended state once the layer finishes loading.
	const lastFitToLockedStateKeyRef = useRef<string | null>(null);
	// In search mode, use the query string as the stable "search session" key. This avoids
	// treating resorted/streaming results as a brand new search (which causes map bouncing).
	const lastSearchQueryKeyRef = useRef<string | null>(null);
	// Debounce auto-fit camera moves so rapid result updates don't cause zoom oscillation.
	const autoFitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Helper to fit map bounds with padding
	const fitMapToBounds = useCallback(
		(
			mapInstance: mapboxgl.Map,
			contactsList: ContactWithName[],
			opts?: {
				durationMs?: number;
			}
		) => {
			if (contactsList.length === 0) return;

			let bounds: mapboxgl.LngLatBounds | null = null;
			for (const contact of contactsList) {
				const coords = getContactCoords(contact);
				if (!coords) continue;
				const ll: [number, number] = [coords.lng, coords.lat];
				if (!bounds) bounds = new mapboxgl.LngLatBounds(ll, ll);
				else bounds.extend(ll);
			}

			if (!bounds) return;

			const dur = opts?.durationMs ?? 650;
			mapInstance.fitBounds(bounds, {
				padding: { top: 50, right: 50, bottom: 50, left: 50 },
				maxZoom: AUTO_FIT_CONTACTS_MAX_ZOOM,
				duration: dur,
				// Smooth ease-out for cinematic transitions (default Mapbox ease is too stiff at long durations).
				...(dur > 1000 ? { easing: (t: number) => 1 - Math.pow(1 - t, 3) } : {}),
			});
		},
		[getContactCoords]
	);

	// Helper to fit map to a state's bounds
	const fitMapToState = useCallback(
		(
			mapInstance: mapboxgl.Map,
			stateKey: string,
			opts?: {
				durationMs?: number;
			}
		) => {
			const entry = usStatesByKeyRef.current.get(stateKey);
			const bbox = entry?.bbox;
			if (!bbox) return false;

			const dur = opts?.durationMs ?? 650;
			mapInstance.fitBounds(
				[
					[bbox.minLng, bbox.minLat],
					[bbox.maxLng, bbox.maxLat],
				],
				{
					padding: { top: 100, right: 100, bottom: 100, left: 100 },
					maxZoom: AUTO_FIT_STATE_MAX_ZOOM,
					duration: dur,
					// Smooth ease-out for cinematic transitions.
					...(dur > 1000 ? { easing: (t: number) => 1 - Math.pow(1 - t, 3) } : {}),
				}
			);

			return true;
		},
		[]
	);

	// Fit bounds when contacts with coordinates change (or when the locked state changes).
	// Important: we still want to zoom to the locked state even if 0 contacts are geocoded yet.
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		// Skip auto-fit when in background/decorative mode or when explicitly requested.
		if (isBackgroundPresentation) return;
		if (skipAutoFit) return;

		// If no locked state is active, allow the next locked-state search to refit to its state.
		if (!lockedStateKey) {
			lastFitToLockedStateKeyRef.current = null;
		}

		const searchQueryKey = (searchQuery ?? '').trim();
		const isSearchMode = searchQueryKey.length > 0;

		// Check if this is a new set of search results.
		// In search mode, rely on the query string (stable). Outside of search mode,
		// fall back to the first contact id heuristic.
		const currentFirstId = contactsWithCoords[0]?.id ?? null;
		const isNewSearch = isSearchMode
			? searchQueryKey !== lastSearchQueryKeyRef.current
			: currentFirstId !== lastFirstContactIdRef.current;

		// If a *new* search query was executed while already in interactive mode, mark it as
		// pending-cinematic so the eventual first auto-fit for that query uses the longer duration
		// (even if contacts/state geometry arrive a moment later).
		if (isSearchMode && isNewSearch) {
			pendingSearchQueryCinematicRef.current = { key: searchQueryKey, at: Date.now() };
		} else if (!isSearchMode) {
			pendingSearchQueryCinematicRef.current = null;
		}

		// Check if the locked state changed (indicating a new search in a different state)
		const isNewStateSearch = lockedStateKey !== lastLockedStateKeyRef.current;

		// Only treat the locked state as a *real* US state if it's a known state abbreviation.
		// This prevents endless "fit to locked state" attempts for values like "Near Me" or city strings.
		const lockedStateKeyIsUsState =
			!!lockedStateKey &&
			Object.prototype.hasOwnProperty.call(stateBadgeColorMap, lockedStateKey);

		const hasFitLockedStateForKey =
			lockedStateKeyIsUsState && lastFitToLockedStateKeyRef.current === lockedStateKey;
		// Even if we've already fit to contacts, we still want to zoom to the locked state
		// once the state layer finishes loading (prevents "random" fallback viewports).
		const shouldFitLockedState =
			lockedStateKeyIsUsState && isStateLayerReady && !hasFitLockedStateForKey;

		// Fit bounds if:
		// 1. We haven't fit bounds yet (initial load after geocoding)
		// 2. This is a completely new search (first contact ID changed)
		// 3. The number of contacts with coords has increased (more were geocoded)
		// 4. The contacts list changed significantly (new search)
		const coordsJustBecameAvailable =
			lastContactsCountRef.current === 0 && contactsWithCoords.length > 0;
		const shouldFitBounds = isSearchMode
			? // In search mode, fit once per search/where change. Avoid repeated fits as results stream/reorder.
				!hasFitBoundsRef.current ||
				isNewSearch ||
				isNewStateSearch ||
				(!lockedStateKeyIsUsState && coordsJustBecameAvailable)
			: // Outside search mode (campaign contacts view), keep the existing "results changed" behavior.
				!hasFitBoundsRef.current ||
				isNewSearch ||
				isNewStateSearch ||
				contactsWithCoords.length > lastContactsCountRef.current ||
				Math.abs(contactsWithCoords.length - lastContactsCountRef.current) > 5;

		// Keep new-search detection refs up to date even if we can't fit yet.
		if (isSearchMode) lastSearchQueryKeyRef.current = searchQueryKey;
		else lastFirstContactIdRef.current = currentFirstId;
		lastLockedStateKeyRef.current = lockedStateKey;

		if (!shouldFitBounds && !shouldFitLockedState) return;

		// If we can't fit to anything yet (no coords and no state geometry ready), wait for the next update.
		const canFitToStateNow =
			lockedStateKeyIsUsState && !!lockedStateKey && isStateLayerReady;
		const canFitToBoundsNow = contactsWithCoords.length > 0;
		if (!canFitToStateNow && !canFitToBoundsNow) return;

		// Debounce camera moves so rapid updates don't cause zoom in/out oscillation.
		if (autoFitTimeoutRef.current) {
			clearTimeout(autoFitTimeoutRef.current);
			autoFitTimeoutRef.current = null;
		}

		const pendingSearch = pendingSearchQueryCinematicRef.current;
		const isSearchQueryCinematic =
			!!pendingSearch &&
			pendingSearch.key === searchQueryKey &&
			Date.now() - pendingSearch.at < 10_000;

		const autoFitDebounceMs =
			cinematicAutoFitRef.current || isSearchQueryCinematic ? 0 : 180;
		autoFitTimeoutRef.current = setTimeout(() => {
			// If a cinematic fly-in is already underway, don't restart the camera animation.
			if (cinematicInFlightRef.current) return;

			let didFit = false;
			const cinematicNow = cinematicAutoFitRef.current;
			const pendingClick = pendingStateClickCinematicRef.current;
			const isUserStateClickCinematic =
				!!pendingClick &&
				!!lockedStateKey &&
				pendingClick.key === lockedStateKey &&
				Date.now() - pendingClick.at < 10_000;
			const pendingSearchNow = pendingSearchQueryCinematicRef.current;
			const isSearchQueryCinematicNow =
				!!pendingSearchNow &&
				pendingSearchNow.key === searchQueryKey &&
				Date.now() - pendingSearchNow.at < 10_000;
			const durationMs =
				cinematicNow || isUserStateClickCinematic || isSearchQueryCinematicNow
					? DASHBOARD_TO_INTERACTIVE_TRANSITION_MS
					: 650;

			// If there's a locked state (searched state) and this is a new search or new state,
			// zoom to that state first for a better initial view (works even with 0 geocoded contacts).
			// Only do this when the locked state is actually a US state; otherwise we'd keep trying
			// to fit "Near Me" / city strings and cause bouncing.
			if (
				lockedStateKeyIsUsState &&
				lockedStateKey &&
				isStateLayerReady &&
				(isNewSearch ||
					isNewStateSearch ||
					!hasFitBoundsRef.current ||
					shouldFitLockedState)
			) {
				const didFitToState = fitMapToState(map, lockedStateKey, { durationMs });
				// Mark as attempted so we never loop (even if something unexpected prevents a fit).
				lastFitToLockedStateKeyRef.current = lockedStateKey;
				if (didFitToState) {
					didFit = true;
				} else if (contactsWithCoords.length > 0) {
					// Fallback to fitting to contacts if state geometry not found
					fitMapToBounds(map, contactsWithCoords, { durationMs });
					didFit = true;
				}
			} else if (contactsWithCoords.length > 0) {
				fitMapToBounds(map, contactsWithCoords, { durationMs });
				didFit = true;
			}

			// Only mark as "fit" if we actually moved the camera.
			if (didFit) {
				// Clear the user-click flag once we successfully kicked off the cinematic state zoom.
				if (isUserStateClickCinematic) {
					pendingStateClickCinematicRef.current = null;
				}
				// Clear the pending search flag once we successfully kicked off the cinematic search sweep.
				if (isSearchQueryCinematicNow) {
					pendingSearchQueryCinematicRef.current = null;
				}
				hasFitBoundsRef.current = true;
				lastContactsCountRef.current = contactsWithCoords.length;

				// If we temporarily allowed zoom < MAP_MIN_ZOOM to start the animation from the
				// decorative globe, restore the normal constraint once the camera settles.
				if (pendingMinZoomRestoreRef.current && !hasAttachedMinZoomRestoreRef.current) {
					hasAttachedMinZoomRestoreRef.current = true;
					try {
						map.once('moveend', () => {
							hasAttachedMinZoomRestoreRef.current = false;
							pendingMinZoomRestoreRef.current = false;
							try {
								map.setMinZoom(MAP_MIN_ZOOM);
							} catch {}
						});
					} catch {
						// Non-fatal.
						hasAttachedMinZoomRestoreRef.current = false;
						pendingMinZoomRestoreRef.current = false;
					}
				}

				// After the first fly-in from the dashboard globe, revert to normal timings.
				if (cinematicNow) {
					cinematicAutoFitRef.current = false;
					// Lock out resize/re-fit calls for the full duration of the camera sweep
					// so nothing interrupts the smooth animation.
					cinematicInFlightRef.current = true;
					if (cinematicInFlightTimerRef.current)
						clearTimeout(cinematicInFlightTimerRef.current);
					cinematicInFlightTimerRef.current = setTimeout(() => {
						cinematicInFlightRef.current = false;
						cinematicInFlightTimerRef.current = null;
					}, durationMs + 100); // small buffer past the animation end
				}
			}

			if (autoFitTimeoutRef.current) {
				clearTimeout(autoFitTimeoutRef.current);
				autoFitTimeoutRef.current = null;
			}
		}, autoFitDebounceMs);

		return () => {
			if (autoFitTimeoutRef.current) {
				clearTimeout(autoFitTimeoutRef.current);
				autoFitTimeoutRef.current = null;
			}
		};
	}, [
		map,
		isMapLoaded,
		isBackgroundPresentation,
		contactsWithCoords,
		fitMapToBounds,
		fitMapToState,
		lockedStateKey,
		isStateLayerReady,
		skipAutoFit,
		searchQuery,
	]);

	// If auto-fit is disabled, ensure we don't have a queued fit from a prior render.
	useEffect(() => {
		if (!skipAutoFit) return;
		if (autoFitTimeoutRef.current) {
			clearTimeout(autoFitTimeoutRef.current);
			autoFitTimeoutRef.current = null;
		}
	}, [skipAutoFit]);

	// Reset bounds tracking when contacts prop is empty (preparing for new search)
	useEffect(() => {
		if (contacts.length === 0) {
			hasFitBoundsRef.current = false;
			lastContactsCountRef.current = 0;
			lastFirstContactIdRef.current = null;
			lastLockedStateKeyRef.current = null;
		}
	}, [contacts]);

	const handleMarkerClick = (contact: ContactWithName) => {
		onMarkerClick?.(contact);
		// Toggle selection when clicking on a marker.
		// - Always allow selection toggling for primary result set.
		// - In Booking mode, also allow toggling on the zoom-in "extra" pins (even though they
		//   come from the map-overlay endpoint rather than the primary results list).
		const isPrimaryResult = baseContactIdSet.has(contact.id);
		const isBookingExtraResult =
			isBookingSearch && bookingExtraVisibleContacts.some((c) => c.id === contact.id);
		// - At extremely high zoom, also allow toggling for the "all contacts" gray-dot overlay.
		const isAllContactsOverlayResult = allContactsOverlayVisibleIdSetRef.current.has(
			contact.id
		);
		if (isPrimaryResult || isBookingExtraResult || isAllContactsOverlayResult) {
			onToggleSelection?.(contact.id);
		}
	};

	const handleMarkerMouseOver = useCallback(
		(contact: ContactWithName, domEvent?: MouseEvent | TouchEvent) => {
			// Don't trigger hover interactions until sufficiently zoomed in
			if (zoomLevel < HOVER_INTERACTION_MIN_ZOOM) return;

			hoverSourceRef.current = 'map';
			if (hoverClearTimeoutRef.current) {
				clearTimeout(hoverClearTimeoutRef.current);
				hoverClearTimeoutRef.current = null;
			}
			// Clear any fading tooltip when hovering a new marker
			if (fadingTooltipTimeoutRef.current) {
				clearTimeout(fadingTooltipTimeoutRef.current);
				fadingTooltipTimeoutRef.current = null;
			}
			setFadingTooltipId(null);

			hoveredMarkerIdRef.current = contact.id;
			setHoveredMarkerId(contact.id);

			const point = getClientPointFromDomEvent(domEvent);
			const meta: MarkerHoverMeta | undefined = point
				? { clientX: point.x, clientY: point.y }
				: undefined;

			onMarkerHover?.(contact, meta);
		},
		[onMarkerHover, zoomLevel]
	);

	const handleMarkerMouseOut = useCallback(
		(contactId: number) => {
			if (hoverClearTimeoutRef.current) {
				clearTimeout(hoverClearTimeoutRef.current);
			}
			hoverClearTimeoutRef.current = setTimeout(() => {
				if (hoveredMarkerIdRef.current !== contactId) return;
				hoveredMarkerIdRef.current = null;
				hoverSourceRef.current = null;
				// Start fade-out: set the fading tooltip to the current one
				setFadingTooltipId(contactId);
				setHoveredMarkerId(null);
				onMarkerHover?.(null);
				// Clear fading tooltip after transition completes (150ms matches CSS)
				if (fadingTooltipTimeoutRef.current) {
					clearTimeout(fadingTooltipTimeoutRef.current);
				}
				fadingTooltipTimeoutRef.current = setTimeout(() => {
					setFadingTooltipId(null);
				}, 150);
			}, 60);
		},
		[onMarkerHover]
	);

	// Allow the parent (map results panel) to drive marker hover state without triggering
	// `onMarkerHover` (which is reserved for true map interactions).
	useEffect(() => {
		// Keep behavior consistent with map hover: don't show hover tooltips when too zoomed out.
		if (zoomLevel < HOVER_INTERACTION_MIN_ZOOM) {
			if (hoverSourceRef.current !== 'external') return;
			const prevId = hoveredMarkerIdRef.current;
			hoverSourceRef.current = null;
			hoveredMarkerIdRef.current = null;
			setHoveredMarkerId(null);
			if (prevId != null) {
				setFadingTooltipId(prevId);
				if (fadingTooltipTimeoutRef.current)
					clearTimeout(fadingTooltipTimeoutRef.current);
				fadingTooltipTimeoutRef.current = setTimeout(() => setFadingTooltipId(null), 150);
			} else {
				setFadingTooltipId(null);
			}
			return;
		}

		const nextId = externallyHoveredContactId ?? null;

		// If the map is actively hovering something, don't override it from the panel.
		if (hoverSourceRef.current === 'map') return;

		if (nextId == null) {
			if (hoverSourceRef.current !== 'external') return;
			const prevId = hoveredMarkerIdRef.current;
			if (hoverClearTimeoutRef.current) {
				clearTimeout(hoverClearTimeoutRef.current);
				hoverClearTimeoutRef.current = null;
			}
			hoverSourceRef.current = null;
			hoveredMarkerIdRef.current = null;
			setHoveredMarkerId(null);
			if (prevId != null) {
				setFadingTooltipId(prevId);
				if (fadingTooltipTimeoutRef.current)
					clearTimeout(fadingTooltipTimeoutRef.current);
				fadingTooltipTimeoutRef.current = setTimeout(() => setFadingTooltipId(null), 150);
			} else {
				setFadingTooltipId(null);
			}
			return;
		}

		// No-op if already externally hovering this id.
		if (hoverSourceRef.current === 'external' && hoveredMarkerIdRef.current === nextId)
			return;

		if (hoverClearTimeoutRef.current) {
			clearTimeout(hoverClearTimeoutRef.current);
			hoverClearTimeoutRef.current = null;
		}
		if (fadingTooltipTimeoutRef.current) {
			clearTimeout(fadingTooltipTimeoutRef.current);
			fadingTooltipTimeoutRef.current = null;
		}
		setFadingTooltipId(null);
		hoverSourceRef.current = 'external';
		hoveredMarkerIdRef.current = nextId;
		setHoveredMarkerId(nextId);
		// If the hovered contact isn't currently rendered due to sampling, recompute the viewport
		// so the hovered marker can be included (if it is in-bounds).
		if (
			map &&
			!visibleContactIdSetRef.current.has(nextId) &&
			!bookingExtraVisibleIdSetRef.current.has(nextId) &&
			!allContactsOverlayVisibleIdSetRef.current.has(nextId)
		) {
			recomputeViewportDots(map);
		}
	}, [externallyHoveredContactId, map, recomputeViewportDots, zoomLevel]);

	// Calculate marker scale based on zoom level
	// At zoom 4 (zoomed out): scale ~3, at zoom 14 (zoomed in): scale ~11
	const markerScale = useMemo(() => {
		return getResultDotScaleForZoom(zoomLevel);
	}, [zoomLevel]);

	const markerPinUrlCacheRef = useRef<Map<string, string>>(new Map());
	const getMarkerPinUrl = useCallback(
		(
			fillColor: string,
			strokeColor: string,
			searchWhat?: string | null,
			baseColor?: string
		): string => {
			const key = `${fillColor}|${strokeColor}|${searchWhat ?? ''}|${baseColor ?? ''}`;
			const cached = markerPinUrlCacheRef.current.get(key);
			if (cached) return cached;
			const url = generateMapMarkerPinIconUrl(
				fillColor,
				strokeColor,
				searchWhat,
				baseColor
			);
			markerPinUrlCacheRef.current.set(key, url);
			return url;
		},
		[]
	);

	const defaultDotFillColor = useMemo(() => {
		return getResultDotColorForWhat(searchWhat);
	}, [searchWhat]);

	const outsideDefaultDotFillColor = useMemo(
		() => washOutHexColor(defaultDotFillColor, OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE),
		[defaultDotFillColor]
	);

	// Build fast id->contact lookups for Mapbox interactions/tooltips.
	const visibleContactsById = useMemo(
		() => new Map<number, ContactWithName>(visibleContacts.map((c) => [c.id, c])),
		[visibleContacts]
	);
	const bookingExtraContactsById = useMemo(
		() =>
			new Map<number, ContactWithName>(bookingExtraVisibleContacts.map((c) => [c.id, c])),
		[bookingExtraVisibleContacts]
	);
	const promotionOverlayContactsById = useMemo(
		() =>
			new Map<number, ContactWithName>(
				promotionOverlayVisibleContacts.map((c) => [c.id, c])
			),
		[promotionOverlayVisibleContacts]
	);
	const allOverlayContactsById = useMemo(
		() =>
			new Map<number, ContactWithName>(
				allContactsOverlayVisibleContacts.map((c) => [c.id, c])
			),
		[allContactsOverlayVisibleContacts]
	);

	// Marker hover/click + (optional) state hover/click interactions.
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const markerHitLayers = [
			MAPBOX_LAYER_IDS.baseHit,
			MAPBOX_LAYER_IDS.promotionDotHit,
			MAPBOX_LAYER_IDS.bookingPinHit,
			MAPBOX_LAYER_IDS.promotionPinHit,
			MAPBOX_LAYER_IDS.markersAllHit,
		];

		const getContactForHit = (layerId: string, id: number): ContactWithName | null => {
			if (layerId === MAPBOX_LAYER_IDS.baseHit)
				return visibleContactsById.get(id) ?? null;
			if (layerId === MAPBOX_LAYER_IDS.bookingPinHit)
				return bookingExtraContactsById.get(id) ?? null;
			if (
				layerId === MAPBOX_LAYER_IDS.promotionDotHit ||
				layerId === MAPBOX_LAYER_IDS.promotionPinHit
			) {
				return promotionOverlayContactsById.get(id) ?? null;
			}
			if (layerId === MAPBOX_LAYER_IDS.markersAllHit)
				return allOverlayContactsById.get(id) ?? null;
			return null;
		};

		const setCursor = (cursor: string) => {
			// Avoid fighting the rectangle-selection cursor.
			if (areaSelectionEnabled || isAreaSelecting) return;
			map.getCanvas().style.cursor = cursor;
		};

		const clearStateHover = () => {
			const prev = hoveredStateIdRef.current;
			if (prev == null) return;
			try {
				map.setFeatureState(
					{ source: MAPBOX_SOURCE_IDS.states, id: prev },
					{ hover: false }
				);
			} catch {
				// Ignore.
			}
			hoveredStateIdRef.current = null;
		};

		const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
			if (areaSelectionEnabled || isAreaSelecting) return;

			// Marker hover interactions only at sufficiently high zoom.
			const zoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
			if (zoom < HOVER_INTERACTION_MIN_ZOOM) {
				const prevHovered = hoveredMarkerIdRef.current;
				if (hoverSourceRef.current === 'map' && prevHovered != null) {
					handleMarkerMouseOut(prevHovered);
				}
				setCursor('');
			} else {
				const features = map.queryRenderedFeatures(e.point, { layers: markerHitLayers });
				const top = features[0];
				const layerId = top?.layer?.id;
				const rawId = top?.id;
				const id =
					typeof rawId === 'number'
						? rawId
						: typeof rawId === 'string'
							? Number.parseInt(rawId, 10)
							: NaN;

				if (layerId && Number.isFinite(id)) {
					const contact = getContactForHit(layerId, id);
					if (contact) {
						setCursor('pointer');
						if (hoverSourceRef.current !== 'map' || hoveredMarkerIdRef.current !== id) {
							handleMarkerMouseOver(
								contact,
								e.originalEvent as unknown as MouseEvent | TouchEvent
							);
						}
					} else {
						const prevHovered = hoveredMarkerIdRef.current;
						if (hoverSourceRef.current === 'map' && prevHovered != null) {
							handleMarkerMouseOut(prevHovered);
						}
						setCursor('');
					}
				} else {
					const prevHovered = hoveredMarkerIdRef.current;
					if (hoverSourceRef.current === 'map' && prevHovered != null) {
						handleMarkerMouseOut(prevHovered);
					}
					setCursor('');
				}
			}

			// Optional state hover highlight (only when state interactions are enabled).
			if (!stateInteractionsEnabled || !isStateLayerReady) {
				clearStateHover();
				return;
			}
			if (zoom > STATE_HOVER_HIGHLIGHT_MAX_ZOOM + 0.001) {
				clearStateHover();
				return;
			}

			// If a marker is hovered, don't also hover-highlight the state underneath.
			if (hoverSourceRef.current === 'map' && hoveredMarkerIdRef.current != null) {
				clearStateHover();
				return;
			}
			// While zooming-to-state after a state click (or while results are loading), don't show
			// hover overlays on other states as the camera sweeps.
			if (stateClickZoomInFlightRef.current || isLoadingRef.current) {
				clearStateHover();
				return;
			}

			const stateFeatures = map.queryRenderedFeatures(e.point, {
				layers: [MAPBOX_LAYER_IDS.statesFillHit],
			});
			const topState = stateFeatures[0];
			const nextStateId = topState?.id ?? null;
			const prev = hoveredStateIdRef.current;
			if (prev != null && prev !== nextStateId) {
				try {
					map.setFeatureState(
						{ source: MAPBOX_SOURCE_IDS.states, id: prev },
						{ hover: false }
					);
				} catch {
					// Ignore.
				}
			}
			if (nextStateId != null && nextStateId !== prev) {
				try {
					map.setFeatureState(
						{ source: MAPBOX_SOURCE_IDS.states, id: nextStateId },
						{ hover: true }
					);
				} catch {
					// Ignore.
				}
			}
			hoveredStateIdRef.current = nextStateId;
			if (nextStateId != null) {
				setCursor('pointer');
			}
		};

		const onClick = (e: mapboxgl.MapMouseEvent) => {
			// In select mode, clicks are part of drawing/finishing a rectangle selection.
			if (areaSelectionEnabled || isAreaSelecting) return;

			// Marker click takes priority over state click.
			const markerFeatures = map.queryRenderedFeatures(e.point, {
				layers: markerHitLayers,
			});
			const top = markerFeatures[0];
			const layerId = top?.layer?.id;
			const rawId = top?.id;
			const id =
				typeof rawId === 'number'
					? rawId
					: typeof rawId === 'string'
						? Number.parseInt(rawId, 10)
						: NaN;
			if (layerId && Number.isFinite(id)) {
				const contact = getContactForHit(layerId, id);
				if (contact) {
					handleMarkerClick(contact);
					return;
				}
			}

			// State click (when enabled and zoomed out).
			if (stateInteractionsEnabled && isStateLayerReady) {
				const zoom = map.getZoom() ?? MAP_DEFAULT_ZOOM;
				if (zoom <= STATE_HOVER_HIGHLIGHT_MAX_ZOOM + 0.001) {
					const stateFeatures = map.queryRenderedFeatures(e.point, {
						layers: [MAPBOX_LAYER_IDS.statesFillHit],
					});
					const topState = stateFeatures[0];
					const key = typeof topState?.id === 'string' ? topState.id : null;
					if (key) {
						// Prevent other states from briefly showing hover-fill while we zoom/search.
						stateClickZoomInFlightNonceRef.current += 1;
						const nonce = stateClickZoomInFlightNonceRef.current;
						stateClickZoomInFlightRef.current = true;
						clearStateHover();
						if (stateClickZoomInFlightTimeoutRef.current) {
							clearTimeout(stateClickZoomInFlightTimeoutRef.current);
							stateClickZoomInFlightTimeoutRef.current = null;
						}
						// Safety: never let this suppression get "stuck" if the camera doesn't move.
						stateClickZoomInFlightTimeoutRef.current = setTimeout(() => {
							if (stateClickZoomInFlightNonceRef.current !== nonce) return;
							stateClickZoomInFlightRef.current = false;
							stateClickZoomInFlightTimeoutRef.current = null;
						}, DASHBOARD_TO_INTERACTIVE_TRANSITION_MS + 2500);
						try {
							map.once('moveend', () => {
								if (stateClickZoomInFlightNonceRef.current !== nonce) return;
								stateClickZoomInFlightRef.current = false;
								if (stateClickZoomInFlightTimeoutRef.current) {
									clearTimeout(stateClickZoomInFlightTimeoutRef.current);
									stateClickZoomInFlightTimeoutRef.current = null;
								}
							});
						} catch {
							// Ignore.
						}

						// Mark this as a user-initiated state zoom so our subsequent fit-to-locked-state
						// uses the longer cinematic duration.
						pendingStateClickCinematicRef.current = { key, at: Date.now() };
						const nameRaw = (topState.properties as any)?.name;
						const name =
							typeof nameRaw === 'string' && nameRaw.trim().length > 0
								? nameRaw.trim()
								: key;
						setSelectedStateKey(key);
						onStateSelectRef.current?.(name);
						return;
					}
				}
			}

			// Click on empty map clears any selected marker panel.
			setSelectedMarker(null);
		};

		map.on('mousemove', onMouseMove);
		map.on('click', onClick);

		return () => {
			map.off('mousemove', onMouseMove);
			map.off('click', onClick);
			try {
				map.getCanvas().style.cursor = '';
			} catch {
				// Ignore.
			}
			clearStateHover();
		};
	}, [
		map,
		isMapLoaded,
		areaSelectionEnabled,
		isAreaSelecting,
		stateInteractionsEnabled,
		isStateLayerReady,
		visibleContactsById,
		bookingExtraContactsById,
		promotionOverlayContactsById,
		allOverlayContactsById,
		handleMarkerMouseOver,
		handleMarkerMouseOut,
		handleMarkerClick,
	]);

	// ---- Mapbox marker sources (rendered via layers) ----
	const pendingMapImageLoadsRef = useRef<Map<string, Promise<void>>>(new Map());

	// Rasterize an SVG data-URI to an ImageData via an off-screen canvas.
	// Mapbox GL's `map.loadImage()` doesn't reliably handle `data:image/svg+xml` URIs,
	// so we render the SVG into an <img> → canvas → ImageData and then call `addImage`.
	const rasterizeSvgDataUri = useCallback(
		(
			dataUri: string,
			width: number,
			height: number
		): Promise<{ width: number; height: number; data: Uint8ClampedArray }> => {
			return new Promise((resolve, reject) => {
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement('canvas');
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext('2d');
					if (!ctx) {
						reject(new Error('Canvas 2D context unavailable'));
						return;
					}
					ctx.drawImage(img, 0, 0, width, height);
					const imageData = ctx.getImageData(0, 0, width, height);
					resolve({ width, height, data: imageData.data });
				};
				img.onerror = (e) => reject(e);
				img.src = dataUri;
			});
		},
		[]
	);

	const ensureMapImageFromUrl = useCallback(
		(imageName: string, url: string): Promise<void> => {
			const mapInstance = mapRef.current;
			if (!mapInstance || !isMapLoaded) return Promise.resolve();
			if (mapInstance.hasImage(imageName)) return Promise.resolve();

			const pending = pendingMapImageLoadsRef.current.get(imageName);
			if (pending) return pending;

			// SVG data-URIs need manual rasterization; raster URLs can use loadImage directly.
			const isSvgDataUri = url.startsWith('data:image/svg');

			const promise = isSvgDataUri
				? (async () => {
						try {
							// Render at 2× for retina crispness.
							const scale = 2;
							const w = MAP_MARKER_PIN_VIEWBOX_WIDTH * scale;
							const h = MAP_MARKER_PIN_VIEWBOX_HEIGHT * scale;
							const imgData = await rasterizeSvgDataUri(url, w, h);
							const latestMap = mapRef.current;
							if (!latestMap || latestMap !== mapInstance) return;
							if (!latestMap.hasImage(imageName)) {
								latestMap.addImage(imageName, imgData, { pixelRatio: scale });
							}
						} catch (err) {
							console.error('Failed to rasterize SVG marker image', { imageName, err });
						} finally {
							pendingMapImageLoadsRef.current.delete(imageName);
						}
					})()
				: new Promise<void>((resolve) => {
						mapInstance.loadImage(url, (err, image) => {
							pendingMapImageLoadsRef.current.delete(imageName);
							const latestMap = mapRef.current;
							if (!latestMap || latestMap !== mapInstance) {
								resolve();
								return;
							}
							if (err || !image) {
								console.error('Failed to load Mapbox marker image', { imageName, err });
								resolve();
								return;
							}
							try {
								if (!latestMap.hasImage(imageName)) {
									latestMap.addImage(imageName, image);
								}
							} catch {
								// Ignore.
							}
							resolve();
						});
					});

			pendingMapImageLoadsRef.current.set(imageName, promise);
			return promise;
		},
		[isMapLoaded, rasterizeSvgDataUri]
	);

	const imageNameFromUrl = useCallback(
		(url: string) => `murmur-marker-${hashStringToStableKey(url)}`,
		[]
	);

	const promotionPinIdsRef = useRef<Set<number>>(new Set());
	const promotionDotIdsRef = useRef<Set<number>>(new Set());
	const baseDotsLastDataKeyRef = useRef<string>('');
	// Sync contacts prop length into a ref so the base-dots effect can detect
	// a stale-empty visibleContacts without adding contacts to its dep array.
	const contactsPropLengthRef = useRef(contacts.length);
	contactsPropLengthRef.current = contacts.length;
	// Guard transient empty-contact renders around query/refetch transitions.
	const baseDotsLastSearchKeyRef = useRef<string>((searchQuery ?? '').trim());
	const baseDotsPendingDataSearchKeyRef = useRef<string | null>(null);
	const baseDotsPendingDataSawLoadingRef = useRef<boolean>(false);
	const baseDotsPrevContactsPropLengthRef = useRef<number>(contacts.length);
	const baseDotsWaveMetaRef = useRef<DotWaveMeta | null>(null);
	const baseDotsWaveCancelRef = useRef<(() => void) | null>(null);
	const baseDotsWavePrevIsLoadingRef = useRef<boolean>(false);
	// Track the query key for which a wave should run (set when a *new* search starts loading).
	const baseDotsWavePendingSearchKeyRef = useRef<string | null>(null);
	// Tracks the last query key that actually played the base-dot wave animation.
	const baseDotsWaveLastSearchKeyRef = useRef<string>('');
	const stopBaseDotsWaveAndRestoreSteadyRendering = useCallback(() => {
		if (!map || !isMapLoaded) return;

		const cancel = baseDotsWaveCancelRef.current;
		if (cancel) {
			cancel();
			baseDotsWaveCancelRef.current = null;
		}

		try {
			if (map.getLayer(MAPBOX_LAYER_IDS.baseDots)) {
				const transition = { duration: 0, delay: 0 } as any;
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-opacity-transition',
					transition
				);
				(map as any).setPaintProperty(
					MAPBOX_LAYER_IDS.baseDots,
					'circle-stroke-opacity-transition',
					transition
				);
				(map as any).setPaintProperty(MAPBOX_LAYER_IDS.baseDots, 'circle-opacity', 1);
				(map as any).setPaintProperty(MAPBOX_LAYER_IDS.baseDots, 'circle-stroke-opacity', 1);
			}
		} catch {
			// Ignore style timing races.
		}

		try {
			if (map.getLayer(MAPBOX_LAYER_IDS.baseHit)) {
				map.setFilter(MAPBOX_LAYER_IDS.baseHit, null as any);
			}
		} catch {
			// Ignore style timing races.
		}
	}, [map, isMapLoaded]);

	// If the user starts panning/zooming while the post-search reveal wave is running,
	// switch back to steady rendering so newly sampled viewport dots don't appear to vanish.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const onMoveStart = () => {
			if (!baseDotsWaveCancelRef.current) return;
			stopBaseDotsWaveAndRestoreSteadyRendering();
		};
		map.on('movestart', onMoveStart);
		return () => {
			map.off('movestart', onMoveStart);
		};
	}, [map, isMapLoaded, stopBaseDotsWaveAndRestoreSteadyRendering]);

	// Base result dots
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.markersBase) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;
		const searchKey = (searchQuery ?? '').trim();
		const loading = Boolean(isLoading);
		const hasLoadingSignal = typeof isLoading === 'boolean';
		const prevContactsLen = baseDotsPrevContactsPropLengthRef.current;
		baseDotsPrevContactsPropLengthRef.current = contacts.length;

		if (searchKey !== baseDotsLastSearchKeyRef.current) {
			baseDotsLastSearchKeyRef.current = searchKey;
			baseDotsPendingDataSearchKeyRef.current = searchKey;
			baseDotsPendingDataSawLoadingRef.current = loading;
		} else if (loading && baseDotsPendingDataSearchKeyRef.current === searchKey) {
			baseDotsPendingDataSawLoadingRef.current = true;
		} else if (
			!loading &&
			searchKey.length > 0 &&
			prevContactsLen > 0 &&
			contacts.length === 0
		) {
			// Same-query refetch path: parent can momentarily clear contacts before
			// loading flips true. Arm the same empty-commit guard used for new queries.
			baseDotsPendingDataSearchKeyRef.current = searchKey;
			baseDotsPendingDataSawLoadingRef.current = false;
		}

		if (loading) {
			// Stop any in-flight reveal animation while loading/refetching.
			if (baseDotsWaveCancelRef.current) {
				baseDotsWaveCancelRef.current();
				baseDotsWaveCancelRef.current = null;
			}
			baseDotsWaveMetaRef.current = null;
			// Keep currently-rendered dots visible during refetches to avoid zoom flicker.
			return;
		}

		const hasLockedStateSelection = Boolean(
			lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey
		);

		type DotSeed = { id: number; lng: number; lat: number; fillColor: string };
		const dots: DotSeed[] = [];
		let minLng = Number.POSITIVE_INFINITY;
		let maxLng = Number.NEGATIVE_INFINITY;
		let minLat = Number.POSITIVE_INFINITY;
		let maxLat = Number.NEGATIVE_INFINITY;

		for (const contact of visibleContacts) {
			const coords = getContactCoords(contact);
			if (!coords) continue;
			const isOutsideLockedState = hasLockedStateSelection
				? !isCoordsInLockedState(coords)
				: false;
			const fillColor = isOutsideLockedState
				? outsideDefaultDotFillColor
				: defaultDotFillColor;
			dots.push({ id: contact.id, lng: coords.lng, lat: coords.lat, fillColor });
			minLng = Math.min(minLng, coords.lng);
			maxLng = Math.max(maxLng, coords.lng);
			minLat = Math.min(minLat, coords.lat);
			maxLat = Math.max(maxLat, coords.lat);
		}

		// For a newly issued query/refetch, ignore transient empty pushes until
		// we've observed a loading phase for that same query key.
		if (
			dots.length === 0 &&
			hasLoadingSignal &&
			baseDotsPendingDataSearchKeyRef.current === searchKey &&
			!baseDotsPendingDataSawLoadingRef.current
		) {
			return;
		}

		// Guard against the one-render gap where isLoading just turned false but
		// visibleContacts hasn't been repopulated by recomputeViewportDots yet.
		// Without this, setData would briefly clear all dots before the next render
		// fills them back in, producing a visible disappear/reappear flicker.
		if (dots.length === 0 && contactsPropLengthRef.current > 0) {
			return;
		}

		// Fingerprint the data so we skip redundant setData calls that cause
		// Mapbox to briefly clear and re-render the same features (flicker).
		let dataKey = '';
		for (let i = 0; i < dots.length; i++) {
			const d = dots[i];
			dataKey += (i > 0 ? ',' : '') + d.id + ':' + d.fillColor;
		}
		if (dataKey === baseDotsLastDataKeyRef.current) {
			return;
		}
		baseDotsLastDataKeyRef.current = dataKey;

		// Interrupt the reveal wave before swapping source data; otherwise the in-flight
		// opacity expression can keep newly sampled dots hidden until old delays elapse.
		if (baseDotsWaveCancelRef.current) {
			stopBaseDotsWaveAndRestoreSteadyRendering();
		}

		const travelMs = computeDotWaveTravelMs(dots.length);
		let maxDelayMs = 0;
		const features: any[] = dots.map((dot) => {
			const delayMs = computeDotWaveDelayMs(dot.id, dot.lng, dot.lat, minLng, maxLng, minLat, maxLat, travelMs);
			maxDelayMs = Math.max(maxDelayMs, delayMs);
			return {
				type: 'Feature',
				id: dot.id,
				properties: {
					fillColor: dot.fillColor,
					[DOT_WAVE_DELAY_PROP]: delayMs,
				},
				geometry: { type: 'Point', coordinates: [dot.lng, dot.lat] },
			};
		});

		baseDotsWaveMetaRef.current = features.length > 0 ? { maxDelayMs } : null;

		// Prevent "show -> hide -> reveal" flicker: if the wave reveal is about to start
		// on this render, pre-prime frame 0 before updating source data so dots don't
		// flash visible for one frame and then disappear.
		let prefersReducedMotion = false;
		try {
			prefersReducedMotion =
				typeof window !== 'undefined' &&
				typeof window.matchMedia === 'function' &&
				window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		} catch {
			prefersReducedMotion = false;
		}
		prefersReducedMotion = prefersReducedMotion || disableDotWaveReveal;
		// During long camera eases (e.g. cinematic fitBounds after a top-search),
		// avoid priming the "hide then reveal" wave frame. Otherwise dots can
		// disappear mid-flight and then reappear as the wave runs.
		let isCameraMoving = false;
		try {
			isCameraMoving = map.isMoving();
		} catch {
			isCameraMoving = false;
		}
		const shouldPrimeWaveFrameZero =
			baseDotsWavePrevIsLoadingRef.current &&
			searchKey.length > 0 &&
			!isBackgroundPresentation &&
			!prefersReducedMotion &&
			baseDotsWavePendingSearchKeyRef.current === searchKey &&
			features.length > 0 &&
			!isCameraMoving;
		if (shouldPrimeWaveFrameZero) {
			const expr0 = [
				'interpolate',
				DOT_WAVE_EASING,
				['-', 0, ['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0]],
				0,
				0,
				DOT_WAVE_FADE_MS,
				1,
			] as any;
			try {
				if (map.getLayer(MAPBOX_LAYER_IDS.baseDots)) {
					(map as any).setPaintProperty(MAPBOX_LAYER_IDS.baseDots, 'circle-opacity', expr0);
					(map as any).setPaintProperty(
						MAPBOX_LAYER_IDS.baseDots,
						'circle-stroke-opacity',
						expr0
					);
				}
			} catch {
				// Ignore.
			}
			try {
				if (map.getLayer(MAPBOX_LAYER_IDS.baseHit)) {
					map.setFilter(
						MAPBOX_LAYER_IDS.baseHit,
						['<=', ['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0], -1] as any
					);
				}
			} catch {
				// Ignore.
			}
		}
		source.setData({ type: 'FeatureCollection', features } as any);
		if (baseDotsPendingDataSearchKeyRef.current === searchKey) {
			baseDotsPendingDataSearchKeyRef.current = null;
			baseDotsPendingDataSawLoadingRef.current = false;
		}
	}, [
		map,
		isMapLoaded,
		isLoading,
		contacts.length,
		visibleContacts,
		getContactCoords,
		defaultDotFillColor,
		outsideDefaultDotFillColor,
		lockedStateKey,
		isStateLayerReady,
		isCoordsInLockedState,
		searchQuery,
		isBackgroundPresentation,
		stopBaseDotsWaveAndRestoreSteadyRendering,
	]);

	// Wave reveal for base dots on each completed search (left → right).
	useEffect(() => {
		if (!map || !isMapLoaded) return;

		const safeSetFilter = (layerId: string, filter: any) => {
			try {
				if (!map.getLayer(layerId)) return;
				map.setFilter(layerId, filter);
			} catch {
				// Ignore.
			}
		};
		const safeClearFilter = (layerId: string) => {
			try {
				if (!map.getLayer(layerId)) return;
				map.setFilter(layerId, null as any);
			} catch {
				// Ignore.
			}
		};
		const safeSetPaint = (layerId: string, prop: string, value: any) => {
			try {
				if (!map.getLayer(layerId)) return;
				// Mapbox types are a strict union of paint keys; we intentionally set a small dynamic set.
				(map as any).setPaintProperty(layerId, prop, value);
			} catch {
				// Ignore.
			}
		};

		const stopRunningWave = () => {
			if (baseDotsWaveCancelRef.current) {
				baseDotsWaveCancelRef.current();
				baseDotsWaveCancelRef.current = null;
			}
		};

		const restoreBaseDotsRendering = (transitionMs = 0) => {
			// Reset base dots to normal rendering (no animated expression).
			// IMPORTANT: set transitions *before* opacity changes.
			const transition = { duration: transitionMs, delay: 0 } as any;
			safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-opacity-transition', transition);
			safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-stroke-opacity-transition', transition);
			safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-opacity', 1);
			safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-stroke-opacity', 1);
			safeClearFilter(MAPBOX_LAYER_IDS.baseHit);
		};

		const loading = Boolean(isLoading);
		const searchKey = (searchQuery ?? '').trim();
		const isSearchMode = searchKey.length > 0;
		const prevLoading = baseDotsWavePrevIsLoadingRef.current;
		const isNewSearchKey =
			isSearchMode && baseDotsWaveLastSearchKeyRef.current !== searchKey;

		let prefersReducedMotion = false;
		try {
			prefersReducedMotion =
				typeof window !== 'undefined' &&
				typeof window.matchMedia === 'function' &&
				window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		} catch {
			prefersReducedMotion = false;
		}
		prefersReducedMotion = prefersReducedMotion || disableDotWaveReveal;

		// During loading (or in decorative mode), keep everything stable and avoid running reveal.
		if (loading || isBackgroundPresentation || !isSearchMode || prefersReducedMotion) {
			// Only schedule a wave when a *new* search actually enters a loading state.
			// This prevents zoom/viewport refetches from triggering a full hide→reveal cycle.
			if (loading && isNewSearchKey) {
				const pendingCinematic = pendingSearchQueryCinematicRef.current;
				const isCinematicSearchKey =
					!!pendingCinematic &&
					pendingCinematic.key === searchKey &&
					Date.now() - pendingCinematic.at < 10_000;

				// In fullscreen map-view searches we often kick off a long cinematic camera ease.
				// Running the hide→reveal wave during that sweep causes dots to disappear/reappear.
				// Mark the search as "handled" so we keep dots steady instead.
				if (isCinematicSearchKey) {
					baseDotsWaveLastSearchKeyRef.current = searchKey;
					baseDotsWavePendingSearchKeyRef.current = null;
				} else {
					baseDotsWavePendingSearchKeyRef.current = searchKey;
				}
			}

			stopRunningWave();
			restoreBaseDotsRendering(0);
			baseDotsWavePrevIsLoadingRef.current = loading;
			// When not in search mode, allow future searches to animate again.
			if (!isSearchMode) {
				baseDotsWaveLastSearchKeyRef.current = '';
				baseDotsWavePendingSearchKeyRef.current = null;
			} else if (!loading && baseDotsWavePendingSearchKeyRef.current === searchKey) {
				// If we decided not to animate for this search (decorative mode / reduced motion),
				// mark it as handled so it doesn't unexpectedly animate later.
				baseDotsWaveLastSearchKeyRef.current = searchKey;
				baseDotsWavePendingSearchKeyRef.current = null;
			}
			return;
		}

		const shouldStartWave =
			prevLoading &&
			!loading &&
			baseDotsWavePendingSearchKeyRef.current === searchKey;
		baseDotsWavePrevIsLoadingRef.current = loading;

		if (!shouldStartWave) return;

		// If the map camera is still moving/easing (common in cinematic search sweeps),
		// keep dots steady. Starting the wave now causes a visible disappear/reappear flicker.
		let isCameraMoving = false;
		try {
			isCameraMoving = map.isMoving();
		} catch {
			isCameraMoving = false;
		}
		if (isCameraMoving) {
			stopRunningWave();
			restoreBaseDotsRendering(0);
			baseDotsWaveLastSearchKeyRef.current = searchKey;
			baseDotsWavePendingSearchKeyRef.current = null;
			return;
		}

		stopRunningWave();

		const meta = baseDotsWaveMetaRef.current;
		if (!meta || !Number.isFinite(meta.maxDelayMs) || meta.maxDelayMs <= 0) {
			restoreBaseDotsRendering(0);
			baseDotsWaveLastSearchKeyRef.current = searchKey;
			baseDotsWavePendingSearchKeyRef.current = null;
			return;
		}
		baseDotsWaveLastSearchKeyRef.current = searchKey;
		baseDotsWavePendingSearchKeyRef.current = null;

		// Enable smooth transitions between throttled paint updates.
		// A duration slightly longer than the frame interval lets Mapbox interpolate
		// between our discrete expression snapshots, eliminating visible stepping.
		safeSetPaint(
			MAPBOX_LAYER_IDS.baseDots,
			'circle-opacity-transition',
			{ duration: DOT_WAVE_SMOOTH_TRANSITION_MS, delay: 0 } as any
		);
		safeSetPaint(
			MAPBOX_LAYER_IDS.baseDots,
			'circle-stroke-opacity-transition',
			{ duration: DOT_WAVE_SMOOTH_TRANSITION_MS, delay: 0 } as any
		);

		const buildOpacityExpr = (nowMs: number) => {
			return [
				'interpolate',
				DOT_WAVE_EASING,
				['-', nowMs, ['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0]],
				0,
				0,
				DOT_WAVE_FADE_MS,
				1,
			] as any;
		};

		// Start non-interactive; we'll enable hits as the wave reaches dots.
		safeSetFilter(
			MAPBOX_LAYER_IDS.baseHit,
			['<=', ['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0], -1] as any
		);

		let cancelled = false;
		let rafId: number | null = null;
		let lastPaintUpdateAt = -Infinity;
		let lastHitUpdateAt = -Infinity;
		const start = performance.now();
		const totalMs = meta.maxDelayMs + DOT_WAVE_FADE_MS + 120;

		const cancel = () => {
			cancelled = true;
			if (rafId != null) cancelAnimationFrame(rafId);
			rafId = null;
		};

		const tick = () => {
			if (cancelled) return;
			const now = performance.now();
			const t = now - start;

			if (t - lastPaintUpdateAt >= DOT_WAVE_FRAME_MS) {
				const expr = buildOpacityExpr(t);
				safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-opacity', expr);
				safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-stroke-opacity', expr);
				lastPaintUpdateAt = t;
			}

			// Don't churn filters at 60fps; updating every ~90ms is plenty for hit gating.
			if (t - lastHitUpdateAt >= 90) {
				safeSetFilter(
					MAPBOX_LAYER_IDS.baseHit,
					['<=', ['coalesce', ['get', DOT_WAVE_DELAY_PROP], 0], t] as any
				);
				lastHitUpdateAt = t;
			}

			if (t < totalMs) {
				rafId = requestAnimationFrame(tick);
				return;
			}

			// Finished: hand off smoothly to steady-state rendering/interactivity.
			restoreBaseDotsRendering(90);
			cancel();
			if (baseDotsWaveCancelRef.current === cancel) baseDotsWaveCancelRef.current = null;
		};
		baseDotsWaveCancelRef.current = cancel;

		// Prime frame 0 (all hidden) before the first rAF callback.
		const expr0 = buildOpacityExpr(0);
		safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-opacity', expr0);
		safeSetPaint(MAPBOX_LAYER_IDS.baseDots, 'circle-stroke-opacity', expr0);

		rafId = requestAnimationFrame(tick);

		return () => {
			cancel();
			if (baseDotsWaveCancelRef.current === cancel) baseDotsWaveCancelRef.current = null;
		};
	}, [map, isMapLoaded, isLoading, isBackgroundPresentation, searchQuery]);

	// All-contacts overlay (gray dots)
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.markersAllOverlay) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;

		if (isLoading) {
			// Preserve existing overlay dots while parent data is refetching.
			return;
		}

		const features: any[] = [];
		for (const contact of allContactsOverlayVisibleContacts) {
			const coords = getAllContactsOverlayContactCoords(contact);
			if (!coords) continue;
			features.push({
				type: 'Feature',
				id: contact.id,
				properties: { fillColor: ALL_CONTACTS_OVERLAY_DOT_FILL_COLOR },
				geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
			});
		}

		source.setData({ type: 'FeatureCollection', features } as any);
	}, [
		map,
		isMapLoaded,
		isLoading,
		allContactsOverlayVisibleContacts,
		getAllContactsOverlayContactCoords,
	]);

	// Promotion overlay: split into in-state dots vs out-of-state pins
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const dotSource = map.getSource(MAPBOX_SOURCE_IDS.markersPromotionDot) as
			| mapboxgl.GeoJSONSource
			| undefined;
		const pinSource = map.getSource(MAPBOX_SOURCE_IDS.markersPromotionPin) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!dotSource || !pinSource) return;

		if (isLoading) {
			// Preserve existing promotion markers while parent data is refetching.
			return;
		}

		let cancelled = false;

		const run = async () => {
			const hasLockedStateSelection = Boolean(
				lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey
			);

			const dotFeatures: any[] = [];
			const pinFeatures: any[] = [];
			const dotIds = new Set<number>();
			const pinIds = new Set<number>();
			const imagesToEnsure = new Map<string, string>(); // name -> url

			for (const contact of promotionOverlayVisibleContacts) {
				const coords = getPromotionOverlayContactCoords(contact);
				if (!coords) continue;

				const isOutsideLockedState = hasLockedStateSelection
					? !isCoordsInLockedState(coords)
					: false;
				const shouldUsePinStyle = !hasLockedStateSelection || isOutsideLockedState;

				const whatForMarker =
					getPromotionOverlayWhatFromContactTitle(contact.title) ?? null;
				const dotFillColor = getResultDotColorForWhat(whatForMarker);
				const dotFillColorOutside = washOutHexColor(
					dotFillColor,
					OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE
				);
				const pinFillColor = isOutsideLockedState ? dotFillColorOutside : dotFillColor;

				if (!shouldUsePinStyle) {
					dotIds.add(contact.id);
					dotFeatures.push({
						type: 'Feature',
						id: contact.id,
						properties: { fillColor: dotFillColor },
						geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
					});
					continue;
				}

				pinIds.add(contact.id);
				const defaultUrl = getMarkerPinUrl(
					pinFillColor,
					RESULT_DOT_STROKE_COLOR_DEFAULT,
					whatForMarker
				);
				const selectedUrl = getMarkerPinUrl(
					pinFillColor,
					RESULT_DOT_STROKE_COLOR_SELECTED,
					whatForMarker
				);
				const iconDefault = imageNameFromUrl(defaultUrl);
				const iconSelected = imageNameFromUrl(selectedUrl);
				imagesToEnsure.set(iconDefault, defaultUrl);
				imagesToEnsure.set(iconSelected, selectedUrl);

				pinFeatures.push({
					type: 'Feature',
					id: contact.id,
					properties: { iconDefault, iconSelected },
					geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
				});
			}

			await Promise.all(
				Array.from(imagesToEnsure.entries()).map(([name, url]) =>
					ensureMapImageFromUrl(name, url)
				)
			);

			if (cancelled) return;

			dotSource.setData({ type: 'FeatureCollection', features: dotFeatures } as any);
			pinSource.setData({ type: 'FeatureCollection', features: pinFeatures } as any);
			promotionDotIdsRef.current = dotIds;
			promotionPinIdsRef.current = pinIds;
		};

		void run();

		return () => {
			cancelled = true;
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		promotionOverlayVisibleContacts,
		lockedStateKey,
		isStateLayerReady,
		getPromotionOverlayContactCoords,
		isCoordsInLockedState,
		getMarkerPinUrl,
		imageNameFromUrl,
		ensureMapImageFromUrl,
	]);

	// Booking extra pins
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const source = map.getSource(MAPBOX_SOURCE_IDS.markersBookingPin) as
			| mapboxgl.GeoJSONSource
			| undefined;
		if (!source) return;

		if (isLoading) {
			// Preserve existing booking markers while parent data is refetching.
			return;
		}

		let cancelled = false;

		const run = async () => {
			const hasLockedStateSelection = Boolean(
				lockedStateKey && lockedStateSelectionKeyRef.current === lockedStateKey
			);

			const features: any[] = [];
			const imagesToEnsure = new Map<string, string>(); // name -> url

			for (const contact of bookingExtraVisibleContacts) {
				const coords = getBookingExtraContactCoords(contact);
				if (!coords) continue;

				const isOutsideLockedState = hasLockedStateSelection
					? !isCoordsInLockedState(coords)
					: false;
				const whatForMarker =
					getBookingTitlePrefixFromContactTitle(contact.title) ?? null;
				const dotFillColor = getResultDotColorForWhat(whatForMarker);
				const dotFillColorOutside = washOutHexColor(
					dotFillColor,
					OUTSIDE_LOCKED_STATE_WASHOUT_TO_WHITE
				);
				const pinFillColor = isOutsideLockedState ? dotFillColorOutside : dotFillColor;

				const defaultUrl = getMarkerPinUrl(
					pinFillColor,
					RESULT_DOT_STROKE_COLOR_DEFAULT,
					whatForMarker,
					RESULT_DOT_STROKE_COLOR_DEFAULT
				);
				const hoverUrl = getMarkerPinUrl(
					pinFillColor,
					BOOKING_EXTRA_PIN_HOVER_STROKE_COLOR,
					whatForMarker,
					BOOKING_EXTRA_PIN_HOVER_STROKE_COLOR
				);
				const selectedUrl = getMarkerPinUrl(
					pinFillColor,
					RESULT_DOT_STROKE_COLOR_SELECTED,
					whatForMarker,
					RESULT_DOT_STROKE_COLOR_SELECTED
				);

				const iconDefault = imageNameFromUrl(defaultUrl);
				const iconHover = imageNameFromUrl(hoverUrl);
				const iconSelected = imageNameFromUrl(selectedUrl);
				imagesToEnsure.set(iconDefault, defaultUrl);
				imagesToEnsure.set(iconHover, hoverUrl);
				imagesToEnsure.set(iconSelected, selectedUrl);

				features.push({
					type: 'Feature',
					id: contact.id,
					properties: {
						iconDefault,
						iconHover,
						iconSelected,
						category: whatForMarker ?? '',
					},
					geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
				});
			}

			await Promise.all(
				Array.from(imagesToEnsure.entries()).map(([name, url]) =>
					ensureMapImageFromUrl(name, url)
				)
			);

			if (cancelled) return;
			source.setData({ type: 'FeatureCollection', features } as any);
		};

		void run();

		return () => {
			cancelled = true;
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		bookingExtraVisibleContacts,
		lockedStateKey,
		isStateLayerReady,
		getBookingExtraContactCoords,
		isCoordsInLockedState,
		getMarkerPinUrl,
		imageNameFromUrl,
		ensureMapImageFromUrl,
	]);

	// Keep Mapbox marker "selected" feature-state in sync with `selectedContacts`.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const selectedSet = new Set<number>(selectedContacts);

		const setSelectedSafe = (sourceId: string, id: number, selected: boolean) => {
			try {
				map.setFeatureState({ source: sourceId, id }, { selected });
			} catch {
				// Ignore (feature may not exist yet in the source).
			}
		};

		for (const c of visibleContacts) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersBase, c.id, selectedSet.has(c.id));
		}
		for (const c of bookingExtraVisibleContacts) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersBookingPin, c.id, selectedSet.has(c.id));
		}
		for (const id of promotionDotIdsRef.current) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersPromotionDot, id, selectedSet.has(id));
		}
		for (const id of promotionPinIdsRef.current) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersPromotionPin, id, selectedSet.has(id));
		}
		for (const c of allContactsOverlayVisibleContacts) {
			setSelectedSafe(MAPBOX_SOURCE_IDS.markersAllOverlay, c.id, selectedSet.has(c.id));
		}
	}, [
		map,
		isMapLoaded,
		selectedContacts,
		visibleContacts,
		bookingExtraVisibleContacts,
		allContactsOverlayVisibleContacts,
		promotionOverlayVisibleContacts,
	]);

	// Booking UX: highlight all booking extra pins of the hovered category.
	// Uses a single setFilter call on the hover layer instead of N setFeatureState calls,
	// so highlight/un-highlight is O(1) regardless of how many pins are in view.
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		const layer = MAPBOX_LAYER_IDS.bookingPinIconsHover;
		if (!map.getLayer(layer)) return;
		const cat = hoveredBookingExtraCategory;
		// Match features whose `category` property equals the hovered category.
		// When no category is hovered, match nothing (empty string never stored as a real category).
		map.setFilter(layer, ['==', ['get', 'category'], cat ?? '']);
	}, [map, isMapLoaded, hoveredBookingExtraCategory]);

	// Larger leave buffer zone - how much extra padding below the tooltip for hysteresis
	const hoverLeaveBufferPx = useMemo(() => {
		// The buffer should be roughly the size the hit area used to be (2x marker)
		// This prevents flicker when moving off the marker
		return markerScale * 2;
	}, [markerScale]);

	const selectedContactIdSet = useMemo(
		() => new Set<number>(selectedContacts),
		[selectedContacts]
	);

	// Selected marker "Research" panel anchoring (HTML overlay positioned with map.project).
	const selectedMarkerCoords = selectedMarker ? getContactCoords(selectedMarker) : null;
	const selectedMarkerOverlayRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isLoading) return;
		const el = selectedMarkerOverlayRef.current;
		if (!el || !selectedMarkerCoords) return;

		const update = () => {
			const p = map.project([selectedMarkerCoords.lng, selectedMarkerCoords.lat]);
			const rect = el.getBoundingClientRect();
			const x = p.x - rect.width / 2;
			const y = p.y - rect.height - 20;
			el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
		};

		update();
		map.on('move', update);
		return () => {
			map.off('move', update);
		};
	}, [map, isMapLoaded, isLoading, selectedMarkerCoords?.lat, selectedMarkerCoords?.lng]);

	// Hover tooltip anchoring (single overlay).
	const hoverTooltipContactId = hoveredMarkerId ?? fadingTooltipId;
	const hoverTooltipEntry = useMemo(() => {
		if (hoverTooltipContactId == null) return null;
		const base = visibleContactsById.get(hoverTooltipContactId);
		if (base) return { kind: 'base' as const, contact: base };
		const booking = bookingExtraContactsById.get(hoverTooltipContactId);
		if (booking) return { kind: 'booking' as const, contact: booking };
		const promo = promotionOverlayContactsById.get(hoverTooltipContactId);
		if (promo) return { kind: 'promotion' as const, contact: promo };
		const all = allOverlayContactsById.get(hoverTooltipContactId);
		if (all) return { kind: 'all' as const, contact: all };
		return null;
	}, [
		hoverTooltipContactId,
		visibleContactsById,
		bookingExtraContactsById,
		promotionOverlayContactsById,
		allOverlayContactsById,
	]);

	const hoverTooltipCoords = useMemo(() => {
		if (!hoverTooltipEntry) return null;
		const c = hoverTooltipEntry.contact;
		switch (hoverTooltipEntry.kind) {
			case 'base':
				return getContactCoords(c);
			case 'booking':
				return getBookingExtraContactCoords(c);
			case 'promotion':
				return getPromotionOverlayContactCoords(c);
			case 'all':
				return getAllContactsOverlayContactCoords(c);
			default:
				return null;
		}
	}, [
		hoverTooltipEntry,
		getContactCoords,
		getBookingExtraContactCoords,
		getPromotionOverlayContactCoords,
		getAllContactsOverlayContactCoords,
	]);

	const hoverTooltipData = useMemo(() => {
		if (!hoverTooltipEntry) return null;
		const contact = hoverTooltipEntry.contact;
		const kind = hoverTooltipEntry.kind;
		const isSelected = selectedContactIdSet.has(contact.id);

		const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
		const nameForTooltip = fullName || contact.name || '';
		const companyForTooltip = contact.company || '';
		const titleForTooltip = (contact.title || contact.headline || '').trim();

		if (kind === 'all') {
			const tooltipFillColor = isSelected
				? TOOLTIP_FILL_COLOR_SELECTED
				: ALL_CONTACTS_OVERLAY_TOOLTIP_FILL_COLOR;
			const width = calculateTooltipWidth(
				nameForTooltip,
				companyForTooltip,
				titleForTooltip
			);
			const height = calculateTooltipHeight(nameForTooltip, companyForTooltip);
			const anchorY = calculateTooltipAnchorY(nameForTooltip, companyForTooltip);
			return {
				url: generateMapTooltipIconUrl(
					nameForTooltip,
					companyForTooltip,
					titleForTooltip,
					tooltipFillColor
				),
				width,
				height,
				anchorY,
			};
		}

		const whatForMarker =
			kind === 'base'
				? (searchWhat ?? null)
				: kind === 'booking'
					? (getBookingTitlePrefixFromContactTitle(contact.title) ?? null)
					: (getPromotionOverlayWhatFromContactTitle(contact.title) ?? null);

		// Even if the marker dot is "washed out" outside the locked/selected state, keep the hover tooltip
		// using the base category color so it consistently communicates the search intent.
		const dotFillColor =
			kind === 'base' ? defaultDotFillColor : getResultDotColorForWhat(whatForMarker);

		const normalizedWhat = whatForMarker ? normalizeWhatKey(whatForMarker) : null;
		const baseTooltipFillColor = normalizedWhat
			? (WHAT_TO_HOVER_TOOLTIP_FILL_COLOR[normalizedWhat] ?? dotFillColor)
			: dotFillColor;

		const tooltipFillColor = isSelected
			? TOOLTIP_FILL_COLOR_SELECTED
			: baseTooltipFillColor;

		const width = calculateTooltipWidth(
			nameForTooltip,
			companyForTooltip,
			titleForTooltip,
			whatForMarker
		);
		const height = calculateTooltipHeight(nameForTooltip, companyForTooltip);
		const anchorY = calculateTooltipAnchorY(nameForTooltip, companyForTooltip);

		return {
			url: generateMapTooltipIconUrl(
				nameForTooltip,
				companyForTooltip,
				titleForTooltip,
				tooltipFillColor,
				whatForMarker
			),
			width,
			height,
			anchorY,
		};
	}, [hoverTooltipEntry, selectedContactIdSet, searchWhat, defaultDotFillColor]);

	const hoverTooltipOverlayRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (!map || !isMapLoaded) return;
		if (isLoading) return;
		const el = hoverTooltipOverlayRef.current;
		if (!el || !hoverTooltipCoords || !hoverTooltipData) return;

		const update = () => {
			const p = map.project([hoverTooltipCoords.lng, hoverTooltipCoords.lat]);
			el.style.transform = `translate(${Math.round(p.x - MAP_TOOLTIP_ANCHOR_X)}px, ${Math.round(
				p.y - hoverTooltipData.anchorY
			)}px)`;
		};

		update();
		map.on('move', update);
		return () => {
			map.off('move', update);
		};
	}, [
		map,
		isMapLoaded,
		isLoading,
		hoverTooltipContactId,
		hoverTooltipCoords?.lat,
		hoverTooltipCoords?.lng,
		hoverTooltipData?.anchorY,
	]);

	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				position: 'relative',
				backgroundColor: '#000',
				borderRadius: isBackgroundPresentation ? 0 : '0.5rem',
				overflow: 'hidden',
			}}
		>
			<div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
			{mapLoadError && (
				<div
					className={`absolute inset-0 flex items-center justify-center ${
						isBackgroundPresentation ? 'bg-black/80' : 'bg-gray-100'
					}`}
				>
					<p className="text-gray-500">{mapLoadError}</p>
				</div>
			)}
			{!mapLoadError && !isMapLoaded && (
				<div
					className={`absolute inset-0 flex items-center justify-center ${
						isBackgroundPresentation ? 'bg-black' : 'bg-gray-100'
					}`}
				>
					<div
						className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
							isBackgroundPresentation ? 'border-white' : 'border-gray-900'
						}`}
					/>
				</div>
			)}

			{/* Hover SVG tooltip (single overlay; positioned via map.project) */}
			{!isLoading && hoverTooltipEntry && hoverTooltipCoords && hoverTooltipData && (
				<div
					ref={hoverTooltipOverlayRef}
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: `${hoverTooltipData.width}px`,
						height: `${hoverTooltipData.height + hoverLeaveBufferPx}px`,
						pointerEvents:
							hoverTooltipContactId != null && hoveredMarkerId === hoverTooltipContactId
								? 'auto'
								: 'none',
						display: 'flex',
						flexDirection: 'column',
						zIndex: HOVER_TOOLTIP_Z_INDEX,
					}}
					onMouseEnter={() => handleMarkerMouseOver(hoverTooltipEntry.contact)}
					onMouseLeave={() => handleMarkerMouseOut(hoverTooltipEntry.contact.id)}
					onClick={() => handleMarkerClick(hoverTooltipEntry.contact)}
				>
					<div
						style={{
							width: '100%',
							height: `${hoverTooltipData.height}px`,
							opacity:
								hoverTooltipContactId != null && hoveredMarkerId === hoverTooltipContactId
									? 1
									: 0,
							transition: 'opacity 150ms ease-in-out',
							flexShrink: 0,
						}}
					>
						<img
							src={hoverTooltipData.url}
							alt=""
							draggable={false}
							style={{ width: '100%', height: '100%', display: 'block' }}
						/>
					</div>
				</div>
			)}

			{/* Only show selected marker overlay when not loading */}
			{!isLoading && selectedMarker && selectedMarkerCoords && (
				<div
					ref={selectedMarkerOverlayRef}
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						zIndex: HOVER_TOOLTIP_Z_INDEX + 10,
					}}
				>
					<div
						className="relative"
						style={{
							width: '320px',
							backgroundColor: 'rgba(216, 229, 251, 0.8)',
							border: '2px solid black',
							borderRadius: '7px',
							overflow: 'hidden',
							boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
						}}
						onMouseEnter={handleResearchPanelMouseEnter}
						onMouseLeave={handleResearchPanelMouseLeave}
					>
						{/* Close button */}
						<button
							onClick={() => setSelectedMarker(null)}
							className="absolute top-[10px] -translate-y-1/2 right-2 z-20 flex items-center justify-center text-black/60 hover:text-black transition-colors"
							style={{ fontSize: '14px', lineHeight: 1, fontWeight: 500 }}
						>
							×
						</button>
						{/* Header */}
						<div
							className="w-full"
							style={{ height: '20px', backgroundColor: 'rgba(232, 239, 255, 0.8)' }}
						/>
						<div className="absolute top-[10px] left-[12px] -translate-y-1/2 z-10">
							<span className="font-bold text-[12px] leading-none text-black">
								Research
							</span>
						</div>
						<div
							className="absolute left-0 w-full bg-black z-10"
							style={{ top: '20px', height: '2px' }}
						/>
						{/* Name/Company section */}
						<div className="w-full bg-white" style={{ height: '36px', marginTop: '2px' }}>
							<div className="w-full h-full px-3 flex items-center justify-between overflow-hidden">
								<div className="flex flex-col justify-center min-w-0 flex-1 pr-2">
									<div className="font-inter font-bold text-[13px] leading-none truncate text-black">
										{(() => {
											const fullName = `${selectedMarker.firstName || ''} ${
												selectedMarker.lastName || ''
											}`.trim();
											return (
												fullName ||
												selectedMarker.name ||
												selectedMarker.company ||
												'Unknown'
											);
										})()}
									</div>
									{(() => {
										const fullName = `${selectedMarker.firstName || ''} ${
											selectedMarker.lastName || ''
										}`.trim();
										const hasName =
											fullName.length > 0 ||
											(selectedMarker.name && selectedMarker.name.length > 0);
										if (!hasName) return null;
										return (
											<div className="text-[11px] leading-tight truncate text-black mt-[2px]">
												{selectedMarker.company || ''}
											</div>
										);
									})()}
								</div>
								<div className="flex items-center gap-2 flex-shrink-0">
									<div className="flex flex-col items-end gap-[2px] max-w-[120px]">
										<div className="flex items-center gap-1 w-full justify-end overflow-hidden">
											{(() => {
												const stateAbbr =
													getStateAbbreviation(selectedMarker.state || '') || '';
												if (stateAbbr && stateBadgeColorMap[stateAbbr]) {
													return (
														<span
															className="inline-flex items-center justify-center h-[14px] px-[5px] rounded-[3px] border border-black text-[10px] font-bold leading-none flex-shrink-0"
															style={{ backgroundColor: stateBadgeColorMap[stateAbbr] }}
														>
															{stateAbbr}
														</span>
													);
												}
												return null;
											})()}
											{selectedMarker.city && (
												<span className="text-[11px] leading-none text-black truncate">
													{selectedMarker.city}
												</span>
											)}
										</div>
										{(selectedMarker.title ||
											selectedMarker.headline ||
											isMusicVenuesSearch ||
											isRestaurantsSearch ||
											isCoffeeShopsSearch ||
											isWeddingPlannersSearch) &&
											(() => {
												const titleText =
													selectedMarker.title || selectedMarker.headline || '';
												const isRestaurant =
													isRestaurantsSearch || isRestaurantTitle(titleText);
												const isCoffeeShop =
													isCoffeeShopsSearch || isCoffeeShopTitle(titleText);
												const isMusicVenue =
													isMusicVenuesSearch || isMusicVenueTitle(titleText);
												const isWeddingPlanner =
													isWeddingPlannersSearch || isWeddingPlannerTitle(titleText);
												const isWeddingVenue = isWeddingVenueTitle(titleText);
												const isWineBeerSpirits = isWineBeerSpiritsTitle(titleText);
												const wineBeerSpiritsLabel = getWineBeerSpiritsLabel(titleText);
												return (
													<div
														className="px-1.5 py-[1px] rounded-[6px] border border-black max-w-full flex items-center gap-1"
														style={{
															backgroundColor: isRestaurant
																? '#C3FBD1'
																: isCoffeeShop
																	? '#D6F1BD'
																	: isMusicVenue
																		? '#B7E5FF'
																		: isWeddingPlanner || isWeddingVenue
																			? '#FFF8DC'
																			: isWineBeerSpirits
																				? '#BFC4FF'
																				: '#E8EFFF',
														}}
													>
														{isRestaurant && (
															<RestaurantsIcon size={10} className="flex-shrink-0" />
														)}
														{isCoffeeShop && <CoffeeShopsIcon size={6} />}
														{isMusicVenue && (
															<MusicVenuesIcon size={10} className="flex-shrink-0" />
														)}
														{(isWeddingPlanner || isWeddingVenue) && (
															<WeddingPlannersIcon size={10} />
														)}
														{isWineBeerSpirits && (
															<WineBeerSpiritsIcon size={10} className="flex-shrink-0" />
														)}
														<span className="text-[9px] leading-none text-black block truncate">
															{isRestaurant
																? 'Restaurant'
																: isCoffeeShop
																	? 'Coffee Shop'
																	: isMusicVenue
																		? 'Music Venue'
																		: isWeddingVenue
																			? 'Wedding Venue'
																			: isWeddingPlanner
																				? 'Wedding Planner'
																				: isWineBeerSpirits
																					? wineBeerSpiritsLabel
																					: titleText}
														</span>
													</div>
												);
											})()}
									</div>
								</div>
							</div>
						</div>
						<div
							className="absolute left-0 w-full bg-black z-10"
							style={{ top: '58px', height: '1px' }}
						/>
						{/* Research boxes */}
						{(() => {
							const metadataSections = parseMetadataSections(selectedMarker.metadata);
							const boxConfigs = [
								{ key: '1', color: 'rgba(21, 139, 207, 0.8)' },
								{ key: '2', color: 'rgba(67, 174, 236, 0.8)' },
								{ key: '3', color: 'rgba(124, 201, 246, 0.8)' },
								{ key: '4', color: 'rgba(170, 218, 246, 0.8)' },
							];
							const visibleBoxes = boxConfigs.filter(
								(config) => metadataSections[config.key]
							);

							// If no parsed sections but raw metadata exists, show raw metadata
							if (visibleBoxes.length === 0) {
								if (
									selectedMarker.metadata &&
									selectedMarker.metadata.trim().length > 0
								) {
									// Show raw metadata in a single box if it doesn't match [1], [2] format
									return (
										<div className="p-2">
											<div
												id="map-research-scroll-container"
												className="relative"
												style={{
													width: '100%',
													minHeight: '60px',
													backgroundColor: 'rgba(21, 139, 207, 0.8)',
													border: '2px solid #000000',
													borderRadius: '6px',
												}}
											>
												<style>{`
													#map-research-scroll-container *::-webkit-scrollbar {
														display: none !important;
														width: 0 !important;
														height: 0 !important;
													}
													#map-research-scroll-container * {
														scrollbar-width: none !important;
														-ms-overflow-style: none !important;
													}
												`}</style>
												<div
													className="absolute"
													style={{
														top: '4px',
														bottom: '4px',
														left: '6px',
														right: '6px',
														backgroundColor: '#FFFFFF',
														border: '1px solid #000000',
														borderRadius: '4px',
														overflow: 'hidden',
													}}
												>
													<CustomScrollbar
														className="w-full h-full"
														thumbWidth={2}
														thumbColor="#000000"
														offsetRight={-14}
														contentClassName="scrollbar-hide"
													>
														<div className="px-2 py-1">
															<div className="w-full text-[10px] leading-[1.3] text-black font-inter">
																{selectedMarker.metadata}
															</div>
														</div>
													</CustomScrollbar>
												</div>
											</div>
										</div>
									);
								}
								return (
									<div className="px-3 py-4 text-center text-[11px] text-gray-500 italic">
										No research data available for this contact
									</div>
								);
							}

							return (
								<div className="p-2 flex flex-col gap-2">
									{visibleBoxes.map((config) => (
										<div
											key={config.key}
											className="relative"
											style={{
												width: '100%',
												minHeight: '44px',
												backgroundColor: config.color,
												border: '2px solid #000000',
												borderRadius: '6px',
											}}
										>
											<div
												className="absolute font-inter font-bold"
												style={{
													top: '4px',
													left: '6px',
													fontSize: '10px',
													color: '#000000',
												}}
											>
												[{config.key}]
											</div>
											<div
												className="absolute overflow-hidden"
												style={{
													top: '50%',
													transform: 'translateY(-50%)',
													right: '6px',
													width: 'calc(100% - 36px)',
													minHeight: '36px',
													maxHeight: '36px',
													backgroundColor: '#FFFFFF',
													border: '1px solid #000000',
													borderRadius: '4px',
												}}
											>
												<div className="w-full h-full px-2 flex items-center overflow-hidden">
													<div
														className="w-full text-[10px] leading-[1.3] text-black font-inter"
														style={{
															display: '-webkit-box',
															WebkitLineClamp: 2,
															WebkitBoxOrient: 'vertical',
															overflow: 'hidden',
														}}
													>
														{metadataSections[config.key]}
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							);
						})()}
						{/* Pointer triangle */}
						<div
							className="absolute left-1/2 -translate-x-1/2"
							style={{
								bottom: '-10px',
								width: 0,
								height: 0,
								borderLeft: '10px solid transparent',
								borderRight: '10px solid transparent',
								borderTop: '10px solid #D8E5FB',
							}}
						/>
						<div
							className="absolute left-1/2 -translate-x-1/2"
							style={{
								bottom: '-14px',
								width: 0,
								height: 0,
								borderLeft: '12px solid transparent',
								borderRight: '12px solid transparent',
								borderTop: '12px solid black',
								zIndex: -1,
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
};

export default SearchResultsMap;
