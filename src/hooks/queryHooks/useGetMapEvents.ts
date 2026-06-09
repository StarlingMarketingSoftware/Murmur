import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { useQuery } from '@tanstack/react-query';
import type { MapEventData } from '@/app/api/events/route';

const QUERY_KEYS = {
	all: ['events', 'map'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
};

// Upcoming, located venue events for rendering opportunity markers on the shared map.
export const useGetMapEvents = ({ enabled = true }: { enabled?: boolean } = {}) => {
	return useQuery<MapEventData[]>({
		queryKey: QUERY_KEYS.list(),
		queryFn: async () => {
			const response = await _fetch(urls.api.events.index);
			if (!response.ok) {
				throw new Error('Failed to fetch events');
			}
			return response.json();
		},
		enabled,
	});
};
