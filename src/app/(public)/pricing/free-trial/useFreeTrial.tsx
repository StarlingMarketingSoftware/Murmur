import { useCreateCheckoutSession } from '@/hooks/queryHooks/useStripeCheckouts';
import { useMe } from '@/hooks/useMe';
import { StripeSubscriptionStatus } from '@/types';
import { toast } from 'sonner';

export const useFreeTrial = () => {
	const { user, isLoadingUser, subscriptionTier } = useMe();

	const {
		mutateAsync: createCheckoutSession,
		isPending: isPendingCreateCheckoutSession,
	} = useCreateCheckoutSession();

	const proPriceId = process.env.NEXT_PUBLIC_STANDARD_MONTHLY_PRICE_ID;

	const handleCreateCheckoutSession = async () => {
		if (!proPriceId) {
			toast.error('Stripe price ID not found. Please contact support.');
			return;
		}

		const res = await createCheckoutSession({
			priceId: proPriceId,
			freeTrial: true,
		});

		if (res.url) {
			window.location.href = res.url;
		} else {
			toast.error('No checkout URL returned');
			return;
		}
	};

	const getHeaderText = () => {
		if (
			user?.stripeSubscriptionStatus === StripeSubscriptionStatus.CANCELED ||
			subscriptionTier
		) {
			return `Not eligible for a free trial`;
		} else {
			return 'Get started with your free trial';
		}
	};
	const getExplanatoryText = () => {
		if (user?.stripeSubscriptionStatus === StripeSubscriptionStatus.CANCELED) {
			return `You are not eligible for a free trial, since you've had a Murmur subscription in the past.`;
		} else if (subscriptionTier) {
			return `You are already signed up for a subscription and are not eligible for a free trial.`;
		} else {
			return 'Click the button below to get started with your free trial on Murmur.';
		}
	};
	const getButtonText = () => {
		if (user?.stripeSubscriptionStatus === StripeSubscriptionStatus.CANCELED) {
			return `Ineligible`;
		} else if (subscriptionTier) {
			return `You're already subscribed!`;
		} else {
			return 'Start Your Free Trial';
		}
	};

	return {
		handleCreateCheckoutSession,
		isPendingCreateCheckoutSession,
		isLoadingUser,
		user,
		subscriptionTier,
		getButtonText,
		getExplanatoryText,
		getHeaderText,
	};
};
