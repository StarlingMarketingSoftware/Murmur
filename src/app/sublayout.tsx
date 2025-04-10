'use client';
import { useTheme } from 'next-themes';

import { ClerkProvider } from '@clerk/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC } from 'react';
import { dark } from '@clerk/themes';

interface SubLayoutProps {
	children: React.ReactNode;
}
const SubLayout: FC<SubLayoutProps> = ({ children }) => {
	const queryClient = new QueryClient();
	const { theme } = useTheme();
	console.log('🚀 ~ theme:', theme);

	return (
		<QueryClientProvider client={queryClient}>
			<ClerkProvider appearance={{ baseTheme: theme === 'dark' ? dark : undefined }}>
				{children}
			</ClerkProvider>
		</QueryClientProvider>
	);
};

export default SubLayout;
