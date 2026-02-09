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
	return html
		.replace(/<p/g, `<p><span style="font-family: ${font}"`)
		.replace(/<\/p>/g, '</span></p>');
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
		// Convert plain text (with \n) into HTML paragraphs and <br> breaks.
		const normalized = out.trim();
		if (!normalized) return '';

		const paragraphs = normalized.split(/\n{2,}/);
		out = paragraphs
			.map((paragraph) => {
				const withBr = escapeHtml(paragraph).replace(/\n/g, '<br>');
				return `<p style="margin: 0 0 16px 0; line-height: 1.5;">${withBr}</p>`;
			})
			.join('');
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

	const DEFAULT_FONT_FAMILY = 'Arial, sans-serif';
	const DEFAULT_FONT_SIZE = '12pt';
	const DEFAULT_LINE_HEIGHT = '1.5';
	const DEFAULT_P_MARGIN_BOTTOM = '16px';

	// Patch paragraph spacing and baseline readability in email clients (Gmail ignores Tailwind classes).
	out = out.replace(/<p\b[^>]*>/gi, (tag) =>
		upsertStyleAttr(tag, (existing) => {
			const style = parseStyle(existing);

			// Ensure consistent line-height in email clients.
			if (!style['line-height']) style['line-height'] = DEFAULT_LINE_HEIGHT;

			// Preserve blank lines from editors that emit empty paragraphs.
			if (!style['min-height']) style['min-height'] = '1.2em';

			// Paragraph spacing: if margin shorthand is explicitly set and non-zero, respect it.
			// Otherwise ensure a bottom margin so paragraphs don't collapse into one block.
			const marginShorthand = (style['margin'] || '').replace(/\s+/g, ' ').trim();
			const marginIsNonZero =
				marginShorthand !== '' &&
				marginShorthand !== '0' &&
				marginShorthand !== '0px' &&
				marginShorthand !== '0pt';

			if (!marginIsNonZero && !style['margin-bottom']) {
				// Use longhand so we don't stomp custom margin shorthand when present.
				style['margin-top'] ||= '0';
				style['margin-right'] ||= '0';
				style['margin-left'] ||= '0';
				style['margin-bottom'] = DEFAULT_P_MARGIN_BOTTOM;
			}

			return stringifyStyle(style);
		})
	);

	// Patch the signature <div class="mt-6"> produced by TipTap's custom Div node.
	// Tailwind classes don't exist in email clients, so inline the expected spacing.
	out = out.replace(/<div\b[^>]*>/gi, (tag) => {
		const classMatch = tag.match(/\sclass=("([^"]*)"|'([^']*)')/i);
		const classValue = classMatch?.[2] ?? classMatch?.[3] ?? '';
		if (!/\bmt-6\b/i.test(classValue)) return tag;

		return upsertStyleAttr(tag, (existing) => {
			const style = parseStyle(existing);
			if (!style['margin-top']) style['margin-top'] = '24px';
			// Ensure signature inherits consistent font size/line height in clients that don't
			// reliably inherit from surrounding nodes.
			if (!style['font-size']) style['font-size'] = DEFAULT_FONT_SIZE;
			if (!style['line-height']) style['line-height'] = DEFAULT_LINE_HEIGHT;
			return stringifyStyle(style);
		});
	});

	// Wrap snippets (most of our drafts) in a baseline-styled container so the signature
	// never ends up a different size than the body.
	const looksLikeFullDoc = /<html\b/i.test(out) || /<body\b/i.test(out) || /<!doctype\b/i.test(out);
	if (!looksLikeFullDoc) {
		out = `<div style="font-family: ${DEFAULT_FONT_FAMILY}; font-size: ${DEFAULT_FONT_SIZE}; line-height: ${DEFAULT_LINE_HEIGHT}; color: #111827;">${out}</div>`;
	}

	return out;
};

export const addSignatureToHtml = (html: string, signature: string | null): string => {
	const signatureContent = signature || '';
	// Convert line breaks in signature to <br> tags for proper HTML rendering
	const formattedSignature = signatureContent.replace(/\n/g, '<br>');
	// Add proper spacing between body and signature with styled div
	return `${html}<br><br><div style="margin-top: 1em;">${formattedSignature}</div>`;
};

export const replaceLineBreaksWithRichTextTags = (text: string, font: string): string => {
	const fontStyle = `style="font-family: ${font}"`;
	// Split by double newlines to create paragraphs
	const paragraphs = text.split(/\n\n+/);
	// Process each paragraph, converting single newlines to <br> within paragraphs
	const htmlParagraphs = paragraphs
		.filter((paragraph) => paragraph.trim() !== '') // Remove empty paragraphs
		.map((paragraph, index, array) => {
			// Replace single newlines with <br> tags within each paragraph
			const withLineBreaks = paragraph.replace(/\n/g, '<br>');
			// Add margin-bottom to all paragraphs except the last one
			const marginStyle = index < array.length - 1 ? 'margin-bottom: 1em;' : '';
			return `<p style="${marginStyle}"><span ${fontStyle}>${withLineBreaks}</span></p>`;
		});
	return htmlParagraphs.join('');
};

// Convert AI response text to rich HTML email with proper paragraph and line break handling
export const convertAiResponseToRichTextEmail = (
	html: string,
	font: string,
	signature: string | null
): string => {
	// Process the text to create proper HTML with paragraphs and line breaks
	const htmlWithFont = replaceLineBreaksWithRichTextTags(html, font);
	// Apply font styling to signature as well
	const styledSignature = signature
		? `<span style="font-family: ${font}">${signature}</span>`
		: null;
	return addSignatureToHtml(htmlWithFont, styledSignature);
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
