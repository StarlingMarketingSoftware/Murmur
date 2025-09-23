/**
 * Detects if the current browser has issues with certain features
 */

export const isProblematicBrowser = (): boolean => {
	if (typeof navigator === 'undefined') return false;
	
	const ua = navigator.userAgent || '';
	const vendor = navigator.vendor || '';
	
	// Edge browser (all versions)
	const isEdge = ua.includes('Edg');
	
	// Safari browser (excluding Chrome on iOS)
	const isSafari = /Safari/.test(ua) && /Apple Computer/.test(vendor) && !/Chrome/.test(ua);
	
	// iOS browsers (which might have issues with modals)
	const isIOS = /iPad|iPhone|iPod/.test(ua) || ua.includes('CriOS');
	
	return isEdge || isSafari || isIOS;
};

export const getBrowserInfo = () => {
	if (typeof navigator === 'undefined') return { name: 'Unknown', isProblematic: false };
	
	const ua = navigator.userAgent || '';
	const vendor = navigator.vendor || '';
	
	if (ua.includes('Edg')) return { name: 'Edge', isProblematic: true };
	if (/Safari/.test(ua) && /Apple Computer/.test(vendor) && !/Chrome/.test(ua)) return { name: 'Safari', isProblematic: true };
	if (/Chrome/.test(ua) && /Google Inc/.test(vendor)) return { name: 'Chrome', isProblematic: false };
	if (ua.includes('Firefox')) return { name: 'Firefox', isProblematic: false };
	
	return { name: 'Other', isProblematic: true };
};
