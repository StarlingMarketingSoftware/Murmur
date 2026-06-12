import { auth } from '@clerk/nextjs/server';
import { MessageSender, type ApplicationStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import {
	buildApplicationSummaryHtml,
	buildPreview,
	buildSentApplicationHtml,
} from '@/app/api/_utils/messaging';

// Event/venue details for an opportunity the user applied to. Mirrors MapEventData;
// `startsAt` is serialized to an ISO string over the wire.
export type MyApplicationEvent = {
	id: number;
	name: string | null;
	whenLabel: string | null;
	startsAt: string | null;
	pay: string | null;
	details: string | null;
	latitude: number | null;
	longitude: number | null;
	// Soft-delete state — false means the venue canceled (deleted) the event.
	isActive: boolean;
	// Approximates cancellation time: the row gets no writes after soft-delete.
	updatedAt: string; // ISO
	venueName: string | null;
	venueCity: string | null;
	venueState: string | null;
	venueBusinessType: string | null;
};

// The venue's replies in this application's chat thread (null until they reply).
export type MyApplicationVenueResponse = {
	conversationId: number;
	// Divert provenance of the pair conversation — enables the campaign-inbox deep
	// link; null when the artist never campaigned this venue.
	campaignId: number | null;
	// Latest venue Message id; its negation is the projected inbox row id.
	latestMessageId: number;
	lastMessageAt: string; // ISO
	lastMessagePreview: string;
	responseCount: number;
	unreadCount: number; // venue messages newer than the artist's thread watermark
};

export type MyApplicationBooking = {
	requestId: number;
	status: 'pending' | 'confirmed';
	date: string | null; // set when confirmed
};

// The venue's projection Contact row (Contact.venueId is unique) — lets the campaign
// inbox key/scope a synthesized "sent application" row the same way it scopes the
// venue's projected replies. Null when the venue or its contact row is gone.
export type MyApplicationVenueContact = {
	id: number;
	email: string;
};

export type MyEventApplication = {
	id: number;
	eventId: number;
	status: ApplicationStatus;
	createdAt: string;
	performingName: string | null;
	genre: string | null;
	area: string | null;
	videoCount: number;
	// The application exactly as the venue sees it (the seeded thread-opening
	// message), plus a videos line — rendered as the artist's "sent" inbox item.
	summaryHtml: string;
	venueContact: MyApplicationVenueContact | null;
	// null if the event was deleted after the application was submitted.
	event: MyApplicationEvent | null;
	venueResponse: MyApplicationVenueResponse | null;
	// Active booking-request handshake for this application (drives the Booked
	// label on the artist's opportunity row; canceled requests don't surface).
	booking: MyApplicationBooking | null;
	// True when another artist holds the event's confirmed booking — the
	// opportunity is closed to this user even though their application is open.
	bookedByOther: boolean;
};

export type MyEventApplicationsResponse = { applications: MyEventApplication[] };

// GET /api/events/applications — the signed-in user's own event applications, each
// joined with its event + venue so the Opportunities panel can render the opportunity
// they applied for. EventApplication has no FK to Event (scalar eventId), so events are
// resolved by id in code.
export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const applications = await prisma.eventApplication.findMany({
			where: { standardUserId: userId },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				eventId: true,
				status: true,
				createdAt: true,
				performingName: true,
				genre: true,
				area: true,
				bio: true,
				_count: { select: { videos: true } },
			},
		});

		const eventIds = [...new Set(applications.map((application) => application.eventId))];
		const events = eventIds.length
			? await prisma.event.findMany({
					where: { id: { in: eventIds } },
					select: {
						id: true,
						name: true,
						whenLabel: true,
						startsAt: true,
						pay: true,
						details: true,
						latitude: true,
						longitude: true,
						isActive: true,
						updatedAt: true,
					user: {
							select: {
								venue: {
									select: {
										id: true,
										venueName: true,
										city: true,
										state: true,
										businessType: true,
									},
								},
							},
						},
					},
				})
			: [];
		const eventById = new Map(events.map((event) => [event.id, event]));

		// Venue responses live in the application's chat thread within the pair
		// conversation (Message.threadApplicationId). Joined batched, no N+1.
		const venueIds = [
			...new Set(
				events
					.map((event) => event.user.venue?.id)
					.filter((id): id is number => id != null)
			),
		];
		const [conversations, venueContacts] = venueIds.length
			? await Promise.all([
					prisma.conversation.findMany({
						where: { standardUserId: userId, venueId: { in: venueIds } },
						select: { id: true, venueId: true },
					}),
					// Contact.venueId is unique — one projection contact per venue.
					prisma.contact.findMany({
						where: { venueId: { in: venueIds } },
						select: { id: true, email: true, venueId: true },
					}),
				])
			: [[], []];
		const venueContactByVenueId = new Map(
			venueContacts.map((c) => [c.venueId as number, { id: c.id, email: c.email }])
		);
		const conversationByVenueId = new Map(conversations.map((c) => [c.venueId, c.id]));
		const conversationIds = conversations.map((c) => c.id);
		const applicationIds = applications.map((a) => a.id);

		// Started before (and awaited after) the conversation lookups — it only
		// needs applicationIds, so it rides the same roundtrip window.
		const bookingRowsPromise = applicationIds.length
			? prisma.bookingRequest.findMany({
					where: {
						threadApplicationId: { in: applicationIds },
						status: { not: 'canceled' },
					},
					orderBy: { id: 'desc' },
					select: { id: true, threadApplicationId: true, status: true, date: true },
				})
			: Promise.resolve([]);
		// Who holds each event's confirmed booking (at most one per event, lock-
		// enforced). Keyed by standardUserId, not threadApplicationId — confirmed
		// bookings can live on the general thread.
		const confirmedBookingsPromise = eventIds.length
			? prisma.bookingRequest.findMany({
					where: { eventId: { in: eventIds }, status: 'confirmed' },
					select: { eventId: true, standardUserId: true },
				})
			: Promise.resolve([]);

		const [venueThreadMessages, readStates, provenanceDiverts] = conversationIds.length
			? await Promise.all([
					prisma.message.findMany({
						where: {
							conversationId: { in: conversationIds },
							sender: MessageSender.venue,
							threadApplicationId: { in: applicationIds },
						},
						orderBy: { id: 'desc' },
						select: {
							id: true,
							threadApplicationId: true,
							body: true,
							isHtml: true,
							createdAt: true,
						},
					}),
					prisma.applicationReadState.findMany({
						where: { applicationId: { in: applicationIds } },
						select: { applicationId: true, standardLastReadAt: true },
					}),
					// Most-recent divert per conversation → campaign for the inbox deep link.
					prisma.message.findMany({
						where: { conversationId: { in: conversationIds }, emailId: { not: null } },
						orderBy: [{ conversationId: 'asc' }, { id: 'desc' }],
						distinct: ['conversationId'],
						select: { conversationId: true, campaignId: true },
					}),
				])
			: [[], [], []];
		const [bookingRows, confirmedBookings] = await Promise.all([
			bookingRowsPromise,
			confirmedBookingsPromise,
		]);
		const confirmedOwnerByEventId = new Map<number, string>();
		for (const booking of confirmedBookings) {
			if (booking.eventId != null && !confirmedOwnerByEventId.has(booking.eventId)) {
				confirmedOwnerByEventId.set(booking.eventId, booking.standardUserId);
			}
		}
		const bookingByApp = new Map<number, (typeof bookingRows)[number]>();
		for (const booking of bookingRows) {
			if (
				booking.threadApplicationId != null &&
				!bookingByApp.has(booking.threadApplicationId)
			) {
				bookingByApp.set(booking.threadApplicationId, booking);
			}
		}
		const readStateByApp = new Map(
			readStates.map((s) => [s.applicationId, s.standardLastReadAt])
		);
		const campaignByConversation = new Map(
			provenanceDiverts.map((m) => [m.conversationId, m.campaignId])
		);
		const latestByApp = new Map<number, (typeof venueThreadMessages)[number]>();
		const responseCountByApp = new Map<number, number>();
		const unreadByApp = new Map<number, number>();
		for (const message of venueThreadMessages) {
			const appId = message.threadApplicationId;
			if (appId == null) continue;
			if (!latestByApp.has(appId)) latestByApp.set(appId, message); // id desc → latest first
			responseCountByApp.set(appId, (responseCountByApp.get(appId) ?? 0) + 1);
			const watermark = readStateByApp.get(appId);
			if (!watermark || message.createdAt > watermark) {
				unreadByApp.set(appId, (unreadByApp.get(appId) ?? 0) + 1);
			}
		}

		return apiResponse({
			applications: applications.map((application) => {
				const event = eventById.get(application.eventId);
				const venueId = event?.user.venue?.id ?? null;
				const conversationId =
					venueId != null ? (conversationByVenueId.get(venueId) ?? null) : null;
				const latest = latestByApp.get(application.id);
				return {
					id: application.id,
					eventId: application.eventId,
					status: application.status,
					createdAt: application.createdAt.toISOString(),
					performingName: application.performingName,
					genre: application.genre,
					area: application.area,
					videoCount: application._count.videos,
					summaryHtml: buildSentApplicationHtml(
						buildApplicationSummaryHtml(application, event?.name ?? null),
						application._count.videos
					),
					venueContact:
						venueId != null ? (venueContactByVenueId.get(venueId) ?? null) : null,
					event: event
						? {
								id: event.id,
								name: event.name,
								whenLabel: event.whenLabel,
								startsAt: event.startsAt?.toISOString() ?? null,
								pay: event.pay,
								details: event.details,
								latitude: event.latitude,
								longitude: event.longitude,
								isActive: event.isActive,
								updatedAt: event.updatedAt.toISOString(),
								venueName: event.user.venue?.venueName ?? null,
								venueCity: event.user.venue?.city ?? null,
								venueState: event.user.venue?.state ?? null,
								venueBusinessType: event.user.venue?.businessType ?? null,
							}
						: null,
					venueResponse:
						conversationId != null && latest
							? {
									conversationId,
									campaignId: campaignByConversation.get(conversationId) ?? null,
									latestMessageId: latest.id,
									lastMessageAt: latest.createdAt.toISOString(),
									lastMessagePreview: buildPreview(latest.body, latest.isHtml),
									responseCount: responseCountByApp.get(application.id) ?? 0,
									unreadCount: unreadByApp.get(application.id) ?? 0,
								}
							: null,
					booking: (() => {
						const booking = bookingByApp.get(application.id);
						return booking
							? {
									requestId: booking.id,
									status: booking.status as 'pending' | 'confirmed',
									date: booking.date,
								}
							: null;
					})(),
					bookedByOther: (() => {
						const owner = confirmedOwnerByEventId.get(application.eventId);
						return owner != null && owner !== userId;
					})(),
				};
			}),
		});
	} catch (error) {
		return handleApiError(error);
	}
}
