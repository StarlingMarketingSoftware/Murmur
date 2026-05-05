type FetchMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const DEFAULT_TIMEOUT = 30000;

export const _fetch = async <TBody = unknown,>(
	url: string,
	method?: FetchMethod,
	body?: TBody,
	options?: { timeout?: number; signal?: AbortSignal }
): Promise<Response> => {
	const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
	const externalSignal = options?.signal;

	// One internal controller serves two reasons-to-abort:
	//   (a) the per-request timeout fired
	//   (b) the caller's AbortSignal fired
	// We track which one fired so the catch block can rethrow the right error:
	// a timeout is a real failure ("timed out after 30s"); a caller abort means
	// the consumer changed their mind and we must not relabel it as a timeout.
	const internalController = new AbortController();
	let timeoutFired = false;
	const timeoutId = setTimeout(() => {
		timeoutFired = true;
		internalController.abort();
	}, timeout);

	const forwardExternalAbort = () => internalController.abort();
	if (externalSignal) {
		if (externalSignal.aborted) {
			internalController.abort();
		} else {
			externalSignal.addEventListener('abort', forwardExternalAbort, { once: true });
		}
	}

	try {
		const init: RequestInit = { signal: internalController.signal };
		switch (method) {
			case 'POST':
			case 'PATCH':
				init.method = method;
				init.headers = { 'Content-Type': 'application/json' };
				init.body = JSON.stringify(body);
				break;
			case 'DELETE':
				init.method = method;
				break;
			case 'GET':
			default:
				break;
		}
		return await fetch(url, init);
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			if (externalSignal?.aborted) {
				// Caller-initiated cancellation. Surface a real AbortError so
				// callers can detect it via `error.name === 'AbortError'` and
				// silently move on instead of toasting a fake "timeout".
				throw error;
			}
			if (timeoutFired) {
				throw new Error(`Request timeout after ${timeout}ms`);
			}
		}
		throw error;
	} finally {
		clearTimeout(timeoutId);
		if (externalSignal) {
			externalSignal.removeEventListener('abort', forwardExternalAbort);
		}
	}
};
