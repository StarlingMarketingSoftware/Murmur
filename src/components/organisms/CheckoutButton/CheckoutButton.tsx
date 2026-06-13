'use client';
import { Button } from '@/components/ui/button';
import { PricingAuthCheckoutModal } from '@/components/organisms/PricingAuthCheckoutModal';
import { useCreateCheckoutSession } from '@/hooks/queryHooks/useStripeCheckouts';
import { BillingCycle } from '@/types';
import { useAuth } from '@clerk/nextjs';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
	const { isSignedIn } = useAuth();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [authCheckoutOpen, setAuthCheckoutOpen] = useState(false);
	const { mutateAsync: checkout, isPending } = useCreateCheckoutSession();

	const returnUrl = useMemo(() => {
		const params = new URLSearchParams(searchParams.toString());
		params.set('checkoutPriceId', priceId);
		params.set('checkoutBillingCycle', billingCycle);
		params.delete('auth');
		const queryString = params.toString();
		return `${pathname}${queryString ? `?${queryString}` : ''}`;
	}, [billingCycle, pathname, priceId, searchParams]);

	const clearCheckoutParams = useCallback(() => {
		if (typeof window === 'undefined') return;

		const params = new URLSearchParams(window.location.search);
		params.delete('checkoutPriceId');
		params.delete('checkoutBillingCycle');
		params.delete('auth');
		const queryString = params.toString();
		window.history.replaceState(
			null,
			'',
			`${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`
		);
	}, []);

	useEffect(() => {
		if (searchParams.get('checkoutPriceId') !== priceId) return;
		setAuthCheckoutOpen(true);
	}, [priceId, searchParams]);

	const openAuthCheckout = () => {
		if (typeof window !== 'undefined') {
			window.history.replaceState(null, '', returnUrl);
		}
		setAuthCheckoutOpen(true);
	};

	const closeAuthCheckout = () => {
		setAuthCheckoutOpen(false);
		clearCheckoutParams();
	};

	const handleClick = async () => {
		if (!isSignedIn) {
			openAuthCheckout();
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
		<>
			<Button
				variant="product"
				className={className}
				onClick={handleClick}
				isLoading={isPending}
			>
				{buttonText}
			</Button>
			<PricingAuthCheckoutModal
				open={authCheckoutOpen}
				priceId={priceId}
				billingCycle={billingCycle}
				returnUrl={returnUrl}
				title={buttonText}
				onClose={closeAuthCheckout}
			/>
		</>
	);
}
