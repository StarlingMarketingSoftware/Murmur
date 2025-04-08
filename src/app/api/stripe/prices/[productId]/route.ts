import { stripe } from '@/stripe/client';
import { NextResponse } from 'next/server';

export async function GET(
	request: Request,
	{ params }: { params: { productId: string } }
) {
	const { productId } = await params;
	try {
		const prices = await stripe.prices.list({
			product: productId,
			active: true,
		});
		return NextResponse.json(prices.data);
	} catch (error) {
		console.error('Error fetching price:', error);
		return NextResponse.json([], { status: 500 });
	}
}
