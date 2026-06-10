'use client';

import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef } from 'react';
import { SignIn, SignUp, useAuth } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { urls } from '@/constants/urls';
import { StripeEmbeddedCheckoutModal } from '@/components/organisms/StripeEmbeddedCheckoutModal';
import {
	FREE_TRIAL_CLERK_APPEARANCE,
	FreeTrialClerkGlobalStyles,
	getOauthFlow,
} from '@/components/organisms/FreeTrialClerkTheme';
import { useFreeTrialCheckout } from '@/hooks/useFreeTrialCheckout';

// Visual tuning: use a wider view for the Clerk sign-up card, and a closer view behind checkout.
const SIGNUP_ZOOM = 2.2;
const CHECKOUT_ZOOM = 4;

export default function FreeTrialPage() {
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<mapboxgl.Map | null>(null);
	const { isLoaded, isSignedIn } = useAuth();
	const searchParams = useSearchParams();
	const { clientSecret, checkoutError, checkoutLoadingText } = useFreeTrialCheckout();

	const authMode = searchParams.get('auth');
	const showSignIn = authMode === 'sign-in';

	const oauthFlow = getOauthFlow();

	const buildAuthUrl = (mode: 'sign-in' | 'sign-up') => {
		const nextParams = new URLSearchParams(searchParams.toString());
		nextParams.set('auth', mode);
		const queryString = nextParams.toString();
		return queryString ? `${urls.freeTrial.index}?${queryString}` : urls.freeTrial.index;
	};

	const signInUrl = buildAuthUrl('sign-in');
	const signUpUrl = buildAuthUrl('sign-up');

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
					<div className="absolute inset-0 z-50 flex flex-col overflow-y-auto bg-transparent pointer-events-auto">
						<div className="m-auto p-4">
							{showSignIn ? (
								<SignIn
									routing="hash"
									oauthFlow={oauthFlow}
									signUpUrl={signUpUrl}
									forceRedirectUrl={urls.freeTrial.index}
									fallbackRedirectUrl={urls.freeTrial.index}
									signUpForceRedirectUrl={urls.freeTrial.index}
									signUpFallbackRedirectUrl={urls.freeTrial.index}
									appearance={FREE_TRIAL_CLERK_APPEARANCE}
								/>
							) : (
								<SignUp
									routing="hash"
									oauthFlow={oauthFlow}
									signInUrl={signInUrl}
									forceRedirectUrl={urls.freeTrial.index}
									fallbackRedirectUrl={urls.freeTrial.index}
									signInForceRedirectUrl={urls.freeTrial.index}
									signInFallbackRedirectUrl={urls.freeTrial.index}
									appearance={FREE_TRIAL_CLERK_APPEARANCE}
								/>
							)}
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
		<FreeTrialClerkGlobalStyles />
		</div>
	);
}

