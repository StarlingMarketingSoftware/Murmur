import { auth } from '@clerk/nextjs/server';
import { MessageSender, type ApplicationStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { buildPreview } from '@/app/api/_utils/messaging';

// Event/venue details for an opportunity the user applied to. Mirrors MapEventData;
// `startsAt` is serialized to an ISO string over the wire.
export type MyApplicationEvent = {
	id: number;
	name: string | null;
	whenLabel: string | null;
	startsAt: string | null;
	pay: string | null;
	details: string | null;
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

export type MyEventApplication = {
	id: number;
	eventId: number;
	status: ApplicationStatus;
	createdAt: string;
	performingName: string | null;
	genre: string | null;
	area: string | null;
	videoCount: number;
	// null if the event was deleted after the application was submitted.
	event: MyApplicationEvent | null;
	venueResponse: MyApplicationVenueResponse | null;
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
		const conversations = venueIds.length
			? await prisma.conversation.findMany({
					where: { standardUserId: userId, venueId: { in: venueIds } },
					select: { id: true, venueId: true },
				})
			: [];
		const conversationByVenueId = new Map(conversations.map((c) => [c.venueId, c.id]));
		const conversationIds = conversations.map((c) => c.id);
		const applicationIds = applications.map((a) => a.id);

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
					event: event
						? {
								id: event.id,
								name: event.name,
								whenLabel: event.whenLabel,
								startsAt: event.startsAt?.toISOString() ?? null,
								pay: event.pay,
								details: event.details,
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
				};
			}),
		});
	} catch (error) {
		return handleApiError(error);
	}
}
