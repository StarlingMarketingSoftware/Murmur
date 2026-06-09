import { _fetch } from '@/utils';
import { CustomMutationOptions } from '@/types';
import { urls } from '@/constants/urls';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Venue } from '@prisma/client';
import type { PatchVenueData, WeeklyHours } from '@/app/api/venue/schema';

const QUERY_KEYS = {
	all: ['venue'] as const,
};

// Prisma types `hours` as a loose JsonValue; narrow it to the schema shape for callers.
export type VenueProfile = Omit<Venue, 'hours'> & { hours: WeeklyHours | null };

export const useGetVenue = ({ enabled = true }: { enabled?: boolean } = {}) => {
	return useQuery<VenueProfile | null>({
		queryKey: QUERY_KEYS.all,
		queryFn: async () => {
			const response = await _fetch(urls.api.venue.index);
			if (!response.ok) {
				throw new Error('Failed to fetch venue');
			}
			return response.json();
		},
		enabled,
	});
};

export const useUpsertVenue = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Venue saved successfully',
		errorMessage = 'Failed to save venue',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PatchVenueData): Promise<VenueProfile> => {
			const response = await _fetch(urls.api.venue.index, 'PATCH', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to save venue');
			}
			return response.json();
		},
		onSuccess: (venue) => {
			// Seed the cache with the PATCH response (the same full Venue row GET
			// returns) so consumers that read the venue right after a save — e.g. the
			// venue portal flipping to its map view on Continue — see the fresh
			// coordinates instead of the pre-save row while the refetch is in flight.
			queryClient.setQueryData(QUERY_KEYS.all, venue);
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
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
