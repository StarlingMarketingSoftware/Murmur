import { Contact } from '@prisma/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CustomMutationOptions } from '@/constants/types';
import { toast } from 'sonner';

export const useGetContactsByCategory = (contactListId?: number) => {
	return useQuery({
		queryKey: ['contacts', 'by-category', contactListId],
		queryFn: async () => {
			if (!contactListId) return [];

			const response = await fetch(`/api/contacts/get-by-category/${contactListId}`, {
				method: 'GET',
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to fetch contacts');
			}

			return response.json() as Promise<Contact[]>;
		},
		enabled: !!contactListId,
	});
};

interface CreateContactBody {
	name?: string;
	email: string;
	company?: string;
	website?: string | null;
	state?: string;
	country?: string;
	phone?: string;
	contactListId?: number;
}

export const useCreateContact = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contact created successfully',
		errorMessage = 'Failed to create contact',
		onSuccess: onSuccessCallback,
	} = options;

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateContactBody) => {
			const response = await fetch('/api/contacts', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create contact');
			}

			return response.json();
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			queryClient.invalidateQueries({ queryKey: ['contacts'] });
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};

interface EditContactData {
	contactId: number;
	data: Partial<Contact>;
}

export const useEditContact = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contact updated successfully',
		errorMessage = 'Failed to update contact',
		onSuccess: onSuccessCallback,
	} = options;

	return useMutation({
		mutationFn: async ({ data, contactId }: EditContactData) => {
			const response = await fetch(`/api/contacts/${contactId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update contact');
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

export const useDeleteContact = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contact deleted successfully',
		errorMessage = 'Failed to delete contact',
		onSuccess: onSuccessCallback,
	} = options;

	return useMutation({
		mutationFn: async (contactId: number) => {
			const response = await fetch(`/api/contacts/${contactId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete contact');
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

interface BatchCreateContactBody {
	contacts: Array<{
		name?: string | null;
		email: string;
		company?: string | null;
		website?: string | null;
		state?: string | null;
		country?: string | null;
		phone?: string | null;
	}>;
	contactListId?: number;
}

export const useBatchCreateContacts = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contacts created successfully',
		errorMessage = 'Failed to create contacts',
		onSuccess: onSuccessCallback,
	} = options;

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: BatchCreateContactBody) => {
			const response = await fetch('/api/contacts/batch', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create contacts');
			}

			return response.json();
		},
		onSuccess: (data) => {
			if (!suppressToasts) {
				toast.success(
					`${successMessage}! ${data.created} contacts created. ${data.skipped} duplicate contacts skipped.`
				);
			}

			queryClient.invalidateQueries({ queryKey: ['contacts'] });
			onSuccessCallback?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};
