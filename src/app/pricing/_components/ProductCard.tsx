'use client';
import { Card, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import {
	TypographyH1,
	TypographyH4,
	TypographyMuted,
	TypographyList,
} from '@/components/ui/typography';
import { twMerge } from 'tailwind-merge';
import { useStripePrice } from '@/hooks/useStripePrice';
import { Stripe } from 'stripe';
import { CheckoutButton } from './CheckoutButton';
import { User } from '@prisma/client';
import { STRIPE_SUBSCRIPTION_STATUS } from '@/constants/types';
import ManageSubscriptionButton from '@/components/ManageSubscriptionButton';
import Spinner from '@/components/ui/spinner';
import { ReactNode } from 'react';
import UpdateSubscriptionButton from '@/components/UpdateSubscriptionButton';

interface ProductCardProps {
	product: Stripe.Product;
	className?: string;
	user: User | null | undefined;
	isLink?: boolean;
}

export function ProductCard({
	product,
	className,
	user,
	isLink = false,
}: ProductCardProps) {
	const { data: prices, isLoading } = useStripePrice(product.id);

	const formatPrice = (price: number, currency: string) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase(),
			minimumFractionDigits: 0,
		}).format(price / 100);
	};

	if (isLoading) return <Spinner />;
	if (!prices || prices.length === 0) return null;

	const price = prices[0];
	const formattedPrice = formatPrice(price.unit_amount || 0, price.currency || 'usd');
	const period = price?.recurring?.interval ? `per ${price.recurring.interval}` : '';

	const getButton = (): ReactNode => {
		const checkoutButton = (
			<CheckoutButton user={user} priceId={price.id} buttonText="Get Started" />
		);
		if (!user) {
			return checkoutButton;
		} else if (
			user.stripePriceId === price.id &&
			user.stripeSubscriptionStatus === STRIPE_SUBSCRIPTION_STATUS.ACTIVE
		) {
			return <ManageSubscriptionButton className="mx-auto" />;
		} else if (user.stripeSubscriptionId) {
			return (
				<UpdateSubscriptionButton
					priceId={price.id}
					user={user}
					productId={product.id}
					className="mx-auto"
				/>
			);
		} else {
			return checkoutButton;
		}
	};

	const handleClick = () => {
		window.location.href = `/pricing/${product.id}`;
	};

	const marketingFeatures: Stripe.Product.MarketingFeature[] = product.marketing_features;
	return (
		<Card
			onClick={isLink ? handleClick : undefined}
			className={twMerge(
				'w-[325px] p-6 flex flex-col justify-between',
				isLink && 'cursor-pointer',
				className
			)}
		>
			<div className="">
				<CardTitle>
					<TypographyH4 className="text-center">{product.name}</TypographyH4>
					<TypographyH1 className="text-8xl text-center">{formattedPrice}</TypographyH1>
					<TypographyMuted className="text-center">{period}</TypographyMuted>
				</CardTitle>
				<CardContent>
					<TypographyH4 className="text-center">What you get:</TypographyH4>
					<TypographyList>
						{marketingFeatures.map((feature: Stripe.Product.MarketingFeature, index) => (
							<li key={index}>{feature.name}</li>
						))}
					</TypographyList>
				</CardContent>
			</div>
			{!isLink && <CardFooter>{getButton()}</CardFooter>}
		</Card>
	);
}
