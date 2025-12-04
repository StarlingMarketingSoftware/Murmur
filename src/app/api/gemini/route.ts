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
	model: z.string().min(1).default('gemini-1.5-flash'),
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

		try {
			// First attempt: requested model (or default), moderate token cap, 30s
			const primary = await fetchGemini(model, prompt, content, {
				timeoutMs: 30000,
				maxOutputTokens: 4096,
			});
			return apiResponse(primary);
		} catch (e) {
			// On timeout, retry once with a faster flash model and smaller response
			if (e instanceof Error && e.name === 'AbortError') {
				const fallbackModel = model.includes('flash') ? model : 'gemini-1.5-flash';
				const fallback = await fetchGemini(fallbackModel, prompt, content, {
					timeoutMs: 25000,
					maxOutputTokens: 2048,
				});
				return apiResponse(fallback);
			}
			throw e;
		}
	} catch (error) {
		return handleApiError(error);
	}
}
