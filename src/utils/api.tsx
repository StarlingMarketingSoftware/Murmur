type FetchMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const DEFAULT_TIMEOUT = 30000;

export const _fetch = async <TBody = unknown,>(
	url: string,
	method?: FetchMethod,
	body?: TBody,
	options?: { timeout?: number; signal?: AbortSignal }
): Promise<Response> => {
	const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	const signal = options?.signal ?? controller.signal;

	try {
		let response: Response;

		switch (method) {
			case 'POST':
				response = await fetch(url, {
					method,
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(body),
					signal,
				});
				break;
			case 'PATCH':
				response = await fetch(url, {
					method,
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(body),
					signal,
				});
				break;
			case 'DELETE':
				response = await fetch(url, { method, signal });
				break;
			case 'GET':
			default:
				response = await fetch(url, { signal });
				break;
		}

		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error(`Request timeout after ${timeout}ms`);
		}
		throw error;
	}
};
