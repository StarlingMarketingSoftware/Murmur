import { apiResponse, apiUnauthorized, handleApiError } from '@/app/utils/api';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await request.json();

		const response = await fetch('https://api.perplexity.ai/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
			},
			body: JSON.stringify(body),
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error?.message || 'Failed to generate email');
		}

		return apiResponse(data);
	} catch (error) {
		return handleApiError(error);
	}
}
