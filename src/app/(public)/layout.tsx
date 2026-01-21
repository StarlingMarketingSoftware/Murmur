import { Suspense } from 'react';
import { Navbar } from '@/components/organisms/Navbar/Navbar';

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
		</>
	);
}
