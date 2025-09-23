'use client';
import { useEffect } from 'react';

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

	return <>{children}</>;
}
