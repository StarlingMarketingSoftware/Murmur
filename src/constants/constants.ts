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
