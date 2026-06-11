// Mutations for the venue → artist booking-request handshake. The venue-side pair
// (create/cancel) updates the per-thread MessagesPage cache optimistically — both
// the in-thread delivery message and the page-level `bookingRequest` field that
// drives the button↔banner swap — mirroring useSendReply's optimistic shape. The
// artist-side confirm invalidates the projected-inbound feed + calendars instead
// (its caches live in the campaign inbox, not the messenger thread).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
	PostBookingRequestData,
	PostBookingRequestResponse,
} from '@/app/api/booking-requests/route';
import type { ConfirmBookingRequestData } from '@/app/api/booking-requests/[id]/confirm/route';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import type {
	CustomMutationOptions,
	MessagesPage,
	SerializedBookingRequest,
	SerializedMessage,
} from '@/types';
import {
	CONVERSATION_QUERY_KEYS,
	type ConversationThreadFilter,
} from './useConversations';
import { CALENDAR_ENTRY_QUERY_KEYS } from './useCalendarEntries';
import { EVENT_APPLICATION_QUERY_KEYS } from './useEventApplications';
import { INBOUND_EMAIL_QUERY_KEYS } from './useInboundEmails';
import { VENUE_APPLICATION_QUERY_KEYS } from './useVenueApplications';
import { VENUE_EVENT_QUERY_KEYS } from './useVenueEvents';

/** The venue sends "Request to book" from one conversation thread. */
export const useCreateBookingRequest = (
	conversationId: number | null,
	thread: ConversationThreadFilter | undefined,
	options: CustomMutationOptions = {}
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			if (conversationId == null) throw new Error('No conversation selected');
			const payload: PostBookingRequestData = {
				conversationId,
				...(typeof thread === 'number' ? { threadApplicationId: thread } : {}),
			};
			const response = await _fetch(urls.api.bookingRequests.index, 'POST', payload);
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(
					err.error === 'booking_request_exists'
						? 'A booking request is already active for this chat'
						: err.error === 'event_already_booked'
							? 'This event is already booked'
							: err.error || 'Failed to send booking request'
				);
			}
			return response.json() as Promise<PostBookingRequestResponse>;
		},
		onMutate: async () => {
			if (conversationId == null) return { previous: undefined };
			const key = CONVERSATION_QUERY_KEYS.messagesThread(conversationId, thread);
			// Cancel any in-flight poll so it can't overwrite the optimistic page.
			// A poll tick that STARTS mid-mutation can still land stale and flicker
			// for one cycle until onSettled's invalidation — accepted for Phase 1.
			await queryClient.cancelQueries({ queryKey: key });
			const previous = queryClient.getQueryData<MessagesPage>(key);
			if (previous) {
				const optimisticRequest: SerializedBookingRequest = {
					id: -1, // replaced on settle; negative = "in flight" to the banner UI
					conversationId,
					threadApplicationId: typeof thread === 'number' ? thread : null,
					eventId: null,
					status: 'pending',
					date: null,
					requestedAt: new Date().toISOString(),
					confirmedAt: null,
					canceledAt: null,
					eventName: null,
					eventStartsAt: null,
					eventWhenLabel: null,
				};
				const optimisticMessage: SerializedMessage = {
					id: -Date.now(),
					conversationId,
					sender: 'venue',
					body: 'Booking request',
					isHtml: false,
					applicationId: null,
					bookingRequestId: optimisticRequest.id,
					bookingRequest: optimisticRequest,
					venueAction: null,
					createdAt: new Date().toISOString(),
				};
				queryClient.setQueryData<MessagesPage>(key, {
					...previous,
					items: [...previous.items, optimisticMessage],
					bookingRequest: optimisticRequest,
				});
			}
			return { previous };
		},
		onError: (error, _variables, context) => {
			if (conversationId != null && context?.previous) {
				queryClient.setQueryData(
					CONVERSATION_QUERY_KEYS.messagesThread(conversationId, thread),
					context.previous
				);
			}
			if (!options.suppressToasts) {
				toast.error(
					error instanceof Error ? error.message : 'Failed to send booking request'
				);
			}
		},
		onSettled: () => {
			if (conversationId != null) {
				queryClient.invalidateQueries({
					queryKey: CONVERSATION_QUERY_KEYS.messages(conversationId),
				});
			}
			queryClient.invalidateQueries({ queryKey: CONVERSATION_QUERY_KEYS.list() });
			queryClient.invalidateQueries({ queryKey: VENUE_APPLICATION_QUERY_KEYS.all });
		},
	});
};

// Apply a live request state onto a cached MessagesPage: the delivering message's
// attached state and the page-level field both flip together.
const applyRequestToPage = (
	page: MessagesPage,
	request: SerializedBookingRequest
): MessagesPage => ({
	...page,
	items: page.items.map((message) =>
		message.bookingRequestId === request.id
			? { ...message, bookingRequest: request }
			: message
	),
	bookingRequest:
		request.status === 'canceled'
			? page.bookingRequest?.id === request.id
				? null
				: page.bookingRequest
			: request,
});

/** The venue withdraws a pending request (the banner's X). */
export const useCancelBookingRequest = (
	conversationId: number | null,
	thread: ConversationThreadFilter | undefined,
	options: CustomMutationOptions = {}
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (requestId: number) => {
			const response = await _fetch(
				urls.api.bookingRequests.cancel(requestId),
				'POST'
			);
			const body = await response.json().catch(() => ({}));
			// A confirm won the race: not an error — the live state flips the banner
			// to Booked instead.
			if (response.status === 409 && body.error === 'not_pending' && body.request) {
				return { request: body.request as SerializedBookingRequest };
			}
			if (!response.ok) {
				throw new Error(body.error || 'Failed to cancel booking request');
			}
			return body as { request: SerializedBookingRequest };
		},
		onMutate: async (requestId: number) => {
			if (conversationId == null) return { previous: undefined };
			const key = CONVERSATION_QUERY_KEYS.messagesThread(conversationId, thread);
			await queryClient.cancelQueries({ queryKey: key });
			const previous = queryClient.getQueryData<MessagesPage>(key);
			if (previous?.bookingRequest && previous.bookingRequest.id === requestId) {
				queryClient.setQueryData<MessagesPage>(
					key,
					applyRequestToPage(previous, {
						...previous.bookingRequest,
						status: 'canceled',
						canceledAt: new Date().toISOString(),
					})
				);
			}
			return { previous };
		},
		onSuccess: (data) => {
			if (conversationId == null) return;
			const key = CONVERSATION_QUERY_KEYS.messagesThread(conversationId, thread);
			const page = queryClient.getQueryData<MessagesPage>(key);
			if (page) {
				queryClient.setQueryData<MessagesPage>(
					key,
					applyRequestToPage(page, data.request)
				);
			}
			// Cancel lost to a confirm: the optimistic 'canceled' write masked the
			// pending→confirmed transition the thread's flip-detection effect watches
			// for, so refresh the booked surfaces here directly.
			if (data.request.status === 'confirmed') {
				queryClient.invalidateQueries({ queryKey: VENUE_EVENT_QUERY_KEYS.all });
				queryClient.invalidateQueries({ queryKey: VENUE_APPLICATION_QUERY_KEYS.all });
			}
		},
		onError: (error, _requestId, context) => {
			if (conversationId != null && context?.previous) {
				queryClient.setQueryData(
					CONVERSATION_QUERY_KEYS.messagesThread(conversationId, thread),
					context.previous
				);
			}
			if (!options.suppressToasts) {
				toast.error(
					error instanceof Error ? error.message : 'Failed to cancel booking request'
				);
			}
		},
		onSettled: () => {
			if (conversationId != null) {
				queryClient.invalidateQueries({
					queryKey: CONVERSATION_QUERY_KEYS.messages(conversationId),
				});
			}
			queryClient.invalidateQueries({ queryKey: CONVERSATION_QUERY_KEYS.list() });
			queryClient.invalidateQueries({ queryKey: VENUE_APPLICATION_QUERY_KEYS.all });
			// Defensive: a cancel that raced a confirm may have written calendar rows.
			queryClient.invalidateQueries({ queryKey: CALENDAR_ENTRY_QUERY_KEYS.all });
		},
	});
};

/**
 * The artist confirms a pending request with the date (and entry fields) they
 * settled on in the booking popup. Server-side this also writes the venue's
 * calendar entry, so every feed that renders booking state resyncs on success.
 */
export const useConfirmBookingRequest = (options: CustomMutationOptions = {}) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			requestId: number;
			data: ConfirmBookingRequestData;
		}) => {
			const response = await _fetch(
				urls.api.bookingRequests.confirm(input.requestId),
				'POST',
				input.data
			);
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(
					body.error === 'not_pending'
						? 'This booking request is no longer active'
						: body.error === 'date_unavailable'
							? 'That date already has another booking'
							: body.error === 'event_already_booked'
								? 'This event was already booked'
								: body.error || 'Failed to confirm booking'
				);
			}
			return body as { request: SerializedBookingRequest };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: INBOUND_EMAIL_QUERY_KEYS.all });
			queryClient.invalidateQueries({ queryKey: CALENDAR_ENTRY_QUERY_KEYS.all });
			queryClient.invalidateQueries({ queryKey: EVENT_APPLICATION_QUERY_KEYS.all });
			queryClient.invalidateQueries({ queryKey: CONVERSATION_QUERY_KEYS.all });
			options.onSuccess?.();
		},
		onError: (error) => {
			// Resync — the request may have been canceled venue-side while the popup
			// was open.
			queryClient.invalidateQueries({ queryKey: INBOUND_EMAIL_QUERY_KEYS.all });
			if (!options.suppressToasts) {
				toast.error(
					error instanceof Error ? error.message : 'Failed to confirm booking'
				);
			}
		},
	});
};
