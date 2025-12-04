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
} from '@/app/api/_utils';
import { EmailStatus } from '@prisma/client';
import { getValidatedParamsFromUrl } from '@/utils';

const postSingleEmailSchema = z.object({
	subject: z.string().min(1),
	message: z.string().min(1),
	campaignId: z.number().int().positive(),
	status: z.nativeEnum(EmailStatus).default(EmailStatus.draft),
	sentAt: z.string().datetime().nullable().optional(),
	contactId: z.number().int().positive(),
});

const postEmailSchema = z.union([postSingleEmailSchema, z.array(postSingleEmailSchema)]);

const emailFilterSchema = z.object({
	campaignId: z.union([z.string(), z.number()]).optional(),
	status: z.nativeEnum(EmailStatus).optional(),
});
export type PostEmailData = z.infer<typeof postEmailSchema>;

export type EmailFilterData = z.infer<typeof emailFilterSchema>;

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const validatedFilters = getValidatedParamsFromUrl(req.url, emailFilterSchema);

		if (!validatedFilters.success) {
			return apiBadRequest(validatedFilters.error);
		}
		const { campaignId, status } = validatedFilters.data;

		const emails = await prisma.email.findMany({
			where: {
				userId,
				campaignId: Number(campaignId),
				...(status && { status }),
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

		// Normalize to array format for consistent processing
		const emailsArray = Array.isArray(validatedData.data)
			? validatedData.data
			: [validatedData.data];

		const campaignId = emailsArray[0].campaignId;
		const campaign = await prisma.campaign.findUnique({
			where: { id: campaignId },
		});

		if (!campaign) {
			return apiNotFound();
		}

		if (campaign.userId !== userId) {
			return apiUnauthorizedResource();
		}

		if (emailsArray.length === 1) {
			const email = await prisma.email.create({
				data: { ...emailsArray[0], userId },
			});
			return apiCreated(email);
		} else {
			const createdEmails = await prisma.email.createMany({
				data: emailsArray.map((email) => ({
					...email,
					userId,
				})),
				skipDuplicates: true,
			});

			return apiCreated({
				count: createdEmails.count,
				message: `Successfully created ${createdEmails.count} emails`,
			});
		}
	} catch (error) {
		return handleApiError(error);
	}
}
