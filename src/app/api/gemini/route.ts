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
	model: z.string().min(1).default('gemini-2.5-pro-preview-05-06'),
	prompt: z.string().min(1),
	content: z.string().min(1),
});

export type PostGeminiData = z.infer<typeof postGeminiSchema>;

// Thinking models (gemini-3-pro, gemini-2.5-pro) need more time and tokens
const THINKING_MODELS = ['gemini-3-pro-preview', 'gemini-2.5-pro-preview-05-06'];

const isThinkingModel = (model: string) =>
	THINKING_MODELS.some((m) => model.includes(m) || model.includes('pro'));

export const maxDuration = 120; // Increased for thinking models

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

		// Thinking models need more time and tokens for internal reasoning
		const useThinkingConfig = isThinkingModel(model);
		const timeoutMs = useThinkingConfig ? 110000 : 30000; // 110s for thinking, 30s for flash
		const maxOutputTokens = useThinkingConfig ? 16384 : 4096; // Higher for thinking models

		try {
			const result = await fetchGemini(model, prompt, content, {
				timeoutMs,
				maxOutputTokens,
			});
			return apiResponse(result);
		} catch (e) {
			// On timeout for non-thinking models, retry with smaller output
			if (e instanceof Error && e.name === 'AbortError' && !useThinkingConfig) {
				const fallback = await fetchGemini(model, prompt, content, {
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
