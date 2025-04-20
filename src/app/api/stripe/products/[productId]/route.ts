import { stripe } from '@/stripe/client';
import { NextResponse } from 'next/server';

type Params = Promise<{ productId: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
	const { productId } = await params;
	try {
		const product = await stripe.products.retrieve(productId);
		return NextResponse.json(product);
	} catch {
		return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
	}
}
