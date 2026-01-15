import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import MurmurLayoutClient from './MurmurLayoutClient';
import { getUser } from '@/app/api/_utils/user';
import { StripeSubscriptionStatus } from '@/types';
import { urls } from '@/constants/urls';
import { UserRole } from '@prisma/client';

export default async function MurmurLayout({ children }: { children: ReactNode }) {
	const user = await getUser();

	const hasActiveSubscription =
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE ||
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.TRIALING;
	const isAdmin = user?.role === UserRole.admin;

	// Not logged in OR no active subscription: keep user on landing until they subscribe.
	if (!user || (!hasActiveSubscription && !isAdmin)) {
		redirect(urls.home.index);
	}

	return <MurmurLayoutClient>{children}</MurmurLayoutClient>;
}
