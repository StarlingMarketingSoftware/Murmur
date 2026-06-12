// Transactional core for the venue → artist booking-request handshake. Routes are
// thin HTTP adapters over these functions (the messaging.ts convention): business
// outcomes are result objects, never throws. A request is delivered as an in-thread
// Message (Message.bookingRequestId) so previews, unread counts, and the venue
// inbound projection carry it with no extra plumbing; its CURRENT status is
// attached at read time so both sides' UIs always render live state.

import prisma from '@/lib/prisma';
import { MessageSender, type BookingRequest, type Message } from '@prisma/client';
import type { SerializedBookingRequest, SerializedMessage } from '@/types';

type BookingEventContext = {
	name: string | null;
	startsAt: Date | null;
	whenLabel: string | null;
	startTime: string | null;
	endTime: string | null;
	address: string | null;
	latitude: number | null;
	longitude: number | null;
	size: string | null;
	genres: string[];
	pay: string | null;
	details: string | null;
};

type BookingVenueContext = {
	venueName: string;
	address: string | null;
	city: string | null;
	state: string | null;
	businessType: string | null;
	capacityMin: number | null;
	capacityMax: number | null;
	genres: string[];
	payRange: string | null;
	payMin: number | null;
	payMax: number | null;
	sound: string | null;
	description: string | null;
	website: string | null;
};

/** Plain-text body for the delivering Message — shows in list previews on both sides. */
export const buildBookingRequestBody = (eventName: string | null): string =>
	eventName ? `Booking request — ${eventName}` : 'Booking request';

/**
 * Event times are stored as 24h 'HH:MM' (the venue form's option values); the
 * artist calendar renders friendly labels ('9 pm', '9:30 pm'). Pure — exported
 * for tests. Null on blank/unparseable so callers can fall back.
 */
export const formatEventTimeLabel = (raw: string | null): string | null => {
	const match = raw?.trim().match(/^(\d{1,2}):(\d{2})$/);
	if (!match) return null;
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours > 23 || minutes > 59) return null;
	const hour12 = hours % 12 || 12;
	const meridiem = hours < 12 ? 'am' : 'pm';
	return `${hour12}${minutes ? `:${match[2]}` : ''} ${meridiem}`;
};

const truncateNote = (value: string, max: number): string =>
	value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

/**
 * Single-line ' • '-separated summary of everything the artist should know about
 * the gig — the event's details plus the venue's profile — destined for the
 * artist's CalendarEntry.notes (a single-line field everywhere it renders).
 * Pure — exported for tests. Empty string when nothing is known.
 */
export const composeArtistEntryNotes = (
	event: BookingEventContext | null,
	venue: BookingVenueContext | null
): string => {
	const startLabel = formatEventTimeLabel(event?.startTime ?? null);
	const endLabel = formatEventTimeLabel(event?.endTime ?? null);
	const venuePay =
		venue?.payRange?.trim() ||
		(venue?.payMin != null && venue?.payMax != null
			? `$${venue.payMin}-$${venue.payMax}`
			: venue?.payMin != null
				? `from $${venue.payMin}`
				: venue?.payMax != null
					? `up to $${venue.payMax}`
					: '');
	const pay = event?.pay?.trim() || venuePay;
	const capacity =
		venue?.capacityMin != null && venue?.capacityMax != null
			? `Capacity ${venue.capacityMin}-${venue.capacityMax}`
			: venue?.capacityMax != null
				? `Capacity up to ${venue.capacityMax}`
				: venue?.capacityMin != null
					? `Capacity ${venue.capacityMin}+`
					: '';
	const venueLocation = [venue?.address, venue?.city, venue?.state]
		.map((part) => part?.trim())
		.filter(Boolean)
		.join(', ');
	// The event's own genres (editable per event) beat the venue's profile list.
	const genres = event?.genres?.length ? event.genres : (venue?.genres ?? []);
	const parts = [
		event?.name?.trim() ? `Event: ${event.name.trim()}` : '',
		startLabel && endLabel ? `${startLabel} - ${endLabel}` : '',
		event?.size?.trim() ?? '',
		pay ? `Pay: ${pay}` : '',
		event?.details?.trim() ? truncateNote(event.details.trim(), 140) : '',
		venue?.venueName?.trim() ? `Venue: ${venue.venueName.trim()}` : '',
		venue?.businessType?.trim() ?? '',
		venueLocation,
		capacity,
		genres.length ? genres.join(', ') : '',
		venue?.sound?.trim() ? `Sound: ${venue.sound.trim()}` : '',
		venue?.website?.trim() ?? '',
		venue?.description?.trim() ? truncateNote(venue.description.trim(), 200) : '',
	];
	return parts.filter(Boolean).join(' • ');
};

export const serializeBookingRequest = (
	request: BookingRequest,
	event: BookingEventContext | null = null,
	venue: BookingVenueContext | null = null
): SerializedBookingRequest => ({
	id: request.id,
	conversationId: request.conversationId,
	threadApplicationId: request.threadApplicationId,
	eventId: request.eventId,
	status: request.status,
	date: request.date,
	requestedAt: request.requestedAt.toISOString(),
	confirmedAt: request.confirmedAt?.toISOString() ?? null,
	canceledAt: request.canceledAt?.toISOString() ?? null,
	eventName: event?.name ?? null,
	eventStartsAt: event?.startsAt?.toISOString() ?? null,
	eventWhenLabel: event?.whenLabel ?? null,
	eventStartTimeLabel: formatEventTimeLabel(event?.startTime ?? null),
	eventEndTimeLabel: formatEventTimeLabel(event?.endTime ?? null),
	eventAddress: event?.address ?? null,
	eventLatitude: event?.latitude ?? null,
	eventLongitude: event?.longitude ?? null,
	venueName: venue?.venueName ?? null,
	bookingNotes: composeArtistEntryNotes(event, venue) || null,
});

/**
 * Serialize request rows with their event context attached (one batched event
 * lookup — no N+1). Soft-deleted events still resolve: the request pre-dates the
 * deletion and the artist's confirm popup still wants the date context.
 */
export const serializeBookingRequestRows = async (
	rows: BookingRequest[]
): Promise<SerializedBookingRequest[]> => {
	const eventIds = [
		...new Set(rows.map((r) => r.eventId).filter((id): id is number => id != null)),
	];
	const venueIds = [...new Set(rows.map((r) => r.venueId))];
	const [events, venues] = await Promise.all([
		eventIds.length
			? prisma.event.findMany({
					where: { id: { in: eventIds } },
					select: {
						id: true,
						name: true,
						startsAt: true,
						whenLabel: true,
						startTime: true,
						endTime: true,
						address: true,
						latitude: true,
						longitude: true,
						size: true,
						genres: true,
						pay: true,
						details: true,
					},
				})
			: Promise.resolve([]),
		venueIds.length
			? prisma.venue.findMany({
					where: { id: { in: venueIds } },
					select: {
						id: true,
						venueName: true,
						address: true,
						city: true,
						state: true,
						businessType: true,
						capacityMin: true,
						capacityMax: true,
						genres: true,
						payRange: true,
						payMin: true,
						payMax: true,
						sound: true,
						description: true,
						website: true,
					},
				})
			: Promise.resolve([]),
	]);
	const eventById = new Map(events.map((e) => [e.id, e]));
	const venueById = new Map(venues.map((v) => [v.id, v]));
	return rows.map((row) =>
		serializeBookingRequest(
			row,
			row.eventId != null ? (eventById.get(row.eventId) ?? null) : null,
			venueById.get(row.venueId) ?? null
		)
	);
};

/**
 * Batched live-state lookup for messages carrying bookingRequestId — used by
 * getMessagesPage and the venue inbound projection.
 */
export const loadBookingRequestMap = async (
	bookingRequestIds: number[]
): Promise<Map<number, SerializedBookingRequest>> => {
	const ids = [...new Set(bookingRequestIds)];
	if (ids.length === 0) return new Map();
	const rows = await prisma.bookingRequest.findMany({ where: { id: { in: ids } } });
	const serialized = await serializeBookingRequestRows(rows);
	return new Map(serialized.map((r) => [r.id, r]));
};

/** What goes on the VENUE's calendar entry at confirm. Pure — exported for tests. */
export const composeVenueEntryContent = (input: {
	artistName: string;
	eventName: string | null;
	eventStartTime: string | null;
	eventEndTime: string | null;
	artistStartTime: string;
	artistEndTime: string;
}): {
	personName: string;
	company: string;
	startTime: string;
	endTime: string;
	notes: string;
	address: string;
} => ({
	personName: input.artistName,
	company: '',
	// Prefer the event's own times; fall back to the times the artist confirmed.
	startTime: input.eventStartTime?.trim() || input.artistStartTime,
	endTime: input.eventEndTime?.trim() || input.artistEndTime,
	notes: input.eventName ? `Event: ${input.eventName}` : 'Booked via Murmur',
	// The gig is at the venue's own location — their own address is noise.
	address: '',
});

// Serialize the request's delivery Message (duplicates messaging.ts's
// serializeMessage shape rather than importing it — that import would create a
// messaging ↔ bookingRequests cycle; the SerializedMessage return type keeps the
// two in lockstep at compile time).
const serializeDeliveryMessage = (
	message: Message,
	request: SerializedBookingRequest
): SerializedMessage => ({
	id: message.id,
	conversationId: message.conversationId,
	sender: message.sender,
	body: message.body,
	isHtml: message.isHtml,
	applicationId: message.applicationId,
	bookingRequestId: message.bookingRequestId,
	bookingRequest: request,
	venueAction: null,
	createdAt: message.createdAt.toISOString(),
});

// Sentinels thrown inside transactions to surface business outcomes without
// leaking partial writes (the throw rolls the transaction back).
class BookingRequestTxError extends Error {
	constructor(public code: string) {
		super(code);
	}
}

// Namespace for pg_advisory_xact_lock(int4, int4) keyed on eventId. The
// one-confirmed-per-event guard is a read inside READ COMMITTED — two confirms
// for the same event (different conversations, different request rows) share no
// row lock, so both guards can pass pre-commit. The advisory lock serializes
// every create/confirm touching one event; it auto-releases at commit/rollback
// and, unlike an Event row-lock, works when the event row was hard-deleted.
const BOOKING_EVENT_LOCK_NAMESPACE = 20260611;

// Structural tx type: the singleton client is $extends-ed, so its interactive
// transaction client is not assignable to the base Prisma.TransactionClient.
const lockBookingEvent = async (
	tx: { $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number> },
	eventId: number
): Promise<void> => {
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_EVENT_LOCK_NAMESPACE}::int, ${eventId}::int)`;
};

// ── Create ──────────────────────────────────────────────────────────────────

type CreateCode =
	| 'not_found'
	| 'forbidden'
	| 'invalid_thread'
	| 'application_withdrawn'
	| 'request_exists'
	| 'event_already_booked';

export type CreateBookingRequestResult =
	| {
			ok: true;
			conversationId: number;
			request: SerializedBookingRequest;
			message: SerializedMessage;
	  }
	| { ok: false; code: CreateCode };

/**
 * The venue requests to book the artist from one conversation thread. One active
 * (non-canceled) request per conversation+thread; concurrent double-clicks are
 * serialized by a Conversation row lock (a data:{} update) so the guard inside the
 * transaction is race-free without a partial unique index (which schema.prisma
 * cannot represent — it would create permanent `migrate diff` drift).
 */
export const createBookingRequest = async (
	userId: string,
	conversationId: number,
	threadApplicationId: number | null
): Promise<CreateBookingRequestResult> => {
	const conversation = await prisma.conversation.findUnique({
		where: { id: conversationId },
		select: { id: true, standardUserId: true, venueId: true },
	});
	if (!conversation) return { ok: false, code: 'not_found' };

	// Only the owning venue user can request a booking (the artist side has no
	// request affordance, so a non-owner here is always a forged call).
	const venue = await prisma.venue.findUnique({
		where: { id: conversation.venueId },
		select: { userId: true },
	});
	if (venue?.userId !== userId) return { ok: false, code: 'forbidden' };

	let eventId: number | null = null;
	let eventName: string | null = null;
	if (threadApplicationId != null) {
		// The thread tag must reference an application between this exact pair —
		// same validation as createReply's thread check.
		const application = await prisma.eventApplication.findUnique({
			where: { id: threadApplicationId },
			select: { standardUserId: true, venueUserId: true, eventId: true, status: true },
		});
		if (
			!application ||
			application.standardUserId !== conversation.standardUserId ||
			application.venueUserId !== userId
		) {
			return { ok: false, code: 'invalid_thread' };
		}
		if (application.status === 'withdrawn') {
			return { ok: false, code: 'application_withdrawn' };
		}
		eventId = application.eventId;
		// Event may be soft-deleted/missing — the request proceeds with the id
		// recorded and a generic message body.
		const event = await prisma.event.findUnique({
			where: { id: application.eventId },
			select: { name: true },
		});
		eventName = event?.name ?? null;
	}

	try {
		const { request, message } = await prisma.$transaction(async (tx) => {
			// Row lock: serializes concurrent creates for this conversation. The
			// data:{} update only bumps the @updatedAt watermark — harmless.
			await tx.conversation.update({ where: { id: conversationId }, data: {} });

			const existing = await tx.bookingRequest.findFirst({
				where: {
					conversationId,
					threadApplicationId,
					status: { not: 'canceled' },
				},
				select: { id: true },
			});
			if (existing) throw new BookingRequestTxError('request_exists');

			if (eventId != null) {
				// One confirmed booking per event — don't even open a second pending
				// request once somebody confirmed. Serialized against in-flight
				// confirms by the event advisory lock.
				await lockBookingEvent(tx, eventId);
				const booked = await tx.bookingRequest.findFirst({
					where: { eventId, status: 'confirmed' },
					select: { id: true },
				});
				if (booked) throw new BookingRequestTxError('event_already_booked');
			}

			const request = await tx.bookingRequest.create({
				data: {
					conversationId,
					threadApplicationId,
					eventId,
					venueUserId: userId,
					standardUserId: conversation.standardUserId,
					venueId: conversation.venueId,
				},
			});

			const message = await tx.message.create({
				data: {
					conversationId,
					sender: MessageSender.venue,
					senderClerkId: userId,
					body: buildBookingRequestBody(eventName),
					isHtml: false,
					threadApplicationId,
					bookingRequestId: request.id,
				},
			});

			// Recency + read watermarks — exact mirror of createReply's venue branch.
			await tx.conversation.update({
				where: { id: conversationId },
				data: {
					lastMessageAt: message.createdAt,
					...(threadApplicationId == null
						? { venueLastReadAt: message.createdAt }
						: {}),
				},
			});
			if (threadApplicationId != null) {
				await tx.applicationReadState.upsert({
					where: { applicationId: threadApplicationId },
					create: {
						applicationId: threadApplicationId,
						venueLastReadAt: message.createdAt,
					},
					update: { venueLastReadAt: message.createdAt },
				});
			}

			return { request, message };
		});

		const serializedRequest = (await serializeBookingRequestRows([request]))[0];
		return {
			ok: true,
			conversationId,
			request: serializedRequest,
			message: serializeDeliveryMessage(message, serializedRequest),
		};
	} catch (error) {
		if (error instanceof BookingRequestTxError) {
			return { ok: false, code: error.code as CreateCode };
		}
		throw error;
	}
};

// ── Cancel ──────────────────────────────────────────────────────────────────

export type CancelBookingRequestResult =
	| { ok: true; request: SerializedBookingRequest }
	| { ok: false; code: 'not_found' | 'forbidden' }
	| { ok: false; code: 'not_pending'; request: SerializedBookingRequest };

/** The venue withdraws a pending request (the banner's X). */
export const cancelBookingRequest = async (
	userId: string,
	requestId: number
): Promise<CancelBookingRequestResult> => {
	const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
	if (!request) return { ok: false, code: 'not_found' };
	if (request.venueUserId !== userId) return { ok: false, code: 'forbidden' };

	// Single-statement status guard — atomic against a racing confirm.
	const updated = await prisma.bookingRequest.updateMany({
		where: { id: requestId, status: 'pending' },
		data: { status: 'canceled', canceledAt: new Date() },
	});
	const fresh = await prisma.bookingRequest.findUniqueOrThrow({
		where: { id: requestId },
	});
	const serialized = (await serializeBookingRequestRows([fresh]))[0];
	if (updated.count === 0) {
		// Lost the race (artist confirmed first, or double-cancel). Return the live
		// state so the venue UI flips to Booked instead of erroring.
		return { ok: false, code: 'not_pending', request: serialized };
	}
	return { ok: true, request: serialized };
};

// ── Confirm ─────────────────────────────────────────────────────────────────

export type ConfirmBookingRequestInput = {
	date: string; // 'YYYY-MM-DD' — the artist's confirmed local-date key
	personName?: string;
	company?: string;
	startTime?: string;
	endTime?: string;
	notes?: string;
	address?: string;
	placeId?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	drivingDuration?: string | null;
	campaignId?: number | null;
	contactId?: number | null;
};

export type ConfirmBookingRequestResult =
	| { ok: true; request: SerializedBookingRequest }
	| { ok: false; code: 'not_found' | 'forbidden' | 'date_unavailable' | 'event_already_booked' }
	| { ok: false; code: 'not_pending'; request: SerializedBookingRequest };

/**
 * The artist confirms a pending request with the date (and entry fields) they
 * settled on in the booking popup. Transactionally flips the request to confirmed
 * and writes BOTH calendar entries:
 * - artist entry: upsert on (artist, date) with the popup's final content —
 *   adopting the provisional entry the popup autosaved. A date already held by a
 *   DIFFERENT booking request rolls everything back (`date_unavailable`).
 * - venue entry: written only when the date is free on the venue's calendar (or
 *   held by this same booking); an unrelated venue entry is never clobbered — the
 *   booking still confirms, and the event's Booked label is the source of truth.
 */
export const confirmBookingRequest = async (
	userId: string,
	requestId: number,
	input: ConfirmBookingRequestInput
): Promise<ConfirmBookingRequestResult> => {
	const request = await prisma.bookingRequest.findUnique({ where: { id: requestId } });
	if (!request) return { ok: false, code: 'not_found' };
	if (request.standardUserId !== userId) return { ok: false, code: 'forbidden' };

	// Supporting context (outside the tx — read-only lookups).
	const [event, application, artist] = await Promise.all([
		request.eventId != null
			? prisma.event.findUnique({
					where: { id: request.eventId },
					select: { name: true, startTime: true, endTime: true },
				})
			: Promise.resolve(null),
		request.threadApplicationId != null
			? prisma.eventApplication.findUnique({
					where: { id: request.threadApplicationId },
					select: { performingName: true },
				})
			: Promise.resolve(null),
		prisma.user.findUnique({
			where: { clerkId: userId },
			select: { firstName: true, lastName: true, email: true },
		}),
	]);
	const artistName =
		application?.performingName?.trim() ||
		[artist?.firstName, artist?.lastName].filter(Boolean).join(' ').trim() ||
		artist?.email ||
		'Artist';

	const artistContent = {
		personName: input.personName ?? '',
		company: input.company ?? '',
		// An event-backed booking's times are the venue's to set — fall back to
		// them when the client sent blanks (stale clients, partial payloads).
		startTime:
			input.startTime?.trim() || formatEventTimeLabel(event?.startTime ?? null) || '',
		endTime: input.endTime?.trim() || formatEventTimeLabel(event?.endTime ?? null) || '',
		notes: input.notes ?? '',
		address: input.address ?? '',
		placeId: input.placeId ?? null,
		latitude: input.latitude ?? null,
		longitude: input.longitude ?? null,
		drivingDuration: input.drivingDuration ?? null,
	};
	const venueContent = composeVenueEntryContent({
		artistName,
		eventName: event?.name ?? null,
		eventStartTime: event?.startTime ?? null,
		eventEndTime: event?.endTime ?? null,
		artistStartTime: artistContent.startTime,
		artistEndTime: artistContent.endTime,
	});

	try {
		const confirmed = await prisma.$transaction(async (tx) => {
			if (request.eventId != null) {
				// Serializes against other confirms/creates for this event (lock
				// ordering everywhere: event → artist row → calendar rows).
				await lockBookingEvent(tx, request.eventId);
				const booked = await tx.bookingRequest.findFirst({
					where: {
						eventId: request.eventId,
						status: 'confirmed',
						id: { not: requestId },
					},
					select: { id: true },
				});
				if (booked) throw new BookingRequestTxError('event_already_booked');
			}

			// Serialize this artist's concurrent confirms (two pending requests from
			// different venues confirmed on the same date would otherwise both pass
			// the artistExisting read below). data:{} only bumps @updatedAt.
			await tx.user.update({ where: { clerkId: userId }, data: {} });

			// Atomic pending→confirmed flip; 0 rows = lost a race (cancel or another
			// confirm) — surface the live status instead.
			const flipped = await tx.bookingRequest.updateMany({
				where: { id: requestId, status: 'pending' },
				data: { status: 'confirmed', confirmedAt: new Date(), date: input.date },
			});
			if (flipped.count === 0) throw new BookingRequestTxError('not_pending');

			// Artist entry. The popup's provisional autosave created this row without a
			// bookingRequestId, so "ours to adopt" = any entry not already claimed by a
			// DIFFERENT booking request (the popup never places onto a foreign date; the
			// payload is exactly what the artist sees, so replacing their own same-date
			// entry is WYSIWYG, not clobbering).
			const artistExisting = await tx.calendarEntry.findUnique({
				where: { userId_date: { userId, date: input.date } },
			});
			if (
				artistExisting?.isActive &&
				artistExisting.bookingRequestId != null &&
				artistExisting.bookingRequestId !== requestId
			) {
				throw new BookingRequestTxError('date_unavailable');
			}
			await tx.calendarEntry.upsert({
				where: { userId_date: { userId, date: input.date } },
				create: {
					userId,
					date: input.date,
					...artistContent,
					campaignId: input.campaignId ?? null,
					contactId: input.contactId ?? null,
					bookingRequestId: requestId,
				},
				update: {
					...artistContent,
					campaignId: input.campaignId,
					contactId: input.contactId,
					bookingRequestId: requestId,
					isActive: true,
				},
			});

			// Venue entry — fill only a free (or this booking's own) slot; skip
			// silently otherwise. Unlike the artist, the venue didn't pick this date in
			// a popup, so an unrelated entry of theirs must never be overwritten. The
			// claim is an atomic conditional updateMany (a plain read-then-upsert
			// could take the UPDATE path over a row the venue inserted mid-window and
			// clobber it); the create below only runs when no row exists at all.
			const claimed = await tx.calendarEntry.updateMany({
				where: {
					userId: request.venueUserId,
					date: input.date,
					OR: [{ isActive: false }, { bookingRequestId: requestId }],
				},
				data: {
					...venueContent,
					placeId: null,
					latitude: null,
					longitude: null,
					drivingDuration: null,
					campaignId: null,
					contactId: null,
					bookingRequestId: requestId,
					isActive: true,
				},
			});
			if (claimed.count === 0) {
				const occupant = await tx.calendarEntry.findUnique({
					where: {
						userId_date: { userId: request.venueUserId, date: input.date },
					},
					select: { id: true },
				});
				if (!occupant) {
					await tx.calendarEntry.create({
						data: {
							userId: request.venueUserId,
							date: input.date,
							...venueContent,
							placeId: null,
							latitude: null,
							longitude: null,
							drivingDuration: null,
							bookingRequestId: requestId,
						},
					});
				}
				// occupant + claimed 0 = a live foreign entry: skip silently — the
				// booking still confirms and the Event label is the source of truth.
			}

			return tx.bookingRequest.findUniqueOrThrow({ where: { id: requestId } });
		});

		return { ok: true, request: (await serializeBookingRequestRows([confirmed]))[0] };
	} catch (error) {
		if (error instanceof BookingRequestTxError) {
			if (error.code === 'not_pending') {
				const fresh = await prisma.bookingRequest.findUniqueOrThrow({
					where: { id: requestId },
				});
				return {
					ok: false,
					code: 'not_pending',
					request: (await serializeBookingRequestRows([fresh]))[0],
				};
			}
			return {
				ok: false,
				code: error.code as 'date_unavailable' | 'event_already_booked',
			};
		}
		throw error;
	}
};
