// Pure helpers for turning a stored/user-entered website value into a canonical,
// safe-to-embed http(s) URL. No dependencies so it can be unit-tested with
// `npx tsx --test src/utils/websiteUrl.test.ts`.
//
// Mirrors the tolerant-paste approach in utils/youtube.ts (prepend https:// when a
// scheme is missing) but for arbitrary websites. Anything that isn't a valid
// http(s) URL returns null so the caller can keep the row presentational and never
// open a broken/empty iframe — and so the server framable-check rejects junk input.

/**
 * Normalizes a website string into a canonical http(s) href, or null when it can't
 * be made into a valid http(s) URL.
 *
 * - Trims whitespace.
 * - Prepends `https://` when no scheme is present (tolerates "example.com",
 *   "www.example.com/path").
 * - Rejects non-http(s) schemes (mailto:, javascript:, ftp:, file:, data:, …).
 * - Requires a dotted/known host (a bare word like "n/a" or "tbd" → null).
 * - Rejects embedded credentials and non-standard ports (SSRF/port-scan hardening).
 *
 * Also re-applied to every redirect hop server-side, so the same checks gate the
 * whole redirect chain, not just the entered URL.
 */
export function normalizeWebsiteUrl(input: string | null | undefined): string | null {
	if (!input) return null;
	const trimmed = input.trim();
	if (!trimmed) return null;

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		// Tolerate a scheme-less paste like "example.com" or "www.foo.com/bar".
		try {
			url = new URL(`https://${trimmed}`);
		} catch {
			return null;
		}
	}

	const protocol = url.protocol.toLowerCase();
	if (protocol !== 'http:' && protocol !== 'https:') return null;

	// Reject hosts that aren't real domains: no host, or a single label with no dot
	// (e.g. "localhost", "tbd", "n"). Public websites always have a dot in the host.
	// This also incidentally rejects bracketed IPv6 literals, whose canonical hostname
	// (e.g. "[::ffff:7f00:1]") contains no dot.
	const host = url.hostname.toLowerCase();
	if (!host || !host.includes('.')) return null;

	// Reject embedded credentials (user:pass@host) — never legitimate for a contact
	// website and a classic redirect/SSRF smuggling vector.
	if (url.username || url.password) return null;

	// Only the default web ports. WHATWG sets url.port='' for the scheme-default
	// (http→80 / https→443), so this rejects only an explicit non-standard port
	// (e.g. ":6379", ":22") — which would otherwise turn the server framable-check
	// into a port scanner.
	if (url.port && url.port !== '80' && url.port !== '443') return null;

	return url.href;
}

/**
 * Human-friendly host label for the row/header (drops a leading "www.").
 * Returns '' when the input can't be parsed.
 */
export function websiteHost(input: string | null | undefined): string {
	const normalized = normalizeWebsiteUrl(input);
	if (!normalized) return '';
	try {
		return new URL(normalized).hostname.replace(/^www\./i, '');
	} catch {
		return '';
	}
}
