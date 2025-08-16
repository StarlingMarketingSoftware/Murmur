'use client';
import { useAuth, UserButton, SignUpButton, SignInButton } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
// import { Menu, X, ChevronRight } from 'lucide-react';
import { useMe } from '@/hooks/useMe';
import Link from 'next/link';
import { cn } from '@/utils';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
// import LogoIcon from '@/components/atoms/_svg/LogoIcon';

export const Navbar = () => {
	const { user } = useMe();
	const { isSignedIn } = useAuth();
	const pathname = usePathname();
	const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 20);
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

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

	return (
		<>
			{/* Main Navigation Bar - Artistic Glass */}
			<nav
				className={cn(
					'fixed top-0 left-0 right-0 z-50 transition-all duration-700 font-inter',
					scrolled 
						? 'bg-white/30 backdrop-blur-3xl backdrop-saturate-200 border-b border-white/10' 
						: 'bg-white/10 backdrop-blur-2xl backdrop-saturate-150'
				)}
			>
				<div className="w-full">
					<div className="flex items-center justify-between h-12 px-5 sm:px-6 lg:px-12">
						{/* Left Section - UserButton on mobile, empty on desktop */}
						<div className="lg:hidden flex items-center">
							{isSignedIn ? (
								<UserButton
									afterSignOutUrl="/"
									appearance={{
										elements: {
											avatarBox: 'w-7 h-7',
											userButtonTrigger: 'opacity-70 hover:opacity-100 transition-opacity duration-300'
										}
									}}
								/>
							) : (
								<div className="w-7 h-7" /> /* Empty spacer */
							)}
						</div>
						<div className="hidden lg:block w-7 h-7" /> {/* Spacer for desktop */}

						{/* Desktop Navigation - Premium Center */}
						<div className="absolute inset-0 hidden lg:flex items-center justify-center pointer-events-none">
							<nav className="pointer-events-auto flex items-center gap-14">
								{navItems.map((item) => (
									<Link
										key={item.path}
										href={item.path}
										className={cn(
											'relative text-[13px] font-medium tracking-[0.02em] transition-all duration-300',
											pathname === item.path 
												? 'text-gray-900' 
												: 'text-gray-700/70 hover:text-gray-900',
											'after:absolute after:bottom-[-8px] after:left-0 after:right-0 after:h-[1px]',
											'after:bg-gray-900',
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
									"lg:hidden relative w-7 h-7 flex items-center justify-center",
									"transition-all duration-300"
								)}
								aria-label="Toggle menu"
							>
								<span
									className={cn(
										"absolute block h-[1.5px] w-[18px] bg-gray-700 transition-all duration-300",
										isMobileMenuOpen 
											? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45" 
											: "top-[11px] left-1/2 -translate-x-1/2"
									)}
								/>
								<span
									className={cn(
										"absolute block h-[1.5px] w-[18px] bg-gray-700 transition-all duration-300",
										isMobileMenuOpen 
											? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45" 
											: "bottom-[10px] left-1/2 -translate-x-1/2"
									)}
								/>
							</button>

							{/* Desktop - Show auth buttons */}
							<div className="hidden lg:flex items-center">
								{isSignedIn ? (
									<UserButton
										afterSignOutUrl="/"
										appearance={{
											elements: {
												avatarBox: 'w-7 h-7 ring-1 ring-black/10',
												userButtonTrigger: 'opacity-80 hover:opacity-100 transition-opacity duration-500'
											}
										}}
									/>
								) : (
									<div className="flex items-center">
										<SignInButton mode="modal">
											<button className="relative px-4 text-[12px] font-medium tracking-[0.02em] text-gray-700/70 hover:text-gray-900 transition-all duration-300 after:absolute after:bottom-[-8px] after:left-4 after:right-4 after:h-[1px] after:bg-gray-900 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 after:origin-center">
												Sign in
											</button>
										</SignInButton>
										<div className="w-[1px] h-4 bg-gray-300/50 mx-3" />
										<SignUpButton mode="modal">
											<button className="relative px-4 text-[12px] font-medium tracking-[0.02em] text-gray-700/70 hover:text-gray-900 transition-all duration-300 after:absolute after:bottom-[-8px] after:left-4 after:right-4 after:h-[1px] after:bg-gray-900 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 after:origin-center">
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

			{/* Mobile Menu Overlay - Glass Art */}
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

				{/* Menu Panel - Apple Glass effect */}
				<div
					className={cn(
						'absolute top-0 left-0 right-0 h-screen',
						'bg-white backdrop-blur-3xl',
						'transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
						isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
					)}
				>
					{/* Mobile Header */}
					<div className="flex items-center justify-between h-12 px-5 pt-2">
						{isSignedIn ? (
							<UserButton
								afterSignOutUrl="/"
								appearance={{
									elements: {
										avatarBox: 'w-6 h-6',
										userButtonTrigger: 'opacity-60'
									}
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
												'block py-4 text-[28px] font-normal text-gray-800',
												'transition-colors duration-200',
												pathname === item.path 
													? 'text-gray-900' 
													: 'hover:text-gray-900'
											)}
											style={{ fontFamily: "'Times New Roman', Times, serif" }}
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
									<button 
										className="flex-1 py-3 text-center text-[16px] font-normal text-gray-600 hover:text-gray-900 transition-colors duration-200"
										style={{ fontFamily: "'Times New Roman', Times, serif" }}
									>
										Sign in
									</button>
								</SignInButton>
								<SignUpButton mode="modal">
									<button 
										className="flex-1 py-3 text-center text-[16px] font-normal text-gray-600 hover:text-gray-900 transition-colors duration-200"
										style={{ fontFamily: "'Times New Roman', Times, serif" }}
									>
										Sign up
									</button>
								</SignUpButton>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Spacer */}
			<div className="h-12" />
		</>
	);
};
