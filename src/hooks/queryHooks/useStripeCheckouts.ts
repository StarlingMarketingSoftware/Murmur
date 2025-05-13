import { _fetch } from '@/app/utils/api';
import { CustomMutationOptions } from '@/constants/types';
import { urls } from '@/constants/urls';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
			const response = await _fetch('/api/stripe/checkout', 'POST', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create campaign');
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

interface PostCustomerPortalData {
	customerId: string;
	priceId: string;
	productId: string;
}

export const useCreateCustomerPortal = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Portal session created successfully',
		errorMessage = 'Failed to start customer portal. Please try again.',
		onSuccess: onSuccessCallback,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: PostCustomerPortalData) => {
			const response = await _fetch(
				urls.api.stripe.portal.customProduct.index,
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
