'use client';
import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function MurmurLayout({ children }: { children: React.ReactNode }) {
	// Hide footer for murmur pages and apply animations
	useEffect(() => {
		document.body.classList.add('murmur-page');
		document.documentElement.classList.add('murmur-compact');

		// Removed slide-up animation on nav to avoid bounce-in effect

		return () => {
			document.body.classList.remove('murmur-page');
			document.documentElement.classList.remove('murmur-compact');
		};
	}, []);

	// Add a class only on real mobile devices so CSS can target mobile without affecting narrow desktops
	const isMobile = useIsMobile();
	useEffect(() => {
		if (isMobile) {
			document.body.classList.add('murmur-mobile');
		} else {
			document.body.classList.remove('murmur-mobile');
		}
	}, [isMobile]);

	return <>{children}</>;
}
