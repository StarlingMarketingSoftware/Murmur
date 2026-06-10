'use client';

import { SignIn, SignUp, useAuth } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { urls } from '@/constants/urls';
import { useFreeTrialCheckout } from '@/hooks/useFreeTrialCheckout';
import { StripeEmbeddedCheckoutModal } from '@/components/organisms/StripeEmbeddedCheckoutModal';
import {
	FREE_TRIAL_CLERK_APPEARANCE,
	FreeTrialClerkGlobalStyles,
} from '@/components/organisms/FreeTrialClerkTheme';

// Clerk redirects back to the landing page with this param after auth completes;
// the param is consumed (popup re-opens at the checkout step) and immediately
// stripped from the URL so a refresh lands on a clean landing page.
const TRIAL_RETURN_URL = `${urls.home.index}?trial=1`;

interface StartFreeTrialModalProps {
	open: boolean;
}

/**
 * Non-dismissable free-trial popup for the landing page: Clerk sign-up/sign-in
 * while signed out, then the embedded Stripe checkout. There is deliberately no
 * way to close it — only a page refresh escapes.
 */
export function StartFreeTrialModal({ open }: StartFreeTrialModalProps) {
	const { isLoaded, isSignedIn } = useAuth();
	const searchParams = useSearchParams();
	const [latchedOpen, setLatchedOpen] = useState(false);

	const isOpen = open || latchedOpen;
	const showSignIn = searchParams.get('auth') === 'sign-in';

	const { clientSecret, checkoutError, checkoutLoadingText } = useFreeTrialCheckout(isOpen);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		// OAuth always uses a full-page redirect (the popup flow doesn't reliably
		// complete sign-in with hash routing), returning on a fresh page load at
		// /#/sso-callback; Clerk needs a mounted SignUp/SignIn to finish the
		// handshake, so re-open the popup and leave the URL alone until it completes.
		if (window.location.hash.startsWith('#/sso-callback')) {
			setLatchedOpen(true);
			return;
		}

		if (!isLoaded) return;

		const stripParams = (keepAuth: boolean) => {
			const params = new URLSearchParams(window.location.search);
			const hasParamsToStrip = params.has('trial') || (!keepAuth && params.has('auth'));
			if (!hasParamsToStrip) return;
			params.delete('trial');
			if (!keepAuth) params.delete('auth');
			const queryString = params.toString();
			window.history.replaceState(
				null,
				'',
				`${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`
			);
		};

		if (isSignedIn) {
			if (searchParams.get('trial') === '1') {
				setLatchedOpen(true);
			}
			stripParams(false);
			return;
		}

		// Signed out: keep `auth` while the popup is open (it drives the
		// sign-up ↔ sign-in toggle); strip `trial` so a refresh stays closed.
		stripParams(isOpen);
	}, [isLoaded, isSignedIn, searchParams, isOpen]);

	// A signed-out /free-trial visit leaves `redirectAfterSignIn` behind; without
	// this, RedirectAfterSignIn (sublayout.tsx) would yank a fresh sign-up away
	// from the popup.
	useEffect(() => {
		if (!isOpen || !isLoaded || isSignedIn) return;
		sessionStorage.removeItem('redirectAfterSignIn');
	}, [isOpen, isLoaded, isSignedIn]);

	if (!isOpen) return null;

	if (isLoaded && isSignedIn) {
		return (
			<StripeEmbeddedCheckoutModal
				open
				title="Start your 7-day free trial"
				loadingText={checkoutLoadingText}
				error={checkoutError}
				clientSecret={clientSecret}
			/>
		);
	}

	return (
		<div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-black/20 p-2 sm:p-4">
			<div className="m-auto">
				{isLoaded &&
					(showSignIn ? (
						<SignIn
							routing="hash"
							oauthFlow="redirect"
							signUpUrl={`${urls.home.index}?auth=sign-up`}
							forceRedirectUrl={TRIAL_RETURN_URL}
							fallbackRedirectUrl={TRIAL_RETURN_URL}
							signUpForceRedirectUrl={TRIAL_RETURN_URL}
							signUpFallbackRedirectUrl={TRIAL_RETURN_URL}
							appearance={FREE_TRIAL_CLERK_APPEARANCE}
						/>
					) : (
						<SignUp
							routing="hash"
							oauthFlow="redirect"
							signInUrl={`${urls.home.index}?auth=sign-in`}
							forceRedirectUrl={TRIAL_RETURN_URL}
							fallbackRedirectUrl={TRIAL_RETURN_URL}
							signInForceRedirectUrl={TRIAL_RETURN_URL}
							signInFallbackRedirectUrl={TRIAL_RETURN_URL}
							appearance={FREE_TRIAL_CLERK_APPEARANCE}
						/>
					))}
			</div>
			<FreeTrialClerkGlobalStyles />
		</div>
	);
}
