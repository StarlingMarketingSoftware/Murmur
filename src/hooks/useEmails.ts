import { CustomMutationOptions } from '@/constants/types';
import { Email } from '@prisma/client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EditEmailData {
	emailId: number;
	data: Email; // Consider creating a proper type for your email data
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
