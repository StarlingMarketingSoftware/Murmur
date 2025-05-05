import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CustomMutationOptions } from '@/constants/types';
import { addFontToHtml } from '@/app/utils/htmlFormatting';
import { DefaultFont } from '@/constants/constants';

export const useGetUserSignatures = () => {
	return useQuery({
		queryKey: ['signatures'],
		queryFn: async () => {
			const response = await fetch('/api/signatures');
			if (!response.ok) {
				throw new Error('Failed to fetch signatures');
			}
			return response.json();
		},
	});
};

interface EditSignatureData {
	signatureId: number;
	data: {
		name: string;
		content: string;
	};
}

export const useEditSignature = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Signature updated successfully',
		errorMessage = 'Failed to update signature',
		onSuccess: onSuccessCallback,
	} = options;

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ data, signatureId }: EditSignatureData) => {
			let formattedContent = data.content;
			if (!data.content.includes('<span style="font-family')) {
				formattedContent = addFontToHtml(data.content, DefaultFont);
			}

			const response = await fetch(`/api/signatures/${signatureId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ ...data, content: formattedContent }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update signature');
			}

			return response.json();
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			queryClient.invalidateQueries({ queryKey: ['signatures'] });
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};

interface CreateSignatureData {
	name: string;
	content: string;
}

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
			const response = await fetch('/api/signatures', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create signature');
			}

			return response.json();
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			queryClient.invalidateQueries({ queryKey: ['signatures'] });
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
		mutationFn: async (signatureId: number) => {
			const response = await fetch(`/api/signatures/${signatureId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete signature');
			}

			return response.json();
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			queryClient.invalidateQueries({ queryKey: ['signatures'] });
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};
