'use client';
import { SignUpButton, UserButton } from '@clerk/nextjs';
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
import { cn } from '@/lib/utils';
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
	const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
	const urlList = [
		urls.home,
		urls.about,
		urls.murmur.dashboard,
		urls.contact,
		urls.admin,
	].filter((url) => !(user?.role !== 'admin' && url.path === '/admin'));

	return (
		<>
			<div className="sticky top-0 z-10 bg-background shadow-sm">
				<div className="flex h-16 items-center justify-center px-4 container mx-auto">
					<div className="ml-4 hidden lg:flex absolute h-6/10 left-0 justify-center items-center space-x-2">
						<Logo pathClassName="fill-foreground stroke-foreground" />
					</div>
					<div className="ml-4 absolute h-6/10 left-0 flex lg:hidden justify-center items-center space-x-2">
						<LogoIcon pathClassName="fill-foreground stroke-foreground" />
					</div>
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
						{!!user ? (
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
		</>
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
