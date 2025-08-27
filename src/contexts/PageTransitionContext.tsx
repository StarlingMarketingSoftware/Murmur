'use client';
import React, {
	createContext,
	useContext,
	useState,
	useCallback,
	ReactNode,
	useRef,
	useEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';

const shouldUseChromeAnimation = (): boolean => {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent || '';
	const vendor = navigator.vendor || '';
	const isEdge = ua.includes('Edg');
	const isOpera = ua.includes('OPR') || ua.includes('Opera');
	const isSamsung = ua.includes('SamsungBrowser');
	const isFirefox = ua.includes('Firefox');
	const isDuckDuckGo = ua.includes('DuckDuckGo');
	const isIOS = /iPad|iPhone|iPod/.test(ua) || ua.includes('CriOS'); // Treat iOS Chrome as non-Chrome engine
	const isBrave =
		(navigator as unknown as { brave?: boolean }).brave !== undefined ||
		ua.includes('Brave');
	const isSafari =
		/Safari/.test(ua) && /Apple Computer/.test(vendor) && !/Chrome/.test(ua);
	const isChromeDesktop = /Chrome/.test(ua) && /Google Inc/.test(vendor);

	const result =
		isChromeDesktop &&
		!isEdge &&
		!isOpera &&
		!isSamsung &&
		!isFirefox &&
		!isDuckDuckGo &&
		!isIOS &&
		!isBrave &&
		!isSafari;

	// Debug logging
	if (typeof window !== 'undefined') {
		console.log('[PageTransition] Browser detection:', {
			userAgent: ua,
			vendor: vendor,
			isEdge,
			isSafari,
			isIOS,
			isChrome: isChromeDesktop,
			canAnimate: result,
		});
	}

	return result;
};

// Ensure any scroll locking styles are removed
const resetScrollLocks = () => {
	if (typeof document === 'undefined') return;
	document.body.style.overflow = '';
	document.body.style.overflowX = '';
	document.body.style.overflowY = '';
	document.body.style.position = '';
	document.body.style.width = '';
	document.body.style.top = '';
	document.body.style.touchAction = '';
	document.documentElement.style.overflow = '';
};

interface PageTransitionContextType {
	isTransitioning: boolean;
	startTransition: (to: string) => void;
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(
	undefined
);

export const usePageTransition = () => {
	const context = useContext(PageTransitionContext);
	if (!context) {
		throw new Error('usePageTransition must be used within a PageTransitionProvider');
	}
	return context;
};

interface PageTransitionProviderProps {
	children: ReactNode;
}

export const PageTransitionProvider: React.FC<PageTransitionProviderProps> = ({
	children,
}) => {
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [transitionTo, setTransitionTo] = useState<string | null>(null);
	const router = useRouter();

	// Check browser support synchronously to avoid timing issues
	const isChromeBrowser =
		typeof window !== 'undefined' ? shouldUseChromeAnimation() : false;

	const startTransition = useCallback(
		(to: string) => {
			try {
				console.log('[PageTransition] startTransition called:', { to, isChromeBrowser });

				// Double-check browser support at call time
				const canAnimate = isChromeBrowser && shouldUseChromeAnimation();

				if (canAnimate) {
					console.log('[PageTransition] Starting animation transition');
					setIsTransitioning(true);
					setTransitionTo(to);
				} else {
					console.log('[PageTransition] Skipping animation, direct navigation');
					// Non-Chrome: skip animation and navigate immediately
					resetScrollLocks();

					// Ensure we don't accidentally trigger any transitions
					setIsTransitioning(false);
					setTransitionTo(null);

					// Use Next.js router for navigation to ensure proper routing
					router.push(to);
				}
			} catch (error) {
				console.error('[PageTransition] Critical error in startTransition:', error);
				// Emergency fallback - use Next.js router
				router.push(to);
			}
		},
		[isChromeBrowser, router]
	);

	const onTransitionComplete = useCallback(() => {
		if (transitionTo) {
			// Ensure body styles are reset before navigation
			document.body.style.overflow = '';
			document.body.style.overflowX = '';
			document.body.style.overflowY = '';
			document.body.style.position = '';
			document.body.style.width = '';
			document.body.style.top = '';
			document.body.style.touchAction = '';
			document.documentElement.style.overflow = '';

			// Navigate to the new page
			router.push(transitionTo);
			// Clean up transition state after navigation and fade out
			setTimeout(() => {
				setIsTransitioning(false);
				setTransitionTo(null);
			}, 200); // Reduced delay to match faster animation
		}
	}, [router, transitionTo]);

	return (
		<PageTransitionContext.Provider value={{ isTransitioning, startTransition }}>
			{children}
			{isTransitioning && isChromeBrowser && (
				<PageTransition isActive={isTransitioning} onComplete={onTransitionComplete} />
			)}
		</PageTransitionContext.Provider>
	);
};

const PageTransition = ({
	isActive,
	onComplete,
}: {
	isActive: boolean;
	onComplete: () => void;
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const whiteOverlayRef = useRef<HTMLDivElement>(null);
	const lineOneRef = useRef<HTMLDivElement>(null);
	const lineTwoRef = useRef<HTMLDivElement>(null);
	const lineThreeRef = useRef<HTMLDivElement>(null);
	const verticalLineRef = useRef<HTMLDivElement>(null);
	const shimmerRef = useRef<HTMLDivElement>(null);

	const isChrome = shouldUseChromeAnimation();

	useEffect(() => {
		// Final safeguard: never run animations on non-Chrome
		if (!isChrome) {
			console.log(
				'[PageTransition] Component mounted on non-Chrome, immediately completing'
			);
			resetScrollLocks();
			if (isActive) {
				onComplete();
			}
			return;
		}

		if (!isActive) return;

		// Check if gsap is available (for SSR compatibility)
		if (typeof window === 'undefined' || !gsap) return;

		if (
			!containerRef.current ||
			!whiteOverlayRef.current ||
			!lineOneRef.current ||
			!lineTwoRef.current ||
			!lineThreeRef.current ||
			!verticalLineRef.current ||
			!shimmerRef.current
		) {
			return;
		}

		// Store current scroll position
		const scrollPosition = window.scrollY;

		// Disable scrolling when transition is active
		document.body.style.overflow = 'hidden';
		document.body.style.overflowX = 'hidden';
		document.body.style.overflowY = 'hidden';
		document.body.style.position = 'fixed';
		document.body.style.width = '100%';
		document.body.style.top = `-${scrollPosition}px`;
		document.body.style.touchAction = 'none'; // Prevent touch scrolling on mobile
		document.documentElement.style.overflow = 'hidden'; // Also set on html element

		// Initial state
		gsap.set(containerRef.current, {
			display: 'block',
			opacity: 0,
		});

		gsap.set(whiteOverlayRef.current, {
			opacity: 0,
		});

		gsap.set(lineOneRef.current, {
			x: '-100%',
			opacity: 0,
		});

		gsap.set(lineTwoRef.current, {
			x: '100%',
			opacity: 0,
		});

		gsap.set(lineThreeRef.current, {
			width: '0%',
			opacity: 0,
		});

		gsap.set(verticalLineRef.current, {
			y: '-100%',
			opacity: 0,
		});

		gsap.set(shimmerRef.current, {
			x: '-100%',
		});

		const tl = gsap.timeline({
			defaults: {
				ease: 'power2.inOut',
			},
		});

		tl
			// Fade in container
			.to(containerRef.current, {
				opacity: 1,
				duration: 0.1,
				ease: 'power2.out',
			})
			// First horizontal line slides in from left
			.to(
				lineOneRef.current,
				{
					x: '0%',
					opacity: 0.85,
					duration: 0.3,
					ease: 'power3.out',
				},
				'-=0.05'
			)
			// Second horizontal line slides in from right
			.to(
				lineTwoRef.current,
				{
					x: '0%',
					opacity: 0.75,
					duration: 0.35,
					ease: 'power3.out',
				},
				'-=0.25'
			)
			// Center line expands
			.to(
				lineThreeRef.current,
				{
					width: '100%',
					opacity: 0.9,
					duration: 0.4,
					ease: 'power2.inOut',
				},
				'-=0.3'
			)
			// Vertical line descends
			.to(
				verticalLineRef.current,
				{
					y: '0%',
					opacity: 0.7,
					duration: 0.4,
					ease: 'power2.out',
				},
				'-=0.35'
			)
			// White overlay builds
			.to(
				whiteOverlayRef.current,
				{
					opacity: 0.7,
					duration: 0.25,
					ease: 'power2.inOut',
				},
				'-=0.2'
			)
			// Subtle shimmer
			.to(
				shimmerRef.current,
				{
					x: '150%',
					duration: 0.5,
					ease: 'power1.inOut',
				},
				'-=0.4'
			)
			// Brief pause (removed - no pause needed)
			// Exit animation - lines fade out
			.to(
				[
					lineOneRef.current,
					lineTwoRef.current,
					lineThreeRef.current,
					verticalLineRef.current,
				],
				{
					opacity: 0,
					duration: 0.2,
					stagger: 0.03,
					ease: 'power2.in',
				}
			)
			// Final white fade
			.to(
				whiteOverlayRef.current,
				{
					opacity: 1,
					duration: 0.2,
					ease: 'power2.in',
				},
				'-=0.15'
			)
			// Hold white screen briefly (reduced)
			.to(
				{},
				{
					duration: 0.05,
				}
			)
			// Navigate when fully white
			.call(() => {
				onComplete();
			})
			// Keep white overlay a bit longer to cover page load (reduced)
			.to(
				{},
				{
					duration: 0.1,
				}
			)
			// Final container fade
			.to(containerRef.current, {
				opacity: 0,
				duration: 0.1,
				ease: 'power2.out',
			});

		return () => {
			tl.kill();

			// Re-enable scrolling when transition completes
			const scrollY = document.body.style.top;
			document.body.style.overflow = '';
			document.body.style.overflowX = '';
			document.body.style.overflowY = '';
			document.body.style.position = '';
			document.body.style.width = '';
			document.body.style.top = '';
			document.body.style.touchAction = ''; // Re-enable touch scrolling
			document.documentElement.style.overflow = ''; // Reset html element
			if (scrollY) {
				window.scrollTo(0, parseInt(scrollY || '0') * -1);
			}
		};
	}, [isActive, onComplete, isChrome]);

	// Never render overlay on non-Chrome browsers
	if (!isActive || !isChrome) return null;

	return (
		<div
			ref={containerRef}
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				width: '100vw',
				height: '100vh',
				zIndex: 99999,
				pointerEvents: 'all', // Changed to 'all' to block all interactions
				overflow: 'hidden',
				backgroundColor: '#FFFFFF',
				touchAction: 'none', // Prevent any touch gestures
				WebkitTransform: 'translateZ(0)', // Safari GPU acceleration
				WebkitBackfaceVisibility: 'hidden', // Safari flicker fix
			}}
		>
			{/* Pure white overlay */}
			<div
				ref={whiteOverlayRef}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					zIndex: 10,
					backgroundColor: '#FFFFFF',
					opacity: 0,
				}}
			/>

			{/* First horizontal line - slides from left */}
			<div
				ref={lineOneRef}
				style={{
					position: 'absolute',
					top: '30%',
					left: 0,
					width: '100%',
					height: '4px',
					zIndex: 2,
					background:
						'linear-gradient(90deg, transparent 0%, #C0C0C0 20%, #C0C0C0 80%, transparent 100%)',
					opacity: 0,
				}}
			/>

			{/* Second horizontal line - slides from right */}
			<div
				ref={lineTwoRef}
				style={{
					position: 'absolute',
					top: '65%',
					left: 0,
					width: '100%',
					height: '3px',
					zIndex: 2,
					background:
						'linear-gradient(90deg, transparent 0%, #D3D3D3 15%, #D3D3D3 85%, transparent 100%)',
					opacity: 0,
				}}
			/>

			{/* Center expanding line */}
			<div
				ref={lineThreeRef}
				style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					width: '0%',
					height: '6px',
					transform: 'translate(-50%, -50%)',
					zIndex: 3,
					background:
						'linear-gradient(90deg, transparent 0%, #B8B8B8 35%, #B8B8B8 65%, transparent 100%)',
					opacity: 0,
				}}
			/>

			{/* Vertical line - descends from top */}
			<div
				ref={verticalLineRef}
				style={{
					position: 'absolute',
					top: 0,
					left: '70%',
					width: '3px',
					height: '100%',
					zIndex: 2,
					background:
						'linear-gradient(180deg, transparent 0%, #CCCCCC 25%, #CCCCCC 75%, transparent 100%)',
					opacity: 0,
				}}
			/>

			{/* Premium subtle shimmer */}
			<div
				ref={shimmerRef}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					zIndex: 4,
					background: `
						linear-gradient(
							90deg,
							transparent 30%,
							rgba(255, 255, 255, 0.5) 50%,
							transparent 70%
						)
					`,
					filter: 'blur(60px)',
					pointerEvents: 'none',
				}}
			/>
		</div>
	);
};
