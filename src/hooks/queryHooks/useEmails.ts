import { PatchEmailData } from '@/app/api/emails/[id]/route';
import { EmailFilterData, PostEmailData } from '@/app/api/emails/route';
import { _fetch } from '@/utils';
import { appendQueryParamsToUrl } from '@/utils';
import { CustomMutationOptions, CustomQueryOptions, EmailWithRelations } from '@/types';
import { urls } from '@/constants/urls';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const EMAIL_QUERY_KEYS = {
	all: ['emails'] as const,
	list: () => [...EMAIL_QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) =>
		[...EMAIL_QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export interface EmailQueryOptions extends CustomQueryOptions {
	filters?: EmailFilterData;
}

interface EditEmailData {
	id: string | number;
	data: PatchEmailData;
}

export const useGetEmails = (options: EmailQueryOptions) => {
	return useQuery({
		queryKey: [...EMAIL_QUERY_KEYS.list()],
		queryFn: async () => {
			const url = appendQueryParamsToUrl(urls.api.emails.index, options.filters);
			const response = await _fetch(url);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to _fetch emails');
			}

			return response.json() as Promise<EmailWithRelations[]>;
		},
	});
};

export const useCreateEmail = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Email created successfully',
		errorMessage = 'Failed to create email',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostEmailData) => {
			const response = await _fetch(urls.api.emails.index, 'POST', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create email');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.list() });
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

export const useEditEmail = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Email updated successfully',
		errorMessage = 'Failed to update email',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ data, id }: EditEmailData) => {
			const response = await _fetch(urls.api.emails.detail(id), 'PATCH', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update email');
			}

			return response.json();
		},
		onSuccess: (variables) => {
			queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.list() });
			queryClient.invalidateQueries({
				queryKey: EMAIL_QUERY_KEYS.detail(variables.id),
			});

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
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: number) => {
			const response = await _fetch(urls.api.emails.detail(id), 'DELETE');
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete email');
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.all });
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
