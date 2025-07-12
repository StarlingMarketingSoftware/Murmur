import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '../../../../stripe/client';
import prisma from '@/lib/prisma';
import { fulfillCheckout } from '@/app/api/webhooks/stripe/fulfillCheckout';
import { getSubscriptionTierWithPriceId } from '@/utils';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiServerError,
	handleApiError,
} from '@/app/api/_utils';

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

				const user = await prisma.user.findFirst({
					where: {
						stripeCustomerId: subscription.customer as string,
					},
				});

				if (!user) {
					return apiNotFound(
						'Subscription failed to update. Stripe customer ID does not exist in the database.'
					);
				}

				const res = await prisma.user.update({
					where: {
						stripeCustomerId: subscription.customer as string,
					},
					data: {
						stripeSubscriptionStatus: subscription.status,
						stripeSubscriptionId: subscription.id,
						stripePriceId: priceId,
						draftCredits: subscriptionTier?.draftCredits || 0,
						sendingCredits: subscriptionTier?.sendingCredits || 0,
						verificationCredits: subscriptionTier?.verificationCredits || 0,
						lastCreditUpdate: new Date(),
					},
				});
				return apiResponse(res);
			} catch {
				return apiServerError('Failed to update user');
			}
		} else if (event.type === 'customer.subscription.deleted') {
			const subscription: Stripe.Subscription = event.data.object;
			try {
				const user = await prisma.user.findFirst({
					where: {
						stripeCustomerId: subscription.customer as string,
					},
				});

				if (!user) {
					return apiResponse('User not found for the given Stripe customer ID');
				}

				const res = await prisma.user.update({
					where: {
						stripeCustomerId: subscription.customer as string,
					},
					data: {
						stripeSubscriptionStatus: subscription.status,
						stripeSubscriptionId: null,
						stripePriceId: null,
						draftCredits: 0,
						sendingCredits: 0,
						verificationCredits: 0,
						lastCreditUpdate: null,
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
			return apiResponse('Unhandled event type');
		}
	} catch (error) {
		return handleApiError(error);
	}
}
