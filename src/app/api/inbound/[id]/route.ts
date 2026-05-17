import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import type { ApiRouteParams } from '@/types';
import { Status } from '@prisma/client';

const patchInboundEmailSchema = z.object({
	campaignId: z.number().int().positive().optional(),
});

export type PatchInboundEmailData = z.infer<typeof patchInboundEmailSchema>;

const extractEmailFromField = (value: string | null | undefined): string | null => {
	const raw = value?.trim();
	if (!raw) return null;

	const angleMatch = raw.match(/<([^>]+)>/);
	const candidate = (angleMatch?.[1] || raw).trim().toLowerCase();
	return z.string().email().safeParse(candidate).success ? candidate : null;
};

const getNameParts = (senderName: string | null | undefined) => {
	const cleaned = senderName?.replace(/^"|"$/g, '').trim();
	if (!cleaned) return { firstName: undefined, lastName: undefined };

	const parts = cleaned.split(/\s+/).filter(Boolean);
	return {
		firstName: parts[0],
		lastName: parts.length > 1 ? parts.slice(1).join(' ') : undefined,
	};
};

export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const inboundEmailId = Number(id);
		if (!Number.isInteger(inboundEmailId) || inboundEmailId <= 0) {
			return apiBadRequest('Invalid inbound email id');
		}

		const body = await req.json().catch(() => ({}));
		const validatedData = patchInboundEmailSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const result = await prisma.$transaction(async (tx) => {
			const inboundEmail = await tx.inboundEmail.findFirst({
				where: { id: inboundEmailId, userId },
				include: { contact: true },
			});

			if (!inboundEmail) {
				return { status: 'email-not-found' as const };
			}

			if (inboundEmail.campaignId != null) {
				const currentEmail = await tx.inboundEmail.findUnique({
					where: { id: inboundEmail.id },
					include: { contact: true, campaign: true, originalEmail: true },
				});

				return {
					status: 'already-assigned' as const,
					email: currentEmail,
				};
			}

			const targetCampaign = await tx.campaign.findFirst({
				where: {
					userId,
					status: Status.active,
					...(validatedData.data.campaignId ? { id: validatedData.data.campaignId } : {}),
				},
				orderBy: { createdAt: 'desc' },
				include: {
					userContactLists: {
						orderBy: { createdAt: 'asc' },
						select: { id: true },
					},
				},
			});

			if (!targetCampaign) {
				return { status: 'campaign-not-found' as const };
			}

			let contactId =
				inboundEmail.contact &&
				(inboundEmail.contact.userId === userId || inboundEmail.contact.userId == null)
					? inboundEmail.contactId
					: null;
			const senderEmail = extractEmailFromField(inboundEmail.sender);

			if (!contactId && senderEmail) {
				const existingContact = await tx.contact.findFirst({
					where: {
						email: { equals: senderEmail, mode: 'insensitive' },
						OR: [{ userId }, { userId: null }],
					},
					orderBy: [{ userId: 'desc' }, { updatedAt: 'desc' }],
					select: { id: true },
				});

				if (existingContact) {
					contactId = existingContact.id;
				} else {
					const { firstName, lastName } = getNameParts(inboundEmail.senderName);
					const createdContact = await tx.contact.create({
						data: {
							email: senderEmail,
							firstName,
							lastName,
							isPrivate: true,
							userId,
						},
						select: { id: true },
					});
					contactId = createdContact.id;
				}
			}

			let userContactListId = targetCampaign.userContactLists[0]?.id ?? null;
			if (!userContactListId) {
				const createdList = await tx.userContactList.create({
					data: {
						name: targetCampaign.name,
						userId,
						campaigns: { connect: { id: targetCampaign.id } },
					},
					select: { id: true },
				});
				userContactListId = createdList.id;
			}

			if (contactId && userContactListId) {
				const isAlreadyInList = await tx.userContactList.findFirst({
					where: {
						id: userContactListId,
						contacts: { some: { id: contactId } },
					},
					select: { id: true },
				});

				if (!isAlreadyInList) {
					await tx.userContactList.update({
						where: { id: userContactListId },
						data: { contacts: { connect: { id: contactId } } },
					});
				}
			}

			const updatedEmail = await tx.inboundEmail.update({
				where: { id: inboundEmail.id },
				data: {
					campaignId: targetCampaign.id,
					...(contactId ? { contactId } : {}),
				},
				include: { contact: true, campaign: true, originalEmail: true },
			});

			return { status: 'assigned' as const, email: updatedEmail };
		});

		if (result.status === 'email-not-found') {
			return apiNotFound('Inbound email not found');
		}

		if (result.status === 'campaign-not-found') {
			return apiNotFound('No active campaign found');
		}

		if (!result.email) {
			return apiNotFound('Inbound email not found');
		}

		return apiResponse(result.email);
	} catch (error) {
		return handleApiError(error);
	}
}
