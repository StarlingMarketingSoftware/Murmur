import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CustomMutationOptions, CustomQueryOptions } from '@/types';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { PostApolloContactsData } from '@/app/api/apollo/route';
import { toast } from 'sonner';

const QUERY_KEYS = {
	all: ['apollo'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export interface ApolloQueryOptions extends CustomQueryOptions {
	filters?: PostApolloContactsData;
}

export const useCreateApolloContacts = (options: CustomMutationOptions) => {
	const {
		suppressToasts = false,
		successMessage = 'Contact created successfully',
		errorMessage = 'Failed to create contact',
		onSuccess: onSuccessCallback,
	} = options;

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostApolloContactsData) => {
			const response = await _fetch(urls.api.apollo.index, 'POST', data);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to import Apollo contacts');
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
