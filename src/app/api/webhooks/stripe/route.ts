import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { prisma } from '@/lib/prisma/client';
import { fulfillCheckout } from '@/utils/stripe';
import { Product } from '@prisma/client';

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
			const newSubscription = await stripe.subscriptions.retrieve(
				session.subscription as string
			);

			const existingSubscription = await prisma.subscription.findFirst({
				where: {
					userClerkId: session.metadata?.userId,
					status: 'active',
				},
			});
			console.log('🚀 ~ POST ~ existingSubscription:', existingSubscription);

			if (existingSubscription) {
				console.log(
					`Canceling existing subscription: ${existingSubscription.stripeSubscriptionId}`
				);

				// check if it's a upgrade or downgrade?
				// compare current subscription price with new subscription price
				// if it's a downgrade, we need to add a discount based on remaining amount for current month.

				const currentSubscriptionPriceId: string = existingSubscription.stripePriceId;

				const currentSubscriptionPrice: Product = await prisma.product.findUniqueOrThrow({
					where: {
						stripePriceId: currentSubscriptionPriceId,
					},
				});
				const newSubscriptionPriceId: string = newSubscription.items.data[0].price.id;
				const newSubscriptionPrice: Product = await prisma.product.findUniqueOrThrow({
					where: {
						stripePriceId: newSubscriptionPriceId,
					},
				});

				const isUpgrade =
					newSubscriptionPrice.unit_amount! > currentSubscriptionPrice.unit_amount!;

				console.log('🚀 ~ POST ~ isUpgrade:', isUpgrade);

				// Cancel in Stripe, you need to add a discount based on remaining amount for current month.
				const cancelledSubscription: Stripe.Subscription =
					await stripe.subscriptions.update(existingSubscription.stripeSubscriptionId, {
						cancel_at_period_end: false,
					});

				// Update our database
				await prisma.subscription.update({
					where: { id: existingSubscription.id },
					data: {
						status: cancelledSubscription.status,
						cancelAtPeriodEnd: cancelledSubscription.cancel_at_period_end,
					},
				});
			}

			// Create new subscription
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
		} else if (event.type === 'product.created' || event.type === 'product.updated') {
			const product = event.data.object as Stripe.Product;
			if (!product.default_price) {
				throw Error(
					'A default_price id for the product could not be found. Make sure to set this value for every product.'
				);
			}

			const price = await stripe.prices.retrieve(product.default_price as string);

			if (!price.unit_amount) {
				throw Error('Price unit amount could not be retrieved based on the given id.');
			}

			await prisma.product.upsert({
				where: { stripeProductId: product.id },
				update: {
					name: product.name,
					description: product.description || '',
					price: price.unit_amount,
				},

				create: {
					stripeProductId: product.id,
					stripePriceId: product.default_price as string,
					price: price.unit_amount,
					name: product.name,
					description: product.description || '',
				},
			});
		} else if (event.type === 'product.deleted') {
			const product = event.data.object as Stripe.Product;

			await prisma.product.delete({
				where: { stripeProductId: product.id },
			});
		} else {
			console.log('unhandled event type');
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error(`Error processing webhook: ${error}`);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
