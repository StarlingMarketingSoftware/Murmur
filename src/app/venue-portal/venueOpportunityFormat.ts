// Display formatting for venue opportunity (event) rows, shared by the
// VenuePortalClient lists and the Events panel's detail view.
import type { Event as VenueEvent } from '@prisma/client';

const VENUE_OPPORTUNITY_MONTH_LABELS = [
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

const getVenueOpportunityOrdinalSuffix = (day: number) => {
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

const formatVenueOpportunityDateFromValue = (value: Date | string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	const day = date.getDate();
	return `${VENUE_OPPORTUNITY_MONTH_LABELS[date.getMonth()]} ${day}${getVenueOpportunityOrdinalSuffix(day)}`;
};

export const formatVenueOpportunityDate = (
	whenLabel: string | null | undefined,
	startsAt: Date | string | null | undefined
) => {
	const label = whenLabel?.trim();
	if (label) return label.replace(/\s+\d{4}$/, '');
	if (startsAt) return formatVenueOpportunityDateFromValue(startsAt);
	return 'Date TBD';
};

const formatVenueOpportunityTimeValue = (value: string | null | undefined) => {
	if (!value) return '';

	const [hoursText, minutesText = '00'] = value.split(':');
	const hours = Number(hoursText);
	const minutes = Number(minutesText);
	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;

	const hour = hours % 12 || 12;
	const minuteLabel = minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`;
	const meridiem = hours < 12 ? 'am' : 'pm';
	return `${hour}${minuteLabel}${meridiem}`;
};

export const formatApplicantCount = (count: number) =>
	`${count} applicant${count === 1 ? '' : 's'}`;

export const formatVenueOpportunityTimeRange = (
	startTime: string | null | undefined,
	endTime: string | null | undefined
) => {
	const startLabel = formatVenueOpportunityTimeValue(startTime);
	const endLabel = formatVenueOpportunityTimeValue(endTime);

	if (startLabel && endLabel) return `${startLabel}-${endLabel}`;
	return startLabel || endLabel || 'Time TBD';
};

// "Live" mirrors the artist-facing /api/events visibility filter: an active event
// with a future (or unset) start is still discoverable and open to applications.
export const isVenueOpportunityLive = (opportunity: VenueEvent) =>
	!opportunity.startsAt || new Date(opportunity.startsAt).getTime() >= Date.now();
