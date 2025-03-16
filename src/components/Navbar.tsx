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

function NavItem({ url }: { url: Url }) {
	return (
		<NavigationMenuItem key={url.path}>
			<Link href={url.path} legacyBehavior passHref>
				<NavigationMenuLink className={navigationMenuTriggerStyle()}>
					{url.label}
				</NavigationMenuLink>
			</Link>
		</NavigationMenuItem>
	);
}

export async function Navbar() {
	const { userId } = await auth();
	const isSignedIn = !!userId;

	return (
		<div className="border-b">
			<div className="flex h-16 items-center px-4 container mx-auto">
				<NavigationMenu>
					<NavigationMenuList>
						<NavItem url={urls.home} />
						<NavItem url={urls.products} />
						<NavItem url={urls.dashboard} />
					</NavigationMenuList>
				</NavigationMenu>
				<div className="ml-auto flex items-center space-x-4">
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
	);
}
