'use client';

import { loadStripe, StripeEmbeddedCheckout } from '@stripe/stripe-js';
import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
	const [stripeError, setStripeError] = useState<string | null>(null);

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

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 p-2 sm:p-4">
			<div className="w-full max-w-[1100px] max-h-[92dvh] overflow-hidden rounded-[8px] border-[3px] border-black bg-white shadow-lg">
				<div className="flex items-center justify-between border-b-[3px] border-black bg-white px-4 py-2">
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

				<ScrollArea className="w-full h-[calc(92dvh-50px)] min-h-[220px] sm:min-h-[280px] [&_[data-slot='scroll-area-scrollbar']]:-translate-x-[2px]">
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
				</ScrollArea>
			</div>
		</div>
	);
}

