'use server';

import Link from 'next/link';
import {
	NavigationMenuItem,
	NavigationMenuLink,
	navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Url } from '@/constants/types';

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

export default NavItem;
