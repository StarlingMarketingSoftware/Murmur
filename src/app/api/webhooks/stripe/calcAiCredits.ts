import { calcAiCreditsFromPrice } from '@/app/utils/functions';
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
		console.log('custom product');
		const price = await stripe.prices.retrieve(priceId);
		if (!price) {
			return 0;
		}
		const priceAmount = price.unit_amount ? price.unit_amount : 0;
		return calcAiCreditsFromPrice(priceAmount);
	} else {
		console.log('non custom product');
		return subscriptionTier.aiEmailCount;
	}
};
