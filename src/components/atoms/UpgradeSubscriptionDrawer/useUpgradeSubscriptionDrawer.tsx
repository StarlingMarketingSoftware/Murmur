import { urls } from '@/constants/urls';
import { useMe } from '@/hooks/useMe';
import { StripeSubscriptionStatus } from '@/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface UpgradeSubscriptionDrawerProps {
	triggerButtonText: string;
	message: string;
}

export const useUpgradeSubscriptionDrawer = (props: UpgradeSubscriptionDrawerProps) => {
	const { triggerButtonText, message } = props;
	const { user, subscriptionTier, isFreeTrial } = useMe();
	const router = useRouter();
	const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

	const { mutateAsync: updateSubscription } = useUpdateSubscription();

	const handleUpgradeSubscription = () => {
		if (isFreeTrial) {
			// upgrade to the full version of current trial plan
			setIsConfirmModalOpen(true);
			// is there a way to do this through the portal, or must do it programmatically?
		} else {
			router.push(urls.pricing.index);
		}
	};
	return {
		handleUpgradeSubscription,
		triggerButtonText,
		message,
		isConfirmModalOpen,
		setIsConfirmModalOpen,
		subscriptionTier,
	};
};
