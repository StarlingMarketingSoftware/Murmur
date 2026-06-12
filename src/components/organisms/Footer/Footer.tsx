import Link from 'next/link';
import { urls } from '@/constants/urls';

export const Footer = () => {
	return (
		<footer className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex h-9 items-center justify-between px-5 font-secondary text-[11px] font-medium tracking-[0.02em] text-[#909090] sm:px-6 sm:text-[13px] min-[1145px]:px-12">
			<span>
				© {new Date().getFullYear()} Murmur
				<span className="hidden sm:inline"> Technologies</span>
			</span>
			<nav className="pointer-events-auto flex items-center gap-2">
				<Link
					href={urls.privacy.index}
					className="transition-colors duration-300 hover:text-[#b0b0b0]"
				>
					Privacy Policy
				</Link>
				<span aria-hidden>·</span>
				<Link
					href={urls.terms.index}
					className="transition-colors duration-300 hover:text-[#b0b0b0]"
				>
					Terms of Service
				</Link>
			</nav>
		</footer>
	);
};
