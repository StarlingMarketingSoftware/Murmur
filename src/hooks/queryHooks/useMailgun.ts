import { PostMailgunData } from '@/app/api/mailgun/route';
import { _fetch } from '@/app/utils/api';
import { CustomMutationOptions } from '@/constants/types';
import { urls } from '@/constants/urls';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useSendMailgunMessage = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Email sent successfully',
		errorMessage = 'Failed to send email',
		onSuccess: onSuccessCallback,
	} = options;

	return useMutation({
		mutationFn: async (data: PostMailgunData) => {
			const response = await _fetch(urls.api.mailgun.index, 'POST', data);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to send email');
			}

			return response.json();
		},
		onSuccess: () => {
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
