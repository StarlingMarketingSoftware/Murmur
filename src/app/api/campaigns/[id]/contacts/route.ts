import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { ApiRouteParams } from '@/types';

export async function GET(_req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const { id } = await params;
		const campaignId = Number(id);
		if (!Number.isFinite(campaignId)) {
			return apiBadRequest('Invalid campaign id');
		}

		const campaign = await prisma.campaign.findFirst({
			where: { id: campaignId, userId },
			select: { id: true },
		});
		if (!campaign) return apiNotFound();

		// A campaign's contacts can be linked directly, through user contact lists,
		// or via legacy contactLists.
		const contacts = await prisma.contact.findMany({
			where: {
				OR: [
					{ campaigns: { some: { id: campaignId } } },
					{
						userContactLists: {
							some: { campaigns: { some: { id: campaignId } } },
						},
					},
					{ contactList: { campaigns: { some: { id: campaignId } } } },
				],
			},
			orderBy: [{ id: 'asc' }],
		});

		return apiResponse(contacts);
	} catch (error) {
		return handleApiError(error);
	}
}
