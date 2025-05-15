import { apiResponse, handleApiError } from '@/app/utils/api';
import { ApiRouteParams } from '@/types/types';
import { stripe } from '@/stripe/client';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { id } = await params;
		const product = await stripe.products.retrieve(id);

		return apiResponse(product);
	} catch (error) {
		return handleApiError(error);
	}
}
