import { calcAiCreditsFromPrice } from '@/app/utils/calculations';
import { SubscriptionTierData } from '@/constants/types';
import { stripe } from '@/stripe/client';

export const calcAiCredits = async (
	subscriptionTier: SubscriptionTierData | null,
	priceId: string
): Promise<number> => {
	if (!subscriptionTier) {
		return 0;
	}
	if (subscriptionTier.name === 'Custom') {
		const price = await stripe.prices.retrieve(priceId);
		if (!price) {
			return 0;
		}
		const priceAmount = price.unit_amount ? price.unit_amount : 0;
		return calcAiCreditsFromPrice(priceAmount);
	} else {
		return subscriptionTier.aiEmailCount;
	}
};
