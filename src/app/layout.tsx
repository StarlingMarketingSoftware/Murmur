import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Footer } from '@/components/molecules/Footer/Footer';
import { Toaster } from '@/components/ui/toast';
import './globals.css';
import SubLayout from './sublayout';
import localFont from 'next/font/local';
import { ThemeProvider } from '@/components/ThemeProvider';
import StoreProvider from './StoreProvider';
import { Navbar } from '@/components/organisms/Navbar/Navbar';

const inter = Inter({
	variable: '--font-inter',
	subsets: ['latin'],
});

const timesNewRoman = localFont({
	src: '../../public/timesNewRoman.ttf',
});

export const metadata: Metadata = {
	title: 'Murmur',
	description: 'Email marketing made personalized.',
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
				<body className={`${inter.variable} antialiased min-h-screen flex flex-col`}>
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
