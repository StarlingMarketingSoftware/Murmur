'use client';
import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAuth, UserButton, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { urls } from '@/constants/urls';
import HomeIcon from '@/components/atoms/_svg/HomeIcon';

export default function MurmurLayout({ children }: { children: React.ReactNode }) {
	const { isSignedIn } = useAuth();
	const pathname = usePathname();
	const isDashboard = pathname === urls.murmur.dashboard.index;
	const showHomeButton = !isDashboard;
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
			{/* Persistent Clerk login icon in top right corner */}
			<div className={`clerk-user-button fixed top-3 z-50 ${isMobile && showHomeButton ? 'right-12' : 'right-4'}`}>
				{isSignedIn ? (
					<UserButton
						appearance={{
							elements: {
								avatarBox: 'w-7 h-7 ring-1 ring-black/10',
								userButtonTrigger:
									'opacity-80 hover:opacity-100 transition-opacity duration-300',
							},
						}}
					/>
				) : (
					<SignInButton mode="modal">
						<button className="px-3 py-1.5 text-[12px] font-medium tracking-[0.02em] text-gray-700 hover:text-gray-900 transition-all duration-300">
							Sign in
						</button>
					</SignInButton>
				)}
			</div>
			{/* Home button - mobile only, not on dashboard */}
			{isMobile && showHomeButton && (
				<Link
					href={urls.murmur.dashboard.index}
					className="fixed top-3 right-3 z-50 w-7 h-7 flex items-center justify-center"
					style={{ backgroundColor: '#EAEAEA', borderRadius: '15px' }}
				>
					<HomeIcon />
				</Link>
			)}
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

				/* Exception: Mini Email Structure signature textarea on mobile should match its 12px header */
				@media (orientation: landscape) {
					body.murmur-page.murmur-ios.murmur-mobile .signature-textarea {
						font-size: 12px !important;
						line-height: 1.2 !important;
					}
				}
				@media (max-width: 480px) and (orientation: portrait) {
					body.murmur-page.murmur-ios.murmur-mobile .signature-textarea {
						font-size: 12px !important;
						line-height: 1.2 !important;
					}
				}
			`}</style>
		</>
	);
}
