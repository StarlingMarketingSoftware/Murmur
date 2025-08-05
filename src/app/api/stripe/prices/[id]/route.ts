import { apiResponse, handleApiError } from '@/app/api/_utils';
import { ApiRouteParams } from '@/types';
import { stripe } from '@/stripe/client';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { id } = await params;

		const price = await stripe.prices.retrieve(id);
		return apiResponse(price);
	} catch (error) {
		return handleApiError(error);
	}
}
