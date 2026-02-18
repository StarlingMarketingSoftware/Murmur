use js_sys::{Float64Array, Uint32Array, Uint8Array};
use std::cmp::Ordering;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

const EARTH_RADIUS_KM: f64 = 6371.0;
const MAX_MERCATOR_LAT: f64 = 85.0;

// name, abbreviation, centroid latitude, centroid longitude
const US_STATES: [(&str, &str, f64, f64); 50] = [
    ("Alabama", "AL", 32.806671, -86.79113),
    ("Alaska", "AK", 61.370716, -152.404419),
    ("Arizona", "AZ", 33.729759, -111.431221),
    ("Arkansas", "AR", 34.969704, -92.373123),
    ("California", "CA", 36.116203, -119.681564),
    ("Colorado", "CO", 39.059811, -105.311104),
    ("Connecticut", "CT", 41.597782, -72.755371),
    ("Delaware", "DE", 39.318523, -75.507141),
    ("Florida", "FL", 27.766279, -81.686783),
    ("Georgia", "GA", 33.040619, -83.643074),
    ("Hawaii", "HI", 21.094318, -157.498337),
    ("Idaho", "ID", 44.240459, -114.478828),
    ("Illinois", "IL", 40.349457, -88.986137),
    ("Indiana", "IN", 39.849426, -86.258278),
    ("Iowa", "IA", 42.011539, -93.210526),
    ("Kansas", "KS", 38.5266, -96.726486),
    ("Kentucky", "KY", 37.66814, -84.670067),
    ("Louisiana", "LA", 31.169546, -91.867805),
    ("Maine", "ME", 44.693947, -69.381927),
    ("Maryland", "MD", 39.063946, -76.802101),
    ("Massachusetts", "MA", 42.230171, -71.530106),
    ("Michigan", "MI", 43.326618, -84.536095),
    ("Minnesota", "MN", 45.694454, -93.900192),
    ("Mississippi", "MS", 32.741646, -89.678696),
    ("Missouri", "MO", 38.456085, -92.288368),
    ("Montana", "MT", 46.921925, -110.454353),
    ("Nebraska", "NE", 41.12537, -98.268082),
    ("Nevada", "NV", 38.313515, -117.055374),
    ("New Hampshire", "NH", 43.452492, -71.563896),
    ("New Jersey", "NJ", 40.298904, -74.521011),
    ("New Mexico", "NM", 34.840515, -106.248482),
    ("New York", "NY", 42.165726, -74.948051),
    ("North Carolina", "NC", 35.630066, -79.806419),
    ("North Dakota", "ND", 47.528912, -99.784012),
    ("Ohio", "OH", 40.388783, -82.764915),
    ("Oklahoma", "OK", 35.565342, -96.928917),
    ("Oregon", "OR", 44.572021, -122.070938),
    ("Pennsylvania", "PA", 40.590752, -77.209755),
    ("Rhode Island", "RI", 41.680893, -71.51178),
    ("South Carolina", "SC", 33.856892, -80.945007),
    ("South Dakota", "SD", 44.299782, -99.438828),
    ("Tennessee", "TN", 35.747845, -86.692345),
    ("Texas", "TX", 31.054487, -97.563461),
    ("Utah", "UT", 40.150032, -111.862434),
    ("Vermont", "VT", 44.045876, -72.710686),
    ("Virginia", "VA", 37.769337, -78.169968),
    ("Washington", "WA", 47.400902, -121.490494),
    ("West Virginia", "WV", 38.491226, -80.954456),
    ("Wisconsin", "WI", 44.268543, -89.616508),
    ("Wyoming", "WY", 42.755966, -107.30249),
];

#[inline]
fn to_rad(deg: f64) -> f64 {
    (deg * std::f64::consts::PI) / 180.0
}

#[inline]
fn clamp(value: f64, min: f64, max: f64) -> f64 {
    value.max(min).min(max)
}

#[inline]
fn fnv1a_step(mut h: u32, byte: u8) -> u32 {
    h ^= byte as u32;
    h.wrapping_mul(16777619)
}

#[inline]
fn fnv1a_u32s(values: &[u32]) -> u32 {
    let mut h: u32 = 2166136261;
    for v in values {
        for b in v.to_le_bytes() {
            h = fnv1a_step(h, b);
        }
    }
    h
}

#[inline]
fn haversine_km_impl(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let d_lat = to_rad(lat2 - lat1);
    let d_lng = to_rad(lng2 - lng1);
    let lat1_rad = to_rad(lat1);
    let lat2_rad = to_rad(lat2);

    let sin_d_lat = (d_lat / 2.0).sin();
    let sin_d_lng = (d_lng / 2.0).sin();
    let h = sin_d_lat * sin_d_lat + lat1_rad.cos() * lat2_rad.cos() * (sin_d_lng * sin_d_lng);
    let h_root = h.sqrt().min(1.0);

    2.0 * EARTH_RADIUS_KM * h_root.asin()
}

#[inline]
fn lat_lng_to_world_pixel_impl(lat: f64, lng: f64, world_size: f64) -> (f64, f64) {
    let lat_clamped = clamp(lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);
    let siny = to_rad(lat_clamped).sin();
    let x = ((lng + 180.0) / 360.0) * world_size;
    let y = (0.5 - ((1.0 + siny) / (1.0 - siny)).ln() / (4.0 * std::f64::consts::PI)) * world_size;
    (x, y)
}

#[inline]
fn distance_point_to_segment_sq_impl(px: f64, py: f64, ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    let abx = bx - ax;
    let aby = by - ay;
    let apx = px - ax;
    let apy = py - ay;
    let denom = abx * abx + aby * aby;
    if denom <= 0.0 {
        return apx * apx + apy * apy;
    }
    let t = clamp((apx * abx + apy * aby) / denom, 0.0, 1.0);
    let cx = ax + t * abx;
    let cy = ay + t * aby;
    let dx = px - cx;
    let dy = py - cy;
    dx * dx + dy * dy
}

fn point_in_ring_impl(px: f64, py: f64, ring: &[f64]) -> bool {
    let points_len = ring.len() / 2;
    if points_len < 3 {
        return false;
    }

    let mut inside = false;
    let mut j = points_len - 1;
    for i in 0..points_len {
        let xi = ring[i * 2];
        let yi = ring[i * 2 + 1];
        let xj = ring[j * 2];
        let yj = ring[j * 2 + 1];
        let intersects =
            (yi > py) != (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi + 0.0) + xi;
        if intersects {
            inside = !inside;
        }
        j = i;
    }
    inside
}

fn normalize_us_state_index(state_name: &str) -> Option<usize> {
    let trimmed = state_name.trim();
    if trimmed.is_empty() {
        return None;
    }

    US_STATES.iter().position(|(name, abbr, _, _)| {
        name.eq_ignore_ascii_case(trimmed) || abbr.eq_ignore_ascii_case(trimmed)
    })
}

#[inline]
fn has_neighbor_within(
    grid: &HashMap<(i64, i64), Vec<(f64, f64)>>,
    cx: i64,
    cy: i64,
    x: f64,
    y: f64,
    min_separation_sq: f64,
) -> bool {
    for dx in -1_i64..=1 {
        for dy in -1_i64..=1 {
            let Some(arr) = grid.get(&(cx + dx, cy + dy)) else {
                continue;
            };
            for (px, py) in arr {
                let ddx = x - *px;
                let ddy = y - *py;
                if ddx * ddx + ddy * ddy < min_separation_sq {
                    return true;
                }
            }
        }
    }
    false
}

#[allow(clippy::too_many_arguments)]
fn pick_from_order(
    order: &[u32],
    xy: &[f64],
    candidate_count: usize,
    cell_size: f64,
    min_separation_sq: f64,
    max_primary_dots: usize,
    max_to_pick: &mut usize,
    in_locked_mask: &[u8],
    picked: &mut Vec<u32>,
    picked_set: &mut [bool],
    grid: &mut HashMap<(i64, i64), Vec<(f64, f64)>>,
    picked_in_locked_count: &mut usize,
) {
    if *max_to_pick == 0 {
        return;
    }

    for idx_u32 in order {
        if picked.len() >= max_primary_dots || *max_to_pick == 0 {
            break;
        }

        let idx = *idx_u32 as usize;
        if idx >= candidate_count || picked_set[idx] {
            continue;
        }

        let base = idx * 2;
        let x = xy[base];
        let y = xy[base + 1];
        if !x.is_finite() || !y.is_finite() {
            continue;
        }

        let cx_raw = (x / cell_size).floor();
        let cy_raw = (y / cell_size).floor();
        if !cx_raw.is_finite() || !cy_raw.is_finite() {
            continue;
        }
        if cx_raw < i64::MIN as f64
            || cx_raw > i64::MAX as f64
            || cy_raw < i64::MIN as f64
            || cy_raw > i64::MAX as f64
        {
            continue;
        }

        let cx = cx_raw as i64;
        let cy = cy_raw as i64;
        if has_neighbor_within(grid, cx, cy, x, y, min_separation_sq) {
            continue;
        }

        picked.push(*idx_u32);
        picked_set[idx] = true;
        if idx < in_locked_mask.len() && in_locked_mask[idx] != 0 {
            *picked_in_locked_count += 1;
        }
        *max_to_pick -= 1;
        grid.entry((cx, cy)).or_default().push((x, y));
    }
}

#[wasm_bindgen]
pub fn haversine_km(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    haversine_km_impl(lat1, lng1, lat2, lng2)
}

#[wasm_bindgen]
pub fn lat_lng_to_world_pixel(lat: f64, lng: f64, world_size: f64) -> Float64Array {
    let (x, y) = lat_lng_to_world_pixel_impl(lat, lng, world_size);
    Float64Array::from([x, y].as_slice())
}

#[wasm_bindgen]
pub fn distance_point_to_segment_sq(px: f64, py: f64, ax: f64, ay: f64, bx: f64, by: f64) -> f64 {
    distance_point_to_segment_sq_impl(px, py, ax, ay, bx, by)
}

#[wasm_bindgen]
pub fn point_in_ring(px: f64, py: f64, ring: &Float64Array) -> bool {
    let ring_data = ring.to_vec();
    point_in_ring_impl(px, py, &ring_data)
}

#[wasm_bindgen]
pub fn batch_lat_lng_to_world_pixel(coords: &Float64Array, world_size: f64) -> Float64Array {
    let input = coords.to_vec();
    let pair_count = input.len() / 2;
    let mut output = vec![0.0; pair_count * 2];

    for idx in 0..pair_count {
        let lat = input[idx * 2];
        let lng = input[idx * 2 + 1];
        let (x, y) = lat_lng_to_world_pixel_impl(lat, lng, world_size);
        output[idx * 2] = x;
        output[idx * 2 + 1] = y;
    }

    Float64Array::from(output.as_slice())
}

#[wasm_bindgen]
pub fn batch_haversine_km(
    origin_lat: f64,
    origin_lng: f64,
    targets: &Float64Array,
) -> Float64Array {
    let input = targets.to_vec();
    let pair_count = input.len() / 2;
    let mut output = vec![0.0; pair_count];

    for idx in 0..pair_count {
        let lat = input[idx * 2];
        let lng = input[idx * 2 + 1];
        output[idx] = haversine_km_impl(origin_lat, origin_lng, lat, lng);
    }

    Float64Array::from(output.as_slice())
}

#[wasm_bindgen]
pub fn is_point_near_segments(x: f64, y: f64, segments: &Float64Array, threshold_px: f64) -> bool {
    let data = segments.to_vec();
    let t = threshold_px.max(0.0);
    let t_sq = t * t;

    if data.len() >= 8 && data.len() % 8 == 0 {
        for chunk in data.chunks_exact(8) {
            let ax = chunk[0];
            let ay = chunk[1];
            let bx = chunk[2];
            let by = chunk[3];
            let min_x = chunk[4];
            let max_x = chunk[5];
            let min_y = chunk[6];
            let max_y = chunk[7];
            if x < min_x - t || x > max_x + t || y < min_y - t || y > max_y + t {
                continue;
            }
            if distance_point_to_segment_sq_impl(x, y, ax, ay, bx, by) < t_sq {
                return true;
            }
        }
        return false;
    }

    for chunk in data.chunks_exact(4) {
        let ax = chunk[0];
        let ay = chunk[1];
        let bx = chunk[2];
        let by = chunk[3];
        let min_x = ax.min(bx);
        let max_x = ax.max(bx);
        let min_y = ay.min(by);
        let max_y = ay.max(by);
        if x < min_x - t || x > max_x + t || y < min_y - t || y > max_y + t {
            continue;
        }
        if distance_point_to_segment_sq_impl(x, y, ax, ay, bx, by) < t_sq {
            return true;
        }
    }
    false
}

#[wasm_bindgen]
pub fn pick_non_overlapping_indices(
    xy: &Float64Array,
    priority_order: &Uint32Array,
    in_locked_order: &Uint32Array,
    out_locked_order: &Uint32Array,
    in_locked_mask: &Uint8Array,
    max_primary_dots: usize,
    in_locked_share: f64,
    hard_cap_outside_by_in_locked: bool,
    min_separation_sq: f64,
    cell_size: f64,
) -> Uint32Array {
    if max_primary_dots == 0 {
        return Uint32Array::new_with_length(0);
    }

    let xy_data = xy.to_vec();
    let candidate_count = xy_data.len() / 2;
    if candidate_count == 0 {
        return Uint32Array::new_with_length(0);
    }

    let priority = priority_order.to_vec();
    let in_locked = in_locked_order.to_vec();
    let out_locked = out_locked_order.to_vec();
    let in_locked_mask_data = in_locked_mask.to_vec();

    let normalized_cell_size = if cell_size.is_finite() && cell_size > 0.0 {
        cell_size
    } else {
        1.0
    };
    let normalized_min_separation_sq = if min_separation_sq.is_finite() && min_separation_sq > 0.0 {
        min_separation_sq
    } else {
        0.0
    };
    let share = clamp(in_locked_share, 0.0, 1.0);

    let mut grid: HashMap<(i64, i64), Vec<(f64, f64)>> = HashMap::new();
    let mut picked: Vec<u32> = Vec::with_capacity(max_primary_dots.min(candidate_count));
    let mut picked_set: Vec<bool> = vec![false; candidate_count];
    let mut picked_in_locked_count = 0_usize;

    let mut priority_budget = max_primary_dots;
    pick_from_order(
        &priority,
        &xy_data,
        candidate_count,
        normalized_cell_size,
        normalized_min_separation_sq,
        max_primary_dots,
        &mut priority_budget,
        &in_locked_mask_data,
        &mut picked,
        &mut picked_set,
        &mut grid,
        &mut picked_in_locked_count,
    );

    let remaining_budget = max_primary_dots.saturating_sub(picked.len());
    if remaining_budget > 0 {
        let mut in_locked_budget = ((remaining_budget as f64) * share).round() as usize;
        if in_locked_budget > remaining_budget {
            in_locked_budget = remaining_budget;
        }
        let mut out_locked_budget = remaining_budget - in_locked_budget;

        pick_from_order(
            &in_locked,
            &xy_data,
            candidate_count,
            normalized_cell_size,
            normalized_min_separation_sq,
            max_primary_dots,
            &mut in_locked_budget,
            &in_locked_mask_data,
            &mut picked,
            &mut picked_set,
            &mut grid,
            &mut picked_in_locked_count,
        );

        if hard_cap_outside_by_in_locked {
            out_locked_budget = out_locked_budget.min(picked_in_locked_count);
        }

        pick_from_order(
            &out_locked,
            &xy_data,
            candidate_count,
            normalized_cell_size,
            normalized_min_separation_sq,
            max_primary_dots,
            &mut out_locked_budget,
            &in_locked_mask_data,
            &mut picked,
            &mut picked_set,
            &mut grid,
            &mut picked_in_locked_count,
        );
    }

    Uint32Array::from(picked.as_slice())
}

#[wasm_bindgen]
pub fn stable_viewport_sample(
    coords: &Float64Array,
    ids: &Uint32Array,
    min_lat: f64,
    max_lat: f64,
    min_lng: f64,
    max_lng: f64,
    slots: usize,
    seed: u32,
) -> Uint32Array {
    if slots == 0 {
        return Uint32Array::new_with_length(0);
    }

    let coords_data = coords.to_vec();
    let ids_data = ids.to_vec();
    let coord_pairs = coords_data.len() / 2;
    let n = ids_data.len().min(coord_pairs);
    if n == 0 {
        return Uint32Array::new_with_length(0);
    }
    if n <= slots {
        let mut all: Vec<u32> = Vec::with_capacity(n);
        for i in 0..n {
            all.push(i as u32);
        }
        return Uint32Array::from(all.as_slice());
    }

    let lat_span = max_lat - min_lat;
    let lng_span = max_lng - min_lng;
    let degenerate_bbox = !lat_span.is_finite() || !lng_span.is_finite() || lat_span <= 0.0 || lng_span <= 0.0;
    if degenerate_bbox {
        let mut scored: Vec<(u32, u32)> = Vec::with_capacity(n);
        for i in 0..n {
            let score = fnv1a_u32s(&[seed, 0x636f6e74, ids_data[i]]); // "cont"
            scored.push((score, i as u32));
        }
        scored.sort_by(|a, b| {
            let s = a.0.cmp(&b.0);
            if s != Ordering::Equal {
                return s;
            }
            a.1.cmp(&b.1)
        });
        let take = slots.min(scored.len());
        let mut out: Vec<u32> = Vec::with_capacity(take);
        for i in 0..take {
            out.push(scored[i].1);
        }
        return Uint32Array::from(out.as_slice());
    }

    let grid_unclamped = ((slots as f64).sqrt() * 1.15).round() as i64;
    let grid_i64 = grid_unclamped.clamp(8, 64);
    let grid = grid_i64 as usize;
    let lat_step = lat_span / (grid as f64);
    let lng_step = lng_span / (grid as f64);
    let degenerate_steps =
        !lat_step.is_finite() || !lng_step.is_finite() || lat_step <= 0.0 || lng_step <= 0.0;
    if degenerate_steps {
        let mut scored: Vec<(u32, u32)> = Vec::with_capacity(n);
        for i in 0..n {
            let score = fnv1a_u32s(&[seed, 0x636f6e74, ids_data[i]]); // "cont"
            scored.push((score, i as u32));
        }
        scored.sort_by(|a, b| {
            let s = a.0.cmp(&b.0);
            if s != Ordering::Equal {
                return s;
            }
            a.1.cmp(&b.1)
        });
        let take = slots.min(scored.len());
        let mut out: Vec<u32> = Vec::with_capacity(take);
        for i in 0..take {
            out.push(scored[i].1);
        }
        return Uint32Array::from(out.as_slice());
    }

    #[derive(Clone, Copy)]
    struct ScoredIdx {
        idx: u32,
        score: u32,
    }

    let cell_count = grid * grid;
    let mut cell_items: Vec<Vec<ScoredIdx>> = (0..cell_count).map(|_| Vec::new()).collect();
    let mut non_empty_cells: Vec<u32> = Vec::new();
    let mut cell_has_any: Vec<bool> = vec![false; cell_count];

    for i in 0..n {
        let base = i * 2;
        let lat = coords_data[base];
        let lng = coords_data[base + 1];
        if !lat.is_finite() || !lng.is_finite() {
            continue;
        }
        if lat < min_lat || lat > max_lat || lng < min_lng || lng > max_lng {
            continue;
        }

        let x_raw = ((lng - min_lng) / lng_step).floor();
        let y_raw = ((lat - min_lat) / lat_step).floor();
        if !x_raw.is_finite() || !y_raw.is_finite() {
            continue;
        }
        let mut x = x_raw as i64;
        let mut y = y_raw as i64;
        if x < 0 {
            x = 0;
        } else if x >= grid_i64 {
            x = grid_i64 - 1;
        }
        if y < 0 {
            y = 0;
        } else if y >= grid_i64 {
            y = grid_i64 - 1;
        }

        let cell_idx_usize = (y as usize) * grid + (x as usize);
        let cell_key = cell_idx_usize as u32;
        if !cell_has_any[cell_idx_usize] {
            cell_has_any[cell_idx_usize] = true;
            non_empty_cells.push(cell_key);
        }

        let score = fnv1a_u32s(&[seed, 0x636f6e74, ids_data[i]]); // "cont"
        cell_items[cell_idx_usize].push(ScoredIdx { idx: i as u32, score });
    }

    if non_empty_cells.is_empty() {
        return Uint32Array::new_with_length(0);
    }

    for &cell_key in &non_empty_cells {
        let items = &mut cell_items[cell_key as usize];
        items.sort_by(|a, b| {
            let s = a.score.cmp(&b.score);
            if s != Ordering::Equal {
                return s;
            }
            a.idx.cmp(&b.idx)
        });
    }

    if non_empty_cells.len() >= slots {
        #[derive(Clone, Copy)]
        struct CellChoice {
            cell_key: u32,
            cell_score: f64,
            tie: u32,
        }

        let mut choices: Vec<CellChoice> = Vec::with_capacity(non_empty_cells.len());
        for &cell_key in &non_empty_cells {
            let w = cell_items[cell_key as usize].len().max(1) as f64;
            let h = fnv1a_u32s(&[seed, 0x63656c6c, cell_key]); // "cell"
            let u = (h as f64 + 1.0) / 4294967296.0;
            let cell_score = u.ln() / w;
            let tie = fnv1a_u32s(&[seed, 0x74696500, cell_key]); // "tie\0"
            choices.push(CellChoice {
                cell_key,
                cell_score,
                tie,
            });
        }

        choices.sort_by(|a, b| {
            let s = b.cell_score.total_cmp(&a.cell_score);
            if s != Ordering::Equal {
                return s;
            }
            let t = a.tie.cmp(&b.tie);
            if t != Ordering::Equal {
                return t;
            }
            a.cell_key.cmp(&b.cell_key)
        });

        let take = slots.min(choices.len());
        let mut out: Vec<u32> = Vec::with_capacity(take);
        for i in 0..take {
            let cell_key = choices[i].cell_key as usize;
            if let Some(first) = cell_items[cell_key].first() {
                out.push(first.idx);
            }
        }
        return Uint32Array::from(out.as_slice());
    }

    // One per cell, then allocate remaining slots proportionally to cell density.
    let mut picked: Vec<u32> = Vec::with_capacity(slots.min(n));
    for &cell_key in &non_empty_cells {
        if let Some(first) = cell_items[cell_key as usize].first() {
            picked.push(first.idx);
        }
    }

    let remaining_slots = slots.saturating_sub(picked.len());
    if remaining_slots == 0 {
        return Uint32Array::from(picked.as_slice());
    }

    let mut total_remaining: usize = 0;
    for &cell_key in &non_empty_cells {
        total_remaining += cell_items[cell_key as usize].len().saturating_sub(1);
    }
    if total_remaining == 0 {
        return Uint32Array::from(picked.as_slice());
    }

    #[derive(Clone, Copy)]
    struct Alloc {
        cell_key: u32,
        base: usize,
        frac: f64,
        remaining: usize,
        tie: u32,
    }

    let mut allocs: Vec<Alloc> = Vec::with_capacity(non_empty_cells.len());
    for &cell_key in &non_empty_cells {
        let remaining = cell_items[cell_key as usize].len().saturating_sub(1);
        let exact = (remaining_slots as f64) * (remaining as f64) / (total_remaining as f64);
        let base = exact.floor().max(0.0) as usize;
        let base = base.min(remaining);
        let frac = exact - (base as f64);
        let tie = fnv1a_u32s(&[seed, 0x72656d00, cell_key]); // "rem\0"
        allocs.push(Alloc {
            cell_key,
            base,
            frac,
            remaining,
            tie,
        });
    }

    let used: usize = allocs.iter().map(|a| a.base).sum();
    let mut remainder = remaining_slots.saturating_sub(used);

    allocs.sort_by(|a, b| {
        let f = b.frac.total_cmp(&a.frac);
        if f != Ordering::Equal {
            return f;
        }
        let t = a.tie.cmp(&b.tie);
        if t != Ordering::Equal {
            return t;
        }
        a.cell_key.cmp(&b.cell_key)
    });

    for a in allocs.iter_mut() {
        if remainder == 0 {
            break;
        }
        if a.base < a.remaining {
            a.base += 1;
            remainder -= 1;
        }
    }

    for a in allocs.iter() {
        let take = a.base.min(a.remaining);
        if take == 0 {
            continue;
        }
        let items = &cell_items[a.cell_key as usize];
        for i in 1..=take {
            if let Some(item) = items.get(i) {
                picked.push(item.idx);
            }
        }
        if picked.len() >= slots {
            picked.truncate(slots);
            break;
        }
    }

    if picked.len() > slots {
        picked.truncate(slots);
    }
    Uint32Array::from(picked.as_slice())
}

#[wasm_bindgen]
pub fn nearest_us_states(state_name: &str, count: usize) -> Vec<String> {
    let Some(origin_idx) = normalize_us_state_index(state_name) else {
        return Vec::new();
    };
    let (_, _, origin_lat, origin_lng) = US_STATES[origin_idx];

    let mut distances = Vec::with_capacity(US_STATES.len().saturating_sub(1));
    for (idx, (name, _, lat, lng)) in US_STATES.iter().enumerate() {
        if idx == origin_idx {
            continue;
        }
        distances.push((*name, haversine_km_impl(origin_lat, origin_lng, *lat, *lng)));
    }

    distances.sort_by(|a, b| a.1.total_cmp(&b.1));
    distances
        .into_iter()
        .take(count)
        .map(|(name, _)| name.to_string())
        .collect()
}
