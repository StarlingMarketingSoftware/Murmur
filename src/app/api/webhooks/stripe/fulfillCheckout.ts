import { stripe } from '../../../../stripe/client';
import Stripe from 'stripe';
import { getSubscriptionTierWithPriceId } from '@/utils';
import prisma from '@/lib/prisma';

type StripeSubscription = Stripe.Subscription;
export async function fulfillCheckout(
	subscription: StripeSubscription,
	sessionId: string
) {
	try {
		const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
			expand: ['line_items', 'subscription'],
		});

		if (!checkoutSession) {
			throw Error('Checkout session could not be retrieved.');
		}

		const priceId = subscription.items.data[0].price.id;
		const subscriptionTier = getSubscriptionTierWithPriceId(priceId);

		if (checkoutSession.payment_status !== 'unpaid') {
			const customerId = checkoutSession.customer as string;

			const customer = await prisma.user.update({
				where: {
					stripeCustomerId: customerId,
				},
				data: {
					stripeCustomerId: customerId,
					stripeSubscriptionId: subscription.id,
					stripePriceId: priceId,
					stripeSubscriptionStatus: subscription.status,
					lastCreditUpdate: new Date(),
					draftCredits: subscriptionTier?.draftCredits || 0,
					sendingCredits: subscriptionTier?.sendingCredits || 0,
					verificationCredits: subscriptionTier?.verificationCredits || 0,
				},
			});
			return customer;
		} else {
			console.log(
				`Payment for session ${sessionId} is still unpaid. Skipping fulfillment.`
			);
		}
	} catch (error) {
		console.error(`Error fulfilling checkout session ${sessionId}:`, error);
		throw error;
	}
}
