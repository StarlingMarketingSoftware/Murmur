'use client';

import { useEffect, useState } from 'react';
import { useScroll } from '@/contexts/ScrollContext';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils';

interface ScrollProgressProps {
	className?: string;
	height?: string;
}

export function ScrollProgress({ className, height = '3px' }: ScrollProgressProps) {
	const { progress } = useScroll();
	const pathname = usePathname();
	const [isVisible, setIsVisible] = useState(false);

	// Hide on all app pages (murmur, admin, auth)
	const shouldHide =
		pathname?.includes('/murmur') ||
		pathname?.includes('/admin') ||
		pathname?.includes('/sign-in') ||
		pathname?.includes('/sign-up');

	useEffect(() => {
		// Show progress bar after a small delay
		const timer = setTimeout(() => setIsVisible(true), 500);
		return () => clearTimeout(timer);
	}, []);

	if (!isVisible || shouldHide) return null;

	return (
		<div
			className={cn('scroll-progress', className)}
			style={{
				transform: `scaleX(${progress})`,
				height,
			}}
		/>
	);
}
