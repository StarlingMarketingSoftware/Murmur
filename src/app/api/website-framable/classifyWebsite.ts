// Shared website probe used by BOTH /api/website-framable (iframe-embeddability) and
// /api/website-previewable (preemptive reachability classification). It performs one
// SSRF-guarded, redirect-following fetch and reports two independent dimensions:
//   - `framable`  — can OUR iframe embed it? (X-Frame-Options / CSP frame-ancestors)
//   - `classification` — is it alive/dead? (used to hide the Website button for dead sites)
//
// SECURITY (no internal-reachability oracle): an SSRF-blocked target (private IP, DNS
// rebind, blocked redirect) is INDISTINGUISHABLE from an ordinary public dead host — both
// collapse to `dead`. There is no classification value that means "we blocked this", and we
// never surface the resolved IP or the internal-vs-external distinction.
import type { Agent } from 'undici';
import { normalizeWebsiteUrl } from '@/utils/websiteUrl';
import { SsrfError, assertHostAllowed, makeSafeDispatcher } from './ssrfGuard';

const FETCH_TIMEOUT_MS = 5000;
// Bounds TCP/TLS establishment, kept BELOW FETCH_TIMEOUT_MS so a host that resolves but never
// accepts a connection (a common "dead"/abandoned-DNS pattern) fails fast as an undici
// ConnectTimeoutError → classified `dead`, instead of tripping our response-abort (→ slow →
// `unknown`). A site that connects but is slow to RESPOND still maps to `unknown`.
const CONNECT_TIMEOUT_MS = 4000;
// Single wall-clock budget shared across ALL redirect hops (the per-hop timeout is capped
// by whatever remains), so a chain of slow-drip redirects can't tie up the function.
const OVERALL_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
// A realistic UA: some hosts vary their security headers (and even 403) by UA.
const FETCH_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Conservative, tunable set of "the site is definitively gone" statuses. Only these (plus
// DNS / connection failures, which surface as thrown errors below) classify a site as
// `dead` and hide its button. 4xx — incl. 401 / 403 / 404 / 410 / 429 — timeouts, and odd
// redirects all stay `unknown`, so a live site behind a WAF / bot-block / slow host or one
// that 404s its bare root is never wrongly hidden. Widen this set later with telemetry.
export const DEAD_STATUS_CODES = new Set([500, 502, 503, 504]);

export type WebsiteClassification = 'ok' | 'alive-unframable' | 'dead' | 'unknown';

export type WebsiteProbeResult = {
	framable: boolean;
	finalUrl: string;
	classification: WebsiteClassification;
};

const parseFrameAncestors = (csp: string): string[] | null => {
	if (!csp) return null;
	for (const directive of csp.split(';')) {
		const tokens = directive.trim().split(/\s+/);
		if (tokens[0]?.toLowerCase() === 'frame-ancestors') {
			return tokens.slice(1).map((t) => t.toLowerCase());
		}
	}
	return null;
};

// Can OUR cross-origin iframe embed this response? (Identical logic to the original
// inspectFramability so the framable route's behavior is unchanged.)
const isFramable = (res: Response): boolean => {
	const xfo = (res.headers.get('x-frame-options') || '').toLowerCase();
	if (xfo.includes('deny') || xfo.includes('sameorigin')) return false;

	const fa = parseFrameAncestors(res.headers.get('content-security-policy') || '');
	if (fa !== null) {
		if (fa.includes("'none'")) return false;
		// Wildcard scheme/host → embeddable anywhere.
		if (fa.some((t) => t === '*' || t === 'https:' || t === 'http:')) return true;
		// A specific allow-list that (almost certainly) doesn't include our origin.
		return false;
	}

	return true;
};

// Map a real (non-3xx) response to both dimensions. The `classification` is derived from the
// HTTP status only; `framable` is the header inspection — they're independent (a live site
// that blocks framing is `alive-unframable`, never `dead`).
export const classifyFinalResponse = (
	res: Response
): { framable: boolean; classification: WebsiteClassification } => {
	const framable = isFramable(res);
	let classification: WebsiteClassification;
	if (res.status >= 200 && res.status < 300) {
		classification = framable ? 'ok' : 'alive-unframable';
	} else if (DEAD_STATUS_CODES.has(res.status)) {
		classification = 'dead';
	} else {
		// 4xx (auth-wall / WAF / not-found), 3xx-with-no-Location, and anything else → keep
		// the button. Slow/blocked ≠ gone.
		classification = 'unknown';
	}
	return { framable, classification };
};

const isAbortError = (e: unknown): boolean => {
	if (e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError')) return true;
	const cause = (e as { cause?: unknown } | null)?.cause;
	return cause instanceof Error && cause.name === 'AbortError';
};

// Manual-redirect loop so every hop is SSRF-checked before we fetch it. The dispatcher pins
// DNS at connect time (rebinding-safe); assertHostAllowed is a fast pre-check for clear
// errors (incl. NXDOMAIN, which it raises as SsrfError('dns-unresolvable')); each redirect
// target is re-run through normalizeWebsiteUrl so the full input-time gate applies to every
// hop. Throws SsrfError on blocked targets and AbortError on timeout — both handled by
// probeWebsite below.
const resolveWebsite = async (startUrl: string): Promise<WebsiteProbeResult> => {
	let currentUrl = startUrl;
	const dispatcher = makeSafeDispatcher(CONNECT_TIMEOUT_MS);
	const deadline = Date.now() + OVERALL_TIMEOUT_MS;
	try {
		for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
			const remaining = deadline - Date.now();
			if (remaining <= 0) {
				return { framable: false, finalUrl: currentUrl, classification: 'unknown' };
			}

			await assertHostAllowed(new URL(currentUrl).hostname);

			const controller = new AbortController();
			const timer = setTimeout(
				() => controller.abort(),
				Math.min(FETCH_TIMEOUT_MS, remaining)
			);
			let res: Response;
			try {
				res = await fetch(currentUrl, {
					method: 'GET',
					redirect: 'manual',
					signal: controller.signal,
					headers: {
						'User-Agent': FETCH_UA,
						Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					},
					dispatcher,
				} as RequestInit & { dispatcher: Agent });
			} finally {
				clearTimeout(timer);
			}
			// We only need headers + status — discard the body without downloading it.
			try {
				await res.body?.cancel();
			} catch {
				// ignore
			}

			if (res.status >= 300 && res.status < 400) {
				const location = res.headers.get('location');
				if (!location) {
					const { framable, classification } = classifyFinalResponse(res);
					return { framable, finalUrl: currentUrl, classification };
				}
				// Re-apply the full entry gate to the resolved redirect target.
				const next = normalizeWebsiteUrl(new URL(location, currentUrl).href);
				if (!next) throw new SsrfError('redirect-blocked-target');
				currentUrl = next;
				continue;
			}

			const { framable, classification } = classifyFinalResponse(res);
			return { framable, finalUrl: currentUrl, classification };
		}
		return { framable: false, finalUrl: currentUrl, classification: 'unknown' };
	} finally {
		// Tear down the per-request agent (and its sockets/pinned lookup).
		void dispatcher.close().catch(() => dispatcher.destroy());
	}
};

// Public, NEVER-throws probe. Used by both endpoints.
// - Non-throw outcomes return framable + finalUrl exactly as the original resolveFramability did
//   (so /api/website-framable is byte-identical).
// - Timeout (AbortError) → `unknown` (slow ≠ dead).
// - SsrfError (blocked internal / DNS-unresolvable / blocked redirect) AND ordinary network
//   failures (ECONNREFUSED / ECONNRESET / TLS) both collapse to `dead` with finalUrl = the
//   normalized input — same shape the framable route returned on a caught error, and the same
//   result for internal vs. public so this is not a reachability oracle.
export const probeWebsite = async (startUrl: string): Promise<WebsiteProbeResult> => {
	try {
		return await resolveWebsite(startUrl);
	} catch (error) {
		if (isAbortError(error)) {
			return { framable: false, finalUrl: startUrl, classification: 'unknown' };
		}
		if (!(error instanceof SsrfError)) {
			console.warn('[classifyWebsite] probe failed', error);
		}
		return { framable: false, finalUrl: startUrl, classification: 'dead' };
	}
};

// ── In-instance LRU ──────────────────────────────────────────────────────────────────────
// A best-effort per-lambda cache so a warm instance doesn't re-probe the same URL across
// requests. Ephemeral (lost on cold start) and capacity-bounded — the authoritative
// session cache lives client-side in React Query. `unknown` is NEVER cached: a transient
// timeout / WAF-403 must be allowed to retry rather than stick a live site as not-dead.
const LRU_MAX = 500;
const LRU_TTL_MS = 1000 * 60 * 30; // 30 min — a recovered site re-checks reasonably soon.

type ClassificationEntry = { classification: WebsiteClassification; finalUrl: string };
const lru = new Map<string, { entry: ClassificationEntry; at: number }>();

const lruGet = (url: string): ClassificationEntry | null => {
	const hit = lru.get(url);
	if (!hit) return null;
	if (Date.now() - hit.at > LRU_TTL_MS) {
		lru.delete(url);
		return null;
	}
	// Refresh recency (move to newest).
	lru.delete(url);
	lru.set(url, hit);
	return hit.entry;
};

const lruSet = (url: string, entry: ClassificationEntry): void => {
	lru.set(url, { entry, at: Date.now() });
	if (lru.size > LRU_MAX) {
		const oldest = lru.keys().next().value;
		if (oldest !== undefined) lru.delete(oldest);
	}
};

// Cache-aware, bounded-parallel batch classifier. Normalizes + dedupes the input, skips
// invalid URLs (the caller treats a missing entry as `unknown` → button shown), and returns
// a record keyed by the NORMALIZED url so the client can look results up by the same key.
export const classifyUrls = async (
	rawUrls: string[]
): Promise<Record<string, ClassificationEntry>> => {
	const normalized = new Set<string>();
	for (const raw of rawUrls) {
		const n = normalizeWebsiteUrl(raw);
		if (n) normalized.add(n);
	}
	const urls = [...normalized];
	const out: Record<string, ClassificationEntry> = {};

	const CONCURRENCY = 5;
	let cursor = 0;
	const worker = async (): Promise<void> => {
		while (cursor < urls.length) {
			const url = urls[cursor++];
			const cached = lruGet(url);
			if (cached) {
				out[url] = cached;
				continue;
			}
			const result = await probeWebsite(url); // never throws
			const entry: ClassificationEntry = {
				classification: result.classification,
				finalUrl: result.finalUrl,
			};
			// Only memoize stable verdicts; `unknown` stays uncached so it can retry.
			if (result.classification !== 'unknown') lruSet(url, entry);
			out[url] = entry;
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () => worker())
	);
	return out;
};
