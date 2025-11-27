import { InboundEmailFilterData } from '@/app/api/inbound/route';
import { _fetch } from '@/utils';
import { appendQueryParamsToUrl } from '@/utils';
import { CustomQueryOptions, InboundEmailWithRelations } from '@/types';
import { urls } from '@/constants/urls';
import { useQuery } from '@tanstack/react-query';

export const INBOUND_EMAIL_QUERY_KEYS = {
	all: ['inboundEmails'] as const,
	list: () => [...INBOUND_EMAIL_QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) =>
		[...INBOUND_EMAIL_QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export interface InboundEmailQueryOptions extends CustomQueryOptions {
	filters?: InboundEmailFilterData;
}

export const useGetInboundEmails = (options: InboundEmailQueryOptions = {}) => {
	return useQuery({
		queryKey: [...INBOUND_EMAIL_QUERY_KEYS.list(), options.filters],
		queryFn: async () => {
			const url = appendQueryParamsToUrl(urls.api.inboundEmails.index, options.filters);
			const response = await _fetch(url);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to fetch inbound emails');
			}

			return response.json() as Promise<InboundEmailWithRelations[]>;
		},
		enabled: options.enabled,
	});
};

