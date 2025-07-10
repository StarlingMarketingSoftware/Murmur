import { PatchUserContactListData } from '@/app/api/user-contact-lists/[id]/route';
import { PostUserContactListData } from '@/app/api/user-contact-lists/route';
import { _fetch } from '@/utils';
import { CustomMutationOptions } from '@/types';
import { urls } from '@/constants/urls';
import { UserContactListWithContacts } from '@/types/contact';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const QUERY_KEYS = {
	all: ['userContactLists'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

interface EditUserContactListData {
	id: string | number;
	data: PatchUserContactListData;
}

export const useGetUserContactLists = () => {
	return useQuery({
		queryKey: QUERY_KEYS.list(),
		queryFn: async () => {
			const response = await _fetch(urls.api.userContactList.index);
			if (!response.ok) {
				throw new Error('Failed to fetch user contact lists');
			}
			return response.json();
		},
	});
};

export const useGetUserContactList = (id: string) => {
	return useQuery<UserContactListWithContacts>({
		queryKey: QUERY_KEYS.detail(id),
		queryFn: async () => {
			const response = await _fetch(urls.api.userContactList.detail(id));
			if (!response.ok) {
				throw new Error('Failed to fetch user contact list');
			}
			return response.json();
		},
		enabled: !!id,
	});
};

export const useCreateUserContactList = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'User contact list created successfully',
		errorMessage = 'Failed to create user contact list',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostUserContactListData) => {
			const response = await _fetch(urls.api.userContactList.index, 'POST', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create user contact list');
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

export const useEditUserContactList = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'User contact list updated successfully',
		errorMessage = 'Failed to update user contact list',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ data, id }: EditUserContactListData) => {
			const response = await _fetch(urls.api.userContactList.detail(id), 'PATCH', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update user contact list');
			}

			return response.json();
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.detail(variables.id),
			});
			onSuccessCallback?.();
			if (!suppressToasts) {
				toast.success(successMessage);
			}
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};

export const useDeleteUserContactList = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'User contact list deleted successfully',
		errorMessage = 'Failed to delete user contact list',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number) => {
			const response = await _fetch(urls.api.userContactList.detail(id), 'DELETE');
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete user contact list');
			}
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};
