/* tslint:disable */
/* eslint-disable */

export function apply_hardcoded_location_overrides(raw_query: string, parsed: any): any;

export function apply_post_training_to_es_matches(matches: any, profile: any, final_limit: any): any;

export function batch_haversine_km(origin_lat: number, origin_lng: number, targets: Float64Array): Float64Array;

export function batch_lat_lng_to_world_pixel(coords: Float64Array, world_size: number): Float64Array;

export function distance_point_to_segment_sq(px: number, py: number, ax: number, ay: number, bx: number, by: number): number;

export function filter_items_by_title_prefixes(items: any, prefixes: any, keep_null_titles: boolean): any;

export function haversine_km(lat1: number, lng1: number, lat2: number, lng2: number): number;

export function is_point_near_segments(x: number, y: number, segments: Float64Array, threshold_px: number): boolean;

export function lat_lng_to_world_pixel(lat: number, lng: number, world_size: number): Float64Array;

export function nearest_us_states(state_name: string, count: number): string[];

export function pick_non_overlapping_indices(xy: Float64Array, priority_order: Uint32Array, in_locked_order: Uint32Array, out_locked_order: Uint32Array, in_locked_mask: Uint8Array, max_primary_dots: number, in_locked_share: number, hard_cap_outside_by_in_locked: boolean, min_separation_sq: number, cell_size: number): Uint32Array;

export function point_in_ring(px: number, py: number, ring: Float64Array): boolean;

export function score_hits(hits: any, config: any): any;

export function stable_viewport_sample(coords: Float64Array, ids: Uint32Array, min_lat: number, max_lat: number, min_lng: number, max_lng: number, slots: number, seed: number): Uint32Array;

export function union_multi_polygons(multi_polygons: any): any;
