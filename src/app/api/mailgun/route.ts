import { NextResponse } from 'next/server';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { replacePTagsInSignature } from '@/app/utils/htmlFormatting';

export async function POST(request: Request) {
	const { recipientEmail, subject, message, senderEmail, senderName } =
		await request.json();

	const mailgun = new Mailgun(FormData);
	const mg = mailgun.client({
		username: 'api',
		key: process.env.MAILGUN_API_KEY || '',
	});

	try {
		const data = await mg.messages.create('murmurmailbox.com', {
			from: `${senderName} <michaelshingo@000000000.murmurmailbox.com>`,
			to: [recipientEmail],
			subject: subject,
			html: replacePTagsInSignature(message),
			text: message,
			'h:Reply-To': senderEmail,
		});

		return NextResponse.json({ success: true, data });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ success: false, error }, { status: 500 });
	}
}
