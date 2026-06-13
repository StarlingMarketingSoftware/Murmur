'use client';

import { loadStripe, StripeEmbeddedCheckout } from '@stripe/stripe-js';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { useKeyboardViewportFit } from '@/hooks/useKeyboardViewportFit';

interface StripeEmbeddedCheckoutModalProps {
	open: boolean;
	clientSecret: string | null;
	title?: string;
	loadingText?: string;
	error?: string | null;
	onClose?: () => void;
}

export function StripeEmbeddedCheckoutModal({
	open,
	clientSecret,
	title = 'Start your free trial',
	loadingText = 'Preparing checkout…',
	error,
	onClose,
}: StripeEmbeddedCheckoutModalProps) {
	const containerIdRef = useRef(`embedded-checkout-${Math.random().toString(36).slice(2)}`);
	const embeddedCheckoutRef = useRef<StripeEmbeddedCheckout | null>(null);
	const overlayRef = useRef<HTMLDivElement>(null);
	const [stripeError, setStripeError] = useState<string | null>(null);

	// Lock the page behind while open: landing-animations.css forces html/body
	// scrollable with !important on mobile landing, so the lock is a
	// higher-specificity !important rule keyed off this html class.
	useEffect(() => {
		if (!open) return;
		document.documentElement.classList.add('murmur-checkout-open');
		return () => document.documentElement.classList.remove('murmur-checkout-open');
	}, [open]);

	// Keep the overlay (and the Pay button) above the iOS keyboard.
	useKeyboardViewportFit(overlayRef, open);

	useEffect(() => {
		if (!open) return;
		if (!clientSecret) return;

		let isCancelled = false;
		setStripeError(null);

		// If we ever re-open or receive a new client secret, ensure we don't double-mount.
		embeddedCheckoutRef.current?.destroy();
		embeddedCheckoutRef.current = null;

		const mount = async () => {
			const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
			if (!publishableKey) {
				setStripeError('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
				return;
			}

			const stripe = await loadStripe(publishableKey);
			if (!stripe) {
				setStripeError('Failed to initialize Stripe');
				return;
			}

			const embeddedCheckout = await stripe.initEmbeddedCheckout({ clientSecret });

			if (isCancelled) {
				embeddedCheckout.destroy();
				return;
			}

			embeddedCheckoutRef.current = embeddedCheckout;
			embeddedCheckout.mount(`#${containerIdRef.current}`);
		};

		mount().catch((err) => {
			if (err instanceof Error) {
				setStripeError(err.message);
				return;
			}
			setStripeError('Failed to load embedded checkout');
		});

		return () => {
			isCancelled = true;
			embeddedCheckoutRef.current?.destroy();
			embeddedCheckoutRef.current = null;
		};
	}, [open, clientSecret]);

	if (!open || typeof window === 'undefined') return null;

	// Portal to <body>: globals.css sets `main { isolation: isolate }`, so a fixed
	// overlay rendered inside a page's <main> is trapped below the z-50 navbar
	// (Clerk avatar / hamburger) no matter its z-index.
	return createPortal(
		<div
			ref={overlayRef}
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 p-2 sm:p-4"
			onMouseDown={
				onClose
					? (event) => {
							if (event.target === event.currentTarget) onClose();
						}
					: undefined
			}
		>
			<div className="flex max-h-[min(92dvh,100%)] w-full max-w-[1100px] flex-col overflow-hidden rounded-[8px] border-[3px] border-black bg-white shadow-lg">
				<div className="flex shrink-0 items-center justify-between border-b-[3px] border-black bg-white px-4 py-2">
					<div className="text-sm font-semibold">{title}</div>
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="text-sm font-semibold underline underline-offset-4"
						>
							Close
						</button>
					)}
				</div>

				{/* The box is auto-height + max-h (NOT definite), so the scroller's h-full
				    can't resolve — size it by flex-shrink instead: this wrapper is a column
				    flex container and the inner scroller (min-h-0) shrinks to fit it. */}
				<CustomScrollbar
					className="flex min-h-0 w-full flex-1 flex-col"
					contentClassName="min-h-0"
					offsetRight={2}
					lockHorizontalScroll
				>
					<div className="p-3 sm:p-4 md:p-6">
						{error ? (
							<div className="text-sm text-red-600">{error}</div>
						) : stripeError ? (
							<div className="text-sm text-red-600">{stripeError}</div>
						) : !clientSecret ? (
							<div className="flex min-h-[220px] sm:min-h-[280px] items-center justify-center text-sm text-gray-700">
								{loadingText}
							</div>
						) : (
							<div
								id={containerIdRef.current}
								className="w-full [&>iframe]:!w-full"
							/>
						)}
					</div>
				</CustomScrollbar>
			</div>
		</div>,
		document.body
	);
}

