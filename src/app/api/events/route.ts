import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';

// Shape returned to standard users for rendering venue-posted events on the map.
// `startsAt` is serialized to an ISO string over the wire.
export type MapEventData = {
	id: number;
	name: string;
	latitude: number | null;
	longitude: number | null;
	whenLabel: string | null;
	startsAt: string | null;
};

// GET /api/events — upcoming, located events from every venue, for the shared map.
// Authenticated but intentionally NOT venue-guarded: standard users must be able to
// read these so opportunity markers can render on the dashboard map.
export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const events = await prisma.event.findMany({
			where: {
				latitude: { not: null },
				longitude: { not: null },
				// Upcoming only: future start, or no date set yet.
				OR: [{ startsAt: { gte: new Date() } }, { startsAt: null }],
			},
			orderBy: { startsAt: 'asc' },
			select: {
				id: true,
				name: true,
				latitude: true,
				longitude: true,
				whenLabel: true,
				startsAt: true,
			},
		});
		return apiResponse(events);
	} catch (error) {
		return handleApiError(error);
	}
}
