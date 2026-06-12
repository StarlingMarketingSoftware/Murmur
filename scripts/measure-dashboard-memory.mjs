// Dashboard browser-memory measurement harness.
//
// Drives the signed-in dashboard map through a fixed pan/zoom/search scenario in
// system Chrome and samples JS heap + per-process RSS at each phase, so memory
// changes can be compared before/after optimization work.
//
// Usage:
//   1. Build + serve a production bundle WITHOUT touching the dev server's .next:
//        NEXT_DIST_DIR=.next-baseline VERCEL=1 npm run build
//        NEXT_DIST_DIR=.next-baseline npx next start -p 3010
//   2. node scripts/measure-dashboard-memory.mjs --url http://localhost:3010 --label baseline
//
// Output: a phase-by-phase table on stdout and a JSON file under .memory-baselines/.
//
// Requirements: playwright-core (devDependency, no browser download — uses system
// Chrome), CLERK_SECRET_KEY in .env (dev instance), the dev seed user below, and
// the `window.__murmurMapDebug` handle set by SearchResultsMap (used for
// deterministic jumpTo viewport sequences).

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ARGS = process.argv.slice(2);
const arg = (name, fallback) => {
	const i = ARGS.indexOf(`--${name}`);
	return i >= 0 && ARGS[i + 1] ? ARGS[i + 1] : fallback;
};
const BASE_URL = arg('url', 'http://localhost:3010');
const LABEL = arg('label', 'run');
const IDLE_MS = Number(arg('idle-ms', 60_000));
const DEV_USER_ID = 'user_31VOcmWR88mYFCbyk2NkLzEW4oC';

// The committed entry search (rehydrates a real curated booking search and lands
// in the interactive map view) and the in-page refine searches. Keep these lists
// FIXED — comparability between runs depends on the scenario being identical.
const ENTRY_SEARCH = '[Booking] Music Venues (Tennessee)';
const REFINE_SEARCHES = [
	'Music venues in North Carolina',
	'Coffee shops in Austin',
	'Recording studios in Los Angeles',
	'Wedding photographers in Chicago',
];

// 20 fixed viewports: a realistic mix of cross-country pans and a 16→8→16-style
// zoom traversal (each integer zoom step mints a distinct overlay query key).
const VIEWPORTS = [
	{ lng: -86.7816, lat: 36.1627, zoom: 9 }, // Nashville
	{ lng: -86.7816, lat: 36.1627, zoom: 11 },
	{ lng: -86.7816, lat: 36.1627, zoom: 13 },
	{ lng: -86.7816, lat: 36.1627, zoom: 16 },
	{ lng: -86.7816, lat: 36.1627, zoom: 14 },
	{ lng: -86.7816, lat: 36.1627, zoom: 12 },
	{ lng: -86.7816, lat: 36.1627, zoom: 10 },
	{ lng: -86.7816, lat: 36.1627, zoom: 8 },
	{ lng: -90.0490, lat: 35.1495, zoom: 9 }, // Memphis
	{ lng: -90.0715, lat: 29.9511, zoom: 10 }, // New Orleans
	{ lng: -84.3880, lat: 33.7490, zoom: 11 }, // Atlanta
	{ lng: -80.1918, lat: 25.7617, zoom: 12 }, // Miami
	{ lng: -77.0369, lat: 38.9072, zoom: 13 }, // DC
	{ lng: -73.9857, lat: 40.7484, zoom: 14 }, // NYC
	{ lng: -87.6298, lat: 41.8781, zoom: 12 }, // Chicago
	{ lng: -104.9903, lat: 39.7392, zoom: 10 }, // Denver
	{ lng: -111.8910, lat: 40.7608, zoom: 9 }, // SLC
	{ lng: -122.4194, lat: 37.7749, zoom: 12 }, // SF
	{ lng: -118.2437, lat: 34.0522, zoom: 14 }, // LA
	{ lng: -122.3321, lat: 47.6062, zoom: 11 }, // Seattle
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readClerkSecretKey() {
	const env = readFileSync(path.join(process.cwd(), '.env'), 'utf8');
	const line = env.split('\n').find((l) => l.startsWith('CLERK_SECRET_KEY='));
	if (!line) throw new Error('CLERK_SECRET_KEY not found in .env');
	return line.slice('CLERK_SECRET_KEY='.length).trim();
}

async function mintSignInTicket(secretKey) {
	const res = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${secretKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ user_id: DEV_USER_ID }),
	});
	if (!res.ok) throw new Error(`sign_in_tokens failed: ${res.status} ${await res.text()}`);
	return (await res.json()).token;
}

// RSS (KB) per chrome process of our launched browser, classified by CDP process
// type ('renderer', 'GPU', 'browser', …). Pids come from SystemInfo.getProcessInfo
// on a browser-level CDP session; RSS comes from ps.
function processFootprints(processInfos) {
	const rssByPid = new Map();
	const pids = processInfos.map((p) => p.id).filter(Boolean);
	if (pids.length) {
		const out = execSync(`ps -o pid=,rss= -p ${pids.join(',')} || true`, {
			encoding: 'utf8',
			shell: '/bin/bash',
		});
		for (const line of out.split('\n')) {
			const m = line.trim().match(/^(\d+)\s+(\d+)$/);
			if (m) rssByPid.set(+m[1], +m[2]);
		}
	}
	const sumWhere = (pred) =>
		processInfos
			.filter(pred)
			.reduce((acc, p) => acc + (rssByPid.get(p.id) ?? 0), 0);
	return {
		rendererRssKb: sumWhere((p) => p.type === 'renderer'),
		gpuRssKb: sumWhere((p) => p.type === 'GPU'),
		totalRssKb: sumWhere(() => true),
	};
}

async function main() {
	let chromium;
	try {
		({ chromium } = await import('playwright-core'));
	} catch {
		console.error('playwright-core missing — run: npm i -D playwright-core');
		process.exit(1);
	}

	const ticket = await mintSignInTicket(readClerkSecretKey());

	const browser = await chromium.launch({
		channel: 'chrome',
		args: ['--enable-precise-memory-info'],
	});
	const browserCdp = await browser.newBrowserCDPSession();
	const context = await browser.newContext({ viewport: { width: 1680, height: 1050 } });
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);
	await cdp.send('Performance.enable');
	await cdp.send('HeapProfiler.enable');

	const samples = [];
	const sample = async (phase) => {
		await cdp.send('HeapProfiler.collectGarbage');
		await sleep(500);
		await cdp.send('HeapProfiler.collectGarbage');
		await sleep(500);
		const { metrics } = await cdp.send('Performance.getMetrics');
		const get = (n) => metrics.find((m) => m.name === n)?.value ?? null;
		const { processInfo } = await browserCdp.send('SystemInfo.getProcessInfo');
		const s = {
			phase,
			at: new Date().toISOString(),
			jsHeapUsedMb: +(get('JSHeapUsedSize') / 1048576).toFixed(1),
			jsHeapTotalMb: +(get('JSHeapTotalSize') / 1048576).toFixed(1),
			domNodes: get('Nodes'),
			jsEventListeners: get('JSEventListeners'),
			documents: get('Documents'),
			...processFootprints(processInfo),
		};
		samples.push(s);
		console.log(
			`[${phase}] heap ${s.jsHeapUsedMb}MB  nodes ${s.domNodes}  listeners ${s.jsEventListeners}  ` +
				`renderer ${(s.rendererRssKb / 1024).toFixed(0)}MB  gpu ${(s.gpuRssKb / 1024).toFixed(0)}MB`
		);
		return s;
	};

	// --- Sign in via single-use Clerk ticket on the landing page.
	await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
	await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
	await page.evaluate(async (t) => {
		const res = await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket: t });
		await window.Clerk.setActive({ session: res.createdSessionId });
	}, ticket);
	await page.waitForFunction(() => Boolean(window.Clerk?.user), null, {
		timeout: 30_000,
	});
	console.log('signed in as', await page.evaluate(() => window.Clerk.user?.id));

	// --- Enter the dashboard in interactive map view via a real rehydrated search.
	// NOTE: map.loaded()/idle never settle here (the clouds-drift loop repaints
	// every frame), so wait for the map handle + canvas and then settle on time.
	await page.goto(
		`${BASE_URL}/murmur/dashboard?search=${encodeURIComponent(ENTRY_SEARCH)}`,
		{ waitUntil: 'domcontentloaded' }
	);
	try {
		await page.waitForFunction(
			() => Boolean(window.__murmurMapDebug?.getCanvas?.()),
			null,
			{ timeout: 120_000 }
		);
	} catch (err) {
		console.error('map never appeared; url:', page.url());
		await page.screenshot({ path: '/tmp/measure-dashboard-failure.png' });
		console.error('screenshot: /tmp/measure-dashboard-failure.png');
		throw err;
	}
	console.log('map ready; settling…');
	await sleep(IDLE_MS);
	await sample('after-load-idle');

	// --- 20 fixed pan/zoom steps (each waits for overlay fetch debounce + moveend).
	for (const [i, v] of VIEWPORTS.entries()) {
		await page.evaluate(
			(vp) => window.__murmurMapDebug.jumpTo({ center: [vp.lng, vp.lat], zoom: vp.zoom }),
			v
		);
		await sleep(2000);
		if (i === 9) await sample('mid-pans');
	}
	await sample('after-pans');

	// --- In-page refine searches (real free-text search path; skipped gracefully
	// if the refine input isn't present in this map state).
	const refine = page.locator('input[placeholder*="Refine your search"]');
	if (await refine.count()) {
		for (const q of REFINE_SEARCHES) {
			await refine.first().fill(q);
			await refine.first().press('Enter');
			await sleep(6000);
		}
		await sample('after-searches');
	} else {
		console.warn('refine input not found — skipping in-page searches');
	}

	// --- Pan back to the first viewport: must render from cache (no spinner).
	const t0 = Date.now();
	await page.evaluate(
		(vp) => window.__murmurMapDebug.jumpTo({ center: [vp.lng, vp.lat], zoom: vp.zoom }),
		VIEWPORTS[0]
	);
	await sleep(2000);
	console.log(`pan-back settled in <= ${Date.now() - t0}ms (cache-render expected)`);
	await sample('after-panback');

	// --- Final idle: steady-state memory.
	await sleep(IDLE_MS);
	await sample('final-idle');

	const outDir = path.join(process.cwd(), '.memory-baselines');
	mkdirSync(outDir, { recursive: true });
	const file = path.join(
		outDir,
		`${LABEL}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
	);
	writeFileSync(file, JSON.stringify({ label: LABEL, baseUrl: BASE_URL, samples }, null, 2));
	console.log(`\nwrote ${file}`);

	await browser.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
