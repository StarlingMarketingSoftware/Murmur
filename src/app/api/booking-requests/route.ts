import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
	apiBadRequest,
	apiConflict,
	apiCreated,
	apiNotFound,
	apiUnauthorized,
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/api/_utils';
import { createBookingRequest } from '@/app/api/_utils/bookingRequests';
import type { SerializedBookingRequest, SerializedMessage } from '@/types';

const postBookingRequestSchema = z.object({
	conversationId: z.number().int().positive().lte(2147483647),
	// Omitted = the general/cold-outreach thread.
	threadApplicationId: z.number().int().positive().lte(2147483647).optional(),
});
export type PostBookingRequestData = z.infer<typeof postBookingRequestSchema>;

export type PostBookingRequestResponse = {
	conversationId: number;
	request: SerializedBookingRequest;
	message: SerializedMessage;
};

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const body = await req.json().catch(() => null);
		const validated = postBookingRequestSchema.safeParse(body);
		if (!validated.success) return apiBadRequest(validated.error);

		const result = await createBookingRequest(
			userId,
			validated.data.conversationId,
			validated.data.threadApplicationId ?? null
		);
		if (!result.ok) {
			switch (result.code) {
				case 'not_found':
					return apiNotFound('Conversation not found');
				case 'forbidden':
					return apiUnauthorizedResource();
				case 'invalid_thread':
					return apiBadRequest('Application thread does not match this conversation');
				case 'application_withdrawn':
					return apiConflict({ error: 'application_withdrawn' });
				case 'request_exists':
					return apiConflict({ error: 'booking_request_exists' });
				case 'event_already_booked':
					return apiConflict({ error: 'event_already_booked' });
			}
		}
		return apiCreated<PostBookingRequestResponse>({
			conversationId: result.conversationId,
			request: result.request,
			message: result.message,
		});
	} catch (error) {
		return handleApiError(error);
	}
}
