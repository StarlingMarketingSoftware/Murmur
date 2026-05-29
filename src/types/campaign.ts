import { Prisma } from '@prisma/client';

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
