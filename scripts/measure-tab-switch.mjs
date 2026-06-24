// Campaign ⇄ Dashboard Search tab-switch measurement harness.
//
// Measures the exact marks emitted by src/utils/perfMarks.ts:
//   - campaign → dashboard search: murmur:pick:click -> murmur:pick:results-paint
//   - dashboard search → campaign tab: murmur:camp:click -> murmur:camp:view-paint
//
// Usage:
//   1. Build + serve a production bundle WITHOUT touching the dev server's .next:
//        NEXT_DIST_DIR=.next-baseline VERCEL=1 npm run build
//        NEXT_DIST_DIR=.next-baseline npx next start -p 3010
//   2. node scripts/measure-tab-switch.mjs --url http://localhost:3010 --campaign-id 1 --label baseline
//
// Options:
//   --direction both|to-search|to-campaign
//   --campaign-tab write|drafts|inbox|all
//   --iterations 5
//   --settle-ms 2500
//   --headed
//
// Output: stdout summary + JSON under .perf-baselines/.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ARGS = process.argv.slice(2);
const arg = (name, fallback) => {
	const i = ARGS.indexOf(`--${name}`);
	return i >= 0 && ARGS[i + 1] ? ARGS[i + 1] : fallback;
};

const BASE_URL = arg('url', 'http://localhost:3010').replace(/\/$/, '');
const LABEL = arg('label', 'run');
const CAMPAIGN_ID = arg('campaign-id', '1');
const DIRECTION = arg('direction', 'both'); // both | to-search | to-campaign
const CAMPAIGN_TAB = arg('campaign-tab', 'write'); // write | drafts | inbox | all
const ITERATIONS = Number(arg('iterations', '5'));
const SETTLE_MS = Number(arg('settle-ms', '2500'));
const DEV_USER_ID = arg('user-id', 'user_31VOcmWR88mYFCbyk2NkLzEW4oC');
const HEADED = ARGS.includes('--headed');

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

function campaignUrl(tab = CAMPAIGN_TAB) {
	const resolvedTab = tab === 'all' ? 'all' : tab === 'drafts' ? 'drafts' : tab === 'inbox' ? 'inbox' : 'write';
	return `${BASE_URL}/murmur/campaign/${CAMPAIGN_ID}?origin=search&tab=${resolvedTab}`;
}

function dashboardSearchUrl() {
	return `${BASE_URL}/murmur/dashboard?fromCampaignId=${CAMPAIGN_ID}&pick=1&allContacts=1&instant=1`;
}

async function clearPerf(page) {
	await page.evaluate(() => {
		performance.clearMarks();
		performance.clearMeasures();
	});
}

async function waitForMeasure(page, measureName, timeout = 120_000) {
	await page.waitForFunction(
		(name) => performance.getEntriesByName(name, 'measure').length > 0,
		measureName,
		{ timeout }
	);
	return page.evaluate((name) => {
		const entry = performance.getEntriesByName(name, 'measure').at(-1);
		const marks = performance
			.getEntriesByType('mark')
			.filter((m) => m.name.startsWith('murmur:'))
			.map((m) => ({ name: m.name, startTime: Math.round(m.startTime * 10) / 10 }));
		return {
			name: entry?.name,
			durationMs: entry ? Math.round(entry.duration * 10) / 10 : null,
			startTime: entry ? Math.round(entry.startTime * 10) / 10 : null,
			marks,
			url: location.href,
		};
	}, measureName);
}

async function clickVisibleAria(page, label) {
	const locator = page.locator(`button[aria-label="${label}"]`).filter({ hasNot: page.locator('[disabled]') }).first();
	await locator.waitFor({ state: 'visible', timeout: 60_000 });
	await locator.click({ timeout: 30_000 });
}

async function runToSearch(page, i) {
	await page.goto(campaignUrl(CAMPAIGN_TAB), { waitUntil: 'domcontentloaded' });
	await sleep(SETTLE_MS);
	await clearPerf(page);
	// The application handler also marks this; injecting it makes the harness robust if
	// the clicked Search control changes but the destination paint mark remains stable.
	await page.evaluate(() => performance.mark('murmur:pick:click'));
	await clickVisibleAria(page, 'Search');
	const result = await waitForMeasure(page, 'murmur:pick:click->murmur:pick:results-paint');
	return { direction: 'campaign→search', iteration: i, ...result };
}

async function runToCampaign(page, i) {
	await page.goto(dashboardSearchUrl(), { waitUntil: 'domcontentloaded' });
	await sleep(SETTLE_MS);
	await clearPerf(page);
	await page.evaluate(() => performance.mark('murmur:camp:click'));
	const label = CAMPAIGN_TAB === 'drafts' ? 'Drafts' : CAMPAIGN_TAB === 'inbox' ? 'Inbox' : CAMPAIGN_TAB === 'all' ? 'All' : 'Write';
	await clickVisibleAria(page, label);
	const result = await waitForMeasure(page, 'murmur:camp:click->murmur:camp:view-paint');
	return { direction: 'search→campaign', iteration: i, targetTab: CAMPAIGN_TAB, ...result };
}

function summarize(results) {
	const byDirection = new Map();
	for (const r of results) {
		if (!byDirection.has(r.direction)) byDirection.set(r.direction, []);
		if (typeof r.durationMs === 'number') byDirection.get(r.direction).push(r.durationMs);
	}
	const summary = {};
	for (const [direction, values] of byDirection) {
		const sorted = [...values].sort((a, b) => a - b);
		const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? null;
		summary[direction] = {
			count: sorted.length,
			minMs: sorted[0] ?? null,
			p50Ms: percentile(0.5),
			p95Ms: percentile(0.95),
			maxMs: sorted.at(-1) ?? null,
		};
	}
	return summary;
}

async function main() {
	let pw;
	try {
		pw = await import('playwright-core');
	} catch {
		console.error('playwright-core missing — run: npm i -D playwright-core');
		process.exit(1);
	}

	const ticket = await mintSignInTicket(readClerkSecretKey());
	const browser = await pw.chromium.launch({ channel: 'chrome', headless: !HEADED });
	const context = await browser.newContext({ viewport: { width: 1680, height: 1050 } });
	const page = await context.newPage();

	try {
		await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
		await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
		await page.evaluate(async (t) => {
			const res = await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket: t });
			await window.Clerk.setActive({ session: res.createdSessionId });
		}, ticket);
		await page.waitForFunction(() => Boolean(window.Clerk?.user), null, { timeout: 30_000 });
		console.log('signed in as', await page.evaluate(() => window.Clerk.user?.id));
		await sleep(2500);

		const results = [];
		for (let i = 1; i <= ITERATIONS; i += 1) {
			if (DIRECTION === 'both' || DIRECTION === 'to-search') {
				const r = await runToSearch(page, i);
				results.push(r);
				console.log(`[${r.direction} #${i}] ${r.durationMs}ms`);
			}
			if (DIRECTION === 'both' || DIRECTION === 'to-campaign') {
				const r = await runToCampaign(page, i);
				results.push(r);
				console.log(`[${r.direction} #${i}] ${r.durationMs}ms`);
			}
		}

		const output = {
			label: LABEL,
			baseUrl: BASE_URL,
			campaignId: CAMPAIGN_ID,
			campaignTab: CAMPAIGN_TAB,
			iterations: ITERATIONS,
			settleMs: SETTLE_MS,
			summary: summarize(results),
			results,
		};
		console.log(JSON.stringify(output.summary, null, 2));
		mkdirSync('.perf-baselines', { recursive: true });
		const outPath = `.perf-baselines/tab-switch-${LABEL}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
		writeFileSync(outPath, JSON.stringify(output, null, 2));
		console.log('wrote', outPath);
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
