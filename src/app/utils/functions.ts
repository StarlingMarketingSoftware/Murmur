import { format } from 'date-fns/format';
import { isDate } from 'date-fns/isDate';

export const getPath = (url: string): string => {
	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
	return url.substring(baseUrl!.length, url.length);
};

export const ellipsesText = (text: string, maxLength: number): string => {
	if (text.length > maxLength) {
		return text.substring(0, maxLength) + '...';
	}
	return text;
};

export const _format = (
	date: Date | number | undefined,
	_format: string
): string | undefined | null => {
	const _isDate = isDate(date);
	return !date || !_isDate ? null : format(date, _format);
};

export const yyyyMMddHHmm = (date: Date | undefined): string | undefined | null => {
	return _format(date, 'yyyy/MM/dd HH:mm');
};
export const MMddyyyyHHmm = (date: Date | undefined): string | undefined | null => {
	return _format(date, 'MM/dd/yyyy HH:mm');
};

export const stripHtmlTags = (html: string): string => {
	const tmp = document.createElement('DIV');
	tmp.innerHTML = html;
	return tmp.textContent || tmp.innerText || '';
};

export const getTestEmailCount = (aiEmailCount: number): number => {
	return Math.floor(aiEmailCount / 10);
};

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const calcAiCreditsFromPrice = (priceInCents: number): number => {
	return Math.floor((priceInCents / 100) * 5);
};

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
