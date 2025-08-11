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
import { getPostTrainingForQuery } from '@/app/api/_utils/postTraining';
import { applyHardcodedLocationOverrides } from '@/app/api/_utils/searchPreprocess';
import { Contact, EmailVerificationStatus, Prisma } from '@prisma/client';
import { searchSimilarContacts, upsertContactToVectorDb } from '../_utils/vectorDb';
import { OPEN_AI_MODEL_OPTIONS } from '@/constants';

const VECTOR_SEARCH_LIMIT_DEFAULT = 100;

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
			'--- DEBUG: API Key from env (OPEN_AI_API_KEY):',
			process.env.OPEN_AI_API_KEY ? 'Exists' : 'MISSING!'
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

        let locationResponse: string | null = null;
        const rawQuery = query || '';
        if (process.env.OPEN_AI_API_KEY && rawQuery) {
            locationResponse = await fetchOpenAi(
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
                rawQuery
            );
        }

        // Parse location via LLM with a fast timeout and graceful fallback or no-LLM fallback
        let queryJson: { city: string | null; state: string | null; country: string | null; restOfQuery: string } = {
            city: null,
            state: null,
            country: null,
            restOfQuery: rawQuery
        };
        if (locationResponse) {
            try {
                const parsed = JSON.parse(locationResponse);
                queryJson = {
                    city: parsed?.city ?? null,
                    state: parsed?.state ?? null,
                    country: parsed?.country ?? null,
                    restOfQuery: typeof parsed?.restOfQuery === 'string' ? parsed.restOfQuery : rawQuery
                };
            } catch (e) {
                console.warn('OpenAI location parsing failed, falling back to raw query.', e);
            }
        }
        // Apply deterministic overrides and tuning knobs
        const { overrides, penaltyCities, forceCityExactCity, forceStateAny, forceCityAny, penaltyTerms, strictPenalty } = applyHardcodedLocationOverrides(query || '', queryJson);
        queryJson = overrides;
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
            // Build location OR conditions only when parsed parts are present to satisfy Prisma types
            const locationOr: Prisma.ContactWhereInput[] = [];
            if (location) {
                if (queryJson.city) {
                    locationOr.push(
                        { city: { contains: queryJson.city, mode: caseInsensitiveMode } },
                        { address: { contains: queryJson.city, mode: caseInsensitiveMode } }
                    );
                }
                if (queryJson.state) {
                    locationOr.push(
                        { state: { contains: queryJson.state, mode: caseInsensitiveMode } },
                        { address: { contains: queryJson.state, mode: caseInsensitiveMode } }
                    );
                }
                if (queryJson.country) {
                    locationOr.push(
                        { country: { contains: queryJson.country, mode: caseInsensitiveMode } },
                        { address: { contains: queryJson.country, mode: caseInsensitiveMode } }
                    );
                }
            }

            // If preprocessing hinted an exact city (e.g., Philadelphia strict mode), enforce strict city/state
            const strictLocationAnd: Prisma.ContactWhereInput[] = [];
            if (forceCityExactCity) {
                strictLocationAnd.push({ city: { equals: forceCityExactCity, mode: caseInsensitiveMode } });
            }
            if ((forceCityExactCity || (forceCityAny && forceCityAny.length > 0)) && queryJson.state) {
                if (forceStateAny && forceStateAny.length > 0) {
                    strictLocationAnd.push({ OR: forceStateAny.map((s) => ({ state: { equals: s, mode: caseInsensitiveMode } })) });
                } else {
                    strictLocationAnd.push({ state: { equals: queryJson.state, mode: caseInsensitiveMode } });
                }
            }
            if (forceCityAny && forceCityAny.length > 0) {
                strictLocationAnd.push({ OR: forceCityAny.map((c) => ({ city: { equals: c, mode: caseInsensitiveMode } })) });
            }

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
                    ...(location && locationOr.length > 0 ? [{ OR: locationOr }] : []),
                    // Strict city/state enforcement when we have forceCityExactCity from preprocessing (e.g., Philadelphia)
                    ...(strictLocationAnd.length > 0 ? strictLocationAnd : []),
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
            const effectiveVectorLimit = Math.max(1, Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 200));
            // Protect the vector path with a timeout and fallback to substring search
            const vectorSearchWithTimeout = async () => {
                const timeoutMs = 14000; // keep the UI snappy
                return await Promise.race([
                    searchSimilarContacts(
                        queryJson,
                        effectiveVectorLimit,
                        0.1,
                        effectiveLocationStrategy,
                        { penaltyCities, forceCityExactCity, forceStateAny, forceCityAny, penaltyTerms, strictPenalty }
                    ),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Vector search timed out')), timeoutMs)
                    ),
                ]);
            };

            let vectorSearchResults;
            try {
                vectorSearchResults = await vectorSearchWithTimeout();
            } catch (e) {
                console.warn('Vector search timed out or failed, falling back to substring search.', e);
                const fallback = await substringSearch();
                return apiResponse(fallback);
            }
            // Pre-filter ES matches using post-training to remove academic institutions early
            const prePostProfile = getPostTrainingForQuery(query || '');
            let esMatches = vectorSearchResults.matches;
            if (prePostProfile.active && esMatches.length > 0) {
                const excludeTerms = prePostProfile.excludeTerms.map((t) => t.toLowerCase());
                const includeCompany = (prePostProfile.includeCompanyTerms || []).map((t) => t.toLowerCase());
                const includeTitle = (prePostProfile.includeTitleTerms || []).map((t) => t.toLowerCase());
                const includeWebsite = (prePostProfile.includeWebsiteTerms || []).map((t) => t.toLowerCase());
                const includeIndustry = (prePostProfile.includeIndustryTerms || []).map((t) => t.toLowerCase());

                const containsAny = (text: string | null | undefined, terms: string[]) => {
                    if (!text) return false;
                    const lc = String(text).toLowerCase();
                    return terms.some((t) => lc.includes(t));
                };
                const passesPositive = (md: any) => {
                    if (!prePostProfile.requirePositive) return true;
                    return (
                        containsAny(md.company, includeCompany) ||
                        containsAny(md.title, includeTitle) ||
                        containsAny(md.headline, [...includeCompany, ...includeTitle]) ||
                        containsAny(md.website, includeWebsite) ||
                        containsAny(md.companyIndustry, includeIndustry) ||
                        containsAny(md.metadata, [...includeCompany, ...includeTitle])
                    );
                };
                esMatches = esMatches.filter((m) => {
                    const md: any = m.metadata || {};
                    const excluded =
                        containsAny(md.company, excludeTerms) ||
                        containsAny(md.title, excludeTerms) ||
                        containsAny(md.headline, excludeTerms);
                    if (excluded) return false;
                    return passesPositive(md);
                });
            }
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

            const vectorSearchContactIds = esMatches
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

            // Defensive strict-location enforcement for vector results
            if ((forceCityExactCity || (forceCityAny && forceCityAny.length > 0)) && (queryJson.state || forceStateAny)) {
                const allowedStates = forceStateAny && forceStateAny.length > 0
                    ? new Set(forceStateAny.map((s) => s.toLowerCase()))
                    : (queryJson.state ? new Set([queryJson.state.toLowerCase()]) : new Set<string>());
                const targetCities = forceCityAny && forceCityAny.length > 0 ? new Set(forceCityAny.map((c) => c.toLowerCase())) : (forceCityExactCity ? new Set([forceCityExactCity.toLowerCase()]) : new Set<string>());
                contacts = contacts.filter((c) => {
                    const cityVal = (c.city || '').toLowerCase();
                    const cityOk = targetCities.size === 0 ? true : targetCities.has(cityVal);
                    const stateVal = (c.state || '').toLowerCase();
                    const stateOk = allowedStates.size === 0 ? true : allowedStates.has(stateVal);
                    return cityOk && stateOk;
                });
            }

            // Posttraining step: exclude/demote and require positive venue signals when applicable
            const postProfile = getPostTrainingForQuery(query || '');
            if (postProfile.active && contacts.length > 0) {
                const excludeTerms = postProfile.excludeTerms.map((t) => t.toLowerCase());
                const demoteTerms = postProfile.demoteTerms.map((t) => t.toLowerCase());
                const includeCompany = (postProfile.includeCompanyTerms || []).map((t) => t.toLowerCase());
                const includeTitle = (postProfile.includeTitleTerms || []).map((t) => t.toLowerCase());
                const includeWebsite = (postProfile.includeWebsiteTerms || []).map((t) => t.toLowerCase());
                const includeIndustry = (postProfile.includeIndustryTerms || []).map((t) => t.toLowerCase());

                const containsAny = (text: string | null | undefined, terms: string[]) => {
                    if (!text) return false;
                    const lc = text.toLowerCase();
                    return terms.some((t) => lc.includes(t));
                };
                const passesPositive = (c: Contact) => {
                    if (!postProfile.requirePositive) return true;
                    return (
                        containsAny(c.company, includeCompany) ||
                        containsAny(c.title, includeTitle) ||
                        containsAny(c.headline as any, [...includeCompany, ...includeTitle]) ||
                        containsAny(c.website as any, includeWebsite) ||
                        containsAny(c.companyIndustry as any, includeIndustry) ||
                        containsAny(c.metadata as any, [...includeCompany, ...includeTitle])
                    );
                };

                // Exclude (hard if strictExclude=true), then require positive signals if configured
                let filtered = contacts;
                if (postProfile.strictExclude) {
                    filtered = filtered.filter(
                        (c) =>
                            !containsAny(c.company, excludeTerms) &&
                            !containsAny(c.title, excludeTerms) &&
                            !containsAny(c.headline as any, excludeTerms)
                    );
                }
                if (postProfile.requirePositive) {
                    filtered = filtered.filter(passesPositive);
                }

                // If exclusion removed too many (e.g., fewer than limit), fill with demoted ones that also pass positives (if required)
                const finalLimit = limit ?? 100;
                if (filtered.length < finalLimit) {
                    const demoted = contacts.filter(
                        (c) =>
                            (containsAny(c.company, demoteTerms) ||
                                containsAny(c.title, demoteTerms) ||
                                containsAny(c.headline as any, demoteTerms)) &&
                            passesPositive(c)
                    );
                    filtered = [...filtered, ...demoted].slice(0, finalLimit);
                }

                contacts = filtered;
            }

			// Fallback: if local Postgres doesn't have these contacts, return minimal data from Elasticsearch directly
			if (!contacts || contacts.length === 0) {
				const fallbackContacts = esMatches.map((match) => {
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

			// Apply post-training filters for substring search as well
			const postProfile = getPostTrainingForQuery(query || '');
			if (postProfile.active && contacts.length > 0) {
				const excludeTerms = postProfile.excludeTerms.map((t) => t.toLowerCase());
				const demoteTerms = postProfile.demoteTerms.map((t) => t.toLowerCase());

				const containsAny = (text: string | null | undefined, terms: string[]) => {
					if (!text) return false;
					const lc = text.toLowerCase();
					return terms.some((t) => lc.includes(t));
				};

				let filtered = contacts;
				if (postProfile.strictExclude) {
					filtered = contacts.filter(
						(c) =>
							!containsAny(c.company, excludeTerms) &&
							!containsAny(c.title, excludeTerms) &&
							!containsAny(c.headline as any, excludeTerms)
					);
				}

				const finalLimit = limit ?? 100;
				if (filtered.length < finalLimit) {
					const demoted = contacts.filter(
						(c) =>
							containsAny(c.company, demoteTerms) ||
							containsAny(c.title, demoteTerms) ||
							containsAny(c.headline as any, demoteTerms)
					);
					filtered = [...filtered, ...demoted].slice(0, finalLimit);
				}

				contacts = filtered;
			}

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
