import { auth } from '@clerk/nextjs/server';
import { stripe } from '../../../../stripe/client';
import Stripe from 'stripe';
import { getUser } from '@/app/utils/data/users/getUser';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiServerError,
	apiUnauthorized,
	handleApiError,
} from '@/app/utils/api';

export async function POST(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const user = await getUser();
		if (!user) {
			return apiNotFound('User not found');
		}

		const { priceId } = await req.json();
		if (!priceId) {
			return apiBadRequest('Price ID is required');
		}

		if (!user.stripeCustomerId) {
			return apiServerError('User does not have a Stripe customer ID');
		}

		const subscriptions = await stripe.subscriptions.list({
			customer: user.stripeCustomerId,
			status: 'active',
			limit: 1,
		});

		const currentSubscription = subscriptions.data[0];

		if (!currentSubscription) {
			return apiServerError('No active subscription found');
		}

		const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

		const session: Stripe.Response<Stripe.Checkout.Session> =
			await stripe.checkout.sessions.create({
				customer: user.stripeCustomerId,
				payment_method_types: ['card'],
				line_items: [
					{
						price: priceId,
						quantity: 1,
					},
				],
				mode: 'subscription',
				success_url: `${baseUrl}/pricing?success=true`,
				cancel_url: `${baseUrl}/pricing?canceled=true`,
			});

		return apiResponse({ url: session.url });
	} catch (error) {
		return handleApiError(error);
	}
}
