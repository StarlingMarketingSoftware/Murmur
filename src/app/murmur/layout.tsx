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
								Back to Home
							</span>
							<span className="nav-text-short pointer-events-auto cursor-pointer">
								Home
							</span>
						</Link>
					</div>
					<div className="justify-self-center">
						<Link href={urls.murmur.dashboard.index} className="block w-[68px] h-[20px]">
							<div className="w-full h-full flex items-center justify-center text-[14px] font-inter font-medium text-black leading-[20px] bg-[#EEEEEE] transition-colors hover:bg-[#696969] hover:text-white rounded-[8px]">
								<svg
									width="42"
									height="11"
									viewBox="0 0 49 13"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									className="block mx-auto"
								>
									<path
										d="M0 12.6981V0H1.53784V5.65512H8.30818V0H9.84602V12.6954H8.30818V7.01574H1.53784V12.6954H0V12.6981Z"
										fill="currentColor"
									/>
									<path
										d="M25.7218 12.6968V3.17251H27.1343V4.66127H27.257C27.456 4.15411 27.775 3.75601 28.2168 3.47517C28.6585 3.19159 29.1902 3.0498 29.8091 3.0498C30.4281 3.0498 30.9625 3.19159 31.3797 3.47517C31.7996 3.75874 32.1268 4.15411 32.3613 4.66127H32.4595C32.7021 4.17047 33.0702 3.77783 33.5556 3.48607C34.0437 3.19432 34.6272 3.0498 35.3088 3.0498C35.9905 3.0498 36.8576 3.31429 37.3975 3.84599C37.9401 4.3777 38.21 5.20388 38.21 6.32181V12.6941H36.7458V6.32181C36.7458 5.61833 36.5549 5.11662 36.1705 4.81396C35.786 4.5113 35.3334 4.36134 34.8126 4.36134C34.2918 4.36134 33.6237 4.56311 33.2556 4.96666C32.8875 5.37021 32.7049 5.88009 32.7049 6.4936V12.6941H31.2161V6.17185C31.2161 5.62924 31.0416 5.19297 30.6898 4.86032C30.3381 4.52766 29.8855 4.36134 29.332 4.36134C28.7784 4.36134 28.5985 4.46222 28.2686 4.664C27.9386 4.86577 27.6741 5.14662 27.4751 5.50381C27.2733 5.86101 27.1752 6.27273 27.1752 6.74172V12.6941H25.7109L25.7218 12.6968Z"
										fill="currentColor"
									/>
									<path
										d="M45.0589 12.8939C44.1428 12.8939 43.352 12.6894 42.6867 12.2831C42.0242 11.8768 41.5143 11.307 41.1543 10.5707C40.7972 9.83727 40.6172 8.98382 40.6172 8.00767C40.6172 7.03152 40.7972 6.17262 41.1543 5.42551C41.5115 4.6784 42.0132 4.09762 42.654 3.67771C43.2975 3.25781 44.0473 3.04785 44.9062 3.04785C45.7652 3.04785 45.8933 3.12965 46.3759 3.29598C46.8585 3.46231 47.3003 3.72952 47.6956 4.09762C48.091 4.46845 48.4073 4.95652 48.6445 5.56457C48.879 6.17262 48.999 6.91973 48.999 7.80863V8.42758H41.6588V7.1624H47.5102C47.5102 6.62525 47.4039 6.14535 47.1912 5.72545C46.9785 5.30281 46.6759 4.97016 46.2859 4.72748C45.896 4.48481 45.4352 4.36211 44.9062 4.36211C44.3773 4.36211 43.821 4.50662 43.3957 4.79292C42.973 5.07923 42.6458 5.45278 42.4195 5.91086C42.1932 6.36894 42.0787 6.86247 42.0787 7.38599V8.22853C42.0787 8.94838 42.2041 9.55643 42.455 10.0554C42.7058 10.5544 43.0521 10.9307 43.4993 11.1897C43.9465 11.4487 44.4645 11.5769 45.0562 11.5769C45.6479 11.5769 45.7897 11.5224 46.1005 11.4133C46.4114 11.3042 46.6813 11.1379 46.9104 10.917C47.1367 10.6962 47.3139 10.4208 47.4366 10.0881L48.849 10.4862C48.6991 10.9661 48.4509 11.386 48.0992 11.7487C47.7474 12.1113 47.3139 12.3922 46.7986 12.5912C46.2805 12.793 45.7024 12.8911 45.0562 12.8911L45.0589 12.8939Z"
										fill="currentColor"
									/>
									<path
										d="M20.9184 7.6633V11.3879H14.9143V7.6633H20.9184ZM22.2272 6.35449H13.6055V12.6967H22.2272V6.35449Z"
										fill="currentColor"
									/>
									<path
										d="M17.9215 3.19765L20.9181 6.24062H14.9522L17.9242 3.19765M17.9161 1.32715L11.8438 7.54942H24.0429L17.9188 1.32715H17.9161Z"
										fill="currentColor"
									/>
								</svg>
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
