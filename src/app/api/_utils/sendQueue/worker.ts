// One tick of the send-queue worker. Isolated from the HTTP route so it is
// testable with an injected clock + Mailgun fake. Correctness guarantees:
//  • at-most-once dispatch per row (status-guarded claim + lockToken terminal write)
//  • no silent drop of un-attempted rows (dispatchedAt splits the sweeper:
//    never-dispatched → re-queue, dispatched-but-unconfirmed → failed, never resent)
//  • ≤ perDayCap real sends per sender per day (counted by actual sentAt, so a
//    backlog drains over days instead of bursting)
//  • only sends inside the 11am–8pm ET window (off-hours overdue rows simply wait)
//  • charge-at-send: guarded decrement after the send, before mark-sent

import { randomUUID } from 'crypto';
import { EmailStatus, SendQueueStatus } from '@prisma/client';
import type { EmailSendQueue } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
	capDayOf,
	localMinutesOf,
	localWallTimeToUtc,
	SENDER_REF_TZ,
	WINDOW_START_MIN,
	WINDOW_END_MIN,
	PER_DAY_CAP,
} from './scheduler';
import { sendCampaignEmail, type SendOutcome } from './sender';
import {
	MODERATION_HOLD_REASON,
	MODERATION_HOLD_RETRY_MS,
	isEmailModerationEnabled,
	moderationMaxPerTick,
	moderationTickBudgetMs,
	returnQueueRowToDrafts,
	sweepModerationQueue,
	type ModerationLlmFetch,
} from './moderation';

export type TickDeps = {
	now?: Date;
	maxSends?: number;
	wallBudgetMs?: number;
	perDayCap?: number;
	stuckMs?: number;
	maxAttempts?: number;
	maxCreditReschedules?: number;
	lifetimeDays?: number;
	tz?: string;
	// Test seam: inject a fake send. Defaults to the real Mailgun sender.
	send?: (args: {
		queueId: number;
		emailId: number;
		userId: string;
		beforeDispatch: () => Promise<void>;
	}) => Promise<SendOutcome>;
	// Test seam: inject a fake moderation LLM. Defaults to the real ladder.
	moderationLlmFetch?: ModerationLlmFetch;
};

export type TickResult = {
	swept: number;
	requeued: number;
	sent: number;
	failed: number;
	canceled: number;
	claimed: number;
	offHours: boolean;
	// Moderation counters (all 0 while EMAIL_MODERATION_ENABLED is off):
	// checked/llm/cache from the sweep; flagged counts BOTH sweep and
	// dispatch-gate returns-to-drafts; held = fail-closed holds (sweep misses
	// + claim releases); returnedStale = held-too-long bailouts.
	modChecked: number;
	modLlmCalls: number;
	modCacheHits: number;
	modApproved: number;
	modFlagged: number;
	modHeld: number;
	modReturnedStale: number;
};

const backoffMs = (attempts: number) => Math.min(2 ** attempts * 60_000, 60 * 60_000);

export async function runSendQueueTick(deps: TickDeps = {}): Promise<TickResult> {
	const now = deps.now ?? new Date();
	const tz = deps.tz ?? SENDER_REF_TZ;
	const maxSends = deps.maxSends ?? 24;
	const wallBudgetMs = deps.wallBudgetMs ?? 35_000;
	const perDayCap = deps.perDayCap ?? PER_DAY_CAP;
	const stuckMs = deps.stuckMs ?? 10 * 60_000;
	const maxAttempts = deps.maxAttempts ?? 5;
	const maxCreditReschedules = deps.maxCreditReschedules ?? 2;
	const lifetimeDays = deps.lifetimeDays ?? 30;
	const send = deps.send ?? sendCampaignEmail;
	const startWall = Date.now();

	const result: TickResult = {
		swept: 0,
		requeued: 0,
		sent: 0,
		failed: 0,
		canceled: 0,
		claimed: 0,
		offHours: false,
		modChecked: 0,
		modLlmCalls: 0,
		modCacheHits: 0,
		modApproved: 0,
		modFlagged: 0,
		modHeld: 0,
		modReturnedStale: 0,
	};

	// ── Sweeper ────────────────────────────────────────────────────────────────
	const stuckBefore = new Date(now.getTime() - stuckMs);
	// Claimed but NEVER dispatched → provably never sent → safe to re-queue.
	const requeued = await prisma.emailSendQueue.updateMany({
		where: { status: SendQueueStatus.processing, dispatchedAt: null, lockedAt: { lt: stuckBefore } },
		data: { status: SendQueueStatus.pending, lockedAt: null, lockToken: null },
	});
	result.requeued = requeued.count;
	// Dispatched but unconfirmed → ambiguous → fail, NEVER auto-resend.
	const stuck = await prisma.emailSendQueue.findMany({
		where: {
			status: SendQueueStatus.processing,
			dispatchedAt: { not: null },
			sentAt: null,
			lockedAt: { lt: stuckBefore },
		},
		select: { id: true, emailId: true },
	});
	for (const r of stuck) {
		const flipped = await prisma.emailSendQueue.updateMany({
			where: { id: r.id, status: SendQueueStatus.processing },
			data: { status: SendQueueStatus.failed, failureReason: 'stuck_in_processing' },
		});
		if (flipped.count > 0) {
			await prisma.email.updateMany({
				where: { id: r.emailId, status: EmailStatus.scheduled },
				data: { status: EmailStatus.failed },
			});
			result.swept++;
		}
	}

	// Lifetime guard: drop pending rows that have lingered far too long.
	const lifetimeBefore = new Date(now.getTime() - lifetimeDays * 24 * 60 * 60_000);
	const expired = await prisma.emailSendQueue.findMany({
		where: { status: SendQueueStatus.pending, createdAt: { lt: lifetimeBefore } },
		select: { id: true, emailId: true },
	});
	for (const r of expired) {
		const flipped = await prisma.emailSendQueue.updateMany({
			where: { id: r.id, status: SendQueueStatus.pending },
			data: { status: SendQueueStatus.failed, failureReason: 'expired' },
		});
		if (flipped.count > 0) {
			await prisma.email.updateMany({
				where: { id: r.emailId, status: EmailStatus.scheduled },
				data: { status: EmailStatus.failed },
			});
			result.failed++;
		}
	}

	// ── Moderation sweep (the ONLY LLM caller) ──────────────────────────────────
	// Runs BEFORE the window gate so idle off-hours ticks pre-clear the 11am
	// burst. Budget is carved from the shared startWall clock: in-window it
	// must leave the claim loop ≥15s; off-hours the loop won't run, so the
	// sweep may take a larger slice (still bounded ≪ the 5-min interval, so
	// ticks never overlap).
	const nowLocalMin = localMinutesOf(now, tz);
	const offHours = nowLocalMin < WINDOW_START_MIN || nowLocalMin >= WINDOW_END_MIN;
	if (isEmailModerationEnabled()) {
		const elapsedMs = Date.now() - startWall;
		const reservedMs = offHours ? 2_000 : 15_000;
		const budgetMs = Math.min(
			moderationTickBudgetMs() * (offHours ? 2 : 1),
			wallBudgetMs - elapsedMs - reservedMs,
		);
		if (budgetMs >= 1_000) {
			const sweep = await sweepModerationQueue({
				now,
				budgetMs,
				maxItems: moderationMaxPerTick() * (offHours ? 2 : 1),
				llmFetch: deps.moderationLlmFetch,
			});
			result.modChecked = sweep.checked;
			result.modLlmCalls = sweep.llmCalls;
			result.modCacheHits = sweep.cacheHits;
			result.modApproved = sweep.approved;
			result.modFlagged = sweep.flagged;
			result.modHeld = sweep.held;
			result.modReturnedStale = sweep.returnedStale;
		}
	}

	// ── Window gate: only dispatch inside 11am–8pm ET ───────────────────────────
	if (offHours) {
		result.offHours = true;
		return result;
	}

	// ── Per-sender daily cap, counted by ACTUAL sends today (sentAt) ────────────
	// Counting real sends (not capDay buckets) means a backlog can never exceed
	// 100/sender/day no matter how it was scheduled. The count is taken once per
	// tick and updated in-memory as we send sequentially, so it is exact WITHIN a
	// tick. Cross-tick overlap is the only way to overshoot, and the cron cannot
	// overlap itself: each tick is bounded to wallBudgetMs (35s) ≪ the 5-min
	// interval, so consecutive ticks never run concurrently.
	const todayStartUtc = localWallTimeToUtc(capDayOf(now, tz), 0, tz);
	const sentTodayRows = await prisma.emailSendQueue.groupBy({
		by: ['userId'],
		where: { status: SendQueueStatus.sent, sentAt: { gte: todayStartUtc } },
		_count: { _all: true },
	});
	const sentToday = new Map<string, number>(sentTodayRows.map((r) => [r.userId, r._count._all]));
	const cappedUsers = new Set<string>();
	for (const [uid, n] of sentToday) if (n >= perDayCap) cappedUsers.add(uid);

	// ── Claim-one / send-one loop ───────────────────────────────────────────────
	while (result.sent < maxSends && Date.now() - startWall < wallBudgetMs) {
		const candidate = await prisma.emailSendQueue.findFirst({
			where: {
				status: SendQueueStatus.pending,
				scheduledFor: { lte: now },
				OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
				...(cappedUsers.size ? { userId: { notIn: [...cappedUsers] } } : {}),
			},
			orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
			select: { id: true, userId: true },
		});
		if (!candidate) break;
		if ((sentToday.get(candidate.userId) ?? 0) >= perDayCap) {
			cappedUsers.add(candidate.userId);
			continue;
		}

		// Status-guarded single-statement claim (race-proof under Read Committed).
		const token = randomUUID();
		const claimRes = await prisma.emailSendQueue.updateMany({
			where: { id: candidate.id, status: SendQueueStatus.pending },
			data: { status: SendQueueStatus.processing, lockedAt: now, lockToken: token },
		});
		if (claimRes.count === 0) continue; // lost the race; pick again
		const row = await prisma.emailSendQueue.findUnique({ where: { id: candidate.id } });
		if (!row || row.lockToken !== token) continue;
		result.claimed++;

		const outcome = await processClaimedRow(row, {
			now,
			token,
			send,
			maxAttempts,
			maxCreditReschedules,
		});
		if (outcome === 'sent') {
			result.sent++;
			const n = (sentToday.get(row.userId) ?? 0) + 1;
			sentToday.set(row.userId, n);
			if (n >= perDayCap) cappedUsers.add(row.userId);
		} else if (outcome === 'failed') {
			result.failed++;
		} else if (outcome === 'canceled') {
			result.canceled++;
		} else if (outcome === 'flagged') {
			result.modFlagged++;
		} else if (outcome === 'moderation_hold') {
			result.modHeld++;
		}
		// 'retry' / 'credit_block' / 'moderation_hold' leave the row pending
		// for a later tick.
	}

	return result;
}

type RowOutcome =
	| 'sent'
	| 'failed'
	| 'canceled'
	| 'retry'
	| 'credit_block'
	| 'flagged'
	| 'moderation_hold';

async function processClaimedRow(
	row: EmailSendQueue,
	opts: {
		now: Date;
		token: string;
		send: NonNullable<TickDeps['send']>;
		maxAttempts: number;
		maxCreditReschedules: number;
	},
): Promise<RowOutcome> {
	const { now, token, send, maxAttempts, maxCreditReschedules } = opts;

	// Credit pre-gate (read). The authoritative charge is the guarded decrement
	// after a successful send; this just avoids dispatching when clearly out.
	const user = await prisma.user.findUnique({
		where: { clerkId: row.userId },
		select: { sendingCredits: true },
	});
	if (!user || user.sendingCredits < 1) {
		const next = row.creditRescheduleCount + 1;
		if (next > maxCreditReschedules) {
			await terminal(row, SendQueueStatus.failed, EmailStatus.failed, 'no_credits');
			return 'failed';
		}
		await prisma.emailSendQueue.updateMany({
			where: { id: row.id, status: SendQueueStatus.processing, lockToken: token },
			data: {
				status: SendQueueStatus.pending,
				lockedAt: null,
				lockToken: null,
				nextRetryAt: new Date(now.getTime() + 24 * 60 * 60_000),
				creditRescheduleCount: next,
				creditBlockedAt: row.creditBlockedAt ?? now,
			},
		});
		return 'credit_block';
	}

	const outcome = await send({
		queueId: row.id,
		emailId: row.emailId,
		userId: row.userId,
		// Mark dispatchedAt + bump attempts immediately before the irreversible send.
		beforeDispatch: async () => {
			await prisma.emailSendQueue.updateMany({
				where: { id: row.id, status: SendQueueStatus.processing, lockToken: token, dispatchedAt: null },
				data: { dispatchedAt: now, attempts: { increment: 1 } },
			});
		},
	});

	switch (outcome.status) {
		case 'sent': {
			// Charge-at-send: guarded decrement + mark-sent (queue + Email) committed
			// ATOMICALLY so a crash can't charge a credit while the row/Email stay
			// behind (which the sweeper would later mislabel `failed`). The Mailgun send
			// already happened; if this txn fails the sweeper fails the row (delivered
			// but uncharged — the bounded, accepted residual), never charge-without-sent.
			await prisma.$transaction([
				prisma.user.updateMany({
					where: { clerkId: row.userId, sendingCredits: { gte: 1 } },
					data: { sendingCredits: { decrement: 1 } },
				}),
				prisma.emailSendQueue.updateMany({
					where: { id: row.id, status: SendQueueStatus.processing, lockToken: token },
					data: { status: SendQueueStatus.sent, sentAt: now },
				}),
				prisma.email.updateMany({
					where: { id: row.emailId, status: EmailStatus.scheduled },
					data: { status: EmailStatus.sent, sentAt: now },
				}),
			]);
			return 'sent';
		}
		case 'suppressed': {
			// Recipient unsubscribed since enqueue → cancel, leave Email failed so it
			// stays out of the "already-contacted" dedup re-draft set.
			await terminal(row, SendQueueStatus.canceled, EmailStatus.failed, 'suppressed');
			return 'canceled';
		}
		case 'moderation_flagged': {
			// Flagged content reached dispatch (sweep raced or was budget-cut):
			// pull the row we own and restore the Email to an active draft.
			await returnQueueRowToDrafts({
				queueId: row.id,
				emailId: row.emailId,
				userId: row.userId,
				guard: { status: 'processing', lockToken: token },
			});
			return 'flagged';
		}
		case 'moderation_hold': {
			// Fail-closed: no verdict for the CURRENT content — release the
			// claim untouched (dispatchedAt still null, attempts is a
			// Mailgun-only counter). nextRetryAt is MANDATORY: without it the
			// candidate query re-picks this row immediately and the tick spins.
			await prisma.emailSendQueue.updateMany({
				where: { id: row.id, status: SendQueueStatus.processing, lockToken: token },
				data: {
					status: SendQueueStatus.pending,
					lockedAt: null,
					lockToken: null,
					nextRetryAt: new Date(now.getTime() + MODERATION_HOLD_RETRY_MS),
					failureReason: MODERATION_HOLD_REASON,
				},
			});
			return 'moderation_hold';
		}
		case 'skipped': {
			if (outcome.reason === 'campaign_inactive') {
				// Archived/deleted campaign → cancel, restore the Email to draft.
				await terminal(row, SendQueueStatus.canceled, EmailStatus.draft, outcome.reason);
				return 'canceled';
			}
			if (outcome.reason === 'email_gone' || outcome.reason === 'contact_gone') {
				// Orphan (Email/contact hard-deleted) → drop the queue row.
				await prisma.emailSendQueue.deleteMany({ where: { id: row.id, status: SendQueueStatus.processing, lockToken: token } });
				return 'canceled';
			}
			// no_identity → config error, fail.
			await terminal(row, SendQueueStatus.failed, EmailStatus.failed, outcome.reason);
			return 'failed';
		}
		case 'permanent_error': {
			await terminal(row, SendQueueStatus.failed, EmailStatus.failed, outcome.error);
			return 'failed';
		}
		case 'transient_error': {
			// attempts was bumped by beforeDispatch.
			if (row.attempts + 1 >= maxAttempts) {
				await terminal(row, SendQueueStatus.failed, EmailStatus.failed, outcome.error);
				return 'failed';
			}
			await prisma.emailSendQueue.updateMany({
				where: { id: row.id, status: SendQueueStatus.processing, lockToken: token },
				data: {
					status: SendQueueStatus.pending,
					lockedAt: null,
					lockToken: null,
					dispatchedAt: null,
					nextRetryAt: new Date(now.getTime() + backoffMs(row.attempts + 1)),
					failureReason: outcome.error,
				},
			});
			return 'retry';
		}
	}
}

async function terminal(
	row: EmailSendQueue,
	queueStatus: SendQueueStatus,
	emailStatus: EmailStatus,
	reason: string,
): Promise<void> {
	const flipped = await prisma.emailSendQueue.updateMany({
		where: { id: row.id, status: SendQueueStatus.processing, lockToken: row.lockToken },
		data: { status: queueStatus, failureReason: reason },
	});
	if (flipped.count > 0) {
		await prisma.email.updateMany({
			where: { id: row.emailId, status: EmailStatus.scheduled },
			data: { status: emailStatus },
		});
	}
}
