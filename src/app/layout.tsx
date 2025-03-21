import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Toaster } from '@/components/ui/toast';
import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SubLayout from './sublayout';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Murmur',
	description:
		'A Next.js 14 application with Clerk, Prisma, Tailwind, shadcn, and Stripe',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider>
			<SubLayout>
				<html lang="en">
					<body
						className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
					>
						<Navbar />
						<main className="flex-1">{children}</main>
						<Footer />
						<Toaster />
					</body>
				</html>
			</SubLayout>
		</ClerkProvider>
	);
}
