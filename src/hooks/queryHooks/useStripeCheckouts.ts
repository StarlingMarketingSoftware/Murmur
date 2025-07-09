import { _fetch } from '@/utils';
import { CustomMutationOptions } from '@/types';
import { urls } from '@/constants/urls';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PostPortalRequestData } from '@/app/api/stripe/portal/update-subscription/route';
import { PostPortalManageSubscriptionData } from '@/app/api/stripe/portal/manage-subscription/route';

const QUERY_KEYS = {
	all: ['stripeCheckouts'] as const,
	list: () => [...QUERY_KEYS.all, 'list'] as const,
	detail: (id: string | number) => [...QUERY_KEYS.all, 'detail', id.toString()] as const,
} as const;

interface PostCheckoutSessionData {
	priceId: string;
}

export const useCreateCheckoutSession = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Checkout session created successfully',
		errorMessage = 'Failed to start checkout process. Please try again.',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostCheckoutSessionData) => {
			const response = await _fetch(urls.api.stripe.checkout.index, 'POST', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create checkout session');
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

export const useCreateCustomerPortal = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Portal session created successfully',
		errorMessage = 'Failed to start customer portal. Please try again.',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostPortalRequestData) => {
			const response = await _fetch(
				urls.api.stripe.portal.updateSubscription.index,
				'POST',
				data
			);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create customer portal');
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

export const useManageSubscriptionPortal = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Portal session created successfully',
		errorMessage = 'Failed to start customer portal. Please try again.',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostPortalManageSubscriptionData) => {
			const response = await _fetch(
				urls.api.stripe.portal.manageSubscription.index,
				'POST',
				data
			);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create customer portal');
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
