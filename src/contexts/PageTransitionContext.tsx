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

interface PageTransitionContextType {
	isTransitioning: boolean;
	startTransition: (to: string) => void;
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined);

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

export const PageTransitionProvider: React.FC<PageTransitionProviderProps> = ({ children }) => {
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [transitionTo, setTransitionTo] = useState<string | null>(null);
	const router = useRouter();

	const startTransition = useCallback((to: string) => {
		setIsTransitioning(true);
		setTransitionTo(to);
	}, []);

	const onTransitionComplete = useCallback(() => {
		if (transitionTo) {
			// Navigate immediately
			router.push(transitionTo);
			// Keep the animation mounted until it finishes
			setTimeout(() => {
				setIsTransitioning(false);
				setTransitionTo(null);
			}, 500); // Give animation time to complete fade out
		}
	}, [router, transitionTo]);

	return (
		<PageTransitionContext.Provider value={{ isTransitioning, startTransition }}>
			{children}
			{isTransitioning && (
				<PageTransition isActive={isTransitioning} onComplete={onTransitionComplete} />
			)}
		</PageTransitionContext.Provider>
	);
};

// Digital art transition - Pure noise and distortion
import { gsap } from 'gsap';

const PageTransition = ({
	isActive,
	onComplete,
}: {
	isActive: boolean;
	onComplete: () => void;
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const noiseLayerRef = useRef<HTMLDivElement>(null);
	const distortionRef = useRef<HTMLDivElement>(null);
	const staticRef = useRef<HTMLDivElement>(null);
	const scanLinesRef = useRef<HTMLDivElement>(null);
	const chromaRef = useRef<HTMLDivElement>(null);
	const welcomeTextRef = useRef<HTMLDivElement>(null);
	const glitchText1Ref = useRef<HTMLDivElement>(null);
	const glitchText2Ref = useRef<HTMLDivElement>(null);
	const continueTextRef = useRef<HTMLDivElement>(null);
	const [noiseFrame, setNoiseFrame] = useState(0);
	const [waitingForClick, setWaitingForClick] = useState(false);

	useEffect(() => {
		if (!isActive) return;
		
		// Animated noise generator
		const noiseInterval = setInterval(() => {
			setNoiseFrame(prev => prev + 1);
		}, 50);

		if (!containerRef.current || !noiseLayerRef.current || !distortionRef.current || 
			!staticRef.current || !scanLinesRef.current || !chromaRef.current ||
			!welcomeTextRef.current || !glitchText1Ref.current || !glitchText2Ref.current ||
			!continueTextRef.current) {
			return () => clearInterval(noiseInterval);
		}

		// Initial state - everything starts subtle
		gsap.set(containerRef.current, { 
			display: 'block',
			backgroundColor: '#000',
		});

		gsap.set([noiseLayerRef.current, distortionRef.current, staticRef.current], {
			opacity: 0,
		});

		gsap.set(scanLinesRef.current, {
			opacity: 0,
			y: '-100%',
		});

		gsap.set(chromaRef.current, {
			opacity: 0,
		});
		
		// Welcome text initial state
		gsap.set([welcomeTextRef.current, glitchText1Ref.current, glitchText2Ref.current, continueTextRef.current], {
			opacity: 0,
		});

		const tl = gsap.timeline({ 
			defaults: { 
				ease: 'none' // Raw, no easing for digital effect
			} 
		});

		tl
			// Phase 1: Static builds
			.to(staticRef.current, {
				opacity: 0.3,
				duration: 0.2,
			})
			.to(noiseLayerRef.current, {
				opacity: 0.6,
				duration: 0.3,
			}, '<')
			// Phase 2: Distortion intensifies
			.to(distortionRef.current, {
				opacity: 1,
				duration: 0.4,
			})
			.to(containerRef.current, {
				filter: 'contrast(2) brightness(1.5) saturate(0)',
				duration: 0.3,
			}, '<')
			// Scan lines sweep
			.to(scanLinesRef.current, {
				opacity: 0.8,
				y: '100%',
				duration: 0.8,
				ease: 'power2.inOut',
			}, '-=0.2')
			// Chromatic aberration peaks
			.to(chromaRef.current, {
				opacity: 0.7,
				duration: 0.2,
			}, '-=0.4')
			// Maximum distortion
			.to(containerRef.current, {
				filter: 'contrast(5) brightness(2) saturate(0) blur(2px)',
				duration: 0.2,
			})
			.to([noiseLayerRef.current, staticRef.current], {
				opacity: 1,
				duration: 0.1,
			}, '<')
			// Welcome text appears through the chaos
			.to([glitchText1Ref.current, glitchText2Ref.current], {
				opacity: 0.3,
				duration: 0.05,
				stagger: 0.02,
			}, '-=0.1')
			.to(welcomeTextRef.current, {
				opacity: 1,
				duration: 0.1,
			}, '<')
			// Glitch flicker effect on text
			.to([welcomeTextRef.current, glitchText1Ref.current, glitchText2Ref.current], {
				opacity: 0,
				duration: 0.02,
			})
			.to(welcomeTextRef.current, {
				opacity: 1,
				duration: 0.02,
			})
			.to([glitchText1Ref.current, glitchText2Ref.current], {
				opacity: 0.5,
				duration: 0.02,
			}, '<')
			.to([glitchText1Ref.current, glitchText2Ref.current], {
				opacity: 0,
				duration: 0.05,
			})
			.to(welcomeTextRef.current, {
				opacity: 1,
				duration: 0.2,
			}, '<')
			// Fade out most noise but keep subtle background
			.to([noiseLayerRef.current, distortionRef.current], {
				opacity: 0.1,
				duration: 0.3,
			})
			.to(staticRef.current, {
				opacity: 0.05,
				duration: 0.3,
			}, '<')
			// Show continue text with fade in
			.to(continueTextRef.current, {
				opacity: 0.7,
				duration: 0.5,
			})
			// Pause here and wait for click
			.call(() => {
				setWaitingForClick(true);
				tl.pause();
			});
		
		// Handle click to continue
		const handleClick = () => {
			if (waitingForClick) {
				setWaitingForClick(false);
				
				// Navigate immediately while exit animation plays
				onComplete();
				
				// Create exit timeline
				const exitTl = gsap.timeline();
				
				exitTl
					// Smooth fade out everything
					.to([welcomeTextRef.current, glitchText1Ref.current, glitchText2Ref.current, continueTextRef.current], {
						opacity: 0,
						duration: 0.4,
						stagger: 0.05,
						ease: 'power2.inOut',
					})
					.to(containerRef.current, {
						opacity: 0,
						duration: 0.5,
						ease: 'power2.inOut',
					}, '-=0.3');
			}
		};
		
		// Add click listener
		if (containerRef.current) {
			containerRef.current.addEventListener('click', handleClick);
		}

		return () => {
			clearInterval(noiseInterval);
			tl.kill();
			if (containerRef.current) {
				containerRef.current.removeEventListener('click', handleClick);
			}
		};
	}, [isActive, onComplete, waitingForClick]);

	if (!isActive) return null;

	// Generate random noise pattern
	const noisePattern = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${0.9 + (noiseFrame % 10) * 0.01}' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E`;

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
				pointerEvents: 'all',
				overflow: 'hidden',
				backgroundColor: '#000',
				cursor: waitingForClick ? 'pointer' : 'default',
			}}
		>
			{/* Heavy noise layer */}
			<div
				ref={noiseLayerRef}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					zIndex: 1,
					backgroundImage: `url("${noisePattern}")`,
					backgroundSize: 'cover',
					mixBlendMode: 'screen',
					transform: `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px)`,
				}}
			/>
			
			{/* TV static */}
			<div
				ref={staticRef}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					zIndex: 2,
					background: `
						repeating-linear-gradient(
							0deg,
							rgba(255,255,255,0.03),
							rgba(255,255,255,0.03) 1px,
							transparent 1px,
							transparent 2px
						),
						repeating-linear-gradient(
							90deg,
							rgba(255,255,255,0.03),
							rgba(255,255,255,0.03) 1px,
							transparent 1px,
							transparent 2px
						)
					`,
					backgroundSize: '3px 3px',
					animation: `static ${0.1 + Math.random() * 0.1}s infinite`,
				}}
			/>
			
			{/* Distortion waves */}
			<div
				ref={distortionRef}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					zIndex: 3,
					background: `
						linear-gradient(90deg, 
							transparent 0%, 
							rgba(255,255,255,0.1) 45%,
							rgba(255,255,255,0.2) 50%,
							rgba(255,255,255,0.1) 55%,
							transparent 100%
						)
					`,
					backgroundSize: '50px 100%',
					animation: 'distort 0.5s linear infinite',
					mixBlendMode: 'overlay',
				}}
			/>
			
			{/* Scan lines */}
			<div
				ref={scanLinesRef}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '200%',
					zIndex: 4,
					background: `
						repeating-linear-gradient(
							0deg,
							transparent,
							transparent 4px,
							rgba(255,255,255,0.03) 4px,
							rgba(255,255,255,0.03) 8px
						)
					`,
					mixBlendMode: 'overlay',
				}}
			/>
			
			{/* Chromatic aberration */}
			<div
				ref={chromaRef}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					zIndex: 5,
					background: `
						linear-gradient(45deg, 
							rgba(255,0,0,0.1) 0%,
							transparent 50%,
							rgba(0,0,255,0.1) 100%
						)
					`,
					mixBlendMode: 'screen',
					filter: 'blur(3px)',
				}}
			/>
			
			{/* Welcome text - main */}
			<div
				ref={welcomeTextRef}
				style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					zIndex: 10,
					fontFamily: 'var(--font-zen-antique)',
					fontSize: 'clamp(3rem, 8vw, 6rem)',
					color: '#FFFFFF',
					textAlign: 'center',
					letterSpacing: '0.1em',
					textShadow: `
						0 0 20px rgba(255,255,255,0.5),
						0 0 40px rgba(255,255,255,0.3),
						0 0 60px rgba(255,255,255,0.2)
					`,
					mixBlendMode: 'screen',
					whiteSpace: 'nowrap',
				}}
			>
				Welcome to Murmur
			</div>
			
			{/* Glitch text layer 1 - red offset */}
			<div
				ref={glitchText1Ref}
				style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(calc(-50% + 3px), calc(-50% - 3px))',
					zIndex: 9,
					fontFamily: 'var(--font-zen-antique)',
					fontSize: 'clamp(3rem, 8vw, 6rem)',
					color: '#FF0040',
					textAlign: 'center',
					letterSpacing: '0.1em',
					mixBlendMode: 'screen',
					whiteSpace: 'nowrap',
					filter: 'blur(1px)',
				}}
			>
				Welcome to Murmur
			</div>
			
			{/* Glitch text layer 2 - cyan offset */}
			<div
				ref={glitchText2Ref}
				style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(calc(-50% - 3px), calc(-50% + 3px))',
					zIndex: 9,
					fontFamily: 'var(--font-zen-antique)',
					fontSize: 'clamp(3rem, 8vw, 6rem)',
					color: '#00FFFF',
					textAlign: 'center',
					letterSpacing: '0.1em',
					mixBlendMode: 'screen',
					whiteSpace: 'nowrap',
					filter: 'blur(1px)',
				}}
			>
				Welcome to Murmur
			</div>
			
			{/* Click to continue text */}
			<div
				ref={continueTextRef}
				style={{
					position: 'absolute',
					top: '60%',
					left: '50%',
					transform: 'translate(-50%, 0)',
					zIndex: 10,
					fontFamily: 'var(--font-inter)',
					fontSize: 'clamp(0.9rem, 2vw, 1.2rem)',
					color: '#FFFFFF',
					textAlign: 'center',
					letterSpacing: '0.2em',
					textTransform: 'uppercase',
					opacity: 0,
					cursor: 'pointer',
					animation: waitingForClick ? 'pulse 2s ease-in-out infinite' : 'none',
				}}
			>
				Click anywhere to continue
			</div>
			
			<style>{`
				@keyframes static {
					0%, 100% { transform: translateX(0); }
					10% { transform: translateX(-2px); }
					20% { transform: translateX(2px); }
					30% { transform: translateX(-1px); }
					40% { transform: translateX(1px); }
					50% { transform: translateX(-2px); }
					60% { transform: translateX(2px); }
					70% { transform: translateX(0); }
					80% { transform: translateX(-1px); }
					90% { transform: translateX(1px); }
				}
				
				@keyframes distort {
					0% { transform: translateX(-50px) skewX(0deg); }
					25% { transform: translateX(0) skewX(0.5deg); }
					50% { transform: translateX(50px) skewX(0deg); }
					75% { transform: translateX(0) skewX(-0.5deg); }
					100% { transform: translateX(-50px) skewX(0deg); }
				}
				
				@keyframes pulse {
					0%, 100% { opacity: 0.7; }
					50% { opacity: 1; }
				}
			`}</style>
		</div>
	);
};
