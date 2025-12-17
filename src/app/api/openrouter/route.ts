import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { fetchOpenRouter } from '@/app/api/_utils/openrouter';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const postOpenRouterSchema = z.object({
	model: z.string().min(1),
	prompt: z.string().min(1),
	content: z.string().min(1),
});

export type PostOpenRouterData = z.infer<typeof postOpenRouterSchema>;

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await request.json();
		const validatedData = postOpenRouterSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}
		const { prompt, model, content } = validatedData.data;

		const parsed = await fetchOpenRouter(model, prompt, content);
		return apiResponse(parsed);
	} catch (error) {
		return handleApiError(error);
	}
}
