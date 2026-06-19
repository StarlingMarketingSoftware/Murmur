import { useQuery } from '@tanstack/react-query';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { normalizeWebsiteUrl } from '@/utils/websiteUrl';
import type { WebsiteClassification } from '@/app/api/website-framable/classifyWebsite';
import type { WebsitePreviewableResult } from '@/app/api/website-previewable/route';

// React Query cache keyed by the NORMALIZED url, so the same site shared across many
// contacts dedupes to a single cache entry. The session is effectively the cache lifetime —
// the server LRU + the lack of refetch keep us well under the endpoint's rate limit.
const QUERY_KEY = 'website-previewable';
const STALE_TIME = 1000 * 60 * 60 * 24; // 24h
// Window over which per-row probes fired in quick succession (e.g. a hover sweep) are
// coalesced into a single request.
const BATCH_WINDOW_MS = 60;
// Per-request URL cap — must stay ≤ the server's MAX_URLS so nothing is silently dropped.
const BATCH_CHUNK = 25;

// Shared hover-tooltip copy for a website that's been classified as un-previewable (dead).
// One constant so it's trivially adjustable across every render site.
export const WEBSITE_NOT_PREVIEWABLE_LABEL = "This site can't be previewed";

export const websitePreviewableQueryKey = (normalizedUrl: string) =>
	[QUERY_KEY, normalizedUrl] as const;

// POST a batch of already-normalized URLs; returns the server classification map. Degrades
// to {} on any non-OK (429 / 5xx / auth) so callers fall back to `unknown` (button shown).
const fetchPreviewable = async (
	normalizedUrls: string[]
): Promise<WebsitePreviewableResult['results']> => {
	const response = await _fetch(urls.api.websitePreviewable.index, 'POST', {
		urls: normalizedUrls,
	});
	if (!response.ok) return {};
	const data = (await response.json()) as WebsitePreviewableResult;
	return data?.results ?? {};
};

// ── DataLoader-style coalescing ────────────────────────────────────────────────────────────
// React Query already dedupes concurrent queries for the SAME url. This batches DISTINCT urls
// requested within a short window into one (chunked) request, so a hover sweep over many rows
// doesn't spray dozens of 1-URL POSTs and trip the rate limit. Each caller awaits the shared
// result for its url.
let batchUrls: string[] = [];
let batchResolvers = new Map<string, Array<(c: WebsiteClassification) => void>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const flushBatch = async (): Promise<void> => {
	const urls = batchUrls;
	const resolvers = batchResolvers;
	batchUrls = [];
	batchResolvers = new Map();
	flushTimer = null;

	const merged: WebsitePreviewableResult['results'] = {};
	await Promise.all(
		Array.from({ length: Math.ceil(urls.length / BATCH_CHUNK) }, (_, i) =>
			fetchPreviewable(urls.slice(i * BATCH_CHUNK, i * BATCH_CHUNK + BATCH_CHUNK))
				.then((r) => Object.assign(merged, r))
				.catch(() => {})
		)
	);

	for (const url of urls) {
		const classification = merged[url]?.classification ?? 'unknown';
		for (const resolve of resolvers.get(url) ?? []) resolve(classification);
	}
};

const loadPreviewable = (normalizedUrl: string): Promise<WebsiteClassification> =>
	new Promise((resolve) => {
		const existing = batchResolvers.get(normalizedUrl);
		if (existing) {
			existing.push(resolve);
		} else {
			batchResolvers.set(normalizedUrl, [resolve]);
			batchUrls.push(normalizedUrl);
		}
		if (!flushTimer) flushTimer = setTimeout(() => void flushBatch(), BATCH_WINDOW_MS);
	});

/**
 * Per-row hook: returns the preview classification for a contact's website.
 *
 * Default-to-clickable: while pending / unknown / errored it returns `unknown`, so the
 * Website button stays clickable. The caller hides/disables the button ONLY when this
 * resolves to `dead`.
 */
export const useWebsitePreviewable = (
	rawUrl: string | null | undefined
): { classification: WebsiteClassification; isResolved: boolean } => {
	const normalized = normalizeWebsiteUrl(rawUrl);
	const query = useQuery<WebsiteClassification>({
		queryKey: websitePreviewableQueryKey(normalized ?? 'none'),
		queryFn: () => loadPreviewable(normalized!),
		enabled: !!normalized,
		refetchOnMount: false,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
		retry: false,
		staleTime: STALE_TIME,
		gcTime: STALE_TIME,
	});
	return {
		classification: query.data ?? 'unknown',
		isResolved: !!normalized && query.isSuccess,
	};
};
