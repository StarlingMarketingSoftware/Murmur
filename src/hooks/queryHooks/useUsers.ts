import { PatchUserData } from '@/app/api/users/[id]/route';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User } from '@prisma/client';

const QUERY_KEYS = {
	all: ['users'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

interface EditUserData {
	clerkId: string;
	data: PatchUserData;
}

interface EditUserOptions {
	suppressToasts?: boolean;
	successMessage?: string;
	errorMessage?: string;
	onSuccess?: () => void;
}

export const useGetUsers = () => {
	return useQuery({
		queryKey: QUERY_KEYS.list(),
		queryFn: async () => {
			const response = await _fetch(urls.api.users.index);
			if (!response.ok) {
				throw new Error('Failed to _fetch users');
			}
			return response.json();
		},
	});
};

export const useGetUser = (clerkId: string | undefined | null) => {
	return useQuery({
		queryKey: QUERY_KEYS.detail(clerkId || ''),
		queryFn: async () => {
			if (!clerkId) {
				throw new Error('Clerk ID is required');
			}
			const response = await _fetch(urls.api.users.detail(clerkId));
			if (!response.ok) {
				throw new Error('Failed to fetch user');
			}
			return response.json();
		},
		enabled: !!clerkId,
	});
};

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
			const response = await _fetch(urls.api.users.detail(clerkId), 'PATCH', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update user');
			}

			return response.json();
		},
		onSuccess: (data: User) => {
			console.log('🚀 ~ useEditUser success ~ data:', data);
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.clerkId) });
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
