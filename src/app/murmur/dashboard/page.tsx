import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { fulfillCheckout } from '@/app/api/webhooks/stripe/fulfillCheckout';
import { getUser } from '@/app/api/_utils/user';
import { urls } from '@/constants/urls';
import { stripe } from '@/stripe/client';
import { StripeSubscriptionStatus } from '@/types';
import { UserRole } from '@prisma/client';
import DashboardPageClient from './DashboardPageClient';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;
type CheckoutSessionWithDiscounts = Stripe.Checkout.Session & {
	discounts?: Array<{ promotion_code?: unknown }> | null;
};

const getFirstSearchParam = (value: string | string[] | undefined): string | undefined =>
	Array.isArray(value) ? value[0] : value;

const getStripeObjectId = (value: unknown): string | null => {
	if (typeof value === 'string') return value;
	if (value && typeof value === 'object' && 'id' in value) {
		const id = (value as { id?: unknown }).id;
		return typeof id === 'string' ? id : null;
	}
	return null;
};

const getPromotionCodeId = (checkoutSession: Stripe.Checkout.Session): string | undefined => {
	const promotionCode = (checkoutSession as CheckoutSessionWithDiscounts).discounts?.[0]
		?.promotion_code;
	return getStripeObjectId(promotionCode) ?? undefined;
};

async function reconcileCheckoutSession(
	sessionId: string,
	stripeCustomerId: string
): Promise<boolean> {
	try {
		const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
		const sessionCustomerId = getStripeObjectId(checkoutSession.customer);

		if (sessionCustomerId !== stripeCustomerId) {
			console.warn('Ignoring checkout session for a different Stripe customer.');
			return false;
		}

		const subscriptionId = getStripeObjectId(checkoutSession.subscription);
		if (!subscriptionId) {
			console.warn('Checkout session did not include a subscription.');
			return false;
		}

		const subscription = await stripe.subscriptions.retrieve(subscriptionId);
		const fulfilledUser = await fulfillCheckout(
			getPromotionCodeId(checkoutSession),
			subscription,
			sessionId
		);
		return Boolean(fulfilledUser);
	} catch (error) {
		console.error('Failed to reconcile checkout session before dashboard access:', error);
		return false;
	}
}

export default async function DashboardPage({
	searchParams,
}: {
	searchParams?: Promise<SearchParams>;
}) {
	const resolvedSearchParams = (await searchParams) ?? {};
	const fromHomeParam = getFirstSearchParam(resolvedSearchParams.fromHome) === 'true';
	const checkoutSessionId = getFirstSearchParam(resolvedSearchParams.session_id);
	const user = await getUser();

	if (checkoutSessionId && user?.stripeCustomerId) {
		const reconciled = await reconcileCheckoutSession(
			checkoutSessionId,
			user.stripeCustomerId
		);
		if (reconciled) {
			redirect(`${urls.murmur.dashboard.index}?success=true`);
		}
	}

	if (fromHomeParam) {
		return <DashboardPageClient />;
	}

	if (!user) {
		redirect(urls.home.index);
	}

	const hasActiveSubscription =
		user.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE ||
		user.stripeSubscriptionStatus === StripeSubscriptionStatus.TRIALING;
	const isAdmin = user.role === UserRole.admin;

	if (!hasActiveSubscription && !isAdmin) {
		redirect(urls.pricing.index);
	}

	return <DashboardPageClient />;
}
