import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '../../../stripe/client';
import Stripe from 'stripe';
import { getUser } from '@/utils/data/users/getUser';

export async function POST(req: Request) {
	try {
		const { userId } = await auth();
		const { priceId } = await req.json();

		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!priceId) {
			return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
		}

		const user = await getUser();

		if (!user || !user.stripeSubscriptionId) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		const existingSubscription = await stripe.subscriptions.retrieve(
			user.stripeSubscriptionId
		);

		let session: Stripe.Response<Stripe.Checkout.Session>;

		// Use a default base URL if NEXT_PUBLIC_APP_URL is not set
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

		if (existingSubscription) {
			return;

			// handle this somewhere
			session = await stripe.checkout.sessions.create({
				mode: 'subscription',
				payment_method_types: ['card'],
				customer: existingSubscription.stripeCustomerId,
				metadata: {
					userId,
					isUpgrade: 'true',
				},
				line_items: [
					{
						price: priceId,
						quantity: 1,
					},
				],
				subscription_data: {
					// Transfer any metadata from the existing subscription
					metadata: {
						previous_subscription: existingSubscription.stripeSubscriptionId,
					},
					// Prorate charges
				},
				// Redirect paths
				success_url: `${baseUrl}/dashboard?success=true`,
				cancel_url: `${baseUrl}/products?canceled=true`,
			});
		} else {
			// Create a checkout session
			session = await stripe.checkout.sessions.create({
				payment_method_types: ['card'],
				line_items: [
					{
						price: priceId,
						quantity: 1,
					},
				],
				mode: 'subscription',
				success_url: `${baseUrl}/dashboard?success=true`,
				cancel_url: `${baseUrl}/products?canceled=true`,
				metadata: {
					userId,
				},
			});
		}

		return NextResponse.json({ url: session.url });
	} catch (error) {
		console.error('Error creating checkout session:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
