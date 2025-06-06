import { format } from 'date-fns/format';
import { isDate } from 'date-fns/isDate';

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
	return _format(date, 'MM/dd/yyyy h:mm a');
};
