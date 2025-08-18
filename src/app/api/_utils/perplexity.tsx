import { PerplexityCompletionObject, PerplexityModel } from '@/types';

export const fetchPerplexity = async (
	model: PerplexityModel,
	prompt: string,
	content: string
): Promise<PerplexityCompletionObject> => {
	const requestBody = {
		model,
		messages: [
			{
				role: 'system',
				content: prompt,
			},
			{
				role: 'user',
				content: content,
			},
		],
	};

	const response = await fetch('https://api.perplexity.ai/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
		},
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		const errorBody = await response.text();
		console.error(
			`[fetchPerplexity] Perplexity API Error: Status ${response.status}`,
			{
				errorBody,
				requestBody: {
					model: requestBody.model,
					systemPrompt: requestBody.messages[0].content.substring(0, 200) + '...',
					userPrompt: requestBody.messages[1].content.substring(0, 200) + '...',
				},
			}
		);
		// Attempt to parse JSON for a structured error message, otherwise use text.
		try {
			const parsedError = JSON.parse(errorBody);
			throw new Error(
				parsedError.error?.message || `Perplexity AI request failed with status ${response.status}`
			);
		} catch {
			throw new Error(`Perplexity AI request failed: ${response.status} - ${errorBody}`);
		}
	}

	const res = await response.json();
	return res;
};
