import { z } from 'zod';

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

export const contactFormSchema = z.object({
	name: z.string().min(1, { message: 'Name is required.' }),
	email: z.string().email({ message: 'Invalid email address.' }),
	subject: z.string().min(1, { message: 'Subject is required.' }),
	message: z.string().min(1, { message: 'Message is required.' }),
});

export type Contact = {
	name: string;
	email: string;
	category: ContactCategories;
	company: string;
};

export type ContactCategories = 'music' | 'lawyer' | 'doctor';
