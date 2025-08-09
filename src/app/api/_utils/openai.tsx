export const fetchOpenAi = async (
	model: string,
	prompt: string,
	content: string
): Promise<string> => {
	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY}`,
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
		}),
	});

	const res = await response.json();

	if (!response.ok) {
		throw new Error(res.error?.message || 'Open AI request failed');
	}
	return res.choices[0].message.content;
};
