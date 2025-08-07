'use client';
import { useParams } from 'next/navigation';
import { useEditUser, useGetUser } from '@/hooks/queryHooks/useUsers';
import { useState, useEffect } from 'react';
import { encodeUserId, getSubscriptionTierWithPriceId } from '@/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateStripeSubscription } from '@/hooks/queryHooks/useStripeSubscriptions';

const customDomainSchema = z.object({
	domain: z
		.string()
		.refine((val) => val === '' || z.string().email().safeParse(val).success, {
			message: 'Please enter a valid email address or leave empty to clear.',
		}),
});

export const useManageUserDetail = () => {
	const params = useParams<{ id: string }>();
	const userId = params.id;

	const { data: user, isPending: isPendingUser } = useGetUser(userId);
	const [freeTrialCode, setFreeTrialCode] = useState<string | null>(null);

	const handleGenerateFreeTrialCode = () => {
		if (!user) {
			return;
		}
		setFreeTrialCode(encodeUserId(user.clerkId));
	};

	const { mutateAsync: editUser, isPending: isEditingUser } = useEditUser();

	const form = useForm<z.infer<typeof customDomainSchema>>({
		resolver: zodResolver(customDomainSchema),
		defaultValues: {
			domain: '',
		},
	});

	const {
		mutateAsync: createStripeSubscription,
		isPending: isPendingCreateStripeSubscription,
	} = useCreateStripeSubscription();

	useEffect(() => {
		if (user) {
			form.setValue('domain', user.customDomain || '');
		}
	}, [user, form]);

	const handleSignUpFreeSubscription = async () => {
		const freeSubscriptionPriceId = process.env.NEXT_PUBLIC_PARTNER_MONTHLY_PRICE_ID;
		if (!user || !user.stripeCustomerId || !freeSubscriptionPriceId) {
			return;
		}
		const newSubscription = await createStripeSubscription({
			customerId: user.stripeCustomerId,
			priceId: freeSubscriptionPriceId,
		});

		const subscriptionTier = getSubscriptionTierWithPriceId(freeSubscriptionPriceId);
		editUser({
			clerkId: user.clerkId,
			data: {
				stripeSubscriptionId: newSubscription.id,
				stripeSubscriptionStatus: 'active',
				stripePriceId: freeSubscriptionPriceId,
				draftCredits: subscriptionTier?.draftCredits,
				sendingCredits: subscriptionTier?.sendingCredits,
				verificationCredits: subscriptionTier?.verificationCredits,
			},
		});
	};

	const handleUpdateCustomDomain = async (values: z.infer<typeof customDomainSchema>) => {
		if (!user) {
			return;
		}

		editUser({
			clerkId: user.clerkId,
			data: {
				customDomain: values.domain.trim() === '' ? null : values.domain,
			},
		});
	};

	return {
		user,
		isPendingUser,
		handleGenerateFreeTrialCode,
		freeTrialCode,
		handleUpdateCustomDomain,
		form,
		isEditingUser,
		handleSignUpFreeSubscription,
		isPendingCreateStripeSubscription,
	};
};
