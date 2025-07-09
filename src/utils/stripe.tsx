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
				draftCredits: 200,
				sendingCredits: 200,
				verificationCredits: 100,
				viewEmailAddresses: false,
			};
		case process.env.NEXT_PUBLIC_STANDARD_LEGACY_PRICE_ID:
		case process.env.NEXT_PUBLIC_STANDARD_MONTHLY_PRICE_ID:
		case process.env.NEXT_PUBLIC_STANDARD_YEARLY_PRICE_ID:
			return {
				name: 'Standard',
				draftCredits: 1000,
				sendingCredits: 1000,
				verificationCredits: 500,
				viewEmailAddresses: false,
			};
		case process.env.NEXT_PUBLIC_PRO_LEGACY_PRICE_ID:
		case process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID:
		case process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID:
			return {
				name: 'Pro',
				draftCredits: 3000,
				sendingCredits: 3000,
				verificationCredits: 1000,
				viewEmailAddresses: false,
			};
		case process.env.NEXT_PUBLIC_ELITE_PRICE_ID:
			return {
				name: 'Elite',
				draftCredits: 15000,
				sendingCredits: 15000,
				verificationCredits: 7500,
				viewEmailAddresses: true,
			};
		case process.env.NEXT_PUBLIC_PROPHET_PRICE_ID:
			return {
				name: 'Prophet',
				draftCredits: 25000,
				sendingCredits: 25000,
				verificationCredits: 12500,
				viewEmailAddresses: true,
			};
		case process.env.NEXT_PUBLIC_ADMIN_LITE_PRICE_ID:
			return {
				name: 'Admin Lite',
				draftCredits: 100000,
				sendingCredits: 100000,
				verificationCredits: 50000,
				viewEmailAddresses: false,
			};
		case process.env.NEXT_PUBLIC_ADMIN_FULL_PRICE_ID:
			return {
				name: 'Admin Full',
				draftCredits: 500000,
				sendingCredits: 500000,
				verificationCredits: 250000,
				viewEmailAddresses: true,
			};
		default:
			return {
				name: 'Custom',
				draftCredits: 1667,
				sendingCredits: 1667,
				verificationCredits: 833,
				viewEmailAddresses: false,
			};
	}
};
