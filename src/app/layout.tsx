import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Footer } from '@/components/molecules/Footer/Footer';
import { Toaster } from '@/components/ui/toast';
import './globals.css';
import SubLayout from './sublayout';
import localFont from 'next/font/local';
import { ThemeProvider } from '@/components/ThemeProvider';
import StoreProvider from './StoreProvider';
import { Navbar } from '@/components/organisms/Navbar/Navbar';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

const timesNewRoman = localFont({
	src: '../../public/timesNewRoman.ttf',
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
		<StoreProvider>
			<html lang="en" className={timesNewRoman.className} suppressHydrationWarning>
				{/* <html lang="en" suppressHydrationWarning> */}
				<body
					className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
				>
					<ThemeProvider attribute="class" defaultTheme="light">
						<SubLayout>
							<Navbar />
							<main className="flex-1">{children}</main>
							<Footer />
							<Toaster />
						</SubLayout>
					</ThemeProvider>
				</body>
			</html>
		</StoreProvider>
	);
}
