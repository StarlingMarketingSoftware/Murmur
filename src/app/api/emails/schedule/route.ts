// Enqueue endpoint for the intelligent async send queue. Replaces the per-email
// synchronous Mailgun loop: takes the draft email ids a user clicked "send" on,
// computes spread-out daytime send times (<=100/day), and in ONE transaction
// creates the queue rows + flips those Emails draft->scheduled. Credits are NOT
// charged here (charge-at-send); we only GATE the batch to what the user can
// afford (sendingCredits minus already-queued), to prevent silent over-commit.

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { EmailStatus, SendQueueStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { apiBadRequest, apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import { computeSchedule, SENDER_REF_TZ } from '@/app/api/_utils/sendQueue/scheduler';
import {
	contentHash,
	flaggedHashesByEmailIds,
	isEmailModerationEnabled,
} from '@/app/api/_utils/sendQueue/moderation';

const bodySchema = z.object({
	campaignId: z.number().int().positive(),
	emailIds: z.array(z.number().int().positive()).min(1).max(2000),
});

const SLOT_CONSUMING = [SendQueueStatus.pending, SendQueueStatus.processing, SendQueueStatus.sent];

export async function POST(request: Request) {
	try {
		const limited = await withRateLimit(request, 'mutation', 'emails-schedule');
		if (limited) return limited;

		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const parsed = bodySchema.safeParse(await request.json());
		if (!parsed.success) return apiBadRequest(parsed.error);
		const { campaignId, emailIds } = parsed.data;

		const emptySummary = {
			scheduledCount: 0,
			dayCount: 0,
			firstSendAt: null as string | null,
			lastSendAt: null as string | null,
			skippedNoCredits: 0,
			skippedForReview: 0,
		};

		// Owned (userId == clerkId), still-draft emails in this campaign. An email is
		// an email — no contact-type special casing; every selected draft is queued.
		const allSchedulable = await prisma.email.findMany({
			where: { id: { in: emailIds }, userId, campaignId, status: EmailStatus.draft },
			select: { id: true, contactId: true, subject: true, message: true },
		});
		if (allSchedulable.length === 0) {
			return apiResponse(emptySummary);
		}

		// Moderation skip: a draft whose CURRENT content already carries a flagged
		// verdict is refused here (generic count only — the reason stays server-
		// side) instead of round-tripping the queue just to bounce back to Drafts.
		// Editing the draft changes its hash, so it becomes schedulable again and
		// gets a fresh review in the queue.
		let skippedForReview = 0;
		let schedulable = allSchedulable;
		if (isEmailModerationEnabled()) {
			const flaggedHashes = await flaggedHashesByEmailIds(allSchedulable.map((e) => e.id));
			schedulable = allSchedulable.filter(
				(e) => !flaggedHashes.get(e.id)?.has(contentHash(e.subject, e.message)),
			);
			skippedForReview = allSchedulable.length - schedulable.length;
			if (schedulable.length === 0) {
				return apiResponse({ ...emptySummary, skippedForReview });
			}
		}

		// Credit gate: available = floor(credits) − live pending/processing queue rows.
		const [user, inFlight] = await Promise.all([
			prisma.user.findUnique({ where: { clerkId: userId }, select: { sendingCredits: true } }),
			prisma.emailSendQueue.count({
				where: { userId, status: { in: [SendQueueStatus.pending, SendQueueStatus.processing] } },
			}),
		]);
		const available = Math.max(0, Math.floor(user?.sendingCredits ?? 0) - inFlight);
		const toSchedule = schedulable.slice(0, available);
		const skippedNoCredits = schedulable.length - toSchedule.length;
		if (toSchedule.length === 0) {
			return apiResponse({ ...emptySummary, skippedNoCredits, skippedForReview });
		}

		// Existing per-day load so the scheduler fills only the remaining daily capacity.
		const grouped = await prisma.emailSendQueue.groupBy({
			by: ['capDay'],
			where: { userId, status: { in: SLOT_CONSUMING } },
			_count: { _all: true },
		});
		const alreadyCountByCapDay = new Map<string, number>();
		for (const g of grouped) alreadyCountByCapDay.set(g.capDay, g._count._all);

		const slots = computeSchedule({
			countToSchedule: toSchedule.length,
			nowInstant: new Date(),
			alreadyCountByCapDay,
		});

		const rows = toSchedule.map((e, i) => ({
			emailId: e.id,
			userId,
			campaignId,
			contactId: e.contactId,
			status: SendQueueStatus.pending,
			scheduledFor: slots[i].scheduledForUtc,
			capDay: slots[i].capDay,
			recipientTz: SENDER_REF_TZ,
		}));
		const idsToFlip = toSchedule.map((e) => e.id);

		await prisma.$transaction(
			async (tx) => {
				// Clear any stale TERMINAL queue rows for these emails first. Without this,
				// the @unique(emailId) makes createMany(skipDuplicates) silently skip a
				// legitimate re-enqueue (e.g. a campaign archived mid-send left a `canceled`
				// row + the Email back to `draft`) while the Email below still flips to
				// `scheduled` — a silent drop. A live pending/processing row (true
				// double-submit) is intentionally NOT deleted; skipDuplicates handles it.
				await tx.emailSendQueue.deleteMany({
					where: {
						emailId: { in: idsToFlip },
						status: { in: [SendQueueStatus.canceled, SendQueueStatus.failed] },
					},
				});
				await tx.emailSendQueue.createMany({ data: rows, skipDuplicates: true });
				// Flip to scheduled ONLY emails that now actually have a live pending row,
				// so an Email can never become `scheduled` without a row to send it.
				const live = await tx.emailSendQueue.findMany({
					where: { emailId: { in: idsToFlip }, status: SendQueueStatus.pending },
					select: { emailId: true },
				});
				await tx.email.updateMany({
					where: { id: { in: live.map((r) => r.emailId) }, status: EmailStatus.draft },
					data: { status: EmailStatus.scheduled },
				});
			},
			{ timeout: 30_000 },
		);

		const dayCount = new Set(slots.map((s) => s.capDay)).size;
		return apiResponse({
			scheduledCount: rows.length,
			dayCount,
			firstSendAt: slots[0].scheduledForUtc.toISOString(),
			lastSendAt: slots[slots.length - 1].scheduledForUtc.toISOString(),
			skippedNoCredits,
			skippedForReview,
		});
	} catch (error) {
		return handleApiError(error);
	}
}
