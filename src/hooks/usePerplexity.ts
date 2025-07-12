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
				throw new Error('Failed to generate email.');
			}

			const data = await response.json();

			try {
				const jsonString: string = data.choices[0].message.content;
				return jsonString;
			} catch {
				throw new Error('Failed to parse AI response. Please try again.');
			}
		},
	});
};
