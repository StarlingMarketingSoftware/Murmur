import { apiResponse, handleApiError, apiBadRequest } from '@/app/utils/api';
import { stripe } from '../../../../stripe/client';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const portalRequestSchema = z.object({
	customerId: z.string().min(1),
});

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const validatedData = portalRequestSchema.safeParse(body);

		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const session = await stripe.billingPortal.sessions.create({
			customer: validatedData.data.customerId,
			return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
		});

		return apiResponse({ url: session.url });
	} catch (error) {
		return handleApiError(error);
	}
}
