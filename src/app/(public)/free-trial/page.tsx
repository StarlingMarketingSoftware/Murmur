/* eslint-disable no-console */
'use client';

import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import { SignUp, useAuth } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import { _fetch } from '@/utils';
import { StripeEmbeddedCheckoutModal } from '@/components/organisms/StripeEmbeddedCheckoutModal';

// Visual tuning: use a wider view for the Clerk sign-up card, and a closer view behind checkout.
const SIGNUP_ZOOM = 2.2;
const CHECKOUT_ZOOM = 4;

export default function FreeTrialPage() {
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const checkoutAttemptKeyRef = useRef<string | null>(null);
	const { isLoaded, isSignedIn, userId } = useAuth();
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [checkoutError, setCheckoutError] = useState<string | null>(null);
	const [checkoutLoadingText, setCheckoutLoadingText] = useState<string>('Preparing checkout…');
	const [, setIsCreatingCheckoutSession] = useState(false);

	const freeTrialPriceId = process.env.NEXT_PUBLIC_STANDARD_MONTHLY_PRICE_ID;

	useEffect(() => {
		if (!isLoaded) return;
		if (isSignedIn) return;
		if (typeof window === 'undefined') return;
		// Ensure OAuth/sign-in flows return to this page.
		sessionStorage.setItem('redirectAfterSignIn', urls.freeTrial.index);
	}, [isLoaded, isSignedIn]);

	useEffect(() => {
		if (!isLoaded) return;
		const map = mapRef.current;
		if (!map) return;

		const targetZoom = isSignedIn ? CHECKOUT_ZOOM : SIGNUP_ZOOM;

		// No animation: snap to the correct zoom for each state.
		map.jumpTo({ zoom: targetZoom });
	}, [isLoaded, isSignedIn]);

	useEffect(() => {
		if (!isLoaded) return;
		if (!isSignedIn) {
			checkoutAttemptKeyRef.current = null;
			setClientSecret(null);
			setCheckoutError(null);
			setCheckoutLoadingText('Preparing checkout…');
			setIsCreatingCheckoutSession(false);
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
			setIsCreatingCheckoutSession(true);
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
			} finally {
				if (!isCancelled) {
					setIsCreatingCheckoutSession(false);
				}
			}
		};

		void createEmbeddedCheckoutSession();

		return () => {
			isCancelled = true;
			// In dev (React strict mode), effects can mount → cleanup → mount.
			// Reset the attempt key so the second mount can proceed.
			checkoutAttemptKeyRef.current = null;
			setIsCreatingCheckoutSession(false);
		};
	}, [isLoaded, isSignedIn, userId, freeTrialPriceId]);

	useEffect(() => {
		if (!mapContainerRef.current) return;
		if (mapRef.current) return;

		const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
		if (!accessToken) {
			console.warn(
				'Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN. Add it to your environment to load Mapbox.'
			);
			return;
		}

		mapboxgl.accessToken = accessToken;

		const MIN_ZOOM = Math.min(SIGNUP_ZOOM, CHECKOUT_ZOOM);
		const MAX_ZOOM = Math.max(SIGNUP_ZOOM, CHECKOUT_ZOOM);

		const map = new mapboxgl.Map({
			container: mapContainerRef.current,
			style: 'mapbox://styles/mapbox/streets-v12',
			center: [-98.5795, 39.8283], // USA
			zoom: SIGNUP_ZOOM,
			minZoom: MIN_ZOOM,
			maxZoom: MAX_ZOOM,
		});

		// Disable zoom controls/interactions (keeps the globe "fixed" at LOCKED_ZOOM).
		map.scrollZoom.disable();
		map.boxZoom.disable();
		map.doubleClickZoom.disable();
		map.dragPan.disable();
		map.dragRotate.disable();
		map.keyboard.disable();
		map.touchZoomRotate.disable();

		map.on('style.load', () => {
			// Ensure globe projection is enabled.
			map.setProjection({ name: 'globe' });

			// Keep the style's default atmosphere (globe colors),
			// but make the surrounding "space" black + starry.
			const existingFog = map.getFog() ?? {};
			map.setFog({
				...existingFog,
				// Remove atmospheric glow/halo entirely.
				color: 'rgb(0, 0, 0)',
				'high-color': 'rgb(0, 0, 0)',
				'space-color': 'rgb(0, 0, 0)',
				'star-intensity': 0.9,
				'horizon-blend': 0,
			});

			// Remove all words (labels) and administrative borders.
			const style = map.getStyle();
			for (const layer of style.layers ?? []) {
				const id = layer.id;

				// Text/icon labels
				if (layer.type === 'symbol') {
					map.setLayoutProperty(id, 'visibility', 'none');
					continue;
				}

				// Political/administrative boundaries (borders)
				const idLower = id.toLowerCase();
				if (
					layer.type === 'line' &&
					(idLower.includes('admin') ||
						idLower.includes('boundary') ||
						idLower.includes('border'))
				) {
					map.setLayoutProperty(id, 'visibility', 'none');
				}
			}

			// Auto-rotate the globe by shifting the center longitude.
			const secondsPerRevolution = 160;
			const distancePerSecond = 360 / secondsPerRevolution;
			const animationDurationMs = 1000;

			const normalizeLng = (lng: number) => {
				// Normalize to [-180, 180)
				const wrapped = ((lng + 180) % 360 + 360) % 360 - 180;
				return wrapped;
			};

			const spinGlobe = () => {
				const center = map.getCenter();
				center.lng = normalizeLng(center.lng - distancePerSecond);
				map.easeTo({
					center,
					duration: animationDurationMs,
					easing: (n) => n,
				});
			};

			map.on('moveend', spinGlobe);
			spinGlobe();
		});

		mapRef.current = map;

		return () => {
			mapRef.current?.remove();
			mapRef.current = null;
		};
	}, []);

	return (
		<div className="w-full h-[100dvh] bg-black md:bg-[#AFD6EF] px-0 pt-0 pb-0 md:px-[14px] md:pt-[17px] md:pb-[12px] overflow-hidden">
			<div className="relative w-full h-full border-0 md:border-[3px] md:border-black rounded-none md:rounded-[8px] overflow-hidden">
				<div ref={mapContainerRef} className="w-full h-full free-trial-map" />
				{isLoaded && isSignedIn && (
					<StripeEmbeddedCheckoutModal
						open
						title="Start your 7-day free trial"
						loadingText={checkoutLoadingText}
						error={checkoutError}
						clientSecret={clientSecret}
					/>
				)}
				{isLoaded && !isSignedIn && (
					<div className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none">
						<div className="pointer-events-auto">
							<SignUp
								routing="virtual"
								signInUrl={urls.signIn.index}
								forceRedirectUrl={urls.freeTrial.index}
								fallbackRedirectUrl={urls.freeTrial.index}
								signInForceRedirectUrl={urls.freeTrial.index}
								signInFallbackRedirectUrl={urls.freeTrial.index}
								appearance={{
									elements: {
										cardBox: { boxShadow: 'none' },
										card: { boxShadow: 'none' },
										formButtonPrimary: 'bg-black hover:bg-gray-800 text-sm normal-case',
									},
								}}
							/>
						</div>
					</div>
				)}
			</div>
		<style jsx global>{`
			.free-trial-map .mapboxgl-ctrl-logo {
				display: none !important;
			}
			@media (max-width: 767px) {
				.free-trial-map .mapboxgl-ctrl-attrib {
					display: none !important;
				}
			}
		`}</style>
		</div>
	);
}

