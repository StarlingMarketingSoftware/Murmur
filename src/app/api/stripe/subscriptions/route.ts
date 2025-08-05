import { auth } from '@clerk/nextjs/server';
import { stripe } from '../../../../stripe/client';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiServerError,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { getUser } from '../../_utils';
import z from 'zod';

const patchStripeSubscriptionSchema = z.object({
	trialEnd: z.union([z.literal('now'), z.number()]).optional(), // 'now' or UNIX timestamp
});

export type PatchStripeSubscriptionData = z.infer<typeof patchStripeSubscriptionSchema>;

export async function PATCH(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const user = await getUser();
		if (!user) {
			return apiNotFound('User not found');
		}

		const body = await req.json();
		const validatedData = patchStripeSubscriptionSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { trialEnd } = validatedData.data;

		if (!user.stripeCustomerId) {
			return apiServerError('User does not have a Stripe customer ID');
		}

		if (!user.stripeSubscriptionId) {
			return apiServerError('User does not have a Stripe subscription ID');
		}

		const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
			trial_end: trialEnd,
		});

		return apiResponse({ subscription });
	} catch (error) {
		return handleApiError(error);
	}
}
