import { auth } from '@clerk/nextjs/server';
import { stripe } from '../../../../stripe/client';
import Stripe from 'stripe';
import {
	apiBadRequest,
	apiResponse,
	apiServerError,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { z } from 'zod';
import { getUser, provisionLocalUser } from '../../_utils';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import { urls } from '@/constants/urls';
import { BASE_URL } from '@/constants';
import prisma from '@/lib/prisma';
import { checkoutReturnPathSchema, getHostedCheckoutCancelPath } from './returnPaths';

const stripeCheckoutRequestSchema = z.object({
	priceId: z.string().min(1),
	isYearly: z.boolean().optional(),
	freeTrial: z.boolean().optional(),
	uiMode: z.enum(['embedded', 'hosted']).optional(),
	cancelPath: checkoutReturnPathSchema.optional(),
});

export type PostCheckoutSessionData = z.infer<typeof stripeCheckoutRequestSchema>;

export async function POST(req: Request) {
	try {
		const limited = await withRateLimit(req, 'paid-external', 'stripe-checkout');
		if (limited) return limited;

		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await req.json();
		const validatedData = stripeCheckoutRequestSchema.safeParse(data);

		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { priceId, freeTrial, isYearly, uiMode, cancelPath } = validatedData.data;
		if (!priceId) {
			return apiBadRequest('Price ID is required');
		}

		let user = await getUser();
		if (!user) {
			// Clerk webhook hasn't provisioned the local user yet (e.g. local dev
			// without ngrok, or webhook lag right after sign-up) — provision on demand.
			user = await provisionLocalUser(userId);
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

		const isEmbedded = uiMode === 'embedded';
		const hostedCheckoutCancelPath = getHostedCheckoutCancelPath(cancelPath);

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
				...(isEmbedded
					? {
							ui_mode: 'embedded' as const,
							return_url: `${BASE_URL}${urls.murmur.dashboard.index}?session_id={CHECKOUT_SESSION_ID}`,
					  }
					: {
							success_url: `${BASE_URL}${urls.murmur.dashboard.index}?session_id={CHECKOUT_SESSION_ID}`,
							cancel_url: `${BASE_URL}${hostedCheckoutCancelPath}`,
					  }),
				allow_promotion_codes: true,
				subscription_data: freeTrial
					? {
							trial_period_days: 7,
					  }
					: undefined,
			});

		if (isEmbedded) {
			if (!session.client_secret) {
				return apiServerError('Stripe did not return a client secret for embedded checkout');
			}
			return apiResponse({ clientSecret: session.client_secret });
		}

		return apiResponse({ url: session.url });
	} catch (error) {
		return handleApiError(error);
	}
}
