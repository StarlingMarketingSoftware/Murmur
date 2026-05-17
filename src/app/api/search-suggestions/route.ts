import { NextResponse, type NextRequest } from 'next/server';

import { type BookingContactTitlePrefix } from '@/constants/contactCategories';
import { type UsStateCentroid, US_STATES } from '@/constants/usStates';

export const dynamic = 'force-dynamic';

type GeoSource = 'query' | 'header' | 'fallback';

type SuggestionState = {
	name: string;
	abbr: string;
};

type SearchSuggestion = {
	label: string;
	category: BookingContactTitlePrefix;
	state: SuggestionState;
	score: number;
};

type SearchSuggestionsResponse = {
	suggestions: SearchSuggestion[];
	location: {
		center: { lat: number; lon: number } | null;
		city: string | null;
		region: string | null;
		source: GeoSource;
		nearbyStates: SuggestionState[];
	};
};

type CategorySignal = {
	category: BookingContactTitlePrefix;
	baseScore: number;
	stateBoosts: readonly string[];
	templates: readonly string[];
};

const DEFAULT_STATE_ABBRS = ['NY', 'NJ', 'PA'] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

const CATEGORY_SIGNALS = [
	{
		category: 'Wineries',
		baseScore: 7.6,
		stateBoosts: ['CA', 'NY', 'OR', 'WA', 'VA', 'PA', 'MI', 'TX', 'NC', 'NJ'],
		templates: [
			'Wineries with acoustic nights in {state}',
			'Vineyards booking live music in {state}',
			'Wineries that host touring acts in {state}',
		],
	},
	{
		category: 'Breweries',
		baseScore: 7.3,
		stateBoosts: ['CO', 'OR', 'WA', 'CA', 'PA', 'NY', 'NC', 'MI', 'NJ', 'VT', 'ME', 'MA'],
		templates: [
			'Breweries with live music in {state}',
			'Brewery taprooms booking bands in {state}',
			'Breweries with weekend shows in {state}',
		],
	},
	{
		category: 'Music Venues',
		baseScore: 6.9,
		stateBoosts: ['NY', 'CA', 'TN', 'TX', 'IL', 'GA', 'LA', 'PA', 'WA', 'MA'],
		templates: [
			'Small music venues in {state}',
			'Listening-room music venues in {state}',
			'Music venues booking emerging acts in {state}',
		],
	},
	{
		category: 'Coffee Shops',
		baseScore: 6.7,
		stateBoosts: ['WA', 'OR', 'CA', 'NY', 'MA', 'CO', 'PA', 'VT'],
		templates: [
			'Coffee shops with open mic nights in {state}',
			'Coffeehouses booking acoustic sets in {state}',
			'Coffee shops with singer-songwriter nights in {state}',
		],
	},
	{
		category: 'Restaurants',
		baseScore: 6.6,
		stateBoosts: ['NY', 'CA', 'LA', 'IL', 'FL', 'TX', 'GA', 'NC', 'PA'],
		templates: [
			'Restaurants with live music patios in {state}',
			'Restaurants booking local bands in {state}',
			'Dinner spots with live music in {state}',
		],
	},
	{
		category: 'Music Festivals',
		baseScore: 6.5,
		stateBoosts: ['CA', 'TX', 'TN', 'NY', 'IL', 'LA', 'GA', 'FL', 'CO'],
		templates: [
			'Music festivals booking local acts in {state}',
			'Community music festivals in {state}',
			'Outdoor music festivals in {state}',
		],
	},
	{
		category: 'Distilleries',
		baseScore: 6.3,
		stateBoosts: ['KY', 'TN', 'TX', 'LA', 'NY', 'CA', 'PA', 'NJ'],
		templates: [
			'Distilleries with weekend shows in {state}',
			'Distillery tasting rooms booking bands in {state}',
			'Distilleries with live music nights in {state}',
		],
	},
	{
		category: 'Cideries',
		baseScore: 6.1,
		stateBoosts: ['NY', 'VT', 'MA', 'ME', 'MI', 'WA', 'OR', 'PA', 'VA'],
		templates: [
			'Cideries with folk nights in {state}',
			'Cider houses booking acoustic acts in {state}',
			'Cideries with live music in {state}',
		],
	},
	{
		category: 'Wedding Venues',
		baseScore: 5.8,
		stateBoosts: ['NJ', 'NY', 'PA', 'CA', 'FL', 'TX', 'VA', 'NC', 'GA'],
		templates: [
			'Wedding venues booking live bands in {state}',
			'Wedding venues with preferred musicians in {state}',
			'Event barns booking live music in {state}',
		],
	},
] as const satisfies readonly CategorySignal[];

export async function GET(req: NextRequest) {
	const location = inferLocation(req);
	const nearbyStates = getNearbyStates(location.center, location.state);
	const seed = createSeed(location, nearbyStates);
	const usedCategories = new Set<BookingContactTitlePrefix>();

	const suggestions = nearbyStates.map((state, index) => {
		const signal = selectCategorySignal(state, usedCategories, index, seed);
		usedCategories.add(signal.category);
		const template = signal.templates[
			stableIndex(`${seed}:${state.abbr}:${signal.category}`, signal.templates.length)
		];

		return {
			label: template.replace('{state}', state.name),
			category: signal.category,
			state: toSuggestionState(state),
			score: roundScore(scoreCategoryForState(signal, state, index, seed)),
		};
	});

	const response = NextResponse.json<SearchSuggestionsResponse>({
		suggestions,
		location: {
			center: location.center,
			city: location.city,
			region: location.state?.name ?? location.region,
			source: location.source,
			nearbyStates: nearbyStates.map(toSuggestionState),
		},
	});
	response.headers.set('Cache-Control', 'private, max-age=1800');
	return response;
}

function inferLocation(req: NextRequest): {
	center: { lat: number; lon: number } | null;
	city: string | null;
	region: string | null;
	state: UsStateCentroid | null;
	source: GeoSource;
} {
	const url = new URL(req.url);
	const queryLat = parseFiniteNumber(url.searchParams.get('lat'));
	const queryLon = parseFiniteNumber(url.searchParams.get('lon'));
	const queryCity = cleanText(url.searchParams.get('city'));
	const queryRegion = cleanText(url.searchParams.get('region'));
	const queryRegionCode = cleanText(url.searchParams.get('regionCode'));
	const queryState = resolveState(queryRegionCode, queryRegion);

	if (queryLat !== null && queryLon !== null) {
		return {
			center: { lat: queryLat, lon: queryLon },
			city: queryCity,
			region: queryState?.name ?? queryRegion,
			state: queryState,
			source: 'query',
		};
	}

	if (queryState) {
		return {
			center: {
				lat: queryState.centroid.lat,
				lon: queryState.centroid.lng,
			},
			city: queryCity,
			region: queryState.name,
			state: queryState,
			source: 'query',
		};
	}

	const headers = req.headers;
	const headerLat = parseFiniteNumber(headers.get('x-vercel-ip-latitude'));
	const headerLon = parseFiniteNumber(headers.get('x-vercel-ip-longitude'));
	const headerCity = decodeHeader(headers.get('x-vercel-ip-city'));
	const headerRegion = decodeHeader(
		headers.get('x-vercel-ip-country-region') ?? headers.get('x-vercel-ip-region')
	);
	const headerState = resolveState(headerRegion);

	if (headerLat !== null && headerLon !== null) {
		return {
			center: { lat: headerLat, lon: headerLon },
			city: headerCity,
			region: headerState?.name ?? headerRegion,
			state: headerState,
			source: 'header',
		};
	}

	if (headerState) {
		return {
			center: {
				lat: headerState.centroid.lat,
				lon: headerState.centroid.lng,
			},
			city: headerCity,
			region: headerState.name,
			state: headerState,
			source: 'header',
		};
	}

	return {
		center: null,
		city: null,
		region: null,
		state: null,
		source: 'fallback',
	};
}

function getNearbyStates(
	center: { lat: number; lon: number } | null,
	preferredState: UsStateCentroid | null
): UsStateCentroid[] {
	if (!center && !preferredState) {
		return DEFAULT_STATE_ABBRS.map((abbr) => US_STATES.find((state) => state.abbr === abbr))
			.filter((state): state is UsStateCentroid => Boolean(state));
	}

	const origin = center ?? {
		lat: preferredState!.centroid.lat,
		lon: preferredState!.centroid.lng,
	};
	const sorted = [...US_STATES].sort(
		(a, b) => distanceToState(origin, a) - distanceToState(origin, b)
	);

	const nearby = preferredState ? [preferredState] : [];
	for (const state of sorted) {
		if (nearby.some((candidate) => candidate.abbr === state.abbr)) continue;
		nearby.push(state);
		if (nearby.length === 3) break;
	}

	return nearby;
}

function selectCategorySignal(
	state: UsStateCentroid,
	usedCategories: Set<BookingContactTitlePrefix>,
	index: number,
	seed: number
): CategorySignal {
	const availableSignals = CATEGORY_SIGNALS.filter(
		(signal) => !usedCategories.has(signal.category)
	);
	const candidates = availableSignals.length > 0 ? availableSignals : CATEGORY_SIGNALS;

	return candidates.reduce((best, signal) => {
		const bestScore = scoreCategoryForState(best, state, index, seed);
		const signalScore = scoreCategoryForState(signal, state, index, seed);
		return signalScore > bestScore ? signal : best;
	}, candidates[0]);
}

function scoreCategoryForState(
	signal: CategorySignal,
	state: UsStateCentroid,
	index: number,
	seed: number
): number {
	const stateBoost = signal.stateBoosts.includes(state.abbr) ? 2.1 : 0;
	const slotPenalty = index * 0.12;
	const jitter = stableIndex(`${seed}:${state.abbr}:${signal.category}:score`, 25) / 100;
	return signal.baseScore + stateBoost + jitter - slotPenalty;
}

function createSeed(
	location: { city: string | null; region: string | null; source: GeoSource },
	states: readonly UsStateCentroid[]
): number {
	const dayBucket = Math.floor(Date.now() / DAY_MS);
	return hashString(
		[
			location.city ?? '',
			location.region ?? '',
			location.source,
			states.map((state) => state.abbr).join(','),
			String(dayBucket),
		].join('|')
	);
}

function resolveState(...values: Array<string | null>): UsStateCentroid | null {
	for (const value of values) {
		const normalized = normalizeStateKey(value);
		if (!normalized) continue;
		const match = US_STATES.find(
			(state) =>
				normalizeStateKey(state.name) === normalized ||
				normalizeStateKey(state.abbr) === normalized
		);
		if (match) return match;
	}
	return null;
}

function distanceToState(
	origin: { lat: number; lon: number },
	state: UsStateCentroid
): number {
	return distanceKm(origin, {
		lat: state.centroid.lat,
		lon: state.centroid.lng,
	});
}

function distanceKm(
	a: { lat: number; lon: number },
	b: { lat: number; lon: number }
): number {
	const earthRadiusKm = 6371;
	const dLat = toRadians(b.lat - a.lat);
	const dLon = toRadians(b.lon - a.lon);
	const lat1 = toRadians(a.lat);
	const lat2 = toRadians(b.lat);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
	return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRadians(value: number): number {
	return (value * Math.PI) / 180;
}

function parseFiniteNumber(value: string | null): number | null {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: string | null): string | null {
	const cleaned = value?.trim();
	return cleaned ? cleaned : null;
}

function decodeHeader(value: string | null): string | null {
	if (!value) return null;
	try {
		return cleanText(decodeURIComponent(value));
	} catch {
		return cleanText(value);
	}
}

function normalizeStateKey(value: string | null): string {
	return (value ?? '')
		.toLowerCase()
		.replace(/[^a-z]/g, '')
		.trim();
}

function stableIndex(value: string, modulo: number): number {
	if (modulo <= 0) return 0;
	return Math.abs(hashString(value)) % modulo;
}

function hashString(value: string): number {
	let hash = 5381;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash * 33) ^ value.charCodeAt(i);
	}
	return hash >>> 0;
}

function roundScore(score: number): number {
	return Math.round(score * 100) / 100;
}

function toSuggestionState(state: UsStateCentroid): SuggestionState {
	return {
		name: state.name,
		abbr: state.abbr,
	};
}
