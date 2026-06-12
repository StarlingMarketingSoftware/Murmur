import { auth } from '@clerk/nextjs/server';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { listConversationsForUser } from '@/app/api/_utils/messaging';
import type { ConversationListItem } from '@/types';

// Conversation inbox for the caller — works for both standard and venue users
// (the core branches on the caller's account type).
export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const conversations: ConversationListItem[] = await listConversationsForUser(userId);
		return apiResponse(conversations);
	} catch (error) {
		return handleApiError(error);
	}
}
