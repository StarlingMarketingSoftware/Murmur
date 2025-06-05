import { ContactVerificationRequest } from '@prisma/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CustomMutationOptions } from '@/types';
import { toast } from 'sonner';
import { appendQueryParamsToUrl } from '@/utils';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import {
	PatchContactVerificationRequestData,
	PostContactVerificationRequestData,
} from '@/app/api/contact-verification-requests/route';

const QUERY_KEYS = {
	all: ['contactVerficationRequest'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export const useContactVerificationRequests = () => {
	return useQuery<ContactVerificationRequest[]>({
		queryKey: [...QUERY_KEYS.list()],
		queryFn: async () => {
			const url = appendQueryParamsToUrl(urls.api.contactVerificationRequests.index);
			const response = await _fetch(url);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to fetch verification requests');
			}

			return response.json();
		},
	});
};

export const useCreateContactVerificationRequest = (
	options: CustomMutationOptions = {}
) => {
	const {
		suppressToasts = false,
		successMessage = 'Contacts successfully sent for verification',
		errorMessage = 'Failed to send contacts for verification',
		onSuccess: onSuccessCallback,
	} = options;

	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostContactVerificationRequestData) => {
			const response = await _fetch(
				urls.api.contactVerificationRequests.index,
				'POST',
				data
			);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create contact');
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

export const useCheckContactVerificationRequest = (
	options: CustomMutationOptions = {}
) => {
	const {
		suppressToasts = false,
		successMessage = 'Contact verification request updated successfully',
		errorMessage = 'Failed to update contact verification request',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: PatchContactVerificationRequestData) => {
			const response = await _fetch(
				urls.api.contactVerificationRequests.index,
				'PATCH',
				data
			);
			console.log('🚀 ~ mutationFn: ~ response:', response);
			console.log(response.ok);
			if (!response.ok) {
				const errorData = await response.json();
				console.log('not ok');
				throw new Error(errorData.error);
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
