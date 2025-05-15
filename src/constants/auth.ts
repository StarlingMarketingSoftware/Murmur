export enum GOOGLE_SCOPES {
	ContactsReadOnly = 'https://www.googleapis.com/auth/contacts.readonly',
	GmailSend = 'https://www.googleapis.com/auth/gmail.send',
}

export const REQUESTED_PEOPLE_SCOPES = [GOOGLE_SCOPES.ContactsReadOnly];

export const REQUESTED_GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

export enum LOCAL_STORAGE_KEYS {
	GoogleAuthState = 'googleAuthState',
	GoogleAccessToken = 'googleAccessToken',
	GoogleScopes = 'googleScopes',
	GoogleExpiresAt = 'googleExpiresAt',
}
