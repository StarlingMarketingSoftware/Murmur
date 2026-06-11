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
	SerializedBookingRequest,
	SerializedMessage,
} from '@/types';
import { loadBookingRequestMap, serializeBookingRequestRows } from './bookingRequests';

/** A contact is a published venue user exactly when it carries a venueId. */
export const isVenueContact = (contact: { venueId: number | null }): boolean =>
	contact.venueId != null;

export const serializeMessage = (
	message: Message,
	bookingRequestById?: Map<number, SerializedBookingRequest>
): SerializedMessage => ({
	id: message.id,
	conversationId: message.conversationId,
	sender: message.sender,
	body: message.body,
	isHtml: message.isHtml,
	applicationId: message.applicationId,
	bookingRequestId: message.bookingRequestId,
	// Live state — attached at read time so the UI reflects the request's CURRENT
	// status, not the status when the message was written.
	bookingRequest:
		message.bookingRequestId != null
			? (bookingRequestById?.get(message.bookingRequestId) ?? null)
			: null,
	createdAt: message.createdAt.toISOString(),
});

/** Plain-text, truncated preview of a message body for the inbox list. */
export const buildPreview = (body: string, isHtml: boolean, max = 140): string => {
	const text = (isHtml ? convertHtmlToPlainText(body) : body).replace(/\s+/g, ' ').trim();
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

// A conversation holds one general/cold-outreach thread plus one thread per
// EventApplication, partitioned by Message.threadApplicationId. 'all' is the
// merged view (the artist's messenger); a number selects that application's thread.
export type MessageThread = 'all' | 'general' | number;

// Prisma where-fragment selecting one thread. Seeds written before the thread
// column existed carry only applicationId, hence the OR on the application arm
// and the double-null on the general arm.
const threadWhere = (thread: MessageThread) =>
	thread === 'all'
		? {}
		: thread === 'general'
			? { threadApplicationId: null, applicationId: null }
			: { OR: [{ threadApplicationId: thread }, { applicationId: thread }] };

// General-thread filter for venue-side list scoping (same shape as
// threadWhere('general'), named for readability at call sites).
const GENERAL_THREAD_WHERE = { threadApplicationId: null, applicationId: null } as const;

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

// ── Open application ─────────────────────────────────────────────────────────

const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

/**
 * The applicant's "first box" — an HTML snapshot of their application answers,
 * seeded as the opening message when a venue opens the applicant's thread. Uses
 * only tags on the sanitizeMessageHtml allowlist (p/strong/br). Exported so the
 * venue applications list can build matching plain-text previews via buildPreview.
 */
export const buildApplicationSummaryHtml = (
	application: {
		performingName: string | null;
		genre: string | null;
		area: string | null;
		bio: string | null;
	},
	eventName: string | null
): string => {
	const parts: string[] = [
		`<p><strong>${eventName ? `Application — ${escapeHtml(eventName)}` : 'Application'}</strong></p>`,
	];
	if (application.performingName?.trim()) {
		parts.push(
			`<p><strong>Performing name:</strong> ${escapeHtml(application.performingName.trim())}</p>`
		);
	}
	if (application.genre?.trim()) {
		parts.push(`<p><strong>Genre:</strong> ${escapeHtml(application.genre.trim())}</p>`);
	}
	if (application.area?.trim()) {
		parts.push(`<p><strong>Area:</strong> ${escapeHtml(application.area.trim())}</p>`);
	}
	if (application.bio?.trim()) {
		parts.push(`<p>${escapeHtml(application.bio.trim()).replace(/\n/g, '<br>')}</p>`);
	}
	return parts.join('');
};

type OpenApplicationCode = 'not_found' | 'forbidden' | 'withdrawn' | 'venue_unavailable';

export type OpenApplicationResult =
	| { ok: true; conversationId: number; message: SerializedMessage }
	| { ok: false; code: OpenApplicationCode };

/**
 * A venue opens an applicant's thread from the Replies inbox: resolve (or create)
 * the conversation with that applicant and seed it with the application summary as
 * the applicant's first message. Idempotent: one Message per application (unique
 * applicationId), so re-opening resolves to the existing conversation + message.
 */
export const openApplicationConversation = async (
	userId: string,
	applicationId: number
): Promise<OpenApplicationResult> => {
	const application = await prisma.eventApplication.findUnique({
		where: { id: applicationId },
		select: {
			id: true,
			eventId: true,
			standardUserId: true,
			venueUserId: true,
			performingName: true,
			genre: true,
			area: true,
			bio: true,
			status: true,
			createdAt: true,
		},
	});
	if (!application) return { ok: false, code: 'not_found' };
	if (application.venueUserId !== userId) return { ok: false, code: 'forbidden' };
	if (application.status === 'withdrawn') return { ok: false, code: 'withdrawn' };

	const venue = await prisma.venue.findUnique({
		where: { userId },
		select: { id: true },
	});
	if (!venue) return { ok: false, code: 'venue_unavailable' };

	// May be null if the event was deleted after the application — header degrades.
	const event = await prisma.event.findUnique({
		where: { id: application.eventId },
		select: { name: true },
	});

	const message = await prisma.$transaction(async (tx) => {
		const conversation = await tx.conversation.upsert({
			where: {
				standardUserId_venueId: {
					standardUserId: application.standardUserId,
					venueId: venue.id,
				},
			},
			// The venue is the actor opening this thread, and the seeded message is
			// backdated to the submission time, so start the venue's read watermark at
			// now — no phantom unread badge between seeding and the thread's mark-read.
			create: {
				standardUserId: application.standardUserId,
				venueId: venue.id,
				lastMessageAt: application.createdAt,
				venueLastReadAt: new Date(),
			},
			update: {},
			select: { id: true },
		});

		// One seeded Message per application (unique applicationId) → idempotent on
		// re-open, mirroring the emailId divert precedent. The seed opens (and lives
		// in) the application's own thread within the pair conversation.
		const msg = await tx.message.upsert({
			where: { applicationId: application.id },
			create: {
				conversationId: conversation.id,
				sender: MessageSender.standard,
				senderClerkId: application.standardUserId,
				body: buildApplicationSummaryHtml(application, event?.name ?? null),
				isHtml: true,
				applicationId: application.id,
				threadApplicationId: application.id,
				createdAt: application.createdAt,
			},
			update: {},
		});

		// Monotonic recency bump — a routine re-open must not move lastMessageAt
		// backward past newer messages in a pre-existing conversation.
		await tx.conversation.updateMany({
			where: { id: conversation.id, lastMessageAt: { lt: msg.createdAt } },
			data: { lastMessageAt: msg.createdAt },
		});

		return msg;
	});

	return {
		ok: true,
		conversationId: message.conversationId,
		message: serializeMessage(message),
	};
};

// ── Reply ────────────────────────────────────────────────────────────────────

type ReplyCode = 'not_found' | 'forbidden' | 'empty' | 'invalid_thread';

export type ReplyResult =
	| { ok: true; conversationId: number; message: SerializedMessage }
	| { ok: false; code: ReplyCode };

export const createReply = async (
	userId: string,
	conversationId: number,
	rawBody: string,
	threadApplicationId: number | null = null
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

	// A thread tag must reference an application between this exact pair.
	if (threadApplicationId != null) {
		const [application, venueOwner] = await Promise.all([
			prisma.eventApplication.findUnique({
				where: { id: threadApplicationId },
				select: { standardUserId: true, venueUserId: true },
			}),
			prisma.venue.findUnique({
				where: { id: conversation.venueId },
				select: { userId: true },
			}),
		]);
		if (
			!application ||
			application.standardUserId !== conversation.standardUserId ||
			application.venueUserId !== venueOwner?.userId
		) {
			return { ok: false, code: 'invalid_thread' };
		}
	}

	const message = await prisma.$transaction(async (tx) => {
		const msg = await tx.message.create({
			data: {
				conversationId,
				sender: role === 'standard' ? MessageSender.standard : MessageSender.venue,
				senderClerkId: userId,
				body,
				isHtml: false,
				threadApplicationId,
			},
		});
		await tx.conversation.update({
			where: { id: conversationId },
			data: {
				lastMessageAt: msg.createdAt,
				// The author has read up to their own message. The artist's view is
				// merged, so their watermark always advances; the venue's conversation
				// watermark only governs the general thread — an app-thread reply
				// advances the per-application read state below instead.
				...(role === 'standard'
					? { standardLastReadAt: msg.createdAt }
					: threadApplicationId == null
						? { venueLastReadAt: msg.createdAt }
						: {}),
			},
		});
		if (threadApplicationId != null) {
			// The author has read their own app-thread message — advance their side's
			// per-thread watermark.
			const readColumn =
				role === 'venue'
					? { venueLastReadAt: msg.createdAt }
					: { standardLastReadAt: msg.createdAt };
			await tx.applicationReadState.upsert({
				where: { applicationId: threadApplicationId },
				create: { applicationId: threadApplicationId, ...readColumn },
				update: readColumn,
			});
		}
		return msg;
	});

	// Phase 2: fire-and-forget realtime publish here.
	return { ok: true, conversationId, message: serializeMessage(message) };
};

// ── Read state ───────────────────────────────────────────────────────────────

export const markConversationRead = async (
	userId: string,
	conversationId: number,
	applicationId: number | null = null
): Promise<{ ok: true } | { ok: false; code: 'not_found' | 'forbidden' }> => {
	const conversation = await prisma.conversation.findUnique({
		where: { id: conversationId },
		select: { id: true, standardUserId: true, venueId: true },
	});
	if (!conversation) return { ok: false, code: 'not_found' };

	const role = await resolveRole(userId, conversation);
	if (!role) return { ok: false, code: 'forbidden' };

	// Reading one application's thread advances only that thread's read state for
	// the caller's side — the conversation watermark keeps governing the general
	// thread (and the artist's merged view).
	if (applicationId != null) {
		const [application, venueOwner] = await Promise.all([
			prisma.eventApplication.findUnique({
				where: { id: applicationId },
				select: { standardUserId: true, venueUserId: true },
			}),
			prisma.venue.findUnique({
				where: { id: conversation.venueId },
				select: { userId: true },
			}),
		]);
		// The application must belong to this exact pair (same check as createReply's
		// thread validation) — both its applicant and its venue sides must match.
		if (
			!application ||
			application.standardUserId !== conversation.standardUserId ||
			application.venueUserId !== venueOwner?.userId
		) {
			return { ok: false, code: 'forbidden' };
		}
		const readColumn =
			role === 'venue'
				? { venueLastReadAt: new Date() }
				: { standardLastReadAt: new Date() };
		await prisma.applicationReadState.upsert({
			where: { applicationId },
			create: { applicationId, ...readColumn },
			update: readColumn,
		});
		return { ok: true };
	}

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

	// Latest message per conversation (for the preview) — one query. The venue's
	// inbox lists the GENERAL thread only (application threads surface in the
	// Replies feed), so its preview/recency must not leak application chatter; the
	// artist's view stays merged.
	const latest = await prisma.message.findMany({
		where: { conversationId: { in: ids }, ...(asVenue ? GENERAL_THREAD_WHERE : {}) },
		orderBy: [{ conversationId: 'asc' }, { id: 'desc' }],
		distinct: ['conversationId'],
		select: { conversationId: true, body: true, isHtml: true, createdAt: true },
	});
	const latestByConv = new Map(latest.map((m) => [m.conversationId, m]));

	// Earliest divert per conversation — its presence means cold campaign outreach
	// exists (the venue UI's "Inbound" signal); join its Email for the campaign
	// subject. Email rows are deletable (scalar provenance), so the boolean
	// survives even when the subject doesn't resolve.
	const first = await prisma.message.findMany({
		where: { conversationId: { in: ids }, emailId: { not: null } },
		orderBy: [{ conversationId: 'asc' }, { id: 'asc' }],
		distinct: ['conversationId'],
		select: { conversationId: true, emailId: true },
	});
	const firstByConv = new Map(first.map((m) => [m.conversationId, m]));
	const divertEmailIds = first
		.map((m) => m.emailId)
		.filter((id): id is number => id != null);
	const divertEmails = divertEmailIds.length
		? await prisma.email.findMany({
				where: { id: { in: divertEmailIds } },
				select: { id: true, subject: true },
			})
		: [];
	const subjectByEmailId = new Map(divertEmails.map((e) => [e.id, e.subject]));

	// Unread candidates = messages authored by the OTHER side — one query, counted
	// per-conversation in JS against each conversation's read watermark. Venue side
	// counts the general thread only (application threads track their own state).
	const otherRole: MessageSenderRole = asVenue ? 'standard' : 'venue';
	const candidates = await prisma.message.findMany({
		where: {
			conversationId: { in: ids },
			sender: otherRole,
			...(asVenue ? GENERAL_THREAD_WHERE : {}),
		},
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
		const [users, identities] = await Promise.all([
			prisma.user.findMany({
				where: { clerkId: { in: clerkIds } },
				select: { clerkId: true, firstName: true, lastName: true, email: true },
			}),
			// Genre/area chips come from the artist's profile. A user can hold
			// multiple identities — pick the most recently updated, deterministically.
			prisma.identity.findMany({
				where: { userId: { in: clerkIds } },
				orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
				select: { userId: true, genre: true, area: true },
			}),
		]);
		const byClerk = new Map(users.map((u) => [u.clerkId, u]));
		const identityByUser = new Map<string, (typeof identities)[number]>();
		for (const identity of identities) {
			if (!identityByUser.has(identity.userId)) {
				identityByUser.set(identity.userId, identity);
			}
		}
		for (const c of conversations) {
			const u = byClerk.get(c.standardUserId);
			const name =
				[u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() ||
				u?.email ||
				'Unknown';
			const identity = identityByUser.get(c.standardUserId);
			counterpartByConv.set(c.id, {
				name,
				isVenue: false,
				genre: identity?.genre ?? null,
				area: identity?.area ?? null,
			});
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
		const firstDivert = firstByConv.get(c.id);
		const hasDivertOrigin = firstDivert?.emailId != null;
		return {
			id: c.id,
			counterpart: counterpartByConv.get(c.id) ?? { name: 'Unknown', isVenue: !asVenue },
			lastMessagePreview: last ? buildPreview(last.body, last.isHtml) : '',
			// Venue rows time-stamp by their (general-thread) preview message so the
			// Inbound list isn't re-dated by application chatter.
			lastMessageAt:
				asVenue && last ? last.createdAt.toISOString() : c.lastMessageAt.toISOString(),
			unreadCount: unreadByConv.get(c.id) ?? 0,
			hasDivertOrigin,
			subject: hasDivertOrigin
				? (subjectByEmailId.get(firstDivert!.emailId!) ?? null)
				: null,
		};
	});
};

/** Paginated message history (cursor on monotonic id; oldest→newest in `items`). */
export const getMessagesPage = async (
	userId: string,
	conversationId: number,
	cursor: number | null,
	limit = 30,
	thread: MessageThread = 'all'
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
		where: { conversationId, ...threadWhere(thread) },
		orderBy: { id: 'desc' },
		take: limit + 1,
		...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
	});
	const hasMore = rows.length > limit;
	const pageRows = hasMore ? rows.slice(0, limit) : rows;
	const nextCursor = hasMore ? pageRows[pageRows.length - 1].id : null;

	const [counterpart, bookingRequestById, activeBookingRow, venueMessage] =
		await Promise.all([
			getCounterpart(role, conversation),
			loadBookingRequestMap(
				pageRows
					.map((m) => m.bookingRequestId)
					.filter((id): id is number => id != null)
			),
			// Page-level active request for THIS thread view — the banner/button must
			// stay correct even when the delivering message paginated out of the page.
			// The merged 'all' view (the artist's messenger) has no single thread, so
			// it carries none.
			thread === 'all'
				? Promise.resolve(null)
				: prisma.bookingRequest.findFirst({
						where: {
							conversationId,
							threadApplicationId: thread === 'general' ? null : thread,
							status: { not: 'canceled' },
						},
						orderBy: { id: 'desc' },
					}),
			// "Request to book" precondition: the venue has authored ≥1 message in
			// this thread view (server-computed — the loaded page may not reach back
			// far enough).
			prisma.message.findFirst({
				where: {
					conversationId,
					sender: MessageSender.venue,
					...threadWhere(thread),
				},
				select: { id: true },
			}),
		]);
	const items = [...pageRows]
		.reverse()
		.map((m) => serializeMessage(m, bookingRequestById)); // ascending
	// The active request's delivery message is usually in the page — reuse its
	// already-serialized state; only a paginated-out request costs an extra query.
	const bookingRequest = activeBookingRow
		? (bookingRequestById.get(activeBookingRow.id) ??
			(await serializeBookingRequestRows([activeBookingRow]))[0])
		: null;

	return {
		ok: true,
		page: {
			items,
			nextCursor,
			currentUserRole: role,
			counterpart,
			bookingRequest,
			venueHasMessaged: venueMessage != null,
		},
	};
};
