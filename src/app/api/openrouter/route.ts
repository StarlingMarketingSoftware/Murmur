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
	debug: z
		.object({
			draftIndex: z.number().int().positive().optional(),
			contactId: z.number().int().optional(),
			contactEmail: z.string().optional(),
			campaignId: z.number().int().optional(),
			source: z.string().optional(),
		})
		.optional(),
});

export type PostOpenRouterData = z.infer<typeof postOpenRouterSchema>;

// Many OpenRouter models can take a while to respond.
export const maxDuration = 120;

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
		const { prompt, model, content, debug } = validatedData.data;

		const requestId = `${Date.now().toString(36)}-${Math.random()
			.toString(36)
			.slice(2, 8)}`;
		const labelParts = [
			typeof debug?.draftIndex === 'number' ? `draft#${debug.draftIndex}` : null,
			typeof debug?.campaignId === 'number' ? `campaign=${debug.campaignId}` : null,
			typeof debug?.contactId === 'number' ? `contactId=${debug.contactId}` : null,
			debug?.contactEmail ? `email=${debug.contactEmail}` : null,
			debug?.source ? `source=${debug.source}` : null,
		].filter(Boolean);
		const label = labelParts.length ? ` ${labelParts.join(' ')}` : '';

		// Give slower models more time.
		const isSlowModel =
			model.includes('gpt') ||
			model.includes('deepseek') ||
			model.includes('qwen') ||
			model.includes('235b') ||
			model.includes('70b') ||
			model.includes('gemini') ||
			model.includes('pro');
		const timeoutMs = isSlowModel ? 110000 : 45000;

		console.log(
			`[OpenRouter][${requestId}] → model=${model}${label} promptChars=${prompt.length} contentChars=${content.length} timeoutMs=${timeoutMs}`
		);
		const startedAt = Date.now();

		try {
			const parsed = await fetchOpenRouter(model, prompt, content, { timeoutMs });
			console.log(
				`[OpenRouter][${requestId}] ← model=${model}${label} durationMs=${
					Date.now() - startedAt
				} outputChars=${parsed.length}`
			);
			return apiResponse(parsed);
		} catch (e) {
			console.error(
				`[OpenRouter][${requestId}] ✕ model=${model}${label} durationMs=${
					Date.now() - startedAt
				}`,
				e
			);
			throw e;
		}
	} catch (error) {
		return handleApiError(error);
	}
}
