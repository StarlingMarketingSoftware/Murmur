export type Url = {
	path: string;
	label: string;
	category?: UrlCategory;
};

export type UrlCategory = 'protected' | 'mainMenu';

export type StripeSubscriptionStatus =
	| 'active'
	| 'past_due'
	| 'unpaid'
	| 'canceled'
	| 'incomplete'
	| 'incomplete_expired'
	| 'trialing'
	| 'paused';

export const STRIPE_SUBSCRIPTION_STATUS: Record<string, StripeSubscriptionStatus> = {
	ACTIVE: 'active',
	PAST_DUE: 'past_due',
	UNPAID: 'unpaid',
	CANCELED: 'canceled',
	INCOMPLETE: 'incomplete',
	INCOMPLETE_EXPIRED: 'incomplete_expired',
	TRIALING: 'trialing',
	PAUSED: 'paused',
} as const;

// use zod for schema types
