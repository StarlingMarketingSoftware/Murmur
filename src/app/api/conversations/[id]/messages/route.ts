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
import { getMessagesPage } from '@/app/api/_utils/messaging';
import { ApiRouteParams } from '@/types';
import { getValidatedParamsFromUrl } from '@/utils';

const messagesQuerySchema = z.object({
	cursor: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type MessagesQueryData = z.infer<typeof messagesQuerySchema>;

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const { id } = await params;
		const conversationId = Number(id);
		if (!Number.isInteger(conversationId) || conversationId <= 0) {
			return apiBadRequest('Invalid conversation id');
		}

		const validated = getValidatedParamsFromUrl(req.url, messagesQuerySchema);
		if (!validated.success) return apiBadRequest(validated.error);

		const result = await getMessagesPage(
			userId,
			conversationId,
			validated.data.cursor ?? null,
			validated.data.limit ?? 100
		);
		if (!result.ok) {
			return result.code === 'not_found'
				? apiNotFound('Conversation not found')
				: apiUnauthorizedResource();
		}
		return apiResponse(result.page);
	} catch (error) {
		return handleApiError(error);
	}
}
