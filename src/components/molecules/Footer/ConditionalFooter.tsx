'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

export function ConditionalFooter() {
	const pathname = usePathname();
	
	// Hide footer on dashboard and other app pages under /murmur
	if (pathname?.startsWith('/murmur')) {
		return null;
	}
	
	// Also hide footer on admin pages
	if (pathname?.startsWith('/admin')) {
		return null;
	}
	
	// Use light variant (white background) for pricing and contact/help pages
	const variant = (pathname?.startsWith('/pricing') || pathname === '/contact') ? 'light' : 'dark';
	
	return <Footer variant={variant} />;
}
