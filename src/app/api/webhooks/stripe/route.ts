import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '../../../../stripe/client';
import prisma from '@/lib/prisma';
import { fulfillCheckout } from '@/app/api/webhooks/stripe/fulfillCheckout';
import { getSubscriptionTierWithPriceId } from '@/lib/utils';
import { getTestEmailCount } from '@/app/utils/calculations';
import { calcAiCredits } from './calcAiCredits';
import {
	apiBadRequest,
	apiResponse,
	apiServerError,
	handleApiError,
} from '@/app/utils/api';

export async function POST(req: Request) {
	const body = await req.text();
	const headersList = await headers();
	const signature = headersList.get('stripe-signature') || '';
	let event: Stripe.Event;

	if (!process.env.STRIPE_WEBHOOK_SECRET) {
		return apiServerError('Missing Stripe webhook secret.');
	}

	try {
		event = stripe.webhooks.constructEvent(
			body,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET
		);
	} catch {
		return apiBadRequest('Invalid stripe webhook signature.');
	}

	try {
		if (event.type === 'checkout.session.completed') {
			const session = event.data.object as Stripe.Checkout.Session;
			const newSubscription = await stripe.subscriptions.retrieve(
				session.subscription as string
			);
			const customer = await fulfillCheckout(newSubscription, session.id);

			return apiResponse(customer);
		} else if (event.type === 'customer.subscription.updated') {
			try {
				const subscription: Stripe.Subscription = event.data.object;
				const priceId = subscription.items.data[0].price.id;
				const subscriptionTier = getSubscriptionTierWithPriceId(priceId);
				const aiDraftCredits = await calcAiCredits(subscriptionTier, priceId);

				const res = await prisma.user.update({
					where: {
						stripeCustomerId: subscription.customer as string,
					},
					data: {
						stripeSubscriptionStatus: subscription.status,
						stripeSubscriptionId: subscription.id,
						stripePriceId: priceId,
						aiDraftCredits: {
							increment: aiDraftCredits,
						},
						aiTestCredits: {
							increment: getTestEmailCount(aiDraftCredits),
						},
					},
				});
				return apiResponse(res);
			} catch {
				return apiServerError('Failed to update user');
			}
		} else if (event.type === 'customer.subscription.deleted') {
			const subscription: Stripe.Subscription = event.data.object;
			try {
				const res = await prisma.user.update({
					where: {
						stripeCustomerId: subscription.customer as string,
					},
					data: {
						stripeSubscriptionStatus: subscription.status,
						stripeSubscriptionId: null,
						stripePriceId: null,
						aiDraftCredits: 0,
						aiTestCredits: 0,
					},
				});

				return apiResponse(res);
			} catch (e) {
				if (e instanceof Error) {
					console.error('Error updating user subscription status:', e.message);
				}

				return apiServerError('Failed to update user subscription status');
			}
		} else {
			return apiBadRequest('Unhandled event type');
		}
	} catch (error) {
		return handleApiError(error);
	}
}
