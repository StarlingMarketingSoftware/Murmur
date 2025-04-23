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

export function addInlineStylesToHTML(html: string): string {
	return (
		html
			.replace(/<p>/g, '<p style="margin:0; padding:0; l;">')
			// Handle paragraphs that already have some style attributes
			.replace(/<p style="([^"]*)">/g, (match, existingStyles) => {
				// Preserve existing styles while adding line-height if not present
				if (!existingStyles.includes('line-height')) {
					return `<p style="${existingStyles}; 5;">`;
				}
				return match;
			})
			// Ensure empty paragraphs maintain height
			.replace(
				/<p([^>]*)><\/p>/g,
				'<p$1 style="margin:0; padding:0; l; min-height:1.5em;">'
			)
			// Standardize other common elements
			.replace(/<strong>/g, '<strong style="font-weight:bold;">')
			.replace(/<em>/g, '<em style="font-style:italic;">')
	);
}

export function removeMarginsFromPTags(html: string): string {
	return html.replace(/<p>/g, '<p style="margin:0; padding:0;">');
}

export const replaceEmptyPTagsWithSpacerDivs = (html: string): string => {
	return html.replaceAll(
		'<p></p>',
		'<div style="height:1em; line-height:1em; margin:0; padding:0;">&nbsp;</div>'
	);
};

export const removeEmptyPTags = (html: string): string => {
	return html.replaceAll('<p></p>', '');
};

export const replacePwithDiv = (html: string): string => {
	return html.replaceAll('<p>', '<div>').replaceAll('</p>', '</div>');
};
