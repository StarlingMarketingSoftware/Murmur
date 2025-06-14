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
		isHighlighted,
	} = useProductCard(props);

	return (
		<Card
			onClick={isLink ? handleClick : undefined}
			className={twMerge(
				'w-[315px] h-[737px] bg-gradient-to-b from-white to-gray-100 hover:-translate-y-1 transition-all duration-300',
				isLink && 'cursor-pointer',
				isHighlighted && 'border-navy from-secondary/7 to-gray-100',
				className
				// on product page size is different, also margin  w-[302px] h-[715px]
			)}
		>
			<div className="">
				<CardTitle>
					<Typography variant="h3" className="text-[30px] !font-primary ">
						{product.name}
					</Typography>
				</CardTitle>
				<div className="h-14 w-7/10">
					{product.name === 'Professional' ? (
						<Typography variant="label" className="text-[14px] text-muted leading-1">
							Make Campaigns with New Contacts and AI Customization
						</Typography>
					) : null}
				</div>
				<div className="flex gap-3">
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
						<Typography variant="h4" className="text-[20px] font-semibold h-[30px]">
							{product.metadata?.includes && product.metadata.includes + ' +'}
						</Typography>
					</div>
					{marketingFeatures.map(
						(feature: Stripe.Product.MarketingFeature, index: number) => (
							<div key={index} className="flex gap-2 items-center mb-4">
								<CheckIcon className="stroke-success shrink-0" size="20px" />
								<Typography variant="label">{feature.name}</Typography>
							</div>
						)
					)}
				</CardContent>
			</div>
		</Card>
	);
};
