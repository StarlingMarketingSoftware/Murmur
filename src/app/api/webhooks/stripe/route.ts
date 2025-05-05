import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '../../../../stripe/client';
import prisma from '@/lib/prisma';
import { fulfillCheckout } from '@/app/api/webhooks/stripe/fulfillCheckout';
import { getSubscriptionTierWithPriceId } from '@/lib/utils';
import { getTestEmailCount } from '@/app/utils/calculations';
import { calcAiCredits } from './calcAiCredits';

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
		event = stripe.webhooks.constructEvent(
			body,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET
		);
	} catch (error) {
		if (error instanceof Error) {
			console.error(`Webhook signature verification failed: ${error.message}`);
		}
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

			const customer = await fulfillCheckout(newSubscription, session.id);
			return NextResponse.json({ customer }, { status: 200 });
		} else if (event.type === 'customer.subscription.updated') {
			console.log('subscription updated');
			const subscription: Stripe.Subscription = event.data.object;
			const priceId = subscription.items.data[0].price.id;
			const subscriptionTier = getSubscriptionTierWithPriceId(priceId);

			const aiDraftCredits = await calcAiCredits(subscriptionTier, priceId);

			try {
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

				return NextResponse.json({ res }, { status: 200 });
			} catch (error) {
				console.error('Error updating user:', error);
				return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
			}
		} else if (event.type === 'customer.subscription.deleted') {
			console.log('subscription deleted');
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

				return NextResponse.json({ res }, { status: 200 });
			} catch (error) {
				console.error('Error updating user subscription deletion:', error);
				return NextResponse.json(
					{ error: 'Failed to update user subscription status' },
					{ status: 500 }
				);
			}
		} else if (event.type === 'invoice.paid') {
			return;
			const invoice = event.data.object as Stripe.Invoice;
			console.log('Invoice paid:', invoice.id);

			// Only handle subscription renewal invoices
			if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
				const priceId = invoice.lines.data[0].price?.id;
				if (!priceId) {
					console.error('No price ID found in invoice');
					return NextResponse.json({ error: 'No price ID found' }, { status: 400 });
				}

				const subscriptionTier = getSubscriptionTierWithPriceId(priceId);

				try {
					// Use a transaction to ensure data consistency
					const updatedUser = await prisma.$transaction(async (tx) => {
						// Get the latest user data within the transaction
						const currentUser = await tx.user.findUnique({
							where: {
								stripeCustomerId: invoice.customer as string,
							},
							select: {
								id: true,
								aiDraftCredits: true,
							},
						});

						if (!currentUser) {
							throw new Error('User not found');
						}

						console.log('Current credits before update:', currentUser.aiDraftCredits);
						console.log('Adding credits:', subscriptionTier?.aiEmailCount);

						// Perform the update within the transaction
						return await tx.user.update({
							where: {
								id: currentUser.id, // Use the primary key for better performance
							},
							data: {
								aiDraftCredits: {
									increment: subscriptionTier?.aiEmailCount,
								},
							},
							select: {
								aiDraftCredits: true,
							},
						});
					});

					console.log('Final credits after update:', updatedUser.aiDraftCredits);
					return NextResponse.json(
						{ status: 'subscription renewed', credits: updatedUser.aiDraftCredits },
						{ status: 200 }
					);
				} catch (error) {
					console.error('Error updating renewal:', error);
					return NextResponse.json(
						{ error: 'Failed to update renewal' },
						{ status: 500 }
					);
				}
			}
		} else {
			return NextResponse.json({ error: 'Unhandled event type' }, { status: 400 });
		}
	} catch (error) {
		console.error(`Error processing webhook: ${error}`);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
