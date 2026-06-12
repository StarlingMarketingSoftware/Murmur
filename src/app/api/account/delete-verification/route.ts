import crypto from 'node:crypto';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import {
	apiNotFound,
	apiResponse,
	apiTooManyRequests,
	apiUnauthorized,
	getUser,
	handleApiError,
} from '@/app/api/_utils';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import {
	renderDeletionCodeEmailHtml,
	renderDeletionCodeEmailText,
} from '@/app/api/_utils/emailTemplates/deletionCode';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_INTERVAL_MS = 60 * 1000;

// No request body — the code always goes to the signed-in user's own email.
export type PostDeleteVerificationResponse = {
	success: true;
	/** ISO timestamp after which the UI may offer Resend again. */
	resendAvailableAt: string;
	expiresAt: string;
};

export async function POST(request: Request) {
	try {
		const limited = await withRateLimit(
			request,
			'mutation',
			'account-delete-verification',
			{ user: [{ tokens: 6, window: '3600 s' }] }
		);
		if (limited) return limited;

		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const user = await getUser();
		if (!user?.email) {
			return apiNotFound('User record not found');
		}
		const email = user.email.toLowerCase();

		// Deterministic resend guard (works without Upstash): newest code must be
		// at least RESEND_INTERVAL_MS old before another send is allowed.
		const latest = await prisma.emailVerificationCode.findFirst({
			where: { email },
			orderBy: { createdAt: 'desc' },
			select: { createdAt: true },
		});
		if (latest) {
			const elapsedMs = Date.now() - latest.createdAt.getTime();
			if (elapsedMs < RESEND_INTERVAL_MS) {
				const retryAfter = Math.ceil((RESEND_INTERVAL_MS - elapsedMs) / 1000);
				return apiTooManyRequests(
					`Please wait ${retryAfter}s before requesting another code.`,
					retryAfter
				);
			}
		}

		// randomInt's upper bound is exclusive, so this spans 100000–999999 inclusive.
		const code = crypto.randomInt(100000, 1000000).toString();
		const expiresAt = new Date(Date.now() + CODE_TTL_MS);

		// Supersede: the latest code is the only valid one. Also clears stale
		// verified rows from an abandoned earlier attempt so they can't be replayed.
		await prisma.emailVerificationCode.deleteMany({ where: { email } });
		await prisma.emailVerificationCode.create({ data: { email, code, expiresAt } });

		const mailgun = new Mailgun(FormData);
		const mg = mailgun.client({
			username: 'api',
			key: process.env.MAILGUN_API_KEY || '',
		});

		const originEmail = 'postmaster@murmurmailbox.com';
		await mg.messages.create('murmurmailbox.com', {
			'h:Sender': originEmail,
			'h:X-Mailgun-Dkim-Signature': 'yes',
			'h:Message-ID': `<${Date.now()}.${Math.random().toString(36).slice(2)}@murmurmailbox.com>`,
			from: `"Murmur" <${originEmail}>`,
			to: [email],
			subject: 'Your Murmur confirmation code',
			html: renderDeletionCodeEmailHtml({ code, expiresMinutes: 10 }),
			text: renderDeletionCodeEmailText({ code, expiresMinutes: 10 }),
		});

		return apiResponse<PostDeleteVerificationResponse>({
			success: true,
			resendAvailableAt: new Date(Date.now() + RESEND_INTERVAL_MS).toISOString(),
			expiresAt: expiresAt.toISOString(),
		});
	} catch (error) {
		return handleApiError(error);
	}
}
