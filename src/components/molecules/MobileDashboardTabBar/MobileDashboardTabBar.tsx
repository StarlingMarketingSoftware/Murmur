'use client';

import { FC } from 'react';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import DashboardActionBarCalendarIcon from '@/components/atoms/_svg/DashboardActionBarCalendarIcon';
import DashboardActionBarEnvelopeIcon from '@/components/atoms/_svg/DashboardActionBarEnvelopeIcon';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';

export type MobileDashboardTab = 'folders' | 'calendar' | 'inbox';

const TABS = [
	{ key: 'folders', Icon: DashboardActionBarFolderIcon, label: 'Folders' },
	{ key: 'calendar', Icon: DashboardActionBarCalendarIcon, label: 'Calendar' },
	{ key: 'inbox', Icon: DashboardActionBarEnvelopeIcon, label: 'Inbox' },
] as const;

export const MobileDashboardTabBar: FC<{
	activeTab: MobileDashboardTab;
	onTabChange: (tab: MobileDashboardTab) => void;
	/** Navigates away (active campaign search); button is disabled while undefined. */
	onSearchClick?: () => void;
}> = ({ activeTab, onTabChange, onSearchClick }) => {
	return (
		<div
			className="w-full flex items-center justify-around"
			style={{ height: '43px', backgroundColor: '#FFFFFF', flexShrink: 0 }}
		>
			{TABS.map(({ key, Icon, label }) => {
				const isActive = activeTab === key;
				return (
					<button
						key={key}
						type="button"
						aria-label={label}
						aria-pressed={isActive}
						onClick={() => onTabChange(key)}
						style={{
							background: 'none',
							border: 'none',
							padding: '6px 10px',
							margin: 0,
							display: 'flex',
							alignItems: 'center',
							gap: '7px',
							color: '#000000',
							cursor: 'pointer',
						}}
					>
						<Icon style={{ opacity: isActive ? 1 : 0.35 }} />
						{isActive && (
							<span
								style={{
									fontFamily: 'Inter, sans-serif',
									fontSize: '16px',
									fontWeight: 600,
									lineHeight: 1,
									color: '#000000',
								}}
							>
								{label}
							</span>
						)}
					</button>
				);
			})}

			<button
				type="button"
				aria-label="Search"
				onClick={onSearchClick}
				disabled={!onSearchClick}
				style={{
					background: 'none',
					border: 'none',
					padding: '6px 10px',
					margin: 0,
					display: 'flex',
					alignItems: 'center',
					color: '#000000',
					opacity: 0.35,
					cursor: onSearchClick ? 'pointer' : 'default',
				}}
			>
				<SearchIconDesktop width={18} height={18} stroke="black" strokeWidth={2} />
			</button>
		</div>
	);
};

export default MobileDashboardTabBar;
