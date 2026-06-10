/**
 * Renders the branded "You have 1 new message" cold-outreach email to local HTML
 * files for browser inspection (no sending involved).
 *
 * Run: npx tsx scripts/preview-venue-email.ts
 * Output: scripts/.preview/venue-email-*.html (+ the text part printed to stdout)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
	renderNewMessageEmailHtml,
	renderNewMessageEmailText,
	NewMessageEmailInput,
} from '../src/app/api/_utils/emailTemplates/newMessage';
import { convertHtmlToPlainText, formatHTMLForEmailClients } from '../src/utils/html';

const OUT_DIR = path.join(__dirname, '.preview');

const SAMPLE_MESSAGE = formatHTMLForEmailClients(
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

const base: NewMessageEmailInput = {
	artistName: 'Jeremy Simon',
	draftSubject: 'Exploring Live Jazz Performance at Consequence Media',
	messageHtml: SAMPLE_MESSAGE,
	genre: 'Pop',
	bandName: 'Crowd of Ghosts',
	area: 'Seattle, Washington',
	bio: 'Jeremy is a jazz drummer hailing from the greater Philadelphia area. He plays an eclectic mix of fusion and R&B, harkening back to a bygone era',
	videoShareUrl: 'https://murmurpro.com/v/sample-share-id',
	viewMessagesUrl: 'https://murmurpro.com/venue',
	unsubscribeUrl: 'https://murmurpro.com/unsubscribe?token=sample',
	assetBaseUrl: 'https://murmurpro.com',
};

const variants: Record<string, NewMessageEmailInput> = {
	full: base,
	'no-subject': { ...base, draftSubject: '' },
	'no-video': { ...base, videoShareUrl: null },
	minimal: {
		...base,
		draftSubject: '',
		genre: null,
		bandName: null,
		area: null,
		bio: null,
		videoShareUrl: null,
	},
	'escaping-check': {
		...base,
		artistName: 'Jeremy <script>alert(1)</script> "Simon"',
		draftSubject: 'A & B <test> with a very long subject line that should be truncated somewhere',
		genre: '<b>Pop</b>',
		bio: 'Bio with "quotes" & <tags>',
	},
	'long-message': {
		...base,
		messageHtml: formatHTMLForEmailClients(
			Array.from(
				{ length: 40 },
				(_, i) =>
					`Paragraph ${i + 1}: this is a deliberately overlong message to confirm the body box caps its height instead of growing without bound.`
			).join('\n\n')
		),
	},
};

mkdirSync(OUT_DIR, { recursive: true });

// Local preview swaps the hosted asset URLs (logo + icons) for the committed files
// so it renders offline (the template itself only accepts http(s) URLs).
const localAssets = `file://${path.join(__dirname, '..', 'public', 'email')}/`;

for (const [name, input] of Object.entries(variants)) {
	const html = renderNewMessageEmailHtml(input).replaceAll(
		`${base.assetBaseUrl}/email/`,
		localAssets
	);
	const file = path.join(OUT_DIR, `venue-email-${name}.html`);
	writeFileSync(file, html);
	console.log(`Wrote ${file} (${(html.length / 1024).toFixed(1)} KB)`);
}

console.log('\n--- text part (full variant) ---\n');
console.log(
	renderNewMessageEmailText({
		draftSubject: base.draftSubject,
		messageText: convertHtmlToPlainText(base.messageHtml),
		displayName: base.bandName ?? base.artistName,
		viewMessagesUrl: base.viewMessagesUrl,
		unsubscribeUrl: base.unsubscribeUrl,
	})
);
