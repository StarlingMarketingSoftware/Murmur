import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import type { Event } from '@prisma/client';
import {
	apiBadRequest,
	apiCreated,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { assertVenueAccount } from '@/app/api/_utils/venueAuth';
import { createEventSchema } from './schema';

// Confirmed-booking attribution for an event row (null while unbooked).
export type VenueEventBooking = {
	requestId: number;
	standardUserId: string;
	artistName: string;
	date: string | null;
	conversationId: number;
	threadApplicationId: number | null;
};

export type VenueEventWithBooking = Event & { booking: VenueEventBooking | null };

// POST /api/venue/events — log a new event published by the current venue account.
export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const guard = await assertVenueAccount(userId);
		if (guard) {
			return guard;
		}

		const body = await req.json();
		const validated = createEventSchema.safeParse(body);
		if (!validated.success) {
			return apiBadRequest(validated.error);
		}

		const event = await prisma.event.create({
			data: { ...validated.data, userId },
		});
		return apiCreated(event);
	} catch (error) {
		return handleApiError(error);
	}
}

// GET /api/venue/events — the current venue account's own events, soonest first.
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

		const events = await prisma.event.findMany({
			where: { userId, isActive: true },
			orderBy: { startsAt: 'asc' },
		});

		// Confirmed bookings → "Booked" labels. Batched (no N+1); the artist's name
		// prefers the application's performing-name snapshot, then their User name.
		const bookings = events.length
			? await prisma.bookingRequest.findMany({
					where: { eventId: { in: events.map((e) => e.id) }, status: 'confirmed' },
					orderBy: { id: 'desc' },
				})
			: [];
		const bookingByEventId = new Map<number, (typeof bookings)[number]>();
		for (const booking of bookings) {
			if (booking.eventId != null && !bookingByEventId.has(booking.eventId)) {
				bookingByEventId.set(booking.eventId, booking);
			}
		}
		const applicationIds = bookings
			.map((b) => b.threadApplicationId)
			.filter((id): id is number => id != null);
		const artistIds = [...new Set(bookings.map((b) => b.standardUserId))];
		const [applications, artists] = await Promise.all([
			applicationIds.length
				? prisma.eventApplication.findMany({
						where: { id: { in: applicationIds } },
						select: { id: true, performingName: true },
					})
				: Promise.resolve([]),
			artistIds.length
				? prisma.user.findMany({
						where: { clerkId: { in: artistIds } },
						select: { clerkId: true, firstName: true, lastName: true, email: true },
					})
				: Promise.resolve([]),
		]);
		const performingNameByApplication = new Map(
			applications.map((a) => [a.id, a.performingName])
		);
		const artistByClerkId = new Map(artists.map((u) => [u.clerkId, u]));

		const rows: VenueEventWithBooking[] = events.map((event) => {
			const booking = bookingByEventId.get(event.id);
			if (!booking) return { ...event, booking: null };
			const artist = artistByClerkId.get(booking.standardUserId);
			const artistName =
				(booking.threadApplicationId != null
					? performingNameByApplication.get(booking.threadApplicationId)?.trim()
					: null) ||
				[artist?.firstName, artist?.lastName].filter(Boolean).join(' ').trim() ||
				artist?.email ||
				'Artist';
			return {
				...event,
				booking: {
					requestId: booking.id,
					standardUserId: booking.standardUserId,
					artistName,
					date: booking.date,
					conversationId: booking.conversationId,
					threadApplicationId: booking.threadApplicationId,
				},
			};
		});
		return apiResponse<VenueEventWithBooking[]>(rows);
	} catch (error) {
		return handleApiError(error);
	}
}
