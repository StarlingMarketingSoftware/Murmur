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

	// Strongly prefer items that are known major cities
	if (isCity(city, state)) score += 1000;

	// Prefer city name matches over state matches; startsWith beats contains
	if (cityLc.startsWith(q)) score += 400;
	else if (cityLc.includes(q)) score += 50;

	if (stateLc.startsWith(q)) score += 200;
	else if (stateLc.includes(q)) score += 10;

	// Apply explicit marquee-city boosts (e.g., make Philadelphia outrank Phoenix for "p")
	const key = `${cityLc}, ${stateLc}`;
	if (PRIORITY_CITY_SCORES[key]) score += PRIORITY_CITY_SCORES[key];

	// Light bonus when the query is very short (1 char): emphasize big-city startsWith
	if (q.length === 1 && cityLc.startsWith(q) && isCity(city, state)) {
		score += 75;
	}

	return score;
}

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { searchParams } = new URL(req.url);
		const query = searchParams.get('query');

		if (!query || query.length < 1) {
			return apiResponse([]);
		}

		const cleanQuery = query.trim();
		const searchTerms = [cleanQuery];

		// If query is 2 chars (likely abbreviation), add the full state name to search
		if (cleanQuery.length === 2) {
			const fullState = abbreviationToState[cleanQuery.toUpperCase()];
			if (fullState) {
				searchTerms.push(fullState);
			}
		}

		// If query matches a full state name, add the abbreviation to search
		const possibleAbbr = stateAbbreviations[cleanQuery.toLowerCase()];
		if (possibleAbbr) {
			searchTerms.push(possibleAbbr);
		}

		// Prioritize results that START with the query
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
			take: 20, // Increased take to allow for sorting
		});

		// Initial sort for startsWith results: Cities first
		startsWithResults.sort((a, b) => {
			const aIsCity = isCity(a.city!, a.state!);
			const bIsCity = isCity(b.city!, b.state!);
			if (aIsCity && !bIsCity) return -1;
			if (!aIsCity && bIsCity) return 1;
			return 0;
		});

		let finalResults = [...startsWithResults];

		// If we have fewer than 10 results, fetch those that CONTAIN the query
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

			// Initial sort for contains results: Cities first
			containsResults.sort((a, b) => {
				const aIsCity = isCity(a.city!, a.state!);
				const bIsCity = isCity(b.city!, b.state!);
				if (aIsCity && !bIsCity) return -1;
				if (!aIsCity && bIsCity) return 1;
				return 0;
			});

			finalResults = [...finalResults, ...containsResults];
		}

		// Strong re-sort of combined results using a scoring function that:
		// - strongly prefers marquee cities (NYC, LA, Philadelphia, Nashville)
		// - prefers city startsWith > state startsWith > contains
		// - always prefers city results over non-city locations
		finalResults.sort(
			(a, b) =>
				getSuggestionScore(
					b as { city: string | null; state: string | null },
					cleanQuery
				) -
				getSuggestionScore(a as { city: string | null; state: string | null }, cleanQuery)
		);

		// Format and deduplicate results
		const seen = new Set<string>();
		const locations = [];

		for (const r of finalResults) {
			if (!r.city || !r.state) continue;

			const key = `${r.city.toLowerCase()}-${r.state.toLowerCase()}`;
			if (!seen.has(key)) {
				seen.add(key);

				const city = r.city;
				const rawState = r.state;
				const stateAbbr = getStateAbbreviation(rawState);

				locations.push({
					city,
					state: rawState,
					label: `${city}, ${stateAbbr}`,
				});
			}

			if (locations.length >= 10) break;
		}

		return apiResponse(locations);
	} catch (error) {
		return handleApiError(error);
	}
}
