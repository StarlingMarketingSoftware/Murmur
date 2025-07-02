import { Contact } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import { CustomQueryOptions } from '@/types';
import { appendQueryParamsToUrl } from '@/utils';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { GetApolloContactsData } from '@/app/api/apollo/route';

const QUERY_KEYS = {
	all: ['apollo'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export interface ApolloQueryOptions extends CustomQueryOptions {
	filters?: GetApolloContactsData;
}

export const useGetApollo = (options: ApolloQueryOptions) => {
	return useQuery<Contact[]>({
		queryKey: [...QUERY_KEYS.list(), options.filters],
		queryFn: async () => {
			const url = appendQueryParamsToUrl(urls.api.apollo.index, options.filters);
			const response = await _fetch(url);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to _fetch contacts');
			}

			return response.json() as Promise<Contact[]>;
		},
		enabled: options.enabled === undefined ? true : options.enabled,
	});
};
