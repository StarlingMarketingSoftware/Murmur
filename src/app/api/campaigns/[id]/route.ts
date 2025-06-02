import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiNoContent,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/api/_utils';
import { AiModel, Status } from '@prisma/client';
import { ApiRouteParams } from '@/types';
import { NextRequest } from 'next/server';

import { z } from 'zod';

const patchCampaignSchema = z.object({
	name: z.string().optional(),
	subject: z.string().nullable().optional(),
	message: z.string().nullable().optional(),
	testSubject: z.string().nullable().optional(),
	testMessage: z.string().nullable().optional(),
	senderEmail: z.string().nullable().optional(),
	senderName: z.string().nullable().optional(),
	aiModel: z.nativeEnum(AiModel).nullable().optional(),
	font: z.string().optional(),
	signatureId: z.number().optional().nullable(),
	contactOperation: z
		.object({
			action: z.enum(['connect', 'disconnect']),
			contactIds: z.array(z.number()),
		})
		.optional(),
});
export type PatchCampaignData = z.infer<typeof patchCampaignSchema>;

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const campaign = await prisma.campaign.findUniqueOrThrow({
			where: {
				id: Number(id),
				userId,
			},
			include: {
				contacts: true,
				emails: true,
				signature: true,
			},
		});

		return apiResponse(campaign);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function PATCH(req: Request, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;

		const body = await req.json();
		const validatedData = patchCampaignSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { signatureId, contactOperation, ...updateData } = validatedData.data;

		const updatedCampaign = await prisma.campaign.update({
			where: {
				id: Number(id),
				userId,
			},
			data: {
				...updateData,
				signature:
					signatureId === undefined
						? undefined
						: signatureId === null
						? { disconnect: true }
						: { connect: { id: signatureId } },
				...(contactOperation && {
					contacts: {
						[contactOperation.action]: contactOperation.contactIds.map((id: number) => {
							return { id };
						}),
					},
				}),
			},
			include: {
				contacts: true,
			},
		});

		return apiResponse(updatedCampaign);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function DELETE(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const campaign = await prisma.campaign.findUnique({
			where: {
				id: Number(id),
			},
		});

		if (!campaign) {
			return apiNotFound();
		}

		if (campaign.userId !== userId) {
			return apiUnauthorizedResource();
		}

		await prisma.campaign.update({
			where: {
				id: Number(id),
			},
			data: {
				status: Status.deleted,
			},
		});

		return apiNoContent();
	} catch (error) {
		return handleApiError(error);
	}
}
