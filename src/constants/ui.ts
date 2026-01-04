import { Font } from '@/types';

export const FONT_OPTIONS: Font[] = [
	'Arial',
	'serif',
	'Courier New',
	'Arial Black',
	'Arial Narrow',
	'Garamond',
	'Georgia',
	'Tahoma',
	'Trebuchet MS',
	'Verdana',
	'Times New Roman',
	'Calibri',
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

export const canadianProvinceNames = [
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
	'Edmonton',
];

export const canadianProvinceAbbreviations = [
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
];

export const stateBadgeColorMap: Record<string, string> = {
	AL: '#F9D7D7',
	AK: '#D7D7F3',
	AZ: '#E7F3D7',
	AR: '#D4F7B3',
	CA: '#D7F3EE',
	CO: '#E3F2CF',
	CT: '#DED7F3',
	DE: '#D8F3D7',
	FL: '#F7E3D7',
	GA: '#D7E8F3',
	HI: '#F7F3D7',
	ID: '#E8D7F3',
	IL: '#F7F3D7',
	IN: '#F9DDD7',
	IA: '#D7E8F3',
	KS: '#E7F3D7',
	KY: '#F3D7EA',
	LA: '#D7F3E8',
	ME: '#F3ECD7',
	MD: '#D7F3E8',
	MA: '#D7F3D2',
	MI: '#F9D7E8',
	MN: '#E8F3D7',
	MS: '#E8F3D7',
	MO: '#D7F3E8',
	MT: '#D7F3E8',
	NE: '#D7F3E8',
	NV: '#DAD7F3',
	NH: '#DCD3D7',
	NJ: '#E8F3D7',
	NM: '#D7ECF3',
	NY: '#E8D7F3',
	NC: '#EAD7F3',
	ND: '#D7F3E8',
	OH: '#F3D8D7',
	OK: '#D7D8F3',
	OR: '#D7F3D7',
	PA: '#F3D7ED',
	RI: '#D7F3E8',
	SC: '#F3E8D7',
	SD: '#F3D7E8',
	TN: '#D7F3DC',
	TX: '#F9D7DE',
	UT: '#D7F3E8',
	VT: '#EFF3D7',
	VA: '#D7F3D1',
	WA: '#D7F3E7',
	WV: '#D7F3E8',
	WI: '#D7D7F3',
	WY: '#D7F3D7',
};
