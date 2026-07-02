import type { ContactWithName } from '@/types/contact';
import { isLatLngInBbox } from './geometry';
import { clamp } from './math';
import type {
	BoundingBox,
	ClippingRing,
	LatLngLiteral,
	ScoredContact,
	WasmGeoModule,
	WorldSegment,
} from './types';

// ============================================================================
// WASM module loader (singleton — process-wide cache)
// ============================================================================

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
	console.error(
		'[SearchResultsMap] WASM geo call failed, using TypeScript fallback',
		error
	);
};

export { logWasmGeoRuntimeError };

export const toFloat64Array = (
	value: Float64Array | ArrayLike<number>
): Float64Array =>
	value instanceof Float64Array ? value : Float64Array.from(value);

export const getWasmGeoModuleSync = (): WasmGeoModule | null =>
	cachedWasmGeoModule;

export const ensureWasmGeoModuleLoaded = async (): Promise<WasmGeoModule | null> => {
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
					const projected = toFloat64Array(
						maybeModule.lat_lng_to_world_pixel(0, 0, 256)
					);
					if (
						projected.length < 2 ||
						!Number.isFinite(projected[0]) ||
						!Number.isFinite(projected[1])
					)
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

// ============================================================================
// Flat-array caches for WASM interop
// ============================================================================

const ringFlatCache = new WeakMap<ClippingRing, Float64Array>();

export const flattenRing = (ring: ClippingRing): Float64Array => {
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

const worldSegmentsFlatCache = new WeakMap<WorldSegment[], Float64Array>();

export const flattenWorldSegments = (segments: WorldSegment[]): Float64Array => {
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

// ============================================================================
// Misc helpers used by sampling / constellation
// ============================================================================

export const getClientPointFromDomEvent = (
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

// FNV-1a 32-bit. Not cryptographic; just stable + cheap for cache keys.
export const hashStringToUint32 = (str: string): number => {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
};

// Controls when we regenerate dots as the viewport changes — quantized so
// fractional pan/zoom doesn't constantly invalidate the marker sample.
export const getBackgroundDotsQuantizationDeg = (zoom: number): number => {
	if (zoom <= 4) return 0.75;
	if (zoom <= 6) return 0.4;
	if (zoom <= 8) return 0.22;
	if (zoom <= 10) return 0.12;
	if (zoom <= 12) return 0.08;
	return 0.05;
};

// ============================================================================
// Stable, density-preserving viewport sampler
// ============================================================================

export const stableViewportSampleContacts = (
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

	// The TS fallback below picks a DIFFERENT (still stable) sample than the
	// WASM path. With the module now lazy-loaded, a sample racing the load
	// would silently diverge from the post-load sample — surface that in dev.
	if (
		process.env.NODE_ENV !== 'production' &&
		wasmGeoModulePromise &&
		!cachedWasmGeoModule
	) {
		console.warn(
			'[SearchResultsMap] stableViewportSampleContacts ran while the WASM geo module was still loading — TS fallback sample may differ from the post-load sample'
		);
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

// ============================================================================
// Per-call WASM wrappers with TS fallbacks
// ============================================================================

export const latLngToWorldPixel = (
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

export const batchLatLngToWorldPixels = (
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
			const projected = toFloat64Array(
				wasmGeo.batch_lat_lng_to_world_pixel(flat, worldSize)
			);
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

export const distancePointToSegmentSq = (
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
