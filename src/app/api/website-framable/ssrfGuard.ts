// SSRF guard for the website-framable outbound fetch. Kept dependency-light (only
// node:dns / node:net / undici) so the security-critical IP classification is unit-testable
// in isolation — see ssrfGuard.test.ts.
//
// Two layers:
//   1. isPrivateIp / assertHostAllowed — fast pre-check with clear errors.
//   2. makeSafeDispatcher — an undici Agent whose connect-time lookup resolves ONCE and
//      connects only to a vetted address, so the address validated is the address connected
//      to (closes the DNS-rebinding TOCTOU that a separate validate-then-fetch leaves open).
import dns from 'node:dns/promises';
import net, { type LookupFunction } from 'node:net';
import { Agent } from 'undici';

export class SsrfError extends Error {}

const ipToLong = (ip: string): number => {
	const parts = ip.split('.').map((p) => Number(p));
	if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
		return -1;
	}
	return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
};

const inV4Range = (ipLong: number, cidr: string): boolean => {
	const [base, bitsStr] = cidr.split('/');
	const bits = Number(bitsStr);
	const baseLong = ipToLong(base);
	if (baseLong < 0) return false;
	const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
	return (ipLong & mask) === (baseLong & mask);
};

// Private / loopback / link-local / reserved / CGNAT / metadata ranges.
const V4_BLOCKED_CIDRS = [
	'0.0.0.0/8',
	'10.0.0.0/8',
	'100.64.0.0/10',
	'127.0.0.0/8',
	'169.254.0.0/16', // link-local incl. cloud metadata 169.254.169.254
	'172.16.0.0/12',
	'192.0.0.0/24',
	'192.168.0.0/16',
	'198.18.0.0/15',
	'224.0.0.0/4', // multicast
	'240.0.0.0/4', // reserved
];

const isBlockedV4Long = (long: number): boolean =>
	long < 0 || V4_BLOCKED_CIDRS.some((cidr) => inV4Range(long, cidr));

// Parse an IPv6 literal (already validated by net.isIPv6) into 16 bytes, handling ::
// compression, an embedded dotted-IPv4 tail (e.g. ::ffff:1.2.3.4) and an optional
// %zone. Returns null on anything unexpected so the caller fails closed.
const ipv6ToBytes = (input: string): number[] | null => {
	let ip = input;
	const zone = ip.indexOf('%');
	if (zone !== -1) ip = ip.slice(0, zone);

	// Embedded IPv4 in the last 32 bits → rewrite as two hextets so the parser is uniform.
	const lastColon = ip.lastIndexOf(':');
	const tail = ip.slice(lastColon + 1);
	if (tail.includes('.')) {
		const q = tail.split('.').map((p) => Number(p));
		if (q.length !== 4 || q.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
		const hi = ((q[0] << 8) | q[1]).toString(16);
		const lo = ((q[2] << 8) | q[3]).toString(16);
		ip = `${ip.slice(0, lastColon + 1)}${hi}:${lo}`;
	}

	const halves = ip.split('::');
	if (halves.length > 2) return null;
	const head = halves[0] ? halves[0].split(':') : [];
	const back = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : null;

	let groups: number[];
	if (back === null) {
		if (head.length !== 8) return null;
		groups = head.map((h) => parseInt(h, 16));
	} else {
		const fill = 8 - (head.length + back.length);
		if (fill < 0) return null;
		groups = [
			...head.map((h) => parseInt(h, 16)),
			...Array(fill).fill(0),
			...back.map((h) => parseInt(h, 16)),
		];
	}
	if (groups.length !== 8 || groups.some((g) => !Number.isInteger(g) || g < 0 || g > 0xffff)) {
		return null;
	}
	const bytes: number[] = [];
	for (const g of groups) bytes.push((g >> 8) & 0xff, g & 0xff);
	return bytes;
};

const embeddedV4Long = (b: number[], offset: number): number =>
	((b[offset] << 24) >>> 0) + (b[offset + 1] << 16) + (b[offset + 2] << 8) + b[offset + 3];

// True when an address (literal or DNS-resolved) must NOT be fetched.
//
// IPv6 is classified NUMERICALLY and DEFAULT-DENY: only global-unicast (2000::/3) is
// allowed, and every IPv4-carrying form (mapped/compat/NAT64/6to4 — in BOTH the dotted
// and the hex-compressed spelling that `new URL` emits) is decoded and run through the
// IPv4 block-list. This closes the `::ffff:` hex bypass that a dotted-only regex misses,
// and blocks anything we cannot positively classify as public.
export const isPrivateIp = (addr: string): boolean => {
	let ip = addr.trim().toLowerCase();
	const zone = ip.indexOf('%');
	if (zone !== -1) ip = ip.slice(0, zone);

	if (net.isIPv4(ip)) return isBlockedV4Long(ipToLong(ip));

	if (net.isIPv6(ip)) {
		const b = ipv6ToBytes(ip);
		if (!b) return true; // unparseable → fail closed
		const b0 = b[0];
		const b1 = b[1];
		// loopback ::1 and unspecified ::
		if (b.slice(0, 15).every((x) => x === 0) && (b[15] === 0 || b[15] === 1)) return true;
		if (b0 === 0xff) return true; // ff00::/8 multicast
		if (b0 === 0xfe && (b1 & 0xc0) === 0x80) return true; // fe80::/10 link-local
		if ((b0 & 0xfe) === 0xfc) return true; // fc00::/7 unique-local
		// IPv4-mapped ::ffff:0:0/96 (dotted OR hex — new URL canonicalizes to hex)
		if (b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff) {
			return isBlockedV4Long(embeddedV4Long(b, 12));
		}
		// IPv4-compatible ::a.b.c.d (deprecated) — first 96 bits zero
		if (b.slice(0, 12).every((x) => x === 0)) return isBlockedV4Long(embeddedV4Long(b, 12));
		// NAT64 64:ff9b::/96
		if (
			b0 === 0x00 &&
			b1 === 0x64 &&
			b[2] === 0xff &&
			b[3] === 0x9b &&
			b.slice(4, 12).every((x) => x === 0)
		) {
			return isBlockedV4Long(embeddedV4Long(b, 12));
		}
		// 6to4 2002::/16 — embedded v4 in bits 16..47
		if (b0 === 0x20 && b1 === 0x02) return isBlockedV4Long(embeddedV4Long(b, 2));
		// Teredo 2001:0000::/32
		if (b0 === 0x20 && b1 === 0x01 && b[2] === 0x00 && b[3] === 0x00) return true;
		// Global unicast 2000::/3 → allowed; anything else → blocked (default-deny).
		return (b0 & 0xe0) !== 0x20;
	}

	// Not a recognizable IP literal — caller resolves via DNS instead.
	return false;
};

const stripBrackets = (host: string): string => host.replace(/^\[/, '').replace(/\]$/, '');

// Throws SsrfError if the host resolves to (or is) a blocked address. A fast pre-check for
// clear errors; makeSafeDispatcher is the authoritative, rebinding-safe layer.
export const assertHostAllowed = async (hostname: string): Promise<void> => {
	const host = stripBrackets(hostname);
	if (net.isIP(host)) {
		if (isPrivateIp(host)) throw new SsrfError('blocked-ip-literal');
		return;
	}
	let addrs: { address: string }[];
	try {
		addrs = await dns.lookup(host, { all: true });
	} catch {
		// Unresolvable host — let the fetch fail and be reported as unreachable.
		throw new SsrfError('dns-unresolvable');
	}
	if (!addrs.length) throw new SsrfError('dns-empty');
	for (const a of addrs) {
		if (isPrivateIp(a.address)) throw new SsrfError('blocked-resolved-ip');
	}
};

// undici connect-time resolver: resolve ONCE, validate every returned address, and hand the
// vetted IP straight to the socket — so the address validated is the address connected to.
// This closes the check-then-connect DNS-rebinding TOCTOU and runs on every connection,
// including each redirect hop's.
const pinnedLookup: LookupFunction = (hostname, options, callback) => {
	dns
		.lookup(hostname, { all: true, verbatim: true })
		.then((addrs) => {
			if (!addrs.length) {
				callback(new SsrfError('dns-empty') as NodeJS.ErrnoException, '', 0);
				return;
			}
			for (const a of addrs) {
				if (isPrivateIp(a.address)) {
					callback(new SsrfError('blocked-resolved-ip') as NodeJS.ErrnoException, '', 0);
					return;
				}
			}
			// Honor the caller's contract: net.connect's Happy-Eyeballs path
			// (autoSelectFamily — default ON in Node 18+) calls us with { all: true } and
			// expects an ARRAY of { address, family }; the legacy path wants a single
			// (address, family). Every returned address is already validated as public, so
			// returning them all lets dual-stack fallback work safely.
			if (options.all) {
				callback(null, addrs);
			} else {
				callback(null, addrs[0].address, addrs[0].family);
			}
		})
		.catch(() => callback(new SsrfError('dns-unresolvable') as NodeJS.ErrnoException, '', 0));
};

// `connectTimeoutMs` (optional) bounds how long TCP/TLS establishment may take. Set it BELOW
// the caller's response-abort so a host that won't accept a connection surfaces as a distinct
// undici ConnectTimeoutError (→ classified `dead`) rather than a generic AbortError (→ slow
// response → `unknown`). Omitted → undici's default (~10s).
export const makeSafeDispatcher = (connectTimeoutMs?: number): Agent =>
	new Agent({
		connect: {
			lookup: pinnedLookup,
			...(connectTimeoutMs ? { timeout: connectTimeoutMs } : {}),
		},
	});
