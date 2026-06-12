import './landing-animations.css';
import { Suspense } from 'react';
import { Navbar } from '@/components/organisms/Navbar/Navbar';
import { Footer } from '@/components/organisms/Footer/Footer';

export default function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<Suspense fallback={null}>
				<Navbar />
			</Suspense>
			{children}
			<Footer />
		</>
	);
}
