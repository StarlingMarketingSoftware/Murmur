import type { Metadata } from 'next';
import { Inter, Zen_Antique } from 'next/font/google';
import { Footer } from '@/components/molecules/Footer/Footer';
import { Toaster } from '@/components/ui/toast';
import './globals.css';
import SubLayout from './sublayout';
import localFont from 'next/font/local';
import { ThemeProvider } from '@/components/ThemeProvider';
import StoreProvider from './StoreProvider';
import { PageTransitionProvider } from '@/contexts/PageTransitionContext';

const inter = Inter({
	variable: '--font-inter',
	subsets: ['latin'],
});

const zenAntique = Zen_Antique({
	weight: '400',
	variable: '--font-zen-antique',
	subsets: ['latin'],
});

const timesNewRoman = localFont({
	src: [
		{
			path: '../../public/fonts/times.ttf',
			weight: '400',
			style: 'normal',
		},
		{
			path: '../../public/fonts/timesBold.ttf',
			weight: '700',
			style: 'normal',
		},
		{
			path: '../../public/fonts/timesBoldItalic.ttf',
			weight: '700',
			style: 'italic',
		},
		{
			path: '../../public/fonts/timesItalic.ttf',
			weight: '400',
			style: 'italic',
		},
	],
	variable: '--font-times',
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
			<html
				lang="en"
				className={`${inter.variable} ${timesNewRoman.variable} ${zenAntique.variable}`}
				suppressHydrationWarning
			>
				<body className={`antialiased min-h-screen flex flex-col`}>
					<ThemeProvider attribute="class" defaultTheme="light">
						<PageTransitionProvider>
							<SubLayout>
								<main className="flex-1">{children}</main>
								<Footer />
								<Toaster />
							</SubLayout>
						</PageTransitionProvider>
					</ThemeProvider>
				</body>
			</html>
		</StoreProvider>
	);
}
