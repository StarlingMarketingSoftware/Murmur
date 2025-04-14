import { stripe } from '@/stripe/client';
import { NextRequest, NextResponse } from 'next/server';

interface UpdateSubscriptionPortalRequest {
	customerId: string;
	productId: string;
	priceId: string;
}

export async function POST(
	req: NextRequest
): Promise<NextResponse<{ url: string }> | NextResponse<{ error: string }>> {
	const body = (await req.json()) as UpdateSubscriptionPortalRequest;

	const { customerId, productId, priceId } = body;

	// const prices = await stripe.prices.list({
	// 	product: productId,
	// 	active: true,
	// });
	// const product = await stripe.products.retrieve(productId);

	try {
		// 1. Dynamically create a portal configuration (or reuse a cached one)
		const portalConfig = await stripe.billingPortal.configurations.create({
			business_profile: {
				headline: 'Manage Your Subscription',
			},
			features: {
				subscription_update: {
					enabled: true,
					default_allowed_updates: ['price'],
					products: [
						{
							product: productId,
							prices: [priceId],
						},
					],
				},
				payment_method_update: {
					enabled: true,
				},

				invoice_history: {
					enabled: true, // Optional: Allow viewing invoices
				},
			},
		});

		// 2. Create a portal session with this configuration
		const portalSession = await stripe.billingPortal.sessions.create({
			customer: customerId,
			configuration: portalConfig.id, // Use the restricted config
			return_url: `http://localhost:3000/pricing`, // Redirect after portal
		});

		return NextResponse.json({ url: portalSession.url });
	} catch (err) {
		console.error(err);
		return NextResponse.json({ error: 'Failed to create portal session' });
	}
}
