import { Card, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import {
	TypographyH1,
	TypographyH4,
	TypographyMuted,
	TypographyList,
} from '@/components/ui/typography';
import { twMerge } from 'tailwind-merge';
import { getStripePrice, StripeProduct } from '@/app/utils/data/stripe/products';
import { Stripe } from 'stripe';
import { CheckoutButton } from './CheckoutButton';
import { User } from '@prisma/client';
import { STRIPE_SUBSCRIPTION_STATUS } from '@/constants/types';
interface ProductCardProps {
	product: StripeProduct;
	className?: string;
	onButtonClick?: () => void;
	user: User | null;
}

export async function ProductCard({
	product,
	className,
	onButtonClick,
	user,
}: ProductCardProps) {
	const formatPrice = (price: number, currency: string) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase(),
			minimumFractionDigits: 0,
		}).format(price / 100);
	};

	const prices: Stripe.Price[] = await getStripePrice(product.id);
	let price: Stripe.Price;
	if (prices.length > 0) {
		price = prices[0];
	} else {
		return null;
	}

	// Extract price information
	const formattedPrice = price
		? formatPrice(price.unit_amount || 0, price.currency || 'usd')
		: 'Custom';

	const period = price?.recurring?.interval ? `per ${price.recurring.interval}` : '';

	const getButtonText = () => {
		if (!user) {
			return 'Get Started';
		}

		if (
			user.stripePriceId === price.id &&
			user.stripeSubscriptionStatus === STRIPE_SUBSCRIPTION_STATUS.ACTIVE
		) {
			return 'Manage Subscription';
		}

		if (user.stripeSubscriptionId) {
			return 'Update Subscription';
		}

		return 'Get Started';
	};

	const marketingFeatures: Stripe.Product.MarketingFeature[] = product.marketing_features;
	return (
		<Card className={twMerge('w-[325px] p-6 flex flex-col justify-between', className)}>
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
			<CardFooter>
				<CheckoutButton
					user={user}
					priceId={price.id}
					buttonText={getButtonText()}
					onButtonClick={onButtonClick}
				/>
			</CardFooter>
		</Card>
	);
}
