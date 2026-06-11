// Shared shapes for the internal-messaging feature (venue ↔ standard-user DMs).
// Used by the API routes, the React Query hooks, and the UI components.

export type MessageSenderRole = 'standard' | 'venue';

export type BookingRequestStatusValue = 'pending' | 'confirmed' | 'canceled';

// Live state of a venue's "Request to book" handshake, attached at read time to
// the Message that delivered it (and to that message's projected inbound row on
// the artist side) so both UIs render the request's CURRENT status, not the
// status at send time.
export interface SerializedBookingRequest {
	id: number;
	conversationId: number;
	threadApplicationId: number | null; // null = general/cold-outreach thread
	eventId: number | null;
	status: BookingRequestStatusValue;
	date: string | null; // 'YYYY-MM-DD'; set when the artist confirms
	requestedAt: string; // ISO
	confirmedAt: string | null; // ISO
	canceledAt: string | null; // ISO
	// Event context for the artist's confirm popup (pre-places the event's date).
	// Null for general-thread requests or when the event no longer resolves.
	eventName: string | null;
	eventStartsAt: string | null; // ISO instant (venue-local picked date + time)
	eventWhenLabel: string | null; // faithful display label, e.g. "June 15th 2026"
}

export interface SerializedMessage {
	id: number;
	conversationId: number;
	sender: MessageSenderRole;
	body: string;
	isHtml: boolean; // diverted first message = HTML; replies = plain text
	// Set only on the seeded application-summary message (unique per application);
	// replies carry threadApplicationId instead, which is not serialized. Lets the
	// UI swap that one message for a structured application card.
	applicationId: number | null;
	// Set on the message that delivered a booking request, with its live state —
	// the thread UIs swap that message's bubble for the booking-request banner.
	bookingRequestId: number | null;
	bookingRequest: SerializedBookingRequest | null;
	createdAt: string; // ISO
}

export interface ConversationCounterpart {
	name: string;
	isVenue: boolean; // true when the counterpart is a venue (drives the badge)
	businessType?: string | null;
	city?: string | null;
	state?: string | null;
	// Artist profile chips (venue-side lists only), from the artist's most
	// recently updated Identity. Absent for venue counterparts.
	genre?: string | null;
	area?: string | null;
}

export interface ConversationListItem {
	id: number;
	counterpart: ConversationCounterpart;
	lastMessagePreview: string;
	lastMessageAt: string; // ISO
	unreadCount: number;
	// Cold campaign outreach: the conversation's first message is a diverted Email.
	// `subject` is that Email's subject (display only — the Email row may be deleted
	// later, so `hasDivertOrigin` is the durable signal).
	hasDivertOrigin: boolean;
	subject: string | null;
}

export interface MessagesPage {
	items: SerializedMessage[]; // ascending by id (oldest → newest)
	nextCursor: number | null; // pass back as ?cursor to load older messages
	currentUserRole: MessageSenderRole; // lets the UI align bubbles without id plumbing
	counterpart: ConversationCounterpart;
	// Latest non-canceled booking request for THIS thread view (null for the merged
	// 'all' view) — page-level so the venue banner/button stay correct even when the
	// delivering message has paginated out of `items`.
	bookingRequest: SerializedBookingRequest | null;
	// Whether the venue side has authored ≥1 message in this thread view — the
	// "Request to book" button precondition, server-computed for the same reason.
	venueHasMessaged: boolean;
}
