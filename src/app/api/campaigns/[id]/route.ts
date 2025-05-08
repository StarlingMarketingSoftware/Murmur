import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import {
	apiNoContent,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/utils/api';
import { Status } from '@prisma/client';

import { ApiRouteParams } from '@/constants/types';
import { NextRequest } from 'next/server';
import { updateCampaignSchema } from './schema';

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const campaign = await prisma.campaign.findUniqueOrThrow({
			where: {
				id: parseInt(id),
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
		const validatedData = updateCampaignSchema.parse(body);

		const updatedCampaign = await prisma.campaign.update({
			where: {
				id: parseInt(id),
				userId,
			},
			data: {
				...(validatedData.name && { name: validatedData.name }),
				...(validatedData.subject !== undefined && { subject: validatedData.subject }),
				...(validatedData.message !== undefined && { message: validatedData.message }),
				...(validatedData.aiModel !== undefined && { aiModel: validatedData.aiModel }),
				...(validatedData.font !== undefined && { font: validatedData.font }),
				...(validatedData.testMessage !== undefined && {
					testMessage: validatedData.testMessage,
				}),
				...(validatedData.testSubject !== undefined && {
					testSubject: validatedData.testSubject,
				}),
				...(validatedData.senderEmail !== undefined && {
					senderEmail: validatedData.senderEmail,
				}),
				...(validatedData.senderName !== undefined && {
					senderName: validatedData.senderName,
				}),
				...(validatedData.signatureId !== undefined && {
					signature:
						validatedData.signatureId === null
							? { disconnect: true }
							: { connect: { id: validatedData.signatureId } },
				}),
				...(validatedData.contactOperation && {
					contacts: {
						[validatedData.contactOperation.action]:
							validatedData.contactOperation.contactIds.map((id: number) => {
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
				id: parseInt(id),
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
				id: parseInt(id),
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
