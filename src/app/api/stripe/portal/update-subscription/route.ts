import {
	apiResponse,
	handleApiError,
	apiBadRequest,
	apiUnauthorized,
	apiNotFound,
} from '@/app/api/_utils';
import { stripe } from '../../../../../stripe/client';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

const postPortalRequestSchema = z.object({
	customerId: z.string().min(1),
	productId: z.string().min(1),
	priceId: z.string().min(1),
	returnUrl: z.string().min(1),
});

export type PostPortalRequestData = z.infer<typeof postPortalRequestSchema>;

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
		const validatedData = postPortalRequestSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { customerId, productId, priceId, returnUrl } = validatedData.data;

		if (user.stripeCustomerId !== customerId) {
			return apiBadRequest('Customer ID does not match authenticated user');
		}

		const portalConfig = await stripe.billingPortal.configurations.create({
			business_profile: {
				headline: 'Manage Your Subscription',
			},
			features: {
				subscription_update: {
					proration_behavior: 'always_invoice',
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
			return_url: returnUrl,
		});

		return apiResponse({ url: portalSession.url });
	} catch (error) {
		return handleApiError(error);
	}
}
