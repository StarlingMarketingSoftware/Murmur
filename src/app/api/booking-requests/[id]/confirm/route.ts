import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
	apiBadRequest,
	apiConflict,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/api/_utils';
import { confirmBookingRequest } from '@/app/api/_utils/bookingRequests';
import type { ApiRouteParams, SerializedBookingRequest } from '@/types';

// Mirrors patchCalendarEntrySchema (api/calendar) minus `date` strictness — the
// confirmed entry is written with the same replace/merge semantics, so the popup's
// final field set rides this payload unchanged.
const confirmBookingRequestSchema = z.object({
	// Must be a REAL calendar day — this key is also written onto the venue's
	// calendar, where a malformed value would create an invisible-but-occupying
	// entry no month grid ever renders.
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.refine((value) => {
			const parsed = new Date(`${value}T00:00:00Z`);
			return (
				!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
			);
		}, 'Invalid calendar date'),
	personName: z.string().max(500).optional(),
	company: z.string().max(500).optional(),
	startTime: z.string().max(50).optional(),
	endTime: z.string().max(50).optional(),
	notes: z.string().max(20000).optional(),
	address: z.string().max(1000).optional(),
	placeId: z.string().max(500).nullable().optional(),
	latitude: z.number().finite().nullable().optional(),
	longitude: z.number().finite().nullable().optional(),
	drivingDuration: z.string().max(100).nullable().optional(),
	// Bounded to INT4 so an oversized id 400s here instead of throwing inside
	// Prisma's Int filter (same convention as the messages route).
	campaignId: z.number().int().gte(-2147483648).lte(2147483647).nullable().optional(),
	contactId: z.number().int().gte(-2147483648).lte(2147483647).nullable().optional(),
});
export type ConfirmBookingRequestData = z.infer<typeof confirmBookingRequestSchema>;

export type ConfirmBookingRequestResponse = { request: SerializedBookingRequest };

export async function POST(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const { id } = await params;
		const requestId = Number(id);
		if (!Number.isInteger(requestId) || requestId <= 0 || requestId > 2147483647) {
			return apiBadRequest('Invalid booking request id');
		}

		const body = await req.json().catch(() => null);
		const validated = confirmBookingRequestSchema.safeParse(body);
		if (!validated.success) return apiBadRequest(validated.error);

		const result = await confirmBookingRequest(userId, requestId, validated.data);
		if (!result.ok) {
			switch (result.code) {
				case 'not_found':
					return apiNotFound('Booking request not found');
				case 'forbidden':
					return apiUnauthorizedResource();
				case 'not_pending':
					return apiConflict({ error: 'not_pending', request: result.request });
				case 'date_unavailable':
					return apiConflict({ error: 'date_unavailable' });
				case 'event_already_booked':
					return apiConflict({ error: 'event_already_booked' });
			}
		}
		return apiResponse<ConfirmBookingRequestResponse>({ request: result.request });
	} catch (error) {
		return handleApiError(error);
	}
}
