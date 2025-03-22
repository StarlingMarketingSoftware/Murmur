import Link from 'next/link';
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { SignUpButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { SignInButton } from '@clerk/nextjs';
import { Button } from './ui/button';
import { Url } from '@/constants/types';
import { urls } from '@/constants/urls';
import { headers } from 'next/headers';
import { twMerge } from 'tailwind-merge';

const urlList = [urls.home, urls.murmur, urls.pricing, urls.contact];

interface NavItemProps {
	url: Url;
	className?: string;
}

const NavItem: React.FC<NavItemProps> = ({ url, className }) => {
	return (
		<NavigationMenuItem className={className} key={url.path}>
			<Link href={url.path} legacyBehavior passHref>
				<NavigationMenuLink className={navigationMenuTriggerStyle()}>
					{url.label}
				</NavigationMenuLink>
			</Link>
		</NavigationMenuItem>
	);
};

export async function Navbar() {
	const { userId } = await auth();
	const headersList = await headers();
	const pathname = headersList.get('referer');
	console.log('🚀 ~ Navbar ~ pathname:', pathname);
	console.log('🚀 ~ Navbar ~ pathname:', pathname);
	const isSignedIn = !!userId;

	return (
		<>
			<div className="sticky top-0 z-10 bg-background shadow-sm">
				<div className="flex h-16 items-center justify-center px-4 container mx-auto">
					<NavigationMenu>
						<NavigationMenuList>
							{urlList.map((url, index) => (
								<NavItem
									key={index}
									url={url}
									className={twMerge(
										pathname === url.path && 'border-b-[1px] border-black'
									)}
								/>
							))}
						</NavigationMenuList>
					</NavigationMenu>
					<div className="absolute right-5 ml-auto flex items-center space-x-4">
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
					</div>
				</div>
			</div>
		</>
	);
}
