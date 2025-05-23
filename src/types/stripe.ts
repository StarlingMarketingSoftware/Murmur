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

export type SubscriptionTierData = {
	name: string;
	aiEmailCount: number;
	testEmailCount: number;
	viewEmailAddresses: boolean;
};
