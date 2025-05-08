import { apiResponse, handleApiError } from '@/app/utils/api';
import { stripe } from '../../../../stripe/client';
import { NextRequest } from 'next/server';

interface PortalRequest {
	customerId: string;
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as PortalRequest;

		const session = await stripe.billingPortal.sessions.create({
			customer: body.customerId,
			return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
		});

		return apiResponse({ url: session.url });
	} catch (error) {
		return handleApiError(error);
	}
}
