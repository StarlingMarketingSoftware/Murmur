import { StripeProduct } from '@/app/utils/data/stripe/products';
import { useQuery } from '@tanstack/react-query';

export const useStripeProducts = () => {
	return useQuery({
		queryKey: ['stripeProducts'],
		queryFn: async (): Promise<StripeProduct[]> => {
			const response = await fetch('/api/stripe/products');
			if (!response.ok) {
				throw new Error('Failed to fetch products');
			}
			return response.json();
		},
	});
};
