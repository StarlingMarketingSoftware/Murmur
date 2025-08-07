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

const createStripeSubscriptionSchema = z.object({
	customerId: z.string().min(1),
	priceId: z.string().min(1),
});
export type CreateStripeSubscriptionData = z.infer<typeof createStripeSubscriptionSchema>;

export async function POST(req: Request) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return apiUnauthorized();
		}
		const data = await req.json();
		const validatedData = createStripeSubscriptionSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { customerId, priceId } = validatedData.data;

		const subscription = await stripe.subscriptions.create({
			customer: customerId,
			items: [{ price: priceId }],
		});

		return apiResponse(subscription);
	} catch (error) {
		return handleApiError(error);
	}
}

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
