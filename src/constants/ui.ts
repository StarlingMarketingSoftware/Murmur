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

export const stateBadgeColorMap: Record<string, string> = {
	AL: '#F3D7D7',
	AK: '#D7D7F3',
	AZ: '#E7F307',
	AR: '#F3D7F0',
	CA: '#D7F3EE',
	CO: '#F3E6D7',
	CT: '#DEB7F3',
	DE: '#DBF3D7',
	FL: '#F3D7E0',
	GA: '#D7F3F3',
	HI: '#F1B7F3',
	ID: '#EDF7F3',
	IL: '#D7F3E5',
	IN: '#F3DDD7',
	IA: '#D7D9F3',
	KS: '#E2F3D7',
	KY: '#F3DFA2',
	LA: '#D7F3F3',
	ME: '#F3ECD7',
	MD: '#EDF7F3',
	MA: '#D7F3DC',
	MI: '#F3D7D8',
	MN: '#D7F3E3',
	MS: '#EBF307',
	MO: '#F3D7F3',
	MT: '#D7F3EB',
	NE: '#F3EBD7',
	NV: '#DAD7F3',
	NH: '#DCF3D7',
	NJ: '#DCF3D7',
	NM: '#DCF3C7',
	NY: '#F3F2D7',
	NC: '#EAD7F3',
	ND: '#D7F3E1',
	OH: '#F3D9D7',
	OK: '#D0F3D7',
	OR: '#E5F3D7',
	PA: '#F3D7ED',
	RI: '#D7F3F1',
	SC: '#F3E8D7',
	SD: '#E0F7F3',
	TN: '#D7F3B8',
	TX: '#F3D7DE',
	UT: '#D7E6F3',
	VT: '#EFF3D7',
	VA: '#EDF7F3',
	WA: '#D7F3E7',
	WV: '#F3DFD7',
	WI: '#D7F3F3',
	WY: '#DFF307',
};

// Canadian provinces detection (by full name and abbreviation)
export const canadianProvinceNames: Set<string> = new Set(
	[
		'Alberta',
		'British Columbia',
		'Manitoba',
		'New Brunswick',
		'Newfoundland and Labrador',
		'Nova Scotia',
		'Ontario',
		'Prince Edward Island',
		'Quebec',
		'Saskatchewan',
	].map((s) => s.toLowerCase())
);

export const canadianProvinceAbbreviations: Set<string> = new Set([
	'AB',
	'BC',
	'MB',
	'NB',
	'NL',
	'NS',
	'ON',
	'PE',
	'QC',
	'SK',
]);
