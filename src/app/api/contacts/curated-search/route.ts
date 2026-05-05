import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import {
	WINE_BEER_SPIRITS_CONTACT_TITLE_PREFIXES,
	type BookingContactTitlePrefix,
} from '@/constants/contactCategories';
import { US_STATES } from '@/constants/usStates';
import {
	runCuratedNearbyPicks,
	DEFAULT_RADIUS_KM,
	type CuratedSearchContact,
} from './runCuratedNearbyPicks';

export type { CuratedSearchContact, CuratedQualityTier } from './runCuratedNearbyPicks';

export const maxDuration = 60;

const createRequestId = (): string => Math.random().toString(36).slice(2, 8);

const normalizeCategoryKey = (value: string | null | undefined): string =>
	(value ?? '')
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');

const CATEGORY_PARAM_ALIASES: Record<string, readonly BookingContactTitlePrefix[]> = {
	venues: ['Music Venues'],
	venue: ['Music Venues'],
	'music venues': ['Music Venues'],
	'music venue': ['Music Venues'],
	restaurants: ['Restaurants'],
	restaurant: ['Restaurants'],
	'coffee shops': ['Coffee Shops'],
	'coffee shop': ['Coffee Shops'],
	festivals: ['Music Festivals'],
	festival: ['Music Festivals'],
	'music festivals': ['Music Festivals'],
	'music festival': ['Music Festivals'],
	breweries: ['Breweries'],
	brewery: ['Breweries'],
	distilleries: ['Distilleries'],
	distillery: ['Distilleries'],
	wineries: ['Wineries'],
	winery: ['Wineries'],
	cideries: ['Cideries'],
	cidery: ['Cideries'],
	'wedding planners': ['Wedding Planners'],
	'wedding planner': ['Wedding Planners'],
	'wedding venues': ['Wedding Venues'],
	'wedding venue': ['Wedding Venues'],
	'wine beer and spirits': WINE_BEER_SPIRITS_CONTACT_TITLE_PREFIXES,
	'wine beer spirits': WINE_BEER_SPIRITS_CONTACT_TITLE_PREFIXES,
};

const resolveRequestedCategoryPrefixes = (
	value: string | null
): readonly BookingContactTitlePrefix[] | null => {
	const key = normalizeCategoryKey(value);
	if (!key) return null;
	return CATEGORY_PARAM_ALIASES[key] ?? null;
};

const parseFloatOrNull = (value: string | null): number | null => {
	if (!value) return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
};

const resolveStateCenter = (
	value: string | null
): { lat: number; lon: number; region: string } | null => {
	const normalized = (value ?? '').trim().toLowerCase();
	if (!normalized) return null;
	const state = US_STATES.find(
		(candidate) =>
			candidate.name.toLowerCase() === normalized ||
			candidate.abbr.toLowerCase() === normalized
	);
	if (!state) return null;
	return {
		lat: state.centroid.lat,
		lon: state.centroid.lng,
		region: state.name,
	};
};

interface ResolvedCenter {
	lat: number | null;
	lon: number | null;
	city: string | null;
	region: string | null;
}

const inferCenterFromRequest = (
	req: NextRequest,
	overrides: { lat: number | null; lon: number | null }
): ResolvedCenter => {
	if (overrides.lat != null && overrides.lon != null) {
		return { lat: overrides.lat, lon: overrides.lon, city: null, region: null };
	}
	const headers = req.headers;
	const lat = parseFloatOrNull(headers.get('x-vercel-ip-latitude'));
	const lon = parseFloatOrNull(headers.get('x-vercel-ip-longitude'));
	const city = headers.get('x-vercel-ip-city');
	const region =
		headers.get('x-vercel-ip-country-region') ??
		headers.get('x-vercel-ip-region') ??
		null;
	return {
		lat,
		lon,
		city: city ? decodeURIComponent(city) : null,
		region,
	};
};

const DEFAULT_RESULT_COUNT = 50;
const MAX_RESULT_COUNT = 100;
const CURATED_ROUTE_SOFT_BUDGET_MS = 52000;
const CURATED_ROUTE_SAFETY_MARGIN_MS = 3000;

const getCuratedRouteTimeoutMs = (startedAtMs: number): number =>
	Math.max(
		0,
		CURATED_ROUTE_SOFT_BUDGET_MS -
			(Date.now() - startedAtMs) -
			CURATED_ROUTE_SAFETY_MARGIN_MS
	);

const withBudgetFallback = async <T,>(
	operation: () => Promise<T>,
	options: {
		timeoutMs: number;
		fallback: T;
		label: string;
		requestId: string;
	}
): Promise<T> => {
	if (options.timeoutMs <= 0) {
		console.warn(
			`[curated-search][${options.requestId}] ${options.label} skipped because route budget is exhausted`
		);
		return options.fallback;
	}

	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let timedOut = false;

	try {
		const timeoutPromise = new Promise<T>((resolve) => {
			timeoutId = setTimeout(() => {
				timedOut = true;
				resolve(options.fallback);
			}, options.timeoutMs);
		});
		const result = await Promise.race([operation(), timeoutPromise]);
		if (timedOut) {
			console.warn(
				`[curated-search][${options.requestId}] ${options.label} exceeded ${options.timeoutMs}ms; returning fallback response`
			);
		}
		return result;
	} catch (error) {
		console.warn(
			`[curated-search][${options.requestId}] ${options.label} failed; returning fallback response`,
			error
		);
		return options.fallback;
	} finally {
		if (timeoutId) clearTimeout(timeoutId);
	}
};

export interface CuratedSearchResponse {
	categoryBreakdown: Record<string, number>;
	center: { lat: number; lon: number } | null;
	radiusKm: number | null;
	city: string | null;
	region: string | null;
	contacts: CuratedSearchContact[];
}

export async function GET(req: NextRequest) {
	const requestId = createRequestId();
	const requestStartedAt = Date.now();
	let clientAborted = false;
	const onAbort = () => {
		clientAborted = true;
		console.warn(
			`[curated-search][${requestId}] client aborted after ${Date.now() - requestStartedAt}ms`
		);
	};
	req.signal.addEventListener('abort', onAbort, { once: true });

	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const url = new URL(req.url);
		const overrideLat = parseFloatOrNull(url.searchParams.get('lat'));
		const overrideLon = parseFloatOrNull(url.searchParams.get('lon'));
		const overrideRadiusKm = parseFloatOrNull(url.searchParams.get('radiusKm'));
		const stateCenter = resolveStateCenter(url.searchParams.get('state'));
		const requestedCategoryPrefixes = resolveRequestedCategoryPrefixes(
			url.searchParams.get('category')
		);
		const requestedLimit = (() => {
			const parsed = Number(url.searchParams.get('limit'));
			if (!Number.isFinite(parsed)) return DEFAULT_RESULT_COUNT;
			return Math.max(1, Math.min(Math.trunc(parsed), MAX_RESULT_COUNT));
		})();

		const center = stateCenter
			? {
					lat: stateCenter.lat,
					lon: stateCenter.lon,
					city: null,
					region: stateCenter.region,
			  }
			: inferCenterFromRequest(req, { lat: overrideLat, lon: overrideLon });
		const hasCenter = center.lat != null && center.lon != null;
		const requestedRadiusKm = hasCenter
			? overrideRadiusKm ?? DEFAULT_RADIUS_KM
			: null;
		const centerPoint = hasCenter
			? { lat: center.lat as number, lon: center.lon as number }
			: null;

		const fallbackResult: Awaited<ReturnType<typeof runCuratedNearbyPicks>> = {
			contacts: [],
			categoryBreakdown: {},
			candidateSource: 'timeout',
			fetchMs: 0,
			effectiveCenter: centerPoint ?? { lat: 39.83, lon: -98.58 },
			effectiveRadiusKm: requestedRadiusKm,
			hasRealCenter: hasCenter,
		};
		const result = await withBudgetFallback(
			() =>
				runCuratedNearbyPicks({
					center: centerPoint,
					radiusKm: requestedRadiusKm,
					limit: requestedLimit,
					requestedCategoryPrefixes,
					logTag: `[curated-search][${requestId}]`,
				}),
			{
				timeoutMs: getCuratedRouteTimeoutMs(requestStartedAt),
				fallback: fallbackResult,
				label: 'curated picks pipeline',
				requestId,
			}
		);

		console.log(
			`[curated-search][${requestId}] returned=${result.contacts.length} totalMs=${
				Date.now() - requestStartedAt
			} clientAborted=${clientAborted}`
		);

		const response: CuratedSearchResponse = {
			categoryBreakdown: result.categoryBreakdown,
			center: centerPoint,
			radiusKm: requestedRadiusKm,
			city: center.city,
			region: center.region,
			contacts: result.contacts,
		};

		return apiResponse(response);
	} catch (error) {
		console.error(
			`[curated-search][${requestId}] failed after ${
				Date.now() - requestStartedAt
			}ms clientAborted=${clientAborted}`,
			error
		);
		return handleApiError(error);
	} finally {
		req.signal.removeEventListener('abort', onAbort);
	}
}
