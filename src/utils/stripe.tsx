import { SubscriptionTierData } from '@/types';

export const getSubscriptionTierWithPriceId = (
	priceId: string | null | undefined
): SubscriptionTierData | null => {
	if (!priceId) {
		return null;
	}

	switch (priceId) {
		case process.env.NEXT_PUBLIC_BASIC_MONTHLY_PRICE_ID:
		case process.env.NEXT_PUBLIC_BASIC_YEARLY_PRICE_ID:
			return {
				name: 'Basic',
				credits: 534,
				viewEmailAddresses: false,
			};
		case process.env.NEXT_PUBLIC_STANDARD_LEGACY_PRICE_ID:
		case process.env.NEXT_PUBLIC_STANDARD_MONTHLY_PRICE_ID:
		case process.env.NEXT_PUBLIC_STANDARD_YEARLY_PRICE_ID:
			return {
				name: 'Standard',
				credits: 2667,
				viewEmailAddresses: false,
			};
		case process.env.NEXT_PUBLIC_PRO_LEGACY_PRICE_ID:
		case process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID:
		case process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID:
			return {
				name: 'Pro',
				credits: 8000,
				viewEmailAddresses: false,
			};
		case process.env.NEXT_PUBLIC_ELITE_PRICE_ID:
			return {
				name: 'Elite',
				credits: 15000,
				viewEmailAddresses: true,
			};
		case process.env.NEXT_PUBLIC_PROPHET_PRICE_ID:
			return {
				name: 'Prophet',
				credits: 25000,
				viewEmailAddresses: true,
			};
		case process.env.NEXT_PUBLIC_ADMIN_LITE_PRICE_ID:
			return {
				name: 'Admin Lite',
				credits: 100000,
				viewEmailAddresses: false,
			};
		case process.env.NEXT_PUBLIC_ADMIN_FULL_PRICE_ID:
			return {
				name: 'Admin Full',
				credits: 500000,
				viewEmailAddresses: true,
			};
		default:
			return {
				name: 'Custom',
				credits: 1667,
				viewEmailAddresses: false,
			};
	}
};
