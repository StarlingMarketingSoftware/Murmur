'use client';
import { Button } from '@/components/ui/button';
import { urls } from '@/constants/urls';
import { usePageTransition } from '@/contexts/PageTransitionContext';
import { useClerk } from '@clerk/nextjs';
import { isProblematicBrowser } from '@/utils/browserDetection';

export const LaunchButton = () => {
	const { startTransition } = usePageTransition();
	const { isSignedIn, openSignIn } = useClerk();

	const hasProblematicBrowser = isProblematicBrowser();

	const handleLaunch = () => {
		if (!isSignedIn) {
			// For Edge/Safari, navigate directly to sign-in page instead of opening modal
			if (hasProblematicBrowser) {
				console.log('[LaunchButton] Edge/Safari detected, navigating to sign-in page');
				// Save the intended destination in sessionStorage
				if (typeof window !== 'undefined') {
					sessionStorage.setItem('redirectAfterSignIn', urls.murmur.dashboard.index);
				}
				// Navigate directly to sign-in page
				window.location.href = urls.signIn.index;
			} else {
				// For Chrome and other browsers, use the modal
				openSignIn();
			}
		} else {
			// Only do the transition if user is signed in
			startTransition(urls.murmur.dashboard.index);
		}
	};

	return (
		<Button
			variant="primary"
			size="lg"
			font="secondary"
			noPadding
			className="!w-full !h-[42px] !min-h-0 !py-0 !px-0 rounded-[7px] bg-[#289137]"
			onClick={handleLaunch}
		>
			Launch
		</Button>
	);
};
