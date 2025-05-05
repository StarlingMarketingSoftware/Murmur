'use client';
import { useTheme } from 'next-themes';

import { ClerkProvider } from '@clerk/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC } from 'react';
import { dark } from '@clerk/themes';

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
	const { theme } = useTheme();

	return (
		<ClerkProvider appearance={{ baseTheme: theme === 'dark' ? dark : undefined }}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</ClerkProvider>
	);
};

export default SubLayout;
