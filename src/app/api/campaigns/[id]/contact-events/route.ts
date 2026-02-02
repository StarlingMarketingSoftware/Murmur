import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { ApiRouteParams } from '@/types';

type CampaignContactEventRow = {
	id: number;
	campaignId: number;
	createdAt: Date;
	addedCount: number;
	totalContacts: number;
	source: string | null;
	metadata: unknown | null;
};

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
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

		// Best-effort: if the event table doesn't exist yet (migration not applied),
		// return an empty list so UI can fall back to synthetic batches.
		let events: CampaignContactEventRow[] = [];
		try {
			events = await prisma.$queryRaw<CampaignContactEventRow[]>(Prisma.sql`
				SELECT
					"id",
					"campaignId",
					"createdAt",
					"addedCount",
					"totalContacts",
					"source",
					"metadata"
				FROM "CampaignContactEvent"
				WHERE "campaignId" = ${campaignId}
				ORDER BY "createdAt" DESC
				LIMIT 50
			`);
		} catch {
			events = [];
		}

		return apiResponse(events);
	} catch (error) {
		return handleApiError(error);
	}
}

