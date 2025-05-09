import { SubscriptionTierData } from '@/constants/types';
import { getSubscriptionTierWithPriceId } from '@/lib/utils';
import { useAuth } from '@clerk/nextjs';
import { User } from '@prisma/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export const useMe = () => {
	const { userId: clerkUserId, isLoaded, isSignedIn } = useAuth();
	const queryClient = useQueryClient();

	useEffect(() => {
		queryClient.invalidateQueries({ queryKey: ['user'] });
	}, [isSignedIn, queryClient]);

	const { data: user, isPending: isPendingUser } = useQuery<User>({
		queryKey: ['user'],
		queryFn: async () => {
			if (!clerkUserId) throw new Error('No user ID available');
			const response = await fetch(`/api/users/${clerkUserId}`);
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message);
			}
			return await response.json();
		},
		enabled: isLoaded && isSignedIn && Boolean(clerkUserId),
	});

	const stripePriceId = user?.stripePriceId;
	const subscriptionTier: SubscriptionTierData | null =
		getSubscriptionTierWithPriceId(stripePriceId);

	return { user, isPendingUser, isLoaded, subscriptionTier };
};
