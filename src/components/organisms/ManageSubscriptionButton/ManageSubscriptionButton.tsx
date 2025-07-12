'use client';
import { FC } from 'react';

import { Button } from '../../ui/button';
import { useMe } from '@/hooks/useMe';
import { toast } from 'sonner';
import { urls } from '@/constants/urls';
import { useManageSubscriptionPortal } from '@/hooks/queryHooks/useStripeCheckouts';
import { BASE_URL } from '@/constants/ui';

interface ManageSubscriptionButtonProps {
	isUpdateSubscription?: boolean;
	className?: string;
}

const ManageSubscriptionButton: FC<ManageSubscriptionButtonProps> = ({
	isUpdateSubscription,
	className,
}) => {
	const { user } = useMe();

	const { mutateAsync: accessPortal, isPending } = useManageSubscriptionPortal();

	const handleClick = async () => {
		if (!user?.stripeCustomerId) {
			toast.error('No stripe customer id found');
			return;
		}

		const res = await accessPortal({
			customerId: user?.stripeCustomerId,
			returnUrl: `${BASE_URL}${urls.pricing.index}`,
		});

		if (res.url) {
			window.location.href = res.url;
		} else {
			throw new Error('No checkout URL returned');
		}
	};

	return (
		<Button
			className={className}
			onClick={handleClick}
			disabled={isPending}
			isLoading={isPending}
			variant="product"
			size="xl"
		>
			{isUpdateSubscription ? 'Buy Now' : 'Manage'}
		</Button>
	);
};

export default ManageSubscriptionButton;
