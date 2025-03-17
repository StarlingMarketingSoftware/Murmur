import Stripe from 'stripe';
import { stripe } from './client';

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