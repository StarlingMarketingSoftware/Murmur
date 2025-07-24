import { PerplexityCompletionObject, PerplexityModel } from '@/types';

export const fetchPerplexity = async (
	model: PerplexityModel,
	prompt: string,
	content: string
): Promise<PerplexityCompletionObject> => {
	const response = await fetch('https://api.perplexity.ai/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
		},
		body: JSON.stringify({
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
		}),
	});

	const res = await response.json();

	if (!response.ok) {
		throw new Error(res.error?.message || 'Open AI request failed');
	}
	return res;
};
