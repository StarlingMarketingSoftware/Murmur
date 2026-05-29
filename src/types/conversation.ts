// Shared shapes for the internal-messaging feature (venue ↔ standard-user DMs).
// Used by the API routes, the React Query hooks, and the UI components.

export type MessageSenderRole = 'standard' | 'venue';

export interface SerializedMessage {
	id: number;
	conversationId: number;
	sender: MessageSenderRole;
	body: string;
	isHtml: boolean; // diverted first message = HTML; replies = plain text
	createdAt: string; // ISO
}

export interface ConversationCounterpart {
	name: string;
	isVenue: boolean; // true when the counterpart is a venue (drives the badge)
	businessType?: string | null;
	city?: string | null;
	state?: string | null;
}

export interface ConversationListItem {
	id: number;
	counterpart: ConversationCounterpart;
	lastMessagePreview: string;
	lastMessageAt: string; // ISO
	unreadCount: number;
}

export interface MessagesPage {
	items: SerializedMessage[]; // ascending by id (oldest → newest)
	nextCursor: number | null; // pass back as ?cursor to load older messages
	currentUserRole: MessageSenderRole; // lets the UI align bubbles without id plumbing
	counterpart: ConversationCounterpart;
}
