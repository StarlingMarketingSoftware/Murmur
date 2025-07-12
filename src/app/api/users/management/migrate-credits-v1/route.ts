import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { getSubscriptionTierWithPriceId } from '@/utils';

export const GET = async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
		});

		if (user?.role !== 'admin') {
			return apiUnauthorized('Only admins can access this route');
		}

		const users = await prisma.user.findMany({});

		for (const user of users) {
			const subscriptionTier = getSubscriptionTierWithPriceId(user.stripePriceId);
			if (!subscriptionTier) {
				continue;
			}
			const { draftCredits, sendingCredits, verificationCredits } = subscriptionTier;
			await prisma.user.update({
				where: { clerkId: user.clerkId },
				data: {
					draftCredits,
					sendingCredits,
					verificationCredits,
				},
			});
		}

		return apiResponse({
			message: `Updated ${users.length} users`,
			data: users,
		});
	} catch (error) {
		return handleApiError(error);
	}
};
