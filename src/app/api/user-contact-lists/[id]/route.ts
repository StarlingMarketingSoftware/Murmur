import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiNoContent,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { ApiRouteParams } from '@/types';
import { EmailVerificationStatus, Prisma } from '@prisma/client';

const getCampaignContactsCount = async (campaignId: number) => {
	return prisma.contact.count({
		where: {
			OR: [
				// Legacy: direct campaign-to-contact relation
				{ campaigns: { some: { id: campaignId } } },
				// Primary: contacts via userContactLists connected to this campaign
				{ userContactLists: { some: { campaigns: { some: { id: campaignId } } } } },
				// Legacy: contacts via contactLists connected to this campaign
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

const updateUserContactListSchema = z.object({
	name: z.string().min(1).optional(),
	contactOperation: z
		.object({
			action: z.enum(['connect', 'disconnect']),
			contactIds: z.array(z.number()),
		})
		.optional(),
});

export type PatchUserContactListData = z.infer<typeof updateUserContactListSchema>;

export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const body = await req.json();
		const validatedData = updateUserContactListSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { name, contactOperation } = validatedData.data;

		const existingList = await prisma.userContactList.findFirst({
			where: {
				id: Number(id),
				userId, // Ensure user owns this list
			},
			select: {
				id: true,
				campaigns: { select: { id: true } },
			},
		});

		if (!existingList) {
			return apiNotFound();
		}

		const campaignsToLog =
			contactOperation?.action === 'connect' && contactOperation.contactIds.length > 0
				? existingList.campaigns.map((c) => c.id)
				: [];

		const preUpdateCountsByCampaign = new Map<number, number>();
		if (campaignsToLog.length > 0) {
			await Promise.all(
				campaignsToLog.map(async (campaignId) => {
					const count = await getCampaignContactsCount(campaignId);
					preUpdateCountsByCampaign.set(campaignId, count);
				})
			);
		}

		// Prepare update data with proper typing
		const updateData: Prisma.UserContactListUpdateInput = {};
		if (name) {
			updateData.name = name;
		}
		if (contactOperation) {
			updateData.contacts = {
				[contactOperation.action]: contactOperation.contactIds.map((id: number) => ({
					id,
				})),
			};
		}

		const updatedUserContactList = await prisma.userContactList.update({
			where: {
				id: Number(id),
			},
			data: updateData,
			include: {
				contacts: true,
			},
		});

		if (campaignsToLog.length > 0) {
			await Promise.all(
				campaignsToLog.map(async (campaignId) => {
					const before = preUpdateCountsByCampaign.get(campaignId) ?? 0;
					const after = await getCampaignContactsCount(campaignId);
					const addedCount = after - before;
					if (addedCount <= 0) return;
					await safeInsertCampaignContactEvent({
						campaignId,
						createdAt: new Date(),
						addedCount,
						totalContacts: after,
						source: 'userContactList.connect',
					});
				})
			);
		}

		return apiResponse(updatedUserContactList);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const userContactList = await prisma.userContactList.findFirst({
			where: {
				id: Number(id),
				userId, // Ensure user owns this list
			},
			include: {
				contacts: {
					where: {
						emailValidationStatus: EmailVerificationStatus.valid,
					},
				},
			},
		});

		if (!userContactList) {
			return apiNotFound();
		}

		return apiResponse(userContactList);
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
		const existingList = await prisma.userContactList.findFirst({
			where: {
				id: Number(id),
				userId, // Ensure user owns this list
			},
		});

		if (!existingList) {
			return apiNotFound();
		}

		await prisma.userContactList.delete({
			where: {
				id: Number(id),
			},
		});

		return apiNoContent();
	} catch (error) {
		return handleApiError(error);
	}
}
