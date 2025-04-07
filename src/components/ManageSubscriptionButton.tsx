'use client';
import { FC } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button } from './ui/button';
import { useMe } from '@/hooks/useMe';
import { toast } from 'sonner';

interface ManageSubscriptionButtonProps {
	isUpdateSubscription?: boolean;
	className?: string;
}

const ManageSubscriptionButton: FC<ManageSubscriptionButtonProps> = ({
	isUpdateSubscription,
	className,
}) => {
	const { user } = useMe();

	const { mutate: accessPortal, isPending } = useMutation({
		mutationFn: async () => {
			const response = await fetch('/api/stripe/stripe-portal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ customerId: user?.stripeCustomerId }),
			});
			const { url } = await response.json();
			const updateSubscriptionUrl = `${url}/subscriptions/${user?.stripeSubscriptionId}/update`;
			window.location.href = isUpdateSubscription ? updateSubscriptionUrl : url;
		},
		onError: () => {
			toast.error('Error accessing customer portal. Please try again.');
		},
	});

	return (
		<Button
			className={className}
			onClick={() => accessPortal()}
			disabled={isPending}
			isLoading={isPending}
		>
			{isUpdateSubscription ? 'Switch to This Plan' : 'Manage Your Subscription'}
		</Button>
	);
};

export default ManageSubscriptionButton;
