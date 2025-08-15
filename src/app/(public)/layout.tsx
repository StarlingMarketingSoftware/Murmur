import { Navbar } from '@/components/organisms/Navbar/Navbar';

export default function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<Navbar />
			{children}
		</>
	);
}
