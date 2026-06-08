import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Prisma, type Venue } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiCreated,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { assertVenueAccount } from '@/app/api/_utils/venueAuth';
import { syncVenueToContact } from '@/app/api/_utils/venueContactSync';
import { upsertVenueSchema } from './schema';

// GET /api/venue — the current user's venue profile (or null if none yet).
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

		const venue = await prisma.venue.findUnique({ where: { userId } });
		return apiResponse(venue);
	} catch (error) {
		return handleApiError(error);
	}
}

// PATCH /api/venue — idempotent upsert of the current user's venue (1:1 on userId).
export async function PATCH(req: NextRequest) {
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
		const validated = upsertVenueSchema.safeParse(body);
		if (!validated.success) {
			return apiBadRequest(validated.error);
		}

		const { hours, venueName, ...rest } = validated.data;
		// Json columns need Prisma's null sentinels; a plain JS `null` is rejected.
		const hoursWrite =
			hours === undefined
				? {}
				: { hours: hours === null ? Prisma.DbNull : (hours as Prisma.InputJsonValue) };
		const venueNameWrite = venueName !== undefined ? { venueName } : {};
		const writeData = { ...rest, ...hoursWrite, ...venueNameWrite };

		const existing = await prisma.venue.findUnique({
			where: { userId },
			select: { id: true },
		});

		// Publish/refresh (or unpublish) the venue's public Contact projection so it
		// shows on the map + in search. A sync failure must never fail the save.
		const finalize = async (venue: Venue, created: boolean) => {
			try {
				await syncVenueToContact(venue);
			} catch (error) {
				console.error('[venue PATCH] syncVenueToContact failed', { userId, error });
			}
			return created ? apiCreated(venue) : apiResponse(venue);
		};

		if (existing) {
			const venue = await prisma.venue.update({ where: { userId }, data: writeData });
			return finalize(venue, false);
		}

		if (venueName === undefined) {
			return apiBadRequest('venueName is required to create a venue profile');
		}

		try {
			const venue = await prisma.venue.create({
				data: { userId, ...rest, ...hoursWrite, venueName },
			});
			return finalize(venue, true);
		} catch (error) {
			// Lost a concurrent create race on the unique userId — fall back to update.
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === 'P2002'
			) {
				const venue = await prisma.venue.update({ where: { userId }, data: writeData });
				return finalize(venue, false);
			}
			throw error;
		}
	} catch (error) {
		return handleApiError(error);
	}
}
