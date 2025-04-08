import { stripe } from '@/stripe/client';
import { NextResponse } from 'next/server';

export async function GET() {
	try {
		const products = await stripe.products.list({
			active: true,
		});

		return NextResponse.json(products.data);
	} catch (error) {
		console.error('Error fetching Stripe products:', error);
		return NextResponse.json([], { status: 500 });
	}
}
