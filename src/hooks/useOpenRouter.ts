import { CustomMutationOptions } from '@/types';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { urls } from '@/constants/urls';
import { PostOpenRouterData } from '@/app/api/openrouter/route';
import { removeMarkdownCodeBlocks, removeEmDashes } from '@/utils';

export interface PostOpenRouterDataWithSignal extends PostOpenRouterData {
	signal?: AbortSignal;
}

export const useOpenRouter = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'OpenRouter response received',
		errorMessage = 'Failed to get a response from OpenRouter',
		onSuccess: onSuccessCallback,
	} = options;

	return useMutation({
		mutationFn: async (data: PostOpenRouterDataWithSignal): Promise<string> => {
			const response = await fetch(urls.api.openRouter.index, {
				method: 'POST',
				signal: data.signal,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				let errorMsg = 'Failed to get response from OpenRouter';
				try {
					const errorData = await response.json();
					if (errorData.error?.message) {
						errorMsg = `OpenRouter API error: ${errorData.error.message}`;
					} else if (errorData.message) {
						errorMsg = `OpenRouter error: ${errorData.message}`;
					}
					console.error('[OpenRouter] API error response:', errorData);
				} catch {
					errorMsg = `OpenRouter API error: ${response.status} ${response.statusText}`;
				}
				throw new Error(errorMsg);
			}
			const res = await response.json();
			console.log('[OpenRouter] Model:', data.model);
			console.log('[OpenRouter] Response type:', typeof res);
			console.log(
				'[OpenRouter] Response preview:',
				typeof res === 'string' ? res : JSON.stringify(res)
			);

			return removeEmDashes(removeMarkdownCodeBlocks(res));
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};
