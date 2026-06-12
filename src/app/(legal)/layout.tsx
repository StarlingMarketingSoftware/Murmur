import './legal.css';
import { BackButton } from './BackButton';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-white">
			<BackButton />
			<main className="legal-prose mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-20">
				{children}
			</main>
		</div>
	);
}
