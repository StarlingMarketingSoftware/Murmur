import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiResponse,
	handleApiError,
	apiUnauthorized,
	apiServerError,
} from '@/app/api/_utils';
import { getSubscriptionTierWithPriceId } from '@/utils';
import { addMonths, isAfter } from 'date-fns';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
	const cronSecret = process.env.CRON_SECRET;
	if (!cronSecret) {
		const errorMessage = 'CRON_SECRET environment variable is not set';
		console.error(errorMessage);
		return apiServerError(errorMessage);
	}

	if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
		return apiUnauthorized();
	}

	const basicYearlyPriceId = process.env.NEXT_PUBLIC_BASIC_YEARLY_PRICE_ID;
	const standardYearlyPriceId = process.env.NEXT_PUBLIC_STANDARD_YEARLY_PRICE_ID;
	const proYearlyPriceId = process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID;

	try {
		if (!basicYearlyPriceId || !standardYearlyPriceId || !proYearlyPriceId) {
			const errorMessage =
				'Missing annual Stripe price IDs. Check environment variables.';
			console.error(errorMessage);
			return apiBadRequest(errorMessage);
		}

		const YEARLY_SUBSCRIPTION_PRICE_IDS = [
			basicYearlyPriceId,
			standardYearlyPriceId,
			proYearlyPriceId,
		];

		const users = await prisma.user.findMany({
			where: {
				stripePriceId: {
					in: YEARLY_SUBSCRIPTION_PRICE_IDS,
				},
			},
			select: {
				id: true,
				stripePriceId: true,
				lastCreditUpdate: true,
			},
		});

		const currentDate = new Date();
		let updatedUsersCount = 0;

		for (const user of users) {
			const subscriptionTier = getSubscriptionTierWithPriceId(user.stripePriceId);
			if (!subscriptionTier) {
				console.error(`Subscription tier not found for user ${user.id}.`);
				continue;
			}

			if (!user.lastCreditUpdate) {
				console.error(`No lastCreditUpdate found for user ${user.id}.`);
				continue;
			}

			const nextRefillDate = addMonths(user.lastCreditUpdate, 1);

			if (isAfter(currentDate, nextRefillDate)) {
				await prisma.user.update({
					where: { id: user.id },
					data: {
						draftCredits: subscriptionTier.draftCredits,
						sendingCredits: subscriptionTier.sendingCredits,
						verificationCredits: subscriptionTier.verificationCredits,
						lastCreditUpdate: currentDate,
					},
				});
				updatedUsersCount++;
			}
		}

		return apiResponse(
			`Successfully updated ${updatedUsersCount}/${users.length} annual subscription users with monthly credits.`
		);
	} catch (error) {
		return handleApiError(error);
	}
}
