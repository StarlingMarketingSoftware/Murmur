import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
	apiBadRequest,
	apiNoContent,
	apiNotFound,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { cancelPendingQueuedSend } from '@/app/api/_utils/sendQueue/cancel';
import prisma from '@/lib/prisma';

type SendQueueItemRouteParams = Promise<{ id: string; queueId: string }>;

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: SendQueueItemRouteParams }
) {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const { id, queueId } = await params;
		const campaignId = Number(id);
		const parsedQueueId = Number(queueId);
		if (!Number.isFinite(campaignId) || !Number.isFinite(parsedQueueId)) {
			return apiBadRequest('Invalid send queue id');
		}

		const campaign = await prisma.campaign.findFirst({
			where: { id: campaignId, userId },
			select: { id: true },
		});
		if (!campaign) return apiNotFound();

		const canceled = await cancelPendingQueuedSend({
			queueId: parsedQueueId,
			campaignId,
			userId,
		});
		if (!canceled) return apiNotFound('Queued send not found or already processing');

		return apiNoContent();
	} catch (error) {
		return handleApiError(error);
	}
}
