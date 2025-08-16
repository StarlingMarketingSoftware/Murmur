'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils';
import { UserButton } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import { useMe } from '@/hooks/useMe';
import { ArrowLeft } from 'lucide-react';

export default function MurmurLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const { user } = useMe();

	// Show Admin link only for admin users
	const showAdminLink = user?.role === 'admin';

	return (
		<>
			<nav className="w-full px-8 py-5">
				<div className="max-w-[1174px] mx-auto flex items-center justify-between">
					<div className="flex items-center gap-8">
						{/* Back to Home button */}
						<Link
							href={urls.home.index}
							className="flex items-center gap-2 text-[13px] font-normal transition-all duration-200 font-secondary tracking-[0.02em] text-gray-600 opacity-60 hover:opacity-100 hover:text-black"
						>
							<ArrowLeft className="w-4 h-4" />
							Back to Home
						</Link>
						
						{/* Admin link - only show if user is admin */}
						{showAdminLink && (
							<Link
								href={urls.admin.index}
								className={cn(
									'text-[13px] font-normal transition-all duration-200 font-secondary tracking-[0.02em]',
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
						afterSignOutUrl="/" 
						appearance={{
							elements: {
								avatarBox: "w-7 h-7",
								userButtonTrigger: "opacity-60 hover:opacity-100 transition-opacity duration-200"
							}
						}}
					/>
				</div>
			</nav>
			{children}
		</>
	);
}
