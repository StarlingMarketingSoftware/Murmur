import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SendQueueStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { ApiRouteParams } from '@/types';
import type { SendQueueItemVM, SendQueueResponse } from '@/types/sendQueue';

// Lists a campaign's live (pending/processing) send-queue rows for the campaign
// send-queue view + header count. EmailSendQueue has no Prisma relations (scalar
// emailId/contactId by design), so the Email + Contact are joined in code.
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

		const rows = await prisma.emailSendQueue.findMany({
			where: {
				campaignId,
				userId,
				status: { in: [SendQueueStatus.pending, SendQueueStatus.processing] },
			},
			orderBy: { scheduledFor: 'asc' },
			select: {
				id: true,
				emailId: true,
				contactId: true,
				status: true,
				scheduledFor: true,
			},
		});

		if (rows.length === 0) {
			return apiResponse({ items: [], count: 0 } satisfies SendQueueResponse);
		}

		const emailIds = [...new Set(rows.map((r) => r.emailId))];
		const contactIds = [...new Set(rows.map((r) => r.contactId))];

		const [emails, contacts] = await Promise.all([
			prisma.email.findMany({
				where: { id: { in: emailIds } },
				select: { id: true, subject: true, message: true, status: true },
			}),
			prisma.contact.findMany({ where: { id: { in: contactIds } } }),
		]);

		const emailById = new Map(emails.map((e) => [e.id, e]));
		const contactById = new Map(contacts.map((c) => [c.id, c]));

		const items: SendQueueItemVM[] = [];
		for (const row of rows) {
			const email = emailById.get(row.emailId);
			const contact = contactById.get(row.contactId);
			// Skip orphans (email/contact hard-deleted mid-flight) — the worker's
			// own send-time checks clean these rows up; they just shouldn't render.
			if (!email || !contact) continue;
			items.push({
				queueId: row.id,
				emailId: row.emailId,
				contactId: row.contactId,
				status:
					row.status === SendQueueStatus.processing ? 'processing' : 'pending',
				scheduledFor: row.scheduledFor.toISOString(),
				email: {
					subject: email.subject,
					message: email.message,
					status: email.status,
				},
				contact,
			});
		}

		return apiResponse({ items, count: items.length } satisfies SendQueueResponse);
	} catch (error) {
		return handleApiError(error);
	}
}
