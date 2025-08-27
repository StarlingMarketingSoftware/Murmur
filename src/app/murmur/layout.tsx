'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils';
import { UserButton } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import { useMe } from '@/hooks/useMe';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useAdvancedScrollAnimations } from '@/hooks/useAdvancedScrollAnimations';

export default function MurmurLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { user } = useMe();
	const { addSlideUp } = useAdvancedScrollAnimations();
	const navRef = useRef<HTMLElement>(null);

	const showAdminLink = user?.role === 'admin';
	const isCampaignPage = pathname?.startsWith(urls.murmur.campaign.index);

	// Hide footer for murmur pages and apply animations
	useEffect(() => {
		document.body.classList.add('murmur-page');

		// Apply slide up animation to nav
		if (navRef.current) {
			addSlideUp(navRef.current);
		}

		return () => {
			document.body.classList.remove('murmur-page');
		};
	}, [addSlideUp]);

	return (
		<>
			{isCampaignPage && (
				<div className="hidden lg:flex justify-center mt-2">
					<Link href={urls.murmur.dashboard.index} className="block w-[320px] h-[24px]">
						<div className="w-full h-full flex items-center justify-center text-[14px] font-inter font-normal text-black bg-[#EEEEEE] hover:bg-[#E5E5E5] transition-colors rounded-[8px]">
							Back to Home
						</div>
					</Link>
				</div>
			)}
			<nav
				ref={navRef}
				className={cn('w-full px-4 md:px-8', isCampaignPage ? 'py-2' : 'py-5')}
				data-scroll-animation
			>
				<div className="w-full max-w-full mx-auto flex items-center justify-between">
					<div className="flex items-center gap-4 md:gap-8">
						{/* Back to Landing button (hidden on campaign pages to avoid duplication) */}
						{!isCampaignPage && (
							<Link
								href={urls.home.index}
								className="flex items-center gap-2 text-[13px] transition-all duration-200 font-secondary tracking-[0.02em] text-gray-600 opacity-60 hover:opacity-100 hover:text-black safari-nav-fix"
							>
								<ArrowLeft className="w-4 h-4 flex-shrink-0" />
								<span className="nav-text-full">Back to Landing</span>
								<span className="nav-text-short">Landing</span>
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
