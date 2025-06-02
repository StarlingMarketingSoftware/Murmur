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

const stripeCheckoutRequestSchema = z.object({
	priceId: z.string().min(1),
});

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

		const { priceId } = validatedData.data;
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

		const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
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
				success_url: `${baseUrl}/pricing?success=true`,
				cancel_url: `${baseUrl}/pricing?canceled=true`,
			});

		return apiResponse({ url: session.url });
	} catch (error) {
		return handleApiError(error);
	}
}
