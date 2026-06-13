'use client';
import { useAuth, UserButton, SignInButton } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import { AccountType } from '@/constants/prismaEnums';
import { withClerkNoBranding } from '@/constants/auth';
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
	// Mobile landing: how far the hamburger drops to sit on the logo's line.
	const [burgerShiftPx, setBurgerShiftPx] = useState(0);
	const prevIsSignedInRef = useRef(isSignedIn);
	const navRef = useRef<HTMLElement | null>(null);

	const hasActiveSubscription =
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE ||
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.TRIALING;
	const canAccessApp = hasActiveSubscription || user?.role === 'admin';
	const isVenue = user?.accountType === AccountType.venue;
	// Venue accounts reach their portal without an artist subscription.
	const canEnterApp = isVenue || canAccessApp;
	const landingTarget = isVenue
		? urls.venuePortal.index
		: urls.murmur.dashboard.index;

	// If a signed-in user has an active subscription, keep them out of the landing page.
	// Also, if they just signed in (modal), send them to the dashboard immediately.
	useEffect(() => {
		const wasSignedIn = prevIsSignedInRef.current;
		prevIsSignedInRef.current = isSignedIn;

		if (!isSignedIn) return;
		if (!canEnterApp) return;

		const justSignedIn = !wasSignedIn && isSignedIn;
		const isLanding = pathname === urls.home.index;
		const isActiveLandingView =
			isLanding && searchParams?.get('activeLanding') === '1';
		if (!justSignedIn && !isLanding) return;
		// Allow an active, subscribed user to view the landing page only when explicitly requested
		// (e.g. navigating from the dashboard via a special link).
		if (!justSignedIn && isActiveLandingView) return;

		router.replace(landingTarget);
	}, [canEnterApp, landingTarget, isSignedIn, pathname, router, searchParams]);

	useEffect(() => {
		const update = () => {
			// Show navbar background once user scrolls past a small threshold
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
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
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
		{ path: urls.venue.index, label: 'Venue' },
		{ path: urls.admin.index, label: 'Admin' },
	].filter((item) => !(user?.role !== 'admin' && item.path === '/admin'));

	const isLanding = pathname === urls.home.index;
	const isLandingLikePage = isLanding || pathname === urls.venue.index;
	const isPricingPage = pathname === urls.pricing.index || pathname.startsWith(`${urls.pricing.index}/`);
	// Only the pricing index gets the page-anchored mobile navbar; free-trial
	// always scrolls and must keep a reachable menu.
	const isPricingIndexPage = pathname === urls.pricing.index;
	const isLandingNavbarZoom80 = isLandingLikePage;
	// Navbar is transparent only at the very top of the landing page (before any scroll)
	const isLandingAtTop = isLandingLikePage && !scrolled;
	const isTransparentHeader = isLandingAtTop;
	// Landing/venue pages are white now, so the hamburger/X must be black to be visible.
	const mobileMenuIconColor = isLandingLikePage ? 'bg-black' : 'bg-gray-700';

	// Mobile landing: the Murmur logo lives in the page flow (vertically centered
	// stack), while the hamburger sits in the page-anchored navbar. Measure the logo
	// so the hamburger can drop down onto its line and scroll away with it.
	useEffect(() => {
		if (!isLandingLikePage) {
			setBurgerShiftPx(0);
			return;
		}
		const update = () => {
			const logo = document.querySelector('.landing-home-logo');
			const nav = navRef.current;
			if (!logo || !nav || window.innerWidth >= 1145) {
				setBurgerShiftPx(0);
				return;
			}
			const logoRect = logo.getBoundingClientRect();
			// The navbar may be scaled (landing-navbar-zoom-80): convert the logo's
			// document position into the nav's local coordinate space.
			const scale = nav.offsetWidth
				? nav.getBoundingClientRect().width / nav.offsetWidth
				: 1;
			const logoCenterY = logoRect.top + window.scrollY + logoRect.height / 2;
			// The hamburger's resting center is at half the 48px navbar row.
			setBurgerShiftPx(Math.max(0, logoCenterY / scale - 24));
		};
		update();
		window.addEventListener('resize', update);
		// The stack is vertically centered, so its own size changes (fonts/images
		// loading) move the logo without firing a window resize.
		const stack = document.querySelector('.landing-home-stack');
		const observer = stack ? new ResizeObserver(update) : null;
		if (stack && observer) observer.observe(stack);
		return () => {
			window.removeEventListener('resize', update);
			observer?.disconnect();
		};
		// Re-measure when the menu closes: the nav swaps back to its scaled geometry.
	}, [isLandingLikePage, isMobileMenuOpen]);

	return (
		<>
			{/* Main Navigation Bar - Artistic Glass */}
			<nav
				ref={navRef}
				data-mobile-menu-open={isMobileMenuOpen ? 'true' : 'false'}
				className={cn(
					'fixed z-50 font-secondary',
					// Mobile: make the navbar "morph" into the dropdown card (so it doesn't feel split).
					isMobileMenuOpen
						? [
								'top-4 left-4 right-4',
								// Liquid glass - refractive blur with vivid colors
								'rounded-2xl bg-white/[0.15] backdrop-blur-[12px] backdrop-saturate-[1.8] backdrop-brightness-[1.05]',
								// Thin bright border stroke
								'border border-white/30',
								// Subtle depth shadow
								'shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)]',
								'overflow-hidden',
								// Only animate vertical + visual properties (avoid "slides in from right" feel)
								'transition-[top,background-color,box-shadow,border-radius] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
							]
						: [
								'top-0',
								// Mobile landing/venue/pricing: anchor the navbar to the page (like
								// the logo) so the hamburger scrolls away with the hero instead of
								// following.
								(isLandingLikePage || isPricingIndexPage) && 'max-[1144px]:absolute',
								// Landing page: zoom the fixed navbar without drifting horizontally.
								isLandingNavbarZoom80
									? 'landing-navbar-zoom-80'
									: isPricingPage
										? 'pricing-navbar-zoom-80'
										: 'left-0 right-0',
								// Smooth transition for background color changes in both directions
								'transition-[background-color,backdrop-filter,border-color,box-shadow] duration-500 ease-out',
								isTransparentHeader
									? // Keep the bottom border present (width 1px) but fully transparent so it
										// fades in via the border-color transition instead of snapping from 0→1px
										// when navigating to an opaque page (e.g. home/venue → pricing).
										'bg-transparent border-b border-white/0'
									: scrolled
										? [
											// Liquid glass - refractive blur that distorts but keeps colors vivid
											'bg-white/[0.1] backdrop-blur-[10px] backdrop-saturate-[1.8] backdrop-brightness-[1.05]',
											// Thin bright border line
											'border-b border-white/25',
											// Subtle inset highlight
											'shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.25)]',
											// Mobile landing/pricing: no header band — the page scrolls under the bare hamburger.
											(isLandingLikePage || isPricingIndexPage) &&
												'max-[1144px]:bg-transparent max-[1144px]:backdrop-filter-none max-[1144px]:border-white/0 max-[1144px]:shadow-none',
										]
										: [
											// Resting state - lighter refractive effect
											'bg-white/[0.06] backdrop-blur-[6px] backdrop-saturate-[1.5] backdrop-brightness-[1.02]',
											'border-b border-white/15',
										],
							]
				)}
			>
				<div className="w-full">
					<div
						className={cn(
							'flex items-center justify-between h-12 px-5 sm:px-6 min-[1145px]:px-12'
						)}
					>
						{/* Left Section - spacer to balance the hamburger (UserButton lives in the dropdown) */}
						<div className="min-[1145px]:hidden flex items-center">
							<div className={cn(isMobileMenuOpen ? 'w-5 h-5' : 'w-6 h-6')} /> {/* Empty spacer */}
						</div>
						{/* Desktop left section - spacer to balance the layout */}
						<div className="hidden min-[1145px]:flex items-center w-7 h-7">
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
											// Light gray with exclusion blend - darkens on light, lightens on dark
											'mix-blend-exclusion',
											pathname === item.path
												? 'text-[#a0a0a0]'
												: 'text-[#909090] hover:text-[#b0b0b0]',
											'after:absolute after:bottom-[-8px] after:left-0 after:right-0 after:h-[1px]',
											'after:bg-[#a0a0a0]',
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
								style={
									// Sit on the logo's line on the mobile landing (the page-anchored
									// navbar scrolls away with it); return to the bar when the menu opens.
									// burgerShiftPx is only non-zero on the mobile home landing.
									!isMobileMenuOpen && burgerShiftPx > 0
										? { transform: `translateY(${burgerShiftPx}px)` }
										: undefined
								}
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
										appearance={withClerkNoBranding({
											elements: {
												avatarBox: cn(
													'w-7 h-7 ring-1',
													'ring-black/10'
												),
												userButtonTrigger:
													cn(
														'opacity-80 hover:opacity-100 transition-opacity duration-500',
														null
													),
											},
										})}
									/>
								) : (
									<SignInButton mode="modal" withSignUp>
										<button
											className={cn(
												'relative px-4 text-[12px] font-medium tracking-[0.02em] transition-all duration-300',
												'after:absolute after:bottom-[-8px] after:left-4 after:right-4 after:h-[1px]',
												'after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 after:origin-center',
												'text-gray-700/70 hover:text-gray-900 after:bg-gray-900'
											)}
										>
											Sign in
										</button>
									</SignInButton>
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
														'block py-3 text-[20px] font-secondary',
														'transition-colors duration-300',
														pathname === item.path
															? 'text-gray-900'
															: 'text-gray-800 hover:text-gray-900'
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
							<div className="px-5 py-4 border-t border-gray-200/20">
								{isSignedIn ? (
									<UserButton
										appearance={withClerkNoBranding({
											elements: {
												avatarBox: 'w-7 h-7 shrink-0',
												userButtonTrigger:
													'p-0 opacity-80 hover:opacity-100 transition-opacity duration-300',
											},
										})}
									/>
								) : (
									<div className="flex">
										<SignInButton mode="modal" withSignUp>
											<button
												className="flex-1 py-2.5 text-center text-[14px] font-secondary transition-colors duration-300 text-gray-600 hover:text-gray-900"
												onClick={() => setMobileMenuOpen(false)}
											>
												Sign in
											</button>
										</SignInButton>
									</div>
								)}
							</div>
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

			{/* Spacer - skip on landing; on pricing keep it on mobile but drop it on
			    desktop so the gradient goes full-bleed behind the navbar like the landing page */}
			{isPricingPage ? (
				<div className="h-12 lg:hidden" />
			) : (
				!isLandingLikePage && <div className="h-12" />
			)}
		</>
	);
};
