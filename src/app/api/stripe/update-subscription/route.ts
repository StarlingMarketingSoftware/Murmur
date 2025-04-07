import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '../../../../stripe/client';
import Stripe from 'stripe';
import { getUser } from '@/app/utils/data/users/getUser';

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

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		if (!user.stripeCustomerId) {
			return NextResponse.json(
				{ error: 'User does not have a Stripe customer ID' },
				{ status: 400 }
			);
		}

		const subscriptions = await stripe.subscriptions.list({
			customer: user.stripeCustomerId,
			status: 'active',
			limit: 1,
		});

		const currentSubscription = subscriptions.data[0];

		if (!currentSubscription) {
			return res.status(400).json({ error: 'No active subscription found' });
		}

		const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

		const session: Stripe.Response<Stripe.Checkout.Session> =
			await stripe.checkout.sessions.create({
				mode: 'subscription',
				customer: user.stripeCustomerId,
				payment_method_types: ['card'],
				line_items: [
					{
						price: priceId,
						quantity: 1,
					},
				],
				subscription_data: {
					metadata: {
						upgrading_from_sub: currentSubscription.id,
					},
					billing_cycle_anchor: 'now',
					proration_behavior: 'create_prorations',
					items: [
						{
							id: currentSubscription.items.data[0].id,
							price: priceId,
						},
					],
				},
				success_url: `${baseUrl}/pricing?success=true`,
				cancel_url: `${baseUrl}/pricing?canceled=true`,
				metadata: {
					userId,
				},
			});

		return NextResponse.json({ url: session.url });
	} catch (error) {
		console.error('Error creating checkout session:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
