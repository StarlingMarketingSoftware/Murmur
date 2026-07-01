// Visual sanity probe: signed-in screenshots of the fixed build at canonical
// states (entry globe, engaged map, street zoom, stormy + snowy moods).
// Usage: node scripts/probe-visuals.mjs --url http://localhost:3011 --out /tmp/visuals
import { mkdirSync } from 'node:fs';
import {
	sleep,
	makeArgReader,
	readClerkSecretKey,
	mintSignInTicket,
	signIn,
} from './lib/memharness.mjs';

const args = makeArgReader(process.argv);
const BASE = args.str('url', 'http://localhost:3011');
const OUT = args.str('out', '/tmp/visuals');
mkdirSync(OUT, { recursive: true });

const { chromium } = await import('playwright-core');
const ticket = await mintSignInTicket(readClerkSecretKey());
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1680, height: 1050 } });
const page = await context.newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await signIn(page, ticket);

const shot = async (name, ms = 8000) => {
	await sleep(ms);
	await page.screenshot({ path: `${OUT}/${name}.png` });
	console.log(`${name}.png`);
};

// Entry globe (normal mood).
await page.goto(`${BASE}/murmur/dashboard?devMood=normal`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__murmurMapDebug?.getCanvas?.()), null, {
	timeout: 120_000,
});
await shot('01-entry-globe-normal', 12_000);

// Stormy mood on the globe (Fix 2's lazy asset build must produce clouds+flash).
await page.goto(`${BASE}/murmur/dashboard?devMood=stormy`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__murmurMapDebug?.getCanvas?.()), null, {
	timeout: 120_000,
});
await shot('02-globe-stormy-early', 6_000);
await shot('03-globe-stormy-late', 25_000); // after the 8s fade completes

// Snowy mood.
await page.goto(`${BASE}/murmur/dashboard?devMood=snowy`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__murmurMapDebug?.getCanvas?.()), null, {
	timeout: 120_000,
});
await shot('04-globe-snowy', 25_000);

// Engaged search map view (states, markers, blob) + street zoom.
await page.goto(
	`${BASE}/murmur/dashboard?devMood=normal&search=${encodeURIComponent('[Booking] Music Venues (Tennessee)')}`,
	{ waitUntil: 'domcontentloaded' }
);
await page.waitForFunction(() => Boolean(window.__murmurMapDebug?.getCanvas?.()), null, {
	timeout: 120_000,
});
await shot('05-engaged-map', 15_000);
await page.evaluate(() =>
	window.__murmurMapDebug.jumpTo({ center: [-86.7816, 36.1627], zoom: 16 })
);
await shot('06-street-zoom-nashville', 8_000);
await page.evaluate(() =>
	window.__murmurMapDebug.jumpTo({ center: [-86.7816, 36.1627], zoom: 6 })
);
await shot('07-state-view-borders', 6_000);

await Promise.race([browser.close(), sleep(10_000)]);
process.exit(0);
