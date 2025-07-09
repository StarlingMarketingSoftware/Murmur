import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { BASE_URL } from '@/constants';
import { urls } from '@/constants/urls';
import prisma from '@/lib/prisma';
import { stripe } from '@/stripe/client';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const customProductPortalRequestSchema = z.object({
	customerId: z.string().min(1),
	productId: z.string().min(1),
	priceId: z.string().min(1),
});

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const user = await prisma.user.findUnique({
			where: {
				clerkId: userId,
			},
		});

		if (!user) {
			return apiNotFound();
		}

		const data = await req.json();
		const validatedData = customProductPortalRequestSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { customerId, productId, priceId } = validatedData.data;

		if (user.stripeCustomerId !== customerId) {
			return apiBadRequest('Customer ID does not match authenticated user');
		}

		const portalConfig = await stripe.billingPortal.configurations.create({
			business_profile: {
				headline: 'Manage Your Subscription',
			},
			features: {
				subscription_update: {
					enabled: true,
					default_allowed_updates: ['price'],
					products: [
						{
							product: productId,
							prices: [priceId],
						},
					],
				},
				payment_method_update: {
					enabled: true,
				},
				invoice_history: {
					enabled: true,
				},
			},
		});

		const portalSession = await stripe.billingPortal.sessions.create({
			customer: customerId,
			configuration: portalConfig.id,
			return_url: `${BASE_URL}${urls.pricing.detail(productId)}`,
		});

		return apiResponse({ url: portalSession.url });
	} catch (error) {
		return handleApiError(error);
	}
}
