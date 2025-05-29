import { apiResponse, handleApiError } from '@/app/utils/api';
import { ApiRouteParams } from '@/types';
import { stripe } from '@/stripe/client';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { id } = await params;
		const prices = await stripe.prices.list({
			product: id,
			active: true,
		});
		return apiResponse(prices.data);
	} catch (error) {
		return handleApiError(error);
	}
}
