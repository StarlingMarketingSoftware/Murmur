'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface FadeInUpProps {
	children: React.ReactNode;
	duration?: number;
	delay?: number;
	yOffset?: number;
	threshold?: number;
	className?: string;
	stagger?: number; // If we want to stagger children, though this component wraps a single block usually
}

export const FadeInUp = ({
	children,
	duration = 1.0,
	delay = 0,
	yOffset = 50,
	threshold = 0.1,
	className = '',
}: FadeInUpProps) => {
	const elementRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const element = elementRef.current;
		if (!element) return;

		// Set initial state
		gsap.set(element, { 
			opacity: 0, 
			y: yOffset,
			willChange: 'opacity, transform' 
		});

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						gsap.to(element, {
							opacity: 1,
							y: 0,
							duration,
							delay,
							ease: 'power4.out', // Smooth, Apple-like easing
							clearProps: 'willChange', // Clean up
						});
						observer.unobserve(entry.target);
					}
				});
			},
			{
				threshold,
				// Trigger when the top of the element is 10% into the viewport from the bottom
				rootMargin: '0px', 
			}
		);

		observer.observe(element);

		return () => {
			observer.disconnect();
			// Optional: reset on unmount if needed, but for landing page usually fine to leave
		};
	}, [duration, delay, yOffset, threshold]);

	return (
		<div ref={elementRef} className={className}>
			{children}
		</div>
	);
};
