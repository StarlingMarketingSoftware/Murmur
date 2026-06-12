'use client';

import { VenueInviteConnectIcon } from '@/components/atoms/_svg/VenueChatActionIcons';
import { cn } from '@/utils/ui';

type VenueInviteToConnectBannerProps = {
	perspective: 'venue' | 'artist';
	counterpartName?: string;
	pending?: boolean;
	className?: string;
};

export function VenueInviteToConnectBanner({
	perspective,
	counterpartName,
	pending = false,
	className,
}: VenueInviteToConnectBannerProps) {
	const name = counterpartName?.trim();
	const title =
		perspective === 'venue'
			? `Invite sent${name ? ` to ${name}` : ''}`
			: `${name || 'A venue'} invited you to connect`;

	return (
		<div
			className={cn(
				'flex w-full items-center justify-center gap-[9px] font-inter text-black',
				pending && 'opacity-60',
				className,
			)}
		>
			<VenueInviteConnectIcon className="h-[20px] w-[22px] shrink-0 text-black" />
			<span className="min-w-0 truncate text-[15px] font-black leading-none">
				{title}
			</span>
		</div>
	);
}
