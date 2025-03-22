'use client';

import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { useTransition } from 'react';
import { toast } from 'sonner';

interface CheckoutButtonProps {
	priceId: string;
	buttonText: string;
	onButtonClick?: () => void;
}

export function CheckoutButton({
	priceId,
	buttonText,
	onButtonClick,
}: CheckoutButtonProps) {
	const [isPending, startTransition] = useTransition();
	const { user } = useUser();

	const handleCheckout = async () => {
		startTransition(async () => {
			try {
				const response = await fetch('/api/checkout', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						priceId,
						userId: user?.id,
					}),
				});

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || 'Failed to create checkout session');
				}

				if (data.url) {
					// Redirect to Stripe Checkout
					window.location.href = data.url;
				} else {
					throw new Error('No checkout URL returned');
				}
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error
						? error.message
						: 'Failed to start checkout process. Please try again.';
				toast.error(errorMessage);
			}
		});
	};

	return (
		<Button
			className="mx-auto"
			onClick={onButtonClick || handleCheckout}
			disabled={isPending}
		>
			{isPending ? 'Loading...' : buttonText}
		</Button>
	);
}
