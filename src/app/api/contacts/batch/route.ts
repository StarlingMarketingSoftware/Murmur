import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiCreated,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';

const batchCreateContactSchema = z.object({
	contacts: z.array(
		z.object({
			firstname: z.string().optional().nullable(),
			lastname: z.string().optional().nullable(),
			email: z.string(),
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

		// Remove duplicate email addresses, keeping only the first occurrence of each email
		const uniqueContacts = contacts.filter((contact, index, arr) => {
			return (
				arr.findIndex((c) => c.email.toLowerCase() === contact.email.toLowerCase()) ===
				index
			);
		});

		const duplicatesRemoved = contacts.length - uniqueContacts.length;

		const result = await prisma.$transaction(async (prisma) => {
			const existingContacts = await prisma.contact.findMany({
				where: {
					AND: [
						{
							email: {
								in: uniqueContacts.map((c) => c.email),
							},
						},
						{
							contactListId,
						},
					],
				},
			});

			const existingEmails = new Set(existingContacts.map((c) => c.email));
			const newContacts = uniqueContacts.filter(
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
				skipped: uniqueContacts.length - results.count,
				duplicatesRemoved,
				skippedEmails: uniqueContacts
					.filter((contact) => existingEmails.has(contact.email))
					.map((contact) => contact.email),
			};
		});

		return apiCreated(result);
	} catch (error) {
		return handleApiError(error);
	}
}
