'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import { _fetch } from '@/utils';

/**
 * Creates an embedded Stripe checkout session for the free trial once the user
 * is signed in. Retries while the Clerk webhook is still creating the Prisma
 * user. Pass `enabled = false` to hold off (e.g. until a popup is opened).
 */
export function useFreeTrialCheckout(enabled: boolean = true): {
	clientSecret: string | null;
	checkoutError: string | null;
	checkoutLoadingText: string;
} {
	const checkoutAttemptKeyRef = useRef<string | null>(null);
	const { isLoaded, isSignedIn, userId } = useAuth();
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [checkoutError, setCheckoutError] = useState<string | null>(null);
	const [checkoutLoadingText, setCheckoutLoadingText] = useState<string>('Preparing checkout…');

	const freeTrialPriceId = process.env.NEXT_PUBLIC_STANDARD_MONTHLY_PRICE_ID;

	useEffect(() => {
		if (!isLoaded) return;
		if (!enabled || !isSignedIn) {
			checkoutAttemptKeyRef.current = null;
			setClientSecret(null);
			setCheckoutError(null);
			setCheckoutLoadingText('Preparing checkout…');
			return;
		}

		if (!userId) {
			setCheckoutError('No user ID found. Please refresh and try again.');
			return;
		}

		if (!freeTrialPriceId) {
			setCheckoutError('Stripe price ID not found. Please contact support.');
			return;
		}

		const attemptKey = `${userId}:${freeTrialPriceId}`;
		if (checkoutAttemptKeyRef.current === attemptKey) return;
		checkoutAttemptKeyRef.current = attemptKey;

		let isCancelled = false;
		const MAX_RETRIES = 12;
		const BASE_DELAY_MS = 400;

		const createEmbeddedCheckoutSession = async () => {
			setCheckoutError(null);
			setCheckoutLoadingText('Preparing checkout…');

			try {
				for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
					if (isCancelled) return;

					const response = await _fetch(urls.api.stripe.checkout.index, 'POST', {
						priceId: freeTrialPriceId,
						freeTrial: true,
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
						setCheckoutLoadingText('Finalizing your account…');
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
			// In dev (React strict mode), effects can mount → cleanup → mount.
			// Reset the attempt key so the second mount can proceed.
			checkoutAttemptKeyRef.current = null;
		};
	}, [enabled, isLoaded, isSignedIn, userId, freeTrialPriceId]);

	return { clientSecret, checkoutError, checkoutLoadingText };
}
