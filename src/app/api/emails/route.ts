import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiCreated,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/utils/api';

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
				...(campaignId && { campaignId: parseInt(campaignId, 10) }),
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

const createEmailSchema = z.object({
	subject: z.string().min(1, 'Subject is required'),
	message: z.string().min(1, 'Message is required'),
	campaignId: z.number().int().positive('Campaign ID is required'),
	status: z.enum(['draft', 'scheduled', 'sent', 'failed']).default('draft'),
	sentAt: z.string().datetime().nullable().optional(),
	contactId: z.number().int().positive('Contact ID is required'),
});

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = createEmailSchema.parse(body);

		const campaign = await prisma.campaign.findUnique({
			where: {
				id: validatedData.campaignId,
				userId,
			},
		});

		if (!campaign) {
			return apiNotFound();
		}

		if (campaign.userId !== userId) {
			return apiUnauthorizedResource();
		}

		const email = await prisma.email.create({
			data: {
				subject: validatedData.subject,
				message: validatedData.message,
				status: validatedData.status,
				sentAt: validatedData.sentAt ? new Date(validatedData.sentAt) : null,
				userId,
				campaignId: validatedData.campaignId,
				contactId: validatedData.contactId,
			},
		});

		return apiCreated(email);
	} catch (error) {
		return handleApiError(error);
	}
}
