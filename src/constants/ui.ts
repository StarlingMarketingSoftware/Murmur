import { Font } from '@/types';

export const FONT_OPTIONS: Font[] = [
	'Times New Roman',
	'Arial',
	'Calibri',
	'Georgia',
	'Courier New',
];

export const DEFAULT_FONT = 'Times New Roman';

export const RESTRICTED_FEATURE_MESSAGES = {
	viewEmails: 'Upgrade your subscription to view recipient emails.',
	freePlanSendingLimit:
		'You have reached the sending limit on the free plan. Please sign up for a subscription to send more emails.',
};

export const BASE_URL =
	process.env.NEXT_PUBLIC_SITE_URL ??
	(typeof window !== 'undefined' ? window.location.origin : '');
