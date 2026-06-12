/**
 * Sends ONE real test of the branded cold-outreach email through the Mailgun API,
 * mirroring the /api/mailgun template branch exactly (headers, from-name, subject).
 *
 * For the test send the logo is attached inline (cid:) because the hosted
 * public/email/murmur-logo.png isn't deployed to production yet; real sends use
 * the hosted URL.
 *
 * Run: npx tsx scripts/send-test-venue-email.ts <recipient@example.com>
 */
import 'dotenv/config';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
	renderNewMessageEmailHtml,
	renderNewMessageEmailText,
} from '../src/app/api/_utils/emailTemplates/newMessage';
import { buildUnsubscribeToken } from '../src/app/api/_utils/unsubscribe';
import { convertHtmlToPlainText, formatHTMLForEmailClients } from '../src/utils/html';

const recipient = process.argv[2];
if (!recipient) {
	console.error('Usage: npx tsx scripts/send-test-venue-email.ts <recipient>');
	process.exit(1);
}

const BASE_URL = 'https://www.murmurpro.com';
// The test account's generated mailbox (User.replyToEmail in the dev DB).
const ORIGIN_EMAIL = 'starlingphotography432@murmurmailbox.com';
const USER_ID = 'user_36oNdVaMoqgfw8iqN9kWQn6LIqh';

const innerHtml = formatHTMLForEmailClients(
	[
		'Hi,',
		"I hope this email finds you well! I am writing to introduce our dynamic jazz trio. We have been playing together for many years, blending classic and contemporary jazz to create a resonant, engaging live experience for diverse audiences. Our performances truly bring people together, much like how Kirks' Grocery unites the community in a meaningful way.",
		"I've been following your venue and am truly impressed by your dedication to fostering a vibrant, welcoming atmosphere. I believe our performances could greatly enhance this energy by adding a lively musical component to your events.",
		"I'd really appreciate the chance to discuss this possibility. Are you available next week—I'm more than happy to accommodate to your schedule.",
		'',
		'Thank you,',
		'Benjamin Price',
	].join('\n')
);

const token = buildUnsubscribeToken({ email: recipient, userId: USER_ID });
const unsubscribeUrl = `${BASE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
const viewMessagesUrl = `${BASE_URL}/venue`;
const draftSubject = 'Exploring Live Jazz Performance at Consequence Media';

// The hosted assets aren't deployed yet, so the test send references the email's
// images as inline cid: attachments instead of hosted URLs.
const inlineFiles = new Set<string>();
const html = renderNewMessageEmailHtml({
	artistName: 'Jeremy Simon',
	draftSubject,
	messageHtml: innerHtml,
	genre: 'Pop',
	bandName: 'Crowd of Ghosts',
	area: 'Seattle, Washington',
	bio: 'Jeremy is a jazz drummer hailing from the greater Philadelphia area. He plays an eclectic mix of fusion and R&B, harkening back to a bygone era',
	videoShareUrl: `${BASE_URL}/v/cmq6wvz4b0001yptpcqwnpaup`,
	viewMessagesUrl,
	unsubscribeUrl,
	assetBaseUrl: BASE_URL,
}).replace(
	new RegExp(`${BASE_URL}/email/([a-z0-9/-]+\\.png)`, 'g'),
	(_, file: string) => {
		inlineFiles.add(file);
		return `cid:${path.basename(file)}`;
	}
);

const text = renderNewMessageEmailText({
	draftSubject,
	messageText: convertHtmlToPlainText(innerHtml),
	displayName: 'Crowd of Ghosts',
	viewMessagesUrl,
	unsubscribeUrl,
});

async function main() {
	const mailgun = new Mailgun(FormData);
	const mg = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY || '' });

	const result = await mg.messages.create('murmurmailbox.com', {
		'h:Reply-To': ORIGIN_EMAIL,
		'h:Sender': ORIGIN_EMAIL,
		'h:X-Mailgun-Dkim-Signature': 'yes',
		'h:Message-ID': `<${Date.now()}.${Math.random().toString(36).slice(2)}@murmurmailbox.com>`,
		'h:List-Unsubscribe': `<${BASE_URL}/api/webhooks/unsubscribe?token=${encodeURIComponent(token)}>`,
		'h:List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
		from: `"Murmur" <${ORIGIN_EMAIL}>`,
		to: [recipient],
		subject: 'You have 1 new message',
		html,
		text,
		inline: [...inlineFiles].map((file) => ({
			filename: path.basename(file),
			data: readFileSync(path.join(__dirname, '..', 'public', 'email', file)),
		})),
	});

	console.log('Mailgun response:', JSON.stringify(result));
}

main().catch((error) => {
	console.error('Send failed:', error?.status, error?.message, error?.details ?? '');
	process.exit(1);
});
