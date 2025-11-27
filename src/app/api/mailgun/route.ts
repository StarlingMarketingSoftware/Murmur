import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { formatHTMLForEmailClients, replacePTagsInSignature } from '@/utils';
import { apiBadRequest, apiResponse, handleApiError } from '@/app/api/_utils';
import { z } from 'zod';

const postMailgunSchema = z.object({
	recipientEmail: z.string().email(),
	subject: z.string().min(1),
	message: z.string().min(1),
	senderEmail: z.string().email(),
	senderName: z.string().min(1),
	originEmail: z.string().email().optional().nullable(),
	replyToEmail: z.string().email().optional(),
});
export type PostMailgunData = z.infer<typeof postMailgunSchema>;

export async function POST(request: Request) {
	try {
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
		} = validatedData.data;

		const mailgun = new Mailgun(FormData);
		const mg = mailgun.client({
			username: 'api',
			key: process.env.MAILGUN_API_KEY || '',
		});

		const messageNoMargin = formatHTMLForEmailClients(message);

		const originEmail = specifiedOriginEmail ?? 'postmaster@murmurmailbox.com';

		const mailgunData = await mg.messages.create('murmurmailbox.com', {
			'h:Reply-To': replyToEmail ?? originEmail,
			'h:Sender': originEmail,
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
