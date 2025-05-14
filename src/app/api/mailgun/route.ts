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

		const mailgunData = await mg.messages.create('murmurmailbox.com', {
			from: `${senderName} <postmaster@murmurmailbox.com>`,
			to: [recipientEmail],
			subject: subject,
			html: replacePTagsInSignature(messageNoMargin),
			text: message,
			'h:Reply-To': senderEmail,
		});

		return apiResponse({ success: true, data: mailgunData });
	} catch (error) {
		return handleApiError(error);
	}
}
