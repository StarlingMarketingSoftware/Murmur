import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiCreated,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { assertVenueAccount } from '@/app/api/_utils/venueAuth';
import { createEventSchema } from './schema';

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
			where: { userId },
			orderBy: { startsAt: 'asc' },
		});
		return apiResponse(events);
	} catch (error) {
		return handleApiError(error);
	}
}
