import { auth } from '@clerk/nextjs/server';
import { stripe } from '../../../../stripe/client';
import Stripe from 'stripe';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { z } from 'zod';
import { getUser } from '../../_utils';
import { urls } from '@/constants/urls';
import { BASE_URL } from '@/constants';
import prisma from '@/lib/prisma';

const stripeCheckoutRequestSchema = z.object({
	priceId: z.string().min(1),
	isYearly: z.boolean().optional(),
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

		const { priceId, freeTrial, isYearly } = validatedData.data;
		if (!priceId) {
			return apiBadRequest('Price ID is required');
		}

		const user = await getUser();
		if (!user) {
			return apiNotFound('User not found');
		}

		let stripeCustomerId = user.stripeCustomerId;

		// Create a Stripe customer if one doesn't exist
		if (!stripeCustomerId) {
			const customer = await stripe.customers.create({
				email: user.email,
				name: `${user.firstName} ${user.lastName}`.trim() || undefined,
				metadata: {
					clerkId: user.clerkId,
				},
			});
			stripeCustomerId = customer.id;

			// Update the user with the new Stripe customer ID
			await prisma.user.update({
				where: { id: user.id },
				data: { stripeCustomerId: customer.id },
			});
		}

		const payment_method_types = ['card'];

		if (isYearly) {
			payment_method_types.push('klarna');
		}

		const session: Stripe.Response<Stripe.Checkout.Session> =
			await stripe.checkout.sessions.create({
				payment_method_types:
					payment_method_types as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
				customer: stripeCustomerId,
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
