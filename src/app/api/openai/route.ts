import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/utils/api';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const postOpenAiSchema = z.object({
	model: z.string().min(1),
	prompt: z.string().min(1),
	content: z.string().min(1),
});

export type PostOpenAiData = z.infer<typeof postOpenAiSchema>;

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await request.json();
		const validatedData = postOpenAiSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}
		const { prompt, model, content } = validatedData.data;

		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.OPEN_AI_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model,
				messages: [
					{ role: 'system', content: prompt },
					{
						role: 'user',
						content,
					},
				],
				temperature: 0.7,
			}),
		});

		const res = await response.json();

		if (!response.ok) {
			throw new Error(res.error?.message || 'Failed to generate email');
		}
		const parsed = res.choices[0].message.content;

		return apiResponse(parsed);
	} catch (error) {
		return handleApiError(error);
	}
}
