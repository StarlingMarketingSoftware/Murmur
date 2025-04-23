import { NextResponse } from 'next/server';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';

export async function POST(request: Request) {
	const { recipientEmail, subject, message, senderEmail } = await request.json();

	const mailgun = new Mailgun(FormData);
	const mg = mailgun.client({
		username: 'api',
		key: process.env.MAILGUN_API_KEY || '',
	});

	try {
		const form = new FormData();
		form.append('h:Reply-To', senderEmail);

		const data = await mg.messages.create(
			'sandbox19faacf722c14c58b751195591eb4fcf.mailgun.org',
			{
				from: 'Mailgun Sandbox <postmaster@sandbox19faacf722c14c58b751195591eb4fcf.mailgun.org>',
				to: [recipientEmail],
				subject: subject,
				text: message,
			}
		);

		return NextResponse.json({ success: true, data });
	} catch (error) {
		console.error(error);
		return NextResponse.json({ success: false, error }, { status: 500 });
	}
}
