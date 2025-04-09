import { User } from '@prisma/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EditUserData {
	clerkId: string;
	data: Partial<User>;
}

interface EditUserOptions {
	suppressToasts?: boolean;
	successMessage?: string;
	errorMessage?: string;
	onSuccess?: () => void;
}

export const useEditUser = (options: EditUserOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'User updated successfully',
		errorMessage = 'Failed to update user',
		onSuccess: onSuccessCallback,
	} = options;

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ data, clerkId }: EditUserData) => {
			const response = await fetch(`/api/users/${clerkId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update user');
			}

			return response.json();
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['user'] });
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
