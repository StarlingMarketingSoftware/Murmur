import { urls } from '@/constants/urls';
import { useGetStripePrice } from '@/hooks/queryHooks/useStripePrices';
import { useEditStripeSubscription } from '@/hooks/queryHooks/useStripeSubscriptions';
import { useMe } from '@/hooks/useMe';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StripeSubscriptionStatus } from '@/types';

export interface UpgradeSubscriptionDrawerProps {
	triggerButtonText: string;
	message: string;
}

export const useUpgradeSubscriptionDrawer = (props: UpgradeSubscriptionDrawerProps) => {
	const { triggerButtonText, message } = props;
	const { user, subscriptionTier, isFreeTrial } = useMe();
	const router = useRouter();

	const isSubscriptionActive =
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE;
	const [isOpen, setIsOpen] = useState(false);
	const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
	const [isUpdateSubscriptionTriggered, setIsUpdateSubscriptionTriggered] =
		useState(false);

	const { data: price } = useGetStripePrice(user?.stripePriceId ?? '');
	const formattedPrice = `$${price?.unit_amount ? price.unit_amount / 100 : 0}`;

	const { mutate: updateSubscription } = useEditStripeSubscription({
		onSuccess: () => {},
	});

	const handleConfirmUpgradeSubscription = () => {
		if (isFreeTrial) {
			setIsConfirmModalOpen(true);
		} else {
			router.push(urls.pricing.index);
		}
	};

	const handleUpgradeFreeTrialSubscription = () => {
		setIsUpdateSubscriptionTriggered(true);
		updateSubscription({
			trialEnd: 'now',
		});
	};

	const isUpgrading = isUpdateSubscriptionTriggered && !isSubscriptionActive;

	return {
		handleConfirmUpgradeSubscription,
		triggerButtonText,
		message,
		isConfirmModalOpen,
		setIsConfirmModalOpen,
		subscriptionTier,
		price,
		formattedPrice,
		handleUpgradeFreeTrialSubscription,
		isOpen,
		setIsOpen,
		isSubscriptionActive,
		isUpgrading,
	};
};
