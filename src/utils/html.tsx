export const replacePTagsInSignature = (html: string): string => {
	/**
	 * Best-effort: if the email ends with a signature block wrapped in a <div>,
	 * convert any <p> tags inside that block to <div> tags to avoid "paragraph margin"
	 * surprises in email clients.
	 *
	 * NOTE: This is intentionally conservative and only targets a trailing <div>...</div>.
	 */
	if (!html) return html;

	const match = html.match(/^([\s\S]*?)(<div\b[^>]*>[\s\S]*<\/div>)\s*$/i);
	if (!match?.[2]) return html;

	const before = match[1] ?? '';
	const signatureBlock = match[2];

	const updatedSignatureBlock = signatureBlock
		.replace(/<p(\s|>)/gi, '<div$1')
		.replace(/<\/p>/gi, '</div>');

	return `${before}${updatedSignatureBlock}`;
};

export const stripHtmlTags = (html: string): string => {
	const tmp = document.createElement('DIV');
	tmp.innerHTML = html;
	return tmp.textContent || tmp.innerText || '';
};

export const addFontToHtml = (html: string, font: string): string => {
	if (!html) return html;
	// Declare font-family once on a single wrapper.
	if (/font-family\s*:/i.test(html)) return html;
	return `<div style="font-family: ${font};">${html}</div>`;
};

export const formatHTMLForEmailClients = (html: string): string => {
	if (!html) return html;

	// Strip Murmur's internal draft-settings snapshot comment before sending.
	// (It's useful for in-app UX, but shouldn't be included in outbound emails.)
	const MURMUR_DRAFT_SETTINGS_COMMENT_RE =
		/<!--\s*MURMUR_DRAFT_SETTINGS:[A-Za-z0-9+/=]+\s*-->/g;
	let out = html.replace(MURMUR_DRAFT_SETTINGS_COMMENT_RE, '').trimStart();

	// Normalize line breaks (helps with plain-text fallbacks).
	out = out.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

	// TipTap's hardBreaks render as <br class="br-spacing"> for in-app spacing.
	// Email clients ignore CSS classes, so strip the class to avoid odd HTML.
	out = out.replace(/<br\s+class="br-spacing"\s*\/?>/gi, '<br>');

	const escapeHtml = (text: string): string =>
		text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');

	const looksLikeHtml = /<\/?[a-z][\s>]/i.test(out);
	if (!looksLikeHtml) {
		// Convert plain text (with \n) into Gmail-like HTML with <br> breaks.
		const normalized = out.trim();
		if (!normalized) return '';

		const paragraphs = normalized.split(/\n{2,}/);
		out = paragraphs
			.map((paragraph) => escapeHtml(paragraph).replace(/\n/g, '<br>'))
			.join('<br><br>');
	} else {
		// Flatten common "webby" paragraphs into Gmail-like breaks.
		out = out
			.replace(/<\/p>\s*<p\b[^>]*>/gi, '<br><br>')
			.replace(/<p\b[^>]*>/gi, '')
			.replace(/<\/p>/gi, '');
	}

	type StyleMap = Record<string, string>;
	const parseStyle = (style: string): StyleMap => {
		const map: StyleMap = {};
		style
			.split(';')
			.map((decl) => decl.trim())
			.filter(Boolean)
			.forEach((decl) => {
				const idx = decl.indexOf(':');
				if (idx === -1) return;
				const prop = decl.slice(0, idx).trim().toLowerCase();
				const value = decl.slice(idx + 1).trim();
				if (!prop) return;
				map[prop] = value;
			});
		return map;
	};

	const stringifyStyle = (map: StyleMap): string => {
		const entries = Object.entries(map);
		if (!entries.length) return '';
		return `${entries.map(([k, v]) => `${k}: ${v}`).join('; ')};`;
	};

	const upsertStyleAttr = (tag: string, updater: (existing: string) => string): string => {
		const match = tag.match(/\sstyle=("([^"]*)"|'([^']*)')/i);
		if (match) {
			const existing = match[2] ?? match[3] ?? '';
			const updated = updater(existing);
			return tag.replace(match[0], ` style="${updated}"`);
		}
		const updated = updater('');
		return tag.replace(/^<([a-z0-9]+)/i, `<$1 style="${updated}"`);
	};

	const OUTER_FONT_FAMILY = 'Arial, sans-serif';
	const OUTER_TEXT_COLOR = '#000000';

	// TipTap renders signature blocks as <div class="mt-6">…</div>.
	// Tailwind classes don't exist in email clients; mimic Gmail spacing using <br><br>.
	out = out.replace(/<div\b[^>]*>/gi, (tag) => {
		const classMatch = tag.match(/\sclass=("([^"]*)"|'([^']*)')/i);
		const classValue = classMatch?.[2] ?? classMatch?.[3] ?? '';
		if (!/\bmt-6\b/i.test(classValue)) return tag;

		let cleanedTag = tag;
		if (classMatch?.[0]) {
			const cleanedClassValue = classValue
				.split(/\s+/)
				.filter(Boolean)
				.filter((c) => !/^mt-\d+$/i.test(c))
				.join(' ');

			if (cleanedClassValue) {
				cleanedTag = cleanedTag.replace(classMatch[0], ` class="${cleanedClassValue}"`);
			} else {
				cleanedTag = cleanedTag.replace(classMatch[0], '');
			}
		}

		return `<br><br>${cleanedTag}`;
	});

	// Wrap snippets (most of our drafts) in a Gmail-like baseline container.
	// Don't force a px font-size here: Gmail applies device-specific sizing.
	const looksLikeFullDoc = /<html\b/i.test(out) || /<body\b/i.test(out) || /<!doctype\b/i.test(out);
	if (!looksLikeFullDoc) {
		const desiredOuterStyle = `font-family: ${OUTER_FONT_FAMILY}; color: ${OUTER_TEXT_COLOR};`;
		const singleDivWrapper = /^\s*<div\b[^>]*>[\s\S]*<\/div>\s*$/i.test(out);

		if (singleDivWrapper) {
			out = out.replace(/^\s*<div\b[^>]*>/i, (tag) =>
				upsertStyleAttr(tag, (existing) => {
					const style = parseStyle(existing);
					style['font-family'] = OUTER_FONT_FAMILY;
					style['color'] = OUTER_TEXT_COLOR;
					delete style['font-size'];
					delete style['line-height'];
					return stringifyStyle(style);
				})
			);
		} else {
			out = `<div style="${desiredOuterStyle}">${out}</div>`;
		}
	}

	return out;
};

export const addSignatureToHtml = (html: string, signature: string | null): string => {
	const signatureContent = signature || '';
	const formattedSignature = signatureContent.replace(/\n/g, '<br>');
	if (!formattedSignature.trim()) return html;

	// Append signature using Gmail-like spacing (<br><br>) without artificial wrappers.
	const insertion = `<br><br>${formattedSignature}`;

	// If the body is already wrapped in a single trailing </div>, keep everything inside it.
	if (/<\/div>\s*$/i.test(html)) {
		return html.replace(/<\/div>\s*$/i, `${insertion}</div>`);
	}

	if (!html?.trim()) {
		return `<div>${formattedSignature}</div>`;
	}

	return `${html}${insertion}`;
};

export const replaceLineBreaksWithRichTextTags = (text: string, font: string): string => {
	const escapeHtml = (s: string): string =>
		s
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');

	// Gmail-style structure: a single wrapper with paragraphs separated by <br><br>.
	const normalized = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
	if (!normalized) return `<div style="font-family: ${font};"></div>`;

	const paragraphs = normalized.split(/\n{2,}/).filter((p) => p.trim() !== '');
	const content = paragraphs
		.map((paragraph) => escapeHtml(paragraph).replace(/\n/g, '<br>'))
		.join('<br><br>');

	return `<div style="font-family: ${font};">${content}</div>`;
};

// Convert AI response text to rich HTML email with proper paragraph and line break handling
export const convertAiResponseToRichTextEmail = (
	html: string,
	font: string,
	signature: string | null
): string => {
	const htmlWithWrapper = replaceLineBreaksWithRichTextTags(html, font);
	return addSignatureToHtml(htmlWithWrapper, signature);
};

export const extractJsonFromPseudoHTML = (
	pseudoHTML: string
): { subject: string; message: string } => {
	const subjectMatch = pseudoHTML.match(/<SUBJECT>(.*?)<\/SUBJECT>/);
	const subject = subjectMatch ? subjectMatch[1] : '';

	const messageMatch = pseudoHTML.match(/<MESSAGE>(.*?)<\/MESSAGE>/);
	const message = messageMatch ? messageMatch[1] : '';
	const cleanedMessage = cleanLineBreakCharacters(message);
	return {
		subject,
		message: cleanedMessage,
	};
};

const cleanLineBreakCharacters = (text: string): string => {
	const lineBreakRegex = /(\r\n|\r|\n|\u2028|\u2029|\v|\f)/g;
	return text.replace(lineBreakRegex, '');
};

export const convertHtmlToPlainText = (html: string): string => {
	// Strip HTML tags to show plain text, preserving line breaks
	let plainMessage = html;

	// Handle different paragraph and line break patterns using markers first
	// Paragraph transitions
	plainMessage = plainMessage.replace(/<\/p>\s*<p[^>]*>/gi, '§PARA§');
	plainMessage = plainMessage.replace(/<\/div>\s*<div[^>]*>/gi, '§PARA§');
	// Standalone closings should also break paragraphs
	plainMessage = plainMessage.replace(/<\/p>/gi, '§PARA§');
	plainMessage = plainMessage.replace(/<\/div>/gi, '§PARA§');
	// Line breaks inside paragraphs
	plainMessage = plainMessage.replace(/<br\s*\/?>/gi, '§BR§');

	// Remove opening tags for block elements
	plainMessage = plainMessage.replace(/<p[^>]*>/gi, '');
	plainMessage = plainMessage.replace(/<div[^>]*>/gi, '');

	// Remove any other HTML tags
	plainMessage = plainMessage.replace(/<[^>]*>/g, '');

	// Decode minimal entities
	plainMessage = plainMessage.replace(/&nbsp;/gi, ' ');

	// Replace markers with actual line breaks
	plainMessage = plainMessage.replace(/§PARA§/g, '\n\n');
	plainMessage = plainMessage.replace(/§BR§/g, '\n');

	// Normalize newlines (max 2 in a row)
	plainMessage = plainMessage.replace(/\r\n/g, '\n');
	plainMessage = plainMessage.replace(/\n{3,}/g, '\n\n');

	// Trim
	return (plainMessage = plainMessage.trim());
};
