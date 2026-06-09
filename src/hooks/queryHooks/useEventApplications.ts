import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { CustomMutationOptions, CustomQueryOptions } from '@/types';
import type {
	CreateApplicationData,
	EventApplicationResponse,
} from '@/app/api/events/[id]/applications/route';
import type { MyEventApplicationsResponse } from '@/app/api/events/applications/route';

export type { MyEventApplication } from '@/app/api/events/applications/route';

export const EVENT_APPLICATION_QUERY_KEYS = {
	all: ['eventApplications'] as const,
} as const;

/** The signed-in user's own event applications, joined with the event they applied to. */
export const useGetMyEventApplications = (options: CustomQueryOptions = {}) => {
	return useQuery({
		queryKey: EVENT_APPLICATION_QUERY_KEYS.all,
		queryFn: async () => {
			const response = await _fetch(urls.api.events.myApplications);
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to load applications');
			}
			const data = (await response.json()) as MyEventApplicationsResponse;
			return data.applications;
		},
		enabled: options.enabled,
	});
};

/** Submit (or re-submit) an application to a venue's event. */
export const useApplyToEvent = (options: CustomMutationOptions = {}) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			eventId,
			...data
		}: { eventId: number } & CreateApplicationData) => {
			const response = await _fetch(
				urls.api.events.applications(eventId),
				'POST',
				data
			);
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to submit application');
			}
			return response.json() as Promise<EventApplicationResponse>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: EVENT_APPLICATION_QUERY_KEYS.all });
			options.onSuccess?.();
		},
		onError: (error) => {
			if (!options.suppressToasts) {
				toast.error(
					error instanceof Error ? error.message : 'Failed to submit application'
				);
			}
		},
	});
};
