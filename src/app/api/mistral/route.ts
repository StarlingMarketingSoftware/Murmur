import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { fetchMistral, MISTRAL_AGENT_KEYS } from '@/app/api/_utils';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const postMistralSchema = z.object({
	agentType: z.enum(MISTRAL_AGENT_KEYS),
	prompt: z.string().min(1),
	content: z.string().min(1),
});

export type PostMistralData = z.infer<typeof postMistralSchema>;

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await request.json();
		const validatedData = postMistralSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}
		const { agentType, prompt, content } = validatedData.data;

		const parsed = await fetchMistral(agentType, prompt, content);
		return apiResponse(parsed);
	} catch (error) {
		return handleApiError(error);
	}
}
