import { urls } from '@/constants/urls';

export const getStripeProduct = async (productId: string) => {
	const response = await fetch(urls.api.stripe.products.detail(productId));
	if (!response.ok) {
		throw new Error('Failed to fetch product');
	}
	return response.json();
};
