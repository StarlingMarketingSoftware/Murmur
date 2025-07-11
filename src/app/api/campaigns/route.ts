import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { AiModel, Status } from '@prisma/client';
import {
	apiBadRequest,
	apiCreated,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { z } from 'zod';

const postCampaignSchema = z.object({
	name: z.string().min(1),
	status: z.nativeEnum(Status).optional(),
	subject: z.string().optional(),
	message: z.string().optional(),
	aiModel: z.nativeEnum(AiModel).optional(),
	testMessage: z.string().optional(),
	testSubject: z.string().optional(),
	senderEmail: z.string().email().optional(),
	senderName: z.string().optional(),
	contacts: z.array(z.number()).optional(),
	contactLists: z.array(z.number()).optional(),
	userContactLists: z.array(z.number()).optional(),
});
export type PostCampaignData = z.infer<typeof postCampaignSchema>;

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await req.json();
		const validatedData = postCampaignSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}
		const { contacts, contactLists, userContactLists } = validatedData.data;

		const campaign = await prisma.campaign.create({
			data: {
				...validatedData.data,
				userId,
				contacts: {
					connect: contacts?.map((id) => ({ id })),
				},
				contactLists: {
					connect: contactLists?.map((id) => ({ id })),
				},
				userContactLists: {
					connect: userContactLists?.map((id) => ({ id })),
				},
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
