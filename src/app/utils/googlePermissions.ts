import { GoogleScopes, LocalStorageKeys } from '@/constants/constants';

export const hasGoogleAccessToken = (): boolean => {
	return !!localStorage.getItem(LocalStorageKeys.GoogleAccessToken);
};

export const isGoogleAccessTokenValid = (): boolean => {
	const expiresAt = localStorage.getItem(LocalStorageKeys.GoogleExpiresAt);
	return !!expiresAt && Date.now() < Number(expiresAt);
};

export const hasContactsReadOnlyPermission = (): boolean => {
	return (
		!!localStorage
			.getItem(LocalStorageKeys.GoogleScopes)
			?.includes(GoogleScopes.ContactsReadOnly) &&
		isGoogleAccessTokenValid() &&
		hasGoogleAccessToken()
	);
};
