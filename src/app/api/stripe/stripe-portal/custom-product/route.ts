import { baseUrl } from '@/constants/constants';
import { urls } from '@/constants/urls';
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

	try {
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
					enabled: true,
				},
			},
		});

		const portalSession = await stripe.billingPortal.sessions.create({
			customer: customerId,
			configuration: portalConfig.id,
			return_url: `${baseUrl}${urls.pricing.path}/${productId}`,
		});

		return NextResponse.json({ url: portalSession.url });
	} catch (err) {
		console.error(err);
		return NextResponse.json({ error: 'Failed to create portal session' });
	}
}
