// Map frame-rate measurement harness (Safari/WebKit vs Chrome).
//
// Drives the signed-in dashboard map through fixed idle/pan/zoom scenarios and
// samples rAF frame deltas + Mapbox 'render' events in-page, so render cadence
// can be compared before/after Safari perf work (e.g. canvas-source pausing).
//
// Usage:
//   1. Build + serve a production bundle WITHOUT touching the dev server's .next:
//        NEXT_DIST_DIR=.next-baseline VERCEL=1 npm run build
//        NEXT_DIST_DIR=.next-baseline npx next start -p 3010
//   2. WebKit needs a one-time browser download matching the playwright-core
//      major.minor (playwright-core has no install CLI):
//        npx playwright@<matching-version> install webkit
//   3. node scripts/measure-map-fps.mjs --url http://localhost:3010 --browser webkit --label baseline
//      node scripts/measure-map-fps.mjs --url http://localhost:3010 --browser chrome --label baseline
//      Optional: --mood stormy|snowy|... (forces a weather mood via ?devMood=)
//
// Output: a scenario table on stdout and a JSON file under .perf-baselines/.
// Only in-page metrics are used (WebKit has no CDP), so results are comparable
// across browsers. Playwright WebKit ≈ but ≠ real Safari — confirm headline
// numbers once in Safari by pasting the sampler body into the console.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ARGS = process.argv.slice(2);
const arg = (name, fallback) => {
	const i = ARGS.indexOf(`--${name}`);
	return i >= 0 && ARGS[i + 1] ? ARGS[i + 1] : fallback;
};
const BASE_URL = arg('url', 'http://localhost:3010');
const LABEL = arg('label', 'run');
const BROWSER = arg('browser', 'webkit'); // webkit | chrome
const MOOD = arg('mood', '');
// Headless WebKit renders WebGL in software (~5fps regardless of app work);
// pass --headed for GPU-accelerated numbers closer to real Safari.
const HEADED = ARGS.includes('--headed');
const SETTLE_MS = Number(arg('settle-ms', 15_000));
const SAMPLE_MS = Number(arg('sample-ms', 5_000));
const DEV_USER_ID = 'user_31VOcmWR88mYFCbyk2NkLzEW4oC';

// Same committed entry search as measure-dashboard-memory.mjs (rehydrates a real
// curated booking search and lands in the interactive map view).
const ENTRY_SEARCH = '[Booking] Music Venues (Tennessee)';

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

// In-page sampler: rAF deltas measure main-thread frame cadence; Mapbox 'render'
// events count how often the map actually re-renders (a paused/idle map stops
// emitting 'render' entirely — the headline metric for the Safari fix).
const sampleScenario = (page, ms) =>
	page.evaluate(
		(sampleMs) =>
			new Promise((resolve) => {
				const m = window.__murmurMapDebug;
				const deltas = [];
				let renders = 0;
				let last = performance.now();
				let raf;
				const onRender = () => {
					renders++;
				};
				m.on('render', onRender);
				const tick = (t) => {
					deltas.push(t - last);
					last = t;
					raf = requestAnimationFrame(tick);
				};
				raf = requestAnimationFrame(tick);
				setTimeout(() => {
					cancelAnimationFrame(raf);
					m.off('render', onRender);
					deltas.shift();
					const sorted = [...deltas].sort((a, b) => a - b);
					const mean = deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length);
					resolve({
						rafFps: +(1000 / mean).toFixed(1),
						p95FrameMs: +(sorted[Math.floor(sorted.length * 0.95)] ?? 0).toFixed(1),
						framesOver33ms: deltas.filter((d) => d > 33.4).length,
						mapRendersPerSec: +(renders / (sampleMs / 1000)).toFixed(1),
					});
				}, sampleMs);
			}),
		ms
	);

async function main() {
	let pw;
	try {
		pw = await import('playwright-core');
	} catch {
		console.error('playwright-core missing — run: npm i -D playwright-core');
		process.exit(1);
	}

	const ticket = await mintSignInTicket(readClerkSecretKey());

	const browser =
		BROWSER === 'webkit'
			? await pw.webkit.launch({ headless: !HEADED })
			: await pw.chromium.launch({ channel: 'chrome', headless: !HEADED });
	const context = await browser.newContext({ viewport: { width: 1680, height: 1050 } });
	const page = await context.newPage();

	// --- Sign in via single-use Clerk ticket on the landing page.
	await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
	await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
	await page.evaluate(async (t) => {
		const res = await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket: t });
		await window.Clerk.setActive({ session: res.createdSessionId });
	}, ticket);
	await page.waitForFunction(() => Boolean(window.Clerk?.user), null, { timeout: 30_000 });
	console.log('signed in as', await page.evaluate(() => window.Clerk.user?.id));
	// Clerk's setActive can kick off its own navigation right after sign-in; let it
	// land before navigating (and retry once if it still interrupts the goto).
	await sleep(3000);

	// --- Enter the dashboard in interactive map view via a real rehydrated search.
	const moodParam = MOOD ? `&devMood=${encodeURIComponent(MOOD)}` : '';
	const dashboardUrl = `${BASE_URL}/murmur/dashboard?search=${encodeURIComponent(ENTRY_SEARCH)}${moodParam}`;
	try {
		await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' });
	} catch {
		await sleep(3000);
		await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded' });
	}
	try {
		await page.waitForFunction(() => Boolean(window.__murmurMapDebug?.getCanvas?.()), null, {
			timeout: 120_000,
		});
	} catch (err) {
		console.error('map never appeared; url:', page.url());
		await page.screenshot({ path: '/tmp/measure-map-fps-failure.png' });
		console.error('screenshot: /tmp/measure-map-fps-failure.png');
		throw err;
	}
	console.log('map ready; settling…');
	await sleep(SETTLE_MS);

	const results = {};

	// --- Scenario: idle (no camera motion).
	results.idle = await sampleScenario(page, SAMPLE_MS);
	console.log('[idle]', results.idle);

	// --- Scenario: pan (Nashville → Memphis ease over the sample window).
	await page.evaluate(
		(ms) =>
			window.__murmurMapDebug.easeTo({
				center: [-90.049, 35.1495],
				duration: ms,
			}),
		SAMPLE_MS
	);
	results.pan = await sampleScenario(page, SAMPLE_MS);
	console.log('[pan]', results.pan);
	await sleep(1500);

	// --- Scenario: zoom traverse (current zoom → 5).
	await page.evaluate(
		(ms) => window.__murmurMapDebug.easeTo({ zoom: 5, duration: ms }),
		SAMPLE_MS
	);
	results.zoom = await sampleScenario(page, SAMPLE_MS);
	console.log('[zoom]', results.zoom);

	const outDir = path.join(process.cwd(), '.perf-baselines');
	mkdirSync(outDir, { recursive: true });
	const file = path.join(
		outDir,
		`${LABEL}-${BROWSER}${MOOD ? `-${MOOD}` : ''}-${new Date()
			.toISOString()
			.replace(/[:.]/g, '-')}.json`
	);
	writeFileSync(
		file,
		JSON.stringify(
			{ label: LABEL, browser: BROWSER, mood: MOOD || null, baseUrl: BASE_URL, results },
			null,
			2
		)
	);
	console.log(`\nwrote ${file}`);

	await browser.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
