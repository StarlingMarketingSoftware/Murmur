import { stripe } from '../../../../stripe/client';
import Stripe from 'stripe';
import { getSubscriptionTierWithPriceId } from '@/utils';
import prisma from '@/lib/prisma';
import { StripeSubscriptionStatus } from '@/types';

type StripeSubscription = Stripe.Subscription;
export async function fulfillCheckout(
	promoCodeId: string,
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
		const isFreeTrial = subscription.status === StripeSubscriptionStatus.TRIALING;

		if (checkoutSession.payment_status !== 'unpaid') {
			const customerId = checkoutSession.customer as string;

			const customer = await prisma.user.update({
				where: {
					stripeCustomerId: customerId,
				},
				data: {
					stripeSubscriptionId: subscription.id,
					stripePriceId: priceId,
					stripeSubscriptionStatus: subscription.status,
					lastCreditUpdate: new Date(),
					stripePromoCode: promoCodeId,
					draftCredits: isFreeTrial
						? subscriptionTier?.trialDraftCredits || 0
						: subscriptionTier?.draftCredits || 0,
					sendingCredits:
						subscriptionTier && !isFreeTrial ? subscriptionTier.sendingCredits : 0,
					verificationCredits:
						subscriptionTier && !isFreeTrial ? subscriptionTier.verificationCredits : 0,
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
