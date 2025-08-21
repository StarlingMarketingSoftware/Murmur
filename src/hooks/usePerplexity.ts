import { PostPerplexityData } from '@/app/api/perplexity/route';
import { useMutation } from '@tanstack/react-query';

const PERPLEXITY_ENDPOINT = '/api/perplexity';

export type DraftEmailResponse = {
	message: string;
	subject: string;
};

export interface PostPerplexityDataWithSignal extends PostPerplexityData {
	signal?: AbortSignal;
}

export const usePerplexity = () => {
	return useMutation({
		mutationFn: async (params: PostPerplexityDataWithSignal): Promise<string> => {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000);

			let response;

			try {
				response = await fetch(PERPLEXITY_ENDPOINT, {
					signal: params.signal,
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(params),
				});
			} catch (error) {
				if (error instanceof Error && error.name === 'AbortError') {
					throw new Error('Email generation cancelled.');
				}
				throw error;
			}

			clearTimeout(timeoutId);
			if (!response || !response.ok) {
				let errorMsg = 'Failed to generate email';
				try {
					const errorData = await response.json();
					if (errorData.error?.message) {
						errorMsg = `Perplexity API error: ${errorData.error.message}`;
					} else if (errorData.message) {
						errorMsg = `Perplexity error: ${errorData.message}`;
					}
					console.error('[Perplexity] API error response:', errorData);
				} catch {
					errorMsg = `Perplexity API error: ${response.status} ${response.statusText}`;
				}
				throw new Error(errorMsg);
			}

			const data = await response.json();

			try {
				const jsonString: string = data.choices[0].message.content;
				console.log('[Perplexity] Response preview:', jsonString);
				return jsonString;
			} catch (e) {
				console.error('[Perplexity] Failed to extract content from response:', e, data);
				throw new Error('Failed to parse Perplexity response. Please try again.');
			}
		},
	});
};
