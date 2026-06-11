import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CustomMutationOptions } from '@/types';
import {
	DeleteCalendarEntryData,
	GetCalendarEntriesData,
	GetCalendarEntryData,
	PatchCalendarEntryData,
} from '@/app/api/calendar/route';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';

const QUERY_KEYS = {
	all: ['calendar-entries'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
} as const;

export const useGetCalendarEntries = (options?: { enabled?: boolean }) => {
	return useQuery<GetCalendarEntriesData>({
		queryKey: QUERY_KEYS.list(),
		queryFn: async () => {
			const response = await _fetch(urls.api.calendar.index);
			if (!response.ok) {
				throw new Error('Failed to fetch calendar entries');
			}
			return response.json() as Promise<GetCalendarEntriesData>;
		},
		enabled: options?.enabled ?? true,
		retry: false,
		refetchOnWindowFocus: false,
	});
};

export const useUpsertCalendarEntry = (options: CustomMutationOptions = {}) => {
	const { suppressToasts = false, errorMessage = 'Failed to save event' } = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: PatchCalendarEntryData) => {
			const response = await _fetch(urls.api.calendar.index, 'PATCH', input);
			if (!response.ok) {
				throw new Error('Failed to save calendar entry');
			}
			return response.json() as Promise<GetCalendarEntryData>;
		},
		onSuccess: (data) => {
			// setQueryData (not invalidate) so an autosave round-trip never triggers
			// a refetch that could clobber in-progress typing.
			queryClient.setQueryData<GetCalendarEntriesData>(QUERY_KEYS.list(), (prev) => {
				const others = (prev?.entries ?? []).filter((entry) => entry.date !== data.date);
				return {
					entries: [...others, data].sort((a, b) => a.date.localeCompare(b.date)),
				};
			});
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};

export const useDeleteCalendarEntry = (options: CustomMutationOptions = {}) => {
	const { suppressToasts = false, errorMessage = 'Failed to remove event' } = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ date }: { date: string }) => {
			const response = await _fetch(
				`${urls.api.calendar.index}?date=${encodeURIComponent(date)}`,
				'DELETE'
			);
			if (!response.ok) {
				throw new Error('Failed to delete calendar entry');
			}
			return response.json() as Promise<DeleteCalendarEntryData>;
		},
		onSuccess: (data) => {
			queryClient.setQueryData<GetCalendarEntriesData>(QUERY_KEYS.list(), (prev) =>
				prev
					? { entries: prev.entries.filter((entry) => entry.date !== data.date) }
					: prev
			);
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};

/**
 * Client-side conversation linkage: per-user entry lists are small (at most one
 * per day), so the inbox derives its "Booked" state from the cached list.
 */
export const findBookingForConversation = (
	entries: GetCalendarEntryData[] | undefined,
	campaignId: number | null | undefined,
	contactId: number | null | undefined
): GetCalendarEntryData | undefined => {
	if (!entries || campaignId == null || contactId == null) return undefined;
	return entries.find(
		(entry) => entry.campaignId === campaignId && entry.contactId === contactId
	);
};
