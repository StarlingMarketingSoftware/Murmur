import Stripe from 'stripe';

export enum StripeSubscriptionStatus {
	ACTIVE = 'active',
	PAST_DUE = 'past_due',
	UNPAID = 'unpaid',
	CANCELED = 'canceled',
	INCOMPLETE = 'incomplete',
	INCOMPLETE_EXPIRED = 'incomplete_expired',
	TRIALING = 'trialing',
	PAUSED = 'paused',
}

export interface StripeProduct extends Stripe.Product {
	default_price: Stripe.Price;
}

export type SubscriptionTierData = {
	name: SubscriptionName;
	aiEmailCount: number;
	testEmailCount: number;
	viewEmailAddresses: boolean;
};

export type SubscriptionName =
	| 'Basic'
	| 'Standard'
	| 'Pro'
	| 'Custom'
	| 'Elite'
	| 'Prophet'
	| 'Admin Lite'
	| 'Admin Full';
