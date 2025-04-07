import { useQuery } from '@tanstack/react-query';
import { getStripeProduct } from '@/services/stripe';

export const useStripeProduct = (productId: string) => {
	return useQuery({
		queryKey: ['product', productId],
		queryFn: () => getStripeProduct(productId),
		enabled: !!productId,
	});
};
