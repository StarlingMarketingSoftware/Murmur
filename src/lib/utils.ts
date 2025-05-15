import { SUBSCRIPTION_TIER_DATA_LIST } from '@/constants';
import { SubscriptionTierData } from '@/types/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const getSubscriptionTierWithPriceId = (
	priceId: string | null | undefined
): SubscriptionTierData | null => {
	if (!priceId) {
		return null;
	}
	const tier = SUBSCRIPTION_TIER_DATA_LIST[priceId];

	if (!tier) {
		return SUBSCRIPTION_TIER_DATA_LIST.custom;
	}
	return tier;
};
