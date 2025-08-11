import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	fetchOpenAi,
	handleApiError,
} from '@/app/api/_utils';
import { getValidatedParamsFromUrl } from '@/utils';
import { applyHardcodedLocationOverrides } from '@/app/api/_utils/searchPreprocess';
import { Contact, EmailVerificationStatus, Prisma } from '@prisma/client';
import { searchSimilarContacts, upsertContactToVectorDb } from '../_utils/vectorDb';
import { OPEN_AI_MODEL_OPTIONS } from '@/constants';

const VECTOR_SEARCH_LIMIT = 2000;

const createContactSchema = z.object({
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	company: z.string().optional(),
	email: z.string().email(),
	address: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	country: z.string().optional(),
	website: z.string().optional(),
	phone: z.string().optional(),
	title: z.string().optional(),
	headline: z.string().optional(),
	linkedInUrl: z.string().optional(),
	photoUrl: z.string().optional(),
	metadata: z.string().optional(),
	isPrivate: z.boolean().optional().default(false),
	userId: z.string().optional(),
	companyLinkedInUrl: z.string().optional(),
	companyFoundedYear: z.string().optional(),
	companyType: z.string().optional(),
	companyTechStack: z.array(z.string()).optional(),
	companyPostalCode: z.string().optional(),
	companyKeywords: z.array(z.string()).optional(),
	companyIndustry: z.string().optional(),
});

const contactFilterSchema = z.object({
	query: z.string().optional(),
	limit: z.coerce.number().optional(),
	verificationStatus: z.nativeEnum(EmailVerificationStatus).optional(),
	contactListIds: z.array(z.number()).optional(),
	useVectorSearch: z.boolean().optional(),
	location: z.string().optional(),
	excludeUsedContacts: z.boolean().optional(),
});

export type ContactFilterData = z.infer<typeof contactFilterSchema>;

export type PostContactData = z.infer<typeof createContactSchema>;

export async function GET(req: NextRequest) {
	try {
		console.log(
			'--- DEBUG: API Key from env:',
			process.env.OPENAI_API_KEY ? 'Exists' : 'MISSING!'
		);
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const validatedFilters = getValidatedParamsFromUrl(req.url, contactFilterSchema);
		if (!validatedFilters.success) {
			return apiBadRequest(validatedFilters.error);
		}
		const {
			contactListIds,
			verificationStatus,
			query,
			limit,
			useVectorSearch,
			location,
			excludeUsedContacts,
		} = validatedFilters.data;

		const locationResponse = await fetchOpenAi(
			OPEN_AI_MODEL_OPTIONS.o4mini,
			`You are a geography and language expert that can tell the difference between words that are city, states, or countries, and words that are not, based on knowledge about place names as well as semantics and context of a given sentence. You will be given a search query that may contain words that are city, states, or countries, amongst other non-location based terms. You will separate the location words from the rest of the query, and return the words that are city, state, or country, along with the rest of the query in a JSON string in the following format: {"city": "cityName", "state": "stateName", "country": "countryName", "restOfQuery": "restOfQuery"}. 
			
			Additional instructions:
			- Do not include country unless it is specified.
			- If the country in the query is some variant of the United States, return "United States of America". 
			- If the search term contains "new york", specify the state. Only specify the city if it says "new york city" or "NYC".
			- If there is no city, state, or country in the query, return null in the fields that are not found. For example: {"city": null, "state": "Pennsylvania", "country": null, "restOfQuery": "restOfQuery"} 
			- If any of the location terms are misspelled, returned the correct spelling. For example, if the query is "Pensylvania", return {"city": null, "state": "Pennsylvania", "country": null, "restOfQuery": "restOfQuery"}
			- If the query includes slang or abbreviations, return the official spelling. For example, if the query is "NYC", return {"city": "New York City", "state": null, "country": null, "restOfQuery": "restOfQuery"}
			- Return a valid JSON string that can be parsed by a JSON.parse() in JavaScript. 
			- There are some place names that can also be a word (such as buffalo steak house in new york) (Buffalo is a city in New York but it is also a general word for an animal). Use the context of the query to determine if the word is a place name or not.
			- Return the JSON string and nothing else.`,
			query || ''
		);

        let queryJson = JSON.parse(locationResponse);
        // Apply deterministic overrides (e.g., "manhattan" -> New York, NY)
        queryJson = applyHardcodedLocationOverrides(query || '', queryJson);
        const effectiveLocationStrategy = queryJson?.state ? 'strict' : 'flexible';

		const numberContactListIds: number[] =
			contactListIds?.map((id) => Number(id)).filter((id) => !isNaN(id)) || [];

		let contacts: Contact[] = [];

		const userContactLists = await prisma.userContactList.findMany({
			where: {
				userId: userId,
			},
			include: {
				contacts: true,
			},
		});

		const addedContactIds: number[] = [];

		if (excludeUsedContacts) {
			for (const list of userContactLists) {
				for (const contact of list.contacts) {
					addedContactIds.push(contact.id);
				}
			}
		}

		const substringSearch = async (): Promise<Contact[]> => {
			const searchTerms: string[] =
				query
					?.toLowerCase()
					.split(/\s+/)
					.filter((term) => term.length > 0) || [];
			const caseInsensitiveMode = 'insensitive' as const;
			const whereConditions: Prisma.ContactWhereInput = {
				AND: [
					// Search terms condition (only if there are search terms)
					...(searchTerms.length > 0
						? [
								{
									AND: searchTerms.map((term) => ({
										OR: [
											{ firstName: { contains: term, mode: caseInsensitiveMode } },
											{ lastName: { contains: term, mode: caseInsensitiveMode } },
											{ title: { contains: term, mode: caseInsensitiveMode } },
											{ email: { contains: term, mode: caseInsensitiveMode } },
											{ company: { contains: term, mode: caseInsensitiveMode } },
											{ city: { contains: term, mode: caseInsensitiveMode } },
											{ state: { contains: term, mode: caseInsensitiveMode } },
											{ country: { contains: term, mode: caseInsensitiveMode } },
											{ address: { contains: term, mode: caseInsensitiveMode } },
											{ headline: { contains: term, mode: caseInsensitiveMode } },
											{ linkedInUrl: { contains: term, mode: caseInsensitiveMode } },
											{ website: { contains: term, mode: caseInsensitiveMode } },
											{ phone: { contains: term, mode: caseInsensitiveMode } },
										],
									})),
								},
						  ]
						: []),
					// Email validation status condition
					...(verificationStatus
						? [{ emailValidationStatus: { equals: verificationStatus } }]
						: []),
					// Location condition (must match at least one location field)
					...(location
						? [
								{
									OR: [
										{ city: { contains: queryJson.city, mode: caseInsensitiveMode } },
										{
											state: { contains: queryJson.state, mode: caseInsensitiveMode },
										},
										{
											country: {
												contains: queryJson.country,
												mode: caseInsensitiveMode,
											},
										},
										{
											address: { contains: queryJson.city, mode: caseInsensitiveMode },
										},
										{
											address: {
												contains: queryJson.state,
												mode: caseInsensitiveMode,
											},
										},
										{
											address: {
												contains: queryJson.country,
												mode: caseInsensitiveMode,
											},
										},
									],
								},
						  ]
						: []),
					// Exclude used contacts condition
					...(excludeUsedContacts && addedContactIds.length > 0
						? [{ id: { notIn: addedContactIds } }]
						: []),
				],
			};

			return await prisma.contact.findMany({
				where: whereConditions,
				take: limit,
				orderBy: {
					userContactListCount: 'asc',
				},
			});
		};

		// if it's a search by ContactListId, only filter by this ContactList.id and validation status
		if (numberContactListIds.length > 0) {
			contacts = await prisma.contact.findMany({
				where: {
					userContactLists: {
						some: {
							id: {
								in: numberContactListIds,
							},
						},
					},
					emailValidationStatus: {
						equals: verificationStatus,
					},
				},
				orderBy: {
					company: 'asc',
				},
			});
			return apiResponse(contacts);
		}

		// If vector search is enabled and we have a query, use vector search
        if (useVectorSearch && query) {
			const vectorSearchResults = await searchSimilarContacts(
				queryJson,
				VECTOR_SEARCH_LIMIT,
                0.1,  // Reasonable threshold for kNN scores (0.0-1.0 range)
                effectiveLocationStrategy
			);
			// 8.1 seemed like a good limit to keep noise out of music venues...but restrictive for

			// Create a map of contactId to relevance score for efficient lookup
			// const relevanceMap = new Map<number, number>();
			// vectorSearchResults.matches.forEach((match, index) => {
			// 	const contactId = Number((match.metadata as { contactId: number }).contactId);
			// 	// Use the actual score from vector search, or fall back to rank-based scoring
			// 	const relevanceScore =
			// 		match.score || 1 - index / vectorSearchResults.matches.length;
			// 	relevanceMap.set(contactId, relevanceScore);
			// });

			const vectorSearchContactIds = vectorSearchResults.matches
				.map((match) => Number(match.metadata.contactId ?? match.id))
				.filter((n) => Number.isFinite(n));

			// const vectorSearchContactEmails = vectorSearchResults.matches.map(
			// 	(match) => match.metadata.email
			// ); // for testing production data locally

			contacts = await prisma.contact.findMany({
				where: {
					id: {
						in: vectorSearchContactIds,
						notIn: addedContactIds,
					},
					// email: { // for testing production data locally
					// 	in: vectorSearchContactEmails,
					// },
					emailValidationStatus: verificationStatus
						? {
								equals: verificationStatus,
						  }
						: undefined,
				},
			});

			// Fallback: if local Postgres doesn't have these contacts, return minimal data from Elasticsearch directly
			if (!contacts || contacts.length === 0) {
				const fallbackContacts = vectorSearchResults.matches.map((match) => {
					const md: any = match.metadata || {};
					const parsedId = Number(md.contactId);
					const toArray = (val: any) =>
						Array.isArray(val)
							? val
							: val
							? String(val)
									.split(',')
									.map((s) => s.trim())
									.filter(Boolean)
							: [];

					return {
						id: Number.isFinite(parsedId) ? parsedId : Math.floor(Math.random() * 1_000_000_000),
						apolloPersonId: null,
						firstName: md.firstName ?? null,
						lastName: md.lastName ?? null,
						email: md.email ?? '',
						company: md.company ?? null,
						city: md.city ?? null,
						state: md.state ?? null,
						country: md.country ?? null,
						address: md.address ?? null,
						phone: null,
						website: md.website ?? null,
						title: md.title ?? null,
						headline: md.headline ?? null,
						linkedInUrl: null,
						photoUrl: null,
						metadata: md.metadata ?? null,
						companyLinkedInUrl: null,
						companyFoundedYear: md.companyFoundedYear ?? null,
						companyType: md.companyType ?? null,
						companyTechStack: toArray(md.companyTechStack),
						companyPostalCode: null,
						companyKeywords: toArray(md.companyKeywords),
						companyIndustry: md.companyIndustry ?? null,
						latitude: null,
						longitude: null,
						isPrivate: false,
						hasVectorEmbedding: true,
						userContactListCount: 0,
						manualDeselections: 0,
						lastResearchedDate: null,
						emailValidationStatus: 'valid',
						emailValidationSubStatus: null,
						emailValidatedAt: null,
						createdAt: new Date().toISOString() as unknown as Date,
						updatedAt: new Date().toISOString() as unknown as Date,
						userId: null,
						contactListId: null,
					};
				});

				return apiResponse(fallbackContacts.slice(0, limit));
			}

			// if (contacts.length < 100) {
			// 	const fallbackContacts = await substringSearch();
			// 	const existingContactIds = new Set(contacts.map((contact) => contact.id));
			// 	const uniqueFallbackContacts = fallbackContacts.filter(
			// 		(contact) => !existingContactIds.has(contact.id)
			// 	);

			// 	contacts = [...contacts, ...uniqueFallbackContacts];
			// }

			// balanced sorting combining relevance and userContactListCount
			// const maxUserContactListCount = Math.max(
			// 	...contacts.map((c) => c.userContactListCount),
			// 	1
			// );

			// contacts.sort((a, b) => {
			// 	const aRelevance = relevanceMap.get(a.id) || 0;
			// 	const bRelevance = relevanceMap.get(b.id) || 0;

			// 	// Normalize userContactListCount (invert so lower count = higher score)
			// 	const aCountScore = 1 - a.userContactListCount / maxUserContactListCount;
			// 	const bCountScore = 1 - b.userContactListCount / maxUserContactListCount;

			// 	// Weighted combination (70% relevance, 30% userContactListCount)
			// 	const aCompositeScore = 0.4 * aRelevance + 0.6 * aCountScore;
			// 	const bCompositeScore = 0.4 * bRelevance + 0.6 * bCountScore;

			// 	// Sort by composite score (descending - higher score first)
			// 	return bCompositeScore - aCompositeScore;
			// });

			return apiResponse(contacts.slice(0, limit));
		} else {
			// Use regular search if vector search is not enabled
			contacts = await substringSearch();

			return apiResponse(contacts);
		}
	} catch (error) {
		return handleApiError(error);
	}
}

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = createContactSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { isPrivate, userId: passedUserId, ...contactData } = validatedData.data;

		if (isPrivate && !passedUserId) {
			return apiBadRequest('Private contacts must be associated with a user');
		}

		if (!isPrivate && passedUserId) {
			return apiBadRequest('Non-private contacts cannot be associated with a user');
		}

		if (passedUserId !== userId) {
			return apiUnauthorized('User passed userId that is not the current user');
		}

		const contact = await prisma.contact.create({
			data: {
				...contactData,
				user: passedUserId ? { connect: { clerkId: passedUserId } } : undefined,
			},
		});

		if (!isPrivate) {
			await upsertContactToVectorDb(contact);
		}

		return apiResponse(contact);
	} catch (error) {
		return handleApiError(error);
	}
}
