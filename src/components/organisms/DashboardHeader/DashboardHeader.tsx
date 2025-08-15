'use client';
import { UserButton, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { urls } from '@/constants/urls';
import LogoIcon from '@/components/atoms/_svg/LogoIcon';
import { MenuIcon, HomeIcon, BarChart2Icon, SettingsIcon } from 'lucide-react';
import { useState } from 'react';

export const DashboardHeader = () => {
	const { isSignedIn } = useAuth();
	const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container flex h-16 items-center">
				{/* Logo and Brand */}
				<div className="flex items-center gap-3">
					<Link href={urls.murmur.dashboard.index} className="flex items-center gap-2">
						<LogoIcon width="32px" height="32px" />
						<Typography 
							variant="h3" 
							className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
						>
							Murmur
						</Typography>
					</Link>
				</div>

				{/* Desktop Navigation */}
				<nav className="hidden md:flex items-center gap-6 ml-8">
					<Link 
						href={urls.murmur.dashboard.index} 
						className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
					>
						<HomeIcon className="h-4 w-4" />
						Dashboard
					</Link>
					<Link 
						href={urls.murmur.campaigns.index} 
						className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
					>
						<BarChart2Icon className="h-4 w-4" />
						Campaigns
					</Link>
					<Link 
						href={urls.murmur.settings.index} 
						className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
					>
						<SettingsIcon className="h-4 w-4" />
						Settings
					</Link>
				</nav>

				{/* Right side - User menu */}
				<div className="ml-auto flex items-center gap-4">
					{/* Mobile menu button */}
					<Button
						variant="ghost"
						size="sm"
						className="md:hidden"
						onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
					>
						<MenuIcon className="h-5 w-5" />
					</Button>

					{/* User button */}
					{isSignedIn && (
						<UserButton afterSignOutUrl={urls.home.index} />
					)}
				</div>
			</div>

			{/* Mobile Navigation */}
			{isMobileMenuOpen && (
				<div className="md:hidden border-t">
					<nav className="flex flex-col space-y-2 p-4">
						<Link 
							href={urls.murmur.dashboard.index} 
							className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary p-2 rounded-md hover:bg-accent"
							onClick={() => setMobileMenuOpen(false)}
						>
							<HomeIcon className="h-4 w-4" />
							Dashboard
						</Link>
						<Link 
							href={urls.murmur.campaigns.index} 
							className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary p-2 rounded-md hover:bg-accent"
							onClick={() => setMobileMenuOpen(false)}
						>
							<BarChart2Icon className="h-4 w-4" />
							Campaigns
						</Link>
						<Link 
							href={urls.murmur.settings.index} 
							className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary p-2 rounded-md hover:bg-accent"
							onClick={() => setMobileMenuOpen(false)}
						>
							<SettingsIcon className="h-4 w-4" />
							Settings
						</Link>
					</nav>
				</div>
			)}
		</header>
	);
};
