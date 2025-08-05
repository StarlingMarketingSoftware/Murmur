import { urls } from '@/constants/urls';
import { useGetStripePrice } from '@/hooks/queryHooks/useStripePrices';
import { useEditStripeSubscription } from '@/hooks/queryHooks/useStripeSubscriptions';
import { useMe } from '@/hooks/useMe';
import { useRouter } from 'next/navigation';
import { Dispatch, SetStateAction, useState } from 'react';
import { StripeSubscriptionStatus } from '@/types';
import { ButtonVariants } from '@/components/ui/button';

export interface UpgradeSubscriptionDrawerProps {
	triggerButtonText: string;
	message: string;
	isOpen?: boolean;
	setIsOpen?: Dispatch<SetStateAction<boolean>>;
	hideTriggerButton?: boolean;
	buttonVariant?: ButtonVariants['variant'];
}

export const useUpgradeSubscriptionDrawer = (props: UpgradeSubscriptionDrawerProps) => {
	const {
		triggerButtonText,
		message,
		isOpen,
		setIsOpen,
		hideTriggerButton,
		buttonVariant,
	} = props;
	const { user, subscriptionTier, isFreeTrial } = useMe();
	const router = useRouter();

	const isSubscriptionActive =
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE;

	const [isOpenInternal, setIsOpenInternal] = useState(false);
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
		isOpenInternal,
		setIsOpenInternal,
		isOpen,
		setIsOpen,
		isSubscriptionActive,
		isUpgrading,
		isUpdateSubscriptionTriggered,
		hideTriggerButton,
		buttonVariant,
	};
};
