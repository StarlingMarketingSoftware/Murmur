import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { useQuery } from '@tanstack/react-query';
import { Stripe } from 'stripe';

const QUERY_KEYS = {
	all: ['stripePrices'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export const useGetStripePrice = (priceId: string) => {
	return useQuery<Stripe.Price>({
		queryKey: QUERY_KEYS.detail(priceId),
		queryFn: async () => {
			const response = await _fetch(urls.api.stripe.prices.detail(priceId));
			if (!response.ok) {
				throw new Error('Failed to fetch price');
			}
			return response.json();
		},
	});
};
