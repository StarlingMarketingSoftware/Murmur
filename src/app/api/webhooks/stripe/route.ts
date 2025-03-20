import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '../../../../../stripe/client';
import { prisma } from '../../../../../prisma/client';
import { fulfillCheckout } from '@/utils/actions/stripe/fulfillCheckout';

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
			const newSubscription = await stripe.subscriptions.retrieve(
				session.subscription as string
			);

			// const existingSubscription = await stripe.subscriptions.retrieve({
			// 	customer: newSubscription.customer as string,
			// })

			// if (existingSubscription) {
			// 	return NextResponse.json({ error: 'Subscription already exists' }, { status: 400 });
			// }

			await fulfillCheckout(newSubscription, session.id);
		} else if (event.type === 'customer.subscription.updated') {
			console.log('subscription updated');
			const subscription: Stripe.Subscription = event.data.object;

			try {
				await prisma.user.update({
					where: {
						stripeCustomerId: subscription.customer as string,
					},
					data: {
						stripeSubscriptionStatus: subscription.status,
						stripeSubscriptionId: subscription.id,
						stripePriceId: subscription.items.data[0].price.id,
					},
				});
			} catch (error) {
				console.error('Error updating user:', error);
				return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
			}
		}
	} catch (error) {
		console.error(`Error processing webhook: ${error}`);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
