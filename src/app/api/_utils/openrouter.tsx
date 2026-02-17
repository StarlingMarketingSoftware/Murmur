export const fetchOpenRouter = async (
	model: string,
	prompt: string,
	content: string,
	options?: { timeoutMs?: number; temperature?: number; signal?: AbortSignal }
): Promise<string> => {
	const controller = new AbortController();
	const timeoutMs = options?.timeoutMs ?? 30000; // 30s default timeout for OpenRouter
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	const externalSignal = options?.signal;
	const onExternalAbort = () => controller.abort();
	if (externalSignal) {
		if (externalSignal.aborted) {
			controller.abort();
		} else {
			externalSignal.addEventListener('abort', onExternalAbort, { once: true });
		}
	}
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		throw new Error('OPENROUTER_API_KEY environment variable is not set');
	}

	const DEFAULT_TEMPERATURE = 0.8;
	const rawTemperature =
		typeof options?.temperature === 'number'
			? options.temperature
			: process.env.OPENROUTER_TEMPERATURE
			? Number(process.env.OPENROUTER_TEMPERATURE)
			: DEFAULT_TEMPERATURE;
	const temperature = Number.isFinite(rawTemperature)
		? Math.max(0, Math.min(2, rawTemperature))
		: DEFAULT_TEMPERATURE;

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
				temperature,
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
			const statusCode = response.status;
			const error = new Error(msg) as Error & { code?: string; status?: number };
			error.status = statusCode;
			if (statusCode === 429) {
				error.code = 'rate_limited';
			} else if (statusCode >= 500) {
				error.code = 'upstream';
			}
			throw error;
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
	} catch (error) {
		// Respect caller cancellations so upstream orchestration can halt quickly.
		if (externalSignal?.aborted) {
			throw new Error('Request cancelled.');
		}
		if (error instanceof Error && error.name === 'AbortError') {
			const timeoutError = new Error('OpenRouter request timed out') as Error & {
				code?: string;
				status?: number;
			};
			timeoutError.name = 'AbortError';
			timeoutError.code = 'timeout';
			throw timeoutError;
		}
		if (error instanceof TypeError) {
			const networkError = new Error(error.message || 'Network error') as Error & {
				code?: string;
			};
			networkError.code = 'network';
			throw networkError;
		}
		throw error;
	} finally {
		clearTimeout(timeoutId);
		if (externalSignal) {
			externalSignal.removeEventListener('abort', onExternalAbort);
		}
	}
};
