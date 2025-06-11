'use client';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { twMerge } from 'tailwind-merge';
import { Stripe } from 'stripe';
import { FC } from 'react';
import { ProductCardProps, useProductCard } from './useProductCard';
import { CheckIcon } from 'lucide-react';

export const ProductCard: FC<ProductCardProps> = (props) => {
	const {
		product,
		formattedPrice,
		period,
		getButton,
		handleClick,
		marketingFeatures,
		isLink,
		className,
	} = useProductCard(props);

	return (
		<Card
			onClick={isLink ? handleClick : undefined}
			className={twMerge(
				'w-[302px] h-[715px] bg-gradient-to-b from-white to-gray-100',
				isLink && 'cursor-pointer',
				className
			)}
		>
			<div className="">
				<CardTitle>
					<Typography variant="h3" className="text-[30px] !font-primary ">
						{product.name}
					</Typography>
				</CardTitle>
				<div className="flex gap-3 mt-9">
					<Typography variant="h4" className="text-[59px] font-bold">
						{formattedPrice}
					</Typography>
					<Typography variant="p" className="text-[27px] translate-y-2">
						{period}
					</Typography>
				</div>
				<CardContent>
					<Typography variant="h4" className="text-[16px]">
						per month, billed annually
					</Typography>
					<div className="mt-7">{!isLink && <>{getButton()}</>}</div>
					<div className="my-7">
						<Typography variant="h4" className="">
							Everything in Standard
						</Typography>
					</div>
					{marketingFeatures.map(
						(feature: Stripe.Product.MarketingFeature, index: number) => (
							<div key={index} className="flex gap-2 items-center mb-4">
								<CheckIcon className="stroke-success shrink-0" size="20px" />
								<p className="text-[14px]">{feature.name}</p>
							</div>
						)
					)}
				</CardContent>
			</div>
		</Card>
	);
};
