import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import {
	formatHTMLForEmailClients,
	replacePTagsInSignature,
} from '@/app/utils/htmlFormatting';
import { auth } from '@clerk/nextjs/server';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/utils/api';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const postMailgunSchema = z.object({
	recipientEmail: z.string().email(),
	subject: z.string().min(1),
	message: z.string().min(1),
	senderEmail: z.string().email(),
	senderName: z.string().min(1),
});
export type PostMailgunData = z.infer<typeof postMailgunSchema>;

export async function POST(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await request.json();
		const validatedData = postMailgunSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}
		const { recipientEmail, subject, message, senderEmail, senderName } =
			validatedData.data;

		const mailgun = new Mailgun(FormData);
		const mg = mailgun.client({
			username: 'api',
			key: process.env.MAILGUN_API_KEY || '',
		});

		const messageNoMargin = formatHTMLForEmailClients(message);

		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
		});

		if (!user) {
			return apiNotFound('User not found or Murmur email not set');
		}
		if (!user.murmurEmail) {
			return apiNotFound('User does not have a Murmur email set');
		}

		const mailgunData = await mg.messages.create('murmurmailbox.com', {
			from: `${senderName} <${user.murmurEmail}>`,
			to: [recipientEmail],
			subject: subject,
			html: replacePTagsInSignature(messageNoMargin),
			text: message,
			'h:Reply-To': senderEmail,
			'h:X-Mailgun-Dkim-Signature': 'yes',
			'h:Message-ID': `<${Date.now()}@${1}>`,
		});

		return apiResponse({ success: true, data: mailgunData });
	} catch (error) {
		return handleApiError(error);
	}
}
