import { Prisma } from '@prisma/client';
import type { SerializedBookingRequest } from './conversation';
import type { SerializedVenueMessageAction } from '@/utils/venueMessageActions';

// Enums
export type CampaignWithRelations = Prisma.CampaignGetPayload<{
	include: {
		signature: true;
		contactLists: true;
		identity: true;
		userContactLists: true;
	};
}>;

// Types
export type EmailWithRelations = Prisma.EmailGetPayload<{
	include: {
		contact: true;
		campaign: true;
	};
}>;

export type InboundEmailWithRelations = Prisma.InboundEmailGetPayload<{
	include: {
		contact: true;
		campaign: true;
		originalEmail: true;
	};
}> & {
	/**
	 * Set ONLY on rows that are venue↔artist internal messages projected into the
	 * inbound feed by GET /api/inbound — they are not real Mailgun InboundEmail
	 * rows (their `id` is synthetic/negative). Carries the Conversation id so a
	 * reply can be routed back through the messaging system (createReply) instead
	 * of emailing the venue's `noreply.invalid` placeholder address. Absent/undefined
	 * on real inbound email rows.
	 */
	venueConversationId?: number | null;
	/**
	 * Which thread of that conversation the venue message belongs to: an
	 * EventApplication id for application-context messages, null/undefined for the
	 * general (cold-outreach) thread. Replies route back into the same thread.
	 */
	venueThreadApplicationId?: number | null;
	/**
	 * Live booking-request state for projected venue messages that delivered a
	 * booking request (Message.bookingRequestId). Absent on real inbound rows.
	 */
	venueBookingRequest?: SerializedBookingRequest | null;
	/**
	 * Special venue-authored action row projected into Responses, e.g. an
	 * invite-to-connect ping.
	 */
	venueAction?: SerializedVenueMessageAction | null;
};

export type TestDraftEmail = {
	subject: string;
	message: string;
	contactEmail: string;
};

export type Font =
	| 'Arial'
	| 'serif'
	| 'Courier New'
	| 'Arial Black'
	| 'Arial Narrow'
	| 'Garamond'
	| 'Georgia'
	| 'Tahoma'
	| 'Trebuchet MS'
	| 'Verdana'
	| 'Times New Roman'
	| 'Calibri';
