import { _fetch, appendQueryParamsToUrl } from '@/utils';
import { CustomMutationOptions, CustomQueryOptions } from '@/types';
import { urls } from '@/constants/urls';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PatchIdentityData } from '@/app/api/identities/[id]/route';
import { Identity } from '@prisma/client';
import { IdentityFilterData, PostIdentityData } from '@/app/api/identities/route';

const QUERY_KEYS = {
	all: ['identities'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export interface IdentityQueryOptions extends CustomQueryOptions {
	filters?: IdentityFilterData;
}

interface EditIdentityData {
	id: string | number;
	data: PatchIdentityData;
}

// Exported so callers (e.g. dashboard hover prefetch) can warm the exact same
// React Query cache entry that useGetIdentities reads. The key is the static
// ['identities','list'] regardless of filters, so a no-filter prefetch matches.
export const getIdentitiesListQueryKey = () => QUERY_KEYS.list();

export const fetchIdentitiesList = async (
	filters?: IdentityFilterData
): Promise<Identity[]> => {
	const url = appendQueryParamsToUrl(urls.api.identities.index, filters);
	const response = await _fetch(url);
	if (!response.ok) {
		throw new Error('Failed to fetch identities');
	}
	return response.json();
};

export const useGetIdentities = (options: IdentityQueryOptions) => {
	return useQuery<Identity[]>({
		queryKey: getIdentitiesListQueryKey(),
		queryFn: () => fetchIdentitiesList(options.filters),
	});
};

export const useGetIdentity = (id: string) => {
	return useQuery<Identity>({
		queryKey: QUERY_KEYS.detail(id),
		queryFn: async () => {
			const response = await _fetch(urls.api.identities.detail(id));
			if (!response.ok) {
				throw new Error('Failed to fetch identity');
			}
			return response.json();
		},
	});
};

export const useCreateIdentity = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Identity created successfully',
		errorMessage = 'Failed to create identity',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostIdentityData) => {
			const response = await _fetch(urls.api.identities.index, 'POST', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create identity');
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

export const useEditIdentity = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Identity updated successfully',
		errorMessage = 'Failed to update identity',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ data, id }: EditIdentityData) => {
			const response = await _fetch(urls.api.identities.detail(id), 'PATCH', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update identity');
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

export const useDeleteIdentity = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Identity deleted successfully',
		errorMessage = 'Failed to delete identity',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number) => {
			const response = await _fetch(urls.api.identities.detail(id), 'DELETE');

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete identity');
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
