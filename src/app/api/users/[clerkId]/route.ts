import { NextResponse } from 'next/server';
import { User } from '@prisma/client';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateUserSchema = z.object({
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	aiDraftCredits: z.number().int().optional(),
	aiTestCredits: z.number().int().optional(),
	stripeCustomerId: z.string().optional().nullable(),
	stripeSubscriptionId: z.string().optional().nullable(),
	stripeSubscriptionStatus: z.string().optional().nullable(),
	stripePriceId: z.string().optional().nullable(),
	emailSendCredits: z.number().int().optional(),
});

export const GET = async function GET(
	request: Request,
	{ params }: { params: { clerkId: string } }
) {
	try {
		const { clerkId } = await params;

		const user: User = await prisma.user.findUniqueOrThrow({
			where: {
				clerkId: clerkId,
			},
		});

		return NextResponse.json(user);
	} catch {
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}
};

export const PATCH = async function PATCH(
	request: Request,
	{ params }: { params: { clerkId: string } }
) {
	try {
		const { clerkId } = await params;
		const data = await request.json();

		// Validate the input data
		const validatedData = updateUserSchema.safeParse(data);

		if (!validatedData.success) {
			return NextResponse.json(
				{ error: 'Invalid input', details: validatedData.error.format() },
				{ status: 400 }
			);
		}

		const updatedUser = await prisma.user.update({
			where: { clerkId },
			data: validatedData.data,
		});

		return NextResponse.json(updatedUser);
	} catch {
		return NextResponse.json({ error: 'Failed to update user' }, { status: 400 });
	}
};
