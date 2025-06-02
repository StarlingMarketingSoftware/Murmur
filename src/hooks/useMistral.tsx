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
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message || 'Failed to get response from Mistral Agent'
				);
			}
			const res = await response.json();

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
