'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';

// Type definitions
interface ScrollContextType {
	lenis: any | null;
	progress: number;
	velocity: number;
	isScrolling: boolean;
	direction: 'up' | 'down' | null;
}

const ScrollContext = createContext<ScrollContextType>({
	lenis: null,
	progress: 0,
	velocity: 0,
	isScrolling: false,
	direction: null,
});

export const useScroll = () => useContext(ScrollContext);

const LenisContext = createContext<any | null>(null);
export const useLenis = () => useContext(LenisContext);

interface ScrollProviderProps {
	children: React.ReactNode;
}

export function ScrollProvider({ children }: ScrollProviderProps) {
	const lenisRef = useRef<any | null>(null);
	const rafRef = useRef<number | null>(null);
	const [lenisInstance, setLenisInstance] = useState<any | null>(null);
	const [scrollState, setScrollState] = useState<Omit<ScrollContextType, 'lenis'>>({
		progress: 0,
		velocity: 0,
		isScrolling: false,
		direction: null,
	});
	const [isClient, setIsClient] = useState(false);

	// Route and device detection
	const pathname = usePathname();
	const isMobile = useIsMobile();

	useEffect(() => {
		// Only run on client
		setIsClient(true);
	}, []);

	useEffect(() => {
		// Skip if not on client or if window is not available
		if (!isClient || typeof window === 'undefined') return;

		// Disable Lenis smooth scrolling on:
		// - all mobile devices (native scrolling only)
		// - campaign pages (all devices)
		const isCampaignPage =
			typeof pathname === 'string' && pathname.startsWith('/murmur/campaign');
		
		if (isCampaignPage || isMobile === true) {
			// Ensure any existing Lenis instance is destroyed and classes updated
			try {
				if (lenisRef.current) {
					lenisRef.current.destroy();
					lenisRef.current = null;
					setLenisInstance(null);
				}
			} catch {}
			document.documentElement.classList.remove('lenis-active');
			document.documentElement.classList.add('no-smooth-scroll');
			// Provide cleanup to restore defaults when leaving campaign pages or switching to desktop
			return () => {
				document.documentElement.classList.remove('no-smooth-scroll');
			};
		}

		// If we don't yet know if it's mobile, wait to avoid flicker
		if (isMobile === null) return;

		let lenis: any;
		let ScrollTrigger: any;
		let gsap: any;
		let cleanup: (() => void) | undefined;

		// Ensure CSS override is cleared when Lenis is active elsewhere
		document.documentElement.classList.remove('no-smooth-scroll');

		// Dynamically import client-only libraries
		const initializeScroll = async () => {
			try {
				// Dynamic imports for Vercel deployment
				const [lenisModule, gsapModule, scrollTriggerModule] = await Promise.all([
					import('lenis'),
					import('gsap'),
					import('gsap/ScrollTrigger'),
				]);

				const Lenis = lenisModule.default;
				gsap = gsapModule.gsap;
				ScrollTrigger = scrollTriggerModule.ScrollTrigger;

				// Register ScrollTrigger
				gsap.registerPlugin(ScrollTrigger);

				// Initialize Lenis with advanced smooth scrolling
				lenis = new Lenis({
					duration: 1.2,
					easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
					orientation: 'vertical',
					gestureOrientation: 'vertical',
					smoothWheel: true,
					wheelMultiplier: 1,
					touchMultiplier: 2,
					infinite: false,
				});

				lenisRef.current = lenis;
				setLenisInstance(lenis);

				// Add class to HTML element when Lenis is active
				document.documentElement.classList.add('lenis-active');

				// Sync Lenis with GSAP ScrollTrigger
				lenis.on('scroll', ScrollTrigger.update);

				// Animation frame handling
				const raf = (time: number) => {
					lenis.raf(time * 1000);
				};

				gsap.ticker.add(raf);
				gsap.ticker.lagSmoothing(0);

				// Update scroll state
				lenis.on('scroll', ({ progress, velocity, direction }: any) => {
					setScrollState({
						progress: progress || 0,
						velocity: velocity || 0,
						isScrolling: Math.abs(velocity || 0) > 0.01,
						direction: direction > 0 ? 'down' : direction < 0 ? 'up' : null,
					});
				});

				// Handle window resize
				const handleResize = () => {
					lenis.resize();
					ScrollTrigger.refresh();
				};

				window.addEventListener('resize', handleResize);

				// Refresh ScrollTrigger after DOM updates
				const refreshTimeout = setTimeout(() => {
					ScrollTrigger.refresh();
				}, 100);

				// Cleanup function
				cleanup = () => {
					clearTimeout(refreshTimeout);
					window.removeEventListener('resize', handleResize);
					document.documentElement.classList.remove('lenis-active');
					setLenisInstance(null);
					if (lenis) {
						lenis.destroy();
					}
					if (gsap) {
						gsap.ticker.remove(raf);
					}
					if (rafRef.current) {
						cancelAnimationFrame(rafRef.current);
					}
				};
			} catch (error) {
				console.warn('Failed to initialize smooth scrolling:', error);
				// Fallback to native scrolling
			}
		};

		initializeScroll();

		return () => {
			if (cleanup) {
				cleanup();
			}
		};
	}, [isClient, pathname, isMobile]);

	return (
		<LenisContext.Provider value={lenisInstance}>
			<ScrollContext.Provider value={{ lenis: lenisInstance, ...scrollState }}>
				{children}
			</ScrollContext.Provider>
		</LenisContext.Provider>
	);
}
