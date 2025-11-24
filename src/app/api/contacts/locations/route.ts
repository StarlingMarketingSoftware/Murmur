import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { CITY_LOCATIONS_SET } from '@/constants/cityLocations';

// Helper function to map state names to abbreviations
const stateAbbreviations: Record<string, string> = {
	alabama: 'AL',
	alaska: 'AK',
	arizona: 'AZ',
	arkansas: 'AR',
	california: 'CA',
	colorado: 'CO',
	connecticut: 'CT',
	delaware: 'DE',
	florida: 'FL',
	georgia: 'GA',
	hawaii: 'HI',
	idaho: 'ID',
	illinois: 'IL',
	indiana: 'IN',
	iowa: 'IA',
	kansas: 'KS',
	kentucky: 'KY',
	louisiana: 'LA',
	maine: 'ME',
	maryland: 'MD',
	massachusetts: 'MA',
	michigan: 'MI',
	minnesota: 'MN',
	mississippi: 'MS',
	missouri: 'MO',
	montana: 'MT',
	nebraska: 'NE',
	nevada: 'NV',
	'new hampshire': 'NH',
	'new jersey': 'NJ',
	'new mexico': 'NM',
	'new york': 'NY',
	'north carolina': 'NC',
	'north dakota': 'ND',
	ohio: 'OH',
	oklahoma: 'OK',
	oregon: 'OR',
	pennsylvania: 'PA',
	'rhode island': 'RI',
	'south carolina': 'SC',
	'south dakota': 'SD',
	tennessee: 'TN',
	texas: 'TX',
	utah: 'UT',
	vermont: 'VT',
	virginia: 'VA',
	washington: 'WA',
	'west virginia': 'WV',
	wisconsin: 'WI',
	wyoming: 'WY',
	'district of columbia': 'DC',
};

// Helper to reverse map abbreviations to full state names (approximate)
// Used for expanding search query
const abbreviationToState: Record<string, string> = Object.entries(
	stateAbbreviations
).reduce((acc, [name, abbr]) => {
	acc[abbr] = name;
	return acc;
}, {} as Record<string, string>);

function getStateAbbreviation(stateName: string): string {
	if (!stateName) return '';
	const normalized = stateName.trim().toLowerCase();
	if (/^[A-Z]{2}$/.test(stateName.trim())) return stateName.trim();
	return stateAbbreviations[normalized] || stateName;
}

function isCity(city: string, state: string): boolean {
	const key = `${city.trim()}, ${state.trim()}`.toLowerCase();
	return CITY_LOCATIONS_SET.has(key);
}

// Explicit priority boosts for marquee cities to strongly prefer them in suggestions
// Keys must be lowercased "city, state"
const PRIORITY_CITY_SCORES: Record<string, number> = {
	'new york, new york': 100,
	'los angeles, california': 95,
	'chicago, illinois': 94,
	'houston, texas': 93,
	'philadelphia, pennsylvania': 92,
	'phoenix, arizona': 92,
	'san antonio, texas': 91,
	'san diego, california': 91,
	'dallas, texas': 91,
	'san jose, california': 91,
	'nashville, tennessee': 90,
	'austin, texas': 90,
	'new orleans, louisiana': 90,
	'atlanta, georgia': 90,
	'miami, florida': 90,
	'tampa, florida': 90,
	'st. petersburg, florida': 90,
	'orlando, florida': 90,
	'denver, colorado': 90,
	'seattle, washington': 90,
	'portland, oregon': 90,
	'boston, massachusetts': 90,
	'washington, district of columbia': 90,
	'baltimore, maryland': 90,
	'pittsburgh, pennsylvania': 90,
	'cleveland, ohio': 90,
	'charlotte, north carolina': 90,
	'raleigh, north carolina': 90,
	'durham, north carolina': 90,
	'indianapolis, indiana': 90,
	'columbus, ohio': 90,
	'cincinnati, ohio': 90,
	'las vegas, nevada': 90,
	'salt lake city, utah': 90,
	'detroit, michigan': 90,
	'minneapolis, minnesota': 90,
	'saint paul, minnesota': 90,
	'milwaukee, wisconsin': 90,
	'st. louis, missouri': 90,
	'kansas city, missouri': 90,
	'the bronx, new york': 89,
	'brooklyn, new york': 89,
	'manhattan, new york': 89,
	'queens, new york': 89,
	'staten island, new york': 89,
};

function getSuggestionScore(
	record: { city: string | null; state: string | null },
	rawQuery: string
): number {
	const city = (record.city || '').trim();
	const state = (record.state || '').trim();
	const q = rawQuery.trim().toLowerCase();
	const cityLc = city.toLowerCase();
	const stateLc = state.toLowerCase();

	let score = 0;

	// Handle "City, State" query parsing for scoring boost
	let qCity = q;
	let qState = '';
	let fullQState = '';

	if (q.includes(',')) {
		const parts = q.split(',');
		qCity = parts[0].trim();
		if (parts.length > 1) {
			qState = parts[parts.length - 1].trim();
			// Try to expand qState if it's an abbreviation
			fullQState = abbreviationToState[qState.toUpperCase()];
			if (!fullQState && qState.length > 2) {
				fullQState = qState;
			}
		}
	}

	// Strongly prefer items that are known major cities
	if (isCity(city, state)) score += 1000;

	// Prefer city name matches over state matches; startsWith beats contains
	// Check if city matches the query or the city part of a split query
	if (cityLc.startsWith(q) || (qCity && cityLc.startsWith(qCity))) score += 400;
	else if (cityLc.includes(q) || (qCity && cityLc.includes(qCity))) score += 50;

	if (stateLc.startsWith(q)) score += 200;
	else if (stateLc.includes(q)) score += 10;

	// Boost if state matches the state part of a "City, State" query
	// Check both raw state part and expanded full state name
	if (qState) {
		if (stateLc.startsWith(qState) || stateLc.includes(qState)) {
			score += 150;
		}
		if (fullQState && (stateLc.startsWith(fullQState) || stateLc.includes(fullQState))) {
			score += 150;
		}
	}

	// Apply explicit marquee-city boosts (e.g., make Philadelphia outrank Phoenix for "p")
	const key = `${cityLc}, ${stateLc}`;
	if (PRIORITY_CITY_SCORES[key]) score += PRIORITY_CITY_SCORES[key];

	// Light bonus when the query is very short (1 char): emphasize big-city startsWith
	if (q.length === 1 && cityLc.startsWith(q) && isCity(city, state)) {
		score += 75;
	}

	return score;
}

function buildStateSearchTerms(cleanQuery: string): string[] {
	const terms = [cleanQuery];

	if (cleanQuery.includes(',')) {
		const parts = cleanQuery.split(',');
		const statePart = parts[parts.length - 1].trim();

		let fullState = abbreviationToState[statePart.toUpperCase()];
		if (!fullState && statePart.length > 2) {
			fullState = statePart;
		}

		if (fullState) {
			terms.push(fullState);
		} else if (statePart.length > 0) {
			terms.push(statePart);
		}
	}

	if (cleanQuery.length === 2) {
		const fullState = abbreviationToState[cleanQuery.toUpperCase()];
		if (fullState) terms.push(fullState);
	}

	const possibleAbbr = stateAbbreviations[cleanQuery.toLowerCase()];
	if (possibleAbbr) terms.push(possibleAbbr);

	return Array.from(new Set(terms.filter(Boolean)));
}

function buildCitySearchTerms(cleanQuery: string): string[] {
	const terms = [cleanQuery];

	if (cleanQuery.includes(',')) {
		const parts = cleanQuery.split(',');
		const cityPart = parts[0].trim();
		const statePart = parts[parts.length - 1].trim();

		let fullState = abbreviationToState[statePart.toUpperCase()];
		if (!fullState && statePart.length > 2) {
			fullState = statePart;
		}

		if (fullState) {
			terms.push(fullState);
		} else if (statePart.length > 0) {
			terms.push(statePart);
		}

		if (cityPart.length > 0) {
			terms.push(cityPart);
		}
	}

	if (cleanQuery.length === 2) {
		const fullState = abbreviationToState[cleanQuery.toUpperCase()];
		if (fullState) {
			terms.push(fullState);
		}
	}

	const possibleAbbr = stateAbbreviations[cleanQuery.toLowerCase()];
	if (possibleAbbr) {
		terms.push(possibleAbbr);
	}

	return Array.from(new Set(terms.filter(Boolean)));
}

async function fetchStateSuggestions(cleanQuery: string) {
	const searchTerms = buildStateSearchTerms(cleanQuery);

	const stateResults = await prisma.contact.findMany({
		where: {
			OR: searchTerms.flatMap((term) => [
				{ state: { startsWith: term, mode: 'insensitive' } },
				{ state: { contains: term, mode: 'insensitive' } },
			]),
			state: { not: null },
		},
		select: {
			state: true,
		},
		distinct: ['state'],
		take: 20,
	});

	return stateResults
		.filter((r) => r.state)
		.map((r) => ({
			city: '',
			state: r.state!,
			label: r.state!,
		}));
}

interface CitySuggestionOptions {
	requireKnownCity?: boolean;
}

async function fetchCitySuggestions(
	cleanQuery: string,
	options: CitySuggestionOptions = {}
) {
	const searchTerms = buildCitySearchTerms(cleanQuery);

	const startsWithResults = await prisma.contact.findMany({
		where: {
			OR: searchTerms.flatMap((term) => [
				{ city: { startsWith: term, mode: 'insensitive' } },
				{ state: { startsWith: term, mode: 'insensitive' } },
			]),
			city: { not: null },
			state: { not: null },
		},
		select: {
			city: true,
			state: true,
		},
		distinct: ['city', 'state'],
		take: 20,
	});

	startsWithResults.sort((a, b) => {
		const aIsCity = isCity(a.city!, a.state!);
		const bIsCity = isCity(b.city!, b.state!);
		if (aIsCity && !bIsCity) return -1;
		if (!aIsCity && bIsCity) return 1;
		return 0;
	});

	let finalResults = [...startsWithResults];

	if (finalResults.length < 10) {
		const containsResults = await prisma.contact.findMany({
			where: {
				OR: searchTerms.flatMap((term) => [
					{ city: { contains: term, mode: 'insensitive' } },
					{ state: { contains: term, mode: 'insensitive' } },
				]),
				city: { not: null },
				state: { not: null },
			},
			select: {
				city: true,
				state: true,
			},
			distinct: ['city', 'state'],
			take: 20,
		});

		containsResults.sort((a, b) => {
			const aIsCity = isCity(a.city!, a.state!);
			const bIsCity = isCity(b.city!, b.state!);
			if (aIsCity && !bIsCity) return -1;
			if (!aIsCity && bIsCity) return 1;
			return 0;
		});

		finalResults = [...finalResults, ...containsResults];
	}

	finalResults.sort(
		(a, b) =>
			getSuggestionScore(b as { city: string | null; state: string | null }, cleanQuery) -
			getSuggestionScore(a as { city: string | null; state: string | null }, cleanQuery)
	);

	const seen = new Set<string>();
	const locations = [];

	for (const r of finalResults) {
		if (!r.city || !r.state) continue;
		if (options.requireKnownCity && !isCity(r.city, r.state)) continue;

		const key = `${r.city.toLowerCase()}-${r.state.toLowerCase()}`;
		if (seen.has(key)) continue;
		seen.add(key);

		const city = r.city;
		const rawState = r.state;
		const stateAbbr = getStateAbbreviation(rawState);

		locations.push({
			city,
			state: rawState,
			label: `${city}, ${stateAbbr}`,
		});

		if (locations.length >= 10) break;
	}

	return locations;
}

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { searchParams } = new URL(req.url);
		const query = searchParams.get('query');
		const mode = searchParams.get('mode'); // 'state', 'state-first', or undefined

		if (!query || query.length < 1) {
			return apiResponse([]);
		}

		const cleanQuery = query.trim();

		if (mode === 'state-first') {
			const [stateLocations, cityLocations] = await Promise.all([
				fetchStateSuggestions(cleanQuery),
				fetchCitySuggestions(cleanQuery, { requireKnownCity: true }),
			]);

			return apiResponse([...stateLocations, ...cityLocations]);
		}

		if (mode === 'state') {
			const stateLocations = await fetchStateSuggestions(cleanQuery);
			return apiResponse(stateLocations);
		}

		const cityLocations = await fetchCitySuggestions(cleanQuery);
		return apiResponse(cityLocations);
	} catch (error) {
		return handleApiError(error);
	}
}
