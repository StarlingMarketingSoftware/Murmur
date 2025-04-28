import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Input validation schema for creating a contact
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
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await req.json();
		const validatedData = createContactSchema.parse(body);

		// Destructure contactListId from the validated data
		const { contactListId, ...contactData } = validatedData;

		const contact = await prisma.contact.create({
			data: {
				...contactData,
				contactList: contactListId ? { connect: { id: contactListId } } : undefined,
			},
		});

		return NextResponse.json(contact, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: `Validation error: ${error.message}` },
				{ status: 400 }
			);
		}
		console.error('CONTACT_CREATE_ERROR:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
