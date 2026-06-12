import type { ReactNode } from 'react';
import type { EmailWithRelations } from '@/types';
import {
	isCoffeeShopTitle,
	isMusicVenueTitle,
	isRestaurantTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
} from '@/utils/restaurantTitle';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';

export type CategoryPillSpec = {
	label: string;
	background: string;
	icon: ReactNode;
};

export const getContactCategoryPill = (
	contact:
		| EmailWithRelations['contact']
		| { headline?: string | null; title?: string | null }
		| null
		| undefined
): CategoryPillSpec | null => {
	const c = contact as { headline?: string | null; title?: string | null } | null | undefined;
	const headline = (c?.headline || c?.title || '').trim();
	if (!headline) return null;

	if (isMusicVenueTitle(headline)) {
		return {
			label: 'Music Venue',
			background: '#B7E5FF',
			icon: <MusicVenuesIcon size={14} className="flex-shrink-0" />,
		};
	}
	if (isRestaurantTitle(headline)) {
		return {
			label: 'Restaurant',
			background: '#C3FBD1',
			icon: <RestaurantsIcon size={14} className="flex-shrink-0" />,
		};
	}
	if (isCoffeeShopTitle(headline)) {
		return {
			label: 'Coffee',
			background: '#D6F1BD',
			icon: <CoffeeShopsIcon size={12} className="flex-shrink-0" />,
		};
	}
	if (isWeddingPlannerTitle(headline)) {
		return {
			label: 'Wedding Planner',
			background: '#FFF2BC',
			icon: <WeddingPlannersIcon size={14} className="flex-shrink-0" />,
		};
	}
	if (isWeddingVenueTitle(headline)) {
		return {
			label: 'Wedding Venue',
			background: '#FFF2BC',
			icon: <WeddingPlannersIcon size={14} className="flex-shrink-0" />,
		};
	}
	if (isWineBeerSpiritsTitle(headline)) {
		return {
			label: 'W.B.S.',
			background: '#BFC4FF',
			icon: <WineBeerSpiritsIcon size={14} className="flex-shrink-0" />,
		};
	}
	return null;
};
