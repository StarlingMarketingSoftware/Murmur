import { stripe } from '@/lib/stripe/client';
import { NextRequest, NextResponse } from 'next/server';

interface PortalRequest {
	customerId: string;
}

interface PortalRequest {
	customerId: string;
}

export async function POST(
	req: NextRequest
): Promise<NextResponse<{ url: string }> | NextResponse<{ error: string }>> {
	console.log('portal route');
	try {
		const body = (await req.json()) as PortalRequest;

		const session = await stripe.billingPortal.sessions.create({
			customer: body.customerId,
			return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/products`,
		});

		return NextResponse.json({ url: session.url });
	} catch (error) {
		console.error('Error creating portal session:', error);
		return NextResponse.json(
			{ error: 'Failed to create portal session' },
			{ status: 500 }
		);
	}
}
