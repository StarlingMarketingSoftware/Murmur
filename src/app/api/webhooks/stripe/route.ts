import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { prisma } from '@/lib/prisma/client';
import { fulfillCheckout } from '@/utils/stripe';

export async function POST(req: Request) {
	const body = await req.text();
	const headersList = await headers();

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

	try {
		if (
			event.type === 'checkout.session.completed' ||
			event.type === 'checkout.session.async_payment_succeeded'
		) {
			const session = event.data.object as Stripe.Checkout.Session;

			const subscription = await stripe.subscriptions.retrieve(
				session.subscription as string
			);
			await fulfillCheckout(subscription, session.id); // This will be a cs_ id
		} else if (event.type === 'customer.subscription.updated') {
			const subscription = event.data.object as Stripe.Subscription;

			// Update the subscription in the database
			await prisma.subscription.update({
				where: {
					stripeSubscriptionId: subscription.id,
				},
				data: {
					status: subscription.status,
					currentPeriodStart: new Date(subscription.current_period_start * 1000),
					currentPeriodEnd: new Date(subscription.current_period_end * 1000),
				},
			});

			console.log(`Subscription updated: ${subscription.id}`);
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
