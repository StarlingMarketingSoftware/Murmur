import { PatchContactListData } from '@/app/api/contact-list/[id]/route';
import { PostContactListData } from '@/app/api/contact-list/route';
import { CustomMutationOptions } from '@/constants/types';
import { ContactList } from '@prisma/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EditContactListData {
	listId: number;
	data: PatchContactListData;
}

export const useGetContactLists = () => {
	return useQuery({
		queryKey: ['contactLists'],
		queryFn: async () => {
			const response = await fetch('/api/contact-list');
			if (!response.ok) {
				throw new Error('Failed to fetch contact lists');
			}
			return response.json();
		},
	});
};

export const useGetContactList = (id: number) => {
	return useQuery<ContactList>({
		queryKey: ['contactList', id],
		queryFn: async () => {
			const response = await fetch(`/api/contact-list/${id}`);
			if (!response.ok) {
				throw new Error('Failed to fetch contact list');
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
			const response = await fetch('/api/contact-list', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create contact list');
			}

			return response.json();
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			queryClient.invalidateQueries({ queryKey: ['contactLists'] });
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
		mutationFn: async ({ data, listId }: EditContactListData) => {
			const response = await fetch(`/api/contact-list/${listId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update contact list');
			}

			return response.json();
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			queryClient.invalidateQueries({ queryKey: ['contactLists'] });
			onSuccessCallback?.();
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
			const response = await fetch(`/api/contact-list/${listId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete contact list');
			}
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			queryClient.invalidateQueries({ queryKey: ['contactLists'] });
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};
