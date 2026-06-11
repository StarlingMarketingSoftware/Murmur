// Bridge: surface venue→artist internal messages inside the artist's "Responses"
// folder. Venue replies are Conversation/Message rows (the venue portal posts them
// via createReply), NOT Mailgun InboundEmail rows — so the InboundEmail-backed
// Responses feed never showed them. Rather than dual-writing a real InboundEmail row
// per reply (two sources of truth to keep in sync), we project venue messages into
// the InboundEmailWithRelations shape at read time inside GET /api/inbound, so every
// existing consumer (campaign inbox, dashboard widget, opportunities) gets them for
// free with no UI rework.
//
// Each projected row carries `venueConversationId` so a reply from the inbox can be
// routed back through the messaging system instead of emailing the venue's
// `noreply.invalid` placeholder address.

import prisma from '@/lib/prisma';
import { MessageSender } from '@prisma/client';
import { convertHtmlToPlainText } from '@/utils';
import type { InboundEmailWithRelations } from '@/types';
import { loadBookingRequestMap } from './bookingRequests';

/**
 * Project the venue-authored messages in a standard (artist) user's conversations
 * into InboundEmailWithRelations rows for the Responses feed. Returns ALL of the
 * artist's venue replies; the inbox panels scope them per-campaign via the existing
 * sender-email allowlist (the projected `sender` is the venue contact's email, which
 * is a campaign contact exactly when the artist contacted that venue from the
 * campaign). Uses batched lookups (no N+1), matching listConversationsForUser.
 */
export const projectVenueRepliesForUser = async (
	userId: string
): Promise<InboundEmailWithRelations[]> => {
	// The artist is the `standard` side of their conversations.
	const conversations = await prisma.conversation.findMany({
		where: { standardUserId: userId },
		select: { id: true, venueId: true },
	});
	if (conversations.length === 0) return [];

	const conversationIds = conversations.map((c) => c.id);
	const venueIdByConversation = new Map(conversations.map((c) => [c.id, c.venueId]));

	// Venue-authored messages = the replies the artist should see in Responses.
	const venueMessages = await prisma.message.findMany({
		where: { conversationId: { in: conversationIds }, sender: MessageSender.venue },
		orderBy: { id: 'desc' },
	});
	if (venueMessages.length === 0) return [];

	// Provenance: a venue reply itself carries no emailId/campaignId — those live on
	// the diverted (artist) message that opened the thread. Attribute each reply to
	// the most-recent diverted message in its conversation. Application-thread
	// replies skip this attribution entirely (their context is the event, not a
	// campaign) — see the threadApplicationId branch below.
	const divertedMessages = await prisma.message.findMany({
		where: { conversationId: { in: conversationIds }, emailId: { not: null } },
		orderBy: { id: 'desc' },
		select: { conversationId: true, emailId: true, campaignId: true },
	});
	const provenanceByConversation = new Map<
		number,
		{ emailId: number | null; campaignId: number | null }
	>();
	for (const m of divertedMessages) {
		if (!provenanceByConversation.has(m.conversationId)) {
			provenanceByConversation.set(m.conversationId, {
				emailId: m.emailId,
				campaignId: m.campaignId,
			});
		}
	}

	// Live booking-request state for projected request-delivery messages — the
	// artist's inbox renders those rows as a confirm banner with CURRENT status.
	const bookingRequestById = await loadBookingRequestMap(
		venueMessages
			.map((m) => m.bookingRequestId)
			.filter((id): id is number => id != null)
	);

	// Event names for application-thread replies — shown as the row subject so the
	// artist's inbox labels the chat with the opportunity it belongs to.
	const threadApplicationIds = [
		...new Set(
			venueMessages
				.map((m) => m.threadApplicationId)
				.filter((id): id is number => id != null)
		),
	];
	const threadApplications = threadApplicationIds.length
		? await prisma.eventApplication.findMany({
				where: { id: { in: threadApplicationIds } },
				select: { id: true, eventId: true },
			})
		: [];
	const threadEventIds = [...new Set(threadApplications.map((a) => a.eventId))];
	const threadEvents = threadEventIds.length
		? await prisma.event.findMany({
				where: { id: { in: threadEventIds } },
				select: { id: true, name: true },
			})
		: [];
	const eventNameById = new Map(threadEvents.map((e) => [e.id, e.name]));
	const eventNameByApplicationId = new Map(
		threadApplications.map((a) => [a.id, eventNameById.get(a.eventId) ?? null])
	);

	// Batch-load the relations the Responses UI renders.
	const venueIds = [...new Set(conversations.map((c) => c.venueId))];
	const venueContacts = await prisma.contact.findMany({
		where: { venueId: { in: venueIds } },
	});
	const contactByVenueId = new Map(venueContacts.map((c) => [c.venueId as number, c]));

	const provenances = [...provenanceByConversation.values()];
	const campaignIds = [
		...new Set(provenances.map((p) => p.campaignId).filter((id): id is number => id != null)),
	];
	const campaigns = campaignIds.length
		? await prisma.campaign.findMany({ where: { id: { in: campaignIds } } })
		: [];
	const campaignById = new Map(campaigns.map((c) => [c.id, c]));

	const emailIds = [
		...new Set(provenances.map((p) => p.emailId).filter((id): id is number => id != null)),
	];
	const originalEmails = emailIds.length
		? await prisma.email.findMany({ where: { id: { in: emailIds } } })
		: [];
	const emailById = new Map(originalEmails.map((e) => [e.id, e]));

	const rows: InboundEmailWithRelations[] = [];
	for (const message of venueMessages) {
		const venueId = venueIdByConversation.get(message.conversationId);
		if (venueId == null) continue;
		const contact = contactByVenueId.get(venueId) ?? null;
		// Application-thread replies belong to the opportunity, not to a campaign:
		// no divert provenance, and the subject is the event's name.
		const isApplicationThread = message.threadApplicationId != null;
		const provenance = isApplicationThread
			? undefined
			: provenanceByConversation.get(message.conversationId);
		const campaignId = provenance?.campaignId ?? null;
		const originalEmailId = provenance?.emailId ?? null;

		const campaign = campaignId != null ? (campaignById.get(campaignId) ?? null) : null;
		const originalEmail =
			originalEmailId != null ? (emailById.get(originalEmailId) ?? null) : null;
		const plainBody = message.isHtml ? convertHtmlToPlainText(message.body) : message.body;

		rows.push({
			// Synthetic negative id: never collides with positive real inbound ids, and
			// signals "not a persisted InboundEmail row" to id-based side effects.
			id: -message.id,
			// Use the venue contact's email so existing sender-based threading behaves;
			// reply routing keys off venueConversationId, never this placeholder address.
			sender: contact?.email ?? `venue-${venueId}@noreply.invalid`,
			senderName: contact?.company ?? 'Venue',
			recipient: '',
			to: null,
			from: null,
			subject: isApplicationThread
				? (eventNameByApplicationId.get(message.threadApplicationId!) ?? 'Application')
				: (originalEmail?.subject ?? null),
			date: null,
			mimeVersion: null,
			inReplyTo: null,
			userAgent: null,
			references: null,
			contentType: null,
			messageHeaders: null,
			received: null,
			messageId: `venue-msg-${message.id}`,
			bodyPlain: plainBody,
			bodyHtml: message.isHtml ? message.body : null,
			strippedText: plainBody,
			strippedHtml: null,
			strippedSignature: null,
			attachments: null,
			attachmentCount: null,
			contentIdMap: null,
			mailgunVariables: null,
			token: null,
			timestamp: null,
			signature: null,
			userId,
			// Use the diverted email's contactId so the reply threads with the original
			// outreach. Equals the venue projection contact id (Contact.venueId is unique),
			// so it also matches the campaign-inbox sender/contact scoping.
			contactId: originalEmail?.contactId ?? contact?.id ?? null,
			originalEmailId,
			campaignId,
			receivedAt: message.createdAt,
			createdAt: message.createdAt,
			updatedAt: message.updatedAt,
			contact,
			campaign,
			originalEmail,
			venueConversationId: message.conversationId,
			// Venue-authored messages carry their thread tag directly (only seeded
			// summaries use applicationId, and those are standard-authored).
			venueThreadApplicationId: message.threadApplicationId,
			venueBookingRequest:
				message.bookingRequestId != null
					? (bookingRequestById.get(message.bookingRequestId) ?? null)
					: null,
		});
	}

	return rows;
};
