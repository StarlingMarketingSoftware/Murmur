'use client';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils';
import { FC } from 'react';
import { ProductCardProps, useProductCard } from './useProductCard';

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

	const normalizedProductName = product.name.trim().toLowerCase();
	const productCardFillClassName = normalizedProductName === 'pro'
		? 'bg-[#4DA6D7]'
		: normalizedProductName === 'ultra'
			? 'bg-[#78D18C]'
			: 'bg-gray-100';

	const productButtonFillClassName = normalizedProductName === 'pro'
		? 'bg-[#A5E0FF] hover:bg-[#A5E0FF] hover:brightness-95 active:brightness-90'
		: normalizedProductName === 'ultra'
			? 'bg-[#ABFFA5] hover:bg-[#ABFFA5] hover:brightness-95 active:brightness-90'
			: 'bg-white/55 hover:bg-white/70 hover:brightness-95 active:brightness-90';

	const featureNames = (marketingFeatures ?? [])
		.map((feature) => feature.name?.trim())
		.filter(Boolean) as string[];

	const featureBoxes = Array.from({ length: 3 }, (_, index) => featureNames[index] ?? '');

	return (
		<Card
			onClick={isLink ? handleClick : undefined}
			className={cn(
				'!my-0 w-[90vw] max-w-[380px] sm:w-[477px] sm:max-w-none',
				'border-black !border-[3px] rounded-md !p-4 sm:!p-6',
				'flex flex-col gap-2 sm:gap-3',
				'!font-secondary',
				productCardFillClassName,
				isLink && 'cursor-pointer',
				className
			)}
		>
			<div className="w-full sm:w-[423px] sm:h-[122px] rounded-md border-2 border-black bg-white px-3 sm:px-4 py-2 sm:py-3 flex flex-col gap-2 sm:gap-0 sm:justify-between">
				<p className="text-[18px] sm:text-[22px] leading-none font-secondary font-normal">
					{product.name}
				</p>
				<div className="flex items-end gap-2">
					<p className="text-[42px] sm:text-[54px] leading-none font-secondary font-medium">
						{formattedPrice}
					</p>
					<p className="text-[18px] sm:text-[22px] leading-none font-secondary pb-[4px] sm:pb-[6px]">
						{period}
					</p>
				</div>
			</div>

			{!isLink && (
				<div className="w-full sm:w-[423px]">
					{getButton({
						className: cn(
							'!w-full !h-[56px] sm:!h-[69px] rounded-md border-2 border-black !p-0 text-[22px] sm:text-[26px] !font-secondary font-normal text-black',
							productButtonFillClassName
						),
					})}
				</div>
			)}

			{featureBoxes.map((featureText, index) => (
				<div
					key={index}
					className="w-full sm:w-[423px] sm:h-[53px] rounded-md border-2 border-black bg-white px-3 sm:px-4 py-2 sm:py-0 flex items-center"
				>
					<p className="font-secondary text-[13px] sm:text-[15px] leading-snug font-normal">
						{featureText || '\u00A0'}
					</p>
				</div>
			))}
		</Card>
	);
};
