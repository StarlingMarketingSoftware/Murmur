'use client';

import { SignIn, SignUp, useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { urls } from '@/constants/urls';
import { AccountType } from '@/constants/prismaEnums';
import { useGetUser } from '@/hooks/queryHooks/useUsers';
import { useFreeTrialCheckout } from '@/hooks/useFreeTrialCheckout';
import { useKeyboardViewportFit } from '@/hooks/useKeyboardViewportFit';
import { StripeEmbeddedCheckoutModal } from '@/components/organisms/StripeEmbeddedCheckoutModal';
import { StripeSubscriptionStatus } from '@/types';
import {
	FREE_TRIAL_CLERK_APPEARANCE,
	FreeTrialClerkGlobalStyles,
} from '@/components/organisms/FreeTrialClerkTheme';

// Clerk redirects back to the landing page with this param after auth completes;
// the param is consumed (popup re-opens at the checkout step) and immediately
// stripped from the URL so a refresh lands on a clean landing page.
const TRIAL_RETURN_URL = urls.home.startFreeTrial;

interface StartFreeTrialModalProps {
	open: boolean;
	onClose?: () => void;
}

/**
 * Free-trial popup for the landing page: Clerk sign-up/sign-in while signed
 * out, then the embedded Stripe checkout. Clicking the backdrop dismisses it.
 */
export function StartFreeTrialModal({ open, onClose }: StartFreeTrialModalProps) {
	const { isLoaded, isSignedIn, userId } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [latchedOpen, setLatchedOpen] = useState(false);

	const isOpen = open || latchedOpen;
	const showSignIn = searchParams.get('auth') === 'sign-in';
	const {
		data: user,
		isPending: isPendingUser,
		isLoading: isLoadingUser,
		isError: isUserError,
	} = useGetUser(userId);

	const isResolvingSignedInUser =
		isLoaded &&
		isSignedIn &&
		(isPendingUser || isLoadingUser || (!user && !isUserError));
	const hasActiveSubscription =
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE ||
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.TRIALING;
	const postAuthRedirectUrl =
		user?.accountType === AccountType.venue
			? urls.venuePortal.index
			: hasActiveSubscription
				? urls.murmur.dashboard.index
				: null;

	const { clientSecret, checkoutError, checkoutLoadingText } = useFreeTrialCheckout(
		isOpen &&
			isLoaded &&
			isSignedIn &&
			!isResolvingSignedInUser &&
			!isUserError &&
			!postAuthRedirectUrl
	);

	useEffect(() => {
		if (!isOpen || !isLoaded || !isSignedIn || !postAuthRedirectUrl) return;
		router.replace(postAuthRedirectUrl);
	}, [isLoaded, isOpen, isSignedIn, postAuthRedirectUrl, router]);

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

		// Signed out: `trial=1` also opens the popup (free-trial CTAs elsewhere
		// navigate to `/?trial=1`). Keep `auth` while the popup is open (it drives
		// the sign-up ↔ sign-in toggle); strip `trial` so a refresh stays closed.
		const wantsTrial = searchParams.get('trial') === '1';
		if (wantsTrial) setLatchedOpen(true);
		stripParams(isOpen || wantsTrial);
	}, [isLoaded, isSignedIn, searchParams, isOpen]);

	// Other pages set `redirectAfterSignIn` before kicking off auth (e.g. the
	// dashboard's Edge/Safari sign-in fallback); without this, RedirectAfterSignIn
	// (sublayout.tsx) would yank a fresh sign-up away from the popup.
	useEffect(() => {
		if (!isOpen || !isLoaded || isSignedIn) return;
		sessionStorage.removeItem('redirectAfterSignIn');
	}, [isOpen, isLoaded, isSignedIn]);

	// Lock the page behind while the Clerk step is up; StripeEmbeddedCheckoutModal
	// owns the same lock for the checkout step (it adds/removes this class itself,
	// and the gate mirrors the render branch so ownership never overlaps).
	const clerkStepOpen = isOpen && !(isLoaded && isSignedIn);
	useEffect(() => {
		if (!clerkStepOpen) return;
		document.documentElement.classList.add('murmur-checkout-open');
		return () => document.documentElement.classList.remove('murmur-checkout-open');
	}, [clerkStepOpen]);

	// Keep the card (and the focused field) above the iOS keyboard.
	const overlayRef = useRef<HTMLDivElement>(null);
	useKeyboardViewportFit(overlayRef, clerkStepOpen);

	const handleClose = () => {
		setLatchedOpen(false);
		onClose?.();
	};

	if (!isOpen || typeof window === 'undefined') return null;

	if (isLoaded && isSignedIn) {
		return (
			<StripeEmbeddedCheckoutModal
				open
				title={
					postAuthRedirectUrl || isResolvingSignedInUser
						? 'Opening your account'
						: 'Start your 7-day free trial'
				}
				loadingText={
					postAuthRedirectUrl
						? 'Opening your account...'
						: isResolvingSignedInUser
							? 'Checking your account...'
							: checkoutLoadingText
				}
				error={
					isUserError
						? 'Could not check your account. Please refresh and try again.'
						: checkoutError
				}
				clientSecret={clientSecret}
				onClose={handleClose}
			/>
		);
	}

	// Portal to <body>: globals.css sets `main { isolation: isolate }`, so a fixed
	// overlay rendered inside a page's <main> is trapped below the z-50 navbar
	// (Clerk avatar / hamburger) no matter its z-index.
	return createPortal(
		<div
			ref={overlayRef}
			data-lenis-prevent
			className="free-trial-clerk-modal fixed inset-0 z-[60] flex flex-col overflow-hidden bg-white/45 p-2 backdrop-blur-[2px] sm:p-4"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) handleClose();
			}}
		>
			{/* flex + min-h-0 + max-h-full clamp the Clerk card chain (rootBox →
			    cardBox) to the viewport; the form scrolls inside .cl-card instead
			    of the whole card scrolling past the screen edges. */}
			<div className="m-auto flex min-h-0 max-h-full">
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
		</div>,
		document.body
	);
}
