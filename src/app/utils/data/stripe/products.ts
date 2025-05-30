import Stripe from 'stripe';
import { stripe } from '../../../../stripe/client';

export interface StripeProduct extends Stripe.Product {
	default_price: Stripe.Price;
}

export async function getStripePrice(productId: string): Promise<Stripe.Price[]> {
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
