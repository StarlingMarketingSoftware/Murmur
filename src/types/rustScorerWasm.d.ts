declare module '../../../../rust-scorer/pkg-node' {
	export function score_hits(hits: unknown, config: unknown): unknown;
	export function batch_haversine_km(
		originLat: number,
		originLng: number,
		targets: Float64Array
	): Float64Array;
	export function nearest_us_states(stateName: string, count: number): string[];
}

declare module '../../../../rust-scorer/pkg-web' {
	export function lat_lng_to_world_pixel(
		lat: number,
		lng: number,
		worldSize: number
	): Float64Array;
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
}
