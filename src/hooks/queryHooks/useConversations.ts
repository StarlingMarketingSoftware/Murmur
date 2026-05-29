import type { PostMessageData } from '@/app/api/messages/route';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import {
	CustomMutationOptions,
	ConversationListItem,
	MessageSenderRole,
	MessagesPage,
	SerializedMessage,
} from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EMAIL_QUERY_KEYS } from './useEmails';

export const CONVERSATION_QUERY_KEYS = {
	all: ['conversations'] as const,
	list: () => [...CONVERSATION_QUERY_KEYS.all, 'list'] as const,
	messages: (id: string | number) =>
		[...CONVERSATION_QUERY_KEYS.all, 'messages', id.toString()] as const,
} as const;

// Phase 1: poll when realtime is off (it always is in Phase 1). Phase 2 flips this
// to a Pusher subscription and disables the intervals.
const REALTIME_ENABLED = process.env.NEXT_PUBLIC_USE_REALTIME === 'true';

export const useGetConversations = (options: { enabled?: boolean } = {}) => {
	return useQuery({
		queryKey: CONVERSATION_QUERY_KEYS.list(),
		queryFn: async () => {
			const response = await _fetch(urls.api.conversations.index);
			if (!response.ok) {
				throw new Error('Failed to fetch conversations');
			}
			return response.json() as Promise<ConversationListItem[]>;
		},
		enabled: options.enabled,
		refetchInterval: REALTIME_ENABLED ? false : 30_000,
	});
};

export const useGetMessages = (
	conversationId: number | null,
	options: { enabled?: boolean } = {}
) => {
	return useQuery({
		queryKey: CONVERSATION_QUERY_KEYS.messages(conversationId ?? 'none'),
		queryFn: async () => {
			const response = await _fetch(
				urls.api.conversations.messages(conversationId as number)
			);
			if (!response.ok) {
				throw new Error('Failed to fetch messages');
			}
			return response.json() as Promise<MessagesPage>;
		},
		enabled: conversationId != null && options.enabled !== false,
		refetchInterval: REALTIME_ENABLED ? false : 10_000,
	});
};

/** Optimistic reply within an open conversation thread. */
export const useSendReply = (
	conversationId: number | null,
	currentUserRole: MessageSenderRole | undefined,
	options: CustomMutationOptions = {}
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: string) => {
			if (conversationId == null) throw new Error('No conversation selected');
			const payload: PostMessageData = { kind: 'reply', conversationId, body };
			const response = await _fetch(urls.api.messages.index, 'POST', payload);
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to send message');
			}
			return response.json() as Promise<{
				conversationId: number;
				message: SerializedMessage;
			}>;
		},
		onMutate: async (body: string) => {
			if (conversationId == null || !currentUserRole) return { previous: undefined };
			const key = CONVERSATION_QUERY_KEYS.messages(conversationId);
			await queryClient.cancelQueries({ queryKey: key });
			const previous = queryClient.getQueryData<MessagesPage>(key);
			if (previous) {
				const optimistic: SerializedMessage = {
					id: -Date.now(), // temp negative id; replaced on settle
					conversationId,
					sender: currentUserRole,
					body,
					isHtml: false,
					createdAt: new Date().toISOString(),
				};
				queryClient.setQueryData<MessagesPage>(key, {
					...previous,
					items: [...previous.items, optimistic],
				});
			}
			return { previous };
		},
		onError: (error, _body, context) => {
			if (conversationId != null && context?.previous) {
				queryClient.setQueryData(
					CONVERSATION_QUERY_KEYS.messages(conversationId),
					context.previous
				);
			}
			if (!options.suppressToasts) {
				toast.error(error instanceof Error ? error.message : 'Failed to send message');
			}
		},
		onSuccess: () => {
			options.onSuccess?.();
		},
		onSettled: () => {
			if (conversationId != null) {
				queryClient.invalidateQueries({
					queryKey: CONVERSATION_QUERY_KEYS.messages(conversationId),
				});
			}
			queryClient.invalidateQueries({ queryKey: CONVERSATION_QUERY_KEYS.list() });
		},
	});
};

/** Divert a drafted Email to a venue user (used by the campaign send loop). */
export const useDivertEmailToMessage = (options: CustomMutationOptions = {}) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (emailId: number) => {
			const payload: PostMessageData = { kind: 'divert', emailId };
			const response = await _fetch(urls.api.messages.index, 'POST', payload);
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to deliver message');
			}
			return response.json() as Promise<{
				conversationId: number;
				message: SerializedMessage;
			}>;
		},
		onSuccess: (data, emailId) => {
			// Refresh the sender's open thread (if any) + the inbox list.
			queryClient.invalidateQueries({
				queryKey: CONVERSATION_QUERY_KEYS.messages(data.conversationId),
			});
			queryClient.invalidateQueries({ queryKey: CONVERSATION_QUERY_KEYS.list() });
			// The divert flipped this Email's status to `sent` server-side, so the
			// Drafts/Sent lists (driven by useGetEmails) must refetch — otherwise the
			// draft lingers in Drafts. Mirrors the email-list invalidation that
			// useEditEmail performs on the Mailgun send path.
			queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.list() });
			queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.detail(emailId) });
			options.onSuccess?.();
		},
		onError: (error) => {
			if (!options.suppressToasts) {
				toast.error(error instanceof Error ? error.message : 'Failed to deliver message');
			}
		},
	});
};

export const useMarkConversationRead = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (conversationId: number) => {
			const response = await _fetch(urls.api.conversations.read(conversationId), 'POST');
			if (!response.ok) {
				throw new Error('Failed to mark conversation read');
			}
			return response.json();
		},
		onSuccess: (_data, conversationId) => {
			// Immediately zero this conversation's unread badge in the list cache.
			queryClient.setQueryData<ConversationListItem[]>(
				CONVERSATION_QUERY_KEYS.list(),
				(old) =>
					old?.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
			);
		},
	});
};
