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
import { EVENT_APPLICATION_QUERY_KEYS } from './useEventApplications';
import { INBOUND_EMAIL_QUERY_KEYS } from './useInboundEmails';
import { VENUE_APPLICATION_QUERY_KEYS } from './useVenueApplications';

// Which slice of a conversation a view shows: 'general' = the cold-outreach
// thread, a number = that EventApplication's thread, undefined = merged (the
// artist's messenger).
export type ConversationThreadFilter = 'general' | number;

export const CONVERSATION_QUERY_KEYS = {
	all: ['conversations'] as const,
	list: () => [...CONVERSATION_QUERY_KEYS.all, 'list'] as const,
	// Prefix covering every thread view of one conversation — use for invalidation.
	messages: (id: string | number) =>
		[...CONVERSATION_QUERY_KEYS.all, 'messages', id.toString()] as const,
	// One thread view's cache entry — use for queries and optimistic updates.
	messagesThread: (id: string | number, thread?: ConversationThreadFilter) =>
		[
			...CONVERSATION_QUERY_KEYS.messages(id),
			thread == null ? 'all' : thread.toString(),
		] as const,
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
	options: { enabled?: boolean; thread?: ConversationThreadFilter } = {}
) => {
	const { thread } = options;
	return useQuery({
		queryKey: CONVERSATION_QUERY_KEYS.messagesThread(conversationId ?? 'none', thread),
		queryFn: async () => {
			const base = urls.api.conversations.messages(conversationId as number);
			const response = await _fetch(
				thread == null ? base : `${base}?thread=${thread}`
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
	options: CustomMutationOptions = {},
	thread?: ConversationThreadFilter
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: string) => {
			if (conversationId == null) throw new Error('No conversation selected');
			const payload: PostMessageData = {
				kind: 'reply',
				conversationId,
				body,
				// Replies from an application-thread view stay in that thread; the
				// general and merged views both write to the general thread.
				...(typeof thread === 'number' ? { threadApplicationId: thread } : {}),
			};
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
			const key = CONVERSATION_QUERY_KEYS.messagesThread(conversationId, thread);
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
					CONVERSATION_QUERY_KEYS.messagesThread(conversationId, thread),
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
			// A venue reply changes the matching Replies row's preview/recency in the
			// venue Chat tab (no-op for standard users — the query isn't mounted).
			queryClient.invalidateQueries({ queryKey: VENUE_APPLICATION_QUERY_KEYS.all });
		},
	});
};

/**
 * Venue opens an applicant's Replies row: idempotently resolves (or creates) the
 * conversation with that applicant, seeded with their application summary as the
 * first message. Returns the conversationId to open in the thread view.
 */
export const useOpenApplicationConversation = (options: CustomMutationOptions = {}) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (applicationId: number) => {
			const payload: PostMessageData = { kind: 'openApplication', applicationId };
			const response = await _fetch(urls.api.messages.index, 'POST', payload);
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to open conversation');
			}
			return response.json() as Promise<{
				conversationId: number;
				message: SerializedMessage;
			}>;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: CONVERSATION_QUERY_KEYS.messages(data.conversationId),
			});
			queryClient.invalidateQueries({ queryKey: CONVERSATION_QUERY_KEYS.list() });
			// The Replies row gains its conversationId/preview from the seeded message.
			queryClient.invalidateQueries({ queryKey: VENUE_APPLICATION_QUERY_KEYS.all });
			options.onSuccess?.();
		},
		onError: (error) => {
			if (!options.suppressToasts) {
				toast.error(
					error instanceof Error ? error.message : 'Failed to open conversation'
				);
			}
		},
	});
};

/**
 * Reply within a conversation identified per-call (the conversationId is passed to
 * `.mutate`, not bound at hook creation). Used by the campaign inbox, where venue
 * replies are surfaced as inbound-email rows and replying must route back through
 * the messaging system rather than Mailgun. No optimistic message-cache update —
 * the inbox renders its own optimistic reply state.
 */
export const useSendConversationReply = (options: CustomMutationOptions = {}) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			conversationId,
			body,
			threadApplicationId,
		}: {
			conversationId: number;
			body: string;
			// Routes the reply back into the application thread the venue message
			// came from (carried on the projected inbound row); omitted = general.
			threadApplicationId?: number;
		}) => {
			const payload: PostMessageData = {
				kind: 'reply',
				conversationId,
				body,
				...(threadApplicationId != null ? { threadApplicationId } : {}),
			};
			const response = await _fetch(urls.api.messages.index, 'POST', payload);
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to send reply');
			}
			return response.json() as Promise<{
				conversationId: number;
				message: SerializedMessage;
			}>;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: CONVERSATION_QUERY_KEYS.messages(data.conversationId),
			});
			queryClient.invalidateQueries({ queryKey: CONVERSATION_QUERY_KEYS.list() });
			// The reply changes what projectVenueRepliesForUser returns in the inbound
			// feed (venue replies are surfaced there), so refetch the Responses inbox.
			queryClient.invalidateQueries({ queryKey: INBOUND_EMAIL_QUERY_KEYS.all });
			options.onSuccess?.();
		},
		onError: (error) => {
			if (!options.suppressToasts) {
				toast.error(error instanceof Error ? error.message : 'Failed to send reply');
			}
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
		mutationFn: async ({
			conversationId,
			applicationId,
		}: {
			conversationId: number;
			// Marks only that application thread's read state (venue side); omitted =
			// the conversation watermark (general thread / artist's merged view).
			applicationId?: number;
		}) => {
			const response = await _fetch(
				urls.api.conversations.read(conversationId),
				'POST',
				applicationId != null ? { applicationId } : undefined
			);
			if (!response.ok) {
				throw new Error('Failed to mark conversation read');
			}
			return response.json();
		},
		onSuccess: (_data, { conversationId, applicationId }) => {
			// Immediately zero this conversation's unread badge in the list cache —
			// the list counts the general thread (venue) or everything (artist), so
			// only a non-thread read affects it.
			if (applicationId == null) {
				queryClient.setQueryData<ConversationListItem[]>(
					CONVERSATION_QUERY_KEYS.list(),
					(old) =>
						old?.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
				);
			}
			// The venue Replies rows and the artist's opportunity rows carry their own
			// per-thread unread counts — refetch so their indicators clear in step
			// with the list (no-ops when the queries aren't mounted).
			queryClient.invalidateQueries({ queryKey: VENUE_APPLICATION_QUERY_KEYS.all });
			queryClient.invalidateQueries({ queryKey: EVENT_APPLICATION_QUERY_KEYS.all });
		},
	});
};
