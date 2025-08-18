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
	hybridAvailableBlocks: z.array(z.nativeEnum(HybridBlock)).nullable().optional(),
	hybridPrompt: z.string().nullable().optional(),
	hybridBlockPrompts: z
		.array(
			z.object({
				id: z.string(),
				type: z.nativeEnum(HybridBlock),
				value: z.string(),
			})
		)
		.nullable()
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
	userContactListOperation: z
		.object({
			action: z.enum(['connect', 'disconnect']),
			userContactListIds: z.array(z.number()),
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
		console.log('PATCH /api/campaigns/[id] - Request body:', body);
		console.log('PATCH /api/campaigns/[id] - Campaign ID:', id);
		console.log('PATCH /api/campaigns/[id] - User ID:', userId);
		
		const validatedData = patchCampaignSchema.safeParse(body);
		if (!validatedData.success) {
			console.log('PATCH /api/campaigns/[id] - Validation error:', validatedData.error);
			return apiBadRequest(validatedData.error);
		}
		const {
			signatureId,
			identityId,
			contactOperation,
			userContactListOperation,
			hybridAvailableBlocks,
			hybridBlockPrompts,
			...updateData
		} = validatedData.data;
		
		console.log('PATCH /api/campaigns/[id] - Extracted identityId:', identityId);
		console.log('PATCH /api/campaigns/[id] - connectOrDisconnectId result:', connectOrDisconnectId(identityId));

		// Verify that the identity belongs to the current user
		if (identityId) {
			const identity = await prisma.identity.findUnique({
				where: { id: identityId },
			});
			
			if (!identity) {
				console.log('PATCH /api/campaigns/[id] - Identity not found:', identityId);
				return apiBadRequest('Identity not found');
			}
			
			if (identity.userId !== userId) {
				console.log('PATCH /api/campaigns/[id] - Identity does not belong to user. Identity userId:', identity.userId, 'Current userId:', userId);
				return apiUnauthorized('You do not have permission to use this identity');
			}
			
			console.log('PATCH /api/campaigns/[id] - Identity ownership verified');
		}

		const updatePayload = {
			...updateData,
			// Handle null values for array fields - convert null to undefined to omit the field
			...(hybridAvailableBlocks !== null && { hybridAvailableBlocks }),
			...(hybridBlockPrompts !== null && { hybridBlockPrompts }),
			signature: connectOrDisconnectId(signatureId),
			identity: connectOrDisconnectId(identityId),
			...(contactOperation && {
				contacts: {
					[contactOperation.action]: contactOperation.contactIds.map((id: number) => {
						return { id };
					}),
				},
			}),
			...(userContactListOperation && {
				userContactLists: {
					[userContactListOperation.action]:
						userContactListOperation.userContactListIds.map((id: number) => {
							return { id };
						}),
				},
			}),
		};
		
		console.log('PATCH /api/campaigns/[id] - Update payload:', JSON.stringify(updatePayload, null, 2));
		
		const updatedCampaign = await prisma.campaign.update({
			where: {
				id: Number(id),
				userId,
			},
			data: updatePayload,
			include: {
				contacts: true,
				userContactLists: true,
			},
		});
		
		console.log('PATCH /api/campaigns/[id] - Update successful');

		return apiResponse(updatedCampaign);
	} catch (error) {
		console.error('PATCH /api/campaigns/[id] - Error:', error);
		console.error('PATCH /api/campaigns/[id] - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
