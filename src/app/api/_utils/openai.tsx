export const fetchOpenAi = async (
	model: string,
	prompt: string,
	content: string,
	options?: {
		timeoutMs?: number;
		temperature?: number;
		maxTokens?: number;
		responseFormat?: 'json_object';
	}
): Promise<string> => {
	const controller = new AbortController();
	const timeoutMs = options?.timeoutMs ?? 12000; // 12s hard limit by default (tuned per caller)
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.OPEN_AI_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model,
				messages: [
					{ role: 'system', content: prompt },
					{
						role: 'user',
						content,
					},
				],
				...(options?.temperature != null
					? { temperature: options.temperature }
					: {}),
				...(options?.maxTokens != null
					? { max_tokens: options.maxTokens }
					: {}),
				...(options?.responseFormat
					? { response_format: { type: options.responseFormat } }
					: {}),
			}),
			signal: controller.signal,
		});

		const res = await response.json();

		if (!response.ok) {
			throw new Error(res.error?.message || 'Open AI request failed');
		}
		return res.choices[0].message.content;
	} finally {
		clearTimeout(timeoutId);
	}
};
