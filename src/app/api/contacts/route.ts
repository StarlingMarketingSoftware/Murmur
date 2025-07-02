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
import { Contact, EmailVerificationStatus } from '@prisma/client';
import { searchSimilarContacts, upsertContactToVectorDb } from '../_utils/vectorDb';

const createContactSchema = z.object({
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	email: z.string().email(),
	company: z.string().optional(),
	website: z.string().url().optional().nullable(),
	state: z.string().optional(),
	country: z.string().optional(),
	phone: z.string().optional(),
	contactListId: z.coerce.number().optional(),
});

const contactFilterSchema = z.object({
	query: z.string().optional(),
	limit: z.coerce.number().optional(),
	verificationStatus: z.nativeEnum(EmailVerificationStatus).optional(),
	contactListIds: z.array(z.number()).optional(),
	useVectorSearch: z.boolean().optional(),
});

export type PostContactData = z.infer<typeof createContactSchema>;
export type ContactFilterData = z.infer<typeof contactFilterSchema>;

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
		const { contactListIds, verificationStatus, query, limit, useVectorSearch } =
			validatedFilters.data;

		const numberContactListIds: number[] =
			contactListIds?.map((id) => Number(id)).filter((id) => !isNaN(id)) || [];

		let contacts: Contact[] = [];

		// if it's a search by ContactListId, only filter by this ContactList.id and validation status
		if (numberContactListIds.length > 0) {
			contacts = await prisma.contact.findMany({
				where: {
					contactListId: {
						in: numberContactListIds,
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
			const results = await searchSimilarContacts(query, limit, 0.7);
			const contactIds = results.matches.map((match) =>
				Number((match.metadata as { contactId: number }).contactId)
			);

			contacts = await prisma.contact.findMany({
				where: {
					id: {
						in: contactIds,
					},
					emailValidationStatus: verificationStatus
						? {
								equals: verificationStatus,
						  }
						: undefined,
				},
				orderBy: {
					company: 'asc',
				},
			});

			// Sort contacts to match the order from vector search
			contacts.sort((a, b) => {
				const aIndex = contactIds.indexOf(a.id);
				const bIndex = contactIds.indexOf(b.id);
				return aIndex - bIndex;
			});

			return apiResponse(contacts);
		}

		// Fallback to regular search if vector search is not enabled
		const searchTerms: string[] =
			query
				?.toLowerCase()
				.split(/\s+/)
				.filter((term) => term.length > 0) || [];
		const caseInsensitiveMode = 'insensitive' as const;
		const whereConditions =
			searchTerms.length > 0
				? {
						AND: [
							// Each search term must match at least one field
							...searchTerms.map((term) => ({
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
							// AND email validation status must be valid
							{ emailValidationStatus: { equals: verificationStatus } },
						],
				  }
				: {};

		contacts = await prisma.contact.findMany({
			where: whereConditions,
			take: limit,
			orderBy: {
				company: 'asc',
			},
		});

		return apiResponse(contacts);
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

		const { contactListId, ...contactData } = validatedData.data;
		const contact = await prisma.contact.create({
			data: {
				...contactData,
				contactList: contactListId ? { connect: { id: contactListId } } : undefined,
			},
		});

		// Store contact vector in
		await upsertContactToVectorDb(contact);

		return apiResponse(contact);
	} catch (error) {
		return handleApiError(error);
	}
}
