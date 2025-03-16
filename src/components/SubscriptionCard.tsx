import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import {
	TypographyH1,
	TypographyH4,
	TypographyMuted,
	TypographyList,
} from '@/components/ui/typography';
import { twMerge } from 'tailwind-merge';
import { getStripePriceServer, StripeProduct } from '@/lib/stripe/products';
import { Stripe } from 'stripe';

interface SubscriptionCardProps {
	product: StripeProduct;
	className?: string;
	onButtonClick?: () => void;
}

export async function SubscriptionCard({
	product,
	className,
	onButtonClick,
}: SubscriptionCardProps) {
	// Format price
	const formatPrice = (price: number, currency: string) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase(),
			minimumFractionDigits: 0,
		}).format(price / 100);
	};

	const prices: Stripe.Price[] = await getStripePriceServer(product.id);

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

	// Extract period/interval
	const period = price?.recurring?.interval ? `per ${price.recurring.interval}` : '';

	// Extract features from product metadata or description

	// Get button text from metadata or use default
	const buttonText = product.metadata?.buttonText || 'Get Started';

	const marketingFeatures: Stripe.Product.MarketingFeature[] = product.marketing_features;

	console.log('🚀 ~ marketing_features:', marketingFeatures);

	// Check if this is a highlighted/featured plan
	const isHighlighted = product.metadata?.highlighted === 'true';

	return (
		<Card
			className={twMerge(
				'w-[325px] p-6',
				isHighlighted ? 'border-primary' : '',
				className
			)}
		>
			<CardTitle>
				<TypographyH4 className="text-center">{product.name}</TypographyH4>
				<TypographyH1 className="text-6xl text-center">{formattedPrice}</TypographyH1>
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
			<CardFooter>
				<Button className="mx-auto" onClick={onButtonClick}>
					{buttonText}
				</Button>
			</CardFooter>
		</Card>
	);
}
