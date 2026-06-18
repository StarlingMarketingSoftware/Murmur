// Server-only cold-campaign email send, extracted from /api/mailgun so the cron
// worker can dispatch without a Clerk session. It re-derives EVERYTHING from the
// live Email/Campaign/identity/suppression at send time (never a stale snapshot),
// uses a DETERMINISTIC Message-ID per queue row, and does NOT touch credits — the
// worker owns the dispatchedAt→send→decrement→markSent ordering via `beforeDispatch`.

import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import prisma from '@/lib/prisma';
import { convertHtmlToPlainText, formatHTMLForEmailClients } from '@/utils';
import { buildUnsubscribeToken } from '@/app/api/_utils/unsubscribe';
import {
	renderNewMessageEmailHtml,
	renderNewMessageEmailText,
} from '@/app/api/_utils/emailTemplates/newMessage';
import { BASE_URL } from '@/constants/ui';

const MAILGUN_DOMAIN = 'murmurmailbox.com';
const DEFAULT_ORIGIN = 'postmaster@murmurmailbox.com';

// Minimal shape we depend on (avoids importing mailgun.js internal types).
type MailgunLike = {
	messages: { create: (domain: string, data: Record<string, unknown>) => Promise<{ id?: string }> };
};

// Instantiate the Mailgun client ONCE per process (the /api/mailgun route makes a
// fresh client per request; the worker sends many per tick, so reuse it).
let _mg: MailgunLike | null = null;
function mailgunClient(): MailgunLike {
	if (!_mg) {
		const mailgun = new Mailgun(FormData);
		_mg = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY || '' }) as unknown as MailgunLike;
	}
	return _mg;
}

export type SkipReason = 'email_gone' | 'contact_gone' | 'campaign_inactive' | 'no_identity';

export type SendOutcome =
	| { status: 'sent'; messageId: string }
	| { status: 'suppressed' }
	| { status: 'skipped'; reason: SkipReason }
	| { status: 'transient_error'; error: string }
	| { status: 'permanent_error'; error: string };

export type SendArgs = {
	queueId: number; // for the deterministic Message-ID
	emailId: number;
	userId: string; // sender clerkId
	// Worker hook: set dispatchedAt IMMEDIATELY before the Mailgun call so a crash
	// after this point is treated as "maybe delivered" (never auto-resent).
	beforeDispatch: () => Promise<void>;
	// Test seam: inject a fake Mailgun-create. Defaults to the real client.
	createMessage?: (domain: string, data: Record<string, unknown>) => Promise<{ id?: string }>;
};

// A 4xx (except 429) from Mailgun is a permanent reject (bad address etc.); 429 /
// 5xx / network failures are transient and worth a backoff retry.
function classifyError(error: unknown): 'transient_error' | 'permanent_error' {
	const status = (error as { status?: number })?.status;
	if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
		return 'permanent_error';
	}
	return 'transient_error';
}

function errorMessage(error: unknown): string {
	if (error instanceof Error) return error.message.slice(0, 480);
	return String(error).slice(0, 480);
}

export async function sendCampaignEmail(args: SendArgs): Promise<SendOutcome> {
	const { queueId, emailId, userId, beforeDispatch } = args;

	const email = await prisma.email.findUnique({
		where: { id: emailId },
		include: { contact: true, campaign: { include: { identity: true } } },
	});
	if (!email) return { status: 'skipped', reason: 'email_gone' };
	if (!email.contact) return { status: 'skipped', reason: 'contact_gone' };
	const campaign = email.campaign;
	if (!campaign || campaign.status !== 'active') return { status: 'skipped', reason: 'campaign_inactive' };
	if (!campaign.identity) return { status: 'skipped', reason: 'no_identity' };

	const recipient = email.contact.email.toLowerCase();
	const suppressed = await prisma.emailSuppression.findUnique({
		where: { email_userId: { email: recipient, userId } },
	});
	if (suppressed) return { status: 'suppressed' };

	const [user, video] = await Promise.all([
		prisma.user.findUnique({
			where: { clerkId: userId },
			select: { customDomain: true, murmurEmail: true, replyToEmail: true },
		}),
		prisma.mediaAsset.findFirst({
			where: { userId, kind: 'video', context: 'profile_media', status: 'ready' },
			orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
		}),
	]);

	const originEmail = user?.customDomain || user?.murmurEmail || DEFAULT_ORIGIN;
	const replyToEmail = user?.replyToEmail || user?.murmurEmail || originEmail;
	const artistName = campaign.identity.name?.trim() || campaign.identity.name || 'Murmur';

	const token = buildUnsubscribeToken({ email: recipient, userId });
	const unsubscribeUrl = `${BASE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
	const viewMessagesUrl = `${BASE_URL}/venue`;
	const innerHtml = formatHTMLForEmailClients(email.message);

	const html = renderNewMessageEmailHtml({
		artistName,
		draftSubject: email.subject,
		messageHtml: innerHtml,
		genre: campaign.identity.genre,
		bandName: campaign.identity.bandName,
		area: campaign.identity.area,
		bio: campaign.identity.bio,
		videoShareUrl: video ? `${BASE_URL}/v/${video.shareId}` : null,
		viewMessagesUrl,
		unsubscribeUrl,
		assetBaseUrl: BASE_URL,
	});
	const text = renderNewMessageEmailText({
		draftSubject: email.subject,
		messageText: convertHtmlToPlainText(innerHtml),
		displayName: campaign.identity.bandName?.trim() || artistName,
		viewMessagesUrl,
		unsubscribeUrl,
	});

	const messageData: Record<string, unknown> = {
		'h:Reply-To': replyToEmail,
		'h:Sender': originEmail,
		'h:X-Mailgun-Dkim-Signature': 'yes',
		// Deterministic per queue row — a duplicate submission carries the same id
		// (forensic dedup; the row-level claim is the real exactly-once guard).
		'h:Message-ID': `<murmur-queue-${queueId}@${MAILGUN_DOMAIN}>`,
		'h:List-Unsubscribe': `<${BASE_URL}/api/webhooks/unsubscribe?token=${encodeURIComponent(token)}>`,
		'h:List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
		from: `"Murmur" <${originEmail}>`,
		to: [email.contact.email],
		subject: 'You have 1 new message',
		html,
		text,
	};

	// Mark dispatchedAt right before the irreversible send.
	await beforeDispatch();

	try {
		const create = args.createMessage ?? ((domain, d) => mailgunClient().messages.create(domain, d));
		const result = await create(MAILGUN_DOMAIN, messageData);
		return { status: 'sent', messageId: result?.id ?? `<murmur-queue-${queueId}@${MAILGUN_DOMAIN}>` };
	} catch (error) {
		return { status: classifyError(error), error: errorMessage(error) };
	}
}
