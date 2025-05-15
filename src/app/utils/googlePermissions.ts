import { GOOGLE_SCOPES, LOCAL_STORAGE_KEYS } from '@/constants';

export const hasGoogleAccessToken = (): boolean => {
	return !!localStorage.getItem(LOCAL_STORAGE_KEYS.GoogleAccessToken);
};

export const isGoogleAccessTokenValid = (): boolean => {
	const expiresAt = localStorage.getItem(LOCAL_STORAGE_KEYS.GoogleExpiresAt);
	return !!expiresAt && Date.now() < Number(expiresAt);
};

export const hasContactsReadOnlyPermission = (): boolean => {
	return (
		!!localStorage
			.getItem(LOCAL_STORAGE_KEYS.GoogleScopes)
			?.includes(GOOGLE_SCOPES.ContactsReadOnly) &&
		isGoogleAccessTokenValid() &&
		hasGoogleAccessToken()
	);
};
