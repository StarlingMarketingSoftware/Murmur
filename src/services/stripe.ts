export const getStripeProduct = async (productId: string) => {
	const response = await fetch(`/api/stripe/products/${productId}`);
	if (!response.ok) {
		throw new Error('Failed to fetch product');
	}
	return response.json();
};
