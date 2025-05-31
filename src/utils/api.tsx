type FetchMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export const _fetch = async <TBody = unknown,>(
	url: string,
	method?: FetchMethod,
	body?: TBody
): Promise<Response> => {
	switch (method) {
		case 'POST':
			return fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});
		case 'PATCH':
			return fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});
		case 'DELETE':
			return fetch(url, { method });
		case 'GET':
		default:
			return fetch(url);
	}
};
