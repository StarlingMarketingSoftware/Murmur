// Integration tests for the send-queue WORKER. These hit a real Postgres (the
// status-guarded claim / atomic transitions can't be faithfully mocked), so they
// are NOT part of the pure unit suite. Run against a local dev DB with the new
// migration applied:
//
//   docker compose up -d                       # start local Postgres
//   npx prisma migrate deploy                  # apply 20260618000000_add_email_send_queue
//   node --import tsx --env-file=.env --test \
//     src/app/api/_utils/sendQueue/worker.integration.test.ts
//
// Mailgun is dependency-injected (no real sends) and the clock is injected, so the
// tests are deterministic. Each test creates + tears down its own fixtures under a
// unique clerkId, so they don't touch real data.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { EmailStatus, SendQueueStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { runSendQueueTick } from './worker';
import { cancelPendingQueuedSend, cancelQueuedSendsForCampaign } from './cancel';
import { localWallTimeToUtc, SENDER_REF_TZ } from './scheduler';

const PREFIX = `itest_sq_${Date.now()}_`;
let seq = 0;
const uid = () => `${PREFIX}${seq++}`;

// A weekday afternoon INSIDE the 11am–8pm ET window, so the worker dispatches.
const NOW = localWallTimeToUtc('2026-06-15', 15 * 60, SENDER_REF_TZ); // 3:00pm ET
const past = (mins: number) => new Date(NOW.getTime() - mins * 60_000);

async function makeUser(credits: number): Promise<string> {
	const clerkId = uid();
	await prisma.user.create({
		data: { clerkId, email: `${clerkId}@example.com`, sendingCredits: credits },
	});
	return clerkId;
}

async function makeCampaign(userId: string): Promise<number> {
	const c = await prisma.campaign.create({ data: { name: `${PREFIX}campaign`, userId } });
	return c.id;
}

// Creates a Contact + an Email (in the given status) + an EmailSendQueue row.
async function makeQueued(opts: {
	userId: string;
	campaignId: number;
	scheduledFor: Date;
	queueStatus?: SendQueueStatus;
	emailStatus?: EmailStatus;
	dispatchedAt?: Date | null;
	lockedAt?: Date | null;
	lockToken?: string | null;
}): Promise<{ emailId: number; queueId: number; contactId: number }> {
	const contact = await prisma.contact.create({
		data: { email: `${uid()}@example.com`, userId: opts.userId },
	});
	const email = await prisma.email.create({
		data: {
			subject: 'hi',
			message: '<p>hi</p>',
			status: opts.emailStatus ?? EmailStatus.scheduled,
			userId: opts.userId,
			campaignId: opts.campaignId,
			contactId: contact.id,
		},
	});
	const q = await prisma.emailSendQueue.create({
		data: {
			emailId: email.id,
			userId: opts.userId,
			campaignId: opts.campaignId,
			contactId: contact.id,
			status: opts.queueStatus ?? SendQueueStatus.pending,
			scheduledFor: opts.scheduledFor,
			capDay: '2026-06-15',
			dispatchedAt: opts.dispatchedAt ?? null,
			lockedAt: opts.lockedAt ?? null,
			lockToken: opts.lockToken ?? null,
		},
	});
	return { emailId: email.id, queueId: q.id, contactId: contact.id };
}

// Fake senders.
const sendOK = async (a: { beforeDispatch: () => Promise<void> }) => {
	await a.beforeDispatch();
	return { status: 'sent' as const, messageId: 'fake' };
};
const sendSuppressed = async (a: { beforeDispatch: () => Promise<void> }) => {
	await a.beforeDispatch();
	return { status: 'suppressed' as const };
};
const sendTransient = async (a: { beforeDispatch: () => Promise<void> }) => {
	await a.beforeDispatch();
	return { status: 'transient_error' as const, error: 'mailgun 502' };
};

after(async () => {
	// Nuke everything created under the test prefix.
	await prisma.emailSendQueue.deleteMany({ where: { userId: { startsWith: PREFIX } } });
	await prisma.email.deleteMany({ where: { userId: { startsWith: PREFIX } } });
	await prisma.contact.deleteMany({ where: { userId: { startsWith: PREFIX } } });
	await prisma.campaign.deleteMany({ where: { userId: { startsWith: PREFIX } } });
	await prisma.user.deleteMany({ where: { clerkId: { startsWith: PREFIX } } });
	await prisma.$disconnect();
});

before(async () => {
	// Fail fast with a clear message if the DB/migration isn't ready.
	try {
		await prisma.emailSendQueue.count();
	} catch (e) {
		throw new Error(
			'EmailSendQueue table not found — start local Postgres and run `npx prisma migrate deploy` first. ' +
				String(e),
		);
	}
});

test('sends a due row exactly once and charges exactly one credit', async () => {
	const userId = await makeUser(5);
	const campaignId = await makeCampaign(userId);
	const { emailId, queueId } = await makeQueued({ userId, campaignId, scheduledFor: past(10) });

	const r = await runSendQueueTick({ now: NOW, send: sendOK });
	assert.ok(r.sent >= 1);

	const q = await prisma.emailSendQueue.findUnique({ where: { id: queueId } });
	const e = await prisma.email.findUnique({ where: { id: emailId } });
	const u = await prisma.user.findUnique({ where: { clerkId: userId } });
	assert.equal(q?.status, SendQueueStatus.sent);
	assert.ok(q?.sentAt);
	assert.equal(e?.status, EmailStatus.sent);
	assert.equal(u?.sendingCredits, 4); // 5 − 1

	// Re-running must NOT re-send or re-charge (row no longer pending).
	const r2 = await runSendQueueTick({ now: NOW, send: sendOK });
	const u2 = await prisma.user.findUnique({ where: { clerkId: userId } });
	assert.equal(u2?.sendingCredits, 4);
	assert.equal(r2.sent, 0);
});

test('two concurrent ticks send a single row only once (at-most-once claim)', async () => {
	const userId = await makeUser(5);
	const campaignId = await makeCampaign(userId);
	const { queueId } = await makeQueued({ userId, campaignId, scheduledFor: past(10) });

	let sendCalls = 0;
	const countingSend = async (a: { beforeDispatch: () => Promise<void> }) => {
		sendCalls++;
		await a.beforeDispatch();
		return { status: 'sent' as const, messageId: 'fake' };
	};
	await Promise.all([
		runSendQueueTick({ now: NOW, send: countingSend }),
		runSendQueueTick({ now: NOW, send: countingSend }),
	]);

	// This row was sent at most once regardless of overlap.
	const sendsForRow = await prisma.emailSendQueue.findUnique({ where: { id: queueId } });
	assert.equal(sendsForRow?.status, SendQueueStatus.sent);
	const u = await prisma.user.findUnique({ where: { clerkId: userId } });
	assert.equal(u?.sendingCredits, 4); // charged exactly once
});

test('sweeper: undispatched stuck row → re-queued (never dropped)', async () => {
	const userId = await makeUser(5);
	const campaignId = await makeCampaign(userId);
	const { queueId } = await makeQueued({
		userId,
		campaignId,
		scheduledFor: past(60),
		queueStatus: SendQueueStatus.processing,
		dispatchedAt: null, // never dispatched
		lockedAt: past(30), // older than the 10-min stuck threshold
		lockToken: 'stale',
	});
	await runSendQueueTick({ now: NOW, send: sendOK });
	const q = await prisma.emailSendQueue.findUnique({ where: { id: queueId } });
	// It was claimed-but-undispatched → safely returned to pending (then possibly
	// re-sent in the same tick). Either way it must NOT be `failed`.
	assert.notEqual(q?.status, SendQueueStatus.failed);
});

test('sweeper: dispatched-but-unconfirmed stuck row → failed (never resent)', async () => {
	const userId = await makeUser(5);
	const campaignId = await makeCampaign(userId);
	const { emailId, queueId } = await makeQueued({
		userId,
		campaignId,
		scheduledFor: past(60),
		queueStatus: SendQueueStatus.processing,
		dispatchedAt: past(20), // dispatched, ambiguous
		lockedAt: past(20),
		lockToken: 'stale',
	});
	let sendCalls = 0;
	await runSendQueueTick({
		now: NOW,
		send: async (a) => {
			sendCalls++;
			await a.beforeDispatch();
			return { status: 'sent' as const, messageId: 'x' };
		},
	});
	const q = await prisma.emailSendQueue.findUnique({ where: { id: queueId } });
	const e = await prisma.email.findUnique({ where: { id: emailId } });
	assert.equal(q?.status, SendQueueStatus.failed); // never auto-resent
	assert.equal(e?.status, EmailStatus.failed);
	assert.equal(sendCalls, 0); // the sender was NOT invoked for the ambiguous row
});

test('per-sender daily cap: never sends more than perDayCap in a tick', async () => {
	const userId = await makeUser(1000);
	const campaignId = await makeCampaign(userId);
	for (let i = 0; i < 6; i++) {
		await makeQueued({ userId, campaignId, scheduledFor: past(10) });
	}
	// Cap to 3, large enough budget/maxSends to drain — assert the cap binds.
	const r = await runSendQueueTick({ now: NOW, send: sendOK, perDayCap: 3, maxSends: 100 });
	assert.equal(r.sent, 3);
	const sent = await prisma.emailSendQueue.count({
		where: { userId, status: SendQueueStatus.sent },
	});
	assert.equal(sent, 3);
});

test('off-hours: nothing is dispatched outside the 11am–8pm ET window', async () => {
	const userId = await makeUser(5);
	const campaignId = await makeCampaign(userId);
	await makeQueued({ userId, campaignId, scheduledFor: past(10) });
	const threeAmEt = localWallTimeToUtc('2026-06-15', 3 * 60, SENDER_REF_TZ);
	const r = await runSendQueueTick({ now: threeAmEt, send: sendOK });
	assert.equal(r.offHours, true);
	assert.equal(r.sent, 0);
});

test('suppressed → queue canceled + Email failed, no charge', async () => {
	const userId = await makeUser(5);
	const campaignId = await makeCampaign(userId);
	const { emailId, queueId } = await makeQueued({ userId, campaignId, scheduledFor: past(10) });
	await runSendQueueTick({ now: NOW, send: sendSuppressed });
	const q = await prisma.emailSendQueue.findUnique({ where: { id: queueId } });
	const e = await prisma.email.findUnique({ where: { id: emailId } });
	const u = await prisma.user.findUnique({ where: { clerkId: userId } });
	assert.equal(q?.status, SendQueueStatus.canceled);
	assert.equal(e?.status, EmailStatus.failed);
	assert.equal(u?.sendingCredits, 5); // not charged
});

test('transient error → row returns to pending with backoff + attempt counted', async () => {
	const userId = await makeUser(5);
	const campaignId = await makeCampaign(userId);
	const { queueId } = await makeQueued({ userId, campaignId, scheduledFor: past(10) });
	await runSendQueueTick({ now: NOW, send: sendTransient });
	const q = await prisma.emailSendQueue.findUnique({ where: { id: queueId } });
	assert.equal(q?.status, SendQueueStatus.pending);
	assert.equal(q?.attempts, 1);
	assert.ok(q?.nextRetryAt && q.nextRetryAt.getTime() > NOW.getTime());
	assert.equal(q?.dispatchedAt, null); // reset for the retry
});

test('cancel: deletes pending rows for a campaign and restores Emails to draft', async () => {
	const userId = await makeUser(5);
	const campaignId = await makeCampaign(userId);
	const a = await makeQueued({ userId, campaignId, scheduledFor: past(10) });
	const b = await makeQueued({ userId, campaignId, scheduledFor: past(5) });

	const removed = await cancelQueuedSendsForCampaign(campaignId);
	assert.equal(removed, 2);
	assert.equal(await prisma.emailSendQueue.count({ where: { campaignId } }), 0);
	const ea = await prisma.email.findUnique({ where: { id: a.emailId } });
	const eb = await prisma.email.findUnique({ where: { id: b.emailId } });
	assert.equal(ea?.status, EmailStatus.draft);
	assert.equal(eb?.status, EmailStatus.draft);
});

test('cancel one queued send: deletes only a pending row and restores its Email to draft', async () => {
	const userId = await makeUser(5);
	const campaignId = await makeCampaign(userId);
	const pending = await makeQueued({ userId, campaignId, scheduledFor: past(10) });
	const processing = await makeQueued({
		userId,
		campaignId,
		scheduledFor: past(5),
		queueStatus: SendQueueStatus.processing,
		lockedAt: NOW,
		lockToken: 'locked',
	});

	assert.equal(
		await cancelPendingQueuedSend({ queueId: pending.queueId, campaignId, userId }),
		true
	);
	assert.equal(
		await cancelPendingQueuedSend({ queueId: processing.queueId, campaignId, userId }),
		false
	);

	assert.equal(await prisma.emailSendQueue.count({ where: { id: pending.queueId } }), 0);
	assert.equal(await prisma.emailSendQueue.count({ where: { id: processing.queueId } }), 1);
	const pendingEmail = await prisma.email.findUnique({ where: { id: pending.emailId } });
	const processingEmail = await prisma.email.findUnique({
		where: { id: processing.emailId },
	});
	assert.equal(pendingEmail?.status, EmailStatus.draft);
	assert.equal(processingEmail?.status, EmailStatus.scheduled);
});

test('credit-blocked (0 credits) does not send and reschedules', async () => {
	const userId = await makeUser(0); // no credits
	const campaignId = await makeCampaign(userId);
	const { emailId, queueId } = await makeQueued({ userId, campaignId, scheduledFor: past(10) });
	let sendCalls = 0;
	await runSendQueueTick({
		now: NOW,
		send: async (a) => {
			sendCalls++;
			await a.beforeDispatch();
			return { status: 'sent' as const, messageId: 'x' };
		},
	});
	assert.equal(sendCalls, 0); // never dispatched without credits
	const q = await prisma.emailSendQueue.findUnique({ where: { id: queueId } });
	const e = await prisma.email.findUnique({ where: { id: emailId } });
	assert.equal(q?.status, SendQueueStatus.pending); // rescheduled, not sent
	assert.equal(q?.creditRescheduleCount, 1);
	assert.equal(e?.status, EmailStatus.scheduled);
});
