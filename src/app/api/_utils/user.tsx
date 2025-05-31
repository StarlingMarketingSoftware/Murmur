import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { User } from '@prisma/client';

// gets the currently logged in Clerk user, then fetches the local user
// if user is not authenticated, not found, or error, it returns null
export const getUser = async (): Promise<User | null> => {
	const { userId } = await auth();

	if (!userId) {
		return null;
	}

	try {
		const result = await prisma.user.findUnique({
			where: {
				clerkId: userId,
			},
		});

		return result;
	} catch (error) {
		console.error(error);
		return null;
	}
};
