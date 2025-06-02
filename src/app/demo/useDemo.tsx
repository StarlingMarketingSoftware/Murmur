'use client';
import { useMe } from '@/hooks/useMe';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
import { StripeSubscriptionStatus } from '@/types';
import { toast } from 'sonner';
import { decodeUserId } from '@/utils';

export const useDemo = () => {
	const { user } = useMe();

	const contactFormSchema = z.object({
		trialCode: z.string().min(1, { message: 'Trial code is required.' }),
	});

	const form = useForm<z.infer<typeof contactFormSchema>>({
		resolver: zodResolver(contactFormSchema),
		defaultValues: {
			trialCode: '',
		},
	});

	const { isPending, mutateAsync: signUpForTrial } = useEditUser({
		onSuccess: () => {
			form.reset();
			toast.success(
				'Trial successfully activated! You now have 500 AI Draft credits and 50 AI Test credits.'
			);
		},
		errorMessage: 'Failed to activate trial. Please try again.',
	});

	const onSubmit = async (values: z.infer<typeof contactFormSchema>) => {
		if (!user) {
			toast('You must be logged in to sign up for a trial.');
			return;
		}

		if (user.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE) {
			toast.error('You already have an active subscription. Trial not needed.');
			return;
		}
		if (user.stripeSubscriptionStatus === StripeSubscriptionStatus.TRIALING) {
			toast.error('You have already activated your trial.');
			return;
		}
		if (decodeUserId(values.trialCode) !== user.clerkId) {
			toast.error('Invalid trial code. Please check and try again.');
			return;
		}

		signUpForTrial({
			clerkId: user.clerkId,
			data: {
				stripeSubscriptionStatus: StripeSubscriptionStatus.TRIALING,
				aiDraftCredits: 500,
				aiTestCredits: 50,
			},
		});
	};

	return { onSubmit, isPending, form };
};
