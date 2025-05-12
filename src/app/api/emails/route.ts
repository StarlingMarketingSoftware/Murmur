import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiCreated,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/utils/api';
import { EmailStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const url = new URL(req.url);
		const campaignId = url.searchParams.get('campaignId');

		const emails = await prisma.email.findMany({
			where: {
				userId,
				...(campaignId && { campaignId: Number(campaignId) }),
			},
			include: {
				contact: true,
			},
			orderBy: {
				createdAt: 'desc' as const,
			},
		});

		return apiResponse(emails);
	} catch (error) {
		return handleApiError(error);
	}
}

const postEmailSchema = z.object({
	subject: z.string().min(1),
	message: z.string().min(1),
	campaignId: z.number().int().positive(),
	status: z.nativeEnum(EmailStatus).default(EmailStatus.draft),
	sentAt: z.string().datetime().nullable().optional(),
	contactId: z.number().int().positive(),
});
export type PostEmailData = z.infer<typeof postEmailSchema>;

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = postEmailSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const campaign = await prisma.campaign.findUnique({
			where: {
				id: validatedData.data.campaignId,
			},
		});

		if (!campaign) {
			return apiNotFound();
		}

		if (campaign.userId !== userId) {
			return apiUnauthorizedResource();
		}

		const email = await prisma.email.create({
			data: { ...validatedData.data, userId },
		});

		return apiCreated(email);
	} catch (error) {
		return handleApiError(error);
	}
}
