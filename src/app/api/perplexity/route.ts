import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { fetchPerplexity } from '../_utils/perplexity';
import { PERPLEXITY_MODEL_OPTIONS } from '@/constants';
import { PerplexityModel } from '@/types';

const postPerplexitySchema = z.object({
	model: z.enum(
		Object.keys(PERPLEXITY_MODEL_OPTIONS) as [PerplexityModel, ...PerplexityModel[]]
	),
	rolePrompt: z.string().min(1),
	userPrompt: z.string().min(1),
});

export type PostPerplexityData = z.infer<typeof postPerplexitySchema>;

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

		const { model, rolePrompt, userPrompt } = validatedData.data;

		const response = await fetchPerplexity(model, rolePrompt, userPrompt);

		return apiResponse(response);
	} catch (error) {
		return handleApiError(error);
	}
}
