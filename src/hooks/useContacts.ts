import { Contact } from '@prisma/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CustomMutationOptions, CustomQueryOptions } from '@/constants/types';
import { toast } from 'sonner';
import { ContactFilterData, PostContactData } from '@/app/api/contacts/route';
import { appendQueryParamsToUrl } from '@/app/utils/url';
import { PostBatchContactData } from '@/app/api/contacts/batch/route';
import { PatchContactData } from '@/app/api/contacts/[id]/route';

export interface ContactQueryOptions extends CustomQueryOptions {
	filters?: ContactFilterData;
}

export const useGetContacts = (options: ContactQueryOptions) => {
	return useQuery({
		queryKey: ['contacts', options.filters],
		queryFn: async () => {
			const url = appendQueryParamsToUrl('/api/contacts', options.filters);

			const response = await fetch(url, {
				method: 'GET',
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to fetch contacts');
			}

			return response.json() as Promise<Contact[]>;
		},
	});
};

export const useCreateContact = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contact created successfully',
		errorMessage = 'Failed to create contact',
		onSuccess: onSuccessCallback,
	} = options;

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostContactData) => {
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
	data: PatchContactData;
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

export const useBatchCreateContacts = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contacts created successfully',
		errorMessage = 'Failed to create contacts',
		onSuccess: onSuccessCallback,
	} = options;

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostBatchContactData) => {
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
