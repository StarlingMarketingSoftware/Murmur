'use client';

import { FC, ReactNode, useMemo } from 'react';
import { cn } from '@/utils';
import {
	isRestaurantTitle,
	isCoffeeShopTitle,
	isMusicVenueTitle,
	isMusicFestivalTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
} from '@/utils/restaurantTitle';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';
import { getCityIconProps } from '@/utils/cityIcons';
import { getStateAbbreviation } from '@/utils/string';
import { ContactWithName } from '@/types/contact';

export const MobileSearchCategoryPill: FC<{ headline: string }> = ({ headline }) => (
	<div
		className="h-[17px] rounded-[6px] px-2 flex items-center gap-1 w-full border border-black overflow-hidden"
		style={{
			backgroundColor: isRestaurantTitle(headline)
				? '#C3FBD1'
				: isCoffeeShopTitle(headline)
					? '#D6F1BD'
					: isMusicVenueTitle(headline)
						? '#B7E5FF'
						: isMusicFestivalTitle(headline)
							? '#C1D6FF'
							: isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)
								? '#FFF2BC'
								: '#E8EFFF',
		}}
	>
		{isRestaurantTitle(headline) && <RestaurantsIcon size={12} />}
		{isCoffeeShopTitle(headline) && <CoffeeShopsIcon size={7} />}
		{isMusicVenueTitle(headline) && (
			<MusicVenuesIcon size={12} className="flex-shrink-0" />
		)}
		{isMusicFestivalTitle(headline) && (
			<FestivalsIcon size={12} className="flex-shrink-0" />
		)}
		{(isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) && (
			<WeddingPlannersIcon size={12} />
		)}
		<span className="text-[10px] text-black leading-none truncate">
			{isRestaurantTitle(headline)
				? 'Restaurant'
				: isCoffeeShopTitle(headline)
					? 'Coffee Shop'
					: isMusicVenueTitle(headline)
						? 'Music Venue'
						: isMusicFestivalTitle(headline)
							? 'Music Festival'
							: isWeddingPlannerTitle(headline)
								? 'Wedding Planner'
								: isWeddingVenueTitle(headline)
									? 'Wedding Venue'
									: headline}
		</span>
	</div>
);

type MobileChipTile = { key: string; background: string; icon: ReactNode };

// Compact "+N" chip next to the campaign name: leads with the campaign's top contact
// category and top state, then counts the remaining distinct ones.
export const MobileCampaignIconChip: FC<{ contacts: ContactWithName[] }> = ({
	contacts,
}) => {
	const { tiles, overflowCount } = useMemo(() => {
		const categoryCounts = new Map<string, number>();
		const stateCounts = new Map<string, number>();
		for (const contact of contacts) {
			const headline = contact.headline || contact.title || '';
			const category = !headline
				? null
				: isRestaurantTitle(headline)
					? 'restaurant'
					: isCoffeeShopTitle(headline)
						? 'coffee-shop'
						: isMusicVenueTitle(headline)
							? 'music-venue'
							: isMusicFestivalTitle(headline)
								? 'music-festival'
								: isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)
									? 'wedding'
									: isWineBeerSpiritsTitle(headline)
										? 'wine-beer-spirits'
										: null;
			if (category) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
			const stateAbbr = getStateAbbreviation(contact.state || '');
			if (stateAbbr) stateCounts.set(stateAbbr, (stateCounts.get(stateAbbr) ?? 0) + 1);
		}

		const byCountDesc = (a: [string, number], b: [string, number]) => b[1] - a[1];
		const categoryTiles: MobileChipTile[] = Array.from(categoryCounts.entries())
			.sort(byCountDesc)
			.map(([key]) => {
				switch (key) {
					case 'restaurant':
						return { key, background: '#C3FBD1', icon: <RestaurantsIcon size={12} /> };
					case 'coffee-shop':
						return { key, background: '#D6F1BD', icon: <CoffeeShopsIcon size={9} /> };
					case 'music-venue':
						return { key, background: '#B7E5FF', icon: <MusicVenuesIcon size={12} /> };
					case 'music-festival':
						return { key, background: '#C1D6FF', icon: <FestivalsIcon size={12} /> };
					case 'wedding':
						return { key, background: '#FFF2BC', icon: <WeddingPlannersIcon size={12} /> };
					default:
						return { key, background: '#E8EFFF', icon: <WineBeerSpiritsIcon size={12} /> };
				}
			});
		const stateTiles: MobileChipTile[] = Array.from(stateCounts.entries())
			.sort(byCountDesc)
			.map(([abbr]) => {
				const cityIconProps = getCityIconProps('', abbr);
				return {
					key: `state-${abbr}`,
					background: cityIconProps.backgroundColor,
					icon: cityIconProps.icon,
				};
			});

		// Interleave so the chip leads with the top category and the top state.
		const ordered: MobileChipTile[] = [];
		if (categoryTiles[0]) ordered.push(categoryTiles[0]);
		if (stateTiles[0]) ordered.push(stateTiles[0]);
		ordered.push(...categoryTiles.slice(1), ...stateTiles.slice(1));

		return { tiles: ordered.slice(0, 2), overflowCount: Math.max(0, ordered.length - 2) };
	}, [contacts]);

	if (tiles.length === 0) return null;

	// Rendered inside the folder pill (Figma): tiles sit directly on the pill background.
	return (
		<div className="flex items-center gap-[3px] flex-shrink-0">
			{tiles.map((tile) => (
				<span
					key={tile.key}
					className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center overflow-hidden [&_svg]:max-w-[14px] [&_svg]:max-h-[14px]"
					style={{ backgroundColor: tile.background }}
				>
					{tile.icon}
				</span>
			))}
			{overflowCount > 0 && (
				<span className="font-inter text-[11px] font-semibold text-black px-[2px]">
					+{overflowCount}
				</span>
			)}
		</div>
	);
};

// Campaign header overlay for the mobile Search view: folder + name + icon chip on top,
// metric pills below (tokens copied from CampaignHeaderBox).
export const MobileCampaignSearchHeader: FC<{
	campaignName: string;
	contacts: ContactWithName[];
	contactsCount: number;
	draftCount: number;
	sentCount: number;
	newMessageCount: number;
	onDraftsClick?: () => void;
	onSentClick?: () => void;
	onNewMessageClick?: () => void;
}> = ({
	campaignName,
	contacts,
	contactsCount,
	draftCount,
	sentCount,
	newMessageCount,
	onDraftsClick,
	onSentClick,
	onNewMessageClick,
}) => {
	const formatCount = (count: number, label: string) =>
		count === 0 ? label : `${count.toString().padStart(2, '0')} ${label}`;
	const pillClassName =
		'inline-flex items-center justify-center h-[20px] rounded-full border border-black px-2 font-inter text-[11px] font-semibold leading-none text-black whitespace-nowrap';

	return (
		<div className="pointer-events-auto flex flex-col gap-2">
			<div className="flex items-center min-w-0">
				<div className="flex items-center gap-2 h-[30px] rounded-[6px] bg-[#B9EAF1] pl-2 pr-2 min-w-0">
					<DashboardActionBarFolderIcon
						width={26}
						height={15}
						className="flex-shrink-0 text-[#C5494F]"
					/>
					<span
						className="text-[20px] leading-none text-black truncate"
						style={{ fontFamily: "'Times New Roman', Times, serif" }}
					>
						{campaignName}
					</span>
					<MobileCampaignIconChip contacts={contacts} />
				</div>
			</div>
			<div className="flex items-center gap-2 min-w-0">
				<span className={cn(pillClassName, 'bg-[#F5DADA]')}>
					{formatCount(contactsCount, 'Contacts')}
				</span>
				<button
					type="button"
					className={cn(pillClassName, 'bg-[#FFE3AA] cursor-pointer')}
					onClick={onDraftsClick}
				>
					{formatCount(draftCount, 'Drafts')}
				</button>
				<button
					type="button"
					className={cn(pillClassName, 'bg-[#B0E0A6] cursor-pointer')}
					onClick={onSentClick}
				>
					{formatCount(sentCount, 'Sent')}
				</button>
				{newMessageCount > 0 && (
					<button
						type="button"
						className={cn(pillClassName, 'bg-[#B9EAF1] cursor-pointer ml-auto')}
						onClick={onNewMessageClick}
					>
						{newMessageCount} New Message{newMessageCount === 1 ? '' : 's'}
					</button>
				)}
			</div>
		</div>
	);
};
