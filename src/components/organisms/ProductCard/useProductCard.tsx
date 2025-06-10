'use client';
import { Stripe } from 'stripe';
import { CheckoutButton } from '../CheckoutButton/CheckoutButton';
import { User } from '@prisma/client';
import ManageSubscriptionButton from '@/components/organisms/ManageSubscriptionButton/ManageSubscriptionButton';
import { ReactNode } from 'react';
import UpdateSubscriptionButton from '@/components/organisms/UpdateSubscriptionButton/UpdateSubscriptionButton';
import { StripeSubscriptionStatus } from '@/types';

export interface ProductCardProps {
	product: Stripe.Product;
	className?: string;
	user: User | null | undefined;
	isLink?: boolean;
}

export const useProductCard = (props: ProductCardProps) => {
	const { product, className, user, isLink } = props;

	const formatPrice = (price: number, currency: string) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase(),
			minimumFractionDigits: 0,
		}).format(price / 100);
	};

	const price = product.default_price;

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

	const formattedPrice = formatPrice(price.unit_amount || 0, price.currency || 'usd');
	const period = price?.recurring?.interval ? `/ ${price.recurring.interval}` : '';

	const getButton = (): ReactNode => {
		const checkoutButton = (
			<CheckoutButton
				className="w-full !bg-secondary-light"
				user={user}
				priceId={price.id}
				buttonText="Buy Now"
			/>
		);
		if (!user) {
			return checkoutButton;
		} else if (
			user.stripePriceId === price.id &&
			user.stripeSubscriptionStatus === StripeSubscriptionStatus.ACTIVE
		) {
			return <ManageSubscriptionButton className="w-full" />;
		} else if (user.stripeSubscriptionId) {
			return (
				<UpdateSubscriptionButton
					priceId={price.id}
					user={user}
					productId={product.id}
					className="w-full"
				/>
			);
		} else {
			return checkoutButton;
		}
	};

	const handleClick = () => {
		window.location.href = `/pricing/${product.id}`;
	};

	const marketingFeatures: Stripe.Product.MarketingFeature[] =
		product.marketing_features || [];

	return {
		product,
		formattedPrice,
		period,
		getButton,
		handleClick,
		marketingFeatures,
		className,
		isLink,
	};
};
