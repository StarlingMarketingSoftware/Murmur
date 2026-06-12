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

		// All-or-nothing: a mid-loop failure must not leave half the user base with
		// reset credits and the other half untouched.
		const creditUpdates = users.flatMap((user) => {
			const subscriptionTier = getSubscriptionTierWithPriceId(user.stripePriceId);
			if (!subscriptionTier) {
				return [];
			}
			const { draftCredits, sendingCredits, verificationCredits } = subscriptionTier;
			return [
				prisma.user.update({
					where: { clerkId: user.clerkId },
					data: {
						draftCredits,
						sendingCredits,
						verificationCredits,
					},
				}),
			];
		});
		await prisma.$transaction(creditUpdates);

		return apiResponse({
			message: `Updated ${users.length} users`,
			data: users,
		});
	} catch (error) {
		return handleApiError(error);
	}
};
