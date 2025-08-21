import { CustomMutationOptions } from '@/types';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { urls } from '@/constants/urls';
import { PostMistralData } from '@/app/api/mistral/route';
import { removeMarkdownCodeBlocks } from '@/utils';

export interface PostMistralDataWithSignal extends PostMistralData {
	signal?: AbortSignal;
}

export const useMistral = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Mistral Agent response received',
		errorMessage = 'Failed to get a response from Mistral Agent',
		onSuccess: onSuccessCallback,
	} = options;

	return useMutation({
		mutationFn: async (data: PostMistralDataWithSignal): Promise<string> => {
			const response = await fetch(urls.api.mistral.index, {
				method: 'POST',
				signal: data.signal,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				let errorMsg = 'Failed to get response from Mistral Agent';
				try {
					const errorData = await response.json();
					if (errorData.error?.message) {
						errorMsg = `Mistral API error: ${errorData.error.message}`;
					} else if (errorData.message) {
						errorMsg = `Mistral error: ${errorData.message}`;
					}
					console.error('[Mistral] API error response:', errorData);
				} catch {
					errorMsg = `Mistral API error: ${response.status} ${response.statusText}`;
				}
				throw new Error(errorMsg);
			}
			const res = await response.json();
			console.log('[Mistral] Response type:', typeof res);
			console.log(
				'[Mistral] Response preview:',
				typeof res === 'string' ? res : JSON.stringify(res)
			);

			return removeMarkdownCodeBlocks(res);
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
