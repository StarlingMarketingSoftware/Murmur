'use client';
import { Button } from '@/components/ui/button';
import { urls } from '@/constants/urls';
import { usePageTransition } from '@/contexts/PageTransitionContext';
import { useClerk } from '@clerk/nextjs';

export const LaunchButton = () => {
	const { startTransition } = usePageTransition();
	const { isSignedIn, openSignIn } = useClerk();
	
	const handleLaunch = () => {
		if (!isSignedIn) {
			// If not signed in, open sign in modal instead of transition
			openSignIn();
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
			className="!w-full !h-[42px] !min-h-0 !py-0 !px-0 !font-normal"
			style={{
				backgroundColor: '#289137',
				borderRadius: '7px',
				fontWeight: 400,
			}}
			onClick={handleLaunch}
		>
			Launch
		</Button>
	);
};
