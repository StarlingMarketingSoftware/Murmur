import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

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
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await req.json();
		const { contacts, contactListId } = batchCreateContactSchema.parse(body);

		const result = await prisma.$transaction(async (prisma) => {
			// First, find existing contacts that would violate the constraint
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

			// Get list of emails that already exist
			const existingEmails = new Set(existingContacts.map((c) => c.email));

			// Filter out contacts that would violate the constraint
			const newContacts = contacts.filter(
				(contact) => !existingEmails.has(contact.email)
			);

			// Create the filtered contacts
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

		return NextResponse.json(result, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: `Validation error: ${error.message}` },
				{ status: 400 }
			);
		}
		console.error('BATCH_CONTACT_CREATE_ERROR:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
