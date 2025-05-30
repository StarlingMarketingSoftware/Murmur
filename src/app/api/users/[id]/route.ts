import { User } from '@prisma/client';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/utils/api';
import { ApiRouteParams } from '@/types';
import { NextRequest } from 'next/server';

const patchUserSchema = z.object({
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
export type PatchUserData = z.infer<typeof patchUserSchema>;

export const GET = async function GET(
	req: NextRequest,
	{ params }: { params: ApiRouteParams }
) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;

		const user: User = await prisma.user.findUniqueOrThrow({
			where: {
				clerkId: id,
			},
		});

		return apiResponse(user);
	} catch (error) {
		return handleApiError(error);
	}
};

export const PATCH = async function PATCH(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await request.json();
		const validatedData = patchUserSchema.safeParse(data);

		if (!validatedData.success) {
			return apiBadRequest();
		}

		const updatedUser = await prisma.user.update({
			where: { clerkId: userId },
			data: validatedData.data,
		});

		return apiResponse(updatedUser);
	} catch (error) {
		return handleApiError(error);
	}
};
