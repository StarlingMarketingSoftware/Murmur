import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CustomMutationOptions } from '@/types/types';
import { addFontToHtml } from '@/app/utils/htmlFormatting';
import { CreateSignatureData } from '@/app/api/signatures/route';
import { UpdateSignatureData } from '@/app/api/signatures/[id]/route';
import { _fetch } from '@/app/utils/api';
import { urls } from '@/constants/urls';
import { DEFAULT_FONT } from '@/constants';

const QUERY_KEYS = {
	all: ['signatures'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

interface EditSignatureData {
	id: string | number;
	data: UpdateSignatureData;
}

export const useGetSignatures = () => {
	return useQuery({
		queryKey: QUERY_KEYS.list(),
		queryFn: async () => {
			const response = await _fetch(urls.api.signatures.index);
			if (!response.ok) {
				throw new Error('Failed to _fetch signatures');
			}
			return response.json();
		},
	});
};

export const useCreateSignature = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Signature created successfully',
		errorMessage = 'Failed to create signature',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateSignatureData) => {
			const response = await _fetch(urls.api.signatures.index, 'POST', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create signature');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
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

export const useEditSignature = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Signature updated successfully',
		errorMessage = 'Failed to update signature',
		onSuccess: onSuccessCallback,
	} = options;

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ data, id }: EditSignatureData) => {
			let formattedContent = data.content;
			if (!data.content.includes('<span style="font-family')) {
				formattedContent = addFontToHtml(data.content, DEFAULT_FONT);
			}
			const response = await _fetch(urls.api.signatures.detail(id), 'PATCH', {
				...data,
				content: formattedContent,
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update signature');
			}

			return response.json();
		},
		onSuccess: (variables) => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.detail(variables.id),
			});
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

export const useDeleteSignature = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Signature deleted successfully',
		errorMessage = 'Failed to delete signature',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number) => {
			const response = await _fetch(urls.api.signatures.detail(id), 'DELETE');
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete signature');
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
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
