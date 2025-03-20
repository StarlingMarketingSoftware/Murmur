'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC } from 'react';

interface SubLayoutProps {
	children: React.ReactNode;
}
const SubLayout: FC<SubLayoutProps> = ({ children }) => {
	const queryClient = new QueryClient();
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export default SubLayout;
