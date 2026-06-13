import type { Metadata } from 'next';
import { Crimson_Text, Inter, Zen_Antique } from 'next/font/google';
import { Toaster } from '@/components/ui/toast';
import 'mapbox-gl/dist/mapbox-gl.css';
import './globals.css';
import './advanced-scroll.css';
import './hide-scrollbars.css';
import SubLayout from './sublayout';
import localFont from 'next/font/local';
import { ThemeProvider } from '@/components/ThemeProvider';
import StoreProvider from './StoreProvider';
import { PageTransitionProvider } from '@/contexts/PageTransitionContext';
import { ScrollProvider } from '@/contexts/ScrollContext';
import { GlobalScrollbar } from '@/components/ui/GlobalScrollbar';

const inter = Inter({
	variable: '--font-inter',
	subsets: ['latin'],
});

const zenAntique = Zen_Antique({
	weight: '400',
	variable: '--font-zen-antique',
	subsets: ['latin'],
});

const crimsonText = Crimson_Text({
	weight: '400',
	variable: '--font-crimson-text',
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
				className={`${inter.variable} ${timesNewRoman.variable} ${zenAntique.variable} ${crimsonText.variable}`}
				suppressHydrationWarning
			>
				<head>
					{/* Mapbox style/tile/glyph requests all hit api.mapbox.com; warming the
					    connection here takes DNS+TCP+TLS off the globe's first-paint path. */}
					<link rel="preconnect" href="https://api.mapbox.com" crossOrigin="anonymous" />
				</head>
				<body
					className={`antialiased min-h-screen flex flex-col`}
					suppressHydrationWarning
				>
					<ThemeProvider attribute="class" defaultTheme="light">
						<ScrollProvider>
							<PageTransitionProvider>
								<SubLayout>
									<main className="flex-1">{children}</main>
									<Toaster />
								</SubLayout>
							</PageTransitionProvider>
						</ScrollProvider>
						<GlobalScrollbar />
					</ThemeProvider>
				</body>
			</html>
		</StoreProvider>
	);
}
