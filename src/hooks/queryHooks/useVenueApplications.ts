import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { useQuery } from '@tanstack/react-query';
import type {
	VenueApplicationRow,
	VenueApplicationsResponse,
} from '@/app/api/venue/applications/route';
import type {
	VenueEventApplicant,
	VenueEventApplicantsResponse,
	VenueEventApplicationVideo,
} from '@/app/api/venue/events/[id]/applications/route';

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
