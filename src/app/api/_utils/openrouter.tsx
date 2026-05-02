export const fetchOpenRouter = async (
	model: string,
	prompt: string,
	content: string,
	options?: {
		timeoutMs?: number;
		temperature?: number;
		signal?: AbortSignal;
		onToken?: (token: string) => void;
	}
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
				stream: true,
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

		if (!response.ok) {
			const raw = await response.text();
			let res: any = null;
			try {
				res = raw ? JSON.parse(raw) : null;
			} catch {
				res = null;
			}

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

		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error('Empty response from OpenRouter streaming');
		}

		const decoder = new TextDecoder();
		let buffer = '';
		let messageText = '';
		let streamEnded = false;

		const appendDeltaContent = (deltaContent: any) => {
			if (typeof deltaContent === 'string') {
				messageText += deltaContent;
				if (options?.onToken) {
					try {
						options.onToken(deltaContent);
					} catch {
						// Ignore callback errors so streaming completion remains intact.
					}
				}
				return;
			}
			if (Array.isArray(deltaContent)) {
				const joined = deltaContent
					.map((part: any) => {
						if (typeof part === 'string') return part;
						if (part && typeof part === 'object') {
							if (typeof part.text === 'string') return part.text;
							if (typeof part.content === 'string') return part.content;
						}
						return '';
					})
					.join('');
				if (joined.length > 0) {
					messageText += joined;
					if (options?.onToken) {
						try {
							options.onToken(joined);
						} catch {
							// Ignore callback errors so streaming completion remains intact.
						}
					}
				}
			}
		};

		const processSseLine = (rawLine: string) => {
			const line = rawLine.trim();
			if (!line || !line.startsWith('data:')) return;

			const data = line.slice(5).trim();
			if (!data) return;
			if (data === '[DONE]') {
				streamEnded = true;
				return;
			}

			let chunk: any = null;
			try {
				chunk = JSON.parse(data);
			} catch {
				return;
			}

			appendDeltaContent(chunk?.choices?.[0]?.delta?.content);
		};

		while (!streamEnded) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split(/\r?\n/);
			buffer = lines.pop() ?? '';
			for (const line of lines) {
				processSseLine(line);
				if (streamEnded) break;
			}
		}

		buffer += decoder.decode();
		if (buffer.length > 0) {
			const remainingLines = buffer.split(/\r?\n/);
			for (const line of remainingLines) {
				processSseLine(line);
				if (streamEnded) break;
			}
		}

		if (messageText.length === 0) {
			throw new Error('Empty response from OpenRouter streaming');
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
