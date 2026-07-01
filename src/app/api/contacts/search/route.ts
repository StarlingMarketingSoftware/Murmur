import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import {
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import {
	createRequestId,
	parseFloatOrNull,
	runFreeTextSearch,
} from './engine';

// HTTP shell for the free-text search engine. All search behavior lives in
// ./engine.ts (runFreeTextSearch) so the legacy /api/contacts route can
// delegate to the same brain and the search-quality harness can drive the
// full pipeline without HTTP. This file owns ONLY: rate limiting, auth,
// query-param parsing, abort logging, and error mapping.

export const maxDuration = 60;

export type {
	FreeTextSearchContact,
	FreeTextSearchResponse,
} from './engine';

export async function GET(req: NextRequest) {
	const requestId = createRequestId();
	const requestStartedAt = Date.now();
	let clientAborted = false;
	const onAbort = () => {
		clientAborted = true;
		console.warn(
			`[contacts-search][${requestId}] client aborted after ${Date.now() - requestStartedAt}ms`
		);
	};
	req.signal.addEventListener('abort', onAbort, { once: true });

	try {
		const limited = await withRateLimit(req, 'search-heavy', 'contacts-search');
		if (limited) return limited;

		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const url = new URL(req.url);
		const response = await runFreeTextSearch({
			rawQuery: (url.searchParams.get('q') ?? '').trim(),
			overrideLat: parseFloatOrNull(url.searchParams.get('lat')),
			overrideLon: parseFloatOrNull(url.searchParams.get('lon')),
			overrideRadiusKm: parseFloatOrNull(url.searchParams.get('radiusKm')),
			keywordMode:
				url.searchParams.get('keywordMode') === '1' ||
				url.searchParams.get('keywordMode') === 'true',
			strictRadius:
				url.searchParams.get('strictRadius') === '1' ||
				url.searchParams.get('strictRadius') === 'true',
			profileGenre: (url.searchParams.get('profileGenre') ?? '').trim(),
			profileEmbedText: (url.searchParams.get('profileEmbedText') ?? '').trim(),
			profileArea: (url.searchParams.get('profileArea') ?? '').trim(),
			limit: url.searchParams.get('limit') != null
				? Number(url.searchParams.get('limit'))
				: null,
			ipHeaders: req.headers,
			requestId,
			requestStartedAt,
		});
		return apiResponse(response);
	} catch (error) {
		console.error(
			`[contacts-search][${requestId}] failed after ${Date.now() - requestStartedAt}ms clientAborted=${clientAborted}`,
			error
		);
		return handleApiError(error);
	} finally {
		req.signal.removeEventListener('abort', onAbort);
	}
}
