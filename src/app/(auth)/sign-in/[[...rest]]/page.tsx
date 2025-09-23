'use client';
import { SignIn } from '@clerk/nextjs';
import { AuthPageLayout } from '../../AuthPageLayout';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export default function SignInPage() {
	const router = useRouter();
	const { isSignedIn } = useAuth();
	
	useEffect(() => {
		// Check if user is already signed in and there's a redirect URL
		if (isSignedIn && typeof window !== 'undefined') {
			const redirectUrl = sessionStorage.getItem('redirectAfterSignIn');
			if (redirectUrl) {
				sessionStorage.removeItem('redirectAfterSignIn');
				console.log('[SignInPage] Redirecting to:', redirectUrl);
				router.push(redirectUrl);
			}
		}
	}, [isSignedIn, router]);
	
	return (
		<AuthPageLayout>
			<SignIn
				appearance={{
					elements: {
						formButtonPrimary: 'bg-black hover:bg-gray-800 text-sm normal-case',
					},
				}}
				path="/sign-in"
				routing="path"
				signUpUrl="/sign-up"
				afterSignInUrl="/murmur/dashboard"
			/>
		</AuthPageLayout>
	);
}
