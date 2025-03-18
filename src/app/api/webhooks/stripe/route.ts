import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { prisma } from '@/lib/prisma/client';
import { fulfillCheckout } from '@/utils/stripe';

export async function POST(req: Request) {
	const body = await req.text();
	const headersList = await headers();
	console.log('!!!!!!!!!');
	const signature = headersList.get('stripe-signature') || '';

	if (!process.env.STRIPE_WEBHOOK_SECRET) {
		console.error('Missing STRIPE_WEBHOOK_SECRET');
		return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
	}

	let event: Stripe.Event;

	try {
		// Verify the webhook signature
		event = stripe.webhooks.constructEvent(
			body,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET
		);
	} catch (error: any) {
		console.error(`Webhook signature verification failed: ${error.message}`);
		return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
	}

	console.log(`Event type: ${event.type}`);

	try {
		if (event.type === 'checkout.session.completed') {
			console.log('checkout.session.completed');
			const session = event.data.object as Stripe.Checkout.Session;

			// Find existing active subscription
			const existingSubscription = await prisma.subscription.findFirst({
				where: {
					userId: session.metadata?.userId,
					status: 'active',
				},
			});
			console.log('🚀 ~ POST ~ existingSubscription:', existingSubscription);

			if (existingSubscription) {
				console.log(
					`Canceling existing subscription: ${existingSubscription.stripeSubscriptionId}`
				);

				// Cancel in Stripe
				await stripe.subscriptions.update(existingSubscription.stripeSubscriptionId, {
					cancel_at_period_end: true,
				});

				// Update our database
				await prisma.subscription.update({
					where: { id: existingSubscription.id },
					data: {
						status: 'canceling',
						cancelAtPeriodEnd: false,
					},
				});
			}

			// Create new subscription
			const newSubscription = await stripe.subscriptions.retrieve(
				session.subscription as string
			);
			await fulfillCheckout(newSubscription, session.id);
		} else if (event.type === 'customer.subscription.deleted') {
			const subscription = event.data.object as Stripe.Subscription;

			// Delete the subscription from the database
			await prisma.subscription.delete({
				where: {
					stripeSubscriptionId: subscription.id,
				},
			});

			console.log(`Subscription deleted: ${subscription.id}`);
		} else {
			// console.log(`Unhandled event type: ${event.type}`);
			console.log('unhandled event type');
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error(`Error processing webhook: ${error}`);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
