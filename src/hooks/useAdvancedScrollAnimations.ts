'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export const useAdvancedScrollAnimations = () => {
	const pathname = usePathname();
	const isHomePage = pathname === '/';
	const animatedElements = useRef<Map<string, Set<HTMLElement>>>(new Map());
	const triggersRef = useRef<any[]>([]);
	const [isReady, setIsReady] = useState(false);
	const gsapRef = useRef<any>(null);
	const ScrollTriggerRef = useRef<any>(null);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		// Dynamic imports for Vercel deployment
		const loadAnimationLibraries = async () => {
			try {
				const [gsapModule, scrollTriggerModule] = await Promise.all([
					import('gsap'),
					import('gsap/ScrollTrigger'),
				]);

				gsapRef.current = gsapModule.gsap;
				ScrollTriggerRef.current = scrollTriggerModule.ScrollTrigger;

				// Register ScrollTrigger
				gsapRef.current.registerPlugin(ScrollTriggerRef.current);

				setIsReady(true);
			} catch (error) {
				console.warn('Failed to load animation libraries:', error);
			}
		};

		loadAnimationLibraries();

		return () => {
			// Clean up all triggers
			triggersRef.current.forEach((trigger) => {
				if (trigger && trigger.kill) trigger.kill();
			});
			triggersRef.current = [];
			animatedElements.current.clear();
		};
	}, []);

	useEffect(() => {
		if (!isReady || typeof window === 'undefined') return;

		const gsap = gsapRef.current;
		const ScrollTrigger = ScrollTriggerRef.current;

		if (!gsap || !ScrollTrigger) return;

		// Small delay to ensure DOM and Lenis are ready
		const timer = setTimeout(() => {
			// Clean up any existing triggers
			triggersRef.current.forEach((trigger) => {
				if (trigger && trigger.kill) trigger.kill();
			});
			triggersRef.current = [];

			// Process each animation type
			animatedElements.current.forEach((elements, animationType) => {
				elements.forEach((element) => {
					if (!element) return;

					switch (animationType) {
						case 'fadeIn':
							// Only apply fade animations on homepage
							if (isHomePage) {
								setupFadeAnimation(element, gsap, ScrollTrigger);
							} else {
								// On other pages, just make elements visible
								gsap.set(element, { opacity: 1 });
							}
							break;

						case 'parallax':
							setupParallaxAnimation(element, gsap, ScrollTrigger);
							break;

						case 'reveal':
							setupRevealAnimation(element, gsap, ScrollTrigger);
							break;

						case 'slideUp':
							setupSlideUpAnimation(element, gsap, ScrollTrigger);
							break;

						case 'scaleIn':
							setupScaleAnimation(element, gsap, ScrollTrigger);
							break;

						case 'stagger':
							setupStaggerAnimation(element, gsap, ScrollTrigger);
							break;

						case 'sticky':
							setupStickyAnimation(element, gsap, ScrollTrigger);
							break;

						case 'textReveal':
							setupTextRevealAnimation(element, gsap, ScrollTrigger);
							break;

						case 'morphing':
							setupMorphingAnimation(element, gsap, ScrollTrigger);
							break;

						default:
							// Default to reveal animation for all pages
							setupRevealAnimation(element, gsap, ScrollTrigger);
					}
				});
			});

			// Refresh ScrollTrigger after all animations are set up
			ScrollTrigger.refresh(true);
		}, 200);

		return () => {
			clearTimeout(timer);
			// Clean up all triggers
			triggersRef.current.forEach((trigger) => {
				if (trigger && trigger.kill) trigger.kill();
			});
			triggersRef.current = [];
			animatedElements.current.clear();
		};
	}, [isReady, isHomePage, pathname]);

	// Helper function to add elements for animation
	const addAnimation = (element: HTMLElement | null, type: string) => {
		if (!element) return;

		if (!animatedElements.current.has(type)) {
			animatedElements.current.set(type, new Set());
		}
		animatedElements.current.get(type)!.add(element);
	};

	// Animation setup functions
	function setupFadeAnimation(element: HTMLElement, gsap: any, ScrollTrigger: any) {
		// Homepage-only fade animations with continuous fade in/out
		gsap.set(element, {
			opacity: 0,
			willChange: 'opacity',
		});

		const trigger = ScrollTrigger.create({
			trigger: element,
			start: 'top 90%',
			end: 'bottom 10%',
			onEnter: () => {
				gsap.to(element, {
					opacity: 1,
					duration: 0.8,
					ease: 'power2.out',
				});
			},
			onLeave: () => {
				gsap.to(element, {
					opacity: 0,
					duration: 0.4,
					ease: 'power2.in',
				});
			},
			onEnterBack: () => {
				gsap.to(element, {
					opacity: 1,
					duration: 0.8,
					ease: 'power2.out',
				});
			},
			onLeaveBack: () => {
				gsap.to(element, {
					opacity: 0,
					duration: 0.4,
					ease: 'power2.in',
				});
			},
		});

		triggersRef.current.push(trigger);
	}

	function setupParallaxAnimation(element: HTMLElement, gsap: any, ScrollTrigger: any) {
		// Advanced parallax effect
		const speed = parseFloat(element.dataset.parallaxSpeed || '0.5');

		gsap.set(element, {
			willChange: 'transform',
		});

		const trigger = ScrollTrigger.create({
			trigger: element,
			start: 'top bottom',
			end: 'bottom top',
			scrub: 1.5, // Smooth scrubbing for parallax
			onUpdate: (self: any) => {
				const yPos = -(self.progress * 100 * speed);
				gsap.to(element, {
					y: yPos,
					ease: 'none',
					duration: 0,
					overwrite: 'auto',
				});
			},
		});

		triggersRef.current.push(trigger);
	}

	function setupRevealAnimation(element: HTMLElement, gsap: any, ScrollTrigger: any) {
		// Premium reveal with slide and fade
		gsap.set(element, {
			opacity: 0,
			y: 60,
			willChange: 'transform, opacity',
		});

		const trigger = ScrollTrigger.create({
			trigger: element,
			start: 'top 85%',
			once: true, // Only animate once for reveals
			onEnter: () => {
				gsap.to(element, {
					opacity: 1,
					y: 0,
					duration: 1,
					ease: 'power3.out',
				});
			},
		});

		triggersRef.current.push(trigger);
	}

	function setupSlideUpAnimation(element: HTMLElement, gsap: any, ScrollTrigger: any) {
		// Slide up from bottom
		gsap.set(element, {
			opacity: 0,
			y: 100,
			willChange: 'transform, opacity',
		});

		const trigger = ScrollTrigger.create({
			trigger: element,
			start: 'top 80%',
			once: true,
			onEnter: () => {
				gsap.to(element, {
					opacity: 1,
					y: 0,
					duration: 1.2,
					ease: 'power4.out',
				});
			},
		});

		triggersRef.current.push(trigger);
	}

	function setupScaleAnimation(element: HTMLElement, gsap: any, ScrollTrigger: any) {
		// Scale in animation
		gsap.set(element, {
			opacity: 0,
			scale: 0.85,
			willChange: 'transform, opacity',
		});

		const trigger = ScrollTrigger.create({
			trigger: element,
			start: 'top 85%',
			once: true,
			onEnter: () => {
				gsap.to(element, {
					opacity: 1,
					scale: 1,
					duration: 1,
					ease: 'power2.out',
				});
			},
		});

		triggersRef.current.push(trigger);
	}

	function setupStaggerAnimation(element: HTMLElement, gsap: any, ScrollTrigger: any) {
		// Stagger children animations
		const children = element.children;
		if (!children.length) return;

		gsap.set(children, {
			opacity: 0,
			y: 40,
			willChange: 'transform, opacity',
		});

		const trigger = ScrollTrigger.create({
			trigger: element,
			start: 'top 80%',
			once: true,
			onEnter: () => {
				gsap.to(children, {
					opacity: 1,
					y: 0,
					duration: 0.8,
					ease: 'power3.out',
					stagger: 0.15, // Stagger delay between children
				});
			},
		});

		triggersRef.current.push(trigger);
	}

	function setupStickyAnimation(element: HTMLElement, gsap: any, ScrollTrigger: any) {
		// Sticky section with progress-based animations
		const progress = element.querySelector('[data-progress]');

		if (progress) {
			const trigger = ScrollTrigger.create({
				trigger: element,
				start: 'top top',
				end: 'bottom bottom',
				pin: true,
				pinSpacing: false,
				scrub: 1,
				onUpdate: (self: any) => {
					// Update progress indicator
					if (progress) {
						gsap.to(progress, {
							scaleY: self.progress,
							ease: 'none',
							duration: 0,
						});
					}
				},
			});

			triggersRef.current.push(trigger);
		}
	}

	function setupTextRevealAnimation(element: HTMLElement, gsap: any, ScrollTrigger: any) {
		// Text reveal animation (line by line)
		const lines = element.querySelectorAll('.line');

		if (lines.length > 0) {
			gsap.set(lines, {
				opacity: 0,
				y: 20,
				willChange: 'transform, opacity',
			});

			const trigger = ScrollTrigger.create({
				trigger: element,
				start: 'top 75%',
				once: true,
				onEnter: () => {
					gsap.to(lines, {
						opacity: 1,
						y: 0,
						duration: 0.8,
						ease: 'power3.out',
						stagger: 0.1,
					});
				},
			});

			triggersRef.current.push(trigger);
		} else {
			// Fallback to regular reveal
			setupRevealAnimation(element, gsap, ScrollTrigger);
		}
	}

	function setupMorphingAnimation(element: HTMLElement, gsap: any, ScrollTrigger: any) {
		// Morphing/shape-shifting animation on scroll
		const trigger = ScrollTrigger.create({
			trigger: element,
			start: 'top bottom',
			end: 'bottom top',
			scrub: 1.5,
			onUpdate: (self: any) => {
				const progress = self.progress;
				const rotation = progress * 5;
				const scale = 1 + progress * 0.1;

				gsap.to(element, {
					rotation,
					scale,
					ease: 'none',
					duration: 0,
				});
			},
		});

		triggersRef.current.push(trigger);
	}

	return {
		// Main animation methods
		addFadeIn: (el: HTMLElement | null) => addAnimation(el, 'fadeIn'),
		addParallax: (el: HTMLElement | null) => addAnimation(el, 'parallax'),
		addReveal: (el: HTMLElement | null) => addAnimation(el, 'reveal'),
		addSlideUp: (el: HTMLElement | null) => addAnimation(el, 'slideUp'),
		addScaleIn: (el: HTMLElement | null) => addAnimation(el, 'scaleIn'),
		addStagger: (el: HTMLElement | null) => addAnimation(el, 'stagger'),
		addSticky: (el: HTMLElement | null) => addAnimation(el, 'sticky'),
		addTextReveal: (el: HTMLElement | null) => addAnimation(el, 'textReveal'),
		addMorphing: (el: HTMLElement | null) => addAnimation(el, 'morphing'),

		// Legacy methods for compatibility
		addTextSlide: (el: HTMLElement | null) =>
			addAnimation(el, isHomePage ? 'fadeIn' : 'reveal'),
		addContainerFade: (el: HTMLElement | null) =>
			addAnimation(el, isHomePage ? 'fadeIn' : 'reveal'),
		addLuxuryFade: (el: HTMLElement | null) =>
			addAnimation(el, isHomePage ? 'fadeIn' : 'reveal'),
		addSlideInLeft: (el: HTMLElement | null) => addAnimation(el, 'slideUp'),
		addSlideInRight: (el: HTMLElement | null) => addAnimation(el, 'slideUp'),
	};
};
