'use client';
import { SignUpButton, useAuth, UserButton } from '@clerk/nextjs';
import { SignInButton } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import { Button } from '@/components/ui/button';
import LogoIcon from '@/components/atoms/_svg/LogoIcon';
import { MenuIcon } from 'lucide-react';
import { useMe } from '@/hooks/useMe';
import Link from 'next/link';
import { cn } from '@/utils';
import { NavigationMenuLink } from '@/components/ui/navigation-menu';
import { forwardRef, useState, useEffect } from 'react';
import { Typography } from '@/components/ui/typography';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
export const Navbar = () => {
	const { user } = useMe();
	const { isSignedIn } = useAuth();
	const pathname = usePathname();
	const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [isNavbarVisible, setIsNavbarVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

	const controlNavbar = () => {
		if (window.scrollY > lastScrollY) {
			// if scroll down hide the navbar
			setIsNavbarVisible(false);
		} else {
			// if scroll up show the navbar
			setIsNavbarVisible(true);
		}

		// remember current page location to use in the next move
		setLastScrollY(window.scrollY);
	};

	useEffect(() => {
		window.addEventListener('scroll', controlNavbar);

		// cleanup function
		return () => {
			window.removeEventListener('scroll', controlNavbar);
		};
	}, []);

	type UrlList = {
		path: string;
		label: string;
	};
	const urlList: UrlList[] = [
		{ path: urls.home.index, label: 'Home' },
		{ path: urls.pricing.index, label: 'Pricing' },
		{ path: urls.contact.index, label: 'Help' },
		{ path: urls.admin.index, label: 'Admin' },
	].filter((url) => !(user?.role !== 'admin' && url.path === '/admin'));
	return (
		<div
			className={twMerge(
				'sticky top-0 bg-muted z-50 transition-all duration-300',
				!isNavbarVisible ? 'h-[55px]' : 'h-[110px]'
			)}
		>
			{/* Desktop Menu */}
			<div className="flex flex-col h-full justify-center items-center">
				{/* Logo Section - Hidden when scrolling down */}
				<div
					className={twMerge(
						'w-fit mx-auto flex items-center pt-2 justify-center transition-all duration-300 overflow-hidden',
						!isNavbarVisible ? 'h-0 opacity-0' : 'h-55/100 opacity-100'
					)}
				>
					<Link href={urls.home.index} className="w-[200px] items-center">
						<LogoIcon
							height="48px"
							width="59px"
							pathClassName="fill-background stroke-background"
						/>
					</Link>
				</div>

				{/* Navigation Section - Always visible */}
				<div
					className={twMerge(
						'flex items-center justify-center transition-all duration-300',
						!isNavbarVisible ? 'h-full' : 'h-45/100'
					)}
				>
					<div className="hidden lg:flex flex-row gap-13 ">
						{urlList.map((url) => {
							return (
								<Link className="hover:cursor-pointer" key={url.path} href={url.path}>
									<Typography
										className={twMerge(
											'text-[14px] transition duration-300',
											pathname === url.path
												? '-translate-y-[2px] opacity-100'
												: 'translate-y-0 opacity-80'
										)}
										color="background"
									>
										{url.label}
									</Typography>
								</Link>
							);
						})}
					</div>

					<div className="absolute right-5 ml-auto flex items-center space-x-4 ">
						{/* <div className="[&_span]:bg-black">
							<DarkModeToggle />
						</div> */}
						{isSignedIn ? (
							<UserButton />
						) : (
							<>
								<SignInButton mode="modal">
									<Button>Sign In</Button>
								</SignInButton>
								<SignUpButton mode="modal">
									<Button>Sign Up</Button>
								</SignUpButton>
							</>
						)}
						<Button
							outline
							size="icon"
							className="lg:hidden"
							onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
						>
							<MenuIcon />
						</Button>
					</div>
				</div>
			</div>
			{/* Mobile Menu */}
			<div
				className={cn(
					'fixed z-40 top-16 right-0 w-full h-[calc(100vh-4rem)] transform transition-opacity duration-500 ease-in-out lg:hidden',
					isMobileMenuOpen
						? 'pointer-events-auto opacity-100'
						: 'pointer-events-none opacity-0'
				)}
			>
				<nav className="flex flex-col p-4 items-center justify-evenly h-full space-y-2">
					{urlList.map((url, index) => {
						return (
							<Link
								key={index}
								href={url.path}
								className="px-4 py-2 rounded-md w-[125%] text-center hover:bg-card transition-all duration-500 text-3xl "
								onClick={() => setMobileMenuOpen(false)}
							>
								{url.label}
							</Link>
						);
					})}
				</nav>
			</div>
		</div>
	);
};

const ListItem = forwardRef<React.ElementRef<'a'>, React.ComponentPropsWithoutRef<'a'>>(
	({ className, title, children, ...props }, ref) => {
		return (
			<li>
				<NavigationMenuLink asChild>
					<a
						ref={ref}
						className={cn(
							'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
							className
						)}
						{...props}
					>
						<div className="text-sm font-medium leading-none">{title}</div>
						<p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
							{children}
						</p>
					</a>
				</NavigationMenuLink>
			</li>
		);
	}
);
ListItem.displayName = 'ListItem';
