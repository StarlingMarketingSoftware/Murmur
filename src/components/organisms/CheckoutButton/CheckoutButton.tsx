'use client';
import { Button } from '@/components/ui/button';
import { useCreateCheckoutSession } from '@/hooks/queryHooks/useStripeCheckouts';
import { BillingCycle } from '@/types';
import { useClerk } from '@clerk/nextjs';
import { User } from '@prisma/client';

interface CheckoutButtonProps {
	priceId: string;
	buttonText: string;
	onButtonClick?: () => void;
	user: User | null | undefined;
	className?: string;
	billingCycle: BillingCycle;
}

export function CheckoutButton({
	priceId,
	buttonText,
	onButtonClick,
	className,
	billingCycle,
}: CheckoutButtonProps) {
	const { isSignedIn, redirectToSignIn } = useClerk();
	const { mutateAsync: checkout, isPending } = useCreateCheckoutSession();

	const handleClick = async () => {
		if (!isSignedIn) {
			redirectToSignIn();
			return;
		}

		if (onButtonClick) {
			onButtonClick();
		} else {
			const res = await checkout({ priceId, isYearly: billingCycle === 'year' });
			if (res.url) {
				window.location.href = res.url;
			} else {
				throw new Error('No checkout URL returned');
			}
		}
	};

	return (
		<Button
			variant="product"
			className={className}
			onClick={handleClick}
			isLoading={isPending}
		>
			{buttonText}
		</Button>
	);
}
