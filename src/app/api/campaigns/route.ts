import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { AiModel, Status } from '@prisma/client';
import {
	apiCreated,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/utils/api';

export type CreateCampaignBody = {
	name: string;
	status?: Status;
	subject?: string;
	message?: string;
	aiModel?: AiModel;
	testMessage?: string;
	testSubject?: string;
	senderEmail?: string;
	senderName?: string;
	contacts?: number[];
};

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body: CreateCampaignBody = await req.json();
		const { name, contacts, ...restOfBody } = body;

		const campaign = await prisma.campaign.create({
			data: {
				name,
				userId,
				...restOfBody,
				...(contacts && {
					contacts: {
						connect: contacts.map((id) => ({ id })),
					},
				}),
			},
			include: {
				contacts: true,
			},
		});

		return apiCreated(campaign);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const campaigns = await prisma.campaign.findMany({
			where: {
				userId: userId,
				status: Status.active,
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		return apiResponse(campaigns);
	} catch (error) {
		return handleApiError(error);
	}
}
