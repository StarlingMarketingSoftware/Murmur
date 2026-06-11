import type {
	GetCalendarEntryData,
	PatchCalendarEntryData,
} from '@/app/api/calendar/route';

export type CalendarEventDraft = {
	personName: string;
	company: string;
	date: string;
	startTime: string;
	endTime: string;
	notes: string;
	address: string;
	placeId: string | null;
	lat: number | null;
	lng: number | null;
	drivingDuration: string | null;
};

export type TimeDropdownField = 'startTime' | 'endTime';

export type TimeOption = {
	label: string;
	minutes: number;
};

export const MONTH_LABELS_UPPER = [
	'JAN',
	'FEB',
	'MAR',
	'APR',
	'MAY',
	'JUN',
	'JUL',
	'AUG',
	'SEP',
	'OCT',
	'NOV',
	'DEC',
] as const;

export const MONTH_LABELS_SHORT = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
] as const;

export const MONTH_LABELS_FULL = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
] as const;

export const toIsoKey = (date: Date): string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
		date.getDate()
	).padStart(2, '0')}`;

// Inverse of toIsoKey. MUST construct via local-date parts — `new Date('YYYY-MM-DD')`
// parses as UTC midnight and shifts a day in negative-offset timezones.
export const parseIsoKey = (isoKey: string): Date => {
	const [year, month, day] = isoKey.split('-').map(Number);
	return new Date(year, month - 1, day);
};

const getOrdinalSuffix = (day: number): string => {
	const lastTwo = day % 100;
	if (lastTwo >= 11 && lastTwo <= 13) return 'th';

	switch (day % 10) {
		case 1:
			return 'st';
		case 2:
			return 'nd';
		case 3:
			return 'rd';
		default:
			return 'th';
	}
};

export const formatCalendarDate = (date: Date): string =>
	`${MONTH_LABELS_FULL[date.getMonth()]} ${date.getDate()}${getOrdinalSuffix(
		date.getDate()
	)} ${date.getFullYear()}`;

export const TIME_OPTIONS: TimeOption[] = Array.from({ length: 24 }, (_, index) => {
	const totalMinutes = index * 60;
	const hours24 = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	const hours12 = hours24 % 12 || 12;
	const meridiem = hours24 < 12 ? 'am' : 'pm';
	const minuteLabel = minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`;

	return {
		label: `${hours12}${minuteLabel} ${meridiem}`,
		minutes: totalMinutes,
	};
});

export const DEFAULT_START_TIME = '9 am';
export const DEFAULT_END_TIME = '1 pm';

export const createDefaultEventDraft = (date: Date): CalendarEventDraft => ({
	personName: '',
	company: '',
	date: formatCalendarDate(date),
	startTime: DEFAULT_START_TIME,
	endTime: DEFAULT_END_TIME,
	notes: '',
	address: '',
	placeId: null,
	lat: null,
	lng: null,
	drivingDuration: null,
});

export const parseClockMinutes = (value: string): number | null => {
	const match = value
		.trim()
		.toLowerCase()
		.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
	if (!match) return null;

	let hours = Number(match[1]);
	const minutes = match[2] ? Number(match[2]) : 0;
	if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59) {
		return null;
	}

	const meridiem = match[3];
	if (meridiem) {
		if (hours < 1 || hours > 12) return null;
		if (hours === 12) hours = 0;
		if (meridiem === 'pm') hours += 12;
	} else if (hours > 23) {
		return null;
	}

	return hours * 60 + minutes;
};

export const getSameDayTimeRangeError = (
	startTime: string,
	endTime: string
): string | null => {
	const startMinutes = parseClockMinutes(startTime);
	const endMinutes = parseClockMinutes(endTime);
	if (startMinutes == null || endMinutes == null) return null;

	return endMinutes <= startMinutes ? 'Time range must stay within one day' : null;
};

export const formatDurationLabel = (startTime: string, endTime: string): string => {
	const startMinutes = parseClockMinutes(startTime);
	const endMinutes = parseClockMinutes(endTime);
	if (startMinutes == null || endMinutes == null) return 'Duration';

	const durationMinutes = endMinutes - startMinutes;
	if (durationMinutes <= 0) return 'Pick Valid Time';

	const hours = Math.floor(durationMinutes / 60);
	const minutes = durationMinutes % 60;
	if (hours > 0 && minutes === 0) return `${hours} hr${hours === 1 ? '' : 's'}`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes} min`;
};

export const hasDraftContent = (draft: CalendarEventDraft): boolean =>
	Boolean(
		draft.personName.trim() ||
		draft.company.trim() ||
		draft.notes.trim() ||
		draft.address.trim()
	);

export const getAdjustedEndOption = (
	startMinutes: number,
	draft: CalendarEventDraft
): TimeOption | null => {
	const laterOptions = TIME_OPTIONS.filter((option) => option.minutes > startMinutes);
	if (laterOptions.length === 0) return null;

	const currentStartMinutes = parseClockMinutes(draft.startTime);
	const currentEndMinutes = parseClockMinutes(draft.endTime);
	const currentDurationMinutes =
		currentStartMinutes != null &&
		currentEndMinutes != null &&
		currentEndMinutes > currentStartMinutes
			? currentEndMinutes - currentStartMinutes
			: 60;

	return (
		laterOptions.find(
			(option) => option.minutes >= startMinutes + currentDurationMinutes
		) ?? laterOptions[laterOptions.length - 1]
	);
};

export const getTimeChoiceError = (
	field: TimeDropdownField,
	option: TimeOption,
	draft: CalendarEventDraft
): string | null => {
	if (field === 'startTime') {
		return getAdjustedEndOption(option.minutes, draft) == null
			? 'Start must leave room for an end time'
			: null;
	}

	const startMinutes = parseClockMinutes(draft.startTime);
	return startMinutes != null && option.minutes <= startMinutes
		? 'End must be after start'
		: null;
};

export const MONTH_COLOR_PALETTES = [
	// January
	['#FFFFFF', '#F5FEFF', '#E7FCFF', '#DBFAFF', '#C7EFF6', '#AEE9F2'],
	// February
	['#FFFFFF', '#F5FBFF', '#E7F5FF', '#DBF0FF', '#C7E1F6', '#AED5F2'],
	// March
	['#FFFFFF', '#F5F7FF', '#E7EDFF', '#DBE3FF', '#C7D1F6', '#AEBDF2'],
	// April
	['#FFFFFF', '#F6F5FF', '#EBE7FF', '#E0DBFF', '#CDC7F6', '#B7AEF2'],
	// May
	['#FFFFFF', '#FAF5FF', '#F3E7FF', '#ECDBFF', '#DDC7F6', '#CFAEF2'],
	// June
	['#FFFFFF', '#FFF5FF', '#FFE7FE', '#FFDBFE', '#F6C7F4', '#F2AEEF'],
	// July
	['#FFFFFF', '#FFF5F7', '#FFE7ED', '#FFDBE4', '#F6C7D2', '#F2AEBE'],
	// August
	['#FFFFFF', '#FFF9F5', '#FFF1E7', '#FFE9DB', '#F6D9C7', '#F2C9AE'],
	// September
	['#FFFFFF', '#FFFCF5', '#FFF9E7', '#FFF5DB', '#F6E9C7', '#F2E0AE'],
	// October
	['#FFFFFF', '#FDFFF5', '#FBFFE7', '#F9FFDB', '#EEF6C7', '#E6F2AE'],
	// November
	['#FFFFFF', '#F7FFF5', '#EDFFE7', '#E4FFDB', '#D2F6C7', '#BFF2AE'],
	// December
	['#FFFFFF', '#F5FFFA', '#E7FFF3', '#DBFFED', '#C7F6DE', '#AEF2D0'],
] as const;

export type MonthGridSpec = { startDate: Date; weekCount: number };

// Each Sunday→Saturday week-row is owned by the month containing its Sunday,
// so vertically stacked month grids tile without repeating boundary weeks.
// A month's block starts on its first Sunday (the 1st itself when the month
// starts on Sunday) and spans one row per Sunday in the month — 4 or 5 rows.
export const getMonthGridSpec = (year: number, monthIndex: number): MonthGridSpec => {
	const first = new Date(year, monthIndex, 1);
	const startDate = new Date(year, monthIndex, 1 + ((7 - first.getDay()) % 7));
	const lastDate = new Date(year, monthIndex + 1, 0).getDate();
	const weekCount = Math.floor((lastDate - startDate.getDate()) / 7) + 1;
	return { startDate, weekCount };
};

export const getCellBackground = (
	monthIndex: number,
	row: number,
	col: number
): string => {
	const d = row + col;
	const palette = MONTH_COLOR_PALETTES[monthIndex];
	return palette[d % palette.length] ?? '#FFFFFF';
};

export const weekdayLabel = (date: Date): string => {
	// Match screenshot abbreviations.
	const d = date.getDay();
	if (d === 0) return 'Sun';
	if (d === 1) return 'Mon';
	if (d === 2) return 'Tues';
	if (d === 3) return 'Wed';
	if (d === 4) return 'Thurs';
	if (d === 5) return 'Fri';
	return 'Sat';
};

// "Worth persisting / worth rendering a red event card": the panel's original
// showDraftSummary condition, kept as the single source of truth for render
// and save-vs-delete decisions.
export const isDraftPersistable = (draft: CalendarEventDraft, date: Date): boolean => {
	const defaults = createDefaultEventDraft(date);
	return (
		hasDraftContent(draft) ||
		draft.date !== defaults.date ||
		draft.startTime.trim() !== defaults.startTime ||
		draft.endTime.trim() !== defaults.endTime
	);
};

// Server row → panel draft. Empty stored times fall back to the display
// defaults so the red card never renders a bare "-" and round-trips stably.
export const entryToDraft = (entry: GetCalendarEntryData): CalendarEventDraft => ({
	personName: entry.personName,
	company: entry.company,
	date: formatCalendarDate(parseIsoKey(entry.date)),
	startTime: entry.startTime || DEFAULT_START_TIME,
	endTime: entry.endTime || DEFAULT_END_TIME,
	notes: entry.notes,
	address: entry.address,
	placeId: entry.placeId,
	lat: entry.latitude,
	lng: entry.longitude,
	drivingDuration: entry.drivingDuration,
});

// Panel draft → PATCH body (note lat/lng → latitude/longitude rename).
// Provenance is supplied by the inbox flow or set explicitly by the panel.
export const draftToUpsertBody = (
	isoDate: string,
	draft: CalendarEventDraft,
	provenance?: { campaignId: number | null; contactId: number | null }
): PatchCalendarEntryData => ({
	date: isoDate,
	personName: draft.personName,
	company: draft.company,
	startTime: draft.startTime,
	endTime: draft.endTime,
	notes: draft.notes,
	address: draft.address,
	placeId: draft.placeId,
	latitude: draft.lat,
	longitude: draft.lng,
	drivingDuration: draft.drivingDuration,
	...(provenance ?? {}),
});
