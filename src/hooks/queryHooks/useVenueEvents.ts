import { _fetch } from '@/utils';
import { CustomMutationOptions } from '@/types';
import { urls } from '@/constants/urls';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { VenueEventWithBooking } from '@/app/api/venue/events/route';
import type { PostEventData, UpdateEventData } from '@/app/api/venue/events/schema';

export const VENUE_EVENT_QUERY_KEYS = {
	all: ['venue', 'events'] as const,
	list: () => [...VENUE_EVENT_QUERY_KEYS.all, 'list'] as const,
};
const QUERY_KEYS = VENUE_EVENT_QUERY_KEYS;

export const useGetVenueEvents = ({ enabled = true }: { enabled?: boolean } = {}) => {
	return useQuery<VenueEventWithBooking[]>({
		queryKey: QUERY_KEYS.list(),
		queryFn: async () => {
			const response = await _fetch(urls.api.venue.events.index);
			if (!response.ok) {
				throw new Error('Failed to fetch events');
			}
			return response.json();
		},
		enabled,
	});
};

export const useCreateVenueEvent = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Event published',
		errorMessage = 'Failed to publish event',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostEventData) => {
			const response = await _fetch(urls.api.venue.events.index, 'POST', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to publish event');
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};

export const useDeleteVenueEvent = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Event deleted',
		errorMessage = 'Failed to delete event',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number) => {
			const response = await _fetch(urls.api.venue.events.detail(id), 'DELETE');
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || 'Failed to delete event');
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};

export const useUpdateVenueEvent = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Event updated',
		errorMessage = 'Failed to update event',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, data }: { id: number; data: UpdateEventData }) => {
			const response = await _fetch(urls.api.venue.events.detail(id), 'PATCH', data);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || 'Failed to update event');
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};
