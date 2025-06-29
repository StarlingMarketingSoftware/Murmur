import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiCreated,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { getValidatedParamsFromUrl } from '@/utils';
import { Contact, EmailVerificationStatus } from '@prisma/client';

const createContactSchema = z.object({
	name: z.string().optional(),
	email: z.string().email(),
	company: z.string().optional(),
	website: z.string().url().optional().nullable(),
	state: z.string().optional(),
	country: z.string().optional(),
	phone: z.string().optional(),
	contactListId: z.coerce.number().optional(),
});

const contactFilterSchema = z.object({
	query: z.string(),
	limit: z.coerce.number().optional(),
	verificationStatus: z.nativeEnum(EmailVerificationStatus).optional(),
	contactListIds: z.array(z.number()).optional(),
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
		const { contactListIds, verificationStatus, query, limit } = validatedFilters.data;

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

		// if it's a search by query, filter by query and validation status

		const searchTerms: string[] = query
			.toLowerCase()
			.split(/\s+/)
			.filter((term) => term.length > 0);
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
							{ emailValidationStatus: { equals: EmailVerificationStatus.valid } },
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

		return apiCreated(contact);
	} catch (error) {
		return handleApiError(error);
	}
}
