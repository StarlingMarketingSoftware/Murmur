import { PatchContactListData } from '@/app/api/contact-list/[id]/route';
import { PostContactListData } from '@/app/api/contact-list/route';
import { _fetch } from '@/app/utils/api';
import { CustomMutationOptions } from '@/constants/types';
import { ContactList } from '@prisma/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const QUERY_KEYS = {
	all: ['contactLists'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

interface EditContactListData {
	id: string | number;
	data: PatchContactListData;
}

export const useGetContactLists = () => {
	return useQuery({
		queryKey: QUERY_KEYS.list(),
		queryFn: async () => {
			const response = await _fetch('/api/contact-list');
			if (!response.ok) {
				throw new Error('Failed to _fetch contact lists');
			}
			return response.json();
		},
	});
};

export const useGetContactList = (id: string) => {
	return useQuery<ContactList>({
		queryKey: QUERY_KEYS.detail(id),
		queryFn: async () => {
			const response = await _fetch(`/api/contact-list/${id}`);
			if (!response.ok) {
				throw new Error('Failed to _fetch contact list');
			}
			return response.json();
		},
	});
};

export const useCreateContactList = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contact list created successfully',
		errorMessage = 'Failed to create contact list',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostContactListData) => {
			const response = await _fetch('/api/contact-list', 'POST', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create contact list');
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

export const useEditContactList = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contact list updated successfully',
		errorMessage = 'Failed to update contact list',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ data, id }: EditContactListData) => {
			const response = await _fetch(`/api/contact-list/${id}`, 'PATCH', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update contact list');
			}

			return response.json();
		},
		onSuccess: (variables) => {
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

export const useDeleteContactList = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contact list deleted successfully',
		errorMessage = 'Failed to delete contact list',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (listId: number) => {
			const response = await _fetch(`/api/contact-list/${listId}`, 'DELETE');
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete contact list');
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
