import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
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

// Mark the calling side's read watermark for a conversation = now.
export async function POST(_req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const { id } = await params;
		const conversationId = Number(id);
		if (!Number.isInteger(conversationId) || conversationId <= 0) {
			return apiBadRequest('Invalid conversation id');
		}

		const result = await markConversationRead(userId, conversationId);
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
