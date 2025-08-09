import { auth } from '@clerk/nextjs/server';
import { stripe } from '../../../../stripe/client';
import Stripe from 'stripe';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiServerError,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { z } from 'zod';
import { getUser } from '../../_utils';
import { urls } from '@/constants/urls';
import { BASE_URL } from '@/constants';

const stripeCheckoutRequestSchema = z.object({
	priceId: z.string().min(1),
	freeTrial: z.boolean().optional(),
});

export type PostCheckoutSessionData = z.infer<typeof stripeCheckoutRequestSchema>;

export async function POST(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await req.json();
		const validatedData = stripeCheckoutRequestSchema.safeParse(data);

		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { priceId, freeTrial } = validatedData.data;
		if (!priceId) {
			return apiBadRequest('Price ID is required');
		}

		const user = await getUser();
		if (!user) {
			return apiNotFound('User not found');
		}
		if (!user.stripeCustomerId) {
			return apiServerError('User does not have a Stripe customer ID');
		}

		const session: Stripe.Response<Stripe.Checkout.Session> =
			await stripe.checkout.sessions.create({
				payment_method_types: ['card'],
				customer: user.stripeCustomerId,
				line_items: [
					{
						price: priceId,
						quantity: 1,
					},
				],
				mode: 'subscription',
				success_url: `${BASE_URL}${urls.murmur.dashboard.index}?success=true`,
				cancel_url: `${BASE_URL}${urls.murmur.dashboard.index}?canceled=true`,
				allow_promotion_codes: true,
				subscription_data: freeTrial
					? {
							trial_period_days: 7,
					  }
					: undefined,
			});

		return apiResponse({ url: session.url });
	} catch (error) {
		return handleApiError(error);
	}
}
