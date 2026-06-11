export type BookedBannerAnswer = 'no';

const BOOKED_BANNER_ANSWERS_STORAGE_KEY = 'murmur_booked_banner_answers_v1';

/**
 * "No" dismissals of the inbox "Has this been booked?" banner, keyed by
 * conversation key. "Yes" is never stored — a booked conversation is derived
 * from its persisted CalendarEntry instead.
 */
export const readBookedBannerAnswers = (): Record<string, BookedBannerAnswer> => {
	if (typeof window === 'undefined') return {};
	try {
		const raw = window.localStorage.getItem(BOOKED_BANNER_ANSWERS_STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
		const answers: Record<string, BookedBannerAnswer> = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (value === 'no') answers[key] = 'no';
		}
		return answers;
	} catch {
		return {};
	}
};

export const recordBookedBannerAnswer = (
	conversationKey: string,
	answer: BookedBannerAnswer
): void => {
	if (typeof window === 'undefined') return;
	try {
		const answers = readBookedBannerAnswers();
		answers[conversationKey] = answer;
		window.localStorage.setItem(
			BOOKED_BANNER_ANSWERS_STORAGE_KEY,
			JSON.stringify(answers)
		);
	} catch {
		// Storage unavailable (private mode) — the session-state mirror still hides the banner.
	}
};

const MONTH_NAME_TO_INDEX: Record<string, number> = {
	jan: 0,
	january: 0,
	feb: 1,
	february: 1,
	mar: 2,
	march: 2,
	apr: 3,
	april: 3,
	may: 4,
	jun: 5,
	june: 5,
	jul: 6,
	july: 6,
	aug: 7,
	august: 7,
	sep: 8,
	sept: 8,
	september: 8,
	oct: 9,
	october: 9,
	nov: 10,
	november: 10,
	dec: 11,
	december: 11,
};

type DateCandidate = {
	index: number;
	monthIndex: number;
	day: number;
	year: number | null;
};

const MONTH_NAME_PATTERN =
	'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';

const MONTH_DAY_REGEX = new RegExp(
	`\\b(${MONTH_NAME_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b`,
	'gi'
);

const DAY_MONTH_REGEX = new RegExp(
	`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_NAME_PATTERN})\\b\\.?(?:,?\\s*(\\d{4}))?`,
	'gi'
);

const SLASH_DATE_REGEX = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;

const isValidCalendarDate = (year: number, monthIndex: number, day: number): boolean => {
	const candidate = new Date(year, monthIndex, day);
	return (
		candidate.getFullYear() === year &&
		candidate.getMonth() === monthIndex &&
		candidate.getDate() === day
	);
};

const startOfDay = (date: Date): Date =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate());

const resolveCandidate = (candidate: DateCandidate, now: Date): Date | null => {
	const { monthIndex, day, year } = candidate;
	if (year != null) {
		return isValidCalendarDate(year, monthIndex, day)
			? new Date(year, monthIndex, day)
			: null;
	}

	// No explicit year: assume the current year, bumping forward when the date
	// has already passed (a booking mention points at the future).
	const currentYear = now.getFullYear();
	if (!isValidCalendarDate(currentYear, monthIndex, day)) {
		// e.g. "Feb 29" in a non-leap year — try the next year before giving up.
		return isValidCalendarDate(currentYear + 1, monthIndex, day)
			? new Date(currentYear + 1, monthIndex, day)
			: null;
	}

	const sameYear = new Date(currentYear, monthIndex, day);
	if (sameYear >= startOfDay(now)) return sameYear;

	return isValidCalendarDate(currentYear + 1, monthIndex, day)
		? new Date(currentYear + 1, monthIndex, day)
		: null;
};

/**
 * Extracts the first specific calendar date mentioned in free text (a venue's
 * reply email). Regex-only by design: month-name forms ("June 14th, 2026",
 * "the 14th of June"), slash forms ("6/14", "6/14/26"), and today/tomorrow.
 * Returns the earliest mention by position in the text, or null.
 */
export const extractFirstMentionedDate = (
	text: string,
	now: Date = new Date()
): Date | null => {
	if (!text.trim()) return null;

	const candidates: DateCandidate[] = [];

	const relativeMatch = /\b(today|tomorrow)\b/i.exec(text);
	if (relativeMatch) {
		const base = startOfDay(now);
		const date =
			relativeMatch[1].toLowerCase() === 'tomorrow'
				? new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1)
				: base;
		candidates.push({
			index: relativeMatch.index,
			monthIndex: date.getMonth(),
			day: date.getDate(),
			year: date.getFullYear(),
		});
	}

	MONTH_DAY_REGEX.lastIndex = 0;
	for (let match = MONTH_DAY_REGEX.exec(text); match; match = MONTH_DAY_REGEX.exec(text)) {
		const monthIndex = MONTH_NAME_TO_INDEX[match[1].toLowerCase()];
		if (monthIndex == null) continue;
		candidates.push({
			index: match.index,
			monthIndex,
			day: Number(match[2]),
			year: match[3] ? Number(match[3]) : null,
		});
	}

	DAY_MONTH_REGEX.lastIndex = 0;
	for (let match = DAY_MONTH_REGEX.exec(text); match; match = DAY_MONTH_REGEX.exec(text)) {
		const monthIndex = MONTH_NAME_TO_INDEX[match[2].toLowerCase()];
		if (monthIndex == null) continue;
		candidates.push({
			index: match.index,
			monthIndex,
			day: Number(match[1]),
			year: match[3] ? Number(match[3]) : null,
		});
	}

	SLASH_DATE_REGEX.lastIndex = 0;
	for (
		let match = SLASH_DATE_REGEX.exec(text);
		match;
		match = SLASH_DATE_REGEX.exec(text)
	) {
		const month = Number(match[1]);
		const day = Number(match[2]);
		if (month < 1 || month > 12 || day < 1 || day > 31) continue;
		let year: number | null = null;
		if (match[3]) {
			const rawYear = Number(match[3]);
			if (match[3].length === 2) {
				year = 2000 + rawYear;
			} else if (match[3].length === 4) {
				year = rawYear;
			} else {
				continue;
			}
		}
		candidates.push({ index: match.index, monthIndex: month - 1, day, year });
	}

	candidates.sort((a, b) => a.index - b.index);
	for (const candidate of candidates) {
		const resolved = resolveCandidate(candidate, now);
		if (resolved) return resolved;
	}
	return null;
};
