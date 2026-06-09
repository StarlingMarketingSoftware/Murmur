import type { InboundEmailWithRelations } from '@/types';

export type InboxConversationMessage = InboundEmailWithRelations & { isSent?: boolean };

export type InboxConversation = {
	key: string;
	messages: InboxConversationMessage[];
	inboundMessages: InboxConversationMessage[];
	sentMessages: InboxConversationMessage[];
	latestMessage: InboxConversationMessage;
	latestInboundMessage: InboxConversationMessage | null;
	sortAtMs: number;
};

export const normalizeInboxEmailAddress = (value: string | null | undefined): string => {
	const raw = value?.trim();
	if (!raw) return '';

	const angleMatch = raw.match(/<([^>]+)>/);
	return (angleMatch?.[1] || raw).trim().toLowerCase();
};

const normalizeThreadSubject = (value: string | null | undefined): string =>
	(value || '')
		.toLowerCase()
		.replace(/^\s*(re|fw|fwd):\s*/i, '')
		.replace(/\s+/g, ' ')
		.trim();

export const getInboxMessageTimeMs = (email: InboxConversationMessage): number => {
	const value = email.receivedAt ?? email.createdAt ?? null;
	if (!value) return 0;

	const time = new Date(value).getTime();
	return Number.isNaN(time) ? 0 : time;
};

export const getInboxMessageSnippet = (email: InboxConversationMessage): string => {
	const raw = email.strippedText || email.bodyPlain || email.bodyHtml || '';
	return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

export const getInboxConversationKey = (email: InboxConversationMessage): string => {
	const originalEmail = email.originalEmail as
		| { campaignId?: number | null; contactId?: number | null; subject?: string | null }
		| null
		| undefined;
	const campaignKey = email.campaignId ?? email.campaign?.id ?? originalEmail?.campaignId ?? 'none';
	const contactId = email.contactId ?? email.contact?.id ?? originalEmail?.contactId ?? null;

	// Venue internal messages are threaded per context: each application's chat is
	// its own conversation, separate from the general/cold-outreach chat with the
	// same venue. Only application threads get the suffix — general-thread replies
	// keep the bare key so they still interleave with the artist's diverted sent
	// email (which has no venue markers and groups by campaign+contact).
	const venueThreadSuffix =
		email.venueConversationId != null && email.venueThreadApplicationId != null
			? `:vthread:${email.venueThreadApplicationId}`
			: '';

	if (contactId != null) return `${campaignKey}:contact:${contactId}${venueThreadSuffix}`;

	const participant =
		normalizeInboxEmailAddress(email.sender) || normalizeInboxEmailAddress(email.contact?.email);
	if (participant) return `${campaignKey}:email:${participant}${venueThreadSuffix}`;

	const subject = normalizeThreadSubject(email.subject || originalEmail?.subject);
	if (subject) return `${campaignKey}:subject:${subject}${venueThreadSuffix}`;

	return `${campaignKey}:message:${email.id}`;
};

export const buildInboxConversations = (
	emails: InboxConversationMessage[]
): InboxConversation[] => {
	const grouped = new Map<string, InboxConversationMessage[]>();

	for (const email of emails) {
		const key = getInboxConversationKey(email);
		const existing = grouped.get(key);
		if (existing) {
			existing.push(email);
		} else {
			grouped.set(key, [email]);
		}
	}

	return Array.from(grouped.entries())
		.map(([key, messages]) => {
			const chronologicalMessages = [...messages].sort((a, b) => {
				const byTime = getInboxMessageTimeMs(a) - getInboxMessageTimeMs(b);
				if (byTime !== 0) return byTime;

				const byId = a.id - b.id;
				if (byId !== 0) return byId;

				return Number(Boolean(a.isSent)) - Number(Boolean(b.isSent));
			});
			const inboundMessages = chronologicalMessages.filter((message) => !message.isSent);
			const sentMessages = chronologicalMessages.filter((message) => message.isSent);
			const latestMessage = chronologicalMessages[chronologicalMessages.length - 1];
			const latestInboundMessage = inboundMessages[inboundMessages.length - 1] ?? null;

			return {
				key,
				messages: chronologicalMessages,
				inboundMessages,
				sentMessages,
				latestMessage,
				latestInboundMessage,
				sortAtMs: getInboxMessageTimeMs(latestMessage),
			};
		})
		.sort((a, b) => b.sortAtMs - a.sortAtMs || b.latestMessage.id - a.latestMessage.id);
};

export const inboxConversationContainsEmailId = (
	conversation: InboxConversation,
	emailId: number | null | undefined
): boolean => {
	if (emailId == null) return false;
	return conversation.messages.some((message) => message.id === emailId);
};

export const inboxConversationContainsInboundEmailId = (
	conversation: InboxConversation,
	emailId: number | null | undefined
): boolean => {
	if (emailId == null) return false;
	return conversation.inboundMessages.some((message) => message.id === emailId);
};

export const inboxConversationContainsSentEmailId = (
	conversation: InboxConversation,
	emailId: number | null | undefined
): boolean => {
	if (emailId == null) return false;
	return conversation.sentMessages.some((message) => message.id === emailId);
};
