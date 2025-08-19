'use client';

import { useState, useEffect } from 'react';

export const useIsMobile = () => {
	// Initialize as null to indicate loading state and prevent hydration mismatch
	const [isMobile, setIsMobile] = useState<boolean | null>(null);

	useEffect(() => {
		const checkIfMobile = () => {
			// Check if window is defined (client-side)
			if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
				try {
					// Check for mobile viewport width
					const isMobileViewport = window.innerWidth <= 768;
					
					// Check for mobile user agent (including Safari on iOS)
					const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
						navigator.userAgent
					);
					
					// Check for Safari on iOS 13+ (iPadOS reports as desktop Safari)
					const isIOS = /iPad|iPhone|iPod/.test(navigator.platform) || 
						(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
					
					// Check for touch capability
					const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
					
					// Consider it mobile if viewport is small OR it's a mobile device (including iOS)
					setIsMobile(isMobileViewport || isIOS || (isMobileUserAgent && isTouchDevice));
				} catch (error) {
					// Fallback to false if any error occurs
					console.error('Error detecting mobile device:', error);
					setIsMobile(false);
				}
			}
		};

		// Check on mount
		checkIfMobile();

		// Check on resize
		window.addEventListener('resize', checkIfMobile);
		
		// Check on orientation change
		window.addEventListener('orientationchange', checkIfMobile);

		// Cleanup
		return () => {
			window.removeEventListener('resize', checkIfMobile);
			window.removeEventListener('orientationchange', checkIfMobile);
		};
	}, []);

	return isMobile;
};
