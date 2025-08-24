'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';

export const useMobileAppComingSoon = () => {
	const router = useRouter();

	// Refs for animated lines
	const lineOneRef = useRef<HTMLDivElement>(null);
	const lineTwoRef = useRef<HTMLDivElement>(null);
	const lineThreeRef = useRef<HTMLDivElement>(null);
	const lineFourRef = useRef<HTMLDivElement>(null);
	const lineFiveRef = useRef<HTMLDivElement>(null);
	const verticalLineOneRef = useRef<HTMLDivElement>(null);
	const verticalLineTwoRef = useRef<HTMLDivElement>(null);
	const shimmerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Disable scrolling on this page
		document.body.style.overflow = 'hidden';
		document.body.style.position = 'fixed';
		document.body.style.width = '100%';
		document.body.style.touchAction = 'none';

		// Set up continuous line animations
		const tl = gsap.timeline({ repeat: -1 });

		// Horizontal lines moving at different speeds
		if (lineOneRef.current) {
			gsap.fromTo(
				lineOneRef.current,
				{ x: '-100%', opacity: 0 },
				{
					x: '200%',
					opacity: 0.3,
					duration: 12,
					ease: 'none',
					repeat: -1,
					repeatDelay: 3,
				}
			);
		}

		if (lineTwoRef.current) {
			gsap.fromTo(
				lineTwoRef.current,
				{ x: '100%', opacity: 0 },
				{
					x: '-200%',
					opacity: 0.2,
					duration: 15,
					ease: 'none',
					repeat: -1,
					repeatDelay: 5,
				}
			);
		}

		if (lineThreeRef.current) {
			gsap.fromTo(
				lineThreeRef.current,
				{ width: '0%', opacity: 0 },
				{
					width: '100%',
					opacity: 0.25,
					duration: 8,
					ease: 'power2.inOut',
					repeat: -1,
					yoyo: true,
					repeatDelay: 2,
				}
			);
		}

		if (lineFourRef.current) {
			gsap.fromTo(
				lineFourRef.current,
				{ x: '-100%', opacity: 0 },
				{
					x: '200%',
					opacity: 0.15,
					duration: 18,
					ease: 'none',
					repeat: -1,
					repeatDelay: 4,
				}
			);
		}

		if (lineFiveRef.current) {
			gsap.fromTo(
				lineFiveRef.current,
				{ x: '100%', opacity: 0 },
				{
					x: '-200%',
					opacity: 0.2,
					duration: 10,
					ease: 'none',
					repeat: -1,
					repeatDelay: 6,
				}
			);
		}

		// Vertical lines
		if (verticalLineOneRef.current) {
			gsap.fromTo(
				verticalLineOneRef.current,
				{ y: '-100%', opacity: 0 },
				{
					y: '200%',
					opacity: 0.15,
					duration: 14,
					ease: 'none',
					repeat: -1,
					repeatDelay: 3,
				}
			);
		}

		if (verticalLineTwoRef.current) {
			gsap.fromTo(
				verticalLineTwoRef.current,
				{ y: '100%', opacity: 0 },
				{
					y: '-200%',
					opacity: 0.1,
					duration: 20,
					ease: 'none',
					repeat: -1,
					repeatDelay: 7,
				}
			);
		}

		// Shimmer effect
		if (shimmerRef.current) {
			gsap.fromTo(
				shimmerRef.current,
				{ x: '-100%' },
				{
					x: '200%',
					duration: 25,
					ease: 'none',
					repeat: -1,
					repeatDelay: 8,
				}
			);
		}

		// Cleanup
		return () => {
			document.body.style.overflow = '';
			document.body.style.position = '';
			document.body.style.width = '';
			document.body.style.touchAction = '';
			tl.kill();
		};
	}, []);

	const handleGoBack = () => {
		router.back();
	};

	return {
		lineOneRef,
		lineTwoRef,
		lineThreeRef,
		lineFourRef,
		lineFiveRef,
		verticalLineOneRef,
		verticalLineTwoRef,
		shimmerRef,
		handleGoBack,
	};
};
