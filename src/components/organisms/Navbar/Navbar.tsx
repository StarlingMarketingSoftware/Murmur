'use client';
import { SignUpButton, useAuth, UserButton } from '@clerk/nextjs';
import { SignInButton } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import AiCredits from '../AiCredits/AiCredits';
import { DarkModeToggle } from '@/components/atoms/DarkModeToggle/DarkModeToggle';
import { Button } from '@/components/ui/button';
import Logo from '@/components/atoms/_svg/Logo';
import LogoIcon from '@/components/atoms/_svg/LogoIcon';
import { MenuIcon } from 'lucide-react';
import { useMe } from '@/hooks/useMe';
import Link from 'next/link';
import { cn } from '@/utils';
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { forwardRef, useState } from 'react';

export const Navbar = () => {
	const { user } = useMe();
	const { isSignedIn } = useAuth();

	const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
	type UrlList = {
		path: string;
		label: string;
	};
	const urlList: UrlList[] = [
		{ path: urls.home.index, label: 'Home' },
		{ path: urls.about.index, label: 'About Us' },
		{ path: urls.murmur.dashboard.index, label: 'Murmur' },
		{ path: urls.contact.index, label: 'Contact' },
		{ path: urls.admin.index, label: 'Admin' },
	].filter((url) => !(user?.role !== 'admin' && url.path === '/admin'));

	return (
		<div className="sticky top-0 z-10 bg-background shadow-sm dark:shadow-accent z-50">
			<div className="">
				<div className="flex h-16 items-center justify-center">
					<Link
						href={urls.home.index}
						className="ml-4 hidden lg:flex absolute h-6/10 left-0 justify-center items-center space-x-2"
					>
						<Logo pathClassName="fill-foreground stroke-foreground" />
					</Link>
					<Link
						href={urls.home.index}
						className="ml-2 absolute h-6/10 w-[200px] left-0 flex lg:hidden  items-center"
					>
						<LogoIcon size="150px" pathClassName="fill-foreground stroke-foreground" />
					</Link>
					<div className="hidden lg:block">
						<NavigationMenu>
							<NavigationMenuList>
								{urlList.map((url, index) => {
									return (
										<NavigationMenuItem key={index}>
											<Link href={url.path} legacyBehavior passHref>
												<NavigationMenuLink className={navigationMenuTriggerStyle()}>
													{url.label}
												</NavigationMenuLink>
											</Link>
										</NavigationMenuItem>
									);
								})}
							</NavigationMenuList>
						</NavigationMenu>
					</div>

					<div className="absolute right-5 ml-auto flex items-center space-x-4">
						<AiCredits />
						<DarkModeToggle />
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
							variant="outline"
							size="icon"
							className="lg:hidden"
							onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
						>
							<MenuIcon />
						</Button>
					</div>
				</div>
			</div>
			<div
				className={cn(
					'fixed z-40 top-16 right-0 w-full h-[calc(100vh-4rem)] bg-background shadow-lg transform transition-opacity duration-500 ease-in-out lg:hidden',
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
