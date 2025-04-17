import { CustomMutationOptions } from '@/constants/types';
import { Email } from '@prisma/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EditEmailData {
	emailId: number;
	data: Email;
}

export const useEditEmail = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Email updated successfully',
		errorMessage = 'Failed to update email',
		onSuccess: onSuccessCallback,
	} = options;

	return useMutation({
		mutationFn: async ({ data, emailId }: EditEmailData) => {
			const response = await fetch(`/api/emails/${emailId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update email');
			}

			return response.json();
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage || 'Email updated successfully');
			}

			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage || 'Failed to update email. Please try again.');
			}
		},
	});
};

export const useDeleteEmail = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Email deleted successfully',
		errorMessage = 'Failed to delete email',
		onSuccess: onSuccessCallback,
	} = options;

	return useMutation({
		mutationFn: async (emailId: number) => {
			const response = await fetch(`/api/emails/${emailId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete email');
			}

			return response.json();
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

export interface CreateEmailBody {
	subject: string;
	message: string;
	campaignId: number;
	status?: 'draft' | 'scheduled' | 'sent' | 'failed';
	sentAt?: string | null;
	contactId: number;
}

export const useCreateEmail = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Email created successfully',
		errorMessage = 'Failed to create email',
		onSuccess: onSuccessCallback,
	} = options;

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateEmailBody) => {
			const response = await fetch('/api/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create email');
			}

			return response.json();
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			queryClient.invalidateQueries({ queryKey: ['emails'] });
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};
