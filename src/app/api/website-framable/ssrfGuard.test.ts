// Run with: npx tsx --test src/app/api/website-framable/ssrfGuard.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { isPrivateIp, assertHostAllowed, makeSafeDispatcher, SsrfError } from './ssrfGuard';

// --- isPrivateIp: the core classifier (S1/S4) -------------------------------------

const BLOCKED = [
	// IPv4 private / loopback / link-local / metadata / CGNAT / unspecified
	'127.0.0.1',
	'10.0.0.5',
	'192.168.1.1',
	'172.16.0.1',
	'169.254.169.254', // cloud metadata
	'100.64.0.1', // CGNAT
	'0.0.0.0',
	// IPv6 loopback / unspecified / link-local / ULA / multicast
	'::1',
	'::',
	'fe80::1',
	'fc00::1',
	'fd12:3456:789a::1',
	'ff02::1',
	// IPv4-mapped IPv6 — DOTTED form
	'::ffff:127.0.0.1',
	'::ffff:169.254.169.254',
	'::ffff:10.0.0.5',
	// IPv4-mapped IPv6 — HEX form (what `new URL` canonicalizes to; the old bypass)
	'::ffff:7f00:1', // 127.0.0.1
	'::ffff:a9fe:a9fe', // 169.254.169.254
	'::ffff:c0a8:101', // 192.168.1.1
	// IPv4-compatible (deprecated)
	'::7f00:1', // 127.0.0.1
	// NAT64 64:ff9b::/96 carrying an internal v4
	'64:ff9b::a9fe:a9fe', // 169.254.169.254
	'64:ff9b::7f00:1', // 127.0.0.1
	// 6to4 2002::/16 carrying an internal v4 (embedded in bits 16..47)
	'2002:7f00:0001::', // 127.0.0.1
	'2002:a9fe:a9fe::', // 169.254.169.254
	// Teredo
	'2001:0000:4136:e378::',
];

const ALLOWED = [
	// public IPv4
	'8.8.8.8',
	'1.1.1.1',
	'93.184.216.34', // example.com
	// public global-unicast IPv6 (2000::/3)
	'2001:4860:4860::8888', // Google DNS
	'2606:2800:220:1:248:1893:25c8:1946', // example.com
	// not an IP literal at all → not blocked here (caller resolves via DNS)
	'example.com',
	'sub.domain.co.uk',
];

test('isPrivateIp: blocks internal addresses in every IPv6 encoding', () => {
	for (const ip of BLOCKED) {
		assert.equal(isPrivateIp(ip), true, `expected BLOCKED: ${ip}`);
	}
});

test('isPrivateIp: allows public addresses and passes non-literals through', () => {
	for (const ip of ALLOWED) {
		assert.equal(isPrivateIp(ip), false, `expected ALLOWED: ${ip}`);
	}
});

test('isPrivateIp: case-insensitive and tolerant of %zone', () => {
	assert.equal(isPrivateIp('FE80::1'), true);
	assert.equal(isPrivateIp('fe80::1%eth0'), true);
	assert.equal(isPrivateIp('::FFFF:7F00:1'), true);
});

// --- assertHostAllowed: fast pre-check incl. the redirect-target bypass payload (S2) ---

test('assertHostAllowed: rejects IPv4 + IPv6-mapped literals that target internal hosts', async () => {
	await assert.rejects(assertHostAllowed('127.0.0.1'), SsrfError);
	await assert.rejects(assertHostAllowed('169.254.169.254'), SsrfError);
	// stripBrackets + hex-mapped form — the exact redirect-to-loopback payload.
	await assert.rejects(assertHostAllowed('[::ffff:7f00:1]'), SsrfError);
	await assert.rejects(assertHostAllowed('[::ffff:a9fe:a9fe]'), SsrfError);
	// hostname resolving to loopback (e.g. via /etc/hosts)
	await assert.rejects(assertHostAllowed('localhost'), SsrfError);
});

test('assertHostAllowed: permits a public IP literal without throwing', async () => {
	await assert.doesNotReject(assertHostAllowed('8.8.8.8'));
});

// --- makeSafeDispatcher: connect-time pinning blocks loopback (S3, end-to-end) --------

test('makeSafeDispatcher: ALLOWS a normal public host (regression: lookup must honor all:true)', async (t) => {
	// net.connect's autoSelectFamily path calls the pinned lookup with { all: true } and
	// expects an array of {address, family}; if the success path returns a single address,
	// every public site fails to connect. Guard on network availability so the suite still
	// passes offline, but fail loudly if the default fetch works and the pinned one doesn't.
	let networkOk = false;
	try {
		const probe = await fetch('https://example.com', { signal: AbortSignal.timeout(5000) });
		await probe.body?.cancel();
		networkOk = probe.ok;
	} catch {
		networkOk = false;
	}
	if (!networkOk) {
		t.skip('no outbound network');
		return;
	}
	const dispatcher = makeSafeDispatcher();
	try {
		const res = await fetch('https://example.com', {
			signal: AbortSignal.timeout(5000),
			// @ts-expect-error Node fetch accepts an undici dispatcher
			dispatcher,
		});
		await res.body?.cancel();
		assert.ok(res.ok, `pinned dispatcher should reach a public host (got ${res.status})`);
	} finally {
		await dispatcher.close().catch(() => dispatcher.destroy());
	}
});

test('makeSafeDispatcher: refuses to connect to a hostname that resolves to loopback', async () => {
	const server = http.createServer((_req, res) => {
		res.writeHead(200);
		res.end('SECRET-INTERNAL-SERVICE');
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const port = (server.address() as { port: number }).port;
	const dispatcher = makeSafeDispatcher();
	try {
		// 'localhost' resolves to 127.0.0.1/::1; the pinned lookup validates the resolved
		// address and refuses the connection, so the internal service is never reached.
		await assert.rejects(
			fetch(`http://localhost:${port}/`, {
				signal: AbortSignal.timeout(3000),
				// @ts-expect-error Node fetch accepts an undici dispatcher
				dispatcher,
			})
		);
	} finally {
		await dispatcher.close().catch(() => dispatcher.destroy());
		await new Promise<void>((resolve) => server.close(() => resolve()));
	}
});
