import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Input validation schema for updating a contact
const updateContactSchema = z.object({
	name: z.string().optional(),
	email: z.string().email('Invalid email address').optional(),
	company: z.string().optional(),
	website: z.string().optional(),
	state: z.string().optional(),
	country: z.string().optional(),
	phone: z.string().optional(),
});

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await params;

	try {
		const body = await req.json();
		const validatedData = updateContactSchema.parse(body);

		// Update the contact with validated data
		const updatedContact = await prisma.contact.update({
			where: {
				id: parseInt(id),
			},
			data: validatedData,
		});

		return NextResponse.json(updatedContact);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: `Validation error: ${error.message}` },
				{ status: 400 }
			);
		}
		console.error('CONTACT_UPDATE_ERROR:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await params;

	try {
		// Validate that the contact exists
		const existingContact = await prisma.contact.findUnique({
			where: {
				id: parseInt(id),
			},
		});

		if (!existingContact) {
			return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
		}

		// Delete the contact
		await prisma.contact.delete({
			where: {
				id: parseInt(id),
			},
		});

		return NextResponse.json({ success: true, message: 'Contact deleted successfully' });
	} catch (error) {
		console.error('CONTACT_DELETE_ERROR:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
