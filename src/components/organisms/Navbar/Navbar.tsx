'use client';
import { useAuth, UserButton, SignUpButton, SignInButton } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import { useMe } from '@/hooks/useMe';
import Link from 'next/link';
import { cn } from '@/utils';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { StripeSubscriptionStatus } from '@/types';

export const Navbar = () => {
	const { user } = useMe();
	const { isSignedIn } = useAuth();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const prevIsSignedInRef = useRef(isSignedIn);

	const hasActiveSubscription =
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE ||
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.TRIALING;
	const canAccessApp = hasActiveSubscription || user?.role === 'admin';

	// If a signed-in user has an active subscription, keep them out of the landing page.
	// Also, if they just signed in (modal), send them to the dashboard immediately.
	useEffect(() => {
		const wasSignedIn = prevIsSignedInRef.current;
		prevIsSignedInRef.current = isSignedIn;

		if (!isSignedIn) return;
		if (!canAccessApp) return;

		const justSignedIn = !wasSignedIn && isSignedIn;
		const isLanding = pathname === urls.home.index;
		const isActiveLandingView =
			isLanding && searchParams?.get('activeLanding') === '1';
		if (!justSignedIn && !isLanding) return;
		// Allow an active, subscribed user to view the landing page only when explicitly requested
		// (e.g. navigating from the dashboard via a special link).
		if (!justSignedIn && isActiveLandingView) return;

		router.replace(urls.murmur.dashboard.index);
	}, [canAccessApp, isSignedIn, pathname, router, searchParams]);

	useEffect(() => {
		const HERO_SECTION_ID = 'landing-hero';
		const isLanding = pathname === urls.home.index;

		const update = () => {
			// Landing page: keep the navbar fully transparent until the hero/video section is passed.
			if (isLanding) {
				const hero = document.getElementById(HERO_SECTION_ID);
				if (hero) {
					const heroBottom = hero.getBoundingClientRect().bottom;
					// Switch as soon as the hero is fully out of view.
					// This prevents the "border line" from flashing while re-entering the hero on scroll up.
					setScrolled(heroBottom <= 0);
					return;
				}
			}

			// Other pages: default behavior.
			setScrolled(window.scrollY > 20);
		};

		update();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	}, [pathname]);

	// Close mobile menu on route change
	useEffect(() => {
		setMobileMenuOpen(false);
	}, [pathname]);

	// Prevent body scroll when mobile menu is open
	useEffect(() => {
		if (isMobileMenuOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = 'unset';
		}
		return () => {
			document.body.style.overflow = 'unset';
		};
	}, [isMobileMenuOpen]);

	// If the viewport grows to desktop, ensure the mobile menu is closed (button is hidden on desktop).
	useEffect(() => {
		const DESKTOP_BREAKPOINT_PX = 1145;
		const onResize = () => {
			if (window.innerWidth >= DESKTOP_BREAKPOINT_PX) {
				setMobileMenuOpen(false);
			}
		};
		onResize();
		window.addEventListener('resize', onResize, { passive: true });
		return () => window.removeEventListener('resize', onResize);
	}, []);

	type NavItem = {
		path: string;
		label: string;
	};

	const navItems: NavItem[] = [
		{ path: urls.home.index, label: 'Home' },
		{ path: urls.pricing.index, label: 'Pricing' },
		{ path: urls.resources.index, label: 'Resources' },
		{ path: urls.admin.index, label: 'Admin' },
	].filter((item) => !(user?.role !== 'admin' && item.path === '/admin'));

	const isLanding = pathname === urls.home.index;
	const isMapPage = pathname === '/map' || pathname.startsWith('/map/');
	const isPricingPage = pathname === urls.pricing.index || pathname.startsWith(`${urls.pricing.index}/`);
	const isResourcesPage =
		pathname === urls.resources.index || pathname.startsWith(`${urls.resources.index}/`);
	const isResearchPage = pathname === '/research' || pathname.startsWith('/research/');
	const isInboxPage = pathname === '/inbox' || pathname.startsWith('/inbox/');
	const isDraftingPage = pathname === '/drafting' || pathname.startsWith('/drafting/');
	const showBackArrow = isMapPage || isResearchPage || isInboxPage || isDraftingPage;
	const isLandingNavbarZoom80 = isLanding || isMapPage;
	const isOverLandingHero = isLanding && !scrolled;
	const isFreeTrial =
		pathname === urls.freeTrial.index || pathname.startsWith(`${urls.freeTrial.index}/`);
	const isTransparentHeader = isOverLandingHero || isFreeTrial;
	// Map + Research + Inbox pages: navbar should be fully invisible at the top (so the gradient shows behind it),
	// then become visible once the user scrolls.
	const isMapTopTransparent = (isMapPage || isResearchPage || isInboxPage) && !scrolled;
	// When the mobile menu is open, the menu panel has a light background even on the landing hero.
	// Force the hamburger/X icon to a dark color so we don't get a "double icon" feel through transparency.
	const mobileMenuIconColor = isMobileMenuOpen
		? 'bg-gray-700'
		: isTransparentHeader
			? 'bg-white/90'
			: 'bg-gray-700';

	// On `/free-trial` we show either the Clerk auth flow or embedded Stripe checkout;
	// hide the header entirely in both cases so it doesn't distract or clip.
	if (isFreeTrial) {
		return null;
	}

	return (
		<>
			{/* Main Navigation Bar - Artistic Glass */}
			<nav
				className={cn(
					'fixed z-50 font-secondary',
					// Mobile: make the navbar "morph" into the dropdown card (so it doesn't feel split).
					isMobileMenuOpen
						? [
								'top-4 left-4 right-4',
								'rounded-lg bg-background/95 backdrop-blur-3xl',
								'shadow-[0_18px_50px_rgba(0,0,0,0.18)]',
								'overflow-hidden',
								// Only animate vertical + visual properties (avoid "slides in from right" feel)
								'transition-[top,background-color,box-shadow,border-radius] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
							]
						: [
								'top-0',
								// Landing page: zoom the fixed navbar without drifting horizontally.
								isLandingNavbarZoom80
									? 'landing-navbar-zoom-80'
									: isPricingPage
										? 'pricing-navbar-zoom-80'
										: isResourcesPage
											? 'resources-navbar-zoom-80'
										: 'left-0 right-0',
								// Keep a smooth fade-in when leaving the hero, but snap to transparent when re-entering it.
								isTransparentHeader ? 'transition-none' : 'transition-colors duration-700',
								isTransparentHeader
									? 'bg-transparent'
									: isMapTopTransparent
										? 'bg-transparent'
										: scrolled
											? 'bg-background/70 backdrop-blur-xl border-b border-gray-200/20'
											: 'bg-background/40 backdrop-blur-md',
							]
				)}
			>
				<div className="w-full">
					<div
						className={cn(
							'flex items-center justify-between h-12 px-5 sm:px-6 min-[1145px]:px-12',
							isFreeTrial && 'pt-[4px]'
						)}
					>
						{/* Left Section - Back arrow on feature pages, UserButton on mobile otherwise */}
						<div className="min-[1145px]:hidden flex items-center">
							{showBackArrow ? (
								<Link
									href="/"
									className="text-[#060606] hover:text-gray-500 transition-colors"
									title="Back to Home"
									aria-label="Back to Home"
								>
									<svg
										width="22"
										height="13"
										viewBox="0 0 27 16"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M0.292892 7.29289C-0.0976315 7.68342 -0.0976315 8.31658 0.292892 8.70711L6.65685 15.0711C7.04738 15.4616 7.68054 15.4616 8.07107 15.0711C8.46159 14.6805 8.46159 14.0474 8.07107 13.6569L2.41421 8L8.07107 2.34315C8.46159 1.95262 8.46159 1.31946 8.07107 0.928932C7.68054 0.538408 7.04738 0.538408 6.65685 0.928932L0.292892 7.29289ZM27 8V7L1 7V8V9L27 9V8Z"
											fill="currentColor"
										/>
									</svg>
								</Link>
							) : isSignedIn ? (
								<UserButton
									appearance={{
										elements: {
											avatarBox: cn(
												'shrink-0',
												isMobileMenuOpen ? 'w-5 h-5' : 'w-6 h-6'
											),
											userButtonTrigger:
												'p-0 opacity-70 hover:opacity-100 transition-opacity duration-300',
										},
									}}
								/>
							) : (
								<div className={cn(isMobileMenuOpen ? 'w-5 h-5' : 'w-6 h-6')} /> /* Empty spacer */
							)}
						</div>
						{/* Desktop left section - Back arrow on feature pages, spacer otherwise */}
						<div className="hidden min-[1145px]:flex items-center w-7 h-7">
							{showBackArrow && (
								<Link
									href="/"
									className="text-[#060606] hover:text-gray-500 transition-colors"
									title="Back to Home"
									aria-label="Back to Home"
								>
									<svg
										width="16"
										height="10"
										viewBox="0 0 27 16"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M0.292892 7.29289C-0.0976315 7.68342 -0.0976315 8.31658 0.292892 8.70711L6.65685 15.0711C7.04738 15.4616 7.68054 15.4616 8.07107 15.0711C8.46159 14.6805 8.46159 14.0474 8.07107 13.6569L2.41421 8L8.07107 2.34315C8.46159 1.95262 8.46159 1.31946 8.07107 0.928932C7.68054 0.538408 7.04738 0.538408 6.65685 0.928932L0.292892 7.29289ZM27 8V7L1 7V8V9L27 9V8Z"
											fill="currentColor"
										/>
									</svg>
								</Link>
							)}
						</div>
						{/* Desktop Navigation */}
						<div className="absolute inset-0 hidden min-[1145px]:flex items-center justify-center pointer-events-none">
							<nav className="pointer-events-auto flex items-center gap-14">
								{navItems.map((item) => (
									<Link
										key={item.path}
										href={item.path}
										className={cn(
											'relative text-[13px] font-medium tracking-[0.02em] transition-all duration-300',
											pathname === item.path
												? isTransparentHeader
													? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]'
													: 'text-gray-900'
												: isTransparentHeader
													? 'text-white/70 hover:text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]'
													: 'text-gray-700/70 hover:text-gray-900',
											'after:absolute after:bottom-[-8px] after:left-0 after:right-0 after:h-[1px]',
											isTransparentHeader ? 'after:bg-white' : 'after:bg-gray-900',
											pathname === item.path
												? 'after:scale-x-100'
												: 'after:scale-x-0 hover:after:scale-x-100',
											'after:transition-transform after:duration-300 after:origin-center'
										)}
									>
										{item.label}
									</Link>
								))}
							</nav>
						</div>
						{/* Right Section - Hamburger on mobile, Auth on desktop */}
						<div className="flex items-center">
							{/* Mobile - Hamburger Menu */}
							<button
								onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
								className={cn(
									'min-[1145px]:hidden relative w-7 h-7 flex items-center justify-center',
									'transition-all duration-300'
								)}
								aria-label="Toggle menu"
							>
								<span
									className={cn(
										'absolute block h-[1.5px] w-[18px] transition-all duration-300',
										mobileMenuIconColor,
										isMobileMenuOpen
											? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45'
											: 'top-[11px] left-1/2 -translate-x-1/2'
									)}
								/>
								<span
									className={cn(
										'absolute block h-[1.5px] w-[18px] transition-all duration-300',
										mobileMenuIconColor,
										isMobileMenuOpen
											? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45'
											: 'bottom-[10px] left-1/2 -translate-x-1/2'
									)}
								/>
							</button>

							{/* Desktop - Show auth buttons */}
							<div className="hidden min-[1145px]:flex items-center">
								{isSignedIn ? (
									<UserButton
										appearance={{
											elements: {
												avatarBox: cn(
													'w-7 h-7 ring-1',
													isTransparentHeader ? 'ring-white/25' : 'ring-black/10'
												),
												userButtonTrigger:
													cn(
														'opacity-80 hover:opacity-100 transition-opacity duration-500',
														isTransparentHeader &&
															'drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]'
													),
											},
										}}
									/>
								) : (
									<div className="flex items-center">
										<Link
											href={urls.freeTrial.index}
											className="mr-6 flex items-center justify-center text-white text-[12px] font-medium tracking-[0.02em] transition-all duration-300 hover:opacity-90"
											style={{
												width: '219px',
												height: '33px',
												backgroundColor: '#53B060',
												border: '1px solid #118521',
												borderRadius: '8px',
											}}
										>
											Start Free Trial
										</Link>
										<SignInButton mode="modal">
											<button
												className={cn(
													'relative px-4 text-[12px] font-medium tracking-[0.02em] transition-all duration-300',
													'after:absolute after:bottom-[-8px] after:left-4 after:right-4 after:h-[1px]',
													'after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 after:origin-center',
													isTransparentHeader
														? 'text-white/80 hover:text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)] after:bg-white'
														: 'text-gray-700/70 hover:text-gray-900 after:bg-gray-900'
												)}
											>
												Sign in
											</button>
										</SignInButton>
										<div
											className={cn(
												'w-[1px] h-4 mx-3',
												isTransparentHeader ? 'bg-white/30' : 'bg-gray-300/50'
											)}
										/>
										<SignUpButton mode="modal">
											<button
												className={cn(
													'relative px-4 text-[12px] font-medium tracking-[0.02em] transition-all duration-300',
													'after:absolute after:bottom-[-8px] after:left-4 after:right-4 after:h-[1px]',
													'after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 after:origin-center',
													isTransparentHeader
														? 'text-white/80 hover:text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)] after:bg-white'
														: 'text-gray-700/70 hover:text-gray-900 after:bg-gray-900'
												)}
											>
												Sign up
											</button>
										</SignUpButton>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Mobile dropdown content (lives inside navbar so it expands/morphs) */}
					<div
						className={cn(
							'min-[1145px]:hidden',
							'transition-[max-height,opacity,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
							isMobileMenuOpen
								? 'max-h-[calc(100dvh-112px)] opacity-100 translate-y-0 overflow-y-auto overscroll-contain'
								: 'max-h-0 opacity-0 -translate-y-2 overflow-hidden'
						)}
					>
						<div className="border-t border-gray-200/20">
							{/* Mobile Navigation Links */}
							<div className="px-5 pt-4 pb-3">
								<nav>
									<ul className="space-y-0">
										{navItems.map((item) => (
											<li key={item.path}>
												<Link
													href={item.path}
													className={cn(
														'block py-3 text-[20px] text-gray-800 font-secondary',
														'transition-colors duration-200',
														pathname === item.path
															? 'text-gray-900'
															: 'hover:text-gray-900'
													)}
													onClick={() => setMobileMenuOpen(false)}
												>
													{item.label}
												</Link>
											</li>
										))}
									</ul>
								</nav>
							</div>

							{/* Mobile Auth Section */}
							{!isSignedIn && (
								<div className="px-5 py-4 border-t border-gray-200/20">
									<div className="flex space-x-6">
										<SignInButton mode="modal">
											<button
												className="flex-1 py-2.5 text-center text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200 font-secondary"
												onClick={() => setMobileMenuOpen(false)}
											>
												Sign in
											</button>
										</SignInButton>
										<SignUpButton mode="modal">
											<button
												className="flex-1 py-2.5 text-center text-[14px] text-gray-600 hover:text-gray-900 transition-colors duration-200 font-secondary"
												onClick={() => setMobileMenuOpen(false)}
											>
												Sign up
											</button>
										</SignUpButton>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</nav>

			{/* Mobile Menu Overlay */}
			<div
				className={cn(
					'fixed inset-0 z-40 min-[1145px]:hidden',
					isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
				)}
			>
				{/* Backdrop */}
				<div
					className={cn(
						'absolute inset-0 bg-black/30 transition-opacity duration-500',
						isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
					)}
					onClick={() => setMobileMenuOpen(false)}
				/>
			</div>

			{/* Spacer */}
			{!(isLanding || isFreeTrial) && <div className="h-12" />}
		</>
	);
};
