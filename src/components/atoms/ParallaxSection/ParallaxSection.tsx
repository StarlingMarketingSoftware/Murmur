'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/utils';
import { useAdvancedScrollAnimations } from '@/hooks/useAdvancedScrollAnimations';

interface ParallaxSectionProps {
	children: React.ReactNode;
	className?: string;
	speed?: number;
	backgroundImage?: string;
	overlay?: boolean;
	overlayOpacity?: number;
}

export function ParallaxSection({
	children,
	className,
	speed = 0.5,
	backgroundImage,
	overlay = false,
	overlayOpacity = 0.3,
}: ParallaxSectionProps) {
	const backgroundRef = useRef<HTMLDivElement>(null);
	const { addParallax } = useAdvancedScrollAnimations();

	useEffect(() => {
		if (backgroundRef.current) {
			addParallax(backgroundRef.current);
		}
	}, [addParallax]);

	return (
		<div className={cn('parallax-container relative', className)}>
			{backgroundImage && (
				<div
					ref={backgroundRef}
					className="parallax-element absolute inset-0 z-0"
					data-parallax-speed={speed}
					style={{
						backgroundImage: `url(${backgroundImage})`,
						backgroundSize: 'cover',
						backgroundPosition: 'center',
						height: '120%',
						top: '-10%',
					}}
				>
					{overlay && (
						<div
							className="absolute inset-0 bg-black"
							style={{ opacity: overlayOpacity }}
						/>
					)}
				</div>
			)}
			<div className="relative z-10">{children}</div>
		</div>
	);
}
