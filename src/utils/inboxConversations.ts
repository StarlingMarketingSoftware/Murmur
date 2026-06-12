import type { EmailWithRelations, InboundEmailWithRelations } from '@/types';
import type { MyEventApplication } from '@/app/api/events/applications/route';

export type InboxConversationMessage = InboundEmailWithRelations & { isSent?: boolean };

/**
 * Projects a sent campaign email into the inbound-message shape so it can be
 * threaded into an InboxConversation alongside real replies.
 */
export const normalizeSentEmailForInboxConversation = (
	email: EmailWithRelations
): InboxConversationMessage =>
	({
		id: email.id,
		sender: email.contact?.email || '',
		senderName: email.contact
			? `${email.contact.firstName || ''} ${email.contact.lastName || ''}`.trim()
			: '',
		recipient: '',
		subject: email.subject || '',
		bodyPlain: email.message || '',
		bodyHtml: email.message || '',
		strippedText: email.message?.replace(/<[^>]*>/g, '') || '',
		receivedAt: email.sentAt || email.createdAt,
		contactId: email.contactId,
		contact: email.contact,
		campaignId: email.campaignId,
		campaign: email.campaign,
		originalEmail: null,
		originalEmailId: null,
		isSent: true,
	}) as unknown as InboxConversationMessage;

// Offsets synthesized application-row ids past every projected venue row id
// (-message.id): selection fallbacks compare raw ids across the sent/inbound
// spaces (e.g. inboxConversationContainsEmailId), so the spaces must not alias.
export const APPLICATION_SENT_ROW_ID_OFFSET = 1_000_000_000;

/**
 * Projects the artist's own submitted event application into the inbound-message
 * shape as a "sent" item, so each applied event threads as its own conversation
 * (the `venueThreadApplicationId` key suffix) with the application as its first
 * message — mirroring the summary card the venue sees. Returns null when the
 * venue's projection contact is gone (the row could never be keyed or scoped).
 */
export const normalizeApplicationForInboxConversation = (
	application: MyEventApplication
): InboxConversationMessage | null => {
	if (!application.venueContact) return null;
	// Paragraph/line breaks become newlines: thread bubbles render this as
	// whitespace-pre-wrap plain text, while snippets collapse whitespace anyway.
	const plainSummary = application.summaryHtml
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/\n{2,}/g, '\n')
		.trim();
	return {
		id: -(APPLICATION_SENT_ROW_ID_OFFSET + application.id),
		sender: application.venueContact.email,
		senderName: application.event?.venueName || 'Venue',
		recipient: '',
		subject: application.event?.name || 'Application',
		bodyPlain: plainSummary,
		bodyHtml: application.summaryHtml,
		strippedText: plainSummary,
		receivedAt: application.createdAt,
		contactId: application.venueContact.id,
		contact: null,
		campaignId: null,
		campaign: null,
		originalEmail: null,
		originalEmailId: null,
		venueConversationId: application.venueResponse?.conversationId ?? null,
		venueThreadApplicationId: application.id,
		isSent: true,
	} as unknown as InboxConversationMessage;
};

/** A synthesized application row — read-only: it has no reply channel until the
 * venue engages (replying would otherwise fall through to Mailgun and email the
 * venue contact's placeholder address). */
export const isApplicationSentRow = (email: InboxConversationMessage): boolean =>
	Boolean(email.isSent) && email.id <= -APPLICATION_SENT_ROW_ID_OFFSET;

/**
 * Strip quoted reply content from email body (e.g., "On Thu, Nov 27, 2025 at 2:36 AM ... wrote:")
 */
export const stripQuotedReply = (text: string): string => {
	// Match patterns like "On [day], [month] [date], [year] at [time] [name] <email> wrote:"
	// or "On [date], [name] wrote:" and everything after
	const patterns = [
		/\n*On\s+[A-Za-z]{3},\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*[AP]M\s+.*?wrote:[\s\S]*/i,
		/\n*On\s+[A-Za-z]+,\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*[AP]M\s+.*?wrote:[\s\S]*/i,
		/\n*On\s+\d{1,2}\/\d{1,2}\/\d{2,4}.*?wrote:[\s\S]*/i,
		/\n*On\s+.*?\s+wrote:[\s\S]*/i,
	];

	let result = text;
	for (const pattern of patterns) {
		result = result.replace(pattern, '');
	}
	return result.trim();
};

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
	// email (which has no venue markers and groups by campaign+contact). Keyed on
	// the thread tag alone: synthesized "sent application" rows must land in the
	// event thread before any Conversation row exists.
	const venueThreadSuffix =
		email.venueThreadApplicationId != null
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

/** The event-application id a conversation is threaded under, or null for
 * non-event (cold-outreach/general) conversations. */
export const getConversationThreadApplicationId = (
	conversation: InboxConversation
): number | null => {
	for (const message of conversation.messages) {
		if (message.venueThreadApplicationId != null) return message.venueThreadApplicationId;
	}
	return null;
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
