'use client';
import { useAuth, UserButton, SignUpButton, SignInButton } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import { useMe } from '@/hooks/useMe';
import Link from 'next/link';
import { cn } from '@/utils';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export const Navbar = () => {
	const { user } = useMe();
	const { isSignedIn } = useAuth();
	const pathname = usePathname();
	const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

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

	type NavItem = {
		path: string;
		label: string;
	};

	const navItems: NavItem[] = [
		{ path: urls.home.index, label: 'Home' },
		{ path: urls.pricing.index, label: 'Pricing' },
		{ path: urls.contact.index, label: 'Help' },
		{ path: urls.admin.index, label: 'Admin' },
	].filter((item) => !(user?.role !== 'admin' && item.path === '/admin'));

	const isLanding = pathname === urls.home.index;
	const isOverLandingHero = isLanding && !scrolled;

	return (
		<>
			{/* Main Navigation Bar - Artistic Glass */}
			<nav
				className={cn(
					'fixed top-0 left-0 right-0 z-50 font-secondary',
					// Keep a smooth fade-in when leaving the hero, but snap to transparent when re-entering it.
					isOverLandingHero ? 'transition-none' : 'transition-colors duration-700',
					isOverLandingHero
						? 'bg-transparent'
						: scrolled
							? 'bg-background/70 backdrop-blur-xl border-b border-gray-200/20'
							: 'bg-background/40 backdrop-blur-md'
				)}
			>
				<div className="w-full">
					<div className="flex items-center justify-between h-12 px-5 sm:px-6 lg:px-12">
						{/* Left Section - UserButton on mobile, empty on desktop */}
						<div className="lg:hidden flex items-center">
							{isSignedIn ? (
								<UserButton
									appearance={{
										elements: {
											avatarBox: 'w-7 h-7',
											userButtonTrigger:
												'opacity-70 hover:opacity-100 transition-opacity duration-300',
										},
									}}
								/>
							) : (
								<div className="w-7 h-7" /> /* Empty spacer */
							)}
						</div>
						<div className="hidden lg:block w-7 h-7" /> {/* Spacer for desktop */}
						{/* Desktop Navigation */}
						<div className="absolute inset-0 hidden lg:flex items-center justify-center pointer-events-none">
							<nav className="pointer-events-auto flex items-center gap-14">
								{navItems.map((item) => (
									<Link
										key={item.path}
										href={item.path}
										className={cn(
											'relative text-[13px] font-medium tracking-[0.02em] transition-all duration-300',
											pathname === item.path
												? isOverLandingHero
													? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]'
													: 'text-gray-900'
												: isOverLandingHero
													? 'text-white/70 hover:text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]'
													: 'text-gray-700/70 hover:text-gray-900',
											'after:absolute after:bottom-[-8px] after:left-0 after:right-0 after:h-[1px]',
											isOverLandingHero ? 'after:bg-white' : 'after:bg-gray-900',
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
									'lg:hidden relative w-7 h-7 flex items-center justify-center',
									'transition-all duration-300'
								)}
								aria-label="Toggle menu"
							>
								<span
									className={cn(
										'absolute block h-[1.5px] w-[18px] transition-all duration-300',
										isOverLandingHero ? 'bg-white/90' : 'bg-gray-700',
										isMobileMenuOpen
											? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45'
											: 'top-[11px] left-1/2 -translate-x-1/2'
									)}
								/>
								<span
									className={cn(
										'absolute block h-[1.5px] w-[18px] transition-all duration-300',
										isOverLandingHero ? 'bg-white/90' : 'bg-gray-700',
										isMobileMenuOpen
											? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45'
											: 'bottom-[10px] left-1/2 -translate-x-1/2'
									)}
								/>
							</button>

							{/* Desktop - Show auth buttons */}
							<div className="hidden lg:flex items-center">
								{isSignedIn ? (
									<UserButton
										appearance={{
											elements: {
												avatarBox: cn(
													'w-7 h-7 ring-1',
													isOverLandingHero ? 'ring-white/25' : 'ring-black/10'
												),
												userButtonTrigger:
													cn(
														'opacity-80 hover:opacity-100 transition-opacity duration-500',
														isOverLandingHero && 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]'
													),
											},
										}}
									/>
								) : (
									<div className="flex items-center">
										<SignInButton mode="modal">
											<button
												className={cn(
													'relative px-4 text-[12px] font-medium tracking-[0.02em] transition-all duration-300',
													'after:absolute after:bottom-[-8px] after:left-4 after:right-4 after:h-[1px]',
													'after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 after:origin-center',
													isOverLandingHero
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
												isOverLandingHero ? 'bg-white/30' : 'bg-gray-300/50'
											)}
										/>
										<SignUpButton mode="modal">
											<button
												className={cn(
													'relative px-4 text-[12px] font-medium tracking-[0.02em] transition-all duration-300',
													'after:absolute after:bottom-[-8px] after:left-4 after:right-4 after:h-[1px]',
													'after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 after:origin-center',
													isOverLandingHero
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
				</div>
			</nav>

			{/* Mobile Menu Overlay */}
			<div
				className={cn(
					'fixed inset-0 z-40 lg:hidden',
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

				{/* Menu Panel */}
				<div
					className={cn(
						'absolute top-0 left-0 right-0 h-screen',
						'bg-background/90 backdrop-blur-3xl',
						'transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
						isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
					)}
				>
					{/* Mobile Header */}
					<div className="flex items-center justify-between h-12 px-5 pt-2">
						{isSignedIn ? (
							<UserButton
								appearance={{
									elements: {
										avatarBox: 'w-6 h-6',
										userButtonTrigger: 'opacity-60',
									},
								}}
							/>
						) : (
							<div className="w-6 h-6" />
						)}

						<button
							onClick={() => setMobileMenuOpen(false)}
							className="relative w-8 h-8 flex items-center justify-center"
							aria-label="Close menu"
						>
							<span className="absolute block h-[1.5px] w-[20px] bg-gray-700 rotate-45" />
							<span className="absolute block h-[1.5px] w-[20px] bg-gray-700 -rotate-45" />
						</button>
					</div>

					{/* Mobile Navigation Links */}
					<div className="px-5 pt-8">
						<nav>
							<ul className="space-y-0">
								{navItems.map((item) => (
									<li key={item.path}>
										<Link
											href={item.path}
											className={cn(
												'block py-4 text-[28px] text-gray-800 font-primary',
												'transition-colors duration-200',
												pathname === item.path ? 'text-gray-900' : 'hover:text-gray-900'
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
						<div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200/20">
							<div className="flex space-x-6">
								<SignInButton mode="modal">
									<button className="flex-1 py-3 text-center text-[16px] text-gray-600 hover:text-gray-900 transition-colors duration-200 font-primary">
										Sign in
									</button>
								</SignInButton>
								<SignUpButton mode="modal">
									<button className="flex-1 py-3 text-center text-[16px] text-gray-600 hover:text-gray-900 transition-colors duration-200 font-primary">
										Sign up
									</button>
								</SignUpButton>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Spacer */}
			{!isLanding && <div className="h-12" />}
		</>
	);
};
