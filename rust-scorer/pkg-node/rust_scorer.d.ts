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
