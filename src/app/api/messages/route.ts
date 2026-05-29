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
import { createReply, divertEmailToMessage } from '@/app/api/_utils/messaging';

// Send a message: either divert a drafted Email to a venue user (`divert`) or
// reply within an existing conversation (`reply`).
const postMessageSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('divert'), emailId: z.number().int().positive() }),
	z.object({
		kind: z.literal('reply'),
		conversationId: z.number().int().positive(),
		body: z.string().min(1).max(10000),
	}),
]);
export type PostMessageData = z.infer<typeof postMessageSchema>;

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		const body = await req.json().catch(() => null);
		const parsed = postMessageSchema.safeParse(body);
		if (!parsed.success) return apiBadRequest(parsed.error);

		if (parsed.data.kind === 'divert') {
			const result = await divertEmailToMessage(userId, parsed.data.emailId);
			if (!result.ok) {
				switch (result.code) {
					case 'not_found':
						return apiNotFound('Email not found');
					case 'forbidden':
						return apiUnauthorizedResource();
					case 'not_venue':
						return apiBadRequest('Recipient is not a venue contact — send via email');
					case 'venue_unavailable':
						return apiConflict({ error: 'venue_unavailable' });
					case 'self_message':
						return apiBadRequest('cannot_message_self');
					default:
						return apiBadRequest('Unable to send message');
				}
			}
			return apiCreated({
				conversationId: result.conversationId,
				message: result.message,
			});
		}

		const result = await createReply(
			userId,
			parsed.data.conversationId,
			parsed.data.body
		);
		if (!result.ok) {
			switch (result.code) {
				case 'not_found':
					return apiNotFound('Conversation not found');
				case 'forbidden':
					return apiUnauthorizedResource();
				case 'empty':
					return apiBadRequest('Message body is required');
				default:
					return apiBadRequest('Unable to send message');
			}
		}
		return apiCreated({ conversationId: result.conversationId, message: result.message });
	} catch (error) {
		return handleApiError(error);
	}
}
