'use client';
import { useAuth, UserButton, SignUpButton, SignInButton } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import { Menu, X, ChevronRight } from 'lucide-react';
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
			{/* Main Navigation Bar - Light Apple Style */}
			<nav
				className={cn(
					'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
					scrolled 
						? 'bg-gray-100/90 backdrop-blur-xl border-b border-gray-200/50' 
						: 'bg-white/70 backdrop-blur-lg'
				)}
			>
				<div className="w-full px-6 lg:px-8">
					<div className="relative flex items-center justify-between h-11">
						{/* Mobile Menu Button */}
						<button
							onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
							className={cn(
								"lg:hidden relative w-5 h-5",
								"transition-all duration-300"
							)}
							aria-label="Toggle menu"
						>
							<span className={cn(
								"absolute block h-[1.5px] w-5 bg-gray-600 transition-all duration-300 ease-out",
								isMobileMenuOpen ? "rotate-45 top-[9px]" : "top-[5px]"
							)} />
							<span className={cn(
								"absolute block h-[1.5px] w-5 bg-gray-600 transition-all duration-300 ease-out top-[9px]",
								isMobileMenuOpen ? "opacity-0" : "opacity-100"
							)} />
							<span className={cn(
								"absolute block h-[1.5px] w-5 bg-gray-600 transition-all duration-300 ease-out",
								isMobileMenuOpen ? "-rotate-45 top-[9px]" : "top-[13px]"
							)} />
						</button>

						{/* Desktop Navigation - Absolutely Centered */}
						<div className="absolute inset-0 hidden lg:flex items-center justify-center pointer-events-none">
							<nav className="pointer-events-auto flex items-center gap-7">
								{navItems.map((item) => (
									<Link
										key={item.path}
										href={item.path}
										className={cn(
											'px-2.5 h-7 inline-flex items-center rounded-full text-[12px] font-normal tracking-[-0.01em] transition-colors duration-150',
											pathname === item.path 
												? 'text-gray-900' 
												: 'text-gray-600 hover:text-gray-900 hover:bg-black/5'
										)}
									>
										{item.label}
									</Link>
								))}
							</nav>
						</div>

						{/* Auth Section - Right Aligned */}
						<div className="flex items-center ml-auto">
							{isSignedIn ? (
								<UserButton
									afterSignOutUrl="/"
									appearance={{
										elements: {
											avatarBox: 'w-7 h-7',
											userButtonTrigger: 'opacity-80 hover:opacity-100 transition-opacity duration-200'
										}
									}}
								/>
							) : (
								<div className="flex items-center gap-3">
									<SignInButton mode="modal">
										<button className="inline-flex items-center justify-center h-7 px-3 text-[12px] font-normal tracking-[-0.01em] text-gray-700 hover:text-gray-900 transition-colors">
											Sign In
										</button>
									</SignInButton>
									<SignUpButton mode="modal">
										<button className="inline-flex items-center justify-center h-7 px-4 text-[12px] font-normal tracking-[-0.01em] rounded-full border border-black/5 bg-white/70 hover:bg-white/90 text-gray-900 transition-colors">
											Sign Up
										</button>
									</SignUpButton>
								</div>
							)}
						</div>
					</div>
				</div>
			</nav>

			{/* Mobile Menu Overlay - Light Theme */}
			<div
				className={cn(
					'fixed inset-0 z-40 lg:hidden',
					isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
				)}
			>
				{/* Backdrop */}
				<div
					className={cn(
						'absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-500',
						isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
					)}
					onClick={() => setMobileMenuOpen(false)}
				/>

				{/* Menu Panel - Slides from top */}
				<div
					className={cn(
						'absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-xl',
						'transition-transform duration-500 ease-out shadow-lg',
						isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
					)}
				>
					{/* Mobile Header */}
					<div className="flex items-center justify-between h-11 px-6">
						<button
							onClick={() => setMobileMenuOpen(false)}
							className="relative w-5 h-5"
							aria-label="Close menu"
						>
							<span className="absolute block h-[1.5px] w-5 bg-gray-600 rotate-45 top-[9px]" />
							<span className="absolute block h-[1.5px] w-5 bg-gray-600 -rotate-45 top-[9px]" />
						</button>

						{isSignedIn ? (
							<UserButton
								afterSignOutUrl="/"
								appearance={{
									elements: {
										avatarBox: 'w-7 h-7',
										userButtonTrigger: 'opacity-80'
									}
								}}
							/>
						) : (
							<div className="flex items-center gap-3">
								<SignInButton mode="modal">
									<button className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors">
										Sign In
									</button>
								</SignInButton>
								<SignUpButton mode="modal">
									<button className="text-[13px] font-medium px-3 py-1 rounded-full bg-gray-900/5 text-gray-900">
										Sign Up
									</button>
								</SignUpButton>
							</div>
						)}
					</div>

					{/* Divider */}
					<div className="h-[0.5px] bg-gray-200 mx-6" />

					{/* Mobile Navigation Links */}
					<nav className="px-6 py-4">
						<ul className="space-y-0">
							{navItems.map((item) => (
								<li key={item.path}>
									<Link
										href={item.path}
										className={cn(
											'flex items-center justify-between py-3 text-[17px] font-medium',
											'transition-colors duration-200',
											'border-b border-gray-100',
											pathname === item.path 
												? 'text-gray-900' 
												: 'text-gray-600 hover:text-gray-900'
										)}
										onClick={() => setMobileMenuOpen(false)}
									>
										<span>{item.label}</span>
										<ChevronRight className="w-4 h-4 text-gray-400" />
									</Link>
								</li>
							))}
						</ul>
					</nav>

					{/* Mobile Auth Section if not signed in */}
					{!isSignedIn && (
						<>
							<div className="h-[0.5px] bg-gray-200 mx-6" />
							<div className="px-6 py-6 space-y-3">
								<SignInButton mode="modal">
									<button className="w-full py-3 text-center text-[15px] font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
										Sign In to Your Account
									</button>
								</SignInButton>
								<SignUpButton mode="modal">
									<button className="w-full py-3 text-center text-[15px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
										Create New Account
									</button>
								</SignUpButton>
							</div>
						</>
					)}
				</div>
			</div>

			{/* Spacer */}
			<div className="h-11" />
		</>
	);
};
