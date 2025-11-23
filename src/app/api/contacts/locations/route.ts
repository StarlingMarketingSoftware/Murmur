import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';

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

		const results = await prisma.contact.findMany({
			where: {
				OR: searchTerms.flatMap((term) => [
					{ city: { contains: term, mode: 'insensitive' } },
					{ state: { contains: term, mode: 'insensitive' } },
				]),
				// Ensure we have valid location data
				city: { not: null },
				state: { not: null },
			},
			select: {
				city: true,
				state: true,
			},
			distinct: ['city', 'state'],
			take: 10,
		});

		// Format results
		const locations = results
			.filter((r) => r.city && r.state) // Double check, though query enforces it
			.map((r) => {
				const city = r.city || '';
				const rawState = r.state || '';
				// Always format as "City, ST" in the label using abbreviation
				const stateAbbr = getStateAbbreviation(rawState);
				return {
					city,
					state: rawState,
					label: `${city}, ${stateAbbr}`,
				};
			});

		return apiResponse(locations);
	} catch (error) {
		return handleApiError(error);
	}
}
