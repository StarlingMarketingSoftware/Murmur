import { useQuery } from '@tanstack/react-query';
import { getStripeProduct } from '@/services/stripe';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { StripeProduct } from '@/types';

const QUERY_KEYS = {
	all: ['stripeProducts'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export const useStripeProducts = () => {
	return useQuery({
		queryKey: ['stripeProducts'],
		queryFn: async (): Promise<StripeProduct[]> => {
			const response = await _fetch(urls.api.stripe.products.index);
			if (!response.ok) {
				throw new Error('Failed to fetch products');
			}
			return response.json();
		},
	});
};

export const useGetStripeProduct = (productId: string) => {
	return useQuery({
		queryKey: QUERY_KEYS.detail(productId),
		queryFn: () => getStripeProduct(productId),
		enabled: !!productId,
	});
};
