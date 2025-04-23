'use client';

import { Button } from '@/components/ui/button';
import { useClerk } from '@clerk/nextjs';
import { User } from '@prisma/client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CheckoutButtonProps {
	priceId: string;
	buttonText: string;
	onButtonClick?: () => void;
	user: User | null | undefined;
}

export function CheckoutButton({
	priceId,
	buttonText,
	onButtonClick,
	user,
}: CheckoutButtonProps) {
	const { isSignedIn, redirectToSignIn } = useClerk();

	const { mutate: checkout, isPending } = useMutation({
		mutationFn: async () => {
			const response = await fetch('/api/stripe/checkout', {
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
			return data;
		},
		onSuccess: (data) => {
			if (data.url) {
				window.location.href = data.url;
			} else {
				throw new Error('No checkout URL returned');
			}
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to start checkout process. Please try again.');
		},
	});

	const handleClick = () => {
		if (!isSignedIn) {
			redirectToSignIn();
			return;
		}

		if (onButtonClick) {
			onButtonClick();
		} else {
			checkout();
		}
	};

	return (
		<Button className="mx-auto" onClick={handleClick} isLoading={isPending}>
			{buttonText}
		</Button>
	);
}
