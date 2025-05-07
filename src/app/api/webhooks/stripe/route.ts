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
	let event: Stripe.Event;

	if (!process.env.STRIPE_WEBHOOK_SECRET) {
		return NextResponse.json(
			{ error: 'Missing Stripe webhook secret.' },
			{ status: 500 }
		);
	}

	try {
		event = stripe.webhooks.constructEvent(
			body,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET
		);
	} catch {
		return NextResponse.json(
			{ error: 'Invalid stripe webhook signature.' },
			{ status: 400 }
		);
	}

	try {
		if (event.type === 'checkout.session.completed') {
			const session = event.data.object as Stripe.Checkout.Session;
			const newSubscription = await stripe.subscriptions.retrieve(
				session.subscription as string
			);

			const customer = await fulfillCheckout(newSubscription, session.id);
			return NextResponse.json({ customer }, { status: 200 });
		} else if (event.type === 'customer.subscription.updated') {
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
			} catch {
				return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
			}
		} else if (event.type === 'customer.subscription.deleted') {
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
			} catch {
				return NextResponse.json(
					{ error: 'Failed to update user subscription status' },
					{ status: 500 }
				);
			}
		} else {
			return NextResponse.json({ error: 'Unhandled event type' }, { status: 400 });
		}
	} catch {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
