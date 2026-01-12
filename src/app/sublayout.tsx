'use client';
import { useTheme } from 'next-themes';

import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnMount: true,
			refetchOnWindowFocus: false, // Prevent refetch on window focus to avoid stuck queries
			refetchOnReconnect: true,
			retry: (failureCount, error) => {
				// Don't retry on timeout errors or after 2 attempts
				if (error instanceof Error && error.message.includes('timeout')) {
					return false;
				}
				return failureCount < 2;
			},
			retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
			staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
		},
		mutations: {
			retry: false, // Don't retry mutations by default
		},
	},
});

interface SubLayoutProps {
	children: React.ReactNode;
}

function RedirectAfterSignIn({ children }: { children: React.ReactNode }) {
	const { isSignedIn } = useAuth();
	const router = useRouter();
	const pathname = usePathname();

	// If a page sets `redirectAfterSignIn` before kicking off an auth flow (e.g. OAuth),
	// bring the user back there once they are signed in.
	useEffect(() => {
		if (!isSignedIn) return;
		if (typeof window === 'undefined') return;

		const redirectUrl = sessionStorage.getItem('redirectAfterSignIn');
		if (!redirectUrl) return;

		sessionStorage.removeItem('redirectAfterSignIn');
		if (redirectUrl !== pathname) {
			router.replace(redirectUrl);
		}
	}, [isSignedIn, pathname, router]);

	return <>{children}</>;
}

const SubLayout: FC<SubLayoutProps> = ({ children }) => {
	const { setTheme } = useTheme();

	useEffect(() => {
		setTheme('light');
	}, [setTheme]);

	return (
		<ClerkProvider>
			<RedirectAfterSignIn>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</RedirectAfterSignIn>
		</ClerkProvider>
	);
};

export default SubLayout;
