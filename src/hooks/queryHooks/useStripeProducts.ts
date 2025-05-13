import { StripeProduct } from '@/app/utils/data/stripe/products';
import { useQuery } from '@tanstack/react-query';
import { getStripeProduct } from '@/services/stripe';
import { _fetch } from '@/app/utils/api';

const QUERY_KEYS = {
	all: ['stripeProducts'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export const useStripeProducts = () => {
	return useQuery({
		queryKey: ['stripeProducts'],
		queryFn: async (): Promise<StripeProduct[]> => {
			const response = await _fetch('/api/stripe/products');
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
