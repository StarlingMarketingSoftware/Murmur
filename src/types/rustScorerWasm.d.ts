declare module '../../../../rust-scorer/pkg-node' {
	export function score_hits(hits: unknown, config: unknown): unknown;
	export function filter_items_by_title_prefixes(
		items: unknown,
		prefixes: unknown,
		keepNullTitles: boolean
	): unknown;
	export function apply_post_training_to_es_matches(
		matches: unknown,
		profile: unknown,
		finalLimit: unknown
	): unknown;
	export function apply_hardcoded_location_overrides(
		rawQuery: string,
		parsed: {
			city: string | null;
			state: string | null;
			country: string | null;
			restOfQuery: string;
		}
	): {
		overrides: {
			city: string | null;
			state: string | null;
			country: string | null;
			restOfQuery: string;
		};
		penaltyCities: string[];
		forceCityExactCity?: string;
		forceStateAny?: string[];
		forceCityAny?: string[];
		penaltyTerms: string[];
		strictPenalty?: boolean;
	};
	export function batch_haversine_km(
		originLat: number,
		originLng: number,
		targets: Float64Array
	): Float64Array;
	export function nearest_us_states(stateName: string, count: number): string[];
	export function union_multi_polygons(
		multiPolygons: import('polygon-clipping').ClippingMultiPolygon[]
	): import('polygon-clipping').ClippingMultiPolygon;
}

declare module '../../../../rust-scorer/pkg-web' {
	export function filter_items_by_title_prefixes(
		items: unknown,
		prefixes: unknown,
		keepNullTitles: boolean
	): unknown;
	export function lat_lng_to_world_pixel(
		lat: number,
		lng: number,
		worldSize: number
	): Float64Array;
	/** wasm-pack `--target web` default export: async init */
	export default function __wbg_init(module_or_path?: unknown): Promise<unknown>;
	export function distance_point_to_segment_sq(
		px: number,
		py: number,
		ax: number,
		ay: number,
		bx: number,
		by: number
	): number;
	export function point_in_ring(px: number, py: number, ring: Float64Array): boolean;
	export function is_point_near_segments(
		x: number,
		y: number,
		segments: Float64Array,
		thresholdPx: number
	): boolean;
	export function batch_lat_lng_to_world_pixel(
		coords: Float64Array,
		worldSize: number
	): Float64Array;
	export function pick_non_overlapping_indices(
		xy: Float64Array,
		priorityOrder: Uint32Array,
		inLockedOrder: Uint32Array,
		outLockedOrder: Uint32Array,
		inLockedMask: Uint8Array,
		maxPrimaryDots: number,
		inLockedShare: number,
		hardCapOutsideByInLocked: boolean,
		minSeparationSq: number,
		cellSize: number
	): Uint32Array;
	export function stable_viewport_sample(
		coords: Float64Array,
		ids: Uint32Array,
		minLat: number,
		maxLat: number,
		minLng: number,
		maxLng: number,
		slots: number,
		seed: number
	): Uint32Array;
	export function union_multi_polygons(
		multiPolygons: import('polygon-clipping').ClippingMultiPolygon[]
	): import('polygon-clipping').ClippingMultiPolygon;
}

// `src/utils/categoryFilterWasm.ts` imports the wasm-pack web bundle from a different relative depth.
declare module '../../rust-scorer/pkg-web' {
	export function filter_items_by_title_prefixes(
		items: unknown,
		prefixes: unknown,
		keepNullTitles: boolean
	): unknown;
	/** wasm-pack `--target web` default export: async init */
	export default function __wbg_init(module_or_path?: unknown): Promise<unknown>;
}
