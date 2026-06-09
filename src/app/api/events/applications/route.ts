import { auth } from '@clerk/nextjs/server';
import type { ApplicationStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';

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

		return apiResponse({
			applications: applications.map((application) => {
				const event = eventById.get(application.eventId);
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
				};
			}),
		});
	} catch (error) {
		return handleApiError(error);
	}
}
