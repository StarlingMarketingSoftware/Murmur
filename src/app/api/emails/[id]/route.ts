import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Input validation schema for updating an email
const updateEmailSchema = z.object({
	subject: z.string().min(1, 'Subject is required').optional(),
	message: z.string().min(1, 'Message is required').optional(),
	status: z.enum(['draft', 'scheduled', 'sent', 'failed']).optional(),
	sentAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await params;

	try {
		// Validate that the email exists and belongs to the user
		const existingEmail = await prisma.email.findUnique({
			where: {
				id: parseInt(id),
				userId,
			},
		});

		if (!existingEmail) {
			return NextResponse.json(
				{ error: 'Email not found or unauthorized' },
				{ status: 404 }
			);
		}

		const body = await req.json();
		const validatedData = updateEmailSchema.parse(body);

		// Update the email with validated data
		const updatedEmail = await prisma.email.update({
			where: {
				id: parseInt(id),
			},
			data: {
				...(validatedData.subject !== undefined && { subject: validatedData.subject }),
				...(validatedData.message !== undefined && { message: validatedData.message }),
				...(validatedData.status !== undefined && { status: validatedData.status }),
				...(validatedData.sentAt !== undefined && {
					sentAt: validatedData.sentAt ? new Date(validatedData.sentAt) : null,
				}),
			},
			include: {
				contact: true,
			},
		});

		return NextResponse.json(updatedEmail);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: `Validation error: ${error.message}` },
				{ status: 400 }
			);
		}
		console.error('EMAIL_UPDATE_ERROR:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = params;

	try {
		const email = await prisma.email.findUnique({
			where: {
				id: parseInt(id),
				userId,
			},
			include: {
				contact: true,
			},
		});

		if (!email) {
			return NextResponse.json(
				{ error: 'Email not found or unauthorized' },
				{ status: 404 }
			);
		}

		return NextResponse.json(email);
	} catch (error) {
		console.error('GET_EMAIL_ERROR:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = params;

	try {
		// Validate that the email exists and belongs to the user
		const existingEmail = await prisma.email.findUnique({
			where: {
				id: parseInt(id),
				userId,
			},
		});

		if (!existingEmail) {
			return NextResponse.json(
				{ error: 'Email not found or unauthorized' },
				{ status: 404 }
			);
		}

		// Delete the email
		await prisma.email.delete({
			where: {
				id: parseInt(id),
			},
		});

		return NextResponse.json({ success: true, message: 'Email deleted successfully' });
	} catch (error) {
		console.error('EMAIL_DELETE_ERROR:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
