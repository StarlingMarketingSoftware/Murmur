import type { MyEventApplication } from '@/app/api/events/applications/route';

// Live status of an artist's event chat. Single source of truth for the
// status pills across the campaign side panel, the main inbox list, and the
// dashboard responses/opportunities widgets.
export type EventChatStatus = 'in-progress' | 'booked' | 'closed' | 'canceled';

export type EventChatState = {
	status: EventChatStatus;
	// Canceled events are read-only; closed ones stay messageable.
	canMessage: boolean;
	// Whether the chat tucks into the above-the-fold band (scroll up to reveal).
	isAboveFold: boolean;
};

// Canceled chats keep their normal list position for a grace day before
// moving above the fold.
export const CANCELED_ABOVE_FOLD_GRACE_MS = 24 * 60 * 60 * 1000;

type EventChatApplication = Pick<
	MyEventApplication,
	'status' | 'event' | 'booking' | 'bookedByOther'
>;

/**
 * Status precedence: canceled (event deleted) > booked (my confirmed booking)
 * > closed (someone else booked / date elapsed / withdrawn) > in-progress.
 * A booked chat keeps its green pill forever but moves above the fold once
 * the event date passes.
 */
export const deriveEventChatStatus = (
	application: EventChatApplication,
	nowMs: number
): EventChatState => {
	const event = application.event;
	if (!event || event.isActive === false) {
		const canceledAtMs = event ? Date.parse(event.updatedAt) : Number.NaN;
		return {
			status: 'canceled',
			canMessage: false,
			isAboveFold: Number.isNaN(canceledAtMs)
				? true
				: nowMs - canceledAtMs > CANCELED_ABOVE_FOLD_GRACE_MS,
		};
	}

	const startsAtMs = event.startsAt ? Date.parse(event.startsAt) : Number.NaN;
	const isElapsed = !Number.isNaN(startsAtMs) && startsAtMs < nowMs;

	if (application.booking?.status === 'confirmed') {
		return { status: 'booked', canMessage: true, isAboveFold: isElapsed };
	}

	if (application.bookedByOther || isElapsed || application.status === 'withdrawn') {
		return { status: 'closed', canMessage: true, isAboveFold: true };
	}

	return { status: 'in-progress', canMessage: true, isAboveFold: false };
};

export const EVENT_CHAT_STATUS_META: Record<
	EventChatStatus,
	{ label: string; fill: string; dot: string }
> = {
	'in-progress': { label: 'In Progress', fill: '#C5EDA0', dot: '#34A853' },
	booked: { label: 'Booked', fill: '#C5EDA0', dot: '#34A853' },
	closed: { label: 'Closed', fill: '#FCA8AA', dot: '#CE3232' },
	canceled: { label: 'Canceled', fill: '#D9D9D9', dot: '#7D7D7D' },
};

const getDayOrdinalSuffix = (day: number) => {
	if (day % 100 >= 11 && day % 100 <= 13) return 'th';
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

/** Last-communication label: same-day → "10:13am", else "Dec 12th". */
export const formatEventChatTimestamp = (
	value: string | Date | null | undefined,
	nowMs: number
): string => {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	if (date.toDateString() === new Date(nowMs).toDateString()) {
		return date
			.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
			.toLowerCase();
	}

	const month = date.toLocaleDateString('en-US', { month: 'short' });
	const day = date.getDate();
	return `${month} ${day}${getDayOrdinalSuffix(day)}`;
};

const startOfLocalDayMs = (ms: number) => {
	const date = new Date(ms);
	date.setHours(0, 0, 0, 0);
	return date.getTime();
};

/** Event-date pill label: "Today" / "Tomorrow" / "Jun 11" (falls back to the
 * venue-authored whenLabel when there's no parseable start time). */
export const formatEventDateLabel = (
	event: Pick<NonNullable<MyEventApplication['event']>, 'startsAt' | 'whenLabel'>,
	nowMs: number
): string => {
	const startsAtMs = event.startsAt ? Date.parse(event.startsAt) : Number.NaN;
	if (Number.isNaN(startsAtMs)) return event.whenLabel?.trim() || 'Date TBD';

	const dayDiff = Math.round(
		(startOfLocalDayMs(startsAtMs) - startOfLocalDayMs(nowMs)) / 86_400_000
	);
	if (dayDiff === 0) return 'Today';
	if (dayDiff === 1) return 'Tomorrow';

	const date = new Date(startsAtMs);
	return `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()}`;
};

/** Venue-authored event names usually embed the date ("Singer Songwriter for
 * December 2nd"); the card replaces it with the relative date pill, so strip
 * any date words from the title (keeping a trailing "for"). */
export const stripTrailingDateFromEventName = (name: string): string => {
	const next = name
		.replace(
			/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/gi,
			''
		)
		.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
	return next || name.trim();
};
