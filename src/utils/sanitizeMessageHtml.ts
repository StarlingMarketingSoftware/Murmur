import DOMPurify from 'isomorphic-dompurify';

// The diverted first message carries the AI-drafted email body (HTML). Sanitize
// with a strict allowlist before rendering it in a chat bubble. Replies are plain
// text and never pass through here.
const ALLOWED_TAGS = [
	'p',
	'br',
	'b',
	'strong',
	'i',
	'em',
	'u',
	'a',
	'span',
	'div',
	'ul',
	'ol',
	'li',
	'blockquote',
	'h1',
	'h2',
	'h3',
];

export const sanitizeMessageHtml = (html: string): string =>
	DOMPurify.sanitize(html, {
		ALLOWED_TAGS,
		ALLOWED_ATTR: ['href', 'target', 'rel'],
		ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
	});
