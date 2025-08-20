import { Font } from '@/types';

export const FONT_OPTIONS: Font[] = [
	'Arial',
	'Times New Roman',
	'Calibri',
	'Georgia',
	'Courier New',
];

export const DEFAULT_FONT: Font = 'Arial';

export const RESTRICTED_FEATURE_MESSAGES = {
	viewEmails: 'Upgrade your subscription to view recipient emails before sending.',
	freePlanSendingLimit:
		'You have reached the sending limit on the free plan. Please sign up for a subscription to send more emails.',
};

export const BASE_URL =
	process.env.NEXT_PUBLIC_SITE_URL ??
	(typeof window !== 'undefined' ? window.location.origin : '');

export const GOLDEN_RATIO = 1.618;
export const INVERSE_GOLDEN = 0.618;
