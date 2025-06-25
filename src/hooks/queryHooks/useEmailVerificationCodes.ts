import { _fetch } from '@/utils';
import { CustomMutationOptions } from '@/types';
import { urls } from '@/constants/urls';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
	PatchEmailVerificationCodeData,
	PostEmailVerificationCodeData,
} from '@/app/api/email-verification-codes/route';

const QUERY_KEYS = {
	all: ['emailVerificationCode'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export const useCreateEmailVerificationCode = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Verification code sent successfully',
		errorMessage = 'Failed to send verification code',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostEmailVerificationCodeData) => {
			const response = await _fetch(urls.api.emailVerificationCodes.index, 'POST', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create verification code');
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

export const useEditEmailVerificationCode = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Email was verified successfully',
		errorMessage = 'Incorrect verification code',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PatchEmailVerificationCodeData) => {
			const response = await _fetch(urls.api.emailVerificationCodes.index, 'PATCH', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update verification code');
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
