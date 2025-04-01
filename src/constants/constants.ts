import { AiSelectValues } from './types';

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
	{
		name: 'Murmur AI Pro',
		value: 'sonar-pro',
		type: 'perplexity',
	},
];
