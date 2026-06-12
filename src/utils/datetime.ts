// Inbox-style relative timestamp: today → "3:45pm", otherwise → "May 12th".
// (Mirrors the formatter used by the email inbox lists; kept here so the messaging
// UI shares one source.)

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

export const formatInboxTimestamp = (value: string | Date | null | undefined) => {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	const now = new Date();
	const isSameDay = date.toDateString() === now.toDateString();

	if (isSameDay) {
		return date
			.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
			.toLowerCase();
	}

	const month = date.toLocaleDateString('en-US', { month: 'short' });
	const day = date.getDate();
	return `${month} ${day}${getDayOrdinalSuffix(day)}`;
};

// Event-countdown label for inbox pills: whole days until the event's start day →
// "5d" ("0d" on the day itself). Past events fall back to the inbox date label.
export const formatEventCountdown = (startsAt: string | Date | null | undefined) => {
	if (!startsAt) return '';
	const date = new Date(startsAt);
	if (Number.isNaN(date.getTime())) return '';

	const startOfToday = new Date();
	startOfToday.setHours(0, 0, 0, 0);
	const startOfEventDay = new Date(date);
	startOfEventDay.setHours(0, 0, 0, 0);
	const days = Math.round(
		(startOfEventDay.getTime() - startOfToday.getTime()) / 86_400_000
	);

	if (days < 0) return formatInboxTimestamp(date);
	return `${days}d`;
};
