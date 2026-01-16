'use client';
import { CheckoutButton } from '../CheckoutButton/CheckoutButton';
import { User } from '@prisma/client';
import ManageSubscriptionButton from '@/components/organisms/ManageSubscriptionButton/ManageSubscriptionButton';
import { ReactNode } from 'react';
import UpdateSubscriptionButton from '@/components/organisms/UpdateSubscriptionButton/UpdateSubscriptionButton';
import { BillingCycle, StripeProduct, StripeSubscriptionStatus } from '@/types';
import { cn } from '@/utils';
import { getSubscriptionTierWithPriceId } from '@/utils';

export interface ProductCardProps {
	product: StripeProduct;
	className?: string;
	user: User | null | undefined;
	isLink?: boolean;
	billingCycle: BillingCycle;
}

export interface GetButtonOptions {
	className?: string;
	buttonText?: string;
}

export const useProductCard = (props: ProductCardProps) => {
	const { product, className, user, isLink, billingCycle } = props;

	const formatPrice = (price: number, currency: string) => {
		if (billingCycle === 'year') {
			return new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: currency.toUpperCase(),
				minimumFractionDigits: 0,
			}).format(price / 100 / 12);
		}
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase(),
			minimumFractionDigits: 0,
		}).format(price / 100);
	};

	const price = product.prices.find(
		(price) => price.recurring?.interval === billingCycle
	);

	if (!price || typeof price === 'string') {
		return {
			product,
			formattedPrice: 'Error',
			period: '',
			getButton: () => <div>Error loading price</div>,
			handleClick: () => {},
			marketingFeatures: [],
			className,
			isLink,
		};
	}

	const isHighlighted =
		getSubscriptionTierWithPriceId(product.prices[0].id)?.name === 'Pro';

	const formattedPrice = formatPrice(price.unit_amount || 0, price.currency || 'usd');
	const period = '/ month';

	const HIGHLIGHTED_CLASS = 'bg-secondary-light hover:bg-secondary-light/80';

	const defaultButtonText = `Get ${product.name}`;

	const getButton = (options: GetButtonOptions = {}): ReactNode => {
		const { className: buttonClassName, buttonText } = options;
		const resolvedButtonText = buttonText ?? defaultButtonText;

		const checkoutButton = (
			<CheckoutButton
				className={cn(isHighlighted && HIGHLIGHTED_CLASS, buttonClassName)}
				user={user}
				priceId={price.id}
				buttonText={resolvedButtonText}
				billingCycle={billingCycle}
			/>
		);
		if (!user) {
			return checkoutButton;
		} else if (
			user.stripePriceId === price.id &&
			(user.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE ||
				user.stripeSubscriptionStatus === StripeSubscriptionStatus.TRIALING)
		) {
			return (
				<ManageSubscriptionButton
					className={cn(
						'bg-primary hover:bg-primary/80 text-background',
						buttonClassName
					)}
				/>
			);
		} else if (user.stripeSubscriptionId) {
			return (
				<UpdateSubscriptionButton
					priceId={price.id}
					user={user}
					productId={product.id}
					buttonText={resolvedButtonText}
					className={cn(isHighlighted && HIGHLIGHTED_CLASS, buttonClassName)}
				/>
			);
		} else {
			return checkoutButton;
		}
	};

	const handleClick = () => {
		window.location.href = `/pricing/${product.id}`;
	};

	const marketingFeatures = product.marketing_features ?? [];

	return {
		product,
		formattedPrice,
		period,
		getButton,
		handleClick,
		marketingFeatures,
		className,
		isLink,
		isHighlighted,
		billingCycle,
	};
};
