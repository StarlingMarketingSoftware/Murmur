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
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/api/_utils';
import { ApiRouteParams } from '@/types';
import { EmailStatus } from '@prisma/client';

const patchEmailSchema = z.object({
	subject: z.string().min(1).optional(),
	message: z.string().min(1).optional(),
	campaignId: z.number().int().positive().optional(),
	status: z.nativeEnum(EmailStatus).optional(),
	reviewStatus: z.enum(['approved', 'rejected']).nullable().optional(),
	sentAt: z.union([z.date(), z.string().datetime()]).optional(),
});
export type PatchEmailData = z.infer<typeof patchEmailSchema>;

const normalizeSentAt = (sentAt: string | Date | undefined): Date | undefined => {
	if (sentAt === undefined) return undefined;
	return sentAt instanceof Date ? sentAt : new Date(sentAt);
};

export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		let body;
		try {
			body = await req.json();
		} catch {
			return apiBadRequest('Invalid or missing request body');
		}

		if (!body || typeof body !== 'object') {
			return apiBadRequest('Request body must be a valid JSON object');
		}

		const validatedData = patchEmailSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const emailId = Number(id);
		const existingEmail = await prisma.email.findUnique({
			where: { id: emailId },
			select: {
				id: true,
				userId: true,
				campaignId: true,
				contactId: true,
				subject: true,
				message: true,
				status: true,
				reviewStatus: true,
				sentAt: true,
			},
		});

		if (!existingEmail) {
			return apiNotFound();
		}

		if (existingEmail.userId !== userId) {
			return apiUnauthorizedResource();
		}

		const { campaignId, sentAt, ...emailPatchData } = validatedData.data;
		const normalizedSentAt = normalizeSentAt(sentAt);
		const updateData = {
			...emailPatchData,
			...(sentAt !== undefined ? { sentAt: normalizedSentAt } : {}),
			...(campaignId !== undefined ? { campaignId } : {}),
		};

		if (campaignId !== undefined) {
			const targetCampaign = await prisma.campaign.findUnique({
				where: { id: campaignId },
				select: { userId: true },
			});

			if (!targetCampaign) {
				return apiNotFound();
			}

			if (targetCampaign.userId !== userId) {
				return apiUnauthorizedResource();
			}
		}

		const nextStatus = emailPatchData.status ?? existingEmail.status;
		if (
			campaignId !== undefined &&
			campaignId !== existingEmail.campaignId &&
			nextStatus === EmailStatus.draft
		) {
			const targetDraft = await prisma.email.findFirst({
				where: {
					userId,
					campaignId,
					contactId: existingEmail.contactId,
					status: EmailStatus.draft,
					id: { not: existingEmail.id },
				},
				orderBy: { createdAt: 'desc' as const },
				select: { id: true },
			});

			if (targetDraft) {
				const updatedEmail = await prisma.$transaction(async (tx) => {
					const updated = await tx.email.update({
						where: { id: targetDraft.id },
						data: {
							subject: emailPatchData.subject ?? existingEmail.subject,
							message: emailPatchData.message ?? existingEmail.message,
							status: nextStatus,
							reviewStatus:
								'reviewStatus' in emailPatchData
									? emailPatchData.reviewStatus
									: existingEmail.reviewStatus,
							sentAt: sentAt !== undefined ? normalizedSentAt : existingEmail.sentAt,
						},
					});

					await tx.email.delete({
						where: { id: existingEmail.id },
					});

					return updated;
				});

				return apiResponse(updatedEmail);
			}
		}

		const updatedEmail = await prisma.email.update({
			where: { id: emailId },
			data: updateData,
		});

		return apiResponse(updatedEmail);
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
		const email = await prisma.email.findUnique({
			where: {
				id: Number(id),
			},
			include: {
				contact: true,
			},
		});

		if (!email) {
			return apiNotFound();
		}

		if (email.userId !== userId) {
			return apiUnauthorizedResource();
		}

		return apiResponse(email);
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

		await prisma.email.deleteMany({
			where: {
				id: Number(id),
				userId,
			},
		});

		return apiNoContent();
	} catch (error) {
		return handleApiError(error);
	}
}
