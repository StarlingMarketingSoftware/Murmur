import { useMe } from '@/hooks/useMe';

export interface RecipientAddressLockableInputProps {
	overrideTierShowEmail?: boolean;
	email: string;
	label?: string;
	className?: string;
}

export const useRecipientAddressLockableInput = (
	props: RecipientAddressLockableInputProps
) => {
	const { overrideTierShowEmail, email, label, className } = props;
	const { subscriptionTier } = useMe();
	const isEmailVisibleOnTier = subscriptionTier?.viewEmailAddresses;
	const displayEmail = isEmailVisibleOnTier || overrideTierShowEmail;

	return {
		email,
		displayEmail,
		label,
		className,
	};
};
