import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CustomMutationOptions, CustomQueryOptions } from '@/types';
import { toast } from 'sonner';
import { ContactFilterData, PostContactData } from '@/app/api/contacts/route';
import { appendQueryParamsToUrl } from '@/utils';
import { PostBatchContactData } from '@/app/api/contacts/batch/route';
import { PatchContactData } from '@/app/api/contacts/[id]/route';
import { PostBulkUpdateContactData } from '@/app/api/contacts/bulk-update/route';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { ContactWithName } from '@/types/contact';

const QUERY_KEYS = {
	all: ['contacts'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export interface ContactQueryOptions extends CustomQueryOptions {
	filters?: ContactFilterData;
}

interface EditContactData {
	id: string | number;
	data: PatchContactData;
}

export const useGetContacts = (options: ContactQueryOptions) => {
	return useQuery<ContactWithName[]>({
		queryKey: [...QUERY_KEYS.list(), options.filters],
		queryFn: async ({ signal }) => {
			const url = appendQueryParamsToUrl(urls.api.contacts.index, options.filters);
			const response = await _fetch(url, undefined, undefined, {
				signal,
				timeout: 25000,
			});

			if (!response.ok) {
				let errorMessage = 'Failed to fetch contacts';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					// If response is not JSON (e.g., plain text "Internal Server Error")
					// try to get the text content
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}

			return response.json() as Promise<ContactWithName[]>;
		},
		enabled: options.enabled === undefined ? true : options.enabled,
		gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
	});
};

export const useGetUsedContactIds = () => {
	return useQuery<number[]>({
		queryKey: [...QUERY_KEYS.list(), 'used-contacts'],
		queryFn: async () => {
			const url = appendQueryParamsToUrl(urls.api.contacts.usedContacts.index);
			const response = await _fetch(url);

			if (!response.ok) {
				let errorMessage = 'Failed to fetch used contacts';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					// If response is not JSON (e.g., plain text "Internal Server Error")
					// try to get the text content
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}

			return response.json() as Promise<number[]>;
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
			const response = await _fetch(urls.api.contacts.index, 'POST', data);
			if (!response.ok) {
				let errorMessage = 'Failed to create contact';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
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
			const response = await _fetch(urls.api.contacts.batch.index, 'POST', data);
			if (!response.ok) {
				let errorMessage = 'Failed to create contacts';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}

			return response.json();
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
			if (!suppressToasts) {
				toast.success(
					`${successMessage}! ${data.created} contacts created. ${data.skipped} duplicate contacts skipped.`
				);
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

export const useEditContact = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contact updated successfully',
		errorMessage = 'Failed to update contact',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ data, id }: EditContactData) => {
			const response = await _fetch(urls.api.contacts.detail(id), 'PATCH', data);
			if (!response.ok) {
				let errorMessage = 'Failed to update contact';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}

			return response.json();
		},
		onSuccess: (variables) => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.detail(variables.id),
			});

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
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: number) => {
			const response = await _fetch(urls.api.contacts.detail(id), 'DELETE');
			if (!response.ok) {
				let errorMessage = 'Failed to delete contact';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
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

export const useBatchUpdateContacts = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Contacts updated successfully',
		errorMessage = 'Failed to update contacts',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostBulkUpdateContactData) => {
			const response = await _fetch(urls.api.contacts.bulkUpdate.index, 'PATCH', data, {
				timeout: 120000,
			});
			if (!response.ok) {
				let errorMessage = 'Failed to update contacts';
				try {
					const errorData = await response.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					try {
						const textError = await response.text();
						errorMessage = textError || `HTTP ${response.status} error`;
					} catch {
						errorMessage = `HTTP ${response.status} error`;
					}
				}
				throw new Error(errorMessage);
			}

			return response.json();
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });
			if (!suppressToasts) {
				const { updatedCount, failedCount } = data;
				const message =
					failedCount > 0
						? `${successMessage}! ${updatedCount} contacts updated, ${failedCount} failed.`
						: `${successMessage}! ${updatedCount} contacts updated.`;
				toast.success(message);
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
