'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils';
import { UserButton } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import { useMe } from '@/hooks/useMe';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

export default function MurmurLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { user } = useMe();

	const showAdminLink = user?.role === 'admin';

	// Hide footer for murmur pages
	useEffect(() => {
		document.body.classList.add('murmur-page');
		return () => {
			document.body.classList.remove('murmur-page');
		};
	}, []);

	return (
		<>
			<nav className="w-full px-4 md:px-8 py-5">
				<div className="w-full max-w-full mx-auto flex items-center justify-between">
					<div className="flex items-center gap-4 md:gap-8">
						{/* Back to Home button */}
						<Link
							href={urls.home.index}
							className="flex items-center gap-2 text-[13px] transition-all duration-200 font-secondary tracking-[0.02em] text-gray-600 opacity-60 hover:opacity-100 hover:text-black"
						>
							<ArrowLeft className="w-4 h-4" />
							<span className="hidden sm:inline">Back to Home</span>
							<span className="sm:hidden">Home</span>
						</Link>

						{showAdminLink && (
							<Link
								href={urls.admin.index}
								className={cn(
									'text-[13px] transition-all duration-200 font-secondary tracking-[0.02em]',
									pathname === urls.admin.index
										? 'text-black opacity-100'
										: 'text-gray-600 opacity-60 hover:opacity-100 hover:text-black'
								)}
							>
								Admin
							</Link>
						)}
					</div>
					<UserButton
						appearance={{
							elements: {
								avatarBox: 'w-7 h-7',
								userButtonTrigger:
									'opacity-60 hover:opacity-100 transition-opacity duration-200',
							},
						}}
					/>
				</div>
			</nav>
			{children}
		</>
	);
}
