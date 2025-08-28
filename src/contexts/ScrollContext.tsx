'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

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

interface ScrollProviderProps {
	children: React.ReactNode;
}

export function ScrollProvider({ children }: ScrollProviderProps) {
	const lenisRef = useRef<any | null>(null);
	const rafRef = useRef<number | null>(null);
	const [scrollState, setScrollState] = useState<Omit<ScrollContextType, 'lenis'>>({
		progress: 0,
		velocity: 0,
		isScrolling: false,
		direction: null,
	});
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		// Only run on client
		setIsClient(true);
	}, []);

	useEffect(() => {
		// Skip if not on client or if window is not available
		if (!isClient || typeof window === 'undefined') return;

		let lenis: any;
		let ScrollTrigger: any;
		let gsap: any;
		let cleanup: (() => void) | undefined;

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
	}, [isClient]);

	return (
		<ScrollContext.Provider value={{ lenis: lenisRef.current, ...scrollState }}>
			{children}
		</ScrollContext.Provider>
	);
}
