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
			// Navigate to the new page
			router.push(transitionTo);
			// Clean up transition state after navigation and fade out
			setTimeout(() => {
				setIsTransitioning(false);
				setTransitionTo(null);
			}, 500); // Keep overlay visible longer to cover page load
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

// Premium transition - yacht purchase elegance
import { gsap } from 'gsap';

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

	useEffect(() => {
		if (!isActive) return;

		// Check if gsap is available (for SSR compatibility)
		if (typeof window === 'undefined' || !gsap) return;

		if (!containerRef.current || !whiteOverlayRef.current ||
			!lineOneRef.current || !lineTwoRef.current || !lineThreeRef.current ||
			!verticalLineRef.current || !shimmerRef.current) {
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
				ease: 'power2.inOut' // Smoother, more luxurious easing
			}
		});

		tl
			// Fade in container
			.to(containerRef.current, {
				opacity: 1,
				duration: 0.2,
				ease: 'power2.out',
			})
			// First horizontal line slides in from left - Elegant
			.to(lineOneRef.current, {
				x: '0%',
				opacity: 0.85,
				duration: 0.7,
				ease: 'power3.out',
			}, '-=0.1')
			// Second horizontal line slides in from right - Elegant
			.to(lineTwoRef.current, {
				x: '0%',
				opacity: 0.75,
				duration: 0.8,
				ease: 'power3.out',
			}, '-=0.6')
			// Center line expands - Luxurious
			.to(lineThreeRef.current, {
				width: '100%',
				opacity: 0.9,
				duration: 0.9,
				ease: 'power2.inOut',
			}, '-=0.7')
			// Vertical line descends - Graceful
			.to(verticalLineRef.current, {
				y: '0%',
				opacity: 0.7,
				duration: 1.0,
				ease: 'power2.out',
			}, '-=0.8')
			// White overlay builds elegantly
			.to(whiteOverlayRef.current, {
				opacity: 0.7,
				duration: 0.6,
				ease: 'power2.inOut',
			}, '-=0.5')
			// Subtle premium shimmer
			.to(shimmerRef.current, {
				x: '150%',
				duration: 1.2,
				ease: 'power1.inOut',
			}, '-=0.9')
			// Brief pause for elegance
			.to({}, {
				duration: 0.2,
			})
			// Exit animation - lines fade out elegantly
			.to([lineOneRef.current, lineTwoRef.current, lineThreeRef.current, verticalLineRef.current], {
				opacity: 0,
				duration: 0.5,
				stagger: 0.08,
				ease: 'power2.in',
			})
			// Final white fade - smooth luxury
			.to(whiteOverlayRef.current, {
				opacity: 1,
				duration: 0.5,
				ease: 'power2.in',
			}, '-=0.4')
			// Hold white screen briefly
			.to({}, {
				duration: 0.15,
			})
			// Navigate when fully white
			.call(() => {
				onComplete();
			})
			// Keep white overlay a bit longer to cover page load
			.to({}, {
				duration: 0.3,
			})
			// Final container fade
			.to(containerRef.current, {
				opacity: 0,
				duration: 0.2,
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
	}, [isActive, onComplete]);

	if (!isActive) return null;

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
					background: 'linear-gradient(90deg, transparent 0%, #C0C0C0 20%, #C0C0C0 80%, transparent 100%)',
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
					background: 'linear-gradient(90deg, transparent 0%, #D3D3D3 15%, #D3D3D3 85%, transparent 100%)',
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
					background: 'linear-gradient(90deg, transparent 0%, #B8B8B8 35%, #B8B8B8 65%, transparent 100%)',
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
					background: 'linear-gradient(180deg, transparent 0%, #CCCCCC 25%, #CCCCCC 75%, transparent 100%)',
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
