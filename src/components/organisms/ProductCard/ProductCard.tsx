'use client';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { TypographyH4, TypographyH3, TypographyP } from '@/components/ui/typography';
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
					<TypographyH3 className="text-[30px]">{product.name}</TypographyH3>
				</CardTitle>
				<div className="flex gap-3 mt-9">
					<TypographyH4 className="text-[59px] font-bold">{formattedPrice}</TypographyH4>
					<TypographyP className="text-[27px] translate-y-2">{period}</TypographyP>
				</div>
				<CardContent>
					<TypographyH4 className="text-[16px]">per month, billed annually</TypographyH4>
					<div className="mt-7">{!isLink && <>{getButton()}</>}</div>
					<div className="my-7">
						<TypographyH4 className="">Everything in Standard</TypographyH4>
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
