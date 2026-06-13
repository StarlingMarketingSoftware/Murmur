'use client';

import { SignIn, SignUp, useAuth } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	FREE_TRIAL_CLERK_APPEARANCE,
	FreeTrialClerkGlobalStyles,
} from '@/components/organisms/FreeTrialClerkTheme';
import { StripeEmbeddedCheckoutModal } from '@/components/organisms/StripeEmbeddedCheckoutModal';
import { urls } from '@/constants/urls';
import { useKeyboardViewportFit } from '@/hooks/useKeyboardViewportFit';
import { BillingCycle } from '@/types';
import { _fetch } from '@/utils';

interface PricingAuthCheckoutModalProps {
	open: boolean;
	priceId: string;
	billingCycle: BillingCycle;
	returnUrl: string;
	title?: string;
	onClose?: () => void;
}

function usePricingEmbeddedCheckout({
	enabled,
	priceId,
	billingCycle,
}: {
	enabled: boolean;
	priceId: string;
	billingCycle: BillingCycle;
}) {
	const checkoutAttemptKeyRef = useRef<string | null>(null);
	const { isLoaded, isSignedIn, userId } = useAuth();
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [checkoutError, setCheckoutError] = useState<string | null>(null);
	const [checkoutLoadingText, setCheckoutLoadingText] = useState('Preparing checkout...');

	useEffect(() => {
		if (!isLoaded) return;
		if (!enabled || !isSignedIn) {
			checkoutAttemptKeyRef.current = null;
			setClientSecret(null);
			setCheckoutError(null);
			setCheckoutLoadingText('Preparing checkout...');
			return;
		}

		if (!userId) {
			setCheckoutError('No user ID found. Please refresh and try again.');
			return;
		}

		if (!priceId) {
			setCheckoutError('Stripe price ID not found. Please contact support.');
			return;
		}

		const attemptKey = `${userId}:${priceId}:${billingCycle}`;
		if (checkoutAttemptKeyRef.current === attemptKey) return;
		checkoutAttemptKeyRef.current = attemptKey;

		let isCancelled = false;
		const MAX_RETRIES = 12;
		const BASE_DELAY_MS = 400;

		const createEmbeddedCheckoutSession = async () => {
			setCheckoutError(null);
			setCheckoutLoadingText('Preparing checkout...');

			try {
				for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
					if (isCancelled) return;

					const response = await _fetch(urls.api.stripe.checkout.index, 'POST', {
						priceId,
						isYearly: billingCycle === 'year',
						uiMode: 'embedded',
					});

					let payload: unknown = null;
					try {
						payload = await response.json();
					} catch {
						payload = null;
					}

					if (response.ok) {
						const secret =
							typeof payload === 'object' && payload && 'clientSecret' in payload
								? (payload as { clientSecret?: unknown }).clientSecret
								: null;

						if (typeof secret !== 'string' || !secret) {
							setCheckoutError('No Stripe client secret returned for embedded checkout.');
							return;
						}

						setClientSecret(secret);
						return;
					}

					const errorMessage =
						typeof payload === 'object' && payload && 'error' in payload
							? String((payload as { error?: unknown }).error ?? 'Failed to start checkout')
							: 'Failed to start checkout';

					const isUserNotFound =
						response.status === 404 && errorMessage.toLowerCase().includes('user not found');

					if (isUserNotFound && attempt < MAX_RETRIES) {
						setCheckoutLoadingText('Finalizing your account...');
						const delay = BASE_DELAY_MS * Math.pow(1.3, attempt);
						await new Promise((resolve) => setTimeout(resolve, delay));
						continue;
					}

					setCheckoutError(errorMessage);
					return;
				}

				setCheckoutError('Unable to start checkout. Please refresh and try again.');
			} catch (error) {
				if (isCancelled) return;
				if (error instanceof Error) {
					setCheckoutError(error.message);
					return;
				}
				setCheckoutError('Failed to start checkout. Please refresh and try again.');
			}
		};

		void createEmbeddedCheckoutSession();

		return () => {
			isCancelled = true;
			checkoutAttemptKeyRef.current = null;
		};
	}, [billingCycle, enabled, isLoaded, isSignedIn, priceId, userId]);

	return { clientSecret, checkoutError, checkoutLoadingText };
}

export function PricingAuthCheckoutModal({
	open,
	priceId,
	billingCycle,
	returnUrl,
	title = 'Complete checkout',
	onClose,
}: PricingAuthCheckoutModalProps) {
	const { isLoaded, isSignedIn } = useAuth();
	const searchParams = useSearchParams();
	const overlayRef = useRef<HTMLDivElement>(null);
	const showSignIn = searchParams.get('auth') === 'sign-in';
	const signInUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}auth=sign-in`;
	const signUpUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}auth=sign-up`;
	const checkoutOpen = open && isLoaded && isSignedIn;

	const { clientSecret, checkoutError, checkoutLoadingText } = usePricingEmbeddedCheckout({
		enabled: checkoutOpen,
		priceId,
		billingCycle,
	});

	useEffect(() => {
		if (!open || checkoutOpen) return;
		document.documentElement.classList.add('murmur-checkout-open');
		return () => document.documentElement.classList.remove('murmur-checkout-open');
	}, [checkoutOpen, open]);

	useKeyboardViewportFit(overlayRef, open && !checkoutOpen);

	if (!open || typeof window === 'undefined') return null;

	if (checkoutOpen) {
		return (
			<StripeEmbeddedCheckoutModal
				open
				title={title}
				loadingText={checkoutLoadingText}
				error={checkoutError}
				clientSecret={clientSecret}
				onClose={onClose}
			/>
		);
	}

	return createPortal(
		<div
			ref={overlayRef}
			data-lenis-prevent
			className="free-trial-clerk-modal fixed inset-0 z-[60] flex flex-col overflow-hidden bg-white/45 p-2 backdrop-blur-[2px] sm:p-4"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose?.();
			}}
		>
			<div className="m-auto flex min-h-0 max-h-full">
				{isLoaded &&
					(showSignIn ? (
						<SignIn
							routing="hash"
							oauthFlow="redirect"
							signUpUrl={signUpUrl}
							forceRedirectUrl={returnUrl}
							fallbackRedirectUrl={returnUrl}
							signUpForceRedirectUrl={returnUrl}
							signUpFallbackRedirectUrl={returnUrl}
							appearance={FREE_TRIAL_CLERK_APPEARANCE}
						/>
					) : (
						<SignUp
							routing="hash"
							oauthFlow="redirect"
							signInUrl={signInUrl}
							forceRedirectUrl={returnUrl}
							fallbackRedirectUrl={returnUrl}
							signInForceRedirectUrl={returnUrl}
							signInFallbackRedirectUrl={returnUrl}
							appearance={FREE_TRIAL_CLERK_APPEARANCE}
						/>
					))}
			</div>
			<FreeTrialClerkGlobalStyles />
		</div>,
		document.body
	);
}
