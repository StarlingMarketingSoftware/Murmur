// Transactional core for internal messaging (venue ↔ standard-user DMs).
// Routes are thin HTTP adapters over these functions; all DB logic lives here so
// it is unit-testable. Phase 1 has no realtime — polling drives the UI; the
// fire-and-forget Pusher publish points are marked for Phase 2.

import prisma from '@/lib/prisma';
import { EmailStatus, MessageSender, type Message } from '@prisma/client';
import { convertHtmlToPlainText } from '@/utils';
import type {
	ConversationCounterpart,
	ConversationListItem,
	MessageSenderRole,
	MessagesPage,
	SerializedMessage,
} from '@/types';

/** A contact is a published venue user exactly when it carries a venueId. */
export const isVenueContact = (contact: { venueId: number | null }): boolean =>
	contact.venueId != null;

export const serializeMessage = (message: Message): SerializedMessage => ({
	id: message.id,
	conversationId: message.conversationId,
	sender: message.sender,
	body: message.body,
	isHtml: message.isHtml,
	createdAt: message.createdAt.toISOString(),
});

/** Plain-text, truncated preview of a message body for the inbox list. */
export const buildPreview = (body: string, isHtml: boolean, max = 140): string => {
	const text = (isHtml ? convertHtmlToPlainText(body) : body).replace(/\s+/g, ' ').trim();
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

/** Resolve which side of a conversation `userId` is, or null if not a participant. */
const resolveRole = async (
	userId: string,
	conversation: { standardUserId: string; venueId: number }
): Promise<MessageSenderRole | null> => {
	if (conversation.standardUserId === userId) return 'standard';
	const venue = await prisma.venue.findUnique({
		where: { id: conversation.venueId },
		select: { userId: true },
	});
	return venue?.userId === userId ? 'venue' : null;
};

const getCounterpart = async (
	role: MessageSenderRole,
	conversation: { standardUserId: string; venueId: number }
): Promise<ConversationCounterpart> => {
	if (role === 'standard') {
		const v = await prisma.venue.findUnique({
			where: { id: conversation.venueId },
			select: { venueName: true, businessType: true, city: true, state: true },
		});
		return {
			name: v?.venueName || 'Venue',
			isVenue: true,
			businessType: v?.businessType ?? null,
			city: v?.city ?? null,
			state: v?.state ?? null,
		};
	}
	const u = await prisma.user.findUnique({
		where: { clerkId: conversation.standardUserId },
		select: { firstName: true, lastName: true, email: true },
	});
	const name =
		[u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.email || 'Unknown';
	return { name, isVenue: false };
};

// ── Divert ───────────────────────────────────────────────────────────────────

type DivertCode = 'not_found' | 'forbidden' | 'not_venue' | 'venue_unavailable' | 'self_message';

export type DivertResult =
	| { ok: true; conversationId: number; message: SerializedMessage }
	| { ok: false; code: DivertCode };

/**
 * Divert a drafted Email to a venue user as an internal message instead of
 * emailing. Idempotent: re-running for the same emailId resolves to the existing
 * conversation + message, so a retried/double-clicked send creates no duplicates.
 */
export const divertEmailToMessage = async (
	userId: string,
	emailId: number
): Promise<DivertResult> => {
	const email = await prisma.email.findUnique({
		where: { id: emailId },
		include: { contact: true },
	});
	if (!email) return { ok: false, code: 'not_found' };
	if (email.userId !== userId) return { ok: false, code: 'forbidden' };
	if (!isVenueContact(email.contact)) return { ok: false, code: 'not_venue' };

	const venue = await prisma.venue.findUnique({
		where: { id: email.contact.venueId! },
		select: { id: true, userId: true },
	});
	if (!venue) return { ok: false, code: 'venue_unavailable' };
	if (venue.userId === userId) return { ok: false, code: 'self_message' };

	const message = await prisma.$transaction(async (tx) => {
		const conversation = await tx.conversation.upsert({
			where: { standardUserId_venueId: { standardUserId: userId, venueId: venue.id } },
			create: { standardUserId: userId, venueId: venue.id },
			update: {},
			select: { id: true },
		});

		// One diverted Message per Email (unique emailId) → idempotent on retry.
		const msg = await tx.message.upsert({
			where: { emailId: email.id },
			create: {
				conversationId: conversation.id,
				sender: MessageSender.standard,
				senderClerkId: userId,
				body: email.message,
				isHtml: true,
				emailId: email.id,
				campaignId: email.campaignId,
			},
			update: {},
		});

		await tx.conversation.update({
			where: { id: conversation.id },
			// Bump recency only. Deliberately do NOT advance standardLastReadAt here:
			// the diverted message is the sender's own (never counts toward their
			// unread), and moving the watermark to now would wrongly mark older,
			// genuinely-unread venue replies as read.
			data: { lastMessageAt: msg.createdAt },
		});

		// Mark the drafted Email handled — the same row-status write the send flow
		// performs on success; the internal channel (not Mailgun) delivered it.
		await tx.email.update({
			where: { id: email.id },
			data: { status: EmailStatus.sent, sentAt: new Date() },
		});

		return msg;
	});

	// Phase 2: fire-and-forget realtime publish to the venue's inbox + conversation
	// channel here. Phase 1 relies on polling.
	return {
		ok: true,
		conversationId: message.conversationId,
		message: serializeMessage(message),
	};
};

// ── Reply ────────────────────────────────────────────────────────────────────

type ReplyCode = 'not_found' | 'forbidden' | 'empty';

export type ReplyResult =
	| { ok: true; conversationId: number; message: SerializedMessage }
	| { ok: false; code: ReplyCode };

export const createReply = async (
	userId: string,
	conversationId: number,
	rawBody: string
): Promise<ReplyResult> => {
	const body = rawBody.trim();
	if (!body) return { ok: false, code: 'empty' };

	const conversation = await prisma.conversation.findUnique({
		where: { id: conversationId },
		select: { id: true, standardUserId: true, venueId: true },
	});
	if (!conversation) return { ok: false, code: 'not_found' };

	const role = await resolveRole(userId, conversation);
	if (!role) return { ok: false, code: 'forbidden' };

	const message = await prisma.$transaction(async (tx) => {
		const msg = await tx.message.create({
			data: {
				conversationId,
				sender: role === 'standard' ? MessageSender.standard : MessageSender.venue,
				senderClerkId: userId,
				body,
				isHtml: false,
			},
		});
		await tx.conversation.update({
			where: { id: conversationId },
			data: {
				lastMessageAt: msg.createdAt,
				// The author has read up to their own message.
				...(role === 'standard'
					? { standardLastReadAt: msg.createdAt }
					: { venueLastReadAt: msg.createdAt }),
			},
		});
		return msg;
	});

	// Phase 2: fire-and-forget realtime publish here.
	return { ok: true, conversationId, message: serializeMessage(message) };
};

// ── Read state ───────────────────────────────────────────────────────────────

export const markConversationRead = async (
	userId: string,
	conversationId: number
): Promise<{ ok: true } | { ok: false; code: 'not_found' | 'forbidden' }> => {
	const conversation = await prisma.conversation.findUnique({
		where: { id: conversationId },
		select: { id: true, standardUserId: true, venueId: true },
	});
	if (!conversation) return { ok: false, code: 'not_found' };

	const role = await resolveRole(userId, conversation);
	if (!role) return { ok: false, code: 'forbidden' };

	await prisma.conversation.update({
		where: { id: conversationId },
		data:
			role === 'standard'
				? { standardLastReadAt: new Date() }
				: { venueLastReadAt: new Date() },
	});
	return { ok: true };
};

// ── List + history ──────────────────────────────────────────────────────────

/** Conversation inbox for the caller — works for both standard and venue users. */
export const listConversationsForUser = async (
	userId: string
): Promise<ConversationListItem[]> => {
	const me = await prisma.user.findUnique({
		where: { clerkId: userId },
		select: { accountType: true },
	});
	const myVenue =
		me?.accountType === 'venue'
			? await prisma.venue.findUnique({ where: { userId }, select: { id: true } })
			: null;
	const asVenue = !!myVenue;

	const conversations = await prisma.conversation.findMany({
		where: asVenue ? { venueId: myVenue!.id } : { standardUserId: userId },
		orderBy: { lastMessageAt: 'desc' },
	});
	if (conversations.length === 0) return [];

	const ids = conversations.map((c) => c.id);

	// Latest message per conversation (for the preview) — one query.
	const latest = await prisma.message.findMany({
		where: { conversationId: { in: ids } },
		orderBy: [{ conversationId: 'asc' }, { id: 'desc' }],
		distinct: ['conversationId'],
		select: { conversationId: true, body: true, isHtml: true },
	});
	const latestByConv = new Map(latest.map((m) => [m.conversationId, m]));

	// Unread candidates = messages authored by the OTHER side — one query, counted
	// per-conversation in JS against each conversation's read watermark.
	const otherRole: MessageSenderRole = asVenue ? 'standard' : 'venue';
	const candidates = await prisma.message.findMany({
		where: { conversationId: { in: ids }, sender: otherRole },
		select: { conversationId: true, createdAt: true },
	});
	const unreadByConv = new Map<number, number>();
	for (const c of conversations) {
		const watermark = asVenue ? c.venueLastReadAt : c.standardLastReadAt;
		const count = candidates.filter(
			(m) => m.conversationId === c.id && (!watermark || m.createdAt > watermark)
		).length;
		unreadByConv.set(c.id, count);
	}

	// Counterpart identities (batched — no N+1).
	const counterpartByConv = new Map<number, ConversationCounterpart>();
	if (asVenue) {
		const clerkIds = [...new Set(conversations.map((c) => c.standardUserId))];
		const users = await prisma.user.findMany({
			where: { clerkId: { in: clerkIds } },
			select: { clerkId: true, firstName: true, lastName: true, email: true },
		});
		const byClerk = new Map(users.map((u) => [u.clerkId, u]));
		for (const c of conversations) {
			const u = byClerk.get(c.standardUserId);
			const name =
				[u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() ||
				u?.email ||
				'Unknown';
			counterpartByConv.set(c.id, { name, isVenue: false });
		}
	} else {
		const venueIds = [...new Set(conversations.map((c) => c.venueId))];
		const venues = await prisma.venue.findMany({
			where: { id: { in: venueIds } },
			select: { id: true, venueName: true, businessType: true, city: true, state: true },
		});
		const byId = new Map(venues.map((v) => [v.id, v]));
		for (const c of conversations) {
			const v = byId.get(c.venueId);
			counterpartByConv.set(c.id, {
				name: v?.venueName || 'Venue',
				isVenue: true,
				businessType: v?.businessType ?? null,
				city: v?.city ?? null,
				state: v?.state ?? null,
			});
		}
	}

	return conversations.map((c) => {
		const last = latestByConv.get(c.id);
		return {
			id: c.id,
			counterpart: counterpartByConv.get(c.id) ?? { name: 'Unknown', isVenue: !asVenue },
			lastMessagePreview: last ? buildPreview(last.body, last.isHtml) : '',
			lastMessageAt: c.lastMessageAt.toISOString(),
			unreadCount: unreadByConv.get(c.id) ?? 0,
		};
	});
};

/** Paginated message history (cursor on monotonic id; oldest→newest in `items`). */
export const getMessagesPage = async (
	userId: string,
	conversationId: number,
	cursor: number | null,
	limit = 30
): Promise<
	{ ok: true; page: MessagesPage } | { ok: false; code: 'not_found' | 'forbidden' }
> => {
	const conversation = await prisma.conversation.findUnique({
		where: { id: conversationId },
		select: { id: true, standardUserId: true, venueId: true },
	});
	if (!conversation) return { ok: false, code: 'not_found' };

	const role = await resolveRole(userId, conversation);
	if (!role) return { ok: false, code: 'forbidden' };

	const rows = await prisma.message.findMany({
		where: { conversationId },
		orderBy: { id: 'desc' },
		take: limit + 1,
		...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
	});
	const hasMore = rows.length > limit;
	const pageRows = hasMore ? rows.slice(0, limit) : rows;
	const nextCursor = hasMore ? pageRows[pageRows.length - 1].id : null;
	const items = [...pageRows].reverse().map(serializeMessage); // ascending

	const counterpart = await getCounterpart(role, conversation);

	return { ok: true, page: { items, nextCursor, currentUserRole: role, counterpart } };
};
