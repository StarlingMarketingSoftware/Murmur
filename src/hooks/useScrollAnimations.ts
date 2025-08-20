'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
	gsap.registerPlugin(ScrollTrigger);
}

interface ScrollAnimationOptions {
	delay?: number;
	duration?: number;
	y?: number;
	stagger?: number;
}

export const useScrollAnimations = () => {
	const fadeInRef = useRef<HTMLElement[]>([]);
	const triggersRef = useRef<ScrollTrigger[]>([]);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		// Small delay to ensure DOM is ready
		const timer = setTimeout(() => {
			// Clean up any existing triggers
			triggersRef.current.forEach(trigger => trigger.kill());
			triggersRef.current = [];

			// Continuous opacity fade in/out - triggers every time you scroll
			fadeInRef.current.forEach((element) => {
				if (!element) return;
				
				// Check if this element should have continuous animations
				// Skip ProductList specifically to avoid hover issues
				const isProductList = element.querySelector('[data-product-list]') || 
									  element.closest('[data-product-list]');
				
				if (isProductList) {
					// For product list, just do a one-time fade in
					gsap.set(element, { opacity: 0 });
					
					const trigger = ScrollTrigger.create({
						trigger: element,
						start: 'top 90%',
						onEnter: () => {
							gsap.to(element, {
								opacity: 1,
								duration: 0.6,
								ease: 'power2.out',
							});
						},
						once: true, // Only animate once for interactive elements
					});
					
					triggersRef.current.push(trigger);
					return;
				}
				
				// Set initial state for regular elements
				gsap.set(element, {
					opacity: 0,
				});

				const trigger = ScrollTrigger.create({
					trigger: element,
					start: 'top 90%', // Similar to PointOne's trigger point
					end: 'bottom 10%', // Keep elements visible in viewport
					scrub: false, // Don't tie to scroll position directly
					onEnter: () => {
						// Scrolling down - element enters viewport from bottom
						gsap.to(element, {
							opacity: 1,
							duration: 0.6, // Quick but smooth like PointOne
							ease: 'power2.out', // Smooth deceleration
							overwrite: 'auto', // Auto manage animations
						});
					},
					onLeave: () => {
						// Scrolling down - element leaves viewport from top
						gsap.to(element, {
							opacity: 0,
							duration: 0.3, // Quick fade out
							ease: 'power2.in',
							overwrite: 'auto',
						});
					},
					onEnterBack: () => {
						// Scrolling up - element re-enters viewport from top
						gsap.to(element, {
							opacity: 1,
							duration: 0.6, // Consistent with enter
							ease: 'power2.out',
							overwrite: 'auto',
						});
					},
					onLeaveBack: () => {
						// Scrolling up - element leaves viewport from bottom
						gsap.to(element, {
							opacity: 0,
							duration: 0.3, // Quick fade out
							ease: 'power2.in',
							overwrite: 'auto',
						});
					},
				});
				
				triggersRef.current.push(trigger);
			});

			// Refresh ScrollTrigger to recalculate positions
			ScrollTrigger.refresh();
		}, 100); // Small delay to ensure DOM is ready

		return () => {
			clearTimeout(timer);
			// Clean up all triggers
			triggersRef.current.forEach(trigger => trigger.kill());
			triggersRef.current = [];
			fadeInRef.current = [];
		};
	}, []);

	const addFadeIn = (element: HTMLElement | null) => {
		if (element && !fadeInRef.current.includes(element)) {
			fadeInRef.current.push(element);
		}
	};

	// All animations map to the same pure fade in
	const addContainerFade = addFadeIn;
	const addTextSlide = addFadeIn; // No sliding, just fade
	const addLuxuryFade = addFadeIn;
	const addScaleIn = addFadeIn;
	const addSlideInLeft = addFadeIn;
	const addSlideInRight = addFadeIn;
	const addParallax = addFadeIn;

	return {
		// Primary method
		addFadeIn,
		
		// All other methods map to fade in for consistency
		addContainerFade,
		addTextSlide,
		addLuxuryFade,
		addScaleIn,
		addSlideInLeft,
		addSlideInRight,
		addParallax,
	};
};
