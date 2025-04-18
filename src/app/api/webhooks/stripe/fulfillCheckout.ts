import { stripe } from '../../../../stripe/client';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { getSubscriptionTierWithPriceId } from '@/lib/utils';
import { calcAiCredits } from './calcAiCredits';
import { getTestEmailCount } from '@/app/utils/functions';

const prisma = new PrismaClient();
type StripeSubscription = Stripe.Subscription;
export async function fulfillCheckout(
	subscription: StripeSubscription,
	sessionId: string
) {
	try {
		// Retrieve the Checkout Session from the API with line_items expanded
		const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
			expand: ['line_items', 'subscription'],
		});

		if (!checkoutSession) {
			throw Error('Checkout session could not be retrieved.');
		}

		// if checkoutSession.metadata.userId does not exist, look in the product for the userId

		const priceId = subscription.items.data[0].price.id;
		const subscriptionTier = getSubscriptionTierWithPriceId(priceId);

		const aiDraftCredits = await calcAiCredits(subscriptionTier, priceId);

		if (checkoutSession.payment_status !== 'unpaid') {
			const customerId = checkoutSession.customer as string;

			const customer = await prisma.user.update({
				where: {
					clerkId: checkoutSession?.metadata?.userId,
				},
				data: {
					stripeCustomerId: customerId,
					stripeSubscriptionId: subscription.id,
					stripePriceId: priceId,
					stripeSubscriptionStatus: subscription.status,
					aiDraftCredits: {
						increment: aiDraftCredits,
					},
					aiTestCredits: {
						increment: getTestEmailCount(aiDraftCredits),
					},
				},
			});

			console.log(`Successfully fulfilled checkout session ${sessionId}`);
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
