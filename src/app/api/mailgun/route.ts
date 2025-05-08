import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { replacePTagsInSignature } from '@/app/utils/htmlFormatting';
import { auth } from '@clerk/nextjs/server';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/utils/api';

export async function POST(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { recipientEmail, subject, message, senderEmail, senderName } =
			await request.json();

		const mailgun = new Mailgun(FormData);
		const mg = mailgun.client({
			username: 'api',
			key: process.env.MAILGUN_API_KEY || '',
		});
		const data = await mg.messages.create('murmurmailbox.com', {
			from: `${senderName} <postmaster@murmurmailbox.com>`,
			to: [recipientEmail],
			subject: subject,
			html: replacePTagsInSignature(message),
			text: message,
			'h:Reply-To': senderEmail,
		});

		return apiResponse({ success: true, data });
	} catch (error) {
		return handleApiError(error);
	}
}
