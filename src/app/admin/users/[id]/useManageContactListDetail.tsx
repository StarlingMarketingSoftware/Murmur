'use client';
import { useParams } from 'next/navigation';
import { useEditUser, useGetUser } from '@/hooks/queryHooks/useUsers';
import { useState, useEffect } from 'react';
import { encodeUserId } from '@/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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

	const { mutate: editUser, isPending: isEditingUser } = useEditUser();

	const form = useForm<z.infer<typeof customDomainSchema>>({
		resolver: zodResolver(customDomainSchema),
		defaultValues: {
			domain: '',
		},
	});

	useEffect(() => {
		if (user) {
			form.setValue('domain', user.customDomain || '');
		}
	}, [user, form]);

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
	};
};
