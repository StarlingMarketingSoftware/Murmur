import { apiResponse, handleApiError } from '@/app/api/_utils';
import { stripe } from '@/stripe/client';

export async function GET() {
	try {
		const products = await stripe.products.list({
			active: true,
		});

		return apiResponse(products.data);
	} catch (error) {
		return handleApiError(error);
	}
}
