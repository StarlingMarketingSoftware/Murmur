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
	connectOrDisconnectId,
} from '@/app/api/_utils';
import { DraftingMode, DraftingTone, HybridBlock, Status } from '@prisma/client';
import { ApiRouteParams } from '@/types';
import { NextRequest } from 'next/server';

import { z } from 'zod';

const patchCampaignSchema = z.object({
	name: z.string().optional(),
	draftingMode: z.nativeEnum(DraftingMode).optional(),
	draftingTone: z.nativeEnum(DraftingTone).optional(),
	paragraphs: z.number().min(0).max(5).optional(),
	isAiSubject: z.boolean().optional(),
	subject: z.string().nullable().optional(),
	fullAiPrompt: z.string().nullable().optional(),
	hybridAvailableBlocks: z.array(z.nativeEnum(HybridBlock)).optional(),
	hybridPrompt: z.string().nullable().optional(),
	hybridBlockPrompts: z
		.array(
			z.object({
				id: z.string(),
				type: z.nativeEnum(HybridBlock),
				value: z.string(),
			})
		)
		.optional(),
	handwrittenPrompt: z.string().nullable().optional(),
	testSubject: z.string().nullable().optional(),
	testMessage: z.string().nullable().optional(),
	font: z.string().optional(),
	signatureId: z.number().optional().nullable(),
	identityId: z.number().optional().nullable(),
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
				signature: true,
				contactLists: true,
				identity: true,
				userContactLists: true,
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

		const { signatureId, identityId, contactOperation, ...updateData } =
			validatedData.data;

		const updatedCampaign = await prisma.campaign.update({
			where: {
				id: Number(id),
				userId,
			},
			data: {
				...updateData,
				signature: connectOrDisconnectId(signatureId),
				identity: connectOrDisconnectId(identityId),
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
