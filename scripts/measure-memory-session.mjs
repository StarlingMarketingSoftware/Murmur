// Long-mixed-session browser-memory harness ("longmix").
//
// Reproduces the real-world profile that climbs to multi-GB: repeated cycles of
// searches + cross-country hops + street-zoom pan bursts (fat overlay rows) +
// marker hovers (research cache) + dashboard<->campaign client-side navigation
// + idle. Samples phys footprint (== Activity Monitor) per process, JS heap,
// mapbox-internal cache stats, React Query cache stats, and network counters.
//
// Usage:
//   NEXT_DIST_DIR=.next-mem VERCEL=1 npm run build
//   NEXT_DIST_DIR=.next-mem npx next start -p 3010
//   node scripts/measure-memory-session.mjs --url http://localhost:3010 --label baseline \
//        [--cycles 4] [--repeats 1] [--attrib] [--attrib-every-cycle] [--gc-workers]
//        [--dsf 2] [--headed] [--tile-cache N] [--drop-tiles-at-end] [--pressure-probe]
//        [--entry-idle-ms 60000] [--idle-ms 120000] [--final-idle-ms 300000]
//        [--campaign-path /murmur/campaign/<id>] [--print-manual]
//
// Gate metric: M_user = footprint(app renderer pid) + max(0, gpu - gpuBaseline).
// Targets: time-weighted avg <= 1.0GB, peak <= 1.5GB (each +10% noise band).
//
// The original scripts/measure-dashboard-memory.mjs (sweep20) is frozen for
// comparability with June baselines — this script deliberately does not touch it.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
	sleep,
	makeArgReader,
	readClerkSecretKey,
	mintSignInTicket,
	signIn,
	processTable,
	installNetworkCounters,
	memoryInfraDump,
	takeHeapSnapshotToFile,
	mapboxProbe,
	queryCacheProbe,
	tileCacheOverrideProbe,
	dropTileCachesProbe,
	devtoolsAvailable,
	workerHeapProbe,
	canvasCensusProbe,
	glInfoProbe,
} from './lib/memharness.mjs';
import { summarizeMemoryInfra, formatSummary } from './lib/parse-memory-infra.mjs';

const args = makeArgReader(process.argv);
const BASE_URL = args.str('url', 'http://localhost:3010');
const LABEL = args.str('label', 'longmix');
const CYCLES = args.num('cycles', 4);
const REPEATS = args.num('repeats', 1);
const ENTRY_IDLE_MS = args.num('entry-idle-ms', 60_000);
const IDLE_MS = args.num('idle-ms', 120_000);
const FINAL_IDLE_MS = args.num('final-idle-ms', 300_000);
const ATTRIB = args.flag('attrib');
// memory-infra only (no heap snapshot — snapshots inflate footprint ~100MB)
// after every cycle's idle, so cN-vs-cN+1 pool diffs exist when an anomaly
// fires mid-run. Requires --attrib.
const ATTRIB_EVERY_CYCLE = args.flag('attrib-every-cycle');
// Force GC inside each worker isolate before sampling: page-session GC never
// collects workers, so without this the v8/workers pool reads as "growth" even
// when it's just uncollected garbage.
const GC_WORKERS = args.flag('gc-workers');
// deviceScaleFactor for the page (default 1). Real Retina users run 2 — every
// viewport-sized framebuffer/canvas costs ~4x — so DPR-sensitive fixes must be
// judged with --dsf 2; the DPR-1 default stays the comparable regression gate.
const DSF = args.num('dsf', 1);
const TILE_CACHE = args.str('tile-cache', null);
const DROP_TILES_AT_END = args.flag('drop-tiles-at-end');
// At final idle: force GC, then Memory.simulatePressureNotification(critical),
// wait, resample. A big drop ⇒ allocator slack/fragmentation from churn; no
// drop ⇒ real live retention.
const PRESSURE_PROBE = args.flag('pressure-probe');
// Extra devtools HTTP endpoint for raw worker-target attachment (coexists with
// playwright's pipe). Offset by pid so serialized runs can't collide.
const DEVTOOLS_PORT = 19555 + (process.pid % 200);
const CAMPAIGN_PATH_ARG = args.str('campaign-path', null);
const OUT_DIR = args.str('out-dir', path.join(process.cwd(), '.memory-baselines'));

// ---------------------------------------------------------------------------
// Fixed scenario constants. Keep FIXED across runs — comparability depends on
// the scenario being identical. Curated results themselves are intentionally
// non-deterministic (BY DESIGN); runs are compared via medians over --repeats
// and normalized by the network row counters.
// ---------------------------------------------------------------------------

const ENTRY_SEARCH = '[Booking] Music Venues (Tennessee)';

// Consumed by the campaign→dashboard pending-search handoff (2 per cycle).
// Alternates [Booking]-prefixed (curated booking search → fat booking-extra
// overlay rows at z≥8) and bare free-text ("Search Anything" vector path) so
// both search classes churn every cycle.
const REFINE_SEARCHES = [
	'[Booking] Music Venues (North Carolina)',
	'Coffee shops in Austin',
	'[Booking] Recording Studios (Los Angeles)',
	'Wedding photographers in Chicago',
	'[Booking] Art Galleries (Portland)',
	'Jazz clubs in New York',
	'[Booking] Breweries (Denver)',
	'Yoga studios in San Diego',
	'[Booking] Bookstores (Seattle)',
	'Event venues in Dallas',
	'[Booking] Music Venues (Boston)',
	'Music festivals in California',
];

const HOP_VIEWPORTS = [
	{ lng: -90.049, lat: 35.1495, zoom: 9 }, // Memphis
	{ lng: -90.0715, lat: 29.9511, zoom: 10 }, // New Orleans
	{ lng: -84.388, lat: 33.749, zoom: 11 }, // Atlanta
	{ lng: -80.1918, lat: 25.7617, zoom: 12 }, // Miami
	{ lng: -77.0369, lat: 38.9072, zoom: 13 }, // DC
	{ lng: -73.9857, lat: 40.7484, zoom: 14 }, // NYC
	{ lng: -87.6298, lat: 41.8781, zoom: 12 }, // Chicago
	{ lng: -104.9903, lat: 39.7392, zoom: 10 }, // Denver
];

const STREET_CITIES = [
	{ name: 'Nashville', lng: -86.7816, lat: 36.1627 },
	{ name: 'Chicago', lng: -87.6298, lat: 41.8781 },
	{ name: 'LA', lng: -118.2437, lat: 34.0522 },
];
const STREET_ZOOM = 16;
const STREET_MICRO_PANS = 5;
// Overlay/booking-extra fetch windows are quantized to a 0.05° grid at street
// zooms (getBackgroundDotsQuantizationDeg), so each pan must land in a fresh
// grid cell to mint a new overlay query key. Steps alternate around the city
// center (+0.06, -0.06, +0.12, -0.12, +0.18) to stay inside the metro.
const STREET_PAN_STEP = 0.06;

const HOVERS_PER_CITY = 10;
const HOVER_DWELL_MS = 1200;

const MARKER_HIT_LAYERS = [
	'murmur-selected-marker-icons',
	'murmur-base-hit',
	'murmur-promo-dot-hit',
	'murmur-booking-pin-hit',
	'murmur-promo-pin-hit',
	'murmur-markers-all-hit',
];

const PAN_BACK_VIEWPORT = { lng: -86.7816, lat: 36.1627, zoom: 9 }; // Nashville

// ---------------------------------------------------------------------------

function printManualCard() {
	console.log(`
SAFARI MANUAL SPOT-CHECK CARD (one longmix cycle, ~15 min)
Run in a fresh real-Safari window (single tab), prod build or production.
Record Activity Monitor's Memory column for "Safari Web Content" (this tab)
and "Safari Graphics and Media" at each CHECKPOINT, into
.memory-baselines/safari-manual-<date>.md

 1. Sign in, open /murmur/dashboard?search=${encodeURIComponent(ENTRY_SEARCH)}
    Wait 60s idle.                                      CHECKPOINT entry-idle
 2. Pan/zoom through: Memphis z9, New Orleans z10, Atlanta z11, Miami z12,
    DC z13, NYC z14, Chicago z12, Denver z10 (~3s each) CHECKPOINT hops
 4. In Nashville, Chicago, LA: zoom to street level (z16) and hop across 5
    different neighborhoods (~5km apart, ~3s each).     CHECKPOINT street
 5. In each of those cities hover ~10 marker pins (1-2s each) so research
    panels open.                                        CHECKPOINT hovers
 6. Open a campaign from the dashboard, wait 20s, then run a search from the
    campaign's search bar (landing back on the dashboard). Do this twice with:
      ${REFINE_SEARCHES.slice(0, 2).join(' | ')}
                                                        CHECKPOINT nav
 7. Leave the tab idle and visible for 2 min.           CHECKPOINT idle
 8. (Optional) Repeat 2-7 for a second cycle.
Also capture Web Inspector > Timelines > Memory at entry and at the end.
Expectation: Safari Web Content within ~1.3x of Chrome M_app at the same
checkpoint; a big divergence flags a Safari-only pool.
`);
}

if (args.flag('print-manual')) {
	printManualCard();
	process.exit(0);
}

// ---------------------------------------------------------------------------

async function runOnce(repeatIndex, chromium, ticket) {
	// GL stack is NOT assumed: the run logs WEBGL_debug_renderer_info at entry
	// (headless macOS Chrome has been observed on hardware Metal — the
	// ioaccelerator/iosurface pools in memory-infra dumps are IOKit hardware
	// mappings). --headed remains available for visible spot-checks.
	const browser = await chromium.launch({
		channel: 'chrome',
		headless: !args.flag('headed'),
		args: ['--enable-precise-memory-info', `--remote-debugging-port=${DEVTOOLS_PORT}`],
	});
	const browserCdp = await browser.newBrowserCDPSession();
	const context = await browser.newContext({
		viewport: { width: 1680, height: 1050 },
		deviceScaleFactor: DSF,
	});
	const page = await context.newPage();
	const devtoolsOk = await devtoolsAvailable(DEVTOOLS_PORT);
	if (!devtoolsOk) {
		console.warn(
			`devtools port ${DEVTOOLS_PORT} unavailable — worker heap sampling/GC disabled this run`
		);
	}
	const cdp = await context.newCDPSession(page);
	await cdp.send('Performance.enable');
	await cdp.send('HeapProfiler.enable');
	const net = await installNetworkCounters(cdp);

	const run = {
		label: LABEL,
		scenario: 'longmix',
		baseUrl: BASE_URL,
		cycles: CYCLES,
		repeatIndex,
		tileCacheOverride: TILE_CACHE ? Number(TILE_CACHE) : null,
		startedAt: new Date().toISOString(),
		gpuBaselineKb: null,
		appRendererPid: null,
		samples: [],
		idleTicks: [],
		attrib: {},
		events: [],
	};

	const outBase = path.join(
		OUT_DIR,
		`${LABEL}-r${repeatIndex}-${new Date().toISOString().replace(/[:.]/g, '-')}`
	);
	mkdirSync(OUT_DIR, { recursive: true });
	mkdirSync(path.join(OUT_DIR, 'snapshots'), { recursive: true });

	const identifyAppRenderer = (procs) => {
		// The main-frame renderer hosting mapbox dominates renderer footprint.
		// Fall back to ps rss so identification still works if /usr/bin/footprint
		// ever yields nothing (otherwise appKb silently stays 0 for the whole run).
		const size = (p) => p.footprintKb ?? p.rssKb ?? 0;
		const renderers = procs.filter((p) => p.type === 'renderer' && size(p) > 0);
		renderers.sort((a, b) => size(b) - size(a));
		return renderers[0]?.pid ?? null;
	};

	let lastNetSnapshot = net.snapshot();

	const sample = async (phase, { probes = true, mapProbe = true } = {}) => {
		// Probes create garbage — run them BEFORE the GC pair so transient strings
		// don't pollute the heap numbers.
		let queryCache = null;
		let mapStats = null;
		if (probes) {
			try {
				queryCache = await page.evaluate(queryCacheProbe);
			} catch {
				queryCache = { ok: false, reason: 'evaluate-failed' };
			}
		}
		if (mapProbe) {
			try {
				mapStats = await page.evaluate(mapboxProbe);
			} catch {
				mapStats = { ok: false, reason: 'evaluate-failed' };
			}
		}
		let canvases = null;
		try {
			canvases = await page.evaluate(canvasCensusProbe);
		} catch {
			canvases = { ok: false, reason: 'evaluate-failed' };
		}
		await cdp.send('HeapProfiler.collectGarbage');
		await sleep(500);
		await cdp.send('HeapProfiler.collectGarbage');
		await sleep(500);
		// Per-worker JS heap via raw devtools targets (playwright Worker.evaluate
		// can't see heap numbers, and page-session GC never collects worker
		// isolates — with --gc-workers each worker is GC'd here, BEFORE the
		// footprint read, so the process numbers reflect it too).
		const workers = devtoolsOk ? await workerHeapProbe(DEVTOOLS_PORT, { gc: GC_WORKERS }) : [];
		const { metrics } = await cdp.send('Performance.getMetrics');
		const get = (n) => metrics.find((m) => m.name === n)?.value ?? null;
		const procs = await processTable(browserCdp);
		if (!run.appRendererPid) run.appRendererPid = identifyAppRenderer(procs);
		const app = procs.find((p) => p.pid === run.appRendererPid);
		if (run.appRendererPid && !app) {
			console.warn(`[${phase}] app renderer pid ${run.appRendererPid} missing (crashed?)`);
		}
		const gpu = procs.find((p) => p.type === 'GPU');
		const appKb = app?.footprintKb ?? app?.rssKb ?? 0;
		const gpuKb = gpu?.footprintKb ?? gpu?.rssKb ?? 0;
		const gpuDeltaKb = Math.max(0, gpuKb - (run.gpuBaselineKb ?? 0));
		// Snapshot once and diff against that same snapshot — diffing against the
		// live counters would double-count anything landing between the two reads.
		const netNow = net.snapshot();
		const s = {
			phase,
			at: new Date().toISOString(),
			jsHeapUsedMb: +(get('JSHeapUsedSize') / 1048576).toFixed(1),
			jsHeapTotalMb: +(get('JSHeapTotalSize') / 1048576).toFixed(1),
			domNodes: get('Nodes'),
			jsEventListeners: get('JSEventListeners'),
			documents: get('Documents'),
			processes: procs,
			appFootprintKb: appKb,
			gpuFootprintKb: gpuKb,
			gpuDeltaKb,
			mUserKb: appKb + gpuDeltaKb,
			netSincePrev: net.diff(lastNetSnapshot, netNow),
			queryCache,
			mapStats,
			workers,
			canvases,
		};
		lastNetSnapshot = netNow;
		run.samples.push(s);
		const mb = (kb) => (kb / 1024).toFixed(0);
		console.log(
			`[${phase}] heap ${s.jsHeapUsedMb}MB nodes ${s.domNodes} | app ${mb(appKb)}MB gpuΔ ${mb(gpuDeltaKb)}MB → M_user ${mb(s.mUserKb)}MB` +
				(queryCache?.ok
					? ` | RQ ovl ${queryCache.families?.overlay?.count ?? 0}/${((queryCache.families?.overlay?.estChars ?? 0) / 524288).toFixed(1)}MB res ${queryCache.families?.research?.count ?? 0} list ${queryCache.families?.list?.count ?? 0}`
					: '') +
				(workers.length
					? ` | workers ${workers.map((w) => w.usedMb ?? '?').join('+')}MB`
					: '') +
				(canvases?.ok ? ` | cv ${canvases.count}/${canvases.totalMb}MB` : '')
		);
		if (canvases?.ok && canvases.mapboxCount > 1) {
			console.warn(
				`  [${phase}] ${canvases.mapboxCount} mapboxgl canvases present:`,
				canvases.top
					.filter((c) => c.cls.includes('mapboxgl-canvas'))
					.map((c) => `${c.w}x${c.h}`)
					.join(', ')
			);
		}
		return s;
	};

	const idleTick = async (phase) => {
		const procs = await processTable(browserCdp, { withFootprint: true });
		const app = procs.find((p) => p.pid === run.appRendererPid);
		const gpu = procs.find((p) => p.type === 'GPU');
		run.idleTicks.push({
			phase,
			at: new Date().toISOString(),
			appFootprintKb: app?.footprintKb ?? null,
			gpuFootprintKb: gpu?.footprintKb ?? null,
			appCpuTime: app?.cpuTime ?? null,
			gpuCpuTime: gpu?.cpuTime ?? null,
		});
	};

	const attribPass = async (tag, { snapshot = true } = {}) => {
		if (!ATTRIB) return;
		console.log(
			`  … attribution pass (${tag}): memory-infra dump${snapshot ? ' + heap snapshot' : ''}`
		);
		try {
			const infraFile = `${outBase}-infra-${tag}.json`;
			const { events } = await memoryInfraDump(browserCdp, infraFile);
			const rows = summarizeMemoryInfra(events);
			run.attrib[tag] = { infraFile, summary: rows };
			console.log(formatSummary(rows, { minMb: 10 }));
		} catch (err) {
			console.warn(`  memory-infra dump failed (${tag}):`, err.message);
		}
		if (!snapshot) return;
		try {
			const snapFile = path.join(OUT_DIR, 'snapshots', `${LABEL}-r${repeatIndex}-${tag}.heapsnapshot`);
			await takeHeapSnapshotToFile(cdp, snapFile);
			run.attrib[`${tag}-heapsnapshot`] = snapFile;
			console.log(`  heap snapshot → ${snapFile}`);
		} catch (err) {
			console.warn(`  heap snapshot failed (${tag}):`, err.message);
		}
	};

	const jumpTo = async (vp, settleMs = 2000) => {
		await page.evaluate(
			(v) => window.__murmurMapDebug.jumpTo({ center: [v.lng, v.lat], zoom: v.zoom }),
			vp
		);
		await sleep(settleMs);
	};

	// GPU baseline BEFORE any app content loads (about:blank): the landing page
	// itself holds GPU memory that is freed on navigation, so sampling after it
	// loads would inflate the baseline and understate the map's gpuDelta forever.
	{
		const procs = await processTable(browserCdp);
		const gpu = procs.find((p) => p.type === 'GPU');
		if (!gpu) console.warn('no GPU process found at baseline — gpuDelta will be absolute');
		run.gpuBaselineKb = gpu?.footprintKb ?? gpu?.rssKb ?? 0;
		console.log(`gpu baseline ${(run.gpuBaselineKb / 1024).toFixed(0)}MB`);
	}

	// --- Sign in.
	await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

	await signIn(page, ticket);
	console.log('signed in as', await page.evaluate(() => window.Clerk.user?.id));

	// --- Entry: dashboard in interactive map view via rehydrated curated search.
	await page.goto(`${BASE_URL}/murmur/dashboard?search=${encodeURIComponent(ENTRY_SEARCH)}`, {
		waitUntil: 'domcontentloaded',
	});
	try {
		await page.waitForFunction(() => Boolean(window.__murmurMapDebug?.getCanvas?.()), null, {
			timeout: 120_000,
		});
	} catch (err) {
		await page.screenshot({ path: '/tmp/measure-session-failure.png' });
		console.error('map never appeared; screenshot: /tmp/measure-session-failure.png');
		throw err;
	}

	// Tag the map instance so singleton survival across route round-trips is provable.
	await page.evaluate(() => {
		window.__murmurMapDebug.__memHarnessTag = 'longmix';
	});

	// One-time GL-stack + DPR proof (settles hardware-Metal vs SwiftShader).
	try {
		run.glInfo = await page.evaluate(glInfoProbe);
		console.log(
			`GL: ${run.glInfo?.renderer ?? '?'} (${run.glInfo?.vendor ?? '?'}) via ${run.glInfo?.source ?? '?'} | dpr ${run.glInfo?.dpr}`
		);
	} catch {
		/* proof is best-effort */
	}

	if (TILE_CACHE) {
		const touched = await page.evaluate(tileCacheOverrideProbe, Number(TILE_CACHE));
		console.log(`tile-cache override ${TILE_CACHE} applied to ${touched.length} sources`);
		run.events.push({ type: 'tile-cache-override', touched });
	}

	console.log('map ready; settling…');
	await sleep(ENTRY_IDLE_MS);
	await sample('entry-idle');
	await attribPass('entry');

	// --- Discover a campaign path for the nav block.
	let campaignPath = CAMPAIGN_PATH_ARG;
	if (!campaignPath) {
		try {
			campaignPath = await page.evaluate(async () => {
				const res = await fetch('/api/campaigns');
				const json = await res.json();
				const list = Array.isArray(json) ? json : (json?.campaigns ?? json?.data ?? []);
				const first = Array.isArray(list) && list.length ? list[0] : null;
				return first && first.id != null ? `/murmur/campaign/${first.id}` : null;
			});
		} catch {
			campaignPath = null;
		}
	}
	if (campaignPath) console.log(`campaign path for nav block: ${campaignPath}`);
	else console.warn('no campaign found — nav block will be skipped');

	// ------------------------------------------------------------------ cycles
	for (let c = 1; c <= CYCLES; c++) {
		const tag = `c${c}`;

		// 1. Searches ride the nav round-trips (block 5): the map view's ledger
		// results bar no longer hosts a refine <input>, and URL rehydration is
		// once-per-mount, so the harness uses the campaign→dashboard
		// pending-search handoff — the path campaign searchbars actually use.

		// 2. Cross-country hops.
		for (const vp of HOP_VIEWPORTS) await jumpTo(vp, 2000);
		await sample(`${tag}-hops`, { mapProbe: false });

		// 3+4. Street-zoom pan bursts + marker hovers per city.
		for (const city of STREET_CITIES) {
			await jumpTo({ lng: city.lng, lat: city.lat, zoom: STREET_ZOOM }, 2500);
			for (let i = 1; i <= STREET_MICRO_PANS; i++) {
				// +1, -1, +2, -2, +3 × STREET_PAN_STEP — every step crosses into a new
				// 0.05° overlay-fetch quantization cell (see STREET_PAN_STEP comment).
				const offset = (i % 2 === 0 ? -1 : 1) * Math.ceil(i / 2) * STREET_PAN_STEP;
				await jumpTo({ lng: city.lng + offset, lat: city.lat, zoom: STREET_ZOOM }, 2500);
			}
			// Hover pass at the city center (the last micro-pan parked ~15km out,
			// where queryRenderedFeatures finds no markers).
			await jumpTo({ lng: city.lng, lat: city.lat, zoom: STREET_ZOOM }, 2500);
			// Project real rendered marker features to screen points.
			const points = await page.evaluate(
				({ layers, cap }) => {
					try {
						const map = window.__murmurMapDebug;
						const present = layers.filter((l) => map.getLayer && map.getLayer(l));
						if (!present.length) return [];
						const feats = map.queryRenderedFeatures(undefined, { layers: present });
						const container = map.getContainer();
						const rect = container.getBoundingClientRect();
						// map.project() returns container-layout px; the container normally
						// counter-zooms the html root back to scale 1, but derive the actual
						// visual/layout ratio so a residual CSS zoom can't skew mouse targets.
						const sx = container.clientWidth ? rect.width / container.clientWidth : 1;
						const sy = container.clientHeight ? rect.height / container.clientHeight : 1;
						const seen = new Set();
						const pts = [];
						for (const f of feats) {
							const g = f.geometry;
							if (!g || g.type !== 'Point') continue;
							const p = map.project(g.coordinates);
							const x = Math.round(rect.left + p.x * sx);
							const y = Math.round(rect.top + p.y * sy);
							const key = `${Math.round(x / 8)}:${Math.round(y / 8)}`;
							if (seen.has(key)) continue;
							seen.add(key);
							if (x < 5 || y < 5 || x > window.innerWidth - 5 || y > window.innerHeight - 5)
								continue;
							pts.push({ x, y });
							if (pts.length >= cap) break;
						}
						return pts;
					} catch {
						return [];
					}
				},
				{ layers: MARKER_HIT_LAYERS, cap: HOVERS_PER_CITY }
			);
			for (const pt of points) {
				await page.mouse.move(pt.x, pt.y, { steps: 4 });
				await sleep(HOVER_DWELL_MS);
			}
			run.events.push({ type: 'hover-pass', cycle: c, city: city.name, hovered: points.length });
			console.log(`  ${tag} ${city.name}: hovered ${points.length} markers`);
		}
		await sample(`${tag}-street-hovers`);

		// 5. Route round-trips (client-side; the persistent map must survive),
		// each returning WITH a real search via the pending-search handoff:
		// sessionStorage payload + a BARE dashboard URL (any explicit search
		// params in the URL block the handoff), which the dashboard consumes
		// through its standard submit path and re-engages the map view.
		if (campaignPath) {
			for (let i = 0; i < 2; i++) {
				const navOk = await page.evaluate((p) => {
					if (!window.__murmurNavDebug?.push) return false;
					window.__murmurNavDebug.push(p);
					return true;
				}, campaignPath);
				if (!navOk) {
					console.warn(`${tag}: __murmurNavDebug missing — nav block skipped`);
					break;
				}
				await page
					.waitForFunction((p) => location.pathname === p, campaignPath, { timeout: 30_000 })
					.catch(() => console.warn(`${tag}: campaign nav did not land`));
				await sleep(20_000);
				const q = REFINE_SEARCHES[((c - 1) * 2 + i) % REFINE_SEARCHES.length];
				await page.evaluate((query) => {
					sessionStorage.setItem(
						'murmur_pending_search',
						JSON.stringify({ query, fromCampaignId: null })
					);
				}, q);
				await page.evaluate(() => window.__murmurNavDebug.push('/murmur/dashboard'));
				await page
					.waitForFunction(() => location.pathname === '/murmur/dashboard', null, {
						timeout: 30_000,
					})
					.catch(() => console.warn(`${tag}: dashboard nav-back did not land`));
				// Let the handoff search execute and the map view re-engage.
				await sleep(15_000);
				const urlAfter = await page.evaluate(() => location.search);
				run.events.push({ type: 'handoff-search', cycle: c, query: q, urlAfter });
				if (!urlAfter.includes('search=')) {
					console.warn(`${tag}: handoff search did not engage (url: ${urlAfter})`);
				}
			}
			const mapSurvived = await page.evaluate(
				() => window.__murmurMapDebug?.__memHarnessTag === 'longmix'
			);
			if (!mapSurvived) console.warn(`${tag}: PERSISTENT MAP DID NOT SURVIVE NAV (unexpected!)`);
			run.events.push({ type: 'nav-roundtrips', cycle: c, mapSurvived });
			await sample(`${tag}-nav`, { mapProbe: false });
		}

		// 6. Visible idle with lightweight ticks (cpuTime deltas expose the
		// always-hot-GPU-pipeline hypothesis).
		const idleStart = Date.now();
		while (Date.now() - idleStart < IDLE_MS) {
			await sleep(Math.min(30_000, IDLE_MS - (Date.now() - idleStart)));
			await idleTick(`${tag}-idle`);
		}
		await sample(`${tag}-idle`);
		if (c === 1) await attribPass('cycle1');
		else if (ATTRIB_EVERY_CYCLE) await attribPass(`cycle${c}`, { snapshot: false });
	}

	// --- Final: pan back (cache-hit check), long idle, final sample + attrib.
	const preBack = net.snapshot();
	await jumpTo(PAN_BACK_VIEWPORT, 2000);
	const backDiff = net.diff(preBack);
	console.log(
		`pan-back tile refetches: ${backDiff.tiles?.count ?? 0} (cache-render expected under current config)`
	);
	run.events.push({ type: 'pan-back', netDiff: backDiff });

	const finalIdleStart = Date.now();
	while (Date.now() - finalIdleStart < FINAL_IDLE_MS) {
		await sleep(Math.min(30_000, FINAL_IDLE_MS - (Date.now() - finalIdleStart)));
		await idleTick('final-idle');
	}
	await sample('final-idle');
	await attribPass('final');

	// --- Optional memory-pressure discrimination probe: a big drop after the
	// critical-pressure signal ⇒ the "growth" was allocator slack/fragmentation
	// kept warm by churn; no drop ⇒ genuinely live retention.
	if (PRESSURE_PROBE) {
		try {
			await cdp.send('Memory.simulatePressureNotification', { level: 'critical' });
			console.log('  … simulated critical memory pressure');
			await sleep(30_000);
			await sample('after-pressure');
			run.events.push({ type: 'pressure-probe' });
		} catch (err) {
			console.warn('  pressure probe failed:', err.message);
		}
	}

	// --- Optional live-drop arbitration probe: the measured drop IS the mapbox
	// tile/texture share of peak memory.
	if (DROP_TILES_AT_END) {
		const dropped = await page.evaluate(dropTileCachesProbe, false);
		await cdp.send('HeapProfiler.collectGarbage');
		await sleep(10_000);
		await sample('after-tile-drop');
		run.events.push({ type: 'tile-drop', dropped });
		const droppedActive = await page.evaluate(dropTileCachesProbe, true);
		await cdp.send('HeapProfiler.collectGarbage');
		await sleep(10_000);
		await sample('after-tile-drop-active');
		run.events.push({ type: 'tile-drop-active', dropped: droppedActive });
		await attribPass('after-drop');
	}

	// --- Gate summary (time-weighted average + peak of M_user). The tile-drop
	// and pressure probes are arbitration experiments, not user experience —
	// keep them out.
	const gateSamples = run.samples.filter(
		(s) => s.mUserKb > 0 && !s.phase.startsWith('after-tile-drop') && s.phase !== 'after-pressure'
	);
	let weighted = 0;
	let dt = 0;
	for (let i = 1; i < gateSamples.length; i++) {
		const w = (new Date(gateSamples[i].at) - new Date(gateSamples[i - 1].at)) / 1000;
		weighted += gateSamples[i].mUserKb * w;
		dt += w;
	}
	const avgKb = dt ? weighted / dt : 0;
	const peakKb = gateSamples.length ? Math.max(...gateSamples.map((s) => s.mUserKb)) : 0;
	run.gate = {
		avgMUserMb: +(avgKb / 1024).toFixed(0),
		peakMUserMb: +(peakKb / 1024).toFixed(0),
		avgTargetMb: 1024,
		peakTargetMb: 1536,
		avgPass: avgKb / 1024 <= 1024 * 1.1,
		peakPass: peakKb / 1024 <= 1536 * 1.1,
	};
	console.log(
		`\nGATE: avg M_user ${run.gate.avgMUserMb}MB (target ≤1024, ${run.gate.avgPass ? 'PASS' : 'FAIL'}) | ` +
			`peak ${run.gate.peakMUserMb}MB (target ≤1536, ${run.gate.peakPass ? 'PASS' : 'FAIL'})`
	);

	run.finishedAt = new Date().toISOString();
	const file = `${outBase}.json`;
	writeFileSync(file, JSON.stringify(run, null, 2));
	console.log(`wrote ${file}`);

	// browser.close() has been observed to hang after long CDP sessions; the run's
	// data is already on disk, so never let teardown wedge an unattended run.
	await Promise.race([browser.close(), sleep(15_000)]);
	return run;
}

async function main() {
	let chromium;
	try {
		({ chromium } = await import('playwright-core'));
	} catch {
		console.error('playwright-core missing — run: npm i -D playwright-core');
		process.exit(1);
	}
	const secretKey = readClerkSecretKey();
	const results = [];
	for (let r = 1; r <= REPEATS; r++) {
		console.log(`\n===== repeat ${r}/${REPEATS} =====`);
		const ticket = await mintSignInTicket(secretKey);
		results.push(await runOnce(r, chromium, ticket));
	}
	if (results.length > 1) {
		const med = (arr) => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)];
		console.log(
			`\nMEDIANS over ${results.length} repeats: avg M_user ${med(results.map((x) => x.gate.avgMUserMb))}MB, peak ${med(results.map((x) => x.gate.peakMUserMb))}MB`
		);
	}
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
