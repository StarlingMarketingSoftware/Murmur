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

		const { priceId } = await req.json();
		if (!priceId) {
			return apiBadRequest('Price ID is required');
		}

		if (!user.stripeCustomerId) {
			return apiServerError('User does not have a Stripe customer ID');
		}

		const subscriptions = await stripe.subscriptions.list({
			customer: user.stripeCustomerId,
			status: 'active',
			limit: 1,
		});

		const currentSubscription = subscriptions.data[0];

		if (!currentSubscription) {
			return apiServerError('No active subscription found');
		}

		const subscription = await stripe.subscriptions.update(currentSubscription.id, {
			trial_end: 'now',
		});

		return apiResponse({ subscription });
	} catch (error) {
		return handleApiError(error);
	}
}
