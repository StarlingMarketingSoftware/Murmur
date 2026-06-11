import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { fetchOpenAi } from '@/app/api/_utils';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import { OPEN_AI_MODEL_OPTIONS } from '@/constants';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const ALLOWED_OPEN_AI_MODELS = Object.values(OPEN_AI_MODEL_OPTIONS) as [string, ...string[]];

const postOpenAiSchema = z.object({
	model: z.enum(ALLOWED_OPEN_AI_MODELS),
	prompt: z.string().min(1).max(100000),
	content: z.string().min(1).max(100000),
});

export type PostOpenAiData = z.infer<typeof postOpenAiSchema>;

export async function POST(request: NextRequest) {
	try {
		const limited = await withRateLimit(request, 'ai-expensive', 'openai');
		if (limited) return limited;

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

		const parsed = await fetchOpenAi(model, prompt, content);
		return apiResponse(parsed);
	} catch (error) {
		return handleApiError(error);
	}
}
