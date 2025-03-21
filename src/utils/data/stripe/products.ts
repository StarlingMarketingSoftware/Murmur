import Stripe from 'stripe';
import { stripe } from '../../../stripe/client';

export interface StripeProduct extends Stripe.Product {
	default_price: Stripe.Price;
}

export async function getStripeProductsServer(): Promise<StripeProduct[]> {
	try {
		const products = await stripe.products.list({
			active: true,
		});

		return products.data as StripeProduct[];
	} catch (error) {
		console.error('Error fetching Stripe products:', error);
		return [];
	}
}

export async function getStripePriceServer(productId: string): Promise<Stripe.Price[]> {
	try {
		const prices = await stripe.prices.list({
			product: productId,
		});

		return prices.data;
	} catch (error) {
		console.error('Error fetching Stripe prices:', error);
		return [];
	}
}

export const handlePortalAccess = async (stripeCustomerId: string) => {
	try {
		const response = await fetch('/api/create-portal-session', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ customerId: stripeCustomerId }),
		});

		const { url } = await response.json();
		window.location.href = url;
	} catch (error) {
		console.error('Error accessing customer portal:', error);
	}
};
