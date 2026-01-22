import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { z } from 'zod';
import { getValidatedParamsFromUrl } from '@/utils';

const usedContactCampaignsFilterSchema = z.object({
	contactId: z.number(),
});

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const validatedFilters = getValidatedParamsFromUrl(
			req.url,
			usedContactCampaignsFilterSchema
		);
		if (!validatedFilters.success) {
			return apiBadRequest(validatedFilters.error);
		}

		const { contactId } = validatedFilters.data;

		const campaigns = await prisma.campaign.findMany({
			where: {
				userId,
				OR: [
					{
						contacts: {
							some: {
								id: contactId,
							},
						},
					},
					{
						userContactLists: {
							some: {
								contacts: {
									some: {
										id: contactId,
									},
								},
							},
						},
					},
				],
			},
			select: {
				id: true,
				name: true,
				createdAt: true,
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		return apiResponse(campaigns.map(({ id, name }) => ({ id, name })));
	} catch (error) {
		return handleApiError(error);
	}
}

