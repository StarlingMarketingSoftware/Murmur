'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils';
import { UserButton } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import { useMe } from '@/hooks/useMe';

export default function MurmurLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const { user } = useMe();

	const navItems = [
		{ href: urls.home.index, label: 'Home' },
		{ href: urls.pricing.index, label: 'Pricing' },
		{ href: urls.contact.index, label: 'Help' },
		{ href: urls.admin.index, label: 'Admin' },
	].filter((item) => !(user?.role !== 'admin' && item.href === urls.admin.index));

	return (
		<>
			<nav className="w-full px-8 py-5">
				<div className="max-w-[1174px] mx-auto flex items-center justify-between">
					<div className="flex items-center gap-8">
						{navItems.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									'text-[13px] font-normal transition-all duration-200 font-secondary tracking-[0.02em]',
									pathname === item.href 
										? 'text-black opacity-100' 
										: 'text-gray-600 opacity-60 hover:opacity-100 hover:text-black'
								)}
							>
								{item.label}
							</Link>
						))}
					</div>
					<UserButton 
						afterSignOutUrl="/" 
						appearance={{
							elements: {
								avatarBox: "w-7 h-7",
								userButtonTrigger: "opacity-60 hover:opacity-100 transition-opacity duration-200"
							}
						}}
					/>
				</div>
			</nav>
			{children}
		</>
	);
}
