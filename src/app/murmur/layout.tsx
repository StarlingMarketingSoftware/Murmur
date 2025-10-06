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

	// Detect iOS devices specifically to prevent input focus zoom via CSS
	useEffect(() => {
		// This runs only on the client
		const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
		const platform = typeof navigator !== 'undefined' ? navigator.platform || '' : '';
		const maxTouchPoints =
			typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;

		// iPhone/iPad/iPod; also catch iPadOS which reports MacIntel but has touch points
		const isIOS =
			/iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);

		if (isIOS) {
			document.body.classList.add('murmur-ios');
			document.documentElement.classList.add('murmur-ios');
			return () => {
				document.body.classList.remove('murmur-ios');
				document.documentElement.classList.remove('murmur-ios');
			};
		}

		return undefined;
	}, []);

	return (
		<>
			{children}
			<style jsx global>{`
				/* Prevent iOS Safari zoom on focus by ensuring form controls have >=16px font-size */
				body.murmur-page.murmur-ios input,
				body.murmur-page.murmur-ios textarea,
				body.murmur-page.murmur-ios select,
				body.murmur-page.murmur-ios [contenteditable],
				body.murmur-page.murmur-ios [role='textbox'],
				body.murmur-page.murmur-ios .contenteditable,
				body.murmur-page.murmur-ios .ProseMirror {
					font-size: 16px !important;
				}

				html.murmur-ios,
				body.murmur-page.murmur-ios {
					-webkit-text-size-adjust: 100%;
					text-size-adjust: 100%;
				}
			`}</style>
		</>
	);
}
