

export const replacePTagsInSignature = (html: string): string => {
	// First capture group is everything before the signature div
	// Second capture group is the content within signature div
	// Third capture group is everything after
	const regex = /^([\s\S]*<div>)([\s\S]*?)(<\/div>[\s\S]*)$/;

	return html.replace(regex, (_, before, signatureContent, after) => {
		const updatedSignatureContent = signatureContent
			.replace(/<p/g, '<div')
			.replace(/<\/p>/g, '</div>');

		return `${before}${updatedSignatureContent}${after}`;
	});
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
	return html
		.replace(
			/<p(?![^>]*min-height)/g,
			`<p style="margin: 0; min-height: 1.2em; line-height: 1.5; font-size: 12pt"`
		)
		.replace(
			/<p([^>]*?)style="([^"]*)"/g,
			`<p$1style="$2; min-height: 1.2em; line-height: 1.5; font-size: 12pt"`
		)
		.replace(/<\/p>/g, '</p>');
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
		.filter(paragraph => paragraph.trim() !== '') // Remove empty paragraphs
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
	const styledSignature = signature ? `<span style="font-family: ${font}">${signature}</span>` : null;
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
