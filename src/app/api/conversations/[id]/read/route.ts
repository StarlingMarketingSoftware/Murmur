import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/api/_utils';
import { markConversationRead } from '@/app/api/_utils/messaging';
import { ApiRouteParams } from '@/types';

// Optional body: a venue reading one application's thread marks only that
// thread's read state (the conversation watermark keeps the general thread).
const readBodySchema = z.object({
	applicationId: z.number().int().positive().optional(),
});
export type PostConversationReadData = z.infer<typeof readBodySchema>;

// Mark the calling side's read watermark for a conversation = now.
export async function POST(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const { id } = await params;
		const conversationId = Number(id);
		if (!Number.isInteger(conversationId) || conversationId <= 0) {
			return apiBadRequest('Invalid conversation id');
		}

		// Existing callers POST with no body — treat that as a plain conversation read.
		const body = await req.json().catch(() => ({}));
		const parsed = readBodySchema.safeParse(body ?? {});
		if (!parsed.success) return apiBadRequest(parsed.error);

		const result = await markConversationRead(
			userId,
			conversationId,
			parsed.data.applicationId ?? null
		);
		if (!result.ok) {
			return result.code === 'not_found'
				? apiNotFound('Conversation not found')
				: apiUnauthorizedResource();
		}
		return apiResponse({ ok: true });
	} catch (error) {
		return handleApiError(error);
	}
}
