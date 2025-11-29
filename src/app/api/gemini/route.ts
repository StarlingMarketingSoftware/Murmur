import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { fetchGemini } from '@/app/api/_utils';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const postGeminiSchema = z.object({
	model: z.string().min(1).default('gemini-3-pro-preview'),
	prompt: z.string().min(1),
	content: z.string().min(1),
});

export type PostGeminiData = z.infer<typeof postGeminiSchema>;

export const maxDuration = 60;

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await request.json();
		const validatedData = postGeminiSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}
		const { prompt, model, content } = validatedData.data;

		const parsed = await fetchGemini(model, prompt, content);
		return apiResponse(parsed);
	} catch (error) {
		return handleApiError(error);
	}
}
