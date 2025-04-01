import { Prisma } from '@prisma/client';
import { z } from 'zod';

export type Url = {
	path: string;
	label: string;
	category?: UrlCategory;
};

export type UrlCategory = 'protected' | 'mainMenu';

export type CampaignWithRelations = Prisma.CampaignGetPayload<{
	include: {
		contactLists: true;
		contacts: true;
		emails: true;
	};
}>;

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

export type Contact = {
	name: string;
	email: string;
	category: ContactCategories;
	company: string;
};

export type ContactCategories =
	| 'music'
	| 'lawyer'
	| 'doctor'
	| 'business'
	| 'hospitality'
	| 'finance'
	| 'teacher'
	| 'engineer'
	| 'architect'
	| 'accountant'
	| 'dentist'
	| 'nurse'
	| 'pharmacist'
	| 'veterinarian'
	| 'psychologist'
	| 'journalist'
	| 'chef'
	| 'realtor'
	| 'developer'
	| 'designer'
	| 'consultant'
	| 'photographer'
	| 'electrician'
	| 'plumber'
	| 'mechanic'
	| 'scientist'
	| 'pilot'
	| 'optometrist'
	| 'therapist'
	| 'surgeon'
	| 'police'
	| 'firefighter'
	| 'paramedic'
	| 'professor'
	| 'marketer';

export type Draft = {
	subject: string;
	message: string;
	contactEmail: string;
};

export type AiModel = 'sonar' | 'sonar-pro';

export type AiType = 'perplexity' | 'openai';

export type AiSelectValues = {
	name: string;
	value: AiModel;
	type: AiType;
};

export enum PerplexityModelEnum {
	Sonar = 'sonar',
	SonarPro = 'sonar-pro',
}
