/**
 * Detects if the current browser has issues with certain features
 */

export const isSafariBrowser = (): boolean => {
	if (typeof navigator === 'undefined') return false;
	
	const ua = navigator.userAgent || '';
	const vendor = navigator.vendor || '';
	
	// Safari browser (exclude Chromium-based browsers and iOS Chrome/Firefox wrappers)
	return (
		/Safari/.test(ua) &&
		/Apple Computer/.test(vendor) &&
		!/(Chrome|CriOS|Chromium|Edg|OPR|Opera|SamsungBrowser|FxiOS)/.test(ua)
	);
};

/**
 * Synchronous mobile/tablet device check. Mirrors the logic in `useIsMobile`,
 * but usable at module/construction time (the hook returns null until a
 * post-mount effect resolves). Returns false during SSR.
 */
export const isMobileDevice = (): boolean => {
	if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
	const ua = navigator.userAgent || '';
	const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
	const isIOS =
		/iPad|iPhone|iPod/.test(navigator.platform) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	return isIOS || (isMobileUA && isTouch);
};

export const isProblematicBrowser = (): boolean => {
	if (typeof navigator === 'undefined') return false;
	
	const ua = navigator.userAgent || '';
	
	// Edge browser (all versions)
	const isEdge = ua.includes('Edg');
	
	// Safari browser (excluding Chrome on iOS)
	const isSafari = isSafariBrowser();
	
	// iOS browsers (which might have issues with modals)
	const isIOS = /iPad|iPhone|iPod/.test(ua) || ua.includes('CriOS');
	
	return isEdge || isSafari || isIOS;
};

export const getBrowserInfo = () => {
	if (typeof navigator === 'undefined') return { name: 'Unknown', isProblematic: false };
	
	const ua = navigator.userAgent || '';
	const vendor = navigator.vendor || '';
	
	if (ua.includes('Edg')) return { name: 'Edge', isProblematic: true };
	if (isSafariBrowser()) return { name: 'Safari', isProblematic: true };
	if (/Chrome/.test(ua) && /Google Inc/.test(vendor)) return { name: 'Chrome', isProblematic: false };
	if (ua.includes('Firefox')) return { name: 'Firefox', isProblematic: false };
	
	return { name: 'Other', isProblematic: true };
};
