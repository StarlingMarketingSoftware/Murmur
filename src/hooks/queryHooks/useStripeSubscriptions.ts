import { _fetch } from '@/utils';
import { CustomMutationOptions } from '@/types';
import { urls } from '@/constants/urls';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
	CreateStripeSubscriptionData,
	PatchStripeSubscriptionData,
} from '@/app/api/stripe/subscriptions/route';
import { QUERY_KEYS as USER_QUERY_KEYS } from './useUsers';

const QUERY_KEYS = {
	all: ['stripe', 'subscriptions'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

export const useCreateStripeSubscription = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Signature created successfully',
		errorMessage = 'Failed to create signature',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateStripeSubscriptionData) => {
			const response = await _fetch(urls.api.stripe.subscriptions.index, 'POST', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create subscription');
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

export const useEditStripeSubscription = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Subscription updated successfully',
		errorMessage = 'Failed to update subscription',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PatchStripeSubscriptionData) => {
			const response = await _fetch(urls.api.stripe.subscriptions.index, 'PATCH', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update subscription');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list() });

			let attempts = 0;
			const maxAttempts = 15;
			const pollInterval = setInterval(() => {
				attempts++;
				queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });

				if (attempts >= maxAttempts) {
					clearInterval(pollInterval);
				}
			}, 1000);

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
