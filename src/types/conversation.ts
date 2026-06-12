// Shared shapes for the internal-messaging feature (venue ↔ standard-user DMs).
// Used by the API routes, the React Query hooks, and the UI components.

import type { SerializedVenueMessageAction } from '@/utils/venueMessageActions';

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
	// Prefill context for the artist's locked confirm popup: the event's times
	// (pre-formatted as calendar labels, e.g. "9 pm"), its location, the venue's
	// name, and a server-composed event+venue summary for the entry's notes.
	eventStartTimeLabel: string | null;
	eventEndTimeLabel: string | null;
	eventAddress: string | null;
	eventLatitude: number | null;
	eventLongitude: number | null;
	venueName: string | null;
	bookingNotes: string | null;
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
	// Special venue-authored action rows (currently invite-to-connect) are stored as
	// normal Message rows and interpreted at read time, avoiding a schema change.
	venueAction: SerializedVenueMessageAction | null;
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
}
