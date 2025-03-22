import { stripe } from '../../../stripe/client';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

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

		if (checkoutSession.payment_status !== 'unpaid') {
			const customerId = checkoutSession.customer as string;

			const customer = await prisma.user.update({
				where: {
					clerkId: checkoutSession?.metadata?.userId,
				},
				data: {
					stripeCustomerId: customerId,
					stripeSubscriptionId: subscription.id,
					stripePriceId: subscription.items.data[0].price.id,
					stripeSubscriptionStatus: subscription.status,
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
