import { auth } from '@clerk/nextjs/server';
import {
	apiBadRequest,
	apiConflict,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/api/_utils';
import { cancelBookingRequest } from '@/app/api/_utils/bookingRequests';
import type { ApiRouteParams, SerializedBookingRequest } from '@/types';

export type CancelBookingRequestResponse = { request: SerializedBookingRequest };

export async function POST(_req: Request, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const { id } = await params;
		const requestId = Number(id);
		if (!Number.isInteger(requestId) || requestId <= 0 || requestId > 2147483647) {
			return apiBadRequest('Invalid booking request id');
		}

		const result = await cancelBookingRequest(userId, requestId);
		if (!result.ok) {
			switch (result.code) {
				case 'not_found':
					return apiNotFound('Booking request not found');
				case 'forbidden':
					return apiUnauthorizedResource();
				case 'not_pending':
					// Lost the race (e.g. the artist already confirmed) — the live state
					// lets the venue UI flip to Booked instead of erroring.
					return apiConflict({ error: 'not_pending', request: result.request });
			}
		}
		return apiResponse<CancelBookingRequestResponse>({ request: result.request });
	} catch (error) {
		return handleApiError(error);
	}
}
