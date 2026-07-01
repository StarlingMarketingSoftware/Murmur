// Integration tests for send-queue MODERATION (sweep, verdict cache, flag flow,
// fail-closed holds). Same harness as worker.integration.test.ts — real local
// Postgres (the status-guarded deletes/flips can't be faithfully mocked), fake
// injected LLM + Mailgun, injected clock:
//
//   docker compose up -d
//   npx prisma migrate deploy      # needs 20260701120000_add_email_moderation_verdict
//   node --import tsx --env-file=.env --test \
//     src/app/api/_utils/sendQueue/moderation.integration.test.ts
//
// NOTE: flag-on ticks sweep ALL due pending rows in the DB (the sweep is not
// test-scoped, same as the worker tests' claim loop) — run against a local
// throwaway DB, not shared dev data. EMAIL_MODERATION_ENABLED is set/unset
// per test (the flag is read at call time).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { EmailStatus, ModerationVerdict, SendQueueStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { runSendQueueTick } from './worker';
import { localWallTimeToUtc, SENDER_REF_TZ } from './scheduler';
import {
	MODERATION_HOLD_REASON,
	MODERATION_HOLD_RETRY_MS,
	MODERATION_PROMPT_VERSION,
	contentHash,
	moderateEmailContent,
	returnQueueRowToDrafts,
	type ModerationLlmFetch,
} from './moderation';

const PREFIX = `itest_mod_${Date.now()}_`;
let seq = 0;
const uid = () => `${PREFIX}${seq++}`;

// A weekday afternoon INSIDE the 11am–8pm ET window, so the worker dispatches.
const NOW = localWallTimeToUtc('2026-06-15', 15 * 60, SENDER_REF_TZ); // 3:00pm ET
const past = (mins: number) => new Date(NOW.getTime() - mins * 60_000);

// Fixture content (must match makeQueued's Email row for cache-hit tests).
const SUBJECT = 'hi';
const MESSAGE = '<p>hi</p>';

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

async function makeQueued(opts: {
	userId: string;
	campaignId: number;
	scheduledFor: Date;
	queueStatus?: SendQueueStatus;
	failureReason?: string | null;
}): Promise<{ emailId: number; queueId: number; contactId: number }> {
	const contact = await prisma.contact.create({
		data: { email: `${uid()}@example.com`, userId: opts.userId },
	});
	const email = await prisma.email.create({
		data: {
			subject: SUBJECT,
			message: MESSAGE,
			status: EmailStatus.scheduled,
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
			failureReason: opts.failureReason ?? null,
		},
	});
	return { emailId: email.id, queueId: q.id, contactId: contact.id };
}

// Fake LLM ladders.
const llmFlag: ModerationLlmFetch = async () => ({
	raw: '{"verdict":"flag","categories":["harassment"],"reason":"insulting","confidence":0.95}',
	model: 'fake/flagger',
});
const llmPass: ModerationLlmFetch = async () => ({
	raw: '{"verdict":"pass","categories":[],"reason":"fine","confidence":0.9}',
	model: 'fake/passer',
});
const llmDown: ModerationLlmFetch = async () => {
	throw new Error('provider outage');
};

// Fake senders.
const sendOK = async (a: { beforeDispatch: () => Promise<void> }) => {
	await a.beforeDispatch();
	return { status: 'sent' as const, messageId: 'fake' };
};

const flagOn = () => {
	process.env.EMAIL_MODERATION_ENABLED = 'true';
	// Deterministic sweep bounds regardless of local env.
	process.env.MODERATION_MAX_PER_TICK = '50';
	process.env.MODERATION_TICK_BUDGET_MS = '15000';
};
const flagOff = () => {
	delete process.env.EMAIL_MODERATION_ENABLED;
	delete process.env.MODERATION_MAX_PER_TICK;
	delete process.env.MODERATION_TICK_BUDGET_MS;
};

after(async () => {
	flagOff();
	await prisma.emailModerationVerdict.deleteMany({ where: { userId: { startsWith: PREFIX } } });
	await prisma.emailSendQueue.deleteMany({ where: { userId: { startsWith: PREFIX } } });
	await prisma.email.deleteMany({ where: { userId: { startsWith: PREFIX } } });
	await prisma.contact.deleteMany({ where: { userId: { startsWith: PREFIX } } });
	await prisma.campaign.deleteMany({ where: { userId: { startsWith: PREFIX } } });
	await prisma.user.deleteMany({ where: { clerkId: { startsWith: PREFIX } } });
	await prisma.$disconnect();
});

before(async () => {
	try {
		await prisma.emailModerationVerdict.count();
	} catch (e) {
		throw new Error(
			'EmailModerationVerdict table not found — run `npx prisma migrate deploy` first. ' +
				String(e),
		);
	}
});

// ── Pure-ish units (no DB writes) ────────────────────────────────────────────

test('contentHash: stable for identical content, sensitive to any edit', () => {
	assert.equal(contentHash('a', 'b'), contentHash('a', 'b'));
	assert.notEqual(contentHash('a', 'b'), contentHash('a', 'b '));
	assert.notEqual(contentHash('a', 'b'), contentHash('a2', 'b'));
	// The NUL separator means (subject, message) boundaries can't collide.
	assert.notEqual(contentHash('ab', 'c'), contentHash('a', 'bc'));
});

test('moderateEmailContent: parses fenced/wrapped JSON, maps pass/flag', async () => {
	const fenced: ModerationLlmFetch = async () => ({
		raw: 'Sure! ```json\n{"verdict":"flag","categories":["threats","bogus_category"],"reason":"r","confidence":0.8}\n```',
		model: 'fake',
	});
	const r = await moderateEmailContent('s', '<p>m</p>', fenced);
	assert.equal(r.verdict, ModerationVerdict.flagged);
	assert.deepEqual(r.categories, ['threats']); // unknown categories filtered, never fatal
	const p = await moderateEmailContent('s', '<p>m</p>', llmPass);
	assert.equal(p.verdict, ModerationVerdict.approved);
});

test('moderateEmailContent: lenient metadata, strict verdict', async () => {
	// Missing confidence/categories/reason → defaults, not a failure.
	const sparse: ModerationLlmFetch = async () => ({
		raw: '{"verdict":"pass"}',
		model: 'fake',
	});
	const r = await moderateEmailContent('s', 'm', sparse);
	assert.equal(r.verdict, ModerationVerdict.approved);
	assert.equal(r.confidence, 0.5);
	// Malformed / missing / unknown verdict → throws (fail-closed, never a default verdict).
	for (const raw of ['not json at all', '{"reason":"no verdict"}', '{"verdict":"maybe"}']) {
		const bad: ModerationLlmFetch = async () => ({ raw, model: 'fake' });
		await assert.rejects(() => moderateEmailContent('s', 'm', bad));
	}
});

// ── Sweep + flag flow ────────────────────────────────────────────────────────

test('sweep flags a pending row → returned to Drafts, verdict persisted, never sent', async () => {
	flagOn();
	try {
		const userId = await makeUser(5);
		const campaignId = await makeCampaign(userId);
		const { emailId, queueId } = await makeQueued({ userId, campaignId, scheduledFor: past(10) });

		const sentQueueIds: number[] = [];
		const r = await runSendQueueTick({
			now: NOW,
			moderationLlmFetch: llmFlag,
			send: async (a) => {
				sentQueueIds.push(a.queueId);
				await a.beforeDispatch();
				return { status: 'sent' as const, messageId: 'x' };
			},
		});

		assert.ok(r.modFlagged >= 1);
		assert.equal(await prisma.emailSendQueue.count({ where: { id: queueId } }), 0); // row deleted
		const e = await prisma.email.findUnique({ where: { id: emailId } });
		assert.equal(e?.status, EmailStatus.draft); // back in Drafts
		assert.ok(!sentQueueIds.includes(queueId)); // never dispatched
		const v = await prisma.emailModerationVerdict.findUnique({
			where: {
				emailId_contentHash_promptVersion: {
					emailId,
					contentHash: contentHash(SUBJECT, MESSAGE),
					promptVersion: MODERATION_PROMPT_VERSION,
				},
			},
		});
		assert.equal(v?.verdict, ModerationVerdict.flagged); // audit row, reason server-side
		assert.equal(v?.reason, 'insulting');
		const u = await prisma.user.findUnique({ where: { clerkId: userId } });
		assert.equal(u?.sendingCredits, 5); // never charged
	} finally {
		flagOff();
	}
});

test('sweep approves → verdict cached and the row dispatches in the same tick', async () => {
	flagOn();
	try {
		const userId = await makeUser(5);
		const campaignId = await makeCampaign(userId);
		const { emailId, queueId } = await makeQueued({ userId, campaignId, scheduledFor: past(10) });

		await runSendQueueTick({ now: NOW, moderationLlmFetch: llmPass, send: sendOK });

		const q = await prisma.emailSendQueue.findUnique({ where: { id: queueId } });
		assert.equal(q?.status, SendQueueStatus.sent);
		const e = await prisma.email.findUnique({ where: { id: emailId } });
		assert.equal(e?.status, EmailStatus.sent);
		const v = await prisma.emailModerationVerdict.findFirst({ where: { emailId } });
		assert.equal(v?.verdict, ModerationVerdict.approved);
	} finally {
		flagOff();
	}
});

test('LLM down → fail-closed: nothing persisted, held row released with nextRetryAt', async () => {
	flagOn();
	try {
		const userId = await makeUser(5);
		const campaignId = await makeCampaign(userId);
		const { emailId, queueId } = await makeQueued({ userId, campaignId, scheduledFor: past(10) });

		// Sweep fails (llmDown, no verdict row). The claim loop then claims the
		// still-eligible row; simulate the real sender gate's fail-closed answer.
		await runSendQueueTick({
			now: NOW,
			moderationLlmFetch: llmDown,
			send: async () => ({ status: 'moderation_hold' as const }),
		});

		assert.equal(await prisma.emailModerationVerdict.count({ where: { emailId } }), 0); // failures never persisted
		const q = await prisma.emailSendQueue.findUnique({ where: { id: queueId } });
		assert.equal(q?.status, SendQueueStatus.pending); // released, not stuck in processing
		assert.equal(q?.lockToken, null);
		assert.equal(q?.dispatchedAt, null);
		assert.equal(q?.attempts, 0); // Mailgun-only counter untouched
		assert.equal(q?.failureReason, MODERATION_HOLD_REASON);
		assert.equal(q?.nextRetryAt?.getTime(), NOW.getTime() + MODERATION_HOLD_RETRY_MS);
		const e = await prisma.email.findUnique({ where: { id: emailId } });
		assert.equal(e?.status, EmailStatus.scheduled); // still queued, just held
	} finally {
		flagOff();
	}
});

test('dispatch-gate flagged outcome → processing row pulled to Drafts under lockToken guard', async () => {
	flagOn();
	try {
		const userId = await makeUser(5);
		const campaignId = await makeCampaign(userId);
		const { emailId, queueId } = await makeQueued({ userId, campaignId, scheduledFor: past(10) });

		// Sweep can't judge (llmDown, writes nothing, leaves nextRetryAt null) so
		// the claim loop claims the row; the (simulated) sender gate flags it.
		await runSendQueueTick({
			now: NOW,
			moderationLlmFetch: llmDown,
			send: async () => ({ status: 'moderation_flagged' as const }),
		});

		assert.equal(await prisma.emailSendQueue.count({ where: { id: queueId } }), 0);
		const e = await prisma.email.findUnique({ where: { id: emailId } });
		assert.equal(e?.status, EmailStatus.draft);
	} finally {
		flagOff();
	}
});

test('cached flagged verdict → instant return to Drafts with zero LLM calls for that content', async () => {
	flagOn();
	try {
		const userId = await makeUser(5);
		const campaignId = await makeCampaign(userId);
		const { emailId, queueId, contactId } = await makeQueued({
			userId,
			campaignId,
			scheduledFor: past(10),
		});
		await prisma.emailModerationVerdict.create({
			data: {
				emailId,
				userId,
				campaignId,
				contactId,
				contentHash: contentHash(SUBJECT, MESSAGE),
				promptVersion: MODERATION_PROMPT_VERSION,
				verdict: ModerationVerdict.flagged,
				reason: 'previously flagged',
				model: 'fake/flagger',
			},
		});

		// The fake ladder REJECTS any call carrying our fixture content — the
		// cache path must resolve this row without consulting the LLM.
		const llmRejectOurs: ModerationLlmFetch = async (_system, user) => {
			if (user.includes(SUBJECT)) throw new Error('cache path must not call the LLM');
			return { raw: '{"verdict":"pass","categories":[],"reason":"","confidence":1}', model: 'fake' };
		};
		const r = await runSendQueueTick({ now: NOW, moderationLlmFetch: llmRejectOurs, send: sendOK });

		assert.ok(r.modCacheHits >= 1);
		assert.equal(await prisma.emailSendQueue.count({ where: { id: queueId } }), 0);
		const e = await prisma.email.findUnique({ where: { id: emailId } });
		assert.equal(e?.status, EmailStatus.draft);
	} finally {
		flagOff();
	}
});

test('stale verdicts do not match: edited content and old prompt versions re-moderate', async () => {
	flagOn();
	try {
		const userId = await makeUser(5);
		const campaignId = await makeCampaign(userId);
		const { emailId, queueId, contactId } = await makeQueued({
			userId,
			campaignId,
			scheduledFor: past(10),
		});
		// Approved — but for DIFFERENT content (as if approved, then edited)…
		await prisma.emailModerationVerdict.create({
			data: {
				emailId,
				userId,
				campaignId,
				contactId,
				contentHash: contentHash('old subject', 'old body'),
				promptVersion: MODERATION_PROMPT_VERSION,
				verdict: ModerationVerdict.approved,
				model: 'fake',
			},
		});
		// …and flagged — but under an ORPHANED older prompt version.
		await prisma.emailModerationVerdict.create({
			data: {
				emailId,
				userId,
				campaignId,
				contactId,
				contentHash: contentHash(SUBJECT, MESSAGE),
				promptVersion: MODERATION_PROMPT_VERSION - 1,
				verdict: ModerationVerdict.flagged,
				model: 'fake',
			},
		});

		let llmCallsForOurs = 0;
		const llm: ModerationLlmFetch = async (_system, user) => {
			if (user.includes(SUBJECT)) llmCallsForOurs++;
			return {
				raw: '{"verdict":"flag","categories":["scam_or_deception"],"reason":"fresh flag","confidence":0.9}',
				model: 'fake',
			};
		};
		await runSendQueueTick({ now: NOW, moderationLlmFetch: llm, send: sendOK });

		assert.ok(llmCallsForOurs >= 1); // neither stale row satisfied the gate
		assert.equal(await prisma.emailSendQueue.count({ where: { id: queueId } }), 0); // fresh flag won
		const e = await prisma.email.findUnique({ where: { id: emailId } });
		assert.equal(e?.status, EmailStatus.draft);
	} finally {
		flagOff();
	}
});

test('flag OFF → byte-for-byte passthrough: no sweep, no verdicts, row just sends', async () => {
	flagOff();
	const userId = await makeUser(5);
	const campaignId = await makeCampaign(userId);
	const { emailId, queueId } = await makeQueued({ userId, campaignId, scheduledFor: past(10) });

	const llmNever: ModerationLlmFetch = async () => {
		throw new Error('moderation must not run while the flag is off');
	};
	const r = await runSendQueueTick({ now: NOW, moderationLlmFetch: llmNever, send: sendOK });

	assert.equal(r.modChecked, 0);
	assert.equal(r.modLlmCalls, 0);
	const q = await prisma.emailSendQueue.findUnique({ where: { id: queueId } });
	assert.equal(q?.status, SendQueueStatus.sent);
	assert.equal(await prisma.emailModerationVerdict.count({ where: { emailId } }), 0);
});

test('returnQueueRowToDrafts: lost race → false, Email untouched', async () => {
	const userId = await makeUser(5);
	const campaignId = await makeCampaign(userId);
	const { emailId, queueId } = await makeQueued({ userId, campaignId, scheduledFor: past(10) });
	await prisma.emailSendQueue.delete({ where: { id: queueId } }); // e.g. user canceled first

	const returned = await returnQueueRowToDrafts({
		queueId,
		emailId,
		userId,
		guard: { status: 'pending' },
	});
	assert.equal(returned, false);
	const e = await prisma.email.findUnique({ where: { id: emailId } });
	assert.equal(e?.status, EmailStatus.scheduled); // NOT flipped on a lost race
});

test('held-too-long bailout: moderation-held rows past the hold window return to Drafts silently', async () => {
	flagOn();
	try {
		const userId = await makeUser(5);
		const campaignId = await makeCampaign(userId);
		// Held row whose scheduledFor is 5 days past (default MODERATION_MAX_HOLD_DAYS = 3).
		const { emailId, queueId } = await makeQueued({
			userId,
			campaignId,
			scheduledFor: past(5 * 24 * 60),
			failureReason: MODERATION_HOLD_REASON,
		});

		await runSendQueueTick({ now: NOW, moderationLlmFetch: llmDown, send: sendOK });

		assert.equal(await prisma.emailSendQueue.count({ where: { id: queueId } }), 0);
		const e = await prisma.email.findUnique({ where: { id: emailId } });
		assert.equal(e?.status, EmailStatus.draft);
		// Silent: content was never judged, so no verdict row (a synthetic flagged
		// row would wrongly block re-enqueue).
		assert.equal(await prisma.emailModerationVerdict.count({ where: { emailId } }), 0);
	} finally {
		flagOff();
	}
});
