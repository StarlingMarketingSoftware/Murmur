'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils';
import { UserButton } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import { useMe } from '@/hooks/useMe';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function MurmurLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { user } = useMe();
	const navRef = useRef<HTMLElement>(null);

	const isCampaignPage = pathname?.startsWith(urls.murmur.campaign.index);
	const showAdminLink = user?.role === 'admin' && !isCampaignPage;

	// Hide footer for murmur pages and apply animations
	useEffect(() => {
		document.body.classList.add('murmur-page');
		document.documentElement.classList.add('murmur-compact');

		// Removed slide-up animation on nav to avoid bounce-in effect

		return () => {
			document.body.classList.remove('murmur-page');
			document.documentElement.classList.remove('murmur-compact');
		};
	}, []);

	return (
		<>
			{isCampaignPage && (
				<div className="hidden lg:grid grid-cols-3 items-center mt-2 w-full">
					<div className="justify-self-start px-4 md:px-8">
						<Link
							href={urls.murmur.dashboard.index}
							className="flex items-center gap-2 text-[13px] transition-all duration-200 font-secondary tracking-[0.02em] text-gray-600 opacity-60 hover:opacity-100 hover:text-black safari-nav-fix cursor-pointer pointer-events-auto"
						>
							<ArrowLeft className="w-4 h-4 flex-shrink-0 pointer-events-auto" />
							<span className="nav-text-full pointer-events-auto cursor-pointer">
								Home
							</span>
							<span className="nav-text-short pointer-events-auto cursor-pointer">
								Home
							</span>
						</Link>
					</div>
					<div className="justify-self-center">
						<Link href={urls.murmur.dashboard.index} className="block w-[320px] h-[24px]">
							<div className="w-full h-full flex items-center justify-center text-[14px] font-inter font-normal text-black bg-[#EEEEEE] transition-colors hover:bg-[#696969] hover:text-white rounded-[8px]">
								Back to Home
							</div>
						</Link>
					</div>
					<div />
				</div>
			)}
			<nav ref={navRef} className={cn('w-full px-4 md:px-8 py-2')} data-scroll-animation>
				<div className="w-full max-w-full mx-auto flex items-center justify-between">
					<div className="flex items-center gap-4 md:gap-8">
						{!isCampaignPage && (
							<Link
								href={urls.home.index}
								className="flex items-center gap-2 text-[13px] transition-all duration-200 font-secondary tracking-[0.02em] text-gray-600 opacity-60 hover:opacity-100 hover:text-black safari-nav-fix cursor-pointer pointer-events-auto"
							>
								<ArrowLeft className="w-4 h-4 flex-shrink-0 pointer-events-auto" />
								<span className="nav-text-full pointer-events-auto cursor-pointer">
									Back to Landing
								</span>
								<span className="nav-text-short pointer-events-auto cursor-pointer">
									Landing
								</span>
							</Link>
						)}

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
					<div className={cn(isCampaignPage && 'lg:-mt-8 lg:relative lg:z-10')}>
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
				</div>
			</nav>
			{children}
		</>
	);
}
