import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Input validation schema for updating a contact list
const updateContactListSchema = z.object({
	name: z.string().min(1, 'Name is required').optional(),
	count: z.number().optional(),
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
		const validatedData = updateContactListSchema.parse(body);

		const existingList = await prisma.contactList.findFirst({
			where: {
				id: parseInt(id),
			},
		});

		if (!existingList) {
			return NextResponse.json({ error: 'Contact list not found.' }, { status: 404 });
		}

		// Update the contact list with validated data
		const updatedContactList = await prisma.contactList.update({
			where: {
				id: parseInt(id),
			},
			data: {
				...(validatedData.name !== undefined && { name: validatedData.name }),
				...(validatedData.count !== undefined && { count: validatedData.count }),
			},
			include: {
				contacts: true,
			},
		});

		return NextResponse.json(updatedContactList);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: `Validation error: ${error.message}` },
				{ status: 400 }
			);
		}
		console.error('CONTACT_LIST_UPDATE_ERROR:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await params;

	try {
		const contactList = await prisma.contactList.findFirst({
			where: {
				id: parseInt(id),
			},
			include: {
				contacts: true,
			},
		});

		if (!contactList) {
			return NextResponse.json({ error: 'Contact list not found.' }, { status: 404 });
		}

		return NextResponse.json(contactList);
	} catch (error) {
		console.error('GET_CONTACT_LIST_ERROR:', error);
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
		// Validate that the contact list exists and belongs to the user
		const existingList = await prisma.contactList.findFirst({
			where: {
				id: parseInt(id),
			},
		});

		if (!existingList) {
			return NextResponse.json({ error: 'Contact list not found.' }, { status: 404 });
		}

		// Delete the contact list
		await prisma.contactList.delete({
			where: {
				id: parseInt(id),
			},
		});

		return NextResponse.json({
			success: true,
			message: 'Contact list deleted successfully.',
		});
	} catch (error) {
		console.error('CONTACT_LIST_DELETE_ERROR:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
