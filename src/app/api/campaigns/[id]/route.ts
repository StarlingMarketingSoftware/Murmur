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
import { DraftingTone, HybridBlock, Prisma, Status } from '@prisma/client';
import { ApiRouteParams } from '@/types';
import { NextRequest } from 'next/server';

import { z } from 'zod';

const getCampaignContactsCount = async (campaignId: number) => {
	return prisma.contact.count({
		where: {
			OR: [
				{ campaigns: { some: { id: campaignId } } },
				{ userContactLists: { some: { campaigns: { some: { id: campaignId } } } } },
				{ contactList: { campaigns: { some: { id: campaignId } } } },
			],
		},
	});
};

const safeInsertCampaignContactEvent = async (args: {
	campaignId: number;
	createdAt: Date;
	addedCount: number;
	totalContacts: number;
	source: string;
}) => {
	try {
		await prisma.$executeRaw(Prisma.sql`
			INSERT INTO "CampaignContactEvent" (
				"campaignId",
				"createdAt",
				"addedCount",
				"totalContacts",
				"source"
			)
			VALUES (
				${args.campaignId},
				${args.createdAt},
				${args.addedCount},
				${args.totalContacts},
				${args.source}
			)
		`);
	} catch {
		// Best-effort only (e.g., migration not applied yet).
	}
};

const patchCampaignSchema = z.object({
	name: z.string().optional(),
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
		const validatedData = patchCampaignSchema.safeParse(body);
		if (!validatedData.success) {
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

		const campaignId = Number(id);
		const shouldLogContactsAdded = Boolean(
			(contactOperation?.action === 'connect' && contactOperation.contactIds.length > 0) ||
				(userContactListOperation?.action === 'connect' &&
					userContactListOperation.userContactListIds.length > 0)
		);
		const preUpdateContactCount = shouldLogContactsAdded
			? await getCampaignContactsCount(campaignId)
			: null;

		// Verify that the identity belongs to the current user
		if (identityId) {
			const identity = await prisma.identity.findUnique({
				where: { id: identityId },
			});

			if (!identity) {
				return apiBadRequest('Identity not found');
			}

			if (identity.userId !== userId) {
				return apiUnauthorized('You do not have permission to use this identity');
			}
		}

		const fullAiBlock = hybridBlockPrompts?.find(
			(block) => block.type === 'full_automated'
		);

		const updatePayload = {
			...updateData,
			...(hybridAvailableBlocks !== null && { hybridAvailableBlocks }),
			...(hybridBlockPrompts !== null && { hybridBlockPrompts }),
			signature: connectOrDisconnectId(signatureId),
			identity: connectOrDisconnectId(identityId),
			...(fullAiBlock && { fullAiPrompt: fullAiBlock.value }),
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

		const updatedCampaign = await prisma.campaign.update({
			where: {
				id: campaignId,
				userId,
			},
			data: updatePayload,
			include: {
				contacts: true,
				userContactLists: true,
			},
		});

		if (shouldLogContactsAdded) {
			const afterCount = await getCampaignContactsCount(campaignId);
			const beforeCount = preUpdateContactCount ?? 0;
			const addedCount = afterCount - beforeCount;
			if (addedCount > 0) {
				await safeInsertCampaignContactEvent({
					campaignId,
					createdAt: new Date(),
					addedCount,
					totalContacts: afterCount,
					source: 'campaign.patch',
				});
			}
		}

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
