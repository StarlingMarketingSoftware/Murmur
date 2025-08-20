'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LogoIcon from '@/components/atoms/_svg/LogoIcon';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { gsap } from 'gsap';

export const MobileAppComingSoon: React.FC = () => {
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
			gsap.fromTo(lineOneRef.current, 
				{ x: '-100%', opacity: 0 },
				{ 
					x: '200%', 
					opacity: 0.3,
					duration: 12,
					ease: 'none',
					repeat: -1,
					repeatDelay: 3
				}
			);
		}

		if (lineTwoRef.current) {
			gsap.fromTo(lineTwoRef.current, 
				{ x: '100%', opacity: 0 },
				{ 
					x: '-200%', 
					opacity: 0.2,
					duration: 15,
					ease: 'none',
					repeat: -1,
					repeatDelay: 5
				}
			);
		}

		if (lineThreeRef.current) {
			gsap.fromTo(lineThreeRef.current, 
				{ width: '0%', opacity: 0 },
				{ 
					width: '100%', 
					opacity: 0.25,
					duration: 8,
					ease: 'power2.inOut',
					repeat: -1,
					yoyo: true,
					repeatDelay: 2
				}
			);
		}

		if (lineFourRef.current) {
			gsap.fromTo(lineFourRef.current, 
				{ x: '-100%', opacity: 0 },
				{ 
					x: '200%', 
					opacity: 0.15,
					duration: 18,
					ease: 'none',
					repeat: -1,
					repeatDelay: 4
				}
			);
		}

		if (lineFiveRef.current) {
			gsap.fromTo(lineFiveRef.current, 
				{ x: '100%', opacity: 0 },
				{ 
					x: '-200%', 
					opacity: 0.2,
					duration: 10,
					ease: 'none',
					repeat: -1,
					repeatDelay: 6
				}
			);
		}

		// Vertical lines
		if (verticalLineOneRef.current) {
			gsap.fromTo(verticalLineOneRef.current, 
				{ y: '-100%', opacity: 0 },
				{ 
					y: '200%', 
					opacity: 0.15,
					duration: 14,
					ease: 'none',
					repeat: -1,
					repeatDelay: 3
				}
			);
		}

		if (verticalLineTwoRef.current) {
			gsap.fromTo(verticalLineTwoRef.current, 
				{ y: '100%', opacity: 0 },
				{ 
					y: '-200%', 
					opacity: 0.1,
					duration: 20,
					ease: 'none',
					repeat: -1,
					repeatDelay: 7
				}
			);
		}

		// Shimmer effect
		if (shimmerRef.current) {
			gsap.fromTo(shimmerRef.current, 
				{ x: '-100%' },
				{ 
					x: '200%',
					duration: 25,
					ease: 'none',
					repeat: -1,
					repeatDelay: 8
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

	return (
		<div
			className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center min-h-dvh overflow-hidden"
			style={{
				WebkitOverflowScrolling: 'touch',
				WebkitTapHighlightColor: 'transparent',
				backgroundColor: '#FFFFFF',
				touchAction: 'none',
				WebkitTransform: 'translateZ(0)', // Safari GPU acceleration
				WebkitBackfaceVisibility: 'hidden', // Safari flicker fix
			}}
		>
			{/* Animated lines overlay */}
			<div className="absolute inset-0 pointer-events-none overflow-hidden">
				{/* Horizontal lines */}
				<div
					ref={lineOneRef}
					className="absolute"
					style={{
						top: '15%',
						left: 0,
						width: '60%',
						height: '1px',
						background: 'linear-gradient(90deg, transparent, #D0D0D0, transparent)',
						opacity: 0,
					}}
				/>
				<div
					ref={lineTwoRef}
					className="absolute"
					style={{
						top: '35%',
						left: 0,
						width: '80%',
						height: '1px',
						background: 'linear-gradient(90deg, transparent, #C0C0C0, transparent)',
						opacity: 0,
					}}
				/>
				<div
					ref={lineThreeRef}
					className="absolute"
					style={{
						top: '50%',
						left: '50%',
						transform: 'translateX(-50%)',
						width: '0%',
						height: '1px',
						background: '#B8B8B8',
						opacity: 0,
					}}
				/>
				<div
					ref={lineFourRef}
					className="absolute"
					style={{
						top: '70%',
						left: 0,
						width: '70%',
						height: '1px',
						background: 'linear-gradient(90deg, transparent, #E0E0E0, transparent)',
						opacity: 0,
					}}
				/>
				<div
					ref={lineFiveRef}
					className="absolute"
					style={{
						top: '85%',
						left: 0,
						width: '50%',
						height: '1px',
						background: 'linear-gradient(90deg, transparent, #D8D8D8, transparent)',
						opacity: 0,
					}}
				/>
				
				{/* Vertical lines */}
				<div
					ref={verticalLineOneRef}
					className="absolute"
					style={{
						left: '20%',
						top: 0,
						width: '1px',
						height: '40%',
						background: 'linear-gradient(180deg, transparent, #C8C8C8, transparent)',
						opacity: 0,
					}}
				/>
				<div
					ref={verticalLineTwoRef}
					className="absolute"
					style={{
						left: '75%',
						top: 0,
						width: '1px',
						height: '50%',
						background: 'linear-gradient(180deg, transparent, #E8E8E8, transparent)',
						opacity: 0,
					}}
				/>
				
				{/* Shimmer overlay */}
				<div
					ref={shimmerRef}
					className="absolute inset-0"
					style={{
						background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
						width: '30%',
						height: '100%',
					}}
				/>
			</div>

			{/* Content */}
			<Button
				onClick={handleGoBack}
				variant="ghost"
				size="icon"
				className="absolute top-4 left-4 w-10 h-10 text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 transition-colors duration-200 active:scale-95 z-10"
				aria-label="Go back"
			>
				<ChevronLeft className="w-5 h-5" />
			</Button>

			<div className="max-w-sm w-full relative z-10">
				<div className="mb-8 flex justify-center">
					<div className="w-24 h-20">
						<LogoIcon />
					</div>
				</div>

				<Typography variant="h2" className="text-gray-700 !text-2xl font-bold">
					Mobile App
					<br />
					Coming Soon
				</Typography>
			</div>
		</div>
	);
};
