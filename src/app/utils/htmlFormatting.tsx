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
