'use client';

import type { ReactNode } from 'react';
import { cn } from '@/utils';
import {
	type CampaignDataTypeCategoryKey,
	type CampaignDataTypeSummary,
} from '@/utils/campaignDataTypes';
import { getCityIconProps } from '@/utils/cityIcons';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RadioStationsIcon } from '@/components/atoms/_svg/RadioStationsIcon';

const CAMPAIGN_DATA_CATEGORY_BACKGROUND: Record<CampaignDataTypeCategoryKey, string> = {
	wine_beer_spirits: '#BFC4FF',
	restaurants: '#C3FBD1',
	coffee_shops: '#D6F1BD',
	music_venues: '#B7E5FF',
	music_festivals: '#C1D6FF',
	wedding: '#FFF2BC',
	radio: '#E8EFFF',
};

const renderCampaignDataCategoryIcon = (key: CampaignDataTypeCategoryKey): ReactNode => {
	switch (key) {
		case 'wine_beer_spirits':
			return <WineBeerSpiritsIcon size={11} className="flex-shrink-0" />;
		case 'restaurants':
			return <RestaurantsIcon size={12} className="flex-shrink-0" />;
		case 'coffee_shops':
			return <CoffeeShopsIcon size={7} className="flex-shrink-0" />;
		case 'music_venues':
			return <MusicVenuesIcon size={13} className="flex-shrink-0" />;
		case 'music_festivals':
			return <FestivalsIcon size={12} className="flex-shrink-0" />;
		case 'wedding':
			return <WeddingPlannersIcon size={12} className="flex-shrink-0" />;
		case 'radio':
			return <RadioStationsIcon size={13} className="flex-shrink-0" />;
	}
};

export const CampaignDataTypeBadge = ({
	dataType,
}: {
	dataType: CampaignDataTypeSummary;
}) => {
	if (dataType.kind === 'category') {
		return (
			<span
				className="inline-flex h-[15px] w-[15px] flex-none items-center justify-center overflow-hidden rounded-[4px]"
				style={{ backgroundColor: CAMPAIGN_DATA_CATEGORY_BACKGROUND[dataType.key] }}
				title={dataType.label}
			>
				{renderCampaignDataCategoryIcon(dataType.key)}
			</span>
		);
	}

	const { icon, backgroundColor } = getCityIconProps('', dataType.key);
	return (
		<span
			className="inline-flex h-[15px] w-[15px] flex-none items-center justify-center overflow-hidden rounded-[4px]"
			style={{ backgroundColor }}
			title={dataType.label}
		>
			<span className="inline-flex h-full w-full items-center justify-center [&>svg]:block [&>svg]:h-auto [&>svg]:max-h-[10px] [&>svg]:max-w-[11px] [&>svg]:w-auto">
				{icon}
			</span>
		</span>
	);
};

export const CampaignDataTypeIconStrip = ({
	dataTypes,
	isConfirming = false,
	hasNew = false,
	className,
	spacingClassName,
	fill = true,
	renderEmpty = true,
	visibleCount = 3,
}: {
	dataTypes: CampaignDataTypeSummary[];
	isConfirming?: boolean;
	hasNew?: boolean;
	className?: string;
	spacingClassName?: string | null;
	fill?: boolean;
	renderEmpty?: boolean;
	visibleCount?: number;
}) => {
	const defaultSpacingClassName = hasNew ? 'ml-[23px] mr-2' : 'ml-[8px] mr-1';
	const resolvedSpacingClassName =
		spacingClassName === undefined ? defaultSpacingClassName : spacingClassName;
	const visibleDataTypes = dataTypes.slice(0, visibleCount);
	const overflowCount = Math.max(0, dataTypes.length - visibleDataTypes.length);
	const label = dataTypes.map((dataType) => dataType.label).join(', ');

	if (isConfirming || dataTypes.length === 0) {
		if (!renderEmpty) return null;

		return (
			<div
				className={cn(
					'folder-icon-strip h-[15px]',
					fill ? 'flex-1' : 'flex-none',
					resolvedSpacingClassName,
					className
				)}
				aria-hidden="true"
			/>
		);
	}

	return (
		<div
			className={cn(
				'folder-icon-strip flex h-[15px] min-w-0 items-center justify-start gap-[4px] overflow-hidden',
				fill ? 'flex-1' : 'flex-none',
				resolvedSpacingClassName,
				className
			)}
			aria-label={`Campaign data types: ${label}`}
		>
			{visibleDataTypes.map((dataType) => (
				<CampaignDataTypeBadge
					key={`${dataType.kind}-${dataType.key}`}
					dataType={dataType}
				/>
			))}
			{overflowCount > 0 ? (
				<span
					className={cn(
						'flex-none font-inter text-[8.021px] font-medium not-italic leading-[9.95px]',
						isConfirming ? 'text-white' : 'text-black'
					)}
				>
					+{overflowCount}
				</span>
			) : null}
		</div>
	);
};
