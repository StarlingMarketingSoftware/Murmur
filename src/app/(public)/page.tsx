import { redirect } from 'next/navigation';
import { StripeSubscriptionStatus } from '@/types';
import { getUser } from '@/app/api/_utils/user';
import { urls } from '@/constants/urls';
import { UserRole } from '@prisma/client';
import HomePageClient from './HomePageClient';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HomePage({
	searchParams,
}: {
	searchParams?: Promise<SearchParams>;
}) {
	const resolvedSearchParams = await searchParams;
	const activeLanding = resolvedSearchParams?.activeLanding;
	const activeLandingFlag = Array.isArray(activeLanding) ? activeLanding[0] : activeLanding;

	// Allow subscribed users to view the landing page only when explicitly requested.
	if (activeLandingFlag !== '1') {
		const user = await getUser();

		const hasActiveSubscription =
			user?.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE ||
			user?.stripeSubscriptionStatus === StripeSubscriptionStatus.TRIALING;
		const isAdmin = user?.role === UserRole.admin;

		if (user && (hasActiveSubscription || isAdmin)) {
			redirect(urls.murmur.dashboard.index);
		}
	}

	return <HomePageClient />;
}

