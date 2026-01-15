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
	prices: Stripe.Price[];
}

export type SubscriptionTierData = {
	name: SubscriptionName;
	draftCredits: number;
	sendingCredits: number;
	verificationCredits: number;
	viewEmailAddresses: boolean;
	trialDraftCredits: number;
};

export type SubscriptionName =
	| 'Basic'
	| 'Pro'
	| 'Ultra'
	| 'Partner'
	| 'Custom'
	| 'Elite'
	| 'Prophet'
	| 'Admin Lite'
	| 'Admin Full';

export type BillingCycle = 'day' | 'week' | 'month' | 'year';
