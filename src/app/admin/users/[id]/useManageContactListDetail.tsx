'use client';
import { useParams } from 'next/navigation';
import { useGetUser } from '@/hooks/queryHooks/useUsers';
import { useState } from 'react';
import { encodeUserId } from '@/utils';

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

	return {
		user,
		isPendingUser,
		handleGenerateFreeTrialCode,
		freeTrialCode,
	};
};
