import { mmdd } from '@/utils';

// Color functions matching useCampaignsTable exactly
export const getDraftFillColor = (value: number): string => {
	const v = Math.max(0, Math.min(value, 50));
	if (v === 0) return '#FFFFFF';
	if (v <= 6.25) return '#FFFBF3';
	if (v <= 12.5) return '#FFF7E7';
	if (v <= 18.75) return '#FFF3DB';
	if (v <= 25) return '#FFEFCE';
	if (v <= 31.25) return '#FFEBC2';
	if (v <= 37.5) return '#FFE7B6';
	return '#FFE3AA';
};

export const getSentFillColor = (value: number): string => {
	const v = Math.max(0, Math.min(value, 50));
	if (v === 0) return '#FFFFFF';
	if (v > 1) return '#F3FCF1';
	return '#FFFFFF';
};

export const getUpdatedFillColor = (updatedAt: Date): string => {
	const startOfDay = (d: Date) => {
		const x = new Date(d);
		x.setHours(0, 0, 0, 0);
		return x;
	};
	const now = startOfDay(new Date());
	const then = startOfDay(updatedAt);
	const msInDay = 24 * 60 * 60 * 1000;
	const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / msInDay));

	if (days === 0) return '#FFFFFF';
	if (days <= 3) return '#FBEEEE';
	if (days <= 7) return '#F8DDDD';
	if (days <= 14) return '#F4CCCC';
	if (days <= 30) return '#F0BABA';
	if (days <= 45) return '#ECA9A9';
	if (days <= 60) return '#E99898';
	return '#E58787';
};

export const getCreatedFillColor = (createdAt: Date): string => {
	const startOfDay = (d: Date) => {
		const x = new Date(d);
		x.setHours(0, 0, 0, 0);
		return x;
	};
	const now = startOfDay(new Date());
	const then = startOfDay(createdAt);
	const msInDay = 24 * 60 * 60 * 1000;
	const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / msInDay));

	if (days === 0) return '#FFFFFF';
	if (days === 1) return '#F4F7FF';
	if (days <= 3) return '#E9F0FF';
	if (days <= 7) return '#DEE8FF';
	if (days <= 14) return '#D3E0FF';
	if (days <= 30) return '#C8D8FF';
	if (days <= 60) return '#BDD1FF';
	return '#B2C9FF';
};

export const getInboxDateLabel = (date: Date): string => {
	const startOfDay = (d: Date) => {
		const x = new Date(d);
		x.setHours(0, 0, 0, 0);
		return x;
	};
	const now = startOfDay(new Date());
	const then = startOfDay(date);
	const msInDay = 24 * 60 * 60 * 1000;
	const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / msInDay));

	if (days === 0) return 'Today';
	if (days === 1) return 'Yesterday';
	return mmdd(date);
};

// Count inbound emails whose sender matches one of the campaign's contact emails.
export const getVisibleInboxCount = (
	contactEmails: (string | null | undefined)[] | undefined,
	inboundEmails: { sender?: string | null }[] | undefined
): number => {
	const contactEmailsSet = new Set(
		(contactEmails || [])
			.filter((email): email is string => Boolean(email))
			.map((email) => email.toLowerCase().trim())
	);

	if (contactEmailsSet.size === 0 || !inboundEmails) return 0;

	return inboundEmails.filter((e) => {
		const sender = e.sender?.toLowerCase().trim();
		return sender && contactEmailsSet.has(sender);
	}).length;
};

// Pastel card/folder color pairs for the mobile dashboard folder cards and the
// matching campaign chips in the mobile inbox. First two pairs come straight
// from the Figma cards; campaigns cycle through the list by index.
export type CampaignFolderScheme = { card: string; folder: string };

export const CAMPAIGN_FOLDER_SCHEMES: CampaignFolderScheme[] = [
	{ card: '#B9EAF1', folder: '#BE4A41' },
	{ card: '#CDCFF9', folder: '#C847CB' },
	{ card: '#BFF2C8', folder: '#7B3FE4' },
	{ card: '#FFE9C9', folder: '#2F6FED' },
];

export const getCampaignFolderScheme = (index: number): CampaignFolderScheme =>
	CAMPAIGN_FOLDER_SCHEMES[Math.abs(index) % CAMPAIGN_FOLDER_SCHEMES.length];
