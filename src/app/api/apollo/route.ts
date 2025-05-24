import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import stringSimilarity from 'string-similarity';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/utils/api';
import { getValidatedParamsFromUrl } from '@/app/utils/url';
import { ApolloSearchResponse } from '@/types/apollo';
import { enrichApolloContacts, transformApolloContact } from '@/lib/apollo';

const getApolloContactsSchema = z.object({
	query: z.string(),
	limit: z.coerce.number().default(20),
});
export type GetApolloContactsData = z.infer<typeof getApolloContactsSchema>;

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const validatedFilters = getValidatedParamsFromUrl(req.url, getApolloContactsSchema);
		if (!validatedFilters.success) {
			return apiBadRequest(validatedFilters.error);
		}
		const { query, limit } = validatedFilters.data;
		const searchTerms: string[] = query
			.toLowerCase()
			.split(/\s+/)
			.filter((term) => term.length > 0);

		const allContacts = await prisma.contact.findMany({
			select: {
				id: true,
				name: true,
				company: true,
				state: true,
				country: true,
			},
		});

		// get an array of words in Contacts that are similar to the search terms
		const similarTermSets = searchTerms.map((term) => {
			const similarWords = new Set<string>();
			similarWords.add(term);

			allContacts.forEach((contact) => {
				const fieldsToCheck = [
					contact.name,
					contact.company,
					contact.state,
					contact.country,
				].filter((field): field is string => field !== null);

				fieldsToCheck.forEach((field) => {
					const words = field.toLowerCase().split(/\s+/);
					words.forEach((word) => {
						const similarity = stringSimilarity.compareTwoStrings(term, word);
						if (similarity > 0.7) {
							similarWords.add(word);
						}
					});
				});
			});

			return Array.from(similarWords);
		});

		const caseInsensitiveMode = 'insensitive' as const;
		const whereConditions =
			searchTerms.length > 0
				? {
						AND: similarTermSets.map((similarTerms) => ({
							OR: [
								...similarTerms.map((term) => ({
									OR: [
										{ name: { contains: term, mode: caseInsensitiveMode } },
										{ email: { contains: term, mode: caseInsensitiveMode } },
										{ company: { contains: term, mode: caseInsensitiveMode } },
										{ state: { contains: term, mode: caseInsensitiveMode } },
										{ country: { contains: term, mode: caseInsensitiveMode } },
										{ website: { contains: term, mode: caseInsensitiveMode } },
										{ phone: { contains: term, mode: caseInsensitiveMode } },
									],
								})),
							],
						})),
				  }
				: {};

		const localContacts = await prisma.contact.findMany({
			where: whereConditions,
			take: limit,
			orderBy: {
				company: 'asc',
			},
		});
		if (localContacts.length < limit) {
			const remainingCount = limit - localContacts.length;
			const apolloContacts = await fetchApolloContacts(searchTerms, remainingCount);
			const combinedResults = [...localContacts, ...apolloContacts];

			return apiResponse(combinedResults);
		}
		return apiResponse(localContacts);
	} catch (error) {
		return handleApiError(error);
	}
}

const fetchApolloContacts = async (searchTerms: string[], limit: number = 20) => {
	const apolloApiKey = process.env.APOLLO_API_KEY;
	if (!apolloApiKey) {
		console.error('Apollo API key not found');
		return [];
	}

	try {
		const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
			method: 'POST',
			headers: {
				accept: 'application/json',
				'Cache-Control': 'no-cache',
				'Content-Type': 'application/json',
				'x-api-key': apolloApiKey,
			},
			body: JSON.stringify({
				api_key: apolloApiKey,
				// page_size: limit,
				// q_keywords: query,
				include_similar_titles: true,
				person_titles: searchTerms,
				// contact_email_status: ['verified'],
			}),
		});

		if (!response.ok) {
			console.error('Apollo API error:', await response.text());
			return [];
		}

		const data = await response.json();
		console.log('peoples data');
		console.log(data);
		// First get the basic search results
		const searchResults = data.people || [];

		// Then enrich those results to get email addresses
		const enrichedPeople = await enrichApolloContacts(searchResults);

		// Transform the enriched contacts to match our schema
		return enrichedPeople.map(transformApolloContact);
	} catch (error) {
		console.error('Error fetching Apollo contacts:', error);
		return [];
	}
};
