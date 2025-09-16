'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils';
import { UserButton } from '@clerk/nextjs';
import { urls } from '@/constants/urls';
import { useMe } from '@/hooks/useMe';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function MurmurLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const { user } = useMe();
	const navRef = useRef<HTMLElement>(null);

	const isCampaignPage = pathname?.startsWith(urls.murmur.campaign.index);
	const showAdminLink = user?.role === 'admin' && !isCampaignPage;

	// Hide footer for murmur pages and apply animations
	useEffect(() => {
		document.body.classList.add('murmur-page');
		document.documentElement.classList.add('murmur-compact');

		// Removed slide-up animation on nav to avoid bounce-in effect

		return () => {
			document.body.classList.remove('murmur-page');
			document.documentElement.classList.remove('murmur-compact');
		};
	}, []);

	return <>{children}</>;
}
