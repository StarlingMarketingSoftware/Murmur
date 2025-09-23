import { CustomMutationOptions } from '@/types';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { urls } from '@/constants/urls';
import { PostOpenAiData } from '@/app/api/openai/route';
import { removeMarkdownCodeBlocks, removeEmDashes } from '@/utils';

export interface PostOpenAiDataWithSignal extends PostOpenAiData {
	signal?: AbortSignal;
}

export const useOpenAi = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'API call successful',
		errorMessage = 'Failed to get a response from the API',
		onSuccess: onSuccessCallback,
	} = options;

	return useMutation({
		mutationFn: async (data: PostOpenAiDataWithSignal): Promise<string> => {
			const response = await fetch(urls.api.openai.index, {
				method: 'POST',
				signal: data.signal,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error?.message || 'Failed to clean email');
			}
			const res = await response.json();

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
