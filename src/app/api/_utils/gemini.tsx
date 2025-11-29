export const fetchGemini = async (
	model: string,
	prompt: string,
	content: string,
	options?: { timeoutMs?: number }
): Promise<string> => {
	const controller = new AbortController();
	const timeoutMs = options?.timeoutMs ?? 30000; // 30s default timeout for Gemini
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	const apiKey = process.env.GEMINI_API_KEY;

	if (!apiKey) {
		throw new Error('GEMINI_API_KEY environment variable is not set');
	}

	try {
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					contents: [
						{
							role: 'user',
							parts: [
								{
									text: `${prompt}\n\n${content}`,
								},
							],
						},
					],
					generationConfig: {
						temperature: 0.7,
						topK: 40,
						topP: 0.95,
						maxOutputTokens: 8192,
					},
					safetySettings: [
						{
							category: 'HARM_CATEGORY_HARASSMENT',
							threshold: 'BLOCK_MEDIUM_AND_ABOVE',
						},
						{
							category: 'HARM_CATEGORY_HATE_SPEECH',
							threshold: 'BLOCK_MEDIUM_AND_ABOVE',
						},
						{
							category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
							threshold: 'BLOCK_MEDIUM_AND_ABOVE',
						},
						{
							category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
							threshold: 'BLOCK_MEDIUM_AND_ABOVE',
						},
					],
				}),
				signal: controller.signal,
			}
		);

		const res = await response.json();

		if (!response.ok) {
			console.error('[Gemini] API error response:', res);
			throw new Error(res.error?.message || 'Gemini API request failed');
		}

		if (!res.candidates || !res.candidates[0]?.content?.parts?.[0]?.text) {
			console.error('[Gemini] Invalid response structure:', res);
			throw new Error('Invalid response from Gemini API');
		}

		const message = res.candidates[0].content.parts[0].text;
		console.log('[Gemini] Response received, length:', message.length);
		// Log a preview of the actual text Gemini generated to the server console
		const preview =
			message.length > 600 ? `${message.slice(0, 600)}... [truncated]` : message;
		console.log('[Gemini] Draft text preview:', preview);
		return message;
	} finally {
		clearTimeout(timeoutId);
	}
};
