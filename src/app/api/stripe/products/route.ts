import { apiResponse, handleApiError } from '@/app/api/_utils';
import { stripe } from '@/stripe/client';
import { StripeProduct } from '@/types';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

type StripeProductsGetSuccessResponse = StripeProduct[];

export async function GET(): Promise<NextResponse> {
	try {
		const products: Stripe.ApiList<Stripe.Product> = await stripe.products.list({
			active: true,
		});

		const pricesQuery = products.data.map((p) => `product:'${p.id}'`).join(' OR ');
		const prices: Stripe.ApiSearchResult<Stripe.Price> = await stripe.prices.search({
			query: pricesQuery,
			limit: 100,
		});

		const productsWithPrices: StripeProduct[] = products.data.map((product) => ({
			...product,
			prices: prices.data.filter((price) => price.product === product.id),
		}));

		return apiResponse<StripeProductsGetSuccessResponse>(productsWithPrices);
	} catch (error) {
		return handleApiError(error);
	}
}
