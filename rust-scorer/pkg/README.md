# rust-scorer

WASM scorer for Elasticsearch kNN post-processing in `vectorDb.ts`.

## Prerequisites

- Rust toolchain (`rustup`, `cargo`)
- `wasm-pack` (provided in this repo via `devDependencies`)

## Build

From the repository root:

```bash
npm run build:wasm
```

Or directly:

```bash
wasm-pack build rust-scorer --target nodejs
```

The generated package is written to `rust-scorer/pkg`.

## Usage in TypeScript

```ts
import { score_hits } from '../../../../rust-scorer/pkg';
```

The exported function expects flat hit data and a scoring config object, then returns sorted/truncated `{ id, score }` results.

Set `USE_WASM_SCORER=true` to enable the Rust/WASM scorer in `vectorDb.ts`. When disabled (or if WASM load fails), the existing TypeScript scorer is used as a fallback.
