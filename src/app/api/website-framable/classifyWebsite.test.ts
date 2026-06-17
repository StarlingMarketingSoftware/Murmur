// Run with: npx tsx --test src/app/api/website-framable/classifyWebsite.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyFinalResponse, probeWebsite, DEAD_STATUS_CODES } from './classifyWebsite';

const res = (status: number, headers?: Record<string, string>): Response =>
	new Response(status === 204 || status === 304 ? null : '', { status, headers });

// --- classifyFinalResponse: the status -> classification table (the false-positive guard) ---

test('2xx + embeddable → ok (clickable)', () => {
	const r = classifyFinalResponse(res(200));
	assert.equal(r.framable, true);
	assert.equal(r.classification, 'ok');
});

test('2xx but X-Frame-Options blocks framing → alive-unframable (still clickable, screenshot works)', () => {
	for (const xfo of ['DENY', 'SAMEORIGIN', 'deny']) {
		const r = classifyFinalResponse(res(200, { 'x-frame-options': xfo }));
		assert.equal(r.framable, false, `xfo=${xfo}`);
		assert.equal(r.classification, 'alive-unframable', `xfo=${xfo}`);
	}
});

test("2xx but CSP frame-ancestors 'none' → alive-unframable", () => {
	const r = classifyFinalResponse(
		res(200, { 'content-security-policy': "default-src 'self'; frame-ancestors 'none'" })
	);
	assert.equal(r.framable, false);
	assert.equal(r.classification, 'alive-unframable');
});

test('5xx server errors → dead (button hidden)', () => {
	for (const status of [500, 502, 503, 504]) {
		assert.equal(classifyFinalResponse(res(status)).classification, 'dead', `status=${status}`);
		assert.ok(DEAD_STATUS_CODES.has(status), `DEAD_STATUS_CODES should include ${status}`);
	}
});

test('auth-wall / WAF / anti-bot / rate-limit (401/403/429) → unknown (stay clickable)', () => {
	for (const status of [401, 403, 429]) {
		assert.equal(
			classifyFinalResponse(res(status)).classification,
			'unknown',
			`status=${status}`
		);
	}
});

test('not-found family (404/410) → unknown initially (live sites 404 their root) — conservative', () => {
	for (const status of [404, 410]) {
		assert.equal(
			classifyFinalResponse(res(status)).classification,
			'unknown',
			`status=${status}`
		);
		assert.ok(!DEAD_STATUS_CODES.has(status), `DEAD_STATUS_CODES must NOT include ${status}`);
	}
});

test('odd statuses we cannot positively classify (e.g. 501, 3xx-with-no-location) → unknown', () => {
	assert.equal(classifyFinalResponse(res(501)).classification, 'unknown');
	assert.equal(classifyFinalResponse(res(301)).classification, 'unknown');
});

// --- probeWebsite: the security-critical error coarsening (the no-oracle invariant) ---------
//
// The SSRF guard refuses to connect to internal hosts, so we cannot stand up a local server to
// drive 2xx/5xx through probeWebsite (the dispatcher blocks loopback by design — see
// ssrfGuard.test.ts). Instead we assert the boundary that matters: an SSRF-blocked target and an
// ordinary dead public host produce the IDENTICAL result, so the endpoint never reveals "we
// blocked this" vs "the site is down".

test('SsrfError (blocked internal IP literal) coarsens to dead', async () => {
	const r = await probeWebsite('http://127.0.0.1/');
	assert.equal(r.classification, 'dead');
	assert.equal(r.framable, false);
	assert.equal(r.finalUrl, 'http://127.0.0.1/');
});

test('blocked internal host is INDISTINGUISHABLE from a dead public host (no oracle)', async () => {
	// 169.254.169.254 = cloud metadata (internal, SSRF-blocked).
	const internal = await probeWebsite('http://169.254.169.254/');
	// *.invalid is RFC-2606 guaranteed never to resolve → NXDOMAIN → a "dead public host".
	const deadPublic = await probeWebsite('https://murmur-nonexistent-host.invalid/');

	// Same classification, same framable, both never a distinct "blocked" signal.
	assert.equal(internal.classification, 'dead');
	assert.equal(deadPublic.classification, 'dead');
	assert.equal(internal.classification, deadPublic.classification);
	assert.equal(internal.framable, deadPublic.framable);
});
