import { useQuery } from '@tanstack/react-query';
import { Stripe } from 'stripe';

export const useStripePrice = (productId: string) => {
	return useQuery({
		queryKey: ['stripePrice', productId],
		queryFn: async (): Promise<Stripe.Price[]> => {
			const response = await fetch(`/api/stripe/prices/${productId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch price');
			}
			return response.json();
		},
	});
};
