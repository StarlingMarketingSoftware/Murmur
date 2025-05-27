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
import { enrichApolloContacts, transformApolloContact } from '@/app/utils/apollo';
import { OPEN_AI_MODEL_OPTIONS } from '@/constants';
import { fetchOpenAi } from '../openai/route';
import { stripUntilBrace } from '@/app/utils/string';
import { ApolloPerson } from '@/types/apollo';
import { Contact } from '@prisma/client';

const getApolloContactsSchema = z.object({
	query: z.string(),
	limit: z.coerce.number().default(20),
});
export type GetApolloContactsData = z.infer<typeof getApolloContactsSchema>;

const PROMPT = `You are an expert in Apollo.io's People Search API and are tasked with converting a search query in string format into a valid Apollo People Search object. Use the following guidelines:
	1. The returned object should match this Typescript type definition:
		type ApolloPeopleSearch = {
			person_titles?: string[]; // the more you add, the more results you get
			person_locations?: string[]; // cities, countries, and US states are supported
			person_seniorities?: string[]; // ONLY the following values are supported: owner, founder, c_suite, partner, vp, head, director, manager, senior, entry, intern
			organization_locations?: string[]; // The location of the company headquarters for a person's current employer. Cities, US states, and countries are supported
			contact_email_status?: string[]; // verified, unverified, likely to engage, unavailable, Set this to ['verified', 'likely to engage']
			organization_num_employees_ranges?: string[]; // The number of employees at a person's current employer. Each range consists of two numbers separated by a comma. Examples: 1,10; 250,500; 10000,20000
		}
	2. Here is an example of a valid Apollo People Search object in JSON string format. This is in response to the search query "senior level machine learning software engineer in San Francisco, CA or New York City in a small company based in the United States":
	{"person_titles": ["Software Engineer", "Data Scientist"],"person_locations": ["San Francisco", "New York City"],"person_seniorities": ["senior"],"organization_locations": ["United States"],"contact_email_status": ["verified", "likely to engage"],"organization_num_employees_ranges": ["1,10", "250,500"],"q_keywords": ""}
	3. For "contact_email_status", always use this value: ["verified", "likely to engage"]
	4. Ensure that your response is a valid JSON string that can be parsed by JSON.parse() in JavaScript.
	`;

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

		const allContacts = await prisma.contact.findMany({});

		// get an array of words in Contacts that are similar to the search terms
		const similarTermSets = searchTerms.map((term) => {
			const similarWords = new Set<string>();
			similarWords.add(term);

			allContacts.forEach((contact) => {
				const fieldsToCheck = [
					contact.firstName,
					contact.lastName,
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
										{ firstName: { contains: term, mode: caseInsensitiveMode } },
										{ lastName: { contains: term, mode: caseInsensitiveMode } },
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

		const localContacts: Contact[] = await prisma.contact.findMany({
			where: whereConditions,
			take: limit,
			orderBy: {
				company: 'asc',
			},
		});

		if (localContacts.length < limit) {
			const remainingCount = limit - localContacts.length;
			const apolloContacts: ApolloPerson[] = await fetchApolloContacts(
				query,
				remainingCount
			);

			// check for duplicates before enrichment, via apollo id
			const existingContacts: Contact[] = await prisma.contact.findMany({
				where: {
					apolloPersonId: {
						in: apolloContacts.map((person: ApolloPerson) => person.id),
					},
				},
			});

			// remove existing contacts from apolloContacts
			const filteredApolloContacts = apolloContacts.filter(
				(contact: ApolloPerson) =>
					!existingContacts.some(
						(existingContact) => existingContact.apolloPersonId === contact.id
					)
			);

			// loop through existingContacts...
			for (const existingContact of existingContacts) {
				// oadd the existing contact to localContacts
				const contactExistsInLocalSearch = localContacts.find(
					(contact) => contact.apolloPersonId === existingContact.apolloPersonId
				);
				if (!contactExistsInLocalSearch) {
					localContacts.push(existingContact);
				}
			}

			// for remaining apolloContacts, enrich them, and transform them
			const enrichedPeople = await enrichApolloContacts(filteredApolloContacts);
			const transformedContacts = enrichedPeople.map(transformApolloContact);

			// verify emails with zerobounce
			// const verifiedContacts = await verifyEmailsWithZeroBounce(transformedContacts);

			//  save to database
			const createdContacts: Contact[] = await prisma.contact.createManyAndReturn({
				data: transformedContacts,
			});

			//and MERGE with localContacts (wait until after saving, because you want the local id)
			const combinedResults = [...localContacts, ...createdContacts];

			return apiResponse(combinedResults);
		}
		return apiResponse(localContacts);
	} catch (error) {
		return handleApiError(error);
	}
}

const fetchApolloContacts = async (
	query: string,
	limit: number = 20
): Promise<ApolloPerson[]> => {
	const apolloApiKey = process.env.APOLLO_API_KEY;
	if (!apolloApiKey) {
		console.error('Apollo API key not found');
		return [];
	}

	const openAiResponse = await fetchOpenAi(
		OPEN_AI_MODEL_OPTIONS.o4mini,
		PROMPT,
		`Given the following search terms, create a valid Apollo People Search object. Search Query: ${query}`
	);
	console.log('🚀 ~ fetchApolloContacts ~ response:', openAiResponse);
	const openAiResponseJson = JSON.parse(stripUntilBrace(openAiResponse));

	try {
		const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
			method: 'POST',
			headers: {
				accept: 'application/json',
				'Cache-Control': 'no-cache',
				'Content-Type': 'application/json',
				'x-api-key': apolloApiKey,
			},
			body: JSON.stringify(openAiResponseJson),
		});

		if (!response.ok) {
			console.error('Apollo API error:', await response.text());
			return [];
		}

		const data = await response.json();
		return data.people || [];
	} catch (error) {
		console.error('Error fetching Apollo contacts:', error);
		return [];
	}
};
