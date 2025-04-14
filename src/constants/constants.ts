import { AiSelectValues, SubscriptionTierData } from './types';

export enum LocalStorageKeys {
	GoogleAuthState = 'googleAuthState',
	GoogleAccessToken = 'googleAccessToken',
	GoogleScopes = 'googleScopes',
	GoogleExpiresAt = 'googleExpiresAt',
}

export enum GoogleScopes {
	ContactsReadOnly = 'https://www.googleapis.com/auth/contacts.readonly',
	GmailSend = 'https://www.googleapis.com/auth/gmail.send',
}

export const requestedPeopleScopes = [GoogleScopes.ContactsReadOnly];

export const requestedGmailScopes = ['https://www.googleapis.com/auth/gmail.send'];

export const AiModelOptions: AiSelectValues[] = [
	{
		name: 'Murmur AI',
		value: 'sonar',
		type: 'perplexity',
	},
	// {
	// 	name: 'Murmur AI Pro',
	// 	value: 'sonar_pro',
	// 	type: 'perplexity',
	// },
];

export const subscriptionTierDataList: Record<string, SubscriptionTierData> = {
	[process.env.NEXT_PUBLIC_ESSENTIALS_PRICE_ID as string]: {
		name: 'Essentials',
		aiEmailCount: 500,
		testEmailCount: 50,
		viewEmailAddresses: false,
	},
	custom: {
		name: 'Custom',
		aiEmailCount: 1000,
		testEmailCount: 100,
		viewEmailAddresses: false,
	},
	[process.env.NEXT_PUBLIC_PROFESSIONAL_PRICE_ID as string]: {
		name: 'Professional',
		aiEmailCount: 1500,
		testEmailCount: 150,
		viewEmailAddresses: false,
	},
	[process.env.NEXT_PUBLIC_ELITE_PRICE_ID as string]: {
		name: 'Elite',
		aiEmailCount: 5000,
		testEmailCount: 500,
		viewEmailAddresses: true,
	},
	[process.env.NEXT_PUBLIC_PROPHET_PRICE_ID as string]: {
		name: 'Prophet',
		aiEmailCount: 7500,
		testEmailCount: 750,
		viewEmailAddresses: true,
	},
};

export const restrictedFeatureMessages = {
	viewEmails: 'Upgrade your subscription to view recipient emails.',
	freePlanSendingLimit:
		'You have reached the sending limit on the free plan. Please sign up for a subscription to send more emails.',
};
