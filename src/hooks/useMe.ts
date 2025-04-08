import { useAuth } from '@clerk/nextjs';
import { User } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';

export const useMe = () => {
	const { userId: clerkUserId, isLoaded, isSignedIn } = useAuth();

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

	return { user, isPendingUser, isLoaded };
};
