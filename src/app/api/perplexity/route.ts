import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/utils/api';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const postPerplexitySchema = z.object({
	model: z.string().min(1),
	messages: z
		.array(
			z.object({
				role: z.enum(['user', 'system']),
				content: z.string().min(1),
			})
		)
		.min(1),
});

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await request.json();
		const validatedData = postPerplexitySchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const response = await fetch('https://api.perplexity.ai/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
			},
			body: JSON.stringify(validatedData.data),
		});

		const perplexityData = await response.json();

		if (!response.ok) {
			throw new Error(perplexityData.error?.message || 'Failed to generate email');
		}

		return apiResponse(perplexityData);
	} catch (error) {
		return handleApiError(error);
	}
}
