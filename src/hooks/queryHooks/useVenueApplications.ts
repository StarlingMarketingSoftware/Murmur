import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CustomMutationOptions } from '@/types';
import type {
	VenueApplicationRow,
	VenueApplicationsResponse,
} from '@/app/api/venue/applications/route';
import type {
	VenueEventApplicant,
	VenueEventApplicantsResponse,
	VenueEventApplicationVideo,
} from '@/app/api/venue/events/[id]/applications/route';
import type { VideoRatingResponse } from '@/app/api/venue/application-videos/[id]/rating/route';

export type { VenueApplicationRow, VenueEventApplicant, VenueEventApplicationVideo };

export const VENUE_APPLICATION_QUERY_KEYS = {
	all: ['venueApplications'] as const,
	eventApplicants: (eventId: number) => ['venueApplications', 'event', eventId] as const,
} as const;

// Applications received for the current venue's events (the Chat tab's Replies
// inbox). Polls on the same Phase-1 cadence as useGetConversations.
export const useGetVenueApplications = (options: { enabled?: boolean } = {}) => {
	return useQuery({
		queryKey: VENUE_APPLICATION_QUERY_KEYS.all,
		queryFn: async () => {
			const response = await _fetch(urls.api.venue.applications.index);
			if (!response.ok) {
				throw new Error('Failed to fetch applications');
			}
			const data = (await response.json()) as VenueApplicationsResponse;
			return data.applications;
		},
		enabled: options.enabled,
		refetchInterval: 30_000,
	});
};

// Full application snapshots (answers + presigned frozen media) for one event's
// applicant list in the Events panel detail view. Gated on a selected event so
// presigned URLs are only minted for the event being viewed.
export const useGetVenueEventApplicants = (eventId: number | null) => {
	return useQuery({
		queryKey: VENUE_APPLICATION_QUERY_KEYS.eventApplicants(eventId ?? -1),
		queryFn: async () => {
			const response = await _fetch(urls.api.venue.events.applications(eventId!));
			if (!response.ok) {
				throw new Error('Failed to fetch applicants');
			}
			const data = (await response.json()) as VenueEventApplicantsResponse;
			return data.applicants;
		},
		enabled: eventId != null,
		// Playback/poster URLs are short-lived presigned URLs, so keep this fresh.
		staleTime: 1000 * 30,
	});
};

// Upsert the venue user's personal rating of one application video (0 clears).
// Optimistic: star clicks must feel as instant as the local state they replace,
// so the eventApplicants cache is patched in onMutate and rolled back on error.
// No invalidation on success (ContactNote autosave pattern) — the server value
// matches the optimistic one, and a refetch would re-mint presigned URLs.
export const useRateApplicationVideo = (
	eventId: number,
	options: CustomMutationOptions = {}
) => {
	const { suppressToasts = false, errorMessage = 'Failed to save rating' } = options;
	const queryClient = useQueryClient();
	const queryKey = VENUE_APPLICATION_QUERY_KEYS.eventApplicants(eventId);

	return useMutation({
		mutationFn: async ({ videoId, rating }: { videoId: number; rating: number }) => {
			const response = await _fetch(urls.api.venue.applicationVideos.rating(videoId), 'PATCH', {
				rating,
			});
			if (!response.ok) {
				throw new Error('Failed to save rating');
			}
			return response.json() as Promise<VideoRatingResponse>;
		},
		onMutate: async ({ videoId, rating }) => {
			await queryClient.cancelQueries({ queryKey });
			const previous = queryClient.getQueryData<VenueEventApplicant[]>(queryKey);
			queryClient.setQueryData<VenueEventApplicant[]>(queryKey, (prev) =>
				prev?.map((applicant) =>
					applicant.videos.some((video) => video.id === videoId)
						? {
								...applicant,
								videos: applicant.videos.map((video) =>
									video.id === videoId ? { ...video, rating } : video
								),
							}
						: applicant
				)
			);
			return { previous };
		},
		onError: (_error, _variables, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKey, context.previous);
			}
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};
