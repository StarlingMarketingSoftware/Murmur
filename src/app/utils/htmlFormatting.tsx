import { Signature } from '@prisma/client';

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

export const addSignatureToHtml = (html: string, signature: Signature | null): string => {
	const signatureContent = signature ? signature.content : '';
	return `${html}<p></p><div>${signatureContent}</div>`;
};

export const convertAiResponseToRichTextEmail = (
	html: string,
	font: string,
	signature: Signature | null
): string => {
	const htmlWithFont = addFontToHtml(html, font);
	return addSignatureToHtml(htmlWithFont, signature);
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
