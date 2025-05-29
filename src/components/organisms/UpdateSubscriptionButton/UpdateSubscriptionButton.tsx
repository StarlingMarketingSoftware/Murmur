'use client';
import { FC } from 'react';
import { Button } from '../../ui/button';
import { toast } from 'sonner';
import { User } from '@prisma/client';
import { useCreateCustomerPortal } from '@/hooks/queryHooks/useStripeCheckouts';

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
	const { mutateAsync: accessPortal, isPending } = useCreateCustomerPortal({
		suppressToasts: true,
	});

	const handleClick = async () => {
		if (!user?.stripeCustomerId) {
			toast.error('No Stripe customer ID found. Please contact support.');
			return;
		}
		const res = await accessPortal({
			customerId: user.stripeCustomerId,
			priceId,
			productId,
		});
		const { url } = res;
		const updateSubscriptionUrl = `${url}/subscriptions/${user?.stripeSubscriptionId}/update`;
		window.location.href = updateSubscriptionUrl;
	};

	return (
		<Button
			className={className}
			onClick={handleClick}
			disabled={isPending}
			isLoading={isPending}
		>
			{'Switch to This Plan'}
		</Button>
	);
};

export default UpdateSubscriptionButton;
