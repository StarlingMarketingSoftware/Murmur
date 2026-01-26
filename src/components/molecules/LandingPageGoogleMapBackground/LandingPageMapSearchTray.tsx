'use client';

import { BookingIcon } from '@/components/atoms/_svg/BookingIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { getCityIconProps } from '@/utils/cityIcons';
import type { ReactNode } from 'react';

// Exact copy of the dashboard map-view "icon tray" sizing + styles.
// (Copied from `src/app/murmur/dashboard/page.tsx` — do not edit SearchResultsMap.)
const MAP_RESULTS_SEARCH_TRAY = {
	containerWidth: 189,
	containerHeight: 52,
	containerRadius: 6,
	itemSize: 43,
	itemRadius: 12,
	borderWidth: 3,
	borderColor: '#000000',
	backgroundColor: 'rgba(255, 255, 255, 0.9)',
	nearMeBackgroundColor: '#D0E6FF',
	whyBackgroundColors: {
		booking: '#9DCBFF',
		promotion: '#7AD47A',
	},
	whatBackgroundColors: {
		'Music Venues': '#71C9FD',
	},
} as const;

const SearchTrayIconTile = ({
	backgroundColor,
	children,
}: {
	backgroundColor: string;
	children: ReactNode;
}) => {
	return (
		<div
			className="flex items-center justify-center flex-shrink-0"
			style={{
				width: `${MAP_RESULTS_SEARCH_TRAY.itemSize}px`,
				height: `${MAP_RESULTS_SEARCH_TRAY.itemSize}px`,
				backgroundColor,
				borderRadius: `${MAP_RESULTS_SEARCH_TRAY.itemRadius}px`,
			}}
		>
			{children}
		</div>
	);
};

/**
 * Landing page-only copy of the dashboard "icon tray" that sits left of the search bar.
 * This is intentionally static (visual-only) to match the landing page demo.
 */
export function LandingPageMapSearchTray() {
	const california = getCityIconProps('', 'California');

	return (
		<div
			className="flex items-center justify-between"
			style={{
				width: `${MAP_RESULTS_SEARCH_TRAY.containerWidth}px`,
				height: `${MAP_RESULTS_SEARCH_TRAY.containerHeight}px`,
				backgroundColor: MAP_RESULTS_SEARCH_TRAY.backgroundColor,
				border: `${MAP_RESULTS_SEARCH_TRAY.borderWidth}px solid ${MAP_RESULTS_SEARCH_TRAY.borderColor}`,
				borderRadius: `${MAP_RESULTS_SEARCH_TRAY.containerRadius}px`,
				paddingLeft: '6px',
				paddingRight: '6px',
			}}
			aria-hidden
		>
			<SearchTrayIconTile backgroundColor={MAP_RESULTS_SEARCH_TRAY.whyBackgroundColors.booking}>
				<BookingIcon />
			</SearchTrayIconTile>
			<SearchTrayIconTile backgroundColor={MAP_RESULTS_SEARCH_TRAY.whatBackgroundColors['Music Venues']}>
				<MusicVenuesIcon />
			</SearchTrayIconTile>
			<SearchTrayIconTile backgroundColor={california.backgroundColor}>
				{california.icon}
			</SearchTrayIconTile>
		</div>
	);
}

