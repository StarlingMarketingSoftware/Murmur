import { auth } from '@clerk/nextjs/server';
import { ApplicationStatus, MessageSender } from '@prisma/client';
import prisma from '@/lib/prisma';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import {
	buildApplicationSummaryHtml,
	buildPreview,
} from '@/app/api/_utils/messaging';
import { assertVenueAccount } from '@/app/api/_utils/venueAuth';

export type VenueApplicationEvent = {
	id: number;
	name: string;
	whenLabel: string | null;
	startsAt: string | null; // ISO; drives the "Xd" countdown + grouping client-side
};

export type VenueApplicationConversation = {
	id: number;
	unreadCount: number;
	lastMessagePreview: string;
	lastMessageAt: string; // ISO
};

export type VenueApplicationBooking = {
	requestId: number;
	status: 'pending' | 'confirmed';
	date: string | null; // set when confirmed
};

export type VenueApplicationRow = {
	id: number; // EventApplication.id — payload for the openApplication message kind
	eventId: number;
	standardUserId: string;
	applicantName: string;
	genre: string | null; // application-time snapshot (EventApplication.genre)
	area: string | null; // application-time snapshot (EventApplication.area)
	createdAt: string; // ISO submission time (row time when no conversation yet)
	applicationPreview: string; // plain-text preview of the (eventual) summary message
	// null if the event was deleted after the application was submitted.
	event: VenueApplicationEvent | null;
	// null until the venue opens the thread (or the applicant messaged them first).
	conversation: VenueApplicationConversation | null;
	// Active booking-request handshake for this application's thread (canceled
	// requests don't surface — the venue can simply re-request).
	booking: VenueApplicationBooking | null;
};

export type VenueApplicationsResponse = { applications: VenueApplicationRow[] };

// GET /api/venue/applications — applications received for the current venue
// account's events (the Chat tab's "Replies" inbox), each joined with its event,
// applicant identity, and the venue↔applicant conversation when one exists.
// EventApplication has no FK to Event/User (scalar ids), so joins happen in code.
export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const guard = await assertVenueAccount(userId);
		if (guard) {
			return guard;
		}

		const applications = await prisma.eventApplication.findMany({
			where: { venueUserId: userId, status: ApplicationStatus.submitted },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				eventId: true,
				standardUserId: true,
				performingName: true,
				genre: true,
				area: true,
				bio: true,
				createdAt: true,
			},
		});
		if (applications.length === 0) {
			return apiResponse<VenueApplicationsResponse>({ applications: [] });
		}

		const eventIds = [...new Set(applications.map((a) => a.eventId))];
		const applicantIds = [...new Set(applications.map((a) => a.standardUserId))];

		// Venue row may lag account provisioning — rows then return conversation: null.
		const venue = await prisma.venue.findUnique({
			where: { userId },
			select: { id: true },
		});

		const [events, applicants, conversations] = await Promise.all([
			prisma.event.findMany({
				where: { id: { in: eventIds } },
				select: { id: true, name: true, whenLabel: true, startsAt: true },
			}),
			prisma.user.findMany({
				where: { clerkId: { in: applicantIds } },
				select: { clerkId: true, firstName: true, lastName: true, email: true },
			}),
			venue
				? prisma.conversation.findMany({
						where: { venueId: venue.id, standardUserId: { in: applicantIds } },
						select: { id: true, standardUserId: true },
					})
				: Promise.resolve([]),
		]);

		const eventById = new Map(events.map((e) => [e.id, e]));
		const applicantByClerkId = new Map(applicants.map((u) => [u.clerkId, u]));
		const conversationByApplicant = new Map(
			conversations.map((c) => [c.standardUserId, c])
		);

		// Each application is its own thread within the pair conversation
		// (Message.threadApplicationId; pre-thread seeds carry only applicationId),
		// with its own venue read watermark in ApplicationReadState — so preview,
		// recency, and unread are computed per thread, not per conversation.
		const applicationIds = applications.map((a) => a.id);
		const [threadMessages, readStates, bookingRows] = await Promise.all([
			prisma.message.findMany({
				where: {
					OR: [
						{ threadApplicationId: { in: applicationIds } },
						{ applicationId: { in: applicationIds } },
					],
				},
				orderBy: { id: 'desc' },
				select: {
					threadApplicationId: true,
					applicationId: true,
					sender: true,
					body: true,
					isHtml: true,
					createdAt: true,
				},
			}),
			prisma.applicationReadState.findMany({
				where: { applicationId: { in: applicationIds } },
				select: { applicationId: true, venueLastReadAt: true },
			}),
			prisma.bookingRequest.findMany({
				where: {
					threadApplicationId: { in: applicationIds },
					status: { not: 'canceled' },
				},
				orderBy: { id: 'desc' },
				select: { id: true, threadApplicationId: true, status: true, date: true },
			}),
		]);
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
			readStates.map((s) => [s.applicationId, s.venueLastReadAt])
		);
		const latestByApp = new Map<number, (typeof threadMessages)[number]>();
		const unreadByApp = new Map<number, number>();
		for (const message of threadMessages) {
			const appId = message.threadApplicationId ?? message.applicationId;
			if (appId == null) continue;
			if (!latestByApp.has(appId)) latestByApp.set(appId, message); // id desc → first seen = latest
			if (message.sender === MessageSender.standard) {
				const watermark = readStateByApp.get(appId);
				if (!watermark || message.createdAt > watermark) {
					unreadByApp.set(appId, (unreadByApp.get(appId) ?? 0) + 1);
				}
			}
		}

		return apiResponse<VenueApplicationsResponse>({
			applications: applications.map((application) => {
				const event = eventById.get(application.eventId);
				const applicant = applicantByClerkId.get(application.standardUserId);
				const applicantName =
					[applicant?.firstName, applicant?.lastName].filter(Boolean).join(' ').trim() ||
					applicant?.email ||
					'Unknown';
				const conversation = conversationByApplicant.get(application.standardUserId);
				const last = latestByApp.get(application.id);
				const booking = bookingByApp.get(application.id);
				return {
					id: application.id,
					eventId: application.eventId,
					standardUserId: application.standardUserId,
					applicantName,
					genre: application.genre,
					area: application.area,
					createdAt: application.createdAt.toISOString(),
					applicationPreview: buildPreview(
						buildApplicationSummaryHtml(application, event?.name ?? null),
						true
					),
					event: event
						? {
								id: event.id,
								name: event.name,
								whenLabel: event.whenLabel,
								startsAt: event.startsAt?.toISOString() ?? null,
							}
						: null,
					// Thread-scoped: unread/preview/recency describe THIS application's
					// thread within the pair conversation.
					conversation: conversation
						? {
								id: conversation.id,
								unreadCount: unreadByApp.get(application.id) ?? 0,
								lastMessagePreview: last ? buildPreview(last.body, last.isHtml) : '',
								lastMessageAt: (
									last?.createdAt ?? application.createdAt
								).toISOString(),
							}
						: null,
					booking: booking
						? {
								requestId: booking.id,
								status: booking.status as 'pending' | 'confirmed',
								date: booking.date,
							}
						: null,
				};
			}),
		});
	} catch (error) {
		return handleApiError(error);
	}
}
