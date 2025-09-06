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

export const mmdd = (date: Date) => {
	if (date && !isNaN(date.getTime())) {
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		return `${month}.${day}`;
	}
	return 'No Data';
};
