import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/app/api/_utils/user';
import { StripeSubscriptionStatus } from '@/types';
import { urls } from '@/constants/urls';
import { UserRole } from '@prisma/client';

export default async function MurmurCampaignLayout({ children }: { children: ReactNode }) {
	const user = await getUser();

	const hasActiveSubscription =
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE ||
		user?.stripeSubscriptionStatus === StripeSubscriptionStatus.TRIALING;
	const isAdmin = user?.role === UserRole.admin;

	// Not logged in OR no active subscription: keep user on landing until they subscribe.
	if (!user || (!hasActiveSubscription && !isAdmin)) {
		redirect(urls.home.index);
	}

	return children;
}

