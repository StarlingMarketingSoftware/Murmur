/* tslint:disable */
/* eslint-disable */

export function batch_haversine_km(origin_lat: number, origin_lng: number, targets: Float64Array): Float64Array;

export function batch_lat_lng_to_world_pixel(coords: Float64Array, world_size: number): Float64Array;

export function distance_point_to_segment_sq(px: number, py: number, ax: number, ay: number, bx: number, by: number): number;

export function haversine_km(lat1: number, lng1: number, lat2: number, lng2: number): number;

export function is_point_near_segments(x: number, y: number, segments: Float64Array, threshold_px: number): boolean;

export function lat_lng_to_world_pixel(lat: number, lng: number, world_size: number): Float64Array;

export function nearest_us_states(state_name: string, count: number): string[];

export function point_in_ring(px: number, py: number, ring: Float64Array): boolean;

export function score_hits(hits: any, config: any): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly score_hits: (a: any, b: any) => [number, number, number];
    readonly batch_haversine_km: (a: number, b: number, c: any) => any;
    readonly batch_lat_lng_to_world_pixel: (a: any, b: number) => any;
    readonly distance_point_to_segment_sq: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly haversine_km: (a: number, b: number, c: number, d: number) => number;
    readonly is_point_near_segments: (a: number, b: number, c: any, d: number) => number;
    readonly lat_lng_to_world_pixel: (a: number, b: number, c: number) => any;
    readonly nearest_us_states: (a: number, b: number, c: number) => [number, number];
    readonly point_in_ring: (a: number, b: number, c: any) => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
