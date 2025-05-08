import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { apiCreated, apiUnauthorized, handleApiError } from '@/app/utils/api';

const createContactSchema = z.object({
	name: z.string().optional(),
	email: z.string().email('Invalid email address'),
	company: z.string().optional(),
	website: z.string().url().optional().nullable(),
	state: z.string().optional(),
	country: z.string().optional(),
	phone: z.string().optional(),
	contactListId: z.number().optional(),
});

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = createContactSchema.parse(body);

		const { contactListId, ...contactData } = validatedData;

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
