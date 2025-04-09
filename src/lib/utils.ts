import { subscriptionTierDataList } from '@/constants/constants';
import { SubscriptionTierData } from '@/constants/types';
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
	const tier = subscriptionTierDataList[priceId];

	if (!tier) {
		return subscriptionTierDataList.custom;
	}
	return tier;
};
