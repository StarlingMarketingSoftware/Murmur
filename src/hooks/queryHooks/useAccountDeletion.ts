import { PostDeleteVerificationResponse } from '@/app/api/account/delete-verification/route';
import {
	PostVerifyDeletionCodeData,
	PostVerifyDeletionCodeResponse,
} from '@/app/api/account/delete-verification/verify/route';
import { _fetch } from '@/utils';
import { CustomMutationOptions } from '@/types';
import { urls } from '@/constants/urls';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useSendDeletionCode = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Confirmation code sent',
		errorMessage = 'Failed to send confirmation code',
		onSuccess: onSuccessCallback,
	} = options;

	return useMutation({
		mutationFn: async (): Promise<PostDeleteVerificationResponse> => {
			const response = await _fetch(urls.api.account.deleteVerification.index, 'POST');
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to send confirmation code');
			}

			return response.json();
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			onSuccessCallback?.();
		},
		onError: (error: Error) => {
			if (!suppressToasts) {
				// Surface the route's message (e.g. the resend-cooldown wait time).
				toast.error(error.message || errorMessage);
			}
		},
	});
};

export const useVerifyDeletionCode = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Identity verified',
		errorMessage = 'Failed to verify code',
		onSuccess: onSuccessCallback,
	} = options;

	return useMutation({
		mutationFn: async (
			data: PostVerifyDeletionCodeData
		): Promise<PostVerifyDeletionCodeResponse> => {
			const response = await _fetch(
				urls.api.account.deleteVerification.verify.index,
				'POST',
				data
			);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to verify code');
			}

			return response.json();
		},
		onSuccess: () => {
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			onSuccessCallback?.();
		},
		onError: (error: Error) => {
			if (!suppressToasts) {
				// "Invalid verification code" / "Verification code has expired".
				toast.error(error.message || errorMessage);
			}
		},
	});
};
