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

		// Sort startsWith results: Cities first
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

			// Sort contains results: Cities first
			containsResults.sort((a, b) => {
				const aIsCity = isCity(a.city!, a.state!);
				const bIsCity = isCity(b.city!, b.state!);
				if (aIsCity && !bIsCity) return -1;
				if (!aIsCity && bIsCity) return 1;
				return 0;
			});

			finalResults = [...finalResults, ...containsResults];
		}

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
