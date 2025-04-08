'use client';
import { FC } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button } from './ui/button';
import { toast } from 'sonner';
import { User } from '@prisma/client';

interface UpdateSubscriptionButtonProps {
	className?: string;
	priceId: string;
	productId: string;
	user: User;
}

const UpdateSubscriptionButton: FC<UpdateSubscriptionButtonProps> = ({
	className,
	priceId,
	user,
	productId,
}) => {
	const { mutate: accessPortal, isPending } = useMutation({
		mutationFn: async () => {
			const response = await fetch('/api/stripe/stripe-portal/custom-product', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					customerId: user?.stripeCustomerId,
					priceId: priceId,
					productId: productId,
				}),
			});
			const { url } = await response.json();
			const updateSubscriptionUrl = `${url}/subscriptions/${user?.stripeSubscriptionId}/update`;
			window.location.href = updateSubscriptionUrl;
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
			{'Switch to This Plan'}
		</Button>
	);
};

export default UpdateSubscriptionButton;
