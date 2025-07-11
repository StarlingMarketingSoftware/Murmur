'use client';
import { useTheme } from 'next-themes';

import { ClerkProvider } from '@clerk/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC, useEffect } from 'react';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnMount: true,
			refetchOnWindowFocus: true,
			refetchOnReconnect: true,
			retry: 1,
		},
	},
});

interface SubLayoutProps {
	children: React.ReactNode;
}
const SubLayout: FC<SubLayoutProps> = ({ children }) => {
	const { setTheme } = useTheme();

	useEffect(() => {
		setTheme('light');
	}, [setTheme]);

	return (
		<ClerkProvider>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</ClerkProvider>
	);
};

export default SubLayout;
