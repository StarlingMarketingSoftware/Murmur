'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import {
	getMsUntilNextSearchGradientBucket,
	getSearchGradientForDate,
} from '@/constants/searchGradients';
import { StartFreeTrialModal } from '@/components/organisms/StartFreeTrialModal';
import {
	TrustedByLogoGrid,
	TrustedByLogoOrbit,
} from '@/components/molecules/TrustedByLogoOrbit/TrustedByLogoOrbit';
import MurmurLogoNew from '@/components/atoms/_svg/MurmurLogoNew';

export default function HomePageClient({
	showFreeTrialButton = true,
	showVenueSignInButton = false,
}: {
	showFreeTrialButton?: boolean;
	showVenueSignInButton?: boolean;
}) {
	const [trialClicked, setTrialClicked] = useState(false);
	const stackRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!showVenueSignInButton) return;

		const root = document.documentElement;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		const applyForNow = () => {
			const now = new Date();
			root.style.setProperty('--search-gradient', getSearchGradientForDate(now));
			timeoutId = setTimeout(
				applyForNow,
				getMsUntilNextSearchGradientBucket(now) + 1000,
			);
		};

		applyForNow();

		return () => {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
			root.style.removeProperty('--search-gradient');
		};
	}, [showVenueSignInButton]);

	return (
		<main
			className="landing-page relative flex min-h-screen items-center justify-center overflow-x-clip px-4 pb-16 pt-6 lg:pb-10"
			style={{ background: 'linear-gradient(180deg, #FFF 0%, #FFF 50%, #D5F1FF 100%)' }}
		>
			<TrustedByLogoOrbit anchorRef={stackRef} />
			<div
				ref={stackRef}
				className="landing-home-stack relative z-10 flex w-full max-w-[596px] flex-col"
			>
				<div className="mb-3 flex flex-col gap-1 lg:flex-row lg:items-end lg:gap-3">
					<MurmurLogoNew width="150px" height="27px" />
					<span
						className="pb-[2px] text-[16px] font-medium"
						style={{ color: '#8E8E93' }}
					>
						Live-Music Booking for Musicians
					</span>
				</div>
				<div
					className="relative aspect-[596/505] w-[596px] max-w-full overflow-hidden rounded-[11.54px] bg-[#F5F5F7]"
					style={{ containerType: 'inline-size' }}
				>
					{/* eslint-disable-next-line @next/next/no-img-element -- static landing preview; next/image adds nothing here */}
					<img
						src="/photos/dashboardPreview.jpg"
						alt="Murmur dashboard with a campaign map and search results"
						className="absolute inset-0 h-full w-full object-cover object-[75%_50%]"
					/>
					{showVenueSignInButton && (
						<div
							className="absolute inset-x-0 bottom-0"
							style={{
								height: 'clamp(47px, 8.72cqw, 53px)',
								background: '#F5F5F7',
								border: '2px solid #000',
								borderRadius: '0 0 11.54px 11.54px',
								boxSizing: 'border-box',
							}}
						>
							<div
								className="absolute inset-0"
								style={{
									borderRadius: 'min(7.54px, 0.96cqw) min(7.54px, 0.96cqw) 9.5px 9.5px',
									opacity: 0.5,
									background: 'rgba(254, 254, 254, 0.74)',
									zIndex: 0,
								}}
							/>
							<a
								href={urls.venueSignUp.index}
								aria-label="Sign up"
								className="absolute flex items-center transition-opacity hover:opacity-95"
								style={{
									left: 'min(9px, 1.14cqw)',
									right: 'min(9px, 1.14cqw)',
									top: '50%',
									transform: 'translateY(-50%)',
									height: 'clamp(39px, 7.45cqw, 46px)',
									gap: 'min(7px, 0.89cqw)',
									zIndex: 1,
								}}
							>
								<span
									className="search-gradient-button flex h-full min-w-0 flex-1 items-center justify-center overflow-hidden"
									style={{
										borderRadius: 'min(9.178px, 1.16cqw)',
										border: '1.147px solid #000',
										boxSizing: 'border-box',
										paddingLeft: 'calc(clamp(43px, 8.46cqw, 50px) + min(7px, 0.89cqw))',
										color: '#FFF',
										fontFamily: 'Inter, sans-serif',
										fontSize: 'clamp(18px, 3cqw, 35.708px)',
										fontStyle: 'normal',
										fontWeight: 500,
										lineHeight: 'normal',
									}}
								>
									Sign up
								</span>
								<span
									className="flex shrink-0 items-center justify-center"
									style={{
										width: 'clamp(43px, 8.46cqw, 50px)',
										height: '100%',
										background: '#34C147',
										border: '1.147px solid #5DAB68',
										borderRadius: '0 min(7.54px, 0.96cqw) min(7.54px, 0.96cqw) 0',
										boxSizing: 'border-box',
										filter: 'drop-shadow(0 1.147px 2.294px rgba(0, 0, 0, 0.05))',
									}}
								>
									<svg
										width="25"
										height="18"
										viewBox="0 0 27 19"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
										aria-hidden="true"
										style={{
											width: 'clamp(19px, 3.16cqw, 25px)',
											height: 'clamp(14px, 2.28cqw, 18px)',
										}}
									>
										<path
											d="M1.5 9.5H24.5M24.5 9.5L16.5 1.5M24.5 9.5L16.5 17.5"
											stroke="white"
											strokeWidth="2.6"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</span>
							</a>
						</div>
					)}
					{showFreeTrialButton && (
						<Link
							href={urls.home.startFreeTrial}
							onClick={(event) => {
								event.preventDefault();
								// Clear any stale post-sign-in redirect (e.g. from the dashboard's
								// sign-in fallback) so signing up stays on this page.
								sessionStorage.removeItem('redirectAfterSignIn');
								setTrialClicked(true);
							}}
							className="absolute inset-x-0 bottom-0 flex h-[52px] items-center justify-center bg-[#408249] text-lg font-medium text-white transition-opacity hover:opacity-95"
						>
							Start Free Trial
						</Link>
					)}
				</div>
				<div className="mt-7 flex flex-col items-center gap-2 px-4 text-center">
					<h2
						className="text-[18px] font-medium leading-tight"
						style={{ color: '#6E6E73' }}
					>
						The whole world at your fingertips
					</h2>
					<p
						className="max-w-[400px] text-[13px] leading-snug"
						style={{ color: '#86868B' }}
					>
						Murmur brings together more than 100,000+ venues, festivals, and radio
						stations, with tools to actually reach them.
					</p>
					<span
						className="mt-1.5 hidden text-[13px] lg:inline"
						style={{ color: '#8E8E93' }}
					>
						Trusted by
					</span>
				</div>
				<TrustedByLogoGrid className="mt-5 lg:hidden" />
			</div>
			{/* Mounted outside the card: its container-type traps position:fixed children. */}
			{showFreeTrialButton && (
				<Suspense fallback={null}>
					<StartFreeTrialModal open={trialClicked} />
				</Suspense>
			)}
		</main>
	);
}
