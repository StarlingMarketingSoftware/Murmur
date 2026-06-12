import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { convertHtmlToPlainText, formatHTMLForEmailClients } from '@/utils';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/api/_utils';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import { buildUnsubscribeToken } from '@/app/api/_utils/unsubscribe';
import {
	renderNewMessageEmailHtml,
	renderNewMessageEmailText,
} from '@/app/api/_utils/emailTemplates/newMessage';
import { BASE_URL } from '@/constants/ui';
import { z } from 'zod';

const postMailgunSchema = z
	.object({
		recipientEmail: z.string().email(),
		subject: z.string(),
		message: z.string().min(1),
		senderEmail: z.string().email(),
		senderName: z.string().min(1),
		originEmail: z.string().email().optional().nullable(),
		replyToEmail: z.string().email().optional(),
		// Cold-outreach sends use the branded "You have 1 new message" template;
		// the route fetches the campaign identity/profile server-side.
		template: z.literal('newMessage').optional(),
		campaignId: z.number().int().positive().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.template === undefined && data.subject.trim() === '') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['subject'],
				message: 'Subject is required',
			});
		}
		if (data.template !== undefined && data.campaignId === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['campaignId'],
				message: 'campaignId is required for templated sends',
			});
		}
	});
export type PostMailgunData = z.infer<typeof postMailgunSchema>;

export async function POST(request: Request) {
	try {
		const limited = await withRateLimit(request, 'paid-external', 'mailgun');
		if (limited) return limited;

		// Auth gates BOTH branches — the generic (non-template) send must not be an open relay.
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await request.json();
		const validatedData = postMailgunSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const {
			recipientEmail,
			subject,
			message,
			senderName,
			originEmail: specifiedOriginEmail,
			replyToEmail,
			template,
			campaignId,
		} = validatedData.data;

		// Server-side credit gate (check-only; the client performs the decrement).
		// Only campaign cold sends ('newMessage') consume sending credits — replies to
		// inbound mail use the generic branch and are intentionally NOT gated.
		if (template === 'newMessage') {
			const sender = await prisma.user.findUnique({
				where: { clerkId: userId },
				select: { sendingCredits: true },
			});
			if (!sender) {
				return apiUnauthorized();
			}
			if (sender.sendingCredits <= 0) {
				return apiBadRequest('No sending credits remaining');
			}
		}

		let outgoingSubject = subject;
		let fromName = senderName;
		let html: string;
		let text: string;
		const extraHeaders: Record<string, string> = {};

		if (template === 'newMessage') {
			const campaign = await prisma.campaign.findUnique({
				where: { id: campaignId! },
				include: { identity: true },
			});
			if (!campaign || campaign.userId !== userId) {
				return apiUnauthorizedResource();
			}
			if (!campaign.identity) {
				return apiBadRequest('Campaign has no identity configured');
			}

			const recipient = recipientEmail.toLowerCase();
			const suppressed = await prisma.emailSuppression.findUnique({
				where: { email_userId: { email: recipient, userId } },
			});
			if (suppressed) {
				return apiResponse({
					success: false,
					suppressed: true,
					error: 'Recipient has unsubscribed',
				});
			}

			const video = await prisma.mediaAsset.findFirst({
				where: { userId, kind: 'video', context: 'profile_media', status: 'ready' },
				orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
			});

			const token = buildUnsubscribeToken({ email: recipient, userId });
			const unsubscribeUrl = `${BASE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
			const viewMessagesUrl = `${BASE_URL}/venue`;
			const innerHtml = formatHTMLForEmailClients(message);
			const artistName = campaign.identity.name?.trim() || senderName;

			html = renderNewMessageEmailHtml({
				artistName,
				draftSubject: subject,
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
			text = renderNewMessageEmailText({
				draftSubject: subject,
				messageText: convertHtmlToPlainText(innerHtml),
				displayName: campaign.identity.bandName?.trim() || artistName,
				viewMessagesUrl,
				unsubscribeUrl,
			});
			outgoingSubject = 'You have 1 new message';
			fromName = 'Murmur';
			extraHeaders['h:List-Unsubscribe'] =
				`<${BASE_URL}/api/webhooks/unsubscribe?token=${encodeURIComponent(token)}>`;
			extraHeaders['h:List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
		} else {
			html = formatHTMLForEmailClients(message);
			text = convertHtmlToPlainText(html);
		}

		const mailgun = new Mailgun(FormData);
		const mg = mailgun.client({
			username: 'api',
			key: process.env.MAILGUN_API_KEY || '',
		});

		const originEmail = specifiedOriginEmail ?? 'postmaster@murmurmailbox.com';

		const mailgunData = await mg.messages.create('murmurmailbox.com', {
			'h:Reply-To': replyToEmail ?? originEmail,
			'h:Sender': originEmail,
			'h:X-Mailgun-Dkim-Signature': 'yes',
			'h:Message-ID': `<${Date.now()}.${Math.random().toString(36).slice(2)}@${
				originEmail.split('@')[1]
			}>`,
			...extraHeaders,
			from: `"${fromName}" <${originEmail}>`,
			to: [recipientEmail],
			subject: outgoingSubject,
			html,
			text,
		});

		return apiResponse({ success: true, data: mailgunData });
	} catch (error) {
		return handleApiError(error);
	}
}
