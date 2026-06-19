import { EmailStatus, SendQueueStatus } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * Cancel a campaign's still-queued cold sends (called when the campaign is
 * archived/deleted). Pending queue rows are DELETED (keeps the EmailSendQueue
 * @unique(emailId) clean for a future re-enqueue) and their Emails are restored
 * to `draft`. Rows already `processing` are left to finish — the worker's
 * send-time campaign-active re-check stops those — and their Emails are NOT
 * flipped, so an in-flight send can never desync into a re-sendable draft.
 */
export async function cancelQueuedSendsForCampaign(campaignId: number): Promise<number> {
	// 1. Bulk-delete pending rows. Any row that raced to `processing` survives.
	const deleted = await prisma.emailSendQueue.deleteMany({
		where: { campaignId, status: SendQueueStatus.pending },
	});
	if (deleted.count === 0) {
		// Nothing was pending, but processing rows may still exist — fall through so
		// their Emails are intentionally left alone.
	}

	// 2. Restore to `draft` only the scheduled Emails that NO LONGER have a live
	//    (pending/processing) queue row — i.e. the ones we just cancelled.
	const liveRows = await prisma.emailSendQueue.findMany({
		where: { campaignId, status: { in: [SendQueueStatus.pending, SendQueueStatus.processing] } },
		select: { emailId: true },
	});
	const liveEmailIds = new Set(liveRows.map((r) => r.emailId));
	const scheduledEmails = await prisma.email.findMany({
		where: { campaignId, status: EmailStatus.scheduled },
		select: { id: true },
	});
	const toRestore = scheduledEmails.filter((e) => !liveEmailIds.has(e.id)).map((e) => e.id);
	if (toRestore.length > 0) {
		await prisma.email.updateMany({
			where: { id: { in: toRestore }, status: EmailStatus.scheduled },
			data: { status: EmailStatus.draft },
		});
	}
	return deleted.count;
}

/**
 * Cancel one still-pending queued send and restore its Email to draft. Processing
 * rows may already be in-flight, so they are intentionally left untouched.
 */
export async function cancelPendingQueuedSend(args: {
	queueId: number;
	campaignId: number;
	userId: string;
}): Promise<boolean> {
	const row = await prisma.emailSendQueue.findFirst({
		where: {
			id: args.queueId,
			campaignId: args.campaignId,
			userId: args.userId,
			status: SendQueueStatus.pending,
		},
		select: { id: true, emailId: true },
	});
	if (!row) return false;

	const deleted = await prisma.emailSendQueue.deleteMany({
		where: { id: row.id, status: SendQueueStatus.pending },
	});
	if (deleted.count === 0) return false;

	await prisma.email.updateMany({
		where: { id: row.emailId, userId: args.userId, status: EmailStatus.scheduled },
		data: { status: EmailStatus.draft },
	});
	return true;
}
