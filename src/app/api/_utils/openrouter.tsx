export const fetchOpenRouter = async (
	model: string,
	prompt: string,
	content: string,
	options?: { timeoutMs?: number }
): Promise<string> => {
	const controller = new AbortController();
	const timeoutMs = options?.timeoutMs ?? 30000; // 30s default timeout for OpenRouter
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		throw new Error('OPENROUTER_API_KEY environment variable is not set');
	}
	try {
		const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model,
				stream: false,
				temperature: 0.7,
				top_p: 0.95,
				max_tokens: 1200,
				messages: [
					{ role: 'system', content: prompt },
					{
						role: 'user',
						content,
					},
				],
			}),
			signal: controller.signal,
		});

		const raw = await response.text();
		let res: any = null;
		try {
			res = raw ? JSON.parse(raw) : null;
		} catch {
			res = null;
		}

		if (!response.ok) {
			const msg =
				res?.error?.message ||
				res?.message ||
				(raw ? raw.slice(0, 500) : null) ||
				'OpenRouter request failed';
			throw new Error(msg);
		}

		const choice0 = res?.choices?.[0];
		const contentValue = choice0?.message?.content;

		let messageText: string | null = null;
		if (typeof contentValue === 'string') {
			messageText = contentValue;
		} else if (
			contentValue &&
			typeof contentValue === 'object' &&
			typeof (contentValue as any).text === 'string'
		) {
			messageText = (contentValue as any).text;
		} else if (
			contentValue &&
			typeof contentValue === 'object' &&
			typeof (contentValue as any).content === 'string'
		) {
			messageText = (contentValue as any).content;
		} else if (Array.isArray(contentValue)) {
			// OpenAI-style "content parts" array
			const joined = contentValue
				.map((part: any) => {
					if (typeof part === 'string') return part;
					if (part && typeof part === 'object') {
						if (typeof part.text === 'string') return part.text;
						if (typeof part.content === 'string') return part.content;
					}
					return '';
				})
				.join('');
			if (joined.trim().length > 0) {
				messageText = joined;
			}
		} else if (typeof choice0?.text === 'string' && choice0.text.trim().length > 0) {
			messageText = choice0.text;
		} else if (typeof res?.output_text === 'string' && res.output_text.trim().length > 0) {
			messageText = res.output_text;
		}

		if (typeof messageText !== 'string' || messageText.trim().length === 0) {
			const finishReason =
				choice0?.finish_reason ||
				choice0?.finishReason ||
				choice0?.finish_reason_detail ||
				choice0?.finishReasonDetail;

			console.error('[OpenRouter] Unexpected response shape:', {
				model,
				status: response.status,
				finishReason,
				topLevelKeys: res ? Object.keys(res) : null,
				choiceKeys: choice0 ? Object.keys(choice0) : null,
				messageKeys: choice0?.message ? Object.keys(choice0.message) : null,
				contentType: typeof contentValue,
				isContentArray: Array.isArray(contentValue),
			});

			throw new Error(
				`Invalid response from OpenRouter${
					finishReason ? ` (finishReason: ${String(finishReason)})` : ''
				}`
			);
		}

		return messageText;
	} finally {
		clearTimeout(timeoutId);
	}
};
