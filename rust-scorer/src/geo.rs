use js_sys::Float64Array;
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
