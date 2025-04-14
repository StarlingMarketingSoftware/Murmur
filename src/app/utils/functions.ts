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
