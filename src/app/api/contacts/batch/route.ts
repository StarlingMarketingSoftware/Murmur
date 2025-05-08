import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { apiCreated, apiUnauthorized, handleApiError } from '@/app/utils/api';

const batchCreateContactSchema = z.object({
	contacts: z.array(
		z.object({
			name: z.string().optional(),
			email: z.string().email('Invalid email address'),
			company: z.string().optional(),
			website: z.string().optional().nullable(),
			state: z.string().optional(),
			country: z.string().optional(),
			phone: z.string().optional(),
		})
	),
	contactListId: z.number().optional(),
});

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const { contacts, contactListId } = batchCreateContactSchema.parse(body);

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
							contactListId: contactListId,
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
					contactListId: contactListId,
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
