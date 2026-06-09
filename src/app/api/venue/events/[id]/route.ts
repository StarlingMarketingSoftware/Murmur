import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { assertVenueAccount } from '@/app/api/_utils/venueAuth';
import type { ApiRouteParams } from '@/types';
import { updateEventSchema } from '../schema';

// PATCH /api/venue/events/:id — update one event owned by the current venue account.
export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const guard = await assertVenueAccount(userId);
		if (guard) {
			return guard;
		}

		const { id } = await params;
		const eventId = Number(id);
		if (!Number.isInteger(eventId)) {
			return apiBadRequest('Invalid event id');
		}

		const body = await req.json();
		const validated = updateEventSchema.safeParse(body);
		if (!validated.success) {
			return apiBadRequest(validated.error);
		}

		const existingEvent = await prisma.event.findFirst({
			where: { id: eventId, userId },
		});
		if (!existingEvent) {
			return apiNotFound();
		}

		const updatedEvent = await prisma.event.update({
			where: { id: eventId },
			data: validated.data,
		});

		return apiResponse(updatedEvent);
	} catch (error) {
		return handleApiError(error);
	}
}
