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
import { EmailVerificationStatus } from '@prisma/client';

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
	contactListId: z.union([z.string(), z.number()]).optional(),
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
		const { contactListId } = validatedFilters.data;

		const contacts = await prisma.contact.findMany({
			where: {
				contactListId: Number(contactListId),
				emailValidationStatus: {
					equals: EmailVerificationStatus.valid,
				},
			},
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
