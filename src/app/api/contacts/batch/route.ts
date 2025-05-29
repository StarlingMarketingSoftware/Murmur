import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiCreated,
	apiUnauthorized,
	handleApiError,
} from '@/app/utils/api';

const batchCreateContactSchema = z.object({
	contacts: z.array(
		z.object({
			name: z.string().optional().nullable(),
			email: z.string().email(),
			company: z.string().optional().nullable(),
			website: z.string().optional().nullable(),
			state: z.string().optional().nullable(),
			country: z.string().optional().nullable(),
			phone: z.string().optional().nullable(),
		})
	),
	contactListId: z.number().optional(),
});
export type PostBatchContactData = z.infer<typeof batchCreateContactSchema>;

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await req.json();
		const validatedData = batchCreateContactSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { contacts, contactListId } = validatedData.data;

		const result = await prisma.$transaction(async (prisma) => {
			const existingContacts = await prisma.contact.findMany({
				where: {
					AND: [
						{
							email: {
								in: contacts.map((c) => c.email),
							},
						},
						{
							contactListId,
						},
					],
				},
			});

			const existingEmails = new Set(existingContacts.map((c) => c.email));
			const newContacts = contacts.filter(
				(contact) => !existingEmails.has(contact.email)
			);
			const results = await prisma.contact.createMany({
				data: newContacts.map((contact) => ({
					...contact,
					contactListId,
				})),
			});

			return {
				created: results.count,
				skipped: contacts.length - results.count,
				skippedEmails: contacts
					.filter((contact) => existingEmails.has(contact.email))
					.map((contact) => contact.email),
			};
		});

		return apiCreated(result);
	} catch (error) {
		return handleApiError(error);
	}
}
