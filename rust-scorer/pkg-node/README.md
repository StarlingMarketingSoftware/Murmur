# rust-scorer

WASM utilities used by Murmur:

- Vector-search post scoring (`score_hits`) used in `vectorDb.ts`
- Geospatial math (`haversine_km`, Web Mercator projection, ring/segment checks, US-state nearest lookup)

## Prerequisites

- Rust toolchain (`rustup`, `cargo`)
- `wasm-pack` (provided via this repo's `devDependencies`)

## Build

From the repository root:

```bash
npm run build:wasm
```

This runs:

```bash
npm run build:wasm:node
npm run build:wasm:web
```

Outputs:

- `rust-scorer/pkg-node` (`wasm-pack --target nodejs`)
- `rust-scorer/pkg-web` (`wasm-pack --target web`)

## Exported WASM API

- `score_hits(hits, config)`
- `haversine_km(lat1, lng1, lat2, lng2)`
- `lat_lng_to_world_pixel(lat, lng, world_size)`
- `distance_point_to_segment_sq(px, py, ax, ay, bx, by)`
- `point_in_ring(px, py, ring_flat_xy)`
- `batch_lat_lng_to_world_pixel(flat_lat_lng, world_size)`
- `batch_haversine_km(origin_lat, origin_lng, flat_lat_lng_targets)`
- `is_point_near_segments(x, y, flat_segments, threshold_px)`
- `nearest_us_states(state_name, count)`
- `union_multi_polygons(multi_polygons)`

## TypeScript usage

Server (Node.js target):

```ts
import { score_hits } from '../../../../rust-scorer/pkg-node';
```

Client (web target, async import):

```ts
const wasmGeo = await import('../../../../rust-scorer/pkg-web');
```

Feature flags:

- `USE_WASM_SCORER=true` enables Rust scoring in `vectorDb.ts`
- `USE_WASM_GEO=true` enables server-side Rust geo calls
- `NEXT_PUBLIC_USE_WASM_GEO=true` enables browser Rust geo calls

All call sites retain TypeScript fallbacks if WASM loading/calls fail.
