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
	price_1RB9Uw02Nskp21xSrRxsLDT3: {
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
	price_1RBX5302Nskp21xS93QdS0f9: {
		name: 'Professional',
		aiEmailCount: 1500,
		testEmailCount: 150,
		viewEmailAddresses: false,
	},
	price_1RBX6b02Nskp21xScZVyGvIb: {
		name: 'Elite',
		aiEmailCount: 5000,
		testEmailCount: 500,
		viewEmailAddresses: true,
	},
	price_1RBX7v02Nskp21xSePcdKsR0: {
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
