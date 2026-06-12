'use client';

import { VenuePortalAddIcon } from '@/components/atoms/_svg/VenuePortalAddIcon';
import { VenuePortalChatIcon } from '@/components/atoms/_svg/VenuePortalChatIcon';
import { VenuePortalEventsIcon } from '@/components/atoms/_svg/VenuePortalEventsIcon';
import { VenuePortalProfileIcon } from '@/components/atoms/_svg/VenuePortalProfileIcon';

export type MobileVenueTab = 'create' | 'events' | 'chat' | 'profile';

// Active-pill tints per the mobile Figma (Create red, Events green, Chat blue,
// Profile lavender) — same family as the desktop tool tab bar's segment colors.
const TAB_ACTIVE_BG: Record<MobileVenueTab, string> = {
	create: '#FF818A',
	events: '#BCFFBD',
	chat: '#BCE2FF',
	profile: '#BCC4FF',
};

// White strip pinned under the safe area; each tab is an icon + label, with the
// active one wrapped in its colored pill. Mirrors MobileDashboardTabBar's frame
// role, restyled per the venue Figma (labels always visible, dimmed inactive).
export function MobileVenueTabBar({
	activeTab,
	onTabChange,
	unreadCount,
}: {
	activeTab: MobileVenueTab;
	onTabChange: (tab: MobileVenueTab) => void;
	unreadCount: number;
}) {
	const renderTab = (
		tab: MobileVenueTab,
		label: string,
		icon: (selected: boolean) => React.ReactNode
	) => {
		const isActive = activeTab === tab;
		return (
			<button
				type="button"
				aria-label={label}
				aria-pressed={isActive}
				onClick={() => onTabChange(tab)}
				className="flex h-[34px] cursor-pointer items-center gap-[7px] rounded-[9px] px-[12px]"
				style={isActive ? { backgroundColor: TAB_ACTIVE_BG[tab] } : undefined}
			>
				<span className={`flex shrink-0 items-center ${isActive ? '' : 'opacity-40'}`}>
					{icon(isActive)}
				</span>
				<span
					className={`font-inter text-[15px] font-semibold leading-none ${
						isActive ? 'text-black' : 'text-black/40'
					}`}
				>
					{label}
				</span>
			</button>
		);
	};

	return (
		<div
			className="flex w-full shrink-0 items-center justify-around bg-white"
			style={{ height: '48px' }}
		>
			{renderTab('create', 'Create', (selected) => (
				<VenuePortalAddIcon
					selected={selected}
					selectedFill="#E05555"
					className="h-[20px] w-auto"
				/>
			))}
			{renderTab('events', 'Events', (selected) => (
				<VenuePortalEventsIcon selected={selected} className="h-[20px] w-auto" />
			))}
			{renderTab('chat', 'Chat', (selected) => (
				<span className="relative flex items-center justify-center">
					<VenuePortalChatIcon selected={selected} className="h-[20px] w-auto" />
					{unreadCount > 0 && (
						<span className="pointer-events-none absolute -right-[4px] -top-[4px] flex h-[12px] min-w-[12px] items-center justify-center rounded-full bg-[#2F6FED] px-[2px] text-[8px] font-semibold leading-none text-white">
							{unreadCount > 99 ? '99+' : unreadCount}
						</span>
					)}
				</span>
			))}
			{renderTab('profile', 'Profile', (selected) => (
				<VenuePortalProfileIcon selected={selected} className="h-[20px] w-auto" />
			))}
		</div>
	);
}
