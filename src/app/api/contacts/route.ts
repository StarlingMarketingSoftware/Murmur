import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { getValidatedParamsFromUrl } from '@/utils';
import { Contact, EmailVerificationStatus, Prisma } from '@prisma/client';
import { searchSimilarContacts, upsertContactToVectorDb } from '../_utils/vectorDb';

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
										{ city: { contains: location, mode: caseInsensitiveMode } },
										{ state: { contains: location, mode: caseInsensitiveMode } },
										{ country: { contains: location, mode: caseInsensitiveMode } },
										{ address: { contains: location, mode: caseInsensitiveMode } },
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
			const results = await searchSimilarContacts(query, VECTOR_SEARCH_LIMIT, 0.65);

			// Create a map of contactId to relevance score for efficient lookup
			const relevanceMap = new Map<number, number>();
			results.matches.forEach((match, index) => {
				const contactId = Number((match.metadata as { contactId: number }).contactId);
				// Use the actual score from vector search, or fall back to rank-based scoring
				const relevanceScore = match.score || 1 - index / results.matches.length;
				relevanceMap.set(contactId, relevanceScore);
			});

			const contactIds = results.matches.map((match) =>
				Number((match.metadata as { contactId: number }).contactId)
			);

			contacts = await prisma.contact.findMany({
				where: {
					id: {
						in: contactIds,
						notIn: addedContactIds,
					},
					emailValidationStatus: verificationStatus
						? {
								equals: verificationStatus,
						  }
						: undefined,
					// Location filtering across multiple fields
					...(location && {
						OR: [
							{ city: { contains: location, mode: 'insensitive' } },
							{ state: { contains: location, mode: 'insensitive' } },
							{ country: { contains: location, mode: 'insensitive' } },
							{ address: { contains: location, mode: 'insensitive' } },
						],
					}),
				},
				orderBy: {
					company: 'asc',
				},
			});

			if (contacts.length < 100) {
				const fallbackContacts = await substringSearch();

				// Create a set of existing contact IDs for efficient lookup
				const existingContactIds = new Set(contacts.map((contact) => contact.id));

				// Filter out duplicates from fallback contacts
				const uniqueFallbackContacts = fallbackContacts.filter(
					(contact) => !existingContactIds.has(contact.id)
				);

				// Merge contacts with unique fallback contacts
				contacts = [...contacts, ...uniqueFallbackContacts];
			}

			// Implement balanced sorting combining relevance and userContactListCount
			const maxUserContactListCount = Math.max(
				...contacts.map((c) => c.userContactListCount),
				1
			);

			contacts.sort((a, b) => {
				const aRelevance = relevanceMap.get(a.id) || 0;
				const bRelevance = relevanceMap.get(b.id) || 0;

				// Normalize userContactListCount (invert so lower count = higher score)
				const aCountScore = 1 - a.userContactListCount / maxUserContactListCount;
				const bCountScore = 1 - b.userContactListCount / maxUserContactListCount;

				// Weighted combination (70% relevance, 30% userContactListCount)
				const aCompositeScore = 0.7 * aRelevance + 0.3 * aCountScore;
				const bCompositeScore = 0.7 * bRelevance + 0.3 * bCountScore;

				// Sort by composite score (descending - higher score first)
				return bCompositeScore - aCompositeScore;
			});

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
