import { CustomMutationOptions } from '@/types';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { urls } from '@/constants/urls';
import { PostGeminiData } from '@/app/api/gemini/route';
import { removeMarkdownCodeBlocks, removeEmDashes } from '@/utils';

export interface PostGeminiDataWithSignal extends PostGeminiData {
	signal?: AbortSignal;
}

export const useGemini = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Gemini response received',
		errorMessage = 'Failed to get a response from Gemini',
		onSuccess: onSuccessCallback,
	} = options;

	return useMutation({
		mutationFn: async (data: PostGeminiDataWithSignal): Promise<string> => {
			const response = await fetch(urls.api.gemini.index, {
				method: 'POST',
				signal: data.signal,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				let errorMsg = 'Failed to get response from Gemini';
				try {
					const errorData = await response.json();
					if (errorData.error?.message) {
						errorMsg = `Gemini API error: ${errorData.error.message}`;
					} else if (errorData.message) {
						errorMsg = `Gemini error: ${errorData.message}`;
					}
					console.error('[Gemini] API error response:', errorData);
				} catch {
					errorMsg = `Gemini API error: ${response.status} ${response.statusText}`;
				}
				throw new Error(errorMsg);
			}
			const res = await response.json();
			console.log('[Gemini] Response type:', typeof res);
			console.log(
				'[Gemini] Response preview:',
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
