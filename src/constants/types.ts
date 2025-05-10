import { AiModel, Prisma } from '@prisma/client';

export type Url = {
	path: string;
	label: string;
	category?: UrlCategory;
};

export type Logo = {
	fileName: string;
	width: number;
	darkFileName?: string;
};

export type UrlCategory = 'protected' | 'mainMenu';

export type CampaignWithRelations = Prisma.CampaignGetPayload<{
	include: {
		contacts: true;
		emails: true;
		signature: true;
	};
}>;

export type EmailWithRelations = Prisma.EmailGetPayload<{
	include: {
		contact: true;
	};
}>;

export type ContactCSVFormat = {
	name: string;
	company: string;
	email: string;
	address: string;
	country: string;
	state: string;
	website: string;
	phone: string;
};

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

export type Draft = {
	subject: string;
	message: string;
	contactEmail: string;
};

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

export type SubscriptionTierData = {
	name: string;
	aiEmailCount: number;
	testEmailCount: number;
	viewEmailAddresses: boolean;
};

export interface CustomMutationOptions {
	suppressToasts?: boolean;
	successMessage?: string;
	errorMessage?: string;
	onSuccess?: () => void;
}

export interface CustomQueryOptions {
	filters?: Record<string, string | number>;
}

export type Font = 'Times New Roman' | 'Arial' | 'Calibri' | 'Georgia' | 'Courier New';

export type ApiRouteParams = Promise<{ id: string }>;
