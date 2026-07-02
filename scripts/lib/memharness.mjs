// Shared plumbing for the browser-memory measurement harnesses.
//
// Used by scripts/measure-memory-session.mjs (longmix). The original
// scripts/measure-dashboard-memory.mjs is intentionally left untouched (frozen
// for comparability with the June .memory-baselines) — do not refactor it onto
// this lib until a side-by-side run shows identical output.

import { readFileSync, mkdirSync, createWriteStream, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function makeArgReader(argv) {
	const args = argv.slice(2);
	return {
		str: (name, fallback) => {
			const i = args.indexOf(`--${name}`);
			return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
		},
		num: (name, fallback) => {
			const i = args.indexOf(`--${name}`);
			return i >= 0 && args[i + 1] !== undefined ? Number(args[i + 1]) : fallback;
		},
		flag: (name) => args.includes(`--${name}`),
	};
}

// ---------------------------------------------------------------------------
// Clerk dev sign-in (same mechanism as measure-dashboard-memory.mjs).
// ---------------------------------------------------------------------------

export const DEV_USER_ID = 'user_31VOcmWR88mYFCbyk2NkLzEW4oC';

export function readClerkSecretKey(cwd = process.cwd()) {
	const env = readFileSync(path.join(cwd, '.env'), 'utf8');
	const line = env.split('\n').find((l) => l.startsWith('CLERK_SECRET_KEY='));
	if (!line) throw new Error('CLERK_SECRET_KEY not found in .env');
	return line.slice('CLERK_SECRET_KEY='.length).trim();
}

export async function mintSignInTicket(secretKey, userId = DEV_USER_ID) {
	const res = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${secretKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ user_id: userId }),
	});
	if (!res.ok) throw new Error(`sign_in_tokens failed: ${res.status} ${await res.text()}`);
	return (await res.json()).token;
}

export async function signIn(page, ticket) {
	await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
	await page.evaluate(async (t) => {
		const res = await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket: t });
		await window.Clerk.setActive({ session: res.createdSessionId });
	}, ticket);
	await page.waitForFunction(() => Boolean(window.Clerk?.user), null, { timeout: 30_000 });
}

// ---------------------------------------------------------------------------
// Process memory sampling.
//
// Three layers of truth, cheapest first:
//   ps rss           — cheap, per-pid, but overstates (includes shared pages)
//   footprint        — macOS phys_footprint == Activity Monitor's Memory column
//   memory-infra     — Chrome's own allocator-level accounting (heavy; on demand)
// ---------------------------------------------------------------------------

export function psRss(pids) {
	const rssByPid = new Map();
	const alive = pids.filter(Boolean);
	if (!alive.length) return rssByPid;
	try {
		const out = execSync(`ps -o pid=,rss= -p ${alive.join(',')} || true`, {
			encoding: 'utf8',
			shell: '/bin/bash',
		});
		for (const line of out.split('\n')) {
			const m = line.trim().match(/^(\d+)\s+(\d+)$/);
			if (m) rssByPid.set(+m[1], +m[2]);
		}
	} catch {
		/* dead pids are fine */
	}
	return rssByPid;
}

// phys_footprint per pid in KB via /usr/bin/footprint. Header line looks like:
//   `Google Chrome Helper (Renderer) [12345]: 64-bit  Footprint: 923 MB (…)`
export function physFootprintKb(pids) {
	const byPid = new Map();
	const alive = pids.filter(Boolean);
	if (!alive.length) return byPid;
	let out = '';
	try {
		out = execSync(`/usr/bin/footprint ${alive.join(' ')} 2>/dev/null || true`, {
			encoding: 'utf8',
			shell: '/bin/bash',
			maxBuffer: 32 * 1024 * 1024,
		});
	} catch {
		return byPid;
	}
	const re = /\[(\d+)\]:.*?Footprint:\s+([\d.]+)\s+(KB|MB|GB)/g;
	let m;
	while ((m = re.exec(out))) {
		const mult = m[3] === 'GB' ? 1024 * 1024 : m[3] === 'MB' ? 1024 : 1;
		byPid.set(+m[1], Math.round(parseFloat(m[2]) * mult));
	}
	return byPid;
}

// Full per-process table for our launched browser: CDP pid+type+cpuTime joined
// with ps rss and (optionally) phys footprint.
export async function processTable(browserCdp, { withFootprint = true } = {}) {
	const { processInfo } = await browserCdp.send('SystemInfo.getProcessInfo');
	const pids = processInfo.map((p) => p.id).filter(Boolean);
	const rss = psRss(pids);
	const fp = withFootprint ? physFootprintKb(pids) : new Map();
	return processInfo.map((p) => ({
		pid: p.id,
		type: p.type,
		cpuTime: p.cpuTime ?? null,
		rssKb: rss.get(p.id) ?? null,
		footprintKb: fp.get(p.id) ?? null,
	}));
}

// ---------------------------------------------------------------------------
// Network counters: classify every response so tile / overlay / research /
// asset churn is visible even though decoded bytes never show in the JS heap.
// ---------------------------------------------------------------------------

const NET_CLASSES = [
	['overlay', /\/api\/contacts\/map-overlay/],
	['research', /\/api\/contacts\/[^/]+\/research/],
	['curated', /\/api\/contacts\/curated/],
	['apiOther', /\/api\//],
	// glyphs/sprites BEFORE tiles: glyph ranges are .pbf files too and would
	// otherwise be swallowed by the tiles class.
	['glyphs', /api\.mapbox\.com\/fonts/],
	['spritesStyles', /api\.mapbox\.com\/(styles|sprites|map-sessions)/],
	['tiles', /(\.pbf(\?|$))|(api\.mapbox\.com\/(v4|rasterarrays|raster))|(\/tiles\/)/],
	['mapboxEvents', /events\.mapbox\.com/],
	['geo', /\/geo\//],
];

export async function installNetworkCounters(cdp) {
	await cdp.send('Network.enable');
	const counters = {};
	const bump = (cls, field, n = 1) => {
		const c = (counters[cls] ??= { count: 0, encodedBytes: 0, images: 0 });
		c[field] += n;
	};
	const classByRequestId = new Map();
	cdp.on('Network.responseReceived', (e) => {
		try {
			const url = e.response?.url ?? '';
			let cls = NET_CLASSES.find(([, re]) => re.test(url))?.[0];
			if (!cls) cls = e.type === 'Image' ? 'images' : 'other';
			classByRequestId.set(e.requestId, cls);
			bump(cls, 'count');
		} catch {
			/* counters must never break the run */
		}
	});
	cdp.on('Network.loadingFinished', (e) => {
		try {
			const cls = classByRequestId.get(e.requestId);
			if (cls) {
				bump(cls, 'encodedBytes', e.encodedDataLength ?? 0);
				classByRequestId.delete(e.requestId);
			}
		} catch {
			/* ignore */
		}
	});
	cdp.on('Network.loadingFailed', (e) => {
		classByRequestId.delete(e.requestId);
	});
	return {
		snapshot: () => JSON.parse(JSON.stringify(counters)),
		// Diff `now` (a snapshot; defaults to the live counters) against `before`.
		// Pass an explicit `now` when the result must be consistent with a snapshot
		// taken at the same instant — the live counters keep moving.
		diff: (before, now) => {
			const out = {};
			for (const [cls, c] of Object.entries(now ?? counters)) {
				const b = before?.[cls] ?? { count: 0, encodedBytes: 0 };
				out[cls] = {
					count: (c.count ?? 0) - (b.count ?? 0),
					encodedBytes: (c.encodedBytes ?? 0) - (b.encodedBytes ?? 0),
				};
			}
			return out;
		},
	};
}

// ---------------------------------------------------------------------------
// memory-infra dump (Chrome allocator-level accounting, whole browser).
// Heavy — run at attribution points only. Raw events are persisted so the
// analysis can be redone offline.
// ---------------------------------------------------------------------------

export async function memoryInfraDump(browserCdp, outFile) {
	const events = [];
	const onData = (e) => {
		if (Array.isArray(e.value)) events.push(...e.value);
	};
	browserCdp.on('Tracing.dataCollected', onData);
	let started = false;
	let dumpOk = false;
	try {
		await browserCdp.send('Tracing.start', {
			traceConfig: {
				includedCategories: ['disabled-by-default-memory-infra'],
				excludedCategories: ['*'],
				// No periodic dumps: exactly one explicit detailed dump below, so the
				// offline parser never sees multiple dumps per pid (memory-infra's
				// default config would emit periodic dumps on its own).
				memoryDumpConfig: { triggers: [] },
			},
			transferMode: 'ReportEvents',
		});
		started = true;
		const res = await browserCdp.send('Tracing.requestMemoryDump', {
			levelOfDetail: 'detailed',
		});
		dumpOk = Boolean(res.success);
	} finally {
		if (started) {
			const complete = new Promise((res) => browserCdp.once('Tracing.tracingComplete', res));
			await browserCdp.send('Tracing.end');
			await complete;
		}
		browserCdp.off('Tracing.dataCollected', onData);
	}
	if (outFile) writeFileSync(outFile, JSON.stringify(events));
	return { events, dumpOk };
}

// ---------------------------------------------------------------------------
// Heap snapshot: streamed to disk (parse offline with parse-heap-snapshot.mjs).
// ---------------------------------------------------------------------------

export async function takeHeapSnapshotToFile(cdp, filePath) {
	mkdirSync(path.dirname(filePath), { recursive: true });
	const ws = createWriteStream(filePath);
	let lastChunkAt = Date.now();
	const onChunk = (e) => {
		lastChunkAt = Date.now();
		ws.write(e.chunk);
	};
	cdp.on('HeapProfiler.addHeapSnapshotChunk', onChunk);
	await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
	// Chrome usually flushes every chunk before the command resolves, but large
	// snapshots have been seen to trail — detach only after 500ms of chunk
	// silence (bounded so a wedged stream can't hang the run).
	const deadline = Date.now() + 60_000;
	while (Date.now() - lastChunkAt < 500 && Date.now() < deadline) await sleep(100);
	cdp.off('HeapProfiler.addHeapSnapshotChunk', onChunk);
	await new Promise((res) => ws.end(res));
}

// ---------------------------------------------------------------------------
// Worker-isolate heap sampling via the DevTools HTTP endpoint.
//
// playwright's Worker.evaluate can't see heap numbers (performance.memory is
// not exposed in workers) and page-session HeapProfiler.collectGarbage never
// touches worker isolates — yet v8/workers is one of the largest renderer
// pools. So the harness launches Chrome with an extra --remote-debugging-port
// (the pipe playwright uses coexists with it) and we attach to each dedicated
// worker target directly over its own WebSocket.
// ---------------------------------------------------------------------------

async function devtoolsJson(port, path_) {
	const res = await fetch(`http://127.0.0.1:${port}${path_}`, { signal: AbortSignal.timeout(3000) });
	if (!res.ok) throw new Error(`devtools ${path_}: ${res.status}`);
	return res.json();
}

export async function devtoolsAvailable(port) {
	try {
		await devtoolsJson(port, '/json/version');
		return true;
	} catch {
		return false;
	}
}

// One short-lived CDP-over-WebSocket command round-trip against a raw target.
function wsCommands(wsUrl, commands, timeoutMs = 5000) {
	return new Promise((resolve) => {
		const results = new Map();
		let ws;
		const done = (why) => {
			try {
				ws?.close();
			} catch {
				/* ignore */
			}
			resolve({ results, why });
		};
		const timer = setTimeout(() => done('timeout'), timeoutMs);
		try {
			ws = new WebSocket(wsUrl);
		} catch {
			clearTimeout(timer);
			return resolve({ results, why: 'connect-failed' });
		}
		ws.onerror = () => {
			clearTimeout(timer);
			done('error');
		};
		ws.onopen = () => {
			for (const c of commands) ws.send(JSON.stringify(c));
		};
		ws.onmessage = (e) => {
			try {
				const msg = JSON.parse(e.data);
				if (msg.id !== undefined) results.set(msg.id, msg);
				if (results.size >= commands.length) {
					clearTimeout(timer);
					done('ok');
				}
			} catch {
				/* ignore non-JSON frames */
			}
		};
	});
}

// Per-worker heap usage (optionally after forcing GC in each worker isolate).
// Never throws; returns [] when the devtools port is unavailable.
export async function workerHeapProbe(port, { gc = false } = {}) {
	let targets;
	try {
		targets = await devtoolsJson(port, '/json/list');
	} catch {
		return [];
	}
	const workers = targets.filter(
		(t) => (t.type === 'worker' || t.type === 'shared_worker') && t.webSocketDebuggerUrl
	);
	const out = [];
	for (const t of workers) {
		const commands = [];
		if (gc) {
			commands.push({ id: 1, method: 'HeapProfiler.enable' });
			commands.push({ id: 2, method: 'HeapProfiler.collectGarbage' });
		}
		commands.push({ id: 3, method: 'Runtime.getHeapUsage' });
		const { results } = await wsCommands(t.webSocketDebuggerUrl, commands, gc ? 8000 : 4000);
		const heap = results.get(3)?.result;
		out.push({
			url: (t.url || '').split('/').pop()?.slice(0, 48) || t.url,
			usedMb: heap ? +(heap.usedSize / 1048576).toFixed(1) : null,
			totalMb: heap ? +(heap.totalSize / 1048576).toFixed(1) : null,
			gc: gc || undefined,
		});
	}
	return out;
}

// ---------------------------------------------------------------------------
// In-page probes. These are serialized by playwright and executed in the page,
// so they must be fully self-contained (no closure over node-side state).
// Probes are defensive to the extreme: they read mapbox-gl 3.17 internals and
// must degrade to partial data, never throw.
// ---------------------------------------------------------------------------

// Census of every <canvas> in the document: catches second map instances,
// weather canvases, and the real backing-store sizes (which multiply by
// deviceScaleFactor for map drawing buffers). Cheap enough for every sample.
export function canvasCensusProbe() {
	try {
		const list = [];
		let totalBytes = 0;
		let mapboxCount = 0;
		for (const c of document.querySelectorAll('canvas')) {
			const bytes = (c.width || 0) * (c.height || 0) * 4;
			totalBytes += bytes;
			const cls = String(c.className || '').slice(0, 64);
			if (cls.includes('mapboxgl-canvas')) mapboxCount += 1;
			list.push({ cls, w: c.width, h: c.height, mb: +(bytes / 1048576).toFixed(1) });
		}
		list.sort((a, b) => b.mb - a.mb);
		return {
			ok: true,
			count: list.length,
			mapboxCount,
			totalMb: +(totalBytes / 1048576).toFixed(1),
			dpr: window.devicePixelRatio,
			top: list.slice(0, 12),
		};
	} catch (err) {
		return { ok: false, reason: String(err) };
	}
}

// One-time proof of which GL stack the run is actually using (hardware Metal
// vs SwiftShader) — reads the live map context, falling back to a probe canvas.
export function glInfoProbe() {
	const read = (gl) => {
		if (!gl) return null;
		try {
			const ext = gl.getExtension('WEBGL_debug_renderer_info');
			return {
				renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
				vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
			};
		} catch {
			return null;
		}
	};
	try {
		let info = null;
		let source = null;
		try {
			const c = window.__murmurMapDebug?.getCanvas?.();
			if (c) {
				info = read(c.getContext('webgl2') || c.getContext('webgl'));
				if (info) source = 'map-canvas';
			}
		} catch {
			/* context type mismatch — fall through */
		}
		if (!info) {
			const probe = document.createElement('canvas');
			info = read(probe.getContext('webgl2') || probe.getContext('webgl'));
			if (info) source = 'probe-canvas';
		}
		return { ok: Boolean(info), source, dpr: window.devicePixelRatio, ...(info || {}) };
	} catch (err) {
		return { ok: false, reason: String(err) };
	}
}

export function mapboxProbe() {
	const out = { ok: false, sources: [], listenerCounts: {}, canvas: null };
	try {
		const map = window.__murmurMapDebug;
		if (!map || !map.style) return { ...out, reason: 'no-map' };
		const style = map.style;

		const seen = new Set();
		const sumBytes = (obj, depth) => {
			if (!obj || depth > 6 || typeof obj !== 'object') return 0;
			if (seen.has(obj)) return 0;
			seen.add(obj);
			try {
				if (ArrayBuffer.isView(obj)) return obj.byteLength;
				if (obj instanceof ArrayBuffer) return obj.byteLength;
				let total = 0;
				if (Array.isArray(obj)) {
					for (const v of obj) total += sumBytes(v, depth + 1);
					return total;
				}
				if (obj instanceof Map) {
					for (const v of obj.values()) total += sumBytes(v, depth + 1);
					return total;
				}
				for (const k in obj) {
					try {
						total += sumBytes(obj[k], depth + 1);
					} catch {
						/* getters may throw */
					}
				}
				return total;
			} catch {
				return 0;
			}
		};

		const cachesObj = style._mergedSourceCaches || style._sourceCaches || {};
		for (const key of Object.keys(cachesObj)) {
			try {
				const sc = cachesObj[key];
				if (!sc) continue;
				const tiles = sc._tiles ? Object.values(sc._tiles) : [];
				let cachedTiles = 0;
				const cachedTileObjs = [];
				if (sc._cache && sc._cache.order && sc._cache.data) {
					cachedTiles = sc._cache.order.length;
					for (const k2 of sc._cache.order) {
						const arr = sc._cache.data[k2];
						if (Array.isArray(arr)) {
							for (const entry of arr) {
								if (entry && entry.value) cachedTileObjs.push(entry.value);
							}
						}
					}
				}
				let estBytes = 0;
				let textureBytes = 0;
				for (const t of tiles.concat(cachedTileObjs)) {
					try {
						if (t.texture && t.texture.size) {
							textureBytes += (t.texture.size[0] || 0) * (t.texture.size[1] || 0) * 4;
						}
						estBytes += sumBytes(t.buckets, 1);
						estBytes += sumBytes(t.latestFeatureIndex, 1);
						if (t.glyphAtlasImage && t.glyphAtlasImage.data) {
							estBytes += t.glyphAtlasImage.data.byteLength || 0;
						}
						if (t.imageAtlas && t.imageAtlas.image && t.imageAtlas.image.data) {
							estBytes += t.imageAtlas.image.data.byteLength || 0;
						}
					} catch {
						/* per-tile best effort */
					}
				}
				out.sources.push({
					id: key,
					activeTiles: tiles.length,
					cachedTiles,
					cacheMax: sc._cache ? sc._cache.max : null,
					estCpuBytes: estBytes,
					estTextureBytes: textureBytes,
				});
			} catch {
				/* per-source best effort */
			}
		}

		// Style image atlas (map.addImage registry) — never evicted today.
		try {
			const im = style.imageManager;
			let imageCount = 0;
			let imageBytes = 0;
			const walkImages = (container) => {
				if (!container) return;
				const values =
					container instanceof Map
						? [...container.values()]
						: typeof container === 'object'
							? Object.values(container)
							: [];
				for (const v of values) {
					if (v && v.data && v.data.data && typeof v.data.data.byteLength === 'number') {
						imageCount += 1;
						imageBytes += v.data.data.byteLength;
					} else if (v && typeof v === 'object' && !ArrayBuffer.isView(v)) {
						// scoped: {scope: {id: StyleImage}} — one level down
						walkImages(v);
					}
				}
			};
			walkImages(im && im.images);
			out.imageAtlas = { imageCount, imageBytes };
		} catch {
			/* best effort */
		}

		// Glyph bitmaps.
		try {
			const gm = style.glyphManager;
			let fontstacks = 0;
			let glyphCount = 0;
			let glyphBytes = 0;
			const entries = gm && gm.entries;
			const stacks =
				entries instanceof Map ? [...entries.values()] : entries ? Object.values(entries) : [];
			for (const st of stacks) {
				fontstacks += 1;
				const glyphs = st && st.glyphs;
				const gvals =
					glyphs instanceof Map ? [...glyphs.values()] : glyphs ? Object.values(glyphs) : [];
				for (const g of gvals) {
					if (g && g.bitmap && g.bitmap.data) {
						glyphCount += 1;
						glyphBytes += g.bitmap.data.byteLength || 0;
					}
				}
			}
			out.glyphs = { fontstacks, glyphCount, glyphBytes };
		} catch {
			/* best effort */
		}

		try {
			const ls = map._listeners || {};
			for (const evt of Object.keys(ls)) {
				out.listenerCounts[evt] = Array.isArray(ls[evt]) ? ls[evt].length : 0;
			}
		} catch {
			/* best effort */
		}

		try {
			const c = map.getCanvas();
			out.canvas = { width: c.width, height: c.height };
		} catch {
			/* best effort */
		}

		out.ok = true;
		return out;
	} catch (err) {
		return { ...out, reason: String(err) };
	}
}

export function queryCacheProbe() {
	try {
		const qc = window.__murmurQueryClient;
		if (!qc) return { ok: false, reason: 'no-query-client' };
		const all = qc.getQueryCache().getAll();
		const families = {};
		for (const q of all) {
			const k = q.queryKey;
			let fam = 'other';
			if (Array.isArray(k) && k[0] === 'contacts') {
				if (k[1] === 'list' && k[2] === 'map-overlay') fam = 'overlay';
				else if (k[1] === 'detail' && k[3] === 'research') fam = 'research';
				else if (k[1] === 'list') fam = 'list';
				else fam = 'contacts-other';
			}
			const f = (families[fam] ??= { count: 0, active: 0, estChars: 0 });
			f.count += 1;
			try {
				if (q.getObserversCount() > 0) f.active += 1;
			} catch {
				/* older API */
			}
			try {
				const d = q.state && q.state.data;
				if (d !== undefined) {
					const s = JSON.stringify(d);
					if (s) f.estChars += s.length;
				}
			} catch {
				/* circular or huge — skip */
			}
		}
		return { ok: true, totalQueries: all.length, families };
	} catch (err) {
		return { ok: false, reason: String(err) };
	}
}

// Override every source cache's tile LRU (arbitration experiments). Returns the
// list of source ids touched. Sizes are per-SourceCache because mapbox copies
// min/max from the map at source-add time.
export function tileCacheOverrideProbe(maxSize) {
	const touched = [];
	try {
		const map = window.__murmurMapDebug;
		const style = map && map.style;
		if (!style) return touched;
		const cachesObj = style._mergedSourceCaches || style._sourceCaches || {};
		for (const key of Object.keys(cachesObj)) {
			try {
				const sc = cachesObj[key];
				sc._minTileCacheSize = 0;
				sc._maxTileCacheSize = maxSize;
				if (sc._cache && typeof sc._cache.setMaxSize === 'function') {
					sc._cache.setMaxSize(maxSize);
				}
				touched.push(key);
			} catch {
				/* per-source best effort */
			}
		}
		try {
			map._minTileCacheSize = 0;
			map._maxTileCacheSize = maxSize;
		} catch {
			/* best effort */
		}
	} catch {
		/* never throw */
	}
	return touched;
}

// Live-drop arbitration probe: empty every tile LRU (destroys cached tiles and
// their GL textures via the cache's onRemove). Returns what was dropped.
export function dropTileCachesProbe(alsoActive) {
	const dropped = [];
	try {
		const map = window.__murmurMapDebug;
		const style = map && map.style;
		if (!style) return dropped;
		const cachesObj = style._mergedSourceCaches || style._sourceCaches || {};
		for (const key of Object.keys(cachesObj)) {
			try {
				const sc = cachesObj[key];
				const before = sc._cache && sc._cache.order ? sc._cache.order.length : 0;
				const active = sc._tiles ? Object.keys(sc._tiles).length : 0;
				if (sc._cache && typeof sc._cache.reset === 'function') sc._cache.reset();
				if (alsoActive && typeof sc.clearTiles === 'function') sc.clearTiles();
				dropped.push({ id: key, cachedDropped: before, activeTiles: active, activeCleared: Boolean(alsoActive) });
			} catch {
				/* per-source best effort */
			}
		}
		if (map.triggerRepaint) map.triggerRepaint();
	} catch {
		/* never throw */
	}
	return dropped;
}
