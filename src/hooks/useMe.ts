import { SubscriptionTierData } from '@/constants/types';
import { getSubscriptionTierWithPriceId } from '@/lib/utils';
import { useAuth } from '@clerk/nextjs';
import { useGetUser } from './queryHooks/useUsers';

export const useMe = () => {
	const { userId: clerkUserId, isLoaded } = useAuth();
	const { data: user, isPending: isPendingUser } = useGetUser(clerkUserId);

	const stripePriceId = user?.stripePriceId;
	const subscriptionTier: SubscriptionTierData | null =
		getSubscriptionTierWithPriceId(stripePriceId);

	return { user, isPendingUser, isLoaded, subscriptionTier };
};
