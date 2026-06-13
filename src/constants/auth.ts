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

export const CLERK_NO_BRANDING_LAYOUT = {
	logoPlacement: 'none',
	unsafe_disableDevelopmentModeWarnings: true,
} as const;

export const CLERK_NO_BRANDING_APPEARANCE = {
	layout: CLERK_NO_BRANDING_LAYOUT,
} as const;

type ClerkAppearance = {
	layout?: Record<string, unknown>;
	elements?: Record<string, unknown>;
	variables?: Record<string, unknown>;
};

export function withClerkNoBranding<T extends ClerkAppearance>(appearance: T) {
	return {
		...appearance,
		layout: {
			...appearance.layout,
			...CLERK_NO_BRANDING_LAYOUT,
		},
	} as T & typeof CLERK_NO_BRANDING_APPEARANCE;
}
