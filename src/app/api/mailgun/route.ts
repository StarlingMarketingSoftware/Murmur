import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import {
	formatHTMLForEmailClients,
	replacePTagsInSignature,
} from '@/app/utils/htmlFormatting';
import { auth } from '@clerk/nextjs/server';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/utils/api';
import { z } from 'zod';

const postMailgunSchema = z.object({
	recipientEmail: z.string().email(),
	subject: z.string().min(1),
	message: z.string().min(1),
	senderEmail: z.string().email(),
	senderName: z.string().min(1),
	userMurmurEmail: z.string().email().optional(),
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
		const { recipientEmail, subject, message, senderEmail, senderName, userMurmurEmail } =
			validatedData.data;

		const mailgun = new Mailgun(FormData);
		const mg = mailgun.client({
			username: 'api',
			key: process.env.MAILGUN_API_KEY || '',
		});

		const messageNoMargin = formatHTMLForEmailClients(message);

		const originEmail = userMurmurEmail
			? userMurmurEmail
			: 'postmaster@murmurmailbox.com';

		const mailgunData = await mg.messages.create('murmurmailbox.com', {
			'h:Reply-To': senderEmail,
			'h:Sender': senderEmail,
			'h:X-Mailgun-Dkim-Signature': 'yes',
			'h:Message-ID': `<${Date.now()}.${Math.random().toString(36).slice(2)}@${
				originEmail.split('@')[1]
			}>`,
			from: `"${senderName}" <${originEmail}>`,
			to: [recipientEmail],
			subject: subject,
			html: replacePTagsInSignature(messageNoMargin),
			text: message,
		});

		return apiResponse({ success: true, data: mailgunData });
	} catch (error) {
		return handleApiError(error);
	}
}
