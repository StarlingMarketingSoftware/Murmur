import { useMe } from '@/hooks/useMe';

export interface RecipientAddressLockableInputProps {
	overrideTierShowEmail?: boolean;
	email: string;
}

export const useRecipientAddressLockableInput = (
	props: RecipientAddressLockableInputProps
) => {
	const { overrideTierShowEmail = false, email } = props;
	const { subscriptionTier } = useMe();
	const isEmailVisibleOnTier = subscriptionTier?.viewEmailAddresses;
	const displayEmail = isEmailVisibleOnTier || overrideTierShowEmail;

	return {
		email,
		displayEmail,
	};
};
